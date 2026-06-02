export type AlgoMode = 'auto' | 'signals'
export type Platform = 'tradingview' | 'mt5' | 'ninjatrader'

export interface Algorithm {
  id: string
  instructor: string
  strategy: string
  tagline: string
  assets: string[]
  timeframes: string[]
  propFirms: string[]
  winTarget: string
  riskPerTrade: string
  color: string
  init: string
  overview: string
  propNotes: string
  auto: {
    tradingview: string
    mt5: string
    ninjatrader?: string
    steps: string[]
    ninjaSteps?: string[]
  }
  signals: {
    tradingview: string
    steps: string[]
  }
}

export const ALGORITHMS: Algorithm[] = [
  // ─────────────────────────────────────────────────────────────────────────────
  // 1. ICT — SMART MONEY CONCEPTS (Fair Value Gap)
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ict',
    instructor: 'ICT (Michael Huddleston)',
    strategy: 'ICT 2022 Model — Liquidity Sweep + Displacement + OTE',
    tagline: 'The full ICT model: HTF bias → liquidity raid → displacement MSS → FVG entry in the OTE zone, with SMT divergence + killzone timing',
    assets: ['Forex', 'Gold (XAUUSD)', 'Indices'],
    timeframes: ['15m', '1H', '4H'],
    propFirms: ['FTMO', 'E8 Funding', 'MyFundedFX', 'The Funded Trader'],
    winTarget: '55–65%',
    riskPerTrade: '0.5%',
    color: '#1e90ff',
    init: 'ICT',
    overview: 'A complete institutional order-flow engine — not a single indicator. It reads higher-timeframe bias, marks buy/sell-side liquidity (PDH/PDL, recent swing highs/lows, session extremes), waits for a stop raid (Judas swing) that sweeps that liquidity, then requires displacement that shifts internal market structure (MSS) and prints a Fair Value Gap. Entry is a limit order back into the FVG, filtered to the Optimal Trade Entry (62–79%) and the discount/premium of the dealing range. Stops sit beyond the swept liquidity; targets draw to the opposing liquidity pool. Optional SMT divergence against a correlated symbol confirms the raid.',
    propNotes: 'Default risk 0.5%/trade with true risk-based sizing (auto-calculates lots/contracts from your stop distance). The model only fires inside killzones (London, NY AM, Silver Bullet 10–11 ET, NY PM) so it avoids dead tape. For FTMO/E8: TP1 closes 50% at 1R then the stop moves to breakeven — this protects the challenge. Best on EURUSD, GBPUSD, XAUUSD, NQ, ES on 5m–1H. Enable SMT divergence (ES for NQ, GBPUSD for EURUSD) for A+ setups only.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — ICT 2022 Model | Tick-Precision Prop Engine",
  overlay                 = true,
  max_bars_back           = 1000,
  max_boxes_count         = 500,
  max_lines_count         = 500,
  max_labels_count        = 500,
  default_qty_type        = strategy.percent_of_equity,
  default_qty_value       = 1,
  commission_type         = strategy.commission.percent,
  commission_value        = 0.01,
  slippage                = 2,
  calc_on_every_tick      = false)

// ══════════ ① DIRECTIONAL BIAS ══════════
biasTF  = input.timeframe("60",   "HTF Bias Timeframe",        group="① Directional Bias")
useBias = input.bool(true,        "Trade only with HTF bias",  group="① Directional Bias")
biasLen = input.int(50,           "HTF Bias EMA Length",       group="① Directional Bias")
useSMT  = input.bool(false,       "Require SMT divergence",    group="① Directional Bias")
smtSym  = input.symbol("CME_MINI:ES1!", "SMT Correlated Symbol", group="① Directional Bias")

// ══════════ ② MARKET STRUCTURE ══════════
swingLen = input.int(10, "Swing Pivot Strength",    minval=3, group="② Market Structure")
intLen   = input.int(5,  "Internal Pivot Strength", minval=2, group="② Market Structure")

// ══════════ ③ LIQUIDITY ══════════
liqLook  = input.int(20,   "Liquidity Lookback (bars)", group="③ Liquidity")
usePDHL  = input.bool(true, "Use Previous Day High/Low", group="③ Liquidity")
sweepReq = input.bool(true, "Require liquidity sweep",    group="③ Liquidity")
sweepWin = input.int(15,   "Max bars: sweep → entry",    group="③ Liquidity")

// ══════════ ④ ENTRY PRECISION ══════════
fvgMult  = input.float(0.15, "Min FVG size (ATR ×)", step=0.05, group="④ Entry Precision")
entryLvl = input.string("Consequent Encroachment (50%)", "FVG Entry Level", options=["FVG Top (first touch)","Consequent Encroachment (50%)","FVG Bottom (deep discount)"], group="④ Entry Precision")
useOTE   = input.bool(false, "Require OTE 62-79% confluence",         group="④ Entry Precision")
useEq    = input.bool(false, "Require Discount/Premium confluence",    group="④ Entry Precision")

// ══════════ ⑤ KILLZONES (New York time) ══════════
useKZ = input.bool(true, "Trade only in killzones", group="⑤ Killzones (New York time)")
kzLDN = input.session("0200-0500", "London Open",   group="⑤ Killzones (New York time)")
kzAM  = input.session("0700-1000", "New York AM",   group="⑤ Killzones (New York time)")
kzSB  = input.session("1000-1100", "Silver Bullet", group="⑤ Killzones (New York time)")
kzPM  = input.session("1400-1500", "New York PM",   group="⑤ Killzones (New York time)")

// ══════════ ⑥ RISK & TARGETS ══════════
riskPct = input.float(0.5, "Risk % per trade",               step=0.1, group="⑥ Risk & Targets")
slBuf   = input.float(0.15,"SL buffer beyond sweep (ATR ×)", step=0.05, group="⑥ Risk & Targets")
tp1R    = input.float(1.0, "TP1 at (R multiple)",            step=0.5, group="⑥ Risk & Targets")
tp1Pct  = input.int(50,    "TP1 close %", minval=0, maxval=100,        group="⑥ Risk & Targets")
tp2Mode = input.string("Fixed R", "TP2 Target", options=["Fixed R","Opposing Liquidity"], group="⑥ Risk & Targets")
tp2R    = input.float(3.0, "TP2 at (R) if Fixed",            step=0.5, group="⑥ Risk & Targets")
useBE   = input.bool(true, "Move SL to breakeven after TP1",            group="⑥ Risk & Targets")

// ══════════ ⑦ VISUALS ══════════
showTrade = input.bool(true,  "Show trade box (entry / TP / SL)", group="⑦ Visuals")
tradeBars = input.int(24,     "Trade box width (bars)",           group="⑦ Visuals")
showFVG   = input.bool(true,  "Show FVG entry zone",              group="⑦ Visuals")
showOTE   = input.bool(false, "Show OTE zone",                    group="⑦ Visuals")
showLbl   = input.bool(false, "Show structure labels",           group="⑦ Visuals")
showDash  = input.bool(true,  "Show dashboard",                   group="⑦ Visuals")

atr = ta.atr(14)

// ══════════ HTF BIAS ══════════
htfClose = request.security(syminfo.tickerid, biasTF, close,               lookahead=barmerge.lookahead_off)
htfEma   = request.security(syminfo.tickerid, biasTF, ta.ema(close, biasLen), lookahead=barmerge.lookahead_off)
biasBull = not useBias or htfClose > htfEma
biasBear = not useBias or htfClose < htfEma

// ══════════ SWING STRUCTURE (BOS / CHoCH) ══════════
ph = ta.pivothigh(high, swingLen, swingLen)
pl = ta.pivotlow (low,  swingLen, swingLen)
var float swH = na
var float swL = na
var bool  swHbk = false
var bool  swLbk = false
if not na(ph)
    swH := ph
    swHbk := false
if not na(pl)
    swL := pl
    swLbk := false
var int mktBias = 0
bosUp = not na(swH) and not swHbk and close > swH
bosDn = not na(swL) and not swLbk and close < swL
chochUp = bosUp and mktBias < 0
chochDn = bosDn and mktBias > 0
if bosUp
    mktBias := 1
    swHbk := true
if bosDn
    mktBias := -1
    swLbk := true

// ══════════ INTERNAL STRUCTURE (MSS entry trigger) ══════════
iph = ta.pivothigh(high, intLen, intLen)
ipl = ta.pivotlow (low,  intLen, intLen)
var float iH = na
var float iL = na
var bool  iHbk = false
var bool  iLbk = false
if not na(iph)
    iH := iph
    iHbk := false
if not na(ipl)
    iL := ipl
    iLbk := false
mssUp = not na(iH) and not iHbk and close > iH
mssDn = not na(iL) and not iLbk and close < iL
if mssUp
    iHbk := true
if mssDn
    iLbk := true
var int mssUpBar = na
var int mssDnBar = na
if mssUp
    mssUpBar := bar_index
if mssDn
    mssDnBar := bar_index
recentMssUp = not na(mssUpBar) and (bar_index - mssUpBar) <= 5
recentMssDn = not na(mssDnBar) and (bar_index - mssDnBar) <= 5

// ══════════ LIQUIDITY + SWEEPS ══════════
[pdh, pdl] = request.security(syminfo.tickerid, "D", [high[1], low[1]], lookahead=barmerge.lookahead_on)
recHi = ta.highest(high, liqLook)
recLo = ta.lowest (low,  liqLook)
sweptSSL = (usePDHL and not na(pdl) and low  < pdl and close > pdl) or (low  < recLo[1] and close > recLo[1])
sweptBSL = (usePDHL and not na(pdh) and high > pdh and close < pdh) or (high > recHi[1] and close < recHi[1])
var int   sslBar = na
var float sslPx  = na
var int   bslBar = na
var float bslPx  = na
if sweptSSL
    sslBar := bar_index
    sslPx  := low
if sweptBSL
    bslBar := bar_index
    bslPx  := high

// ══════════ SMT DIVERGENCE (optional) ══════════
smtLow  = request.security(smtSym, timeframe.period, low,  lookahead=barmerge.lookahead_off)
smtHigh = request.security(smtSym, timeframe.period, high, lookahead=barmerge.lookahead_off)
ourNewLow  = low  < recLo[1]
smtNewLow  = smtLow  < ta.lowest(smtLow,  liqLook)[1]
ourNewHigh = high > recHi[1]
smtNewHigh = smtHigh > ta.highest(smtHigh, liqLook)[1]
smtBull = not useSMT or (ourNewLow  and not smtNewLow)
smtBear = not useSMT or (ourNewHigh and not smtNewHigh)

// ══════════ DISPLACEMENT + FVG ══════════
bullFVG = low > high[2]
bearFVG = high < low[2]
bullSz  = bullFVG ? low - high[2] : 0.0
bearSz  = bearFVG ? low[2] - high : 0.0
dispBull = bullFVG and bullSz > atr * fvgMult and close[1] > open[1] and recentMssUp
dispBear = bearFVG and bearSz > atr * fvgMult and close[1] < open[1] and recentMssDn

// ══════════ KILLZONES ══════════
inLDN = not na(time(timeframe.period, kzLDN, "America/New_York"))
inAM  = not na(time(timeframe.period, kzAM,  "America/New_York"))
inSB  = not na(time(timeframe.period, kzSB,  "America/New_York"))
inPM  = not na(time(timeframe.period, kzPM,  "America/New_York"))
inKZ  = not useKZ or inLDN or inAM or inSB or inPM

// ══════════ SETUP ASSEMBLY ══════════
sweepOKL = not sweepReq or (not na(sslBar) and (bar_index - sslBar) <= sweepWin)
sweepOKS = not sweepReq or (not na(bslBar) and (bar_index - bslBar) <= sweepWin)
longSetup  = biasBull and sweepOKL and dispBull and inKZ and smtBull
shortSetup = biasBear and sweepOKS and dispBear and inKZ and smtBear

// FVG geometry + entry level
lFvgTop = low
lFvgBot = high[2]
sFvgBot = high
sFvgTop = low[2]
lEntry = entryLvl == "FVG Top (first touch)" ? lFvgTop : entryLvl == "FVG Bottom (deep discount)" ? lFvgBot : (lFvgTop + lFvgBot) / 2
sEntry = entryLvl == "FVG Top (first touch)" ? sFvgBot : entryLvl == "FVG Bottom (deep discount)" ? sFvgTop : (sFvgTop + sFvgBot) / 2

// dealing range + OTE + equilibrium
lRangeLo = not na(sslPx) ? sslPx : ta.lowest(low, sweepWin)
lRangeHi = high
sRangeHi = not na(bslPx) ? bslPx : ta.highest(high, sweepWin)
sRangeLo = low
lEq    = (lRangeHi + lRangeLo) / 2
lOte62 = lRangeHi - (lRangeHi - lRangeLo) * 0.62
lOte79 = lRangeHi - (lRangeHi - lRangeLo) * 0.79
lOteOK = not useOTE or (lFvgBot <= lOte62 and lFvgTop >= lOte79)
lEqOK  = not useEq  or (lFvgBot < lEq)
sEq    = (sRangeHi + sRangeLo) / 2
sOte62 = sRangeLo + (sRangeHi - sRangeLo) * 0.62
sOte79 = sRangeLo + (sRangeHi - sRangeLo) * 0.79
sOteOK = not useOTE or (sFvgBot <= sOte79 and sFvgTop >= sOte62)
sEqOK  = not useEq  or (sFvgTop > sEq)

// ══════════ STATE ══════════
var bool  armed   = false
var int   dir     = 0
var float aEntry  = na
var float aSL     = na
var float aTP1    = na
var float aTP2    = na
var float aInval  = na
var int   aBar    = na
var bool  tp1Done = false
var bool  inTrade = false
var box   fvgBox  = na
var box   oteBox  = na

canArm = not armed and not inTrade and strategy.position_size == 0

