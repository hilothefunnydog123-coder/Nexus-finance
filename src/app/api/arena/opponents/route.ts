/* ════════════════════════════════════════════════════════════════════════
   The Arena — the live combatants' sealed calls.

   For the latest sealed trade_date, read the net's published arena_calls and,
   for every ticker, run the full model roster (lib/arena/models) — Gemini plus
   the deterministic baselines. Each model predicts INDEPENDENTLY (it never sees
   another's call), and we seal each call at the EXACT same instant as the net's
   own call for that day (arena_calls.sealed_at), the same Merkle-leaf way
   (lib/arena/seal#callLeaf). So the whole panel — net + challengers — is sealed
   together and equally tamper-evident.

   POST /api/arena/opponents[?trade_date=YYYY-MM-DD]   (Bearer AGENT_POLL_SECRET)
   GET  /api/arena/opponents[?trade_date=&ticker=]     → { models, opponents }
   ════════════════════════════════════════════════════════════════════════ */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { fetchBars } from '@/lib/forecast'
import { callLeaf, type SealedCallCore } from '@/lib/arena/seal'
import {
  runModels,
  brainstockReasoning,
  MODELS,
  NET_MODEL,
  type ModelContext,
  type MarketSignals,
  type Direction,
} from '@/lib/arena/models'

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

type NetRow = {
  ticker: string
  direction: Direction
  start_price: number
  target: number
  pct: number
  horizon: number
  resolve_date: string
  sealed_at: string
  skill: number | null
  dir_acc: number | null
  engine: string | null
}

/**
 * A live, Search-grounded Gemini caller for LLM combatants. Hard 9s timeout so
 * one slow ticker never stalls the batch; returns null when no key is set
 * (LLM adapters then report unavailable and the baselines carry the arena).
 */
