'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    TradingView: any
  }
}

export const TV_SYMBOLS: Record<string, string> = {
  // Stocks
  AAPL: 'NASDAQ:AAPL', NVDA: 'NASDAQ:NVDA', TSLA: 'NASDAQ:TSLA',
  MSFT: 'NASDAQ:MSFT', GOOGL: 'NASDAQ:GOOGL', AMZN: 'NASDAQ:AMZN',
  META: 'NASDAQ:META', AMD: 'NASDAQ:AMD', NFLX: 'NASDAQ:NFLX',
  QQQ: 'NASDAQ:QQQ', SPY: 'AMEX:SPY', JPM: 'NYSE:JPM',
  // Forex
  'EUR/USD': 'FX:EURUSD', 'GBP/USD': 'FX:GBPUSD', 'USD/JPY': 'FX:USDJPY',
  'AUD/USD': 'FX:AUDUSD', 'USD/CAD': 'FX:USDCAD', 'USD/CHF': 'FX:USDCHF',
  'EUR/GBP': 'FX:EURGBP', 'EUR/JPY': 'FX:EURJPY',
  // Futures
  ES: 'CME_MINI:ES1!', NQ: 'CME_MINI:NQ1!', YM: 'CBOT_MINI:YM1!',
  GC: 'COMEX:GC1!', CL: 'NYMEX:CL1!', SI: 'COMEX:SI1!',
  'BTC/USD': 'BINANCE:BTCUSDT', 'ETH/USD': 'BINANCE:ETHUSDT',
  'SOL/USD': 'BINANCE:SOLUSDT', 'BNB/USD': 'BINANCE:BNBUSDT',
  'XRP/USD': 'BINANCE:XRPUSDT', 'DOGE/USD': 'BINANCE:DOGEUSDT',
}

const INTERVALS: Record<string, string> = {
  '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1D': 'D', '1W': 'W',
}

interface Props {
  symbol: string
  interval?: string
  studies?: string[]
  hideSideToolbar?: boolean
}

// Singleton script loader so tv.js only loads once
let scriptPromise: Promise<void> | null = null
function loadTV(): Promise<void> {
  if (window.TradingView) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve) => {
    const script = document.createElement('script')
    script.src = 'https://s3.tradingview.com/tv.js'
    script.async = true
    script.onload = () => resolve()
    document.head.appendChild(script)
  })
  return scriptPromise
}

export default function TradingViewChart({
  symbol,
  interval = '60',
  studies = ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
  hideSideToolbar = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const idRef = useRef(`tv_${Math.random().toString(36).slice(2, 9)}`)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const containerId = `tv_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    idRef.current = containerId
    setLoading(true)

    if (!containerRef.current) return
    containerRef.current.innerHTML = ''

    const wrapper = document.createElement('div')
    wrapper.id = containerId
    wrapper.style.height = '100%'
    wrapper.style.width = '100%'
    containerRef.current.appendChild(wrapper)

    loadTV().then(() => {
      if (!window.TradingView || !containerRef.current) return
      if (!document.getElementById(containerId)) return

      new window.TradingView.widget({
        container_id: containerId,
        autosize: true,
        symbol: TV_SYMBOLS[symbol] || `NASDAQ:${symbol}`,
        interval: INTERVALS[interval] || interval,
        timezone: 'America/New_York',
        theme: 'dark',
        style: '1',
        locale: 'en',
        toolbar_bg: '#040c14',
        backgroundColor: 'rgba(4, 12, 20, 1)',
        gridColor: 'rgba(26, 45, 74, 0.4)',
        enable_publishing: false,
        withdateranges: true,
        hide_side_toolbar: hideSideToolbar,
        allow_symbol_change: false,
        save_image: true,
        studies,
        show_popup_button: false,
        hide_top_toolbar: false,
        hide_legend: false,
        custom_css_url: '',
        loading_screen: { backgroundColor: '#040c14', foregroundColor: '#00d4aa' },
        onChartReady: () => setLoading(false),
      })
      // Fallback: hide skeleton after 4s even if onChartReady doesn't fire
      setTimeout(() => setLoading(false), 4000)
    })

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = ''
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, interval])

  return (
    <div className="relative w-full h-full" style={{ background: '#040c14' }}>
      {loading && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3" style={{ background: '#040c14' }}>
          <div className="flex gap-1.5">
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} className="w-1 rounded-full bg-[#00d4aa]"
                style={{ height: 24 + i * 8, opacity: 0.3 + i * 0.15, animation: `pulse 1s ease-in-out ${i * 0.1}s infinite alternate` }} />
            ))}
            {[3, 2, 1].map(i => (
              <div key={`r${i}`} className="w-1 rounded-full bg-[#00d4aa]"
                style={{ height: 24 + i * 8, opacity: 0.3 + i * 0.15, animation: `pulse 1s ease-in-out ${(5 + (3 - i)) * 0.1}s infinite alternate` }} />
            ))}
          </div>
          <span className="text-[11px] text-[#4a5e7a] font-mono">{symbol} · Loading chart...</span>
        </div>
      )}
      <div ref={containerRef} className="w-full h-full" />
    </div>
  )
}
