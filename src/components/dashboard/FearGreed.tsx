'use client'

import { useMemo } from 'react'

interface Props { value?: number }

function getLabel(v: number) {
  if (v <= 24) return { label: 'Extreme Fear', color: '#ff4757' }
  if (v <= 44) return { label: 'Fear',         color: '#ff7f50' }
  if (v <= 55) return { label: 'Neutral',       color: '#ffa502' }
  if (v <= 74) return { label: 'Greed',         color: '#7ecf4a' }
  return              { label: 'Extreme Greed', color: '#00d4aa' }
}

export default function FearGreed({ value = 61 }: Props) {
  const prev = 54
  const { label, color } = getLabel(value)

  // SVG arc math (semicircle)
  const R = 60
  const cx = 80, cy = 80
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const arcPoint = (deg: number) => ({
    x: cx + R * Math.cos(toRad(deg)),
    y: cy + R * Math.sin(toRad(deg)),
  })

  // -180° to 0° (left to right) mapped to 0–100
  const startDeg = 180
  const endDeg = 0

  const zones = [
    { from: 180, to: 144, color: '#ff4757' },
    { from: 144, to: 108, color: '#ff7f50' },
    { from: 108, to: 90,  color: '#ffa502' },
    { from: 90,  to: 54,  color: '#7ecf4a' },
    { from: 54,  to: 18,  color: '#00d4aa' },
  ]

  const needle = useMemo(() => {
    const deg = 180 - (value / 100) * 180
    const len = 48
    return {
      x2: cx + len * Math.cos(toRad(deg)),
      y2: cy + len * Math.sin(toRad(deg)),
    }
  }, [value])

  const arcPath = (from: number, to: number, r: number) => {
    const s = arcPoint(from)
    const e = arcPoint(to)
    const large = Math.abs(from - to) > 180 ? 1 : 0
    const sweep = from > to ? 1 : 0
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${large} ${sweep} ${e.x} ${e.y}`
  }

  return (
    <div className="flex flex-col items-center bg-[#040c14] rounded-xl border border-[#1a2d4a] p-4">
      <div className="text-[9px] text-[#4a5e7a] uppercase tracking-widest mb-2">Fear &amp; Greed Index</div>
      <svg width={160} height={95} viewBox="0 0 160 95">
        {/* Zone arcs */}
        {zones.map((z, i) => (
          <path key={i} d={arcPath(z.from, z.to, R)} fill="none" stroke={z.color} strokeWidth={10} opacity={0.25} strokeLinecap="round" />
        ))}
        {/* Active fill */}
        <path
          d={arcPath(180, 180 - (value / 100) * 180, R)}
          fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})` }}
        />
        {/* Track */}
        <path d={arcPath(180, 0, R)} fill="none" stroke="#1a2d4a" strokeWidth={2} />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needle.x2} y2={needle.y2} stroke={color} strokeWidth={2} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={4} fill={color} />
        {/* Center value */}
        <text x={cx} y={cy - 12} textAnchor="middle" fill="#cdd6f4" fontSize={18} fontWeight={900} fontFamily="monospace">{value}</text>
      </svg>
      <div className="text-sm font-black mt-1" style={{ color }}>{label}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-[9px] text-[#4a5e7a]">Yesterday:</span>
        <span className={`text-[9px] font-mono font-bold ${prev < value ? 'text-up' : 'text-down'}`}>{prev}</span>
        <span className="text-[9px] text-[#4a5e7a]">({getLabel(prev).label})</span>
      </div>
    </div>
  )
}
