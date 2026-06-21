/* ════════════════════════════════════════════════════════════════════════
   Shared Open Graph card template (1200×630) for next/og ImageResponse.
   Paper-noir on dark: ink ground, bone type, cobalt accent. One function
   so every route's social card stays visually consistent. Used by the
   per-route opengraph-image.tsx files.
   ════════════════════════════════════════════════════════════════════════ */
import type { ReactElement } from 'react'

export const OG_SIZE = { width: 1200, height: 630 }
export const OG_CONTENT_TYPE = 'image/png'

const INK = '#0a0a0c'
const BONE = '#f3f1ea'
const ACCENT = '#1f3bff'
const MUTE = 'rgba(243,241,234,.55)'

export type OgChip = { v: string; l: string }

export function ogCard(opts: {
  tag: string
  title: string
  subtitle?: string
  accent?: string
  chips?: OgChip[]
  badge?: string
}): ReactElement {
  const accent = opts.accent || ACCENT
  return (
    <div
      style={{
        width: 1200, height: 630, background: INK, color: BONE,
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
        padding: '64px 72px',
      }}
    >
      {/* drifting grid */}
      <div style={{ position: 'absolute', inset: 0, opacity: 0.06, display: 'flex',
        backgroundImage: 'linear-gradient(rgba(243,241,234,1) 1px, transparent 1px), linear-gradient(90deg, rgba(243,241,234,1) 1px, transparent 1px)',
        backgroundSize: '52px 52px' }} />
      {/* accent glow */}
      <div style={{ position: 'absolute', top: -160, right: -120, width: 520, height: 520, display: 'flex',
        background: `radial-gradient(ellipse, ${accent}33, transparent 70%)` }} />

      {/* top row — logo + badge */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 46, height: 46, background: BONE, color: INK, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 19, letterSpacing: -1 }}>YN</div>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 4, display: 'flex' }}>FINANCE</div>
        </div>
        {opts.badge && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, border: `1px solid ${accent}`, color: accent, borderRadius: 100, padding: '8px 20px', fontSize: 18, fontWeight: 700 }}>
            {opts.badge}
          </div>
        )}
      </div>

      {/* middle — kicker + title + subtitle */}
      <div style={{ display: 'flex', flexDirection: 'column', position: 'relative', maxWidth: 1000 }}>
        <div style={{ fontSize: 20, letterSpacing: 5, color: accent, fontWeight: 700, marginBottom: 22, display: 'flex' }}>{opts.tag}</div>
        <div style={{ fontSize: opts.title.length > 34 ? 64 : 78, fontWeight: 900, letterSpacing: -2, lineHeight: 1.02, display: 'flex' }}>{opts.title}</div>
        {opts.subtitle && (
          <div style={{ fontSize: 27, color: MUTE, marginTop: 26, lineHeight: 1.35, maxWidth: 920, display: 'flex' }}>{opts.subtitle}</div>
        )}
      </div>

      {/* bottom — chips + url */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', position: 'relative' }}>
        <div style={{ display: 'flex', gap: 16 }}>
          {(opts.chips || []).map((c) => (
            <div key={c.l} style={{ display: 'flex', flexDirection: 'column', border: '1px solid rgba(243,241,234,.16)', padding: '14px 22px' }}>
              <div style={{ fontSize: 30, fontWeight: 900, fontFamily: 'monospace', display: 'flex' }}>{c.v}</div>
              <div style={{ fontSize: 13, color: MUTE, letterSpacing: 2, textTransform: 'uppercase', marginTop: 4, display: 'flex' }}>{c.l}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 18, color: MUTE, fontFamily: 'monospace', display: 'flex' }}>ynfinance.org</div>
      </div>

      {/* accent bottom bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 6, background: accent, display: 'flex' }} />
    </div>
  )
}
