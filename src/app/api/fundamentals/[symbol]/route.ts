import { NextRequest, NextResponse } from 'next/server'

const DEMO = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'
const KEY = process.env.FINNHUB_API_KEY || ''

interface Fundamentals {
  pe: number | null
  eps: number | null
  marketCap: number | null
  week52High: number | null
  week52Low: number | null
  dividendYield: number | null
  beta: number | null
  revenueGrowth: number | null
  pbRatio: number | null
  roe: number | null
  debtEquity: number | null
  description: string
  name: string
  industry: string
  exchange: string
}

const MOCK: Record<string, Fundamentals> = {
  AAPL:  { pe: 28.4, eps: 6.42, marketCap: 2_850_000, week52High: 199.62, week52Low: 164.08, dividendYield: 0.51, beta: 1.20, revenueGrowth: 4.9, pbRatio: 45.2, roe: 156.1, debtEquity: 1.87, name: 'Apple Inc.', industry: 'Technology Hardware', exchange: 'NASDAQ', description: 'Apple designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.' },
  NVDA:  { pe: 68.2, eps: 12.44, marketCap: 2_150_000, week52High: 974.00, week52Low: 409.50, dividendYield: 0.03, beta: 1.66, revenueGrowth: 122.4, pbRatio: 38.1, roe: 91.8, debtEquity: 0.42, name: 'NVIDIA Corp.', industry: 'Semiconductors', exchange: 'NASDAQ', description: 'NVIDIA designs graphics processors, networking, and system-on-chip units. Leading provider of AI chips.' },
  TSLA:  { pe: 48.6, eps: 5.12, marketCap: 793_000, week52High: 278.98, week52Low: 138.80, dividendYield: null, beta: 2.34, revenueGrowth: 8.1, pbRatio: 9.8, roe: 18.9, debtEquity: 0.18, name: 'Tesla Inc.', industry: 'Electric Vehicles', exchange: 'NASDAQ', description: 'Tesla designs and manufactures electric vehicles, energy storage systems, and solar panels.' },
  MSFT:  { pe: 34.8, eps: 11.45, marketCap: 3_100_000, week52High: 430.82, week52Low: 362.90, dividendYield: 0.72, beta: 0.90, revenueGrowth: 15.2, pbRatio: 13.2, roe: 39.2, debtEquity: 0.35, name: 'Microsoft Corp.', industry: 'Cloud Computing', exchange: 'NASDAQ', description: 'Microsoft develops software, cloud services, devices, and AI products. Azure is the #2 cloud platform globally.' },
  GOOGL: { pe: 22.4, eps: 7.98, marketCap: 2_200_000, week52High: 191.75, week52Low: 154.84, dividendYield: null, beta: 1.05, revenueGrowth: 14.1, pbRatio: 7.2, roe: 31.4, debtEquity: 0.09, name: 'Alphabet Inc.', industry: 'Internet / Advertising', exchange: 'NASDAQ', description: 'Alphabet operates Google Search, YouTube, Google Cloud, and Waymo autonomous vehicles.' },
  META:  { pe: 26.8, eps: 19.32, marketCap: 1_250_000, week52High: 589.93, week52Low: 358.58, dividendYield: 0.41, beta: 1.22, revenueGrowth: 27.1, pbRatio: 9.1, roe: 36.8, debtEquity: 0.12, name: 'Meta Platforms', industry: 'Social Media / AI', exchange: 'NASDAQ', description: 'Meta operates Facebook, Instagram, WhatsApp, and is investing heavily in AI and the metaverse.' },
  AMZN:  { pe: 42.1, eps: 5.22, marketCap: 2_080_000, week52High: 201.20, week52Low: 151.61, dividendYield: null, beta: 1.15, revenueGrowth: 12.5, pbRatio: 9.8, roe: 22.1, debtEquity: 0.58, name: 'Amazon.com Inc.', industry: 'E-Commerce / Cloud', exchange: 'NASDAQ', description: 'Amazon operates e-commerce, AWS cloud, Prime Video, Alexa, and advertising businesses globally.' },
  JPM:   { pe: 12.4, eps: 18.22, marketCap: 620_000, week52High: 231.87, week52Low: 181.22, dividendYield: 2.12, beta: 1.08, revenueGrowth: 18.4, pbRatio: 2.1, roe: 17.2, debtEquity: null, name: 'JPMorgan Chase', industry: 'Banking', exchange: 'NYSE', description: 'JPMorgan Chase is the largest US bank by assets, offering investment banking, retail, and commercial banking.' },
  SPY:   { pe: 22.8, eps: null, marketCap: null, week52High: 523.31, week52Low: 454.61, dividendYield: 1.28, beta: 1.00, revenueGrowth: null, pbRatio: null, roe: null, debtEquity: null, name: 'SPDR S&P 500 ETF', industry: 'ETF — Large Cap Blend', exchange: 'NYSE Arca', description: 'The SPY ETF tracks the S&P 500 index, representing the 500 largest US companies.' },
  AMD:   { pe: 108.2, eps: 1.56, marketCap: 272_000, week52High: 227.30, week52Low: 127.24, dividendYield: null, beta: 1.71, revenueGrowth: 68.1, pbRatio: 6.8, roe: 5.2, debtEquity: 0.28, name: 'Advanced Micro Devices', industry: 'Semiconductors', exchange: 'NASDAQ', description: 'AMD designs CPUs, GPUs, and data center chips. Key competitor to NVIDIA in AI acceleration.' },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params

  if (DEMO) {
    const mock = MOCK[symbol.toUpperCase()]
    if (!mock) return NextResponse.json({ error: 'No data', demo: true }, { status: 404 })
    return NextResponse.json({ fundamentals: mock, demo: true })
  }

  try {
    const [metricRes, profileRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${symbol}&metric=all&token=${KEY}`),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol}&token=${KEY}`),
    ])

    const metric = await metricRes.json()
    const profile = await profileRes.json()
    const m = metric.metric || {}

    const fundamentals: Fundamentals = {
      pe: m.peNormalizedAnnual || m.peTTM || null,
      eps: m.epsBasicExclExtraItemsAnnual || null,
      marketCap: profile.marketCapitalization || null,
      week52High: m['52WeekHigh'] || null,
      week52Low: m['52WeekLow'] || null,
      dividendYield: m.dividendYieldIndicatedAnnual || null,
      beta: m.beta || null,
      revenueGrowth: m.revenueGrowthQuarterlyYoy || null,
      pbRatio: m.pbAnnual || null,
      roe: m.roeRfy || null,
      debtEquity: m.totalDebt_totalEquityQuarterly || null,
      name: profile.name || symbol,
      industry: profile.finnhubIndustry || '—',
      exchange: profile.exchange || '—',
      description: profile.description || '',
    }

    return NextResponse.json({ fundamentals, demo: false })
  } catch {
    const mock = MOCK[symbol.toUpperCase()]
    return NextResponse.json({ fundamentals: mock || null, demo: true })
  }
}
