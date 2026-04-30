import { NextResponse } from 'next/server'
import { getCandles, generateMockCandles, getMockQuote, getQuote } from '@/lib/finnhub'
import type { ChartDataPoint } from '@/lib/types'

const DEMO_MODE = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  const { symbol } = await params

  try {
    if (DEMO_MODE) {
      const candles = generateMockCandles(symbol, 390)
      const quote = getMockQuote(symbol)
      const chartData: ChartDataPoint[] = candles.map(c => ({
        time: new Date(c.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        price: c.close,
        volume: c.volume,
        open: c.open,
        high: c.high,
        low: c.low,
      }))
      return NextResponse.json({ chartData, quote, demo: true })
    }

    const now = Math.floor(Date.now() / 1000)
    const from = now - 24 * 60 * 60

    const [candles, quote] = await Promise.all([
      getCandles(symbol, '1', from, now).catch(() => generateMockCandles(symbol)),
      getQuote(symbol).catch(() => getMockQuote(symbol)),
    ])

    const chartData: ChartDataPoint[] = (candles.length ? candles : generateMockCandles(symbol)).map(c => ({
      time: new Date(c.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: c.close,
      volume: c.volume,
      open: c.open,
      high: c.high,
      low: c.low,
    }))

    return NextResponse.json({ chartData, quote })
  } catch {
    const candles = generateMockCandles(symbol)
    const quote = getMockQuote(symbol)
    const chartData: ChartDataPoint[] = candles.map(c => ({
      time: new Date(c.time * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      price: c.close,
      volume: c.volume,
    }))
    return NextResponse.json({ chartData, quote, demo: true })
  }
}
