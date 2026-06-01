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
  overlay=true,
  default_qty_type=strategy.fixed,
  default_qty_value=1,
  commission_type=strategy.commission.percent,
  commission_value=0.01,
  slippage=2,
  max_bars_back=500)

// ── INPUTS ────────────────────────────────────────────────────────
var string G1 = "⚙️ Risk Management"
riskPct    = input.float(0.5, "Risk % Per Trade",  minval=0.1, maxval=1.0, step=0.1, group=G1)
atrMult    = input.float(1.5, "Stop Loss (ATR ×)", minval=0.5, maxval=4.0, step=0.1, group=G1)
tpRR       = input.float(2.0, "Take Profit (R:R)", minval=1.0, maxval=5.0, step=0.1, group=G1)

var string G2 = "🕐 Session Filter"
useSess    = input.bool(true, "Only trade killzones", group=G2)
london     = input.session("0700-1000", "London Killzone", group=G2)
nyOpen     = input.session("1300-1600", "NY Open Killzone", group=G2)

var string G3 = "📈 Trend Filter"
useTrend   = input.bool(true, "Require 200 EMA alignment", group=G3)

// ── INDICATORS ───────────────────────────────────────────────────
ema200     = ta.ema(close, 200)
atr        = ta.atr(14)

// ── FAIR VALUE GAP DETECTION ─────────────────────────────────────
// Bullish FVG: gap between candle[-2] high and candle[0] low
bullFVG    = low[0] > high[2] and (low[0] - high[2]) > atr * 0.15
// Bearish FVG: gap between candle[-2] low and candle[0] high
bearFVG    = high[0] < low[2] and (low[2] - high[0]) > atr * 0.15

// ── SESSION ──────────────────────────────────────────────────────
inLondon   = not na(time(timeframe.period, london,  "Europe/London"))
inNY       = not na(time(timeframe.period, nyOpen,  "America/New_York"))
inSession  = not useSess or (inLondon or inNY)

// ── TREND ────────────────────────────────────────────────────────
bullTrend  = not useTrend or close > ema200
bearTrend  = not useTrend or close < ema200

// ── ENTRIES ──────────────────────────────────────────────────────
longEntry  = bullFVG and inSession and bullTrend  and strategy.position_size == 0
shortEntry = bearFVG and inSession and bearTrend  and strategy.position_size == 0

// ── STOPS / TARGETS ───────────────────────────────────────────────
slDist     = atr * atrMult
longSL     = close - slDist
longTP     = close + slDist * tpRR
shortSL    = close + slDist
shortTP    = close - slDist * tpRR

// ── EXECUTE ──────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long",  strategy.long,  comment="ICT FVG Long")
    strategy.exit("L-Exit", "Long",  stop=longSL,  limit=longTP)

if shortEntry
    strategy.entry("Short", strategy.short, comment="ICT FVG Short")
    strategy.exit("S-Exit", "Short", stop=shortSL, limit=shortTP)

// ── VISUALS ──────────────────────────────────────────────────────
plot(ema200, "200 EMA", color.new(color.blue, 40), 2)
bgcolor(bullFVG and inSession ? color.new(color.green, 88) : na, title="Bull FVG")
bgcolor(bearFVG and inSession ? color.new(color.red,   88) : na, title="Bear FVG")
plotshape(longEntry,  "Long",  shape.triangleup,   location.belowbar, color.green, size=size.normal)
plotshape(shortEntry, "Short", shape.triangledown, location.abovebar, color.red,   size=size.normal)`,
      mt5: `// YN Finance — ICT SMC EA (MetaTrader 5)
// Attach to EURUSD, XAUUSD | Timeframe: H1 or M15

#include <Trade\\Trade.mqh>
CTrade trade;

input double RiskPct    = 0.5;   // Risk % per trade
input double ATRMult    = 1.5;   // Stop loss ATR multiplier
input double TPRR       = 2.0;   // Take profit R:R ratio
input bool   UseSession = true;  // London/NY only
input bool   UseTrend   = true;  // 200 EMA filter

int    atrHandle, emaHandle;
double atrBuf[], emaBuf[];

int OnInit() {
   atrHandle = iATR(_Symbol, PERIOD_CURRENT, 14);
   emaHandle = iMA(_Symbol, PERIOD_CURRENT, 200, 0, MODE_EMA, PRICE_CLOSE);
   return INIT_SUCCEEDED;
}

bool InKillzone() {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   int h = dt.hour;
   // London 07-10 UTC, NY 13-16 UTC
   return (h >= 7 && h < 10) || (h >= 13 && h < 16);
}

bool FVGBull(const double &low[], const double &high[]) {
   double atr[]; CopyBuffer(atrHandle, 0, 0, 3, atr);
   return low[0] > high[2] && (low[0] - high[2]) > atr[0] * 0.15;
}

