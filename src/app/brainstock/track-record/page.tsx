'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowRight } from 'lucide-react'

/* ── palette — matches the YN Finance homepage ──────────────────────────────── */
const INK = '#0a0a0c'
const BONE = '#f4f2ec'
const PAPER = '#fcfbf8'
const ACCENT = '#1f3bff'
const GREEN = '#0a9d63'
const RED = '#e5484d'
const SUB = 'rgba(10,10,12,.62)'
const LINE = 'rgba(10,10,12,.1)'

const card: CSSProperties = { background: PAPER, border: `1px solid ${LINE}`, borderRadius: 14 }

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

function useInView<T extends HTMLElement>(a = 0.18) {
  const ref = useRef<T>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: a, rootMargin: '0px 0px -6% 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [a])
  return { ref, seen }
}
function Reveal({ children, delay = 0, y = 20, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return <div ref={ref} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}

export default function TrackRecord() {
  const [d, setD] = useState<Data | null>(null)
  useEffect(() => {
    fetch('/api/track-record').then((r) => r.json()).then(setD).catch(() => {})
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes tr-blink{0%,100%{opacity:1}50%{opacity:.25}}
        .tr-disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-.03em;line-height:1}
        .tr-cta{transition:transform .15s ease}.tr-cta:hover{transform:translateY(-2px)}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        @media (max-width:640px){ .tr-resp{grid-template-columns:1fr 1fr !important} .tr-resp2{grid-template-columns:1fr !important} }
      `}</style>

      {/* ── top bar ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,242,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 920, margin: '0 auto', padding: '0 clamp(18px,4vw,28px)', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/brainstock" style={{ color: INK, textDecoration: 'none', fontSize: 14, fontWeight: 600, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={14} /> BrainStock
          </Link>
          <Link href="/fund" style={{ color: GREEN, textDecoration: 'none', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, animation: 'tr-blink 1.4s infinite' }} /> Live fund →
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(48px,8vw,80px) clamp(18px,4vw,28px) 80px' }}>
        {/* ── hero ── */}
        <Reveal>
          <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: ACCENT, marginBottom: 16 }}>// THE RECEIPTS</div>
          <h1 className="tr-disp" style={{ fontSize: 'clamp(2.2rem,5.4vw,3.6rem)', margin: 0, maxWidth: 720 }}>
            BrainStock track record
          </h1>
          <p style={{ marginTop: 16, fontSize: '1.08rem', color: SUB, maxWidth: 600, lineHeight: 1.6 }}>
            Every Bull Board call, graded against real closing prices five trading days later. No cherry-picking — wins and losses, in the open.
          </p>
        </Reveal>

        {!d && <div style={{ marginTop: 44, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 13, color: SUB }}>Loading…</div>}

        {d && !d.ready && (
          <Reveal delay={80}>
            <div style={{ ...card, marginTop: 40, padding: '44px 28px', textAlign: 'center' }}>
              <div className="tr-disp" style={{ fontSize: '1.3rem' }}>The first calls are still in flight.</div>
              <div style={{ marginTop: 10, color: SUB, fontSize: 14.5, lineHeight: 1.6, maxWidth: 480, marginInline: 'auto' }}>
                {d.openCount ? `${d.openCount} calls` : 'Calls'} are tracking now and resolve five trading days after they post. Check back soon — the scoreboard fills itself.
              </div>
              <Link href="/brainstock" className="tr-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 24, background: INK, color: PAPER, padding: '12px 22px', fontSize: 14, fontWeight: 700, borderRadius: 9, textDecoration: 'none' }}>Run a forecast <ArrowRight size={15} /></Link>
            </div>
          </Reveal>
        )}

        {d?.ready && d.stats && (
          <>
            {/* ── headline stats ── */}
            <Reveal delay={80}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginTop: 40 }} className="tr-resp">
                <Stat label="Win rate" value={`${d.stats.winRate}%`} color={d.stats.winRate >= 50 ? GREEN : RED} />
                <Stat label="Calls graded" value={String(d.stats.total)} />
                <Stat label="Avg return / call" value={`${d.stats.avgReturn >= 0 ? '+' : ''}${d.stats.avgReturn}%`} color={d.stats.avgReturn >= 0 ? GREEN : RED} />
                <Stat label="Follow-the-AI" value={`${d.stats.totalReturn >= 0 ? '+' : ''}${d.stats.totalReturn}%`} color={d.stats.totalReturn >= 0 ? GREEN : RED} />
              </div>
            </Reveal>

            {/* ── equity curve ── */}
            <Reveal delay={140}>
              <div style={{ ...card, marginTop: 16, padding: 22 }}>
                <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: SUB, marginBottom: 12 }}>
                  $10,000 following the AI&apos;s calls
                </div>
                <div style={{ height: 260, margin: '0 -6px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={d.equity} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} />
                          <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(10,10,12,.06)" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: SUB, fontSize: 11, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={40} />
                      <YAxis tick={{ fill: SUB, fontSize: 11, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(1)}k`} width={52} />
                      <Tooltip
                        contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 12, fontFamily: 'var(--font-mono),ui-monospace,monospace' }}
                        labelStyle={{ color: SUB }}
                        formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Equity']}
                      />
                      <Area type="monotone" dataKey="equity" stroke={ACCENT} strokeWidth={2} fill="url(#eq)" isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </Reveal>

            {/* ── best / worst ── */}
            <Reveal delay={200}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }} className="tr-resp2">
                <CallList title="Best calls" calls={d.best || []} />
                <CallList title="Worst calls" calls={d.worst || []} />
              </div>
            </Reveal>

            {/* ── recent ── */}
            {d.recent && d.recent.length > 0 && (
              <Reveal delay={240}>
                <div style={{ ...card, marginTop: 16, padding: 22 }}>
                  <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: SUB, marginBottom: 14 }}>Recent graded calls</div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {d.recent.map((c, i) => (
                      <Row key={i} c={c} divider={i > 0} />
                    ))}
                  </div>
                </div>
              </Reveal>
            )}
          </>
        )}

        {/* ── next step ── */}
        <Reveal delay={120}>
          <div style={{ ...card, background: PAPER, marginTop: 32, padding: 24, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div className="tr-disp" style={{ fontSize: '1.2rem' }}>See it call the next one.</div>
              <div style={{ marginTop: 6, fontSize: 14, color: SUB }}>Run a live forecast, then watch it land on this board.</div>
            </div>
            <Link href="/brainstock" className="tr-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: PAPER, padding: '13px 22px', fontSize: 14, fontWeight: 700, borderRadius: 9, textDecoration: 'none', whiteSpace: 'nowrap' }}>Back to BrainStock <ArrowRight size={15} /></Link>
          </div>
        </Reveal>

        <p style={{ marginTop: 30, fontSize: 12, color: SUB, lineHeight: 1.6 }}>
          A call &quot;hits&quot; if the close five trading days later is above the price when the call posted. Equal-weight, no leverage. Educational — not financial advice.
        </p>
      </main>
    </div>
  )
}

