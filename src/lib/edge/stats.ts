/** Small numerics shared by the pricing engine, worth-it brain, and proof script. */

/** Abramowitz–Stegun 7.1.26 erf approximation (max error ~1.5e-7). */
export function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}

/** Standard normal CDF Φ(z). */
export function normCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.SQRT2))
}

export function clamp01(x: number): number {
  return Math.max(0.01, Math.min(0.99, x))
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
