'use client'

import { useState, useEffect } from 'react'
import { X, Sun, Bot, TrendingUp } from 'lucide-react'

export default function MorningBriefing() {
  const [visible, setVisible] = useState(false)
  const [brief, setBrief] = useState('')
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = `yn_briefing_${new Date().toDateString()}`
    if (localStorage.getItem(key)) return

    const generate = async () => {
      try {
        const [mktRes, newsRes] = await Promise.all([fetch('/api/market'), fetch('/api/news')])
        const mkt = await mktRes.json()
        const newsJson = await newsRes.json()
        const spy = mkt.quotes?.SPY
        const qqq = mkt.quotes?.QQQ
        const topHeadline = newsJson.news?.[0]?.headline ?? ''
        const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
        const res = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'morning_brief', data: { spy, qqq, topHeadline, time } }),
        })
        const json = await res.json()
        setBrief(json.brief || 'Markets are open. Review your watchlist and stick to your plan.')
      } catch {
        setBrief('Markets are open. Check SPY and QQQ levels, review your watchlist, and stick to your plan.')
      }
      setLoading(false)
      setTimeout(() => setVisible(true), 800)
    }

    generate()
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
            <div className="text-xs font-bold text-[#cdd6f4] flex items-center gap-1.5">
              AI Morning Brief <Bot size={10} className="text-[#a855f7]" />
            </div>
            <div className="text-[9px] text-[#4a5e7a]">{date} · Live data</div>
          </div>
        </div>
        <button onClick={dismiss} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={13} /></button>
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#a855f7] animate-pulse" />
            <span className="text-[11px] text-[#4a5e7a]">Fetching live SPY/QQQ + generating brief...</span>
          </div>
        ) : (
          <div className="border-l-2 border-[#a855f7] pl-3">
            <div className="flex items-center gap-1 mb-1.5">
              <TrendingUp size={9} className="text-[#a855f7]" />
              <span className="text-[9px] text-[#a855f7] font-bold uppercase tracking-wider">Gemini AI · Live Data</span>
            </div>
            <p className="text-[11px] text-[#cdd6f4] leading-relaxed">{brief}</p>
          </div>
        )}
        <button onClick={dismiss} className="w-full py-2 text-[10px] font-bold text-[#040c14] bg-[#1e90ff] rounded-lg hover:bg-[#3aa0ff] transition-colors">
          Got it — Start Trading
        </button>
      </div>
    </div>
  )
}
