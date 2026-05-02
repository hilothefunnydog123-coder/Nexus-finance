export function calcEMA(closes: number[], period: number): (number | null)[] {
  if (closes.length < period) return closes.map(() => null)
  const k = 2 / (period + 1)
  const result: (number | null)[] = []
  let emaVal: number | null = null

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { result.push(null); continue }
    if (emaVal === null) {
      emaVal = closes.slice(0, period).reduce((a, b) => a + b, 0) / period
    } else {
      emaVal = closes[i] * k + emaVal * (1 - k)
    }
    result.push(+emaVal.toFixed(4))
  }
  return result
}

export function calcRSI(closes: number[], period = 14): (number | null)[] {
  const result: (number | null)[] = new Array(period).fill(null)
  if (closes.length < period + 1) return result

  let avgGain = 0, avgLoss = 0
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1]
    if (diff > 0) avgGain += diff
    else avgLoss += Math.abs(diff)
  }
  avgGain /= period
  avgLoss /= period

  for (let i = period; i < closes.length; i++) {
    if (i > period) {
      const diff = closes[i] - closes[i - 1]
      avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period
      avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period
    }
    const rs = avgLoss === 0 ? Infinity : avgGain / avgLoss
    result.push(+(100 - 100 / (1 + rs)).toFixed(2))
  }
  return result
}

export function calcBollingerBands(closes: number[], period = 20, stdDev = 2) {
  const upper: (number | null)[] = []
  const mid: (number | null)[] = []
  const lower: (number | null)[] = []

  for (let i = 0; i < closes.length; i++) {
    if (i < period - 1) { upper.push(null); mid.push(null); lower.push(null); continue }
    const slice = closes.slice(i - period + 1, i + 1)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    mid.push(+mean.toFixed(4))
    upper.push(+(mean + stdDev * sd).toFixed(4))
    lower.push(+(mean - stdDev * sd).toFixed(4))
  }
  return { upper, mid, lower }
}

export function calcMACD(closes: number[], fast = 12, slow = 26, signal = 9) {
  const emaFast = calcEMA(closes, fast)
  const emaSlow = calcEMA(closes, slow)
  const macdLine: (number | null)[] = emaFast.map((f, i) => {
    const s = emaSlow[i]
    return f !== null && s !== null ? +(f - s).toFixed(4) : null
  })
  const validMacd = macdLine.filter(v => v !== null) as number[]
  const rawSignal = calcEMA(validMacd, signal)
  const signalLine: (number | null)[] = []
  let si = 0
  for (const v of macdLine) {
    if (v === null) { signalLine.push(null) } else { signalLine.push(rawSignal[si++] ?? null) }
  }
  const histogram = macdLine.map((m, i) => {
    const s = signalLine[i]
    return m !== null && s !== null ? +(m - s).toFixed(4) : null
  })
  return { macdLine, signalLine, histogram }
}
