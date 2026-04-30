export interface Quote {
  symbol: string
  price: number
  change: number
  changePercent: number
  high: number
  low: number
  open: number
  previousClose: number
  volume: number
  marketCap?: number
  timestamp: number
}

export interface CandleData {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ChartDataPoint {
  time: string
  price: number
  volume: number
  open?: number
  high?: number
  low?: number
}

export interface NewsItem {
  id: string
  headline: string
  summary: string
  source: string
  url: string
  datetime: number
  category: string
  related?: string
  image?: string
}

export interface TradeMessage {
  id: string
  username: string
  avatar: string
  message: string
  timestamp: Date
  tickers?: string[]
  type: 'user' | 'bot' | 'alert' | 'trade'
  tradeData?: {
    action: 'BUY' | 'SELL'
    ticker: string
    price: number
    quantity: number
  }
}

export interface Position {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  unrealizedPnLPercent: number
  dayChange: number
}

export interface PortfolioState {
  cash: number
  positions: Record<string, { quantity: number; avgCost: number }>
  transactions: Transaction[]
}

export interface Transaction {
  id: string
  symbol: string
  action: 'BUY' | 'SELL'
  quantity: number
  price: number
  total: number
  timestamp: Date
}

export interface WatchlistItem {
  symbol: string
  name: string
  sector?: string
}

export type TimeRange = '1D' | '1W' | '1M' | '3M' | '1Y' | '5Y'

export interface MarketStat {
  label: string
  value: string
  change?: number
}
