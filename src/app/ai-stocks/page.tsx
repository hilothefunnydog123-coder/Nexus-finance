'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })

const POPULAR = ['AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','GOOGL','SPY','QQQ','JPM','NFLX']

const AGENTS = [
  { icon: '📊', label: 'Fundamentals', desc: 'Valuation · EPS · ROE',   clr: '#00d4aa' },
  { icon: '📈', label: 'Technical',    desc: 'Trend · SMA · Momentum',  clr: '#3b8eea' },
  { icon: '📰', label: 'Sentiment',    desc: 'News · Social · Narrative',clr: '#a855f7' },
  { icon: '🛡️', label: 'Risk',         desc: 'Downside · Hedges',        clr: '#f59e0b' },
  { icon: '🎯', label: 'Portfolio Mgr',desc: 'Final synthesis',          clr: '#ec4899' },
]

const RATING_CFG: Record<string, { clr: string; bg: string; border: string; glow: string }> = {
  'Strong Buy':  { clr: '#00e5a0', bg: '#00e5a00a', border: '#00e5a040', glow: '#00e5a0' },
  'Buy':         { clr: '#00c896', bg: '#00c8960a', border: '#00c89630', glow: '#00c896' },
  'Hold':        { clr: '#f0b429', bg: '#f0b4290a', border: '#f0b42930', glow: '#f0b429' },
  'Sell':        { clr: '#f97316', bg: '#f9731608', border: '#f9731630', glow: '#f97316' },
  'Strong Sell': { clr: '#e84545', bg: '#e8454508', border: '#e8454530', glow: '#e84545' },
}
const SENT_CLR: Record<string, string> = {
  'Very Bullish':'#00e5a0','Bullish':'#00c896','Neutral':'#f0b429','Bearish':'#f97316','Very Bearish':'#e84545',
}
const TF_CLR: Record<string, string> = { Bullish:'#00c896', Neutral:'#f0b429', Bearish:'#e84545' }

type KeyLevels  = { strong_support:number; support:number; resistance:number; strong_resistance:number }
type Options    = { strategy:string; type:string; strike:number; expiry_days:number; est_premium:number; breakeven_call:number; breakeven_put:number; max_loss:number; iv_environment:string; reasoning:string }
type Timeframes = { '1_week':string; '1_month':string; '3_months':string; '6_months':string }
type Analysis   = {
  rating:string; confidence:number; price_target:number; price_target_bear:number; price_target_bull:number
  time_horizon:string; executive_summary:string; investment_thesis:string; bull_case:string; bear_case:string
  entry_low:number; entry_high:number; stop_loss:number; take_profit_1:number; take_profit_2:number
  position_size_pct:number; key_levels:KeyLevels; risks:string[]; catalysts:string[]
  sentiment:string; fundamentals_score:number; technical_score:number; sentiment_score:number
  analyst_consensus:string; vs_sector:string; timeframes:Timeframes; options:Options
}
type Result = {
  ticker:string; name:string; price:number; change1d:number; prevClose:number
  high52:number; low52:number; pe:number; marketCap:number; beta:number; industry:string
  analystBuy:number; analystHold:number; analystSell:number; analystTotal:number
  analysis:Analysis
}

