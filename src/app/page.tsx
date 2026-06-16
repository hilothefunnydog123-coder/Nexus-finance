'use client'

import { useEffect, useRef, useState, Fragment, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Check, Sparkles, LineChart, GraduationCap, Bot, Menu, X, ArrowRight, Brain, Play } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import { useAuth } from '@/hooks/useAuth'

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

const TICKERS = [
  { s: 'SPY', p: '539.18', up: true, c: '0.41%' },
  { s: 'QQQ', p: '472.30', up: true, c: '0.66%' },
  { s: 'NVDA', p: '131.74', up: true, c: '2.18%' },
  { s: 'AAPL', p: '214.05', up: false, c: '0.32%' },
  { s: 'TSLA', p: '248.90', up: true, c: '1.74%' },
  { s: 'BTC', p: '71,420', up: false, c: '1.12%' },
  { s: 'ETH', p: '3,884', up: true, c: '0.88%' },
  { s: 'ES', p: '5,402.5', up: true, c: '0.38%' },
  { s: 'NQ', p: '19,180', up: true, c: '0.71%' },
  { s: 'GC', p: '2,388', up: false, c: '0.22%' },
]

const NAV = [
  { label: 'Analyzer', href: '/ai-stocks' },
  { label: 'BrainStock', href: '/brainstock' },
  { label: 'Beat the AI', href: '/predict' },
  { label: 'Courses', href: '/courses' },
  { label: 'Algorithms', href: '/algorithms' },
  { label: 'Company', href: '/company' },
]

const PRODUCTS = [
  {
    id: 'forecast',
    label: 'Forecast a price',
    title: 'BrainStock',
    blurb: 'Our neural net forecasts ~300 stocks every morning, ranks the top calls with price targets, and grades itself against real prices.',
    href: '/brainstock',
    cta: 'See the forecasts',
    icon: Brain,
    grad: 'linear-gradient(135deg,#06b6d4,#a855f7)',
  },
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

function fmtNum(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'k'
  return String(n)
}

function StatsStrip() {
  const [s, setS] = useState<{ users: number | null; signals: number | null } | null>(null)
  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then(setS)
      .catch(() => {})
  }, [])
  const cells: [string, string][] = []
  if (s?.users) cells.push([fmtNum(s.users), 'traders on board'])
  if (s?.signals) cells.push([fmtNum(s.signals), 'AI signals generated'])
  cells.push(['9', 'autonomous AI agents'])
  cells.push(['32', 'instruments tracked live'])
  cells.push(['9', 'pro-trader courses'])
  cells.push(['5', 'algorithmic strategies'])
  const show = cells.slice(0, 4)
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-12">
      <Reveal>
        <div className="rounded-3xl bg-white/65 backdrop-blur border border-black/[0.06] px-6 py-7 sm:px-10" style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}>
          <div className="flex items-center gap-2 mb-5 text-[12px] uppercase tracking-[0.18em] text-[#8a8a94]">
            <span className="inline-block w-2 h-2 rounded-full ln-cursor" style={{ background: '#10b981', boxShadow: '0 0 8px #10b981' }} />
            Live on ynfinance.org
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6 gap-x-4">
            {show.map(([v, l]) => (
              <div key={l}>
                <div className="text-[clamp(1.7rem,3.4vw,2.4rem)] font-semibold tracking-tight ln-grad inline-block">{v}</div>
                <div className="text-[13.5px] text-[#5e5e68] mt-1 leading-snug">{l}</div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  )
}

type BoardPick = {
  rank: number
  ticker: string
  price: number
  target: number
  pct: number
  target5: number
  pct5: number
  dirAcc: number
  skill: number
}

function EmailSignup() {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const submit = async (e: { preventDefault: () => void }) => {
    e.preventDefault()
    if (!email.trim()) return
    setState('loading')
    try {
      const r = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
      setState(r.ok ? 'done' : 'error')
    } catch {
      setState('error')
    }
  }
  return (
    <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
      <Reveal>
        <div className="rounded-3xl px-8 py-10 sm:px-12 text-center" style={{ background: 'linear-gradient(135deg,#0b1020,#11163a)', boxShadow: '0 24px 70px rgba(40,40,80,.28)' }}>
          <h2 className="text-[clamp(1.6rem,3.4vw,2.3rem)] font-semibold tracking-[-0.02em] text-white">Get the AI Bull Board every morning.</h2>
          <p className="mt-3 text-[15px] text-white/60 max-w-md mx-auto">One email before the open with the day&apos;s top AI calls and targets. Free, no spam, unsubscribe anytime.</p>
          {state === 'done' ? (
            <div className="mt-7 text-[16px] font-medium" style={{ color: '#34d399' }}>You&apos;re in — check your inbox tomorrow morning. ✦</div>
          ) : (
            <form onSubmit={submit} className="mt-7 flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="flex-1 rounded-full px-5 py-3.5 text-[15px] outline-none"
                style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.14)', color: '#fff' }}
              />
              <button type="submit" disabled={state === 'loading'} className="rounded-full px-6 py-3.5 text-[15px] font-semibold text-white" style={{ background: 'linear-gradient(135deg,#06b6d4,#a855f7)' }}>
                {state === 'loading' ? 'Joining…' : 'Get the board'}
              </button>
            </form>
          )}
          {state === 'error' && <div className="mt-3 text-[13px]" style={{ color: '#f87171' }}>Something went wrong — try again.</div>}
        </div>
      </Reveal>
    </section>
  )
}

