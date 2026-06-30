/**
 * Phase 6 — seal + grade. Log our probability for every market the moment it's
 * priced; when Kalshi settles it, grade us (Brier, hit, realized ROI of the
 * worth-it picks) into a public, un-cherry-picked track record.
 *
 * Everything is best-effort: if the table or service key is missing, these
 * functions no-op so they can never block the board from rendering.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { EdgeRow } from './types'

function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

/** Log (upsert) a priced row — one snapshot per market per ET day. */
export async function logEdgeRows(admin: SupabaseClient | null, rows: EdgeRow[]): Promise<number> {
  if (!admin || !rows.length) return 0
  const priced_date = etDate()
  const payload = rows.map((r) => ({
    priced_date,
    market_ticker: r.market.ticker,
    title: r.market.title,
    category: r.market.category,
    engine: r.pricing.engine,
    yn_prob: r.pricing.ynProb,
    market_prob: r.market.yesPrice,
    side: r.verdict.side,
    edge: r.verdict.edge,
    ev_per_dollar: r.verdict.evPerDollar,
    kelly: r.verdict.kelly,
    confidence: r.verdict.confidence,
    worth_it: r.verdict.worthIt,
    close_time: r.market.closeTime,
    status: 'open',
  }))
  try {
    await admin.from('edge_log').upsert(payload, { onConflict: 'market_ticker,priced_date' })
    return payload.length
  } catch {
    return 0
  }
}

export interface GradedRow {
  yn_prob: number       // our P(YES) at pricing time
  market_prob: number
  side: 'YES' | 'NO'
  worth_it: boolean
  result: 'yes' | 'no'
}

/** Grade one settled market — pure, unit-tested by the verify script. */
export function gradeRow(row: GradedRow): { brier: number; side_correct: boolean; pnl_per_dollar: number } {
  const outcome = row.result === 'yes' ? 1 : 0
  const brier = (row.yn_prob - outcome) ** 2
  const side_correct = (row.side === 'YES') === (outcome === 1)
  // Realized P&L per $1 staked on our side: win → (1/price - 1), lose → -1.
  const price = row.side === 'YES' ? row.market_prob : 1 - row.market_prob
  const pnl_per_dollar = side_correct ? 1 / Math.max(0.01, price) - 1 : -1
  return { brier: +brier.toFixed(4), side_correct, pnl_per_dollar: +pnl_per_dollar.toFixed(4) }
}

export interface TrackStats {
  ready: boolean
  graded: number
  worthItGraded: number
  brier: number | null          // mean Brier (lower is better; 0.25 = coin flip)
  brierSkill: number | null     // 1 - brier/0.25  (>0 beats a coin flip)
  hitRate: number | null        // % of our chosen sides that won
  worthItHitRate: number | null
  worthItRoi: number | null     // mean realized P&L per $1 on worth-it picks
  calibration: { bucket: number; predicted: number; actual: number; n: number }[]
  recent: {
    title: string; category: string; side: string; ynProb: number; marketProb: number
    result: string; brier: number; worthIt: boolean; pnl: number; resolvedAt: string | null
  }[]
}

interface SettledLogRow {
  title: string; category: string; side: 'YES' | 'NO'; engine: string
  yn_prob: number; market_prob: number; worth_it: boolean
  result: 'yes' | 'no'; brier: number | null; side_correct: boolean | null
  pnl_per_dollar: number | null; resolved_at: string | null
}

/** Aggregate the settled ledger into the public report card + calibration curve. */
export function aggregate(rows: SettledLogRow[]): TrackStats {
  const graded = rows.filter((r) => r.result === 'yes' || r.result === 'no')
  if (!graded.length) {
    return {
      ready: false, graded: 0, worthItGraded: 0, brier: null, brierSkill: null,
      hitRate: null, worthItHitRate: null, worthItRoi: null, calibration: [], recent: [],
    }
  }
  const briers = graded.map((r) => (r.brier != null ? Number(r.brier) : (Number(r.yn_prob) - (r.result === 'yes' ? 1 : 0)) ** 2))
  const meanBrier = briers.reduce((s, x) => s + x, 0) / briers.length

  const correct = graded.filter((r) => sideCorrect(r)).length
  const worthIt = graded.filter((r) => r.worth_it)
  const worthCorrect = worthIt.filter((r) => sideCorrect(r)).length
  const worthRoi = worthIt.length
    ? worthIt.reduce((s, r) => s + (r.pnl_per_dollar != null ? Number(r.pnl_per_dollar) : realizedPnl(r)), 0) / worthIt.length
    : null

  // Calibration: bucket by OUR predicted P(YES) in deciles, compare to actual YES rate.
  const buckets = new Map<number, { p: number[]; y: number[] }>()
  for (const r of graded) {
    const b = Math.min(9, Math.floor(Number(r.yn_prob) * 10))
    const e = buckets.get(b) ?? { p: [], y: [] }
    e.p.push(Number(r.yn_prob))
    e.y.push(r.result === 'yes' ? 1 : 0)
    buckets.set(b, e)
  }
  const calibration = [...buckets.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([bucket, e]) => ({
      bucket,
      predicted: +(e.p.reduce((s, x) => s + x, 0) / e.p.length).toFixed(3),
      actual: +(e.y.reduce((s, x) => s + x, 0) / e.y.length).toFixed(3),
      n: e.p.length,
    }))

  const recent = [...graded]
    .sort((a, b) => (b.resolved_at || '').localeCompare(a.resolved_at || ''))
    .slice(0, 20)
    .map((r) => ({
      title: r.title, category: r.category, side: r.side, ynProb: Number(r.yn_prob), marketProb: Number(r.market_prob),
      result: r.result, brier: r.brier != null ? Number(r.brier) : +((Number(r.yn_prob) - (r.result === 'yes' ? 1 : 0)) ** 2).toFixed(3),
      worthIt: r.worth_it, pnl: r.pnl_per_dollar != null ? Number(r.pnl_per_dollar) : realizedPnl(r), resolvedAt: r.resolved_at,
    }))

  return {
    ready: true,
    graded: graded.length,
    worthItGraded: worthIt.length,
    brier: +meanBrier.toFixed(4),
    brierSkill: +(1 - meanBrier / 0.25).toFixed(3),
    hitRate: +((correct / graded.length) * 100).toFixed(1),
    worthItHitRate: worthIt.length ? +((worthCorrect / worthIt.length) * 100).toFixed(1) : null,
    worthItRoi: worthRoi == null ? null : +(worthRoi * 100).toFixed(1),
    calibration,
    recent,
  }
}

function sideCorrect(r: SettledLogRow): boolean {
  if (r.side_correct != null) return r.side_correct
  const outcome = r.result === 'yes'
  return (r.side === 'YES') === outcome
}

function realizedPnl(r: SettledLogRow): number {
  const correct = sideCorrect(r)
  const price = r.side === 'YES' ? Number(r.market_prob) : 1 - Number(r.market_prob)
  return correct ? +(1 / Math.max(0.01, price) - 1).toFixed(4) : -1
}
