/**
 * Offline seed dataset — a realistic snapshot of active Kalshi markets so YN Edge
 * runs end-to-end with zero keys (dev, CI, and graceful prod fallback). The shape
 * matches exactly what the live Kalshi client normalizes to, so nothing downstream
 * can tell the difference. Prices are plausible mid-2026 levels.
 *
 * Mix is deliberate: markets tied to a tradable underlying (S&P, Nasdaq, BTC, gold,
 * oil, the 10-yr, single stocks) exercise the neural-net estimator; politics /
 * weather / econ / culture exercise the Gemini-grounded estimator.
 */
import type { KalshiMarket } from './types'

// Close dates are computed relative to "now" so the seed never goes stale on the
// detail / forecast paths. Helper: N calendar days out, at the US market close.
function daysOut(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + n)
  d.setUTCHours(21, 0, 0, 0) // ~16:00 ET
  return d.toISOString()
}

export const SEED_MARKETS: KalshiMarket[] = [
  // ── Financials (tradable underlying → neural net) ─────────────────────────
  {
    ticker: 'KXSPX-SEED-A', title: 'Will the S&P 500 close above 5,600 in 30 days?',
    category: 'Financials', yesPrice: 0.58, noPrice: 0.42, volume: 184_200, openInterest: 92_000,
    closeTime: daysOut(30), status: 'active', liquidity: 240_000, source: 'seed',
  },
  {
    ticker: 'KXSPX-SEED-B', title: 'Will the S&P 500 close below 5,300 in 20 days?',
    category: 'Financials', yesPrice: 0.22, noPrice: 0.78, volume: 96_500, openInterest: 51_000,
    closeTime: daysOut(20), status: 'active', liquidity: 130_000, source: 'seed',
  },
  {
    ticker: 'KXNDX-SEED-A', title: 'Will the Nasdaq-100 close above 20,500 in 25 days?',
    category: 'Financials', yesPrice: 0.49, noPrice: 0.51, volume: 142_000, openInterest: 70_000,
    closeTime: daysOut(25), status: 'active', liquidity: 200_000, source: 'seed',
  },
  {
    ticker: 'KXTNX-SEED-A', title: 'Will the 10-year Treasury yield be above 4.5% in 30 days?',
    category: 'Financials', yesPrice: 0.40, noPrice: 0.60, volume: 38_400, openInterest: 22_000,
    closeTime: daysOut(30), status: 'active', liquidity: 60_000, source: 'seed',
  },
  {
    ticker: 'KXNVDA-SEED-A', title: 'Will NVIDIA stock close above $145 in 14 days?',
    category: 'Financials', yesPrice: 0.55, noPrice: 0.45, volume: 71_900, openInterest: 40_000,
    closeTime: daysOut(14), status: 'active', liquidity: 95_000, source: 'seed',
  },
  {
    ticker: 'KXTSLA-SEED-A', title: 'Will Tesla stock close below $300 in 21 days?',
    category: 'Financials', yesPrice: 0.46, noPrice: 0.54, volume: 64_300, openInterest: 33_000,
    closeTime: daysOut(21), status: 'active', liquidity: 80_000, source: 'seed',
  },
  {
    ticker: 'KXAAPL-SEED-A', title: 'Will Apple stock close above $230 in 30 days?',
    category: 'Financials', yesPrice: 0.51, noPrice: 0.49, volume: 58_700, openInterest: 31_000,
    closeTime: daysOut(30), status: 'active', liquidity: 78_000, source: 'seed',
  },

  // ── Commodities / Crypto (tradable underlying → neural net) ───────────────
  {
    ticker: 'KXBTC-SEED-A', title: 'Will Bitcoin close above $120,000 in 30 days?',
    category: 'Crypto', yesPrice: 0.44, noPrice: 0.56, volume: 312_000, openInterest: 160_000,
    closeTime: daysOut(30), status: 'active', liquidity: 410_000, source: 'seed',
  },
  {
    ticker: 'KXBTC-SEED-B', title: 'Will Bitcoin close below $95,000 in 14 days?',
    category: 'Crypto', yesPrice: 0.27, noPrice: 0.73, volume: 198_000, openInterest: 88_000,
    closeTime: daysOut(14), status: 'active', liquidity: 260_000, source: 'seed',
  },
  {
    ticker: 'KXETH-SEED-A', title: 'Will Ethereum close above $4,000 in 21 days?',
    category: 'Crypto', yesPrice: 0.38, noPrice: 0.62, volume: 121_000, openInterest: 60_000,
    closeTime: daysOut(21), status: 'active', liquidity: 170_000, source: 'seed',
  },
  {
    ticker: 'KXGOLD-SEED-A', title: 'Will gold close above $2,500 in 30 days?',
    category: 'Financials', yesPrice: 0.62, noPrice: 0.38, volume: 47_000, openInterest: 26_000,
    closeTime: daysOut(30), status: 'active', liquidity: 70_000, source: 'seed',
  },
  {
    ticker: 'KXOIL-SEED-A', title: 'Will WTI crude oil close above $85 in 20 days?',
    category: 'Financials', yesPrice: 0.41, noPrice: 0.59, volume: 33_500, openInterest: 19_000,
    closeTime: daysOut(20), status: 'active', liquidity: 52_000, source: 'seed',
  },

  // ── Economics (Gemini-grounded) ──────────────────────────────────────────
  {
    ticker: 'KXFED-SEED-A', title: 'Will the Fed cut rates at the next FOMC meeting?',
    category: 'Economics', yesPrice: 0.67, noPrice: 0.33, volume: 421_000, openInterest: 210_000,
    closeTime: daysOut(26), status: 'active', liquidity: 520_000, source: 'seed',
  },
  {
    ticker: 'KXCPI-SEED-A', title: 'Will headline CPI come in above 3.0% year-over-year next print?',
    category: 'Economics', yesPrice: 0.34, noPrice: 0.66, volume: 88_000, openInterest: 44_000,
    closeTime: daysOut(12), status: 'active', liquidity: 120_000, source: 'seed',
  },
  {
    ticker: 'KXJOBS-SEED-A', title: 'Will nonfarm payrolls beat 150k next report?',
    category: 'Economics', yesPrice: 0.55, noPrice: 0.45, volume: 64_000, openInterest: 30_000,
    closeTime: daysOut(9), status: 'active', liquidity: 90_000, source: 'seed',
  },

  // ── Politics (Gemini-grounded) ───────────────────────────────────────────
  {
    ticker: 'KXGOV-SEED-A', title: 'Will Congress pass a government funding bill before the deadline?',
    category: 'Politics', yesPrice: 0.71, noPrice: 0.29, volume: 156_000, openInterest: 78_000,
    closeTime: daysOut(18), status: 'active', liquidity: 190_000, source: 'seed',
  },
  {
    ticker: 'KXSCOTUS-SEED-A', title: 'Will the Supreme Court issue a major ruling this term on tech regulation?',
    category: 'Politics', yesPrice: 0.48, noPrice: 0.52, volume: 41_000, openInterest: 21_000,
    closeTime: daysOut(40), status: 'active', liquidity: 55_000, source: 'seed',
  },

  // ── Weather (Gemini-grounded) ────────────────────────────────────────────
  {
    ticker: 'KXTEMP-SEED-A', title: 'Will NYC high temperature exceed 90°F any day next week?',
    category: 'Weather', yesPrice: 0.58, noPrice: 0.42, volume: 22_000, openInterest: 11_000,
    closeTime: daysOut(8), status: 'active', liquidity: 30_000, source: 'seed',
  },
  {
    ticker: 'KXHUR-SEED-A', title: 'Will a named hurricane make US landfall this month?',
    category: 'Weather', yesPrice: 0.36, noPrice: 0.64, volume: 29_000, openInterest: 14_000,
    closeTime: daysOut(22), status: 'active', liquidity: 38_000, source: 'seed',
  },

  // ── Culture / Tech / World (Gemini-grounded) ─────────────────────────────
  {
    ticker: 'KXAI-SEED-A', title: 'Will OpenAI release a new frontier model this quarter?',
    category: 'Tech', yesPrice: 0.62, noPrice: 0.38, volume: 73_000, openInterest: 36_000,
    closeTime: daysOut(35), status: 'active', liquidity: 95_000, source: 'seed',
  },
  {
    ticker: 'KXBOX-SEED-A', title: 'Will the #1 box-office movie gross over $100M opening weekend next month?',
    category: 'Culture', yesPrice: 0.44, noPrice: 0.56, volume: 18_500, openInterest: 9_000,
    closeTime: daysOut(28), status: 'active', liquidity: 24_000, source: 'seed',
  },
  {
    ticker: 'KXOPEC-SEED-A', title: 'Will OPEC+ announce a production cut at the next meeting?',
    category: 'World', yesPrice: 0.39, noPrice: 0.61, volume: 31_000, openInterest: 15_000,
    closeTime: daysOut(24), status: 'active', liquidity: 42_000, source: 'seed',
  },
]

export function seedBoard(): KalshiMarket[] {
  return SEED_MARKETS.map((m) => ({ ...m }))
}
