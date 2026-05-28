'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'

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
      if (dotRef.current) dotRef.current.style.transform = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
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
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#00d4aa', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(0,212,170,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
    </>
  )
}

// ── Network Canvas ─────────────────────────────────────────────────────────────
function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let W = canvas.width  = canvas.offsetWidth
    let H = canvas.height = canvas.offsetHeight
    let raf: number, t = 0

    type Node = { x: number; y: number; vx: number; vy: number; color: string; size: number; pulse: number }
    const nodes: Node[] = Array.from({ length: 28 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      vx: (Math.random() - 0.5) * 0.4, vy: (Math.random() - 0.5) * 0.4,
      color: ['#00d4aa', '#1e90ff', '#a855f7', '#00d4aa'][Math.floor(Math.random() * 4)],
      size: 2 + Math.random() * 3,
      pulse: Math.random() * Math.PI * 2,
    }))

    const resize = () => {
      W = canvas.width  = canvas.offsetWidth
      H = canvas.height = canvas.offsetHeight
    }
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      t += 0.008

      // Move nodes
      nodes.forEach(n => {
        n.x += n.vx; n.y += n.vy; n.pulse += 0.04
        if (n.x < 0 || n.x > W) n.vx *= -1
        if (n.y < 0 || n.y > H) n.vy *= -1
      })

      // Draw edges
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x
          const dy = nodes[i].y - nodes[j].y
          const d  = Math.sqrt(dx * dx + dy * dy)
          if (d < 140) {
            const alpha = (1 - d / 140) * 0.18
            ctx.beginPath()
            ctx.moveTo(nodes[i].x, nodes[i].y)
            ctx.lineTo(nodes[j].x, nodes[j].y)
            ctx.strokeStyle = `rgba(0,212,170,${alpha})`
            ctx.lineWidth = 1
            ctx.stroke()
          }
        }
      }

      // Draw nodes
      nodes.forEach(n => {
        const pulseFactor = 0.7 + Math.sin(n.pulse) * 0.3
        ctx.beginPath()
        ctx.arc(n.x, n.y, n.size * pulseFactor, 0, Math.PI * 2)
        ctx.fillStyle = n.color
        ctx.globalAlpha = 0.7
        ctx.shadowBlur = 8
        ctx.shadowColor = n.color
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.shadowBlur = 0
      })

      // Occasional signal flash
      if (Math.floor(t * 10) % 40 === 0) {
        const src = nodes[Math.floor(Math.random() * nodes.length)]
        ctx.beginPath()
        ctx.arc(src.x, src.y, 16, 0, Math.PI * 2)
        ctx.strokeStyle = '#00d4aa'
        ctx.lineWidth = 1
        ctx.globalAlpha = 0.4
        ctx.stroke()
        ctx.globalAlpha = 1
      }

      raf = requestAnimationFrame(draw)
    }
    draw()

    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  return <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', display:'block' }}/>
}

// ── Agent data ─────────────────────────────────────────────────────────────────
const AGENTS = [
  { name:'Earnings Agent',    icon:'🔍', status:'ACTIVE',   color:'#00d4aa', lastSignal:'2 min ago',  signals:47, monitors:'Earnings call transcripts + SEC filings' },
  { name:'Congress Agent',    icon:'🏛', status:'ACTIVE',   color:'#1e90ff', lastSignal:'8 min ago',  signals:23, monitors:'House & Senate financial disclosures' },
  { name:'Insider Agent',     icon:'💰', status:'ACTIVE',   color:'#a855f7', lastSignal:'14 min ago', signals:31, monitors:'Form 4 filings for insider purchases' },
  { name:'Options Agent',     icon:'⚡', status:'SCANNING', color:'#f59e0b', lastSignal:'1 min ago',  signals:89, monitors:'Unusual options volume across all tickers' },
  { name:'Momentum Agent',    icon:'📈', status:'ACTIVE',   color:'#00d4aa', lastSignal:'6 min ago',  signals:62, monitors:'Pre-market gaps and volume anomalies' },
  { name:'Macro Agent',       icon:'🌍', status:'SCANNING', color:'#1e90ff', lastSignal:'22 min ago', signals:18, monitors:'Fed speeches, economic releases, FX flows' },
  { name:'Sentiment Agent',   icon:'📰', status:'ACTIVE',   color:'#00d4aa', lastSignal:'3 min ago',  signals:104, monitors:'News sentiment across 200+ sources' },
  { name:'Convergence Agent', icon:'🎯', status:'ACTIVE',   color:'#ff2d78', lastSignal:'4 min ago',  signals:19, monitors:'3+ simultaneous signals → immediate alert' },
  { name:'Dark Pool Agent',   icon:'📊', status:'ACTIVE',   color:'#a855f7', lastSignal:'11 min ago', signals:38, monitors:'Large block trades + off-exchange activity' },
]

