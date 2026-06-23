#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Statistical-Arbitrage research & validation harness (v2)
//
// Goal: find a PROP-FIRM-GRADE config — win rate ≥ 55%, smooth curve, short
// losing streaks — that is still genuinely profitable, then port it to Pine.
//
// Levers tested (all standard mean-reversion craft):
//   • reversal confirmation  — enter only when the spread is stretched AND already
//     ticking back toward the mean (don't catch the knife)
//   • partial take-profit     — bank a bounce (exit z) instead of waiting for full
//     reversion → far higher hit rate
//   • loss cooldown           — after a stop, stand down N bars so a de-cohering
//     spread can't produce a 10-loss streak
//   • cointegration gate      — ADF t-stat + finite OU half-life
// ─────────────────────────────────────────────────────────────────────────────

let seed = 7919
const rnd = () => { seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5; return ((seed >>> 0) % 1e6) / 1e6 }
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }

// mean-reverting (OU) log-price series — represents a cointegrated ratio/spread chart
function genOU({ n = 8000, theta = 0.04, sigma = 0.012, mu = Math.log(100) }) {
  const px = []; let x = mu
  for (let i = 0; i < n; i++) { x += theta * (mu - x) + sigma * gauss(); px.push(Math.exp(x)) }
  return px
}
function genTrend({ n = 8000, drift = 0.0004, sigma = 0.01, p0 = 100 }) {
  const px = [p0]; for (let i = 1; i < n; i++) px.push(px[i - 1] * Math.exp(drift + sigma * gauss())); return px
}

const sma = (a, i, n) => { let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n }
const std = (a, i, n) => { const m = sma(a, i, n); let s = 0; for (let k = i - n + 1; k <= i; k++) s += (a[k] - m) ** 2; return Math.sqrt(s / (n - 1)) }
function ols(y, x, i, n) {
  let sx = 0, sy = 0, sxx = 0, sxy = 0
  for (let k = i - n + 1; k <= i; k++) { sx += x[k]; sy += y[k]; sxx += x[k] * x[k]; sxy += x[k] * y[k] }
  const d = n * sxx - sx * sx, b = d ? (n * sxy - sx * sy) / d : 0
  return [(sy - b * sx) / n, b]
}

function backtest(px, P) {
  const { zLen = 100, statLen = 100, entryZ = 1.5, exitZ = 0.7, stopZ = 3.0, maxHLmult = 5,
          commission = 0.0004, slip = 0.0002, adfThresh = -2.5, confirmEntry = true,
          cooldown = 5, requireStat = true } = P
  const logp = px.map(Math.log)
  const lag = logp.map((_, i) => (i > 0 ? logp[i - 1] : logp[0]))
  const dX = logp.map((v, i) => v - lag[i])
  let pos = 0, entryPx = 0, entryBar = 0, lastExit = -1e9
  const trades = []; let eq = 0, peak = 0, maxDD = 0, streak = 0, worstStreak = 0
  const start = Math.max(zLen, statLen, 20) + 2

  for (let i = start; i < px.length; i++) {
    const m = sma(logp, i, zLen), sd = std(logp, i, zLen)
    const z = sd > 0 ? (logp[i] - m) / sd : 0
    const zPrev = sd > 0 ? (logp[i - 1] - sma(logp, i - 1, zLen)) / std(logp, i - 1, zLen) : 0
    const [aa, bb] = ols(dX, lag, i, statLen)
    let rs = 0; for (let k = i - statLen + 1; k <= i; k++) { const r = dX[k] - (aa + bb * lag[k]); rs += r * r }
    const sResid = Math.sqrt(rs / (statLen - 2)), sdLag = std(lag, i, statLen)
    const adf_t = sdLag > 0 ? bb / (sResid / (sdLag * Math.sqrt(statLen))) : 0
    const hl = bb < 0 && 1 + bb > 0 && 1 + bb < 1 ? -Math.log(2) / Math.log(1 + bb) : NaN
    const stationary = !requireStat || (adf_t < adfThresh && !Number.isNaN(hl))
    const maxHold = Number.isNaN(hl) ? 200 : Math.min(400, Math.round(hl * maxHLmult))
    const price = px[i]

    if (pos !== 0) {
      let exit = false
      if (pos > 0) exit = z >= -exitZ || z <= -stopZ
      else exit = z <= exitZ || z >= stopZ
      if (!stationary || i - entryBar >= maxHold) exit = true
      if (exit) {
        const gross = pos > 0 ? (price - entryPx) / entryPx : (entryPx - price) / entryPx
        const net = gross - 2 * (commission + slip)
        trades.push(net); eq += net
        peak = Math.max(peak, eq); maxDD = Math.max(maxDD, peak - eq)
        if (net <= 0) { streak++; worstStreak = Math.max(worstStreak, streak) } else streak = 0
        pos = 0; lastExit = i
      }
    }
    if (pos === 0 && stationary && i - lastExit >= cooldown) {
      const stretchedLong = z <= -entryZ, stretchedShort = z >= entryZ
      const turnUp = z > zPrev, turnDn = z < zPrev
      const openL = confirmEntry ? (stretchedLong && turnUp) : (stretchedLong && zPrev > -entryZ)
      const openS = confirmEntry ? (stretchedShort && turnDn) : (stretchedShort && zPrev < entryZ)
      if (openL) { pos = 1; entryPx = price; entryBar = i }
      else if (openS) { pos = -1; entryPx = price; entryBar = i }
    }
  }
  const wins = trades.filter(t => t > 0), losses = trades.filter(t => t <= 0)
  const gW = wins.reduce((a, b) => a + b, 0), gL = -losses.reduce((a, b) => a + b, 0)
  return {
    trades: trades.length, winRate: trades.length ? wins.length / trades.length : 0,
    totalRet: eq, profitFactor: gL > 0 ? gW / gL : Infinity,
    maxDD, worstStreak,
    avgWin: wins.length ? gW / wins.length : 0, avgLoss: losses.length ? gL / losses.length : 0,
  }
}

