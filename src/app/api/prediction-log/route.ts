import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchYahoo } from '@/lib/forecast'

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
function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

// GET — the flywheel scoreboard: how big and how accurate the proprietary dataset is.
export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, logged: 0 })
  try {
    const [{ count: logged }, { count: graded }, { count: dirRight }] = await Promise.all([
      admin.from('prediction_log').select('*', { count: 'exact', head: true }),
      admin.from('prediction_log').select('*', { count: 'exact', head: true }).neq('status', 'open'),
      admin.from('prediction_log').select('*', { count: 'exact', head: true }).eq('dir_correct', true),
    ])
    const g = graded ?? 0
    return NextResponse.json(
      {
        ready: true,
        logged: logged ?? 0,
        graded: g,
        directionalAccuracy: g ? +(((dirRight ?? 0) / g) * 100).toFixed(1) : 0,
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ready: false, logged: 0 })
  }
}

// POST — grade due predictions against real closes (cron-driven). This is the labeling step.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ resolved: 0, note: 'no db' })

  const { data } = await admin
    .from('prediction_log')
    .select('id,ticker,start_price,predicted,resolve_date')
    .eq('status', 'open')
    .lte('resolve_date', etDate())
    .limit(200)
  const due = (data || []) as { id: number; ticker: string; start_price: number; predicted: number; resolve_date: string }[]

  // Group by ticker so we only hit Yahoo once per symbol.
  const byTicker = new Map<string, typeof due>()
  for (const d of due) byTicker.set(d.ticker, [...(byTicker.get(d.ticker) || []), d])

  let resolved = 0
  const start = Date.now()
  for (const [ticker, rows] of byTicker) {
    if (Date.now() - start > 48000) break
    try {
      const hist = await fetchYahoo(ticker)
      for (const row of rows) {
        const at = hist.find((h) => h.date >= row.resolve_date) ?? hist[hist.length - 1]
        const actual = at.price
        const start_price = Number(row.start_price)
        const predicted = Number(row.predicted)
        const dirCorrect = Math.sign(predicted - start_price) === Math.sign(actual - start_price)
        const absErrPct = +(((Math.abs(actual - predicted) / start_price) * 100)).toFixed(2)
        await admin
          .from('prediction_log')
          .update({
            status: actual >= start_price ? 'hit' : 'miss',
            actual_price: actual,
            dir_correct: dirCorrect,
            abs_err_pct: absErrPct,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        resolved++
      }
    } catch {
      /* leave open, retry next run */
    }
  }
  return NextResponse.json({ resolved, due: due.length })
}
