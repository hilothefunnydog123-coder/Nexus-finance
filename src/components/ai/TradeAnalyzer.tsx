'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Brain, TrendingUp, TrendingDown, Minus, Camera } from 'lucide-react'

interface NewsItem {
  title: string
  source: string
  sentiment: string
  impact: string
  date: string
}

interface TradeAnalysis {
  ticker: string
  timeframe: string
  signal: 'LONG' | 'SHORT' | 'NO TRADE'
  entry: number
  sl: number
  tp1: number
  tp2: number
  rr: string
  pattern: string
  strategy: string
  overall_sentiment: string
  sentiment_score: number
  verdict: string
  summary: string
  thesis: string
  invalidation: string
  news: NewsItem[]
  trade_analysis: {
    position_assessment: string
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

function sColor(s: string) {
  const u = (s || '').toUpperCase()
  if (u.includes('BULL') || u.includes('BUY') || u.includes('LONG')) return '#00d4aa'
  if (u.includes('BEAR') || u.includes('SELL') || u.includes('SHORT') || u.includes('AVOID')) return '#ff4757'
  return '#ffa502'
}

const STEPS = ['Reading chart…', 'Identifying levels…', 'Searching live news…', 'Analyzing sentiment…', 'Building signal…']

export default function TradeAnalyzer() {
  const [imageBase64, setImageBase64] = useState('')
  const [imagePreview, setImagePreview] = useState('')
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(0)
  const [result, setResult] = useState<TradeAnalysis | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const onFile = (file: File) => {
    setResult(null)
    setError('')
    const reader = new FileReader()
    reader.onload = e => {
      const url = e.target?.result as string
      setImagePreview(url)
      setImageBase64(url.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'))
    if (item) { const f = item.getAsFile(); if (f) onFile(f) }
  }

  const clearImage = () => { setImagePreview(''); setImageBase64(''); setResult(null); setError('') }

  const analyze = async () => {
    if (!imageBase64) { setError('Paste or upload a chart screenshot first'); return }
    setError('')
    setResult(null)
    setLoading(true)
    setStep(0)
    const t = setInterval(() => setStep(s => Math.min(s + 1, STEPS.length - 1)), 2000)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'trade_analyze', data: { imageBase64, context } }),
      })
      const json = await res.json()
      const raw: string = json.raw || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse AI response — try again')
      setResult(JSON.parse(match[0]))
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Analysis failed — try again')
    } finally {
      clearInterval(t)
      setLoading(false)
    }
  }

  const signalColor = result ? sColor(result.signal) : '#00d4aa'
  const verdictColor = result ? sColor(result.verdict) : '#00d4aa'
  const SignalIcon = result?.signal === 'LONG' ? TrendingUp : result?.signal === 'SHORT' ? TrendingDown : Minus

  return (
    <div className="flex flex-col overflow-y-auto h-full" style={{ background: '#040c14' }} onPaste={onPaste}>
      <style>{`@keyframes yn-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ padding: '14px 32px', borderBottom: '1px solid #1a2d4a', background: '#071220', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#a855f720', border: '1px solid #a855f740', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Brain size={16} color="#a855f7" />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', letterSpacing: '-0.3px' }}>AI Trade Analyzer</div>
          <div style={{ fontSize: 11, color: '#4a5e7a' }}>Screenshot your chart → AI reads it and generates buy/sell signal, entry, SL, TP, key levels + live news</div>
        </div>
      </div>

      <div style={{ maxWidth: 960, margin: '0 auto', width: '100%', padding: '32px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Upload zone */}
        {!imagePreview ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '2px dashed #1a2d4a', borderRadius: 16, padding: '60px 32px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', background: '#071220' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#a855f7'; e.currentTarget.style.background = '#0a0f1e' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = '#1a2d4a'; e.currentTarget.style.background = '#071220' }}
          >
            <div style={{ width: 64, height: 64, borderRadius: 16, background: '#a855f715', border: '1px solid #a855f730', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <Camera size={28} color="#a855f7" />
            </div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#cdd6f4', marginBottom: 8 }}>Paste or upload your chart screenshot</div>
            <div style={{ fontSize: 13, color: '#4a5e7a', marginBottom: 6 }}>Press <kbd style={{ background: '#0f1f38', border: '1px solid #1a2d4a', borderRadius: 4, padding: '2px 6px', fontFamily: 'monospace', fontSize: 11 }}>Ctrl+V</kbd> to paste · or click to browse</div>
            <div style={{ fontSize: 12, color: '#2a4060' }}>Gemini Vision reads the chart and generates the full analysis — no manual inputs needed</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        ) : (
          <div style={{ position: 'relative', background: '#071220', borderRadius: 16, border: '1px solid #1a2d4a', overflow: 'hidden' }}>
            <img src={imagePreview} alt="chart" style={{ width: '100%', maxHeight: 340, objectFit: 'contain', display: 'block' }} />
            <button onClick={clearImage}
              style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(4,12,20,0.9)', border: '1px solid #1a2d4a', borderRadius: '50%', width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cdd6f4' }}>
              <X size={14} />
            </button>
            {!result && !loading && (
              <div style={{ position: 'absolute', bottom: 12, left: 16, fontSize: 10, color: '#00d4aa', background: '#00d4aa15', border: '1px solid #00d4aa30', borderRadius: 4, padding: '4px 10px', fontFamily: 'monospace' }}>
                ✓ Chart ready
              </div>
            )}
          </div>
        )}

        {/* Optional context */}
        <div>
          <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>Additional Context <span style={{ color: '#2a4060' }}>(optional)</span></div>
          <input
            value={context} onChange={e => setContext(e.target.value)}
            placeholder="e.g. XAU/USD 1H chart, holding overnight, watching CPI data tomorrow…"
            style={{ width: '100%', background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '11px 14px', color: '#cdd6f4', fontSize: 13, outline: 'none' }}
            onFocus={e => (e.currentTarget.style.borderColor = '#a855f7')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')}
          />
        </div>

        {error && (
          <div style={{ background: '#ff475712', border: '1px solid #ff475750', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#ff4757', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading || !imageBase64}
          style={{
            padding: '16px 0', borderRadius: 10, fontSize: 14, fontWeight: 900, letterSpacing: '0.08em',
            border: 'none', cursor: loading || !imageBase64 ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            background: !imageBase64 ? '#0a1628' : loading ? '#071220' : '#a855f7',
            color: !imageBase64 ? '#2a4060' : loading ? '#4a5e7a' : '#fff',
            boxShadow: imageBase64 && !loading ? '0 0 28px #a855f730' : 'none',
          }}>
          {loading ? (
            <>
              <Loader2 size={16} style={{ animation: 'yn-spin 1s linear infinite' }} />
              <span style={{ fontSize: 12, fontFamily: 'monospace', letterSpacing: '0.12em' }}>{STEPS[step].toUpperCase()}</span>
            </>
          ) : (
            <><Brain size={16} /> ANALYZE CHART</>
          )}
        </button>

        {/* ── Results ── */}
        {result && (
          <div ref={resultsRef} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Signal card */}
            <div style={{ background: `${signalColor}0f`, border: `1px solid ${signalColor}40`, borderTop: `3px solid ${signalColor}`, borderRadius: 14, padding: '24px 28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: 12, background: `${signalColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <SignalIcon size={26} color={signalColor} />
                  </div>
                  <div>
                    <div style={{ fontSize: 28, fontWeight: 900, color: signalColor, fontFamily: 'monospace', letterSpacing: '-1px' }}>{result.signal}</div>
                    <div style={{ fontSize: 11, color: '#7f93b5', marginTop: 2 }}>
                      {result.ticker} · {result.timeframe} · {result.pattern} · {result.strategy}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 2 }}>Confidence</div>
                  <div style={{ fontSize: 28, fontWeight: 900, color: signalColor, fontFamily: 'monospace' }}>{result.confidence}%</div>
                </div>
              </div>
              <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.75, margin: '0 0 14px' }}>{result.thesis}</p>
              <div style={{ fontSize: 11, color: '#4a5e7a' }}>
                <span style={{ color: '#ff4757', fontWeight: 700 }}>Invalidated if: </span>{result.invalidation}
              </div>
            </div>

            {/* Entry / SL / TP / RR row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[
                { label: 'Entry', value: result.entry, color: '#cdd6f4' },
                { label: 'Stop Loss', value: result.sl, color: '#ff4757' },
                { label: 'TP 1', value: result.tp1, color: '#00d4aa' },
                { label: 'TP 2', value: result.tp2, color: '#00d4aa' },
                { label: 'R:R', value: result.rr, color: '#ffa502', mono: true },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 10, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color, fontFamily: 'monospace' }}>
                    {value ? (typeof value === 'number' ? (value < 10 ? Number(value).toFixed(4) : Number(value).toFixed(2)) : value) : '—'}
                  </div>
                </div>
              ))}
            </div>

            {/* Key Levels + News */}
            <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 14 }}>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 14 }}>Key Levels</div>
                {[
                  { label: 'Strong Resistance', v: result.key_levels?.strong_resistance, c: '#ff4757' },
                  { label: 'Resistance', v: result.key_levels?.resistance, c: '#ff475775' },
                  { label: 'Support', v: result.key_levels?.support, c: '#00d4aa75' },
                  { label: 'Strong Support', v: result.key_levels?.strong_support, c: '#00d4aa' },
                ].map(({ label, v, c }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #0f1f38' }}>
                    <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v ?? '—'}</span>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Live News & Sentiment</div>
                {(result.news || []).slice(0, 4).map((n, i) => {
                  const nc = sColor(n.sentiment)
                  return (
                    <div key={i} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 14px', display: 'flex', gap: 10 }}>
                      <div style={{ width: 7, height: 7, minWidth: 7, borderRadius: '50%', background: nc, marginTop: 5 }} />
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#cdd6f4', lineHeight: 1.5, marginBottom: 4 }}>{n.title}</div>
                        <div style={{ fontSize: 10, color: '#4a5e7a', display: 'flex', gap: 10, fontFamily: 'monospace' }}>
                          <span style={{ color: nc }}>{n.source}</span>
                          <span>{n.date}</span>
                          <span style={{ background: '#0f1f38', padding: '1px 6px', borderRadius: 3 }}>{n.impact}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Analysis + confluence/risks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px', gridColumn: 'span 1' }}>
                <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Chart Analysis</div>
                <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{result.trade_analysis?.position_assessment}</p>
              </div>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#00d4aa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Confluence</div>
                {(result.trade_analysis?.confluence_factors || []).map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#7f93b5', lineHeight: 1.6, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #00d4aa40' }}>{f}</div>
                ))}
              </div>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 10, color: '#ff4757', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>Risk Factors</div>
                {(result.trade_analysis?.risk_factors || []).map((f, i) => (
                  <div key={i} style={{ fontSize: 11, color: '#7f93b5', lineHeight: 1.6, marginBottom: 8, paddingLeft: 10, borderLeft: '2px solid #ff475740' }}>{f}</div>
                ))}
              </div>
            </div>

            {/* Recommendation */}
            <div style={{ background: '#071220', border: `1px solid ${verdictColor}30`, borderTop: `3px solid ${verdictColor}`, borderRadius: 12, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Final Recommendation</div>
                <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 4, fontFamily: 'monospace', letterSpacing: '0.1em', background: `${verdictColor}18`, color: verdictColor }}>
                  {result.verdict}
                </span>
              </div>
              <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.8, margin: 0 }}>{result.recommendation}</p>
            </div>

            <button
              onClick={() => { setResult(null); setImagePreview(''); setImageBase64('') }}
              style={{ alignSelf: 'flex-start', fontSize: 12, color: '#4a5e7a', background: 'none', border: '1px solid #1a2d4a', borderRadius: 8, padding: '9px 20px', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7f93b5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a5e7a')}>
              ↺ Analyze another chart
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
