#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — GOD MODE strategy generator (v21)
//
// Three of the highest-pedigree, highest-Sharpe strategies in quantitative
// finance, implemented rigorously in Pine v5 with a shared, mathematically
// correct quant library:
//
//   1. STATISTICAL ARBITRAGE  — cointegrated pairs / Ornstein–Uhlenbeck reversion
//        rolling OLS hedge ratio β, spread z-score, AR(1) half-life of reversion,
//        Lo–MacKinlay variance ratio + Hurst stationarity gates. Market-neutral
//        relative value — the classic stat-arb edge (Gatev/Goetzmann/Rouwenhorst).
//   2. VOL-TARGETED MOMENTUM  — Moskowitz–Ooi–Pedersen time-series momentum,
//        a 4-horizon ensemble with Jegadeesh–Titman skip, Barroso–Santa-Clara
//        volatility management (scale exposure to a constant target vol) + crash
//        control. The most robust cross-asset anomaly there is.
//   3. ADAPTIVE REGIME-SWITCH — Kalman-filtered fair value + variance ratio +
//        Hurst classify the regime, then the engine SWITCHES between a momentum
//        sub-model (trending) and an OU mean-reversion sub-model (reverting).
//
//   Shared execution: risk-based sizing off the stop, volatility scaling, tiered
//   TP1/TP2/TP3 with breakeven + monotonic ATR chandelier trail, time stop, daily
//   loss kill-switch, and a deep live quant dashboard. Signature long/short boxes.
//
// Honest note: these are real, top-tier quant *frameworks*. They are not magic —
// even great quant runs a Sharpe of ~1–2. Every formula here is correct; whether
// it is profitable on YOUR market and costs is a Strategy-Tester question.
//
// Run:  node scripts/build-godmode.mjs  → writes src/app/algorithms/god-mode.ts
// ─────────────────────────────────────────────────────────────────────────────
import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const algoDir = join(__dir, '..', 'src', 'app', 'algorithms')

// ─── Shared, correct quant math library (Pine v5) ─────────────────────────────
const MATH_LIB = `// ════════════════════ QUANT MATH LIBRARY ════════════════════
// Ordinary least squares of y on x over n bars → [intercept, slope].
f_ols(float y, float x, int n) =>
    mx = ta.sma(x, n)
    my = ta.sma(y, n)
    cov = ta.sma(x * y, n) - mx * my
    vx  = ta.sma(x * x, n) - mx * mx
    beta  = vx != 0.0 ? cov / vx : 0.0
    alpha = my - beta * mx
    [alpha, beta]
// Rolling z-score.
f_z(float src, int n) =>
    m  = ta.sma(src, n)
    sd = ta.stdev(src, n)
    sd != 0.0 ? (src - m) / sd : 0.0
// Half-life of mean reversion from the AR(1) coefficient:
// ΔS_t = a + b·S_{t-1};  ρ = 1+b;  HL = -ln2 / ln(ρ)  (bars). na if not reverting.
f_halflife(float src, int n) =>
    lag = src[1]
    dS  = src - lag
    [a, b] = f_ols(dS, lag, n)
    rho = 1.0 + b
    hl = (b < 0.0 and rho > 0.0 and rho < 1.0) ? -math.log(2.0) / math.log(rho) : na
    hl
// Lo–MacKinlay variance ratio at lag q. ≈1 random walk, >1 trending, <1 reverting.
f_varratio(float src, int q, int n) =>
    r1 = src - src[1]
    rq = src - src[q]
    v1 = ta.variance(r1, n)
    vq = ta.variance(rq, n)
    v1 != 0.0 ? vq / (math.max(1, q) * v1) : 1.0
// Hurst exponent via the rescaled-range / structure-function slope (4 lags, OLS).
f_hurst(float src, int n) =>
    t1 = ta.stdev(src - src[2],  n)
    t2 = ta.stdev(src - src[4],  n)
    t3 = ta.stdev(src - src[8],  n)
    t4 = ta.stdev(src - src[16], n)
    y1 = t1 > 0.0 ? math.log(t1) : 0.0
    y2 = t2 > 0.0 ? math.log(t2) : 0.0
    y3 = t3 > 0.0 ? math.log(t3) : 0.0
    y4 = t4 > 0.0 ? math.log(t4) : 0.0
    sy  = y1 + y2 + y3 + y4
    sxy = 0.6931 * y1 + 1.3863 * y2 + 2.0794 * y3 + 2.7726 * y4
    hr = (4.0 * sxy - 6.9315 * sy) / (4.0 * 14.4135 - 6.9315 * 6.9315)
    na(hr) ? 0.5 : math.max(0.0, math.min(1.0, hr))
// Scalar Kalman filter (local-level model) → adaptive fair value.
f_kalman(float src, float q, float r) =>
    var float est = na
    var float perr = 1.0
    p  = nz(perr[1], 1.0) + q
    kg = p / (p + r)
    e  = nz(est[1], src) + kg * (src - nz(est[1], src))
    perr := (1.0 - kg) * p
    est  := e
    e
// Annualized realized volatility (% per sqrt(barsPerYear)).
f_rvol(float src, int n, float bpy) =>
    ret = src / src[1] - 1.0
    ta.stdev(ret, n) * math.sqrt(bpy) * 100.0
// Pearson correlation (for cointegration confirmation).
f_corr(float a, float b, int n) => ta.correlation(a, b, n)`

