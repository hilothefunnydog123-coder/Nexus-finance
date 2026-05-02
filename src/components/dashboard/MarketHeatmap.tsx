'use client'

import { useState, useEffect } from 'react'

interface Stock { sym: string; name: string; pct: number; w: number }
interface Sector { name: string; stocks: Stock[] }

const BASE: Sector[] = [
  { name: 'Technology', stocks: [
    { sym: 'AAPL',  name: 'Apple',     pct: -0.42, w: 7 },
    { sym: 'MSFT',  name: 'Microsoft', pct: 0.84,  w: 6 },
    { sym: 'NVDA',  name: 'NVIDIA',    pct: 2.12,  w: 5 },
    { sym: 'GOOGL', name: 'Alphabet',  pct: 1.24,  w: 4 },
    { sym: 'META',  name: 'Meta',      pct: 2.87,  w: 3 },
    { sym: 'AMD',   name: 'AMD',       pct: 3.12,  w: 1 },
    { sym: 'NFLX',  name: 'Netflix',   pct: 0.92,  w: 1 },
  ]},
  { name: 'Financials', stocks: [
    { sym: 'JPM', name: 'JPMorgan',     pct: -0.12, w: 4 },
    { sym: 'BAC', name: 'Bank of Am',   pct: -0.34, w: 2 },
    { sym: 'GS',  name: 'Goldman',      pct: 0.45,  w: 1 },
    { sym: 'MS',  name: 'Morgan St',    pct: 0.28,  w: 1 },
  ]},
  { name: 'Consumer', stocks: [
    { sym: 'AMZN', name: 'Amazon',  pct: 0.68, w: 5 },
    { sym: 'TSLA', name: 'Tesla',   pct: -0.82, w: 2 },
    { sym: 'COST', name: 'Costco',  pct: 0.14, w: 1 },
    { sym: 'HD',   name: 'Home Dep',pct: -0.21, w: 1 },
  ]},
  { name: 'Healthcare', stocks: [
    { sym: 'UNH', name: 'United Health', pct: 0.54,  w: 3 },
    { sym: 'JNJ', name: 'J&J',           pct: 0.12,  w: 2 },
    { sym: 'LLY', name: 'Eli Lilly',     pct: 1.84,  w: 2 },
    { sym: 'PFE', name: 'Pfizer',        pct: -0.93, w: 1 },
  ]},
  { name: 'Energy', stocks: [
    { sym: 'XOM',  name: 'ExxonMobil', pct: 0.32,  w: 3 },
    { sym: 'CVX',  name: 'Chevron',    pct: 0.18,  w: 2 },
    { sym: 'SLB',  name: 'SLB',        pct: -0.44, w: 1 },
  ]},
  { name: 'Indices', stocks: [
    { sym: 'SPY', name: 'S&P 500 ETF', pct: 0.84, w: 4 },
    { sym: 'QQQ', name: 'NASDAQ ETF',  pct: 1.22, w: 3 },
    { sym: 'IWM', name: 'Russell 2K',  pct: -0.32, w: 1 },
    { sym: 'GLD', name: 'Gold ETF',    pct: 0.54,  w: 1 },
  ]},
]

function pctColor(pct: number): string {
  if (pct <= -3)   return '#7a0a14'
  if (pct <= -2)   return '#c0152a'
  if (pct <= -1)   return '#e03244'
  if (pct <= -0.5) return '#cc5566'
  if (pct < 0)     return '#994455'
  if (pct === 0)   return '#1a2d4a'
  if (pct < 0.5)   return '#1a5c3a'
  if (pct < 1)     return '#0f7a40'
  if (pct < 2)     return '#0a9448'
  if (pct < 3)     return '#00b860'
  return '#00d4aa'
}

export default function MarketHeatmap() {
  const [data, setData] = useState(BASE)
  const [tooltip, setTooltip] = useState<{ sym: string; name: string; pct: number } | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setData(prev => prev.map(sector => ({
        ...sector,
        stocks: sector.stocks.map(s => ({
          ...s,
          pct: +(s.pct + (Math.random() - 0.5) * 0.1).toFixed(2),
        })),
      })))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-widest">Market Heatmap</span>
        <div className="flex items-center gap-3 text-[8px]">
          {[['#c0152a','-2%+'],['#994455','-1%'],['#1a2d4a','0%'],['#0a9448','+1%'],['#00d4aa','+2%+']].map(([c,l]) => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ background: c }} />
              <span className="text-[#4a5e7a]">{l}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 p-2 overflow-hidden relative">
        {tooltip && (
          <div className="absolute top-3 right-3 z-10 bg-[#071220] border border-[#1e3a5f] rounded-lg px-3 py-2 shadow-xl pointer-events-none">
            <div className="text-xs font-bold text-[#cdd6f4]">{tooltip.sym}</div>
            <div className="text-[10px] text-[#7f93b5]">{tooltip.name}</div>
            <div className={`mono text-sm font-black ${tooltip.pct >= 0 ? 'text-up' : 'text-down'}`}>
              {tooltip.pct >= 0 ? '+' : ''}{tooltip.pct.toFixed(2)}%
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 h-full content-start">
          {data.map(sector => (
            <div key={sector.name} className="flex-shrink-0" style={{ width: 'calc(33% - 4px)' }}>
              <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider mb-1 px-0.5">{sector.name}</div>
              <div className="flex flex-wrap gap-0.5">
                {sector.stocks.map(stock => (
                  <div
                    key={stock.sym}
                    onMouseEnter={() => setTooltip(stock)}
                    onMouseLeave={() => setTooltip(null)}
                    className="flex flex-col items-center justify-center cursor-default rounded transition-all duration-500 hover:scale-105 hover:z-10"
                    style={{
                      background: pctColor(stock.pct),
                      width: `${Math.max(stock.w * 8, 36)}px`,
                      height: `${Math.max(stock.w * 7, 32)}px`,
                      minWidth: 36,
                    }}
                  >
                    <div className="text-[9px] font-black text-white leading-none">{stock.sym}</div>
                    <div className={`text-[8px] font-semibold mono leading-none mt-0.5 ${stock.pct >= 0 ? 'text-green-200' : 'text-red-200'}`}>
                      {stock.pct >= 0 ? '+' : ''}{stock.pct.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
