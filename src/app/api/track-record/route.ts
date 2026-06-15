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

type Call = {
  trade_date: string
  ticker: string
  start_price: number
  target: number
  pct: number
  resolve_date: string
  status: string
  actual_price: number | null
}

const ret = (c: Call) => (Number(c.actual_price) - Number(c.start_price)) / Number(c.start_price)
function slim(c: Call) {
  return {
    ticker: c.ticker,
    trade_date: c.trade_date,
    start: Number(c.start_price),
    actual: c.actual_price == null ? null : Number(c.actual_price),
    ret: +(ret(c) * 100).toFixed(2),
    status: c.status,
  }
}

// GET — the public report card.
export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, stats: null, equity: [], recent: [] })
  try {
    const { data } = await admin
      .from('forecast_calls')
      .select('trade_date,ticker,start_price,target,pct,resolve_date,status,actual_price')
      .neq('status', 'open')
      .order('resolve_date', { ascending: true })
    const calls = (data || []) as Call[]
    if (!calls.length) {
      const { count } = await admin.from('forecast_calls').select('*', { count: 'exact', head: true })
      return NextResponse.json({ ready: false, openCount: count ?? 0, stats: null, equity: [], recent: [] })
    }

    const wins = calls.filter((c) => c.status === 'hit').length
    const total = calls.length
    const avgReturn = calls.reduce((s, c) => s + ret(c), 0) / total

    // "Follow the AI" equity curve: each day, equal-weight that day's calls.
    const byDay = new Map<string, Call[]>()
    for (const c of calls) byDay.set(c.trade_date, [...(byDay.get(c.trade_date) || []), c])
    const days = [...byDay.keys()].sort()
    let equity = 10000
    const equityCurve = [{ date: days[0], equity }]
    for (const d of days) {
      const dayCalls = byDay.get(d)!
      const dayReturn = dayCalls.reduce((s, c) => s + ret(c), 0) / dayCalls.length
      equity = +(equity * (1 + dayReturn)).toFixed(2)
      equityCurve.push({ date: dayCalls[0].resolve_date, equity })
    }

    const sorted = [...calls].sort((a, b) => ret(b) - ret(a))
    return NextResponse.json(
      {
        ready: true,
        stats: {
          total,
          wins,
          winRate: +((wins / total) * 100).toFixed(1),
          avgReturn: +(avgReturn * 100).toFixed(2),
          totalReturn: +((equity / 10000 - 1) * 100).toFixed(2),
          endingEquity: equity,
        },
        equity: equityCurve,
        best: sorted.slice(0, 3).map(slim),
        worst: sorted.slice(-3).reverse().map(slim),
        recent: [...calls].reverse().slice(0, 14).map(slim),
      },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ready: false, stats: null, equity: [], recent: [] })
  }
}

// POST — resolve any open calls whose window has closed (cron-driven).
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ resolved: 0, remaining: 0, note: 'no db' })

  const { data } = await admin
    .from('forecast_calls')
    .select('id,ticker,start_price,resolve_date')
    .eq('status', 'open')
    .lte('resolve_date', etDate())
    .limit(200)
  const due = (data || []) as { id: number; ticker: string; start_price: number; resolve_date: string }[]

  let resolved = 0
  const start = Date.now()
  for (const call of due) {
    if (Date.now() - start > 45000) break
    try {
      const hist = await fetchYahoo(call.ticker)
      const at = hist.find((h) => h.date >= call.resolve_date) ?? hist[hist.length - 1]
      const actual = at.price
      const hit = actual >= Number(call.start_price)
      await admin
        .from('forecast_calls')
        .update({ status: hit ? 'hit' : 'miss', actual_price: actual, resolved_at: new Date().toISOString() })
        .eq('id', call.id)
      resolved++
    } catch {
      /* leave open, retry next run */
    }
  }
  return NextResponse.json({ resolved, remaining: due.length - resolved })
}
