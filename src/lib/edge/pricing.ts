/**
 * YN Edge pricing engine (Phase 2) — the core.
 *
 * ONE estimator interface, `priceMarket`, gives EVERY market a YN probability +
 * reasoning:
 *
 *  • Tradable underlying (S&P, Nasdaq, BTC, gold, oil, the 10-yr, single stocks):
 *    parse the strike + direction + close date, map to the Yahoo symbol, run the
 *    BrainStock neural net to forecast the underlying's drift to the close date,
 *    and convert (forecast drift + realized volatility) into a real P(resolves
 *    YES) under a lognormal terminal-price model.
 *
 *  • Everything else (politics, weather, econ prints, culture): Gemini 2.5 Flash
 *    with live Google-Search grounding returns a calibrated probability with
 *    cited reasoning.
 *
 * Both paths degrade gracefully: no trained net → transparent EWMA-drift
 * baseline; no Gemini key → market-anchored prior with low confidence. The
 * feature always produces a number, and always says which engine produced it.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchBars, predictNext } from '@/lib/forecast'
import { featurize, predict, type NNModel } from '@/lib/nn'
import { loadTrainedModel } from '@/lib/nnStore'
import type { EdgePricing, ForecastChartPoint, KalshiMarket } from './types'
import { parseMarketTitle, matchUnderlying, businessDaysUntil } from './underlying'
import { normCdf, clamp01, clamp } from './stats'

// Many markets resolve to the SAME underlying (dozens of S&P / BTC strikes), so
// cache the bar series per symbol for the whole board build — one Yahoo hit each.
type Bars = Awaited<ReturnType<typeof fetchBars>>
const _barsCache = new Map<string, { at: number; bars: Bars }>()
async function cachedBars(symbol: string, signal?: AbortSignal): Promise<Bars> {
  const hit = _barsCache.get(symbol)
  if (hit && Date.now() - hit.at < 120_000) return hit.bars
  const bars = await fetchBars(symbol, signal)
  _barsCache.set(symbol, { at: Date.now(), bars })
  return bars
}

// The net's output represents roughly a one-week (5 trading-day) log return; its
// short-horizon signal decays, so we saturate the drift contribution over longer
// windows while volatility keeps growing with √time. Defensible and conservative.
const NN_HORIZON = 5
const DRIFT_SATURATION = 18 // trading days at which extra drift mostly stops mattering

function isCrypto(symbol: string): boolean {
  return symbol.includes('-USD')
}

/** Calendar days until close (crypto trades 24/7). */
function calendarDaysUntil(closeISO: string): number {
  const ms = new Date(closeISO).getTime() - Date.now()
  return Math.max(1, Math.round(ms / 86_400_000))
}

/** Daily log-return volatility from a close series (uses the last ~40 bars). */
function dailyLogVol(closes: number[]): number {
  const rets: number[] = []
  const start = Math.max(1, closes.length - 40)
  for (let i = start; i < closes.length; i++) {
    const r = Math.log(closes[i] / closes[i - 1])
    if (Number.isFinite(r)) rets.push(r)
  }
  if (rets.length < 5) return 0.012
  const m = rets.reduce((s, x) => s + x, 0) / rets.length
  const v = rets.reduce((s, x) => s + (x - m) ** 2, 0) / rets.length
  return Math.sqrt(v) || 0.012
}

/** Saturating drift horizon — short-term signal shouldn't extrapolate forever. */
function effectiveDriftDays(tradingDays: number): number {
  return DRIFT_SATURATION * (1 - Math.exp(-tradingDays / DRIFT_SATURATION))
}

/**
 * Price a market that maps to a tradable underlying with the neural net.
 * Returns null if the title can't be parsed or data can't be fetched (caller
 * then falls back to the Gemini / market-anchored path).
 */
