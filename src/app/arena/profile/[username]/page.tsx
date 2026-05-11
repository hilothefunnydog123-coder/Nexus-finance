'use client'

import { useMemo } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, TrendingUp, Award, Users, Zap, Crown } from 'lucide-react'

// ── Design tokens ────────────────────────────────────────────────────────────
const T = {
  bg:      '#02030a',
  surface: '#070c16',
  border:  '#0f1e38',
  primary: '#00ffa3',
  gold:    '#ffcc00',
  purple:  '#8855ff',
  orange:  '#ff7700',
  red:     '#ff2244',
  blue:    '#0088ff',
  text:    '#e8eaf0',
  muted:   '#4a5e7a',
} as const

// ── Trader data ───────────────────────────────────────────────────────────────
interface TraderData {
  name:        string
  color:       string
  wr:          number
  earned:      number
  bestFinish:  number
  streak:      number
  tournaments: number
  bio:         string
}

const TRADERS: Record<string, TraderData> = {
  'marcus-t': {
    name: 'Marcus T.', color: '#ffcc00',
    wr: 67, earned: 4280, bestFinish: 1, streak: 5, tournaments: 48,
    bio: 'Day trader. Gap & Go specialist. 5-tournament win streak.',
  },
  'sarah-k': {
    name: 'Sarah K.', color: '#00ffa3',
    wr: 62, earned: 2410, bestFinish: 1, streak: 4, tournaments: 31,
    bio: 'Options flow and momentum. Consistently top 5.',
  },
  'devon-p': {
    name: 'Devon P.', color: '#0088ff',
    wr: 58, earned: 2847, bestFinish: 2, streak: 2, tournaments: 39,
    bio: 'Technical analyst. Clean setups, patient exits.',
  },
  'priya-s': {
    name: 'Priya S.', color: '#8855ff',
    wr: 71, earned: 3920, bestFinish: 1, streak: 3, tournaments: 22,
    bio: 'Crypto specialist. Highest single-tournament return: +382%.',
  },
  'jordan-m': {
    name: 'Jordan M.', color: '#ff7700',
    wr: 49, earned: 1642, bestFinish: 4, streak: 0, tournaments: 28,
    bio: 'Swing trader. Futures focus. Steady climber.',
  },
}

// ── Recent results per trader ─────────────────────────────────────────────────
interface ResultRow {
  date:       string
  contest:    string
  pnlPct:     number
  multiplier: number
  payout:     number
  rank:       number
}

