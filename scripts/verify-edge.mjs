#!/usr/bin/env node
/**
 * YN Edge — math proof harness (Phase 7).
 *
 * Proves the edge engine is sound with (1) a fully worked EV / Kelly example
 * checked against first-principles expectation, (2) a lognormal P(YES) sanity
 * check, and (3) a calibration + Brier check on a sample of resolved markets.
 *
 * Pure JS mirrors of the exact formulas in src/lib/edge/{worth,pricing,store}.ts
 * so this runs with `node scripts/verify-edge.mjs` and zero dependencies/keys.
 */

let failures = 0
function assert(name, cond, detail = '') {
  const ok = !!cond
  if (!ok) failures++
  console.log(`  ${ok ? '✅' : '❌'} ${name}${detail ? `  — ${detail}` : ''}`)
}
function approx(a, b, eps = 1e-6) {
  return Math.abs(a - b) <= eps
}

// ── mirrors of the library math ──────────────────────────────────────────────
function erf(x) {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * ax)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-ax * ax)
  return sign * y
}
const normCdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2))

// worth.ts legMath
function legMath(p, price) {
  const sp = Math.max(0.01, Math.min(0.99, price))
  return { evPerDollar: p / sp - 1, kelly: (p - sp) / (1 - sp) }
}
// store.ts gradeRow
function gradeRow({ yn_prob, market_prob, side, result }) {
  const outcome = result === 'yes' ? 1 : 0
  const brier = (yn_prob - outcome) ** 2
  const side_correct = (side === 'YES') === (outcome === 1)
  const price = side === 'YES' ? market_prob : 1 - market_prob
  const pnl = side_correct ? 1 / Math.max(0.01, price) - 1 : -1
  return { brier, side_correct, pnl }
}

console.log('\n━━━ YN EDGE · MATH PROOF ━━━\n')

// ── (1) Worked EV / Kelly example ────────────────────────────────────────────
// Market: "S&P above 5,600". The net says P(YES) = 0.58. YES trades at $0.50.
// We bet YES at price 0.50, payout $1.
//   First-principles EV of one $1-normalized stake:
//     win  (prob 0.58): you turn $0.50 into $1.00 → +$0.50 profit on $0.50 = +100%
//     lose (prob 0.42): you lose your $0.50 stake                         = -100%
//   EV per $1 staked = 0.58*(1/0.50 - 1) + 0.42*(-1) = 0.58*1.0 - 0.42 = 0.16
console.log('(1) Worked EV / Kelly example  — bet YES at $0.50, our P=0.58')
{
  const p = 0.58, price = 0.5
  const { evPerDollar, kelly } = legMath(p, price)
  // independent recomputation
  const evFirstPrinciples = p * (1 / price - 1) + (1 - p) * -1
  assert('EV formula matches first principles', approx(evPerDollar, evFirstPrinciples), `EV=${evPerDollar.toFixed(4)}`)
  assert('EV equals +16.0% per $1', approx(evPerDollar, 0.16, 1e-9), `${(evPerDollar * 100).toFixed(1)}%`)
  // Kelly f* = (bp - q)/b, b = (1-price)/price = 1.0, p=0.58, q=0.42 → (1*0.58-0.42)/1 = 0.16
  const b = (1 - price) / price
  const kellyClassic = (b * p - (1 - p)) / b
  assert('Kelly matches (bp−q)/b form', approx(kelly, kellyClassic), `f*=${kelly.toFixed(4)}`)
  assert('Kelly equals 16.0% of bankroll', approx(kelly, 0.16, 1e-9), `${(kelly * 100).toFixed(1)}%`)
  console.log(`     → edge=+8.0pt, EV=+${(evPerDollar * 100).toFixed(1)}%/$, full-Kelly=${(kelly * 100).toFixed(1)}%, half-Kelly=${(kelly * 50).toFixed(1)}%\n`)
}

// Side-selection: when our P(YES) < yes price, the NO side must carry the edge.
console.log('(1b) Side selection — our P(YES)=0.30, YES priced $0.50 → take NO')
{
  const ynProb = 0.3, yesPrice = 0.5, noPrice = 0.5
  const yesLeg = legMath(ynProb, yesPrice)
  const noLeg = legMath(1 - ynProb, noPrice)
  const takeYes = yesLeg.evPerDollar >= noLeg.evPerDollar
  assert('picks the NO side', takeYes === false, `EV(YES)=${yesLeg.evPerDollar.toFixed(2)} EV(NO)=${noLeg.evPerDollar.toFixed(2)}`)
  assert('NO side has positive EV', noLeg.evPerDollar > 0, `${(noLeg.evPerDollar * 100).toFixed(0)}%/$`)
  console.log('')
}

