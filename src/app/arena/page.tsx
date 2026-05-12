'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Users, Eye, Clock, ArrowRight, Zap, ChevronRight, TrendingUp, TrendingDown, Radio, Star } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:      '#09090b',
  surface: '#18181b',
  raised:  '#27272a',
  border:  '#3f3f46',
  green:   '#22c55e',
  purple:  '#a855f7',
  gold:    '#eab308',
  red:     '#ef4444',
  blue:    '#3b82f6',
  text:    '#fafafa',
  muted:   '#a1a1aa',
  dim:     '#52525b',
}

// ─── SEEDED DATA ──────────────────────────────────────────────────────────────
const TRADERS = [
  { name: 'Marcus T.',  init: 'MT', base: 18.4,  color: C.green  },
  { name: 'Sarah K.',   init: 'SK', base: 14.1,  color: C.gold   },
  { name: 'Devon P.',   init: 'DP', base: 11.7,  color: C.blue   },
  { name: 'Jordan M.',  init: 'JM', base:  9.3,  color: C.purple },
  { name: 'Aisha B.',   init: 'AB', base:  7.2,  color: C.green  },
  { name: 'Chris L.',   init: 'CL', base:  4.8,  color: C.gold   },
  { name: 'Nina R.',    init: 'NR', base:  2.9,  color: C.blue   },
  { name: 'Tyler W.',   init: 'TW', base: -1.4,  color: C.purple },
  { name: 'Priya S.',   init: 'PS', base: -4.1,  color: C.red    },
  { name: 'Alex M.',    init: 'AM', base: -6.8,  color: C.red    },
  { name: 'YN-ALPHA',  init: 'AI', base:  5.3,  color: C.purple, isAI: true },
  { name: 'YN-BETA',   init: 'AI', base: -2.7,  color: C.dim,    isAI: true },
]

const TOURNAMENTS = [
  { id: 'daily-blitz',   name: 'Daily Blitz',     fee: 10,  max: 500,  filled: 390, allowed: 'All Markets',  color: C.green,  tier: 'OPEN'    },
  { id: 'crypto-night',  name: 'Crypto Night',    fee: 25,  max: 250,  filled: 188, allowed: 'Crypto Only',  color: C.purple, tier: 'OPEN'    },
  { id: 'pro-showdown',  name: 'Pro Showdown',    fee: 100, max: 100,  filled: 44,  allowed: 'All Markets',  color: C.gold,   tier: 'ELITE'   },
  { id: 'futures-arena', name: 'Futures Arena',   fee: 50,  max: 150,  filled: 67,  allowed: 'Futures Only', color: C.blue,   tier: 'OPEN'    },
  { id: 'h2h-duel',      name: 'H2H Duel',        fee: 10,  max: 2,    filled: 1,   allowed: 'All Markets',  color: '#f97316',tier: '1v1'     },
  { id: 'weekly-mega',   name: 'Weekly Mega',     fee: 25,  max: 1000, filled: 712, allowed: 'All Markets',  color: C.gold,   tier: 'MEGA'    },
]

const STREAMS = [
  { name: 'Marcus T.',  init: 'MT', asset: 'AAPL',    tf: '5',   pct:  18.4, viewers: 2847, color: C.green  },
  { name: 'Sarah K.',   init: 'SK', asset: 'BTC/USD', tf: '60',  pct:  14.1, viewers: 1654, color: C.gold   },
  { name: 'Devon P.',   init: 'DP', asset: 'EUR/USD', tf: '15',  pct:   7.8, viewers:  987, color: C.blue   },
  { name: 'Aisha B.',   init: 'AB', asset: 'NVDA',    tf: 'D',   pct:  22.3, viewers: 1432, color: C.purple },
  { name: 'Jordan M.',  init: 'JM', asset: 'SPY',     tf: '1',   pct:  -3.2, viewers:  743, color: C.red    },
  { name: 'Nina R.',    init: 'NR', asset: 'ETH/USD', tf: '240', pct:   9.1, viewers:  521, color: '#f97316'},
]

