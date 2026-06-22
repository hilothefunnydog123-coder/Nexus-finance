import { ImageResponse } from 'next/og'

export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

// iOS home-screen icon — same mark, scaled with proper padding (iOS adds its
// own corner mask, so we keep the tile near-square with generous breathing room).
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
          background: 'linear-gradient(150deg, #101826 0%, #070b14 100%)',
        }}
      >
        <svg width="118" height="118" viewBox="0 0 24 24" fill="none">
          <line x1="3.5" y1="18.5" x2="20.5" y2="18.5" stroke="rgba(255,255,255,0.16)" strokeWidth="0.9" strokeLinecap="round" />
          <polyline
            points="4,16 9.5,11 13.5,13 20,4.5"
            fill="none"
            stroke="#22d3ee"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="20" cy="4.5" r="3.6" fill="#22d3ee" opacity="0.28" />
          <circle cx="20" cy="4.5" r="2" fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  )
}
