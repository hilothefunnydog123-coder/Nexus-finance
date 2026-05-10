import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const DB = url && !url.includes('your_supabase') ? createClient(url, key) : null

// Seeded tournaments when DB not configured
function seedTournaments() {
  const now = new Date()
  const mktOpen = new Date(now); mktOpen.setHours(9, 30, 0, 0)
  const mktClose = new Date(now); mktClose.setHours(16, 0, 0, 0)
  const isWeekend = now.getDay() === 0 || now.getDay() === 6

  const base = [
    { id: 'daily-blitz', title: 'Daily Blitz', description: 'The flagship $1 tournament. Trade anything, 6.5 hours, top 20% pays.', entry_fee_cents: 100, status: isWeekend ? 'upcoming' : now > mktOpen && now < mktClose ? 'live' : 'upcoming', participants: 390, max_participants: 500, account_size: 10000, allowed: 'All Markets', tier: 'standard', start_time: mktOpen.toISOString(), end_time: mktClose.toISOString() },
    { id: 'crypto-night', title: 'Crypto Night Session', description: 'Crypto-only, high volatility, $5 buy-in. Runs 8PM–12AM ET.', entry_fee_cents: 500, status: 'upcoming', participants: 188, max_participants: 250, account_size: 25000, allowed: 'Crypto Only', tier: 'premium', start_time: new Date(now.setHours(20,0,0,0)).toISOString(), end_time: new Date(now.setHours(0,0,0,0)).toISOString() },
    { id: 'pro-showdown', title: 'Pro Showdown', description: 'Elite $25 entry. Bigger account, serious traders only.', entry_fee_cents: 2500, status: 'upcoming', participants: 44, max_participants: 100, account_size: 100000, allowed: 'All Markets', tier: 'elite', start_time: mktOpen.toISOString(), end_time: mktClose.toISOString() },
    { id: 'forex-cup', title: 'Weekend Forex Cup', description: 'Forex-only weekend marathon. $10 entry, runs Sat–Sun.', entry_fee_cents: 1000, status: 'upcoming', participants: 67, max_participants: 200, account_size: 50000, allowed: 'Forex Only', tier: 'premium', start_time: mktOpen.toISOString(), end_time: mktClose.toISOString() },
  ]

  return base.map(t => ({
    ...t,
    prize_pool_cents: Math.floor(t.participants * t.entry_fee_cents * 0.8),
  }))
}

function seedLeaderboard(tournamentId: string, count = 20) {
  const names = ['Marcus T.','Sarah K.','Devon P.','Jordan M.','Aisha B.','Chris L.','Nina R.','Tyler W.','Priya S.','Alex M.','Ryan C.','Zoe H.','Kai N.','Leila F.','Omar J.','Tessa W.','Ben K.','Mia L.','Jake R.','Chloe D.']
  const seed = tournamentId.split('').reduce((a, c) => a + c.charCodeAt(0), 0)
  return names.slice(0, count).map((name, i) => {
    const s = ((i * 2654435761 + seed * 31337) >>> 0)
    const pct = ((s % 3800) - 1400) / 100
    return { rank: i + 1, display_name: name, pnl_percent: pct, pnl: (10000 * pct) / 100, trades: 4 + (s % 20) }
  }).sort((a, b) => b.pnl_percent - a.pnl_percent).map((t, i) => ({ ...t, rank: i + 1 }))
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (DB) {
    if (id) {
      const { data: tournament } = await DB.from('tournaments').select('*').eq('id', id).single()
      const { data: entries } = await DB.from('tournament_entries').select('display_name,pnl,pnl_percent,rank,trades').eq('tournament_id', id).order('rank').limit(50)
      return NextResponse.json({ tournament, leaderboard: entries || [] })
    }
    const { data } = await DB.from('tournaments').select('*').order('created_at', { ascending: false })
    return NextResponse.json({ tournaments: data || [] })
  }

  // Fallback to seeded data
  if (id) {
    const all = seedTournaments()
    const t = all.find(x => x.id === id) || all[0]
    return NextResponse.json({ tournament: t, leaderboard: seedLeaderboard(id) })
  }
  return NextResponse.json({ tournaments: seedTournaments() })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!DB) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })
  const { data, error } = await DB.from('tournaments').insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tournament: data })
}
