import { NextResponse } from 'next/server'
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

const STARTING_EQUITY = 10000

const realizedRet = (c: Call) =>
  (Number(c.actual_price) - Number(c.start_price)) / Number(c.start_price)

function businessDaysBetween(a: string, b: string): number {
  const start = new Date(a + 'T00:00:00Z')
  const end = new Date(b + 'T00:00:00Z')
  if (end <= start) return 0
  let n = 0
  const d = new Date(start)
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) n++
  }
  return n
}

// Fetch live prices for a set of tickers with bounded concurrency + time budget.
async function liveQuotes(tickers: string[], budgetMs: number): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  const start = Date.now()
  let i = 0
  async function worker() {
    while (i < tickers.length) {
      if (Date.now() - start > budgetMs) return
      const t = tickers[i++]
      try {
        const hist = await fetchYahoo(t)
        const last = hist[hist.length - 1]?.price
        if (last) out.set(t, last)
      } catch {
        /* skip — leave unpriced */
      }
    }
  }
  await Promise.all(Array.from({ length: 10 }, worker))
  return out
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, open: [], realized: null, book: null })

  try {
    const { data } = await admin
      .from('forecast_calls')
      .select('trade_date,ticker,start_price,target,pct,resolve_date,status,actual_price')
      .order('trade_date', { ascending: true })
    const all = (data || []) as Call[]
    if (!all.length) return NextResponse.json({ ready: false, open: [], realized: null, book: null })

    const resolved = all.filter((c) => c.status !== 'open')
    const openCalls = all.filter((c) => c.status === 'open')

    // ---- Realized equity curve (compounding equal-weight of each day's calls) ----
    let realized: {
      total: number
      wins: number
      winRate: number
      avgReturn: number
      totalReturn: number
      equity: number
      curve: { date: string; equity: number }[]
    } | null = null

    let endingEquity = STARTING_EQUITY
    if (resolved.length) {
      const byDay = new Map<string, Call[]>()
      for (const c of resolved) byDay.set(c.trade_date, [...(byDay.get(c.trade_date) || []), c])
      const days = [...byDay.keys()].sort()
      const curve = [{ date: days[0], equity: STARTING_EQUITY }]
      let eq = STARTING_EQUITY
      for (const d of days) {
        const dayCalls = byDay.get(d)!
        const dayReturn = dayCalls.reduce((s, c) => s + realizedRet(c), 0) / dayCalls.length
        eq = +(eq * (1 + dayReturn)).toFixed(2)
        curve.push({ date: dayCalls[0].resolve_date, equity: eq })
      }
      endingEquity = eq
      const wins = resolved.filter((c) => c.status === 'hit').length
      realized = {
        total: resolved.length,
        wins,
        winRate: +((wins / resolved.length) * 100).toFixed(1),
        avgReturn: +((resolved.reduce((s, c) => s + realizedRet(c), 0) / resolved.length) * 100).toFixed(2),
        totalReturn: +((endingEquity / STARTING_EQUITY - 1) * 100).toFixed(2),
        equity: endingEquity,
        curve,
      }
    }

    // ---- Open book, marked to live prices ----
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
    const uniqueTickers = [...new Set(openCalls.map((c) => c.ticker))]
    const quotes = uniqueTickers.length ? await liveQuotes(uniqueTickers, 40000) : new Map<string, number>()

    const open = openCalls
      .map((c) => {
        const current = quotes.get(c.ticker) ?? null
        const start = Number(c.start_price)
        const unrealized = current != null ? +(((current - start) / start) * 100).toFixed(2) : null
        return {
          ticker: c.ticker,
          trade_date: c.trade_date,
          resolve_date: c.resolve_date,
          start: +start.toFixed(2),
          current: current != null ? +current.toFixed(2) : null,
          target: Number(c.target),
          unrealized,
          daysHeld: businessDaysBetween(c.trade_date, today),
          winning: unrealized != null ? unrealized >= 0 : null,
        }
      })
      .sort((a, b) => (b.unrealized ?? -999) - (a.unrealized ?? -999))

    const priced = open.filter((o) => o.unrealized != null)
    const avgUnrealized = priced.length
      ? +(priced.reduce((s, o) => s + (o.unrealized as number), 0) / priced.length).toFixed(2)
      : 0
    const winnersNow = priced.filter((o) => (o.unrealized as number) >= 0).length

    // Live mark = realized equity carried forward, plus the open book's mark-to-market.
    // Open positions are a fresh equal-weight slice on top of realized equity.
    const liveMark = +(endingEquity * (1 + avgUnrealized / 100)).toFixed(2)

    const book = {
      openCount: open.length,
      pricedCount: priced.length,
      avgUnrealized,
      winnersNow,
      losersNow: priced.length - winnersNow,
      liveMark,
      asOf: new Date().toISOString(),
    }

    return NextResponse.json(
      { ready: !!(resolved.length || openCalls.length), realized, open, book },
      { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
    )
  } catch (e) {
    return NextResponse.json({ ready: false, open: [], realized: null, book: null, error: String(e) })
  }
}
