'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowRight, Menu, X } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import AccountMenu from '@/components/auth/AccountMenu'

/* ════════════════════════════════════════════════════════════════════════
   YN FINANCE — landing. Clean, professional, single narrative.
   Light "paper" stock, ink black, one electric accent. Restrained motion.
   ════════════════════════════════════════════════════════════════════════ */

const INK = '#0a0a0c'
const BONE = '#f4f2ec'
const PAPER = '#fcfbf8'
const ACCENT = '#1f3bff'
const GREEN = '#0a9d63'
const SUB = 'rgba(10,10,12,.62)'
const LINE = 'rgba(10,10,12,.1)'

const NAV = [
  { label: 'BrainStock', href: '/brainstock' },
  { label: 'Algorithms', href: '/algorithms' },
  { label: 'YN Edge', href: '/edge' },
  { label: 'Proof', href: '/proof' },
  { label: 'For Everyone', href: '/everyone' },
]

const PRODUCTS = [
  { t: 'BrainStock', d: 'A neural network forecasts hundreds of stocks every morning — then grades every call against real prices, in public.', href: '/brainstock', tag: 'The forecaster' },
  { t: 'Algorithms', d: 'Research-grade, real-money-proven trading algorithms you paste straight into TradingView and run.', href: '/algorithms', tag: 'Real-money proven' },
  { t: 'YN Edge', d: 'The net prices every Kalshi prediction market against the market itself — and surfaces the bets actually worth taking.', href: '/edge', tag: 'Find the edge' },
  { t: 'AI Analyzer', d: 'A 15-second institutional read on any ticker — verdict, conviction, and the payoff math, in plain English.', href: '/ai-stocks', tag: 'The read' },
  { t: 'Proof', d: 'The live track record: win rate, calibration, and every graded call — un-cherry-picked.', href: '/proof', tag: 'The receipts' },
  { t: 'Copilot', d: 'A real AI agent that runs your TradingView chart with you — draws levels, writes and tests indicators.', href: '/copilot/desktop', tag: 'The agent' },
  { t: 'For Everyone', d: 'The same AI, pointed at the prices normal people sweat — mortgage rates, gas, flights, power.', href: '/everyone', tag: 'Beyond trading' },
]

const PILLARS = [
  { t: 'Published', d: 'Every forecast is posted and timestamped the moment it’s made — before the outcome exists.' },
  { t: 'Graded', d: 'Each call is scored against real closing prices. The track record builds itself, in the open.' },
  { t: 'Un-cherry-picked', d: 'We show the misses too. The whole point is an AI you can trust because it can’t hide.' },
]

