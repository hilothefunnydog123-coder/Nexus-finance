'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown, Star } from 'lucide-react'
import type { Quote } from '@/lib/types'

const WATCHLIST = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corp.' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'MSFT', name: 'Microsoft' },
  { symbol: 'GOOGL', name: 'Alphabet' },
  { symbol: 'AMZN', name: 'Amazon' },
  { symbol: 'META', name: 'Meta Platforms' },
  { symbol: 'AMD', name: 'AMD' },
  { symbol: 'JPM', name: 'JPMorgan' },
  { symbol: 'SPY', name: 'S&P 500 ETF' },
]

interface Props {
  quotes: Record<string, Quote>
  selectedSymbol: string
  onSelect: (symbol: string) => void
}

function formatVolume(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`
  return String(v)
}

export default function WatchlistPanel({ quotes, selectedSymbol, onSelect }: Props) {
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null)

  return (
    <div className="relative flex flex-col h-full bg-[#071220] border-r border-[#1a2d4a]" style={{ width: 200 }}>
      {/* Hover tooltip */}
      {hoveredSymbol && quotes[hoveredSymbol] && (
        <div className="absolute left-full top-0 z-50 ml-2 w-44 bg-[#0a1628] border border-[#1e3a5f] rounded-lg p-3 shadow-xl pointer-events-none" style={{ top: '50%' }}>
          <div className="text-[10px] font-bold text-[#cdd6f4] mb-2">{hoveredSymbol}</div>
          {[
            ['Open',       quotes[hoveredSymbol].open],
            ['High',       quotes[hoveredSymbol].high],
            ['Low',        quotes[hoveredSymbol].low],
            ['Prev Close', quotes[hoveredSymbol].previousClose],
          ].map(([l, v]) => (
            <div key={l as string} className="flex justify-between text-[10px] mb-1">
              <span className="text-[#4a5e7a]">{l}</span>
              <span className="mono text-[#cdd6f4] font-semibold">${(v as number).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628]">
        <Star size={12} className="text-[#ffa502]" />
        <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-widest">Watchlist</span>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-2 px-3 py-1 border-b border-[#1a2d4a]">
        <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">Symbol</span>
        <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider text-right">Chg%</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto">
        {WATCHLIST.map(({ symbol, name }) => {
          const q = quotes[symbol]
          const isUp = q ? q.changePercent >= 0 : true
          const isSelected = symbol === selectedSymbol

          return (
            <button
              key={symbol}
              onClick={() => onSelect(symbol)}
              onMouseEnter={() => setHoveredSymbol(symbol)}
              onMouseLeave={() => setHoveredSymbol(null)}
              className={`w-full text-left px-3 py-2 border-b border-[#1a2d4a]/50 hover:bg-[#0f1f38] transition-colors ${
                isSelected ? 'bg-[#0f1f38] border-l-2 border-l-[#00d4aa]' : ''
              }`}
            >
              <div className="grid grid-cols-2 items-center">
                <div>
                  <div className={`text-xs font-semibold ${isSelected ? 'text-[#00d4aa]' : 'text-[#cdd6f4]'}`}>
                    {symbol}
                  </div>
                  <div className="text-[10px] text-[#4a5e7a] truncate">{name}</div>
                </div>
                <div className="text-right">
                  {q ? (
                    <>
                      <div className={`mono text-xs font-medium ${isUp ? 'text-up' : 'text-down'}`}>
                        ${q.price.toFixed(2)}
                      </div>
                      <div className={`mono text-[10px] flex items-center justify-end gap-0.5 ${isUp ? 'text-up' : 'text-down'}`}>
                        {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                        {isUp ? '+' : ''}{q.changePercent.toFixed(2)}%
                      </div>
                    </>
                  ) : (
                    <div className="text-[10px] text-[#4a5e7a]">Loading...</div>
                  )}
                </div>
              </div>
              {q && (
                <div className="mt-0.5 flex items-center gap-1">
                  <div
                    className="h-0.5 rounded-full flex-1"
                    style={{ background: isUp ? 'rgba(0,212,170,0.15)' : 'rgba(255,71,87,0.15)' }}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.min(Math.abs(q.changePercent) * 20, 100)}%`,
                        background: isUp ? '#00d4aa' : '#ff4757',
                      }}
                    />
                  </div>
                  <span className="text-[9px] text-[#4a5e7a] mono">{formatVolume(q.volume)}</span>
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Market status */}
      <div className="px-3 py-2 border-t border-[#1a2d4a] bg-[#0a1628]">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#4a5e7a]">NYSE / NASDAQ</span>
          <span className="text-[10px] text-[#00d4aa] font-mono flex items-center gap-1">
            <span className="w-1 h-1 rounded-full bg-[#00d4aa] animate-pulse" />
            OPEN
          </span>
        </div>
      </div>
    </div>
  )
}