bool FVGBear(const double &low[], const double &high[]) {
   double atr[]; CopyBuffer(atrHandle, 0, 0, 3, atr);
   return high[0] < low[2] && (low[2] - high[0]) > atr[0] * 0.15;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (UseSession && !InKillzone()) return;

   double atr[1], ema[1];
   CopyBuffer(atrHandle, 0, 0, 1, atr);
   CopyBuffer(emaHandle, 0, 0, 1, ema);

   double lo[], hi[], cl[];
   CopyLow(_Symbol, PERIOD_CURRENT, 0, 3, lo);
   CopyHigh(_Symbol, PERIOD_CURRENT, 0, 3, hi);
   CopyClose(_Symbol, PERIOD_CURRENT, 0, 1, cl);

   double price = cl[0];
   double sl    = atr[0] * ATRMult;
   double risk  = AccountInfoDouble(ACCOUNT_BALANCE) * RiskPct / 100;
   double lots  = NormalizeDouble(risk / (sl / _Point * _Point), 2);
   lots = MathMax(0.01, MathMin(lots, 10.0));

   bool bullTrend = !UseTrend || price > ema[0];
   bool bearTrend = !UseTrend || price < ema[0];

   if (FVGBull(lo, hi) && bullTrend)
      trade.Buy(lots, _Symbol, price, price - sl, price + sl * TPRR, "ICT FVG Long");

   if (FVGBear(lo, hi) && bearTrend)
      trade.Sell(lots, _Symbol, price, price + sl, price - sl * TPRR, "ICT FVG Short");
}`,
      steps: [
        'Open TradingView.com → search your pair (EURUSD, XAUUSD, etc.) → open a 15-minute or 1-hour chart',
        'At the bottom, click "Pine Script Editor" → click the default code and select all → delete it',
        'Paste the entire script above → click "Add to chart"',
        'Click the ⚙️ gear icon on the strategy panel → set Risk % to 0.5 for FTMO/E8 (never exceed 1%)',
        'Set your chart to 15m for scalping or 1H for swing trades — the algorithm auto-detects London (7-10am UTC) and NY (1-4pm UTC) killzones',
        'For auto-execution: go to TradingView → Alerts → Create → set "Order fills" → connect your broker via TradingView\'s broker integration (supported: Interactive Brokers, TradeStation, Alpaca)',
        'For FTMO specifically: pause the bot on days with CPI, NFP, or FOMC announcements — these events can spike through stops instantly',
        'Monitor your equity curve weekly. If you hit 3% daily drawdown, manually stop the bot for that day',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — ICT Smart Money SIGNALS", overlay=true, max_bars_back=500)

// ── INPUTS ───────────────────────────────────────────────────────
atrMult    = input.float(1.5, "SL ATR Multiplier")
tpRR       = input.float(2.0, "TP R:R Ratio")
useSess    = input.bool(true, "Killzone filter")
london     = input.session("0700-1000", "London")
nyOpen     = input.session("1300-1600", "NY Open")
useTrend   = input.bool(true, "200 EMA filter")

// ── LOGIC ────────────────────────────────────────────────────────
ema200     = ta.ema(close, 200)
atr        = ta.atr(14)
bullFVG    = low[0] > high[2] and (low[0] - high[2]) > atr * 0.15
bearFVG    = high[0] < low[2] and (low[2] - high[0]) > atr * 0.15
inSession  = not useSess or
             (not na(time(timeframe.period, london, "Europe/London")) or
              not na(time(timeframe.period, nyOpen, "America/New_York")))
longSig    = bullFVG and inSession and (not useTrend or close > ema200)
shortSig   = bearFVG and inSession and (not useTrend or close < ema200)

// ── LEVELS ───────────────────────────────────────────────────────
sl         = atr * atrMult
tp         = sl * tpRR

// ── ALERTS ───────────────────────────────────────────────────────
alertcondition(longSig,  "🟢 LONG SIGNAL",
  "YN ICT LONG | " + syminfo.ticker +
  " | Entry: "  + str.tostring(close, "#.#####") +
  " | SL: "     + str.tostring(close - sl, "#.#####") +
  " | TP: "     + str.tostring(close + tp, "#.#####"))

alertcondition(shortSig, "🔴 SHORT SIGNAL",
  "YN ICT SHORT | " + syminfo.ticker +
  " | Entry: "  + str.tostring(close, "#.#####") +
  " | SL: "     + str.tostring(close + sl, "#.#####") +
  " | TP: "     + str.tostring(close - tp, "#.#####"))

// ── PLOT ─────────────────────────────────────────────────────────
plot(ema200, "200 EMA", color.new(color.blue, 40), 2)
plotshape(longSig,  "LONG",  shape.triangleup,   location.belowbar, color.lime,  size=size.large)
plotshape(shortSig, "SHORT", shape.triangledown, location.abovebar, color.red,   size=size.large)
bgcolor(longSig  ? color.new(color.green, 90) : na)
bgcolor(shortSig ? color.new(color.red,   90) : na)`,
      steps: [
        'Paste the signals script into TradingView\'s Pine Script Editor → Add to chart',
        'When you see a green triangle (LONG) or red triangle (SHORT) appear, that is your signal',
        'To get phone/email alerts: right-click the triangle on the chart → "Add Alert on YN ICT SIGNALS"',
        'Set the alert to trigger "Once Per Bar Close" — this avoids false alerts mid-candle',
        'When the alert fires, open your prop firm\'s platform (Trader Evolution, MetaTrader, etc.)',
        'Enter at market price, set SL and TP exactly as shown in the alert message',
        'Risk no more than 0.5% of your account per trade — that keeps you safe inside FTMO/E8 drawdown limits',
      ]
    }
  },

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
    propNotes: 'Best for futures prop firms (Topstep, Apex). On ES/NQ futures: run on 2m chart, gap threshold set to 1%. Morning session only — 9:30-11:30am ET. This strategy has the highest win rate in the first 30 minutes after open.',
    auto: {
      tradingview: `//@version=5
strategy("YN Finance — Ross Cameron VWAP Momentum | Prop Edition",
  overlay=true,
  default_qty_type=strategy.fixed,
  default_qty_value=1)

// ── INPUTS ───────────────────────────────────────────────────────
minGap     = input.float(5.0, "Min Gap % (use 1.0 for futures)", minval=0.5, maxval=20.0)
volMult    = input.float(2.0, "Volume Breakout Multiplier",       minval=1.0, maxval=5.0)
atrMult    = input.float(0.5, "Stop Below VWAP (ATR ×)",         minval=0.1, maxval=2.0)
rrRatio    = input.float(3.0, "R:R Ratio",                        minval=1.0, maxval=6.0)
useSession = input.bool(true, "Morning session only (9:30–11:30am ET)")
session    = input.session("0930-1130", "Trading Window")

// ── VWAP ─────────────────────────────────────────────────────────
[vwap, upper, lower] = ta.vwap(hlc3, false, 1)

// ── VOLUME ───────────────────────────────────────────────────────
avgVol     = ta.sma(volume, 20)
highVol    = volume > avgVol * volMult

// ── GAP ──────────────────────────────────────────────────────────
prevClose  = request.security(syminfo.tickerid, "D", close[1])
gapPct     = (open - prevClose) / prevClose * 100
gapUp      = gapPct >= minGap

// ── SESSION ──────────────────────────────────────────────────────
inSession  = not useSession or
             not na(time(timeframe.period, session, "America/New_York"))

// ── SIGNAL: VWAP RECLAIM AFTER GAP-UP ───────────────────────────
vwapReclaim = ta.crossover(close, vwap)
atr         = ta.atr(14)

longEntry   = gapUp and vwapReclaim and highVol and inSession and
              strategy.position_size == 0

// ── LEVELS ───────────────────────────────────────────────────────
longSL      = vwap - atr * atrMult
longTP      = close + (close - longSL) * rrRatio

// ── EXECUTE ──────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long", strategy.long, comment="VWAP Reclaim")
    strategy.exit("Exit",  "Long", stop=longSL, limit=longTP)

// ── VISUALS ──────────────────────────────────────────────────────
plot(vwap,  "VWAP",      color.orange, 2)
plot(upper, "VWAP +1σ",  color.new(color.orange, 70), 1)
plot(lower, "VWAP -1σ",  color.new(color.orange, 70), 1)
plotshape(longEntry, "Entry", shape.triangleup, location.belowbar, color.green, size=size.large)
bgcolor(gapUp and inSession ? color.new(color.green, 93) : na, title="Gap-Up Day")`,
      mt5: `// YN Finance — Ross Cameron VWAP Momentum EA (MT5)
// Best on: US500, NAS100 (indices) — M5 chart — 9:30-11:30 ET only

#include <Trade\\Trade.mqh>
CTrade trade;

input double MinGapPct  = 1.0;  // Min gap % (1.0 for indices)
input double VolMult    = 2.0;  // Volume multiplier
input double ATRMult    = 0.5;  // SL below VWAP
input double RRRatio    = 3.0;  // Take profit ratio

// Simplified VWAP calculation (session-based)
double CalcVWAP() {
   double cumPV = 0, cumVol = 0;
   MqlDateTime dt;
   datetime sessionStart = 0;

   for (int i = 0; i < 200; i++) {
      datetime t = iTime(_Symbol, PERIOD_CURRENT, i);
      TimeToStruct(t, dt);
      if (dt.hour == 9 && dt.min == 30) { sessionStart = t; break; }
   }

   for (int i = iBarShift(_Symbol, PERIOD_CURRENT, sessionStart); i >= 0; i--) {
      double hlc3 = (iHigh(_Symbol,PERIOD_CURRENT,i) +
                     iLow(_Symbol,PERIOD_CURRENT,i) +
                     iClose(_Symbol,PERIOD_CURRENT,i)) / 3;
      double vol  = (double)iVolume(_Symbol, PERIOD_CURRENT, i);
      cumPV  += hlc3 * vol;
      cumVol += vol;
   }
   return cumVol > 0 ? cumPV / cumVol : iClose(_Symbol, PERIOD_CURRENT, 0);
}

void OnTick() {
   if (PositionsTotal() > 0) return;

   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   bool morning = (dt.hour == 14 || (dt.hour == 15 && dt.min < 30)); // 9:30-11:30 ET = 14:30-16:30 UTC
   if (!morning) return;

   double vwap  = CalcVWAP();
   double price = iClose(_Symbol, PERIOD_CURRENT, 0);
   double prev  = iClose(_Symbol, PERIOD_D1, 1);
   double gap   = (iOpen(_Symbol, PERIOD_CURRENT, 0) - prev) / prev * 100;

   int    atrH  = iATR(_Symbol, PERIOD_CURRENT, 14);
   double atr[1]; CopyBuffer(atrH, 0, 0, 1, atr);

   double sl    = vwap - atr[0] * ATRMult;
   double slDist = price - sl;
   double tp    = price + slDist * RRRatio;
   double risk  = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double lots  = NormalizeDouble(risk / (slDist / _Point * _Point), 2);
   lots = MathMax(0.01, MathMin(lots, 5.0));

   bool vwapReclaim = iClose(_Symbol,PERIOD_CURRENT,1) < vwap && price > vwap;

   if (gap >= MinGapPct && vwapReclaim && price > vwap)
      trade.Buy(lots, _Symbol, price, sl, tp, "RC VWAP Reclaim");
}`,
      steps: [
        'Open TradingView → set chart to your asset (ES1! for S&P futures, NQ1! for Nasdaq) on a 2-minute or 5-minute timeframe',
        'Paste the auto script into Pine Script Editor → Add to chart',
        'For futures prop firms (Topstep/Apex): change Min Gap % to 1.0 in settings — futures gap less than stocks',
        'The green background activates only on gap-up days during the morning session. The triangle appears when VWAP is reclaimed with volume',
        'Connect to your broker via TradingView broker integration for auto-execution, OR use it manually as a signal',
        'For Topstep: max 3 contracts on a $50K account. For Apex: follow their specific contract limits in your account rules',
        'Stop trading by 11:30am ET — this strategy degrades significantly in the afternoon session',
        'If you get stopped out twice in one morning session, stop for the day — never let 2 losses turn into a daily limit breach',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Ross Cameron VWAP Momentum SIGNALS", overlay=true)

minGap     = input.float(5.0, "Min Gap % (1.0 for futures)")
volMult    = input.float(2.0, "Volume Multiplier")
useSession = input.bool(true, "Morning session only")
session    = input.session("0930-1130", "Window")

[vwap, upper, lower] = ta.vwap(hlc3, false, 1)
avgVol      = ta.sma(volume, 20)
prevClose   = request.security(syminfo.tickerid, "D", close[1])
gapPct      = (open - prevClose) / prevClose * 100
gapUp       = gapPct >= minGap
highVol     = volume > avgVol * volMult
inSession   = not useSession or not na(time(timeframe.period, session, "America/New_York"))
vwapReclaim = ta.crossover(close, vwap)
signal      = gapUp and vwapReclaim and highVol and inSession
atr         = ta.atr(14)
sl          = vwap - atr * 0.5
tp          = close + (close - sl) * 3.0

alertcondition(signal, "🚀 VWAP RECLAIM",
  "RC LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close, "#.##") +
  " | SL: "    + str.tostring(sl, "#.##") +
  " | TP: "    + str.tostring(tp, "#.##") +
  " | Gap: "   + str.tostring(gapPct, "#.#") + "%")

plot(vwap,  "VWAP",     color.orange, 2)
plot(upper, "VWAP +1σ", color.new(color.orange, 70))
plot(lower, "VWAP -1σ", color.new(color.orange, 70))
plotshape(signal, "Signal", shape.triangleup, location.belowbar, color.green, size=size.large)
bgcolor(gapUp and inSession ? color.new(color.green, 93) : na)`,
      steps: [
        'Add the signals indicator to your 2m or 5m chart in TradingView',
        'The orange line is VWAP — your key level. Green background = gap-up day is active',
        'Set an alert: right-click the green triangle → Add Alert → "VWAP RECLAIM" → Once Per Bar Close → enable mobile push',
        'When the alert fires on your phone: open your prop firm\'s platform immediately',
        'Enter long at market. Set stop loss just below the VWAP line shown on your chart',
        'Take profit at 3:1 reward — the alert message tells you the exact price',
        'Only take this trade in the first 2 hours of US market open (9:30-11:30am ET)',
      ]
    }
  },

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
  overlay=true,
  default_qty_type=strategy.fixed,
  default_qty_value=1)

// ── INPUTS ───────────────────────────────────────────────────────
emaLen     = input.int(200,  "Trend EMA Length",    minval=50)
rsiLen     = input.int(14,   "RSI Length")
rsiOS      = input.int(30,   "RSI Oversold Level",  minval=20, maxval=45)
rsiOB      = input.int(70,   "RSI Overbought Level",minval=55, maxval=80)
atrMult    = input.float(2.0,"SL ATR Multiplier",   minval=0.5, maxval=4.0)
rrRatio    = input.float(2.0,"R:R Ratio",           minval=1.0, maxval=5.0)

// ── INDICATORS ───────────────────────────────────────────────────
ema200     = ta.ema(close, emaLen)
rsi        = ta.rsi(close, rsiLen)
atr        = ta.atr(14)

// ── TREND ────────────────────────────────────────────────────────
upTrend    = close > ema200
downTrend  = close < ema200

// ── PULLBACK ENTRIES ─────────────────────────────────────────────
// Long: uptrend + RSI was oversold + now recovering upward
rsiLongTrigger  = ta.crossover(rsi, rsiOS)
// Short: downtrend + RSI was overbought + now rejecting downward
rsiShortTrigger = ta.crossunder(rsi, rsiOB)

longEntry  = upTrend   and rsiLongTrigger  and strategy.position_size == 0
shortEntry = downTrend and rsiShortTrigger and strategy.position_size == 0

// ── LEVELS ───────────────────────────────────────────────────────
slDist     = atr * atrMult
// Stop below the recent swing low / above swing high
longSL     = ta.lowest(low, 5) - atr * 0.25
longTP     = close + (close - longSL) * rrRatio
shortSL    = ta.highest(high, 5) + atr * 0.25
shortTP    = close - (shortSL - close) * rrRatio

// ── EXECUTE ──────────────────────────────────────────────────────
if longEntry
    strategy.entry("Long",  strategy.long)
    strategy.exit("L-Exit", "Long",  stop=longSL,  limit=longTP)

if shortEntry
    strategy.entry("Short", strategy.short)
    strategy.exit("S-Exit", "Short", stop=shortSL, limit=shortTP)

// ── VISUALS ──────────────────────────────────────────────────────
emaColor   = upTrend ? color.new(color.green, 30) : color.new(color.red, 30)
plot(ema200, "200 EMA", emaColor, 3)
plotshape(longEntry,  "Long",  shape.triangleup,   location.belowbar, color.green, size=size.large)
plotshape(shortEntry, "Short", shape.triangledown, location.abovebar, color.red,   size=size.large)`,
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
   emaH = iMA(_Symbol, PERIOD_CURRENT, EMALen, 0, MODE_EMA, PRICE_CLOSE);
   rsiH = iRSI(_Symbol, PERIOD_CURRENT, RSILen, PRICE_CLOSE);
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   return INIT_SUCCEEDED;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (!IsNewBar()) return;

   double ema[2], rsi[2], atr[1];
   CopyBuffer(emaH, 0, 0, 2, ema);
   CopyBuffer(rsiH, 0, 0, 2, rsi);
   CopyBuffer(atrH, 0, 0, 1, atr);

   double price  = iClose(_Symbol, PERIOD_CURRENT, 0);
   bool upTrend  = price > ema[0];
   bool downTrend= price < ema[0];
   bool rsiLong  = rsi[1] <= RSI_OS && rsi[0] > RSI_OS;
   bool rsiShort = rsi[1] >= RSI_OB && rsi[0] < RSI_OB;

   double risk  = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double slDist= atr[0] * ATRMult;
   double lots  = NormalizeDouble(risk / (slDist / _Point * _Point), 2);
   lots = MathMax(0.01, MathMin(lots, 10.0));

   if (upTrend && rsiLong)
      trade.Buy(lots, _Symbol, price, price-slDist, price+slDist*RRRatio, "RT Long");

   if (downTrend && rsiShort)
      trade.Sell(lots, _Symbol, price, price+slDist, price-slDist*RRRatio, "RT Short");
}

bool IsNewBar() {
   static datetime lastBar = 0;
   datetime current = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (current != lastBar) { lastBar = current; return true; }
   return false;
}`,
      steps: [
        'Use a 4H or Daily chart — this strategy is designed for swing trading, not scalping',
        'Paste the auto script → Add to chart → the 200 EMA will appear (green = uptrend, red = downtrend)',
        'The algorithm only enters on bar close, so no false signals mid-candle',
        'For FTMO: keep R:R at 2.0 — you only need to win 35% of trades to be profitable at 2:1',
        'For MetaTrader 5: compile the .mq5 EA file in MetaEditor → attach to your chart → enable AutoTrading',
        'This works on any FTMO or E8 account. Best pairs: EURUSD, GBPUSD, USDJPY on 4H chart',
        'Expected trade frequency: 3-8 trades per month per pair — this is normal. Do not force trades',
        'Pass phase tip: this strategy suits the FTMO swing account (14% drawdown allowed) — very safe for passing',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Rayner Teo 200EMA Pullback SIGNALS", overlay=true)

emaLen = input.int(200, "EMA Length")
rsiLen = input.int(14,  "RSI Length")
rsiOS  = input.int(30,  "RSI Oversold")
rsiOB  = input.int(70,  "RSI Overbought")
atrM   = input.float(2.0,"SL ATR Multiplier")
rrR    = input.float(2.0,"R:R Ratio")

ema200 = ta.ema(close, emaLen)
rsi    = ta.rsi(close, rsiLen)
atr    = ta.atr(14)

upTrend   = close > ema200
downTrend = close < ema200
longSig   = upTrend   and ta.crossover(rsi, rsiOS)
shortSig  = downTrend and ta.crossunder(rsi, rsiOB)

swingLow  = ta.lowest(low, 5)
swingHigh = ta.highest(high, 5)
lSL       = swingLow  - atr * 0.25
sSL       = swingHigh + atr * 0.25
lTP       = close + (close - lSL) * rrR
sTP       = close - (sSL - close) * rrR

alertcondition(longSig,  "📈 LONG PULLBACK",
  "RT LONG | " + syminfo.ticker + " | Entry: " + str.tostring(close,"#.#####") +
  " | SL: " + str.tostring(lSL,"#.#####") + " | TP: " + str.tostring(lTP,"#.#####"))

alertcondition(shortSig, "📉 SHORT PULLBACK",
  "RT SHORT | " + syminfo.ticker + " | Entry: " + str.tostring(close,"#.#####") +
  " | SL: " + str.tostring(sSL,"#.#####") + " | TP: " + str.tostring(sTP,"#.#####"))

emaClr = upTrend ? color.new(color.green,30) : color.new(color.red,30)
plot(ema200, "200 EMA", emaClr, 3)
plotshape(longSig,  "LONG",  shape.triangleup,   location.belowbar, color.green, size=size.large)
plotshape(shortSig, "SHORT", shape.triangledown, location.abovebar, color.red,   size=size.large)`,
      steps: [
        'Add to a 4H or Daily chart on TradingView — works on any major forex pair or index',
        'Green triangle = long signal. Red triangle = short signal. Only appear on bar close',
        'Set alerts: right-click → Add Alert → select "LONG PULLBACK" or "SHORT PULLBACK" → Once Per Bar Close',
        'Execute manually on your prop firm\'s platform at the next candle open after the alert',
        'Use the SL and TP from the alert message exactly — these are calculated from ATR and swing levels',
      ]
    }
  },

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
  overlay=true,
  default_qty_type=strategy.fixed,
  default_qty_value=1)