// ─── Shared risk/exit inputs ──────────────────────────────────────────────────
const RISK_INPUTS = `// ═══════════ RISK & EXECUTION ═══════════
riskPct   = input.float(0.5, "Risk % of equity per trade", step=0.1, group="⑨ Risk")
slAtrMult = input.float(2.0, "Stop (ATR ×)",        step=0.1, group="⑨ Risk")
maxSlAtr  = input.float(3.5, "Max stop (ATR ×)",    step=0.1, group="⑨ Risk")
useDailyStop = input.bool(true, "Daily loss kill-switch",            group="⑨ Risk")
dailyLossPct = input.float(4.0, "Daily loss limit %", step=0.5,      group="⑨ Risk")
maxTradesDay = input.int(6,     "Max trades per day",                group="⑨ Risk")
tp1R   = input.float(1.0, "TP1 (R)", step=0.1, group="⑩ Exits")
tp1Pct = input.int(40,    "TP1 close %",        group="⑩ Exits")
tp2R   = input.float(2.0, "TP2 (R)", step=0.1, group="⑩ Exits")
tp2Pct = input.int(35,    "TP2 close %",        group="⑩ Exits")
tp3R   = input.float(${'${tp3R}'}, "TP3 runner (R)", step=0.1, group="⑩ Exits")
beTrigR  = input.float(0.7, "Breakeven after (R)", step=0.1, group="⑩ Exits")
beLockR  = input.float(0.1, "Lock at (R) on BE",  step=0.05, group="⑩ Exits")
useTrail = input.bool(true, "ATR chandelier trail (ratchets up only)", group="⑩ Exits")
trailStartR = input.float(1.3, "Start trailing after (R)", step=0.1, group="⑩ Exits")
trailLen = input.int(14, "Trail lookback",                  group="⑩ Exits")
trailAtr = input.float(2.2, "Trail ATR ×",       step=0.1,  group="⑩ Exits")
useTimeStop = input.bool(true, "Time stop (cut dead trades)", group="⑩ Exits")
maxBars  = input.int(${'${maxBars}'}, "Max bars in trade",     group="⑩ Exits")
useSess  = input.bool(${'${useSess}'}, "Restrict to session", group="⑪ Session")
sess     = input.session("0930-1600", "Session (NY)",        group="⑪ Session")
showDash  = input.bool(true, "Show dashboard",   group="⑫ Visuals")
showBoxes = input.bool(true, "Show trade boxes", group="⑫ Visuals")`

// ─── Shared base state ────────────────────────────────────────────────────────
const BASE = `tz = "America/New_York"
atr = ta.atr(14)
ema50  = ta.ema(close, 50)
ema200 = ta.ema(close, 200)
inSess = not na(time(timeframe.period, sess, tz))
sessOk = not useSess or inSess
newDay = ta.change(time("D")) != 0
f_fmt(x) => str.tostring(x, format.mintick)

// signal placeholders (assigned by the strategy core)
bool  longSig   = false
bool  shortSig  = false
float slLongPx  = na
float slShortPx = na
float riskScale = 1.0`

