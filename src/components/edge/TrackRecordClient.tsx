'use client'

/**
 * YN Edge — the public, un-cherry-picked report card. We log OUR probability the
 * moment we price a market; when Kalshi settles it we grade ourselves: Brier
 * score, calibration curve, hit rate, and the realized ROI of the picks we
 * flagged WORTH IT. This page is the moat: accountability in public.
 */
import { useEffect, useState, type ReactNode } from 'react'
import {
  ResponsiveContainer, ComposedChart, Scatter, XAxis, YAxis, ZAxis,
  ReferenceLine, Tooltip, CartesianGrid, Line,
} from 'recharts'
import {
  VOID, PANEL, BORDER, CYAN, VIOLET, GREEN, RED, AMBER, TXT, MUTE, FAINT, MONO,
  Tag, Stat, WorthBadge, pct, fmtNum, catColor, useReducedMotion,
} from '@/components/edge/shared'

// ── data shape (mirrors GET /api/edge/track-record) ──────────────────────────
interface CalibPoint { bucket: number; predicted: number; actual: number; n: number }
interface RecentRow {
  title: string; category: string; side: string; ynProb: number; marketProb: number
  result: string; brier: number; worthIt: boolean; pnl: number; resolvedAt: string | null
}
interface TrackStats {
  ready: boolean
  graded: number
  worthItGraded: number
  brier: number | null
  brierSkill: number | null
  hitRate: number | null
  worthItHitRate: number | null
  worthItRoi: number | null
  calibration: CalibPoint[]
  recent: RecentRow[]
  note?: string
}

const WRAP: React.CSSProperties = { maxWidth: 1100, margin: '0 auto', padding: 'clamp(40px,7vw,84px) clamp(16px,3vw,28px) 80px' }

export default function TrackRecordClient() {
  const reduced = useReducedMotion()
  const [stats, setStats] = useState<TrackStats | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let alive = true
    setError(false)
    fetch('/api/edge/track-record', { cache: 'no-store' })
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json() })
      .then((d: TrackStats) => { if (alive) setStats(d) })
      .catch(() => { if (alive) setError(true) })
    return () => { alive = false }
  }, [])

  if (error) return <Shell><ErrorState onRetry={() => location.reload()} /></Shell>
  if (!stats) return <Shell><Skeleton /></Shell>

  return (
    <Shell>
      <Hero stats={stats} />
      {!stats.ready
        ? <NotReady note={stats.note} />
        : (
          <>
            <Calibration data={stats.calibration} reduced={reduced} />
            <WorthItScoreboard stats={stats} />
            <RecentList rows={stats.recent} />
          </>
        )}
      <Footnote />
    </Shell>
  )
}

function Shell({ children }: { children: ReactNode }) {
  return <div style={WRAP}>{children}</div>
}

