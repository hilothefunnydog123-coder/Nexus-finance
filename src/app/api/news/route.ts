import { NextResponse } from 'next/server'
import { getMarketNews } from '@/lib/finnhub'
import type { NewsItem } from '@/lib/types'

const DEMO_MODE = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'

const MOCK_NEWS: NewsItem[] = [
  {
    id: '1', headline: 'Fed signals potential rate cuts amid cooling inflation data',
    summary: 'Federal Reserve officials indicated a possible shift in monetary policy as CPI data showed inflation trending toward the 2% target.',
    source: 'Reuters', url: '#', datetime: Date.now() / 1000 - 600, category: 'general', related: 'SPY',
  },
  {
    id: '2', headline: 'NVIDIA surpasses $2T market cap on AI chip demand surge',
    summary: 'NVIDIA stock hit all-time highs as data center GPU demand continues to outpace supply, with cloud hyperscalers increasing orders.',
    source: 'Bloomberg', url: '#', datetime: Date.now() / 1000 - 1800, category: 'technology', related: 'NVDA',
  },
  {
    id: '3', headline: 'Apple Vision Pro drives services revenue beat in Q1 earnings',
    summary: 'Apple reported strong Q1 results driven by 14% growth in services segment, offsetting slight iPhone unit decline.',
    source: 'WSJ', url: '#', datetime: Date.now() / 1000 - 3600, category: 'technology', related: 'AAPL',
  },
  {
    id: '4', headline: 'Tesla deliveries miss estimates; Musk focuses on autonomous driving',
    summary: 'Tesla Q1 deliveries came in below Wall Street expectations as the company pivots to Full Self-Driving revenue recognition.',
    source: 'CNBC', url: '#', datetime: Date.now() / 1000 - 5400, category: 'technology', related: 'TSLA',
  },
  {
    id: '5', headline: 'JPMorgan raises S&P 500 year-end target to 5,800',
    summary: 'JPMorgan analysts cite resilient earnings growth and AI productivity tailwinds as key drivers for revised bull case.',
    source: 'Financial Times', url: '#', datetime: Date.now() / 1000 - 7200, category: 'general', related: 'JPM',
  },
  {
    id: '6', headline: 'Microsoft Azure growth accelerates on Copilot enterprise adoption',
    summary: 'Microsoft cloud division reported 31% revenue growth, exceeding forecasts as enterprise AI tools gained widespread adoption.',
    source: 'Reuters', url: '#', datetime: Date.now() / 1000 - 9000, category: 'technology', related: 'MSFT',
  },
  {
    id: '7', headline: 'Options market pricing record volatility ahead of earnings season',
    summary: 'Implied volatility in the options market hit multi-month highs as investors brace for major tech earnings reports.',
    source: 'MarketWatch', url: '#', datetime: Date.now() / 1000 - 10800, category: 'general',
  },
  {
    id: '8', headline: 'Gold hits new record as dollar weakens on jobs data',
    summary: 'Gold futures surged past $2,400/oz as softer-than-expected jobs data weakened the dollar and boosted safe-haven demand.',
    source: 'Bloomberg', url: '#', datetime: Date.now() / 1000 - 12600, category: 'forex', related: 'GLD',
  },
]

export async function GET() {
  try {
    const news = DEMO_MODE ? MOCK_NEWS : await getMarketNews('general').catch(() => MOCK_NEWS)
    return NextResponse.json({ news, demo: DEMO_MODE }, { headers: { 'Cache-Control': 's-maxage=60' } })
  } catch {
    return NextResponse.json({ news: MOCK_NEWS, demo: true })
  }
}
