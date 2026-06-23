#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — MNQ 5-min intraday strategy research lab
//
// MNQ outright TRENDS — the wrong market for mean reversion. This lab builds a
// realistic intraday index-futures simulator and finds a TREND/MOMENTUM engine
// that fits it: high win rate, ~10 trades/month, profitable across a realistic
// MIX of day types (not cherry-picked all-trend data).
//
// Simulator stylized facts (from the index-futures microstructure literature):
//   • day types: trend-up / trend-down / range / reversal in realistic proportions
//   • intraday momentum (positive return autocorrelation) on trend days
//   • mean reversion to the day's VWAP on range days
//   • U-shaped intraday volatility (busy open & close, quiet midday)
//   • volatility clustering across days (GARCH-like), fat tails, overnight gaps
//   • mild long-run upward drift
//
// Archetypes tested: EMA Trend-Pullback, Opening-Range Breakout, Donchian
// Momentum Breakout. Winner is tuned and ported to a new GOD MODE Pine strategy.
// ─────────────────────────────────────────────────────────────────────────────

function mkRng(s) { return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 } }
function mkGauss(rng) { return () => { let u = 0, v = 0; while (!u) u = rng(); while (!v) v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) } }

const BARS_PER_DAY = 78  // RTH 09:30–16:00, 5-min

// realistic MNQ-like intraday simulator → array of {o,h,l,c,v,day,bar}
function genMNQ(seed, nDays = 252) {
  const rng = mkRng(seed), g = mkGauss(rng)
  const bars = []
  let price = 18000
  let garch = 1.0                         // volatility-clustering state
  const baseSig = 9.0                     // ~9 index points per 5-min bar baseline
  for (let d = 0; d < nDays; d++) {
    const u = rng()
    const type = u < 0.30 ? 'up' : u < 0.55 ? 'down' : u < 0.82 ? 'range' : 'reversal'
    garch = 0.85 * garch + 0.15 * (0.6 + 1.4 * rng()) + (rng() < 0.05 ? 1.2 : 0)  // clustering + shocks
    const dayVol = baseSig * Math.sqrt(garch)
    price *= Math.exp((rng() - 0.5) * 0.004)            // overnight gap
    const dayOpen = price
    const dayDrift = type === 'up' ? dayVol * 0.16 : type === 'down' ? -dayVol * 0.16 : 0
    let prevRet = 0
    let dayMean = price
    for (let b = 0; b < BARS_PER_DAY; b++) {
      // U-shaped intraday vol
      const ushape = 1.0 + 0.8 * (Math.exp(-b / 8) + Math.exp(-(BARS_PER_DAY - b) / 8))
      let sig = dayVol * ushape * 0.5
      if (rng() < 0.03) sig *= 3                          // fat-tail jump
      let ret
      if (type === 'range') ret = -0.06 * (price - dayMean) + sig * g()           // revert to day mean
      else if (type === 'reversal') {
        const half = b < BARS_PER_DAY / 2 ? 1 : -1
        ret = half * dayVol * 0.15 + 0.25 * prevRet + sig * g()
      } else ret = dayDrift + 0.30 * prevRet + sig * g()  // trend + intraday momentum (AR1)
      prevRet = ret
      const o = price
      const c = price + ret
      const wick = Math.abs(g()) * sig * 0.7
      const h = Math.max(o, c) + wick
      const l = Math.min(o, c) - Math.abs(g()) * sig * 0.7
      const v = 1000 * ushape * (0.7 + 0.6 * rng())
      bars.push({ o, h, l, c, v, day: d, bar: b })
      price = c
      dayMean += (price - dayMean) * 0.02
    }
  }
  return bars
}

// ── indicators (O(n)) ──
function ema(arr, len) { const k = 2 / (len + 1); const out = []; let e = arr[0]; for (let i = 0; i < arr.length; i++) { e = i ? arr[i] * k + e * (1 - k) : arr[i]; out.push(e) } return out }
function atr(bars, len) {
  const tr = bars.map((b, i) => i ? Math.max(b.h - b.l, Math.abs(b.h - bars[i - 1].c), Math.abs(b.l - bars[i - 1].c)) : b.h - b.l)
  return ema(tr, len)
}
function sma(arr, i, n) { let s = 0; for (let k = i - n + 1; k <= i; k++) s += arr[k]; return s / n }