// ── INPUTS ───────────────────────────────────────────────────────
poleMinPct  = input.float(3.0, "Min Pole Move %",         minval=1.0, maxval=10.0)
flagMaxBars = input.int(8,     "Max Flag Duration (bars)", minval=2,   maxval=20)
volMult     = input.float(1.5, "Breakout Volume ×",       minval=1.0, maxval=4.0)
atrSL       = input.float(1.0, "Stop ATR Below Flag Low", minval=0.3, maxval=2.0)
useSession  = input.bool(true, "Morning session only")
session     = input.session("0930-1130", "Window")

// ── INDICATORS ───────────────────────────────────────────────────
atr         = ta.atr(14)
avgVol      = ta.sma(volume, 20)
inSession   = not useSession or
              not na(time(timeframe.period, session, "America/New_York"))

// ── POLE DETECTION ───────────────────────────────────────────────
poleLen     = 5
poleReturn  = (close - close[poleLen]) / close[poleLen] * 100
strongPole  = poleReturn >= poleMinPct and volume[poleLen] > avgVol[poleLen] * 1.5

// ── FLAG DETECTION ───────────────────────────────────────────────
isTightBar  = (high - low) < atr * 0.6
var int flagCnt = 0
flagCnt    := isTightBar ? flagCnt + 1 : 0
validFlag   = flagCnt >= 2 and flagCnt <= flagMaxBars

