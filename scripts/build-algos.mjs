#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Institutional strategy generator (v19)
//
// Builds 15 full Pine v5 quant ENGINES. Every strategy shares one institutional
// engine; only its SIGNAL CORE differs. The engine combines THREE layers the way
// a real systematic desk does — order flow + technicals + math/physics:
//
//   ORDER FLOW
//     • cumulative volume delta (CVD) + linear-regression slope (intraday reset)
//     • relative-volume z-score (volume surprise)
//     • absorption detection (high volume into a small range)
//     • VWAP value area (POC / VAH / VAL)
//   TECHNICAL / REGIME
//     • ADX trend-vs-range + ATR volatility percentile
//     • HTF bias (request.security)
//   MATH / PHYSICS
//     • Kalman filter (adaptive price/trend estimate)
//     • Ehlers super-smoother → price velocity & acceleration (kinematics)
//     • linear-regression R² (trend quality) + Kaufman efficiency ratio
//     • Hurst exponent (is the tape trending or mean-reverting right now?)
//
//   All of the above are folded into a single weighted CONFLUENCE SCORE, then the
//   strategy executes with risk-based sizing, tiered TP1/TP2/TP3 exits, breakeven,
//   an ATR chandelier trail, a daily loss kill-switch + trade cap, and a live
//   on-chart dashboard. The signature long/short trade boxes are kept throughout.
//
// NB: this is an advanced *retail* framework. It uses the same classes of math a
// desk uses, but Pine cannot see true tick-level depth-of-book — validate every
// strategy in the Strategy Tester over 6–12 months before trading it live.
//
// Run:  node scripts/build-algos.mjs
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const algoDir = join(__dir, '..', 'src', 'app', 'algorithms')

const wantsTrend = s => ['trend', 'breakout', 'momentum'].includes(s.family)

// ─── Shared Pine: user-defined functions (Kalman + Ehlers super-smoother) ──────
const PINE_FUNCS = `// ── Quant primitives ──
f_kalman(src, Q, R) =>
    var float est  = na
    var float perr = 1.0
    p  = nz(perr[1], 1.0) + Q
    kg = p / (p + R)
    e  = nz(est[1], src) + kg * (src - nz(est[1], src))
    perr := (1.0 - kg) * p
    est  := e
    e
f_ss(src, len) =>
    a1 = math.exp(-1.414 * 3.14159 / len)
    b1 = 2.0 * a1 * math.cos(1.414 * 3.14159 / len)
    c2 = b1
    c3 = -a1 * a1
    c1 = 1.0 - c2 - c3
    var float ss = na
    ss := c1 * (src + nz(src[1], src)) / 2.0 + c2 * nz(ss[1], src) + c3 * nz(ss[2], src)
    ss
f_fmt(x) => str.tostring(x, format.mintick)`

// ─── Shared Pine: order-flow & quant input group ──────────────────────────────
const QUANT_INPUTS = group => `
// ═══════════ ${group} ═══════════
ofMinZ    = input.float(0.5,  "Order-flow · min relative-volume z",      step=0.1,   group="${group}")
relVolLen = input.int(20,     "Order-flow · relative-volume lookback",               group="${group}")
ofCvdLen  = input.int(14,     "Order-flow · CVD slope length",                       group="${group}")
ofR2      = input.float(0.40, "Quant · min linreg R² (trend quality)",   step=0.05,  group="${group}")
kalmanQ   = input.float(0.01, "Quant · Kalman process noise Q",          step=0.005, group="${group}")
kalmanR   = input.float(1.0,  "Quant · Kalman measurement noise R",      step=0.1,   group="${group}")
ssLen     = input.int(20,     "Quant · Ehlers super-smoother length",                group="${group}")
erLen     = input.int(20,     "Quant · Kaufman efficiency-ratio length",             group="${group}")
lrLen     = input.int(20,     "Quant · linear-regression length",                    group="${group}")
hWin      = input.int(50,     "Quant · Hurst-exponent window",                       group="${group}")`

// ─── Shared Pine: full market-state + order-flow + quant module ───────────────
const BASE_STATE = `tz = "America/New_York"

// ── Engine: technical state ──
atr = ta.atr(atrLen)
[diPlus, diMinus, adx] = ta.dmi(adxLen, adxLen)
ema9   = ta.ema(close, 9)
ema21  = ta.ema(close, 21)
ema50  = ta.ema(close, 50)
ema200 = ta.ema(close, 200)
rsi  = ta.rsi(close, 14)
rsi2 = ta.rsi(close, 2)
vwapV = ta.vwap(hlc3)
basis = ta.sma(close, 20)
bbDev = 2.0 * ta.stdev(close, 20)
bbU = basis + bbDev
bbL = basis - bbDev
[macdLine, sigLine, hist] = ta.macd(close, 12, 26, 9)
pdh = request.security(syminfo.tickerid, "D", high[1],  lookahead=barmerge.lookahead_on)
pdl = request.security(syminfo.tickerid, "D", low[1],   lookahead=barmerge.lookahead_on)
pdc = request.security(syminfo.tickerid, "D", close[1], lookahead=barmerge.lookahead_on)
volAvg   = ta.sma(volume, 20)
volRatio = volAvg > 0 ? volume / volAvg : 1.0
atrRank  = ta.percentrank(atr, volRankLen)
htfClose = request.security(syminfo.tickerid, htfTF, close,                   lookahead=barmerge.lookahead_off)
htfEma   = request.security(syminfo.tickerid, htfTF, ta.ema(close, htfEmaLen), lookahead=barmerge.lookahead_off)
htfBull  = htfClose >= htfEma
htfBear  = htfClose <= htfEma
trendUp  = ema50 > ema200 and close > ema50
trendDn  = ema50 < ema200 and close < ema50
inSess   = not na(time(timeframe.period, sess, tz))
lunch    = skipLunch and not na(time(timeframe.period, "1130-1330", tz))
sessOk   = (not useSess or inSess) and not lunch
volRegimeOk = not useRegime or (atrRank >= volMin and atrRank <= volMax)
newDay   = ta.change(time("D")) != 0

// ── Engine: ORDER-FLOW layer ──
relVolSd = ta.stdev(volume, relVolLen)
relVolZ  = relVolSd > 0 ? (volume - ta.sma(volume, relVolLen)) / relVolSd : 0.0
ofDelta  = close > open ? volume : close < open ? -volume : 0.0
var float cvd = 0.0
cvd := newDay ? ofDelta : cvd + ofDelta
cvdSlope = ta.linreg(cvd, ofCvdLen, 0) - ta.linreg(cvd, ofCvdLen, 1)
ofRange    = high - low
absorption = relVolZ >= 1.0 and ofRange <= atr * 0.6
vwapDev = ta.stdev(close - vwapV, 20)
poc = vwapV
vah = vwapV + vwapDev
val = vwapV - vwapDev

// ── Engine: MATH / PHYSICS layer ──
kf    = f_kalman(close, kalmanQ, kalmanR)
kfVel = ta.change(kf)
ssv   = f_ss(close, ssLen)
vel   = ta.change(ssv)
acc   = ta.change(vel)
velN  = atr > 0 ? vel / atr : 0.0
accN  = atr > 0 ? acc / atr : 0.0
erChg = math.sum(math.abs(ta.change(close)), erLen)
er    = erChg > 0 ? math.abs(close - close[erLen]) / erChg : 0.0
lrSlope = ta.linreg(close, lrLen, 0) - ta.linreg(close, lrLen, 1)
r2 = math.pow(ta.correlation(close, bar_index, lrLen), 2)
ht1 = ta.stdev(close - close[2],  hWin)
ht2 = ta.stdev(close - close[4],  hWin)
ht3 = ta.stdev(close - close[8],  hWin)
ht4 = ta.stdev(close - close[16], hWin)
hy1 = ht1 > 0 ? math.log(ht1) : 0.0
hy2 = ht2 > 0 ? math.log(ht2) : 0.0
hy3 = ht3 > 0 ? math.log(ht3) : 0.0
hy4 = ht4 > 0 ? math.log(ht4) : 0.0
hSy  = hy1 + hy2 + hy3 + hy4
hSxy = 0.6931 * hy1 + 1.3863 * hy2 + 2.0794 * hy3 + 2.7726 * hy4
hRaw = (4.0 * hSxy - 6.9315 * hSy) / (4.0 * 14.4135 - 6.9315 * 6.9315)
hurst = na(hRaw) ? 0.5 : math.max(0.0, math.min(1.0, hRaw))`

