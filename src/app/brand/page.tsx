import { PaperPage, PageHero, Section, Reveal, INK, MUTE, LINE, PAPER, ACCENT } from '@/components/cinematic/Paper'

const ASSETS = [
  { file: '/yn-logo-dark.png', name: 'yn-logo-dark.png', label: 'Full Logo — Dark Background', desc: '800×220px · Instagram posts, presentations, email headers', preview: '/yn-logo-dark.png', bg: '#040c14' },
  { file: '/yn-logo-transparent.png', name: 'yn-logo-transparent.png', label: 'Full Logo — Transparent', desc: '800×220px · Video overlays, reels, thumbnails', preview: '/yn-logo-transparent.png', bg: 'repeating-conic-gradient(#1a2a3a 0% 25%, #0d1a26 0% 50%) 0 0 / 20px 20px' },
  { file: '/yn-mark.png', name: 'yn-mark.png', label: 'The Mark — Icon Only', desc: '400×400px · Profile picture, app icon, favicon source', preview: '/yn-mark.png', bg: '#040c14' },
]

export const metadata = { title: 'Brand Assets — YN Finance', description: 'Official YN Finance logo files and brand colors.' }

export default function BrandPage() {
  return (
    <PaperPage>
      <PageHero eyebrow="// BRAND ASSETS" title="Logo downloads." accentWords={[1]} sub="Official YN Finance logo files. Click any download to save the file directly." />
      <Section style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 860, display: 'flex', flexDirection: 'column', gap: 22 }}>
          {ASSETS.map((a) => (
            <Reveal key={a.file}>
              <div style={{ border: `1px solid ${LINE}`, background: PAPER, overflow: 'hidden' }}>
                <div style={{ background: a.bg, padding: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 150 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.preview} alt={a.label} style={{ maxWidth: '100%', maxHeight: 120, objectFit: 'contain' }} />
                </div>
                <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', borderTop: `1px solid ${LINE}` }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 4 }}>{a.label}</div>
                    <div style={{ fontSize: 12.5, color: MUTE, fontFamily: 'var(--font-mono)' }}>{a.desc}</div>
                  </div>
                  <a href={a.file} download={a.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, fontWeight: 700, fontSize: 13, padding: '11px 22px', textDecoration: 'none', whiteSpace: 'nowrap' }}>↓ Download PNG</a>
                </div>
              </div>
            </Reveal>
          ))}
          <Reveal>
            <div style={{ padding: '18px 22px', background: 'rgba(31,59,255,.05)', border: `1px solid rgba(31,59,255,.2)`, fontSize: 13.5, color: MUTE, lineHeight: 1.8, fontFamily: 'var(--font-mono)' }}>
              <strong style={{ color: ACCENT }}>BRAND COLORS</strong> &nbsp; Teal #00d4aa · Blue #1e90ff · Purple #a855f7 · Ink #0a0a0c · Paper #f3f1ea
            </div>
          </Reveal>
        </div>
      </Section>
    </PaperPage>
  )
}
