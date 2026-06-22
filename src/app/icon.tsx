import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// YN Finance / BrainStock mark: a deep-ink tile with a single crisp "rising
// signal" glyph — the neural-forecast brand, monochrome + one accent. No
// rainbow gradient, no letterforms mushing at 16px.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 8,
          background: 'linear-gradient(150deg, #101826 0%, #070b14 100%)',
          // crisp inner hairline for definition at small sizes
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {/* baseline */}
          <line x1="3.5" y1="18.5" x2="20.5" y2="18.5" stroke="rgba(255,255,255,0.14)" strokeWidth="1" strokeLinecap="round" />
          {/* the rising signal */}
          <polyline
            points="4,16 9.5,11 13.5,13 20,4.5"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* peak node */}
          <circle cx="20" cy="4.5" r="3.6" fill="#22d3ee" opacity="0.28" />
          <circle cx="20" cy="4.5" r="2" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
