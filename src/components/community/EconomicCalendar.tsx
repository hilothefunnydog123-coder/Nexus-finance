'use client'

import { useState } from 'react'
import { Calendar, Clock, AlertTriangle } from 'lucide-react'

interface CalEvent {
  id: string
  time: string
  name: string
  country: string
  flag: string
  impact: 'high' | 'medium' | 'low'
  previous: string
  forecast: string
  actual?: string
  passed: boolean
}

const EVENTS: CalEvent[] = [
  { id: 'e1',  time: '08:30', name: 'Initial Jobless Claims',       country: 'USD', flag: '🇺🇸', impact: 'medium', previous: '212K',  forecast: '218K',  passed: true,  actual: '221K' },
  { id: 'e2',  time: '08:30', name: 'Core PCE Price Index (MoM)',   country: 'USD', flag: '🇺🇸', impact: 'high',   previous: '0.3%', forecast: '0.2%', passed: true,  actual: '0.2%' },
  { id: 'e3',  time: '09:45', name: 'Chicago PMI',                  country: 'USD', flag: '🇺🇸', impact: 'low',    previous: '45.2', forecast: '46.0', passed: false },
  { id: 'e4',  time: '10:00', name: 'Fed Chair Powell Speaks',      country: 'USD', flag: '🇺🇸', impact: 'high',   previous: '—',    forecast: '—',    passed: false },
  { id: 'e5',  time: '10:00', name: 'Consumer Confidence',         country: 'USD', flag: '🇺🇸', impact: 'medium', previous: '103.1',forecast: '104.0',passed: false },
  { id: 'e6',  time: '13:00', name: 'BOE Governor Bailey Speech',   country: 'GBP', flag: '🇬🇧', impact: 'high',   previous: '—',    forecast: '—',    passed: false },
  { id: 'e7',  time: '14:30', name: 'Crude Oil Inventories',       country: 'USD', flag: '🇺🇸', impact: 'medium', previous: '-2.3M',forecast: '-1.8M',passed: false },
  { id: 'e8',  time: '15:30', name: 'FOMC Member Waller Speaks',   country: 'USD', flag: '🇺🇸', impact: 'medium', previous: '—',    forecast: '—',    passed: false },
  // Tomorrow
  { id: 'e9',  time: 'TMR 08:30', name: 'Nonfarm Payrolls',        country: 'USD', flag: '🇺🇸', impact: 'high',   previous: '228K', forecast: '215K', passed: false },
  { id: 'e10', time: 'TMR 08:30', name: 'Unemployment Rate',       country: 'USD', flag: '🇺🇸', impact: 'high',   previous: '3.9%', forecast: '3.9%', passed: false },
  { id: 'e11', time: 'TMR 10:00', name: 'ISM Manufacturing PMI',   country: 'USD', flag: '🇺🇸', impact: 'high',   previous: '50.3', forecast: '50.8', passed: false },
]

const IMPACT_STYLE = {
  high:   { color: '#ff4757', bg: 'rgba(255,71,87,0.15)',  label: '🔴' },
  medium: { color: '#ffa502', bg: 'rgba(255,165,2,0.15)',  label: '🟡' },
  low:    { color: '#00d4aa', bg: 'rgba(0,212,170,0.15)',  label: '🟢' },
}

export default function EconomicCalendar() {
  const [filter, setFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all')

  const filtered = EVENTS.filter(e => filter === 'all' || e.impact === filter)
  const upcoming = filtered.filter(e => !e.passed)
  const past = filtered.filter(e => e.passed)

  const Row = ({ e }: { e: CalEvent }) => {
    const style = IMPACT_STYLE[e.impact]
    const isBeat = e.actual && e.forecast && e.actual > e.forecast
    const isMiss = e.actual && e.forecast && e.actual < e.forecast
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors ${e.passed ? 'opacity-60' : ''}`}>
        <div className="w-16 shrink-0">
          <div className="mono text-[10px] text-[#7f93b5] flex items-center gap-1">
            <Clock size={8} />
            {e.time}
          </div>
        </div>
        <div className="shrink-0 w-4 text-xs">{e.flag}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-[9px]">{style.label}</span>
            <span className={`text-[11px] font-semibold ${e.passed ? 'text-[#7f93b5]' : 'text-[#cdd6f4]'} truncate`}>{e.name}</span>
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
        <div className="flex items-center gap-1.5">
          <Calendar size={12} className="text-[#1e90ff]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Economic Calendar</span>
        </div>
        <div className="flex gap-1">
          {(['all', 'high', 'medium', 'low'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[9px] rounded font-mono uppercase transition-colors ${
                filter === f ? 'bg-[#1e90ff] text-white' : 'text-[#4a5e7a] hover:text-[#7f93b5]'
              }`}>{f}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {upcoming.length > 0 && (
          <div>
            <div className="px-3 py-1 bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider sticky top-0">Upcoming</div>
            {upcoming.map(e => <Row key={e.id} e={e} />)}
          </div>
        )}
        {past.length > 0 && (
          <div>
            <div className="px-3 py-1 bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider sticky top-0">Released Today</div>
            {past.map(e => <Row key={e.id} e={e} />)}
          </div>
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-[#1a2d4a] bg-[#040c14] shrink-0 flex items-center gap-3">
        <AlertTriangle size={9} className="text-[#ffa502]" />
        <span className="text-[9px] text-[#4a5e7a]">🔴 High Impact &nbsp;🟡 Medium &nbsp;🟢 Low — All times ET</span>
      </div>
    </div>
  )
}