function Stat({ label, value, color = INK }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ ...card, padding: '16px 18px' }}>
      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.1em', color: SUB }}>{label}</div>
      <div className="tr-disp" style={{ marginTop: 6, fontSize: 26, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

function CallList({ title, calls }: { title: string; calls: Slim[] }) {
  return (
    <div style={{ ...card, padding: 20 }}>
      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, textTransform: 'uppercase', letterSpacing: '.12em', color: SUB, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {calls.map((c, i) => (
          <Row key={i} c={c} divider={i > 0} />
        ))}
        {!calls.length && <div style={{ color: SUB, fontSize: 13 }}>—</div>}
      </div>
    </div>
  )
}

function Row({ c, divider }: { c: Slim; divider?: boolean }) {
  const win = c.status === 'hit'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '9px 0', borderTop: divider ? `1px solid ${LINE}` : undefined }}>
      <span style={{ fontWeight: 700, width: 64 }}>${c.ticker}</span>
      <span style={{ color: SUB, fontSize: 12.5, flex: 1, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontVariantNumeric: 'tabular-nums' }}>
        ${c.start.toFixed(2)}{c.actual != null ? ` → $${c.actual.toFixed(2)}` : ''}
      </span>
      <span style={{ fontWeight: 700, color: c.ret >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--font-mono),ui-monospace,monospace', width: 70, textAlign: 'right' }}>
        {c.ret >= 0 ? '+' : ''}{c.ret}%
      </span>
      <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: win ? GREEN : RED, width: 40, textAlign: 'right' }}>{win ? 'HIT' : 'MISS'}</span>
    </div>
  )
}