function DailyBoard() {
  const [data, setData] = useState<{ date: string | null; generatedAt: string | null; picks: BoardPick[]; bears: BoardPick[] } | null>(null)
  const [view, setView] = useState<'bull' | 'bear'>('bull')
  useEffect(() => {
    fetch('/api/daily-picks')
      .then((r) => r.json())
      .then(setData)
      .catch(() => {})
  }, [])
  const bull = view === 'bull'
  const picks = (bull ? data?.picks : data?.bears) ?? []
  return (
    <section id="board" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 scroll-mt-24">
      <Reveal>
        <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.2em] text-[#9a9aa4] mb-3">
          <span className="inline-block w-2 h-2 rounded-full ln-cursor" style={{ background: bull ? '#16a34a' : '#dc2626', boxShadow: `0 0 8px ${bull ? '#16a34a' : '#dc2626'}` }} />
          AI {bull ? 'Bull' : 'Bear'} Board
        </div>
        <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.02em] leading-tight max-w-2xl">
          This morning&apos;s top 15 AI {bull ? 'bull' : 'bear'} calls.
        </h2>
        <p className="mt-3 text-[16px] text-[#5e5e68] max-w-xl">
          Every market morning we run ~300 stocks through our BrainStock forecaster and rank the most {bull ? 'bullish' : 'bearish'} for the session — with a price target on each. Regenerated before the open.
          {data?.date && <span className="text-[#9a9aa4]"> · Updated {data.date}</span>}
        </p>
        <div className="mt-5 flex items-center gap-3 flex-wrap">
          <div className="inline-flex rounded-full bg-white/60 backdrop-blur border border-black/[0.06] p-1">
            <button onClick={() => setView('bull')} className="px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors" style={bull ? { background: '#16a34a', color: '#fff' } : { color: '#5e5e68' }}>Bulls</button>
            <button onClick={() => setView('bear')} className="px-4 py-1.5 rounded-full text-[14px] font-medium transition-colors" style={!bull ? { background: '#dc2626', color: '#fff' } : { color: '#5e5e68' }}>Bears</button>
          </div>
          <Link href="/brainstock/track-record" className="text-[14px] font-medium" style={{ color: '#7c3aed' }}>See the track record →</Link>
        </div>
      </Reveal>

      {picks.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {picks.map((p, i) => (
            <Reveal key={p.ticker} delay={i * 40}>
              <Link
                href={`/forecast/${p.ticker}`}
                className="group block h-full rounded-2xl bg-white/65 backdrop-blur border border-black/[0.06] p-5 transition-all duration-300 hover:-translate-y-1"
                style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12px] font-semibold text-[#9a9aa4] tabular-nums">#{p.rank}</span>
                    <span className="text-[18px] font-semibold tracking-tight">{p.ticker}</span>
                  </div>
                  <span className="text-[15px] font-semibold tabular-nums" style={{ color: bull ? '#16a34a' : '#dc2626' }}>{bull ? '▲' : '▼'} {Math.abs(p.pct).toFixed(2)}%</span>
                </div>
                <div className="mt-3 text-[14px] text-[#5e5e68] tabular-nums">
                  ${p.price.toFixed(2)} <span className="text-[#b8b8c0]">→</span> <b className="text-[#16161f]">${p.target.toFixed(2)}</b>
                  <span className="text-[#9a9aa4]"> session target</span>
                </div>
                <div className="mt-1 text-[12px] text-[#9a9aa4] tabular-nums">
                  5-day ${p.target5.toFixed(2)} ({p.pct5 >= 0 ? '+' : ''}{p.pct5.toFixed(1)}%) · {Math.round(p.dirAcc * 100)}% dir. accuracy
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl bg-white/55 backdrop-blur border border-black/[0.06] px-8 py-12 text-center" style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}>
          <div className="text-[17px] font-semibold text-[#16161f]">The board posts every market morning.</div>
          <div className="text-[14px] text-[#6a6a74] mt-2">Check back around the open — ~300 stocks get ranked by the AI for the session ahead.</div>
        </div>
      )}
      <p className="mt-6 text-[12px] text-[#9a9aa4] max-w-2xl">
        Model estimates ranked by predicted next-session move, filtered to names where the model beats a naive baseline in backtest. Not financial advice.
      </p>
    </section>
  )
}

function HeroBoard() {
  const [data, setData] = useState<{ picks: BoardPick[]; date: string | null } | null>(null)
  useEffect(() => {
    fetch('/api/daily-picks')
      .then((r) => r.json())
      .then((d) => setData({ picks: d.picks || [], date: d.date }))
      .catch(() => {})
  }, [])
  const top = (data?.picks ?? []).slice(0, 6)
  return (
    <div
      className="w-full max-w-sm rounded-[26px] p-[1.5px]"
      style={{
        background: 'linear-gradient(155deg, rgba(34,211,238,.55), rgba(168,85,247,.5) 55%, rgba(20,24,55,.4))',
        boxShadow: '0 30px 80px rgba(70,45,140,.4)',
      }}
    >
      <div className="rounded-[24px] overflow-hidden relative" style={{ background: 'linear-gradient(165deg,#0a0f20,#0e1330 55%,#15193c)' }}>
        <div
          className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(360px 170px at 82% -8%, rgba(34,211,238,.26), transparent 60%), radial-gradient(320px 200px at 0% 112%, rgba(168,85,247,.24), transparent 60%)' }}
        />

        {/* header */}
        <div className="relative flex items-center justify-between px-5 pt-4 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="w-7 h-7 rounded-xl grid place-items-center" style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)', boxShadow: '0 4px 14px rgba(34,211,238,.4)' }}>
              <Brain className="w-3.5 h-3.5" style={{ color: '#0a0f20' }} />
            </span>
            <div className="leading-tight">
              <div className="text-[13.5px] font-semibold text-white tracking-tight flex items-center gap-1.5">
                AI Bull Board
                <span className="inline-block w-1.5 h-1.5 rounded-full ln-cursor" style={{ background: '#22c55e', boxShadow: '0 0 8px #22c55e' }} />
              </div>
              <div className="text-[10px] text-white/45">BrainStock · {data?.date ?? 'every market morning'}</div>
            </div>
          </div>
          <span className="text-[9.5px] font-bold tracking-wide px-2 py-1 rounded-full" style={{ background: 'rgba(34,197,94,.16)', color: '#34d399' }}>LIVE</span>
        </div>

        {/* rows */}
        {top.length > 0 ? (
          <div className="relative px-2 pb-1">
            {top.map((p) => (
              <Link key={p.ticker} href={`/forecast/${p.ticker}`} className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/[0.06] transition-colors">
                <span className="text-[10px] text-white/30 w-3 tabular-nums">{p.rank}</span>
                <span className="text-[14px] font-semibold text-white w-12">{p.ticker}</span>
                <span className="text-[11px] text-white/40 tabular-nums flex-1">→ ${p.target.toFixed(2)}</span>
                <span className="text-[12px] font-bold tabular-nums px-2 py-0.5 rounded-md" style={{ background: 'rgba(52,211,153,.14)', color: '#34d399' }}>▲ {p.pct.toFixed(2)}%</span>
              </Link>
            ))}
          </div>
        ) : (
          <div className="relative px-5 py-9 text-center">
            <div className="text-[13px] text-white/75 font-medium">Posts every market morning</div>
            <div className="text-[11px] text-white/40 mt-1">~300 stocks ranked by the AI for the session</div>
          </div>
        )}

        {/* footer */}
        <a href="#board" className="relative flex items-center justify-between px-5 py-3.5 border-t border-white/[0.08] text-[12px] font-semibold hover:bg-white/[0.03] transition-colors">
          <span style={{ background: 'linear-gradient(90deg,#22d3ee,#a855f7)', WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            See all 15 calls + the track record
          </span>
          <span className="text-white/40">→</span>
        </a>
      </div>
    </div>
  )
}

type AIPost = {
  id: number
  created_at: string
  hook: string
  insight: string
  ticker: string | null
  forecast: { price: number; target: number; pct: number; dirAcc: number } | null
  importance: number
  category: string
}

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000))
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function AIFeed() {
  const [posts, setPosts] = useState<AIPost[]>([])
  useEffect(() => {
    fetch('/api/ai-feed')
      .then((r) => r.json())
      .then((d) => setPosts(d.posts || []))
      .catch(() => {})
  }, [])
  return (
    <section id="ai-feed" className="relative z-10 max-w-6xl mx-auto px-6 pb-24 scroll-mt-24">
      <Reveal>
        <div className="flex items-center gap-2 text-[13px] uppercase tracking-[0.2em] text-[#9a9aa4] mb-3">
          <span className="inline-block w-2 h-2 rounded-full ln-cursor" style={{ background: '#8b5cf6', boxShadow: '0 0 8px #8b5cf6' }} />
          The AI is watching
        </div>
        <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.02em] leading-tight max-w-2xl">
          Live market takes, written by our AI.
        </h2>
        <p className="mt-3 text-[16px] text-[#5e5e68] max-w-xl">
          Through the day, BrainStock reads the headlines, gives its honest read, and — when there&apos;s a ticker — attaches a forecast. The big ones hit your inbox.
        </p>
      </Reveal>
      {posts.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-10">
          {posts.slice(0, 9).map((p, i) => (
            <Reveal key={p.id} delay={i * 40}>
              <div className="h-full rounded-2xl bg-white/65 backdrop-blur border border-black/[0.06] p-5" style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: 'rgba(139,92,246,.1)', color: '#7c3aed' }}>{p.category}</span>
                  <span className="text-[11px] text-[#9a9aa4]">{timeAgo(p.created_at)}</span>
                </div>
                <div className="text-[16px] font-semibold tracking-tight leading-snug">{p.hook}</div>
                <p className="mt-1.5 text-[14px] text-[#5e5e68] leading-relaxed">{p.insight}</p>
                {p.forecast && p.ticker && (
                  <Link href={`/forecast/${p.ticker}`} className="mt-3 inline-flex items-center gap-2 text-[13px] font-medium rounded-full px-3 py-1.5" style={{ background: 'rgba(6,182,212,.08)', color: '#0891b2' }}>
                    {p.ticker} target ${p.forecast.target.toFixed(2)}
                    <span style={{ color: p.forecast.pct >= 0 ? '#16a34a' : '#dc2626' }}>{p.forecast.pct >= 0 ? '▲' : '▼'} {Math.abs(p.forecast.pct).toFixed(1)}%</span>
                  </Link>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-2xl bg-white/55 backdrop-blur border border-black/[0.06] px-8 py-12 text-center" style={{ boxShadow: '0 10px 40px rgba(80,80,120,.06)' }}>
          <div className="text-[17px] font-semibold text-[#16161f]">The AI posts its takes through the day.</div>
          <div className="text-[14px] text-[#6a6a74] mt-2">Check back soon — it reads the market every few hours.</div>
        </div>
      )}
    </section>
  )
}

function AIPopup() {
  const [posts, setPosts] = useState<AIPost[]>([])
  const [idx, setIdx] = useState(0)
  const [show, setShow] = useState(false)
  const shownRef = useRef(0)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('yn_ai_pop_off')) return
    fetch('/api/ai-feed')
      .then((r) => r.json())
      .then((d) => {
        const list: AIPost[] = (d.posts || []).filter((p: AIPost) => p.importance >= 3)
        if (!list.length) return
        setPosts(list)
        setTimeout(() => setShow(true), 6000)
      })
      .catch(() => {})
  }, [])
  useEffect(() => {
    if (!show || !posts.length) return
    const id = setTimeout(() => {
      shownRef.current += 1
      if (shownRef.current >= 4) setShow(false)
      else setIdx((i) => (i + 1) % posts.length)
    }, 15000)
    return () => clearTimeout(id)
  }, [show, idx, posts.length])
  if (!show || !posts.length) return null
  const p = posts[idx]
  const dismiss = () => {
    setShow(false)
    try {
      sessionStorage.setItem('yn_ai_pop_off', '1')
    } catch {}
  }
  return (
    <div className="fixed bottom-5 left-5 z-50 w-[330px] max-w-[calc(100vw-2.5rem)] rounded-2xl p-[1.5px] ln-up" style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)', boxShadow: '0 20px 50px rgba(60,40,120,.4)' }}>
      <div className="rounded-2xl p-4 relative" style={{ background: 'linear-gradient(165deg,#0c1124,#141a3e)' }}>
        <button onClick={dismiss} aria-label="Dismiss" className="absolute top-2.5 right-3 text-white/40 hover:text-white text-[16px] leading-none">×</button>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-5 h-5 rounded-lg grid place-items-center" style={{ background: 'linear-gradient(135deg,#22d3ee,#a855f7)' }}>
            <Brain className="w-3 h-3" style={{ color: '#0c1124' }} />
          </span>
          <span className="text-[11px] font-semibold text-white/70">BrainStock AI</span>
          <span className="inline-block w-1.5 h-1.5 rounded-full ln-cursor" style={{ background: '#22c55e' }} />
        </div>
        <div className="text-[15px] font-semibold text-white leading-snug pr-4">{p.hook}</div>
        <p className="mt-1 text-[12.5px] text-white/55 leading-relaxed">{p.insight}</p>
        <a href={p.ticker ? `/forecast/${p.ticker}` : '#ai-feed'} onClick={() => setShow(false)} className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] font-semibold" style={{ color: '#5eead4' }}>
          {p.ticker ? `See the AI's take on ${p.ticker}` : "See the AI's take"} →
        </a>
      </div>
    </div>
  )
}

