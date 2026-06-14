import { NextResponse } from 'next/server'
import { forecastTicker } from '@/lib/forecast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(req: Request) {
  let body: { ticker?: string; horizon?: number } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const ticker = String(body.ticker ?? '').toUpperCase().trim()
  const horizon = Math.max(1, Math.min(20, Number(body.horizon ?? 5)))
  if (!/^[A-Z0-9.\-]{1,8}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }
  try {
    const result = await forecastTicker(ticker, horizon)
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Couldn't fetch data for ${ticker}: ${msg}` }, { status: 502 })
  }
}
