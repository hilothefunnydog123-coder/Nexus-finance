'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, ChevronDown, AlertCircle, TrendingUp, TrendingDown, X, BarChart2, History, Trophy, Clock } from 'lucide-react'
import TradingViewChart, { TV_SYMBOLS } from '@/components/chart/TradingViewChart'
import { INSTRUMENTS, getByType, type Instrument, type InstrumentType, calcMargin, calcPnL, INSTRUMENT_MAP } from '@/lib/instruments'
import { usePortfolioStore } from '@/store/portfolioStore'
import TradeStats from './TradeStats'

const TYPE_TABS: { id: InstrumentType; label: string }[] = [
  { id: 'stock',   label: 'Stocks'  },
  { id: 'forex',   label: 'Forex'   },
  { id: 'futures', label: 'Futures' },
]

const QTY_PRESETS: Record<string, number[]> = {
  stock: [1, 5, 10, 25, 100], forex: [0.01, 0.1, 0.5, 1, 2], futures: [1, 2, 3, 5, 10],
}

// Price sim
const pricesStore: Record<string, number> = Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, i.mockBasePrice]))

function useLivePrices() {
  const ref = useRef(pricesStore)
  const [prices, setPrices] = useState({ ...pricesStore })
  useEffect(() => {
    const id = setInterval(() => {
      const next = { ...ref.current }
      Object.keys(next).sort(() => Math.random() - 0.5).slice(0, 6).forEach(sym => {
        const inst = INSTRUMENTS.find(i => i.symbol === sym)
        if (!inst) return
        const vol = inst.type === 'forex' ? 0.00012 : inst.type === 'futures' ? 0.0002 : 0.0015
        next[sym] = +(next[sym] + (Math.random() - 0.495) * next[sym] * vol).toFixed(inst.digits)
        ref.current[sym] = next[sym]
      })
      setPrices({ ...next })
    }, 900)
    return () => clearInterval(id)
  }, [])
  return prices
}

type PanelTab = 'positions' | 'history' | 'stats'

