'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, AlertCircle, Keyboard } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { calcMargin, type Instrument } from '@/lib/instruments'

const QTY_PRESETS: Record<string, number[]> = {
  stock:   [1, 5, 10, 25, 100],
  forex:   [0.01, 0.1, 0.5, 1, 2],
  futures: [1, 2, 3, 5, 10],
}

interface Props {
  instrument: Instrument
  currentPrice: number
}

export default function OrderPanel({ instrument, currentPrice }: Props) {
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [qty, setQty] = useState(QTY_PRESETS[instrument.type][0].toString())
  const [leverage, setLeverage] = useState(instrument.leverage[0])
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { openPosition, cash } = usePortfolioStore()

  useEffect(() => {
    setLeverage(instrument.leverage[0])
    setQty(QTY_PRESETS[instrument.type][0].toString())
    setSl(''); setTp(''); setError(''); setSuccess('')
  }, [instrument.symbol, instrument.type, instrument.leverage])

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return
      if (e.key === 'b' || e.key === 'B') setSide('long')
      if (e.key === 's' || e.key === 'S') setSide('short')
      if (e.key === 'Enter' && !e.shiftKey) execute()
      const idx = parseInt(e.key) - 1
      const presets = QTY_PRESETS[instrument.type]
      if (idx >= 0 && idx < presets.length) setQty(presets[idx].toString())
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  const quantity = parseFloat(qty) || 0
  const margin = calcMargin(instrument, currentPrice, quantity, leverage)
  const pip = instrument.pip

  const validateSL = (): string | null => {
    if (!sl) return null
    const slPrice = parseFloat(sl)
    if (side === 'long' && slPrice >= currentPrice) return 'SL must be below entry for Long'
    if (side === 'short' && slPrice <= currentPrice) return 'SL must be above entry for Short'
    return null
  }

  const validateTP = (): string | null => {
    if (!tp) return null
    const tpPrice = parseFloat(tp)
    if (side === 'long' && tpPrice <= currentPrice) return 'TP must be above entry for Long'
    if (side === 'short' && tpPrice >= currentPrice) return 'TP must be below entry for Short'
    return null
  }

  // Risk:Reward ratio
  const getRR = (): string | null => {
    const slPrice = sl ? parseFloat(sl) : null
    const tpPrice = tp ? parseFloat(tp) : null
    if (!slPrice || !tpPrice) return null
    const risk = Math.abs(currentPrice - slPrice)
    const reward = Math.abs(tpPrice - currentPrice)
    if (risk === 0) return null
    return `${(reward / risk).toFixed(2)}:1`
  }

  // Estimated P&L
  const getEstPnL = (targetPrice: number) => {
    const diff = side === 'long' ? targetPrice - currentPrice : currentPrice - targetPrice
    if (instrument.type === 'forex') return diff * quantity * instrument.contractSize
    if (instrument.type === 'futures') return diff * quantity * instrument.contractSize
    return diff * quantity
  }

  const execute = useCallback(() => {
    setError(''); setSuccess('')
    const slErr = validateSL()
    const tpErr = validateTP()
    if (slErr) { setError(slErr); return }
    if (tpErr) { setError(tpErr); return }
    if (quantity <= 0) { setError('Enter a valid quantity'); return }

    const result = openPosition({
      instrument, side, quantity, price: currentPrice, leverage,
      stopLoss: sl ? parseFloat(sl) : undefined,
      takeProfit: tp ? parseFloat(tp) : undefined,
    })
    if (result.success) {
      setSuccess(`✓ ${side === 'long' ? 'Bought' : 'Sold'} ${quantity} ${instrument.symbol} @ ${currentPrice.toFixed(instrument.digits)}`)
      setTimeout(() => setSuccess(''), 3000)
      setSl(''); setTp('')
    } else {
      setError(result.error || 'Order rejected')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side, quantity, currentPrice, leverage, sl, tp, instrument])

  const fmt = (n: number) => instrument.type !== 'stock' ? n.toFixed(instrument.digits) : `$${n.toFixed(2)}`
  const rr = getRR()
  const slEstPnL = sl ? getEstPnL(parseFloat(sl)) : null
  const tpEstPnL = tp ? getEstPnL(parseFloat(tp)) : null

  return (
    <div className="flex flex-col h-full bg-[#071220] border-l border-[#1a2d4a] overflow-y-auto" style={{ width: 248, minWidth: 248 }}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#4a5e7a] uppercase tracking-widest">Order Entry</span>
          <div className="flex items-center gap-1 text-[9px] text-[#4a5e7a]">
            <Keyboard size={9} />
            <span>B/S keys • 1–5 qty</span>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm font-bold text-[#cdd6f4]">{instrument.symbol}</span>
          <span className={`mono text-sm font-bold ${side === 'long' ? 'text-up' : 'text-down'}`}>
            {fmt(currentPrice)}
          </span>
        </div>
      </div>

      <div className="flex-1 p-3 space-y-3">
        {/* Long / Short */}
        <div className="flex rounded overflow-hidden border border-[#1a2d4a]">
          {(['long', 'short'] as const).map(s => (
            <button key={s} onClick={() => { setSide(s); setError('') }}
              className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-wide flex items-center justify-center gap-1 transition-colors ${
                side === s
                  ? s === 'long' ? 'bg-[#00d4aa] text-[#040c14]' : 'bg-[#ff4757] text-white'
                  : 'text-[#7f93b5] hover:bg-[#0f1f38]'
              }`}>
              {s === 'long' ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
              {s === 'long' ? 'Buy / Long' : 'Sell / Short'}
            </button>
          ))}
        </div>

        {/* Quick qty presets */}
        <div>
          <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">
            {instrument.type === 'forex' ? 'Lots' : instrument.type === 'futures' ? 'Contracts' : 'Shares'}
          </label>
          <div className="flex gap-1 mb-1.5">
            {QTY_PRESETS[instrument.type].map((preset, i) => (
              <button key={preset} onClick={() => setQty(preset.toString())}
                className={`flex-1 py-1 text-[10px] font-mono rounded border transition-colors ${
                  parseFloat(qty) === preset
                    ? 'bg-[#0f1f38] border-[#1e3a5f] text-[#cdd6f4]'
                    : 'border-[#1a2d4a] text-[#4a5e7a] hover:border-[#1e3a5f] hover:text-[#7f93b5]'
                }`}>
                {i + 1}:{preset}
              </button>
            ))}
          </div>
          <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
            <button onClick={() => setQty(v => Math.max(0.01, parseFloat(v) - (instrument.type === 'forex' ? 0.01 : 1)).toString())}
              className="px-3 text-lg text-[#7f93b5] hover:bg-[#0f1f38] font-bold">−</button>
            <input type="number" value={qty} onChange={e => setQty(e.target.value)} min="0.01"
              className="flex-1 bg-[#0f1f38] text-center text-sm mono text-[#cdd6f4] outline-none py-2" />
            <button onClick={() => setQty(v => (parseFloat(v) + (instrument.type === 'forex' ? 0.01 : 1)).toString())}
              className="px-3 text-lg text-[#7f93b5] hover:bg-[#0f1f38] font-bold">+</button>
          </div>
        </div>

        {/* Leverage */}
        {instrument.leverage.length > 1 && (
          <div>
            <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">
              Leverage — <span className="text-[#1e90ff] font-bold">{leverage}x</span>
            </label>
            <div className="flex gap-1 flex-wrap">
              {instrument.leverage.map(lv => (
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
            { label: 'Stop Loss', key: 'sl', val: sl, set: setSl, color: '#ff4757', estPnL: slEstPnL },
            { label: 'Take Profit', key: 'tp', val: tp, set: setTp, color: '#00d4aa', estPnL: tpEstPnL },
          ].map(({ label, val, set, color, estPnL }) => (
            <div key={label}>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color }}>{label}</label>
              <input type="number" value={val} step={pip} onChange={e => { set(e.target.value); setError('') }}
                placeholder={fmt(side === 'long'
                  ? (label === 'Stop Loss' ? currentPrice * 0.985 : currentPrice * 1.02)
                  : (label === 'Stop Loss' ? currentPrice * 1.015 : currentPrice * 0.98)
                )}
                className="w-full bg-[#0f1f38] border rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none transition-colors"
                style={{ borderColor: val ? color + '60' : '#1a2d4a' }}
              />
              {val && estPnL !== null && (
                <span className={`text-[9px] mono font-semibold`} style={{ color }}>
                  {estPnL >= 0 ? '+' : ''}${estPnL.toFixed(2)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* R:R display */}
        {rr && (
          <div className={`flex items-center justify-between px-3 py-1.5 rounded border ${
            parseFloat(rr) >= 2 ? 'border-[#00d4aa]/30 bg-[#00d4aa]/5' :
            parseFloat(rr) >= 1 ? 'border-[#ffa502]/30 bg-[#ffa502]/5' :
            'border-[#ff4757]/30 bg-[#ff4757]/5'
          }`}>
            <span className="text-[10px] text-[#7f93b5]">Risk : Reward</span>
            <span className={`mono text-sm font-bold ${
              parseFloat(rr) >= 2 ? 'text-up' : parseFloat(rr) >= 1 ? 'text-[#ffa502]' : 'text-down'
            }`}>{rr}</span>
          </div>
        )}

        {/* Summary */}
        <div className="bg-[#040c14] rounded border border-[#1a2d4a] p-2.5 space-y-1.5">
          {[
            { label: 'Entry Price', value: fmt(currentPrice) },
            { label: 'Position Size', value: instrument.type === 'stock' ? `${quantity} shares` : instrument.type === 'forex' ? `${quantity} lots` : `${quantity} contracts` },
            { label: 'Margin Required', value: `$${margin.toFixed(2)}`, warn: margin > cash },
            { label: 'Available Cash', value: `$${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
          ].map(({ label, value, warn }) => (
            <div key={label} className="flex justify-between">
              <span className="text-[10px] text-[#4a5e7a]">{label}</span>
              <span className={`mono text-[10px] font-semibold ${warn ? 'text-[#ff4757]' : 'text-[#cdd6f4]'}`}>{value}</span>
            </div>
          ))}
        </div>

        {error && (
          <div className="flex items-start gap-1.5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded px-2.5 py-2">
            <AlertCircle size={11} className="text-[#ff4757] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#ff4757]">{error}</p>
          </div>
        )}
        {success && (
          <div className="bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded px-2.5 py-2">
            <p className="text-[10px] text-[#00d4aa]">{success}</p>
          </div>
        )}

        <button onClick={execute} disabled={quantity <= 0 || margin > cash}
          className={`w-full py-3 rounded font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
            side === 'long'
              ? 'bg-[#00d4aa] hover:bg-[#00ffcc] text-[#040c14] shadow-[0_0_24px_rgba(0,212,170,0.25)]'
              : 'bg-[#ff4757] hover:bg-[#ff6b7a] text-white shadow-[0_0_24px_rgba(255,71,87,0.25)]'
          }`}>
          {side === 'long' ? '▲ BUY' : '▼ SELL'} {instrument.symbol}
          <span className="ml-2 text-xs opacity-70">⏎</span>
        </button>
      </div>
    </div>
  )
}
