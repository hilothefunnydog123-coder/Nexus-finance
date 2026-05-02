'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useWebSocket } from './useWebSocket'
import type { Quote } from '@/lib/types'

const FINNHUB_WS_KEY = process.env.NEXT_PUBLIC_FINNHUB_API_KEY || ''
const DEMO_MODE = !FINNHUB_WS_KEY || FINNHUB_WS_KEY === 'your_finnhub_api_key_here'

const MOCK_BASE_PRICES: Record<string, number> = {
  AAPL: 189.50, NVDA: 875.40, TSLA: 248.80, MSFT: 415.20,
  GOOGL: 175.30, AMZN: 198.60, META: 492.10, SPY: 512.80,
  JPM: 213.40, AMD: 168.20, NFLX: 635.10, QQQ: 438.60,
}

function generateMockQuote(symbol: string, prevPrice?: number): Quote {
  const base = prevPrice || MOCK_BASE_PRICES[symbol] || 100
  const change = (Math.random() - 0.48) * base * 0.002
  const price = +(base + change).toFixed(2)
  const originalBase = MOCK_BASE_PRICES[symbol] || 100
  const totalChange = +(price - originalBase).toFixed(2)
  return {
    symbol, price,
    change: totalChange,
    changePercent: +((totalChange / originalBase) * 100).toFixed(2),
    high: +(Math.max(price, originalBase) * 1.005).toFixed(2),
    low: +(Math.min(price, originalBase) * 0.995).toFixed(2),
    open: +originalBase.toFixed(2),
    previousClose: +originalBase.toFixed(2),
    volume: Math.floor(Math.random() * 50_000_000) + 5_000_000,
    timestamp: Date.now() / 1000,
  }
}

export function useMarketData(symbols: string[]) {
  const [quotes, setQuotes] = useState<Record<string, Quote>>({})
  const [connected, setConnected] = useState(false)
  const [wsReceiving, setWsReceiving] = useState(false)
  const priceRef = useRef<Record<string, number>>({})
  const symbolsRef = useRef(symbols)
  symbolsRef.current = symbols

  // Always fetch REST quotes immediately so prices show on load
  const fetchRestQuotes = useCallback(async () => {
    try {
      const res = await fetch('/api/market')
      const json = await res.json()
      if (!json.quotes) return
      setQuotes(prev => {
        const updated = { ...prev }
        json.quotes.forEach((q: Quote) => {
          if (!updated[q.symbol] || !wsReceiving) {
            updated[q.symbol] = q
            priceRef.current[q.symbol] = q.price
          }
        })
        return updated
      })
      setConnected(true)
    } catch {}
  }, [wsReceiving])

  // Fetch on mount and every 15s as REST fallback
  useEffect(() => {
    fetchRestQuotes()
    const t = setInterval(fetchRestQuotes, 15_000)
    return () => clearInterval(t)
  }, [fetchRestQuotes])

  // WebSocket handler — updates on top of REST baseline
  const handleMessage = useCallback((data: unknown) => {
    const msg = data as { type: string; data?: Array<{ s: string; p: number; t: number; v: number }> }
    if (msg.type !== 'trade' || !msg.data?.length) return

    setConnected(true)
    setWsReceiving(true)
    setQuotes(prev => {
      const updated = { ...prev }
      msg.data!.forEach(trade => {
        const sym = trade.s
        const prevQuote = updated[sym]
        const prevClose = prevQuote?.previousClose || trade.p
        const change = +(trade.p - prevClose).toFixed(2)
        updated[sym] = {
          symbol: sym,
          price: trade.p,
          change,
          changePercent: +((change / prevClose) * 100).toFixed(2),
          high: Math.max(prevQuote?.high || 0, trade.p),
          low: Math.min(prevQuote?.low || Infinity, trade.p),
          open: prevQuote?.open || trade.p,
          previousClose: prevClose,
          volume: (prevQuote?.volume || 0) + trade.v,
          timestamp: trade.t / 1000,
        }
        priceRef.current[sym] = trade.p
      })
      return updated
    })
  }, [])

  const { send } = useWebSocket(
    DEMO_MODE ? '' : `wss://ws.finnhub.io?token=${FINNHUB_WS_KEY}`,
    handleMessage,
    !DEMO_MODE
  )

  // Subscribe when WebSocket is ready — retry every 3s until subscribed
  useEffect(() => {
    if (DEMO_MODE) return
    const trySubscribe = () => {
      symbolsRef.current.forEach(sym => send({ type: 'subscribe', symbol: sym }))
    }
    trySubscribe()
    const t = setInterval(trySubscribe, 3000)
    // Stop retrying once receiving WS data
    if (wsReceiving) clearInterval(t)
    return () => {
      clearInterval(t)
      symbolsRef.current.forEach(sym => send({ type: 'unsubscribe', symbol: sym }))
    }
  }, [send, wsReceiving])

  // Demo mode simulation on top of REST prices
  useEffect(() => {
    if (!DEMO_MODE) return
    const interval = setInterval(() => {
      setQuotes(prev => {
        const updated = { ...prev }
        const keys = Object.keys(updated)
        if (!keys.length) return prev
        keys.sort(() => Math.random() - 0.5).slice(0, 3).forEach(sym => {
          updated[sym] = generateMockQuote(sym, priceRef.current[sym] || MOCK_BASE_PRICES[sym])
          priceRef.current[sym] = updated[sym].price
        })
        return updated
      })
    }, 1200)
    return () => clearInterval(interval)
  }, [])

  return { quotes, connected, isDemo: DEMO_MODE }
}
