import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!URL.startsWith('http') || !SERVICE) return null
  try { return createClient(URL, SERVICE) } catch { return null }
}

type Tile = { ticker: string; pct: number; price: number }

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, tiles: [] })
  try {
    let tiles: Tile[] = []
    let asOf: string | null = null

    // Primary: the full-universe forecasts logged by the daily batch.
    try {
      const { data: head } = await admin.from('prediction_log').select('trade_date').eq('source', 'daily').order('trade_date', { ascending: false }).limit(1).maybeSingle()
      if (head?.trade_date) {
        asOf = head.trade_date
        const { data } = await admin.from('prediction_log').select('ticker,start_price,predicted').eq('source', 'daily').eq('trade_date', head.trade_date).limit(600)
        tiles = (data || []).map((r) => {
          const s = Number(r.start_price), p = Number(r.predicted)
          return { ticker: r.ticker as string, price: +s.toFixed(2), pct: s ? +(((p - s) / s) * 100).toFixed(2) : 0 }
        })
      }
    } catch { /* fall through */ }

    // Fallback: the Bull/Bear board (always populated) → ~30 tiles.
    if (tiles.length < 24) {
      const { data: board } = await admin.from('daily_picks').select('trade_date,picks,bears').order('trade_date', { ascending: false }).limit(1).maybeSingle()
      if (board) {
        asOf = board.trade_date
        const mk = (arr: { ticker: string; price: number; pct5?: number; pct?: number }[]) => (arr || []).map((p) => ({ ticker: p.ticker, price: +Number(p.price).toFixed(2), pct: +Number(p.pct5 ?? p.pct ?? 0).toFixed(2) }))
        tiles = [...mk(board.picks || []), ...mk(board.bears || [])]
      }
    }

    // de-dup, sort most bullish → most bearish
    const seen = new Set<string>()
    tiles = tiles.filter((t) => (seen.has(t.ticker) ? false : (seen.add(t.ticker), true))).sort((a, b) => b.pct - a.pct)

    const bull = tiles.filter((t) => t.pct > 0).length
    const bear = tiles.filter((t) => t.pct < 0).length
    const avg = tiles.length ? +(tiles.reduce((s, t) => s + t.pct, 0) / tiles.length).toFixed(2) : 0

    return NextResponse.json(
      { ready: tiles.length > 0, asOf, count: tiles.length, bull, bear, avg, lean: bull >= bear ? 'bullish' : 'bearish', tiles },
      { headers: { 'Cache-Control': 's-maxage=300, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ ready: false, tiles: [] })
  }
}
