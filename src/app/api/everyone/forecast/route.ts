import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { forecastTicker } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — a REAL verdict:
//  1. the BrainStock net forecasts the market that drives the price (real Yahoo
//     OHLCV → trend, move %, backtested directional accuracy),
//  2. Gemini (with live Google Search grounding) pulls this week's real news/data,
//  3. the two are fused into a calibrated confidence + specific, sourced reasons.
// Every call is logged to prediction_log so the same net keeps learning.

const GEMINI = process.env.GEMINI_API_KEY || ''
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

type Rel = 'with' | 'inverse'
type Cat = { proxy: string; proxyName: string; rel: Rel; emoji: string; noun: string; moves: string; now: string; wait: string; neutral: string; search: string }
const CATS: Record<string, Cat> = {
  mortgage:    { proxy: 'TLT', proxyName: 'TLT — 20yr Treasury ETF',  rel: 'inverse', emoji: '🏠', noun: 'mortgage rates',  moves: 'long-term interest rates', now: 'LOCK',        wait: 'FLOAT',         neutral: 'NEUTRAL', search: 'US mortgage rates this week, the 10-year Treasury yield, Federal Reserve rate path, latest CPI/inflation' },
  gas:         { proxy: 'UGA', proxyName: 'UGA — US Gasoline Fund',    rel: 'with',    emoji: '⛽', noun: 'gas prices',      moves: 'wholesale gasoline & crude', now: 'FILL UP',     wait: 'WAIT',          neutral: 'EITHER',  search: 'US gas prices this week, crude oil price, OPEC decisions, gasoline inventories, refinery outages' },
  flights:     { proxy: 'USO', proxyName: 'USO — US Oil Fund',         rel: 'with',    emoji: '✈️', noun: 'airfares',        moves: 'jet-fuel / crude cost',  now: 'BOOK NOW',    wait: 'WATCH',         neutral: 'EITHER',  search: 'jet fuel and crude oil prices this week, airfare trends, travel demand, airline capacity' },
  electricity: { proxy: 'UNG', proxyName: 'UNG — US Natural Gas Fund', rel: 'with',    emoji: '💡', noun: 'electricity rates', moves: 'natural-gas prices',   now: 'LOCK A PLAN', wait: 'STAY VARIABLE', neutral: 'EITHER',  search: 'US natural gas prices this week, gas storage levels, heating/cooling demand, electricity rate trends' },
}

const monthly = (p: number, a: number, n = 360) => { const r = a / 100 / 12; return r <= 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) }

// 15-min server cache so the live board is instant and we don't spam Gemini/Yahoo.
type Verdict = {
  stance: 'now' | 'wait' | 'neutral'; verdict: string; confidence: number; outlook: string
  headline: string; reasons: string[]; sources: { title: string; uri: string }[]
  backtest: number; movePct: number; engine: string; grounded: boolean; proxy: string; asOf: string
}
const cache = new Map<string, { ts: number; v: Verdict }>()
const TTL = 15 * 60 * 1000

function salvage(t: string): Record<string, unknown> | null {
  if (!t) return null
  try { return JSON.parse(t) } catch {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/i); if (f) { try { return JSON.parse(f[1]) } catch {} }
  const a = t.indexOf('{'), z = t.lastIndexOf('}'); if (a >= 0 && z > a) { try { return JSON.parse(t.slice(a, z + 1)) } catch {} }
  return null
}

