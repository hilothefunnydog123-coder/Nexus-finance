import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketPrices } from '@/lib/edge/kalshi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }

// GET /api/edge/prices?tickers=A,B,C — current YES mid per ticker, straight from
// Kalshi. Lightweight (one signed request) so the terminal can poll it every few
// seconds for real-time mark-to-market. Falls back to {} if creds/API unavailable.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get('tickers') || ''
  const tickers = raw.split(',').map((t) => t.trim()).filter(Boolean).slice(0, 120)
  if (!tickers.length) return NextResponse.json({ prices: {} }, { headers: { 'Cache-Control': 'no-store', ...CORS } })
  try {
    const prices = await fetchMarketPrices(tickers)
    return NextResponse.json({ prices, at: Date.now() }, { headers: { 'Cache-Control': 'no-store', ...CORS } })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    return NextResponse.json({ prices: {}, error: msg }, { status: 200, headers: { 'Cache-Control': 'no-store', ...CORS } })
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: { ...CORS, 'Access-Control-Allow-Headers': 'Content-Type' } })
}
