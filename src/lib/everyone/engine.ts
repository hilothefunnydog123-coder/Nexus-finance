/**
 * YN for Everyone — the shared verdict engine.
 *
 * Turns a consumer question ("buy now or wait?") into a REAL, calibrated verdict by:
 *   1. running the BrainStock neural net on TWO corroborating market proxies per
 *      category (a multi-signal ensemble) on real Yahoo OHLCV,
 *   2. combining their directional signals + magnitudes into one robust trend with
 *      an explicit agreement score,
 *   3. fusing that with Gemini 2.5 Flash + live Google Search grounding (real
 *      reasons, source links, a "what changed this week" line),
 *   4. deriving a calibrated confidence from signal strength, the net's backtested
 *      directional accuracy, proxy agreement, and net↔news agreement.
 *
 * Every primary forecast is logged to prediction_log (source 'everyone') so the
 * same grading/training crons keep learning. Nothing here ever throws to a client.
 *
 * Shared by /api/everyone/forecast (single category) and /api/everyone/snapshot
 * (precomputed board of all four). Both go through buildVerdict, which is cached
 * 15 min in-memory so the live board is instant and we don't spam Yahoo/Gemini.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { forecastTicker } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'
import type { NNModel } from '@/lib/nn'

const GEMINI = process.env.GEMINI_API_KEY || ''
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function getAdmin(): SupabaseClient | null {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

type Rel = 'with' | 'inverse'

/** A market proxy and how its move maps onto the consumer price. */
export type Leg = { proxy: string; proxyName: string; rel: Rel; weight: number }

export type Cat = {
  emoji: string
  noun: string
  moves: string
  now: string
  wait: string
  neutral: string
  search: string
  /** primary leg first (it's the one logged); secondary leg corroborates. */
  legs: [Leg, Leg]
}

/**
 * Category → multi-signal proxy ensemble.
 * Primary leg drives the headline market; the second corroborates a related risk.
 *   mortgage:   TLT (long rates, inverse) + IEF (intermediate rates, inverse)
 *   gas:        UGA (gasoline)            + USO (crude)
 *   flights:    USO (jet-fuel/crude)      + JETS (airline cost/demand, inverse — when
 *               airlines rally the market expects cheaper-to-fly / strong supply, so
 *               fares ease; weighted lightly as it's a demand cross-check)
 *   electricity:UNG (natural gas)         + XLU (utilities, inverse — utility strength
 *               tends to coincide with softer wholesale power pass-through)
 */
export const CATS: Record<string, Cat> = {
  mortgage: {
    emoji: '🏠', noun: 'mortgage rates', moves: 'long-term interest rates',
    now: 'LOCK', wait: 'FLOAT', neutral: 'NEUTRAL',
    search: 'US mortgage rates this week, the 10-year Treasury yield, Federal Reserve rate path, latest CPI/inflation',
    legs: [
      { proxy: 'TLT', proxyName: 'TLT — 20yr Treasury ETF', rel: 'inverse', weight: 0.6 },
      { proxy: 'IEF', proxyName: 'IEF — 7-10yr Treasury ETF', rel: 'inverse', weight: 0.4 },
    ],
  },
  gas: {
    emoji: '⛽', noun: 'gas prices', moves: 'wholesale gasoline & crude',
    now: 'FILL UP', wait: 'WAIT', neutral: 'EITHER',
    search: 'US gas prices this week, crude oil price, OPEC decisions, gasoline inventories, refinery outages',
    legs: [
      { proxy: 'UGA', proxyName: 'UGA — US Gasoline Fund', rel: 'with', weight: 0.6 },
      { proxy: 'USO', proxyName: 'USO — US Oil Fund', rel: 'with', weight: 0.4 },
    ],
  },
  flights: {
    emoji: '✈️', noun: 'airfares', moves: 'jet-fuel / crude cost',
    now: 'BOOK NOW', wait: 'WATCH', neutral: 'EITHER',
    search: 'jet fuel and crude oil prices this week, airfare trends, travel demand, airline capacity',
    legs: [
      { proxy: 'USO', proxyName: 'USO — US Oil Fund', rel: 'with', weight: 0.65 },
      { proxy: 'JETS', proxyName: 'JETS — US Global Jets ETF', rel: 'inverse', weight: 0.35 },
    ],
  },
  electricity: {
    emoji: '💡', noun: 'electricity rates', moves: 'natural-gas prices',
    now: 'LOCK A PLAN', wait: 'STAY VARIABLE', neutral: 'EITHER',
    search: 'US natural gas prices this week, gas storage levels, heating/cooling demand, electricity rate trends',
    legs: [
      { proxy: 'UNG', proxyName: 'UNG — US Natural Gas Fund', rel: 'with', weight: 0.6 },
      { proxy: 'XLU', proxyName: 'XLU — Utilities Select Sector', rel: 'inverse', weight: 0.4 },
    ],
  },
}

