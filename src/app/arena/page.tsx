'use client'

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Eye, Zap, ArrowRight, Radio, BarChart2 } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const G = '#22c55e'   // green
const GO = '#16a34a'  // green-darker
const GD = '#eab308'  // gold
const PU = '#a855f7'  // purple
const BL = '#3b82f6'  // blue
const RE = '#ef4444'  // red
const OR = '#f97316'  // orange
const TE = '#fafafa'  // text
const MT = '#a1a1aa'  // muted
const DM = '#71717a'  // dim
const SU = '#18181b'  // surface
const RA = '#27272a'  // raised
const BO = '#27272a'  // border
const BG = '#09090b'  // background

// ─── DATA ─────────────────────────────────────────────────────────────────────
const TRADERS = [
  { name:'Marcus T.',  init:'MT', base: 18.4, c: G  },
  { name:'Sarah K.',   init:'SK', base: 14.1, c: GD },
  { name:'Devon P.',   init:'DP', base: 11.7, c: BL },
  { name:'Jordan M.',  init:'JM', base:  9.3, c: PU },
  { name:'Aisha B.',   init:'AB', base:  7.2, c: G  },
  { name:'Chris L.',   init:'CL', base:  4.8, c: OR },
  { name:'Nina R.',    init:'NR', base:  2.9, c: BL },
  { name:'Tyler W.',   init:'TW', base: -1.4, c: DM },
  { name:'Priya S.',   init:'PS', base: -4.1, c: RE },
  { name:'Alex M.',    init:'AM', base: -6.8, c: RE },
  { name:'YN-ALPHA',  init:'α',  base:  5.3, c: PU, ai:true },
  { name:'YN-BETA',   init:'β',  base: -2.7, c: DM, ai:true },
]

const CONTESTS = [
  { id:'daily-blitz',   name:'Daily Blitz',      fee:10,  max:500,  filled:390, allowed:'All Markets',  c: G,   tier:'STANDARD', tagline:'Best for new traders' },
  { id:'crypto-night',  name:'Crypto Night',      fee:25,  max:250,  filled:188, allowed:'Crypto Only',  c: PU,  tier:'PREMIUM',  tagline:'High volatility, big swings' },
  { id:'pro-showdown',  name:'Pro Showdown',      fee:100, max:100,  filled:44,  allowed:'All Markets',  c: GD,  tier:'ELITE',    tagline:'Veterans only. Serious money.' },
  { id:'futures-arena', name:'Futures Arena',     fee:50,  max:150,  filled:67,  allowed:'Futures Only', c: BL,  tier:'PREMIUM',  tagline:'ES, NQ, GC, CL — big leverage' },
  { id:'h2h-duel',      name:'H2H Duel',          fee:10,  max:2,    filled:1,   allowed:'All Markets',  c: OR,  tier:'1v1',      tagline:'You vs. one trader. Winner takes $18.' },
  { id:'weekly-mega',   name:'Weekly Mega',       fee:25,  max:1000, filled:712, allowed:'All Markets',  c: GD,  tier:'MEGA',     tagline:'$22,000 pool. Top 200 paid.' },
]

// Fixed prize structure: 12% house rake, 88% pool
// 1st: 30%, 2nd: 18%, 3rd: 12%, 4th: 8%, 5th: 6%, 6-10th: 3% each, rest: split 1%
const PRIZE_WEIGHTS = [0.30, 0.18, 0.12, 0.08, 0.06, 0.03, 0.03, 0.03, 0.03, 0.03]
function calcPool(entries: number, fee: number) { return Math.floor(entries * fee * 0.88) }
function calcPrize(rank: number, pool: number): number {
  if (rank <= 10) return Math.floor(pool * (PRIZE_WEIGHTS[rank - 1] ?? 0.01))
  const inMoney = Math.ceil(10 / 0.2) // roughly top 20%
  if (rank <= inMoney) return Math.floor(pool * 0.01 / (inMoney - 10))
  return 0
}

const STREAMS = [
  { name:'Marcus T.',  init:'MT', asset:'AAPL',    tf:'5',   pct: 18.4, viewers:2847, c: G  },
  { name:'Sarah K.',   init:'SK', asset:'BTC/USD', tf:'60',  pct: 14.1, viewers:1654, c: GD },
  { name:'Devon P.',   init:'DP', asset:'EUR/USD', tf:'15',  pct:  7.8, viewers: 987, c: BL },
  { name:'Aisha B.',   init:'AB', asset:'NVDA',    tf:'D',   pct: 22.3, viewers:1432, c: PU },
  { name:'Jordan M.',  init:'JM', asset:'SPY',     tf:'1',   pct: -3.2, viewers: 743, c: RE },
  { name:'Nina R.',    init:'NR', asset:'ETH/USD', tf:'240', pct:  9.1, viewers: 521, c: OR },
]

const PAYOUTS = [
  { name:'Marcus T.', pct:'+241%', entry:'$10', won:'$1,100', contest:'Daily Blitz',   date:'Today'      },
  { name:'Priya S.',  pct:'+382%', entry:'$25', won:'$2,904', contest:'Crypto Night',  date:'Yesterday'  },
  { name:'Devon P.',  pct:'+198%', entry:'$100',won:'$2,640', contest:'Pro Showdown',  date:'2 days ago' },
  { name:'Sarah K.',  pct:'+156%', entry:'$10', won:'$660',   contest:'Daily Blitz',   date:'2 days ago' },
  { name:'Ryan C.',   pct:'+312%', entry:'$25', won:'$1,452', contest:'Futures Arena', date:'3 days ago' },
]

