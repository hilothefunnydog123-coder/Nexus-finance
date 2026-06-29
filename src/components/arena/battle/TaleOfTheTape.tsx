'use client'

import { Brain, Sparkles, Users, Zap } from 'lucide-react'
import { type Standing, C } from './types'
import { CombatantEmblem } from './CombatantEmblem'
import { useCountUp } from './hooks'

// One corner of the matchup: a combatant's identity + live record.
type Corner = {
  id: string
  name: string
  tagline: string
  color: string
  colorAlt: string
  icon: React.ReactNode
  rating: number
  wins: number
  losses: number
  bouts: number
}

function cornerFrom(s: Standing | undefined, base: Omit<Corner, 'rating' | 'wins' | 'losses' | 'bouts'>): Corner {
  return {
    ...base,
    rating: s ? Math.round(s.rating) : 1500,
    wins: s?.wins ?? 0,
    losses: s?.losses ?? 0,
    bouts: s?.bouts ?? 0,
  }
}

/** Build the three corners — BrainStock, Gemini, The Crowd — from standings. */
function buildCorners(standings: Standing[]): Corner[] {
  const byId = new Map(standings.map((s) => [s.participant_id, s]))
  const net = cornerFrom(byId.get('brainstock'), {
    id: 'brainstock',
    name: 'BrainStock',
    tagline: 'the neural net · the house',
    color: C.violet,
    colorAlt: '#c084fc',
    icon: <Brain size={30} strokeWidth={2.2} />,
  })
  const gemini = cornerFrom(byId.get('gemini'), {
    id: 'gemini',
    name: 'Gemini',
    tagline: 'Google · live-search AI',
    color: C.cyan,
    colorAlt: '#22d3ee',
    icon: <Sparkles size={28} strokeWidth={2.2} />,
  })
  // The Crowd = the aggregate of every other challenger (baselines + the field).
  const rest = standings.filter((s) => s.participant_id !== 'brainstock' && s.participant_id !== 'gemini')
  const crowd: Corner = {
    id: 'crowd',
    name: 'The Crowd',
    tagline: 'the field · baselines + you',
    color: C.amber,
    colorAlt: '#ffd166',
    icon: <Users size={28} strokeWidth={2.2} />,
    rating: rest.length ? Math.round(rest.reduce((a, s) => a + s.rating, 0) / rest.length) : 1500,
    wins: rest.reduce((a, s) => a + (s.wins ?? 0), 0),
    losses: rest.reduce((a, s) => a + (s.losses ?? 0), 0),
    bouts: rest.reduce((a, s) => a + (s.bouts ?? 0), 0),
  }
  return [net, gemini, crowd]
}

function winRate(c: Corner): number {
  const dec = c.wins + c.losses
  return dec ? Math.round((c.wins / dec) * 100) : 0
}

export default function TaleOfTheTape({ standings, demo }: { standings: Standing[]; demo: boolean }) {
  const corners = buildCorners(standings)
  const leader = corners.reduce((a, b) => (b.rating > a.rating ? b : a), corners[0])

  return (
    <section className="av-rise relative overflow-hidden rounded-3xl border p-5 sm:p-7" style={{ borderColor: C.border, background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(255,255,255,.01))' }}>
      <div aria-hidden className="av-sheen" />
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.3em]" style={{ color: C.muted }}>
          <Zap size={13} className="av-spark" style={{ color: C.amber }} />
          TALE OF THE TAPE
        </div>
        {demo ? (
          <span className="rounded-full border px-2 py-0.5 text-[10px]" style={{ borderColor: C.border, color: C.muted }}>
            preview · fills as bouts grade
          </span>
        ) : (
          <span className="text-[11px]" style={{ color: C.muted }}>
            ranked by Arena Elo
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 items-stretch gap-3 sm:grid-cols-[1fr_auto_1fr_auto_1fr]">
        <CornerCard corner={corners[0]} wr={winRate(corners[0])} leading={leader.id === corners[0].id} align="right" />
        <Versus />
        <CornerCard corner={corners[1]} wr={winRate(corners[1])} leading={leader.id === corners[1].id} align="center" />
        <Versus />
        <CornerCard corner={corners[2]} wr={winRate(corners[2])} leading={leader.id === corners[2].id} align="left" />
      </div>
    </section>
  )
}

function Versus() {
  return (
    <div className="hidden items-center justify-center py-1 sm:flex sm:py-0" aria-hidden>
      <div className="relative flex h-11 w-11 items-center justify-center rounded-full" style={{ border: `1px solid ${C.border}`, background: 'rgba(5,6,10,.6)' }}>
        <span className="av-spark text-sm font-black italic" style={{ color: C.amber }}>VS</span>
      </div>
    </div>
  )
}

function CornerCard({ corner, wr, leading, align }: { corner: Corner; wr: number; leading: boolean; align: 'left' | 'right' | 'center' }) {
  const rating = useCountUp(corner.rating, 1200)
  const rateNum = useCountUp(wr, 1200)
  const items = align === 'right' ? 'sm:items-end sm:text-right' : align === 'left' ? 'sm:items-start sm:text-left' : 'sm:items-center sm:text-center'
  return (
    <div
      className="av-pop relative flex flex-col items-center gap-3 rounded-2xl border p-4"
      style={{
        borderColor: leading ? `${corner.color}66` : C.border,
        background: leading ? `${corner.color}10` : 'rgba(255,255,255,.02)',
        boxShadow: leading ? `0 0 30px ${corner.color}22` : 'none',
      }}
    >
      {leading ? (
        <span className="absolute -top-2 rounded-full px-2 py-0.5 text-[9px] font-bold tracking-wider" style={{ background: corner.color, color: '#05060a' }}>
          ◆ LEADER
        </span>
      ) : null}
      <CombatantEmblem color={corner.color} colorAlt={corner.colorAlt} icon={corner.icon} live={leading} />
      <div className={`flex flex-col items-center ${items}`}>
        <div className="text-base font-extrabold text-white">{corner.name}</div>
        <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>{corner.tagline}</div>
      </div>
      <div className="flex items-end gap-1.5">
        <span className="font-mono text-3xl font-black leading-none" style={{ color: corner.color }}>{Math.round(rating)}</span>
        <span className="mb-0.5 text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>elo</span>
      </div>
      <div className="flex w-full items-center justify-center gap-3 font-mono text-xs">
        <span style={{ color: C.green }}>{corner.wins}W</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.red }}>{corner.losses}L</span>
        <span style={{ color: C.muted }}>·</span>
        <span style={{ color: C.muted }}>{Math.round(rateNum)}%</span>
      </div>
      {/* win-rate meter */}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: 'rgba(255,255,255,.08)' }}>
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(2, Math.min(100, wr))}%`, background: `linear-gradient(90deg, ${corner.color}, ${corner.colorAlt})` }} />
      </div>
    </div>
  )
}