export type Verdict = {
  stance: 'now' | 'wait' | 'neutral'
  verdict: string
  confidence: number
  outlook: string
  headline: string
  reasons: string[]
  sources: { title: string; uri: string }[]
  backtest: number
  movePct: number
  agreement: number
  whatChanged: string
  engine: string
  grounded: boolean
  proxy: string
  asOf: string
}

const cache = new Map<string, { ts: number; v: Verdict }>()
const TTL = 15 * 60 * 1000

function salvage(t: string): Record<string, unknown> | null {
  if (!t) return null
  try {
    return JSON.parse(t)
  } catch {}
  const f = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (f) {
    try {
      return JSON.parse(f[1])
    } catch {}
  }
  const a = t.indexOf('{'), z = t.lastIndexOf('}')
  if (a >= 0 && z > a) {
    try {
      return JSON.parse(t.slice(a, z + 1))
    } catch {}
  }
  return null
}

// ── one leg's net forecast ──────────────────────────────────────────────────
type LegSignal = {
  leg: Leg
  ok: boolean
  movePct: number          // proxy's forecast move %
  consumerMovePct: number  // signed toward the CONSUMER price (rel-adjusted)
  consumerRising: boolean
  backtest: number         // 0-100, net's directional accuracy on this series
  engine: 'neural-net' | 'baseline'
  result: Awaited<ReturnType<typeof forecastTicker>> | null
}

async function runLeg(leg: Leg, horizon: number, model: NNModel | null): Promise<LegSignal> {
  try {
    const result = await forecastTicker(leg.proxy, horizon, undefined, model)
    const last = result.history[result.history.length - 1]?.price ?? 0
    const fc = result.forecast[result.forecast.length - 1]?.price ?? last
    const movePct = last ? ((fc - last) / last) * 100 : 0
    const proxyRising = fc > last
    const consumerRising = leg.rel === 'with' ? proxyRising : !proxyRising
    // signed toward the consumer price: + means consumer price rising
    const consumerMovePct = leg.rel === 'with' ? movePct : -movePct
    const backtest = Math.round((result.metrics.directional_accuracy ?? 0.5) * 100)
    return { leg, ok: true, movePct, consumerMovePct, consumerRising, backtest, engine: result.engine, result }
  } catch {
    return { leg, ok: false, movePct: 0, consumerMovePct: 0, consumerRising: false, backtest: 50, engine: 'baseline', result: null }
  }
}

async function logForecast(ticker: string, horizon: number, result: Awaited<ReturnType<typeof forecastTicker>>, admin: SupabaseClient | null) {
  if (!admin) return
  const start = result.history[result.history.length - 1]?.price
  const predicted = result.forecast[result.forecast.length - 1]?.price
  const resolve_date = result.forecast[result.forecast.length - 1]?.date
  if (!start || !predicted || !resolve_date) return
  try {
    await admin.from('prediction_log').upsert(
      {
        trade_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
        ticker,
        source: 'everyone',
        start_price: start,
        predicted,
        horizon,
        resolve_date,
        status: 'open',
        features: result.features ?? null,
      },
      { onConflict: 'trade_date,ticker,source' },
    )
  } catch {}
}

// ── Gemini + live Google Search grounding ───────────────────────────────────
type GeminiOut = {
  stance?: string
  confidence?: number
  outlook?: string
  headline?: string
  reasons?: string[]
  whatChanged?: string
  sources: { title: string; uri: string }[]
  grounded: boolean
}

