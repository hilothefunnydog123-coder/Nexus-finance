import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ════════════════════════════════════════════════════════════════════════
   /api/leaderboard/forks — the public Fork leaderboard.
   Top saved forks ranked by backtest directional accuracy. Read-only, no auth.
   ════════════════════════════════════════════════════════════════════════ */

export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const sb = SB_URL.startsWith('https://') && SB_KEY.length > 20
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })
  : null

export async function GET() {
  if (!sb) return NextResponse.json({ leaders: [] })
  try {
    const { data, error } = await sb
      .from('brain_forks')
      .select('name, display_name, score, weights, conviction')
      .not('score', 'is', null)
      .order('score', { ascending: false })
      .limit(20)
    if (error) throw error
    return NextResponse.json({ leaders: data ?? [] }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=600' } })
  } catch (e) {
    return NextResponse.json({ leaders: [], error: String(e) })
  }
}
