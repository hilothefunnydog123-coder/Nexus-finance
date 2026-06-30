// ════════════════════════════════════════════════════════════════════════
// The Arena — pure Elo rating math.
//
// Participants (BrainStock + rival AIs) are ranked on a single Elo ladder.
// A "bout" is one ticker on one trade_date: every graded participant either
// got the direction CORRECT or WRONG. We score each bout as a round-robin —
// every pair of participants is a head-to-head match — so a participant who
// nailed the call gains rating from everyone who missed it, and loses to
// everyone who nailed it while they missed.
//
// Everything here is pure and deterministic: no I/O, no Date, no randomness.
// Deltas are computed against the PRE-bout ratings and summed, so the order in
// which participants are listed never changes the result.
// ════════════════════════════════════════════════════════════════════════

/**
 * Expected score (win probability) of player A against player B under the
 * logistic Elo curve. Returns a value in (0, 1); 0.5 at equal ratings.
 *
 * @param ra rating of player A
 * @param rb rating of player B
 */
export function expectedScore(ra: number, rb: number): number {
  return 1 / (1 + Math.pow(10, (rb - ra) / 400))
}

/**
 * Standard pairwise Elo update for a single match between A and B.
 *
 * @param ra      A's current rating
 * @param rb      B's current rating
 * @param scoreA  A's actual result: 1 = A won, 0 = A lost, 0.5 = draw
 * @param k       K-factor (rating volatility), default 24
 * @returns       `[ra', rb']` — the updated ratings (rb moves the opposite way)
 */
export function updateElo(ra: number, rb: number, scoreA: number, k = 24): [number, number] {
  const ea = expectedScore(ra, rb)
  const eb = 1 - ea
  const scoreB = 1 - scoreA
  return [ra + k * (scoreA - ea), rb + k * (scoreB - eb)]
}

/** One participant's standing entering a bout. */
export interface BoutParticipant {
  id: string
  rating: number
  /** true if this participant called the direction correctly in this bout. */
  correct: boolean
}

/**
 * Score one bout (one ticker on one day) as a round-robin and return the net
 * rating delta per participant id.
 *
 * Each ordered pair (A, B) is treated as a head-to-head match decided purely by
 * who was correct:
 *   - A correct,  B wrong  → A scores 1 (A beats B)
 *   - A wrong,    B correct→ A scores 0 (A loses to B)
 *   - same result (both correct OR both wrong) → draw (0.5)
 *
 * All expected scores are computed against the participants' PRE-bout ratings,
 * the pairwise deltas are summed per id, and only then applied — so the
 * processing order is irrelevant and the result is fully deterministic.
 *
 * @param participants the graded participants in this bout (>= 2 to matter)
 * @param k            K-factor, default 24
 * @returns            map of participant id → net rating delta for this bout
 */
export function roundRobinUpdate(
  participants: BoutParticipant[],
  k = 24
): Record<string, number> {
  const delta: Record<string, number> = {}
  for (const p of participants) delta[p.id] = 0

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      const a = participants[i]
      const b = participants[j]
      // Actual result for A vs B based solely on correctness.
      let scoreA: number
      if (a.correct === b.correct) scoreA = 0.5
      else if (a.correct) scoreA = 1
      else scoreA = 0
      const ea = expectedScore(a.rating, b.rating)
      // Delta against PRE-bout ratings; summed, applied later by the caller.
      delta[a.id] += k * (scoreA - ea)
      delta[b.id] += k * ((1 - scoreA) - (1 - ea))
    }
  }
  return delta
}
