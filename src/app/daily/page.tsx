'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

// ─── Types ────────────────────────────────────────────────────────────────────
interface IndexData {
  symbol: string; name: string; futures: string
  price: number; change: number; changePct: number; prevClose: number
  expectedMove: number; expectedHigh: number; expectedLow: number
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  biasReason: string; keyLevel: string; tradeNote: string
  keySupport: number; keyResistance: number
}
interface Intel {
  date: string; edition: string; generatedAt: string
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS'; sentimentScore: number
  headline: string; subheadline: string; brief: string; keyPoints: string[]
  indices: IndexData[]
  macro: { gold: string; goldChg: string; oil: string; oilChg: string; dollar: string; dollarChg: string; bonds: string; bondsChg: string; credit: string; creditChg: string }
  macroReading: string; institutionalView: string; earningsNote: string; analystConsensus: string
  earnings: string[]
  playbook: { theme: string; bullCase: string; bearCase: string; ideas: string[]; avoid: string }
  riskAlert: string; traderTip: string
  calendar: { event: string; impact: string; actual: string; estimate: string; prior: string; time: string }[]
  news: { headline: string; source: string; summary: string; time: string }[]
}
interface SubData { customerId: string; subscriptionId: string; email: string; currentPeriodEnd: string }

// ─── Subscription helpers (localStorage only, Stripe is source of truth) ─────
const SUB_KEY = 'yn_daily_sub_v1'
function saveSubscription(data: SubData) {
  try { localStorage.setItem(SUB_KEY, JSON.stringify({ ...data, savedAt: Date.now() })) } catch {}
}
function loadSubscription(): SubData | null {
  try { const raw = localStorage.getItem(SUB_KEY); return raw ? JSON.parse(raw) : null } catch { return null }
}

// ─── Colors ───────────────────────────────────────────────────────────────────
const SENT_COLOR: Record<string, string> = { BULLISH: '#22c55e', BEARISH: '#ef4444', NEUTRAL: '#f59e0b', CAUTIOUS: '#f97316' }
const BIAS_BG:    Record<string, string> = { BULLISH: '#052e16', BEARISH: '#2d0707', NEUTRAL: '#1c1917' }
const IMPACT_CLR: Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

function Chg({ v }: { v: number }) {
  const pos = v >= 0
  return <span style={{ color: pos ? '#22c55e' : '#ef4444', fontWeight: 600 }}>{pos ? '+' : ''}{v.toFixed(2)}%</span>
}

