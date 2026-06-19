'use client'

/**
 * "Terminal Noir" cinematic motion primitives — zero dependencies, GPU-only.
 * Drop-in building blocks for a Y-Combinator-grade landing page:
 *   <AuroraBackground/>  living animated mesh + grain
 *   <Reveal/>            scroll-triggered fade/slide/scale (IntersectionObserver)
 *   <KineticHeadline/>   per-word staggered reveal
 *   <MagneticButton/>    cursor-magnetic CTA with glow
 *   <SpotlightCard/>     frosted glass with a pointer-following highlight
 *   <Marquee/>           infinite ticker strip
 *   <CountUp/>           number that counts up when scrolled into view
 *
 * Respects prefers-reduced-motion. Tailwind v4 + React 19 / Next 16 (RSC-safe).
 */

import {
  Children,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

const EASE = 'cubic-bezier(.16,1,.3,1)'
const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/* ────────────────────────────────────────────────────────────── useInView */
function useInView<T extends HTMLElement>(opts: { once?: boolean; margin?: string; amount?: number } = {}) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (reduced()) {
      setInView(true)
      return
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true)
          if (opts.once !== false) io.unobserve(el)
        } else if (opts.once === false) {
          setInView(false)
        }
      },
      { rootMargin: opts.margin ?? '0px 0px -12% 0px', threshold: opts.amount ?? 0.2 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [opts.once, opts.margin, opts.amount])
  return { ref, inView }
}

/* ────────────────────────────────────────────────────────────── Reveal */
type Variant = 'up' | 'down' | 'left' | 'right' | 'scale' | 'blur'
const offset: Record<Variant, string> = {
  up: 'translateY(34px)',
  down: 'translateY(-34px)',
  left: 'translateX(44px)',
  right: 'translateX(-44px)',
  scale: 'scale(.92)',
  blur: 'translateY(20px)',
}

export function Reveal({
  children,
  variant = 'up',
  delay = 0,
  duration = 800,
  className,
  style,
  as: Tag = 'div',
}: {
  children: ReactNode
  variant?: Variant
  delay?: number
  duration?: number
  className?: string
  style?: CSSProperties
  as?: 'div' | 'section' | 'span' | 'li'
}) {
  const { ref, inView } = useInView<HTMLDivElement>()
  const Comp = Tag as 'div'
  return (
    <Comp
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: inView ? 1 : 0,
        filter: variant === 'blur' ? (inView ? 'blur(0)' : 'blur(10px)') : undefined,
        transform: inView ? 'none' : offset[variant],
        transition: `opacity ${duration}ms ${EASE} ${delay}ms, transform ${duration}ms ${EASE} ${delay}ms, filter ${duration}ms ${EASE} ${delay}ms`,
        willChange: 'opacity, transform',
      }}
    >
      {children}
    </Comp>
  )
}

/** Staggers its direct children in sequence as the group enters view. */
export function RevealGroup({
  children,
  stagger = 90,
  variant = 'up',
  className,
  style,
}: {
  children: ReactNode
  stagger?: number
  variant?: Variant
  className?: string
  style?: CSSProperties
}) {
  return (
    <div className={className} style={style}>
      {Children.map(children, (child, i) => (
        <Reveal variant={variant} delay={i * stagger}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}

/* ───────────────────────────────────────────────────── KineticHeadline */
export function KineticHeadline({
  text,
  className,
  style,
  wordDelay = 70,
}: {
  text: string
  className?: string
  style?: CSSProperties
  wordDelay?: number
}) {
  const { ref, inView } = useInView<HTMLHeadingElement>()
  const words = text.split(' ')
  return (
    <h1 ref={ref} className={className} style={{ ...style, display: 'flex', flexWrap: 'wrap' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.08em', marginRight: '0.26em' }}>
          <span
            style={{
              display: 'inline-block',
              transform: inView ? 'translateY(0)' : 'translateY(110%)',
              opacity: inView ? 1 : 0,
              transition: `transform 900ms ${EASE} ${i * wordDelay}ms, opacity 900ms ${EASE} ${i * wordDelay}ms`,
              willChange: 'transform',
            }}
          >
            {w}
          </span>
        </span>
      ))}
    </h1>
  )
}

/* ──────────────────────────────────────────────────────── MagneticButton */
export function MagneticButton({
  children,
  strength = 0.32,
  className,
  style,
  onClick,
  href,
}: {
  children: ReactNode
  strength?: number
  className?: string
  style?: CSSProperties
  onClick?: () => void
  href?: string
}) {
  const ref = useRef<HTMLAnchorElement & HTMLButtonElement>(null)
  const raf = useRef<number>(0)
  const target = useRef({ x: 0, y: 0 })
  const cur = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const tick = () => {
      cur.current.x += (target.current.x - cur.current.x) * 0.18
      cur.current.y += (target.current.y - cur.current.y) * 0.18
      const el = ref.current
      if (el) el.style.transform = `translate(${cur.current.x.toFixed(2)}px, ${cur.current.y.toFixed(2)}px)`
      raf.current = requestAnimationFrame(tick)
    }
    if (!reduced()) raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [])

  const move = (e: React.MouseEvent) => {
    if (reduced()) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    target.current = {
      x: (e.clientX - (r.left + r.width / 2)) * strength,
      y: (e.clientY - (r.top + r.height / 2)) * strength,
    }
  }
  const leave = () => (target.current = { x: 0, y: 0 })

  const common = {
    ref,
    onMouseMove: move,
    onMouseLeave: leave,
    onClick,
    className,
    style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', willChange: 'transform', ...style },
  }
  return href ? (
    <a href={href} {...common}>
      {children}
    </a>
  ) : (
    <button {...common}>{children}</button>
  )
}

/* ───────────────────────────────────────────────────────── SpotlightCard */
export function SpotlightCard({
  children,
  className,
  style,
  glow = '#22d3ee',
}: {
  children: ReactNode
  className?: string
  style?: CSSProperties
  glow?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x: -200, y: -200, on: false })
  return (
    <div
      ref={ref}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect()
        setPos({ x: e.clientX - r.left, y: e.clientY - r.top, on: true })
      }}
      onMouseLeave={() => setPos((p) => ({ ...p, on: false }))}
      className={className}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'rgba(255,255,255,.025)',
        border: '1px solid rgba(255,255,255,.09)',
        backdropFilter: 'blur(10px)',
        transition: `border-color .3s ${EASE}, transform .3s ${EASE}`,
        borderColor: pos.on ? `${glow}66` : 'rgba(255,255,255,.09)',
        ...style,
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: pos.on ? 1 : 0,
          transition: 'opacity .35s ease',
          background: `radial-gradient(360px circle at ${pos.x}px ${pos.y}px, ${glow}1f, transparent 60%)`,
        }}
      />
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  )
}

