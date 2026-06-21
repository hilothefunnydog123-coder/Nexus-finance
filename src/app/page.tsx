'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Menu, X } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import WelcomeFunnel from '@/components/onboarding/WelcomeFunnel'
import AccountMenu from '@/components/auth/AccountMenu'
import ColdOpen from '@/components/cinematic/ColdOpen'

/* ════════════════════════════════════════════════════════════════════════
   YN FINANCE — cinematic editorial landing. Light "paper noir": bone stock,
   ink black, one electric accent, oversized kinetic type, scroll-driven.
   ════════════════════════════════════════════════════════════════════════ */

const INK = '#0a0a0c'
const BONE = '#f3f1ea'
const PAPER = '#fbfaf7'
const ACCENT = '#1f3bff' // electric cobalt — flat, saturated, used sparingly
const GREEN = '#0a9d63'
const RED = '#e5484d'
const LINE = 'rgba(10,10,12,.12)'

/* ── in-view hook ─────────────────────────────────────────────────────── */
function useInView<T extends HTMLElement>(amount = 0.2) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && (setSeen(true), io.disconnect()),
      { threshold: amount, rootMargin: '0px 0px -8% 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [amount])
  return { ref, seen }
}

/* ── scroll reveal ────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, y = 30, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .9s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

/* ── kinetic headline (per-word rise) ─────────────────────────────────── */
function Kinetic({ children, className, style, accentWords = [] }: { children: string; className?: string; style?: CSSProperties; accentWords?: number[] }) {
  const { ref, seen } = useInView<HTMLHeadingElement>(0.3)
  const words = children.split(' ')
  return (
    <h1 ref={ref} className={className} style={{ ...style, display: 'flex', flexWrap: 'wrap' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em', marginRight: '0.27em' }}>
          <span style={{ display: 'inline-block', color: accentWords.includes(i) ? ACCENT : undefined, transform: seen ? 'translateY(0)' : 'translateY(115%)', opacity: seen ? 1 : 0, transition: `transform 1s cubic-bezier(.16,1,.3,1) ${i * 65}ms, opacity 1s ease ${i * 65}ms` }}>
            {w}
          </span>
        </span>
      ))}
    </h1>
  )
}