type Alert = { agent: string; ticker: string; text: string; timeAgo: string; color: string; id: number }

const PRESET_ALERTS: Omit<Alert, 'id'>[] = [
  { agent:'Congress Agent',    ticker:'NVDA', text:'Sen. Pelosi filed a $1M+ NVDA purchase 3 days before AI committee hearing.',         timeAgo:'4m ago',   color:'#1e90ff' },
  { agent:'Options Agent',     ticker:'TSLA', text:'Unusual call sweep — 5,000 contracts at $280 strike, exp. 2 weeks, premium $1.2M.', timeAgo:'7m ago',   color:'#f59e0b' },
  { agent:'Insider Agent',     ticker:'META', text:'CFO Wehner purchased $450K in META shares — first insider buy in 14 months.',       timeAgo:'12m ago',  color:'#a855f7' },
  { agent:'Convergence Agent', ticker:'NVDA', text:'3 simultaneous signals: congress buy + options sweep + momentum breakout → ALERT.',   timeAgo:'4m ago',   color:'#ff2d78' },
  { agent:'Earnings Agent',    ticker:'GOOGL', text:'Lie Detector score 74 — narrative diverging from actual cloud slowdown data.',    timeAgo:'18m ago',  color:'#00d4aa' },
  { agent:'Dark Pool Agent',   ticker:'SPY',  text:'$840M block print at $562.40 — largest off-exchange trade in 30 days.',             timeAgo:'21m ago',  color:'#a855f7' },
  { agent:'Momentum Agent',    ticker:'COIN', text:'Pre-market gap up 4.2% on 3.8x avg volume — crypto sentiment confirming.',          timeAgo:'34m ago',  color:'#00d4aa' },
  { agent:'Macro Agent',       ticker:'TLT',  text:'Fed Waller speech detected rate-dovish language shift — bonds positioning.',        timeAgo:'41m ago',  color:'#1e90ff' },
  { agent:'Sentiment Agent',   ticker:'AAPL', text:'Sentiment score hit -62 across 47 articles — bearish divergence from price action.','timeAgo':'52m ago',  color:'#00d4aa' },
  { agent:'Options Agent',     ticker:'AMD',  text:'Put/call ratio spiked to 3.1 — institutional hedging on $180 strike puts.',         timeAgo:'58m ago',  color:'#f59e0b' },
]

let alertIdCounter = 100

