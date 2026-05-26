'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

// ── Types ──────────────────────────────────────────────────────────────────────
interface EarningsHistoryItem {
  period:           string
  actual?:          number
  estimate?:        number
  surprise?:        number
  surprisePercent?: number
}

interface EarningsCompany {
  symbol:        string
  name:          string
  earnings_date: string
  days_away:     number
  history:       EarningsHistoryItem[]
  honesty_score: number
  beat_rate:     number
  eps_estimate:  number | null
}

interface EarningsData {
  upcoming:     EarningsCompany[]
  last_updated: string
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
      if (dotRef.current)  dotRef.current.style.transform  = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
      ring.current.x += (mouse.current.x - ring.current.x) * 0.12
      ring.current.y += (mouse.current.y - ring.current.y) * 0.12
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.current.x - 16}px,${ring.current.y - 16}px)`
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => { window.removeEventListener('mousemove', move); cancelAnimationFrame(raf) }
  }, [])

  return (
    <>
      <div ref={dotRef}  style={{ position:'fixed',top:0,left:0,width:8, height:8, borderRadius:'50%',background:'#00d4aa',pointerEvents:'none',zIndex:9999,willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed',top:0,left:0,width:32,height:32,borderRadius:'50%',border:'1.5px solid rgba(0,212,170,.5)',pointerEvents:'none',zIndex:9998,willChange:'transform' }}/>
    </>
  )
}

// ── Truth Score Gauge ──────────────────────────────────────────────────────────
function TruthGauge({ score }: { score: number }) {
  const color   = score >= 70 ? '#00ff88' : score >= 45 ? '#f59e0b' : '#ff2d78'
  const label   = score >= 70 ? 'HONEST' : score >= 45 ? 'MIXED' : 'DIVERGENT'

  // SVG gauge — semicircle from 180deg to 0deg
  const R    = 36
  const cx   = 48
  const cy   = 48
  const pct  = score / 100
  const startAngle = Math.PI
  const endAngle   = Math.PI + pct * Math.PI
  const x1   = cx + R * Math.cos(startAngle)
  const y1   = cy + R * Math.sin(startAngle)
  const x2   = cx + R * Math.cos(endAngle)
  const y2   = cy + R * Math.sin(endAngle)
  const largeArc = pct > 0.5 ? 1 : 0

  return (
    <div style={{ display:'flex',flexDirection:'column',alignItems:'center' }}>
      <svg width={96} height={56} viewBox="0 0 96 56" style={{ overflow:'visible' }}>
        {/* Track */}
        <path
          d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`}
          fill="none" stroke="rgba(255,255,255,.1)" strokeWidth={8} strokeLinecap="round"
        />
        {/* Value arc */}
        {score > 0 && (
          <path
            d={`M ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2}`}
            fill="none" stroke={color} strokeWidth={8} strokeLinecap="round"
            style={{ filter:`drop-shadow(0 0 6px ${color})` }}
          />
        )}
        {/* Needle dot */}
        <circle cx={x2} cy={y2} r={4} fill={color} style={{ filter:`drop-shadow(0 0 4px ${color})` }}/>
      </svg>
      <div style={{ fontSize:22,fontWeight:800,color,fontFamily:'monospace',marginTop:-8,lineHeight:1 }}>{score}</div>
      <div style={{ fontSize:9,fontWeight:700,letterSpacing:'0.14em',color,opacity:.7,fontFamily:'monospace',marginTop:3 }}>{label}</div>
    </div>
  )
}

