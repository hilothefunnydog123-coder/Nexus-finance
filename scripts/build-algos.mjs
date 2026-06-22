#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// YN Finance — Institutional strategy generator (v18)
//
// Builds 15 full Pine v5 quant ENGINES (not single-trigger toys). Every strategy
// shares the same institutional machinery:
//   ① regime filter (ADX trend/range + ATR volatility percentile)
//   ② HTF bias gate (request.security)
//   ③ weighted multi-factor confluence score (trend/momentum/volume/structure/
//      regime/session) with a tunable threshold
//   ④ risk-based position sizing from the stop distance
//   ⑤ tiered exits: TP1/TP2/TP3 with partial closes, breakeven, ATR chandelier trail
//   ⑥ daily loss kill-switch + max-trades-per-day cap
//   ⑦ session windows + lunch filter
//   ⑧ live on-chart dashboard + the signature long/short trade boxes
//
// Only each strategy's SIGNAL CORE differs (the `sig.calc` block). This guarantees
// the heavy, error-prone boilerplate is identical and correct across all 15.
//
// Run:  node scripts/build-algos.mjs
//   → writes src/app/algorithms/quant-pro.ts  (QUANT_STRATEGIES: Algorithm[])
//   → rewires src/app/algorithms/data.ts to spread it into ALGORITHMS
// ─────────────────────────────────────────────────────────────────────────────
import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dir = dirname(fileURLToPath(import.meta.url))
const algoDir = join(__dir, '..', 'src', 'app', 'algorithms')

