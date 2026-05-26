'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

// ── Types ──────────────────────────────────────────────────────────────────────
interface CongressTrade {
  transaction_date:  string
  ticker:            string
  asset_description: string
  type:              string
  amount:            string
  representative:    string
  party?:            string
  state?:            string
  district?:         string
  current_price:     number
  suspicion_score:   number
}

interface CongressStats {
  total_this_year:  number
  biggest_trade:    string
  most_active_rep:  string
  total_reps:       number
}

interface CongressData {
  trades: CongressTrade[]
  stats:  CongressStats
}

// ── Custom Cursor ──────────────────────────────────────────────────────────────
function CustomCursor() {
  const dotRef  = useRef<HTMLDivElement>(null)
  const ringRef = useRef<HTMLDivElement>(null)
  const mouse   = useRef({ x: -200, y: -200 })
  const ring    = useRef({ x: -200, y: -200 })

  useEffect(() => {
    const move = (e: MouseEvent) => { mouse.current = { x: e.clientX, y: e.clientY } }
    window.addEventListener('mousemove', move)
    let raf: number
    const loop = () => {
      if (dotRef.current) {
        dotRef.current.style.transform  = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
      }
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12
      if (ringRef.current) {
        ringRef.current.style.transform = `translate(${ring.current.x - 16}px,${ring.current.y - 16}px)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#00d4aa', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(0,212,170,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform', transition:'opacity .2s' }}/>
    </>
  )
}

// ── Suspicion Bar ──────────────────────────────────────────────────────────────
function SuspicionBar({ score }: { score: number }) {
  const color = score >= 80 ? '#ff2d78' : score >= 60 ? '#f59e0b' : score >= 40 ? '#1e90ff' : '#00d4aa'
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
        <span style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>SUSPICION</span>
        <span style={{ fontSize:11, color, fontFamily:'monospace', fontWeight:700 }}>{score}</span>
      </div>
      <div style={{ height:4, borderRadius:2, background:'rgba(255,255,255,.08)', overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${score}%`, borderRadius:2, background:color, boxShadow:`0 0 8px ${color}80`, transition:'width .8s ease' }}/>
      </div>
    </div>
  )
}

// ── Trade Card ─────────────────────────────────────────────────────────────────
function TradeCard({ trade, index }: { trade: CongressTrade; index: number }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis,  setAnalysis]  = useState('')
  const [expanded,  setExpanded]  = useState(false)

  const isBuy   = trade.type?.toLowerCase() === 'purchase'
  const party   = trade.party?.toUpperCase()
  const initials = trade.representative.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('')

  const partyColor = party === 'D' ? '#1e90ff' : party === 'R' ? '#ff2d78' : '#6a90a8'
  const tradeColor = isBuy ? '#00d4aa' : '#ff2d78'

  const handleAnalyze = useCallback(async () => {
    if (analysis) { setExpanded(e => !e); return }
    setAnalyzing(true)
    setExpanded(true)
    try {
      const r = await fetch('/api/congress', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticker:            trade.ticker,
          representative:    trade.representative,
          type:              trade.type,
          amount:            trade.amount,
          transaction_date:  trade.transaction_date,
          asset_description: trade.asset_description,
        }),
      })
      const d = await r.json()
      setAnalysis(d.analysis || d.error || 'Analysis unavailable.')
    } catch {
      setAnalysis('Connection error. Please try again.')
    } finally {
      setAnalyzing(false)
    }
  }, [trade, analysis])

  return (
    <div style={{
      background:'rgba(255,255,255,.03)',
      border:'1px solid rgba(255,255,255,.07)',
      borderRadius:12,
      padding:'18px 20px',
      marginBottom:12,
      animation:`fadeUp .4s ease ${index * 0.05}s both`,
      transition:'border-color .2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(0,212,170,.3)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)')}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:14 }}>
        {/* Avatar */}
        <div style={{
          width:44, height:44, borderRadius:10, flexShrink:0,
          background:`linear-gradient(135deg,${partyColor}40,${partyColor}20)`,
          border:`1px solid ${partyColor}60`,
          display:'flex', alignItems:'center', justifyContent:'center',
          fontSize:14, fontWeight:700, color:'#fff', fontFamily:'monospace',
        }}>
          {initials || '??'}
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Header row */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:6 }}>
            <span style={{ fontSize:14, fontWeight:600, color:'#e8f4f8' }}>
              {trade.representative}
            </span>
            {party && (
              <span style={{
                fontSize:10, fontWeight:700, letterSpacing:'0.1em',
                color: partyColor, background:`${partyColor}20`,
                border:`1px solid ${partyColor}40`,
                borderRadius:4, padding:'1px 6px',
              }}>
                {party}
              </span>
            )}
            {trade.state && (
              <span style={{ fontSize:11, color:'#6a90a8', fontFamily:'monospace' }}>{trade.state}</span>
            )}
          </div>

          {/* Ticker + asset */}
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <span style={{ fontSize:16, fontWeight:800, color:'#00d4aa', fontFamily:'monospace', letterSpacing:'0.04em' }}>
              {trade.ticker}
            </span>
            {trade.current_price > 0 && (
              <span style={{ fontSize:12, color:'#6a90a8', fontFamily:'monospace' }}>
                ${trade.current_price.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize:11, color:'#4a6a7a', flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {trade.asset_description}
            </span>
          </div>

          {/* Trade meta */}
          <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{
              fontSize:11, fontWeight:700, letterSpacing:'0.1em',
              color: tradeColor, background:`${tradeColor}18`,
              border:`1px solid ${tradeColor}40`,
              borderRadius:4, padding:'2px 8px',
            }}>
              {isBuy ? 'BUY' : 'SELL'}
            </span>
            <span style={{ fontSize:12, color:'#a0b4bf', fontFamily:'monospace' }}>{trade.amount}</span>
            <span style={{ fontSize:11, color:'#6a90a8', fontFamily:'monospace' }}>
              {new Date(trade.transaction_date).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
            </span>
          </div>

          <SuspicionBar score={trade.suspicion_score} />

          {/* Analyze button */}
          <button
            onClick={handleAnalyze}
            style={{
              marginTop:12, padding:'6px 14px',
              background: analysis ? 'rgba(0,212,170,.08)' : 'transparent',
              border:`1px solid ${analysis ? 'rgba(0,212,170,.4)' : 'rgba(255,255,255,.12)'}`,
              borderRadius:6, cursor:'pointer',
              fontSize:12, color: analysis ? '#00d4aa' : '#a0b4bf',
              fontFamily:'monospace', letterSpacing:'0.06em',
              transition:'all .2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(0,212,170,.5)'; (e.currentTarget as HTMLButtonElement).style.color='#00d4aa' }}
            onMouseLeave={e => { if (!analysis) { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.12)'; (e.currentTarget as HTMLButtonElement).style.color='#a0b4bf' }}}
          >
            {analyzing ? '◌ ANALYZING...' : analysis ? (expanded ? '▲ HIDE ANALYSIS' : '▼ SHOW ANALYSIS') : 'ANALYZE →'}
          </button>

          {/* AI Analysis expansion */}
          {expanded && (
            <div style={{
              marginTop:12, padding:'12px 14px',
              background:'rgba(0,212,170,.05)',
              border:'1px solid rgba(0,212,170,.2)',
              borderRadius:8,
              animation:'fadeUp .3s ease both',
            }}>
              {analyzing ? (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:'#00d4aa', animation:'pulse 1s infinite' }}/>
                  <span style={{ fontSize:12, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.05em' }}>
                    RUNNING AI ANALYSIS...
                  </span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:10, color:'#00d4aa', fontFamily:'monospace', letterSpacing:'0.12em', marginBottom:6, opacity:0.7 }}>
                    AI INTELLIGENCE REPORT
                  </div>
                  <p style={{ fontSize:13, color:'#c8dde8', lineHeight:1.6, margin:0 }}>{analysis}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Loading Screen ─────────────────────────────────────────────────────────────
function LoadingScreen() {
  const [line, setLine] = useState(0)
  const lines = [
    'ACCESSING CONGRESSIONAL TRADE DATABASE...',
    'PULLING HOUSE FINANCIAL DISCLOSURES...',
    'FILTERING LAST 90 DAYS...',
    'ENRICHING WITH LIVE MARKET DATA...',
    'COMPUTING SUSPICION SCORES...',
    'READY.',
  ]
  useEffect(() => {
    if (line >= lines.length - 1) return
    const t = setTimeout(() => setLine(l => l + 1), 600)
    return () => clearTimeout(t)
  }, [line, lines.length])

  return (
    <div style={{ minHeight:'60vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:16 }}>
      <div style={{ width:2, height:60, background:'linear-gradient(to bottom,#00d4aa,transparent)', margin:'0 auto', animation:'scanLine 1.5s ease-in-out infinite' }}/>
      <div style={{ fontFamily:'monospace', fontSize:13, color:'#00d4aa', letterSpacing:'0.1em', textAlign:'center' }}>
        {lines.slice(0, line + 1).map((l, i) => (
          <div key={i} style={{ opacity: i === line ? 1 : 0.35, marginBottom:6, transition:'opacity .3s' }}>
            {i < line ? '✓' : '›'} {l}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function CongressPage() {
  const [data,    setData]    = useState<CongressData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/congress')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const top5Suspicious = data?.trades
    .slice()
    .sort((a, b) => b.suspicion_score - a.suspicion_score)
    .slice(0, 5) ?? []

  const activeThisMonth = data?.trades
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.representative] = (acc[t.representative] ?? 0) + 1
      return acc
    }, {})

  const activeList = Object.entries(activeThisMonth ?? {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)

  return (
    <>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; cursor: none; }
        body { background: #030a10; color: #e8f4f8; font-family: 'Inter', system-ui, sans-serif; }
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:none } }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes scanLine { 0%,100%{opacity:.3;transform:scaleY(1)} 50%{opacity:1;transform:scaleY(1.8)} }
        @keyframes glowPulse { 0%,100%{box-shadow:0 0 20px rgba(0,212,170,.15)} 50%{box-shadow:0 0 40px rgba(0,212,170,.4)} }
        @media (max-width:768px) {
          .two-col { flex-direction: column !important; }
          .hero-headline { font-size: 36px !important; }
          .stats-row { flex-wrap: wrap !important; }
          .stat-card { flex: 1 1 calc(50% - 8px) !important; min-width: 0 !important; }
        }
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(3,10,16,.9)', backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,.06)',
        padding:'0 24px', height:60,
        display:'flex', alignItems:'center', justifyContent:'space-between',
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize:14, fontWeight:700, color:'#fff', letterSpacing:'-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,.12)' }}/>
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.18em', color:'#00d4aa', fontFamily:'monospace' }}>
            CONGRESS TRACKER
          </span>
        </div>
        <Link href="/" style={{
          fontSize:12, color:'#6a90a8', textDecoration:'none', fontFamily:'monospace',
          letterSpacing:'0.08em', padding:'6px 12px',
          border:'1px solid rgba(255,255,255,.08)', borderRadius:6,
          transition:'all .2s',
        }}>
          ← BACK
        </Link>
      </nav>

      {/* HERO */}
      <div style={{
        padding:'80px 24px 60px',
        maxWidth:1100, margin:'0 auto',
        textAlign:'center',
      }}>
        <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#00d4aa', fontFamily:'monospace', marginBottom:20, opacity:0.8 }}>
          PUBLIC RECORD · MANDATORY DISCLOSURE · REAL DATA
        </div>
        <h1 className="hero-headline" style={{
          fontSize:56, fontWeight:900, lineHeight:1.05,
          background:'linear-gradient(135deg,#e8f4f8 0%,#00d4aa 50%,#1e90ff 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent',
          backgroundClip:'text',
          marginBottom:24, letterSpacing:'-0.03em',
        }}>
          They knew before you did.
        </h1>
        <p style={{ fontSize:17, color:'#7a9aaa', lineHeight:1.7, maxWidth:600, margin:'0 auto' }}>
          Members of Congress are required by law to disclose stock trades. This is all public information. AI reads every disclosure the moment it lands.
        </p>
      </div>

      {/* STATS ROW */}
      {data && (
        <div className="stats-row" style={{
          display:'flex', gap:12, padding:'0 24px 40px',
          maxWidth:1100, margin:'0 auto',
        }}>
          {[
            { label:'TOTAL TRADES THIS YEAR', value: data.stats.total_this_year.toLocaleString(), color:'#00d4aa' },
            { label:'BIGGEST SINGLE TRADE',   value: data.stats.biggest_trade,                    color:'#ff2d78' },
            { label:'MOST ACTIVE MEMBER',     value: data.stats.most_active_rep.split(' ').slice(-1)[0], color:'#1e90ff' },
            { label:'TOTAL MEMBERS TRADING',  value: data.stats.total_reps.toLocaleString(),       color:'#a855f7' },
          ].map(s => (
            <div key={s.label} className="stat-card" style={{
              flex:1, padding:'20px 22px',
              background:'rgba(255,255,255,.03)',
              border:'1px solid rgba(255,255,255,.07)',
              borderRadius:12,
              animation:'fadeUp .5s ease both',
            }}>
              <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.12em', marginBottom:8 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:800, color:s.color, fontFamily:'monospace', letterSpacing:'-0.02em', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MAIN CONTENT */}
      <div className="two-col" style={{ display:'flex', gap:20, padding:'0 24px 80px', maxWidth:1100, margin:'0 auto' }}>

        {/* Left: Trade Feed */}
        <div style={{ flex:'0 0 65%', minWidth:0 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <h2 style={{ fontSize:16, fontWeight:700, letterSpacing:'0.06em', color:'#e8f4f8', fontFamily:'monospace' }}>
              LIVE DISCLOSURE FEED
            </h2>
            {data && (
              <span style={{ fontSize:11, color:'#6a90a8', fontFamily:'monospace' }}>
                {data.trades.length} TRADES LOADED
              </span>
            )}
          </div>

          {loading && <LoadingScreen />}

          {error && (
            <div style={{
              padding:'32px', textAlign:'center',
              background:'rgba(255,45,120,.05)',
              border:'1px solid rgba(255,45,120,.2)',
              borderRadius:12,
            }}>
              <div style={{ fontSize:13, color:'#ff2d78', fontFamily:'monospace', marginBottom:8 }}>DATA FEED ERROR</div>
              <div style={{ fontSize:12, color:'#6a90a8' }}>{error}</div>
            </div>
          )}

          {data && data.trades.map((t, i) => (
            <TradeCard key={`${t.ticker}-${t.transaction_date}-${i}`} trade={t} index={i} />
          ))}
        </div>

        {/* Right: Sidebar */}
        <div style={{ flex:'0 0 35%', minWidth:0 }}>

          {/* Most Suspicious */}
          <div style={{
            background:'rgba(255,45,120,.05)',
            border:'1px solid rgba(255,45,120,.15)',
            borderRadius:12, padding:'20px',
            marginBottom:16,
          }}>
            <h3 style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', color:'#ff2d78', fontFamily:'monospace', marginBottom:16 }}>
              ▲ MOST SUSPICIOUS BUYS
            </h3>
            {loading && <div style={{ fontSize:12, color:'#6a90a8', fontFamily:'monospace' }}>Loading...</div>}
            {top5Suspicious.map((t, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', gap:12,
                padding:'10px 0',
                borderBottom: i < top5Suspicious.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
              }}>
                <span style={{ fontSize:12, fontWeight:700, color:'#ff2d78', fontFamily:'monospace', width:20 }}>
                  {i + 1}
                </span>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:600, color:'#e8f4f8' }}>
                    {t.ticker}
                  </div>
                  <div style={{ fontSize:11, color:'#6a90a8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {t.representative.split(' ').slice(-1)[0]}
                  </div>
                </div>
                <span style={{
                  fontSize:12, fontWeight:700, color:'#ff2d78', fontFamily:'monospace',
                  background:'rgba(255,45,120,.12)', borderRadius:4, padding:'2px 7px',
                }}>
                  {t.suspicion_score}
                </span>
              </div>
            ))}
          </div>

          {/* Active This Month */}
          <div style={{
            background:'rgba(30,144,255,.05)',
            border:'1px solid rgba(30,144,255,.15)',
            borderRadius:12, padding:'20px',
            marginBottom:16,
          }}>
            <h3 style={{ fontSize:12, fontWeight:700, letterSpacing:'0.14em', color:'#1e90ff', fontFamily:'monospace', marginBottom:16 }}>
              ACTIVE THIS PERIOD
            </h3>
            {activeList.map(([name, count], i) => (
              <div key={i} style={{
                display:'flex', alignItems:'center', justifyContent:'space-between',
                padding:'8px 0',
                borderBottom: i < activeList.length - 1 ? '1px solid rgba(255,255,255,.05)' : 'none',
              }}>
                <span style={{ fontSize:12, color:'#c8dde8', overflow:'hidden', textOverflow:'ellipsis', flex:1, paddingRight:8 }}>
                  {name}
                </span>
                <span style={{ fontSize:12, fontFamily:'monospace', color:'#1e90ff', fontWeight:700 }}>
                  {count} trades
                </span>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{
            background:'rgba(255,255,255,.02)',
            border:'1px solid rgba(255,255,255,.06)',
            borderRadius:12, padding:'16px 18px',
          }}>
            <div style={{ fontSize:10, color:'#6a90a8', letterSpacing:'0.08em', fontFamily:'monospace', marginBottom:8 }}>
              DATA SOURCE
            </div>
            <p style={{ fontSize:12, color:'#4a6a7a', lineHeight:1.6 }}>
              All data is sourced from mandatory House financial disclosures under the STOCK Act. This is public record. Trades may be disclosed up to 45 days after execution.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
