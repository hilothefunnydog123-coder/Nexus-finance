'use client'

import { Lock } from 'lucide-react'
import { type Call, C, fmtPct, statusMeta } from './types'

/** ESPN-style scrolling bottom-line of today's sealed calls — seamless marquee. */
export default function TickerTape({ calls }: { calls: Call[] }) {
  if (!calls.length) return null
  // Duplicate the row so the -50% translate loops seamlessly.
  const row = [...calls, ...calls]
  const dur = Math.max(28, Math.min(90, calls.length * 3.2))

  return (
    <div
      aria-hidden
      className="av-ticker relative overflow-hidden border-y"
      style={{ borderColor: C.border, background: 'linear-gradient(90deg, rgba(5,6,10,.9), rgba(10,12,20,.7), rgba(5,6,10,.9))' }}
    >
      {/* edge fades */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16" style={{ background: 'linear-gradient(90deg, #05060a, transparent)' }} />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16" style={{ background: 'linear-gradient(270deg, #05060a, transparent)' }} />
      <div className="flex items-center">
        <span
          className="z-20 flex shrink-0 items-center gap-1.5 px-3 py-2 text-[10px] font-black tracking-widest"
          style={{ background: C.violet, color: '#05060a' }}
        >
          <span className="av-live inline-block h-1.5 w-1.5 rounded-full" style={{ background: '#05060a' }} />
          ARENA LIVE
        </span>
        <div className="av-ticker-track" style={{ '--dur': `${dur}s` } as React.CSSProperties}>
          {row.map((c, i) => {
            const up = c.direction === 'up'
            const sm = statusMeta(c.status, c.dir_correct)
            const col = sm.label === 'HIT' ? C.green : sm.label === 'MISS' ? C.red : up ? C.green : C.red
            return (
              <span key={`${c.ticker}-${i}`} className="inline-flex items-center gap-2 px-4 py-2 font-mono text-xs">
                <Lock size={10} style={{ color: C.muted }} />
                <span className="font-bold text-white">{c.ticker}</span>
                <span style={{ color: col }}>
                  {up ? '▲' : '▼'} {fmtPct(c.pct)}
                </span>
                {sm.label !== 'SEALED' ? (
                  <span className="text-[9px] font-bold" style={{ color: sm.color }}>{sm.label}</span>
                ) : null}
                <span style={{ color: 'rgba(255,255,255,.12)' }}>|</span>
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}
