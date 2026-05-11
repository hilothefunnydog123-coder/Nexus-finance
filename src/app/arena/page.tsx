'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { Trophy, Users, Zap, Crown, Eye, Radio, ChevronRight, TrendingUp, TrendingDown, Bot, Shield } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'

// ─── DATA ────────────────────────────────────────────────────────────────────

const TICKER = [
  'MARCUS T. +18.4% · DAILY BLITZ LEADER',
  '$47,320 PAID TO TRADERS THIS MONTH',
  'MAKE +200% → YOUR $5 BECOMES $15 · PURE SKILL',
  '390 TRADERS COMPETING LIVE RIGHT NOW',
  'YESTERDAY: PRIYA S. MADE +380% IN CRYPTO NIGHT',
  'NEW: GO LIVE AND STREAM YOUR TRADES TO THE ARENA',
  'TOP 10 FINISH = YOUR ENTRY × YOUR PERFORMANCE',
  'SARAH K. +13.1% · CLIMBING FAST',
]

const TRADERS = [
  { name: 'Marcus T.', init: 'MT', base: 18.4, color: '#00ffa3', trades: 9  },
  { name: 'Sarah K.',  init: 'SK', base: 13.1, color: '#ffcc00', trades: 7  },
  { name: 'Devon P.',  init: 'DP', base: 11.7, color: '#0088ff', trades: 11 },
  { name: 'Jordan M.', init: 'JM', base:  9.3, color: '#8855ff', trades: 5  },
  { name: 'Aisha B.',  init: 'AB', base:  7.2, color: '#ff7700', trades: 14 },
  { name: 'Chris L.',  init: 'CL', base:  5.0, color: '#ff2244', trades: 3  },
  { name: 'Nina R.',   init: 'NR', base:  2.9, color: '#00ffa3', trades: 8  },
  { name: 'Tyler W.',  init: 'TW', base: -1.4, color: '#ffcc00', trades: 6  },
  { name: 'Priya S.',  init: 'PS', base: -3.8, color: '#0088ff', trades: 12 },
  { name: 'Alex M.',   init: 'AM', base: -5.1, color: '#8855ff', trades: 4  },
  { name: 'Ryan C.',   init: 'RC', base: -6.7, color: '#ff7700', trades: 9  },
  { name: 'Zoe H.',    init: 'ZH', base: -8.2, color: '#ff2244', trades: 7  },
  { name: 'YN-ALPHA',  init: 'Aα', base:  4.1, color: '#00ffa3', trades: 22, isAI: true },
  { name: 'YN-BETA',   init: 'Bβ', base: -2.3, color: '#8855ff', trades: 8,  isAI: true },
]

// Prize model: house takes 20%, remaining 80% split proportionally among top 10 by P&L%
// This caps liability to what was collected — house always profits
const HOUSE_CUT = 0.20
const TOP_WINNERS = 10

const CONTESTS = [
  { id: 'blitz',    name: 'Daily Blitz',       fee: 10,  max: 500, filled: 390, allowed: 'All Markets', color: '#00ffa3', tier: 'standard', description: 'Trade anything. Top 10 split 80% of the prize pool proportionally by P&L%.' },
  { id: 'crypto',   name: 'Crypto Night',      fee: 25,  max: 250, filled: 188, allowed: 'Crypto Only', color: '#8855ff', tier: 'premium',  description: 'Crypto only. High volatility, high upside. Top 10 split 80% of pool.' },
  { id: 'pro',      name: 'Pro Showdown',      fee: 100, max: 100, filled: 44,  allowed: 'All Markets', color: '#ffcc00', tier: 'elite',    description: 'Veterans only. 100-player field. First place takes ~40% of the pool.' },
  { id: 'forex',    name: 'Forex Cup',         fee: 25,  max: 200, filled: 67,  allowed: 'Forex Only',  color: '#0088ff', tier: 'premium',  description: 'Currency pairs. London + NY session. Top 10 split proportionally.' },
  { id: 'futures',  name: 'Futures Arena',     fee: 50,  max: 150, filled: 31,  allowed: 'Futures Only',color: '#ff7700', tier: 'elite',    description: 'ES, NQ, GC, CL. Futures only. Biggest single-trade P&L% wins more.' },
  { id: 'h2h-10',  name: 'H2H $10 Duel',      fee: 10,  max: 2,   filled: 1,   allowed: 'All Markets', color: '#ff7700', tier: 'standard', description: '1v1. Higher P&L% after 6 hours takes 90% of pot. House takes 10%.' },
  { id: 'h2h-100', name: 'H2H Elite $100',     fee: 100, max: 2,   filled: 0,   allowed: 'All Markets', color: '#ff2244', tier: 'elite',    description: 'High-stakes 1v1. Winner takes $190. House takes $10.' },
  { id: 'mega',     name: 'Weekly Mega',       fee: 25,  max: 1000,filled: 712, allowed: 'All Markets', color: '#ffcc00', tier: 'elite',    description: 'Weekly $25K+ prize pool. 1,000 entries. Top 100 traders paid.' },
]