export default function Home() {
  const { displayed, done } = useTypewriter('Trade with an\nunfair advantage.', 48, 450)
  const { signInWithGoogle } = useAuth()
  const [menu, setMenu] = useState(false)
  const [sel, setSel] = useState<string | null>(null)
  const chosen = PRODUCTS.find((p) => p.id === sel)
  const [ticks, setTicks] = useState(TICKERS)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/market')
        .then((r) => r.json())
        .then((d: { quotes?: { symbol: string; price: number; changePercent: number }[] }) => {
          if (!alive || !d.quotes?.length) return
          setTicks(
            d.quotes.map((q) => ({
              s: q.symbol,
              p: Number(q.price).toFixed(2),
              up: q.changePercent >= 0,
              c: Math.abs(Number(q.changePercent)).toFixed(2) + '%',
            }))
          )
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

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
        @keyframes mq{from{transform:translateX(0)}to{transform:translateX(-50%)}}
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
          <button onClick={() => signInWithGoogle()} className="text-[15px] text-[#42424f] hover:text-[#16161f] transition-colors">
            Sign in
          </button>
          <Link
            href="/ai-stocks"
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
          <Link href="/ai-stocks" onClick={() => setMenu(false)} className="mt-4 text-base font-medium text-white rounded-full px-6 py-3" style={{ background: ACCENT }}>
            Open app
          </Link>
        </div>
      </div>

      {/* ---------- live ticker ---------- */}
      <div className="fixed top-[58px] inset-x-0 z-20 overflow-hidden border-y border-black/[0.07] bg-white/50 backdrop-blur">
        <div className="flex gap-8 py-2 whitespace-nowrap" style={{ animation: 'mq 42s linear infinite', width: 'max-content' }}>
          {[...ticks, ...ticks, ...ticks].map((t, i) => (
            <span key={i} className="inline-flex items-center gap-2 font-mono text-[12.5px]">
              <span className="font-semibold text-[#16161f]">{t.s}</span>
              <span className="text-[#7a7a84]">{t.p}</span>
              <span style={{ color: t.up ? '#16a34a' : '#dc2626' }}>
                {t.up ? '▲' : '▼'}
                {t.c}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------- hero ---------- */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 pt-36 pb-24 sm:pt-44 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:items-center">
        <div>
        <div className="ln-up ln-d1 inline-flex items-center gap-2 rounded-full bg-white/70 backdrop-blur border border-black/[0.06] px-3.5 py-1.5 text-[13px] text-[#42424f] mb-8" style={{ boxShadow: '0 4px 16px rgba(99,102,241,.08)' }}>
          <Sparkles className="w-3.5 h-3.5" style={{ color: '#8b5cf6' }} />
          BrainStock AI · forecasts ~300 stocks every market morning
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
Our neural net, BrainStock, forecasts ~300 stocks every morning and grades itself on real prices. Rate any stock in 15 seconds, learn from 9 pro traders, and automate it — all in one place.
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
          <a
            href="#demo"
            className="inline-flex items-center gap-2 rounded-full px-5 py-3.5 text-[15px] font-medium text-[#16161f] hover:bg-black/[0.04] transition-colors"
          >
            <Play className="w-4 h-4" style={{ color: '#7c3aed' }} fill="#7c3aed" />
            Watch the demo
          </a>
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

        <div className="ln-up ln-d3 mt-16 lg:mt-0 flex flex-col items-center lg:items-end gap-10">
          <HeroBoard />
          <Magnet padding={150} strength={3}>
            <Candles />
          </Magnet>
        </div>
      </main>

      <StatsStrip />

      <DailyBoard />

      <AIFeed />

      <EmailSignup />

      {/* ---------- products ---------- */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <Reveal>
          <div className="text-[13px] uppercase tracking-[0.2em] text-[#9a9aa4] mb-3">Forecast · Analyze · Learn · Automate</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.02em] leading-tight max-w-2xl">
            One platform for the whole trade — from idea to execution.
          </h2>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
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
              href="/ai-stocks"
              className="inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[15px] font-medium text-white transition-transform hover:-translate-y-0.5"
              style={{ background: ACCENT, boxShadow: '0 12px 30px rgba(139,92,246,.3)' }}
            >
              Open the app
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* ---------- demo video ---------- */}
      <section id="demo" className="relative z-10 max-w-6xl mx-auto px-6 pb-28 scroll-mt-24">
        <Reveal>
          <div className="text-[13px] uppercase tracking-[0.2em] text-[#9a9aa4] mb-3">See it work</div>
          <h2 className="text-[clamp(1.8rem,4vw,2.8rem)] font-semibold tracking-[-0.02em] leading-tight max-w-2xl mb-8">
            The whole platform, in 60 seconds.
          </h2>
          <div className="rounded-[28px] overflow-hidden border border-black/[0.06]" style={{ boxShadow: '0 24px 70px rgba(99,102,241,.14)' }}>
            <div className="relative w-full" style={{ aspectRatio: '1912 / 900', background: '#0f1830' }}>
              <video
                src="/founder-demo.mp4"
                poster="/founder-demo-poster.jpg"
                controls
                preload="none"
                playsInline
                className="absolute inset-0 w-full h-full"
                style={{ background: '#0f1830' }}
              >
                Your browser doesn&apos;t support embedded video.
              </video>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------- founders ---------- */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-28">
        <Reveal>
          <div
            className="rounded-[28px] overflow-hidden border border-black/[0.06]"
            style={{ background: 'linear-gradient(135deg,rgba(99,102,241,.12),rgba(236,72,153,.09) 55%,rgba(16,185,129,.08))', boxShadow: '0 24px 70px rgba(99,102,241,.14)' }}
          >
            <div className="grid md:grid-cols-[1.25fr_1fr]">
              <div className="p-9 sm:p-12">
                <div className="text-[13px] uppercase tracking-[0.22em] text-[#8a8a94] mb-3">The founders</div>
                <h2 className="text-[clamp(1.7rem,3.6vw,2.6rem)] font-semibold tracking-[-0.02em] leading-[1.1]">
                  Built by two teenagers
                  <br />
                  who refused to wait.
                </h2>
                <p className="mt-5 text-[16px] leading-relaxed text-[#54545e] max-w-md">
                  We taught ourselves to code and shipped a real product most adults never will — because we want everyone&apos;s money to be as intelligent as the wealthy&apos;s, not just Wall Street&apos;s.
                </p>
                <p className="mt-4 text-[16px] leading-relaxed text-[#54545e] max-w-md">
                  No team, no funding, no permission. Just the two of us, nights and weekends — shipping to ynfinance.org.
                </p>
                <Link href="/company" className="mt-7 inline-flex items-center gap-1.5 text-[14px] font-medium" style={{ color: '#7c3aed' }}>
                  Read our story <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <div className="p-9 sm:p-12 flex flex-col justify-center gap-5 bg-white/45 backdrop-blur">
                {[
                  { i: 'NG', n: 'Neil Gilani', r: 'Co-founder · CEO', g: 'linear-gradient(135deg,#6366f1,#8b5cf6)' },
                  { i: 'YR', n: 'Yannai Richter', r: 'Co-founder · CTO', g: 'linear-gradient(135deg,#ec4899,#f97316)' },
                ].map((f) => (
                  <div key={f.i} className="flex items-center gap-4">
                    <span className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-[15px]" style={{ background: f.g, boxShadow: '0 8px 22px rgba(139,92,246,.25)' }}>
                      {f.i}
                    </span>
                    <div>
                      <div className="text-[16px] font-semibold">{f.n}</div>
                      <div className="text-[13px] text-[#6a6a74]">{f.r}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      <AIPopup />

      <SiteFooter />
    </div>
  )
}
