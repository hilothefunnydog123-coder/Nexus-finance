'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, RefreshCw, Bot, Zap, Clock } from 'lucide-react'

interface Stock {
  rank: number
  symbol: string
  signal: 'STRONG BUY' | 'BUY' | 'WATCH'
  price: number
  thesis: string
  horizon: string
  catalyst: string
  risk: string
  technicalScore: number
  momentumScore: number
  confidence: number
}

const SIGNAL_COLOR = { 'STRONG BUY': '#00d4aa', 'BUY': '#1e90ff', 'WATCH': '#ffa502' }
const CACHE_KEY = 'yn_top_stocks'
const CACHE_TTL_MS = 3 * 60 * 60 * 1000 // 3 hours

export default function TopStocksWidget() {
  const [stocks, setStocks] = useState<Stock[]>([])
  const [loading, setLoading] = useState(true)
  const [generatedAt, setGeneratedAt] = useState('')
  const [expanded, setExpanded] = useState<number | null>(null)

  const load = async (force = false) => {
    setLoading(true)
    // Check cache
    if (!force) {
      try {
        const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}')
        if (cached.stocks && Date.now() - new Date(cached.ts).getTime() < CACHE_TTL_MS) {
          setStocks(cached.stocks)
          setGeneratedAt(cached.generatedAt)
          setLoading(false)
          return
        }
      } catch {}
    }
    try {
      const res = await fetch('/api/top-stocks')
      const json = await res.json()
      if (json.stocks?.length) {
        setStocks(json.stocks)
        setGeneratedAt(json.generatedAt)
        localStorage.setItem(CACHE_KEY, JSON.stringify({ stocks: json.stocks, generatedAt: json.generatedAt, ts: new Date().toISOString() }))
      }
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const timeAgo = generatedAt ? (() => {
    const mins = Math.floor((Date.now() - new Date(generatedAt).getTime()) / 60000)
    if (mins < 60) return `${mins}m ago`
    return `${Math.floor(mins / 60)}h ago`
  })() : ''

  return (
    <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '10px 14px', borderBottom: '1px solid #1a2d4a', background: '#040c14', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <Bot size={12} color="#a855f7" />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#cdd6f4', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          AI Top 10 Stocks
        </span>
        <span style={{ fontSize: 9, color: '#a855f7', background: '#a855f715', border: '1px solid #a855f730', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
          GEMINI QUANT
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          {timeAgo && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 9, color: '#4a5e7a' }}>
              <Clock size={9} /> {timeAgo}
            </span>
          )}
          <button onClick={() => load(true)} disabled={loading}
            style={{ background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer', padding: 2 }}>
            <RefreshCw size={11} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <div style={{ padding: '24px 16px', textAlign: 'center' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#4a5e7a' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#a855f7', animation: 'pulse 1s infinite' }} />
              Gemini analyzing 40 stocks with live data...
            </div>
          </div>
        ) : stocks.length === 0 ? (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 11, color: '#4a5e7a' }}>
            Add FINNHUB_API_KEY + GEMINI_API_KEY to Netlify to enable
          </div>
        ) : (
          stocks.map((stock, i) => {
            const signalColor = SIGNAL_COLOR[stock.signal] || '#ffa502'
            const isExpanded = expanded === i
            return (
              <div key={stock.symbol}
                onClick={() => setExpanded(isExpanded ? null : i)}
                style={{ padding: '10px 14px', borderBottom: '1px solid #0a1628', cursor: 'pointer', transition: 'background 0.15s', background: isExpanded ? '#0a1628' : 'transparent' }}
                onMouseEnter={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = '#060f1c' }}
                onMouseLeave={e => { if (!isExpanded) (e.currentTarget as HTMLElement).style.background = 'transparent' }}>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {/* Rank */}
                  <div style={{ width: 20, height: 20, borderRadius: 6, background: i < 3 ? `${signalColor}25` : '#0f1f38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: i < 3 ? signalColor : '#4a5e7a', flexShrink: 0 }}>
                    {stock.rank}
                  </div>

                  {/* Symbol */}
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: 12, minWidth: 42 }}>{stock.symbol}</div>

                  {/* Signal */}
                  <div style={{ fontSize: 8, fontWeight: 700, color: signalColor, background: `${signalColor}15`, border: `1px solid ${signalColor}30`, borderRadius: 4, padding: '2px 6px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {stock.signal}
                  </div>

                  {/* Catalyst */}
                  <div style={{ flex: 1, fontSize: 9, color: '#4a5e7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stock.catalyst}</div>

                  {/* Confidence */}
                  <div style={{ fontSize: 9, fontWeight: 700, color: signalColor, fontFamily: 'monospace', flexShrink: 0 }}>{stock.confidence}%</div>
                </div>

                {/* Score bars */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                  {[['Tech', stock.technicalScore, '#1e90ff'], ['Mom', stock.momentumScore, '#00d4aa']].map(([label, score, color]) => (
                    <div key={label as string} style={{ display: 'flex', alignItems: 'center', gap: 4, flex: 1 }}>
                      <span style={{ fontSize: 8, color: '#4a5e7a', width: 24 }}>{label}</span>
                      <div style={{ flex: 1, height: 3, background: '#0f1f38', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ width: `${(score as number) * 10}%`, height: '100%', background: color as string, borderRadius: 2 }} />
                      </div>
                      <span style={{ fontSize: 8, color: color as string, fontFamily: 'monospace', width: 12 }}>{score}</span>
                    </div>
                  ))}
                  <span style={{ fontSize: 8, color: '#4a5e7a', whiteSpace: 'nowrap' }}>{stock.horizon}</span>
                </div>

                {/* Expanded thesis */}
                {isExpanded && (
                  <div style={{ marginTop: 10, padding: '10px 12px', background: '#040c14', borderRadius: 8, border: `1px solid ${signalColor}20` }}>
                    <p style={{ fontSize: 11, color: '#cdd6f4', lineHeight: 1.7, margin: '0 0 8px' }}>{stock.thesis}</p>
                    <div style={{ display: 'flex', gap: 12, fontSize: 9 }}>
                      <span style={{ color: '#00d4aa' }}>Price: ${stock.price?.toFixed(2)}</span>
                      <span style={{ color: '#ffa502' }}>⚠ {stock.risk}</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <div style={{ padding: '6px 14px', borderTop: '1px solid #0a1628', background: '#040c14', flexShrink: 0 }}>
        <p style={{ fontSize: 9, color: '#4a5e7a', margin: 0 }}>AI analysis for educational purposes only. Not financial advice. Updates every 3 hours.</p>
      </div>
    </div>
  )
}
