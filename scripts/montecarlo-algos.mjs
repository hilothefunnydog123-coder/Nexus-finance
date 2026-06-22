#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Monte Carlo engine for the 15 new Quant Desk strategies (v17)
//
// What it does:
//   For each strategy we model its trade outcome as a Bernoulli win at its
//   target win-rate, paying +R on a win and -1 on a loss (R = reward:risk).
//   We then simulate thousands of *prop-firm challenge* runs (FTMO/Topstep
//   style) with realistic rules and measure how each strategy actually performs
//   on the metrics that matter: expectancy, pass rate, risk of ruin, and the
//   distribution of returns / drawdowns.
//
//   To avoid fantasy numbers we apply a "live haircut" to each strategy's
//   advertised edge (slippage, missed fills, regime drift) before simulating,
//   so the ranking reflects something closer to real-world performance.
//
// Run:  node scripts/montecarlo-algos.mjs
// ─────────────────────────────────────────────────────────────────────────────

// ── The 15 strategies (must mirror the targets in src/app/algorithms/data.ts) ──
const STRATS = [
  { id: 'nqsupertrend', name: 'SuperTrend + ADX Flip',      win: 0.54, R: 2.2, freq: 1.4 },
  { id: 'nqturtle',     name: 'Donchian Turtle Breakout',   win: 0.45, R: 3.0, freq: 0.8 },
  { id: 'nqkelt',       name: 'Keltner Squeeze Release',    win: 0.50, R: 2.5, freq: 1.1 },
  { id: 'nqgapgo',      name: 'Gap-and-Go Continuation',    win: 0.57, R: 2.0, freq: 0.7 },
  { id: 'nq3bar',       name: '3-Bar Reversal at Band',     win: 0.63, R: 1.5, freq: 1.6 },
  { id: 'nqfib',        name: 'Fib 61.8 Trend Pullback',    win: 0.59, R: 2.0, freq: 1.3 },
  { id: 'nqstophunt',   name: 'Liquidity Stop-Hunt Rev.',   win: 0.65, R: 2.4, freq: 0.9 },
  { id: 'nqpivot',      name: 'Floor Pivot Reversion',      win: 0.69, R: 1.2, freq: 1.8 },
  { id: 'nqmomo',       name: 'Momentum Ignition',          win: 0.54, R: 2.2, freq: 1.5 },
  { id: 'nqdiv',        name: 'RSI Divergence Reversal',    win: 0.60, R: 2.0, freq: 1.2 },
  { id: 'nqzfade',      name: 'Volatility Z-Score Fade',    win: 0.71, R: 1.0, freq: 2.0 },
  { id: 'nqcvd',        name: 'Delta Divergence',           win: 0.58, R: 1.8, freq: 1.1 },
  { id: 'nqcloud',      name: '200-EMA Cloud Pullback',     win: 0.56, R: 2.2, freq: 1.3 },
  { id: 'nqbos',        name: 'Break-of-Structure Cont.',   win: 0.52, R: 2.6, freq: 1.0 },
  { id: 'nqkz',         name: 'London–NY Killzone Sweep',   win: 0.61, R: 2.3, freq: 0.9 },
]

// ── Simulation config ─────────────────────────────────────────────────────────
const CFG = {
  trials:        20000,   // Monte Carlo runs per strategy
  riskPct:       0.02,    // 2% of equity risked per trade (aggressive prop sizing)
  profitTarget:  0.10,    // +10% → challenge passed (FTMO Phase 1)
  maxDrawdown:   0.06,    // -6% trailing from peak → challenge failed
  maxTrades:     60,      // evaluation window (a strategy must pass *fast*)
  winHaircut:    0.045,   // subtract from advertised win-rate (slippage/regime)
  rHaircut:      0.90,    // realised R = advertised R × this (spread/partial fills)
}

// Deterministic seed so the ranking is reproducible run-to-run.
let seed = 1337
const rnd = () => {
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5
  return ((seed >>> 0) % 1e6) / 1e6
}

function simulate(s) {
  const win = Math.max(0.05, s.win - CFG.winHaircut)
  const R   = s.R * CFG.rHaircut
  // Per-trade expectancy in R units (after haircut)
  const expR = win * R - (1 - win)

  let passes = 0, busts = 0
  const returns = [], drawdowns = [], tradesToResolve = []

  for (let t = 0; t < CFG.trials; t++) {
    let eq = 1.0, peak = 1.0, maxDD = 0, resolved = false
    let n = 0
    for (; n < CFG.maxTrades; n++) {
      const r = (rnd() < win ? R : -1) * CFG.riskPct
      eq *= (1 + r)
      if (eq > peak) peak = eq
      const dd = (peak - eq) / peak
      if (dd > maxDD) maxDD = dd
      if (eq >= 1 + CFG.profitTarget) { passes++; resolved = true; n++; break }
      if (dd >= CFG.maxDrawdown)       { busts++;  resolved = true; n++; break }
    }
    returns.push(eq - 1)
    drawdowns.push(maxDD)
    if (resolved) tradesToResolve.push(n)
  }

  returns.sort((a, b) => a - b)
  drawdowns.sort((a, b) => a - b)
  const pct = (arr, p) => arr[Math.min(arr.length - 1, Math.floor(p * arr.length))]
  const mean = a => a.reduce((x, y) => x + y, 0) / a.length

  return {
    ...s,
    expR,                                      // expectancy per trade (R)
    passRate:   passes / CFG.trials,           // P(hit +8% before -10%)
    bustRate:   busts  / CFG.trials,           // risk of ruin
    medReturn:  pct(returns, 0.5),
    p5Return:   pct(returns, 0.05),
    p95Return:  pct(returns, 0.95),
    medMaxDD:   pct(drawdowns, 0.5),
    p95MaxDD:   pct(drawdowns, 0.95),
    avgResolve: tradesToResolve.length ? mean(tradesToResolve) : CFG.maxTrades,
  }
}

