'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'

const POPULAR = ['AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','GOOGL','SPY','QQQ','JPM','NFLX']

const AGENTS = [
  { icon: '📊', label: 'Fundamentals Agent', desc: 'Valuation, earnings, balance sheet' },
  { icon: '📈', label: 'Technical Agent',    desc: 'Trend, momentum, key levels' },
  { icon: '📰', label: 'Sentiment Agent',    desc: 'News flow & market narrative' },
  { icon: '🛡️', label: 'Risk Agent',         desc: 'Downside scenarios & hedges' },
  { icon: '🎯', label: 'Portfolio Manager',  desc: 'Final decision synthesis' },
]

const RATING_CFG: Record<string, { clr: string; bg: string; border: string }> = {
  'Strong Buy':  { clr: '#00e5a0', bg: '#00e5a008', border: '#00e5a040' },
  'Buy':         { clr: '#00c896', bg: '#00c89608', border: '#00c89630' },
  'Hold':        { clr: '#f0b429', bg: '#f0b42908', border: '#f0b42930' },
  'Sell':        { clr: '#f97316', bg: '#f9731608', border: '#f9731630' },
  'Strong Sell': { clr: '#e84545', bg: '#e8454508', border: '#e8454530' },
}
const SENT_CLR: Record<string, string> = {
  'Very Bullish': '#00e5a0', 'Bullish': '#00c896',
  'Neutral': '#f0b429',
  'Bearish': '#f97316',    'Very Bearish': '#e84545',
}
const TF_CLR: Record<string, string> = {
  Bullish: '#00c896', Neutral: '#f0b429', Bearish: '#e84545',
}

type Timeframes = { '1_week': string; '1_month': string; '3_months': string; '6_months': string }
type KeyLevels  = { strong_support: number; support: number; resistance: number; strong_resistance: number }
type Options    = { strategy: string; type: string; strike: number; expiry_days: number; est_premium: number; breakeven_call: number; breakeven_put: number; max_loss: number; iv_environment: string; reasoning: string }
type Analysis   = {
  rating: string; confidence: number; price_target: number; price_target_bear: number; price_target_bull: number
  time_horizon: string; executive_summary: string; investment_thesis: string
  bull_case: string; bear_case: string
  entry_low: number; entry_high: number; stop_loss: number; take_profit_1: number; take_profit_2: number
  position_size_pct: number
  key_levels: KeyLevels; risks: string[]; catalysts: string[]
  sentiment: string; fundamentals_score: number; technical_score: number; sentiment_score: number
  analyst_consensus: string; vs_sector: string; timeframes: Timeframes; options: Options
}
type Result = {
  ticker: string; name: string; price: number; change1d: number; prevClose: number
  high52: number; low52: number; pe: number; marketCap: number; beta: number; industry: string
  analystBuy: number; analystHold: number; analystSell: number; analystTotal: number; peerList: string
  analysis: Analysis
}

function Ring({ pct, clr, size = 96 }: { pct: number; clr: string; size?: number }) {
  const r = (size - 10) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#0f2030" strokeWidth={8} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth={8}
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transition: 'stroke-dasharray 1.2s ease' }} />
    </svg>
  )
}

