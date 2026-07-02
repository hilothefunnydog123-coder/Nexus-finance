/**
 * MATRIX SWARM — 262,144 online-learning micro-agents.
 *
 * Each agent is a random linear policy over 9 live tape features (short/long
 * momentum, acceleration, reversion pull, near-the-money, model edge, realized
 * vol, urgency, bias). Every generation each agent votes YES / NO / flat per
 * market; when the next real tick lands, agents that called the move get their
 * hedge weight multiplied up and agents that fought it get cut (multiplicative
 * weights / Hedge — a real online-learning algorithm, not decoration). The
 * swarm's conviction is the hedge-weighted vote.
 *
 * Net effect: the population contains momentum agents, mean-reversion agents,
 * value agents and every blend in between — and the LIVE TAPE decides, minute
 * by minute, which family runs the book. Typed arrays keep a full generation
 * across ~17 markets under ~100ms.
 */

export const SWARM_N = 262144
export const SWARM_NF = 9
const THETA = 0.9 // vote dead-zone: agents abstain on weak signal
const ETA = 22    // hedge learning rate (per price-unit of realized move)

export type SwarmConv = { c: number; bulls: number; bears: number }
export type Swarm = {
  n: number
  w: Float32Array                                  // agent policy weights (n × NF), fixed at birth
  wt: Float64Array                                 // hedge weights (n), learned live
  mem: Record<string, { p: number; votes: Int8Array }>
  conv: Record<string, SwarmConv>
  gen: number
}

export function createSwarm(seed = 1337): Swarm {
  let s = seed >>> 0
  const rng = () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
  const w = new Float32Array(SWARM_N * SWARM_NF)
  for (let i = 0; i < w.length; i++) w[i] = rng() * 2 - 1
  return { n: SWARM_N, w, wt: new Float64Array(SWARM_N).fill(1), mem: {}, conv: {}, gen: 0 }
}

/** One generation on one market: settle the previous vote against the realized
 *  move (learn), then cast the next vote. */
export function swarmStep(sw: Swarm, ticker: string, feat: number[], price: number) {
  const { w, wt, n } = sw
  // 1) LEARN — pay/punish agents for their previous call on this market
  const prev = sw.mem[ticker]
  if (prev) {
    const ret = price - prev.p
    if (ret) {
      const g = ETA * ret, v = prev.votes
      for (let i = 0; i < n; i++) {
        const vi = v[i]
        if (vi) { let x = wt[i] * (1 + vi * g); if (x < 1e-9) x = 1e-9; else if (x > 1e9) x = 1e9; wt[i] = x }
      }
    }
  }
  // 2) VOTE — full population pass
  const votes = prev?.votes ?? new Int8Array(n)
  let acc = 0, wsum = 0, bulls = 0, bears = 0
  for (let i = 0, k = 0; i < n; i++, k += SWARM_NF) {
    let d = 0
    for (let j = 0; j < SWARM_NF; j++) d += w[k + j] * feat[j]
    const vi = d > THETA ? 1 : d < -THETA ? -1 : 0
    votes[i] = vi
    const ww = wt[i]; wsum += ww
    if (vi > 0) { acc += ww; bulls++ } else if (vi < 0) { acc -= ww; bears++ }
  }
  sw.mem[ticker] = { p: price, votes }
  sw.conv[ticker] = { c: wsum ? acc / wsum : 0, bulls, bears }
}

/** Rescale hedge weights so they never over/underflow across a long session. */
export function swarmNormalize(sw: Swarm) {
  let m = 0
  for (let i = 0; i < sw.n; i++) m += sw.wt[i]
  m /= sw.n
  if (m > 1e3 || m < 1e-3) { for (let i = 0; i < sw.n; i++) sw.wt[i] /= m }
}
