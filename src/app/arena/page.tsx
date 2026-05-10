'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Trophy, Zap, Users, TrendingUp, TrendingDown, Play, Crown, Flame } from 'lucide-react'

// ── SEEDED DATA ─────────────────────────────────────────────────────────────

const TRADER_NAMES = ['Marcus T.','Sarah K.','Devon P.','Jordan M.','Aisha B.','Chris L.','Nina R.','Tyler W.','Priya S.','Alex M.','Ryan C.','Zoe H.','Kai N.','Leila F.','Omar J.','Tessa W.','Ben K.','Mia L.','Jake R.','Chloe D.']
const TRADER_COLORS = ['#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35']
const TICKERS = ['$AAPL','$NVDA','$TSLA','$SPY','$QQQ','BTC/USD','ETH/USD','EUR/USD','$AMZN','$META','GC (Gold)','ES (S&P)']

const CHAT_MSGS = [
  ['🔥🔥🔥 MARCUS ON FIRE','ChatUser1'],['bro sarah is printing rn 💀','xtrader99'],['LETS GOOOO TOP 3 LOCKED IN 🚀','TradingBull'],
  ['gg ez for the top players','MarketWatcher'],['this is insane wtf','NewTrader22'],['i been watching for 2 hours cant stop 😭','ViewerK'],
  ['the leaderboard is MOVING','ScalpKing'],['who enters tomorrow tourney?? 🙋','DayTrader55'],['AISHA JUST FLIPPED THE CHART 📈','chartReader'],
  ['Devon is a machine bro fr','FXGod'],['only $1 to enter and these guys are printing??','SkepticalViewer'],['SOMEONE STOP MARCUS','excited_trader'],
  ['that SPY call was CLEAN 👏','OptionsGang'],['top 20% getting paid today 💰','PrizeHunter'],['bro the volatility rn 😤','VolTrader'],
  ['chat is going crazy 😂','Moderator'],['jordan m always in top 5','regularViewer'],['this platform bussin no cap','GenZTrader'],
  ['the P&L bars are moving so fast 💀','DataNerd'],['NINA WITH THE COMEBACK ARC 🎯','DramaWatcher'],['who is priya s?? she’s cooking','CuriousViewer'],
  ['TYLER W JUST WENT NEGATIVE 💀','BearishSam'],['the countdown is giving me anxiety','AnxiousTrader'],['I should have entered today 😭','Regret99'],
  ['live trading tournaments are the future 🔮','VisionaryTrader'],['mia L is sneaky top 5 rn','StealthMode'],
]

const ALERTS = [
  (n: string, t: string, p: number) => `🔥 ${n} just CLOSED +${p.toFixed(1)}% on ${t} — MASSIVE`,
  (n: string, t: string, p: number) => `⚡ ${n} opened a ${t} position — ${p > 0 ? 'LONG' : 'SHORT'} bias`,
  (n: string, t: string, p: number) => `🚀 ${n} UP ${p.toFixed(1)}% — CLIMBING THE BOARD`,
  (n: string, t: string) => `📊 ${n} just placed their 10th trade on ${t} today`,
  (n: string) => `👑 ${n} takes the lead — can anyone stop them??`,
]

// ── HELPERS ─────────────────────────────────────────────────────────────────

function seeded(i: number, tick: number, range: number, offset = 0) {
  return (((i * 2654435761 + tick * 31337 + offset * 999983) >>> 0) % range)
}

function genBoard(tick: number) {
  return TRADER_NAMES.map((name, i) => {
    const base = seeded(i, 0, 3000, 7) - 1200
    const drift = seeded(i, tick, 400, 3) - 180
    const pct = (base + drift) / 100
    return { name, pct, pnl: (10000 * pct) / 100, trades: 4 + seeded(i, tick, 22, 5), color: TRADER_COLORS[i] }
  }).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

function Countdown({ end }: { end: Date }) {
  const [ms, setMs] = useState(end.getTime() - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.getTime() - Date.now()), 1000); return () => clearInterval(t) }, [end])
  if (ms <= 0) return <span style={{ color: '#ff1744', fontFamily: 'monospace' }}>ENDED</span>
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <span style={{ fontFamily: 'monospace', letterSpacing: 2 }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}

// ── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function BreakingTicker({ alerts }: { alerts: string[] }) {
  return (
    <div style={{ background: '#ff1744', height: 32, display: 'flex', alignItems: 'center', overflow: 'hidden', position: 'relative' }}>
      <div style={{ background: '#cc0000', padding: '0 16px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0, zIndex: 1, borderRight: '2px solid #ff4444' }}>
        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>🔴 LIVE</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 64, animation: 'yn-scroll 28s linear infinite', whiteSpace: 'nowrap', paddingLeft: 32 }}>
          {[...alerts, ...alerts].map((a, i) => (
            <span key={i} style={{ fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.05em' }}>
              {a} &nbsp;&nbsp;·&nbsp;&nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function LiveChat({ messages }: { messages: { user: string; text: string; color: string }[] }) {
  const endRef = useRef<HTMLDivElement>(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
      {messages.map((m, i) => (
        <div key={i} style={{ fontSize: 12, lineHeight: 1.5, animation: i === messages.length - 1 ? 'yn-fadein 0.3s ease' : 'none' }}>
          <span style={{ fontWeight: 800, color: m.color, marginRight: 6 }}>{m.user}</span>
          <span style={{ color: '#cdd6f4' }}>{m.text}</span>
        </div>
      ))}
      <div ref={endRef} />
    </div>
  )
}

function BigTradeAlert({ alert, onDone }: { alert: string; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 4000); return () => clearTimeout(t) }, [alert, onDone])
  return (
    <div style={{ position: 'fixed', top: 80, right: 24, zIndex: 999, background: 'linear-gradient(135deg, #00ff88, #00cc66)', border: '2px solid #00ff88', borderRadius: 14, padding: '14px 20px', maxWidth: 360, boxShadow: '0 0 48px rgba(0,255,136,0.6)', animation: 'yn-popin 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
      <div style={{ fontSize: 13, fontWeight: 900, color: '#04080f', lineHeight: 1.4 }}>{alert}</div>
    </div>
  )
}

// ── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [tick, setTick] = useState(0)
  const [board, setBoard] = useState(() => genBoard(0))
  const [chatMsgs, setChatMsgs] = useState<{ user: string; text: string; color: string }[]>([])
  const [alert, setAlert] = useState('')
  const [viewers, setViewers] = useState(1247)
  const [chatInput, setChatInput] = useState('')
  const [prizePool] = useState(312)
  const chatColors = ['#00ff88','#1e90ff','#bf5fff','#ffd700','#ff6b35','#ff69b4','#00bfff']

  const closeTime = new Date(); closeTime.setHours(16, 0, 0, 0)

  const tickingAlerts = [
    `MARCUS T. CLOSES +18.4% ON $NVDA — LEADERBOARD SHAKING`,
    `SARAH K. OPENS SHORT ON BTC/USD — BOLD PLAY`,
    `$312 PRIZE POOL LIVE — 390 TRADERS COMPETING`,
    `DEVON P. JUST HIT 15 TRADES — MOST ACTIVE TODAY`,
    `JORDAN M. CLIMBS TO #4 — MOMENTUM BUILDING`,
    `TODAY'S BLITZ ENDS AT 4PM ET — ENTER NOW`,
    `AISHA B. REVERSES POSITION — LONG TO SHORT ON $TSLA`,
    `TOP 20% = 78 TRADERS GET PAID TODAY`,
  ]

  // Board ticks every 2s
  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => n + 1)
      setBoard(genBoard(tick + 1))
      setViewers(v => v + Math.floor(Math.random() * 7) - 2)
    }, 2000)
    return () => clearInterval(t)
  }, [tick])

  // Chat messages stream in
  useEffect(() => {
    const addMsg = () => {
      const [text, user] = CHAT_MSGS[Math.floor(Math.random() * CHAT_MSGS.length)]
      const color = chatColors[Math.floor(Math.random() * chatColors.length)]
      setChatMsgs(msgs => [...msgs.slice(-60), { user, text, color }])
    }
    addMsg()
    const t = setInterval(addMsg, 1200 + Math.random() * 1800)
    return () => clearInterval(t)
  }, [])

  // Big trade alerts every ~12s
  useEffect(() => {
    const fire = () => {
      const trader = TRADER_NAMES[Math.floor(Math.random() * 10)]
      const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)]
      const pct = (Math.random() * 15 + 3)
      const fn = ALERTS[Math.floor(Math.random() * ALERTS.length)]
      setAlert(fn(trader, ticker, pct))
    }
    const t = setInterval(fire, 10000 + Math.random() * 8000)
    return () => clearInterval(t)
  }, [])

  const top3 = board.slice(0, 3)
  const rest = board.slice(3, 20)
  const inMoney = Math.ceil(board.length * 0.2)

  const sendChat = () => {
    if (!chatInput.trim()) return
    const color = chatColors[Math.floor(Math.random() * chatColors.length)]
    setChatMsgs(msgs => [...msgs.slice(-60), { user: 'You', text: chatInput, color }])
    setChatInput('')
  }

  return (
    <div style={{ background: '#04080f', minHeight: '100vh', color: '#e8e8f0', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes yn-scroll { from { transform: translateX(0) } to { transform: translateX(-50%) } }
        @keyframes yn-pulse { 0%,100% { opacity:1;transform:scale(1) } 50% { opacity:0.4;transform:scale(0.8) } }
        @keyframes yn-fadein { from { opacity:0;transform:translateY(8px) } to { opacity:1;transform:translateY(0) } }
        @keyframes yn-popin { from { opacity:0;transform:translateX(60px) scale(0.8) } to { opacity:1;transform:translateX(0) scale(1) } }
        @keyframes yn-glow { 0%,100% { box-shadow:0 0 20px rgba(0,255,136,0.3) } 50% { box-shadow:0 0 48px rgba(0,255,136,0.7) } }
        @keyframes yn-shimmer { 0% { background-position:-200% center } 100% { background-position:200% center } }
        @keyframes yn-rankup { 0% { background:rgba(0,255,136,0.25) } 100% { background:transparent } }
        @keyframes yn-float { 0%,100% { transform:translateY(0) } 50% { transform:translateY(-6px) } }
        ::-webkit-scrollbar { width: 4px } ::-webkit-scrollbar-track { background: #0a0f1a } ::-webkit-scrollbar-thumb { background: #1a2d4a; border-radius:4px }
        .yn-gold { background: linear-gradient(135deg,#ffd700,#ff8c00); -webkit-background-clip:text; -webkit-text-fill-color:transparent }
        .yn-fire { background: linear-gradient(135deg,#ff6b35,#ff1744); -webkit-background-clip:text; -webkit-text-fill-color:transparent }
        .yn-green { background: linear-gradient(135deg,#00ff88,#00cc66); -webkit-background-clip:text; -webkit-text-fill-color:transparent }
      `}</style>

      {/* Big trade alert overlay */}
      {alert && <BigTradeAlert alert={alert} onDone={() => setAlert('')} />}

      {/* ── BREAKING TICKER ── */}
      <BreakingTicker alerts={tickingAlerts} />

      {/* ── NAV ── */}
      <nav style={{ background: 'rgba(4,8,15,0.97)', borderBottom: '1px solid #0f1f38', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(12px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', height: 58, gap: 20 }}>
          {/* Logo */}
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: 'linear-gradient(135deg, #ffd700, #ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'yn-glow 2s ease-in-out infinite' }}>
              <Trophy size={17} color="#04080f" fill="#04080f" />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1 }}>YN Arena</div>
              <div style={{ fontSize: 8, color: '#ffd700', letterSpacing: 3, textTransform: 'uppercase', lineHeight: 1 }}>by YN Finance</div>
            </div>
          </Link>

          {/* Live badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#ff1744', padding: '4px 10px', borderRadius: 4 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 900, color: '#fff', letterSpacing: '0.15em' }}>LIVE</span>
          </div>

          {/* Viewer count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#7f93b5' }}>
            <Users size={12} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#cdd6f4' }}>{viewers.toLocaleString()}</span>
            <span>watching</span>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Link href="/" style={{ fontSize: 12, color: '#4a5e7a', textDecoration: 'none' }}>← YN Finance</Link>
            <Link href="/courses" style={{ fontSize: 12, color: '#4a5e7a', textDecoration: 'none', padding: '6px 12px', border: '1px solid #1a2d4a', borderRadius: 6 }}>Courses</Link>
            <Link href="/app" style={{ fontSize: 12, color: '#4a5e7a', textDecoration: 'none', padding: '6px 12px', border: '1px solid #1a2d4a', borderRadius: 6 }}>Terminal</Link>
            <button style={{ fontSize: 13, fontWeight: 900, background: 'linear-gradient(135deg, #ffd700, #ff6b35)', color: '#04080f', border: 'none', borderRadius: 8, padding: '8px 20px', cursor: 'pointer', letterSpacing: 0.5 }}>
              Enter — $1
            </button>
          </div>
        </div>
      </nav>

      {/* ── TOURNAMENT BANNER ── */}
      <div style={{ background: 'linear-gradient(135deg, #0a0f1a, #0d1520)', borderBottom: '1px solid #0f1f38', padding: '16px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#ffd700', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 4 }}>
              🏆 Daily Blitz Tournament · All Markets
            </div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>
              Today&apos;s tournament closes in&nbsp;
              <span style={{ color: '#ff6b35' }}><Countdown end={closeTime} /></span>
            </div>
          </div>
          {[
            { label: 'Prize Pool', value: `$${prizePool}`, color: '#ffd700' },
            { label: 'Competitors', value: '390', color: '#00ff88' },
            { label: 'Entry Fee', value: '$1.00', color: '#1e90ff' },
            { label: 'Pays Top', value: '20%', color: '#bf5fff' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ textAlign: 'center', background: '#0a0f1a', border: `1px solid ${color}25`, borderRadius: 10, padding: '10px 20px', minWidth: 100 }}>
              <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
              <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
            </div>
          ))}
          <button style={{ fontSize: 14, fontWeight: 900, background: 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#04080f', border: 'none', borderRadius: 10, padding: '13px 28px', cursor: 'pointer', boxShadow: '0 0 32px rgba(0,255,136,0.4)', animation: 'yn-glow 2s ease-in-out infinite', letterSpacing: 0.5 }}>
            ⚡ JOIN NOW
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, maxWidth: 1400, margin: '0 auto', width: '100%', padding: '16px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, minHeight: 0 }}>

        {/* ── LEFT: Leaderboard + Highlights ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>

          {/* Podium — top 3 */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0f1f38', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <Crown size={16} color="#ffd700" />
              <span style={{ fontSize: 12, fontWeight: 900, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Podium</span>
              <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 4 }}>Top 3 fighting for 40% · 25% · 15%</span>
              <div style={{ marginLeft: 'auto', fontSize: 9, color: '#4a5e7a', fontFamily: 'monospace' }}>Updates every 2s</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {top3.map((t, i) => {
                const medals = ['🥇','🥈','🥉']
                const cuts = ['40%','25%','15%']
                const amounts = [Math.floor(prizePool * 0.4), Math.floor(prizePool * 0.25), Math.floor(prizePool * 0.15)]
                return (
                  <div key={t.name} style={{ background: i === 0 ? 'rgba(255,215,0,0.07)' : '#0d1520', border: `1px solid ${i === 0 ? '#ffd70040' : '#0f1f38'}`, borderRadius: 12, padding: '16px 14px', textAlign: 'center', transition: 'all 0.4s ease' }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>{medals[i]}</div>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: `${t.color}20`, border: `2px solid ${t.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 14, fontWeight: 900, color: t.color }}>
                      {t.name.slice(0,2).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 4 }}>{t.name}</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: t.pct >= 0 ? '#00ff88' : '#ff1744', fontFamily: 'monospace', marginBottom: 4 }}>
                      {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(2)}%
                    </div>
                    <div style={{ fontSize: 11, color: '#ffd700', fontWeight: 800, fontFamily: 'monospace' }}>${amounts[i]} prize</div>
                    <div style={{ fontSize: 9, color: '#4a5e7a', marginTop: 4 }}>{cuts[i]} of pool · {t.trades} trades</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Full leaderboard */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0f1f38', borderRadius: 14, overflow: 'hidden', flex: 1 }}>
            {/* Header */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #0f1f38', display: 'flex', alignItems: 'center', gap: 10, background: '#0d1520' }}>
              <Flame size={14} color="#ff6b35" />
              <span style={{ fontSize: 12, fontWeight: 900, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Live Scoreboard</span>
              <span style={{ fontSize: 10, color: '#4a5e7a' }}>— {board.length} traders · top {inMoney} in the money</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize: 9, color: '#00ff88', fontFamily: 'monospace' }}>LIVE</span>
              </div>
            </div>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '44px 36px 1fr 80px 80px 72px 64px', padding: '8px 16px', borderBottom: '1px solid #0a1220' }}>
              {['','RANK','TRADER','P&L %','P&L $','TRADES','STATUS'].map(h => (
                <div key={h} style={{ fontSize: 9, color: '#2a4060', fontWeight: 700, letterSpacing: '0.1em', textAlign: h === 'P&L %' || h === 'P&L $' || h === 'TRADES' ? 'right' : 'left' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            <div style={{ overflowY: 'auto', maxHeight: 420 }}>
              {rest.map((t, i) => {
                const rank = i + 4
                const inM = rank <= inMoney
                return (
                  <div key={t.name} style={{
                    display: 'grid', gridTemplateColumns: '44px 36px 1fr 80px 80px 72px 64px',
                    padding: '9px 16px', borderBottom: '1px solid #08111c',
                    background: inM ? `${t.color}07` : 'transparent',
                    transition: 'background 0.4s ease',
                  }}>
                    <div style={{ fontSize: 16 }}>{rank <= 5 ? ['','','','4️⃣','5️⃣'][rank - 1] : ''}</div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#4a5e7a', fontFamily: 'monospace' }}>#{rank}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
                        {t.name.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4' }}>{t.name}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 900, color: t.pct >= 0 ? '#00ff88' : '#ff1744', fontFamily: 'monospace' }}>
                      {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(2)}%
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 12, color: t.pnl >= 0 ? '#00cc66' : '#cc2233', fontFamily: 'monospace' }}>
                      {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(0)}
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11, color: '#7f93b5', fontFamily: 'monospace' }}>{t.trades}</div>
                    <div style={{ textAlign: 'right' }}>
                      {inM
                        ? <span style={{ fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 7px', borderRadius: 3, fontWeight: 800, whiteSpace: 'nowrap' }}>IN MONEY</span>
                        : <span style={{ fontSize: 9, color: '#2a4060', background: '#0a1220', padding: '2px 7px', borderRadius: 3, fontWeight: 700 }}>OUT</span>}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* ── RIGHT: Chat + Enter CTA ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Enter CTA */}
          <div style={{ background: 'linear-gradient(135deg, #0d1a0d, #0a1520)', border: '1px solid #00ff8830', borderRadius: 14, padding: '20px' }}>
            <div style={{ fontSize: 11, color: '#00ff88', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 8 }}>You&apos;re spectating</div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 6 }}>Want a shot at the $312 pool?</div>
            <div style={{ fontSize: 12, color: '#7f93b5', marginBottom: 16, lineHeight: 1.6 }}>
              Pay $1, get a $10K account, trade until 4PM. Top 20% gets paid out.
            </div>
            <button style={{ width: '100%', padding: '13px', background: 'linear-gradient(135deg, #00ff88, #00cc66)', color: '#04080f', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 24px rgba(0,255,136,0.35)', letterSpacing: 0.5, animation: 'yn-glow 2.5s ease-in-out infinite' }}>
              ⚡ ENTER FOR $1
            </button>
            <div style={{ fontSize: 10, color: '#2a4060', textAlign: 'center', marginTop: 8 }}>Simulated trading · Prize payouts via Stripe</div>
          </div>

          {/* Live Chat */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0f1f38', borderRadius: 14, overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            {/* Chat header */}
            <div style={{ padding: '11px 16px', borderBottom: '1px solid #0f1f38', background: '#0d1520', display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#bf5fff', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Live Chat</span>
              <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 2 }}>{viewers.toLocaleString()} viewers</span>
              <div style={{ marginLeft: 'auto', fontSize: 9, color: '#bf5fff', fontFamily: 'monospace', background: '#bf5fff15', padding: '2px 7px', borderRadius: 3 }}>TWITCH MODE</div>
            </div>

            <LiveChat messages={chatMsgs} />

            {/* Chat input */}
            <div style={{ padding: '10px 12px', borderTop: '1px solid #0f1f38', display: 'flex', gap: 8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendChat()}
                placeholder="Say something..."
                style={{ flex: 1, background: '#0d1520', border: '1px solid #1a2d4a', borderRadius: 7, padding: '8px 12px', color: '#cdd6f4', fontSize: 12, outline: 'none' }} />
              <button onClick={sendChat}
                style={{ background: '#bf5fff', border: 'none', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 800, color: '#fff' }}>
                Chat
              </button>
            </div>
          </div>

          {/* Upcoming tournaments */}
          <div style={{ background: '#0a0f1a', border: '1px solid #0f1f38', borderRadius: 14, padding: '16px' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd700', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>Coming Up</div>
            {[
              { name: 'Crypto Night Session', fee: '$5', prize: '$940', time: '8PM ET', color: '#bf5fff' },
              { name: "Tomorrow's Opening Bell", fee: '$1', prize: '$0+', time: '9:30AM ET', color: '#1e90ff' },
              { name: 'Weekend Forex Cup', fee: '$10', prize: '$0+', time: 'Sat 9AM', color: '#ffd700' },
            ].map(t => (
              <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #0a1220' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#cdd6f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a' }}>{t.time} · {t.fee} entry</div>
                </div>
                <div style={{ fontSize: 11, fontWeight: 900, color: t.color, fontFamily: 'monospace', flexShrink: 0 }}>{t.prize}</div>
              </div>
            ))}
            <button style={{ width: '100%', marginTop: 12, padding: '9px', background: 'transparent', border: '1px solid #1a2d4a', borderRadius: 8, color: '#7f93b5', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              View All Tournaments →
            </button>
          </div>
        </div>
      </div>

      {/* ── BOTTOM STATS BAR ── */}
      <div style={{ borderTop: '1px solid #0f1f38', background: '#0a0f1a', padding: '10px 24px' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
          {[
            { label: 'Total P&L Generated Today', value: `+$${(board.filter(t => t.pnl > 0).reduce((s, t) => s + t.pnl, 0) / 100).toFixed(0)}K`, color: '#00ff88' },
            { label: 'Biggest Single Win', value: `+${board[0]?.pct.toFixed(2)}%`, color: '#ffd700' },
            { label: 'Most Active Trader', value: board.reduce((a, b) => a.trades > b.trades ? a : b).name, color: '#bf5fff' },
            { label: 'In The Money', value: `${inMoney} traders`, color: '#1e90ff' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}:</span>
              <span style={{ fontSize: 12, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 16, fontSize: 12 }}>
            <Link href="/" style={{ color: '#4a5e7a', textDecoration: 'none' }}>YN Finance</Link>
            <Link href="/courses" style={{ color: '#4a5e7a', textDecoration: 'none' }}>Courses</Link>
            <Link href="/app" style={{ color: '#4a5e7a', textDecoration: 'none' }}>Terminal</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
