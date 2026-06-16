'use client'

import { useEffect, useRef } from 'react'
import {
  createChart,
  AreaSeries,
  ColorType,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from 'lightweight-charts'

// A small Lightweight-Charts price chart that re-loads whenever the ticker changes.
export function PredictChart({ ticker }: { ticker: string }) {
  const elRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Area'> | null>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return
    const chart = createChart(el, {
      autoSize: true,
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: '#8a93a8',
        fontFamily: 'Inter, system-ui, sans-serif',
        attributionLogo: false,
      },
      grid: { vertLines: { color: 'rgba(255,255,255,.04)' }, horzLines: { color: 'rgba(255,255,255,.04)' } },
      rightPriceScale: { borderColor: 'rgba(255,255,255,.08)' },
      timeScale: { borderColor: 'rgba(255,255,255,.08)', fixLeftEdge: true, fixRightEdge: true },
      crosshair: { vertLine: { labelVisible: false }, horzLine: { labelVisible: false } },
      handleScroll: false,
      handleScale: false,
    })
    const series = chart.addSeries(AreaSeries, {
      lineColor: '#22d3ee',
      topColor: 'rgba(34,211,238,.4)',
      bottomColor: 'rgba(34,211,238,0)',
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    })
    chartRef.current = chart
    seriesRef.current = series
    return () => {
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  useEffect(() => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    let alive = true
    const id = setTimeout(() => {
      fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t, horizon: 1 }),
      })
        .then((r) => r.json())
        .then((j) => {
          const s = seriesRef.current
          if (!alive || !s || !j.history?.length) return
          const data = j.history.map((p: { date: string; price: number }) => ({ time: p.date as Time, value: p.price }))
          s.setData(data)
          const up = data[data.length - 1].value >= data[0].value
          s.applyOptions({
            lineColor: up ? '#34d399' : '#f87171',
            topColor: up ? 'rgba(52,211,153,.38)' : 'rgba(248,113,113,.38)',
            bottomColor: up ? 'rgba(52,211,153,0)' : 'rgba(248,113,113,0)',
          })
          chartRef.current?.timeScale().fitContent()
        })
        .catch(() => {})
    }, 450)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [ticker])

  return <div ref={elRef} style={{ width: '100%', height: 200 }} />
}
