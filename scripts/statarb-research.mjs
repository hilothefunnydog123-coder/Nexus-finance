#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Stat-Arb / mean-reversion ROBUSTNESS lab (v3)
//
// The hard lesson: a mean-reversion strategy can only make money on a
// mean-reverting series. On a single 5-min instrument, price TRENDS — so the
// engine must (a) make money in ranges and (b) STAND DOWN in trends. We test
// that across many market regimes × many seeds (Monte Carlo), not one clean OU.
//
// New weapon for single instruments: a FLAT-MEAN (ranging) filter — only fade
// deviations when the moving mean itself is flat. If the mean is sloping, the
// instrument is trending and we don't fight it.
//
// Objective of the search: robustly profitable + win ≥ 55% + short streaks on
// reverting/ranging regimes, while losing ~nothing on trending/random regimes.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s) { return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
function mkGauss(rng) { return () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) } }

// ── regime generators (log-price → price) ──
function genOU(seed, { n = 4000, theta = 0.05, sigma = 0.012, mu = Math.log(100) } = {}) {
  const g = mkGauss(mkRng(seed)); const px = []; let x = mu
  for (let i = 0; i < n; i++) { x += theta * (mu - x) + sigma * g(); px.push(Math.exp(x)) }; return px
}
function genWeakOU(seed) { return genOU(seed, { theta: 0.02, sigma: 0.014 }) }
function genOUdrift(seed, { n = 4000, theta = 0.05, sigma = 0.012 } = {}) {
  const g = mkGauss(mkRng(seed)); const px = []; let x = Math.log(100), mu = Math.log(100)
  for (let i = 0; i < n; i++) { mu += 0.0003 * (g() > 0 ? 1 : -1) * Math.abs(g()); x += theta * (mu - x) + sigma * g(); px.push(Math.exp(x)) }; return px
}
function genGBM(seed, { n = 4000, drift = 0.0003, sigma = 0.011, p0 = 100 } = {}) {
  const g = mkGauss(mkRng(seed)); const px = [p0]
  for (let i = 1; i < n; i++) px.push(px[i - 1] * Math.exp(drift + sigma * g())); return px
}
function genTrend(seed) { return genGBM(seed, { drift: 0.0006, sigma: 0.009 }) }
function genRegimeSwitch(seed) { // alternate OU blocks and trend blocks
  const g = mkGauss(mkRng(seed)); const px = []; let x = Math.log(100), mode = 0, t = 0, drift = 0
  for (let i = 0; i < 4000; i++) {
    if (t <= 0) { mode ^= 1; t = 300 + Math.floor(mkRng(seed + i)() * 400); drift = (g() > 0 ? 1 : -1) * 0.0006 }
    if (mode === 0) x += 0.05 * (Math.log(100) - x) + 0.012 * g()  // OU toward 100-ish (drifts as level moves)
    else x += drift + 0.010 * g()                                   // trend
    px.push(Math.exp(x)); t--
  }
  return px
}
function genJumpOU(seed, { n = 4000, theta = 0.05, sigma = 0.011, mu = Math.log(100) } = {}) {
  const rng = mkRng(seed), g = mkGauss(rng); const px = []; let x = mu
  for (let i = 0; i < n; i++) { x += theta * (mu - x) + sigma * g(); if (rng() < 0.004) x += (rng() > 0.5 ? 1 : -1) * 0.05; px.push(Math.exp(x)) }; return px
}

const sma = (a, i, n) => { let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n }
const std = (a, i, n) => { const m = sma(a, i, n); let s = 0; for (let k = i - n + 1; k <= i; k++) s += (a[k] - m) ** 2; return Math.sqrt(s / (n - 1)) }
function ols(y, x, i, n) { let sx = 0, sy = 0, sxx = 0, sxy = 0; for (let k = i - n + 1; k <= i; k++) { sx += x[k]; sy += y[k]; sxx += x[k] * x[k]; sxy += x[k] * y[k] } const d = n * sxx - sx * sx, b = d ? (n * sxy - sx * sy) / d : 0; return [(sy - b * sx) / n, b] }

