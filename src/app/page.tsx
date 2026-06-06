'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { YNMark } from '@/components/YNLogo'
import { Icon } from '@/components/Icons'
import SiteFooter from '@/components/SiteFooter'
import LiveTrackStat from '@/components/LiveTrackStat'

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
  { label: 'Stocks',       href: '/stock' },
  { label: 'Courses',      href: '/courses' },
  { label: 'Algorithms',   href: '/algorithms' },
  { label: 'Track Record', href: '/performance' },
]

// The three pillars — the only thing the landing really sells
const PILLARS = [
  { tag: '01 · ANALYZE', icon: 'analyze', href: '/ai-stocks', clr: '#00d4aa', title: 'AI Stock Analyzer', body: 'Type any ticker, get a full institutional read in ~15 seconds — rating, bull & bear targets, conviction, an options payoff diagram and key levels. 3 free, no card.', cta: 'Analyze a stock' },
  { tag: '02 · LEARN', icon: 'learn', href: '/courses', clr: '#1e90ff', title: 'Courses from 9 pros', body: 'Real strategy from world-class traders for $0.99 a course. Watch the method, then practice it instantly on live charts.', cta: 'Browse courses' },
  { tag: '03 · AUTOMATE', icon: 'automate', href: '/algorithms', clr: '#22c55e', title: 'Algorithms', body: 'The strategies the courses teach — turned into prop-grade bots with backtests, trailing exits and webhook autotrade. The course teaches it; the algo runs it for you.', cta: 'Get the algos' },
]

const TRUST = [
  { icon: 'pulse', clr: '#00d4aa', title: 'A public, verified track record', body: 'Every AI call is logged the moment it’s made — entry price, timestamp, live P/L. We don’t delete the losers. Judge the AI on its record, not our marketing.', href: '/performance', cta: 'View the track record' },
  { icon: 'shield', clr: '#1e90ff', title: 'Bank-grade security', body: 'Payments run through Stripe — we never see or store your card. Your data is encrypted in transit and at rest, and you can cancel in one click.' },
  { icon: 'trending', clr: '#a855f7', title: 'Real institutional data', body: 'Live quotes, fundamentals and filings via Finnhub — the same class of market data professional desks rely on. No made-up numbers.' },
]

const FAQ: [string, string][] = [
  ['Is YN Finance free?', 'Yes — start free with 3 full AI analyses every month, no card required. Unlimited access is $19/month, and individual courses are just $0.99.'],
  ['Is this financial advice?', 'No. YN Finance is an education and research platform. Our AI and tools give you data, structure and reasoning — every trading decision stays yours.'],
  ['How accurate is the AI?', 'We don’t ask you to take our word for it. Every call the AI makes is logged publicly with the entry price and timestamp, and scored on live prices. See the full track record.'],
  ['Where does the data come from?', 'Real-time quotes, fundamentals, analyst ratings and company news come from Finnhub. Charts are live. Nothing on the analyzer is mocked or hard-coded.'],
  ['Can I cancel anytime?', 'Yes — one click, no emails, no retention games. Billing is handled securely by Stripe.'],
  ['Who is behind YN Finance?', 'It’s built by Neil Gilani (CEO) and Yannai Richter (CTO) — the full platform, AI pipeline and data infrastructure, plus nine world-class instructors.'],
]

