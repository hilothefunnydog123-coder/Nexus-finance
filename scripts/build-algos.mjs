#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — strategy generator (v20 · "robust & simple")
//
// Deliberately the OPPOSITE of the previous versions. We threw out the overfit
// machinery (Kalman, Hurst, super-smoother, CVD layer, 8-factor confluence, 40
// inputs) and kept THREE strategies built on durable, well-documented edges.
// Each has ~6 inputs, one ATR stop, one target, one breakeven rule.
//
// Why: a real edge is simple and survives out-of-sample. Every extra parameter is
// another knob to curve-fit to the past. Fewer rules = less overfitting = a better
// shot at working on data it has never seen. These are not magic — they are honest,
// modest edges that must still be validated in the Strategy Tester before trading.
//
//   1. Trend Pullback        — time-series momentum (buy dips in an uptrend)
//   2. RSI-2 Mean Reversion  — Connors short-term reversion, with the HTF trend
//   3. Opening-Range Breakout— session momentum off the first 15 minutes
//
// Run:  node scripts/build-algos.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const algoDir = join(__dir, '..', 'src', 'app', 'algorithms')

// ─── Shared AUTO template (one stop, one target, one breakeven) ───────────────
const buildAuto = s => `//@version=5
strategy("YN Finance — ${s.name} | Robust Edge", overlay=true, max_boxes_count=200, max_lines_count=200, max_labels_count=200, default_qty_type=strategy.percent_of_equity, default_qty_value=1, commission_type=strategy.commission.percent, commission_value=0.01, slippage=2, process_orders_on_close=true)

// ── Signal (the edge — kept deliberately simple) ──
${s.inputs}

// ── Risk & exits (one stop, one target, one breakeven) ──
riskPct = input.float(0.5, "Risk % of equity per trade", step=0.1, group="Risk & Exits")
atrLen  = input.int(14,    "ATR length",                 group="Risk & Exits")
slMult  = input.float(1.5, "Stop (ATR ×)",     step=0.1, group="Risk & Exits")
tpR     = input.float(${s.tpR}, "Target (R)",  step=0.1, group="Risk & Exits")
useBE   = input.bool(true, "Move to breakeven at +1R",   group="Risk & Exits")

// ── Session ──
useSess = input.bool(${s.useSess ? 'true' : 'false'}, "Trade only in session", group="Session")
sess    = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="Session")

tz = "America/New_York"
atr = ta.atr(atrLen)
inSess = not na(time(timeframe.period, sess, tz))
sessOk = not useSess or inSess
bias200 = close > ta.ema(close, 200)
f_fmt(x) => str.tostring(x, format.mintick)

// ── Strategy core ──
bool longSig  = false
bool shortSig = false
${s.calc}

// ── Execution ──
var float eEntry = na
var float eSL    = na
var float eTP    = na
canEnter = strategy.position_size == 0 and barstate.isconfirmed and sessOk

if longSig and canEnter
    eSL := close - atr * slMult
    rk = close - eSL
    if rk > 0
        eEntry := close
        eTP := close + rk * tpR
        strategy.entry("L", strategy.long, qty = (strategy.equity * riskPct / 100) / rk)
        box.new(bar_index, eTP, bar_index + 20, eEntry, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
        box.new(bar_index, eEntry, bar_index + 20, eSL, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
        label.new(bar_index, eTP, "LONG ${s.short} | E " + f_fmt(eEntry) + "  TP " + f_fmt(eTP) + "  SL " + f_fmt(eSL), style=label.style_label_down, color=color.new(color.lime, 20), textcolor=color.black, size=size.small)
        alert("${s.tag} LONG " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | TP " + f_fmt(eTP), alert.freq_once_per_bar)

if shortSig and canEnter
    eSL := close + atr * slMult
    rk = eSL - close
    if rk > 0
        eEntry := close
        eTP := close - rk * tpR
        strategy.entry("S", strategy.short, qty = (strategy.equity * riskPct / 100) / rk)
        box.new(bar_index, eEntry, bar_index + 20, eTP, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
        box.new(bar_index, eSL, bar_index + 20, eEntry, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
        label.new(bar_index, eTP, "SHORT ${s.short} | E " + f_fmt(eEntry) + "  TP " + f_fmt(eTP) + "  SL " + f_fmt(eSL), style=label.style_label_up, color=color.new(color.red, 20), textcolor=color.white, size=size.small)
        alert("${s.tag} SHORT " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | TP " + f_fmt(eTP), alert.freq_once_per_bar)

if strategy.position_size > 0
    rk = eEntry - eSL
    beStop = useBE and high >= eEntry + rk ? eEntry : eSL
    strategy.exit("L-exit", from_entry="L", stop=beStop, limit=eTP)
if strategy.position_size < 0
    rk = eSL - eEntry
    beStop = useBE and low <= eEntry - rk ? eEntry : eSL
    strategy.exit("S-exit", from_entry="S", stop=beStop, limit=eTP)
${s.plots ? '\n' + s.plots + '\n' : ''}
// ── Minimal dashboard ──
var table d = na
if barstate.islast
    table.delete(d)
    d := table.new(position.top_right, 2, 3, border_width=1, frame_color=color.new(color.gray, 50), frame_width=1)
    posTxt = strategy.position_size > 0 ? "LONG" : strategy.position_size < 0 ? "SHORT" : "FLAT"
    table.cell(d, 0, 0, "YN · ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(d, 1, 0, "ROBUST", text_color=color.new(color.white, 15), bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(d, 0, 1, "200-EMA bias", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 1, bias200 ? "BULL" : "BEAR", text_color = bias200 ? color.lime : color.red, text_size=size.small)
    table.cell(d, 0, 2, "Position", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 2, posTxt, text_color = posTxt == "LONG" ? color.lime : posTxt == "SHORT" ? color.red : color.gray, text_size=size.small)`

