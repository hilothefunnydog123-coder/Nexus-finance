'use client'

interface Trader {
  name: string
  init: string
  pct: number
  rank: number
  color: string
  ai?: boolean
}

interface LiveScoreboardProps {
  traders: Trader[]
  inMoney: number
  contestName: string
  timeLeft: string
  totalEntries: number
}

const MEDAL: Record<number, { icon: string; color: string; border: string }> = {
  1: { icon: '🥇', color: '#ffd700', border: '#ffd700' },
  2: { icon: '🥈', color: '#c0c0c0', border: '#c0c0c0' },
  3: { icon: '🥉', color: '#cd7f32', border: '#cd7f32' },
}

function StatusBadge({ rank, inMoney }: { rank: number; inMoney: number }) {
  if (rank === 1) return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
      background: '#ffd70022', color: '#ffd700', border: '1px solid #ffd70040',
      letterSpacing: '0.05em',
    }}>LEADER</span>
  )
  if (rank <= inMoney) return (
    <span style={{
      fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4,
      background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e30',
      letterSpacing: '0.05em',
    }}>IN $</span>
  )
  return (
    <span style={{
      fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 4,
      background: '#ffffff08', color: '#484f58', border: '1px solid #21262d',
      letterSpacing: '0.05em',
    }}>OUT</span>
  )
}

export default function LiveScoreboard({
  traders,
  inMoney,
  contestName,
  timeLeft,
  totalEntries,
}: LiveScoreboardProps) {
  return (
    <div style={{
      background: '#0d1117',
      border: '1px solid #21262d',
      borderRadius: 12,
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: '#161b22',
        borderBottom: '1px solid #21262d',
        gap: 12,
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#e6edf3', letterSpacing: '0.03em' }}>
          {contestName}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* LIVE dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{
              display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
              background: '#ef4444',
              boxShadow: '0 0 6px #ef4444',
              animation: 'yn-live-pulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', letterSpacing: '0.08em' }}>LIVE</span>
          </div>
          {/* Time left */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#484f58' }}>⏱</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fbbf24' }}>{timeLeft}</span>
          </div>
          {/* Entries */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 10, color: '#484f58' }}>👥</span>
            <span style={{ fontSize: 11, color: '#8b949e' }}>{totalEntries.toLocaleString()} entered</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes yn-live-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
      `}</style>

      {/* Rows */}
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {traders.map((trader) => {
          const medal = MEDAL[trader.rank]
          const isPos = trader.pct >= 0
          const inCash = trader.rank <= inMoney
          const rowBg = trader.rank === 1
            ? '#ffd70008'
            : inCash
              ? '#22c55e06'
              : 'transparent'

          return (
            <div
              key={trader.rank}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                gap: 12,
                background: rowBg,
                borderBottom: '1px solid #21262d',
                borderLeft: medal ? `3px solid ${medal.border}` : '3px solid transparent',
                transition: 'background 0.3s',
              }}
            >
              {/* Medal / rank */}
              <div style={{ width: 24, flexShrink: 0, textAlign: 'center' }}>
                {medal
                  ? <span style={{ fontSize: 16 }}>{medal.icon}</span>
                  : <span style={{ fontSize: 11, fontWeight: 700, color: '#484f58' }}>#{trader.rank}</span>
                }
              </div>

              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                background: trader.color + '33',
                border: `2px solid ${trader.color}66`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 800, color: trader.color,
              }}>
                {trader.init}
              </div>

              {/* Name + AI badge */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: '#e6edf3',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {trader.name}
                  </span>
                  {trader.ai && (
                    <span style={{
                      fontSize: 8, fontWeight: 800, padding: '1px 5px', borderRadius: 3,
                      background: '#a855f722', color: '#a855f7', border: '1px solid #a855f740',
                      letterSpacing: '0.06em', flexShrink: 0,
                    }}>AI</span>
                  )}
                </div>
              </div>

              {/* P&L */}
              <div style={{
                fontSize: 15, fontWeight: 800,
                color: isPos ? '#22c55e' : '#ef4444',
                fontFamily: "'SF Mono', 'Fira Code', monospace",
                letterSpacing: '-0.02em',
                transition: 'color 0.4s',
                flexShrink: 0,
                minWidth: 72,
                textAlign: 'right',
              }}>
                {isPos ? '+' : ''}{trader.pct.toFixed(2)}%
              </div>

              {/* Status badge */}
              <div style={{ flexShrink: 0 }}>
                <StatusBadge rank={trader.rank} inMoney={inMoney} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer note */}
      <div style={{
        padding: '8px 16px',
        background: '#161b22',
        borderTop: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span style={{ fontSize: 8, color: '#22c55e' }}>●</span>
        <span style={{ fontSize: 10, color: '#484f58' }}>
          {inMoney} traders cashing · Top 20% · Updates live
        </span>
      </div>
    </div>
  )
}