const pct = x => (x * 100).toFixed(1) + '%'
const f2 = x => x.toFixed(2)
const row = (name, r) => `  ${name.padEnd(40)} ${String(r.trades).padStart(4)}t  win ${pct(r.winRate).padStart(6)}  PF ${f2(r.profitFactor).padStart(5)}  ret ${pct(r.totalRet).padStart(8)}  maxDD ${pct(r.maxDD).padStart(6)}  worst streak ${String(r.worstStreak).padStart(2)}`

const ou = genOU({}), trend = genTrend({})

console.log('\n' + '═'.repeat(116))
console.log('  STAT-ARB v2 — engineering a PROP-GRADE config (win ≥ 55%, short streaks) on cointegrated OU data')
console.log('═'.repeat(116))

console.log('\n  A) The fix stack, added one at a time:')
console.log(row('  old: knife-catch entry, exit at mean', backtest(ou, { confirmEntry: false, exitZ: 0.2, cooldown: 0, adfThresh: -2.0 })))
console.log(row('  + reversal confirmation', backtest(ou, { confirmEntry: true, exitZ: 0.2, cooldown: 0, adfThresh: -2.0 })))
console.log(row('  + partial take-profit (exitZ 0.7)', backtest(ou, { confirmEntry: true, exitZ: 0.7, cooldown: 0, adfThresh: -2.0 })))
console.log(row('  + loss cooldown + stricter gate', backtest(ou, { confirmEntry: true, exitZ: 0.7, cooldown: 5, adfThresh: -2.5 })))

console.log('\n  B) Grid search → maximise profit factor SUBJECT TO win rate ≥ 55% and worst streak ≤ 5:')
let best = null
for (const entryZ of [1.0, 1.25, 1.5, 2.0])
  for (const exitZ of [0.5, 0.7, 1.0, 1.25])
    for (const stopZ of [2.5, 3.0, 3.5])
      for (const cooldown of [3, 5, 8])
        for (const adfThresh of [-2.0, -2.5, -3.0]) {
          const r = backtest(ou, { entryZ, exitZ, stopZ, cooldown, adfThresh, confirmEntry: true })
          if (r.trades >= 30 && r.winRate >= 0.55 && r.worstStreak <= 5 && r.profitFactor > 1.0 &&
              (!best || r.profitFactor > best.r.profitFactor)) best = { entryZ, exitZ, stopZ, cooldown, adfThresh, r }
        }
if (best) {
  console.log(row(`  WINNER e${best.entryZ}/x${best.exitZ}/s${best.stopZ}/cd${best.cooldown}/adf${best.adfThresh}`, best.r))
  console.log(`\n  → Port: entryZ=${best.entryZ}, exitZ=${best.exitZ}, stopZ=${best.stopZ}, cooldown=${best.cooldown}, adfThresh=${best.adfThresh}, confirmEntry=ON`)
  console.log(`     win ${pct(best.r.winRate)} · PF ${f2(best.r.profitFactor)} · ret ${pct(best.r.totalRet)} · maxDD ${pct(best.r.maxDD)} · worst streak ${best.r.worstStreak}`)
} else console.log('  no config met the constraints — loosen them')

console.log('\n  C) Gate sanity on a TRENDING series (must stand down):')
console.log(row('  prop config on trend, gate ON', backtest(trend, best ? best : {})))
console.log('')
