/* ════════════════════════════════════════════════════════════════════════
   The Arena — RIVAL AI opponents' sealed calls.

   For the latest sealed trade_date, read the net's published arena_calls and,
   for every ticker, run the whole opponent roster (lib/arena/roster). Each
   opponent takes its own side; we seal that side the EXACT same way the net's
   calls are sealed (lib/arena/seal#callLeaf over a SealedCallCore) so opponent
   calls are equally tamper-evident, then upsert into arena_opponent_calls.

   POST /api/arena/opponents[?trade_date=YYYY-MM-DD]   (Bearer AGENT_POLL_SECRET)
   GET  /api/arena/opponents[?trade_date=&ticker=]
   ════════════════════════════════════════════════════════════════════════ */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { forecastTicker, fetchBars, addBusinessDays } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'
import { callLeaf, type SealedCallCore } from '@/lib/arena/seal'
import { OPPONENTS, type OpponentContext, type NetCall, type Direction } from '@/lib/arena/roster'

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
  horizon: number
  resolve_date: string
}

/**
 * A best-effort Gemini caller for LLM-persona opponents. Calls the model
 * directly (server-side) with a hard timeout, mirroring /api/gemini's minimal
 * call. Returns null when no key is set so the roster falls back to bots.
 */
function makeLlm(): ((prompt: string) => Promise<string>) | undefined {
  const key = process.env.GEMINI_API_KEY
  if (!key) return undefined
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
  return async (prompt: string): Promise<string> => {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 8000)
    try {
      const res = await fetch(`${url}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 120, temperature: 0.6 } }),
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

/** Derive an opponent's own target price from its direction + conviction. */
function opponentTarget(start_price: number, direction: Direction, conviction: number): number {
  // Conviction (0..100) scales a modest move between ~0.5% and ~5% over the horizon.
  const moveFrac = 0.005 + (conviction / 100) * 0.045
  const signed = direction === 'up' ? moveFrac : -moveFrac
  return +(start_price * (1 + signed)).toFixed(4)
}

// ── POST: generate + seal opponents' calls for a day ─────────────────────────
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

  // Pick the day: explicit ?trade_date= or the latest sealed day.
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
  if (!trade_date) return NextResponse.json({ error: 'No sealed arena_calls to oppose' }, { status: 404 })

  // The net's published calls for that day — one bout per ticker.
  const { data: netRows, error: netErr } = await admin
    .from('arena_calls')
    .select('ticker, direction, start_price, target, horizon, resolve_date')
    .eq('trade_date', trade_date)
  if (netErr) return NextResponse.json({ error: netErr.message }, { status: 500 })
  if (!netRows || !netRows.length) return NextResponse.json({ error: 'No net calls for trade_date' }, { status: 404 })

  const model = await loadTrainedModel(admin)
  const llm = makeLlm()
  const sealed_at = new Date().toISOString() // one frozen timestamp for the whole batch
  const resolve_date = addBusinessDays(new Date(trade_date + 'T00:00:00Z'), 5).toISOString().slice(0, 10)

  type OppRow = {
    trade_date: string
    ticker: string
    opponent_id: string
    opponent_name: string
    kind: string
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

  // Concurrency-pool the per-ticker forecast/feature work like daily-picks.
  const rowsByTicker = await pool<NetRow, OppRow[]>(netRows as NetRow[], 12, 45000, async (net) => {
    // Build the shared decision context from real market data.
    let last = Number(net.start_price)
    let ret5 = 0
    let ret20 = 0
    let vol = 0
    try {
      const bars = await fetchBars(net.ticker)
      const c = bars.map((b) => b.c)
      const n = c.length
      if (n >= 30) {
        last = c[n - 1]
        ret5 = (c[n - 1] - c[n - 6]) / c[n - 6]
        ret20 = (c[n - 1] - c[n - 21]) / c[n - 21]
        const rets: number[] = []
        for (let i = n - 20; i < n; i++) rets.push((c[i] - c[i - 1]) / c[i - 1])
        const mean = rets.reduce((s, x) => s + x, 0) / rets.length
        vol = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length)
      } else {
        // Thin history — fall back to a forecast snapshot for at least a price.
        const f = await forecastTicker(net.ticker, 5, undefined, model)
        last = f.history[f.history.length - 1]?.price ?? last
      }
    } catch {
      /* keep net.start_price as the line if bars are unavailable */
    }

    const netCall: NetCall = {
      ticker: net.ticker,
      direction: net.direction,
      start_price: Number(net.start_price),
      target: Number(net.target),
      horizon: net.horizon ?? 5,
    }
    const ctx: OpponentContext = { trade_date: trade_date as string, ticker: net.ticker, last, ret5, ret20, vol, net: netCall, llm }

    const rows: OppRow[] = []
    for (const opp of OPPONENTS) {
      let decision
      try {
        decision = await opp.decide(ctx)
      } catch {
        continue // a misbehaving opponent never sinks the bout
      }
      const start_price = +last.toFixed(4)
      const target = opponentTarget(start_price, decision.direction, decision.conviction)
      const core: SealedCallCore = {
        trade_date: trade_date as string,
        ticker: net.ticker,
        direction: decision.direction,
        start_price,
        target,
        horizon: netCall.horizon,
        resolve_date,
        sealed_at,
      }
      rows.push({
        trade_date: trade_date as string,
        ticker: net.ticker,
        opponent_id: opp.id,
        opponent_name: opp.name,
        kind: opp.kind,
        direction: decision.direction,
        conviction: +decision.conviction.toFixed(2),
        rationale: decision.rationale,
        start_price,
        target,
        horizon: netCall.horizon,
        resolve_date,
        sealed_at,
        leaf_hash: callLeaf(core),
        status: 'sealed',
      })
    }
    return rows
  })

  const allRows = rowsByTicker.flat()
  if (!allRows.length) return NextResponse.json({ error: 'No opponent calls produced' }, { status: 502 })

  const { error: upErr } = await admin
    .from('arena_opponent_calls')
    .upsert(allRows, { onConflict: 'trade_date,ticker,opponent_id' })
  if (upErr) return NextResponse.json({ error: `Failed to store opponent calls: ${upErr.message}` }, { status: 500 })

  const tickerCount = new Set(allRows.map((r) => r.ticker)).size
  return NextResponse.json({
    ok: true,
    trade_date,
    opponents: OPPONENTS.length,
    tickers: tickerCount,
    calls: allRows.length,
  })
}

// ── GET: list opponents' calls for a day (optionally one ticker) ─────────────
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ available: false, opponents: [] })

  const url = new URL(req.url)
  const reqDate = url.searchParams.get('trade_date')
  const ticker = url.searchParams.get('ticker')

  try {
    let trade_date = reqDate
    if (!trade_date) {
      const { data: latest } = await admin
        .from('arena_opponent_calls')
        .select('trade_date')
        .order('trade_date', { ascending: false })
        .limit(1)
        .maybeSingle()
      trade_date = latest?.trade_date ?? null
    }
    if (!trade_date) return NextResponse.json({ available: false, opponents: [] })

    let q = admin
      .from('arena_opponent_calls')
      .select('opponent_id, opponent_name, kind, direction, conviction, rationale, ticker, leaf_hash, status')
      .eq('trade_date', trade_date)
    if (ticker) q = q.eq('ticker', ticker.toUpperCase())
    const { data, error } = await q.order('ticker', { ascending: true })
    if (error) return NextResponse.json({ available: false, opponents: [] })

    const opponents = (data || []).map((r) => ({
      opponent_id: r.opponent_id,
      opponent_name: r.opponent_name,
      kind: r.kind,
      direction: r.direction,
      conviction: Number(r.conviction),
      rationale: r.rationale,
      ticker: r.ticker,
      leaf_hash: r.leaf_hash,
      status: r.status,
    }))

    return NextResponse.json(
      { available: true, trade_date, opponents },
      { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
    )
  } catch {
    return NextResponse.json({ available: false, opponents: [] })
  }
}