function buildBoard(tick: number) {
  return TRADERS.map((t, i) => ({
    ...t,
    pct: +(t.base + Math.sin(tick * 0.22 + i * 1.9) * 0.7 + Math.cos(tick * 0.38 + i * 2.6) * 0.3).toFixed(2),
  })).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function Dot({ c = G }: { c?: string }) {
  return <span style={{ display:'inline-block', width:6, height:6, borderRadius:'50%', background:c, flexShrink:0, animation:'yn-dot 1.5s ease-in-out infinite' }} />
}

function Countdown({ h: hours }: { h: number }) {
  const end = useRef(Date.now() + hours * 3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.current - Date.now()), 1000); return () => clearInterval(t) }, [])
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <span style={{ fontFamily:'monospace', fontWeight:700, color: ms < 3600000 ? RE : TE, letterSpacing:1 }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

function ArenaInner() {
  const sp = useSearchParams()
  const [board, setBoard] = useState(() => buildBoard(0))
  const [tick, setTick] = useState(0)
  const [viewers, setViewers] = useState(3847)
  const [tab, setTab] = useState<'competition'|'streams'|'leaderboard'>('competition')
  const [contest, setContest] = useState(CONTESTS[0])
  const [stream, setStream] = useState<typeof STREAMS[0] | null>(null)
  const [entering, setEntering] = useState<string|null>(null)
  const [modal, setModal] = useState<string|null>(null)

  // Board ticks every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => { const next = n+1; setBoard(buildBoard(next)); return next })
      setViewers(v => Math.max(3000, v + Math.round((Math.random()-.48)*8)))
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Stripe redirect success
  useEffect(() => {
    if (sp?.get('entered') && sp?.get('session_id')) {
      setModal(sp.get('entered')!)
      const t = window.setTimeout(() => setModal(null), 8000)
      return () => window.clearTimeout(t)
    }
  }, [sp])

  const enter = useCallback(async (c: typeof CONTESTS[0]) => {
    setEntering(c.id)
    try {
      const r = await fetch('/api/stripe/tournament/checkout', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ tournamentId:c.id, tournamentTitle:c.name, entryFeeCents:c.fee*100, tier:c.tier.toLowerCase() }),
      })
      const d = await r.json()
      if (d.url) { localStorage.setItem(`yn_tournament_${c.id}`,'true'); window.location.href = d.url }
      else if (d.demo) { localStorage.setItem(`yn_tournament_${c.id}`,'true'); window.location.href = `/arena/tournament/${c.id}?entered=${c.id}` }
    } catch { window.alert('Error — try again') }
    finally { setEntering(null) }
  }, [])

  const inMoney = Math.ceil(board.length * 0.2)

  return (
    <div style={{ background:BG, color:TE, fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes yn-dot     { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.65)} }
        @keyframes yn-ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-in      { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-pop     { from{opacity:0;transform:scale(0.92) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes yn-conf    { 0%{transform:translateY(-8px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes yn-glow    { 0%,100%{box-shadow:0 0 0 0 ${G}30} 50%{box-shadow:0 0 20px 0 ${G}40} }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:${RA}; border-radius:3px }

        .btn { display:inline-flex; align-items:center; gap:7px; font-weight:700; border-radius:9px; border:none; cursor:pointer; text-decoration:none; white-space:nowrap; transition:opacity 0.13s, transform 0.13s; }
        .btn:hover { opacity:0.85; transform:translateY(-1px); }
        .btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .btn-green  { background:${G};  color:${BG}; padding:12px 22px; font-size:14px; animation:yn-glow 2.5s ease-in-out infinite; }
        .btn-ghost  { background:transparent; color:${MT}; border:1px solid ${BO}; padding:11px 18px; font-size:13px; }
        .btn-ghost:hover { color:${TE}; border-color:#52525b; }
        .card { background:${SU}; border:1px solid ${BO}; border-radius:11px; transition:border-color 0.13s; }
        .tab-btn { background:none; border:none; border-bottom:2px solid transparent; height:100%; padding:0 18px; font-size:13px; font-weight:600; color:${DM}; cursor:pointer; transition:color 0.13s, border-color 0.13s; }
        .tab-btn.on { color:${TE}; border-bottom-color:${G}; }
        .tab-btn:hover:not(.on) { color:${TE}; }
        .w { max-width:1200px; margin:0 auto; padding:0 24px; }

        @media(max-width:860px) {
          .sm-hide { display:none !important; }
          .sm-col  { flex-direction:column !important; }
          .sm-full { width:100% !important; max-width:100% !important; }
          .sm-grid1 { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* SUCCESS MODAL */}
      {modal && (
        <div style={{ position:'fixed',inset:0,background:'rgba(9,9,11,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20 }}>
          {Array.from({length:14}).map((_,i) => (
            <div key={i} style={{ position:'fixed',top:0,left:`${7+i*6}%`,width:7,height:7,borderRadius:i%3===0?'50%':2,background:[G,GD,PU,BL,RE][i%5],animation:`yn-conf ${1.4+i*0.13}s ease-in ${i*0.07}s forwards`,pointerEvents:'none' }} />
          ))}
          <div className="card" style={{ padding:'40px 44px',maxWidth:400,width:'100%',textAlign:'center',animation:'yn-pop 0.3s cubic-bezier(0.34,1.56,0.64,1)' }}>
            <div style={{ fontSize:44,marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:22,fontWeight:900,color:TE,marginBottom:8,letterSpacing:-0.5 }}>You&apos;re in!</div>
            <div style={{ fontSize:14,color:MT,marginBottom:28,lineHeight:1.7 }}>
              <strong style={{color:TE}}>{modal.replace(/-/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</strong> — your $10,000 account is ready. Trade until 4:00 PM ET.
            </div>
            <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
              <button onClick={() => setModal(null)} className="btn btn-ghost" style={{fontSize:13,padding:'9px 16px'}}>Watch live</button>
              <Link href={`/arena/tournament/${modal}?entered=${modal}`}
                onClick={() => { localStorage.setItem(`yn_tournament_${modal}`,'true'); setModal(null) }}
                className="btn btn-green" style={{fontSize:13,padding:'9px 18px',textDecoration:'none'}}>
                Open trading room →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* TICKER */}
      <div style={{ height:34,background:SU,borderBottom:`1px solid #18181b`,overflow:'hidden',display:'flex',alignItems:'center' }}>
        <div style={{ background:G,height:'100%',display:'flex',alignItems:'center',padding:'0 14px',flexShrink:0 }}>
          <span style={{ fontSize:9,fontWeight:900,letterSpacing:'0.2em',color:BG }}>LIVE</span>
        </div>
        <div style={{ flex:1,overflow:'hidden' }}>
          <div style={{ display:'inline-flex',animation:'yn-ticker 42s linear infinite',whiteSpace:'nowrap' }}>
            {[
              'MARCUS T. +18.4% · DAILY BLITZ LEADER',
              '$47,320 PAID TO TRADERS THIS MONTH · JOIN NOW',
              '390 TRADERS COMPETING IN TODAY\'S BLITZ',
              'TOP 10 FINISH = YOUR ENTRY × YOUR P&L%',
              'PRIYA S. +382% · CRYPTO NIGHT · $120 PAYOUT',
              'STREAM YOUR TRADES · EARN 12% PER VIEWER ENTRY',
              'SARAH K. CLIMBING · +14.1% IN THE MONEY',
              'NEW: FUTURES ARENA · ES NQ GC CL',
              'MARCUS T. +18.4% · DAILY BLITZ LEADER',
              '$47,320 PAID TO TRADERS THIS MONTH · JOIN NOW',
              '390 TRADERS COMPETING IN TODAY\'S BLITZ',
              'TOP 10 FINISH = YOUR ENTRY × YOUR P&L%',
              'PRIYA S. +382% · CRYPTO NIGHT · $120 PAYOUT',
              'STREAM YOUR TRADES · EARN 12% PER VIEWER ENTRY',
              'SARAH K. CLIMBING · +14.1% IN THE MONEY',
              'NEW: FUTURES ARENA · ES NQ GC CL',
            ].map((item, i) => (
              <span key={i} style={{ padding:'0 36px',fontSize:11,fontWeight:600,color:DM,letterSpacing:'0.04em' }}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      {/* NAV */}
      <nav style={{ borderBottom:`1px solid #18181b`,position:'sticky',top:0,zIndex:100,backdropFilter:'blur(20px)',background:'rgba(9,9,11,0.94)' }}>
        <div className="w" style={{ height:56,display:'flex',alignItems:'center',gap:12 }}>
          <Link href="/arena" style={{ textDecoration:'none',display:'flex',alignItems:'center',gap:8,flexShrink:0 }}>
            <div style={{ width:28,height:28,borderRadius:7,background:G,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Trophy size={13} color={BG} fill={BG} />
            </div>
            <div>
              <div style={{ fontSize:14,fontWeight:900,color:TE,letterSpacing:-0.3,lineHeight:1 }}>YN Arena</div>
            </div>
          </Link>

          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'3px 9px',border:`1px solid ${PU}35`,borderRadius:6 }} className="sm-hide">
            <Dot c={PU} />
            <span style={{ fontSize:9,fontWeight:800,color:PU,letterSpacing:'0.18em' }}>LIVE</span>
          </div>

          <div style={{ fontSize:12,color:DM,display:'flex',alignItems:'center',gap:4 }} className="sm-hide">
            <Eye size={10} />
            <span style={{ fontFamily:'monospace',color:MT }}>{viewers.toLocaleString()}</span>
          </div>

          {/* Tabs */}
          <div style={{ flex:1,display:'flex',height:'100%',marginLeft:12 }} className="sm-hide">
            {(['competition','streams','leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`tab-btn ${tab===t?'on':''}`}>
                {t.charAt(0).toUpperCase()+t.slice(1)}
              </button>
            ))}
          </div>

          <div style={{ display:'flex',gap:8,alignItems:'center',marginLeft:'auto' }}>
            <Link href="/arena/schedule"  style={{ fontSize:12,color:DM,textDecoration:'none',padding:'5px 10px',border:`1px solid ${BO}`,borderRadius:6 }} className="sm-hide">Schedule</Link>
            <Link href="/arena/creator"   style={{ fontSize:12,color:PU,textDecoration:'none',padding:'5px 10px',border:`1px solid ${PU}35`,borderRadius:6 }} className="sm-hide">Stream & Earn</Link>
            <Link href="/"                style={{ fontSize:12,color:DM,textDecoration:'none',padding:'5px 10px',border:`1px solid ${BO}`,borderRadius:6 }} className="sm-hide">← Home</Link>
            <button onClick={() => enter(contest)} disabled={!!entering} className="btn btn-green" style={{ fontSize:13,padding:'9px 18px' }}>
              {entering ? '…' : `Enter $${contest.fee}`}
            </button>
          </div>
        </div>
      </nav>

      <div className="w" style={{ paddingBottom:64 }}>

        {/* ══════════ COMPETITION ══════════ */}
        {tab === 'competition' && (
          <div>
            {/* Hero: live board + CTA */}
            <div style={{ padding:'60px 0 52px',display:'grid',gridTemplateColumns:'1fr 420px',gap:52,alignItems:'start' }} className="sm-col sm-grid1">

              {/* Left */}
              <div>
                <div style={{ display:'inline-flex',alignItems:'center',gap:7,background:`${G}10`,border:`1px solid ${G}25`,borderRadius:100,padding:'5px 14px',fontSize:12,color:G,fontWeight:600,marginBottom:24,letterSpacing:0.2 }}>
                  <Dot /> {viewers.toLocaleString()} people watching right now
                </div>

                <h1 style={{ fontSize:'clamp(38px,5vw,68px)',fontWeight:900,color:TE,lineHeight:1.05,letterSpacing:-2,marginBottom:18 }}>
                  The trading<br /><span style={{color:G}}>tournament</span><br />where skill pays.
                </h1>

                <p style={{ fontSize:16,color:MT,lineHeight:1.75,maxWidth:440,marginBottom:32 }}>
                  $10 entry. $10,000 simulated account. 6 hours. Finish top 10 and your entry multiplies by your P&L%. The house takes 20%. You keep the rest.
                </p>

                <div style={{ display:'flex',gap:10,flexWrap:'wrap',marginBottom:36 }}>
                  <button onClick={() => enter(contest)} className="btn btn-green" style={{ fontSize:15,padding:'13px 26px' }}>
                    <Zap size={15} /> Enter Today — $10
                  </button>
                  <button onClick={() => setTab('streams')} className="btn btn-ghost" style={{ fontSize:14 }}>
                    <Eye size={14} /> Watch live free
                  </button>
                </div>

                <div style={{ display:'flex',gap:24,paddingTop:24,borderTop:`1px solid ${BO}`,flexWrap:'wrap' }}>
                  {[['$47,320','paid out this month'],['3,847','active traders'],['2,156','tournaments run']].map(([n,l]) => (
                    <div key={l}>
                      <div style={{ fontSize:22,fontWeight:900,color:TE,fontFamily:'monospace',letterSpacing:-0.5 }}>{n}</div>
                      <div style={{ fontSize:10,color:'#52525b',textTransform:'uppercase',letterSpacing:'0.08em',marginTop:2 }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: live board */}
              <div className="card sm-full" style={{ overflow:'hidden',animation:'yn-in 0.4s ease' }}>
                <div style={{ padding:'13px 17px',borderBottom:`1px solid ${BO}`,display:'flex',alignItems:'center',gap:8 }}>
                  <Dot />
                  <span style={{ fontSize:13,fontWeight:700,color:TE }}>Daily Blitz</span>
                  <span style={{ marginLeft:'auto',fontSize:11,color:DM,fontFamily:'monospace' }}>closes <Countdown h={4} /></span>
                </div>
                {board.slice(0,8).map((t,i) => (
                  <div key={t.name} style={{ display:'grid',gridTemplateColumns:'22px 22px 1fr 66px 40px',padding:'9px 17px',borderBottom:`1px solid ${BO}`,background: i<inMoney?`${t.c}09`:'transparent',transition:'background 0.5s',alignItems:'center' }}>
                    <span style={{ fontSize:13 }}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</span>
                    <span style={{ fontSize:10,color:'#52525b',fontFamily:'monospace' }}>#{i+1}</span>
                    <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                      <div style={{ width:26,height:26,borderRadius:7,background:`${t.c}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:t.c,flexShrink:0 }}>
                        {t.ai?'🤖':t.init}
                      </div>
                      <span style={{ fontSize:13,fontWeight:600,color:TE }}>{t.name}</span>
                    </div>
                    <span style={{ textAlign:'right',fontSize:14,fontWeight:800,color:t.pct>=0?G:RE,fontFamily:'monospace',transition:'color 0.4s' }}>
                      {t.pct>=0?'+':''}{t.pct.toFixed(1)}%
                    </span>
                    {i<inMoney ? <span style={{ fontSize:9,color:t.c,background:`${t.c}18`,padding:'2px 5px',borderRadius:3,fontWeight:800,textAlign:'center'}}>PAID</span> : <span />}
                  </div>
                ))}
                <div style={{ padding:'10px 17px',fontSize:11,color:DM,display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                  <span>{board.length} traders · updates live</span>
                  <span style={{ color:G,fontWeight:700,cursor:'pointer' }} onClick={() => { const el = document.getElementById('scoreboard'); el?.scrollIntoView({behavior:'smooth'}) }}>Full board ↓</span>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1,background:`${BO}` }} />

            {/* How it works */}
            <div style={{ padding:'52px 0',display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:1,background:BO,borderRadius:12,overflow:'hidden' }} className="sm-grid1">
              {[
                { n:'01', title:'Pay $10 entry', body:'Charged via Stripe. You get a $10,000 simulated trading account instantly. No waitlist, no approval.' },
                { n:'02', title:'Trade for 6 hours', body:'Long or short on stocks, forex, futures, or crypto. Your P&L% updates live on the public leaderboard.' },
                { n:'03', title:'Top 10 get paid', body:'The prize pool is 80% of all entry fees. Top 10 split it proportionally by P&L%. Payouts within 24h.' },
              ].map(({ n, title, body }) => (
                <div key={n} style={{ background:BG,padding:'32px 28px' }}>
                  <div style={{ fontSize:11,fontWeight:800,color:G,letterSpacing:'0.14em',marginBottom:12 }}>{n}</div>
                  <div style={{ fontSize:17,fontWeight:800,color:TE,marginBottom:8,letterSpacing:-0.3 }}>{title}</div>
                  <div style={{ fontSize:14,color:DM,lineHeight:1.65 }}>{body}</div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div style={{ height:1,background:BO,margin:'52px 0' }} />

            {/* Prize breakdown */}
            <div className="card" style={{ padding:'28px 32px',marginBottom:0 }}>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:32 }} className="sm-grid1">
                {/* Left: structure table */}
                <div>
                  <div style={{ fontSize:13,fontWeight:800,color:TE,marginBottom:16,letterSpacing:-0.2 }}>Prize Structure</div>
                  <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
                    {[
                      { label:'1st place',  pct:'30%', highlight:true  },
                      { label:'2nd place',  pct:'18%', highlight:false },
                      { label:'3rd place',  pct:'12%', highlight:false },
                      { label:'4th place',  pct:'8%',  highlight:false },
                      { label:'5th place',  pct:'6%',  highlight:false },
                      { label:'6th–10th',   pct:'3% each', highlight:false },
                      { label:'11th–top 20%', pct:'split 1%', highlight:false },
                    ].map(row => (
                      <div key={row.label} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',padding:'5px 10px',borderRadius:6,background:row.highlight?`${GD}12`:RA }}>
                        <span style={{ fontSize:12,color:row.highlight?GD:MT,fontWeight:row.highlight?700:400 }}>{row.label}</span>
                        <span style={{ fontSize:13,fontWeight:800,color:row.highlight?GD:TE,fontFamily:'monospace' }}>{row.pct}</span>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Right: example payout */}
                <div>
                  <div style={{ fontSize:13,fontWeight:800,color:TE,marginBottom:4,letterSpacing:-0.2 }}>Example Payout</div>
                  <div style={{ fontSize:11,color:DM,marginBottom:14 }}>500 players × $10 entry = <strong style={{color:GD}}>$4,400 pool</strong></div>
                  <div style={{ display:'flex',flexDirection:'column',gap:4,marginBottom:16 }}>
                    {[
                      { label:'1st', amt:'$1,320' },
                      { label:'2nd', amt:'$792'   },
                      { label:'3rd', amt:'$528'   },
                      { label:'4th', amt:'$352'   },
                      { label:'5th', amt:'$264'   },
                      { label:'6–10', amt:'$132 ea.' },
                    ].map(row => (
                      <div key={row.label} style={{ display:'flex',justifyContent:'space-between',padding:'4px 10px',borderRadius:5,background:RA }}>
                        <span style={{ fontSize:11,color:MT }}>{row.label}</span>
                        <span style={{ fontSize:12,fontWeight:700,color:GD,fontFamily:'monospace' }}>{row.amt}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize:10,color:DM,borderTop:`1px solid ${BO}`,paddingTop:10,lineHeight:1.6 }}>
                    House rake: 12% &nbsp;·&nbsp; Top 20% always paid &nbsp;·&nbsp; Payouts via Stripe within 24hrs
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1,background:BO,margin:'52px 0' }} />

            {/* Contest lobby */}
            <div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:24,flexWrap:'wrap',gap:10 }}>
                <h2 style={{ fontSize:24,fontWeight:900,color:TE,letterSpacing:-0.5 }}>Open tournaments</h2>
                <Link href="/arena/schedule" style={{ fontSize:13,color:DM,textDecoration:'none',display:'flex',alignItems:'center',gap:3 }}>Full schedule <ArrowRight size={12} /></Link>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12 }}>
                {CONTESTS.map(c => {
                  const pool = calcPool(c.filled, c.fee)
                  const firstPrize = calcPrize(1, pool)
                  const fill = Math.round((c.filled/c.max)*100)
                  const sel = contest.id === c.id
                  return (
                    <div key={c.id} onClick={() => setContest(c)} className="card"
                      style={{ padding:'18px 20px',cursor:'pointer',borderColor:sel?c.c:BO,boxShadow:sel?`0 0 0 1px ${c.c}`:undefined,transition:'border-color 0.13s,box-shadow 0.13s' }}>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12 }}>
                        <div>
                          <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:5 }}>
                            <span style={{ fontSize:10,fontWeight:800,color:c.c,background:`${c.c}15`,padding:'2px 7px',borderRadius:3,letterSpacing:'0.06em' }}>{c.tier}</span>
                            <span style={{ fontSize:10,color:DM }}>{c.allowed}</span>
                          </div>
                          <div style={{ fontSize:15,fontWeight:800,color:TE }}>{c.name}</div>
                          <div style={{ fontSize:11,color:DM,marginTop:3 }}>{c.tagline}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:21,fontWeight:900,color:c.c,fontFamily:'monospace' }}>${c.fee}</div>
                          <div style={{ fontSize:9,color:DM,textTransform:'uppercase',letterSpacing:'0.08em' }}>entry</div>
                        </div>
                      </div>
                      <div style={{ height:3,background:RA,borderRadius:2,overflow:'hidden',marginBottom:9 }}>
                        <div style={{ width:`${fill}%`,height:'100%',background:fill>85?OR:c.c,transition:'width 1s' }} />
                      </div>
                      <div style={{ marginBottom:10 }}>
                        <div style={{ display:'flex',alignItems:'baseline',gap:6 }}>
                          <span style={{color:GD, fontWeight:900, fontFamily:'monospace', fontSize:14}}>${pool.toLocaleString()} pool</span>
                          {fill>85&&<span style={{color:OR,fontSize:11}}>· filling fast</span>}
                        </div>
                        <div style={{ display:'flex',alignItems:'center',gap:8,marginTop:4 }}>
                          <span style={{fontSize:10, color:DM}}>1st: <strong style={{color:GD}}>${firstPrize.toLocaleString()}</strong></span>
                          <span style={{fontSize:9,color:G,background:`${G}15`,padding:'1px 6px',borderRadius:3,fontWeight:700}}>Top 20% paid</span>
                        </div>
                      </div>
                      <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                        <span style={{ fontSize:11,color:DM }}>{c.filled}/{c.max} entered</span>
                        <button onClick={e=>{e.stopPropagation();enter(c)}} disabled={!!entering} className="btn"
                          style={{ fontSize:12,fontWeight:700,color:c.c,background:`${c.c}14`,border:`1px solid ${c.c}35`,borderRadius:7,padding:'5px 13px',cursor:'pointer',transition:'background 0.13s' }}>
                          {entering===c.id?'…':`$${c.fee}`}
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1,background:BO,margin:'52px 0' }} />

            {/* Full scoreboard */}
            <div id="scoreboard">
              <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:20 }}>
                <Dot />
                <h2 style={{ fontSize:20,fontWeight:900,color:TE }}>Live Scoreboard</h2>
                <span style={{ fontSize:12,color:DM,marginLeft:'auto' }}>updates every 3s</span>
              </div>
              <div className="card" style={{ overflow:'hidden' }}>
                {/* Col headers */}
                <div style={{ display:'grid',gridTemplateColumns:'36px 26px 1fr 88px 96px 84px 70px',padding:'9px 18px',background:RA,borderBottom:`1px solid ${BO}` }}>
                  {['','RK','TRADER','P&L%','PRIZE','RANK PAYOUT','STATUS'].map((h,i) => (
                    <div key={h} style={{ fontSize:9,fontWeight:700,color:'#52525b',letterSpacing:'0.1em',textAlign:i>2?'right':'left' }}>{h}</div>
                  ))}
                </div>
                {board.map((t,i) => {
                  const paid = i < inMoney
                  const pool = calcPool(CONTESTS[0].filled, CONTESTS[0].fee)
                  const prize = paid ? calcPrize(i + 1, pool) : 0
                  return (
                    <div key={t.name} style={{ display:'grid',gridTemplateColumns:'36px 26px 1fr 88px 96px 84px 70px',padding:'9px 18px',borderBottom:`1px solid ${BO}`,background:paid?`${t.c}07`:'transparent',transition:'background 0.6s',animation:'yn-in 0.2s ease' }}>
                      <div style={{fontSize:14}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</div>
                      <div style={{fontSize:10,color:'#52525b',fontFamily:'monospace',alignSelf:'center'}}>#{t.rank}</div>
                      <div style={{display:'flex',alignItems:'center',gap:9}}>
                        <div style={{width:28,height:28,borderRadius:7,background:`${t.c}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:t.c,flexShrink:0}}>
                          {t.ai?'🤖':t.init}
                        </div>
                        <div>
                          <div style={{fontSize:13,fontWeight:700,color:TE}}>{t.name}</div>
                          {t.ai&&<div style={{fontSize:9,color:DM}}>AI TRADER</div>}
                        </div>
                      </div>
                      <div style={{textAlign:'right',fontSize:15,fontWeight:800,color:t.pct>=0?G:RE,fontFamily:'monospace',alignSelf:'center',transition:'color 0.4s'}}>
                        {t.pct>=0?'+':''}{t.pct.toFixed(2)}%
                      </div>
                      <div style={{textAlign:'right',fontSize:13,fontWeight:700,color:paid?GD:DM,fontFamily:'monospace',alignSelf:'center'}}>
                        {paid?`$${prize.toLocaleString()}`:'—'}
                      </div>
                      <div style={{textAlign:'right',fontSize:12,color:paid?MT:DM,fontFamily:'monospace',alignSelf:'center'}}>
                        {paid?`${PRIZE_WEIGHTS[i] != null ? (PRIZE_WEIGHTS[i]*100).toFixed(0) : '~0'}%`:'—'}
                      </div>
                      <div style={{textAlign:'right',alignSelf:'center'}}>
                        {paid
                          ? <span style={{fontSize:9,color:t.c,background:`${t.c}18`,padding:'2px 7px',borderRadius:3,fontWeight:800}}>CASHING</span>
                          : <span style={{fontSize:9,color:'#52525b',background:RA,padding:'2px 7px',borderRadius:3}}>OUT</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height:1,background:BO,margin:'52px 0' }} />

            {/* Recent payouts */}
            <div>
              <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline',marginBottom:24 }}>
                <h2 style={{ fontSize:22,fontWeight:900,color:TE,letterSpacing:-0.5 }}>Verified payouts</h2>
                <span style={{ fontSize:12,color:DM }}>$47,320 paid this month</span>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))',gap:12 }}>
                {PAYOUTS.map((p,i) => (
                  <div key={i} className="card" style={{ padding:'18px 18px' }}>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:10 }}>
                      <div style={{ width:34,height:34,borderRadius:9,background:`${G}15`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:900,color:G }}>
                        {p.name.slice(0,2).toUpperCase()}
                      </div>
                      <span style={{ fontSize:9,color:DM,background:RA,padding:'3px 8px',borderRadius:4 }}>{p.date}</span>
                    </div>
                    <div style={{ fontSize:14,fontWeight:800,color:TE,marginBottom:3 }}>{p.name}</div>
                    <div style={{ fontSize:11,color:DM,marginBottom:10 }}>{p.contest}</div>
                    <div style={{ display:'flex',justifyContent:'space-between',alignItems:'baseline' }}>
                      <span style={{ fontSize:12,color:G,fontWeight:700 }}>{p.pct}</span>
                      <span style={{ fontSize:17,fontWeight:900,color:GD,fontFamily:'monospace' }}>{p.won}</span>
                    </div>
                    <div style={{ fontSize:10,color:DM,marginTop:3,textAlign:'right' }}>{p.entry} entry</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════ STREAMS ══════════ */}
        {tab === 'streams' && (
          <div style={{ padding:'40px 0' }}>
            <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-end',marginBottom:28,flexWrap:'wrap',gap:12 }}>
              <div>
                <h2 style={{ fontSize:26,fontWeight:900,color:TE,letterSpacing:-0.5 }}>Live Streams</h2>
                <p style={{ fontSize:14,color:DM,marginTop:6 }}>Watch traders compete in real-time</p>
              </div>
              <Link href="/arena/creator" className="btn btn-ghost" style={{ fontSize:13 }}>
                <Radio size={12} /> Stream & earn 12%
              </Link>
            </div>

            {stream && (
              <div className="card" style={{ overflow:'hidden',marginBottom:20,animation:'yn-in 0.2s ease' }}>
                <div style={{ display:'flex',alignItems:'center',gap:10,padding:'12px 17px',borderBottom:`1px solid ${BO}` }}>
                  <Dot c={RE} />
                  <span style={{ fontSize:14,fontWeight:800,color:TE }}>{stream.name}</span>
                  <span style={{ fontSize:12,color:DM }}>{stream.asset}</span>
                  <span style={{ fontSize:15,fontWeight:900,color:stream.pct>=0?G:RE,fontFamily:'monospace',marginLeft:'auto' }}>
                    {stream.pct>=0?'+':''}{stream.pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize:12,color:DM,display:'flex',alignItems:'center',gap:3 }}><Eye size={11} />{stream.viewers.toLocaleString()}</span>
                  <button onClick={() => setStream(null)} className="btn btn-ghost" style={{ fontSize:12,padding:'4px 12px' }}>Close</button>
                </div>
                <div style={{ height:420 }}>
                  <TradingViewChart symbol={stream.asset} interval={stream.tf} hideSideToolbar={true} studies={[]} />
                </div>
              </div>
            )}

            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:13 }}>
              {STREAMS.map(s => (
                <div key={s.name} onClick={() => setStream(s)} className="card"
                  style={{ overflow:'hidden',cursor:'pointer',borderColor:stream?.name===s.name?s.c:BO,boxShadow:stream?.name===s.name?`0 0 0 1px ${s.c}`:undefined,transition:'all 0.13s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform='translateY(-2px)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform=''}>
                  <div style={{ height:160,position:'relative' }}>
                    <TradingViewChart symbol={s.asset} interval={s.tf} hideSideToolbar={true} studies={[]} />
                    <div style={{ position:'absolute',top:8,left:8,display:'flex',alignItems:'center',gap:6,background:'rgba(9,9,11,0.82)',borderRadius:7,padding:'5px 9px',backdropFilter:'blur(6px)' }}>
                      <div style={{ width:22,height:22,borderRadius:5,background:`${s.c}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:s.c }}>{s.init}</div>
                      <span style={{ fontSize:12,fontWeight:700,color:TE }}>{s.name}</span>
                    </div>
                    <div style={{ position:'absolute',top:8,right:8,background:'#ef4444',borderRadius:4,padding:'2px 7px' }}>
                      <span style={{ fontSize:9,fontWeight:900,color:'#fff',letterSpacing:'0.15em' }}>● LIVE</span>
                    </div>
                    <div style={{ position:'absolute',bottom:8,right:8,fontSize:14,fontWeight:900,color:s.pct>=0?G:RE,fontFamily:'monospace',background:'rgba(9,9,11,0.8)',borderRadius:5,padding:'3px 8px' }}>
                      {s.pct>=0?'+':''}{s.pct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center' }}>
                    <span style={{ fontSize:11,color:DM }}>{s.asset}</span>
                    <span style={{ fontSize:12,fontWeight:700,color:G }}>Watch →</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════ LEADERBOARD ══════════ */}
        {tab === 'leaderboard' && (
          <div style={{ padding:'40px 0' }}>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))',gap:12,marginBottom:40 }}>
              {[['$47,320','Paid out',GD],['3,847','Active traders',G],['2,156','Tournaments run',PU],['+912%','Biggest return',BL]].map(([v,l,c]) => (
                <div key={l} className="card" style={{ padding:'20px',borderTop:`3px solid ${c}` }}>
                  <div style={{ fontSize:9,color:DM,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:8 }}>{l}</div>
                  <div style={{ fontSize:28,fontWeight:900,color:c as string,fontFamily:'monospace',letterSpacing:-0.5 }}>{v}</div>
                </div>
              ))}
            </div>

            <h2 style={{ fontSize:22,fontWeight:900,color:TE,marginBottom:20,letterSpacing:-0.5 }}>All-Time Rankings</h2>
            <div className="card" style={{ overflow:'hidden' }}>
              {[
                {name:'Marcus T.',init:'MT',wr:67,earned:4280,streak:5,c:GD},
                {name:'Priya S.',init:'PS',wr:71,earned:3920,streak:3,c:G},
                {name:'Devon P.',init:'DP',wr:58,earned:2847,streak:2,c:BL},
                {name:'Sarah K.',init:'SK',wr:62,earned:2410,streak:4,c:PU},
                {name:'Ryan C.',init:'RC',wr:54,earned:1980,streak:1,c:GD},
                {name:'Jordan M.',init:'JM',wr:49,earned:1642,streak:0,c:DM},
                {name:'Aisha B.',init:'AB',wr:55,earned:1389,streak:2,c:G},
                {name:'Chris L.',init:'CL',wr:44,earned:1102,streak:0,c:DM},
              ].map((t,i) => (
                <div key={t.name} style={{ display:'grid',gridTemplateColumns:'40px 36px 1fr 80px 96px 72px',padding:'12px 18px',borderBottom:`1px solid ${BO}`,background:i<3?`${t.c}07`:'transparent' }}>
                  <div style={{fontSize:16}}>{i===0?'🥇':i===1?'🥈':i===2?'🥉':''}</div>
                  <div style={{fontSize:10,color:DM,fontFamily:'monospace',alignSelf:'center'}}>#{i+1}</div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <div style={{width:30,height:30,borderRadius:8,background:`${t.c}20`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:900,color:t.c,flexShrink:0}}>{t.init}</div>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:TE}}>{t.name}</div>
                      <div style={{height:3,background:RA,borderRadius:2,width:60,overflow:'hidden',marginTop:4}}>
                        <div style={{width:`${t.wr}%`,height:'100%',background:t.c}} />
                      </div>
                    </div>
                  </div>
                  <div style={{textAlign:'right',fontSize:12,color:MT,alignSelf:'center'}}>{t.wr}% WR</div>
                  <div style={{textAlign:'right',fontSize:15,fontWeight:900,color:GD,fontFamily:'monospace',alignSelf:'center'}}>${t.earned.toLocaleString()}</div>
                  <div style={{textAlign:'right',alignSelf:'center'}}>
                    {t.streak>0?<span style={{fontSize:12,color:OR,fontWeight:800}}>🔥 {t.streak}</span>:<span style={{fontSize:11,color:DM}}>—</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ height:1,background:BO,margin:'52px 0 32px' }} />
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12 }}>
          <div style={{ display:'flex',alignItems:'center',gap:7 }}>
            <div style={{ width:22,height:22,borderRadius:6,background:G,display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Trophy size={11} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize:13,fontWeight:800,color:TE }}>YN Arena</span>
          </div>
          <div style={{ display:'flex',gap:18,flexWrap:'wrap' }}>
            {[['/arena/schedule','Schedule'],['/arena/creator','Stream & Earn'],['/arena/how-it-works','How It Works'],['/courses','Courses'],['/app','Terminal'],['/privacy','Privacy'],['/terms','Terms']].map(([h,l]) => (
              <Link key={l} href={h} style={{ fontSize:12,color:DM,textDecoration:'none',transition:'color 0.13s' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:11,color:'#3f3f46' }}>Simulated trading · Real prizes · © 2026 YN Finance</div>
        </div>
      </div>
    </div>
  )
}


export default function ArenaPage() {
  return (
    <Suspense>
      <ArenaInner />
    </Suspense>
  )
}