/* ──────────────────────────────────────────────────────── AuroraBackground */
export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={className} aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden', background: '#05070d' }}>
      <style>{`
        @keyframes aurora1{0%{transform:translate(-10%,-10%) rotate(0)}50%{transform:translate(10%,6%) rotate(180deg)}100%{transform:translate(-10%,-10%) rotate(360deg)}}
        @keyframes aurora2{0%{transform:translate(8%,12%) scale(1)}50%{transform:translate(-8%,-6%) scale(1.25)}100%{transform:translate(8%,12%) scale(1)}}
        @media (prefers-reduced-motion: reduce){.aur{animation:none !important}}
      `}</style>
      <div className="aur" style={{ position: 'absolute', top: '-30%', left: '-10%', width: '70vw', height: '70vw', borderRadius: '50%', filter: 'blur(120px)', opacity: 0.5, background: 'radial-gradient(circle, rgba(34,211,238,.28), transparent 60%)', animation: 'aurora1 26s linear infinite' }} />
      <div className="aur" style={{ position: 'absolute', bottom: '-30%', right: '-10%', width: '60vw', height: '60vw', borderRadius: '50%', filter: 'blur(130px)', opacity: 0.4, background: 'radial-gradient(circle, rgba(167,139,250,.26), transparent 60%)', animation: 'aurora2 32s ease-in-out infinite' }} />
      {/* fine grain so gradients never look like cheap "AI slop" washes */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.04, mixBlendMode: 'overlay', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.9%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22/%3E%3C/svg%3E")' }} />
      {/* hairline blueprint grid */}
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.02) 1px,transparent 1px)', backgroundSize: '48px 48px', maskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%,#000,transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 70% at 50% 30%,#000,transparent 80%)' }} />
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────── Marquee */
export function Marquee({ items, speed = 30, className }: { items: ReactNode[]; speed?: number; className?: string }) {
  const doubled = useMemo(() => [...items, ...items], [items])
  return (
    <div className={className} style={{ overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 8%,#000 92%,transparent)' }}>
      <style>{`@keyframes mq{to{transform:translateX(-50%)}}@media (prefers-reduced-motion:reduce){.mq{animation:none}}`}</style>
      <div className="mq" style={{ display: 'inline-flex', gap: 40, whiteSpace: 'nowrap', animation: `mq ${speed}s linear infinite`, willChange: 'transform' }}>
        {doubled.map((it, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center' }}>{it}</span>
        ))}
      </div>
    </div>
  )
}

/* ───────────────────────────────────────────────────────────────── CountUp */
export function CountUp({ to, duration = 1400, prefix = '', suffix = '', decimals = 0, className, style }: { to: number; duration?: number; prefix?: string; suffix?: string; decimals?: number; className?: string; style?: CSSProperties }) {
  const { ref, inView } = useInView<HTMLSpanElement>()
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!inView) return
    if (reduced()) {
      setVal(to)
      return
    }
    let start = 0
    const t0 = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(to * eased)
      if (p < 1) start = requestAnimationFrame(tick)
    }
    start = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(start)
  }, [inView, to, duration])
  return (
    <span ref={ref} className={className} style={style}>
      {prefix}
      {val.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}