// Gemini + live Google Search grounding → judgment fused with the net's signal.
async function geminiJudge(cfg: Cat, quant: { movePct: number; proxyRising: boolean; backtest: number; horizon: number; consumerRising: boolean }) {
  if (!GEMINI) return null
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Today is ${today}. A regular person wants to know whether to ACT NOW or WAIT on ${cfg.noun}.

OUR NEURAL NET (quantitative): it forecasts ${cfg.proxyName} — the market that drives ${cfg.moves} — to move ${quant.movePct >= 0 ? '+' : ''}${quant.movePct.toFixed(1)}% over ~${quant.horizon} trading days (${quant.proxyRising ? 'up' : 'down'}). Backtested direction accuracy on this series: ${quant.backtest}%. That quantitatively implies ${cfg.noun} are heading ${quant.consumerRising ? 'UP' : 'DOWN'}.

YOUR JOB: Use Google Search to pull THIS WEEK's real news and hard data on: ${cfg.search}. Weigh it against the net's signal. Then judge whether ${cfg.noun} are likely to RISE or EASE in the near term and whether the person should act now.

Return ONLY JSON (no prose, no markdown):
{"stance":"now|wait|neutral",  // now = prices likely RISING (act before they do); wait = prices likely EASING; neutral = no clear edge
 "confidence":<integer 50-90; HIGHER when the net signal and the news agree, LOWER when they conflict or news is mixed>,
 "outlook":"rising|easing|flat",
 "headline":"<one plain, punchy sentence a normal person gets, <=12 words>",
 "reasons":["<3 to 4 SPECIFIC reasons, each grounded in a real current fact or number from your search — name the driver (Fed, CPI, OPEC, gas storage, etc.) and the direction>"]}`
  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 900 },
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`
  async function call(withTools: boolean) {
    const body = withTools ? reqBody : { contents: reqBody.contents, generationConfig: reqBody.generationConfig }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok ? r.json() : null
  }
  let j = await call(true).catch(() => null)
  let grounded = !!j
  if (!j) { j = await call(false).catch(() => null); grounded = false }   // retry ungrounded if search tool unavailable
  if (!j) return null
  const cand = j.candidates?.[0]
  const txt = cand?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
  const parsed = salvage(txt) as { stance?: string; confidence?: number; outlook?: string; headline?: string; reasons?: string[] } | null
  if (!parsed) return null
  // grounding sources
  const chunks = cand?.groundingMetadata?.groundingChunks || []
  const sources: { title: string; uri: string }[] = []
  for (const c of chunks) { const w = c?.web; if (w?.uri) sources.push({ title: (w.title || w.uri).slice(0, 60), uri: w.uri }); if (sources.length >= 4) break }
  return { ...parsed, sources, grounded: grounded && sources.length > 0 }
}

async function logForecast(ticker: string, horizon: number, result: Awaited<ReturnType<typeof forecastTicker>>) {
  const admin = getAdmin(); if (!admin) return
  const start = result.history[result.history.length - 1]?.price
  const predicted = result.forecast[result.forecast.length - 1]?.price
  const resolve_date = result.forecast[result.forecast.length - 1]?.date
  if (!start || !predicted || !resolve_date) return
  try {
    await admin.from('prediction_log').upsert({
      trade_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
      ticker, source: 'everyone', start_price: start, predicted, horizon, resolve_date, status: 'open', features: result.features ?? null,
    }, { onConflict: 'trade_date,ticker,source' })
  } catch {}
}