// ─── Shared SIGNALS template ──────────────────────────────────────────────────
const buildSignals = s => `//@version=5
indicator("YN Finance — ${s.name} | Signals", overlay=true, max_boxes_count=200, max_lines_count=200, max_labels_count=200)

// ── Signal (the edge — kept deliberately simple) ──
${s.inputs}
atrLen  = input.int(14,    "ATR length",          group="Risk")
slMult  = input.float(1.5, "Stop (ATR ×)", step=0.1, group="Risk")
tpR     = input.float(${s.tpR}, "Target (R)", step=0.1, group="Risk")
useSess = input.bool(${s.useSess ? 'true' : 'false'}, "Only in session", group="Session")
sess    = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="Session")
boxBars = input.int(24, "Trade-box width (bars)", minval=4, group="Display")

tz = "America/New_York"
atr = ta.atr(atrLen)
inSess = not na(time(timeframe.period, sess, tz))
sessOk = not useSess or inSess
bias200 = close > ta.ema(close, 200)
f_fmt(x) => str.tostring(x, format.mintick)

bool longSig  = false
bool shortSig = false
${s.calc}

longOk  = longSig  and sessOk
shortOk = shortSig and sessOk

if longOk
    slp = close - atr * slMult
    tp = close + (close - slp) * tpR
    box.new(bar_index, tp, bar_index + boxBars, close, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
    box.new(bar_index, close, bar_index + boxBars, slp, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
    label.new(bar_index, tp, "LONG ${s.short} | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_down, color=color.new(color.lime, 20), textcolor=color.black, size=size.small)
    alert("${s.tag} LONG " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp), alert.freq_once_per_bar)

if shortOk
    slp = close + atr * slMult
    tp = close - (slp - close) * tpR
    box.new(bar_index, close, bar_index + boxBars, tp, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
    box.new(bar_index, slp, bar_index + boxBars, close, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
    label.new(bar_index, tp, "SHORT ${s.short} | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_up, color=color.new(color.red, 20), textcolor=color.white, size=size.small)
    alert("${s.tag} SHORT " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp), alert.freq_once_per_bar)
${s.plots ? '\n' + s.plots + '\n' : ''}
plotshape(longOk,  title="Long",  style=shape.triangleup,   location=location.belowbar, color=color.lime, size=size.small)
plotshape(shortOk, title="Short", style=shape.triangledown, location=location.abovebar, color=color.red,  size=size.small)
alertcondition(longOk,  "${s.short} Long",  "${s.name} LONG")
alertcondition(shortOk, "${s.short} Short", "${s.name} SHORT")`

