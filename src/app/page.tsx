'use client'

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Sparkles, LineChart, GraduationCap, Bot, Menu, X, ArrowRight } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'

/* ---------- typewriter ---------- */
function useTypewriter(text: string, speed = 45, startDelay = 500) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  useEffect(() => {
    let i = 0
    let interval: ReturnType<typeof setInterval> | undefined
    const t = setTimeout(() => {
      interval = setInterval(() => {
        i++
        setDisplayed(text.slice(0, i))
        if (i >= text.length) {
          if (interval) clearInterval(interval)
          setDone(true)
        }
      }, speed)
    }, startDelay)
    return () => {
      clearTimeout(t)
      if (interval) clearInterval(interval)
    }
  }, [text, speed, startDelay])
  return { displayed, done }
}

/* ---------- scroll reveal ---------- */
function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const o = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setShown(true)
          o.disconnect()
        }
      },
      { threshold: 0.18 }
    )
    o.observe(el)
    return () => o.disconnect()
  }, [])
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .9s cubic-bezier(.16,1,.3,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

/* ---------- magnet (mouse-following dynamic) ---------- */
function Magnet({ children, padding = 130, strength = 3 }: { children: ReactNode; padding?: number; strength?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const [active, setActive] = useState(false)
  useEffect(() => {
    function onMove(e: MouseEvent) {
      const el = ref.current
      if (!el) return
      const r = el.getBoundingClientRect()
      const cx = r.left + r.width / 2
      const cy = r.top + r.height / 2
      const dx = e.clientX - cx
      const dy = e.clientY - cy
      if (Math.abs(dx) < r.width / 2 + padding && Math.abs(dy) < r.height / 2 + padding) {
        setActive(true)
        setPos({ x: dx / strength, y: dy / strength })
      } else {
        setActive(false)
        setPos({ x: 0, y: 0 })
      }
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [padding, strength])
  return (
    <div
      ref={ref}
      style={{
        transform: `translate3d(${pos.x}px, ${pos.y}px, 0)`,
        transition: active ? 'transform 0.3s ease-out' : 'transform 0.6s ease-in-out',
        willChange: 'transform',
      }}
    >
      {children}
    </div>
  )
}

/* ---------- soft animated candlesticks ---------- */
function Candles() {
  const W = 320
  const H = 250
  const candles = [
    { up: true, wickT: 160, wickB: 225, top: 175, bot: 215 },
    { up: false, wickT: 130, wickB: 195, top: 145, bot: 180 },
    { up: true, wickT: 100, wickB: 170, top: 115, bot: 158 },
    { up: true, wickT: 70, wickB: 140, top: 84, bot: 128 },
    { up: false, wickT: 88, wickB: 145, top: 100, bot: 132 },
    { up: true, wickT: 50, wickB: 118, top: 63, bot: 105 },
    { up: false, wickT: 62, wickB: 108, top: 72, bot: 98 },
    { up: true, wickT: 22, wickB: 92, top: 34, bot: 80 },
  ]
  const n = candles.length
  const slot = W / n
  const bodyW = slot * 0.5
  const up = '#34d399'
  const upGlow = 'rgba(52,211,153,.5)'
  const dn = '#fb7185'
  const dnGlow = 'rgba(251,113,133,.5)'
  return (
    <div style={{ position: 'relative', width: W, height: H, animation: 'cs-float 7s ease-in-out infinite' }}>
      <div
        style={{
          position: 'absolute',
          inset: -40,
          background: 'radial-gradient(circle at 60% 55%, rgba(52,211,153,.18), rgba(251,113,133,.14) 42%, transparent 72%)',
          filter: 'blur(22px)',
        }}
      />
      {candles.map((c, i) => {
        const x = i * slot + slot / 2
        const col = c.up ? up : dn
        const glow = c.up ? upGlow : dnGlow
        return (
          <Fragment key={i}>
            <div style={{ position: 'absolute', left: x - 1, top: c.wickT, width: 2, height: c.wickB - c.wickT, background: col, borderRadius: 2, opacity: 0.6 }} />
            <div
              style={{
                position: 'absolute',
                left: x - bodyW / 2,
                top: c.top,
                width: bodyW,
                height: c.bot - c.top,
                background: col,
                borderRadius: 6,
                boxShadow: `0 0 22px ${glow}`,
                transformOrigin: 'center bottom',
                animation: `cs-breathe ${3 + i * 0.12}s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          </Fragment>
        )
      })}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 12, height: 1, background: 'linear-gradient(90deg,transparent,rgba(124,58,237,.28),transparent)' }} />
    </div>
  )
}

const ACCENT = 'linear-gradient(110deg,#6366f1,#a855f7,#ec4899)'

const NAV = [
  { label: 'Analyzer', href: '/ai-stocks' },
  { label: 'Courses', href: '/courses' },
  { label: 'Algorithms', href: '/algorithms' },
  { label: 'Company', href: '/company' },
]

const PRODUCTS = [
  {
    id: 'analyze',
    label: 'Analyze a stock',
    title: 'AI Stock Analyzer',
    blurb: 'A 15-second institutional read on any ticker — verdict, conviction, payoff math, in plain English.',
    href: '/ai-stocks',
    cta: 'Open the Analyzer',
    icon: LineChart,
    grad: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
  },
  {
    id: 'learn',
    label: 'Learn to trade',
    title: 'Courses',
    blurb: 'Short, practical courses in the styles of pro traders — with quizzes and a built-in simulator.',
    href: '/courses',
    cta: 'Browse courses',
    icon: GraduationCap,
    grad: 'linear-gradient(135deg,#ec4899,#f97316)',
  },
  {
    id: 'automate',
    label: 'Automate a strategy',
    title: 'Algorithms',
    blurb: 'Prop-grade strategies with ready-to-run code and one-click TradingView alerts.',
    href: '/algorithms',
    cta: 'Get the algorithms',
    icon: Bot,
    grad: 'linear-gradient(135deg,#10b981,#06b6d4)',
  },
]

export default function Home() {
  const { displayed, done } = useTypewriter('Trade with an\nunfair advantage.', 48, 450)
  const [menu, setMenu] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const chosen = PRODUCTS.find((p) => p.id === sel)

  return (
    <div className="relative min-h-screen overflow-x-hidden font-sans text-[#16161f] antialiased" style={{ background: 'linear-gradient(155deg,#f1ecff 0%,#fdeef7 38%,#eaf3ff 70%,#eafff4 100%)' }}>
      <style>{`
        @keyframes ln-up{from{opacity:0;transform:translateY(26px)}to{opacity:1;transform:translateY(0)}}
        .ln-up{opacity:0;animation:ln-up .95s cubic-bezier(.16,1,.3,1) forwards}
        .ln-d1{animation-delay:.1s}.ln-d2{animation-delay:.24s}.ln-d3{animation-delay:.38s}.ln-d4{animation-delay:.52s}.ln-d5{animation-delay:.66s}
        @keyframes ln-blob{0%{transform:translate(0,0) scale(1)}33%{transform:translate(5%,-4%) scale(1.12)}66%{transform:translate(-4%,5%) scale(.93)}100%{transform:translate(0,0) scale(1)}}
        @keyframes ln-blink{0%,100%{opacity:1}50%{opacity:0}}
        .ln-cursor{animation:ln-blink 1s step-end infinite}
        @keyframes ln-pop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.18)}100%{transform:scale(1);opacity:1}}
        .ln-pop{animation:ln-pop .34s cubic-bezier(.34,1.56,.64,1) both}
        @keyframes ln-pan{to{background-position:200% center}}
        .ln-grad{background:linear-gradient(110deg,#6366f1,#a855f7,#ec4899,#6366f1);background-size:200% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:ln-pan 6s linear infinite}
        @keyframes cs-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes cs-breathe{0%,100%{transform:scaleY(1)}50%{transform:scaleY(1.07)}}
      `}</style>

      {/* ---------- soft animated colour mesh ---------- */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        {[
          { c: '#a5b4fc', x: '-8%', y: '-10%', s: 620, d: 22, delay: 0 },
          { c: '#f0abfc', x: '58%', y: '-14%', s: 680, d: 26, delay: 2 },
          { c: '#fbcfe8', x: '30%', y: '40%', s: 720, d: 30, delay: 1 },
          { c: '#a7f3d0', x: '-6%', y: '52%', s: 560, d: 24, delay: 3 },
          { c: '#bae6fd', x: '66%', y: '50%', s: 600, d: 28, delay: 1.5 },
          { c: '#fed7aa', x: '40%', y: '8%', s: 480, d: 20, delay: 2.5 },
        ].map((b, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: b.x,
              top: b.y,
              width: b.s,
              height: b.s,
              background: `radial-gradient(circle at center, ${b.c} 0%, transparent 68%)`,
              filter: 'blur(58px)',
              opacity: 0.78,
              animation: `ln-blob ${b.d}s ease-in-out ${b.delay}s infinite`,
            }}
          />
        ))}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,.12), transparent 28%, rgba(255,255,255,.4))' }} />
      </div>

      {/* ---------- nav ---------- */}
      <header className="fixed top-0 inset-x-0 z-30 px-5 sm:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 select-none">
          <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-white font-extrabold text-[13px]" style={{ background: ACCENT, boxShadow: '0 6px 20px rgba(139,92,246,.35)' }}>
            YN
          </span>
          <span className="text-[17px] font-semibold tracking-tight">YN&nbsp;Finance</span>
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-[15px] text-[#42424f]">
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} className="hover:text-[#16161f] transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          <Link href="/ai-stocks" className="text-[15px] text-[#42424f] hover:text-[#16161f] transition-colors">
            Sign in
          </Link>
          <Link
            href="/app"
            className="text-[14px] font-medium text-white rounded-full px-5 py-2.5 transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, boxShadow: '0 8px 24px rgba(139,92,246,.3)' }}
          >
            Open app
          </Link>
        </div>

        <button onClick={() => setMenu(true)} className="md:hidden w-10 h-10 -mr-2 flex items-center justify-center" aria-label="Menu">
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* mobile menu */}
      <div
        className={`fixed inset-0 z-40 bg-white/90 backdrop-blur-md transition-all duration-300 md:hidden ${menu ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <span className="text-[17px] font-semibold tracking-tight">YN Finance</span>
          <button onClick={() => setMenu(false)} aria-label="Close" className="w-10 h-10 flex items-center justify-center">
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="flex flex-col items-start gap-6 px-7 pt-10">
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} onClick={() => setMenu(false)} className="text-3xl font-medium tracking-tight">
              {l.label}
            </Link>
          ))}
          <Link href="/app" onClick={() => setMenu(false)} className="mt-4 text-base font-medium text-white rounded-full px-6 py-3" style={{ background: ACCENT }}>
            Open app
          </Link>
        </div>
      </div>

      {/* ---------- hero ---------- */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-36 pb-24 sm:pt-44 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:items-center">
        <div>
        <div className="ln-up ln-d1 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-black/[0.06] px-3.5 py-1.5 text-[13px] text-[#42424f] mb-8" style={{ boxShadow: '0 4px 16px rgba(99,102,241,.08)' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
          AI stock analysis · live for everyone
        </div>

        <h1 className="text-[clamp(2.6rem,7vw,5.2rem)] font-semibold tracking-[-0.03em] leading-[1.04] whitespace-pre-wrap select-none" style={{ minHeight: '2.2em' }}>
          {displayed.split('\n').map((line, i) => (
            <span key={i} className="block">
              {i === 1 ? <span className="ln-grad">{line}</span> : line}
            </span>
          ))}
          {!done && <span className="inline-block w-[3px] h-[0.95em] align-middle ml-1 ln-cursor" style={{ background: '#16161f' }} />}
        </h1>

        <p className="ln-up ln-d2 mt-7 max-w-xl text-[17px] sm:text-[19px] leading-relaxed text-[#55555f]">
          AI-rate any stock in 15 seconds. Learn the strategy from 9 pro traders. Automate it with prop-grade algorithms — all in one place.
        </p>

        <div className="ln-up ln-d3 mt-9 flex flex-wrap items-center gap-3">
          <Link
            href="/ai-stocks"
            className="group inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
            style={{ background: ACCENT, boxShadow: '0 12px 30px rgba(139,92,246,.32)' }}
          >
            Try the AI Analyzer
            <ArrowUpRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium text-[#16161f] bg-white/70 backdrop-blur border border-black/[0.07] hover:bg-white transition-colors"
          >
            Browse the courses
          </Link>
          <span className="text-[13px] text-[#86868f] ml-1">3 free analyses · $0.99 courses · no card to start</span>
        </div>

        {/* interactive product picker */}
        <div className="ln-up ln-d4 mt-16 max-w-2xl">
          <div className="text-[15px] font-medium text-[#42424f] mb-3">What do you want to do first?</div>
          <div className="flex flex-wrap gap-2.5">
            {PRODUCTS.map((p) => {
              const active = sel === p.id
              return (
                <button
                  key={p.id}
                  onClick={() => setSel(active ? null : p.id)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[14px] font-medium transition-all duration-200"
                  style={
                    active
                      ? { background: ACCENT, color: '#fff', boxShadow: '0 8px 22px rgba(139,92,246,.3)', transform: 'translateY(-1px)' }
                      : { background: 'rgba(255,255,255,.7)', color: '#16161f', border: '1px solid rgba(0,0,0,.07)', backdropFilter: 'blur(6px)' }
                  }
                >
                  {active && <Check className="w-4 h-4 ln-pop" />}
                  {p.label}
                </button>
              )
            })}
          </div>

          <div className="mt-4">
            {!chosen ? (
              <div className="text-[13px] italic text-[#a0a0a8]">Pick one to get started.</div>
            ) : (
              <div className="flex items-center justify-between gap-4 rounded-2xl bg-white/70 backdrop-blur border border-black/[0.06] px-5 py-4" style={{ boxShadow: '0 10px 30px rgba(99,102,241,.1)' }}>
                <div className="min-w-0">
                  <div className="text-[12px] uppercase tracking-wider text-[#9a9aa4]">Let&apos;s go</div>
                  <div className="text-[15px] font-medium truncate">{chosen.title}</div>
                </div>
                <Link
                  href={chosen.href}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-[13px] font-semibold text-white"
                  style={{ background: ACCENT }}
                >
                  {chosen.cta}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}
          </div>
        </div>
        </div>

        <div className="ln-up ln-d3 mt-16 lg:mt-0 flex justify-center lg:justify-end">
          <Magnet padding={150} strength={3}>
            <Candles />
          </Magnet>
        </div>
      </main>

      {/* ---------- products ---------- */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <Reveal>
          <div className="text-[13px] uppercase tracking-[0.2em] text-[#9a9aa4] mb-3">Analyze · Learn · Automate</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.02em] leading-tight max-w-2xl">
            One platform for the whole trade — from idea to execution.
          </h2>
        </Reveal>

        <div className="grid md:grid-cols-3 gap-5 mt-12">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.id} delay={i * 90}>
              <Link
                href={p.href}
                className="group block h-full rounded-3xl bg-white/65 backdrop-blur border border-black/[0.06] p-7 transition-all duration-300 hover:-translate-y-1.5"
                style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 22px 50px rgba(99,102,241,.16)')}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 10px 40px rgba(80,80,120,.06)')}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white mb-6" style={{ background: p.grad }}>
                  <p.icon className="w-6 h-6" />
                </div>
                <div className="text-[19px] font-semibold tracking-tight mb-2">{p.title}</div>
                <p className="text-[15px] leading-relaxed text-[#5e5e68]">{p.blurb}</p>
                <div className="mt-6 inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: '#7c3aed' }}>
                  {p.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </Reveal>
          ))}
        </div>

        {/* trust strip */}
        <Reveal delay={120}>
          <div className="mt-16 rounded-3xl bg-white/65 backdrop-blur border border-black/[0.06] px-8 py-10 flex flex-wrap items-center justify-between gap-8" style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}>
            {[
              ['Public', 'AI track record — every call logged'],
              ['Real', 'institutional data, not mock numbers'],
              ['$0', 'to start — 3 free AI analyses'],
            ].map(([a, b]) => (
              <div key={b} className="min-w-[160px]">
                <div className="text-[28px] font-semibold tracking-tight ln-grad inline-block">{a}</div>
                <div className="text-[14px] text-[#6a6a74] mt-1">{b}</div>
              </div>
            ))}
            <Link
              href="/app"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT, boxShadow: '0 12px 30px rgba(139,92,246,.3)' }}
            >
              Open the app
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      <SiteFooter />
    </div>
  )
}