async function buildVerdict(key: string, cfg: Cat, days: number): Promise<Verdict> {
  const cacheKey = `${key}:${days}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < TTL) return hit.v

  const horizon = Math.max(5, Math.min(20, Math.round(days / 2)))
  const admin = getAdmin()
  const model = admin ? await loadTrainedModel(admin) : null
  const result = await forecastTicker(cfg.proxy, horizon, undefined, model)   // real net + real prices
  await logForecast(cfg.proxy, horizon, result)

  const last = result.history[result.history.length - 1]?.price
  const fc = result.forecast[result.forecast.length - 1]?.price
  const movePct = last ? ((fc - last) / last) * 100 : 0
  const proxyRising = fc > last
  const consumerRising = cfg.rel === 'with' ? proxyRising : !proxyRising
  const backtest = Math.round((result.metrics.directional_accuracy ?? 0.5) * 100)

  const g = await geminiJudge(cfg, { movePct, proxyRising, backtest, horizon, consumerRising }).catch(() => null)

  // fuse: prefer the news-grounded judgment; fall back to the net signal alone
  const stance: 'now' | 'wait' | 'neutral' =
    (g?.stance === 'now' || g?.stance === 'wait' || g?.stance === 'neutral') ? g.stance
      : (Math.abs(movePct) < 0.5 ? 'neutral' : consumerRising ? 'now' : 'wait')
  const confidence = g?.confidence ? Math.max(50, Math.min(90, Math.round(g.confidence)))
    : Math.max(51, Math.min(82, Math.round(50 + Math.min(20, Math.abs(movePct) * 5) + (backtest - 55) * 0.4)))
  const verdict = stance === 'now' ? cfg.now : stance === 'wait' ? cfg.wait : cfg.neutral
  const outlook = g?.outlook || (stance === 'neutral' ? 'flat' : consumerRising ? 'rising' : 'easing')
  const headline = g?.headline || (stance === 'now' ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} look set to rise — act now.` : stance === 'wait' ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} look set to ease — wait.` : 'No clear edge right now.')

  const quantLine = `Our neural net forecasts ${cfg.proxy} (${cfg.moves}) ${proxyRising ? 'up' : 'down'} ${Math.abs(movePct).toFixed(1)}% over ~${horizon} sessions — ${backtest}% backtested direction accuracy.`
  const reasons = g?.reasons?.length ? [quantLine, ...g.reasons.slice(0, 4)] : [
    quantLine,
    `That points to ${cfg.noun} ${consumerRising ? 'rising' : 'easing'} in the near term.`,
    result.engine === 'neural-net' ? 'Scored by the trained BrainStock net.' : 'Scored by the baseline while the net builds experience on this series.',
  ]

  const v: Verdict = {
    stance, verdict, confidence, outlook, headline, reasons,
    sources: g?.sources || [], backtest, movePct: +movePct.toFixed(2),
    engine: g?.grounded ? 'net + live news' : result.engine === 'neural-net' ? 'trained net' : 'baseline net',
    grounded: !!g?.grounded, proxy: cfg.proxyName, asOf: new Date().toISOString().slice(0, 10),
  }
  cache.set(cacheKey, { ts: Date.now(), v })
  return v
}

export async function GET(req: Request) {
  const u = new URL(req.url)
  const key = String(u.searchParams.get('category') || 'mortgage').toLowerCase()
  const cfg = CATS[key]
  if (!cfg) return NextResponse.json({ error: 'unknown category' }, { status: 400 })
  const days = Math.max(7, Math.min(120, Number(u.searchParams.get('days')) || 30))

  let v: Verdict
  try { v = await buildVerdict(key, cfg, days) }
  catch (e) { return NextResponse.json({ error: `Couldn't read the market for ${cfg.noun} right now — try again shortly. (${e instanceof Error ? e.message : 'fetch failed'})` }, { status: 502 }) }

  const out: Record<string, unknown> = {
    category: key, emoji: cfg.emoji, noun: cfg.noun,
    verdict: v.verdict, stance: v.stance, confidence: v.confidence, backtest: v.backtest,
    direction: v.outlook, headline: v.headline, drivers: v.reasons, sources: v.sources,
    engine: v.engine, grounded: v.grounded, proxy: v.proxy, asOf: v.asOf, movePct: v.movePct,
  }
  if (key === 'mortgage') {
    const loan = Math.max(1000, Math.min(5_000_000, Number(u.searchParams.get('loan')) || 400_000))
    const offered = Math.max(1, Math.min(15, Number(u.searchParams.get('rate')) || 6.9))
    const base = monthly(loan, offered)
    out.payment = Math.round(base)
    out.saveIfFloat = Math.round(base - monthly(loan, Math.max(0.5, offered - 0.25)))
    out.costIfWait = Math.round(monthly(loan, offered + 0.25) - base)
  }
  return NextResponse.json(out)
}
