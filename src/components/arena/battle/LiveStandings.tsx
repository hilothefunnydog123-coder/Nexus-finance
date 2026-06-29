'use client'

import Link from 'next/link'
import { Trophy, Flame, ArrowRight } from 'lucide-react'
import { type Standing, C, fmtPct } from './types'
import { useCountUp } from './hooks'

const MEDAL = ['#ffd166', '#cdd6e3', '#e2a06a']

export default function LiveStandings({ standings, demo }: { standings: Standing[]; demo?: boolean }) {
  const top = standings.slice(0, 3)
  return (
    <div className="av-rise rounded-2xl border p-4" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest" style={{ color: C.amber }}>
          <Trophy size={13} /> STANDINGS{demo ? <span className="font-normal" style={{ color: C.muted }}>· preview</span> : null}
        </div>
        <Link href="/arena/leaderboard" className="group inline-flex items-center gap-1 text-xs transition hover:opacity-80" style={{ color: C.cyan }}>
          full board <ArrowRight size={12} className="transition group-hover:translate-x-0.5" />
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="py-2 text-sm" style={{ color: C.muted }}>
          No bouts graded yet — the board fills as calls resolve.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {top.map((s, i) => (
            <PodiumRow key={s.participant_id || i} s={s} rank={i} />
          ))}
        </div>
      )}
    </div>
  )
}

function PodiumRow({ s, rank }: { s: Standing; rank: number }) {
  const rating = useCountUp(Math.round(s.rating), 1100)
  const medal = MEDAL[rank] ?? C.muted
  const hot = (s.streak ?? 0) >= 3
  return (
    <div className="av-pop flex items-center gap-3 rounded-xl border px-3 py-2.5" style={{ borderColor: rank === 0 ? `${medal}55` : C.border, background: rank === 0 ? `${medal}0d` : 'rgba(255,255,255,.02)' }}>
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black" style={{ background: `${medal}22`, color: medal, border: `1px solid ${medal}55` }}>
        {rank + 1}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-bold text-white">{s.display_name || s.participant_id}</span>
          {hot ? <Flame size={12} style={{ color: C.amber }} className="av-glow" /> : null}
        </div>
        <div className="font-mono text-[11px]" style={{ color: C.muted }}>
          {s.wins}-{s.losses} · {s.bouts} bouts
        </div>
      </div>
      <div className="text-right">
        <div className="font-mono text-base font-black" style={{ color: medal }}>{Math.round(rating)}</div>
        <div className="font-mono text-[11px]" style={{ color: (s.pnl_pct ?? 0) >= 0 ? C.green : C.red }}>{fmtPct(s.pnl_pct)}</div>
      </div>
    </div>
  )
}
