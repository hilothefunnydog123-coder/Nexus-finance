'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { calcMargin, calcPnL, type Instrument } from '@/lib/instruments'

interface Props {
  instrument: Instrument
  currentPrice: number
}

export default function OrderPanel({ instrument, currentPrice }: Props) {
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [qty, setQty] = useState('1')
  const [leverage, setLeverage] = useState(instrument.leverage[0])
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { openPosition, cash } = usePortfolioStore()

  // Reset leverage when instrument changes
  useEffect(() => {
    setLeverage(instrument.leverage[0])
    setSl('')
    setTp('')
    setError('')
    setSuccess('')
  }, [instrument.symbol, instrument.leverage])

  const quantity = parseFloat(qty) || 0
  const margin = calcMargin(instrument, currentPrice, quantity, leverage)
  const pip = instrument.pip
  const pipValue = instrument.type === 'forex'
    ? (pip / currentPrice) * instrument.contractSize * quantity * currentPrice
    : pip * quantity

  const slPips = sl ? Math.abs((parseFloat(sl) - currentPrice) / pip) : 0
  const tpPips = tp ? Math.abs((parseFloat(tp) - currentPrice) / pip) : 0

  const execute = () => {
    setError('')
    setSuccess('')
    if (quantity <= 0) { setError('Enter a valid quantity'); return }

    const result = openPosition({
      instrument,
      side,
      quantity,
      price: currentPrice,
      leverage,
      stopLoss: sl ? parseFloat(sl) : undefined,
      takeProfit: tp ? parseFloat(tp) : undefined,
    })

    if (result.success) {
      setSuccess(`✓ ${side.toUpperCase()} ${quantity} ${instrument.symbol} @ ${currentPrice.toFixed(instrument.digits)}`)
      setTimeout(() => setSuccess(''), 3000)
      setSl('')
      setTp('')
    } else {
      setError(result.error || 'Order rejected')
    }
  }

  const fmt = (n: number) => instrument.type === 'forex' ? n.toFixed(instrument.digits) : `$${n.toFixed(instrument.digits)}`

  return (
    <div className="flex flex-col h-full bg-[#071220] border-l border-[#1a2d4a]" style={{ width: 240 }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="text-[10px] text-[#4a5e7a] uppercase tracking-widest mb-0.5">Order Entry</div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold text-[#cdd6f4]">{instrument.symbol}</span>
          <span className={`mono text-sm font-semibold ${side === 'long' ? 'text-up' : 'text-down'}`}>
            {fmt(currentPrice)}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Long / Short */}
        <div className="flex rounded overflow-hidden border border-[#1a2d4a]">
          <button
            onClick={() => setSide('long')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              side === 'long' ? 'bg-[#00d4aa] text-[#040c14]' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
            }`}
          >
            <TrendingUp size={12} /> Buy / Long
          </button>
          <button
            onClick={() => setSide('short')}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors ${
              side === 'short' ? 'bg-[#ff4757] text-white' : 'text-[#7f93b5] hover:bg-[#0f1f38]'
            }`}
          >
            <TrendingDown size={12} /> Sell / Short
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1">
            {instrument.type === 'forex' ? 'Lots' : instrument.type === 'futures' ? 'Contracts' : 'Shares'}
          </label>
          <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
            <button onClick={() => setQty(v => String(Math.max(0.01, parseFloat(v) - (instrument.type === 'forex' ? 0.1 : 1))))}
              className="px-3 text-[#7f93b5] hover:bg-[#0f1f38] text-base font-bold">−</button>
            <input
              type="number"
              value={qty}
              min="0.01"
              step={instrument.type === 'forex' ? 0.1 : 1}
              onChange={e => setQty(e.target.value)}
              className="flex-1 bg-[#0f1f38] text-center text-sm mono text-[#cdd6f4] outline-none py-2"
            />
            <button onClick={() => setQty(v => String(parseFloat(v) + (instrument.type === 'forex' ? 0.1 : 1)))}
              className="px-3 text-[#7f93b5] hover:bg-[#0f1f38] text-base font-bold">+</button>
          </div>
        </div>

        {/* Leverage (forex/futures only) */}
        {instrument.leverage.length > 1 && (
          <div>
            <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1">
              Leverage — {leverage}x
            </label>
            <div className="flex gap-1 flex-wrap">
              {instrument.leverage.map(lv => (
                <button
                  key={lv}
                  onClick={() => setLeverage(lv)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                    leverage === lv
                      ? 'bg-[#1e90ff] border-[#1e90ff] text-white'
                      : 'border-[#1a2d4a] text-[#7f93b5] hover:border-[#1e90ff]'
                  }`}
                >
                  {lv}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SL / TP */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-[#ff4757] uppercase tracking-wider block mb-1">Stop Loss</label>
            <input
              type="number"
              value={sl}
              step={pip}
              onChange={e => setSl(e.target.value)}
              placeholder={fmt(side === 'long' ? currentPrice * 0.99 : currentPrice * 1.01)}
              className="w-full bg-[#0f1f38] border border-[#1a2d4a] focus:border-[#ff4757] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none"
            />
            {slPips > 0 && <span className="text-[9px] text-[#ff4757]">{slPips.toFixed(1)} pips</span>}
          </div>
          <div>
            <label className="text-[10px] text-[#00d4aa] uppercase tracking-wider block mb-1">Take Profit</label>
            <input
              type="number"
              value={tp}
              step={pip}
              onChange={e => setTp(e.target.value)}
              placeholder={fmt(side === 'long' ? currentPrice * 1.01 : currentPrice * 0.99)}
              className="w-full bg-[#0f1f38] border border-[#1a2d4a] focus:border-[#00d4aa] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none"
            />
            {tpPips > 0 && <span className="text-[9px] text-[#00d4aa]">{tpPips.toFixed(1)} pips</span>}
          </div>
        </div>

        {/* Order summary */}
        <div className="bg-[#040c14] rounded border border-[#1a2d4a] p-2.5 space-y-1.5">
          {[
            { label: 'Entry Price', value: fmt(currentPrice) },
            { label: 'Margin Required', value: `$${margin.toFixed(2)}` },
            { label: 'Pip Value', value: `$${pipValue.toFixed(2)}` },
            { label: 'Available Cash', value: `$${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[10px] text-[#4a5e7a]">{label}</span>
              <span className={`mono text-[10px] font-semibold ${label === 'Margin Required' && margin > cash ? 'text-[#ff4757]' : 'text-[#cdd6f4]'}`}>
                {value}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-1.5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded px-2 py-2">
            <AlertCircle size={11} className="text-[#ff4757] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#ff4757]">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded px-2 py-2">
            <p className="text-[10px] text-[#00d4aa]">{success}</p>
          </div>
        )}

        <button
          onClick={execute}
          disabled={quantity <= 0 || margin > cash}
          className={`w-full py-3 rounded font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'long'
              ? 'bg-[#00d4aa] hover:bg-[#00ffcc] text-[#040c14] shadow-[0_0_20px_rgba(0,212,170,0.2)]'
              : 'bg-[#ff4757] hover:bg-[#ff6b7a] text-white shadow-[0_0_20px_rgba(255,71,87,0.2)]'
          }`}
        >
          {side === 'long' ? '▲' : '▼'} {side === 'long' ? 'Buy' : 'Sell'} {instrument.symbol}
        </button>
      </div>
    </div>
  )
}