// ── execution: one stop, one target (R-multiple of the ATR stop), breakeven, cooldown ──
function runExits(bars, sig, P) {
  const { slAtr = 1.5, tpR = 1.5, beAtR = 1.0, useBE = true, cost = 1.5, cooldown = 4 } = P
  const a = atr(bars, 14)
  const trades = []
  let pos = 0, entry = 0, sl = 0, tp = 0, beArmed = false, eIdx = 0, lastExit = -1e9
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    if (pos !== 0) {
      let exitPx = null
      if (pos > 0) {
        if (useBE && !beArmed && b.h >= entry + beAtR * a[eIdx]) { beArmed = true; sl = entry }
        if (b.l <= sl) exitPx = sl
        else if (b.h >= tp) exitPx = tp
      } else {
        if (useBE && !beArmed && b.l <= entry - beAtR * a[eIdx]) { beArmed = true; sl = entry }
        if (b.h >= sl) exitPx = sl
        else if (b.l <= tp) exitPx = tp
      }
      const eod = b.bar === BARS_PER_DAY - 1
      if (exitPx === null && eod) exitPx = b.c
      if (exitPx !== null) {
        const pts = (pos > 0 ? exitPx - entry : entry - exitPx) - cost
        trades.push(pts); pos = 0; beArmed = false; lastExit = i
      }
    }
    if (pos === 0 && sig[i] !== 0 && b.bar < BARS_PER_DAY - 3 && i - lastExit >= cooldown) {
      pos = sig[i]; entry = b.c; eIdx = i
      sl = pos > 0 ? entry - slAtr * a[i] : entry + slAtr * a[i]
      tp = pos > 0 ? entry + tpR * slAtr * a[i] : entry - tpR * slAtr * a[i]
      beArmed = false
    }
  }
  return trades
}

// ── ARCHETYPE A: EMA Trend-Pullback (proper cross-back trigger) ──
function sigTrendPullback(bars, P) {
  const { fast = 20, slow = 50, regime = 200, slopeBars = 10, minSep = 0.0 } = P
  const c = bars.map(b => b.c)
  const eF = ema(c, fast), eS = ema(c, slow), eR = ema(c, regime)
  const a = atr(bars, 14)
  const sig = new Array(bars.length).fill(0)
  for (let i = regime + slopeBars + 1; i < bars.length; i++) {
    const sep = a[i] > 0 ? Math.abs(eF[i] - eS[i]) / a[i] : 0   // trend-strength proxy (EMA separation in ATRs)
    const up = c[i] > eR[i] && eR[i] > eR[i - slopeBars] && eF[i] > eS[i] && sep >= minSep
    const dn = c[i] < eR[i] && eR[i] < eR[i - slopeBars] && eF[i] < eS[i] && sep >= minSep
    // pullback-and-resume = a clean cross back through the fast EMA in the trend direction
    const crossUp = c[i] > eF[i] && c[i - 1] <= eF[i - 1]
    const crossDn = c[i] < eF[i] && c[i - 1] >= eF[i - 1]
    sig[i] = (up && crossUp) ? 1 : (dn && crossDn) ? -1 : 0
  }
  return sig
}
// ── ARCHETYPE B: Opening-Range Breakout ──
function sigORB(bars, P) {
  const { orBars = 6, regime = 200 } = P
  const c = bars.map(b => b.c); const eR = ema(c, regime)
  const sig = new Array(bars.length).fill(0)
  let orH = -Infinity, orL = Infinity, doneL = false, doneS = false
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]
    if (b.bar === 0) { orH = -Infinity; orL = Infinity; doneL = doneS = false }
    if (b.bar < orBars) { orH = Math.max(orH, b.h); orL = Math.min(orL, b.l); continue }
    if (i < regime) continue
    if (!doneL && b.c > orH && c[i] > eR[i]) { sig[i] = 1; doneL = true }
    else if (!doneS && b.c < orL && c[i] < eR[i]) { sig[i] = -1; doneS = true }
  }
  return sig
}
// ── ARCHETYPE C: Donchian Momentum Breakout (trend-filtered) ──
function sigDonchian(bars, P) {
  const { dc = 20, regime = 200 } = P
  const c = bars.map(b => b.c); const eR = ema(c, regime)
  const sig = new Array(bars.length).fill(0)
  for (let i = Math.max(dc, regime) + 1; i < bars.length; i++) {
    let hh = -Infinity, ll = Infinity
    for (let k = i - dc; k < i; k++) { hh = Math.max(hh, bars[k].h); ll = Math.min(ll, bars[k].l) }
    if (c[i] > hh && c[i] > eR[i]) sig[i] = 1
    else if (c[i] < ll && c[i] < eR[i]) sig[i] = -1
  }
  return sig
}

function stats(trades, nDays) {
  const wins = trades.filter(t => t > 0), losses = trades.filter(t => t <= 0)
  const gW = wins.reduce((a, b) => a + b, 0), gL = -losses.reduce((a, b) => a + b, 0)
  let eq = 0, peak = 0, dd = 0, streak = 0, worst = 0
  for (const t of trades) { eq += t; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); if (t <= 0) { streak++; worst = Math.max(worst, streak) } else streak = 0 }
  return {
    trades: trades.length, win: trades.length ? wins.length / trades.length : 0,
    pf: gL > 0 ? gW / gL : (gW > 0 ? Infinity : 0), pts: eq, maxDD: dd, worst,
    perMonth: trades.length / (nDays / 21),
  }
}

