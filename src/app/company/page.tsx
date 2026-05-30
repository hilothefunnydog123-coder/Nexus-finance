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
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#00d4aa', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(0,212,170,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
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
            fontSize:13, color: href === '/company' ? '#00d4aa' : '#7a9aaa',
            textDecoration:'none', padding:'6px 14px', borderRadius:6,
            fontWeight: href === '/company' ? 700 : 500,
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

// ── Timeline Item ──────────────────────────────────────────────────────────────
function TimelineItem({ year, events, accent }: { year: string; events: string[]; accent: string }) {
  return (
    <div style={{ display:'flex', gap:32, marginBottom:48 }}>
      <div style={{ flexShrink:0, textAlign:'right', width:80 }}>
        <div style={{ fontSize:20, fontWeight:900, color:accent, fontFamily:'monospace', letterSpacing:'-0.02em' }}>{year}</div>
      </div>
      <div style={{ position:'relative', paddingLeft:32 }}>
        <div style={{ position:'absolute', left:0, top:8, width:12, height:12, borderRadius:'50%', background:accent, boxShadow:`0 0 12px ${accent}` }}/>
        <div style={{ position:'absolute', left:5, top:20, width:2, height:'calc(100% + 36px)', background:`linear-gradient(${accent}60,transparent)` }}/>
        {events.map((ev, i) => (
          <p key={i} style={{ fontSize:15, color:'#a8c0cc', lineHeight:1.75, marginBottom:6 }}>{ev}</p>
        ))}
      </div>
    </div>
  )
}

// ── Value Card ─────────────────────────────────────────────────────────────────
function ValueCard({ icon, title, desc, accent }: { icon: string; title: string; desc: string; accent: string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)',
      border:`1px solid ${accent}25`,
      borderRadius:14, padding:'28px 24px',
      transition:'transform .2s, border-color .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.borderColor=`${accent}60` }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=`${accent}25` }}
    >
      <div style={{ fontSize:32, marginBottom:14 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:800, color:'#e8f4f8', marginBottom:8 }}>{title}</div>
      <p style={{ fontSize:13, color:'#7a9aaa', lineHeight:1.7 }}>{desc}</p>
    </div>
  )
}

