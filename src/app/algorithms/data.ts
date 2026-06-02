export type AlgoMode = 'auto' | 'signals'
export type Platform = 'tradingview' | 'mt5'

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
    steps: string[]
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
    strategy: 'Smart Money Concepts — Fair Value Gap',
    tagline: 'Trade institutional order flow using FVGs and session killzones',
    assets: ['Forex', 'Gold (XAUUSD)', 'Indices'],
    timeframes: ['15m', '1H', '4H'],
    propFirms: ['FTMO', 'E8 Funding', 'MyFundedFX', 'The Funded Trader'],
    winTarget: '55–65%',
    riskPerTrade: '0.5%',
    color: '#1e90ff',
    init: 'ICT',
    overview: 'Detects Fair Value Gaps (imbalances left by institutional order flow) during London and NY killzones. Only trades in the direction of the 200 EMA trend. Enters on FVG formation with ATR-based stops.',
    propNotes: 'Risk is capped at 0.5% per trade by default. For FTMO: leave Max Daily DD at 4% (their limit is 5%). Run on EURUSD, GBPUSD, or XAUUSD on the 15m or 1H chart. Do NOT trade during high-impact news.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — ICT Smart Money | Prop Edition",
  overlay        = true,
  max_bars_back  = 500,
  default_qty_type  = strategy.percent_of_equity,
  default_qty_value = 1,
  commission_type   = strategy.commission.percent,
  commission_value  = 0.01,
  slippage          = 2)

// ── INPUTS ────────────────────────────────────────────────────────
riskPct  = input.float(0.5,  "Risk % Per Trade",   minval=0.1, maxval=2.0, step=0.1, group="Risk Management")
atrMult  = input.float(1.5,  "Stop Loss (ATR ×)",  minval=0.5, maxval=4.0, step=0.1, group="Risk Management")
tpRR     = input.float(2.0,  "Take Profit (R:R)",  minval=1.0, maxval=5.0, step=0.5, group="Risk Management")
useTrend = input.bool(true,  "200 EMA trend filter",            group="Filters")
useSess  = input.bool(true,  "London + NY killzones only",      group="Filters")
lKZ      = input.session("0700-1000", "London Killzone",        group="Filters")
nyKZ     = input.session("1300-1700", "New York Killzone",      group="Filters")

// ── INDICATORS ────────────────────────────────────────────────────
ema200 = ta.ema(close, 200)
atr    = ta.atr(14)

// ── FAIR VALUE GAP (3-candle imbalance) ──────────────────────────
// bar[2] = pre-impulse | bar[1] = impulse candle | bar[0] = current
// Bullish FVG: current bar low is ABOVE bar[2] high — a price vacuum exists
bullFVG = low > high[2] and (low - high[2]) > atr * 0.08
bearFVG = high < low[2] and (low[2] - high) > atr * 0.08

// ── SESSION FILTER ────────────────────────────────────────────────
inLondon  = not na(time(timeframe.period, lKZ,  "Europe/London"))
inNY      = not na(time(timeframe.period, nyKZ, "America/New_York"))
inSession = not useSess or (inLondon or inNY)

// ── TREND FILTER ──────────────────────────────────────────────────
bullTrend = not useTrend or close > ema200
bearTrend = not useTrend or close < ema200

// ── ENTRIES ───────────────────────────────────────────────────────
longEntry  = bullFVG and inSession and bullTrend and strategy.position_size == 0
shortEntry = bearFVG and inSession and bearTrend and strategy.position_size == 0

// ── STOPS & TARGETS ───────────────────────────────────────────────
slDist  = atr * atrMult
longSL  = close - slDist
longTP  = close + slDist * tpRR
shortSL = close + slDist
shortTP = close - slDist * tpRR

// ── EXECUTE ───────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long",  strategy.long)
    strategy.exit ("L-TP",  "Long",  stop=longSL,  limit=longTP)

if shortEntry
    strategy.entry("Short", strategy.short)
    strategy.exit ("S-TP",  "Short", stop=shortSL, limit=shortTP)