// ─── Shared Pine: placeholders + confluence (technicals + flow + quant) ───────
const PLACEHOLDERS = `// ── Engine: signal placeholders (assigned by the strategy core) ──
bool  rawLong   = false
bool  rawShort  = false
float slLongPx  = na
float slShortPx = na
float structLong  = 0.0
float structShort = 0.0`

const confluence = s => `// ── Confluence (0-100): technicals + ORDER FLOW + MATH/PHYSICS ──
flowBull = relVolZ >= ofMinZ and cvdSlope > 0 and not (absorption and close < open)
flowBear = relVolZ >= ofMinZ and cvdSlope < 0 and not (absorption and close > open)
quantBull = ${wantsTrend(s) ? '(hurst >= 0.5 and nz(r2, 0) >= ofR2 and velN > 0)' : '(hurst <= 0.55 and velN > 0)'}
quantBear = ${wantsTrend(s) ? '(hurst >= 0.5 and nz(r2, 0) >= ofR2 and velN < 0)' : '(hurst <= 0.55 and velN < 0)'}
maxW = wTrend + wMom + wVol + wStruct + wRegime + wSess + wFlow + wQuant
lScore = ((trendUp ? wTrend : htfBull ? wTrend * 0.5 : 0.0) + (rsi >= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structLong  * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0) + (flowBull ? wFlow : 0.0) + (quantBull ? wQuant : 0.0)) / maxW * 100
sScore = ((trendDn ? wTrend : htfBear ? wTrend * 0.5 : 0.0) + (rsi <= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structShort * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0) + (flowBear ? wFlow : 0.0) + (quantBear ? wQuant : 0.0)) / maxW * 100`

