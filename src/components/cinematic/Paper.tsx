'use client'

/**
 * PAPER NOIR — the shared cinematic design system (light editorial).
 * Every marketing subpage is built from these so the whole site is one film.
 *   <PaperPage>  full shell: texture bg + nav + dark SiteFooter
 *   <PageHero>   eyebrow + kinetic title + sub
 *   <Section>    spaced content band
 *   Reveal, Kinetic, Magnetic, CountUp, Eyebrow, Stat
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowUpRight, Menu, X } from 'lucide-react'
import SiteFooter from '@/components/SiteFooter'

export const INK = '#0a0a0c'
export const BONE = '#f3f1ea'
export const PAPER = '#fbfaf7'
export const ACCENT = '#1f3bff'
export const GREEN = '#0a9d63'
export const RED = '#e5484d'
export const LINE = 'rgba(10,10,12,.12)'
export const MUTE = 'rgba(10,10,12,.62)'

export function useInView<T extends HTMLElement>(amount = 0.2) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: amount, rootMargin: '0px 0px -8% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [amount])
  return { ref, seen }
}

export function Reveal({ children, delay = 0, y = 30, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .9s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .9s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

export function Kinetic({ children, className, style, accentWords = [] }: { children: string; className?: string; style?: CSSProperties; accentWords?: number[] }) {
  const { ref, seen } = useInView<HTMLHeadingElement>(0.3)
  const words = children.split(' ')
  return (
    <h1 ref={ref} className={`disp ${className ?? ''}`} style={{ ...style, display: 'flex', flexWrap: 'wrap' }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.12em', marginRight: '0.27em' }}>
          <span style={{ display: 'inline-block', color: accentWords.includes(i) ? ACCENT : undefined, transform: seen ? 'translateY(0)' : 'translateY(115%)', opacity: seen ? 1 : 0, transition: `transform 1s cubic-bezier(.16,1,.3,1) ${i * 60}ms, opacity 1s ease ${i * 60}ms` }}>{w}</span>
        </span>
      ))}
    </h1>
  )
}

export function CountUp({ to, decimals = 0, suffix = '', prefix = '' }: { to: number; decimals?: number; suffix?: string; prefix?: string }) {
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

export function Magnetic({ children, href, className, style, strength = 0.4 }: { children: ReactNode; href: string; className?: string; style?: CSSProperties; strength?: number }) {
  const ref = useRef<HTMLAnchorElement>(null)
  return (
    <Link ref={ref} href={href} className={className} style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'transform .3s cubic-bezier(.16,1,.3,1)', willChange: 'transform', ...style }}
      onMouseMove={(e) => { const el = ref.current!; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * strength}px, ${(e.clientY - (r.top + r.height / 2)) * strength}px)` }}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = '' }}>
      {children}
    </Link>
  )
}

export function Eyebrow({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em', color: ACCENT, ...style }}>{children}</div>
}

export function Stat({ value, label }: { value: ReactNode; label: string }) {
  return (
    <div>
      <div className="disp" style={{ fontSize: 'clamp(1.8rem,4vw,3rem)', color: INK, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'rgba(10,10,12,.5)', marginTop: 6 }}>{label}</div>
    </div>
  )
}

const NAV = [
  { label: 'BrainStock', href: '/brainstock' },
  { label: 'Analyzer', href: '/ai-stocks' },
  { label: 'War Room', href: '/war-room' },
  { label: 'Voice', href: '/copilot' },
  { label: 'Courses', href: '/courses' },
]

export function PaperNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menu, setMenu] = useState(false)
  useEffect(() => {
    const f = () => setScrolled(window.scrollY > 20)
    f()
    window.addEventListener('scroll', f, { passive: true })
    return () => window.removeEventListener('scroll', f)
  }, [])
  return (
    <>
      <header style={{ position: 'fixed', top: 0, insetInline: 0, zIndex: 50, transition: 'all .4s', background: scrolled ? 'rgba(243,241,234,.82)' : 'transparent', backdropFilter: scrolled ? 'blur(14px)' : 'none', borderBottom: scrolled ? `1px solid ${LINE}` : '1px solid transparent' }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(18px,4vw,40px)', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 30, height: 30, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, letterSpacing: '-0.04em' }}>YN</span>
            <span className="disp" style={{ fontSize: 18, fontWeight: 700 }}>FINANCE</span>
          </Link>
          <nav style={{ display: 'flex', gap: 30, alignItems: 'center' }} className="pn-desk">
            {NAV.map((l) => <Link key={l.label} href={l.href} className="lk" style={{ fontSize: 14, fontWeight: 600, color: INK, textDecoration: 'none' }}>{l.label}</Link>)}
          </nav>
          <Link href="/brainstock" className="pn-desk" style={{ fontSize: 14, fontWeight: 700, color: PAPER, background: INK, padding: '10px 20px', textDecoration: 'none' }}>Open app</Link>
          <button onClick={() => setMenu(true)} className="pn-mob" style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'none', color: INK }} aria-label="Menu"><Menu /></button>
        </div>
        <style>{`@media(max-width:880px){.pn-desk{display:none!important}.pn-mob{display:block!important}}`}</style>
      </header>
      {menu && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: BONE, padding: '20px clamp(18px,4vw,40px)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 48 }}>
            <span className="disp" style={{ fontSize: 18 }}>FINANCE</span>
            <button onClick={() => setMenu(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: INK }} aria-label="Close"><X /></button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 22, marginTop: 50 }}>
            {NAV.map((l) => <Link key={l.label} href={l.href} onClick={() => setMenu(false)} className="disp" style={{ fontSize: 34, textDecoration: 'none', color: INK }}>{l.label}</Link>)}
            <Link href="/brainstock" onClick={() => setMenu(false)} style={{ marginTop: 16, fontSize: 16, fontWeight: 700, color: PAPER, background: INK, padding: '14px 22px', textAlign: 'center', textDecoration: 'none' }}>Open app</Link>
          </div>
        </div>
      )}
    </>
  )
}

/** Full page shell with texture, nav and the dark closing footer. */
export function PaperPage({ children }: { children: ReactNode }) {
  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', position: 'relative', minHeight: '100vh' }}>
      <style>{`
        @keyframes pn-grid{to{background-position:48px 48px}}
        @keyframes pn-blink{0%,100%{opacity:1}50%{opacity:.2}}
        .lk{position:relative}.lk::after{content:"";position:absolute;left:0;bottom:-3px;height:1.5px;width:0;background:${INK};transition:width .35s cubic-bezier(.16,1,.3,1)}.lk:hover::after{width:100%}
        .disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-0.045em;line-height:0.95}
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
      `}</style>
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: `linear-gradient(${LINE} 1px,transparent 1px),linear-gradient(90deg,${LINE} 1px,transparent 1px)`, backgroundSize: '48px 48px', opacity: 0.45, animation: 'pn-grid 12s linear infinite', maskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, #000 20%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 100% 80% at 50% 0%, #000 20%, transparent 75%)' }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: 0.5, mixBlendMode: 'multiply', backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22120%22 height=%22120%22%3E%3Cfilter id=%22n%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.85%22 numOctaves=%222%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23n)%22 opacity=%220.035%22/%3E%3C/svg%3E")' }} />
      <PaperNav />
      <main style={{ position: 'relative', zIndex: 1 }}>{children}</main>
      <div style={{ position: 'relative', zIndex: 1 }}><SiteFooter /></div>
    </div>
  )
}

