import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const FH     = process.env.FINNHUB_API_KEY ?? ''

const sb = SB_URL.startsWith('https://') && SB_KEY.length > 20
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })
  : null

async function getPrice(ticker: string): Promise<number | null> {
  try {
    const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FH}`)
    const d = await r.json()
    return d.c ?? null
  } catch { return null }
}

// POST — log a new analysis
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { ticker, rating, price_at_analysis, price_target, stop_loss, take_profit_1, confidence } = body

    if (!sb) return NextResponse.json({ ok: true, demo: true })

    await sb.from('ai_calls').insert({
      ticker:            ticker?.toUpperCase(),
      rating,
      price_at_analysis: Number(price_at_analysis),
      price_target:      Number(price_target),
      stop_loss:         Number(stop_loss),
      take_profit_1:     Number(take_profit_1),
      confidence:        Number(confidence),
      analyzed_at:       new Date().toISOString(),
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET — fetch track record with live prices
export async function GET() {
  if (!sb) {
    return NextResponse.json({ calls: [], stats: { total: 0, winRate: 0, avgReturn: 0 }, demo: true })
  }

  try {
    const { data: calls, error } = await sb
      .from('ai_calls')
      .select('*')
      .order('analyzed_at', { ascending: false })
      .limit(100)

    if (error) throw error

    // Fetch current prices for recent calls (last 30 days only to stay within rate limits)
    const cutoff   = Date.now() - 30 * 86400000
    const tickers  = [...new Set((calls ?? [])
      .filter((c: Record<string,unknown>) => new Date(c.analyzed_at as string).getTime() > cutoff)
      .map((c: Record<string,unknown>) => c.ticker as string))]

    const priceMap: Record<string, number> = {}
    await Promise.all(tickers.slice(0, 10).map(async t => {
      const p = await getPrice(t)
      if (p) priceMap[t] = p
    }))

    // Enrich calls with current return
    const enriched = (calls ?? []).map((c: Record<string, unknown>) => {
      const cur = priceMap[c.ticker as string] ?? null
      const ret = cur && c.price_at_analysis
        ? parseFloat((((cur - Number(c.price_at_analysis)) / Number(c.price_at_analysis)) * 100).toFixed(2))
        : null
      const isBull  = ['Strong Buy','Buy'].includes(c.rating as string)
      const hitTP1  = cur && c.take_profit_1 ? (isBull ? cur >= Number(c.take_profit_1) : cur <= Number(c.take_profit_1)) : false
      const hitStop = cur && c.stop_loss ? (isBull ? cur <= Number(c.stop_loss) : cur >= Number(c.stop_loss)) : false
      return { ...c, current_price: cur, return_pct: ret, hit_tp1: hitTP1, hit_stop: hitStop }
    })

    // Stats
    const withReturns = enriched.filter((c: Record<string,unknown>) => c.return_pct !== null)
    const wins        = withReturns.filter((c: Record<string,unknown>) => {
      const isBull = ['Strong Buy','Buy'].includes(c.rating as string)
      return isBull ? Number(c.return_pct) > 0 : Number(c.return_pct) < 0
    })
    const avgReturn = withReturns.length
      ? parseFloat((withReturns.reduce((s: number, c: Record<string,unknown>) => s + Math.abs(Number(c.return_pct)), 0) / withReturns.length).toFixed(1))
      : 0
    const winRate = withReturns.length ? Math.round((wins.length / withReturns.length) * 100) : 0

    return NextResponse.json({
      calls: enriched,
      stats: { total: enriched.length, winRate, avgReturn, withData: withReturns.length },
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
