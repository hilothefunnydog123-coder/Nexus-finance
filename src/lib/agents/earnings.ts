import type { AgentSignal } from './types'

const WATCHED = new Set([
  'AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','QQQ','NFLX',
  'COIN','PLTR','SNOW','CRM','ORCL','INTC','QCOM','AVGO','SHOP','SQ','PYPL',
])

type EarningsEvent = {
  date: string
  symbol: string
  epsEstimate: number | null
  revenueEstimate: number | null
  hour: string
  quarter: number
  year: number
}

export async function runEarningsAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const key = process.env.FINNHUB_API_KEY
  if (!key) return signals

  const from = new Date().toISOString().split('T')[0]
  const to   = new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0]

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/earnings?from=${from}&to=${to}&token=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return signals

    const data = await res.json()
    const events: EarningsEvent[] = data.earningsCalendar || []

    const relevant = events
      .filter(e => WATCHED.has(e.symbol))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    for (const e of relevant.slice(0, 5)) {
      const eventMs   = new Date(e.date).getTime()
      const hoursUntil = Math.round((eventMs - Date.now()) / 3600000)
      const when      = hoursUntil < 24 ? `in ${hoursUntil}h` : `on ${e.date}`
      const session   = e.hour === 'bmo' ? ' (pre-market)' : e.hour === 'amc' ? ' (after-hours)' : ''
      const epsStr    = e.epsEstimate != null ? ` — est. EPS $${e.epsEstimate.toFixed(2)}` : ''
      const conviction: 1 | 2 | 3 = hoursUntil < 24 ? 3 : hoursUntil < 48 ? 2 : 1

      signals.push({
        agent_name: 'earnings',
        ticker: e.symbol,
        signal_text: `${e.symbol} Q${e.quarter} ${e.year} earnings ${when}${session}${epsStr}`,
        conviction,
        raw_data: { date: e.date, epsEstimate: e.epsEstimate, revenueEstimate: e.revenueEstimate, hour: e.hour },
      })
    }
  } catch (e) {
    console.error('[EarningsAgent]', e)
  }

  return signals
}
