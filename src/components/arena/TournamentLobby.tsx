'use client'

import { useState, useEffect, useRef } from 'react'
import { Trophy, Users, Clock, Zap, TrendingUp, TrendingDown, Crown, Play, Lock } from 'lucide-react'

interface Trader {
  rank: number
  name: string
  pnl: number
  pnlPct: number
  trades: number
  color: string
}

interface Tournament {
  id: string
  title: string
  status: 'live' | 'upcoming' | 'ended'
  entryFee: number
  prizePool: number
  participants: number
  maxParticipants: number
  startTime: Date
  endTime: Date
  accountSize: number
  instrument: string
}

const COLORS = ['#00d4aa','#1e90ff','#a855f7','#ffa502','#ff4757','#00d4aa','#1e90ff','#a855f7','#ffa502','#ff4757']

const NAMES = ['Marcus T.','Sarah K.','Devon P.','Jordan M.','Aisha B.','Chris L.','Nina R.','Tyler W.','Priya S.','Alex M.',
  'Ryan C.','Zoe H.','Kai N.','Leila F.','Omar J.','Tessa W.','Ben K.','Mia L.','Jake R.','Chloe D.']

function genLeaderboard(count: number, elapsed: number): Trader[] {
  return Array.from({ length: count }, (_, i) => {
    const seed = (i * 2654435761 + elapsed * 31337) >>> 0
    const pnlPct = ((seed % 4000) - 1500) / 100
    return {
      rank: i + 1,
      name: NAMES[i % NAMES.length],
      pnl: (10000 * pnlPct) / 100,
      pnlPct,
      trades: 3 + (seed % 18),
      color: COLORS[i % COLORS.length],
    }
  }).sort((a, b) => b.pnlPct - a.pnlPct).map((t, i) => ({ ...t, rank: i + 1 }))
}

function genTournaments(): Tournament[] {
  const now = new Date()
  const open = new Date(now); open.setHours(9, 30, 0, 0)
  const close = new Date(now); close.setHours(16, 0, 0, 0)
  const tmrOpen = new Date(now); tmrOpen.setDate(tmrOpen.getDate() + 1); tmrOpen.setHours(9, 30, 0, 0)
  const tmrClose = new Date(now); tmrClose.setDate(tmrClose.getDate() + 1); tmrClose.setHours(16, 0, 0, 0)
  const yestOpen = new Date(now); yestOpen.setDate(yestOpen.getDate() - 1); yestOpen.setHours(9, 30, 0, 0)
  const yestClose = new Date(now); yestClose.setDate(yestClose.getDate() - 1); yestClose.setHours(16, 0, 0, 0)

  return [
    { id: 't1', title: "Daily Blitz — Market Hours", status: 'live', entryFee: 1, prizePool: 312, participants: 390, maxParticipants: 500, startTime: open, endTime: close, accountSize: 10000, instrument: 'All Markets' },
    { id: 't2', title: "Crypto Night Session", status: 'live', entryFee: 5, prizePool: 940, participants: 188, maxParticipants: 250, startTime: open, endTime: close, accountSize: 25000, instrument: 'Crypto Only' },
    { id: 't3', title: "Tomorrow's Opening Bell", status: 'upcoming', entryFee: 1, prizePool: 0, participants: 47, maxParticipants: 500, startTime: tmrOpen, endTime: tmrClose, accountSize: 10000, instrument: 'All Markets' },
    { id: 't4', title: "Weekend Forex Cup", status: 'upcoming', entryFee: 10, prizePool: 0, participants: 23, maxParticipants: 200, startTime: tmrOpen, endTime: tmrClose, accountSize: 50000, instrument: 'Forex Only' },
    { id: 't5', title: "Yesterday's Blitz — Results", status: 'ended', entryFee: 1, prizePool: 284, participants: 355, maxParticipants: 500, startTime: yestOpen, endTime: yestClose, accountSize: 10000, instrument: 'All Markets' },
  ]
}

