'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, History } from 'lucide-react'

const CYAN = '#22d3ee'
const GREEN = '#34d399'
const RED = '#f87171'
const VIOLET = '#a78bfa'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.025)', border: `1px solid ${BORDER}`, borderRadius: 16 }

type Pt = { date: string; equity: number }

function money(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function TimeMachine() {
  const [curve, setCurve] = useState<Pt[] | null>(null)
  const [idx, setIdx] = useState(0)
  const [amount, setAmount] = useState(1000)

  useEffect(() => {
    fetch('/api/track-record')
      .then((r) => r.json())
      .then((d) => {
        const eq: Pt[] = d?.equity ?? []
        if (eq.length) {
          setCurve(eq)
          setIdx(0)
        } else setCurve([])
      })
      .catch(() => setCurve([]))
  }, [])

  const replay = useMemo(() => {
    if (!curve || curve.length < 2) return null
    const start = curve[idx]
    const rebased = curve.slice(idx).map((p) => ({
      date: p.date,
      value: +((p.equity / start.equity) * amount).toFixed(2),
    }))
    const end = rebased[rebased.length - 1]
    const profit = end.value - amount
    const pct = (end.value / amount - 1) * 100
    // peak/trough for drama
    let peak = rebased[0].value
    let maxDrawdown = 0
    for (const p of rebased) {
      peak = Math.max(peak, p.value)
      maxDrawdown = Math.min(maxDrawdown, (p.value - peak) / peak)
    }
    return { rebased, end, profit, pct, startDate: start.date, maxDrawdown: maxDrawdown * 100 }
  }, [curve, idx, amount])

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 12% -8%, rgba(167,139,250,.14), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(34,211,238,.12), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Link href="/brainstock" style={{ color: MUTED, textDecoration: 'none', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={14} /> BrainStock
          </Link>
          <Link href="/fund" style={{ color: GREEN, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>● Live fund →</Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
          <History size={15} color={VIOLET} /> The time machine
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5.5vw,54px)', fontWeight: 800, letterSpacing: -1.5, margin: '8px 0 0' }}>
          What if you&apos;d followed the AI?
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: MUTED, maxWidth: 640, lineHeight: 1.6 }}>
          Pick a day in the past and an amount. We replay BrainStock&apos;s <i>actual logged calls</i> from that day forward —
          no hindsight, no cherry-picking — and show the account you&apos;d have today.
        </p>

        {curve === null && <div style={{ marginTop: 40, color: MUTED }}>Loading the timeline…</div>}

        {curve && curve.length < 2 && (
          <div style={{ ...glass, marginTop: 36, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>Not enough history yet.</div>
            <div style={{ marginTop: 8, color: MUTED, fontSize: 14 }}>
              The time machine needs a few weeks of graded calls to replay. Come back soon — the record is filling in daily.
            </div>
          </div>
        )}

        {replay && curve && (
          <>
            {/* CONTROLS */}
            <div style={{ ...glass, marginTop: 28, padding: 22 }}>
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 240px' }}>
                  <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>
                    If I&apos;d started on <b style={{ color: '#fff' }}>{replay.startDate}</b>
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={curve.length - 2}
                    value={idx}
                    onChange={(e) => setIdx(Number(e.target.value))}
                    style={{ width: '100%', marginTop: 12, accentColor: VIOLET }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED, marginTop: 4 }}>
                    <span>{curve[0].date}</span>
                    <span>today</span>
                  </div>
                </div>
                <div style={{ flex: '0 1 220px' }}>
                  <label style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>With this much</label>
                  <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                    {[100, 1000, 5000, 10000].map((a) => (
                      <button
                        key={a}
                        onClick={() => setAmount(a)}
                        style={{ fontSize: 13, fontWeight: 700, padding: '7px 12px', borderRadius: 10, cursor: 'pointer', border: `1px solid ${amount === a ? VIOLET : BORDER}`, background: amount === a ? `${VIOLET}22` : 'rgba(255,255,255,.04)', color: amount === a ? '#fff' : MUTED }}
                      >
                        ${a.toLocaleString()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* HEADLINE RESULT */}
            <div style={{ ...glass, marginTop: 16, padding: '28px 26px', textAlign: 'center', borderColor: `${replay.profit >= 0 ? GREEN : RED}44`, boxShadow: `0 0 50px ${replay.profit >= 0 ? GREEN : RED}1f` }}>
              <div style={{ fontSize: 14, color: MUTED }}>
                ${amount.toLocaleString()} on {replay.startDate} would be worth
              </div>
              <div style={{ fontSize: 'clamp(38px,8vw,68px)', fontWeight: 800, letterSpacing: -2, lineHeight: 1.05, marginTop: 6, color: replay.profit >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>
                ${money(replay.end.value)}
              </div>
              <div style={{ marginTop: 8, fontSize: 16, fontWeight: 700, color: replay.profit >= 0 ? GREEN : RED }}>
                {replay.profit >= 0 ? '▲ +' : '▼ '}${money(Math.abs(replay.profit))} ({replay.pct >= 0 ? '+' : ''}{replay.pct.toFixed(1)}%)
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>
                worst dip along the way: {replay.maxDrawdown.toFixed(1)}%
              </div>
            </div>

            {/* CHART */}
            <div style={{ ...glass, marginTop: 16, padding: 20 }}>
              <div style={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={replay.rebased} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="tm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={replay.profit >= 0 ? GREEN : RED} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={replay.profit >= 0 ? GREEN : RED} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.06)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={44} />
                    <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${Number(v) >= 1000 ? (Number(v) / 1000).toFixed(1) + 'k' : Number(v).toFixed(0)}`} width={52} />
                    <Tooltip contentStyle={{ background: 'rgba(10,15,26,.96)', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12 }} labelStyle={{ color: MUTED }} formatter={(v) => [`$${money(Number(v))}`, 'Account']} />
                    <ReferenceLine y={amount} stroke={MUTED} strokeDasharray="4 4" />
                    <Area type="monotone" dataKey="value" stroke={replay.profit >= 0 ? GREEN : RED} strokeWidth={2} fill="url(#tm)" isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ marginTop: 16, textAlign: 'center' }}>
              <Link href="/predict" style={{ display: 'inline-block', fontSize: 14, fontWeight: 700, color: '#07101a', background: `linear-gradient(90deg, ${GREEN}, ${CYAN})`, padding: '12px 22px', borderRadius: 100, textDecoration: 'none' }}>
                Think you can do better? Beat the AI →
              </Link>
            </div>
          </>
        )}

        <p style={{ marginTop: 30, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          Replay of the public &quot;Follow-the-AI&quot; equity curve — equal-weight each day&apos;s graded Bull Board calls, no leverage,
          rebased to your start date and amount. Past performance does not predict future results. Educational — not financial advice.
        </p>
      </div>
    </div>
  )
}
