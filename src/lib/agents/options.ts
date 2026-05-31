import type { AgentSignal } from './types'

// Options agent: detects wide intraday range relative to net price change.
// Wide range + flat net move = two-way options activity expanding volatility.
const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','SPY','QQQ']

type Quote = { symbol: string; c: number; dp: number; h: number; l: number; o: number; pc: number }

export async function runOptionsAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const key = process.env.FINNHUB_API_KEY
  if (!key) return signals

  try {
    const results = await Promise.allSettled(
      SYMBOLS.map(sym =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${sym}&token=${key}`, {
          signal: AbortSignal.timeout(6000),
        })
          .then(r => r.json())
          .then((d): Quote => ({ symbol: sym, ...d }))
      )
    )

    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const q = r.value
      if (!q.c || !q.h || !q.l) continue

      const dayRange  = q.h - q.l
      const pct       = Math.abs(q.dp || 0)
      const rangeRatio = q.c > 0 ? (dayRange / q.c) * 100 : 0

      // Wide range (>3% of price) but moderate net move (<2%): typical options volatility signature
      if (rangeRatio > 3 && pct < 2) {
        const conviction: 1 | 2 | 3 = rangeRatio > 5 ? 2 : 1
        signals.push({
          agent_name: 'options',
          ticker: q.symbol,
          signal_text: `${q.symbol} intraday range ${rangeRatio.toFixed(1)}% ($${q.l.toFixed(2)}–$${q.h.toFixed(2)}) with only ${pct.toFixed(1)}% net move — elevated options volatility`,
          conviction,
          raw_data: { rangeRatio, high: q.h, low: q.l, current: q.c, changePct: q.dp },
        })
      }
    }
  } catch (e) {
    console.error('[OptionsAgent]', e)
  }

  return signals.slice(0, 3)
}
