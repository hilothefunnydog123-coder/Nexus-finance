/**
 * BrainStock forecast engine (shared by /api/forecast and the daily batch).
 *
 * Real historical OHLCV via Yahoo Finance. When a trained neural network is
 * supplied, the forecast is produced by the net (see lib/nn.ts) from engineered
 * features and backtested walk-forward against a naive baseline. Without a model
 * it falls back to a transparent EWMA drift so the endpoint always works.
 */

import { featurize, predict, type NNModel } from './nn'

export const FORECAST_DISCLAIMER =
  'Educational research tool. Forecasts are model estimates, not financial advice. Past performance does not guarantee future results.'

export type Point = { date: string; price: number }
export type Bar = { date: string; c: number; h: number; l: number; v: number }
export type Metrics = {
  samples: number
  horizon: number
  rmse_model: number
  rmse_naive: number
  mae_model: number
  mae_naive: number
  skill_score: number
  directional_accuracy: number
}
export type ForecastResult = {
  ticker: string
  history: Point[]
  forecast: Point[]
  metrics: Metrics
  disclaimer: string
  engine: 'neural-net' | 'baseline'
  features?: number[]
}

type YahooChart = {
  chart: {
    result?: Array<{
      timestamp: number[]
      indicators: { quote: Array<{ open?: (number | null)[]; high?: (number | null)[]; low?: (number | null)[]; close: (number | null)[]; volume?: (number | null)[] }> }
    }>
    error?: { code: string; description: string } | null
  }
}

async function yahoo(ticker: string, range: string, signal?: AbortSignal): Promise<YahooChart> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}?range=${range}&interval=1d`
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; YN-Neuro/0.2; +https://ynfinance.org)', Accept: 'application/json' }, cache: 'no-store', signal })
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`)
  const data = (await res.json()) as YahooChart
  if (data.chart.error) throw new Error(data.chart.error.description)
  if (!data.chart.result?.[0]) throw new Error('Unknown ticker')
  return data
}

/** Close-only history (kept for callers that just need prices). */
export async function fetchYahoo(ticker: string, signal?: AbortSignal): Promise<Point[]> {
  const data = await yahoo(ticker, '6mo', signal)
  const r = data.chart.result![0]
  const ts = r.timestamp ?? []
  const closes = r.indicators?.quote?.[0]?.close ?? []
  const pts: Point[] = []
  for (let i = 0; i < ts.length; i++) {
    const c = closes[i]
    if (c == null || !Number.isFinite(c)) continue
    pts.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), price: +c.toFixed(2) })
  }
  if (pts.length < 30) throw new Error('Not enough price history')
  return pts
}

/** Full OHLCV bars (1y) — what the neural net trains and predicts on. */
export async function fetchBars(ticker: string, signal?: AbortSignal): Promise<Bar[]> {
  const data = await yahoo(ticker, '1y', signal)
  const r = data.chart.result![0]
  const ts = r.timestamp ?? []
  const q = r.indicators?.quote?.[0]
  const close = q?.close ?? []
  const high = q?.high ?? []
  const low = q?.low ?? []
  const vol = q?.volume ?? []
  const bars: Bar[] = []
  for (let i = 0; i < ts.length; i++) {
    const c = close[i]
    if (c == null || !Number.isFinite(c)) continue
    bars.push({ date: new Date(ts[i] * 1000).toISOString().slice(0, 10), c, h: high[i] ?? c, l: low[i] ?? c, v: vol[i] ?? 0 })
  }
  if (bars.length < 55) throw new Error('Not enough price history')
  return bars
}

// ── realistic-move guard ────────────────────────────────────────────────────
/** Daily log-return volatility from a close series (last ~40 bars). */
export function dailyLogVol(closes: number[]): number {
  const rets: number[] = []
  const start = Math.max(1, closes.length - 40)
  for (let i = start; i < closes.length; i++) {
    const r = Math.log(closes[i] / closes[i - 1])
    if (Number.isFinite(r)) rets.push(r)
  }
  if (rets.length < 5) return 0.015
  const m = rets.reduce((s, x) => s + x, 0) / rets.length
  const v = rets.reduce((s, x) => s + (x - m) ** 2, 0) / rets.length
  return Math.sqrt(v) || 0.015
}

/**
 * The neural net emits an UNBOUNDED horizon log-return. Early in training (or on
 * noisy inputs) that output is dominated by the up-scaled features, not real
 * signal, so it can imply absurd 20–30% multi-day moves on calm stocks. A genuine
 * H-day move is bounded by realized volatility: cap the net's return at ~2.5·σ√H.
 * This preserves the net's DIRECTION and relative conviction while keeping the
 * forecast physically realistic. Returns the bounded log-return.
 */
export function boundHorizonReturn(rHat: number, dailyVol: number, horizon: number): number {
  const sigmaH = Math.max(dailyVol, 0.004) * Math.sqrt(Math.max(1, horizon))
  const cap = 2.5 * sigmaH
  if (!Number.isFinite(rHat)) return 0
  return Math.max(-cap, Math.min(cap, rHat))
}

