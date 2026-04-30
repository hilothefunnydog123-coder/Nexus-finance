import { NextResponse } from 'next/server'
import { getQuote, getMockQuote } from '@/lib/finnhub'

const SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'SPY', 'JPM', 'AMD']
const DEMO_MODE = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'

export async function GET() {
  try {
    const quotes = await Promise.all(
      SYMBOLS.map(sym =>
        DEMO_MODE
          ? Promise.resolve(getMockQuote(sym))
          : getQuote(sym).catch(() => getMockQuote(sym))
      )
    )
    return NextResponse.json({ quotes, demo: DEMO_MODE })
  } catch {
    const quotes = SYMBOLS.map(getMockQuote)
    return NextResponse.json({ quotes, demo: true })
  }
}