// ── HERO ─────────────────────────────────────────────────────────────────────
function Hero({ stats }: { stats: TrackStats }) {
  const skillPos = (stats.brierSkill ?? 0) > 0
  const roiPos = (stats.worthItRoi ?? 0) >= 0
  return (
    <header>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.28em', textTransform: 'uppercase', color: GREEN, marginBottom: 18 }}>
        // un-cherry-picked report card
      </div>
      <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(2.2rem,6vw,4.4rem)', lineHeight: 0.99, margin: 0 }}>
        We grade ourselves <span style={{ color: GREEN }}>in public.</span>
      </h1>
      <p style={{ marginTop: 18, fontSize: 'clamp(1rem,1.6vw,1.18rem)', color: MUTE, lineHeight: 1.6, maxWidth: 660 }}>
        We log our probability for every market the moment we price it. When Kalshi resolves it, we score the call —
        Brier, hit rate, and the realized ROI of the picks we flagged worth it. No deleting the losers.
      </p>

      <div style={{ marginTop: 'clamp(30px,5vw,52px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 'clamp(18px,3vw,34px)', alignItems: 'start' }}>
        <Stat label="markets graded" value={stats.ready ? fmtNum(stats.graded) : '—'} color={CYAN} />
        <Stat
          label="brier score"
          value={stats.brier != null ? stats.brier.toFixed(3) : '—'}
          color={TXT}
          sub="lower is better · 0.25 = coin flip"
        />
        <Stat
          label="brier skill"
          value={stats.brierSkill != null ? `${skillPos ? '+' : ''}${(stats.brierSkill * 100).toFixed(1)}%` : '—'}
          color={stats.brierSkill == null ? MUTE : skillPos ? GREEN : RED}
          sub=">0 beats a coin flip"
        />
        <Stat
          label="hit rate"
          value={stats.hitRate != null ? `${stats.hitRate.toFixed(1)}%` : '—'}
          color={TXT}
          sub="our chosen side won"
        />
        <Stat
          label="worth-it roi"
          value={stats.worthItRoi != null ? `${roiPos ? '+' : ''}${stats.worthItRoi.toFixed(1)}%` : '—'}
          color={stats.worthItRoi == null ? MUTE : roiPos ? GREEN : RED}
          sub="realized P&L per $1"
        />
      </div>
    </header>
  )
}

// ── CALIBRATION (centerpiece) ────────────────────────────────────────────────
function Calibration({ data, reduced }: { data: CalibPoint[]; reduced: boolean }) {
  const points = data.map((d) => ({ ...d }))
  const hasData = points.length > 0
  const diag = [{ predicted: 0, perfect: 0 }, { predicted: 1, perfect: 1 }]

  return (
    <section style={{ marginTop: 'clamp(44px,6vw,72px)' }}>
      <SectionHead
        kicker="// the calibration curve"
        title="Do our 70% calls happen 70% of the time?"
        blurb="X is the probability we assigned. Y is how often it actually resolved YES. A point sitting ON the diagonal means we were perfectly calibrated — when we say 70%, it happens 70% of the time. Below the line = overconfident; above = underconfident. Bigger dots = more calls in that bucket."
      />
      <Panel glow={GREEN} style={{ padding: 'clamp(16px,3vw,26px) clamp(8px,2vw,18px) clamp(12px,2vw,18px)' }}>
        {hasData ? (
          <div style={{ width: '100%', height: 340 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart margin={{ top: 12, right: 18, bottom: 26, left: 4 }}>
                <CartesianGrid stroke={BORDER} strokeDasharray="2 4" />
                <XAxis
                  type="number" dataKey="predicted" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(v: number) => pct(v)} stroke={FAINT}
                  tick={{ fill: MUTE, fontSize: 11, fontFamily: MONO }}
                  label={{ value: 'OUR PREDICTED PROBABILITY', position: 'insideBottom', offset: -14, fill: FAINT, fontSize: 10, fontFamily: MONO, letterSpacing: '0.12em' }}
                />
                <YAxis
                  type="number" dataKey="actual" domain={[0, 1]} ticks={[0, 0.25, 0.5, 0.75, 1]}
                  tickFormatter={(v: number) => pct(v)} stroke={FAINT}
                  tick={{ fill: MUTE, fontSize: 11, fontFamily: MONO }}
                  label={{ value: 'ACTUAL YES RATE', angle: -90, position: 'insideLeft', offset: 14, fill: FAINT, fontSize: 10, fontFamily: MONO, letterSpacing: '0.12em', style: { textAnchor: 'middle' } }}
                />
                <ZAxis type="number" dataKey="n" range={[60, 520]} name="calls" />
                <ReferenceLine
                  segment={[{ x: 0, y: 0 }, { x: 1, y: 1 }]}
                  stroke={MUTE} strokeDasharray="5 5" ifOverflow="extendDomain"
                />
                <Line
                  data={diag} dataKey="perfect" type="linear" dot={false} legendType="none"
                  stroke="transparent" isAnimationActive={false}
                />
                <Tooltip
                  cursor={{ stroke: GREEN, strokeOpacity: 0.3 }}
                  content={<CalibTip />}
                />
                <Scatter
                  data={points} fill={GREEN} fillOpacity={0.55} stroke={GREEN} strokeWidth={1.5}
                  isAnimationActive={!reduced}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div style={{ padding: '40px 8px', textAlign: 'center', color: MUTE, fontSize: 14 }}>
            No resolved calls in any probability bucket yet.
          </div>
        )}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}`, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.04em', color: FAINT }}>
          <Legend swatch={GREEN} round>each dot = one decile · size = # of calls</Legend>
          <Legend swatch={MUTE} dash>dashed diagonal = perfect calibration</Legend>
          <span>points on the line = our 70% calls happen 70% of the time</span>
        </div>
      </Panel>
    </section>
  )
}

function CalibTip({ active, payload }: { active?: boolean; payload?: { payload: CalibPoint }[] }) {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  const gap = p.actual - p.predicted
  return (
    <div style={{ background: 'rgba(6,7,12,.94)', border: `1px solid ${BORDER}`, padding: '10px 12px', fontFamily: MONO, fontSize: 11.5, color: TXT, minWidth: 150 }}>
      <div style={{ color: GREEN, letterSpacing: '0.1em', marginBottom: 6 }}>BUCKET {pct(p.bucket / 10)}–{pct((p.bucket + 1) / 10)}</div>
      <Row k="we said" v={pct(p.predicted, 1)} />
      <Row k="happened" v={pct(p.actual, 1)} />
      <Row k="miss" v={`${gap >= 0 ? '+' : ''}${(gap * 100).toFixed(1)}pt`} c={Math.abs(gap) < 0.06 ? GREEN : AMBER} />
      <Row k="n calls" v={String(p.n)} />
    </div>
  )
}

function Row({ k, v, c = TXT }: { k: string; v: string; c?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, lineHeight: 1.7 }}>
      <span style={{ color: FAINT }}>{k}</span><span style={{ color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</span>
    </div>
  )
}

function Legend({ children, swatch, round, dash }: { children: ReactNode; swatch: string; round?: boolean; dash?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
      {dash
        ? <span style={{ width: 18, height: 0, borderTop: `2px dashed ${swatch}`, display: 'inline-block' }} />
        : <span style={{ width: 11, height: 11, borderRadius: round ? '50%' : 2, background: `${swatch}88`, border: `1.5px solid ${swatch}` }} />}
      {children}
    </span>
  )
}

// ── WORTH-IT SCOREBOARD ──────────────────────────────────────────────────────
function WorthItScoreboard({ stats }: { stats: TrackStats }) {
  const roiPos = (stats.worthItRoi ?? 0) >= 0
  const any = stats.worthItGraded > 0
  return (
    <section style={{ marginTop: 'clamp(44px,6vw,72px)' }}>
      <SectionHead
        kicker="// the real-money claim"
        title="The picks we flagged worth it"
        blurb="A market is only WORTH IT when our edge over the market price clears our bar. This is the bet we'd actually place — so it's the number that matters. Graded honestly, winners and losers."
      />
      <Panel glow={GREEN} style={{ padding: 'clamp(20px,3vw,30px)' }}>
        {any ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 'clamp(18px,3vw,32px)' }}>
            <Stat label="worth-it calls graded" value={fmtNum(stats.worthItGraded)} color={CYAN} />
            <Stat
              label="hit rate"
              value={stats.worthItHitRate != null ? `${stats.worthItHitRate.toFixed(1)}%` : '—'}
              color={TXT} sub="our side won"
            />
            <Stat
              label="realized roi"
              value={stats.worthItRoi != null ? `${roiPos ? '+' : ''}${stats.worthItRoi.toFixed(1)}%` : '—'}
              color={stats.worthItRoi == null ? MUTE : roiPos ? GREEN : RED}
              sub="mean P&L per $1 staked"
            />
            <Stat
              label="share of all calls"
              value={stats.graded ? pct(stats.worthItGraded / stats.graded) : '—'}
              color={VIOLET} sub="we pass on most markets"
            />
          </div>
        ) : (
          <p style={{ margin: 0, color: MUTE, fontSize: 14, lineHeight: 1.6 }}>
            No worth-it picks have settled yet. We only flag a market when our edge clears the bar — and we&apos;d rather post nothing than pad the record.
          </p>
        )}
      </Panel>
    </section>
  )
}

// ── RECENT GRADED LIST (the receipts) ────────────────────────────────────────
function RecentList({ rows }: { rows: RecentRow[] }) {
  return (
    <section style={{ marginTop: 'clamp(44px,6vw,72px)' }}>
      <SectionHead kicker="// the receipts" title="Recently graded" blurb="The last calls to settle — our probability vs the market's, the result, and what it paid. Click into /edge to see how each was priced." />
      {rows.length === 0 ? (
        <Panel glow={CYAN} style={{ padding: 28, textAlign: 'center', color: MUTE, fontSize: 14 }}>Nothing graded yet.</Panel>
      ) : (
        <>
          {/* desktop table */}
          <div className="tr-table" style={{ overflowX: 'auto', border: `1px solid ${BORDER}`, background: PANEL }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left' }}>
                  {['Market', 'Cat', 'Side', 'Ours', 'Mkt', 'Result', 'Brier', 'Verdict', 'P&L', 'Resolved'].map((h, i) => (
                    <th key={h} style={{ ...THC, textAlign: i >= 3 && i <= 8 ? 'right' : 'left' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => <RowDesk key={i} r={r} />)}
              </tbody>
            </table>
          </div>
          {/* mobile cards */}
          <div className="tr-cards" style={{ display: 'none', flexDirection: 'column', gap: 1, background: BORDER, border: `1px solid ${BORDER}` }}>
            {rows.map((r, i) => <RowCard key={i} r={r} />)}
          </div>
        </>
      )}
      <style>{`
        @media (max-width: 720px) {
          .tr-table { display: none; }
          .tr-cards { display: flex !important; }
        }
      `}</style>
    </section>
  )
}

const THC: React.CSSProperties = { padding: '11px 12px', fontFamily: MONO, fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: FAINT, borderBottom: `1px solid ${BORDER}`, whiteSpace: 'nowrap' }
const TDC: React.CSSProperties = { padding: '11px 12px', borderBottom: `1px solid ${BORDER}`, color: TXT, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }

function ResultPill({ result }: { result: string }) {
  const yes = result === 'yes'
  const c = yes ? GREEN : RED
  return <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: c, letterSpacing: '0.08em' }}>{yes ? 'YES' : 'NO'}</span>
}

function pnlColor(pnl: number) { return pnl >= 0 ? GREEN : RED }
function pnlLabel(pnl: number) { return `${pnl >= 0 ? '+' : ''}${(pnl * 100).toFixed(0)}%` }
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function RowDesk({ r }: { r: RecentRow }) {
  return (
    <tr>
      <td style={{ ...TDC, whiteSpace: 'normal', maxWidth: 260, color: TXT }}>{r.title}</td>
      <td style={TDC}><Tag color={catColor(r.category)} style={{ fontSize: 9 }}>{r.category}</Tag></td>
      <td style={{ ...TDC, fontFamily: MONO, color: r.side === 'YES' ? CYAN : VIOLET }}>{r.side}</td>
      <td style={{ ...TDC, textAlign: 'right', fontFamily: MONO }}>{pct(r.ynProb)}</td>
      <td style={{ ...TDC, textAlign: 'right', fontFamily: MONO, color: MUTE }}>{pct(r.marketProb)}</td>
      <td style={{ ...TDC, textAlign: 'right' }}><ResultPill result={r.result} /></td>
      <td style={{ ...TDC, textAlign: 'right', fontFamily: MONO, color: MUTE }}>{r.brier.toFixed(3)}</td>
      <td style={{ ...TDC, textAlign: 'right' }}>{r.worthIt ? <WorthBadge worthIt /> : <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT }}>PASS</span>}</td>
      <td style={{ ...TDC, textAlign: 'right', fontFamily: MONO, fontWeight: 700, color: pnlColor(r.pnl) }}>{pnlLabel(r.pnl)}</td>
      <td style={{ ...TDC, fontFamily: MONO, color: FAINT }}>{fmtDate(r.resolvedAt)}</td>
    </tr>
  )
}

function RowCard({ r }: { r: RecentRow }) {
  return (
    <div style={{ background: VOID, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <span style={{ fontSize: 14, color: TXT, lineHeight: 1.4 }}>{r.title}</span>
        <span style={{ fontFamily: MONO, fontWeight: 700, color: pnlColor(r.pnl), fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{pnlLabel(r.pnl)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <Tag color={catColor(r.category)} style={{ fontSize: 9 }}>{r.category}</Tag>
        {r.worthIt ? <WorthBadge worthIt /> : <span style={{ fontFamily: MONO, fontSize: 10, color: FAINT }}>PASS</span>}
        <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT, marginLeft: 'auto' }}>{fmtDate(r.resolvedAt)}</span>
      </div>
      <div style={{ display: 'flex', gap: 18, fontFamily: MONO, fontSize: 12, color: MUTE, fontVariantNumeric: 'tabular-nums', flexWrap: 'wrap' }}>
        <span>side <b style={{ color: r.side === 'YES' ? CYAN : VIOLET }}>{r.side}</b></span>
        <span>ours <b style={{ color: TXT }}>{pct(r.ynProb)}</b></span>
        <span>mkt <b style={{ color: TXT }}>{pct(r.marketProb)}</b></span>
        <span>result <ResultPill result={r.result} /></span>
        <span>brier <b style={{ color: TXT }}>{r.brier.toFixed(3)}</b></span>
      </div>
    </div>
  )
}

// ── NOT-READY STATE ──────────────────────────────────────────────────────────
const STEPS: [string, string][] = [
  ['We log it', 'The instant we price a market, our probability is timestamped and written to the public ledger — before anyone knows the outcome. No editing after the fact.'],
  ['Kalshi settles', 'When the market resolves on Kalshi, we pull the official outcome. Every open call we ever logged gets graded against ground truth — winners and losers alike.'],
  ['We publish', 'Each settlement updates this page: mean Brier score, the calibration curve, hit rate, and the realized ROI of the picks we flagged worth it. Un-cherry-picked.'],
]

function NotReady({ note }: { note?: string }) {
  return (
    <section style={{ marginTop: 'clamp(40px,6vw,64px)' }}>
      <Panel glow={GREEN} style={{ padding: 'clamp(24px,4vw,40px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: AMBER, boxShadow: `0 0 12px ${AMBER}` }} />
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: AMBER }}>tracking · awaiting first settlement</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.035em', fontSize: 'clamp(1.6rem,4vw,2.6rem)', lineHeight: 1.04, margin: 0 }}>
          The track record activates as markets resolve.
        </h2>
        <p style={{ marginTop: 14, fontSize: 'clamp(1rem,1.5vw,1.12rem)', color: MUTE, lineHeight: 1.6, maxWidth: 640 }}>
          We&apos;re already logging our probability on every market we price. The scoreboard fills in the moment Kalshi
          starts settling them — and from then on it only ever grows, losers included. Here&apos;s exactly how the grading works.
        </p>

        <div style={{ marginTop: 'clamp(24px,4vw,36px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 1, background: BORDER, border: `1px solid ${BORDER}` }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ background: VOID, padding: 'clamp(18px,3vw,26px)' }}>
              <div style={{ fontFamily: MONO, fontSize: 12, color: GREEN }}>0{i + 1}</div>
              <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, fontSize: '1.25rem', margin: '8px 0 7px', color: TXT }}>{t}</div>
              <p style={{ fontSize: 13.5, color: MUTE, lineHeight: 1.6, margin: 0 }}>{d}</p>
            </div>
          ))}
        </div>

        {/* what we'll publish */}
        <div style={{ marginTop: 'clamp(24px,4vw,32px)', display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {['Mean Brier score', 'Calibration curve', 'Hit rate', 'Worth-it ROI'].map((m) => (
            <Tag key={m} color={GREEN}>{m}</Tag>
          ))}
        </div>

        {note && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: `1px solid ${BORDER}`, display: 'flex', gap: 10, alignItems: 'flex-start', fontFamily: MONO, fontSize: 12.5, color: FAINT, lineHeight: 1.6 }}>
            <span style={{ color: GREEN }}>›</span><span>{note}</span>
          </div>
        )}
      </Panel>
    </section>
  )
}

// ── shared bits ──────────────────────────────────────────────────────────────
function Panel({ children, glow = GREEN, style }: { children: ReactNode; glow?: string; style?: React.CSSProperties }) {
  return (
    <div style={{ position: 'relative', background: PANEL, border: `1px solid ${BORDER}`, backdropFilter: 'blur(10px)', ...style }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${glow}55, transparent)` }} />
      {children}
    </div>
  )
}

