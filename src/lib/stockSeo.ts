// SEO-page data fetch (richer profile/metrics/consensus/news, 1h ISR cache).
// Kept separate from lib/finnhub.ts (which serves the live terminal at 10s).
const FH = process.env.FINNHUB_API_KEY ?? ''

export type StockData = {
  symbol: string; name: string; industry: string; logo: string; weburl: string
  price: number; change: number; changePct: number; high: number; low: number; open: number; prevClose: number
  marketCap: number; pe: number; high52: number; low52: number; beta: number
  rec: { strongBuy: number; buy: number; hold: number; sell: number; strongSell: number } | null
  news: { headline: string; source: string; url: string; datetime: number }[]
}

async function fh<T>(url: string): Promise<T | null> {
  if (!FH) return null
  try {
    const r = await fetch(url, { next: { revalidate: 3600 } })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch { return null }
}

export async function getStock(symbol: string): Promise<StockData | null> {
  const s = symbol.toUpperCase()
  const from = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10)
  const to = new Date().toISOString().slice(0, 10)

  const [quote, profile, metricRes, recArr, newsArr] = await Promise.all([
    fh<{ c: number; d: number; dp: number; h: number; l: number; o: number; pc: number }>(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FH}`),
    fh<{ name: string; finnhubIndustry: string; logo: string; weburl: string; marketCapitalization: number }>(`https://finnhub.io/api/v1/stock/profile2?symbol=${s}&token=${FH}`),
    fh<{ metric: Record<string, number> }>(`https://finnhub.io/api/v1/stock/metric?symbol=${s}&metric=all&token=${FH}`),
    fh<{ strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }[]>(`https://finnhub.io/api/v1/stock/recommendation?symbol=${s}&token=${FH}`),
    fh<{ headline: string; source: string; url: string; datetime: number }[]>(`https://finnhub.io/api/v1/company-news?symbol=${s}&from=${from}&to=${to}&token=${FH}`),
  ])

  if ((!quote || !quote.c) && (!profile || !profile.name)) return null

  const m = metricRes?.metric ?? {}
  return {
    symbol: s,
    name: profile?.name ?? s,
    industry: profile?.finnhubIndustry ?? '—',
    logo: profile?.logo ?? '',
    weburl: profile?.weburl ?? '',
    price: quote?.c ?? 0,
    change: quote?.d ?? 0,
    changePct: quote?.dp ?? 0,
    high: quote?.h ?? 0,
    low: quote?.l ?? 0,
    open: quote?.o ?? 0,
    prevClose: quote?.pc ?? 0,
    marketCap: profile?.marketCapitalization ?? 0,
    pe: m.peNormalizedAnnual ?? m.peTTM ?? 0,
    high52: m['52WeekHigh'] ?? 0,
    low52: m['52WeekLow'] ?? 0,
    beta: m.beta ?? 0,
    rec: recArr && recArr.length ? recArr[0] : null,
    news: (newsArr ?? []).filter(n => n.headline).slice(0, 5),
  }
}

export function fmtCap(millions: number): string {
  if (!millions) return '—'
  if (millions >= 1e6) return `$${(millions / 1e6).toFixed(2)}T`
  if (millions >= 1e3) return `$${(millions / 1e3).toFixed(1)}B`
  return `$${millions.toFixed(0)}M`
}

export function consensus(rec: StockData['rec']): { label: string; clr: string; score: number } {
  if (!rec) return { label: 'No coverage', clr: '#6a8497', score: 0 }
  const bull = rec.strongBuy + rec.buy
  const bear = rec.sell + rec.strongSell
  const total = bull + rec.hold + bear || 1
  const bullPct = bull / total
  const score = (rec.strongBuy * 5 + rec.buy * 4 + rec.hold * 3 + rec.sell * 2 + rec.strongSell * 1) / total
  if (bullPct >= 0.66) return { label: 'Strong Buy', clr: '#00d4aa', score }
  if (bullPct >= 0.45) return { label: 'Buy', clr: '#22c55e', score }
  if (bear / total >= 0.45) return { label: 'Sell', clr: '#ff2d78', score }
  return { label: 'Hold', clr: '#f59e0b', score }
}

// Popular head-to-head matchups we pre-render for /compare SEO.
export const COMPARE_PAIRS: [string, string][] = [
  ['AAPL', 'MSFT'], ['NVDA', 'AMD'], ['TSLA', 'RIVN'], ['GOOGL', 'META'],
  ['AMZN', 'WMT'], ['V', 'MA'], ['JPM', 'BAC'], ['KO', 'PEP'],
  ['NVDA', 'TSM'], ['MSFT', 'GOOGL'], ['AMD', 'INTC'], ['SHOP', 'AMZN'],
  ['NFLX', 'DIS'], ['UBER', 'ABNB'], ['LLY', 'JNJ'], ['XOM', 'CVX'],
]
