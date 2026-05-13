'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Eye, Zap, ArrowRight, Radio, BarChart2, TrendingUp, Users, DollarSign } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'
import AdsterraBanner from '@/components/ads/AdsterraBanner'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG  = '#040508'
const SU  = '#0d1117'
const RA  = '#161b22'
const BO  = '#21262d'
const G   = '#22c55e'
const GD  = '#f59e0b'
const RE  = '#dc2626'
const BL  = '#2563eb'
const PU  = '#7c3aed'
const TE  = '#f0f6fc'
const MT  = '#8b949e'
const DM  = '#484f58'
const MONO = "'SF Mono', 'Fira Code', monospace"

// ─── DATA ─────────────────────────────────────────────────────────────────────
const TRADERS = [
  { name:'Marcus T.',  init:'MT', base: 18.4, c: G   },
  { name:'Sarah K.',   init:'SK', base: 14.1, c: GD  },
  { name:'Devon P.',   init:'DP', base: 11.7, c: BL  },
  { name:'Jordan M.',  init:'JM', base:  9.3, c: PU  },
  { name:'Aisha B.',   init:'AB', base:  7.2, c: G   },
  { name:'Chris L.',   init:'CL', base:  4.8, c: '#f97316' },
  { name:'Nina R.',    init:'NR', base:  2.9, c: BL  },
  { name:'Tyler W.',   init:'TW', base: -1.4, c: DM  },
  { name:'Priya S.',   init:'PS', base: -4.1, c: RE  },
  { name:'Alex M.',    init:'AM', base: -6.8, c: RE  },
  { name:'YN-ALPHA',  init:'α',  base:  5.3, c: PU, ai:true },
  { name:'YN-BETA',   init:'β',  base: -2.7, c: DM, ai:true },
]

const CONTESTS = [
  { id:'daily-blitz',   name:'Daily Blitz',      fee:10,  max:500,  filled:390, allowed:'All Markets',  c: G,   tier:'STANDARD', tagline:'Best for new traders'                },
  { id:'crypto-night',  name:'Crypto Night',      fee:25,  max:250,  filled:188, allowed:'Crypto Only',  c: PU,  tier:'PREMIUM',  tagline:'High volatility, big swings'          },
  { id:'pro-showdown',  name:'Pro Showdown',      fee:100, max:100,  filled:44,  allowed:'All Markets',  c: GD,  tier:'ELITE',    tagline:'Veterans only. Serious money.'        },
  { id:'futures-arena', name:'Futures Arena',     fee:50,  max:150,  filled:67,  allowed:'Futures Only', c: BL,  tier:'PREMIUM',  tagline:'ES, NQ, GC, CL — big leverage'       },
  { id:'h2h-duel',      name:'H2H Duel',          fee:10,  max:2,    filled:1,   allowed:'All Markets',  c: '#f97316', tier:'1v1', tagline:'You vs. one trader. Winner takes $18.' },
  { id:'weekly-mega',   name:'Weekly Mega',       fee:25,  max:1000, filled:712, allowed:'All Markets',  c: GD,  tier:'MEGA',     tagline:'$22,000 pool. Top 200 paid.'          },
]

const PRIZE_WEIGHTS = [0.30, 0.18, 0.12, 0.08, 0.06, 0.03, 0.03, 0.03, 0.03, 0.03]
function calcPool(entries: number, fee: number) { return Math.floor(entries * fee * 0.88) }
function calcPrize(rank: number, pool: number): number {
  if (rank <= 10) return Math.floor(pool * (PRIZE_WEIGHTS[rank - 1] ?? 0.01))
  const inMoney = Math.ceil(10 / 0.2)
  if (rank <= inMoney) return Math.floor(pool * 0.01 / (inMoney - 10))
  return 0
}

const STREAMS = [
  { name:'Marcus T.',  init:'MT', asset:'AAPL',    tf:'5',   pct: 18.4, viewers:2847, c: G   },
  { name:'Sarah K.',   init:'SK', asset:'BTC/USD', tf:'60',  pct: 14.1, viewers:1654, c: GD  },
  { name:'Devon P.',   init:'DP', asset:'EUR/USD', tf:'15',  pct:  7.8, viewers: 987, c: BL  },
  { name:'Aisha B.',   init:'AB', asset:'NVDA',    tf:'D',   pct: 22.3, viewers:1432, c: PU  },
  { name:'Jordan M.',  init:'JM', asset:'SPY',     tf:'1',   pct: -3.2, viewers: 743, c: RE  },
  { name:'Nina R.',    init:'NR', asset:'ETH/USD', tf:'240', pct:  9.1, viewers: 521, c: '#f97316' },
]

const PAYOUTS = [
  { name:'Marcus T.', pct:'+241%', entry:'$10',  won:'$1,100', contest:'Daily Blitz',   date:'Today'      },
  { name:'Priya S.',  pct:'+382%', entry:'$25',  won:'$2,904', contest:'Crypto Night',  date:'Yesterday'  },
  { name:'Devon P.',  pct:'+198%', entry:'$100', won:'$2,640', contest:'Pro Showdown',  date:'2 days ago' },
  { name:'Sarah K.',  pct:'+156%', entry:'$10',  won:'$660',   contest:'Daily Blitz',   date:'2 days ago' },
  { name:'Ryan C.',   pct:'+312%', entry:'$25',  won:'$1,452', contest:'Futures Arena', date:'3 days ago' },
]

const TICKER_SYMBOLS = ['SPY','QQQ','BTC','ETH','EUR/USD','ES']
const TICKER_BASE    = [582.40, 494.20, 68420.00, 3840.00, 1.0812, 5824.00]
const TICKER_CHANGES = [0.84, 1.12, -1.43, 2.31, 0.07, 0.91]

const BREAKING_ALERTS = [
  { text:"Marcus T. just hit +18.4% — leads the board", icon:"🔥", type:'win'   as const },
  { text:"Sarah K. moved up 2 spots — now #2",          icon:"📈", type:'rank'  as const },
  { text:"Pro Showdown filling fast — 12 spots left",   icon:"⚡", type:'warn'  as const },
  { text:"Devon P. cracked +11% — entering prize zone", icon:"🔥", type:'win'   as const },
  { text:"Weekly Mega pool crossed $15,600",            icon:"💰", type:'win'   as const },
  { text:"Aisha B. is on a 3-contest win streak",       icon:"🔥", type:'win'   as const },
]

type BreakingAlert = { text: string; icon: string; type: 'win' | 'rank' | 'warn' }

function buildBoard(tick: number) {
  return TRADERS.map((t, i) => ({
    ...t,
    pct: +(t.base + Math.sin(tick * 0.22 + i * 1.9) * 0.7 + Math.cos(tick * 0.38 + i * 2.6) * 0.3).toFixed(2),
  })).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 }))
}

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────