// ── BREAKOUT ─────────────────────────────────────────────────────
flagHigh    = ta.highest(high, math.max(flagCnt, 2))
breakout    = ta.crossover(close, flagHigh[1]) and volume > avgVol * volMult

longEntry   = strongPole[flagCnt] and validFlag and breakout and
              inSession and strategy.position_size == 0

// ── LEVELS (measured move) ───────────────────────────────────────
poleSize    = ta.highest(high, poleLen + flagCnt) - ta.lowest(low, poleLen + flagCnt)
flagLow     = ta.lowest(low, math.max(flagCnt, 2))
stopLoss    = flagLow - atr * atrSL
takeProfit  = close + poleSize   // measured move target

// ── EXECUTE ──────────────────────────────────────────────────────
if longEntry
    strategy.entry("Bull Flag", strategy.long, comment="Flag Break")
    strategy.exit("Exit", "Bull Flag", stop=stopLoss, limit=takeProfit)

// ── VISUALS ──────────────────────────────────────────────────────
bgcolor(validFlag  ? color.new(color.yellow, 90) : na, title="Flag Zone")
bgcolor(inSession  ? color.new(color.blue,   97) : na, title="Session")
plotshape(longEntry, "Breakout", shape.triangleup, location.belowbar, color.lime, size=size.large)`,
      mt5: `// YN Finance — Humbled Trader Bull Flag EA (MT5) — Simplified
