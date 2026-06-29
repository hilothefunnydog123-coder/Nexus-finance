import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchYahoo } from '@/lib/forecast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin(): SupabaseClient | null {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}
function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

type DueRow = { id: number; ticker: string; start_price: number; direction: string; resolve_date: string }

/**
 * Grade sealed Arena calls whose window has closed, against real closes.
 *
 * Grades both the net's calls (arena_calls) and the rival AIs' calls
 * (arena_opponent_calls): outcome = sign(actual - start_price); a call is a
 * 'hit' iff its sealed `direction` matched that outcome. This sets dir_correct,
 * which the leaderboard's Elo recompute consumes. Grading NEVER touches the
 * sealed fields — only the outcome columns — so the Merkle root stays valid.
 *
 * POST /api/arena/grade  (Bearer AGENT_POLL_SECRET)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ resolved: 0, note: 'no db' })

  const today = etDate()
  const priceCache = new Map<string, Awaited<ReturnType<typeof fetchYahoo>> | null>()
  async function actualAt(ticker: string, resolve_date: string): Promise<number | null> {
    if (!priceCache.has(ticker)) {
      try {
        priceCache.set(ticker, await fetchYahoo(ticker))
      } catch {
        priceCache.set(ticker, null)
      }
    }
    const hist = priceCache.get(ticker)
    if (!hist || !hist.length) return null
    const at = hist.find((h) => h.date >= resolve_date) ?? hist[hist.length - 1]
    return at.price
  }

  const start = Date.now()
  const out: Record<string, number> = {}

  // Grade one table that carries (id, ticker, direction, start_price, resolve_date, status).
  async function gradeTable(table: string): Promise<number> {
    let resolved = 0
    let data: DueRow[] | null = null
    try {
      const res = await admin!
        .from(table)
        .select('id,ticker,start_price,direction,resolve_date')
        .eq('status', 'sealed')
        .lte('resolve_date', today)
        .limit(400)
      data = (res.data as DueRow[]) ?? []
    } catch {
      return 0 // table may not be migrated yet
    }
    for (const row of data) {
      if (Date.now() - start > 50000) break
      const actual = await actualAt(row.ticker, row.resolve_date)
      if (actual == null) continue
      const startPrice = Number(row.start_price)
      const outcome = actual >= startPrice ? 'up' : 'down'
      const dirCorrect = row.direction === outcome
      try {
        await admin!
          .from(table)
          .update({
            status: dirCorrect ? 'hit' : 'miss',
            actual_price: actual,
            dir_correct: dirCorrect,
            resolved_at: new Date().toISOString(),
          })
          .eq('id', row.id)
        resolved++
      } catch {
        /* leave sealed, retry next run */
      }
    }
    return resolved
  }

  out.net = await gradeTable('arena_calls')
  out.opponents = await gradeTable('arena_opponent_calls')
  out.humans = await gradeTable('arena_human_picks')

  return NextResponse.json({ ok: true, resolved: out.net + out.opponents + out.humans, ...out })
}
