'use client'

import { useState, useRef } from 'react'
import { Upload, X, Loader2, Brain } from 'lucide-react'

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

const INPUT_BASE: React.CSSProperties = {
  width: '100%', background: '#071220', border: '1px solid #1a2d4a',
  borderRadius: 6, padding: '7px 10px', color: '#cdd6f4',
  fontSize: 12, fontFamily: 'monospace', outline: 'none',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.15em', textTransform: 'uppercase', marginBottom: 8 }}>
      — {children}
    </div>
  )
}

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
  const [loadingText, setLoadingText] = useState('')
  const [analysis, setAnalysis] = useState<TradeAnalysis | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const entryN = parseFloat(entry)
  const slN = parseFloat(sl)
  const tpN = parseFloat(tp)
  const rr = entry && sl && tp ? calcRR(entryN, slN, tpN, direction) : null
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

  const clearImage = () => { setImagePreview(''); setImageBase64('') }

  const analyze = async () => {
    if (!ticker.trim()) { setError('Enter a ticker or pair'); return }
    if (!entry || !sl || !tp) { setError('Entry, SL and TP are required'); return }
    setError('')
    setAnalysis(null)
    setLoading(true)
    setLoadingText('Fetching live market data...')

    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'trade_analyze',
          data: { ticker: ticker.trim().toUpperCase(), direction, entry: entryN, sl: slN, tp: tpN, size, context, rr, imageBase64: imageBase64 || undefined },
        }),
      })
      setLoadingText('Analyzing with AI...')
      const json = await res.json()
      const raw: string = json.raw || ''
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('Could not parse AI response')
      setAnalysis(JSON.parse(match[0]))
      setTimeout(() => containerRef.current?.querySelector('[data-results]')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    } catch (e) {
      setError('Analysis failed — ' + (e instanceof Error ? e.message : 'please try again'))
    } finally {
      setLoading(false)
    }
  }

  const verdictColor = analysis ? sentimentColor(analysis.verdict) : '#00d4aa'

  return (
    <div
      ref={containerRef}
      className="flex flex-col overflow-y-auto"
      style={{ width: 340, minWidth: 340, borderLeft: '1px solid #1a2d4a', background: '#040c14', height: '100%' }}
      onPaste={onPaste}
    >
      {/* Header */}
      <div style={{ padding: '9px 14px', borderBottom: '1px solid #1a2d4a', background: '#071220', display: 'flex', alignItems: 'center', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
        <Brain size={12} color="#a855f7" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Trade Analyzer</span>
        <span style={{ fontSize: 9, background: '#a855f720', color: '#a855f7', padding: '2px 6px', borderRadius: 3, fontFamily: 'monospace', letterSpacing: '0.1em' }}>AI</span>
        <span style={{ marginLeft: 'auto', fontSize: 9, color: '#4a5e7a' }}>Ctrl+V to paste chart</span>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Chart screenshot upload */}
        {!imagePreview ? (
          <div
            onClick={() => fileRef.current?.click()}
            style={{ border: '1px dashed #1a2d4a', borderRadius: 8, padding: '14px', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2d4a')}
          >
            <Upload size={18} color="#4a5e7a" style={{ margin: '0 auto 6px', display: 'block' }} />
            <div style={{ fontSize: 11, color: '#7f93b5', fontWeight: 600, marginBottom: 2 }}>Paste or upload your chart</div>
            <div style={{ fontSize: 9, color: '#4a5e7a' }}>Ctrl+V · or click to browse · optional but improves analysis</div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
          </div>
        ) : (
          <div style={{ position: 'relative' }}>
            <img src={imagePreview} alt="chart" style={{ width: '100%', borderRadius: 8, maxHeight: 150, objectFit: 'contain', background: '#071220', border: '1px solid #1a2d4a' }} />
            <button onClick={clearImage}
              style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(4,12,20,0.85)', border: '1px solid #1a2d4a', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#cdd6f4' }}>
              <X size={11} />
            </button>
            <div style={{ position: 'absolute', bottom: 6, left: 8, fontSize: 9, color: '#00d4aa', background: '#00d4aa15', border: '1px solid #00d4aa30', borderRadius: 3, padding: '2px 6px', fontFamily: 'monospace' }}>
              Chart attached ✓
            </div>
          </div>
        )}

        {/* Ticker + Direction */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Ticker / Pair">
            <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL, BTC/USD…" style={INPUT_BASE}
              onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
          </Field>
          <Field label="Direction">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', border: '1px solid #1a2d4a', borderRadius: 6, overflow: 'hidden' }}>
              {(['long', 'short'] as const).map(d => (
                <button key={d} onClick={() => setDirection(d)}
                  style={{
                    padding: '7px 4px', fontSize: 10, fontWeight: 800, fontFamily: 'monospace', letterSpacing: '0.1em',
                    border: 'none', borderRight: d === 'long' ? '1px solid #1a2d4a' : 'none', cursor: 'pointer', transition: 'all 0.15s',
                    background: direction === d ? (d === 'long' ? '#00d4aa18' : '#ff475718') : '#071220',
                    color: direction === d ? (d === 'long' ? '#00d4aa' : '#ff4757') : '#4a5e7a',
                  }}>
                  {d === 'long' ? '▲ LONG' : '▼ SHORT'}
                </button>
              ))}
            </div>
          </Field>
        </div>

        {/* Entry + Size */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Entry Price">
            <input value={entry} onChange={e => setEntry(e.target.value)} type="number" placeholder="0.00" style={INPUT_BASE}
              onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
          </Field>
          <Field label="Position Size">
            <input value={size} onChange={e => setSize(e.target.value)} placeholder="1 lot, 100 shares" style={INPUT_BASE}
              onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
              onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
          </Field>
        </div>

        {/* SL + TP */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Field label="Stop Loss">
            <input value={sl} onChange={e => setSl(e.target.value)} type="number" placeholder="0.00"
              style={{ ...INPUT_BASE, color: '#ff4757' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#ff4757' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#1a2d4a' }} />
          </Field>
          <Field label="Take Profit">
            <input value={tp} onChange={e => setTp(e.target.value)} type="number" placeholder="0.00"
              style={{ ...INPUT_BASE, color: '#00d4aa' }}
              onFocus={e => { e.currentTarget.style.borderColor = '#00d4aa' }}
              onBlur={e => { e.currentTarget.style.borderColor = '#1a2d4a' }} />
          </Field>
        </div>

        {/* R:R live preview */}
        {rr && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em' }}>R:R</span>
            <span style={{ fontSize: 14, fontWeight: 900, color: rrColor, fontFamily: 'monospace' }}>{rr}:1</span>
          </div>
        )}

        {/* Context */}
        <Field label="Context (optional)">
          <input value={context} onChange={e => setContext(e.target.value)}
            placeholder="News event, key level bounce, overnight…"
            style={{ ...INPUT_BASE, fontSize: 11 }}
            onFocus={e => (e.currentTarget.style.borderColor = '#00d4aa')}
            onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
        </Field>

        {/* Error */}
        {error && (
          <div style={{ background: '#ff475712', border: '1px solid #ff475750', borderRadius: 6, padding: '8px 12px', fontSize: 10, color: '#ff4757', fontFamily: 'monospace' }}>
            {error}
          </div>
        )}

        {/* Analyze button */}
        <button
          onClick={analyze}
          disabled={loading}
          style={{
            width: '100%', padding: '10px 0', borderRadius: 6, fontSize: 11, fontWeight: 800,
            letterSpacing: '0.1em', cursor: loading ? 'not-allowed' : 'pointer', transition: 'all 0.2s',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            background: loading ? '#071220' : '#00d4aa', color: loading ? '#4a5e7a' : '#040c14',
            boxShadow: loading ? 'none' : '0 0 16px #00d4aa25',
          }}>
          {loading ? (
            <>
              <Loader2 size={12} style={{ animation: 'yn-spin 1s linear infinite' }} />
              <span style={{ fontSize: 9, fontFamily: 'monospace', letterSpacing: '0.15em' }}>{loadingText.toUpperCase()}</span>
            </>
          ) : 'ANALYZE TRADE'}
        </button>

        {/* ── Results ── */}
        {analysis && (
          <div data-results style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 6, borderTop: '1px solid #1a2d4a', marginTop: 2 }}>

            {/* Verdict card */}
            <div>
              <SectionTitle>Verdict</SectionTitle>
              <div style={{ background: '#071220', border: `1px solid ${verdictColor}30`, borderTop: `2px solid ${verdictColor}`, borderRadius: 8, padding: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>
                    {ticker} · {direction.toUpperCase()} @ {entry}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 3, fontFamily: 'monospace', letterSpacing: '0.1em', background: `${verdictColor}18`, color: verdictColor }}>
                    {analysis.verdict}
                  </span>
                </div>
                <p style={{ fontSize: 11, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.summary}</p>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {[
                { label: 'R:R', value: rr ? `${rr}:1` : 'N/A', color: rrColor },
                { label: 'Confidence', value: `${analysis.confidence}%`, color: analysis.confidence >= 70 ? '#00d4aa' : analysis.confidence >= 40 ? '#ffa502' : '#ff4757' },
                { label: 'Sentiment', value: `${analysis.sentiment_score > 0 ? '+' : ''}${analysis.sentiment_score}`, color: analysis.sentiment_score > 20 ? '#00d4aa' : analysis.sentiment_score < -20 ? '#ff4757' : '#ffa502' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 6, padding: '10px 6px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#4a5e7a', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Key Levels */}
            {analysis.key_levels && (
              <div>
                <SectionTitle>Key Levels</SectionTitle>
                <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px' }}>
                  {[
                    { label: 'Strong Resistance', value: analysis.key_levels.strong_resistance, color: '#ff4757' },
                    { label: 'Resistance', value: analysis.key_levels.resistance, color: '#ff475780' },
                    { label: 'Support', value: analysis.key_levels.support, color: '#00d4aa80' },
                    { label: 'Strong Support', value: analysis.key_levels.strong_support, color: '#00d4aa' },
                  ].map(({ label, value, color }) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #0f1f38' }}>
                      <span style={{ fontSize: 9, color: '#4a5e7a', fontFamily: 'monospace', letterSpacing: '0.05em' }}>{label}</span>
                      <span style={{ fontSize: 12, fontWeight: 800, color, fontFamily: 'monospace' }}>{value ?? 'N/A'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Live News */}
            {analysis.news?.length > 0 && (
              <div>
                <SectionTitle>Live News & Sentiment</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {analysis.news.slice(0, 5).map((item, i) => {
                    const nc = sentimentColor(item.sentiment)
                    return (
                      <div key={i} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 6, padding: '10px 12px', display: 'flex', gap: 8 }}>
                        <div style={{ width: 6, height: 6, minWidth: 6, borderRadius: '50%', background: nc, marginTop: 4 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 11, fontWeight: 600, color: '#cdd6f4', lineHeight: 1.4, marginBottom: 4 }}>{item.title}</div>
                          <div style={{ fontSize: 9, color: '#4a5e7a', display: 'flex', gap: 8, fontFamily: 'monospace', flexWrap: 'wrap' }}>
                            <span style={{ color: nc }}>{item.source}</span>
                            <span>{item.date}</span>
                            <span style={{ background: '#0f1f38', padding: '1px 5px', borderRadius: 3 }}>{item.impact}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Trade Analysis */}
            <div>
              <SectionTitle>Trade Analysis</SectionTitle>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 9, color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Position Assessment</div>
                  <p style={{ fontSize: 11, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.trade_analysis?.position_assessment}</p>
                </div>
                <div>
                  <div style={{ fontSize: 9, color: '#1e90ff', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Market Conditions</div>
                  <p style={{ fontSize: 11, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.trade_analysis?.market_conditions}</p>
                </div>
              </div>
            </div>

            {/* Confluence + Risks */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { title: 'Confluence', items: analysis.trade_analysis?.confluence_factors, color: '#00d4aa' },
                { title: 'Risks', items: analysis.trade_analysis?.risk_factors, color: '#ff4757' },
              ].map(({ title, items, color }) => (
                <div key={title} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px' }}>
                  <div style={{ fontSize: 9, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>{title}</div>
                  {(items || []).map((f, i) => (
                    <div key={i} style={{ fontSize: 10, color: '#7f93b5', lineHeight: 1.5, marginBottom: 5, paddingLeft: 8, borderLeft: `2px solid ${color}40` }}>
                      {f}
                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Recommendation */}
            <div>
              <SectionTitle>Final Recommendation</SectionTitle>
              <div style={{ background: '#071220', border: `1px solid ${verdictColor}30`, borderTop: `2px solid ${verdictColor}`, borderRadius: 8, padding: 12 }}>
                <p style={{ fontSize: 11, color: '#cdd6f4', lineHeight: 1.75, margin: 0 }}>{analysis.recommendation}</p>
              </div>
            </div>

            {/* Re-analyze */}
            <button
              onClick={() => setAnalysis(null)}
              style={{ fontSize: 10, color: '#4a5e7a', background: 'none', border: '1px solid #1a2d4a', borderRadius: 6, padding: '6px 0', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#7f93b5')}
              onMouseLeave={e => (e.currentTarget.style.color = '#4a5e7a')}>
              ↺ Analyze another trade
            </button>
          </div>
        )}
      </div>

      <style>{`@keyframes yn-spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
