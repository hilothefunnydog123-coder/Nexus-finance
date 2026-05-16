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
  sentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' | 'CAUTIOUS'
  sentimentScore: number
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

// ─── Colour tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      '#03080d',
  surface: '#070f17',
  raised:  '#0b1822',
  border:  '#0f2030',
  muted:   '#1a3550',
  bull:    '#00c896',
  bear:    '#e84545',
  gold:    '#f0b429',
  blue:    '#3b8eea',
  text:    '#dce8f0',
  sub:     '#6a90a8',
  dim:     '#2a4a62',
}

const SENT_CLR: Record<string, string> = {
  BULLISH: C.bull, BEARISH: C.bear, NEUTRAL: C.gold, CAUTIOUS: '#f97316',
}
const BIAS_CLR: Record<string, string> = {
  BULLISH: C.bull, BEARISH: C.bear, NEUTRAL: C.gold,
}
const IMP_CLR: Record<string, string> = {
  high: C.bear, medium: C.gold, low: C.bull,
}

function Pct({ v }: { v: number }) {
  return (
    <span style={{ color: v >= 0 ? C.bull : C.bear, fontWeight: 700, fontFamily: 'monospace' }}>
      {v >= 0 ? '+' : ''}{v.toFixed(2)}%
    </span>
  )
}

function MacroChg({ s }: { s: string }) {
  const n = parseFloat(s) || 0
  return <span style={{ color: n >= 0 ? C.bull : C.bear, fontWeight: 700, fontFamily: 'monospace', fontSize: 12 }}>{n >= 0 ? '+' : ''}{s}%</span>
}

