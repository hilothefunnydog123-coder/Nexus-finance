'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Insights = {
  ready: boolean; days?: number
  totals?: { events: number; visitors: number; conversions: number }
  features?: { key: string; label: string; clicks: number; avgDwellS: number; trend: number }[]
  rising?: { key: string; label: string; trend: number }[]
  dead?: string[]
  topTickers?: { sym: string; n: number }[]
  experiments?: { exp: string; variants: { variant: string; impressions: number; conversions: number; cvr: number; promoted: boolean }[] }[]
  model?: { trainedSteps: number; updatedAt: string } | null
}

const C = { bg: '#05060a', card: 'rgba(255,255,255,.03)', line: 'rgba(255,255,255,.08)', ink: '#e8f4f8', dim: '#5f7080', blue: '#5b8cff', green: '#34d399', amber: '#f5b14b' }

export default function SiteBrainDashboard() {
  const [days, setDays] = useState(14)
  const [d, setD] = useState<Insights | null>(null)
  useEffect(() => { fetch('/api/brain/insights?days=' + days).then(r => r.json()).then(setD).catch(() => setD({ ready: false })) }, [days])

  const maxClicks = Math.max(1, ...(d?.features || []).map(f => f.clicks))

  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: 'ui-monospace, Menlo, monospace', padding: '28px clamp(16px,4vw,48px)' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 12 }}>
          <Link href="/labs" style={{ color: C.dim, fontSize: 12, textDecoration: 'none' }}>← Labs</Link>
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 14, 30].map(n => (
              <button key={n} onClick={() => setDays(n)} style={{ fontSize: 11, fontWeight: 700, color: days === n ? '#06100b' : C.dim, background: days === n ? C.green : 'transparent', border: `1px solid ${days === n ? C.green : C.line}`, borderRadius: 8, padding: '5px 11px', cursor: 'pointer' }}>{n}d</button>
            ))}
          </div>
        </div>

        <h1 style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 900, letterSpacing: '-1px', margin: '4px 0 4px' }}>🧠 Site Brain</h1>
        <p style={{ color: C.dim, fontSize: 13, marginBottom: 14 }}>What every visitor is actually doing — and which features the net should surface vs sunset.</p>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 22, fontSize: 12 }}>
          <Link href="/the-mind" style={{ color: C.blue, textDecoration: 'none' }}>▸ watch The Mind (live viz)</Link>
          {d?.model ? <span style={{ color: C.green }}>● net trained — {(d.model.trainedSteps).toLocaleString()} SGD steps</span> : <span style={{ color: C.dim }}>○ net not trained yet — call /api/brain/train</span>}
        </div>

        {!d ? (
          <div style={{ color: C.dim }}>Loading…</div>
        ) : !d.ready ? (
          <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 28, color: C.dim, fontSize: 13, lineHeight: 1.7 }}>
            The Site Brain isn’t live yet. Run <b style={{ color: C.ink }}>supabase-sitebrain.sql</b> in Supabase and set <b style={{ color: C.ink }}>SUPABASE_SERVICE_ROLE_KEY</b>. Once visitors start browsing, this fills in automatically.
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
              {[['visitors', d.totals?.visitors ?? 0, C.blue], ['events', d.totals?.events ?? 0, C.ink], ['conversions', d.totals?.conversions ?? 0, C.green]].map(([l, v, c]) => (
                <div key={l as string} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '18px 16px' }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: c as string }}>{(v as number).toLocaleString()}</div>
                  <div style={{ fontSize: 10, color: C.dim, letterSpacing: '.12em', marginTop: 4 }}>{(l as string).toUpperCase()}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1fr)', gap: 16 }} className="sb-grid">
              <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
                <div style={{ fontSize: 11, color: C.dim, letterSpacing: '.14em', marginBottom: 14 }}>FEATURE USAGE · clicks + avg read time + trend</div>
                <div style={{ display: 'grid', gap: 9 }}>
                  {(d.features || []).map(f => (
                    <div key={f.key} style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 10, alignItems: 'center' }}>
                      <span style={{ fontSize: 12, color: f.clicks ? C.ink : C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.label}</span>
                      <div style={{ height: 8, background: 'rgba(255,255,255,.05)', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: `${(f.clicks / maxClicks) * 100}%`, height: '100%', background: `linear-gradient(90deg,${C.blue},${C.green})`, borderRadius: 4 }} />
                      </div>
                      <span style={{ fontSize: 11, color: C.dim, whiteSpace: 'nowrap' }}>
                        {f.clicks} · {f.avgDwellS}s {f.trend > 0 ? <b style={{ color: C.green }}>▲</b> : f.trend < 0 ? <b style={{ color: '#ff6a6a' }}>▼</b> : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gap: 16, alignContent: 'start' }}>
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: '.14em', marginBottom: 12 }}>🔥 RISING</div>
                  {(d.rising || []).length ? (d.rising || []).map(r => (
                    <div key={r.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0' }}>
                      <span>{r.label}</span><b style={{ color: C.green }}>+{r.trend}</b>
                    </div>
                  )) : <div style={{ color: C.dim, fontSize: 12 }}>not enough data yet</div>}
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: '.14em', marginBottom: 12 }}>💀 NO CLICKS (candidates to cut)</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(d.dead || []).length ? (d.dead || []).map(k => (
                      <span key={k} style={{ fontSize: 11, color: '#ff8a8a', background: 'rgba(255,90,90,.08)', border: '1px solid rgba(255,90,90,.2)', borderRadius: 6, padding: '3px 8px' }}>{k}</span>
                    )) : <span style={{ color: C.dim, fontSize: 12 }}>everything’s getting used</span>}
                  </div>
                </div>
                <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18 }}>
                  <div style={{ fontSize: 11, color: C.dim, letterSpacing: '.14em', marginBottom: 12 }}>📈 TICKERS PEOPLE LOOK UP</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {(d.topTickers || []).length ? (d.topTickers || []).map(t => (
                      <span key={t.sym} style={{ fontSize: 11, fontWeight: 700, color: C.amber, background: 'rgba(245,177,75,.1)', border: '1px solid rgba(245,177,75,.25)', borderRadius: 6, padding: '3px 8px' }}>{t.sym} <span style={{ color: C.dim }}>{t.n}</span></span>
                    )) : <span style={{ color: C.dim, fontSize: 12 }}>—</span>}
                  </div>
                </div>
              </div>
            </div>

            {/* self-evolving experiments */}
            <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 18, marginTop: 16 }}>
              <div style={{ fontSize: 11, color: C.dim, letterSpacing: '.14em', marginBottom: 14 }}>🧬 DECISIONS THE NET IS MAKING · live A/B tests it runs + auto-promotes</div>
              {(d.experiments || []).length ? (d.experiments || []).map(ex => (
                <div key={ex.exp} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: C.ink, marginBottom: 8 }}>{ex.exp}</div>
                  <div style={{ display: 'grid', gap: 6 }}>
                    {ex.variants.map(v => (
                      <div key={v.variant} style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 11, color: v.promoted ? C.green : C.dim }}>{v.variant}{v.promoted ? ' 👑' : ''}</span>
                        <div style={{ height: 7, background: 'rgba(255,255,255,.05)', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, v.cvr * 4)}%`, height: '100%', background: v.promoted ? C.green : C.blue, borderRadius: 4 }} />
                        </div>
                        <span style={{ fontSize: 11, color: C.dim }}>{v.cvr}% · {v.conversions}/{v.impressions}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )) : <div style={{ color: C.dim, fontSize: 12 }}>no experiments have logged data yet — the hero headline test starts as soon as visitors land.</div>}
            </div>
          </>
        )}
        <style>{`@media(max-width:760px){.sb-grid{grid-template-columns:1fr!important}}`}</style>
      </div>
    </div>
  )
}
