'use client'

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ArrowLeft, ArrowUpRight, Loader2 } from 'lucide-react'
import NeuralBg from '@/components/cinematic/NeuralBg'
import NeuralXray from '@/components/cinematic/NeuralXray'
import { FEATURE_NAMES } from '@/lib/nn'

/* ── palette ─────────────────────────────────────────────────────────────── */
const VOID = '#05060b'
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const AMBER = '#fbbf24'
const RED = '#f87171'
const MUTED = '#8a93a8'
const FAINT = '#46566e'
const BORDER = 'rgba(255,255,255,.08)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.022)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(10px)' }

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'SPY', 'PLTR', 'AMD']

type Point = { date: string; price: number }
type Metrics = { samples: number; horizon: number; rmse_model: number; rmse_naive: number; mae_model: number; mae_naive: number; skill_score: number; directional_accuracy: number }
type Forecast = { ticker: string; history: Point[]; forecast: Point[]; metrics: Metrics; disclaimer: string; engine?: 'neural-net' | 'baseline'; features?: number[]; trace?: number[][] | null }
type Vitals = { ready: boolean; arch: string; trained: number; dirAcc: number; avgLoss: number }

/* ── motion primitives ───────────────────────────────────────────────────── */
function useInView<T extends HTMLElement>(a = 0.2) {
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
function Reveal({ children, delay = 0, y = 26, style }: { children: ReactNode; delay?: number; y?: number; style?: CSSProperties }) {
  const { ref, seen } = useInView<HTMLDivElement>()
  return <div ref={ref} style={{ ...style, opacity: seen ? 1 : 0, transform: seen ? 'none' : `translateY(${y}px)`, transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}
function Kinetic({ children, style, accent = [] }: { children: string; style?: CSSProperties; accent?: number[] }) {
  const { ref, seen } = useInView<HTMLHeadingElement>(0.3)
  const words = children.split(' ')
  return (
    <h1 ref={ref} style={{ ...style, display: 'flex', flexWrap: 'wrap', fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', lineHeight: 0.96 }}>
      {words.map((w, i) => (
        <span key={i} style={{ display: 'inline-block', overflow: 'hidden', paddingBottom: '0.1em', marginRight: '0.26em' }}>
          <span style={{ display: 'inline-block', color: accent.includes(i) ? CYAN : undefined, transform: seen ? 'translateY(0)' : 'translateY(115%)', opacity: seen ? 1 : 0, transition: `transform .95s cubic-bezier(.16,1,.3,1) ${i * 55}ms, opacity .95s ease ${i * 55}ms` }}>{w}</span>
        </span>
      ))}
    </h1>
  )
}
function CountUp({ to, decimals = 0, suffix = '' }: { to: number; decimals?: number; suffix?: string }) {
  const { ref, seen } = useInView<HTMLSpanElement>(0.5)
  const [v, setV] = useState(0)
  useEffect(() => {
    if (!seen) return
    const t0 = performance.now(); let raf = 0
    const tick = (t: number) => { const p = Math.min(1, (t - t0) / 1300); setV(to * (1 - Math.pow(1 - p, 3))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [seen, to])
  return <span ref={ref}>{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>
}

export default function BrainStock() {
  const [ticker, setTicker] = useState('AAPL')
  const [horizon, setHorizon] = useState(5)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<Forecast | null>(null)
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  useEffect(() => { fetch('/api/nn').then((r) => r.json()).then(setVitals).catch(() => {}) }, [])

  const run = async (sym: string, h = horizon) => {
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: sym, horizon: h, source: 'forecast' }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setData(json as Forecast)
    } catch (e) { setError(e instanceof Error ? e.message : "Couldn't reach the forecast API.") } finally { setLoading(false) }
  }
  const submit = (e?: FormEvent) => { e?.preventDefault(); const t = ticker.trim().toUpperCase(); if (t) run(t) }
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    const sym = t && /^[A-Za-z0-9.\-]{1,8}$/.test(t) ? t.toUpperCase() : 'AAPL'
    setTicker(sym); run(sym)
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

  return (
    <div style={{ minHeight: '100vh', position: 'relative', background: VOID, color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes bs-blink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes bs-spin{to{transform:rotate(360deg)}}
        @keyframes bs-sheen{0%{background-position:-200% 0}100%{background-position:200% 0}}
        .bs-spin{animation:bs-spin 1s linear infinite}
        .bs-card{transition:transform .18s ease, border-color .2s ease, box-shadow .25s ease}
        .bs-card:hover{transform:translateY(-3px); border-color:${CYAN}44; box-shadow:0 16px 50px rgba(0,0,0,.4)}
        .bs-chip{transition:all .15s ease}
      `}</style>

      {/* the living net — fixed atmosphere across the whole page */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NeuralBg opacity={0.55} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(1200px 700px at 50% -10%, ${CYAN}14, transparent 55%), radial-gradient(900px 500px at 90% 10%, ${VIOLET}12, transparent 50%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 50% 45%, transparent, rgba(5,6,11,.66) 92%)' }} />
      </div>

      {/* top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(5,6,11,.6)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)', height: 58, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 28, height: 28, background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: VOID, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12, letterSpacing: '-0.04em' }}>YN</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, letterSpacing: '0.14em', textTransform: 'uppercase', color: MUTED }}>BrainStock</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: GREEN }}><span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, animation: 'bs-blink 1.4s infinite' }} /> LIVE</span>
          </div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none' }}><ArrowLeft size={14} /> YN Finance</Link>
        </div>
      </header>

      <main style={{ position: 'relative', zIndex: 1, maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)' }}>
        {/* HERO */}
        <section style={{ paddingTop: 'clamp(60px,10vw,120px)', paddingBottom: 'clamp(30px,5vw,60px)' }}>
          <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.3em', textTransform: 'uppercase', color: CYAN, marginBottom: 26 }}>Real neural net · trains nightly · grades in public</div></Reveal>
          <Kinetic accent={[0, 1, 2, 3]} style={{ fontSize: 'clamp(2.6rem,7.5vw,6.4rem)', maxWidth: 1000 }}>It gets better every run.</Kinetic>
          <Kinetic style={{ fontSize: 'clamp(2.6rem,7.5vw,6.4rem)', maxWidth: 1000, color: 'rgba(231,236,245,.62)' }}>And admits when it’s wrong.</Kinetic>
          <Reveal delay={250} style={{ marginTop: 26, maxWidth: 660 }}>
            <p style={{ fontSize: 'clamp(1.02rem,1.6vw,1.28rem)', lineHeight: 1.6, color: MUTED }}>
              A real multi-layer neural network — backpropagation, eleven live market features — that{' '}
              <b style={{ color: '#e7ecf5' }}>retrains every night on its own graded predictions.</b> Watch it learn the market, in public.
            </p>
          </Reveal>

          {/* BRAIN VITALS */}
          <Reveal delay={400} style={{ marginTop: 40, display: 'flex', gap: 'clamp(20px,5vw,64px)', flexWrap: 'wrap', alignItems: 'flex-end', borderTop: `1px solid ${BORDER}`, paddingTop: 28 }}>
            <Vital label="Architecture" value={vitals?.arch ?? '11→16→12→1'} mono color={CYAN} />
            <Vital label="Examples trained" value={vitals?.ready ? <CountUp to={vitals.trained} /> : '—'} />
            <Vital label="Directional acc." value={vitals?.ready ? <CountUp to={vitals.dirAcc} decimals={1} suffix="%" /> : 'warming up'} color={vitals?.ready ? GREEN : FAINT} />
            <Vital label="Status" value={vitals?.ready ? 'LEARNING' : 'BOOTSTRAPPING'} mono color={vitals?.ready ? GREEN : AMBER} />
          </Reveal>
        </section>

        {/* CONSOLE */}
        <Reveal>
          <form onSubmit={submit} style={{ ...glass, padding: 'clamp(16px,2.4vw,22px)', display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 220px', borderRight: `1px solid ${BORDER}`, paddingRight: 14 }}>
              <span style={{ color: CYAN, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>$</span>
              <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="AAPL" spellCheck={false} maxLength={8}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 22, letterSpacing: 2, fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: '1 1 240px' }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: FAINT, whiteSpace: 'nowrap' }}>HORIZON</span>
              <input type="range" min={1} max={20} value={horizon} onChange={(e) => { const h = Number(e.target.value); setHorizon(h); if (data) run(data.ticker, h) }} style={{ flex: 1, accentColor: VIOLET }} />
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#fff', width: 54, textAlign: 'right' }}>{horizon}d</span>
            </div>
            <button ref={btnRef} type="submit" disabled={loading}
              onMouseMove={(e) => { const el = btnRef.current!; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.3}px, ${(e.clientY - (r.top + r.height / 2)) * 0.3}px)` }}
              onMouseLeave={() => { if (btnRef.current) btnRef.current.style.transform = '' }}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: VOID, padding: '15px 30px', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', transition: 'transform .3s cubic-bezier(.16,1,.3,1)', willChange: 'transform' }}>
              {loading ? <><Loader2 size={16} className="bs-spin" /> Forecasting…</> : <>Run forecast <ArrowUpRight size={16} /></>}
            </button>
          </form>
        </Reveal>
        <Reveal delay={80} style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: FAINT }}>TRY</span>
          {POPULAR.map((s) => (
            <button key={s} className="bs-chip" onClick={() => { setTicker(s); run(s) }} style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: data?.ticker === s ? VOID : '#cdd6e6', background: data?.ticker === s ? CYAN : 'rgba(255,255,255,.04)', border: `1px solid ${data?.ticker === s ? CYAN : BORDER}`, padding: '6px 12px', cursor: 'pointer' }}>{s}</button>
          ))}
        </Reveal>

        {error && <div style={{ marginTop: 18, color: '#ffb4b4', fontSize: 14, ...glass, padding: '12px 16px', borderColor: `${RED}44` }}>{error}</div>}

        {/* RESULT */}
        {data && (
          <section style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'minmax(0,1.7fr) minmax(0,1fr)', gap: 16 }} className="bs-result">
            {/* chart panel */}
            <Reveal style={{ ...glass, padding: 'clamp(16px,2vw,22px)', position: 'relative', overflow: 'hidden' }}>
              <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${CYAN}66, transparent)` }} />
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px' }}>{data.ticker}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: isNN ? CYAN : AMBER, border: `1px solid ${isNN ? CYAN : AMBER}44`, background: `${isNN ? CYAN : AMBER}12`, padding: '3px 9px' }}>{isNN ? '◈ NEURAL NET' : '◇ BASELINE'}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: FAINT, marginTop: 5 }}>${lastPrice.toFixed(2)} → ${tgt.toFixed(2)} · {horizon}d</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 30, fontWeight: 800, color: move >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums', letterSpacing: '-1px' }}>{move >= 0 ? '▲ +' : '▼ '}{Math.abs(move).toFixed(2)}%</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: FAINT, letterSpacing: '0.1em' }}>PREDICTED MOVE</div>
                </div>
              </div>
              <div style={{ height: 320, margin: '0 -8px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="bn-h" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={CYAN} stopOpacity={0.34} /><stop offset="100%" stopColor={CYAN} stopOpacity={0} /></linearGradient>
                      <linearGradient id="bn-c" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={VIOLET} stopOpacity={0.3} /><stop offset="100%" stopColor={VIOLET} stopOpacity={0.1} /></linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="3 6" vertical={false} />
                    {nowDate && <ReferenceLine x={nowDate} stroke="rgba(255,255,255,.22)" strokeDasharray="2 4" label={{ value: 'NOW', fill: FAINT, fontSize: 9, position: 'top', fontFamily: 'var(--font-mono)' }} />}
                    <XAxis dataKey="date" tick={{ fill: FAINT, fontSize: 10.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={36} />
                    <YAxis tick={{ fill: FAINT, fontSize: 10.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${Number(v).toFixed(0)}`} width={50} />
                    <Tooltip contentStyle={{ background: 'rgba(8,10,16,.96)', border: `1px solid ${BORDER}`, fontSize: 12, fontFamily: 'var(--font-mono)' }} labelStyle={{ color: MUTED }} formatter={(v, n) => [`$${Number(v).toFixed(2)}`, n === 'forecast' ? 'Forecast' : 'History']} />
                    <Area type="monotone" dataKey="history" stroke={CYAN} strokeWidth={2} fill="url(#bn-h)" connectNulls={false} isAnimationActive={false} name="history" />
                    <Area type="monotone" dataKey="lo" stackId="cone" stroke="none" fill="none" connectNulls={false} isAnimationActive={false} legendType="none" tooltipType="none" />
                    <Area type="monotone" dataKey="band" stackId="cone" stroke="none" fill="url(#bn-c)" connectNulls={false} isAnimationActive={false} legendType="none" tooltipType="none" />
                    <Line type="monotone" dataKey="forecast" stroke={VIOLET} strokeWidth={2.4} strokeDasharray="6 5" dot={{ r: 2.5, fill: VIOLET, strokeWidth: 0 }} connectNulls isAnimationActive={false} name="forecast" />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </Reveal>

            {/* metrics rail */}
            <Reveal delay={120} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {m && (
                <>
                  {/* skill gauge */}
                  <div style={{ ...glass, padding: 22, position: 'relative', overflow: 'hidden' }}>
                    <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${m.skill_score > 0 ? GREEN : AMBER}66, transparent)` }} />
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: FAINT }}>SKILL VS NAIVE BASELINE</div>
                    <div style={{ fontSize: 'clamp(2.4rem,5vw,3.4rem)', fontWeight: 800, letterSpacing: '-2px', color: m.skill_score > 0 ? GREEN : AMBER, marginTop: 4 }}>{m.skill_score > 0 ? '+' : ''}{(m.skill_score * 100).toFixed(1)}%</div>
                    {(() => { const p = Math.max(3, Math.min(97, ((m.skill_score * 100 + 20) / 40) * 100)); const up = m.skill_score > 0; return (
                      <div style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 99, marginTop: 16 }}>
                        <div style={{ position: 'absolute', left: '50%', top: -3, bottom: -3, width: 1, background: 'rgba(255,255,255,.22)' }} />
                        <div style={{ position: 'absolute', top: 0, bottom: 0, borderRadius: 99, left: up ? '50%' : `${p}%`, width: `${Math.abs(p - 50)}%`, background: up ? GREEN : AMBER, boxShadow: `0 0 12px ${up ? GREEN : AMBER}66`, transition: 'all .9s cubic-bezier(.16,1,.3,1)' }} />
                      </div>
                    ) })()}
                    <div style={{ marginTop: 14, fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>{m.skill_score > 0 ? 'The net is beating a naive “tomorrow = today” baseline on this name.' : 'Not beating the naive baseline here — shown honestly, no hiding.'}</div>
                  </div>

                  {/* directional + samples */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ ...glass, padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: FAINT }}>DIRECTIONAL ACC.</div>
                      <div style={{ marginTop: 5, fontSize: 20, fontWeight: 800, color: m.directional_accuracy >= 0.5 ? GREEN : RED, fontFamily: 'var(--font-mono)' }}>{(m.directional_accuracy * 100).toFixed(1)}%</div>
                      <div style={{ position: 'relative', height: 5, background: 'rgba(255,255,255,.06)', borderRadius: 99, marginTop: 10 }}>
                        <div style={{ position: 'absolute', left: '50%', top: -2, bottom: -2, width: 1, background: 'rgba(255,255,255,.28)' }} />
                        <div style={{ height: '100%', width: `${m.directional_accuracy * 100}%`, background: m.directional_accuracy >= 0.5 ? GREEN : RED, borderRadius: 99, transition: 'width .9s cubic-bezier(.16,1,.3,1)' }} />
                      </div>
                    </div>
                    <div style={{ ...glass, padding: '14px 16px' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: FAINT }}>BACKTEST SAMPLES</div>
                      <div style={{ marginTop: 5, fontSize: 20, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>{m.samples}</div>
                      <div style={{ marginTop: 10, fontSize: 10.5, color: FAINT, fontFamily: 'var(--font-mono)' }}>walk-forward · {m.horizon}d</div>
                    </div>
                  </div>

                  {/* net vs naive error race */}
                  <div style={{ ...glass, padding: 18 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: FAINT, marginBottom: 12 }}>FORECAST ERROR · LOWER WINS</div>
                    {(() => { const mx = Math.max(m.rmse_model, m.rmse_naive) || 1; const rows: [string, number, string][] = [['NET', m.rmse_model, CYAN], ['NAIVE', m.rmse_naive, FAINT]]; return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {rows.map(([lab, val, col]) => (
                          <div key={lab} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ width: 44, fontFamily: 'var(--font-mono)', fontSize: 10.5, color: FAINT }}>{lab}</span>
                            <div style={{ flex: 1, height: 8, background: 'rgba(255,255,255,.05)', borderRadius: 99, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${(val / mx) * 100}%`, background: col, borderRadius: 99, transition: 'width .9s cubic-bezier(.16,1,.3,1)' }} />
                            </div>
                            <span style={{ width: 42, textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: col }}>{val.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    ) })()}
                    <div style={{ marginTop: 11, fontSize: 11.5, color: m.rmse_model < m.rmse_naive ? GREEN : AMBER }}>{m.rmse_model < m.rmse_naive ? '◈ Net beats the baseline on error.' : '◇ Baseline still ahead on raw error here.'}</div>
                  </div>

                  {/* per-day trajectory bars */}
                  <div style={{ ...glass, padding: 18 }}>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.1em', color: FAINT, marginBottom: 14 }}>PER-DAY TRAJECTORY</div>
                    {(() => { const mxMove = Math.max(...data.forecast.map((p) => Math.abs(((p.price - lastPrice) / lastPrice) * 100)), 0.05); return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {data.forecast.map((p, i) => { const d = ((p.price - lastPrice) / lastPrice) * 100; const w = (Math.abs(d) / mxMove) * 50; const up = d >= 0; return (
                          <div key={p.date} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: FAINT, width: 30 }}>T+{i + 1}</span>
                            <div style={{ position: 'relative', flex: 1, height: 16, display: 'flex', alignItems: 'center' }}>
                              <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'rgba(255,255,255,.1)' }} />
                              <div style={{ position: 'absolute', left: up ? '50%' : `${50 - w}%`, width: `${w}%`, height: 7, borderRadius: 2, background: up ? GREEN : RED, opacity: 0.85, boxShadow: `0 0 8px ${up ? GREEN : RED}55`, transition: 'width .9s cubic-bezier(.16,1,.3,1), left .9s cubic-bezier(.16,1,.3,1)' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-mono)', color: MUTED, width: 62, textAlign: 'right' }}>${p.price.toFixed(2)}</span>
                            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: up ? GREEN : RED, width: 52, textAlign: 'right' }}>{up ? '+' : ''}{d.toFixed(2)}%</span>
                          </div>
                        ) })}
                      </div>
                    ) })()}
                  </div>
                </>
              )}
            </Reveal>
          </section>
        )}

        {/* NEURAL X-RAY */}
        {data && (
          <section style={{ marginTop: 26 }}>
            <Reveal>
              <div style={{ ...glass, padding: 'clamp(18px,2.4vw,26px)', position: 'relative', overflow: 'hidden' }}>
                <span style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${VIOLET}66, transparent)` }} />
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 6 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.2em', color: VIOLET }}>// NEURAL X-RAY — THE REAL FORWARD PASS</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: data.trace ? GREEN : AMBER }}>{data.trace ? '◈ LIVE ACTIVATIONS' : '◇ INPUTS ONLY · NET STILL TRAINING'}</div>
                </div>
                <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.55, maxWidth: 640, marginBottom: 14 }}>
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
          </section>
        )}

        {/* EXPLORE */}
        <section style={{ margin: 'clamp(50px,8vw,90px) 0 30px' }}>
          <Reveal><div style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, letterSpacing: '0.2em', color: CYAN, marginBottom: 20 }}>// THE RECEIPTS &amp; THE GAMES</div></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,minmax(0,1fr))', gap: 14 }} className="bs-explore">
            {[
              { href: '/fund', emoji: '📈', t: 'Live Fund', d: 'The AI’s open book, marked to real prices now', live: true },
              { href: '/time-machine', emoji: '⏳', t: 'Time Machine', d: 'What if you’d followed it since any past day' },
              { href: '/predict', emoji: '⚔️', t: 'Beat the AI', d: 'Humanity vs BrainStock — call it first' },
              { href: '/brainstock/track-record', emoji: '🧾', t: 'Track Record', d: 'Every call graded. No cherry-picking' },
            ].map((c, i) => (
              <Reveal key={c.href} delay={i * 70}>
                <Link href={c.href} className="bs-card" data-spotlight style={{ ...glass, padding: 18, display: 'block', textDecoration: 'none', color: '#e7ecf5', height: '100%', position: 'relative' }}>
                  {c.live && <span style={{ position: 'absolute', top: 14, right: 14, fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 800, letterSpacing: '0.1em', color: GREEN }}>● LIVE</span>}
                  <div style={{ fontSize: 22 }}>{c.emoji}</div>
                  <div style={{ marginTop: 10, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>{c.t} <ArrowUpRight size={14} color={CYAN} /></div>
                  <div style={{ marginTop: 4, fontSize: 12.5, color: MUTED, lineHeight: 1.45 }}>{c.d}</div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <p style={{ padding: '20px 0 60px', fontSize: 11.5, color: FAINT, lineHeight: 1.6, maxWidth: 760 }}>
          {data?.disclaimer ?? 'Educational research tool. Forecasts are model estimates, not financial advice. Past performance does not guarantee future results.'}
        </p>
      </main>

      <style>{`@media (max-width:900px){.bs-result{grid-template-columns:1fr !important}}@media (max-width:760px){.bs-explore{grid-template-columns:1fr 1fr !important}}`}</style>
    </div>
  )
}

function Vital({ label, value, color = '#e7ecf5', mono }: { label: string; value: ReactNode; color?: string; mono?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: mono ? 18 : 'clamp(1.4rem,3vw,2.1rem)', fontWeight: 800, letterSpacing: '-0.02em', color, fontFamily: mono ? 'var(--font-mono)' : undefined, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT, marginTop: 6 }}>{label}</div>
    </div>
  )
}
