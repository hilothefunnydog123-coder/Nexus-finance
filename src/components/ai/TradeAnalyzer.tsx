'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Brain, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface NewsItem {
  title: string
  source: string
  sentiment: string
  impact: string
  date: string
}

interface TradeAnalysis {
  overall_sentiment: string
  sentiment_score: number
  verdict: string
  summary: string
  news: NewsItem[]
  trade_analysis: {
    position_assessment: string
    risk_assessment: string
    market_conditions: string
    confluence_factors: string[]
    risk_factors: string[]
  }
  key_levels: {
    strong_support: number
    support: number
    resistance: number
    strong_resistance: number
  }
  recommendation: string
  confidence: number
}

function sentimentColor(s: string) {
  const u = (s || '').toUpperCase()
  if (u.includes('BULL') || u.includes('BUY')) return '#00d4aa'
  if (u.includes('BEAR') || u.includes('SELL') || u.includes('AVOID')) return '#ff4757'
  return '#ffa502'
}

function calcRR(entry: number, sl: number, tp: number, dir: 'long' | 'short') {
  const risk = dir === 'long' ? entry - sl : sl - entry
  const reward = dir === 'long' ? tp - entry : entry - tp
  if (risk <= 0 || reward <= 0) return null
  return (reward / risk).toFixed(2)
}

const LOADING_STEPS = [
  'Searching live market news…',
  'Fetching analyst sentiment…',
  'Analyzing trade setup…',
  'Calculating key levels…',
  'Building recommendation…',
]