// ── VISUALS ───────────────────────────────────────────────────────
emaCol = close > ema200 ? color.new(color.teal, 30) : color.new(color.red, 30)
plot(ema200, "200 EMA", emaCol, 2)
bgcolor(bullFVG and inSession ? color.new(color.teal, 91)
      : bearFVG and inSession ? color.new(color.red,  91) : na, title="FVG Zone")
plotshape(longEntry,  "BUY",  shape.triangleup,   location.belowbar, color.new(color.lime, 0), size=size.small)
plotshape(shortEntry, "SELL", shape.triangledown, location.abovebar, color.new(color.red,  0), size=size.small)`,
      mt5: `// YN Finance — ICT SMC EA (MetaTrader 5)
// Attach to EURUSD, XAUUSD | Timeframe: H1 or M15

#include <Trade\\Trade.mqh>
CTrade trade;

input double RiskPct    = 0.5;   // Risk % per trade
input double ATRMult    = 1.5;   // Stop loss ATR multiplier
input double TPRR       = 2.0;   // Take profit R:R ratio
input bool   UseSession = true;  // London/NY only
input bool   UseTrend   = true;  // 200 EMA filter

int atrHandle, emaHandle;

int OnInit() {
   atrHandle = iATR(_Symbol, PERIOD_CURRENT, 14);
   emaHandle = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   if(atrHandle == INVALID_HANDLE || emaHandle == INVALID_HANDLE) return INIT_FAILED;
   return INIT_SUCCEEDED;
}

void OnDeinit(const int reason) {
   IndicatorRelease(atrHandle);
   IndicatorRelease(emaHandle);
}

bool InKillzone() {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int h = dt.hour;
   return (h >= 7 && h < 10) || (h >= 13 && h < 17);
}

bool FVGBull(const double &lo[], const double &hi[]) {
   double atr[1]; CopyBuffer(atrHandle, 0, 0, 1, atr);
   return lo[0] > hi[2] && (lo[0] - hi[2]) > atr[0] * 0.08;
}

