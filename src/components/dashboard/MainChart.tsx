'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, BarChart, Bar,
} from 'recharts'
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react'
import type { ChartDataPoint, Quote } from '@/lib/types'

interface Props {
  symbol: string
  quote?: Quote
}

const RANGES = ['1D', '1W', '1M', '3M', '1Y'] as const
type Range = typeof RANGES[number]

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  const price = payload[0]?.value
  return (
    <div className="bg-[#0a1628] border border-[#1e3a5f] rounded px-3 py-2 shadow-xl">
      <div className="text-[10px] text-[#7f93b5] mb-1">{label}</div>
      <div className="mono text-sm font-semibold text-[#00d4aa]">${price?.toFixed(2)}</div>
    </div>
  )
}

export default function MainChart({ symbol, quote }: Props) {
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [range, setRange] = useState<Range>('1D')
  const [loading, setLoading] = useState(true)
  const isUp = (quote?.changePercent ?? 0) >= 0

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quote/${symbol}`)
      const json = await res.json()
      setChartData(json.chartData || [])
    } catch {
      setChartData([])
    } finally {
      setLoading(false)
    }
  }, [symbol])

  useEffect(() => { fetchData() }, [fetchData])

  const color = isUp ? '#00d4aa' : '#ff4757'
  const gradientId = `grad-${symbol}`

  const displayData = range === '1D' ? chartData : chartData.filter((_, i) => {
    const step = Math.ceil(chartData.length / (range === '1W' ? 7 * 78 : range === '1M' ? 30 * 26 : range === '3M' ? 90 * 9 : 390))
    return i % Math.max(step, 1) === 0
  })

  return (
    <div className="flex flex-col h-full bg-[#071220]">
      {/* Chart header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a2d4a] bg-[#0a1628]">
        <div className="flex items-center gap-4">
          <div>
            <span className="text-base font-bold text-[#cdd6f4]">{symbol}</span>
            {quote && (
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`mono text-xl font-semibold ${isUp ? 'text-up glow-green' : 'text-down glow-red'}`}>
                  ${quote.price.toFixed(2)}
                </span>
                <div className={`flex items-center gap-1 text-sm mono ${isUp ? 'text-up' : 'text-down'}`}>
                  {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  <span>{isUp ? '+' : ''}{quote.change.toFixed(2)}</span>
                  <span>({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)</span>
                </div>
              </div>
            )}
          </div>

          {/* OHLV stats */}
          {quote && (
            <div className="flex gap-4 ml-4">
              {[
                { label: 'O', value: quote.open.toFixed(2) },
                { label: 'H', value: quote.high.toFixed(2) },
                { label: 'L', value: quote.low.toFixed(2) },
                { label: 'PC', value: quote.previousClose.toFixed(2) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div className="text-[9px] text-[#4a5e7a] uppercase">{label}</div>
                  <div className="mono text-xs text-[#7f93b5]">${value}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Range selector */}
          <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
            {RANGES.map(r => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 text-[10px] font-mono uppercase tracking-wider transition-colors ${
                  range === r
                    ? 'bg-[#00d4aa] text-[#040c14] font-bold'
                    : 'text-[#7f93b5] hover:bg-[#0f1f38] hover:text-[#cdd6f4]'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
          <button
            onClick={fetchData}
            className="p-1 text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Chart area */}
      <div className="flex-1 flex flex-col min-h-0 p-2 chart-container">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-[#4a5e7a] mono">Fetching {symbol} data...</span>
            </div>
          </div>
        ) : (
          <>
            {/* Price chart */}
            <div style={{ flex: 3 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={displayData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="1 3"
                    stroke="#1a2d4a"
                    horizontal={true}
                    vertical={false}
                  />
                  <XAxis
                    dataKey="time"
                    tick={{ fill: '#4a5e7a', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={{ stroke: '#1a2d4a' }}
                    interval="preserveStartEnd"
                    tickCount={6}
                  />
                  <YAxis
                    domain={['auto', 'auto']}
                    tick={{ fill: '#4a5e7a', fontSize: 9, fontFamily: 'monospace' }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={v => `$${v.toFixed(0)}`}
                    width={48}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#1e3a5f', strokeWidth: 1 }} />
                  {quote && (
                    <ReferenceLine
                      y={quote.previousClose}
                      stroke="#4a5e7a"
                      strokeDasharray="3 3"
                      strokeWidth={1}
                    />
                  )}
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={color}
                    strokeWidth={1.5}
                    fill={`url(#${gradientId})`}
                    dot={false}
                    activeDot={{ r: 3, fill: color, stroke: '#040c14', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Volume bars */}
            <div style={{ flex: 1 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={displayData} margin={{ top: 0, right: 8, left: 0, bottom: 0 }}>
                  <XAxis dataKey="time" hide />
                  <YAxis hide domain={[0, 'auto']} />
                  <Bar
                    dataKey="volume"
                    fill={color}
                    opacity={0.35}
                    radius={[1, 1, 0, 0]}
                    maxBarSize={6}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
