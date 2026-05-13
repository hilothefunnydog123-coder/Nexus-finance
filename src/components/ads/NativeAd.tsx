'use client'

interface NativeAdProps {
  variant: 'prop-firm' | 'broker' | 'tool' | 'course'
  size?: 'sm' | 'md' | 'lg'
}

const ADS = {
  'prop-firm': [
    {
      brand: 'FTMO',
      init: 'FT',
      color: '#f59e0b',
      headline: 'Get funded up to $200K.',
      description: '80% profit split. Join 200,000+ traders worldwide. Pass the evaluation and trade with FTMO capital.',
      cta: 'Start Evaluation',
      href: 'https://ftmo.com',
    },
    {
      brand: 'Topstep',
      init: 'TS',
      color: '#3b82f6',
      headline: 'Trade our money. Keep 90% of profits.',
      description: 'Start for $50. Prove your edge in the Trading Combine and get funded with a real account.',
      cta: 'Get Funded',
      href: 'https://topstep.com',
    },
    {
      brand: 'Apex Trader Funding',
      init: 'AP',
      color: '#22c55e',
      headline: 'Pass the evaluation. Get funded.',
      description: '$25K–$300K accounts available. Competitive payouts. No daily drawdown on funded accounts.',
      cta: 'View Plans',
      href: 'https://apextraderfunding.com',
    },
  ],
  broker: [
    {
      brand: 'Interactive Brokers',
      init: 'IB',
      color: '#ef4444',
      headline: '$0.005/share commissions. Trade globally.',
      description: 'Access 150+ markets worldwide. Low margin rates. Professional-grade tools for every trader.',
      cta: 'Open Account',
      href: 'https://interactivebrokers.com',
    },
    {
      brand: 'Webull',
      init: 'WB',
      color: '#3b82f6',
      headline: 'Commission-free trading. Advanced charts.',
      description: 'Extended hours trading, real-time data, and powerful screening tools. Open a free account in minutes.',
      cta: 'Start Free',
      href: 'https://webull.com',
    },
    {
      brand: 'TD Ameritrade',
      init: 'TD',
      color: '#22c55e',
      headline: 'No account minimums. 24/7 support.',
      description: 'Trade stocks, ETFs, options, and futures commission-free. Award-winning thinkorswim platform included.',
      cta: 'Open Account',
      href: 'https://tdameritrade.com',
    },
  ],
  tool: [
    {
      brand: 'TradingView Pro',
      init: 'TV',
      color: '#3b82f6',
      headline: 'Advanced charts. 25 indicators. Real-time data.',
      description: 'Professional-grade charting used by 50M+ traders. Multi-chart layouts, custom scripts, and alerts. $14.95/mo.',
      cta: 'Try Pro Free',
      href: 'https://tradingview.com',
    },
    {
      brand: 'Finviz Elite',
      init: 'FV',
      color: '#f59e0b',
      headline: 'Stock screener. Heat maps. News.',
      description: 'Real-time quotes, advanced filtering, portfolio backtesting, and insider trading data. $39.50/mo.',
      cta: 'Try Elite',
      href: 'https://finviz.com/elite',
    },
  ],
  course: [
    {
      brand: 'YN Finance Courses',
      init: 'YN',
      color: '#22c55e',
      headline: 'Learn from traders who actually trade.',
      description: 'Nine structured curricula from the world\'s most-followed traders. AI-narrated lessons. $0.99 per course.',
      cta: 'Browse Courses',
      href: '/courses',
    },
  ],
}

const PADDING = { sm: '14px 16px', md: '18px 20px', lg: '22px 24px' }
const TITLE_SIZE = { sm: 13, md: 15, lg: 17 }
const DESC_SIZE = { sm: 12, md: 13, lg: 14 }
const LOGO_SIZE = { sm: 32, md: 40, lg: 48 }
const LOGO_RADIUS = { sm: 8, md: 10, lg: 12 }
const LOGO_FONT = { sm: 10, md: 12, lg: 14 }

export default function NativeAd({ variant, size = 'md' }: NativeAdProps) {
  const pool = ADS[variant]
  // Stable pseudo-random pick so it doesn't re-roll on every render
  const idx = typeof window !== 'undefined'
    ? Math.floor(Date.now() / 300_000) % pool.length
    : 0
  const ad = pool[idx]

  const pad = PADDING[size]
  const titleSz = TITLE_SIZE[size]
  const descSz = DESC_SIZE[size]
  const logoSz = LOGO_SIZE[size]
  const logoR = LOGO_RADIUS[size]
  const logoF = LOGO_FONT[size]

  return (
    <a
      href={ad.href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{
        display: 'block',
        background: '#0d1117',
        border: '1px solid #21262d',
        borderRadius: 12,
        padding: pad,
        textDecoration: 'none',
        transition: 'border-color 0.15s, transform 0.15s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = '#30363d'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLAnchorElement
        el.style.borderColor = '#21262d'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Sponsored label */}
      <div style={{
        fontSize: 9,
        fontWeight: 700,
        color: '#484f58',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        marginBottom: 10,
      }}>
        Sponsored
      </div>

      {/* Body row */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
        {/* Brand logo */}
        <div style={{
          width: logoSz,
          height: logoSz,
          borderRadius: logoR,
          background: `${ad.color}18`,
          border: `1.5px solid ${ad.color}35`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: logoF,
          fontWeight: 900,
          color: ad.color,
          flexShrink: 0,
          fontFamily: 'monospace',
          letterSpacing: -0.5,
        }}>
          {ad.init}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 10,
            fontWeight: 700,
            color: '#484f58',
            marginBottom: 3,
            letterSpacing: '0.04em',
          }}>
            {ad.brand}
          </div>
          <div style={{
            fontSize: titleSz,
            fontWeight: 800,
            color: '#f0f6fc',
            lineHeight: 1.3,
            marginBottom: 6,
            letterSpacing: -0.3,
          }}>
            {ad.headline}
          </div>
          <div style={{
            fontSize: descSz,
            color: '#8b949e',
            lineHeight: 1.55,
            marginBottom: 12,
          }}>
            {ad.description}
          </div>

          {/* CTA */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: `${ad.color}15`,
            border: `1px solid ${ad.color}30`,
            borderRadius: 7,
            padding: '6px 12px',
            fontSize: 12,
            fontWeight: 700,
            color: ad.color,
            letterSpacing: 0.1,
          }}>
            {ad.cta}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M2 5h6M5.5 2.5L8 5l-2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </div>
    </a>
  )
}
