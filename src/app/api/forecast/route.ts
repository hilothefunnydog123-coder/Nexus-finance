import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { forecastTicker } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'
import { rateLimit } from '@/lib/ratelimit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

// The data flywheel: log every served forecast as a labeled prediction the cron
// will grade later. One row per ticker/day/source so popular names don't flood it.
async function logPrediction(ticker: string, horizon: number, source: string, result: Awaited<ReturnType<typeof forecastTicker>>) {
  const admin = getAdmin()
  if (!admin) return
  const start = result.history[result.history.length - 1]?.price
  const predicted = result.forecast[result.forecast.length - 1]?.price
  const resolve_date = result.forecast[result.forecast.length - 1]?.date
  if (!start || !predicted || !resolve_date) return
  try {
    await admin.from('prediction_log').upsert(
      {
        trade_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
        ticker,
        source,
        start_price: start,
        predicted,
        horizon,
        resolve_date,
        status: 'open',
        features: result.features ?? null,
      },
      { onConflict: 'trade_date,ticker,source' }
    )
  } catch {
    /* table may not exist yet — never block the forecast */
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ok' })
}

export async function POST(req: Request) {
  // Protect the signal: throttle bulk scraping of forecasts (real users unaffected).
  const rl = rateLimit(req, { limit: 40, windowMs: 60_000, tag: 'forecast' })
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Too many requests — slow down.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } }
    )
  }

  let body: { ticker?: string; horizon?: number; source?: string } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  const ticker = String(body.ticker ?? '').toUpperCase().trim()
  const horizon = Math.max(1, Math.min(20, Number(body.horizon ?? 5)))
  const source = ['forecast', 'voice', 'analyzer'].includes(String(body.source)) ? String(body.source) : 'forecast'
  if (!/^[A-Z0-9.\-]{1,8}$/.test(ticker)) {
    return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
  }
  try {
    const admin = getAdmin()
    const model = admin ? await loadTrainedModel(admin) : null // use the trained net if it has experience
    const result = await forecastTicker(ticker, horizon, undefined, model)
    await logPrediction(ticker, horizon, source, result) // feed the flywheel
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Couldn't fetch data for ${ticker}: ${msg}` }, { status: 502 })
  }
}