const WINS = [
  { name: 'Marcus T.',  pct: '+241%', entry: '$10',  won: '$34.10', contest: 'Daily Blitz',    date: 'Today'      },
  { name: 'Priya S.',   pct: '+382%', entry: '$25',  won: '$120.50',contest: 'Crypto Night',   date: 'Yesterday'  },
  { name: 'Devon P.',   pct: '+198%', entry: '$100', won: '$298.00',contest: 'Pro Showdown',   date: '2 days ago' },
  { name: 'Sarah K.',   pct: '+156%', entry: '$10',  won: '$25.60', contest: 'Daily Blitz',    date: '2 days ago' },
  { name: 'Ryan C.',    pct: '+312%', entry: '$25',  won: '$103.00',contest: 'Futures Arena',  date: '3 days ago' },
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function buildBoard(tick: number) {
  return TRADERS.map((t, i) => ({
    ...t,
    pct: +(t.base + Math.sin(tick * 0.22 + i * 1.9) * 0.7 + Math.cos(tick * 0.38 + i * 2.6) * 0.3).toFixed(2),
  })).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function LiveDot({ color = C.green }: { color?: string }) {
  return (
    <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: color, boxShadow: `0 0 0 2px ${color}33`, animation: 'yn-live 1.5s ease-in-out infinite', flexShrink: 0 }} />
  )
}

function Countdown({ hours }: { hours: number }) {
  const end = useRef(Date.now() + hours * 3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.current - Date.now()), 1000); return () => clearInterval(t) }, [])
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1, color: ms < 3600000 ? C.red : C.text }}>
      {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
    </span>
  )
}

