'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, Users, Clock, Zap, TrendingUp, TrendingDown, Crown, Play, ChevronRight, Shield, DollarSign, BarChart2, Flame, Eye, Star } from 'lucide-react'

// ── TYPES ───────────────────────────────────────────────────────────────────

interface Tournament {
  id: string
  title: string
  description: string
  entry_fee_cents: number
  prize_pool_cents: number
  status: string
  participants: number
  max_participants: number
  account_size: number
  allowed: string
  tier: string
  start_time: string
  end_time: string
}

interface LeaderEntry {
  rank: number
  display_name: string
  pnl_percent: number
  pnl: number
  trades: number
}

// ── CONSTANTS ───────────────────────────────────────────────────────────────

const NAMES = ['Marcus T.','Sarah K.','Devon P.','Jordan M.','Aisha B.','Chris L.','Nina R.','Tyler W.','Priya S.','Alex M.','Ryan C.','Zoe H.','Kai N.','Leila F.','Omar J.','Tessa W.','Ben K.','Mia L.','Jake R.','Chloe D.']
const COLORS = ['#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#00d4aa','#ff69b4','#00bfff','#ffa500','#ff4757']
const CHAT = [
  ['🔥 MARCUS IS ON FIRE','ScalpKing'],['bro sarah k cooking rn','xtrader99'],['LETS GOOOO TOP 3 LFG 🚀','TradingBull'],
  ['this is better than netflix fr','ViewerK'],['i been watching for 2 hours 💀','NewTrader22'],['AISHA JUST FLIPPED SHORT 🐻','chartReader'],
  ['who is devon p?? he always wins','CuriousV'],['$1 entry and these guys are PRINTING','SkepticalViewer'],['live trading is the future no cap','VisionaryT'],
  ['jordan m always sneaky top 5','regularViewer'],['NINA WITH THE COMEBACK ARC 🎯','DramaWatch'],['chat is going crazy rn 😂','Mod'],
  ['the leaderboard moving fast af','DataNerd'],['mia L is lowkey top 3 rn 👀','StealthMode'],['BRO THE VOLATILITY 😤','VolTrader'],
  ['who enters the $25 pro showdown??','EliteTrader'],['top 20% getting paid 💰','PrizeHunter'],['i need to enter tomorrow fr','Regret99'],
  ['this makes forex fun again 🔥','FXGod'],['TYLER W WENT NEGATIVE 💀 rekt','BearishSam'],
]
const TICKER_ITEMS = [
  '🔴 MARCUS T. CLOSES +18.4% ON $NVDA — PODIUM LOCKED',
  '⚡ SARAH K. OPENS SHORT BTC/USD — BOLD PLAY',
  '🏆 DAILY BLITZ: $312 PRIZE POOL — 390 TRADERS LIVE',
  '🚀 JORDAN M. CLIMBS TO #4 — MOMENTUM BUILDING',
  '📊 DEVON P. HITS 15 TRADES — MOST ACTIVE TODAY',
  '💰 YESTERDAY\'S WINNERS PAID OUT — $125 TO 1ST PLACE',
  '🎯 AISHA B. REVERSES TO SHORT ON $TSLA',
  '⚡ PRO SHOWDOWN OPENS TOMORROW — $25 ENTRY',
  '🔥 NINA R. +12.8% — CLIMBING FAST',
  '📈 TOP 20% = 78 TRADERS GET PAID TODAY AT 4PM ET',
]
const PAST_WINNERS = [
  { name: 'Marcus T.', prize: '$125', pct: '+24.8%', tourney: 'Daily Blitz', date: 'Yesterday' },
  { name: 'Priya S.', prize: '$752', pct: '+38.2%', tourney: 'Crypto Night', date: '2 days ago' },
  { name: 'Devon P.', prize: '$400', pct: '+31.4%', tourney: 'Pro Showdown', date: '3 days ago' },
  { name: 'Sarah K.', prize: '$125', pct: '+19.7%', tourney: 'Daily Blitz', date: '3 days ago' },
  { name: 'Ryan C.', prize: '$320', pct: '+28.1%', tourney: 'Forex Cup', date: '4 days ago' },
  { name: 'Jordan M.', prize: '$125', pct: '+22.3%', tourney: 'Daily Blitz', date: '4 days ago' },
]

