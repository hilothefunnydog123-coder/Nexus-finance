'use client'

import { useState, useEffect } from 'react'
import { BarChart2, Wifi } from 'lucide-react'
import { INSTRUMENTS, getByType, type Instrument, type InstrumentType } from '@/lib/instruments'
import { usePortfolioStore } from '@/store/portfolioStore'
import TradingChart from '@/components/chart/TradingChart'
import OrderPanel from '@/components/trading/OrderPanel'
import PositionsTable from '@/components/trading/PositionsTable'

const TYPE_TABS: { id: InstrumentType; label: string; emoji: string }[] = [
  { id: 'stock',   label: 'Stocks',  emoji: '📈' },
  { id: 'forex',   label: 'Forex',   emoji: '💱' },
  { id: 'futures', label: 'Futures', emoji: '⚡' },
]

// Realistic price simulation per instrument
const mockPrices: Record<string, number> = Object.fromEntries(
  INSTRUMENTS.map(i => [i.symbol, i.mockBasePrice])
)

function useLivePrices() {
  const [prices, setPrices] = useState<Record<string, number>>({ ...mockPrices })

  useEffect(() => {
    const interval = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        const keys = Object.keys(next)
        const toUpdate = keys.sort(() => Math.random() - 0.5).slice(0, 4)
        toUpdate.forEach(sym => {
          const instrument = INSTRUMENTS.find(i => i.symbol === sym)
          if (!instrument) return
          const volatility = instrument.type === 'forex' ? 0.0002 : instrument.type === 'futures' ? 0.0003 : 0.002
          const change = (Math.random() - 0.5) * next[sym] * volatility
          next[sym] = +(next[sym] + change).toFixed(instrument.digits)
        })
        return next
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  return prices
}

export default function TradingWorkspace() {
  const [activeType, setActiveType] = useState<InstrumentType>('stock')
  const [selectedInstrument, setSelectedInstrument] = useState<Instrument>(INSTRUMENTS[0])
  const [positionsExpanded, setPositionsExpanded] = useState(true)
  const prices = useLivePrices()
  const { positions, checkAutoClose } = usePortfolioStore()

  // Check SL/TP every second
  useEffect(() => {
    const t = setInterval(() => checkAutoClose(prices), 1000)
    return () => clearInterval(t)
  }, [prices, checkAutoClose])

  const typeInstruments = getByType(activeType)
  const currentPrice = prices[selectedInstrument.symbol] || selectedInstrument.mockBasePrice

  return (
    <div className="flex flex-col h-full bg-[#040c14]">

      {/* Instrument bar */}
      <div className="flex items-center border-b border-[#1a2d4a] bg-[#071220] shrink-0" style={{ height: 38 }}>
        {/* Type tabs */}
        <div className="flex h-full border-r border-[#1a2d4a]">
          {TYPE_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveType(tab.id)
                const first = getByType(tab.id)[0]
                if (first) setSelectedInstrument(first)
              }}
              className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold border-r border-[#1a2d4a] transition-colors ${
                activeType === tab.id
                  ? 'text-[#cdd6f4] border-b-2 border-b-[#00d4aa] bg-[#0a1628]'
                  : 'text-[#7f93b5] hover:bg-[#0a1628]'
              }`}
            >
              <span>{tab.emoji}</span> {tab.label}
            </button>
          ))}
        </div>

        {/* Instrument list (horizontal scroll) */}
        <div className="flex items-center h-full overflow-x-auto flex-1">
          {typeInstruments.map(inst => {
            const price = prices[inst.symbol] || inst.mockBasePrice
            const change = ((price - inst.mockBasePrice) / inst.mockBasePrice) * 100
            const isUp = change >= 0
            const isSelected = inst.symbol === selectedInstrument.symbol

            return (
              <button
                key={inst.symbol}
                onClick={() => setSelectedInstrument(inst)}
                className={`flex items-center gap-2 px-3 h-full border-r border-[#1a2d4a] shrink-0 hover:bg-[#0f1f38] transition-colors ${
                  isSelected ? 'bg-[#0f1f38] border-b-2 border-b-[#1e90ff]' : ''
                }`}
              >
                <span className={`text-[11px] font-semibold ${isSelected ? 'text-[#1e90ff]' : 'text-[#cdd6f4]'}`}>
                  {inst.symbol}
                </span>
                <div>
                  <div className={`mono text-[10px] font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
                    {inst.type === 'forex' ? price.toFixed(inst.digits) : `$${price.toFixed(inst.digits)}`}
                  </div>
                  <div className={`mono text-[9px] ${isUp ? 'text-up' : 'text-down'}`}>
                    {isUp ? '+' : ''}{change.toFixed(2)}%
                  </div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Live indicator */}
        <div className="flex items-center gap-1.5 px-3 border-l border-[#1a2d4a] shrink-0">
          <Wifi size={10} className="text-[#00d4aa]" />
          <span className="text-[9px] text-[#00d4aa] mono uppercase tracking-wider">Live</span>
        </div>
      </div>

      {/* Main area: chart + order panel */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Chart */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0">
          <div className="flex-1 min-h-0" style={{ flex: positionsExpanded ? '0 0 60%' : '1' }}>
            <TradingChart
              instrument={selectedInstrument}
              currentPrice={currentPrice}
              positions={positions.filter(p => p.symbol === selectedInstrument.symbol)}
            />
          </div>

          {/* Positions panel */}
          <div
            className="border-t border-[#1a2d4a] bg-[#071220] overflow-hidden"
            style={{ flex: positionsExpanded ? '0 0 40%' : '0 0 32px' }}
          >
            <button
              onClick={() => setPositionsExpanded(v => !v)}
              className="flex items-center gap-2 w-full px-4 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] hover:bg-[#0f1f38] transition-colors"
            >
              <BarChart2 size={11} className="text-[#00d4aa]" />
              <span className="text-[10px] font-semibold text-[#7f93b5] uppercase tracking-wider">
                Positions & History
              </span>
              {positions.length > 0 && (
                <span className="ml-1 text-[9px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 rounded-full font-mono">
                  {positions.length}
                </span>
              )}
              <span className="ml-auto text-[#4a5e7a] text-xs">{positionsExpanded ? '▼' : '▲'}</span>
            </button>
            {positionsExpanded && (
              <div className="h-full overflow-hidden">
                <PositionsTable prices={prices} />
              </div>
            )}
          </div>
        </div>

        {/* Order panel */}
        <OrderPanel instrument={selectedInstrument} currentPrice={currentPrice} />
      </div>
    </div>
  )
}
