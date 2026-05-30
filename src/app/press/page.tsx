'use client'

import { useState, useEffect, useRef } from 'react'
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
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${mouse.current.x - 4}px,${mouse.current.y - 4}px)`
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
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#1e90ff', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(30,144,255,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
    </>
  )
}

// ── Nav ────────────────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <nav style={{
      position:'fixed', top:0, left:0, right:0, zIndex:100,
      background: scrolled ? 'rgba(3,10,16,.95)' : 'rgba(3,10,16,.7)',
      backdropFilter:'blur(16px)',
      borderBottom:'1px solid rgba(255,255,255,.06)',
      padding:'0 32px', height:64,
      display:'flex', alignItems:'center', justifyContent:'space-between',
      transition:'background .3s',
    }}>
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
        <YNMark size={28} glow />
        <span style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'-0.02em' }}>YN Finance</span>
      </Link>
      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
        {[
          ['/company',   'Company'],
          ['/careers',   'Careers'],
          ['/press',     'Press'],
          ['/investors', 'Investors'],
        ].map(([href, label]) => (
          <Link key={href} href={href} style={{
            fontSize:13, color: href === '/press' ? '#1e90ff' : '#7a9aaa',
            textDecoration:'none', padding:'6px 14px', borderRadius:6,
            fontWeight: href === '/press' ? 700 : 500,
            transition:'color .2s',
          }}>
            {label}
          </Link>
        ))}
        <Link href="/app" style={{
          fontSize:12, fontWeight:700, color:'#030a10',
          background:'linear-gradient(135deg,#00d4aa,#1e90ff)',
          textDecoration:'none', padding:'7px 16px', borderRadius:7,
          letterSpacing:'0.01em', marginLeft:8,
        }}>
          Open Platform →
        </Link>
      </div>
    </nav>
  )
}

// ── Fact Cell ──────────────────────────────────────────────────────────────────
function FactCell({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
      borderRadius:10, padding:'18px 20px',
      transition:'border-color .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${accent || '#1e90ff'}40`}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}
    >
      <div style={{ fontSize:10, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:6 }}>{label}</div>
      <div style={{ fontSize:15, fontWeight:700, color:'#e8f4f8', lineHeight:1.4 }}>{value}</div>
    </div>
  )
}

// ── Color Swatch ───────────────────────────────────────────────────────────────
function Swatch({ hex, name }: { hex: string; name: string }) {
  const [copied, setCopied] = useState(false)
  const handleClick = () => {
    navigator.clipboard.writeText(hex).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }
  return (
    <div
      onClick={handleClick}
      style={{ cursor:'pointer', textAlign:'center' }}
    >
      <div style={{ width:56, height:56, borderRadius:12, background:hex, margin:'0 auto 8px', border:'2px solid rgba(255,255,255,.1)', boxShadow:`0 0 20px ${hex}40` }}/>
      <div style={{ fontSize:10, color:'#6a8a98', fontFamily:'monospace' }}>{copied ? '✓ COPIED' : hex}</div>
      <div style={{ fontSize:11, color:'#9ab4c4', marginTop:2 }}>{name}</div>
    </div>
  )
}

