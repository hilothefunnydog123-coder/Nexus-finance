'use client'

import { useState, useEffect } from 'react'
import { BarChart2, RefreshCw } from 'lucide-react'

interface Fundamentals {
  pe: number | null; eps: number | null; marketCap: number | null
  week52High: number | null; week52Low: number | null; dividendYield: number | null
  beta: number | null; revenueGrowth: number | null; pbRatio: number | null
  roe: number | null; debtEquity: number | null; name: string
  industry: string; exchange: string; description: string
}

function fmt(v: number | null, suffix = '', digits = 2) {
  if (v === null) return '—'
  return v.toFixed(digits) + suffix
}
function fmtCap(v: number | null) {
  if (!v) return '—'
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(2)}T`
  if (v >= 1_000) return `$${(v / 1_000).toFixed(1)}B`
  return `$${v.toFixed(0)}M`
}

export default function FundamentalsPanel({ symbol }: { symbol: string }) {
  const [data, setData] = useState<Fundamentals | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/fundamentals/${symbol}`)
      const json = await res.json()
      setData(json.fundamentals)
      setIsDemo(json.demo)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [symbol])

  const stats = data ? [
    { label: 'P/E Ratio',      value: fmt(data.pe) },
    { label: 'EPS (TTM)',      value: fmt(data.eps, '', 2) ? `$${fmt(data.eps)}` : '—' },
    { label: 'Market Cap',     value: fmtCap(data.marketCap) },
    { label: '52W High',       value: data.week52High ? `$${data.week52High.toFixed(2)}` : '—' },
    { label: '52W Low',        value: data.week52Low ? `$${data.week52Low.toFixed(2)}` : '—' },
    { label: 'Div Yield',      value: fmt(data.dividendYield, '%') },
    { label: 'Beta',           value: fmt(data.beta) },
    { label: 'Rev Growth',     value: fmt(data.revenueGrowth, '%', 1) },
    { label: 'P/B Ratio',      value: fmt(data.pbRatio) },
    { label: 'ROE',            value: fmt(data.roe, '%', 1) },
  ] : []

  return (
    <div className="flex flex-col h-full bg-[#071220]">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <BarChart2 size={11} className="text-[#1e90ff]" />
          <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-widest">Fundamentals</span>
          {isDemo && <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>}
          {!isDemo && <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE</span>}
        </div>
        <button onClick={load} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
          <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-4 h-4 border-2 border-[#1e90ff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center flex-1 text-[11px] text-[#4a5e7a]">No fundamental data</div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-3">
            <div className="text-xs font-bold text-[#cdd6f4]">{data.name}</div>
            <div className="text-[10px] text-[#4a5e7a]">{data.industry} · {data.exchange}</div>
          </div>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {stats.map(({ label, value }) => (
              <div key={label} className="bg-[#040c14] rounded px-2 py-1.5 border border-[#1a2d4a]">
                <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider">{label}</div>
                <div className="mono text-xs font-bold text-[#cdd6f4]">{value}</div>
              </div>
            ))}
          </div>
          {data.description && (
            <p className="text-[9px] text-[#4a5e7a] leading-relaxed border-t border-[#1a2d4a] pt-2">{data.description.slice(0, 200)}...</p>
          )}
        </div>
      )}
    </div>
  )
}
