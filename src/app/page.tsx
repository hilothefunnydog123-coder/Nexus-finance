'use client'

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ArrowRight, Menu, X } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'
import { fetchProfile, track as brainTrack } from '@/components/brain/siteBrainClient'
import { useVariant } from '@/components/brain/useVariant'
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
function Magnetic({ children, href, className, style, strength = 0.4, onClick }: { children: ReactNode; href: string; className?: string; style?: CSSProperties; strength?: number; onClick?: () => void }) {
  const ref = useRef<HTMLAnchorElement>(null)
  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
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
  { label: 'Fork', href: '/fork' },
  { label: 'Analyzer', href: '/ai-stocks' },
  { label: 'Algorithms', href: '/algorithms' },
  { label: 'YN Edge', href: '/edge' },
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
  { n: '01', tag: 'THE FORECASTER', title: 'BrainStock', line: 'A real neural network forecasts ~300 stocks every market morning — then publishes whether it was right, graded against real prices. An un-cherry-picked, public track record you can audit call by call.', href: '/brainstock', cta: 'See today’s calls', featured: true, badge: '📊 LIVE · PUBLICLY GRADED', accent: '#1f3bff', deep: '#1f3bff', tint: 'rgba(31,59,255,', badgeBg: 'linear-gradient(135deg,#1f3bff,#8aa6ff)', badgeInk: '#fff' },
  { n: '02', tag: 'THE HOLY GRAIL', title: 'Copy-Paste Quant Algos', line: 'Research-grade trading algorithms you paste straight into TradingView and run — led by the ⚡ Adaptive Regime-Switching engine, refined trade-by-trade on a real MNQ account until the numbers were undeniable. Green target box, red stop box, prop-firm risk rules built in.', href: '/algorithms', cta: 'Deploy an algo', featured: true, badge: '👑 REAL-MONEY PROVEN', accent: '#10b981', deep: '#0a9d6e', tint: 'rgba(16,185,129,', badgeBg: 'linear-gradient(135deg,#34d399,#ffd76a)', badgeInk: '#06281d' },
  { n: '03', tag: 'THE AGENT', title: 'YN Copilot for TradingView', line: 'A real AI agent that lives in your browser and runs your TradingView chart with you — it sees the chart, draws labeled levels, switches timeframes, and writes, tests & refines Pine indicators itself. Free, loads in 30 seconds.', href: '/copilot/desktop', cta: 'Get the Copilot', featured: true, badge: '🤖 NEW · LIVES IN YOUR CHART', accent: '#7c9cff', deep: '#3b6bff', tint: 'rgba(59,107,255,', badgeBg: 'linear-gradient(135deg,#1f3bff,#34d399)', badgeInk: '#04140c' },
  { n: '04', tag: 'THE READ', title: 'AI Analyzer', line: 'A 15-second institutional read on any ticker. Verdict, conviction, payoff math, in plain English. Drop a symbol, get the desk’s answer.', href: '/ai-stocks', cta: 'Analyze a stock' },
  { n: '05', tag: 'THE DEBATE', title: 'The War Room', line: 'Five AI analysts — a long PM, a short-seller, a quant, a risk officer and the CIO — argue your stock live, then the CIO rules.', href: '/war-room', cta: 'Convene the room' },
  { n: '06', tag: 'THE COPILOT', title: 'Voice', line: 'Talk to the market. Ask “what’s happening with Nvidia?” and the neural net answers out loud — with the chart and the news, live.', href: '/copilot', cta: 'Start talking' },
  { n: '07', tag: 'THE EDGE', title: 'Courses', line: 'Learn the edge from pro traders — structured courses that take you from setup to execution to risk management, then hand you the algorithms to automate it.', href: '/courses', cta: 'Learn the edge' },
  { n: '08', tag: 'THE EXPERIENCE', title: 'Enter the Net', line: 'Fly inside the neural network as it forecasts your stock — the signal fires through every layer in real time, scored live with sound. Nothing in finance looks like this.', href: '/brain/live', cta: 'Enter the net' },
  { n: '09', tag: 'THE UNIVERSE', title: 'Market Galaxy', line: 'Every stock a star, clustered into sector constellations, sized by market cap and pulsing with today’s real move. Fly through it. Click a star to forecast it.', href: '/galaxy', cta: 'Explore the galaxy' },
  { n: '10', tag: 'THE STORM', title: 'Conviction Storm', line: 'A live particle field of the whole tape — bulls lift, bears sink, the strongest moves burn brightest. Turn the sound on and listen to the market breathe.', href: '/storm', cta: 'Enter the storm' },
  { n: '11', tag: 'THE OPEN', title: 'The Open', line: 'A self-running cinematic of the trading day: the net wakes, scans the market, slams down its top calls, and shows the public win rate. Built to be shared.', href: '/the-open', cta: 'Watch The Open' },
  { n: '12', tag: 'THE REMIX', title: 'Fork the Brain', line: 'Take the real neural net and make it think your way — 11 live dials for what it pays attention to. Watch your fork split from BrainStock, then save it to your profile.', href: '/fork', cta: 'Fork the brain' },
]

