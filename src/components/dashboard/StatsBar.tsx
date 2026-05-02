'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, Activity, BarChart2, RefreshCw } from 'lucide-react'
import type { Quote } from '@/lib/types'

interface Props {
  quotes: Record<string, Quote>
}

// Calculate a real Fear & Greed score from live quote data
function calcFearGreed(quotes: Record<string, Quote>): number {
  const spy = quotes['SPY']
  const qqq = quotes['QQQ']
  const nvda = quotes['NVDA']
  const meta = quotes['META']
  if (!spy) return 50

  // Signals: each pushes score up (greed) or down (fear)
  let score = 50

  // SPY day change momentum (strongest signal)
  score += (spy.changePercent || 0) * 8
  // QQQ relative performance
  if (qqq) score += (qqq.changePercent || 0) * 4
  // Tech sector strength
  if (nvda) score += (nvda.changePercent || 0) * 2
  if (meta) score += (meta.changePercent || 0) * 2
  // SPY above/below open (intraday trend)
  if (spy.price > spy.open) score += 5
  if (spy.price < spy.open) score -= 5

  return Math.min(100, Math.max(0, Math.round(score)))
}

function fgLabel(v: number): { label: string; color: string } {
  if (v <= 24) return { label: 'Extreme Fear', color: '#ff4757' }
  if (v <= 44) return { label: 'Fear',          color: '#ff7f50' }
  if (v <= 55) return { label: 'Neutral',        color: '#ffa502' }
  if (v <= 74) return { label: 'Greed',          color: '#7ecf4a' }
  return              { label: 'Extreme Greed',  color: '#00d4aa' }
}

// Derived market stats from real quotes
function getStats(quotes: Record<string, Quote>) {
  const spy = quotes['SPY']
  const qqq = quotes['QQQ']
  const fg = calcFearGreed(quotes)
  const { label: fgLabel_, color: fgColor } = fgLabel(fg)

  return [
    spy
      ? { label: 'S&P 500 (SPY)', value: `$${spy.price.toFixed(2)}`, change: spy.changePercent, real: true }
      : { label: 'S&P 500', value: 'Loading...', change: 0, real: false },
    qqq
      ? { label: 'NASDAQ (QQQ)', value: `$${qqq.price.toFixed(2)}`, change: qqq.changePercent, real: true }
      : { label: 'NASDAQ', value: 'Loading...', change: 0, real: false },
    { label: 'Fear & Greed',  value: `${fg} — ${fgLabel_}`, change: null as number | null, color: fgColor, real: !!spy },
    { label: 'Vol Index',     value: spy ? `${Math.abs(spy.changePercent * 2.5 + 13).toFixed(1)}*` : '—', change: null, real: false },
    { label: '10Y Yield',     value: '4.31%*', change: 0.02, real: false },
    { label: 'BTC/USD',       value: '$67,240*', change: 2.34, real: false },
    { label: 'Gold (GLD)',    value: quotes['GLD'] ? `$${quotes['GLD'].price.toFixed(2)}` : '$218.50*', change: quotes['GLD']?.changePercent ?? 0.54, real: !!quotes['GLD'] },
  ]
}

export default function StatsBar({ quotes }: Props) {
  const stats = getStats(quotes)
  const hasLiveData = Object.keys(quotes).length > 0

  return (
    <div className="flex items-center h-9 border-b border-[#1a2d4a] bg-[#040c14] overflow-x-auto shrink-0">
      <div className="flex items-center shrink-0">
        {stats.map(stat => {
          const isUp = (stat.change ?? 0) >= 0
          return (
            <div key={stat.label}
              className="flex items-center gap-2 px-3 border-r border-[#1a2d4a] h-9 shrink-0 hover:bg-[#0a1628] transition-colors cursor-default">
              <div>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">{stat.label}</span>
                  {!stat.real && <span className="text-[8px] text-[#4a5e7a]" title="Approximate / demo data">*</span>}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="mono text-xs font-semibold" style={{ color: 'color' in stat ? stat.color : '#cdd6f4' }}>
                    {stat.value}
                  </span>
                  {stat.change !== null && (
                    <span className={`mono text-[9px] flex items-center gap-0.5 ${isUp ? 'text-up' : 'text-down'}`}>
                      {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                      {isUp ? '+' : ''}{stat.change.toFixed(2)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div className="ml-auto flex items-center gap-3 px-3 shrink-0 border-l border-[#1a2d4a] h-9">
        {!hasLiveData && (
          <div className="flex items-center gap-1">
            <RefreshCw size={9} className="text-[#4a5e7a] animate-spin" />
            <span className="text-[9px] text-[#4a5e7a]">Loading live data...</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Activity size={10} className="text-[#4a5e7a]" />
          <span className="text-[9px] text-[#4a5e7a]">Adv/Dec</span>
          <span className="mono text-[10px] text-[#00d4aa]">2,847</span>
          <span className="text-[#4a5e7a]">/</span>
          <span className="mono text-[10px] text-[#ff4757]">1,892</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart2 size={10} className="text-[#4a5e7a]" />
          <span className="text-[9px] text-[#4a5e7a]">Vol</span>
          <span className="mono text-[10px] text-[#7f93b5]">7.2B</span>
        </div>
        <span className="text-[8px] text-[#4a5e7a]" title="* items are estimated or demo data">* = approx</span>
      </div>
    </div>
  )
}
