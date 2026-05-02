'use client'

import { useMemo } from 'react'
import type { Quote } from '@/lib/types'

interface Props { quotes: Record<string, Quote> }

function calcScore(quotes: Record<string, Quote>): number {
  const spy = quotes['SPY']
  const qqq = quotes['QQQ']
  const nvda = quotes['NVDA']
  const meta = quotes['META']
  const tsla = quotes['TSLA']
  if (!spy) return 50

  let score = 50
  // SPY day change is the dominant signal
  score += (spy.changePercent || 0) * 8
  if (qqq)  score += (qqq.changePercent || 0) * 4
  if (nvda) score += (nvda.changePercent || 0) * 2
  if (meta) score += (meta.changePercent || 0) * 1.5
  // Fear signal: tech weakness + broad market down
  if (tsla && tsla.changePercent < -2) score -= 5
  // Intraday direction
  if (spy.price > spy.open) score += 4
  if (spy.price < spy.open) score -= 4

  return Math.min(100, Math.max(0, Math.round(score)))
}

function getZone(v: number) {
  if (v <= 24) return { label: 'Extreme Fear', color: '#ff4757' }
  if (v <= 44) return { label: 'Fear',          color: '#ff7f50' }
  if (v <= 55) return { label: 'Neutral',        color: '#ffa502' }
  if (v <= 74) return { label: 'Greed',          color: '#7ecf4a' }
  return              { label: 'Extreme Greed',  color: '#00d4aa' }
}

export default function FearGreed({ quotes }: Props) {
  const value = useMemo(() => calcScore(quotes), [quotes])
  const { label, color } = getZone(value)
  const hasData = Object.keys(quotes).length > 0

  const R = 60, cx = 80, cy = 80
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcPoint = (deg: number) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy + R * Math.sin(toRad(deg)),
  })
  const zones = [
    { from: 180, to: 144, color: '#ff4757' },
    { from: 144, to: 108, color: '#ff7f50' },
    { from: 108, to: 90,  color: '#ffa502' },
    { from: 90,  to: 54,  color: '#7ecf4a' },
    { from: 54,  to: 18,  color: '#00d4aa' },
  ]
  const needle = useMemo(() => {
    const deg = 180 - (value / 100) * 180
    return { x2: cx + 48 * Math.cos(toRad(deg)), y2: cy + 48 * Math.sin(toRad(deg)) }
  }, [value])

  const arcPath = (from: number, to: number, r: number) => {
    const s = arcPoint(from), e = arcPoint(to)
    const large = Math.abs(from - to) > 180 ? 1 : 0
    const sweep = from > to ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`
  }

  return (
    <div className="flex flex-col items-center bg-[#040c14] rounded-xl border border-[#1a2d4a] p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[9px] text-[#4a5e7a] uppercase tracking-widest">Fear &amp; Greed Index</span>
        {hasData
          ? <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE CALC</span>
          : <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">LOADING</span>}
      </div>
      <svg width={160} height={90} viewBox="0 0 160 90">
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.from, z.to, R)} fill="none" stroke={z.color} strokeWidth={10} opacity={0.2} strokeLinecap="round" />
        ))}
        <path d={arcPath(180, 180 - (value / 100) * 180, R)} fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }} />
        <path d={arcPath(180, 0, R)} fill="none" stroke="#1a2d4a" strokeWidth={2} />
        <line x1={cx} y1={cy} x2={needle.x2} y2={needle.y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={color} />
        <text x={cx} y={cy - 10} textAnchor="middle" fill="#cdd6f4" fontSize={20} fontWeight={900} fontFamily="monospace">{value}</text>
      </svg>
      <div className="text-sm font-black" style={{ color }}>{label}</div>
      <div className="text-[9px] text-[#4a5e7a] mt-1 text-center max-w-[140px] leading-relaxed">
        Calculated from live SPY, QQQ, NVDA momentum
      </div>
    </div>
  )
}
