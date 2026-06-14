/**
 * BrainStock forecast engine (shared by /api/forecast and the daily batch).
 *
 * Real historical prices via Yahoo Finance's public chart endpoint. Forecast is
 * a drift + EWMA mean-reversion blend; skill metrics come from a walk-forward
 * backtest vs. a naive "tomorrow = today" baseline — reported honestly.
 */

export const FORECAST_DISCLAIMER =
  'Educational research tool. Forecasts are model estimates, not financial advice. Past performance does not guarantee future results.'

export type Point = { date: string; price: number }
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
}

type YahooChart = {
  chart: {
    result?: Array<{
      timestamp: number[]
      indicators: { quote: Array<{ close: (number | null)[] }> }
    }>
    error?: { code: string; description: string } | null
  }
}

export async function fetchYahoo(ticker: string, signal?: AbortSignal): Promise<Point[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    ticker
  )}?range=6mo&interval=1d`
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; YN-Neuro/0.1; +https://ynfinance.org)',
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal,
  })
  if (!res.ok) throw new Error(`Yahoo HTTP ${res.status}`)
  const data = (await res.json()) as YahooChart
  if (data.chart.error) throw new Error(data.chart.error.description)
  const r = data.chart.result?.[0]
  if (!r) throw new Error('Unknown ticker')
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

// One-step-ahead forecast for the next day, given history up to t.
export function predictNext(prices: number[]): number {
  const n = prices.length
  const last = prices[n - 1]
  const window = Math.min(20, n - 1)
  let ewma = 0
  const alpha = 0.25
  for (let i = n - window; i < n; i++) {
    const r = (prices[i] - prices[i - 1]) / prices[i - 1]
    ewma = alpha * r + (1 - alpha) * ewma
  }
  const drift = ewma * 0.6
  return last * (1 + drift)
}

export function multiStepForecast(prices: number[], horizon: number): number[] {
  const out: number[] = []
  const working = prices.slice()
  for (let i = 0; i < horizon; i++) {
    const next = predictNext(working)
    out.push(next)
    working.push(next)
  }
  return out
}

export function backtest(prices: number[], horizon: number): Metrics {
  const evalStart = Math.max(40, prices.length - 60)
  const errModelSq: number[] = []
  const errNaiveSq: number[] = []
  const errModelAbs: number[] = []
  const errNaiveAbs: number[] = []
  let directionalHits = 0
  let directionalCount = 0
  for (let t = evalStart; t < prices.length - 1; t++) {
    const hist = prices.slice(0, t + 1)
    const model = predictNext(hist)
    const naive = hist[hist.length - 1]
    const actual = prices[t + 1]
    errModelSq.push((model - actual) ** 2)
    errNaiveSq.push((naive - actual) ** 2)
    errModelAbs.push(Math.abs(model - actual))
    errNaiveAbs.push(Math.abs(naive - actual))
    const predDir = Math.sign(model - naive)
    const realDir = Math.sign(actual - naive)
    if (predDir !== 0 && realDir !== 0) {
      directionalCount++
      if (predDir === realDir) directionalHits++
    }
  }
  const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / a.length
  const rmse_model = Math.sqrt(mean(errModelSq))
  const rmse_naive = Math.sqrt(mean(errNaiveSq))
  const mae_model = mean(errModelAbs)
  const mae_naive = mean(errNaiveAbs)
  const skill_score = 1 - rmse_model / rmse_naive
  const directional_accuracy = directionalCount > 0 ? directionalHits / directionalCount : 0.5
  return {
    samples: errModelSq.length,
    horizon,
    rmse_model: +rmse_model.toFixed(3),
    rmse_naive: +rmse_naive.toFixed(3),
    mae_model: +mae_model.toFixed(3),
    mae_naive: +mae_naive.toFixed(3),
    skill_score: +skill_score.toFixed(3),
    directional_accuracy: +directional_accuracy.toFixed(3),
  }
}

export function addBusinessDays(from: Date, n: number): Date {
  const d = new Date(from)
  let added = 0
  while (added < n) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) added++
  }
  return d
}

export async function forecastTicker(
  ticker: string,
  horizon = 5,
  signal?: AbortSignal
): Promise<ForecastResult> {
  const all = await fetchYahoo(ticker, signal)
  const prices = all.map((p) => p.price)
  const fcPrices = multiStepForecast(prices, horizon)
  const lastDate = new Date(all[all.length - 1].date + 'T00:00:00Z')
  const forecast = fcPrices.map((p, i) => ({
    date: addBusinessDays(lastDate, i + 1).toISOString().slice(0, 10),
    price: +p.toFixed(2),
  }))
  const metrics = backtest(prices, horizon)
  const history = all.slice(-90)
  return { ticker, history, forecast, metrics, disclaimer: FORECAST_DISCLAIMER }
}