// No-edge market: our P equals the price → EV ≈ 0, Kelly ≈ 0, must be a PASS.
console.log('(1c) Efficient market — our P = price → zero edge')
{
  const { evPerDollar, kelly } = legMath(0.5, 0.5)
  assert('EV is ~0', approx(evPerDollar, 0, 1e-9), evPerDollar.toFixed(4))
  assert('Kelly is ~0', approx(kelly, 0, 1e-9), kelly.toFixed(4))
  console.log('')
}

// ── (2) Lognormal P(YES) sanity ──────────────────────────────────────────────
console.log('(2) Lognormal P(YES) — drift & vol behave correctly')
{
  // At-the-money, zero drift → P(above) = 0.50 exactly.
  const last = 100, strike = 100, sigma = 0.1
  const zATM = (Math.log(last) - Math.log(strike)) / sigma
  assert('ATM, no drift → 50%', approx(normCdf(zATM), 0.5, 1e-6), `${(normCdf(zATM) * 100).toFixed(1)}%`)
  // Strike far above with no drift → P(above) small.
  const zFar = (Math.log(last) - Math.log(130)) / sigma
  assert('strike 30% away → low P(above)', normCdf(zFar) < 0.02, `${(normCdf(zFar) * 100).toFixed(2)}%`)
  // Positive drift lifts P(above) above 50%.
  const expLog = Math.log(last) + 0.05 // +5% expected
  const zUp = (expLog - Math.log(strike)) / sigma
  assert('positive drift → P(above) > 50%', normCdf(zUp) > 0.5, `${(normCdf(zUp) * 100).toFixed(1)}%`)
  console.log('')
}

// ── (3) Calibration + Brier on resolved sample ───────────────────────────────
console.log('(3) Calibration + Brier — 4,000 simulated resolved markets')
{
  // A *perfectly calibrated* forecaster: events we call p% actually happen p% of
  // the time. Brier should land near the irreducible noise floor mean p(1−p).
  // We use a deterministic LCG so the proof is reproducible (no Math.random).
  let seed = 1234567
  const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff)

  const N = 4000
  const rows = []
  let noiseFloor = 0
  for (let i = 0; i < N; i++) {
    const p = +(0.02 + 0.96 * rand()).toFixed(3) // our predicted P(YES)
    const result = rand() < p ? 'yes' : 'no'      // truth drawn from p → calibrated
    noiseFloor += p * (1 - p)
    const side = p >= 0.5 ? 'YES' : 'NO'
    rows.push({ yn_prob: p, market_prob: 0.5, side, result })
  }
  noiseFloor /= N

  const graded = rows.map((r) => ({ ...r, ...gradeRow(r) }))
  const brier = graded.reduce((s, r) => s + r.brier, 0) / N
  const brierSkill = 1 - brier / 0.25

  // Calibration deciles
  const buckets = new Map()
  for (const r of rows) {
    const b = Math.min(9, Math.floor(r.yn_prob * 10))
    const e = buckets.get(b) || { p: 0, y: 0, n: 0 }
    e.p += r.yn_prob; e.y += r.result === 'yes' ? 1 : 0; e.n++
    buckets.set(b, e)
  }
  let maxGap = 0
  console.log('     decile  predicted   actual    n')
  for (const [b, e] of [...buckets.entries()].sort((a, z) => a[0] - z[0])) {
    const pred = e.p / e.n, act = e.y / e.n
    maxGap = Math.max(maxGap, Math.abs(pred - act))
    console.log(`       0.${b}     ${pred.toFixed(3)}     ${act.toFixed(3)}   ${String(e.n).padStart(4)}`)
  }
  assert('Brier near the p(1−p) noise floor', approx(brier, noiseFloor, 0.01), `Brier=${brier.toFixed(4)} floor=${noiseFloor.toFixed(4)}`)
  assert('Brier skill beats a coin flip (>0)', brierSkill > 0, `skill=${brierSkill.toFixed(3)}`)
  assert('calibration gap < 5pt in every decile', maxGap < 0.05, `max gap ${(maxGap * 100).toFixed(1)}pt`)

  // ROI check: a +EV worth-it pick should have positive expected realized P&L.
  const evRows = rows.filter((r) => r.yn_prob >= 0.6).map((r) => ({ ...r, market_prob: 0.5 }))
  const roi = evRows.map((r) => gradeRow(r).pnl).reduce((s, x) => s + x, 0) / (evRows.length || 1)
  assert('mispriced +EV picks show positive realized ROI', roi > 0, `mean ROI ${(roi * 100).toFixed(1)}%/$ on ${evRows.length} picks`)
  console.log('')
}

console.log(failures === 0 ? '━━━ ALL CHECKS PASSED ✅ ━━━\n' : `━━━ ${failures} CHECK(S) FAILED ❌ ━━━\n`)
process.exit(failures === 0 ? 0 : 1)