const results = STRATS.map(simulate)

// ── Composite score: reward pass rate & expectancy, punish risk of ruin ───────
const maxExp = Math.max(...results.map(r => r.expR))
results.forEach(r => {
  r.score = (0.55 * r.passRate) + (0.30 * (r.expR / maxExp)) - (0.30 * r.bustRate)
})
results.sort((a, b) => b.score - a.score)

// ── Emit a typed data file the /algorithms page imports & renders ─────────────
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
const round = (x, d = 4) => Number(x.toFixed(d))
const rows = results.map((r, i) => ({
  rank: i + 1,
  id: r.id,
  name: r.name,
  win: round(Math.max(0.05, r.win - CFG.winHaircut)),
  R: round(r.R * CFG.rHaircut),
  expR: round(r.expR),
  passRate: round(r.passRate),
  bustRate: round(r.bustRate),
  medReturn: round(r.medReturn),
  p95MaxDD: round(r.p95MaxDD),
  score: round(r.score),
}))
const meta = {
  trials: CFG.trials, riskPct: CFG.riskPct, profitTarget: CFG.profitTarget,
  maxDrawdown: CFG.maxDrawdown, maxTrades: CFG.maxTrades, generated: new Date().toISOString().slice(0, 10),
}
const __dir = dirname(fileURLToPath(import.meta.url))
const outPath = join(__dir, '..', 'src', 'app', 'algorithms', 'montecarlo.ts')
const banner = '// AUTO-GENERATED by scripts/montecarlo-algos.mjs — do not edit by hand. Re-run the script to refresh.\n'
const typeDef = `export interface MonteCarloRow {
  rank: number; id: string; name: string
  win: number; R: number; expR: number
  passRate: number; bustRate: number
  medReturn: number; p95MaxDD: number; score: number
}
export interface MonteCarloMeta {
  trials: number; riskPct: number; profitTarget: number
  maxDrawdown: number; maxTrades: number; generated: string
}
`
writeFileSync(outPath,
  banner + typeDef +
  `export const MONTE_CARLO_META: MonteCarloMeta = ${JSON.stringify(meta, null, 2)}\n\n` +
  `export const MONTE_CARLO: MonteCarloRow[] = ${JSON.stringify(rows, null, 2)}\n`
)
console.log(`\n  ✏️  Wrote ${rows.length} ranked rows → src/app/algorithms/montecarlo.ts`)

// ── Report ────────────────────────────────────────────────────────────────────
const pc = x => (x * 100).toFixed(1) + '%'
const f2 = x => x.toFixed(2)

console.log('\n' + '═'.repeat(96))
console.log('  YN FINANCE — MONTE CARLO RANKING · 15 QUANT DESK STRATEGIES (v17)')
console.log(`  ${CFG.trials.toLocaleString()} trials each · ${pc(CFG.riskPct)} risk/trade · pass +${pc(CFG.profitTarget)} · bust -${pc(CFG.maxDrawdown)} trailing · ${CFG.maxTrades}-trade window · haircut applied`)
console.log('═'.repeat(96))
console.log(
  '  #  STRATEGY                       WIN*   R*    EXP(R)  PASS%   RUIN%   MED-RET  P95-DD   SCORE'
)
console.log('  ' + '─'.repeat(92))
results.forEach((r, i) => {
  const rank = String(i + 1).padStart(2)
  const name = r.name.padEnd(30)
  console.log(
    `  ${rank} ${name} ${f2(Math.max(0.05, r.win - CFG.winHaircut))}  ${f2(r.R * CFG.rHaircut)}  ` +
    `${f2(r.expR).padStart(6)}  ${pc(r.passRate).padStart(6)}  ${pc(r.bustRate).padStart(6)}  ` +
    `${pc(r.medReturn).padStart(7)}  ${pc(r.p95MaxDD).padStart(6)}  ${f2(r.score)}`
  )
})
console.log('  ' + '─'.repeat(92))
console.log('  * WIN / R shown are post-haircut (the values actually simulated), not the advertised targets.\n')

console.log('  🏆 TOP 3 BY COMPOSITE SCORE (pass-rate + expectancy − risk of ruin):')
results.slice(0, 3).forEach((r, i) => {
  console.log(`     ${['🥇','🥈','🥉'][i]} ${r.name} — ${pc(r.passRate)} pass · ${f2(r.expR)}R/trade · ${pc(r.bustRate)} ruin`)
})

const byExp = [...results].sort((a, b) => b.expR - a.expR)[0]
const byPass = [...results].sort((a, b) => b.passRate - a.passRate)[0]
const bySafe = [...results].sort((a, b) => a.bustRate - b.bustRate)[0]
console.log('\n  📊 CATEGORY LEADERS:')
console.log(`     • Highest expectancy : ${byExp.name} (${f2(byExp.expR)}R/trade)`)
console.log(`     • Highest pass rate  : ${byPass.name} (${pc(byPass.passRate)})`)
console.log(`     • Lowest risk of ruin: ${bySafe.name} (${pc(bySafe.bustRate)})`)
console.log('\n  Note: model assumptions, not live backtests — validate each on 6–12 months of real data.\n')
