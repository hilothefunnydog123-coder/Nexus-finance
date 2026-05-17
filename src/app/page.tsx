'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'

const FOUNDERS = [
  { name: 'Neil Gilani',    role: 'CEO & Co-Founder',  clr: '#00d4aa', grad: 'linear-gradient(135deg,#00d4aa,#3b8eea)', init: 'NG', quote: '"The edge isn\'t the chart. It\'s knowing what to look for before the open."', bio: 'Built the entire YN Finance platform — market data pipeline, AI systems, and the Daily Intelligence product.' },
  { name: 'Yannai Richter', role: 'CTO & Co-Founder',  clr: '#1e90ff', grad: 'linear-gradient(135deg,#1e90ff,#a855f7)', init: 'YR', quote: '"Every serious investor spends 2 hours on research before 9:30. We do that in one page."', bio: 'Co-built the YN stack and owns growth — ad strategy, creator outreach, and platform distribution.' },
  { name: 'Arjun Bhattula', role: 'COO & Co-Founder',  clr: '#a855f7', grad: 'linear-gradient(135deg,#a855f7,#ec4899)', init: 'AB', quote: '"Wall Street has always had this data. Now Main Street does too."', bio: 'Runs every partnership and instructor relationship. Personally brought nine world-class educators onto the platform.' },
]

const POWERS = [
  { icon: '🧠', name: 'Gemini 2.0', label: 'AI Engine',      desc: 'Multi-agent reasoning across fundamentals, technicals, sentiment, and risk simultaneously.', clr: '#00d4aa', glow: '#00d4aa' },
  { icon: '📡', name: 'Finnhub',    label: 'Market Data',    desc: 'Real-time quotes, fundamentals, analyst ratings, earnings, and company news — live.', clr: '#3b8eea', glow: '#3b8eea' },
  { icon: '⚡', name: 'Supabase',   label: 'Real-time DB',   desc: 'Live leaderboards, chat, tournament state, and portfolio data — synced in milliseconds.', clr: '#22c55e', glow: '#22c55e' },
  { icon: '📊', name: 'TradingView',label: 'Pro Charts',     desc: 'Institutional-grade charting with 100+ indicators and real-time price feeds.', clr: '#f59e0b', glow: '#f59e0b' },
  { icon: '💳', name: 'Stripe',     label: 'Payments',       desc: 'Secure tournament entry, course purchases, and prop challenge payments — globally.', clr: '#a855f7', glow: '#a855f7' },
  { icon: '🔐', name: 'Netlify',    label: 'Edge Deploy',    desc: 'Sub-100ms response times globally with edge functions and instant CI/CD deploys.', clr: '#ec4899', glow: '#ec4899' },
]

const PRODUCTS = [
  { icon: '🤖', title: 'AI Stock Analyzer', tag: 'NEW', desc: '5 specialized AI agents analyze any stock in seconds — entry zones, stop loss, price targets, options strategy, and catalysts.', href: '/ai-stocks', clr: '#00d4aa', grad: 'linear-gradient(135deg,#00d4aa20,#3b8eea10)' },
  { icon: '📰', title: 'Daily Intelligence', tag: 'FREE', desc: 'Bloomberg-style AI morning brief with expected moves, daily bias, macro dashboard, and trade playbook — every market day.', href: '/daily', clr: '#3b8eea', grad: 'linear-gradient(135deg,#3b8eea20,#a855f710)' },
  { icon: '🏆', title: 'YN Arena',           tag: 'LIVE', desc: 'DraftKings-style trading tournaments. Real money prize pools. Compete against thousands of traders daily.', href: '/arena', clr: '#f59e0b', grad: 'linear-gradient(135deg,#f59e0b20,#ef444410)' },
  { icon: '🎓', title: 'Courses',            tag: '$0.99', desc: 'Ross Cameron, ICT, Rayner Teo, and 6 more world-class instructors. AI-narrated with quizzes and live trading replay.', href: '/courses', clr: '#a855f7', grad: 'linear-gradient(135deg,#a855f720,#ec489910)' },
  { icon: '⚡', title: 'Trading Terminal',   tag: 'FREE', desc: '$100K simulated portfolio with real SL/TP, leverage, and live market data across stocks, forex, futures, and crypto.', href: '/app', clr: '#22c55e', grad: 'linear-gradient(135deg,#22c55e20,#3b8eea10)' },
  { icon: '🎯', title: 'Prop Challenges',    tag: '$49+', desc: 'FTMO-style challenges with $25K–$200K accounts. Pass and get referred to real funded firms. 70% fail, you win.', href: '/app', clr: '#ec4899', grad: 'linear-gradient(135deg,#ec489920,#a855f710)' },
]