export async function priceWithNet(
  market: KalshiMarket,
  model: NNModel | null,
  signal?: AbortSignal
): Promise<EdgePricing | null> {
  const parsed = parseMarketTitle(market.title)
  if (!parsed) return null
  const { underlying, direction } = parsed
  const strike = parsed.strike

  let bars
  try {
    bars = await cachedBars(underlying.symbol, signal)
  } catch {
    return null
  }
  const closes = bars.map((b) => b.c)
  let last = closes[closes.length - 1]

  // ^TNX legacy ×10 convention guard: align strike (e.g. 4.5%) with the series.
  if (underlying.symbol === '^TNX' && last > 15 && strike < 15) last = last / 10

  const tradingDays = isCrypto(underlying.symbol) ? calendarDaysUntil(market.closeTime) : businessDaysUntil(market.closeTime)
  const sigmaD = dailyLogVol(closes)
  const sigmaTotal = Math.max(sigmaD * Math.sqrt(tradingDays), 1e-4)

  // Drift: trained net → predicted horizon log-return; else EWMA baseline.
  const feats = featurize(bars.map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v })))
  let perDayDrift: number
  let engine: EdgePricing['engine']
  let skillScore: number | undefined
  if (model && feats) {
    const rHat = predict(model, feats) // total log-return over ~NN_HORIZON days
    perDayDrift = rHat / NN_HORIZON
    engine = 'brainstock-nn'
  } else {
    perDayDrift = Math.log(predictNext(closes) / last) // transparent 1-day EWMA drift
    engine = 'baseline'
  }

  const driftDays = effectiveDriftDays(tradingDays)
  const expLogPrice = Math.log(last) + perDayDrift * driftDays
  const expectedPrice = Math.exp(expLogPrice)

  // P(resolves YES) under a lognormal terminal price.
  const z = (expLogPrice - Math.log(strike)) / sigmaTotal
  const pAbove = normCdf(z)
  const ynProb = clamp01(direction === 'above' ? pAbove : 1 - pAbove)

  // Confidence: more skill + a clearer (further-from-coin-flip) call + nearer
  // close + real net all raise it.
  if (model && feats) {
    // crude in-sample skill proxy: bigger |drift| relative to vol = more conviction
    skillScore = clamp(Math.abs(perDayDrift) / (sigmaD || 1), 0, 1)
  }
  const decisiveness = Math.abs(ynProb - 0.5) * 2 // 0 at coin-flip, 1 at certainty
  const horizonPenalty = clamp(1 - tradingDays / 120, 0.4, 1) // less sure far out
  const enginePrior = engine === 'brainstock-nn' ? 0.72 : 0.5
  const confidence = clamp(enginePrior * (0.55 + 0.45 * decisiveness) * horizonPenalty, 0.2, 0.92)

  const chart = buildForecastChart(bars, expectedPrice, tradingDays)

  const dirWord = direction === 'above' ? 'above' : 'below'
  const reasoning =
    `BrainStock${engine === 'baseline' ? ' baseline' : ''} forecasts ${underlying.name} at ` +
    `~${fmt(expectedPrice)} by close (now ${fmt(last)}), with ${(sigmaTotal * 100).toFixed(1)}% total volatility ` +
    `over ${tradingDays} trading day${tradingDays === 1 ? '' : 's'}. Under a lognormal terminal-price model that puts ` +
    `P(${underlying.name} ${dirWord} ${fmt(strike)}) at ${(ynProb * 100).toFixed(0)}%, vs the market's ${(market.yesPrice * 100).toFixed(0)}%.`

  return {
    ynProb,
    engine,
    confidence,
    reasoning,
    underlying: {
      symbol: underlying.symbol,
      name: underlying.name,
      lastPrice: +last.toFixed(4),
      strike,
      direction,
      expectedPrice: +expectedPrice.toFixed(4),
      sigma: +sigmaTotal.toFixed(4),
      businessDays: tradingDays,
      skillScore,
      chart,
    },
  }
}

function buildForecastChart(
  bars: { date: string; c: number }[],
  expectedPrice: number,
  tradingDays: number
): ForecastChartPoint[] {
  const hist = bars.slice(-40).map((b) => ({ date: b.date, price: +b.c.toFixed(2), kind: 'history' as const }))
  const last = bars[bars.length - 1]
  const out: ForecastChartPoint[] = [...hist]
  const steps = Math.min(12, Math.max(3, Math.round(tradingDays / 2)))
  const startPrice = last.c
  const startDate = new Date(last.date + 'T00:00:00Z')
  const logStep = (Math.log(expectedPrice) - Math.log(startPrice)) / steps
  // anchor the forecast line at "now"
  out.push({ date: last.date, price: +startPrice.toFixed(2), kind: 'forecast' })
  for (let i = 1; i <= steps; i++) {
    const d = new Date(startDate)
    d.setUTCDate(d.getUTCDate() + Math.round((tradingDays * i) / steps))
    out.push({ date: d.toISOString().slice(0, 10), price: +Math.exp(Math.log(startPrice) + logStep * i).toFixed(2), kind: 'forecast' })
  }
  return out
}

function fmt(n: number): string {
  if (n >= 1000) return n.toLocaleString('en-US', { maximumFractionDigits: 0 })
  if (n >= 10) return n.toLocaleString('en-US', { maximumFractionDigits: 2 })
  return n.toLocaleString('en-US', { maximumFractionDigits: 4 })
}

// ── Gemini-grounded estimator (politics / weather / econ / culture) ──────────
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

