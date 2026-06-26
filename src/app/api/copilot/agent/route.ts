import { NextRequest, NextResponse } from 'next/server'
import { getQuote, getCandles } from '@/lib/finnhub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const GEMINI = process.env.GEMINI_API_KEY || ''

// Map a TradingView symbol → a Finnhub-quotable EQUITY symbol. We ONLY use this
// to add accurate prior-day/EMA levels for real equities; for futures/indices we
// do NOT substitute a proxy price (that was the bug) — we trust the chart price.
function toEquity(raw: string): { sym: string; isProxy: boolean } {
  let s = (raw || '').toUpperCase().trim()
  if (s.includes(':')) s = s.split(':').pop() as string
  s = s.replace(/\s+/g, '')
  const root = s.replace(/[0-9]*!$/, '').replace(/[FGHJKMNQUVXZ][0-9]{1,2}$/, '')
  const FUT: Record<string, string> = { NQ: 'QQQ', MNQ: 'QQQ', NDX: 'QQQ', US100: 'QQQ', ES: 'SPY', MES: 'SPY', SPX: 'SPY', US500: 'SPY', YM: 'DIA', MYM: 'DIA', US30: 'DIA', RTY: 'IWM', M2K: 'IWM', CL: 'USO', GC: 'GLD', SI: 'SLV' }
  if (FUT[root] || FUT[s]) return { sym: FUT[root] || FUT[s], isProxy: true }
  return { sym: (root || s).replace(/!$/, ''), isProxy: false }
}

async function marketContext(symbol: string, chartPrice?: number) {
  const { sym, isProxy } = toEquity(symbol)
  const data: Record<string, number> = {}
  // The chart price the extension read from TradingView IS the truth.
  if (typeof chartPrice === 'number' && isFinite(chartPrice) && chartPrice > 0) data.price = chartPrice
  // For real equities only, add accurate levels (prior-day H/L, EMAs). Never for
  // a futures proxy — those numbers live on a different price scale.
  if (!isProxy) {
    try { if (data.price == null) { const q = await getQuote(sym); if (q?.price > 0) { data.price = q.price; data.dayHigh = q.high; data.dayLow = q.low; data.prevClose = q.previousClose } } } catch {}
    try {
      const now = Math.floor(Date.now() / 1000)
      const c = await getCandles(sym, 'D', now - 60 * 86400, now)
      if (c && c.length > 2) {
        const n = c.length; data.priorDayHigh = +c[n - 2].high.toFixed(2); data.priorDayLow = +c[n - 2].low.toFixed(2); data.priorDayClose = +c[n - 2].close.toFixed(2)
        const cl = c.map((x) => x.close), ema = (l: number) => { const k = 2 / (l + 1); let e = cl[0]; for (let i = 1; i < n; i++) e = cl[i] * k + e * (1 - k); return +e.toFixed(2) }
        if (n >= 20) data.ema20 = ema(20); if (n >= 50) data.ema50 = ema(50); if (n >= 200) data.ema200 = ema(200)
      }
    } catch {}
  }
  return { sym: symbol, isProxy, data }
}

type Plan = { say: string; draw?: { price: number; label: string; color?: string }[]; pine?: { name: string; code: string }; routine?: string }

const PINE_LEVELS = `//@version=5
indicator("YN Levels — PDH/PDL + 200 EMA", overlay=true)
pdh = request.security(syminfo.tickerid, "D", high[1])
pdl = request.security(syminfo.tickerid, "D", low[1])
plot(pdh, "PDH", color=color.red,   linewidth=1, style=plot.style_linebr)
plot(pdl, "PDL", color=color.green, linewidth=1, style=plot.style_linebr)
plot(ta.ema(close, 200), "200 EMA", color=color.orange, linewidth=2)`