export default function TradingWorkspace() {
  const [type, setType] = useState<InstrumentType>('stock')
  const [inst, setInst] = useState<Instrument>(INSTRUMENTS[0])
  const [interval, setInterval] = useState('60')
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [qty, setQty] = useState('1')
  const [leverage, setLeverage] = useState(inst.leverage[0])
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [search, setSearch] = useState('')
  const [showSearch, setShowSearch] = useState(false)
  const [panelTab, setPanelTab] = useState<PanelTab>('positions')
  const [panelOpen, setPanelOpen] = useState(true)
  const prices = useLivePrices()
  const { positions, closedTrades, openPosition, closePosition, checkAutoClose, getTotalEquity, getTotalUnrealizedPnL, cash } = usePortfolioStore()
  const searchRef = useRef<HTMLInputElement>(null)

  const price = prices[inst.symbol] || inst.mockBasePrice
  const bid = +(price - inst.pip * 2).toFixed(inst.digits)
  const ask = +(price + inst.pip * 2).toFixed(inst.digits)
  const spread = +((ask - bid) / inst.pip).toFixed(1)
  const equity = getTotalEquity(prices)
  const floatPnL = getTotalUnrealizedPnL(prices)
  const margin = positions.reduce((s, p) => s + p.marginUsed, 0)
  const freeMargin = cash - margin + positions.reduce((s, p) => {
    const instrument = INSTRUMENT_MAP[p.symbol]
    if (!instrument) return s
    return s + calcPnL(instrument, p.side, p.entryPrice, prices[p.symbol] || p.entryPrice, p.quantity)
  }, 0)

  useEffect(() => {
    setLeverage(inst.leverage[0])
    setQty(QTY_PRESETS[inst.type][0].toString())
    setSl(''); setTp(''); setError(''); setSuccess('')
  }, [inst.symbol, inst.type, inst.leverage])

  useEffect(() => {
    const t = window.setInterval(() => checkAutoClose(prices), 1000)
    return () => window.clearInterval(t)
  }, [prices, checkAutoClose])

  const quantity = parseFloat(qty) || 0
  const reqMargin = calcMargin(inst, price, quantity, leverage)

  const rr = sl && tp ? (() => {
    const r = Math.abs(price - parseFloat(sl))
    const rwd = Math.abs(parseFloat(tp) - price)
    return r > 0 ? (rwd / r).toFixed(2) : null
  })() : null

  const execute = useCallback(() => {
    setError(''); setSuccess('')
    if (quantity <= 0) { setError('Enter a valid quantity'); return }
    if (sl && side === 'long' && parseFloat(sl) >= price) { setError('Stop Loss must be below entry for Long'); return }
    if (sl && side === 'short' && parseFloat(sl) <= price) { setError('Stop Loss must be above entry for Short'); return }
    if (tp && side === 'long' && parseFloat(tp) <= price) { setError('Take Profit must be above entry for Long'); return }
    if (tp && side === 'short' && parseFloat(tp) >= price) { setError('Take Profit must be below entry for Short'); return }

    const res = openPosition({ instrument: inst, side, quantity, price, leverage,
      stopLoss: sl ? parseFloat(sl) : undefined, takeProfit: tp ? parseFloat(tp) : undefined })
    if (res.success) {
      setSuccess(`✓ ${side === 'long' ? 'Bought' : 'Sold'} ${quantity} ${inst.symbol}`)
      setTimeout(() => setSuccess(''), 3000)
      setSl(''); setTp('')
    } else { setError(res.error || 'Order rejected') }
  }, [quantity, side, sl, tp, price, inst, leverage, openPosition])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (['INPUT','TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'b' || e.key === 'B') setSide('long')
      if (e.key === 's' || e.key === 'S') setSide('short')
      if (e.key === 'Enter') execute()
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') { e.preventDefault(); setShowSearch(v => !v) }
      if (e.key === 'Escape') { setShowSearch(false); setSearch('') }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [execute])

  const searchResults = search.length >= 1
    ? INSTRUMENTS.filter(i => i.symbol.toLowerCase().includes(search.toLowerCase()) || i.name.toLowerCase().includes(search.toLowerCase())).slice(0, 10)
    : []

  const fmt = (v: number) => inst.type !== 'stock' ? v.toFixed(inst.digits) : `$${v.toFixed(2)}`

  return (
    <div className="flex flex-col h-full bg-[#040c14] relative overflow-hidden">

      {/* Search overlay */}
      {showSearch && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-start justify-center pt-16">
          <div className="w-[480px] bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1a2d4a]">
              <Search size={15} className="text-[#4a5e7a]" />
              <input ref={searchRef} value={search} onChange={e => setSearch(e.target.value)} autoFocus
                placeholder="Search symbol — stocks, forex, futures..."
                className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]" />
              <kbd className="text-[9px] text-[#4a5e7a] border border-[#1a2d4a] px-1.5 py-0.5 rounded">ESC</kbd>
            </div>
            {!search && (
              <div className="p-3">
                {TYPE_TABS.map(t => (
                  <div key={t.id} className="mb-2">
                    <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider px-2 mb-1">{t.label}</div>
                    <div className="flex gap-1 flex-wrap">
                      {getByType(t.id).slice(0, 6).map(i => (
                        <button key={i.symbol} onClick={() => { setInst(i); setType(t.id); setShowSearch(false); setSearch('') }}
                          className="px-2.5 py-1 bg-[#0f1f38] hover:bg-[#1a2d4a] text-[11px] font-mono text-[#cdd6f4] rounded transition-colors">
                          {i.symbol}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {search && searchResults.map(i => {
              const p = prices[i.symbol] || i.mockBasePrice
              const chg = ((p - i.mockBasePrice) / i.mockBasePrice) * 100
              return (
                <button key={i.symbol} onClick={() => { setInst(i); setType(i.type); setShowSearch(false); setSearch('') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[#0f1f38] border-b border-[#1a2d4a]/30 text-left">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#cdd6f4]">{i.symbol}</div>
                    <div className="text-[10px] text-[#4a5e7a]">{i.name}</div>
                  </div>
                  <span className="text-[9px] text-[#4a5e7a] uppercase px-1.5 py-0.5 bg-[#0f1f38] rounded">{i.type}</span>
                  <div className="text-right">
                    <div className="mono text-sm font-bold text-[#cdd6f4]">{i.type === 'forex' ? p.toFixed(i.digits) : `$${p.toFixed(2)}`}</div>
                    <div className={`mono text-[10px] ${chg >= 0 ? 'text-up' : 'text-down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Account Bar ── */}
      <div className="flex items-center gap-6 px-4 py-2 border-b border-[#1a2d4a] bg-[#030a12] shrink-0 text-[10px]">
        {[
          { label: 'Balance',     value: `$${(100_000).toLocaleString()}`,                                          color: '#7f93b5' },
          { label: 'Equity',      value: `$${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: equity >= 100_000 ? '#00d4aa' : '#ff4757' },
          { label: 'Float P&L',   value: `${floatPnL >= 0 ? '+' : ''}$${floatPnL.toFixed(2)}`,                     color: floatPnL >= 0 ? '#00d4aa' : '#ff4757' },
          { label: 'Margin',      value: `$${margin.toFixed(2)}`,                                                   color: '#ffa502' },
          { label: 'Free Margin', value: `$${freeMargin.toFixed(2)}`,                                               color: freeMargin < 500 ? '#ff4757' : '#7f93b5' },
          { label: 'Positions',   value: String(positions.length),                                                   color: '#cdd6f4' },
        ].map(({ label, value, color }) => (
          <div key={label}>
            <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider">{label}</div>
            <div className="mono font-bold" style={{ color }}>{value}</div>
          </div>
        ))}
        <div className="ml-auto flex items-center gap-2 text-[9px] text-[#4a5e7a]">
          <kbd className="border border-[#1a2d4a] px-1.5 py-0.5 rounded font-mono">B</kbd> Long &nbsp;
          <kbd className="border border-[#1a2d4a] px-1.5 py-0.5 rounded font-mono">S</kbd> Short &nbsp;
          <kbd className="border border-[#1a2d4a] px-1.5 py-0.5 rounded font-mono">⏎</kbd> Execute &nbsp;
          <kbd className="border border-[#1a2d4a] px-1.5 py-0.5 rounded font-mono">⌘K</kbd> Search
        </div>
      </div>

      {/* ── Symbol Bar ── */}
      <div className="flex items-center border-b border-[#1a2d4a] bg-[#071220] shrink-0" style={{ height: 44 }}>
        {/* Type tabs */}
        {TYPE_TABS.map(t => (
          <button key={t.id} onClick={() => { setType(t.id); const f = getByType(t.id)[0]; if (f) { setInst(f) } }}
            className={`flex items-center gap-1.5 px-4 h-full text-[11px] font-bold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors shrink-0 ${
              type === t.id ? 'text-[#00d4aa] bg-[#0a1628] border-b-2 border-b-[#00d4aa]' : 'text-[#4a5e7a] hover:bg-[#0a1628]'
            }`}>{t.label}
          </button>
        ))}

        {/* Current symbol info */}
        <button onClick={() => { setShowSearch(true); setTimeout(() => searchRef.current?.focus(), 50) }}
          className="flex items-center gap-3 px-5 h-full border-r border-[#1a2d4a] hover:bg-[#0a1628] transition-colors">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-[#cdd6f4]">{inst.symbol}</span>
              <ChevronDown size={12} className="text-[#4a5e7a]" />
            </div>
            <div className="text-[9px] text-[#4a5e7a]">{inst.name}</div>
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-[8px] text-[#ff4757] uppercase tracking-wider">Bid</div>
              <div className="mono text-sm font-bold text-[#ff4757]">{bid.toFixed(inst.digits)}</div>
            </div>
            <div>
              <div className="text-[8px] text-[#00d4aa] uppercase tracking-wider">Ask</div>
              <div className="mono text-sm font-bold text-[#00d4aa]">{ask.toFixed(inst.digits)}</div>
            </div>
            <div>
              <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider">Spread</div>
              <div className="mono text-xs text-[#7f93b5]">{spread} {inst.type === 'forex' ? 'pips' : 'pts'}</div>
            </div>
          </div>
        </button>

        {/* Instrument list */}
        <div className="flex items-center h-full overflow-x-auto flex-1">
          {getByType(type).map(i => {
            const p = prices[i.symbol] || i.mockBasePrice
            const chg = ((p - i.mockBasePrice) / i.mockBasePrice) * 100
            const isSel = i.symbol === inst.symbol
            return (
              <button key={i.symbol} onClick={() => setInst(i)}
                className={`flex items-center gap-2 px-3 h-full border-r border-[#1a2d4a] shrink-0 hover:bg-[#0f1f38] transition-colors ${isSel ? 'bg-[#0f1f38] border-b-2 border-b-[#1e90ff]' : ''}`}>
                <span className={`text-[11px] font-semibold ${isSel ? 'text-[#1e90ff]' : 'text-[#cdd6f4]'}`}>{i.symbol}</span>
                <div>
                  <div className={`mono text-[10px] font-bold ${chg >= 0 ? 'text-up' : 'text-down'}`}>
                    {i.type === 'forex' ? p.toFixed(i.digits) : `$${p.toFixed(2)}`}
                  </div>
                  <div className={`mono text-[9px] ${chg >= 0 ? 'text-up' : 'text-down'}`}>{chg >= 0 ? '+' : ''}{chg.toFixed(2)}%</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Interval */}
        <div className="flex border-l border-[#1a2d4a] h-full">
          {['5m','15m','1h','4h','1D'].map(iv => (
            <button key={iv} onClick={() => setInterval(iv)}
              className={`px-3 h-full text-[10px] font-mono border-r border-[#1a2d4a] transition-colors ${
                interval === iv ? 'bg-[#00d4aa] text-[#040c14] font-bold' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
              }`}>{iv}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main: Chart + Order Panel ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Chart */}
        <div className="flex-1 min-w-0 flex flex-col min-h-0 overflow-hidden">
          {/* TradingView chart */}
          <div className="min-h-0 overflow-hidden" style={{ flex: panelOpen ? '0 0 60%' : '1' }}>
            <TradingViewChart symbol={inst.symbol} interval={interval} />
          </div>

          {/* Positions / History / Stats panel */}
          <div className="border-t border-[#1a2d4a] bg-[#071220] min-h-0 overflow-hidden shrink-0"
            style={{ flex: panelOpen ? '0 0 40%' : '0 0 36px' }}>
            {/* Panel header */}
            <div className="flex items-center border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
              {([
                { id: 'positions' as PanelTab, label: 'Positions', icon: <BarChart2 size={11} />, count: positions.length },
                { id: 'history'   as PanelTab, label: 'History',   icon: <History size={11} />,  count: closedTrades.length },
                { id: 'stats'     as PanelTab, label: 'Stats',     icon: <Trophy size={11} /> },
              ]).map(t => (
                <button key={t.id} onClick={() => { setPanelTab(t.id); setPanelOpen(true) }}
                  className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors ${
                    panelTab === t.id ? 'text-[#cdd6f4] border-b-2 border-b-[#00d4aa] bg-[#071220]' : 'text-[#4a5e7a] hover:bg-[#071220]'
                  }`}>
                  {t.icon} {t.label}
                  {'count' in t && (t.count ?? 0) > 0 && (
                    <span className="text-[8px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 rounded-full">{t.count}</span>
                  )}
                </button>
              ))}
              <button onClick={() => setPanelOpen(v => !v)} className="ml-auto px-3 text-[#4a5e7a] hover:text-[#cdd6f4] text-xs">
                {panelOpen ? '▼' : '▲'}
              </button>
            </div>

            {panelOpen && (
              <div className="overflow-auto h-full pb-8">
                {panelTab === 'positions' && (
                  positions.length === 0
                    ? <div className="flex items-center justify-center h-20 text-[11px] text-[#4a5e7a]">No open positions</div>
                    : <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-[#040c14]">
                          <tr className="border-b border-[#1a2d4a]">
                            {['Symbol','Side','Size','Entry','Current','P&L','SL','TP','Lev',''].map(h => (
                              <th key={h} className="px-3 py-1.5 text-left text-[9px] text-[#4a5e7a] uppercase tracking-wider whitespace-nowrap">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {positions.map(pos => {
                            const instrument = INSTRUMENT_MAP[pos.symbol]
                            const p = prices[pos.symbol] || pos.entryPrice
                            const pnl = instrument ? calcPnL(instrument, pos.side, pos.entryPrice, p, pos.quantity) : 0
                            const isUp = pnl >= 0
                            const digits = instrument?.digits ?? 2
                            return (
                              <tr key={pos.id} className="border-b border-[#1a2d4a]/40 hover:bg-[#0a1628]">
                                <td className="px-3 py-2 font-bold text-[#00d4aa]">{pos.symbol}</td>
                                <td className={`px-3 py-2 text-[10px] font-bold ${pos.side === 'long' ? 'text-up' : 'text-down'}`}>
                                  <span className="flex items-center gap-1">{pos.side === 'long' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}{pos.side.toUpperCase()}</span>
                                </td>
                                <td className="px-3 py-2 mono text-[#7f93b5]">{pos.quantity}</td>
                                <td className="px-3 py-2 mono text-[#7f93b5]">{pos.entryPrice.toFixed(digits)}</td>
                                <td className="px-3 py-2 mono font-semibold text-[#cdd6f4]">{p.toFixed(digits)}</td>
                                <td className="px-3 py-2">
                                  <div className={`mono font-bold ${isUp ? 'text-up' : 'text-down'}`}>{isUp ? '+' : ''}${pnl.toFixed(2)}</div>
                                </td>
                                <td className="px-3 py-2 mono text-[#ff4757] text-[10px]">{pos.stopLoss?.toFixed(digits) ?? '—'}</td>
                                <td className="px-3 py-2 mono text-[#00d4aa] text-[10px]">{pos.takeProfit?.toFixed(digits) ?? '—'}</td>
                                <td className="px-3 py-2 mono text-[#7f93b5] text-[10px]">{pos.leverage}x</td>
                                <td className="px-3 py-2">
                                  <button onClick={() => closePosition(pos.id, p)}
                                    className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#ff4757] border border-[#ff4757]/30 rounded hover:bg-[#ff4757]/10">
                                    <X size={9} /> Close
                                  </button>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                )}
                {panelTab === 'history' && (
                  closedTrades.length === 0
                    ? <div className="flex items-center justify-center h-20 text-[11px] text-[#4a5e7a]">No closed trades</div>
                    : <table className="w-full text-[11px]">
                        <thead className="sticky top-0 bg-[#040c14]">
                          <tr className="border-b border-[#1a2d4a]">
                            {['Symbol','Side','Size','Entry','Exit','P&L','Closed'].map(h => (
                              <th key={h} className="px-3 py-1.5 text-left text-[9px] text-[#4a5e7a] uppercase tracking-wider">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {closedTrades.slice(0, 50).map(t => (
                            <tr key={t.id} className="border-b border-[#1a2d4a]/30 hover:bg-[#0a1628]">
                              <td className="px-3 py-1.5 font-bold text-[#cdd6f4]">{t.symbol}</td>
                              <td className={`px-3 py-1.5 text-[10px] font-bold ${t.side === 'long' ? 'text-up' : 'text-down'}`}>{t.side.toUpperCase()}</td>
                              <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.quantity}</td>
                              <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.entryPrice.toFixed(2)}</td>
                              <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.exitPrice.toFixed(2)}</td>
                              <td className={`px-3 py-1.5 mono font-bold ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</td>
                              <td className="px-3 py-1.5 text-[9px] text-[#4a5e7a] mono">{new Date(t.closedAt).toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                )}
                {panelTab === 'stats' && <TradeStats />}
              </div>
            )}
          </div>
        </div>

        {/* ── Order Panel ── */}
        <div className="flex flex-col border-l border-[#1a2d4a] bg-[#071220] shrink-0 overflow-y-auto" style={{ width: 256 }}>
          {/* Current price */}
          <div className="px-4 py-3 border-b border-[#1a2d4a] bg-[#0a1628]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">{inst.name}</span>
              <span className="text-[9px] text-[#4a5e7a] mono">{inst.type.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <div className="text-[8px] text-[#ff4757] uppercase tracking-wider mb-0.5">SELL</div>
                <div className="mono text-lg font-black text-[#ff4757]">{bid.toFixed(inst.digits)}</div>
              </div>
              <div className="text-center">
                <div className="text-[9px] text-[#4a5e7a] mono">{spread}</div>
                <div className="text-[8px] text-[#4a5e7a]">spread</div>
              </div>
              <div className="flex-1 text-right">
                <div className="text-[8px] text-[#00d4aa] uppercase tracking-wider mb-0.5">BUY</div>
                <div className="mono text-lg font-black text-[#00d4aa]">{ask.toFixed(inst.digits)}</div>
              </div>
            </div>
          </div>

          <div className="p-3 space-y-3 flex-1">
            {/* Sell / Buy */}
            <div className="flex gap-2">
              <button onClick={() => { setSide('short'); setError('') }}
                className={`flex-1 py-3 text-xs font-black uppercase rounded transition-all ${
                  side === 'short'
                    ? 'bg-[#ff4757] text-white shadow-[0_0_20px_rgba(255,71,87,0.4)]'
                    : 'bg-[#ff4757]/10 text-[#ff4757] border border-[#ff4757]/30 hover:bg-[#ff4757]/20'
                }`}>
                ▼ SELL
              </button>
              <button onClick={() => { setSide('long'); setError('') }}
                className={`flex-1 py-3 text-xs font-black uppercase rounded transition-all ${
                  side === 'long'
                    ? 'bg-[#00d4aa] text-[#040c14] shadow-[0_0_20px_rgba(0,212,170,0.4)]'
                    : 'bg-[#00d4aa]/10 text-[#00d4aa] border border-[#00d4aa]/30 hover:bg-[#00d4aa]/20'
                }`}>
                ▲ BUY
              </button>
            </div>

            {/* Volume */}
            <div>
              <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">
                {inst.type === 'forex' ? 'Volume (Lots)' : inst.type === 'futures' ? 'Contracts' : 'Shares'}
              </label>
              <div className="flex rounded border border-[#1a2d4a] overflow-hidden mb-1.5">
                <button onClick={() => setQty(v => Math.max(0.01, parseFloat(v) - (inst.type === 'forex' ? 0.01 : 1)).toString())}
                  className="px-3 py-2 text-[#7f93b5] hover:bg-[#0f1f38] text-base font-bold shrink-0">−</button>
                <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.01"
                  className="flex-1 bg-[#0f1f38] text-center text-sm mono text-[#cdd6f4] outline-none py-2" />
                <button onClick={() => setQty(v => (parseFloat(v) + (inst.type === 'forex' ? 0.01 : 1)).toString())}
                  className="px-3 py-2 text-[#7f93b5] hover:bg-[#0f1f38] text-base font-bold shrink-0">+</button>
              </div>
              <div className="flex gap-1">
                {QTY_PRESETS[inst.type].map((p, i) => (
                  <button key={p} onClick={() => setQty(p.toString())}
                    className={`flex-1 py-1 text-[9px] font-mono rounded border transition-colors ${
                      parseFloat(qty) === p ? 'bg-[#0f1f38] border-[#1e3a5f] text-[#cdd6f4]' : 'border-[#1a2d4a] text-[#4a5e7a] hover:border-[#1e3a5f]'
                    }`}>{i + 1}:{p}</button>
                ))}
              </div>
            </div>

            {/* Leverage */}
            {inst.leverage.length > 1 && (
              <div>
                <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">
                  Leverage <span className="text-[#1e90ff] font-bold">{leverage}x</span>
                </label>
                <div className="flex gap-1 flex-wrap">
                  {inst.leverage.map(lv => (
                    <button key={lv} onClick={() => setLeverage(lv)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                        leverage === lv ? 'bg-[#1e90ff] border-[#1e90ff] text-white' : 'border-[#1a2d4a] text-[#7f93b5] hover:border-[#1e90ff]'
                      }`}>{lv}x</button>
                  ))}
                </div>
              </div>
            )}

            {/* SL / TP */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Stop Loss', key: 'sl', val: sl, set: setSl, color: '#ff4757' },
                { label: 'Take Profit', key: 'tp', val: tp, set: setTp, color: '#00d4aa' },
              ].map(({ label, val, set, color }) => (
                <div key={label}>
                  <label className="text-[9px] uppercase tracking-wider block mb-1" style={{ color }}>{label}</label>
                  <input type="number" value={val} step={inst.pip} onChange={e => { set(e.target.value); setError('') }}
                    placeholder={fmt(price)}
                    className="w-full bg-[#040c14] border rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none transition-colors"
                    style={{ borderColor: val ? color + '60' : '#1a2d4a' }} />
                </div>
              ))}
            </div>

            {/* R:R */}
            {rr && (
              <div className={`flex items-center justify-between px-3 py-2 rounded border ${
                parseFloat(rr) >= 2 ? 'border-[#00d4aa]/30 bg-[#00d4aa]/5' : parseFloat(rr) >= 1 ? 'border-[#ffa502]/30 bg-[#ffa502]/5' : 'border-[#ff4757]/30 bg-[#ff4757]/5'
              }`}>
                <span className="text-[10px] text-[#7f93b5]">Risk : Reward</span>
                <span className={`mono text-sm font-bold ${parseFloat(rr) >= 2 ? 'text-up' : parseFloat(rr) >= 1 ? 'text-[#ffa502]' : 'text-down'}`}>{rr}:1</span>
              </div>
            )}

            {/* Summary */}
            <div className="bg-[#040c14] rounded border border-[#1a2d4a] p-2.5 space-y-1.5 text-[10px]">
              {[
                { label: 'Order Type',  value: 'Market Order' },
                { label: 'Direction',   value: side === 'long' ? '▲ LONG / BUY' : '▼ SHORT / SELL', color: side === 'long' ? '#00d4aa' : '#ff4757' },
                { label: 'Margin Req',  value: `$${reqMargin.toFixed(2)}`, warn: reqMargin > cash },
                { label: 'Free Margin', value: `$${freeMargin.toFixed(2)}` },
              ].map(({ label, value, color, warn }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-[#4a5e7a]">{label}</span>
                  <span className="mono font-semibold" style={{ color: (warn ? '#ff4757' : color) || '#cdd6f4' }}>{value}</span>
                </div>
              ))}
            </div>

            {error && (
              <div className="flex items-start gap-1.5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded px-2.5 py-2">
                <AlertCircle size={11} className="text-[#ff4757] shrink-0 mt-0.5" />
                <p className="text-[10px] text-[#ff4757]">{error}</p>
              </div>
            )}
            {success && <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded px-2.5 py-2 text-[10px] text-[#00d4aa]">{success}</div>}

            {/* Execute */}
            <button onClick={execute} disabled={quantity <= 0 || reqMargin > cash}
              className={`w-full py-3.5 rounded font-black text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                side === 'long'
                  ? 'bg-[#00d4aa] hover:bg-[#00ffcc] text-[#040c14] shadow-[0_0_30px_rgba(0,212,170,0.3)]'
                  : 'bg-[#ff4757] hover:bg-[#ff6b7a] text-white shadow-[0_0_30px_rgba(255,71,87,0.3)]'
              }`}>
              {side === 'long' ? '▲ BUY' : '▼ SELL'} {inst.symbol} &nbsp;<span className="text-xs opacity-70">⏎</span>
            </button>

            <div className="flex items-center gap-1.5 text-[9px] text-[#4a5e7a] text-center justify-center">
              <Clock size={9} />
              Market execution · No commissions · Demo account
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
