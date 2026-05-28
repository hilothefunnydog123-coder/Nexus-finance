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
      <div ref={dotRef}  style={{ position:'fixed', top:0, left:0, width:8,  height:8,  borderRadius:'50%', background:'#a855f7', pointerEvents:'none', zIndex:9999, willChange:'transform' }}/>
      <div ref={ringRef} style={{ position:'fixed', top:0, left:0, width:32, height:32, borderRadius:'50%', border:'1.5px solid rgba(168,85,247,.5)', pointerEvents:'none', zIndex:9998, willChange:'transform' }}/>
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
            fontSize:13, color: href === '/careers' ? '#a855f7' : '#7a9aaa',
            textDecoration:'none', padding:'6px 14px', borderRadius:6,
            fontWeight: href === '/careers' ? 700 : 500,
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

// ── Role Card ──────────────────────────────────────────────────────────────────
function RoleCard({ title, type, location, desc, accent }: {
  title: string; type: string; location: string; desc: string[]; accent: string
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      style={{
        background:'rgba(255,255,255,.03)',
        border:`1px solid ${hovered ? accent + '50' : 'rgba(255,255,255,.07)'}`,
        borderRadius:14, padding:'28px 28px 24px',
        position:'relative', overflow:'hidden',
        transition:'border-color .2s, transform .2s',
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:`linear-gradient(90deg,${accent},transparent)` }}/>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12, marginBottom:16, flexWrap:'wrap' }}>
        <div>
          <h3 style={{ fontSize:17, fontWeight:800, color:'#e8f4f8', marginBottom:6 }}>{title}</h3>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            <span style={{ fontSize:10, fontWeight:700, color:accent, background:`${accent}15`, border:`1px solid ${accent}30`, borderRadius:4, padding:'3px 9px', fontFamily:'monospace', letterSpacing:'0.1em' }}>{type}</span>
            <span style={{ fontSize:10, fontWeight:700, color:'#6a8a98', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', borderRadius:4, padding:'3px 9px', fontFamily:'monospace', letterSpacing:'0.1em' }}>📍 {location}</span>
          </div>
        </div>
        <a
          href="mailto:careers@ynfinance.org"
          style={{
            fontSize:12, fontWeight:700, color:accent,
            border:`1px solid ${accent}40`, borderRadius:8,
            padding:'8px 18px', textDecoration:'none',
            background:`${accent}0a`, flexShrink:0,
            transition:'background .2s',
          }}
        >
          Apply →
        </a>
      </div>
      <ul style={{ listStyle:'none', display:'flex', flexDirection:'column', gap:6 }}>
        {desc.map((d, i) => (
          <li key={i} style={{ display:'flex', gap:10, fontSize:13, color:'#8aa4b4', lineHeight:1.6 }}>
            <span style={{ color:accent, flexShrink:0 }}>—</span>
            {d}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Why Card ───────────────────────────────────────────────────────────────────
function WhyCard({ icon, title, desc, accent }: { icon:string; title:string; desc:string; accent:string }) {
  return (
    <div style={{
      background:'rgba(255,255,255,.03)', border:`1px solid ${accent}20`,
      borderRadius:14, padding:'28px 24px',
      transition:'transform .2s, border-color .2s',
    }}
      onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.borderColor=`${accent}50` }}
      onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.borderColor=`${accent}20` }}
    >
      <div style={{ fontSize:28, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:15, fontWeight:800, color:'#e8f4f8', marginBottom:8 }}>{title}</div>
      <p style={{ fontSize:13, color:'#7a9aaa', lineHeight:1.7 }}>{desc}</p>
    </div>
  )
}

// ── Perk ───────────────────────────────────────────────────────────────────────
function Perk({ icon, label }: { icon:string; label:string }) {
  return (
    <div style={{
      display:'flex', alignItems:'center', gap:12,
      background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)',
      borderRadius:10, padding:'14px 18px',
    }}>
      <span style={{ fontSize:20 }}>{icon}</span>
      <span style={{ fontSize:13, fontWeight:600, color:'#c8d8e8' }}>{label}</span>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────────
export default function CareersPage() {
  return (
    <div style={{ background:'#030a10', color:'#cdd6f4', minHeight:'100vh', fontFamily:'"Inter",system-ui,sans-serif', cursor:'none' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(168,85,247,.25); }
        @keyframes fadeUp { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse { 0%,100%{opacity:.5} 50%{opacity:1} }
        .fade-up { animation: fadeUp .7s ease both; }
        .fade-up-1 { animation: fadeUp .7s .1s ease both; }
        .fade-up-2 { animation: fadeUp .7s .2s ease both; }
        @media (max-width:768px) {
          .hero-headline { font-size: 38px !important; }
          .why-grid { grid-template-columns: 1fr 1fr !important; }
          .roles-grid { grid-template-columns: 1fr !important; }
          .perks-grid { grid-template-columns: 1fr 1fr !important; }
          .nav-links { display: none !important; }
        }
      `}</style>

      <CustomCursor />
      <Nav />

      {/* ── HERO ────────────────────────────────────────────────────────────── */}
      <section style={{ paddingTop:160, paddingBottom:80, padding:'160px 32px 80px', maxWidth:1100, margin:'0 auto', textAlign:'center' }}>
        <div className="fade-up" style={{ display:'inline-flex', alignItems:'center', gap:10, background:'rgba(168,85,247,.08)', border:'1px solid rgba(168,85,247,.2)', borderRadius:100, padding:'6px 18px', marginBottom:32 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#a855f7', animation:'pulse 2s ease infinite' }}/>
          <span style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.18em', fontFamily:'monospace' }}>WE&apos;RE HIRING</span>
        </div>
        <h1 className="hero-headline fade-up-1" style={{
          fontSize:60, fontWeight:900, lineHeight:1.05, letterSpacing:'-0.03em',
          background:'linear-gradient(135deg,#e8f4f8 0%,#a855f7 50%,#1e90ff 100%)',
          WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text',
          marginBottom:24,
        }}>
          We hire by merit,<br/>not age.
        </h1>
        <p className="fade-up-2" style={{ fontSize:18, color:'#7a9aaa', lineHeight:1.75, maxWidth:580, margin:'0 auto 16px' }}>
          We&apos;re 14. If you&apos;re better at something than we are, we want you.
        </p>
        <p style={{ fontSize:14, color:'#4a6a7a', lineHeight:1.7, maxWidth:480, margin:'0 auto' }}>
          YN Finance is a real startup with real users and real stakes. Your work will reach thousands of traders on day one.
        </p>
      </section>

      {/* ── WHY YN FINANCE ──────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,255,255,.015)', borderTop:'1px solid rgba(255,255,255,.06)', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#a855f7', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>WHY YN FINANCE</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:48, textAlign:'center', letterSpacing:'-0.02em' }}>Four reasons to work with us</h2>
          <div className="why-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:20 }}>
            <WhyCard icon="🏗️" title="Real Product, Real Users" accent="#00d4aa" desc="You won't be building features nobody uses. 3,247 active traders depend on what we ship every week." />
            <WhyCard icon="📈" title="Learn From the Best" accent="#1e90ff" desc="Nine world-class trading instructors built careers on this edge. You'll have direct access to them." />
            <WhyCard icon="🌍" title="Instant Reach" accent="#a855f7" desc="Your first pull request ships to thousands of traders. Not a prototype — production." />
            <WhyCard icon="💎" title="Equity & Growth" accent="#ff2d78" desc="We believe in sharing upside. Early team members receive equity in YN Finance Corp. This isn't an internship." />
          </div>
        </div>
      </section>

      {/* ── OPEN ROLES ──────────────────────────────────────────────────────── */}
      <section style={{ padding:'100px 32px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#00d4aa', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>OPEN ROLES</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:12, textAlign:'center', letterSpacing:'-0.02em' }}>Current openings</h2>
          <p style={{ fontSize:14, color:'#4a6a7a', textAlign:'center', marginBottom:48 }}>
            All roles are remote-first. We evaluate on output, not hours.
          </p>
          <div className="roles-grid" style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:20 }}>
            <RoleCard
              title="Head of Growth"
              type="PART-TIME"
              location="Remote"
              accent="#00d4aa"
              desc={[
                'Own acquisition: SEO, content loops, community flywheels.',
                'Run experiments on onboarding — we have data, we need someone to read it.',
                'You&apos;ve grown a product to 10K+ users before, or you have a plan to.',
              ]}
            />
            <RoleCard
              title="Machine Learning Engineer"
              type="PART-TIME"
              location="Remote"
              accent="#1e90ff"
              desc={[
                'Improve our AI analyzer prompts and multi-agent orchestration (Gemini 2.0).',
                'Build smarter signal detection in our Intelligence Suite.',
                'You read AI papers for fun. You ship models, not slide decks.',
              ]}
            />
            <RoleCard
              title="Content & Community Lead"
              type="PART-TIME"
              location="Remote"
              accent="#a855f7"
              desc={[
                'Write trading breakdowns, tool tutorials, and weekly edge reports.',
                'Moderate and grow the YN Finance community across platforms.',
                'You understand markets and can explain them without dumbing them down.',
              ]}
            />
            <RoleCard
              title="Partnerships Manager"
              type="PART-TIME"
              location="Remote"
              accent="#ff2d78"
              desc={[
                'Source and close deals with prop firms, trading educators, and brokers.',
                'Manage our instructor partner relationships (9 world-class traders).',
                'You have Arjun energy — you don&apos;t count rejections.',
              ]}
            />
          </div>
        </div>
      </section>

      {/* ── CULTURE ─────────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px', background:'rgba(255,45,120,.04)', borderTop:'1px solid rgba(255,45,120,.1)', borderBottom:'1px solid rgba(255,45,120,.1)' }}>
        <div style={{ maxWidth:800, margin:'0 auto', textAlign:'center' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#ff2d78', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:24 }}>CULTURE</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:28, letterSpacing:'-0.02em' }}>How we work</h2>
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {[
              'We ship fast. Fast beats perfect in markets and startups.',
              'We don\'t have meetings about meetings. Every async update is a decision.',
              'Your pull request speaks louder than your resume. Show us what you\'ve built.',
              'We respect time zones. Results matter more than being online at 9 AM.',
              'Nobody here is waiting for permission. If you see a problem, fix it.',
            ].map((text, i) => (
              <div key={i} style={{
                display:'flex', alignItems:'flex-start', gap:16,
                background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)',
                borderRadius:10, padding:'16px 20px', textAlign:'left',
              }}>
                <div style={{ width:24, height:24, borderRadius:6, background:'rgba(255,45,120,.15)', border:'1px solid rgba(255,45,120,.3)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:900, color:'#ff2d78', flexShrink:0 }}>
                  {i + 1}
                </div>
                <p style={{ fontSize:14, color:'#9ab4c4', lineHeight:1.65 }}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PERKS ───────────────────────────────────────────────────────────── */}
      <section style={{ padding:'80px 32px' }}>
        <div style={{ maxWidth:900, margin:'0 auto' }}>
          <div style={{ fontSize:11, fontWeight:700, color:'#1e90ff', letterSpacing:'0.2em', fontFamily:'monospace', marginBottom:16, textAlign:'center' }}>PERKS</div>
          <h2 style={{ fontSize:32, fontWeight:900, color:'#e8f4f8', marginBottom:40, textAlign:'center', letterSpacing:'-0.02em' }}>What you get</h2>
          <div className="perks-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12 }}>
            <Perk icon="📊" label="Equity in YN Finance Corp." />
            <Perk icon="🌐" label="Fully remote, async-first" />
            <Perk icon="📚" label="Learning budget for courses" />
            <Perk icon="🎓" label="Direct access to 9 world-class trading educators" />
            <Perk icon="⚡" label="Ship on day one — real users" />
            <Perk icon="🔑" label="Full platform access, forever" />
            <Perk icon="📰" label="Your name in the changelog" />
            <Perk icon="🚀" label="Ground floor of a real startup" />
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section style={{ padding:'60px 32px 100px', textAlign:'center' }}>
        <div style={{ maxWidth:600, margin:'0 auto' }}>
          <h2 style={{ fontSize:28, fontWeight:900, color:'#e8f4f8', letterSpacing:'-0.02em', marginBottom:12 }}>Don&apos;t see your role?</h2>
          <p style={{ fontSize:15, color:'#7a9aaa', marginBottom:32, lineHeight:1.7 }}>If you have a skill we need and a body of work to show, reach out anyway.</p>
          <a
            href="mailto:careers@ynfinance.org"
            style={{
              display:'inline-block', fontSize:14, fontWeight:700,
              color:'#030a10', background:'linear-gradient(135deg,#a855f7,#1e90ff)',
              textDecoration:'none', padding:'14px 32px', borderRadius:10,
            }}
          >
            Email careers@ynfinance.org
          </a>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop:'1px solid rgba(255,255,255,.06)', padding:'32px', textAlign:'center' }}>
        <p style={{ fontSize:12, color:'#3a5a6a' }}>
          © 2024 YN Finance Corp. · New York, NY ·{' '}
          <a href="mailto:careers@ynfinance.org" style={{ color:'#3a5a6a', textDecoration:'none' }}>careers@ynfinance.org</a>
        </p>
      </footer>
    </div>
  )
}
