'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw } from 'lucide-react'
import type { Position } from '@/store/portfolioStore'
import type { Instrument } from '@/lib/instruments'

type Resolution = '1' | '5' | '15' | '60' | 'D'
const RESOLUTIONS: { label: string; value: Resolution }[] = [
  { label: '1m', value: '1' },
  { label: '5m', value: '5' },
  { label: '15m', value: '15' },
  { label: '1h', value: '60' },
  { label: '1D', value: 'D' },
]

interface Props {
  instrument: Instrument
  currentPrice?: number
  positions?: Position[]
}

export default function TradingChart({ instrument, currentPrice, positions = [] }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const candleRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const volumeRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRefs = useRef<any[]>([])
  const [resolution, setResolution] = useState<Resolution>('1')
  const [loading, setLoading] = useState(true)
  const [ohlcv, setOhlcv] = useState<{ o: number; h: number; l: number; c: number } | null>(null)
  const chartReady = useRef(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(instrument.apiSymbol)}?resolution=${resolution}`)
      const json = await res.json()
      const raw: Array<{ time: string; open?: number; high?: number; low?: number; price: number; volume: number }> = json.chartData || []
      if (!candleRef.current || !volumeRef.current || !raw.length) return

      const now = Math.floor(Date.now() / 1000)
      const stepSecs: Record<Resolution, number> = { '1': 60, '5': 300, '15': 900, '60': 3600, 'D': 86400 }
      const step = stepSecs[resolution]
      const startTime = now - raw.length * step

      const candles = raw.map((d, i) => ({
        time: startTime + i * step,
        open: d.open ?? d.price,
        high: d.high ?? d.price * 1.001,
        low: d.low ?? d.price * 0.999,
        close: d.price,
      }))

      const volumes = raw.map((d, i) => ({
        time: startTime + i * step,
        value: d.volume,
        color: (d.price >= (d.open ?? d.price)) ? 'rgba(0,212,170,0.4)' : 'rgba(255,71,87,0.4)',
      }))

      candleRef.current.setData(candles)
      volumeRef.current.setData(volumes)

      const last = raw[raw.length - 1]
      setOhlcv({ o: last.open ?? last.price, h: last.high ?? last.price, l: last.low ?? last.price, c: last.price })
      chartRef.current?.timeScale().fitContent()
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [instrument.apiSymbol, resolution])

  // Initialize chart using v5 API
  useEffect(() => {
    if (!containerRef.current || chartReady.current) return

    import('lightweight-charts').then((lc) => {
      const { createChart, CandlestickSeries, HistogramSeries } = lc as any

      const chart = createChart(containerRef.current!, {
        layout: {
          background: { color: '#040c14' },
          textColor: '#7f93b5',
          fontSize: 11,
        },
        grid: {
          vertLines: { color: '#0f1f38' },
          horzLines: { color: '#0f1f38' },
        },
        crosshair: { mode: 1 },
        rightPriceScale: {
          borderColor: '#1a2d4a',
          scaleMargins: { top: 0.1, bottom: 0.25 },
        },
        timeScale: {
          borderColor: '#1a2d4a',
          timeVisible: true,
          secondsVisible: false,
        },
        handleScroll: true,
        handleScale: true,
        width: containerRef.current!.clientWidth,
        height: containerRef.current!.clientHeight,
      })

      const candleSeries = chart.addSeries(CandlestickSeries, {
        upColor: '#00d4aa',
        downColor: '#ff4757',
        borderUpColor: '#00d4aa',
        borderDownColor: '#ff4757',
        wickUpColor: '#00d4aa',
        wickDownColor: '#ff4757',
      })

      const volumeSeries = chart.addSeries(HistogramSeries, {
        priceFormat: { type: 'volume' },
        priceScaleId: 'vol',
      })
      chart.priceScale('vol').applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      })

      chartRef.current = chart
      candleRef.current = candleSeries
      volumeRef.current = volumeSeries
      chartReady.current = true

      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      })
      ro.observe(containerRef.current!)

      // Load initial data
      loadData()

      return () => {
        ro.disconnect()
        chart.remove()
        chartReady.current = false
      }
    })
  // Only run once on mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Reload data when instrument or resolution changes (after chart is ready)
  useEffect(() => {
    if (chartReady.current) loadData()
  }, [loadData])

  // Real-time candle update
  useEffect(() => {
    if (!candleRef.current || !currentPrice) return
    const now = Math.floor(Date.now() / 1000)
    try {
      candleRef.current.update({
        time: now,
        open: ohlcv?.o ?? currentPrice,
        high: Math.max(ohlcv?.h ?? currentPrice, currentPrice),
        low: Math.min(ohlcv?.l ?? currentPrice, currentPrice),
        close: currentPrice,
      })
    } catch {}
  }, [currentPrice, ohlcv])

  // Draw SL/TP/entry lines for open positions
  useEffect(() => {
    if (!candleRef.current) return
    import('lightweight-charts').then(() => {
      priceLineRefs.current.forEach(l => { try { candleRef.current?.removePriceLine(l) } catch {} })
      priceLineRefs.current = []

      positions.forEach(pos => {
        const isLong = pos.side === 'long'
        try {
          priceLineRefs.current.push(candleRef.current.createPriceLine({
            price: pos.entryPrice,
            color: isLong ? '#00d4aa' : '#ff4757',
            lineWidth: 1,
            lineStyle: 2, // Dashed
            axisLabelVisible: true,
            title: `${isLong ? '▲ LONG' : '▼ SHORT'} ×${pos.quantity}`,
          }))
          if (pos.stopLoss) {
            priceLineRefs.current.push(candleRef.current.createPriceLine({
              price: pos.stopLoss, color: '#ff4757', lineWidth: 1, lineStyle: 3,
              axisLabelVisible: true, title: 'SL',
            }))
          }
          if (pos.takeProfit) {
            priceLineRefs.current.push(candleRef.current.createPriceLine({
              price: pos.takeProfit, color: '#00d4aa', lineWidth: 1, lineStyle: 3,
              axisLabelVisible: true, title: 'TP',
            }))
          }
        } catch {}
      })
    })
  }, [positions])

  const isUp = (ohlcv?.c ?? 0) >= (ohlcv?.o ?? 0)

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#cdd6f4]">{instrument.symbol}</span>
          <span className="text-[10px] text-[#4a5e7a]">{instrument.name}</span>
        </div>

        {ohlcv && (
          <div className="flex items-center gap-3 ml-1">
            <span className={`mono text-sm font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
              {instrument.type === 'forex' ? ohlcv.c.toFixed(instrument.digits) : `$${ohlcv.c.toFixed(instrument.digits)}`}
            </span>
            {(['O', 'H', 'L'] as const).map(k => (
              <div key={k} className="hidden md:flex items-center gap-1">
                <span className="text-[9px] text-[#4a5e7a]">{k}</span>
                <span className="mono text-[10px] text-[#7f93b5]">
                  {ohlcv[k.toLowerCase() as 'o'|'h'|'l'].toFixed(instrument.digits)}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex ml-auto rounded border border-[#1a2d4a] overflow-hidden">
          {RESOLUTIONS.map(r => (
            <button key={r.value} onClick={() => setResolution(r.value)}
              className={`px-2.5 py-1 text-[10px] font-mono transition-colors ${
                resolution === r.value ? 'bg-[#00d4aa] text-[#040c14] font-bold' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
              }`}>
              {r.label}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
          <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Chart container */}
      <div className="flex-1 relative min-h-0">
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#040c14]/70">
            <div className="w-7 h-7 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div ref={containerRef} className="w-full h-full" />
      </div>
    </div>
  )
}