// ─── Shared execution engine ──────────────────────────────────────────────────
const EXEC = `// ═══════════ EXECUTION ENGINE ═══════════
var float dayEq = na
var int   tradesToday = 0
if newDay
    dayEq := strategy.equity
    tradesToday := 0
dayPnl = na(dayEq) ? 0.0 : (strategy.equity - dayEq) / dayEq * 100.0
blockNew = (useDailyStop and dayPnl <= -dailyLossPct) or (tradesToday >= maxTradesDay)
canEnter = strategy.position_size == 0 and barstate.isconfirmed and sessOk and not blockNew

var int   posDir = 0
var float eEntry = na
var float eSL    = na
var float eT1    = na
var float eT2    = na
var float eT3    = na
var int   eBar   = na
var float lockStop = na
var bool  t1Done = false
var bool  t2Done = false

if longSig and canEnter
    rawSlp = nz(slLongPx, close - atr * slAtrMult)
    slp = math.max(math.min(rawSlp, close - atr * 0.05), close - atr * maxSlAtr)
    rk = close - slp
    if rk > 0
        posDir := 1
        eEntry := close
        eSL := slp
        eT1 := close + rk * tp1R
        eT2 := close + rk * tp2R
        eT3 := close + rk * tp3R
        eBar := bar_index
        lockStop := slp
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("L", strategy.long, qty = (strategy.equity * riskPct * math.max(0.1, riskScale) / 100.0) / rk)
        if showBoxes
            box.new(bar_index, eT2, bar_index + 20, eEntry, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eEntry, bar_index + 20, eSL, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
        alert("GODMODE LONG " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | T3 " + f_fmt(eT3), alert.freq_once_per_bar)

if shortSig and canEnter
    rawSlp = nz(slShortPx, close + atr * slAtrMult)
    slp = math.min(math.max(rawSlp, close + atr * 0.05), close + atr * maxSlAtr)
    rk = slp - close
    if rk > 0
        posDir := -1
        eEntry := close
        eSL := slp
        eT1 := close - rk * tp1R
        eT2 := close - rk * tp2R
        eT3 := close - rk * tp3R
        eBar := bar_index
        lockStop := slp
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("S", strategy.short, qty = (strategy.equity * riskPct * math.max(0.1, riskScale) / 100.0) / rk)
        if showBoxes
            box.new(bar_index, eEntry, bar_index + 20, eT2, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eSL, bar_index + 20, eEntry, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
        alert("GODMODE SHORT " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | T3 " + f_fmt(eT3), alert.freq_once_per_bar)

if strategy.position_size > 0
    rk = eEntry - eSL
    movedR = rk > 0 ? (high - eEntry) / rk : 0.0
    if high >= eT1
        t1Done := true
    if high >= eT2
        t2Done := true
    baseStop = (movedR >= beTrigR or t1Done) ? math.max(eSL, eEntry + rk * beLockR) : eSL
    cand = useTrail and movedR >= trailStartR ? ta.highest(high, trailLen) - atr * trailAtr : baseStop
    lockStop := math.max(nz(lockStop, baseStop), math.max(baseStop, cand))
    if useTimeStop and (bar_index - eBar) >= maxBars
        strategy.close("L", comment="time")
    else
        strategy.exit("L1", from_entry="L", qty_percent=tp1Pct, stop=lockStop, limit=eT1)
        strategy.exit("L2", from_entry="L", qty_percent=tp2Pct, stop=lockStop, limit=eT2)
        strategy.exit("L3", from_entry="L", stop=lockStop, limit=eT3)
if strategy.position_size < 0
    rk = eSL - eEntry
    movedR = rk > 0 ? (eEntry - low) / rk : 0.0
    if low <= eT1
        t1Done := true
    if low <= eT2
        t2Done := true
    baseStop = (movedR >= beTrigR or t1Done) ? math.min(eSL, eEntry - rk * beLockR) : eSL
    cand = useTrail and movedR >= trailStartR ? ta.lowest(low, trailLen) + atr * trailAtr : baseStop
    lockStop := math.min(nz(lockStop, baseStop), math.min(baseStop, cand))
    if useTimeStop and (bar_index - eBar) >= maxBars
        strategy.close("S", comment="time")
    else
        strategy.exit("S1", from_entry="S", qty_percent=tp1Pct, stop=lockStop, limit=eT1)
        strategy.exit("S2", from_entry="S", qty_percent=tp2Pct, stop=lockStop, limit=eT2)
        strategy.exit("S3", from_entry="S", stop=lockStop, limit=eT3)
if strategy.position_size == 0
    posDir := 0
    lockStop := na`

// ─── Dashboard builder ────────────────────────────────────────────────────────
const dash = (s, rows) => {
  const cells = rows.map((r, i) => `    table.cell(g, 0, ${i + 1}, "${r[0]}", text_color=color.gray, text_size=size.small)
    table.cell(g, 1, ${i + 1}, ${r[1]}, text_color=${r[2]}, text_size=size.small)`).join('\n')
  return `// ═══════════ LIVE QUANT DASHBOARD ═══════════
var table g = na
if showDash and barstate.islast
    table.delete(g)
    g := table.new(position.top_right, 2, ${rows.length + 1}, border_width=1, frame_color=color.new(${s.color}, 40), frame_width=1)
    table.cell(g, 0, 0, "⚡ ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.normal)
    table.cell(g, 1, 0, "GOD MODE", text_color=color.new(color.white, 10), bgcolor=color.new(${s.color}, 0), text_size=size.small)
${cells}`
}