function PulseDot({ c = RE }: { c?: string }) {
  return (
    <span style={{ position:'relative', display:'inline-flex', width:8, height:8, flexShrink:0 }}>
      <span style={{ position:'absolute', inset:0, borderRadius:'50%', background:c, opacity:0.4, animation:'yn-ping 1.2s ease-in-out infinite' }} />
      <span style={{ position:'relative', borderRadius:'50%', background:c, width:'100%', height:'100%' }} />
    </span>
  )
}

function LiveBadge() {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:5, background:`${RE}18`, border:`1px solid ${RE}45`, borderRadius:4, padding:'2px 8px' }}>
      <PulseDot c={RE} />
      <span style={{ fontSize:9, fontWeight:900, color:RE, letterSpacing:'0.18em', fontFamily:MONO }}>LIVE</span>
    </span>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize:10, fontWeight:700, color:MT, letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
      {children}
    </div>
  )
}

function Countdown({ h: hours }: { h: number }) {
  const end = useRef(Date.now() + hours * 3_600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => {
    const t = setInterval(() => setMs(end.current - Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const hh = Math.floor(ms / 3_600_000)
  const mm = Math.floor((ms % 3_600_000) / 60_000)
  const ss = Math.floor((ms % 60_000) / 1_000)
  return (
    <span style={{ fontFamily:MONO, fontWeight:700, color: ms < 3_600_000 ? RE : TE, letterSpacing:1 }}>
      {String(hh).padStart(2,'0')}:{String(mm).padStart(2,'0')}:{String(ss).padStart(2,'0')}
    </span>
  )
}

// ─── MARKET TICKER BAR ────────────────────────────────────────────────────────

function MarketTicker({ tick }: { tick: number }) {
  const prices = TICKER_SYMBOLS.map((sym, i) => {
    const wave = Math.sin(tick * 0.18 + i * 1.4) * 0.003 + Math.cos(tick * 0.31 + i * 2.1) * 0.002
    const price = +(TICKER_BASE[i]! * (1 + wave)).toFixed(sym === 'EUR/USD' ? 4 : sym === 'BTC' || sym === 'ETH' ? 2 : 2)
    const chg   = +(TICKER_CHANGES[i]! + Math.sin(tick * 0.22 + i * 0.9) * 0.15).toFixed(2)
    return { sym, price, chg }
  })

  return (
    <div style={{ height:36, background:SU, borderBottom:`1px solid ${BO}`, display:'flex', alignItems:'center', overflow:'hidden' }}>
      {/* left label */}
      <div style={{ background:`${RA}`, height:'100%', display:'flex', alignItems:'center', padding:'0 14px', flexShrink:0, borderRight:`1px solid ${BO}` }}>
        <span style={{ fontSize:9, fontWeight:900, letterSpacing:'0.18em', color:GD, fontFamily:MONO }}>MARKET</span>
      </div>

      {/* scrolling prices */}
      <div style={{ flex:1, overflow:'hidden', position:'relative' }}>
        <div style={{ display:'inline-flex', animation:'yn-ticker 48s linear infinite', whiteSpace:'nowrap', gap:0 }}>
          {[...prices, ...prices].map((p, i) => (
            <span key={i} style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'0 22px', borderRight:`1px solid ${BO}` }}>
              <span style={{ fontSize:11, fontWeight:700, color:MT, letterSpacing:'0.06em' }}>{p.sym}</span>
              <span style={{ fontSize:12, fontWeight:700, color:TE, fontFamily:MONO }}>{p.sym === 'EUR/USD' ? p.price.toFixed(4) : p.price.toLocaleString()}</span>
              <span style={{ fontSize:10, fontWeight:700, color: p.chg >= 0 ? G : RE, fontFamily:MONO }}>{p.chg >= 0 ? '+':''}{p.chg}%</span>
            </span>
          ))}
          {/* winner feed */}
          <span style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'0 28px', borderRight:`1px solid ${BO}` }}>
            <PulseDot c={G} />
            <span style={{ fontSize:11, fontWeight:700, color:G, letterSpacing:'0.04em' }}>MARCUS T. +18.4% · DAILY BLITZ LEADER</span>
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'0 28px', borderRight:`1px solid ${BO}` }}>
            <PulseDot c={GD} />
            <span style={{ fontSize:11, fontWeight:700, color:GD, letterSpacing:'0.04em' }}>$47,320 PAID TO TRADERS THIS MONTH</span>
          </span>
          <span style={{ display:'inline-flex', alignItems:'center', gap:10, padding:'0 28px' }}>
            <PulseDot c={BL} />
            <span style={{ fontSize:11, fontWeight:700, color:MT, letterSpacing:'0.04em' }}>390 TRADERS COMPETING IN TODAY'S BLITZ</span>
          </span>
        </div>
      </div>

      {/* right label */}
      <div style={{ padding:'0 14px', flexShrink:0, borderLeft:`1px solid ${BO}` }}>
        <span style={{ fontSize:9, color:DM, fontFamily:MONO }}>Market Data · Simulated</span>
      </div>
    </div>
  )
}

// ─── BREAKING ALERT ───────────────────────────────────────────────────────────

function BreakingAlertBar({ alert, onDismiss }: { alert: BreakingAlert; onDismiss: () => void }) {
  const bg   = alert.type === 'win' ? G : alert.type === 'rank' ? BL : GD
  const text = alert.type === 'win' ? BG : alert.type === 'rank' ? '#fff' : BG
  return (
    <div onClick={onDismiss} style={{
      position:'fixed', top:70, left:'50%', transform:'translateX(-50%)',
      zIndex:9999, animation:'yn-slide-down 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      background:bg, borderRadius:10, padding:'10px 20px',
      display:'flex', alignItems:'center', gap:10, cursor:'pointer',
      boxShadow:`0 8px 32px ${bg}60, 0 2px 8px rgba(0,0,0,0.5)`,
      maxWidth:480, width:'calc(100vw - 40px)',
    }}>
      <span style={{ fontSize:16 }}>{alert.icon}</span>
      <span style={{ fontSize:13, fontWeight:800, color:text, letterSpacing:-0.2 }}>{alert.text}</span>
      <span style={{ marginLeft:'auto', fontSize:10, color:`${text}80`, fontWeight:700 }}>LIVE</span>
    </div>
  )
}

// ─── TOURNAMENT BANNER ────────────────────────────────────────────────────────

