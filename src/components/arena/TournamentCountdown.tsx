'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg: '#040508', surface: '#0d1117', raised: '#161b22', border: '#21262d',
  green: '#22c55e', gold: '#f59e0b', orange: '#f97316', blue: '#3b82f6',
  text: '#e6edf3', muted: '#8b949e', dim: '#484f58',
}

const TIPS = [
  {
    icon: '📊',
    title: 'Plan your watchlist',
    body: 'Pick 3–5 instruments to focus on. The traders who cash know their setups before the bell.',
  },
  {
    icon: '🎯',
    title: 'Set your risk per trade',
    body: 'Decide your max loss per trade before you open anything. Blown accounts don\'t recover in 4 hours.',
  },
  {
    icon: '⚡',
    title: 'Know the catalyst',
    body: 'Check today\'s economic calendar. Earnings, CPI, and Fed speeches move markets — be ready.',
  },
]

interface Props {
  startTime: string
  contestName: string
  pool: number
  entries: number
}

export default function TournamentCountdown({ startTime, contestName, pool, entries }: Props) {
  const endRef = useRef<number>(new Date(startTime).getTime())
  const [ms, setMs] = useState<number>(endRef.current - Date.now())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    endRef.current = new Date(startTime).getTime()
    setMs(endRef.current - Date.now())
    const t = setInterval(() => setMs(endRef.current - Date.now()), 1000)
    return () => clearInterval(t)
  }, [startTime])

  const remaining = Math.max(0, ms)
  const hh = Math.floor(remaining / 3_600_000)
  const mm = Math.floor((remaining % 3_600_000) / 60_000)
  const ss = Math.floor((remaining % 60_000) / 1_000)

  const isUrgent = remaining < 5 * 60_000  // < 5 min
  const isImminent = remaining < 60_000    // < 1 min
  const started = remaining <= 0

  const clockColor = isImminent ? '#ef4444' : isUrgent ? T.orange : T.text
  const prizeFormatted = pool >= 1000 ? `$${(pool / 1000).toFixed(1)}k` : `$${pool}`

  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 16,
      overflow: 'hidden',
      fontFamily: 'Inter,system-ui,sans-serif',
      color: T.text,
      maxWidth: 520,
      width: '100%',
    }}>
      <style>{`
        @keyframes tc-pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes tc-glow  { 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.3)} 50%{box-shadow:0 0 24px 4px rgba(34,197,94,0.12)} }
        @keyframes tc-bounce{ 0%,100%{transform:scale(1)} 50%{transform:scale(1.04)} }
      `}</style>

      {/* ── HEADER BAR ── */}
      <div style={{
        background: T.raised,
        borderBottom: `1px solid ${T.border}`,
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 2 }}>Registered for</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: T.text }}>{contestName}</div>
        </div>
        <div style={{
          background: 'rgba(34,197,94,0.1)',
          border: `1px solid rgba(34,197,94,0.3)`,
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 10,
          fontWeight: 800,
          color: T.green,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
        }}>
          You&apos;re In
        </div>
      </div>

      {/* ── COUNTDOWN ── */}
      <div style={{ padding: '32px 20px 28px', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 18 }}>
          {started ? 'Tournament is live!' : 'Tournament starts in'}
        </div>

        {started ? (
          <div style={{
            fontSize: 28, fontWeight: 900, color: T.green,
            animation: 'tc-bounce 1s ease-in-out infinite',
          }}>
            🏁 GO! Tournament is live
          </div>
        ) : (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'monospace',
            fontWeight: 900,
            fontSize: mounted ? 64 : 64,
            color: clockColor,
            letterSpacing: -2,
            lineHeight: 1,
            animation: isImminent ? 'tc-pulse 0.5s ease-in-out infinite' : isUrgent ? 'tc-pulse 1s ease-in-out infinite' : 'none',
          }}>
            <span>{String(hh).padStart(2, '0')}</span>
            <span style={{ color: T.dim, animation: 'tc-pulse 1s ease-in-out infinite' }}>:</span>
            <span>{String(mm).padStart(2, '0')}</span>
            <span style={{ color: T.dim, animation: 'tc-pulse 1s ease-in-out infinite' }}>:</span>
            <span>{String(ss).padStart(2, '0')}</span>
          </div>
        )}

        {!started && (
          <div style={{ marginTop: 8, fontSize: 11, color: T.dim }}>
            HH : MM : SS
          </div>
        )}
      </div>

      {/* ── PRIZE / ENTRY COUNT ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr',
        borderTop: `1px solid ${T.border}`, borderBottom: `1px solid ${T.border}`,
      }}>
        {[
          { label: 'Prize Pool', value: prizeFormatted, color: T.gold },
          { label: 'Entries',    value: entries.toLocaleString(), color: T.text },
        ].map((item, i) => (
          <div key={item.label} style={{
            padding: '18px 20px', textAlign: 'center',
            borderRight: i === 0 ? `1px solid ${T.border}` : 'none',
          }}>
            <div style={{ fontSize: 10, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>{item.label}</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: item.color, fontFamily: 'monospace' }}>{item.value}</div>
          </div>
        ))}
      </div>

      {/* ── PREPARE YOUR STRATEGY ── */}
      <div style={{ padding: '22px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 16 }}>
          Prepare Your Strategy
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {TIPS.map(tip => (
            <div key={tip.title} style={{
              display: 'flex', gap: 14, alignItems: 'flex-start',
              background: T.raised,
              border: `1px solid ${T.border}`,
              borderRadius: 10,
              padding: '12px 14px',
            }}>
              <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>{tip.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: T.text, marginBottom: 3 }}>{tip.title}</div>
                <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{tip.body}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── COURSE CTA ── */}
      <div style={{
        borderTop: `1px solid ${T.border}`,
        padding: '16px 20px',
        background: T.raised,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: T.text, marginBottom: 2 }}>
            Brush up while you wait
          </div>
          <div style={{ fontSize: 11, color: T.muted }}>
            A quick $0.99 course could be the edge that cashes you in.
          </div>
        </div>
        <Link
          href="/courses"
          style={{
            padding: '9px 18px',
            background: `linear-gradient(135deg,${T.gold},#d97706)`,
            border: 'none',
            borderRadius: 8,
            color: '#000',
            fontSize: 12,
            fontWeight: 800,
            textDecoration: 'none',
            whiteSpace: 'nowrap',
            flexShrink: 0,
          }}
        >
          Browse $0.99 Courses
        </Link>
      </div>
    </div>
  )
}
