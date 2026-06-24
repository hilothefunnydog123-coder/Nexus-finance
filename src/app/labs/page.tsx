import type { Metadata } from 'next'
import Link from 'next/link'
import { DeskShell, Reveal, Panel, Eyebrow, CYAN, VIOLET, GREEN, TXT, MUTE, FAINT, BORDER } from '@/components/cinematic/Desk'

export const metadata: Metadata = { title: 'Labs — YN Finance', description: 'Experiments from the BrainStock research desk: watch the neural net think, the AI strategy arena, and the machine in 3D.' }

const LABS = [
  { href: '/brain/live', emoji: '⚡', tag: 'ENTER THE NET', title: 'Fly inside the network', desc: 'A WebGL flythrough into the neural net itself — type a ticker and watch the real forward pass fire through every layer, scored live with sound. Nothing in finance looks like this.', color: CYAN, live: true },
  { href: '/fork', emoji: '🍴', tag: 'FORK THE BRAIN', title: 'Make the net think your way', desc: 'Take BrainStock’s real neural net and tune what it pays attention to with 11 live dials. Watch your fork’s forecast split from the original, then save it as a preset to your profile.', color: VIOLET, live: true },
  { href: '/galaxy', emoji: '🌌', tag: 'THE MARKET GALAXY', title: 'Every stock, a star', desc: 'Sector constellations sized by market cap, pulsing with today’s real move. Drift through the universe and click any star to forecast it.', color: VIOLET, live: true },
  { href: '/storm', emoji: '🌩️', tag: 'THE CONVICTION STORM', title: 'Bulls rise, bears fall', desc: 'A live particle field of the whole tape — green names lift, red names sink, the hardest moves burn brightest. Turn the sound on and hear the market breathe.', color: GREEN, live: true },
  { href: '/war-room/live', emoji: '⚖️', tag: 'WAR ROOM · LIVE', title: 'Five AIs argue, out loud', desc: 'A long PM, a short-seller, a quant and a risk officer debate your ticker — spoken aloud — and the CIO rules. Driven by the real forecast.', color: VIOLET, live: true },
  { href: '/the-open', emoji: '🎬', tag: 'THE OPEN', title: 'The trading day, as a film', desc: 'A self-running cinematic: the net wakes, scans the market, slams down its top calls, and shows the public win rate. Built to be shared.', color: GREEN, live: true },
  { href: '/labs/brain', emoji: '🧠', tag: 'THE BRAIN', title: 'See what it’s thinking, live', desc: 'A living brain of neurons, pumping and firing as it forecasts the market in real time — accurate vs wrong, what it’s processing, what it’s reading. Right now.', color: CYAN, live: true },
  { href: '/brainstock', emoji: '🔬', tag: 'NEURAL X-RAY', title: 'Watch it think', desc: 'The network’s real forward pass, rendered live — your stock’s features firing through every neuron to the prediction.', color: CYAN, live: true },
  { href: '/labs/colosseum', emoji: '⚔️', tag: 'THE COLOSSEUM', title: 'Five AIs, one arena', desc: 'BrainStock vs momentum vs mean-reversion vs contrarian vs pure chance — each running a live paper portfolio, graded forever.', color: VIOLET, live: true },
  { href: '/labs/market-brain', emoji: '🗺️', tag: 'THE MARKET BRAIN', title: 'The whole market, at a glance', desc: 'Every stock the net forecast this morning, as one glowing heatmap — green leaning up, red leaning down. The AI’s view of everything.', color: GREEN, live: true },
  { href: '/labs/trading-floor', emoji: '🌐', tag: 'TRADING FLOOR', title: 'Step inside the machine', desc: 'The neural network in three dimensions — orbit the layers, watch the signals travel. Built in real 3D.', color: GREEN, live: false },
]

export default function Labs() {
  return (
    <DeskShell title="Labs · experiments" accent={VIOLET}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(60px,9vw,110px) clamp(16px,3vw,28px) 80px' }}>
        <Reveal><Eyebrow color={VIOLET} style={{ marginBottom: 22 }}>// THE RESEARCH DESK</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(2.4rem,6.5vw,5rem)', lineHeight: 0.98, maxWidth: 900 }}>
            Things a normal finance site <span style={{ color: VIOLET }}>can’t build.</span>
          </h1>
        </Reveal>
        <Reveal delay={180}><p style={{ marginTop: 22, fontSize: 'clamp(1.02rem,1.6vw,1.25rem)', color: MUTE, lineHeight: 1.6, maxWidth: 640 }}>Because they don’t have a real neural network wired to the page. We do — so here’s what it looks like when you open the hood.</p></Reveal>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 'clamp(40px,6vw,64px)' }}>
          {LABS.map((l, i) => (
            <Reveal key={l.href} delay={i * 90}>
              <Link href={l.href} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
                <Panel glow={l.color} style={{ padding: 26, height: '100%', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 26 }}>{l.emoji}</span>
                    {l.live
                      ? <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 800, letterSpacing: '0.12em', color: GREEN }}>● LIVE</span>
                      : <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, letterSpacing: '0.12em', color: FAINT }}>SOON</span>}
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.16em', color: l.color, marginTop: 18 }}>{l.tag}</div>
                  <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: '1.5rem', marginTop: 6, color: TXT }}>{l.title}</div>
                  <p style={{ fontSize: 13.5, color: MUTE, lineHeight: 1.6, marginTop: 10 }}>{l.desc}</p>
                  <div style={{ marginTop: 18, fontFamily: 'var(--font-mono)', fontSize: 12, color: l.color, display: 'inline-flex', alignItems: 'center', gap: 6, borderTop: `1px solid ${BORDER}`, paddingTop: 14, width: '100%' }}>Open →</div>
                </Panel>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </DeskShell>
  )
}
