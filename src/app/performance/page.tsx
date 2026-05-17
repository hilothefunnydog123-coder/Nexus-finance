'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })

type Call = {
  id: string; ticker: string; analyzed_at: string; rating: string
  price_at_analysis: number; price_target: number; stop_loss: number
  take_profit_1: number; confidence: number
  current_price: number | null; return_pct: number | null
  hit_tp1: boolean; hit_stop: boolean
}
type Stats = { total: number; winRate: number; avgReturn: number; withData: number }

const RATING_CLR: Record<string,string> = {
  'Strong Buy':'#00ff88','Buy':'#00c896','Hold':'#f59e0b','Sell':'#f97316','Strong Sell':'#ff2d78',
}

// ── TICKER TAPE ──────────────────────────────────────────────────────────────
function TickerTape({ calls }: { calls: Call[] }) {
  if (!calls.length) return null
  const items = [...calls, ...calls]
  return (
    <div style={{ overflow:'hidden', height:36, background:'rgba(0,20,10,.95)', borderTop:'1px solid #00ff8815', borderBottom:'1px solid #00ff8815', position:'relative' }}>
      <div style={{ display:'inline-flex', animation:'tape 40s linear infinite', whiteSpace:'nowrap', height:'100%', alignItems:'center' }}>
        {items.map((c, i) => {
          const ret   = c.return_pct
          const clr   = ret === null ? '#4a7a6a' : ret > 0 ? '#00ff88' : '#ff2d78'
          const isBull= ['Strong Buy','Buy'].includes(c.rating)
          const win   = ret !== null && (isBull ? ret > 0 : ret < 0)
          return (
            <span key={i} style={{ padding:'0 24px', fontSize:11, fontWeight:700, fontFamily:'monospace', color: clr, letterSpacing:'.5px' }}>
              {c.ticker} {c.rating.toUpperCase()} {ret !== null ? `${ret > 0 ? '+' : ''}${ret}%` : '...'} {win ? '✓' : ret !== null ? '✗' : ''}
              <span style={{ opacity:.2, marginLeft:16 }}>│</span>
            </span>
          )
        })}
      </div>
    </div>
  )
}

// ── RETURN SPARKLINE ─────────────────────────────────────────────────────────
function Sparkline({ calls }: { calls: Call[] }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    const W = c.width = c.offsetWidth * 2, H = c.height = 80
    ctx.scale(2, 1)
    const w = c.offsetWidth
    const pts = calls.filter(x => x.return_pct !== null).map(x => x.return_pct!).slice(-20)
    if (pts.length < 2) { ctx.fillStyle='#1a4a2a'; ctx.font='10px monospace'; ctx.fillText('No data yet',10,44); return }
    const min = Math.min(...pts, 0) - 2, max = Math.max(...pts, 0) + 2
    const toX = (i: number) => 8 + (i / (pts.length - 1)) * (w - 16)
    const toY = (v: number) => 72 - ((v - min) / (max - min)) * 64
    // Zero line
    ctx.strokeStyle = '#00ff8820'; ctx.lineWidth = 1; ctx.setLineDash([3,4])
    ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(w, toY(0)); ctx.stroke()
    ctx.setLineDash([])
    // Area fill
    const grad = ctx.createLinearGradient(0, 0, 0, H)
    grad.addColorStop(0, '#00ff8830'); grad.addColorStop(1, '#00ff8802')
    ctx.beginPath(); ctx.moveTo(toX(0), toY(pts[0]))
    pts.forEach((v,i) => ctx.lineTo(toX(i), toY(v)))
    ctx.lineTo(toX(pts.length-1), H); ctx.lineTo(toX(0), H); ctx.closePath()
    ctx.fillStyle = grad; ctx.fill()
    // Line
    ctx.beginPath(); ctx.moveTo(toX(0), toY(pts[0]))
    pts.forEach((v,i) => ctx.lineTo(toX(i), toY(v)))
    ctx.strokeStyle = '#00ff88'; ctx.lineWidth = 2; ctx.shadowBlur = 8; ctx.shadowColor = '#00ff88'
    ctx.stroke(); ctx.shadowBlur = 0
    // Tip dot
    ctx.beginPath(); ctx.arc(toX(pts.length-1), toY(pts.at(-1)!), 5, 0, Math.PI*2)
    ctx.fillStyle = '#00ff88'; ctx.shadowBlur = 14; ctx.shadowColor = '#00ff88'; ctx.fill()
  }, [calls])
  return <canvas ref={ref} style={{ width:'100%', height:80, display:'block' }}/>
}