export default function TradeAnalyzer() {
  const [ticker, setTicker] = useState('')
  const [direction, setDirection] = useState<'long' | 'short'>('long')
  const [entry, setEntry] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [size, setSize] = useState('')
  const [context, setContext] = useState('')
  const [imageBase64, setImageBase64] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingStep, setLoadingStep] = useState(0)
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const entryN = parseFloat(entry)
  const slN = parseFloat(sl)
  const tpN = parseFloat(tp)
  const rr = entry && sl && tp && !isNaN(entryN) && !isNaN(slN) && !isNaN(tpN)
    ? calcRR(entryN, slN, tpN, direction)
    : null
  const rrColor = rr ? (parseFloat(rr) >= 2 ? '#00d4aa' : parseFloat(rr) >= 1 ? '#ffa502' : '#ff4757') : '#7f93b5'

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setImagePreview(dataUrl)
      setImageBase64(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'))
    if (item) { const f = item.getAsFile(); if (f) onFile(f) }
  }

  const analyze = async () => {
    if (!ticker.trim()) { setError('Enter a ticker or pair'); return }
    if (!entry || !sl || !tp) { setError('Entry, SL and TP are required'); return }
    setError('')
    setAnalysis(null)
    setLoading(true)
    setLoadingStep(0)

    const stepTimer = setInterval(() => setLoadingStep(s => Math.min(s + 1, LOADING_STEPS.length - 1)), 1800)

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'trade_analyze',
          data: { ticker: ticker.trim().toUpperCase(), direction, entry: entryN, sl: slN, tp: tpN, size, context, rr, imageBase64: imageBase64 || undefined },
        }),
      })
      const json = await res.json()
      const raw: string = json.raw || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse AI response')
      setAnalysis(JSON.parse(match[0]))
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError('Analysis failed — ' + (e instanceof Error ? e.message : 'please try again'))
    } finally {
      clearInterval(stepTimer)
      setLoading(false)
    }
  }

  const verdictColor = analysis ? sentimentColor(analysis.verdict) : '#00d4aa'
  const VerdictIcon = analysis?.verdict?.toUpperCase().includes('BUY') ? TrendingUp
    : analysis?.verdict?.toUpperCase().includes('SELL') ? TrendingDown : Minus

  return (
    <div
      className="flex flex-col overflow-y-auto h-full"
      style={{ background: '#040c14' }}
      onPaste={onPaste}
    >
      <style>{`@keyframes yn-spin { from { transform:rotate(0deg) } to { transform:rotate(360deg) } }`}</style>

      {/* Page header */}
      <div style={{ padding: '16px 32px 14px', borderBottom: '1px solid #1a2d4a', background: '#071220', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#a855f720', border: '1px solid #a855f740', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={16} color="#a855f7" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>AI Trade Analyzer</div>
          <div style={{ fontSize: 11, color: '#4a5e7a' }}>Live market data · Chart vision · Buy/Sell signals · Key levels</div>
        </div>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>Ctrl+V to paste chart screenshot</div>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24 }}>

        {/* ── Input form ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

          {/* Left: trade inputs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: -4 }}>Trade Setup</div>

            {/* Ticker + Direction */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Ticker / Pair</div>
                <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
                  placeholder="AAPL, BTC/USD, EUR/USD…"
                  style={{ width: '100%', background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px', color: '#cdd6f4', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
              </div>
              <div>
                <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Direction</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #1a2d4a', borderRadius: 8, overflow: 'hidden', height: 42 }}>
                  {(['long', 'short'] as const).map(d => (
                    <button key={d} onClick={() => setDirection(d)}
                      style={{
                        fontSize: 11, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em',
                        border: 'none', borderRight: d === 'long' ? '1px solid #1a2d4a' : 'none', cursor: 'pointer', transition: 'all 0.15s',
                        background: direction === d ? (d === 'long' ? '#00d4aa18' : '#ff475718') : '#071220',
                        color: direction === d ? (d === 'long' ? '#00d4aa' : '#ff4757') : '#4a5e7a',
                      }}>
                      {d === 'long' ? '▲ LONG' : '▼ SHORT'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Entry / Size / SL / TP */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[
                { label: 'Entry Price', key: 'entry' as const, val: entry, set: setEntry, color: '#cdd6f4', type: 'number', ph: '0.00' },
                { label: 'Position Size', key: 'size' as const, val: size, set: setSize, color: '#cdd6f4', type: 'text', ph: '1 lot, 100 shares' },
                { label: 'Stop Loss', key: 'sl' as const, val: sl, set: setSl, color: '#ff4757', type: 'number', ph: '0.00' },
                { label: 'Take Profit', key: 'tp' as const, val: tp, set: setTp, color: '#00d4aa', type: 'number', ph: '0.00' },
              ].map(({ label, val, set: setter, color, type, ph }) => (
                <div key={label}>
                  <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>{label}</div>
                  <input value={val} onChange={e => setter(e.target.value)} type={type} placeholder={ph}
                    style={{ width: '100%', background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px', color, fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = color === '#cdd6f4' ? '#00d4aa' : color)}
                    onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
                </div>
              ))}
            </div>

            {/* R:R live */}
            {rr && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8 }}>
                <span style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Risk / Reward</span>
                <span style={{ fontSize: 18, fontWeight: 900, color: rrColor, fontFamily: 'monospace', marginLeft: 'auto' }}>{rr}:1</span>
              </div>
            )}

            {/* Context */}
            <div>
              <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 5 }}>Additional Context (optional)</div>
              <input value={context} onChange={e => setContext(e.target.value)}
                placeholder="Holding overnight, news event tomorrow, key level bounce…"
                style={{ width: '100%', background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px', color: '#cdd6f4', fontSize: 12, outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
            </div>
          </div>

          {/* Right: chart upload */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: -4 }}>Chart Screenshot (optional)</div>

            {!imagePreview ? (
              <div
                onClick={() => fileRef.current?.click()}
                style={{ flex: 1, border: '2px dashed #1a2d4a', borderRadius: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, cursor: 'pointer', minHeight: 200, transition: 'border-color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2d4a')}
              >
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#a855f715', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Upload size={22} color="#a855f7" />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', marginBottom: 4 }}>Paste or upload your chart</div>
                  <div style={{ fontSize: 11, color: '#4a5e7a' }}>Ctrl+V to paste · or click to browse</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 4 }}>Gemini Vision will read the chart and include it in the analysis</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
              </div>
            ) : (
              <div style={{ flex: 1, position: 'relative', minHeight: 200 }}>
                <img src={imagePreview} alt="chart" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 12, background: '#071220', border: '1px solid #1a2d4a', maxHeight: 260 }} />
                <button onClick={() => { setImagePreview(''); setImageBase64('') }}
                  style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(4,12,20,0.85)', border: '1px solid #1a2d4a', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cdd6f4' }}>
                  <X size={13} />
                </button>
                <div style={{ position: 'absolute', bottom: 8, left: 10, fontSize: 10, color: '#00d4aa', background: '#00d4aa15', border: '1px solid #00d4aa30', borderRadius: 4, padding: '3px 8px', fontFamily: 'monospace' }}>
                  ✓ Chart attached — will be analyzed
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#ff475712', border: '1px solid #ff475750', borderRadius: 8, padding: '10px 16px', fontSize: 12, color: '#ff4757', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            padding: '14px 0', borderRadius: 10, fontSize: 13, fontWeight: 900, letterSpacing: '0.1em',
            cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: loading ? '#071220' : '#00d4aa', color: loading ? '#4a5e7a' : '#040c14',
            boxShadow: loading ? 'none' : '0 0 24px #00d4aa30',
          }}>
          {loading ? (
            <>
              <Loader2 size={14} style={{ animation: 'yn-spin 1s linear infinite' }} />
              <span style={{ fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{LOADING_STEPS[loadingStep].toUpperCase()}</span>
            </>
          ) : 'ANALYZE TRADE'}
        </button>

        {/* ── Results ── */}
        {analysis && (
          <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 8, borderTop: '1px solid #1a2d4a' }}>

            {/* Verdict + Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'start' }}>
              <div style={{ background: '#071220', border: `1px solid ${verdictColor}30`, borderTop: `3px solid ${verdictColor}`, borderRadius: 12, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: `${verdictColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <VerdictIcon size={20} color={verdictColor} />
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 900, color: verdictColor, fontFamily: 'monospace', letterSpacing: '-0.5px' }}>{analysis.verdict}</div>
                      <div style={{ fontSize: 10, color: '#4a5e7a' }}>{ticker} · {direction.toUpperCase()} @ {entry}</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 2 }}>AI Confidence</div>
                    <div style={{ fontSize: 24, fontWeight: 900, color: verdictColor, fontFamily: 'monospace' }}>{analysis.confidence}%</div>
                  </div>
                </div>
                <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.summary}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 160 }}>
                {[
                  { label: 'R:R Ratio', value: rr ? `${rr}:1` : 'N/A', color: rrColor },
                  { label: 'Sentiment', value: `${analysis.sentiment_score > 0 ? '+' : ''}${analysis.sentiment_score}`, color: analysis.sentiment_score > 20 ? '#00d4aa' : analysis.sentiment_score < -20 ? '#ff4757' : '#ffa502' },
                  { label: 'Direction', value: analysis.overall_sentiment, color: sentimentColor(analysis.overall_sentiment) },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Key Levels + News row */}
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>

              {/* Key Levels */}
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Key Levels</div>
                {[
                  { label: 'Strong Resistance', value: analysis.key_levels?.strong_resistance, color: '#ff4757' },
                  { label: 'Resistance', value: analysis.key_levels?.resistance, color: '#ff475780' },
                  { label: 'Current Entry', value: entryN, color: '#cdd6f4' },
                  { label: 'Support', value: analysis.key_levels?.support, color: '#00d4aa80' },
                  { label: 'Strong Support', value: analysis.key_levels?.strong_support, color: '#00d4aa' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #0f1f38' }}>
                    <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>{value ?? 'N/A'}</span>
                  </div>
                ))}
              </div>

              {/* Live News */}
              <div>
                <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Live News & Sentiment</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {(analysis.news || []).slice(0, 5).map((item, i) => {
                    const nc = sentimentColor(item.sentiment)
                    return (
                      <div key={i} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '12px 16px', display: 'flex', gap: 12 }}>
                        <div style={{ width: 8, height: 8, minWidth: 8, borderRadius: '50%', background: nc, marginTop: 5 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: '#cdd6f4', lineHeight: 1.5, marginBottom: 5 }}>{item.title}</div>
                          <div style={{ fontSize: 10, color: '#4a5e7a', display: 'flex', gap: 10, fontFamily: 'monospace' }}>
                            <span style={{ color: nc }}>{item.source}</span>
                            <span>{item.date}</span>
                            <span style={{ background: '#0f1f38', padding: '1px 6px', borderRadius: 3 }}>{item.impact} IMPACT</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Trade Analysis */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Position Assessment</div>
                <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.75, margin: '0 0 16px' }}>{analysis.trade_analysis?.position_assessment}</p>
                <div style={{ fontSize: 10, color: '#1e90ff', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 10 }}>Market Conditions</div>
                <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.trade_analysis?.market_conditions}</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: '#00d4aa', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Confluence</div>
                  {(analysis.trade_analysis?.confluence_factors || []).map((f, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#7f93b5', lineHeight: 1.6, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #00d4aa40' }}>{f}</div>
                  ))}
                </div>
                <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                  <div style={{ fontSize: 10, color: '#ff4757', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 12 }}>Risk Factors</div>
                  {(analysis.trade_analysis?.risk_factors || []).map((f, i) => (
                    <div key={i} style={{ fontSize: 11, color: '#7f93b5', lineHeight: 1.6, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #ff475740' }}>{f}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendation */}
            <div style={{ background: '#071220', border: `1px solid ${verdictColor}30`, borderTop: `3px solid ${verdictColor}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 12 }}>Final Recommendation</div>
              <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.8, margin: 0 }}>{analysis.recommendation}</p>
            </div>

            <button
              onClick={() => { setAnalysis(null); window.scrollTo({ top: 0, behavior: 'smooth' }) }}
              style={{ alignSelf: 'flex-start', fontSize: 11, color: '#4a5e7a', background: 'none', border: '1px solid #1a2d4a', borderRadius: 8, padding: '8px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7f93b5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a5e7a')}>
              ↺ Analyze another trade
            </button>

          </div>
        )}

      </div>
    </div>
  )
}
