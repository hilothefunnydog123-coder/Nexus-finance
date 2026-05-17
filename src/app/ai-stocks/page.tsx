'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'AMD', 'GOOGL', 'SPY', 'QQQ', 'JPM', 'NFLX']

const AGENTS = [
  { id: 'fundamentals', label: 'Fundamentals Agent', icon: '📊', desc: 'P/E, EPS, ROE, growth metrics' },
  { id: 'technical',    label: 'Technical Agent',    icon: '📈', desc: 'Trend, momentum, key levels' },
  { id: 'sentiment',    label: 'Sentiment Agent',    icon: '📰', desc: 'News flow & market narrative' },
  { id: 'risk',         label: 'Risk Agent',         icon: '🛡️', desc: 'Downside scenarios & hedges' },
  { id: 'portfolio',    label: 'Portfolio Manager',  icon: '🎯', desc: 'Final decision synthesis' },
]

type Analysis = {
  rating: string; confidence: number; price_target: number; time_horizon: string
  executive_summary: string; investment_thesis: string
  bull_case: string; bear_case: string
  key_levels: { support: number; resistance: number }
  risks: string[]
  sentiment: string
  fundamentals_score: number; technical_score: number; sentiment_score: number
  options: {
    strategy: string; type: string; strike: number; expiry_days: number
    breakeven_call: number; breakeven_put: number; reasoning: string
  }
}

type Result = {
  ticker: string; name: string; price: number; change1d: number
  high52: number; low52: number; sma20: string; trend: string
  pe: number; marketCap: number; beta: number; industry: string
  analysis: Analysis
}

const RATING_CLR: Record<string, string> = {
  'Buy': '#00c896', 'Overweight': '#22d3a5', 'Hold': '#f0b429',
  'Underweight': '#f97316', 'Sell': '#e84545',
}
const SENT_CLR: Record<string, string> = {
  Bullish: '#00c896', Neutral: '#f0b429', Bearish: '#e84545',
}