async function geminiJudge(
  cfg: Cat,
  quant: { ensembleMovePct: number; consumerRising: boolean; backtest: number; horizon: number; agreement: number },
): Promise<GeminiOut | null> {
  if (!GEMINI) return null
  const today = new Date().toISOString().slice(0, 10)
  const prompt = `Today is ${today}. A regular person wants to know whether to ACT NOW or WAIT on ${cfg.noun}.

OUR NEURAL-NET ENSEMBLE (quantitative): two related markets that drive ${cfg.moves} were each forecast by our net and blended. The blended signal implies ${cfg.noun} are heading ${quant.consumerRising ? 'UP' : 'DOWN'} (${quant.ensembleMovePct >= 0 ? '+' : ''}${quant.ensembleMovePct.toFixed(1)}% over ~${quant.horizon} trading days). Backtested direction accuracy on these series: ${quant.backtest}%. The two proxies agree with each other ${(quant.agreement * 100).toFixed(0)}%.

YOUR JOB: Use Google Search to pull THIS WEEK's real news and hard data on: ${cfg.search}. Weigh it against the net's signal. Then judge whether ${cfg.noun} are likely to RISE or EASE in the near term and whether the person should act now.

Return ONLY JSON (no prose, no markdown):
{"stance":"now|wait|neutral",  // now = prices likely RISING (act before they do); wait = prices likely EASING; neutral = no clear edge
 "confidence":<integer 50-90; HIGHER when the net signal and the news agree, LOWER when they conflict or news is mixed>,
 "outlook":"rising|easing|flat",
 "headline":"<one plain, punchy sentence a normal person gets, <=12 words>",
 "whatChanged":"<one sentence: what specifically changed in the news THIS WEEK that matters, with a real driver/number>",
 "reasons":["<3 to 4 SPECIFIC reasons, each grounded in a real current fact or number from your search — name the driver (Fed, CPI, OPEC, gas storage, etc.) and the direction>"]}`

  const reqBody = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    tools: [{ google_search: {} }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 1000 },
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`
  async function call(withTools: boolean) {
    const body = withTools ? reqBody : { contents: reqBody.contents, generationConfig: reqBody.generationConfig }
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    return r.ok ? r.json() : null
  }
  let j = await call(true).catch(() => null)
  let grounded = !!j
  if (!j) {
    j = await call(false).catch(() => null) // retry ungrounded if search tool unavailable
    grounded = false
  }
  if (!j) return null
  const cand = j.candidates?.[0]
  const txt = cand?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') || ''
  const parsed = salvage(txt) as
    | { stance?: string; confidence?: number; outlook?: string; headline?: string; reasons?: string[]; whatChanged?: string }
    | null
  if (!parsed) return null
  const chunks = cand?.groundingMetadata?.groundingChunks || []
  const sources: { title: string; uri: string }[] = []
  for (const c of chunks) {
    const w = c?.web
    if (w?.uri) sources.push({ title: (w.title || w.uri).slice(0, 60), uri: w.uri })
    if (sources.length >= 4) break
  }
  return { ...parsed, sources, grounded: grounded && sources.length > 0 }
}

const cap = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s)

/**
 * CONFIDENCE FORMULA (calibrated, no magic precision).
 *
 * Confidence is the probability-like strength of the call, built from four real,
 * independent factors and then bounded to [50, 92]:
 *
 *   base               = 50                              (a coin flip — no edge)
 *   + strengthBoost     up to +18, from |ensemble move %| (signal magnitude):
 *                          min(18, |move%| * 5) — a bigger forecast move = more edge.
 *   + skillBoost        up to +12, from the net's backtested directional accuracy:
 *                          (backtest - 55) * 0.5, clamped to [-8, +12]. Accuracy
 *                          below 55% (near chance) subtracts; genuine skill adds.
 *   + proxyAgreeBoost   up to +10, from how much the TWO proxies agree on direction
 *                          and magnitude (agreement ∈ [0,1]): (agreement - 0.5) * 20,
 *                          clamped to [-6, +10]. Two markets corroborating = robust.
 *   + newsAgreeBoost    ±10, from whether Gemini's news stance matches the net:
 *                          +10 agree, -12 conflict, 0 if news neutral/absent.
 *
 * When Gemini returns its own confidence we blend 50/50 with the quantitative
 * score (the model has read live news we haven't), then re-apply the news-agree
 * sign so a genuine conflict can never read as high-confidence. Net-only (no
 * Gemini) just uses the quantitative score. Everything clamps to [50, 92].
 */
function calibrateConfidence(opts: {
  ensembleMovePct: number
  backtest: number
  agreement: number
  consumerRising: boolean
  gemini: GeminiOut | null
}): number {
  const { ensembleMovePct, backtest, agreement, consumerRising, gemini } = opts
  const base = 50
  const strengthBoost = Math.min(18, Math.abs(ensembleMovePct) * 5)
  const skillBoost = clamp((backtest - 55) * 0.5, -8, 12)
  const proxyAgreeBoost = clamp((agreement - 0.5) * 20, -6, 10)

  let newsAgreeBoost = 0
  if (gemini && (gemini.stance === 'now' || gemini.stance === 'wait' || gemini.stance === 'neutral')) {
    const netStance = Math.abs(ensembleMovePct) < 0.4 ? 'neutral' : consumerRising ? 'now' : 'wait'
    if (gemini.stance === 'neutral' || netStance === 'neutral') newsAgreeBoost = 0
    else if (gemini.stance === netStance) newsAgreeBoost = 10
    else newsAgreeBoost = -12
  }

  const quant = base + strengthBoost + skillBoost + proxyAgreeBoost + newsAgreeBoost

  let conf = quant
  if (gemini?.confidence && gemini.confidence >= 50) {
    // blend the model's news-aware confidence with ours, then keep the conflict penalty.
    conf = (quant + clamp(gemini.confidence, 50, 92)) / 2 + (newsAgreeBoost < 0 ? newsAgreeBoost / 2 : 0)
  }
  return Math.round(clamp(conf, 50, 92))
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

/**
 * Proxy agreement ∈ [0,1]: 1 when both legs point the SAME consumer direction with
 * similar magnitude; ~0.5 on a magnitude mismatch; low when they disagree on sign.
 */
function proxyAgreement(a: LegSignal, b: LegSignal): number {
  if (!a.ok || !b.ok) return 0.5 // only one usable signal → neutral agreement
  const sameDir = a.consumerRising === b.consumerRising
  const ma = Math.abs(a.consumerMovePct)
  const mb = Math.abs(b.consumerMovePct)
  const magSim = 1 - Math.abs(ma - mb) / (Math.max(ma, mb) + 0.5) // 0..1, robust to tiny moves
  return sameDir ? clamp(0.6 + 0.4 * magSim, 0, 1) : clamp(0.4 * magSim, 0, 0.45)
}

export async function buildVerdict(key: string, cfg: Cat, days: number): Promise<Verdict> {
  const cacheKey = `${key}:${days}`
  const hit = cache.get(cacheKey)
  if (hit && Date.now() - hit.ts < TTL) return hit.v

  const horizon = Math.max(5, Math.min(20, Math.round(days / 2)))
  const admin = getAdmin()
  const model = admin ? await loadTrainedModel(admin) : null

  // ── multi-signal ensemble: run the net on BOTH proxies in parallel ──────────
  const [primary, secondary] = await Promise.all([runLeg(cfg.legs[0], horizon, model), runLeg(cfg.legs[1], horizon, model)])

  // log only the primary proxy so the existing grading/training crons learn.
  if (primary.ok && primary.result) await logForecast(cfg.legs[0].proxy, horizon, primary.result, admin)

  // weighted blend toward the consumer price (rel-adjusted), down-weighting a failed leg.
  const usable = [primary, secondary].filter((l) => l.ok)
  if (usable.length === 0) {
    // both proxies failed to fetch — surface an honest neutral instead of throwing.
    const v: Verdict = {
      stance: 'neutral', verdict: cfg.neutral, confidence: 50, outlook: 'flat',
      headline: 'Market data is unavailable right now — check back shortly.',
      reasons: ['We could not read the markets that drive this price right now.'],
      sources: [], backtest: 50, movePct: 0, agreement: 0, whatChanged: '',
      engine: 'unavailable', grounded: false, proxy: cfg.legs[0].proxyName,
      asOf: new Date().toISOString().slice(0, 10),
    }
    return v // not cached — transient failure should retry next call
  }

  const wsum = usable.reduce((s, l) => s + l.leg.weight, 0) || 1
  const ensembleMovePct = usable.reduce((s, l) => s + l.consumerMovePct * l.leg.weight, 0) / wsum
  const consumerRising = ensembleMovePct >= 0
  const agreement = proxyAgreement(primary, secondary)
  // ensemble backtest = weighted directional accuracy of the legs that ran.
  const backtest = Math.round(usable.reduce((s, l) => s + l.backtest * l.leg.weight, 0) / wsum)
  const anyNet = usable.some((l) => l.engine === 'neural-net')

  const g = await geminiJudge(cfg, { ensembleMovePct, consumerRising, backtest, horizon, agreement }).catch(() => null)

  // fuse: prefer the news-grounded stance; fall back to the ensemble signal alone.
  const netStance: 'now' | 'wait' | 'neutral' = Math.abs(ensembleMovePct) < 0.4 ? 'neutral' : consumerRising ? 'now' : 'wait'
  const stance: 'now' | 'wait' | 'neutral' =
    g?.stance === 'now' || g?.stance === 'wait' || g?.stance === 'neutral' ? g.stance : netStance

  const confidence = calibrateConfidence({ ensembleMovePct, backtest, agreement, consumerRising, gemini: g })

  const verdict = stance === 'now' ? cfg.now : stance === 'wait' ? cfg.wait : cfg.neutral
  const outlook = g?.outlook || (stance === 'neutral' ? 'flat' : consumerRising ? 'rising' : 'easing')
  const headline =
    g?.headline ||
    (stance === 'now'
      ? `${cap(cfg.noun)} look set to rise — act now.`
      : stance === 'wait'
        ? `${cap(cfg.noun)} look set to ease — wait.`
        : 'No clear edge right now.')

  const legLine = usable
    .map((l) => `${l.leg.proxy} ${l.consumerMovePct >= 0 ? 'up' : 'down'} ${Math.abs(l.movePct).toFixed(1)}%`)
    .join(', ')
  const quantLine = `Our neural-net ensemble (${legLine}; ${cfg.moves}) points ${cfg.noun} ${consumerRising ? 'UP' : 'DOWN'} ~${Math.abs(ensembleMovePct).toFixed(1)}% over ~${horizon} sessions — ${backtest}% backtested direction accuracy, ${(agreement * 100).toFixed(0)}% proxy agreement.`

  const reasons = g?.reasons?.length
    ? [quantLine, ...g.reasons.slice(0, 4)]
    : [
        quantLine,
        `That points to ${cfg.noun} ${consumerRising ? 'rising' : 'easing'} in the near term.`,
        anyNet
          ? 'Scored by the trained BrainStock net on both proxies.'
          : 'Scored by the baseline while the net builds experience on these series.',
      ]

  const whatChanged = g?.whatChanged?.trim() || ''

  const v: Verdict = {
    stance, verdict, confidence, outlook, headline, reasons,
    sources: g?.sources || [],
    backtest,
    movePct: +ensembleMovePct.toFixed(2),
    agreement: +agreement.toFixed(2),
    whatChanged,
    engine: g?.grounded ? 'net ensemble + live news' : anyNet ? 'trained net ensemble' : 'baseline ensemble',
    grounded: !!g?.grounded,
    proxy: cfg.legs[0].proxyName,
    asOf: new Date().toISOString().slice(0, 10),
  }
  cache.set(cacheKey, { ts: Date.now(), v })
  return v
}

const monthlyPayment = (p: number, a: number, n = 360) => {
  const r = a / 100 / 12
  return r <= 0 ? p / n : (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

/** Mortgage-only payment math, kept here so both routes can reuse it. */
export function mortgageMath(loan: number, offered: number) {
  const base = monthlyPayment(loan, offered)
  return {
    payment: Math.round(base),
    saveIfFloat: Math.round(base - monthlyPayment(loan, Math.max(0.5, offered - 0.25))),
    costIfWait: Math.round(monthlyPayment(loan, offered + 0.25) - base),
  }
}

/** Flatten a Verdict + category into the public contract shape (superset-safe). */
export function toPublic(key: string, cfg: Cat, v: Verdict): Record<string, unknown> {
  return {
    category: key,
    emoji: cfg.emoji,
    noun: cfg.noun,
    verdict: v.verdict,
    stance: v.stance,
    confidence: v.confidence,
    backtest: v.backtest,
    direction: v.outlook,
    headline: v.headline,
    drivers: v.reasons,
    sources: v.sources,
    engine: v.engine,
    grounded: v.grounded,
    proxy: v.proxy,
    asOf: v.asOf,
    movePct: v.movePct,
    // superset extras other UIs may use:
    agreement: v.agreement,
    whatChanged: v.whatChanged,
  }
}

/** ticker → category, for the track-record endpoint (primary proxies only). */
export const PROXY_TO_CAT: Record<string, { category: string; proxy: string }> = {
  TLT: { category: 'mortgage', proxy: 'TLT — 20yr Treasury ETF' },
  UGA: { category: 'gas', proxy: 'UGA — US Gasoline Fund' },
  USO: { category: 'flights', proxy: 'USO — US Oil Fund' },
  UNG: { category: 'electricity', proxy: 'UNG — US Natural Gas Fund' },
}