// ── arm LONG ──
if canArm and longSetup and lOteOK and lEqOK
    bsl = math.max(nz(pdh, recHi[1]), recHi[1])
    sl  = lRangeLo - atr * slBuf
    risk = lEntry - sl
    if risk > 0
        armed := true
        dir := 1
        aEntry := lEntry
        aSL := sl
        aTP1 := lEntry + risk * tp1R
        aTP2 := tp2Mode == "Opposing Liquidity" and bsl > lEntry + risk * 1.5 and bsl < lEntry + risk * 10 ? bsl : lEntry + risk * tp2R
        aInval := lFvgBot
        aBar := bar_index
        tp1Done := false
        box.delete(fvgBox)
        box.delete(oteBox)
        if showFVG
            fvgBox := box.new(bar_index, lFvgTop, bar_index + sweepWin, lFvgBot, border_color=color.new(color.teal,0), bgcolor=color.new(color.teal,80))
        if showOTE
            oteBox := box.new(bar_index, lOte62, bar_index + sweepWin, lOte79, border_color=color.new(color.blue,40), bgcolor=color.new(color.blue,88))
        if showTrade
            bxR = bar_index + tradeBars
            box.new(bar_index, aTP2,   bxR, aEntry, border_color=color.new(color.green,55), bgcolor=color.new(color.green,82))
            box.new(bar_index, aEntry, bxR, aSL,    border_color=color.new(color.red,55),   bgcolor=color.new(color.red,85))
            line.new(bar_index, aEntry, bxR, aEntry, color=color.new(color.white,0), style=line.style_dashed)
            label.new(bxR, aTP2, "TP " + str.tostring(aTP2,"#.#####"), style=label.style_label_left, color=color.new(color.green,0), textcolor=color.white, size=size.small)
            label.new(bxR, aSL,  "SL " + str.tostring(aSL,"#.#####"),  style=label.style_label_left, color=color.new(color.red,0),   textcolor=color.white, size=size.small)
            label.new(bar_index, aSL, "LONG @ " + str.tostring(aEntry,"#.#####") + "\\nSwept sell-side liquidity, displaced up (MSS) — buying the FVG in OTE discount.", style=label.style_label_up, color=color.new(#1e90ff,15), textcolor=color.white, size=size.small)

// ── arm SHORT ──
if canArm and shortSetup and sOteOK and sEqOK
    ssl = math.min(nz(pdl, recLo[1]), recLo[1])
    sl  = sRangeHi + atr * slBuf
    risk = sl - sEntry
    if risk > 0
        armed := true
        dir := -1
        aEntry := sEntry
        aSL := sl
        aTP1 := sEntry - risk * tp1R
        aTP2 := tp2Mode == "Opposing Liquidity" and ssl < sEntry - risk * 1.5 and ssl > sEntry - risk * 10 ? ssl : sEntry - risk * tp2R
        aInval := sFvgTop
        aBar := bar_index
        tp1Done := false
        box.delete(fvgBox)
        box.delete(oteBox)
        if showFVG
            fvgBox := box.new(bar_index, sFvgTop, bar_index + sweepWin, sFvgBot, border_color=color.new(color.red,0), bgcolor=color.new(color.red,80))
        if showOTE
            oteBox := box.new(bar_index, sOte79, bar_index + sweepWin, sOte62, border_color=color.new(color.blue,40), bgcolor=color.new(color.blue,88))
        if showTrade
            bxR = bar_index + tradeBars
            box.new(bar_index, aEntry, bxR, aTP2,   border_color=color.new(color.green,55), bgcolor=color.new(color.green,82))
            box.new(bar_index, aSL,    bxR, aEntry, border_color=color.new(color.red,55),   bgcolor=color.new(color.red,85))
            line.new(bar_index, aEntry, bxR, aEntry, color=color.new(color.white,0), style=line.style_dashed)
            label.new(bxR, aTP2, "TP " + str.tostring(aTP2,"#.#####"), style=label.style_label_left, color=color.new(color.green,0), textcolor=color.white, size=size.small)
            label.new(bxR, aSL,  "SL " + str.tostring(aSL,"#.#####"),  style=label.style_label_left, color=color.new(color.red,0),   textcolor=color.white, size=size.small)
            label.new(bar_index, aSL, "SHORT @ " + str.tostring(aEntry,"#.#####") + "\\nSwept buy-side liquidity, displaced down (MSS) — selling the FVG in OTE premium.", style=label.style_label_down, color=color.new(#1e90ff,15), textcolor=color.white, size=size.small)

// ── place / manage pending entry ──
if armed and strategy.position_size == 0
    qty = math.abs(aEntry - aSL) > 0 ? (strategy.equity * riskPct / 100) / math.abs(aEntry - aSL) : na
    if dir == 1
        strategy.entry("Long", strategy.long, qty=qty, limit=aEntry)
    else
        strategy.entry("Short", strategy.short, qty=qty, limit=aEntry)
    invalid = dir == 1 ? close < aInval : close > aInval
    if invalid or (bar_index - aBar > sweepWin * 2)
        strategy.cancel("Long")
        strategy.cancel("Short")
        armed := false
        dir := 0

// ── manage open position ──
if strategy.position_size != 0
    inTrade := true
    if dir == 1 and high >= aTP1
        tp1Done := true
    if dir == -1 and low <= aTP1
        tp1Done := true
    slNow = useBE and tp1Done ? aEntry : aSL
    if dir == 1
        strategy.exit("X1", from_entry="Long",  qty_percent=tp1Pct, stop=slNow, limit=aTP1)
        strategy.exit("X2", from_entry="Long",  stop=slNow, limit=aTP2)
    else
        strategy.exit("X1", from_entry="Short", qty_percent=tp1Pct, stop=slNow, limit=aTP1)
        strategy.exit("X2", from_entry="Short", stop=slNow, limit=aTP2)

// ── reset after trade closes ──
if inTrade and strategy.position_size == 0
    inTrade := false
    armed := false
    dir := 0
    tp1Done := false

// ══════════ VISUALS ══════════
plot(htfEma, "HTF Bias EMA", color.new(color.gray, 50), 1)
if showLbl and chochUp
    label.new(bar_index, low,  "CHoCH↑", color=color.new(color.teal,20), style=label.style_label_up,   textcolor=color.white, size=size.tiny)
if showLbl and chochDn
    label.new(bar_index, high, "CHoCH↓", color=color.new(color.red,20),  style=label.style_label_down, textcolor=color.white, size=size.tiny)
bgcolor(longSetup ? color.new(color.teal, 85) : shortSetup ? color.new(color.red, 85) : na, title="Setup Bar")

// ══════════ DASHBOARD ══════════
if showDash and barstate.islast
    var table d = table.new(position.bottom_right, 2, 6, bgcolor=color.new(color.black,15), frame_color=color.new(#1e90ff,50), frame_width=2, border_color=color.new(color.gray,70), border_width=1)
    table.cell(d, 0, 0, "YN ICT ENGINE", text_color=color.new(#1e90ff,0), bgcolor=color.new(#1e90ff,85), text_size=size.small)
    table.cell(d, 1, 0, biasBull and not biasBear ? "BULL" : biasBear and not biasBull ? "BEAR" : "—", text_color=biasBull and not biasBear ? color.lime : biasBear and not biasBull ? color.red : color.gray, bgcolor=color.new(#1e90ff,85), text_size=size.small)
    table.cell(d, 0, 1, "Killzone",  text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 1, inKZ ? (inLDN?"London":inAM?"NY AM":inSB?"Silver Bullet":inPM?"NY PM":"Active") : "Closed", text_color=inKZ?color.lime:color.gray, text_size=size.small)
    table.cell(d, 0, 2, "Structure", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 2, mktBias==1?"Bullish":mktBias==-1?"Bearish":"Ranging", text_color=mktBias==1?color.lime:mktBias==-1?color.red:color.gray, text_size=size.small)
    table.cell(d, 0, 3, "Setup",     text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 3, armed?(dir==1?"ARMED LONG":"ARMED SHORT"):inTrade?"IN TRADE":"Scanning", text_color=armed?color.yellow:inTrade?color.aqua:color.gray, text_size=size.small)
    table.cell(d, 0, 4, "Entry",     text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 4, armed?str.tostring(aEntry,"#.#####"):"—", text_color=color.white, text_size=size.small)
    table.cell(d, 0, 5, "SL / TP2",  text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 5, armed?str.tostring(aSL,"#.###")+" / "+str.tostring(aTP2,"#.###"):"—", text_color=color.white, text_size=size.small)`,
      mt5: `// YN Finance — ICT 2022 Model EA (MetaTrader 5) — Long-side core
// Sweep -> Displacement/MSS -> FVG entry in OTE | EURUSD, XAUUSD, NAS100 | M5-M15
// Mirror this logic for shorts (sweep BSL -> bearish FVG below internal structure).

#include <Trade\\Trade.mqh>
CTrade trade;

input double RiskPct    = 0.5;    // Risk % per trade
input int    IntLen     = 5;      // Internal structure lookback (MSS)
input int    LiqLook    = 20;     // Liquidity lookback (bars)
input int    SweepWin   = 15;     // Bars a sweep stays valid
input double FVGMultATR = 0.15;   // Min FVG size (ATR x)
input double SLBufATR   = 0.15;   // Stop buffer beyond the sweep (ATR x)
input double TP2_R      = 3.0;    // Fixed R target if no liquidity above
input bool   UseKZ      = true;   // Trade only in killzones

int    atrH;
bool   haveSweep = false;
double sweptLow  = 0.0;
int    sweepAge  = 0;

int OnInit() {
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   if (atrH == INVALID_HANDLE) return INIT_FAILED;
   return INIT_SUCCEEDED;
}
void OnDeinit(const int reason) { IndicatorRelease(atrH); }

bool NewBar() {
   static datetime t = 0;
   datetime c = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (c != t) { t = c; return true; }
   return false;
}

bool InKillzone() {
   // Broker time ~ UTC+2/3. Windows below approximate London + NY in UTC.
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   int m = dt.hour * 60 + dt.min;
   return (m >= 7*60 && m < 10*60) || (m >= 12*60+30 && m < 16*60);
}

double ATRv()        { double a[1]; CopyBuffer(atrH,0,0,1,a); return a[0]; }
double PrevDayLow()  { double l[]; return CopyLow (_Symbol,PERIOD_D1,1,1,l) > 0 ? l[0] : 0.0; }
double PrevDayHigh() { double h[]; return CopyHigh(_Symbol,PERIOD_D1,1,1,h) > 0 ? h[0] : 0.0; }
double LowestN(int n, int start)  { double l[]; int k=CopyLow (_Symbol,PERIOD_CURRENT,start,n,l); double mn= DBL_MAX; for(int i=0;i<k;i++) mn=MathMin(mn,l[i]); return mn; }
double HighestN(int n, int start) { double h[]; int k=CopyHigh(_Symbol,PERIOD_CURRENT,start,n,h); double mx=-DBL_MAX; for(int i=0;i<k;i++) mx=MathMax(mx,h[i]); return mx; }

void OnTick() {
   if (!NewBar()) return;
   if (haveSweep) { sweepAge++; if (sweepAge > SweepWin) { haveSweep=false; sweepAge=0; } }
   if (PositionsTotal() > 0) return;
   if (UseKZ && !InKillzone()) return;

   double atr   = ATRv();
   double o1    = iOpen (_Symbol,PERIOD_CURRENT,1);
   double c1    = iClose(_Symbol,PERIOD_CURRENT,1);
   double low1  = iLow  (_Symbol,PERIOD_CURRENT,1);
   double high3 = iHigh (_Symbol,PERIOD_CURRENT,3);
   double pdl   = PrevDayLow();
   double recLo = LowestN(LiqLook, 2);

   // 1) Sell-side liquidity sweep on the last closed bar (wick below, close back above)
   double keyLow = MathMax(pdl, recLo);
   if (keyLow > 0 && low1 < keyLow && c1 > keyLow) { haveSweep=true; sweptLow=low1; sweepAge=0; }

   // 2) Bullish FVG (bars 1-2-3) + displacement + internal MSS
   bool   bullFVG = (low1 > high3) && ((low1 - high3) > atr*FVGMultATR) && (c1 > o1);
   double intHigh = HighestN(IntLen, 2);
   bool   mss     = c1 > intHigh;

   if (haveSweep && bullFVG && mss) {
      double fvgTop = low1, fvgBot = high3;
      double entry  = (fvgTop + fvgBot) / 2.0;          // Consequent Encroachment (50% of FVG)
      double rangeLo= sweptLow;
      double rangeHi= MathMax(c1, HighestN(SweepWin, 1));
      double ote62  = rangeHi - (rangeHi-rangeLo)*0.62;
      double ote79  = rangeHi - (rangeHi-rangeLo)*0.79;
      double eq     = (rangeHi + rangeLo) / 2.0;
      bool   oteOK  = entry <= ote62 && entry >= ote79; // inside Optimal Trade Entry
      bool   eqOK   = entry < eq;                        // in discount
      double sl     = rangeLo - atr*SLBufATR;
      double risk   = entry - sl;

      if (oteOK && eqOK && risk > 0) {
         double bsl     = MathMax(PrevDayHigh(), HighestN(LiqLook, 1));
         double tp      = bsl > entry ? bsl : entry + risk*TP2_R;  // draw to opposing liquidity
         double cash    = AccountInfoDouble(ACCOUNT_BALANCE) * RiskPct/100.0;
         double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
         if (tickVal <= 0) tickVal = 1.0;
         double lots    = NormalizeDouble(cash / ((risk/_Point)*tickVal), 2);
         lots = MathMax(0.01, MathMin(lots, 10.0));
         double ask     = SymbolInfoDouble(_Symbol, SYMBOL_ASK);

         // Limit order back into the FVG (the retrace entry). Market fallback if already inside.
         if (entry < ask) trade.BuyLimit(lots, entry, _Symbol, sl, tp, ORDER_TIME_GTC, 0, "ICT 2022 Long");
         else             trade.Buy(lots, _Symbol, ask, sl, tp, "ICT 2022 Long");
         haveSweep=false; sweepAge=0;
      }
   }
}`,
      ninjatrader: `// YN Finance — ICT 2022 Model | NinjaTrader 8 Strategy (MES futures)
// Sweep -> displacement/MSS -> FVG entry in OTE. Auto-executes on your
// connected futures account (Apex / Topstep / TradeDay via Rithmic/Tradovate).
// No TradingView, no webhook, no monthly fee. Set the chart time zone to US Eastern.

#region Using declarations
using System;
using System.ComponentModel.DataAnnotations;
using NinjaTrader.Cbi;
using NinjaTrader.Data;
using NinjaTrader.NinjaScript;
using NinjaTrader.NinjaScript.Indicators;
#endregion

namespace NinjaTrader.NinjaScript.Strategies
{
    public class YNFinanceICT2022 : Strategy
    {
        private bool   armed = false;
        private int    dir = 0;
        private double fvgTop, fvgBot, entryPx, slPx, tpPx;
        private int    armBar = -1, sweepBarL = -1, sweepBarH = -1;
        private double sweepLow = 0.0, sweepHigh = 0.0;

        protected override void OnStateChange()
        {
            if (State == State.SetDefaults)
            {
                Name                         = "YN Finance - ICT 2022 (MES)";
                Description                  = "ICT 2022: liquidity sweep + displacement/MSS + FVG entry in OTE.";
                Calculate                    = Calculate.OnBarClose;
                EntriesPerDirection          = 1;
                EntryHandling                = EntryHandling.AllEntries;
                IsExitOnSessionCloseStrategy = true;
                ExitOnSessionCloseSeconds    = 30;
                BarsRequiredToTrade          = 60;
                IncludeCommission            = true;

                Contracts   = 1;
                IntLen      = 5;
                LiqLookback = 20;
                SweepWindow = 15;
                FvgMultAtr  = 0.15;
                SlBufAtr    = 0.15;
                TargetR     = 2.0;
                BiasLen     = 50;
                UseBias     = true;
                UseKillzone = true;
                MinGrade    = 3;
            }
        }

        protected override void OnBarUpdate()
        {
            if (CurrentBar < Math.Max(LiqLookback, BiasLen) + 5)
                return;

            double atr = ATR(14)[0];
            if (atr <= 0) return;
            double ema = EMA(BiasLen)[0];
            bool biasBull = !UseBias || Close[0] > ema;
            bool biasBear = !UseBias || Close[0] < ema;

            double recLo = MIN(Low, LiqLookback)[1];
            double recHi = MAX(High, LiqLookback)[1];

            // liquidity sweeps (wick beyond a level, close back inside)
            if (Low[0]  < recLo && Close[0] > recLo) { sweepBarL = CurrentBar; sweepLow  = Low[0];  }
            if (High[0] > recHi && Close[0] < recHi) { sweepBarH = CurrentBar; sweepHigh = High[0]; }

            // internal market structure shift (break of last IntLen-bar extreme)
            bool mssUp = Close[0] > MAX(High, IntLen)[1];
            bool mssDn = Close[0] < MIN(Low,  IntLen)[1];

            // displacement + Fair Value Gap (3-candle imbalance)
            bool dispBull = Low[0]  > High[2] && (Low[0] - High[2]) > atr * FvgMultAtr && Close[1] > Open[1] && mssUp;
            bool dispBear = High[0] < Low[2]  && (Low[2] - High[0]) > atr * FvgMultAtr && Close[1] < Open[1] && mssDn;

            // killzone (chart MUST be in US Eastern time)
            TimeSpan tod = Time[0].TimeOfDay;
            bool inAM = tod >= new TimeSpan(9,30,0) && tod <= new TimeSpan(11,0,0);
            bool inPM = tod >= new TimeSpan(14,0,0) && tod <= new TimeSpan(15,0,0);
            bool inKZ = !UseKillzone || inAM || inPM;

            bool sweepOKL = sweepBarL >= 0 && (CurrentBar - sweepBarL) <= SweepWindow;
            bool sweepOKS = sweepBarH >= 0 && (CurrentBar - sweepBarH) <= SweepWindow;

            // ---- LONG geometry + grade (0-5) ----
            double lTop = Low[0], lBot = High[2];
            double lEntry = (lTop + lBot) / 2.0;
            double lRangeLo = sweepBarL >= 0 ? sweepLow : MIN(Low, SweepWindow)[0];
            double lRangeHi = High[0];
            double lEq    = (lRangeHi + lRangeLo) / 2.0;
            double lOte62 = lRangeHi - (lRangeHi - lRangeLo) * 0.62;
            double lOte79 = lRangeHi - (lRangeHi - lRangeLo) * 0.79;
            int gradeL = 0;
            if ((lTop - lBot) > atr * 0.30)           gradeL++;
            if (lBot <= lOte62 && lTop >= lOte79)     gradeL++;
            if (lBot <  lEq)                          gradeL++;
            if (inAM)                                 gradeL++;
            if (Math.Abs(Close[0] - ema) > atr * 0.5) gradeL++;

            // ---- SHORT geometry + grade (0-5) ----
            double sBot = High[0], sTop = Low[2];
            double sEntry = (sTop + sBot) / 2.0;
            double sRangeHi = sweepBarH >= 0 ? sweepHigh : MAX(High, SweepWindow)[0];
            double sRangeLo = Low[0];
            double sEq    = (sRangeHi + sRangeLo) / 2.0;
            double sOte62 = sRangeLo + (sRangeHi - sRangeLo) * 0.62;
            double sOte79 = sRangeLo + (sRangeHi - sRangeLo) * 0.79;
            int gradeS = 0;
            if ((sTop - sBot) > atr * 0.30)           gradeS++;
            if (sBot <= sOte79 && sTop >= sOte62)     gradeS++;
            if (sTop >  sEq)                          gradeS++;
            if (inAM)                                 gradeS++;
            if (Math.Abs(Close[0] - ema) > atr * 0.5) gradeS++;

            // ---- ARM the setup ----
            if (!armed && Position.MarketPosition == MarketPosition.Flat)
            {
                if (biasBull && sweepOKL && dispBull && inKZ && gradeL >= MinGrade)
                {
                    double sl = lRangeLo - atr * SlBufAtr;
                    double risk = lEntry - sl;
                    if (risk > 0)
                    {
                        armed = true; dir = 1; fvgTop = lTop; fvgBot = lBot;
                        entryPx = lEntry; slPx = sl; tpPx = lEntry + risk * TargetR; armBar = CurrentBar;
                    }
                }
                else if (biasBear && sweepOKS && dispBear && inKZ && gradeS >= MinGrade)
                {
                    double sl = sRangeHi + atr * SlBufAtr;
                    double risk = sl - sEntry;
                    if (risk > 0)
                    {
                        armed = true; dir = -1; fvgTop = sTop; fvgBot = sBot;
                        entryPx = sEntry; slPx = sl; tpPx = sEntry - risk * TargetR; armBar = CurrentBar;
                    }
                }
            }

            // ---- INVALIDATE if the FVG is violated or it goes stale ----
            if (armed)
            {
                bool bad = dir == 1 ? Close[0] < fvgBot : Close[0] > fvgTop;
                if (bad || (CurrentBar - armBar) > SweepWindow) { armed = false; dir = 0; }
            }

            // ---- CONFIRM (price returns to FVG and rejects) -> market entry + bracket ----
            if (armed && Position.MarketPosition == MarketPosition.Flat)
            {
                if (dir == 1 && Low[0] <= entryPx && Close[0] > entryPx && Close[0] > Open[0])
                {
                    SetStopLoss("ICTLong", CalculationMode.Price, slPx, false);
                    SetProfitTarget("ICTLong", CalculationMode.Price, tpPx);
                    EnterLong(Contracts, "ICTLong");
                    armed = false; dir = 0;
                }
                else if (dir == -1 && High[0] >= entryPx && Close[0] < entryPx && Close[0] < Open[0])
                {
                    SetStopLoss("ICTShort", CalculationMode.Price, slPx, false);
                    SetProfitTarget("ICTShort", CalculationMode.Price, tpPx);
                    EnterShort(Contracts, "ICTShort");
                    armed = false; dir = 0;
                }
            }
        }

        #region Properties
        [NinjaScriptProperty, Range(1, int.MaxValue)]
        [Display(Name="Contracts", Description="Contracts per trade", Order=1, GroupName="1. Risk")]
        public int Contracts { get; set; }

        [NinjaScriptProperty, Range(0.1, 10.0)]
        [Display(Name="Target (R multiple)", Order=2, GroupName="1. Risk")]
        public double TargetR { get; set; }

        [NinjaScriptProperty, Range(0.05, 2.0)]
        [Display(Name="Stop buffer (ATR x)", Order=3, GroupName="1. Risk")]
        public double SlBufAtr { get; set; }

        [NinjaScriptProperty, Range(2, 50)]
        [Display(Name="Internal structure length", Order=4, GroupName="2. Model")]
        public int IntLen { get; set; }

        [NinjaScriptProperty, Range(5, 100)]
        [Display(Name="Liquidity lookback", Order=5, GroupName="2. Model")]
        public int LiqLookback { get; set; }

        [NinjaScriptProperty, Range(1, 60)]
        [Display(Name="Sweep to entry window (bars)", Order=6, GroupName="2. Model")]
        public int SweepWindow { get; set; }

        [NinjaScriptProperty, Range(0.0, 2.0)]
        [Display(Name="Min FVG size (ATR x)", Order=7, GroupName="2. Model")]
        public double FvgMultAtr { get; set; }

        [NinjaScriptProperty, Range(10, 400)]
        [Display(Name="HTF bias EMA length", Order=8, GroupName="2. Model")]
        public int BiasLen { get; set; }

        [NinjaScriptProperty]
        [Display(Name="Use bias filter", Order=9, GroupName="2. Model")]
        public bool UseBias { get; set; }

        [NinjaScriptProperty]
        [Display(Name="Killzones only (ET)", Order=10, GroupName="2. Model")]
        public bool UseKillzone { get; set; }

        [NinjaScriptProperty, Range(0, 5)]
        [Display(Name="Minimum grade (0-5)", Order=11, GroupName="2. Model")]
        public int MinGrade { get; set; }
        #endregion
    }
}`,
      ninjaSteps: [
        'Use the futures account your prop firm gives you (Apex, Topstep, TradeDay) — they provide a NinjaTrader 8 login + data feed (Rithmic or Tradovate). Install NinjaTrader 8 free from ninjatrader.com and connect.',
        'In NinjaTrader: New → NinjaScript Editor → expand Strategies → right-click → New Strategy (skip the wizard / "Generated code"). Select all the default code, delete it, paste the strategy above, then press F5 to Compile.',
        'Open an MES 5-minute chart. CRITICAL: set the chart time zone to US Eastern so the killzones line up — Right-click chart → Properties → Time zone = (UTC-05:00) Eastern.',
        'Right-click the chart → Strategies → tick "YN Finance - ICT 2022 (MES)" → set Contracts (respect your prop contract limit) and Target R → set Enabled = True → Apply. It now auto-trades MES with NO TradingView, NO webhook, NO monthly fee.',
        'How it fires: it arms on a liquidity sweep + displacement/MSS + FVG, then enters at market only when price returns into the FVG and rejects. Stop-loss and take-profit attach automatically as a bracket.',
        'PROVE IT FIRST: right-click → Strategy Analyzer → run it on 6-12 months of MES data to see win rate, profit factor and max drawdown. Then run it on a NinjaTrader Sim101 demo account for a week to confirm live fills before risking a funded account.',
        'CHECK YOUR PROP FIRM AUTOMATION RULES before going live — Apex/Topstep/TradeDay each have policies; some require you present at the desk. Violating them voids the account.',
      ],
      steps: [
        'This is the full ICT 2022 model — paste into TradingView Pine Editor on a 5m or 15m chart (EURUSD, NQ, XAUUSD) → Add to chart',
        'Set HTF Bias Timeframe one or two steps up (e.g. 1H bias for a 5m chart). The engine only takes trades in that direction',
        'Leave killzones ON — it only hunts during London, NY AM, Silver Bullet (10–11 ET) and NY PM, where the algorithmic moves happen',
        'The flow it waits for: liquidity sweep (stop raid) → displacement that breaks internal structure (MSS) and leaves an FVG → LIMIT order back into the FVG inside the 62–79% OTE zone',
        'Risk % auto-sizes your position from the stop distance. Keep it at 0.5% for FTMO/E8. TP1 closes 50% at 1R then the stop moves to breakeven',
        'For auto-execution: TradingView → Alerts → "Order fills and alert() function calls" → connect your broker or a webhook to a prop-firm bridge',
        'Optional A+ filter: turn on SMT divergence and set the correlated symbol (ES for NQ, GBPUSD for EURUSD) — only the cleanest raids fire',
        'MT5 users: compile the MQL5 version in MetaEditor → attach → enable AutoTrading. It runs the same sweep → FVG → OTE long-side logic',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — ICT 2022 Pro SIGNALS | Graded + Confirmed", overlay=true,
  max_bars_back=1000, max_boxes_count=500, max_lines_count=500, max_labels_count=500)

// ══════════ ① DIRECTIONAL BIAS ══════════
biasTF  = input.timeframe("60",   "HTF Bias Timeframe",        group="① Directional Bias")
useBias = input.bool(true,        "Trade only with HTF bias",  group="① Directional Bias")
biasLen = input.int(50,           "HTF Bias EMA Length",       group="① Directional Bias")
useSMT  = input.bool(false,       "Require SMT divergence",    group="① Directional Bias")
smtSym  = input.symbol("CME_MINI:ES1!", "SMT Correlated Symbol", group="① Directional Bias")

// ══════════ ② MARKET STRUCTURE ══════════
swingLen = input.int(10, "Swing Pivot Strength",    minval=3, group="② Market Structure")
intLen   = input.int(5,  "Internal Pivot Strength", minval=2, group="② Market Structure")

// ══════════ ③ LIQUIDITY ══════════
liqLook  = input.int(20,   "Liquidity Lookback (bars)", group="③ Liquidity")
usePDHL  = input.bool(true, "Use Previous Day High/Low", group="③ Liquidity")
sweepReq = input.bool(true, "Require liquidity sweep",    group="③ Liquidity")
sweepWin = input.int(15,   "Max bars: sweep → entry",    group="③ Liquidity")

// ══════════ ④ ENTRY PRECISION + GRADE ══════════
fvgMult      = input.float(0.15, "Min FVG size (ATR ×)", step=0.05, group="④ Entry Precision + Grade")
entryLvl     = input.string("Consequent Encroachment (50%)", "FVG Entry Level", options=["FVG Top (first touch)","Consequent Encroachment (50%)","FVG Bottom (deep discount)"], group="④ Entry Precision + Grade")
confirmEntry = input.bool(true,  "Wait for FVG tap + rejection (confirmation)", group="④ Entry Precision + Grade")
minGrade     = input.string("B and above", "Minimum setup grade", options=["A+ only","A and above","B and above","All"], group="④ Entry Precision + Grade")
useOTE       = input.bool(false, "Hard filter: require OTE 62-79%",       group="④ Entry Precision + Grade")
useEq        = input.bool(false, "Hard filter: require Discount/Premium", group="④ Entry Precision + Grade")

// ══════════ ⑤ KILLZONES (New York time) ══════════
useKZ = input.bool(true, "Trade only in killzones", group="⑤ Killzones (New York time)")
kzLDN = input.session("0200-0500", "London Open",   group="⑤ Killzones (New York time)")
kzAM  = input.session("0700-1000", "New York AM",   group="⑤ Killzones (New York time)")
kzSB  = input.session("1000-1100", "Silver Bullet", group="⑤ Killzones (New York time)")
kzPM  = input.session("1400-1500", "New York PM",   group="⑤ Killzones (New York time)")

// ══════════ ⑥ TARGETS ══════════
slBuf   = input.float(0.15,"SL buffer beyond sweep (ATR ×)", step=0.05, group="⑥ Targets")
tp1R    = input.float(1.0, "TP1 at (R multiple)",            step=0.5, group="⑥ Targets")
tp2Mode = input.string("Fixed R", "TP2 Target", options=["Fixed R","Opposing Liquidity"], group="⑥ Targets")
tp2R    = input.float(3.0, "TP2 at (R) if Fixed",            step=0.5, group="⑥ Targets")

// ══════════ ⑥b TRADE MANAGEMENT (trailing stop — let winners run) ══════════
useTrail   = input.bool(true, "Trail stop (let winners run)",             group="⑥ Trade Management")
beAtR      = input.float(1.0, "Move to breakeven at (R)",   step=0.5,      group="⑥ Trade Management")
trailMult  = input.float(2.0, "Trail distance (ATR ×)",     step=0.5,      group="⑥ Trade Management")
trailStep  = input.int(4,     "Min trail move to re-alert (ticks)",        group="⑥ Trade Management")
mgmtAlerts = input.bool(true, "Fire management alerts (breakeven / trail / exit)", group="⑥ Trade Management")

// ══════════ ⑦ ALERTS / AUTOTRADE ══════════
alertFmt  = input.string("Readable", "Alert / webhook format", options=["Readable","JSON - Generic","JSON - TradersPost"], group="⑦ Alerts / Autotrade")
brokerSym = input.string("", "Broker symbol override (blank = chart symbol)", group="⑦ Alerts / Autotrade")
contracts = input.int(1, "Contracts per signal", minval=1, group="⑦ Alerts / Autotrade")
webhookTP = input.string("TP2 (full)", "Webhook take-profit", options=["TP1 (1R)","TP2 (full)"], group="⑦ Alerts / Autotrade")

// ══════════ ⑧ VISUALS ══════════
showTrade = input.bool(true,  "Show trade box (entry / TP / SL)", group="⑧ Visuals")
tradeBars = input.int(24,     "Trade box width (bars)",           group="⑧ Visuals")
showFVG   = input.bool(true,  "Show FVG zone",                    group="⑧ Visuals")
showDash  = input.bool(true,  "Show dashboard + stats",           group="⑧ Visuals")

atr = ta.atr(14)

// ══════════ HTF BIAS ══════════
htfClose = request.security(syminfo.tickerid, biasTF, close,                 lookahead=barmerge.lookahead_off)
htfEma   = request.security(syminfo.tickerid, biasTF, ta.ema(close, biasLen), lookahead=barmerge.lookahead_off)
biasBull = not useBias or htfClose > htfEma
biasBear = not useBias or htfClose < htfEma

// ══════════ STRUCTURE ══════════
ph = ta.pivothigh(high, swingLen, swingLen)
pl = ta.pivotlow (low,  swingLen, swingLen)
var float swH = na
var float swL = na
var bool  swHbk = false
var bool  swLbk = false
if not na(ph)
    swH := ph
    swHbk := false
if not na(pl)
    swL := pl
    swLbk := false
var int mktBias = 0
bosUp = not na(swH) and not swHbk and close > swH
bosDn = not na(swL) and not swLbk and close < swL
if bosUp
    mktBias := 1
    swHbk := true
if bosDn
    mktBias := -1
    swLbk := true

iph = ta.pivothigh(high, intLen, intLen)
ipl = ta.pivotlow (low,  intLen, intLen)
var float iH = na
var float iL = na
var bool  iHbk = false
var bool  iLbk = false
if not na(iph)
    iH := iph
    iHbk := false
if not na(ipl)
    iL := ipl
    iLbk := false
mssUp = not na(iH) and not iHbk and close > iH
mssDn = not na(iL) and not iLbk and close < iL
if mssUp
    iHbk := true
if mssDn
    iLbk := true
var int mssUpBar = na
var int mssDnBar = na
if mssUp
    mssUpBar := bar_index
if mssDn
    mssDnBar := bar_index
recentMssUp = not na(mssUpBar) and (bar_index - mssUpBar) <= 5
recentMssDn = not na(mssDnBar) and (bar_index - mssDnBar) <= 5

// ══════════ LIQUIDITY + SWEEPS ══════════
[pdh, pdl] = request.security(syminfo.tickerid, "D", [high[1], low[1]], lookahead=barmerge.lookahead_on)
recHi = ta.highest(high, liqLook)
recLo = ta.lowest (low,  liqLook)
sweptSSL = (usePDHL and not na(pdl) and low  < pdl and close > pdl) or (low  < recLo[1] and close > recLo[1])
sweptBSL = (usePDHL and not na(pdh) and high > pdh and close < pdh) or (high > recHi[1] and close < recHi[1])
sweptPDL = usePDHL and not na(pdl) and low  < pdl and close > pdl
sweptPDH = usePDHL and not na(pdh) and high > pdh and close < pdh
var int   sslBar = na
var float sslPx  = na
var bool  sslPD  = false
var int   bslBar = na
var float bslPx  = na
var bool  bslPD  = false
if sweptSSL
    sslBar := bar_index
    sslPx  := low
    sslPD  := sweptPDL
if sweptBSL
    bslBar := bar_index
    bslPx  := high
    bslPD  := sweptPDH

// ══════════ SMT DIVERGENCE ══════════
smtLow  = request.security(smtSym, timeframe.period, low,  lookahead=barmerge.lookahead_off)
smtHigh = request.security(smtSym, timeframe.period, high, lookahead=barmerge.lookahead_off)
smtBullDiv = (low  < recLo[1]) and not (smtLow  < ta.lowest(smtLow,  liqLook)[1])
smtBearDiv = (high > recHi[1]) and not (smtHigh > ta.highest(smtHigh, liqLook)[1])
smtBull = not useSMT or smtBullDiv
smtBear = not useSMT or smtBearDiv

// ══════════ DISPLACEMENT + FVG ══════════
bullFVG = low > high[2]
bearFVG = high < low[2]
dispBull = bullFVG and (low - high[2]) > atr * fvgMult and close[1] > open[1] and recentMssUp
dispBear = bearFVG and (low[2] - high) > atr * fvgMult and close[1] < open[1] and recentMssDn

// ══════════ KILLZONES ══════════
inLDN = not na(time(timeframe.period, kzLDN, "America/New_York"))
inAM  = not na(time(timeframe.period, kzAM,  "America/New_York"))
inSB  = not na(time(timeframe.period, kzSB,  "America/New_York"))
inPM  = not na(time(timeframe.period, kzPM,  "America/New_York"))
inKZ  = not useKZ or inLDN or inAM or inSB or inPM

// ══════════ DEALING RANGE / FVG GEOMETRY ══════════
sweepOKL = not sweepReq or (not na(sslBar) and (bar_index - sslBar) <= sweepWin)
sweepOKS = not sweepReq or (not na(bslBar) and (bar_index - bslBar) <= sweepWin)
lFvgTop = low
lFvgBot = high[2]
sFvgBot = high
sFvgTop = low[2]
lEntry = entryLvl == "FVG Top (first touch)" ? lFvgTop : entryLvl == "FVG Bottom (deep discount)" ? lFvgBot : (lFvgTop + lFvgBot) / 2
sEntry = entryLvl == "FVG Top (first touch)" ? sFvgBot : entryLvl == "FVG Bottom (deep discount)" ? sFvgTop : (sFvgTop + sFvgBot) / 2
lRangeLo = not na(sslPx) ? sslPx : ta.lowest(low, sweepWin)
lRangeHi = high
sRangeHi = not na(bslPx) ? bslPx : ta.highest(high, sweepWin)
sRangeLo = low
lEq    = (lRangeHi + lRangeLo) / 2
lOte62 = lRangeHi - (lRangeHi - lRangeLo) * 0.62
lOte79 = lRangeHi - (lRangeHi - lRangeLo) * 0.79
lOteHit = lFvgBot <= lOte62 and lFvgTop >= lOte79
lDisc   = lFvgBot < lEq
sEq    = (sRangeHi + sRangeLo) / 2
sOte62 = sRangeLo + (sRangeHi - sRangeLo) * 0.62
sOte79 = sRangeLo + (sRangeHi - sRangeLo) * 0.79
sOteHit = sFvgBot <= sOte79 and sFvgTop >= sOte62
sPrem   = sFvgTop > sEq
lOteOK = not useOTE or lOteHit
sOteOK = not useOTE or sOteHit
lEqOK  = not useEq  or lDisc
sEqOK  = not useEq  or sPrem

// ══════════ A+ GRADE (0-7 confluence score) ══════════
gradeThr   = minGrade == "A+ only" ? 5 : minGrade == "A and above" ? 4 : minGrade == "B and above" ? 3 : 0
bigDispL   = (lFvgTop - lFvgBot) > atr * 0.30
bigDispS   = (sFvgTop - sFvgBot) > atr * 0.30
biasStrong = math.abs(htfClose - htfEma) > atr * 0.5
primeKZ    = inSB or inAM
gradeL = (sslPD?1:0) + (bigDispL?1:0) + (lOteHit?1:0) + (lDisc?1:0) + (smtBullDiv?1:0) + (primeKZ?1:0) + (biasStrong?1:0)
gradeS = (bslPD?1:0) + (bigDispS?1:0) + (sOteHit?1:0) + (sPrem?1:0) + (smtBearDiv?1:0) + (primeKZ?1:0) + (biasStrong?1:0)
f_letter(g) => g >= 5 ? "A+" : g >= 4 ? "A" : g >= 3 ? "B" : "C"

// ══════════ SETUP DETECTION ══════════
setupLong  = biasBull and sweepOKL and dispBull and inKZ and smtBull and lOteOK and lEqOK and barstate.isconfirmed
setupShort = biasBear and sweepOKS and dispBear and inKZ and smtBear and sOteOK and sEqOK and barstate.isconfirmed

// ══════════ STATE MACHINE: ARM → CONFIRM ══════════
var bool  pend = false
var int   pDir = 0
var float pTop = na
var float pBot = na
var float pE   = na
var float pSL  = na
var float pT1  = na
var float pT2  = na
var float pR   = na
var int   pG   = na
var int   pBar = na

// virtual-trade tracker (powers the backtest stats)
var bool  tOpen = false
var int   tDir  = 0
var float tEntry = na
var float tRisk  = na
var float tS = na
var float tT = na
var float tR = na
var bool  tBE = false
var float tTrail = na
var float tExtreme = na
var float tLastTrailAlert = na
var int   wins = 0
var int   losses = 0
var float sumWinR = 0.0
var float sumLossR = 0.0
var int   consecLoss = 0
var int   maxLossStreak = 0

canArm = not pend and not tOpen

if canArm and setupLong and gradeL >= gradeThr
    bsl = math.max(nz(pdh, recHi[1]), recHi[1])
    slL = lRangeLo - atr * slBuf
    rkL = lEntry - slL
    if rkL > 0
        pend := true
        pDir := 1
        pTop := lFvgTop
        pBot := lFvgBot
        pE   := lEntry
        pSL  := slL
        pT1  := lEntry + rkL * tp1R
        pT2  := tp2Mode == "Opposing Liquidity" and bsl > lEntry + rkL * 1.5 and bsl < lEntry + rkL * 10 ? bsl : lEntry + rkL * tp2R
        pR   := (pT2 - lEntry) / rkL
        pG   := gradeL
        pBar := bar_index
        if showFVG
            box.new(bar_index, lFvgTop, bar_index + sweepWin, lFvgBot, border_color=color.new(color.teal,40), bgcolor=color.new(color.teal,90))

if canArm and setupShort and gradeS >= gradeThr
    ssl = math.min(nz(pdl, recLo[1]), recLo[1])
    slS = sRangeHi + atr * slBuf
    rkS = slS - sEntry
    if rkS > 0
        pend := true
        pDir := -1
        pTop := sFvgTop
        pBot := sFvgBot
        pE   := sEntry
        pSL  := slS
        pT1  := sEntry - rkS * tp1R
        pT2  := tp2Mode == "Opposing Liquidity" and ssl < sEntry - rkS * 1.5 and ssl > sEntry - rkS * 10 ? ssl : sEntry - rkS * tp2R
        pR   := (sEntry - pT2) / rkS
        pG   := gradeS
        pBar := bar_index
        if showFVG
            box.new(bar_index, sFvgTop, bar_index + sweepWin, sFvgBot, border_color=color.new(color.red,40), bgcolor=color.new(color.red,90))

// invalidate pending setup if the FVG is violated or it goes stale
if pend
    bad = pDir == 1 ? close < pBot : close > pTop
    if bad or (bar_index - pBar > sweepWin)
        pend := false
        pDir := 0

// confirmation = price returns to the FVG and rejects (or immediate if confirmation off)
longConfirm  = pend and pDir == 1  and (not confirmEntry or (low  <= pE and close > pE and close > open))
shortConfirm = pend and pDir == -1 and (not confirmEntry or (high >= pE and close < pE and close < open))
fireLong  = longConfirm  and barstate.isconfirmed
fireShort = shortConfirm and barstate.isconfirmed
gradeStr  = f_letter(pG)

if fireLong
    pend := false
    tOpen := true
    tDir := 1
    tEntry := pE
    tRisk := pE - pSL
    tS := pSL
    tT := useTrail ? na : pT2
    tR := pR
    tBE := false
    tTrail := pSL
    tExtreme := high
    tLastTrailAlert := pSL
    bxR = bar_index + tradeBars
    if showTrade
        box.new(bar_index, pT2, bxR, pE,  border_color=color.new(color.green,55), bgcolor=color.new(color.green,82))
        box.new(bar_index, pE,  bxR, pSL, border_color=color.new(color.red,55),   bgcolor=color.new(color.red,85))
        line.new(bar_index, pE, bxR, pE, color=color.new(color.white,0), style=line.style_dashed)
        label.new(bxR, pT2, "TP " + str.tostring(pT2,"#.#####"), style=label.style_label_left, color=color.new(color.green,0), textcolor=color.white, size=size.small)
        label.new(bxR, pSL, "SL " + str.tostring(pSL,"#.#####"), style=label.style_label_left, color=color.new(color.red,0),   textcolor=color.white, size=size.small)
        label.new(bar_index, pSL, gradeStr + " LONG @ " + str.tostring(pE,"#.#####") + "  (RR " + str.tostring(pR,"#.#") + ")\\nSwept SSL, displaced up (MSS), price returned to the FVG and rejected.", style=label.style_label_up, color=color.new(#1e90ff,12), textcolor=color.white, size=size.small)
    symL = brokerSym == "" ? syminfo.ticker : brokerSym
    tpWL = webhookTP == "TP1 (1R)" ? pT1 : pT2
    tpJsonL = '{"ticker":"' + symL + '","action":"buy","quantity":' + str.tostring(contracts) + ',"stopLoss":{"type":"stop","stopPrice":' + str.tostring(pSL,"#.#####") + '},"takeProfit":{"limitPrice":' + str.tostring(tpWL,"#.#####") + '}}'
    gJsonL  = '{"symbol":"' + symL + '","side":"long","action":"buy","qty":' + str.tostring(contracts) + ',"entry":' + str.tostring(pE,"#.#####") + ',"sl":' + str.tostring(pSL,"#.#####") + ',"tp1":' + str.tostring(pT1,"#.#####") + ',"tp2":' + str.tostring(pT2,"#.#####") + ',"grade":"' + gradeStr + '"}'
    rTxtL   = "YN ICT LONG " + gradeStr + " | " + symL + " " + timeframe.period + " | Entry " + str.tostring(pE,"#.#####") + " | SL " + str.tostring(pSL,"#.#####") + " | TP1 " + str.tostring(pT1,"#.#####") + " | TP2 " + str.tostring(pT2,"#.#####") + " | RR " + str.tostring(pR,"#.#")
    alert(alertFmt == "JSON - TradersPost" ? tpJsonL : alertFmt == "JSON - Generic" ? gJsonL : rTxtL, alert.freq_once_per_bar_close)

if fireShort
    pend := false
    tOpen := true
    tDir := -1
    tEntry := pE
    tRisk := pSL - pE
    tS := pSL
    tT := useTrail ? na : pT2
    tR := pR
    tBE := false
    tTrail := pSL
    tExtreme := low
    tLastTrailAlert := pSL
    bxR = bar_index + tradeBars
    if showTrade
        box.new(bar_index, pE,  bxR, pT2, border_color=color.new(color.green,55), bgcolor=color.new(color.green,82))
        box.new(bar_index, pSL, bxR, pE,  border_color=color.new(color.red,55),   bgcolor=color.new(color.red,85))
        line.new(bar_index, pE, bxR, pE, color=color.new(color.white,0), style=line.style_dashed)
        label.new(bxR, pT2, "TP " + str.tostring(pT2,"#.#####"), style=label.style_label_left, color=color.new(color.green,0), textcolor=color.white, size=size.small)
        label.new(bxR, pSL, "SL " + str.tostring(pSL,"#.#####"), style=label.style_label_left, color=color.new(color.red,0),   textcolor=color.white, size=size.small)
        label.new(bar_index, pSL, gradeStr + " SHORT @ " + str.tostring(pE,"#.#####") + "  (RR " + str.tostring(pR,"#.#") + ")\\nSwept BSL, displaced down (MSS), price returned to the FVG and rejected.", style=label.style_label_down, color=color.new(#1e90ff,12), textcolor=color.white, size=size.small)
    symS = brokerSym == "" ? syminfo.ticker : brokerSym
    tpWS = webhookTP == "TP1 (1R)" ? pT1 : pT2
    tpJsonS = '{"ticker":"' + symS + '","action":"sell","quantity":' + str.tostring(contracts) + ',"stopLoss":{"type":"stop","stopPrice":' + str.tostring(pSL,"#.#####") + '},"takeProfit":{"limitPrice":' + str.tostring(tpWS,"#.#####") + '}}'
    gJsonS  = '{"symbol":"' + symS + '","side":"short","action":"sell","qty":' + str.tostring(contracts) + ',"entry":' + str.tostring(pE,"#.#####") + ',"sl":' + str.tostring(pSL,"#.#####") + ',"tp1":' + str.tostring(pT1,"#.#####") + ',"tp2":' + str.tostring(pT2,"#.#####") + ',"grade":"' + gradeStr + '"}'
    rTxtS   = "YN ICT SHORT " + gradeStr + " | " + symS + " " + timeframe.period + " | Entry " + str.tostring(pE,"#.#####") + " | SL " + str.tostring(pSL,"#.#####") + " | TP1 " + str.tostring(pT1,"#.#####") + " | TP2 " + str.tostring(pT2,"#.#####") + " | RR " + str.tostring(pR,"#.#")
    alert(alertFmt == "JSON - TradersPost" ? tpJsonS : alertFmt == "JSON - Generic" ? gJsonS : rTxtS, alert.freq_once_per_bar_close)

// ══════════ TRADE MANAGEMENT + OUTCOME (trailing stop) ══════════
if tOpen
    // 1) exit check against the stop/target set on PRIOR bars (no lookahead)
    exitStop = tDir == 1 ? low <= tTrail : high >= tTrail
    exitTgt  = not na(tT) and (tDir == 1 ? high >= tT : low <= tT)
    if exitStop or exitTgt
        exitPx = exitStop ? tTrail : tT
        realR  = tDir == 1 ? (exitPx - tEntry) / tRisk : (tEntry - exitPx) / tRisk
        tOpen := false
        if realR > 0
            wins += 1
            sumWinR += realR
            consecLoss := 0
        else
            losses += 1
            sumLossR += math.abs(realR)
            consecLoss += 1
            maxLossStreak := math.max(maxLossStreak, consecLoss)
        if mgmtAlerts and barstate.isconfirmed
            alert("YN ICT " + (tDir == 1 ? "LONG" : "SHORT") + " | " + syminfo.ticker + " — CLOSE @ " + str.tostring(exitPx, "#.#####") + "  (" + str.tostring(realR, "#.##") + "R)", alert.freq_once_per_bar_close)
    else
        // 2) advance management for the next bar
        tExtreme := tDir == 1 ? math.max(tExtreme, high) : math.min(tExtreme, low)
        reachedBE = tDir == 1 ? high >= tEntry + tRisk * beAtR : low <= tEntry - tRisk * beAtR
        if useTrail and not tBE and reachedBE
            tBE := true
            tTrail := tEntry
            if mgmtAlerts and barstate.isconfirmed
                alert("YN ICT " + (tDir == 1 ? "LONG" : "SHORT") + " | " + syminfo.ticker + " — move STOP to BREAKEVEN " + str.tostring(tEntry, "#.#####"), alert.freq_once_per_bar_close)
        if useTrail and tBE
            cand = tDir == 1 ? tExtreme - atr * trailMult : tExtreme + atr * trailMult
            tTrail := tDir == 1 ? math.max(tTrail, cand) : math.min(tTrail, cand)
            moved = tDir == 1 ? (tTrail - tLastTrailAlert) >= syminfo.mintick * trailStep : (tLastTrailAlert - tTrail) >= syminfo.mintick * trailStep
            if mgmtAlerts and moved and barstate.isconfirmed
                tLastTrailAlert := tTrail
                alert("YN ICT " + (tDir == 1 ? "LONG" : "SHORT") + " | " + syminfo.ticker + " — trail STOP to " + str.tostring(tTrail, "#.#####"), alert.freq_once_per_bar_close)

// ══════════ PLOT ══════════
plot(htfEma, "HTF Bias EMA", color.new(color.gray, 50), 1)
plot(tOpen ? tTrail : na, "Trailing Stop", color.new(color.orange, 0), 2, style=plot.style_linebr)
plotshape(fireLong,  "LONG",  shape.triangleup,   location.belowbar, color.new(color.lime,0), size=size.normal)
plotshape(fireShort, "SHORT", shape.triangledown, location.abovebar, color.new(color.red,0),  size=size.normal)

// ══════════ DASHBOARD + BACKTEST STATS ══════════
if showDash and barstate.islast
    total = wins + losses
    winRate = total > 0 ? wins / total * 100 : 0.0
    pf = sumLossR > 0 ? sumWinR / sumLossR : (sumWinR > 0 ? 99.9 : 0.0)
    expR = total > 0 ? (sumWinR - sumLossR) / total : 0.0
    var table d = table.new(position.bottom_right, 2, 10, bgcolor=color.new(color.black,12), frame_color=color.new(#1e90ff,50), frame_width=2, border_color=color.new(color.gray,70), border_width=1)
    table.cell(d, 0, 0, "YN ICT PRO", text_color=color.new(#1e90ff,0), bgcolor=color.new(#1e90ff,85), text_size=size.small)
    table.cell(d, 1, 0, biasBull and not biasBear ? "BULL" : biasBear and not biasBull ? "BEAR" : "—", text_color=biasBull and not biasBear ? color.lime : biasBear and not biasBull ? color.red : color.gray, bgcolor=color.new(#1e90ff,85), text_size=size.small)
    table.cell(d, 0, 1, "Killzone", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 1, inKZ ? (inLDN?"London":inAM?"NY AM":inSB?"Silver Bullet":inPM?"NY PM":"Active") : "Closed", text_color=inKZ?color.lime:color.gray, text_size=size.small)
    table.cell(d, 0, 2, "Structure", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 2, mktBias==1?"Bullish":mktBias==-1?"Bearish":"Ranging", text_color=mktBias==1?color.lime:mktBias==-1?color.red:color.gray, text_size=size.small)
    table.cell(d, 0, 3, "Status", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 3, tOpen ? ("IN TRADE — stop " + str.tostring(tTrail,"#.##")) : pend ? (pDir==1?"ARMED LONG "+f_letter(pG):"ARMED SHORT "+f_letter(pG)) : "Scanning", text_color=tOpen?color.aqua:pend?color.yellow:color.gray, text_size=size.small)
    table.cell(d, 0, 4, "── Backtest ──", text_color=color.new(#1e90ff,0), text_size=size.tiny)
    table.cell(d, 1, 4, str.tostring(total) + " trades", text_color=color.white, text_size=size.tiny)
    table.cell(d, 0, 5, "Win Rate", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 5, str.tostring(winRate,"#.#") + "%", text_color=winRate>=50?color.lime:color.orange, text_size=size.small)
    table.cell(d, 0, 6, "Profit Factor", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 6, str.tostring(pf,"#.##"), text_color=pf>=1.5?color.lime:pf>=1?color.orange:color.red, text_size=size.small)
    table.cell(d, 0, 7, "Expectancy", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 7, str.tostring(expR,"#.##") + " R/trade", text_color=expR>0?color.lime:color.red, text_size=size.small)
    table.cell(d, 0, 8, "Max Loss Streak", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 8, str.tostring(maxLossStreak), text_color=color.white, text_size=size.small)
    table.cell(d, 0, 9, "Wins / Losses", text_color=color.gray, text_size=size.small)
    table.cell(d, 1, 9, str.tostring(wins) + " / " + str.tostring(losses), text_color=color.white, text_size=size.small)`,
      steps: [
        'Paste into TradingView → Add to chart. For futures evals run it on NQ/ES/GC, 5m or 15m, with HTF Bias Timeframe = 1H',
        'It now ARMS on a setup (faint FVG box) then only fires once price RETURNS to the FVG and rejects — far fewer false signals. Turn this off via "Wait for FVG tap + rejection" if you want instant setup alerts',
        'Every signal is graded A+/A/B by how many confluences stack (PD-level sweep, big displacement, OTE, discount/premium, SMT, prime killzone, strong bias). Set "Minimum setup grade" to A+ only for the cleanest trades',
        'TRADE MANAGEMENT (the new part): after entry it tells you where to trail. At 1R you get a "move STOP to BREAKEVEN" alert, then "trail STOP to X" alerts as price runs — the orange line on the chart is your live stop. This lets winners run instead of capping at a fixed target',
        'Set the alert to "Any alert() function call" so you receive BOTH the entry AND the breakeven/trail/close management alerts on the same alert. Tune trail in ⑥ Trade Management (ATR × distance, breakeven R, min step)',
        'The dashboard backtest now records the ACTUAL R of each trailed exit (wins can be 3R, 5R+), so win rate + profit factor + expectancy reflect letting winners run — not a fixed RR. Screenshot it for your sales page',
        'AUTOTRADE MES: TradingView cannot place futures orders directly — you need a bridge. Open a Tradovate account (or connect your prop account), then sign up for a bridge: PickMyTrade (built for Topstep/Apex/TradeDay) or TradersPost',
        'In the indicator settings → set "Alert / webhook format" to "JSON - TradersPost" (or "JSON - Generic" for PickMyTrade field-mapping), set Contracts, and set Broker symbol override to your contract (e.g. MES1! or what your bridge expects)',
        'Create the TradingView alert: clock icon → Condition = "YN Finance — ICT 2022 Pro SIGNALS" → "Any alert() function call" → Once Per Bar Close → in Notifications paste your bridge Webhook URL',
        'The webhook fires a bracket order on every confirmed signal: market entry + stop-loss + take-profit, sized to your Contracts setting. The bridge routes it to your MES position automatically',
        'CHECK YOUR PROP FIRM RULES FIRST — Apex/Topstep/TradeDay each have automation policies; some require you to be present, some restrict bots. Violating them voids the account',
        'Manual execution still works: place a LIMIT at the entry, stop beyond the swept liquidity, TP1 50% → breakeven, runner to TP2. Silver Bullet (10-11 AM ET) is the highest-grade window. Skip 30 min around CPI/FOMC.',
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. ROSS CAMERON — VWAP GAP & GO
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'ross',
    instructor: 'Ross Cameron',
    strategy: 'VWAP Momentum — Gap & Go',
    tagline: 'Trade high-volume gap-up stocks reclaiming VWAP at the open',
    assets: ['US Stocks', 'Futures (ES, NQ)'],
    timeframes: ['1m', '2m', '5m'],
    propFirms: ['Topstep', 'Apex Trader Funding', 'TradeDay'],
    winTarget: '50–60%',
    riskPerTrade: '0.5%',
    color: '#00d4aa',
    init: 'RC',
    overview: 'Scans for stocks that gap up 5%+ premarket on 2x+ normal volume. Waits for price to pull back to VWAP after the open, then enters when VWAP is reclaimed with strong volume. Stop below VWAP, target is 3:1 reward.',
    propNotes: 'Best for futures prop firms (Topstep, Apex). On ES/NQ futures: run on 2m chart, gap threshold set to 0.3%. Morning session only — 9:30-11:30am ET. This strategy has the highest win rate in the first 30 minutes after open.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — Ross Cameron VWAP Momentum | Prop Edition",
  overlay        = true,
  max_bars_back  = 500,
  default_qty_type  = strategy.percent_of_equity,
  default_qty_value = 1,
  commission_type   = strategy.commission.percent,
  commission_value  = 0.01,
  slippage          = 2)

// ── INPUTS ────────────────────────────────────────────────────────
minGap     = input.float(0.3,  "Min Gap % (0.3 futures / 5.0 stocks)", minval=0.1, maxval=20.0, group="Strategy")
volMult    = input.float(1.5,  "Volume Multiplier",                     minval=1.0, maxval=5.0,  group="Strategy")
atrMult    = input.float(0.5,  "Stop Below VWAP (ATR ×)",              minval=0.1, maxval=2.0,  group="Strategy")
rrRatio    = input.float(3.0,  "R:R Ratio",                             minval=1.0, maxval=6.0,  group="Strategy")
useSession = input.bool(true,  "Morning session only (9:30-11:30 ET)",               group="Filters")
session    = input.session("0930-1130", "Trading Window",                             group="Filters")

// ── SESSION ───────────────────────────────────────────────────────
inSession  = not useSession or not na(time(timeframe.period, session, "America/New_York"))

// ── INTRADAY VWAP (resets each day, no premium plan required) ─────
var float cumPV  = 0.0
var float cumVol = 0.0
if timeframe.change("D")
    cumPV  := 0.0
    cumVol := 0.0
cumPV  += hlc3 * volume
cumVol += volume
vwap = cumVol > 0 ? cumPV / cumVol : close

// ── GAP DETECTION ─────────────────────────────────────────────────
var float prevDayClose = na
if timeframe.change("D")
    prevDayClose := close[1]
gapPct = na(prevDayClose) or prevDayClose <= 0 ? 0.0 : (open - prevDayClose) / prevDayClose * 100
gapUp  = gapPct >= minGap

// ── VOLUME ────────────────────────────────────────────────────────
avgVol     = ta.sma(volume, 20)
highVol    = volume > avgVol * volMult

// ── SIGNAL: VWAP RECLAIM AFTER GAP-UP ────────────────────────────
vwapReclaim = ta.crossover(close, vwap)
atr         = ta.atr(14)
longEntry   = gapUp and vwapReclaim and highVol and inSession and strategy.position_size == 0

// ── LEVELS ────────────────────────────────────────────────────────
longSL = vwap - atr * atrMult
longTP = close + (close - longSL) * rrRatio

// ── EXECUTE ───────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long", strategy.long)
    strategy.exit ("Exit", "Long", stop=longSL, limit=longTP)

// ── VISUALS ───────────────────────────────────────────────────────
vwapCol = close > vwap ? color.new(color.orange, 20) : color.new(color.orange, 60)
plot(vwap, "VWAP", vwapCol, 2)
bgcolor(gapUp and inSession ? color.new(color.teal, 93) : na, title="Gap-Up Session")
plotshape(longEntry, "BUY", shape.triangleup, location.belowbar, color.new(color.lime, 0), size=size.normal)`,
      mt5: `// YN Finance — Ross Cameron VWAP Momentum EA (MT5)
// Best on: US500, NAS100 (indices) — M5 chart — 9:30-11:30 ET only

#include <Trade\\Trade.mqh>
CTrade trade;

input double MinGapPct = 0.3;   // Min gap % (0.3 for indices)
input double VolMult   = 1.5;   // Volume multiplier
input double ATRMult   = 0.5;   // SL below VWAP
input double RRRatio   = 3.0;   // Take profit ratio

int atrH;

double CalcVWAP() {
   double cumPV = 0, cumVol = 0;
   MqlDateTime dt;
   datetime sessionStart = 0;
   for (int i = 0; i < 200; i++) {
      datetime t = iTime(_Symbol, PERIOD_CURRENT, i);
      TimeToStruct(t, dt);
      bool isOpen = (dt.hour == 14 && dt.min == 30) || (dt.hour == 13 && dt.min == 30);
      if (isOpen) { sessionStart = t; break; }
   }
   int startBar = (sessionStart > 0) ? iBarShift(_Symbol, PERIOD_CURRENT, sessionStart) : 50;
   for (int i = startBar; i >= 0; i--) {
      double hlc3 = (iHigh(_Symbol,PERIOD_CURRENT,i) + iLow(_Symbol,PERIOD_CURRENT,i) + iClose(_Symbol,PERIOD_CURRENT,i)) / 3;
      double vol  = (double)iVolume(_Symbol, PERIOD_CURRENT, i);
      cumPV  += hlc3 * vol;
      cumVol += vol;
   }
   return cumVol > 0 ? cumPV / cumVol : iClose(_Symbol, PERIOD_CURRENT, 0);
}

int OnInit() {
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   if (atrH == INVALID_HANDLE) return INIT_FAILED;
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { IndicatorRelease(atrH); }

void OnTick() {
   if (PositionsTotal() > 0) return;
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   int totalMin = dt.hour * 60 + dt.min;
   bool morning = (totalMin >= 13*60+30) && (totalMin < 16*60+30);
   if (!morning) return;

   double vwap  = CalcVWAP();
   double price = iClose(_Symbol, PERIOD_CURRENT, 0);
   double prev  = iClose(_Symbol, PERIOD_D1, 1);
   double gap   = prev > 0 ? (iOpen(_Symbol, PERIOD_CURRENT, 0) - prev) / prev * 100 : 0;

   double atr[1]; CopyBuffer(atrH, 0, 0, 1, atr);

   double sl    = vwap - atr[0] * ATRMult;
   double slDist = price - sl;
   if (slDist <= 0) return;
   double tp    = price + slDist * RRRatio;
   double risk  = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if (tickVal <= 0) tickVal = 1.0;
   double lots  = NormalizeDouble(risk / ((slDist / _Point) * tickVal), 2);
   lots = MathMax(0.01, MathMin(lots, 5.0));

   bool vwapReclaim = iClose(_Symbol,PERIOD_CURRENT,1) < vwap && price > vwap;
   if (gap >= MinGapPct && vwapReclaim && price > vwap)
      trade.Buy(lots, _Symbol, price, sl, tp, "RC VWAP Reclaim");
}`,
      steps: [
        'Open TradingView → set chart to ES1! (S&P futures) or NQ1! (Nasdaq) on a 2-minute or 5-minute timeframe',
        'Paste the auto script into Pine Script Editor → Add to chart → the orange VWAP line and gap detection will appear',
        'For futures prop firms (Topstep/Apex): Min Gap % stays at 0.3 in settings. For stocks: change to 5.0',
        'Green background = gap-up day during morning session. Triangle = VWAP reclaim signal with volume confirmation',
        'Connect to your broker via TradingView broker integration for auto-execution',
        'For Topstep: max 3 contracts on a $50K account. For Apex: follow their specific contract limits',
        'Stop trading by 11:30am ET — this strategy degrades significantly in the afternoon session',
        'If you get stopped out twice in one morning session, stop for the day',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Ross Cameron VWAP Momentum SIGNALS", overlay=true, max_bars_back=500)

// ── INPUTS ────────────────────────────────────────────────────────
minGap     = input.float(0.3,  "Min Gap % (0.3 futures / 5.0 stocks)", group="Strategy")
volMult    = input.float(1.5,  "Volume Multiplier",                     group="Strategy")
atrMult    = input.float(0.5,  "Stop Below VWAP (ATR ×)",              group="Strategy")
rrRatio    = input.float(3.0,  "R:R Ratio",                             group="Strategy")
useSession = input.bool(true,  "Morning session only",                  group="Filters")
session    = input.session("0930-1130", "Window",                        group="Filters")

// ── SESSION ───────────────────────────────────────────────────────
inSession = not useSession or not na(time(timeframe.period, session, "America/New_York"))

// ── INTRADAY VWAP ─────────────────────────────────────────────────
// Using the built-in, highly optimized v5 VWAP function
vwapVal = ta.vwap

// ── GAP DETECTION ─────────────────────────────────────────────────
var float prevDayClose = na
if timeframe.change("D")
    prevDayClose := close[1]
gapPct = na(prevDayClose) or prevDayClose <= 0 ? 0.0 : (open - prevDayClose) / prevDayClose * 100
gapUp  = gapPct >= minGap

// ── VOLUME + SIGNAL ───────────────────────────────────────────────
avgVol      = ta.sma(volume, 20)
highVol     = volume > avgVol * volMult
vwapReclaim = ta.crossover(close, vwapVal)
atr         = ta.atr(14)
signal      = gapUp and vwapReclaim and highVol and inSession and barstate.isconfirmed

// ── LEVELS ────────────────────────────────────────────────────────
sl = vwapVal - atr * atrMult
tp = close + (close - sl) * rrRatio

// ── ALERT ─────────────────────────────────────────────────────────
if signal
    alert("RC LONG | " + syminfo.ticker +
          " | Entry: " + str.tostring(close,    "#.##") +
          " | SL: "   + str.tostring(sl,       "#.##") +
          " | TP: "   + str.tostring(tp,       "#.##") +
          " | Gap: "  + str.tostring(gapPct,   "#.1") + "%", alert.freq_once_per_bar_close)

// ── PLOT ──────────────────────────────────────────────────────────
vwapCol = close > vwapVal ? color.new(color.orange, 20) : color.new(color.orange, 60)
plot(vwapVal, "VWAP", vwapCol, 2)
bgcolor(gapUp and inSession ? color.new(color.teal, 93) : na, title="Gap-Up Session")
plotshape(signal, "BUY", shape.triangleup, location.belowbar, color.new(color.lime, 0), size=size.normal)`,
      steps: [
        'Add the signals indicator to your 2m or 5m chart in TradingView',
        'Orange line = VWAP. Green background = gap-up day active during morning session',
        'Set alert: click the clock icon on the indicator → "RC VWAP RECLAIM" → Once Per Bar Close → enable mobile push',
        'When alert fires on your phone: open your prop firm platform and enter immediately at market',
        'Set stop loss just below the VWAP line shown on your chart. Target 3:1 reward (shown in alert)',
        'Signals only fire on bar CLOSE — no repainting. Safe for prop firm use.',
        'Only take this trade in the first 2 hours of US market open (9:30-11:30am ET)',
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 3. RAYNER TEO — 200 EMA PULLBACK
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'rayner',
    instructor: 'Rayner Teo',
    strategy: '200 EMA Trend + RSI Pullback',
    tagline: 'Ride the trend by buying pullbacks in uptrends, selling bounces in downtrends',
    assets: ['Forex', 'Indices', 'Crypto'],
    timeframes: ['4H', 'Daily'],
    propFirms: ['FTMO', 'E8 Funding', 'Funded Engineer', 'Alpha Capital'],
    winTarget: '45–55%',
    riskPerTrade: '0.5%',
    color: '#a855f7',
    init: 'RT',
    overview: 'Uses the 200 EMA as the primary trend filter. In an uptrend (price above 200 EMA), waits for RSI to pull back to oversold (30) then recover — that\'s the entry. In a downtrend, waits for RSI to reach overbought (70) then reject. Higher timeframe = fewer but higher quality trades.',
    propNotes: 'Best on 4H or Daily chart — fewer trades but higher quality. Perfect for swing trading prop accounts where you\'re not fighting daily drawdown limits. Pairs well with FTMO\'s aggressive account (10% drawdown). Run on EURUSD, GBPUSD, or major indices.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — Rayner Teo 200EMA Pullback | Prop Edition",
  overlay        = true,
  max_bars_back  = 500,
  default_qty_type  = strategy.percent_of_equity,
  default_qty_value = 1,
  commission_type   = strategy.commission.percent,
  commission_value  = 0.01,
  slippage          = 2)

// ── INPUTS ────────────────────────────────────────────────────────
emaLen  = input.int(200,  "Trend EMA Length",     minval=50,             group="Strategy")
rsiLen  = input.int(14,   "RSI Length",                                   group="Strategy")
rsiOS   = input.int(30,   "RSI Oversold Level",   minval=20, maxval=45,  group="Strategy")
rsiOB   = input.int(70,   "RSI Overbought Level", minval=55, maxval=80,  group="Strategy")
atrMult = input.float(2.0,"SL ATR Multiplier",    minval=0.5, maxval=4.0,group="Risk")
rrRatio = input.float(2.0,"R:R Ratio",            minval=1.0, maxval=5.0,group="Risk")

// ── INDICATORS ────────────────────────────────────────────────────
ema200 = ta.ema(close, emaLen)
rsi    = ta.rsi(close, rsiLen)
atr    = ta.atr(14)

// ── TREND ─────────────────────────────────────────────────────────
upTrend   = close > ema200
downTrend = close < ema200

// ── RSI PULLBACK ENTRIES ──────────────────────────────────────────
// Long: uptrend + RSI crossed back above oversold level (recovery from dip)
// Short: downtrend + RSI crossed back below overbought level (rejection from rally)
rsiLong  = ta.crossover (rsi, rsiOS)
rsiShort = ta.crossunder(rsi, rsiOB)

longEntry  = upTrend   and rsiLong  and strategy.position_size == 0
shortEntry = downTrend and rsiShort and strategy.position_size == 0

// ── STOPS & TARGETS (swing-based with ATR buffer) ─────────────────
swingLow  = ta.lowest (low,  5)
swingHigh = ta.highest(high, 5)
longSL    = swingLow  - atr * 0.3
longTP    = close + (close - longSL)  * rrRatio
shortSL   = swingHigh + atr * 0.3
shortTP   = close - (shortSL - close) * rrRatio

// ── EXECUTE ───────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long",  strategy.long)
    strategy.exit ("L-TP",  "Long",  stop=longSL,  limit=longTP)

if shortEntry
    strategy.entry("Short", strategy.short)
    strategy.exit ("S-TP",  "Short", stop=shortSL, limit=shortTP)

// ── VISUALS ───────────────────────────────────────────────────────
emaCol = upTrend ? color.new(color.green, 30) : color.new(color.red, 30)
plot(ema200, "200 EMA", emaCol, 3)
bgcolor(upTrend ? color.new(color.green, 97) : color.new(color.red, 97), title="Trend Zone")
plotshape(longEntry,  "BUY",  shape.triangleup,   location.belowbar, color.new(color.lime, 0), size=size.small)
plotshape(shortEntry, "SELL", shape.triangledown, location.abovebar, color.new(color.red,  0), size=size.small)`,
      mt5: `// YN Finance — Rayner Teo 200EMA Pullback EA (MT5)
#include <Trade\\Trade.mqh>
CTrade trade;

input int    EMALen   = 200;
input int    RSILen   = 14;
input int    RSI_OS   = 30;
input int    RSI_OB   = 70;
input double ATRMult  = 2.0;
input double RRRatio  = 2.0;

int emaH, rsiH, atrH;

int OnInit() {
   emaH = iMA (_Symbol, PERIOD_CURRENT, EMALen, 0, MODE_EMA, PRICE_CLOSE);
   rsiH = iRSI(_Symbol, PERIOD_CURRENT, RSILen, PRICE_CLOSE);
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   if (emaH == INVALID_HANDLE || rsiH == INVALID_HANDLE || atrH == INVALID_HANDLE) return INIT_FAILED;
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   IndicatorRelease(emaH);
   IndicatorRelease(rsiH);
   IndicatorRelease(atrH);
}

bool IsNewBar() {
   static datetime lastBar = 0;
   datetime current = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (current != lastBar) { lastBar = current; return true; }
   return false;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (!IsNewBar()) return;

   double ema[2], rsi[2], atr[1];
   CopyBuffer(emaH, 0, 0, 2, ema);
   CopyBuffer(rsiH, 0, 0, 2, rsi);
   CopyBuffer(atrH, 0, 0, 1, atr);

   double price   = iClose(_Symbol, PERIOD_CURRENT, 0);
   bool upTrend   = price > ema[0];
   bool downTrend = price < ema[0];
   bool rsiLong   = rsi[1] <= RSI_OS && rsi[0] > RSI_OS;
   bool rsiShort  = rsi[1] >= RSI_OB && rsi[0] < RSI_OB;

   double risk    = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double slDist  = atr[0] * ATRMult;
   double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if (tickVal <= 0) tickVal = 1.0;
   double lots = NormalizeDouble(risk / ((slDist / _Point) * tickVal), 2);
   lots = MathMax(0.01, MathMin(lots, 10.0));

   if (upTrend   && rsiLong)
      trade.Buy (lots, _Symbol, price, price - slDist, price + slDist * RRRatio, "RT Long");
   if (downTrend && rsiShort)
      trade.Sell(lots, _Symbol, price, price + slDist, price - slDist * RRRatio, "RT Short");
}`,
      steps: [
        'Use a 4H or Daily chart — this strategy is designed for swing trading, not scalping',
        'Paste the auto script → Add to chart → the 200 EMA appears (green = uptrend, red = downtrend)',
        'The algorithm only enters on bar close — no mid-candle noise',
        'For FTMO: keep R:R at 2.0 — you only need to win 34% of trades to be profitable',
        'For MetaTrader 5: compile the MQL5 code → attach EA to chart → enable AutoTrading',
        'Best pairs: EURUSD, GBPUSD, USDJPY on 4H chart',
        'Expected trade frequency: 3-8 trades per month per pair — this is normal. Do not force trades',
        'Pass phase tip: FTMO swing account (14% drawdown) is ideal — very comfortable for this strategy',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Rayner Teo 200EMA Pullback SIGNALS", overlay=true, max_bars_back=500)

// ── INPUTS ────────────────────────────────────────────────────────
emaLen  = input.int(200,   "EMA Length",        group="Strategy")
rsiLen  = input.int(14,    "RSI Length",        group="Strategy")
rsiOS   = input.int(30,    "RSI Oversold",      group="Strategy")
rsiOB   = input.int(70,    "RSI Overbought",    group="Strategy")
atrMult = input.float(2.0, "SL ATR Multiplier", group="Risk")
rrRatio = input.float(2.0, "R:R Ratio",         group="Risk")

// ── INDICATORS ────────────────────────────────────────────────────
ema200 = ta.ema(close, emaLen)
rsi    = ta.rsi(close, rsiLen)
atr    = ta.atr(14)

// ── TREND & SIGNALS ───────────────────────────────────────────────
upTrend   = close > ema200
downTrend = close < ema200
rsiLong   = ta.crossover(rsi, rsiOS)
rsiShort  = ta.crossunder(rsi, rsiOB)

// Only fire on confirmed bar close (no repainting)
longSig  = upTrend   and rsiLong  and barstate.isconfirmed
shortSig = downTrend and rsiShort and barstate.isconfirmed

// ── LEVELS ────────────────────────────────────────────────────────
swingLow  = ta.lowest(low,  5)
swingHigh = ta.highest(high, 5)
lSL = swingLow  - atr * 0.3
sSL = swingHigh + atr * 0.3
lTP = close + (close - lSL)  * rrRatio
sTP = close - (sSL - close)  * rrRatio

// ── ALERTS ────────────────────────────────────────────────────────
if longSig
    alert("RT LONG | " + syminfo.ticker +
          " | Entry: " + str.tostring(close, "#.#####") +
          " | SL: "   + str.tostring(lSL,   "#.#####") +
          " | TP: "   + str.tostring(lTP,   "#.#####"), alert.freq_once_per_bar_close)

if shortSig
    alert("RT SHORT | " + syminfo.ticker +
          " | Entry: " + str.tostring(close, "#.#####") +
          " | SL: "   + str.tostring(sSL,   "#.#####") +
          " | TP: "   + str.tostring(sTP,   "#.#####"), alert.freq_once_per_bar_close)

// ── PLOT ──────────────────────────────────────────────────────────
emaCol = upTrend ? color.new(color.green, 30) : color.new(color.red, 30)
plot(ema200, "200 EMA", emaCol, 3)
plotshape(longSig,  "LONG",  shape.triangleup,   location.belowbar, color.new(color.lime, 0), size=size.normal)
plotshape(shortSig, "SHORT", shape.triangledown, location.abovebar, color.new(color.red,  0), size=size.normal)`,
      steps: [
        'Add to a 4H or Daily chart on TradingView — works on any major forex pair or index',
        'Green triangle = long signal. Red triangle = short signal. Signals only appear on confirmed bar closes (no repainting)',
        'Set alerts: click the clock icon → "RT LONG PULLBACK" or "RT SHORT PULLBACK" → Once Per Bar Close',
        'Execute manually on your prop firm platform at the next candle open after the alert',
        'Use the exact SL and TP prices from the alert message — they are calculated from swing levels + ATR',
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 4. HUMBLED TRADER — BULL FLAG BREAKOUT
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'humbled',
    instructor: 'Humbled Trader',
    strategy: 'Bull Flag Breakout',
    tagline: 'Enter high-momentum breakouts after a clean flag consolidation with volume confirmation',
    assets: ['US Stocks', 'Futures'],
    timeframes: ['5m', '15m'],
    propFirms: ['Topstep', 'Apex Trader Funding', 'TradeDay', 'Earn2Trade'],
    winTarget: '55–65%',
    riskPerTrade: '0.5%',
    color: '#f59e0b',
    init: 'HT',
    overview: 'Detects a strong momentum pole (3%+ move in 5 bars with volume), followed by a tight flag consolidation (low-range bars), then enters on the breakout of the flag\'s high with volume confirmation. Targets the measured move (full pole height projected from breakout).',
    propNotes: 'Built for futures prop firms. On Topstep/Apex: use on ES or NQ 5m chart. Set flag duration to 3-8 bars. Morning session only (9:30-11:30am ET). The measured move target is aggressive — take 50% off at 1.5R and let the rest run.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — Humbled Trader Bull Flag | Prop Edition",
  overlay        = true,
  max_bars_back  = 500,
  default_qty_type  = strategy.percent_of_equity,
  default_qty_value = 1,
  commission_type   = strategy.commission.percent,
  commission_value  = 0.01,
  slippage          = 2)

// ── INPUTS ────────────────────────────────────────────────────────
poleMinPct  = input.float(3.0, "Min Pole Move %",          minval=1.0, maxval=10.0, group="Strategy")
flagMaxBars = input.int(8,     "Max Flag Duration (bars)",  minval=2,   maxval=20,   group="Strategy")
volMult     = input.float(1.5, "Breakout Volume Multiplier",minval=1.0, maxval=4.0,  group="Strategy")
atrSL       = input.float(1.0, "Stop ATR Below Flag Low",  minval=0.3, maxval=2.0,  group="Risk")
useSession  = input.bool(true, "Morning session only",                               group="Filters")
session     = input.session("0930-1130", "Window",                                   group="Filters")

// ── INDICATORS ────────────────────────────────────────────────────
atr       = ta.atr(14)
avgVol    = ta.sma(volume, 20)
inSession = not useSession or not na(time(timeframe.period, session, "America/New_York"))

// ── POLE DETECTION (strong 5-bar momentum move) ───────────────────
poleLen    = 5
poleReturn = (close - close[poleLen]) / close[poleLen] * 100
strongPole = poleReturn >= poleMinPct and volume[poleLen] > avgVol[poleLen] * 1.5

// ── FLAG DETECTION (tight consolidation after pole) ───────────────
isTightBar = (high - low) < atr * 0.6
var int flagCnt = 0
flagCnt   := isTightBar ? flagCnt + 1 : 0
validFlag  = flagCnt >= 2 and flagCnt <= flagMaxBars

// Use var bool to track if a valid pole was seen before this flag
// Avoids dynamic indexing (strongPole[flagCnt]) which Pine doesn't allow
var bool poleSeen = false
if strongPole and not isTightBar
    poleSeen := true
if not isTightBar and not strongPole
    poleSeen := false

// ── BREAKOUT ──────────────────────────────────────────────────────
// flagMaxBars is a simple int input — safe constant length for ta.highest
flagHigh  = ta.highest(high, flagMaxBars)
breakout  = close > flagHigh[1] and close[1] <= flagHigh[2] and volume > avgVol * volMult

longEntry = poleSeen and validFlag and breakout and inSession and strategy.position_size == 0

// ── LEVELS (measured move from pole) ─────────────────────────────
poleSize   = ta.highest(high, poleLen + flagMaxBars) - ta.lowest(low, poleLen + flagMaxBars)
flagLow    = ta.lowest(low, flagMaxBars)
stopLoss   = flagLow - atr * atrSL
takeProfit = close + poleSize

// ── EXECUTE ───────────────────────────────────────────────────────
if longEntry
    strategy.entry("Bull Flag", strategy.long)
    strategy.exit ("Exit", "Bull Flag", stop=stopLoss, limit=takeProfit)

// ── VISUALS ───────────────────────────────────────────────────────
bgcolor(validFlag  ? color.new(color.yellow, 91) : na, title="Flag Zone")
bgcolor(inSession  ? color.new(color.blue,   97) : na, title="Session")
plotshape(longEntry, "BUY", shape.triangleup, location.belowbar, color.new(color.lime, 0), size=size.normal)`,
      mt5: `// YN Finance — Humbled Trader Bull Flag EA (MT5)
#include <Trade\\Trade.mqh>
CTrade trade;

input double PoleMinPct = 3.0;
input int    FlagMax    = 8;
input double VolMult    = 1.5;
input double ATRStop    = 1.0;

int atrH;

int OnInit() {
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   if (atrH == INVALID_HANDLE) return INIT_FAILED;
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) { IndicatorRelease(atrH); }

bool IsNewBar() {
   static datetime last = 0;
   datetime t = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (t != last) { last = t; return true; }
   return false;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (!IsNewBar()) return;
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   int totalMin = dt.hour * 60 + dt.min;
   bool morning = (totalMin >= 13*60+30) && (totalMin < 16*60+0);
   if (!morning) return;

   double atr[1]; CopyBuffer(atrH, 0, 0, 1, atr);
   double c0 = iClose(_Symbol,PERIOD_CURRENT,0);
   double c5 = iClose(_Symbol,PERIOD_CURRENT,5);
   double poleMove = c5 > 0 ? (c0 - c5) / c5 * 100 : 0;
   if (poleMove < PoleMinPct) return;

   double range1 = iHigh(_Symbol,PERIOD_CURRENT,1) - iLow(_Symbol,PERIOD_CURRENT,1);
   double range2 = iHigh(_Symbol,PERIOD_CURRENT,2) - iLow(_Symbol,PERIOD_CURRENT,2);
   if (range1 > atr[0] * 0.6 || range2 > atr[0] * 0.6) return;

   double flagHigh = MathMax(iHigh(_Symbol,PERIOD_CURRENT,1), iHigh(_Symbol,PERIOD_CURRENT,2));
   if (c0 <= flagHigh) return;

   double flagLow = MathMin(iLow(_Symbol,PERIOD_CURRENT,1), iLow(_Symbol,PERIOD_CURRENT,2));
   double sl = flagLow - atr[0] * ATRStop;
   if (c0 - sl <= 0) return;

   double poleH = 0, poleL = 999999;
   for (int i = 0; i < 10; i++) {
      poleH = MathMax(poleH, iHigh(_Symbol,PERIOD_CURRENT,i));
      poleL = MathMin(poleL, iLow (_Symbol,PERIOD_CURRENT,i));
   }
   double tp      = c0 + (poleH - poleL);
   double risk    = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if (tickVal <= 0) tickVal = 1.0;
   double lots = NormalizeDouble(risk / (((c0 - sl) / _Point) * tickVal), 2);
   lots = MathMax(0.01, MathMin(lots, 5.0));

   trade.Buy(lots, _Symbol, c0, sl, tp, "Bull Flag Break");
}`,
      steps: [
        'Use on a 5-minute chart. Works best on gap-up stocks or ES/NQ futures in the morning session',
        'Paste script → Add to chart. Yellow background = valid flag detected. Green triangle = breakout confirmed',
        'The measured move target (full pole height) is aggressive — consider exiting 50% at 1.5R and trailing the rest',
        'For Topstep/Apex futures accounts: trade max 2-3 contracts per signal, never more',
        'Stop is placed below the flag low — if price returns to the flag, the setup is invalid',
        'Do NOT trade this after 11:30am ET — bull flag breakouts fail at much higher rates in the afternoon',
        'Pass phase tip: 3 winning flag trades in a week at 3:1 R:R covers most prop firm profit targets easily',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Humbled Trader Bull Flag SIGNALS", overlay=true, max_bars_back=500)

// ── INPUTS ────────────────────────────────────────────────────────
poleMinPct  = input.float(3.0, "Pole Min %",              group="Strategy")
flagMaxBars = input.int(8,     "Max Flag Bars",            group="Strategy")
volMult     = input.float(1.5, "Breakout Volume ×",        group="Strategy")
atrSL       = input.float(1.0, "Stop ATR Below Flag Low",  group="Risk")
useSession  = input.bool(true, "Morning only",             group="Filters")
session     = input.session("0930-1130", "Window",         group="Filters")

// ── INDICATORS ────────────────────────────────────────────────────
atr       = ta.atr(14)
avgVol    = ta.sma(volume, 20)
inSession = not useSession or not na(time(timeframe.period, session, "America/New_York"))

// ── POLE ──────────────────────────────────────────────────────────
poleReturn = (close - close[5]) / close[5] * 100
strongPole = poleReturn >= poleMinPct and volume[5] > avgVol[5] * 1.5

// ── FLAG ──────────────────────────────────────────────────────────
isTightBar = (high - low) < atr * 0.6
var int cnt = 0
cnt := isTightBar ? cnt + 1 : 0
validFlag  = cnt >= 2 and cnt <= flagMaxBars

var bool poleSeen = false
if strongPole and not isTightBar
    poleSeen := true
if not isTightBar and not strongPole
    poleSeen := false

// ── BREAKOUT ──────────────────────────────────────────────────────
flagHigh  = ta.highest(high, flagMaxBars)
breakout  = close > flagHigh[1] and close[1] <= flagHigh[2] and volume > avgVol * volMult
rawSignal = poleSeen and validFlag and breakout and inSession

// Confirm on bar close only (no repainting)
signal = rawSignal and barstate.isconfirmed

// ── LEVELS ────────────────────────────────────────────────────────
flagLow  = ta.lowest(low, flagMaxBars)
sl       = flagLow - atr * atrSL
poleSize = ta.highest(high, 5 + flagMaxBars) - ta.lowest(low, 5 + flagMaxBars)
tp       = close + poleSize

// ── ALERT ─────────────────────────────────────────────────────────
if signal
    alert("HT LONG | " + syminfo.ticker +
          " | Entry: " + str.tostring(close, "#.##") +
          " | SL: "   + str.tostring(sl,    "#.##") +
          " | TP: "   + str.tostring(tp,    "#.##") +
          " (Measured Move)", alert.freq_once_per_bar_close)

// ── PLOT ──────────────────────────────────────────────────────────
bgcolor(validFlag ? color.new(color.yellow, 91) : na, title="Flag Zone")
plotshape(signal, "BUY", shape.triangleup, location.belowbar, color.new(color.lime, 0), size=size.normal)`,
      steps: [
        'Add to 5m chart. Yellow zone = flag in progress. Green triangle = confirmed breakout',
        'Create alert: click the clock icon → "HT BULL FLAG BREAKOUT" → Once Per Bar Close → enable push notifications',
        'When alert fires: enter at market on next candle open on your prop platform',
        'Place stop below the flag low. Target the measured move (alert shows exact price)',
        'Take 50% profit at 1.5R — lock in progress, let the rest run to full target',
      ]
    }
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // 5. ANTON KREIL — INSTITUTIONAL RISK DASHBOARD
  // ─────────────────────────────────────────────────────────────────────────────
  {
    id: 'anton',
    instructor: 'Anton Kreil',
    strategy: 'Institutional Risk & Position Sizing System',
    tagline: 'The risk management framework that keeps professional traders alive — apply it to any strategy',
    assets: ['All Assets'],
    timeframes: ['Any'],
    propFirms: ['All Prop Firms'],
    winTarget: 'Strategy dependent',
    riskPerTrade: '0.25–0.5%',
    color: '#ec4899',
    init: 'AK',
    overview: 'This is not an entry strategy — it\'s the risk management layer that goes on top of any of the above. Implements the exact position sizing, portfolio heat management, and drawdown protection that institutional traders use. Includes a real-time dashboard showing your risk per trade, total portfolio heat, daily P&L, and remaining drawdown buffer.',
    propNotes: 'Apply this to every prop firm challenge. The dashboard tells you exactly how many contracts/lots to trade to hit your target without blowing the account. Never risk more than 0.5% per trade, never exceed 3% total open risk at once.',
    auto: {
      tradingview: `//@version=5
indicator("YN Finance — Anton Kreil Risk Management Dashboard",
  overlay       = false,
  max_bars_back = 500)

// ── INPUTS ────────────────────────────────────────────────────────
accountBal   = input.float(100000, "Account Balance ($)",         step=1000, group="Account")
riskPct      = input.float(0.5,   "Risk % Per Trade",            step=0.1,  group="Account")
maxHeatPct   = input.float(3.0,   "Max Portfolio Heat %",        step=0.5,  group="Account")
maxDailyDD   = input.float(4.0,   "Daily Drawdown Limit %",      step=0.5,  group="Account")
atrMult      = input.float(2.0,   "Your Stop Loss (ATR ×)",      step=0.1,  group="Strategy")
maxPos       = input.int(3,       "Max Concurrent Positions",     minval=1, maxval=10, group="Strategy")
propFirmName = input.string("FTMO","Prop Firm", options=["FTMO","Topstep","Apex","E8","Other"], group="Account")

// ── CALCULATIONS ─────────────────────────────────────────────────
atr          = ta.atr(14)
riskDollar   = accountBal * riskPct / 100
maxHeatAmt   = accountBal * maxHeatPct / 100
dailyLimit   = accountBal * maxDailyDD / 100
stopDistance = atr * atrMult
unitsToTrade = stopDistance > 0 ? riskDollar / stopDistance : 0
profit8pct   = accountBal * 0.08
profit10pct  = accountBal * 0.10

// ── DAILY P&L TRACKING ────────────────────────────────────────────
var float dayOpen = na
if timeframe.change("D")
    dayOpen := open
dayPnLPct = na(dayOpen) or dayOpen == 0 ? 0.0 : (close - dayOpen) / dayOpen * 100
dayPnLAmt = na(dayOpen) or dayOpen == 0 ? 0.0 : (close - dayOpen) / dayOpen * accountBal
dayStatus = dayPnLPct >= 0 ? "▲ UP " + str.tostring(math.abs(dayPnLPct),"#.##") + "%" : "▼ DOWN " + str.tostring(math.abs(dayPnLPct),"#.##") + "%"
remainingDD = dailyLimit + dayPnLAmt  // how much more you can lose today
ddColor = remainingDD > dailyLimit * 0.5 ? color.green : remainingDD > 0 ? color.orange : color.red

// ── DASHBOARD TABLE ───────────────────────────────────────────────
if barstate.islast
    var table t = table.new(position.top_right, 2, 13,
        bgcolor      = color.new(color.black, 10),
        border_color = color.new(color.gray, 70),
        border_width = 1,
        frame_color  = color.new(#ec4899, 60),
        frame_width  = 2)

    // Helper: header cell spanning both columns
    table.cell(t, 0, 0, "YN FINANCE — " + propFirmName + " RISK SYSTEM",
        text_color=color.new(#ec4899,0), bgcolor=color.new(#ec4899,85), text_size=size.small, text_halign=text.align_left)
    table.cell(t, 1, 0, "LIVE DASHBOARD",
        text_color=color.new(#ec4899,0), bgcolor=color.new(#ec4899,85), text_size=size.small, text_halign=text.align_right)

    table.cell(t, 0, 1,  "Risk Per Trade",     text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 1,  "$" + str.tostring(riskDollar,"#,###.##"),
        text_color=color.green, text_size=size.small)

    table.cell(t, 0, 2,  "Units to Trade",     text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 2,  str.tostring(math.round(unitsToTrade, 2)) + " units",
        text_color=color.green, text_size=size.small)

    table.cell(t, 0, 3,  "Stop Distance",      text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 3,  str.tostring(stopDistance,"#.#####") + " (" + str.tostring(atrMult,"#.#") + "× ATR)",
        text_color=color.white, text_size=size.small)

    table.cell(t, 0, 4,  "Max Portfolio Heat", text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 4,  "$" + str.tostring(maxHeatAmt,"#,###") + " (" + str.tostring(maxHeatPct,"#.#") + "%)",
        text_color=color.orange, text_size=size.small)

    table.cell(t, 0, 5,  "Daily DD Limit",     text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 5,  "$" + str.tostring(dailyLimit,"#,###") + " max loss",
        text_color=color.red, text_size=size.small)

    table.cell(t, 0, 6,  "Today's P&L",        text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 6,  dayStatus,
        text_color=dayPnLPct >= 0 ? color.green : color.red, text_size=size.small)

    table.cell(t, 0, 7,  "Remaining DD Buffer", text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 7,  "$" + str.tostring(math.max(0, remainingDD),"#,###") + " left today",
        text_color=ddColor, text_size=size.small)

    table.cell(t, 0, 8,  "Max Open Trades",    text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 8,  str.tostring(maxPos) + " simultaneous max",
        text_color=color.white, text_size=size.small)

    table.cell(t, 0, 9,  "Profit Target 8%",   text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 9,  "$" + str.tostring(profit8pct,"#,###"),
        text_color=color.green, text_size=size.small)

    table.cell(t, 0, 10, "Profit Target 10%",  text_color=color.gray,  text_size=size.small)
    table.cell(t, 1, 10, "$" + str.tostring(profit10pct,"#,###"),
        text_color=color.green, text_size=size.small)

    table.cell(t, 0, 11, "RULE 1",             text_color=color.orange, text_size=size.tiny)
    table.cell(t, 1, 11, "Stop if daily loss >= $" + str.tostring(dailyLimit,"#,###"),
        text_color=color.orange, text_size=size.tiny)

    table.cell(t, 0, 12, "RULE 2",             text_color=color.red,    text_size=size.tiny)
    table.cell(t, 1, 12, "Never have >" + str.tostring(maxPos) + " trades open at once",
        text_color=color.red, text_size=size.tiny)

// ── REFERENCE LINES ───────────────────────────────────────────────
plot(riskPct,    "Risk % Per Trade",  color.new(color.orange, 50), 1)
plot(maxHeatPct, "Max Heat %",        color.new(color.red,    50), 1)
hline(0, "Zero", color.new(color.gray, 80))`,
      mt5: `// Anton Kreil Risk Dashboard is TradingView-only (visual overlay).
// For MT5: use the built-in risk settings when placing each trade.
//
// FORMULA TO USE IN MT5 EVERY TIME:
//
// Lots = (Account Balance × Risk%) ÷ (Stop Loss in ticks × Tick Value)
//
// Example — EURUSD $100,000 account, 0.5% risk, 15-pip stop (5-digit broker):
// Stop ticks = 15 × 10 = 150 ticks  |  Tick value ≈ $1/lot/tick
// Lots = (100,000 × 0.005) ÷ (150 × 1) = 500 ÷ 150 = 3.33 lots
//
// GOLDEN RULES:
// 1. Never risk more than 0.5% per trade
// 2. Never exceed 3% total open risk (all positions combined)
// 3. If daily loss hits your DD limit — stop for the day, no exceptions`,
      steps: [
        'Add the Risk Dashboard to ANY chart — it works as an overlay on top of any strategy',
        'Enter your account balance, prop firm name, and the firm\'s daily drawdown limit in the settings',
        'The "Units to Trade" row shows exactly how many lots/contracts to use for your next trade based on current ATR',
        'The "Today\'s P&L" and "Remaining DD Buffer" rows update live — watch the buffer turn orange or red as a warning',
        'RULE 1: Stop trading the moment remaining DD buffer hits $0 — close everything and log off',
        'RULE 2: Never open a trade if total open risk would exceed the Max Portfolio Heat shown',
        'RULE 3: Units to Trade changes with ATR — check it before every single trade, not just once in the morning',
        'For FTMO $100K: risk $500/trade max, stop at $5,000 daily loss, never exceed $15,000 total open risk',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Anton Kreil Risk Calculator (Signal Version)", overlay=false)

// ── INPUTS ────────────────────────────────────────────────────────
accountBal = input.float(100000, "Account Balance ($)", step=1000)
riskPct    = input.float(0.5,   "Risk % Per Trade",    step=0.1)
atrMult    = input.float(2.0,   "Your Stop Loss ATR ×")
maxDailyDD = input.float(4.0,   "Daily DD Limit %")

// ── CALCULATIONS ─────────────────────────────────────────────────
atr          = ta.atr(14)
riskDollar   = accountBal * riskPct / 100
dailyLimit   = accountBal * maxDailyDD / 100
units        = atr * atrMult > 0 ? riskDollar / (atr * atrMult) : 0
unitsRounded = math.round(units, 2)

// Alert when position size changes materially (ATR shift)
var float lastUnits = na
sizeChanged = na(lastUnits) ? false : math.abs(unitsRounded - lastUnits) >= 0.1
if barstate.isconfirmed
    lastUnits := unitsRounded

// ── ALERTS ───────────────────────────────────────────────────────
if sizeChanged and barstate.isconfirmed
    alert("Risk Update | Trade: $" + str.tostring(riskDollar,       "#,###") +
          " | Units: "              + str.tostring(unitsRounded,     "#.##") +
          " | Daily Limit: $"       + str.tostring(dailyLimit,       "#,###") +
          " | Stop Dist: "          + str.tostring(atr * atrMult,    "#.#####"), alert.freq_once_per_bar_close)

// ── PLOTS ─────────────────────────────────────────────────────────
plot(units,       "Units to Trade",   color.new(color.teal,   0), 2)
plot(riskPct,     "Risk % Per Trade", color.new(color.orange, 0), 1)
plot(maxDailyDD,  "Daily DD Limit %", color.new(color.red,    0), 1)
hline(0, "Zero", color.new(color.gray, 70))`,
      steps: [
        'Add this calculator to any chart alongside your chosen signal indicator',
        'Before every trade: read the "Units to Trade" line — use exactly that many lots/contracts',
        'Set an alert on "Position Size Updated" to be notified when ATR shifts and your sizing needs to change',
        'Write on a sticky note: Today\'s max loss = account × DD%. Stop the moment you hit it.',
        'Combine with any other YN Finance signal indicator for a complete institutional-grade trading system',
      ]
    }
  }
]