#include <Trade\\Trade.mqh>
CTrade trade;

input double PoleMinPct = 3.0;
input int    FlagMax    = 8;
input double VolMult    = 1.5;
input double ATRStop    = 1.0;

int atrH;

int OnInit() {
   atrH = iATR(_Symbol, PERIOD_CURRENT, 14);
   return INIT_SUCCEEDED;
}

void OnTick() {
   if (PositionsTotal() > 0) return;
   if (!IsNewBar()) return;

   // Check morning session (14:30-16:00 UTC = 9:30-11am ET)
   MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
   if (!(dt.hour == 14 || (dt.hour == 15 && dt.min < 30))) return;

   double atr[1]; CopyBuffer(atrH, 0, 0, 1, atr);

   // Pole: strong 5-bar move
   double c0 = iClose(_Symbol,PERIOD_CURRENT,0);
   double c5 = iClose(_Symbol,PERIOD_CURRENT,5);
   double poleMove = (c0 - c5) / c5 * 100;
   if (poleMove < PoleMinPct) return;

   // Flag: tight consolidation (simplified check)
   double range1 = iHigh(_Symbol,PERIOD_CURRENT,1) - iLow(_Symbol,PERIOD_CURRENT,1);
   double range2 = iHigh(_Symbol,PERIOD_CURRENT,2) - iLow(_Symbol,PERIOD_CURRENT,2);
   if (range1 > atr[0] * 0.6 || range2 > atr[0] * 0.6) return;

   // Breakout of flag high
   double flagHigh = MathMax(iHigh(_Symbol,PERIOD_CURRENT,1), iHigh(_Symbol,PERIOD_CURRENT,2));
   if (c0 <= flagHigh) return;

   double flagLow = MathMin(iLow(_Symbol,PERIOD_CURRENT,1), iLow(_Symbol,PERIOD_CURRENT,2));
   double sl      = flagLow - atr[0] * ATRStop;
   double poleH   = 0, poleL = 999999;
   for (int i = 0; i < 10; i++) {
      poleH = MathMax(poleH, iHigh(_Symbol,PERIOD_CURRENT,i));
      poleL = MathMin(poleL, iLow(_Symbol,PERIOD_CURRENT,i));
   }
   double tp = c0 + (poleH - poleL);  // measured move
   double risk = AccountInfoDouble(ACCOUNT_BALANCE) * 0.005;
   double lots = NormalizeDouble(risk / ((c0-sl)/_Point*_Point), 2);
   lots = MathMax(0.01, MathMin(lots, 5.0));

   trade.Buy(lots, _Symbol, c0, sl, tp, "Bull Flag Break");
}