function backtest(px, P) {
  const { zLen = 100, statLen = 100, entryZ = 2.0, exitZ = 0.7, stopZ = 3.0, maxHLmult = 5,
          commission = 0.0004, slip = 0.0002, adfThresh = -3.0, confirmEntry = true, cooldown = 8,
          flatMax = 0.6, slopeBars = 30, hurstMax = 0.5 } = P
  const logp = px.map(Math.log)
  const lag = logp.map((_, i) => (i ? logp[i - 1] : logp[0]))
  const dX = logp.map((v, i) => v - lag[i])
  let pos = 0, entryPx = 0, entryBar = 0, lastExit = -1e9
  const trades = []; let eq = 0, peak = 0, maxDD = 0, streak = 0, worst = 0
  const start = Math.max(zLen, statLen, slopeBars, 20) + 2
  for (let i = start; i < px.length; i++) {
    const m = sma(logp, i, zLen), sd = std(logp, i, zLen)
    const z = sd ? (logp[i] - m) / sd : 0
    const zP = sd ? (logp[i - 1] - sma(logp, i - 1, zLen)) / std(logp, i - 1, zLen) : 0
    const [aa, bb] = ols(dX, lag, i, statLen)
    let rs = 0; for (let k = i - statLen + 1; k <= i; k++) { const r = dX[k] - (aa + bb * lag[k]); rs += r * r }
    const sR = Math.sqrt(rs / (statLen - 2)), sL = std(lag, i, statLen)
    const adf = sL ? bb / (sR / (sL * Math.sqrt(statLen))) : 0
    const hl = bb < 0 && 1 + bb > 0 && 1 + bb < 1 ? -Math.log(2) / Math.log(1 + bb) : NaN
    // FLAT-MEAN (ranging) filter: the mean must not be sloping
    const mPrev = sma(logp, i - slopeBars, zLen)
    const flat = Math.abs(m - mPrev) <= flatMax * sd
    const stationary = adf < adfThresh && !Number.isNaN(hl) && flat
    const maxHold = Number.isNaN(hl) ? 150 : Math.min(300, Math.round(hl * maxHLmult))
    const price = px[i]
    if (pos !== 0) {
      let exit = pos > 0 ? (z >= -exitZ || z <= -stopZ) : (z <= exitZ || z >= stopZ)
      if (adf >= adfThresh - 0.5 && !flat) exit = true       // bailed: lost stationarity/started trending
      if (i - entryBar >= maxHold) exit = true
      if (exit) {
        const gross = pos > 0 ? (price - entryPx) / entryPx : (entryPx - price) / entryPx
        const net = gross - 2 * (commission + slip); trades.push(net); eq += net
        peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq)
        if (net <= 0) { streak++; worst = Math.max(worst, streak) } else streak = 0
        pos = 0; lastExit = i
      }
    }
    if (pos === 0 && stationary && i - lastExit >= cooldown) {
      const openL = z <= -entryZ && (confirmEntry ? z > zP : true)
      const openS = z >= entryZ && (confirmEntry ? z < zP : true)
      if (openL) { pos = 1; entryPx = price; entryBar = i }
      else if (openS) { pos = -1; entryPx = price; entryBar = i }
    }
  }
  return { trades, eq, maxDD, worst }
}

// Monte Carlo over seeds for a regime; pool trades for robust stats
function mc(gen, P, seeds = 16) {
  let all = [], totEq = 0, maxWorst = 0, dds = []
  for (let s = 0; s < seeds; s++) {
    const r = backtest(gen(1000 + s * 17), P)
    all = all.concat(r.trades); totEq += r.eq; maxWorst = Math.max(maxWorst, r.worst); dds.push(r.maxDD)
  }
  const wins = all.filter(t => t > 0), losses = all.filter(t => t <= 0)
  const gW = wins.reduce((a, b) => a + b, 0), gL = -losses.reduce((a, b) => a + b, 0)
  return {
    trades: all.length, win: all.length ? wins.length / all.length : 0,
    pf: gL > 0 ? gW / gL : (gW > 0 ? Infinity : 0), ret: totEq / seeds,
    worst: maxWorst, maxDD: Math.max(...dds),
  }
}

