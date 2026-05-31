import type { AgentSignal } from './types'

const IMPACT_KEYWORDS = ['CPI','NFP','FOMC','Fed','rate','unemployment','GDP','PCE','PPI','ISM','PMI','payroll','treasury','inflation','jobs','housing','retail']

type EconEvent = {
  time: string
  event: string
  country: string
  impact: string
  estimate: number | null
  prev: number | null
  unit: string
}

export async function runMacroAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const key = process.env.FINNHUB_API_KEY
  if (!key) return signals

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?token=${key}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return signals

    const data = await res.json()
    const events: EconEvent[] = data.economicCalendar || []

    const now   = Date.now()
    const in24h = now + 86400000

    const upcoming = events
      .filter(e => {
        const t = new Date(e.time).getTime()
        const isHighImpact = e.impact === 'high' || e.impact === '3'
        return (e.country === 'US') && t > now && t < in24h && isHighImpact
      })
      .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())

    for (const e of upcoming.slice(0, 4)) {
      const hoursUntil = Math.round((new Date(e.time).getTime() - now) / 3600000)
      const prevStr    = e.prev != null ? `, prev ${e.prev}${e.unit ?? ''}` : ''
      const estStr     = e.estimate != null ? `, est ${e.estimate}${e.unit ?? ''}` : ''
      const isKeyword  = IMPACT_KEYWORDS.some(k => e.event.toLowerCase().includes(k.toLowerCase()))
      const conviction: 1 | 2 | 3 = isKeyword ? 3 : 2

      signals.push({
        agent_name: 'macro',
        ticker: null,
        signal_text: `US ${e.event} release in ${hoursUntil}h — HIGH IMPACT${prevStr}${estStr}`,
        conviction,
        raw_data: { event: e.event, country: e.country, time: e.time, prev: e.prev, estimate: e.estimate, unit: e.unit },
      })
    }
  } catch (e) {
    console.error('[MacroAgent]', e)
  }

  return signals
}
