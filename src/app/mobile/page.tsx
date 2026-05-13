'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const BG = '#040508'
const SURFACE = '#0d1117'
const BORDER = '#21262d'
const GREEN = '#22c55e'
const GOLD = '#f59e0b'
const TEXT = '#e6edf3'
const MUTED = '#8b949e'

const LEADERBOARD = [
  { rank: 1, name: 'TraderX_Pro', pnl: '+$4,820', pct: '+19.3%', badge: '🥇' },
  { rank: 2, name: 'EdgeHunter', pnl: '+$3,610', pct: '+14.4%', badge: '🥈' },
  { rank: 3, name: 'PriceAction_K', pnl: '+$2,990', pct: '+12.0%', badge: '🥉' },
  { rank: 4, name: 'VolBreaker', pnl: '+$2,155', pct: '+8.6%', badge: '' },
  { rank: 5, name: 'GapFader99', pnl: '+$1,880', pct: '+7.5%', badge: '' },
]

const RECENT_WINNERS = [
  { name: 'TraderX_Pro', prize: '$1,200', tournament: 'Morning Scalp', date: 'Today' },
  { name: 'EdgeHunter', prize: '$800', tournament: 'Breakout Cup', date: 'Yesterday' },
  { name: 'PriceAction_K', prize: '$600', tournament: 'Trend Rider', date: 'May 10' },
  { name: 'VolBreaker', prize: '$400', tournament: 'Gap & Go', date: 'May 9' },
]

function useCountdown(targetHour: number) {
  const [time, setTime] = useState({ h: 0, m: 0, s: 0 })
  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const next = new Date()
      next.setHours(targetHour, 30, 0, 0)
      if (now >= next) next.setDate(next.getDate() + 1)
      const diff = Math.max(0, Math.floor((next.getTime() - now.getTime()) / 1000))
      setTime({ h: Math.floor(diff / 3600), m: Math.floor((diff % 3600) / 60), s: diff % 60 })
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [targetHour])
  return time
}

function pad(n: number) {
  return String(n).padStart(2, '0')
}