function ScoreBar({ score, label }: { score: number; label: string }) {
  const clr = score >= 7 ? '#00c896' : score >= 5 ? '#f0b429' : '#e84545'
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#6a90a8' }}>{label}</span>
        <span style={{ fontSize: 12, color: clr, fontWeight: 700, fontFamily: 'monospace' }}>{score}/10</span>
      </div>
      <div style={{ height: 4, background: '#0f2030', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${score * 10}%`, background: clr, borderRadius: 2, transition: 'width 1s ease' }} />
      </div>
    </div>
  )
}

export default function AIStocksPage() {
  const [ticker, setTicker]   = useState('')
  const [loading, setLoading] = useState(false)
  const [agentIdx, setAgentIdx] = useState(0)
  const [result, setResult]   = useState<Result | null>(null)
  const [error, setError]     = useState('')
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const resultsRef  = useRef<HTMLDivElement>(null)

  async function analyze(sym: string) {
    const t = sym.trim().toUpperCase()
    if (!t) return
    setTicker(t)
    setLoading(true)
    setResult(null)
    setError('')
    setAgentIdx(0)

    // Cycle through agent indicators while loading
    let idx = 0
    intervalRef.current = setInterval(() => {
      idx = (idx + 1) % AGENTS.length
      setAgentIdx(idx)
    }, 900)

    try {
      const r = await fetch('/api/stock-analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t }),
      })
      const d = await r.json()
      if (!r.ok || d.error) { setError(d.error || 'Analysis failed. Try again.'); return }
      setResult(d)
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch {
      setError('Network error. Try again.')
    } finally {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setLoading(false)
    }
  }

  const rating  = result?.analysis.rating ?? ''
  const rClr    = RATING_CLR[rating] ?? '#f0b429'
  const sClr    = SENT_CLR[result?.analysis.sentiment ?? ''] ?? '#f0b429'
  const upDay   = (result?.change1d ?? 0) >= 0

  return (
    <div style={{ background: '#03080d', color: '#dce8f0', fontFamily: '"Inter", system-ui, sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes spin     { to{transform:rotate(360deg)} }
        @keyframes glow     { 0%,100%{box-shadow:0 0 20px #00c89620} 50%{box-shadow:0 0 40px #00c89640} }
        @keyframes scanline { 0%{top:-100%} 100%{top:100%} }
        @keyframes agentIn  { from{opacity:0;transform:translateX(-8px)} to{opacity:1;transform:translateX(0)} }
        .fade-up { animation: fadeUp .6s ease both }
        .card { background: #060f18; border: 1px solid #0f2030; border-radius: 14px; }
        .chip { background: #070f17; border: 1px solid #0f2030; border-radius: 20px; padding: 6px 14px; font-size: 12px; cursor: pointer; color: #6a90a8; transition: all .15s; font-family: monospace; font-weight: 700; letter-spacing: .5px; }
        .chip:hover { border-color: #00c89660; color: #00c896; background: #00c89608; }
        .score-ring { width: 64px; height: 64px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 900; font-family: monospace; }
        .agent-row { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; transition: all .2s; }
        .agent-row.active { background: #00c89610; border-color: #00c89640; }
        .nav-link { font-size: 13px; color: #6a90a8; text-decoration: none; transition: color .15s; }
        .nav-link:hover { color: #dce8f0; }
        input:focus { outline: none; }
        ::selection { background: #00c89630; }
      `}</style>

      {/* NAV */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 32px', borderBottom: '1px solid #0f2030', position: 'sticky', top: 0, zIndex: 50, background: '#03080de8', backdropFilter: 'blur(12px)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg,#00c896,#3b8eea)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#dce8f0', letterSpacing: '-0.3px' }}>YN Finance</span>
        </Link>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <Link href="/daily"    className="nav-link">Daily Intel</Link>
          <Link href="/arena"    className="nav-link">Arena</Link>
          <Link href="/courses"  className="nav-link">Courses</Link>
          <Link href="/app"      className="nav-link">Terminal</Link>
          <Link href="/app" style={{ background: 'linear-gradient(135deg,#00c896,#3b8eea)', color: '#fff', padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Launch App</Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ textAlign: 'center', padding: '80px 24px 60px', maxWidth: 860, margin: '0 auto' }}>
        <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00c89612', border: '1px solid #00c89630', borderRadius: 20, padding: '6px 16px', marginBottom: 28, fontSize: 12, color: '#00c896', fontWeight: 600, letterSpacing: '.5px' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00c896', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
          MULTI-AGENT AI · POWERED BY GEMINI 2.5
        </div>
        <h1 className="fade-up" style={{ fontSize: 'clamp(36px,6vw,68px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: '-2px', marginBottom: 20 }}>
          AI Stock{' '}
          <span style={{ background: 'linear-gradient(135deg,#00c896,#3b8eea)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Analyzer</span>
        </h1>
        <p className="fade-up" style={{ fontSize: 'clamp(15px,2vw,19px)', color: '#6a90a8', lineHeight: 1.6, marginBottom: 48, maxWidth: 600, margin: '0 auto 48px' }}>
          5 specialized AI agents analyze any stock in seconds — fundamentals, technicals, news sentiment, risk, and options strategy. Institutional-grade research, free.
        </p>

        {/* SEARCH */}
        <div className="fade-up" style={{ position: 'relative', maxWidth: 560, margin: '0 auto 24px' }}>
          <div style={{ display: 'flex', background: '#060f18', border: '1px solid #0f2030', borderRadius: 14, overflow: 'hidden', transition: 'border-color .2s', boxShadow: loading ? '0 0 30px #00c89620' : 'none' }}>
            <input
              value={ticker}
              onChange={e => setTicker(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && analyze(ticker)}
              placeholder="Enter ticker — AAPL, TSLA, NVDA..."
              style={{ flex: 1, background: 'transparent', border: 'none', padding: '18px 20px', fontSize: 17, color: '#dce8f0', fontFamily: 'monospace', fontWeight: 700, letterSpacing: 1 }}
            />
            <button
              onClick={() => analyze(ticker)}
              disabled={loading}
              style={{ background: loading ? '#0f2030' : 'linear-gradient(135deg,#00c896,#3b8eea)', border: 'none', padding: '0 28px', cursor: loading ? 'not-allowed' : 'pointer', color: '#fff', fontWeight: 700, fontSize: 14, letterSpacing: '.5px', transition: 'all .2s' }}
            >
              {loading ? '...' : 'ANALYZE →'}
            </button>
          </div>
        </div>

        {/* QUICK PICKS */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginBottom: 16 }}>
          {POPULAR.map(s => (
            <button key={s} className="chip" onClick={() => analyze(s)}>{s}</button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: '#2a4a62' }}>Click any ticker or type your own · Analysis takes ~15 seconds</p>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div style={{ maxWidth: 680, margin: '0 auto 60px', padding: '0 24px' }}>
          <div className="card" style={{ padding: 32, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: 'linear-gradient(90deg,transparent,#00c896,transparent)', animation: 'scanline 1.5s linear infinite' }} />
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ display: 'inline-block', width: 48, height: 48, border: '3px solid #0f2030', borderTop: '3px solid #00c896', borderRadius: '50%', animation: 'spin 0.8s linear infinite', marginBottom: 16 }} />
              <div style={{ fontSize: 16, fontWeight: 700, color: '#dce8f0' }}>Analyzing {ticker}</div>
              <div style={{ fontSize: 13, color: '#6a90a8', marginTop: 6 }}>Agents are working in parallel...</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {AGENTS.map((a, i) => (
                <div key={a.id} className="agent-row" style={{ border: `1px solid ${i === agentIdx ? '#00c89640' : 'transparent'}`, background: i === agentIdx ? '#00c89610' : 'transparent', animation: i === agentIdx ? 'agentIn .3s ease' : '' }}>
                  <span style={{ fontSize: 18 }}>{a.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: i === agentIdx ? '#00c896' : '#6a90a8' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: '#2a4a62' }}>{a.desc}</div>
                  </div>
                  {i < agentIdx && <span style={{ color: '#00c896', fontSize: 13 }}>✓</span>}
                  {i === agentIdx && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00c896', display: 'inline-block', animation: 'pulse .8s infinite' }} />}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ERROR */}
      {error && (
        <div style={{ maxWidth: 560, margin: '0 auto 48px', padding: '0 24px' }}>
          <div style={{ background: '#e8454512', border: '1px solid #e8454530', borderRadius: 12, padding: '16px 20px', color: '#e84545', fontSize: 14 }}>⚠ {error}</div>
        </div>
      )}

      {/* RESULTS */}
      {result && !loading && (
        <div ref={resultsRef} style={{ maxWidth: 1000, margin: '0 auto 80px', padding: '0 24px' }}>

          {/* HEADER ROW */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20, marginBottom: 28 }}>
            <div>
              <div style={{ fontSize: 13, color: '#6a90a8', marginBottom: 6 }}>{result.industry}</div>
              <h2 style={{ fontSize: 32, fontWeight: 900, letterSpacing: '-1px' }}>{result.name}</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8 }}>
                <span style={{ fontSize: 28, fontWeight: 900, fontFamily: 'monospace', color: '#dce8f0' }}>${result.price.toFixed(2)}</span>
                <span style={{ fontSize: 14, fontWeight: 700, fontFamily: 'monospace', color: upDay ? '#00c896' : '#e84545' }}>
                  {upDay ? '+' : ''}{result.change1d.toFixed(2)}%
                </span>
                <span style={{ fontSize: 12, color: '#2a4a62' }}>52W {result.low52.toFixed(0)}–{result.high52.toFixed(0)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ background: `${rClr}15`, border: `1px solid ${rClr}40`, borderRadius: 12, padding: '16px 24px', textAlign: 'center', minWidth: 140 }}>
                <div style={{ fontSize: 11, color: '#6a90a8', marginBottom: 6, letterSpacing: '.5px' }}>AI VERDICT</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: rClr, letterSpacing: '-0.5px' }}>{rating}</div>
                <div style={{ fontSize: 11, color: '#6a90a8', marginTop: 4 }}>{result.analysis.confidence}% confidence</div>
              </div>
              <div style={{ background: '#060f18', border: '1px solid #0f2030', borderRadius: 12, padding: '16px 24px', textAlign: 'center', minWidth: 140 }}>
                <div style={{ fontSize: 11, color: '#6a90a8', marginBottom: 6, letterSpacing: '.5px' }}>PRICE TARGET</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#3b8eea', fontFamily: 'monospace' }}>${result.analysis.price_target.toFixed(2)}</div>
                <div style={{ fontSize: 11, color: '#6a90a8', marginTop: 4 }}>{result.analysis.time_horizon}</div>
              </div>
            </div>
          </div>

          {/* EXECUTIVE SUMMARY */}
          <div className="card fade-up" style={{ padding: '22px 24px', marginBottom: 16, borderLeft: `3px solid ${rClr}` }}>
            <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 10 }}>EXECUTIVE SUMMARY</div>
            <p style={{ fontSize: 15, lineHeight: 1.65, color: '#b8d0e0' }}>{result.analysis.executive_summary}</p>
          </div>

          {/* 3-COL GRID */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>

            {/* INVESTMENT THESIS */}
            <div className="card fade-up" style={{ padding: '22px 24px', gridColumn: 'span 2' }}>
              <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 14 }}>🎯 INVESTMENT THESIS</div>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: '#b8d0e0', marginBottom: 20 }}>{result.analysis.investment_thesis}</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#00c89608', border: '1px solid #00c89625', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#00c896', letterSpacing: '.5px', marginBottom: 8 }}>BULL CASE</div>
                  <p style={{ fontSize: 13, color: '#b8d0e0', lineHeight: 1.5 }}>{result.analysis.bull_case}</p>
                </div>
                <div style={{ background: '#e8454508', border: '1px solid #e8454525', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: '#e84545', letterSpacing: '.5px', marginBottom: 8 }}>BEAR CASE</div>
                  <p style={{ fontSize: 13, color: '#b8d0e0', lineHeight: 1.5 }}>{result.analysis.bear_case}</p>
                </div>
              </div>
            </div>

            {/* AGENT SCORES */}
            <div className="card fade-up" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 16 }}>AGENT SCORES</div>
              <ScoreBar score={result.analysis.fundamentals_score} label="Fundamentals" />
              <ScoreBar score={result.analysis.technical_score}    label="Technical" />
              <ScoreBar score={result.analysis.sentiment_score}    label="Sentiment" />
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #0f2030' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>Market Sentiment</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: sClr }}>{result.analysis.sentiment}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>20-Day SMA</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#dce8f0' }}>${result.sma20}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>Trend</span>
                  <span style={{ fontSize: 12, fontWeight: 700, color: result.trend === 'uptrend' ? '#00c896' : '#e84545', textTransform: 'capitalize' }}>{result.trend}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>Beta</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#dce8f0' }}>{result.beta.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* OPTIONS RECOMMENDATION */}
          <div className="card fade-up" style={{ padding: '24px', marginBottom: 16, background: result.analysis.options.type === 'CALL' ? '#00c89608' : result.analysis.options.type === 'PUT' ? '#e8454508' : '#060f18', borderColor: result.analysis.options.type === 'CALL' ? '#00c89640' : result.analysis.options.type === 'PUT' ? '#e8454540' : '#0f2030' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 6 }}>OPTIONS PLAY</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: result.analysis.options.type === 'CALL' ? '#00c896' : result.analysis.options.type === 'PUT' ? '#e84545' : '#f0b429' }}>
                  {result.analysis.options.strategy}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {[
                  { label: 'TYPE',      val: result.analysis.options.type },
                  { label: 'EXPIRY',    val: `${result.analysis.options.expiry_days}d` },
                ].map(({ label, val }) => (
                  <div key={label} style={{ background: '#070f17', border: '1px solid #0f2030', borderRadius: 8, padding: '10px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 10, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, fontFamily: 'monospace', color: '#dce8f0' }}>{val}</div>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'STRIKE',         val: `$${result.analysis.options.strike.toFixed(2)}` },
                { label: 'BREAKEVEN',       val: `$${(result.analysis.options.type === 'CALL' ? result.analysis.options.breakeven_call : result.analysis.options.breakeven_put).toFixed(2)}` },
                { label: 'PRICE TARGET',   val: `$${result.analysis.price_target.toFixed(2)}` },
                { label: 'TIME HORIZON',   val: result.analysis.time_horizon },
              ].map(({ label, val }) => (
                <div key={label} style={{ background: '#070f17', border: '1px solid #0f2030', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 10, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#dce8f0' }}>{val}</div>
                </div>
              ))}
            </div>
            <div style={{ background: '#070f17', border: '1px solid #0f2030', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#b8d0e0', lineHeight: 1.6 }}>
              <span style={{ color: '#6a90a8', fontSize: 11, letterSpacing: '.5px', display: 'block', marginBottom: 6 }}>REASONING</span>
              {result.analysis.options.reasoning}
            </div>
          </div>

          {/* KEY LEVELS + RISKS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginBottom: 16 }}>
            <div className="card fade-up" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 16 }}>KEY PRICE LEVELS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#e8454510', border: '1px solid #e8454525', borderRadius: 8, padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: '#6a90a8' }}>Resistance</span>
                  <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#e84545' }}>${result.analysis.key_levels.resistance.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#00c89610', border: '1px solid #00c89625', borderRadius: 8, padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: '#6a90a8' }}>Current</span>
                  <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#dce8f0' }}>${result.price.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#00c89608', border: '1px solid #00c89620', borderRadius: 8, padding: '12px 16px' }}>
                  <span style={{ fontSize: 13, color: '#6a90a8' }}>Support</span>
                  <span style={{ fontSize: 17, fontWeight: 800, fontFamily: 'monospace', color: '#00c896' }}>${result.analysis.key_levels.support.toFixed(2)}</span>
                </div>
              </div>
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #0f2030' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>P/E Ratio</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#dce8f0' }}>{result.pe > 0 ? result.pe.toFixed(1) : 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 12, color: '#6a90a8' }}>Market Cap</span>
                  <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#dce8f0' }}>${(result.marketCap / 1000).toFixed(1)}B</span>
                </div>
              </div>
            </div>

            <div className="card fade-up" style={{ padding: '22px 24px' }}>
              <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 16 }}>🛡️ KEY RISKS</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {result.analysis.risks.map((risk, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', background: '#e8454508', border: '1px solid #e8454520', borderRadius: 8, padding: '12px 14px' }}>
                    <span style={{ fontSize: 13, color: '#e84545', fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                    <span style={{ fontSize: 13, color: '#b8d0e0', lineHeight: 1.5 }}>{risk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AGENTS PANEL */}
          <div className="card fade-up" style={{ padding: '22px 24px', marginBottom: 16 }}>
            <div style={{ fontSize: 11, color: '#6a90a8', letterSpacing: '.5px', marginBottom: 16 }}>AGENTS THAT RAN THIS ANALYSIS</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 10 }}>
              {AGENTS.map(a => (
                <div key={a.id} style={{ background: '#070f17', border: '1px solid #0f2030', borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 20 }}>{a.icon}</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#dce8f0' }}>{a.label}</div>
                    <div style={{ fontSize: 11, color: '#2a4a62' }}>{a.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ANALYZE ANOTHER */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 13, color: '#6a90a8', marginBottom: 16 }}>Analyze another stock</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
              {POPULAR.filter(s => s !== result.ticker).slice(0, 8).map(s => (
                <button key={s} className="chip" onClick={() => analyze(s)}>{s}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* DISCLAIMER */}
      <div style={{ textAlign: 'center', padding: '24px', borderTop: '1px solid #0a1a26', fontSize: 11, color: '#1a3550' }}>
        Not financial advice. AI analysis is for educational purposes only. Always do your own research.
      </div>
    </div>
  )
}
