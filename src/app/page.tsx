'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'

// ─── FOUNDERS ────────────────────────────────────────────────────────────────
const FOUNDERS = [
  { name: 'Neil Gilani',    role: 'CEO & Co-Founder',  color: '#00d4aa', init: 'NG', quote: '"The edge isn\'t the chart. It\'s knowing what to look for before the open."', bio: 'Built the entire YN Finance platform — market data pipeline, AI systems, and the Daily Intelligence product. If it runs, Neil built it.' },
  { name: 'Yannai Richter', role: 'CTO & Co-Founder',  color: '#1e90ff', init: 'YR', quote: '"Every serious investor I know spends 2 hours on research before 9:30. We do that for you in one page."', bio: 'Co-built the YN stack and owns growth — ad strategy, creator outreach, and getting the platform in front of the right audiences.' },
  { name: 'Arjun Bhattula', role: 'COO & Co-Founder',  color: '#a855f7', init: 'AB', quote: '"Wall Street has always had this data. Now Main Street does too."', bio: 'Runs every partnership and instructor relationship. Personally brought nine world-class educators onto the platform.' },
]

// ─── REVIEWS ─────────────────────────────────────────────────────────────────
const REVIEWS = [
  { name: 'Marcus T.',  loc: 'Prop Futures Trader · Atlanta, GA',  color: '#00d4aa', text: '"I used to spend 90 minutes every morning scanning news and building my bias. Now I open Daily Intelligence and I\'m set up in 5 minutes. The expected moves alone save me from overtrading."', tag: 'ES & NQ trader' },
  { name: 'Priya S.',   loc: 'Swing Trader · Mumbai, India',        color: '#f59e0b', text: '"The Institutional Pulse section is what I pay for. Understanding where the big money is positioned before I enter — that\'s the edge retail never had."', tag: 'Equities & ETFs' },
  { name: 'Devon P.',   loc: 'Portfolio Manager · London, UK',      color: '#1e90ff', text: '"It reads like something Goldman would put out, but built for traders not analysts. The macro dashboard is exactly what I check every morning anyway — just automated."', tag: 'Multi-asset investor' },
]

// ─── FEATURES ─────────────────────────────────────────────────────────────────
const FEATURES = [
  { icon: '📐', title: 'Expected Moves', desc: 'Daily statistical price ranges for ES, NQ, YM, and RTY calculated from 14-day ATR. Know your risk before price opens.' },
  { icon: '🎯', title: 'Daily Bias', desc: 'Bullish / Bearish / Neutral verdict for every major index with the specific technical reason behind it. No ambiguity.' },
  { icon: '🌍', title: 'Macro Dashboard', desc: 'Gold, oil, dollar, bonds, and credit — the five markets institutional traders read every morning to gauge risk appetite.' },
  { icon: '🏦', title: 'Institutional Pulse', desc: 'Wall Street analyst consensus, earnings radar, cross-asset signals, and what smart money positioning tells you about today.' },
  { icon: '🎮', title: 'Daily Playbook', desc: 'Bull case. Bear case. Three specific trade ideas. What to avoid. Your complete tactical framework before the open.' },
  { icon: '📅', title: 'Economic Calendar', desc: 'High-impact events with actual vs estimate vs prior — color-coded by impact with an AI read on market reaction.' },
  { icon: '📰', title: 'Morning Brief', desc: 'AI-synthesized narrative that turns the day\'s data into a single clear story. What it means, what to watch, what to do.' },
  { icon: '📡', title: 'Live News Feed', desc: 'Top 9 market-moving stories curated and ranked for impact every morning. No noise — only what moves prices.' },
]

// ─── INSTRUCTORS (for courses section) ───────────────────────────────────────
const INSTRUCTORS = [
  { name: 'Ross Cameron',    color: '#ef4444', init: 'RC', tag: 'Day Trading'        },
  { name: 'ICT',             color: '#3b82f6', init: 'IC', tag: 'Smart Money'        },
  { name: 'Rayner Teo',      color: '#22c55e', init: 'RT', tag: 'Swing Trading'      },
  { name: 'Graham Stephan',  color: '#22c55e', init: 'GS', tag: 'Investing'          },
  { name: "Kevin O'Leary",   color: '#3b82f6', init: 'KO', tag: 'Portfolio Mgmt'     },
  { name: 'Wall St. Trapper',color: '#f59e0b', init: 'WT', tag: 'Financial Literacy' },
  { name: 'Humbled Trader',  color: '#f59e0b', init: 'HT', tag: 'Momentum'           },
  { name: 'Anton Kreil',     color: '#a855f7', init: 'AK', tag: 'Institutional'      },
]

