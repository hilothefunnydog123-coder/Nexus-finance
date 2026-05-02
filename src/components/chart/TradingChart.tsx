'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react'
import { calcEMA, calcRSI, calcBollingerBands } from '@/lib/indicators'
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

interface Candle { time: number; open: number; high: number; low: number; close: number; volume: number }

interface Props {
  instrument: Instrument
  currentPrice?: number
  positions?: Position[]
}

interface Indicators { ema20: boolean; ema50: boolean; ema200: boolean; bb: boolean; rsi: boolean }

export default function TradingChart({ instrument, currentPrice, positions = [] }: Props) {
  const mainRef = useRef<HTMLDivElement>(null)
  const rsiRef = useRef<HTMLDivElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chartRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rsiChartRef = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const seriesRefs = useRef<Record<string, any>>({})
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const priceLineRefs = useRef<any[]>([])
  const candlesRef = useRef<Candle[]>([])
  const [resolution, setResolution] = useState<Resolution>('5')
  const [loading, setLoading] = useState(true)
  const [ohlcv, setOhlcv] = useState<{ o: number; h: number; l: number; c: number; v: number } | null>(null)
  const [indicators, setIndicators] = useState<Indicators>({ ema20: true, ema50: false, ema200: false, bb: false, rsi: true })
  const chartsReady = useRef(false)

  const toggleIndicator = (key: keyof Indicators) =>
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }))

  const applyIndicators = useCallback((candles: Candle[]) => {
    const s = seriesRefs.current
    const closes = candles.map(c => c.close)
    const times = candles.map(c => c.time)

    const toSeries = (vals: (number | null)[], key: string) => {
      if (!s[key]) return
      s[key].setData(
        vals.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean)
      )
    }

    toSeries(indicators.ema20 ? calcEMA(closes, 20) : [], 'ema20')
    toSeries(indicators.ema50 ? calcEMA(closes, 50) : [], 'ema50')
    toSeries(indicators.ema200 ? calcEMA(closes, 200) : [], 'ema200')

    if (indicators.bb) {
      const { upper, mid, lower } = calcBollingerBands(closes)
      toSeries(upper, 'bbUpper')
      toSeries(mid, 'bbMid')
      toSeries(lower, 'bbLower')
    } else {
      ['bbUpper', 'bbMid', 'bbLower'].forEach(k => s[k]?.setData([]))
    }

    // RSI chart
    if (rsiChartRef.current && s.rsi) {
      if (indicators.rsi) {
        const rsiVals = calcRSI(closes)
        s.rsi.setData(rsiVals.map((v, i) => v !== null ? { time: times[i], value: v } : null).filter(Boolean))
        s.rsiOB?.setData([{ time: times[0], value: 70 }, { time: times[times.length - 1], value: 70 }])
        s.rsiOS?.setData([{ time: times[0], value: 30 }, { time: times[times.length - 1], value: 30 }])
      } else {
        s.rsi.setData([])
      }
    }
  }, [indicators])

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/quote/${encodeURIComponent(instrument.apiSymbol)}?resolution=${resolution}`)
      const json = await res.json()
      const raw: Array<{ time: string; open?: number; high?: number; low?: number; price: number; volume: number }> = json.chartData || []
      if (!seriesRefs.current.candle || !raw.length) return

      const now = Math.floor(Date.now() / 1000)
      const stepSecs: Record<Resolution, number> = { '1': 60, '5': 300, '15': 900, '60': 3600, 'D': 86400 }
      const step = stepSecs[resolution]
      const startTime = now - raw.length * step

      const candles: Candle[] = raw.map((d, i) => ({
        time: startTime + i * step,
        open: d.open ?? d.price,
        high: d.high ?? d.price * 1.001,
        low: d.low ?? d.price * 0.999,
        close: d.price,
        volume: d.volume,
      }))
      candlesRef.current = candles

      seriesRefs.current.candle.setData(candles)
      seriesRefs.current.volume?.setData(candles.map(c => ({
        time: c.time,
        value: c.volume,
        color: c.close >= c.open ? 'rgba(0,212,170,0.35)' : 'rgba(255,71,87,0.35)',
      })))

      applyIndicators(candles)
      chartRef.current?.timeScale().fitContent()

      const last = candles[candles.length - 1]
      setOhlcv({ o: last.open, h: last.high, l: last.low, c: last.close, v: last.volume })
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [instrument.apiSymbol, resolution, applyIndicators])

  // Re-apply indicators when toggles change
  useEffect(() => {
    if (candlesRef.current.length) applyIndicators(candlesRef.current)
  }, [indicators, applyIndicators])

  // Init charts
  useEffect(() => {
    if (!mainRef.current || !rsiRef.current || chartsReady.current) return

    import('lightweight-charts').then((lc) => {
      const { createChart, CandlestickSeries, HistogramSeries, LineSeries, AreaSeries } = lc as any

      const commonTheme = {
        layout: { background: { color: '#040c14' }, textColor: '#7f93b5', fontSize: 11 },
        grid: { vertLines: { color: '#0a1628' }, horzLines: { color: '#0a1628' } },
        rightPriceScale: { borderColor: '#1a2d4a' },
        timeScale: { borderColor: '#1a2d4a', timeVisible: true, secondsVisible: false },
        handleScroll: true,
        handleScale: true,
      }

      // Main chart
      const chart = createChart(mainRef.current!, {
        ...commonTheme,
        rightPriceScale: { ...commonTheme.rightPriceScale, scaleMargins: { top: 0.08, bottom: 0.22 } },
        width: mainRef.current!.clientWidth,
        height: mainRef.current!.clientHeight,
      })

      const candle = chart.addSeries(CandlestickSeries, {
        upColor: '#00d4aa', downColor: '#ff4757',
        borderUpColor: '#00d4aa', borderDownColor: '#ff4757',
        wickUpColor: '#00d4aa', wickDownColor: '#ff4757',
      })
      const volume = chart.addSeries(HistogramSeries, { priceFormat: { type: 'volume' }, priceScaleId: 'vol' })
      chart.priceScale('vol').applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } })

      // EMA lines
      const ema20s = chart.addSeries(LineSeries, { color: '#ffa502', lineWidth: 1, title: 'EMA 20', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const ema50s = chart.addSeries(LineSeries, { color: '#1e90ff', lineWidth: 1, title: 'EMA 50', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const ema200s = chart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'EMA 200', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const bbUp = chart.addSeries(LineSeries, { color: 'rgba(30,144,255,0.4)', lineWidth: 1, title: '', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const bbMid = chart.addSeries(LineSeries, { color: 'rgba(30,144,255,0.6)', lineWidth: 1, lineStyle: 2, title: 'BB', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const bbLow = chart.addSeries(LineSeries, { color: 'rgba(30,144,255,0.4)', lineWidth: 1, title: '', lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })

      // RSI chart
      const rsiChart = createChart(rsiRef.current!, {
        ...commonTheme,
        rightPriceScale: { ...commonTheme.rightPriceScale, scaleMargins: { top: 0.1, bottom: 0.1 } },
        timeScale: { ...commonTheme.timeScale, visible: false },
        width: rsiRef.current!.clientWidth,
        height: rsiRef.current!.clientHeight,
        crosshair: { vertLine: { visible: true }, horzLine: { visible: true } },
      })
      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#a855f7', lineWidth: 1, title: 'RSI 14', lastValueVisible: true, priceLineVisible: false })
      const rsiOBSeries = rsiChart.addSeries(LineSeries, { color: 'rgba(255,71,87,0.3)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })
      const rsiOSSeries = rsiChart.addSeries(LineSeries, { color: 'rgba(0,212,170,0.3)', lineWidth: 1, lineStyle: 2, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false })

      // Sync RSI crosshair
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      chart.timeScale().subscribeVisibleTimeRangeChange((range: any) => {
        if (range) rsiChart.timeScale().setVisibleRange(range)
      })

      seriesRefs.current = {
        candle, volume, ema20: ema20s, ema50: ema50s, ema200: ema200s,
        bbUpper: bbUp, bbMid, bbLower: bbLow,
        rsi: rsiSeries, rsiOB: rsiOBSeries, rsiOS: rsiOSSeries,
      }
      chartRef.current = chart
      rsiChartRef.current = rsiChart
      chartsReady.current = true

      const ro = new ResizeObserver(() => {
        if (mainRef.current) chart.applyOptions({ width: mainRef.current.clientWidth, height: mainRef.current.clientHeight })
        if (rsiRef.current) rsiChart.applyOptions({ width: rsiRef.current.clientWidth, height: rsiRef.current.clientHeight })
      })
      if (mainRef.current) ro.observe(mainRef.current)
      if (rsiRef.current) ro.observe(rsiRef.current)

      loadData()
      return () => { ro.disconnect(); chart.remove(); rsiChart.remove(); chartsReady.current = false }
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { if (chartsReady.current) loadData() }, [loadData])

  // Live candle update
  useEffect(() => {
    if (!seriesRefs.current.candle || !currentPrice) return
    const now = Math.floor(Date.now() / 1000)
    try {
      const last = candlesRef.current[candlesRef.current.length - 1]
      seriesRefs.current.candle.update({
        time: now,
        open: last?.open ?? currentPrice,
        high: Math.max(last?.high ?? currentPrice, currentPrice),
        low: Math.min(last?.low ?? currentPrice, currentPrice),
        close: currentPrice,
      })
      setOhlcv(prev => prev ? { ...prev, c: currentPrice, h: Math.max(prev.h, currentPrice), l: Math.min(prev.l, currentPrice) } : null)
    } catch {}
  }, [currentPrice])

  // Position price lines
  useEffect(() => {
    if (!seriesRefs.current.candle) return
    priceLineRefs.current.forEach(l => { try { seriesRefs.current.candle.removePriceLine(l) } catch {} })
    priceLineRefs.current = []
    positions.forEach(pos => {
      try {
        const isLong = pos.side === 'long'
        priceLineRefs.current.push(seriesRefs.current.candle.createPriceLine({ price: pos.entryPrice, color: isLong ? '#00d4aa' : '#ff4757', lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: `${isLong ? '▲' : '▼'} ${pos.quantity}` }))
        if (pos.stopLoss) priceLineRefs.current.push(seriesRefs.current.candle.createPriceLine({ price: pos.stopLoss, color: '#ff4757', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: 'SL' }))
        if (pos.takeProfit) priceLineRefs.current.push(seriesRefs.current.candle.createPriceLine({ price: pos.takeProfit, color: '#00d4aa', lineWidth: 1, lineStyle: 3, axisLabelVisible: true, title: 'TP' }))
      } catch {}
    })
  }, [positions])

  const isUp = (ohlcv?.c ?? 0) >= (ohlcv?.o ?? 0)
  const changeAmt = ohlcv ? ohlcv.c - ohlcv.o : 0
  const changePct = ohlcv ? ((ohlcv.c - ohlcv.o) / ohlcv.o) * 100 : 0

  const INDICATOR_BTNS: { key: keyof Indicators; label: string; color: string }[] = [
    { key: 'ema20',  label: 'EMA 20',  color: '#ffa502' },
    { key: 'ema50',  label: 'EMA 50',  color: '#1e90ff' },
    { key: 'ema200', label: 'EMA 200', color: '#a855f7' },
    { key: 'bb',     label: 'BB',      color: '#1e90ff' },
    { key: 'rsi',    label: 'RSI',     color: '#a855f7' },
  ]

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1a2d4a] bg-[#071220] shrink-0 flex-wrap">
        {/* Symbol + OHLC */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-[#cdd6f4]">{instrument.symbol}</span>
          {ohlcv && (
            <>
              <span className={`mono text-base font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                {instrument.type === 'forex' ? ohlcv.c.toFixed(instrument.digits) : `$${ohlcv.c.toFixed(instrument.digits)}`}
              </span>
              <span className={`mono text-xs ${isUp ? 'text-up' : 'text-down'}`}>
                {isUp ? '+' : ''}{changeAmt.toFixed(instrument.digits)} ({isUp ? '+' : ''}{changePct.toFixed(2)}%)
              </span>
              <div className="hidden lg:flex items-center gap-2 text-[10px]">
                {(['O','H','L'] as const).map(k => (
                  <span key={k} className="text-[#4a5e7a]">
                    {k} <span className="mono text-[#7f93b5]">{ohlcv[k.toLowerCase() as 'o'|'h'|'l'].toFixed(instrument.digits)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Indicator toggles */}
        <div className="flex items-center gap-1 ml-auto">
          {INDICATOR_BTNS.map(btn => (
            <button
              key={btn.key}
              onClick={() => toggleIndicator(btn.key)}
              className={`px-2 py-0.5 text-[10px] rounded border transition-colors font-mono ${
                indicators[btn.key]
                  ? 'border-transparent text-[#040c14] font-bold'
                  : 'border-[#1a2d4a] text-[#4a5e7a] hover:border-[#1e3a5f]'
              }`}
              style={indicators[btn.key] ? { background: btn.color } : {}}
            >
              {btn.label}
            </button>
          ))}
        </div>

        {/* Resolution */}
        <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
          {RESOLUTIONS.map(r => (
            <button key={r.value} onClick={() => setResolution(r.value)}
              className={`px-2 py-1 text-[10px] font-mono transition-colors ${
                resolution === r.value ? 'bg-[#00d4aa] text-[#040c14] font-bold' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
              }`}>{r.label}
            </button>
          ))}
        </div>
        <button onClick={loadData} className="text-[#4a5e7a] hover:text-[#cdd6f4] ml-1">
          <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Main chart */}
      <div className="relative min-h-0" style={{ flex: indicators.rsi ? '0 0 72%' : '1' }}>
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-10 bg-[#040c14]/80">
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
              <span className="text-[10px] text-[#4a5e7a] mono">Loading {instrument.symbol}...</span>
            </div>
          </div>
        )}
        <div ref={mainRef} className="w-full h-full" />
      </div>

      {/* RSI pane */}
      {indicators.rsi && (
        <div className="border-t border-[#1a2d4a] relative min-h-0" style={{ flex: '0 0 28%' }}>
          <div className="absolute top-1 left-2 z-10 text-[9px] text-[#a855f7] font-mono uppercase tracking-wider">RSI 14</div>
          <div ref={rsiRef} className="w-full h-full" />
        </div>
      )}
    </div>
  )
}
