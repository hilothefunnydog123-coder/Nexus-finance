import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

function getAdmin() {
  if (!URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(URL, SERVICE)
  } catch {
    return null
  }
}

type Admin = NonNullable<ReturnType<typeof getAdmin>>

// Exact row count without pulling data. null on any error (missing table etc.).
async function count(admin: Admin, table: string, filter?: (q: ReturnType<Admin['from']>['select'] extends never ? never : ReturnType<ReturnType<Admin['from']>['select']>) => unknown): Promise<number | null> {
  try {
    let q = admin.from(table).select('*', { count: 'exact', head: true })
    if (filter) q = filter(q) as typeof q
    const { count, error } = await q
    if (error) return null
    return count ?? null
  } catch {
    return null
  }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ live: false })

  // First-choice user table is profiles; fall back to subscribers if absent.
  const [
    users0, subs, forecasts, gradedCalls, wins, plLogged, signals, convergence,
  ] = await Promise.all([
    count(admin, 'profiles'),
    count(admin, 'subscribers'),
    count(admin, 'prediction_log'),
    count(admin, 'forecast_calls', (q) => q.neq('status', 'open')),
    count(admin, 'forecast_calls', (q) => q.eq('status', 'hit')),
    count(admin, 'prediction_log', (q) => q.neq('status', 'open')),
    count(admin, 'agent_signals'),
    count(admin, 'convergence_alerts'),
  ])

  const users = users0 ?? subs

  // win rate from graded forecast calls
  let winRate: number | null = null
  if (gradedCalls && gradedCalls > 0 && wins != null) winRate = +((wins / gradedCalls) * 100).toFixed(1)

  // stocks scanned each morning + the net's training count — read directly.
  let stocksDaily: number | null = null
  let nnTrained: number | null = null
  try {
    const { data } = await admin.from('daily_picks').select('attempted,succeeded').order('trade_date', { ascending: false }).limit(1).maybeSingle()
    stocksDaily = data?.attempted ?? data?.succeeded ?? null
  } catch { /* table may not exist */ }
  try {
    const { data } = await admin.from('nn_model').select('trained').eq('id', 1).maybeSingle()
    nnTrained = data?.trained ?? null
  } catch { /* table may not exist */ }

  // "forecasts" = total predictions the platform has actually made.
  const forecastsMade = forecasts ?? gradedCalls ?? null

  return NextResponse.json(
    {
      live: true,
      users,
      forecasts: forecastsMade,
      gradedCalls: gradedCalls ?? null,
      gradedResolved: plLogged ?? null,
      winRate,
      stocksDaily,
      nnTrained,
      signals,
      convergence,
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=180' } }
  )
}
