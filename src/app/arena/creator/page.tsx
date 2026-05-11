'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Zap, DollarSign, Users, TrendingUp, Copy, Check, Radio, Star } from 'lucide-react'

const TIERS = [
  { name: 'Rising',     color: '#00ffa3', min: 0,     maxEarn: '$500/mo',  commission: 10, guarantee: 0,    viewers: '0–500',   badge: '🌱' },
  { name: 'Established',color: '#0088ff', min: 500,   maxEarn: '$2K/mo',   commission: 12, guarantee: 50,   viewers: '500–2K',  badge: '⚡' },
  { name: 'Pro',        color: '#8855ff', min: 2000,  maxEarn: '$8K/mo',   commission: 14, guarantee: 200,  viewers: '2K–10K',  badge: '🔥' },
  { name: 'Elite',      color: '#ffcc00', min: 10000, maxEarn: 'Unlimited', commission: 15, guarantee: 500,  viewers: '10K+',    badge: '👑' },
]

const FAQ = [
  { q: 'How do I earn?',              a: 'When a viewer enters a tournament using your creator code at checkout, you earn your commission % of the entry fee — deposited to your Stripe account within 48 hours.' },
  { q: 'What\'s the floor guarantee?', a: 'Pro and Elite creators receive a monthly minimum regardless of referrals. Paid at the end of each month, as long as you stream at least 20 hours that month.' },
  { q: 'Do I need to win to earn?',   a: 'No. You earn on every entry your viewers make, win or lose. The commission is on the entry fee, not the outcome.' },
  { q: 'Can I use my code on streams?',a: 'Yes — display it as an overlay on your TradingView chart. We provide a ready-to-use stream package with overlays, alerts, and a ticker widget.' },
  { q: 'How long does approval take?',a: 'Applications reviewed within 48 hours. You need a social media presence, trading experience, or content creation background.' },
]

