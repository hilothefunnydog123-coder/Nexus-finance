import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getMarketResult } from '@/lib/edge/kalshi'
import { aggregate, gradeRow } from '@/lib/edge/store'

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

// GET — the public, un-cherry-picked report card (Brier, hit rate, worth-it ROI, calibration).
export async function GET() {
  const admin = getAdmin()
  if (!admin) {
    return NextResponse.json({
      ready: false, graded: 0, worthItGraded: 0, brier: null, brierSkill: null,
      hitRate: null, worthItHitRate: null, worthItRoi: null, calibration: [], recent: [],
      note: 'Track record activates once markets resolve (needs Supabase + Kalshi).',
    })
  }
  try {
    const { data } = await admin
      .from('edge_log')
      .select('title,category,side,engine,yn_prob,market_prob,worth_it,result,brier,side_correct,pnl_per_dollar,resolved_at')
      .eq('status', 'settled')
      .order('resolved_at', { ascending: false })
      .limit(2000)
    const stats = aggregate((data || []) as Parameters<typeof aggregate>[0])
    return NextResponse.json(stats, { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } })
  } catch {
    return NextResponse.json({ ready: false, graded: 0, calibration: [], recent: [] })
  }
}

// POST — grade due markets against Kalshi settlement (cron-driven). The moat step.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ resolved: 0, note: 'no db' })

  const nowIso = new Date().toISOString()
  const { data } = await admin
    .from('edge_log')
    .select('id,market_ticker,yn_prob,market_prob,side')
    .eq('status', 'open')
    .lte('close_time', nowIso)
    .limit(200)
  const due = (data || []) as { id: number; market_ticker: string; yn_prob: number; market_prob: number; side: 'YES' | 'NO' }[]

  let resolved = 0
  const start = Date.now()
  for (const row of due) {
    if (Date.now() - start > 48000) break
    const result = await getMarketResult(row.market_ticker)
    if (!result) continue // not settled yet — retry next run
    const g = gradeRow({
      yn_prob: Number(row.yn_prob),
      market_prob: Number(row.market_prob),
      side: row.side,
      worth_it: false, // not needed for the grade math
      result,
    })
    try {
      await admin
        .from('edge_log')
        .update({
          status: 'settled',
          result,
          brier: g.brier,
          side_correct: g.side_correct,
          pnl_per_dollar: g.pnl_per_dollar,
          resolved_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      resolved++
    } catch {
      /* leave open, retry */
    }
  }
  return NextResponse.json({ resolved, due: due.length })
}