// ── WIN RATE RING ─────────────────────────────────────────────────────────────
function WinRing({ pct }: { pct: number }) {
  const size = 140, r = 56, circ = 2*Math.PI*r, dash = (pct/100)*circ
  return (
    <div style={{ position:'relative', width:size, height:size }}>
      <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#041810" strokeWidth={10}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#00ff88" strokeWidth={10}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
          style={{ filter:'drop-shadow(0 0 10px #00ff88)', transition:'stroke-dasharray 1.5s cubic-bezier(.22,1,.36,1)' }}/>
      </svg>
      <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
        <span style={{ fontSize:28, fontWeight:900, color:'#00ff88', fontFamily:'monospace', textShadow:'0 0 20px #00ff88', letterSpacing:'-1px' }}>{pct}%</span>
        <span style={{ fontSize:9, color:'#4a7a6a', letterSpacing:'1px' }}>WIN RATE</span>
      </div>
    </div>
  )
}

// ── RATING BAR ───────────────────────────────────────────────────────────────
function RatingBreakdown({ calls }: { calls: Call[] }) {
  const counts: Record<string,number> = {}
  calls.forEach(c => { counts[c.rating] = (counts[c.rating]??0) + 1 })
  const total = calls.length || 1
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
      {Object.entries(RATING_CLR).map(([rating, clr]) => {
        const n   = counts[rating] ?? 0
        const pct = Math.round((n/total)*100)
        return (
          <div key={rating}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
              <span style={{ fontSize:10, color: clr, fontWeight:700, letterSpacing:'.3px' }}>{rating}</span>
              <span style={{ fontSize:10, color:'#4a7a6a', fontFamily:'monospace' }}>{n} ({pct}%)</span>
            </div>
            <div style={{ height:4, background:'#041810', borderRadius:2, overflow:'hidden' }}>
              <div style={{ height:'100%', width:`${pct}%`, background:clr, borderRadius:2, boxShadow:`0 0 8px ${clr}`, transition:'width 1.2s cubic-bezier(.22,1,.36,1)' }}/>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PerformancePage() {
  const [calls,   setCalls]   = useState<Call[]>([])
  const [stats,   setStats]   = useState<Stats|null>(null)
  const [loading, setLoading] = useState(true)
  const [filter,  setFilter]  = useState<'all'|'bull'|'bear'|'win'|'loss'>('all')
  const [sort,    setSort]    = useState<'date'|'return'|'confidence'>('date')
  const [scrollY, setScrollY] = useState(0)

  useEffect(() => {
    fetch('/api/ai-calls')
      .then(r => r.json())
      .then(d => { setCalls(d.calls ?? []); setStats(d.stats ?? null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive:true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const filtered = calls
    .filter(c => {
      if (filter === 'bull') return ['Strong Buy','Buy'].includes(c.rating)
      if (filter === 'bear') return ['Strong Sell','Sell'].includes(c.rating)
      if (filter === 'win')  return c.return_pct !== null && ((['Strong Buy','Buy'].includes(c.rating) ? c.return_pct > 0 : c.return_pct < 0))
      if (filter === 'loss') return c.return_pct !== null && ((['Strong Buy','Buy'].includes(c.rating) ? c.return_pct < 0 : c.return_pct > 0))
      return true
    })
    .sort((a, b) => {
      if (sort === 'return')     return (b.return_pct??-999) - (a.return_pct??-999)
      if (sort === 'confidence') return b.confidence - a.confidence
      return new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime()
    })

  const bullCalls = calls.filter(c => ['Strong Buy','Buy'].includes(c.rating))
  const bestCall  = [...calls].filter(c => c.return_pct !== null).sort((a,b) => (b.return_pct!-a.return_pct!))[0]
  const avgConf   = calls.length ? Math.round(calls.reduce((s,c) => s+c.confidence,0)/calls.length) : 0

  return (
    <div style={{ background:'#030a10', color:'#dce8f0', fontFamily:'"Inter",system-ui,sans-serif', minHeight:'100vh', overflowX:'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp  {from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:none}}
        @keyframes pulse   {0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
        @keyframes holo    {0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes tape    {0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes glow    {0%,100%{opacity:.5;filter:blur(60px)}50%{opacity:1;filter:blur(90px)}}
        @keyframes border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        .fu{animation:fadeUp .6s cubic-bezier(.22,1,.36,1) both}
        .nav-link{color:#6a90a8;text-decoration:none;font-size:13px;transition:color .2s}
        .nav-link:hover{color:#00d4aa}
        .card{background:rgba(6,13,20,.9);border:1px solid #0c1e2e;border-radius:12px;backdrop-filter:blur(16px)}
        .holo-border{border-radius:14px;padding:1px;background:linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7,#f59e0b,#00d4aa);background-size:300% 300%;animation:border-flow 4s linear infinite}
        .holo-inner{border-radius:13px;background:rgba(6,13,20,.95);padding:24px;height:100%}
        .row{border-bottom:1px solid #0c1e2e;transition:background .15s}
        .row:hover{background:rgba(0,212,170,.04)}
        .chip{background:rgba(6,13,20,.9);border:1px solid #0c1e2e;border-radius:8px;padding:6px 16px;font-size:12px;cursor:pointer;color:#6a90a8;transition:all .15s;font-weight:600}
        .chip:hover,.chip.active{border-color:#00d4aa60;color:#00d4aa;background:rgba(0,212,170,.08)}
        ::selection{background:#00d4aa30}
        @media(max-width:768px){.hide-sm{display:none!important}.g3{grid-template-columns:1fr!important}.g4{grid-template-columns:1fr 1fr!important}}
      `}</style>

      {/* THREE.JS BACKGROUND */}
      <ThreeScene scrollY={scrollY}/>

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:58, display:'flex', alignItems:'center', padding:'0 28px', gap:28, background:'rgba(3,10,16,.8)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:10, color:'#030a10', boxShadow:'0 0 16px #00d4aa40' }}>YN</div>
          <span style={{ fontWeight:900, fontSize:14, letterSpacing:'-.3px' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:22 }}>
          <Link href="/ai-stocks" className="nav-link">AI Analyzer</Link>
          <Link href="/daily"     className="nav-link">Daily Intel</Link>
          <Link href="/courses"   className="nav-link">Courses</Link>
        </div>
        <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'#00d4aa', background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.2)', borderRadius:20, padding:'5px 14px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
            LIVE TRACK RECORD
          </div>
          <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none' }}>Analyze Free →</Link>
        </div>
      </nav>

      {/* TICKER TAPE */}
      <div style={{ position:'sticky', top:58, zIndex:90, marginTop:58 }}>
        <TickerTape calls={calls}/>
      </div>

      {/* HERO */}
      <section style={{ padding:'80px 24px 60px', textAlign:'center', position:'relative', zIndex:1 }}>
        <div style={{ position:'absolute', top:'20%', left:'50%', transform:'translateX(-50%)', width:600, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,170,.08),transparent 70%)', pointerEvents:'none', animation:'glow 4s ease-in-out infinite' }}/>
        <div className="fu" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.25)', borderRadius:20, padding:'6px 18px', marginBottom:24, fontSize:11, color:'#00d4aa', fontWeight:700, letterSpacing:'1px' }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse 1.5s infinite' }}/>
          EVERY CALL · TIMESTAMPED · LIVE PRICES · NO CHERRY-PICKING
        </div>
        <h1 className="fu" style={{ fontSize:'clamp(38px,7vw,80px)', fontWeight:900, lineHeight:.95, letterSpacing:'-3px', marginBottom:16 }}>
          AI{' '}
          <span style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 4s linear infinite' }}>
            Track Record
          </span>
        </h1>
        <p className="fu" style={{ fontSize:18, color:'#6a90a8', lineHeight:1.65, maxWidth:520, margin:'0 auto 16px' }}>
          Every stock analysis our AI runs is logged here with entry price and timestamp. Returns are calculated live. The data speaks for itself.
        </p>
        <p className="fu" style={{ fontSize:12, color:'#2a4a62', maxWidth:480, margin:'0 auto' }}>
          Not financial advice. Past performance does not guarantee future results. This page exists for transparency only.
        </p>
      </section>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'0 24px 80px', position:'relative', zIndex:1 }}>

        {/* ── STATS GRID ──────────────────────────────────────────────────── */}
        {stats && (
          <div className="g4 fu" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:28 }}>
            {[
              { label:'TOTAL CALLS',   val:`${stats.total}`,         sub:'AI analyses logged',        clr:'#00d4aa' },
              { label:'WIN RATE',      val:`${stats.winRate}%`,      sub:'calls in profit direction', clr:'#00d4aa' },
              { label:'AVG RETURN',    val:`${stats.avgReturn}%`,    sub:'average absolute move',     clr:'#3b8eea' },
              { label:'AVG CONFIDENCE',val:`${avgConf}%`,            sub:'model conviction score',    clr:'#a855f7' },
            ].map(({ label, val, sub, clr }) => (
              <div key={label} className="card" style={{ padding:'22px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'1px', marginBottom:10 }}>{label}</div>
                <div style={{ fontSize:34, fontWeight:900, color:clr, fontFamily:'monospace', letterSpacing:'-2px', textShadow:`0 0 20px ${clr}` }}>{val}</div>
                <div style={{ fontSize:11, color:'#2a4a62', marginTop:6 }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* ── DETAILED STATS ROW ──────────────────────────────────────────── */}
        <div className="g3 fu" style={{ display:'grid', gridTemplateColumns:'200px 1fr 220px', gap:14, marginBottom:28 }}>

          {/* Win rate ring */}
          <div className="card" style={{ padding:'28px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
            <WinRing pct={stats?.winRate ?? 0}/>
            <div style={{ fontSize:11, color:'#6a90a8', textAlign:'center' }}>
              {calls.filter(c=>c.hit_tp1).length} targets hit<br/>
              {calls.filter(c=>c.hit_stop).length} stopped out
            </div>
          </div>

          {/* Sparkline */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ fontSize:11, color:'#6a90a8', marginBottom:12, letterSpacing:'.5px' }}>RETURN HISTORY (last 20 calls)</div>
            <Sparkline calls={calls}/>
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:10, fontSize:10, color:'#2a4a62' }}>
              <span>Oldest →</span>
              <span>{bestCall ? `Best: ${bestCall.ticker} +${bestCall.return_pct?.toFixed(1)}%` : ''}</span>
              <span>← Latest</span>
            </div>
          </div>

          {/* Rating breakdown */}
          <div className="card" style={{ padding:'20px 24px' }}>
            <div style={{ fontSize:11, color:'#6a90a8', marginBottom:14, letterSpacing:'.5px' }}>SIGNAL BREAKDOWN</div>
            <RatingBreakdown calls={calls}/>
            <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #0c1e2e', fontSize:11, color:'#6a90a8' }}>
              {bullCalls.length} bullish · {calls.length - bullCalls.length} bearish/neutral
            </div>
          </div>
        </div>

        {/* ── BEST CALL SPOTLIGHT ─────────────────────────────────────────── */}
        {bestCall && (
          <div className="holo-border fu" style={{ marginBottom:28 }}>
            <div className="holo-inner" style={{ display:'flex', alignItems:'center', gap:24, flexWrap:'wrap' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'1px', flexShrink:0 }}>🏆 BEST CALL</div>
              <div style={{ fontSize:28, fontWeight:900, color:'#00d4aa', fontFamily:'monospace', textShadow:'0 0 20px #00d4aa' }}>{bestCall.ticker}</div>
              <div style={{ fontSize:14, color: RATING_CLR[bestCall.rating], fontWeight:700 }}>{bestCall.rating}</div>
              <div style={{ fontSize:12, color:'#6a90a8' }}>Entry ${bestCall.price_at_analysis?.toFixed(2)} → Now ${bestCall.current_price?.toFixed(2) ?? '?'}</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#00ff88', fontFamily:'monospace', marginLeft:'auto', textShadow:'0 0 20px #00ff88' }}>
                +{bestCall.return_pct?.toFixed(1)}%
              </div>
              <div style={{ fontSize:11, color:'#6a90a8' }}>{new Date(bestCall.analyzed_at).toLocaleDateString()}</div>
            </div>
          </div>
        )}

        {/* ── CALL TABLE ──────────────────────────────────────────────────── */}
        <div className="card fu" style={{ overflow:'hidden' }}>

          {/* Table controls */}
          <div style={{ padding:'18px 24px', borderBottom:'1px solid #0c1e2e', display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#dce8f0', marginRight:8 }}>All Calls</span>
            {([['all','All'],['bull','Bullish'],['bear','Bearish'],['win','Winners'],['loss','Losers']] as const).map(([k,l])=>(
              <button key={k} onClick={()=>setFilter(k)} className={`chip${filter===k?' active':''}`}>{l}</button>
            ))}
            <div style={{ marginLeft:'auto', display:'flex', gap:6, alignItems:'center' }}>
              <span style={{ fontSize:11, color:'#6a90a8' }}>Sort:</span>
              {([['date','Date'],['return','Return'],['confidence','Confidence']] as const).map(([k,l])=>(
                <button key={k} onClick={()=>setSort(k)} className={`chip${sort===k?' active':''}`}>{l}</button>
              ))}
            </div>
          </div>

          {/* Column headers */}
          <div style={{ display:'grid', gridTemplateColumns:'70px 90px 120px 90px 90px 90px 85px 80px', padding:'10px 24px', borderBottom:'1px solid #0c1e2e', fontSize:10, color:'#6a90a8', letterSpacing:'.5px' }}>
            {['TICKER','DATE','RATING','ENTRY','TARGET','NOW','RETURN','STATUS'].map(h=><div key={h}>{h}</div>)}
          </div>

          {loading && (
            <div style={{ padding:60, textAlign:'center', color:'#6a90a8', fontSize:13 }}>
              Loading track record...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding:60, textAlign:'center' }}>
              <div style={{ fontSize:40, marginBottom:16 }}>📊</div>
              <div style={{ fontSize:16, fontWeight:700, color:'#dce8f0', marginBottom:8 }}>No calls logged yet</div>
              <p style={{ fontSize:13, color:'#6a90a8', lineHeight:1.7, marginBottom:24, maxWidth:400, margin:'0 auto 24px' }}>
                Every analysis run on the AI Stock Analyzer gets logged here automatically with a timestamp and entry price. Run your first analysis to start building the track record.
              </p>
              <Link href="/ai-stocks" style={{ display:'inline-block', background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'14px 32px', borderRadius:10, fontSize:14, fontWeight:900, textDecoration:'none', boxShadow:'0 0 30px #00d4aa40' }}>
                Run First Analysis →
              </Link>
            </div>
          )}

          {filtered.map((c, i) => {
            const isBull   = ['Strong Buy','Buy'].includes(c.rating)
            const ret      = c.return_pct
            const isWin    = ret !== null && (isBull ? ret > 0 : ret < 0)
            const retClr   = ret === null ? '#6a90a8' : isWin ? '#00ff88' : '#ff2d78'
            const status   = c.hit_tp1 ? 'TP HIT' : c.hit_stop ? 'STOPPED' : c.current_price ? 'OPEN' : 'PENDING'
            const statusClr= c.hit_tp1 ? '#00ff88' : c.hit_stop ? '#ff2d78' : c.current_price ? '#f59e0b' : '#6a90a8'
            const d        = new Date(c.analyzed_at)
            return (
              <div key={c.id} className="row" style={{ display:'grid', gridTemplateColumns:'70px 90px 120px 90px 90px 90px 85px 80px', padding:'14px 24px', animationDelay:`${i*.04}s` }}>
                <div style={{ fontWeight:800, color:'#dce8f0', fontSize:14, letterSpacing:'.5px' }}>{c.ticker}</div>
                <div style={{ fontSize:12, color:'#6a90a8' }}>
                  {d.getMonth()+1}/{d.getDate()}/{String(d.getFullYear()).slice(2)}
                </div>
                <div style={{ fontSize:11, fontWeight:700, color: RATING_CLR[c.rating]??'#f59e0b' }}>{c.rating}</div>
                <div style={{ fontSize:12, fontFamily:'monospace', color:'#b8d0e0' }}>${Number(c.price_at_analysis).toFixed(2)}</div>
                <div style={{ fontSize:12, fontFamily:'monospace', color:'#3b8eea' }}>${Number(c.price_target).toFixed(2)}</div>
                <div style={{ fontSize:12, fontFamily:'monospace', color:'#dce8f0' }}>{c.current_price ? `$${c.current_price.toFixed(2)}` : '—'}</div>
                <div style={{ fontSize:13, fontWeight:900, fontFamily:'monospace', color:retClr, textShadow:ret!==null?`0 0 8px ${retClr}`:'none' }}>
                  {ret !== null ? `${ret > 0 ? '+' : ''}${ret}%` : '—'}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:statusClr, boxShadow:`0 0 6px ${statusClr}`, flexShrink:0 }}/>
                  <span style={{ fontSize:10, fontWeight:700, color:statusClr, letterSpacing:'.3px' }}>{status}</span>
                </div>
              </div>
            )
          })}

          {filtered.length > 0 && (
            <div style={{ padding:'16px 24px', borderTop:'1px solid #0c1e2e', fontSize:11, color:'#6a90a8', display:'flex', justifyContent:'space-between' }}>
              <span>Showing {filtered.length} of {calls.length} calls</span>
              <span style={{ color:'#2a4a62' }}>Prices updated via Finnhub · Refreshes on page load</span>
            </div>
          )}
        </div>

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <div style={{ marginTop:48, padding:'48px 32px', background:'linear-gradient(135deg,rgba(0,212,170,.08),rgba(59,142,234,.06))', border:'1px solid rgba(0,212,170,.15)', borderRadius:16, textAlign:'center', backdropFilter:'blur(12px)' }}>
          <div style={{ fontSize:11, color:'#00d4aa', letterSpacing:'1px', marginBottom:14 }}>JOIN THE PLATFORM</div>
          <h2 style={{ fontSize:'clamp(24px,4vw,44px)', fontWeight:900, letterSpacing:'-1.5px', marginBottom:12 }}>
            Get Your Own AI Analysis
          </h2>
          <p style={{ fontSize:15, color:'#6a90a8', lineHeight:1.7, marginBottom:32, maxWidth:440, margin:'0 auto 32px' }}>
            Every call above was generated in ~15 seconds by 5 specialized AI agents. 3 free, then $19/month unlimited.
          </p>
          <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'16px 36px', borderRadius:12, fontSize:15, fontWeight:900, textDecoration:'none', boxShadow:'0 0 40px #00d4aa40' }}>
              Analyze a Stock Free →
            </Link>
            <Link href="/daily" style={{ background:'rgba(6,13,20,.9)', border:'1px solid #0c1e2e', color:'#dce8f0', padding:'16px 36px', borderRadius:12, fontSize:15, fontWeight:700, textDecoration:'none', backdropFilter:'blur(12px)' }}>
              Daily Intelligence
            </Link>
          </div>
        </div>

      </div>

      <footer style={{ borderTop:'1px solid rgba(255,255,255,.04)', padding:'28px 24px', position:'relative', zIndex:1, background:'rgba(3,10,16,.9)', backdropFilter:'blur(20px)', textAlign:'center' }}>
        <p style={{ fontSize:11, color:'#1a3550' }}>
          Not financial advice · Educational purposes only · Past performance does not guarantee future results · Always do your own research before trading
        </p>
      </footer>
    </div>
  )
}
