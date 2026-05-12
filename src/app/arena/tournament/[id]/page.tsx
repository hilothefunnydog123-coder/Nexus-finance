'use client'

import { useState, useEffect, useRef, useCallback, useMemo, Suspense } from 'react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, Clock, Crown, Bot, ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Search, X } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'
import { INSTRUMENTS, INSTRUMENT_MAP, calcMargin, calcPnL, type InstrumentType } from '@/lib/instruments'
import GoLive from '@/components/arena/GoLive'

// ─── DESIGN TOKENS ───────────────────────────────────────────────────────────
const T = {
  bg: '#02030a', surface: '#070c16', raised: '#0c1428', border: '#0f1e38',
  green: '#00ffa3', gold: '#ffcc00', orange: '#ff7700', red: '#ff2244',
  blue: '#0088ff', purple: '#8855ff', text: '#e8eaf0', muted: '#7f93b5', dim: '#4a5e7a',
  silver: '#c0c0d0', bronze: '#cd7f32',
}

// Hot instruments (hardcoded popular ones)
const HOT_INSTRUMENTS = new Set(['NVDA', 'BTC/USD', 'ES'])

// ─── TYPES ───────────────────────────────────────────────────────────────────
interface Position {
  id: string; symbol: string; side: 'long'|'short'; quantity: number
  entryPrice: number; marginUsed: number; leverage: number; openedAt: string
}
interface ClosedTrade { pnl: number }
interface LeaderEntry {
  rank: number; name: string; init: string; pnlPct: number; color: string
  trades: number; isAI?: boolean; style?: string
}

// ─── AI TRADERS ──────────────────────────────────────────────────────────────
const AI_BASE: LeaderEntry[] = [
  { rank:0, name:'YN-ALPHA',   init:'Aα', pnlPct: 8.4,  color:T.green,  trades:12, isAI:true, style:'MOMENTUM'    },
  { rank:0, name:'YN-BETA',    init:'Bβ', pnlPct: 5.1,  color:T.blue,   trades:4,  isAI:true, style:'SWING'       },
  { rank:0, name:'YN-GAMMA',   init:'Γγ', pnlPct: 3.7,  color:T.purple, trades:8,  isAI:true, style:'CONTRARIAN'  },
  { rank:0, name:'YN-DELTA',   init:'Δδ', pnlPct:-1.2,  color:T.gold,   trades:6,  isAI:true, style:'TREND'       },
  { rank:0, name:'YN-EPSILON', init:'Εε', pnlPct:-4.8,  color:T.orange, trades:31, isAI:true, style:'SCALPER'     },
]
const HUMAN_BASE: LeaderEntry[] = [
  { rank:0, name:'Marcus T.',  init:'MT', pnlPct:14.2, color:T.red,    trades:9  },
  { rank:0, name:'Sarah K.',   init:'SK', pnlPct:11.8, color:T.green,  trades:7  },
  { rank:0, name:'Devon P.',   init:'DP', pnlPct: 9.3, color:T.blue,   trades:11 },
  { rank:0, name:'Jordan M.',  init:'JM', pnlPct: 6.1, color:T.gold,   trades:5  },
  { rank:0, name:'Aisha B.',   init:'AB', pnlPct: 2.8, color:T.orange, trades:14 },
  { rank:0, name:'Chris L.',   init:'CL', pnlPct:-2.4, color:T.purple, trades:3  },
  { rank:0, name:'Nina R.',    init:'NR', pnlPct:-6.7, color:T.red,    trades:8  },
]
const AI_TOASTS = [
  (n:string,s:string,sym:string) => `${n} opened ${s} on ${sym} — ${n==='YN-ALPHA'?'breakout confirmed':'clean setup'}`,
  (n:string,s:string,sym:string) => `${n} ${s==='LONG'?'buying':'shorting'} ${sym} · ${n==='YN-GAMMA'?'fade the move':'riding the trend'}`,
  (n:string,s:string,sym:string) => `${n} entered ${sym} ${s} · ${n==='YN-EPSILON'?'quick scalp':'position trade'}`,
]
const SYMBOLS_FOR_AI = ['AAPL','NVDA','TSLA','BTC/USD','EUR/USD','ES','SPY','ETH/USD']

