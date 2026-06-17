import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { chargeForWins, cycleAccrual, MONTHLY_CAP_CENTS, PRICE_PER_WIN_CENTS } from '@/lib/payg'

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

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const terms = {
    perWin: PRICE_PER_WIN_CENTS / 100,
    cap: MONTHLY_CAP_CENTS / 100,
  }
  if (!admin) return NextResponse.json({ ready: false, terms })

  try {
    const since = new Date(Date.now() - 30 * 86400_000).toISOString()
    // Graded calls in the last 30 days (resolved, win or loss) for the win-rate story.
    const [{ count: graded }, { count: wins }] = await Promise.all([
      admin.from('forecast_calls').select('*', { count: 'exact', head: true }).neq('status', 'open').gte('resolved_at', since),
      admin.from('forecast_calls').select('*', { count: 'exact', head: true }).eq('status', 'hit').gte('resolved_at', since),
    ])
    const w = wins ?? 0
    const g = graded ?? 0
    const cents = chargeForWins(w)
    const preview = {
      windowDays: 30,
      graded: g,
      wins: w,
      winRate: g ? +((w / g) * 100).toFixed(1) : 0,
      youWouldPay: +(cents / 100).toFixed(2),
      cappedOut: cents >= MONTHLY_CAP_CENTS,
    }

    // Optional: a specific subscriber's current cycle.
    let mine = null
    const email = (new URL(req.url).searchParams.get('email') || '').trim().toLowerCase()
    if (email) {
      const { data: sub } = await admin
        .from('payg_subscribers')
        .select('cycle_start,status,last_charge_cents')
        .eq('email', email)
        .eq('status', 'active')
        .maybeSingle()
      if (sub?.cycle_start) {
        const accrual = await cycleAccrual(admin, sub.cycle_start as string)
        mine = { ...accrual, cycleStart: sub.cycle_start }
      }
    }

    return NextResponse.json(
      { ready: g > 0, terms, preview, mine },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ready: false, terms })
  }
}
