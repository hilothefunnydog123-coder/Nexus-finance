'use client'

// The combatants' independent reads, side by side. Each card is one model's
// sealed call on the same ticker — its direction, conviction, target and its
// own reasoning — so users can compare how the net and Gemini (and the
// baselines) each saw the same setup, blind to one another.

import { type Combatant, C, fmtPrice, fmtPct, statusMeta } from './types'

function providerTint(kind: string, isNet: boolean): string {
  if (isNet) return C.violet
  if (kind === 'llm') return C.cyan
  return C.muted
}

function convPct(c: number): number {
  const v = (c ?? 0) <= 1 ? (c ?? 0) * 100 : c
  return Math.max(0, Math.min(100, Math.round(v)))
}

export function ModelCard({ m, line }: { m: Combatant; line?: number | null }) {
  const dirColor = m.direction === 'up' ? C.green : C.red
  const tint = providerTint(m.kind, m.is_net)
  const sm = statusMeta(m.status)
  const conviction = convPct(m.conviction)
  const movePct =
    line != null && m.target != null && line > 0 ? ((m.target - line) / line) * 100 : null

  return (
    <div
      className="flex h-full flex-col rounded-2xl border p-4"
      style={{
        borderColor: m.is_net ? `${C.violet}55` : C.border,
        background: m.is_net ? 'rgba(168,85,247,.06)' : 'rgba(255,255,255,.02)',
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            {m.is_net ? <span aria-hidden>🧠</span> : m.kind === 'llm' ? <span aria-hidden>✦</span> : null}
            <span className="truncate text-sm font-semibold text-white">{m.model_name}</span>
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-wider" style={{ color: tint }}>
            {m.provider}
            {m.is_net ? ' · the house' : ''}
          </div>
        </div>
        <span
          className="shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider"
          style={{ color: sm.color, border: `1px solid ${sm.color}44` }}
        >
          {sm.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <span
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold"
          style={{ color: dirColor, border: `1px solid ${dirColor}44`, background: `${dirColor}12` }}
        >
          {m.direction === 'up' ? '▲' : '▼'} {m.direction.toUpperCase()}
        </span>
        <div className="font-mono text-xs" style={{ color: C.muted }}>
          {m.target != null ? <>→ {fmtPrice(m.target)}</> : '—'}
          {movePct != null ? <span style={{ color: dirColor }}> ({fmtPct(movePct)})</span> : null}
        </div>
      </div>

      {/* conviction bar */}
      <div className="mt-3">
        <div className="flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
          <span>conviction</span>
          <span className="font-mono" style={{ color: C.amber }}>{conviction}%</span>
        </div>
        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}>
          <div className="h-full rounded-full" style={{ width: `${conviction}%`, background: m.is_net ? C.violet : dirColor }} />
        </div>
      </div>

      {m.reasoning ? (
        <p className="mt-3 text-xs leading-relaxed" style={{ color: '#c3cad8' }}>
          {m.reasoning}
        </p>
      ) : null}
    </div>
  )
}

export default function ModelPanel({ models, line }: { models: Combatant[]; line?: number | null }) {
  if (!models.length) return null
  const ups = models.filter((m) => m.direction === 'up').length
  const downs = models.length - ups
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" style={{ color: C.muted }}>
        <span>
          <span style={{ color: C.green }}>{ups} up</span> · <span style={{ color: C.red }}>{downs} down</span> ·{' '}
          {models.length} independent {models.length === 1 ? 'read' : 'reads'}
        </span>
        <span>sealed together · blind to each other</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {models.map((m) => (
          <ModelCard key={`${m.model_id}-${m.ticker}`} m={m} line={line} />
        ))}
      </div>
    </div>
  )
}