function SectionHead({ kicker, title, blurb }: { kicker: string; title: string; blurb: string }) {
  return (
    <div style={{ marginBottom: 'clamp(16px,2.5vw,24px)', maxWidth: 720 }}>
      <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.2em', textTransform: 'uppercase', color: GREEN, marginBottom: 10 }}>{kicker}</div>
      <h2 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.4rem,3.4vw,2.1rem)', lineHeight: 1.06, margin: 0 }}>{title}</h2>
      <p style={{ marginTop: 10, fontSize: 14, color: MUTE, lineHeight: 1.6 }}>{blurb}</p>
    </div>
  )
}

function Footnote() {
  return (
    <p style={{ marginTop: 'clamp(40px,6vw,60px)', fontSize: 12, color: FAINT, lineHeight: 1.7 }}>
      Brier score = mean squared error of our probability vs the binary outcome (0 or 1); lower is better, 0.25 is a coin flip.
      Brier skill = 1 − brier ÷ 0.25, the % we beat a coin flip by. ROI is realized P&amp;L per $1 staked at the market price we
      logged, on the side we flagged worth it. Every settled call is included — nothing is removed. Educational, not financial advice.
    </p>
  )
}

// ── skeleton / error ─────────────────────────────────────────────────────────
function Skeleton() {
  return (
    <div style={{ animation: 'tr-pulse 1.4s ease-in-out infinite' }}>
      <style>{`@keyframes tr-pulse{0%,100%{opacity:.5}50%{opacity:.85}}`}</style>
      <Bar w="46%" h={42} />
      <Bar w="70%" h={20} mt={20} />
      <div style={{ display: 'flex', gap: 28, marginTop: 40, flexWrap: 'wrap' }}>
        {Array.from({ length: 5 }).map((_, i) => <div key={i} style={{ flex: '1 1 120px' }}><Bar w="60%" h={28} /><Bar w="80%" h={10} mt={8} /></div>)}
      </div>
      <Bar w="100%" h={340} mt={48} />
      <Bar w="100%" h={180} mt={32} />
    </div>
  )
}

function Bar({ w, h, mt = 0 }: { w: string; h: number; mt?: number }) {
  return <div style={{ width: w, height: h, marginTop: mt, background: 'rgba(255,255,255,.06)', border: `1px solid ${BORDER}`, borderRadius: 4 }} />
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Panel glow={RED} style={{ padding: 'clamp(28px,5vw,44px)', marginTop: 40, textAlign: 'center' }}>
      <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: RED, marginBottom: 12 }}>// signal lost</div>
      <h2 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, fontSize: 'clamp(1.4rem,3.4vw,2rem)', margin: 0 }}>Couldn&apos;t load the track record.</h2>
      <p style={{ marginTop: 12, color: MUTE, fontSize: 14 }}>The report card endpoint didn&apos;t answer. Nothing is hidden — just unreachable right now.</p>
      <button onClick={onRetry} style={{ marginTop: 20, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', color: TXT, background: 'transparent', border: `1px solid ${BORDER}`, padding: '10px 20px', borderRadius: 4, cursor: 'pointer' }}>Retry</button>
    </Panel>
  )
}
