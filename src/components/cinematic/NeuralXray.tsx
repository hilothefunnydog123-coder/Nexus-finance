'use client'

/**
 * Neural X-Ray — renders the network's REAL forward pass on a ticker.
 * Given the actual per-layer activations, every neuron glows by how hard it
 * fired, signal "flows" left→right, the 11 inputs are the real named features,
 * and the output neuron is the prediction. Not decoration — the live computation.
 */

import { useState } from 'react'

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const FAINT = '#46566e'
const MUTED = '#8a93a8'

const LAYER_LABELS = ['INPUT · features', 'HIDDEN', 'HIDDEN', 'OUTPUT']

export default function NeuralXray({
  activations,
  features,
  featureNames,
  predicted,
  trained,
}: {
  activations: number[][] | null
  features: number[] | null
  featureNames: string[]
  predicted: number | null // output log-return (sign = direction)
  trained: boolean
}) {
  const [hover, setHover] = useState<string | null>(null)

  // Build layer sizes/values. If we have a full trace use it; else just the inputs.
  const layers: number[][] = activations ?? (features ? [features, ...[16, 12, 1].map((n) => new Array(n).fill(0))] : [])
  if (!layers.length) return null

  const W = 920, H = 360, padX = 70, padY = 30
  const cols = layers.length
  // normalize |activation| per layer → 0..1 glow
  const norm = layers.map((layer) => {
    const max = Math.max(...layer.map((v) => Math.abs(v)), 1e-6)
    return layer.map((v) => Math.min(1, Math.abs(v) / max))
  })

  type N = { id: string; x: number; y: number; l: number; i: number; g: number }
  const nodes: N[] = []
  layers.forEach((layer, l) => {
    const x = padX + (l * (W - padX * 2)) / (cols - 1)
    const count = layer.length
    const gap = (H - padY * 2) / Math.max(count - 1, 1)
    for (let i = 0; i < count; i++) {
      const y = count === 1 ? H / 2 : padY + i * gap
      nodes.push({ id: `${l}-${i}`, x, y, l, i, g: norm[l][i] })
    }
  })
  const nodeAt = (l: number, i: number) => nodes.find((n) => n.l === l && n.i === i)!

  const edges: { a: N; b: N; key: string }[] = []
  for (let l = 0; l < cols - 1; l++) {
    const A = nodes.filter((n) => n.l === l)
    const B = nodes.filter((n) => n.l === l + 1)
    A.forEach((a) => B.forEach((b) => edges.push({ a, b, key: `${a.id}>${b.id}` })))
  }

  const dir = predicted == null ? null : predicted >= 0 ? 'up' : 'down'
  const pct = predicted == null ? null : (Math.exp(predicted) - 1) * 100

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Neural network forward pass">
        <defs>
          <radialGradient id="xr-node"><stop offset="0%" stopColor="#d7faff" /><stop offset="55%" stopColor={CYAN} /><stop offset="100%" stopColor="#0e7490" /></radialGradient>
          <radialGradient id="xr-out"><stop offset="0%" stopColor="#ede9fe" /><stop offset="55%" stopColor={VIOLET} /><stop offset="100%" stopColor="#6d28d9" /></radialGradient>
          <filter id="xr-glow" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="2.4" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <style>{`@keyframes xr-flow{to{stroke-dashoffset:-14}} .xr-edge{stroke-dasharray:2 6;animation:xr-flow 1.1s linear infinite}
            @keyframes xr-breathe{0%,100%{opacity:.85}50%{opacity:1}}`}</style>
        </defs>

        {/* column labels */}
        {layers.map((_, l) => {
          const x = padX + (l * (W - padX * 2)) / (cols - 1)
          return <text key={l} x={x} y={14} textAnchor="middle" fontSize="9" fill={FAINT} fontFamily="var(--font-mono)" letterSpacing="1.5">{LAYER_LABELS[l] ?? 'HIDDEN'}</text>
        })}

        {/* edges — flow intensity by the firing of the source node */}
        {edges.map((e) => {
          const hot = hover && (e.a.id === hover || e.b.id === hover)
          const intensity = 0.05 + e.a.g * 0.5
          return (
            <line key={e.key} className={trained ? 'xr-edge' : undefined} x1={e.a.x} y1={e.a.y} x2={e.b.x} y2={e.b.y}
              stroke={hot ? CYAN : `rgba(120,170,210,${hot ? 0.9 : intensity})`} strokeWidth={hot ? 1.4 : 0.7} />
          )
        })}

        {/* nodes — radius & glow by real activation */}
        {nodes.map((n) => {
          const out = n.l === cols - 1
          const r = 4 + n.g * 5
          const isHot = hover === n.id
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={r + (isHot ? 3 : 0)} fill={out ? 'url(#xr-out)' : 'url(#xr-node)'} opacity={0.35 + n.g * 0.65} filter="url(#xr-glow)" style={{ animation: trained ? `xr-breathe ${2 + (n.i % 5) * 0.2}s ease-in-out infinite` : undefined }} />
              <circle cx={n.x} cy={n.y} r={r + 4} fill="none" stroke={out ? VIOLET : CYAN} strokeOpacity={isHot ? 0.6 : 0.12} strokeWidth={1} />
            </g>
          )
        })}

        {/* input feature labels */}
        {featureNames.map((name, i) => {
          const n = nodeAt(0, i)
          if (!n) return null
          const v = layers[0][i]
          return (
            <text key={name} x={n.x - 12} y={n.y + 3} textAnchor="end" fontSize="9.5" fill={hover === n.id ? CYAN : MUTED} fontFamily="var(--font-mono)">
              {name} <tspan fill={FAINT}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</tspan>
            </text>
          )
        })}

        {/* output readout */}
        {dir && (
          <text x={W - padX + 14} y={H / 2 + 4} fontSize="13" fontWeight="800" fill={dir === 'up' ? GREEN : '#f87171'} fontFamily="var(--font-mono)">
            {dir === 'up' ? '▲' : '▼'} {pct! >= 0 ? '+' : ''}{pct!.toFixed(2)}%
          </text>
        )}
      </svg>
    </div>
  )
}
