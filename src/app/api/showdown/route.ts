import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

// A game is "correct" for a side when its called direction matched the outcome.
// label: 1 = up, 0 = down.
const HUMAN_WIN = 'and(user_dir.eq.up,label.eq.1),and(user_dir.eq.down,label.eq.0)'
const AI_WIN = 'and(ai_dir.eq.up,label.eq.1),and(ai_dir.eq.down,label.eq.0)'

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false })

  try {
    const base = () => admin.from('brain_examples').select('*', { count: 'exact', head: true }).eq('status', 'trained').not('user_dir', 'is', null)

    const [{ count: total }, { count: humanWins }, { count: aiWins }] = await Promise.all([
      base(),
      base().or(HUMAN_WIN),
      base().or(AI_WIN),
    ])

    const games = total ?? 0
    if (!games) {
      // Maybe games are in flight but none resolved yet.
      const { count: inFlight } = await admin
        .from('brain_examples')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'open')
        .not('user_dir', 'is', null)
      return NextResponse.json({ ready: false, inFlight: inFlight ?? 0 })
    }

    const hw = humanWins ?? 0
    const aw = aiWins ?? 0

    // Recent battles for the live ticker feed.
    const { data: recentRows } = await admin
      .from('brain_examples')
      .select('ticker,user_dir,ai_dir,label,resolve_date')
      .eq('status', 'trained')
      .not('user_dir', 'is', null)
      .order('resolve_date', { ascending: false })
      .limit(12)

    const recent = (recentRows || []).map((r) => {
      const outcome = Number(r.label) === 1 ? 'up' : 'down'
      const humanRight = r.user_dir === outcome
      const aiRight = r.ai_dir === outcome
      return {
        ticker: r.ticker as string,
        userDir: r.user_dir as string,
        aiDir: r.ai_dir as string,
        outcome,
        humanRight,
        aiRight,
        winner: humanRight && !aiRight ? 'human' : aiRight && !humanRight ? 'ai' : humanRight && aiRight ? 'both' : 'neither',
        resolve_date: r.resolve_date as string,
      }
    })

    return NextResponse.json(
      {
        ready: true,
        games,
        humanWins: hw,
        aiWins: aw,
        humanWinRate: +((hw / games) * 100).toFixed(1),
        aiWinRate: +((aw / games) * 100).toFixed(1),
        leader: hw > aw ? 'humans' : aw > hw ? 'ai' : 'tied',
        margin: Math.abs(hw - aw),
        recent,
      },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=180' } }
    )
  } catch {
    return NextResponse.json({ ready: false })
  }
}
