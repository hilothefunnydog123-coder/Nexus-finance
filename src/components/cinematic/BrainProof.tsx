'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const AMBER = '#fbbf24'
const MUTED = '#8a93a8'
const FAINT = '#46566e'
const BORDER = 'rgba(255,255,255,.08)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.022)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(10px)' }

type Bucket = { label: string; total: number; wins: number; winRate: number | null }
type Learn = { t: string; trained: number; loss: number; acc: number }
type Proof = { ready: boolean; overall: { total: number; wins: number; winRate: number | null }; buckets: Bucket[]; learning: Learn[] }

export default function BrainProof() {
  const [d, setD] = useState<Proof | null>(null)
  useEffect(() => { fetch('/api/proof').then((r) => r.json()).then(setD).catch(() => {}) }, [])
  if (!d || !d.ready) return null

  const maxWin = Math.max(...d.buckets.map((b) => b.winRate ?? 0), 60)

  return (
    <section style={{ marginTop: 26 }}>
      <div style={{ ...glass, padding: 'clamp(18px,2.4vw,28px)', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${GREEN}66, transparent)` }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.2em', color: GREEN }}>// PROOF — IT WORKS, AND IT&apos;S IMPROVING</div>
          {d.overall.winRate != null && <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED }}>{d.overall.total} calls graded · {d.overall.winRate}% overall</div>}
        </div>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, maxWidth: 680, marginBottom: 18 }}>
          The receipts. Win rate split by the net&apos;s conviction (the bigger its predicted move, the more it&apos;s betting) — and the live learning curve as it trains on graded outcomes.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 18 }} className="bp-grid">
          {/* conviction buckets */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 14 }}>WIN RATE BY CONVICTION</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.buckets.map((b) => {
                const wr = b.winRate
                const c = wr == null ? FAINT : wr >= 55 ? GREEN : wr >= 50 ? AMBER : RED
                return (
                  <div key={b.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 48, fontFamily: 'var(--font-mono)', fontSize: 11, color: MUTED }}>{b.label}</span>
                    <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${wr == null ? 0 : (wr / maxWin) * 100}%`, background: c, borderRadius: 3, boxShadow: `0 0 10px ${c}55`, transition: 'width 1s cubic-bezier(.16,1,.3,1)' }} />
                    </div>
                    <span style={{ width: 78, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: c }}>{wr == null ? `— · ${b.total}` : `${wr}% · ${b.total}`}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 12, fontSize: 11.5, color: FAINT, lineHeight: 1.5 }}>n shown after each rate. A rising line down this list = the net knows when it knows.</div>
          </div>

          {/* learning curve */}
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 14 }}>LEARNING CURVE · LOSS ↓ / ACCURACY ↑</div>
            {d.learning.length > 1 ? (
              <div style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={d.learning} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
                    <defs><linearGradient id="bp-loss" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VIOLET} stopOpacity={0.3} /><stop offset="100%" stopColor={VIOLET} stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="t" tick={{ fill: FAINT, fontSize: 9.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={40} />
                    <YAxis yAxisId="l" tick={{ fill: FAINT, fontSize: 9.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} width={38} />
                    <YAxis yAxisId="a" orientation="right" domain={[40, 70]} hide />
                    <Tooltip contentStyle={{ background: 'rgba(8,10,16,.96)', border: `1px solid ${BORDER}`, fontSize: 11, fontFamily: 'var(--font-mono)' }} labelStyle={{ color: MUTED }} />
                    <Area yAxisId="l" type="monotone" dataKey="loss" stroke={VIOLET} strokeWidth={2} fill="url(#bp-loss)" isAnimationActive={false} name="loss" />
                    <Line yAxisId="a" type="monotone" dataKey="acc" stroke={GREEN} strokeWidth={2} dot={false} isAnimationActive={false} name="dir acc %" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div style={{ ...glass, padding: '28px 18px', textAlign: 'center', height: 200, display: 'grid', placeItems: 'center' }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: AMBER }}>CURVE FILLING IN</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 8, maxWidth: 240 }}>Each nightly training run plots a point. The loss line drops as it learns — come back as predictions resolve.</div>
                </div>
              </div>
            )}
            <div style={{ marginTop: 10, display: 'flex', gap: 14, fontSize: 11, color: MUTED }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 3, background: VIOLET }} /> loss (down = better)</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}><span style={{ width: 10, height: 3, background: GREEN }} /> accuracy</span>
            </div>
          </div>
        </div>
      </div>
      <style>{`@media (max-width:820px){.bp-grid{grid-template-columns:1fr !important}}`}</style>
    </section>
  )
}