function makeLlm(): ((prompt: string) => Promise<string>) | undefined {
  const key = process.env.GEMINI_API_KEY
  if (!key) return undefined
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`
  return async (prompt: string): Promise<string> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 9000)
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools: [{ google_search: {} }],
          generationConfig: { maxOutputTokens: 320, temperature: 0.5 },
        }),
        signal: ctrl.signal,
      })
      if (!res.ok) return '{}'
      const json = await res.json()
      return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{}'
    } catch {
      return '{}'
    } finally {
      clearTimeout(timer)
    }
  }
}

/** Build the trailing market read every model is given for a ticker. */
async function signalsFor(ticker: string, fallbackLast: number): Promise<MarketSignals> {
  try {
    const bars = await fetchBars(ticker)
    const c = bars.map((b) => b.c)
    const n = c.length
    if (n >= 30) {
      const last = c[n - 1]
      const ret5 = (c[n - 1] - c[n - 6]) / c[n - 6]
      const ret20 = (c[n - 1] - c[n - 21]) / c[n - 21]
      const rets: number[] = []
      for (let i = n - 20; i < n; i++) rets.push((c[i] - c[i - 1]) / c[i - 1])
      const mean = rets.reduce((s, x) => s + x, 0) / rets.length
      const vol = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length)
      return { last, ret5, ret20, vol }
    }
  } catch {
    /* fall through to the line price */
  }
  return { last: fallbackLast, ret5: 0, ret20: 0, vol: 0 }
}

type OppRow = {
  trade_date: string
  ticker: string
  opponent_id: string
  opponent_name: string
  kind: string
  provider: string
  direction: Direction
  conviction: number
  rationale: string
  start_price: number
  target: number
  horizon: number
  resolve_date: string
  sealed_at: string
  leaf_hash: string
  status: string
}

// ── POST: generate + seal every challenger's call for a day ──────────────────
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'Database not configured' }, { status: 503 })

  const url = new URL(req.url)
  const reqDate = url.searchParams.get('trade_date')

  let trade_date = reqDate
  if (!trade_date) {
    const { data: latest } = await admin
      .from('arena_calls')
      .select('trade_date')
      .order('trade_date', { ascending: false })
      .limit(1)
      .maybeSingle()
    trade_date = latest?.trade_date ?? null
  }
  if (!trade_date) return NextResponse.json({ error: 'No sealed arena_calls to challenge' }, { status: 404 })

  // The net's published calls — one bout per ticker. We reuse their sealed_at so
  // every combatant's leaf embeds the identical seal instant.
  const { data: netRows, error: netErr } = await admin
    .from('arena_calls')
    .select('ticker, direction, start_price, target, pct, horizon, resolve_date, sealed_at, skill, dir_acc, engine')
    .eq('trade_date', trade_date)
  if (netErr) return NextResponse.json({ error: netErr.message }, { status: 500 })
  if (!netRows || !netRows.length) return NextResponse.json({ error: 'No net calls for trade_date' }, { status: 404 })

  const llm = makeLlm()

  const rowsByTicker = await pool<NetRow, OppRow[]>(netRows as NetRow[], 10, 48000, async (net) => {
    const horizon = net.horizon ?? 5
    const sealed_at = net.sealed_at || new Date().toISOString() // share the net's seal instant
    const signals = await signalsFor(net.ticker, Number(net.start_price))
    const ctx: ModelContext = {
      ticker: net.ticker,
      trade_date: trade_date as string,
      horizon,
      resolve_date: net.resolve_date,
      signals,
      llm,
    }

    const results = await runModels(ctx)
    const start_price = +signals.last.toFixed(4)
    return results.map((r) => {
      const core: SealedCallCore = {
        trade_date: trade_date as string,
        ticker: net.ticker,
        direction: r.direction,
        start_price,
        target: r.target,
        horizon,
        resolve_date: net.resolve_date,
        sealed_at,
      }
      return {
        trade_date: trade_date as string,
        ticker: net.ticker,
        opponent_id: r.id,
        opponent_name: r.name,
        kind: r.kind,
        provider: r.provider,
        direction: r.direction,
        conviction: +r.conviction.toFixed(2),
        rationale: r.reasoning,
        start_price,
        target: r.target,
        horizon,
        resolve_date: net.resolve_date,
        sealed_at,
        leaf_hash: callLeaf(core),
        status: 'sealed',
      }
    })
  })

  const allRows = rowsByTicker.flat()
  if (!allRows.length) return NextResponse.json({ error: 'No challenger calls produced' }, { status: 502 })

  // Upsert with provider; if that column isn't migrated yet, fall back to the
  // pre-provider shape so calls still seal (run supabase-arena-models.sql).
  let upErr = (await admin.from('arena_opponent_calls').upsert(allRows, { onConflict: 'trade_date,ticker,opponent_id' })).error
  if (upErr) {
    const bare = allRows.map(({ provider, ...rest }) => {
      void provider
      return rest
    })
    upErr = (await admin.from('arena_opponent_calls').upsert(bare, { onConflict: 'trade_date,ticker,opponent_id' })).error
  }
  if (upErr) return NextResponse.json({ error: `Failed to store challenger calls: ${upErr.message}` }, { status: 500 })

  const tickerCount = new Set(allRows.map((r) => r.ticker)).size
  const modelsUsed = [...new Set(allRows.map((r) => r.opponent_id))]
  return NextResponse.json({
    ok: true,
    trade_date,
    models: modelsUsed.length,
    roster: MODELS.length,
    llm_live: !!llm,
    tickers: tickerCount,
    calls: allRows.length,
  })
}

// ── GET: the combatant panel (net + challengers) for a day ───────────────────
type Combatant = {
  model_id: string
  model_name: string
  provider: string
  kind: string
  direction: Direction
  conviction: number
  reasoning: string
  target: number | null
  ticker: string
  leaf_hash: string | null
  status: string
  is_net: boolean
}

export async function GET(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ available: false, models: [], opponents: [] })

  const url = new URL(req.url)
  const reqDate = url.searchParams.get('trade_date')
  const ticker = url.searchParams.get('ticker')?.toUpperCase() || null

  try {
    let trade_date = reqDate
    if (!trade_date) {
      const { data: latest } = await admin
        .from('arena_calls')
        .select('trade_date')
        .order('trade_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      trade_date = latest?.trade_date ?? null
    }
    if (!trade_date) return NextResponse.json({ available: false, models: [], opponents: [] })

    // The net's own sealed call(s) → the first combatant in the panel.
    let netQ = admin
      .from('arena_calls')
      .select('ticker, direction, target, pct, skill, dir_acc, engine, leaf_hash, status')
      .eq('trade_date', trade_date)
    if (ticker) netQ = netQ.eq('ticker', ticker)
    const { data: netData } = await netQ

    const netCombatants: Combatant[] = (netData || []).map((n) => {
      const direction = n.direction as Direction
      const dirAcc = n.dir_acc == null ? 0 : Number(n.dir_acc)
      return {
        model_id: NET_MODEL.id,
        model_name: NET_MODEL.name,
        provider: NET_MODEL.provider,
        kind: NET_MODEL.kind,
        direction,
        conviction: Math.round(dirAcc <= 1 ? dirAcc * 100 : dirAcc),
        reasoning: brainstockReasoning({
          direction,
          pct: Number(n.pct),
          skill: n.skill == null ? null : Number(n.skill),
          dirAcc,
          engine: n.engine,
        }),
        target: n.target == null ? null : Number(n.target),
        ticker: n.ticker,
        leaf_hash: n.leaf_hash ?? null,
        status: n.status ?? 'sealed',
        is_net: true,
      }
    })

    // The challengers from arena_opponent_calls (provider may be absent on old rows).
    let oppQ = admin
      .from('arena_opponent_calls')
      .select('opponent_id, opponent_name, kind, direction, conviction, rationale, target, ticker, leaf_hash, status')
      .eq('trade_date', trade_date)
    if (ticker) oppQ = oppQ.eq('ticker', ticker)
    const { data: oppData } = await oppQ.order('ticker', { ascending: true })

    const providerById = new Map(MODELS.map((m) => [m.id, m.provider]))
    const oppCombatants: Combatant[] = (oppData || []).map((o) => ({
      model_id: o.opponent_id,
      model_name: o.opponent_name,
      provider: providerById.get(o.opponent_id) ?? 'Challenger',
      kind: o.kind,
      direction: o.direction as Direction,
      conviction: Number(o.conviction),
      reasoning: o.rationale ?? '',
      target: o.target == null ? null : Number(o.target),
      ticker: o.ticker,
      leaf_hash: o.leaf_hash ?? null,
      status: o.status ?? 'sealed',
      is_net: false,
    }))

    // Order: net first, then challengers by conviction (most confident first).
    const challengers = oppCombatants.sort((a, b) => b.conviction - a.conviction)
    const models = [...netCombatants, ...challengers]

    // Back-compat: the legacy `opponents` shape (non-net only).
    const opponents = oppCombatants.map((o) => ({
      opponent_id: o.model_id,
      opponent_name: o.model_name,
      kind: o.kind,
      direction: o.direction,
      conviction: o.conviction,
      rationale: o.reasoning,
    }))

    return NextResponse.json(
      { available: true, trade_date, models, opponents },
      { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
    )
  } catch {
    return NextResponse.json({ available: false, models: [], opponents: [] })
  }
}
