'use client'

/**
 * YN Edge — MARKET DETAIL. The deep-dive on one prediction market: the head-to-head,
 * the WORTH IT / PASS verdict with the math made legible, the BrainStock forecast
 * chart (the visual proof the net actually priced it), our reasoning, and either the
 * grounded-search sources or the neural-net underlying panel.
 */

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import Link from 'next/link'
import {
  ResponsiveContainer, AreaChart, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, CartesianGrid,
} from 'recharts'
import {
  ArrowLeft, ArrowRight, Scale, LineChart, BrainCircuit, Newspaper,
  CheckCircle2, XCircle, DollarSign, Target, BarChart3, ExternalLink,
} from 'lucide-react'
import {
  VOID, PANEL, BORDER, CYAN, VIOLET, GREEN, RED, AMBER, TXT, MUTE, FAINT, MONO,
  HeadToHead, WorthBadge, EngineBadge, Tag, Stat, PathRail, TextureBg,
  pct, signedPct, fmtNum, timeToClose, catColor, edgeAccent, useReducedMotion,
  type EdgeRow,
} from '@/components/edge/shared'

// ── panel shell ──────────────────────────────────────────────────────────────
function Panel({ children, glow = CYAN, style }: { children: ReactNode; glow?: string; style?: CSSProperties }) {
  return (
    <div style={{ position: 'relative', background: PANEL, border: `1px solid ${BORDER}`, padding: 'clamp(16px,3vw,24px)', ...style }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${glow}55, transparent)` }} />
      {children}
    </div>
  )
}

function SectionLabel({ children, color = FAINT, icon }: { children: ReactNode; color?: string; icon?: ReactNode }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color, marginBottom: 12 }}>
      {icon && <span style={{ display: 'inline-flex', flexShrink: 0 }}>{icon}</span>}
      {children}
    </div>
  )
}

const WRAP: CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: 'clamp(20px,4vw,40px) clamp(16px,3vw,28px) 80px' }

// ── states ───────────────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={WRAP}>
      <style>{`@keyframes edge-pulse{0%,100%{opacity:.4}50%{opacity:.7}}`}</style>
      <div style={{ display: 'grid', gap: 14 }}>
        {[64, 220, 180, 140].map((h, i) => (
          <div key={i} style={{ height: h, background: PANEL, border: `1px solid ${BORDER}`, animation: 'edge-pulse 1.4s ease-in-out infinite' }} />
        ))}
      </div>
    </div>
  )
}

function NotFound({ msg }: { msg?: string }) {
  return (
    <div style={{ ...WRAP, textAlign: 'center', paddingTop: 'clamp(60px,12vw,120px)' }}>
      <div style={{ fontSize: 'clamp(1.4rem,4vw,2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: TXT }}>Market not found or no longer active</div>
      <div style={{ color: MUTE, marginTop: 12, fontSize: 14 }}>{msg || 'We couldn’t price this market right now.'}</div>
      <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 24, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: CYAN, border: `1px solid ${CYAN}55`, padding: '10px 18px', textDecoration: 'none', borderRadius: 6 }}><ArrowLeft size={14} style={{ flexShrink: 0 }} /> Back to YnKalshi</Link>
    </div>
  )
}

// ── chart ────────────────────────────────────────────────────────────────────
function ForecastChart({ u, reduced }: { u: NonNullable<EdgeRow['pricing']['underlying']>; reduced: boolean }) {
  const chart = u.chart || []
  if (chart.length < 2) return null
  // Split into two series sharing an x-axis so history (solid) flows into forecast (dashed).
  // The last history point is shared so the lines visually connect.
  let lastHistIdx = -1
  for (let i = 0; i < chart.length; i++) if (chart[i].kind === 'history') lastHistIdx = i
  const data = chart.map((p, i) => ({
    date: p.date,
    hist: p.kind === 'history' ? p.price : (i === lastHistIdx + 1 ? chart[lastHistIdx]?.price ?? null : null),
    fc: p.kind === 'forecast' || i === lastHistIdx ? p.price : null,
  }))
  const fmtX = (d: string) => {
    const dt = new Date(d)
    if (Number.isNaN(dt.getTime())) return d
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  const dirColor = u.direction === 'above' ? GREEN : RED
  return (
    <Panel glow={CYAN}>
      <SectionLabel color={CYAN} icon={<LineChart size={14} />}>FORECAST · the net’s path to close</SectionLabel>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
            <defs>
              <linearGradient id="edgeHist" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={CYAN} stopOpacity={0.35} />
                <stop offset="100%" stopColor={CYAN} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke={BORDER} vertical={false} />
            <XAxis dataKey="date" tickFormatter={fmtX} tick={{ fill: FAINT, fontSize: 10, fontFamily: MONO }} stroke={BORDER} minTickGap={28} />
            <YAxis domain={['auto', 'auto']} tick={{ fill: FAINT, fontSize: 10, fontFamily: MONO }} stroke={BORDER} width={56} tickFormatter={(v: number) => fmtNum(v)} />
            <Tooltip
              isAnimationActive={!reduced}
              contentStyle={{ background: VOID, border: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: 11, color: TXT }}
              labelFormatter={(l) => fmtX(String(l))}
              formatter={(val, name) => [typeof val === 'number' ? val.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—', name === 'hist' ? 'History' : 'Forecast']}
            />
            <ReferenceLine
              y={u.strike}
              stroke={AMBER}
              strokeDasharray="5 4"
              label={{ value: `STRIKE ${fmtNum(u.strike)}`, position: 'insideTopRight', fill: AMBER, fontSize: 10, fontFamily: MONO }}
            />
            <Area type="monotone" dataKey="hist" stroke={CYAN} strokeWidth={2} fill="url(#edgeHist)" isAnimationActive={!reduced} connectNulls dot={false} />
            <Line type="monotone" dataKey="fc" stroke={VIOLET} strokeWidth={2} strokeDasharray="6 5" isAnimationActive={!reduced} connectNulls dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ marginTop: 12, fontSize: 13, color: MUTE, lineHeight: 1.6 }}>
        BrainStock forecasts <b style={{ color: TXT }}>{u.name}</b> → <b style={{ color: dirColor, fontFamily: MONO }}>{fmtNum(u.expectedPrice)}</b> by close;
        strike <span style={{ fontFamily: MONO, color: AMBER }}>{fmtNum(u.strike)}</span> (<b style={{ color: dirColor }}>{u.direction}</b>).
        σ=<span style={{ fontFamily: MONO, color: TXT }}>{u.sigma.toFixed(3)}</span>.
      </div>
    </Panel>
  )
}

// ── math row ─────────────────────────────────────────────────────────────────
function MathRow({ label, value, formula, color = TXT, strong, icon }: { label: string; value: ReactNode; formula?: string; color?: string; strong?: boolean; icon?: ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, padding: '11px 0', borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: strong ? 13.5 : 13, fontWeight: strong ? 700 : 500, color: strong ? TXT : MUTE }}>
          {icon && <span style={{ display: 'inline-flex', flexShrink: 0, color: `${color}cc` }}>{icon}</span>}
          {label}
        </div>
        {formula && <div style={{ fontFamily: MONO, fontSize: 10.5, color: FAINT, marginTop: 3 }}>{formula}</div>}
      </div>
      <div style={{ fontFamily: MONO, fontSize: strong ? 17 : 15, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{value}</div>
    </div>
  )
}

// ── main ─────────────────────────────────────────────────────────────────────
export default function MarketDetailClient({ ticker }: { ticker: string }) {
  const reduced = useReducedMotion()
  const [row, setRow] = useState<EdgeRow | null>(null)
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errMsg, setErrMsg] = useState<string>()

  useEffect(() => {
    let alive = true
    setStatus('loading')
    fetch(`/api/edge/market/${encodeURIComponent(ticker)}`)
      .then(async (r) => {
        const j = await r.json().catch(() => ({}))
        if (!alive) return
        if (!r.ok || (j && j.error) || !j?.market) {
          setErrMsg(typeof j?.error === 'string' ? j.error : undefined)
          setStatus('error')
          return
        }
        setRow(j as EdgeRow)
        setStatus('ok')
      })
      .catch((e) => {
        if (!alive) return
        setErrMsg(e instanceof Error ? e.message : undefined)
        setStatus('error')
      })
    return () => { alive = false }
  }, [ticker])

  if (status === 'loading') return <Skeleton />
  if (status === 'error' || !row) return <NotFound msg={errMsg} />

  const { market, pricing, verdict, pricedAt } = row
  const cat = catColor(market.category)
  const accent = verdict.worthIt ? GREEN : edgeAccent(verdict.edge)
  const winPerDollar = verdict.marketProb > 0 ? 1 / verdict.marketProb - 1 : 0 // payout per $1 if our side wins
  const closeAbs = (() => {
    const d = new Date(market.closeTime)
    return Number.isNaN(d.getTime()) ? market.closeTime : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  })()
  const pricedAbs = (() => {
    const d = new Date(pricedAt)
    return Number.isNaN(d.getTime()) ? pricedAt : d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
  })()
  const u = pricing.underlying

  return (
    <div style={WRAP}>
      <style>{`@media (max-width:760px){.edge-grid2{grid-template-columns:1fr !important}}`}</style>

      {/* ── PATH / BREADCRUMB ───────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', marginBottom: 'clamp(16px,2.5vw,24px)', paddingBottom: 14, borderBottom: `1px solid ${BORDER}` }}>
        <PathRail active="detail" />
        <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: MUTE, textDecoration: 'none' }}>
          <ArrowLeft size={13} style={{ flexShrink: 0 }} /> Back to board
        </Link>
      </div>

      {/* ── HEADER ───────────────────────────────────────────────────────── */}
      <div style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', border: `1px solid ${BORDER}`, background: `linear-gradient(160deg, ${accent}10, transparent 60%)`, padding: 'clamp(18px,3vw,30px)' }}>
        <TextureBg seed={`ynedge-mkt-${market.ticker}`} opacity={0.12} overlay={`linear-gradient(130deg, ${VOID}f2 40%, ${VOID}d8)`} />
        <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
        <div style={{ position: 'relative' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <Tag color={cat}>{market.category}</Tag>
            <EngineBadge engine={pricing.engine} />
            <Tag color={FAINT}>{market.source === 'kalshi' ? 'KALSHI · LIVE' : 'SEED'}</Tag>
            <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.06em' }}>{decodeURIComponent(market.ticker)}</span>
            <span style={{ marginLeft: 'auto' }}><WorthBadge worthIt={verdict.worthIt} /></span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.5rem,4.2vw,2.6rem)', fontWeight: 800, letterSpacing: '-0.025em', lineHeight: 1.12, color: TXT, margin: 0 }}>{market.title}</h1>
          {market.subtitle && <div style={{ color: MUTE, marginTop: 8, fontSize: 'clamp(0.95rem,2vw,1.05rem)' }}>{market.subtitle}</div>}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'clamp(16px,4vw,40px)', marginTop: 20, alignItems: 'flex-end' }}>
            <Stat label="Closes" value={timeToClose(market.closeTime)} color={CYAN} sub={closeAbs} />
            <Stat label="Volume" value={fmtNum(market.volume)} sub="contracts" />
            {market.openInterest != null && <Stat label="Open interest" value={fmtNum(market.openInterest)} />}
            <Stat label="Priced" value={<span style={{ fontSize: '1rem', color: MUTE }}>{pricedAbs}</span>} />
          </div>
        </div>
      </div>

      {/* ── HEAD-TO-HEAD ─────────────────────────────────────────────────── */}
      <Panel glow={CYAN} style={{ marginTop: 24 }}>
        <SectionLabel icon={<Scale size={14} />}>AI vs MARKET · P(YES)</SectionLabel>
        <HeadToHead ynProb={pricing.ynProb} marketProb={market.yesPrice} animate={!reduced} height={34} />
      </Panel>

      {/* ── VERDICT + MATH ───────────────────────────────────────────────── */}
      <Panel glow={accent} style={{ marginTop: 18, borderColor: `${accent}40` }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 8 }}>
          <SectionLabel color={accent} icon={<Target size={14} />}>VERDICT · is it worth it</SectionLabel>
          <WorthBadge worthIt={verdict.worthIt} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-display), system-ui, sans-serif', fontSize: 'clamp(1.3rem,3vw,1.9rem)', fontWeight: 800, letterSpacing: '-0.02em', color: accent }}>
            {verdict.worthIt
              ? <CheckCircle2 size={26} strokeWidth={2.2} style={{ flexShrink: 0 }} />
              : <XCircle size={26} strokeWidth={2.2} style={{ flexShrink: 0 }} />}
            {verdict.worthIt ? 'Worth a bet' : 'Pass for now'}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.1em' }}>· OUR SIDE</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: verdict.side === 'YES' ? GREEN : RED }}>{verdict.side}</span>
        </div>
        <div style={{ fontSize: 14, color: TXT, lineHeight: 1.6, marginBottom: 18 }}>{verdict.reason}</div>

        <div style={{ background: 'rgba(0,0,0,.25)', border: `1px solid ${BORDER}`, padding: 'clamp(12px,2.5vw,18px)' }}>
          <MathRow label={`Our P(${verdict.side})`} value={pct(verdict.ynProb, 1)} formula="BrainStock / grounded estimate" color={CYAN} />
          <MathRow label="Market price" value={pct(verdict.marketProb, 1)} formula={`what you pay per $1 on ${verdict.side}`} color={MUTE} />
          <MathRow label="Edge" value={`${signedPct(verdict.edge, 1)}pt`} formula="edge = ours − market" color={verdict.edge >= 0 ? GREEN : RED} strong icon={<Target size={15} />} />
          <MathRow
            label="EV per $1"
            value={`${verdict.evPerDollar >= 0 ? '+' : ''}$${verdict.evPerDollar.toFixed(3)}`}
            formula={`EV/$ = p/price − 1 · win → +$${winPerDollar.toFixed(2)}, lose → −$1`}
            color={verdict.evPerDollar >= 0 ? GREEN : RED}
            strong
            icon={<DollarSign size={15} />}
          />
          <MathRow label="Full Kelly" value={pct(verdict.kelly, 1)} formula="f* = edge / odds" color={TXT} />
          <MathRow label="Half-Kelly · suggested stake" value={pct(verdict.halfKelly, 1)} formula="we never stake full Kelly" color={AMBER} strong icon={<Scale size={15} />} />
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, paddingTop: 11 }}>
            <div style={{ fontSize: 13, color: MUTE }}>Confidence</div>
            <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, color: TXT, fontVariantNumeric: 'tabular-nums' }}>{pct(verdict.confidence, 0)}</div>
          </div>
        </div>
      </Panel>

      {/* ── FORECAST CHART (NN only) ─────────────────────────────────────── */}
      {u?.chart && u.chart.length >= 2 && (
        <div style={{ marginTop: 18 }}>
          <ForecastChart u={u} reduced={reduced} />
        </div>
      )}

      {/* ── REASONING + (SOURCES | UNDERLYING) ───────────────────────────── */}
      <div className="edge-grid2" style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginTop: 18 }}>
        <Panel glow={VIOLET}>
          <SectionLabel color={VIOLET} icon={<BrainCircuit size={14} />}>WHY · the AI’s read</SectionLabel>
          <div style={{ fontSize: 'clamp(0.95rem,2vw,1.05rem)', color: TXT, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{pricing.reasoning}</div>
        </Panel>

        {pricing.sources && pricing.sources.length > 0 ? (
          <Panel glow={VIOLET}>
            <SectionLabel color={VIOLET} icon={<Newspaper size={14} />}>SOURCES · live search grounding</SectionLabel>
            <div style={{ display: 'grid', gap: 10 }}>
              {pricing.sources.map((s, i) => (
                <a key={i} href={s.url} target="_blank" rel="noreferrer noopener"
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: CYAN, textDecoration: 'none', lineHeight: 1.5, borderLeft: `2px solid ${VIOLET}55`, paddingLeft: 10 }}>
                  <ExternalLink size={13} style={{ flexShrink: 0, marginTop: 3, color: VIOLET }} />
                  <span style={{ minWidth: 0 }}>
                    {s.title || s.url}
                    <span style={{ display: 'block', fontFamily: MONO, fontSize: 10, color: FAINT, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.url}</span>
                  </span>
                </a>
              ))}
            </div>
          </Panel>
        ) : u ? (
          <Panel glow={CYAN}>
            <SectionLabel color={CYAN} icon={<BarChart3 size={14} />}>UNDERLYING · what the net priced</SectionLabel>
            <div style={{ display: 'grid', gap: 13 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: MONO, fontSize: 16, fontWeight: 800, color: TXT }}>{u.symbol}</span>
                <span style={{ fontSize: 12, color: MUTE }}>{u.name}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 13 }}>
                <Stat label="Last price" value={<span style={{ fontFamily: MONO }}>{fmtNum(u.lastPrice)}</span>} />
                <Stat label="Expected @ close" value={<span style={{ fontFamily: MONO }}>{fmtNum(u.expectedPrice)}</span>} color={u.direction === 'above' ? GREEN : RED} />
                <Stat label="Strike" value={<span style={{ fontFamily: MONO }}>{fmtNum(u.strike)}</span>} color={AMBER} sub={u.direction} />
                <Stat label="σ (to close)" value={<span style={{ fontFamily: MONO }}>{u.sigma.toFixed(3)}</span>} />
                <Stat label="Trading days" value={<span style={{ fontFamily: MONO }}>{u.businessDays}</span>} />
                {u.skillScore != null && <Stat label="Skill score" value={<span style={{ fontFamily: MONO }}>{u.skillScore.toFixed(2)}</span>} color={CYAN} />}
              </div>
            </div>
          </Panel>
        ) : null}
      </div>

      {/* ── PATH FOOTER ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 'clamp(28px,4vw,40px)', paddingTop: 18, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, textDecoration: 'none' }}><ArrowLeft size={14} style={{ flexShrink: 0 }} /> All markets</Link>
        <Link href="/edge/track-record" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: GREEN, textDecoration: 'none' }}>How we grade ourselves <ArrowRight size={14} style={{ flexShrink: 0 }} /></Link>
      </div>
    </div>
  )
}