// ─── AUTO strategy template ───────────────────────────────────────────────────
const buildAuto = s => `//@version=5
strategy("YN Finance — ${s.name} | Institutional Quant Engine", overlay=true, max_bars_back=2000, max_boxes_count=500, max_lines_count=500, max_labels_count=500, default_qty_type=strategy.percent_of_equity, default_qty_value=1, commission_type=strategy.commission.percent, commission_value=0.01, slippage=2, process_orders_on_close=true, calc_on_every_tick=false, pyramiding=0)

${PINE_FUNCS}

// ═══════════ ① SIGNAL CORE ═══════════
${s.sig.inputs}

// ═══════════ ② REGIME FILTER ═══════════
useRegime   = input.bool(true, "Enable volatility-regime filter", group="② Regime")
adxLen      = input.int(14,   "ADX length",                      group="② Regime")
adxTrendMin = input.float(20, "Min ADX = trending",  step=1,     group="② Regime")
adxRangeMax = input.float(18, "Max ADX = ranging",   step=1,     group="② Regime")
atrLen      = input.int(14,   "ATR length",                      group="② Regime")
volRankLen  = input.int(100,  "Volatility percentile lookback",  group="② Regime")
volMin      = input.float(15, "Min vol percentile",  step=1,     group="② Regime")
volMax      = input.float(97, "Max vol percentile",  step=1,     group="② Regime")

// ═══════════ ③ HTF BIAS ═══════════
useHTF    = input.bool(${s.htf ? 'true' : 'false'}, "Require HTF bias alignment", group="③ HTF Bias")
htfTF     = input.timeframe("${s.htfTF || '60'}", "HTF timeframe",  group="③ HTF Bias")
htfEmaLen = input.int(50, "HTF EMA length",                         group="③ HTF Bias")

// ═══════════ ④ CONFLUENCE ENGINE ═══════════
minScore = input.float(${s.minScore || 55}, "Min confluence score (0-100)", step=1, group="④ Confluence")
wTrend   = input.float(15, "Weight · trend alignment",   step=1, group="④ Confluence")
wMom     = input.float(10, "Weight · momentum",          step=1, group="④ Confluence")
wVol     = input.float(10, "Weight · volume",            step=1, group="④ Confluence")
wStruct  = input.float(20, "Weight · structure",         step=1, group="④ Confluence")
wRegime  = input.float(10, "Weight · volatility regime", step=1, group="④ Confluence")
wSess    = input.float(5,  "Weight · session",           step=1, group="④ Confluence")
wFlow    = input.float(15, "Weight · ORDER FLOW",        step=1, group="④ Confluence")
wQuant   = input.float(15, "Weight · MATH / PHYSICS",    step=1, group="④ Confluence")
${QUANT_INPUTS('⑤ Order-Flow & Quant')}

// ═══════════ ⑥ RISK GOVERNOR ═══════════
riskPct      = input.float(0.5, "Risk % of equity per trade", step=0.1, group="⑥ Risk")
slAtrMult    = input.float(1.5, "Fallback SL (ATR ×)",        step=0.1, group="⑥ Risk")
maxSlAtr     = input.float(2.0, "Max SL distance (ATR ×) — caps wide stops", step=0.1, group="⑥ Risk")
useDailyStop = input.bool(true, "Daily loss kill-switch",               group="⑥ Risk")
dailyLossPct = input.float(3.0, "Daily loss limit %",         step=0.5, group="⑥ Risk")
maxTradesDay = input.int(3,     "Max trades per day",                   group="⑥ Risk")

// ═══════════ ⑦ TRADE MANAGEMENT (bank fast · protect · cut dead trades) ═══════════
tp1R        = input.float(0.5,  "TP1 (R) — bank fast",         step=0.1, group="⑦ Trade Mgmt")
tp1Pct      = input.int(60,     "TP1 close %",                           group="⑦ Trade Mgmt")
tp2R        = input.float(1.1,  "TP2 (R)",                     step=0.1, group="⑦ Trade Mgmt")
tp2Pct      = input.int(25,     "TP2 close %",                           group="⑦ Trade Mgmt")
tp3R        = input.float(${Math.min(s.tp3R || 2.2, 2.2)}, "TP3 runner (R)", step=0.1, group="⑦ Trade Mgmt")
beTrigR     = input.float(0.5,  "Move to breakeven after (R)",  step=0.1, group="⑦ Trade Mgmt")
beLockR     = input.float(0.15, "Lock profit at (R) on BE",     step=0.05,group="⑦ Trade Mgmt")
useTrail    = input.bool(true,  "ATR trail (ratchets up only)",           group="⑦ Trade Mgmt")
trailStartR = input.float(0.8,  "Start trailing after (R)",     step=0.1, group="⑦ Trade Mgmt")
trailLen    = input.int(10,     "Trail lookback",                         group="⑦ Trade Mgmt")
trailAtr    = input.float(1.3,  "Trail ATR ×",                  step=0.1, group="⑦ Trade Mgmt")
useTimeStop = input.bool(true,  "Cut dead trades (time stop)",            group="⑦ Trade Mgmt")
maxBars     = input.int(24,     "Max bars in trade",                      group="⑦ Trade Mgmt")

// ═══════════ ⑧ SESSIONS ═══════════
useSess   = input.bool(true, "Restrict to session",        group="⑧ Sessions")
sess      = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="⑧ Sessions")
skipLunch = input.bool(${s.skipLunch === false ? 'false' : 'true'}, "Skip lunch 11:30-13:30 ET", group="⑧ Sessions")

// ═══════════ ⑨ VISUALS ═══════════
showDash  = input.bool(true, "Show dashboard",   group="⑨ Visuals")
showBoxes = input.bool(true, "Show trade boxes", group="⑨ Visuals")

${BASE_STATE}

${PLACEHOLDERS}

// ── Strategy core (unique edge) ──
${s.sig.calc}

${confluence(s)}

// ── Risk governor: daily kill-switch + trade cap ──
var float dayEq = na
var int   tradesToday = 0
if newDay
    dayEq := strategy.equity
    tradesToday := 0
dayPnlPct = na(dayEq) ? 0.0 : (strategy.equity - dayEq) / dayEq * 100.0
blockNew = (useDailyStop and dayPnlPct <= -dailyLossPct) or (tradesToday >= maxTradesDay)

// ── Entry gate: signal + score + regime + HTF + governor ──
canEnter  = strategy.position_size == 0 and not blockNew and barstate.isconfirmed
longCond  = rawLong  and lScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBull) and canEnter
shortCond = rawShort and sScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBear) and canEnter

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

if longCond
    rawSlp = math.min(nz(slLongPx, close - atr * slAtrMult), close - atr * 0.05)
    slp = math.max(rawSlp, close - atr * maxSlAtr)
    rk  = close - slp
    if rk > 0
        posDir := 1
        eEntry := close
        eSL    := slp
        eT1    := close + rk * tp1R
        eT2    := close + rk * tp2R
        eT3    := close + rk * tp3R
        eBar   := bar_index
        lockStop := slp
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("L", strategy.long, qty = (strategy.equity * riskPct / 100) / rk)
        if showBoxes
            box.new(bar_index, eT2, bar_index + 20, eEntry, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eEntry, bar_index + 20, eSL, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
            label.new(bar_index, eT2, "LONG · ${s.short} · score " + str.tostring(lScore, "#") + "  | E " + f_fmt(eEntry) + "  SL " + f_fmt(eSL) + "  T3 " + f_fmt(eT3), style=label.style_label_down, color=color.new(color.lime, 15), textcolor=color.black, size=size.small)
        alert("${s.tag} LONG " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | T1 " + f_fmt(eT1) + " T2 " + f_fmt(eT2) + " T3 " + f_fmt(eT3) + " | score " + str.tostring(lScore, "#"), alert.freq_once_per_bar)

if shortCond
    rawSlp = math.max(nz(slShortPx, close + atr * slAtrMult), close + atr * 0.05)
    slp = math.min(rawSlp, close + atr * maxSlAtr)
    rk  = slp - close
    if rk > 0
        posDir := -1
        eEntry := close
        eSL    := slp
        eT1    := close - rk * tp1R
        eT2    := close - rk * tp2R
        eT3    := close - rk * tp3R
        eBar   := bar_index
        lockStop := slp
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("S", strategy.short, qty = (strategy.equity * riskPct / 100) / rk)
        if showBoxes
            box.new(bar_index, eEntry, bar_index + 20, eT2, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eSL, bar_index + 20, eEntry, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
            label.new(bar_index, eT2, "SHORT · ${s.short} · score " + str.tostring(sScore, "#") + "  | E " + f_fmt(eEntry) + "  SL " + f_fmt(eSL) + "  T3 " + f_fmt(eT3), style=label.style_label_up, color=color.new(color.red, 15), textcolor=color.white, size=size.small)
        alert("${s.tag} SHORT " + syminfo.ticker + " @ " + f_fmt(eEntry) + " | SL " + f_fmt(eSL) + " | T1 " + f_fmt(eT1) + " T2 " + f_fmt(eT2) + " T3 " + f_fmt(eT3) + " | score " + str.tostring(sScore, "#"), alert.freq_once_per_bar)

// ── Position management: tiered exits + breakeven + ATR chandelier trail ──
if strategy.position_size > 0
    rk = eEntry - eSL
    movedR = rk > 0 ? (high - eEntry) / rk : 0.0
    if high >= eT1
        t1Done := true
    if high >= eT2
        t2Done := true
    base = (movedR >= beTrigR or t1Done) ? math.max(eSL, eEntry + rk * beLockR) : eSL
    cand = useTrail and movedR >= trailStartR ? ta.highest(high, trailLen) - atr * trailAtr : base
    lockStop := math.max(nz(lockStop, base), math.max(base, cand))
    if useTimeStop and (bar_index - eBar) >= maxBars
        strategy.close("L", comment="time stop")
    else
        strategy.exit("L-T1", from_entry="L", qty_percent=tp1Pct, stop=lockStop, limit=eT1)
        strategy.exit("L-T2", from_entry="L", qty_percent=tp2Pct, stop=lockStop, limit=eT2)
        strategy.exit("L-T3", from_entry="L", stop=lockStop, limit=eT3)
if strategy.position_size < 0
    rk = eSL - eEntry
    movedR = rk > 0 ? (eEntry - low) / rk : 0.0
    if low <= eT1
        t1Done := true
    if low <= eT2
        t2Done := true
    base = (movedR >= beTrigR or t1Done) ? math.min(eSL, eEntry - rk * beLockR) : eSL
    cand = useTrail and movedR >= trailStartR ? ta.lowest(low, trailLen) + atr * trailAtr : base
    lockStop := math.min(nz(lockStop, base), math.min(base, cand))
    if useTimeStop and (bar_index - eBar) >= maxBars
        strategy.close("S", comment="time stop")
    else
        strategy.exit("S-T1", from_entry="S", qty_percent=tp1Pct, stop=lockStop, limit=eT1)
        strategy.exit("S-T2", from_entry="S", qty_percent=tp2Pct, stop=lockStop, limit=eT2)
        strategy.exit("S-T3", from_entry="S", stop=lockStop, limit=eT3)
if strategy.position_size == 0
    posDir := 0
    lockStop := na
${s.sig.plots ? '\n' + s.sig.plots + '\n' : ''}
// ── Live dashboard: order flow + technicals + math/physics ──
var table dash = na
if showDash and barstate.islast
    table.delete(dash)
    dash := table.new(position.top_right, 2, 16, border_width=1, frame_color=color.new(color.gray, 50), frame_width=1)
    regimeTxt = adx >= adxTrendMin ? "TRENDING" : adx <= adxRangeMax ? "RANGING" : "MIXED"
    hReg = hurst >= 0.55 ? "TREND" : hurst <= 0.45 ? "REVERT" : "RANDOM"
    cvdTxt = cvdSlope > 0 ? "BULL ▲" : cvdSlope < 0 ? "BEAR ▼" : "FLAT"
    kfTxt = kfVel > 0 ? "UP ▲" : kfVel < 0 ? "DOWN ▼" : "FLAT"
    posTxt = strategy.position_size > 0 ? "LONG" : strategy.position_size < 0 ? "SHORT" : "FLAT"
    table.cell(dash, 0, 0, "YN · ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 1, 0, "QUANT", text_color=color.new(color.white, 15), bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 0, 1, "Regime", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 1, regimeTxt, text_color = regimeTxt == "TRENDING" ? color.lime : regimeTxt == "RANGING" ? color.orange : color.gray, text_size=size.small)
    table.cell(dash, 0, 2, "Vol %ile", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 2, str.tostring(atrRank, "#"), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 3, "HTF bias", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 3, htfBull ? "BULL" : "BEAR", text_color = htfBull ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 4, "Hurst", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 4, str.tostring(hurst, "#.##") + " " + hReg, text_color = hReg == "TREND" ? color.aqua : hReg == "REVERT" ? color.fuchsia : color.gray, text_size=size.small)
    table.cell(dash, 0, 5, "LinReg R²", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 5, str.tostring(nz(r2, 0), "#.##"), text_color = nz(r2, 0) >= ofR2 ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 6, "Efficiency", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 6, str.tostring(er, "#.##"), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 7, "CVD slope", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 7, cvdTxt, text_color = cvdSlope > 0 ? color.lime : cvdSlope < 0 ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 8, "RelVol z", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 8, str.tostring(relVolZ, "#.#"), text_color = relVolZ >= ofMinZ ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 9, "Kalman vel", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 9, kfTxt, text_color = kfVel > 0 ? color.lime : kfVel < 0 ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 10, "Long score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 10, str.tostring(lScore, "#") + " / " + str.tostring(minScore, "#"), text_color = lScore >= minScore ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 11, "Short score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 11, str.tostring(sScore, "#") + " / " + str.tostring(minScore, "#"), text_color = sScore >= minScore ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 12, "Position", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 12, posTxt, text_color = posTxt == "LONG" ? color.lime : posTxt == "SHORT" ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 13, "Trades today", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 13, str.tostring(tradesToday) + " / " + str.tostring(maxTradesDay), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 14, "Day P&L", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 14, str.tostring(dayPnlPct, "#.##") + "%", text_color = dayPnlPct >= 0 ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 15, "Risk", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 15, blockNew ? "BLOCKED" : "ARMED", text_color = blockNew ? color.red : color.lime, text_size=size.small)`

