'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Trophy, Users, Clock, Zap, TrendingUp, TrendingDown, Shield, ChevronDown, ChevronUp, Crown } from 'lucide-react'

// ─── DATA ────────────────────────────────────────────────────────────────────

const TRADERS = [
  { id: 0, name: 'Marcus T.',  base: 18.4 },
  { id: 1, name: 'Sarah K.',   base: 14.2 },
  { id: 2, name: 'Devon P.',   base: 11.7 },
  { id: 3, name: 'Jordan M.',  base:  9.3 },
  { id: 4, name: 'Aisha B.',   base:  7.8 },
  { id: 5, name: 'Chris L.',   base:  6.1 },
  { id: 6, name: 'Nina R.',    base:  4.4 },
  { id: 7, name: 'Tyler W.',   base:  2.9 },
  { id: 8, name: 'Priya S.',   base:  1.2 },
  { id: 9, name: 'Alex M.',    base: -0.4 },
  { id: 10, name: 'Ryan C.',   base: -1.8 },
  { id: 11, name: 'Zoe H.',    base: -3.2 },
  { id: 12, name: 'Kai N.',    base: -5.1 },
  { id: 13, name: 'Leila F.',  base: -7.6 },
  { id: 14, name: 'Omar J.',   base: -9.3 },
]

const COLORS = ['#00ff88','#00d4aa','#1e90ff','#bf5fff','#ffd700','#ff6b35','#ff69b4','#00bfff','#ffa500','#ff4757','#7f93b5','#4a5e7a','#3a4a5a','#2a3a4a','#1a2a3a']

const PAST = [
  { name: 'Marcus T.', prize: '$125', pct: '+24.8%', tourney: 'Daily Blitz',  date: 'Yesterday',  color: '#ffd700' },
  { name: 'Priya S.',  prize: '$752', pct: '+38.2%', tourney: 'Crypto Night', date: '2 days ago', color: '#bf5fff' },
  { name: 'Devon P.',  prize: '$400', pct: '+31.4%', tourney: 'Pro Showdown', date: '3 days ago', color: '#1e90ff' },
  { name: 'Sarah K.',  prize: '$125', pct: '+19.7%', tourney: 'Daily Blitz',  date: '3 days ago', color: '#00ff88' },
  { name: 'Ryan C.',   prize: '$320', pct: '+28.1%', tourney: 'Forex Cup',    date: '4 days ago', color: '#ff6b35' },
]

const TOURNAMENTS = [
  { id: 'blitz',  name: 'Daily Blitz',       fee: 1,  account: 10_000,  maxSlots: 500, filled: 390, allowed: 'All Markets',  tier: 'standard', color: '#00ff88' },
  { id: 'crypto', name: 'Crypto Night',      fee: 5,  account: 25_000,  maxSlots: 250, filled: 188, allowed: 'Crypto Only',  tier: 'premium',  color: '#1e90ff' },
  { id: 'pro',    name: 'Pro Showdown',       fee: 25, account: 100_000, maxSlots: 100, filled: 44,  allowed: 'All Markets',  tier: 'elite',    color: '#ffd700' },
  { id: 'forex',  name: 'Weekend Forex Cup',  fee: 10, account: 50_000,  maxSlots: 200, filled: 67,  allowed: 'Forex Only',   tier: 'premium',  color: '#bf5fff' },
]