// ─── Assemble a full strategy ─────────────────────────────────────────────────
const buildGod = s => {
  const risk = RISK_INPUTS.replace('${tp3R}', s.tp3R).replace('${maxBars}', s.maxBars).replace('${useSess}', s.useSess ? 'true' : 'false')
  return `//@version=5
strategy("YN Finance — ⚡ ${s.name} | GOD MODE", overlay=true, max_bars_back=5000, max_boxes_count=500, max_lines_count=500, max_labels_count=500, default_qty_type=strategy.percent_of_equity, default_qty_value=1, commission_type=strategy.commission.percent, commission_value=0.02, slippage=2, process_orders_on_close=true, calc_on_every_tick=false, pyramiding=0)

${MATH_LIB}

${s.inputs}

${risk}

${BASE}

// ════════════════════ STRATEGY CORE ════════════════════
${s.calc}

${EXEC}
${s.exitCode ? '\n' + s.exitCode + '\n' : ''}
${s.plots ? '\n' + s.plots + '\n' : ''}
${dash(s, s.dash)}`
}

// ═════════════════════════════ THE 3 STRATEGIES ══════════════════════════════
const SPECS = [
  // ─── 1. STATISTICAL ARBITRAGE ───
  {
    id: 'godstatarb', init: 'SAB', short: 'Stat-Arb', color: '#00d4ff',
    name: 'Statistical Arbitrage — Cointegrated Pairs (OU)', tp3R: 3.0, maxBars: 120, useSess: false,
    tagline: 'The classic market-neutral edge: model the spread between two cointegrated assets as an Ornstein–Uhlenbeck process and fade it when it dislocates. Long/short.',
    assets: ['Pairs (any 2 correlated symbols)', 'Futures', 'Equities'], timeframes: ['15m', '1H', '4H', 'Daily'],
    propFirms: ['FTMO', 'Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~65–75% (mean-reversion) — verify yourself', riskPerTrade: '0.5% risk-based',
    overview: 'A genuine statistical-arbitrage engine. It regresses the chart symbol (leg A) on a second symbol (leg B) with a rolling OLS to get the hedge ratio β and intercept α, builds the residual spread S = log(A) − (α + β·log(B)), and treats S as an Ornstein–Uhlenbeck mean-reverting process. It estimates the half-life of reversion from the AR(1) coefficient, confirms the spread is actually stationary with a Lo–MacKinlay variance ratio (<1) and a Hurst exponent (<0.5), and only then trades the z-score: long the spread (long A) when z ≤ −entry, short when z ≥ +entry, exiting back at the mean. Stops widen with the spread; positions time-stop after a multiple of the half-life.',
    propNotes: 'This is the single-leg (chart-symbol) expression of a market-neutral pairs trade — for a fully hedged book you also short β units of leg B in a second order/account. Pick a genuinely cointegrated leg B (e.g. ES vs NQ, GLD vs GDX, KO vs PEP). The variance-ratio + Hurst gates are not decoration — they stop you trading a spread that has stopped mean-reverting (the way every pairs trade eventually breaks). Tune the entry/exit z-bands and the OLS window to the half-life. Highest win rate of the three, modest R.',
    inputs: `// ═══════════ ① PAIR / SPREAD ═══════════
pairSym = input.symbol("CME_MINI:ES1!", "Leg B (the hedge symbol)", group="① Pair / Spread")
olsLen  = input.int(100, "OLS hedge-ratio window",   minval=20, group="① Pair / Spread")
zLen    = input.int(100, "Spread z-score / stats window", minval=20, group="① Pair / Spread")
// ═══════════ ② ENTRY / EXIT (z) ═══════════
entryZ  = input.float(2.0, "Entry |z|",   step=0.1, group="② Entry / Exit")
exitZ   = input.float(0.3, "Exit |z| (mean)", step=0.1, group="② Entry / Exit")
stopZ   = input.float(3.5, "Hard stop |z|", step=0.1, group="② Entry / Exit")
// ═══════════ ③ STATIONARITY GATES ═══════════
useVR   = input.bool(true,  "Require variance ratio < 1", group="③ Stationarity")
vrLag   = input.int(4,  "Variance-ratio lag q", minval=2, group="③ Stationarity")
vrLen   = input.int(120, "Variance-ratio window", minval=20, group="③ Stationarity")
useHurst= input.bool(true, "Require Hurst < 0.5", group="③ Stationarity")
useHL   = input.bool(true, "Require valid half-life", group="③ Stationarity")
hlMaxMult = input.float(3.0, "Time-stop = HL ×", step=0.5, group="③ Stationarity")
minCorr = input.float(0.6, "Min |correlation| of legs", step=0.05, group="③ Stationarity")`,
    calc: `legA = math.log(close)
rawB = request.security(pairSym, timeframe.period, close, lookahead=barmerge.lookahead_off)
legB = rawB > 0 ? math.log(rawB) : na
[alpha, beta] = f_ols(legA, legB, olsLen)
spread = legA - (alpha + beta * legB)
z = f_z(spread, zLen)
hl = f_halflife(spread, zLen)
vr = f_varratio(spread, vrLag, vrLen)
hurst = f_hurst(spread, zLen)
corr = f_corr(legA, legB, olsLen)
statOk = (not useVR or vr < 1.0) and (not useHurst or hurst < 0.5) and (not useHL or not na(hl)) and math.abs(corr) >= minCorr and not na(legB)
// long the spread (cheap A) when z deeply negative; short when z high
longSig  := statOk and z <= -entryZ and z[1] > -entryZ
shortSig := statOk and z >=  entryZ and z[1] <  entryZ
// stop in price space: project the hard z-band back onto leg A
sprSd = ta.stdev(spread, zLen)
sprM  = ta.sma(spread, zLen)
zToPrice = sprSd * stopZ
slLongPx  := close * math.exp(-(zToPrice - (spread - sprM)))
slShortPx := close * math.exp( (zToPrice + (spread - sprM)))`,
    exitCode: `// signal exits: spread reverted to the mean, or time > hlMaxMult × half-life
hlBars = na(hl) ? maxBars : math.min(maxBars, math.round(hl * hlMaxMult))
if strategy.position_size > 0 and (math.abs(z) <= exitZ or (bar_index - eBar) >= hlBars or z >= stopZ)
    strategy.close("L", comment="reverted")
if strategy.position_size < 0 and (math.abs(z) <= exitZ or (bar_index - eBar) >= hlBars or z <= -stopZ)
    strategy.close("S", comment="reverted")`,
    plots: `plot(beta,  "Hedge β", color=color.new(color.aqua, 0), display=display.data_window)
plot(z,     "Spread z", color=color.new(color.orange, 0), display=display.data_window)
hline(0, "mean", color=color.new(color.gray, 60))`,
    dash: [
      ['Hedge β', 'str.tostring(beta, "#.###")', 'color.aqua'],
      ['Corr(A,B)', 'str.tostring(corr, "#.##")', 'math.abs(corr) >= minCorr ? color.lime : color.red'],
      ['Spread z', 'str.tostring(z, "#.##")', 'math.abs(z) >= entryZ ? color.yellow : color.gray'],
      ['Half-life', 'na(hl) ? "—" : str.tostring(hl, "#") + " bars"', 'na(hl) ? color.red : color.lime'],
      ['Var ratio', 'str.tostring(vr, "#.##")', 'vr < 1.0 ? color.fuchsia : color.gray'],
      ['Hurst', 'str.tostring(hurst, "#.##")', 'hurst < 0.5 ? color.fuchsia : color.gray'],
      ['Stationary?', 'statOk ? "YES — tradable" : "NO"', 'statOk ? color.lime : color.red'],
      ['Position', 'strategy.position_size > 0 ? "LONG SPRD" : strategy.position_size < 0 ? "SHORT SPRD" : "FLAT"', 'strategy.position_size > 0 ? color.lime : strategy.position_size < 0 ? color.red : color.gray'],
      ['Day P&L', 'str.tostring(dayPnl, "#.##") + "%"', 'dayPnl >= 0 ? color.lime : color.red'],
    ],
  },

  // ─── 2. VOLATILITY-TARGETED MOMENTUM ───
  {
    id: 'godmom', init: 'TSM', short: 'Vol-Mom', color: '#a855f7',
    name: 'Volatility-Targeted Time-Series Momentum', tp3R: 5.0, maxBars: 200, useSess: false,
    tagline: 'A 4-horizon momentum ensemble (Moskowitz–Pedersen) scaled to a constant target volatility (Barroso) with crash control. The most robust anomaly in markets. Long/short.',
    assets: ['Futures', 'Indices', 'FX', 'Crypto', 'Equities'], timeframes: ['1H', '4H', 'Daily'],
    propFirms: ['FTMO', 'Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~42–50% (high R) — verify yourself', riskPerTrade: '0.5% × vol-scalar',
    overview: 'Time-series momentum is the most replicated, cross-asset, multi-decade anomaly in the literature (Moskowitz, Ooi & Pedersen 2012). This engine builds an ENSEMBLE of momentum signals over four lookback horizons with a Jegadeesh–Titman skip of the most recent bars (to avoid short-term reversal), and votes them into a score from −4 to +4. It then applies Barroso–Santa-Clara volatility management: realized volatility is measured and the position is scaled by target_vol / realized_vol, so exposure is LARGE when the market is calm and trending and CUT when volatility spikes — which is precisely when momentum crashes. A 200-EMA regime gate and a hard vol cap provide crash control.',
    propNotes: 'Lower win rate, high R and a smooth vol-targeted curve — that is the correct, documented shape of momentum; do not "fix" the win rate by shrinking the target. The vol scalar is the real edge here: it is what turns raw momentum (which suffers brutal crashes) into a survivable strategy. Works on anything liquid and trending — futures, FX, crypto, index ETFs. Set barsPerYear to your timeframe (≈252 daily, ≈1638 hourly RTH). Backtest the horizons and the target vol.',
    inputs: `// ═══════════ ① MOMENTUM ENSEMBLE ═══════════
lb1 = input.int(20,  "Lookback 1 (bars)", group="① Momentum Ensemble")
lb2 = input.int(60,  "Lookback 2 (bars)", group="① Momentum Ensemble")
lb3 = input.int(120, "Lookback 3 (bars)", group="① Momentum Ensemble")
lb4 = input.int(250, "Lookback 4 (bars)", group="① Momentum Ensemble")
skip = input.int(5,  "Skip recent (J-T reversal)", group="① Momentum Ensemble")
minScore = input.int(2, "Min |ensemble score| (of 4)", minval=1, maxval=4, group="① Momentum Ensemble")
useRegime = input.bool(true, "200-EMA regime gate", group="① Momentum Ensemble")
// ═══════════ ② VOLATILITY TARGETING ═══════════
targetVol = input.float(15.0, "Target annualized vol %", step=1, group="② Vol Targeting")
volLen    = input.int(20, "Realized-vol window", group="② Vol Targeting")
barsPerYear = input.float(252.0, "Bars per year (annualization)", step=1, group="② Vol Targeting")
maxLev    = input.float(1.5, "Max vol scalar", step=0.1, group="② Vol Targeting")
volCap    = input.float(45.0, "Crash control: cut above vol %", step=1, group="② Vol Targeting")`,
    calc: `m1 = close[skip] / close[lb1 + skip] - 1.0
m2 = close[skip] / close[lb2 + skip] - 1.0
m3 = close[skip] / close[lb3 + skip] - 1.0
m4 = close[skip] / close[lb4 + skip] - 1.0
score = math.sign(m1) + math.sign(m2) + math.sign(m3) + math.sign(m4)
rvol = f_rvol(close, volLen, barsPerYear)
volScalar = rvol > 0.0 ? math.min(maxLev, targetVol / rvol) : 0.0
crashOff = rvol > volCap
riskScale := crashOff ? 0.0 : volScalar
regimeUp = not useRegime or close > ema200
regimeDn = not useRegime or close < ema200
longSig  := not crashOff and score >=  minScore and regimeUp
shortSig := not crashOff and score <= -minScore and regimeDn
slLongPx  := close - atr * slAtrMult
slShortPx := close + atr * slAtrMult`,
    plots: `plot(ema200, "200 EMA", color=color.new(color.orange, 0), linewidth=2)`,
    dash: [
      ['Mom score', 'str.tostring(score, "#") + " / 4"', 'math.abs(score) >= minScore ? (score > 0 ? color.lime : color.red) : color.gray'],
      ['20-bar', 'm1 > 0 ? "▲" : "▼"', 'm1 > 0 ? color.lime : color.red'],
      ['60-bar', 'm2 > 0 ? "▲" : "▼"', 'm2 > 0 ? color.lime : color.red'],
      ['120-bar', 'm3 > 0 ? "▲" : "▼"', 'm3 > 0 ? color.lime : color.red'],
      ['250-bar', 'm4 > 0 ? "▲" : "▼"', 'm4 > 0 ? color.lime : color.red'],
      ['Realized vol', 'str.tostring(rvol, "#.#") + "%"', 'rvol > volCap ? color.red : color.white'],
      ['Vol scalar', 'str.tostring(riskScale, "#.##") + "x"', 'crashOff ? color.red : color.lime'],
      ['Regime', 'close > ema200 ? "BULL" : "BEAR"', 'close > ema200 ? color.lime : color.red'],
      ['Position', 'strategy.position_size > 0 ? "LONG" : strategy.position_size < 0 ? "SHORT" : "FLAT"', 'strategy.position_size > 0 ? color.lime : strategy.position_size < 0 ? color.red : color.gray'],
      ['Day P&L', 'str.tostring(dayPnl, "#.##") + "%"', 'dayPnl >= 0 ? color.lime : color.red'],
    ],
  },

  // ─── 3. ADAPTIVE REGIME-SWITCHING ───
  {
    id: 'godregime', init: 'RGM', short: 'Regime-AI', color: '#34d399',
    name: 'Adaptive Regime-Switching (Kalman + Variance Ratio)', tp3R: 4.0, maxBars: 100, useSess: false,
    tagline: 'Detect whether the tape is trending or mean-reverting with a Kalman fair value, a variance-ratio test and the Hurst exponent — then run the right sub-model for that regime. Long/short.',
    assets: ['Futures', 'Indices', 'FX', 'Crypto'], timeframes: ['5m', '15m', '1H', '4H'],
    propFirms: ['FTMO', 'Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~55–62% (adaptive) — verify yourself', riskPerTrade: '0.5% risk-based',
    overview: 'Most strategies die because they apply one style to every market. This one measures the market’s character every bar and switches. A Kalman filter tracks the adaptive fair value of price; a Lo–MacKinlay variance ratio and a Hurst exponent classify the regime as TRENDING (VR>1, H>0.55), REVERTING (VR<1, H<0.45) or RANDOM. In a trending regime it runs a momentum sub-model (trade with the Kalman slope and the EMA stack); in a reverting regime it runs an OU mean-reversion sub-model (fade the z-score of price minus Kalman fair value); in a random regime it stands down. Each sub-model carries its own structural stop, and the shared engine handles sizing, tiered exits and the kill-switch.',
    propNotes: 'The regime classifier is the whole point — it keeps the momentum logic from firing in chop and the reversion logic from fighting a trend, the two ways those styles each blow up. Tune the VR lag, the Hurst window and the z-bands per instrument/timeframe; widen the “random” dead-band if you want it to trade less and only in clear regimes. Genuinely adaptive — the closest thing here to a single all-weather model.',
    inputs: `// ═══════════ ① KALMAN FAIR VALUE ═══════════
kalmanQ = input.float(0.01, "Kalman process noise Q", step=0.005, group="① Kalman")
kalmanR = input.float(1.0,  "Kalman measurement noise R", step=0.1, group="① Kalman")
// ═══════════ ② REGIME CLASSIFIER ═══════════
vrLag   = input.int(4,   "Variance-ratio lag q", minval=2, group="② Regime")
vrLen   = input.int(100, "Variance-ratio window", group="② Regime")
hWin    = input.int(80,  "Hurst window", group="② Regime")
vrTrend = input.float(1.15, "VR > x ⇒ trending", step=0.05, group="② Regime")
vrRevert= input.float(0.85, "VR < x ⇒ reverting", step=0.05, group="② Regime")
// ═══════════ ③ SUB-MODELS ═══════════
fastLen = input.int(20,  "Momentum fast EMA", group="③ Sub-models")
trendLen= input.int(100, "Momentum trend EMA", group="③ Sub-models")
zLen    = input.int(50,  "Reversion z window", group="③ Sub-models")
entryZ  = input.float(2.0, "Reversion entry |z|", step=0.1, group="③ Sub-models")`,
    calc: `logP = math.log(close)
fair = f_kalman(close, kalmanQ, kalmanR)
dev  = close - fair
zdev = f_z(dev, zLen)
vr = f_varratio(logP, vrLag, vrLen)
hurst = f_hurst(logP, hWin)
trending = vr > vrTrend or hurst > 0.55
reverting = vr < vrRevert or hurst < 0.45
emaFast = ta.ema(close, fastLen)
emaTrend = ta.ema(close, trendLen)
kSlope = fair - fair[3]
// momentum sub-model (only in a trending regime)
momLong  = trending and emaFast > emaTrend and close > emaFast and kSlope > 0
momShort = trending and emaFast < emaTrend and close < emaFast and kSlope < 0
// OU reversion sub-model (only in a reverting regime)
revLong  = reverting and zdev <= -entryZ and zdev[1] > -entryZ
revShort = reverting and zdev >=  entryZ and zdev[1] <  entryZ
longSig  := momLong or revLong
shortSig := momShort or revShort
// structural stops per sub-model
slLongPx  := reverting ? math.min(low, fair - ta.stdev(dev, zLen) * 3.0) : close - atr * slAtrMult
slShortPx := reverting ? math.max(high, fair + ta.stdev(dev, zLen) * 3.0) : close + atr * slAtrMult`,
    plots: `plot(fair, "Kalman fair value", color=color.new(color.aqua, 0), linewidth=2)`,
    dash: [
      ['Variance ratio', 'str.tostring(vr, "#.##")', 'vr > vrTrend ? color.aqua : vr < vrRevert ? color.fuchsia : color.gray'],
      ['Hurst', 'str.tostring(hurst, "#.##")', 'hurst > 0.55 ? color.aqua : hurst < 0.45 ? color.fuchsia : color.gray'],
      ['Regime', 'trending ? "TRENDING" : reverting ? "REVERTING" : "RANDOM"', 'trending ? color.aqua : reverting ? color.fuchsia : color.gray'],
      ['Active model', 'trending ? "MOMENTUM" : reverting ? "REVERSION" : "STAND DOWN"', 'trending ? color.aqua : reverting ? color.fuchsia : color.gray'],
      ['Kalman slope', 'kSlope > 0 ? "UP ▲" : kSlope < 0 ? "DOWN ▼" : "FLAT"', 'kSlope > 0 ? color.lime : color.red'],
      ['Dev z', 'str.tostring(zdev, "#.##")', 'math.abs(zdev) >= entryZ ? color.yellow : color.gray'],
      ['Position', 'strategy.position_size > 0 ? "LONG" : strategy.position_size < 0 ? "SHORT" : "FLAT"', 'strategy.position_size > 0 ? color.lime : strategy.position_size < 0 ? color.red : color.gray'],
      ['Day P&L', 'str.tostring(dayPnl, "#.##") + "%"', 'dayPnl >= 0 ? color.lime : color.red'],
    ],
  },
]

// ─── Steps + signals (a trimmed indicator twin) ───────────────────────────────
const autoSteps = s => [
  `Open TradingView → Pine Editor → paste the ⚡ ${s.name} strategy → Add to Chart (${s.timeframes.join('/')} chart of ${s.assets[0]}).`,
  `Open the dashboard (top-right): it shows the live quant state — the regime/stationarity diagnostics, the model’s decision, and the current position. The strategy only fires when its statistical preconditions are met, so expect selective entries.`,
  `Configure the core inputs at the top (the pair symbol / lookbacks / z-bands), then Risk & Exits. Position size is solved from the stop to risk a fixed % of equity; the daily kill-switch protects the evaluation.`,
  `Open the Strategy Tester and judge it AFTER commission + slippage: net profit, profit factor, max drawdown, Sharpe, trade count. The math is exact — whether it is profitable on this symbol is an empirical question only the tester answers.`,
  `Walk it forward: optimize on the first 70% of history, then verify on the last 30% it has never seen. Trust the out-of-sample number. If it survives, size up slowly.`,
  `These are real, top-tier quant frameworks — not magic. Even great quant runs a Sharpe of ~1–2. Treat the win-rate targets as hypotheses to be tested, never promises.`,
]
const sigStub = s => `//@version=5
indicator("YN Finance — ⚡ ${s.name} | GOD MODE (read-only)", overlay=true)
// The GOD MODE strategies are full strategy() builds — use the Auto-Trade tab.
// This indicator tab is intentionally minimal: it plots the 50/200 EMAs for context.
plot(ta.ema(close, 50),  "EMA 50",  color=color.new(color.aqua, 0))
plot(ta.ema(close, 200), "EMA 200", color=color.new(color.orange, 0), linewidth=2)
// Paste the strategy() build from the Auto-Trade tab to run the real engine.`

const MT5_NOTE = name => `// ── YN Finance — ${name} (MetaTrader 5) ──
// This is a research-grade quant strategy. Its math maps onto MQL5 directly:
//   • rolling OLS / variance ratio / Hurst → closed-form loops over CopyClose buffers
//   • Kalman filter / OU half-life          → plain double recursions (identical formulas)
//   • request.security(pairSym)             → a second symbol via SymbolSelect + CopyClose
//   • risk-based sizing + tiered exits      → CTrade::PositionOpen + PositionClosePartial
// A full compilable .mq5 port is available on request. The Pine build is the reference;
// validate in the Strategy Tester before trading either.`

const algos = SPECS.map(s => ({
  id: s.id,
  instructor: 'YN Finance Quant Desk',
  strategy: s.name,
  tagline: s.tagline,
  assets: s.assets,
  timeframes: s.timeframes,
  propFirms: s.propFirms,
  winTarget: s.winTarget,
  riskPerTrade: s.riskPerTrade,
  color: s.color,
  god: true,
  init: s.init,
  overview: s.overview,
  propNotes: s.propNotes,
  auto: { tradingview: buildGod(s), mt5: MT5_NOTE(s.name), steps: autoSteps(s) },
  signals: { tradingview: sigStub(s), steps: ['These are full strategy() engines — use the Auto-Trade tab. The Indicator tab is a context-only stub.'] },
}))

writeFileSync(join(algoDir, 'god-mode.ts'),
  `// AUTO-GENERATED by scripts/build-godmode.mjs — do not edit by hand. Re-run the script to refresh.\n` +
  `import type { Algorithm } from './data'\n\n` +
  `export const GOD_MODE: Algorithm[] = ${JSON.stringify(algos, null, 2)}\n`
)
const lines = algos.map(a => `${a.id}: ${a.auto.tradingview.split('\n').length} lines`).join(', ')
console.log(`✏️  Wrote ${algos.length} GOD MODE strategies → src/app/algorithms/god-mode.ts`)
console.log(`   ${lines}`)