const TIER_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  standard: { color: '#00ff88', bg: '#00ff8812', label: 'STANDARD' },
  premium:  { color: '#1e90ff', bg: '#1e90ff12', label: 'PREMIUM' },
  elite:    { color: '#ffd700', bg: '#ffd70012', label: 'ELITE' },
}

// ── HELPERS ─────────────────────────────────────────────────────────────────

function seeded(i: number, tick: number, range: number, salt = 0) {
  return ((i * 2654435761 + tick * 31337 + salt * 999983) >>> 0) % range
}

function buildBoard(base: LeaderEntry[], tick: number): LeaderEntry[] {
  return base.map((t, i) => {
    const drift = (seeded(i, tick, 280, 3) - 120) / 100
    return { ...t, pnl_percent: +(t.pnl_percent + drift).toFixed(2), pnl: +((t.pnl_percent + drift) * 100) }
  }).sort((a, b) => b.pnl_percent - a.pnl_percent).map((t, i) => ({ ...t, rank: i + 1 }))
}

// ── COMPONENTS ───────────────────────────────────────────────────────────────

function Ticker() {
  return (
    <div style={{ background: '#c0392b', height: 34, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
      <div style={{ background: '#96281b', padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0, zIndex: 1 }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>● LIVE</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        <div className="yn-ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ display: 'inline-block', padding: '0 40px', fontSize: 11, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function Countdown({ end }: { end: string }) {
  const [ms, setMs] = useState(new Date(end).getTime() - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(new Date(end).getTime() - Date.now()), 1000); return () => clearInterval(t) }, [end])
  if (ms <= 0) return <span style={{ color: '#ff4757', fontFamily: 'monospace', fontWeight: 900 }}>ENDED</span>
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <span style={{ fontFamily: 'monospace', fontWeight: 900, letterSpacing: 1 }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}

function TournamentCard({ t, active, onClick }: { t: Tournament; active: boolean; onClick: () => void }) {
  const tier = TIER_STYLE[t.tier] || TIER_STYLE.standard
  const fee = (t.entry_fee_cents / 100).toFixed(t.entry_fee_cents % 100 === 0 ? 0 : 2)
  const pool = (t.prize_pool_cents / 100).toFixed(0)
  const fillPct = Math.round((t.participants / t.max_participants) * 100)

  return (
    <div onClick={onClick} style={{
      background: active ? '#0d1a2a' : '#0a0f1a', border: `1px solid ${active ? tier.color : '#0f1f38'}`,
      borderLeft: `3px solid ${tier.color}`, borderRadius: 12, padding: '14px 16px', cursor: 'pointer', transition: 'all 0.2s',
    }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = tier.color }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.borderColor = '#0f1f38' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
            {t.status === 'live' && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'yn-pulse 1.2s ease-in-out infinite', boxShadow: '0 0 6px #00ff88' }} />}
            <span style={{ fontSize: 9, fontWeight: 800, color: tier.color, letterSpacing: '0.15em', fontFamily: 'monospace' }}>
              {t.status === 'live' ? '● LIVE' : t.status === 'upcoming' ? '◎ UPCOMING' : '✓ ENDED'} · {tier.label}
            </span>
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 2 }}>{t.title}</div>
          <div style={{ fontSize: 10, color: '#4a5e7a' }}>{t.allowed} · ${t.account_size.toLocaleString()} account</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#ffd700', fontFamily: 'monospace' }}>${pool}</div>
          <div style={{ fontSize: 9, color: '#4a5e7a' }}>prize pool</div>
        </div>
      </div>

      {/* Fill bar */}
      <div style={{ height: 3, background: '#0f1f38', borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
        <div style={{ width: `${fillPct}%`, height: '100%', background: `linear-gradient(90deg, ${tier.color}, ${tier.color}aa)`, transition: 'width 1s ease' }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 12, fontSize: 10, color: '#4a5e7a' }}>
          <span><span style={{ color: tier.color, fontWeight: 700 }}>${fee}</span> entry</span>
          <span><Users size={9} style={{ display: 'inline', verticalAlign: 'middle' }} /> {t.participants}/{t.max_participants}</span>
          {t.status === 'live' && <span>Ends <Countdown end={t.end_time} /></span>}
        </div>
        {t.status === 'live' && (
          <span style={{ fontSize: 10, fontWeight: 800, background: `${tier.color}20`, color: tier.color, padding: '3px 10px', borderRadius: 5 }}>
            Enter →
          </span>
        )}
      </div>
    </div>
  )
}