const CHAT_POOL = [
  ['🔥 marcus is cooking rn', 'ScalpKing'],
  ['bro sarah k always top 5', 'xtrader99'],
  ['this is literally better than sports', 'ViewerK'],
  ['i been watching for 2 hours 💀', 'NewTrader22'],
  ['$1 entry and these guys are printing??', 'Skeptic'],
  ['JORDAN M CLIMBING 🚀', 'TradingBull'],
  ['yo the leaderboard is MOVING', 'DataNerd'],
  ['who is devon p, he always wins', 'CuriousV'],
  ['im entering tomorrow no cap', 'Regret99'],
  ['top 20% getting paid today 💰', 'PrizeHunter'],
  ['this is the future of trading fr', 'VisionaryT'],
  ['nina r with the comeback arc 🎯', 'DramaWatch'],
  ['mia L sneaky top 5 👀', 'StealthMode'],
  ['the volatility rn 😤', 'VolTrader'],
  ['i need to stop spectating and enter', 'LurkMode'],
  ['live trading tournaments >>> everything', 'ArenaFan'],
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function buildBoard(offset: number) {
  return TRADERS.map((t, i) => {
    const noise = Math.sin(offset * 0.3 + i * 1.7) * 0.8 + Math.cos(offset * 0.7 + i * 2.3) * 0.4
    return { ...t, pct: +(t.base + noise).toFixed(2) }
  }).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

function Countdown({ hours }: { hours: number }) {
  const end = useRef(Date.now() + hours * 3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.current - Date.now()), 1000); return () => clearInterval(t) }, [])
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</>
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function Ticker() {
  const items = [
    '🏆 MARCUS T. +18.4% — DAILY BLITZ LEADER', '💰 $2,847 PAID OUT THIS WEEK', '🔥 390 TRADERS COMPETING NOW',
    '⚡ NEXT TOURNAMENT STARTS AT 9:30AM ET', '🥇 YESTERDAY: PRIYA S. WON $752 IN CRYPTO NIGHT',
    '📈 SARAH K. CLIMBS TO #2 — LEADERBOARD SHIFTING', '🎯 TOP 20% OF TRADERS GET PAID TODAY',
  ]
  return (
    <div style={{ background: '#c0392b', height: 32, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <div style={{ background: '#962d22', padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>● LIVE</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', animation: 'yn-ticker 40s linear infinite', whiteSpace: 'nowrap' }}>
          {[...items, ...items].map((item, i) => (
            <span key={i} style={{ padding: '0 44px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.03em' }}>{item}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [board, setBoard] = useState(() => buildBoard(0))
  const [offset, setOffset] = useState(0)
  const [viewers, setViewers] = useState(1247)
  const [prizePool] = useState(312)
  const [selectedTournament, setSelectedTournament] = useState(TOURNAMENTS[0])
  const [entering, setEntering] = useState(false)
  const [chatMsgs, setChatMsgs] = useState<{ user: string; text: string; color: string }[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatOpen, setChatOpen] = useState(true)
  const [rulesOpen, setRulesOpen] = useState(false)
  const [alertMsg, setAlertMsg] = useState('')
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatColors = ['#00ff88', '#1e90ff', '#bf5fff', '#ffd700', '#ff6b35', '#ff69b4']

  // Smooth board update — slow drift, not random jumps
  useEffect(() => {
    const t = setInterval(() => {
      setOffset(n => {
        const next = n + 1
        setBoard(buildBoard(next))
        return next
      })
      setViewers(v => Math.max(900, v + Math.round((Math.random() - 0.48) * 8)))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Chat — slower, feels more natural
  useEffect(() => {
    const addMsg = () => {
      const [text, user] = CHAT_POOL[Math.floor(Math.random() * CHAT_POOL.length)]
      setChatMsgs(m => [...m.slice(-50), { user, text, color: chatColors[Math.floor(Math.random() * chatColors.length)] }])
    }
    addMsg()
    const t = setInterval(addMsg, 2800 + Math.random() * 2400)
    return () => clearInterval(t)
  }, [])

  // Auto-scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs.length])

  // Infrequent big alerts
  useEffect(() => {
    const ALERTS = [
      `🔥 ${board[0]?.name} just hit +${board[0]?.pct.toFixed(1)}% — holding the lead`,
      `⚡ Prize pool growing — 3 new entries in the last minute`,
      `🚀 ${board[1]?.name} is climbing fast — closing on 1st place`,
    ]
    const t = setInterval(() => {
      setAlertMsg(ALERTS[Math.floor(Math.random() * ALERTS.length)])
      setTimeout(() => setAlertMsg(''), 5000)
    }, 18000 + Math.random() * 10000)
    return () => clearInterval(t)
  }, [board])

  const enterTournament = async () => {
    setEntering(true)
    try {
      const res = await fetch('/api/stripe/tournament/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: selectedTournament.id,
          tournamentTitle: selectedTournament.name,
          entryFeeCents: selectedTournament.fee * 100,
          tier: selectedTournament.tier,
        }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else window.alert('Configure Stripe in Netlify env vars to accept payments.')
    } catch { window.alert('Error — try again') }
    finally { setEntering(false) }
  }

  const inMoney = Math.ceil(board.length * 0.2)
  const topPrize = Math.floor(prizePool * 0.4)

  return (
    <div style={{ background: '#04080f', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes yn-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }
        @keyframes yn-glow   { 0%,100%{box-shadow:0 0 18px rgba(0,255,136,0.25)} 50%{box-shadow:0 0 40px rgba(0,255,136,0.6)} }
        @keyframes yn-popin  { from{opacity:0;transform:translateY(-12px) scale(0.95)} to{opacity:1;transform:translateY(0) scale(1)} }
        @keyframes yn-fadein { from{opacity:0;transform:translateY(4px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-row    { from{background:rgba(0,255,136,0.12)} to{background:transparent} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:#1a2d4a; border-radius:3px }

        /* MOBILE-FIRST layout */
        .arena-grid { display:flex; flex-direction:column; gap:12px; padding:12px 16px; }
        .arena-side  { display:flex; flex-direction:column; gap:12px; }
        .hide-mobile { display:none !important; }

        @media (min-width: 900px) {
          .arena-grid { display:grid; grid-template-columns:1fr 320px; gap:16px; padding:16px 24px; max-width:1280px; margin:0 auto; }
          .arena-side  { display:flex; flex-direction:column; gap:14px; }
          .hide-mobile { display:flex !important; }
        }
      `}</style>

      {/* Alert popup */}
      {alertMsg && (
        <div style={{ position:'fixed', top:70, left:'50%', transform:'translateX(-50%)', zIndex:9999, background:'linear-gradient(135deg,#00ff88,#00cc66)', color:'#04080f', fontWeight:800, fontSize:13, padding:'11px 20px', borderRadius:10, boxShadow:'0 4px 32px rgba(0,255,136,0.5)', animation:'yn-popin 0.3s ease', whiteSpace:'nowrap', maxWidth:'90vw', textAlign:'center' }}>
          {alertMsg}
        </div>
      )}

      {/* TICKER */}
      <Ticker />

      {/* NAV */}
      <nav style={{ background:'rgba(4,8,15,0.97)', borderBottom:'1px solid #0d1826', padding:'0 16px', position:'sticky', top:0, zIndex:100, backdropFilter:'blur(16px)' }}>
        <div style={{ maxWidth:1280, margin:'0 auto', display:'flex', alignItems:'center', height:52, gap:12 }}>
          <Link href="/arena" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:7, background:'linear-gradient(135deg,#ffd700,#ff6b35)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Trophy size={14} color="#04080f" fill="#04080f" />
            </div>
            <span style={{ fontSize:15, fontWeight:900, color:'#fff', letterSpacing:-0.3 }}>YN Arena</span>
          </Link>

          <div style={{ display:'flex', alignItems:'center', gap:5, background:'#c0392b', borderRadius:4, padding:'3px 8px', flexShrink:0 }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#fff', display:'inline-block', animation:'yn-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontSize:9, fontWeight:900, color:'#fff', letterSpacing:'0.18em' }}>LIVE</span>
          </div>

          <div style={{ fontSize:11, color:'#7f93b5', display:'flex', alignItems:'center', gap:4 }}>
            <Users size={10} />
            <span style={{ fontFamily:'monospace', fontWeight:700, color:'#cdd6f4' }}>{viewers.toLocaleString()}</span>
            <span className="hide-mobile">watching</span>
          </div>

          <div style={{ flex:1 }} />

          <Link href="/"        style={{ fontSize:11, color:'#2a4060', textDecoration:'none', padding:'5px 10px', border:'1px solid #0d1826', borderRadius:6 }}>← Home</Link>
          <Link href="/courses" style={{ fontSize:11, color:'#4a5e7a', textDecoration:'none', padding:'5px 10px', border:'1px solid #0d1826', borderRadius:6 }} className="hide-mobile">Courses</Link>
          <Link href="/app"     style={{ fontSize:11, color:'#4a5e7a', textDecoration:'none', padding:'5px 10px', border:'1px solid #0d1826', borderRadius:6 }} className="hide-mobile">Terminal</Link>
          <button onClick={enterTournament} disabled={entering}
            style={{ fontSize:12, fontWeight:900, background:entering?'#0a1620':'linear-gradient(135deg,#ffd700,#ff6b35)', color:entering?'#4a5e7a':'#04080f', border:'none', borderRadius:7, padding:'8px 16px', cursor:entering?'not-allowed':'pointer', whiteSpace:'nowrap', flexShrink:0 }}>
            {entering ? '...' : `⚡ Enter $${selectedTournament.fee}`}
          </button>
        </div>
      </nav>

      {/* HERO BANNER */}
      <div style={{ background:'linear-gradient(135deg,#080f1c 0%,#0a1520 60%,#08111c 100%)', borderBottom:'1px solid #0d1826', padding:'20px 16px' }}>
        <div style={{ maxWidth:1280, margin:'0 auto' }}>

          {/* What is this — 2-second pitch */}
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16, flexWrap:'wrap' }}>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'rgba(0,255,136,0.08)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:100, padding:'5px 14px', fontSize:11, color:'#00ff88', fontWeight:700 }}>
              <span style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', display:'inline-block', animation:'yn-pulse 1.2s ease-in-out infinite' }} />
              Daily tournament running now
            </div>
            <div style={{ fontSize:11, color:'#4a5e7a' }}>$1 to enter · top 20% wins real money · spectate for free</div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:10, marginBottom:16 }}>
            {/* Prize pool */}
            <div style={{ background:'#0a0f1a', border:'1px solid #ffd70025', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:'#4a5e7a', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Today&apos;s Prize Pool</div>
              <div style={{ fontSize:36, fontWeight:900, color:'#ffd700', fontFamily:'monospace', letterSpacing:-1 }}>${prizePool}</div>
              <div style={{ fontSize:11, color:'#4a5e7a', marginTop:2 }}>1st place takes <span style={{ color:'#ffd700', fontWeight:700 }}>${topPrize}</span></div>
            </div>
            {/* Countdown */}
            <div style={{ background:'#0a0f1a', border:'1px solid #ff6b3525', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:'#4a5e7a', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Tournament Ends</div>
              <div style={{ fontSize:32, fontWeight:900, color:'#ff6b35', fontFamily:'monospace', letterSpacing:-1 }}><Countdown hours={4} /></div>
              <div style={{ fontSize:11, color:'#4a5e7a', marginTop:2 }}>Market closes 4:00 PM ET</div>
            </div>
            {/* Traders */}
            <div style={{ background:'#0a0f1a', border:'1px solid #1e90ff25', borderRadius:12, padding:'16px 18px' }}>
              <div style={{ fontSize:11, color:'#4a5e7a', marginBottom:4, textTransform:'uppercase', letterSpacing:'0.1em' }}>Competing Now</div>
              <div style={{ fontSize:36, fontWeight:900, color:'#1e90ff', fontFamily:'monospace', letterSpacing:-1 }}>390</div>
              <div style={{ fontSize:11, color:'#4a5e7a', marginTop:2 }}><span style={{ color:'#00ff88', fontWeight:700 }}>78 traders</span> will get paid</div>
            </div>
            {/* Entry */}
            <div style={{ background:'linear-gradient(135deg,#091a0d,#081520)', border:'1px solid #00ff8830', borderRadius:12, padding:'16px 18px', display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff', marginBottom:6 }}>You&apos;re watching. Want in?</div>
              <button onClick={enterTournament} disabled={entering}
                style={{ width:'100%', padding:'13px', background:entering?'#0a1620':'linear-gradient(135deg,#00ff88,#00cc66)', color:entering?'#4a5e7a':'#04080f', border:'none', borderRadius:9, fontSize:14, fontWeight:900, cursor:entering?'not-allowed':'pointer', boxShadow:'0 0 24px rgba(0,255,136,0.3)', animation:'yn-glow 2.5s ease-in-out infinite' }}>
                {entering ? 'Loading…' : '⚡ Enter for $1'}
              </button>
              <div style={{ fontSize:10, color:'#2a4060', marginTop:6, textAlign:'center' }}>Paid via Stripe · Simulated trading · Real prizes</div>
            </div>
          </div>

          {/* Tournament picker */}
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
            {TOURNAMENTS.map(t => (
              <button key={t.id} onClick={() => setSelectedTournament(t)}
                style={{ flexShrink:0, padding:'7px 14px', borderRadius:8, fontSize:11, fontWeight:700, border:'none', cursor:'pointer', transition:'all 0.15s', whiteSpace:'nowrap',
                  background: selectedTournament.id === t.id ? `${t.color}18` : '#0a0f1a',
                  color: selectedTournament.id === t.id ? t.color : '#4a5e7a',
                  outline: selectedTournament.id === t.id ? `1px solid ${t.color}50` : '1px solid #0d1826',
                }}>
                ${t.fee} · {t.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="arena-grid">

        {/* LEFT: Leaderboard */}
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

          {/* Podium */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, padding:'16px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <Crown size={14} color="#ffd700" />
              <span style={{ fontSize:12, fontWeight:800, color:'#ffd700', textTransform:'uppercase', letterSpacing:'0.12em' }}>Podium</span>
              <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#00ff88', display:'inline-block', animation:'yn-pulse 1.5s ease-in-out infinite' }} />
                <span style={{ fontSize:9, color:'#00ff88', fontFamily:'monospace' }}>UPDATES EVERY 3s</span>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
              {board.slice(0,3).map((t, i) => {
                const prizes = [topPrize, Math.floor(prizePool*0.25), Math.floor(prizePool*0.15)]
                const medals = ['🥇','🥈','🥉']
                const c = COLORS[i]
                return (
                  <div key={t.id} style={{ background:i===0?'rgba(255,215,0,0.07)':'#0d1520', border:`1px solid ${i===0?'#ffd70035':'#0d1826'}`, borderRadius:10, padding:'14px 10px', textAlign:'center', transition:'all 0.6s ease' }}>
                    <div style={{ fontSize:22, marginBottom:8 }}>{medals[i]}</div>
                    <div style={{ width:36, height:36, borderRadius:9, background:`${c}20`, border:`2px solid ${c}55`, display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 8px', fontSize:11, fontWeight:900, color:c }}>{t.name.slice(0,2).toUpperCase()}</div>
                    <div style={{ fontSize:12, fontWeight:800, color:'#fff', marginBottom:4 }}>{t.name}</div>
                    <div style={{ fontSize:20, fontWeight:900, color:t.pct>=0?'#00ff88':'#ff4757', fontFamily:'monospace', transition:'color 0.4s' }}>{t.pct>=0?'+':''}{t.pct.toFixed(1)}%</div>
                    <div style={{ fontSize:11, color:'#ffd700', fontWeight:800, fontFamily:'monospace', marginTop:3 }}>${prizes[i]}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Full board */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, overflow:'hidden' }}>
            {/* Header row */}
            <div style={{ display:'grid', gridTemplateColumns:'40px 36px 1fr 80px 60px 70px', padding:'9px 16px', background:'#0d1826', borderBottom:'1px solid #080f18' }}>
              {['','#','TRADER','P&L %','$','STATUS'].map(h => (
                <div key={h} style={{ fontSize:9, color:'#1e3a5f', fontWeight:700, letterSpacing:'0.1em', textAlign:h==='P&L %'||h==='$'||h==='STATUS'?'right':'left' }}>{h}</div>
              ))}
            </div>
            {board.map((t, i) => {
              const c = COLORS[i]
              const paid = i < inMoney
              return (
                <div key={t.id} style={{ display:'grid', gridTemplateColumns:'40px 36px 1fr 80px 60px 70px', padding:'9px 16px', borderBottom:'1px solid #08111c', background:paid?`${c}07`:'transparent', transition:'background 0.8s ease' }}>
                  <div style={{ fontSize:14 }}>{i<3?['🥇','🥈','🥉'][i]:''}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:'#1e3a5f', fontFamily:'monospace', alignSelf:'center' }}>#{t.rank}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <div style={{ width:28, height:28, borderRadius:7, background:`${c}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:c, flexShrink:0 }}>{t.name.slice(0,2).toUpperCase()}</div>
                    <span style={{ fontSize:13, fontWeight:700, color:'#cdd6f4' }}>{t.name}</span>
                  </div>
                  <div style={{ textAlign:'right', fontSize:14, fontWeight:900, color:t.pct>=0?'#00ff88':'#ff4757', fontFamily:'monospace', alignSelf:'center', transition:'color 0.4s' }}>{t.pct>=0?'+':''}{t.pct.toFixed(1)}%</div>
                  <div style={{ textAlign:'right', fontSize:11, color:t.pct>=0?'#00cc66':'#cc2233', fontFamily:'monospace', alignSelf:'center' }}>{t.pct>=0?'+':'−'}${Math.abs(t.pct*100).toFixed(0)}</div>
                  <div style={{ textAlign:'right', alignSelf:'center' }}>
                    {paid
                      ? <span style={{ fontSize:9, color:c, background:`${c}18`, padding:'2px 7px', borderRadius:3, fontWeight:800 }}>PAID</span>
                      : <span style={{ fontSize:9, color:'#1e3a5f', padding:'2px 7px', borderRadius:3 }}>OUT</span>}
                  </div>
                </div>
              )
            })}
            <div style={{ padding:'10px 16px', fontSize:10, color:'#4a5e7a', textAlign:'center', borderTop:'1px solid #08111c' }}>
              Top {inMoney} of {board.length} traders are in the money right now
            </div>
          </div>

          {/* Past winners */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, overflow:'hidden' }}>
            <div style={{ padding:'12px 16px', borderBottom:'1px solid #0d1826', fontSize:11, fontWeight:800, color:'#fff', display:'flex', alignItems:'center', gap:8 }}>
              <span>🏆</span> Recent Payouts
              <span style={{ marginLeft:'auto', fontSize:10, color:'#4a5e7a', fontWeight:400 }}>$2,847 paid this week</span>
            </div>
            {PAST.map((w, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 16px', borderBottom:'1px solid #08111c' }}>
                <div style={{ width:34, height:34, borderRadius:9, background:`${w.color}18`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:w.color, flexShrink:0 }}>
                  {w.name.slice(0,2).toUpperCase()}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{w.name}</div>
                  <div style={{ fontSize:10, color:'#4a5e7a' }}>{w.tourney} · {w.date}</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:15, fontWeight:900, color:'#ffd700', fontFamily:'monospace' }}>{w.prize}</div>
                  <div style={{ fontSize:10, color:'#00ff88', fontFamily:'monospace' }}>{w.pct}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* RIGHT: Side panel */}
        <div className="arena-side">

          {/* How it works — answers "what is this" */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, padding:'16px' }}>
            <div style={{ fontSize:14, fontWeight:900, color:'#fff', marginBottom:14 }}>How it works</div>
            {[
              { n:'1', icon:'💵', title:'Pay $1 to enter', desc:'Charged via Stripe. You get a simulated $10,000 trading account instantly.' },
              { n:'2', icon:'📊', title:'Trade until 4PM ET', desc:'Go long or short on stocks, forex, crypto. Your P&L is tracked live.' },
              { n:'3', icon:'🏆', title:'Top 20% wins real cash', desc:'If you finish in the top 20%, Stripe pays you out within 24 hours.' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ display:'flex', gap:12, marginBottom:14 }}>
                <div style={{ fontSize:20, flexShrink:0, marginTop:1 }}>{icon}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:800, color:'#cdd6f4', marginBottom:3 }}>{title}</div>
                  <div style={{ fontSize:11, color:'#4a5e7a', lineHeight:1.6 }}>{desc}</div>
                </div>
              </div>
            ))}
            <button onClick={enterTournament} disabled={entering}
              style={{ width:'100%', padding:'13px', background:entering?'#0a1620':'linear-gradient(135deg,#00ff88,#00cc66)', color:entering?'#4a5e7a':'#04080f', border:'none', borderRadius:10, fontSize:14, fontWeight:900, cursor:entering?'not-allowed':'pointer', animation:'yn-glow 2.5s ease-in-out infinite', marginTop:4 }}>
              {entering ? 'Loading…' : `⚡ Enter for $${selectedTournament.fee}`}
            </button>
          </div>

          {/* Live chat — collapsible */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, overflow:'hidden' }}>
            <button onClick={() => setChatOpen(o => !o)}
              style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#bf5fff', animation:'yn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize:12, fontWeight:800, color:'#fff' }}>Live Chat</span>
              <span style={{ fontSize:10, color:'#4a5e7a' }}>{viewers.toLocaleString()} watching</span>
              <div style={{ marginLeft:'auto', color:'#4a5e7a' }}>{chatOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
            </button>

            {chatOpen && (
              <>
                <div style={{ height:240, overflowY:'auto', padding:'4px 14px', borderTop:'1px solid #0d1826' }}>
                  {chatMsgs.map((m, i) => (
                    <div key={i} style={{ fontSize:12, lineHeight:1.6, marginBottom:2, animation:i===chatMsgs.length-1?'yn-fadein 0.25s ease':'none' }}>
                      <span style={{ fontWeight:800, color:m.color, marginRight:5 }}>{m.user}</span>
                      <span style={{ color:'#cdd6f4' }}>{m.text}</span>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <div style={{ padding:'8px 10px', borderTop:'1px solid #0d1826', display:'flex', gap:6 }}>
                  <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && chatInput.trim() && (setChatMsgs(m=>[...m.slice(-50),{user:'You',text:chatInput,color:'#00ff88'}]), setChatInput(''))}
                    placeholder="Say something…"
                    style={{ flex:1, background:'#0d1826', border:'1px solid #1a2d4a', borderRadius:7, padding:'7px 11px', color:'#cdd6f4', fontSize:12, outline:'none' }} />
                  <button onClick={() => { if(chatInput.trim()){setChatMsgs(m=>[...m.slice(-50),{user:'You',text:chatInput,color:'#00ff88'}]);setChatInput('')}}}
                    style={{ background:'#bf5fff', border:'none', borderRadius:7, padding:'7px 12px', cursor:'pointer', fontSize:11, fontWeight:800, color:'#fff' }}>
                    Send
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Upcoming */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, padding:'14px 16px' }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#ffd700', marginBottom:12 }}>More Tournaments</div>
            {TOURNAMENTS.slice(1).map(t => (
              <div key={t.id} onClick={() => setSelectedTournament(t)}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:'1px solid #080f18', cursor:'pointer' }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:t.color, flexShrink:0 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#cdd6f4' }}>{t.name}</div>
                  <div style={{ fontSize:10, color:'#4a5e7a' }}>{t.allowed} · ${t.account.toLocaleString()} account</div>
                </div>
                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:13, fontWeight:900, color:t.color, fontFamily:'monospace' }}>${t.fee}</div>
                  <div style={{ fontSize:9, color:'#4a5e7a' }}>{t.filled} in</div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust / FAQ collapsible */}
          <div style={{ background:'#0a0f1a', border:'1px solid #0d1826', borderRadius:14, overflow:'hidden' }}>
            <button onClick={() => setRulesOpen(o => !o)}
              style={{ width:'100%', padding:'12px 16px', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}>
              <Shield size={13} color="#4a5e7a" />
              <span style={{ fontSize:12, fontWeight:800, color:'#7f93b5' }}>Is this legit? FAQ</span>
              <div style={{ marginLeft:'auto', color:'#4a5e7a' }}>{rulesOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
            </button>
            {rulesOpen && (
              <div style={{ padding:'4px 16px 16px', borderTop:'1px solid #0d1826' }}>
                {[
                  ['Is trading simulated?', 'Yes. You never trade real money — you use a simulated account. Only the entry fee ($1–$25) and prize payouts are real.'],
                  ['How are prizes paid?', 'Stripe pays out to your bank or debit card within 24 hours of tournament end.'],
                  ['What if I lose?', 'You lose your entry fee only. The maximum loss on a $1 tournament is $1.'],
                  ['Can I enter multiple?', 'Yes. Enter as many tournaments as you want. Each entry is separate.'],
                  ['Are the traders real?', 'The leaderboard shows simulated P&L based on market conditions. Real competitions will show verified user data once Supabase is connected.'],
                ].map(([q, a]) => (
                  <div key={q} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:12, fontWeight:700, color:'#cdd6f4', marginBottom:3 }}>{q}</div>
                    <div style={{ fontSize:11, color:'#4a5e7a', lineHeight:1.6 }}>{a}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          <div style={{ display:'flex', gap:12, fontSize:12, color:'#2a4060', justifyContent:'center', padding:'4px 0' }}>
            <Link href="/"        style={{ color:'#2a4060', textDecoration:'none' }}>YN Finance</Link>
            <Link href="/courses" style={{ color:'#2a4060', textDecoration:'none' }}>Courses</Link>
            <Link href="/app"     style={{ color:'#2a4060', textDecoration:'none' }}>Terminal</Link>
            <Link href="/privacy" style={{ color:'#2a4060', textDecoration:'none' }}>Privacy</Link>
          </div>
          <div style={{ fontSize:9, color:'#1a2a3a', textAlign:'center', padding:'0 0 8px' }}>
            All tournaments use simulated accounts only · Real prize payouts via Stripe · Not financial advice
          </div>
        </div>
      </div>
    </div>
  )
}
