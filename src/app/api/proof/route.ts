import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!URL.startsWith('http') || !SERVICE) return null
  try { return createClient(URL, SERVICE) } catch { return null }
}

const BUCKETS: [number, number, string][] = [
  [0, 1, '0–1%'], [1, 2, '1–2%'], [2, 3, '2–3%'], [3, 5, '3–5%'], [5, 100, '5%+'],
]

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false })
  try {
    // conviction buckets — win rate by the size of the predicted move
    const buckets = await Promise.all(BUCKETS.map(async ([lo, hi, label]) => {
      const base = () => admin.from('forecast_calls').select('*', { count: 'exact', head: true }).neq('status', 'open').gte('pct', lo).lt('pct', hi)
      const [{ count: total }, { count: wins }] = await Promise.all([base(), base().eq('status', 'hit')])
      const t = total ?? 0
      return { label, total: t, wins: wins ?? 0, winRate: t ? +(((wins ?? 0) / t) * 100).toFixed(1) : null }
    }))

    // overall
    const [{ count: gTotal }, { count: gWins }] = await Promise.all([
      admin.from('forecast_calls').select('*', { count: 'exact', head: true }).neq('status', 'open'),
      admin.from('forecast_calls').select('*', { count: 'exact', head: true }).eq('status', 'hit'),
    ])
    const overall = { total: gTotal ?? 0, wins: gWins ?? 0, winRate: gTotal ? +(((gWins ?? 0) / gTotal) * 100).toFixed(1) : null }

    // learning curve
    const { data: hist } = await admin.from('nn_history').select('ts,trained,avg_loss,dir_acc').order('ts', { ascending: true }).limit(300)
    const learning = (hist || []).map((h) => ({ t: String(h.ts).slice(0, 10), trained: h.trained, loss: +Number(h.avg_loss).toFixed(4), acc: +Number(h.dir_acc).toFixed(1) }))

    return NextResponse.json(
      { ready: overall.total > 0 || learning.length > 0, overall, buckets, learning },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ready: false })
  }
}
