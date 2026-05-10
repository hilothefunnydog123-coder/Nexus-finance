'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Home } from 'lucide-react'

const API_KEY = 'AIzaSyACZjdcSbccKMVF-aYhW-XN5C_w-_gSrj8'

function calcRR(entry: number, sl: number, tp: number, dir: string) {
  const risk = dir === 'long' ? entry - sl : sl - entry
  const reward = dir === 'long' ? tp - entry : entry - tp
  if (risk <= 0 || reward <= 0) return null
  return (reward / risk).toFixed(2)
}

function sentimentClass(s: string) {
  if (!s) return 'neutral'
  const u = s.toUpperCase()
  if (u.includes('BULL') || u.includes('BUY')) return 'bull'
  if (u.includes('BEAR') || u.includes('SELL')) return 'bear'
  return 'neutral'
}

type Analysis = {
  overall_sentiment: string
  sentiment_score: number
  verdict: string
  summary: string
  news: { title: string; source: string; sentiment: string; impact: string; date: string }[]
  trade_analysis: {
    position_assessment: string
    risk_assessment: string
    market_conditions: string
    confluence_factors: string[]
    risk_factors: string[]
  }
  key_levels: { strong_support: number; support: number; resistance: number; strong_resistance: number }
  recommendation: string
  confidence: number
}