function Ring({ pct, clr, size=96 }: { pct:number; clr:string; size?:number }) {
  const r = (size-10)/2, circ = 2*Math.PI*r, dash = (pct/100)*circ
  return (
    <svg width={size} height={size} style={{ transform:'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0c1e2e" strokeWidth={8}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth={8} strokeLinecap="round"
        strokeDasharray={`${dash} ${circ}`} style={{ transition:'stroke-dasharray 1.2s ease', filter:`drop-shadow(0 0 6px ${clr})` }}/>
    </svg>
  )
}

function ScoreBar({ score, label }: { score:number; label:string }) {
  const c = score>=7?'#00c896':score>=5?'#f0b429':'#e84545'
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
        <span style={{ fontSize:11, color:'#6a90a8' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:800, color:c, fontFamily:'monospace' }}>{score}/10</span>
      </div>
      <div style={{ height:4, background:'#0c1e2e', borderRadius:2, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score*10}%`, background:`linear-gradient(90deg,${c},${c}aa)`, borderRadius:2, transition:'width 1.2s ease', boxShadow:`0 0 8px ${c}` }}/>
      </div>
    </div>
  )
}

export default function AIStocksPage() {
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const [agentIdx, setAgentIdx] = useState(0)
  const [result, setResult]     = useState<Result|null>(null)
  const [error, setError]       = useState('')
  const [scrollY, setScrollY]   = useState(0)
  const [cursorX, setCursorX]   = useState(-100)
  const [cursorY, setCursorY]   = useState(-100)
  const intervalRef = useRef<NodeJS.Timeout|null>(null)
  const resultsRef  = useRef<HTMLDivElement>(null)
  const [account, setAccount]   = useState('10000')
  const [riskPct, setRiskPct]   = useState('1')

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    let ax=-100, ay=-100, tx=-100, ty=-100, raf:number
    const onMove = (e:MouseEvent) => { tx=e.clientX; ty=e.clientY }
    const loop = () => { ax+=(tx-ax)*.12; ay+=(ty-ay)*.12; setCursorX(ax); setCursorY(ay); raf=requestAnimationFrame(loop) }
    window.addEventListener('mousemove', onMove); raf=requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', onMove); cancelAnimationFrame(raf) }
  }, [])

  const analyze = useCallback(async (sym: string) => {
    const t = sym.trim().toUpperCase(); if (!t) return
    setInput(t); setLoading(true); setResult(null); setError('')
    let idx=0; intervalRef.current = setInterval(() => { idx=(idx+1)%AGENTS.length; setAgentIdx(idx) }, 900)
    try {
      const r = await fetch('/api/stock-analyzer', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ticker:t}) })
      const d = await r.json()
      if (!r.ok||d.error) { setError(d.error||'Analysis failed'); return }
      setResult(d)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior:'smooth', block:'start' }), 100)
    } catch { setError('Network error. Try again.') }
    finally { if(intervalRef.current) clearInterval(intervalRef.current); setLoading(false) }
  }, [])

  const a     = result?.analysis
  const rCfg  = RATING_CFG[a?.rating??''] ?? RATING_CFG['Hold']
  const sClr  = SENT_CLR[a?.sentiment??''] ?? '#f0b429'
  const upDay = (result?.change1d??0) >= 0
  const accNum = parseFloat(account)||10000, riskNum = parseFloat(riskPct)||1
  const riskDollar = (accNum*riskNum/100).toFixed(0)
  const posSize = a&&result&&a.stop_loss&&result.price>a.stop_loss ? Math.floor(parseFloat(riskDollar)/Math.abs(result.price-a.stop_loss)) : 0

  return (
    <div style={{ background:'#030a10', color:'#dce8f0', fontFamily:'"Inter",system-ui,sans-serif', minHeight:'100vh', overflowX:'hidden', cursor:'none' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(30px) rotateX(-10deg)}to{opacity:1;transform:none}}
        @keyframes pulse-dot{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(2);opacity:.5}}
        @keyframes holo{0%,100%{background-position:0% 50%}50%{background-position:100% 50%}}
        @keyframes glow-anim{0%,100%{opacity:.6;filter:blur(60px)}50%{opacity:1;filter:blur(90px)}}
        @keyframes scan{0%{top:-10%}100%{top:110%}}
        @keyframes border-flow{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
        @keyframes float3d{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes spin-slow{to{transform:rotate(360deg)}}
        @keyframes agent-in{from{opacity:0;transform:translateX(-10px)}to{opacity:1;transform:none}}
        .nav-link{color:#6a90a8;text-decoration:none;font-size:13px;transition:color .2s}
        .nav-link:hover{color:#00d4aa}
        .chip{background:rgba(6,13,20,.8);border:1px solid #0c1e2e;border-radius:20px;padding:7px 16px;font-size:12px;cursor:pointer;color:#6a90a8;transition:all .2s;font-family:monospace;font-weight:700;letter-spacing:.5px;backdrop-filter:blur(8px)}
        .chip:hover{border-color:#00d4aa60;color:#00d4aa;background:rgba(0,212,170,.08);box-shadow:0 0 20px rgba(0,212,170,.15);transform:translateY(-2px)}
        .card{background:rgba(6,13,20,.85);border:1px solid #0c1e2e;border-radius:14px;backdrop-filter:blur(16px)}
        .holo-border{position:relative;border-radius:16px;padding:1px;background:linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7,#f59e0b,#00d4aa);background-size:300% 300%;animation:border-flow 4s linear infinite}
        .holo-inner-card{border-radius:15px;background:rgba(6,13,20,.9);padding:22px;height:100%;backdrop-filter:blur(16px)}
        ::selection{background:#00d4aa30}
        @media(max-width:700px){.hide-sm{display:none!important}.grid-r{grid-template-columns:1fr!important}}
      `}</style>

      {/* CURSOR */}
      <div style={{ position:'fixed', zIndex:9999, pointerEvents:'none', left:cursorX-6, top:cursorY-6, width:12, height:12, borderRadius:'50%', background:'#00d4aa', mixBlendMode:'difference' }}/>
      <div style={{ position:'fixed', zIndex:9998, pointerEvents:'none', left:cursorX-20, top:cursorY-20, width:40, height:40, borderRadius:'50%', border:'1px solid #00d4aa50', transition:'left .08s,top .08s' }}/>

      {/* THREE.JS BACKGROUND */}
      <ThreeScene scrollY={scrollY} />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, height:58, display:'flex', alignItems:'center', padding:'0 28px', gap:28, background:'rgba(3,10,16,.75)', backdropFilter:'blur(24px)', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:30, height:30, borderRadius:9, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, color:'#030a10', boxShadow:'0 0 20px #00d4aa40' }}>YN</div>
          <span style={{ fontWeight:900, fontSize:15, letterSpacing:'-.5px' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:22 }}>
          {[['Daily Intel','/daily'],['Arena','/arena'],['Courses','/courses'],['Terminal','/app']].map(([l,h])=>(
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </div>
        <div style={{ marginLeft:'auto' }}>
          <Link href="/app" style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:900, textDecoration:'none', boxShadow:'0 0 20px #00d4aa40' }}>Launch App →</Link>
        </div>
      </nav>

      {/* ══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, paddingTop:58, textAlign:'center' }}>

        {/* Glow orbs */}
        <div style={{ position:'absolute', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,rgba(0,212,170,.1) 0%,transparent 70%)', top:'5%', left:'50%', transform:'translateX(-50%)', animation:'glow-anim 4s ease-in-out infinite', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,rgba(168,85,247,.08) 0%,transparent 70%)', top:'30%', left:'10%', animation:'glow-anim 6s ease-in-out infinite 1s', pointerEvents:'none' }}/>
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,rgba(59,142,234,.08) 0%,transparent 70%)', top:'20%', right:'8%', animation:'glow-anim 5s ease-in-out infinite .5s', pointerEvents:'none' }}/>

        {/* Floating agent orbs behind hero */}
        {AGENTS.map((ag, i) => (
          <div key={ag.label} style={{ position:'absolute', width:56, height:56, borderRadius:'50%', background:`radial-gradient(circle,${ag.clr}25,transparent 70%)`, border:`1px solid ${ag.clr}30`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, animation:`float3d ${3+i*.4}s ease-in-out infinite`, animationDelay:`${i*.6}s`, pointerEvents:'none', backdropFilter:'blur(4px)',
            ...[
              { top:'18%', left:'8%' }, { top:'65%', left:'5%' }, { top:'15%', right:'7%' },
              { top:'70%', right:'6%' }, { top:'40%', right:'3%' },
            ][i] }}>
            {ag.icon}
          </div>
        ))}

        <div style={{ maxWidth:760, padding:'0 24px', position:'relative', zIndex:2 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.25)', borderRadius:24, padding:'7px 20px', marginBottom:28, fontSize:11, color:'#00d4aa', fontWeight:700, letterSpacing:'1px' }}>
            <span style={{ width:7, height:7, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-dot 1.5s infinite' }}/>
            5-AGENT AI · GEMINI 2.0 · INSTITUTIONAL RESEARCH · FREE
          </div>

          <h1 style={{ fontSize:'clamp(44px,8vw,88px)', fontWeight:900, lineHeight:.95, letterSpacing:'-3.5px', marginBottom:20 }}>
            AI Stock{' '}
            <span style={{ background:'linear-gradient(135deg,#00d4aa 0%,#3b8eea 40%,#a855f7 80%)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundSize:'200%', animation:'holo 4s linear infinite', display:'inline-block' }}>
              Analyzer
            </span>
          </h1>

          <p style={{ fontSize:'clamp(15px,2vw,19px)', color:'#6a90a8', lineHeight:1.65, marginBottom:40, maxWidth:580, margin:'0 auto 40px' }}>
            Five specialized AI agents analyze any stock in seconds — entry zones, stop loss, price targets, options strategy, catalysts, and multi-timeframe outlook. Institutional research, free.
          </p>

          {/* SEARCH BAR */}
          <div style={{ maxWidth:580, margin:'0 auto 20px', position:'relative' }}>
            {/* Glowing border wrapper */}
            <div style={{ borderRadius:16, padding:'1px', background: loading ? 'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)' : 'linear-gradient(135deg,#0c1e2e,#1a3550)', backgroundSize:'200% 200%', animation: loading ? 'border-flow 1s linear infinite' : 'none', boxShadow: loading ? '0 0 60px rgba(0,212,170,.3)' : '0 0 0px transparent', transition:'box-shadow .4s' }}>
              <div style={{ display:'flex', background:'rgba(6,13,20,.95)', borderRadius:15, overflow:'hidden', backdropFilter:'blur(16px)' }}>
                <input value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => e.key==='Enter' && analyze(input)}
                  placeholder="AAPL, TSLA, NVDA..." style={{ flex:1, background:'transparent', border:'none', padding:'20px 22px', fontSize:19, color:'#dce8f0', fontFamily:'monospace', fontWeight:800, letterSpacing:1, outline:'none' }}/>
                <button onClick={() => analyze(input)} disabled={loading}
                  style={{ background: loading ? 'rgba(12,30,46,1)' : 'linear-gradient(135deg,#00d4aa,#3b8eea)', border:'none', padding:'0 32px', cursor: loading ? 'not-allowed' : 'pointer', color: loading ? '#6a90a8' : '#030a10', fontWeight:900, fontSize:14, letterSpacing:'.5px', transition:'all .25s', whiteSpace:'nowrap', boxShadow: loading ? 'none' : '0 0 30px rgba(0,212,170,.4)' }}>
                  {loading ? '···' : 'ANALYZE →'}
                </button>
              </div>
            </div>
          </div>

          {/* QUICK PICKS */}
          <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginBottom:14 }}>
            {POPULAR.map(s => <button key={s} className="chip" onClick={() => analyze(s)}>{s}</button>)}
          </div>
          <p style={{ fontSize:11, color:'#1a3550' }}>Click any ticker or type your own · Analysis takes ~15 seconds</p>
        </div>
      </section>

      {/* LOADING */}
      {loading && (
        <div style={{ maxWidth:640, margin:'0 auto 60px', padding:'0 24px', position:'relative', zIndex:1 }}>
          <div className="holo-border" style={{ animation:'border-flow 1s linear infinite' }}>
            <div className="holo-inner-card" style={{ position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00d4aa,transparent)', animation:'scan 1.4s linear infinite' }}/>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                {/* Agent spinner ring */}
                <div style={{ position:'relative', width:72, height:72, margin:'0 auto 16px' }}>
                  <svg style={{ animation:'spin-slow .9s linear infinite', position:'absolute', inset:0 }} width="72" height="72" viewBox="0 0 72 72">
                    <circle cx="36" cy="36" r="30" fill="none" stroke="#00d4aa" strokeWidth="3" strokeDasharray="40 60" strokeLinecap="round"/>
                  </svg>
                  <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>
                    {AGENTS[agentIdx].icon}
                  </div>
                </div>
                <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Analyzing <span style={{ color:'#00d4aa' }}>{input}</span></div>
                <div style={{ fontSize:12, color:'#6a90a8' }}>Agents running in parallel</div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {AGENTS.map((ag, i) => (
                  <div key={ag.label} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', borderRadius:10, background: i===agentIdx ? `${ag.clr}12` : 'transparent', border:`1px solid ${i===agentIdx ? ag.clr+'40' : 'transparent'}`, transition:'all .3s', animation: i===agentIdx ? 'agent-in .3s ease' : '' }}>
                    <span style={{ fontSize:18 }}>{ag.icon}</span>
                    <div style={{ flex:1 }}>
                      <span style={{ fontSize:12, fontWeight:700, color: i===agentIdx ? ag.clr : '#2a4a62', transition:'color .3s' }}>{ag.label}</span>
                      <span style={{ fontSize:11, color:'#1a3550', marginLeft:8 }}>{ag.desc}</span>
                    </div>
                    {i < agentIdx && <span style={{ color:ag.clr, fontSize:13 }}>✓</span>}
                    {i === agentIdx && <span style={{ width:8, height:8, borderRadius:'50%', background:ag.clr, display:'inline-block', animation:'pulse-dot .8s infinite' }}/>}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div style={{ maxWidth:580, margin:'0 auto 48px', padding:'0 24px', position:'relative', zIndex:1 }}>
          <div style={{ background:'rgba(232,69,69,.1)', border:'1px solid rgba(232,69,69,.3)', borderRadius:12, padding:'14px 20px', color:'#e84545', fontSize:13, backdropFilter:'blur(8px)' }}>⚠ {error}</div>
        </div>
      )}

      {/* ══ RESULTS ══════════════════════════════════════════════════════════ */}
      {result && a && !loading && (
        <div ref={resultsRef} style={{ maxWidth:1060, margin:'0 auto 80px', padding:'0 20px', position:'relative', zIndex:1 }}>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:11, color:'#6a90a8', marginBottom:4, letterSpacing:'.5px' }}>{result.industry}</div>
              <h2 style={{ fontSize:30, fontWeight:900, letterSpacing:'-1px', marginBottom:8 }}>{result.name} <span style={{ color:'#6a90a8', fontWeight:400, fontSize:18 }}>({result.ticker})</span></h2>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:32, fontWeight:900, fontFamily:'monospace', letterSpacing:'-1px' }}>${result.price.toFixed(2)}</span>
                <span style={{ fontSize:15, fontWeight:800, fontFamily:'monospace', color: upDay?'#00c896':'#e84545', background: upDay?'#00c89615':'#e8454515', padding:'4px 12px', borderRadius:8, border:`1px solid ${upDay?'#00c89630':'#e8454530'}` }}>{upDay?'+':''}{result.change1d.toFixed(2)}%</span>
                <span style={{ fontSize:11, color:'#2a4a62', fontFamily:'monospace' }}>52W ${result.low52.toFixed(0)}–${result.high52.toFixed(0)}</span>
              </div>
            </div>
            <div style={{ display:'flex', gap:12, alignItems:'center' }}>
              {/* Confidence ring */}
              <div style={{ position:'relative', width:96, height:96 }}>
                <Ring pct={a.confidence} clr={rCfg.clr} size={96}/>
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18, fontWeight:900, color:rCfg.clr, fontFamily:'monospace' }}>{a.confidence}</span>
                  <span style={{ fontSize:8, color:'#6a90a8', letterSpacing:.5 }}>CONF.</span>
                </div>
              </div>
              {/* Verdict */}
              <div style={{ background:rCfg.bg, border:`1px solid ${rCfg.border}`, borderRadius:14, padding:'16px 24px', textAlign:'center', minWidth:148, boxShadow:`0 0 40px ${rCfg.glow}20`, backdropFilter:'blur(12px)' }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>AI VERDICT</div>
                <div style={{ fontSize:22, fontWeight:900, color:rCfg.clr, letterSpacing:'-.5px', textShadow:`0 0 20px ${rCfg.glow}` }}>{a.rating}</div>
                <div style={{ fontSize:10, color:'#6a90a8', marginTop:4 }}>{a.time_horizon}</div>
              </div>
              {/* Price target */}
              <div style={{ background:'rgba(6,13,20,.85)', border:'1px solid #0c1e2e', borderRadius:14, padding:'16px 24px', textAlign:'center', minWidth:148, backdropFilter:'blur(12px)' }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>12-MONTH TARGET</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#3b8eea', fontFamily:'monospace', textShadow:'0 0 20px #3b8eea' }}>${a.price_target.toFixed(2)}</div>
                <div style={{ fontSize:10, color: ((a.price_target-result.price)/result.price*100)>=0?'#00c896':'#e84545', marginTop:4, fontWeight:700 }}>
                  {((a.price_target-result.price)/result.price*100).toFixed(1)}% upside
                </div>
              </div>
            </div>
          </div>

          {/* SUMMARY */}
          <div className="card" style={{ padding:'20px 24px', marginBottom:14, borderLeft:`3px solid ${rCfg.clr}`, boxShadow:`-4px 0 20px ${rCfg.glow}20` }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:10 }}>EXECUTIVE SUMMARY</div>
            <p style={{ fontSize:14, lineHeight:1.7, color:'#b8d0e0' }}>{a.executive_summary}</p>
          </div>

          {/* THESIS + SCORES */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:14, marginBottom:14 }}>
            <div className="card" style={{ padding:'22px 24px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>🎯 INVESTMENT THESIS</div>
              <p style={{ fontSize:13.5, lineHeight:1.75, color:'#b8d0e0', marginBottom:20 }}>{a.investment_thesis}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'rgba(0,200,150,.06)', border:'1px solid rgba(0,200,150,.2)', borderRadius:10, padding:'14px 15px' }}>
                  <div style={{ fontSize:10, color:'#00c896', letterSpacing:'.5px', marginBottom:7 }}>BULL CASE</div>
                  <p style={{ fontSize:12.5, color:'#b8d0e0', lineHeight:1.55 }}>{a.bull_case}</p>
                </div>
                <div style={{ background:'rgba(232,69,69,.05)', border:'1px solid rgba(232,69,69,.2)', borderRadius:10, padding:'14px 15px' }}>
                  <div style={{ fontSize:10, color:'#e84545', letterSpacing:'.5px', marginBottom:7 }}>BEAR CASE</div>
                  <p style={{ fontSize:12.5, color:'#b8d0e0', lineHeight:1.55 }}>{a.bear_case}</p>
                </div>
              </div>
            </div>
            <div className="card" style={{ padding:'22px 24px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:16 }}>AGENT SCORES</div>
              <ScoreBar score={a.fundamentals_score} label="Fundamentals"/>
              <ScoreBar score={a.technical_score}    label="Technical"/>
              <ScoreBar score={a.sentiment_score}    label="Sentiment"/>
              <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #0c1e2e', display:'flex', flexDirection:'column', gap:9 }}>
                {[['Sentiment',a.sentiment,sClr],['vs Sector',a.vs_sector,a.vs_sector==='Outperform'?'#00c896':a.vs_sector==='Underperform'?'#e84545':'#f0b429'],['Wall St.',a.analyst_consensus,rCfg.clr]].map(([l,v,c])=>(
                  <div key={l as string} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'#6a90a8' }}>{l}</span>
                    <span style={{ fontSize:11, fontWeight:700, color: c as string }}>{v as string}</span>
                  </div>
                ))}
                {result.analystTotal>0 && (
                  <div style={{ marginTop:4 }}>
                    <div style={{ fontSize:10, color:'#2a4a62', marginBottom:4 }}>{result.analystBuy}B/{result.analystHold}H/{result.analystSell}S</div>
                    <div style={{ height:4, background:'#0c1e2e', borderRadius:2, overflow:'hidden', display:'flex' }}>
                      <div style={{ background:'#00c896', width:`${(result.analystBuy/result.analystTotal)*100}%` }}/>
                      <div style={{ background:'#f0b429', width:`${(result.analystHold/result.analystTotal)*100}%` }}/>
                      <div style={{ background:'#e84545', width:`${(result.analystSell/result.analystTotal)*100}%` }}/>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ENTRY/EXIT */}
          <div className="card" style={{ padding:'20px 24px', marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:16 }}>📍 ENTRY / EXIT STRATEGY</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
              {[
                { label:'Entry Zone',    val:`$${a.entry_low.toFixed(2)} – $${a.entry_high.toFixed(2)}`, clr:'#3b8eea' },
                { label:'Stop Loss',     val:`$${a.stop_loss.toFixed(2)}`,    clr:'#e84545' },
                { label:'Target 1',      val:`$${a.take_profit_1.toFixed(2)}`,clr:'#00c896' },
                { label:'Target 2',      val:`$${a.take_profit_2.toFixed(2)}`,clr:'#00e5a0' },
                { label:'R/R Ratio',     val: a.stop_loss&&a.entry_high ? `1 : ${(Math.abs(a.take_profit_1-a.entry_high)/Math.abs(a.entry_high-a.stop_loss)).toFixed(1)}` : 'N/A', clr:'#a855f7' },
                { label:'Allocation',    val:`${a.position_size_pct??2}%`,    clr:'#f0b429' },
              ].map(({label,val,clr})=>(
                <div key={label} style={{ background:`${clr}08`, border:`1px solid ${clr}25`, borderRadius:10, padding:'13px 15px', transition:'all .2s' }}>
                  <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color:clr, textShadow:`0 0 10px ${clr}60` }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* OPTIONS + POSITION CALC */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* OPTIONS */}
            <div className="card" style={{ padding:'22px 24px', borderColor: a.options.type==='CALL'?'#00c89640':a.options.type==='PUT'?'#e8454540':'#0c1e2e', boxShadow: a.options.type==='CALL'?'0 0 30px rgba(0,200,150,.1)':a.options.type==='PUT'?'0 0 30px rgba(232,69,69,.1)':'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
                <div>
                  <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>OPTIONS PLAY</div>
                  <div style={{ fontSize:20, fontWeight:900, color: a.options.type==='CALL'?'#00c896':a.options.type==='PUT'?'#e84545':'#f0b429' }}>{a.options.strategy}</div>
                </div>
                <div style={{ background: a.options.type==='CALL'?'#00c89615':'#e8454515', border:`1px solid ${a.options.type==='CALL'?'#00c89640':'#e8454540'}`, borderRadius:8, padding:'6px 14px', fontSize:13, fontWeight:900, color: a.options.type==='CALL'?'#00c896':'#e84545', fontFamily:'monospace' }}>
                  {a.options.type}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  {label:'Strike',      val:`$${a.options.strike.toFixed(2)}`},
                  {label:'Expiry',      val:`${a.options.expiry_days}d`},
                  {label:'Est. Premium',val:`$${a.options.est_premium.toFixed(2)}`},
                  {label:'Breakeven',   val:`$${(a.options.type==='CALL'?a.options.breakeven_call:a.options.breakeven_put).toFixed(2)}`},
                  {label:'Max Loss',    val:`$${a.options.max_loss}/contract`},
                  {label:'IV Note',     val:a.options.iv_environment?.split(' — ')[0]??'N/A'},
                ].map(({label,val})=>(
                  <div key={label} style={{ background:'rgba(7,14,22,.9)', border:'1px solid #0c1e2e', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:'#dce8f0' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'rgba(7,14,22,.9)', border:'1px solid #0c1e2e', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#b8d0e0', lineHeight:1.65 }}>
                <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:4 }}>REASONING</div>
                {a.options.reasoning}
              </div>
            </div>

            {/* POSITION CALC */}
            <div className="card" style={{ padding:'22px 24px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:16 }}>🧮 POSITION SIZING</div>
              {[{label:'Account Size ($)', val:account, set:setAccount},{label:'Risk per Trade (%)', val:riskPct, set:setRiskPct}].map(({label,val,set})=>(
                <div key={label} style={{ marginBottom:12 }}>
                  <div style={{ fontSize:11, color:'#6a90a8', marginBottom:6 }}>{label}</div>
                  <input value={val} onChange={e=>set(e.target.value)} style={{ width:'100%', background:'rgba(7,14,22,.9)', border:'1px solid #0c1e2e', borderRadius:8, padding:'10px 14px', color:'#dce8f0', fontSize:14, fontFamily:'monospace', fontWeight:700, outline:'none' }}/>
                </div>
              ))}
              <div style={{ borderTop:'1px solid #0c1e2e', paddingTop:14, display:'flex', flexDirection:'column', gap:9 }}>
                {[
                  {label:'Risk Amount',   val:`$${riskDollar}`,              clr:'#e84545'},
                  {label:'Stop Loss',     val:`$${a.stop_loss.toFixed(2)}`,  clr:'#f97316'},
                  {label:'Shares to Buy', val:posSize>0?posSize.toString():'N/A', clr:'#00c896'},
                  {label:'Position Value',val:posSize>0?`$${(posSize*result.price).toFixed(0)}`:'N/A', clr:'#3b8eea'},
                  {label:'AI Allocation', val:`${a.position_size_pct??2}% of portfolio`, clr:'#a855f7'},
                ].map(({label,val,clr})=>(
                  <div key={label} style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ fontSize:11, color:'#6a90a8' }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:clr, textShadow:`0 0 8px ${clr}60` }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* TIMEFRAMES + LEVELS + RISKS */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>⏱ MULTI-TIMEFRAME</div>
              {a.timeframes && Object.entries(a.timeframes).map(([tf,val])=>(
                <div key={tf} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #0c1e2e' }}>
                  <span style={{ fontSize:12, color:'#6a90a8' }}>{tf.replace('_',' ').toUpperCase()}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:TF_CLR[val as string]??'#f0b429', background:`${TF_CLR[val as string]??'#f0b429'}15`, padding:'3px 10px', borderRadius:12, border:`1px solid ${TF_CLR[val as string]??'#f0b429'}30`, textShadow:`0 0 8px ${TF_CLR[val as string]??'#f0b429'}` }}>{val as string}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>📏 KEY LEVELS</div>
              {a.key_levels && [
                {label:'Strong Resist.',val:a.key_levels.strong_resistance,clr:'#e84545'},
                {label:'Resistance',    val:a.key_levels.resistance,       clr:'#f97316'},
                {label:'Current',       val:result.price,                  clr:'#dce8f0'},
                {label:'Support',       val:a.key_levels.support,          clr:'#22d3a5'},
                {label:'Strong Support',val:a.key_levels.strong_support,   clr:'#00c896'},
              ].map(({label,val,clr})=>(
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background:`${clr}08`, borderRadius:7, padding:'8px 12px', marginBottom:5, border:`1px solid ${clr}20` }}>
                  <span style={{ fontSize:11, color:'#6a90a8' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:clr, textShadow:`0 0 8px ${clr}` }}>${(val??0).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="card" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:12 }}>⚡ CATALYSTS</div>
              {(a.catalysts??[]).map((c,i)=>(
                <div key={i} style={{ display:'flex', gap:10, background:'rgba(59,142,234,.08)', border:'1px solid rgba(59,142,234,.2)', borderRadius:8, padding:'9px 12px', marginBottom:7 }}>
                  <span style={{ color:'#3b8eea', fontSize:12, fontWeight:700 }}>{i+1}.</span>
                  <span style={{ fontSize:12, color:'#b8d0e0', lineHeight:1.5 }}>{c}</span>
                </div>
              ))}
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:10, marginTop:14 }}>🛡️ KEY RISKS</div>
              {(a.risks??[]).map((r,i)=>(
                <div key={i} style={{ display:'flex', gap:10, background:'rgba(232,69,69,.06)', border:'1px solid rgba(232,69,69,.18)', borderRadius:8, padding:'9px 12px', marginBottom:7 }}>
                  <span style={{ color:'#e84545', fontSize:12, fontWeight:700 }}>{i+1}.</span>
                  <span style={{ fontSize:12, color:'#b8d0e0', lineHeight:1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ANALYZE ANOTHER */}
          <div style={{ textAlign:'center', marginTop:28 }}>
            <p style={{ fontSize:12, color:'#6a90a8', marginBottom:14 }}>Analyze another stock</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center' }}>
              {POPULAR.filter(s=>s!==result.ticker).slice(0,10).map(s=><button key={s} className="chip" onClick={()=>analyze(s)}>{s}</button>)}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', padding:'20px', borderTop:'1px solid rgba(255,255,255,.04)', fontSize:10, color:'#1a3550', position:'relative', zIndex:1, background:'rgba(3,10,16,.8)', backdropFilter:'blur(12px)' }}>
        Not financial advice. For educational purposes only. Always do your own research.
      </div>
    </div>
  )
}
