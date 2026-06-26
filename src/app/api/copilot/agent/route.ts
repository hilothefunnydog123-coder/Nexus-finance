import { NextRequest, NextResponse } from 'next/server'
import { getQuote, getCandles } from '@/lib/finnhub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// ── CORS so the browser extension (running on tradingview.com) can call us ────
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }

const GEMINI = process.env.GEMINI_API_KEY || ''

// Map a TradingView symbol → a Finnhub-quotable symbol. Futures/indices use the
// liquid ETF proxy; crypto uses Binance pairs. Strips exchange prefix + contract
// month codes (NQ1!, MNQU2024, CME_MINI:NQ1! → QQQ).
function normalize(raw: string): { sym: string; proxy: string | null } {
  let s = (raw || '').toUpperCase().trim()
  if (s.includes(':')) s = s.split(':').pop() as string
  s = s.replace(/\s+/g, '')
  if (/^X?BT|^BTC/.test(s)) return { sym: 'BINANCE:BTCUSDT', proxy: 'BTC' }
  if (/^ETH/.test(s)) return { sym: 'BINANCE:ETHUSDT', proxy: 'ETH' }
  if (/^SOL/.test(s)) return { sym: 'BINANCE:SOLUSDT', proxy: 'SOL' }
  // futures root: drop trailing "1!" or a month-year like U2024 / Z23
  const root = s.replace(/[0-9]*!$/, '').replace(/[FGHJKMNQUVXZ][0-9]{1,2}$/, '')
  const FUT: Record<string, string> = {
    NQ: 'QQQ', MNQ: 'QQQ', NDX: 'QQQ', US100: 'QQQ', NAS100: 'QQQ', USTEC: 'QQQ',
    ES: 'SPY', MES: 'SPY', SPX: 'SPY', SPX500: 'SPY', US500: 'SPY', SP: 'SPY',
    YM: 'DIA', MYM: 'DIA', DJI: 'DIA', US30: 'DIA',
    RTY: 'IWM', M2K: 'IWM', RUT: 'IWM',
    CL: 'USO', MCL: 'USO', NG: 'UNG', GC: 'GLD', MGC: 'GLD', SI: 'SLV',
    ZB: 'TLT', ZN: 'IEF', DXY: 'UUP',
  }
  if (FUT[root]) return { sym: FUT[root], proxy: root }
  if (FUT[s]) return { sym: FUT[s], proxy: s }
  return { sym: (root || s).replace(/!$/, ''), proxy: null }
}

async function marketContext(symbol: string) {
  const { sym, proxy } = normalize(symbol)
  const out: Record<string, number> = {}
  let live = false
  // quote works on the Finnhub free tier — price + today's O/H/L + prev close
  try {
    const q = await getQuote(sym)
    if (q && typeof q.price === 'number' && q.price > 0) {
      out.price = q.price; out.dayOpen = q.open; out.dayHigh = q.high; out.dayLow = q.low; out.prevClose = q.previousClose
      live = true
    }
  } catch {}
  // daily candles (premium on some tiers) — adds prior-day H/L + EMAs when available
  try {
    const now = Math.floor(Date.now() / 1000)
    const c = await getCandles(sym, 'D', now - 60 * 86400, now)
    if (c && c.length > 2) {
      const n = c.length
      out.priorDayHigh = +c[n - 2].high.toFixed(2); out.priorDayLow = +c[n - 2].low.toFixed(2); out.priorDayClose = +c[n - 2].close.toFixed(2)
      const closes = c.map((x) => x.close)
      const ema = (len: number) => { const k = 2 / (len + 1); let e = closes[0]; for (let i = 1; i < n; i++) e = closes[i] * k + e * (1 - k); return +e.toFixed(2) }
      if (n >= 20) out.ema20 = ema(20)
      if (n >= 50) out.ema50 = ema(50)
      if (n >= 200) out.ema200 = ema(200)
      out.high20 = +Math.max(...c.slice(-20).map((x) => x.high)).toFixed(2)
      out.low20 = +Math.min(...c.slice(-20).map((x) => x.low)).toFixed(2)
    }
  } catch {}
  return { sym, proxy, live, data: out }
}

type Plan = { say: string; draw?: { price: number; label: string; color?: string }[]; annotate?: { price: number; text: string }[]; pine?: { name: string; code: string }; routine?: string }

