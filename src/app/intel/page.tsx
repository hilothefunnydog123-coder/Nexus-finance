'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

// ── Types ──────────────────────────────────────────────────────────────────────
interface InsiderAlert {
  ticker:          string
  signal_type:     'INSIDER_BUY'
  name:            string
  shares:          number
  value:           number
  date:            string
  current_price:   number
  change_pct:      number
  signal_strength: 1 | 2 | 3
  ai_context:      string
}

interface OptionsAlert {
  ticker:          string
  signal_type:     'UNUSUAL_OPTIONS'
  contract_type:   'CALL' | 'PUT'
  strike:          number
  expiry:          string
  premium:         number
  contracts:       number
  total_value:     number
  signal_strength: 1 | 2 | 3
  current_price:   number
  change_pct:      number
  note:            string
  ai_context:      string
}

type Alert = InsiderAlert | OptionsAlert
type FilterType = 'ALL' | 'INSIDER_BUY' | 'UNUSUAL_OPTIONS'

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

// ── Signal Strength Bars ───────────────────────────────────────────────────────
function SignalBars({ strength, glow = false }: { strength: 1 | 2 | 3; glow?: boolean }) {
  const color = strength === 3 ? '#00d4aa' : strength === 2 ? '#1e90ff' : '#6a90a8'
  return (
    <div style={{ display:'flex', alignItems:'flex-end', gap:3, height:18 }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{
          width:5,
          height: i === 1 ? 8 : i === 2 ? 13 : 18,
          borderRadius:2,
          background: i <= strength ? color : 'rgba(255,255,255,.1)',
          boxShadow:  glow && i <= strength ? `0 0 8px ${color}` : 'none',
          transition: 'all .3s',
        }}/>
      ))}
    </div>
  )
}

