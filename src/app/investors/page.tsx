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
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#ff2d78', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(255,45,120,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
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
            fontSize:13, color: href === '/investors' ? '#ff2d78' : '#7a9aaa',
            textDecoration:'none', padding:'6px 14px', borderRadius:6,
            fontWeight: href === '/investors' ? 700 : 500,
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

// ── Metric Card ────────────────────────────────────────────────────────────────
function MetricCard({ value, label, accent, sub }: { value:string; label:string; accent:string; sub?: string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:`1px solid ${accent}20`,
      borderRadius:12, padding:'24px 20px', textAlign:'center',
      transition:'border-color .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${accent}50`; e.currentTarget.style.transform='translateY(-2px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor=`${accent}20`; e.currentTarget.style.transform='translateY(0)' }}
    >
      <div style={{ fontSize:32, fontWeight:900, color:accent, fontFamily:'monospace', letterSpacing:'-0.02em', textShadow:`0 0 20px ${accent}50` }}>{value}</div>
      <div style={{ fontSize:11, color:'#6a8a98', letterSpacing:'0.12em', marginTop:6, fontFamily:'monospace' }}>{label}</div>
      {sub && <div style={{ fontSize:11, color:'#4a6a7a', marginTop:4 }}>{sub}</div>}
    </div>
  )
}

// ── Opportunity Card ───────────────────────────────────────────────────────────
function OpportunityCard({ number, title, desc, accent }: { number:string; title:string; desc:string; accent:string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:`1px solid ${accent}20`,
      borderRadius:14, padding:'28px 28px',
      transition:'transform .2s, border-color .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=`${accent}50` }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=`${accent}20` }}
    >
      <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
        <div style={{ fontSize:28, fontWeight:900, color:`${accent}30`, fontFamily:'monospace', lineHeight:1, flexShrink:0 }}>{number}</div>
        <div>
          <div style={{ fontSize:15, fontWeight:800, color:'#e8f4f8', marginBottom:8 }}>{title}</div>
          <p style={{ fontSize:13, color:'#7a9aaa', lineHeight:1.75 }}>{desc}</p>
        </div>
      </div>
    </div>
  )
}

