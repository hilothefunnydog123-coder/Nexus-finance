import { NextResponse } from 'next/server'

const DEMO = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'
const KEY = process.env.FINNHUB_API_KEY || ''

export interface CalEvent {
  id: string
  date: string
  time: string
  country: string
  name: string
  impact: 'high' | 'medium' | 'low'
  previous: string
  forecast: string
  actual: string | null
}

function getImpact(level: string | number): 'high' | 'medium' | 'low' {
  const s = String(level).toLowerCase()
  if (s === 'high' || s === '3') return 'high'
  if (s === 'medium' || s === '2') return 'medium'
  return 'low'
}

function getMockEvents(): CalEvent[] {
  const today = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const dateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  const tmr = new Date(today); tmr.setDate(tmr.getDate() + 1)
  const t2 = new Date(today); t2.setDate(today.getDate() + 2)

  return [
    { id: 'm1', date: dateStr(today), time: '08:30', country: 'US', name: 'Initial Jobless Claims',    impact: 'medium', previous: '212K',  forecast: '218K',  actual: '221K' },
    { id: 'm2', date: dateStr(today), time: '08:30', country: 'US', name: 'Core PCE Price Index (MoM)', impact: 'high',   previous: '0.3%', forecast: '0.2%', actual: '0.2%' },
    { id: 'm3', date: dateStr(today), time: '10:00', country: 'US', name: 'Fed Chair Powell Speaks',    impact: 'high',   previous: '—',    forecast: '—',    actual: null   },
    { id: 'm4', date: dateStr(today), time: '10:00', country: 'US', name: 'Consumer Confidence',        impact: 'medium', previous: '103.1',forecast: '104.0',actual: null   },
    { id: 'm5', date: dateStr(today), time: '14:30', country: 'US', name: 'Crude Oil Inventories',      impact: 'medium', previous: '-2.3M',forecast: '-1.8M',actual: null   },
    { id: 'm6', date: dateStr(tmr),   time: '08:30', country: 'US', name: 'Nonfarm Payrolls',           impact: 'high',   previous: '228K', forecast: '215K', actual: null   },
    { id: 'm7', date: dateStr(tmr),   time: '08:30', country: 'US', name: 'Unemployment Rate',          impact: 'high',   previous: '3.9%', forecast: '3.9%', actual: null   },
    { id: 'm8', date: dateStr(tmr),   time: '10:00', country: 'US', name: 'ISM Manufacturing PMI',      impact: 'high',   previous: '50.3', forecast: '50.8', actual: null   },
    { id: 'm9', date: dateStr(t2),    time: '13:00', country: 'GB', name: 'BOE Governor Bailey Speech', impact: 'high',   previous: '—',    forecast: '—',    actual: null   },
    { id: 'm10',date: dateStr(t2),    time: '08:30', country: 'US', name: 'CPI (MoM)',                  impact: 'high',   previous: '0.4%', forecast: '0.3%', actual: null   },
  ]
}

export async function GET() {
  if (DEMO) {
    return NextResponse.json({ events: getMockEvents(), demo: true })
  }

  try {
    const today = new Date()
    const from = today.toISOString().split('T')[0]
    const to = new Date(today.getTime() + 7 * 86_400_000).toISOString().split('T')[0]

    const res = await fetch(
      `https://finnhub.io/api/v1/calendar/economic?from=${from}&to=${to}&token=${KEY}`,
      { next: { revalidate: 3600 } }
    )
    const json = await res.json()
    const raw = json.economicCalendar || []

    const events: CalEvent[] = raw
      .filter((e: { country: string }) => ['US', 'GB', 'EU', 'JP'].includes(e.country))
      .slice(0, 20)
      .map((e: { date: string; time: string; country: string; event: string; impact: string; prev: string; estimate: string; actual: string }, i: number) => ({
        id: String(i),
        date: e.date,
        time: e.time?.slice(0, 5) || '—',
        country: e.country,
        name: e.event,
        impact: getImpact(e.impact),
        previous: e.prev || '—',
        forecast: e.estimate || '—',
        actual: e.actual || null,
      }))

    return NextResponse.json({ events: events.length ? events : getMockEvents(), demo: false })
  } catch {
    return NextResponse.json({ events: getMockEvents(), demo: true })
  }
}
