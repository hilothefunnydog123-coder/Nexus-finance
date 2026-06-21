'use client'

/**
 * BrainNetwork — an actual brain silhouette (top-down, two hemispheres) drawn in
 * SVG. The gyri (folds) double as neural pathways: glowing lines with signal that
 * flows along them. Nodes sit at the junctions and fire green/red at the model's
 * real accuracy. The whole organ breathes. Cinematic, GPU-cheap (CSS + light JS).
 */

import { useEffect, useState } from 'react'

const CYAN = '#22d3ee', VIOLET = '#a78bfa', GREEN = '#34d399', RED = '#f87171'

// recognizable top-down brain outline (two lobes, frontal narrower)
const OUTLINE =
  'M300 38 C 392 38 452 78 478 132 C 520 120 556 150 556 200 C 590 214 596 268 562 296 C 590 324 580 380 540 392 C 548 440 506 480 452 482 C 430 510 372 516 340 496 C 316 512 284 512 260 496 C 228 516 170 510 148 482 C 94 480 52 440 60 392 C 20 380 10 324 38 296 C 4 268 10 214 44 200 C 44 150 80 120 122 132 C 148 78 208 38 300 38 Z'
const FISSURE = 'M300 70 C 290 180 312 360 300 486'

// gyri folds per hemisphere — also the neural pathways that signal flows along
const GYRI = [
  'M300 110 C 360 96 414 112 452 156',
  'M300 150 C 372 138 432 158 480 206',
  'M300 196 C 384 188 446 214 504 250',
  'M300 246 C 380 244 448 270 498 312',
  'M300 296 C 372 300 438 326 478 366',
  'M300 344 C 360 354 420 376 452 414',
  'M300 392 C 352 408 404 426 430 456',
  // left hemisphere (mirror)
  'M300 110 C 240 96 186 112 148 156',
  'M300 150 C 228 138 168 158 120 206',
  'M300 196 C 216 188 154 214 96 250',
  'M300 246 C 220 244 152 270 102 312',
  'M300 296 C 228 300 162 326 122 366',
  'M300 344 C 240 354 180 376 148 414',
  'M300 392 C 248 408 196 426 170 456',
]

// nodes at fold junctions (x,y), both hemispheres
const NODES: [number, number][] = [
  [452, 156], [480, 206], [504, 250], [498, 312], [478, 366], [452, 414], [430, 456],
  [400, 130], [430, 250], [440, 330], [410, 410],
  [148, 156], [120, 206], [96, 250], [102, 312], [122, 366], [148, 414], [170, 456],
  [200, 130], [160, 250], [160, 330], [190, 410],
  [300, 130], [300, 230], [300, 330], [300, 430],
]
// a few cross-connections (the "network")
const LINKS: [number, number][] = [
  [22, 0], [22, 11], [0, 1], [1, 2], [11, 12], [12, 13], [23, 8], [23, 19], [24, 9], [24, 20], [25, 6], [25, 17], [8, 9], [19, 20],
]

export default function BrainNetwork({ accuracy = 0.55 }: { accuracy?: number }) {
  const [lit, setLit] = useState<{ i: number; c: string; t: number }[]>([])
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      const now = Date.now()
      setLit((prev) => [
        ...prev.filter((l) => now - l.t < 1100),
        { i: Math.floor(Math.random() * NODES.length), c: Math.random() < accuracy ? GREEN : RED, t: now },
      ].slice(-8))
    }, 230)
    return () => clearInterval(id)
  }, [accuracy])

  return (
    <svg viewBox="0 0 600 560" style={{ width: '100%', height: '100%', overflow: 'visible' }} role="img" aria-label="Neural network brain">
      <defs>
        <linearGradient id="bn-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor={CYAN} /><stop offset="100%" stopColor={VIOLET} /></linearGradient>
        <radialGradient id="bn-node"><stop offset="0%" stopColor="#e6fbff" /><stop offset="55%" stopColor={CYAN} /><stop offset="100%" stopColor="#0e7490" /></radialGradient>
        <filter id="bn-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        <style>{`
          @keyframes bn-flow{to{stroke-dashoffset:-16}}
          @keyframes bn-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.018)}}
          @keyframes bn-draw{to{stroke-dashoffset:0}}
          @keyframes bn-glowpulse{0%,100%{opacity:.55}50%{opacity:1}}
          .bn-root{transform-origin:300px 280px;animation:bn-breathe 4.5s ease-in-out infinite}
          .bn-outline{stroke-dasharray:2600;stroke-dashoffset:2600;animation:bn-draw 2.4s cubic-bezier(.16,1,.3,1) .2s forwards, bn-glowpulse 5s ease-in-out infinite 2.6s}
          .bn-gyrus{stroke-dasharray:3 9;animation:bn-flow 1.3s linear infinite}
          @media (prefers-reduced-motion:reduce){.bn-root,.bn-outline,.bn-gyrus{animation:none}.bn-outline{stroke-dashoffset:0}}
        `}</style>
      </defs>

      <g className="bn-root">
        {/* soft inner glow */}
        <path d={OUTLINE} fill="url(#bn-grad)" opacity="0.05" />

        {/* network cross-links */}
        {LINKS.map(([a, b], k) => (
          <line key={`l${k}`} x1={NODES[a][0]} y1={NODES[a][1]} x2={NODES[b][0]} y2={NODES[b][1]} stroke="url(#bn-grad)" strokeOpacity="0.18" strokeWidth="1" />
        ))}

        {/* gyri folds = flowing neural pathways */}
        {GYRI.map((d, k) => (
          <path key={`g${k}`} d={d} fill="none" stroke="url(#bn-grad)" strokeWidth="1.6" strokeOpacity="0.5" className="bn-gyrus" style={{ animationDuration: `${1 + (k % 5) * 0.25}s` }} filter="url(#bn-glow)" />
        ))}

        {/* fissure */}
        <path d={FISSURE} fill="none" stroke={VIOLET} strokeWidth="1.4" strokeOpacity="0.45" />

        {/* outline */}
        <path className="bn-outline" d={OUTLINE} fill="none" stroke="url(#bn-grad)" strokeWidth="2.6" filter="url(#bn-glow)" />

        {/* nodes */}
        {NODES.map(([x, y], i) => {
          const l = lit.find((o) => o.i === i)
          const age = l ? (Date.now() - l.t) / 1100 : 1
          const inten = l ? 1 - age : 0
          return (
            <g key={`n${i}`}>
              {inten > 0.02 && <circle cx={x} cy={y} r={5 + inten * 7} fill={l!.c} opacity={inten * 0.8} filter="url(#bn-glow)" />}
              <circle cx={x} cy={y} r={2.6} fill="url(#bn-node)" opacity={0.7 + inten * 0.3} filter="url(#bn-glow)" />
            </g>
          )
        })}
      </g>
    </svg>
  )
}
