import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMarket } from '@/lib/edge/kalshi'
import { priceMarket, loadModelFor } from '@/lib/edge/pricing'
import { computeVerdict } from '@/lib/edge/worth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

// GET /api/edge/market/:ticker — full pricing for one market (keeps the chart).
export async function GET(_req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  try {
    const market = await getMarket(ticker)
    if (!market) return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    const admin = getAdmin()
    const model = await loadModelFor(admin)
    const pricing = await priceMarket(market, model)
    const verdict = computeVerdict(market, pricing)
    return NextResponse.json(
      { market, pricing, verdict, pricedAt: new Date().toISOString() },
      { headers: { 'Cache-Control': 's-maxage=45, stale-while-revalidate=120' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Could not price ${ticker}: ${msg}` }, { status: 502 })
  }
}