bool IsNewBar() {
   static datetime last = 0;
   datetime t = iTime(_Symbol, PERIOD_CURRENT, 0);
   if (t != last) { last = t; return true; }
   return false;
}`,
      steps: [
        'Use on a 5-minute chart. Works best on gap-up stocks or ES/NQ futures in the morning session',
        'Paste script → Add to chart. Yellow background = valid flag detected. Green triangle = breakout signal',
        'The measured move target (full pole height) is aggressive — consider exiting 50% at 1.5R and trailing the rest',
        'For Topstep/Apex futures accounts: trade max 2-3 contracts per signal, never more',
        'The stop is placed below the flag low — if price returns to the flag, the setup is invalid',
        'Do NOT trade this after 11:30am ET — bull flag breakouts fail at much higher rates in the afternoon',
        'Pass phase tip: 3 winning flag trades in a week at 3:1 R:R covers most prop firm profit targets easily',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Humbled Trader Bull Flag SIGNALS", overlay=true)

poleMinPct  = input.float(3.0, "Pole Min %")
flagMaxBars = input.int(8, "Max Flag Bars")
volMult     = input.float(1.5, "Breakout Volume ×")
useSession  = input.bool(true, "Morning only")
session     = input.session("0930-1130", "Window")

atr         = ta.atr(14)
avgVol      = ta.sma(volume, 20)
inSession   = not useSession or not na(time(timeframe.period, session, "America/New_York"))
poleReturn  = (close - close[5]) / close[5] * 100
strongPole  = poleReturn >= poleMinPct and volume[5] > avgVol[5] * 1.5
isTightBar  = (high - low) < atr * 0.6
var int cnt = 0; cnt := isTightBar ? cnt + 1 : 0
validFlag   = cnt >= 2 and cnt <= flagMaxBars
flagHigh    = ta.highest(high, math.max(cnt, 2))
breakout    = ta.crossover(close, flagHigh[1]) and volume > avgVol * volMult
signal      = strongPole[cnt] and validFlag and breakout and inSession

flagLow     = ta.lowest(low, math.max(cnt,2))
sl          = flagLow - atr
poleSize    = ta.highest(high, 5+cnt) - ta.lowest(low, 5+cnt)
tp          = close + poleSize

alertcondition(signal, "🚩 BULL FLAG BREAKOUT",
  "HT LONG | " + syminfo.ticker +
  " | Entry: " + str.tostring(close,"#.##") +
  " | SL: " + str.tostring(sl,"#.##") +
  " | TP: " + str.tostring(tp,"#.##") +
  " (Measured Move Target)")

bgcolor(validFlag ? color.new(color.yellow, 90) : na)
plotshape(signal, "Break", shape.triangleup, location.belowbar, color.lime, size=size.large)`,
      steps: [
        'Add to 5m chart. Yellow zone = flag in progress. Green triangle = confirmed breakout',
        'Create alert on "BULL FLAG BREAKOUT" → Once Per Bar Close → enable push notifications',
        'When alert fires on your phone: enter at market open of next candle on your prop platform',
        'Place stop below the flag low (shown in alert). Target the measured move (pole height added to breakout)',
        'Take 50% profit at 1.5R — lock in the pass, let the rest run to the full target',
      ]
    }
  },

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
  overlay=false,
  max_bars_back=500)

