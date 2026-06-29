'use client'

import Link from 'next/link'
import { Brain, Sparkles, Lock, ArrowRight } from 'lucide-react'
import { type Call, type Combatant, C, fmtPrice, fmtPct, shortHash, statusMeta } from './types'

// A cinematic matchup card: the net's sealed call + how the field of models split.
export function LiveBoutCard({ call, models = [], index = 0 }: { call: Call; models?: Combatant[]; index?: number }) {
  const up = call.direction === 'up'
  const sm = statusMeta(call.status, call.dir_correct)
  const accent = sm.label === 'HIT' ? C.green : sm.label === 'MISS' ? C.red : up ? C.green : C.red

  const challengers = models.filter((m) => !m.is_net)
  const ups = models.filter((m) => m.direction === 'up').length
  const downs = models.length - ups
  const total = models.length || 1
  const upPct = Math.round((ups / total) * 100)

  const gemini = challengers.find((m) => m.model_id === 'gemini')
  const delay = `av-d${Math.min(6, (index % 6) + 1)}`

  return (
    <Link
      href={`/arena/${encodeURIComponent(call.ticker)}`}
      className={`av-card av-rise ${delay} group block rounded-2xl border p-4`}
      style={{ borderColor: C.border, background: 'rgba(255,255,255,.03)' }}
    >
      <div aria-hidden className="av-sheen" />
      {/* glowing top edge by direction/outcome */}
      <div aria-hidden className="absolute inset-x-0 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${accent}, transparent)`, boxShadow: `0 0 12px ${accent}` }} />

      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-xl font-black tracking-wide text-white">{call.ticker}</div>
          <div className="mt-0.5 text-[11px]" style={{ color: C.muted }}>
            line {fmtPrice(call.start_price)} · {call.horizon}d
          </div>
        </div>
        <span className="flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider" style={{ color: sm.color, border: `1px solid ${sm.color}55`, background: `${sm.color}11` }}>
          {sm.label === 'SEALED' ? <Lock size={9} /> : null}
          {sm.label}
        </span>
      </div>

      {/* the net's call */}
      <div className="mt-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-black" style={{ color: up ? C.green : C.red, border: `1px solid ${(up ? C.green : C.red)}44`, background: `${(up ? C.green : C.red)}12` }}>
          {up ? '▲' : '▼'} {up ? 'UP' : 'DOWN'}
        </span>
        <span className="font-mono text-sm" style={{ color: up ? C.green : C.red }}>{fmtPct(call.pct)}</span>
        <span className="ml-auto font-mono text-sm" style={{ color: C.muted }}>→ {fmtPrice(call.target)}</span>
      </div>

      {/* the field's split */}
      {models.length ? (
        <div className="mt-3.5">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
            <span style={{ color: C.green }}>{ups} long</span>
            <span>{models.length} models weigh in</span>
            <span style={{ color: C.red }}>{downs} short</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,45,120,.25)' }}>
            <div className="h-full transition-all duration-700" style={{ width: `${upPct}%`, background: `linear-gradient(90deg, ${C.green}, #0bd17a)`, boxShadow: `0 0 10px ${C.green}66` }} />
          </div>
        </div>
      ) : (
        <div className="mt-3.5 text-[11px]" style={{ color: C.muted }}>field assembling…</div>
      )}

      {/* combatant chips + seal */}
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Chip icon={<Brain size={11} />} color={C.violet} dir={call.direction} label="NET" />
          {gemini ? <Chip icon={<Sparkles size={11} />} color={C.cyan} dir={gemini.direction} label="GEM" /> : null}
          {challengers.length > 1 ? (
            <span className="rounded-md border px-1.5 py-0.5 text-[9px] font-bold" style={{ borderColor: C.border, color: C.muted }}>
              +{challengers.length - (gemini ? 1 : 0)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[10px]" style={{ color: C.muted }} title={call.leaf_hash}>
            {shortHash(call.leaf_hash, 5, 4)}
          </span>
          <ArrowRight size={14} className="opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100" style={{ color: C.cyan }} />
        </div>
      </div>
    </Link>
  )
}

function Chip({ icon, color, dir, label }: { icon: React.ReactNode; color: string; dir: 'up' | 'down'; label: string }) {
  const dc = dir === 'up' ? C.green : C.red
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ borderColor: `${color}44`, color, background: `${color}10` }}>
      {icon}
      {label}
      <span style={{ color: dc }}>{dir === 'up' ? '▲' : '▼'}</span>
    </span>
  )
}