export default function AgentsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(
    PRESET_ALERTS.slice(0, 8).map((a, i) => ({ ...a, id: i }))
  )

  const addAlert = useCallback(() => {
    const base = PRESET_ALERTS[Math.floor(Math.random() * PRESET_ALERTS.length)]
    setAlerts(prev => [{
      ...base,
      timeAgo: 'just now',
      id: alertIdCounter++,
    }, ...prev.slice(0, 9)])
  }, [])

  useEffect(() => {
    const interval = setInterval(addAlert, 4500)
    return () => clearInterval(interval)
  }, [addAlert])

  return (
    <div style={{ background:'#030a10', minHeight:'100vh', color:'#e8f4f8', fontFamily:'"Inter",system-ui,-apple-system,sans-serif' }}>
      <style>{`
        @keyframes fadeUp     { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulseDot   { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }
        @keyframes slideIn    { from { opacity:0; transform:translateX(-12px) } to { opacity:1; transform:translateX(0) } }
        @keyframes scanLine   { 0%{transform:translateY(-100%)} 100%{transform:translateY(200%)} }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#00d4aa40 }
        @media(max-width:900px) {
          .agents-grid { grid-template-columns:repeat(2,1fr) !important }
          .hero-title  { font-size:32px !important }
          .hero-stat   { flex-direction:column !important; gap:12px !important }
          .how-steps   { flex-direction:column !important }
        }
        @media(max-width:500px) {
          .agents-grid { grid-template-columns:1fr !important }
        }
      `}</style>

      <CustomCursor />

      {/* NAV */}
      <nav style={{
        position:'sticky', top:0, zIndex:100,
        background:'rgba(3,10,16,.95)', backdropFilter:'blur(12px)',
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
          <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.18em', color:'#00d4aa', fontFamily:'monospace' }}>AGENT NETWORK</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', animation:'pulseDot 1.5s infinite' }}/>
            <span style={{ fontSize:11, color:'#6a90a8', fontFamily:'monospace', letterSpacing:'0.08em' }}>ALL SYSTEMS LIVE</span>
          </div>
          <Link href="/intel" style={{
            fontSize:12, color:'#6a90a8', textDecoration:'none', fontFamily:'monospace',
            letterSpacing:'0.08em', padding:'6px 12px',
            border:'1px solid rgba(255,255,255,.08)', borderRadius:6,
          }}>
            Live Dashboard →
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <div style={{
        position:'relative', overflow:'hidden',
        padding:'100px 24px 80px',
        textAlign:'center',
      }}>
        {/* Canvas background */}
        <div style={{ position:'absolute', inset:0, opacity:0.35 }}>
          <NetworkCanvas />
        </div>
        {/* Gradient overlay */}
        <div style={{
          position:'absolute', inset:0,
          background:'radial-gradient(ellipse at center,transparent 30%,#030a10 80%)',
          pointerEvents:'none',
        }}/>

        <div style={{ position:'relative', zIndex:2, maxWidth:800, margin:'0 auto', animation:'fadeUp .6s ease both' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#ff2d78', fontFamily:'monospace', marginBottom:24 }}>
            AUTONOMOUS INTELLIGENCE NETWORK
          </div>
          <h1 className="hero-title" style={{
            fontSize:52, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em',
            color:'#e8f4f8', marginBottom:24,
          }}>
            Nine autonomous agents.<br />
            <span style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
              Running 24/7.
            </span>
            <br />
            Finding what the market doesn&apos;t know yet.
          </h1>

          <div className="hero-stat" style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:32, marginTop:32, flexWrap:'wrap' }}>
            {[
              { label:'Last alert',      value:'4 minutes ago', color:'#00d4aa' },
              { label:'Signals today',   value:'847',           color:'#1e90ff' },
              { label:'Uptime',          value:'99.4%',         color:'#a855f7' },
            ].map(s => (
              <div key={s.label} style={{ textAlign:'center' }}>
                <div style={{ fontSize:22, fontWeight:800, color: s.color, fontFamily:'monospace' }}>{s.value}</div>
                <div style={{ fontSize:11, color:'#6a90a8', letterSpacing:'0.1em', marginTop:4, fontFamily:'monospace' }}>{s.label.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AGENT GRID */}
      <div style={{ padding:'0 24px 80px', maxWidth:1100, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#1e90ff', fontFamily:'monospace', marginBottom:14 }}>STATUS GRID</div>
          <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Agent Network</h2>
        </div>
        <div className="agents-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
          {AGENTS.map((agent, i) => (
            <div key={i} style={{
              padding:'24px',
              background:'rgba(255,255,255,.025)',
              border:`1px solid rgba(255,255,255,.08)`,
              borderRadius:16, position:'relative', overflow:'hidden',
              animation:`fadeUp .5s ease ${0.06 * i}s both`,
              transition:'border-color .2s, transform .2s',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = `${agent.color}50`; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.transform = 'none' }}
            >
              {/* Scan line animation */}
              <div style={{
                position:'absolute', left:0, right:0, height:1,
                background:`linear-gradient(90deg,transparent,${agent.color}60,transparent)`,
                animation:'scanLine 4s linear infinite',
                animationDelay:`${i * 0.5}s`,
                pointerEvents:'none',
              }}/>

              <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:16 }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <span style={{ fontSize:22 }}>{agent.icon}</span>
                  <div style={{ fontSize:14, fontWeight:700, color:'#e8f4f8' }}>{agent.name}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                  <div style={{
                    width:6, height:6, borderRadius:'50%',
                    background: agent.status === 'ACTIVE' ? '#00d4aa' : '#f59e0b',
                    animation:'pulseDot 1.5s infinite',
                    animationDelay:`${i * 0.2}s`,
                  }}/>
                  <span style={{
                    fontSize:9, fontWeight:800, letterSpacing:'0.14em',
                    color: agent.status === 'ACTIVE' ? '#00d4aa' : '#f59e0b',
                    fontFamily:'monospace',
                  }}>
                    {agent.status}
                  </span>
                </div>
              </div>

              <p style={{ fontSize:12, color:'#6a90a8', lineHeight:1.5, marginBottom:20 }}>{agent.monitors}</p>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:11, color:'#4a6a7a', fontFamily:'monospace', letterSpacing:'0.08em', marginBottom:3 }}>LAST SIGNAL</div>
                  <div style={{ fontSize:12, color:'#a0b4bf', fontFamily:'monospace' }}>{agent.lastSignal}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:11, color:'#4a6a7a', fontFamily:'monospace', letterSpacing:'0.08em', marginBottom:3 }}>TODAY</div>
                  <div style={{ fontSize:20, fontWeight:800, color: agent.color, fontFamily:'monospace' }}>{agent.signals}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* LIVE ALERT FEED */}
      <div style={{ padding:'0 24px 80px', maxWidth:860, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:48 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, marginBottom:14 }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#ff2d78', animation:'pulseDot 1s infinite' }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#ff2d78', fontFamily:'monospace' }}>LIVE FEED</span>
          </div>
          <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>Recent Alerts</h2>
          <p style={{ fontSize:14, color:'#6a90a8', marginTop:12 }}>Auto-updating every few seconds</p>
        </div>

        <div style={{
          background:'rgba(0,0,0,.3)', border:'1px solid rgba(255,255,255,.08)',
          borderRadius:16, overflow:'hidden',
        }}>
          {/* Feed header */}
          <div style={{
            padding:'14px 20px',
            background:'rgba(255,255,255,.04)',
            borderBottom:'1px solid rgba(255,255,255,.07)',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{ width:7, height:7, borderRadius:'50%', background:'#00d4aa', animation:'pulseDot 1.2s infinite' }}/>
            <span style={{ fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#6a90a8', fontFamily:'monospace' }}>AGENT ALERT STREAM</span>
            <span style={{ marginLeft:'auto', fontSize:11, color:'#4a6a7a', fontFamily:'monospace' }}>847 signals today</span>
          </div>

          <div style={{ maxHeight:520, overflow:'hidden', position:'relative' }}>
            {alerts.map((alert, i) => (
              <div key={alert.id} style={{
                padding:'16px 20px',
                borderBottom:'1px solid rgba(255,255,255,.05)',
                display:'flex', alignItems:'flex-start', gap:14,
                animation: i === 0 ? 'slideIn .35s ease both' : 'none',
                background: i === 0 ? 'rgba(255,255,255,.015)' : 'transparent',
              }}>
                <div style={{
                  flexShrink:0, width:28, height:28, borderRadius:6,
                  background:`${alert.color}15`,
                  border:`1px solid ${alert.color}35`,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  marginTop:1,
                }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: alert.color }}/>
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                    <span style={{
                      fontSize:10, fontWeight:800, letterSpacing:'0.1em',
                      color: alert.color, fontFamily:'monospace',
                    }}>
                      {alert.agent.toUpperCase()}
                    </span>
                    <span style={{
                      fontSize:12, fontWeight:800, color:'#e8f4f8',
                      background:'rgba(255,255,255,.06)', borderRadius:5,
                      padding:'1px 7px', fontFamily:'monospace',
                    }}>
                      ${alert.ticker}
                    </span>
                    <span style={{ marginLeft:'auto', fontSize:11, color:'#4a6a7a', fontFamily:'monospace' }}>{alert.timeAgo}</span>
                  </div>
                  <p style={{ fontSize:13, color:'#a0b4bf', lineHeight:1.5 }}>{alert.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <div style={{ padding:'0 24px 80px', maxWidth:1000, margin:'0 auto' }}>
        <div style={{ textAlign:'center', marginBottom:56 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#a855f7', fontFamily:'monospace', marginBottom:14 }}>ARCHITECTURE</div>
          <h2 style={{ fontSize:32, fontWeight:900, letterSpacing:'-0.03em', color:'#e8f4f8' }}>How It Works</h2>
        </div>
        <div className="how-steps" style={{ display:'flex', gap:24, alignItems:'stretch' }}>
          {[
            {
              step:'01', color:'#00d4aa',
              title:'24/7 Monitoring',
              desc:'Agents continuously poll public data sources: SEC EDGAR, CBOE options tape, House/Senate disclosure portals, 200+ news feeds, and macroeconomic releases.',
            },
            {
              step:'02', color:'#1e90ff',
              title:'AI Signal Scoring',
              desc:'Each data point is processed by our AI pipeline. Signals are scored for conviction 1–3. Low-conviction signals are filtered. Only statistically significant events surface.',
            },
            {
              step:'03', color:'#ff2d78',
              title:'Convergence Trigger',
              desc:'When the Convergence Agent detects 3 or more simultaneous signals on the same ticker, an immediate alert fires to all subscribers — before the move happens.',
            },
          ].map((s, i) => (
            <div key={i} style={{
              flex:1, padding:'32px 28px',
              background:'rgba(255,255,255,.025)',
              border:`1px solid ${s.color}25`,
              borderRadius:16, position:'relative', overflow:'hidden',
              animation:`fadeUp .5s ease ${0.1 * i}s both`,
            }}>
              <div style={{
                fontSize:64, fontWeight:900, fontFamily:'monospace',
                color:`${s.color}10`, position:'absolute',
                right:16, top:8, lineHeight:1, pointerEvents:'none',
              }}>
                {s.step}
              </div>
              <div style={{
                width:40, height:40, borderRadius:10,
                background:`${s.color}15`, border:`1px solid ${s.color}35`,
                display:'flex', alignItems:'center', justifyContent:'center',
                marginBottom:20,
              }}>
                <span style={{ fontSize:12, fontWeight:800, color: s.color, fontFamily:'monospace' }}>{s.step}</span>
              </div>
              <h3 style={{ fontSize:17, fontWeight:800, color:'#e8f4f8', marginBottom:12 }}>{s.title}</h3>
              <p style={{ fontSize:14, color:'#7a9aaa', lineHeight:1.7 }}>{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* GET ALERTS CTA */}
      <div style={{ padding:'0 24px 120px', maxWidth:700, margin:'0 auto', textAlign:'center' }}>
        <div style={{
          background:'linear-gradient(135deg,rgba(255,45,120,.07),rgba(168,85,247,.06))',
          border:'1px solid rgba(255,45,120,.2)', borderRadius:20, padding:'60px 40px',
        }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'0.2em', color:'#ff2d78', fontFamily:'monospace', marginBottom:20 }}>GET ALERTS</div>
          <h2 style={{ fontSize:28, fontWeight:900, letterSpacing:'-0.02em', color:'#e8f4f8', marginBottom:16 }}>
            Be the first to know when signals converge.
          </h2>
          <p style={{ fontSize:15, color:'#7a9aaa', lineHeight:1.7, marginBottom:40 }}>
            When three or more agents flag the same ticker simultaneously, you get the alert before the crowd reacts.
          </p>
          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/app" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'linear-gradient(135deg,#ff2d78,#a855f7)',
              color:'#fff', fontWeight:800, fontSize:14, letterSpacing:'0.04em',
              padding:'13px 28px', borderRadius:10, textDecoration:'none',
              boxShadow:'0 0 30px rgba(255,45,120,.2)',
            }}>
              Get Signal Alerts →
            </Link>
            <Link href="/intel" style={{
              display:'inline-flex', alignItems:'center', gap:8,
              background:'rgba(255,255,255,.06)',
              color:'#e8f4f8', fontWeight:700, fontSize:14, letterSpacing:'0.04em',
              padding:'13px 28px', borderRadius:10, textDecoration:'none',
              border:'1px solid rgba(255,255,255,.12)',
            }}>
              Open Live Dashboard →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
