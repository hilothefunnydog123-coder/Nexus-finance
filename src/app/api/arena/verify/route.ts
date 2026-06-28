import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { callCanonical, callLeaf, verifyRootSig, chainHash, safeEqualHex, type SealedCallCore } from '@/lib/arena/seal'
import { merkleRoot, merkleProof, verifyProof } from '@/lib/arena/merkle'

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

const TICK = /^[A-Za-z0-9.\-]{1,8}$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

type CallRow = {
  trade_date: string
  ticker: string
  direction: 'up' | 'down'
  start_price: number
  target: number
  horizon: number
  resolve_date: string
  sealed_at: string
  leaf_hash: string
}

function coreOf(r: CallRow): SealedCallCore {
  return {
    trade_date: r.trade_date,
    ticker: r.ticker,
    direction: r.direction,
    start_price: Number(r.start_price),
    target: Number(r.target),
    horizon: Number(r.horizon),
    resolve_date: r.resolve_date,
    sealed_at: new Date(r.sealed_at).toISOString(),
  }
}

/**
 * Verify sealed calls against the day's signed Merkle root.
 *
 *   GET /api/arena/verify?trade_date=YYYY-MM-DD&ticker=NVDA  → one call
 *   GET /api/arena/verify?trade_date=YYYY-MM-DD              → the whole day
 *
 * The day's stored leaves are rebuilt and rehashed. A single-call check returns
 * the call's Merkle inclusion proof and whether its stored leaf still matches a
 * fresh hash of its fields. A whole-day check recomputes the root from every
 * stored call and compares it to the signed root. Either way: edit, backdate,
 * or delete any call and the recomputed root diverges from the signed one —
 * tampering is detected.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const trade_date = url.searchParams.get('trade_date') || ''
  const ticker = (url.searchParams.get('ticker') || '').toUpperCase()

  if (!DATE.test(trade_date)) return NextResponse.json({ error: 'Provide trade_date=YYYY-MM-DD' }, { status: 400 })
  if (ticker && !TICK.test(ticker)) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ available: false })

  const { data: seal } = await admin.from('arena_seals').select('*').eq('trade_date', trade_date).maybeSingle()
  if (!seal) return NextResponse.json({ found: false, trade_date })

  // Previous day's seal — its chain_hash is what this day's chain_hash binds to.
  const { data: prevSeal } = await admin
    .from('arena_seals')
    .select('trade_date,chain_hash,merkle_root')
    .lt('trade_date', trade_date)
    .order('trade_date', { ascending: false })
    .limit(1)
    .maybeSingle()

  const { data: rows } = await admin
    .from('arena_calls')
    .select('trade_date,ticker,direction,start_price,target,horizon,resolve_date,sealed_at,leaf_hash')
    .eq('trade_date', trade_date)
    .order('ticker', { ascending: true })
  const calls = (rows ?? []) as CallRow[]

  // Rebuild the exact leaf set the root was built from (same ticker sort order).
  const ordered = calls.slice().sort((a, b) => a.ticker.localeCompare(b.ticker))
  const leaves = ordered.map((r) => r.leaf_hash)
  const recomputedRoot = merkleRoot(leaves)
  const rootIntact = safeEqualHex(recomputedRoot, seal.merkle_root)
  const rootSigValid = verifyRootSig(seal.merkle_root, seal.root_sig)
  // chain_hash must equal SHA-256(prev_day_chain_hash || this_root). A missing
  // prev seal means this is the genesis day (prev chain = null).
  const chainIntact =
    safeEqualHex(chainHash(prevSeal?.chain_hash ?? null, seal.merkle_root), seal.chain_hash) &&
    (seal.prev_root ?? null) === (prevSeal?.merkle_root ?? null)

  const sealReceipt = {
    trade_date,
    stored_root: seal.merkle_root,
    recomputed_root: recomputedRoot,
    leaf_count_stored: seal.leaf_count,
    leaf_count_actual: calls.length,
    root_intact: rootIntact,
    root_sig_valid: rootSigValid, // null when no PROVENANCE_SECRET configured
    chain_intact: chainIntact,
    algorithm: seal.alg,
    anchor_ref: seal.anchor_ref ?? null,
  }

  // ── Whole-day verification ──────────────────────────────────────────────
  if (!ticker) {
    const countMatches = seal.leaf_count === calls.length
    const tampered = !rootIntact || !countMatches || rootSigValid === false || !chainIntact
    return NextResponse.json(
      {
        found: true,
        mode: 'day',
        signed: !!seal.root_sig,
        tamper_detected: tampered,
        count_matches: countMatches, // false ⇒ a call was added or deleted
        seal: sealReceipt,
      },
      cacheHeaders()
    )
  }

  // ── Single-call verification ────────────────────────────────────────────
  const idx = ordered.findIndex((r) => r.ticker === ticker)
  if (idx < 0) return NextResponse.json({ found: false, trade_date, ticker })

  const row = ordered[idx]
  const core = coreOf(row)
  const expectedLeaf = callLeaf(core)
  const leafIntact = safeEqualHex(expectedLeaf, row.leaf_hash) // false ⇒ the call's fields were edited
  const proof = merkleProof(leaves, idx)
  const included = verifyProof(row.leaf_hash, proof, seal.merkle_root)

  const tampered = !leafIntact || !included || !rootIntact || rootSigValid === false

  return NextResponse.json(
    {
      found: true,
      mode: 'call',
      signed: !!seal.root_sig,
      tamper_detected: tampered,
      call: {
        trade_date: core.trade_date,
        ticker: core.ticker,
        direction: core.direction,
        start_price: core.start_price,
        target: core.target,
        horizon: core.horizon,
        resolve_date: core.resolve_date,
        sealed_at: core.sealed_at,
        status: rowStatus(calls, ticker),
      },
      receipt: {
        canonical: callCanonical(core),
        stored_leaf: row.leaf_hash,
        expected_leaf: expectedLeaf,
        leaf_intact: leafIntact,
        merkle_proof: proof,
        included_in_root: included,
        ...sealReceipt,
      },
    },
    cacheHeaders()
  )
}

function rowStatus(calls: CallRow[], ticker: string): string | null {
  const r = calls.find((c) => c.ticker === ticker) as (CallRow & { status?: string }) | undefined
  return r?.status ?? null
}

function cacheHeaders() {
  return { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
}