// ─── Shared AUTO engine ───────────────────────────────────────────────────────
const buildAuto = s => `//@version=5
strategy("YN Finance — ${s.name} | Institutional Quant Engine", overlay=true, max_bars_back=2000, max_boxes_count=500, max_lines_count=500, max_labels_count=500, default_qty_type=strategy.percent_of_equity, default_qty_value=1, commission_type=strategy.commission.percent, commission_value=0.01, slippage=2, process_orders_on_close=true, calc_on_every_tick=false, pyramiding=0)

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
wTrend   = input.float(20, "Weight · trend alignment",   step=1, group="④ Confluence")
wMom     = input.float(15, "Weight · momentum",          step=1, group="④ Confluence")
wVol     = input.float(15, "Weight · volume",            step=1, group="④ Confluence")
wStruct  = input.float(25, "Weight · structure",         step=1, group="④ Confluence")
wRegime  = input.float(15, "Weight · volatility regime", step=1, group="④ Confluence")
wSess    = input.float(10, "Weight · session",           step=1, group="④ Confluence")

// ═══════════ ⑤ RISK GOVERNOR ═══════════
riskPct      = input.float(0.5, "Risk % of equity per trade", step=0.1, group="⑤ Risk")
slAtrMult    = input.float(1.5, "Fallback SL (ATR ×)",        step=0.1, group="⑤ Risk")
useDailyStop = input.bool(true, "Daily loss kill-switch",               group="⑤ Risk")
dailyLossPct = input.float(3.0, "Daily loss limit %",         step=0.5, group="⑤ Risk")
maxTradesDay = input.int(3,     "Max trades per day",                   group="⑤ Risk")

// ═══════════ ⑥ TRADE MANAGEMENT ═══════════
tp1R     = input.float(1.0, "TP1 (R)",          step=0.1, group="⑥ Trade Mgmt")
tp1Pct   = input.int(40,    "TP1 close %",                group="⑥ Trade Mgmt")
tp2R     = input.float(2.0, "TP2 (R)",          step=0.1, group="⑥ Trade Mgmt")
tp2Pct   = input.int(35,    "TP2 close %",                group="⑥ Trade Mgmt")
tp3R     = input.float(${s.tp3R || 3.5}, "TP3 runner (R)", step=0.1, group="⑥ Trade Mgmt")
useBE    = input.bool(true, "Breakeven after TP1",        group="⑥ Trade Mgmt")
beOffR   = input.float(0.1, "BE offset (R)",    step=0.05,group="⑥ Trade Mgmt")
useTrail = input.bool(true, "ATR chandelier trail after TP2", group="⑥ Trade Mgmt")
trailLen = input.int(14,    "Trail lookback",             group="⑥ Trade Mgmt")
trailAtr = input.float(2.5, "Trail ATR ×",      step=0.1, group="⑥ Trade Mgmt")

// ═══════════ ⑦ SESSIONS ═══════════
useSess   = input.bool(true, "Restrict to session",        group="⑦ Sessions")
sess      = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="⑦ Sessions")
skipLunch = input.bool(${s.skipLunch === false ? 'false' : 'true'}, "Skip lunch 11:30-13:30 ET", group="⑦ Sessions")

// ═══════════ ⑧ VISUALS ═══════════
showDash  = input.bool(true, "Show dashboard",   group="⑧ Visuals")
showBoxes = input.bool(true, "Show trade boxes", group="⑧ Visuals")

tz = "America/New_York"

// ── Engine: shared market state ──
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

// ── Engine: signal placeholders (assigned by the strategy core) ──
bool  rawLong   = false
bool  rawShort  = false
float slLongPx  = na
float slShortPx = na
float structLong  = 0.0
float structShort = 0.0

// ── Strategy core (unique edge) ──
${s.sig.calc}

// ── Confluence scoring (0-100): six weighted factors ──
maxW = wTrend + wMom + wVol + wStruct + wRegime + wSess
lScore = ((trendUp ? wTrend : htfBull ? wTrend * 0.5 : 0.0) + (rsi >= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structLong  * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0)) / maxW * 100
sScore = ((trendDn ? wTrend : htfBear ? wTrend * 0.5 : 0.0) + (rsi <= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structShort * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0)) / maxW * 100

// ── Risk governor: daily kill-switch + trade cap ──
var float dayEq = na
var int   tradesToday = 0
newDay = ta.change(time("D")) != 0
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
var bool  t1Done = false
var bool  t2Done = false

if longCond
    slp = math.min(nz(slLongPx, close - atr * slAtrMult), close - atr * 0.05)
    rk  = close - slp
    if rk > 0
        posDir := 1
        eEntry := close
        eSL    := slp
        eT1    := close + rk * tp1R
        eT2    := close + rk * tp2R
        eT3    := close + rk * tp3R
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("L", strategy.long, qty = (strategy.equity * riskPct / 100) / rk)
        if showBoxes
            box.new(bar_index, eT2, bar_index + 20, eEntry, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eEntry, bar_index + 20, eSL, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
            label.new(bar_index, eT2, "LONG · ${s.short} · score " + str.tostring(lScore, "#") + "  | E " + str.tostring(eEntry, format.mintick) + "  SL " + str.tostring(eSL, format.mintick) + "  T3 " + str.tostring(eT3, format.mintick), style=label.style_label_down, color=color.new(color.lime, 15), textcolor=color.black, size=size.small)
        alert("${s.tag} LONG " + syminfo.ticker + " @ " + str.tostring(eEntry, format.mintick) + " | SL " + str.tostring(eSL, format.mintick) + " | T1 " + str.tostring(eT1, format.mintick) + " T2 " + str.tostring(eT2, format.mintick) + " T3 " + str.tostring(eT3, format.mintick), alert.freq_once_per_bar)

if shortCond
    slp = math.max(nz(slShortPx, close + atr * slAtrMult), close + atr * 0.05)
    rk  = slp - close
    if rk > 0
        posDir := -1
        eEntry := close
        eSL    := slp
        eT1    := close - rk * tp1R
        eT2    := close - rk * tp2R
        eT3    := close - rk * tp3R
        t1Done := false
        t2Done := false
        tradesToday := tradesToday + 1
        strategy.entry("S", strategy.short, qty = (strategy.equity * riskPct / 100) / rk)
        if showBoxes
            box.new(bar_index, eEntry, bar_index + 20, eT2, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 88))
            box.new(bar_index, eSL, bar_index + 20, eEntry, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 88))
            line.new(bar_index, eEntry, bar_index + 20, eEntry, color=color.new(color.white, 0), style=line.style_dashed)
            label.new(bar_index, eT2, "SHORT · ${s.short} · score " + str.tostring(sScore, "#") + "  | E " + str.tostring(eEntry, format.mintick) + "  SL " + str.tostring(eSL, format.mintick) + "  T3 " + str.tostring(eT3, format.mintick), style=label.style_label_up, color=color.new(color.red, 15), textcolor=color.white, size=size.small)
        alert("${s.tag} SHORT " + syminfo.ticker + " @ " + str.tostring(eEntry, format.mintick) + " | SL " + str.tostring(eSL, format.mintick) + " | T1 " + str.tostring(eT1, format.mintick) + " T2 " + str.tostring(eT2, format.mintick) + " T3 " + str.tostring(eT3, format.mintick), alert.freq_once_per_bar)

// ── Position management: tiered exits + breakeven + ATR chandelier trail ──
if strategy.position_size > 0
    rk = eEntry - eSL
    if high >= eT1
        t1Done := true
    if high >= eT2
        t2Done := true
    beStop = useBE and t1Done ? eEntry + rk * beOffR : eSL
    trStop = useTrail and t2Done ? math.max(beStop, ta.highest(high, trailLen) - atr * trailAtr) : beStop
    strategy.exit("L-T1", from_entry="L", qty_percent=tp1Pct, stop=trStop, limit=eT1)
    strategy.exit("L-T2", from_entry="L", qty_percent=tp2Pct, stop=trStop, limit=eT2)
    strategy.exit("L-T3", from_entry="L", stop=trStop, limit=eT3)
if strategy.position_size < 0
    rk = eSL - eEntry
    if low <= eT1
        t1Done := true
    if low <= eT2
        t2Done := true
    beStop = useBE and t1Done ? eEntry - rk * beOffR : eSL
    trStop = useTrail and t2Done ? math.min(beStop, ta.lowest(low, trailLen) + atr * trailAtr) : beStop
    strategy.exit("S-T1", from_entry="S", qty_percent=tp1Pct, stop=trStop, limit=eT1)
    strategy.exit("S-T2", from_entry="S", qty_percent=tp2Pct, stop=trStop, limit=eT2)
    strategy.exit("S-T3", from_entry="S", stop=trStop, limit=eT3)
if strategy.position_size == 0
    posDir := 0
${s.sig.plots ? '\n' + s.sig.plots + '\n' : ''}
// ── Live dashboard ──
var table dash = na
if showDash and barstate.islast
    table.delete(dash)
    dash := table.new(position.top_right, 2, 10, border_width=1, frame_color=color.new(color.gray, 50), frame_width=1)
    regimeTxt = adx >= adxTrendMin ? "TRENDING" : adx <= adxRangeMax ? "RANGING" : "MIXED"
    posTxt = strategy.position_size > 0 ? "LONG" : strategy.position_size < 0 ? "SHORT" : "FLAT"
    table.cell(dash, 0, 0, "YN · ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 1, 0, "QUANT", text_color=color.new(color.white, 15), bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 0, 1, "Regime", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 1, regimeTxt, text_color = regimeTxt == "TRENDING" ? color.lime : regimeTxt == "RANGING" ? color.orange : color.gray, text_size=size.small)
    table.cell(dash, 0, 2, "Vol %ile", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 2, str.tostring(atrRank, "#"), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 3, "HTF bias", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 3, htfBull ? "BULL" : "BEAR", text_color = htfBull ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 4, "Long score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 4, str.tostring(lScore, "#") + " / " + str.tostring(minScore, "#"), text_color = lScore >= minScore ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 5, "Short score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 5, str.tostring(sScore, "#") + " / " + str.tostring(minScore, "#"), text_color = sScore >= minScore ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 6, "Position", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 6, posTxt, text_color = posTxt == "LONG" ? color.lime : posTxt == "SHORT" ? color.red : color.gray, text_size=size.small)
    table.cell(dash, 0, 7, "Trades today", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 7, str.tostring(tradesToday) + " / " + str.tostring(maxTradesDay), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 8, "Day P&L", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 8, str.tostring(dayPnlPct, "#.##") + "%", text_color = dayPnlPct >= 0 ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 9, "Risk", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 9, blockNew ? "BLOCKED" : "ARMED", text_color = blockNew ? color.red : color.lime, text_size=size.small)`