// ─── SIGNALS indicator template ───────────────────────────────────────────────
const buildSignals = s => `//@version=5
indicator("YN Finance — ${s.name} | Confluence Signals", overlay=true, max_bars_back=2000, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

${PINE_FUNCS}

// ═══════════ ① SIGNAL CORE ═══════════
${s.sig.inputs}

// ═══════════ ② FILTERS & CONFLUENCE ═══════════
useRegime   = input.bool(true, "Volatility-regime filter", group="② Filters")
adxLen      = input.int(14,   "ADX length",                group="② Filters")
adxTrendMin = input.float(20, "Min ADX = trending", step=1, group="② Filters")
adxRangeMax = input.float(18, "Max ADX = ranging",  step=1, group="② Filters")
atrLen      = input.int(14,   "ATR length",                group="② Filters")
volRankLen  = input.int(100,  "Vol percentile lookback",   group="② Filters")
volMin      = input.float(15, "Min vol percentile", step=1, group="② Filters")
volMax      = input.float(97, "Max vol percentile", step=1, group="② Filters")
useHTF      = input.bool(${s.htf ? 'true' : 'false'}, "Require HTF bias", group="② Filters")
htfTF       = input.timeframe("${s.htfTF || '60'}", "HTF timeframe", group="② Filters")
htfEmaLen   = input.int(50,   "HTF EMA length",            group="② Filters")
minScore    = input.float(${s.minScore || 55}, "Min confluence score", step=1, group="② Filters")
wTrend  = input.float(15, "Weight · trend",         step=1, group="② Filters")
wMom    = input.float(10, "Weight · momentum",      step=1, group="② Filters")
wVol    = input.float(10, "Weight · volume",        step=1, group="② Filters")
wStruct = input.float(20, "Weight · structure",     step=1, group="② Filters")
wRegime = input.float(10, "Weight · regime",        step=1, group="② Filters")
wSess   = input.float(5,  "Weight · session",       step=1, group="② Filters")
wFlow   = input.float(15, "Weight · ORDER FLOW",    step=1, group="② Filters")
wQuant  = input.float(15, "Weight · MATH / PHYSICS",step=1, group="② Filters")
${QUANT_INPUTS('③ Order-Flow & Quant')}

// ═══════════ ④ RISK / TARGETS / SESSION ═══════════
slAtrMult = input.float(1.5, "Fallback SL (ATR ×)", step=0.1, group="④ Risk")
maxSlAtr  = input.float(2.0, "Max SL distance (ATR ×) — caps wide stops", step=0.1, group="④ Risk")
tgtR      = input.float(1.0, "Target (R) shown on box — bank fast", step=0.1, group="④ Risk")
useSess   = input.bool(true, "Restrict to session",  group="④ Risk")
sess      = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="④ Risk")
skipLunch = input.bool(${s.skipLunch === false ? 'false' : 'true'}, "Skip lunch 11:30-13:30 ET", group="④ Risk")
boxBars   = input.int(24, "Trade-box width (bars)", minval=4, group="④ Risk")
showDash  = input.bool(true, "Show dashboard", group="④ Risk")

${BASE_STATE}

${PLACEHOLDERS}

// ── Strategy core (unique edge) ──
${s.sig.calc}

${confluence(s)}

longSig  = rawLong  and lScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBull)
shortSig = rawShort and sScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBear)

if longSig
    rawSlp = math.min(nz(slLongPx, close - atr * slAtrMult), close - atr * 0.05)
    slp = math.max(rawSlp, close - atr * maxSlAtr)
    rk  = close - slp
    if rk > 0
        tp = close + rk * tgtR
        box.new(bar_index, tp, bar_index + boxBars, close, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
        box.new(bar_index, close, bar_index + boxBars, slp, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
        line.new(bar_index, close, bar_index + boxBars, close, color=color.white, style=line.style_dashed)
        label.new(bar_index, tp, "LONG · ${s.short} · score " + str.tostring(lScore, "#") + " | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_down, color=color.new(color.lime, 20), textcolor=color.black, size=size.small)
        alert("${s.tag} LONG " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp) + " | score " + str.tostring(lScore, "#"), alert.freq_once_per_bar)

if shortSig
    rawSlp = math.max(nz(slShortPx, close + atr * slAtrMult), close + atr * 0.05)
    slp = math.min(rawSlp, close + atr * maxSlAtr)
    rk  = slp - close
    if rk > 0
        tp = close - rk * tgtR
        box.new(bar_index, close, bar_index + boxBars, tp, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
        box.new(bar_index, slp, bar_index + boxBars, close, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
        line.new(bar_index, close, bar_index + boxBars, close, color=color.white, style=line.style_dashed)
        label.new(bar_index, tp, "SHORT · ${s.short} · score " + str.tostring(sScore, "#") + " | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_up, color=color.new(color.red, 20), textcolor=color.white, size=size.small)
        alert("${s.tag} SHORT " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp) + " | score " + str.tostring(sScore, "#"), alert.freq_once_per_bar)
${s.sig.plots ? '\n' + s.sig.plots + '\n' : ''}
plotshape(longSig,  title="Long",  style=shape.triangleup,   location=location.belowbar, color=color.lime, size=size.small)
plotshape(shortSig, title="Short", style=shape.triangledown, location=location.abovebar, color=color.red,  size=size.small)
alertcondition(longSig,  "${s.short} Long",  "${s.name} LONG")
alertcondition(shortSig, "${s.short} Short", "${s.name} SHORT")

var table dash = na
if showDash and barstate.islast
    table.delete(dash)
    dash := table.new(position.top_right, 2, 10, border_width=1, frame_color=color.new(color.gray, 50), frame_width=1)
    regimeTxt = adx >= adxTrendMin ? "TRENDING" : adx <= adxRangeMax ? "RANGING" : "MIXED"
    hReg = hurst >= 0.55 ? "TREND" : hurst <= 0.45 ? "REVERT" : "RANDOM"
    cvdTxt = cvdSlope > 0 ? "BULL ▲" : cvdSlope < 0 ? "BEAR ▼" : "FLAT"
    table.cell(dash, 0, 0, "YN · ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 1, 0, "SIGNALS", text_color=color.new(color.white, 15), bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 0, 1, "Regime", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 1, regimeTxt, text_color = regimeTxt == "TRENDING" ? color.lime : regimeTxt == "RANGING" ? color.orange : color.gray, text_size=size.small)
    table.cell(dash, 0, 2, "Hurst", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 2, str.tostring(hurst, "#.##") + " " + hReg, text_color = hReg == "TREND" ? color.aqua : hReg == "REVERT" ? color.fuchsia : color.gray, text_size=size.small)
    table.cell(dash, 0, 3, "LinReg R²", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 3, str.tostring(nz(r2, 0), "#.##"), text_color = nz(r2, 0) >= ofR2 ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 4, "CVD slope", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 4, cvdTxt, text_color = cvdSlope > 0 ? color.lime : cvdSlope < 0 ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 5, "RelVol z", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 5, str.tostring(relVolZ, "#.#"), text_color = relVolZ >= ofMinZ ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 6, "HTF bias", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 6, htfBull ? "BULL" : "BEAR", text_color = htfBull ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 7, "Vol %ile", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 7, str.tostring(atrRank, "#"), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 8, "Long score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 8, str.tostring(lScore, "#") + " / " + str.tostring(minScore, "#"), text_color = lScore >= minScore ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 9, "Short score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 9, str.tostring(sScore, "#") + " / " + str.tostring(minScore, "#"), text_color = sScore >= minScore ? color.red : color.gray, text_size=size.small)`

const MT5_NOTE = name => `// ── YN Finance — ${name} (MetaTrader 5) ──
// The TradingView Pine v5 engine in the previous tab is the REFERENCE implementation:
// order-flow layer (CVD + slope, relative-volume z, absorption, VWAP value area) +
// math/physics layer (Kalman filter, Ehlers super-smoother velocity/acceleration,
// linreg R², Kaufman efficiency ratio, Hurst exponent) + regime/HTF filters +
// multi-factor confluence score + risk-based sizing + tiered TP1/TP2/TP3 exits with
// breakeven & ATR chandelier trail + daily kill-switch.
//
// Porting to MQL5 maps onto standard primitives:
//   • ta.atr / ta.dmi / ta.ema / ta.rsi  → iATR / iADX / iMA / iRSI handles
//   • request.security("D", ...)          → CopyRates on PERIOD_D1
//   • ta.percentrank / ta.correlation     → rolling buffers + closed-form math
//   • Kalman / super-smoother / Hurst      → plain double recursions (identical formulas)
//   • CVD                                  → signed tick-volume accumulator (true OrderFlow on MT5)
//   • strategy.entry / strategy.exit      → CTrade::PositionOpen + partial CTrade::PositionClosePartial
//   • daily kill-switch                   → AccountInfoDouble(ACCOUNT_EQUITY) vs a day-open snapshot
//
// A full compilable .mq5 port is available on request. Until then, run the Pine
// strategy on TradingView and route execution to your MT5 broker via a webhook bridge.`

