import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS home-screen icon — same YN monogram + rising-trend accent, scaled up.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          background: 'linear-gradient(150deg, #101826 0%, #070b14 100%)',
        }}
      >
        <svg width="180" height="180" viewBox="0 0 32 32" fill="none" style={{ position: 'absolute', top: 0, left: 0 }}>
          <polyline points="6,24.5 26,18.5" stroke="#22d3ee" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="26" cy="18.5" r="2.6" fill="#22d3ee" opacity="0.28" />
          <circle cx="26" cy="18.5" r="1.4" fill="#ffffff" />
        </svg>
        <span
          style={{
            position: 'relative',
            marginTop: -26,
            color: '#ffffff',
            fontSize: 84,
            fontWeight: 800,
            fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
            letterSpacing: -6,
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
