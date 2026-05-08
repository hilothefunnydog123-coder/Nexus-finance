import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'YN Finance — Learn to Trade for $0.99'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: '#040c14',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.05,
          backgroundImage: 'linear-gradient(#00d4aa 1px, transparent 1px), linear-gradient(90deg, #00d4aa 1px, transparent 1px)',
          backgroundSize: '60px 60px', display: 'flex' }} />

        {/* Teal glow */}
        <div style={{ position: 'absolute', top: '30%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 700, height: 400, background: 'radial-gradient(ellipse, rgba(0,212,170,0.12), transparent)', display: 'flex' }} />

        {/* Purple glow right */}
        <div style={{ position: 'absolute', top: '60%', right: -100,
          width: 400, height: 400, background: 'radial-gradient(ellipse, rgba(168,85,247,0.1), transparent)', display: 'flex' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 32 }}>
          <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#040c14', display: 'flex' }}>⚡</div>
          </div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, display: 'flex' }}>
            YN <span style={{ color: '#00d4aa', fontWeight: 300, marginLeft: 10, letterSpacing: 6 }}>FINANCE</span>
          </div>
        </div>

        {/* Main headline */}
        <div style={{ fontSize: 62, fontWeight: 900, color: '#fff', letterSpacing: -3, textAlign: 'center', lineHeight: 1.05, marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          Learn to trade from
          <span style={{ background: 'linear-gradient(135deg, #00d4aa, #1e90ff, #a855f7)', WebkitBackgroundClip: 'text', color: 'transparent', display: 'flex' }}>
            the best in the world.
          </span>
        </div>

        {/* Subtext */}
        <div style={{ fontSize: 22, color: '#7f93b5', textAlign: 'center', marginBottom: 44, maxWidth: 740, display: 'flex' }}>
          Ross Cameron · ICT · Graham Stephan · Kevin O&apos;Leary · 5 more
        </div>

        {/* Price pill */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(0,212,170,0.12)', border: '1px solid rgba(0,212,170,0.3)', borderRadius: 100, padding: '12px 32px', marginBottom: 40 }}>
          <div style={{ fontSize: 32, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace', display: 'flex' }}>$0.99</div>
          <div style={{ fontSize: 18, color: '#7f93b5', display: 'flex' }}>per course · No subscription</div>
        </div>

        {/* Stat chips */}
        <div style={{ display: 'flex', gap: 20 }}>
          {[['9', 'Expert Instructors'], ['180K+', 'Students'], ['Built-in', 'Practice Mode']].map(([v, l]) => (
            <div key={l} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: '12px 24px' }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#fff', fontFamily: 'monospace', display: 'flex' }}>{v}</div>
              <div style={{ fontSize: 12, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: 2, display: 'flex' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #00d4aa, #1e90ff, #a855f7)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: 18, right: 32, fontSize: 15, color: '#2a4060', display: 'flex', fontFamily: 'monospace' }}>ynfinance.org</div>
      </div>
    ),
    { ...size }
  )
}