// Monte Carlo across seeds
function mc(sigFn, P, seeds = 6, nDays = 252) {
  let all = []
  for (let s = 0; s < seeds; s++) { const bars = genMNQ(2000 + s * 31, nDays); all = all.concat(runExits(bars, sigFn(bars, P), P)) }
  return stats(all, nDays * seeds)
}

const pct = x => (x * 100).toFixed(1) + '%'
const f2 = x => x.toFixed(2)
const row = (n, r) => `  ${n.padEnd(30)} ${String(r.trades).padStart(4)}t  ${(r.perMonth).toFixed(1).padStart(4)}/mo  win ${pct(r.win).padStart(6)}  PF ${f2(r.pf).padStart(5)}  ${(r.pts).toFixed(0).padStart(7)}pts  maxDD ${(r.maxDD).toFixed(0).padStart(5)}  streak ${r.worst}`

console.log('\n' + '═'.repeat(112))
console.log('  MNQ 5-MIN RESEARCH — which archetype fits a trending intraday index future? (realistic simulator)')
console.log('═'.repeat(112) + '\n')
console.log('  A) Archetype shootout (default params):')
console.log(row('  EMA Trend-Pullback', mc(sigTrendPullback, { slAtr: 1.5, tpR: 1.5 })))
console.log(row('  Opening-Range Breakout', mc(sigORB, { slAtr: 1.5, tpR: 1.5 })))
console.log(row('  Donchian Momentum', mc(sigDonchian, { slAtr: 1.5, tpR: 1.5 })))

// Objective: win ≥ 55%, 6–14 trades/mo, PF ≥ 1.4, short streaks → maximise win×PF
console.log('\n  B) Tune for HIGH WIN RATE (≥55%), ~6–14 trades/mo, PF ≥ 1.4:')
let best = null, tested = 0
// Trend-Pullback grid (proper cross trigger + closer targets lift win rate)
for (const fast of [9, 20])
  for (const slow of [50, 100])
    for (const slopeBars of [10, 20])
      for (const minSep of [0.0, 0.5, 1.0])
        for (const slAtr of [1.5, 2.0])
          for (const tpR of [0.75, 1.0, 1.5])
            for (const cooldown of [4, 8]) {
              tested++
              const P = { kind: 'TrendPB', fast, slow, regime: 200, slopeBars, minSep, slAtr, tpR, useBE: true, cooldown }
              const r = mc(sigTrendPullback, P, 6)
              if (r.perMonth >= 6 && r.perMonth <= 14 && r.win >= 0.55 && r.pf >= 1.4 && r.worst <= 6 && r.pts > 0 &&
                  (!best || r.win * r.pf > best.score)) best = { fn: sigTrendPullback, P, r, score: r.win * r.pf }
            }
// Donchian grid (longer channels = fewer/stronger; closer targets lift win)
for (const dc of [20, 40, 60])
  for (const slAtr of [1.5, 2.0])
    for (const tpR of [0.75, 1.0, 1.5])
      for (const cooldown of [4, 8]) {
        tested++
        const P = { kind: 'Donchian', dc, regime: 200, slAtr, tpR, useBE: true, cooldown }
        const r = mc(sigDonchian, P, 6)
        if (r.perMonth >= 6 && r.perMonth <= 14 && r.win >= 0.55 && r.pf >= 1.4 && r.worst <= 6 && r.pts > 0 &&
            (!best || r.win * r.pf > best.score)) best = { fn: sigDonchian, P, r, score: r.win * r.pf }
      }
console.log(`     searched ${tested} configs × 6 seeds`)
if (best) {
  console.log(row(`  WINNER [${best.P.kind}]`, best.r))
  console.log('     ' + JSON.stringify(best.P))
  console.log('\n  C) Confirmation (20 seeds):')
  console.log(row(`  ${best.P.kind} (tuned)`, mc(best.fn, best.P, 20)))
} else {
  console.log('     no config hit win≥55% + PF≥1.4 → the honest finding: high win + profit on a single')
  console.log('     trending instrument needs a CLOSER target; relaxing win to 50%:')
  let b2 = null
  for (const dc of [20, 30, 40, 60]) for (const slAtr of [1.5, 2.0]) for (const tpR of [0.5, 0.75, 1.0]) for (const cooldown of [4, 8]) {
    const P = { kind: 'Donchian', dc, regime: 200, slAtr, tpR, useBE: true, cooldown }
    const r = mc(sigDonchian, P, 6)
    if (r.perMonth >= 5 && r.perMonth <= 16 && r.pf >= 1.3 && r.pts > 0 && (!b2 || r.win > b2.r.win)) b2 = { fn: sigDonchian, P, r }
  }
  if (b2) { console.log(row(`  best-win [${b2.P.kind}]`, b2.r)); console.log('     ' + JSON.stringify(b2.P)); console.log('\n  C) Confirmation (20 seeds):'); console.log(row(`  ${b2.P.kind}`, mc(b2.fn, b2.P, 20))) }
}
console.log('')
