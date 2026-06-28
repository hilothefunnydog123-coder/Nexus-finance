import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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

const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * List sealed calls and the day's signed Merkle root.
 *
 * GET /api/arena/calls                  → latest sealed day
 * GET /api/arena/calls?trade_date=YYYY-MM-DD
 * GET /api/arena/calls?ticker=NVDA      → one ticker's full sealed history
 */
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ available: false, calls: [] })

  const url = new URL(req.url)
  const ticker = (url.searchParams.get('ticker') || '').toUpperCase()
  let trade_date = url.searchParams.get('trade_date') || ''
  const limit = Math.min(Number(url.searchParams.get('limit')) || 500, 500)

  if (trade_date && !DATE.test(trade_date)) {
    return NextResponse.json({ error: 'trade_date must be YYYY-MM-DD' }, { status: 400 })
  }

  try {
    // Cross-day history for one ticker — return its calls without pinning a day.
    if (ticker && !trade_date) {
      const { data } = await admin
        .from('arena_calls')
        .select('*')
        .eq('ticker', ticker)
        .order('trade_date', { ascending: false })
        .limit(limit)
      return NextResponse.json({ available: true, ticker, calls: data ?? [] }, cacheHeaders())
    }

    // Default to the most recent sealed day.
    if (!trade_date) {
      const { data: latest } = await admin
        .from('arena_seals')
        .select('trade_date')
        .order('trade_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      trade_date = latest?.trade_date ?? ''
      if (!trade_date) return NextResponse.json({ available: true, calls: [], seal: null })
    }

    const { data: seal } = await admin.from('arena_seals').select('*').eq('trade_date', trade_date).maybeSingle()

    let q = admin.from('arena_calls').select('*').eq('trade_date', trade_date).order('ticker', { ascending: true }).limit(limit)
    if (ticker) q = q.eq('ticker', ticker)
    const { data: calls } = await q

    return NextResponse.json(
      {
        available: true,
        trade_date,
        seal: seal
          ? {
              merkle_root: seal.merkle_root,
              leaf_count: seal.leaf_count,
              root_sig: seal.root_sig,
              alg: seal.alg,
              prev_root: seal.prev_root,
              chain_hash: seal.chain_hash,
              anchor_ref: seal.anchor_ref ?? null,
              sealed_at: seal.sealed_at,
            }
          : null,
        count: calls?.length ?? 0,
        calls: calls ?? [],
      },
      cacheHeaders()
    )
  } catch (e) {
    return NextResponse.json({ available: false, calls: [], error: String(e) }, { status: 500 })
  }
}

function cacheHeaders() {
  return { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
}
