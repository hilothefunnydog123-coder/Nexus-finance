import type { AgentSignal } from './types'

// Dark pool agent: fetches 3-day daily candles and flags when today's volume
// is 2x+ above the prior 2-day average — institutional block activity signature.
const SYMBOLS = ['SPY','QQQ','AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','JPM']

type Candles = { s: string; v: number[]; c: number[]; symbol: string }

export async function runDarkPoolAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const key = process.env.FINNHUB_API_KEY
  if (!key) return signals

  const toTs   = Math.floor(Date.now() / 1000)
  const fromTs = toTs - 4 * 86400  // 4 days back to ensure we get 3 trading days

  try {
    // Limit to 6 symbols to avoid Finnhub rate limits
    const results = await Promise.allSettled(
      SYMBOLS.slice(0, 6).map(sym =>
        fetch(
          `https://finnhub.io/api/v1/stock/candle?symbol=${sym}&resolution=D&from=${fromTs}&to=${toTs}&token=${key}`,
          { signal: AbortSignal.timeout(6000) }
        )
          .then(r => r.json())
          .then((d): Candles => ({ symbol: sym, ...d }))
      )
    )

    for (const r of results) {
      if (r.status !== 'fulfilled') continue
      const c = r.value
      if (c.s !== 'ok' || !c.v || c.v.length < 2) continue

      const vols   = c.v
      const latest = vols[vols.length - 1]
      const prev   = vols.slice(0, -1)
      const avg    = prev.reduce((a, b) => a + b, 0) / prev.length

      if (avg === 0) continue
      const ratio = latest / avg
      if (ratio < 2) continue

      const price = c.c?.[c.c.length - 1]
      const conviction: 1 | 2 | 3 = ratio >= 3 ? 3 : 2

      signals.push({
        agent_name: 'darkpool',
        ticker: c.symbol,
        signal_text: `${c.symbol} volume ${ratio.toFixed(1)}x above ${prev.length}-day avg — institutional block activity detected${price ? ` @ $${price.toFixed(2)}` : ''}`,
        conviction,
        raw_data: { volRatio: ratio, todayVol: latest, avgVol: avg },
      })
    }
  } catch (e) {
    console.error('[DarkPoolAgent]', e)
  }

  return signals.slice(0, 3)
}
