'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, Radio } from 'lucide-react'

const CYAN = '#22d3ee'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.025)', border: `1px solid ${BORDER}`, borderRadius: 16 }

type OpenPos = {
  ticker: string
  trade_date: string
  resolve_date: string
  start: number
  current: number | null
  target: number
  unrealized: number | null
  daysHeld: number
  winning: boolean | null
}
type Realized = {
  total: number
  wins: number
  winRate: number
  avgReturn: number
  totalReturn: number
  equity: number
  curve: { date: string; equity: number }[]
}
type Book = {
  openCount: number
  pricedCount: number
  avgUnrealized: number
  winnersNow: number
  losersNow: number
  liveMark: number
  asOf: string
}
type Data = { ready: boolean; realized: Realized | null; open: OpenPos[]; book: Book | null }

export default function Fund() {
  const [d, setD] = useState<Data | null>(null)
  const [pulse, setPulse] = useState(false)
  const first = useRef(true)

  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/fund')
        .then((r) => r.json())
        .then((j: Data) => {
          if (!alive) return
          setD(j)
          if (!first.current) {
            setPulse(true)
            setTimeout(() => alive && setPulse(false), 700)
          }
          first.current = false
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 45000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const book = d?.book
  const realized = d?.realized

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 12% -8%, rgba(34,211,238,.12), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(167,139,250,.14), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`@keyframes fundpulse{0%{box-shadow:0 0 0 0 rgba(52,211,153,.45)}100%{box-shadow:0 0 0 18px rgba(52,211,153,0)}}
      @keyframes liveblink{0%,100%{opacity:1}50%{opacity:.3}}
      @media (max-width:640px){.fund-stats{grid-template-columns:1fr 1fr !important}}`}</style>

      <div style={{ maxWidth: 960, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Link href="/brainstock" style={{ color: MUTED, textDecoration: 'none', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={14} /> BrainStock
          </Link>
          <div style={{ display: 'flex', gap: 16 }}>
            <Link href="/time-machine" style={{ color: '#a78bfa', textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              Time machine →
            </Link>
            <Link href="/brainstock/track-record" style={{ color: CYAN, textDecoration: 'none', fontSize: 13, fontWeight: 600 }}>
              Track record →
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
          <Radio size={15} color={GREEN} style={{ animation: 'liveblink 1.4s ease-in-out infinite' }} /> Live · marked to real prices
        </div>
        <h1 style={{ fontSize: 'clamp(32px,5.5vw,54px)', fontWeight: 800, letterSpacing: -1.5, margin: '8px 0 0' }}>
          The AI puts its money where its mouth is.
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: MUTED, maxWidth: 640, lineHeight: 1.6 }}>
          BrainStock allocates a public $10,000 across its own Bull Board calls and holds them. This is the live book —
          every open position marked to its real current price, updating while you watch. No do-overs, no hiding.
        </p>

        {!d && <div style={{ marginTop: 40, color: MUTED }}>Loading the book…</div>}

        {d && !d.ready && (
          <div style={{ ...glass, marginTop: 36, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 700 }}>The fund opens with the first calls.</div>
            <div style={{ marginTop: 8, color: MUTED, fontSize: 14 }}>
              BrainStock posts its Bull Board every market morning and allocates into it. Check back at the open.
            </div>
          </div>
        )}

        {d?.ready && (
          <>
            {/* ---- Live marked equity hero ---- */}
            <div
              style={{
                ...glass,
                marginTop: 30,
                padding: '26px 26px',
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'baseline',
                gap: 18,
                animation: pulse ? 'fundpulse .7s ease-out' : undefined,
                borderRadius: 20,
              }}
            >
              <div>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>Live book value</div>
                <div style={{ fontSize: 'clamp(34px,7vw,60px)', fontWeight: 800, letterSpacing: -1.5, fontVariantNumeric: 'tabular-nums', lineHeight: 1.05 }}>
                  ${(book?.liveMark ?? 10000).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>Open book P&amp;L</div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    fontVariantNumeric: 'tabular-nums',
                    color: (book?.avgUnrealized ?? 0) >= 0 ? GREEN : RED,
                  }}
                >
                  {(book?.avgUnrealized ?? 0) >= 0 ? '+' : ''}
                  {book?.avgUnrealized ?? 0}%
                </div>
                <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
                  {book?.winnersNow ?? 0} green · {book?.losersNow ?? 0} red · {book?.openCount ?? 0} open
                </div>
              </div>
            </div>

            {/* ---- Realized stats ---- */}
            {realized && (
              <div className="fund-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 16 }}>
                <Stat label="Realized return" value={`${realized.totalReturn >= 0 ? '+' : ''}${realized.totalReturn}%`} color={realized.totalReturn >= 0 ? GREEN : RED} />
                <Stat label="Win rate" value={`${realized.winRate}%`} color={realized.winRate >= 50 ? GREEN : RED} />
                <Stat label="Calls graded" value={String(realized.total)} color="#e7ecf5" />
                <Stat label="Avg / call" value={`${realized.avgReturn >= 0 ? '+' : ''}${realized.avgReturn}%`} color={realized.avgReturn >= 0 ? GREEN : RED} />
              </div>
            )}

            {/* ---- Realized equity curve ---- */}
            {realized && realized.curve.length > 1 && (
              <div style={{ ...glass, marginTop: 16, padding: 20 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 10 }}>
                  Realized equity — closed calls only
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={realized.curve} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="fundeq" x1="0" y1="0" x2="0" y2="1">
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
                      <Area type="monotone" dataKey="equity" stroke={CYAN} strokeWidth={2} fill="url(#fundeq)" isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* ---- Open positions ---- */}
            <div style={{ ...glass, marginTop: 16, padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>Open positions — live</div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: GREEN, fontWeight: 700 }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: GREEN, animation: 'liveblink 1.4s ease-in-out infinite' }} /> LIVE
                </div>
              </div>

              {d.open.length === 0 ? (
                <div style={{ color: MUTED, fontSize: 14, padding: '8px 0' }}>No open positions right now — the book is flat until the next Bull Board.</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 90px 60px', gap: 10, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: 0.8, color: MUTED, padding: '0 4px 8px' }}>
                    <span>Ticker</span>
                    <span>Entry</span>
                    <span>Now</span>
                    <span style={{ textAlign: 'right' }}>Unreal.</span>
                    <span style={{ textAlign: 'right' }}>Held</span>
                  </div>
                  {d.open.map((o) => {
                    const up = (o.unrealized ?? 0) >= 0
                    return (
                      <div
                        key={`${o.ticker}-${o.trade_date}`}
                        style={{ display: 'grid', gridTemplateColumns: '70px 1fr 1fr 90px 60px', gap: 10, alignItems: 'center', fontSize: 14, padding: '9px 4px', borderTop: `1px solid ${BORDER}` }}
                      >
                        <span style={{ fontWeight: 700 }}>${o.ticker}</span>
                        <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>${o.start.toFixed(2)}</span>
                        <span style={{ fontVariantNumeric: 'tabular-nums', color: o.current == null ? MUTED : up ? GREEN : RED }}>
                          {o.current == null ? '—' : `$${o.current.toFixed(2)}`}
                        </span>
                        <span style={{ textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: o.unrealized == null ? MUTED : up ? GREEN : RED }}>
                          {o.unrealized == null ? '—' : `${up ? '+' : ''}${o.unrealized}%`}
                        </span>
                        <span style={{ textAlign: 'right', color: MUTED, fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{o.daysHeld}d</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        <p style={{ marginTop: 30, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          The book equal-weights each day&apos;s Bull Board calls, no leverage. Open positions are marked to the latest available
          close; &quot;live book value&quot; carries realized equity forward and applies the open book&apos;s current mark. Educational — not financial advice.
        </p>
      </div>
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
