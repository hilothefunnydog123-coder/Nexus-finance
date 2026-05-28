'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

type KeyInfo = {
  key_prefix:       string
  tier:             string
  name:             string
  calls_month:      number
  limit_month:      number
  calls_total:      number
  created_at:       string
  last_used_at:     string | null
  has_subscription: boolean
}

function CopyBtn({ text, size = 'sm' }: { text: string; size?: 'sm' | 'md' }) {
  const [done, setDone] = useState(false)
  const pad = size === 'md' ? '8px 18px' : '5px 12px'
  const fs  = size === 'md' ? 12 : 11
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 2000) }}
      style={{ background: done ? 'rgba(0,212,170,.2)' : 'rgba(0,212,170,.08)', border: '1px solid rgba(0,212,170,.3)', color: '#00d4aa', padding: pad, borderRadius: 6, fontSize: fs, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700, flexShrink: 0, transition: 'all .2s' }}>
      {done ? '✓ Copied' : 'Copy'}
    </button>
  )
}

function UsageBar({ used, total }: { used: number; total: number }) {
  const pct = total === 0 ? 0 : Math.min(100, (used / total) * 100)
  const clr = pct > 80 ? '#ff2d78' : pct > 55 ? '#f59e0b' : '#00d4aa'
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11 }}>
        <span style={{ color: '#4a6a78' }}>Calls this month</span>
        <span style={{ color: clr, fontFamily: 'monospace', fontWeight: 700 }}>{used.toLocaleString()} / {total.toLocaleString()}</span>
      </div>
      <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 2, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: clr, borderRadius: 2, transition: 'width 1s ease', boxShadow: `0 0 8px ${clr}55` }}/>
      </div>
    </div>
  )
}

const TIER_COLOR: Record<string, string> = { free: '#00d4aa', pro: '#3b8eea', enterprise: '#a855f7' }

function TierBadge({ tier }: { tier: string }) {
  const c = TIER_COLOR[tier] ?? '#4a6a78'
  return (
    <span style={{ fontSize: 9, fontWeight: 800, color: c, background: `${c}18`, border: `1px solid ${c}30`, borderRadius: 10, padding: '3px 10px', letterSpacing: '1.5px', fontFamily: 'monospace' }}>
      {tier.toUpperCase()}
    </span>
  )
}

const CODE: Record<string, string> = {
  curl: `curl -X GET "https://ynfinance.org/api/v1/congress/trades?limit=10" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY_HERE"`,

  javascript: `const res = await fetch(
  'https://ynfinance.org/api/v1/congress/trades?limit=10',
  { headers: { 'Authorization': 'Bearer yn_live_YOUR_KEY_HERE' } }
)
const { trades } = await res.json()
console.log(trades)`,

  python: `import requests

data = requests.get(
  'https://ynfinance.org/api/v1/congress/trades',
  params={'limit': 10},
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY_HERE'}
).json()
print(data['trades'])`,
}

const ENDPOINTS = [
  { method: 'POST', path: '/api/v1/analyze',             clr: '#3b8eea', desc: 'AI trade analysis — verdict, key levels, recommendation', req: '{ ticker, direction, entry, sl, tp }',   res: '{ verdict, confidence, key_levels, recommendation }' },
  { method: 'GET',  path: '/api/v1/congress/trades',     clr: '#ff2d78', desc: 'Congressional trade disclosures with suspicion scores',    req: '?limit=20&days=30',                     res: '{ trades: [{ representative, ticker, type, suspicion_score }] }' },
  { method: 'POST', path: '/api/v1/earnings/decode',     clr: '#f59e0b', desc: 'Earnings forensics — management honesty score',            req: '{ symbol }',                            res: '{ truth_score, beat_rate, verdict }' },
  { method: 'GET',  path: '/api/v1/smart-money/signals', clr: '#00d4aa', desc: 'Insider purchases + unusual options activity',             req: '?type=all|insider|options',             res: '{ signals: [{ ticker, signal_type, signal_strength }] }' },
  { method: 'POST', path: '/api/v1/intelligence/run',    clr: '#a855f7', desc: 'Run any of the 6 YN Intelligence weapons',                req: '{ weapon, input }',                     res: '{ result: { ... } }' },
]