function ScoreBar({ score, label, clr }: { score: number; label: string; clr?: string }) {
  const c = clr ?? (score >= 7 ? '#00c896' : score >= 5 ? '#f0b429' : '#e84545')
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#6a90a8' }}>{label}</span>
        <span style={{ fontSize: 12, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{score}/10</span>
      </div>
      <div style={{ height: 5, background: '#0c1e2e', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 10}%`, background: c, borderRadius: 3, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

function PriceBar({ low, current, target, high }: { low: number; current: number; target: number; high: number }) {
  const range  = high - low || 1
  const curPct = Math.max(0, Math.min(100, ((current - low) / range) * 100))
  const tgtPct = Math.max(0, Math.min(100, ((target  - low) / range) * 100))
  return (
    <div style={{ position: 'relative', height: 32, marginBottom: 8 }}>
      <div style={{ height: 6, background: 'linear-gradient(90deg,#e84545,#f0b429,#00c896)', borderRadius: 3, position: 'absolute', top: 13, left: 0, right: 0 }} />
      {/* current */}
      <div style={{ position: 'absolute', top: 0, left: `${curPct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 2, height: 32, background: '#dce8f0' }} />
        <span style={{ position: 'absolute', top: -16, fontSize: 9, color: '#dce8f0', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>${current.toFixed(0)}</span>
      </div>
      {/* target */}
      <div style={{ position: 'absolute', top: 0, left: `${tgtPct}%`, transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ width: 2, height: 32, background: '#00c896', opacity: 0.7 }} />
        <span style={{ position: 'absolute', bottom: -16, fontSize: 9, color: '#00c896', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>🎯 ${target.toFixed(0)}</span>
      </div>
    </div>
  )
}

export default function AIStocksPage() {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [agentIdx, setAgentIdx] = useState(0)
  const [result, setResult]   = useState<Result | null>(null)
  const [error, setError]     = useState('')
  const [account, setAccount] = useState('10000')
  const [riskPct, setRiskPct] = useState('1')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resultsRef  = useRef<HTMLDivElement>(null)

  const analyze = useCallback(async (sym: string) => {
    const t = sym.trim().toUpperCase()
    if (!t) return
    setInput(t); setLoading(true); setResult(null); setError('')
    let idx = 0
    intervalRef.current = setInterval(() => { idx = (idx + 1) % AGENTS.length; setAgentIdx(idx) }, 900)
    try {
      const r = await fetch('/api/stock-analyzer', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setError(d.error || 'Analysis failed'); return }
      setResult(d)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch { setError('Network error. Try again.') }
    finally { if (intervalRef.current) clearInterval(intervalRef.current); setLoading(false) }
  }, [])

  const a          = result?.analysis
  const rCfg       = RATING_CFG[a?.rating ?? ''] ?? RATING_CFG['Hold']
  const sClr       = SENT_CLR[a?.sentiment ?? ''] ?? '#f0b429'
  const upDay      = (result?.change1d ?? 0) >= 0
  const accNum     = parseFloat(account) || 10000
  const riskNum    = parseFloat(riskPct) || 1
  const riskDollar = (accNum * riskNum / 100).toFixed(0)
  const posSize    = a && result && a.stop_loss && result.price > a.stop_loss
    ? Math.floor(parseFloat(riskDollar) / Math.abs(result.price - a.stop_loss))
    : 0
  const posValue   = posSize * (result?.price ?? 0)

  return (
    <div style={{ background: '#030a10', color: '#dce8f0', fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes scan{0%{top:-100%}100%{top:100%}}
        @keyframes shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .fu{animation:fadeUp .5s ease both}
        .card{background:#060d14;border:1px solid #0c1e2e;border-radius:14px}
        .chip{background:#070f17;border:1px solid #0c1e2e;border-radius:20px;padding:6px 14px;font-size:12px;cursor:pointer;color:#6a90a8;transition:all .15s;font-family:monospace;font-weight:700;letter-spacing:.5px}
        .chip:hover{border-color:#00c89660;color:#00c896;background:#00c89608}
        .nav-link{font-size:13px;color:#6a90a8;text-decoration:none;transition:color .15s}
        .nav-link:hover{color:#dce8f0}
        .inp{background:transparent;border:none;padding:18px 20px;font-size:17px;color:#dce8f0;font-family:monospace;font-weight:700;letter-spacing:1px;width:100%}
        .inp:focus{outline:none}
        .tag{display:inline-flex;align-items:center;gap:6px;background:#00c89612;border:1px solid #00c89630;border-radius:20px;padding:5px 14px;font-size:11px;color:#00c896;font-weight:600;letter-spacing:.5px}
        ::selection{background:#00c89630}
        @media(max-width:700px){.hide-sm{display:none!important}.grid-r{grid-template-columns:1fr!important}}
      `}</style>

      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 28px', borderBottom:'1px solid #0c1e2e', position:'sticky', top:0, zIndex:50, background:'#030a10ee', backdropFilter:'blur(14px)' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none' }}>
          <div style={{ width:28, height:28, background:'linear-gradient(135deg,#00c896,#3b8eea)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⚡</div>
          <span style={{ fontWeight:800, fontSize:14, color:'#dce8f0' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:22 }}>
          <Link href="/daily"   className="nav-link">Daily Intel</Link>
          <Link href="/arena"   className="nav-link">Arena</Link>
          <Link href="/courses" className="nav-link">Courses</Link>
          <Link href="/app"     className="nav-link">Terminal</Link>
        </div>
        <Link href="/app" style={{ background:'linear-gradient(135deg,#00c896,#3b8eea)', color:'#fff', padding:'8px 16px', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>Launch App →</Link>
      </nav>

      {/* HERO */}
      <div style={{ textAlign:'center', padding:'64px 24px 48px', maxWidth:800, margin:'0 auto' }}>
        <div className="tag fu" style={{ marginBottom:24 }}>
          <span style={{ width:6, height:6, borderRadius:'50%', background:'#00c896', display:'inline-block', animation:'pulse 1.5s infinite' }} />
          5-AGENT AI · GEMINI 2.0 · INSTITUTIONAL RESEARCH
        </div>
        <h1 className="fu" style={{ fontSize:'clamp(34px,6vw,64px)', fontWeight:900, lineHeight:1.05, letterSpacing:'-2px', marginBottom:16 }}>
          AI Stock{' '}
          <span style={{ background:'linear-gradient(135deg,#00c896,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Analyzer</span>
        </h1>
        <p className="fu" style={{ fontSize:17, color:'#6a90a8', lineHeight:1.65, marginBottom:40 }}>
          Five specialized AI agents dissect any stock — entry zones, stop loss, price targets, options play, catalysts, and multi-timeframe outlook. The kind of research that takes analysts hours, done in seconds.
        </p>

        {/* SEARCH */}
        <div className="fu" style={{ maxWidth:540, margin:'0 auto 20px' }}>
          <div style={{ display:'flex', background:'#060d14', border:`1px solid ${loading ? '#00c89650' : '#0c1e2e'}`, borderRadius:14, overflow:'hidden', boxShadow: loading ? '0 0 32px #00c89618' : 'none', transition:'all .3s' }}>
            <input className="inp" value={input} onChange={e => setInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === 'Enter' && analyze(input)} placeholder="AAPL, TSLA, NVDA..." />
            <button onClick={() => analyze(input)} disabled={loading}
              style={{ background: loading ? '#0c1e2e' : 'linear-gradient(135deg,#00c896,#3b8eea)', border:'none', padding:'0 26px', cursor: loading ? 'not-allowed' : 'pointer', color:'#fff', fontWeight:800, fontSize:13, letterSpacing:'.5px', transition:'all .2s', whiteSpace:'nowrap' }}>
              {loading ? '···' : 'ANALYZE →'}
            </button>
          </div>
        </div>
        <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center', marginBottom:12 }}>
          {POPULAR.map(s => <button key={s} className="chip" onClick={() => analyze(s)}>{s}</button>)}
        </div>
        <p style={{ fontSize:11, color:'#1a3550' }}>Type any ticker · ~15 second analysis · Free forever</p>
      </div>

      {/* LOADING */}
      {loading && (
        <div style={{ maxWidth:600, margin:'0 auto 56px', padding:'0 24px' }}>
          <div className="card" style={{ padding:28, position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#00c896,transparent)', animation:'scan 1.6s linear infinite' }} />
            <div style={{ textAlign:'center', marginBottom:24 }}>
              <div style={{ display:'inline-block', width:40, height:40, border:'3px solid #0c1e2e', borderTop:'3px solid #00c896', borderRadius:'50%', animation:'spin .8s linear infinite', marginBottom:14 }} />
              <div style={{ fontSize:15, fontWeight:700 }}>Analyzing {input}...</div>
              <div style={{ fontSize:12, color:'#6a90a8', marginTop:4 }}>Agents working in parallel</div>
            </div>
            {AGENTS.map((ag, i) => (
              <div key={ag.label} style={{ display:'flex', alignItems:'center', gap:10, padding:'9px 12px', borderRadius:8, marginBottom:4, background: i===agentIdx ? '#00c89610' : 'transparent', border:`1px solid ${i===agentIdx ? '#00c89640' : 'transparent'}`, transition:'all .25s' }}>
                <span style={{ fontSize:16 }}>{ag.icon}</span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:12, fontWeight:600, color: i===agentIdx ? '#00c896' : '#6a90a8' }}>{ag.label}</div>
                  <div style={{ fontSize:11, color:'#1a3550' }}>{ag.desc}</div>
                </div>
                {i < agentIdx && <span style={{ color:'#00c896', fontSize:12 }}>✓</span>}
                {i === agentIdx && <span style={{ width:7, height:7, borderRadius:'50%', background:'#00c896', display:'inline-block', animation:'pulse .8s infinite' }} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div style={{ maxWidth:560, margin:'0 auto 48px', padding:'0 24px' }}>
          <div style={{ background:'#e8454512', border:'1px solid #e8454530', borderRadius:12, padding:'14px 18px', color:'#e84545', fontSize:13 }}>⚠ {error}</div>
        </div>
      )}

      {/* ── RESULTS ── */}
      {result && a && !loading && (
        <div ref={resultsRef} style={{ maxWidth:1060, margin:'0 auto 80px', padding:'0 20px' }}>

          {/* HEADER */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16, marginBottom:20 }}>
            <div>
              <div style={{ fontSize:12, color:'#6a90a8', marginBottom:4 }}>{result.industry} · {result.ticker}</div>
              <h2 style={{ fontSize:28, fontWeight:900, letterSpacing:'-1px', marginBottom:8 }}>{result.name}</h2>
              <div style={{ display:'flex', alignItems:'center', gap:14, flexWrap:'wrap' }}>
                <span style={{ fontSize:30, fontWeight:900, fontFamily:'monospace' }}>${result.price.toFixed(2)}</span>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:'monospace', color: upDay ? '#00c896' : '#e84545' }}>{upDay ? '+' : ''}{result.change1d.toFixed(2)}%</span>
                <span style={{ fontSize:11, color:'#2a4a62', fontFamily:'monospace' }}>52W ${result.low52.toFixed(0)}–${result.high52.toFixed(0)}</span>
                {result.pe > 0 && <span style={{ fontSize:11, color:'#2a4a62' }}>P/E {result.pe.toFixed(1)}</span>}
                {result.marketCap > 0 && <span style={{ fontSize:11, color:'#2a4a62' }}>MCap ${(result.marketCap/1000).toFixed(1)}B</span>}
              </div>
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap', alignItems:'center' }}>
              {/* Confidence ring */}
              <div style={{ position:'relative', width:96, height:96 }}>
                <Ring pct={a.confidence} clr={rCfg.clr} size={96} />
                <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                  <span style={{ fontSize:18, fontWeight:900, color:rCfg.clr, fontFamily:'monospace' }}>{a.confidence}</span>
                  <span style={{ fontSize:8, color:'#6a90a8', letterSpacing:.5 }}>CONFIDENCE</span>
                </div>
              </div>
              {/* Verdict */}
              <div style={{ background:rCfg.bg, border:`1px solid ${rCfg.border}`, borderRadius:12, padding:'14px 22px', textAlign:'center', minWidth:150 }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>AI VERDICT</div>
                <div style={{ fontSize:22, fontWeight:900, color:rCfg.clr, letterSpacing:'-0.5px' }}>{a.rating}</div>
                <div style={{ fontSize:10, color:'#6a90a8', marginTop:4 }}>{a.time_horizon}</div>
              </div>
              {/* Price target */}
              <div style={{ background:'#060d14', border:'1px solid #0c1e2e', borderRadius:12, padding:'14px 22px', textAlign:'center', minWidth:150 }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>12-MONTH TARGET</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#3b8eea', fontFamily:'monospace' }}>${a.price_target.toFixed(2)}</div>
                <div style={{ fontSize:10, color:'#6a90a8', marginTop:4 }}>
                  {((a.price_target - result.price) / result.price * 100).toFixed(1)}% upside
                </div>
              </div>
            </div>
          </div>

          {/* PRICE RANGE BAR */}
          <div className="card fu" style={{ padding:'18px 22px', marginBottom:14 }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:16, fontSize:11, color:'#6a90a8' }}>
              <span>52W LOW ${result.low52.toFixed(2)}</span>
              <span>PRICE TARGET RANGE</span>
              <span>52W HIGH ${result.high52.toFixed(2)}</span>
            </div>
            <PriceBar low={result.low52} current={result.price} target={a.price_target} high={Math.max(result.high52, a.price_target_bull ?? a.price_target * 1.1)} />
            <div style={{ display:'flex', justifyContent:'space-between', marginTop:20, fontSize:11 }}>
              {[
                { label:'Bear Target', val: a.price_target_bear, clr:'#e84545' },
                { label:'Base Target', val: a.price_target,      clr:'#3b8eea' },
                { label:'Bull Target', val: a.price_target_bull, clr:'#00c896' },
              ].map(({ label, val, clr }) => (
                <div key={label} style={{ textAlign:'center' }}>
                  <div style={{ color:'#6a90a8', marginBottom:3 }}>{label}</div>
                  <div style={{ fontFamily:'monospace', fontWeight:800, color: clr, fontSize:14 }}>${(val ?? 0).toFixed(2)}</div>
                </div>
              ))}
            </div>
          </div>

          {/* EXECUTIVE SUMMARY */}
          <div className="card fu" style={{ padding:'20px 22px', marginBottom:14, borderLeft:`3px solid ${rCfg.clr}` }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:10 }}>EXECUTIVE SUMMARY</div>
            <p style={{ fontSize:14, lineHeight:1.7, color:'#b8d0e0' }}>{a.executive_summary}</p>
          </div>

          {/* ROW 1: THESIS + SCORES */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:14, marginBottom:14 }}>
            <div className="card fu" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>🎯 INVESTMENT THESIS</div>
              <p style={{ fontSize:13.5, lineHeight:1.75, color:'#b8d0e0', marginBottom:18 }}>{a.investment_thesis}</p>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                <div style={{ background:'#00c89608', border:'1px solid #00c89625', borderRadius:10, padding:'13px 15px' }}>
                  <div style={{ fontSize:10, color:'#00c896', letterSpacing:'.5px', marginBottom:7 }}>BULL CASE</div>
                  <p style={{ fontSize:12.5, color:'#b8d0e0', lineHeight:1.55 }}>{a.bull_case}</p>
                </div>
                <div style={{ background:'#e8454508', border:'1px solid #e8454525', borderRadius:10, padding:'13px 15px' }}>
                  <div style={{ fontSize:10, color:'#e84545', letterSpacing:'.5px', marginBottom:7 }}>BEAR CASE</div>
                  <p style={{ fontSize:12.5, color:'#b8d0e0', lineHeight:1.55 }}>{a.bear_case}</p>
                </div>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {/* Scores */}
              <div className="card fu" style={{ padding:'20px 22px' }}>
                <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>AGENT SCORES</div>
                <ScoreBar score={a.fundamentals_score} label="Fundamentals" />
                <ScoreBar score={a.technical_score}    label="Technical" />
                <ScoreBar score={a.sentiment_score}    label="Sentiment" />
                <div style={{ marginTop:14, paddingTop:14, borderTop:'1px solid #0c1e2e', display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    { label:'Sentiment',   val: a.sentiment,          clr: sClr },
                    { label:'vs Sector',   val: a.vs_sector,          clr: a.vs_sector === 'Outperform' ? '#00c896' : a.vs_sector === 'Underperform' ? '#e84545' : '#f0b429' },
                    { label:'Wall St.',    val: a.analyst_consensus,  clr: rCfg.clr },
                  ].map(({ label, val, clr }) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ fontSize:11, color:'#6a90a8' }}>{label}</span>
                      <span style={{ fontSize:11, fontWeight:700, color: clr }}>{val}</span>
                    </div>
                  ))}
                  {result.analystTotal > 0 && (
                    <div style={{ marginTop:6 }}>
                      <div style={{ fontSize:10, color:'#2a4a62', marginBottom:4 }}>
                        {result.analystBuy}B / {result.analystHold}H / {result.analystSell}S ({result.analystTotal} analysts)
                      </div>
                      <div style={{ height:4, background:'#0c1e2e', borderRadius:2, overflow:'hidden', display:'flex' }}>
                        <div style={{ background:'#00c896', width:`${(result.analystBuy / result.analystTotal) * 100}%` }} />
                        <div style={{ background:'#f0b429', width:`${(result.analystHold / result.analystTotal) * 100}%` }} />
                        <div style={{ background:'#e84545', width:`${(result.analystSell / result.analystTotal) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ENTRY / EXIT STRATEGY */}
          <div className="card fu" style={{ padding:'20px 22px', marginBottom:14 }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:16 }}>📍 ENTRY / EXIT STRATEGY</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:10 }}>
              {[
                { label:'Entry Zone',     val:`$${a.entry_low.toFixed(2)} – $${a.entry_high.toFixed(2)}`, clr:'#3b8eea',  bg:'#3b8eea0a' },
                { label:'Stop Loss',      val:`$${a.stop_loss.toFixed(2)}`,   clr:'#e84545',  bg:'#e845450a' },
                { label:'Target 1',       val:`$${a.take_profit_1.toFixed(2)}`,clr:'#00c896',  bg:'#00c8960a' },
                { label:'Target 2',       val:`$${a.take_profit_2.toFixed(2)}`,clr:'#00e5a0',  bg:'#00e5a00a' },
                { label:'Risk/Reward',    val: a.stop_loss && a.entry_high
                  ? `1 : ${(Math.abs(a.take_profit_1 - a.entry_high) / Math.abs(a.entry_high - a.stop_loss)).toFixed(1)}`
                  : 'N/A',                                                     clr:'#a855f7',  bg:'#a855f70a' },
                { label:'Allocation',     val:`${a.position_size_pct ?? 2}% of portfolio`, clr:'#f0b429', bg:'#f0b4290a' },
              ].map(({ label, val, clr, bg }) => (
                <div key={label} style={{ background: bg, border:`1px solid ${clr}25`, borderRadius:10, padding:'13px 15px' }}>
                  <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:14, fontWeight:800, fontFamily:'monospace', color: clr }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ROW 2: OPTIONS + POSITION CALC */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>
            {/* OPTIONS */}
            <div className="card fu" style={{ padding:'20px 22px', borderColor: a.options.type === 'CALL' ? '#00c89640' : a.options.type === 'PUT' ? '#e8454540' : '#0c1e2e' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                <div>
                  <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>OPTIONS PLAY</div>
                  <div style={{ fontSize:18, fontWeight:900, color: a.options.type === 'CALL' ? '#00c896' : a.options.type === 'PUT' ? '#e84545' : '#f0b429' }}>{a.options.strategy}</div>
                </div>
                <div style={{ background: a.options.type === 'CALL' ? '#00c89615' : a.options.type === 'PUT' ? '#e8454515' : '#f0b42915', border: `1px solid ${a.options.type === 'CALL' ? '#00c89640' : a.options.type === 'PUT' ? '#e8454540' : '#f0b42940'}`, borderRadius:8, padding:'6px 12px', fontSize:12, fontWeight:800, color: a.options.type === 'CALL' ? '#00c896' : a.options.type === 'PUT' ? '#e84545' : '#f0b429' }}>
                  {a.options.type}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:14 }}>
                {[
                  { label:'Strike',      val:`$${a.options.strike.toFixed(2)}` },
                  { label:'Expiry',      val:`${a.options.expiry_days} days` },
                  { label:'Est. Premium',val:`$${a.options.est_premium.toFixed(2)}`},
                  { label:'Breakeven',   val:`$${(a.options.type === 'CALL' ? a.options.breakeven_call : a.options.breakeven_put).toFixed(2)}` },
                  { label:'Max Loss',    val:`$${a.options.max_loss} / contract` },
                  { label:'IV Note',     val: a.options.iv_environment?.split(' — ')[0] ?? 'N/A' },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background:'#070e16', border:'1px solid #0c1e2e', borderRadius:8, padding:'10px 12px' }}>
                    <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:4 }}>{label}</div>
                    <div style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color:'#dce8f0' }}>{val}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:'#070e16', border:'1px solid #0c1e2e', borderRadius:8, padding:'12px 14px', fontSize:12, color:'#b8d0e0', lineHeight:1.6 }}>
                <div style={{ fontSize:9, color:'#6a90a8', letterSpacing:'.5px', marginBottom:5 }}>IV ENVIRONMENT</div>
                {a.options.iv_environment}
                <div style={{ marginTop:8, fontSize:9, color:'#6a90a8', letterSpacing:'.5px' }}>REASONING</div>
                <div style={{ marginTop:4 }}>{a.options.reasoning}</div>
              </div>
            </div>

            {/* POSITION SIZING CALCULATOR */}
            <div className="card fu" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:16 }}>🧮 POSITION SIZING CALCULATOR</div>
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#6a90a8', marginBottom:6 }}>Account Size ($)</div>
                <input value={account} onChange={e => setAccount(e.target.value)}
                  style={{ width:'100%', background:'#070e16', border:'1px solid #0c1e2e', borderRadius:8, padding:'10px 14px', color:'#dce8f0', fontSize:14, fontFamily:'monospace', fontWeight:700 }} />
              </div>
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'#6a90a8', marginBottom:6 }}>Risk per Trade (%)</div>
                <input value={riskPct} onChange={e => setRiskPct(e.target.value)}
                  style={{ width:'100%', background:'#070e16', border:'1px solid #0c1e2e', borderRadius:8, padding:'10px 14px', color:'#dce8f0', fontSize:14, fontFamily:'monospace', fontWeight:700 }} />
              </div>
              <div style={{ borderTop:'1px solid #0c1e2e', paddingTop:14, display:'flex', flexDirection:'column', gap:9 }}>
                {[
                  { label:'Risk Amount',   val:`$${riskDollar}`,               clr:'#e84545' },
                  { label:'Entry Price',   val:`$${result.price.toFixed(2)}`,   clr:'#dce8f0' },
                  { label:'Stop Loss',     val:`$${a.stop_loss.toFixed(2)}`,    clr:'#f97316' },
                  { label:'Shares to Buy', val: posSize > 0 ? posSize.toString() : 'N/A', clr:'#00c896' },
                  { label:'Position Value',val: posSize > 0 ? `$${posValue.toFixed(0)}` : 'N/A', clr:'#3b8eea' },
                  { label:'AI Allocation', val:`${a.position_size_pct ?? 2}% of portfolio`, clr:'#a855f7' },
                ].map(({ label, val, clr }) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:12, color:'#6a90a8' }}>{label}</span>
                    <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color: clr }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ROW 3: TIMEFRAMES + KEY LEVELS + RISKS */}
          <div className="grid-r" style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:14, marginBottom:14 }}>

            {/* TIMEFRAMES */}
            <div className="card fu" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>⏱ MULTI-TIMEFRAME OUTLOOK</div>
              {a.timeframes && Object.entries(a.timeframes).map(([tf, val]) => (
                <div key={tf} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'9px 0', borderBottom:'1px solid #0c1e2e' }}>
                  <span style={{ fontSize:12, color:'#6a90a8' }}>{tf.replace('_', ' ').toUpperCase()}</span>
                  <span style={{ fontSize:12, fontWeight:700, color: TF_CLR[val as string] ?? '#f0b429', background: `${TF_CLR[val as string] ?? '#f0b429'}15`, padding:'3px 10px', borderRadius:12, border:`1px solid ${TF_CLR[val as string] ?? '#f0b429'}30` }}>{val as string}</span>
                </div>
              ))}
            </div>

            {/* KEY LEVELS */}
            <div className="card fu" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>📏 KEY PRICE LEVELS</div>
              {a.key_levels && [
                { label:'Strong Resistance', val: a.key_levels.strong_resistance, clr:'#e84545', bg:'#e8454510' },
                { label:'Resistance',         val: a.key_levels.resistance,        clr:'#f97316', bg:'#f9731608' },
                { label:'Current',            val: result.price,                   clr:'#dce8f0', bg:'#dce8f010' },
                { label:'Support',            val: a.key_levels.support,           clr:'#22d3a5', bg:'#22d3a508' },
                { label:'Strong Support',     val: a.key_levels.strong_support,    clr:'#00c896', bg:'#00c89610' },
              ].map(({ label, val, clr, bg }) => (
                <div key={label} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', background: bg, borderRadius:7, padding:'8px 12px', marginBottom:5 }}>
                  <span style={{ fontSize:11, color:'#6a90a8' }}>{label}</span>
                  <span style={{ fontSize:13, fontWeight:800, fontFamily:'monospace', color: clr }}>${(val ?? 0).toFixed(2)}</span>
                </div>
              ))}
            </div>

            {/* RISKS + CATALYSTS */}
            <div className="card fu" style={{ padding:'20px 22px' }}>
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:12 }}>⚡ UPCOMING CATALYSTS</div>
              {(a.catalysts ?? []).map((c, i) => (
                <div key={i} style={{ display:'flex', gap:10, background:'#3b8eea0a', border:'1px solid #3b8eea20', borderRadius:8, padding:'9px 12px', marginBottom:7 }}>
                  <span style={{ color:'#3b8eea', fontSize:12, fontWeight:700 }}>{i+1}.</span>
                  <span style={{ fontSize:12, color:'#b8d0e0', lineHeight:1.5 }}>{c}</span>
                </div>
              ))}
              <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:12, marginTop:14 }}>🛡️ KEY RISKS</div>
              {(a.risks ?? []).map((r, i) => (
                <div key={i} style={{ display:'flex', gap:10, background:'#e8454508', border:'1px solid #e8454520', borderRadius:8, padding:'9px 12px', marginBottom:7 }}>
                  <span style={{ color:'#e84545', fontSize:12, fontWeight:700 }}>{i+1}.</span>
                  <span style={{ fontSize:12, color:'#b8d0e0', lineHeight:1.5 }}>{r}</span>
                </div>
              ))}
            </div>
          </div>

          {/* AGENTS FOOTER */}
          <div className="card fu" style={{ padding:'18px 22px', marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'.5px', marginBottom:14 }}>RESEARCH TEAM</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:8 }}>
              {AGENTS.map(ag => (
                <div key={ag.label} style={{ display:'flex', gap:8, alignItems:'center', background:'#070e16', border:'1px solid #0c1e2e', borderRadius:10, padding:'10px 14px' }}>
                  <span style={{ fontSize:18 }}>{ag.icon}</span>
                  <div>
                    <div style={{ fontSize:11, fontWeight:600, color:'#dce8f0' }}>{ag.label}</div>
                    <div style={{ fontSize:10, color:'#2a4a62' }}>{ag.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:12, color:'#6a90a8', marginBottom:14 }}>Analyze another stock</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:7, justifyContent:'center' }}>
              {POPULAR.filter(s => s !== result.ticker).slice(0, 10).map(s => <button key={s} className="chip" onClick={() => analyze(s)}>{s}</button>)}
            </div>
          </div>
        </div>
      )}

      <div style={{ textAlign:'center', padding:'20px', borderTop:'1px solid #0a1a26', fontSize:10, color:'#1a3550' }}>
        Not financial advice. For educational purposes only. Always do your own research before trading.
      </div>
    </div>
  )
}
