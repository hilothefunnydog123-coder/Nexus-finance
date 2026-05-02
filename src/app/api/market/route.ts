import { NextResponse } from 'next/server'
import { getQuote, getMockQuote } from '@/lib/finnhub'

const SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'JPM', 'AMD', 'NFLX', 'QQQ']
const DEMO_MODE = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'

export async function GET() {
  try {
    // Fetch in batches to avoid rate limits on free tier (60 calls/min)
    const quotes = await Promise.all(
      SYMBOLS.map(sym =>
        DEMO_MODE
          ? Promise.resolve(getMockQuote(sym))
          : getQuote(sym).catch(() => getMockQuote(sym))
      )
    )
    return NextResponse.json(
      { quotes, demo: DEMO_MODE },
      { headers: { 'Cache-Control': 'no-store' } }
    )
  } catch {
    return NextResponse.json({ quotes: SYMBOLS.map(getMockQuote), demo: true })
  }
}
