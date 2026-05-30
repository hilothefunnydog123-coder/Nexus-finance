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

const BASE = 'https://ynfinance.org'

const ENDPOINTS: {
  method: string; path: string; clr: string; desc: string
  params: string; body: string | null
  response: string; dataSource: string
  example: Record<string, string>
}[] = [
  {
    method: 'GET', path: '/api/v1/congress/trades', clr: '#ff2d78',
    desc: 'Live congressional stock trades — fetched from House disclosure filings, enriched with real-time Finnhub prices and AI suspicion scoring.',
    params: '?limit=20  (max 100)\n?days=30   (max 365)', body: null,
    response: `{
  "trades": [{
    "representative": "Nancy Pelosi",
    "party": "D", "state": "CA",
    "ticker": "NVDA",
    "type": "purchase",
    "amount": "$250,001 - $500,000",
    "transaction_date": "2026-05-20",
    "current_price": 878.20,
    "price_change_pct": 2.4,
    "suspicion_score": 97   // 0-100
  }],
  "stats": {
    "total_this_year": 847,
    "most_active_rep": "Adam Schiff",
    "biggest_trade": "$500,001+",
    "total_reps": 73
  }
}`,
    dataSource: 'House Stock Watcher filings + Finnhub live prices + Gemini AI',
    example: {
      curl: `curl "${BASE}/api/v1/congress/trades?limit=10&days=30" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY"`,
      javascript: `const res = await fetch(
  '${BASE}/api/v1/congress/trades?limit=10&days=30',
  { headers: { Authorization: 'Bearer yn_live_YOUR_KEY' } }
)
const { trades, stats } = await res.json()
// trades[0].representative, .ticker, .suspicion_score`,
      python: `import requests
r = requests.get(
  '${BASE}/api/v1/congress/trades',
  params={'limit': 10, 'days': 30},
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY'}
).json()
for t in r['trades']:
    print(t['representative'], t['ticker'], t['suspicion_score'])`,
    }
  },
  {
    method: 'POST', path: '/api/v1/analyze', clr: '#3b8eea',
    desc: 'Full AI trade analysis — sends your setup to Gemini which pulls live Finnhub data (price, news, earnings, analyst ratings) and returns a hedge-fund style verdict.',
    params: '', body: `{
  "ticker":    "AAPL",
  "direction": "long",   // "long" | "short"
  "entry":     189.50,
  "sl":        183.00,
  "tp":        205.00
}`,
    response: `{
  "ticker": "AAPL",
  "verdict": "Buy",
  "confidence": 72,
  "sentiment_score": 7,
  "key_levels": {
    "strong_support": 182.40,
    "support": 185.60,
    "resistance": 193.20,
    "strong_resistance": 198.50
  },
  "recommendation": "Apple shows strong institutional accumulation
    near 52W support. R:R of 2.4 is favorable given earnings beat
    last quarter. Hold with stop at 183."
}`,
    dataSource: 'Finnhub (quote, news, earnings, analyst recs) + Gemini 2.0 Flash',
    example: {
      curl: `curl -X POST "${BASE}/api/v1/analyze" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"ticker":"AAPL","direction":"long","entry":189.50,"sl":183,"tp":205}'`,
      javascript: `const res = await fetch('${BASE}/api/v1/analyze', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer yn_live_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ticker: 'AAPL', direction: 'long',
    entry: 189.50, sl: 183, tp: 205
  })
})
const { verdict, confidence, key_levels, recommendation } = await res.json()`,
      python: `import requests
data = requests.post(
  '${BASE}/api/v1/analyze',
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY'},
  json={'ticker':'AAPL','direction':'long','entry':189.50,'sl':183,'tp':205}
).json()
print(data['verdict'], data['confidence'])`,
    }
  },
  {
    method: 'POST', path: '/api/v1/earnings/decode', clr: '#f59e0b',
    desc: 'Earnings forensics — Gemini reads Finnhub earnings history and scores management honesty. Detects when guidance diverges from actual numbers.',
    params: '', body: `{ "symbol": "TSLA" }`,
    response: `{
  "symbol": "TSLA",
  "truth_score": 68,       // 0-100, higher = more honest
  "verdict": "MIXED",      // HONEST | MIXED | DECEPTIVE
  "confidence": 74,
  "analysis": "Management revenue guidance consistently
    runs 8% above actuals. EPS beats are real but driven
    by one-time items not operating leverage.",
  "red_flags": ["Revenue recognition timing"],
  "green_flags": ["Consecutive EPS beats"],
  "the_trade": "Fade the post-earnings gap if guidance
    comes in above consensus"
}`,
    dataSource: 'Finnhub earnings history + Gemini 2.0 Flash lie detection',
    example: {
      curl: `curl -X POST "${BASE}/api/v1/earnings/decode" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"symbol":"TSLA"}'`,
      javascript: `const res = await fetch('${BASE}/api/v1/earnings/decode', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer yn_live_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ symbol: 'TSLA' })
})
const { truth_score, verdict, red_flags } = await res.json()`,
      python: `import requests
data = requests.post(
  '${BASE}/api/v1/earnings/decode',
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY'},
  json={'symbol': 'TSLA'}
).json()
print(data['truth_score'], data['verdict'])`,
    }
  },
  {
    method: 'GET', path: '/api/v1/smart-money/signals', clr: '#00d4aa',
    desc: 'Smart money signals — Gemini analyzes cross-asset correlations and forced institutional flows to surface high-conviction trade setups.',
    params: '?type=all      (default)\n?type=insider\n?type=options', body: null,
    response: `{
  "signals": [{
    "type": "forced-flow",
    "ticker": "SPY",
    "direction": "BUY",
    "conviction": "HIGH",
    "event_type": "Fed decision",
    "magnitude": "Large",
    "edge": "Institutions front-running rate cut",
    "affected_tickers": ["SPY","QQQ","TLT"]
  }],
  "summary": {
    "signal_count": 4,
    "market_regime": "Risk-On",
    "biggest_edge": "Rate-sensitive positioning"
  }
}`,
    dataSource: 'Finnhub market data + Gemini 2.0 Flash signal analysis',
    example: {
      curl: `curl "${BASE}/api/v1/smart-money/signals?type=all" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY"`,
      javascript: `const res = await fetch(
  '${BASE}/api/v1/smart-money/signals?type=all',
  { headers: { Authorization: 'Bearer yn_live_YOUR_KEY' } }
)
const { signals, summary } = await res.json()
signals.forEach(s => console.log(s.ticker, s.direction, s.conviction))`,
      python: `import requests
data = requests.get(
  '${BASE}/api/v1/smart-money/signals',
  params={'type': 'all'},
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY'}
).json()
for s in data['signals']:
    print(s['direction'], s['conviction'], s['edge'])`,
    }
  },
  {
    method: 'POST', path: '/api/v1/intelligence/run', clr: '#a855f7',
    desc: 'Run any of the 6 YN Intelligence weapons — each uses live Finnhub data + Gemini AI to produce actionable intelligence.',
    params: '', body: `{
  "weapon": "lockup",      // see weapons list below
  "input":  "NVDA"         // ticker or scenario
}`,
    response: `{
  "weapon": "lockup",
  "input": "NVDA",
  "result": {
    "verdict": "SELL",
    "lockup_expires": "2026-06-15",
    "shares_at_risk": "12M shares",
    "expected_pressure": "HIGH",
    "the_trade": "Buy puts expiring after lockup date",
    "catalyst": "Insider selling pressure post-lockup"
  }
}`,
    dataSource: 'Finnhub (quote, profile, news) + Gemini 2.0 Flash per weapon',
    example: {
      curl: `# Weapons: lockup | liedetector | galaxybrain | flow | signals | filing
curl -X POST "${BASE}/api/v1/intelligence/run" \\
  -H "Authorization: Bearer yn_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"weapon":"lockup","input":"NVDA"}'`,
      javascript: `// Weapons: lockup | liedetector | galaxybrain | flow | signals | filing
const res = await fetch('${BASE}/api/v1/intelligence/run', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer yn_live_YOUR_KEY',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ weapon: 'lockup', input: 'NVDA' })
})
const { result } = await res.json()
console.log(result.verdict, result.the_trade)`,
      python: `import requests
# Weapons: lockup | liedetector | galaxybrain | flow | signals | filing
data = requests.post(
  '${BASE}/api/v1/intelligence/run',
  headers={'Authorization': 'Bearer yn_live_YOUR_KEY'},
  json={'weapon': 'lockup', 'input': 'NVDA'}
).json()
print(data['result']['verdict'], data['result']['the_trade'])`,
    }
  },
]

