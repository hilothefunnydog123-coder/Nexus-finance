// ════════════════════════════════════════════════════════════════════════════
// YN Finance — SITE BRAIN v2: a real (shallow) neural network.
//
// Logistic matrix factorization: every FEATURE gets an embedding vector + bias;
// every VISITOR gets an embedding inferred at request time from their own events.
//   score(user, feat) = sigmoid( user · feat + bias )           (a 2-tower net)
// Trained by online stochastic gradient descent on (click = 1 / shown-not-clicked
// = 0) interactions. Genuinely learns — not heuristics.
// ════════════════════════════════════════════════════════════════════════════

export const DIM = 8

export interface FeatVec { v: number[]; b: number }
export interface Model { dim: number; feats: Record<string, FeatVec>; n: number }

const lr = 0.05
const l2 = 1e-4

export function sigmoid(x: number) { return 1 / (1 + Math.exp(-Math.max(-30, Math.min(30, x)))) }
export function dot(a: number[], b: number[]) { let s = 0; for (let i = 0; i < a.length; i++) s += a[i] * b[i]; return s }

// deterministic small init from a string seed (stable across cold starts)
function seedVec(key: string, dim = DIM): number[] {
  let s = 2166136261
  for (const c of key) { s ^= c.charCodeAt(0); s = Math.imul(s, 16777619) }
  const v: number[] = []
  for (let i = 0; i < dim; i++) { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; v.push((((s >>> 0) % 1000) / 1000 - 0.5) * 0.2) }
  return v
}

export function emptyModel(dim = DIM): Model { return { dim, feats: {}, n: 0 } }

export function ensureFeat(m: Model, key: string): FeatVec {
  if (!m.feats[key]) m.feats[key] = { v: seedVec(key, m.dim), b: 0 }
  return m.feats[key]
}

// One SGD step on a single interaction. Mutates the feature vector and the passed
// user vector. Returns the loss contribution (for monitoring).
export function sgdStep(m: Model, user: number[], featKey: string, y: number): number {
  const f = ensureFeat(m, featKey)
  const p = sigmoid(dot(user, f.v) + f.b)
  const err = p - y
  for (let i = 0; i < m.dim; i++) {
    const gu = err * f.v[i] + l2 * user[i]
    const gf = err * user[i] + l2 * f.v[i]
    user[i] -= lr * gu
    f.v[i] -= lr * gf
  }
  f.b -= lr * err
  return -(y * Math.log(p + 1e-9) + (1 - y) * Math.log(1 - p + 1e-9))
}

// Infer a visitor's embedding from their own interactions against the current
// (fixed) feature space — a few gradient passes. Cheap, serverless-friendly.
export function inferUser(m: Model, interactions: { feat: string; y: number }[], passes = 4): number[] {
  const user = new Array(m.dim).fill(0)
  if (!interactions.length) return user
  // light-weight: only update the user vector, hold features fixed
  for (let p = 0; p < passes; p++) {
    for (const it of interactions) {
      const f = m.feats[it.feat]; if (!f) continue
      const pred = sigmoid(dot(user, f.v) + f.b)
      const err = pred - it.y
      for (let i = 0; i < m.dim; i++) user[i] -= lr * (err * f.v[i] + l2 * user[i])
    }
  }
  return user
}

export function scoreFeat(m: Model, user: number[], featKey: string): number {
  const f = m.feats[featKey]; if (!f) return 0.5
  return sigmoid(dot(user, f.v) + f.b)
}

// Rank candidate feature keys for a visitor by predicted engagement, with a small
// exploration term so the net keeps learning (ε-greedy on top of the policy).
export function rankByModel(m: Model, user: number[], candidates: string[], seed = 1): { key: string; p: number }[] {
  let s = seed >>> 0 || 1
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 }
  return candidates
    .map((key) => ({ key, p: scoreFeat(m, user, key), e: rnd() * 0.12 }))
    .sort((a, b) => (b.p + b.e) - (a.p + a.e))
    .map(({ key, p }) => ({ key, p }))
}

// Build (feat, y) interactions from a visitor's raw events: a feature CLICKED → 1,
// a feature merely IMPRESSED/seen but not clicked → 0, dwell/pageview → soft 1.
export function interactionsFromEvents(events: { type: string; target?: string; path?: string; value?: number }[], pathToFeat: (p?: string | null) => string | null): { feat: string; y: number }[] {
  const out: { feat: string; y: number }[] = []
  for (const e of events) {
    const feat = (e.target && e.target.includes('/') === false && e.type !== 'ticker') ? e.target : pathToFeat(e.path)
    if (!feat) continue
    if (e.type === 'click' || e.type === 'convert') out.push({ feat, y: 1 })
    else if (e.type === 'dwell' && (e.value || 0) > 20000) out.push({ feat, y: 1 })
    else if (e.type === 'impression') out.push({ feat, y: 0 })
  }
  return out
}
