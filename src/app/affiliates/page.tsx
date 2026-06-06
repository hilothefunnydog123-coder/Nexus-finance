import type { Metadata } from 'next'
import Link from 'next/link'
import SiteFooter from '@/components/SiteFooter'

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
  { tag: 'AI Stock Analyzer', clr: '#00d4aa', d: 'The free hook. "Watch AI rate any stock in 15 seconds" converts cold traffic better than anything else on the site.' },
  { tag: 'YN Pro', clr: '#1e90ff', d: 'Unlimited analyses + every tool. Your 30% recurring commission is earned on this subscription.' },
  { tag: 'Courses', clr: '#a855f7', d: 'Strategy from 9 pro traders — and the algorithms that automate exactly what each course teaches.' },
]

const FOR = ['Trading YouTubers', 'Discord & community owners', 'Finance newsletters', 'X / FinTwit accounts', 'Course creators & educators', 'Prop-firm affiliates']

const FAQ = [
  { q: 'How much can I earn?', a: '30% of every referred subscription, recurring for the lifetime of the customer. Refer 100 Pro subscribers and that compounds into meaningful monthly income — not a one-time bounty.' },
  { q: 'How long is the cookie window?', a: 'A referred visitor is attributed to you for 60 days after their first click, so you still get credit if they convert later.' },
  { q: 'How do I get paid?', a: 'Monthly, once your balance clears the minimum payout. We support PayPal and bank transfer.' },
  { q: 'Do I need an audience?', a: 'You need a way to reach traders — a channel, server, list or following. We prioritize creators whose audience actually trades.' },
]

export default function AffiliatesPage() {
  return (
    <div style={{ background: '#040a12', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`*{box-sizing:border-box;margin:0;padding:0}.lnk:hover{color:#00d4aa!important}`}</style>

      <nav style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 clamp(16px,4vw,40px)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#06121f' }}>YN</div>
          <span style={{ fontSize: 16, fontWeight: 800 }}>YN Finance</span>
        </Link>
        <a href="mailto:partners@ynfinance.org?subject=Affiliate%20Application" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '9px 18px', borderRadius: 10, fontSize: 13, fontWeight: 800, textDecoration: 'none' }}>Apply now →</a>
      </nav>

      <div style={{ maxWidth: 920, margin: '0 auto', padding: '60px clamp(16px,4vw,24px) 80px' }}>
        {/* Hero */}
        <div style={{ display: 'inline-block', fontSize: 11, fontWeight: 800, letterSpacing: '2px', color: '#00d4aa', border: '1px solid rgba(0,212,170,.3)', borderRadius: 100, padding: '6px 16px', marginBottom: 22 }}>PARTNER PROGRAM</div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,60px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.02, marginBottom: 18 }}>
          Get paid to put real<br />edge in traders&apos; hands.
        </h1>
        <p style={{ fontSize: 'clamp(15px,2vw,19px)', color: '#6a8497', lineHeight: 1.7, maxWidth: 600, marginBottom: 32 }}>
          Earn <b style={{ color: '#dce8f0' }}>30% recurring commission</b> for the life of every customer you refer to YN Finance. A free AI analyzer to hook them, real tools to keep them, and a payout that compounds every month.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
          <a href="mailto:partners@ynfinance.org?subject=Affiliate%20Application&body=Where%20your%20audience%20lives%3A%0AAudience%20size%3A%0ALinks%3A" style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '15px 34px', borderRadius: 12, fontSize: 15, fontWeight: 900, textDecoration: 'none', boxShadow: '0 0 40px #00d4aa35' }}>Apply to the program →</a>
          <Link href="/ai-stocks" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.12)', color: '#dce8f0', padding: '15px 30px', borderRadius: 12, fontSize: 15, fontWeight: 700, textDecoration: 'none' }}>See what you&apos;ll promote</Link>
        </div>

        {/* Headline numbers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14, margin: '48px 0' }}>
          {([['30%', 'Recurring commission'], ['60 days', 'Cookie window'], ['Lifetime', 'Of the customer'], ['Monthly', 'Payouts']] as [string, string][]).map(([n, l]) => (
            <div key={l} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, padding: '22px 20px', textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#00d4aa', fontFamily: '"SF Mono",ui-monospace,monospace', letterSpacing: '-1px' }}>{n}</div>
              <div style={{ fontSize: 11.5, color: '#6a8497', marginTop: 6 }}>{l}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 22 }}>How it works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 48 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 16, padding: '24px 22px' }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace', marginBottom: 12 }}>{s.n}</div>
              <h3 style={{ fontSize: 17, fontWeight: 800, marginBottom: 8 }}>{s.t}</h3>
              <p style={{ fontSize: 13.5, color: '#6a8497', lineHeight: 1.65 }}>{s.d}</p>
            </div>
          ))}
        </div>

        {/* What you promote */}
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 22 }}>What you&apos;ll promote</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginBottom: 48 }}>
          {PROMOTE.map(p => (
            <div key={p.tag} style={{ background: `${p.clr}0a`, border: `1px solid ${p.clr}28`, borderRadius: 16, padding: '24px 22px' }}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '1px', color: p.clr, marginBottom: 10 }}>{p.tag.toUpperCase()}</div>
              <p style={{ fontSize: 13.5, color: '#8aa0b2', lineHeight: 1.65 }}>{p.d}</p>
            </div>
          ))}
        </div>

        {/* Who it's for */}
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 18 }}>Built for</h2>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 48 }}>
          {FOR.map(f => (
            <span key={f} style={{ fontSize: 13.5, fontWeight: 700, color: '#8aa0b2', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 100, padding: '9px 18px' }}>{f}</span>
          ))}
        </div>

        {/* FAQ */}
        <h2 style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 18 }}>FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 48 }}>
          {FAQ.map(f => (
            <div key={f.q} style={{ background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12, padding: '18px 20px' }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>{f.q}</h3>
              <p style={{ fontSize: 13.5, color: '#8aa0b2', lineHeight: 1.7 }}>{f.a}</p>
            </div>
          ))}
        </div>

        {/* Final CTA */}
        <div style={{ textAlign: 'center', padding: '40px 24px', borderRadius: 18, background: 'linear-gradient(135deg, rgba(0,212,170,.1), rgba(30,144,255,.06))', border: '1px solid rgba(0,212,170,.22)' }}>
          <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 900, letterSpacing: '-1px', marginBottom: 12 }}>Turn your audience into income.</h2>
          <p style={{ fontSize: 15, color: '#6a8497', maxWidth: 460, margin: '0 auto 26px', lineHeight: 1.6 }}>Apply today. Most trading creators are approved within 24 hours.</p>
          <a href="mailto:partners@ynfinance.org?subject=Affiliate%20Application" style={{ display: 'inline-block', background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#06121f', padding: '16px 38px', borderRadius: 13, fontSize: 16, fontWeight: 900, textDecoration: 'none' }}>Become a YN partner →</a>
        </div>

        <p style={{ fontSize: 11, color: '#2a4050', marginTop: 32, textAlign: 'center' }}>
          Commission terms may evolve as the program grows. Self-serve dashboard coming soon — early partners get grandfathered rates.
        </p>
      </div>
      <SiteFooter />
    </div>
  )
}