// ── Founder Card ───────────────────────────────────────────────────────────────
function FounderCard({ name, role, accent, bio, detail }: { name:string; role:string; accent:string; bio:string; detail:string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)',
      border:`1px solid rgba(255,255,255,.07)`,
      borderRadius:16, padding:'28px 24px',
      position:'relative', overflow:'hidden',
      transition:'border-color .2s, transform .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.borderColor=`${accent}50`; e.currentTarget.style.transform='translateY(-3px)' }}
      onMouseLeave={e => { e.currentTarget.style.borderColor='rgba(255,255,255,.07)'; e.currentTarget.style.transform='translateY(0)' }}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${accent},transparent)` }}/>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
        <div style={{ width:48, height:48, borderRadius:12, background:`${accent}20`, border:`2px solid ${accent}40`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:accent }}>
          {name.split(' ').map(n=>n[0]).join('')}
        </div>
        <div>
          <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>{name}</div>
          <div style={{ fontSize:11, fontWeight:700, color:accent, letterSpacing:'0.12em', fontFamily:'monospace' }}>{role}</div>
        </div>
      </div>
      <p style={{ fontSize:13, color:'#7a9aaa', lineHeight:1.7, marginBottom:10 }}>{bio}</p>
      <p style={{ fontSize:12, color:'#4a6a7a', lineHeight:1.6, fontStyle:'italic' }}>{detail}</p>
    </div>
  )
}

// ── Stat ───────────────────────────────────────────────────────────────────────
function Stat({ value, label, accent }: { value:string; label:string; accent:string }) {
  return (
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:36, fontWeight:900, color:accent, fontFamily:'monospace', letterSpacing:'-0.02em', textShadow:`0 0 24px ${accent}60` }}>{value}</div>
      <div style={{ fontSize:11, color:'#6a8a98', letterSpacing:'0.14em', marginTop:4, fontFamily:'monospace' }}>{label}</div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CompanyPage() {
  return (
    <div style={{ background:'#030a10', color:'#cdd6f4', minHeight:'100vh', fontFamily:'"Inter",system-ui,sans-serif', cursor:'none' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(0,212,170,.25); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes glow { 0%,100%{opacity:.6} 50%{opacity:1} }
        .fade-up { animation: fadeUp .7s ease both; }
        .fade-up-1 { animation: fadeUp .7s .1s ease both; }
        .fade-up-2 { animation: fadeUp .7s .2s ease both; }
        .fade-up-3 { animation: fadeUp .7s .3s ease both; }
        @media (max-width:768px) {
          .hero-headline { font-size: 36px !important; }
          .problem-grid { grid-template-columns: 1fr !important; }
          .stats-row { grid-template-columns: repeat(2,1fr) !important; }
          .founders-grid { grid-template-columns: 1fr !important; }
          .values-grid { grid-template-columns: 1fr 1fr !important; }
          .timeline-item { flex-direction: column !important; gap: 12px !important; }
          .nav-links { display: none !important; }
          .cta-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <CustomCursor />
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop:160, paddingBottom:100, padding:'160px 32px 100px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(0,212,170,.08)', border:'1px solid rgba(0,212,170,.2)', borderRadius:100, padding:'6px 18px', marginBottom:36 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#00d4aa', animation:'glow 2s ease infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.18em', fontFamily:'monospace' }}>EST. 2024 · NEW YORK</span>
        </div>
        <h1 className="hero-headline fade-up-1" style={{
          fontSize:58, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em',
          background:'linear-gradient(135deg,#e8f4f8 0%,#00d4aa 40%,#1e90ff 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          marginBottom:28,
        }}>
          We&apos;re building the Bloomberg<br/>Terminal for everyone who<br/>isn&apos;t a hedge fund.
        </h1>
        <p className="fade-up-2" style={{ fontSize:18, color:'#7a9aaa', lineHeight:1.75, maxWidth:620, margin:'0 auto 48px' }}>
          YN Finance Corp. is an AI trading intelligence platform on a mission to democratize the institutional tools Wall Street has kept from retail traders. Founded in 2024. Age 14.
        </p>
        <div className="fade-up-3" style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap' }}>
          <Link href="/app" style={{ fontSize:14, fontWeight:700, color:'#030a10', background:'linear-gradient(135deg,#00d4aa,#1e90ff)', textDecoration:'none', padding:'14px 28px', borderRadius:10 }}>
            Open Platform →
          </Link>
          <Link href="/courses" style={{ fontSize:14, fontWeight:600, color:'#00d4aa', border:'1px solid rgba(0,212,170,.3)', textDecoration:'none', padding:'14px 28px', borderRadius:10, background:'rgba(0,212,170,.06)' }}>
            Browse Courses
          </Link>
        </div>
      </section>

      {/* ── THE PROBLEM ─────────────────────────────────────────────────────── */}
      <section style={{ background:'rgba(255,45,120,.04)', borderTop:'1px solid rgba(255,45,120,.12)', borderBottom:'1px solid rgba(255,45,120,.12)', padding:'80px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#ff2d78', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:24, textAlign:'center' }}>THE PROBLEM</div>
          <div className="problem-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16, marginBottom:60 }}>
            {[
              ['$25,000/yr', 'Bloomberg Terminal subscription. Annual. Per seat.'],
              ['$500,000/yr', 'Average Goldman Sachs analyst cost. Institutional only.'],
              ['PRIVATE', 'Congressional trade intelligence. Disclosed by law, hidden in plain sight.'],
              ['EXCLUSIVE', 'Earnings forensics and SEC filing analysis. Built for institutions.'],
            ].map(([val, desc]) => (
              <div key={val} style={{ background:'rgba(255,45,120,.06)', border:'1px solid rgba(255,45,120,.15)', borderRadius:12, padding:'24px 28px' }}>
                <div style={{ fontSize:28, fontWeight:900, color:'#ff2d78', fontFamily:'monospace', marginBottom:8 }}>{val}</div>
                <p style={{ fontSize:14, color:'#9aacb8', lineHeight:1.6 }}>{desc}</p>
              </div>
            ))}
          </div>
          <div style={{ textAlign:'center', maxWidth:700, margin:'0 auto' }}>
            <p style={{ fontSize:22, fontWeight:800, color:'#e8f4f8', lineHeight:1.5 }}>
              We automated all of it.{' '}
              <span style={{ color:'#00d4aa' }}>For free.</span>{' '}
              <span style={{ color:'#a855f7' }}>And we&apos;re 14.</span>
            </p>
          </div>
        </div>
      </section>

      {/* ── OUR MISSION ─────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 32px', background:'rgba(0,212,170,.04)', borderBottom:'1px solid rgba(0,212,170,.1)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:24 }}>OUR MISSION</div>
          <h2 style={{ fontSize:36, fontWeight:900, color:'#e8f4f8', lineHeight:1.3, marginBottom:20, letterSpacing:'-0.02em', maxWidth:700, margin:'0 auto 20px' }}>
            Every retail trader deserves the intelligence Wall Street takes for granted.
          </h2>
          <p style={{ fontSize:16, color:'#7a9aaa', lineHeight:1.75, maxWidth:560, margin:'0 auto 60px' }}>
            We believe the gap between institutional and retail isn&apos;t talent — it&apos;s access. We close that gap with AI.
          </p>
          <div className="stats-row" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:32 }}>
            <Stat value="3,247+" label="ACTIVE TRADERS" accent="#00d4aa" />
            <Stat value="9" label="INSTRUCTORS" accent="#1e90ff" />
            <Stat value="$0" label="TO START" accent="#a855f7" />
            <Stat value="9" label="INTELLIGENCE TOOLS" accent="#ff2d78" />
          </div>
        </div>
      </section>

      {/* ── THE STORY ───────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 32px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>THE STORY</div>
          <h2 style={{ fontSize:36, fontWeight:900, color:'#e8f4f8', letterSpacing:'-0.02em', marginBottom:60, textAlign:'center' }}>Four years. One mission.</h2>
          <TimelineItem year="2022" accent="#1e90ff" events={[
            'Neil Gilani starts coding at age 11. Builds Discord bots, then automation scripts.',
            'No roadmap. Just curiosity and a laptop.',
          ]}/>
          <TimelineItem year="2023" accent="#a855f7" events={[
            "Neil builds a gap scanner at 13. It hits 40K upvotes on Reddit overnight.",
            "Yannai Richter, paper trading since 12, posts a TSLA call that gets 2.1M impressions on X.",
            "Yannai cold-emails Ross Cameron 47 times. No reply. 48th time: a meeting.",
          ]}/>
          <TimelineItem year="2024" accent="#00d4aa" events={[
            "Neil and Yannai meet on Discord. Two 14-year-olds who built different edges.",
            "YN Finance Corp. is founded in New York. First lines of platform code written.",
            "Yannai signs 9 world-class instructors in 4 months on 70% revenue-share deals.",
          ]}/>
          <TimelineItem year="2025–26" accent="#ff2d78" events={[
            "9 intelligence tools live: AI Analyzer, Intelligence Suite, Congress Tracker, Smart Money Alerts, Earnings Decoder, YN Arena, and more.",
            "3,247+ active traders. Zero outside investment. $0 to start trading.",
            "The Bloomberg Terminal replacement is no longer hypothetical.",
          ]}/>
        </div>
      </section>

      {/* ── OUR VALUES ──────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#1e90ff', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>OUR VALUES</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:48, textAlign:'center', letterSpacing:'-0.02em' }}>What we stand for</h2>
          <div className="values-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
            <ValueCard icon="🔍" title="Transparency" accent="#00d4aa" desc="We show our data sources, our methodology, and our limitations. No black boxes." />
            <ValueCard icon="🌐" title="Access" accent="#1e90ff" desc="Institutional-grade intelligence shouldn't cost $25K/year. It should cost nothing." />
            <ValueCard icon="⚡" title="Edge" accent="#a855f7" desc="We don't build features. We build advantages. Every tool exists to give you an information edge." />
            <ValueCard icon="🚀" title="Speed" accent="#ff2d78" desc="We ship fast. The market moves fast. Slow intelligence is no intelligence." />
          </div>
        </div>
      </section>

      {/* ── THE TEAM ────────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 32px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>THE FOUNDERS</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:48, textAlign:'center', letterSpacing:'-0.02em' }}>Two 14-year-olds who got tired of losing edge to institutions</h2>
          <div className="founders-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:24, maxWidth:700, margin:'0 auto' }}>
            <FounderCard
              name="Neil Gilani"
              role="CEO"
              accent="#00d4aa"
              bio="Built every line of YN Finance's code solo. Started at 11 with Discord bots, built a gap scanner at 13 that hit 40K upvotes on Reddit overnight."
              detail="'I coded because I needed the tool. Then I realized everyone else needed it too.'"
            />
            <FounderCard
              name="Yannai Richter"
              role="CTO"
              accent="#1e90ff"
              bio="Paper traded from age 12. Turned $500 simulated into $31K in 11 months. Cold-emailed Ross Cameron 47 times and signed 9 world-class instructors on 70% revenue share."
              detail="'I trusted my thesis before the crowd did. That's the only edge that matters.'"
            />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px 120px', textAlign:'center' }}>
        <div style={{ maxWidth:700, margin:'0 auto' }}>
          <h2 style={{ fontSize:36, fontWeight:900, color:'#e8f4f8', letterSpacing:'-0.02em', marginBottom:16 }}>Join 3,247+ traders who already have the edge.</h2>
          <p style={{ fontSize:16, color:'#7a9aaa', marginBottom:40, lineHeight:1.7 }}>Free to start. Nine intelligence tools. Built by traders, for traders.</p>
          <div className="cta-grid" style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, maxWidth:600, margin:'0 auto' }}>
            <Link href="/app" style={{ fontSize:13, fontWeight:700, color:'#030a10', background:'linear-gradient(135deg,#00d4aa,#1e90ff)', textDecoration:'none', padding:'13px 20px', borderRadius:9, textAlign:'center' }}>
              Open Platform
            </Link>
            <Link href="/courses" style={{ fontSize:13, fontWeight:600, color:'#e8f4f8', border:'1px solid rgba(255,255,255,.15)', textDecoration:'none', padding:'13px 20px', borderRadius:9, textAlign:'center', background:'rgba(255,255,255,.04)' }}>
              Courses
            </Link>
            <Link href="/careers" style={{ fontSize:13, fontWeight:600, color:'#a855f7', border:'1px solid rgba(168,85,247,.3)', textDecoration:'none', padding:'13px 20px', borderRadius:9, textAlign:'center', background:'rgba(168,85,247,.05)' }}>
              Join the Team
            </Link>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'32px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#3a5a6a' }}>
          © 2024 YN Finance Corp. · New York, NY ·{' '}
          <a href="mailto:hello@ynfinance.org" style={{ color:'#3a5a6a', textDecoration:'none' }}>hello@ynfinance.org</a>
        </p>
      </footer>
    </div>
  )
}
