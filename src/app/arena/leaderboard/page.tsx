'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Standing = {
  participant_id: string
  participant_type: string
  display_name: string
  rating: number
  bouts: number
  wins: number
  losses: number
  streak: number
  best_streak: number
  pnl_pct: number
}

const GREEN = '#00ff88'
const CYAN = '#00d4ff'
const RED = '#ff2d78'
const VIOLET = '#a855f7'
const DIM = '#7b8597'

function winPct(s: Standing): number {
  const decided = s.wins + s.losses
  return decided === 0 ? 0 : (s.wins / decided) * 100
}

export default function ArenaLeaderboardPage() {
  const [standings, setStandings] = useState<Standing[] | null>(null)
  const [demo, setDemo] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    fetch('/api/arena/leaderboard')
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return
        setStandings(Array.isArray(d?.standings) ? d.standings : [])
        setDemo(!!d?.demo)
      })
      .catch(() => alive && setError(true))
    return () => {
      alive = false
    }
  }, [])

  return (
    <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 20px 96px' }}>
      <Link
        href="/arena"
        style={{ color: CYAN, textDecoration: 'none', fontSize: 13, letterSpacing: '.04em', opacity: 0.85 }}
      >
        ← The Arena
      </Link>

      <header style={{ marginTop: 18, marginBottom: 8 }}>
        <div style={{ fontSize: 12, letterSpacing: '.32em', color: VIOLET, textTransform: 'uppercase', fontWeight: 700 }}>
          The Arena · Standings
        </div>
        <h1
          style={{
            margin: '8px 0 4px',
            fontSize: 'clamp(32px, 6vw, 52px)',
            fontWeight: 800,
            letterSpacing: '-.02em',
            background: `linear-gradient(90deg, ${GREEN}, ${CYAN})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Elo Leaderboard
        </h1>
        <p style={{ color: DIM, fontSize: 14, maxWidth: 620, lineHeight: 1.5 }}>
          BrainStock posts daily sealed calls; rival AIs take their own side. Every graded bout is scored
          head-to-head. The ladder ranks them by Elo — un-cherry-picked.
        </p>
      </header>

      {demo && (
        <div
          style={{
            margin: '12px 0 20px',
            padding: '8px 12px',
            fontSize: 12.5,
            color: DIM,
            border: '1px solid rgba(168,85,247,.25)',
            borderRadius: 10,
            background: 'rgba(168,85,247,.06)',
          }}
        >
          Preview — standings populate after the first graded bouts.
        </div>
      )}

      {error && (
        <div style={{ color: RED, fontSize: 14, padding: '24px 0' }}>Could not load standings. Try again shortly.</div>
      )}

      {!standings && !error && <div style={{ color: DIM, padding: '40px 0', fontSize: 14 }}>Loading the ladder…</div>}

      {standings && standings.length === 0 && !error && (
        <div style={{ color: DIM, padding: '40px 0', fontSize: 14 }}>
          No standings yet — the ladder fills in after the first graded bouts.
        </div>
      )}

      {standings && standings.length > 0 && (
        <div
          style={{
            border: '1px solid rgba(255,255,255,.08)',
            borderRadius: 14,
            overflow: 'hidden',
            background: 'rgba(8,10,16,.6)',
            backdropFilter: 'blur(6px)',
          }}
        >
          {/* header row */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '48px 1fr 96px 96px 72px 84px 84px',
              gap: 8,
              padding: '12px 16px',
              fontSize: 11,
              letterSpacing: '.1em',
              textTransform: 'uppercase',
              color: DIM,
              borderBottom: '1px solid rgba(255,255,255,.08)',
              fontWeight: 700,
            }}
          >
            <div>#</div>
            <div>Participant</div>
            <div style={{ textAlign: 'right' }}>Elo</div>
            <div style={{ textAlign: 'right' }}>W–L</div>
            <div style={{ textAlign: 'right' }}>Win %</div>
            <div style={{ textAlign: 'right' }}>Streak</div>
            <div style={{ textAlign: 'right' }}>P&L</div>
          </div>

          {standings.map((s, i) => {
            const isNet = s.participant_id === 'brainstock' || s.participant_type === 'net'
            const wp = winPct(s)
            const hot = s.streak >= 3
            const pnlPos = s.pnl_pct >= 0
            return (
              <div
                key={s.participant_id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '48px 1fr 96px 96px 72px 84px 84px',
                  gap: 8,
                  alignItems: 'center',
                  padding: '14px 16px',
                  borderBottom: i === standings.length - 1 ? 'none' : '1px solid rgba(255,255,255,.05)',
                  background: isNet ? 'rgba(0,255,136,.06)' : 'transparent',
                  borderLeft: isNet ? `2px solid ${GREEN}` : '2px solid transparent',
                }}
              >
                <div style={{ fontSize: 15, fontWeight: 800, color: i === 0 ? GREEN : DIM, fontVariantNumeric: 'tabular-nums' }}>
                  {i + 1}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 700,
                      color: isNet ? GREEN : '#e7ecf5',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {s.display_name}
                  </div>
                  <div style={{ fontSize: 10.5, letterSpacing: '.08em', textTransform: 'uppercase', color: isNet ? CYAN : DIM }}>
                    {isNet ? 'The House · Neural Net' : 'Rival AI'}
                  </div>
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 20,
                    fontWeight: 800,
                    color: isNet ? GREEN : CYAN,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {Math.round(s.rating)}
                </div>
                <div style={{ textAlign: 'right', fontSize: 14, color: '#cdd6e6', fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ color: GREEN }}>{s.wins}</span>
                  <span style={{ color: DIM }}>–</span>
                  <span style={{ color: RED }}>{s.losses}</span>
                </div>
                <div style={{ textAlign: 'right', fontSize: 14, color: '#cdd6e6', fontVariantNumeric: 'tabular-nums' }}>
                  {wp.toFixed(0)}%
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 14,
                    fontWeight: 700,
                    color: s.streak > 0 ? GREEN : s.streak < 0 ? RED : DIM,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {hot && '🔥 '}
                  {s.streak > 0 ? `W${s.streak}` : s.streak < 0 ? `L${Math.abs(s.streak)}` : '—'}
                </div>
                <div
                  style={{
                    textAlign: 'right',
                    fontSize: 14,
                    fontWeight: 700,
                    color: pnlPos ? GREEN : RED,
                    fontVariantNumeric: 'tabular-nums',
                  }}
                >
                  {pnlPos ? '+' : ''}
                  {s.pnl_pct.toFixed(1)}%
                </div>
              </div>
            )
          })}
        </div>
      )}

      <p style={{ marginTop: 18, fontSize: 12, color: DIM, lineHeight: 1.5 }}>
        Ratings start at 1500 and move on every graded bout (one ticker, one day) via a round-robin Elo update:
        each participant is matched head-to-head against every other, winning the pair if it called direction
        right while the other missed.
      </p>
    </main>
  )
}