export default function CreatorPage() {
  const [copied, setCopied] = useState(false)
  const [form, setForm] = useState({ name: '', handle: '', platform: 'youtube', email: '', audience: '', style: 'day-trading' })
  const [submitted, setSubmitted] = useState(false)

  const demoCode = 'MARCUS-XK7'

  const copy = () => {
    navigator.clipboard.writeText(demoCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{ background: '#02030a', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(2,3,10,0.97)', borderBottom: '1px solid #0f1e38', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 54, gap: 16 }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#00ffa3,#0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={13} color="#02030a" fill="#02030a" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>YN Arena</span>
          </Link>
          <span style={{ color: '#1e3a5f' }}>›</span>
          <span style={{ fontSize: 13, color: '#00ffa3', fontWeight: 700 }}>Creator Program</span>
          <div style={{ flex: 1 }} />
          <Link href="/arena" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 12px', border: '1px solid #0f1e38', borderRadius: 6 }}>← Back to Arena</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#8855ff20', border: '1px solid #8855ff40', borderRadius: 100, padding: '6px 18px', fontSize: 11, color: '#8855ff', fontWeight: 700, marginBottom: 20, letterSpacing: '0.1em' }}>
            <Radio size={11} /> CREATOR PROGRAM — NOW ACCEPTING APPLICATIONS
          </div>
          <h1 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.05, marginBottom: 18 }}>
            Get paid to stream<br /><span style={{ background: 'linear-gradient(90deg,#00ffa3,#0088ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>your trades.</span>
          </h1>
          <p style={{ fontSize: 16, color: '#7f93b5', maxWidth: 560, margin: '0 auto 32px', lineHeight: 1.75 }}>
            Every time a viewer enters a tournament using your creator code, you earn a commission. Plus a monthly floor guarantee once you hit Pro tier. No followers required to start.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="#apply" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#00ffa3,#00cc80)', color: '#02030a', fontWeight: 900, textDecoration: 'none', padding: '14px 32px', borderRadius: 12, fontSize: 15 }}>
              Apply to Stream →
            </a>
            <a href="#how" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#070c16', color: '#e8eaf0', fontWeight: 700, textDecoration: 'none', padding: '14px 28px', borderRadius: 12, fontSize: 15, border: '1px solid #0f1e38' }}>
              How It Works
            </a>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 14, marginBottom: 56 }}>
          {[
            { icon: <DollarSign size={18} color="#00ffa3" />, value: '12%',      label: 'Commission per referral',   sub: 'on every entry fee, forever' },
            { icon: <Zap size={18} color="#ffcc00" />,        value: '$500/mo',  label: 'Pro tier floor guarantee',  sub: 'stream 20hrs/mo minimum' },
            { icon: <Users size={18} color="#0088ff" />,      value: '3,847',    label: 'Active traders watching',   sub: 'ready to watch your stream' },
            { icon: <Star size={18} color="#8855ff" />,       value: '48hr',     label: 'Application review time',   sub: 'fast approval, fast earnings' },
          ].map(({ icon, value, label, sub }) => (
            <div key={label} style={{ background: '#070c16', border: '1px solid #0f1e38', borderRadius: 14, padding: '20px 18px' }}>
              <div style={{ marginBottom: 10 }}>{icon}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: -0.5, marginBottom: 4 }}>{value}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#cdd6f4', marginBottom: 3 }}>{label}</div>
              <div style={{ fontSize: 10, color: '#4a5e7a' }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* How it works */}
        <div id="how" style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 8 }}>How it works</h2>
          <p style={{ fontSize: 13, color: '#4a5e7a', marginBottom: 32 }}>Three steps from application to first payout.</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
            {[
              { step: '01', icon: '✅', title: 'Apply & get approved', desc: 'Fill the form below. We review within 48 hours. No follower count requirement — we care about trading knowledge and content quality.' },
              { step: '02', icon: '🔑', title: 'Get your creator code', desc: 'You receive a unique code (e.g. MARCUS-XK7) and a streaming package: overlays, alerts, a live P&L widget, and an Arena ticker for your stream.' },
              { step: '03', icon: '💰', title: 'Earn on every entry', desc: 'Pin your code in stream. Viewers enter tournaments using it. You earn 10–15% of every entry fee — automatically, forever, no cap.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ background: '#070c16', border: '1px solid #0f1e38', borderRadius: 14, padding: '24px 20px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 60, fontWeight: 900, color: '#0c1428', fontFamily: 'monospace', position: 'absolute', top: 0, right: 12, lineHeight: 1 }}>{step}</div>
                <div style={{ fontSize: 32, marginBottom: 14 }}>{icon}</div>
                <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#4a5e7a', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Creator code demo */}
        <div style={{ background: 'linear-gradient(135deg,#04100a,#040e18)', border: '1px solid #00ffa330', borderRadius: 16, padding: '24px', marginBottom: 56, display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 11, color: '#00ffa3', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>Example creator code</div>
            <div style={{ fontSize: 13, color: '#7f93b5', marginBottom: 12, lineHeight: 1.6 }}>
              Share this code in stream or in your bio. Every tournament entry that uses it pays you your commission rate. No expiry, no cap on earnings.
            </div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: '#02030a', border: '1px solid #00ffa340', borderRadius: 10, padding: '12px 18px' }}>
              <span style={{ fontSize: 20, fontWeight: 900, color: '#00ffa3', fontFamily: 'monospace', letterSpacing: 2 }}>{demoCode}</span>
              <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, background: copied?'#00ffa320':'#0f1e38', border: `1px solid ${copied?'#00ffa340':'#1e3a5f'}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer', color: copied?'#00ffa3':'#7f93b5', fontSize: 11, fontWeight: 700 }}>
                {copied ? <Check size={12} /> : <Copy size={12} />} {copied?'Copied!':'Copy'}
              </button>
            </div>
          </div>
          <div style={{ background: '#02030a', border: '1px solid #0f1e38', borderRadius: 12, padding: '18px 20px', minWidth: 200 }}>
            <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>If 50 viewers enter $25 tournaments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#4a5e7a' }}>Total entries</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#fff', fontFamily: 'monospace' }}>50 × $25 = $1,250</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, color: '#4a5e7a' }}>Your commission (12%)</span>
                <span style={{ fontSize: 14, fontWeight: 900, color: '#00ffa3', fontFamily: 'monospace' }}>$150</span>
              </div>
              <div style={{ fontSize: 10, color: '#2a4060', marginTop: 4 }}>From a single stream session</div>
            </div>
          </div>
        </div>

        {/* Tiers */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 24 }}>Creator tiers</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 14 }}>
            {TIERS.map(t => (
              <div key={t.name} style={{ background: '#070c16', border: `1px solid ${t.color}30`, borderTop: `3px solid ${t.color}`, borderRadius: 14, padding: '20px 18px' }}>
                <div style={{ fontSize: 24, marginBottom: 8 }}>{t.badge}</div>
                <div style={{ fontSize: 16, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 14 }}>{t.viewers} avg viewers</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#4a5e7a' }}>Commission</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: t.color, fontFamily: 'monospace' }}>{t.commission}%</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#4a5e7a' }}>Floor guarantee</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: t.guarantee>0?'#ffcc00':'#2a4060', fontFamily: 'monospace' }}>
                      {t.guarantee>0?`$${t.guarantee}/mo`:'—'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: '#4a5e7a' }}>Potential</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>{t.maxEarn}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* FAQ */}
        <div style={{ marginBottom: 56 }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 24 }}>FAQ</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {FAQ.map(({ q, a }) => (
              <div key={q} style={{ background: '#070c16', border: '1px solid #0f1e38', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{q}</div>
                <div style={{ fontSize: 12, color: '#4a5e7a', lineHeight: 1.7 }}>{a}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Application form */}
        <div id="apply" style={{ background: '#070c16', border: '1px solid #0f1e38', borderRadius: 20, padding: '36px' }}>
          <h2 style={{ fontSize: 24, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 6 }}>Apply to stream on YN Arena</h2>
          <p style={{ fontSize: 13, color: '#4a5e7a', marginBottom: 28 }}>We respond within 48 hours. No follower minimum required.</p>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: '32px 0' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Application submitted</div>
              <div style={{ fontSize: 13, color: '#4a5e7a' }}>We&apos;ll review and email {form.email} within 48 hours.</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16 }}>
              {[
                { label: 'Full Name',         key: 'name',     ph: 'Marcus Thompson',       type: 'text' },
                { label: 'Social Handle',      key: 'handle',   ph: '@yourhandle',           type: 'text' },
                { label: 'Email',              key: 'email',    ph: 'you@example.com',       type: 'email' },
                { label: 'Audience Size',      key: 'audience', ph: 'e.g. 2,400 subscribers',type: 'text' },
              ].map(({ label, key, ph, type }) => (
                <div key={key}>
                  <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                  <input value={form[key as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={ph} type={type}
                    style={{ width: '100%', background: '#02030a', border: '1px solid #0f1e38', borderRadius: 9, padding: '10px 14px', color: '#e8eaf0', fontSize: 13, outline: 'none' }}
                    onFocus={e => (e.currentTarget.style.borderColor = '#00ffa3')}
                    onBlur={e => (e.currentTarget.style.borderColor = '#0f1e38')} />
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Platform</div>
                <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
                  style={{ width: '100%', background: '#02030a', border: '1px solid #0f1e38', borderRadius: 9, padding: '10px 14px', color: '#e8eaf0', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  {['youtube','twitch','tiktok','twitter/x','discord','other'].map(p => (
                    <option key={p} value={p} style={{ background: '#02030a' }}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Trading Style</div>
                <select value={form.style} onChange={e => setForm(f => ({ ...f, style: e.target.value }))}
                  style={{ width: '100%', background: '#02030a', border: '1px solid #0f1e38', borderRadius: 9, padding: '10px 14px', color: '#e8eaf0', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
                  {['day-trading','swing-trading','options','crypto','forex','futures','education'].map(s => (
                    <option key={s} value={s} style={{ background: '#02030a' }}>{s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div style={{ gridColumn: '1/-1' }}>
                <button onClick={() => { if(form.name&&form.email) setSubmitted(true) }}
                  style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#00ffa3,#00cc80)', color: '#02030a', border: 'none', borderRadius: 11, fontSize: 15, fontWeight: 900, cursor: 'pointer' }}>
                  Submit Application →
                </button>
                <span style={{ fontSize: 11, color: '#2a4060', marginLeft: 16 }}>Takes 2 minutes · 48hr review · No follower minimum</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer style={{ borderTop: '1px solid #0f1e38', padding: '24px', textAlign: 'center' }}>
        <div style={{ fontSize: 10, color: '#1e3a5f' }}>
          © 2026 YN Finance · Creator commissions paid via Stripe · <Link href="/arena" style={{ color: '#1e3a5f' }}>Back to Arena</Link> · <Link href="/terms" style={{ color: '#1e3a5f' }}>Terms</Link>
        </div>
      </footer>
    </div>
  )
}