function LeaderRow({ e, inMoney }: { e: LeaderEntry; inMoney: boolean }) {
  const color = COLORS[(e.rank - 1) % COLORS.length]
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '36px 32px 1fr 76px 72px 56px 68px',
      padding: '8px 14px', borderBottom: '1px solid #08111c',
      background: inMoney ? `${color}08` : 'transparent', transition: 'background 0.5s',
    }}>
      <div style={{ fontSize: 14 }}>{e.rank <= 3 ? ['🥇','🥈','🥉'][e.rank-1] : ''}</div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#2a4060', fontFamily: 'monospace', alignSelf: 'center' }}>#{e.rank}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ width: 28, height: 28, borderRadius: 7, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color, flexShrink: 0 }}>
          {e.display_name.slice(0,2).toUpperCase()}
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color: '#cdd6f4' }}>{e.display_name}</span>
      </div>
      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 900, color: e.pnl_percent >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace', alignSelf: 'center' }}>
        {e.pnl_percent >= 0 ? '+' : ''}{e.pnl_percent.toFixed(2)}%
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: e.pnl >= 0 ? '#00cc66' : '#cc2233', fontFamily: 'monospace', alignSelf: 'center' }}>
        {e.pnl >= 0 ? '+' : ''}${Math.abs(e.pnl).toFixed(0)}
      </div>
      <div style={{ textAlign: 'right', fontSize: 11, color: '#4a5e7a', fontFamily: 'monospace', alignSelf: 'center' }}>{e.trades}</div>
      <div style={{ textAlign: 'right', alignSelf: 'center' }}>
        {inMoney
          ? <span style={{ fontSize: 9, color, background: `${color}18`, padding: '2px 7px', borderRadius: 3, fontWeight: 800 }}>PAID</span>
          : <span style={{ fontSize: 9, color: '#1e3a5f', background: '#0a1220', padding: '2px 7px', borderRadius: 3 }}>OUT</span>}
      </div>
    </div>
  )
}

