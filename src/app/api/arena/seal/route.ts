import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { forecastTicker, addBusinessDays } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'
import { UNIVERSE } from '@/lib/universe'
import { callLeaf, signRoot, chainHash, type SealedCallCore } from '@/lib/arena/seal'
import { merkleRoot } from '@/lib/arena/merkle'

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

async function pool<T, R>(items: T[], concurrency: number, budgetMs: number, fn: (t: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = []
  const start = Date.now()
  let i = 0
  async function worker() {
    while (i < items.length) {
      if (Date.now() - start > budgetMs) return
      const item = items[i++]
      try {
        const r = await fn(item)
        if (r) out.push(r)
      } catch {
        /* skip failures */
      }
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker))
  return out
}

type Generated = SealedCallCore & { pct: number; engine: string; skill: number; dir_acc: number; leaf_hash: string }

/**
 * Seal today's calls.
 *
 * Forecasts the universe with the trained net, freezes each prediction into an
 * immutable sealed-call core (hashed into a leaf), then commits all of the
 * day's leaves into one signed Merkle root. The seal is immutable: once a root
 * exists for trade_date it is returned as-is unless ?force=1 is passed.
 *
 * POST /api/arena/seal?limit=320[&force=1]   (Bearer AGENT_POLL_SECRET)
 */
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(req.url)
  const limitParam = Number(url.searchParams.get('limit'))
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 320) : 320
  const force = url.searchParams.get('force') === '1'

  const trade_date = etDate()

  // Immutable-by-default: never silently re-seal a day that's already committed.
  const { data: existing } = await admin.from('arena_seals').select('*').eq('trade_date', trade_date).maybeSingle()
  if (existing && !force) {
    return NextResponse.json({
      ok: true,
      already_sealed: true,
      trade_date,
      merkle_root: existing.merkle_root,
      leaf_count: existing.leaf_count,
      signed: !!existing.root_sig,
    })
  }

  const model = await loadTrainedModel(admin)
  const sealed_at = new Date().toISOString() // one frozen timestamp for the whole batch
  const resolve_date = addBusinessDays(new Date(trade_date + 'T00:00:00Z'), 5).toISOString().slice(0, 10)
  const tickers = [...new Set(UNIVERSE)].slice(0, limit)

  const calls = await pool<string, Generated>(tickers, 12, 45000, async (ticker) => {
    const f = await forecastTicker(ticker, 5, undefined, model)
    const start_price = f.history[f.history.length - 1]?.price
    const target = f.forecast[f.forecast.length - 1]?.price
    if (!start_price || !target) return null
    const core: SealedCallCore = {
      trade_date,
      ticker,
      direction: target >= start_price ? 'up' : 'down',
      start_price: +start_price.toFixed(4),
      target: +target.toFixed(4),
      horizon: 5,
      resolve_date,
      sealed_at,
    }
    return {
      ...core,
      pct: +(((target - start_price) / start_price) * 100).toFixed(2),
      engine: f.engine,
      skill: f.metrics.skill_score,
      dir_acc: f.metrics.directional_accuracy,
      leaf_hash: callLeaf(core),
    }
  })

  if (!calls.length) return NextResponse.json({ error: 'No forecasts produced' }, { status: 502 })

  // Deterministic leaf order: sort by ticker (unique per day) so anyone can
  // rebuild the exact same tree — and the same root — from the stored rows.
  calls.sort((a, b) => a.ticker.localeCompare(b.ticker))
  const root = merkleRoot(calls.map((c) => c.leaf_hash))
  const root_sig = signRoot(root)

  // Chain this root to the chronological PREDECESSOR (trade_date < this day) —
  // must match the verifier, and avoids a day chaining to itself on ?force=1
  // re-seal or pointing forward when backfilling a past day.
  const { data: prev } = await admin
    .from('arena_seals')
    .select('merkle_root, chain_hash')
    .lt('trade_date', trade_date)
    .order('trade_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const prev_root: string | null = prev?.merkle_root ?? null
  const chain_hash = chainHash(prev?.chain_hash ?? null, root)

  // Persist calls first, then the root that commits to them.
  const callRows = calls.map((c) => ({
    trade_date: c.trade_date,
    ticker: c.ticker,
    direction: c.direction,
    start_price: c.start_price,
    target: c.target,
    pct: c.pct,
    horizon: c.horizon,
    resolve_date: c.resolve_date,
    sealed_at: c.sealed_at,
    leaf_hash: c.leaf_hash,
    engine: c.engine,
    skill: c.skill,
    dir_acc: c.dir_acc,
    status: 'sealed',
  }))

  if (force) await admin.from('arena_calls').delete().eq('trade_date', trade_date)
  const { error: callErr } = await admin.from('arena_calls').upsert(callRows, { onConflict: 'trade_date,ticker' })
  if (callErr) return NextResponse.json({ error: `Failed to store calls: ${callErr.message}` }, { status: 500 })

  const { error: sealErr } = await admin.from('arena_seals').upsert(
    {
      trade_date,
      merkle_root: root,
      leaf_count: calls.length,
      root_sig,
      alg: 'sha256',
      prev_root,
      chain_hash,
      sealed_at,
    },
    { onConflict: 'trade_date' }
  )
  if (sealErr) return NextResponse.json({ error: `Failed to store seal: ${sealErr.message}` }, { status: 500 })

  return NextResponse.json({
    ok: true,
    trade_date,
    sealed_at,
    leaf_count: calls.length,
    merkle_root: root,
    signed: !!root_sig,
    chain_hash,
  })
}