function Divider() {
  return <div style={{ height: 1, background: C.border, margin: '0' }} />
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const searchParams = useSearchParams()
  const [board, setBoard] = useState(() => buildBoard(0))
  const [tick, setTick] = useState(0)
  const [viewers, setViewers] = useState(3847)
  const [tab, setTab] = useState<'competition' | 'streams' | 'leaderboard'>('competition')
  const [selectedContest, setSelectedContest] = useState(TOURNAMENTS[0])
  const [selectedStream, setSelectedStream] = useState<typeof STREAMS[0] | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [successModal, setSuccessModal] = useState<string | null>(null)

  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => { const next = n + 1; setBoard(buildBoard(next)); return next })
      setViewers(v => Math.max(3000, v + Math.round((Math.random() - 0.48) * 8)))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const entered = searchParams?.get('entered')
    const session = searchParams?.get('session_id')
    if (entered && session) {
      setSuccessModal(entered)
      const t = window.setTimeout(() => setSuccessModal(null), 8000)
      return () => window.clearTimeout(t)
    }
  }, [searchParams])

  const enter = useCallback(async (contest: typeof TOURNAMENTS[0]) => {
    setEntering(contest.id)
    try {
      const res = await fetch('/api/stripe/tournament/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: contest.id, tournamentTitle: contest.name, entryFeeCents: contest.fee * 100, tier: contest.tier.toLowerCase() }),
      })
      const d = await res.json()
      if (d.url) { localStorage.setItem(`yn_tournament_${contest.id}`, 'true'); window.location.href = d.url }
      else if (d.demo) { localStorage.setItem(`yn_tournament_${contest.id}`, 'true'); window.location.href = `/arena/tournament/${contest.id}?entered=${contest.id}` }
    } catch { window.alert('Error — try again') }
    finally { setEntering(null) }
  }, [])

  const inMoney = Math.ceil(board.length * 0.2)

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.text, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes yn-live    { 0%,100%{opacity:1;transform:scale(1)}   50%{opacity:0.4;transform:scale(0.75)} }
        @keyframes yn-ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-in      { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-pop     { from{opacity:0;transform:scale(0.93) translateY(-10px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes yn-confetti{ 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes yn-glow-g  { 0%,100%{box-shadow:0 0 16px ${C.green}30} 50%{box-shadow:0 0 40px ${C.green}70} }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-thumb { background: ${C.raised}; border-radius: 4px }

        .yn-btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: ${C.green}; color: ${C.bg}; font-weight: 800; font-size: 14px;
          padding: 13px 28px; border-radius: 10px; border: none; cursor: pointer;
          transition: opacity 0.15s, transform 0.15s; white-space: nowrap;
          animation: yn-glow-g 2.5s ease-in-out infinite;
        }
        .yn-btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }
        .yn-btn-primary:disabled { opacity: 0.4; cursor: not-allowed; transform: none; animation: none; }

        .yn-btn-secondary {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: ${C.text}; font-weight: 600; font-size: 14px;
          padding: 13px 28px; border-radius: 10px; border: 1px solid ${C.border}; cursor: pointer;
          transition: background 0.15s; white-space: nowrap;
        }
        .yn-btn-secondary:hover { background: ${C.surface}; }

        .yn-card {
          background: ${C.surface}; border: 1px solid ${C.border}; border-radius: 12px;
          transition: border-color 0.15s;
        }
        .yn-card:hover { border-color: ${C.raised}; }

        .yn-tab { background: none; border: none; border-bottom: 2px solid transparent; cursor: pointer;
          padding: 0 20px; height: 100%; font-size: 13px; font-weight: 600; color: ${C.muted};
          transition: color 0.15s, border-color 0.15s; }
        .yn-tab.active { color: ${C.text}; border-bottom-color: ${C.green}; }
        .yn-tab:hover:not(.active) { color: ${C.text}; }

        @media (max-width: 768px) {
          .hide-mobile { display: none !important; }
          .mobile-col  { flex-direction: column !important; }
          .mobile-full { width: 100% !important; }
        }
      `}</style>

      {/* ── SUCCESS MODAL ── */}
      {successModal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(9,9,11,0.92)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:24 }}>
          {Array.from({length:16}).map((_,i) => (
            <div key={i} style={{ position:'fixed',top:0,left:`${6+i*5.6}%`,width:8,height:8,borderRadius:i%3===0?'50%':2,background:[C.green,C.gold,C.purple,C.blue,C.red][i%5],animation:`yn-confetti ${1.4+i*0.14}s ease-in ${i*0.07}s forwards`,pointerEvents:'none'}} />
          ))}
          <div style={{ background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:'40px 48px',maxWidth:440,width:'100%',textAlign:'center',animation:'yn-pop 0.35s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ fontSize:48,marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:26,fontWeight:900,color:C.text,marginBottom:8,letterSpacing:-0.5 }}>You&apos;re in!</div>
            <div style={{ fontSize:14,color:C.muted,marginBottom:28,lineHeight:1.7 }}>
              You&apos;ve entered <strong style={{color:C.text}}>{successModal.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</strong>.<br/>
              Your $10,000 simulated account is ready. Trade until 4:00 PM ET.
            </div>
            <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
              <button onClick={() => setSuccessModal(null)} className="yn-btn-secondary" style={{ fontSize:13,padding:'10px 18px' }}>
                Watch leaderboard
              </button>
              <Link href={`/arena/tournament/${successModal}?entered=${successModal}`}
                onClick={() => { localStorage.setItem(`yn_tournament_${successModal}`,'true'); setSuccessModal(null) }}
                className="yn-btn-primary" style={{ fontSize:13,padding:'10px 18px',textDecoration:'none' }}>
                Open trading room →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* ── TICKER ── */}
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, height: 36, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
        <div style={{ background: C.green, color: C.bg, fontSize: 9, fontWeight: 900, letterSpacing: '0.2em', padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          LIVE
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'inline-flex', animation: 'yn-ticker 44s linear infinite', whiteSpace: 'nowrap' }}>
            {[
              'MARCUS T. +18.4% — DAILY BLITZ LEADER',
              '$47,320 PAID TO TRADERS THIS MONTH',
              '390 TRADERS COMPETING NOW',
              'TOP 10 FINISH = ENTRY × YOUR P&L%',
              'PRIYA S. MADE +382% IN CRYPTO NIGHT',
              'STREAM YOUR TRADES — EARN 12% PER VIEWER ENTRY',
              'SARAH K. +14.1% · CLIMBING',
              'NEW: FUTURES ARENA — ES, NQ, GC, CL',
              ...['MARCUS T. +18.4% — DAILY BLITZ LEADER','$47,320 PAID TO TRADERS THIS MONTH','390 TRADERS COMPETING NOW','TOP 10 FINISH = ENTRY × YOUR P&L%','PRIYA S. MADE +382% IN CRYPTO NIGHT','STREAM YOUR TRADES — EARN 12% PER VIEWER ENTRY','SARAH K. +14.1% · CLIMBING','NEW: FUTURES ARENA — ES, NQ, GC, CL'],
            ].map((item, i) => (
              <span key={i} style={{ padding: '0 40px', fontSize: 11, fontWeight: 600, color: C.muted, letterSpacing: '0.05em' }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: `1px solid ${C.border}`, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(9,9,11,0.96)' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px', height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Logo */}
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={15} color={C.bg} fill={C.bg} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 900, color: C.text, letterSpacing: -0.4 }}>YN Arena</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 10px', border: `1px solid ${C.purple}40`, borderRadius: 6 }} className="hide-mobile">
            <LiveDot color={C.purple} />
            <span style={{ fontSize: 9, fontWeight: 800, color: C.purple, letterSpacing: '0.18em' }}>LIVE</span>
          </div>

          <div style={{ fontSize: 12, color: C.dim, display: 'flex', alignItems: 'center', gap: 5 }} className="hide-mobile">
            <Eye size={11} />
            <span style={{ fontFamily: 'monospace', color: C.muted }}>{viewers.toLocaleString()}</span>
          </div>

          {/* Tabs */}
          <div style={{ flex: 1, display: 'flex', height: '100%', marginLeft: 16 }} className="hide-mobile">
            {(['competition','streams','leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`yn-tab ${tab === t ? 'active' : ''}`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <Link href="/arena/schedule" style={{ fontSize: 12, color: C.dim, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 7 }} className="hide-mobile">Schedule</Link>
            <Link href="/arena/creator" style={{ fontSize: 12, color: C.purple, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${C.purple}35`, borderRadius: 7 }} className="hide-mobile">Stream & Earn</Link>
            <Link href="/courses" style={{ fontSize: 12, color: C.dim, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 7 }} className="hide-mobile">Courses</Link>
            <Link href="/app" style={{ fontSize: 12, color: C.dim, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${C.border}`, borderRadius: 7 }} className="hide-mobile">Terminal</Link>
            <button onClick={() => enter(selectedContest)} disabled={!!entering} className="yn-btn-primary" style={{ fontSize: 12, padding: '8px 18px' }}>
              {entering ? '...' : `Enter $${selectedContest.fee}`}
            </button>
          </div>
        </div>
      </nav>

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 24px' }}>

        {/* ════════════════════ COMPETITION TAB ════════════════════ */}
        {tab === 'competition' && (
          <>
            {/* ── HERO ── */}
            <div style={{ padding: '64px 0 48px', display: 'grid', gridTemplateColumns: '1fr 400px', gap: 48, alignItems: 'center' }} className="mobile-col">

              {/* Left: pitch */}
              <div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${C.green}12`, border: `1px solid ${C.green}30`, borderRadius: 100, padding: '6px 16px', fontSize: 12, color: C.green, fontWeight: 600, marginBottom: 24 }}>
                  <LiveDot /> {viewers.toLocaleString()} people watching right now
                </div>

                <h1 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 900, color: C.text, lineHeight: 1.05, letterSpacing: -2, marginBottom: 20 }}>
                  Trading is<br />
                  <span style={{ color: C.green }}>a sport.</span>
                </h1>

                <p style={{ fontSize: 17, color: C.muted, lineHeight: 1.75, maxWidth: 480, marginBottom: 32 }}>
                  Pay $10 to enter a daily tournament. Trade for 6 hours on a $10,000 simulated account. Finish top 10 and your entry fee is multiplied by your P&L%. The better you trade, the more you win.
                </p>

                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32 }}>
                  <button onClick={() => enter(selectedContest)} disabled={!!entering} className="yn-btn-primary" style={{ fontSize: 15 }}>
                    <Zap size={16} /> Enter Today&apos;s Tournament — $10
                  </button>
                  <button onClick={() => setTab('streams')} className="yn-btn-secondary" style={{ fontSize: 15 }}>
                    <Eye size={16} /> Watch Live
                  </button>
                </div>

                <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Paid out this month', value: '$47,320' },
                    { label: 'Active traders',      value: '3,847'   },
                    { label: 'Entry fee',           value: '$10'     },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontFamily: 'monospace', letterSpacing: -0.5 }}>{value}</div>
                      <div style={{ fontSize: 11, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: live mini-board */}
              <div className="hide-mobile yn-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LiveDot />
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>Daily Blitz — Live</span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: C.muted }}>Closes <Countdown hours={4} /></span>
                </div>
                {board.slice(0, 8).map((t, i) => (
                  <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: `1px solid ${C.border}`, background: i < inMoney ? `${t.color}08` : 'transparent', transition: 'background 0.5s' }}>
                    <span style={{ fontSize: 14, width: 20, textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: C.dim, width: 24, fontFamily: 'monospace' }}>#{t.rank}</span>
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
                      {t.isAI ? '🤖' : t.init}
                    </div>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: C.text }}>{t.name}</span>
                    <span style={{ fontSize: 15, fontWeight: 800, color: t.pct >= 0 ? C.green : C.red, fontFamily: 'monospace', transition: 'color 0.4s' }}>
                      {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(1)}%
                    </span>
                    {i < inMoney && <span style={{ fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 6px', borderRadius: 4, fontWeight: 700, flexShrink: 0 }}>PAID</span>}
                  </div>
                ))}
                <div style={{ padding: '10px 18px', fontSize: 11, color: C.dim, textAlign: 'center' }}>
                  Updates every 3s · {board.length} traders
                </div>
              </div>
            </div>

            <Divider />

            {/* ── HOW PAYOUTS WORK ── */}
            <div style={{ padding: '56px 0 48px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 48, alignItems: 'center' }} className="mobile-col">
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>The Prize Model</div>
                  <h2 style={{ fontSize: 36, fontWeight: 900, color: C.text, letterSpacing: -1, lineHeight: 1.1, marginBottom: 16 }}>
                    Your return is your skill.
                  </h2>
                  <p style={{ fontSize: 15, color: C.muted, lineHeight: 1.75, marginBottom: 24 }}>
                    Every entry goes into the pool. House takes 20%. The remaining 80% is split among the top 10 finishers — proportionally by their P&L%. Finish higher, earn more. The house can never owe more than it collected.
                  </p>
                  <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 12, color: C.dim, marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      $10 entry · example at 390 traders
                    </div>
                    {[
                      { rank: '1st', pct: '~30% of pool', est: '$936'  },
                      { rank: '2nd', pct: '~20% of pool', est: '$624'  },
                      { rank: '3rd', pct: '~14% of pool', est: '$437'  },
                      { rank: 'Top 10', pct: 'Rest proportional', est: '$312 pool' },
                    ].map(({ rank, pct, est }) => (
                      <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: rank === '1st' ? C.gold : C.text }}>{rank}</span>
                        <span style={{ fontSize: 11, color: C.dim }}>{pct}</span>
                        <span style={{ fontSize: 14, fontWeight: 800, color: C.green, fontFamily: 'monospace' }}>{est}</span>
                      </div>
                    ))}
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 12 }}>
                      Pool = 390 × $10 × 80% = $3,120 · House keeps $780
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {[
                    { icon: '💵', title: 'Pay the entry fee', body: 'Charged via Stripe. You get a $10,000 simulated trading account instantly.' },
                    { icon: '📊', title: 'Trade until 4:00 PM ET', body: 'Long or short on stocks, forex, crypto, or futures. Your P&L is tracked live on the leaderboard.' },
                    { icon: '🏆', title: 'Finish top 10, get paid', body: 'Top 10 traders split 80% of all entry fees — proportionally by P&L%. Payouts via Stripe within 24 hours.' },
                  ].map(({ icon, title, body }) => (
                    <div key={title} className="yn-card" style={{ padding: '20px 22px', display: 'flex', gap: 16 }}>
                      <div style={{ fontSize: 28, flexShrink: 0, marginTop: 2 }}>{icon}</div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 5 }}>{title}</div>
                        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{body}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <Divider />

            {/* ── TOURNAMENT LOBBY ── */}
            <div style={{ padding: '56px 0 48px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>Open Contests</div>
                  <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Choose your tournament</h2>
                </div>
                <Link href="/arena/schedule" style={{ fontSize: 13, color: C.muted, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                  Full schedule <ArrowRight size={13} />
                </Link>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {TOURNAMENTS.map(contest => {
                  const pool = Math.floor(contest.filled * contest.fee * 0.8)
                  const fill = Math.round((contest.filled / contest.max) * 100)
                  const isSelected = selectedContest.id === contest.id
                  return (
                    <div key={contest.id} onClick={() => setSelectedContest(contest)}
                      style={{ background: C.surface, border: `1px solid ${isSelected ? contest.color : C.border}`, borderTop: `3px solid ${contest.color}`, borderRadius: 12, padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s, box-shadow 0.15s', boxShadow: isSelected ? `0 0 20px ${contest.color}18` : 'none' }}>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: contest.color, background: `${contest.color}15`, padding: '2px 8px', borderRadius: 4, letterSpacing: '0.06em' }}>{contest.tier}</span>
                            <span style={{ fontSize: 10, color: C.dim }}>{contest.allowed}</span>
                          </div>
                          <div style={{ fontSize: 16, fontWeight: 800, color: C.text }}>{contest.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: contest.color, fontFamily: 'monospace' }}>${contest.fee}</div>
                          <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.08em' }}>entry</div>
                        </div>
                      </div>

                      <div style={{ height: 3, background: C.raised, borderRadius: 2, overflow: 'hidden', marginBottom: 10 }}>
                        <div style={{ width: `${fill}%`, height: '100%', background: fill > 85 ? '#f97316' : contest.color, transition: 'width 1s ease' }} />
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 12, color: C.dim }}>
                          {contest.filled.toLocaleString()}/{contest.max.toLocaleString()} · est. <span style={{ color: C.gold, fontWeight: 700, fontFamily: 'monospace' }}>${pool.toLocaleString()}</span> pool
                          {fill > 85 && <span style={{ color: '#f97316', marginLeft: 6, fontWeight: 700 }}>· filling fast</span>}
                        </div>
                        <button onClick={e => { e.stopPropagation(); enter(contest) }} disabled={!!entering}
                          style={{ fontSize: 12, fontWeight: 700, color: contest.color, background: `${contest.color}15`, border: `1px solid ${contest.color}40`, borderRadius: 7, padding: '5px 14px', cursor: 'pointer', transition: 'background 0.15s' }}>
                          {entering === contest.id ? '...' : `Enter $${contest.fee}`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Divider />

            {/* ── FULL SCOREBOARD ── */}
            <div style={{ padding: '56px 0 48px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <LiveDot />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Live Scoreboard — Daily Blitz</h2>
                <span style={{ fontSize: 12, color: C.dim, marginLeft: 'auto' }}>Updates every 3s · {board.length} traders</span>
              </div>

              <div className="yn-card" style={{ overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ display: 'grid', gridTemplateColumns: '40px 28px 1fr 90px 100px 88px 72px', padding: '10px 18px', background: C.raised, borderBottom: `1px solid ${C.border}` }}>
                  {['','RK','TRADER','P&L %','EST. PAYOUT','ENTRY × MULT','STATUS'].map((h, i) => (
                    <div key={h} style={{ fontSize: 9, fontWeight: 700, color: C.dim, letterSpacing: '0.1em', textAlign: i > 2 ? 'right' : 'left' }}>{h}</div>
                  ))}
                </div>

                {board.map((t, i) => {
                  const paid = i < inMoney
                  const pool = TOURNAMENTS[0].filled * TOURNAMENTS[0].fee * 0.8
                  const payWeights = [0.30, 0.20, 0.14, 0.10, 0.07, 0.06, 0.05, 0.04, 0.03, 0.01]
                  const estPayout = paid ? +(pool * (payWeights[i] ?? 0.01)).toFixed(2) : 0
                  const mult = paid ? +(1 + Math.abs(t.pct) / 100).toFixed(3) : 0
                  return (
                    <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '40px 28px 1fr 90px 100px 88px 72px', padding: '10px 18px', borderBottom: `1px solid ${C.border}`, background: paid ? `${t.color}07` : 'transparent', transition: 'background 0.6s', animation: 'yn-in 0.3s ease' }}>
                      <div style={{ fontSize: 15 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</div>
                      <div style={{ fontSize: 11, color: C.dim, fontFamily: 'monospace', alignSelf: 'center' }}>#{t.rank}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
                          {t.isAI ? '🤖' : t.init}
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{t.name}</div>
                          {t.isAI && <div style={{ fontSize: 9, color: C.dim }}>AI TRADER</div>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 800, color: t.pct >= 0 ? C.green : C.red, fontFamily: 'monospace', alignSelf: 'center', transition: 'color 0.4s' }}>
                        {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(2)}%
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: paid ? C.gold : C.dim, fontFamily: 'monospace', alignSelf: 'center' }}>
                        {paid ? `$${estPayout.toFixed(2)}` : '—'}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: 12, color: paid ? C.muted : C.dim, fontFamily: 'monospace', alignSelf: 'center' }}>
                        {paid ? `×${mult.toFixed(3)}` : '—'}
                      </div>
                      <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                        {paid
                          ? <span style={{ fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 7px', borderRadius: 4, fontWeight: 800 }}>CASHING</span>
                          : <span style={{ fontSize: 9, color: C.dim, background: C.raised, padding: '2px 7px', borderRadius: 4 }}>OUT</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <Divider />

            {/* ── RECENT PAYOUTS ── */}
            <div style={{ padding: '56px 0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.green, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>Verified Payouts</div>
              <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -0.5, marginBottom: 28 }}>Real traders. Real payouts.</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
                {WINS.map((w, i) => (
                  <div key={i} className="yn-card" style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${C.green}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: C.green }}>
                        {w.name.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 9, color: C.dim, padding: '3px 8px', background: C.raised, borderRadius: 4 }}>{w.date}</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.text, marginBottom: 3 }}>{w.name}</div>
                    <div style={{ fontSize: 11, color: C.dim, marginBottom: 10 }}>{w.contest}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <span style={{ fontSize: 13, color: C.green, fontWeight: 700 }}>{w.pct}</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: C.gold, fontFamily: 'monospace' }}>{w.won}</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.dim, marginTop: 3, textAlign: 'right' }}>{w.entry} entry</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════ STREAMS TAB ════════════════════ */}
        {tab === 'streams' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 28, fontWeight: 900, color: C.text, letterSpacing: -0.5 }}>Live Streams</h2>
                <p style={{ fontSize: 14, color: C.muted, marginTop: 6 }}>Watch traders compete in real-time on live charts</p>
              </div>
              <Link href="/arena/creator" style={{ fontSize: 13, color: C.purple, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4, padding: '8px 16px', border: `1px solid ${C.purple}35`, borderRadius: 8 }}>
                <Radio size={13} /> Stream & Earn 12%
              </Link>
            </div>

            {selectedStream && (
              <div className="yn-card" style={{ overflow: 'hidden', marginBottom: 24, animation: 'yn-in 0.25s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px', borderBottom: `1px solid ${C.border}` }}>
                  <LiveDot color={C.red} />
                  <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{selectedStream.name}</span>
                  <span style={{ fontSize: 12, color: C.dim }}>{selectedStream.asset}</span>
                  <span style={{ fontSize: 15, fontWeight: 900, color: selectedStream.pct >= 0 ? C.green : C.red, fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {selectedStream.pct >= 0 ? '+' : ''}{selectedStream.pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: 12, color: C.dim, display: 'flex', alignItems: 'center', gap: 4 }}><Eye size={12} />{selectedStream.viewers.toLocaleString()}</span>
                  <button onClick={() => setSelectedStream(null)} style={{ background: 'none', border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted, padding: '4px 12px', cursor: 'pointer', fontSize: 12 }}>Close</button>
                </div>
                <div style={{ height: 420 }}>
                  <TradingViewChart symbol={selectedStream.asset} interval={selectedStream.tf} hideSideToolbar={true} studies={[]} />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 14 }}>
              {STREAMS.map(s => (
                <div key={s.name} onClick={() => setSelectedStream(s)}
                  style={{ background: C.surface, border: `1px solid ${selectedStream?.name===s.name ? s.color : C.border}`, borderRadius: 12, overflow: 'hidden', cursor: 'pointer', transition: 'border-color 0.15s, transform 0.15s', boxShadow: selectedStream?.name===s.name?`0 0 20px ${s.color}15`:'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='translateY(0)' }}>
                  <div style={{ height: 160, position: 'relative' }}>
                    <TradingViewChart symbol={s.asset} interval={s.tf} hideSideToolbar={true} studies={[]} />
                    <div style={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(9,9,11,0.82)', borderRadius: 8, padding: '5px 9px', backdropFilter: 'blur(6px)' }}>
                      <div style={{ width: 24, height: 24, borderRadius: 6, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: s.color }}>{s.init}</div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{s.name}</span>
                    </div>
                    <div style={{ position: 'absolute', top: 10, right: 10, background: '#ef4444', borderRadius: 4, padding: '2px 7px' }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>● LIVE</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, right: 10, fontSize: 14, fontWeight: 900, color: s.pct >= 0 ? C.green : C.red, fontFamily: 'monospace', background: 'rgba(9,9,11,0.8)', borderRadius: 5, padding: '3px 8px' }}>
                      {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(1)}%
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, left: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(9,9,11,0.75)', borderRadius: 5, padding: '3px 8px' }}>
                      <Eye size={10} color={C.muted} />
                      <span style={{ fontSize: 10, color: C.muted, fontFamily: 'monospace' }}>{s.viewers.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: C.dim }}>{s.asset}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Watch →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════ LEADERBOARD TAB ════════════════════ */}
        {tab === 'leaderboard' && (
          <div style={{ padding: '40px 0' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 12, marginBottom: 40 }}>
              {[
                { label: 'Total Paid Out',   value: '$47,320', color: C.gold   },
                { label: 'Active Traders',   value: '3,847',   color: C.green  },
                { label: 'Tournaments Run',  value: '2,156',   color: C.purple },
                { label: 'Biggest Return',   value: '+912%',   color: C.blue   },
              ].map(({ label, value, color }) => (
                <div key={label} className="yn-card" style={{ padding: '20px', borderTop: `3px solid ${color}` }}>
                  <div style={{ fontSize: 9, color: C.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{label}</div>
                  <div style={{ fontSize: 30, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: -0.5 }}>{value}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 900, color: C.text, marginBottom: 20, letterSpacing: -0.5 }}>All-Time Rankings</h2>
            <div className="yn-card" style={{ overflow: 'hidden' }}>
              {[
                { name:'Marcus T.',  init:'MT', wr:67, earned:4280, streak:5,  color:C.gold   },
                { name:'Priya S.',   init:'PS', wr:71, earned:3920, streak:3,  color:C.green  },
                { name:'Devon P.',   init:'DP', wr:58, earned:2847, streak:2,  color:C.blue   },
                { name:'Sarah K.',   init:'SK', wr:62, earned:2410, streak:4,  color:C.purple },
                { name:'Ryan C.',    init:'RC', wr:54, earned:1980, streak:1,  color:C.gold   },
                { name:'Jordan M.',  init:'JM', wr:49, earned:1642, streak:0,  color:C.muted  },
                { name:'Aisha B.',   init:'AB', wr:55, earned:1389, streak:2,  color:C.green  },
                { name:'Chris L.',   init:'CL', wr:44, earned:1102, streak:0,  color:C.muted  },
              ].map((t, i) => (
                <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '44px 40px 1fr 90px 100px 80px', padding: '12px 18px', borderBottom: `1px solid ${C.border}`, background: i < 3 ? `${t.color}07` : 'transparent' }}>
                  <div style={{ fontSize: 18 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</div>
                  <div style={{ fontSize: 11, color: C.dim, fontFamily: 'monospace', alignSelf: 'center' }}>#{i+1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: t.color, flexShrink: 0 }}>{t.init}</div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: C.text }}>{t.name}</div>
                      <div style={{ height: 3, background: C.raised, borderRadius: 2, width: 64, overflow: 'hidden', marginTop: 4 }}>
                        <div style={{ width: `${t.wr}%`, height: '100%', background: t.color }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: C.muted, alignSelf: 'center' }}>{t.wr}% WR</div>
                  <div style={{ textAlign: 'right', fontSize: 16, fontWeight: 900, color: C.gold, fontFamily: 'monospace', alignSelf: 'center' }}>${t.earned.toLocaleString()}</div>
                  <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                    {t.streak > 0 ? <span style={{ fontSize: 12, color: '#f97316', fontWeight: 800 }}>🔥 {t.streak}</span> : <span style={{ fontSize: 11, color: C.dim }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FOOTER ── */}
        <Divider />
        <div style={{ padding: '32px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: C.green, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={12} color={C.bg} fill={C.bg} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>YN Arena</span>
          </div>
          <div style={{ display: 'flex', gap: 20, fontSize: 13, flexWrap: 'wrap' }}>
            {[
              ['/arena/schedule', 'Schedule'],
              ['/arena/creator', 'Stream & Earn'],
              ['/courses', 'Courses'],
              ['/app', 'Terminal'],
              ['/privacy', 'Privacy'],
              ['/terms', 'Terms'],
            ].map(([href, label]) => (
              <Link key={label} href={href} style={{ color: C.dim, textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.dim }}>
            Simulated trading · Real prizes · Not financial advice · © 2026 YN Finance
          </div>
        </div>
      </div>
    </div>
  )
}
