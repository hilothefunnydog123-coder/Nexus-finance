import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { forecastTicker } from '@/lib/forecast'
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
  pct: number // session upside %
  target5: number // 5-day predicted close
  pct5: number
  dirAcc: number // backtested directional accuracy 0..1
  skill: number // skill score vs naive baseline
}

// US market date (YYYY-MM-DD) so the board is keyed to the trading session.
function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// Bounded-concurrency worker pool with a wall-clock budget so we always return
// before the function times out — we rank whatever finished in time.
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

  // Bullish + the model actually beats the naive baseline + better-than-coinflip
  // direction. Relax the skill gate if too few names qualify.
  const bull = (min: number) =>
    results
      .filter((r) => r.pct > 0 && r.skill > min && r.dirAcc >= 0.5)
      .sort((a, b) => b.pct - a.pct)
  let ranked = bull(0)
  if (ranked.length < 15) ranked = bull(-0.1)
  if (ranked.length < 15) ranked = results.filter((r) => r.pct > 0).sort((a, b) => b.pct - a.pct)

  const picks: Pick[] = ranked.slice(0, 15).map((r, idx) => ({ rank: idx + 1, ...r }))
  return { picks, attempted: tickers.length, succeeded: results.length }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ date: null, generatedAt: null, picks: [] })
  try {
    const { data } = await admin
      .from('daily_picks')
      .select('*')
      .order('trade_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    return NextResponse.json(
      { date: data?.trade_date ?? null, generatedAt: data?.generated_at ?? null, picks: data?.picks ?? [] },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ date: null, generatedAt: null, picks: [] })
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
    const { picks, attempted, succeeded } = await runBatch(limit)
    const trade_date = etDate()
    const generated_at = new Date().toISOString()

    const admin = getAdmin()
    let stored = false
    if (admin) {
      try {
        await admin
          .from('daily_picks')
          .upsert({ trade_date, generated_at, picks, attempted, succeeded }, { onConflict: 'trade_date' })
        stored = true
      } catch {
        /* table may not exist yet */
      }
    }
    return NextResponse.json({ ok: true, trade_date, attempted, succeeded, stored, picks })
  } catch (e) {
    console.error('[/api/daily-picks]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