export default function MobilePage() {
  const countdown = useCountdown(9)
  const [viewers] = useState(847)

  return (
    <div style={{
      background: BG,
      minHeight: '100dvh',
      color: TEXT,
      fontFamily: 'system-ui, -apple-system, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 480,
      margin: '0 auto',
      paddingBottom: 80,
    }}>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 20px 12px',
        borderBottom: `1px solid ${BORDER}`,
        background: SURFACE,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: GREEN, display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontWeight: 800, fontSize: 18, color: '#000',
          }}>Y</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>YN Arena</div>
            <div style={{ fontSize: 11, color: MUTED }}>Trading Tournaments</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 7, height: 7, borderRadius: '50%',
              background: GREEN, boxShadow: `0 0 6px ${GREEN}`,
              animation: 'pulse 1.5s infinite',
            }} />
            <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>LIVE</span>
          </div>
          <div style={{ fontSize: 12, color: MUTED }}>👁 {viewers.toLocaleString()}</div>
        </div>
      </div>

      {/* Hero: Countdown */}
      <div style={{
        margin: '16px 16px 0',
        background: SURFACE,
        borderRadius: 16,
        border: `1px solid ${BORDER}`,
        padding: '24px 20px',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: 12, color: MUTED, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
          Next Tournament Starts In
        </div>
        <div style={{
          display: 'flex', justifyContent: 'center', gap: 12, margin: '12px 0',
        }}>
          {[{ label: 'HRS', val: countdown.h }, { label: 'MIN', val: countdown.m }, { label: 'SEC', val: countdown.s }].map(({ label, val }) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{
                background: BG, border: `1px solid ${BORDER}`, borderRadius: 10,
                padding: '10px 16px', fontSize: 36, fontWeight: 800,
                fontVariantNumeric: 'tabular-nums', letterSpacing: '-2px', minWidth: 72,
              }}>
                {pad(val)}
              </div>
              <div style={{ fontSize: 10, color: MUTED, marginTop: 4, letterSpacing: 1 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Morning Session · 9:30 AM ET</div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: 'rgba(245,158,11,0.12)', border: `1px solid ${GOLD}`,
          borderRadius: 20, padding: '6px 16px',
        }}>
          <span style={{ fontSize: 18 }}>🏆</span>
          <span style={{ color: GOLD, fontWeight: 700, fontSize: 15 }}>$2,500 Prize Pool</span>
        </div>
      </div>

      {/* Enter Now Button */}
      <div style={{ padding: '14px 16px 0' }}>
        <Link href="/arena" style={{ textDecoration: 'none' }}>
          <button style={{
            width: '100%', background: GREEN, color: '#000',
            border: 'none', borderRadius: 14, padding: '18px 0',
            fontSize: 18, fontWeight: 800, letterSpacing: 0.5,
            cursor: 'pointer', minHeight: 58,
            boxShadow: `0 4px 24px rgba(34,197,94,0.35)`,
            display: 'block',
          }}>
            ENTER NOW
          </button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { icon: '📊', label: 'Trade', href: '/app' },
            { icon: '📺', label: 'Watch', href: '/arena/watch' },
            { icon: '🏆', label: 'Board', href: '/arena/leaderboard' },
            { icon: '💰', label: 'Courses', href: '/courses' },
          ].map(({ icon, label, href }) => (
            <Link key={label} href={href} style={{ textDecoration: 'none', flex: 1 }}>
              <div style={{
                background: SURFACE, border: `1px solid ${BORDER}`,
                borderRadius: 12, padding: '12px 4px',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5,
                cursor: 'pointer', minHeight: 64,
              }}>
                <span style={{ fontSize: 22 }}>{icon}</span>
                <span style={{ fontSize: 11, color: MUTED, fontWeight: 500 }}>{label}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Live Leaderboard */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{
          background: SURFACE, border: `1px solid ${BORDER}`,
          borderRadius: 16, overflow: 'hidden',
        }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '14px 16px 10px', borderBottom: `1px solid ${BORDER}`,
          }}>
            <div style={{ fontWeight: 700, fontSize: 14 }}>Live Leaderboard</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN }} />
              <span style={{ fontSize: 11, color: GREEN, fontWeight: 600 }}>LIVE</span>
            </div>
          </div>
          {LEADERBOARD.map((row) => (
            <div key={row.rank} style={{
              display: 'flex', alignItems: 'center',
              padding: '11px 16px', borderBottom: `1px solid ${BORDER}`,
              gap: 10,
            }}>
              <div style={{
                width: 28, textAlign: 'center', fontSize: 14,
                color: row.rank <= 3 ? GOLD : MUTED, fontWeight: 700,
              }}>
                {row.badge || `#${row.rank}`}
              </div>
              <div style={{ flex: 1, fontSize: 13, fontWeight: 500 }}>{row.name}</div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: GREEN, fontWeight: 700 }}>{row.pnl}</div>
                <div style={{ fontSize: 11, color: MUTED }}>{row.pct}</div>
              </div>
            </div>
          ))}
          <Link href="/arena/leaderboard" style={{ textDecoration: 'none' }}>
            <div style={{
              padding: '12px 16px', textAlign: 'center',
              fontSize: 13, color: GREEN, fontWeight: 600, cursor: 'pointer',
            }}>
              View Full Leaderboard →
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Winners */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 10 }}>Recent Winners</div>
        <div style={{
          display: 'flex', gap: 10, overflowX: 'auto',
          paddingBottom: 4,
          scrollbarWidth: 'none',
        }}>
          {RECENT_WINNERS.map((w) => (
            <div key={w.name + w.date} style={{
              background: SURFACE, border: `1px solid ${BORDER}`,
              borderRadius: 14, padding: '14px 16px',
              minWidth: 160, flexShrink: 0,
            }}>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 4 }}>{w.date}</div>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{w.name}</div>
              <div style={{ fontSize: 11, color: MUTED, marginBottom: 8 }}>{w.tournament}</div>
              <div style={{
                background: 'rgba(34,197,94,0.12)', borderRadius: 8,
                padding: '5px 10px', display: 'inline-block',
                color: GREEN, fontWeight: 700, fontSize: 14,
              }}>
                {w.prize}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
        width: '100%', maxWidth: 480,
        background: SURFACE, borderTop: `1px solid ${BORDER}`,
        display: 'flex', zIndex: 20,
      }}>
        {[
          { icon: '🏠', label: 'Home', href: '/mobile', active: true },
          { icon: '⚔️', label: 'Arena', href: '/arena', active: false },
          { icon: '📊', label: 'Trade', href: '/app', active: false },
          { icon: '🏆', label: 'Rank', href: '/arena/leaderboard', active: false },
          { icon: '👤', label: 'Profile', href: '/app', active: false },
        ].map(({ icon, label, href, active }) => (
          <Link key={label} href={href} style={{ textDecoration: 'none', flex: 1 }}>
            <div style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              padding: '10px 0 8px', cursor: 'pointer', minHeight: 56,
              color: active ? GREEN : MUTED,
            }}>
              <span style={{ fontSize: 20 }}>{icon}</span>
              <span style={{ fontSize: 10, marginTop: 2, fontWeight: active ? 700 : 400 }}>{label}</span>
            </div>
          </Link>
        ))}
      </nav>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  )
}