// ── Alert Card ─────────────────────────────────────────────────────────────────
function AlertCard({ alert, index }: { alert: Alert; index: number }) {
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis,  setAnalysis]  = useState('')
  const [expanded,  setExpanded]  = useState(false)

  const isInsider  = alert.signal_type === 'INSIDER_BUY'
  const is3Bar     = alert.signal_strength === 3
  const ia         = alert as InsiderAlert
  const oa         = alert as OptionsAlert

  const priceUp    = alert.change_pct >= 0
  const priceColor = priceUp ? '#00d4aa' : '#ff2d78'
  const typeColor  = isInsider ? '#1e90ff' : '#a855f7'

  const handleAIRead = useCallback(async () => {
    if (analysis) { setExpanded(e => !e); return }
    setAnalyzing(true)
    setExpanded(true)
    try {
      const r = await fetch('/api/intel', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(alert),
      })
      const d = await r.json()
      setAnalysis(d.analysis || d.error || 'Analysis unavailable.')
    } catch {
      setAnalysis('Connection error.')
    } finally {
      setAnalyzing(false)
    }
  }, [alert, analysis])

  return (
    <div style={{
      position:'relative',
      background: is3Bar
        ? 'linear-gradient(135deg,rgba(0,212,170,.06),rgba(30,144,255,.04))'
        : 'rgba(255,255,255,.025)',
      border: is3Bar
        ? '1px solid rgba(0,212,170,.25)'
        : '1px solid rgba(255,255,255,.06)',
      borderRadius:14,
      padding:'20px 22px',
      marginBottom:12,
      animation:`fadeUp .4s ease ${index * 0.04}s both`,
      boxShadow: is3Bar ? '0 0 30px rgba(0,212,170,.08)' : 'none',
      transition:'all .2s',
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = is3Bar ? 'rgba(0,212,170,.4)' : 'rgba(255,255,255,.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = is3Bar ? 'rgba(0,212,170,.25)' : 'rgba(255,255,255,.06)')}
    >
      {/* Converging badge */}
      {is3Bar && (
        <div style={{
          position:'absolute', top:-10, left:20,
          background:'linear-gradient(90deg,#00d4aa,#1e90ff)',
          borderRadius:6, padding:'3px 10px',
          fontSize:10, fontWeight:700, letterSpacing:'0.12em', color:'#000',
          animation:'glowPulse 2s ease-in-out infinite',
        }}>
          ⚡ CONVERGING SIGNALS
        </div>
      )}

      <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
        {/* Signal strength */}
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8, paddingTop:2 }}>
          <SignalBars strength={alert.signal_strength} glow={is3Bar} />
          <span style={{ fontSize:9, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.06em' }}>
            {alert.signal_strength}/3
          </span>
        </div>

        <div style={{ flex:1, minWidth:0 }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap', marginBottom:10 }}>
            <span style={{
              fontSize:10, fontWeight:700, letterSpacing:'0.12em',
              color: typeColor, background:`${typeColor}18`,
              border:`1px solid ${typeColor}30`,
              borderRadius:4, padding:'2px 8px',
            }}>
              {isInsider ? 'INSIDER BUY' : 'UNUSUAL OPTIONS'}
            </span>
            <span style={{ fontSize:20, fontWeight:800, color:'#e8f4f8', fontFamily:'monospace', letterSpacing:'0.02em' }}>
              {alert.ticker}
            </span>
            {alert.current_price > 0 && (
              <span style={{ fontSize:14, fontWeight:600, color:'#c8dde8', fontFamily:'monospace' }}>
                ${alert.current_price.toFixed(2)}
              </span>
            )}
            <span style={{ fontSize:12, fontWeight:600, color:priceColor, fontFamily:'monospace' }}>
              {priceUp ? '+' : ''}{alert.change_pct.toFixed(2)}%
            </span>
            {!isInsider && oa.note && (
              <span style={{ fontSize:10, color:'#4a6a7a', fontStyle:'italic' }}>{oa.note}</span>
            )}
          </div>

          {/* Insider-specific content */}
          {isInsider && (
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>INSIDER</div>
                <div style={{ fontSize:13, color:'#c8dde8', marginTop:3 }}>{ia.name}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>SHARES</div>
                <div style={{ fontSize:13, color:'#c8dde8', fontFamily:'monospace', marginTop:3 }}>{ia.shares.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>VALUE</div>
                <div style={{ fontSize:13, color:'#00d4aa', fontFamily:'monospace', fontWeight:700, marginTop:3 }}>
                  ${ia.value >= 1_000_000
                    ? `${(ia.value / 1_000_000).toFixed(2)}M`
                    : ia.value >= 1_000
                      ? `${(ia.value / 1_000).toFixed(0)}K`
                      : ia.value.toFixed(0)
                  }
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>DATE</div>
                <div style={{ fontSize:13, color:'#c8dde8', fontFamily:'monospace', marginTop:3 }}>
                  {new Date(ia.date).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                </div>
              </div>
            </div>
          )}

          {/* Options-specific content */}
          {!isInsider && (
            <div style={{ display:'flex', gap:20, flexWrap:'wrap', marginBottom:10 }}>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>CONTRACT</div>
                <div style={{
                  fontSize:13, fontFamily:'monospace', fontWeight:700, marginTop:3,
                  color: oa.contract_type === 'CALL' ? '#00d4aa' : '#ff2d78',
                }}>
                  {oa.contract_type} ${oa.strike}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>EXPIRY</div>
                <div style={{ fontSize:13, color:'#c8dde8', fontFamily:'monospace', marginTop:3 }}>
                  {new Date(oa.expiry).toLocaleDateString('en-US', { month:'short', day:'numeric' })}
                </div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>PREMIUM</div>
                <div style={{ fontSize:13, color:'#c8dde8', fontFamily:'monospace', marginTop:3 }}>${oa.premium}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>CONTRACTS</div>
                <div style={{ fontSize:13, color:'#c8dde8', fontFamily:'monospace', marginTop:3 }}>{oa.contracts.toLocaleString()}</div>
              </div>
              <div>
                <div style={{ fontSize:10, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>TOTAL VALUE</div>
                <div style={{ fontSize:13, color:'#a855f7', fontFamily:'monospace', fontWeight:700, marginTop:3 }}>
                  ${oa.total_value >= 1_000_000 ? `${(oa.total_value/1_000_000).toFixed(2)}M` : `${(oa.total_value/1_000).toFixed(0)}K`}
                </div>
              </div>
            </div>
          )}

          {/* AI Read button */}
          <button
            onClick={handleAIRead}
            style={{
              padding:'6px 14px',
              background: analysis ? 'rgba(168,85,247,.08)' : 'transparent',
              border:`1px solid ${analysis ? 'rgba(168,85,247,.4)' : 'rgba(255,255,255,.1)'}`,
              borderRadius:6, cursor:'pointer',
              fontSize:12, color: analysis ? '#a855f7' : '#a0b4bf',
              fontFamily:'monospace', letterSpacing:'0.06em',
              transition:'all .2s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(168,85,247,.5)'; (e.currentTarget as HTMLButtonElement).style.color='#a855f7' }}
            onMouseLeave={e => { if (!analysis) { (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.1)'; (e.currentTarget as HTMLButtonElement).style.color='#a0b4bf' }}}
          >
            {analyzing ? '◌ PROCESSING...' : analysis ? (expanded ? '▲ HIDE' : '▼ AI READ') : 'GET AI READ →'}
          </button>

          {/* AI expansion */}
          {expanded && (
            <div style={{
              marginTop:12, padding:'12px 14px',
              background:'rgba(168,85,247,.05)',
              border:'1px solid rgba(168,85,247,.15)',
              borderRadius:8,
              animation:'fadeUp .3s ease both',
            }}>
              {analyzing ? (
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:8,height:8,borderRadius:'50%',background:'#a855f7',animation:'pulse 1s infinite' }}/>
                  <span style={{ fontSize:12,color:'#6a90a8',fontFamily:'monospace',letterSpacing:'0.05em' }}>RUNNING AI ANALYSIS...</span>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:10,color:'#a855f7',fontFamily:'monospace',letterSpacing:'0.12em',marginBottom:6,opacity:0.7 }}>AI SIGNAL INTERPRETATION</div>
                  <p style={{ fontSize:13,color:'#c8dde8',lineHeight:1.6,margin:0 }}>{analysis}</p>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function IntelPage() {
  const [alerts,  setAlerts]  = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [filter,  setFilter]  = useState<FilterType>('ALL')
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [livePulse,   setLivePulse]   = useState(true)

  const load = useCallback(() => {
    setLoading(true)
    fetch('/api/intel')
      .then(r => r.json())
      .then(d => {
        if (d.error) throw new Error(d.error)
        setAlerts(d.alerts ?? [])
        setLastRefresh(new Date())
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60_000)
    const pulse    = setInterval(() => setLivePulse(p => !p), 1500)
    return () => { clearInterval(interval); clearInterval(pulse) }
  }, [load])

  const filtered = alerts.filter(a => filter === 'ALL' || a.signal_type === filter)

  return (
    <>
      <style>{`
        * { box-sizing:border-box; margin:0; padding:0; cursor:none; }
        body { background:#020810; color:#e8f4f8; font-family:'Inter',system-ui,sans-serif; }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(1.4)} }
        @keyframes glowPulse{ 0%,100%{box-shadow:0 0 20px rgba(0,212,170,.2)} 50%{box-shadow:0 0 50px rgba(0,212,170,.6)} }
        @keyframes liveDot  { 0%,100%{opacity:1} 50%{opacity:.2} }
        @media(max-width:768px){
          .intel-layout{flex-direction:column !important}
          .hero-headline{font-size:36px !important}
        }
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{
        position:'sticky',top:0,zIndex:100,
        background:'rgba(2,8,16,.9)',backdropFilter:'blur(12px)',
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
          <span style={{ fontSize:11,fontWeight:700,letterSpacing:'0.18em',color:'#a855f7',fontFamily:'monospace' }}>
            SMART MONEY ALERTS
          </span>
        </div>
        <div style={{ display:'flex',alignItems:'center',gap:16 }}>
          <div style={{ display:'flex',alignItems:'center',gap:6 }}>
            <div style={{
              width:8,height:8,borderRadius:'50%',
              background: livePulse ? '#00d4aa' : 'rgba(0,212,170,.3)',
              boxShadow:  livePulse ? '0 0 12px #00d4aa' : 'none',
              transition:'all .3s',
            }}/>
            <span style={{ fontSize:11,color:'#00d4aa',fontFamily:'monospace',letterSpacing:'0.1em' }}>LIVE</span>
          </div>
          <Link href="/" style={{
            fontSize:12,color:'#6a90a8',textDecoration:'none',fontFamily:'monospace',
            letterSpacing:'0.08em',padding:'6px 12px',
            border:'1px solid rgba(255,255,255,.08)',borderRadius:6,transition:'all .2s',
          }}>
            ← BACK
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding:'80px 24px 50px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        <div style={{ fontSize:11,fontWeight:700,letterSpacing:'0.2em',color:'#a855f7',fontFamily:'monospace',marginBottom:20,opacity:.8 }}>
          INSIDER TRANSACTIONS · OPTIONS FLOW · REAL-TIME SIGNALS
        </div>
        <h1 className="hero-headline" style={{
          fontSize:56,fontWeight:900,lineHeight:1.05,letterSpacing:'-0.03em',marginBottom:24,
          background:'linear-gradient(135deg,#e8f4f8 0%,#a855f7 50%,#1e90ff 100%)',
          WebkitBackgroundClip:'text',WebkitTextFillColor:'transparent',backgroundClip:'text',
        }}>
          Follow the Money.
        </h1>
        <p style={{ fontSize:17,color:'#7a9aaa',lineHeight:1.7,maxWidth:580,margin:'0 auto' }}>
          Real insider transactions. Unusual options flow. When institutional money moves, you&apos;ll know first.
        </p>
        <div style={{ marginTop:16,fontSize:11,color:'#4a6a7a',fontFamily:'monospace' }}>
          Auto-refreshes every 60s · Last updated: {lastRefresh.toLocaleTimeString()}
        </div>
      </div>

      {/* FILTER BAR */}
      <div style={{ padding:'0 24px 32px',maxWidth:1100,margin:'0 auto' }}>
        <div style={{ display:'flex',gap:8 }}>
          {(['ALL','INSIDER_BUY','UNUSUAL_OPTIONS'] as FilterType[]).map(f => (
            <button key={f}
              onClick={() => setFilter(f)}
              style={{
                padding:'8px 18px',
                background: filter===f ? 'rgba(168,85,247,.15)' : 'transparent',
                border:`1px solid ${filter===f ? 'rgba(168,85,247,.4)' : 'rgba(255,255,255,.08)'}`,
                borderRadius:8,cursor:'pointer',
                fontSize:11,fontWeight:700,letterSpacing:'0.1em',
                color: filter===f ? '#a855f7' : '#6a90a8',
                fontFamily:'monospace',transition:'all .2s',
              }}
            >
              {f === 'ALL' ? 'ALL' : f === 'INSIDER_BUY' ? 'INSIDER BUYS' : 'OPTIONS FLOW'}
            </button>
          ))}
          <span style={{ marginLeft:'auto',fontSize:12,color:'#4a6a7a',fontFamily:'monospace',alignSelf:'center' }}>
            {filtered.length} signals
          </span>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="intel-layout" style={{ display:'flex',gap:24,padding:'0 24px 80px',maxWidth:1100,margin:'0 auto' }}>

        {/* Feed */}
        <div style={{ flex:1,minWidth:0 }}>
          {loading && (
            <div style={{ padding:'60px 0',textAlign:'center' }}>
              <div style={{ width:2,height:60,background:'linear-gradient(to bottom,#a855f7,transparent)',margin:'0 auto 20px',animation:'glowPulse 1.5s ease-in-out infinite' }}/>
              <div style={{ fontSize:13,color:'#a855f7',fontFamily:'monospace',letterSpacing:'0.12em' }}>
                SCANNING SMART MONEY FLOWS...
              </div>
            </div>
          )}

          {error && (
            <div style={{
              padding:'32px',textAlign:'center',
              background:'rgba(255,45,120,.05)',
              border:'1px solid rgba(255,45,120,.2)',borderRadius:12,
            }}>
              <div style={{ fontSize:13,color:'#ff2d78',fontFamily:'monospace',marginBottom:8 }}>FEED ERROR</div>
              <div style={{ fontSize:12,color:'#6a90a8' }}>{error}</div>
            </div>
          )}

          {!loading && filtered.map((a, i) => (
            <AlertCard key={`${a.ticker}-${a.signal_type}-${i}`} alert={a} index={i} />
          ))}
        </div>

        {/* Sidebar */}
        <div style={{ flex:'0 0 280px',minWidth:0 }}>

          {/* Explainer */}
          <div style={{
            background:'rgba(168,85,247,.05)',
            border:'1px solid rgba(168,85,247,.15)',
            borderRadius:12,padding:'20px',marginBottom:16,
          }}>
            <h3 style={{ fontSize:12,fontWeight:700,letterSpacing:'0.14em',color:'#a855f7',fontFamily:'monospace',marginBottom:14 }}>
              WHAT IS SMART MONEY?
            </h3>
            <p style={{ fontSize:12,color:'#7a9aaa',lineHeight:1.65,marginBottom:12 }}>
              &ldquo;Smart money&rdquo; refers to institutional investors, hedge funds, and corporate insiders who have informational advantages over retail traders.
            </p>
            <p style={{ fontSize:12,color:'#7a9aaa',lineHeight:1.65 }}>
              When insiders buy their own company&apos;s stock, they believe the price will rise. Unusual options activity can signal that large players expect a significant move.
            </p>
          </div>

          {/* How to use */}
          <div style={{
            background:'rgba(30,144,255,.05)',
            border:'1px solid rgba(30,144,255,.15)',
            borderRadius:12,padding:'20px',marginBottom:16,
          }}>
            <h3 style={{ fontSize:12,fontWeight:700,letterSpacing:'0.14em',color:'#1e90ff',fontFamily:'monospace',marginBottom:14 }}>
              HOW TO USE SIGNALS
            </h3>
            {[
              'Higher signal strength = larger, more significant transaction',
              'Converging signals (3 bars) mean multiple indicators aligning',
              'Use AI Read for context on what each signal means',
              'Never trade on signals alone — do your own research',
            ].map((tip, i) => (
              <div key={i} style={{ display:'flex',gap:8,marginBottom:10 }}>
                <span style={{ color:'#1e90ff',fontSize:12,flexShrink:0 }}>›</span>
                <span style={{ fontSize:12,color:'#7a9aaa',lineHeight:1.5 }}>{tip}</span>
              </div>
            ))}
          </div>

          {/* Signal strength legend */}
          <div style={{
            background:'rgba(255,255,255,.02)',
            border:'1px solid rgba(255,255,255,.06)',
            borderRadius:12,padding:'20px',
          }}>
            <h3 style={{ fontSize:12,fontWeight:700,letterSpacing:'0.14em',color:'#6a90a8',fontFamily:'monospace',marginBottom:14 }}>
              SIGNAL STRENGTH
            </h3>
            {([
              { strength:1 as const, label:'Small Position',  range:'< $50K',        color:'#6a90a8' },
              { strength:2 as const, label:'Significant Buy', range:'$50K–$500K',    color:'#1e90ff' },
              { strength:3 as const, label:'CONVERGING',      range:'> $500K',        color:'#00d4aa' },
            ]).map(s => (
              <div key={s.strength} style={{ display:'flex',alignItems:'center',gap:12,marginBottom:12 }}>
                <SignalBars strength={s.strength} glow={s.strength === 3} />
                <div>
                  <div style={{ fontSize:11,fontWeight:700,color:s.color,fontFamily:'monospace' }}>{s.label}</div>
                  <div style={{ fontSize:10,color:'#4a6a7a',fontFamily:'monospace' }}>{s.range}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
