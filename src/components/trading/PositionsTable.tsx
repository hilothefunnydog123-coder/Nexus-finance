'use client'

import { X, TrendingUp, TrendingDown } from 'lucide-react'
import { usePortfolioStore, type Position } from '@/store/portfolioStore'
import { calcPnL, INSTRUMENT_MAP } from '@/lib/instruments'

interface Props {
  prices: Record<string, number>
}

export default function PositionsTable({ prices }: Props) {
  const { positions, closedTrades, closePosition, getTotalUnrealizedPnL, getTotalEquity } = usePortfolioStore()
  const totalPnL = getTotalUnrealizedPnL(prices)
  const equity = getTotalEquity(prices)

  if (positions.length === 0 && closedTrades.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-center">
        <div>
          <p className="text-[11px] text-[#4a5e7a]">No open positions</p>
          <p className="text-[10px] text-[#4a5e7a] mt-1">Place a trade using the order panel</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary row */}
      <div className="flex items-center gap-6 px-4 py-1.5 border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#4a5e7a] uppercase">Equity</span>
          <span className="mono text-[11px] font-semibold text-[#cdd6f4]">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#4a5e7a] uppercase">Floating P&L</span>
          <span className={`mono text-[11px] font-semibold ${totalPnL >= 0 ? 'text-up' : 'text-down'}`}>
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[9px] text-[#4a5e7a] uppercase">Open</span>
          <span className="mono text-[11px] text-[#cdd6f4]">{positions.length}</span>
        </div>
      </div>

      {/* Positions table */}
      {positions.length > 0 && (
        <div className="overflow-x-auto shrink-0">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#1a2d4a] bg-[#040c14]">
                {['Symbol','Side','Size','Entry','Current','P&L','SL','TP',''].map(h => (
                  <th key={h} className="px-3 py-1 text-left text-[9px] font-semibold text-[#4a5e7a] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.map(pos => {
                const instrument = INSTRUMENT_MAP[pos.symbol]
                const price = prices[pos.symbol] || pos.entryPrice
                const pnl = instrument ? calcPnL(instrument, pos.side, pos.entryPrice, price, pos.quantity) : 0
                const pnlPct = (pnl / pos.marginUsed) * 100
                const isUp = pnl >= 0
                const digits = instrument?.digits ?? 2

                return (
                  <tr key={pos.id} className="border-b border-[#1a2d4a]/40 hover:bg-[#071220]">
                    <td className="px-3 py-1.5 font-bold text-[#00d4aa]">{pos.symbol}</td>
                    <td className="px-3 py-1.5">
                      <span className={`flex items-center gap-1 text-[10px] font-bold ${pos.side === 'long' ? 'text-up' : 'text-down'}`}>
                        {pos.side === 'long' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                        {pos.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 mono text-[#7f93b5]">{pos.quantity}</td>
                    <td className="px-3 py-1.5 mono text-[#7f93b5]">{pos.entryPrice.toFixed(digits)}</td>
                    <td className="px-3 py-1.5 mono font-semibold text-[#cdd6f4]">{price.toFixed(digits)}</td>
                    <td className="px-3 py-1.5">
                      <div className={`mono font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                        {isUp ? '+' : ''}${pnl.toFixed(2)}
                      </div>
                      <div className={`text-[9px] mono ${isUp ? 'text-up' : 'text-down'}`}>
                        {isUp ? '+' : ''}{pnlPct.toFixed(1)}%
                      </div>
                    </td>
                    <td className="px-3 py-1.5 mono text-[#ff4757] text-[10px]">
                      {pos.stopLoss ? pos.stopLoss.toFixed(digits) : '—'}
                    </td>
                    <td className="px-3 py-1.5 mono text-[#00d4aa] text-[10px]">
                      {pos.takeProfit ? pos.takeProfit.toFixed(digits) : '—'}
                    </td>
                    <td className="px-3 py-1.5">
                      <button
                        onClick={() => closePosition(pos.id, price)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#ff4757] border border-[#ff4757]/30 rounded hover:bg-[#ff4757]/10 transition-colors"
                      >
                        <X size={9} /> Close
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Trade history */}
      {closedTrades.length > 0 && (
        <div className="flex-1 overflow-y-auto border-t border-[#1a2d4a]">
          <div className="px-3 py-1 bg-[#040c14] sticky top-0">
            <span className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Trade History</span>
          </div>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b border-[#1a2d4a]">
                {['Symbol','Side','Size','Entry','Exit','P&L'].map(h => (
                  <th key={h} className="px-3 py-1 text-left text-[9px] text-[#4a5e7a] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {closedTrades.slice(0, 20).map(t => (
                <tr key={t.id} className="border-b border-[#1a2d4a]/30 hover:bg-[#071220]">
                  <td className="px-3 py-1 text-[#7f93b5]">{t.symbol}</td>
                  <td className={`px-3 py-1 text-[10px] font-bold ${t.side === 'long' ? 'text-up' : 'text-down'}`}>{t.side.toUpperCase()}</td>
                  <td className="px-3 py-1 mono text-[#7f93b5]">{t.quantity}</td>
                  <td className="px-3 py-1 mono text-[#7f93b5]">{t.entryPrice.toFixed(2)}</td>
                  <td className="px-3 py-1 mono text-[#7f93b5]">{t.exitPrice.toFixed(2)}</td>
                  <td className={`px-3 py-1 mono font-bold ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                    {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