const RESULTS: Record<string, ResultRow[]> = {
  'marcus-t': [
    { date:'May 7',  contest:'Daily Blitz',       pnlPct:+31.4, multiplier:3.0, payout:240, rank:1 },
    { date:'May 5',  contest:'Weekly Showdown',    pnlPct:+22.7, multiplier:2.5, payout:380, rank:1 },
    { date:'May 3',  contest:'Gap & Go Special',   pnlPct:+18.9, multiplier:2.0, payout:200, rank:2 },
    { date:'Apr 30', contest:'Daily Blitz',        pnlPct:+41.2, multiplier:4.0, payout:320, rank:1 },
    { date:'Apr 28', contest:'Momentum Masters',   pnlPct:-8.3,  multiplier:0.0, payout:0,   rank:14 },
    { date:'Apr 25', contest:'Weekly Showdown',    pnlPct:+27.1, multiplier:2.5, payout:350, rank:2 },
    { date:'Apr 22', contest:'Daily Blitz',        pnlPct:+12.6, multiplier:1.5, payout:120, rank:3 },
    { date:'Apr 20', contest:'Open Championship',  pnlPct:+53.8, multiplier:5.0, payout:800, rank:1 },
  ],
  'sarah-k': [
    { date:'May 7',  contest:'Options Flow Cup',   pnlPct:+28.1, multiplier:2.5, payout:200, rank:1 },
    { date:'May 5',  contest:'Weekly Showdown',    pnlPct:+15.4, multiplier:1.5, payout:210, rank:3 },
    { date:'May 2',  contest:'Daily Blitz',        pnlPct:+19.7, multiplier:2.0, payout:160, rank:2 },
    { date:'Apr 29', contest:'Momentum Masters',   pnlPct:+33.5, multiplier:3.5, payout:280, rank:1 },
    { date:'Apr 27', contest:'Weekly Showdown',    pnlPct:-4.1,  multiplier:0.0, payout:0,   rank:11 },
    { date:'Apr 24', contest:'Daily Blitz',        pnlPct:+22.8, multiplier:2.5, payout:200, rank:1 },
    { date:'Apr 21', contest:'Options Flow Cup',   pnlPct:+11.3, multiplier:1.5, payout:120, rank:4 },
    { date:'Apr 18', contest:'Open Championship',  pnlPct:+38.6, multiplier:4.0, payout:640, rank:2 },
  ],
  'devon-p': [
    { date:'May 7',  contest:'Technical Titans',   pnlPct:+14.2, multiplier:1.5, payout:120, rank:4 },
    { date:'May 5',  contest:'Weekly Showdown',    pnlPct:+24.9, multiplier:2.5, payout:350, rank:2 },
    { date:'May 1',  contest:'Daily Blitz',        pnlPct:-6.7,  multiplier:0.0, payout:0,   rank:9 },
    { date:'Apr 29', contest:'Breakout Series',    pnlPct:+31.0, multiplier:3.0, payout:240, rank:1 },
    { date:'Apr 26', contest:'Momentum Masters',   pnlPct:+17.5, multiplier:2.0, payout:160, rank:3 },
    { date:'Apr 23', contest:'Weekly Showdown',    pnlPct:+20.3, multiplier:2.0, payout:280, rank:2 },
    { date:'Apr 20', contest:'Daily Blitz',        pnlPct:+9.8,  multiplier:1.0, payout:80,  rank:5 },
    { date:'Apr 17', contest:'Open Championship',  pnlPct:+44.1, multiplier:4.5, payout:720, rank:2 },
  ],
  'priya-s': [
    { date:'May 8',  contest:'Crypto Invitational', pnlPct:+82.4, multiplier:8.0, payout:640, rank:1 },
    { date:'May 6',  contest:'Weekly Showdown',     pnlPct:+41.7, multiplier:4.0, payout:560, rank:1 },
    { date:'May 3',  contest:'Daily Blitz',         pnlPct:+29.2, multiplier:3.0, payout:240, rank:1 },
    { date:'Apr 30', contest:'Crypto Invitational', pnlPct:-12.5, multiplier:0.0, payout:0,   rank:18 },
    { date:'Apr 28', contest:'Weekly Showdown',     pnlPct:+55.3, multiplier:5.5, payout:770, rank:1 },
    { date:'Apr 25', contest:'Momentum Masters',    pnlPct:+38.1, multiplier:3.5, payout:280, rank:2 },
    { date:'Apr 22', contest:'Crypto Invitational', pnlPct:+66.9, multiplier:6.5, payout:520, rank:1 },
    { date:'Apr 19', contest:'Open Championship',   pnlPct:+382.0,multiplier:10.0,payout:1600,rank:1 },
  ],
  'jordan-m': [
    { date:'May 7',  contest:'Futures Focus',      pnlPct:+11.3, multiplier:1.0, payout:80,  rank:6 },
    { date:'May 4',  contest:'Weekly Showdown',    pnlPct:+8.7,  multiplier:0.5, payout:70,  rank:8 },
    { date:'May 1',  contest:'Daily Blitz',        pnlPct:-14.2, multiplier:0.0, payout:0,   rank:22 },
    { date:'Apr 28', contest:'Swing Trader Cup',   pnlPct:+26.4, multiplier:2.5, payout:200, rank:4 },
    { date:'Apr 25', contest:'Weekly Showdown',    pnlPct:+18.1, multiplier:2.0, payout:280, rank:5 },
    { date:'Apr 22', contest:'Futures Focus',      pnlPct:+33.7, multiplier:3.5, payout:280, rank:4 },
    { date:'Apr 19', contest:'Daily Blitz',        pnlPct:-5.4,  multiplier:0.0, payout:0,   rank:13 },
    { date:'Apr 16', contest:'Open Championship',  pnlPct:+21.8, multiplier:2.0, payout:320, rank:4 },
  ],
}

