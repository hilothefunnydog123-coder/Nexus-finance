'use client'

import { useState } from 'react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'
import type { Quote } from '@/lib/types'

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1D', '1W']

interface Props {
  symbol: string
  quote?: Quote
}

export default function MainChart({ symbol, quote }: Props) {
  const [interval, setInterval] = useState('1h')
  const isUp = (quote?.changePercent ?? 0) >= 0

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Header */}
      <div className="flex items-center gap-4 px-4 py-2 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-base font-bold text-[#cdd6f4]">{symbol}</span>
          {quote && (
            <>
              <span className={`mono text-xl font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                ${quote.price.toFixed(2)}
              </span>
              <span className={`mono text-sm flex items-center gap-1 ${isUp ? 'text-up' : 'text-down'}`}>
                {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
                {isUp ? '+' : ''}{quote.change.toFixed(2)} ({isUp ? '+' : ''}{quote.changePercent.toFixed(2)}%)
              </span>
              <div className="hidden lg:flex items-center gap-4 ml-2 text-[10px]">
                {[['O', quote.open], ['H', quote.high], ['L', quote.low], ['PC', quote.previousClose]].map(([l, v]) => (
                  <span key={l as string} className="text-[#4a5e7a]">
                    {l} <span className="mono text-[#7f93b5]">${(v as number).toFixed(2)}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </div>
        <div className="flex ml-auto rounded border border-[#1a2d4a] overflow-hidden">
          {INTERVALS.map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-2.5 py-1 text-[10px] font-mono transition-colors ${
                interval === iv ? 'bg-[#00d4aa] text-[#040c14] font-bold' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
              }`}>
              {iv}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        <TradingViewChart symbol={symbol} interval={interval} />
      </div>
    </div>
  )
}
