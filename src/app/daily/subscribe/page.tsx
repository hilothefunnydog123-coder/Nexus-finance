'use client'

import { useState } from 'react'
import Link from 'next/link'

const FEATURES = [
  { icon: '📰', title: 'AI Morning Brief', desc: 'Full market narrative written by AI before each session opens — headlines, key drivers, and what it means for traders.' },
  { icon: '📐', title: 'Expected Moves', desc: 'Daily price range projections for S&P 500, Nasdaq, Dow, and Russell 2000 — calculated from historical volatility so you know your risk before you trade.' },
  { icon: '🎯', title: 'Daily Bias', desc: 'Bull / Bear / Neutral verdict for every major index with a specific, technical reason and the key price level to watch.' },
  { icon: '🏦', title: 'Institutional Radar', desc: 'Analyst consensus from major banks, upcoming earnings impact, and what the options market is signaling about institutional positioning.' },
  { icon: '🌍', title: 'Macro Intelligence', desc: 'Gold, oil, dollar, bonds, and credit read — the four markets that tell you where risk appetite really is before price confirms.' },
  { icon: '📅', title: 'Economic Calendar', desc: 'Every high-impact event with prior data, estimates, and an AI assessment of the likely market reaction.' },
  { icon: '🎮', title: 'Daily Playbook', desc: 'The bull case, the bear case, three specific trade ideas, and what to avoid today — straight from the AI strategist.' },
  { icon: '⚡', title: 'Breaking News Feed', desc: 'Top 9 market-moving stories curated and ranked for impact, refreshed every 3 hours.' },
]

const TESTIMONIALS = [
  { name: 'Marcus T.', role: 'Futures Trader', text: 'Saves me 2 hours of research every morning. The expected moves alone are worth it for my NQ setups.' },
  { name: 'Priya S.',  role: 'Swing Trader',   text: 'The daily bias section keeps me on the right side of the tape. No more fighting the trend.' },
  { name: 'Devon P.',  role: 'Investor',        text: 'The macro read is what I\'d pay hundreds for from a Bloomberg terminal. At $12/month this is insane value.' },
]

