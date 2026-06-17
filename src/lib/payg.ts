/**
 * Pay-as-it-wins billing math — "you only pay when the AI is right."
 *
 * Profitability rules baked in here:
 *  - The MONTHLY CAP is the real price. Per-win price is set high enough that a
 *    normal month's winning calls blow past the cap, so we collect ~the cap
 *    whenever the model performs. Cold months auto-discount (churn protection).
 *  - Billing is ACCUMULATED and charged ONCE per cycle (see /api/stripe/payg/bill),
 *    never per win — otherwise Stripe's $0.30/charge fee would eat the margin.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export const PRICE_PER_WIN_CENTS = 25 // $0.25 per graded winning Bull Board call
export const MONTHLY_CAP_CENTS = 2000 // $20.00 hard cap per cycle — the true price
export const STRIPE_MIN_CENTS = 50 // don't invoice below Stripe's minimum; roll the cycle instead

export function chargeForWins(wins: number): number {
  return Math.min(MONTHLY_CAP_CENTS, Math.max(0, Math.floor(wins)) * PRICE_PER_WIN_CENTS)
}

/** Number of Bull Board calls that HIT (resolved as winners) since a timestamp. */
export async function winsSince(admin: SupabaseClient, sinceISO: string): Promise<number> {
  // Prefer resolved_at (set when the call is graded); fall back to resolve_date.
  try {
    const { count } = await admin
      .from('forecast_calls')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'hit')
      .gte('resolved_at', sinceISO)
    if (typeof count === 'number') return count
  } catch {
    /* resolved_at may be null on older rows — fall through */
  }
  const sinceDate = sinceISO.slice(0, 10)
  const { count } = await admin
    .from('forecast_calls')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'hit')
    .gte('resolve_date', sinceDate)
  return count ?? 0
}

/** A subscriber's current, uncapped-then-capped accrual for a cycle that started at sinceISO. */
export async function cycleAccrual(admin: SupabaseClient, sinceISO: string) {
  const wins = await winsSince(admin, sinceISO)
  const cents = chargeForWins(wins)
  return {
    wins,
    cents,
    dollars: +(cents / 100).toFixed(2),
    cappedOut: cents >= MONTHLY_CAP_CENTS,
    capDollars: MONTHLY_CAP_CENTS / 100,
    perWinDollars: PRICE_PER_WIN_CENTS / 100,
  }
}
