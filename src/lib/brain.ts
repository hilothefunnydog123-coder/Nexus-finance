/**
 * BrainStock's learning "brain" — a single sigmoid neuron (logistic regression)
 * trained online with SGD. Tiny on purpose: transparent, and it genuinely
 * improves as it sees more real outcomes from the Beat-the-AI game.
 */

export const N_FEATURES = 5

// Feature vector from a close-price history (oldest→newest). Scaled into a sane
// range for the neuron. [1d return, 5d, 10d, momentum vs SMA20, volatility].
export function features(closes: number[]): number[] {
  const c = closes
  const n = c.length
  if (n < 12) return [0, 0, 0, 0, 0]
  const last = n - 1
  const ret = (a: number, b: number) => (c[a] - c[b]) / c[b]
  const r1 = ret(last, last - 1)
  const r5 = ret(last, last - 5)
  const r10 = ret(last, last - 10)
  const w = Math.min(20, n - 1)
  const sma = c.slice(n - w).reduce((s, x) => s + x, 0) / w
  const mom = (c[last] - sma) / sma
  const rets: number[] = []
  for (let i = n - w; i < n; i++) rets.push((c[i] - c[i - 1]) / c[i - 1])
  const mean = rets.reduce((s, x) => s + x, 0) / rets.length
  const vol = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length)
  return [r1 * 10, r5 * 5, r10 * 3, mom * 8, vol * 20]
}

export function sigmoid(z: number): number {
  return 1 / (1 + Math.exp(-z))
}

// P(up) for a feature vector given current weights.
export function predictUp(weights: number[], bias: number, x: number[]): number {
  let z = bias
  for (let i = 0; i < x.length && i < weights.length; i++) z += weights[i] * x[i]
  return sigmoid(z)
}

// One SGD step. Returns new weights/bias and the pre-update prediction p.
export function trainStep(
  weights: number[],
  bias: number,
  x: number[],
  label: number,
  lr = 0.08
): { weights: number[]; bias: number; p: number } {
  const p = predictUp(weights, bias, x)
  const g = label - p
  const nw = weights.map((wi, i) => wi + lr * g * (x[i] ?? 0))
  return { weights: nw, bias: bias + lr * g, p }
}