interface GeminiGrounded {
  ynProb: number
  confidence: number
  reasoning: string
  sources: { title: string; url: string }[]
}

async function callGeminiGrounded(market: KalshiMarket, signal?: AbortSignal): Promise<GeminiGrounded | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  const prompt =
    `You are a calibrated forecaster pricing a prediction market. Use live web search to gather the latest facts, ` +
    `then estimate the TRUE probability this resolves YES. Be calibrated, not anchored to the market price.\n\n` +
    `MARKET: "${market.title}"\n` +
    `Category: ${market.category}. Resolves: ${new Date(market.closeTime).toUTCString()}. ` +
    `The market currently implies ${(market.yesPrice * 100).toFixed(0)}% YES.\n\n` +
    `Respond with ONLY a JSON object, no markdown fences:\n` +
    `{"probability": <0-1>, "confidence": <0-1>, "reasoning": "<2-3 sentences citing the key facts you found>"}`
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { maxOutputTokens: 1024, temperature: 0.2 },
      }),
      signal,
    })
    if (!res.ok) return null
    const json = await res.json()
    const cand = json.candidates?.[0]
    const text: string = cand?.content?.parts?.map((p: { text?: string }) => p.text || '').join('') ?? ''
    const parsed = extractJson(text)
    if (!parsed || typeof parsed.probability !== 'number') return null
    // Pull grounding citations if present.
    const sources: { title: string; url: string }[] = []
    const chunks = cand?.groundingMetadata?.groundingChunks ?? []
    for (const c of chunks) {
      const web = c.web
      if (web?.uri) sources.push({ title: web.title || web.uri, url: web.uri })
    }
    return {
      ynProb: clamp01(parsed.probability),
      confidence: clamp(typeof parsed.confidence === 'number' ? parsed.confidence : 0.55, 0.2, 0.9),
      reasoning: String(parsed.reasoning || 'Calibrated estimate from live search.'),
      sources: sources.slice(0, 6),
    }
  } catch {
    return null
  }
}

function extractJson(text: string): { probability?: number; confidence?: number; reasoning?: string } | null {
  if (!text) return null
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0])
  } catch {
    return null
  }
}

export interface PriceOptions {
  /** Board mode: skip the per-market Gemini call so we can price the WHOLE Kalshi
   *  universe cheaply. Non-tradable markets get a fast market-anchored prior; the
   *  detail page runs the full Gemini-grounded analysis on demand. */
  skipGemini?: boolean
}

/** The single estimator entry point used by the whole app. */
export async function priceMarket(market: KalshiMarket, model: NNModel | null, signal?: AbortSignal, opts: PriceOptions = {}): Promise<EdgePricing> {
  // 1) Tradable underlying → neural net.
  const net = await priceWithNet(market, model, signal)
  if (net) return net

  // 2) Everything else → Gemini grounded (skipped in board mode for scale).
  if (!opts.skipGemini) {
    const g = await callGeminiGrounded(market, signal)
    if (g) {
      return { ynProb: g.ynProb, engine: 'gemini-grounded', confidence: g.confidence, reasoning: g.reasoning, sources: g.sources }
    }
  }

  // 3) Fallback → market-anchored prior, low confidence, with an HONEST reason.
  //    In board mode we DON'T invent an edge (ynProb = the market's own price), so
  //    real net-priced edges rank above the rest; the detail page forms the view.
  const tradable = matchUnderlying(market.title)
  const ynProb = opts.skipGemini ? market.yesPrice : clamp01(0.5 + (market.yesPrice - 0.5) * 0.85)
  const reasoning = opts.skipGemini
    ? `Listed at the market's own ${(market.yesPrice * 100).toFixed(0)}%. Open this market for a full AI-researched, cited probability and our edge.`
    : tradable
      ? `${tradable.name} price history was temporarily unavailable, so this is a transparent prior anchored to the ` +
        `market's own ${(market.yesPrice * 100).toFixed(0)}% (mildly shrunk toward 50%). The neural net re-prices it ` +
        `automatically once data is reachable.`
      : `No tradable underlying and no live-search key available, so this is a transparent prior anchored to the ` +
        `market's own ${(market.yesPrice * 100).toFixed(0)}% (mildly shrunk toward 50%). Add GEMINI_API_KEY for a researched, cited probability.`
  return { ynProb, engine: 'baseline', confidence: opts.skipGemini ? 0.15 : 0.3, reasoning }
}

/** Convenience for routes/cron that need the trained model first. */
export async function loadModelFor(admin: SupabaseClient | null): Promise<NNModel | null> {
  if (!admin) return null
  try {
    return await loadTrainedModel(admin)
  } catch {
    return null
  }
}