// ── Revenue Stream ─────────────────────────────────────────────────────────────
function RevenueStream({ icon, title, desc, status, accent }: { icon:string; title:string; desc:string; status:string; accent:string }) {
  const isLive = status === 'LIVE'
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)',
      borderRadius:12, padding:'22px 24px', display:'flex', gap:16, alignItems:'flex-start',
      transition:'border-color .2s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor=`${accent}35`}
      onMouseLeave={e => e.currentTarget.style.borderColor='rgba(255,255,255,.07)'}
    >
      <div style={{ fontSize:24, flexShrink:0 }}>{icon}</div>
      <div style={{ flex:1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#e8f4f8' }}>{title}</div>
          <span style={{
            fontSize:9, fontWeight:800, letterSpacing:'0.12em', fontFamily:'monospace',
            color: isLive ? '#00d4aa' : '#f59e0b',
            background: isLive ? 'rgba(0,212,170,.12)' : 'rgba(245,158,11,.12)',
            border: `1px solid ${isLive ? 'rgba(0,212,170,.3)' : 'rgba(245,158,11,.3)'}`,
            borderRadius:4, padding:'2px 7px',
          }}>
            {status}
          </span>
        </div>
        <p style={{ fontSize:12, color:'#7a9aaa', lineHeight:1.65 }}>{desc}</p>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function InvestorsPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      window.location.href = `mailto:investors@ynfinance.org?subject=Investor Updates — ${encodeURIComponent(email)}&body=Please add ${encodeURIComponent(email)} to the investor updates list.`
      setSubmitted(true)
    }
  }

  return (
    <div style={{ background:'#030a10', color:'#cdd6f4', minHeight:'100vh', fontFamily:'"Inter",system-ui,sans-serif', cursor:'none' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(255,45,120,.25); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scanline { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
        .fade-up { animation: fadeUp .7s ease both; }
        .fade-up-1 { animation: fadeUp .7s .1s ease both; }
        .fade-up-2 { animation: fadeUp .7s .2s ease both; }
        @media (max-width:768px) {
          .hero-headline { font-size: 36px !important; }
          .metrics-grid { grid-template-columns: repeat(2,1fr) !important; }
          .opportunity-grid { grid-template-columns: 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      <CustomCursor />
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop:160, paddingBottom:80, padding:'160px 32px 80px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        {/* NOT TAKING INVESTMENT banner */}
        <div className="fade-up" style={{
          display:'inline-flex', alignItems:'center', gap:12,
          background:'rgba(255,45,120,.08)', border:'1px solid rgba(255,45,120,.25)',
          borderRadius:100, padding:'8px 22px', marginBottom:36,
        }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:'#ff2d78' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#ff2d78', letterSpacing:'0.18em', fontFamily:'monospace' }}>NOT TAKING INVESTMENT</span>
        </div>
        <h1 className="hero-headline fade-up-1" style={{
          fontSize:54, fontWeight:900, lineHeight:1.08, letterSpacing:'-0.03em',
          color:'#e8f4f8', marginBottom:24,
        }}>
          YN Finance is not taking<br/>
          <span style={{ background:'linear-gradient(135deg,#ff2d78,#a855f7)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>
            investment at this time.
          </span>
        </h1>
        <p className="fade-up-2" style={{ fontSize:18, color:'#7a9aaa', lineHeight:1.75, maxWidth:560, margin:'0 auto 16px' }}>
          We&apos;re growing organically. When we raise, it will be on our terms.
        </p>
        <p style={{ fontSize:14, color:'#4a6a7a', maxWidth:480, margin:'0 auto' }}>
          No cap table negotiations. No board seats. No pressure to exit. We build what&apos;s best for traders.
        </p>
      </section>

      {/* ── THE OPPORTUNITY ─────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>THE OPPORTUNITY</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:12, textAlign:'center', letterSpacing:'-0.02em' }}>Why this matters</h2>
          <p style={{ fontSize:14, color:'#4a6a7a', textAlign:'center', marginBottom:48 }}>For when we do raise. And for anyone tracking where markets are going.</p>
          <div className="opportunity-grid" style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <OpportunityCard
              number="01"
              accent="#00d4aa"
              title="The trading education market is enormous and underserved"
              desc="The fantasy sports market alone is $93B. Trading education sits at the intersection of that entertainment instinct and real financial markets. There are 100M+ retail traders globally who are currently losing to institutions — not because of skill, but because of information asymmetry. We fix that."
            />
            <OpportunityCard
              number="02"
              accent="#1e90ff"
              title="We are replacing a $8B monopoly with a free product"
              desc="Bloomberg Terminal: 330,000 subscribers × $25,000/year = $8.25B annual revenue. It hasn't materially changed in 20 years. We've replicated and surpassed many of its core intelligence functions using AI, and we offer it free. The moat we're building is distribution and trust — not hardware."
            />
            <OpportunityCard
              number="03"
              accent="#ff2d78"
              title="Three founders. 14 years old. Zero outside capital. 3,247 users."
              desc="This traction wasn't bought with ad spend or VC dollars. It was earned through product quality. Neil built the entire platform solo. Yannai's track record attracted traders. Arjun cold-emailed 47 times to land world-class instructors on 70% revenue share. This team executes."
            />
          </div>
        </div>
      </section>

      {/* ── TRACTION ────────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>TRACTION</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:48, textAlign:'center', letterSpacing:'-0.02em' }}>The numbers so far</h2>
          <div className="metrics-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            <MetricCard value="3,247+" label="ACTIVE TRADERS" accent="#00d4aa" sub="Growing without paid acquisition" />
            <MetricCard value="9" label="INTELLIGENCE TOOLS LIVE" accent="#1e90ff" sub="AI Analyzer, Intel Suite, Congress Tracker + more" />
            <MetricCard value="9" label="INSTRUCTOR PARTNERS" accent="#a855f7" sub="World-class educators on 70% rev share" />
            <MetricCard value="4" label="REVENUE STREAMS" accent="#ff2d78" sub="Courses, prop challenges, arena, B2B API" />
            <MetricCard value="$0" label="OUTSIDE INVESTMENT" accent="#00d4aa" sub="100% bootstrapped" />
            <MetricCard value="2024" label="FOUNDED" accent="#1e90ff" sub="New York, NY" />
          </div>
        </div>
      </section>

      {/* ── REVENUE STREAMS ─────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:800, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#ff2d78', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>REVENUE MODEL</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:12, textAlign:'center', letterSpacing:'-0.02em' }}>Four revenue streams</h2>
          <p style={{ fontSize:14, color:'#4a6a7a', textAlign:'center', marginBottom:40 }}>Multiple monetization vectors with a free-to-start hook.</p>
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <RevenueStream
              icon="🎓"
              title="Course Marketplace"
              status="LIVE"
              accent="#00d4aa"
              desc="Courses from 9 world-class trading instructors. Starting at $0.99. Instructors earn 70% revenue share. YN Finance earns 30%. Courses range from technical analysis to options trading to market microstructure."
            />
            <RevenueStream
              icon="🏆"
              title="Prop Trading Challenges"
              status="LIVE"
              accent="#1e90ff"
              desc="FTMO-style simulated prop firm challenges. $49 (Starter $25K), $149 (Pro $100K), $299 (Elite $200K). Traders who pass earn a certificate and referral to real prop firms. 70%+ fail rate means high margin on fees."
            />
            <RevenueStream
              icon="⚔️"
              title="YN Arena Tournaments"
              status="LIVE"
              accent="#a855f7"
              desc="Competitive trading tournaments with buy-in fees, prize pools, and live leaderboards. Fantasy-sports-style engagement meets real market education. Scheduled, creator-run, and recurring formats."
            />
            <RevenueStream
              icon="🔌"
              title="B2B API & Widget"
              status="COMING SOON"
              accent="#ff2d78"
              desc="The YN Finance AI Widget embeds institutional-grade analysis into any broker or fintech app. API access to our Intelligence Suite for financial platforms. Licensing model TBD — launching Q3 2026."
            />
          </div>
        </div>
      </section>

      {/* ── STAY UPDATED ────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px' }}>
        <div style={{ maxWidth:560, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16 }}>STAY UPDATED</div>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', marginBottom:12, letterSpacing:'-0.02em' }}>Investor updates</h2>
          <p style={{ fontSize:14, color:'#7a9aaa', marginBottom:36, lineHeight:1.7 }}>
            We send occasional updates on traction, product milestones, and when our fundraising stance changes. No spam — we move fast, not loudly.
          </p>
          {submitted ? (
            <div style={{ background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.2)', borderRadius:12, padding:'24px', color:'#00d4aa', fontSize:14 }}>
              ✓ Opening your email client — request submitted.
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display:'flex', gap:10, maxWidth:440, margin:'0 auto' }}>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                style={{
                  flex:1, background:'rgba(255,255,255,.05)',
                  border:'1px solid rgba(255,255,255,.12)', borderRadius:9,
                  padding:'12px 16px', color:'#e8f4f8', fontSize:13,
                  outline:'none', fontFamily:'inherit',
                }}
              />
              <button
                type="submit"
                style={{
                  fontSize:13, fontWeight:700, color:'#030a10',
                  background:'linear-gradient(135deg,#a855f7,#1e90ff)',
                  border:'none', borderRadius:9, padding:'12px 20px',
                  cursor:'pointer', flexShrink:0, whiteSpace:'nowrap',
                }}
              >
                Subscribe →
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── CONTACT ─────────────────────────────────────────────────────────── */}
      <section style={{ padding:'40px 32px 100px', textAlign:'center' }}>
        <div style={{ maxWidth:480, margin:'0 auto' }}>
          <div style={{ background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', borderRadius:14, padding:'32px' }}>
            <div style={{ fontSize:11, color:'#5a7a8a', letterSpacing:'0.14em', fontFamily:'monospace', marginBottom:12 }}>INVESTOR CONTACT</div>
            <a href="mailto:investors@ynfinance.org" style={{ fontSize:18, color:'#ff2d78', fontWeight:800, textDecoration:'none', display:'block', marginBottom:12 }}>
              investors@ynfinance.org
            </a>
            <p style={{ fontSize:12, color:'#4a6a7a', lineHeight:1.65 }}>
              Strategic inquiries, partnership discussions, and future fundraising conversations welcome. We respond thoughtfully, not quickly.
            </p>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'32px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#3a5a6a' }}>
          © 2024 YN Finance Corp. · New York, NY ·{' '}
          <a href="mailto:investors@ynfinance.org" style={{ color:'#3a5a6a', textDecoration:'none' }}>investors@ynfinance.org</a>
        </p>
      </footer>
    </div>
  )
}