// ─── Inner page ───────────────────────────────────────────────────────────────
function DailyInner() {
  const params    = useSearchParams()
  const sessionId = params.get('session_id')
  const activated = params.get('activated')

  const [intel, setIntel]           = useState<Intel | null>(null)
  const [loading, setLoading]       = useState(true)
  const [checking, setChecking]     = useState(true)
  const [subscribed, setSubscribed] = useState(false)
  const [demo, setDemo]             = useState(false)
  const [activating, setActivating] = useState(false)
  const [clock, setClock]           = useState('')
  const [section, setSection]       = useState('brief')

  // Live ET clock
  useEffect(() => {
    const tick = () => setClock(
      new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'America/New_York' }) + ' ET'
    )
    tick(); const t = setInterval(tick, 1000); return () => clearInterval(t)
  }, [])

  // Activate after Stripe checkout redirect
  const activate = useCallback(async (sid: string) => {
    setActivating(true)
    try {
      const r = await fetch('/api/stripe/subscription/activate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid }),
      })
      const d = await r.json()
      if (d.active || d.demo) { setSubscribed(true); setDemo(!!d.demo) }
    } catch { /* ignore */ } finally { setActivating(false); setChecking(false) }
  }, [])

  // Check subscription via HttpOnly cookie → server validates
  const checkSub = useCallback(async () => {
    try {
      const r = await fetch('/api/stripe/subscription/check')
      const d = await r.json()
      setSubscribed(!!d.active)
      setDemo(!!d.demo)
    } catch { setSubscribed(false) } finally { setChecking(false) }
  }, [])

  useEffect(() => {
    if (sessionId && activated) {
      activate(sessionId).then(() => window.history.replaceState({}, '', '/daily'))
    } else {
      checkSub()
    }
  }, [sessionId, activated, activate, checkSub])

  // Fetch intel once subscription confirmed
  useEffect(() => {
    if (checking || activating) return
    fetch('/api/daily-intel')
      .then(r => r.json())
      .then(d => { if (d.intel) { setIntel(d.intel); if (d.demo && !subscribed) setDemo(true) } })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [checking, activating, subscribed])

  const show = subscribed || demo
  if (!checking && !activating && !show && !loading) return <Paywall />

  const sc   = SENT_CLR[intel?.sentiment ?? 'NEUTRAL']
  const now  = new Date()
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

  const TABS = [
    { id: 'brief',    label: 'Morning Brief'     },
    { id: 'indices',  label: 'Index Watch'        },
    { id: 'macro',    label: 'Macro & Rates'      },
    { id: 'inst',     label: 'Institutional Pulse' },
    { id: 'playbook', label: 'Daily Playbook'     },
    { id: 'calendar', label: 'Economic Calendar'  },
    { id: 'news',     label: 'News Feed'          },
  ]

  const isLoading = loading || checking || activating

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: '"Inter", "SF Pro Text", system-ui, sans-serif', minHeight: '100vh' }}>
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:.35}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        @keyframes skel{0%{background-position:-600px 0}100%{background-position:600px 0}}
        .sk{background:linear-gradient(90deg,${C.surface} 25%,${C.raised} 50%,${C.surface} 75%);background-size:600px 100%;animation:skel 1.4s infinite;border-radius:4px}
        .row:hover{background:${C.raised}!important}
        .tab:hover{color:${C.text}!important}
        .tab{cursor:pointer;border:none;transition:color .12s,background .12s}
        .panel{background:${C.surface};border:1px solid ${C.border};border-radius:8px}
        ::-webkit-scrollbar{width:3px;height:3px}
        ::-webkit-scrollbar-thumb{background:${C.muted};border-radius:99px}
        a{color:inherit;text-decoration:none}
        .btn{cursor:pointer;border:none;transition:opacity .15s}
        .btn:hover{opacity:.85}
      `}</style>

      {/* ━━━ TOP BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 48, position: 'sticky', top: 0, zIndex: 200, background: C.bg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
            <span style={{ fontWeight: 800, fontSize: 13, letterSpacing: '.04em' }}>YN FINANCE</span>
          </Link>
          <span style={{ color: C.muted, fontSize: 13 }}>|</span>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: C.bull }}>DAILY INTELLIGENCE</span>
          {demo && <span style={{ background: '#1c1400', color: C.gold, fontSize: 10, padding: '2px 8px', borderRadius: 3, border: `1px solid ${C.gold}35`, fontWeight: 700, letterSpacing: '.08em' }}>PREVIEW</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {intel && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: sc, animation: 'pulse 2.4s infinite', display: 'inline-block' }}/>
              <span style={{ fontSize: 11, fontWeight: 700, color: sc, letterSpacing: '.08em' }}>{intel.sentiment}</span>
              <span style={{ color: C.dim, fontSize: 11, fontFamily: 'monospace' }}>{intel.sentimentScore}/100</span>
            </div>
          )}
          <span style={{ fontSize: 11, color: C.sub, fontFamily: 'monospace' }}>{clock}</span>
          <Link href="/daily/manage" style={{ fontSize: 11, color: C.sub, padding: '4px 10px', border: `1px solid ${C.border}`, borderRadius: 4 }}>Manage Plan</Link>
        </div>
      </div>

      {/* ━━━ TICKER BAR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {intel && (
        <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', overflowX: 'auto', height: 38, gap: 0 }}>
          {intel.indices.map(idx => (
            <div key={idx.symbol} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 18px', borderRight: `1px solid ${C.border}`, height: '100%', flex: '0 0 auto' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: C.sub, letterSpacing: '.06em' }}>{idx.futures}</span>
              <span style={{ fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>{idx.price.toLocaleString()}</span>
              <Pct v={idx.changePct}/>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: BIAS_CLR[idx.bias], display: 'inline-block' }}/>
            </div>
          ))}
          {[
            { k: 'GLD', v: intel.macro.gold,   c: intel.macro.goldChg   },
            { k: 'OIL', v: intel.macro.oil,    c: intel.macro.oilChg    },
            { k: 'DXY', v: intel.macro.dollar, c: intel.macro.dollarChg },
            { k: 'TLT', v: intel.macro.bonds,  c: intel.macro.bondsChg  },
            { k: 'HYG', v: intel.macro.credit, c: intel.macro.creditChg },
          ].map(m => (
            <div key={m.k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 16px', borderRight: `1px solid ${C.border}`, height: '100%', flex: '0 0 auto' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.sub }}>{m.k}</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{m.v}</span>
              <MacroChg s={m.c}/>
            </div>
          ))}
          <div style={{ marginLeft: 'auto', padding: '0 18px', flex: '0 0 auto', fontSize: 11, color: C.dim }}>{dateStr}</div>
        </div>
      )}

      {/* ━━━ LOADING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {isLoading && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 12 }}>
            {[0,1,2,3].map(i => <div key={i} className="sk" style={{ height: 90 }}/>)}
          </div>
          <div className="sk" style={{ height: 220, marginBottom: 12 }}/>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 12 }}>
            <div className="sk" style={{ height: 280 }}/>
            <div className="sk" style={{ height: 280 }}/>
          </div>
        </div>
      )}

      {/* ━━━ CONTENT ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {!isLoading && intel && (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '18px 24px 80px', animation: 'fadeIn .35s ease' }}>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 2, marginBottom: 18, overflowX: 'auto', paddingBottom: 2 }}>
            {TABS.map(t => (
              <button key={t.id} className="tab"
                onClick={() => setSection(t.id)}
                style={{ padding: '7px 16px', borderRadius: 5, fontSize: 11, fontWeight: 700, letterSpacing: '.07em', background: section === t.id ? C.raised : 'transparent', color: section === t.id ? C.bull : C.sub, border: section === t.id ? `1px solid ${C.border}` : '1px solid transparent' }}>
                {t.label.toUpperCase()}
              </button>
            ))}
          </div>

          {/* ══════════ MORNING BRIEF ══════════════════════════════════════ */}
          {section === 'brief' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Headline */}
                <div className="panel" style={{ padding: '22px 24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <div style={{ width: 3, height: 22, background: sc, borderRadius: 99 }}/>
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.18em', color: C.sub }}>TODAY'S BRIEF · AI-GENERATED</span>
                    <div style={{ flex: 1, height: 1, background: C.border }}/>
                    <span style={{ fontSize: 10, color: C.dim }}>
                      {new Date(intel.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })} ET
                    </span>
                  </div>
                  <h1 style={{ fontSize: 'clamp(20px, 2.5vw, 30px)', fontWeight: 800, lineHeight: 1.25, color: C.text, marginBottom: 10 }}>{intel.headline}</h1>
                  <p style={{ fontSize: 14, color: C.sub, marginBottom: 18, lineHeight: 1.5, fontStyle: 'italic' }}>{intel.subheadline}</p>
                  <p style={{ fontSize: 14, color: '#b8cdd8', lineHeight: 1.85 }}>{intel.brief}</p>
                </div>

                {/* Key points */}
                <div className="panel" style={{ padding: '18px 24px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: C.sub, marginBottom: 14 }}>KEY TAKEAWAYS</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {intel.keyPoints.map((pt, i) => (
                      <div key={i} style={{ display: 'flex', gap: 12, padding: '10px 14px', background: C.raised, borderRadius: 6, borderLeft: `2px solid ${sc}` }}>
                        <span style={{ color: sc, fontWeight: 800, fontSize: 12, flex: '0 0 auto' }}>{i + 1}</span>
                        <span style={{ fontSize: 13, color: C.sub, lineHeight: 1.6 }}>{pt}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Risk + Tip */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div className="panel" style={{ padding: '16px 18px', borderLeft: `3px solid ${C.bear}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.bear, marginBottom: 10 }}>⚠ RISK ALERT</div>
                    <p style={{ fontSize: 13, color: '#e8a0a0', lineHeight: 1.7 }}>{intel.riskAlert}</p>
                  </div>
                  <div className="panel" style={{ padding: '16px 18px', borderLeft: `3px solid ${C.bull}` }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.bull, marginBottom: 10 }}>⚡ TRADER TIP</div>
                    <p style={{ fontSize: 13, color: '#a0d8c0', lineHeight: 1.7 }}>{intel.traderTip}</p>
                  </div>
                </div>
              </div>

              {/* Right sidebar */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Sentiment gauge */}
                <div className="panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>MARKET SENTIMENT</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
                    <span style={{ fontSize: 24, fontWeight: 900, color: sc }}>{intel.sentiment}</span>
                    <span style={{ fontSize: 28, fontWeight: 900, color: sc, marginLeft: 'auto', fontFamily: 'monospace' }}>{intel.sentimentScore}</span>
                  </div>
                  <div style={{ height: 5, background: C.raised, borderRadius: 99, overflow: 'hidden', marginBottom: 6 }}>
                    <div style={{ width: `${intel.sentimentScore}%`, height: '100%', background: `linear-gradient(90deg,${C.bear},${C.gold},${C.bull})`, borderRadius: 99 }}/>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: C.dim, fontWeight: 700, letterSpacing: '.06em' }}>
                    <span>BEARISH</span><span>NEUTRAL</span><span>BULLISH</span>
                  </div>
                </div>

                {/* Index bias quick-view */}
                <div className="panel" style={{ padding: '16px 18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 12 }}>INDEX BIAS</div>
                  {intel.indices.map(idx => (
                    <div key={idx.symbol} className="row" style={{ display: 'grid', gridTemplateColumns: '44px 1fr auto auto', gap: 10, alignItems: 'center', padding: '8px 8px', borderRadius: 5 }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 12, color: C.sub }}>{idx.futures}</span>
                      <div>
                        <div style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700 }}>{idx.price.toLocaleString()}</div>
                        <div style={{ fontSize: 10, color: C.dim }}>{idx.name}</div>
                      </div>
                      <Pct v={idx.changePct}/>
                      <span style={{ fontSize: 10, fontWeight: 800, color: BIAS_CLR[idx.bias], background: `${BIAS_CLR[idx.bias]}15`, border: `1px solid ${BIAS_CLR[idx.bias]}35`, borderRadius: 3, padding: '2px 6px' }}>{idx.bias}</span>
                    </div>
                  ))}
                </div>

                {/* Earnings */}
                {intel.earnings.length > 0 && (
                  <div className="panel" style={{ padding: '16px 18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 10 }}>EARNINGS THIS WEEK</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
                      {intel.earnings.slice(0, 8).map((e, i) => (
                        <span key={i} style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, padding: '3px 8px', fontSize: 11, fontWeight: 700, color: C.sub, fontFamily: 'monospace' }}>{e}</span>
                      ))}
                    </div>
                    {intel.earningsNote && <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.6 }}>{intel.earningsNote}</p>}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════ INDEX WATCH ════════════════════════════════════════ */}
          {section === 'indices' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Data table */}
              <div className="panel" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub }}>EXPECTED MOVES — TODAY'S STATISTICAL RANGES</span>
                  <div style={{ flex: 1, height: 1, background: C.border }}/>
                  <span style={{ fontSize: 10, color: C.dim }}>14-Day ATR · 68% probability</span>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
                    <thead>
                      <tr style={{ background: C.raised }}>
                        {['INDEX / FUTURES','LAST','CHG%','EXP MOVE ±','LOW END','HIGH END','SUPPORT','RESISTANCE','BIAS','REASON'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: C.dim, borderBottom: `1px solid ${C.border}`, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {intel.indices.map((idx) => (
                        <tr key={idx.symbol} className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '13px 14px' }}>
                            <div style={{ fontWeight: 800, fontSize: 13 }}>{idx.name}</div>
                            <div style={{ fontSize: 10, color: C.sub, fontFamily: 'monospace', marginTop: 2 }}>{idx.symbol} / {idx.futures}</div>
                          </td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{idx.price.toLocaleString()}</td>
                          <td style={{ padding: '13px 14px' }}><Pct v={idx.changePct}/></td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', fontWeight: 800, color: C.gold, fontSize: 13 }}>±{idx.expectedMove.toFixed(2)}</td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', color: C.bear, fontWeight: 700 }}>{idx.expectedLow.toLocaleString()}</td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', color: C.bull, fontWeight: 700 }}>{idx.expectedHigh.toLocaleString()}</td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', color: '#4ade80', fontSize: 12 }}>{idx.keySupport.toLocaleString()}</td>
                          <td style={{ padding: '13px 14px', fontFamily: 'monospace', color: '#f87171', fontSize: 12 }}>{idx.keyResistance.toLocaleString()}</td>
                          <td style={{ padding: '13px 14px' }}>
                            <span style={{ fontSize: 10, fontWeight: 800, color: BIAS_CLR[idx.bias], background: `${BIAS_CLR[idx.bias]}15`, border: `1px solid ${BIAS_CLR[idx.bias]}30`, borderRadius: 3, padding: '3px 8px', whiteSpace: 'nowrap' }}>{idx.bias}</span>
                          </td>
                          <td style={{ padding: '13px 14px', fontSize: 12, color: C.dim, maxWidth: 200, lineHeight: 1.5 }}>{idx.biasReason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Detail cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
                {intel.indices.map(idx => (
                  <div key={idx.symbol} className="panel" style={{ padding: '18px', borderTop: `3px solid ${BIAS_CLR[idx.bias]}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15 }}>{idx.futures}</div>
                        <div style={{ color: C.dim, fontSize: 11 }}>{idx.name}</div>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: BIAS_CLR[idx.bias] }}>{idx.bias}</span>
                    </div>
                    {/* Range bar */}
                    <div style={{ background: C.raised, borderRadius: 6, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: 12, position: 'relative', overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: '12%', right: '12%', top: 8, bottom: 8, background: `linear-gradient(90deg, ${C.bear}30, ${BIAS_CLR[idx.bias]}40, ${C.bull}30)`, borderRadius: 4 }}/>
                      <span style={{ fontSize: 10, color: C.bear, fontFamily: 'monospace', fontWeight: 700, zIndex: 1 }}>{idx.expectedLow.toFixed(0)}</span>
                      <span style={{ fontSize: 9, color: C.dim, zIndex: 1 }}>±{idx.expectedMove.toFixed(2)}</span>
                      <span style={{ fontSize: 10, color: C.bull, fontFamily: 'monospace', fontWeight: 700, zIndex: 1 }}>{idx.expectedHigh.toFixed(0)}</span>
                    </div>
                    <p style={{ fontSize: 12, color: C.sub, lineHeight: 1.65, marginBottom: idx.tradeNote ? 10 : 0 }}>{idx.biasReason}</p>
                    {idx.tradeNote && (
                      <div style={{ background: `${BIAS_CLR[idx.bias]}10`, border: `1px solid ${BIAS_CLR[idx.bias]}25`, borderRadius: 5, padding: '8px 10px' }}>
                        <span style={{ fontSize: 9, fontWeight: 800, color: BIAS_CLR[idx.bias], letterSpacing: '.08em' }}>SESSION NOTE · </span>
                        <span style={{ fontSize: 12, color: C.sub }}>{idx.tradeNote}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════ MACRO & RATES ══════════════════════════════════════ */}
          {section === 'macro' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Macro tiles */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                  {[
                    { k: 'GOLD',        sub: 'GLD ETF Proxy',    val: intel.macro.gold,   chg: intel.macro.goldChg,   icon: '🥇', desc: 'Safe haven demand' },
                    { k: 'CRUDE OIL',   sub: 'USO ETF Proxy',    val: intel.macro.oil,    chg: intel.macro.oilChg,    icon: '🛢️', desc: 'Growth / geopolitical' },
                    { k: 'US DOLLAR',   sub: 'UUP (DXY proxy)',  val: intel.macro.dollar, chg: intel.macro.dollarChg, icon: '💵', desc: 'Inverse equity pressure' },
                    { k: '20Y BONDS',   sub: 'TLT ETF',          val: intel.macro.bonds,  chg: intel.macro.bondsChg,  icon: '📊', desc: 'Long duration rates' },
                    { k: 'HIGH YIELD',  sub: 'HYG Credit ETF',   val: intel.macro.credit, chg: intel.macro.creditChg, icon: '🏦', desc: 'Risk appetite signal' },
                    { k: 'AI SENTIMENT',sub: 'Composite Score',  val: `${intel.sentimentScore}`, chg: '0', icon: '🧠', desc: intel.sentiment, noChg: true },
                  ].map(m => {
                    const n = parseFloat(m.chg); const pos = n >= 0
                    return (
                      <div key={m.k} className="panel" style={{ padding: '16px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.12em', color: C.dim }}>{m.k}</div>
                            <div style={{ fontSize: 9, color: C.muted, marginTop: 1 }}>{m.sub}</div>
                          </div>
                          <span style={{ fontSize: 22 }}>{m.icon}</span>
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 800, fontFamily: 'monospace', color: C.text, marginBottom: 4 }}>{m.val}</div>
                        {m.noChg
                          ? <span style={{ fontSize: 11, fontWeight: 700, color: SENT_CLR[intel.sentiment] }}>{m.desc}</span>
                          : <><span style={{ color: pos ? C.bull : C.bear, fontWeight: 700, fontSize: 12, fontFamily: 'monospace' }}>{pos ? '+' : ''}{m.chg}%</span><span style={{ fontSize: 10, color: C.dim, marginLeft: 6 }}>{m.desc}</span></>
                        }
                      </div>
                    )
                  })}
                </div>
                {/* Macro narrative */}
                <div className="panel" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>MACRO NARRATIVE — WHAT THE DATA IS SAYING</div>
                  <p style={{ fontSize: 14, color: '#b8cdd8', lineHeight: 1.85 }}>{intel.macroReading}</p>
                </div>
              </div>

              {/* Cross-asset signals */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div className="panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>CROSS-ASSET SIGNALS</div>
                  {[
                    { label: 'Risk Appetite',   val: parseFloat(intel.macro.creditChg) > 0 ? 'RISK-ON' : 'RISK-OFF',     bull: parseFloat(intel.macro.creditChg) > 0 },
                    { label: 'Dollar Pressure', val: parseFloat(intel.macro.dollarChg) > 0 ? 'HEADWIND' : 'TAILWIND',    bull: parseFloat(intel.macro.dollarChg) <= 0 },
                    { label: 'Rate Regime',     val: parseFloat(intel.macro.bondsChg) > 0  ? 'RATES FALLING' : 'RATES RISING', bull: parseFloat(intel.macro.bondsChg) > 0 },
                    { label: 'Commodities',     val: parseFloat(intel.macro.goldChg) > 1   ? 'FEAR BUYING' : 'STABLE',    bull: parseFloat(intel.macro.goldChg) < 1 },
                    { label: 'Energy',          val: parseFloat(intel.macro.oilChg) > 0    ? 'DEMAND POSITIVE' : 'DEMAND SOFT', bull: parseFloat(intel.macro.oilChg) > 0 },
                  ].map(row => (
                    <div key={row.label} className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 8px', borderRadius: 4 }}>
                      <span style={{ fontSize: 12, color: C.dim }}>{row.label}</span>
                      <span style={{ fontSize: 11, fontWeight: 800, color: row.bull ? C.bull : C.bear }}>{row.val}</span>
                    </div>
                  ))}
                </div>

                <div className="panel" style={{ padding: '18px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 12 }}>SMART MONEY CHECKLIST</div>
                  {[
                    'Fed funds rate trajectory and meeting dates',
                    'CPI / PCE inflation vs. expectations',
                    '2Y–10Y yield spread (curve inversion)',
                    'Dollar index (DXY) direction',
                    'VIX term structure (contango vs backwardation)',
                    'Credit spread tightening (HYG vs LQD)',
                    'Put/call ratio on SPX options',
                    'COT positioning — net speculative futures',
                  ].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 10, padding: '7px 0', borderBottom: i < 7 ? `1px solid ${C.border}` : 'none' }}>
                      <span style={{ color: C.blue, fontSize: 10, flex: '0 0 auto', marginTop: 2 }}>→</span>
                      <span style={{ fontSize: 12, color: C.dim }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ INSTITUTIONAL PULSE ════════════════════════════════ */}
          {section === 'inst' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="panel" style={{ padding: '20px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>WALL STREET CONSENSUS — S&P 500 (SPY)</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: C.dim, padding: '10px 12px', background: C.raised, borderRadius: 5, marginBottom: 14 }}>{intel.analystConsensus}</div>
                  <p style={{ fontSize: 14, color: '#b8cdd8', lineHeight: 1.8 }}>{intel.institutionalView}</p>
                </div>

                <div className="panel" style={{ padding: '18px 22px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>INSTITUTIONAL POSITIONING INDICATORS</div>
                  {[
                    { label: 'Risk Positioning', val: intel.sentiment === 'BULLISH' ? 'Long bias elevated' : intel.sentiment === 'BEARISH' ? 'De-risking in progress' : 'Mixed / neutral', clr: SENT_CLR[intel.sentiment] },
                    { label: 'Credit Spreads',   val: parseFloat(intel.macro.creditChg) > 0 ? 'Tightening — bullish signal' : 'Widening — defensive signal', clr: parseFloat(intel.macro.creditChg) > 0 ? C.bull : C.bear },
                    { label: 'Dollar Flows',     val: parseFloat(intel.macro.dollarChg) > 0 ? 'USD strength — EM headwind' : 'USD soft — risk assets bid', clr: parseFloat(intel.macro.dollarChg) > 0 ? C.bear : C.bull },
                    { label: 'Bond Demand',      val: parseFloat(intel.macro.bondsChg) > 0 ? 'Duration buying — defensive' : 'Duration selling — risk-on', clr: parseFloat(intel.macro.bondsChg) > 0 ? C.gold : C.bull },
                    { label: 'Earnings Season',  val: intel.earnings.length > 0 ? `${intel.earnings.length} reports this week` : 'Light earnings week', clr: C.blue },
                  ].map(row => (
                    <div key={row.label} className="row" style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 12, padding: '9px 8px', borderRadius: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: C.dim }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: row.clr, fontWeight: 600 }}>{row.val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>EARNINGS RADAR</div>
                  {intel.earningsNote && <p style={{ fontSize: 13, color: '#b8cdd8', lineHeight: 1.75, marginBottom: 14 }}>{intel.earningsNote}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {intel.earnings.slice(0, 12).map((e, i) => (
                      <span key={i} style={{ background: C.raised, border: `1px solid ${C.border}`, borderRadius: 4, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: C.sub, fontFamily: 'monospace' }}>{e}</span>
                    ))}
                  </div>
                </div>

                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>MAJOR BANK RESEARCH THEMES</div>
                  <p style={{ fontSize: 12, color: C.dim, lineHeight: 1.7, marginBottom: 14 }}>
                    Data sourced from public analyst ratings via Finnhub. For primary bank research:
                  </p>
                  {[
                    { name: 'Goldman Sachs',    url: 'goldmansachs.com/insights' },
                    { name: 'JPMorgan',         url: 'jpmorgan.com/insights' },
                    { name: 'Morgan Stanley',   url: 'morganstanley.com/ideas' },
                    { name: 'BlackRock',        url: 'blackrock.com/insights' },
                    { name: 'Fed Research',     url: 'federalreserve.gov/econres' },
                  ].map(r => (
                    <div key={r.name} className="row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 8px', borderRadius: 4 }}>
                      <span style={{ fontSize: 13, color: C.text, fontWeight: 600 }}>{r.name}</span>
                      <span style={{ fontSize: 11, color: C.blue, fontFamily: 'monospace' }}>{r.url}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ DAILY PLAYBOOK ══════════════════════════════════════ */}
          {section === 'playbook' && intel.playbook && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {/* Theme */}
                <div className="panel" style={{ padding: '20px', textAlign: 'center' }}>
                  <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.2em', color: C.dim, marginBottom: 10 }}>TODAY'S DOMINANT THEME</div>
                  <div style={{ fontSize: 26, fontWeight: 900, background: `linear-gradient(135deg,${sc},${C.blue})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                    {intel.playbook.theme}
                  </div>
                </div>

                {/* Ideas */}
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>3 TRADE IDEAS FOR TODAY</div>
                  {(intel.playbook.ideas ?? []).map((idea, i) => (
                    <div key={i} style={{ display: 'flex', gap: 14, padding: '12px 0', borderBottom: i < 2 ? `1px solid ${C.border}` : 'none' }}>
                      <div style={{ width: 26, height: 26, background: C.raised, border: `1px solid ${C.blue}30`, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: C.blue, flex: '0 0 auto' }}>{i + 1}</div>
                      <p style={{ fontSize: 13, color: '#b8cdd8', lineHeight: 1.7 }}>{idea}</p>
                    </div>
                  ))}
                </div>

                {/* Avoid */}
                <div className="panel" style={{ padding: '16px 18px', borderLeft: `3px solid ${C.gold}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.gold, marginBottom: 10 }}>⛔ AVOID TODAY</div>
                  <p style={{ fontSize: 13, color: '#f5d87a', lineHeight: 1.7 }}>{intel.playbook.avoid}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="panel" style={{ padding: '18px 20px', borderLeft: `3px solid ${C.bull}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.bull, marginBottom: 12 }}>🐂 BULL CASE</div>
                  <p style={{ fontSize: 14, color: '#b8cdd8', lineHeight: 1.8 }}>{intel.playbook.bullCase}</p>
                </div>
                <div className="panel" style={{ padding: '18px 20px', borderLeft: `3px solid ${C.bear}` }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.bear, marginBottom: 12 }}>🐻 BEAR CASE</div>
                  <p style={{ fontSize: 14, color: '#b8cdd8', lineHeight: 1.8 }}>{intel.playbook.bearCase}</p>
                </div>

                {/* Scenario matrix */}
                <div className="panel" style={{ padding: '18px 20px' }}>
                  <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 14 }}>OPEN SCENARIO MATRIX</div>
                  {[
                    { s: 'Gap up open',      a: 'Wait for pullback to prev day close or VWAP',  r: 'LOW' },
                    { s: 'Gap down open',    a: 'Watch for support + reversal structure',        r: 'MED' },
                    { s: 'Flat / chop open', a: 'Trade first 30-min range breakout with size',   r: 'MED' },
                    { s: 'VIX spike >25',    a: 'Reduce size 50%, widen stops, no chasing',      r: 'HIGH' },
                  ].map((row, i) => (
                    <div key={i} className="row" style={{ display: 'grid', gridTemplateColumns: '130px 1fr 44px', gap: 10, padding: '9px 8px', borderRadius: 4, fontSize: 12, borderBottom: i < 3 ? `1px solid ${C.border}` : 'none' }}>
                      <span style={{ color: C.gold, fontWeight: 700 }}>{row.s}</span>
                      <span style={{ color: C.dim }}>{row.a}</span>
                      <span style={{ color: row.r === 'HIGH' ? C.bear : row.r === 'MED' ? C.gold : C.bull, fontWeight: 800, textAlign: 'right' }}>{row.r}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════ ECONOMIC CALENDAR ══════════════════════════════════ */}
          {section === 'calendar' && (
            <div className="panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: '13px 20px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub }}>ECONOMIC CALENDAR — HIGH IMPACT EVENTS</span>
                <div style={{ flex: 1, height: 1, background: C.border }}/>
                <span style={{ fontSize: 10, color: C.dim }}>Live from Finnhub</span>
              </div>
              {intel.calendar.length === 0
                ? <div style={{ padding: '48px', textAlign: 'center', color: C.dim, fontSize: 14 }}>No major economic events scheduled.</div>
                : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: C.raised }}>
                        {['EVENT','IMPACT','ACTUAL','ESTIMATE','PRIOR','TIME'].map(h => (
                          <th key={h} style={{ padding: '9px 16px', textAlign: 'left', fontSize: 9, fontWeight: 800, letterSpacing: '.1em', color: C.dim, borderBottom: `1px solid ${C.border}` }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {intel.calendar.map((e, i) => (
                        <tr key={i} className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                          <td style={{ padding: '12px 16px', fontSize: 13, color: C.text, fontWeight: 500 }}>{e.event}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ color: IMP_CLR[e.impact] ?? C.gold, fontWeight: 800, fontSize: 10, letterSpacing: '.08em' }}>● {e.impact.toUpperCase()}</span>
                          </td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: e.actual !== '—' ? C.bull : C.dim, fontWeight: e.actual !== '—' ? 700 : 400 }}>{e.actual}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: C.sub }}>{e.estimate}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 13, color: C.dim }}>{e.prior}</td>
                          <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 12, color: C.dim }}>{e.time || 'TBD'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              }
            </div>
          )}

          {/* ══════════ NEWS FEED ═══════════════════════════════════════════ */}
          {section === 'news' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10 }}>
              {intel.news.map((n, i) => (
                <div key={i} className="panel row" style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ background: C.raised, border: `1px solid ${C.border}`, color: C.sub, fontSize: 10, padding: '2px 8px', borderRadius: 3, fontWeight: 700, letterSpacing: '.06em', whiteSpace: 'nowrap' }}>{n.source}</span>
                    {n.time && <span style={{ color: C.dim, fontSize: 10, fontFamily: 'monospace' }}>{n.time}</span>}
                    {i < 3 && <span style={{ background: `${C.bear}15`, color: C.bear, fontSize: 9, padding: '2px 6px', borderRadius: 3, fontWeight: 800, letterSpacing: '.06em', marginLeft: 'auto' }}>BREAKING</span>}
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, lineHeight: 1.55, color: C.text, marginBottom: n.summary ? 8 : 0 }}>{n.headline}</p>
                  {n.summary && <p style={{ fontSize: 11, color: C.dim, lineHeight: 1.6 }}>{n.summary}</p>}
                </div>
              ))}
            </div>
          )}

          {/* Demo upgrade bar */}
          {demo && (
            <div style={{ marginTop: 24, background: '#0e1c0a', border: `1px solid ${C.bull}30`, borderRadius: 8, padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <span style={{ color: '#b8cdd8', fontSize: 14 }}>You&apos;re previewing YN Daily Intelligence — data is live but Stripe is in demo mode.</span>
              <Link href="/daily/subscribe" style={{ background: `linear-gradient(135deg,${C.gold},#d97706)`, color: '#03080d', padding: '10px 22px', borderRadius: 6, fontWeight: 800, fontSize: 13, whiteSpace: 'nowrap' }}>
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
    <div style={{ background: '#03080d', color: '#dce8f0', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{'*{box-sizing:border-box;margin:0;padding:0}'}</style>
      <div style={{ maxWidth: 520, textAlign: 'center' }}>
        <div style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.22em', color: '#2a4a62', marginBottom: 20 }}>YN DAILY INTELLIGENCE</div>
        <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 14, lineHeight: 1.2 }}>The Morning Data Hub<br/>Every Serious Trader Needs</h1>
        <p style={{ color: '#6a90a8', fontSize: 15, lineHeight: 1.75, marginBottom: 32 }}>
          Expected moves, daily bias, macro dashboard, institutional radar, economic calendar, and your AI playbook — before every open.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/daily/subscribe" style={{ background: 'linear-gradient(135deg,#f0b429,#d97706)', color: '#03080d', padding: '14px 32px', borderRadius: 6, fontWeight: 800, fontSize: 15 }}>
            Subscribe · $11.99/month
          </Link>
          <Link href="/" style={{ background: '#070f17', color: '#6a90a8', padding: '14px 24px', borderRadius: 6, fontWeight: 600, fontSize: 15, border: '1px solid #0f2030' }}>
            Back to Home
          </Link>
        </div>
        <p style={{ color: '#1a3550', fontSize: 11, marginTop: 20 }}>Cancel anytime · Stripe secured · No contracts</p>
      </div>
    </div>
  )
}

export default function DailyPage() {
  return (
    <Suspense fallback={
      <div style={{ background: '#03080d', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '2px solid #0f2030', borderTopColor: '#00c896', borderRadius: '50%', animation: 'spin .7s linear infinite' }}/>
        <style>{'@keyframes spin{to{transform:rotate(360deg)}}'}</style>
      </div>
    }>
      <DailyInner />
    </Suspense>
  )
}
