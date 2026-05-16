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
  date: string; generatedAt: string
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

// ─── Subscription helpers ─────────────────────────────────────────────────────
const SUB_KEY = 'yn_daily_sub_v1'
function saveSubscription(d: SubData) { try { localStorage.setItem(SUB_KEY, JSON.stringify({ ...d, savedAt: Date.now() })) } catch {} }
function loadSubscription(): SubData | null { try { const r = localStorage.getItem(SUB_KEY); return r ? JSON.parse(r) : null } catch { return null } }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const SENT_CLR: Record<string, string> = { BULLISH: '#00d4aa', BEARISH: '#ef4444', NEUTRAL: '#f59e0b', CAUTIOUS: '#f97316' }
const BIAS_CLR: Record<string, string> = { BULLISH: '#00d4aa', BEARISH: '#ef4444', NEUTRAL: '#94a3b8' }
const IMP_CLR:  Record<string, string> = { high: '#ef4444', medium: '#f59e0b', low: '#22c55e' }

function pct(v: number) {
  const c = v >= 0 ? '#00d4aa' : '#ef4444'
  return <span style={{ color: c, fontWeight: 700 }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}%</span>
}
function chgNum(s: string) { return parseFloat(s) || 0 }

// ─── Inner ────────────────────────────────────────────────────────────────────
function DailyInner() {
  const params    = useSearchParams()
  const sessionId = params.get('session_id')
  const activated = params.get('activated')

  const [intel, setIntel]         = useState<Intel | null>(null)
  const [loading, setLoading]     = useState(true)
  const [subChecked, setSubChecked] = useState(false)
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [isDemoMode, setIsDemoMode] = useState(false)
  const [activating, setActivating] = useState(false)
  const [clock, setClock]         = useState('')
  const [activeSection, setActiveSection] = useState('brief')

  // live clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' }) + ' ET')
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  const checkSub = useCallback(async (s: SubData): Promise<boolean> => {
    try {
      const r = await fetch('/api/stripe/subscription/status', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId: s.customerId, subscriptionId: s.subscriptionId }) })
      const d = await r.json(); return d.active === true || d.demo === true
    } catch { return false }
  }, [])

  const activate = useCallback(async (sid: string) => {
    setActivating(true)
    try {
      const r = await fetch('/api/stripe/subscription/activate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId: sid }) })
      const d = await r.json()
      if (d.demo || d.active) { if (!d.demo) saveSubscription(d as SubData); setIsSubscribed(true); setIsDemoMode(!!d.demo) }
    } catch {} finally { setActivating(false); setSubChecked(true) }
  }, [])

  useEffect(() => {
    async function init() {
      if (sessionId && activated) { await activate(sessionId); window.history.replaceState({}, '', '/daily'); return }
      const saved = loadSubscription()
      if (saved) { const ok = await checkSub(saved); setIsSubscribed(ok) }
      setSubChecked(true)
    }
    init()
  }, [sessionId, activated, activate, checkSub])

  useEffect(() => {
    if (!subChecked) return
    fetch('/api/daily-intel').then(r => r.json()).then(d => {
      if (d.intel) { setIntel(d.intel); if (d.demo && !isSubscribed) setIsDemoMode(true) }
    }).catch(() => {}).finally(() => setLoading(false))
  }, [subChecked, isSubscribed])

  const showContent = isSubscribed || isDemoMode
  if (subChecked && !showContent && !loading && !activating) return <Paywall />

  const sc = SENT_CLR[intel?.sentiment ?? 'NEUTRAL']
  const now = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const SECTIONS = [
    { id: 'brief',       label: 'Morning Brief'    },
    { id: 'movers',      label: 'Expected Moves'   },
    { id: 'macro',       label: 'Macro Dashboard'  },
    { id: 'institution', label: 'Institutional'    },
    { id: 'playbook',    label: 'Playbook'         },
    { id: 'calendar',    label: 'Economic Calendar'},
    { id: 'news',        label: 'News Feed'        },
  ]

  return (
    <div style={{ background: '#040d14', color: '#e2e8f0', fontFamily: '"Inter", "SF Pro Display", system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes skel{0%{background-position:-400px 0}100%{background-position:400px 0}}
        .skel{background:linear-gradient(90deg,#0d1b26 25%,#162233 50%,#0d1b26 75%);background-size:400px 100%;animation:skel 1.3s infinite;border-radius:4px}
        .row-hover:hover{background:#0d1b26!important}
        .nav-item{cursor:pointer;transition:all .15s;border:none;background:transparent}
        .nav-item:hover{color:#e2e8f0!important}
        ::-webkit-scrollbar{width:4px;height:4px}
        ::-webkit-scrollbar-thumb{background:#1e3a4a;border-radius:4px}
        .panel{background:#060f18;border:1px solid #0e2236;border-radius:8px}
        .section-btn{cursor:pointer;border:none;transition:all .15s;white-space:nowrap}
        .section-btn:hover{color:#e2e8f0!important;background:#0d1b26!important}
        a{color:inherit;text-decoration:none}
      `}</style>

      {/* ── TOP BAR ── */}
      <div style={{ background: '#040d14', borderBottom: '1px solid #0e2236', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 44, position: 'sticky', top: 0, zIndex: 200 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.02em', color: '#e2e8f0' }}>YN FINANCE</span>
          </Link>
          <div style={{ width: 1, height: 16, background: '#0e2236' }}/>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: '#00d4aa' }}>DAILY INTELLIGENCE</span>
          {isDemoMode && <span style={{ background: '#1c1917', color: '#f59e0b', fontSize: 10, padding: '2px 8px', borderRadius: 3, border: '1px solid #f59e0b30', fontWeight: 700, letterSpacing: '.08em' }}>PREVIEW</span>}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {intel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sc, animation: 'pulse 2s infinite', display: 'block' }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: sc, letterSpacing: '.08em' }}>{intel.sentiment}</span>
              <span style={{ fontSize: 11, color: '#4a7a99' }}>|</span>
              <span style={{ fontSize: 11, color: '#4a7a99', fontFamily: 'monospace' }}>{intel.sentimentScore}/100</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: '#4a7a99', fontFamily: 'monospace' }}>{clock}</span>
          <div style={{ display: 'flex', gap: 12 }}>
            <Link href="/app" style={{ fontSize: 11, color: '#4a7a99' }}>TERMINAL</Link>
            <Link href="/arena" style={{ fontSize: 11, color: '#4a7a99' }}>ARENA</Link>
            <Link href="/courses" style={{ fontSize: 11, color: '#4a7a99' }}>COURSES</Link>
          </div>
        </div>
      </div>

      {/* ── TICKER BAR ── */}
      {intel && (
        <div style={{ background: '#050e17', borderBottom: '1px solid #0e2236', padding: '0 20px', display: 'flex', alignItems: 'center', gap: 0, overflowX: 'auto', height: 36 }}>
          {intel.indices.map((idx, i) => (
            <div key={idx.symbol} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRight: '1px solid #0e2236', height: '100%', flex: '0 0 auto' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em' }}>{idx.futures}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace', color: '#e2e8f0' }}>{idx.price.toLocaleString()}</span>
              {pct(idx.changePct)}
              <span style={{ fontSize: 10, fontWeight: 700, color: BIAS_CLR[idx.bias] }}>▶ {idx.bias[0]}</span>
            </div>
          ))}
          {[
            { label: 'GOLD', val: intel.macro.gold, chg: intel.macro.goldChg },
            { label: 'OIL',  val: intel.macro.oil,  chg: intel.macro.oilChg  },
            { label: 'DXY',  val: intel.macro.dollar, chg: intel.macro.dollarChg },
            { label: 'TLT',  val: intel.macro.bonds,  chg: intel.macro.bondsChg  },
          ].map(m => (
            <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRight: '1px solid #0e2236', height: '100%', flex: '0 0 auto' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '.05em' }}>{m.label}</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace', color: '#e2e8f0' }}>{m.val}</span>
              <span style={{ color: chgNum(m.chg) >= 0 ? '#00d4aa' : '#ef4444', fontSize: 11, fontWeight: 700 }}>{chgNum(m.chg) >= 0 ? '+' : ''}{m.chg}%</span>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', padding: '0 16px', flex: '0 0 auto', fontSize: 11, color: '#4a7a99' }}>{dateStr}</div>
        </div>
      )}

      {/* ── LOADING ── */}
      {(loading || activating) && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            {[0,1,2].map(i => <div key={i} className="skel" style={{ height: 80 }}/>)}
          </div>
          <div className="skel" style={{ height: 200, marginBottom: 12 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="skel" style={{ height: 300 }}/>
            <div className="skel" style={{ height: 300 }}/>
          </div>
        </div>
      )}

      {/* ── MAIN CONTENT ── */}
      {!loading && !activating && intel && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '16px 20px 60px', animation: 'fadeIn .4s ease' }}>

          {/* ── SECTION NAV ── */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
            {SECTIONS.map(s => (
              <button key={s.id} className="section-btn"
                onClick={() => setActiveSection(s.id)}
                style={{ padding: '6px 14px', borderRadius: 4, fontSize: 11, fontWeight: 700, letterSpacing: '.06em', color: activeSection === s.id ? '#00d4aa' : '#4a7a99', background: activeSection === s.id ? '#071520' : 'transparent', border: activeSection === s.id ? '1px solid #0e4a6a' : '1px solid transparent' }}>
                {s.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ════════════════════════ MORNING BRIEF ════════════════════════ */}
          {activeSection === 'brief' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 12 }}>
              {/* Left col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Headline block */}
                <div className="panel" style={{ padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99' }}>TODAY'S BRIEF</span>
                    <div style={{ flex: 1, height: 1, background: '#0e2236' }}/>
                    <span style={{ fontSize: 10, color: '#4a7a99' }}>AI-Generated · {new Date(intel.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <h1 style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.25, color: '#e2e8f0', marginBottom: 8 }}>{intel.headline}</h1>
                  <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 18, lineHeight: 1.5 }}>{intel.subheadline}</p>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 }}>{intel.brief}</p>
                </div>

                {/* Key points */}
                <div className="panel" style={{ padding: '16px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>KEY POINTS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {intel.keyPoints.map((pt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: '#071520', borderRadius: 6, borderLeft: `2px solid ${sc}` }}>
                        <span style={{ color: sc, fontSize: 12, fontWeight: 800, flex: '0 0 auto' }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.55 }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk + Tip row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="panel" style={{ padding: '16px 18px', borderLeft: '3px solid #ef4444' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#ef4444', marginBottom: 10 }}>⚠ RISK ALERT</div>
                    <p style={{ fontSize: 13, color: '#fca5a5', lineHeight: 1.65 }}>{intel.riskAlert}</p>
                  </div>
                  <div className="panel" style={{ padding: '16px 18px', borderLeft: `3px solid #00d4aa` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#00d4aa', marginBottom: 10 }}>⚡ TRADER TIP</div>
                    <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.65 }}>{intel.traderTip}</p>
                  </div>
                </div>
              </div>

              {/* Right col */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Sentiment meter */}
                <div className="panel" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>MARKET SENTIMENT</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: sc }}>{intel.sentiment}</div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: sc, marginLeft: 'auto' }}>{intel.sentimentScore}</div>
                  </div>
                  <div style={{ height: 6, background: '#0d1b26', borderRadius: 99, overflow: 'hidden', marginBottom: 4 }}>
                    <div style={{ width: `${intel.sentimentScore}%`, height: '100%', background: `linear-gradient(90deg, #ef4444, #f59e0b, #00d4aa)`, borderRadius: 99, transition: 'width 1s ease' }}/>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#4a7a99' }}>
                    <span>BEARISH</span><span>NEUTRAL</span><span>BULLISH</span>
                  </div>
                </div>

                {/* Quick index bias grid */}
                <div className="panel" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>INDEX BIAS TODAY</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {intel.indices.map(idx => (
                      <div key={idx.symbol} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '48px 1fr auto auto', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 5 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#e2e8f0', fontFamily: 'monospace' }}>{idx.futures}</span>
                        <div>
                          <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{idx.price.toLocaleString()}</div>
                          <div style={{ fontSize: 10, color: '#4a7a99' }}>{idx.name}</div>
                        </div>
                        {pct(idx.changePct)}
                        <div style={{ background: `${BIAS_CLR[idx.bias]}18`, color: BIAS_CLR[idx.bias], border: `1px solid ${BIAS_CLR[idx.bias]}40`, borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 800, letterSpacing: '.06em' }}>{idx.bias}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Earnings */}
                {intel.earnings.length > 0 && (
                  <div className="panel" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 10 }}>EARNINGS THIS WEEK</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {intel.earnings.slice(0, 8).map(e => (
                        <span key={e} style={{ background: '#071520', border: '1px solid #0e2236', borderRadius: 4, padding: '4px 8px', fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{e}</span>
                      ))}
                    </div>
                    {intel.earningsNote && <p style={{ fontSize: 12, color: '#64748b', marginTop: 10, lineHeight: 1.6 }}>{intel.earningsNote}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════════════ EXPECTED MOVES ════════════════════════ */}
          {activeSection === 'movers' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Table */}
              <div className="panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #0e2236', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99' }}>EXPECTED MOVES — TODAY'S RANGES</span>
                  <div style={{ flex: 1, height: 1, background: '#0e2236' }}/>
                  <span style={{ fontSize: 10, color: '#4a7a99' }}>Based on 14-day ATR</span>
                </div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#050e17' }}>
                      {['INDEX', 'FUTURES', 'LAST', 'CHG %', 'EXP MOVE ±', 'LOW END', 'HIGH END', 'SUPPORT', 'RESIST', 'BIAS', 'NOTE'].map(h => (
                        <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#4a7a99', whiteSpace: 'nowrap', borderBottom: '1px solid #0e2236' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {intel.indices.map((idx, i) => (
                      <tr key={idx.symbol} className="row-hover" style={{ borderBottom: '1px solid #08192a' }}>
                        <td style={{ padding: '12px 14px' }}>
                          <div style={{ fontWeight: 800, fontSize: 13, color: '#e2e8f0' }}>{idx.name}</div>
                          <div style={{ fontSize: 10, color: '#4a7a99', marginTop: 1 }}>{idx.symbol}</div>
                        </td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#94a3b8', fontSize: 13 }}>{idx.futures}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{idx.price.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px' }}>{pct(idx.changePct)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', fontWeight: 800, color: '#f59e0b', fontSize: 13 }}>±{idx.expectedMove.toFixed(2)}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#ef4444', fontWeight: 700, fontSize: 13 }}>{idx.expectedLow.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#00d4aa', fontWeight: 700, fontSize: 13 }}>{idx.expectedHigh.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#22c55e', fontSize: 12 }}>{idx.keySupport.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontFamily: 'monospace', color: '#f87171', fontSize: 12 }}>{idx.keyResistance.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px' }}>
                          <span style={{ background: `${BIAS_CLR[idx.bias]}15`, color: BIAS_CLR[idx.bias], border: `1px solid ${BIAS_CLR[idx.bias]}35`, borderRadius: 3, padding: '3px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '.06em' }}>{idx.bias}</span>
                        </td>
                        <td style={{ padding: '12px 14px', maxWidth: 220 }}>
                          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{idx.biasReason}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Trade notes */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 12 }}>
                {intel.indices.map(idx => (
                  <div key={idx.symbol} className="panel" style={{ padding: '16px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: '#e2e8f0' }}>{idx.futures}</span>
                      <span style={{ color: '#4a7a99', fontSize: 12 }}>{idx.name}</span>
                      <span style={{ marginLeft: 'auto', background: `${BIAS_CLR[idx.bias]}15`, color: BIAS_CLR[idx.bias], border: `1px solid ${BIAS_CLR[idx.bias]}35`, borderRadius: 3, padding: '2px 7px', fontSize: 10, fontWeight: 800 }}>{idx.bias}</span>
                    </div>
                    {/* Mini range bar */}
                    <div style={{ position: 'relative', height: 28, background: '#071520', borderRadius: 6, marginBottom: 10, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: '15%', right: '15%', top: 6, bottom: 6, background: `linear-gradient(90deg, #ef444430, ${BIAS_CLR[idx.bias]}40, #00d4aa30)`, borderRadius: 4 }}/>
                      <span style={{ position: 'absolute', left: 8, fontSize: 10, color: '#ef4444', fontWeight: 700, fontFamily: 'monospace' }}>{idx.expectedLow.toFixed(0)}</span>
                      <span style={{ position: 'absolute', right: 8, fontSize: 10, color: '#00d4aa', fontWeight: 700, fontFamily: 'monospace' }}>{idx.expectedHigh.toFixed(0)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{idx.tradeNote}</p>
                    {idx.keyLevel && <div style={{ marginTop: 8, fontSize: 11, color: '#4a7a99' }}>Key Level: <span style={{ color: '#f59e0b', fontFamily: 'monospace', fontWeight: 700 }}>{idx.keyLevel}</span></div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════ MACRO DASHBOARD ════════════════════════ */}
          {activeSection === 'macro' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Macro tile grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                  {[
                    { label: 'GOLD', sub: 'GLD ETF Proxy', val: intel.macro.gold, chg: intel.macro.goldChg, icon: '🥇', desc: 'Safe haven / inflation hedge' },
                    { label: 'CRUDE OIL', sub: 'USO ETF Proxy', val: intel.macro.oil, chg: intel.macro.oilChg, icon: '🛢️', desc: 'Growth / geopolitical signal' },
                    { label: 'DOLLAR', sub: 'UUP ETF (DXY)', val: intel.macro.dollar, chg: intel.macro.dollarChg, icon: '💵', desc: 'USD strength vs basket' },
                    { label: 'BONDS', sub: 'TLT (20Y Treasury)', val: intel.macro.bonds, chg: intel.macro.bondsChg, icon: '📈', desc: 'Long-duration rate risk' },
                    { label: 'CREDIT', sub: 'HYG (High Yield)', val: intel.macro.credit, chg: intel.macro.creditChg, icon: '🏦', desc: 'Risk-on / risk-off signal' },
                    { label: 'SENTIMENT', sub: 'AI Score', val: `${intel.sentimentScore}/100`, chg: '0', icon: '🧠', desc: intel.sentiment, noChg: true },
                  ].map(m => {
                    const c = chgNum(m.chg); const pos = c >= 0
                    return (
                      <div key={m.label} className="panel" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: '#4a7a99' }}>{m.label}</div>
                            <div style={{ fontSize: 10, color: '#2a4a5e', marginTop: 1 }}>{m.sub}</div>
                          </div>
                          <span style={{ fontSize: 20 }}>{m.icon}</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: '#e2e8f0', marginBottom: 4 }}>{m.val}</div>
                        {!m.noChg && <span style={{ color: pos ? '#00d4aa' : '#ef4444', fontWeight: 700, fontSize: 12 }}>{pos ? '+' : ''}{m.chg}%</span>}
                        {m.noChg && <span style={{ color: SENT_CLR[intel.sentiment], fontWeight: 700, fontSize: 12 }}>{m.desc}</span>}
                        {!m.noChg && <div style={{ fontSize: 11, color: '#2a4a5e', marginTop: 4 }}>{m.desc}</div>}
                      </div>
                    )
                  })}
                </div>

                {/* Macro reading */}
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>MACRO READING — WHAT IT MEANS</div>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.85 }}>{intel.macroReading}</p>
                </div>
              </div>

              {/* Right: Institutional + Analyst */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>WALL ST CONSENSUS (SPY)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', marginBottom: 14, padding: '8px 10px', background: '#071520', borderRadius: 5 }}>{intel.analystConsensus}</div>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7 }}>{intel.institutionalView}</p>
                </div>

                <div className="panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>CROSS-ASSET SIGNALS</div>
                  {[
                    { label: 'Gold vs Equities', val: chgNum(intel.macro.goldChg) > 0 && intel.sentiment === 'BEARISH' ? 'RISK-OFF' : 'RISK-ON', bull: intel.sentiment !== 'BEARISH' },
                    { label: 'Oil Momentum',     val: chgNum(intel.macro.oilChg) > 0 ? 'BULLISH DEMAND' : 'BEARISH DEMAND', bull: chgNum(intel.macro.oilChg) > 0 },
                    { label: 'Dollar Pressure',  val: chgNum(intel.macro.dollarChg) > 0 ? 'USD STRONG' : 'USD WEAK', bull: chgNum(intel.macro.dollarChg) <= 0 },
                    { label: 'Credit Spreads',   val: chgNum(intel.macro.creditChg) > 0 ? 'TIGHTENING' : 'WIDENING', bull: chgNum(intel.macro.creditChg) > 0 },
                    { label: 'Bond Positioning', val: chgNum(intel.macro.bondsChg) > 0 ? 'RATE FALL / BULL' : 'RATE RISE / BEAR', bull: chgNum(intel.macro.bondsChg) > 0 },
                  ].map(row => (
                    <div key={row.label} className="row-hover" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px', borderRadius: 4 }}>
                      <span style={{ fontSize: 12, color: '#64748b' }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: row.bull ? '#00d4aa' : '#ef4444' }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ INSTITUTIONAL ════════════════════════ */}
          {activeSection === 'institution' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Analyst consensus breakdown */}
              <div className="panel" style={{ padding: '18px 20px' }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 14 }}>ANALYST RATINGS — S&P 500 (SPY)</div>
                <div style={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', padding: '10px 12px', background: '#071520', borderRadius: 5, marginBottom: 14 }}>{intel.analystConsensus}</div>
                <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.75, marginBottom: 14 }}>{intel.institutionalView}</p>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: '#4a7a99', marginBottom: 10 }}>WHAT SMART MONEY WATCHES</div>
                {[
                  'Fed policy trajectory and rate cut probability',
                  'Credit spread tightening/widening (HYG vs LQD)',
                  'Dollar index direction (inverse equity correlation)',
                  'Options put/call ratio for hedging activity',
                  'Yield curve: 2Y vs 10Y spread (recession signal)',
                  'Gold divergence from equities (risk-off signal)',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: '1px solid #08192a' }}>
                    <span style={{ color: '#1e90ff', fontSize: 11, flex: '0 0 auto', marginTop: 1 }}>→</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{item}</span>
                  </div>
                ))}
              </div>

              {/* Institutional intel */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>EARNINGS RADAR</div>
                  {intel.earningsNote && <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.7, marginBottom: 12 }}>{intel.earningsNote}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {intel.earnings.slice(0, 10).map(e => (
                      <span key={e} style={{ background: '#071520', border: '1px solid #0e2236', borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: '#94a3b8', fontFamily: 'monospace' }}>{e}</span>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>MACRO FACTORS (INSTITUTIONAL LENS)</div>
                  {[
                    { label: 'Fed Stance',     val: 'Monitor CPI/PCE data', clr: '#f59e0b' },
                    { label: 'Liquidity',      val: intel.sentiment === 'BULLISH' ? 'Risk appetite elevated' : intel.sentiment === 'BEARISH' ? 'De-risking in progress' : 'Mixed signals', clr: SENT_CLR[intel.sentiment] },
                    { label: 'Earnings Cycle', val: intel.earnings.length > 0 ? `${intel.earnings.length} reporters this week` : 'Light earnings week', clr: '#1e90ff' },
                    { label: 'Positioning',    val: chgNum(intel.macro.creditChg) > 0 ? 'Long bias, credit positive' : 'Defensive, spreads widening', clr: chgNum(intel.macro.creditChg) > 0 ? '#00d4aa' : '#ef4444' },
                  ].map(row => (
                    <div key={row.label} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10, padding: '9px 8px', borderRadius: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#4a7a99' }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: row.clr, fontWeight: 600 }}>{row.val}</span>
                    </div>
                  ))}
                </div>

                <div className="panel" style={{ padding: '18px 20px', borderLeft: '3px solid #1e90ff' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#1e90ff', marginBottom: 10 }}>GOLDMAN SACHS PUBLIC WATCH</div>
                  <p style={{ fontSize: 12, color: '#64748b', lineHeight: 1.7 }}>
                    GS tracks: S&P fair value models, VIX term structure, CTA positioning, and systematic fund flows.
                    Current consensus across major banks reflected in analyst rating data above.
                    For live GS research, visit <span style={{ color: '#1e90ff' }}>goldmansachs.com/insights</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ PLAYBOOK ════════════════════════ */}
          {activeSection === 'playbook' && intel.playbook && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {/* Theme + ideas */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', color: '#4a7a99', marginBottom: 10 }}>TODAY'S DOMINANT THEME</div>
                  <div style={{ fontSize: 26, fontWeight: 900, background: `linear-gradient(135deg, ${sc}, #1e90ff)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>{intel.playbook.theme}</div>
                </div>

                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 14 }}>3 TRADE IDEAS TODAY</div>
                  {(intel.playbook.ideas || []).map((idea, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < 2 ? '1px solid #08192a' : 'none' }}>
                      <div style={{ width: 26, height: 26, background: `linear-gradient(135deg, #1e90ff20, #00d4aa20)`, border: '1px solid #1e90ff30', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#1e90ff', flex: '0 0 auto' }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.7 }}>{idea}</p>
                    </div>
                  ))}
                </div>

                <div className="panel" style={{ padding: '16px 18px', borderLeft: '3px solid #f59e0b' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#f59e0b', marginBottom: 8 }}>⛔ AVOID TODAY</div>
                  <p style={{ fontSize: 13, color: '#fcd34d', lineHeight: 1.7 }}>{intel.playbook.avoid}</p>
                </div>
              </div>

              {/* Bull / Bear */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="panel" style={{ padding: '18px 20px', borderLeft: '3px solid #00d4aa' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#00d4aa', marginBottom: 12 }}>🐂 BULL CASE</div>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 }}>{intel.playbook.bullCase}</p>
                </div>
                <div className="panel" style={{ padding: '18px 20px', borderLeft: '3px solid #ef4444' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#ef4444', marginBottom: 12 }}>🐻 BEAR CASE</div>
                  <p style={{ fontSize: 14, color: '#cbd5e1', lineHeight: 1.8 }}>{intel.playbook.bearCase}</p>
                </div>
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99', marginBottom: 12 }}>SCENARIO MATRIX</div>
                  {[
                    { scenario: 'Gap up open', action: 'Wait for pullback to prior day close', risk: 'LOW' },
                    { scenario: 'Gap down open', action: 'Watch for support / reversal signal', risk: 'MED' },
                    { scenario: 'Open flat', action: 'Trade the first 30min breakout', risk: 'MED' },
                    { scenario: 'High VIX spike', action: 'Reduce size, widen stops', risk: 'HIGH' },
                  ].map((row, i) => (
                    <div key={i} className="row-hover" style={{ display: 'grid', gridTemplateColumns: '130px 1fr 50px', gap: 10, padding: '8px', borderRadius: 4, fontSize: 12, borderBottom: i < 3 ? '1px solid #08192a' : 'none' }}>
                      <span style={{ color: '#f59e0b', fontWeight: 700 }}>{row.scenario}</span>
                      <span style={{ color: '#64748b' }}>{row.action}</span>
                      <span style={{ color: row.risk === 'HIGH' ? '#ef4444' : row.risk === 'MED' ? '#f59e0b' : '#00d4aa', fontWeight: 700, textAlign: 'right' }}>{row.risk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════ ECONOMIC CALENDAR ════════════════════════ */}
          {activeSection === 'calendar' && (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0e2236', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.15em', color: '#4a7a99' }}>ECONOMIC CALENDAR — TODAY & TOMORROW</span>
                <div style={{ flex: 1, height: 1, background: '#0e2236' }}/>
              </div>
              {intel.calendar.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4a7a99', fontSize: 14 }}>No major economic events scheduled today.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#050e17' }}>
                      {['EVENT', 'IMPACT', 'ACTUAL', 'ESTIMATE', 'PRIOR', 'TIME'].map(h => (
                        <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, letterSpacing: '.08em', color: '#4a7a99', borderBottom: '1px solid #0e2236' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {intel.calendar.map((e, i) => (
                      <tr key={i} className="row-hover" style={{ borderBottom: '1px solid #08192a' }}>
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{e.event}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ color: IMP_CLR[e.impact] ?? '#f59e0b', fontWeight: 800, fontSize: 11, letterSpacing: '.06em' }}>● {e.impact.toUpperCase()}</span>
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: e.actual !== '—' ? '#00d4aa' : '#4a7a99', fontWeight: e.actual !== '—' ? 700 : 400 }}>{e.actual}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#94a3b8' }}>{e.estimate}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: '#64748b' }}>{e.prior}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: '#4a7a99' }}>{e.time || 'TBD'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* ════════════════════════ NEWS FEED ════════════════════════ */}
          {activeSection === 'news' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 10 }}>
              {intel.news.map((n, i) => (
                <div key={i} className="panel row-hover" style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ background: '#071520', border: '1px solid #0e2236', color: '#4a7a99', fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{n.source}</span>
                    {n.time && <span style={{ color: '#2a4a5e', fontSize: 10, fontFamily: 'monospace' }}>{n.time}</span>}
                    {i < 3 && <span style={{ background: '#ef444415', color: '#ef4444', fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 800, letterSpacing: '.06em' }}>BREAKING</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: '#cbd5e1', marginBottom: n.summary ? 8 : 0 }}>{n.headline}</p>
                  {n.summary && <p style={{ fontSize: 11, color: '#4a7a99', lineHeight: 1.6 }}>{n.summary}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Demo upgrade bar */}
          {isDemoMode && (
            <div style={{ marginTop: 24, background: '#071520', border: '1px solid #0e4a6a', borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <span style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0' }}>You&apos;re viewing a preview</span>
                <span style={{ color: '#4a7a99', fontSize: 13, marginLeft: 12 }}>Subscribe to get your full personalized daily intelligence every morning.</span>
              </div>
              <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#040d14', padding: '10px 22px', borderRadius: 6, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
                Subscribe · $11.99/mo →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Paywall ──────────────────────────────────────────────────────────────────
function Paywall() {
  return (
    <div style={{ background: '#040d14', color: '#e2e8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{'*{box-sizing:border-box;margin:0;padding:0}'}</style>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.2em', color: '#4a7a99', marginBottom: 20 }}>YN DAILY INTELLIGENCE</div>
        <h1 style={{ fontSize: 32, fontWeight: 900, marginBottom: 14, lineHeight: 1.2 }}>The Data Hub Every<br/>Serious Trader Needs</h1>
        <p style={{ color: '#64748b', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
          Expected moves, daily bias, macro dashboard, institutional radar, economic calendar, and AI playbook — every morning before the open.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
          <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#f59e0b,#d97706)', color: '#040d14', padding: '14px 32px', borderRadius: 6, fontWeight: 800, fontSize: 15 }}>
            Subscribe · $11.99/month
          </Link>
          <Link href="/" style={{ background: '#060f18', color: '#94a3b8', padding: '14px 24px', borderRadius: 6, fontWeight: 600, fontSize: 15, border: '1px solid #0e2236' }}>
            Back to Home
          </Link>
        </div>
        <p style={{ color: '#2a4a5e', fontSize: 11 }}>Cancel anytime · Stripe secured · No contracts</p>
      </div>
    </div>
  )
}

export default function DailyPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#040d14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #0e2236', borderTopColor: '#00d4aa', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    }>
      <DailyInner />
    </Suspense>
  )
}
