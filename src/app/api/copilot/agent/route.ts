import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── CORS so the browser extension (running on tradingview.com) can call us ────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const FINNHUB = process.env.FINNHUB_API_KEY || ''
const GEMINI = process.env.GEMINI_API_KEY || ''

// Map common chart symbols → a Finnhub-quotable proxy (futures use the ETF proxy).
function normalize(sym: string): string {
  const s = (sym || '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  const map: Record<string, string> = { NQ: 'QQQ', NQ1: 'QQQ', MNQ: 'QQQ', ES: 'SPY', ES1: 'SPY', MES: 'SPY', SPX: 'SPY', NDX: 'QQQ', US100: 'QQQ', US500: 'SPY', BTCUSD: 'BINANCE:BTCUSDT', BTCUSDT: 'BINANCE:BTCUSDT', ETHUSD: 'BINANCE:ETHUSDT' }
  return map[s] || s
}

interface Candles { c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; s: string }

async function marketContext(symbol: string) {
  if (!FINNHUB || !symbol) return null
  const sym = normalize(symbol)
  try {
    const now = Math.floor(Date.now() / 1000)
    const from = now - 60 * 86400
    const [qRes, cRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${FINNHUB}`),
      fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${encodeURIComponent(sym)}&resolution=D&from=${from}&to=${now}&token=${FINNHUB}`),
    ])
    const q = await qRes.json()
    const c: Candles = await cRes.json()
    const out: Record<string, number> = {}
    if (q && typeof q.c === 'number') { out.price = q.c; out.prevClose = q.pc; out.dayHigh = q.h; out.dayLow = q.l }
    if (c && c.s === 'ok' && c.c?.length) {
      const n = c.c.length
      out.priorDayHigh = c.h[n - 2]; out.priorDayLow = c.l[n - 2]; out.priorDayClose = c.c[n - 2]
      const ema = (len: number) => { const k = 2 / (len + 1); let e = c.c[0]; for (let i = 1; i < n; i++) e = c.c[i] * k + e * (1 - k); return +e.toFixed(2) }
      out.ema20 = ema(20); out.ema50 = ema(50); out.ema200 = ema(200)
      out.high20 = +Math.max(...c.h.slice(-20)).toFixed(2); out.low20 = +Math.min(...c.l.slice(-20)).toFixed(2)
    }
    return { sym, data: out }
  } catch { return null }
}

type Plan = { say: string; draw?: { price: number; label: string; color?: string }[]; annotate?: { price: number; text: string }[]; pine?: { name: string; code: string }; routine?: string }

// Rule-based fallback so the agent is useful even without the LLM key.
function ruleBased(symbol: string, mc: Awaited<ReturnType<typeof marketContext>>, message: string): Plan {
  const d = mc?.data || {}
  const draw: Plan['draw'] = []
  if (d.priorDayHigh) draw.push({ price: d.priorDayHigh, label: 'PDH', color: '#ef4444' })
  if (d.priorDayLow) draw.push({ price: d.priorDayLow, label: 'PDL', color: '#10b981' })
  if (d.ema200) draw.push({ price: d.ema200, label: '200 EMA', color: '#f5a623' })
  if (/indicator|pine|script|code/i.test(message)) {
    return { say: `Here's a clean prior-day-high/low + 200 EMA indicator for ${symbol}. Paste it into the Pine editor.`, pine: { name: 'YN Levels', code: PINE_LEVELS } }
  }
  const bias = d.price && d.ema200 ? (d.price > d.ema200 ? 'above the 200 EMA — broader trend is up' : 'below the 200 EMA — broader trend is down') : ''
  const say = mc ? `${symbol} is ${d.price ?? '—'}, ${bias}. Prior day ${d.priorDayLow}–${d.priorDayHigh}. I've marked PDH/PDL and the 200 EMA — watch for reactions there.` : `I can't reach live data for ${symbol} right now, but tell me the levels and I'll mark them.`
  return { say, draw }
}

const PINE_LEVELS = `//@version=5
indicator("YN Levels — PDH/PDL + 200 EMA", overlay=true)
pdh = request.security(syminfo.tickerid, "D", high[1])
pdl = request.security(syminfo.tickerid, "D", low[1])
plot(pdh, "PDH", color=color.red,   linewidth=1, style=plot.style_linebr)
plot(pdl, "PDL", color=color.green, linewidth=1, style=plot.style_linebr)
plot(ta.ema(close, 200), "200 EMA", color=color.orange, linewidth=2)`

export async function POST(req: NextRequest) {
  try {
    const { symbol = '', timeframe = '', message = '', history = [] } = await req.json()
    const mc = await marketContext(symbol)

    if (!GEMINI) return NextResponse.json(ruleBased(symbol, mc, message), { headers: CORS })

    const sys = `You are YN Copilot, an elite trading assistant embedded INSIDE the user's TradingView chart. You can take ACTIONS on the chart by returning JSON.
Chart: symbol=${symbol} timeframe=${timeframe}. Live data: ${JSON.stringify(mc?.data || {})}.
Return ONLY JSON of shape:
{"say": string (a short spoken-style read, 2-4 sentences, no markdown),
 "draw": [{"price": number, "label": short string, "color"?: hex}],   // horizontal levels to draw — use REAL numbers from the data
 "annotate": [{"price": number, "text": short string}],                 // callouts at a price
 "pine": {"name": string, "code": valid Pine v5} | null,                // only when asked for an indicator
 "routine": short string | null }                                      // suggest a reusable routine if relevant
Rules: never invent prices — only use the live data provided or prices the user states. Keep "say" punchy and specific. Omit empty fields.`
    const prompt = `${sys}\n\nRecent: ${JSON.stringify((history || []).slice(-6))}\nUser: ${message}`

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 900, responseMimeType: 'application/json' } }),
    })
    const j = await r.json()
    const txt = j.candidates?.[0]?.content?.parts?.[0]?.text
    let plan: Plan
    try { plan = JSON.parse(txt) } catch { plan = ruleBased(symbol, mc, message) }
    if (!plan.say) plan.say = ruleBased(symbol, mc, message).say
    return NextResponse.json(plan, { headers: CORS })
  } catch {
    return NextResponse.json({ say: 'Something went wrong on the YN brain. Try again.' }, { headers: CORS })
  }
}