export default function TradeAnalyzerPage() {
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [size, setSize] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('FETCHING LIVE NEWS...')
  const [error, setError] = useState('')
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [tradeInfo, setTradeInfo] = useState<{ ticker: string; direction: string; entry: string; sl: string; tp: string; rr: string | null } | null>(null)

  async function analyze() {
    setError('')
    if (!ticker) { setError('Please enter a ticker.'); return }
    if (!entry || !sl || !tp) { setError('Please enter entry, SL, and TP.'); return }

    const e = parseFloat(entry), s = parseFloat(sl), t = parseFloat(tp)
    const rr = calcRR(e, s, t, direction)
    setTradeInfo({ ticker, direction, entry, sl, tp, rr })
    setLoading(true)
    setAnalysis(null)

    const prompt = `You are a professional forex and financial markets analyst with access to real-time news.

Analyze this trade setup and provide a comprehensive analysis:

TRADE DETAILS:
- Ticker: ${ticker}
- Direction: ${direction.toUpperCase()}
- Entry: ${entry}
- Stop Loss: ${sl}
- Take Profit: ${tp}
- Position Size: ${size || 'Not specified'}
- Risk/Reward Ratio: ${rr ? rr + ':1' : 'Unable to calculate'}
- Additional Context: ${context || 'None'}

Please provide a complete analysis in this EXACT JSON format (no markdown, just raw JSON):
{
  "overall_sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "sentiment_score": number from -100 to 100,
  "verdict": "STRONG BUY" or "BUY" or "HOLD" or "SELL" or "STRONG SELL" or "AVOID",
  "summary": "2-3 sentence overall market summary for ${ticker}",
  "news": [{"title":"...","source":"...","sentiment":"...","impact":"...","date":"..."}],
  "trade_analysis": {
    "position_assessment": "...",
    "risk_assessment": "...",
    "market_conditions": "...",
    "confluence_factors": ["..."],
    "risk_factors": ["..."]
  },
  "key_levels": {"strong_support":0,"support":0,"resistance":0,"strong_resistance":0},
  "recommendation": "...",
  "confidence": 0
}
Include 4-6 real recent news items. Be specific with prices and levels for ${ticker}.`

    try {
      setLoadingText('FETCHING LIVE NEWS...')
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            tools: [{ google_search: {} }],
            generationConfig: { temperature: 0.3, maxOutputTokens: 4096 }
          })
        }
      )
      const data = await res.json()
      if (!data.candidates?.[0]) throw new Error('No response from AI')
      const rawText = data.candidates[0].content.parts[0].text
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) throw new Error('Could not parse AI response')
      setLoadingText('RENDERING RESULTS...')
      setAnalysis(JSON.parse(jsonMatch[0]))
    } catch (e: unknown) {
      setError('Analysis failed: ' + (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }

  const sc = analysis ? sentimentClass(analysis.overall_sentiment) : 'neutral'
  const verdictClass = analysis ? sentimentClass(analysis.verdict) : 'neutral'
  const rrColor = tradeInfo?.rr ? (parseFloat(tradeInfo.rr) >= 2 ? '#00ff88' : parseFloat(tradeInfo.rr) >= 1 ? '#ffcc00' : '#ff3366') : '#ffcc00'
  const confColor = analysis ? (analysis.confidence >= 70 ? '#00ff88' : analysis.confidence >= 40 ? '#ffcc00' : '#ff3366') : '#ffcc00'
  const sentScore = analysis?.sentiment_score ?? 0
  const sentColor = sentScore > 20 ? '#00ff88' : sentScore < -20 ? '#ff3366' : '#ffcc00'

  const verdictBorderColor = verdictClass === 'bull' ? '#00ff88' : verdictClass === 'bear' ? '#ff3366' : '#ffcc00'

  return (
    <div style={{ background: '#0a0a0f', color: '#e8e8f0', fontFamily: "'Syne', sans-serif", minHeight: '100vh', padding: '2rem',
      backgroundImage: 'radial-gradient(ellipse at 20% 20%, rgba(0,255,136,0.04) 0%, transparent 60%), radial-gradient(ellipse at 80% 80%, rgba(255,51,102,0.04) 0%, transparent 60%)' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        input, select { background: #111118; border: 1px solid #1e1e2e; color: #e8e8f0; padding: 0.75rem 1rem; font-family: 'Space Mono', monospace; font-size: 0.9rem; border-radius: 4px; outline: none; transition: border-color 0.2s; width: 100%; }
        input:focus, select:focus { border-color: #00ff88; }
        @keyframes bar { 0%,100% { transform: scaleY(0.3); opacity: 0.3; } 50% { transform: scaleY(1); opacity: 1; } }
        @keyframes pulse { 0%,100% { opacity:0.5; } 50% { opacity:1; } }
        @media (max-width: 600px) { .form-grid { grid-template-columns: 1fr !important; } .stats-grid { grid-template-columns: 1fr 1fr !important; } .levels-grid { grid-template-columns: 1fr !important; } }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2.5rem', borderBottom: '1px solid #1e1e2e', paddingBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: -1, color: '#e8e8f0' }}>Trade Analyzer</h1>
            <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#00ff88', border: '1px solid #00ff88', padding: '2px 8px', borderRadius: 2, letterSpacing: 2 }}>AI POWERED</span>
          </div>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: '#555570', textDecoration: 'none' }}>
            <Home size={14} /> Home
          </Link>
        </div>

        {/* Form */}
        <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', letterSpacing: 2, textTransform: 'uppercase' }}>Ticker / Pair</label>
            <input type="text" placeholder="e.g. XAU/USD, BTC/USD, AAPL" value={ticker} onChange={e => setTicker(e.target.value)} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', letterSpacing: 2, textTransform: 'uppercase' }}>Direction</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #1e1e2e', borderRadius: 4, overflow: 'hidden' }}>
              {(['long', 'short'] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)} style={{
                  padding: '0.75rem', fontFamily: "'Space Mono', monospace", fontSize: '0.85rem', fontWeight: 700, letterSpacing: 2,
                  cursor: 'pointer', border: 'none', transition: 'all 0.2s',
                  background: direction === d ? (d === 'long' ? 'rgba(0,255,136,0.15)' : 'rgba(255,51,102,0.15)') : '#111118',
                  color: direction === d ? (d === 'long' ? '#00ff88' : '#ff3366') : '#555570'
                }}>{d === 'long' ? '▲ LONG' : '▼ SHORT'}</button>
              ))}
            </div>
          </div>
          {[
            { label: 'Entry Price', val: entry, set: setEntry, ph: '0.00' },
            { label: 'Position Size', val: size, set: setSize, ph: 'e.g. 1.5 lots, 100 shares' },
            { label: 'Stop Loss', val: sl, set: setSl, ph: '0.00' },
            { label: 'Take Profit', val: tp, set: setTp, ph: '0.00' },
          ].map(({ label, val, set, ph }) => (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', letterSpacing: 2, textTransform: 'uppercase' }}>{label}</label>
              <input type={label.includes('Size') ? 'text' : 'number'} placeholder={ph} value={val} onChange={e => set(e.target.value)} step="any" />
            </div>
          ))}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', gridColumn: '1 / -1' }}>
            <label style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', letterSpacing: 2, textTransform: 'uppercase' }}>Additional Context (optional)</label>
            <input type="text" placeholder="e.g. Holding overnight, news event tomorrow, key level bounce..." value={context} onChange={e => setContext(e.target.value)} />
          </div>
        </div>

        <button onClick={analyze} disabled={loading} style={{
          width: '100%', padding: '1rem', background: '#00ff88', color: '#000', border: 'none',
          fontFamily: "'Syne', sans-serif", fontSize: '1rem', fontWeight: 800, letterSpacing: 1,
          cursor: loading ? 'not-allowed' : 'pointer', borderRadius: 4, marginTop: '0.5rem',
          opacity: loading ? 0.5 : 1, transition: 'all 0.2s'
        }}>ANALYZE TRADE</button>

        {error && (
          <div style={{ background: 'rgba(255,51,102,0.1)', border: '1px solid #ff3366', color: '#ff3366', padding: '1rem', borderRadius: 4, fontFamily: "'Space Mono', monospace", fontSize: '0.8rem', marginTop: '1rem' }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 4, marginBottom: '1rem' }}>
              {[0,0.1,0.2,0.3,0.4].map((delay, i) => (
                <div key={i} style={{ width: 3, height: 32, background: '#00ff88', borderRadius: 2, animation: `bar 1s ease-in-out ${delay}s infinite` }} />
              ))}
            </div>
            <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: '#555570', letterSpacing: 2, animation: 'pulse 2s ease-in-out infinite' }}>
              {loadingText}
            </div>
          </div>
        )}

        {/* Results */}
        {analysis && tradeInfo && (
          <div style={{ marginTop: '2rem' }}>
            {/* Verdict */}
            <SectionTitle>VERDICT</SectionTitle>
            <div style={{ background: '#111118', border: `1px solid #1e1e2e`, borderRadius: 6, padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: verdictBorderColor }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', color: '#555570', letterSpacing: 2 }}>
                  {tradeInfo.ticker.toUpperCase()} · {tradeInfo.direction.toUpperCase()} @ {tradeInfo.entry}
                </span>
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.75rem', fontWeight: 700, padding: '4px 12px', borderRadius: 2, letterSpacing: 2,
                  background: verdictClass === 'bull' ? 'rgba(0,255,136,0.15)' : verdictClass === 'bear' ? 'rgba(255,51,102,0.15)' : 'rgba(255,204,0,0.15)',
                  color: verdictBorderColor }}>
                  {analysis.verdict || analysis.overall_sentiment}
                </span>
              </div>
              <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>{analysis.summary}</p>
            </div>

            {/* Stats */}
            <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'RISK/REWARD', value: tradeInfo.rr ? tradeInfo.rr + ':1' : 'N/A', color: rrColor },
                { label: 'AI CONFIDENCE', value: `${analysis.confidence}%`, color: confColor },
                { label: 'SENTIMENT SCORE', value: `${sentScore > 0 ? '+' : ''}${sentScore}`, color: sentColor },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 6, padding: '1.25rem' }}>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.6rem', color: '#555570', letterSpacing: 2, marginBottom: '0.5rem' }}>{label}</div>
                  <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '1.25rem', fontWeight: 700, color }}>{value}</div>
                </div>
              ))}
            </div>

            {/* News */}
            <SectionTitle>LIVE NEWS & SENTIMENT</SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {(analysis.news || []).map((n, i) => {
                const sc = sentimentClass(n.sentiment)
                return (
                  <div key={i} style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 6, padding: '1rem 1.25rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ width: 6, minWidth: 6, height: 6, borderRadius: '50%', marginTop: 6, background: sc === 'bull' ? '#00ff88' : sc === 'bear' ? '#ff3366' : '#ffcc00' }} />
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem', lineHeight: 1.4 }}>{n.title}</div>
                      <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ color: '#00ff88' }}>{n.source}</span>
                        <span>{n.date || 'Recent'}</span>
                        <span>{n.impact || 'MEDIUM'} IMPACT</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Trade Analysis */}
            <SectionTitle>TRADE ANALYSIS</SectionTitle>
            <AnalysisBlock title="POSITION ASSESSMENT">{analysis.trade_analysis?.position_assessment}</AnalysisBlock>
            <AnalysisBlock title="MARKET CONDITIONS">{analysis.trade_analysis?.market_conditions}</AnalysisBlock>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <AnalysisBlock title="CONFLUENCE FACTORS" style={{ margin: 0 }}>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {(analysis.trade_analysis?.confluence_factors || []).map((f, i) => <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>{f}</li>)}
                </ul>
              </AnalysisBlock>
              <AnalysisBlock title="RISK FACTORS" style={{ margin: 0 }}>
                <ul style={{ paddingLeft: '1.25rem' }}>
                  {(analysis.trade_analysis?.risk_factors || []).map((f, i) => <li key={i} style={{ fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '0.5rem' }}>{f}</li>)}
                </ul>
              </AnalysisBlock>
            </div>

            {/* Key Levels */}
            <SectionTitle>KEY LEVELS</SectionTitle>
            <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 6, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div className="levels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div>
                  {[['STRONG SUPPORT', analysis.key_levels?.strong_support, '#00ff88'], ['SUPPORT', analysis.key_levels?.support, '#00ff88']].map(([name, val, color]) => (
                    <div key={String(name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #1e1e2e' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#555570', letterSpacing: 1 }}>{String(name)}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: String(color) }}>{String(val ?? 'N/A')}</span>
                    </div>
                  ))}
                </div>
                <div>
                  {[['RESISTANCE', analysis.key_levels?.resistance, '#ff3366'], ['STRONG RESISTANCE', analysis.key_levels?.strong_resistance, '#ff3366']].map(([name, val, color]) => (
                    <div key={String(name)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #1e1e2e' }}>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.7rem', color: '#555570', letterSpacing: 1 }}>{String(name)}</span>
                      <span style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.85rem', fontWeight: 700, color: String(color) }}>{String(val ?? 'N/A')}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Final Recommendation */}
            <SectionTitle>FINAL RECOMMENDATION</SectionTitle>
            <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 6, padding: '1.5rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: verdictBorderColor }} />
              <p style={{ fontSize: '1rem', lineHeight: 1.7 }}>{analysis.recommendation}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: "'Space Mono', monospace", fontSize: '0.65rem', color: '#555570', letterSpacing: 3, textTransform: 'uppercase', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
      {children}
      <div style={{ flex: 1, height: 1, background: '#1e1e2e' }} />
    </div>
  )
}

function AnalysisBlock({ title, children, style = {} }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#111118', border: '1px solid #1e1e2e', borderRadius: 6, padding: '1.5rem', marginBottom: '1.5rem', ...style }}>
      <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '1rem', color: '#00ff88', fontFamily: "'Space Mono', monospace", letterSpacing: 1 }}>{title}</h3>
      {typeof children === 'string' ? <p style={{ fontSize: '0.9rem', lineHeight: 1.7 }}>{children}</p> : children}
    </div>
  )
}
