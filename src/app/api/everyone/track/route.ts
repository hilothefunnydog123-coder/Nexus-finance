import { NextResponse } from 'next/server'
import { getAdmin, PROXY_TO_CAT } from '@/lib/everyone/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — the public track record.
//
// Reads prediction_log rows logged by /forecast & /snapshot (source 'everyone'),
// maps each primary proxy back to its consumer category, and reports the net's
// REAL graded directional accuracy (dir_correct over resolved rows). This is the
// accountability moat applied to everyday prices. Never throws to the client.

type Row = {
  ticker: string
  trade_date: string | null
  resolve_date: string | null
  status: string | null
  dir_correct: boolean | null
  start_price: number | null
  predicted: number | null
}

// how each primary proxy's move maps onto the CONSUMER price direction.
// (TLT inverse: bonds up → rates/mortgage down. The rest move WITH the price.)
const PROXY_REL: Record<string, 'with' | 'inverse'> = { TLT: 'inverse', UGA: 'with', USO: 'with', UNG: 'with' }

type Recent = { date: string; dir: 'up' | 'down'; correct: boolean | null }
type CatOut = { category: string; proxy: string; resolved: number; accuracy: number | null; recent: Recent[] }

const EMPTY = { ok: false as const, overall: { resolved: 0, accuracy: null as number | null }, categories: [] as CatOut[] }

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json(EMPTY)

  let rows: Row[]
  try {
    const { data, error } = await admin
      .from('prediction_log')
      .select('ticker, trade_date, resolve_date, status, dir_correct, start_price, predicted')
      .eq('source', 'everyone')
      .order('trade_date', { ascending: false })
      .limit(2000)
    if (error || !data) return NextResponse.json(EMPTY)
    rows = data as Row[]
  } catch {
    return NextResponse.json(EMPTY)
  }

  // bucket rows by category via the primary-proxy map.
  const buckets = new Map<string, { proxy: string; rows: Row[] }>()
  for (const r of rows) {
    const map = PROXY_TO_CAT[r.ticker]
    if (!map) continue
    let b = buckets.get(map.category)
    if (!b) {
      b = { proxy: map.proxy, rows: [] }
      buckets.set(map.category, b)
    }
    b.rows.push(r)
  }

  let overallResolved = 0
  let overallCorrect = 0

  // stable ordering for the board.
  const ORDER = ['mortgage', 'gas', 'flights', 'electricity']
  const categories: CatOut[] = []

  for (const category of ORDER) {
    const b = buckets.get(category)
    if (!b) continue

    // resolved = graded rows (status != 'open') with a recorded dir_correct.
    const resolvedRows = b.rows.filter((r) => (r.status ?? 'open') !== 'open' && r.dir_correct != null)
    const resolved = resolvedRows.length
    const correct = resolvedRows.filter((r) => r.dir_correct === true).length
    overallResolved += resolved
    overallCorrect += correct

    // recent calls (newest first). The CONSUMER-price direction we called is
    // recovered from the logged proxy move (predicted vs start), rel-adjusted.
    const rel = PROXY_REL[b.rows[0]?.ticker ?? ''] ?? 'with'
    const recent: Recent[] = b.rows.slice(0, 8).map((r) => {
      const proxyUp = (r.predicted ?? 0) >= (r.start_price ?? 0)
      const consumerUp = rel === 'with' ? proxyUp : !proxyUp
      const correctV = r.dir_correct == null || (r.status ?? 'open') === 'open' ? null : r.dir_correct
      return {
        date: r.trade_date || r.resolve_date || '',
        dir: (consumerUp ? 'up' : 'down') as 'up' | 'down',
        correct: correctV,
      }
    })

    categories.push({
      category,
      proxy: b.proxy,
      resolved,
      accuracy: resolved ? +((correct / resolved) * 100).toFixed(1) : null,
      recent,
    })
  }

  const overall = {
    resolved: overallResolved,
    accuracy: overallResolved ? +((overallCorrect / overallResolved) * 100).toFixed(1) : null,
  }

  return NextResponse.json({ ok: true, overall, categories })
}