export default function HomePage() {
  const [email, setEmail]       = useState('')
  const [subLoading, setSubLoading] = useState(false)
  const [subError, setSubError] = useState('')
  const [clock, setClock]       = useState('')

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' }) + ' ET')
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  async function handleSubscribe() {
    if (!email || !email.includes('@')) { setSubError('Enter a valid email'); return }
    setSubLoading(true); setSubError('')
    try {
      const r = await fetch('/api/stripe/subscription/checkout', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const d = await r.json()
      if (d.demo) { setSubError('Payment coming soon — check back shortly.'); setSubLoading(false); return }
      if (d.url) { window.location.href = d.url } else { setSubError(d.error || 'Something went wrong'); setSubLoading(false) }
    } catch { setSubError('Network error. Please try again.'); setSubLoading(false) }
  }

  return (
    <div style={{ background: '#040d14', color: '#dce8f0', fontFamily: '"Inter", system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeUp  { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse   { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes ticker  { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes glow    { 0%,100%{box-shadow:0 0 0 0 #00d4aa30} 50%{box-shadow:0 0 24px 4px #00d4aa18} }
        .a1 { animation: fadeUp .7s ease both }
        .a2 { animation: fadeUp .7s .1s ease both }
        .a3 { animation: fadeUp .7s .2s ease both }
        .a4 { animation: fadeUp .7s .3s ease both }
        .nav-link { font-size: 13px; color: #6a90a8; text-decoration: none; transition: color .15s; }
        .nav-link:hover { color: #dce8f0; }
        .section { max-width: 1200px; margin: 0 auto; padding: 0 24px; }
        .card { background: #060f18; border: 1px solid #0f2030; border-radius: 12px; transition: border-color .15s; }
        .card:hover { border-color: #1a3550; }
        .feat-card { background: #060f18; border: 1px solid #0f2030; border-radius: 10px; padding: 20px 18px; transition: border-color .15s, transform .2s; }
        .feat-card:hover { border-color: #00d4aa30; transform: translateY(-2px); }
        .sub-input { background: #060f18; border: 1px solid #0f2030; color: #dce8f0; border-radius: 8px; padding: 13px 16px; font-size: 15px; width: 100%; outline: none; transition: border-color .15s; }
        .sub-input:focus { border-color: #00d4aa; }
        .sub-input::placeholder { color: #2a4a62; }
        .sub-btn { background: linear-gradient(135deg,#00d4aa,#0ea5e9); color: #040d14; font-weight: 800; font-size: 15px; padding: 13px 28px; border-radius: 8px; border: none; cursor: pointer; white-space: nowrap; transition: opacity .15s, transform .15s; }
        .sub-btn:hover { opacity: .88; transform: translateY(-1px); }
        .sub-btn:disabled { opacity: .55; cursor: not-allowed; transform: none; }
        .ghost-btn { background: transparent; color: #6a90a8; font-size: 14px; padding: 12px 22px; border-radius: 8px; border: 1px solid #0f2030; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; gap: 6px; transition: all .15s; }
        .ghost-btn:hover { color: #dce8f0; border-color: #1a3550; }
        .live-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; background: #00d4aa; animation: pulse 2s infinite; flex-shrink: 0; }
        @media(max-width:900px) {
          .grid-2 { grid-template-columns: 1fr !important; }
          .grid-3 { grid-template-columns: 1fr 1fr !important; }
          .hide-sm { display: none !important; }
        }
        @media(max-width:600px) {
          .grid-3 { grid-template-columns: 1fr !important; }
          .grid-4 { grid-template-columns: 1fr 1fr !important; }
          .hero-form { flex-direction: column !important; }
        }
      `}</style>

      {/* ━━━ ANNOUNCEMENT BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ background: '#00d4aa', height: 36, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ background: '#00a884', padding: '0 18px', height: '100%', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontWeight: 800, fontSize: 11, letterSpacing: '.12em', color: '#040d14' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#040d14', display: 'inline-block' }}/>
          LIVE
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <div style={{ display: 'inline-flex', animation: 'ticker 44s linear infinite', whiteSpace: 'nowrap' }}>
            {[
              'Daily Intelligence · Expected moves for ES, NQ, YM, RTY every morning before open',
              'Macro Dashboard · Gold · Oil · Dollar · Bonds · Credit — all in one view',
              'Institutional Pulse · Wall Street analyst consensus updated daily',
              'Daily Playbook · Bull case · Bear case · 3 trade ideas · What to avoid',
              'Economic Calendar · High-impact events with actual vs estimate vs prior',
              'Morning Brief · AI-synthesized market narrative before every session',
            ].flatMap(t => [t, t]).map((t, i) => (
              <span key={i} style={{ padding: '0 48px', fontSize: 12, fontWeight: 600, color: '#040d14' }}>{t}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 16px', flexShrink: 0, fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: '#040d14', borderLeft: '1px solid #00a884' }}>{clock}</div>
      </div>

      {/* ━━━ NAV ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <nav style={{ borderBottom: '1px solid #0a1e2e', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(4,13,20,.95)' }}>
        <div className="section" style={{ height: 58, display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 6, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#040d14" fill="#040d14" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#dce8f0', letterSpacing: -.4 }}>YN Finance</span>
          </Link>

          <div style={{ display: 'flex', gap: 24, marginLeft: 8 }} className="hide-sm">
            <Link href="/daily"   className="nav-link">Daily Intelligence</Link>
            <Link href="/courses" className="nav-link">Courses</Link>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/courses" className="ghost-btn" style={{ fontSize: 13, padding: '7px 16px' }}>Courses — $0.99</Link>
            <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#00d4aa,#0ea5e9)', color: '#040d14', fontWeight: 800, fontSize: 13, padding: '8px 18px', borderRadius: 7, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Get Daily Intelligence →
            </Link>
          </div>
        </div>
      </nav>

      {/* ━━━ HERO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '80px 0 72px', borderBottom: '1px solid #0a1e2e' }}>
        <div className="section">
          <div style={{ maxWidth: 760, margin: '0 auto', textAlign: 'center' }}>

            <div className="a1" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00d4aa0f', border: '1px solid #00d4aa25', borderRadius: 100, padding: '6px 16px', fontSize: 12, color: '#00d4aa', fontWeight: 600, marginBottom: 28, letterSpacing: .2 }}>
              <span className="live-dot"/>
              Updated daily before market open · Real data · No hallucinations
            </div>

            <h1 className="a2" style={{ fontSize: 'clamp(40px,6vw,76px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2.5, marginBottom: 22, color: '#dce8f0' }}>
              The morning data hub<br />
              <span style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>serious traders pay for.</span>
            </h1>

            <p className="a3" style={{ fontSize: 18, color: '#6a90a8', lineHeight: 1.75, maxWidth: 580, margin: '0 auto 40px' }}>
              Expected moves, daily bias, macro dashboard, institutional pulse, and your complete trading playbook — AI-generated every morning before the open. Everything a Bloomberg terminal gives you, at <strong style={{ color: '#dce8f0' }}>$11.99/month</strong>.
            </p>

            {/* Subscribe form */}
            <div className="a4 hero-form" style={{ display: 'flex', gap: 10, maxWidth: 500, margin: '0 auto 16px', justifyContent: 'center' }}>
              <input
                className="sub-input"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSubscribe()}
              />
              <button className="sub-btn" onClick={handleSubscribe} disabled={subLoading}>
                {subLoading ? 'Loading...' : 'Start →'}
              </button>
            </div>
            {subError && <p style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>{subError}</p>}
            <p className="a4" style={{ fontSize: 12, color: '#2a4a62' }}>$11.99/month · Cancel anytime · Stripe secured</p>

            {/* Mini preview stats */}
            <div className="a4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 1, background: '#0a1e2e', borderRadius: 10, overflow: 'hidden', marginTop: 52, border: '1px solid #0a1e2e' }}>
              {[
                { label: 'ES / S&P 500',  val: 'Expected Move',  sub: '±21 pts today',   color: '#00d4aa' },
                { label: 'NQ / Nasdaq',   val: 'Daily Bias',     sub: 'BULLISH',          color: '#00d4aa' },
                { label: 'Macro Read',    val: 'Risk-On',        sub: 'Credit positive',  color: '#f59e0b' },
                { label: 'Playbook',      val: '3 Trade Ideas',  sub: 'Updated 8:30 AM',  color: '#1e90ff' },
              ].map(c => (
                <div key={c.label} style={{ background: '#060f18', padding: '16px 14px', textAlign: 'left' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#2a4a62', letterSpacing: '.08em', marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: c.color, marginBottom: 3 }}>{c.val}</div>
                  <div style={{ fontSize: 11, color: '#6a90a8', fontFamily: 'monospace' }}>{c.sub}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ WHAT'S INSIDE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e' }}>
        <div className="section">
          <div style={{ maxWidth: 520, marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 14 }}>8 Intelligence Modules</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16 }}>
              Everything you need before the open. Nothing you don&apos;t.
            </h2>
            <p style={{ fontSize: 16, color: '#6a90a8', lineHeight: 1.7 }}>
              Each module is powered by real market data from live APIs and synthesized by AI. No fake numbers, no generic advice.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {FEATURES.map(f => (
              <div key={f.title} className="feat-card">
                <div style={{ fontSize: 26, marginBottom: 12 }}>{f.icon}</div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#dce8f0', marginBottom: 8 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: '#6a90a8', lineHeight: 1.65 }}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ COMPARISON / VALUE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e', background: '#050c14' }}>
        <div className="section">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center' }} className="grid-2">
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 14 }}>The Smart Money Edge</div>
              <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1, lineHeight: 1.1, marginBottom: 20 }}>
                What top investors check every morning.
              </h2>
              <p style={{ fontSize: 15, color: '#6a90a8', lineHeight: 1.8, marginBottom: 28 }}>
                Hedge fund analysts, prop traders, and portfolio managers all run through the same checklist before the open. Gold, oil, dollar, bonds, yield curve, VIX term structure, analyst consensus, and earnings flow. Daily Intelligence does it automatically.
              </p>
              {[
                'Expected statistical ranges keep you from entering at the worst levels',
                'Daily bias stops you from fighting the institutional order flow',
                'Macro read tells you whether risk appetite is rising or falling',
                'The playbook gives you scenarios so nothing catches you off guard',
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 14, alignItems: 'flex-start' }}>
                  <span style={{ color: '#00d4aa', fontSize: 14, flex: '0 0 auto', marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 14, color: '#6a90a8', lineHeight: 1.6 }}>{item}</span>
                </div>
              ))}
              <div style={{ marginTop: 32 }}>
                <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#00d4aa,#0ea5e9)', color: '#040d14', fontWeight: 800, fontSize: 15, padding: '14px 30px', borderRadius: 8, textDecoration: 'none', display: 'inline-block' }}>
                  Start for $11.99/month →
                </Link>
              </div>
            </div>

            {/* Comparison table */}
            <div className="card" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0f2030' }}>
                <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.12em', color: '#2a4a62' }}>WHAT IT WOULD COST ELSEWHERE</span>
              </div>
              {[
                { name: 'Bloomberg Terminal',     price: '$2,000/mo', check: false },
                { name: 'Refinitiv Eikon',        price: '$1,800/mo', check: false },
                { name: 'Goldman Sachs Research', price: 'Institutional only', check: false },
                { name: 'Morning Brew Markets',   price: 'Free · no bias/moves', check: false },
                { name: 'YN Daily Intelligence',  price: '$11.99/mo', check: true  },
              ].map((row, i) => (
                <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 20px', borderBottom: i < 4 ? '1px solid #0a1e2e' : 'none', background: row.check ? '#00d4aa08' : 'transparent' }}>
                  <span style={{ fontWeight: row.check ? 700 : 400, color: row.check ? '#dce8f0' : '#2a4a62', fontSize: 13 }}>{row.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ color: row.check ? '#00d4aa' : '#2a4a62', fontWeight: row.check ? 800 : 400, fontFamily: 'monospace', fontSize: 13 }}>{row.price}</span>
                    {row.check && <span style={{ color: '#00d4aa', fontSize: 16 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ━━━ REVIEWS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e' }}>
        <div className="section">
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1 }}>What traders say</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="grid-3">
            {REVIEWS.map(r => (
              <div key={r.name} className="card" style={{ padding: '24px 22px' }}>
                <p style={{ fontSize: 14, color: '#8aa8b8', lineHeight: 1.75, fontStyle: 'italic', marginBottom: 20 }}>{r.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: `${r.color}18`, border: `2px solid ${r.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: r.color, flexShrink: 0 }}>
                    {r.name.slice(0,2)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#dce8f0' }}>{r.name}</div>
                    <div style={{ fontSize: 11, color: r.color, fontWeight: 600, marginTop: 1 }}>{r.tag}</div>
                    <div style={{ fontSize: 10, color: '#2a4a62', marginTop: 1 }}>{r.loc}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ MISSION ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e', background: '#050c14' }}>
        <div className="section">
          <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6a90a8', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 20 }}>Our Mission</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 24 }}>
              Institutional-grade intelligence<br />belongs to everyone.
            </h2>
            <p style={{ fontSize: 16, color: '#6a90a8', lineHeight: 1.85 }}>
              Every morning, analysts at Goldman Sachs, JPMorgan, and Morgan Stanley run through the same data we put in Daily Intelligence. The difference? They charge institutional clients $50,000 a year for it. We charge $11.99 a month. The edge was never the data — it was access.
            </p>
          </div>
        </div>
      </section>

      {/* ━━━ COURSES (secondary) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e' }}>
        <div className="section">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1e90ff', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 12 }}>Courses · $0.99 each</div>
              <h2 style={{ fontSize: 'clamp(24px,3.5vw,40px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1, lineHeight: 1.1 }}>
                Learn from traders who actually trade.
              </h2>
            </div>
            <Link href="/courses" className="ghost-btn">Browse all 9 courses →</Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {INSTRUCTORS.map(inst => (
              <Link key={inst.name} href="/courses" style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: '14px', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 38, height: 38, borderRadius: 9, background: `${inst.color}18`, border: `2px solid ${inst.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: inst.color, flexShrink: 0 }}>{inst.init}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#dce8f0', lineHeight: 1.3 }}>{inst.name}</div>
                    <div style={{ fontSize: 10, color: inst.color, fontWeight: 600, marginTop: 2 }}>{inst.tag}</div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          <div style={{ marginTop: 24, background: '#060f18', border: '1px solid #0f2030', borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#dce8f0', marginBottom: 4 }}>9 courses. $0.99 each. No subscription.</div>
              <div style={{ fontSize: 13, color: '#6a90a8' }}>AI-narrated lessons, knowledge checks, and built-in practice mode.</div>
            </div>
            <Link href="/courses" style={{ background: '#1e90ff', color: '#040d14', fontWeight: 800, fontSize: 13, padding: '10px 22px', borderRadius: 7, textDecoration: 'none' }}>Browse Courses →</Link>
          </div>
        </div>
      </section>

      {/* ━━━ FOUNDERS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '88px 0', borderBottom: '1px solid #0a1e2e', background: '#050c14' }}>
        <div className="section">
          <div style={{ maxWidth: 480, marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6a90a8', textTransform: 'uppercase', letterSpacing: '.16em', marginBottom: 14 }}>The Team</div>
            <h2 style={{ fontSize: 'clamp(26px,3.5vw,42px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -1, lineHeight: 1.1 }}>
              Built by traders who learned the hard way.
            </h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="grid-3">
            {FOUNDERS.map(f => (
              <div key={f.name} className="card" style={{ padding: '24px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}18`, border: `2px solid ${f.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: f.color, flexShrink: 0 }}>{f.init}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#dce8f0' }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: f.color, fontWeight: 600, marginTop: 1 }}>{f.role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#8aa8b8', fontStyle: 'italic', lineHeight: 1.65, marginBottom: 14, paddingLeft: 10, borderLeft: `2px solid ${f.color}35` }}>{f.quote}</div>
                <div style={{ fontSize: 13, color: '#6a90a8', lineHeight: 1.65 }}>{f.bio}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ━━━ FINAL CTA ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <section style={{ padding: '100px 0' }}>
        <div className="section" style={{ textAlign: 'center', maxWidth: 620, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(32px,5vw,58px)', fontWeight: 900, color: '#dce8f0', letterSpacing: -2, lineHeight: 1.05, marginBottom: 20 }}>
            Your morning edge starts<br />at <span style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>$11.99 a month.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#6a90a8', marginBottom: 36, lineHeight: 1.7 }}>
            Cancel anytime. No lock-in. Just better mornings.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 12 }}>
            <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#00d4aa,#0ea5e9)', color: '#040d14', fontWeight: 800, fontSize: 16, padding: '15px 36px', borderRadius: 8, textDecoration: 'none' }}>
              Get Daily Intelligence →
            </Link>
            <Link href="/courses" className="ghost-btn" style={{ fontSize: 15, padding: '15px 24px' }}>Browse Courses</Link>
          </div>
          <p style={{ fontSize: 12, color: '#0f2030' }}>Stripe secured · Cancel anytime · Real market data · No hallucinations</p>
        </div>
      </section>

      {/* ━━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <footer style={{ borderTop: '1px solid #0a1e2e', padding: '32px 0' }}>
        <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: 5, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={11} color="#040d14" fill="#040d14" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#dce8f0' }}>YN Finance</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              ['/daily',    'Daily Intelligence'],
              ['/courses',  'Courses'],
              ['/daily/manage', 'My Subscription'],
              ['/privacy',  'Privacy'],
              ['/terms',    'Terms'],
            ].map(([href, label]) => (
              <Link key={label} href={href} className="nav-link" style={{ fontSize: 12 }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#0f2030' }}>© 2026 YN Finance · Not financial advice</div>
        </div>
      </footer>
    </div>
  )
}
