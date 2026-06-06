'use client'

import { useState, useCallback } from 'react'

const RATING_CLR: Record<string, string> = {
  'Strong Buy': '#00ff88', 'Buy': '#00c896', 'Hold': '#f59e0b', 'Sell': '#ff6b35', 'Strong Sell': '#ff2d78',
}

type Mini = { ticker: string; name: string; price: number; analysis: { rating: string; confidence: number; price_target: number } }

export default function EmbedAnalyzer() {
  const [input, setInput]     = useState('')
  const [loading, setLoading] = useState(false)
  const [res, setRes]         = useState<Mini | null>(null)
  const [err, setErr]         = useState('')

  const run = useCallback(async (sym: string) => {
    const t = sym.trim().toUpperCase(); if (!t) return
    setLoading(true); setRes(null); setErr('')
    try {
      const r = await fetch('/api/stock-analyzer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: t, timeframe: '3M' }) })
      const d = await r.json()
      if (!r.ok || d.error || !d.analysis) { setErr(d.error || 'Analysis failed'); return }
      setRes(d)
    } catch { setErr('Network error') } finally { setLoading(false) }
  }, [])

  const a = res?.analysis
  const clr = a ? (RATING_CLR[a.rating] ?? '#00d4aa') : '#00d4aa'
  const upside = res && a ? ((a.price_target - res.price) / res.price) * 100 : 0
  const full = `https://ynfinance.org/ai-stocks${res ? `?ticker=${res.ticker}` : ''}`

  return (
    <div style={{ background: '#030a06', color: '#a0ffcc', fontFamily: '"JetBrains Mono",ui-monospace,monospace', minHeight: '100vh', display: 'flex', flexDirection: 'column', padding: 14 }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}@keyframes bl{0%,49%{opacity:1}50%,100%{opacity:0}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#00ff88,#00d4ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 9, color: '#030a06' }}>YN</div>
        <span style={{ fontSize: 12, fontWeight: 800, color: '#00ff88', letterSpacing: '1px' }}>AI STOCK ANALYZER</span>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', border: '1px solid #00ff8840', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
        <input value={input}
          onChange={e => setInput(e.target.value.toUpperCase().replace(/[^A-Z0-9.\-]/g, ''))}
          onKeyDown={e => e.key === 'Enter' && run(input)}
          placeholder="ENTER TICKER…" autoComplete="off"
          style={{ flex: 1, background: 'rgba(0,20,10,.9)', border: 'none', padding: '12px 14px', fontSize: 14, color: '#00ff88', fontFamily: 'inherit', fontWeight: 800, letterSpacing: '2px', outline: 'none' }} />
        <button onClick={() => run(input)} disabled={loading || !input.trim()}
          style={{ background: loading || !input.trim() ? 'transparent' : '#00ff88', border: 'none', padding: '0 18px', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', color: loading || !input.trim() ? '#1a4a2a' : '#030a06', fontWeight: 900, fontSize: 12, fontFamily: 'inherit' }}>
          {loading ? '···' : 'GO'}
        </button>
      </div>

      {/* Body */}
      <div style={{ flex: 1 }}>
        {!res && !loading && !err && (
          <div style={{ fontSize: 11, color: '#1a4a2a', lineHeight: 1.7, padding: '10px 0' }}>
            Type any ticker for an instant AI rating, target &amp; conviction.<br />
            <span style={{ color: '#4a7a6a' }}>e.g. AAPL · NVDA · TSLA</span>
          </div>
        )}
        {loading && <div style={{ fontSize: 12, color: '#00ff88', padding: '14px 0' }}>Running 5-agent analysis<span style={{ animation: 'bl 1s infinite' }}>_</span></div>}
        {err && <div style={{ fontSize: 11, color: '#ff2d78', padding: '12px 0' }}>⚠ {err}</div>}

        {res && a && (
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 18, fontWeight: 900, color: '#00ff88' }}>{res.ticker}</span>
              <span style={{ fontSize: 11, color: '#4a7a6a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{res.name}</span>
              <span style={{ marginLeft: 'auto', fontSize: 13, fontFamily: 'monospace', color: '#a0ffcc' }}>${res.price.toFixed(2)}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
              {[
                { l: 'RATING', v: a.rating, c: clr },
                { l: 'TARGET', v: `$${a.price_target.toFixed(2)}`, c: '#00d4ff' },
                { l: 'UPSIDE', v: `${upside >= 0 ? '+' : ''}${upside.toFixed(1)}%`, c: upside >= 0 ? '#00ff88' : '#ff2d78' },
              ].map(({ l, v, c }) => (
                <div key={l} style={{ background: 'rgba(0,20,10,.7)', border: `1px solid ${c}30`, borderRadius: 3, padding: '10px', textAlign: 'center' }}>
                  <div style={{ fontSize: 8, color: '#4a7a6a', letterSpacing: '.5px', marginBottom: 4 }}>{l}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 9, color: '#4a7a6a', marginBottom: 4 }}>CONVICTION {a.confidence}%</div>
            <div style={{ height: 5, background: '#041810', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${a.confidence}%`, background: clr, boxShadow: `0 0 8px ${clr}` }} />
            </div>
            <a href={full} target="_top" style={{ display: 'block', textAlign: 'center', marginTop: 14, background: '#00ff88', color: '#030a06', padding: '11px', borderRadius: 4, fontSize: 12, fontWeight: 900, textDecoration: 'none', letterSpacing: '1px' }}>
              FULL BREAKDOWN ON YN FINANCE →
            </a>
          </div>
        )}
      </div>

      {/* Footer attribution — every embed is a backlink */}
      <a href="https://ynfinance.org/ai-stocks" target="_top" style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 9, color: '#1a4a2a', letterSpacing: '1px', textDecoration: 'none' }}>
        ⚡ POWERED BY YN FINANCE · ynfinance.org
      </a>
    </div>
  )
}
