'use client'

/**
 * YN Edge — shared client primitives + design tokens. The three visual surfaces
 * (board, market detail, track record) all build on these so the look stays
 * unified and nothing collides. Aesthetic = the OBSIDIAN DESK terminal.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Scale, ArrowRight, CheckCircle2 } from 'lucide-react'
import type { EdgeEngine, EdgeRow } from '@/lib/edge/types'

// Desk palette (kept local so components are self-contained).
export const VOID = '#06070c'
export const PANEL = 'rgba(255,255,255,.025)'
export const BORDER = 'rgba(255,255,255,.08)'
export const CYAN = '#22d3ee'
export const VIOLET = '#a78bfa'
export const GREEN = '#34d399'
export const RED = '#f87171'
export const AMBER = '#fbbf24'
export const TXT = '#e7ecf5'
export const MUTE = '#8a93a8'
export const FAINT = '#4a5e7a'
export const MONO = 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace'

/** Respect prefers-reduced-motion everywhere (gates ALL motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const on = () => setReduced(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return reduced
}

// ── formatters ───────────────────────────────────────────────────────────────
export const pct = (x: number, d = 0) => `${(x * 100).toFixed(d)}%`
export const signedPct = (x: number, d = 1) => `${x >= 0 ? '+' : ''}${(x * 100).toFixed(d)}`
export function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`
  return n.toLocaleString('en-US')
}
export function timeToClose(closeISO: string): string {
  const ms = new Date(closeISO).getTime() - Date.now()
  if (ms <= 0) return 'closed'
  const d = Math.floor(ms / 86_400_000)
  if (d >= 1) return `${d}d`
  const h = Math.floor(ms / 3_600_000)
  if (h >= 1) return `${h}h`
  return `${Math.max(1, Math.floor(ms / 60_000))}m`
}

export function engineLabel(e: EdgeEngine): { label: string; color: string } {
  if (e === 'brainstock-nn') return { label: 'NEURAL NET', color: CYAN }
  if (e === 'gemini-grounded') return { label: 'GROUNDED AI', color: VIOLET }
  return { label: 'BASELINE', color: FAINT }
}

export function catColor(cat: string): string {
  switch (cat) {
    case 'Crypto': return AMBER
    case 'Financials': return CYAN
    case 'Economics': return GREEN
    case 'Politics': return VIOLET
    case 'Weather': return '#60a5fa'
    case 'Tech': return '#f472b6'
    default: return MUTE
  }
}

// ── primitives ───────────────────────────────────────────────────────────────
export function Tag({ children, color = CYAN, style }: { children: ReactNode; color?: string; style?: CSSProperties }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color, border: `1px solid ${color}40`, background: `${color}14`, padding: '3px 8px', borderRadius: 4, ...style }}>
      {children}
    </span>
  )
}

export function EngineBadge({ engine }: { engine: EdgeEngine }) {
  const { label, color } = engineLabel(engine)
  return <Tag color={color}>{label}</Tag>
}

export function WorthBadge({ worthIt }: { worthIt: boolean }) {
  const color = worthIt ? GREEN : FAINT
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: worthIt ? VOID : MUTE, background: worthIt ? GREEN : 'transparent', border: `1px solid ${color}${worthIt ? '' : '55'}`, padding: '4px 10px', borderRadius: 4, textTransform: 'uppercase', boxShadow: worthIt ? `0 0 22px ${GREEN}55` : 'none' }}>
      {worthIt
        ? <><CheckCircle2 size={13} strokeWidth={2.5} style={{ flexShrink: 0 }} /> WORTH IT</>
        : 'PASS'}
    </span>
  )
}

/**
 * The guided "path" rail — board → market → proof. Shown on every Edge surface so
 * the four steps read as one flow. The current step is highlighted; the others are
 * quiet links you can jump to.
 */
export type EdgeStep = 'board' | 'detail' | 'record'
const PATH_STEPS: { key: EdgeStep; n: string; label: string; href: string }[] = [
  { key: 'board', n: '01', label: 'The board', href: '/edge' },
  { key: 'detail', n: '02', label: 'The breakdown', href: '/edge' },
  { key: 'record', n: '03', label: 'The proof', href: '/edge/track-record' },
]

