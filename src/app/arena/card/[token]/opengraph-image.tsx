import { ImageResponse } from 'next/og'
import { verifyShare, type SharePayload } from '@/lib/arena/humans'

export const runtime = 'nodejs'
export const alt = 'I beat the AIs — The Arena at YN Finance'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const GREEN = '#00ff88'
const CYAN = '#00d4ff'
const VIOLET = '#a855f7'
const AMBER = '#ff9500'
const MUTED = '#8a93a8'

function headline(p: SharePayload): { big: string; color: string } {
  if (p.beat.length === 2) return { big: 'I BEAT BOTH AIs', color: GREEN }
  if (p.beat.length === 1) return { big: `I BEAT ${p.beat[0].toUpperCase()}`, color: GREEN }
  return { big: 'BATTLING THE AIs', color: AMBER }
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const res = verifyShare(decodeURIComponent(token))
  const p: SharePayload = res?.payload ?? { v: 1, h: 'A human', w: 0, l: 0, wr: 0, s: 0, p: 0, beat: [], net: 0, gem: 0, wk: '', t: 0 }
  const verified = !!res?.verified
  const hl = headline(p)

  const Col = (label: string, val: string, color: string, sub: string) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
      <div style={{ fontSize: 22, color: MUTED, textTransform: 'uppercase', letterSpacing: 4 }}>{label}</div>
      <div style={{ fontSize: 84, fontWeight: 900, color, lineHeight: 1.05 }}>{val}</div>
      <div style={{ fontSize: 24, color: MUTED }}>{sub}</div>
    </div>
  )

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 64,
          background: '#05060a',
          backgroundImage: `radial-gradient(900px 500px at 12% -10%, ${VIOLET}33, transparent 60%), radial-gradient(900px 500px at 100% 0%, ${CYAN}26, transparent 55%), radial-gradient(800px 500px at 60% 120%, ${AMBER}1f, transparent 60%)`,
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, fontWeight: 800, letterSpacing: 6, color: VIOLET }}>
            THE ARENA
          </div>
          <div style={{ display: 'flex', fontSize: 24, color: MUTED }}>ynfinance.org</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', fontSize: 32, color: '#e7ecf5' }}>{p.h}</div>
          <div style={{ display: 'flex', fontSize: 96, fontWeight: 900, color: hl.color, lineHeight: 1.02 }}>{hl.big}</div>
          <div style={{ display: 'flex', fontSize: 30, color: MUTED }}>
            {p.w}-{p.l} this week{p.wk ? ` · ${p.wk}` : ''}
            {p.s >= 3 ? `  ·  ${p.s}-WIN STREAK` : ''}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, borderTop: `1px solid rgba(255,255,255,.1)`, paddingTop: 28 }}>
          {Col('You', `${p.wr}%`, GREEN, 'calling the market')}
          {Col('BrainStock', `${p.net}%`, VIOLET, 'the neural net')}
          {Col('Gemini', `${p.gem}%`, CYAN, 'Google AI')}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 24, color: MUTED }}>
          <div style={{ display: 'flex' }}>Sealed before the outcome · graded on real prices</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700, letterSpacing: 1, color: verified ? GREEN : MUTED }}>
            {verified ? 'SIGNED & VERIFIABLE' : 'UNVERIFIED'}
          </div>
        </div>
      </div>
    ),
    size
  )
}