export default function SubscribePage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubscribe() {
    if (!email || !email.includes('@')) { setError('Enter a valid email'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.demo) {
        setError('Payment not configured yet — check back soon.')
        setLoading(false)
        return
      }
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh', overflowX: 'hidden' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
        .fade-up { animation: fadeUp 0.6s ease both }
        .fade-up-2 { animation: fadeUp 0.6s 0.1s ease both }
        .fade-up-3 { animation: fadeUp 0.6s 0.2s ease both }
        input:focus { outline: none; border-color: #f59e0b !important; }
        input { color: #fafafa; background: #18181b; }
        input::placeholder { color: #71717a; }
        .feature-card:hover { background: #1c1c1e !important; transform: translateY(-2px); }
        .feature-card { transition: all 0.2s ease; }
        .subscribe-btn:hover { background: linear-gradient(135deg, #d97706, #b45309) !important; transform: translateY(-1px); box-shadow: 0 8px 30px #f59e0b30 !important; }
        .subscribe-btn { transition: all 0.2s ease; }
        .subscribe-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none !important; }
      `}</style>

      {/* Nav */}
      <nav style={{ padding: '16px 24px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>⚡</div>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#fafafa' }}>YN Finance</span>
        </Link>
        <Link href="/daily" style={{ color: '#71717a', fontSize: 14, textDecoration: 'none' }}>← Back</Link>
      </nav>

      {/* Hero */}
      <div style={{ maxWidth: 860, margin: '0 auto', padding: '64px 24px 0', textAlign: 'center' }}>
        <div className="fade-up" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#1c1917', border: '1px solid #f59e0b40', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, background: '#f59e0b', borderRadius: '50%', animation: 'pulse 2s infinite', display: 'block' }}/>
          <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>DAILY INTELLIGENCE · $11.99/MONTH</span>
        </div>

        <h1 className="fade-up-2" style={{ fontSize: 'clamp(32px, 6vw, 56px)', fontWeight: 800, lineHeight: 1.1, marginBottom: 20 }}>
          Your Morning Edge,<br/>
          <span style={{ background: 'linear-gradient(135deg, #f59e0b, #ef4444)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Delivered Daily.</span>
        </h1>

        <p className="fade-up-3" style={{ fontSize: 18, color: '#a1a1aa', lineHeight: 1.7, maxWidth: 580, margin: '0 auto 40px' }}>
          The AI-powered intelligence briefing that professional traders actually need — expected moves, daily bias, macro read, institutional radar, and your complete playbook. Every morning, before the open.
        </p>

        {/* Price card */}
        <div className="fade-up-3" style={{ background: 'linear-gradient(135deg, #1a1a1a, #1c1917)', border: '1px solid #f59e0b50', borderRadius: 20, padding: '36px 32px', maxWidth: 460, margin: '0 auto 24px', boxShadow: '0 0 60px #f59e0b10' }}>
          <div style={{ fontSize: 13, color: '#f59e0b', fontWeight: 600, letterSpacing: '0.1em', marginBottom: 12 }}>SUBSCRIBE NOW</div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 56, fontWeight: 800, color: '#fafafa' }}>$11</span>
            <span style={{ fontSize: 28, fontWeight: 800, color: '#fafafa' }}>.99</span>
            <span style={{ color: '#71717a', fontSize: 16, marginLeft: 4 }}>/month</span>
          </div>
          <div style={{ color: '#71717a', fontSize: 13, marginBottom: 28 }}>Cancel anytime · No contracts</div>

          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
            style={{ width: '100%', padding: '14px 16px', borderRadius: 10, border: '1px solid #27272a', fontSize: 15, marginBottom: 12 }}
          />

          {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{error}</div>}

          <button
            className="subscribe-btn"
            onClick={handleSubscribe}
            disabled={loading}
            style={{ width: '100%', padding: '16px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 10, color: '#09090b', fontWeight: 700, fontSize: 16, cursor: 'pointer', boxShadow: '0 4px 20px #f59e0b30' }}
          >
            {loading ? 'Redirecting to checkout...' : 'Get Daily Intelligence →'}
          </button>

          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
            {['🔒 Secure checkout', '✓ Cancel anytime', '✓ Instant access'].map(t => (
              <span key={t} style={{ color: '#71717a', fontSize: 12 }}>{t}</span>
            ))}
          </div>
        </div>

        <p style={{ color: '#52525b', fontSize: 12 }}>
          Powered by Stripe · Your data is never sold · <Link href="/privacy" style={{ color: '#52525b' }}>Privacy Policy</Link>
        </p>
      </div>

      {/* Features */}
      <div style={{ maxWidth: 1000, margin: '72px auto 0', padding: '0 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Everything inside</h2>
          <p style={{ color: '#71717a', fontSize: 16 }}>8 intelligence modules, refreshed every morning</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
          {FEATURES.map(f => (
            <div key={f.title} className="feature-card" style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: '20px 18px' }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>{f.icon}</div>
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 6, color: '#fafafa' }}>{f.title}</div>
              <div style={{ color: '#71717a', fontSize: 13, lineHeight: 1.6 }}>{f.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Testimonials */}
      <div style={{ maxWidth: 860, margin: '72px auto 0', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 32 }}>What traders say</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
          {TESTIMONIALS.map(t => (
            <div key={t.name} style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: '24px 20px' }}>
              <div style={{ fontSize: 13, color: '#a1a1aa', lineHeight: 1.7, marginBottom: 16 }}>"{t.text}"</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.name}</div>
              <div style={{ color: '#f59e0b', fontSize: 12, marginTop: 2 }}>{t.role}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Compare */}
      <div style={{ maxWidth: 680, margin: '72px auto 0', padding: '0 24px' }}>
        <h2 style={{ textAlign: 'center', fontSize: 24, fontWeight: 700, marginBottom: 32 }}>The smart money choice</h2>
        <div style={{ border: '1px solid #27272a', borderRadius: 16, overflow: 'hidden' }}>
          {[
            { label: 'Bloomberg Terminal',  price: '$2,000/mo',  has: false },
            { label: 'Wall Street Prep',    price: '$499/mo',    has: false },
            { label: 'Morning Brew Markets',price: 'Free',       has: false, note: 'No bias, no expected moves' },
            { label: 'YN Daily Intelligence',price: '$11.99/mo', has: true  },
          ].map((row, i) => (
            <div key={row.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < 3 ? '1px solid #27272a' : 'none', background: row.has ? '#1a1917' : 'transparent' }}>
              <div>
                <span style={{ fontWeight: row.has ? 700 : 400, color: row.has ? '#fafafa' : '#71717a' }}>{row.label}</span>
                {row.note && <span style={{ color: '#52525b', fontSize: 12, marginLeft: 8 }}>{row.note}</span>}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ color: row.has ? '#f59e0b' : '#71717a', fontWeight: row.has ? 700 : 400 }}>{row.price}</span>
                {row.has && <span style={{ color: '#22c55e', fontSize: 16 }}>✓</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Final CTA */}
      <div style={{ textAlign: 'center', padding: '72px 24px 80px' }}>
        <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8 }}>Ready to trade with an edge?</h2>
        <p style={{ color: '#71717a', marginBottom: 32 }}>Join traders who start every session informed, not guessing.</p>
        <button
          className="subscribe-btn"
          onClick={handleSubscribe}
          disabled={loading}
          style={{ padding: '18px 48px', background: 'linear-gradient(135deg, #f59e0b, #d97706)', border: 'none', borderRadius: 12, color: '#09090b', fontWeight: 700, fontSize: 17, cursor: 'pointer' }}
        >
          {loading ? 'Loading...' : 'Start for $11.99/month →'}
        </button>
      </div>
    </div>
  )
}
