import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const POLY_KEY = process.env.POLYGON_API_KEY ?? ''
const TRADIER_KEY = process.env.TRADIER_API_KEY ?? ''
const TRADIER_BASE = process.env.TRADIER_BASE ?? 'https://sandbox.tradier.com/v1'

export type LiveContract = {
  source: string; ticker: string | null; type: string; strike: number
  expiration: string | null; dte: number | null
  premium: number | null; bid: number | null; ask: number | null
  iv: number | null; delta: number | null; gamma: number | null; theta: number | null; vega: number | null
  openInterest: number | null; volume: number | null; breakeven: number | null; underlying: number | null
}

function daysBetween(dateStr: string): number {
  return Math.round((new Date(dateStr + 'T00:00:00Z').getTime() - Date.now()) / 86400000)
}

// ── Tradier (preferred — free sandbox gives real, delayed chains + greeks) ──────
async function fromTradier(symbol: string, type: string, targetStrike: number, targetDte: number): Promise<{ ok: true; contract: LiveContract } | { ok: false; reason: string }> {
  const headers = { Authorization: `Bearer ${TRADIER_KEY}`, Accept: 'application/json' }
  const targetTime = Date.now() + targetDte * 86400000

  const expRes = await fetch(`${TRADIER_BASE}/markets/options/expirations?symbol=${symbol}&includeAllRoots=true`, { headers, next: { revalidate: 3600 } })
  if (!expRes.ok) return { ok: false, reason: expRes.status === 401 ? 'unauthorized' : 'http_' + expRes.status }
  const expJson = await expRes.json() as { expirations?: { date?: string | string[] } }
  let expirations = expJson?.expirations?.date
  if (typeof expirations === 'string') expirations = [expirations]
  if (!Array.isArray(expirations) || !expirations.length) return { ok: false, reason: 'no_expirations' }
  const exp = expirations.reduce((best, d) => Math.abs(new Date(d).getTime() - targetTime) < Math.abs(new Date(best).getTime() - targetTime) ? d : best)

  type TOpt = { symbol?: string; strike?: number; bid?: number; ask?: number; last?: number; option_type?: string; open_interest?: number; volume?: number; greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number; mid_iv?: number; smv_vol?: number } }
  const chainRes = await fetch(`${TRADIER_BASE}/markets/options/chains?symbol=${symbol}&expiration=${exp}&greeks=true`, { headers, next: { revalidate: 300 } })
  if (!chainRes.ok) return { ok: false, reason: 'chain_http_' + chainRes.status }
  const chainJson = await chainRes.json() as { options?: { option?: TOpt | TOpt[] } }
  let opts = chainJson?.options?.option
  if (!opts) return { ok: false, reason: 'no_chain' }
  if (!Array.isArray(opts)) opts = [opts]
  const cands = opts.filter(o => o.option_type === type && typeof o.strike === 'number')
  if (!cands.length) return { ok: false, reason: 'no_match' }
  const best = cands.reduce((b, o) => Math.abs((o.strike ?? 0) - targetStrike) < Math.abs((b.strike ?? 0) - targetStrike) ? o : b)

  const strike = best.strike!
  const bid = best.bid ?? null, ask = best.ask ?? null
  const premium = bid != null && ask != null && bid + ask > 0 ? (bid + ask) / 2 : (best.last ?? null)
  const g = best.greeks ?? {}
  const ivRaw = g.mid_iv ?? g.smv_vol ?? null
  const be = premium != null ? (type === 'call' ? strike + premium : strike - premium) : null
  return {
    ok: true,
    contract: {
      source: 'tradier', ticker: best.symbol ?? null, type: type.toUpperCase(), strike,
      expiration: exp, dte: daysBetween(exp),
      premium: premium != null ? Number(premium.toFixed(2)) : null, bid, ask,
      iv: ivRaw != null ? Number((ivRaw * 100).toFixed(1)) : null,
      delta: g.delta ?? null, gamma: g.gamma ?? null, theta: g.theta ?? null, vega: g.vega ?? null,
      openInterest: best.open_interest ?? null, volume: best.volume ?? null,
      breakeven: be != null ? Number(be.toFixed(2)) : null, underlying: null,
    },
  }
}

// ── Polygon (fallback — needs a paid options entitlement) ──────────────────────
type PolyContract = { break_even_price?: number; details?: { contract_type?: string; expiration_date?: string; strike_price?: number; ticker?: string }; greeks?: { delta?: number; gamma?: number; theta?: number; vega?: number }; implied_volatility?: number; open_interest?: number; day?: { close?: number; volume?: number }; last_quote?: { bid?: number; ask?: number; midpoint?: number }; last_trade?: { price?: number }; underlying_asset?: { price?: number } }