function Countdown({ endTime }: { endTime: Date }) {
  const [diff, setDiff] = useState(endTime.getTime() - Date.now())
  useEffect(() => {
    const t = setInterval(() => setDiff(endTime.getTime() - Date.now()), 1000)
    return () => clearInterval(t)
  }, [endTime])
  if (diff <= 0) return <span style={{ color: '#ff4757', fontFamily: 'monospace', fontSize: 12 }}>ENDED</span>
  const h = Math.floor(diff / 3600000)
  const m = Math.floor((diff % 3600000) / 60000)
  const s = Math.floor((diff % 60000) / 1000)
  return <span style={{ color: '#00d4aa', fontFamily: 'monospace', fontSize: 12 }}>{h}h {m}m {s}s</span>
}

function LiveLeaderboard({ tournament }: { tournament: Tournament }) {
  const [traders, setTraders] = useState<Trader[]>([])
  const tickRef = useRef(0)

  useEffect(() => {
    setTraders(genLeaderboard(Math.min(tournament.participants, 10), 0))
    const t = setInterval(() => {
      tickRef.current++
      setTraders(genLeaderboard(Math.min(tournament.participants, 10), tickRef.current))
    }, 2000)
    return () => clearInterval(t)
  }, [tournament.participants])

  const topCut = Math.ceil(traders.length * 0.2)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {traders.map((t, i) => (
        <div key={t.name} style={{
          display: 'flex', alignItems: 'center', gap: 10, padding: '7px 12px', borderRadius: 8,
          background: i < topCut ? `${t.color}0d` : '#071220',
          border: `1px solid ${i < topCut ? t.color + '30' : '#1a2d4a'}`,
          transition: 'all 0.4s ease',
        }}>
          <div style={{ width: 22, textAlign: 'center', fontSize: 11, fontWeight: 800, fontFamily: 'monospace',
            color: i === 0 ? '#ffa502' : i === 1 ? '#7f93b5' : i === 2 ? '#cd7f32' : '#4a5e7a' }}>
            {i === 0 ? '👑' : `#${t.rank}`}
          </div>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
            {t.name.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#cdd6f4' }}>{t.name}</div>
          <div style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{t.trades} trades</div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 13, fontWeight: 900, color: t.pnl >= 0 ? '#00d4aa' : '#ff4757', fontFamily: 'monospace' }}>
              {t.pnl >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
            </div>
            <div style={{ fontSize: 9, color: '#4a5e7a', fontFamily: 'monospace' }}>
              {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(0)}
            </div>
          </div>
          {i < topCut && <div style={{ fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 6px', borderRadius: 3, fontWeight: 700, whiteSpace: 'nowrap' }}>IN MONEY</div>}
        </div>
      ))}
      <div style={{ fontSize: 10, color: '#4a5e7a', textAlign: 'center', marginTop: 4 }}>
        Showing top 10 of {tournament.participants.toLocaleString()} traders · Updates live
      </div>
    </div>
  )
}

function TournamentCard({ t, onSelect, selected }: { t: Tournament; onSelect: () => void; selected: boolean }) {
  const statusColor = t.status === 'live' ? '#00d4aa' : t.status === 'upcoming' ? '#ffa502' : '#4a5e7a'
  const prize = t.status === 'live' || t.status === 'ended' ? t.prizePool : Math.floor(t.participants * t.entryFee * 0.8)

  return (
    <div
      onClick={onSelect}
      style={{
        background: selected ? '#0a1628' : '#071220',
        border: `1px solid ${selected ? statusColor : '#1a2d4a'}`,
        borderLeft: `3px solid ${statusColor}`,
        borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: 'all 0.2s',
        boxShadow: selected ? `0 0 24px ${statusColor}18` : 'none',
      }}
      onMouseEnter={e => !selected && ((e.currentTarget as HTMLElement).style.borderColor = statusColor)}
      onMouseLeave={e => !selected && ((e.currentTarget as HTMLElement).style.borderColor = '#1a2d4a')}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            {t.status === 'live' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />}
            <span style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: statusColor, fontFamily: 'monospace' }}>
              {t.status === 'live' ? 'LIVE NOW' : t.status === 'upcoming' ? 'UPCOMING' : 'ENDED'}
            </span>
            <span style={{ fontSize: 9, color: '#4a5e7a', background: '#0f1f38', padding: '1px 6px', borderRadius: 3 }}>{t.instrument}</span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{t.title}</div>
          <div style={{ fontSize: 11, color: '#4a5e7a' }}>${t.accountSize.toLocaleString()} simulated account</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#ffa502', fontFamily: 'monospace' }}>${prize.toLocaleString()}</div>
          <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prize Pool</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
        {[
          { icon: <Zap size={10} />, label: 'Entry', value: `$${t.entryFee}` },
          { icon: <Users size={10} />, label: 'Traders', value: `${t.participants.toLocaleString()}/${t.maxParticipants.toLocaleString()}` },
          { icon: <Trophy size={10} />, label: 'Top 20% win', value: `${Math.ceil(t.participants * 0.2)} spots` },
        ].map(({ icon, label, value }) => (
          <div key={label} style={{ background: '#040c14', borderRadius: 6, padding: '6px 8px', textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, color: '#4a5e7a', marginBottom: 2 }}>{icon}<span style={{ fontSize: 9 }}>{label}</span></div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#cdd6f4', fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t.status === 'live' && <div style={{ fontSize: 11, color: '#4a5e7a' }}>Closes in <Countdown endTime={t.endTime} /></div>}
        {t.status === 'upcoming' && <div style={{ fontSize: 11, color: '#4a5e7a' }}>Opens {t.startTime.toLocaleDateString()} 9:30 AM ET</div>}
        {t.status === 'ended' && <div style={{ fontSize: 11, color: '#4a5e7a' }}>Ended · Results final</div>}

        {t.status === 'live' && (
          <button style={{ fontSize: 11, fontWeight: 800, background: '#00d4aa', color: '#040c14', border: 'none', borderRadius: 8, padding: '7px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5 }}>
            <Play size={10} fill="currentColor" /> Enter for ${t.entryFee}
          </button>
        )}
        {t.status === 'upcoming' && (
          <button style={{ fontSize: 11, fontWeight: 800, background: '#ffa50220', color: '#ffa502', border: '1px solid #ffa50240', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}>
            Register — ${t.entryFee}
          </button>
        )}
        {t.status === 'ended' && (
          <button style={{ fontSize: 11, fontWeight: 700, background: 'none', color: '#4a5e7a', border: '1px solid #1a2d4a', borderRadius: 8, padding: '7px 16px', cursor: 'pointer' }}>
            View Results
          </button>
        )}
      </div>

      {t.participants >= t.maxParticipants * 0.9 && t.status !== 'ended' && (
        <div style={{ marginTop: 8, fontSize: 10, color: '#ffa502', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#ffa502', display: 'inline-block' }} />
          Almost full — {t.maxParticipants - t.participants} spots left
        </div>
      )}
    </div>
  )
}

export default function TournamentLobby() {
  const [tournaments] = useState<Tournament[]>(genTournaments)
  const [selected, setSelected] = useState<Tournament>(tournaments[0])
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all')

  const filtered = tournaments.filter(t => filter === 'all' || t.status === filter)

  const liveCount = tournaments.filter(t => t.status === 'live').length
  const totalPrize = tournaments.filter(t => t.status === 'live').reduce((s, t) => s + t.prizePool, 0)
  const totalTraders = tournaments.filter(t => t.status === 'live').reduce((s, t) => s + t.participants, 0)

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden" style={{ background: '#040c14' }}>
      <style>{`
        @keyframes yn-pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.5; transform:scale(0.85) } }
      `}</style>

      {/* Left: tournament list */}
      <div style={{ width: 420, minWidth: 420, borderRight: '1px solid #1a2d4a', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', background: '#071220' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #ffa502, #ff4757)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={15} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>YN Arena</div>
              <div style={{ fontSize: 10, color: '#4a5e7a' }}>Live trading tournaments · Top 20% win</div>
            </div>
          </div>

          {/* Live stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Live Now', value: liveCount, color: '#00d4aa' },
              { label: 'Prize Pool', value: `$${totalPrize.toLocaleString()}`, color: '#ffa502' },
              { label: 'Competing', value: totalTraders.toLocaleString(), color: '#1e90ff' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#040c14', borderRadius: 8, padding: '8px 10px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #1a2d4a' }}>
          {(['all', 'live', 'upcoming', 'ended'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex: 1, padding: '9px 4px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer', transition: 'all 0.15s', fontFamily: 'monospace',
                background: filter === f ? '#071220' : 'transparent',
                color: filter === f ? '#00d4aa' : '#4a5e7a',
                borderBottom: filter === f ? '2px solid #00d4aa' : '2px solid transparent',
              }}>
              {f === 'live' ? `🔴 ${f}` : f}
            </button>
          ))}
        </div>

        {/* Tournament list */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(t => (
              <TournamentCard key={t.id} t={t} selected={selected.id === t.id} onSelect={() => setSelected(t)} />
            ))}
          </div>
        </div>
      </div>

      {/* Right: leaderboard / detail */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Detail header */}
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #1a2d4a', background: '#071220', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              {selected.status === 'live' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />}
              <span style={{ fontSize: 16, fontWeight: 900, color: '#fff' }}>{selected.title}</span>
            </div>
            <div style={{ fontSize: 11, color: '#4a5e7a' }}>
              {selected.participants.toLocaleString()} traders · ${selected.accountSize.toLocaleString()} account · {selected.instrument}
              {selected.status === 'live' && <> · Closes in <Countdown endTime={selected.endTime} /></>}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#ffa502', fontFamily: 'monospace' }}>
              ${(selected.status === 'live' || selected.status === 'ended' ? selected.prizePool : Math.floor(selected.participants * selected.entryFee * 0.8)).toLocaleString()}
            </div>
            <div style={{ fontSize: 10, color: '#4a5e7a' }}>PRIZE POOL</div>
          </div>
        </div>

        {/* Payout structure */}
        <div style={{ padding: '12px 24px', borderBottom: '1px solid #1a2d4a', display: 'flex', gap: 12 }}>
          {[
            { rank: '1st', cut: '40%', color: '#ffa502' },
            { rank: '2nd', cut: '25%', color: '#7f93b5' },
            { rank: '3rd', cut: '15%', color: '#cd7f32' },
            { rank: 'Top 20%', cut: 'Remaining split', color: '#4a5e7a' },
          ].map(({ rank, cut, color }) => (
            <div key={rank} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '8px 14px', textAlign: 'center', flex: 1 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color, fontFamily: 'monospace' }}>{rank}</div>
              <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 2 }}>{cut}</div>
            </div>
          ))}
        </div>

        {/* Leaderboard */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#7f93b5', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 6 }}>
              {selected.status === 'live' && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />}
              Live Leaderboard
            </div>
            {selected.status === 'live' && <div style={{ fontSize: 9, color: '#4a5e7a', fontFamily: 'monospace' }}>Updates every 2s</div>}
          </div>

          {selected.status !== 'upcoming' ? (
            <LiveLeaderboard tournament={selected} />
          ) : (
            <div style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: '#ffa50215', border: '1px solid #ffa50230', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Clock size={26} color="#ffa502" />
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#cdd6f4', marginBottom: 8 }}>Tournament not started yet</div>
              <div style={{ fontSize: 12, color: '#4a5e7a', marginBottom: 24 }}>
                {selected.participants.toLocaleString()} traders registered · Leaderboard goes live at open
              </div>
              <button style={{ fontSize: 13, fontWeight: 800, background: '#ffa502', color: '#040c14', border: 'none', borderRadius: 10, padding: '12px 28px', cursor: 'pointer' }}>
                Register Now — ${selected.entryFee}
              </button>
            </div>
          )}
        </div>

        {/* Spectator notice */}
        {selected.status === 'live' && (
          <div style={{ padding: '12px 24px', borderTop: '1px solid #1a2d4a', background: '#071220', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: '#4a5e7a' }}>
              You are <strong style={{ color: '#7f93b5' }}>spectating</strong> — watching live P&L of all {selected.participants.toLocaleString()} traders
            </div>
            <button style={{ fontSize: 12, fontWeight: 800, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', color: '#040c14', border: 'none', borderRadius: 8, padding: '9px 20px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Zap size={12} fill="currentColor" /> Join Tournament — ${selected.entryFee}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