const REVIEWS = [
  { name: 'Marcus T.',  loc: 'Prop Futures Trader · Atlanta',  clr: '#00d4aa', text: '"I used to spend 90 minutes every morning scanning news. Now I open Daily Intelligence and I\'m set up in 5 minutes."', tag: 'ES & NQ trader' },
  { name: 'Priya S.',   loc: 'Swing Trader · Mumbai',          clr: '#f59e0b', text: '"The AI Stock Analyzer gave me an entry zone, stop loss, and options play. Took 15 seconds. Would have taken me 2 hours."', tag: 'Equities & ETFs' },
  { name: 'Devon P.',   loc: 'Portfolio Manager · London',     clr: '#1e90ff', text: '"It reads like something Goldman would put out, but built for traders. The macro dashboard is exactly what I check every morning."', tag: 'Multi-asset investor' },
]

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function useTilt() {
  const ref = useRef<HTMLDivElement>(null)
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return
    const r = el.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width  - 0.5) * 24
    const y = ((e.clientY - r.top)  / r.height - 0.5) * -24
    el.style.transform = `perspective(800px) rotateY(${x}deg) rotateX(${y}deg) scale(1.03)`
  }, [])
  const onLeave = useCallback(() => { if (ref.current) ref.current.style.transform = 'perspective(800px) rotateY(0deg) rotateX(0deg) scale(1)' }, [])
  return { ref, onMove, onLeave }
}

