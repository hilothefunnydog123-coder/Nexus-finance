/**
 * Map a Kalshi market title to a tradable underlying + parse the strike, the
 * direction, and the resolve date. This is what lets the BrainStock neural net
 * price index / crypto / commodity / single-stock markets quantitatively.
 *
 * Yahoo-format symbols (what lib/forecast.ts fetches). When nothing maps, the
 * caller routes the market to the Gemini-grounded estimator instead.
 */

export interface Underlying {
  symbol: string   // Yahoo symbol the forecaster fetches
  name: string
}

// Ordered: more specific patterns first (NVDA before generic, ^GSPC before SPY).
const UNDERLYING_PATTERNS: { re: RegExp; u: Underlying }[] = [
  { re: /s&p\s*500|s and p 500|\bspx\b|\bsp500\b/i, u: { symbol: '^GSPC', name: 'S&P 500' } },
  { re: /nasdaq[\s-]*100|\bndx\b/i, u: { symbol: '^NDX', name: 'Nasdaq-100' } },
  { re: /nasdaq/i, u: { symbol: '^IXIC', name: 'Nasdaq Composite' } },
  { re: /dow( jones)?|\bdjia\b/i, u: { symbol: '^DJI', name: 'Dow Jones' } },
  { re: /russell\s*2000|\brut\b/i, u: { symbol: '^RUT', name: 'Russell 2000' } },
  { re: /10[\s-]*year|10[\s-]*yr|ten[\s-]*year|treasury yield/i, u: { symbol: '^TNX', name: '10-Year Treasury Yield' } },
  { re: /vix|volatility index/i, u: { symbol: '^VIX', name: 'VIX' } },
  { re: /bitcoin|\bbtc\b/i, u: { symbol: 'BTC-USD', name: 'Bitcoin' } },
  { re: /ethereum|\beth\b/i, u: { symbol: 'ETH-USD', name: 'Ethereum' } },
  { re: /solana|\bsol\b/i, u: { symbol: 'SOL-USD', name: 'Solana' } },
  { re: /dogecoin|\bdoge\b/i, u: { symbol: 'DOGE-USD', name: 'Dogecoin' } },
  { re: /\bgold\b/i, u: { symbol: 'GC=F', name: 'Gold' } },
  { re: /\bsilver\b/i, u: { symbol: 'SI=F', name: 'Silver' } },
  { re: /crude|wti|\boil\b/i, u: { symbol: 'CL=F', name: 'WTI Crude Oil' } },
  { re: /natural gas/i, u: { symbol: 'NG=F', name: 'Natural Gas' } },
  // Single stocks (common Kalshi names)
  { re: /nvidia|\bnvda\b/i, u: { symbol: 'NVDA', name: 'NVIDIA' } },
  { re: /tesla|\btsla\b/i, u: { symbol: 'TSLA', name: 'Tesla' } },
  { re: /\bapple\b|\baapl\b/i, u: { symbol: 'AAPL', name: 'Apple' } },
  { re: /microsoft|\bmsft\b/i, u: { symbol: 'MSFT', name: 'Microsoft' } },
  { re: /amazon|\bamzn\b/i, u: { symbol: 'AMZN', name: 'Amazon' } },
  { re: /\bmeta\b|facebook/i, u: { symbol: 'META', name: 'Meta' } },
  { re: /alphabet|google|\bgoogl?\b/i, u: { symbol: 'GOOGL', name: 'Alphabet' } },
  { re: /\bamd\b/i, u: { symbol: 'AMD', name: 'AMD' } },
  { re: /netflix|\bnflx\b/i, u: { symbol: 'NFLX', name: 'Netflix' } },
  { re: /\bspy\b/i, u: { symbol: 'SPY', name: 'S&P 500 ETF' } },
  { re: /\bqqq\b/i, u: { symbol: 'QQQ', name: 'Nasdaq ETF' } },
]

export function matchUnderlying(title: string): Underlying | null {
  for (const { re, u } of UNDERLYING_PATTERNS) if (re.test(title)) return u
  return null
}

export type Direction = 'above' | 'below'

export interface ParsedTitle {
  underlying: Underlying
  strike: number
  direction: Direction
}

/** Parse a numeric strike + direction out of a title. Returns null if unsure. */
export function parseMarketTitle(title: string): ParsedTitle | null {
  const underlying = matchUnderlying(title)
  if (!underlying) return null

  const direction: Direction = /\b(below|under|less than|lower than|beneath|down to|drop below)\b/i.test(title)
    ? 'below'
    : 'above' // "above / over / exceed / reach / hit / at least / >" all read as above

  // Pull the threshold. Prefer a $-prefixed number, else the first sane number
  // that isn't a day count / percentage-of-days noise.
  const strike = extractStrike(title)
  if (strike == null) return null
  return { underlying, strike, direction }
}

function extractStrike(title: string): number | null {
  // $120,000 / $5,600 / $145 / $4.50 (most reliable signal)
  const dollar = title.match(/\$\s*([\d,]+(?:\.\d+)?)/)
  if (dollar) {
    const v = Number(dollar[1].replace(/,/g, ''))
    if (Number.isFinite(v) && v > 0) return v
  }
  // Yield markets: "above 4.5%"
  const pct = title.match(/([\d.]+)\s*%/)
  if (pct && /yield|treasury|rate/i.test(title)) {
    const v = Number(pct[1])
    if (Number.isFinite(v)) return v
  }
  // Bare large numbers: "above 5,600" / "20,500" — ignore small day counts.
  const nums = [...title.matchAll(/\b([\d,]{2,})(?:\.\d+)?\b/g)]
    .map((m) => Number(m[1].replace(/,/g, '')))
    .filter((v) => Number.isFinite(v))
  // The strike is the largest plausible level (day counts like "30 days" are small).
  const candidates = nums.filter((v) => v >= 50)
  if (candidates.length) return Math.max(...candidates)
  return null
}

/** Business days from now until the close date (≥ 1). */
export function businessDaysUntil(closeISO: string): number {
  const now = new Date()
  const end = new Date(closeISO)
  if (!(end.getTime() > now.getTime())) return 1
  let days = 0
  const d = new Date(now)
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) days++
  }
  return Math.max(1, days)
}
