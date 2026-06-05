'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { YNMark } from '@/components/YNLogo'

const ThreeScene = dynamic(() => import('@/components/ThreeScene'), { ssr: false })
const CinematicIntro = dynamic(() => import('@/components/CinematicIntro'), { ssr: false })

// ── Scroll reveal ───────────────────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setShown(true); o.disconnect() }
    }, { threshold: 0.15 })
    o.observe(el)
    return () => o.disconnect()
  }, [])
  return (
    <div ref={ref} style={{
      opacity: shown ? 1 : 0,
      transform: shown ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`,
    }}>{children}</div>
  )
}

const NAV = [
  { label: 'Analyzer',     href: '/ai-stocks' },
  { label: 'Intelligence', href: '/intelligence' },
  { label: 'Agents',       href: '/agents' },
  { label: 'Algorithms',   href: '/algorithms' },
  { label: 'Research',     href: '/research' },
  { label: 'Courses',      href: '/courses' },
  { label: 'Developers',   href: '/developers' },
  { label: 'Company',      href: '/company' },
]

const WEAPONS = [
  { name: 'Lock-Up Assassin', desc: 'Times insider lock-up expiries before the dump hits.', clr: '#ff2d78' },
  { name: 'Lie Detector',     desc: 'Earnings forensics — what management is really saying.', clr: '#1e90ff' },
  { name: 'Galaxy Brain',     desc: 'Maps one macro event into the stocks it will move.',     clr: '#a855f7' },
  { name: 'Forced Flow',      desc: 'Detects mechanical, non-discretionary institutional buying.', clr: '#00d4aa' },
  { name: 'Signal Radar',     desc: 'Cross-asset correlation breaks, surfaced in real time.', clr: '#f59e0b' },
  { name: 'Filing X-Ray',     desc: 'Pulls the buried numbers out of dense SEC filings.',     clr: '#22c55e' },
]

const PRODUCTS = [
  { tag: 'AI Stock Analyzer', href: '/ai-stocks',    clr: '#00d4aa', title: 'Full AI rating on any stock', body: 'Rating, bull & bear price targets, conviction, thesis and key levels — any ticker in seconds.' },
  { tag: 'Intelligence Suite',href: '/intelligence', clr: '#1e90ff', title: 'Six institutional weapons',  body: 'Insider timing, earnings forensics, macro mapping & filing intel — one click each.' },
  { tag: 'Agent Network',     href: '/agents',       clr: '#a855f7', title: 'Nine agents, 24/7',          body: 'Congress, insiders, options flow, dark pools and macro — watched and pushed to you.' },
  { tag: 'Algorithms',        href: '/algorithms',   clr: '#22c55e', title: 'Prop-grade trading bots',    body: 'Copy-paste strategies with backtest stats, trailing exits and webhook autotrade.' },
  { tag: 'Research',          href: '/research',     clr: '#eab308', title: 'Deep-dive reports',          body: 'Long-form market intelligence and AI research on the names that actually matter.' },
  { tag: 'YN Arena',          href: '/arena',        clr: '#ec4899', title: 'Compete for real prizes',    body: 'DraftKings-style trading tournaments. Climb the board, win the pool.' },
  { tag: 'Daily Intel',       href: '/daily',        clr: '#f59e0b', title: 'Your morning edge',          body: 'An AI market briefing before the bell. Know the whole day in two minutes.' },
  { tag: 'Courses',           href: '/courses',      clr: '#06b6d4', title: '$0.99 from 9 pros',          body: 'Learn the strategy, then practice it instantly on real charts. No subscription.' },
]

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const onScroll = () => { setScrollY(window.scrollY); setScrolled(window.scrollY > 24) }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulseDot { 0%,100%{opacity:.4;transform:scale(1)} 50%{opacity:1;transform:scale(1.25)} }
        @keyframes floatY { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { 0%{background-position:0% 50%} 100%{background-position:200% 50%} }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#00d4aa33 }
        html { scroll-behavior:smooth }
        a { -webkit-tap-highlight-color:transparent }
        .grad { background:linear-gradient(110deg,#00d4aa,#1e90ff,#a855f7,#00d4aa); background-size:200% auto; -webkit-background-clip:text; background-clip:text; -webkit-text-fill-color:transparent; animation:shimmer 6s linear infinite }
        .btn-primary { transition:transform .2s ease, box-shadow .2s ease }
        .btn-primary:hover { transform:translateY(-2px); box-shadow:0 0 70px #00d4aa55, 0 18px 40px rgba(0,0,0,.5) }
        .card { transition:transform .25s cubic-bezier(.16,1,.3,1), border-color .25s, background .25s }
        .card:hover { transform:translateY(-4px) }
        .navlink { transition:color .2s }
        .navlink:hover { color:#dce8f0 !important }
        @media(max-width:980px){ .grid4{grid-template-columns:repeat(2,1fr)!important} }
        @media(max-width:760px){ .hide-sm{display:none!important} .grid3{grid-template-columns:1fr!important} .grid2{grid-template-columns:1fr!important} .weap{grid-template-columns:1fr 1fr!important} }
        @media(max-width:560px){ .grid4{grid-template-columns:1fr!important} .weap{grid-template-columns:1fr!important} .foot{grid-template-columns:1fr 1fr!important} }
      `}</style>

      {/* CINEMATIC BACKGROUND */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, opacity: 0.9 }}>
        <ThreeScene scrollY={scrollY} />
      </div>
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
        background: 'radial-gradient(circle at 50% 0%, rgba(0,212,170,.10), transparent 55%), linear-gradient(180deg, rgba(4,10,18,.2), rgba(4,10,18,.85))' }} />

      {/* Cinematic intro montage — plays once, then fades into the Three.js background above */}
      <CinematicIntro />

      {/* NAV */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 64,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)',
        background: scrolled ? 'rgba(4,10,18,.82)' : 'transparent',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: scrolled ? '1px solid rgba(255,255,255,.06)' : '1px solid transparent',
        transition: 'all .3s ease',
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <YNMark size={28} glow />
          <span style={{ fontSize: 16, fontWeight: 800, color: '#fff', letterSpacing: '-.5px' }}>YN Finance</span>
        </Link>
        <div className="hide-sm" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {NAV.map(n => (
            <Link key={n.href} href={n.href} className="navlink" style={{ fontSize: 13, fontWeight: 600, color: '#6a8497', textDecoration: 'none', whiteSpace: 'nowrap' }}>{n.label}</Link>
          ))}
        </div>
        <Link href="/courses" style={{
          background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '9px 20px',
          borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none', letterSpacing: '-.2px',
        }}>Get started</Link>
      </nav>

      {/* HERO */}
      <section style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '110px 24px 80px' }}>
        <div style={{ animation: 'fadeUp .8s ease both' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.22)', borderRadius: 100, padding: '7px 18px', marginBottom: 30, fontSize: 11, color: '#f59e0b', fontWeight: 700, letterSpacing: '1px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', animation: 'pulseDot 1.6s infinite' }} />
            FOUNDED BY NEIL GILANI &amp; YANNAI RICHTER
          </div>

          <h1 style={{ fontSize: 'clamp(42px,7.5vw,88px)', fontWeight: 900, lineHeight: 0.96, letterSpacing: '-3px', color: '#eaf4fa', maxWidth: 920, margin: '0 auto' }}>
            Outtrade<br /><span className="grad">Wall Street.</span>
          </h1>

          <p style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: '#6a8497', lineHeight: 1.7, maxWidth: 580, margin: '26px auto 0' }}>
            {"An entire AI research desk in your pocket — analyzer, intelligence suite, live agents and prop-grade algorithms. The edge they gatekeep, free to start."}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <Link href="/ai-stocks" className="btn-primary" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '16px 38px', borderRadius: 14, fontSize: 15.5, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 50px #00d4aa40, 0 16px 36px rgba(0,0,0,.45)', letterSpacing: '-.3px' }}>
              Try the AI Analyzer
            </Link>
            <Link href="/intelligence" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#dce8f0', padding: '16px 34px', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', backdropFilter: 'blur(10px)' }}>
              Explore the Suite
            </Link>
          </div>

          <div style={{ display: 'flex', gap: 'clamp(20px,5vw,52px)', justifyContent: 'center', flexWrap: 'wrap', marginTop: 56 }}>
            {([['9', 'AI tools'], ['9', 'Live agents'], ['$0.99', 'Courses'], ['$0', 'To start']] as [string, string][]).map(([n, l]) => (
              <div key={l}>
                <div style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: '#eaf4fa', fontFamily: '"SF Mono",ui-monospace,monospace', letterSpacing: '-1px' }}>{n}</div>
                <div style={{ fontSize: 10.5, color: '#3a5566', letterSpacing: '1.5px', marginTop: 4, fontWeight: 600 }}>{l.toUpperCase()}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ position: 'absolute', bottom: 28, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: 0.35 }}>
          <span style={{ fontSize: 9, letterSpacing: '3px', color: '#6a90a8' }}>SCROLL</span>
          <div style={{ width: 1, height: 40, background: 'linear-gradient(#00d4aa,transparent)', animation: 'floatY 2s ease-in-out infinite' }} />
        </div>
      </section>

      {/* TRUST STRIP */}
      <section style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(4,8,14,.6)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '18px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'clamp(16px,4vw,44px)', flexWrap: 'wrap', fontSize: 12, color: '#3a5566', fontWeight: 600, letterSpacing: '.5px' }}>
          <span>Live data · <span style={{ color: '#6a8497' }}>Finnhub</span></span>
          <span style={{ opacity: .3 }}>|</span>
          <span>Payments · <span style={{ color: '#6a8497' }}>Stripe</span></span>
          <span style={{ opacity: .3 }}>|</span>
          <span>AI · <span style={{ color: '#6a8497' }}>Google Gemini</span></span>
          <span style={{ opacity: .3 }}>|</span>
          <span><span style={{ color: '#6a8497' }}>9</span> world-class instructors</span>
        </div>
      </section>

      {/* THE ARSENAL — full product grid */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(70px,10vw,120px) 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#00d4aa', marginBottom: 14 }}>THE ARSENAL</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', maxWidth: 680, margin: '0 auto', lineHeight: 1.08 }}>
                Everything Wall Street has — minus the gatekeeping.
              </h2>
            </div>
          </Reveal>

          <div className="grid4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.tag} delay={(i % 4) * 70}>
                <Link href={p.href} className="card" style={{
                  display: 'block', height: '100%', textDecoration: 'none', borderRadius: 16, padding: '24px 22px',
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', backdropFilter: 'blur(12px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.clr}55`; e.currentTarget.style.background = `${p.clr}0d` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.07)'; e.currentTarget.style.background = 'rgba(255,255,255,.025)' }}
                >
                  <div style={{ width: 34, height: 34, borderRadius: 9, marginBottom: 14, background: `${p.clr}18`, border: `1px solid ${p.clr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: p.clr, boxShadow: `0 0 10px ${p.clr}` }} />
                  </div>
                  <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '1px', color: p.clr, marginBottom: 9 }}>{p.tag.toUpperCase()}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#eaf4fa', lineHeight: 1.2, marginBottom: 8, letterSpacing: '-.3px' }}>{p.title}</div>
                  <div style={{ fontSize: 13, color: '#6a8497', lineHeight: 1.6 }}>{p.body}</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* INTELLIGENCE SUITE — CINEMATIC */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(70px,10vw,120px) 24px', background: 'linear-gradient(180deg, transparent, rgba(10,4,20,.55), transparent)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '4px', color: '#ff2d78', border: '1px solid rgba(255,45,120,.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 18 }}>CLASSIFIED · INTELLIGENCE SUITE</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', lineHeight: 1.08 }}>Six weapons. One click each.</h2>
              <p style={{ fontSize: 15, color: '#6a8497', maxWidth: 520, margin: '16px auto 0', lineHeight: 1.7 }}>
                {"The asymmetric information Wall Street guards — decoded and handed to you."}
              </p>
            </div>
          </Reveal>

          <div className="weap" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {WEAPONS.map((w, i) => (
              <Reveal key={w.name} delay={i * 70}>
                <div className="card" style={{ height: '100%', borderRadius: 16, padding: '24px 22px', background: 'rgba(6,10,18,.55)', border: '1px solid rgba(255,255,255,.07)', backdropFilter: 'blur(10px)' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, marginBottom: 16, background: `${w.clr}18`, border: `1px solid ${w.clr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ width: 9, height: 9, borderRadius: '50%', background: w.clr, boxShadow: `0 0 12px ${w.clr}` }} />
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#eaf4fa', marginBottom: 7, letterSpacing: '-.3px' }}>{w.name}</div>
                  <div style={{ fontSize: 13, color: '#6a8497', lineHeight: 1.6 }}>{w.desc}</div>
                </div>
              </Reveal>
            ))}
          </div>

          <Reveal>
            <div style={{ textAlign: 'center', marginTop: 44 }}>
              <Link href="/intelligence" style={{ display: 'inline-block', background: 'rgba(255,45,120,.1)', border: '1px solid rgba(255,45,120,.35)', color: '#ff6b9d', padding: '14px 32px', borderRadius: 12, fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                Enter the Intelligence Suite →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* COURSES */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px,9vw,110px) 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ borderRadius: 24, padding: 'clamp(36px,6vw,64px)', background: 'linear-gradient(135deg, rgba(0,212,170,.08), rgba(30,144,255,.05))', border: '1px solid rgba(0,212,170,.18)', textAlign: 'center', backdropFilter: 'blur(12px)' }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#00d4aa', marginBottom: 16 }}>LEARN FROM THE BEST · $0.99</div>
              <h2 style={{ fontSize: 'clamp(26px,3.6vw,42px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', lineHeight: 1.1, maxWidth: 620, margin: '0 auto' }}>
                Courses from 9 world-class traders — priced like a coffee.
              </h2>
              <p style={{ fontSize: 15, color: '#6a8497', maxWidth: 520, margin: '18px auto 0', lineHeight: 1.7 }}>
                {"Watch the strategy, then practice it instantly on real charts. No subscription — every course is just $0.99."}
              </p>
              <Link href="/courses" className="btn-primary" style={{ display: 'inline-block', marginTop: 32, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '15px 36px', borderRadius: 13, fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 40px #00d4aa35' }}>
                Browse the catalog →
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* FOUNDERS */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px,9vw,110px) 24px' }}>
        <div style={{ maxWidth: 980, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#f59e0b', marginBottom: 14 }}>THE FOUNDERS</div>
              <h2 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', lineHeight: 1.1 }}>Two builders, one mission.</h2>
            </div>
          </Reveal>
          <div className="grid2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 }}>
            {([
              { in: 'NG', name: 'Neil Gilani', role: 'CEO & Co-Founder', clr: '#00d4aa', g: 'linear-gradient(135deg,#00d4aa,#3b8eea)', tc: '#06121f',
                body: 'Built the entire platform — the AI pipeline, real-time data infrastructure and every trading tool behind it.' },
              { in: 'YR', name: 'Yannai Richter', role: 'CTO & Co-Founder', clr: '#1e90ff', g: 'linear-gradient(135deg,#1e90ff,#a855f7)', tc: '#fff',
                body: 'Co-architected the tech stack and personally recruited nine world-class instructors onto the platform.' },
            ] as { in: string; name: string; role: string; clr: string; g: string; tc: string; body: string }[]).map((f, i) => (
              <Reveal key={f.in} delay={i * 90}>
                <div style={{ height: '100%', borderRadius: 18, padding: '28px 26px', background: `${f.clr}0a`, border: `1px solid ${f.clr}28`, backdropFilter: 'blur(12px)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 13, background: f.g, color: f.tc, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, boxShadow: `0 0 22px ${f.clr}44` }}>{f.in}</div>
                    <div>
                      <div style={{ fontSize: 17, fontWeight: 800, color: '#eaf4fa' }}>{f.name}</div>
                      <div style={{ fontSize: 11, color: f.clr, fontFamily: 'monospace', letterSpacing: '.08em', marginTop: 3 }}>{f.role.toUpperCase()}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#6a8497', lineHeight: 1.7 }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(80px,12vw,150px) 24px', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontSize: 'clamp(32px,5.5vw,68px)', fontWeight: 900, letterSpacing: '-2.5px', color: '#eaf4fa', lineHeight: 1, maxWidth: 760, margin: '0 auto' }}>
            Stop trading <span className="grad">blind.</span>
          </h2>
          <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#6a8497', maxWidth: 480, margin: '22px auto 0', lineHeight: 1.7 }}>
            {"Start free in under a minute. No card, no terminal to learn — just the edge."}
          </p>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 38 }}>
            <Link href="/ai-stocks" className="btn-primary" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '17px 44px', borderRadius: 14, fontSize: 16, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 60px #00d4aa50' }}>
              Start for free →
            </Link>
            <Link href="/courses" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#dce8f0', padding: '17px 38px', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>
              Browse courses
            </Link>
          </div>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer style={{ position: 'relative', zIndex: 1, borderTop: '1px solid rgba(255,255,255,.06)', background: 'rgba(3,6,12,.75)', backdropFilter: 'blur(8px)' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '52px 24px 28px' }}>
          <div className="foot" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1fr', gap: 28, marginBottom: 40 }}>
            <div>
              <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', marginBottom: 14 }}>
                <YNMark size={24} glow />
                <span style={{ fontSize: 15, fontWeight: 800, color: '#dce8f0' }}>YN Finance</span>
              </Link>
              <p style={{ fontSize: 12.5, color: '#3a5566', lineHeight: 1.65, maxWidth: 260 }}>
                {"The AI research desk that closes the gap between you and Wall Street."}
              </p>
            </div>
            {([
              ['Product', [['AI Stock Analyzer', '/ai-stocks'], ['Trade Analyzer', '/analyzer'], ['Intelligence Suite', '/intelligence'], ['Agent Network', '/agents'], ['Algorithms', '/algorithms'], ['YN Arena', '/arena'], ['Daily Intel', '/daily'], ['Courses', '/courses']]],
              ['Company', [['About', '/company'], ['Careers', '/careers'], ['Press', '/press'], ['Investors', '/investors']]],
              ['Resources', [['Research', '/research'], ['Developer API', '/developers'], ['Brand Kit', '/brand'], ['Find your type', '/quiz'], ['Privacy', '/privacy'], ['Terms', '/terms']]],
            ] as [string, [string, string][]][]).map(([col, links]) => (
              <div key={col}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', color: '#5a7488', marginBottom: 14 }}>{col.toUpperCase()}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {links.map(([l, h]) => (
                    <Link key={h} href={h} className="navlink" style={{ fontSize: 13, color: '#3a5566', textDecoration: 'none', fontWeight: 600 }}>{l}</Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,.05)', paddingTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 11.5, color: '#2a4050' }}>© {new Date().getFullYear()} YN Finance · ynfinance.org</div>
            <div style={{ fontSize: 11, color: '#2a4050' }}>Built by Neil Gilani &amp; Yannai Richter</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