// ─── COUNTDOWN ───────────────────────────────────────────────────────────────
function Countdown() {
  const end = useRef(Date.now() + 4*3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(()=>setMs(end.current-Date.now()),1000); return ()=>clearInterval(t) },[])
  const h=Math.floor(ms/3600000), m=Math.floor((ms%3600000)/60000), s=Math.floor((ms%60000)/1000)
  return <span style={{color:ms<3600000?T.red:T.orange,fontFamily:'monospace',fontWeight:900,letterSpacing:1}}>
    {String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}
  </span>
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
function TournamentRoomInner() {
  const params = useParams()
  const searchParams = useSearchParams()
  const id = (params?.id as string) || 'daily-blitz'
  const ENTRY_FEE = 5

  // Gate check
  const [access, setAccess] = useState<'checking'|'granted'|'denied'>('checking')
  useEffect(() => {
    const ok = searchParams?.get('entered') || localStorage.getItem(`yn_tournament_${id}`)
    if (ok) { localStorage.setItem(`yn_tournament_${id}`,'true'); setAccess('granted') }
    else setAccess('denied')
  }, [id, searchParams])

  // Chart state
  const [instType, setInstType] = useState<InstrumentType>('stock')
  const [symbol, setSymbol] = useState('AAPL')
  const [interval, setInterval] = useState('5')

  // Instrument search filter
  const [instSearch, setInstSearch] = useState('')

  // Order state
  const [side, setSide] = useState<'long'|'short'>('long')
  const [qty, setQty] = useState('1')
  const [lev, setLev] = useState(1)
  const [slVal, setSlVal] = useState('')
  const [tpVal, setTpVal] = useState('')
  const [msg, setMsg] = useState('')
  const [orderFlash, setOrderFlash] = useState(false)

  // Portfolio
  const [cash, setCash] = useState(10000)
  const [positions, setPositions] = useState<Position[]>([])
  const [closed, setClosed] = useState<ClosedTrade[]>([])
  const [prices, setPrices] = useState<Record<string,number>>(
    Object.fromEntries(INSTRUMENTS.map(i=>[i.symbol, i.mockBasePrice]))
  )

  // Leaderboard
  const [aiTraders, setAiTraders] = useState<LeaderEntry[]>(AI_BASE)
  const [tick, setTick] = useState(0)
  const [toast, setToast] = useState<string|null>(null)
  const [lbOpen, setLbOpen] = useState(true)
  // Track previous ranks to detect changes
  const prevRanksRef = useRef<Record<string,number>>({})
  const [flashRows, setFlashRows] = useState<Set<string>>(new Set())

  // Live prices
  useEffect(() => {
    const t = window.setInterval(() => {
      setPrices(p => {
        const n = {...p}
        Object.keys(n).forEach(sym => {
          const inst = INSTRUMENT_MAP[sym]; if(!inst) return
          const vol = inst.type==='forex'?0.00008:inst.type==='futures'?0.0002:0.0012
          n[sym] = +(n[sym]*(1+(Math.random()-0.495)*vol)).toFixed(inst.digits)
        })
        return n
      })
    }, 1200)
    return () => window.clearInterval(t)
  }, [])

  // AI drift (sine-wave, deterministic)
  useEffect(() => {
    if (access !== 'granted') return
    const drift = window.setInterval(() => {
      setTick(n => {
        const next = n+1
        setAiTraders(prev => prev.map((tr, i) => {
          const amp = 0.5 + (i*0.15)
          const freq = 0.2 + (i*0.07)
          const phase = i * 1.3
          return { ...tr, pnlPct: +(tr.pnlPct + amp*Math.sin(freq*next+phase)*0.3).toFixed(2) }
        }))
        return next
      })
    }, 3000)
    const toastTimer = window.setInterval(() => {
      const trader = AI_BASE[Math.floor(Math.random()*AI_BASE.length)]
      const side2 = Math.random()>0.5?'LONG':'SHORT'
      const sym2 = SYMBOLS_FOR_AI[Math.floor(Math.random()*SYMBOLS_FOR_AI.length)]
      const fn = AI_TOASTS[Math.floor(Math.random()*AI_TOASTS.length)]
      setToast(fn(trader.name, side2, sym2))
      window.setTimeout(() => setToast(null), 7000)
    }, 30000)
    return () => { window.clearInterval(drift); window.clearInterval(toastTimer) }
  }, [access])

  // P&L calcs
  const floatPnL = useMemo(() => positions.reduce((sum,pos) => {
    const inst = INSTRUMENT_MAP[pos.symbol]; if(!inst) return sum
    return sum + calcPnL(inst, pos.side, pos.entryPrice, prices[pos.symbol]||pos.entryPrice, pos.quantity)
  }, 0), [positions, prices])
  const realPnL = closed.reduce((s,t)=>s+t.pnl, 0)
  const totalPnL = floatPnL + realPnL
  const equity = cash + positions.reduce((s,p)=>s+p.marginUsed,0) + floatPnL
  const pnlPct = ((equity-10000)/10000)*100

  // Leaderboard
  const userEntry: LeaderEntry = { rank:0, name:'You', init:'★', pnlPct:+pnlPct.toFixed(2), color:T.green, trades:closed.length+positions.length }
  const combined = [...HUMAN_BASE, ...aiTraders, userEntry]
    .sort((a,b)=>b.pnlPct-a.pnlPct).map((e,i)=>({...e,rank:i+1}))
  const userRank = combined.find(e=>e.name==='You')?.rank||0
  const inTop10 = userRank<=10
  const projPayout = inTop10 ? +(ENTRY_FEE*(1+Math.abs(pnlPct)/100)).toFixed(2) : 0

  // Count AI traders user is beating
  const aiTradersBeat = combined.filter(e => e.isAI && e.rank > userRank).length

  // Detect rank changes and flash rows
  useEffect(() => {
    const newFlash = new Set<string>()
    combined.forEach(e => {
      const prev = prevRanksRef.current[e.name]
      if (prev !== undefined && e.rank < prev) {
        newFlash.add(e.name)
      }
    })
    if (newFlash.size > 0) {
      setFlashRows(newFlash)
      window.setTimeout(() => setFlashRows(new Set()), 1200)
    }
    const rankMap: Record<string,number> = {}
    combined.forEach(e => { rankMap[e.name] = e.rank })
    prevRanksRef.current = rankMap
  }, [tick])

  // Order actions
  const placeOrder = useCallback(() => {
    const inst = INSTRUMENT_MAP[symbol]; if(!inst) return
    const price = prices[symbol]||inst.mockBasePrice
    const q = parseFloat(qty); if(!q||q<=0){setMsg('Invalid qty');return}
    const margin = calcMargin(inst,price,q,lev)
    if(margin>cash){setMsg(`Need $${margin.toFixed(2)}`);return}
    setPositions(p=>[...p,{id:crypto.randomUUID(),symbol,side,quantity:q,entryPrice:price,marginUsed:margin,leverage:lev,openedAt:new Date().toISOString()}])
    setCash(c=>c-margin)
    setMsg(`${side.toUpperCase()} ${q} ${symbol} @ $${price}`)
    // Flash button green
    setOrderFlash(true)
    window.setTimeout(()=>setOrderFlash(false), 500)
    setTimeout(()=>setMsg(''),3000)
  }, [symbol,side,qty,lev,cash,prices])

  const closePos = useCallback((posId:string) => {
    const pos = positions.find(p=>p.id===posId); if(!pos) return
    const inst = INSTRUMENT_MAP[pos.symbol]; if(!inst) return
    const exit = prices[pos.symbol]||pos.entryPrice
    const pnl = calcPnL(inst,pos.side,pos.entryPrice,exit,pos.quantity)
    setPositions(p=>p.filter(x=>x.id!==posId))
    setCash(c=>c+pos.marginUsed+pnl)
    setClosed(c=>[{pnl},...c])
    setMsg(`Closed ${pnl>=0?'+':''}$${pnl.toFixed(2)}`)
    setTimeout(()=>setMsg(''),2500)
  }, [positions,prices])

  const closeAllPositions = useCallback(() => {
    let cashBack = 0
    const newClosed: ClosedTrade[] = []
    positions.forEach(pos => {
      const inst = INSTRUMENT_MAP[pos.symbol]; if(!inst) return
      const exit = prices[pos.symbol]||pos.entryPrice
      const pnl = calcPnL(inst,pos.side,pos.entryPrice,exit,pos.quantity)
      cashBack += pos.marginUsed + pnl
      newClosed.push({pnl})
    })
    setPositions([])
    setCash(c=>c+cashBack)
    setClosed(c=>[...newClosed,...c])
    setMsg(`Closed all — ${newClosed.reduce((s,t)=>s+t.pnl,0)>=0?'+':''}$${newClosed.reduce((s,t)=>s+t.pnl,0).toFixed(2)}`)
    setTimeout(()=>setMsg(''),3000)
  }, [positions,prices])

  // ── ACCESS DENIED ──
  if(access==='checking') return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{width:28,height:28,border:`2px solid ${T.green}`,borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if(access==='denied') return (
    <div style={{background:T.bg,minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:20,padding:24,fontFamily:'Inter,system-ui,sans-serif'}}>
      <Trophy size={52} color={T.gold} />
      <div style={{fontSize:26,fontWeight:900,color:T.text,textAlign:'center'}}>Entry required to access the tournament room</div>
      <div style={{fontSize:14,color:T.dim,textAlign:'center',maxWidth:400,lineHeight:1.7}}>Pay the entry fee to compete. Top 10 finishers get their entry multiplied by their P&L%. Not top 10 — the house keeps it.</div>
      <Link href="/arena" style={{background:`linear-gradient(135deg,${T.green},#00cc80)`,color:T.bg,fontWeight:900,textDecoration:'none',padding:'14px 32px',borderRadius:12,fontSize:16}}>
        ← Back to Arena
      </Link>
    </div>
  )

  const instList = INSTRUMENTS.filter(i=>i.type===instType && (instSearch==='' || i.symbol.toLowerCase().includes(instSearch.toLowerCase())))
  const currentInst = INSTRUMENT_MAP[symbol]
  const currentPrice = prices[symbol]||(currentInst?.mockBasePrice??0)
  const marginReq = currentInst ? calcMargin(currentInst,currentPrice,parseFloat(qty)||0,lev) : 0
  const isMarginExceeded = marginReq > cash && marginReq > 0

  // Risk calculator values
  const entryNum = currentPrice
  const slNum = parseFloat(slVal) || 0
  const tpNum = parseFloat(tpVal) || 0
  const qtyNum = parseFloat(qty) || 0
  const riskVal = slNum > 0 ? Math.abs(entryNum - slNum) * qtyNum : null
  const rewardVal = tpNum > 0 ? Math.abs(tpNum - entryNum) * qtyNum : null
  const rrRatio = riskVal && rewardVal && riskVal > 0 ? (rewardVal / riskVal) : null

  // Rank color helper
  function rankColor(rank: number): string {
    if (rank === 1) return T.gold
    if (rank === 2) return T.silver
    if (rank === 3) return T.bronze
    if (rank <= 10) return T.text
    return T.dim
  }

  return (
    <div style={{background:T.bg,height:'100vh',display:'flex',flexDirection:'column',overflow:'hidden',color:T.text,fontFamily:'Inter,system-ui,sans-serif'}}>
      <style>{`
        @keyframes yn-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes yn-slide{from{opacity:0;transform:translateX(48px)}to{opacity:1;transform:translateX(0)}}
        @keyframes yn-pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        @keyframes yn-gold{0%,100%{box-shadow:0 0 6px ${T.gold}40,0 0 12px ${T.gold}20}50%{box-shadow:0 0 14px ${T.gold}90,0 0 28px ${T.gold}50}}
        @keyframes yn-rank-up{0%{background:${T.green}30}100%{background:transparent}}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:3px}
      `}</style>

      {/* AI Toast */}
      {toast && (
        <div style={{position:'fixed',bottom:20,right:20,zIndex:9999,background:`linear-gradient(135deg,${T.purple}22,${T.purple}44)`,border:`1px solid ${T.purple}60`,borderLeft:`3px solid ${T.purple}`,borderRadius:10,padding:'12px 18px',maxWidth:320,boxShadow:`0 8px 32px rgba(136,85,255,0.35)`,animation:'yn-slide 0.35s ease',backdropFilter:'blur(8px)'}}>
          <div style={{fontSize:9,color:T.purple,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.14em',marginBottom:4,display:'flex',alignItems:'center',gap:5}}>
            <Bot size={9} color={T.purple} /> AI TRADE ALERT
          </div>
          <div style={{fontSize:12,fontWeight:700,color:T.text}}>{toast}</div>
        </div>
      )}

      {/* ── HEADER (40px) ── */}
      <div style={{height:40,flexShrink:0,background:T.surface,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:12,padding:'0 14px',overflow:'hidden'}}>
        <Link href="/arena" style={{textDecoration:'none',display:'flex',alignItems:'center',gap:5,color:T.dim,fontSize:11,flexShrink:0}}>
          <Trophy size={11} color={T.gold} /> Arena
        </Link>
        <span style={{color:'#1e3a5f',fontSize:11}}>›</span>
        <span style={{fontSize:12,fontWeight:800,color:T.text,flexShrink:0}}>Daily Blitz</span>
        <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,flexShrink:0}}>
          <Clock size={10} color={T.orange} /> <Countdown />
        </div>
        <div style={{flex:1}} />

        {/* ── Equity box ── */}
        <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 10px 0 10px',textAlign:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
          <div style={{fontSize:8,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>Equity</div>
          <div style={{fontSize:12,fontWeight:900,color:T.text,fontFamily:'monospace'}}>${equity.toFixed(0)}</div>
          <div style={{height:2,background:T.text,opacity:0.25,borderRadius:1,marginTop:2}} />
        </div>

        {/* ── P&L box ── */}
        <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 10px 0 10px',textAlign:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
          <div style={{fontSize:8,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>P&amp;L</div>
          <div style={{fontSize:12,fontWeight:900,color:pnlPct>=0?T.green:T.red,fontFamily:'monospace'}}>{pnlPct>=0?'+':''}{pnlPct.toFixed(2)}%</div>
          <div style={{height:2,background:pnlPct>=0?T.green:T.red,borderRadius:1,marginTop:2}} />
        </div>

        {/* ── Rank box ── */}
        <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:6,padding:'3px 10px 0 10px',textAlign:'center',flexShrink:0,position:'relative',overflow:'hidden'}}>
          <div style={{fontSize:8,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>Rank</div>
          <div style={{fontSize:12,fontWeight:900,color:rankColor(userRank),fontFamily:'monospace'}}>
            {userRank===1?'🥇':userRank===2?'🥈':userRank===3?'🥉':''}#{userRank}/{combined.length}
          </div>
          <div style={{height:2,background:rankColor(userRank),borderRadius:1,marginTop:2}} />
        </div>

        {/* ── Payout box — gold glow when top10 + positive ── */}
        <div style={{
          background:T.raised,
          border: inTop10&&pnlPct>0 ? `1px solid ${T.gold}80` : `1px solid ${T.border}`,
          borderRadius:6,
          padding:'3px 10px 0 10px',
          textAlign:'center',
          flexShrink:0,
          position:'relative',
          overflow:'hidden',
          animation: inTop10&&pnlPct>0 ? 'yn-gold 2.5s ease-in-out infinite' : 'none',
        }}>
          <div style={{fontSize:8,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em'}}>Payout</div>
          <div style={{fontSize:12,fontWeight:900,color:projPayout>0?T.gold:T.dim,fontFamily:'monospace'}}>{projPayout>0?`$${projPayout}`:'—'}</div>
          <div style={{height:2,background:projPayout>0?T.gold:T.dim,opacity:0.4,borderRadius:1,marginTop:2}} />
        </div>

        {inTop10&&pnlPct>0&&(
          <div style={{background:`${T.gold}15`,border:`1px solid ${T.gold}40`,borderRadius:6,padding:'3px 10px',fontSize:10,color:T.gold,fontWeight:700,flexShrink:0}}>
            ×{(1+pnlPct/100).toFixed(3)} multiplier
          </div>
        )}
        <GoLive traderName="You" pnlPct={pnlPct} rank={userRank} symbol={symbol} />
      </div>

      {/* ── MAIN ── */}
      <div style={{flex:1,display:'flex',minHeight:0,overflow:'hidden'}}>

        {/* ── INSTRUMENT SIDEBAR (180px) ── */}
        <div style={{width:180,flexShrink:0,background:T.surface,borderRight:`1px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          {/* Type tabs */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',borderBottom:`1px solid ${T.border}`,flexShrink:0}}>
            {(['stock','forex','futures','crypto'] as InstrumentType[]).map(t=>(
              <button key={t} onClick={()=>{setInstType(t);setInstSearch('');const f=INSTRUMENTS.find(i=>i.type===t);if(f)setSymbol(f.symbol)}}
                style={{padding:'7px 4px',border:'none',borderBottom:`2px solid ${instType===t?(t==='futures'?T.gold:T.green):'transparent'}`,background:instType===t?T.raised:'transparent',fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'0.06em',color:instType===t?(t==='futures'?T.gold:T.green):T.dim,cursor:'pointer',transition:'all 0.15s'}}>
                {t==='futures'?'FUT':t==='crypto'?'CRY':t==='forex'?'FX':'STK'}
              </button>
            ))}
          </div>

          {/* Search input */}
          <div style={{padding:'6px 8px',borderBottom:`1px solid ${T.border}`,flexShrink:0,display:'flex',alignItems:'center',gap:5,background:T.raised}}>
            <Search size={10} color={T.dim} style={{flexShrink:0}} />
            <input
              value={instSearch}
              onChange={e=>setInstSearch(e.target.value)}
              placeholder="Search..."
              style={{
                flex:1, background:'transparent', border:'none', outline:'none',
                color:T.text, fontSize:10, fontFamily:'Inter,system-ui,sans-serif',
              }}
            />
            {instSearch&&<button onClick={()=>setInstSearch('')} style={{background:'none',border:'none',cursor:'pointer',padding:0,display:'flex',alignItems:'center'}}><X size={9} color={T.dim} /></button>}
          </div>

          {/* Symbol list */}
          <div style={{flex:1,overflowY:'auto'}}>
            {/* Sticky group header */}
            <div style={{
              position:'sticky', top:0, zIndex:2,
              padding:'4px 10px',
              background:`linear-gradient(135deg,${T.raised},${T.surface})`,
              borderBottom:`1px solid ${T.border}`,
              fontSize:8, fontWeight:900, color:T.muted,
              textTransform:'uppercase', letterSpacing:'0.14em',
              display:'flex', alignItems:'center', gap:5,
            }}>
              <span style={{
                display:'inline-block', width:3, height:10, borderRadius:2,
                background: instType==='futures'?T.gold:instType==='crypto'?T.purple:instType==='forex'?T.blue:T.green,
                marginRight:2,
              }} />
              {instType==='futures'?'FUTURES':instType==='crypto'?'CRYPTO':instType==='forex'?'FOREX':'STOCKS'}
            </div>

            {instList.map(inst=>{
              const p=prices[inst.symbol]||inst.mockBasePrice
              const pct=((p-inst.mockBasePrice)/inst.mockBasePrice)*100
              const isHot = HOT_INSTRUMENTS.has(inst.symbol)
              return (
                <div key={inst.symbol} onClick={()=>setSymbol(inst.symbol)}
                  style={{padding:'7px 10px',borderBottom:`1px solid ${T.border}`,cursor:'pointer',background:symbol===inst.symbol?T.raised:'transparent',borderLeft:`2px solid ${symbol===inst.symbol?T.green:'transparent'}`,transition:'all 0.12s'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:11,fontWeight:700,color:symbol===inst.symbol?T.text:T.muted}}>{inst.symbol}</span>
                      {isHot&&<span style={{fontSize:7,fontWeight:800,color:'#ff6600',background:'#ff660018',border:'1px solid #ff660040',borderRadius:4,padding:'1px 4px',letterSpacing:'0.06em'}}>🔥</span>}
                    </div>
                    <span style={{fontSize:10,fontWeight:700,color:pct>=0?T.green:T.red,fontFamily:'monospace'}}>{pct>=0?'+':''}{pct.toFixed(1)}%</span>
                  </div>
                  <div style={{fontSize:9,color:T.dim,fontFamily:'monospace',marginTop:1}}>${p.toFixed(inst.digits>3?4:2)}</div>
                </div>
              )
            })}
            {instList.length===0&&(
              <div style={{padding:'20px 10px',fontSize:10,color:T.dim,textAlign:'center'}}>No results</div>
            )}
          </div>
        </div>

        {/* ── CHART AREA ── */}
        <div style={{flex:1,display:'flex',flexDirection:'column',minWidth:0,overflow:'hidden'}}>
          {/* Interval bar */}
          <div style={{height:32,flexShrink:0,background:T.surface,borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:4,padding:'0 10px',overflowX:'auto'}}>
            <span style={{fontSize:12,fontWeight:800,color:T.text,marginRight:8,whiteSpace:'nowrap'}}>{symbol}</span>
            <span style={{fontSize:12,color:T.muted,fontFamily:'monospace',marginRight:8}}>${currentPrice.toFixed(currentInst?.digits??2)}</span>
            {[['1','1m'],['5','5m'],['15','15m'],['60','1h'],['240','4h'],['D','1D']].map(([v,l])=>(
              <button key={v} onClick={()=>setInterval(v)}
                style={{padding:'3px 8px',border:'none',borderRadius:4,background:interval===v?`${T.blue}22`:'transparent',color:interval===v?T.blue:T.dim,fontSize:10,cursor:'pointer',flexShrink:0}}>
                {l}
              </button>
            ))}
          </div>
          {/* Chart */}
          <div style={{flex:1,minHeight:0}}>
            <TradingViewChart symbol={symbol} interval={interval} hideSideToolbar={false} />
          </div>
          {/* Positions */}
          <div style={{height:130,flexShrink:0,background:T.surface,borderTop:`1px solid ${T.border}`,overflowY:'auto'}}>
            <div style={{padding:'5px 12px',borderBottom:`1px solid ${T.border}`,display:'flex',alignItems:'center',gap:8,background:T.raised}}>
              <span style={{fontSize:10,fontWeight:800,color:T.muted,textTransform:'uppercase',letterSpacing:'0.08em'}}>Positions</span>
              <span style={{fontSize:10,color:T.dim}}>{positions.length} open</span>
              <span style={{marginLeft:'auto',fontSize:11,fontWeight:900,color:floatPnL>=0?T.green:T.red,fontFamily:'monospace'}}>{floatPnL>=0?'+':''}${floatPnL.toFixed(2)}</span>
              {positions.length>1&&(
                <button onClick={closeAllPositions} style={{fontSize:9,fontWeight:700,color:T.orange,background:`${T.orange}15`,border:`1px solid ${T.orange}30`,borderRadius:5,padding:'2px 8px',cursor:'pointer',marginLeft:4}}>Close All</button>
              )}
            </div>
            {positions.length===0
              ? <div style={{padding:'20px',fontSize:11,color:T.dim,textAlign:'center'}}>No open positions</div>
              : positions.map(pos=>{
                  const inst=INSTRUMENT_MAP[pos.symbol]
                  const price=prices[pos.symbol]||pos.entryPrice
                  const pnl=inst?calcPnL(inst,pos.side,pos.entryPrice,price,pos.quantity):0
                  // Mini P&L bar: pnl as % of margin used, capped at ±100%
                  const pnlBarPct = pos.marginUsed > 0 ? Math.max(-100, Math.min(100, (pnl/pos.marginUsed)*100)) : 0
                  const pnlBarWidth = Math.abs(pnlBarPct)
                  return (
                    <div key={pos.id} style={{borderBottom:`1px solid ${T.border}`}}>
                      <div style={{display:'grid',gridTemplateColumns:'70px 44px 56px 80px 80px 72px 50px 1fr',padding:'5px 12px 2px 12px',fontSize:10,alignItems:'center'}}>
                        <span style={{fontWeight:700,color:T.text}}>{pos.symbol}</span>
                        <span style={{color:pos.side==='long'?T.green:T.red,fontWeight:700}}>{pos.side.toUpperCase()}</span>
                        <span style={{color:T.muted,fontFamily:'monospace'}}>{pos.quantity}</span>
                        <span style={{color:T.dim,fontFamily:'monospace'}}>${pos.entryPrice.toFixed(inst?.digits??2)}</span>
                        <span style={{color:T.text,fontFamily:'monospace'}}>${price.toFixed(inst?.digits??2)}</span>
                        <span style={{color:pnl>=0?T.green:T.red,fontFamily:'monospace',fontWeight:700}}>{pnl>=0?'+':''}${pnl.toFixed(2)}</span>
                        <span style={{color:T.dim}}>×{pos.leverage}</span>
                        <button onClick={()=>closePos(pos.id)} style={{fontSize:9,color:T.red,background:`${T.red}15`,border:`1px solid ${T.red}30`,borderRadius:4,padding:'2px 7px',cursor:'pointer'}}>Close</button>
                      </div>
                      {/* Mini P&L bar */}
                      <div style={{margin:'0 12px 4px 12px',height:3,background:T.raised,borderRadius:2,overflow:'hidden',position:'relative'}}>
                        <div style={{
                          position:'absolute',
                          height:'100%',
                          width:`${pnlBarWidth}%`,
                          left: pnlBarPct >= 0 ? '50%' : `${50-pnlBarWidth}%`,
                          background: pnl >= 0 ? T.green : T.red,
                          borderRadius:2,
                          transition:'width 0.6s ease, left 0.6s ease',
                          opacity:0.85,
                        }} />
                        {/* Center tick */}
                        <div style={{position:'absolute',left:'50%',top:0,width:1,height:'100%',background:T.dim,transform:'translateX(-50%)'}} />
                      </div>
                    </div>
                  )
                })
            }
          </div>
        </div>

        {/* ── ORDER PANEL (200px) ── */}
        <div style={{width:200,flexShrink:0,background:T.surface,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 12px',borderBottom:`1px solid ${T.border}`,background:T.raised,flexShrink:0}}>
            <div style={{fontSize:12,fontWeight:900,color:T.text}}>{symbol}</div>
            <div style={{fontSize:20,fontWeight:900,color:T.text,fontFamily:'monospace'}}>${currentPrice.toFixed(currentInst?.digits??2)}</div>
            <div style={{fontSize:10,color:T.dim}}>Cash: <span style={{color:T.green,fontFamily:'monospace',fontWeight:700}}>${cash.toFixed(0)}</span></div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'10px 12px',display:'flex',flexDirection:'column',gap:8}}>
            {/* Long/Short */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:4}}>
              {(['long','short'] as const).map(s=>(
                <button key={s} onClick={()=>setSide(s)}
                  style={{padding:'8px 4px',border:'none',borderRadius:8,fontSize:11,fontWeight:800,cursor:'pointer',transition:'all 0.12s',background:side===s?(s==='long'?`${T.green}20`:`${T.red}20`):`${T.raised}`,color:side===s?(s==='long'?T.green:T.red):T.dim,outline:side===s?`1px solid ${s==='long'?T.green:T.red}40`:'none'}}>
                  {s==='long'?'▲ LONG':'▼ SHORT'}
                </button>
              ))}
            </div>
            {/* Qty */}
            <div>
              <div style={{fontSize:9,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>
                {currentInst?.type==='forex'?'Lots':currentInst?.type==='futures'?'Contracts':'Shares'}
              </div>
              <input value={qty} onChange={e=>setQty(e.target.value)} type="number"
                style={{width:'100%',background:T.raised,border:`1px solid ${T.border}`,borderRadius:7,padding:'8px 10px',color:T.text,fontSize:13,fontFamily:'monospace',outline:'none',boxSizing:'border-box'}}
                onFocus={e=>(e.currentTarget.style.borderColor=T.green)} onBlur={e=>(e.currentTarget.style.borderColor=T.border)} />
            </div>
            {/* Quick qty */}
            <div style={{display:'flex',gap:3}}>
              {(currentInst?.type==='forex'?['0.01','0.1','1','2']:['1','5','10','25']).map(v=>(
                <button key={v} onClick={()=>setQty(v)} style={{flex:1,padding:'4px 2px',background:qty===v?T.raised:'transparent',border:'none',borderRadius:4,fontSize:9,color:qty===v?T.text:T.dim,cursor:'pointer'}}>{v}</button>
              ))}
            </div>
            {/* Leverage */}
            {currentInst&&currentInst.leverage.length>1&&(
              <div>
                <div style={{fontSize:9,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>Leverage</div>
                <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                  {currentInst.leverage.map(v=>(
                    <button key={v} onClick={()=>setLev(v)} style={{padding:'3px 7px',background:lev===v?`${T.blue}20`:'transparent',border:lev===v?`1px solid ${T.blue}40`:`1px solid ${T.border}`,borderRadius:5,fontSize:9,color:lev===v?T.blue:T.dim,cursor:'pointer'}}>×{v}</button>
                  ))}
                </div>
              </div>
            )}
            {/* SL / TP */}
            {(['Stop Loss','Take Profit'] as const).map((label,i)=>(
              <div key={label}>
                <div style={{fontSize:9,color:T.dim,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{label}</div>
                <input value={i===0?slVal:tpVal} onChange={e=>i===0?setSlVal(e.target.value):setTpVal(e.target.value)} type="number" placeholder="Optional"
                  style={{width:'100%',background:T.raised,border:`1px solid ${i===0?T.red+'30':T.green+'30'}`,borderRadius:7,padding:'7px 10px',color:i===0?T.red:T.green,fontSize:11,fontFamily:'monospace',outline:'none',boxSizing:'border-box'}} />
              </div>
            ))}
            {/* Margin preview */}
            {marginReq>0&&(
              <div style={{background:T.raised,borderRadius:7,padding:'7px 10px'}}>
                <div style={{fontSize:9,color:T.dim,marginBottom:3}}>Margin Required</div>
                <div style={{fontSize:14,fontWeight:900,color:isMarginExceeded?T.red:T.text,fontFamily:'monospace'}}>${marginReq.toFixed(2)}</div>
                {isMarginExceeded&&<div style={{fontSize:9,color:T.red,marginTop:2}}>Insufficient cash</div>}
              </div>
            )}
            {msg&&<div style={{fontSize:10,color:msg.includes('Need')?T.red:T.green,background:msg.includes('Need')?`${T.red}10`:`${T.green}10`,border:`1px solid ${msg.includes('Need')?T.red:T.green}30`,borderRadius:7,padding:'7px 10px',fontFamily:'monospace'}}>{msg}</div>}

            {/* Place order button — disabled if margin exceeded */}
            <button
              onClick={isMarginExceeded ? undefined : placeOrder}
              disabled={isMarginExceeded}
              style={{
                width:'100%',padding:'12px',
                background: orderFlash
                  ? `linear-gradient(135deg,${T.green},#00ee80)`
                  : isMarginExceeded
                    ? `${T.dim}40`
                    : `linear-gradient(135deg,${side==='long'?T.green+',#00cc80':T.red+',#cc2233'})`,
                color: isMarginExceeded ? T.dim : T.bg,
                border:'none',borderRadius:9,fontSize:13,fontWeight:900,
                cursor:isMarginExceeded?'not-allowed':'pointer',
                letterSpacing:0.5,
                transition:'background 0.15s',
                opacity: isMarginExceeded ? 0.5 : 1,
              }}>
              {isMarginExceeded ? '✗ Insufficient Margin' : (side==='long'?'▲ BUY':'▼ SELL')+' '+symbol}
            </button>

            {/* Risk Calculator */}
            {(slNum > 0 || tpNum > 0) && qtyNum > 0 && (
              <div style={{background:T.raised,border:`1px solid ${T.border}`,borderRadius:8,padding:'8px 10px'}}>
                <div style={{fontSize:9,fontWeight:800,color:T.muted,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:6}}>Risk Calculator</div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {riskVal !== null && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:9,color:T.dim}}>Risk</span>
                      <span style={{fontSize:11,fontWeight:700,color:T.red,fontFamily:'monospace'}}>${riskVal.toFixed(2)}</span>
                    </div>
                  )}
                  {rewardVal !== null && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                      <span style={{fontSize:9,color:T.dim}}>Reward</span>
                      <span style={{fontSize:11,fontWeight:700,color:T.green,fontFamily:'monospace'}}>${rewardVal.toFixed(2)}</span>
                    </div>
                  )}
                  {rrRatio !== null && (
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',borderTop:`1px solid ${T.border}`,paddingTop:4,marginTop:2}}>
                      <span style={{fontSize:9,color:T.dim}}>R:R Ratio</span>
                      <span style={{fontSize:12,fontWeight:900,color:rrRatio>=2?T.green:rrRatio>=1?T.orange:T.red,fontFamily:'monospace'}}>1:{rrRatio.toFixed(2)}</span>
                    </div>
                  )}
                  {(riskVal === null && rewardVal === null) && (
                    <div style={{fontSize:9,color:T.dim}}>Enter SL and/or TP to calculate</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── LEADERBOARD (220px, collapsible) ── */}
        <div style={{width:lbOpen?220:32,flexShrink:0,background:T.surface,borderLeft:`1px solid ${T.border}`,display:'flex',flexDirection:'column',transition:'width 0.2s',overflow:'hidden'}}>
          <button onClick={()=>setLbOpen(o=>!o)} style={{height:36,background:'none',border:'none',borderBottom:`1px solid ${T.border}`,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6,color:T.dim,flexShrink:0,width:'100%'}}>
            {lbOpen?<><Crown size={11} color={T.gold}/><span style={{fontSize:10,fontWeight:800,color:T.gold}}>RANKINGS</span><ChevronRight size={10} color={T.dim}/></>:<Crown size={12} color={T.gold}/>}
          </button>
          {lbOpen&&(
            <div style={{flex:1,overflowY:'auto',display:'flex',flexDirection:'column'}}>
              <div style={{flex:1}}>
                {combined.map((e,i)=>{
                  const isFlashing = flashRows.has(e.name)
                  const leftBorderColor = e.color
                  return (
                    <div key={e.name} style={{
                      display:'flex',alignItems:'center',gap:7,
                      padding:'7px 10px',
                      borderBottom:`1px solid ${T.border}`,
                      borderLeft:`3px solid ${leftBorderColor}`,
                      background: isFlashing
                        ? `${T.green}25`
                        : e.name==='You'
                          ? `${T.green}10`
                          : i<3
                            ? `${e.color}08`
                            : 'transparent',
                      transition:'background 0.5s',
                      animation: isFlashing ? 'yn-rank-up 1.2s ease' : 'none',
                    }}>
                      <div style={{fontSize:10,fontWeight:800,color:rankColor(i+1),fontFamily:'monospace',width:16,flexShrink:0}}>{i+1}</div>
                      <div style={{width:24,height:24,borderRadius:6,background:`${e.color}22`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900,color:e.color,flexShrink:0}}>
                        {e.isAI?<Bot size={11} color={e.color}/>:e.init}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:10,fontWeight:700,color:e.name==='You'?T.green:T.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                          {e.name==='You'?'★ You':e.name}
                        </div>
                        {e.isAI&&<div style={{fontSize:7,color:T.purple}}>{e.style}</div>}
                      </div>
                      <div style={{fontSize:11,fontWeight:900,color:e.pnlPct>=0?T.green:T.red,fontFamily:'monospace',flexShrink:0}}>
                        {e.pnlPct>=0?'+':''}{e.pnlPct.toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
              {/* "You are beating X AI traders" footer */}
              {aiTradersBeat > 0 && (
                <div style={{
                  flexShrink:0,
                  padding:'8px 10px',
                  borderTop:`1px solid ${T.border}`,
                  background:`${T.green}08`,
                  fontSize:10,
                  color:T.green,
                  fontWeight:700,
                  textAlign:'center',
                  lineHeight:1.4,
                }}>
                  You are beating {aiTradersBeat} AI trader{aiTradersBeat>1?'s':''}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}


export default function TournamentRoom() {
  return (
    <Suspense>
      <TournamentRoomInner />
    </Suspense>
  )
}