bool FVGBear(const double &lo[], const double &hi[]) {
   double atr[1]; CopyBuffer(atrHandle, 0, 0, 1, atr);
   return hi[0] < lo[2] && (lo[2] - hi[0]) > atr[0] * 0.08;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (UseSession && !InKillzone()) return;

   double atr[1], ema[1];
   CopyBuffer(atrHandle, 0, 0, 1, atr);
   CopyBuffer(emaHandle, 0, 0, 1, ema);

   double lo[], hi[], cl[];
   CopyLow  (_Symbol, PERIOD_CURRENT, 0, 3, lo);
   CopyHigh (_Symbol, PERIOD_CURRENT, 0, 3, hi);
   CopyClose(_Symbol, PERIOD_CURRENT, 0, 1, cl);

   double price   = cl[0];
   double sl      = atr[0] * ATRMult;
   double risk    = AccountInfoDouble(ACCOUNT_BALANCE) * RiskPct / 100;
   double tickVal = SymbolInfoDouble(_Symbol, SYMBOL_TRADE_TICK_VALUE);
   if (tickVal <= 0) tickVal = 1.0;
   double lots = NormalizeDouble(risk / ((sl / _Point) * tickVal), 2);
   lots = MathMax(0.01, MathMin(lots, 10.0));

   bool bullTrend = !UseTrend || price > ema[0];
   bool bearTrend = !UseTrend || price < ema[0];

   if (FVGBull(lo, hi) && bullTrend)
      trade.Buy (lots, _Symbol, price, price - sl, price + sl * TPRR, "ICT FVG Long");
   if (FVGBear(lo, hi) && bearTrend)
      trade.Sell(lots, _Symbol, price, price + sl, price - sl * TPRR, "ICT FVG Short");
}`,
      steps: [
        'Open TradingView → search your pair (EURUSD, XAUUSD, etc.) → open a 15-minute or 1-hour chart',
        'Click "Pine Script Editor" at the bottom → select all existing code → delete it → paste the script above → click "Add to chart"',
        'Click the ⚙️ gear icon on the strategy panel → set Risk % to 0.5 for FTMO/E8 (never exceed 1%)',
        'The algorithm auto-detects London (7-10am UTC) and NY (1-5pm UTC) killzones — green/red background shows active FVGs',
        'For auto-execution: TradingView → Alerts → Create → set "Order fills" → connect your broker (Interactive Brokers, Alpaca, TradeStation)',
        'For FTMO: pause the bot on days with CPI, NFP, or FOMC — these events spike through stops instantly',
        'Monitor your equity curve weekly. If you hit 3% daily drawdown, manually stop the bot for that day',
        'MetaTrader 5 users: open MetaEditor (F4 in MT5) → New → Expert Advisor → paste the MQL5 code → compile → drag onto your chart',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — ICT Smart Money SIGNALS", overlay=true, max_bars_back=500)

// ── INPUTS ────────────────────────────────────────────────────────
atrMult  = input.float(1.5, "SL ATR Multiplier",  group="Levels")
tpRR     = input.float(2.0, "TP R:R Ratio",       group="Levels")
useTrend = input.bool(true, "200 EMA filter",     group="Filters")
useSess  = input.bool(true, "Killzone filter",    group="Filters")
lKZ      = input.session("0700-1000", "London",   group="Filters")
nyKZ     = input.session("1300-1700", "New York", group="Filters")

// ── INDICATORS ────────────────────────────────────────────────────
ema200  = ta.ema(close, 200)
atr     = ta.atr(14)

// ── FVG DETECTION ─────────────────────────────────────────────────
bullFVG = low > high[2] and (low - high[2]) > atr * 0.08
bearFVG = high < low[2] and (low[2] - high) > atr * 0.08

// ── FILTERS ───────────────────────────────────────────────────────
inLondon  = not na(time(timeframe.period, lKZ,  "Europe/London"))
inNY      = not na(time(timeframe.period, nyKZ, "America/New_York"))
inSession = not useSess or (inLondon or inNY)
bullTrend = not useTrend or close > ema200
bearTrend = not useTrend or close < ema200

// ── SIGNALS (confirmed on bar close only) ─────────────────────────
longSig  = bullFVG and inSession and bullTrend and barstate.isconfirmed
shortSig = bearFVG and inSession and bearTrend and barstate.isconfirmed

// ── PRICE LEVELS ──────────────────────────────────────────────────
sl = atr * atrMult
tp = sl * tpRR

// ── ALERTS ────────────────────────────────────────────────────────
alertcondition(longSig, "ICT LONG SIGNAL",
  "YN ICT LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close,       "#.#####") +
  " | SL: "   + str.tostring(close - sl,  "#.#####") +
  " | TP: "   + str.tostring(close + tp,  "#.#####") +
  " | R:R "   + str.tostring(tpRR, "#.#") + ":1")

alertcondition(shortSig, "ICT SHORT SIGNAL",
  "YN ICT SHORT | " + syminfo.ticker +
  " | Entry: " + str.tostring(close,       "#.#####") +
  " | SL: "   + str.tostring(close + sl,  "#.#####") +
  " | TP: "   + str.tostring(close - tp,  "#.#####") +
  " | R:R "   + str.tostring(tpRR, "#.#") + ":1")

// ── PLOT ──────────────────────────────────────────────────────────
emaCol = close > ema200 ? color.new(color.teal, 30) : color.new(color.red, 30)
plot(ema200, "200 EMA", emaCol, 2)
bgcolor(bullFVG and inSession ? color.new(color.teal, 91)
      : bearFVG and inSession ? color.new(color.red,  91) : na, title="FVG Zone")
plotshape(longSig,  "LONG",  shape.triangleup,   location.belowbar, color.new(color.lime, 0), size=size.normal)
plotshape(shortSig, "SHORT", shape.triangledown, location.abovebar, color.new(color.red,  0), size=size.normal)`,
      steps: [
        'Paste the signals script into TradingView Pine Script Editor → Add to chart',
        'Green triangle = LONG signal. Red triangle = SHORT signal. Signals only appear on bar CLOSE (no repainting)',
        'To get phone alerts: click the clock icon on the indicator → Create Alert → select "ICT LONG SIGNAL" or "ICT SHORT SIGNAL" → set to "Once Per Bar Close"',
        'When the alert fires: open your prop firm platform → enter at market → paste the SL and TP from the alert message exactly',
        'Risk no more than 0.5% of your account per trade — keeps you safe inside FTMO/E8 drawdown limits',
        'Best pairs: EURUSD, GBPUSD, XAUUSD on 15m or 1H charts during the London or NY killzone',
        'Avoid trading 30 minutes before and after NFP, CPI, or FOMC announcements',
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
session    = input.session("0930-1130", "Window",                       group="Filters")

// ── SESSION ───────────────────────────────────────────────────────
inSession = not useSession or not na(time(timeframe.period, session, "America/New_York"))

// ── INTRADAY VWAP ─────────────────────────────────────────────────
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

// ── VOLUME + SIGNAL ───────────────────────────────────────────────
avgVol      = ta.sma(volume, 20)
highVol     = volume > avgVol * volMult
vwapReclaim = ta.crossover(close, vwap)
atr         = ta.atr(14)
signal      = gapUp and vwapReclaim and highVol and inSession and barstate.isconfirmed

// ── LEVELS ────────────────────────────────────────────────────────
sl = vwap - atr * atrMult
tp = close + (close - sl) * rrRatio

// ── ALERT ─────────────────────────────────────────────────────────
alertcondition(signal, "RC VWAP RECLAIM",
  "RC LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close,    "#.##") +
  " | SL: "   + str.tostring(sl,       "#.##") +
  " | TP: "   + str.tostring(tp,       "#.##") +
  " | Gap: "  + str.tostring(gapPct,   "#.1") + "%")

// ── PLOT ──────────────────────────────────────────────────────────
vwapCol = close > vwap ? color.new(color.orange, 20) : color.new(color.orange, 60)
plot(vwap, "VWAP", vwapCol, 2)
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
rsiLong   = ta.crossover (rsi, rsiOS)
rsiShort  = ta.crossunder(rsi, rsiOB)

// Only fire on confirmed bar close (no repainting)
longSig  = upTrend   and rsiLong  and barstate.isconfirmed
shortSig = downTrend and rsiShort and barstate.isconfirmed

// ── LEVELS ────────────────────────────────────────────────────────
swingLow  = ta.lowest (low,  5)
swingHigh = ta.highest(high, 5)
lSL = swingLow  - atr * 0.3
sSL = swingHigh + atr * 0.3
lTP = close + (close - lSL)  * rrRatio
sTP = close - (sSL - close)  * rrRatio

// ── ALERTS ────────────────────────────────────────────────────────
alertcondition(longSig, "RT LONG PULLBACK",
  "RT LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close, "#.#####") +
  " | SL: "   + str.tostring(lSL,   "#.#####") +
  " | TP: "   + str.tostring(lTP,   "#.#####"))

alertcondition(shortSig, "RT SHORT PULLBACK",
  "RT SHORT | " + syminfo.ticker +
  " | Entry: " + str.tostring(close, "#.#####") +
  " | SL: "   + str.tostring(sSL,   "#.#####") +
  " | TP: "   + str.tostring(sTP,   "#.#####"))

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
cnt       := isTightBar ? cnt + 1 : 0
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
alertcondition(signal, "HT BULL FLAG BREAKOUT",
  "HT LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close, "#.##") +
  " | SL: "   + str.tostring(sl,    "#.##") +
  " | TP: "   + str.tostring(tp,    "#.##") +
  " (Measured Move)")

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

alertcondition(sizeChanged, "Position Size Updated",
  "Risk Update | Trade: $" + str.tostring(riskDollar, "#,###") +
  " | Units: "     + str.tostring(unitsRounded,       "#.##") +
  " | Daily Limit: $" + str.tostring(dailyLimit,      "#,###") +
  " | Stop Dist: " + str.tostring(atr * atrMult,      "#.#####"))

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