// ─── The 15 strategy specs (metadata + unique signal core) ────────────────────
const SPECS = [
  {
    id: 'nqstophunt', init: 'HNT', short: 'Stop-Hunt', tag: 'STOPHUNT', color: '#ffd166',
    name: 'NQ Liquidity Stop-Hunt Reversal', family: 'liquidity', htf: true, minScore: 55, tp3R: 3.2,
    sess: '0930-1600', tagline: 'Institutional liquidity-raid engine: detect the sweep of prior-day liquidity, confirm with order-flow absorption, then execute with tiered exits. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~62–68% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A full execution engine around a single high-conviction event: the raid of prior-day liquidity. The core flags a wick beyond PDH/PDL that closes back inside (a failed sweep). That raw event is then graded by the confluence engine and only trades above the score threshold. Position size is solved from the stop distance to risk a fixed % of equity; exits ladder out at TP1/TP2/TP3 with breakeven after TP1 and an ATR chandelier trail on the runner. A daily loss kill-switch and trade cap protect the evaluation.',
    propNotes: 'The sweep depth feeds the structure weight, and the order-flow layer wants CVD turning back up (absorption) on the failed raid — that combination is the A+ tell. Keep the daily kill-switch at your prop firm’s daily-loss number minus a buffer. Best at the cash open and London/NY handover.',
    sig: {
      inputs: `sweepBuf = input.float(0.10, "Stop beyond sweep wick (ATR ×)", step=0.05, group="① Signal Core")`,
      calc: `sweptLow  = low  < pdl and close > pdl and close > open
sweptHigh = high > pdh and close < pdh and close < open
rawLong  := sweptLow
rawShort := sweptHigh
slLongPx  := low  - atr * sweepBuf
slShortPx := high + atr * sweepBuf
structLong  := math.min(1.0, (pdl - low) / atr)
structShort := math.min(1.0, (high - pdh) / atr)`,
      plots: `plot(pdh, "PDH", color=color.new(color.red, 45), style=plot.style_linebr)
plot(pdl, "PDL", color=color.new(color.lime, 45), style=plot.style_linebr)`,
    },
  },
  {
    id: 'nqkz', init: 'KZ', short: 'Killzone', tag: 'KZ', color: '#facc15',
    name: 'NQ London–NY Killzone Sweep', family: 'liquidity', htf: true, minScore: 55, tp3R: 3.0,
    sess: '0700-1000', skipLunch: false, tagline: 'ICT killzone engine: NY sweeps the London range to grab liquidity, then reverses. Time-and-liquidity edge with order-flow + math confirmation. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~59–64% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'Records the London-session range, then hunts the New York AM killzone. When NY sweeps the London low and closes back above (or the high and closes back below), the raid is graded by the confluence engine and executed with the full risk/trade-management stack. This is the machinery behind the classic "Judas swing": time-of-day liquidity engineering with institutional execution layered on top.',
    propNotes: 'The London range is the liquidity pool NY hunts — one sweep per side per day. Lean on HTF bias + the order-flow/Hurst confirmation for selectivity. Strongest 09:30–10:00 ET.',
    sig: {
      inputs: `ldnSess = input.session("0200-0500", "London range (NY time)", group="① Signal Core")
nySess  = input.session("0700-1000", "NY killzone (NY time)",  group="① Signal Core")
kzBuf   = input.float(0.10, "Stop beyond wick (ATR ×)", step=0.05, group="① Signal Core")`,
      calc: `inLdn = not na(time(timeframe.period, ldnSess, tz))
inNy  = not na(time(timeframe.period, nySess,  tz))
newLdn = inLdn and not inLdn[1]
var float lH = na
var float lL = na
if newLdn
    lH := high
    lL := low
else if inLdn
    lH := math.max(lH, high)
    lL := math.min(lL, low)
rawLong  := inNy and not na(lL) and low  < lL and close > lL and close > open
rawShort := inNy and not na(lH) and high > lH and close < lH and close < open
slLongPx  := low  - atr * kzBuf
slShortPx := high + atr * kzBuf
structLong  := 0.75
structShort := 0.75`,
      plots: `plot(inNy and not na(lH) ? lH : na, "London Hi", color=color.new(color.red, 45), style=plot.style_linebr)
plot(inNy and not na(lL) ? lL : na, "London Lo", color=color.new(color.lime, 45), style=plot.style_linebr)`,
    },
  },
  {
    id: 'nqsupertrend', init: 'STA', short: 'SuperTrend', tag: 'ST', color: '#00d4ff',
    name: 'NQ SuperTrend + ADX Trend Engine', family: 'trend', htf: true, minScore: 55, tp3R: 4.0,
    sess: '0930-1600', tagline: 'SuperTrend flips graded by ADX, Hurst, linreg R² and HTF bias, executed with risk-based sizing and an ATR runner. Trend-following. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~52–56% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend engine built on the SuperTrend flip. The raw flip is graded by the quant layer — Hurst must read trending, linreg R² must confirm a clean line, and price velocity (Kalman/super-smoother) must agree — plus ADX, HTF bias and the volatility regime. The SuperTrend band is the structural stop, and the runner (TP3 at 4R) is harvested with the ATR chandelier trail.',
    propNotes: 'Trend models run a lower win rate but high R; the Hurst + R² gate cuts the worst flips and the trail pays for the chop. Raise the quant weight for fewer, cleaner trends.',
    sig: {
      inputs: `stFactor = input.float(3.0, "SuperTrend factor", step=0.1, group="① Signal Core")
stLen    = input.int(10,  "SuperTrend ATR length",     group="① Signal Core")`,
      calc: `[stLine, stDir] = ta.supertrend(stFactor, stLen)
rawLong  := stDir < 0 and stDir[1] > 0
rawShort := stDir > 0 and stDir[1] < 0
slLongPx  := stLine
slShortPx := stLine
structLong  := math.min(1.0, adx / 40.0)
structShort := math.min(1.0, adx / 40.0)`,
      plots: `plot(stLine, "SuperTrend", color = stDir < 0 ? color.new(color.lime, 0) : color.new(color.red, 0), linewidth=2)`,
    },
  },
  {
    id: 'nqturtle', init: 'TUR', short: 'Turtle', tag: 'TURTLE', color: '#f5a524',
    name: 'NQ Donchian Turtle Breakout', family: 'breakout', htf: true, minScore: 50, tp3R: 5.0,
    sess: '0930-1600', tagline: 'The Turtle system, modernized: 20-bar Donchian breakouts filtered by regime, Hurst and order flow, sized off the N-unit, runner trailed for the big move. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['15m', '1H'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~42–48% (very high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A faithful Donchian breakout wrapped in a modern risk engine. A close beyond the 20-bar channel is the raw signal; the 2×ATR "N" unit is the stop; the runner reaches for 5R with the chandelier trail. The order-flow layer wants a real relative-volume surge on the break, and the Hurst/efficiency gate keeps breakouts to genuinely trending tape. Low hit-rate by design — the asymmetry carries it.',
    propNotes: 'Do not move the runner target in; the outlier trade is the whole edge. The volume-surge + Hurst gates are what make a 45%-win system survivable on a prop clock.',
    sig: {
      inputs: `dcLen = input.int(20, "Donchian length", group="① Signal Core")
nMult = input.float(2.0, "N unit = ATR ×", step=0.1, group="① Signal Core")`,
      calc: `upper = ta.highest(high, dcLen)[1]
lower = ta.lowest(low,  dcLen)[1]
rawLong  := close > upper and close[1] <= upper
rawShort := close < lower and close[1] >= lower
slLongPx  := close - atr * nMult
slShortPx := close + atr * nMult
structLong  := math.min(1.0, (close - upper) / atr)
structShort := math.min(1.0, (lower - close) / atr)`,
      plots: `plot(upper, "Donchian Hi", color=color.new(color.lime, 55))
plot(lower, "Donchian Lo", color=color.new(color.red, 55))`,
    },
  },
  {
    id: 'nqkelt', init: 'SQZ', short: 'Squeeze', tag: 'SQZ', color: '#a855f7',
    name: 'NQ Keltner Squeeze Release', family: 'breakout', htf: true, minScore: 52, tp3R: 4.0,
    sess: '0930-1600', tagline: 'TTM-style squeeze: Bollinger compresses inside Keltner, then expands. Coil length + order-flow thrust feed the score; the pop is executed with tiered exits. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~48–53% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A volatility-expansion engine. When the Bollinger Bands sit inside the Keltner Channels the market is coiled; the release bar (BB pops back outside) is the signal, with direction from the close vs the basis. The number of bars the squeeze persisted feeds the structure weight, and the order-flow layer wants the expansion to come on a volume surge in the break direction.',
    propNotes: 'Direction must agree with the breakout candle. Longer squeezes give bigger pops — let the structure weight do the selecting; the regime filter keeps you from expanding into already-elevated volatility.',
    sig: {
      inputs: `kLen = input.int(20, "BB/KC length", group="① Signal Core")
bbM  = input.float(2.0, "Bollinger mult", step=0.1, group="① Signal Core")
kcM  = input.float(1.5, "Keltner mult",   step=0.1, group="① Signal Core")`,
      calc: `kB  = ta.sma(close, kLen)
kDv = bbM * ta.stdev(close, kLen)
kRg = kcM * ta.atr(kLen)
sqz = (kB + kDv) < (kB + kRg) and (kB - kDv) > (kB - kRg)
rel = sqz[1] and not sqz
var int sqzBars = 0
sqzBars := sqz ? sqzBars + 1 : 0
rawLong  := rel and close > kB and close > open
rawShort := rel and close < kB and close < open
slLongPx  := close - atr * 1.2
slShortPx := close + atr * 1.2
structLong  := math.min(1.0, sqzBars[1] / 10.0)
structShort := math.min(1.0, sqzBars[1] / 10.0)`,
      plots: `plot(basis, "Basis", color=color.new(color.gray, 0))
bgcolor(sqz ? color.new(color.yellow, 90) : na, title="Squeeze")`,
    },
  },
  {
    id: 'nqgapgo', init: 'GAG', short: 'Gap-Go', tag: 'GAPGO', color: '#00d4aa',
    name: 'NQ Gap-and-Go Continuation', family: 'momentum', htf: true, minScore: 52, tp3R: 3.5,
    sess: '0930-1100', skipLunch: false, tagline: 'Gap + opening-range break, graded by gap size, momentum and order flow, executed with risk-based sizing and a trailed runner. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['1m', '5m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~55–60% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-open engine. When NQ gaps from the prior close and breaks its 09:30–09:35 opening range in the gap direction, order flow is one-sided. Gap size feeds the structure weight; the OR edge is the entry and the opposite edge the stop. The CVD-slope and relative-volume layer confirm real participation, not a thin gap. The continuation leg is laddered out with the trail on the runner.',
    propNotes: 'The gap-size filter is essential — small gaps are noise. This is the opposite trade to a gap fade; pick the regime each morning. One trade per side inside the window.',
    sig: {
      inputs: `orSess = input.session("0930-0935", "Opening range (NY)", group="① Signal Core")
trSess = input.session("0935-1100", "Trade window (NY)",  group="① Signal Core")
minGap = input.float(0.15, "Min gap (% of price)", step=0.05, group="① Signal Core")`,
      calc: `inOR = not na(time(timeframe.period, orSess, tz))
inTR = not na(time(timeframe.period, trSess, tz))
newOR = inOR and not inOR[1]
var float orH = na
var float orL = na
var float gp  = na
if newOR
    orH := high
    orL := low
    gp  := (open - pdc) / pdc * 100.0
else if inOR
    orH := math.max(orH, high)
    orL := math.min(orL, low)
rawLong  := inTR and gp >=  minGap and high > orH and close > orH
rawShort := inTR and gp <= -minGap and low  < orL and close < orL
slLongPx  := orL
slShortPx := orH
structLong  := math.min(1.0, math.abs(gp) / 0.5)
structShort := math.min(1.0, math.abs(gp) / 0.5)`,
      plots: `plot(not na(orH) ? orH : na, "OR High", color=color.new(color.lime, 55), style=plot.style_linebr)
plot(not na(orL) ? orL : na, "OR Low",  color=color.new(color.red, 55), style=plot.style_linebr)`,
    },
  },
  {
    id: 'nq3bar', init: '3BR', short: '3-Bar Rev', tag: '3BAR', color: '#ff6b6b',
    name: 'NQ 3-Bar Exhaustion Reversal', family: 'meanrev', htf: false, minScore: 45, tp3R: 2.5,
    sess: '0930-1600', tagline: 'A 3-bar flush into the Bollinger band that snaps back, confirmed by delta absorption and a mean-reverting Hurst read. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~60–66% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A short-term exhaustion engine. Three consecutive bars flushing to a fresh extreme that tag the Bollinger band, followed by a close back through the prior bar, signal that the move is spent. The flush extreme is the stop; the laddered exits bank the snap-back. The quant layer requires a mean-reverting Hurst regime, and the order-flow layer looks for absorption at the extreme.',
    propNotes: 'The band touch is the filter — reversals without an overextension are noise. High hit-rate, tighter R; never widen the stop chasing a fill. Best in balanced, two-sided tape (Hurst < 0.5).',
    sig: {
      inputs: `// 3-bar exhaustion uses the engine's Bollinger band — no extra inputs`,
      calc: `flushDn = low[1]  < low[2]  and low[2]  < low[3]  and low[1]  <= bbL[1]
flushUp = high[1] > high[2] and high[2] > high[3] and high[1] >= bbU[1]
rawLong  := flushDn and close > high[1]
rawShort := flushUp and close < low[1]
slLongPx  := low[1]
slShortPx := high[1]
structLong  := 0.85
structShort := 0.85`,
      plots: `plot(bbU, "BB Up", color=color.new(color.red, 60))
plot(bbL, "BB Lo", color=color.new(color.lime, 60))`,
    },
  },
  {
    id: 'nqfib', init: 'FIB', short: 'Fib 61.8', tag: 'FIB', color: '#1e90ff',
    name: 'NQ Fibonacci Golden-Pocket Pullback', family: 'trend', htf: true, minScore: 55, tp3R: 3.5,
    sess: '0930-1600', tagline: 'Auto-mapped swing fib: buy the 61.8% golden-pocket retrace in a trend confirmed by Hurst, R² and HTF bias. Scored, sized, and trailed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~57–62% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend-continuation engine that maps the Fibonacci retracement from the latest confirmed swing. In an uptrend a pullback into the 61.8% golden pocket that closes back up triggers a long; the swing origin (100%) is the stop. The quant layer confirms the bigger move is a real trend (Hurst > 0.5, high R²) before fading the pullback. Harvested with the laddered exits and trail.',
    propNotes: 'The trend gate keeps you buying dips in uptrends, not catching knives. The golden pocket gives the best R; require the close-back confirmation so you are not catching a falling level.',
    sig: {
      inputs: `fpiv   = input.int(8, "Swing pivot strength", minval=2, group="① Signal Core")
fLevel = input.float(0.618, "Golden-pocket level", step=0.014, group="① Signal Core")`,
      calc: `ph = ta.pivothigh(high, fpiv, fpiv)
pl = ta.pivotlow(low,  fpiv, fpiv)
var float swH = na
var float swL = na
if not na(ph)
    swH := ph
if not na(pl)
    swL := pl
okF = not na(swH) and not na(swL) and swH > swL
rF  = swH - swL
lLvl = swH - rF * fLevel
sLvl = swL + rF * fLevel
rawLong  := okF and trendUp and low  <= lLvl and close > lLvl
rawShort := okF and trendDn and high >= sLvl and close < sLvl
slLongPx  := swL
slShortPx := swH
structLong  := 0.7
structShort := 0.7`,
      plots: `plot(ema50, "50 EMA", color=color.new(color.orange, 0))`,
    },
  },
  {
    id: 'nqpivot', init: 'PIV', short: 'Floor Pivot', tag: 'PIVOT', color: '#7ee787',
    name: 'NQ Floor Pivot Mean-Reversion', family: 'meanrev', htf: false, minScore: 45, tp3R: 2.0,
    sess: '0930-1600', tagline: 'Classic S1/R1 floor pivots: fade the rejection back toward the central pivot, confirmed by a ranging regime and VWAP context. High hit-rate grinder. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~66–72% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A floor-trader reversion engine. Daily pivots (PP/S1/R1) are computed from the prior session; a tag of S1 that closes back up fades long toward PP, a tag of R1 that closes back down fades short. ATR-buffered stop beyond the band; the laddered exits scale toward and beyond the central pivot. The Hurst/efficiency quant layer keeps it to genuinely rotational days — a low-variance, high-win grinder.',
    propNotes: 'Pivots work best on balanced, rotational days — the regime + Hurst filter and close-back requirement guard against trend days that walk one band. The high win rate makes a smooth equity curve, which is exactly what passes evaluations.',
    sig: {
      inputs: `pivBuf = input.float(0.5, "Stop beyond pivot (ATR ×)", step=0.05, group="① Signal Core")`,
      calc: `pp = (pdh + pdl + pdc) / 3.0
r1 = 2.0 * pp - pdl
s1 = 2.0 * pp - pdh
rawLong  := low  <= s1 and close > s1 and close > open
rawShort := high >= r1 and close < r1 and close < open
slLongPx  := s1 - atr * pivBuf
slShortPx := r1 + atr * pivBuf
structLong  := 0.6
structShort := 0.6`,
      plots: `pp_ = (pdh + pdl + pdc) / 3.0
plot(pp_, "PP", color=color.new(color.yellow, 0), style=plot.style_linebr)
plot(2.0 * pp_ - pdl, "R1", color=color.new(color.red, 40), style=plot.style_linebr)
plot(2.0 * pp_ - pdh, "S1", color=color.new(color.lime, 40), style=plot.style_linebr)`,
    },
  },
  {
    id: 'nqmomo', init: 'IGN', short: 'Ignition', tag: 'IGN', color: '#ef4444',
    name: 'NQ Momentum Ignition', family: 'momentum', htf: true, minScore: 55, tp3R: 3.5,
    sess: '0930-1600', tagline: 'Three expanding-range bars on a relative-volume surge = ignition, graded by CVD thrust and price acceleration, executed with a trailed runner. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['1m', '5m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~52–57% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-burst engine. Three consecutive same-direction bars with expanding range and above-average volume signal aggressive one-sided flow. The volume thrust feeds the structure weight; the order-flow CVD slope and the physics-layer acceleration (second derivative of the super-smoothed price) confirm the impulse is accelerating, not fading. The burst low/high is the stop; the leg is harvested with the laddered exits and trail.',
    propNotes: 'The expanding-range + volume + acceleration combo separates ignition from drift. Momentum entries are late by nature, so the risk engine and trail do the heavy lifting — honor them.',
    sig: {
      inputs: `igVol = input.float(1.2, "Min volume vs 20-avg", step=0.1, group="① Signal Core")`,
      calc: `rng = high - low
expUp = close > open and close[1] > open[1] and close[2] > open[2] and rng > rng[1] and rng[1] > rng[2]
expDn = close < open and close[1] < open[1] and close[2] < open[2] and rng > rng[1] and rng[1] > rng[2]
rawLong  := expUp and close > ema50 and volRatio >= igVol
rawShort := expDn and close < ema50 and volRatio >= igVol
slLongPx  := close - atr * 1.2
slShortPx := close + atr * 1.2
structLong  := math.min(1.0, volRatio / 2.0)
structShort := math.min(1.0, volRatio / 2.0)`,
      plots: `plot(ema50, "50 EMA", color=color.new(color.orange, 0))`,
    },
  },
  {
    id: 'nqdiv', init: 'DIV', short: 'RSI Div', tag: 'DIV', color: '#c792ea',
    name: 'NQ RSI Divergence Reversal', family: 'meanrev', htf: false, minScore: 48, tp3R: 3.0,
    sess: '0930-1600', tagline: 'Price prints a new extreme, RSI does not — momentum is fading. Pivot-confirmed divergence, double-checked against CVD divergence. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~58–63% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-divergence engine. Confirmed pivots in price are compared against RSI at those pivots: a lower price low with a higher RSI low is bullish divergence (selling exhausting). The divergent pivot is the stop; the reversion leg is laddered out. The order-flow layer adds a second opinion — the CVD slope should also be diverging from price — and the Hurst gate keeps it to mean-reverting tape.',
    propNotes: 'Divergence is an early signal — the pivot confirmation, CVD agreement and confluence score are what make it tradable. Best at session extremes and into the close.',
    sig: {
      inputs: `dpiv = input.int(5, "Pivot strength", minval=2, group="① Signal Core")`,
      calc: `plP = ta.pivotlow(low,  dpiv, dpiv)
phP = ta.pivothigh(high, dpiv, dpiv)
plR = ta.pivotlow(rsi,  dpiv, dpiv)
phR = ta.pivothigh(rsi, dpiv, dpiv)
var float lPL  = na
var float lPLr = na
var float lPH  = na
var float lPHr = na
bullD = false
bearD = false
if not na(plP)
    bullD := not na(lPL) and plP < lPL and plR > lPLr
    lPL  := plP
    lPLr := plR
if not na(phP)
    bearD := not na(lPH) and phP > lPH and phR < lPHr
    lPH  := phP
    lPHr := phR
rawLong  := bullD and close > open
rawShort := bearD and close < open
slLongPx  := math.min(low,  nz(lPL, low))
slShortPx := math.max(high, nz(lPH, high))
structLong  := 0.7
structShort := 0.7`,
      plots: ``,
    },
  },
  {
    id: 'nqzfade', init: 'ZSC', short: 'Z-Fade', tag: 'ZFADE', color: '#34d399',
    name: 'NQ Volatility Z-Score Fade', family: 'meanrev', htf: false, minScore: 42, tp3R: 1.8,
    sess: '0930-1600', tagline: 'Price stretches 2.5σ from its mean → statistical snap-back (Ornstein-Uhlenbeck style). Highest hit-rate model, gated by a mean-reverting Hurst. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~68–74% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A pure statistical reversion engine (the retail cousin of an Ornstein-Uhlenbeck mean-reversion). It computes a rolling z-score of price vs its mean; beyond ±threshold the move is overstretched and tends to revert. The magnitude of the stretch feeds the structure weight, and the Hurst gate insists the tape is actually mean-reverting (H < 0.55) before fading. ATR-buffered stop beyond the extreme; the laddered exits scale back toward the mean.',
    propNotes: 'The highest hit-rate model here, but the small R means a single fat-tail loss costs several wins — never widen the stop, and keep the Hurst/regime gate on to avoid fading a genuine trend day.',
    sig: {
      inputs: `zLen = input.int(20, "Mean / StDev lookback", group="① Signal Core")
zTh  = input.float(2.5, "Z-score threshold", step=0.1, group="① Signal Core")`,
      calc: `zB  = ta.sma(close, zLen)
zSd = ta.stdev(close, zLen)
zv  = zSd > 0 ? (close - zB) / zSd : 0.0
rawLong  := zv[1] <= -zTh and zv > zv[1] and close > open
rawShort := zv[1] >=  zTh and zv < zv[1] and close < open
slLongPx  := low  - atr * 0.4
slShortPx := high + atr * 0.4
structLong  := math.min(1.0, math.abs(zv[1]) / 4.0)
structShort := math.min(1.0, math.abs(zv[1]) / 4.0)`,
      plots: `plot(zB, "Mean", color=color.new(color.aqua, 0))`,
    },
  },
  {
    id: 'nqcvd', init: 'CVD', short: 'Delta Div', tag: 'CVD', color: '#f59e0b',
    name: 'NQ Cumulative-Delta Divergence', family: 'meanrev', htf: false, minScore: 48, tp3R: 2.8,
    sess: '0930-1600', tagline: 'New price extreme on shrinking signed-volume delta = absorption. The order-flow engine made its own signal core. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~56–61% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'An effort-vs-result engine — order flow as the primary signal. It builds a cumulative signed-volume line; when price makes a fresh extreme but delta does not, buyers/sellers are being absorbed. The price extreme is the stop; the reversion is laddered out. Here the order-flow layer that grades every other strategy IS the core, with the technical/quant layers as confirmation.',
    propNotes: 'Real CVD needs bid/ask tick data, but the signed-volume proxy captures the same absorption on liquid futures. The confluence engine pairs it with VWAP value-area and Hurst context for A+ reads.',
    sig: {
      inputs: `cpiv = input.int(5, "Pivot strength", minval=2, group="① Signal Core")`,
      calc: `dlt = close > open ? volume : close < open ? -volume : 0.0
var float cvdCore = 0.0
cvdCore := newDay ? dlt : cvdCore + dlt
plP = ta.pivotlow(low,  cpiv, cpiv)
phP = ta.pivothigh(high, cpiv, cpiv)
plC = ta.pivotlow(cvdCore,  cpiv, cpiv)
phC = ta.pivothigh(cvdCore, cpiv, cpiv)
var float lPL  = na
var float lPLc = na
var float lPH  = na
var float lPHc = na
bullD = false
bearD = false
if not na(plP)
    bullD := not na(lPL) and plP < lPL and plC > lPLc
    lPL  := plP
    lPLc := plC
if not na(phP)
    bearD := not na(lPH) and phP > lPH and phC < lPHc
    lPH  := phP
    lPHc := phC
rawLong  := bullD and close > open
rawShort := bearD and close < open
slLongPx  := math.min(low,  nz(lPL, low))
slShortPx := math.max(high, nz(lPH, high))
structLong  := 0.65
structShort := 0.65`,
      plots: ``,
    },
  },
  {
    id: 'nqcloud', init: 'CLD', short: 'EMA Cloud', tag: 'CLOUD', color: '#38bdf8',
    name: 'NQ 100/200-EMA Cloud Pullback', family: 'trend', htf: true, minScore: 55, tp3R: 3.5,
    sess: '0930-1600', tagline: 'Trade pullbacks into the 100/200-EMA cloud in the direction of a Hurst-confirmed trend, with the cloud as a structural stop. Scored and trailed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~54–59% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend-pullback engine built on a moving-average cloud. The 100/200 EMAs form a dynamic band; in an uptrend a pullback that taps the cloud and closes back up triggers a long, with the far side of the cloud as a structural, noise-absorbing stop. The quant layer confirms a trending regime (Hurst, R², velocity) so you only buy dips inside a real trend. Continuation harvested with the laddered exits and trail.',
    propNotes: 'The cloud (not a single line) gives a wider, more reliable stop and filters chop. A close through the cloud cancels the setup — the regime + Hurst filter keeps you out of balance.',
    sig: {
      inputs: `// EMA cloud uses the engine's 100/200 EMAs`,
      calc: `emaF = ta.ema(close, 100)
cHi = math.max(emaF, ema200)
cLo = math.min(emaF, ema200)
upT = emaF > ema200 and close > cHi[1]
dnT = emaF < ema200 and close < cLo[1]
rawLong  := upT and low  <= cHi and close > cHi
rawShort := dnT and high >= cLo and close < cLo
slLongPx  := cLo - atr * 1.2
slShortPx := cHi + atr * 1.2
structLong  := 0.7
structShort := 0.7`,
      plots: `emaF_ = ta.ema(close, 100)
p1 = plot(emaF_, "EMA 100", color=color.new(color.aqua, 50))
p2 = plot(ema200, "EMA 200", color=color.new(color.orange, 50))
fill(p1, p2, color = emaF_ > ema200 ? color.new(color.lime, 90) : color.new(color.red, 90))`,
    },
  },
  {
    id: 'nqbos', init: 'BOS', short: 'BOS', tag: 'BOS', color: '#fb7185',
    name: 'NQ Break-of-Structure Continuation', family: 'trend', htf: true, minScore: 55, tp3R: 4.0,
    sess: '0930-1600', tagline: 'A confirmed break of swing structure, entered on the retest, graded by order flow and a trending Hurst. Smart-money continuation. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~50–55% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A market-structure engine. It tracks confirmed swing highs/lows; a close through the latest swing high shifts structure bullish, and the entry is the first pullback that retests and holds the broken level. The origin swing is the stop; the extension is harvested with the laddered exits and trail. The order-flow layer wants CVD leading the break, and the Hurst/R² gate confirms a real trending leg, not a fakeout.',
    propNotes: 'BOS without a retest is a chase — the pullback entry is the edge. HTF bias + the order-flow lead keep continuations aligned with the bigger trend; best in trending sessions.',
    sig: {
      inputs: `bpiv = input.int(8, "Swing pivot strength", minval=2, group="① Signal Core")`,
      calc: `ph = ta.pivothigh(high, bpiv, bpiv)
pl = ta.pivotlow(low,  bpiv, bpiv)
var float swH = na
var float swL = na
if not na(ph)
    swH := ph
if not na(pl)
    swL := pl
var bool  bUp = false
var bool  bDn = false
var float bkH = na
var float bkL = na
if not na(swH) and close > swH and not bUp
    bUp := true
    bDn := false
    bkH := swH
if not na(swL) and close < swL and not bDn
    bDn := true
    bUp := false
    bkL := swL
rawLong  := bUp and not na(bkH) and low  <= bkH and close > bkH and close > open
rawShort := bDn and not na(bkL) and high >= bkL and close < bkL and close < open
if rawLong
    bUp := false
if rawShort
    bDn := false
slLongPx  := na(swL) ? low  : swL
slShortPx := na(swH) ? high : swH
structLong  := 0.6
structShort := 0.6`,
      plots: ``,
    },
  },
]