export default function DevelopersPage() {
  const [cursorX, setCursorX] = useState(-100)
  const [cursorY, setCursorY] = useState(-100)
  const [codeTab,      setCodeTab]      = useState<'curl' | 'javascript' | 'python'>('javascript')
  const [expandedEp,   setExpandedEp]   = useState<string | null>('/api/v1/congress/trades')

  // ── Auth state ──────────────────────────────────────────────────────────────
  const [user,        setUser]        = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [authBusy,    setAuthBusy]    = useState(false)
  const [authErr,     setAuthErr]     = useState('')

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
  async function handleGoogleSignIn() {
    if (!supabase) { setAuthErr('Auth not configured'); return }
    setAuthBusy(true)
    setAuthErr('')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options:  { redirectTo: `${window.location.origin}/developers` },
    })
    if (error) { setAuthErr(error.message); setAuthBusy(false) }
    // On success browser redirects to Google — no need to setAuthBusy(false)
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

      if (r.status === 409 && d.key_prefix) {
        // Already has a key — set dashboard state directly from response, no extra fetch needed
        setMyKey({
          key_prefix:       d.key_prefix,
          tier:             d.tier             ?? 'free',
          name:             'My App',
          calls_month:      d.calls_month      ?? 0,
          limit_month:      d.limit_month      ?? 100,
          calls_total:      d.calls_total      ?? 0,
          created_at:       d.created_at       ?? new Date().toISOString(),
          last_used_at:     d.last_used_at     ?? null,
          has_subscription: d.has_subscription ?? false,
        })
        return
      }
      if (!r.ok) { setClaimErr(d.error ?? 'Failed to generate key'); return }

      // Success — show key once and populate dashboard
      setNewKey(d.key)
      setMyKey({
        key_prefix:       d.prefix,
        tier:             'free',
        name:             'My App',
        calls_month:      0,
        limit_month:      d.limit ?? 100,
        calls_total:      0,
        created_at:       d.timestamp ?? new Date().toISOString(),
        last_used_at:     null,
        has_subscription: false,
      })
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
            <div style={{ animation: 'fadeUp .5s ease', maxWidth: 480, margin: '0 auto' }}>
              <div style={{ ...s.card, border: '1px solid rgba(59,142,234,.25)', boxShadow: '0 0 50px rgba(59,142,234,.06)', textAlign: 'center' }}>
                <div style={{ height: 3, background: 'linear-gradient(90deg,#3b8eea,#a855f7)' }}/>
                <div style={{ padding: '40px 36px' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#dce8f0', letterSpacing: '-.5px', marginBottom: 8 }}>Get your API key</div>
                  <div style={{ fontSize: 13, color: '#3a5a6a', marginBottom: 32, lineHeight: 1.6 }}>
                    Free tier · 100 calls/month · No credit card
                  </div>

                  {authErr && <div style={{ color: '#ff2d78', fontSize: 12, fontFamily: 'monospace', marginBottom: 16 }}>{authErr}</div>}

                  <button onClick={handleGoogleSignIn} disabled={authBusy}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '14px 24px', background: '#fff', border: 'none', borderRadius: 10, cursor: authBusy ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 700, fontSize: 15, color: '#1a1a1a', opacity: authBusy ? .7 : 1, boxShadow: '0 2px 20px rgba(0,0,0,.3)', transition: 'all .2s' }}
                    onMouseEnter={e => { if (!authBusy) e.currentTarget.style.transform = 'translateY(-1px)' }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none' }}>
                    {authBusy ? (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '2px solid #ccc', borderTop: '2px solid #333', animation: 'spin 1s linear infinite' }}/>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    )}
                    {authBusy ? 'Redirecting...' : 'Continue with Google'}
                  </button>

                  <div style={{ marginTop: 20, fontSize: 11, color: '#1a3040' }}>
                    New users get a free key instantly after signing in.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── LOGGED IN ── */}
          {!authLoading && user && (
            <div style={{ animation: 'fadeUp .4s ease' }}>

              {/* ── Key just created — shown outside myKey block so it never gets lost ── */}
              {newKey && (
                <div style={{ maxWidth: 860, margin: '0 auto 24px', animation: 'fadeUp .3s ease' }}>
                  <div style={{ background: 'rgba(0,212,170,.04)', border: '2px solid rgba(0,212,170,.4)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 0 60px rgba(0,212,170,.08)' }}>
                    <div style={{ height: 4, background: 'linear-gradient(90deg,#00d4aa,#1e90ff)' }}/>
                    <div style={{ padding: '32px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                        <span style={{ fontSize: 22 }}>🔑</span>
                        <div>
                          <div style={{ fontSize: 16, fontWeight: 900, color: '#00d4aa', letterSpacing: '-.3px' }}>Your API Key is Ready</div>
                          <div style={{ fontSize: 12, color: '#ff2d78', marginTop: 2, fontWeight: 700 }}>⚠ Copy it now — this is the only time it will be shown</div>
                        </div>
                      </div>
                      <div style={{ background: 'rgba(0,0,0,.6)', border: '1px solid rgba(0,212,170,.25)', borderRadius: 10, padding: '16px 18px', marginBottom: 14, display: 'flex', gap: 12, alignItems: 'center' }}>
                        <code style={{ flex: 1, fontFamily: 'monospace', fontSize: 13, color: '#00d4aa', wordBreak: 'break-all', lineHeight: 1.6 }}>{newKey}</code>
                        <CopyBtn text={newKey} size="md"/>
                      </div>
                      <div style={{ fontSize: 12, color: '#3a5a6a' }}>Use as: <code style={{ color: '#3b8eea', fontFamily: 'monospace' }}>Authorization: Bearer {newKey}</code></div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Key loading ── */}
              {keyLoading && (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid rgba(59,142,234,.2)', borderTop: '2px solid #3b8eea', animation: 'spin 1s linear infinite' }}/>
                </div>
              )}

              {/* ── No key yet ── */}
              {!keyLoading && !myKey && !newKey && (
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
          <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 6 }}>ENDPOINTS</div>
          <div style={{ fontSize: 12, color: '#2a4050', marginBottom: 22 }}>All endpoints return real data from Finnhub and Gemini AI. Replace <code style={{ color: '#00d4aa', fontFamily: 'monospace', fontSize: 11 }}>yn_live_YOUR_KEY</code> with your actual key.</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {ENDPOINTS.map(ep => {
              const isOpen = expandedEp === ep.path
              return (
                <div key={ep.path} style={{ background: 'rgba(4,10,18,.95)', border: `1px solid ${isOpen ? ep.clr + '40' : 'rgba(255,255,255,.06)'}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color .2s' }}>

                  {/* Header — click to expand */}
                  <button onClick={() => setExpandedEp(isOpen ? null : ep.path)}
                    style={{ width: '100%', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: ep.clr, background: `${ep.clr}15`, border: `1px solid ${ep.clr}30`, borderRadius: 4, padding: '3px 8px', fontFamily: 'monospace', flexShrink: 0 }}>{ep.method}</span>
                    <code style={{ fontSize: 13, color: '#dce8f0', fontFamily: 'monospace', fontWeight: 600 }}>{ep.path}</code>
                    <span style={{ fontSize: 11, color: '#3a5a6a', marginLeft: 8, flex: 1, textAlign: 'left' }} className="hsm">{ep.desc}</span>
                    <span style={{ fontSize: 10, color: ep.clr, fontFamily: 'monospace', flexShrink: 0 }}>{isOpen ? '▲ collapse' : '▼ expand'}</span>
                  </button>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{ borderTop: `1px solid ${ep.clr}20` }}>

                      {/* Description + data source */}
                      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                        <div style={{ flex: '2 1 300px' }}>
                          <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 6 }}>DESCRIPTION</div>
                          <div style={{ fontSize: 12, color: '#4a6a78', lineHeight: 1.6 }}>{ep.desc}</div>
                        </div>
                        <div style={{ flex: '1 1 200px' }}>
                          <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 6 }}>DATA SOURCE</div>
                          <div style={{ fontSize: 11, color: '#00d4aa', lineHeight: 1.6 }}>{ep.dataSource}</div>
                        </div>
                      </div>

                      {/* Request + Response */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }} className="pg2">
                        <div style={{ padding: '16px 20px', borderRight: '1px solid rgba(255,255,255,.04)' }}>
                          <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 8 }}>{ep.body ? 'REQUEST BODY' : 'QUERY PARAMS'}</div>
                          <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#6a9aaa', lineHeight: 1.6, background: 'rgba(0,0,0,.3)', padding: '12px', borderRadius: 8, overflowX: 'auto' }}>{ep.body ?? (ep.params || '(none)')}</pre>
                        </div>
                        <div style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: 8, color: '#1a3040', letterSpacing: '2px', fontFamily: 'monospace', marginBottom: 8 }}>RESPONSE (real example)</div>
                          <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', lineHeight: 1.6, background: 'rgba(0,0,0,.3)', padding: '12px', borderRadius: 8, overflowX: 'auto' }}>{ep.response}</pre>
                        </div>
                      </div>

                      {/* Code examples */}
                      <div style={{ borderTop: '1px solid rgba(255,255,255,.04)', padding: '16px 20px' }}>
                        <div style={{ display: 'flex', gap: 0, marginBottom: 12, background: 'rgba(0,0,0,.3)', borderRadius: 8, overflow: 'hidden', width: 'fit-content', border: '1px solid rgba(255,255,255,.06)' }}>
                          {(['curl', 'javascript', 'python'] as const).map(t => (
                            <button key={t} onClick={() => setCodeTab(t)}
                              style={{ padding: '8px 16px', background: codeTab === t ? `${ep.clr}20` : 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 11, fontWeight: 700, color: codeTab === t ? ep.clr : '#2a4050', transition: 'all .2s' }}>
                              {t}
                            </button>
                          ))}
                        </div>
                        <div style={{ position: 'relative' }}>
                          <pre style={{ fontFamily: 'monospace', fontSize: 12, color: '#c8d8e0', lineHeight: 1.7, background: 'rgba(0,0,0,.4)', padding: '16px 18px', borderRadius: 8, overflowX: 'auto', border: '1px solid rgba(255,255,255,.05)' }}>{ep.example[codeTab]}</pre>
                          <div style={{ position: 'absolute', top: 10, right: 10 }}>
                            <CopyBtn text={ep.example[codeTab]}/>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── AUTH + RATE LIMITS ──────────────────────────────────────────────── */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px 96px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="pg2">
          <div>
            <div style={{ fontSize: 9, color: '#3b8eea', letterSpacing: '2.5px', fontFamily: 'monospace', fontWeight: 700, marginBottom: 16 }}>AUTHENTICATION</div>
            <div style={{ background: 'rgba(4,10,18,.92)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 11, padding: '20px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dce8f0', marginBottom: 10 }}>Header (every request)</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', background: 'rgba(0,0,0,.4)', padding: '12px', borderRadius: 7, border: '1px solid rgba(0,212,170,.1)', marginBottom: 14 }}>{`Authorization: Bearer yn_live_xxxx`}</pre>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dce8f0', marginBottom: 10 }}>Alternative header</div>
              <pre style={{ fontFamily: 'monospace', fontSize: 11, color: '#00d4aa', background: 'rgba(0,0,0,.4)', padding: '12px', borderRadius: 7, border: '1px solid rgba(0,212,170,.1)', marginBottom: 14 }}>{`x-api-key: yn_live_xxxx`}</pre>
              <div style={{ fontSize: 11, color: '#2a4050', lineHeight: 1.6 }}>
                Every response includes <code style={{ color: '#3b8eea', fontFamily: 'monospace', fontSize: 10 }}>source</code>, <code style={{ color: '#3b8eea', fontFamily: 'monospace', fontSize: 10 }}>version</code>, and <code style={{ color: '#3b8eea', fontFamily: 'monospace', fontSize: 10 }}>timestamp</code> fields. On error, check the <code style={{ color: '#ff2d78', fontFamily: 'monospace', fontSize: 10 }}>error</code> field and HTTP status code.
              </div>
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
            <div style={{ marginTop: 12, padding: '12px 16px', background: 'rgba(0,0,0,.2)', border: '1px solid rgba(255,255,255,.05)', borderRadius: 8 }}>
              <div style={{ fontSize: 11, color: '#2a4050', lineHeight: 1.7 }}>
                Exceeded limit → <code style={{ color: '#ff2d78', fontFamily: 'monospace', fontSize: 10 }}>401 Unauthorized</code>. Resets on the 1st of each month. Upgrade anytime from your dashboard above.
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
