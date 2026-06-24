import type { Metadata } from 'next'
import { DeskShell, Reveal, Eyebrow, DeskStat, Panel, CYAN, GREEN, VIOLET, TXT, MUTE, FAINT, BORDER } from '@/components/cinematic/Desk'
import BrainProof from '@/components/cinematic/BrainProof'
import Postmortems from '@/components/proof/Postmortems'
import LiveCount from '@/components/LiveCount'
import Link from 'next/link'

export const metadata: Metadata = { title: 'Proof — YN Finance', description: 'The receipts. Every BrainStock call is logged, timestamped, and graded against real prices — win rate by conviction, the live learning curve, and the public track record.' }

const HOW = [
  ['Posted', 'Every morning the net ranks the universe and posts its calls — timestamped to the second, before anyone knows the outcome.'],
  ['Graded', 'Five trading days later each call is scored against the real closing price. Hit or miss. We keep the losers.'],
  ['Trained', 'Every graded outcome is backpropagated into the network that night, so the curve below should bend down over time.'],
]

export default function ProofPage() {
  return (
    <DeskShell title="Proof · the receipts" accent={GREEN}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(50px,8vw,100px) clamp(16px,3vw,28px) 80px' }}>
        <Reveal><Eyebrow color={GREEN} style={{ marginBottom: 20 }}>// WE DON&apos;T HIDE THE LOSERS</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(2.4rem,6.5vw,5rem)', lineHeight: 0.98 }}>
            Anyone can predict. <span style={{ color: GREEN }}>We prove it.</span>
          </h1>
        </Reveal>
        <Reveal delay={160}><p style={{ marginTop: 20, fontSize: 'clamp(1rem,1.6vw,1.22rem)', color: MUTE, lineHeight: 1.6, maxWidth: 660 }}>Every finance site shows you a forecast. None of them show you if it was right. This page is the whole company in one screen: a public, timestamped, self-grading track record — and a network you can watch learn.</p></Reveal>

        {/* live headline numbers */}
        <Reveal delay={260} style={{ marginTop: 'clamp(36px,5vw,56px)', display: 'flex', gap: 'clamp(24px,6vw,72px)', flexWrap: 'wrap' }}>
          <DeskStat value={<LiveCount metric="forecasts" fallback="—" />} label="forecasts logged" color={CYAN} />
          <DeskStat value={<LiveCount metric="gradedCalls" fallback="—" />} label="calls graded" color={TXT} />
          <DeskStat value={<LiveCount metric="winRate" suffix="%" fallback="—" />} label="graded win rate" color={GREEN} />
          <DeskStat value={<LiveCount metric="nnTrained" fallback="—" />} label="examples the net trained on" color={VIOLET} />
        </Reveal>

        {/* the proof charts (calibration + learning curve) */}
        <div style={{ marginTop: 8 }}><BrainProof /></div>

        {/* AI post-mortems on the misses — the honesty engine */}
        <Postmortems />

        {/* how grading works */}
        <Reveal style={{ marginTop: 'clamp(40px,6vw,64px)' }}>
          <Eyebrow style={{ marginBottom: 18 }}>// HOW EVERY CALL IS GRADED</Eyebrow>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 1, background: BORDER, border: `1px solid ${BORDER}` }}>
            {HOW.map(([t, d], i) => (
              <div key={t} style={{ background: '#0a0c12', padding: 'clamp(22px,3vw,32px)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: CYAN }}>0{i + 1}</div>
                <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, fontSize: '1.4rem', margin: '10px 0 8px', color: TXT }}>{t}</div>
                <p style={{ fontSize: 14, color: MUTE, lineHeight: 1.6 }}>{d}</p>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal style={{ marginTop: 40, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <Panel glow={CYAN} spotlight={false} style={{ padding: 0 }}>
            <Link href="/brainstock/track-record" style={{ display: 'block', padding: '16px 24px', textDecoration: 'none', color: TXT, fontWeight: 700 }}>See the full track record →</Link>
          </Panel>
          <Panel glow={VIOLET} spotlight={false} style={{ padding: 0 }}>
            <Link href="/brainstock" style={{ display: 'block', padding: '16px 24px', textDecoration: 'none', color: TXT, fontWeight: 700 }}>Watch the net forecast →</Link>
          </Panel>
        </Reveal>

        <p style={{ marginTop: 28, fontSize: 12, color: FAINT, lineHeight: 1.6 }}>A call &quot;hits&quot; if the close five trading days later is above its posting price. Equal-weight, no leverage. Educational — not financial advice.</p>
      </div>
    </DeskShell>
  )
}