export function PathRail({ active }: { active: EdgeStep }) {
  return (
    <nav
      aria-label="YN Edge steps"
      style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase' }}
    >
      {PATH_STEPS.map((s, i) => {
        const isActive = s.key === active
        // step 02 (the breakdown) has no list page — it's reached by clicking a market
        const interactive = !isActive && s.key !== 'detail'
        const content = (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, color: isActive ? CYAN : s.key === 'detail' ? FAINT : MUTE, fontWeight: isActive ? 700 : 500 }}>
            <span style={{ color: isActive ? CYAN : FAINT }}>{s.n}</span>
            {s.label}
          </span>
        )
        return (
          <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {interactive ? (
              <a href={s.href} style={{ textDecoration: 'none' }}>{content}</a>
            ) : content}
            {i < PATH_STEPS.length - 1 && <ArrowRight aria-hidden size={12} style={{ color: FAINT, opacity: 0.6, flexShrink: 0 }} />}
          </span>
        )
      })}
    </nav>
  )
}

/**
 * The signature visual: our probability vs the market's, as opposing bars on a
 * shared 0–100% track. The gap between them IS the edge.
 */
export function HeadToHead({ ynProb, marketProb, side, animate = true, height = 30 }: { ynProb: number; marketProb: number; side?: 'YES' | 'NO'; animate?: boolean; height?: number }) {
  const reduced = useReducedMotion()
  const on = animate && !reduced
  const edge = ynProb - marketProb
  const edgeColor = edge >= 0 ? GREEN : RED
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
      <Bar label="OUR AI" value={ynProb} color={CYAN} animate={on} height={height} emphasis />
      <Bar label="MARKET" value={marketProb} color={MUTE} animate={on} height={height} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: MONO, fontSize: 10.5, color: FAINT, letterSpacing: '0.08em' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Scale size={12} style={{ flexShrink: 0 }} />
          {side ? `OUR SIDE · ${side}` : 'AI vs MARKET'}
        </span>
        <span
          style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: edgeColor, fontWeight: 700, border: `1px solid ${edgeColor}40`, background: `${edgeColor}14`, padding: '2px 8px', borderRadius: 4 }}
        >
          {edge >= 0 ? '+' : ''}{(edge * 100).toFixed(1)}pt EDGE
        </span>
      </div>
    </div>
  )
}

function Bar({ label, value, color, animate, height, emphasis }: { label: string; value: number; color: string; animate: boolean; height: number; emphasis?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 56, flexShrink: 0, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.1em', color: emphasis ? color : FAINT, textAlign: 'right' }}>{label}</span>
      <div style={{ position: 'relative', flex: 1, height, background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, width: `${Math.max(2, Math.min(100, value * 100))}%`, background: emphasis ? `linear-gradient(90deg, ${color}cc, ${color})` : `${color}55`, transition: animate ? 'width 1s cubic-bezier(.16,1,.3,1)' : 'none', boxShadow: emphasis ? `0 0 16px ${color}66` : 'none' }} />
        <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontFamily: MONO, fontSize: 12, fontWeight: 700, color: TXT, fontVariantNumeric: 'tabular-nums' }}>{(value * 100).toFixed(0)}%</span>
      </div>
    </div>
  )
}

/**
 * Tasteful dark, overlaid background image for hero/detail textures. Plain <img>
 * with lazy loading + onError hide. Picsum seed for reliability. Sits BEHIND a
 * dark gradient so foreground text always reads.
 */
export function TextureBg({ seed, opacity = 0.22, overlay = `linear-gradient(180deg, ${VOID}cc, ${VOID}f2)` }: { seed: string; opacity?: number; overlay?: string }) {
  return (
    <span aria-hidden style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      <img
        src={`https://picsum.photos/seed/${seed}/1600/900`}
        alt=""
        loading="lazy"
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity, filter: 'grayscale(0.4) contrast(1.05)' }}
      />
      <span style={{ position: 'absolute', inset: 0, background: overlay }} />
    </span>
  )
}

/** Mini stat block. */
export function Stat({ label, value, color = TXT, sub }: { label: string; value: ReactNode; color?: string; sub?: ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 'clamp(1.1rem,2.2vw,1.5rem)', fontWeight: 800, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT, marginTop: 4 }}>{label}</div>
      {sub != null && <div style={{ fontSize: 11, color: MUTE, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

export function edgeAccent(edge: number): string {
  if (edge >= 0.12) return GREEN
  if (edge >= 0.07) return CYAN
  if (edge >= 0) return MUTE
  return RED
}

export type { EdgeRow }
