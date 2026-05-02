'use client'

import { useState, useEffect } from 'react'
import { X, Sun, TrendingUp, TrendingDown, Calendar } from 'lucide-react'
import type { NewsItem } from '@/lib/types'

function getMarketContext(): string {
  const h = new Date().getHours()
  if (h < 9)  return 'Pre-market session active. Watch the 9:30 AM open — gaps often fill in the first 30 minutes.'
  if (h < 10) return 'Market just opened. First 15 minutes are highest volatility — wait for the dust to settle before entering.'
  if (h < 12) return 'Morning session. Institutional order flow establishing the day\'s range. Watch for VWAP reclaims.'
  if (h < 14) return 'Midday lull. Volume drops 30-40% from the open. Range trading and patience preferred here.'
  if (h < 16) return 'Power hour approaching (3-4 PM ET). Highest daily volume. Momentum plays and breakouts most reliable.'
  return 'After hours. Earnings often report now — lower liquidity, wider spreads. Size down.'
}

function getDayOfWeek(): string {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
  return days[new Date().getDay()]
}

export default function MorningBriefing() {
  const [visible, setVisible] = useState(false)
  const [news, setNews] = useState<NewsItem[]>([])
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = `yn_briefing_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return

    // Load real news headlines
    fetch('/api/news').then(r => r.json()).then(json => {
      if (json.news?.length) setNews(json.news.slice(0, 3))
    }).catch(() => {})

    setTimeout(() => setVisible(true), 1500)
  }, [])

  const dismiss = () => {
    localStorage.setItem(`yn_briefing_${new Date().toDateString()}`, '1')
    setDismissed(true)
    setVisible(false)
  }

  if (!visible || dismissed) return null

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="fixed bottom-12 right-4 z-[200] w-80 bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden"
      style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 40px rgba(30,144,255,0.1)' }}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2d4a] bg-[#040c14]">
        <div className="flex items-center gap-2">
          <Sun size={13} className="text-[#ffa502]" />
          <div>
            <div className="text-xs font-bold text-[#cdd6f4]">YN Morning Briefing</div>
            <div className="text-[9px] text-[#4a5e7a]">{date}</div>
          </div>
        </div>
        <button onClick={dismiss} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={13} /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* Real market context based on time of day */}
        <p className="text-[11px] text-[#7f93b5] leading-relaxed italic border-l-2 border-[#1e90ff] pl-2">
          &ldquo;{getMarketContext()}&rdquo;
        </p>

        {/* Real news headlines */}
        {news.length > 0 && (
          <div>
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1.5 flex items-center gap-1">
              <TrendingUp size={9} /> Top Headlines (Live)
            </div>
            <div className="space-y-1.5">
              {news.map(item => (
                <a key={item.id} href={item.url} target="_blank" rel="noopener noreferrer"
                  className="block text-[10px] text-[#7f93b5] leading-snug hover:text-[#cdd6f4] transition-colors line-clamp-2">
                  <span className="text-[#4a5e7a] mr-1">{item.source} ·</span>
                  {item.headline}
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Day-specific context */}
        <div className="flex items-center gap-1.5 bg-[#040c14] rounded px-2 py-1.5">
          <Calendar size={9} className="text-[#1e90ff]" />
          <span className="text-[10px] text-[#7f93b5]">
            {getDayOfWeek() === 'Friday' ? '🔴 NFP week ends today — vol expected EOD' :
             getDayOfWeek() === 'Wednesday' ? '🟡 Fed minutes often Wednesday — check calendar' :
             getDayOfWeek() === 'Monday' ? '🟢 Fresh week — gaps from Friday often fill' :
             'Check the Economic Calendar for today\'s events'}
          </span>
        </div>

        <button onClick={dismiss}
          className="w-full py-2 text-[10px] font-bold text-[#040c14] bg-[#1e90ff] rounded-lg hover:bg-[#3aa0ff] transition-colors">
          Got it — Start Trading
        </button>
      </div>
    </div>
  )
}
