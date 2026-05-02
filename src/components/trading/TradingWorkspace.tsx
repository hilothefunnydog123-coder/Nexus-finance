'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Wifi, WifiOff, Bell, BellOff, X } from 'lucide-react'
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

// Price simulation — starts from mockBasePrice and walks randomly
function useLivePrices() {
  const pricesRef = useRef<Record<string, number>>(
    Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, i.mockBasePrice]))
  )
  const [prices, setPrices] = useState<Record<string, number>>({ ...pricesRef.current })

  useEffect(() => {
    const interval = setInterval(() => {
      const next = { ...pricesRef.current }
      const keys = Object.keys(next)
      keys.sort(() => Math.random() - 0.5).slice(0, 5).forEach(sym => {
        const inst = INSTRUMENTS.find(i => i.symbol === sym)
        if (!inst) return
        const vol = inst.type === 'forex' ? 0.00015 : inst.type === 'futures' ? 0.00025 : 0.0018
        const change = (Math.random() - 0.495) * next[sym] * vol
        next[sym] = +(next[sym] + change).toFixed(inst.digits)
        pricesRef.current[sym] = next[sym]
      })
      setPrices({ ...next })
    }, 800)
    return () => clearInterval(interval)
  }, [])

  return prices
}

interface PriceAlert { id: string; symbol: string; price: number; direction: 'above' | 'below'; triggered: boolean }

