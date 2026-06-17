'use client'

import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import Link from 'next/link'
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Brain,
  CircuitBoard,
  Cpu,
  Loader2,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

/* ---------- palette ---------- */
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const AMBER = '#fbbf24'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = {
  background: 'rgba(255,255,255,.025)',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  backdropFilter: 'blur(8px)',
}

type Point = { date: string; price: number }
type Metrics = {
  samples: number
  horizon: number
  rmse_model: number
  rmse_naive: number
  mae_model: number
  mae_naive: number
  skill_score: number
  directional_accuracy: number
}
type ForecastResponse = {
  ticker: string
  history: Point[]
  forecast: Point[]
  metrics: Metrics
  disclaimer: string
}

const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'SPY']

export default function BrainStock() {
  const [ticker, setTicker] = useState('AAPL')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ForecastResponse | null>(null)
  const [health, setHealth] = useState<'ok' | 'down' | 'checking'>('checking')
  const [horizon, setHorizon] = useState(5)

  useEffect(() => {
    let alive = true
    const ping = () =>
      fetch('/api/forecast', { method: 'GET' })
        .then((r) => alive && setHealth(r.ok ? 'ok' : 'down'))
        .catch(() => alive && setHealth('down'))
    ping()
    const id = setInterval(ping, 30000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])

  const runForecast = async (sym: string, h: number = horizon) => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: sym, horizon: h }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      setData(json as ForecastResponse)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't reach the forecast API.")
    } finally {
      setLoading(false)
    }
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const t = ticker.trim().toUpperCase()
    if (t) runForecast(t)
  }

  // Auto-load on first render — honor a ?t=TICKER deep-link (from the Bull Board).
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t')
    const sym = t && /^[A-Za-z0-9.\-]{1,8}$/.test(t) ? t.toUpperCase() : 'AAPL'
    setTicker(sym)
    runForecast(sym)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const chartData = useMemo(() => {
    if (!data) return []
    const rmse = data.metrics.rmse_model || 0
    const z = 1.96 // ~95% band
    const hist = data.history.map((p) => ({
      date: p.date,
      history: p.price as number | null,
      forecast: null as number | null,
      coneLow: null as number | null,
      coneBand: null as number | null,
    }))
    const last = data.history[data.history.length - 1]
    const fc = data.forecast.map((p, i) => {
      const half = z * rmse * Math.sqrt(i + 1)
      return {
        date: p.date,
        history: null as number | null,
        forecast: p.price as number | null,
        coneLow: +(p.price - half).toFixed(2) as number | null,
        coneBand: +(2 * half).toFixed(2) as number | null,
      }
    })
    if (last && fc.length)
      hist[hist.length - 1] = { ...hist[hist.length - 1], forecast: last.price, coneLow: last.price, coneBand: 0 }
    return [...hist, ...fc]
  }, [data])

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at 12% -8%, rgba(34,211,238,.12), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(167,139,250,.14), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes bs-spin { to { transform: rotate(360deg) } }
        @keyframes bs-pulse { 0%,100%{opacity:1} 50%{opacity:.35} }
        @keyframes bs-pop { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
        .bs-spin{ animation:bs-spin 1s linear infinite }
        .bs-card{ animation:bs-pop .5s ease both }
        .bs-grid{ background-image:linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px); background-size:34px 34px }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: 'rgba(7,11,20,.72)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: '0 auto',
            padding: '0 24px',
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`,
                display: 'grid',
                placeItems: 'center',
                boxShadow: `0 0 22px rgba(34,211,238,.35)`,
              }}
            >
              <Brain size={20} color="#07101a" />
            </div>
            <div style={{ lineHeight: 1.15 }}>
              <div style={{ fontWeight: 700, letterSpacing: -0.3 }}>BrainStock</div>
              <div style={{ fontSize: 11, color: MUTED }}>Neural forecasting · v0.1</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <HealthDot status={health} />
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 13,
                color: MUTED,
                textDecoration: 'none',
              }}
            >
              <ArrowLeft size={14} /> YN Finance
            </Link>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section style={{ position: 'relative' }}>
        <div
          className="bs-grid"
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.5,
            pointerEvents: 'none',
            maskImage: 'radial-gradient(ellipse at top, black, transparent 70%)',
            WebkitMaskImage: 'radial-gradient(ellipse at top, black, transparent 70%)',
          }}
        />
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '52px 24px 24px', position: 'relative' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 100,
              border: `1px solid ${BORDER}`,
              background: 'rgba(255,255,255,.03)',
              padding: '5px 13px',
              fontSize: 12,
              color: MUTED,
            }}
          >
            <Sparkles size={14} color={CYAN} /> Real data · Backtested · Honest metrics
          </div>
          <h1
            style={{
              marginTop: 20,
              fontSize: 'clamp(32px, 5vw, 58px)',
              fontWeight: 800,
              letterSpacing: -1.5,
              lineHeight: 1.05,
              maxWidth: 860,
            }}
          >
            <span
              style={{
                background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              A neural network that gets better every run
            </span>{' '}
            <span style={{ color: 'rgba(231,236,245,.9)' }}>— and admits when it&apos;s wrong.</span>
          </h1>
          <p style={{ marginTop: 16, fontSize: 17, color: MUTED, maxWidth: 640, lineHeight: 1.6 }}>
            BrainStock learns from six months of real price history and reports its skill against a
            naive baseline — so you see exactly when the model helps, and when it doesn&apos;t.
          </p>

          {/* COMPOSER */}
          <form
            onSubmit={submit}
            style={{
              ...glass,
              marginTop: 28,
              padding: 8,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              maxWidth: 560,
            }}
          >
            <div style={{ paddingLeft: 12, color: MUTED, fontWeight: 600 }}>$</div>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              placeholder="AAPL"
              spellCheck={false}
              maxLength={8}
              style={{
                flex: 1,
                background: 'transparent',
                outline: 'none',
                border: 'none',
                color: '#fff',
                padding: '12px 4px',
                fontSize: 18,
                letterSpacing: 2,
                fontWeight: 600,
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                borderRadius: 12,
                border: 'none',
                background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`,
                color: '#07101a',
                padding: '12px 20px',
                fontSize: 14,
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="bs-spin" /> Forecasting…
                </>
              ) : (
                <>
                  Forecast <ArrowUpRight size={16} />
                </>
              )}
            </button>
          </form>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: MUTED }}>Try:</span>
            {POPULAR.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setTicker(s)
                  runForecast(s)
                }}
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: data?.ticker === s ? '#07101a' : '#cdd6e6',
                  background: data?.ticker === s ? CYAN : 'rgba(255,255,255,.05)',
                  border: `1px solid ${BORDER}`,
                  borderRadius: 100,
                  padding: '5px 12px',
                  cursor: 'pointer',
                }}
              >
                {s}
              </button>
            ))}
          </div>
          <div style={{ marginTop: 16, maxWidth: 560, display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{ fontSize: 12, color: MUTED, whiteSpace: 'nowrap' }}>Horizon</span>
            <input
              type="range"
              min={1}
              max={20}
              value={horizon}
              onChange={(e) => {
                const h = Number(e.target.value)
                setHorizon(h)
                runForecast(data?.ticker ?? ticker, h)
              }}
              style={{ flex: 1, accentColor: VIOLET }}
            />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#fff', width: 64, textAlign: 'right' }}>
              {horizon} day{horizon > 1 ? 's' : ''}
            </span>
          </div>
          <p style={{ marginTop: 12, fontSize: 12, color: MUTED }}>
            Live prices from Yahoo Finance · 6-month history · walk-forward backtest vs. naive baseline.
          </p>

          {/* EXPLORE — the AI's receipts & games */}
          <div style={{ marginTop: 26, display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 12 }} className="bs-explore">
            <FeatureLink href="/fund" accent={GREEN} live emoji="📈" title="Live Fund" desc="The AI's open book, marked to real prices right now" />
            <FeatureLink href="/time-machine" accent={VIOLET} emoji="⏳" title="Time Machine" desc="What if you'd followed the AI since any past day" />
            <FeatureLink href="/predict" accent={CYAN} emoji="⚔️" title="Beat the AI" desc="Humanity vs BrainStock — call it before the model" />
            <FeatureLink href="/brainstock/track-record" accent={AMBER} emoji="🧾" title="Track Record" desc="Every call graded against real prices. No cherry-picking" />
          </div>
        </div>
      </section>

      {/* CONTENT */}
      <main
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          padding: '8px 24px 64px',
          width: '100%',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
      >
        {error && (
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${RED}55`,
              background: `${RED}1a`,
              color: '#ffd9d9',
              padding: '12px 16px',
              fontSize: 14,
            }}
          >
            {error}
          </div>
        )}

        {loading && !data && (
          <div style={{ ...glass, padding: 24, display: 'grid', placeItems: 'center', height: 360 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 14 }}>
              <Loader2 size={16} className="bs-spin" /> Training &amp; forecasting…
            </div>
          </div>
        )}

        {data && (
          <>
            {/* CHART + METRICS */}
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }} className="bs-card bs-resp">
              <section style={{ ...glass, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
                  <div>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>Ticker</div>
                    <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {data.ticker}
                      <span style={{ fontSize: 12, fontWeight: 400, color: MUTED }}>
                        · {data.history.length} days history · {data.forecast.length}-day forecast
                      </span>
                    </div>
                  </div>
                  <Legend />
                </div>

                <div style={{ height: 360, margin: '0 -8px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="bs-hist" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={CYAN} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="bs-cone" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={VIOLET} stopOpacity={0.32} />
                          <stop offset="100%" stopColor={VIOLET} stopOpacity={0.12} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="rgba(255,255,255,.06)" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={32} />
                      <YAxis
                        tick={{ fill: MUTED, fontSize: 11 }}
                        tickLine={false}
                        axisLine={false}
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => `$${Number(v).toFixed(0)}`}
                        width={56}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="history"
                        stroke={CYAN}
                        strokeWidth={2}
                        fill="url(#bs-hist)"
                        connectNulls={false}
                        isAnimationActive={false}
                        name="Price history"
                      />
                      <Area
                        type="monotone"
                        dataKey="coneLow"
                        stackId="cone"
                        stroke="none"
                        fill="none"
                        connectNulls={false}
                        isAnimationActive={false}
                        legendType="none"
                        tooltipType="none"
                      />
                      <Area
                        type="monotone"
                        dataKey="coneBand"
                        stackId="cone"
                        stroke="none"
                        fill="url(#bs-cone)"
                        connectNulls={false}
                        isAnimationActive={false}
                        name="95% range"
                      />
                      <Line
                        type="monotone"
                        dataKey="forecast"
                        stroke={VIOLET}
                        strokeWidth={2.25}
                        strokeDasharray="6 5"
                        dot={{ r: 2.5, fill: VIOLET, strokeWidth: 0 }}
                        activeDot={{ r: 4 }}
                        connectNulls
                        isAnimationActive={false}
                        name="Model forecast (estimate)"
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </section>

              <aside style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <SkillCard m={data.metrics} />
                <StatGrid m={data.metrics} />
              </aside>
            </div>

            {/* NEURAL NETWORK + PREDICTIONS */}
            <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)' }} className="bs-card bs-resp">
              <section style={{ ...glass, padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <CircuitBoard size={16} color={CYAN} />
                    <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, margin: 0 }}>
                      Model architecture
                    </h2>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: MUTED }}>
                    <Cpu size={14} /> <span style={{ fontVariantNumeric: 'tabular-nums' }}>~{(layerParams([4, 6, 6, 3, 1]) / 1000).toFixed(1)}k params</span>
                  </div>
                </div>
                <p style={{ fontSize: 14, color: MUTED, marginBottom: 6, lineHeight: 1.55 }}>
                  Inputs (lookback window, returns, volatility, momentum) flow through three hidden
                  layers to a single price-delta output. Hover any node to highlight its connections —
                  animated pulses show forward signal flow.
                </p>
                <NeuralDiagram layers={[4, 6, 6, 3, 1]} />
              </section>

              <PredictionPanel data={data} />
            </div>
          </>
        )}
      </main>

      {/* DISCLAIMER FOOTER */}
      <footer
        style={{
          position: 'sticky',
          bottom: 0,
          borderTop: `1px solid ${BORDER}`,
          background: 'rgba(7,11,20,.9)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '12px 24px', fontSize: 12, color: MUTED, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <span style={{ marginTop: 5, width: 6, height: 6, borderRadius: 99, background: AMBER, flexShrink: 0 }} />
          <p style={{ margin: 0 }}>
            {data?.disclaimer ??
              'Educational research tool. Forecasts are model estimates, not financial advice. Past performance does not guarantee future results.'}
          </p>
        </div>
      </footer>

      <style>{`@media (max-width: 900px){ .bs-resp{ grid-template-columns: 1fr !important } }
        .bs-flink:hover{ transform: translateY(-2px); box-shadow: 0 10px 30px rgba(0,0,0,.35) }
        @media (max-width: 720px){ .bs-explore{ grid-template-columns: 1fr 1fr !important } }`}</style>
    </div>
  )
}

function FeatureLink({ href, accent, emoji, title, desc, live }: { href: string; accent: string; emoji: string; title: string; desc: string; live?: boolean }) {
  return (
    <Link href={href} style={{ ...glass, padding: 16, textDecoration: 'none', color: '#e7ecf5', display: 'block', borderColor: `${accent}33`, position: 'relative', transition: 'transform .12s ease, box-shadow .2s ease' }} className="bs-flink">
      {live && (
        <span style={{ position: 'absolute', top: 12, right: 12, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, letterSpacing: 0.6, color: accent }}>
          <span style={{ width: 6, height: 6, borderRadius: 99, background: accent, animation: 'bs-pulse 1.4s ease-in-out infinite' }} /> LIVE
        </span>
      )}
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title} <ArrowUpRight size={14} color={accent} />
      </div>
      <div style={{ marginTop: 4, fontSize: 12, color: MUTED, lineHeight: 1.45 }}>{desc}</div>
    </Link>
  )
}

function layerParams(layers: number[]) {
  let p = 0
  for (let i = 0; i < layers.length - 1; i++) p += layers[i] * layers[i + 1] + layers[i + 1]
  return p
}

function HealthDot({ status }: { status: 'ok' | 'down' | 'checking' }) {
  const color = status === 'ok' ? GREEN : status === 'down' ? RED : MUTED
  const label = status === 'ok' ? 'API online' : status === 'down' ? 'API offline' : 'Checking…'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: MUTED }}>
      <span style={{ width: 8, height: 8, borderRadius: 99, background: color, animation: 'bs-pulse 1.6s ease-in-out infinite', boxShadow: `0 0 8px ${color}` }} />
      {label}
    </div>
  )
}

function Legend() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: MUTED }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ height: 2, width: 20, borderRadius: 99, background: CYAN }} /> History
      </span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
        <span style={{ height: 2, width: 20, borderRadius: 99, background: `repeating-linear-gradient(90deg, ${VIOLET} 0 5px, transparent 5px 10px)` }} />
        Forecast
      </span>
    </div>
  )
}

type TooltipProps = { active?: boolean; payload?: Array<{ dataKey: string; value: number | null; stroke?: string; color?: string }>; label?: string }
function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, background: 'rgba(10,15,26,.96)', backdropFilter: 'blur(6px)', padding: '8px 12px', fontSize: 12, boxShadow: '0 12px 30px rgba(0,0,0,.5)' }}>
      <div style={{ color: MUTED, marginBottom: 4 }}>{label}</div>
      {payload.map((p) =>
        p.value == null || p.dataKey === 'coneLow' || p.dataKey === 'coneBand' ? null : (
          <div key={p.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: p.stroke || p.color }} />
            <span style={{ color: '#e7ecf5' }}>{p.dataKey === 'forecast' ? 'Forecast' : 'History'}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>${Number(p.value).toFixed(2)}</span>
          </div>
        )
      )}
    </div>
  )
}

function SkillCard({ m }: { m: Metrics }) {
  const beats = m.skill_score > 0
  const pct = (m.skill_score * 100).toFixed(1)
  const col = beats ? GREEN : AMBER
  return (
    <div style={{ ...glass, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>Skill score</div>
        <TrendingUp size={16} color={MUTED} />
      </div>
      <div style={{ marginTop: 8, fontSize: 40, fontWeight: 700, letterSpacing: -1, color: col, fontVariantNumeric: 'tabular-nums' }}>
        {beats ? '+' : ''}
        {pct}%
      </div>
      <div
        style={{
          marginTop: 12,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          borderRadius: 100,
          padding: '5px 12px',
          fontSize: 12,
          fontWeight: 600,
          color: col,
          background: `${col}26`,
          border: `1px solid ${col}55`,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: 99, background: col }} />
        {beats ? 'Beats the naive baseline' : 'Does not beat baseline (honest result)'}
      </div>
    </div>
  )
}

function StatGrid({ m }: { m: Metrics }) {
  const items = [
    { label: 'RMSE · model', value: m.rmse_model.toFixed(3) },
    { label: 'RMSE · naive', value: m.rmse_naive.toFixed(3) },
    { label: 'Directional acc.', value: `${(m.directional_accuracy * 100).toFixed(1)}%` },
    { label: 'Samples', value: m.samples.toString() },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      {items.map((it) => (
        <div key={it.label} style={{ ...glass, padding: '12px 16px' }}>
          <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>{it.label}</div>
          <div style={{ marginTop: 4, fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{it.value}</div>
        </div>
      ))}
    </div>
  )
}

function PredictionPanel({ data }: { data: ForecastResponse }) {
  const lastHist = data.history[data.history.length - 1]?.price ?? 0
  const baseConfidence = Math.max(
    0.25,
    Math.min(0.95, data.metrics.directional_accuracy * 0.7 + Math.max(0, data.metrics.skill_score) * 0.6 + 0.25)
  )
  return (
    <aside style={{ ...glass, padding: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <Activity size={16} color={VIOLET} />
        <h2 style={{ fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase', color: MUTED, margin: 0 }}>Predictions</h2>
      </div>
      <p style={{ fontSize: 12, color: MUTED, marginBottom: 16 }}>Per-day estimates. Confidence decays the further out we forecast.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {data.forecast.map((p, i) => {
          const delta = p.price - lastHist
          const pct = (delta / lastHist) * 100
          const up = delta >= 0
          const conf = Math.max(0.1, baseConfidence - i * 0.07)
          return (
            <div key={p.date} style={{ borderRadius: 12, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.02)', padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 12, color: MUTED, fontVariantNumeric: 'tabular-nums' }}>
                  T+{i + 1} · {p.date}
                </div>
                <div style={{ fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  ${p.price.toFixed(2)}{' '}
                  <span style={{ fontSize: 12, fontWeight: 600, color: up ? GREEN : RED }}>
                    {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ flex: 1, height: 6, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 99, width: `${(conf * 100).toFixed(0)}%`, background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})` }} />
                </div>
                <span style={{ fontSize: 11, color: MUTED, width: 56, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(conf * 100).toFixed(0)}% conf</span>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 12 }}>
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, padding: 12 }}>
          <div style={{ color: MUTED }}>MAE · model</div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{data.metrics.mae_model.toFixed(3)}</div>
        </div>
        <div style={{ borderRadius: 10, border: `1px solid ${BORDER}`, padding: 12 }}>
          <div style={{ color: MUTED }}>MAE · naive</div>
          <div style={{ marginTop: 2, fontSize: 16, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{data.metrics.mae_naive.toFixed(3)}</div>
        </div>
      </div>
    </aside>
  )
}

