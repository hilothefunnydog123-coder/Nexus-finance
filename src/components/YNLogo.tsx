'use client'

// ── YN Finance Logo System ────────────────────────────────────────────────────
// The Mark: a stylized "Y" formed as a bullish breakout chart pattern —
// two price lines converging at a pivot node, with a downward stem.
// The pivot circle + horizontal body tick = embedded candlestick motif.
// Works at any size; gradient ids are stable since colors are identical
// across instances.

export function YNMark({ size = 32, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
    >
      <defs>
        {/* Background gradient — diagonal, brand teal → blue → purple */}
        <linearGradient id="yn-grad" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#00d4aa"/>
          <stop offset="52%"  stopColor="#1e90ff"/>
          <stop offset="100%" stopColor="#a855f7"/>
        </linearGradient>
        {/* Inner top-highlight for depth */}
        <linearGradient id="yn-hi" x1="0" y1="0" x2="0" y2="18" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.18"/>
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0"/>
        </linearGradient>
        {glow && (
          <filter id="yn-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.8" result="blur"/>
            <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        )}
      </defs>

      {/* Rounded square background */}
      <rect width="40" height="40" rx="9" fill="url(#yn-grad)"/>

      {/* Inner highlight — top sheen for 3D feel */}
      <rect width="40" height="21" rx="9" fill="url(#yn-hi)"/>

      {/* ── THE Y MARK (breakout chart motif) ───────────────────────────── */}
      {/* Left arm: price line descending to pivot (upper-left → center) */}
      <line x1="11"  y1="8.5" x2="20" y2="20.5"
        stroke="white" strokeWidth="3.6" strokeLinecap="round"
        filter={glow ? 'url(#yn-glow)' : undefined}/>
      {/* Right arm: price line ascending from pivot (upper-right → center) */}
      <line x1="29"  y1="8.5" x2="20" y2="20.5"
        stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
      {/* Stem: support/trend continuation downward */}
      <line x1="20"  y1="20.5" x2="20" y2="32"
        stroke="white" strokeWidth="3.6" strokeLinecap="round"/>

      {/* ── CANDLESTICK BODY at pivot (open/close indicator) ───────────── */}
      <rect x="16.8" y="19.2" width="6.4" height="2.8" rx="0.7"
        fill="white" fillOpacity="0.42"/>

      {/* ── PIVOT NODE at junction center ──────────────────────────────── */}
      <circle cx="20" cy="20.5" r="2.2"
        fill="white" fillOpacity="0.9"/>

      {/* ── ARM TIP DOTS (candle wick ends) ────────────────────────────── */}
      <circle cx="11"  cy="8.5" r="2" fill="white" fillOpacity="0.75"/>
      <circle cx="29"  cy="8.5" r="2" fill="white" fillOpacity="0.75"/>

      {/* ── SUBTLE BOTTOM STEM TICK (take-profit level) ─────────────────── */}
      <line x1="17.5" y1="31.5" x2="22.5" y2="31.5"
        stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeOpacity="0.35"/>
    </svg>
  )
}

// Full logo: mark + wordmark
export default function YNLogo({
  size        = 32,
  showTagline = false,
  color       = '#ffffff',
}: {
  size?:        number
  showTagline?: boolean
  color?:       string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: Math.round(size * 0.3) }}>
      <YNMark size={size}/>
      <div style={{ lineHeight: 1 }}>
        <div style={{
          fontWeight:     900,
          fontSize:       Math.round(size * 0.46),
          letterSpacing:  '-0.03em',
          color,
          fontFamily:     '"Inter",system-ui,-apple-system,sans-serif',
          lineHeight:     1.1,
        }}>
          YN Finance
        </div>
        {showTagline && (
          <div style={{
            fontSize:    Math.round(size * 0.21),
            letterSpacing: '0.16em',
            color:       '#00d4aa',
            fontFamily:  '"SF Mono",ui-monospace,monospace',
            marginTop:   3,
            opacity:     0.6,
          }}>
            LEARN TO TRADE
          </div>
        )}
      </div>
    </div>
  )
}