export default function TradingWorkspace() {
  const [activeType, setActiveType] = useState<InstrumentType>('stock')
  const [selected, setSelected] = useState<Instrument>(INSTRUMENTS[0])
  const [positionsOpen, setPositionsOpen] = useState(true)
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [alerts, setAlerts] = useState<PriceAlert[]>([])
  const [showAlerts, setShowAlerts] = useState(false)
  const [alertInput, setAlertInput] = useState('')
  const [triggeredAlert, setTriggeredAlert] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const prices = useLivePrices()
  const { positions, checkAutoClose } = usePortfolioStore()

  // Auto-close SL/TP
  useEffect(() => {
    const t = setInterval(() => checkAutoClose(prices), 1000)
    return () => clearInterval(t)
  }, [prices, checkAutoClose])

  // Check price alerts
  useEffect(() => {
    setAlerts(prev => prev.map(alert => {
      if (alert.triggered) return alert
      const price = prices[alert.symbol]
      if (!price) return alert
      const hit = alert.direction === 'above' ? price >= alert.price : price <= alert.price
      if (hit) {
        setTriggeredAlert(`🔔 ${alert.symbol} hit $${alert.price}`)
        setTimeout(() => setTriggeredAlert(null), 5000)
        return { ...alert, triggered: true }
      }
      return alert
    }))
  }, [prices])

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowSearch(v => !v)
        setTimeout(() => searchRef.current?.focus(), 50)
      }
      if (e.key === 'Escape') { setShowSearch(false); setSearch('') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const typeInstruments = getByType(activeType)
  const searchResults = search.length >= 1
    ? INSTRUMENTS.filter(i =>
        i.symbol.toLowerCase().includes(search.toLowerCase()) ||
        i.name.toLowerCase().includes(search.toLowerCase())
      ).slice(0, 8)
    : []

  const currentPrice = prices[selected.symbol] || selected.mockBasePrice

  const addAlert = () => {
    const price = parseFloat(alertInput)
    if (!price || isNaN(price)) return
    const direction = price > currentPrice ? 'above' : 'below'
    setAlerts(prev => [...prev, { id: crypto.randomUUID(), symbol: selected.symbol, price, direction, triggered: false }])
    setAlertInput('')
  }

  return (
    <div className="flex flex-col h-full bg-[#040c14] relative">

      {/* Triggered alert toast */}
      {triggeredAlert && (
        <div className="absolute top-12 left-1/2 -translate-x-1/2 z-50 bg-[#ffa502] text-[#040c14] px-4 py-2 rounded shadow-xl text-sm font-bold animate-bounce">
          {triggeredAlert}
        </div>
      )}

      {/* Instrument search overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-start justify-center pt-20">
          <div className="w-96 bg-[#071220] border border-[#1e3a5f] rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-[#1a2d4a]">
              <Search size={14} className="text-[#4a5e7a]" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search instruments... (Ctrl+K)"
                className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]"
                autoFocus
              />
              <button onClick={() => { setShowSearch(false); setSearch('') }}><X size={13} className="text-[#4a5e7a]" /></button>
            </div>
            {searchResults.map(inst => {
              const price = prices[inst.symbol] || inst.mockBasePrice
              const chg = ((price - inst.mockBasePrice) / inst.mockBasePrice) * 100
              return (
                <button key={inst.symbol} onClick={() => { setSelected(inst); setActiveType(inst.type); setShowSearch(false); setSearch('') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f1f38] transition-colors border-b border-[#1a2d4a]/40 text-left">
                  <div className="flex-1">
                    <span className="text-sm font-bold text-[#cdd6f4]">{inst.symbol}</span>
                    <span className="text-[10px] text-[#4a5e7a] ml-2">{inst.name}</span>
                  </div>
                  <span className="text-[10px] text-[#4a5e7a] uppercase">{inst.type}</span>
                  <div className="text-right">
                    <div className="mono text-xs text-[#cdd6f4]">${price.toFixed(inst.digits)}</div>
                    <div className={`mono text-[10px] ${chg >= 0 ? 'text-up' : 'text-down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>
                  </div>
                </button>
              )
            })}
            {search && !searchResults.length && (
              <div className="px-4 py-4 text-[11px] text-[#4a5e7a] text-center">No instruments found</div>
            )}
          </div>
        </div>
      )}

      {/* Instrument bar */}
      <div className="flex items-center border-b border-[#1a2d4a] bg-[#071220] shrink-0" style={{ height: 40 }}>
        {/* Type tabs */}
        {TYPE_TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveType(tab.id); const first = getByType(tab.id)[0]; if (first) setSelected(first) }}
            className={`flex items-center gap-1.5 px-3 h-full text-[11px] font-semibold border-r border-[#1a2d4a] transition-colors shrink-0 ${
              activeType === tab.id ? 'text-[#cdd6f4] border-b-2 border-b-[#00d4aa] bg-[#0a1628]' : 'text-[#7f93b5] hover:bg-[#0a1628]'
            }`}>
            {tab.emoji} {tab.label}
          </button>
        ))}

        {/* Instrument list */}
        <div className="flex items-center h-full overflow-x-auto flex-1 scrollbar-none">
          {typeInstruments.map(inst => {
            const price = prices[inst.symbol] || inst.mockBasePrice
            const chg = ((price - inst.mockBasePrice) / inst.mockBasePrice) * 100
            const isSel = inst.symbol === selected.symbol
            return (
              <button key={inst.symbol} onClick={() => setSelected(inst)}
                className={`flex items-center gap-2 px-3 h-full border-r border-[#1a2d4a] shrink-0 hover:bg-[#0f1f38] transition-colors ${
                  isSel ? 'bg-[#0f1f38] border-b-2 border-b-[#1e90ff]' : ''
                }`}>
                <span className={`text-[11px] font-semibold ${isSel ? 'text-[#1e90ff]' : 'text-[#cdd6f4]'}`}>{inst.symbol}</span>
                <div>
                  <div className={`mono text-[10px] font-semibold ${chg >= 0 ? 'text-up' : 'text-down'}`}>
                    {inst.type === 'forex' ? price.toFixed(inst.digits) : `$${price.toFixed(2)}`}
                  </div>
                  <div className={`mono text-[9px] ${chg >= 0 ? 'text-up' : 'text-down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-1 px-2 border-l border-[#1a2d4a] shrink-0">
          <button onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}
            className="p-1.5 text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors rounded hover:bg-[#0f1f38]" title="Search (Ctrl+K)">
            <Search size={12} />
          </button>
          <button onClick={() => setShowAlerts(v => !v)}
            className={`p-1.5 transition-colors rounded hover:bg-[#0f1f38] ${showAlerts ? 'text-[#ffa502]' : 'text-[#4a5e7a] hover:text-[#cdd6f4]'}`} title="Price Alerts">
            {alerts.filter(a => !a.triggered).length > 0 ? <Bell size={12} /> : <BellOff size={12} />}
          </button>
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />
            <span className="text-[9px] text-[#00d4aa] mono">Live</span>
          </div>
        </div>
      </div>

      {/* Alerts panel */}
      {showAlerts && (
        <div className="absolute top-10 right-0 z-30 w-64 bg-[#071220] border border-[#1e3a5f] shadow-2xl rounded-bl">
          <div className="px-3 py-2 border-b border-[#1a2d4a] flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#cdd6f4]">Price Alerts — {selected.symbol}</span>
            <button onClick={() => setShowAlerts(false)}><X size={11} className="text-[#4a5e7a]" /></button>
          </div>
          <div className="p-3">
            <div className="flex gap-2 mb-3">
              <input type="number" value={alertInput} onChange={e => setAlertInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addAlert()}
                placeholder={`Alert at price (now: ${currentPrice.toFixed(selected.digits)})`}
                className="flex-1 bg-[#0f1f38] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none focus:border-[#ffa502]"
              />
              <button onClick={addAlert} className="px-2 py-1 bg-[#ffa502] text-[#040c14] rounded text-[10px] font-bold">Set</button>
            </div>
            {alerts.length === 0 && <p className="text-[10px] text-[#4a5e7a] text-center py-2">No alerts set</p>}
            {alerts.map(alert => (
              <div key={alert.id} className={`flex items-center gap-2 py-1.5 px-2 rounded mb-1 ${alert.triggered ? 'opacity-50' : ''}`}
                style={{ background: alert.triggered ? 'rgba(0,212,170,0.05)' : 'rgba(255,165,2,0.05)' }}>
                <span className="text-[9px]">{alert.direction === 'above' ? '▲' : '▼'}</span>
                <span className="mono text-xs text-[#cdd6f4]">{alert.symbol} @ ${alert.price}</span>
                {alert.triggered && <span className="text-[9px] text-[#00d4aa] ml-auto">✓ Hit</span>}
                {!alert.triggered && (
                  <button onClick={() => setAlerts(prev => prev.filter(a => a.id !== alert.id))} className="ml-auto text-[#4a5e7a] hover:text-[#ff4757]">
                    <X size={9} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main area */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {/* Chart */}
          <div className="min-h-0 overflow-hidden" style={{ flex: positionsOpen ? '0 0 58%' : '1' }}>
            <TradingChart
              instrument={selected}
              currentPrice={currentPrice}
              positions={positions.filter(p => p.symbol === selected.symbol)}
            />
          </div>

          {/* Positions panel */}
          <div className="border-t border-[#1a2d4a] bg-[#071220] min-h-0 overflow-hidden"
            style={{ flex: positionsOpen ? '0 0 42%' : '0 0 34px' }}>
            <button onClick={() => setPositionsOpen(v => !v)}
              className="flex items-center gap-2 w-full px-4 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] hover:bg-[#0f1f38] transition-colors">
              <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-wider">Positions & Analytics</span>
              {positions.length > 0 && (
                <span className="text-[9px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 rounded-full font-mono">{positions.length} open</span>
              )}
              <span className="ml-auto text-[#4a5e7a] text-[10px]">{positionsOpen ? '▼' : '▲'}</span>
            </button>
            {positionsOpen && (
              <div className="h-full overflow-hidden">
                <PositionsTable prices={prices} />
              </div>
            )}
          </div>
        </div>

        {/* Order panel */}
        <OrderPanel instrument={selected} currentPrice={currentPrice} />
      </div>
    </div>
  )
}
