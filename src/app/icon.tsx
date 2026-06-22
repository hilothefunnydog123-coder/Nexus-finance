import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

// YN monogram, custom treatment: bold tight "YN" on deep ink, with a single
// cyan rising-trend underline + peak node as the only accent. Reads "YN,
// trending up" — on-brand, professional, and unmistakably the brand letters.
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
          position: 'relative',
          borderRadius: 8,
          background: 'linear-gradient(150deg, #101826 0%, #070b14 100%)',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.10)',
        }}
      >
        {/* rising-trend accent + peak node */}
        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <polyline points="5,25 27,18.5" stroke="#22d3ee" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="27" cy="18.5" r="3.4" fill="#22d3ee" opacity="0.28" />
          <circle cx="27" cy="18.5" r="1.7" fill="#ffffff" />
        </svg>
        {/* YN */}
        <span
          style={{
            position: 'relative',
            marginTop: -5,
            color: '#ffffff',
            fontSize: 15,
            fontWeight: 800,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            letterSpacing: -1.2,
            lineHeight: 1,
          }}
        >
          YN
        </span>
      </div>
    ),
    { ...size }
  )
}