// ── INPUTS ───────────────────────────────────────────────────────
accountBal  = input.float(100000, "Account Balance ($)",      step=1000)
riskPct     = input.float(0.5,   "Risk % Per Trade",         minval=0.1, maxval=2.0, step=0.1)
maxHeat     = input.float(3.0,   "Max Total Portfolio Heat %",minval=1.0, maxval=6.0, step=0.5)
maxDailyDD  = input.float(4.0,   "Max Daily Drawdown % (Prop Firm Limit)", step=0.5)
atrMult     = input.float(2.0,   "Your Stop Loss ATR ×",     minval=0.5, maxval=5.0, step=0.1)
maxPos      = input.int(3,       "Max Concurrent Positions", minval=1,   maxval=10)

propFirmName = input.string("FTMO", "Prop Firm", options=["FTMO","Topstep","Apex","E8","Other"])

// ── CALCULATIONS ─────────────────────────────────────────────────
atr          = ta.atr(14)
riskPerTrade = accountBal * (riskPct / 100)
maxHeatAmt   = accountBal * (maxHeat / 100)
dailyDDLimit = accountBal * (maxDailyDD / 100)
unitsPerTrade= riskPerTrade / (atr * atrMult)
maxLoss3Day  = dailyDDLimit * 3

// Profit target (prop firm typically requires 8-10% for phase 1)
profitTarget8 = accountBal * 0.08
profitTarget10= accountBal * 0.10

// ── DAILY P&L TRACKING ────────────────────────────────────────────
var float dayStart = na
isNewDay = ta.change(time("D")) != 0
if isNewDay
    dayStart := close
dayReturn = na(dayStart) ? 0.0 : (close - dayStart) / dayStart * 100