const PINE_LEVELS = `//@version=5
indicator("YN Levels — PDH/PDL + 200 EMA", overlay=true)
pdh = request.security(syminfo.tickerid, "D", high[1])
pdl = request.security(syminfo.tickerid, "D", low[1])
plot(pdh, "PDH", color=color.red,   linewidth=1, style=plot.style_linebr)
plot(pdl, "PDL", color=color.green, linewidth=1, style=plot.style_linebr)
plot(ta.ema(close, 200), "200 EMA", color=color.orange, linewidth=2)`

// Always-useful fallback: build levels from whatever real data we have.
function ruleBased(symbol: string, mc: Awaited<ReturnType<typeof marketContext>>, message: string): Plan {
  const d = mc.data
  if (/indicator|pine|script|code/i.test(message)) return { say: `Here's a prior-day-high/low + 200 EMA indicator for ${symbol}. Hit "Paste into TradingView".`, pine: { name: 'YN Levels', code: PINE_LEVELS } }
  const draw: Plan['draw'] = []
  if (d.priorDayHigh) draw.push({ price: d.priorDayHigh, label: 'PDH', color: '#ef4444' })
  if (d.priorDayLow) draw.push({ price: d.priorDayLow, label: 'PDL', color: '#10b981' })
  if (d.prevClose) draw.push({ price: d.prevClose, label: 'Prev Close', color: '#9aa3c8' })
  if (d.dayHigh) draw.push({ price: d.dayHigh, label: 'Day High', color: '#ef4444' })
  if (d.dayLow) draw.push({ price: d.dayLow, label: 'Day Low', color: '#10b981' })
  if (d.ema200) draw.push({ price: d.ema200, label: '200 EMA', color: '#f5a623' })
  const px = d.price ? `${symbol} is ${d.price}` : symbol
  const rng = d.dayLow && d.dayHigh ? `, today ${d.dayLow}–${d.dayHigh}` : ''
  const note = mc.proxy ? ` (using ${mc.sym} as the ${mc.proxy} proxy)` : ''
  const say = draw.length ? `${px}${rng}${note}. Marked ${draw.map((x) => x.label).join(', ')} — watch reactions there.` : `I couldn't pull live data for ${symbol}. Tell me the prices and I'll mark them (e.g. "draw support at 432.5").`
  return { say, draw }
}

export async function POST(req: NextRequest) {
  try {
    const { symbol = '', timeframe = '', message = '', history = [] } = await req.json()
    const mc = await marketContext(symbol)
    const hasData = Object.keys(mc.data).length > 0

    if (!GEMINI || !hasData) return NextResponse.json(ruleBased(symbol, mc, message), { headers: CORS })

    const sys = `You are YN Copilot, an elite trading assistant embedded INSIDE the user's TradingView chart. You take ACTIONS by returning JSON.
Chart: symbol=${symbol} timeframe=${timeframe}. ${mc.proxy ? `(${symbol} is a future/index — data is the ${mc.sym} proxy; mention this once.)` : ''}
LIVE DATA (real, use it — never say you lack data): ${JSON.stringify(mc.data)}
Return ONLY JSON:
{"say": string (2-4 punchy spoken sentences, no markdown),
 "draw": [{"price": number, "label": short, "color"?: hex}],   // levels to draw — ONLY numbers from LIVE DATA or that the user states
 "annotate": [{"price": number, "text": short}],
 "pine": {"name": string, "code": valid Pine v5} | null,        // only when asked for an indicator
 "routine": short | null }
Rules: You ALWAYS have at least the current price + today's range above — give a real read and mark levels from it. NEVER invent prices. NEVER refuse for lack of data. Omit empty fields.`
    const prompt = `${sys}\n\nRecent: ${JSON.stringify((history || []).slice(-6))}\nUser: ${message}`

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.4, maxOutputTokens: 900, responseMimeType: 'application/json' } }),
    })
    const j = await r.json()
    const txt = j.candidates?.[0]?.content?.parts?.[0]?.text
    let plan: Plan
    try { plan = JSON.parse(txt) } catch { plan = ruleBased(symbol, mc, message) }
    if (!plan.say && !plan.draw && !plan.pine) plan = ruleBased(symbol, mc, message)
    return NextResponse.json(plan, { headers: CORS })
  } catch {
    return NextResponse.json({ say: 'Something went wrong on the YN brain. Try again in a sec.' }, { headers: CORS })
  }
}
