import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { forecastTicker } from '@/lib/forecast'

export const revalidate = 1800 // refresh the cached forecast every 30 min

const VALID = /^[A-Za-z0-9.\-]{1,8}$/

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker: raw } = await params
  const ticker = raw.toUpperCase()
  const title = `${ticker} AI Price Forecast & Target — BrainStock`
  const description = `Our neural network's short-term forecast for ${ticker}: predicted price target, direction, and honest backtested accuracy. Free on YN Finance.`
  return {
    title,
    description,
    alternates: { canonical: `https://ynfinance.org/forecast/${ticker}` },
    openGraph: { title, description, url: `https://ynfinance.org/forecast/${ticker}` },
  }
}

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'

function Sparkline({ points, up }: { points: { price: number }[]; up: boolean }) {
  const W = 720
  const H = 200
  const prices = points.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || 1
  const step = W / Math.max(prices.length - 1, 1)
  const coords = prices.map((p, i) => [i * step, H - ((p - min) / range) * (H - 16) - 8])
  const line = coords.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `${line} L${W},${H} L0,${H} Z`
  const color = up ? GREEN : RED
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} preserveAspectRatio="none">
      <defs>
        <linearGradient id="sl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#sl)" />
      <path d={line} fill="none" stroke={color} strokeWidth="2.5" />
    </svg>
  )
}

export default async function ForecastPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params
  const ticker = raw.toUpperCase()
  if (!VALID.test(ticker)) notFound()

  let data
  try {
    data = await forecastTicker(ticker, 5)
  } catch {
    notFound()
  }

  const price = data.history[data.history.length - 1].price
  const sessionTarget = data.forecast[0].price
  const fiveDayTarget = data.forecast[data.forecast.length - 1].price
  const pct = ((sessionTarget - price) / price) * 100
  const pct5 = ((fiveDayTarget - price) / price) * 100
  const up = pct >= 0
  const m = data.metrics

  const card: React.CSSProperties = {
    background: 'rgba(255,255,255,.025)',
    border: '1px solid rgba(255,255,255,.09)',
    borderRadius: 16,
    padding: '16px 18px',
  }

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
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px 22px 80px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 36 }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: 14 }}>← YN Finance</Link>
          <Link href="/brainstock/track-record" style={{ color: CYAN, textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>
            Track record →
          </Link>
        </div>

        <div style={{ fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>BrainStock forecast</div>
        <h1 style={{ fontSize: 'clamp(40px,8vw,72px)', fontWeight: 800, letterSpacing: -2, margin: '6px 0 0' }}>{ticker}</h1>
        <div style={{ marginTop: 10, display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 26, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>${price.toFixed(2)}</span>
          <span style={{ fontSize: 18, fontWeight: 700, color: up ? GREEN : RED }}>
            {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}% predicted next session
          </span>
        </div>

        <div style={{ margin: '28px 0', background: 'rgba(255,255,255,.02)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, padding: 16 }}>
          <Sparkline points={data.history} up={pct5 >= 0} />
          <div style={{ marginTop: 6, fontSize: 12, color: MUTED }}>Last {data.history.length} trading days</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
          <div style={card}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Next-session target</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: up ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>
              ${sessionTarget.toFixed(2)}
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>5-day target</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: pct5 >= 0 ? GREEN : RED, fontVariantNumeric: 'tabular-nums' }}>
              ${fiveDayTarget.toFixed(2)} <span style={{ fontSize: 14 }}>({pct5 >= 0 ? '+' : ''}{pct5.toFixed(1)}%)</span>
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Directional accuracy</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: VIOLET, fontVariantNumeric: 'tabular-nums' }}>
              {Math.round(m.directional_accuracy * 100)}%
            </div>
          </div>
          <div style={card}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Skill vs. naive</div>
            <div style={{ fontSize: 24, fontWeight: 800, marginTop: 4, color: m.skill_score > 0 ? GREEN : '#fbbf24', fontVariantNumeric: 'tabular-nums' }}>
              {m.skill_score > 0 ? '+' : ''}{(m.skill_score * 100).toFixed(1)}%
            </div>
          </div>
        </div>

        <Link
          href={`/brainstock?t=${ticker}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 26,
            background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: '#07101a',
            padding: '13px 22px', borderRadius: 12, fontWeight: 700, textDecoration: 'none',
          }}
        >
          Open the full interactive forecast →
        </Link>

        <p style={{ marginTop: 30, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          {data.disclaimer}
        </p>
      </div>
    </div>
  )
}
