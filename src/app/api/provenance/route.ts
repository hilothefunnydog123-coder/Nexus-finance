import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyCall, type CallCore } from '@/lib/provenance'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

const TICK = /^[A-Za-z0-9.\-]{1,8}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * Verify a logged forecast call's provenance.
 * GET /api/provenance?trade_date=2026-06-20&ticker=NVDA
 * Recomputes the digest from the stored prediction fields and checks it
 * against the receipt written when the call was logged.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const trade_date = url.searchParams.get('trade_date') || ''
  const ticker = (url.searchParams.get('ticker') || '').toUpperCase()

  if (!DATE.test(trade_date) || !TICK.test(ticker)) {
    return NextResponse.json({ error: 'Provide trade_date=YYYY-MM-DD and ticker' }, { status: 400 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ available: false })

  let row: Record<string, unknown> | null = null
  try {
    const { data } = await admin
      .from('forecast_calls')
      .select('*')
      .eq('trade_date', trade_date)
      .eq('ticker', ticker)
      .maybeSingle()
    row = data as Record<string, unknown> | null
  } catch {
    return NextResponse.json({ available: false })
  }

  if (!row) return NextResponse.json({ found: false })

  const core: CallCore = {
    trade_date: String(row.trade_date),
    ticker: String(row.ticker),
    start_price: Number(row.start_price),
    target: Number(row.target),
    pct: Number(row.pct),
    horizon: Number(row.horizon),
    resolve_date: String(row.resolve_date),
  }

  const storedHash = (row.proof_hash as string | null) ?? null
  const storedSig = (row.proof_sig as string | null) ?? null
  const result = verifyCall(core, storedHash, storedSig)

  return NextResponse.json(
    {
      found: true,
      signed: !!storedHash,
      verified: result.verified,
      hashMatch: result.hashMatch,
      sigValid: result.sigValid,
      receipt: {
        prediction: core,
        canonical: result.canonical,
        stored_hash: storedHash,
        expected_hash: result.expectedHash,
        algorithm: (row.proof_alg as string | null) ?? null,
      },
      outcome: { status: row.status ?? null, actual_price: row.actual_price ?? null },
    },
    { headers: { 'Cache-Control': 's-maxage=60, stale-while-revalidate=300' } }
  )
}