// ─── Shared note appended to every overview ───────────────────────────────────
const MODULE_NOTE = 'Every trade is graded by three stacked layers: an ORDER-FLOW layer (cumulative volume delta + slope, relative-volume z-score, absorption detection, VWAP value area), a TECHNICAL/regime layer (ADX trend-vs-range, ATR volatility percentile, HTF bias), and a MATH/PHYSICS layer (a Kalman-filtered trend, an Ehlers super-smoother giving price velocity & acceleration, linear-regression R² for trend quality, the Kaufman efficiency ratio, and a Hurst-exponent regime detector). All fold into one weighted confluence score, so the engine only fires when flow, structure and the math agree — then it sizes off the stop, ladders out at TP1/TP2/TP3 with breakeven and an ATR chandelier trail, and self-limits with a daily loss kill-switch.'

// ─── Steps ────────────────────────────────────────────────────────────────────
const autoSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} strategy → Add to Chart. Use a ${s.timeframes.join('/')} chart of ${s.assets[0]}.`,
  `The dashboard (top-right) is the cockpit: regime, volatility percentile, HTF bias, the Hurst regime (TREND/REVERT), linreg R², Kaufman efficiency, CVD slope, relative-volume z, Kalman velocity, and the live long/short confluence scores. A trade only fires when the score clears the threshold.`,
  `Tune ④ Confluence weights — push ORDER FLOW and MATH/PHYSICS up for stricter, "everything agrees" entries, or the Min Score up for fewer A+ trades. ⑤ exposes every quant length (Kalman Q/R, super-smoother, Hurst window, etc.).`,
  `Set ⑥ Risk: "Risk %" sizes every position off the stop distance automatically. Set the daily loss kill-switch to your prop firm's daily-loss limit minus a buffer, and cap max trades/day.`,
  `⑦ Trade Management ladders out at TP1/TP2/TP3 with breakeven after TP1 and an ATR chandelier trail on the runner — leave on for prop rules, or simplify to one TP while learning.`,
  `Backtest in the Strategy Tester across 6–12 months and several regimes BEFORE going live, then connect a broker / webhook. This is an advanced retail framework, not a hedge-fund colo — verify the equity curve, max drawdown and trade count fit your evaluation.`,
]
const sigSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} signals indicator → Add to Chart (${s.timeframes.join('/')} chart of ${s.assets[0]}).`,
  `The dashboard shows the full stack — regime, Hurst, linreg R², CVD slope, relative-volume z, HTF bias, vol percentile, and the live long/short confluence scores. A signal only prints when its score clears the Min Score threshold.`,
  `On a signal the box draws: dashed entry, green target (R-multiple), red stop. The label and alert carry the exact entry, SL, TP and the confluence score.`,
  `Create an alert → condition "Any alert() function call" → "Once Per Bar Close" so you only act on confirmed signals.`,
  `Raise the ORDER FLOW / MATH-PHYSICS weights or Min Score for fewer, higher-conviction setups. Backtest visually across 6–12 months before trading it live.`,
]

// ─── Assemble Algorithm[] ─────────────────────────────────────────────────────
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
  overview: s.overview + ' ' + MODULE_NOTE,
  propNotes: s.propNotes,
  auto: { tradingview: buildAuto(s), mt5: MT5_NOTE(s.name), steps: autoSteps(s) },
  signals: { tradingview: buildSignals(s), steps: sigSteps(s) },
}))

// ─── Write quant-pro.ts ───────────────────────────────────────────────────────
const proPath = join(algoDir, 'quant-pro.ts')
writeFileSync(proPath,
  `// AUTO-GENERATED by scripts/build-algos.mjs — do not edit by hand. Re-run the script to refresh.\n` +
  `import type { Algorithm } from './data'\n\n` +
  `export const QUANT_STRATEGIES: Algorithm[] = ${JSON.stringify(algos, null, 2)}\n`
)
console.log(`✏️  Wrote ${algos.length} institutional strategies → src/app/algorithms/quant-pro.ts`)

// ─── Rewire data.ts (idempotent) ──────────────────────────────────────────────
const dataPath = join(algoDir, 'data.ts')
let d = readFileSync(dataPath, 'utf8')
if (!d.includes("from './quant-pro'")) {
  d = `import { QUANT_STRATEGIES } from './quant-pro'\n` + d
}
const phrase = '// QUANT DESK — 15 MONTE-CARLO-RANKED STRATEGIES'
if (d.includes(phrase) && d.includes('id: \'nqsupertrend\'')) {
  const idx = d.indexOf(phrase)
  const blockStart = d.lastIndexOf('\n\n  //', idx)
  d = d.slice(0, blockStart) + '\n  ...QUANT_STRATEGIES,\n]\n'
  console.log('🔧 Replaced inline entries in data.ts with ...QUANT_STRATEGIES spread')
} else if (!d.includes('...QUANT_STRATEGIES')) {
  console.error('⚠️  Could not find the inline block to replace — data.ts left unchanged.')
} else {
  console.log('✓ data.ts already wired to QUANT_STRATEGIES')
}
writeFileSync(dataPath, d)
console.log('✅ Done.')
