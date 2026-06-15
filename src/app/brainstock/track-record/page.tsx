'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, TrendingUp } from 'lucide-react'

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.025)', border: `1px solid ${BORDER}`, borderRadius: 16 }

type Slim = { ticker: string; trade_date: string; start: number; actual: number | null; ret: number; status: string }
type Data = {
  ready: boolean
  openCount?: number
  stats: { total: number; wins: number; winRate: number; avgReturn: number; totalReturn: number; endingEquity: number } | null
  equity: { date: string; equity: number }[]
  best?: Slim[]
  worst?: Slim[]
  recent?: Slim[]
}

export default function TrackRecord() {
  const [d, setD] = useState<Data | null>(null)
  useEffect(() => {
    fetch('/api/track-record').then((r) => r.json()).then(setD).catch(() => {})
  }, [])

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 12% -8%, rgba(34,197,94,.10), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(167,139,250,.14), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div style={{ maxWidth: 920, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Link href="/brainstock" style={{ color: MUTED, textDecoration: 'none', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={14} /> BrainStock
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
          <TrendingUp size={15} color={GREEN} /> The receipts
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5.5vw,52px)', fontWeight: 800, letterSpacing: -1.5, margin: '8px 0 0' }}>
          BrainStock track record
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: MUTED, maxWidth: 600, lineHeight: 1.6 }}>
          Every Bull Board call, graded against real closing prices five trading days later. No cherry-picking — wins and losses.
        </p>

        {!d && <div style={{ marginTop: 40, color: MUTED }}>Loading…</div>}

        {d && !d.ready && (
          <div style={{ ...glass, marginTop: 36, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>The first calls are still in flight.</div>
            <div style={{ marginTop: 8, color: MUTED, fontSize: 14 }}>
              {d.openCount ? `${d.openCount} calls` : 'Calls'} are tracking now and resolve five trading days after they post. Check back soon — the scoreboard fills itself.
            </div>
          </div>
        )}

        {d?.ready && d.stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 32 }} className="tr-resp">
              <Stat label="Win rate" value={`${d.stats.winRate}%`} color={d.stats.winRate >= 50 ? GREEN : RED} />
              <Stat label="Calls graded" value={String(d.stats.total)} color="#e7ecf5" />
              <Stat label="Avg return / call" value={`${d.stats.avgReturn >= 0 ? '+' : ''}${d.stats.avgReturn}%`} color={d.stats.avgReturn >= 0 ? GREEN : RED} />
              <Stat label="Follow-the-AI" value={`${d.stats.totalReturn >= 0 ? '+' : ''}${d.stats.totalReturn}%`} color={d.stats.totalReturn >= 0 ? GREEN : RED} />
            </div>

            <div style={{ ...glass, marginTop: 16, padding: 20 }}>
              <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 10 }}>
                $10,000 following the AI&apos;s calls
              </div>
              <div style={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={d.equity} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={CYAN} stopOpacity={0.32} />
                        <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.06)" strokeDasharray="3 6" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={40} />
                    <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`} width={52} />
                    <Tooltip
                      contentStyle={{ background: 'rgba(10,15,26,.96)', border: `1px solid ${BORDER}`, borderRadius: 10, fontSize: 12 }}
                      labelStyle={{ color: MUTED }}
                      formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Equity']}
                    />
                    <Area type="monotone" dataKey="equity" stroke={CYAN} strokeWidth={2} fill="url(#eq)" isAnimationActive={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }} className="tr-resp2">
              <CallList title="Best calls" calls={d.best || []} />
              <CallList title="Worst calls" calls={d.worst || []} />
            </div>

            {d.recent && d.recent.length > 0 && (
              <div style={{ ...glass, marginTop: 16, padding: 20 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 12 }}>Recent graded calls</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {d.recent.map((c, i) => (
                    <Row key={i} c={c} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        <p style={{ marginTop: 30, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          A call &quot;hits&quot; if the close five trading days later is above the price when the call posted. Equal-weight, no leverage. Educational — not financial advice.
        </p>
      </div>

      <style>{`@media (max-width:640px){ .tr-resp{grid-template-columns:1fr 1fr !important} .tr-resp2{grid-template-columns:1fr !important} }`}</style>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...glass, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function CallList({ title, calls }: { title: string; calls: Slim[] }) {
  return (
    <div style={{ ...glass, padding: 18 }}>
      <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 10 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {calls.map((c, i) => (
          <Row key={i} c={c} />
        ))}
        {!calls.length && <div style={{ color: MUTED, fontSize: 13 }}>—</div>}
      </div>
    </div>
  )
}

function Row({ c }: { c: Slim }) {
  const win = c.status === 'hit'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14 }}>
      <span style={{ fontWeight: 700, width: 64 }}>${c.ticker}</span>
      <span style={{ color: MUTED, fontSize: 12, flex: 1, fontVariantNumeric: 'tabular-nums' }}>
        ${c.start.toFixed(2)}{c.actual != null ? ` → $${c.actual.toFixed(2)}` : ''}
      </span>
      <span style={{ fontWeight: 700, color: c.ret >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums', width: 70, textAlign: 'right' }}>
        {c.ret >= 0 ? '+' : ''}{c.ret}%
      </span>
      <span style={{ fontSize: 11, fontWeight: 700, color: win ? GREEN : RED, width: 36, textAlign: 'right' }}>{win ? 'HIT' : 'MISS'}</span>
    </div>
  )
}
