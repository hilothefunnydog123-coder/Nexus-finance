'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Call = {
  id: string; ticker: string; analyzed_at: string; rating: string
  price_at_analysis: number; price_target: number; stop_loss: number
  take_profit_1: number; confidence: number
  current_price: number | null; return_pct: number | null
  hit_tp1: boolean; hit_stop: boolean
}
type Stats = { total: number; winRate: number; avgReturn: number; withData: number }

const RATING_CLR: Record<string, string> = {
  'Strong Buy':'#00ff88','Buy':'#00c896','Hold':'#f59e0b','Sell':'#f97316','Strong Sell':'#ff2d78',
}

function fmt(n: number | null, pre = '$') {
  if (n === null || n === undefined) return '—'
  return `${pre}${Number(n).toFixed(2)}`
}

export default function PerformancePage() {
  const [calls,  setCalls]  = useState<Call[]>([])
  const [stats,  setStats]  = useState<Stats | null>(null)
  const [loading,setLoading]= useState(true)
  const [filter, setFilter] = useState<'all'|'bull'|'bear'>('all')

  useEffect(() => {
    fetch('/api/ai-calls')
      .then(r => r.json())
      .then(d => { setCalls(d.calls ?? []); setStats(d.stats ?? null) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = calls.filter(c => {
    if (filter === 'bull') return ['Strong Buy','Buy'].includes(c.rating)
    if (filter === 'bear') return ['Strong Sell','Sell'].includes(c.rating)
    return true
  })

  return (
    <div style={{ background:'#030a06', color:'#a0ffcc', fontFamily:'"JetBrains Mono","Fira Code",monospace', minHeight:'100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes blink{0%,49%{opacity:1}50%,100%{opacity:0}}
        @keyframes scanline{0%{top:-4px}100%{top:100%}}
        .fu{animation:fadeUp .5s ease both}
        .nav-link{color:#4a7a6a;text-decoration:none;font-size:12px;transition:color .2s;letter-spacing:.5px}
        .nav-link:hover{color:#00ff88}
        .card{background:rgba(3,12,6,.9);border:1px solid #00ff8820;border-radius:4px;position:relative;overflow:hidden}
        .card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,#00ff8840,transparent)}
        .row:hover{background:rgba(0,255,136,.04)}
        ::selection{background:#00ff8830}
        @media(max-width:768px){.hide-sm{display:none!important}}
      `}</style>

      {/* NAV */}
      <nav style={{ position:'sticky', top:0, zIndex:50, height:52, display:'flex', alignItems:'center', padding:'0 28px', gap:28, background:'rgba(3,10,6,.95)', backdropFilter:'blur(16px)', borderBottom:'1px solid #00ff8812' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <div style={{ width:28, height:28, borderRadius:4, background:'linear-gradient(135deg,#00ff88,#00d4ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:10, color:'#030a06' }}>YN</div>
          <span style={{ fontWeight:900, fontSize:13, color:'#00ff88', letterSpacing:'2px' }}>YN_FINANCE</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:24 }}>
          <Link href="/ai-stocks" className="nav-link">AI_ANALYZER</Link>
          <Link href="/daily"     className="nav-link">DAILY_INTEL</Link>
          <Link href="/courses"   className="nav-link">COURSES</Link>
        </div>
        <div style={{ marginLeft:'auto', fontSize:10, color:'#00ff88', letterSpacing:'1px' }}>
          <span style={{ animation:'blink 1s infinite' }}>█</span> LIVE_TRACK_RECORD
        </div>
      </nav>

      <div style={{ maxWidth:1100, margin:'0 auto', padding:'48px 24px' }}>

        {/* HEADER */}
        <div className="fu" style={{ marginBottom:48 }}>
          <div style={{ fontSize:9, color:'#1a4a2a', letterSpacing:'3px', marginBottom:12 }}>// YN_AI · PERFORMANCE_DASHBOARD</div>
          <h1 style={{ fontSize:'clamp(28px,5vw,52px)', fontWeight:900, lineHeight:.95, letterSpacing:'-2px', marginBottom:12 }}>
            <span style={{ color:'#00ff88', textShadow:'0 0 30px #00ff88' }}>AI TRACK RECORD</span>
          </h1>
          <p style={{ fontSize:13, color:'#4a7a6a', letterSpacing:'.3px', maxWidth:560, lineHeight:1.7 }}>
            Every AI analysis, logged with a timestamp and entry price. Returns calculated live using Finnhub market data. No cherry-picking — every call is public.
          </p>
        </div>

        {/* STATS */}
        {stats && (
          <div className="fu" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:32 }}>
            {[
              { label:'TOTAL_CALLS',   val: stats.total,                  suf:'',  clr:'#00ff88', sub:'AI analyses logged' },
              { label:'WIN_RATE',      val: stats.winRate,                suf:'%', clr:'#00d4ff', sub:'calls in profit direction' },
              { label:'AVG_RETURN',    val: stats.avgReturn,              suf:'%', clr:'#a855f7', sub:'average absolute move' },
              { label:'COVERAGE',      val: stats.withData,               suf:'',  clr:'#f59e0b', sub:'calls with live prices' },
            ].map(({ label, val, suf, clr, sub }) => (
              <div key={label} className="card" style={{ padding:'22px 20px' }}>
                <div style={{ fontSize:9, color:'#4a7a6a', letterSpacing:'1px', marginBottom:10 }}>{label}</div>
                <div style={{ fontSize:32, fontWeight:900, fontFamily:'monospace', color:clr, textShadow:`0 0 20px ${clr}`, letterSpacing:'-1px' }}>{val}{suf}</div>
                <div style={{ fontSize:10, color:'#1a4a2a', marginTop:6, letterSpacing:'.3px' }}>{sub}</div>
              </div>
            ))}
          </div>
        )}

        {/* DISCLAIMER */}
        <div style={{ background:'rgba(255,153,0,.06)', border:'1px solid rgba(255,153,0,.2)', borderRadius:4, padding:'12px 18px', marginBottom:24, fontSize:11, color:'#f59e0b', letterSpacing:'.3px', lineHeight:1.6 }}>
          // NOT FINANCIAL ADVICE · Past performance does not guarantee future results · This track record is for transparency purposes only · Always do your own research
        </div>

        {/* FILTER */}
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20 }}>
          <span style={{ fontSize:10, color:'#4a7a6a', letterSpacing:'1px' }}>FILTER:</span>
          {([['all','ALL'],['bull','BULLISH'],['bear','BEARISH']] as const).map(([k,l])=>(
            <button key={k} onClick={()=>setFilter(k)}
              style={{ background:filter===k?'#00ff8818':'transparent', border:`1px solid ${filter===k?'#00ff88':'#00ff8820'}`, borderRadius:2, padding:'5px 14px', fontSize:10, cursor:'pointer', color:filter===k?'#00ff88':'#4a7a6a', fontFamily:'inherit', fontWeight:700, letterSpacing:'1px' }}>
              {l}
            </button>
          ))}
          <span style={{ marginLeft:'auto', fontSize:10, color:'#4a7a6a' }}>{filtered.length} calls</span>
        </div>

        {/* TABLE */}
        <div className="card fu">
          {/* Header */}
          <div style={{ display:'grid', gridTemplateColumns:'80px 100px 110px 90px 90px 90px 90px 80px 80px', gap:0, padding:'10px 16px', borderBottom:'1px solid #00ff8815', fontSize:9, color:'#4a7a6a', letterSpacing:'1px' }}>
            {['TICKER','DATE','RATING','ENTRY','TARGET','STOP','NOW','RETURN','STATUS'].map(h=>(
              <div key={h}>{h}</div>
            ))}
          </div>

          {loading && (
            <div style={{ padding:'48px', textAlign:'center', fontSize:12, color:'#4a7a6a', letterSpacing:'1px' }}>
              <span style={{ animation:'blink 1s infinite' }}>▋</span> LOADING_CALLS...
            </div>
          )}

          {!loading && filtered.length === 0 && (
            <div style={{ padding:'48px', textAlign:'center' }}>
              <div style={{ fontSize:13, color:'#4a7a6a', letterSpacing:'1px', marginBottom:16 }}>// NO_CALLS_LOGGED_YET</div>
              <p style={{ fontSize:12, color:'#1a4a2a', lineHeight:1.7, marginBottom:20 }}>
                Every analysis run on the AI Stock Analyzer gets logged here automatically. Run your first analysis to start building the track record.
              </p>
              <Link href="/ai-stocks" style={{ display:'inline-block', background:'#00ff88', color:'#030a06', padding:'10px 24px', borderRadius:2, fontSize:12, fontWeight:900, textDecoration:'none', letterSpacing:'1px' }}>
                RUN FIRST ANALYSIS →
              </Link>
            </div>
          )}

          {filtered.map((c, i) => {
            const isBull   = ['Strong Buy','Buy'].includes(c.rating)
            const ret      = c.return_pct
            const retColor = ret === null ? '#4a7a6a' : isBull ? (ret > 0 ? '#00ff88' : '#ff2d78') : (ret < 0 ? '#00ff88' : '#ff2d78')
            const status   = c.hit_tp1 ? '✓ TP HIT' : c.hit_stop ? '✗ STOPPED' : c.current_price ? 'OPEN' : 'PENDING'
            const statusClr= c.hit_tp1 ? '#00ff88' : c.hit_stop ? '#ff2d78' : '#f59e0b'
            const d = new Date(c.analyzed_at)
            const dateStr  = `${d.getMonth()+1}/${d.getDate()}/${String(d.getFullYear()).slice(2)}`
            return (
              <div key={c.id} className="row" style={{ display:'grid', gridTemplateColumns:'80px 100px 110px 90px 90px 90px 90px 80px 80px', gap:0, padding:'12px 16px', borderBottom:'1px solid #00ff8808', transition:'background .15s', animationDelay:`${i*.03}s` }}>
                <div style={{ fontWeight:900, color:'#00ff88', fontSize:13, letterSpacing:'1px' }}>{c.ticker}</div>
                <div style={{ fontSize:11, color:'#4a7a6a' }}>{dateStr}</div>
                <div style={{ fontSize:11, fontWeight:700, color: RATING_CLR[c.rating] ?? '#f59e0b', letterSpacing:'.3px' }}>{c.rating}</div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#a0ffcc' }}>{fmt(c.price_at_analysis)}</div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#00d4ff' }}>{fmt(c.price_target)}</div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#ff2d78' }}>{fmt(c.stop_loss)}</div>
                <div style={{ fontSize:11, fontFamily:'monospace', color:'#a0ffcc' }}>{fmt(c.current_price)}</div>
                <div style={{ fontSize:12, fontWeight:900, fontFamily:'monospace', color: retColor, textShadow: ret !== null ? `0 0 8px ${retColor}` : 'none' }}>
                  {ret !== null ? `${ret > 0 ? '+' : ''}${ret}%` : '—'}
                </div>
                <div style={{ fontSize:10, fontWeight:700, color: statusClr, letterSpacing:'.5px' }}>{status}</div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div style={{ marginTop:48, textAlign:'center', padding:'40px', background:'rgba(3,12,6,.8)', border:'1px solid #00ff8820', borderRadius:4 }}>
          <div style={{ fontSize:9, color:'#4a7a6a', letterSpacing:'3px', marginBottom:12 }}>// GET_THE_EDGE</div>
          <h2 style={{ fontSize:'clamp(22px,4vw,38px)', fontWeight:900, letterSpacing:'-1.5px', color:'#00ff88', textShadow:'0 0 30px #00ff88', marginBottom:12 }}>
            Run Your Own Analysis
          </h2>
          <p style={{ fontSize:13, color:'#4a7a6a', marginBottom:24, lineHeight:1.7 }}>
            Every analysis above was generated in ~15 seconds by 5 AI agents. Get 3 free, then $19/month unlimited.
          </p>
          <Link href="/ai-stocks" style={{ display:'inline-block', background:'linear-gradient(135deg,#00ff88,#00d4ff)', color:'#030a06', padding:'14px 36px', borderRadius:2, fontSize:13, fontWeight:900, textDecoration:'none', letterSpacing:'1px', boxShadow:'0 0 40px rgba(0,255,136,.4)' }}>
            ANALYZE A STOCK FREE →
          </Link>
        </div>

      </div>

      <div style={{ textAlign:'center', padding:'20px', borderTop:'1px solid #00ff8810', fontSize:9, color:'#1a4a2a', letterSpacing:'2px' }}>
        // NOT FINANCIAL ADVICE · EDUCATIONAL PURPOSES ONLY · DYOR
      </div>
    </div>
  )
}
