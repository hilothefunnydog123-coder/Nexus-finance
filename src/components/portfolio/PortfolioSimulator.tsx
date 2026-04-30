'use client'

import { useState } from 'react'
import { DollarSign, TrendingUp, TrendingDown, PlusCircle, RotateCcw, X } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import type { Quote } from '@/lib/types'

interface Props {
  quotes: Record<string, Quote>
  onClose?: () => void
}

function TradeModal({
  symbol,
  quote,
  onClose,
}: {
  symbol: string
  quote: Quote
  onClose: () => void
}) {
  const [action, setAction] = useState<'BUY' | 'SELL'>('BUY')
  const [qty, setQty] = useState('1')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const { buyStock, sellStock, cash, positions } = usePortfolioStore()

  const quantity = parseInt(qty) || 0
  const total = quote.price * quantity
  const position = positions[symbol]

  const execute = () => {
    setError('')
    setSuccess('')
    if (quantity <= 0) { setError('Enter a valid quantity'); return }

    const result = action === 'BUY'
      ? buyStock(symbol, quote.price, quantity)
      : sellStock(symbol, quote.price, quantity)

    if (result.success) {
      setSuccess(`${action} ${quantity} ${symbol} @ $${quote.price.toFixed(2)} executed!`)
      setTimeout(onClose, 1500)
    } else {
      setError(result.error || 'Trade failed')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-80 bg-[#071220] border border-[#1e3a5f] rounded shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2d4a] bg-[#0a1628]">
          <div>
            <span className="text-sm font-bold text-[#cdd6f4]">{symbol}</span>
            <span className="ml-2 mono text-sm text-[#00d4aa]">${quote.price.toFixed(2)}</span>
          </div>
          <button onClick={onClose} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={14} /></button>
        </div>

        <div className="p-4 space-y-4">
          {/* Buy/Sell toggle */}
          <div className="flex rounded overflow-hidden border border-[#1a2d4a]">
            {(['BUY', 'SELL'] as const).map(a => (
              <button
                key={a}
                onClick={() => { setAction(a); setError(''); setSuccess('') }}
                className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                  action === a
                    ? a === 'BUY' ? 'bg-[#00d4aa] text-[#040c14]' : 'bg-[#ff4757] text-white'
                    : 'text-[#7f93b5] hover:bg-[#0f1f38]'
                }`}
              >
                {a}
              </button>
            ))}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-[10px] text-[#4a5e7a] uppercase tracking-wider block mb-1">Quantity (shares)</label>
            <input
              type="number"
              value={qty}
              onChange={e => setQty(e.target.value)}
              min="1"
              className="w-full bg-[#0f1f38] border border-[#1a2d4a] rounded px-3 py-2 text-sm mono text-[#cdd6f4] outline-none focus:border-[#1e3a5f]"
            />
          </div>

          {/* Order summary */}
          <div className="bg-[#0f1f38] rounded p-3 space-y-1.5">
            <div className="flex justify-between text-[11px]">
              <span className="text-[#7f93b5]">Market Price</span>
              <span className="mono text-[#cdd6f4]">${quote.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[11px]">
              <span className="text-[#7f93b5]">Quantity</span>
              <span className="mono text-[#cdd6f4]">{quantity} shares</span>
            </div>
            <div className="flex justify-between text-[11px] pt-1 border-t border-[#1a2d4a]">
              <span className="text-[#7f93b5] font-semibold">Est. Total</span>
              <span className="mono text-[#cdd6f4] font-bold">${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Account info */}
          <div className="flex justify-between text-[10px]">
            <span className="text-[#4a5e7a]">Cash Available</span>
            <span className="mono text-[#7f93b5]">${cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
          </div>
          {position && (
            <div className="flex justify-between text-[10px]">
              <span className="text-[#4a5e7a]">Shares Held</span>
              <span className="mono text-[#7f93b5]">{position.quantity} @ ${position.avgCost.toFixed(2)} avg</span>
            </div>
          )}

          {error && <p className="text-[11px] text-[#ff4757] bg-[#ff4757]/10 rounded px-2 py-1">{error}</p>}
          {success && <p className="text-[11px] text-[#00d4aa] bg-[#00d4aa]/10 rounded px-2 py-1">{success}</p>}

          <button
            onClick={execute}
            className={`w-full py-2.5 rounded font-bold text-sm uppercase tracking-wider transition-colors ${
              action === 'BUY'
                ? 'bg-[#00d4aa] hover:bg-[#00ffcc] text-[#040c14]'
                : 'bg-[#ff4757] hover:bg-[#ff6b7a] text-white'
            }`}
          >
            {action === 'BUY' ? `Buy ${quantity || ''} ${symbol}` : `Sell ${quantity || ''} ${symbol}`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PortfolioSimulator({ quotes, onClose }: Props) {
  const { cash, positions, transactions, getTotalValue, getTotalPnL, resetPortfolio } = usePortfolioStore()
  const [tradeSymbol, setTradeSymbol] = useState<string | null>(null)

  const prices = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, v.price]))
  const totalValue = getTotalValue(prices)
  const totalPnL = getTotalPnL(prices)
  const totalPnLPct = ((totalValue - 100_000) / 100_000) * 100
  const positionEntries = Object.entries(positions)

  const tradeQuote = tradeSymbol ? quotes[tradeSymbol] : null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {tradeSymbol && tradeQuote && (
        <TradeModal symbol={tradeSymbol} quote={tradeQuote} onClose={() => setTradeSymbol(null)} />
      )}

      <div className="w-[700px] max-h-[80vh] bg-[#071220] border border-[#1e3a5f] rounded shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
          <div className="flex items-center gap-2">
            <DollarSign size={14} className="text-[#00d4aa]" />
            <span className="text-sm font-bold text-[#cdd6f4] uppercase tracking-wider">Portfolio Simulator</span>
            <span className="text-[10px] bg-[#ffa502]/20 text-[#ffa502] px-1.5 py-0.5 rounded font-mono">PAPER TRADING</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { if (confirm('Reset portfolio to $100,000?')) resetPortfolio() }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] text-[#7f93b5] hover:text-[#cdd6f4] border border-[#1a2d4a] rounded"
            >
              <RotateCcw size={10} /> Reset
            </button>
            {onClose && (
              <button onClick={onClose} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={14} /></button>
            )}
          </div>
        </div>

        {/* Portfolio summary */}
        <div className="grid grid-cols-4 border-b border-[#1a2d4a] shrink-0">
          {[
            { label: 'Total Value', value: `$${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#cdd6f4' },
            { label: 'Cash', value: `$${cash.toLocaleString('en-US', { minimumFractionDigits: 2 })}`, color: '#7f93b5' },
            {
              label: 'Total P&L',
              value: `${totalPnL >= 0 ? '+' : ''}$${totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
              color: totalPnL >= 0 ? '#00d4aa' : '#ff4757',
            },
            {
              label: 'Return',
              value: `${totalPnLPct >= 0 ? '+' : ''}${totalPnLPct.toFixed(2)}%`,
              color: totalPnLPct >= 0 ? '#00d4aa' : '#ff4757',
            },
          ].map(({ label, value, color }) => (
            <div key={label} className="px-4 py-3 border-r border-[#1a2d4a] last:border-r-0">
              <div className="text-[10px] text-[#4a5e7a] uppercase tracking-wider mb-1">{label}</div>
              <div className="mono text-sm font-bold" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Positions */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between px-4 py-2 border-b border-[#1a2d4a] bg-[#0a1628]">
              <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-wider">Open Positions</span>
              <button
                onClick={() => setTradeSymbol(Object.keys(quotes)[0] || 'AAPL')}
                className="flex items-center gap-1 text-[10px] text-[#00d4aa] hover:text-[#00ffcc]"
              >
                <PlusCircle size={10} /> New Trade
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {positionEntries.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-center">
                  <p className="text-[11px] text-[#4a5e7a]">No open positions</p>
                  <p className="text-[10px] text-[#4a5e7a] mt-1">You have $100,000 to deploy</p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="grid grid-cols-6 gap-2 px-4 py-1 border-b border-[#1a2d4a] bg-[#040c14]">
                    {['Symbol', 'Qty', 'Avg Cost', 'Current', 'Mkt Value', 'P&L'].map(h => (
                      <div key={h} className="text-[9px] text-[#4a5e7a] uppercase tracking-wider text-right first:text-left">{h}</div>
                    ))}
                  </div>
                  {positionEntries.map(([sym, pos]) => {
                    const current = quotes[sym]?.price || pos.avgCost
                    const mv = current * pos.quantity
                    const pnl = (current - pos.avgCost) * pos.quantity
                    const pnlPct = ((current - pos.avgCost) / pos.avgCost) * 100
                    const isUp = pnl >= 0

                    return (
                      <div
                        key={sym}
                        className="grid grid-cols-6 gap-2 px-4 py-2 border-b border-[#1a2d4a]/50 hover:bg-[#0f1f38] cursor-pointer"
                        onClick={() => setTradeSymbol(sym)}
                      >
                        <div className="text-xs font-bold text-[#00d4aa]">{sym}</div>
                        <div className="mono text-xs text-[#7f93b5] text-right">{pos.quantity}</div>
                        <div className="mono text-xs text-[#7f93b5] text-right">${pos.avgCost.toFixed(2)}</div>
                        <div className={`mono text-xs text-right ${isUp ? 'text-up' : 'text-down'}`}>${current.toFixed(2)}</div>
                        <div className="mono text-xs text-[#cdd6f4] text-right">${mv.toFixed(0)}</div>
                        <div className={`mono text-xs text-right font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
                          <div>{isUp ? '+' : ''}${pnl.toFixed(2)}</div>
                          <div className="text-[9px]">{isUp ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
          </div>

          {/* Transaction log */}
          <div className="w-52 border-l border-[#1a2d4a] flex flex-col min-h-0">
            <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628]">
              <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-wider">Trade Log</span>
            </div>
            <div className="overflow-y-auto flex-1">
              {transactions.length === 0 ? (
                <div className="flex items-center justify-center h-16">
                  <span className="text-[10px] text-[#4a5e7a]">No trades yet</span>
                </div>
              ) : (
                transactions.slice(0, 20).map(tx => (
                  <div key={tx.id} className="px-3 py-2 border-b border-[#1a2d4a]/50 hover:bg-[#0f1f38]">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className={`text-[9px] font-bold px-1 rounded ${tx.action === 'BUY' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-[#ff4757]/20 text-[#ff4757]'}`}>
                        {tx.action}
                      </span>
                      <span className="text-xs font-semibold text-[#cdd6f4]">{tx.symbol}</span>
                    </div>
                    <div className="text-[10px] text-[#7f93b5] mono">{tx.quantity}sh @ ${tx.price.toFixed(2)}</div>
                    <div className="text-[9px] text-[#4a5e7a] mono">${tx.total.toFixed(2)}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
