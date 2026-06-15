import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { forecastTicker, addBusinessDays } from '@/lib/forecast'
import { UNIVERSE } from '@/lib/universe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

type Pick = {
  rank: number
  ticker: string
  price: number
  target: number // next-session predicted close
  pct: number // session move %
  target5: number // 5-day predicted close
  pct5: number
  dirAcc: number // backtested directional accuracy 0..1
  skill: number // skill score vs naive baseline
}

function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

async function pool<T, R>(
  items: T[],
  concurrency: number,
  budgetMs: number,
  fn: (t: T) => Promise<R | null>
): Promise<R[]> {
  const out: R[] = []
  const start = Date.now()
  let i = 0
  async function worker() {
    while (i < items.length) {
      if (Date.now() - start > budgetMs) return
      const item = items[i++]
      try {
        const r = await fn(item)
        if (r) out.push(r)
      } catch {
        /* skip failures */
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return out
}

async function runBatch(limit: number) {
  const tickers = [...new Set(UNIVERSE)].slice(0, limit)
  type Raw = Omit<Pick, 'rank'>
  const results = await pool<string, Raw>(tickers, 12, 45000, async (ticker) => {
    const f = await forecastTicker(ticker, 5)
    const price = f.history[f.history.length - 1]?.price
    const target = f.forecast[0]?.price
    const target5 = f.forecast[f.forecast.length - 1]?.price
    if (!price || !target) return null
    return {
      ticker,
      price,
      target,
      pct: +(((target - price) / price) * 100).toFixed(2),
      target5,
      pct5: +(((target5 - price) / price) * 100).toFixed(2),
      dirAcc: f.metrics.directional_accuracy,
      skill: f.metrics.skill_score,
    }
  })

  // Bullish: positive move, model beats naive baseline, better-than-coinflip direction.
  const bull = (min: number) =>
    results.filter((r) => r.pct > 0 && r.skill > min && r.dirAcc >= 0.5).sort((a, b) => b.pct - a.pct)
  let rankedBull = bull(0)
  if (rankedBull.length < 15) rankedBull = bull(-0.1)
  if (rankedBull.length < 15) rankedBull = results.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct)
  const picks: Pick[] = rankedBull.slice(0, 15).map((r, idx) => ({ rank: idx + 1, ...r }))

  // Bearish: same filters, most negative move first.
  const bear = (min: number) =>
    results.filter((r) => r.pct < 0 && r.skill > min && r.dirAcc >= 0.5).sort((a, b) => a.pct - b.pct)
  let rankedBear = bear(0)
  if (rankedBear.length < 15) rankedBear = bear(-0.1)
  if (rankedBear.length < 15) rankedBear = results.filter((r) => r.pct < 0).sort((a, b) => a.pct - b.pct)
  const bears: Pick[] = rankedBear.slice(0, 15).map((r, idx) => ({ rank: idx + 1, ...r }))

  return { picks, bears, attempted: tickers.length, succeeded: results.length }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ date: null, generatedAt: null, picks: [], bears: [] })
  try {
    const { data } = await admin
      .from('daily_picks')
      .select('*')
      .order('trade_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json(
      {
        date: data?.trade_date ?? null,
        generatedAt: data?.generated_at ?? null,
        picks: data?.picks ?? [],
        bears: data?.bears ?? [],
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ date: null, generatedAt: null, picks: [], bears: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limitParam = Number(new URL(req.url).searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 320) : 320

  try {
    const { picks, bears, attempted, succeeded } = await runBatch(limit)
    const trade_date = etDate()
    const generated_at = new Date().toISOString()
    const resolve_date = addBusinessDays(new Date(trade_date + 'T00:00:00Z'), 5).toISOString().slice(0, 10)

    const admin = getAdmin()
    let stored = false
    if (admin) {
      try {
        await admin
          .from('daily_picks')
          .upsert({ trade_date, generated_at, picks, bears, attempted, succeeded }, { onConflict: 'trade_date' })
        stored = true
        // Seed the track record with today's bull calls (5-day horizon).
        const callRows = picks.map((p) => ({
          trade_date,
          ticker: p.ticker,
          start_price: p.price,
          target: p.target5,
          pct: p.pct5,
          horizon: 5,
          resolve_date,
          status: 'open',
        }))
        if (callRows.length) await admin.from('forecast_calls').upsert(callRows, { onConflict: 'trade_date,ticker' })
      } catch {
        /* tables may not exist yet */
      }
    }
    return NextResponse.json({ ok: true, trade_date, attempted, succeeded, stored, picks, bears })
  } catch (e) {
    console.error('[/api/daily-picks]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