/* ── count-up number ──────────────────────────────────────────────────── */
function CountUp({ to, decimals = 0, suffix = '', prefix = '' }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.5)
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    const t0 = performance.now()
    let raf = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400)
      setV(to * (1 - Math.pow(1 - p, 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return <span ref={ref}>{prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

/* ── magnetic button ──────────────────────────────────────────────────── */
function Magnetic({ children, href, className, style, strength = 0.4 }: { children: ReactNode; href: string; className?: string; style?: CSSProperties; strength?: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .3s cubic-bezier(.16,1,.3,1), box-shadow .3s', willChange: 'transform', ...style }}
      onMouseMove={(e) => {
        const el = ref.current!
        const r = el.getBoundingClientRect()
        el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)`
      }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = '' }}
    >
      {children}
    </Link>
  )
}

const NAV = [
  { label: 'BrainStock', href: '/brainstock' },
  { label: 'Enter the Net', href: '/brain/live' },
  { label: 'Analyzer', href: '/ai-stocks' },
  { label: 'War Room', href: '/war-room' },
  { label: 'Proof', href: '/proof' },
  { label: 'Labs', href: '/labs' },
  { label: 'Voice', href: '/copilot' },
  { label: 'Courses', href: '/courses' },
]

const TICKS = [
  ['NVDA', '+2.18%', true], ['SPY', '+0.41%', true], ['TSLA', '+1.74%', true], ['AAPL', '−0.32%', false],
  ['QQQ', '+0.66%', true], ['PLTR', '+3.04%', true], ['AMD', '−0.88%', false], ['MSFT', '+0.51%', true],
  ['META', '+1.12%', true], ['GOOGL', '+0.39%', true], ['AMZN', '−0.44%', false], ['BTC', '+1.20%', true],
] as const

const FRAMES = [
  { n: '01', tag: 'THE FORECASTER', title: 'BrainStock', line: 'A neural network forecasts ~300 stocks every market morning — then grades every call against real prices. A public, un-cherry-picked track record.', href: '/brainstock', cta: 'See today’s calls' },
  { n: '02', tag: 'THE READ', title: 'AI Analyzer', line: 'A 15-second institutional read on any ticker. Verdict, conviction, payoff math, in plain English. Drop a symbol, get the desk’s answer.', href: '/ai-stocks', cta: 'Analyze a stock' },
  { n: '03', tag: 'THE DEBATE', title: 'The War Room', line: 'Five AI analysts — a long PM, a short-seller, a quant, a risk officer and the CIO — argue your stock live, then the CIO rules.', href: '/war-room', cta: 'Convene the room' },
  { n: '04', tag: 'THE COPILOT', title: 'Voice', line: 'Talk to the market. Ask “what’s happening with Nvidia?” and the neural net answers out loud — with the chart and the news, live.', href: '/copilot', cta: 'Start talking' },
  { n: '05', tag: 'THE EDGE', title: 'Courses & Algorithms', line: 'Learn the edge from pro traders, then automate it — prop-grade strategies with ready-to-run code and one-click alerts.', href: '/courses', cta: 'Learn the edge' },
  { n: '06', tag: 'THE EXPERIENCE', title: 'Enter the Net', line: 'Fly inside the neural network as it forecasts your stock — the signal fires through every layer in real time, scored live with sound. Nothing in finance looks like this.', href: '/brain/live', cta: 'Enter the net' },
  { n: '07', tag: 'THE UNIVERSE', title: 'Market Galaxy', line: 'Every stock a star, clustered into sector constellations, sized by market cap and pulsing with today’s real move. Fly through it. Click a star to forecast it.', href: '/galaxy', cta: 'Explore the galaxy' },
  { n: '08', tag: 'THE STORM', title: 'Conviction Storm', line: 'A live particle field of the whole tape — bulls lift, bears sink, the strongest moves burn brightest. Turn the sound on and listen to the market breathe.', href: '/storm', cta: 'Enter the storm' },
  { n: '09', tag: 'THE VERDICT', title: 'War Room, Live', line: 'Five AI analysts argue your ticker out loud — a long PM, a short-seller, a quant, a risk officer — and the CIO rules. Spoken, not typed.', href: '/war-room/live', cta: 'Convene the room' },
  { n: '10', tag: 'THE OPEN', title: 'The Open', line: 'A self-running cinematic of the trading day: the net wakes, scans the market, slams down its top calls, and shows the public win rate. Built to be shared.', href: '/the-open', cta: 'Watch The Open' },
]

export default function Landing() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [stats, setStats] = useState<{ users?: number | null; forecasts?: number | null; gradedCalls?: number | null; winRate?: number | null; stocksDaily?: number | null; nnTrained?: number | null } | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Live, real platform numbers from Supabase — refreshed every 45s.
  useEffect(() => {
    const load = () => fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {})
    load()
    const id = setInterval(load, 45000)
    return () => clearInterval(id)
  }, [])

  const has = (n?: number | null) => n != null && n >= 0
  const proof = ([
    has(stats?.forecasts) && { v: <CountUp to={stats!.forecasts!} />, l: 'AI forecasts made' },
    has(stats?.winRate) && { v: <CountUp to={stats!.winRate!} decimals={1} suffix="%" />, l: 'graded win rate' },
    (stats?.gradedCalls ?? 0) > 0 && { v: <><CountUp to={stats!.gradedCalls!} />+</>, l: 'calls graded in public' },
    has(stats?.stocksDaily) && { v: <CountUp to={stats!.stocksDaily!} />, l: 'stocks scanned each morning' },
    has(stats?.users) && { v: <CountUp to={stats!.users!} />, l: 'members' },
    (stats?.nnTrained ?? 0) > 0 && { v: <CountUp to={stats!.nnTrained!} />, l: 'examples the net trained on' },
  ].filter(Boolean) as { v: ReactNode; l: string }[]).slice(0, 4)

  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <ColdOpen />
      <WelcomeFunnel />
      <style>{`
        @keyframes mq{to{transform:translateX(-50%)}}
        @keyframes grid-drift{to{background-position:48px 48px}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes float-y{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        .lk{position:relative}.lk::after{content:"";position:absolute;left:0;bottom:-3px;height:1.5px;width:0;background:${INK};transition:width .35s cubic-bezier(.16,1,.3,1)}.lk:hover::after{width:100%}
        .disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-0.045em;line-height:0.92}
        .frame-row:hover .frame-num{color:${ACCENT};transform:translateX(6px)}
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
      `}</style>

      {/* paper texture + faint drifting grid */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`, backgroundSize: '48px 48px', opacity: 0.5, animation: 'grid-drift 12s linear infinite', maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, #000 20%, transparent 75%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5, mixBlendMode: 'multiply', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.035%22/%3E%3C/svg%3E")' }} />

      {/* ─────────────── NAV ─────────────── */}
      <header style={{ position: 'fixed', top: 0, insetInline: 0, zIndex: 50, transition: 'all .4s', background: scrolled ? 'rgba(243,241,234,.82)' : 'transparent', backdropFilter: scrolled ? 'blur(14px)' : 'none', borderBottom: scrolled ? `1px solid ${LINE}` : '1px solid transparent' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 30, height: 30, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em' }}>YN</span>
            <span className="disp" style={{ fontSize: 18, fontWeight: 700 }}>FINANCE</span>
          </Link>
          <nav style={{ display: 'flex', gap: 30, alignItems: 'center' }} className="nav-desk">
            {NAV.map((l) => (
              <Link key={l.label} href={l.href} className="lk" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none' }}>{l.label}</Link>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }} className="nav-desk">
            <AccountMenu tone="light" />
            <Link href="/brainstock" style={{ fontSize: 14, fontWeight: 700, color: PAPER, background: INK, padding: '10px 20px', textDecoration: 'none' }}>Open app</Link>
          </div>
          <button onClick={() => setMenu(true)} className="nav-mob" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none' }} aria-label="Menu"><Menu /></button>
        </div>
        <style>{`@media(max-width:880px){.nav-desk{display:none!important}.nav-mob{display:block!important}}`}</style>
      </header>

      {/* mobile menu */}
      {menu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: BONE, padding: '20px clamp(18px,4vw,40px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
            <span className="disp" style={{ fontSize: 18 }}>FINANCE</span>
            <button onClick={() => setMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }} aria-label="Close"><X /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 50 }}>
            {NAV.map((l) => <Link key={l.label} href={l.href} onClick={() => setMenu(false)} className="disp" style={{ fontSize: 38, textDecoration: 'none', color: INK }}>{l.label}</Link>)}
            <Link href="/brainstock" onClick={() => setMenu(false)} style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: PAPER, background: INK, padding: '14px 22px', textAlign: 'center', textDecoration: 'none' }}>Open app</Link>
          </div>
        </div>
      )}

      {/* ─────────────── HERO ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' }}>
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 90, paddingBottom: 40 }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.28em', color: ACCENT, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'blink 1.4s infinite' }} />
              BRAINSTOCK · AI MARKET INTELLIGENCE
            </div>
          </Reveal>

          <Kinetic className="disp" accentWords={[6]} style={{ fontSize: 'clamp(2.8rem,8.5vw,7.2rem)', maxWidth: 1100 }}>
            An AI that calls the market. And proves it.
          </Kinetic>

          <Reveal delay={250} style={{ marginTop: 30, maxWidth: 620 }}>
            <p style={{ fontSize: 'clamp(1.05rem,1.7vw,1.35rem)', lineHeight: 1.55, color: 'rgba(10,10,12,.66)' }}>
              BrainStock forecasts <b style={{ color: INK }}>~300 stocks every morning</b>, then publishes whether it was right — a neural network building a <b style={{ color: INK }}>public, un-cherry-picked track record.</b> Plus a 15-second analyzer, an AI committee that debates any stock, and a market you can talk to.
            </p>
          </Reveal>

          <Reveal delay={400} style={{ marginTop: 38, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <Magnetic href="/brainstock" style={{ gap: 10, background: INK, color: PAPER, padding: '17px 30px', fontSize: 15, fontWeight: 700 }}>
              See today’s calls <ArrowUpRight size={18} />
            </Magnetic>
            <Link href="/demo" className="lk" style={{ fontSize: 15, fontWeight: 600, color: INK, textDecoration: 'none', padding: '17px 6px' }}>
              Watch the 30-second demo →
            </Link>
          </Reveal>

          {/* proof bar — live, real numbers from Supabase */}
          {proof.length > 0 && (
            <Reveal delay={550} style={{ marginTop: 64, borderTop: `1px solid ${LINE}`, paddingTop: 26, display: 'flex', flexWrap: 'wrap', gap: 'clamp(26px,6vw,68px)' }}>
              {proof.map((s, i) => (
                <div key={i}>
                  <div className="disp" style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', color: INK, fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,12,.5)', marginTop: 6 }}>{s.l}</div>
                </div>
              ))}
            </Reveal>
          )}
        </div>
      </section>

      {/* ─────────────── TICKER MARQUEE ─────────────── */}
      <div style={{ position: 'relative', zIndex: 1, borderBlock: `1px solid ${LINE}`, background: PAPER, overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)' }}>
        <div style={{ display: 'inline-flex', gap: 44, whiteSpace: 'nowrap', padding: '14px 22px', animation: 'mq 38s linear infinite', willChange: 'transform' }}>
          {[...TICKS, ...TICKS].map(([s, c, up], i) => (
            <span key={i} style={{ display: 'inline-flex', gap: 9, fontFamily: 'var(--font-mono)', fontSize: 14, alignItems: 'center' }}>
              <b style={{ color: INK }}>{s}</b>
              <span style={{ color: up ? GREEN : RED }}>{c}</span>
            </span>
          ))}
        </div>
      </div>

      {/* ─────────────── MANIFESTO ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1100, margin: '0 auto', padding: 'clamp(90px,16vw,200px) clamp(18px,4vw,40px)' }}>
        <Reveal>
          <div className="cine-index" style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 30 }}>// THE PROBLEM</div>
        </Reveal>
        <Kinetic className="disp" accentWords={[4, 5, 6, 7]} style={{ fontSize: 'clamp(1.9rem,5vw,4rem)', lineHeight: 1.04 }}>
          Every finance site shows you a prediction. None of them show you if it was right.
        </Kinetic>
        <Reveal delay={200} style={{ marginTop: 30, maxWidth: 600 }}>
          <p style={{ fontSize: 'clamp(1.05rem,1.6vw,1.3rem)', lineHeight: 1.6, color: 'rgba(10,10,12,.66)' }}>
            We do — every single day. BrainStock posts its calls, timestamps them, and grades itself against real closing prices. The track record builds itself, in the open. That’s the whole company: <b style={{ color: INK }}>an AI you can actually trust because it can’t hide.</b>
          </p>
        </Reveal>
      </section>

      {/* ─────────────── PRODUCT STORYBOARD ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, background: PAPER, borderTop: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' }}>
          <Reveal style={{ padding: 'clamp(60px,8vw,90px) 0 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT }}>// THE PLATFORM — FORECAST · ANALYZE · DEBATE · TALK · AUTOMATE</div>
          </Reveal>
          {FRAMES.map((f, i) => (
            <Reveal key={f.n}>
              <Link href={f.href} className="frame-row" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'clamp(16px,4vw,56px)', alignItems: 'center', padding: 'clamp(30px,4vw,46px) 0', borderTop: `1px solid ${LINE}`, textDecoration: 'none', color: INK }}>
                <div className="frame-num disp" style={{ fontSize: 'clamp(2.2rem,6vw,4.4rem)', color: 'rgba(10,10,12,.18)', transition: 'color .3s, transform .3s', minWidth: '1.6em' }}>{f.n}</div>
                <div style={{ maxWidth: 720 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', color: ACCENT, marginBottom: 10 }}>{f.tag}</div>
                  <div className="disp" style={{ fontSize: 'clamp(1.7rem,3.6vw,2.8rem)', marginBottom: 12 }}>{f.title}</div>
                  <p style={{ fontSize: 'clamp(1rem,1.4vw,1.15rem)', lineHeight: 1.55, color: 'rgba(10,10,12,.62)' }}>{f.line}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap' }} className="frame-cta">
                  {f.cta} <ArrowRight size={16} />
                </div>
              </Link>
            </Reveal>
          ))}
          <div style={{ height: 1, background: LINE }} />
        </div>
        <style>{`@media(max-width:760px){.frame-cta{display:none!important}}`}</style>
      </section>

      {/* ─────────────── HOW IT WORKS ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: 'clamp(90px,14vw,160px) clamp(18px,4vw,40px)' }}>
        <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, marginBottom: 14 }}>// THE FLYWHEEL</div></Reveal>
        <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(1.9rem,4.5vw,3.4rem)', marginBottom: 56, maxWidth: 800 }}>It gets smarter while you watch.</h2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 1, background: LINE, border: `1px solid ${LINE}` }}>
          {[
            ['Forecast', 'Every morning the neural net ranks ~300 stocks and posts its highest-conviction calls — publicly, timestamped.'],
            ['Grade', 'Five trading days later, each call is scored against the real close. Wins and losses, no cherry-picking.'],
            ['Compound', 'Every graded outcome trains the model. More users, more data, a track record a competitor can’t fast-forward.'],
          ].map(([t, d], i) => (
            <Reveal key={t} delay={i * 120} style={{ background: PAPER, padding: 'clamp(28px,3vw,40px)', minHeight: 230, display: 'flex', flexDirection: 'column' }}>
              <div className="disp" style={{ fontSize: 14, fontFamily: 'var(--font-mono)', color: ACCENT, marginBottom: 'auto' }}>0{i + 1}</div>
              <div className="disp" style={{ fontSize: 'clamp(1.5rem,2.6vw,2rem)', marginBottom: 12, marginTop: 24 }}>{t}</div>
              <p style={{ fontSize: 15, lineHeight: 1.55, color: 'rgba(10,10,12,.6)' }}>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ─────────────── FOUNDERS ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, background: INK, color: PAPER }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(80px,12vw,140px) clamp(18px,4vw,40px)' }}>
          <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: '#7da2ff', marginBottom: 18 }}>// THE FOUNDERS</div></Reveal>
          <Reveal delay={80}><h2 className="disp" style={{ fontSize: 'clamp(2rem,5vw,3.6rem)', maxWidth: 900, marginBottom: 14 }}>Built by two teenagers who got tired of losing edge to institutions.</h2></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24, marginTop: 50 }}>
            {[
              { i: 'NG', n: 'Neil Gilani', r: 'Co-founder · CEO', b: 'Built every line of YN Finance solo. Started at 11 with Discord bots; a gap scanner he wrote at 13 hit 40K upvotes overnight.', l: 'https://www.linkedin.com/in/neil-gilani-8863b7412/' },
              { i: 'YR', n: 'Yannai Richter', r: 'Co-founder · CTO', b: 'Paper-traded from 12. Cold-emailed Ross Cameron 47 times, then signed 9 world-class instructors on revenue share.', l: 'https://www.linkedin.com/in/yannai-richter-797a20344/' },
            ].map((f) => (
              <Reveal key={f.i} style={{ border: '1px solid rgba(255,255,255,.14)', padding: 28 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <span className="disp" style={{ width: 50, height: 50, border: '1px solid rgba(255,255,255,.25)', display: 'grid', placeItems: 'center', fontSize: 17 }}>{f.i}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{f.n}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.1em', color: '#7da2ff' }}>{f.r}</div>
                  </div>
                  <a href={f.l} target="_blank" rel="noopener noreferrer" aria-label={`${f.n} on LinkedIn`} style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', background: '#0a66c2', color: '#fff' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.22.79 24 1.77 24h20.45c.98 0 1.78-.78 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>
                  </a>
                </div>
                <p style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.62)' }}>{f.b}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────── CTA ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: 'clamp(100px,16vw,200px) clamp(18px,4vw,40px)', textAlign: 'center' }}>
        <Kinetic className="disp" accentWords={[3]} style={{ fontSize: 'clamp(2.4rem,8vw,6rem)', justifyContent: 'center' }}>
          Watch it earn it.
        </Kinetic>
        <Reveal delay={200} style={{ marginTop: 22 }}>
          <p style={{ fontSize: 'clamp(1.05rem,1.6vw,1.3rem)', color: 'rgba(10,10,12,.6)', maxWidth: 520, margin: '0 auto' }}>
            Three free AI analyses. $0.99 courses. No card to start. See the AI’s calls before it knows if it’s right.
          </p>
        </Reveal>
        <Reveal delay={350} style={{ marginTop: 40, display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Magnetic href="/brainstock" style={{ gap: 10, background: ACCENT, color: '#fff', padding: '18px 34px', fontSize: 16, fontWeight: 700 }}>
            See today’s calls <ArrowUpRight size={18} />
          </Magnetic>
          <Magnetic href="/ai-stocks" style={{ gap: 10, background: 'transparent', color: INK, padding: '18px 30px', fontSize: 16, fontWeight: 700, border: `1px solid ${INK}` }}>
            Analyze any stock
          </Magnetic>
        </Reveal>
      </section>

      <div style={{ position: 'relative', zIndex: 1 }}><SiteFooter /></div>
    </div>
  )
}
