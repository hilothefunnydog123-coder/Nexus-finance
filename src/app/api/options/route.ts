import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const KEY = process.env.POLYGON_API_KEY ?? ''

type PolyContract = {
  break_even_price?: number
  details?: { contract_type?: string; expiration_date?: string; strike_price?: number; ticker?: string; shares_per_contract?: number }
  greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number }
  implied_volatility?: number
  open_interest?: number
  day?: { close?: number; volume?: number }
  last_quote?: { bid?: number; ask?: number; midpoint?: number }
  last_trade?: { price?: number }
  underlying_asset?: { price?: number }
}

function daysBetween(dateStr: string): number {
  const d = new Date(dateStr + 'T00:00:00Z').getTime()
  return Math.round((d - Date.now()) / 86400000)
}

// GET /api/options?symbol=AAPL&type=CALL&strike=190&expiry=30
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { limit: 20, windowMs: 60000, tag: 'options' })
  if (!rl.ok) return NextResponse.json({ ok: false, reason: 'rate' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  if (!KEY) return NextResponse.json({ ok: false, reason: 'no_key' })

  const sp = new URL(req.url).searchParams
  const symbol = (sp.get('symbol') ?? '').toUpperCase().replace(/[^A-Z.\-]/g, '')
  const type = (sp.get('type') ?? '').toLowerCase()
  const targetStrike = parseFloat(sp.get('strike') ?? '')
  const targetDte = parseInt(sp.get('expiry') ?? '30', 10) || 30
  if (!symbol || (type !== 'call' && type !== 'put') || !targetStrike) {
    return NextResponse.json({ ok: false, reason: 'bad_params' })
  }

  const today = new Date().toISOString().slice(0, 10)
  const lo = Math.max(1, Math.floor(targetStrike * 0.8))
  const hi = Math.ceil(targetStrike * 1.2)
  const url = `https://api.polygon.io/v3/snapshot/options/${symbol}?contract_type=${type}` +
    `&expiration_date.gte=${today}&strike_price.gte=${lo}&strike_price.lte=${hi}` +
    `&limit=250&apiKey=${KEY}`

  try {
    const r = await fetch(url, { next: { revalidate: 300 } }) // cache 5m (respect Polygon rate limits)
    if (!r.ok) return NextResponse.json({ ok: false, reason: r.status === 401 || r.status === 403 ? 'unauthorized' : 'http_' + r.status })
    const json = await r.json() as { results?: PolyContract[]; status?: string }
    // Free Polygon tiers return 200 with status NOT_AUTHORIZED and no results — treat as graceful no-data
    if (json.status && json.status !== 'OK' && json.status !== 'DELAYED') {
      return NextResponse.json({ ok: false, reason: json.status === 'NOT_AUTHORIZED' ? 'unauthorized' : json.status })
    }
    const results = json.results ?? []
    if (!results.length) return NextResponse.json({ ok: false, reason: 'no_contracts' })

    // Pick the contract closest to the AI's target strike + expiry
    let best: PolyContract | null = null, bestScore = Infinity
    for (const c of results) {
      const strike = c.details?.strike_price, exp = c.details?.expiration_date
      if (!strike || !exp) continue
      const dte = daysBetween(exp)
      if (dte < 0) continue
      const score = Math.abs(dte - targetDte) / 30 + Math.abs(strike - targetStrike) / (targetStrike * 0.1)
      if (score < bestScore) { bestScore = score; best = c }
    }
    if (!best || !best.details) return NextResponse.json({ ok: false, reason: 'no_match' })

    const d = best.details
    const q = best.last_quote
    const premium = q?.midpoint ?? (q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : undefined) ?? best.last_trade?.price ?? best.day?.close ?? null
    const strike = d.strike_price!
    const be = best.break_even_price ?? (premium != null ? (type === 'call' ? strike + premium : strike - premium) : null)

    return NextResponse.json({
      ok: true,
      source: 'polygon',
      contract: {
        ticker: d.ticker, type: type.toUpperCase(), strike,
        expiration: d.expiration_date, dte: d.expiration_date ? daysBetween(d.expiration_date) : null,
        premium: premium != null ? Number(premium.toFixed(2)) : null,
        bid: q?.bid ?? null, ask: q?.ask ?? null,
        iv: best.implied_volatility != null ? Number((best.implied_volatility * 100).toFixed(1)) : null,
        delta: best.greeks?.delta ?? null, gamma: best.greeks?.gamma ?? null,
        theta: best.greeks?.theta ?? null, vega: best.greeks?.vega ?? null,
        openInterest: best.open_interest ?? null, volume: best.day?.volume ?? null,
        breakeven: be != null ? Number(be.toFixed(2)) : null,
        underlying: best.underlying_asset?.price ?? null,
      },
    })
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'fetch_error', detail: String(e) })
  }
}