function TournamentBanner({ contest, onEnter, entering }: {
  contest: typeof CONTESTS[0]
  onEnter: () => void
  entering: boolean
}) {
  const pool = calcPool(contest.filled, contest.fee)
  return (
    <div style={{ background:RA, borderBottom:`1px solid ${BO}`, height:40, display:'flex', alignItems:'center', overflow:'hidden' }}>
      <div style={{ maxWidth:1200, margin:'0 auto', padding:'0 24px', width:'100%', display:'flex', alignItems:'center', gap:16 }}>
        <LiveBadge />
        <span style={{ fontSize:11, fontWeight:800, color:TE, letterSpacing:'0.04em' }}>{contest.name.toUpperCase()}</span>
        <span style={{ fontSize:10, color:DM }}>·</span>
        <span style={{ fontSize:11, color:MT }}>Closes <Countdown h={3} /></span>
        <span style={{ fontSize:10, color:DM }}>·</span>
        <span style={{ fontSize:11, fontWeight:800, color:GD, fontFamily:MONO }}>${pool.toLocaleString()} pool</span>
        <span style={{ fontSize:10, color:DM }}>·</span>
        <span style={{ fontSize:10, color:MT }}>{contest.filled} traders</span>
        <button
          onClick={onEnter}
          disabled={entering}
          style={{
            marginLeft:'auto', background:G, color:BG, border:'none',
            borderRadius:5, padding:'5px 14px', fontSize:11, fontWeight:900,
            cursor:'pointer', letterSpacing:'0.04em', transition:'opacity 0.15s, transform 0.15s',
            opacity: entering ? 0.5 : 1,
          }}
        >
          {entering ? '…' : `ENTER $${contest.fee}`}
        </button>
      </div>
    </div>
  )
}

// ─── SCOREBOARD ───────────────────────────────────────────────────────────────

type BoardEntry = { name: string; init: string; base: number; c: string; ai?: boolean; pct: number; rank: number }