// ── Screenshot Card ────────────────────────────────────────────────────────────
function ScreenshotCard({ title, desc, accent, tag }: { title:string; desc:string; accent:string; tag:string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:`1px solid ${accent}20`,
      borderRadius:14, overflow:'hidden',
      transition:'transform .2s, border-color .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=`${accent}50` }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=`${accent}20` }}
    >
      {/* Mock screenshot area */}
      <div style={{
        height:140, background:`linear-gradient(135deg,rgba(3,10,16,.8),${accent}15)`,
        borderBottom:`1px solid ${accent}20`, display:'flex', alignItems:'center', justifyContent:'center',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', inset:0, backgroundImage:`repeating-linear-gradient(0deg,transparent,transparent 23px,${accent}08 24px),repeating-linear-gradient(90deg,transparent,transparent 23px,${accent}08 24px)` }}/>
        <div style={{ textAlign:'center', position:'relative' }}>
          <div style={{ fontSize:10, fontWeight:700, color:accent, letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:8 }}>{tag}</div>
          <div style={{ fontSize:24, fontWeight:900, color:`${accent}80` }}>[ SCREENSHOT ]</div>
        </div>
      </div>
      <div style={{ padding:'16px 18px' }}>
        <div style={{ fontSize:14, fontWeight:700, color:'#e8f4f8', marginBottom:6 }}>{title}</div>
        <p style={{ fontSize:12, color:'#7a9aaa', lineHeight:1.65 }}>{desc}</p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function PressPage() {
  return (
    <div style={{ background:'#030a10', color:'#cdd6f4', minHeight:'100vh', fontFamily:'"Inter",system-ui,sans-serif', cursor:'none' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(30,144,255,.25); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        .fade-up { animation: fadeUp .7s ease both; }
        .fade-up-1 { animation: fadeUp .7s .1s ease both; }
        .fade-up-2 { animation: fadeUp .7s .2s ease both; }
        @media (max-width:768px) {
          .hero-headline { font-size: 40px !important; }
          .facts-grid { grid-template-columns: repeat(2,1fr) !important; }
          .screenshots-grid { grid-template-columns: 1fr !important; }
          .palette-row { gap: 16px !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      <CustomCursor />
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop:160, paddingBottom:80, padding:'160px 32px 80px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(30,144,255,.08)', border:'1px solid rgba(30,144,255,.2)', borderRadius:100, padding:'6px 18px', marginBottom:32 }}>
          <span style={{ fontSize:11, fontWeight:700, color:'#1e90ff', letterSpacing:'0.18em', fontFamily:'monospace' }}>PRESS & MEDIA</span>
        </div>
        <h1 className="hero-headline fade-up-1" style={{
          fontSize:56, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em',
          background:'linear-gradient(135deg,#e8f4f8 0%,#1e90ff 60%,#00d4aa 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          marginBottom:24,
        }}>
          Press & Media
        </h1>
        <p className="fade-up-2" style={{ fontSize:16, color:'#7a9aaa', lineHeight:1.75, maxWidth:500, margin:'0 auto 32px' }}>
          Resources for journalists, analysts, and content creators covering YN Finance.
        </p>
        <a
          href="mailto:press@ynfinance.org"
          style={{
            display:'inline-flex', alignItems:'center', gap:8,
            fontSize:14, fontWeight:700, color:'#1e90ff',
            border:'1px solid rgba(30,144,255,.3)', borderRadius:9,
            padding:'11px 24px', textDecoration:'none',
            background:'rgba(30,144,255,.07)',
          }}
        >
          ✉ press@ynfinance.org
        </a>
      </section>

      {/* ── COMPANY FACTS ───────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#1e90ff', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>COMPANY FACTS</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:40, textAlign:'center', letterSpacing:'-0.02em' }}>Quick reference</h2>
          <div className="facts-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <FactCell label="FOUNDED" value="2024" accent="#00d4aa" />
            <FactCell label="HEADQUARTERS" value="New York, NY" accent="#1e90ff" />
            <FactCell label="FOUNDERS" value="3 (all age 14)" accent="#a855f7" />
            <FactCell label="ACTIVE TRADERS" value="3,247+" accent="#ff2d78" />
            <FactCell label="INTELLIGENCE TOOLS" value="9 live tools" accent="#00d4aa" />
            <FactCell label="INSTRUCTOR PARTNERS" value="9 world-class educators" accent="#1e90ff" />
            <FactCell label="STARTING PRICE" value="$0.99 / course" accent="#a855f7" />
            <FactCell label="TECH STACK" value="Gemini 2.0 · Finnhub · Supabase · Stripe · Netlify" accent="#ff2d78" />
          </div>
        </div>
      </section>

      {/* ── THE STORY ───────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>THE STORY</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:28, textAlign:'center', letterSpacing:'-0.02em' }}>For use in your coverage</h2>
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'28px 32px' }}>
            <div style={{ fontSize:10, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:16 }}>APPROVED COMPANY DESCRIPTION</div>
            <p style={{ fontSize:15, color:'#c8d8e8', lineHeight:1.85 }}>
              YN Finance Corp. is an AI-powered trading intelligence platform founded in 2024 by two 14-year-olds — Neil Gilani (CEO) and Yannai Richter (CTO) — with a mission to give every retail trader access to the institutional-grade tools previously reserved for hedge funds and Wall Street banks. The platform offers nine intelligence tools including an AI stock analyzer, a congressional trade tracker, smart money alerts, earnings forensics, and a course marketplace with nine world-class instructors, serving 3,247+ active traders with no outside investment and a starting price of $0.
            </p>
          </div>
        </div>
      </section>

      {/* ── BRAND ASSETS ────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>BRAND ASSETS</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:48, textAlign:'center', letterSpacing:'-0.02em' }}>Logo, colors & type</h2>

          {/* Logo */}
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'32px', marginBottom:24, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:20 }}>YN MARK — PRIMARY LOGO</div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap' }}>
              <div style={{ padding:'20px', background:'#030a10', borderRadius:12, border:'1px solid rgba(255,255,255,.08)' }}>
                <YNMark size={64} glow />
              </div>
              <div style={{ padding:'20px', background:'rgba(255,255,255,.05)', borderRadius:12, border:'1px solid rgba(255,255,255,.08)' }}>
                <YNMark size={48} />
              </div>
              <div style={{ padding:'20px', background:'rgba(255,255,255,.08)', borderRadius:12 }}>
                <YNMark size={32} />
              </div>
            </div>
            <p style={{ fontSize:12, color:'#4a6a7a', marginTop:16 }}>The YNMark: a stylized "Y" as a bullish breakout chart pattern. Do not alter colors or proportions.</p>
          </div>

          {/* Palette */}
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'32px', marginBottom:24 }}>
            <div style={{ fontSize:10, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:24 }}>COLOR PALETTE — CLICK TO COPY</div>
            <div className="palette-row" style={{ display:'flex', gap:32, justifyContent:'center', flexWrap:'wrap' }}>
              <Swatch hex="#00d4aa" name="Teal — Primary" />
              <Swatch hex="#1e90ff" name="Blue — Secondary" />
              <Swatch hex="#a855f7" name="Purple — Accent" />
              <Swatch hex="#ff2d78" name="Red — Alert" />
              <Swatch hex="#030a10" name="Dark — Background" />
            </div>
          </div>

          {/* Typography */}
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'28px 32px' }}>
            <div style={{ fontSize:10, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:16 }}>TYPOGRAPHY</div>
            <div style={{ display:'flex', gap:32, flexWrap:'wrap' }}>
              <div>
                <div style={{ fontSize:11, color:'#4a6a7a', marginBottom:6 }}>Primary</div>
                <div style={{ fontSize:22, fontWeight:800, color:'#e8f4f8', fontFamily:'Inter, system-ui, sans-serif' }}>Inter — 900 / 800 / 600</div>
              </div>
              <div>
                <div style={{ fontSize:11, color:'#4a6a7a', marginBottom:6 }}>Monospace</div>
                <div style={{ fontSize:18, fontWeight:700, color:'#00d4aa', fontFamily:'"SF Mono", ui-monospace, monospace' }}>SF Mono — Data / Labels</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRODUCT SCREENSHOTS ─────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#ff2d78', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>KEY PRODUCTS</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:12, textAlign:'center', letterSpacing:'-0.02em' }}>Product visuals</h2>
          <p style={{ fontSize:13, color:'#4a6a7a', textAlign:'center', marginBottom:40 }}>Request high-resolution screenshots via press@ynfinance.org</p>
          <div className="screenshots-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            <ScreenshotCard
              title="AI Analyzer"
              tag="5-AGENT ANALYSIS"
              accent="#00d4aa"
              desc="Five parallel AI agents analyze a stock simultaneously: technicals, fundamentals, sentiment, options flow, and macro. Consolidated verdict with confidence score."
            />
            <ScreenshotCard
              title="Intelligence Suite"
              tag="6 CLASSIFIED WEAPONS"
              accent="#a855f7"
              desc="Six AI-powered intelligence modules: Lock-Up Assassin, Lie Detector, Galaxy Brain, Forced Flow, Signal Radar, and Filing X-Ray. Institutional edge, free."
            />
            <ScreenshotCard
              title="Congress Tracker"
              tag="LIVE TRADE DISCLOSURES"
              accent="#ff2d78"
              desc="Real-time congressional stock trade disclosures pulled from STOCK Act filings. AI suspicion scoring on every trade. Know what your representatives bought before the news."
            />
          </div>
        </div>
      </section>

      {/* ── PRESS CONTACT ───────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(30,144,255,.04)', borderTop:'1px solid rgba(30,144,255,.12)', borderBottom:'1px solid rgba(30,144,255,.12)' }}>
        <div style={{ maxWidth:600, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#1e90ff', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:24 }}>PRESS CONTACT</div>
          <div style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(30,144,255,.2)', borderRadius:16, padding:'40px' }}>
            <div style={{ width:56, height:56, borderRadius:14, background:'rgba(30,144,255,.15)', border:'1px solid rgba(30,144,255,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:24, margin:'0 auto 20px' }}>
              ✉
            </div>
            <h3 style={{ fontSize:20, fontWeight:800, color:'#e8f4f8', marginBottom:8 }}>Media Inquiries</h3>
            <a href="mailto:press@ynfinance.org" style={{ fontSize:17, color:'#1e90ff', fontWeight:700, textDecoration:'none', display:'block', marginBottom:16 }}>press@ynfinance.org</a>
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(0,212,170,.1)', border:'1px solid rgba(0,212,170,.2)', borderRadius:8, padding:'6px 14px' }}>
              <div style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa' }}/>
              <span style={{ fontSize:11, color:'#00d4aa', fontFamily:'monospace', letterSpacing:'0.1em' }}>RESPONSE WITHIN 24 HOURS</span>
            </div>
          </div>
          <div style={{ marginTop:24 }}>
            <a
              href="mailto:press@ynfinance.org?subject=Press Kit Request"
              style={{
                display:'inline-block', fontSize:14, fontWeight:700,
                color:'#030a10', background:'linear-gradient(135deg,#1e90ff,#a855f7)',
                textDecoration:'none', padding:'13px 28px', borderRadius:10,
              }}
            >
              Download Press Kit →
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'32px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#3a5a6a' }}>
          © 2024 YN Finance Corp. · New York, NY ·{' '}
          <a href="mailto:press@ynfinance.org" style={{ color:'#3a5a6a', textDecoration:'none' }}>press@ynfinance.org</a>
        </p>
      </footer>
    </div>
  )
}
