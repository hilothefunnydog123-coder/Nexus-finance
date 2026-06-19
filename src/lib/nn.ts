/**
 * BrainStock's real neural network — a multi-layer perceptron trained with
 * backpropagation + Adam, in pure TypeScript (no deps). It predicts the
 * horizon log-return of a stock from engineered features, persists its weights,
 * and genuinely improves as it trains on graded outcomes (the flywheel).
 *
 * Architecture: [F → 16 → 12 → 1], tanh hidden units, linear output (regression).
 * This is a bona-fide neural net: nonlinear hidden layers, full backprop.
 */

// ── feature engineering ────────────────────────────────────────────────────
export type Bar = { c: number; h: number; l: number; v: number }
export const FEATURE_COUNT = 11

const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / (a.length || 1)
const std = (a: number[]) => {
  const m = mean(a)
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)))
}

/** Build a scaled feature vector from OHLCV bars (oldest→newest). Needs ≥ 55 bars. */
export function featurize(bars: Bar[]): number[] | null {
  const n = bars.length
  if (n < 55) return null
  const c = bars.map((b) => b.c)
  const last = c[n - 1]
  const ret = (k: number) => (c[n - 1] - c[n - 1 - k]) / c[n - 1 - k]

  const sma = (k: number) => mean(c.slice(n - k))
  const dailyRets: number[] = []
  for (let i = n - 21; i < n; i++) dailyRets.push((c[i] - c[i - 1]) / c[i - 1])
  const vol20 = std(dailyRets)

  const vols = bars.map((b) => b.v || 0)
  const volRatio = mean(vols.slice(n - 5)) / (mean(vols.slice(n - 20)) || 1)

  const atr14 = mean(bars.slice(n - 14).map((b) => (b.h - b.l) / (b.c || 1)))

  // RSI(14)
  let gain = 0, loss = 0
  for (let i = n - 14; i < n; i++) {
    const d = c[i] - c[i - 1]
    if (d >= 0) gain += d
    else loss -= d
  }
  const rs = loss === 0 ? 100 : gain / loss
  const rsi = 100 - 100 / (1 + rs)

  // position within the available range (proxy for 52w)
  const win = Math.min(252, n)
  const slice = bars.slice(n - win)
  const lo = Math.min(...slice.map((b) => b.l))
  const hi = Math.max(...slice.map((b) => b.h))
  const pos = hi > lo ? (last - lo) / (hi - lo) : 0.5

  // scaled into a sane range for tanh units
  return [
    ret(1) * 12,
    ret(5) * 6,
    ret(10) * 4,
    ret(20) * 3,
    ((last - sma(20)) / sma(20)) * 9,
    ((last - sma(50)) / sma(50)) * 6,
    vol20 * 25,
    Math.max(-3, Math.min(3, (volRatio - 1) * 2)),
    atr14 * 30,
    (rsi - 50) / 25,
    (pos - 0.5) * 2,
  ]
}

// ── the network ────────────────────────────────────────────────────────────
export type NNModel = {
  sizes: number[]
  W: number[][][]
  b: number[][]
  mW: number[][][]; vW: number[][][]; mb: number[][]; vb: number[][]
  t: number
  trained: number
  sumLoss: number
  dirHits: number
}

const DEFAULT_SIZES = [FEATURE_COUNT, 16, 12, 1]

function zeros(r: number, cols: number) { return Array.from({ length: r }, () => new Array(cols).fill(0)) }
function zerosV(r: number) { return new Array(r).fill(0) }

export function createModel(sizes: number[] = DEFAULT_SIZES): NNModel {
  const W: number[][][] = [], b: number[][] = [], mW: number[][][] = [], vW: number[][][] = [], mb: number[][] = [], vb: number[][] = []
  for (let l = 0; l < sizes.length - 1; l++) {
    const inN = sizes[l], outN = sizes[l + 1]
    const limit = Math.sqrt(6 / (inN + outN)) // Xavier
    W.push(Array.from({ length: outN }, () => Array.from({ length: inN }, () => (Math.random() * 2 - 1) * limit)))
    b.push(zerosV(outN))
    mW.push(zeros(outN, inN)); vW.push(zeros(outN, inN)); mb.push(zerosV(outN)); vb.push(zerosV(outN))
  }
  return { sizes, W, b, mW, vW, mb, vb, t: 0, trained: 0, sumLoss: 0, dirHits: 0 }
}

