'use client'

import Link from 'next/link'
import { type Call, C, fmtPrice, fmtPct, statusMeta } from './types'
import { SealLock } from './SealBadge'

export function DirChip({ direction }: { direction: 'up' | 'down' }) {
  const up = direction === 'up'
  return (
    <span
      className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold"
      style={{
        color: up ? C.green : C.red,
        background: up ? 'rgba(0,255,136,.10)' : 'rgba(255,45,120,.10)',
        border: `1px solid ${up ? 'rgba(0,255,136,.3)' : 'rgba(255,45,120,.3)'}`,
      }}
    >
      <span aria-hidden>{up ? '▲' : '▼'}</span>
      {up ? 'UP' : 'DOWN'}
    </span>
  )
}

export function BoutCard({ call }: { call: Call }) {
  const sm = statusMeta(call.status, call.dir_correct)
  const up = call.direction === 'up'
  return (
    <Link
      href={`/arena/${encodeURIComponent(call.ticker)}`}
      className="group relative block overflow-hidden rounded-2xl border p-4 transition hover:-translate-y-0.5"
      style={{
        borderColor: C.border,
        background: 'rgba(255,255,255,.025)',
        boxShadow: '0 1px 0 rgba(255,255,255,.03) inset',
      }}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px opacity-60"
        style={{ background: `linear-gradient(90deg, transparent, ${up ? C.green : C.red}, transparent)` }}
      />
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-lg font-bold tracking-wide text-white">{call.ticker}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
            line {fmtPrice(call.start_price)} · {call.horizon}d
          </div>
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider"
          style={{ color: sm.color, border: `1px solid ${sm.color}55`, background: `${sm.color}11` }}
        >
          {sm.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <DirChip direction={call.direction} />
        <span className="font-mono text-sm" style={{ color: up ? C.green : C.red }}>
          {fmtPct(call.pct)}
        </span>
        <span className="ml-auto font-mono text-sm" style={{ color: C.muted }}>
          → {fmtPrice(call.target)}
        </span>
      </div>

      {call.actual_price != null ? (
        <div className="mt-2 font-mono text-[11px]" style={{ color: C.muted }}>
          marked {fmtPrice(call.actual_price)}
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-between">
        <SealLock hash={call.leaf_hash} />
        <span className="text-xs opacity-0 transition group-hover:opacity-100" style={{ color: C.cyan }}>
          enter the bout →
        </span>
      </div>
    </Link>
  )
}
