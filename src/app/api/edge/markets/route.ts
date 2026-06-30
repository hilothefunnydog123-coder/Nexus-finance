import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { buildBoard, slimRow } from '@/lib/edge/board'
import { logEdgeRows } from '@/lib/edge/store'
import type { EdgeCategory } from '@/lib/edge/types'

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

// GET /api/edge/markets — the priced board (Phases 1–3), filtered + ranked.
//   ?category=Crypto&minEdge=0.05&minVolume=1000&worthOnly=1&limit=60
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const category = sp.get('category') as EdgeCategory | null
  const minEdge = Number(sp.get('minEdge') ?? '0')
  const minVolume = Number(sp.get('minVolume') ?? '0')
  const worthOnly = sp.get('worthOnly') === '1'
  const limit = Math.min(120, Math.max(1, Number(sp.get('limit') ?? '60')))

  try {
    const admin = getAdmin()
    const board = await buildBoard({ admin, limit, minVolume })

    // Seal the moat: log every priced row (best-effort) before filtering for display.
    await logEdgeRows(admin, board.rows)

    let rows = board.rows
    if (category && category !== ('All' as EdgeCategory)) rows = rows.filter((r) => r.market.category === category)
    if (minEdge > 0) rows = rows.filter((r) => r.verdict.edge >= minEdge)
    if (worthOnly) rows = rows.filter((r) => r.verdict.worthIt)

    return NextResponse.json(
      { ...board, rows: rows.map(slimRow) },
      { headers: { 'Cache-Control': 's-maxage=45, stale-while-revalidate=120' } }
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Could not build edge board: ${msg}`, rows: [], meta: null }, { status: 502 })
  }
}