function Scoreboard({ board, inMoney, tick }: { board: BoardEntry[]; inMoney: number; tick: number }) {
  const mainContest = CONTESTS[0]!
  const pool = calcPool(mainContest.filled, mainContest.fee)
  const medalColor = (i: number) => i === 0 ? GD : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : BO
  const medalBg    = (i: number) => i === 0 ? `${GD}22` : i === 1 ? '#94a3b822' : i === 2 ? '#b4530922' : 'transparent'

  return (
    <div>
      {/* Board header — ESPN style */}
      <div style={{ background:RA, border:`1px solid ${BO}`, borderBottom:'none', borderRadius:'10px 10px 0 0', padding:'12px 18px', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <LiveBadge />
        <span style={{ fontSize:14, fontWeight:900, color:TE, letterSpacing:-0.3 }}>DAILY BLITZ</span>
        <span style={{ fontSize:11, color:DM }}>·</span>
        <span style={{ fontSize:11, color:MT }}><Countdown h={3} /> left</span>
        <span style={{ fontSize:11, color:DM }}>·</span>
        <span style={{ fontSize:11, color:MT, fontFamily:MONO }}>{board.length} TRADERS</span>
        <span style={{ marginLeft:'auto', fontSize:10, color:DM, fontFamily:MONO }}>updates every 3s</span>
      </div>

      {/* Column headers */}
      <div style={{ display:'grid', gridTemplateColumns:'36px 44px 1fr 100px 90px 80px', padding:'8px 18px', background:`${SU}`, border:`1px solid ${BO}`, borderBottom:'none' }}>
        {['', 'RANK', 'TRADER', 'P&L %', 'PRIZE', 'STATUS'].map((h, i) => (
          <div key={i} style={{ fontSize:9, fontWeight:700, color:DM, letterSpacing:'0.12em', textAlign: i > 2 ? 'right' : 'left' }}>{h}</div>
        ))}
      </div>

      {/* Rows */}
      <div style={{ border:`1px solid ${BO}`, borderRadius:'0 0 10px 10px', overflow:'hidden' }}>
        {board.map((t, i) => {
          const paid  = i < inMoney
          const prize = paid ? calcPrize(i + 1, pool) : 0
          const lbCol = medalColor(i)
          return (
            <div
              key={t.name}
              style={{
                display:'grid', gridTemplateColumns:'36px 44px 1fr 100px 90px 80px',
                padding:'10px 18px', alignItems:'center',
                borderBottom: i < board.length - 1 ? `1px solid ${BO}` : 'none',
                background: i % 2 === 0 ? `${SU}` : `${RA}`,
                borderLeft: `4px solid ${i < 3 ? lbCol : paid ? `${t.c}50` : DM+'30'}`,
                transition:'background 0.6s, border-color 0.6s',
                animation: `yn-in 0.2s ease ${i * 0.03}s both`,
              }}
            >
              {/* Medal */}
              <div style={{ fontSize:14 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</div>

              {/* Rank */}
              <div style={{ fontSize:11, fontWeight:700, color:i < 3 ? lbCol : DM, fontFamily:MONO, background: i < 3 ? medalBg(i) : 'transparent', borderRadius:4, padding:'2px 5px', textAlign:'center', width:'fit-content' }}>
                #{t.rank}
              </div>

              {/* Trader */}
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:`${t.c}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:t.c, flexShrink:0, border:`1px solid ${t.c}30` }}>
                  {t.ai ? '🤖' : t.init}
                </div>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:TE }}>{t.name}</div>
                  {t.ai && <div style={{ fontSize:9, color:PU, letterSpacing:'0.08em' }}>AI TRADER</div>}
                </div>
              </div>

              {/* P&L — biggest number, ESPN style */}
              <div style={{ textAlign:'right', fontSize:18, fontWeight:900, color: t.pct >= 0 ? G : RE, fontFamily:MONO, transition:'color 0.3s', letterSpacing:-0.5 }}>
                {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(2)}%
              </div>

              {/* Prize */}
              <div style={{ textAlign:'right', fontSize:13, fontWeight:800, color: paid ? GD : DM, fontFamily:MONO }}>
                {paid ? `$${prize.toLocaleString()}` : '—'}
              </div>

              {/* Status */}
              <div style={{ textAlign:'right' }}>
                {paid
                  ? <span style={{ fontSize:9, color:G, background:`${G}18`, padding:'3px 8px', borderRadius:20, fontWeight:800, letterSpacing:'0.06em', border:`1px solid ${G}30` }}>CASHING</span>
                  : <span style={{ fontSize:9, color:DM, background:`${DM}18`, padding:'3px 8px', borderRadius:20, letterSpacing:'0.04em' }}>OUT</span>
                }
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div style={{ padding:'10px 18px', background:RA, border:`1px solid ${BO}`, borderTop:'none', borderRadius:'0 0 10px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:11, color:DM }}>
          <span style={{ color:G, fontWeight:700 }}>{inMoney}</span> traders currently cashing · top {Math.round((inMoney / board.length) * 100)}% · updates every 3s
        </span>
        <span style={{ fontSize:10, color:DM, fontFamily:MONO }}>tick #{tick}</span>
      </div>
    </div>
  )
}

// ─── PRIZE PANEL ──────────────────────────────────────────────────────────────

function PrizePanel({ contest, onEnter, entering }: {
  contest: typeof CONTESTS[0]
  onEnter: (c: typeof CONTESTS[0]) => void
  entering: string | null
}) {
  const pool = calcPool(contest.filled, contest.fee)
  return (
    <div style={{ background:SU, border:`1px solid ${BO}`, borderLeft:`4px solid ${contest.c}`, borderRadius:10, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${BO}`, background:RA }}>
        <SectionLabel>Selected Contest</SectionLabel>
        <div style={{ fontSize:18, fontWeight:900, color:TE, letterSpacing:-0.4, marginBottom:4 }}>{contest.name}</div>
        <div style={{ fontSize:11, color:MT }}>{contest.tagline}</div>
      </div>

      {/* Prize pool big number */}
      <div style={{ padding:'20px', borderBottom:`1px solid ${BO}` }}>
        <div style={{ fontSize:10, color:DM, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:6 }}>Prize Pool</div>
        <div style={{ fontSize:36, fontWeight:900, color:GD, fontFamily:MONO, letterSpacing:-1 }}>${pool.toLocaleString()}</div>
        <div style={{ fontSize:11, color:DM, marginTop:4 }}>1st place: <span style={{ color:GD, fontWeight:800, fontFamily:MONO }}>${calcPrize(1, pool).toLocaleString()}</span></div>
      </div>

      {/* Prize breakdown */}
      <div style={{ padding:'16px 20px', borderBottom:`1px solid ${BO}` }}>
        <SectionLabel>Prize Breakdown</SectionLabel>
        {[
          { label:'1st',    pct:0.30, hi:true  },
          { label:'2nd',    pct:0.18, hi:false },
          { label:'3rd',    pct:0.12, hi:false },
          { label:'4th',    pct:0.08, hi:false },
          { label:'5th',    pct:0.06, hi:false },
          { label:'6–10th', pct:0.03, hi:false },
        ].map(row => (
          <div key={row.label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'5px 8px', borderRadius:5, background: row.hi ? `${GD}12` : 'transparent', marginBottom:2 }}>
            <span style={{ fontSize:11, color: row.hi ? GD : MT, fontWeight: row.hi ? 700 : 400 }}>{row.label}</span>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <span style={{ fontSize:11, fontWeight:700, color: row.hi ? GD : TE, fontFamily:MONO }}>{Math.round(row.pct * 100)}%</span>
              <span style={{ fontSize:12, fontWeight:800, color: row.hi ? GD : MT, fontFamily:MONO }}>${Math.floor(pool * row.pct).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Fill bar */}
      <div style={{ padding:'14px 20px', borderBottom:`1px solid ${BO}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
          <span style={{ fontSize:10, color:DM }}>Contest fill</span>
          <span style={{ fontSize:10, fontFamily:MONO, color:MT }}>{contest.filled}/{contest.max}</span>
        </div>
        <div style={{ height:4, background:RA, borderRadius:2, overflow:'hidden' }}>
          <div style={{ width:`${Math.round((contest.filled / contest.max) * 100)}%`, height:'100%', background:contest.c, transition:'width 1s', borderRadius:2 }} />
        </div>
        {contest.filled / contest.max > 0.9 && (
          <div style={{ marginTop:6, fontSize:10, color:RE, fontWeight:700, letterSpacing:'0.04em' }}>⚡ LATE ENTRY — FILLING FAST</div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding:'16px 20px' }}>
        <button
          onClick={() => onEnter(contest)}
          disabled={!!entering}
          style={{
            width:'100%', background:contest.c, color: contest.c === GD || contest.c === G ? BG : '#fff',
            border:'none', borderRadius:8, padding:'14px', fontSize:15, fontWeight:900,
            cursor:'pointer', letterSpacing:0.2,
            transition:'opacity 0.15s, transform 0.15s',
            opacity: !!entering ? 0.5 : 1,
            boxShadow: `0 4px 16px ${contest.c}40`,
          }}
        >
          {entering === contest.id ? 'Processing…' : `Enter Now — $${contest.fee}`}
        </button>
        <div style={{ textAlign:'center', marginTop:8, fontSize:10, color:DM }}>Top 20% always paid · Payouts via Stripe · 88% pool</div>
      </div>
    </div>
  )
}

// ─── CONTEST CARD (DraftKings style) ──────────────────────────────────────────

function ContestCard({ c, selected, onSelect, onEnter, entering }: {
  c: typeof CONTESTS[0]
  selected: boolean
  onSelect: () => void
  onEnter: (e: React.MouseEvent) => void
  entering: boolean
}) {
  const pool = calcPool(c.filled, c.fee)
  const fill = Math.round((c.filled / c.max) * 100)
  const late = fill > 90

  return (
    <div
      onClick={onSelect}
      style={{
        background:SU, border:`1px solid ${selected ? c.c : BO}`,
        borderLeft:`4px solid ${c.c}`,
        borderRadius:10, overflow:'hidden', cursor:'pointer',
        boxShadow: selected ? `0 0 0 1px ${c.c}40, 0 4px 20px ${c.c}20` : 'none',
        transition:'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 4px 20px ${c.c}30` }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = selected ? `0 0 0 1px ${c.c}40, 0 4px 20px ${c.c}20` : 'none' }}
    >
      {/* Card top */}
      <div style={{ padding:'14px 16px 10px', borderBottom:`1px solid ${BO}` }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <span style={{ fontSize:9, fontWeight:900, color:c.c, background:`${c.c}18`, padding:'2px 8px', borderRadius:3, letterSpacing:'0.08em', border:`1px solid ${c.c}30` }}>{c.tier}</span>
            <span style={{ fontSize:9, color:DM }}>{c.allowed}</span>
          </div>
          {late && (
            <span style={{ fontSize:9, fontWeight:900, color:'#fff', background:RE, padding:'2px 7px', borderRadius:3, letterSpacing:'0.06em', animation:'yn-pulse 1s ease-in-out infinite' }}>LATE ENTRY</span>
          )}
        </div>
        <div style={{ fontSize:15, fontWeight:900, color:TE, marginBottom:3, letterSpacing:-0.3 }}>{c.name}</div>
        <div style={{ fontSize:11, color:MT }}>{c.tagline}</div>
      </div>

      {/* Pool */}
      <div style={{ padding:'12px 16px 0' }}>
        <div style={{ fontSize:9, color:DM, letterSpacing:'0.1em', textTransform:'uppercase', marginBottom:4 }}>Prize Pool</div>
        <div style={{ fontSize:24, fontWeight:900, color:GD, fontFamily:MONO, letterSpacing:-0.5, marginBottom:3 }}>${pool.toLocaleString()}</div>
        <div style={{ fontSize:11, color:DM }}>
          1st: <span style={{ color:GD, fontWeight:800, fontFamily:MONO }}>${calcPrize(1, pool).toLocaleString()}</span>
          <span style={{ color:DM }}> · </span>
          <span style={{ color:G, fontSize:10, fontWeight:700 }}>Top 20% paid</span>
        </div>
      </div>

      {/* Fill bar */}
      <div style={{ padding:'10px 16px' }}>
        <div style={{ height:3, background:RA, borderRadius:2, overflow:'hidden', marginBottom:5 }}>
          <div style={{ width:`${fill}%`, height:'100%', background: fill > 85 ? '#f97316' : c.c, transition:'width 1s', borderRadius:2 }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <span style={{ fontSize:10, color:DM }}>{c.filled}/{c.max} entered {fill > 85 && <span style={{ color:'#f97316', fontWeight:700 }}>· filling fast</span>}</span>
          <span style={{ fontSize:10, color:DM, fontFamily:MONO }}>{fill}%</span>
        </div>
      </div>

      {/* CTA row */}
      <div style={{ padding:'0 16px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontSize:10, color:DM }}>Entry fee</span>
        <button
          onClick={onEnter}
          disabled={entering}
          style={{
            fontSize:13, fontWeight:900, color: c.c === GD || c.c === G ? BG : '#fff',
            background:c.c, border:'none', borderRadius:7, padding:'7px 18px',
            cursor:'pointer', letterSpacing:0.2,
            transition:'opacity 0.15s, transform 0.15s',
            opacity: entering ? 0.5 : 1,
            boxShadow:`0 2px 8px ${c.c}40`,
          }}
        >
          {entering ? '…' : `$${c.fee}`}
        </button>
      </div>
    </div>
  )
}

// ─── RECENT PAYOUTS ───────────────────────────────────────────────────────────

function RecentPayouts() {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:20 }}>
        <div>
          <SectionLabel><TrendingUp size={10} /> Verified Payouts</SectionLabel>
          <div style={{ fontSize:20, fontWeight:900, color:TE, letterSpacing:-0.4 }}>Recent Winners</div>
        </div>
        <span style={{ fontSize:12, color:MT, fontFamily:MONO }}>$47,320 paid this month</span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:10 }}>
        {PAYOUTS.map((p, i) => (
          <div key={i} style={{ background:SU, border:`1px solid ${BO}`, borderLeft:`4px solid ${G}`, borderRadius:10, padding:'16px 16px', transition:'border-color 0.15s' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
              <div style={{ width:34, height:34, borderRadius:9, background:`${G}15`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:G, border:`1px solid ${G}25` }}>
                {p.name.slice(0, 2).toUpperCase()}
              </div>
              <span style={{ fontSize:9, color:DM, background:RA, padding:'3px 8px', borderRadius:4, border:`1px solid ${BO}` }}>{p.date}</span>
            </div>
            <div style={{ fontSize:14, fontWeight:800, color:TE, marginBottom:2 }}>{p.name}</div>
            <div style={{ fontSize:10, color:DM, marginBottom:12 }}>{p.contest}</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'baseline' }}>
              <span style={{ fontSize:11, color:G, fontWeight:700, fontFamily:MONO }}>{p.pct}</span>
              <span style={{ fontSize:20, fontWeight:900, color:GD, fontFamily:MONO, letterSpacing:-0.5 }}>{p.won}</span>
            </div>
            <div style={{ fontSize:10, color:DM, marginTop:3, textAlign:'right' }}>{p.entry} entry</div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── ALL-TIME LEADERBOARD ─────────────────────────────────────────────────────

const ALL_TIME = [
  { name:'Marcus T.',  init:'MT', wr:67, earned:4280, streak:5, c:GD },
  { name:'Priya S.',   init:'PS', wr:71, earned:3920, streak:3, c:G  },
  { name:'Devon P.',   init:'DP', wr:58, earned:2847, streak:2, c:BL },
  { name:'Sarah K.',   init:'SK', wr:62, earned:2410, streak:4, c:PU },
  { name:'Ryan C.',    init:'RC', wr:54, earned:1980, streak:1, c:GD },
  { name:'Jordan M.',  init:'JM', wr:49, earned:1642, streak:0, c:DM },
  { name:'Aisha B.',   init:'AB', wr:55, earned:1389, streak:2, c:G  },
  { name:'Chris L.',   init:'CL', wr:44, earned:1102, streak:0, c:DM },
]

// ─── PAGE ─────────────────────────────────────────────────────────────────────

function ArenaInner() {
  const sp = useSearchParams()
  const [board, setBoard]       = useState(() => buildBoard(0))
  const [tick, setTick]         = useState(0)
  const [viewers, setViewers]   = useState(3847)
  const [tab, setTab]           = useState<'competition' | 'streams' | 'leaderboard'>('competition')
  const [contest, setContest]   = useState(CONTESTS[0]!)
  const [stream, setStream]     = useState<typeof STREAMS[0] | null>(null)
  const [entering, setEntering] = useState<string | null>(null)
  const [modal, setModal]       = useState<string | null>(null)
  const [alert, setAlert]       = useState<BreakingAlert | null>(null)

  // Board ticks every 3s
  useEffect(() => {
    const t = setInterval(() => {
      setTick(n => {
        const next = n + 1
        setBoard(buildBoard(next))
        setViewers(v => Math.max(3000, v + Math.round((Math.random() - 0.48) * 8)))
        return next
      })
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Breaking alerts every 15–20s
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function scheduleAlert() {
      const delay = 15_000 + Math.random() * 5_000
      timeout = setTimeout(() => {
        const a = BREAKING_ALERTS[Math.floor(Math.random() * BREAKING_ALERTS.length)]!
        setAlert(a)
        setTimeout(() => setAlert(null), 4_000)
        scheduleAlert()
      }, delay)
    }
    scheduleAlert()
    return () => clearTimeout(timeout)
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tournamentId: c.id, tournamentTitle: c.name, entryFeeCents: c.fee * 100, tier: c.tier.toLowerCase() }),
      })
      const d = await r.json() as { url?: string; demo?: boolean }
      if (d.url) {
        localStorage.setItem(`yn_tournament_${c.id}`, 'true')
        window.location.href = d.url
      } else if (d.demo) {
        localStorage.setItem(`yn_tournament_${c.id}`, 'true')
        window.location.href = `/arena/tournament/${c.id}?entered=${c.id}`
      }
    } catch {
      window.alert('Error — try again')
    } finally {
      setEntering(null)
    }
  }, [])

  const inMoney = Math.ceil(board.length * 0.2)

  return (
    <div style={{ background:BG, color:TE, fontFamily:'Inter,system-ui,sans-serif', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes yn-dot      { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.65)} }
        @keyframes yn-ping     { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.8);opacity:0} }
        @keyframes yn-ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-in       { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-pop      { from{opacity:0;transform:scale(0.92) translateY(-8px)} to{opacity:1;transform:scale(1) translateY(0)} }
        @keyframes yn-conf     { 0%{transform:translateY(-8px) rotate(0);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        @keyframes yn-glow     { 0%,100%{box-shadow:0 0 0 0 ${G}30} 50%{box-shadow:0 0 24px 0 ${G}40} }
        @keyframes yn-slide-down { from{transform:translateX(-50%) translateY(-120%)} to{transform:translateX(-50%) translateY(0)} }
        @keyframes yn-pulse    { 0%,100%{opacity:1} 50%{opacity:0.5} }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:${RA}; border-radius:3px }

        .yn-btn { display:inline-flex; align-items:center; gap:7px; font-weight:700; border-radius:9px; border:none; cursor:pointer; text-decoration:none; white-space:nowrap; transition:opacity 0.15s, transform 0.15s; }
        .yn-btn:hover { opacity:0.85; transform:translateY(-1px); }
        .yn-btn:active { transform:translateY(0); }
        .yn-btn:disabled { opacity:0.4; cursor:not-allowed; transform:none; }
        .yn-btn-green { background:${G}; color:${BG}; padding:11px 22px; font-size:14px; animation:yn-glow 2.5s ease-in-out infinite; }
        .yn-btn-ghost { background:transparent; color:${MT}; border:1px solid ${BO}; padding:10px 18px; font-size:13px; }
        .yn-btn-ghost:hover { color:${TE}; border-color:${MT}; }
        .tab-btn { background:none; border:none; border-bottom:2px solid transparent; height:100%; padding:0 20px; font-size:12px; font-weight:700; color:${DM}; cursor:pointer; transition:color 0.13s, border-color 0.13s; letter-spacing:0.06em; text-transform:uppercase; }
        .tab-btn.on { color:${TE}; border-bottom-color:${G}; }
        .tab-btn:hover:not(.on) { color:${MT}; }
        .w { max-width:1200px; margin:0 auto; padding:0 24px; }

        @media(max-width:860px) {
          .sm-hide { display:none !important; }
          .sm-col  { flex-direction:column !important; }
          .sm-full { width:100% !important; max-width:100% !important; }
          .sm-grid1 { grid-template-columns:1fr !important; }
        }
      `}</style>

      {/* BREAKING ALERT */}
      {alert && <BreakingAlertBar alert={alert} onDismiss={() => setAlert(null)} />}

      {/* SUCCESS MODAL */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(4,5,8,0.92)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
          {Array.from({ length:14 }).map((_, i) => (
            <div key={i} style={{ position:'fixed', top:0, left:`${7+i*6}%`, width:7, height:7, borderRadius:i%3===0?'50%':2, background:[G,GD,PU,BL,RE][i%5], animation:`yn-conf ${1.4+i*0.13}s ease-in ${i*0.07}s forwards`, pointerEvents:'none' }} />
          ))}
          <div style={{ background:SU, border:`1px solid ${BO}`, borderRadius:14, padding:'40px 44px', maxWidth:400, width:'100%', textAlign:'center', animation:'yn-pop 0.3s cubic-bezier(0.34,1.56,0.64,1)', boxShadow:`0 32px 80px rgba(4,5,8,0.9), 0 0 0 1px ${G}30` }}>
            <div style={{ fontSize:44, marginBottom:16 }}>🎉</div>
            <div style={{ fontSize:22, fontWeight:900, color:TE, marginBottom:8, letterSpacing:-0.5 }}>You&apos;re in!</div>
            <div style={{ fontSize:14, color:MT, marginBottom:28, lineHeight:1.7 }}>
              <strong style={{ color:TE }}>{modal.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</strong> — your $10,000 account is ready. Trade until 4:00 PM ET.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button onClick={() => setModal(null)} className="yn-btn yn-btn-ghost" style={{ fontSize:13, padding:'9px 16px' }}>Watch live</button>
              <Link
                href={`/arena/tournament/${modal}?entered=${modal}`}
                onClick={() => { localStorage.setItem(`yn_tournament_${modal}`, 'true'); setModal(null) }}
                className="yn-btn yn-btn-green"
                style={{ fontSize:13, padding:'9px 18px', textDecoration:'none' }}
              >
                Open trading room →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* MARKET TICKER */}
      <MarketTicker tick={tick} />

      {/* NAV */}
      <nav style={{ borderBottom:`1px solid ${BO}`, position:'sticky', top:0, zIndex:100, backdropFilter:'blur(24px)', background:`${BG}ee` }}>
        <div className="w" style={{ height:54, display:'flex', alignItems:'center', gap:12 }}>
          {/* Logo */}
          <Link href="/arena" style={{ textDecoration:'none', display:'flex', alignItems:'center', gap:9, flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:G, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:`0 0 12px ${G}40` }}>
              <Trophy size={14} color={BG} fill={BG} />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:900, color:TE, letterSpacing:-0.3, lineHeight:1 }}>YN Arena</div>
            </div>
          </Link>

          <div className="sm-hide"><LiveBadge /></div>

          <div style={{ fontSize:12, color:DM, display:'flex', alignItems:'center', gap:4 }} className="sm-hide">
            <Eye size={10} color={MT} />
            <span style={{ fontFamily:MONO, color:MT, fontSize:11 }}>{viewers.toLocaleString()}</span>
          </div>

          {/* Tabs */}
          <div style={{ flex:1, display:'flex', height:'100%', marginLeft:16 }} className="sm-hide">
            {(['competition', 'streams', 'leaderboard'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`tab-btn${tab === t ? ' on' : ''}`}>
                {t === 'competition' ? 'Competition' : t === 'streams' ? 'Streams' : 'Leaderboard'}
              </button>
            ))}
          </div>

          <div style={{ display:'flex', gap:8, alignItems:'center', marginLeft:'auto' }}>
            <Link href="/arena/schedule" style={{ fontSize:11, color:DM, textDecoration:'none', padding:'5px 10px', border:`1px solid ${BO}`, borderRadius:6 }} className="sm-hide">Schedule</Link>
            <Link href="/arena/creator" style={{ fontSize:11, color:PU, textDecoration:'none', padding:'5px 10px', border:`1px solid ${PU}35`, borderRadius:6 }} className="sm-hide">Stream &amp; Earn</Link>
            <Link href="/" style={{ fontSize:11, color:DM, textDecoration:'none', padding:'5px 10px', border:`1px solid ${BO}`, borderRadius:6 }} className="sm-hide">← Home</Link>
            <button onClick={() => enter(contest)} disabled={!!entering} className="yn-btn yn-btn-green" style={{ fontSize:13, padding:'9px 20px' }}>
              {entering ? '…' : `Enter $${contest.fee}`}
            </button>
          </div>
        </div>
      </nav>

      {/* TOURNAMENT BANNER */}
      <TournamentBanner contest={contest} onEnter={() => enter(contest)} entering={!!entering} />

      {/* MAIN CONTENT */}
      <div className="w" style={{ paddingTop:32, paddingBottom:80 }}>

        {/* ══════════════════════════════════════════════════
            TAB 1 — COMPETITION
        ══════════════════════════════════════════════════ */}
        {tab === 'competition' && (
          <div style={{ animation:'yn-in 0.25s ease' }}>

            {/* Row 1: Scoreboard + Prize Panel */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 340px', gap:20, marginBottom:32, alignItems:'start' }} className="sm-col sm-grid1">

              {/* Left: full scoreboard */}
              <div>
                <SectionLabel><PulseDot c={RE} /> Live Scoreboard · Daily Blitz</SectionLabel>
                <Scoreboard board={board} inMoney={inMoney} tick={tick} />
              </div>

              {/* Right: prize + enter */}
              <div className="sm-full">
                <SectionLabel><DollarSign size={10} /> Enter Contest</SectionLabel>
                <PrizePanel contest={contest} onEnter={enter} entering={entering} />
              </div>
            </div>

            {/* Ad unit — 728×90 leaderboard */}
            <div style={{ margin:'32px 0', display:'flex', justifyContent:'center' }}>
              <AdsterraBanner />
            </div>

            {/* Row 2: Contest Lobby */}
            <div style={{ marginBottom:32 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
                <div>
                  <SectionLabel><BarChart2 size={10} /> Open Contests</SectionLabel>
                  <div style={{ fontSize:22, fontWeight:900, color:TE, letterSpacing:-0.5 }}>Tournament Lobby</div>
                </div>
                <Link href="/arena/schedule" style={{ fontSize:12, color:DM, textDecoration:'none', display:'flex', alignItems:'center', gap:4 }}>
                  Full schedule <ArrowRight size={11} />
                </Link>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(270px,1fr))', gap:12 }}>
                {CONTESTS.map(c => (
                  <ContestCard
                    key={c.id}
                    c={c}
                    selected={contest.id === c.id}
                    onSelect={() => setContest(c)}
                    onEnter={e => { e.stopPropagation(); enter(c) }}
                    entering={entering === c.id}
                  />
                ))}
              </div>
            </div>

            {/* Ad unit 2 */}
            <div style={{ margin:'32px 0', display:'flex', justifyContent:'center' }}>
              <AdsterraBanner />
            </div>

            {/* Row 3: Recent Payouts */}
            <RecentPayouts />

            {/* How it works */}
            <div style={{ margin:'48px 0 0' }}>
              <div style={{ marginBottom:24 }}>
                <SectionLabel>How It Works</SectionLabel>
                <div style={{ fontSize:22, fontWeight:900, color:TE, letterSpacing:-0.5 }}>Simple. Transparent. Fair.</div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:1, background:BO, borderRadius:12, overflow:'hidden' }} className="sm-grid1">
                {[
                  { n:'01', title:'Pay entry fee', body:'Charged via Stripe. You get a $10,000 simulated trading account instantly. No waitlist, no approval.' },
                  { n:'02', title:'Trade for 6 hours', body:'Long or short on stocks, forex, futures, or crypto. Your P&L% updates live on the public leaderboard.' },
                  { n:'03', title:'Top 20% get paid', body:'The prize pool is 88% of all entry fees. Top finishers split it proportionally. Payouts within 24h.' },
                ].map(({ n, title, body }) => (
                  <div key={n} style={{ background:SU, padding:'28px 24px' }}>
                    <div style={{ fontSize:10, fontWeight:900, color:G, letterSpacing:'0.16em', marginBottom:12, fontFamily:MONO }}>STEP {n}</div>
                    <div style={{ fontSize:16, fontWeight:800, color:TE, marginBottom:8, letterSpacing:-0.3 }}>{title}</div>
                    <div style={{ fontSize:13, color:MT, lineHeight:1.7 }}>{body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 2 — STREAMS (TradingView grid)
        ══════════════════════════════════════════════════ */}
        {tab === 'streams' && (
          <div style={{ paddingTop:8, animation:'yn-in 0.25s ease' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:28, flexWrap:'wrap', gap:12 }}>
              <div>
                <SectionLabel><PulseDot c={RE} /> Live Broadcasts</SectionLabel>
                <div style={{ fontSize:26, fontWeight:900, color:TE, letterSpacing:-0.5 }}>Live Streams</div>
                <div style={{ fontSize:13, color:MT, marginTop:5 }}>Watch traders compete in real-time · Charts update every tick</div>
              </div>
              <Link href="/arena/creator" className="yn-btn yn-btn-ghost" style={{ fontSize:12 }}>
                <Radio size={11} /> Stream &amp; earn 12%
              </Link>
            </div>

            {/* Active stream */}
            {stream && (
              <div style={{ background:SU, border:`1px solid ${BO}`, borderLeft:`4px solid ${stream.c}`, borderRadius:10, overflow:'hidden', marginBottom:20, animation:'yn-in 0.2s ease' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 18px', borderBottom:`1px solid ${BO}`, background:RA }}>
                  <PulseDot c={RE} />
                  <span style={{ fontSize:14, fontWeight:900, color:TE }}>{stream.name}</span>
                  <span style={{ fontSize:12, color:DM, fontFamily:MONO }}>{stream.asset}</span>
                  <span style={{ fontSize:18, fontWeight:900, color:stream.pct >= 0 ? G : RE, fontFamily:MONO, marginLeft:'auto', transition:'color 0.3s' }}>
                    {stream.pct >= 0 ? '+' : ''}{stream.pct.toFixed(1)}%
                  </span>
                  <span style={{ fontSize:11, color:DM, display:'flex', alignItems:'center', gap:3 }}>
                    <Eye size={10} />{stream.viewers.toLocaleString()}
                  </span>
                  <button onClick={() => setStream(null)} className="yn-btn yn-btn-ghost" style={{ fontSize:11, padding:'4px 12px' }}>Close</button>
                </div>
                <div style={{ height:440 }}>
                  <TradingViewChart symbol={stream.asset} interval={stream.tf} hideSideToolbar={true} studies={[]} />
                </div>
              </div>
            )}

            {/* Stream grid */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(290px,1fr))', gap:14 }}>
              {STREAMS.map(s => (
                <div
                  key={s.name}
                  onClick={() => setStream(s)}
                  style={{
                    background:SU, border:`1px solid ${stream?.name === s.name ? s.c : BO}`,
                    borderLeft:`4px solid ${s.c}`, borderRadius:10, overflow:'hidden',
                    cursor:'pointer', transition:'all 0.15s',
                    boxShadow: stream?.name === s.name ? `0 0 0 1px ${s.c}40` : 'none',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLElement).style.boxShadow = `0 6px 24px ${s.c}25` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ''; (e.currentTarget as HTMLElement).style.boxShadow = stream?.name === s.name ? `0 0 0 1px ${s.c}40` : 'none' }}
                >
                  <div style={{ height:168, position:'relative' }}>
                    <TradingViewChart symbol={s.asset} interval={s.tf} hideSideToolbar={true} studies={[]} />
                    <div style={{ position:'absolute', top:8, left:8, display:'flex', alignItems:'center', gap:6, background:'rgba(4,5,8,0.85)', borderRadius:7, padding:'5px 9px', backdropFilter:'blur(8px)' }}>
                      <div style={{ width:22, height:22, borderRadius:5, background:`${s.c}22`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:900, color:s.c }}>{s.init}</div>
                      <span style={{ fontSize:12, fontWeight:700, color:TE }}>{s.name}</span>
                    </div>
                    <div style={{ position:'absolute', top:8, right:8 }}>
                      <LiveBadge />
                    </div>
                    <div style={{ position:'absolute', bottom:8, right:8, fontSize:16, fontWeight:900, color:s.pct >= 0 ? G : RE, fontFamily:MONO, background:'rgba(4,5,8,0.82)', borderRadius:6, padding:'4px 9px', transition:'color 0.3s' }}>
                      {s.pct >= 0 ? '+' : ''}{s.pct.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center', borderTop:`1px solid ${BO}` }}>
                    <span style={{ fontSize:11, color:DM, fontFamily:MONO }}>{s.asset} · {s.tf}m</span>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:10, color:DM, display:'flex', alignItems:'center', gap:3 }}><Eye size={9} />{s.viewers.toLocaleString()}</span>
                      <span style={{ fontSize:11, fontWeight:800, color:G }}>Watch →</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════
            TAB 3 — LEADERBOARD (all-time)
        ══════════════════════════════════════════════════ */}
        {tab === 'leaderboard' && (
          <div style={{ paddingTop:8, animation:'yn-in 0.25s ease' }}>
            {/* Stat cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(180px,1fr))', gap:12, marginBottom:40 }}>
              {([
                ['$47,320', 'Paid Out', GD, <DollarSign key="ds" size={12} />],
                ['3,847',   'Active Traders', G,  <Users key="us" size={12} />],
                ['2,156',   'Tournaments Run', PU, <Trophy key="tr" size={12} />],
                ['+912%',   'Biggest Return', BL, <TrendingUp key="tu" size={12} />],
              ] as [string, string, string, React.ReactNode][]).map(([v, l, c, icon]) => (
                <div key={l} style={{ background:SU, border:`1px solid ${BO}`, borderTop:`3px solid ${c}`, borderRadius:10, padding:'18px 18px' }}>
                  <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8 }}>
                    <span style={{ color:c }}>{icon}</span>
                    <span style={{ fontSize:9, color:DM, textTransform:'uppercase', letterSpacing:'0.12em' }}>{l}</span>
                  </div>
                  <div style={{ fontSize:28, fontWeight:900, color:c, fontFamily:MONO, letterSpacing:-0.5 }}>{v}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom:20 }}>
              <SectionLabel><Trophy size={10} /> All-Time Rankings</SectionLabel>
              <div style={{ fontSize:22, fontWeight:900, color:TE, letterSpacing:-0.5 }}>Hall of Champions</div>
            </div>

            <div style={{ background:SU, border:`1px solid ${BO}`, borderRadius:10, overflow:'hidden' }}>
              {/* Header row */}
              <div style={{ display:'grid', gridTemplateColumns:'40px 40px 1fr 90px 100px 70px', padding:'10px 18px', background:RA, borderBottom:`1px solid ${BO}` }}>
                {['', 'RANK', 'TRADER', 'WIN RATE', 'EARNED', 'STREAK'].map((h, i) => (
                  <div key={i} style={{ fontSize:9, fontWeight:700, color:DM, letterSpacing:'0.12em', textAlign: i > 2 ? 'right' : 'left' }}>{h}</div>
                ))}
              </div>

              {ALL_TIME.map((t, i) => (
                <div
                  key={t.name}
                  style={{
                    display:'grid', gridTemplateColumns:'40px 40px 1fr 90px 100px 70px',
                    padding:'13px 18px', borderBottom: i < ALL_TIME.length - 1 ? `1px solid ${BO}` : 'none',
                    background: i % 2 === 0 ? SU : RA,
                    borderLeft: `4px solid ${i === 0 ? GD : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : BO}`,
                    alignItems:'center', transition:'background 0.3s',
                  }}
                >
                  <div style={{ fontSize:18 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</div>
                  <div style={{ fontSize:11, fontWeight:700, color:i < 3 ? GD : DM, fontFamily:MONO }}>#{i+1}</div>

                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background:`${t.c}20`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:t.c, flexShrink:0, border:`1px solid ${t.c}25` }}>{t.init}</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:700, color:TE }}>{t.name}</div>
                      <div style={{ height:3, background:`${BO}`, borderRadius:2, width:64, overflow:'hidden', marginTop:4 }}>
                        <div style={{ width:`${t.wr}%`, height:'100%', background:t.c, borderRadius:2 }} />
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign:'right', fontSize:12, color:MT, fontFamily:MONO }}>{t.wr}%</div>
                  <div style={{ textAlign:'right', fontSize:18, fontWeight:900, color:GD, fontFamily:MONO, letterSpacing:-0.5 }}>${t.earned.toLocaleString()}</div>
                  <div style={{ textAlign:'right' }}>
                    {t.streak > 0
                      ? <span style={{ fontSize:13, color:'#f97316', fontWeight:900 }}>🔥 {t.streak}</span>
                      : <span style={{ fontSize:11, color:DM }}>—</span>
                    }
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ height:1, background:BO, margin:'52px 0 28px' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:24, height:24, borderRadius:6, background:G, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Trophy size={11} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize:13, fontWeight:900, color:TE }}>YN Arena</span>
          </div>
          <div style={{ display:'flex', gap:18, flexWrap:'wrap' }}>
            {([
              ['/arena/schedule','Schedule'],
              ['/arena/creator','Stream & Earn'],
              ['/arena/how-it-works','How It Works'],
              ['/courses','Courses'],
              ['/app','Terminal'],
              ['/privacy','Privacy'],
              ['/terms','Terms'],
            ] as [string, string][]).map(([h, l]) => (
              <Link key={l} href={h} style={{ fontSize:12, color:DM, textDecoration:'none', transition:'color 0.13s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = MT}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = DM}
              >{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:11, color:`${DM}` }}>Simulated trading · Real prizes · © 2026 YN Finance</div>
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
