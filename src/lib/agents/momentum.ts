import type { AgentSignal } from './types'

const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','QQQ','NFLX','COIN','PLTR']

type Quote = { symbol: string; c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }

export async function runMomentumAgent(): Promise<AgentSignal[]> {
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
      if (!q.dp || !q.c || !q.pc) continue

      const pct = parseFloat(String(q.dp))
      if (Math.abs(pct) < 3) continue

      const dir        = pct > 0 ? '↑' : '↓'
      const word       = pct > 0 ? 'surging' : 'dropping'
      const conviction: 1 | 2 | 3 = Math.abs(pct) > 6 ? 3 : Math.abs(pct) > 4 ? 2 : 1

      signals.push({
        agent_name: 'momentum',
        ticker: q.symbol,
        signal_text: `${q.symbol} ${word} ${dir}${Math.abs(pct).toFixed(1)}% — price $${q.c.toFixed(2)} vs prev close $${q.pc.toFixed(2)}`,
        conviction,
        raw_data: { pct, current: q.c, prevClose: q.pc, high: q.h, low: q.l },
      })
    }
  } catch (e) {
    console.error('[MomentumAgent]', e)
  }

  return signals.slice(0, 4)
}