const MT5_NOTE = name => `// ── YN Finance — ${name} (MetaTrader 5) ──
// This is a deliberately simple, low-parameter strategy — it ports to MQL5 cleanly:
//   • ta.ema / ta.rsi / ta.atr  → iMA / iRSI / iATR handles
//   • session check             → TimeHour/TimeMinute on the server clock
//   • risk-based sizing          → lots = (equity * risk%) / (stopPoints * tickValue)
//   • one stop + one target + breakeven → CTrade::PositionOpen + PositionModify
// A full compilable .mq5 is available on request. The Pine build in the previous tab
// is the reference. Validate in the Strategy Tester before trading either.`

// ─── The 3 strategies (durable, well-documented edges) ────────────────────────
const SPECS = [
  {
    id: 'nqtrendpb', init: 'TPB', short: 'Trend PB', tag: 'TRENDPB', color: '#00d4ff',
    name: 'Trend Pullback (Time-Series Momentum)', tpR: 2.0, useSess: true, sess: '0930-1600',
    tagline: 'The most robust anomaly in markets: trade WITH the trend. Buy pullbacks to the fast EMA while above the 200, sell the mirror below it. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices', 'Stocks'], timeframes: ['15m', '1H', '4H'],
    propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~44–48% (2:1) — verify yourself', riskPerTrade: '0.5% risk-based',
    overview: 'Time-series momentum is the single most documented, cross-asset, decades-persistent anomaly in the academic literature (Moskowitz, Ooi & Pedersen 2012). This is its simplest honest expression: the 200-EMA defines the regime, and you only take pullbacks in the direction of that trend — a dip to the fast EMA that closes back in the trend direction. One ATR stop, one 2R target, breakeven at +1R. Five inputs. Nothing to overfit.',
    propNotes: 'Lower win rate, higher R — that is normal and correct for a trend follower; do not "fix" it by moving the target in. The 200-EMA regime filter is the whole edge: it keeps you on the side the market is already trending. Works across timeframes and instruments precisely because it is simple. Backtest it; expect a modest, durable edge, not a miracle.',
    inputs: `trendLen = input.int(200, "Trend EMA (regime)", group="Signal")
pullLen  = input.int(20,  "Pullback EMA",        group="Signal")`,
    calc: `emaT = ta.ema(close, trendLen)
emaP = ta.ema(close, pullLen)
upTrend = close > emaT
slopeUp = emaT > emaT[5]
longSig  := upTrend and slopeUp and low <= emaP and close > emaP and close > open
shortSig := not upTrend and not slopeUp and high >= emaP and close < emaP and close < open`,
    plots: `plot(ta.ema(close, trendLen), "Trend EMA", color=color.new(color.orange, 0), linewidth=2)
plot(ta.ema(close, pullLen),  "Pullback EMA", color=color.new(color.aqua, 0))`,
  },
  {
    id: 'nqmeanrev', init: 'MR2', short: 'RSI-2 MR', tag: 'MEANREV', color: '#34d399',
    name: 'RSI-2 Mean Reversion (Connors)', tpR: 1.0, useSess: true, sess: '0930-1600',
    tagline: 'Buy the deep short-term dip inside an uptrend, sell the rip inside a downtrend. A genuinely persistent retail edge. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices', 'Stocks'], timeframes: ['5m', '15m', '1H', 'Daily'],
    propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~60–65% (≈1:1) — verify yourself', riskPerTrade: '0.5% risk-based',
    overview: 'Larry Connors’ RSI-2 is one of the few short-term mean-reversion edges that has held up across decades of public study. The logic: in an uptrend (price above the 200 EMA), a 2-period RSI dropping below the oversold level means price has pulled back hard inside a rising market — the highest-probability dip-buy. Shorts mirror in a downtrend. One ATR stop, a small ≈1R target (reversion is fast), breakeven at +1R. Four signal inputs.',
    propNotes: 'High win rate, small R — that is the correct shape for mean reversion; never widen the stop chasing a better fill. The 200-EMA regime gate is mandatory — fading WITHOUT the trend is how mean-reversion blows up. Highest-probability on liquid index futures and large-cap stocks. Backtest the oversold/overbought levels; expect a steady, low-variance curve, not fireworks.',
    inputs: `regimeLen = input.int(200, "Regime EMA",        group="Signal")
rsiLen    = input.int(2,   "RSI length",        group="Signal")
osLevel   = input.float(10, "Oversold (long)",  step=1, group="Signal")
obLevel   = input.float(90, "Overbought (short)", step=1, group="Signal")`,
    calc: `emaR = ta.ema(close, regimeLen)
r = ta.rsi(close, rsiLen)
longSig  := close > emaR and ta.crossunder(r, osLevel)
shortSig := close < emaR and ta.crossover(r, obLevel)`,
    plots: `plot(ta.ema(close, regimeLen), "Regime EMA", color=color.new(color.orange, 0), linewidth=2)`,
  },
  {
    id: 'nqorb', init: 'ORB', short: 'OR Break', tag: 'ORB', color: '#f59e0b',
    name: 'Opening-Range Breakout', tpR: 2.0, useSess: false, sess: '0930-1600',
    tagline: 'The first 15 minutes set the day’s range. Trade the break of it. A simple, well-known session-momentum edge. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['1m', '5m'],
    propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~40–45% (2:1) — verify yourself', riskPerTrade: '0.5% risk-based',
    overview: 'The opening-range breakout is one of the oldest, simplest intraday edges: the first 15 minutes of the cash session (09:30–09:45 ET) build a range that reflects the overnight battle; a clean break of that range in the first couple of hours tends to carry on real participation. Break of the OR high goes long, break of the low goes short, one trade per side. One ATR stop, one 2R target, breakeven at +1R. Two signal inputs (the two session windows).',
    propNotes: 'Low win rate, high R — the days it trends pay for the days it chops, so do not move the target in. Best on the index futures (NQ/ES) where the open is liquid and directional. A wide opening range = wider stop = smaller size automatically. Skip it on flat, rangebound mornings. Backtest the OR length and the trade window.',
    inputs: `orSess = input.session("0930-0945", "Opening range (NY)", group="Signal")
trSess = input.session("0945-1130", "Trade window (NY)",  group="Signal")`,
    calc: `inOR = not na(time(timeframe.period, orSess, tz))
inTR = not na(time(timeframe.period, trSess, tz))
newOR = inOR and not inOR[1]
var float orH = na
var float orL = na
var bool lDone = false
var bool sDone = false
if newOR
    orH := high
    orL := low
    lDone := false
    sDone := false
else if inOR
    orH := math.max(orH, high)
    orL := math.min(orL, low)
volOk = volume > ta.sma(volume, 20)
longSig  := inTR and not lDone and high > orH and close > orH and volOk
shortSig := inTR and not sDone and low  < orL and close < orL and volOk
if longSig
    lDone := true
if shortSig
    sDone := true`,
    plots: `plot(not na(orH) ? orH : na, "OR High", color=color.new(color.lime, 40), style=plot.style_linebr)
plot(not na(orL) ? orL : na, "OR Low",  color=color.new(color.red, 40), style=plot.style_linebr)`,
  },
]

