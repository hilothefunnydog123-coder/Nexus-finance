import type { Quote, CandleData, NewsItem } from './types'

const API_KEY = process.env.FINNHUB_API_KEY || ''
const BASE_URL = 'https://finnhub.io/api/v1'

async function fetchFinnhub<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`)
  url.searchParams.set('token', API_KEY)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), { next: { revalidate: 10 } })
  if (!res.ok) throw new Error(`Finnhub ${endpoint} failed: ${res.status}`)
  return res.json()
}

export async function getQuote(symbol: string): Promise<Quote> {
  const data = await fetchFinnhub<{
    c: number; d: number; dp: number; h: number; l: number; o: number; pc: number; t: number
  }>('/quote', { symbol })

  return {
    symbol,
    price: data.c,
    change: data.d,
    changePercent: data.dp,
    high: data.h,
    low: data.l,
    open: data.o,
    previousClose: data.pc,
    volume: 0,
    timestamp: data.t,
  }
}

export async function getCandles(
  symbol: string,
  resolution: string,
  from: number,
  to: number
): Promise<CandleData[]> {
  const data = await fetchFinnhub<{
    c: number[]; h: number[]; l: number[]; o: number[]; t: number[]; v: number[]; s: string
  }>('/stock/candle', {
    symbol,
    resolution,
    from: String(from),
    to: String(to),
  })

  if (data.s !== 'ok' || !data.c) return []

  return data.c.map((close, i) => ({
    time: data.t[i],
    open: data.o[i],
    high: data.h[i],
    low: data.l[i],
    close,
    volume: data.v[i],
  }))
}

export async function getMarketNews(category: string = 'general'): Promise<NewsItem[]> {
  const data = await fetchFinnhub<Array<{
    id: number; headline: string; summary: string; source: string
    url: string; datetime: number; category: string; related: string; image: string
  }>>('/news', { category })

  return data.slice(0, 20).map(item => ({
    id: String(item.id),
    headline: item.headline,
    summary: item.summary,
    source: item.source,
    url: item.url,
    datetime: item.datetime,
    category: item.category,
    related: item.related,
    image: item.image,
  }))
}

export async function getCompanyNews(symbol: string, from: string, to: string): Promise<NewsItem[]> {
  const data = await fetchFinnhub<Array<{
    id: number; headline: string; summary: string; source: string
    url: string; datetime: number; category: string; related: string; image: string
  }>>('/company-news', { symbol, from, to })

  return data.slice(0, 10).map(item => ({
    id: String(item.id),
    headline: item.headline,
    summary: item.summary,
    source: item.source,
    url: item.url,
    datetime: item.datetime,
    category: item.category,
    related: item.related,
    image: item.image,
  }))
}

// Mock data fallbacks for demo when API key is not set
export function getMockQuote(symbol: string): Quote {
  const mockPrices: Record<string, number> = {
    AAPL: 189.50, NVDA: 875.40, TSLA: 248.80, MSFT: 415.20,
    GOOGL: 175.30, AMZN: 198.60, META: 492.10, BRK: 410.00,
    JPM: 213.40, SPY: 512.80,
  }
  const base = mockPrices[symbol] || 100
  const change = (Math.random() - 0.48) * base * 0.03
  return {
    symbol,
    price: +(base + change).toFixed(2),
    change: +change.toFixed(2),
    changePercent: +((change / base) * 100).toFixed(2),
    high: +(base * 1.02).toFixed(2),
    low: +(base * 0.98).toFixed(2),
    open: +(base * 0.995).toFixed(2),
    previousClose: +base.toFixed(2),
    volume: Math.floor(Math.random() * 50000000) + 10000000,
    timestamp: Date.now() / 1000,
  }
}

export function generateMockCandles(symbol: string, points: number = 390): CandleData[] {
  const mockPrices: Record<string, number> = {
    AAPL: 189.50, NVDA: 875.40, TSLA: 248.80, MSFT: 415.20,
    GOOGL: 175.30, AMZN: 198.60, META: 492.10,
  }
  const base = mockPrices[symbol] || 150
  const now = Math.floor(Date.now() / 1000)
  const candles: CandleData[] = []
  let price = base * 0.97

  for (let i = points; i >= 0; i--) {
    const change = (Math.random() - 0.49) * price * 0.004
    const open = price
    const close = +(price + change).toFixed(2)
    const high = +(Math.max(open, close) * (1 + Math.random() * 0.003)).toFixed(2)
    const low = +(Math.min(open, close) * (1 - Math.random() * 0.003)).toFixed(2)
    candles.push({
      time: now - i * 60,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 2000000) + 500000,
    })
    price = close
  }
  return candles
}