async function gemini(prompt: string): Promise<string | null> {
  if (!GEMINI) return null
  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.35, maxOutputTokens: 1100, responseMimeType: 'application/json' } }),
    })
    const j = await r.json(); return j.candidates?.[0]?.content?.parts?.[0]?.text || null
  } catch { return null }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { symbol = '', timeframe = '', message = '', history = [], chartPrice, pineError, pineCode } = body

    // ── Pine refine loop: fix a compiler error and return corrected code ──────
    if (pineError && pineCode) {
      const txt = await gemini(`You are a Pine Script v5 expert. The following script failed to compile in TradingView with this error:\n${pineError}\n\nSCRIPT:\n${pineCode}\n\nReturn ONLY JSON {"say": one short sentence, "pine": {"name": string, "code": fully corrected valid Pine v5}}.`)
      let plan: Plan | null = null
      try { plan = txt ? JSON.parse(txt) : null } catch {}
      if (plan?.pine?.code) return NextResponse.json(plan, { headers: CORS })
      return NextResponse.json({ say: 'Could not auto-fix that — check the flagged line.', pine: { name: 'YN Levels', code: PINE_LEVELS } }, { headers: CORS })
    }

    const mc = await marketContext(symbol, chartPrice)
    const d = mc.data
    const priceLine = d.price ? `${symbol} is at ${d.price}` : symbol

    if (!GEMINI) {
      // rule-based fallback
      if (/indicator|pine|script|code/i.test(message)) return NextResponse.json({ say: `Loading a prior-day H/L + 200 EMA indicator onto ${symbol}.`, pine: { name: 'YN Levels', code: PINE_LEVELS } }, { headers: CORS })
      const draw: Plan['draw'] = []
      if (d.priorDayHigh) draw.push({ price: d.priorDayHigh, label: 'PDH', color: '#ef4444' })
      if (d.priorDayLow) draw.push({ price: d.priorDayLow, label: 'PDL', color: '#10b981' })
      if (d.ema200) draw.push({ price: d.ema200, label: '200 EMA', color: '#f5a623' })
      return NextResponse.json({ say: `${priceLine}. ${draw.length ? 'Marked ' + draw.map((x) => x.label).join(', ') + '.' : 'Tell me a price and I’ll draw it (e.g. “draw support at ' + (d.price ? Math.round(d.price) : '20100') + '”).'}`, draw }, { headers: CORS })
    }

    const sys = `You are YN Copilot, an elite trading assistant embedded INSIDE the user's live TradingView chart. You ACT on the chart by returning JSON.
Chart: symbol=${symbol} timeframe=${timeframe}.
${d.price ? `REAL PRICE (read directly off the user's chart — this is the TRUTH, trust it over everything): ${d.price}.` : ''}
${mc.isProxy ? `(${symbol} is a future/index; I have no historical levels for it — only draw prices the user names or that you derive from the real price above.)` : `Accurate daily levels available: ${JSON.stringify(d)}.`}
Return ONLY JSON:
{"say": 2-4 punchy spoken sentences (no markdown),
 "draw": [{"price": number, "label": short, "color"?: hex}],   // ONLY real numbers (from data above or the user's request); these get drawn as native lines
 "pine": {"name": string, "code": valid Pine v5} | null,        // when they ask for an indicator
 "routine": short | null }
Rules: NEVER invent prices — only use the real price above, the accurate levels, or numbers the user states. If the user names a price ("support at 20100"), draw it. NEVER refuse for lack of data — you always have the real price. Omit empty fields.`
    const txt = await gemini(`${sys}\n\nRecent: ${JSON.stringify((history || []).slice(-6))}\nUser: ${message}`)
    let plan: Plan
    try { plan = JSON.parse(txt as string) } catch { plan = { say: d.price ? `${priceLine}. What do you want me to mark?` : 'Tell me a price and I’ll draw it.' } }
    if (!plan.say && !plan.draw && !plan.pine) plan.say = `${priceLine}.`
    return NextResponse.json(plan, { headers: CORS })
  } catch {
    return NextResponse.json({ say: 'Something went wrong on the YN brain — try again.' }, { headers: CORS })
  }
}
