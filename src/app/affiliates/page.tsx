import type { Metadata } from 'next'
import { PaperPage, PageHero, Section, Reveal, Magnetic, Stat, INK, MUTE, LINE, PAPER, BONE, ACCENT } from '@/components/cinematic/Paper'

const BASE = 'https://ynfinance.org'

export const metadata: Metadata = {
  title: 'Affiliate Program — Earn Recurring Revenue | YN Finance',
  description: 'Promote YN Finance and earn 30% recurring commission for the life of every customer you refer. Built for trading creators, Discord owners, newsletters and educators.',
  alternates: { canonical: `${BASE}/affiliates` },
}

const STEPS = [
  { n: '01', t: 'Apply in 2 minutes', d: 'Tell us where your audience lives — YouTube, a Discord, X, a newsletter. We approve most trading creators within 24 hours.' },
  { n: '02', t: 'Get your link & assets', d: 'You get a unique referral link, ready-made share cards, an embeddable analyzer widget, and per-ticker pages to drop into content.' },
  { n: '03', t: 'Earn on autopilot', d: 'Every paid subscriber you send earns you 30% — every month, for as long as they stay. Paid out monthly.' },
]
const PROMOTE = [
  { tag: 'AI Stock Analyzer', d: 'The free hook. “Watch AI rate any stock in 15 seconds” converts cold traffic better than anything else on the site.' },
  { tag: 'YN Pro', d: 'Unlimited analyses + every tool. Your 30% recurring commission is earned on this subscription.' },
  { tag: 'Courses', d: 'Strategy from 9 pro traders — and the algorithms that automate exactly what each course teaches.' },
]
const FOR = ['Trading YouTubers', 'Discord & community owners', 'Finance newsletters', 'X / FinTwit accounts', 'Course creators & educators', 'Prop-firm affiliates']
const FAQ = [
  { q: 'How much can I earn?', a: '30% of every referred subscription, recurring for the lifetime of the customer. Refer 100 Pro subscribers and that compounds into meaningful monthly income — not a one-time bounty.' },
  { q: 'How long is the cookie window?', a: 'A referred visitor is attributed to you for 60 days after their first click, so you still get credit if they convert later.' },
  { q: 'How do I get paid?', a: 'Monthly, once your balance clears the minimum payout. We support PayPal and bank transfer.' },
  { q: 'Do I need an audience?', a: 'You need a way to reach traders — a channel, server, list or following. We prioritize creators whose audience actually trades.' },
]
const APPLY = 'mailto:partners@ynfinance.org?subject=Affiliate%20Application'

export default function AffiliatesPage() {
  return (
    <PaperPage>
      <PageHero
        eyebrow="// PARTNER PROGRAM"
        title="Get paid to put real edge in traders’ hands."
        accentWords={[6]}
        sub={<>Earn <b style={{ color: INK }}>30% recurring commission</b> for the life of every customer you refer. A free AI analyzer to hook them, real tools to keep them, and a payout that compounds every month.</>}
        actions={<>
          <Magnetic href={APPLY} style={{ gap: 8, background: INK, color: PAPER, padding: '16px 32px', fontSize: 15, fontWeight: 700 }}>Apply to the program →</Magnetic>
          <Magnetic href="/ai-stocks" style={{ gap: 8, background: 'transparent', color: INK, padding: '16px 28px', fontSize: 15, fontWeight: 700, border: `1px solid ${INK}` }}>See what you’ll promote</Magnetic>
        </>}
      />

      <Section style={{ paddingTop: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 'clamp(20px,4vw,50px)' }}>
          {([['30%', 'Recurring commission'], ['60 days', 'Cookie window'], ['Lifetime', 'Of the customer'], ['Monthly', 'Payouts']] as [string, string][]).map(([n, l]) => (
            <Reveal key={l}><Stat value={n} label={l} /></Reveal>
          ))}
        </div>
      </Section>

      <Section bg={PAPER}>
        <Reveal><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 32 }}>How it works</h2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 1, background: LINE, border: `1px solid ${LINE}` }}>
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 100} style={{ background: BONE, padding: 'clamp(24px,3vw,34px)' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: ACCENT, marginBottom: 14 }}>{s.n}</div>
              <h3 className="disp" style={{ fontSize: '1.3rem', marginBottom: 8 }}>{s.t}</h3>
              <p style={{ fontSize: 14.5, color: MUTE, lineHeight: 1.65 }}>{s.d}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 32 }}>What you’ll promote</h2></Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(250px,1fr))', gap: 16, marginBottom: 56 }}>
          {PROMOTE.map((p, i) => (
            <Reveal key={p.tag} delay={i * 90}>
              <div data-spotlight style={{ background: PAPER, border: `1px solid ${LINE}`, padding: '24px 22px', height: '100%' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', color: ACCENT, marginBottom: 10 }}>{p.tag.toUpperCase()}</div>
                <p style={{ fontSize: 14.5, color: MUTE, lineHeight: 1.65 }}>{p.d}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal><h2 className="disp" style={{ fontSize: 'clamp(1.4rem,3vw,2.2rem)', marginBottom: 20 }}>Built for</h2></Reveal>
        <Reveal><div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {FOR.map((f) => <span key={f} style={{ fontSize: 13.5, fontWeight: 600, color: INK, background: PAPER, border: `1px solid ${LINE}`, padding: '9px 18px' }}>{f}</span>)}
        </div></Reveal>
      </Section>

      <Section bg={PAPER}>
        <Reveal><h2 className="disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', marginBottom: 24 }}>FAQ</h2></Reveal>
        <div style={{ maxWidth: 820 }}>
          {FAQ.map((f) => (
            <Reveal key={f.q}>
              <div style={{ padding: '24px 0', borderTop: `1px solid ${LINE}` }}>
                <h3 className="disp" style={{ fontSize: '1.25rem', marginBottom: 8 }}>{f.q}</h3>
                <p style={{ fontSize: 15, color: MUTE, lineHeight: 1.7 }}>{f.a}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <Section>
        <Reveal style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
          <h2 className="disp" style={{ fontSize: 'clamp(2rem,5vw,3.4rem)', marginBottom: 14 }}>Turn your audience into income.</h2>
          <p style={{ fontSize: 16, color: MUTE, marginBottom: 28 }}>Apply today. Most trading creators are approved within 24 hours.</p>
          <Magnetic href={APPLY} style={{ gap: 8, background: ACCENT, color: '#fff', padding: '17px 36px', fontSize: 16, fontWeight: 700 }}>Become a YN partner →</Magnetic>
          <p style={{ fontSize: 12, color: 'rgba(10,10,12,.4)', marginTop: 28, fontFamily: 'var(--font-mono)' }}>Commission terms may evolve as the program grows. Early partners get grandfathered rates.</p>
        </Reveal>
      </Section>
    </PaperPage>
  )
}
