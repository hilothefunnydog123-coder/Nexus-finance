'use client'

import { useState, useRef } from 'react'
import { Camera, Bot, X, Upload, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface Signal {
  signal: 'LONG' | 'SHORT' | 'NO TRADE'
  confidence: number
  entry: number | null
  sl: number | null
  tp1: number | null
  tp2: number | null
  rr: string
  pattern: string
  strategy: string
  thesis: string
  invalidation: string
  timeframe: string
}

export default function AIChartVision() {
  const [open, setOpen] = useState(false)
  const [signal, setSignal] = useState<Signal | null>(null)
  const [rawAnalysis, setRawAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const analyze = async (base64: string) => {
    setLoading(true)
    setSignal(null)
    setRawAnalysis('')
    try {
      const prompt = `You are an expert technical analyst and trader. Analyze this chart image and generate a specific trade signal. Return ONLY valid JSON, nothing else:

{
  "signal": "LONG" | "SHORT" | "NO TRADE",
  "confidence": <50-95>,
  "entry": <exact price number or null if NO TRADE>,
  "sl": <stop loss price or null>,
  "tp1": <first target price or null>,
  "tp2": <second target price or null>,
  "rr": "<risk:reward ratio like 1:2.4 or N/A>",
  "pattern": "<pattern name like Bull Flag, Order Block, FVG, Head & Shoulders, etc.>",
  "strategy": "<strategy like ICT, Gap & Go, Wick Rejection, Trend Follow, etc.>",
  "thesis": "<2 specific sentences explaining why this signal, referencing what you see in the chart>",
  "invalidation": "<what price action would invalidate this setup, under 12 words>",
  "timeframe": "<inferred chart timeframe like 1M, 5M, 15M, 1H, 4H, 1D>"
}

If the chart is unclear or has no clean setup, set signal to "NO TRADE" and null out price fields. Base entry/sl/tp on visible price levels in the chart.`

      const key = process.env.NEXT_PUBLIC_GEMINI_KEY
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chart_vision_signal', data: { imageBase64: base64, customPrompt: prompt } }),
      })
      const json = await res.json()
      const raw = json.analysis || json.raw || ''

      // Try to parse as structured signal
      const match = raw.match(/\{[\s\S]*\}/)
      if (match) {
        try {
          const parsed = JSON.parse(match[0])
          setSignal(parsed)
          return
        } catch {}
      }
      // Fallback to raw text
      setRawAnalysis(raw)
    } catch {
      setRawAnalysis('Connection error — try again.')
    }
    setLoading(false)
  }

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      analyze(dataUrl.split(',')[1])
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'))
    if (item) { const f = item.getAsFile(); if (f) onFile(f) }
  }

  const reset = () => { setPreview(''); setSignal(null); setRawAnalysis(''); setLoading(false) }

  const signalColor = signal?.signal === 'LONG' ? '#00d4aa' : signal?.signal === 'SHORT' ? '#ff4757' : '#ffa502'
  const SignalIcon = signal?.signal === 'LONG' ? TrendingUp : signal?.signal === 'SHORT' ? TrendingDown : Minus

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#a855f7', background: '#a855f715', border: '1px solid #a855f730', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <Camera size={11} /> AI Chart Signal
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onPaste={onPaste}>
      <div style={{ background: '#071220', border: '1px solid #1e3a5f', borderRadius: 16, width: '100%', maxWidth: 640, overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 10, position: 'sticky', top: 0, background: '#071220', zIndex: 1 }}>
          <Bot size={16} color="#a855f7" />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>AI Chart Signal Analysis</span>
          <span style={{ fontSize: 10, color: '#4a5e7a' }}>Gemini Vision → Long/Short + Entry/SL/TP</span>
          <button onClick={() => { setOpen(false); reset() }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!preview ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #1a2d4a', borderRadius: 12, padding: '48px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2d4a')}>
              <Upload size={36} color="#4a5e7a" style={{ margin: '0 auto 14px' }} />
              <div style={{ fontSize: 14, fontWeight: 700, color: '#cdd6f4', marginBottom: 8 }}>Upload or paste your chart</div>
              <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 6 }}>Ctrl+V to paste · or click to browse</div>
              <div style={{ fontSize: 10, color: '#4a5e7a' }}>Gemini will identify the setup and generate LONG/SHORT signal with exact entry, SL, and TP</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              {/* Chart preview */}
              <img src={preview} alt="chart" style={{ width: '100%', borderRadius: 8, marginBottom: 16, maxHeight: 220, objectFit: 'contain', background: '#040c14' }} />

              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '16px 0' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#a855f7', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 12, color: '#7f93b5' }}>Gemini Vision analyzing chart → generating trade signal...</span>
                </div>
              ) : signal ? (
                <div>
                  {/* Main signal card */}
                  <div style={{ background: `${signalColor}12`, border: `2px solid ${signalColor}50`, borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${signalColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <SignalIcon size={20} color={signalColor} />
                        </div>
                        <div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: signalColor, fontFamily: 'monospace' }}>{signal.signal}</div>
                          <div style={{ fontSize: 10, color: '#7f93b5' }}>{signal.pattern} · {signal.strategy} · {signal.timeframe}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 2 }}>Confidence</div>
                        <div style={{ fontSize: 20, fontWeight: 900, color: signalColor, fontFamily: 'monospace' }}>{signal.confidence}%</div>
                      </div>
                    </div>

                    {/* Price levels */}
                    {signal.entry && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                        {[
                          { label: 'Entry', value: signal.entry, color: '#cdd6f4' },
                          { label: 'Stop Loss', value: signal.sl, color: '#ff4757' },
                          { label: 'TP 1', value: signal.tp1, color: '#00d4aa' },
                          { label: 'TP 2', value: signal.tp2, color: '#00d4aa' },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background: '#040c14', borderRadius: 8, padding: '10px 10px', textAlign: 'center' }}>
                            <div style={{ fontSize: 9, color: '#4a5e7a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
                            <div style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>
                              {value ? (value < 10 ? value.toFixed(4) : value.toFixed(2)) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {signal.rr && signal.rr !== 'N/A' && (
                      <div style={{ marginTop: 10, fontSize: 11, color: '#4a5e7a', display: 'flex', gap: 16 }}>
                        <span>R:R <strong style={{ color: '#00d4aa' }}>{signal.rr}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Thesis + Invalidation */}
                  <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 10, padding: '14px 16px', marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>AI Thesis</div>
                    <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.7, margin: '0 0 10px' }}>{signal.thesis}</p>
                    <div style={{ fontSize: 10, color: '#4a5e7a' }}>
                      <span style={{ color: '#ff4757', fontWeight: 700 }}>Invalidated if: </span>{signal.invalidation}
                    </div>
                  </div>
                </div>
              ) : rawAnalysis ? (
                <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 10, padding: '14px 16px' }}>
                  <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{rawAnalysis}</p>
                </div>
              ) : null}

              {!loading && (
                <button onClick={reset} style={{ marginTop: 12, fontSize: 11, color: '#4a5e7a', background: 'none', border: '1px solid #1a2d4a', borderRadius: 6, padding: '6px 14px', cursor: 'pointer' }}>
                  Analyze another chart
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
