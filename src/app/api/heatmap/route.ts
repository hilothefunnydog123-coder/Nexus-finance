import { NextResponse } from 'next/server'

const DEMO = !process.env.FINNHUB_API_KEY || process.env.FINNHUB_API_KEY === 'your_finnhub_api_key_here'
const KEY = process.env.FINNHUB_API_KEY || ''

// All symbols we show in the heatmap grouped by sector
export const HEATMAP_SECTORS = [
  { name: 'Technology', stocks: [
    { sym: 'AAPL',  name: 'Apple',      w: 7 },
    { sym: 'MSFT',  name: 'Microsoft',  w: 6 },
    { sym: 'NVDA',  name: 'NVIDIA',     w: 5 },
    { sym: 'GOOGL', name: 'Alphabet',   w: 4 },
    { sym: 'META',  name: 'Meta',       w: 3 },
    { sym: 'AMD',   name: 'AMD',        w: 1 },
    { sym: 'NFLX',  name: 'Netflix',    w: 1 },
  ]},
  { name: 'Financials', stocks: [
    { sym: 'JPM', name: 'JPMorgan',     w: 4 },
    { sym: 'BAC', name: 'Bank of Am',   w: 2 },
    { sym: 'GS',  name: 'Goldman',      w: 1 },
    { sym: 'MS',  name: 'Morgan St',    w: 1 },
  ]},
  { name: 'Consumer', stocks: [
    { sym: 'AMZN', name: 'Amazon',      w: 5 },
    { sym: 'TSLA', name: 'Tesla',       w: 2 },
    { sym: 'COST', name: 'Costco',      w: 1 },
    { sym: 'HD',   name: 'Home Depot',  w: 1 },
  ]},
  { name: 'Healthcare', stocks: [
    { sym: 'UNH', name: 'UnitedHealth', w: 3 },
    { sym: 'JNJ', name: 'J&J',          w: 2 },
    { sym: 'LLY', name: 'Eli Lilly',    w: 2 },
    { sym: 'PFE', name: 'Pfizer',       w: 1 },
  ]},
  { name: 'Energy', stocks: [
    { sym: 'XOM', name: 'ExxonMobil',   w: 3 },
    { sym: 'CVX', name: 'Chevron',      w: 2 },
  ]},
  { name: 'Indices', stocks: [
    { sym: 'SPY', name: 'S&P 500',      w: 4 },
    { sym: 'QQQ', name: 'NASDAQ',       w: 3 },
    { sym: 'IWM', name: 'Russell 2K',   w: 1 },
    { sym: 'GLD', name: 'Gold',         w: 1 },
  ]},
]

const ALL_SYMBOLS = HEATMAP_SECTORS.flatMap(s => s.stocks.map(st => st.sym))

// Realistic base prices for demo fallback
const BASE_PRICES: Record<string, number> = {
  AAPL: 189.50, MSFT: 415.20, NVDA: 875.40, GOOGL: 175.30, META: 492.10,
  AMD: 168.20, NFLX: 635.10, JPM: 213.40, BAC: 43.20, GS: 498.30,
  MS: 112.40, AMZN: 198.60, TSLA: 248.80, COST: 890.20, HD: 345.60,
  UNH: 562.30, JNJ: 152.80, LLY: 892.40, PFE: 28.40, XOM: 118.60,
  CVX: 152.30, SPY: 512.80, QQQ: 438.60, IWM: 203.40, GLD: 218.50,
}

async function fetchQuote(sym: string): Promise<{ sym: string; price: number; pct: number; prev: number }> {
  const res = await fetch(
    `https://finnhub.io/api/v1/quote?symbol=${sym}&token=${KEY}`,
    { next: { revalidate: 30 } }
  )
  const d = await res.json()
  return { sym, price: d.c || 0, pct: d.dp || 0, prev: d.pc || 0 }
}

function mockQuote(sym: string): { sym: string; price: number; pct: number; prev: number } {
  const base = BASE_PRICES[sym] || 100
  const pct = +((Math.random() - 0.48) * 4).toFixed(2)
  return { sym, price: +(base * (1 + pct / 100)).toFixed(2), pct, prev: base }
}

export async function GET() {
  try {
    const results = await Promise.all(
      ALL_SYMBOLS.map(sym =>
        DEMO ? Promise.resolve(mockQuote(sym)) : fetchQuote(sym).catch(() => mockQuote(sym))
      )
    )
    const quotes = Object.fromEntries(results.map(r => [r.sym, r]))
    return NextResponse.json({ quotes, demo: DEMO })
  } catch {
    const quotes = Object.fromEntries(ALL_SYMBOLS.map(s => [s, mockQuote(s)]))
    return NextResponse.json({ quotes, demo: true })
  }
}
