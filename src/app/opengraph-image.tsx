import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'YN Finance — Professional Trading Terminal'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(135deg, #040c14 0%, #071220 60%, #040c14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontFamily: 'sans-serif', position: 'relative', overflow: 'hidden',
      }}>
        {/* Grid lines */}
        <div style={{ position: 'absolute', inset: 0, opacity: 0.06,
          backgroundImage: 'linear-gradient(#00d4aa 1px, transparent 1px), linear-gradient(90deg, #00d4aa 1px, transparent 1px)',
          backgroundSize: '60px 60px', display: 'flex' }} />

        {/* Glow */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
          width: 600, height: 300, background: 'radial-gradient(ellipse, rgba(0,212,170,0.15), transparent)', display: 'flex' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, background: '#040c14', clipPath: 'polygon(50% 0%, 0% 100%, 100% 100%)', display: 'flex' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1, display: 'flex' }}>
              YN <span style={{ color: '#00d4aa', fontWeight: 300, marginLeft: 10, letterSpacing: 8 }}>FINANCE</span>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ fontSize: 52, fontWeight: 900, color: '#fff', letterSpacing: -2, textAlign: 'center', marginBottom: 16, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          The Trading Platform Built for
          <span style={{ background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', WebkitBackgroundClip: 'text', color: 'transparent', display: 'flex' }}>
            Prop Firm Success
          </span>
        </div>

        {/* Subtext */}
        <div style={{ fontSize: 20, color: '#7f93b5', textAlign: 'center', marginBottom: 40, maxWidth: 700, display: 'flex' }}>
          Real TradingView charts · Live trading community · Prop firm simulation
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 48 }}>
          {[['1,247', 'Active Traders'], ['$48.2M', 'Simulated Capital'], ['78%', 'Pro Pass Rate']].map(([v, l]) => (
            <div key={l} style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace', display: 'flex' }}>{v}</div>
              <div style={{ fontSize: 13, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: 2, display: 'flex' }}>{l}</div>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 4, background: 'linear-gradient(90deg, #00d4aa, #1e90ff, #a855f7)', display: 'flex' }} />

        <div style={{ position: 'absolute', bottom: 20, right: 32, fontSize: 16, color: '#1a2d4a', display: 'flex', fontFamily: 'monospace' }}>
          ynfinance.org
        </div>
      </div>
    ),
    { ...size }
  )
}