const STREAMS = [
  { name: 'Marcus T.',  init: 'MT', asset: 'AAPL',    tf: '5',  pct: 18.4,  viewers: 2847, color: '#00ffa3' },
  { name: 'Sarah K.',   init: 'SK', asset: 'BTC/USD', tf: '60', pct: 12.1,  viewers: 1654, color: '#ffcc00' },
  { name: 'Devon P.',   init: 'DP', asset: 'EUR/USD', tf: '15', pct: 7.8,   viewers: 987,  color: '#0088ff' },
  { name: 'Aisha B.',   init: 'AB', asset: 'NVDA',    tf: 'D',  pct: 22.3,  viewers: 1432, color: '#8855ff' },
  { name: 'Jordan M.',  init: 'JM', asset: 'SPY',     tf: '1',  pct: -3.2,  viewers: 743,  color: '#ff2244' },
  { name: 'Nina R.',    init: 'NR', asset: 'ETH/USD', tf: '240',pct: 9.1,   viewers: 521,  color: '#ff7700' },
]

const PAST = [
  { name: 'Priya S.',  pct: '+382%', entry: '$10', won: '$48.20', contest: 'Crypto Night',  date: 'Yesterday'  },
  { name: 'Marcus T.', pct: '+241%', entry: '$5',  won: '$17.05', contest: 'Daily Blitz',   date: 'Yesterday'  },
  { name: 'Devon P.',  pct: '+198%', entry: '$25', won: '$74.50', contest: 'Pro Showdown',  date: '2 days ago' },
  { name: 'Sarah K.',  pct: '+156%', entry: '$5',  won: '$12.80', contest: 'Daily Blitz',   date: '2 days ago' },
  { name: 'Ryan C.',   pct: '+312%', entry: '$10', won: '$41.20', contest: 'Forex Cup',     date: '3 days ago' },
]