const tanh = Math.tanh
const dtanh = (y: number) => 1 - y * y // derivative wrt pre-activation given activated value

/** Forward pass. Returns per-layer activations (a[0] = input). Output layer is linear. */
function forward(m: NNModel, x: number[]): number[][] {
  const acts: number[][] = [x]
  let cur = x
  for (let l = 0; l < m.W.length; l++) {
    const out = new Array(m.W[l].length).fill(0)
    for (let i = 0; i < m.W[l].length; i++) {
      let z = m.b[l][i]
      const row = m.W[l][i]
      for (let j = 0; j < row.length; j++) z += row[j] * cur[j]
      out[i] = l === m.W.length - 1 ? z : tanh(z) // linear output, tanh hidden
    }
    acts.push(out)
    cur = out
  }
  return acts
}

/** Predict the horizon log-return for a feature vector. */
export function predict(m: NNModel, x: number[]): number {
  const acts = forward(m, x)
  return acts[acts.length - 1][0]
}

/** One Adam training step on (x → target log-return). Returns the squared error. */
export function trainStep(m: NNModel, x: number[], target: number, lr = 0.005): number {
  const acts = forward(m, x)
  const L = m.W.length
  const out = acts[L][0]
  const err = out - target
  const loss = 0.5 * err * err

  // backprop deltas
  const deltas: number[][] = new Array(L)
  deltas[L - 1] = [err] // linear output
  for (let l = L - 2; l >= 0; l--) {
    const d = new Array(m.W[l].length).fill(0)
    for (let i = 0; i < m.W[l].length; i++) {
      let s = 0
      for (let k = 0; k < m.W[l + 1].length; k++) s += m.W[l + 1][k][i] * deltas[l + 1][k]
      d[i] = s * dtanh(acts[l + 1][i])
    }
    deltas[l] = d
  }

  // Adam update
  m.t += 1
  const b1 = 0.9, b2 = 0.999, eps = 1e-8, l2 = 1e-5
  const c1 = 1 - Math.pow(b1, m.t), c2 = 1 - Math.pow(b2, m.t)
  for (let l = 0; l < L; l++) {
    const aPrev = acts[l]
    for (let i = 0; i < m.W[l].length; i++) {
      const dl = deltas[l][i]
      for (let j = 0; j < m.W[l][i].length; j++) {
        const g = dl * aPrev[j] + l2 * m.W[l][i][j]
        m.mW[l][i][j] = b1 * m.mW[l][i][j] + (1 - b1) * g
        m.vW[l][i][j] = b2 * m.vW[l][i][j] + (1 - b2) * g * g
        m.W[l][i][j] -= (lr * (m.mW[l][i][j] / c1)) / (Math.sqrt(m.vW[l][i][j] / c2) + eps)
      }
      m.mb[l][i] = b1 * m.mb[l][i] + (1 - b1) * dl
      m.vb[l][i] = b2 * m.vb[l][i] + (1 - b2) * dl * dl
      m.b[l][i] -= (lr * (m.mb[l][i] / c1)) / (Math.sqrt(m.vb[l][i] / c2) + eps)
    }
  }

  m.trained += 1
  m.sumLoss += loss
  if (Math.sign(out) === Math.sign(target) && target !== 0) m.dirHits += 1
  return loss
}

// ── persistence (store as plain JSON in Supabase) ──────────────────────────
export function serialize(m: NNModel): NNModel { return m }
export function deserialize(data: unknown): NNModel | null {
  try {
    const m = data as NNModel
    if (!m || !Array.isArray(m.sizes) || !Array.isArray(m.W) || m.sizes[0] !== FEATURE_COUNT) return null
    // backfill adam state if missing (older save)
    if (!m.mW) {
      const fresh = createModel(m.sizes)
      m.mW = fresh.mW; m.vW = fresh.vW; m.mb = fresh.mb; m.vb = fresh.vb; m.t = m.t || 0
    }
    return m
  } catch {
    return null
  }
}

export const NN_ARCH = DEFAULT_SIZES.join('→')