/* ---------- Neural diagram (pure SVG, ported) ---------- */
function NeuralDiagram({ layers = [4, 6, 6, 3, 1] }: { layers?: number[] }) {
  const W = 720
  const H = 320
  const padX = 56
  const padY = 28

  const nodes = useMemo(() => {
    const cols = layers.length
    const all: { id: string; x: number; y: number; l: number; i: number }[] = []
    layers.forEach((count, l) => {
      const x = padX + (l * (W - padX * 2)) / (cols - 1)
      const gap = (H - padY * 2) / Math.max(count - 1, 1)
      for (let i = 0; i < count; i++) {
        const y = count === 1 ? H / 2 : padY + i * gap
        all.push({ id: `${l}-${i}`, x, y, l, i })
      }
    })
    return all
  }, [layers])

  const edges = useMemo(() => {
    const out: { id: string; from: (typeof nodes)[number]; to: (typeof nodes)[number] }[] = []
    for (let l = 0; l < layers.length - 1; l++) {
      const a = nodes.filter((n) => n.l === l)
      const b = nodes.filter((n) => n.l === l + 1)
      a.forEach((from) => b.forEach((to) => out.push({ id: `${from.id}->${to.id}`, from, to })))
    }
    return out
  }, [nodes, layers])

  const [hover, setHover] = useState<string | null>(null)
  const [pulseKey, setPulseKey] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setPulseKey((k) => k + 1), 2600)
    return () => clearInterval(id)
  }, [])

  const labels = ['Input', 'Hidden', 'Hidden', 'Hidden', 'Output']

  return (
    <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Neural network architecture">
        <defs>
          <linearGradient id="bs-edge" x1="0" x2="1">
            <stop offset="0%" stopColor={CYAN} stopOpacity="0.35" />
            <stop offset="100%" stopColor={VIOLET} stopOpacity="0.35" />
          </linearGradient>
          <radialGradient id="bs-node">
            <stop offset="0%" stopColor="#cffafe" />
            <stop offset="60%" stopColor={CYAN} />
            <stop offset="100%" stopColor="#0e7490" />
          </radialGradient>
          <radialGradient id="bs-nodeOut">
            <stop offset="0%" stopColor="#ede9fe" />
            <stop offset="60%" stopColor={VIOLET} />
            <stop offset="100%" stopColor="#6d28d9" />
          </radialGradient>
          <filter id="bs-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {layers.map((_, l) => {
          const x = padX + (l * (W - padX * 2)) / (layers.length - 1)
          return (
            <text key={l} x={x} y={14} textAnchor="middle" fontSize="10" fill={MUTED} style={{ letterSpacing: 1.5, textTransform: 'uppercase' }}>
              {labels[l] ?? 'Hidden'}
            </text>
          )
        })}

        {edges.map((e) => {
          const isHot = hover && (e.from.id === hover || e.to.id === hover)
          return (
            <line key={e.id} x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y} stroke={isHot ? CYAN : 'url(#bs-edge)'} strokeOpacity={isHot ? 0.95 : 0.45} strokeWidth={isHot ? 1.2 : 0.7} />
          )
        })}

        {Array.from({ length: Math.min(8, edges.length) }).map((_, i) => {
          const e = edges[(i * 7 + pulseKey * 3) % edges.length]
          const delay = (i * 0.18).toFixed(2)
          return (
            <circle key={`${pulseKey}-${i}`} r="2.4" fill="#ecfeff" filter="url(#bs-glow)">
              <animate attributeName="cx" from={e.from.x} to={e.to.x} dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="cy" from={e.from.y} to={e.to.y} dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0;1;1;0" dur="1.4s" begin={`${delay}s`} repeatCount="indefinite" />
            </circle>
          )
        })}

        {nodes.map((n) => {
          const isOut = n.l === layers.length - 1
          const isHot = hover === n.id
          return (
            <g key={n.id} onMouseEnter={() => setHover(n.id)} onMouseLeave={() => setHover(null)} style={{ cursor: 'pointer' }}>
              <circle cx={n.x} cy={n.y} r={isHot ? 8 : 6} fill={isOut ? 'url(#bs-nodeOut)' : 'url(#bs-node)'} filter="url(#bs-glow)" />
              <circle cx={n.x} cy={n.y} r={isHot ? 12 : 9} fill="none" stroke={isOut ? VIOLET : CYAN} strokeOpacity={isHot ? 0.5 : 0.15} strokeWidth={1} />
            </g>
          )
        })}
      </svg>
      <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: 10, color: MUTED }}>{layers.join(' → ')} · LSTM-style feed-forward</div>
    </div>
  )
}
