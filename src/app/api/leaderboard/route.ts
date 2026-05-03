import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

// Shown when DB has fewer than 5 real entries
const SEED_TRADERS = [
  { username: 'QuantKing_NYC', tier: 'pro',   pnlPct: 14.2, status: 'passed',  days: 18 },
  { username: 'ThetaQueen',    tier: 'elite',  pnlPct: 9.4,  status: 'active',  days: 22 },
  { username: 'ForexFred',     tier: 'pro',    pnlPct: 6.3,  status: 'passed',  days: 30 },
  { username: 'IronCondor99',  tier: 'elite',  pnlPct: 5.9,  status: 'active',  days: 14 },
  { username: 'ScalpGod_CHI',  tier: 'pro',    pnlPct: 11.8, status: 'active',  days: 9  },
  { username: 'SwingKing_LA',  tier: 'starter',pnlPct: 4.2,  status: 'active',  days: 12 },
  { username: 'DeltaDave',     tier: 'pro',    pnlPct: 3.7,  status: 'active',  days: 6  },
  { username: 'MomoMike_ATL',  tier: 'starter',pnlPct: 7.1,  status: 'passed',  days: 28 },
]

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const period = searchParams.get('period') || 'weekly'

  if (!SUPABASE_ENABLED) {
    return NextResponse.json({ traders: SEED_TRADERS, real: false, total: SEED_TRADERS.length })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data, error } = await sb
    .from('challenges')
    .select('username, email, tier, current_pnl_pct, status, account_size, started_at, trading_days')
    .in('status', ['active', 'passed', 'payout_requested', 'paid'])
    .order('current_pnl_pct', { ascending: false })
    .limit(100)

  if (error || !data?.length) {
    return NextResponse.json({ traders: SEED_TRADERS, real: false, total: SEED_TRADERS.length })
  }

  const traders = data.map(r => ({
    username: r.username || r.email?.split('@')[0] || 'Trader',
    tier: r.tier,
    pnlPct: r.current_pnl_pct || 0,
    status: r.status,
    days: r.trading_days || 0,
  }))

  // Pad with seed traders if fewer than 5 real ones
  const combined = traders.length < 5
    ? [...traders, ...SEED_TRADERS.slice(0, 8 - traders.length)]
    : traders

  return NextResponse.json({
    traders: combined,
    real: traders.length > 0,
    realCount: traders.length,
    total: combined.length,
  })
}
