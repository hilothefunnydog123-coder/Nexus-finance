'use client'

import { useState, useEffect } from 'react'
import { X, Sun, TrendingUp, TrendingDown, Calendar, AlertTriangle } from 'lucide-react'

const EVENTS_TODAY = [
  { time: '08:30', name: 'Core PCE Price Index', impact: 'high'   },
  { time: '10:00', name: 'Fed Chair Powell Speaks', impact: 'high' },
  { time: '14:30', name: 'Crude Oil Inventories', impact: 'medium' },
]

const PREMARKET = [
  { sym: 'NVDA', chg: +2.4, reason: 'Strong earnings guidance reiterated' },
  { sym: 'AAPL', chg: -0.8, reason: 'iPhone demand concerns from analyst' },
  { sym: 'META', chg: +1.6, reason: 'AI advertising revenue upgrade' },
  { sym: 'TSLA', chg: -1.2, reason: 'Delivery miss estimates' },
]

function getBrief() {
  const h = new Date().getHours()
  if (h < 9)  return 'Pre-market session active. ES futures pointing to a gap-up open. Watch the 9:30 open for direction.'
  if (h < 10) return 'Market just opened. First 30 minutes are typically volatile — wait for the dust to settle before entering.'
  if (h < 12) return 'Morning session underway. Institutional order flow establishing the day\'s range. Key levels in play.'
  if (h < 14) return 'Midday lull. Volume typically drops 30-40% from morning. Range trading strategies preferred.'
  if (h < 16) return 'Power hour approaching. 3-4 PM ET sees highest daily volume. Momentum plays and breakouts likely.'
  return 'After hours session. Lower liquidity, wider spreads. Earnings often reported now — position sizing critical.'
}

export default function MorningBriefing() {
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = `yn_briefing_${new Date().toDateString()}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => setVisible(true), 2000)
    }
  }, [])

  const dismiss = () => {
    const key = `yn_briefing_${new Date().toDateString()}`
    localStorage.setItem(key, '1')
    setDismissed(true)
    setVisible(false)
  }

  if (!visible || dismissed) return null

  const day = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fixed bottom-12 right-4 z-[200] w-80 bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(30,144,255,0.1)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2d4a] bg-[#040c14]">
        <div className="flex items-center gap-2">
          <Sun size={13} className="text-[#ffa502]" />
          <div>
            <div className="text-xs font-bold text-[#cdd6f4]">YN Morning Briefing</div>
            <div className="text-[9px] text-[#4a5e7a]">{day}</div>
          </div>
        </div>
        <button onClick={dismiss} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={13} /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* Market context */}
        <p className="text-[11px] text-[#7f93b5] leading-relaxed italic">&ldquo;{getBrief()}&rdquo;</p>

        {/* Pre-market movers */}
        <div>
          <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1.5">Pre-Market Movers</div>
          <div className="space-y-1">
            {PREMARKET.map(m => (
              <div key={m.sym} className="flex items-start gap-2">
                <span className="text-[10px] font-bold text-[#cdd6f4] w-10 shrink-0">{m.sym}</span>
                <span className={`mono text-[10px] font-bold shrink-0 ${m.chg >= 0 ? 'text-up' : 'text-down'}`}>
                  {m.chg >= 0 ? '+' : ''}{m.chg}%
                </span>
                <span className="text-[9px] text-[#4a5e7a] leading-snug">{m.reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Events */}
        <div>
          <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1.5 flex items-center gap-1">
            <Calendar size={9} /> Events Today
          </div>
          <div className="space-y-1">
            {EVENTS_TODAY.map(e => (
              <div key={e.name} className="flex items-center gap-2">
                <span className="text-[8px]">{e.impact === 'high' ? '🔴' : '🟡'}</span>
                <span className="mono text-[9px] text-[#7f93b5] w-10 shrink-0">{e.time}</span>
                <span className="text-[9px] text-[#cdd6f4]">{e.name}</span>
              </div>
            ))}
          </div>
        </div>

        <button onClick={dismiss}
          className="w-full py-2 text-[10px] font-bold text-[#040c14] bg-[#1e90ff] rounded-lg hover:bg-[#3aa0ff] transition-colors">
          Got it — Start Trading
        </button>
      </div>
    </div>
  )
}
