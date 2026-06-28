'use client'

import Link from 'next/link'
import { type Standing, C, fmtPct } from './types'

const MEDAL = ['🥇', '🥈', '🥉']

export function LeaderboardStrip({ standings }: { standings: Standing[] }) {
  const top = standings.slice(0, 3)
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold tracking-widest" style={{ color: C.amber }}>
          ⚔️ STANDINGS
        </div>
        <Link href="/arena/leaderboard" className="text-xs transition hover:opacity-80" style={{ color: C.cyan }}>
          full board →
        </Link>
      </div>
      {top.length === 0 ? (
        <div className="py-2 text-sm" style={{ color: C.muted }}>
          No bouts graded yet — the board fills as calls resolve.
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-3">
          {top.map((s, i) => (
            <div
              key={s.participant_id || i}
              className="flex items-center gap-3 rounded-xl border px-3 py-2.5"
              style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}
            >
              <span className="text-lg" aria-hidden>{MEDAL[i] ?? '•'}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-white">{s.display_name || s.participant_id}</div>
                <div className="font-mono text-[11px]" style={{ color: C.muted }}>
                  {s.wins}-{s.losses} · {s.bouts} bouts
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-sm font-bold" style={{ color: C.amber }}>
                  {Math.round(s.rating)}
                </div>
                <div className="font-mono text-[11px]" style={{ color: (s.pnl_pct ?? 0) >= 0 ? C.green : C.red }}>
                  {fmtPct(s.pnl_pct)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