async function fromPolygon(symbol: string, type: string, targetStrike: number, targetDte: number): Promise<{ ok: true; contract: LiveContract } | { ok: false; reason: string }> {
  const today = new Date().toISOString().slice(0, 10)
  const lo = Math.max(1, Math.floor(targetStrike * 0.8)), hi = Math.ceil(targetStrike * 1.2)
  const url = `https://api.polygon.io/v3/snapshot/options/${symbol}?contract_type=${type}&expiration_date.gte=${today}&strike_price.gte=${lo}&strike_price.lte=${hi}&limit=250&apiKey=${POLY_KEY}`
  const r = await fetch(url, { next: { revalidate: 300 } })
  if (!r.ok) return { ok: false, reason: r.status === 401 || r.status === 403 ? 'unauthorized' : 'http_' + r.status }
  const json = await r.json() as { results?: PolyContract[]; status?: string }
  if (json.status && json.status !== 'OK' && json.status !== 'DELAYED') return { ok: false, reason: json.status === 'NOT_AUTHORIZED' ? 'unauthorized' : json.status }
  const results = json.results ?? []
  if (!results.length) return { ok: false, reason: 'no_contracts' }
  let best: PolyContract | null = null, bestScore = Infinity
  for (const c of results) {
    const strike = c.details?.strike_price, exp = c.details?.expiration_date
    if (!strike || !exp) continue
    const dte = daysBetween(exp); if (dte < 0) continue
    const score = Math.abs(dte - targetDte) / 30 + Math.abs(strike - targetStrike) / (targetStrike * 0.1)
    if (score < bestScore) { bestScore = score; best = c }
  }
  if (!best || !best.details) return { ok: false, reason: 'no_match' }
  const d = best.details, q = best.last_quote
  const strike = d.strike_price!
  const premium = q?.midpoint ?? (q?.bid != null && q?.ask != null ? (q.bid + q.ask) / 2 : undefined) ?? best.last_trade?.price ?? best.day?.close ?? null
  const be = best.break_even_price ?? (premium != null ? (type === 'call' ? strike + premium : strike - premium) : null)
  return {
    ok: true,
    contract: {
      source: 'polygon', ticker: d.ticker ?? null, type: type.toUpperCase(), strike,
      expiration: d.expiration_date ?? null, dte: d.expiration_date ? daysBetween(d.expiration_date) : null,
      premium: premium != null ? Number(premium.toFixed(2)) : null, bid: q?.bid ?? null, ask: q?.ask ?? null,
      iv: best.implied_volatility != null ? Number((best.implied_volatility * 100).toFixed(1)) : null,
      delta: best.greeks?.delta ?? null, gamma: best.greeks?.gamma ?? null, theta: best.greeks?.theta ?? null, vega: best.greeks?.vega ?? null,
      openInterest: best.open_interest ?? null, volume: best.day?.volume ?? null,
      breakeven: be != null ? Number(be.toFixed(2)) : null, underlying: best.underlying_asset?.price ?? null,
    },
  }
}

// GET /api/options?symbol=AAPL&type=CALL&strike=190&expiry=30
export async function GET(req: NextRequest) {
  const rl = rateLimit(req, { limit: 20, windowMs: 60000, tag: 'options' })
  if (!rl.ok) return NextResponse.json({ ok: false, reason: 'rate' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })

  if (!TRADIER_KEY && !POLY_KEY) return NextResponse.json({ ok: false, reason: 'no_key' })

  const sp = new URL(req.url).searchParams
  const symbol = (sp.get('symbol') ?? '').toUpperCase().replace(/[^A-Z.\-]/g, '')
  const type = (sp.get('type') ?? '').toLowerCase()
  const targetStrike = parseFloat(sp.get('strike') ?? '')
  const targetDte = parseInt(sp.get('expiry') ?? '30', 10) || 30
  if (!symbol || (type !== 'call' && type !== 'put') || !targetStrike) return NextResponse.json({ ok: false, reason: 'bad_params' })

  try {
    if (TRADIER_KEY) {
      const t = await fromTradier(symbol, type, targetStrike, targetDte)
      if (t.ok) return NextResponse.json({ ok: true, source: 'tradier', contract: t.contract })
      if (POLY_KEY) { const p = await fromPolygon(symbol, type, targetStrike, targetDte); if (p.ok) return NextResponse.json({ ok: true, source: 'polygon', contract: p.contract }) }
      return NextResponse.json({ ok: false, reason: t.reason })
    }
    const p = await fromPolygon(symbol, type, targetStrike, targetDte)
    return p.ok ? NextResponse.json({ ok: true, source: 'polygon', contract: p.contract }) : NextResponse.json({ ok: false, reason: p.reason })
  } catch (e) {
    return NextResponse.json({ ok: false, reason: 'fetch_error', detail: String(e) })
  }
}
