'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowRight, ArrowUpRight, Loader2 } from 'lucide-react'
import { saveToHistory } from '@/lib/history'
import BrainMemory from '@/components/brain/BrainMemory'
import NeuralXray from '@/components/cinematic/NeuralXray'
import BrainProof from '@/components/cinematic/BrainProof'
import { FEATURE_NAMES } from '@/lib/nn'

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

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'SPY', 'PLTR', 'AMD']

type Point = { date: string; price: number }
type Metrics = { samples: number; horizon: number; rmse_model: number; rmse_naive: number; mae_model: number; mae_naive: number; skill_score: number; directional_accuracy: number }
type Forecast = { ticker: string; history: Point[]; forecast: Point[]; metrics: Metrics; disclaimer: string; engine?: 'neural-net' | 'baseline'; features?: number[]; trace?: number[][] | null }
type Vitals = { ready: boolean; arch: string; trained: number; dirAcc: number; avgLoss: number }
type RecordStats = { ready: boolean; stats: { total: number; wins: number; winRate: number; avgReturn: number; totalReturn: number; endingEquity: number } | null }

/* ── motion primitives (gated behind prefers-reduced-motion) ────────────────── */
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
function Reveal({ children, delay = 0, y = 22, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return <div ref={ref} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}
function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.5)
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    const t0 = performance.now(); let raf = 0
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 1200); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return <span ref={ref}>{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

/* mono kicker — e.g. "// THE FORECASTER" */
function Kicker({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.14em', textTransform: 'uppercase', color: ACCENT, ...style }}>{children}</div>
}

export default function BrainStock() {
  const [ticker, setTicker] = useState('AAPL')
  const [horizon, setHorizon] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Forecast | null>(null)
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [record, setRecord] = useState<RecordStats | null>(null)

  useEffect(() => { fetch('/api/nn').then((r) => r.json()).then(setVitals).catch(() => {}) }, [])
  useEffect(() => { fetch('/api/track-record').then((r) => r.json()).then(setRecord).catch(() => {}) }, [])

  const run = async (sym: string, h = horizon, save = true) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: sym, horizon: h, source: 'forecast' }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      const fc = json as Forecast
      setData(fc)
      // Save this forecast to the signed-in user's history (no-op if signed out).
      if (save) try {
        const hist = fc.history
        const px = hist[hist.length - 1]?.price ?? 0
        const target = fc.forecast[fc.forecast.length - 1]?.price ?? 0
        const pct = px ? ((target - px) / px) * 100 : 0
        saveToHistory({
          kind: 'forecast',
          ticker: fc.ticker,
          title: `${fc.ticker} ${h}-day forecast`,
          summary: `${pct >= 0 ? '▲' : '▼'} ${Math.abs(pct).toFixed(2)}% to $${target.toFixed(2)} over ${h} day${h === 1 ? '' : 's'}${fc.engine ? ` · ${fc.engine === 'neural-net' ? 'neural net' : 'baseline'}` : ''}`,
          rating: pct >= 0 ? 'BULL' : 'BEAR',
          confidence: fc.metrics?.directional_accuracy != null ? Math.round(fc.metrics.directional_accuracy * 100) : null,
          price: px,
          target,
          pct,
          payload: { horizon: h, engine: fc.engine ?? null, metrics: fc.metrics ?? null },
        })
      } catch {}
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't reach the forecast API.") } finally { setLoading(false) }
  }
  const submit = (e?: FormEvent) => { e?.preventDefault(); const t = ticker.trim().toUpperCase(); if (t) run(t) }
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    const sym = t && /^[A-Za-z0-9.\-]{1,8}$/.test(t) ? t.toUpperCase() : 'AAPL'
    setTicker(sym); run(sym, horizon, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    const z = 1.96, rmse = data.metrics.rmse_model || 0
    const hist = data.history.map((p) => ({ date: p.date, history: p.price as number | null, forecast: null as number | null, lo: null as number | null, band: null as number | null }))
    const last = data.history[data.history.length - 1]
    const fc = data.forecast.map((p, i) => { const half = z * rmse * Math.sqrt(i + 1); return { date: p.date, history: null as number | null, forecast: p.price as number | null, lo: +(p.price - half).toFixed(2) as number | null, band: +(2 * half).toFixed(2) as number | null } })
    if (last && fc.length) hist[hist.length - 1] = { ...hist[hist.length - 1], forecast: last.price, lo: last.price, band: 0 }
    return [...hist, ...fc]
  }, [data])

  const m = data?.metrics
  const lastPrice = data?.history[data.history.length - 1]?.price ?? 0
  const nowDate = data?.history[data.history.length - 1]?.date
  const tgt = data?.forecast[data.forecast.length - 1]?.price ?? 0
  const move = lastPrice ? ((tgt - lastPrice) / lastPrice) * 100 : 0
  const isNN = data?.engine === 'neural-net'
  const rec = record?.ready ? record.stats : null

  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes bs-blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes bs-spin{to{transform:rotate(360deg)}}
        .bs-spin{animation:bs-spin 1s linear infinite}
        .bs-disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-.03em;line-height:1}
        .bs-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
        .bs-card:hover{transform:translateY(-3px);border-color:rgba(31,59,255,.4);box-shadow:0 18px 40px rgba(10,10,12,.07)}
        .bs-cta{transition:transform .15s ease, box-shadow .2s ease}.bs-cta:hover{transform:translateY(-2px)}
        .bs-chip{transition:all .15s ease;cursor:pointer}
        @media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
        @media (max-width:900px){.bs-result{grid-template-columns:1fr !important}}
        @media (max-width:760px){.bs-explore{grid-template-columns:1fr 1fr !important}}
      `}</style>

      {/* ── top bar ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,242,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(18px,4vw,34px)', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 28, height: 28, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12, borderRadius: 7 }}>YN</span>
            <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase', color: INK }}>BrainStock</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, color: GREEN }}><span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, animation: 'bs-blink 1.4s infinite' }} /> LIVE</span>
          </div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 600, color: INK, textDecoration: 'none' }}><ArrowLeft size={14} /> YN Finance</Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1 }}>
        {/* ════════ HERO — orient the visitor ════════ */}
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: '0 clamp(18px,4vw,34px)' }}>
          <div style={{ paddingTop: 'clamp(56px,9vw,104px)', paddingBottom: 'clamp(36px,6vw,68px)' }}>
            <Reveal><Kicker style={{ marginBottom: 24 }}>// THE FORECASTER</Kicker></Reveal>
            <Reveal delay={70}>
              <h1 className="bs-disp" style={{ fontSize: 'clamp(2.5rem,7vw,5.6rem)', maxWidth: 940, margin: 0 }}>
                A neural net calls the market —<br /><span style={{ color: ACCENT }}>and grades itself in public.</span>
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p style={{ fontSize: 'clamp(1.04rem,1.7vw,1.3rem)', lineHeight: 1.55, color: SUB, maxWidth: 620, marginTop: 26 }}>
                BrainStock forecasts hundreds of stocks every market morning, then scores every call against real closing prices — a real backpropagation network building an <b style={{ color: INK }}>un-cherry-picked track record.</b>
              </p>
            </Reveal>
            <Reveal delay={260}>
              <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', marginTop: 32 }}>
                <a href="#forecast" className="bs-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: INK, color: PAPER, padding: '15px 26px', fontSize: 15, fontWeight: 700, borderRadius: 9, textDecoration: 'none', boxShadow: '0 10px 30px rgba(10,10,12,.12)' }}>Run a forecast <ArrowRight size={17} /></a>
                <Link href="/brainstock/track-record" className="bs-cta" style={{ fontSize: 15, fontWeight: 600, color: INK, textDecoration: 'none', padding: '15px 4px' }}>See the track record →</Link>
              </div>
            </Reveal>

            {/* brain vitals */}
            <Reveal delay={360}>
              <div style={{ marginTop: 60, borderTop: `1px solid ${LINE}`, paddingTop: 26, display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,6vw,60px)' }}>
                <Vital label="Architecture" value={vitals?.arch ?? '11→16→12→1'} mono />
                <Vital label="Examples trained" value={vitals?.ready ? <CountUp to={vitals.trained} /> : '—'} />
                <Vital label="Directional acc." value={vitals?.ready ? <CountUp to={vitals.dirAcc} decimals={1} suffix="%" /> : 'warming up'} color={vitals?.ready ? GREEN : SUB} />
                <Vital label="Status" value={vitals?.ready ? 'LEARNING' : 'BOOTSTRAPPING'} mono color={vitals?.ready ? GREEN : ACCENT} />
              </div>
            </Reveal>
          </div>
        </section>

        {/* ════════ STEP 1 — today's call (the console) ════════ */}
        <section id="forecast" style={{ background: PAPER, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, scrollMarginTop: 70 }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(54px,8vw,96px) clamp(18px,4vw,34px)' }}>
            <Reveal>
              <Kicker style={{ marginBottom: 16 }}>// STEP 1 · TODAY'S CALL</Kicker>
              <h2 className="bs-disp" style={{ fontSize: 'clamp(1.7rem,3.8vw,2.9rem)', maxWidth: 720, margin: '0 0 14px' }}>Point it at any ticker. Watch it forecast.</h2>
              <p style={{ fontSize: '1.08rem', color: SUB, maxWidth: 560, lineHeight: 1.55 }}>This is the same engine that runs the morning board — live, on demand, for any name you type.</p>
            </Reveal>

            <Reveal delay={120} style={{ marginTop: 36 }}>
              <form onSubmit={submit} style={{ ...card, background: BONE, padding: 'clamp(16px,2.4vw,22px)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', borderRight: `1px solid ${LINE}`, paddingRight: 14 }}>
                  <span style={{ color: ACCENT, fontWeight: 700, fontFamily: 'var(--font-mono),ui-monospace,monospace' }}>$</span>
                  <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" spellCheck={false} maxLength={8}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: INK, fontSize: 22, letterSpacing: 2, fontWeight: 700, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} />
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px' }}>
                  <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, color: SUB, whiteSpace: 'nowrap' }}>HORIZON</span>
                  <input type="range" min={1} max={20} value={horizon} onChange={(e) => { const h = Number(e.target.value); setHorizon(h); if (data) run(data.ticker, h) }} style={{ flex: 1, accentColor: ACCENT }} />
                  <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 13, color: INK, width: 54, textAlign: 'right' }}>{horizon}d</span>
                </div>
                <button type="submit" disabled={loading} className="bs-cta"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: INK, color: PAPER, padding: '15px 28px', fontSize: 15, fontWeight: 700, borderRadius: 9, cursor: loading ? 'wait' : 'pointer', boxShadow: '0 10px 30px rgba(10,10,12,.12)' }}>
                  {loading ? <><Loader2 size={16} className="bs-spin" /> Forecasting…</> : <>Run forecast <ArrowUpRight size={16} /></>}
                </button>
              </form>
            </Reveal>
            <Reveal delay={180} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, color: SUB }}>TRY</span>
              {POPULAR.map((s) => (
                <button key={s} className="bs-chip" onClick={() => { setTicker(s); run(s) }} style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, fontWeight: 700, color: data?.ticker === s ? PAPER : INK, background: data?.ticker === s ? INK : 'transparent', border: `1px solid ${data?.ticker === s ? INK : LINE}`, borderRadius: 7, padding: '7px 13px' }}>{s}</button>
              ))}
            </Reveal>

            {error && <div style={{ marginTop: 18, color: RED, fontSize: 14, ...card, background: '#fef2f2', borderColor: `${RED}55`, padding: '12px 16px' }}>{error}</div>}

            {/* RESULT */}
            {data && <div style={{ marginTop: 22 }}><BrainMemory ticker={data.ticker} /></div>}
            {data && (
              <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: 16 }} className="bs-result">
                {/* chart panel */}
                <Reveal style={{ ...card, background: BONE, padding: 'clamp(16px,2vw,22px)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span className="bs-disp" style={{ fontSize: 26 }}>{data.ticker}</span>
                        <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, letterSpacing: '.1em', color: isNN ? ACCENT : SUB, border: `1px solid ${isNN ? ACCENT : LINE}`, background: isNN ? 'rgba(31,59,255,.07)' : 'transparent', borderRadius: 6, padding: '3px 9px' }}>{isNN ? '◈ NEURAL NET' : '◇ BASELINE'}</span>
                      </div>
                      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, color: SUB, marginTop: 5 }}>${lastPrice.toFixed(2)} → ${tgt.toFixed(2)} · {horizon}d</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 30, fontWeight: 800, color: move >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{move >= 0 ? '▲ +' : '▼ '}{Math.abs(move).toFixed(2)}%</div>
                      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, color: SUB, letterSpacing: '.1em' }}>PREDICTED MOVE</div>
                    </div>
                  </div>
                  <div style={{ height: 320, margin: '0 -8px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="bn-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.18} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0} /></linearGradient>
                          <linearGradient id="bn-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={ACCENT} stopOpacity={0.14} /><stop offset="100%" stopColor={ACCENT} stopOpacity={0.04} /></linearGradient>
                        </defs>
                        <CartesianGrid stroke="rgba(10,10,12,.06)" strokeDasharray="3 6" vertical={false} />
                        {nowDate && <ReferenceLine x={nowDate} stroke="rgba(10,10,12,.22)" strokeDasharray="2 4" label={{ value: 'NOW', fill: SUB, fontSize: 9, position: 'top', fontFamily: 'var(--font-mono),ui-monospace,monospace' }} />}
                        <XAxis dataKey="date" tick={{ fill: SUB, fontSize: 10.5, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} tickLine={false} axisLine={{ stroke: LINE }} minTickGap={36} />
                        <YAxis tick={{ fill: SUB, fontSize: 10.5, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} width={50} />
                        <Tooltip contentStyle={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 10, fontSize: 12, fontFamily: 'var(--font-mono),ui-monospace,monospace' }} labelStyle={{ color: SUB }} formatter={(v, n) => [`$${Number(v).toFixed(2)}`, n === 'forecast' ? 'Forecast' : 'History']} />
                        <Area type="monotone" dataKey="history" stroke={INK} strokeWidth={2} fill="url(#bn-h)" connectNulls={false} isAnimationActive={false} name="history" />
                        <Area type="monotone" dataKey="lo" stackId="cone" stroke="none" fill="none" connectNulls={false} isAnimationActive={false} legendType="none" tooltipType="none" />
                        <Area type="monotone" dataKey="band" stackId="cone" stroke="none" fill="url(#bn-c)" connectNulls={false} isAnimationActive={false} legendType="none" tooltipType="none" />
                        <Line type="monotone" dataKey="forecast" stroke={ACCENT} strokeWidth={2.4} strokeDasharray="6 5" dot={{ r: 2.5, fill: ACCENT, strokeWidth: 0 }} connectNulls isAnimationActive={false} name="forecast" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </Reveal>

                {/* metrics rail */}
                <Reveal delay={120} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {m && (
                    <>
                      {/* skill gauge */}
                      <div style={{ ...card, background: BONE, padding: 22 }}>
                        <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, letterSpacing: '.14em', color: SUB }}>SKILL VS NAIVE BASELINE</div>
                        <div style={{ fontSize: 'clamp(2.4rem,5vw,3.4rem)', fontWeight: 800, letterSpacing: '-2px', color: m.skill_score > 0 ? GREEN : ACCENT, marginTop: 4 }}>{m.skill_score > 0 ? '+' : ''}{(m.skill_score * 100).toFixed(1)}%</div>
                        {(() => { const p = Math.max(3, Math.min(97, ((m.skill_score * 100 + 20) / 40) * 100)); const up = m.skill_score > 0; return (
                          <div style={{ position: 'relative', height: 8, background: 'rgba(10,10,12,.06)', borderRadius: 99, marginTop: 16 }}>
                            <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'rgba(10,10,12,.22)' }} />
                            <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 99, left: up ? '50%' : `${p}%`, width: `${Math.abs(p - 50)}%`, background: up ? GREEN : ACCENT, transition: 'all .9s cubic-bezier(.16,1,.3,1)' }} />
                          </div>
                        ) })()}
                        <div style={{ marginTop: 14, fontSize: 12.5, color: SUB, lineHeight: 1.5 }}>{m.skill_score > 0 ? 'The net is beating a naive “tomorrow = today” baseline on this name.' : 'Not beating the naive baseline here — shown honestly, no hiding.'}</div>
                      </div>

                      {/* directional + samples */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        <div style={{ ...card, background: BONE, padding: '14px 16px' }}>
                          <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, letterSpacing: '.1em', color: SUB }}>DIRECTIONAL ACC.</div>
                          <div style={{ marginTop: 5, fontSize: 20, fontWeight: 800, color: m.directional_accuracy >= 0.5 ? GREEN : RED, fontFamily: 'var(--font-mono),ui-monospace,monospace' }}>{(m.directional_accuracy * 100).toFixed(1)}%</div>
                          <div style={{ position: 'relative', height: 5, background: 'rgba(10,10,12,.06)', borderRadius: 99, marginTop: 10 }}>
                            <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'rgba(10,10,12,.28)' }} />
                            <div style={{ height: '100%', width: `${m.directional_accuracy * 100}%`, background: m.directional_accuracy >= 0.5 ? GREEN : RED, borderRadius: 99, transition: 'width .9s cubic-bezier(.16,1,.3,1)' }} />
                          </div>
                        </div>
                        <div style={{ ...card, background: BONE, padding: '14px 16px' }}>
                          <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, letterSpacing: '.1em', color: SUB }}>BACKTEST SAMPLES</div>
                          <div style={{ marginTop: 5, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono),ui-monospace,monospace' }}>{m.samples}</div>
                          <div style={{ marginTop: 10, fontSize: 10.5, color: SUB, fontFamily: 'var(--font-mono),ui-monospace,monospace' }}>walk-forward · {m.horizon}d</div>
                        </div>
                      </div>

                      {/* net vs naive error race */}
                      <div style={{ ...card, background: BONE, padding: 18 }}>
                        <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, letterSpacing: '.1em', color: SUB, marginBottom: 12 }}>FORECAST ERROR · LOWER WINS</div>
                        {(() => { const mx = Math.max(m.rmse_model, m.rmse_naive) || 1; const rows: [string, number, string][] = [['NET', m.rmse_model, ACCENT], ['NAIVE', m.rmse_naive, 'rgba(10,10,12,.3)']]; return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {rows.map(([lab, val, col]) => (
                              <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <span style={{ width: 44, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, color: SUB }}>{lab}</span>
                                <div style={{ flex: 1, height: 8, background: 'rgba(10,10,12,.05)', borderRadius: 99, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${(val / mx) * 100}%`, background: col, borderRadius: 99, transition: 'width .9s cubic-bezier(.16,1,.3,1)' }} />
                                </div>
                                <span style={{ width: 42, textAlign: 'right', fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, color: col === ACCENT ? ACCENT : INK }}>{val.toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        ) })()}
                        <div style={{ marginTop: 11, fontSize: 11.5, color: m.rmse_model < m.rmse_naive ? GREEN : SUB }}>{m.rmse_model < m.rmse_naive ? '◈ Net beats the baseline on error.' : '◇ Baseline still ahead on raw error here.'}</div>
                      </div>

                      {/* per-day trajectory bars */}
                      <div style={{ ...card, background: BONE, padding: 18 }}>
                        <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10, letterSpacing: '.1em', color: SUB, marginBottom: 14 }}>PER-DAY TRAJECTORY</div>
                        {(() => { const mxMove = Math.max(...data.forecast.map((p) => Math.abs(((p.price - lastPrice) / lastPrice) * 100)), 0.05); return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {data.forecast.map((p, i) => { const d = ((p.price - lastPrice) / lastPrice) * 100; const w = (Math.abs(d) / mxMove) * 50; const up = d >= 0; return (
                              <div key={p.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, color: SUB, width: 30 }}>T+{i + 1}</span>
                                <div style={{ position: 'relative', flex: 1, height: 16, display: 'flex', alignItems: 'center' }}>
                                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(10,10,12,.12)' }} />
                                  <div style={{ position: 'absolute', left: up ? '50%' : `${50 - w}%`, width: `${w}%`, height: 7, borderRadius: 2, background: up ? GREEN : RED, opacity: 0.9, transition: 'width .9s cubic-bezier(.16,1,.3,1), left .9s cubic-bezier(.16,1,.3,1)' }} />
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', color: SUB, width: 62, textAlign: 'right' }}>${p.price.toFixed(2)}</span>
                                <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontWeight: 700, color: up ? GREEN : RED, width: 52, textAlign: 'right' }}>{up ? '+' : ''}{d.toFixed(2)}%</span>
                              </div>
                            ) })}
                          </div>
                        ) })()}
                      </div>
                    </>
                  )}
                </Reveal>
              </div>
            )}
          </div>
        </section>

        {/* ════════ STEP 2 — the live track record ════════ */}
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(54px,8vw,96px) clamp(18px,4vw,34px)' }}>
          <Reveal>
            <Kicker style={{ marginBottom: 16 }}>// STEP 2 · THE RECEIPTS</Kicker>
            <h2 className="bs-disp" style={{ fontSize: 'clamp(1.7rem,3.8vw,2.9rem)', maxWidth: 760, margin: '0 0 14px' }}>Every call graded against real prices.</h2>
            <p style={{ fontSize: '1.08rem', color: SUB, maxWidth: 560, lineHeight: 1.55 }}>The forecasts above don’t vanish — each one is logged and scored five trading days later. Wins and misses, in the open.</p>
          </Reveal>

          <Reveal delay={120}>
            <div style={{ marginTop: 40, display: 'flex', flexWrap: 'wrap', gap: 'clamp(28px,6vw,64px)' }}>
              {rec ? (
                <>
                  <RecordStat label="graded win rate" value={`${rec.winRate}%`} color={rec.winRate >= 50 ? GREEN : RED} />
                  <RecordStat label="calls graded" value={String(rec.total)} />
                  <RecordStat label="avg return / call" value={`${rec.avgReturn >= 0 ? '+' : ''}${rec.avgReturn}%`} color={rec.avgReturn >= 0 ? GREEN : RED} />
                  <RecordStat label="follow-the-AI return" value={`${rec.totalReturn >= 0 ? '+' : ''}${rec.totalReturn}%`} color={rec.totalReturn >= 0 ? GREEN : RED} />
                </>
              ) : (
                <p style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 13, color: SUB }}>The first calls are in flight — the scoreboard fills itself as they resolve.</p>
              )}
            </div>
          </Reveal>

          <Reveal delay={200}>
            <div style={{ marginTop: 36 }}>
              <Link href="/brainstock/track-record" className="bs-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: INK, color: PAPER, padding: '14px 24px', fontSize: 15, fontWeight: 700, borderRadius: 9, textDecoration: 'none', boxShadow: '0 10px 30px rgba(10,10,12,.12)' }}>Open the full track record <ArrowRight size={16} /></Link>
            </div>
          </Reveal>

          {/* live proof — calibration + learning curve (real graded data) */}
          <div style={{ marginTop: 'clamp(36px,6vw,56px)' }}>
            <BrainProof />
          </div>
        </section>

        {/* ════════ STEP 3 — how it works ════════ */}
        <section style={{ background: PAPER, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
          <div style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(54px,8vw,96px) clamp(18px,4vw,34px)' }}>
            <Reveal>
              <Kicker style={{ marginBottom: 16 }}>// STEP 3 · HOW IT WORKS</Kicker>
              <h2 className="bs-disp" style={{ fontSize: 'clamp(1.7rem,3.8vw,2.9rem)', maxWidth: 720, margin: '0 0 14px' }}>The net, and the grading loop.</h2>
              <p style={{ fontSize: '1.08rem', color: SUB, maxWidth: 560, lineHeight: 1.55 }}>No black box. Eleven live market features feed a real multi-layer network; every prediction is logged, then re-graded against what actually happened.</p>
            </Reveal>

            <div style={{ marginTop: 40, display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="bs-explore">
              {[
                { n: '01', t: 'Eleven features', d: 'Trend, momentum, volatility and more — extracted live from each ticker’s price action.' },
                { n: '02', t: 'A real forward pass', d: 'Backpropagation through an 11→16→12→1 network, not a chart trick. Watch it fire below.' },
                { n: '03', t: 'Graded in public', d: 'Each call is scored against real closes — the track record builds itself, un-cherry-picked.' },
              ].map((s, i) => (
                <Reveal key={s.n} delay={i * 80}>
                  <div style={{ ...card, background: BONE, padding: 22, height: '100%' }}>
                    <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.14em', color: ACCENT, marginBottom: 12 }}>{s.n}</div>
                    <div className="bs-disp" style={{ fontSize: '1.4rem', marginBottom: 9 }}>{s.t}</div>
                    <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.55 }}>{s.d}</div>
                  </div>
                </Reveal>
              ))}
            </div>

            {/* NEURAL X-RAY — only meaningful with a live forecast */}
            {data && (
              <Reveal delay={120} style={{ marginTop: 24 }}>
                <div style={{ ...card, background: BONE, padding: 'clamp(18px,2.4vw,26px)' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                    <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11.5, letterSpacing: '.14em', textTransform: 'uppercase', color: ACCENT }}>// NEURAL X-RAY — THE REAL FORWARD PASS</div>
                    <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, color: data.trace ? GREEN : SUB }}>{data.trace ? '◈ LIVE ACTIVATIONS' : '◇ INPUTS ONLY · NET STILL TRAINING'}</div>
                  </div>
                  <p style={{ fontSize: 13.5, color: SUB, lineHeight: 1.55, maxWidth: 640, marginBottom: 14 }}>
                    Not a graphic — the actual computation. Your {data.ticker} bars become the eleven features on the left; watch them fire through the real {vitals?.arch ?? '11→16→12→1'} network to the prediction. Hover any neuron.
                  </p>
                  <NeuralXray
                    activations={data.trace ?? null}
                    features={data.features ?? null}
                    featureNames={FEATURE_NAMES}
                    predicted={lastPrice && tgt ? Math.log(tgt / lastPrice) : null}
                    trained={!!data.trace}
                  />
                </div>
              </Reveal>
            )}
          </div>
        </section>

        {/* ════════ WHAT TO EXPLORE NEXT ════════ */}
        <section style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(54px,8vw,96px) clamp(18px,4vw,34px)' }}>
          <Reveal>
            <Kicker style={{ marginBottom: 16 }}>// KEEP GOING</Kicker>
            <h2 className="bs-disp" style={{ fontSize: 'clamp(1.6rem,3.4vw,2.6rem)', maxWidth: 680, margin: '0 0 14px' }}>The receipts, and the games.</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14, marginTop: 36 }} className="bs-explore">
            {[
              { href: '/brainstock/track-record', t: 'Track Record', d: 'Every call graded. No cherry-picking.', tag: 'The receipts' },
              { href: '/fund', t: 'Live Fund', d: 'The AI’s open book, marked to real prices now.', tag: 'Live', live: true },
              { href: '/time-machine', t: 'Time Machine', d: 'What if you’d followed it since any past day.', tag: 'Replay' },
              { href: '/predict', t: 'Beat the AI', d: 'Humanity vs BrainStock — call it first.', tag: 'The game' },
            ].map((c, i) => (
              <Reveal key={c.href} delay={i * 70}>
                <Link href={c.href} className="bs-card" style={{ ...card, background: PAPER, padding: 20, display: 'flex', flexDirection: 'column', textDecoration: 'none', color: INK, height: '100%', position: 'relative' }}>
                  <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, letterSpacing: '.14em', textTransform: 'uppercase', color: c.live ? GREEN : ACCENT, marginBottom: 12 }}>{c.live ? '● ' : ''}{c.tag}</div>
                  <div className="bs-disp" style={{ fontSize: '1.35rem', marginBottom: 8 }}>{c.t}</div>
                  <div style={{ fontSize: 13.5, color: SUB, lineHeight: 1.5, flex: 1 }}>{c.d}</div>
                  <div style={{ marginTop: 14, fontSize: 13, fontWeight: 700, color: INK, display: 'inline-flex', alignItems: 'center', gap: 6 }}>Open <ArrowRight size={14} /></div>
                </Link>
              </Reveal>
            ))}
          </div>

          <p style={{ marginTop: 'clamp(40px,6vw,64px)', fontSize: 11.5, color: SUB, lineHeight: 1.6, maxWidth: 760 }}>
            {data?.disclaimer ?? 'Educational research tool. Forecasts are model estimates, not financial advice. Past performance does not guarantee future results.'}
          </p>
        </section>
      </main>
    </div>
  )
}

function Vital({ label, value, color = INK, mono }: { label: string; value: ReactNode; color?: string; mono?: boolean }) {
  return (
    <div>
      <div className={mono ? undefined : 'bs-disp'} style={{ fontSize: mono ? 18 : 'clamp(1.6rem,3.2vw,2.6rem)', fontWeight: mono ? 800 : undefined, color, fontFamily: mono ? 'var(--font-mono),ui-monospace,monospace' : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 10.5, letterSpacing: '.1em', textTransform: 'uppercase', color: SUB, marginTop: 6 }}>{label}</div>
    </div>
  )
}

function RecordStat({ label, value, color = INK }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <div className="bs-disp" style={{ fontSize: 'clamp(1.9rem,3.6vw,2.8rem)', color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 11, letterSpacing: '.1em', textTransform: 'uppercase', color: SUB, marginTop: 6 }}>{label}</div>
    </div>
  )
}