// ── Equity curve seed data per trader ────────────────────────────────────────
const EQUITY_SEEDS: Record<string, number[]> = {
  'marcus-t': [100,108,104,119,115,131,127,144,139,157,153,171,168,186,182,198,195,214,210,228],
  'sarah-k':  [100,105,102,112,109,120,117,126,122,132,129,138,135,145,142,151,148,157,154,162],
  'devon-p':  [100,104,101,109,106,115,112,121,118,128,125,134,131,140,136,145,143,152,149,158],
  'priya-s':  [100,112,108,128,121,145,138,165,158,182,174,200,192,225,215,248,238,272,260,290],
  'jordan-m': [100,102,99, 105,102,108,105,111,108,115,112,117,115,121,118,124,121,127,124,130],
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

function badgeLabel(bestFinish: number, streak: number): string {
  if (bestFinish === 1 && streak >= 5) return 'CHAMPION'
  if (bestFinish === 1) return 'WINNER'
  if (bestFinish <= 3)  return 'PODIUM'
  return 'COMPETITOR'
}

function badgeColor(bestFinish: number, streak: number): string {
  if (bestFinish === 1 && streak >= 5) return T.gold
  if (bestFinish === 1) return T.primary
  if (bestFinish <= 3)  return T.blue
  return T.orange
}

function pnlColor(pnl: number): string {
  return pnl > 0 ? T.primary : T.red
}

function formatPnl(pnl: number): string {
  return (pnl > 0 ? '+' : '') + pnl.toFixed(1) + '%'
}

function formatMoney(n: number): string {
  return '$' + n.toLocaleString()
}

// ── Equity curve SVG ──────────────────────────────────────────────────────────
function EquityCurve({ slug, color }: { slug: string; color: string }) {
  const path = useMemo(() => {
    const points = EQUITY_SEEDS[slug] ?? EQUITY_SEEDS['marcus-t']
    const W = 900
    const H = 170
    const pad = { x: 20, y: 14 }
    const minV = Math.min(...points) * 0.97
    const maxV = Math.max(...points) * 1.02
    const xs = points.map((_, i) =>
      pad.x + (i / (points.length - 1)) * (W - pad.x * 2)
    )
    const ys = points.map(v =>
      H - pad.y - ((v - minV) / (maxV - minV)) * (H - pad.y * 2)
    )
    // Smooth bezier
    let d = `M ${xs[0]} ${ys[0]}`
    for (let i = 1; i < xs.length; i++) {
      const cpx = (xs[i - 1] + xs[i]) / 2
      d += ` C ${cpx} ${ys[i - 1]}, ${cpx} ${ys[i]}, ${xs[i]} ${ys[i]}`
    }
    // Fill area
    const area =
      d +
      ` L ${xs[xs.length - 1]} ${H} L ${xs[0]} ${H} Z`
    return { line: d, area, xs, ys, W, H, points, minV, maxV }
  }, [slug])

  const { line, area, xs, ys, W, H, points, minV, maxV } = path
  const gradId = `eq-grad-${slug}`
  const pctChange = (((points[points.length - 1] - points[0]) / points[0]) * 100).toFixed(1)

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* y-axis labels */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', height: 180, display: 'block', overflow: 'visible' }}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          {/* Glow filter */}
          <filter id={`glow-${slug}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((t, i) => (
          <line
            key={i}
            x1={20} y1={14 + t * (H - 28)}
            x2={W - 20} y2={14 + t * (H - 28)}
            stroke={T.border} strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        <path d={area} fill={`url(#${gradId})`} />

        {/* Line */}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#glow-${slug})`}
        />

        {/* Data dots on last and first */}
        <circle cx={xs[0]} cy={ys[0]} r="4" fill={T.surface} stroke={color} strokeWidth="2" />
        <circle
          cx={xs[xs.length - 1]} cy={ys[ys.length - 1]} r="5"
          fill={color} stroke={T.surface} strokeWidth="2"
        />

        {/* Peak label */}
        {(() => {
          const maxIdx = points.indexOf(Math.max(...points))
          const vPct = (((points[maxIdx] - points[0]) / points[0]) * 100).toFixed(0)
          return (
            <g>
              <circle cx={xs[maxIdx]} cy={ys[maxIdx]} r="3.5" fill={T.gold} />
              <text
                x={xs[maxIdx]}
                y={ys[maxIdx] - 10}
                fill={T.gold}
                fontSize="9"
                fontWeight="700"
                textAnchor="middle"
                fontFamily="monospace"
              >
                +{vPct}%
              </text>
            </g>
          )
        })()}

        {/* Baseline value labels */}
        {[0, points.length - 1].map(i => (
          <text
            key={i}
            x={xs[i]}
            y={H - 2}
            fill={T.muted}
            fontSize="8"
            textAnchor="middle"
            fontFamily="monospace"
          >
            {i === 0 ? 'Start' : 'Now'}
          </text>
        ))}

        {/* Y-axis value labels */}
        {[0, 0.5, 1].map((t, i) => {
          const v = minV + (1 - t) * (maxV - minV)
          return (
            <text
              key={i}
              x={16}
              y={14 + t * (H - 28) + 3}
              fill={T.muted}
              fontSize="8"
              textAnchor="end"
              fontFamily="monospace"
            >
              {v.toFixed(0)}
            </text>
          )
        })}
      </svg>

      {/* Net return badge */}
      <div style={{
        position: 'absolute', top: 12, right: 16,
        background: `${color}18`,
        border: `1px solid ${color}44`,
        borderRadius: 6, padding: '4px 10px',
        fontSize: 12, fontWeight: 800, color,
        fontFamily: 'monospace',
      }}>
        +{pctChange}% total return
      </div>
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, color,
}: {
  icon: React.ReactNode
  label: string
  value: string
  color: string
}) {
  return (
    <div style={{
      background: T.surface,
      border: `1px solid ${T.border}`,
      borderRadius: 10,
      padding: '14px 16px',
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: T.muted, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        <span style={{ color }}>{icon}</span>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function TraderProfilePage() {
  const params = useParams()
  const slug = typeof params.username === 'string' ? params.username : ''
  const trader = TRADERS[slug] ?? null
  const results = RESULTS[slug] ?? []

  // ── Not found ──
  if (!trader) {
    return (
      <div style={{
        minHeight: '100vh', background: T.bg,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 16, fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ fontSize: 48 }}>🔍</div>
        <div style={{ fontSize: 20, fontWeight: 700, color: T.text }}>Trader not found</div>
        <div style={{ fontSize: 14, color: T.muted }}>No profile exists for <code style={{ color: T.primary }}>@{slug}</code></div>
        <Link href="/arena" style={{
          marginTop: 8,
          padding: '10px 24px',
          background: `${T.primary}18`,
          border: `1px solid ${T.primary}55`,
          borderRadius: 8,
          color: T.primary,
          fontWeight: 700,
          fontSize: 13,
          textDecoration: 'none',
        }}>
          ← Back to Arena
        </Link>
      </div>
    )
  }

  const { name, color, wr, earned, bestFinish, streak, tournaments, bio } = trader
  const badge = badgeLabel(bestFinish, streak)
  const bColor = badgeColor(bestFinish, streak)
  const init = initials(name)
  const winCount = Math.round((wr / 100) * tournaments)

  return (
    <div style={{
      minHeight: '100vh',
      background: T.bg,
      color: T.text,
      fontFamily: 'system-ui, -apple-system, sans-serif',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: `${T.surface}f0`,
        backdropFilter: 'blur(12px)',
        borderBottom: `1px solid ${T.border}`,
        height: 52,
        display: 'flex', alignItems: 'center',
        padding: '0 24px',
        gap: 16,
      }}>
        <Link href="/arena" style={{
          fontWeight: 900, fontSize: 16, letterSpacing: '-0.02em',
          textDecoration: 'none',
          background: `linear-gradient(90deg, ${T.primary}, ${T.blue})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          flexShrink: 0,
        }}>
          YN Arena
        </Link>

        <div style={{ width: 1, height: 20, background: T.border }} />

        <div style={{ fontSize: 13, fontWeight: 700, color: T.text, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>

        <Link href="/arena" style={{
          display: 'flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 700, color: T.muted,
          textDecoration: 'none',
          padding: '6px 12px',
          border: `1px solid ${T.border}`,
          borderRadius: 6,
          transition: 'color 0.15s',
          flexShrink: 0,
        }}>
          ← Arena
        </Link>
      </nav>

      {/* ── Page body ── */}
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 20px 60px' }}>

        {/* ── Hero ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0,1fr) 300px',
          gap: 16,
          alignItems: 'start',
          marginBottom: 16,
        }}>
          {/* Left — identity */}
          <div style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
            borderRadius: 14,
            padding: '28px 28px 24px',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Top color bar */}
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0,
              height: 3,
              background: `linear-gradient(90deg, ${color}, ${color}44)`,
            }} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
              {/* Avatar */}
              <div style={{
                width: 80, height: 80, borderRadius: '50%', flexShrink: 0,
                background: `${color}22`,
                border: `3px solid ${color}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 26, fontWeight: 900, color,
                letterSpacing: '-0.02em',
                boxShadow: `0 0 24px ${color}44`,
              }}>
                {init}
              </div>

              {/* Name + badge + bio */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 6 }}>
                  <h1 style={{ margin: 0, fontSize: 26, fontWeight: 900, color: T.text, letterSpacing: '-0.03em' }}>
                    {name}
                  </h1>
                  <span style={{
                    fontSize: 10, fontWeight: 800, letterSpacing: '0.1em',
                    color: bColor,
                    background: `${bColor}18`,
                    border: `1px solid ${bColor}55`,
                    borderRadius: 4, padding: '3px 8px',
                  }}>
                    {badge === 'CHAMPION' && <Crown size={9} style={{ marginRight: 4, display: 'inline', verticalAlign: 'middle' }} />}
                    {badge}
                  </span>
                </div>

                <p style={{
                  margin: 0,
                  fontSize: 14, color: T.muted, lineHeight: 1.5,
                  maxWidth: 480,
                }}>
                  {bio}
                </p>

                {/* Streak indicator */}
                {streak > 0 && (
                  <div style={{
                    marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: `${T.gold}14`, border: `1px solid ${T.gold}44`,
                    borderRadius: 6, padding: '5px 10px',
                    fontSize: 12, fontWeight: 700, color: T.gold,
                  }}>
                    <Zap size={12} />
                    {streak}-Tournament Win Streak
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right — stats */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10,
          }}>
            <StatCard
              icon={<Trophy size={13} />}
              label="Tournaments"
              value={String(tournaments)}
              color={color}
            />
            <StatCard
              icon={<Award size={13} />}
              label="Wins"
              value={String(winCount)}
              color={bColor}
            />
            <StatCard
              icon={<TrendingUp size={13} />}
              label="Win Rate"
              value={`${wr}%`}
              color={T.primary}
            />
            <StatCard
              icon={<Users size={13} />}
              label="Best Finish"
              value={`#${bestFinish}`}
              color={bestFinish === 1 ? T.gold : T.blue}
            />
            <div style={{ gridColumn: '1 / -1' }}>
              <StatCard
                icon={<Zap size={13} />}
                label="Total Earned"
                value={formatMoney(earned)}
                color={T.primary}
              />
            </div>
          </div>
        </div>

        {/* ── Equity curve ── */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 16,
        }}>
          <div style={{
            padding: '16px 20px 8px',
            display: 'flex', alignItems: 'center', gap: 10,
            borderBottom: `1px solid ${T.border}`,
          }}>
            <TrendingUp size={15} color={color} />
            <span style={{ fontSize: 12, fontWeight: 800, color: T.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Performance Curve
            </span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.muted }}>
              Last 20 contests
            </span>
          </div>
          <div style={{ padding: '12px 8px 8px' }}>
            <EquityCurve slug={slug} color={color} />
          </div>
        </div>

        {/* ── Recent results ── */}
        <div style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          overflow: 'hidden',
          marginBottom: 20,
        }}>
          <div style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${T.border}`,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <Trophy size={15} color={T.gold} />
            <span style={{ fontSize: 12, fontWeight: 800, color: T.text, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Recent Results
            </span>
          </div>

          {/* Header row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 90px 90px 80px 60px',
            gap: 0,
            padding: '8px 20px',
            borderBottom: `1px solid ${T.border}`,
            fontSize: 10, fontWeight: 700, color: T.muted,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <span>Date</span>
            <span>Contest</span>
            <span style={{ textAlign: 'right' }}>P&amp;L %</span>
            <span style={{ textAlign: 'right' }}>Multiplier</span>
            <span style={{ textAlign: 'right' }}>Payout</span>
            <span style={{ textAlign: 'right' }}>Rank</span>
          </div>

          {/* Data rows */}
          {results.map((row, i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '90px 1fr 90px 90px 80px 60px',
                gap: 0,
                padding: '11px 20px',
                borderBottom: i < results.length - 1 ? `1px solid ${T.border}` : 'none',
                fontSize: 13,
                alignItems: 'center',
                background: i % 2 === 0 ? 'transparent' : `${T.border}33`,
                transition: 'background 0.15s',
              }}
            >
              <span style={{ color: T.muted, fontSize: 12 }}>{row.date}</span>
              <span style={{ color: T.text, fontWeight: 600, fontSize: 13 }}>{row.contest}</span>
              <span style={{
                textAlign: 'right', fontFamily: 'monospace', fontWeight: 800,
                color: pnlColor(row.pnlPct), fontSize: 13,
              }}>
                {formatPnl(row.pnlPct)}
              </span>
              <span style={{
                textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                color: row.multiplier >= 1 ? T.primary : T.muted, fontSize: 13,
              }}>
                {row.multiplier > 0 ? `${row.multiplier}×` : '—'}
              </span>
              <span style={{
                textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                color: row.payout > 0 ? T.text : T.muted, fontSize: 13,
              }}>
                {row.payout > 0 ? formatMoney(row.payout) : '—'}
              </span>
              <span style={{
                textAlign: 'right', fontFamily: 'monospace', fontWeight: 700,
                color: row.rank === 1 ? T.gold : row.rank <= 3 ? T.primary : T.muted,
                fontSize: 13,
              }}>
                {row.rank === 1 ? '🥇' : row.rank === 2 ? '🥈' : row.rank === 3 ? '🥉' : `#${row.rank}`}
              </span>
            </div>
          ))}
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <Link href="/arena" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 28px',
            background: `${color}18`,
            border: `1px solid ${color}66`,
            borderRadius: 10,
            color,
            fontWeight: 800, fontSize: 14,
            textDecoration: 'none',
            letterSpacing: '0.01em',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}>
            ⚔️ Challenge to H2H
          </Link>

          <Link href="/arena?tab=streams" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '13px 28px',
            background: `${T.blue}18`,
            border: `1px solid ${T.blue}66`,
            borderRadius: 10,
            color: T.blue,
            fontWeight: 800, fontSize: 14,
            textDecoration: 'none',
            letterSpacing: '0.01em',
            transition: 'background 0.15s, box-shadow 0.15s',
          }}>
            👁 Watch Live
          </Link>
        </div>
      </div>
    </div>
  )
}
