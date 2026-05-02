'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import { HEATMAP_SECTORS } from '@/app/api/heatmap/route'

interface StockData { sym: string; price: number; pct: number; prev: number }

function pctColor(pct: number): string {
  if (pct <= -3)   return '#7a0a14'
  if (pct <= -2)   return '#c0152a'
  if (pct <= -1)   return '#e03244'
  if (pct <= -0.3) return '#883344'
  if (pct < 0)     return '#5a2233'
  if (pct === 0)   return '#1a2d4a'
  if (pct < 0.3)   return '#1a4030'
  if (pct < 1)     return '#1a5c3a'
  if (pct < 2)     return '#0f7a40'
  if (pct < 3)     return '#0a9448'
  return '#00d4aa'
}

export default function MarketHeatmap() {
  const [quotes, setQuotes] = useState<Record<string, StockData>>({})
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)
  const [tooltip, setTooltip] = useState<StockData & { name: string } | null>(null)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/heatmap')
      const json = await res.json()
      setQuotes(json.quotes || {})
      setIsDemo(json.demo)
      setLastUpdated(new Date())
    } catch {}
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    fetchData()
    // Real data: refresh every 30s. Demo: every 5s for animation effect
    const interval = setInterval(fetchData, isDemo ? 5000 : 30000)
    return () => clearInterval(interval)
  }, [fetchData, isDemo])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-widest">Market Heatmap</span>
          {isDemo && <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>}
          {!isDemo && <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE</span>}
          {lastUpdated && <span className="text-[8px] text-[#4a5e7a]">Updated {lastUpdated.toLocaleTimeString()}</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-[8px]">
            {[['#c0152a','< -2%'],['#883344','< 0%'],['#1a2d4a','0%'],['#0a9448','> 1%'],['#00d4aa','> 3%']].map(([c,l]) => (
              <div key={l} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
                <span className="text-[#4a5e7a]">{l}</span>
              </div>
            ))}
          </div>
          <button onClick={fetchData} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="flex-1 p-2 overflow-hidden relative">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#040c14]/80 z-10">
            <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {tooltip && (
          <div className="absolute top-3 right-3 z-20 bg-[#071220] border border-[#1e3a5f] rounded-lg px-3 py-2 shadow-xl pointer-events-none">
            <div className="text-xs font-black text-[#cdd6f4]">{tooltip.sym}</div>
            <div className="text-[10px] text-[#4a5e7a]">{tooltip.name}</div>
            <div className={`mono text-sm font-black ${tooltip.pct >= 0 ? 'text-up' : 'text-down'}`}>
              {tooltip.pct >= 0 ? '+' : ''}{tooltip.pct.toFixed(2)}%
            </div>
            <div className="mono text-[10px] text-[#7f93b5]">${tooltip.price.toFixed(2)}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 h-full content-start">
          {HEATMAP_SECTORS.map(sector => (
            <div key={sector.name} className="flex-shrink-0" style={{ width: 'calc(33% - 4px)' }}>
              <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider mb-1 px-0.5">{sector.name}</div>
              <div className="flex flex-wrap gap-0.5">
                {sector.stocks.map(stock => {
                  const q = quotes[stock.sym]
                  const pct = q?.pct ?? 0
                  return (
                    <div
                      key={stock.sym}
                      onMouseEnter={() => q && setTooltip({ ...q, name: stock.name })}
                      onMouseLeave={() => setTooltip(null)}
                      className="flex flex-col items-center justify-center cursor-default rounded transition-all duration-300 hover:scale-105 hover:z-10"
                      style={{
                        background: pctColor(pct),
                        width: `${Math.max(stock.w * 8, 36)}px`,
                        height: `${Math.max(stock.w * 7, 32)}px`,
                        minWidth: 36,
                      }}
                    >
                      <div className="text-[9px] font-black text-white leading-none">{stock.sym}</div>
                      <div className={`text-[8px] font-semibold mono leading-none mt-0.5 ${pct >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                        {q ? `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` : '—'}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