// ── baseline drift (fallback when no trained net is supplied) ───────────────
export function predictNext(prices: number[]): number {
  const n = prices.length
  const last = prices[n - 1]
  const window = Math.min(20, n - 1)
  let ewma = 0
  const alpha = 0.25
  for (let i = n - window; i < n; i++) ewma = alpha * ((prices[i] - prices[i - 1]) / prices[i - 1]) + (1 - alpha) * ewma
  return last * (1 + ewma * 0.6)
}
export function multiStepForecast(prices: number[], horizon: number): number[] {
  const out: number[] = []
  const working = prices.slice()
  for (let i = 0; i < horizon; i++) { const next = predictNext(working); out.push(next); working.push(next) }
  return out
}
function baselineBacktest(prices: number[], horizon: number): Metrics {
  const evalStart = Math.max(40, prices.length - 60)
  const eMs: number[] = [], eNs: number[] = [], eMa: number[] = [], eNa: number[] = []
  let hits = 0, count = 0
  for (let t = evalStart; t < prices.length - 1; t++) {
    const model = predictNext(prices.slice(0, t + 1))
    const naive = prices[t]
    const actual = prices[t + 1]
    eMs.push((model - actual) ** 2); eNs.push((naive - actual) ** 2); eMa.push(Math.abs(model - actual)); eNa.push(Math.abs(naive - actual))
    const pd = Math.sign(model - naive), rd = Math.sign(actual - naive)
    if (pd !== 0 && rd !== 0) { count++; if (pd === rd) hits++ }
  }
  return finishMetrics(eMs, eNs, eMa, eNa, hits, count, horizon)
}

// ── neural-net walk-forward backtest ────────────────────────────────────────
function nnBacktest(bars: Bar[], model: NNModel, horizon: number): Metrics {
  const c = bars.map((b) => b.c)
  const start = Math.max(60, c.length - 55)
  const eMs: number[] = [], eNs: number[] = [], eMa: number[] = [], eNa: number[] = []
  let hits = 0, count = 0
  for (let t = start; t < c.length - horizon; t++) {
    const f = featurize(bars.slice(0, t + 1).map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v })))
    if (!f) continue
    const rHat = boundHorizonReturn(predict(model, f), dailyLogVol(c.slice(0, t + 1)), horizon)
    const last = c[t]
    const predPrice = last * Math.exp(rHat)
    const actual = c[t + horizon]
    eMs.push((predPrice - actual) ** 2); eNs.push((last - actual) ** 2); eMa.push(Math.abs(predPrice - actual)); eNa.push(Math.abs(last - actual))
    const rd = Math.sign(actual - last)
    if (rd !== 0) { count++; if (Math.sign(rHat) === rd) hits++ }
  }
  if (!eMs.length) return baselineBacktest(c, horizon)
  return finishMetrics(eMs, eNs, eMa, eNa, hits, count, horizon)
}

function finishMetrics(eMs: number[], eNs: number[], eMa: number[], eNa: number[], hits: number, count: number, horizon: number): Metrics {
  const m = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1)
  const rmse_model = Math.sqrt(m(eMs)), rmse_naive = Math.sqrt(m(eNs))
  return {
    samples: eMs.length,
    horizon,
    rmse_model: +rmse_model.toFixed(3),
    rmse_naive: +rmse_naive.toFixed(3),
    mae_model: +m(eMa).toFixed(3),
    mae_naive: +m(eNa).toFixed(3),
    skill_score: +(1 - rmse_model / (rmse_naive || 1)).toFixed(3),
    directional_accuracy: +(count > 0 ? hits / count : 0.5).toFixed(3),
  }
}

export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < n) { d.setUTCDate(d.getUTCDate() + 1); const dow = d.getUTCDay(); if (dow !== 0 && dow !== 6) added++ }
  return d
}

export async function forecastTicker(ticker: string, horizon = 5, signal?: AbortSignal, model?: NNModel | null): Promise<ForecastResult> {
  const bars = await fetchBars(ticker, signal)
  const all: Point[] = bars.map((b) => ({ date: b.date, price: +b.c.toFixed(2) }))
  const prices = all.map((p) => p.price)
  const last = prices[prices.length - 1]
  const lastDate = new Date(all[all.length - 1].date + 'T00:00:00Z')

  const feats = featurize(bars.map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v })))

  let fcPrices: number[]
  let metrics: Metrics
  let engine: 'neural-net' | 'baseline'

  if (model && feats) {
    const rawRHat = predict(model, feats) // predicted horizon log-return (unbounded)
    const rHat = boundHorizonReturn(rawRHat, dailyLogVol(prices), horizon) // keep it realistic
    fcPrices = []
    for (let i = 1; i <= horizon; i++) fcPrices.push(+(last * Math.exp((rHat * i) / horizon)).toFixed(4))
    metrics = nnBacktest(bars, model, horizon)
    engine = 'neural-net'
  } else {
    fcPrices = multiStepForecast(prices, horizon)
    metrics = baselineBacktest(prices, horizon)
    engine = 'baseline'
  }

  const forecast = fcPrices.map((p, i) => ({ date: addBusinessDays(lastDate, i + 1).toISOString().slice(0, 10), price: +p.toFixed(2) }))
  return { ticker, history: all.slice(-90), forecast, metrics, disclaimer: FORECAST_DISCLAIMER, engine, features: feats ?? undefined }
}
