'use client'

/**
 * OBSIDIAN DESK — the product/tool design system (premium dark terminal).
 * Used by the actual features (BrainStock, Analyzer, War Room, Fund, …) — the
 * counterpoint to the light "Paper Noir" marketing pages.
 *   <DeskShell title back accent>   dark cockpit bg + unified terminal top bar
 *   <Panel>                          hairline glass panel (sharp corners)
 *   Reveal, Eyebrow, DeskStat, Pill
 */

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export const VOID = '#06070c'
export const BASE = '#0a0c12'
export const PANEL = 'rgba(255,255,255,.025)'
export const BORDER = 'rgba(255,255,255,.08)'
export const CYAN = '#22d3ee'
export const VIOLET = '#a78bfa'
export const GREEN = '#34d399'
export const RED = '#f87171'
export const TXT = '#e7ecf5'
export const MUTE = '#8a93a8'
export const FAINT = '#4a5e7a'

export function useInView<T extends HTMLElement>(amount = 0.16) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: amount, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [amount])
  return { ref, seen }
}

export function Reveal({ children, delay = 0, y = 24, className, style }: { children: ReactNode; delay?: number; y?: number; className?: string; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return (
    <div ref={ref} className={className} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>
      {children}
    </div>
  )
}

export function Eyebrow({ children, color = CYAN, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color, ...style }}>{children}</div>
}

export function Panel({ children, glow = CYAN, className, style, spotlight = true }: { children: ReactNode; glow?: string; className?: string; style?: CSSProperties; spotlight?: boolean }) {
  return (
    <div {...(spotlight ? { 'data-spotlight': '' } : {})} className={className} style={{ position: 'relative', background: PANEL, border: `1px solid ${BORDER}`, backdropFilter: 'blur(10px)', transition: `border-color .3s, box-shadow .3s`, ...style }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${glow}55, transparent)` }} />
      {children}
    </div>
  )
}

export function DeskStat({ value, label, color = TXT }: { value: ReactNode; label: string; color?: string }) {
  return (
    <div>
      <div style={{ fontSize: 'clamp(1.6rem,3.4vw,2.4rem)', fontWeight: 800, letterSpacing: '-0.03em', color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT, marginTop: 6 }}>{label}</div>
    </div>
  )
}

export function Pill({ children, color = CYAN }: { children: ReactNode; color?: string }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em', color, border: `1px solid ${color}40`, background: `${color}12`, padding: '5px 11px', borderRadius: 100 }}>{children}</span>
}

/** Unified terminal top-bar + cockpit background. */
export function DeskShell({ children, title, accent = CYAN, back = '/', live = true }: { children: ReactNode; title: string; accent?: string; back?: string; live?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: VOID, color: TXT, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes dk-blink{0%,100%{opacity:1}50%{opacity:.25}}
        .dk-lk{position:relative}.dk-lk::after{content:"";position:absolute;left:0;bottom:-3px;height:1px;width:0;background:currentColor;transition:width .3s}.dk-lk:hover::after{width:100%}
      `}</style>
      {/* cockpit atmosphere */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', background: `radial-gradient(1100px 560px at 14% -10%, ${accent}18, transparent 55%), radial-gradient(900px 500px at 90% -4%, ${VIOLET}14, transparent 52%)` }} />
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(rgba(255,255,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.018) 1px,transparent 1px)', backgroundSize: '46px 46px', maskImage: 'radial-gradient(ellipse 90% 60% at 50% 16%,#000,transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 16%,#000,transparent 80%)' }} />

      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(6,7,12,.72)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1280, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', color: TXT, flexShrink: 0 }}>
              <span style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: VOID, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12, letterSpacing: '-0.04em' }}>YN</span>
            </Link>
            <span style={{ color: BORDER }}>/</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{title}</span>
            {live && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.1em', color: GREEN, flexShrink: 0 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: GREEN, animation: 'dk-blink 1.4s infinite' }} /> LIVE
              </span>
            )}
          </div>
          <Link href={back} className="dk-lk" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTE, textDecoration: 'none', flexShrink: 0 }}>
            <ArrowLeft size={14} /> {back === '/' ? 'YN Finance' : 'Back'}
          </Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1 }}>{children}</main>
    </div>
  )
}
