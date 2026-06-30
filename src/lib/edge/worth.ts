/**
 * The "is it worth it" brain (Phase 3).
 *
 * Kalshi contracts settle at $1. A YES contract costs `yesPrice` dollars and pays
 * $1 if the event happens; a NO contract costs `1 - yesPrice` and pays $1 if it
 * doesn't. Given OUR probability `ynProb` of YES, we:
 *
 *   1. pick the side with positive edge,
 *   2. compute edge = our% − market%,
 *   3. expected value per $1 staked,
 *   4. the Kelly-optimal stake (and the prudent half-Kelly we actually suggest),
 *   5. a WORTH IT / PASS verdict with the thresholds made explicit.
 *
 * All formulas are unit-checked in scripts/verify-edge.mjs.
 */
import type { EdgePricing, EdgeVerdict, KalshiMarket } from './types'
import { EDGE_CONFIG } from './types'
import { clamp } from './stats'

/**
 * For a binary contract bought at `price` (0..1) that pays $1 on win, when our
 * win probability is `p`:
 *   EV per $1 staked = p/price − 1     (you pay `price`, receive $1 w.p. p)
 *   Kelly fraction    = (p − price) / (1 − price)
 * Both are derived in the verify script.
 */
function legMath(p: number, price: number): { evPerDollar: number; kelly: number } {
  const safePrice = clamp(price, 0.01, 0.99)
  const evPerDollar = p / safePrice - 1
  const kelly = (p - safePrice) / (1 - safePrice)
  return { evPerDollar, kelly }
}

export function computeVerdict(market: KalshiMarket, pricing: EdgePricing): EdgeVerdict {
  const ynProb = pricing.ynProb
  const yesPrice = market.yesPrice
  const noPrice = market.noPrice

  // Edge on each side (only one can be positive).
  const yesLeg = legMath(ynProb, yesPrice)         // bet YES: win prob = ynProb
  const noLeg = legMath(1 - ynProb, noPrice)       // bet NO:  win prob = 1 - ynProb

  const takeYes = yesLeg.evPerDollar >= noLeg.evPerDollar
  const side: 'YES' | 'NO' = takeYes ? 'YES' : 'NO'
  const leg = takeYes ? yesLeg : noLeg
  const marketProb = takeYes ? yesPrice : noPrice          // what the market charges for our side
  const ourSideProb = takeYes ? ynProb : 1 - ynProb        // our prob our side wins
  const edge = ourSideProb - marketProb

  const kelly = clamp(leg.kelly, 0, 1)
  const halfKelly = clamp(kelly * EDGE_CONFIG.kellyFraction, 0, EDGE_CONFIG.maxKelly)

  const confidence = pricing.confidence
  const minVolOk = market.volume >= 0 // volume gating is applied at the board level / filters

  const worthIt =
    edge >= EDGE_CONFIG.minEdge &&
    leg.evPerDollar >= EDGE_CONFIG.minEvPerDollar &&
    confidence >= EDGE_CONFIG.minConfidence &&
    minVolOk

  const reason = worthIt
    ? `+${(edge * 100).toFixed(1)}pt edge on ${side} · ${(leg.evPerDollar * 100).toFixed(1)}% EV/$ · ${(confidence * 100).toFixed(0)}% confidence — clears every gate.`
    : failReason(edge, leg.evPerDollar, confidence)

  return {
    side,
    marketProb: +marketProb.toFixed(4),
    ynProb: +ourSideProb.toFixed(4),
    edge: +edge.toFixed(4),
    evPerDollar: +leg.evPerDollar.toFixed(4),
    kelly: +kelly.toFixed(4),
    halfKelly: +halfKelly.toFixed(4),
    confidence: +confidence.toFixed(4),
    worthIt,
    reason,
  }
}

function failReason(edge: number, ev: number, conf: number): string {
  const reasons: string[] = []
  if (edge < EDGE_CONFIG.minEdge) reasons.push(`edge ${(edge * 100).toFixed(1)}pt < ${(EDGE_CONFIG.minEdge * 100).toFixed(0)}pt floor`)
  if (ev < EDGE_CONFIG.minEvPerDollar) reasons.push(`EV ${(ev * 100).toFixed(1)}%/$ thin`)
  if (conf < EDGE_CONFIG.minConfidence) reasons.push(`confidence ${(conf * 100).toFixed(0)}% too low`)
  return `PASS — ${reasons.join(', ') || 'no exploitable edge'}.`
}

/** Rank rows by quality of the opportunity (edge × EV × confidence, worth-it first). */
export function edgeScore(v: EdgeVerdict): number {
  const base = v.edge * Math.max(0, v.evPerDollar) * v.confidence
  return (v.worthIt ? 1 : 0) * 1000 + base
}
