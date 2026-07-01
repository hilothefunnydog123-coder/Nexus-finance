/**
 * Board assembler — ties Phases 1–3 together: fetch active markets, price each
 * one (neural net or Gemini), compute the worth-it verdict, rank, and package an
 * EdgeBoard. Pricing the underlyings hits Yahoo, so we bound concurrency.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NNModel } from '@/lib/nn'
import { fetchActiveMarkets, type FetchOptions } from './kalshi'
import { priceMarket, loadModelFor } from './pricing'
import { computeVerdict, edgeScore } from './worth'
import type { EdgeBoard, EdgeCategory, EdgeRow, KalshiMarket } from './types'

async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length)
  let i = 0
  async function worker() {
    while (i < items.length) {
      const idx = i++
      out[idx] = await fn(items[idx])
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return out
}

export interface BuildOptions extends FetchOptions {
  model?: NNModel | null
  admin?: SupabaseClient | null
  concurrency?: number
}

/**
 * Round-robin a volume-sorted market list across categories so EVERY category
 * that has markets is represented on the board — even ones whose markets are all
 * low-volume right now (e.g. Sports). Without this, a purely volume-ranked slice
 * silently drops whole categories, so their filter chip never appears. Within a
 * category the input order (volume desc) is preserved.
 */
function pickBalanced(markets: KalshiMarket[], limit: number): KalshiMarket[] {
  if (markets.length <= limit) return markets
  const byCat = new Map<string, KalshiMarket[]>()
  for (const m of markets) {
    const arr = byCat.get(m.category)
    if (arr) arr.push(m)
    else byCat.set(m.category, [m])
  }
  const queues = [...byCat.values()]
  const out: KalshiMarket[] = []
  let progressed = true
  while (out.length < limit && progressed) {
    progressed = false
    for (const q of queues) {
      if (!q.length) continue
      out.push(q.shift()!)
      progressed = true
      if (out.length >= limit) break
    }
  }
  return out
}

export async function buildBoard(opts: BuildOptions = {}): Promise<EdgeBoard> {
  // Fetch a WIDE universe (so every category is available), then select a
  // category-balanced display set down to the requested limit.
  const displayLimit = opts.limit ?? 150
  const { markets: universe, live, reason } = await fetchActiveMarkets({ ...opts, limit: Math.max(displayLimit, 1500) })
  const markets = pickBalanced(universe, displayLimit)
  const model = opts.model ?? (await loadModelFor(opts.admin ?? null))

  // Board mode: price the whole universe cheaply (net for tradables + a fast prior
  // for the rest). The detail page runs the full Gemini grounding on demand.
  const rows = await mapLimit<KalshiMarket, EdgeRow>(markets, opts.concurrency ?? 8, async (market) => {
    const pricing = await priceMarket(market, model, opts.signal, { skipGemini: true })
    const verdict = computeVerdict(market, pricing)
    return { market, pricing, verdict, pricedAt: new Date().toISOString() }
  })

  rows.sort((a, b) => edgeScore(b.verdict) - edgeScore(a.verdict))

  const categories = [...new Set(rows.map((r) => r.market.category))] as EdgeCategory[]
  const pricedLive = rows.some((r) => r.pricing.engine === 'brainstock-nn' || r.pricing.engine === 'gemini-grounded')

  return {
    rows,
    meta: {
      pricedAt: new Date().toISOString(),
      marketCount: rows.length,
      worthItCount: rows.filter((r) => r.verdict.worthIt).length,
      liveData: live,
      pricedLive,
      categories,
      note: live
        ? undefined
        : `Showing the offline seed market set — ${reason || 'live Kalshi data unavailable'}. See /api/edge/diag for details.`,
    },
  }
}

/** Strip the heavy forecast chart from rows (keep board payloads small). */
export function slimRow(r: EdgeRow): EdgeRow {
  if (!r.pricing.underlying?.chart) return r
  return { ...r, pricing: { ...r.pricing, underlying: { ...r.pricing.underlying, chart: undefined } } }
}