function RegimeGrailPopup() {
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('grailPopupDismissed')) return
    const t = setTimeout(() => setShow(true), 3800)
    return () => clearTimeout(t)
  }, [])
  const dismiss = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setClosing(true)
    try { sessionStorage.setItem('grailPopupDismissed', '1') } catch {}
    setTimeout(() => setShow(false), 420)
  }
  if (!show) return null
  return (
    <>
      <style>{`
        @keyframes grailPopIn { 0%{opacity:0;transform:translateY(46px) translateX(24px) scale(.88)} 100%{opacity:1;transform:translateY(0) translateX(0) scale(1)} }
        @keyframes grailPopOut { 0%{opacity:1;transform:translateY(0) scale(1)} 100%{opacity:0;transform:translateY(34px) scale(.9)} }
        @keyframes grailRing { 0%,100%{box-shadow:0 20px 54px rgba(0,0,0,.4),0 0 0 1px rgba(52,211,153,.4),0 0 28px rgba(52,211,153,.22)} 50%{box-shadow:0 20px 54px rgba(0,0,0,.4),0 0 0 1px rgba(52,211,153,.75),0 0 52px rgba(52,211,153,.5)} }
        .grailPop{ animation: grailPopIn .62s cubic-bezier(.16,1,.3,1) both, grailRing 4s ease-in-out infinite 1.1s; transition: transform .3s ease }
        .grailPop.closing{ animation: grailPopOut .42s ease forwards }
        .grailPop:hover{ transform: translateY(-5px) }
        @media(max-width:819px){ .grailPop{ display:none!important } }
      `}</style>
      <div className={`grailPop${closing ? ' closing' : ''}`} style={{ position: 'fixed', right: 24, bottom: 24, zIndex: 250, width: 324, borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(180deg,#0a1410,#070b0e)', border: '1px solid rgba(52,211,153,.4)' }}>
        <button onClick={dismiss} aria-label="Dismiss" style={{ position: 'absolute', top: 9, right: 9, zIndex: 3, width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,.5)', color: '#cbeadd', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
          <X size={14} />
        </button>
        <Link href="/algorithms" style={{ textDecoration: 'none', display: 'block' }}>
          <div style={{ position: 'relative' }}>
            <img src="/regime-grail.webp" alt="Adaptive Regime-Switching — Holy Grail algorithm" style={{ width: '100%', display: 'block' }} />
            <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, transparent 52%, #070b0e)' }} />
            <div style={{ position: 'absolute', top: 10, left: 10, fontFamily: 'ui-monospace,monospace', fontSize: 9.5, fontWeight: 900, letterSpacing: '.16em', color: '#0a0f10', background: 'linear-gradient(135deg,#ffd76a,#fff3c4)', borderRadius: 999, padding: '4px 10px', boxShadow: '0 0 18px rgba(255,200,80,.5)' }}>👑 HOLY GRAIL</div>
          </div>
          <div style={{ padding: '10px 16px 16px' }}>
            <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, fontWeight: 800, letterSpacing: '.18em', color: '#34d399', marginBottom: 6 }}>⚡ NEW GOD-MODE ALGO · MNQ 5-MIN</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#eafff5', letterSpacing: '-.02em', lineHeight: 1.12, marginBottom: 10 }}>Adaptive Regime-Switching</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 13 }}>
              {[['≈80%', 'WIN'], ['≈5.0', 'PF'], ['~10', 'TR/MO']].map(([v, l]) => (
                <div key={l} style={{ flex: 1, background: 'rgba(52,211,153,.08)', border: '1px solid rgba(52,211,153,.2)', borderRadius: 9, padding: '7px 4px', textAlign: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 900, color: '#34d399', lineHeight: 1 }}>{v}</div>
                  <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: '.1em', color: '#5f8f7c', marginTop: 4, fontFamily: 'ui-monospace,monospace' }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#06100b', background: 'linear-gradient(135deg,#34d399,#ffd76a)', borderRadius: 10, padding: '11px' }}>
              Deploy the Holy Grail <ArrowRight size={15} />
            </div>
          </div>
        </Link>
      </div>
    </>
  )
}

function CopilotPopup() {
  const [show, setShow] = useState(false)
  const [closing, setClosing] = useState(false)
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('copilotPopupDismissed')) return
    const t = setTimeout(() => setShow(true), 7200) // after the Grail card so they don't pop together
    return () => clearTimeout(t)
  }, [])
  const dismiss = (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    setClosing(true)
    try { sessionStorage.setItem('copilotPopupDismissed', '1') } catch {}
    setTimeout(() => setShow(false), 420)
  }
  if (!show) return null
  const candles: [number, number, boolean][] = [[30, 18, true], [44, 26, false], [22, 40, true], [54, 30, true], [34, 58, false], [60, 44, true], [40, 72, true], [50, 60, false]]
  return (
    <>
      <style>{`
        @keyframes coPopIn { 0%{opacity:0;transform:translateY(46px) translateX(-24px) scale(.88)} 100%{opacity:1;transform:none} }
        @keyframes coPopOut { 0%{opacity:1;transform:none} 100%{opacity:0;transform:translateY(34px) scale(.9)} }
        @keyframes coAura { to{ transform:rotate(360deg) } }
        @keyframes coBreathe { 0%,100%{ transform:scale(1); box-shadow:0 0 8px rgba(16,214,147,.7) } 50%{ transform:scale(1.25); box-shadow:0 0 16px rgba(31,107,255,.9) } }
        @keyframes coScan { 0%{ transform:translateX(-120%) } 100%{ transform:translateX(320%) } }
        @keyframes coLevel { 0%,100%{ opacity:.55; box-shadow:0 0 10px rgba(52,211,153,.4) } 50%{ opacity:1; box-shadow:0 0 18px rgba(52,211,153,.8) } }
        .coPop{ animation: coPopIn .62s cubic-bezier(.16,1,.3,1) both; transition: transform .3s ease }
        .coPop.closing{ animation: coPopOut .42s ease forwards }
        .coPop:hover{ transform: translateY(-5px) }
        .coPop:hover .coAura{ opacity:.95 }
        .coAura{ position:absolute; inset:-60%; z-index:0; background:conic-gradient(from 0deg,#3b6bff,#10d693,#8b5bff,#3b6bff); animation:coAura 9s linear infinite; opacity:.62; filter:blur(13px) }
        @media(max-width:819px){ .coPop{ display:none!important } }
      `}</style>
      <div className={`coPop${closing ? ' closing' : ''}`} style={{ position: 'fixed', left: 24, bottom: 92, zIndex: 249, width: 332, borderRadius: 19, overflow: 'hidden', padding: 1.5, boxShadow: '0 24px 60px rgba(0,0,0,.55)' }}>
        <div className="coAura" />
        <div style={{ position: 'relative', zIndex: 1, borderRadius: 17, overflow: 'hidden', background: 'linear-gradient(180deg,#0b0f1e,#070912)' }}>
          <button onClick={dismiss} aria-label="Dismiss" style={{ position: 'absolute', top: 9, right: 9, zIndex: 4, width: 26, height: 26, borderRadius: 8, border: 'none', background: 'rgba(0,0,0,.5)', color: '#cdd6ff', cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
            <X size={14} />
          </button>
          <Link href="/copilot/desktop" style={{ textDecoration: 'none', display: 'block' }}>
            {/* mini chart cockpit */}
            <div style={{ position: 'relative', height: 124, overflow: 'hidden', background: 'radial-gradient(120% 90% at 50% 0%, #0e1430, #060810)', borderBottom: '1px solid rgba(31,59,255,.18)' }}>
              <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)', backgroundSize: '26px 22px' }} />
              <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 7, padding: '0 16px' }}>
                {candles.map(([body, base, up], i) => (
                  <div key={i} style={{ width: 8, position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '50%', bottom: base, transform: 'translateX(-50%)', width: 1.5, height: body + 14, background: up ? 'rgba(52,211,153,.6)' : 'rgba(255,106,138,.6)' }} />
                    <div style={{ height: body, marginBottom: base, borderRadius: 2, background: up ? 'linear-gradient(#34d399,#10b981)' : 'linear-gradient(#ff6a8a,#e8456a)', boxShadow: up ? '0 0 8px rgba(52,211,153,.35)' : '0 0 8px rgba(255,106,138,.3)' }} />
                  </div>
                ))}
              </div>
              {/* drawn support level */}
              <div style={{ position: 'absolute', left: 12, right: 12, top: 64, height: 0, borderTop: '1.5px dashed #34d399', animation: 'coLevel 2.6s ease-in-out infinite' }} />
              <div style={{ position: 'absolute', right: 12, top: 55, fontFamily: 'ui-monospace,monospace', fontSize: 9, fontWeight: 800, color: '#04140c', background: '#34d399', borderRadius: 5, padding: '2px 6px', boxShadow: '0 0 12px rgba(52,211,153,.6)' }}>20,140</div>
              {/* scan shimmer */}
              <div aria-hidden style={{ position: 'absolute', top: 0, bottom: 0, width: 60, background: 'linear-gradient(90deg,transparent,rgba(124,156,255,.16),transparent)', animation: 'coScan 4.6s linear infinite' }} />
              {/* agent chat bubble */}
              <div style={{ position: 'absolute', left: 12, top: 12, display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Inter,system-ui,sans-serif', fontSize: 10.5, fontWeight: 600, color: '#cdd6ff', background: 'rgba(8,10,20,.78)', border: '1px solid rgba(31,59,255,.3)', borderRadius: 9, padding: '5px 9px', backdropFilter: 'blur(6px)' }}>
                <span style={{ width: 7, height: 7, borderRadius: 99, background: 'radial-gradient(circle at 30% 30%,#7fffcf,#10d693 45%,#1f3bff)', animation: 'coBreathe 2.4s ease-in-out infinite' }} />
                drawing support…
              </div>
            </div>
            {/* copy */}
            <div style={{ padding: '12px 16px 16px' }}>
              <div style={{ fontFamily: 'ui-monospace,monospace', fontSize: 9, fontWeight: 800, letterSpacing: '.16em', color: '#7c9cff', marginBottom: 7 }}>⌥Y · NEW · LIVES IN TRADINGVIEW</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#eaf0ff', letterSpacing: '-.02em', lineHeight: 1.14, marginBottom: 11 }}>An AI agent, right on your chart</div>
              <div style={{ display: 'flex', gap: 7, marginBottom: 13 }}>
                {[['👁', 'SEES'], ['📐', 'DRAWS'], ['⚡', 'CODES PINE']].map(([ic, l]) => (
                  <div key={l} style={{ flex: 1, background: 'rgba(31,59,255,.09)', border: '1px solid rgba(31,59,255,.22)', borderRadius: 9, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 14, lineHeight: 1 }}>{ic}</div>
                    <div style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: '.08em', color: '#8fa0d8', marginTop: 5, fontFamily: 'ui-monospace,monospace' }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, fontSize: 13, fontWeight: 800, color: '#04140c', background: 'linear-gradient(135deg,#1f3bff,#34d399)', borderRadius: 10, padding: '11px' }}>
                Get the Copilot <ArrowRight size={15} />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </>
  )
}

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

  // ── Site Brain: personalized ordering of the non-pinned frames ──────────────
  const featKey = (href: string) => { const p = href.replace(/^\/+/, ''); return p.startsWith('brain/live') ? 'brain/live' : p.split('/')[0] }
  const [frameOrder, setFrameOrder] = useState<string[] | null>(null)
  const [brain, setBrain] = useState<Awaited<ReturnType<typeof fetchProfile>>>(null)
  const pinned = FRAMES.filter((f) => 'featured' in f && f.featured)
  const rest = FRAMES.filter((f) => !('featured' in f && f.featured))
  useEffect(() => {
    fetchProfile(rest.map((f) => featKey(f.href))).then((p) => { if (p?.order?.length) setFrameOrder(p.order); setBrain(p) })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const FEAT_META: Record<string, { label: string; href: string }> = {
    brainstock: { label: 'BrainStock', href: '/brainstock' }, algorithms: { label: 'the Algorithms', href: '/algorithms' },
    'ai-stocks': { label: 'the AI Analyzer', href: '/ai-stocks' }, 'war-room': { label: 'the War Room', href: '/war-room' },
    copilot: { label: 'Voice', href: '/copilot' }, courses: { label: 'Courses', href: '/courses' }, fork: { label: 'Fork the Brain', href: '/fork' },
    proof: { label: 'the Proof', href: '/proof' }, fund: { label: 'the Fund', href: '/fund' }, galaxy: { label: 'the Galaxy', href: '/galaxy' },
    storm: { label: 'the Storm', href: '/storm' }, 'the-open': { label: 'The Open', href: '/the-open' }, 'brain/live': { label: 'Enter the Net', href: '/brain/live' },
  }
  const rec = brain?.recommend && FEAT_META[brain.recommend] ? FEAT_META[brain.recommend] : null
  const showForYou = !!brain?.ready && (brain.seen ?? 0) >= 5 && (!!rec || !!(brain.tickers?.length))
  const orderedRest = frameOrder
    ? [...rest].sort((a, b) => frameOrder.indexOf(featKey(a.href)) - frameOrder.indexOf(featKey(b.href)))
    : rest
  const displayFrames = [...pinned, ...orderedRest]
  // fire one impression per frame for the bandit (once)
  const impressed = useRef(false)
  useEffect(() => {
    if (impressed.current) return
    impressed.current = true
    for (const f of displayFrames) brainTrack({ type: 'impression', path: '/', target: featKey(f.href), meta: { surface: 'home_frames' } })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frameOrder])

  // ── Self-evolving hero: the net A/B-tests the headline and learns from CTAs ──
  const HEADLINES = {
    proof: { text: 'An AI that calls the market. And proves it.', accent: [6] as number[] },
    edge: { text: 'The market has a tell. Our neural net reads it.', accent: [5, 6, 7] as number[] },
    money: { text: 'Forecasts graded in public. Algorithms proven on real money.', accent: [2, 3, 7, 8] as number[] },
  } as const
  const [hl, heroConvert] = useVariant('hero_headline', HEADLINES)
  const headline = HEADLINES[hl]

  const has = (n?: number | null) => n != null && n >= 0
  const proof = ([
    has(stats?.forecasts) && { v: <CountUp to={stats!.forecasts!} />, l: 'AI forecasts made' },
    has(stats?.winRate) && { v: <CountUp to={stats!.winRate!} decimals={1} suffix="%" />, l: 'graded win rate' },
    has(stats?.users) && { v: <CountUp to={stats!.users!} />, l: 'live users' },
    has(stats?.stocksDaily) && { v: <CountUp to={stats!.stocksDaily!} />, l: 'stocks scanned each morning' },
    (stats?.gradedCalls ?? 0) > 0 && { v: <><CountUp to={stats!.gradedCalls!} />+</>, l: 'calls graded in public' },
    (stats?.nnTrained ?? 0) > 0 && { v: <CountUp to={stats!.nnTrained!} />, l: 'examples the net trained on' },
  ].filter(Boolean) as { v: ReactNode; l: string }[]).slice(0, 4)

  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <ColdOpen />
      <WelcomeFunnel />
      <RegimeGrailPopup />
      <CopilotPopup />
      <style>{`
        @keyframes mq{to{transform:translateX(-50%)}}
        @keyframes grid-drift{to{background-position:48px 48px}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes float-y{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes aurora1{0%,100%{transform:translate(-8%,-4%) scale(1)}50%{transform:translate(16%,12%) scale(1.28)}}
        @keyframes aurora2{0%,100%{transform:translate(10%,8%) scale(1.1)}50%{transform:translate(-14%,-10%) scale(1.4)}}
        @keyframes aurora3{0%,100%{transform:translate(0,10%) scale(1)}50%{transform:translate(14%,-12%) scale(1.22)}}
        .lk{position:relative}.lk::after{content:"";position:absolute;left:0;bottom:-3px;height:1.5px;width:0;background:${INK};transition:width .35s cubic-bezier(.16,1,.3,1)}.lk:hover::after{width:100%}
        .disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-0.045em;line-height:0.92}
        .frame-row:hover .frame-num{color:${ACCENT};transform:translateX(6px)}
        .aura-blob{position:absolute;border-radius:50%;mix-blend-mode:multiply;will-change:transform}
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
            <Link href="/everyone" className="lk" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 700, color: '#16110c', background: 'linear-gradient(135deg,#ffd9a8,#ffb877)', border: '1px solid rgba(214,120,40,.35)', padding: '8px 15px', borderRadius: 999, textDecoration: 'none', boxShadow: '0 4px 16px rgba(255,150,70,.28)' }} title="The consumer side — time your everyday big-money decisions">🏠 Not a trader? →</Link>
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
            <Link href="/everyone" onClick={() => setMenu(false)} style={{ marginTop: 16, fontSize: 16, fontWeight: 800, color: '#16110c', background: 'linear-gradient(135deg,#ffd9a8,#ffb877)', padding: '14px 22px', textAlign: 'center', textDecoration: 'none', borderRadius: 12 }}>🏠 Not a trader? → YN for Everyone</Link>
            <Link href="/brainstock" onClick={() => setMenu(false)} style={{ fontSize: 16, fontWeight: 700, color: PAPER, background: INK, padding: '14px 22px', textAlign: 'center', textDecoration: 'none' }}>Open app</Link>
          </div>
        </div>
      )}

      {/* ─────────────── HERO ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' }}>
        {/* living aurora — premium colored light drifting across the paper */}
        <div aria-hidden style={{ position: 'absolute', inset: '-10% -20% 0', zIndex: 0, overflow: 'hidden', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, #000 35%, transparent 78%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 35%, #000 35%, transparent 78%)' }}>
          <span className="aura-blob" style={{ width: '52vw', height: '52vw', left: '-10vw', top: '-4vw', background: 'radial-gradient(circle,rgba(31,59,255,.26),transparent 62%)', filter: 'blur(40px)', animation: 'aurora1 19s ease-in-out infinite' }} />
          <span className="aura-blob" style={{ width: '46vw', height: '46vw', right: '-8vw', top: '0', background: 'radial-gradient(circle,rgba(16,185,129,.24),transparent 62%)', filter: 'blur(44px)', animation: 'aurora2 23s ease-in-out infinite' }} />
          <span className="aura-blob" style={{ width: '40vw', height: '40vw', left: '32vw', top: '18vw', background: 'radial-gradient(circle,rgba(255,176,90,.22),transparent 62%)', filter: 'blur(46px)', animation: 'aurora3 27s ease-in-out infinite' }} />
        </div>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', paddingTop: 90, paddingBottom: 40 }}>
          <Reveal>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.28em', color: ACCENT, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'blink 1.4s infinite' }} />
              BRAINSTOCK · AI MARKET INTELLIGENCE
            </div>
          </Reveal>

          <Kinetic key={hl} className="disp" accentWords={headline.accent} style={{ fontSize: 'clamp(2.8rem,8.5vw,7.2rem)', maxWidth: 1100 }}>
            {headline.text}
          </Kinetic>

          <Reveal delay={250} style={{ marginTop: 30, maxWidth: 620 }}>
            <p style={{ fontSize: 'clamp(1.05rem,1.7vw,1.35rem)', lineHeight: 1.55, color: 'rgba(10,10,12,.66)' }}>
              BrainStock forecasts <b style={{ color: INK }}>~300 stocks every morning</b>, then publishes whether it was right — a neural network building a <b style={{ color: INK }}>public, un-cherry-picked track record.</b> Plus a 15-second analyzer, an AI committee that debates any stock, and a market you can talk to.
            </p>
          </Reveal>

          <Reveal delay={400} style={{ marginTop: 38, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
            <Magnetic href="/brainstock" onClick={heroConvert} style={{ gap: 10, background: INK, color: PAPER, padding: '17px 30px', fontSize: 15, fontWeight: 700 }}>
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

      {/* ─────────────── YN EDGE · POWERED BY KALSHI ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, background: '#06070c', borderBlock: '1px solid rgba(255,255,255,.08)', overflow: 'hidden' }}>
        <style>{`
          @keyframes ynedge-pulse{0%,100%{opacity:1}50%{opacity:.3}}
          @keyframes ynedge-scan{0%{transform:translateX(-130%)}100%{transform:translateX(360%)}}
          .ynedge-dot,.ynedge-scan{animation:none}
          @media (prefers-reduced-motion: no-preference){
            .ynedge-dot{animation:ynedge-pulse 1.4s infinite}
            .ynedge-scan{animation:ynedge-scan 3.4s ease-in-out infinite}
          }
          @media(max-width:840px){.ynedge-grid{grid-template-columns:1fr!important}}
          .ynedge-cta:hover{box-shadow:0 0 40px rgba(52,211,153,.5)!important;transform:translateY(-2px)}
        `}</style>
        {/* obsidian atmosphere */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(900px 460px at 12% -10%, rgba(34,211,238,.16), transparent 55%), radial-gradient(820px 440px at 92% 110%, rgba(52,211,153,.14), transparent 55%)' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.022) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.022) 1px,transparent 1px)', backgroundSize: '46px 46px', maskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%,#000,transparent 82%)', WebkitMaskImage: 'radial-gradient(ellipse 80% 70% at 50% 50%,#000,transparent 82%)' }} />

        <div className="ynedge-grid" style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: 'clamp(58px,9vw,112px) clamp(18px,4vw,40px)', display: 'grid', gridTemplateColumns: '1.08fr .92fr', gap: 'clamp(30px,5vw,68px)', alignItems: 'center' }}>
          {/* LEFT — the pitch */}
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#34d399' }}>
              <span className="ynedge-dot" style={{ width: 7, height: 7, borderRadius: 999, background: '#34d399', boxShadow: '0 0 10px #34d399' }} /> New · YN Edge
            </div>
            <h2 className="disp" style={{ marginTop: 18, fontSize: 'clamp(2.1rem,5.4vw,4.1rem)', lineHeight: 1.0, letterSpacing: '-0.04em', color: '#e7ecf5', fontWeight: 800 }}>
              Our AI prices every market.<br />Then bets the <span style={{ color: '#22d3ee', textShadow: '0 0 30px rgba(34,211,238,.45)' }}>edge</span>.
            </h2>
            <p style={{ marginTop: 22, fontSize: 'clamp(1.02rem,1.5vw,1.22rem)', lineHeight: 1.6, color: '#8a93a8', maxWidth: 520 }}>
              The BrainStock neural net prices every <b style={{ color: '#cdd6e6' }}>Kalshi</b> prediction market — S&amp;P, Bitcoin, the Fed, elections — computes our probability against the market’s price, and surfaces the bets actually worth taking. Edge, expected value, Kelly stake, all shown. Then graded in public.
            </p>

            {/* powered by Kalshi lockup */}
            <div style={{ marginTop: 26, display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase', color: '#4a5e7a' }}>Powered by</span>
              <svg width="118" height="32" viewBox="0 0 132 36" fill="none" aria-label="Kalshi" role="img">
                <rect x="0" y="2" width="32" height="32" rx="8" fill="#00C9A7" />
                <path d="M10 9h4v6.6l5.4-6.6H24l-6 7.2 6.2 10.8h-4.8l-4.2-7.6L14 22.4V27h-4z" fill="#06231d" />
                <text x="42" y="26" fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize="22" fontWeight="700" letterSpacing="-0.5" fill="#e7ecf5">Kalshi</text>
              </svg>
            </div>

            <div style={{ marginTop: 30, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              <Link href="/edge" className="ynedge-cta" data-brain="edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 700, color: '#06070c', background: 'linear-gradient(135deg,#22d3ee,#34d399)', padding: '15px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 0 28px rgba(52,211,153,.32)', transition: 'box-shadow .3s, transform .3s' }}>
                Open YN Edge →
              </Link>
              <Link href="/edge/track-record" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 15, fontWeight: 600, color: '#cdd6e6', border: '1px solid rgba(255,255,255,.14)', padding: '15px 24px', borderRadius: 10, textDecoration: 'none' }}>
                See the track record
              </Link>
            </div>
          </Reveal>

          {/* RIGHT — live AI-vs-market mock card */}
          <Reveal delay={140}>
            <div style={{ position: 'relative', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 16, padding: 'clamp(20px,3vw,30px)', backdropFilter: 'blur(10px)', boxShadow: '0 30px 80px -40px rgba(0,0,0,.9), 0 0 0 1px rgba(34,211,238,.08)', overflow: 'hidden' }}>
              <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(34,211,238,.6),transparent)' }} />
              <span aria-hidden className="ynedge-scan" style={{ position: 'absolute', top: 0, bottom: 0, width: '30%', background: 'linear-gradient(90deg,transparent,rgba(34,211,238,.06),transparent)', pointerEvents: 'none' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', color: '#22d3ee', border: '1px solid rgba(34,211,238,.32)', background: 'rgba(34,211,238,.1)', padding: '3px 8px', borderRadius: 4 }}>NEURAL NET</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#4a5e7a' }}>closes 30d</span>
              </div>
              <div style={{ marginTop: 14, fontSize: 17, fontWeight: 700, color: '#e7ecf5', lineHeight: 1.25 }}>Will Bitcoin close above $120,000?</div>

              {/* bars */}
              <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[['YN AI', 61, '#22d3ee', true], ['MARKET', 44, '#8a93a8', false]].map(([lab, val, col, emph]) => (
                  <div key={lab as string} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 54, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.1em', color: emph ? (col as string) : '#4a5e7a' }}>{lab}</span>
                    <div style={{ position: 'relative', flex: 1, height: 30, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 5, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', inset: 0, width: `${val}%`, background: emph ? `linear-gradient(90deg,${col}cc,${col})` : `${col}55`, boxShadow: emph ? `0 0 16px ${col}66` : 'none' }} />
                      <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: '#e7ecf5' }}>{val as number}%</span>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.08)', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                {[['+17pt', 'EDGE', '#34d399'], ['+39%', 'EV / $1', '#22d3ee'], ['8.5%', '½-KELLY', '#a78bfa']].map(([v, l, c]) => (
                  <div key={l}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.12em', color: '#4a5e7a', marginTop: 3 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#06070c', background: '#34d399', padding: '5px 11px', borderRadius: 5, boxShadow: '0 0 22px rgba(52,211,153,.45)' }}>◆ WORTH IT</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ─────────────── PRODUCT STORYBOARD ─────────────── */}
      <section style={{ position: 'relative', zIndex: 1, background: PAPER, borderTop: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)' }}>
          <Reveal style={{ padding: 'clamp(60px,8vw,90px) 0 20px' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT }}>// THE PLATFORM — FORECAST · ANALYZE · DEBATE · TALK · AUTOMATE</div>
          </Reveal>

          {showForYou && (
            <div style={{ marginBottom: 28, borderRadius: 18, border: '1px solid rgba(31,59,255,.22)', background: 'linear-gradient(110deg, rgba(31,59,255,.06), rgba(16,185,129,.03))', padding: 'clamp(16px,3vw,22px) clamp(18px,3vw,26px)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'clamp(12px,3vw,28px)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 800, letterSpacing: '.16em', color: ACCENT, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: ACCENT, boxShadow: `0 0 8px ${ACCENT}` }} />
                TUNED FOR YOU{brain?.usingModel ? ' · BY THE NET' : ''}
              </div>
              {rec && (
                <Link href={rec.href} data-brain={featKey(rec.href)} style={{ fontSize: 15, fontWeight: 600, color: INK, textDecoration: 'none' }}>
                  Based on what you explore, try <b style={{ color: ACCENT }}>{rec.label}</b> →
                </Link>
              )}
              {!!brain?.tickers?.length && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'rgba(10,10,12,.5)' }}>on your radar:</span>
                  {brain.tickers.slice(0, 5).map((t) => (
                    <Link key={t.sym} href={`/stock/${t.sym}`} data-ticker={t.sym} style={{ fontSize: 12, fontWeight: 700, color: '#0a7d56', background: 'rgba(16,185,129,.1)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 6, padding: '3px 9px', textDecoration: 'none' }}>{t.sym}</Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {displayFrames.map((f, fi) => {
            const feat = 'featured' in f && f.featured
            const num = String(fi + 1).padStart(2, '0')
            const tint = (feat && 'tint' in f && f.tint) || 'rgba(16,185,129,'
            const deep = (feat && 'deep' in f && f.deep) || '#0a9d6e'
            const badgeBg = (feat && 'badgeBg' in f && f.badgeBg) || 'linear-gradient(135deg,#34d399,#ffd76a)'
            const badgeInk = (feat && 'badgeInk' in f && f.badgeInk) || '#06281d'
            const statPairs: [string, string][] = f.href === '/brainstock'
              ? [
                  [stats?.winRate != null ? `${stats.winRate.toFixed(1)}%` : 'graded', 'live win rate'],
                  [stats?.stocksDaily != null ? `${stats.stocksDaily}` : '~300', 'stocks / morning'],
                  [(stats?.gradedCalls ?? 0) > 0 ? `${stats!.gradedCalls!.toLocaleString()}+` : 'public', 'calls graded'],
                ]
              : [['≈80%', 'win rate'], ['≈5.0', 'profit factor'], ['MNQ 5-min', 'live-tuned']]
            return (
            <Reveal key={f.href}>
              <Link href={f.href} data-brain={featKey(f.href)} data-brain-surface="home_frames" className="frame-row" style={{ position: 'relative', display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 'clamp(16px,4vw,56px)', alignItems: 'center', padding: feat ? 'clamp(30px,4vw,46px) clamp(18px,3vw,34px)' : 'clamp(30px,4vw,46px) 0', borderTop: feat ? `1px solid ${tint}.35)` : `1px solid ${LINE}`, borderRadius: feat ? 20 : 0, textDecoration: 'none', color: INK, background: feat ? `linear-gradient(110deg, ${tint}.07), ${tint}.015) 60%)` : 'transparent', boxShadow: feat ? `0 0 0 1px ${tint}.18), 0 18px 50px -28px ${tint}.6)` : 'none', margin: feat ? '14px 0' : 0 }}>
                {feat && <span style={{ position: 'absolute', top: -11, left: 'clamp(56px,9vw,96px)', fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 900, letterSpacing: '0.14em', color: badgeInk, background: badgeBg, borderRadius: 999, padding: '4px 12px', boxShadow: `0 4px 16px ${tint}.4)` }}>{('badge' in f && f.badge) as string}</span>}
                <div className="frame-num disp" style={{ fontSize: 'clamp(2.2rem,6vw,4.4rem)', color: feat ? `${tint}.4)` : 'rgba(10,10,12,.18)', transition: 'color .3s, transform .3s', minWidth: '1.6em' }}>{num}</div>
                <div style={{ maxWidth: 720 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.2em', color: feat ? deep : ACCENT, marginBottom: 10 }}>{f.tag}</div>
                  <div className="disp" style={{ fontSize: feat ? 'clamp(1.9rem,4vw,3.1rem)' : 'clamp(1.7rem,3.6vw,2.8rem)', marginBottom: 12 }}>{f.title}</div>
                  <p style={{ fontSize: 'clamp(1rem,1.4vw,1.15rem)', lineHeight: 1.55, color: 'rgba(10,10,12,.62)' }}>{f.line}</p>
                  {feat && <div style={{ display: 'flex', gap: 18, marginTop: 16, flexWrap: 'wrap' }}>
                    {statPairs.map(([v, l]) => (
                      <span key={l} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <b style={{ fontSize: 18, color: deep, fontWeight: 800 }}>{v}</b>
                        <span style={{ fontSize: 11, color: 'rgba(10,10,12,.5)', fontFamily: 'var(--font-mono)', letterSpacing: '.04em' }}>{l}</span>
                      </span>
                    ))}
                  </div>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, whiteSpace: 'nowrap', color: feat ? deep : INK }} className="frame-cta">
                  {f.cta} <ArrowRight size={16} />
                </div>
              </Link>
            </Reveal>
          )})}
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
