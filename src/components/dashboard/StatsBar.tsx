'use client'

import { TrendingUp, TrendingDown, Activity, BarChart2 } from 'lucide-react'

const MARKET_STATS = [
  { label: 'S&P 500', value: '5,248.32', change: 0.84, symbol: 'SPX' },
  { label: 'DOW', value: '38,503.90', change: -0.12, symbol: 'DJI' },
  { label: 'NASDAQ', value: '16,423.50', change: 1.24, symbol: 'NDX' },
  { label: 'VIX', value: '13.42', change: -4.20, symbol: 'VIX' },
  { label: '10Y YIELD', value: '4.312%', change: 0.02, symbol: 'TNX' },
  { label: 'USD/EUR', value: '1.0842', change: -0.08, symbol: 'EURUSD' },
  { label: 'BTC', value: '67,240', change: 2.34, symbol: 'BTCUSD' },
  { label: 'GOLD', value: '2,389.40', change: 0.54, symbol: 'GC' },
]

export default function StatsBar() {
  return (
    <div className="flex items-center h-9 border-b border-[#1a2d4a] bg-[#040c14] overflow-x-auto shrink-0">
      <div className="flex items-center gap-0 shrink-0">
        {MARKET_STATS.map((stat, i) => {
          const isUp = stat.change >= 0
          return (
            <div
              key={stat.symbol}
              className="flex items-center gap-2 px-3 border-r border-[#1a2d4a] h-9 shrink-0 hover:bg-[#0a1628] transition-colors cursor-default"
            >
              <div>
                <span className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block">{stat.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="mono text-xs font-semibold text-[#cdd6f4]">{stat.value}</span>
                  <span className={`mono text-[9px] flex items-center gap-0.5 ${isUp ? 'text-up' : 'text-down'}`}>
                    {isUp ? <TrendingUp size={8} /> : <TrendingDown size={8} />}
                    {isUp ? '+' : ''}{stat.change.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Right side: market breadth */}
      <div className="ml-auto flex items-center gap-3 px-3 shrink-0 border-l border-[#1a2d4a] h-9">
        <div className="flex items-center gap-1.5">
          <Activity size={10} className="text-[#4a5e7a]" />
          <span className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Adv/Dec</span>
          <span className="mono text-[10px] text-[#00d4aa]">2,847</span>
          <span className="text-[#4a5e7a]">/</span>
          <span className="mono text-[10px] text-[#ff4757]">1,892</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BarChart2 size={10} className="text-[#4a5e7a]" />
          <span className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Vol</span>
          <span className="mono text-[10px] text-[#7f93b5]">7.2B</span>
        </div>
      </div>
    </div>
  )
}
