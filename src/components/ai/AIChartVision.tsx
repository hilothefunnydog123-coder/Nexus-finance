'use client'

import { useState, useRef } from 'react'
import { Camera, Bot, X, Upload } from 'lucide-react'

export default function AIChartVision() {
  const [open, setOpen] = useState(false)
  const [analysis, setAnalysis] = useState('')
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const analyze = async (base64: string) => {
    setLoading(true)
    setAnalysis('')
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'chart_vision', data: { imageBase64: base64 } }),
      })
      const json = await res.json()
      setAnalysis(json.analysis || 'Could not analyze chart.')
    } catch {
      setAnalysis('Connection error — try again.')
    }
    setLoading(false)
  }

  const onFile = (file: File) => {
    const reader = new FileReader()
    reader.onload = e => {
      const dataUrl = e.target?.result as string
      setPreview(dataUrl)
      const base64 = dataUrl.split(',')[1]
      analyze(base64)
    }
    reader.readAsDataURL(file)
  }

  const onPaste = (e: React.ClipboardEvent) => {
    const item = Array.from(e.clipboardData.items).find(i => i.type.startsWith('image'))
    if (item) { const f = item.getAsFile(); if (f) onFile(f) }
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 700, color: '#a855f7', background: '#a855f715', border: '1px solid #a855f730', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
      <Camera size={11} /> AI Chart Analysis
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }} onPaste={onPaste}>
      <div style={{ background: '#071220', border: '1px solid #1e3a5f', borderRadius: 16, width: '100%', maxWidth: 600, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Bot size={16} color="#a855f7" />
          <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>AI Chart Vision</span>
          <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 4 }}>Gemini sees your chart</span>
          <button onClick={() => { setOpen(false); setPreview(''); setAnalysis('') }} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ padding: 20 }}>
          {!preview ? (
            <div
              onClick={() => fileRef.current?.click()}
              style={{ border: '2px dashed #1a2d4a', borderRadius: 12, padding: '40px 20px', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#a855f7')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#1a2d4a')}>
              <Upload size={32} color="#4a5e7a" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', marginBottom: 6 }}>Upload or paste your chart</div>
              <div style={{ fontSize: 11, color: '#4a5e7a' }}>Ctrl+V to paste screenshot · or click to upload file</div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
            </div>
          ) : (
            <div>
              <img src={preview} alt="chart" style={{ width: '100%', borderRadius: 8, marginBottom: 12, maxHeight: 240, objectFit: 'contain', background: '#040c14' }} />
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 0' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', animation: 'pulse 1s infinite' }} />
                  <span style={{ fontSize: 12, color: '#7f93b5' }}>Gemini is analyzing your chart...</span>
                </div>
              ) : analysis ? (
                <div style={{ background: '#a855f710', border: '1px solid #a855f730', borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <Bot size={13} color="#a855f7" />
                    <span style={{ fontSize: 10, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Analysis</span>
                  </div>
                  <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{analysis}</p>
                </div>
              ) : null}
              <button onClick={() => { setPreview(''); setAnalysis('') }} style={{ marginTop: 10, fontSize: 11, color: '#4a5e7a', background: 'none', border: '1px solid #1a2d4a', borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
                Analyze another chart
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
