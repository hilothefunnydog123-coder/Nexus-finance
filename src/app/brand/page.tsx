import Link from 'next/link'

const ASSETS = [
  {
    file: '/yn-logo-dark.png',
    name: 'yn-logo-dark.png',
    label: 'Full Logo — Dark Background',
    desc: '800×220px · Use for Instagram posts, presentations, email headers',
    preview: '/yn-logo-dark.png',
    bg: '#040c14',
  },
  {
    file: '/yn-logo-transparent.png',
    name: 'yn-logo-transparent.png',
    label: 'Full Logo — Transparent',
    desc: '800×220px · Use for video overlays, reels, thumbnails',
    preview: '/yn-logo-transparent.png',
    bg: 'repeating-conic-gradient(#1a2a3a 0% 25%, #0d1a26 0% 50%) 0 0 / 20px 20px',
  },
  {
    file: '/yn-mark.png',
    name: 'yn-mark.png',
    label: 'The Mark — Icon Only',
    desc: '400×400px · Use for profile picture, app icon, favicon source',
    preview: '/yn-mark.png',
    bg: '#040c14',
  },
]

export default function BrandPage() {
  return (
    <div style={{ background: '#030a10', minHeight: '100vh', color: '#e8f4f8', fontFamily: '"Inter", system-ui, sans-serif', padding: '60px 24px' }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>

        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#4a6a7a', textDecoration: 'none', fontFamily: 'monospace', marginBottom: 48 }}>
          ← Back to home
        </Link>

        <div style={{ marginBottom: 56 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#00d4aa', fontFamily: 'monospace', marginBottom: 14 }}>BRAND ASSETS</div>
          <h1 style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-1.5px', color: '#e8f4f8', marginBottom: 12 }}>Logo Downloads</h1>
          <p style={{ fontSize: 15, color: '#4a6a7a', lineHeight: 1.7 }}>Official YN Finance logo files. Click any download button to save the file directly.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ASSETS.map(asset => (
            <div key={asset.file} style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden' }}>
              {/* Preview */}
              <div style={{ background: asset.bg, padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 140 }}>
                <img src={asset.preview} alt={asset.label} style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
              </div>

              {/* Info + download */}
              <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#e8f4f8', marginBottom: 4 }}>{asset.label}</div>
                  <div style={{ fontSize: 12, color: '#4a6a7a' }}>{asset.desc}</div>
                </div>
                <a
                  href={asset.file}
                  download={asset.name}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#030a10', fontWeight: 800, fontSize: 13, padding: '10px 22px', borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}
                >
                  ↓ Download PNG
                </a>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, padding: '20px 24px', background: 'rgba(0,212,170,.05)', border: '1px solid rgba(0,212,170,.15)', borderRadius: 12, fontSize: 13, color: '#4a6a7a', lineHeight: 1.7 }}>
          <strong style={{ color: '#00d4aa' }}>Brand colors:</strong> Teal <code style={{ color: '#00d4aa' }}>#00d4aa</code> · Blue <code style={{ color: '#1e90ff' }}>#1e90ff</code> · Purple <code style={{ color: '#a855f7' }}>#a855f7</code> · Dark bg <code style={{ color: '#c8dce8' }}>#040c14</code>
        </div>

      </div>
    </div>
  )
}
