/**
 * YN Edge — shared types.
 *
 * The flagship: price every Kalshi prediction market with our own BrainStock
 * neural net (for anything tied to a tradable underlying) or Gemini with live
 * Google-Search grounding (for politics / weather / econ / culture), compute the
 * edge vs the market's price, and surface only the bets actually worth taking —
 * then grade ourselves in public.
 */

export type EdgeCategory =
  | 'Financials'
  | 'Crypto'
  | 'Economics'
  | 'Politics'
  | 'Weather'
  | 'Culture'
  | 'Tech'
  | 'World'
  | 'Other'

/** A Kalshi market, normalized into our own schema (the only shape the app uses). */
export interface KalshiMarket {
  ticker: string                 // Kalshi market ticker, e.g. "KXBTCD-25DEC31-B100000"
  eventTicker?: string
  title: string                  // human title, e.g. "Will Bitcoin close above $100,000 on Dec 31?"
  subtitle?: string
  category: EdgeCategory
  yesPrice: number               // 0..1 — implied P(YES) the market is charging
  noPrice: number                // 0..1 — implied P(NO) (≈ 1 - yesPrice)
  volume: number                 // contracts traded
  openInterest?: number
  closeTime: string              // ISO — when the market resolves
  status: 'active' | 'closed' | 'settled'
  liquidity?: number
  source: 'kalshi' | 'seed'      // where this row came from (seed = offline fallback)
}

/** Which engine priced a market and how confident it is. */
export type EdgeEngine = 'brainstock-nn' | 'gemini-grounded' | 'baseline'

export interface ForecastChartPoint {
  date: string
  price: number
  kind: 'history' | 'forecast'
}

/** The probability + reasoning our system assigns to a market resolving YES. */
export interface EdgePricing {
  ynProb: number                 // 0..1 — OUR probability the market resolves YES
  engine: EdgeEngine
  confidence: number             // 0..1 — how much we trust this estimate
  reasoning: string              // plain-English why
  sources?: { title: string; url: string }[]   // citations (Gemini grounding)
  // For NN-priced markets — the underlying & the math that produced ynProb:
  underlying?: {
    symbol: string
    name: string
    lastPrice: number
    strike: number
    direction: 'above' | 'below'
    expectedPrice: number        // net's expected price at the close date
    sigma: number                // total log-vol to the close date
    businessDays: number
    skillScore?: number          // net's backtested skill vs naive
    chart?: ForecastChartPoint[] // history + forecast path (for the detail page)
  }
}

/** The "is it worth it" verdict — the math made legible. */
export interface EdgeVerdict {
  side: 'YES' | 'NO'             // the side we'd take (the one with positive edge)
  marketProb: number            // what the market charges for OUR side (0..1)
  ynProb: number                // our probability OUR side hits (0..1)
  edge: number                  // ynProb - marketProb (decimal, can be negative)
  evPerDollar: number           // expected profit per $1 staked on our side
  kelly: number                 // full-Kelly fraction of bankroll
  halfKelly: number             // prudent stake we actually suggest
  confidence: number            // 0..1, inherited from pricing
  worthIt: boolean              // WORTH IT vs PASS
  reason: string                // one-line why it's worth it / a pass
}

/** Everything the app shows for one market: the market, our price, the verdict. */
export interface EdgeRow {
  market: KalshiMarket
  pricing: EdgePricing
  verdict: EdgeVerdict
  pricedAt: string              // ISO when we priced it
}

export interface EdgeBoard {
  rows: EdgeRow[]
  meta: {
    pricedAt: string
    marketCount: number
    worthItCount: number
    liveData: boolean           // true if real Kalshi creds were used (else seed)
    pricedLive: boolean         // true if a real net / Gemini priced (else baseline)
    categories: EdgeCategory[]
    note?: string
  }
}

/** Tunables for the worth-it brain (kept in one place so the math is auditable). */
export const EDGE_CONFIG = {
  minEdge: 0.07,                 // need ≥ 7pts of edge to even consider a pick
  minConfidence: 0.45,           // and at least this much trust in our number
  minEvPerDollar: 0.05,          // and a positive EV with margin
  kellyFraction: 0.5,            // we suggest half-Kelly, never full
  maxKelly: 0.25,                // hard cap on suggested stake (risk control)
  feePerContract: 0.0,           // Kalshi maker/taker fee approximation per $1
} as const