// ─── Steps ────────────────────────────────────────────────────────────────────
const autoSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} strategy → Add to Chart. Use a ${s.timeframes.join('/')} chart of ${s.assets[0]}.`,
  `There are only a handful of inputs on purpose — a simple rule set is far less likely to be curve-fit than a 40-knob "engine". Tune the signal lengths and the ATR stop if you must, but resist adding rules.`,
  `Risk: "Risk %" sizes every trade off the stop distance automatically. One ATR stop, one ${s.tpR}R target, breakeven at +1R — that is the entire exit logic.`,
  `Open the Strategy Tester and judge it honestly: net profit AFTER commission + slippage, profit factor, max drawdown, and the trade count. A handful of cherry-picked winners is not an edge.`,
  `Walk it forward: optimize on the first 70% of the data, then check the LAST 30% (data it never saw). If it falls apart out-of-sample, it was overfit — trust the out-of-sample number, not the in-sample one.`,
  `Expect a modest, durable edge — not a miracle. If it survives realistic costs and out-of-sample testing, THEN consider it for a funded account, at small size first.`,
]
const sigSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} signals indicator → Add to Chart (${s.timeframes.join('/')} chart of ${s.assets[0]}).`,
  `On a valid signal the box draws: entry, a green ${s.tpR}R target, a red ATR stop. The label and alert carry the exact prices.`,
  `Create an alert → "Any alert() function call" → "Once Per Bar Close" so you only act on confirmed bars.`,
  `This is the manual-execution version of the strategy in the other tab. Backtest the strategy() build first to confirm the edge, then use these signals to trade it by hand.`,
]