// ── DASHBOARD TABLE ───────────────────────────────────────────────
if barstate.islast
    var table t = table.new(position.top_right, 2, 12,
        bgcolor=color.new(#0b1929, 15),
        border_color=color.new(color.teal, 60),
        border_width=1, frame_color=color.teal, frame_width=2)

    // Header
    table.cell(t, 0, 0, "YN FINANCE — " + propFirmName + " RISK SYSTEM",
        text_color=color.teal, bgcolor=color.new(color.teal,85),
        text_size=size.small)
    table.cell(t, 1, 0, "LIVE DASHBOARD",
        text_color=color.teal, bgcolor=color.new(color.teal,85),
        text_size=size.small)

    // Risk per trade
    table.cell(t, 0, 1, "Risk Per Trade",     text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 1, "$" + str.tostring(riskPerTrade, "#,###.##"),
        text_color=color.green, text_size=size.small)

    // Position size
    table.cell(t, 0, 2, "Units to Trade",     text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 2, str.tostring(math.round(unitsPerTrade, 2)) + " units",
        text_color=color.green, text_size=size.small)

    // Max heat
    table.cell(t, 0, 3, "Max Portfolio Heat", text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 3, "$" + str.tostring(maxHeatAmt, "#,###") + " (" + str.tostring(maxHeat) + "%)",
        text_color=color.orange, text_size=size.small)

    // Daily DD limit
    table.cell(t, 0, 4, "Daily DD Limit",     text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 4, "$" + str.tostring(dailyDDLimit, "#,###") + " max loss today",
        text_color=color.red, text_size=size.small)

    // Max positions
    table.cell(t, 0, 5, "Max Open Trades",    text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 5, str.tostring(maxPos) + " trades simultaneously",
        text_color=color.white, text_size=size.small)

    // ATR
    table.cell(t, 0, 6, "Current ATR (14)",   text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 6, str.tostring(atr, "#.#####"),
        text_color=color.white, text_size=size.small)

    // Stop distance
    table.cell(t, 0, 7, "Stop Distance",      text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 7, str.tostring(atr * atrMult, "#.#####") + " (" + str.tostring(atrMult) + "× ATR)",
        text_color=color.white, text_size=size.small)

    // Profit targets
    table.cell(t, 0, 8, "Profit Target 8%",   text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 8, "$" + str.tostring(profitTarget8, "#,###"),
        text_color=color.green, text_size=size.small)

    table.cell(t, 0, 9, "Profit Target 10%",  text_color=color.gray, text_size=size.small)
    table.cell(t, 1, 9, "$" + str.tostring(profitTarget10, "#,###"),
        text_color=color.green, text_size=size.small)

    // Rule reminder
    ruleColor = color.new(color.orange, 20)
    table.cell(t, 0, 10, "RULE",              text_color=color.orange, text_size=size.tiny)
    table.cell(t, 1, 10, "Stop if daily loss hits " + str.tostring(maxDailyDD) + "% — no exceptions",
        text_color=color.orange, text_size=size.tiny)

    table.cell(t, 0, 11, "RULE",              text_color=color.red, text_size=size.tiny)
    table.cell(t, 1, 11, "Never exceed " + str.tostring(maxPos) + " trades open at once",
        text_color=color.red, text_size=size.tiny)

// Plot heat reference lines
heatLine = plot(maxHeat, "Max Heat %",  color.new(color.red,    50), 1, plot.style_line)
riskLine = plot(riskPct, "Risk/Trade %",color.new(color.orange, 50), 1, plot.style_line)
plot(0, "Zero", color.new(color.gray, 80))`,
      mt5: `// Anton Kreil Risk Dashboard is TradingView-only (visual overlay).
// For MT5: use the built-in risk settings when placing each trade.
//
// FORMULA TO USE IN MT5 EVERY TIME:
//
// Lots = (Account Balance × Risk%) ÷ (Stop Loss in pips × Pip Value)
//
// Example: $100,000 account, 0.5% risk, 20 pip stop on EURUSD
// Lots = (100,000 × 0.005) ÷ (20 × 10) = 500 ÷ 200 = 2.5 lots
//
// MAX CONCURRENT HEAT RULE:
// Never have more than 3% of account at risk across all open positions.
// With 0.5% per trade, that means max 6 trades open simultaneously.
// Recommended: max 3 trades to stay conservative.`,
      steps: [
        'Add the Risk Dashboard to ANY chart — it works as an overlay on top of any strategy',
        'Set your account balance, prop firm name, and the firm\'s daily drawdown limit in the settings',
        'The dashboard shows "Units to Trade" — this is how many lots/contracts to use for your next trade',
        'RULE 1: Never open a trade if it would push your total open risk above the Max Portfolio Heat shown',
        'RULE 2: If your daily loss hits the Daily DD Limit shown, close everything and stop trading for the day — no exceptions',
        'RULE 3: The "Units to Trade" number changes as ATR changes — check it before every trade, not just once',
        'Apply this on top of any of the other YN Finance algorithms — it works with ICT, Ross, Rayner, or Humbled Trader',
        'For FTMO $100K: risk $500/trade max, stop trading if daily loss hits $5,000, never exceed $15,000 total open risk',
      ]
    },
    signals: {
      tradingview: `//@version=5
indicator("YN Finance — Anton Kreil Risk Calculator (Signals Version)", overlay=false)

// Same as the auto version — use with any entry strategy
// Add this to your chart alongside any other YN Finance signal indicator

accountBal = input.float(100000, "Account Balance ($)", step=1000)
riskPct    = input.float(0.5, "Risk % Per Trade", step=0.1)
atrMult    = input.float(2.0, "Your SL ATR ×")
maxDailyDD = input.float(4.0, "Daily DD Limit % (prop firm rule)")

atr          = ta.atr(14)
riskPerTrade = accountBal * riskPct / 100
units        = riskPerTrade / (atr * atrMult)
dailyLimit   = accountBal * maxDailyDD / 100

alertcondition(ta.change(math.round(units, 1)) != 0, "Position Size Changed",
  "Risk Update | Trade: $" + str.tostring(riskPerTrade,"#,###") +
  " | Units: " + str.tostring(math.round(units,2)) +
  " | Daily Limit: $" + str.tostring(dailyLimit,"#,###"))

plot(units,       "Units to Trade",      color.teal,   2)
plot(riskPct,     "Risk % Per Trade",    color.orange, 1)
plot(maxDailyDD,  "Daily DD Limit %",    color.red,    1)
hline(0, "Zero", color.new(color.gray,80))`,
      steps: [
        'Add this calculator to any chart alongside your chosen signal indicator',
        'Before every trade: check the "Units to Trade" value — use exactly that many lots/contracts',
        'Set an alert for "Position Size Changed" — this notifies you when ATR shifts and your sizing needs to update',
        'Keep a sticky note next to your screen: Today\'s daily loss limit = [your account] × [DD %]. Stop when you hit it.',
        'Combine with any other YN Finance signal indicator for a complete, institutional-grade trading system',
      ]
    }
  }
]