const REVERT = { 'OU (strong)': genOU, 'OU (weak)': genWeakOU, 'OU + drift': genOUdrift, 'jumpy OU': genJumpOU }
const NONREV = { 'random walk': genGBM, 'trend': genTrend, 'regime-switch': genRegimeSwitch }
const pct = x => (x * 100).toFixed(1) + '%'
const f2 = x => x.toFixed(2)

// objective: profitable & win≥55 & worst≤6 on EVERY reverting regime; small loss on non-reverting
function evaluate(P, seeds = 12) {
  const rev = Object.values(REVERT).map(g => mc(g, P, seeds))
  const non = Object.values(NONREV).map(g => mc(g, P, seeds))
  const okRev = rev.every(r => r.trades >= 25 && r.win >= 0.55 && r.pf > 1.05 && r.worst <= 6 && r.ret > 0)
  const worstNon = Math.min(...non.map(r => r.ret))            // most negative trend/random return
  const minPF = Math.min(...rev.map(r => r.pf))
  const avgWin = rev.reduce((a, r) => a + r.win, 0) / rev.length
  return { okRev, worstNon, minPF, avgWin, rev, non, score: okRev ? minPF + worstNon * 5 : -1 }
}

console.log('\n' + '═'.repeat(112))
console.log('  STAT-ARB FREQUENCY LAB — MAXIMISE trade count while keeping win ≥ 60%, PF ≥ 1.6, short streaks')
console.log('═'.repeat(112))

// Objective flipped: among configs that hold quality, pick the one that TRADES THE MOST.
// Shorter windows + shallower entry + only the gates the validation actually used (ADF+HL+flat).
let best = null, tested = 0
for (const entryZ of [1.25, 1.5, 1.75, 2.0])
  for (const zLen of [40, 60, 80])
    for (const flatMax of [0.9, 1.2, 1.6])
      for (const adfThresh of [-1.5, -2.0, -2.5])
        for (const cooldown of [3, 5]) {
          tested++
          const P = { entryZ, exitZ: 0.5, stopZ: 3.5, zLen, statLen: zLen, slopeBars: Math.round(zLen * 0.3),
                      flatMax, adfThresh, cooldown, confirmEntry: true }
          const rev = Object.values(REVERT).map(g => mc(g, P, 8))
          const non = Object.values(NONREV).map(g => mc(g, P, 8))
          const okRev = rev.every(r => r.trades >= 25 && r.win >= 0.60 && r.pf >= 1.6 && r.worst <= 6 && r.ret > 0)
          const worstNon = Math.min(...non.map(r => r.ret))
          const tradesPerSeed = rev.reduce((a, r) => a + r.trades, 0) / (rev.length * 8)
          if (okRev && worstNon > -0.06 && (!best || tradesPerSeed > best.freq)) best = { P, freq: tradesPerSeed }
        }

console.log(`\n  Searched ${tested} configs × 7 regimes × 8 seeds.\n`)
if (!best) { console.log('  No config held the quality bar — loosen win/PF targets.'); process.exit(0) }
console.log(`  WINNER trades ~${best.freq.toFixed(1)} per 4000-bar series (≈ ${(best.freq / 51 * 21).toFixed(1)} trades/month on 5-min)\n`)

const e = evaluate(best.P, 20)
console.log('  ── WINNING CONFIG ──')
console.log('  ' + JSON.stringify(best.P))
console.log('\n  Reverting / ranging regimes (must win):')
Object.keys(REVERT).forEach((k, i) => { const r = e.rev[i]; console.log(`    ${k.padEnd(16)} ${String(r.trades).padStart(4)}t  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ret ${pct(r.ret).padStart(7)}  maxDD ${pct(r.maxDD).padStart(6)}  worst streak ${r.worst}`) })
console.log('\n  Trending / random regimes (must stand down ≈ flat):')
Object.keys(NONREV).forEach((k, i) => { const r = e.non[i]; console.log(`    ${k.padEnd(16)} ${String(r.trades).padStart(4)}t  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ret ${pct(r.ret).padStart(7)}  maxDD ${pct(r.maxDD).padStart(6)}`) })
console.log('\n  → Port these params to the Pine Stat-Arb (incl. the flat-mean / ranging filter).')
console.log(`     avg win across reverting regimes: ${pct(e.avgWin)} · min PF: ${f2(e.minPF)}\n`)
