import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { roundRobinUpdate, type BoutParticipant } from '@/lib/arena/elo'

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

export type Standing = {
  participant_id: string
  participant_type: string
  display_name: string
  rating: number
  bouts: number
  wins: number
  losses: number
  streak: number
  best_streak: number
  pnl_pct: number
}

// Shown only when there's no DB / empty standings, so the board always renders.
const DEMO_STANDINGS: Standing[] = [
  { participant_id: 'brainstock', participant_type: 'net', display_name: 'BrainStock', rating: 1564, bouts: 48, wins: 27, losses: 15, streak: 3, best_streak: 6, pnl_pct: 8.4 },
  { participant_id: 'momentum', participant_type: 'opponent', display_name: 'Momentum Mike', rating: 1528, bouts: 48, wins: 24, losses: 18, streak: 1, best_streak: 4, pnl_pct: 4.1 },
  { participant_id: 'contrarian', participant_type: 'opponent', display_name: 'Contrarian Cass', rating: 1502, bouts: 48, wins: 21, losses: 20, streak: -1, best_streak: 3, pnl_pct: 0.9 },
  { participant_id: 'macro', participant_type: 'opponent', display_name: 'Macro Maya', rating: 1486, bouts: 48, wins: 19, losses: 22, streak: -2, best_streak: 3, pnl_pct: -1.7 },
  { participant_id: 'quant', participant_type: 'opponent', display_name: 'Quant Quinn', rating: 1471, bouts: 48, wins: 18, losses: 24, streak: 1, best_streak: 2, pnl_pct: -3.2 },
]

// ── GET: read the standings ladder (or demo). ─────────────────────────────
export async function GET() {
  const admin = getAdmin()
  if (!admin) {
    return NextResponse.json(
      { standings: DEMO_STANDINGS, demo: true },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  }
  try {
    const { data, error } = await admin
      .from('arena_standings')
      .select('participant_id, participant_type, display_name, rating, bouts, wins, losses, streak, best_streak, pnl_pct')
      .order('rating', { ascending: false })
    if (error || !data || data.length === 0) {
      return NextResponse.json(
        { standings: DEMO_STANDINGS, demo: true },
        { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
      )
    }
    return NextResponse.json(
      { standings: data as Standing[] },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  } catch {
    return NextResponse.json(
      { standings: DEMO_STANDINGS, demo: true },
      { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
    )
  }
}

// ── Internal recompute model. ─────────────────────────────────────────────
type Acc = {
  participant_id: string
  participant_type: string
  display_name: string
  rating: number
  bouts: number
  wins: number
  losses: number
  pushes: number
  streak: number
  best_streak: number
  last_bout_date: string | null
}

type RawCall = {
  trade_date: string
  ticker: string
  participant_id: string
  participant_type: string
  display_name: string
  dir_correct: boolean
}

// POST: recompute the entire ladder from scratch (idempotent).
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'No database configured' }, { status: 503 })

  try {
    const calls: RawCall[] = []

    // The net's graded sealed calls.
    const { data: netRows } = await admin
      .from('arena_calls')
      .select('trade_date, ticker, status, dir_correct')
      .neq('status', 'sealed')
    for (const r of netRows ?? []) {
      if (r.dir_correct === null || r.dir_correct === undefined) continue
      calls.push({
        trade_date: r.trade_date,
        ticker: r.ticker,
        participant_id: 'brainstock',
        participant_type: 'net',
        display_name: 'BrainStock',
        dir_correct: !!r.dir_correct,
      })
    }

    // Rival AIs — table may not exist yet; tolerate it.
    try {
      const { data: oppRows } = await admin
        .from('arena_opponent_calls')
        .select('trade_date, ticker, opponent_id, opponent_name, status, dir_correct')
        .neq('status', 'sealed')
      for (const r of oppRows ?? []) {
        if (r.dir_correct === null || r.dir_correct === undefined) continue
        calls.push({
          trade_date: r.trade_date,
          ticker: r.ticker,
          participant_id: r.opponent_id,
          participant_type: 'opponent',
          display_name: r.opponent_name ?? r.opponent_id,
          dir_correct: !!r.dir_correct,
        })
      }
    } catch {
      /* arena_opponent_calls not migrated yet — score the net alone */
    }

    // Group into bouts: (trade_date, ticker).
    const bouts = new Map<string, RawCall[]>()
    for (const c of calls) {
      const key = `${c.trade_date}|${c.ticker}`
      const arr = bouts.get(key)
      if (arr) arr.push(c)
      else bouts.set(key, [c])
    }

    // Chronological order (then ticker) for deterministic streak math.
    const keys = [...bouts.keys()].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))

    const acc = new Map<string, Acc>()
    const ensure = (c: RawCall): Acc => {
      let a = acc.get(c.participant_id)
      if (!a) {
        a = {
          participant_id: c.participant_id,
          participant_type: c.participant_type,
          display_name: c.display_name,
          rating: 1500,
          bouts: 0,
          wins: 0,
          losses: 0,
          pushes: 0,
          streak: 0,
          best_streak: 0,
          last_bout_date: null,
        }
        acc.set(c.participant_id, a)
      }
      // keep latest display name / type
      a.display_name = c.display_name
      a.participant_type = c.participant_type
      return a
    }

    let boutCount = 0
    for (const key of keys) {
      const members = bouts.get(key)!
      if (members.length < 2) continue // a bout needs at least two graded sides
      boutCount++
      const tradeDate = members[0].trade_date

      const accs = members.map(ensure)
      const parts: BoutParticipant[] = accs.map((a, i) => ({
        id: a.participant_id,
        rating: a.rating,
        correct: members[i].dir_correct,
      }))

      const deltas = roundRobinUpdate(parts, 24)

      const anyCorrect = members.some((m) => m.dir_correct)
      const anyWrong = members.some((m) => !m.dir_correct)
      const decisive = anyCorrect && anyWrong // someone was right AND someone wrong

      for (let i = 0; i < accs.length; i++) {
        const a = accs[i]
        a.rating += deltas[a.participant_id] ?? 0
        a.bouts++
        a.last_bout_date = tradeDate
        if (!decisive) {
          // all-correct or all-wrong: no edge changed hands.
          a.pushes++
        } else if (members[i].dir_correct) {
          a.wins++
          a.streak = a.streak > 0 ? a.streak + 1 : 1
          if (a.streak > a.best_streak) a.best_streak = a.streak
        } else {
          a.losses++
          a.streak = a.streak < 0 ? a.streak - 1 : -1
        }
      }
    }

    const rows = [...acc.values()].map((a) => ({
      participant_id: a.participant_id,
      participant_type: a.participant_type,
      display_name: a.display_name,
      rating: +a.rating.toFixed(2),
      bouts: a.bouts,
      wins: a.wins,
      losses: a.losses,
      pushes: a.pushes,
      streak: a.streak,
      best_streak: a.best_streak,
      last_bout_date: a.last_bout_date,
      updated_at: new Date().toISOString(),
    }))

    if (rows.length) {
      await admin.from('arena_standings').upsert(rows, { onConflict: 'participant_id' })
    }

    return NextResponse.json({
      ok: true,
      participants: rows.length,
      bouts: boutCount,
      graded: calls.length,
    })
  } catch (e) {
    console.error('[/api/arena/leaderboard]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
