'use client'

import { useState, useEffect, useCallback } from 'react'
import { Calendar, Clock, AlertTriangle, RefreshCw } from 'lucide-react'
import type { CalEvent } from '@/app/api/calendar/route'

const IMPACT_STYLE = {
  high:   { color: '#ff4757', bg: 'rgba(255,71,87,0.15)',  icon: '🔴' },
  medium: { color: '#ffa502', bg: 'rgba(255,165,2,0.15)',  icon: '🟡' },
  low:    { color: '#00d4aa', bg: 'rgba(0,212,170,0.15)',  icon: '🟢' },
}

const FLAGS: Record<string, string> = {
  US: '🇺🇸', GB: '🇬🇧', EU: '🇪🇺', JP: '🇯🇵', CA: '🇨🇦', AU: '🇦🇺', NZ: '🇳🇿', CH: '🇨🇭',
}

export default function EconomicCalendar() {
  const [events, setEvents] = useState<CalEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const fetchEvents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/calendar')
      const json = await res.json()
      setEvents(json.events || [])
      setIsDemo(json.demo)
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchEvents() }, [fetchEvents])

  const today = new Date().toISOString().split('T')[0]
  const filtered = events.filter(e => filter === 'all' || e.impact === filter)
  const todayEvents = filtered.filter(e => e.date === today)
  const futureEvents = filtered.filter(e => e.date > today)
  const pastEvents = filtered.filter(e => e.date < today)

  const Row = ({ e }: { e: CalEvent }) => {
    const style = IMPACT_STYLE[e.impact]
    const isBeat = e.actual && e.forecast && e.forecast !== '—' && parseFloat(e.actual) > parseFloat(e.forecast)
    const isMiss = e.actual && e.forecast && e.forecast !== '—' && parseFloat(e.actual) < parseFloat(e.forecast)
    const isPast = e.date < today || (e.date === today && e.actual !== null)

    return (
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors ${isPast ? 'opacity-55' : ''}`}>
        <div className="w-16 shrink-0">
          <div className="mono text-[10px] text-[#7f93b5] flex items-center gap-1">
            <Clock size={8} />
            {e.time}
          </div>
          <div className="text-[8px] text-[#4a5e7a] mono">{e.date.slice(5)}</div>
        </div>
        <div className="shrink-0 text-sm">{FLAGS[e.country] || '🌐'}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">{style.icon}</span>
            <span className={`text-[11px] font-semibold truncate ${isPast ? 'text-[#7f93b5]' : 'text-[#cdd6f4]'}`}>{e.name}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 text-[10px] mono">
          <div className="text-right">
            <div className="text-[8px] text-[#4a5e7a]">Prev</div>
            <div className="text-[#7f93b5]">{e.previous}</div>
          </div>
          <div className="text-right">
            <div className="text-[8px] text-[#4a5e7a]">Fcst</div>
            <div className="text-[#7f93b5]">{e.forecast}</div>
          </div>
          {e.actual && (
            <div className="text-right">
              <div className="text-[8px] text-[#4a5e7a]">Actual</div>
              <div className={`font-bold ${isBeat ? 'text-up' : isMiss ? 'text-down' : 'text-[#cdd6f4]'}`}>{e.actual}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2">
          <Calendar size={12} className="text-[#1e90ff]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Economic Calendar</span>
          {isDemo
            ? <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>
            : <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE — Finnhub</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex gap-1">
            {(['all','high','medium','low'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-2 py-0.5 text-[9px] rounded font-mono uppercase transition-colors ${
                  filter === f ? 'bg-[#1e90ff] text-white' : 'text-[#4a5e7a] hover:text-[#7f93b5]'
                }`}>{f}</button>
            ))}
          </div>
          <button onClick={fetchEvents} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center h-20">
            <div className="w-5 h-5 border-2 border-[#1e90ff] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {!loading && (
          <>
            {todayEvents.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-[#040c14] text-[9px] text-[#1e90ff] uppercase tracking-wider font-bold sticky top-0">
                  Today · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                </div>
                {todayEvents.map(e => <Row key={e.id} e={e} />)}
              </div>
            )}
            {futureEvents.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider sticky top-0">Upcoming</div>
                {futureEvents.map(e => <Row key={e.id} e={e} />)}
              </div>
            )}
            {pastEvents.length > 0 && (
              <div>
                <div className="px-3 py-1 bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider sticky top-0">Released</div>
                {pastEvents.map(e => <Row key={e.id} e={e} />)}
              </div>
            )}
          </>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-[#1a2d4a] bg-[#040c14] shrink-0 flex items-center gap-2">
        <AlertTriangle size={9} className="text-[#ffa502]" />
        <span className="text-[9px] text-[#4a5e7a]">🔴 High Impact · 🟡 Medium · 🟢 Low — All times ET — Beat <span className="text-up">▲</span> Miss <span className="text-down">▼</span></span>
      </div>
    </div>
  )
}