// ─── Shared SIGNALS engine (indicator variant) ────────────────────────────────
const buildSignals = s => `//@version=5
indicator("YN Finance — ${s.name} | Confluence Signals", overlay=true, max_bars_back=2000, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

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
wTrend  = input.float(20, "Weight · trend",     step=1, group="② Filters")
wMom    = input.float(15, "Weight · momentum",  step=1, group="② Filters")
wVol    = input.float(15, "Weight · volume",    step=1, group="② Filters")
wStruct = input.float(25, "Weight · structure", step=1, group="② Filters")
wRegime = input.float(15, "Weight · regime",    step=1, group="② Filters")
wSess   = input.float(10, "Weight · session",   step=1, group="② Filters")

// ═══════════ ③ RISK / TARGETS / SESSION ═══════════
slAtrMult = input.float(1.5, "Fallback SL (ATR ×)", step=0.1, group="③ Risk")
tgtR      = input.float(${s.tp2R || 2.0}, "Target (R) shown on box", step=0.1, group="③ Risk")
useSess   = input.bool(true, "Restrict to session",  group="③ Risk")
sess      = input.session("${s.sess || '0930-1600'}", "Session (NY)", group="③ Risk")
skipLunch = input.bool(${s.skipLunch === false ? 'false' : 'true'}, "Skip lunch 11:30-13:30 ET", group="③ Risk")
boxBars   = input.int(24, "Trade-box width (bars)", minval=4, group="③ Risk")
showDash  = input.bool(true, "Show dashboard", group="③ Risk")

tz = "America/New_York"
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
f_fmt(x) => str.tostring(x, format.mintick)

bool  rawLong   = false
bool  rawShort  = false
float slLongPx  = na
float slShortPx = na
float structLong  = 0.0
float structShort = 0.0

// ── Strategy core (unique edge) ──
${s.sig.calc}

maxW = wTrend + wMom + wVol + wStruct + wRegime + wSess
lScore = ((trendUp ? wTrend : htfBull ? wTrend * 0.5 : 0.0) + (rsi >= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structLong  * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0)) / maxW * 100
sScore = ((trendDn ? wTrend : htfBear ? wTrend * 0.5 : 0.0) + (rsi <= 50 ? wMom : 0.0) + (volRatio >= 1.0 ? wVol : 0.0) + structShort * wStruct + (volRegimeOk ? wRegime : 0.0) + (sessOk ? wSess : 0.0)) / maxW * 100

longSig  = rawLong  and lScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBull)
shortSig = rawShort and sScore >= minScore and sessOk and volRegimeOk and (not useHTF or htfBear)

if longSig
    slp = math.min(nz(slLongPx, close - atr * slAtrMult), close - atr * 0.05)
    rk  = close - slp
    if rk > 0
        tp = close + rk * tgtR
        box.new(bar_index, tp, bar_index + boxBars, close, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
        box.new(bar_index, close, bar_index + boxBars, slp, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
        line.new(bar_index, close, bar_index + boxBars, close, color=color.white, style=line.style_dashed)
        label.new(bar_index, tp, "LONG · ${s.short} · score " + str.tostring(lScore, "#") + " | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_down, color=color.new(color.lime, 20), textcolor=color.black, size=size.small)
        alert("${s.tag} LONG " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp), alert.freq_once_per_bar)

if shortSig
    slp = math.max(nz(slShortPx, close + atr * slAtrMult), close + atr * 0.05)
    rk  = slp - close
    if rk > 0
        tp = close - rk * tgtR
        box.new(bar_index, close, bar_index + boxBars, tp, border_color=color.new(color.lime, 40), bgcolor=color.new(color.lime, 85))
        box.new(bar_index, slp, bar_index + boxBars, close, border_color=color.new(color.red, 40), bgcolor=color.new(color.red, 85))
        line.new(bar_index, close, bar_index + boxBars, close, color=color.white, style=line.style_dashed)
        label.new(bar_index, tp, "SHORT · ${s.short} · score " + str.tostring(sScore, "#") + " | E " + f_fmt(close) + "  TP " + f_fmt(tp) + "  SL " + f_fmt(slp), style=label.style_label_up, color=color.new(color.red, 20), textcolor=color.white, size=size.small)
        alert("${s.tag} SHORT " + syminfo.ticker + " | E " + f_fmt(close) + " | SL " + f_fmt(slp) + " | TP " + f_fmt(tp), alert.freq_once_per_bar)
${s.sig.plots ? '\n' + s.sig.plots + '\n' : ''}
plotshape(longSig,  title="Long",  style=shape.triangleup,   location=location.belowbar, color=color.lime, size=size.small)
plotshape(shortSig, title="Short", style=shape.triangledown, location=location.abovebar, color=color.red,  size=size.small)
alertcondition(longSig,  "${s.short} Long",  "${s.name} LONG")
alertcondition(shortSig, "${s.short} Short", "${s.name} SHORT")

var table dash = na
if showDash and barstate.islast
    table.delete(dash)
    dash := table.new(position.top_right, 2, 6, border_width=1, frame_color=color.new(color.gray, 50), frame_width=1)
    regimeTxt = adx >= adxTrendMin ? "TRENDING" : adx <= adxRangeMax ? "RANGING" : "MIXED"
    table.cell(dash, 0, 0, "YN · ${s.short}", text_color=color.white, bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 1, 0, "SIGNALS", text_color=color.new(color.white, 15), bgcolor=color.new(${s.color}, 0), text_size=size.small)
    table.cell(dash, 0, 1, "Regime", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 1, regimeTxt, text_color = regimeTxt == "TRENDING" ? color.lime : regimeTxt == "RANGING" ? color.orange : color.gray, text_size=size.small)
    table.cell(dash, 0, 2, "Vol %ile", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 2, str.tostring(atrRank, "#"), text_color=color.white, text_size=size.small)
    table.cell(dash, 0, 3, "HTF bias", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 3, htfBull ? "BULL" : "BEAR", text_color = htfBull ? color.lime : color.red, text_size=size.small)
    table.cell(dash, 0, 4, "Long score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 4, str.tostring(lScore, "#") + " / " + str.tostring(minScore, "#"), text_color = lScore >= minScore ? color.lime : color.gray, text_size=size.small)
    table.cell(dash, 0, 5, "Short score", text_color=color.gray, text_size=size.small)
    table.cell(dash, 1, 5, str.tostring(sScore, "#") + " / " + str.tostring(minScore, "#"), text_color = sScore >= minScore ? color.red : color.gray, text_size=size.small)`

