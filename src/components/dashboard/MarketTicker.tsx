'use client'

import { useEffect, useRef, useState } from 'react'
import { TrendingUp, TrendingDown, Wifi, WifiOff } from 'lucide-react'
import type { Quote } from '@/lib/types'

interface Props {
  quotes: Record<string, Quote>
  connected: boolean
  isDemo: boolean
}

function TickerItem({ quote, flash }: { quote: Quote; flash: 'up' | 'down' | null }) {
  const isUp = quote.changePercent >= 0
  return (
    <div
      className={`flex items-center gap-2 px-4 border-r border-[#1a2d4a] shrink-0 ${flash === 'up' ? 'flash-green' : flash === 'down' ? 'flash-red' : ''}`}
    >
      <span className="text-[#cdd6f4] font-semibold tracking-wide text-xs">{quote.symbol}</span>
      <span className={`mono text-xs font-medium ${isUp ? 'text-up' : 'text-down'}`}>
        ${quote.price.toFixed(2)}
      </span>
      <span className={`mono text-[11px] flex items-center gap-0.5 ${isUp ? 'text-up' : 'text-down'}`}>
        {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
        {isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%
      </span>
    </div>
  )
}

export default function MarketTicker({ quotes, connected, isDemo }: Props) {
  const prevQuotes = useRef<Record<string, number>>({})
  const [flashes, setFlashes] = useState<Record<string, 'up' | 'down' | null>>({})

  useEffect(() => {
    const newFlashes: Record<string, 'up' | 'down' | null> = {}
    Object.entries(quotes).forEach(([sym, q]) => {
      const prev = prevQuotes.current[sym]
      if (prev !== undefined && prev !== q.price) {
        newFlashes[sym] = q.price > prev ? 'up' : 'down'
      }
      prevQuotes.current[sym] = q.price
    })
    if (Object.keys(newFlashes).length) {
      setFlashes(newFlashes)
      const t = setTimeout(() => setFlashes({}), 700)
      return () => clearTimeout(t)
    }
  }, [quotes])

  const items = Object.values(quotes)

  return (
    <div className="flex items-center h-8 border-b border-[#1a2d4a] bg-[#040c14] overflow-hidden relative">
      {/* Status badge */}
      <div className="flex items-center gap-1.5 px-3 border-r border-[#1a2d4a] shrink-0 h-full">
        {isDemo ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-[#ffa502] animate-pulse" />
            <span className="text-[10px] text-[#ffa502] font-mono uppercase tracking-widest">DEMO</span>
          </>
        ) : connected ? (
          <>
            <Wifi size={10} className="text-[#00d4aa]" />
            <span className="text-[10px] text-[#00d4aa] font-mono uppercase tracking-widest">LIVE</span>
          </>
        ) : (
          <>
            <WifiOff size={10} className="text-[#ff4757]" />
            <span className="text-[10px] text-[#ff4757] font-mono uppercase tracking-widest">CONN</span>
          </>
        )}
      </div>

      {/* Scrolling tape */}
      <div className="overflow-hidden flex-1">
        {items.length > 0 && (
          <div className="ticker-track">
            {[...items, ...items].map((q, i) => (
              <TickerItem key={`${q.symbol}-${i}`} quote={q} flash={flashes[q.symbol] || null} />
            ))}
          </div>
        )}
      </div>

      {/* Time */}
      <LiveClock />
    </div>
  )
}

function LiveClock() {
  const [time, setTime] = useState('')
  useEffect(() => {
    const update = () => setTime(new Date().toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    }))
    update()
    const t = setInterval(update, 1000)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="px-3 border-l border-[#1a2d4a] shrink-0 h-full flex items-center">
      <span className="mono text-[11px] text-[#7f93b5] tracking-wider">{time} ET</span>
    </div>
  )
}