// ─── Assemble Algorithm[] ─────────────────────────────────────────────────────
const HONEST_NOTE = ' This is a deliberately simple, low-parameter strategy on a well-documented edge — the opposite of an overfit "AI engine". It is not magic and makes no hedge-fund claims: validate it in the Strategy Tester with realistic commission + slippage and an out-of-sample/walk-forward split before risking real capital.'
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
  init: s.init,
  overview: s.overview + HONEST_NOTE,
  propNotes: s.propNotes,
  auto: { tradingview: buildAuto(s), mt5: MT5_NOTE(s.name), steps: autoSteps(s) },
  signals: { tradingview: buildSignals(s), steps: sigSteps(s) },
}))

// ─── Write quant-pro.ts ───────────────────────────────────────────────────────
writeFileSync(join(algoDir, 'quant-pro.ts'),
  `// AUTO-GENERATED by scripts/build-algos.mjs — do not edit by hand. Re-run the script to refresh.\n` +
  `import type { Algorithm } from './data'\n\n` +
  `export const QUANT_STRATEGIES: Algorithm[] = ${JSON.stringify(algos, null, 2)}\n`
)
console.log(`✏️  Wrote ${algos.length} robust strategies → src/app/algorithms/quant-pro.ts`)

// ─── Rewire data.ts (idempotent) ──────────────────────────────────────────────
const dataPath = join(algoDir, 'data.ts')
let d = readFileSync(dataPath, 'utf8')
if (!d.includes("from './quant-pro'")) d = `import { QUANT_STRATEGIES } from './quant-pro'\n` + d
const phrase = '// QUANT DESK — 15 MONTE-CARLO-RANKED STRATEGIES'
if (d.includes(phrase) && d.includes("id: 'nqsupertrend'")) {
  const idx = d.indexOf(phrase)
  const blockStart = d.lastIndexOf('\n\n  //', idx)
  d = d.slice(0, blockStart) + '\n  ...QUANT_STRATEGIES,\n]\n'
  console.log('🔧 Replaced inline entries in data.ts with ...QUANT_STRATEGIES spread')
} else if (!d.includes('...QUANT_STRATEGIES')) {
  console.error('⚠️  Could not find the inline block to replace.')
} else {
  console.log('✓ data.ts already wired to QUANT_STRATEGIES')
}
writeFileSync(dataPath, d)
console.log('✅ Done.')