// ── MAIN ────────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [selected, setSelected] = useState<Tournament | null>(null)
  const [baseBoard, setBaseBoard] = useState<LeaderEntry[]>([])
  const [board, setBoard] = useState<LeaderEntry[]>([])
  const [tick, setTick] = useState(0)
  const [viewers, setViewers] = useState(1247)
  const [chatMsgs, setChatMsgs] = useState<{ user: string; text: string; color: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [entering, setEntering] = useState(false)
  const [alert, setAlert] = useState('')
  const [tab, setTab] = useState<'live' | 'upcoming' | 'results'>('live')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatColors = ['#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#ff69b4']

  // Load tournaments
  useEffect(() => {
    fetch('/api/tournaments').then(r => r.json()).then(d => {
      const ts: Tournament[] = d.tournaments || []
      setTournaments(ts)
      const live = ts.find(t => t.status === 'live') || ts[0]
      if (live) setSelected(live)
    })
  }, [])

  // Load leaderboard when tournament selected
  useEffect(() => {
    if (!selected) return
    fetch(`/api/tournaments?id=${selected.id}`).then(r => r.json()).then(d => {
      const lb: LeaderEntry[] = d.leaderboard || []
      setBaseBoard(lb)
      setBoard(lb)
    })
  }, [selected?.id])

  // Tick board every 2s
  useEffect(() => {
    if (!baseBoard.length) return
    const t = setInterval(() => {
      setTick(n => {
        const next = n + 1
        setBoard(buildBoard(baseBoard, next))
        setViewers(v => Math.max(800, v + Math.floor(Math.random() * 9) - 4))
        return next
      })
    }, 2000)
    return () => clearInterval(t)
  }, [baseBoard])

  // Chat stream
  useEffect(() => {
    const add = () => {
      const [text, user] = CHAT[Math.floor(Math.random() * CHAT.length)]
      const color = chatColors[Math.floor(Math.random() * chatColors.length)]
      setChatMsgs(m => [...m.slice(-80), { user, text, color }])
    }
    add()
    const t = setInterval(add, 1200 + Math.random() * 2000)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs.length])

  // Trade alerts
  useEffect(() => {
    const ALERT_MSGS = [
      () => `🔥 ${NAMES[Math.floor(Math.random()*10)]} CLOSES +${(Math.random()*15+3).toFixed(1)}% — MONSTER TRADE`,
      () => `🚀 ${NAMES[Math.floor(Math.random()*10)]} JUMPS TO #${Math.floor(Math.random()*4)+2} — LEADERBOARD SHAKING`,
      () => `⚡ NEW ENTRY — ${NAMES[Math.floor(Math.random()*10)]} JUST JOINED THE TOURNAMENT`,
      () => `💰 PRIZE POOL GROWS — ${Math.floor(Math.random()*5)+1} new entries in the last minute`,
    ]
    const t = setInterval(() => {
      setAlert(ALERT_MSGS[Math.floor(Math.random() * ALERT_MSGS.length)]())
      setTimeout(() => setAlert(''), 4500)
    }, 12000 + Math.random() * 8000)
    return () => clearInterval(t)
  }, [])

  const enterTournament = useCallback(async () => {
    if (!selected) return
    setEntering(true)
    try {
      const res = await fetch('/api/stripe/tournament/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selected.id,
          tournamentTitle: selected.title,
          entryFeeCents: selected.entry_fee_cents,
          tier: selected.tier,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else if (data.demo) {
        window.alert('Demo mode — add your Stripe key in Netlify env vars to accept real payments')
      }
    } catch {
      window.alert('Something went wrong — try again')
    } finally {
      setEntering(false)
    }
  }, [selected])

  const sendChat = () => {
    if (!chatInput.trim()) return
    const color = chatColors[Math.floor(Math.random() * chatColors.length)]
    setChatMsgs(m => [...m.slice(-80), { user: 'You', text: chatInput, color }])
    setChatInput('')
  }

  const inMoney = Math.ceil(board.length * 0.2)
  const live = tournaments.filter(t => t.status === 'live')
  const upcoming = tournaments.filter(t => t.status === 'upcoming')
  const tier = selected ? (TIER_STYLE[selected.tier] || TIER_STYLE.standard) : TIER_STYLE.standard

  return (
    <div style={{ background: '#04080f', minHeight: '100vh', color: '#e8e8f0', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <style>{`
        .yn-ticker-inner { display: inline-flex; animation: yn-ticker 38s linear infinite; will-change: transform; }
        @keyframes yn-ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        @keyframes yn-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.75)} }
        @keyframes yn-glow { 0%,100%{box-shadow:0 0 16px rgba(0,255,136,0.3)} 50%{box-shadow:0 0 44px rgba(0,255,136,0.7)} }
        @keyframes yn-popin { from{opacity:0;transform:translateX(64px) scale(0.85)} to{opacity:1;transform:translateX(0) scale(1)} }
        @keyframes yn-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-track{background:#08111c} ::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:3px}
      `}</style>

      {/* Alert popup */}
      {alert && (
        <div style={{ position: 'fixed', top: 70, right: 20, zIndex: 9999, background: 'linear-gradient(135deg, #00ff88, #00cc66)', borderRadius: 12, padding: '12px 18px', maxWidth: 340, boxShadow: '0 0 48px rgba(0,255,136,0.55)', animation: 'yn-popin 0.35s cubic-bezier(0.34,1.56,0.64,1)', fontSize: 13, fontWeight: 800, color: '#04080f', lineHeight: 1.4 }}>
          {alert}
        </div>
      )}

      {/* ── TICKER ── */}
      <Ticker />

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(4,8,15,0.98)', borderBottom: '1px solid #0d1826', padding: '0 20px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', height: 54, gap: 16 }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #ffd700, #ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'yn-glow 2.5s ease-in-out infinite' }}>
              <Trophy size={16} color="#04080f" fill="#04080f" />
            </div>
            <div style={{ lineHeight: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: -0.3 }}>YN Arena</div>
              <div style={{ fontSize: 8, color: '#ffd700', letterSpacing: 3, textTransform: 'uppercase' }}>Live Trading Tournaments</div>
            </div>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ff1744', borderRadius: 4, padding: '3px 9px', flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.18em' }}>LIVE</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7f93b5' }}>
            <Eye size={11} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#cdd6f4' }}>{viewers.toLocaleString()}</span>
            <span>watching</span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/" style={{ fontSize: 11, color: '#2a4060', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>← Home</Link>
            <Link href="/courses" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>Courses</Link>
            <Link href="/app" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>Terminal</Link>
            {selected && (
              <button onClick={enterTournament} disabled={entering}
                style={{ fontSize: 12, fontWeight: 900, background: entering ? '#0a1620' : 'linear-gradient(135deg, #ffd700, #ff6b35)', color: entering ? '#4a5e7a' : '#04080f', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: entering ? 'not-allowed' : 'pointer', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>
                {entering ? 'Loading…' : `⚡ Enter — $${(selected.entry_fee_cents / 100).toFixed(0)}`}
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* ── TOURNAMENT BANNER ── */}
      {selected && (
        <div style={{ background: 'linear-gradient(135deg, #08111c 0%, #0a1520 100%)', borderBottom: '1px solid #0d1826', padding: '12px 20px' }}>
          <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 160 }}>
              <div style={{ fontSize: 10, color: tier.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 3 }}>
                🏆 {selected.title} · {selected.allowed}
              </div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#fff' }}>
                {selected.status === 'live'
                  ? <>Closes in <span style={{ color: '#ff6b35' }}><Countdown end={selected.end_time} /></span></>
                  : <>Opens {new Date(selected.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ET</>}
              </div>
            </div>
            {[
              { label: 'Prize Pool', value: `$${(selected.prize_pool_cents / 100).toFixed(0)}`, color: '#ffd700' },
              { label: 'Traders', value: selected.participants.toString(), color: '#00ff88' },
              { label: 'Entry', value: `$${(selected.entry_fee_cents / 100).toFixed(0)}`, color: '#1e90ff' },
              { label: 'Win Rate', value: '20%', color: '#bf5fff' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: 'center', background: '#0a0f1a', border: `1px solid ${color}20`, borderRadius: 10, padding: '8px 16px', minWidth: 80 }}>
                <div style={{ fontSize: 18, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
              </div>
            ))}
            <button onClick={enterTournament} disabled={entering}
              style={{ fontSize: 13, fontWeight: 900, background: entering ? '#0a1620' : 'linear-gradient(135deg, #00ff88, #00cc66)', color: entering ? '#4a5e7a' : '#04080f', border: 'none', borderRadius: 10, padding: '12px 24px', cursor: entering ? 'not-allowed' : 'pointer', boxShadow: '0 0 28px rgba(0,255,136,0.35)', animation: 'yn-glow 2.5s ease-in-out infinite', whiteSpace: 'nowrap' }}>
              ⚡ ENTER NOW
            </button>
          </div>
        </div>
      )}

      {/* ── MAIN ── */}
      <div style={{ flex: 1, maxWidth: 1440, margin: '0 auto', width: '100%', padding: '14px 20px', display: 'grid', gridTemplateColumns: '300px 1fr 280px', gap: 14, minHeight: 0 }}>

        {/* ── COL 1: Tournament Selector ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>

          {/* Tabs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', border: '1px solid #0d1826', borderRadius: 10, overflow: 'hidden' }}>
            {(['live','upcoming','results'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                style={{ padding: '8px 4px', fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer', fontFamily: 'monospace', transition: 'all 0.15s',
                  background: tab === t ? '#0d1826' : 'transparent',
                  color: tab === t ? (t === 'live' ? '#00ff88' : '#cdd6f4') : '#2a4060',
                  borderBottom: tab === t ? `2px solid ${t === 'live' ? '#00ff88' : '#4a5e7a'}` : '2px solid transparent',
                }}>
                {t === 'live' ? '● LIVE' : t === 'upcoming' ? '◎ SOON' : '✓ DONE'}
              </button>
            ))}
          </div>

          {/* Stats */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontSize: 9, color: '#2a4060', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Today</div>
            {[
              { label: 'Total Prize Pool', value: `$${tournaments.reduce((s,t) => s + t.prize_pool_cents/100, 0).toFixed(0)}`, color: '#ffd700' },
              { label: 'Active Traders', value: tournaments.filter(t=>t.status==='live').reduce((s,t)=>s+t.participants,0).toString(), color: '#00ff88' },
              { label: 'Tournaments Live', value: tournaments.filter(t=>t.status==='live').length.toString(), color: '#ff6b35' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #080f18' }}>
                <span style={{ fontSize: 10, color: '#4a5e7a' }}>{label}</span>
                <span style={{ fontSize: 12, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
              </div>
            ))}
          </div>

          {/* Tournament list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto' }}>
            {tab === 'live' && tournaments.filter(t=>t.status==='live').map(t => (
              <TournamentCard key={t.id} t={t} active={selected?.id === t.id} onClick={() => setSelected(t)} />
            ))}
            {tab === 'upcoming' && tournaments.filter(t=>t.status!=='live'&&t.status!=='ended').map(t => (
              <TournamentCard key={t.id} t={t} active={selected?.id === t.id} onClick={() => setSelected(t)} />
            ))}
            {tab === 'results' && (
              <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '10px 14px', borderBottom: '1px solid #080f18', fontSize: 10, fontWeight: 800, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Recent Winners</div>
                {PAST_WINNERS.map((w, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderBottom: '1px solid #080f18' }}>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: '#00ff8818', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: '#00ff88', flexShrink: 0 }}>
                      {w.name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{w.name}</div>
                      <div style={{ fontSize: 9, color: '#4a5e7a' }}>{w.tourney} · {w.date}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 900, color: '#ffd700', fontFamily: 'monospace' }}>{w.prize}</div>
                      <div style={{ fontSize: 9, color: '#00ff88', fontFamily: 'monospace' }}>{w.pct}</div>
                    </div>
                  </div>
                ))}
                <div style={{ padding: '10px 14px', fontSize: 10, color: '#4a5e7a', textAlign: 'center' }}>
                  $2,847 paid out in the last 7 days
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── COL 2: Leaderboard ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minWidth: 0 }}>

          {/* Podium */}
          {board.length >= 3 && (
            <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Crown size={14} color="#ffd700" />
                <span style={{ fontSize: 11, fontWeight: 900, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Podium</span>
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                  {selected?.status === 'live' && <><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'yn-pulse 1.2s ease-in-out infinite' }} /><span style={{ fontSize: 9, color: '#00ff88', fontFamily: 'monospace' }}>LIVE · 2s</span></>}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {board.slice(0,3).map((e, i) => {
                  const amounts = [Math.floor((selected?.prize_pool_cents||0) * 0.004), Math.floor((selected?.prize_pool_cents||0) * 0.0025), Math.floor((selected?.prize_pool_cents||0) * 0.0015)]
                  const medals = ['🥇','🥈','🥉']
                  const color = COLORS[i]
                  return (
                    <div key={e.display_name} style={{ background: i === 0 ? 'rgba(255,215,0,0.06)' : '#0d1520', border: `1px solid ${i===0?'#ffd70030':'#0d1826'}`, borderRadius: 10, padding: '14px 12px', textAlign: 'center', transition: 'all 0.4s' }}>
                      <div style={{ fontSize: 24, marginBottom: 6 }}>{medals[i]}</div>
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: `${color}22`, border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', fontSize: 12, fontWeight: 900, color }}>{e.display_name.slice(0,2).toUpperCase()}</div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff', marginBottom: 3 }}>{e.display_name}</div>
                      <div style={{ fontSize: 18, fontWeight: 900, color: e.pnl_percent >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>{e.pnl_percent >= 0 ? '+' : ''}{e.pnl_percent.toFixed(2)}%</div>
                      <div style={{ fontSize: 10, color: '#ffd700', fontWeight: 800, fontFamily: 'monospace', marginTop: 3 }}>${amounts[i]} prize</div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Full scoreboard */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '11px 14px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 10, background: '#0d1826' }}>
              <Flame size={13} color="#ff6b35" />
              <span style={{ fontSize: 11, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Scoreboard</span>
              <span style={{ fontSize: 10, color: '#4a5e7a' }}>— {board.length} traders · {inMoney} in the money</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '36px 32px 1fr 76px 72px 56px 68px', padding: '6px 14px', borderBottom: '1px solid #080f18' }}>
              {['','RK','TRADER','P&L %','P&L $','TRADES','STATUS'].map(h => (
                <div key={h} style={{ fontSize: 8, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em', textAlign: h === 'P&L %' || h === 'P&L $' || h === 'TRADES' ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {board.map((e, i) => <LeaderRow key={e.display_name} e={e} inMoney={i < inMoney} />)}
            </div>
          </div>
        </div>

        {/* ── COL 3: Chat + Enter ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Enter CTA */}
          {selected && (
            <div style={{ background: 'linear-gradient(135deg, #091808, #081520)', border: '1px solid #00ff8825', borderRadius: 12, padding: '18px 16px' }}>
              <div style={{ fontSize: 10, color: '#00ff88', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>You&apos;re spectating</div>
              <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Want a shot at ${(selected.prize_pool_cents/100).toFixed(0)}?</div>
              <div style={{ fontSize: 11, color: '#7f93b5', marginBottom: 14, lineHeight: 1.6 }}>
                ${(selected.entry_fee_cents/100).toFixed(0)} entry · ${selected.account_size.toLocaleString()} account · trade until {new Date(selected.end_time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})} ET
              </div>
              <button onClick={enterTournament} disabled={entering}
                style={{ width: '100%', padding: '12px', background: entering ? '#0a1620' : 'linear-gradient(135deg, #00ff88, #00cc66)', color: entering ? '#4a5e7a' : '#04080f', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 900, cursor: entering ? 'not-allowed' : 'pointer', boxShadow: '0 0 20px rgba(0,255,136,0.3)', animation: 'yn-glow 2.5s ease-in-out infinite', letterSpacing: 0.5 }}>
                {entering ? 'Redirecting…' : '⚡ ENTER FOR $' + (selected.entry_fee_cents/100).toFixed(0)}
              </button>
              <div style={{ fontSize: 9, color: '#1e3a5f', textAlign: 'center', marginTop: 8 }}>Simulated trading · Real prizes · Stripe checkout</div>
            </div>
          )}

          {/* Live Chat */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 8, background: '#0d1826', flexShrink: 0 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#bf5fff', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Arena Chat</span>
              <span style={{ fontSize: 10, color: '#4a5e7a' }}>{viewers.toLocaleString()}</span>
              <div style={{ marginLeft: 'auto', fontSize: 8, color: '#bf5fff', background: '#bf5fff15', padding: '2px 6px', borderRadius: 3, letterSpacing: '0.1em' }}>LIVE</div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 3 }}>
              {chatMsgs.map((m, i) => (
                <div key={i} style={{ fontSize: 12, lineHeight: 1.5, animation: i === chatMsgs.length - 1 ? 'yn-fadein 0.25s ease' : 'none' }}>
                  <span style={{ fontWeight: 800, color: m.color, marginRight: 5 }}>{m.user}</span>
                  <span style={{ color: '#cdd6f4' }}>{m.text}</span>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ padding: '8px 10px', borderTop: '1px solid #0d1826', display: 'flex', gap: 6, flexShrink: 0 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Say something…"
                style={{ flex: 1, background: '#0d1826', border: '1px solid #1a2d4a', borderRadius: 7, padding: '7px 11px', color: '#cdd6f4', fontSize: 12, outline: 'none' }} />
              <button onClick={sendChat} style={{ background: '#bf5fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#fff' }}>Chat</button>
            </div>
          </div>

          {/* Rules */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Shield size={11} /> Rules
            </div>
            {[
              ['💵','Entry', 'Pay entry fee via Stripe. You get a simulated account.'],
              ['📊','Trade', 'Trade any allowed instrument during tournament hours.'],
              ['🏆','Win', 'Top 20% of traders by P&L% get paid.'],
              ['💰','Payout', '1st: 40% · 2nd: 25% · 3rd: 15% · Rest splits 20%'],
            ].map(([icon, title, desc]) => (
              <div key={title} style={{ display: 'flex', gap: 9, marginBottom: 9 }}>
                <span style={{ fontSize: 14, flexShrink: 0 }}>{icon}</span>
                <div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#cdd6f4' }}>{title}: </span>
                  <span style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5 }}>{desc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── BOTTOM BAR ── */}
      <div style={{ borderTop: '1px solid #0d1826', background: '#08111c', padding: '8px 20px' }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ fontSize: 10, color: '#2a4060', fontFamily: 'monospace' }}>All tournaments use simulated accounts only · Prize payouts via Stripe · Not financial advice</div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 14, fontSize: 11 }}>
            <Link href="/" style={{ color: '#2a4060', textDecoration: 'none' }}>YN Finance</Link>
            <Link href="/courses" style={{ color: '#2a4060', textDecoration: 'none' }}>Courses</Link>
            <Link href="/app" style={{ color: '#2a4060', textDecoration: 'none' }}>Terminal</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