export default function DevelopersPage() {
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [codeTab, setCodeTab] = useState<'curl' | 'javascript' | 'python'>('curl')

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user,        setUser]        = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authTab,     setAuthTab]     = useState<'signin' | 'signup'>('signin')
  const [authEmail,   setAuthEmail]   = useState('')
  const [authPass,    setAuthPass]    = useState('')
  const [showPass,    setShowPass]    = useState(false)
  const [authBusy,    setAuthBusy]    = useState(false)
  const [authErr,     setAuthErr]     = useState('')
  const [authSucc,    setAuthSucc]    = useState('')

  // ── Key state ───────────────────────────────────────────────────────────────
  const [keyLoading, setKeyLoading] = useState(false)
  const [myKey,      setMyKey]      = useState<KeyInfo | null>(null)
  const [newKey,     setNewKey]     = useState('')   // shown once after claim
  const [claiming,   setClaiming]   = useState(false)
  const [claimErr,   setClaimErr]   = useState('')
  const [upgrading,  setUpgrading]  = useState(false)
  const [upgradeErr, setUpgradeErr] = useState('')
  const [upgraded,   setUpgraded]   = useState(false)

  // ── Cursor animation ────────────────────────────────────────────────────────
  useEffect(() => {
    let ax = -100, ay = -100, tx = -100, ty = -100, raf: number
    const mv = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY }
    const lp = () => { ax += (tx - ax) * .1; ay += (ty - ay) * .1; setCursorX(ax); setCursorY(ay); raf = requestAnimationFrame(lp) }
    window.addEventListener('mousemove', mv); raf = requestAnimationFrame(lp)
    return () => { window.removeEventListener('mousemove', mv); cancelAnimationFrame(raf) }
  }, [])

  // ── Auth init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) { setAuthLoading(false); return }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      setAuthLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    const p = new URLSearchParams(window.location.search)
    if (p.get('upgraded') === 'true') setUpgraded(true)

    return () => subscription.unsubscribe()
  }, [])

  // ── Fetch user's key ────────────────────────────────────────────────────────
  const fetchMyKey = useCallback(async (u: User | null) => {
    if (!u || !supabase) { setMyKey(null); return }
    setKeyLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) return
      const r = await fetch('/api/v1/keys/my', {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      })
      if (r.ok) {
        const d = await r.json()
        setMyKey(d.key_prefix ? d : null)
      } else {
        setMyKey(null)
      }
    } finally { setKeyLoading(false) }
  }, [])

  useEffect(() => {
    if (!authLoading) fetchMyKey(user)
  }, [user, authLoading, fetchMyKey])

  // ── Auth handlers ───────────────────────────────────────────────────────────
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()
    setAuthErr(''); setAuthSucc('')
    if (!supabase) { setAuthErr('Auth not configured — add Supabase env vars'); return }
    if (!authEmail) { setAuthErr('Email required'); return }
    if (!authPass)  { setAuthErr('Password required'); return }
    setAuthBusy(true)
    try {
      if (authTab === 'signup') {
        const { error } = await supabase.auth.signUp({ email: authEmail, password: authPass })
        if (error) { setAuthErr(error.message); return }
        setAuthSucc('Account created! Check your email to confirm, then sign in.')
        setAuthTab('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password: authPass })
        if (error) { setAuthErr(error.message); return }
      }
    } finally { setAuthBusy(false) }
  }

  async function handleMagicLink() {
    setAuthErr(''); setAuthSucc('')
    if (!authEmail) { setAuthErr('Email required'); return }
    setAuthBusy(true)
    try {
      const r = await fetch('/api/developers/auth/magic', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: authEmail.trim().toLowerCase() }),
      })
      const d = await r.json()
      if (!r.ok) { setAuthErr(d.error ?? 'Could not send link'); return }
      setAuthSucc(`Magic link sent to ${authEmail} — check your inbox and spam folder.`)
    } finally { setAuthBusy(false) }
  }

  async function handleSignOut() {
    if (!supabase) return
    await supabase.auth.signOut()
    setMyKey(null); setNewKey(''); setUpgraded(false)
  }

  // ── Claim free key ──────────────────────────────────────────────────────────
  async function handleClaimFree() {
    if (!supabase) return
    setClaimErr('')
    setClaiming(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) { setClaimErr('Session expired — please sign in again'); return }

      const r = await fetch('/api/v1/keys', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
        body:    JSON.stringify({ name: 'My App' }),
      })
      const d = await r.json()
      if (!r.ok) { setClaimErr(d.error ?? 'Failed to generate key'); return }
      setNewKey(d.key)
      await fetchMyKey(user)
    } finally { setClaiming(false) }
  }

  // ── Upgrade to Pro ──────────────────────────────────────────────────────────
  async function handleUpgrade() {
    if (!myKey || !user?.email || !supabase) return
    setUpgradeErr('')
    setUpgrading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const r = await fetch('/api/v1/keys/upgrade', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': session?.access_token ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ key_prefix: myKey.key_prefix, email: user.email }),
      })
      const d = await r.json()
      if (!r.ok) { setUpgradeErr(d.error ?? 'Upgrade failed'); return }
      if (d.checkout_url) window.location.href = d.checkout_url
    } finally { setUpgrading(false) }
  }

  const s = {
    card: { background: 'rgba(4,10,18,.92)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 14, overflow: 'hidden' } as React.CSSProperties,
    label: { fontSize: 9, letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 14 } as React.CSSProperties,
    input: { background: 'rgba(0,0,0,.5)', border: '1px solid rgba(255,255,255,.08)', color: '#dce8f0', padding: '.7rem 1rem', fontFamily: 'inherit', fontSize: 13, borderRadius: 8, outline: 'none', width: '100%', boxSizing: 'border-box' } as React.CSSProperties,
  }

  return (
    <div style={{ background: '#030a10', color: '#dce8f0', fontFamily: '"Inter",system-ui,sans-serif', minHeight: '100vh', cursor: 'none', overflowX: 'hidden' }}>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        @keyframes pulse-dot{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes shimmer{0%{left:-100%}100%{left:200%}}
        .nav-link{color:#4a6a78;text-decoration:none;font-size:13px;transition:color .2s}.nav-link:hover{color:#00d4aa}
        pre{white-space:pre-wrap;word-break:break-all;font-size:12.5px}
        ::selection{background:#3b8eea25}
        @media(max-width:900px){.pg3{grid-template-columns:1fr!important}.pg2{grid-template-columns:1fr!important}.hsm{display:none!important}}
        @media(max-width:600px){.auth-split{grid-template-columns:1fr!important}}
      `}</style>

      {/* Custom cursor */}
      <div style={{ position: 'fixed', zIndex: 9999, pointerEvents: 'none', left: cursorX - 5,  top: cursorY - 5,  width: 10, height: 10, borderRadius: '50%', background: '#3b8eea', mixBlendMode: 'difference' }}/>
      <div style={{ position: 'fixed', zIndex: 9998, pointerEvents: 'none', left: cursorX - 18, top: cursorY - 18, width: 36, height: 36, borderRadius: '50%', border: '1px solid rgba(59,142,234,.4)', transition: 'left .08s,top .08s' }}/>

      {/* Nav */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, height: 58, display: 'flex', alignItems: 'center', padding: '0 28px', gap: 24, background: 'rgba(3,10,16,.9)', backdropFilter: 'blur(24px)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none', flexShrink: 0 }}>
          <YNMark size={28}/>
          <span style={{ fontWeight: 900, fontSize: 14, letterSpacing: '-.3px' }}>YN Finance</span>
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#3b8eea', fontWeight: 700, letterSpacing: '.8px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b8eea', animation: 'pulse-dot 1.5s infinite', display: 'inline-block' }}/>
          DEVELOPERS · API v1
        </div>
        <div style={{ display: 'flex', gap: 20, marginLeft: 'auto', alignItems: 'center' }}>
          {[['Company', '/company'], ['Research', '/research'], ['Platform', '/app']].map(([l, h]) =>
            <Link key={l} href={h} className="nav-link">{l}</Link>
          )}
          {user && (
            <button
              onClick={handleSignOut}
              style={{ fontSize: 11, color: '#4a6a78', background: 'transparent', border: '1px solid rgba(255,255,255,.07)', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, transition: 'all .2s' }}
              onMouseEnter={e => e.currentTarget.style.color = '#ff2d78'}
              onMouseLeave={e => e.currentTarget.style.color = '#4a6a78'}>
              Sign out
            </button>
          )}
        </div>
      </nav>

      <div style={{ paddingTop: 58, position: 'relative', zIndex: 1 }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', padding: '64px 24px 48px', maxWidth: 680, margin: '0 auto', animation: 'fadeUp .6s ease' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(59,142,234,.08)', border: '1px solid rgba(59,142,234,.2)', borderRadius: 20, padding: '6px 18px', marginBottom: 20, fontSize: 10, color: '#3b8eea', fontWeight: 700, letterSpacing: '1.5px' }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#3b8eea', animation: 'pulse-dot 1.5s infinite', display: 'inline-block' }}/>
            YN FINANCE API · v1.0 · REST · JSON
          </div>
          <h1 style={{ fontSize: 'clamp(30px,5vw,58px)', fontWeight: 900, letterSpacing: '-3px', lineHeight: .93, marginBottom: 16 }}>
            Build on the intelligence<br/>
            <span style={{ background: 'linear-gradient(135deg,#3b8eea,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Wall Street keeps private.</span>
          </h1>
          <p style={{ fontSize: 15, color: '#3a5a6a', lineHeight: 1.7 }}>Congressional trades. Smart money signals. Earnings forensics. AI analysis. Plug it into any app in minutes.</p>
        </div>

        {/* Success banner */}
        {upgraded && (
          <div style={{ maxWidth: 680, margin: '0 auto 28px', padding: '0 24px', animation: 'fadeUp .4s ease' }}>
            <div style={{ background: 'rgba(59,142,234,.1)', border: '1px solid rgba(59,142,234,.3)', borderRadius: 10, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 20 }}>🎉</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#3b8eea' }}>You&apos;re now on Pro!</div>
                <div style={{ fontSize: 12, color: '#2a4050', marginTop: 2 }}>Your API key has been upgraded to 10,000 calls/month.</div>
              </div>
            </div>
          </div>
        )}

        {/* ── AUTH GATE ──────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 24px 64px' }}>

          {/* Loading auth */}
          {authLoading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid rgba(59,142,234,.2)', borderTop: '2px solid #3b8eea', animation: 'spin 1s linear infinite' }}/>
            </div>
          )}

          {/* ── NOT LOGGED IN ── */}
          {!authLoading && !user && (
            <div style={{ animation: 'fadeUp .5s ease' }}>
              <div className="auth-split" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 860, margin: '0 auto' }}>

                {/* Sign in / up form */}
                <div style={{ ...s.card, border: '1px solid rgba(59,142,234,.25)', boxShadow: '0 0 40px rgba(59,142,234,.05)' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#3b8eea,#a855f7)' }}/>
                  <div style={{ padding: '28px 26px' }}>
                    <div style={{ ...s.label, color: '#3b8eea' }}>GET STARTED</div>

                    {/* Tabs */}
                    <div style={{ display: 'flex', gap: 0, marginBottom: 22, background: 'rgba(0,0,0,.3)', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(255,255,255,.06)' }}>
                      {(['signin', 'signup'] as const).map(t => (
                        <button key={t} onClick={() => { setAuthTab(t); setAuthErr(''); setAuthSucc('') }}
                          style={{ flex: 1, padding: '10px', background: authTab === t ? 'rgba(59,142,234,.15)' : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: authTab === t ? '#3b8eea' : '#2a4050', transition: 'all .2s' }}>
                          {t === 'signin' ? 'Sign In' : 'Sign Up'}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      <input
                        type="email" placeholder="your@email.com"
                        value={authEmail} onChange={e => setAuthEmail(e.target.value)}
                        style={s.input}/>
                      <div style={{ position: 'relative' }}>
                        <input
                          type={showPass ? 'text' : 'password'} placeholder="Password (min 6 chars)"
                          value={authPass} onChange={e => setAuthPass(e.target.value)}
                          style={{ ...s.input, paddingRight: 44 }}/>
                        <button type="button" onClick={() => setShowPass(x => !x)}
                          style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#2a4050', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>
                          {showPass ? '🙈' : '👁'}
                        </button>
                      </div>

                      {authErr  && <div style={{ color: '#ff2d78', fontSize: 11, fontFamily: 'monospace' }}>{authErr}</div>}
                      {authSucc && <div style={{ color: '#00d4aa', fontSize: 11, fontFamily: 'monospace' }}>{authSucc}</div>}

                      <button type="submit" disabled={authBusy}
                        style={{ padding: '12px', background: 'linear-gradient(135deg,#3b8eea,#a855f7)', border: 'none', borderRadius: 8, color: '#fff', fontWeight: 900, fontSize: 13, cursor: authBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: authBusy ? .7 : 1, boxShadow: '0 0 24px rgba(59,142,234,.18)', marginTop: 2 }}>
                        {authBusy ? 'Loading...' : authTab === 'signin' ? 'Sign In →' : 'Create Account →'}
                      </button>
                    </form>

                    <div style={{ marginTop: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }}/>
                      <span style={{ fontSize: 10, color: '#1a3040', letterSpacing: '1px' }}>OR</span>
                      <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,.06)' }}/>
                    </div>

                    <button onClick={handleMagicLink} disabled={authBusy}
                      style={{ marginTop: 12, width: '100%', padding: '11px', background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.18)', borderRadius: 8, color: '#00d4aa', fontWeight: 700, fontSize: 12, cursor: authBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', transition: 'all .2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,212,170,.12)'}
                      onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,212,170,.06)'}>
                      ✉ Send Magic Link
                    </button>
                  </div>
                </div>

                {/* What you get */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[
                    { clr: '#00d4aa', icon: '⚡', tier: 'FREE',       price: '$0/mo',    desc: '100 calls/month · 5 endpoints · No card required' },
                    { clr: '#3b8eea', icon: '🚀', tier: 'PRO',        price: '$49/mo',   desc: '10,000 calls/month · All endpoints · Priority support' },
                    { clr: '#a855f7', icon: '🏢', tier: 'ENTERPRISE', price: 'Custom',   desc: 'Unlimited calls · SLA · Dedicated Slack channel' },
                  ].map(({ clr, icon, tier, price, desc }) => (
                    <div key={tier} style={{ background: 'rgba(4,10,18,.9)', border: `1px solid ${clr}18`, borderRadius: 12, padding: '16px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: `${clr}15`, border: `1px solid ${clr}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{icon}</div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: clr, letterSpacing: '1.5px', fontFamily: 'monospace' }}>{tier}</span>
                          <span style={{ fontSize: 18, fontWeight: 900, color: '#dce8f0', fontFamily: 'monospace', letterSpacing: '-1px' }}>{price}</span>
                        </div>
                        <div style={{ fontSize: 12, color: '#3a5a6a' }}>{desc}</div>
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#1a3040', textAlign: 'center', marginTop: 4 }}>
                    Sign in above to get your free key instantly — no card required.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOGGED IN ── */}
          {!authLoading && user && (
            <div style={{ animation: 'fadeUp .4s ease' }}>

              {/* ── Key loading ── */}
              {keyLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(59,142,234,.2)', borderTop: '2px solid #3b8eea', animation: 'spin 1s linear infinite' }}/>
                </div>
              )}

              {/* ── No key yet ── */}
              {!keyLoading && !myKey && (
                <div style={{ maxWidth: 680, margin: '0 auto', ...s.card, border: '1px solid rgba(0,212,170,.2)', boxShadow: '0 0 50px rgba(0,212,170,.04)' }}>
                  <div style={{ height: 3, background: 'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
                  <div style={{ padding: '36px 32px', textAlign: 'center' }}>
                    <div style={{ width: 56, height: 56, borderRadius: 16, background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 24 }}>⚡</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#dce8f0', letterSpacing: '-.5px', marginBottom: 8 }}>
                      Claim your free API key
                    </div>
                    <div style={{ fontSize: 13, color: '#3a5a6a', marginBottom: 6 }}>
                      Signed in as <span style={{ color: '#4a8a9a', fontFamily: 'monospace', fontSize: 12 }}>{user.email}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#2a4050', marginBottom: 28 }}>
                      100 calls/month · 5 endpoints · Free forever · No credit card
                    </div>
                    {claimErr && <div style={{ color: '#ff2d78', fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}>{claimErr}</div>}
                    <button onClick={handleClaimFree} disabled={claiming}
                      style={{ padding: '14px 40px', background: claiming ? 'rgba(0,212,170,.1)' : 'linear-gradient(135deg,#00d4aa,#1e90ff)', border: claiming ? '1px solid rgba(0,212,170,.2)' : 'none', borderRadius: 10, color: claiming ? '#00d4aa' : '#030a10', fontWeight: 900, fontSize: 14, cursor: claiming ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: claiming ? .7 : 1, boxShadow: claiming ? 'none' : '0 0 30px rgba(0,212,170,.2)', transition: 'all .3s' }}>
                      {claiming ? 'Generating...' : 'Claim Free Key →'}
                    </button>
                    <div style={{ marginTop: 16, fontSize: 11, color: '#1a3040' }}>
                      Want more? <span style={{ color: '#3b8eea' }}>10,000 calls/month for $49/mo</span> — upgrade after claiming.
                    </div>
                  </div>
                </div>
              )}

              {/* ── Has a key ── */}
              {!keyLoading && myKey && (
                <div style={{ maxWidth: 860, margin: '0 auto' }}>

                  {/* One-time key reveal */}
                  {newKey && (
                    <div style={{ ...s.card, border: '1px solid rgba(0,212,170,.3)', marginBottom: 16, animation: 'fadeUp .3s ease', boxShadow: '0 0 40px rgba(0,212,170,.06)' }}>
                      <div style={{ height: 3, background: 'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
                      <div style={{ padding: '20px 24px' }}>
                        <div style={{ fontSize: 9, color: '#ff2d78', letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 12 }}>⚠ COPY YOUR KEY NOW — SHOWN ONLY ONCE</div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
                          <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', background: 'rgba(0,0,0,.5)', padding: '10px 12px', borderRadius: 7, wordBreak: 'break-all', border: '1px solid rgba(0,212,170,.15)', lineHeight: 1.6 }}>{newKey}</code>
                          <CopyBtn text={newKey} size="md"/>
                        </div>
                        <div style={{ fontSize: 11, color: '#2a4050' }}>Free tier · 100 calls/month · Use as <code style={{ color: '#3b8eea', fontFamily: 'monospace', fontSize: 10 }}>Authorization: Bearer {newKey.slice(0, 20)}...</code></div>
                      </div>
                    </div>
                  )}

                  {/* Key dashboard */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }} className="pg2">

                    {/* Key info card */}
                    <div style={{ ...s.card, border: `1px solid ${TIER_COLOR[myKey.tier] ?? '#3b8eea'}25` }}>
                      <div style={{ height: 3, background: myKey.tier === 'pro' ? 'linear-gradient(90deg,#3b8eea,#a855f7)' : myKey.tier === 'enterprise' ? 'linear-gradient(90deg,#a855f7,#ec4899)' : 'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
                      <div style={{ padding: '22px 22px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                          <div style={{ ...s.label, color: TIER_COLOR[myKey.tier] ?? '#3b8eea', margin: 0 }}>YOUR API KEY</div>
                          <TierBadge tier={myKey.tier}/>
                        </div>

                        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                          <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, color: '#6a9aaa', background: 'rgba(0,0,0,.4)', padding: '8px 10px', borderRadius: 6, border: '1px solid rgba(255,255,255,.05)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {myKey.key_prefix}<span style={{ color: '#2a4050' }}>••••••••••••••••••••••••••••••••</span>
                          </code>
                          <CopyBtn text={myKey.key_prefix}/>
                        </div>
                        <div style={{ fontSize: 10, color: '#1a3040', fontFamily: 'monospace', marginBottom: 4 }}>Showing prefix only — full key is not recoverable</div>

                        <UsageBar used={myKey.calls_month} total={myKey.limit_month}/>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 14 }}>
                          <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.04)', borderRadius: 7, padding: '10px 12px' }}>
                            <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 5 }}>TOTAL CALLS</div>
                            <div style={{ fontSize: 16, fontWeight: 900, color: '#a855f7', fontFamily: 'monospace' }}>{myKey.calls_total.toLocaleString()}</div>
                          </div>
                          <div style={{ background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.04)', borderRadius: 7, padding: '10px 12px' }}>
                            <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 5 }}>LAST USED</div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#6a8a9a', fontFamily: 'monospace' }}>
                              {myKey.last_used_at ? new Date(myKey.last_used_at).toLocaleDateString() : '—'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Upgrade / manage card */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>

                      {myKey.tier === 'free' && (
                        <div style={{ ...s.card, border: '1px solid rgba(59,142,234,.22)', flex: 1 }}>
                          <div style={{ height: 3, background: 'linear-gradient(90deg,#3b8eea,#a855f7)' }}/>
                          <div style={{ padding: '22px' }}>
                            <div style={{ ...s.label, color: '#3b8eea' }}>UPGRADE TO PRO</div>
                            <div style={{ fontSize: 32, fontWeight: 900, color: '#dce8f0', fontFamily: 'monospace', letterSpacing: '-2px', marginBottom: 4 }}>$49<span style={{ fontSize: 14, color: '#2a4050', letterSpacing: 0 }}>/mo</span></div>
                            <div style={{ fontSize: 12, color: '#2a4050', marginBottom: 16 }}>100× more calls · All endpoints · Priority support</div>
                            {['10,000 calls/month', 'All 5 endpoints', '60 req/min', 'Priority email support', 'Cancel anytime'].map(f => (
                              <div key={f} style={{ display: 'flex', gap: 8, fontSize: 12, color: '#4a6a78', marginBottom: 7 }}>
                                <span style={{ color: '#3b8eea' }}>✓</span>{f}
                              </div>
                            ))}
                            {upgradeErr && <div style={{ color: '#ff2d78', fontSize: 11, fontFamily: 'monospace', marginTop: 10, marginBottom: 8 }}>{upgradeErr}</div>}
                            <button onClick={handleUpgrade} disabled={upgrading}
                              style={{ marginTop: 14, width: '100%', padding: '12px', background: upgrading ? 'transparent' : 'linear-gradient(135deg,#3b8eea,#a855f7)', border: upgrading ? '1px solid rgba(59,142,234,.3)' : 'none', borderRadius: 8, color: upgrading ? '#3b8eea' : '#fff', fontWeight: 900, fontSize: 13, cursor: upgrading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: upgrading ? .7 : 1, boxShadow: upgrading ? 'none' : '0 0 24px rgba(59,142,234,.18)', transition: 'all .2s' }}>
                              {upgrading ? 'Redirecting to Stripe...' : 'Upgrade to Pro →'}
                            </button>
                            <div style={{ fontSize: 10, color: '#1a3040', textAlign: 'center', marginTop: 8 }}>Stripe checkout · Cancel anytime</div>
                          </div>
                        </div>
                      )}

                      {myKey.tier === 'pro' && (
                        <div style={{ ...s.card, border: '1px solid rgba(59,142,234,.22)', flex: 1 }}>
                          <div style={{ height: 3, background: 'linear-gradient(90deg,#3b8eea,#a855f7)' }}/>
                          <div style={{ padding: '22px' }}>
                            <div style={{ ...s.label, color: '#3b8eea' }}>PRO SUBSCRIPTION</div>
                            <div style={{ fontSize: 14, color: '#4a8a9a', marginBottom: 16, lineHeight: 1.5 }}>
                              You&apos;re on Pro — 10,000 calls/month, all endpoints, priority support.
                            </div>
                            {['10,000 calls/month ✓', 'All 5 endpoints ✓', '60 req/min rate limit ✓', 'Priority support ✓'].map(f => (
                              <div key={f} style={{ fontSize: 12, color: '#3b8eea', marginBottom: 6, fontFamily: 'monospace' }}>{f}</div>
                            ))}
                            <a href="mailto:api@ynfinance.org?subject=Manage+Pro+Subscription"
                              style={{ display: 'block', textAlign: 'center', background: 'rgba(59,142,234,.08)', border: '1px solid rgba(59,142,234,.2)', color: '#3b8eea', padding: '11px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none', marginTop: 20, transition: 'all .2s' }}
                              onMouseEnter={e => e.currentTarget.style.background = 'rgba(59,142,234,.15)'}
                              onMouseLeave={e => e.currentTarget.style.background = 'rgba(59,142,234,.08)'}>
                              Manage Subscription →
                            </a>
                          </div>
                        </div>
                      )}

                      {/* Enterprise card (always show) */}
                      <div style={{ ...s.card, border: '1px solid rgba(168,85,247,.14)' }}>
                        <div style={{ padding: '18px 20px' }}>
                          <div style={{ ...s.label, color: '#a855f7', marginBottom: 8 }}>ENTERPRISE</div>
                          <div style={{ fontSize: 12, color: '#3a5a6a', marginBottom: 12 }}>Unlimited · SLA · Dedicated Slack · White-label</div>
                          <a href="mailto:api@ynfinance.org?subject=Enterprise API"
                            style={{ display: 'block', textAlign: 'center', background: 'rgba(168,85,247,.08)', border: '1px solid rgba(168,85,247,.22)', color: '#a855f7', padding: '10px', borderRadius: 8, fontSize: 12, fontWeight: 800, textDecoration: 'none', transition: 'all .2s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(168,85,247,.16)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'rgba(168,85,247,.08)'}>
                            Contact Sales →
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── ENDPOINTS ──────────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 72px' }}>
          <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 22 }}>ENDPOINTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {ENDPOINTS.map(ep => (
              <div key={ep.path} style={{ background: 'rgba(4,10,18,.92)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                  <span style={{ fontSize: 9, fontWeight: 800, color: ep.clr, background: `${ep.clr}12`, border: `1px solid ${ep.clr}25`, borderRadius: 4, padding: '3px 8px', fontFamily: 'monospace', flexShrink: 0 }}>{ep.method}</span>
                  <code style={{ fontSize: 13, color: '#dce8f0', fontFamily: 'monospace', fontWeight: 600 }}>{ep.path}</code>
                  <span className="hsm" style={{ fontSize: 11, color: '#2a4050', marginLeft: 'auto' }}>{ep.desc}</span>
                </div>
                <div className="pg2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
                  <div style={{ padding: '12px 20px', borderRight: '1px solid rgba(255,255,255,.04)' }}>
                    <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 6 }}>REQUEST</div>
                    <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a9aaa', lineHeight: 1.5 }}>{ep.req}</pre>
                  </div>
                  <div style={{ padding: '12px 20px' }}>
                    <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 6 }}>RESPONSE</div>
                    <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', lineHeight: 1.5 }}>{ep.res}</pre>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── CODE EXAMPLES ──────────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 80px' }}>
          <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 18 }}>CODE EXAMPLES</div>
          <div style={{ background: 'rgba(4,10,18,.95)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 13, overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,.05)', background: 'rgba(0,0,0,.2)' }}>
              {(['curl', 'javascript', 'python'] as const).map(t => (
                <button key={t} onClick={() => setCodeTab(t)}
                  style={{ padding: '11px 20px', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: codeTab === t ? '#3b8eea' : '#2a4050', borderBottom: codeTab === t ? '2px solid #3b8eea' : '2px solid transparent', transition: 'all .2s' }}>
                  {t}
                </button>
              ))}
            </div>
            <pre style={{ padding: '22px', fontFamily: 'monospace', lineHeight: 1.8, color: '#c8d8e0', overflowX: 'auto' }}>{CODE[codeTab]}</pre>
          </div>
        </div>

        {/* ── AUTH + RATE LIMITS ──────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 96px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="pg2">
          <div>
            <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>AUTHENTICATION</div>
            <div style={{ background: 'rgba(4,10,18,.92)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, padding: '20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dce8f0', marginBottom: 10 }}>Bearer Token</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', background: 'rgba(0,0,0,.4)', padding: '12px', borderRadius: 7, border: '1px solid rgba(0,212,170,.1)', marginBottom: 14 }}>{`Authorization: Bearer yn_live_xxxx`}</pre>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dce8f0', marginBottom: 10 }}>Header Alternative</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', background: 'rgba(0,0,0,.4)', padding: '12px', borderRadius: 7, border: '1px solid rgba(0,212,170,.1)' }}>{`x-api-key: yn_live_xxxx`}</pre>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>RATE LIMITS</div>
            <div style={{ background: 'rgba(4,10,18,.92)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.04)' }}>
                {['Tier', 'Monthly', 'Per min', 'Price'].map(h => (
                  <div key={h} style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 700 }}>{h}</div>
                ))}
              </div>
              {[['Free', '100', '10', '$0'], ['Pro', '10,000', '60', '$49/mo'], ['Enterprise', '∞', '300+', 'Custom']].map(([t, m, r, p]) => (
                <div key={t} style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,.03)' }}>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, color: t === 'Pro' ? '#3b8eea' : t === 'Enterprise' ? '#a855f7' : '#00d4aa' }}>{t}</div>
                  {[m, r, p].map(v => <div key={v} style={{ fontFamily: 'monospace', fontSize: 12, color: '#6a8a9a' }}>{v}</div>)}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