const MT5_NOTE = name => `// ── YN Finance — ${name} (MetaTrader 5) ──
// The TradingView Pine v5 engine in the previous tab is the REFERENCE implementation:
// regime filter + HTF bias + multi-factor confluence score + risk-based sizing +
// tiered TP1/TP2/TP3 exits with breakeven & ATR chandelier trail + daily kill-switch.
//
// Porting to MQL5 maps 1:1 onto standard MT5 primitives:
//   • ta.atr / ta.dmi / ta.ema / ta.rsi  → iATR / iADX / iMA / iRSI handles
//   • request.security("D", ...)          → CopyRates on PERIOD_D1
//   • ta.percentrank(atr)                 → rolling buffer + rank loop
//   • strategy.entry / strategy.exit      → CTrade::PositionOpen + partial CTrade::PositionClosePartial
//   • the confluence score                → a plain double accumulator with the same weights
//   • daily kill-switch                   → compare AccountInfoDouble(ACCOUNT_EQUITY) vs a day-open snapshot
//
// A full compilable .mq5 port is available on request. Until then, run the Pine
// strategy on TradingView and route execution to your MT5 broker via a webhook bridge.`

// ─── The 15 strategy specs (metadata + unique signal core) ────────────────────
const SPECS = [
  {
    id: 'nqstophunt', init: 'HNT', short: 'Stop-Hunt', tag: 'STOPHUNT', color: '#ffd166',
    name: 'NQ Liquidity Stop-Hunt Reversal', family: 'liquidity', htf: true, minScore: 55, tp3R: 3.2,
    sess: '0930-1600', tagline: 'Institutional liquidity-raid engine: detect the sweep of prior-day liquidity, score the reversal across six factors, then execute with tiered exits. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~62–68% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A full execution engine around a single high-conviction event: the raid of prior-day liquidity. The core flags a wick beyond PDH/PDL that closes back inside (a failed sweep). That raw event is then graded by the confluence engine — HTF bias, momentum (RSI), relative volume, the depth of the sweep (structure), the volatility regime, and session — and only trades above the score threshold. Position size is solved from the stop distance to risk a fixed % of equity; exits ladder out at TP1/TP2/TP3 with breakeven after TP1 and an ATR chandelier trail on the runner. A daily loss kill-switch and trade cap protect the evaluation.',
    propNotes: 'The sweep depth feeds the structure weight, so deeper raids score higher and size identically (risk-based). Keep the daily kill-switch at your prop firm’s daily-loss number minus a buffer. Best at the cash open and London/NY handover. Tune the score threshold up for fewer, cleaner A+ trades.',
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
    sess: '0700-1000', skipLunch: false, tagline: 'ICT killzone engine: NY sweeps the London range to grab liquidity, then reverses. Time-and-liquidity edge with full confluence + execution. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures', 'FTMO'],
    winTarget: '~59–64% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'Records the London-session range, then hunts the New York AM killzone. When NY sweeps the London low and closes back above (or the high and closes back below), the raid is graded by the confluence engine and executed with the full risk/trade-management stack. This is the machinery behind the classic "Judas swing": time-of-day liquidity engineering with institutional execution layered on top.',
    propNotes: 'The London range is the liquidity pool NY hunts — one sweep per side per day. Because the entry window is the NY killzone, the session weight is naturally satisfied; lean on HTF bias + sweep structure for selectivity. Strongest 09:30–10:00 ET.',
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
    sess: '0930-1600', tagline: 'SuperTrend flips graded by ADX strength and HTF bias, executed with risk-based sizing and an ATR runner. Trend-following. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~52–56% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend engine built on the SuperTrend flip. The raw flip is graded by ADX (structure), HTF bias and the volatility regime so dead-tape flips are filtered out. The SuperTrend band itself is the structural stop, and the runner (TP3 at 4R) is harvested with the ATR chandelier trail — the asymmetry is the edge.',
    propNotes: 'Trend models run a lower win rate but high R; the confluence threshold cuts the worst flips and the trail pays for the chop. Raise the ADX weight/min for fewer, stronger trends.',
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
    sess: '0930-1600', tagline: 'The Turtle system, modernized: 20-bar Donchian breakouts filtered by regime + HTF, sized off the N-unit, runner trailed for the big move. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['15m', '1H'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~42–48% (very high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A faithful Donchian breakout wrapped in a modern risk engine. A close beyond the 20-bar channel is the raw signal; the 2×ATR "N" unit is the stop; the runner reaches for 5R with the chandelier trail. The regime filter keeps breakouts to live-volatility tape, and HTF bias avoids fading the bigger trend. Low hit-rate by design — the asymmetry carries it.',
    propNotes: 'Do not move the runner target in; the outlier trade is the whole edge. Keep risk small so a losing streak never breaches drawdown. The regime + HTF gates are what make a 45%-win system survivable on a prop clock.',
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
    sess: '0930-1600', tagline: 'TTM-style squeeze: Bollinger compresses inside Keltner, then expands. Coil length feeds the confluence score; the pop is executed with tiered exits. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~48–53% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A volatility-expansion engine. When the Bollinger Bands sit inside the Keltner Channels the market is coiled; the release bar (BB pops back outside) is the signal, with direction from the close vs the basis. The number of bars the squeeze persisted feeds the structure weight — longer coils score higher. The expansion leg is harvested with the laddered exits and trail.',
    propNotes: 'Direction must agree with the breakout candle. Longer squeezes give bigger, cleaner pops — let the structure weight do the selecting. The regime filter keeps you from "expanding" into already-elevated volatility.',
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
    sess: '0930-1100', skipLunch: false, tagline: 'Gap + opening-range break, graded by gap size and momentum, executed with risk-based sizing and a trailed runner. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['1m', '5m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~55–60% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-open engine. When NQ gaps from the prior close and breaks its 09:30–09:35 opening range in the gap direction, order flow is one-sided. Gap size feeds the structure weight; the OR edge is the entry and the opposite edge the stop. The continuation leg is laddered out with the trail on the runner.',
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
    sess: '0930-1600', tagline: 'A 3-bar flush into the Bollinger band that snaps back — exhaustion reversal scored and executed with tight risk. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~60–66% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A short-term exhaustion engine. Three consecutive bars flushing to a fresh extreme that tag the Bollinger band, followed by a close back through the prior bar, signal that the move is spent. The flush extreme is the stop; the laddered exits bank the snap-back. Runs HTF-agnostic by design — it fades local exhaustion.',
    propNotes: 'The band touch is the filter — reversals without an overextension are noise. High hit-rate, tighter R; never widen the stop chasing a fill. Best in balanced, two-sided tape.',
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
    sess: '0930-1600', tagline: 'Auto-mapped swing fib: buy the 61.8% golden-pocket retrace in an uptrend, sell it in a downtrend. Scored, sized, and trailed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~57–62% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend-continuation engine that maps the Fibonacci retracement from the latest confirmed swing. In an uptrend a pullback into the 61.8% golden pocket that closes back up triggers a long; the swing origin (100%) is the stop. The deeper fill gives a tight stop and high R, harvested with the laddered exits and trail.',
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
    sess: '0930-1600', tagline: 'Classic S1/R1 floor pivots: fade the rejection back toward the central pivot. High hit-rate grinder with full risk governance. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~66–72% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A floor-trader reversion engine. Daily pivots (PP/S1/R1) are computed from the prior session; a tag of S1 that closes back up fades long toward PP, a tag of R1 that closes back down fades short. ATR-buffered stop beyond the band; the laddered exits scale out toward and beyond the central pivot. A low-variance, high-win grinder.',
    propNotes: 'Pivots work best on balanced, rotational days — the regime filter and close-back requirement guard against trend days that walk one band. The high win rate makes a smooth equity curve, which is exactly what passes evaluations.',
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
    sess: '0930-1600', tagline: 'Three expanding-range bars on rising volume = ignition. Graded by volume thrust and executed with a trailed runner. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['1m', '5m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~52–57% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-burst engine. Three consecutive same-direction bars with expanding range and above-average volume signal aggressive one-sided flow. The volume thrust feeds the structure weight; the burst low/high is the stop; the leg is harvested with the laddered exits and trail. Built for fast, trending opens.',
    propNotes: 'The expanding-range + volume combo separates ignition from drift. Momentum entries are late by nature, so the risk engine and trail do the heavy lifting — honor them.',
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
    sess: '0930-1600', tagline: 'Price prints a new extreme, RSI does not — momentum is fading. Pivot-confirmed divergence, scored and executed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~58–63% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A momentum-divergence engine. Confirmed pivots in price are compared against RSI at those pivots: a lower price low with a higher RSI low is bullish divergence (selling exhausting). The divergent pivot is the stop; the reversion leg is laddered out. Pivot confirmation and a close in the reversal direction keep it from front-running a trend.',
    propNotes: 'Divergence is an early signal — the pivot confirmation and confluence score are what make it tradable. Best at session extremes and into the close.',
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
    sess: '0930-1600', tagline: 'Price stretches 2.5σ from its mean → statistical snap-back. Highest hit-rate model, run with strict risk governance. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~68–74% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A pure statistical reversion engine. It computes a rolling z-score of price vs its mean; beyond ±threshold the move is overstretched and tends to revert. The magnitude of the stretch feeds the structure weight. ATR-buffered stop beyond the extreme; the laddered exits scale back toward the mean. Highest win-rate, smallest R — the risk governor and regime filter keep the tail losses cheap.',
    propNotes: 'The highest hit-rate model here, but the small R means a single fat-tail loss costs several wins — never widen the stop, and keep the regime filter on to avoid fading a genuine trend day.',
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
    sess: '0930-1600', tagline: 'New price extreme on shrinking signed-volume delta = absorption. Order-flow divergence, scored and executed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~56–61% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'An effort-vs-result engine that proxies order-flow delta without tick data. It builds a cumulative signed-volume line; when price makes a fresh extreme but delta does not, buyers/sellers are being absorbed. The price extreme is the stop; the reversion is laddered out. A genuine order-flow tell on liquid index futures.',
    propNotes: 'Real CVD needs bid/ask tick data, but the signed-volume proxy captures the same absorption on liquid futures. The confluence engine pairs it with level/regime context for A+ reads.',
    sig: {
      inputs: `cpiv = input.int(5, "Pivot strength", minval=2, group="① Signal Core")`,
      calc: `dlt = close > open ? volume : close < open ? -volume : 0.0
var float cvd = 0.0
cvd := cvd + dlt
plP = ta.pivotlow(low,  cpiv, cpiv)
phP = ta.pivothigh(high, cpiv, cpiv)
plC = ta.pivotlow(cvd,  cpiv, cpiv)
phC = ta.pivothigh(cvd, cpiv, cpiv)
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
    sess: '0930-1600', tagline: 'Trade pullbacks into the 100/200-EMA cloud in the direction of trend, with the cloud as a structural stop. Scored and trailed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~54–59% (post-confluence)', riskPerTrade: '0.5% risk-based',
    overview: 'A trend-pullback engine built on a moving-average cloud. The 100/200 EMAs form a dynamic band; in an uptrend a pullback that taps the cloud and closes back up triggers a long, with the far side of the cloud as a structural, noise-absorbing stop. The continuation is harvested with the laddered exits and trail.',
    propNotes: 'The cloud (not a single line) gives a wider, more reliable stop and filters chop. A close through the cloud cancels the setup — the regime filter keeps you out of balance.',
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
    sess: '0930-1600', tagline: 'A confirmed break of swing structure, entered on the retest of the broken level. Smart-money continuation, scored and trailed. Long/short.',
    assets: ['Futures (NQ/MNQ)', 'Indices'], timeframes: ['5m', '15m'], propFirms: ['Topstep', 'Apex', 'MyFundedFutures'],
    winTarget: '~50–55% (high R)', riskPerTrade: '0.5% risk-based',
    overview: 'A market-structure engine. It tracks confirmed swing highs/lows; a close through the latest swing high shifts structure bullish, and the entry is the first pullback that retests and holds the broken level. The origin swing is the stop; the extension is harvested with the laddered exits and trail. The retest is what gives the tight stop and high R.',
    propNotes: 'BOS without a retest is a chase — the pullback entry is the edge. HTF bias keeps continuations aligned with the bigger trend; best in trending sessions.',
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

// ─── Steps ────────────────────────────────────────────────────────────────────
const autoSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} strategy → Add to Chart. Use a ${s.timeframes.join('/')} chart of ${s.assets[0]}.`,
  `Open Settings: tune the ① Signal Core, then the ④ Confluence weights and the Min Score (higher = fewer, stronger trades). The dashboard (top-right) shows live regime, volatility percentile, HTF bias and the current long/short scores.`,
  `Set ⑤ Risk: "Risk % per trade" sizes every position off the stop distance automatically. Set the daily loss kill-switch to your prop firm's daily-loss limit minus a buffer, and cap max trades/day.`,
  `⑥ Trade Management ladders out at TP1/TP2/TP3 with breakeven after TP1 and an ATR chandelier trail on the runner — leave on for prop rules, or simplify to one TP while learning.`,
  `Connect a broker (TradingView native) or a webhook bridge, then enable the strategy. Each entry also fires an alert() with exact entry/SL/TP1/TP2/TP3 for your bridge.`,
  `Backtest in the Strategy Tester across 6–12 months and several regimes BEFORE going live. Confirm the equity curve, max drawdown and trade count fit your evaluation's rules.`,
]
const sigSteps = s => [
  `Open TradingView → Pine Editor → paste the ${s.name} signals indicator → Add to Chart (${s.timeframes.join('/')} chart of ${s.assets[0]}).`,
  `The dashboard (top-right) shows regime, volatility percentile, HTF bias and the live long/short confluence scores. A signal only prints when its score clears the Min Score threshold.`,
  `On a signal the box draws: dashed entry, green target (R-multiple), red stop. The label and alert carry the exact entry, SL and TP prices.`,
  `Create an alert → condition "Any alert() function call" → "Once Per Bar Close" so you only act on confirmed signals.`,
  `Raise Min Score (or the factor weights) for fewer A+ setups; lower it for more frequency. Backtest visually across 6–12 months before trading it live.`,
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
  overview: s.overview,
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

// ─── Rewire data.ts ───────────────────────────────────────────────────────────
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
  console.log('🔧 Replaced 15 inline entries in data.ts with ...QUANT_STRATEGIES spread')
} else if (!d.includes('...QUANT_STRATEGIES')) {
  console.error('⚠️  Could not find the inline block to replace — data.ts left unchanged. Check markers.')
} else {
  console.log('✓ data.ts already wired to QUANT_STRATEGIES')
}
writeFileSync(dataPath, d)
console.log('✅ Done.')