// Everything else still exists — just demoted to a quiet strip + the footer
const OTHERS = [
  { name: 'Intelligence Suite', href: '/intelligence', clr: '#ff2d78' },
  { name: 'Agent Network',      href: '/agents',       clr: '#a855f7' },
  { name: 'Daily Intel',        href: '/daily',        clr: '#f59e0b' },
  { name: 'Research',           href: '/research',     clr: '#eab308' },
  { name: 'YN Arena',           href: '/arena',        clr: '#ec4899' },
  { name: 'Track Record',       href: '/performance',  clr: '#00d4aa' },
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
        .trust-badge:hover { background:rgba(0,212,170,.14)!important; border-color:rgba(0,212,170,.45)!important }
        details.faq summary { list-style:none; cursor:pointer }
        details.faq summary::-webkit-details-marker { display:none }
        details.faq[open] .faq-plus { transform:rotate(45deg) }
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
          <Link href="/performance" className="trust-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.25)', borderRadius: 100, padding: '7px 18px', marginBottom: 30, fontSize: 11, color: '#00d4aa', fontWeight: 700, letterSpacing: '1px', textDecoration: 'none', transition: 'all .2s' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', animation: 'pulseDot 1.6s infinite' }} />
            EVERY AI CALL IS PUBLIC · SEE THE TRACK RECORD →
          </Link>

          <h1 style={{ fontSize: 'clamp(42px,7.5vw,88px)', fontWeight: 900, lineHeight: 0.96, letterSpacing: '-3px', color: '#eaf4fa', maxWidth: 920, margin: '0 auto' }}>
            Outtrade<br /><span className="grad">Wall Street.</span>
          </h1>

          <p style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: '#6a8497', lineHeight: 1.7, maxWidth: 580, margin: '26px auto 0' }}>
            {"AI-rate any stock in 15 seconds. Learn the strategy from 9 pro traders. Automate it with prop-grade algorithms. The edge Wall Street gatekeeps — free to start."}
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', marginTop: 40 }}>
            <Link href="/ai-stocks" className="btn-primary" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '16px 38px', borderRadius: 14, fontSize: 15.5, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 50px #00d4aa40, 0 16px 36px rgba(0,0,0,.45)', letterSpacing: '-.3px' }}>
              Try the AI Analyzer
            </Link>
            <Link href="/courses" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#dce8f0', padding: '16px 34px', borderRadius: 14, fontSize: 15, fontWeight: 700, textDecoration: 'none', backdropFilter: 'blur(10px)' }}>
              Browse the courses
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

      {/* THE THREE PILLARS — analyze · learn · automate */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(70px,10vw,120px) 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 52 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#00d4aa', marginBottom: 14 }}>HOW IT WORKS</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', maxWidth: 680, margin: '0 auto', lineHeight: 1.08 }}>
                Analyze it. Learn it. Automate it.
              </h2>
              <p style={{ fontSize: 15, color: '#6a8497', maxWidth: 520, margin: '16px auto 0', lineHeight: 1.7 }}>
                {"One loop: the AI finds the trade, the courses teach the strategy, and the algorithms run it for you."}
              </p>
            </div>
          </Reveal>

          <div className="grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {PILLARS.map((p, i) => (
              <Reveal key={p.tag} delay={i * 90}>
                <Link href={p.href} className="card" style={{
                  display: 'flex', flexDirection: 'column', height: '100%', textDecoration: 'none', borderRadius: 18, padding: '30px 26px',
                  background: `${p.clr}0a`, border: `1px solid ${p.clr}28`, backdropFilter: 'blur(12px)',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${p.clr}66`; e.currentTarget.style.background = `${p.clr}14` }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = `${p.clr}28`; e.currentTarget.style.background = `${p.clr}0a` }}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 13, marginBottom: 20, background: `${p.clr}16`, border: `1px solid ${p.clr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: p.clr }}>
                    <Icon name={p.icon} size={24} />
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', color: p.clr, marginBottom: 12 }}>{p.tag}</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#eaf4fa', lineHeight: 1.15, marginBottom: 12, letterSpacing: '-.5px' }}>{p.title}</div>
                  <div style={{ fontSize: 14, color: '#8aa0b2', lineHeight: 1.7, marginBottom: 22, flex: 1 }}>{p.body}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: p.clr }}>{p.cta} →</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ALSO INSIDE — everything else, demoted to a quiet strip */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(40px,6vw,70px) 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '3px', color: '#5a7488', marginBottom: 8 }}>ALSO INSIDE YN FINANCE</div>
              <p style={{ fontSize: 13.5, color: '#6a8497', maxWidth: 480, margin: '0 auto', lineHeight: 1.6 }}>
                {"Pro tools that come with the platform — the intelligence suite, live agent network and more."}
              </p>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 10 }}>
              {OTHERS.map(o => (
                <Link key={o.href} href={o.href} className="card" style={{
                  textDecoration: 'none', borderRadius: 100, padding: '10px 20px',
                  background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)',
                  display: 'flex', alignItems: 'center', gap: 9, fontSize: 13.5, fontWeight: 700, color: '#8aa0b2',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = `${o.clr}55`; e.currentTarget.style.color = '#dce8f0' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#8aa0b2' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: o.clr, boxShadow: `0 0 8px ${o.clr}` }} />
                  {o.name}
                </Link>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* TRUST — honest credibility, no fabricated social proof */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(60px,9vw,110px) 24px', background: 'linear-gradient(180deg, transparent, rgba(4,12,20,.55), transparent)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 50 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#00d4aa', marginBottom: 14 }}>WHY TRUST IT</div>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', maxWidth: 640, margin: '0 auto 22px', lineHeight: 1.08 }}>
                Built to be checked, not just believed.
              </h2>
              <LiveTrackStat />
            </div>
          </Reveal>
          <div className="grid3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }}>
            {TRUST.map((t, i) => (
              <Reveal key={t.title} delay={i * 90}>
                <div className="card" style={{ height: '100%', display: 'flex', flexDirection: 'column', borderRadius: 18, padding: '28px 26px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', backdropFilter: 'blur(12px)' }}>
                  <div style={{ width: 46, height: 46, borderRadius: 12, marginBottom: 18, background: `${t.clr}16`, border: `1px solid ${t.clr}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: t.clr }}>
                    <Icon name={t.icon} size={23} />
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#eaf4fa', marginBottom: 10, letterSpacing: '-.3px' }}>{t.title}</div>
                  <div style={{ fontSize: 13.5, color: '#6a8497', lineHeight: 1.7, flex: 1 }}>{t.body}</div>
                  {t.href && <Link href={t.href} style={{ marginTop: 16, fontSize: 13, fontWeight: 800, color: t.clr, textDecoration: 'none' }}>{t.cta} →</Link>}
                </div>
              </Reveal>
            ))}
          </div>
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

      {/* FAQ */}
      <section style={{ position: 'relative', zIndex: 1, padding: 'clamp(50px,8vw,90px) 24px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          <Reveal>
            <div style={{ textAlign: 'center', marginBottom: 40 }}>
              <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '3px', color: '#00d4aa', marginBottom: 14 }}>QUESTIONS</div>
              <h2 style={{ fontSize: 'clamp(26px,3.6vw,40px)', fontWeight: 900, letterSpacing: '-1.5px', color: '#eaf4fa', lineHeight: 1.1 }}>Everything you’d want to ask.</h2>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {FAQ.map(([q, ans]) => (
                <details key={q} className="faq card" style={{ borderRadius: 14, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.08)', padding: '0 22px' }}>
                  <summary style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, padding: '20px 0', fontSize: 15.5, fontWeight: 700, color: '#eaf4fa' }}>
                    {q}
                    <span className="faq-plus" style={{ flexShrink: 0, fontSize: 20, color: '#00d4aa', transition: 'transform .25s', lineHeight: 1 }}>+</span>
                  </summary>
                  <p style={{ fontSize: 14, color: '#6a8497', lineHeight: 1.75, padding: '0 0 22px', maxWidth: 640 }}>{ans}</p>
                </details>
              ))}
            </div>
          </Reveal>
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
      <SiteFooter />
    </div>
  )
}