/** Standard page hero: eyebrow + big kinetic title + optional sub + actions. */
export function PageHero({ eyebrow, title, sub, accentWords, actions }: { eyebrow: string; title: string; sub?: ReactNode; accentWords?: number[]; actions?: ReactNode }) {
  return (
    <section style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(130px,18vw,210px) clamp(18px,4vw,40px) clamp(40px,7vw,90px)' }}>
      <Reveal><Eyebrow style={{ marginBottom: 26 }}>{eyebrow}</Eyebrow></Reveal>
      <Kinetic accentWords={accentWords} style={{ fontSize: 'clamp(2.4rem,7vw,5.4rem)', maxWidth: 1000 }}>{title}</Kinetic>
      {sub && <Reveal delay={220} style={{ marginTop: 26, maxWidth: 640 }}><p style={{ fontSize: 'clamp(1.05rem,1.6vw,1.3rem)', lineHeight: 1.6, color: MUTE }}>{sub}</p></Reveal>}
      {actions && <Reveal delay={360} style={{ marginTop: 36, display: 'flex', gap: 14, flexWrap: 'wrap' }}>{actions}</Reveal>}
    </section>
  )
}

export function Section({ children, style, bg }: { children: ReactNode; style?: CSSProperties; bg?: string }) {
  return (
    <section style={{ background: bg, borderTop: bg ? `1px solid ${LINE}` : undefined }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(50px,8vw,100px) clamp(18px,4vw,40px)', ...style }}>{children}</div>
    </section>
  )
}