export default function HomePage() {
  const canvasRef   = useRef<HTMLCanvasElement>(null)
  const logoRef     = useRef<HTMLDivElement>(null)
  const [scrollY, setScrollY] = useState(0)

  // PARTICLE FIELD
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let raf: number
    let W = window.innerWidth, H = window.innerHeight
    canvas.width = W; canvas.height = H

    type P = { x:number; y:number; z:number; vx:number; vy:number; size:number; clr:string; opacity:number }
    const COLORS = ['#00d4aa','#3b8eea','#a855f7','#f59e0b','#ffffff']
    const particles: P[] = Array.from({ length: 180 }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      z: Math.random() * 2 + 0.2,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      size: Math.random() * 2.5 + 0.5,
      clr: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: Math.random() * 0.7 + 0.2,
    }))

    // Constellation lines
    function draw() {
      ctx.clearRect(0, 0, W, H)
      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx*dx + dy*dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(0,212,170,${0.08 * (1 - dist/120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
        const p = particles[i]
        p.x += p.vx * p.z; p.y += p.vy * p.z
        if (p.x < 0) p.x = W; if (p.x > W) p.x = 0
        if (p.y < 0) p.y = H; if (p.y > H) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * p.z, 0, Math.PI * 2)
        ctx.fillStyle = p.clr + Math.floor(p.opacity * 255).toString(16).padStart(2,'0')
        ctx.fill()
      }
      raf = requestAnimationFrame(draw)
    }
    draw()

    const resize = () => { W = window.innerWidth; H = window.innerHeight; canvas.width = W; canvas.height = H }
    window.addEventListener('resize', resize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize) }
  }, [])

  // SCROLL PARALLAX
  useEffect(() => {
    const handler = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Logo 3D mouse track
  useEffect(() => {
    const logo = logoRef.current; if (!logo) return
    const onMove = (e: MouseEvent) => {
      const r = logo.getBoundingClientRect()
      const x = ((e.clientX - r.left - r.width/2)  / r.width)  * 20
      const y = ((e.clientY - r.top  - r.height/2) / r.height) * -20
      logo.style.transform = `rotateY(${x}deg) rotateX(${y}deg)`
    }
    const onLeave = () => { logo.style.transform = 'rotateY(0deg) rotateX(0deg)' }
    logo.addEventListener('mousemove', onMove)
    logo.addEventListener('mouseleave', onLeave)
    return () => { logo.removeEventListener('mousemove', onMove); logo.removeEventListener('mouseleave', onLeave) }
  }, [])

  const powers   = useInView()
  const products = useInView()
  const founders = useInView()
  const reviews  = useInView()

  const logoScale = Math.max(0.85, 1 - scrollY * 0.0004)
  const logoOp    = Math.max(0, 1 - scrollY * 0.002)

  return (
    <div style={{ background: '#030a10', color: '#dce8f0', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes spin-slow  { to { transform: rotate(360deg); } }
        @keyframes spin-rev   { to { transform: rotate(-360deg); } }
        @keyframes float      { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
        @keyframes glow-pulse { 0%,100%{opacity:.6;filter:blur(40px)} 50%{opacity:1;filter:blur(60px)} }
        @keyframes fadeUp     { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideLeft  { from{opacity:0;transform:translateX(-40px)} to{opacity:1;transform:translateX(0)} }
        @keyframes slideRight { from{opacity:0;transform:translateX(40px)}  to{opacity:1;transform:translateX(0)} }
        @keyframes scaleIn    { from{opacity:0;transform:scale(.85)} to{opacity:1;transform:scale(1)} }
        @keyframes ticker3d   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes holo       { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }
        @keyframes orbit1     { to{transform:rotate(360deg) translateX(80px) rotate(-360deg)} }
        @keyframes orbit2     { to{transform:rotate(-360deg) translateX(60px) rotate(360deg)} }
        @keyframes ring-spin  { to{stroke-dashoffset:-500} }
        .nav-link { color: #6a90a8; text-decoration: none; font-size: 13px; transition: color .2s; }
        .nav-link:hover { color: #dce8f0; }
        .section { max-width: 1100px; margin: 0 auto; padding: 0 24px; }
        .card3d { transition: transform .3s ease, box-shadow .3s ease; transform-style: preserve-3d; }
        .card3d:hover { box-shadow: 0 30px 80px rgba(0,0,0,.5); }
        .holo-card { background: linear-gradient(135deg, #060d14, #0a1822); border: 1px solid #0c1e2e; border-radius: 20px; position: relative; overflow: hidden; }
        .holo-card::before { content: ''; position: absolute; inset: -2px; background: linear-gradient(45deg,#00d4aa,#3b8eea,#a855f7,#f59e0b,#00d4aa); background-size: 300% 300%; animation: holo 4s linear infinite; opacity: 0; border-radius: 22px; transition: opacity .3s; z-index: 0; }
        .holo-card:hover::before { opacity: .15; }
        .holo-inner { position: relative; z-index: 1; }
        .power-card { background: #060d14; border: 1px solid #0c1e2e; border-radius: 16px; padding: 28px 24px; transition: all .3s; cursor: default; }
        .power-card:hover { border-color: var(--clr); box-shadow: 0 0 40px var(--glow)22; transform: translateY(-6px) scale(1.02); }
        .product-card { border-radius: 18px; padding: 28px 26px; transition: all .3s; cursor: pointer; position: relative; overflow: hidden; }
        .product-card::after { content:''; position:absolute; inset:0; background: radial-gradient(circle at 50% 0%, var(--clr)15 0%, transparent 70%); opacity:0; transition: opacity .3s; }
        .product-card:hover::after { opacity: 1; }
        .product-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 24px 60px rgba(0,0,0,.4); }
        .vis-section .item { opacity: 0; }
        .vis-section.visible .item { animation: fadeUp .7s ease both; }
        .vis-section.visible .item:nth-child(1){animation-delay:.0s}
        .vis-section.visible .item:nth-child(2){animation-delay:.1s}
        .vis-section.visible .item:nth-child(3){animation-delay:.15s}
        .vis-section.visible .item:nth-child(4){animation-delay:.2s}
        .vis-section.visible .item:nth-child(5){animation-delay:.25s}
        .vis-section.visible .item:nth-child(6){animation-delay:.3s}
        ::selection { background: #00d4aa30; }
        @media(max-width:768px){.hide-sm{display:none!important}.grid-3{grid-template-columns:1fr!important}.grid-2{grid-template-columns:1fr!important}}
      `}</style>

      {/* CANVAS */}
      <canvas ref={canvasRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />

      {/* NAV */}
      <nav style={{ position:'fixed', top:0, left:0, right:0, zIndex:100, padding:'0 32px', height:60, display:'flex', alignItems:'center', gap:32, background:'rgba(3,10,16,0.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid #0c1e2e' }}>
        <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:32, height:32, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius:9, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>⚡</div>
          <span style={{ fontWeight:900, fontSize:16, color:'#dce8f0', letterSpacing:'-0.5px' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display:'flex', gap:28, marginLeft:8 }}>
          {[['AI Analyzer','/ai-stocks'],['Daily Intel','/daily'],['Arena','/arena'],['Courses','/courses'],['Terminal','/app']].map(([l,h])=>(
            <Link key={l} href={h} className="nav-link">{l}</Link>
          ))}
        </div>
        <div style={{ marginLeft:'auto', display:'flex', gap:10 }}>
          <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#a855f7,#3b8eea)', color:'#fff', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:700, textDecoration:'none' }}>AI Analyzer</Link>
          <Link href="/app" style={{ background:'linear-gradient(135deg,#00d4aa,#1e90ff)', color:'#030a10', padding:'8px 18px', borderRadius:8, fontSize:13, fontWeight:800, textDecoration:'none' }}>Launch App →</Link>
        </div>
      </nav>

      {/* ═══ HERO ══════════════════════════════════════════════════════════════ */}
      <section style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', position:'relative', zIndex:1, paddingTop:60, textAlign:'center' }}>

        {/* Glow orbs */}
        <div style={{ position:'absolute', width:600, height:600, borderRadius:'50%', background:'radial-gradient(circle,#00d4aa18 0%,transparent 70%)', top:'10%', left:'50%', transform:'translateX(-50%)', animation:'glow-pulse 4s ease-in-out infinite', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:400, height:400, borderRadius:'50%', background:'radial-gradient(circle,#a855f718 0%,transparent 70%)', top:'20%', left:'20%', animation:'glow-pulse 5s ease-in-out infinite .5s', pointerEvents:'none' }} />
        <div style={{ position:'absolute', width:350, height:350, borderRadius:'50%', background:'radial-gradient(circle,#3b8eea18 0%,transparent 70%)', top:'15%', right:'15%', animation:'glow-pulse 6s ease-in-out infinite 1s', pointerEvents:'none' }} />

        {/* 3D LOGO */}
        <div ref={logoRef} style={{ transformStyle:'preserve-3d', transition:'transform .1s ease', marginBottom:48, cursor:'grab', opacity: logoOp, transform: `scale(${logoScale})` }}>
          <div style={{ position:'relative', width:200, height:200, margin:'0 auto' }}>

            {/* Outer spinning ring */}
            <svg style={{ position:'absolute', inset:0, animation:'spin-slow 8s linear infinite' }} width="200" height="200" viewBox="0 0 200 200">
              <circle cx="100" cy="100" r="90" fill="none" stroke="url(#ring1)" strokeWidth="2" strokeDasharray="20 8" />
              <defs>
                <linearGradient id="ring1" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00d4aa" />
                  <stop offset="50%" stopColor="#3b8eea" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
            </svg>

            {/* Middle ring reverse */}
            <svg style={{ position:'absolute', inset:10, animation:'spin-rev 5s linear infinite' }} width="180" height="180" viewBox="0 0 180 180">
              <circle cx="90" cy="90" r="72" fill="none" stroke="#a855f740" strokeWidth="1.5" strokeDasharray="10 14" />
            </svg>

            {/* Orbiting dots */}
            <div style={{ position:'absolute', inset:0, animation:'spin-slow 4s linear infinite' }}>
              <div style={{ position:'absolute', top:8, left:'50%', marginLeft:-5, width:10, height:10, borderRadius:'50%', background:'#00d4aa', boxShadow:'0 0 12px #00d4aa' }} />
            </div>
            <div style={{ position:'absolute', inset:0, animation:'spin-rev 6s linear infinite' }}>
              <div style={{ position:'absolute', bottom:4, left:'50%', marginLeft:-4, width:8, height:8, borderRadius:'50%', background:'#a855f7', boxShadow:'0 0 12px #a855f7' }} />
            </div>
            <div style={{ position:'absolute', inset:0, animation:'spin-slow 9s linear infinite' }}>
              <div style={{ position:'absolute', top:'50%', right:0, marginTop:-4, width:8, height:8, borderRadius:'50%', background:'#3b8eea', boxShadow:'0 0 12px #3b8eea' }} />
            </div>

            {/* Center glass hex */}
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:120, height:120, background:'linear-gradient(135deg,#060d14ee,#0a1822ee)', border:'1px solid #00d4aa40', borderRadius:28, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', backdropFilter:'blur(10px)', boxShadow:'0 0 60px #00d4aa20, inset 0 1px 0 #ffffff15' }}>
              {/* YN text */}
              <div style={{ fontSize:38, fontWeight:900, letterSpacing:'-3px', lineHeight:1, background:'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', textShadow:'none' }}>YN</div>
              <div style={{ fontSize:8, letterSpacing:'3px', color:'#6a90a8', marginTop:4 }}>FINANCE</div>
            </div>

            {/* Inner glow */}
            <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:80, height:80, borderRadius:'50%', background:'radial-gradient(circle,#00d4aa15,transparent 70%)', animation:'glow-pulse 2s ease-in-out infinite', pointerEvents:'none' }} />
          </div>
        </div>

        {/* HEADLINE */}
        <div style={{ maxWidth:860, padding:'0 24px', position:'relative', zIndex:2 }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#00d4aa12', border:'1px solid #00d4aa30', borderRadius:20, padding:'6px 18px', marginBottom:28, fontSize:11, color:'#00d4aa', fontWeight:700, letterSpacing:'.8px' }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'glow-pulse 1.5s infinite' }} />
            THE FUTURE OF TRADING INTELLIGENCE IS HERE
          </div>

          <h1 style={{ fontSize:'clamp(40px,7vw,84px)', fontWeight:900, lineHeight:1.0, letterSpacing:'-3px', marginBottom:24 }}>
            Wall Street{' '}
            <span style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', display:'inline-block' }}>Intelligence</span>
            <br />for Every Trader
          </h1>

          <p style={{ fontSize:'clamp(16px,2vw,20px)', color:'#6a90a8', lineHeight:1.7, marginBottom:44, maxWidth:620, margin:'0 auto 44px' }}>
            AI agents, real-time data, and institutional research tools — free. From daily market briefs to stock analysis to live trading tournaments.
          </p>

          <div style={{ display:'flex', gap:14, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'16px 32px', borderRadius:12, fontSize:15, fontWeight:900, textDecoration:'none', letterSpacing:'-.3px', boxShadow:'0 0 40px #00d4aa40' }}>
              Try AI Analyzer Free →
            </Link>
            <Link href="/daily" style={{ background:'rgba(6,13,20,.6)', border:'1px solid #0c1e2e', color:'#dce8f0', padding:'16px 32px', borderRadius:12, fontSize:15, fontWeight:700, textDecoration:'none', backdropFilter:'blur(10px)' }}>
              Daily Intelligence
            </Link>
          </div>
        </div>

        {/* Scroll indicator */}
        <div style={{ position:'absolute', bottom:36, left:'50%', transform:'translateX(-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:8, opacity:.4 }}>
          <span style={{ fontSize:10, letterSpacing:'2px', color:'#6a90a8' }}>SCROLL</span>
          <div style={{ width:1, height:40, background:'linear-gradient(#00d4aa,transparent)' }} />
        </div>
      </section>

      {/* TICKER STRIP */}
      <div style={{ borderTop:'1px solid #0c1e2e', borderBottom:'1px solid #0c1e2e', height:40, overflow:'hidden', position:'relative', zIndex:1, background:'#040c14' }}>
        <div style={{ display:'inline-flex', animation:'ticker3d 30s linear infinite', whiteSpace:'nowrap', height:'100%', alignItems:'center' }}>
          {['AI Stock Analyzer — 5 Agent AI','YN Arena — Live Tournaments','Daily Intelligence — Free','$100K Simulated Trading','9 World-Class Instructors','Real Market Data','Gemini 2.0 AI Engine','Prop Firm Challenges',
            'AI Stock Analyzer — 5 Agent AI','YN Arena — Live Tournaments','Daily Intelligence — Free','$100K Simulated Trading','9 World-Class Instructors','Real Market Data','Gemini 2.0 AI Engine','Prop Firm Challenges',
          ].map((t, i) => (
            <span key={i} style={{ padding:'0 32px', fontSize:11, fontWeight:700, letterSpacing:'.8px', color: i % 4 === 0 ? '#00d4aa' : i % 4 === 1 ? '#3b8eea' : i % 4 === 2 ? '#a855f7' : '#f59e0b' }}>
              {t} <span style={{ opacity:.3, marginLeft:16 }}>✦</span>
            </span>
          ))}
        </div>
      </div>

      {/* ═══ POWERED BY ════════════════════════════════════════════════════════ */}
      <section style={{ padding:'120px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={powers.ref} className={`vis-section${powers.visible ? ' visible' : ''}`}>
            <div className="item" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, marginBottom:16 }}>THE STACK</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.1 }}>
                Powered by the{' '}
                <span style={{ background:'linear-gradient(135deg,#00d4aa,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>World&apos;s Best</span>
              </h2>
            </div>
            <div className="grid-3 item" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {POWERS.map((p) => (
                <div key={p.name} className="power-card item" style={{ '--clr': p.clr, '--glow': p.glow } as React.CSSProperties}>
                  <div style={{ fontSize:36, marginBottom:14 }}>{p.icon}</div>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
                    <span style={{ fontSize:16, fontWeight:900, color:'#dce8f0' }}>{p.name}</span>
                    <span style={{ fontSize:9, color: p.clr, background:`${p.clr}18`, border:`1px solid ${p.clr}30`, borderRadius:8, padding:'2px 8px', fontWeight:700, letterSpacing:'.5px' }}>{p.label}</span>
                  </div>
                  <p style={{ fontSize:13, color:'#6a90a8', lineHeight:1.6 }}>{p.desc}</p>
                  <div style={{ marginTop:16, height:2, background:`linear-gradient(90deg,${p.clr},transparent)`, borderRadius:1 }} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ PRODUCTS ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'120px 0', position:'relative', zIndex:1, background:'linear-gradient(180deg,transparent,#060d1440,transparent)' }}>
        <div className="section">
          <div ref={products.ref} className={`vis-section${products.visible ? ' visible' : ''}`}>
            <div className="item" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#a855f7', letterSpacing:'2px', fontWeight:700, marginBottom:16 }}>THE PLATFORM</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.1 }}>
                Six Products.{' '}
                <span style={{ background:'linear-gradient(135deg,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>One Platform.</span>
              </h2>
              <p style={{ fontSize:17, color:'#6a90a8', marginTop:16, maxWidth:500, margin:'16px auto 0' }}>Everything a serious trader needs — in one place, free to start.</p>
            </div>
            <div className="grid-3 item" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
              {PRODUCTS.map((p) => (
                <Link key={p.title} href={p.href} style={{ textDecoration:'none' }}>
                  <div className="product-card holo-card item" style={{ '--clr': p.clr, background: p.grad, border:'1px solid #0c1e2e' } as React.CSSProperties}>
                    <div className="holo-inner">
                      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14 }}>
                        <span style={{ fontSize:32 }}>{p.icon}</span>
                        <span style={{ fontSize:9, color: p.clr, background:`${p.clr}18`, border:`1px solid ${p.clr}30`, borderRadius:8, padding:'3px 10px', fontWeight:800, letterSpacing:'.5px' }}>{p.tag}</span>
                      </div>
                      <h3 style={{ fontSize:17, fontWeight:800, color:'#dce8f0', marginBottom:10, letterSpacing:'-.3px' }}>{p.title}</h3>
                      <p style={{ fontSize:12.5, color:'#6a90a8', lineHeight:1.65 }}>{p.desc}</p>
                      <div style={{ marginTop:18, fontSize:12, color: p.clr, fontWeight:700 }}>Explore →</div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FOUNDERS ══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'120px 0', position:'relative', zIndex:1 }}>
        <div className="section">
          <div ref={founders.ref} className={`vis-section${founders.visible ? ' visible' : ''}`}>
            <div className="item" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#f59e0b', letterSpacing:'2px', fontWeight:700, marginBottom:16 }}>THE TEAM</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:900, letterSpacing:'-2px', lineHeight:1.1 }}>
                Built by{' '}
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#ec4899)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Traders</span>
                {' '}for Traders
              </h2>
            </div>
            <div className="grid-3 item" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {FOUNDERS.map((f) => {
                const tilt = useTilt()
                return (
                  <div key={f.name} ref={tilt.ref} className="card3d item" onMouseMove={tilt.onMove} onMouseLeave={tilt.onLeave}
                    style={{ background:'#060d14', border:`1px solid ${f.clr}30`, borderRadius:22, padding:'36px 28px', position:'relative', overflow:'hidden', transition:'transform .3s ease, box-shadow .3s ease' }}>
                    {/* Glow bg */}
                    <div style={{ position:'absolute', top:-60, right:-60, width:200, height:200, borderRadius:'50%', background:`radial-gradient(circle,${f.clr}15,transparent 70%)`, pointerEvents:'none' }} />
                    <div style={{ position:'relative', zIndex:1 }}>
                      <div style={{ width:64, height:64, borderRadius:18, background: f.grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, fontWeight:900, color:'#030a10', marginBottom:20, boxShadow:`0 0 30px ${f.clr}40` }}>
                        {f.init}
                      </div>
                      <div style={{ fontSize:18, fontWeight:800, color:'#dce8f0', marginBottom:4 }}>{f.name}</div>
                      <div style={{ fontSize:12, color: f.clr, fontWeight:600, marginBottom:20, letterSpacing:'.3px' }}>{f.role}</div>
                      <blockquote style={{ fontSize:13.5, color:'#b8d0e0', lineHeight:1.65, fontStyle:'italic', marginBottom:18, borderLeft:`2px solid ${f.clr}`, paddingLeft:14 }}>{f.quote}</blockquote>
                      <p style={{ fontSize:12, color:'#6a90a8', lineHeight:1.6 }}>{f.bio}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ REVIEWS ═══════════════════════════════════════════════════════════ */}
      <section style={{ padding:'120px 0', position:'relative', zIndex:1, background:'linear-gradient(180deg,transparent,#060d1440,transparent)' }}>
        <div className="section">
          <div ref={reviews.ref} className={`vis-section${reviews.visible ? ' visible' : ''}`}>
            <div className="item" style={{ textAlign:'center', marginBottom:64 }}>
              <div style={{ fontSize:11, color:'#3b8eea', letterSpacing:'2px', fontWeight:700, marginBottom:16 }}>SOCIAL PROOF</div>
              <h2 style={{ fontSize:'clamp(32px,5vw,56px)', fontWeight:900, letterSpacing:'-2px' }}>
                Traders{' '}
                <span style={{ background:'linear-gradient(135deg,#3b8eea,#00d4aa)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>Love It</span>
              </h2>
            </div>
            <div className="grid-3 item" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
              {REVIEWS.map((r) => (
                <div key={r.name} className="holo-card item" style={{ padding:'30px 26px' }}>
                  <div className="holo-inner">
                    <div style={{ fontSize:28, color: r.clr, marginBottom:16, opacity:.8 }}>"</div>
                    <p style={{ fontSize:14, color:'#b8d0e0', lineHeight:1.7, marginBottom:24, fontStyle:'italic' }}>{r.text}</p>
                    <div style={{ display:'flex', alignItems:'center', gap:12, borderTop:'1px solid #0c1e2e', paddingTop:18 }}>
                      <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${r.clr},${r.clr}88)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:900, color:'#030a10', flexShrink:0 }}>
                        {r.name.charAt(0)}
                      </div>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:'#dce8f0' }}>{r.name}</div>
                        <div style={{ fontSize:11, color:'#6a90a8' }}>{r.loc}</div>
                      </div>
                      <div style={{ marginLeft:'auto', fontSize:10, color: r.clr, background:`${r.clr}15`, border:`1px solid ${r.clr}30`, borderRadius:8, padding:'3px 10px', fontWeight:700 }}>{r.tag}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ FINAL CTA ═════════════════════════════════════════════════════════ */}
      <section style={{ padding:'140px 0', position:'relative', zIndex:1, textAlign:'center' }}>
        <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:700, height:700, borderRadius:'50%', background:'radial-gradient(circle,#00d4aa08,transparent 70%)', pointerEvents:'none', animation:'glow-pulse 4s ease-in-out infinite' }} />
        <div className="section" style={{ position:'relative' }}>
          <div style={{ fontSize:11, color:'#00d4aa', letterSpacing:'2px', fontWeight:700, marginBottom:20 }}>GET STARTED FREE</div>
          <h2 style={{ fontSize:'clamp(36px,6vw,72px)', fontWeight:900, letterSpacing:'-2.5px', lineHeight:1.05, marginBottom:24 }}>
            The Edge is{' '}
            <span style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', display:'inline-block' }}>Yours</span>
          </h2>
          <p style={{ fontSize:18, color:'#6a90a8', lineHeight:1.65, marginBottom:48, maxWidth:520, margin:'0 auto 48px' }}>
            Join thousands of traders using AI-powered intelligence to trade smarter. No credit card. No catch.
          </p>
          <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
            <Link href="/ai-stocks" style={{ background:'linear-gradient(135deg,#00d4aa,#3b8eea)', color:'#030a10', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:900, textDecoration:'none', boxShadow:'0 0 60px #00d4aa30, 0 20px 40px #00000040', letterSpacing:'-.3px' }}>
              Analyze Any Stock Free →
            </Link>
            <Link href="/arena" style={{ background:'rgba(6,13,20,.8)', border:'1px solid #0c1e2e', color:'#dce8f0', padding:'18px 40px', borderRadius:14, fontSize:16, fontWeight:700, textDecoration:'none', backdropFilter:'blur(10px)' }}>
              Join a Tournament
            </Link>
          </div>
          <div style={{ marginTop:36, display:'flex', gap:32, justifyContent:'center', flexWrap:'wrap' }}>
            {['Free to start','No credit card','AI-powered','Real market data'].map(f=>(
              <div key={f} style={{ display:'flex', alignItems:'center', gap:8, fontSize:13, color:'#6a90a8' }}>
                <span style={{ color:'#00d4aa' }}>✓</span>{f}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop:'1px solid #0c1e2e', padding:'40px 24px', position:'relative', zIndex:1 }}>
        <div className="section" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:28, height:28, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⚡</div>
            <span style={{ fontWeight:800, fontSize:14, color:'#dce8f0' }}>YN Finance</span>
            <span style={{ fontSize:11, color:'#1a3550', marginLeft:8 }}>© 2026</span>
          </div>
          <div style={{ display:'flex', gap:24 }}>
            {[['Privacy','/privacy'],['Terms','/terms'],['AI Analyzer','/ai-stocks'],['Daily Intel','/daily'],['Arena','/arena']].map(([l,h])=>(
              <Link key={l} href={h} style={{ fontSize:12, color:'#2a4a62', textDecoration:'none' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize:11, color:'#1a3550' }}>Not financial advice. Educational purposes only.</div>
        </div>
      </footer>
    </div>
  )
}