// ── Mini History Bars ──────────────────────────────────────────────────────────
function HistoryBars({ history }: { history: EarningsHistoryItem[] }) {
  const quarters = history.slice(0, 4)
  return (
    <div style={{ display:'flex',gap:4,alignItems:'flex-end',height:28 }}>
      {quarters.length === 0 && (
        <span style={{ fontSize:10,color:'#4a6a7a',fontFamily:'monospace' }}>No data</span>
      )}
      {quarters.map((q, i) => {
        const sp    = Number(q.surprisePercent ?? 0)
        const beat  = sp > 0
        const color = beat ? '#00ff88' : '#ff2d78'
        const h     = Math.max(4, Math.min(28, 14 + Math.abs(sp) * 0.8))
        return (
          <div key={i} style={{ display:'flex',flexDirection:'column',alignItems:'center',gap:2 }}>
            <div style={{
              width:10,height:h,borderRadius:2,
              background:color,
              boxShadow:`0 0 6px ${color}80`,
              opacity:0.8 + i * 0.05,
            }}/>
            <span style={{ fontSize:8,color:color,fontFamily:'monospace' }}>
              {sp > 0 ? '+' : ''}{sp.toFixed(0)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── Company Card ──────────────────────────────────────────────────────────────
function CompanyCard({ company, index }: { company: EarningsCompany; index: number }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis,  setAnalysis]  = useState('')
  const [expanded,  setExpanded]  = useState(false)

  const handleDecode = useCallback(async () => {
    if (analysis) { setExpanded(e => !e); return }
    setAnalyzing(true)
    setExpanded(true)
    try {
      const lastQ       = company.history[0]
      const surprisePct = Number(lastQ?.surprisePercent ?? 0)
      const tone        = company.honesty_score >= 70 ? 'conservative' : company.honesty_score >= 45 ? 'mixed' : 'aggressive'

      const r = await fetch('/api/earnings', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol:              company.symbol,
          company_name:        company.name,
          recent_surprise_pct: surprisePct,
          guidance_tone:       tone,
          earnings_date:       company.earnings_date,
        }),
      })
      const d = await r.json()
      setAnalysis(d.analysis || d.error || 'Analysis unavailable.')
    } catch {
      setAnalysis('Connection error.')
    } finally {
      setAnalyzing(false)
    }
  }, [company, analysis])

  const daysLabel = company.days_away === 0
    ? 'TODAY'
    : company.days_away === 1
      ? 'TOMORROW'
      : `in ${company.days_away} days`

  const scoreColor = company.honesty_score >= 70 ? '#00ff88' : company.honesty_score >= 45 ? '#f59e0b' : '#ff2d78'

  return (
    <div style={{
      background:'rgba(255,255,255,.025)',
      border:'1px solid rgba(255,255,255,.07)',
      borderRadius:14,padding:'22px',
      animation:`fadeUp .4s ease ${index * 0.06}s both`,
      transition:'all .25s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor=`${scoreColor}40`
        ;(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.04)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,.07)'
        ;(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.025)'
      }}
    >
      {/* Top row: ticker box + name + gauge */}
      <div style={{ display:'flex',alignItems:'flex-start',gap:16,marginBottom:18 }}>
        {/* Logo placeholder */}
        <div style={{
          width:52,height:52,borderRadius:10,flexShrink:0,
          background:`linear-gradient(135deg,${scoreColor}30,${scoreColor}10)`,
          border:`1px solid ${scoreColor}40`,
          display:'flex',alignItems:'center',justifyContent:'center',
          fontSize:13,fontWeight:800,color:'#fff',fontFamily:'monospace',letterSpacing:'0.04em',
        }}>
          {company.symbol.slice(0, 4)}
        </div>

        <div style={{ flex:1,minWidth:0 }}>
          <div style={{ fontSize:16,fontWeight:700,color:'#e8f4f8',marginBottom:4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
            {company.name}
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:10 }}>
            <span style={{ fontSize:14,fontWeight:800,color:'#00d4aa',fontFamily:'monospace' }}>
              {company.symbol}
            </span>
            <span style={{
              fontSize:10,fontWeight:700,letterSpacing:'0.1em',
              color: company.days_away <= 3 ? '#ff2d78' : '#f59e0b',
              background: company.days_away <= 3 ? 'rgba(255,45,120,.12)' : 'rgba(245,158,11,.1)',
              border:`1px solid ${company.days_away <= 3 ? 'rgba(255,45,120,.3)' : 'rgba(245,158,11,.25)'}`,
              borderRadius:4,padding:'2px 7px',
            }}>
              {daysLabel}
            </span>
          </div>
          {company.eps_estimate !== null && (
            <div style={{ fontSize:11,color:'#6a90a8',fontFamily:'monospace',marginTop:4 }}>
              EPS EST: <span style={{ color:'#a0b4bf' }}>${company.eps_estimate.toFixed(2)}</span>
            </div>
          )}
        </div>

        <TruthGauge score={company.honesty_score} />
      </div>

      {/* History bars + beat rate */}
      <div style={{ display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:16 }}>
        <div>
          <div style={{ fontSize:9,color:'#6a90a8',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:8 }}>
            LAST 4 QUARTERS
          </div>
          <HistoryBars history={company.history} />
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:9,color:'#6a90a8',fontFamily:'monospace',letterSpacing:'0.1em',marginBottom:4 }}>BEAT RATE</div>
          <div style={{ fontSize:20,fontWeight:800,color:scoreColor,fontFamily:'monospace' }}>
            {company.beat_rate}%
          </div>
        </div>
      </div>

      {/* Earnings date */}
      <div style={{ marginBottom:14,fontSize:12,color:'#6a90a8',fontFamily:'monospace' }}>
        REPORTS: {new Date(company.earnings_date).toLocaleDateString('en-US', { weekday:'short', month:'long', day:'numeric', year:'numeric' })}
      </div>

      {/* Decode button */}
      <button
        onClick={handleDecode}
        style={{
          width:'100%',padding:'9px 0',
          background: analysis ? `${scoreColor}10` : 'transparent',
          border:`1px solid ${analysis ? `${scoreColor}40` : 'rgba(255,255,255,.1)'}`,
          borderRadius:8,cursor:'pointer',
          fontSize:12,fontWeight:700,letterSpacing:'0.1em',
          color: analysis ? scoreColor : '#a0b4bf',
          fontFamily:'monospace',transition:'all .2s',
        }}
        onMouseEnter={e => {
          ;(e.currentTarget as HTMLButtonElement).style.borderColor=`${scoreColor}60`
          ;(e.currentTarget as HTMLButtonElement).style.color=scoreColor
        }}
        onMouseLeave={e => {
          if (!analysis) {
            ;(e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.1)'
            ;(e.currentTarget as HTMLButtonElement).style.color='#a0b4bf'
          }
        }}
      >
        {analyzing ? '◌ DECODING...' : analysis ? (expanded ? '▲ HIDE ANALYSIS' : '▼ SHOW ANALYSIS') : 'DECODE →'}
      </button>

      {/* AI expansion */}
      {expanded && (
        <div style={{
          marginTop:12,padding:'14px',
          background:`${scoreColor}08`,
          border:`1px solid ${scoreColor}25`,
          borderRadius:8,
          animation:'fadeUp .3s ease both',
        }}>
          {analyzing ? (
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <div style={{ width:8,height:8,borderRadius:'50%',background:scoreColor,animation:'pulse 1s infinite' }}/>
              <span style={{ fontSize:12,color:'#6a90a8',fontFamily:'monospace',letterSpacing:'0.05em' }}>DECODING EARNINGS PATTERN...</span>
            </div>
          ) : (
            <>
              <div style={{ fontSize:10,color:scoreColor,fontFamily:'monospace',letterSpacing:'0.12em',marginBottom:8,opacity:.7 }}>
                AI EARNINGS ANALYSIS
              </div>
              <p style={{ fontSize:13,color:'#c8dde8',lineHeight:1.65,margin:0 }}>{analysis}</p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function EarningsPage() {
  const [data,    setData]    = useState<EarningsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    fetch('/api/earnings')
      .then(r => r.json())
      .then(d => { if (d.error) throw new Error(d.error); setData(d) })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; cursor:none; }
        body { background:#030a10; color:#e8f4f8; font-family:'Inter',system-ui,sans-serif; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse  { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes scanPulse { 0%,100%{opacity:.4;height:50px} 50%{opacity:1;height:80px} }
        @media(max-width:768px){
          .card-grid { grid-template-columns: 1fr !important; }
          .hero-headline { font-size:32px !important; }
        }
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{
        position:'sticky',top:0,zIndex:100,
        background:'rgba(3,10,16,.9)',backdropFilter:'blur(12px)',
        borderBottom:'1px solid rgba(255,255,255,.06)',
        padding:'0 24px',height:60,
        display:'flex',alignItems:'center',justifyContent:'space-between',
      }}>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <Link href="/" style={{ display:'flex',alignItems:'center',gap:10,textDecoration:'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize:14,fontWeight:700,color:'#fff',letterSpacing:'-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width:1,height:20,background:'rgba(255,255,255,.12)' }}/>
          <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.18em',color:'#f59e0b',fontFamily:'monospace' }}>
            EARNINGS DECODER
          </span>
        </div>
        <Link href="/" style={{
          fontSize:12,color:'#6a90a8',textDecoration:'none',fontFamily:'monospace',
          letterSpacing:'0.08em',padding:'6px 12px',
          border:'1px solid rgba(255,255,255,.08)',borderRadius:6,transition:'all .2s',
        }}>
          ← BACK
        </Link>
      </nav>

      {/* HERO */}
      <div style={{ padding:'80px 24px 60px',maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
        <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#f59e0b',fontFamily:'monospace',marginBottom:20,opacity:.8 }}>
          TRUTH SCORING · HISTORICAL ANALYSIS · AI EARNINGS DECODER
        </div>
        <h1 className="hero-headline" style={{
          fontSize:52,fontWeight:900,lineHeight:1.08,letterSpacing:'-0.03em',marginBottom:24,
          background:'linear-gradient(135deg,#e8f4f8 0%,#f59e0b 45%,#ff2d78 100%)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
        }}>
          Management has a story.
          <br />The numbers have another one.
        </h1>
        <p style={{ fontSize:17,color:'#7a9aaa',lineHeight:1.7,maxWidth:600,margin:'0 auto' }}>
          AI reads earnings patterns across every major company and scores management honesty in real time.
        </p>
      </div>

      {/* LOADING STATE */}
      {loading && (
        <div style={{ padding:'60px 24px',maxWidth:1100,margin:'0 auto',textAlign:'center' }}>
          <div style={{ width:2,background:'linear-gradient(to bottom,#f59e0b,transparent)',margin:'0 auto 24px',animation:'scanPulse 1.5s ease-in-out infinite' }}/>
          <div style={{ fontSize:13,color:'#f59e0b',fontFamily:'monospace',letterSpacing:'0.12em' }}>
            LOADING EARNINGS DATABASE...
          </div>
          <div style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace',marginTop:8 }}>
            Fetching calendar + historical data
          </div>
        </div>
      )}

      {/* ERROR STATE */}
      {error && (
        <div style={{ padding:'0 24px',maxWidth:1100,margin:'0 auto' }}>
          <div style={{
            padding:'32px',textAlign:'center',
            background:'rgba(255,45,120,.05)',
            border:'1px solid rgba(255,45,120,.2)',borderRadius:12,
          }}>
            <div style={{ fontSize:13,color:'#ff2d78',fontFamily:'monospace',marginBottom:8 }}>EARNINGS DATA ERROR</div>
            <div style={{ fontSize:12,color:'#6a90a8' }}>{error}</div>
          </div>
        </div>
      )}

      {/* EARNINGS CALENDAR GRID */}
      {data && (
        <div style={{ padding:'0 24px 80px',maxWidth:1100,margin:'0 auto' }}>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
            <h2 style={{ fontSize:16,fontWeight:700,letterSpacing:'0.06em',color:'#e8f4f8',fontFamily:'monospace' }}>
              UPCOMING EARNINGS — NEXT 30 DAYS
            </h2>
            <span style={{ fontSize:11,color:'#4a6a7a',fontFamily:'monospace' }}>
              {data.upcoming.length} companies · updated {new Date(data.last_updated).toLocaleTimeString()}
            </span>
          </div>

          {/* Legend */}
          <div style={{ display:'flex',gap:20,marginBottom:28,flexWrap:'wrap' }}>
            {[
              { color:'#00ff88', label:'Truth Score 70–100: Management consistently honest' },
              { color:'#f59e0b', label:'Truth Score 45–69: Mixed guidance history' },
              { color:'#ff2d78', label:'Truth Score 0–44: Repeated guidance misses' },
            ].map(l => (
              <div key={l.color} style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ width:10,height:10,borderRadius:'50%',background:l.color,boxShadow:`0 0 8px ${l.color}` }}/>
                <span style={{ fontSize:11,color:'#6a90a8' }}>{l.label}</span>
              </div>
            ))}
          </div>

          <div className="card-grid" style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill, minmax(320px, 1fr))',
            gap:16,
          }}>
            {data.upcoming.map((company, i) => (
              <CompanyCard key={company.symbol} company={company} index={i} />
            ))}
          </div>
        </div>
      )}
    </>
  )
}