const CHAT_POOL = [
  ['🔥 marcus is absolutely cooking rn', 'ScalpKing'],
  ['bro +18% already?? wild', 'xtrader99'],
  ['the multiplier model is so much better than fixed pools', 'VisionaryT'],
  ['if marcus holds this he gets $5 × 2.18 = $10.90 🤑', 'DataNerd'],
  ['i been watching 2 hours cant stop 💀', 'ViewerK'],
  ['$5 entry and top 10 get multiplied by their returns?? insane', 'Skeptic'],
  ['sarah k climbing fast 📈', 'TradingBull'],
  ['this is literally skill based money printing', 'EliteTrader'],
  ['yo the leaderboard shifting again', 'ArenaFan'],
  ['imagine making +500% and getting $30 from a $5 bet 🤯', 'PrizeHunter'],
  ['devon p been consistent all week', 'regularViewer'],
  ['NINA R WITH THE COMEBACK ARC 🎯', 'DramaWatch'],
  ['entering tomorrow no cap', 'Regret99'],
  ['the ai traders are actually competing lmao', 'CuriousV'],
  ['live trading tournaments >>> everything', 'MultiStream'],
  ['who is priya s she went +382% yesterday??', 'NewTrader22'],
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function buildBoard(tick: number) {
  return TRADERS.map((t, i) => {
    const drift = Math.sin(tick * 0.25 + i * 1.9) * 0.6 + Math.cos(tick * 0.4 + i * 2.7) * 0.3
    return { ...t, pct: +(t.base + drift).toFixed(2) }
  }).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

// New pool model: house takes 20%, top 10 split 80% proportionally by P&L%
// prizePool = entries × fee × 0.8
// yourPayout = prizePool × (yourPnL / sumOfAllTop10PnL)
function prizePool(entries: number, fee: number) { return +(entries * fee * (1 - HOUSE_CUT)).toFixed(0) }
function estimatePayout(myPct: number, allTopPcts: number[], pool: number): number {
  const total = allTopPcts.reduce((s, p) => s + Math.abs(p), 0)
  if (total === 0) return 0
  return +(pool * (Math.abs(myPct) / total)).toFixed(2)
}
// Legacy helper used in UI examples
function examplePayout(rank: number, totalInPool: number): number {
  // Approximate: top-heavy distribution, rank 1 gets ~30%, falls off
  const weights = [0.30, 0.20, 0.14, 0.10, 0.07, 0.06, 0.05, 0.04, 0.03, 0.01]
  return +(totalInPool * (weights[rank - 1] ?? 0.01)).toFixed(2)
}

function Countdown({ hours }: { hours: number }) {
  const end = useRef(Date.now() + hours * 3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.current - Date.now()), 1000); return () => clearInterval(t) }, [])
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</>
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [board, setBoard] = useState(() => buildBoard(0))
  const [tick, setTick] = useState(0)
  const [viewers, setViewers] = useState(3847)
  const [tab, setTab] = useState<'competition' | 'streams' | 'leaderboard'>('competition')
  const [selectedContest, setSelectedContest] = useState(CONTESTS[0])
  const [selectedStream, setSelectedStream] = useState<typeof STREAMS[0] | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [chatMsgs, setChatMsgs] = useState<{ user: string; text: string; color: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)
  const chatColors = ['#00ffa3','#0088ff','#8855ff','#ffcc00','#ff7700','#ff69b4']

  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => { const next = n+1; setBoard(buildBoard(next)); return next })
      setViewers(v => Math.max(3000, v + Math.round((Math.random()-.48)*10)))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const add = () => {
      const [text, user] = CHAT_POOL[Math.floor(Math.random()*CHAT_POOL.length)]
      const color = chatColors[Math.floor(Math.random()*chatColors.length)]
      setChatMsgs(m => { const next = [...m.slice(-60), { user, text, color }]; setTimeout(() => { if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight }, 10); return next })
    }
    add()
    const t = setInterval(add, 2600 + Math.random()*2200)
    return () => clearInterval(t)
  }, [])

  const enter = useCallback(async (contest: typeof CONTESTS[0]) => {
    setEntering(contest.id)
    try {
      const r = await fetch('/api/stripe/tournament/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: contest.id, tournamentTitle: contest.name, entryFeeCents: contest.fee*100, tier: contest.tier }),
      })
      const d = await r.json()
      if (d.url) { localStorage.setItem(`yn_tournament_${contest.id}`, 'true'); window.location.href = d.url }
      else if (d.demo) { localStorage.setItem(`yn_tournament_${contest.id}`, 'true'); window.location.href = `/arena/tournament/${contest.id}?entered=${contest.id}` }
    } catch { window.alert('Error — try again') }
    finally { setEntering(null) }
  }, [])

  const inMoney = Math.ceil(board.length * 0.2)
  const top3 = board.slice(0, 3)

  return (
    <div style={{ background: '#03050a', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'Inter,system-ui,sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        * { box-sizing:border-box }
        @keyframes yn-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-pulse  { 0%,100%{opacity:1} 50%{opacity:0.25} }
        @keyframes yn-glow   { 0%,100%{box-shadow:0 0 20px rgba(0,255,163,0.2)} 50%{box-shadow:0 0 48px rgba(0,255,163,0.55)} }
        @keyframes yn-popin  { from{opacity:0;transform:translateY(-16px) scale(0.93)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes yn-fade   { from{opacity:0;transform:translateY(5px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-spin   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes yn-shimmer{
          0%{background-position:-200% center}
          100%{background-position:200% center}
        }
        .yn-shimmer {
          background: linear-gradient(90deg, #00ffa3, #0088ff, #8855ff, #00ffa3);
          background-size: 200% auto;
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          animation: yn-shimmer 4s linear infinite;
        }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:3px}
        .yn-tab-btn { border-bottom: 3px solid transparent; transition: all 0.18s; }
        .yn-tab-btn.active { border-color: #00ffa3; color: #00ffa3; }
        .yn-contest-card { transition: all 0.18s; cursor: pointer; }
        .yn-contest-card:hover { transform: translateY(-2px); }
        .yn-stream-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; }
        @media(max-width:900px){ .yn-stream-grid{grid-template-columns:repeat(2,1fr)} }
        @media(max-width:600px){ .yn-stream-grid{grid-template-columns:1fr} }
      `}</style>

      {/* ── TICKER ── */}
      <div style={{ background: '#0a0010', height: 34, overflow: 'hidden', display: 'flex', alignItems: 'center', borderBottom: '1px solid #1a0030' }}>
        <div style={{ background: '#8855ff', padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.22em' }}>● LIVE</span>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'inline-flex', animation: 'yn-ticker 44s linear infinite', whiteSpace: 'nowrap' }}>
            {[...TICKER, ...TICKER].map((item, i) => (
              <span key={i} style={{ padding: '0 48px', fontSize: 11, fontWeight: 700, color: '#c0b0ff', letterSpacing: '0.04em' }}>
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(3,5,10,0.98)', borderBottom: '1px solid #0d1020', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', height: 56, gap: 14 }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg,#00ffa3,#0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'yn-glow 3s ease-in-out infinite' }}>
              <Trophy size={17} color="#03050a" fill="#03050a" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: -0.4, lineHeight: 1 }}>YN Arena</div>
              <div style={{ fontSize: 8, color: '#8855ff', letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1 }}>Skill × Entry</div>
            </div>
          </Link>

          {/* LIVE */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#8855ff22', border: '1px solid #8855ff44', borderRadius: 5, padding: '4px 10px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#8855ff', display: 'inline-block', animation: 'yn-pulse 1.2s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: '#8855ff', letterSpacing: '0.18em' }}>LIVE</span>
          </div>

          <div style={{ fontSize: 11, color: '#4a5e7a', display: 'flex', alignItems: 'center', gap: 4 }}>
            <Eye size={11} />
            <span style={{ fontFamily: 'monospace', color: '#cdd6f4', fontWeight: 700 }}>{viewers.toLocaleString()}</span>
          </div>

          {/* Tabs */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 0, height: '100%', marginLeft: 20 }}>
            {([['competition','COMPETITION'],['streams','STREAMS'],['leaderboard','LEADERBOARD']] as const).map(([t,l]) => (
              <button key={t} onClick={() => setTab(t)}
                className={`yn-tab-btn ${tab===t?'active':''}`}
                style={{ height: '100%', padding: '0 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' as const, letterSpacing: '0.1em', color: tab===t?'#00ffa3':'#4a5e7a' }}>
                {l}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Link href="/"        style={{ fontSize: 11, color: '#2a4060', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>← Home</Link>
            <Link href="/courses" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>Courses</Link>
            <Link href="/app"     style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6 }}>Terminal</Link>
            <button onClick={() => enter(selectedContest)} disabled={!!entering}
              style={{ padding: '9px 20px', background: entering?'#0a1020':'linear-gradient(135deg,#00ffa3,#00cc80)', color: '#03050a', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 900, cursor: entering?'not-allowed':'pointer', whiteSpace: 'nowrap', letterSpacing: 0.3 }}>
              {entering ? '...' : `⚡ Enter $${selectedContest.fee}`}
            </button>
          </div>
        </div>
      </nav>

      {/* ── CONTENT ── */}
      <div style={{ flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ════════════════════════════════════════════════
            COMPETITION TAB
        ════════════════════════════════════════════════ */}
        {tab === 'competition' && (
          <>
            {/* ── HERO: SCOREBOARD + ENTRY ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>

              {/* Live scoreboard */}
              <div style={{ background: '#080d16', border: '1px solid #0e1a2e', borderRadius: 18, overflow: 'hidden' }}>
                {/* Scoreboard header */}
                <div style={{ background: 'linear-gradient(135deg,#0a0020,#0a1a20)', borderBottom: '1px solid #0e1a2e', padding: '18px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#8855ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>Live Competition</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>Daily Blitz · $5 Entry</div>
                  </div>
                  <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                    <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Closes in</div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#ff7700', fontFamily: 'monospace', letterSpacing: 1 }}><Countdown hours={4} /></div>
                  </div>
                </div>

                {/* Top 3 podium */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderBottom: '1px solid #0e1a2e' }}>
                  {top3.map((t, i) => {
                    const medals = ['🥇','🥈','🥉']
                    const pool = selectedContest.filled * selectedContest.fee * (1 - HOUSE_CUT)
                    const pay  = examplePayout(i + 1, pool)
                    const mult = +(pay / selectedContest.fee).toFixed(2)
                    return (
                      <div key={t.name} style={{
                        padding: '20px 16px', textAlign: 'center',
                        background: i===0 ? 'linear-gradient(180deg,#120a00,#0a0800)' : 'transparent',
                        borderRight: i<2 ? '1px solid #0e1a2e' : 'none',
                        position: 'relative',
                      }}>
                        {i===0 && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,#ffcc00,#ff7700)' }} />}
                        <div style={{ fontSize: 26, marginBottom: 8 }}>{medals[i]}</div>
                        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.color}22`, border: `2px solid ${t.color}66`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 13, fontWeight: 900, color: t.color }}>
                          {t.init}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{t.name}</div>
                        <div style={{ fontSize: 28, fontWeight: 900, color: '#00ffa3', fontFamily: 'monospace', lineHeight: 1, marginBottom: 4 }}>
                          +{t.pct.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4 }}>×{mult} multiplier</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#ffcc00', fontFamily: 'monospace' }}>${pay}</div>
                        <div style={{ fontSize: 9, color: '#4a5e7a', marginTop: 2 }}>if they cash now</div>
                      </div>
                    )
                  })}
                </div>

                {/* Full board */}
                <div style={{ display: 'grid', gridTemplateColumns: '36px 28px 1fr 90px 90px 80px 70px', padding: '7px 16px', background: '#050810', borderBottom: '1px solid #0e1a2e' }}>
                  {['','#','TRADER','P&L %','MULTIPLIER','PAYOUT','STATUS'].map(h => (
                    <div key={h} style={{ fontSize: 8, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em', textAlign: ['P&L %','MULTIPLIER','PAYOUT','STATUS'].includes(h)?'right':'left' }}>{h}</div>
                  ))}
                </div>
                <div style={{ maxHeight: 340, overflowY: 'auto' }}>
                  {board.map((t, i) => {
                    const paid = i < inMoney
                    const pool = selectedContest.filled * selectedContest.fee * (1 - HOUSE_CUT)
                    const pay  = examplePayout(i + 1, pool)
                    const mult = +(pay / selectedContest.fee).toFixed(2)
                    return (
                      <div key={t.name} style={{
                        display: 'grid', gridTemplateColumns: '36px 28px 1fr 90px 90px 80px 70px',
                        padding: '9px 16px', borderBottom: '1px solid #07111c',
                        background: paid ? `${t.color}09` : 'transparent',
                        transition: 'background 0.6s',
                        animation: i < 3 ? 'yn-fade 0.3s ease' : 'none',
                      }}>
                        <div style={{ fontSize: 13 }}>{i<3?['🥇','🥈','🥉'][i]:''}</div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', alignSelf: 'center' }}>#{t.rank}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
                            {t.isAI ? <Bot size={12} color={t.color} /> : t.init}
                          </div>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#cdd6f4' }}>{t.name}</div>
                            {t.isAI && <div style={{ fontSize: 8, color: '#8855ff' }}>AI TRADER</div>}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 900, color: t.pct>=0?'#00ffa3':'#ff2244', fontFamily: 'monospace', alignSelf: 'center', transition: 'color 0.4s' }}>
                          {t.pct>=0?'+':''}{t.pct.toFixed(2)}%
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: paid?'#ffcc00':'#2a4060', fontFamily: 'monospace', alignSelf: 'center' }}>
                          ×{paid ? mult.toFixed(3) : '—'}
                        </div>
                        <div style={{ textAlign: 'right', fontSize: 12, fontWeight: 700, color: paid?'#00ffa3':'#2a4060', fontFamily: 'monospace', alignSelf: 'center' }}>
                          {paid ? `$${pay}` : '—'}
                        </div>
                        <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                          {paid
                            ? <span style={{ fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 7px', borderRadius: 3, fontWeight: 800 }}>CASHING</span>
                            : <span style={{ fontSize: 9, color: '#1e3a5f', padding: '2px 7px', borderRadius: 3 }}>OUT</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Board footer */}
                <div style={{ padding: '10px 16px', background: '#050810', display: 'flex', alignItems: 'center', gap: 8, borderTop: '1px solid #0e1a2e' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ffa3', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
                  <span style={{ fontSize: 10, color: '#4a5e7a' }}>
                    {inMoney} of {board.length} traders currently in cashing position · Updates every 3s
                  </span>
                </div>
              </div>

              {/* ── RIGHT RAIL: Entry + Model + Chat ── */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

                {/* Entry card */}
                <div style={{ background: 'linear-gradient(135deg,#04100a,#050d18)', border: '1px solid #00ffa330', borderRadius: 16, padding: '20px' }}>
                  <div style={{ fontSize: 10, color: '#00ffa3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 10 }}>You&apos;re spectating</div>

                  {/* Contest picker */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                    {CONTESTS.slice(0,4).map(c => (
                      <div key={c.id} onClick={() => setSelectedContest(c)}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: selectedContest.id===c.id?`${c.color}12`:'#080d16', border: `1px solid ${selectedContest.id===c.id?c.color+'40':'#0e1a2e'}`, borderRadius: 9, cursor: 'pointer', transition: 'all 0.15s' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 700, color: selectedContest.id===c.id?'#fff':'#7f93b5' }}>{c.name}</span>
                        <span style={{ fontSize: 13, fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>${c.fee}</span>
                        <span style={{ fontSize: 9, color: '#2a4060' }}>{c.filled}/{c.max}</span>
                      </div>
                    ))}
                  </div>

                  <button onClick={() => enter(selectedContest)} disabled={!!entering}
                    style={{ width: '100%', padding: '14px', background: entering?'#0a1020':'linear-gradient(135deg,#00ffa3,#00cc80)', color: '#03050a', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 900, cursor: entering?'not-allowed':'pointer', animation: 'yn-glow 2.5s ease-in-out infinite', letterSpacing: 0.5, marginBottom: 10 }}>
                    {entering ? 'Loading…' : `⚡ Enter ${selectedContest.name} — $${selectedContest.fee}`}
                  </button>
                  <div style={{ fontSize: 10, color: '#2a4060', textAlign: 'center' }}>Stripe checkout · Simulated trading · Real payouts</div>
                </div>

                {/* Prize pool model */}
                <div style={{ background: '#080d16', border: '1px solid #0e1a2e', borderRadius: 16, padding: '18px' }}>
                  <div style={{ fontSize: 12, fontWeight: 900, color: '#fff', marginBottom: 4 }}>How payouts work</div>
                  <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 12, lineHeight: 1.6 }}>
                    Every entry fee goes into the prize pool. <strong style={{ color: '#fff' }}>House takes 20%.</strong> The remaining <strong style={{ color: '#00ffa3' }}>80%</strong> is split among the top 10 traders — proportionally by their P&L%. The better you trade relative to others, the bigger your cut.
                  </div>
                  {/* Example */}
                  <div style={{ background: '#0a0f1a', borderRadius: 10, padding: '12px', marginBottom: 10 }}>
                    <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 8 }}>
                      Example: {selectedContest.filled} traders × ${selectedContest.fee} = <strong style={{ color: '#fff' }}>${(selectedContest.filled * selectedContest.fee).toLocaleString()}</strong> collected
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 11, color: '#4a5e7a' }}>House (20%)</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#ff2244', fontFamily: 'monospace' }}>−${Math.floor(selectedContest.filled * selectedContest.fee * HOUSE_CUT).toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 11, color: '#4a5e7a' }}>Prize pool (80%)</span>
                      <span style={{ fontSize: 14, fontWeight: 900, color: '#00ffa3', fontFamily: 'monospace' }}>${Math.floor(selectedContest.filled * selectedContest.fee * (1 - HOUSE_CUT)).toLocaleString()}</span>
                    </div>
                  </div>
                  {/* Rank payouts from pool */}
                  <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Approximate payouts from pool</div>
                  {[1,2,3,4,5].map(rank => {
                    const pool = selectedContest.filled * selectedContest.fee * (1 - HOUSE_CUT)
                    const pay = examplePayout(rank, pool)
                    const pcts = ['~30%','~20%','~14%','~10%','~7%']
                    return (
                      <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #07111c' }}>
                        <span style={{ fontSize: 12, color: rank===1?'#ffcc00':rank<=3?'#7f93b5':'#4a5e7a', fontFamily: 'monospace', fontWeight: 700 }}>
                          {rank===1?'🥇':rank===2?'🥈':rank===3?'🥉':'  #'+rank} place
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 10, color: '#4a5e7a' }}>{pcts[rank-1]} of pool</span>
                          <span style={{ fontSize: 14, fontWeight: 900, color: '#ffcc00', fontFamily: 'monospace' }}>${pay.toLocaleString()}</span>
                        </div>
                      </div>
                    )
                  })}
                  <div style={{ marginTop: 10, fontSize: 10, color: '#1e3a5f', lineHeight: 1.5 }}>
                    Your exact payout scales with your P&L% relative to other top 10 traders. Higher performance = bigger slice. House is capped at 20% — we can never owe more than we collected.
                  </div>
                </div>

                {/* Chat */}
                <div style={{ background: '#080d16', border: '1px solid #0e1a2e', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '10px 14px', borderBottom: '1px solid #0e1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#8855ff', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
                    <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Arena Chat</span>
                    <span style={{ fontSize: 10, color: '#4a5e7a' }}>{viewers.toLocaleString()}</span>
                  </div>
                  <div ref={chatRef} style={{ height: 200, overflowY: 'auto', padding: '8px 14px' }}>
                    {chatMsgs.map((m, i) => (
                      <div key={i} style={{ fontSize: 12, lineHeight: 1.6, marginBottom: 1, animation: i===chatMsgs.length-1?'yn-fade 0.2s ease':'none' }}>
                        <span style={{ fontWeight: 800, color: m.color, marginRight: 5 }}>{m.user}</span>
                        <span style={{ color: '#cdd6f4' }}>{m.text}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ padding: '8px 10px', borderTop: '1px solid #0e1a2e', display: 'flex', gap: 6 }}>
                    <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter' && chatInput.trim()) { const color = chatColors[Math.floor(Math.random()*chatColors.length)]; setChatMsgs(m=>{const next=[...m.slice(-60),{user:'You',text:chatInput,color}];setTimeout(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},10);return next}); setChatInput('') }}}
                      placeholder="Say something…"
                      style={{ flex:1, background:'#0a0f1a', border:'1px solid #1a2d4a', borderRadius:7, padding:'7px 11px', color:'#cdd6f4', fontSize:12, outline:'none' }} />
                    <button onClick={() => { if(chatInput.trim()){const color=chatColors[Math.floor(Math.random()*chatColors.length)];setChatMsgs(m=>{const next=[...m.slice(-60),{user:'You',text:chatInput,color}];setTimeout(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight},10);return next});setChatInput('')}}}
                      style={{ background:'#8855ff', border:'none', borderRadius:7, padding:'7px 14px', cursor:'pointer', fontSize:11, fontWeight:800, color:'#fff' }}>
                      Send
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ── CONTESTS ROW ── */}
            <div>
              <div style={{ fontSize: 11, color: '#4a5e7a', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 12 }}>All Open Contests</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: 12 }}>
                {CONTESTS.map(c => {
                  const fill = Math.round((c.filled/c.max)*100)
                  const spotsLeft = c.max - c.filled
                  return (
                    <div key={c.id} onClick={() => setSelectedContest(c)}
                      className="yn-contest-card"
                      style={{ background: '#080d16', border: `1px solid ${selectedContest.id===c.id?c.color+'50':'#0e1a2e'}`, borderTop: `2px solid ${c.color}`, borderRadius: 12, padding: '16px 18px', boxShadow: selectedContest.id===c.id?`0 0 24px ${c.color}15`:'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                        <div>
                          <div style={{ fontSize: 9, color: c.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 4 }}>{c.tier.toUpperCase()} · {c.allowed}</div>
                          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{c.name}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: 22, fontWeight: 900, color: c.color, fontFamily: 'monospace' }}>${c.fee}</div>
                          <div style={{ fontSize: 9, color: '#4a5e7a' }}>entry</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 12, lineHeight: 1.5 }}>{c.description}</div>
                      {/* Fill bar */}
                      <div style={{ height: 3, background: '#0e1a2e', borderRadius: 2, marginBottom: 8, overflow: 'hidden' }}>
                        <div style={{ width: `${fill}%`, height: '100%', background: `linear-gradient(90deg,${c.color},${c.color}aa)`, transition: 'width 1s ease' }} />
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 10, color: spotsLeft<20?'#ff7700':'#4a5e7a' }}>
                          {spotsLeft < 5 ? '🔥 ' : ''}{spotsLeft} spots left
                        </span>
                        <button onClick={e => { e.stopPropagation(); enter(c) }} disabled={!!entering}
                          style={{ fontSize: 11, fontWeight: 800, background: `${c.color}18`, color: c.color, border: `1px solid ${c.color}40`, borderRadius: 7, padding: '5px 14px', cursor: 'pointer' }}>
                          Enter ${c.fee}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* ── RECENT PAYOUTS ── */}
            <div style={{ background: '#080d16', border: '1px solid #0e1a2e', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0e1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 900, color: '#ffcc00' }}>🏆 Recent Payouts</span>
                <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 'auto' }}>$47,320 paid this month</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 0 }}>
                {PAST.map((p, i) => (
                  <div key={i} style={{ padding: '14px 20px', borderBottom: '1px solid #07111c', borderRight: '1px solid #07111c' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{p.name}</span>
                      <span style={{ fontSize: 16, fontWeight: 900, color: '#00ffa3', fontFamily: 'monospace' }}>{p.won}</span>
                    </div>
                    <div style={{ fontSize: 10, color: '#4a5e7a' }}>
                      {p.contest} · <span style={{ color: '#00ffa3', fontWeight: 700 }}>{p.pct}</span> · {p.entry} entry · {p.date}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ════════════════════════════════════════════════
            STREAMS TAB
        ════════════════════════════════════════════════ */}
        {tab === 'streams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Two banners: Go live + Creator Program */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 12 }}>
              <div style={{ background: 'linear-gradient(135deg,#1a0020,#0a0820)', border: '1px solid #ff224430', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#ff224420', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Radio size={18} color="#ff2244" />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Stream your live trades</div>
                  <div style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5 }}>Enter a tournament → hit <strong style={{ color: '#ff2244' }}>Go Live</strong> → your chart broadcasts to the Arena in real-time.</div>
                </div>
                <a href="/arena/tournament/daily-blitz?entered=daily-blitz" onClick={() => localStorage.setItem('yn_tournament_daily-blitz','true')}
                  style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#ff2244,#c0392b)', color: '#fff', fontWeight: 800, fontSize: 11, borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Enter &amp; Stream →
                </a>
              </div>
              <div style={{ background: 'linear-gradient(135deg,#08200a,#081520)', border: '1px solid #00ffa330', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 38, height: 38, borderRadius: 10, background: '#00ffa320', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: 18 }}>💰</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#fff', marginBottom: 3 }}>Earn 12% on every viewer entry</div>
                  <div style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5 }}>Creator program: your code, your viewers, your commission. Monthly floor guarantee for Pro+ streamers.</div>
                </div>
                <Link href="/arena/creator"
                  style={{ padding: '9px 16px', background: 'linear-gradient(135deg,#00ffa3,#00cc80)', color: '#02030a', fontWeight: 800, fontSize: 11, borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>
                  Apply →
                </Link>
              </div>
            </div>

            {/* Selected stream - full view */}
            {selectedStream && (
              <div style={{ background: '#080d16', border: `1px solid ${selectedStream.color}30`, borderRadius: 16, overflow: 'hidden', animation: 'yn-fade 0.2s ease' }}>
                <div style={{ padding: '12px 18px', borderBottom: '1px solid #0e1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff2244', animation: 'yn-pulse 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{selectedStream.name}</span>
                  <span style={{ fontSize: 11, color: '#4a5e7a' }}>{selectedStream.asset} · {selectedStream.tf}m</span>
                  <div style={{ fontSize: 13, fontWeight: 900, color: selectedStream.pct>=0?'#00ffa3':'#ff2244', fontFamily: 'monospace', marginLeft: 'auto' }}>
                    {selectedStream.pct>=0?'+':''}{selectedStream.pct.toFixed(1)}%
                  </div>
                  <button onClick={() => setSelectedStream(null)} style={{ background: 'none', border: '1px solid #0e1a2e', borderRadius: 6, color: '#4a5e7a', padding: '4px 12px', fontSize: 11, cursor: 'pointer' }}>Close</button>
                </div>
                <div style={{ height: 400, position: 'relative' }}>
                  <TradingViewChart symbol={selectedStream.asset} interval={selectedStream.tf} hideSideToolbar={true} studies={[]} />
                  <div style={{ position: 'absolute', top: 12, left: 12, display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(3,5,10,0.85)', borderRadius: 8, padding: '8px 12px', backdropFilter: 'blur(8px)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: `${selectedStream.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: selectedStream.color }}>{selectedStream.init}</div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{selectedStream.name}</div>
                      <div style={{ fontSize: 20, fontWeight: 900, color: selectedStream.pct>=0?'#00ffa3':'#ff2244', fontFamily: 'monospace' }}>{selectedStream.pct>=0?'+':''}{selectedStream.pct.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div style={{ position: 'absolute', bottom: 12, left: 12, display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(3,5,10,0.75)', borderRadius: 6, padding: '5px 10px' }}>
                    <Eye size={11} color="#fff" />
                    <span style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace', fontWeight: 700 }}>{selectedStream.viewers.toLocaleString()}</span>
                  </div>
                  <div style={{ position: 'absolute', top: 12, right: 12, background: '#ff2244', borderRadius: 4, padding: '3px 9px' }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>● LIVE</span>
                  </div>
                </div>
              </div>
            )}

            {/* Stream grid */}
            <div className="yn-stream-grid">
              {STREAMS.map(s => (
                <div key={s.name} onClick={() => setSelectedStream(s)}
                  style={{ background: '#080d16', border: `1px solid ${selectedStream?.name===s.name?s.color+'50':'#0e1a2e'}`, borderRadius: 14, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.18s', boxShadow: selectedStream?.name===s.name?`0 0 24px ${s.color}20`:'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform='scale(1.02)'; (e.currentTarget as HTMLElement).style.borderColor=s.color+'50' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform='scale(1)'; (e.currentTarget as HTMLElement).style.borderColor=selectedStream?.name===s.name?s.color+'50':'#0e1a2e' }}>
                  <div style={{ height: 160, position: 'relative' }}>
                    <TradingViewChart symbol={s.asset} interval={s.tf} hideSideToolbar={true} studies={[]} />
                    <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(3,5,10,0.85)', borderRadius: 7, padding: '5px 9px' }}>
                      <div style={{ width: 22, height: 22, borderRadius: 6, background: `${s.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: s.color }}>{s.init}</div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>{s.name}</span>
                    </div>
                    <div style={{ position: 'absolute', top: 8, right: 8, background: '#ff2244', borderRadius: 3, padding: '2px 7px' }}>
                      <span style={{ fontSize: 8, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>● LIVE</span>
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, right: 8, fontSize: 13, fontWeight: 900, color: s.pct>=0?'#00ffa3':'#ff2244', fontFamily: 'monospace', background: 'rgba(3,5,10,0.8)', borderRadius: 5, padding: '3px 8px' }}>
                      {s.pct>=0?'+':''}{s.pct.toFixed(1)}%
                    </div>
                    <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(3,5,10,0.75)', borderRadius: 5, padding: '3px 8px' }}>
                      <Eye size={10} color="#7f93b5" />
                      <span style={{ fontSize: 10, color: '#7f93b5', fontFamily: 'monospace' }}>{s.viewers.toLocaleString()}</span>
                    </div>
                  </div>
                  <div style={{ padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: '#4a5e7a' }}>{s.asset} · {s.tf === '60' ? '1H' : s.tf === '240' ? '4H' : s.tf + 'm'}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#8855ff' }}>Watch →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════
            LEADERBOARD TAB
        ════════════════════════════════════════════════ */}
        {tab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* All-time stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
              {[
                { label: 'Total Paid Out', value: '$47,320', color: '#ffcc00', sub: 'real money, real traders' },
                { label: 'Active Traders', value: '3,847', color: '#00ffa3', sub: 'competing this month' },
                { label: 'Tournaments Run', value: '2,156', color: '#8855ff', sub: 'since launch' },
                { label: 'Biggest Return', value: '+912%', color: '#ff7700', sub: 'Priya S. — Crypto Night' },
              ].map(({ label, value, color, sub }) => (
                <div key={label} style={{ background: '#080d16', border: `1px solid ${color}20`, borderTop: `2px solid ${color}`, borderRadius: 12, padding: '16px 18px' }}>
                  <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: -1, marginBottom: 4 }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#2a4060' }}>{sub}</div>
                </div>
              ))}
            </div>

            {/* All-time board */}
            <div style={{ background: '#080d16', border: '1px solid #0e1a2e', borderRadius: 16, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0e1a2e', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Crown size={14} color="#ffcc00" />
                <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>All-Time Leaderboard</span>
                <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 'auto' }}>Ranked by total earned</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '44px 32px 1fr 80px 90px 80px 80px', padding: '7px 18px', background: '#050810', borderBottom: '1px solid #0e1a2e' }}>
                {['','#','TRADER','WIN RATE','EARNED','BEST','STREAK'].map(h => (
                  <div key={h} style={{ fontSize: 8, color: '#1e3a5f', fontWeight: 700, letterSpacing: '0.1em', textAlign: ['WIN RATE','EARNED','BEST','STREAK'].includes(h)?'right':'left' }}>{h}</div>
                ))}
              </div>
              {[
                { name:'Marcus T.',  init:'MT', wr:67, earned:4280, best:1,  streak:5,  color:'#ffcc00', badge:'👑' },
                { name:'Priya S.',   init:'PS', wr:71, earned:3920, best:1,  streak:3,  color:'#00ffa3', badge:'🔥' },
                { name:'Devon P.',   init:'DP', wr:58, earned:2847, best:2,  streak:2,  color:'#0088ff' },
                { name:'Sarah K.',   init:'SK', wr:62, earned:2410, best:1,  streak:4,  color:'#8855ff' },
                { name:'Ryan C.',    init:'RC', wr:54, earned:1980, best:3,  streak:1,  color:'#ff7700' },
                { name:'Jordan M.',  init:'JM', wr:49, earned:1642, best:4,  streak:0,  color:'#ff2244' },
                { name:'Aisha B.',   init:'AB', wr:55, earned:1389, best:2,  streak:2,  color:'#00ffa3' },
                { name:'Chris L.',   init:'CL', wr:44, earned:1102, best:5,  streak:0,  color:'#ffcc00' },
                { name:'Nina R.',    init:'NR', wr:51, earned:987,  best:3,  streak:1,  color:'#0088ff' },
                { name:'Tyler W.',   init:'TW', wr:41, earned:823,  best:7,  streak:0,  color:'#8855ff' },
              ].map((t, i) => (
                <div key={t.name} style={{ display: 'grid', gridTemplateColumns: '44px 32px 1fr 80px 90px 80px 80px', padding: '11px 18px', borderBottom: '1px solid #07111c', background: i<3?`${t.color}07`:'transparent' }}>
                  <div style={{ fontSize: 18 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace', alignSelf: 'center' }}>#{i+1}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 9, background: `${t.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color: t.color, flexShrink: 0 }}>{t.init}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{t.name} {t.badge || ''}</div>
                      <div style={{ height: 3, background: '#0e1a2e', borderRadius: 2, width: 80, overflow: 'hidden', marginTop: 3 }}>
                        <div style={{ width: `${t.wr}%`, height: '100%', background: t.color }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: 13, fontWeight: 700, color: '#4a5e7a', alignSelf: 'center' }}>{t.wr}%</div>
                  <div style={{ textAlign: 'right', fontSize: 15, fontWeight: 900, color: '#ffcc00', fontFamily: 'monospace', alignSelf: 'center' }}>${t.earned.toLocaleString()}</div>
                  <div style={{ textAlign: 'right', fontSize: 12, color: t.color, fontFamily: 'monospace', fontWeight: 700, alignSelf: 'center' }}>#{t.best}</div>
                  <div style={{ textAlign: 'right', alignSelf: 'center' }}>
                    {t.streak > 0
                      ? <span style={{ fontSize: 12, color: '#ff7700', fontWeight: 800, fontFamily: 'monospace' }}>🔥 {t.streak}</span>
                      : <span style={{ fontSize: 11, color: '#1e3a5f' }}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ borderTop: '1px solid #0e1a2e', paddingTop: 16, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
          <div style={{ fontSize: 10, color: '#1e3a5f' }}>All tournaments use simulated accounts · Real payouts via Stripe · Not financial advice · © 2026 YN Finance</div>
          <div style={{ display: 'flex', gap: 16, fontSize: 11 }}>
            <Link href="/"        style={{ color: '#1e3a5f', textDecoration: 'none' }}>Home</Link>
            <Link href="/courses" style={{ color: '#1e3a5f', textDecoration: 'none' }}>Courses</Link>
            <Link href="/app"     style={{ color: '#1e3a5f', textDecoration: 'none' }}>Terminal</Link>
            <Link href="/privacy" style={{ color: '#1e3a5f', textDecoration: 'none' }}>Privacy</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