export default function Landing() {
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [stats, setStats] = useState<{ forecasts?: number | null; winRate?: number | null; users?: number | null; gradedCalls?: number | null } | null>(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 16)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats).catch(() => {})
  }, [])

  const has = (n?: number | null) => n != null && n >= 0
  const proof = ([
    has(stats?.forecasts) && { v: <CountUp to={stats!.forecasts!} />, l: 'forecasts made' },
    has(stats?.winRate) && { v: <CountUp to={stats!.winRate!} decimals={1} suffix="%" />, l: 'graded win rate' },
    (stats?.gradedCalls ?? 0) > 0 && { v: <CountUp to={stats!.gradedCalls!} suffix="+" />, l: 'calls graded in public' },
    has(stats?.users) && { v: <CountUp to={stats!.users!} />, l: 'live users' },
  ].filter(Boolean) as { v: ReactNode; l: string }[]).slice(0, 4)

  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes ynblink{0%,100%{opacity:1}50%{opacity:.25}}
        .yn-disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-.04em;line-height:.98}
        .yn-lk{position:relative}.yn-lk::after{content:"";position:absolute;left:0;bottom:-3px;height:1.5px;width:0;background:${INK};transition:width .3s ease}.yn-lk:hover::after{width:100%}
        .yn-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
        .yn-card:hover{transform:translateY(-3px);border-color:rgba(31,59,255,.4);box-shadow:0 18px 40px rgba(10,10,12,.07)}
        .yn-cta{transition:transform .15s ease, box-shadow .2s ease}.yn-cta:hover{transform:translateY(-2px)}
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
        @media(max-width:820px){.yn-desknav{display:none!important}.yn-mobtn{display:flex!important}.yn-prodgrid{grid-template-columns:1fr!important}}
      `}</style>

      {/* ── header ── */}
      <header style={{ position: 'fixed', top: 0, insetInline: 0, zIndex: 50, transition: 'all .3s', background: scrolled ? 'rgba(244,242,236,.85)' : 'transparent', backdropFilter: scrolled ? 'blur(12px)' : 'none', borderBottom: `1px solid ${scrolled ? LINE : 'transparent'}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(18px,4vw,34px)', height: 66, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 30, height: 30, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderRadius: 7 }}>YN</span>
            <span className="yn-disp" style={{ fontSize: 18 }}>FINANCE</span>
          </Link>
          <nav className="yn-desknav" style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
            {NAV.map((l) => <Link key={l.label} href={l.href} className="yn-lk" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none' }}>{l.label}</Link>)}
          </nav>
          <div className="yn-desknav" style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <AccountMenu tone="light" />
            <Link href="/brainstock" style={{ fontSize: 14, fontWeight: 700, color: PAPER, background: INK, padding: '10px 18px', borderRadius: 8, textDecoration: 'none' }}>Open app</Link>
          </div>
          <button className="yn-mobtn" onClick={() => setMenu(true)} aria-label="Menu" style={{ display: 'none', background: 'none', border: 'none', cursor: 'pointer' }}><Menu /></button>
        </div>
      </header>

      {menu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: BONE, padding: '20px clamp(18px,4vw,34px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 46 }}>
            <span className="yn-disp" style={{ fontSize: 18 }}>FINANCE</span>
            <button onClick={() => setMenu(false)} aria-label="Close" style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18, marginTop: 44 }}>
            {NAV.map((l) => <Link key={l.label} href={l.href} onClick={() => setMenu(false)} className="yn-disp" style={{ fontSize: 34, textDecoration: 'none', color: INK }}>{l.label}</Link>)}
            <Link href="/brainstock" onClick={() => setMenu(false)} style={{ marginTop: 14, fontSize: 16, fontWeight: 700, color: PAPER, background: INK, padding: '14px 20px', textAlign: 'center', textDecoration: 'none', borderRadius: 8 }}>Open app</Link>
          </div>
        </div>
      )}

      {/* ── hero ── */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(18px,4vw,34px)' }}>
        <div style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 110, paddingBottom: 56 }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 11, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.24em', color: ACCENT, marginBottom: 26 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'ynblink 1.5s infinite' }} /> AI MARKET INTELLIGENCE
            </div>
          </Reveal>
          <Reveal delay={80}>
            <h1 className="yn-disp" style={{ fontSize: 'clamp(2.6rem,7.4vw,6rem)', maxWidth: 980, margin: 0 }}>
              An AI that calls the market —<br /><span style={{ color: ACCENT }}>and proves it.</span>
            </h1>
          </Reveal>
          <Reveal delay={180}>
            <p style={{ fontSize: 'clamp(1.05rem,1.7vw,1.3rem)', lineHeight: 1.55, color: SUB, maxWidth: 600, marginTop: 26 }}>
              BrainStock forecasts hundreds of stocks every morning, then grades every call against real prices — a neural network building a <b style={{ color: INK }}>public, un-cherry-picked track record.</b>
            </p>
          </Reveal>
          <Reveal delay={280}>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', marginTop: 34 }}>
              <Link href="/brainstock" className="yn-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: INK, color: PAPER, padding: '15px 26px', fontSize: 15, fontWeight: 700, borderRadius: 9, textDecoration: 'none', boxShadow: '0 10px 30px rgba(10,10,12,.12)' }}>See today’s calls <ArrowRight size={17} /></Link>
              <Link href="/proof" className="yn-lk" style={{ fontSize: 15, fontWeight: 600, color: INK, textDecoration: 'none', padding: '15px 4px' }}>See the track record →</Link>
            </div>
          </Reveal>

          {proof.length > 0 && (
            <Reveal delay={400}>
              <div style={{ marginTop: 64, borderTop: `1px solid ${LINE}`, paddingTop: 26, display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,6vw,64px)' }}>
                {proof.map((s, i) => (
                  <div key={i}>
                    <div className="yn-disp" style={{ fontSize: 'clamp(1.9rem,3.6vw,2.8rem)', fontVariantNumeric: 'tabular-nums' }}>{s.v}</div>
                    <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: SUB, marginTop: 6 }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </section>

      {/* ── what it is ── */}
      <section style={{ background: PAPER, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(64px,9vw,110px) clamp(18px,4vw,34px)' }}>
          <Reveal>
            <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.18em', color: ACCENT, marginBottom: 16 }}>// THE PLATFORM</div>
            <h2 className="yn-disp" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', maxWidth: 760, margin: '0 0 14px' }}>One forecasting engine. A suite built on top of it.</h2>
            <p style={{ fontSize: '1.1rem', color: SUB, maxWidth: 560, lineHeight: 1.55 }}>Everything points back to the same accountable neural net — for traders, and for everyone.</p>
          </Reveal>
          <div className="yn-prodgrid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 44 }}>
            {PRODUCTS.map((p, i) => (
              <Reveal key={p.t} delay={(i % 3) * 70}>
                <Link href={p.href} style={{ textDecoration: 'none', color: INK, display: 'block', height: '100%' }}>
                  <div className="yn-card" style={{ height: '100%', background: BONE, border: `1px solid ${LINE}`, borderRadius: 14, padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 12 }}>{p.tag}</div>
                    <div className="yn-disp" style={{ fontSize: '1.5rem', marginBottom: 9 }}>{p.t}</div>
                    <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.55, flex: 1 }}>{p.d}</div>
                    <div style={{ marginTop: 16, fontSize: 13, fontWeight: 700, color: INK, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Open <ArrowRight size={14} /></div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── why it's different ── */}
      <section style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(64px,9vw,110px) clamp(18px,4vw,34px)' }}>
        <Reveal>
          <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.18em', color: ACCENT, marginBottom: 16 }}>// WHY IT’S DIFFERENT</div>
          <h2 className="yn-disp" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', maxWidth: 800, margin: '0 0 12px' }}>Every finance site shows a prediction. We show whether it was right.</h2>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 22, marginTop: 40 }}>
          {PILLARS.map((p, i) => (
            <Reveal key={p.t} delay={i * 90}>
              <div style={{ borderTop: `2px solid ${ACCENT}`, paddingTop: 18 }}>
                <div className="yn-disp" style={{ fontSize: '1.6rem', marginBottom: 9 }}>{p.t}</div>
                <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6 }}>{p.d}</div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background: INK, color: PAPER }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(60px,8vw,96px) clamp(18px,4vw,34px)', textAlign: 'center' }}>
          <Reveal>
            <h2 className="yn-disp" style={{ fontSize: 'clamp(2rem,5vw,3.6rem)', margin: '0 auto 18px', maxWidth: 680 }}>See what the net is calling today.</h2>
            <p style={{ fontSize: '1.1rem', color: 'rgba(255,255,255,.62)', maxWidth: 480, margin: '0 auto 30px' }}>Free to start. Every forecast graded in public.</p>
            <Link href="/brainstock" className="yn-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: PAPER, color: INK, padding: '16px 30px', fontSize: 16, fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}>Open BrainStock <ArrowRight size={18} /></Link>
          </Reveal>
        </div>
      </section>

      <SiteFooter />
    </div>
  )
}

/* ── helpers ── */
function useInView<T extends HTMLElement>(amount = 0.18) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: amount, rootMargin: '0px 0px -8% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [amount])
  return { ref, seen }
}

function Reveal({ children, delay = 0, y = 22, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms`, ...style }}>{children}</div>
  )
}

function CountUp({ to, decimals = 0, suffix = '', prefix = '' }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!seen) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    let raf = 0, t0 = 0
    const tick = (t: number) => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / 1100); setN(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return <span ref={ref}>{prefix}{n.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}