// ─── Inner page (uses useSearchParams, must be inside Suspense) ──────────────
function DailyInner() {
  const params = useSearchParams()
  const sessionId = params.get('session_id')
  const activated = params.get('activated')

  const [intel, setIntel]       = useState<Intel | null>(null)
  const [loading, setLoading]   = useState(true)
  const [subChecked, setSubChecked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [activating, setActivating] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'indices' | 'macro' | 'playbook' | 'news'>('overview')

  // ── Subscription check & activation ────────────────────────────────────────
  const checkSubscription = useCallback(async (sub: SubData): Promise<boolean> => {
    try {
      const res = await fetch('/api/stripe/subscription/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: sub.customerId, subscriptionId: sub.subscriptionId }),
      })
      const data = await res.json()
      return data.active === true || data.demo === true
    } catch { return false }
  }, [])

  const activate = useCallback(async (sid: string) => {
    setActivating(true)
    try {
      const res = await fetch('/api/stripe/subscription/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      })
      const data = await res.json()
      if (data.demo || data.active) {
        if (!data.demo) saveSubscription(data as SubData)
        setIsSubscribed(true)
        setIsDemoMode(!!data.demo)
      }
    } catch { /* silently fail */ } finally {
      setActivating(false)
      setSubChecked(true)
    }
  }, [])

  useEffect(() => {
    async function init() {
      // If returning from Stripe checkout
      if (sessionId && activated) {
        await activate(sessionId)
        // Clean URL
        window.history.replaceState({}, '', '/daily')
        return
      }

      // Check saved subscription
      const saved = loadSubscription()
      if (saved) {
        const active = await checkSubscription(saved)
        setIsSubscribed(active)
        setIsDemoMode(false)
      }
      setSubChecked(true)
    }
    init()
  }, [sessionId, activated, activate, checkSubscription])

  // ── Load intelligence ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!subChecked) return
    async function loadIntel() {
      setLoading(true)
      try {
        const res = await fetch('/api/daily-intel')
        const data = await res.json()
        if (data.intel) {
          setIntel(data.intel)
          if (data.demo && !isSubscribed) setIsDemoMode(true)
        }
      } catch { /* fail silently */ } finally {
        setLoading(false)
      }
    }
    loadIntel()
  }, [subChecked, isSubscribed])

  const showContent = isSubscribed || isDemoMode
  const sentColor   = SENT_COLOR[intel?.sentiment ?? 'NEUTRAL'] ?? '#f59e0b'

  // ── Paywall ──────────────────────────────────────────────────────────────────
  if (subChecked && !showContent && !loading) {
    return <PaywallView />
  }

  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes spin { to{transform:rotate(360deg)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        .fade-in { animation: fadeIn 0.4s ease }
        .tab-btn { transition: all 0.15s; cursor: pointer; border: none; }
        .tab-btn:hover { color: #fafafa !important; }
        .card:hover { border-color: #3f3f46 !important; }
        .card { transition: border-color 0.15s; }
        .news-card:hover { background: #1c1c1e !important; }
        .news-card { transition: background 0.15s; cursor: default; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
        .skel { background: linear-gradient(90deg, #18181b 25%, #27272a 50%, #18181b 75%); background-size: 400px 100%; animation: shimmer 1.4s infinite; border-radius: 6px; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header style={{ borderBottom: '1px solid #18181b', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, background: '#09090b' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>⚡</div>
            <span style={{ fontWeight: 700, fontSize: 14, color: '#fafafa' }}>YN Finance</span>
          </Link>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, background: '#22c55e', borderRadius: '50%', animation: 'pulse 2s infinite' }}/>
            <span style={{ color: '#71717a', fontSize: 12 }}>Daily Intelligence</span>
            {isDemoMode && <span style={{ background: '#1c1917', color: '#f59e0b', fontSize: 11, padding: '2px 8px', borderRadius: 100, border: '1px solid #f59e0b40', marginLeft: 6 }}>DEMO</span>}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/app" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none' }}>Terminal</Link>
            <Link href="/arena" style={{ color: '#71717a', fontSize: 13, textDecoration: 'none', marginLeft: 8 }}>Arena</Link>
          </div>
        </div>
      </header>

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {(loading || activating) && (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
          <div className="skel" style={{ height: 28, width: 320, marginBottom: 16 }}/>
          <div className="skel" style={{ height: 20, width: 480, marginBottom: 32 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 24 }}>
            {[0,1,2,3].map(i => <div key={i} className="skel" style={{ height: 100 }}/>)}
          </div>
          <div className="skel" style={{ height: 200 }}/>
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {!loading && !activating && intel && (
        <div className="fade-in" style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 80px' }}>

          {/* Masthead */}
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#18181b', border: `1px solid ${sentColor}40`, borderRadius: 100, padding: '4px 12px' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: sentColor, animation: 'pulse 2s infinite', display: 'block' }}/>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: sentColor }}>{intel.sentiment}</span>
              </div>
              <span style={{ color: '#52525b', fontSize: 12 }}>{intel.date}</span>
              <span style={{ color: '#52525b', fontSize: 12 }}>·</span>
              <span style={{ color: '#52525b', fontSize: 12 }}>Refreshed {new Date(intel.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
            <h1 style={{ fontSize: 'clamp(22px, 4vw, 36px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 8, color: '#fafafa' }}>
              {intel.headline}
            </h1>
            <p style={{ color: '#a1a1aa', fontSize: 16, lineHeight: 1.6 }}>{intel.subheadline}</p>
          </div>

          {/* Quick price bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 1, background: '#27272a', borderRadius: 12, overflow: 'hidden', marginBottom: 24, border: '1px solid #27272a' }}>
            {intel.indices.map(idx => (
              <div key={idx.symbol} style={{ background: '#18181b', padding: '12px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em' }}>{idx.symbol}</span>
                  <span style={{ fontSize: 10, color: SENT_COLOR[idx.bias], fontWeight: 700 }}>{idx.bias[0]}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>${idx.price.toLocaleString()}</div>
                <Chg v={idx.changePct}/>
              </div>
            ))}
            <div style={{ background: '#18181b', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em', marginBottom: 2 }}>GOLD</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>{intel.macro.gold}</div>
              <span style={{ color: parseFloat(intel.macro.goldChg) >= 0 ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                {parseFloat(intel.macro.goldChg) >= 0 ? '+' : ''}{intel.macro.goldChg}%
              </span>
            </div>
            <div style={{ background: '#18181b', padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', letterSpacing: '0.05em', marginBottom: 2 }}>OIL</div>
              <div style={{ fontSize: 15, fontWeight: 700, fontFamily: 'monospace', marginBottom: 2 }}>{intel.macro.oil}</div>
              <span style={{ color: parseFloat(intel.macro.oilChg) >= 0 ? '#22c55e' : '#ef4444', fontSize: 12, fontWeight: 600 }}>
                {parseFloat(intel.macro.oilChg) >= 0 ? '+' : ''}{intel.macro.oilChg}%
              </span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 24, background: '#18181b', borderRadius: 10, padding: 4, overflowX: 'auto' }}>
            {(['overview','indices','macro','playbook','news'] as const).map(tab => (
              <button
                key={tab}
                className="tab-btn"
                onClick={() => setActiveTab(tab)}
                style={{ padding: '8px 16px', borderRadius: 7, background: activeTab === tab ? '#27272a' : 'transparent', color: activeTab === tab ? '#fafafa' : '#71717a', fontSize: 13, fontWeight: 500, flex: '0 0 auto' }}
              >
                {tab === 'overview' ? '📰 Brief' : tab === 'indices' ? '📐 Indices' : tab === 'macro' ? '🌍 Macro' : tab === 'playbook' ? '🎮 Playbook' : '📡 News'}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
          {activeTab === 'overview' && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
              {/* Morning Brief */}
              <div className="card" style={{ gridColumn: '1/-1', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                  <span style={{ fontSize: 18 }}>📰</span>
                  <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: '0.05em', color: '#94a3b8' }}>MORNING BRIEF</span>
                </div>
                <p style={{ color: '#e2e8f0', lineHeight: 1.8, fontSize: 15, marginBottom: 20 }}>{intel.brief}</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  {intel.keyPoints.map((pt, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      <span style={{ color: '#1e90ff', fontWeight: 700, fontSize: 13, flex: '0 0 auto' }}>→</span>
                      <span style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6 }}>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Trader's Tip */}
              <div className="card" style={{ background: '#1a1917', border: '1px solid #f59e0b30', borderRadius: 16, padding: '20px 24px', borderLeft: `3px solid #f59e0b` }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 10 }}>⚡ TRADER TIP</div>
                <p style={{ color: '#fafafa', fontSize: 15, lineHeight: 1.7 }}>{intel.traderTip}</p>
              </div>

              {/* Risk Alert */}
              <div className="card" style={{ background: '#1a0a0a', border: '1px solid #ef444430', borderRadius: 16, padding: '20px 24px', borderLeft: '3px solid #ef4444' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444', marginBottom: 10 }}>⚠️ RISK ALERT</div>
                <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.7 }}>{intel.riskAlert}</p>
              </div>

              {/* Institutional view */}
              <div className="card" style={{ background: '#0d1117', border: '1px solid #1e293b', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#818cf8', marginBottom: 10 }}>🏦 INSTITUTIONAL VIEW</div>
                <p style={{ color: '#c7d2fe', fontSize: 14, lineHeight: 1.7 }}>{intel.institutionalView}</p>
              </div>

              {/* Earnings note */}
              {intel.earningsNote && (
                <div className="card" style={{ background: '#0a1a0a', border: '1px solid #22c55e30', borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e', marginBottom: 10 }}>📊 EARNINGS RADAR</div>
                  <p style={{ color: '#86efac', fontSize: 14, lineHeight: 1.7 }}>{intel.earningsNote}</p>
                  {intel.earnings.length > 0 && (
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {intel.earnings.slice(0, 6).map(e => (
                        <span key={e} style={{ background: '#052e16', color: '#22c55e', fontSize: 11, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Economic Calendar */}
              {intel.calendar.length > 0 && (
                <div className="card" style={{ gridColumn: '1/-1', background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: 16 }}>📅 ECONOMIC CALENDAR</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {intel.calendar.map((e, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto auto', gap: 12, alignItems: 'center', padding: '8px 12px', background: '#09090b', borderRadius: 8 }}>
                        <span style={{ fontSize: 13, color: '#fafafa' }}>{e.event}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, color: IMPACT_CLR[e.impact] ?? '#f59e0b', textTransform: 'uppercase' }}>{e.impact}</span>
                        <span style={{ fontSize: 12, color: '#71717a' }}>Prev: {e.prior}</span>
                        <span style={{ fontSize: 12, color: '#71717a' }}>Est: {e.estimate}</span>
                        <span style={{ fontSize: 12, color: e.actual !== '—' ? '#22c55e' : '#71717a', fontWeight: e.actual !== '—' ? 700 : 400 }}>{e.actual !== '—' ? `Act: ${e.actual}` : 'Pending'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── INDICES TAB ──────────────────────────────────────────────── */}
          {activeTab === 'indices' && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {intel.indices.map(idx => (
                <div key={idx.symbol} className="card" style={{ background: BIAS_BG[idx.bias] ?? '#18181b', border: `1px solid ${SENT_COLOR[idx.bias]}30`, borderRadius: 16, padding: '20px', overflow: 'hidden', position: 'relative' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 20 }}>{idx.symbol}</span>
                        <span style={{ fontSize: 12, color: '#71717a' }}>/ {idx.futures}</span>
                      </div>
                      <div style={{ color: '#71717a', fontSize: 13 }}>{idx.name}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ background: `${SENT_COLOR[idx.bias]}20`, color: SENT_COLOR[idx.bias], border: `1px solid ${SENT_COLOR[idx.bias]}40`, borderRadius: 100, padding: '3px 10px', fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', display: 'inline-block' }}>
                        {idx.bias}
                      </div>
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: 'monospace' }}>${idx.price.toLocaleString()}</div>
                    <Chg v={idx.changePct}/>
                  </div>

                  {/* Expected Move Bar */}
                  <div style={{ background: '#09090b', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontSize: 11, color: '#71717a', fontWeight: 600, marginBottom: 8 }}>EXPECTED MOVE TODAY ±${idx.expectedMove}</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, fontFamily: 'monospace' }}>
                      <span style={{ color: '#ef4444' }}>↓ ${idx.expectedLow.toLocaleString()}</span>
                      <span style={{ color: '#71717a', fontSize: 11 }}>|</span>
                      <span style={{ color: '#22c55e' }}>↑ ${idx.expectedHigh.toLocaleString()}</span>
                    </div>
                    <div style={{ position: 'relative', height: 4, background: '#27272a', borderRadius: 99, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: '20%', right: '20%', top: 0, bottom: 0, background: `linear-gradient(90deg, #ef4444, ${SENT_COLOR[idx.bias]}, #22c55e)`, borderRadius: 99 }}/>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                    <div style={{ background: '#09090b', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600 }}>KEY SUPPORT</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#22c55e' }}>${idx.keySupport.toLocaleString()}</div>
                    </div>
                    <div style={{ background: '#09090b', borderRadius: 8, padding: '8px 10px' }}>
                      <div style={{ fontSize: 10, color: '#71717a', fontWeight: 600 }}>KEY RESISTANCE</div>
                      <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: '#ef4444' }}>${idx.keyResistance.toLocaleString()}</div>
                    </div>
                  </div>

                  {idx.biasReason && <p style={{ fontSize: 12, color: '#a1a1aa', lineHeight: 1.6, marginBottom: 10 }}>{idx.biasReason}</p>}
                  {idx.tradeNote && (
                    <div style={{ background: `${SENT_COLOR[idx.bias]}10`, border: `1px solid ${SENT_COLOR[idx.bias]}20`, borderRadius: 8, padding: '8px 10px' }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: SENT_COLOR[idx.bias] }}>TRADE NOTE · </span>
                      <span style={{ fontSize: 12, color: '#a1a1aa' }}>{idx.tradeNote}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ── MACRO TAB ────────────────────────────────────────────────── */}
          {activeTab === 'macro' && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              {/* Macro tiles */}
              {[
                { label: 'Gold (GLD)', value: intel.macro.gold, chg: intel.macro.goldChg, icon: '🥇' },
                { label: 'Oil (USO)', value: intel.macro.oil, chg: intel.macro.oilChg, icon: '🛢️' },
                { label: 'Dollar (UUP)', value: intel.macro.dollar, chg: intel.macro.dollarChg, icon: '💵' },
                { label: 'Bonds (TLT)', value: intel.macro.bonds, chg: intel.macro.bondsChg, icon: '📈' },
                { label: 'Credit (HYG)', value: intel.macro.credit, chg: intel.macro.creditChg, icon: '🏦' },
              ].map(m => {
                const chgNum = parseFloat(m.chg)
                const pos = chgNum >= 0
                return (
                  <div key={m.label} className="card" style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: '18px 16px' }}>
                    <div style={{ fontSize: 22, marginBottom: 8 }}>{m.icon}</div>
                    <div style={{ fontSize: 12, color: '#71717a', fontWeight: 600, marginBottom: 6 }}>{m.label}</div>
                    <div style={{ fontSize: 18, fontWeight: 700, fontFamily: 'monospace', marginBottom: 4 }}>{m.value}</div>
                    <span style={{ color: pos ? '#22c55e' : '#ef4444', fontWeight: 600, fontSize: 13 }}>{pos ? '+' : ''}{m.chg}%</span>
                  </div>
                )
              })}

              {/* Macro reading full width */}
              <div className="card" style={{ gridColumn: '1/-1', background: '#0f172a', border: '1px solid #1e293b', borderRadius: 16, padding: '24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#818cf8', marginBottom: 14 }}>🌍 MACRO READING</div>
                <p style={{ color: '#c7d2fe', fontSize: 15, lineHeight: 1.8 }}>{intel.macroReading}</p>
              </div>

              {/* Analyst consensus */}
              <div className="card" style={{ gridColumn: '1/-1', background: '#18181b', border: '1px solid #27272a', borderRadius: 16, padding: '24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#a1a1aa', marginBottom: 14 }}>📊 WALL STREET CONSENSUS (SPY)</div>
                <p style={{ color: '#71717a', fontSize: 13, fontFamily: 'monospace', marginBottom: 16 }}>{intel.analystConsensus}</p>
                <p style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 1.7 }}>{intel.institutionalView}</p>
              </div>
            </div>
          )}

          {/* ── PLAYBOOK TAB ─────────────────────────────────────────────── */}
          {activeTab === 'playbook' && intel.playbook && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {/* Theme */}
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '24px', background: '#18181b', border: '1px solid #27272a', borderRadius: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', color: '#71717a', marginBottom: 12 }}>TODAY'S THEME</div>
                <div style={{ fontSize: 28, fontWeight: 800, background: `linear-gradient(135deg, ${sentColor}, #1e90ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  {intel.playbook.theme}
                </div>
              </div>

              {/* Bull case */}
              <div className="card" style={{ background: '#052e16', border: '1px solid #22c55e30', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#22c55e', marginBottom: 12 }}>🐂 BULL CASE</div>
                <p style={{ color: '#86efac', fontSize: 14, lineHeight: 1.8 }}>{intel.playbook.bullCase}</p>
              </div>

              {/* Bear case */}
              <div className="card" style={{ background: '#2d0707', border: '1px solid #ef444430', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#ef4444', marginBottom: 12 }}>🐻 BEAR CASE</div>
                <p style={{ color: '#fca5a5', fontSize: 14, lineHeight: 1.8 }}>{intel.playbook.bearCase}</p>
              </div>

              {/* Trade ideas */}
              <div className="card" style={{ gridColumn: '1/-1', background: '#0d1117', border: '1px solid #1e293b', borderRadius: 16, padding: '24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#818cf8', marginBottom: 16 }}>⚡ TRADE IDEAS</div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {(intel.playbook.ideas || []).map((idea, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: '#18181b', borderRadius: 10 }}>
                      <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #1e90ff, #818cf8)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, flex: '0 0 auto' }}>{i + 1}</div>
                      <p style={{ color: '#e2e8f0', fontSize: 14, lineHeight: 1.7, paddingTop: 3 }}>{idea}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avoid */}
              <div className="card" style={{ gridColumn: '1/-1', background: '#1c1917', border: '1px solid #f59e0b30', borderRadius: 16, padding: '20px 24px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#f59e0b', marginBottom: 12 }}>⛔ AVOID TODAY</div>
                <p style={{ color: '#fcd34d', fontSize: 14, lineHeight: 1.8 }}>{intel.playbook.avoid}</p>
              </div>
            </div>
          )}

          {/* ── NEWS TAB ─────────────────────────────────────────────────── */}
          {activeTab === 'news' && (
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
              {intel.news.map((n, i) => (
                <div key={i} className="news-card" style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: '#27272a', color: '#a1a1aa', fontSize: 11, padding: '2px 8px', borderRadius: 100, fontWeight: 600 }}>{n.source}</span>
                    {n.time && <span style={{ color: '#52525b', fontSize: 11 }}>{n.time}</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.6, color: '#fafafa', marginBottom: n.summary ? 8 : 0 }}>{n.headline}</p>
                  {n.summary && <p style={{ fontSize: 12, color: '#71717a', lineHeight: 1.6 }}>{n.summary}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Demo upgrade prompt */}
          {isDemoMode && (
            <div style={{ marginTop: 32, background: 'linear-gradient(135deg, #1a1917, #1c1917)', border: '1px solid #f59e0b50', borderRadius: 16, padding: '24px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, marginBottom: 8 }}>📰</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>This is a preview</div>
              <p style={{ color: '#a1a1aa', fontSize: 14, marginBottom: 20 }}>Subscribe to get your full personalized Daily Intelligence — updated every morning before the open.</p>
              <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#09090b', padding: '12px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 14 }}>
                Subscribe for $11.99/month →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────────────── */}
      {!loading && !activating && !intel && showContent && (
        <div style={{ textAlign: 'center', padding: '80px 24px' }}>
          <div style={{ fontSize: 40, marginBottom: 16 }}>📰</div>
          <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 8 }}>Intelligence loading soon</div>
          <p style={{ color: '#71717a', marginBottom: 24 }}>Configure your API keys to enable live market intelligence.</p>
          <Link href="/daily/subscribe" style={{ color: '#f59e0b', fontSize: 14 }}>Learn more →</Link>
        </div>
      )}
    </div>
  )
}

// ─── Paywall ─────────────────────────────────────────────────────────────────
function PaywallView() {
  return (
    <div style={{ background: '#09090b', color: '#fafafa', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{'* { box-sizing: border-box; margin: 0; padding: 0; }'}</style>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 24px' }}>📰</div>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>YN Daily Intelligence</h1>
        <p style={{ color: '#a1a1aa', fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
          Expected moves, daily bias, macro read, institutional radar, and your full trading playbook — every morning before the open.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: '#09090b', padding: '14px 32px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', fontSize: 15 }}>
            Subscribe · $11.99/month
          </Link>
          <Link href="/" style={{ background: '#18181b', color: '#fafafa', padding: '14px 24px', borderRadius: 12, fontWeight: 600, textDecoration: 'none', fontSize: 15, border: '1px solid #27272a' }}>
            Back to Home
          </Link>
        </div>
        <p style={{ color: '#52525b', fontSize: 12, marginTop: 20 }}>Cancel anytime · Powered by Stripe · No contracts</p>
      </div>
    </div>
  )
}

// ─── Export (Suspense for useSearchParams) ─────────────────────────────────
export default function DailyPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#09090b', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 32, height: 32, border: '3px solid #27272a', borderTopColor: '#f59e0b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }}/>
        <style>{'@keyframes spin { to { transform: rotate(360deg) } }'}</style>
      </div>
    }>
      <DailyInner />
    </Suspense>
  )
}
