'use client'

import { useState } from 'react'
import { X, TrendingUp, TrendingDown, BarChart2, History, Trophy } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { calcPnL, INSTRUMENT_MAP } from '@/lib/instruments'
import TradeStats from './TradeStats'

interface Props { prices: Record<string, number> }

type Tab = 'positions' | 'history' | 'stats'

export default function PositionsTable({ prices }: Props) {
  const { positions, closedTrades, closePosition, getTotalUnrealizedPnL, getTotalEquity, resetPortfolio } = usePortfolioStore()
  const [tab, setTab] = useState<Tab>('positions')
  const totalPnL = getTotalUnrealizedPnL(prices)
  const equity = getTotalEquity(prices)
  const equityPct = ((equity - 100_000) / 100_000) * 100

  const TABS: { id: Tab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'positions', label: 'Positions', icon: <BarChart2 size={11} />, count: positions.length },
    { id: 'history',  label: 'History',   icon: <History size={11} />,  count: closedTrades.length },
    { id: 'stats',    label: 'Stats',     icon: <Trophy size={11} /> },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Summary + tabs */}
      <div className="flex items-center border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
        {/* Equity summary */}
        <div className="flex items-center gap-5 px-4 py-1.5 border-r border-[#1a2d4a]">
          <div>
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Equity</div>
            <div className="mono text-xs font-bold text-[#cdd6f4]">${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
          <div>
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Float P&L</div>
            <div className={`mono text-xs font-bold ${totalPnL >= 0 ? 'text-up' : 'text-down'}`}>
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">Return</div>
            <div className={`mono text-xs font-bold ${equityPct >= 0 ? 'text-up' : 'text-down'}`}>
              {equityPct >= 0 ? '+' : ''}{equityPct.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex h-full">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-[10px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors ${
                tab === t.id ? 'text-[#cdd6f4] border-b-2 border-b-[#00d4aa] bg-[#071220]' : 'text-[#4a5e7a] hover:bg-[#071220]'
              }`}>
              {t.icon} {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span className="text-[9px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 rounded-full font-mono">{t.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto px-3">
          <button onClick={() => { if (confirm('Reset to $100,000?')) resetPortfolio() }}
            className="text-[9px] text-[#4a5e7a] hover:text-[#ff4757] uppercase tracking-wider transition-colors">
            Reset Account
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {tab === 'positions' && (
          positions.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] text-[#4a5e7a]">No open positions — use the order panel to place a trade</p>
            </div>
          ) : (
            <div className="overflow-x-auto h-full">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0">
                  <tr className="border-b border-[#1a2d4a] bg-[#040c14]">
                    {['Symbol','Side','Size','Entry','Current','Unrealized P&L','SL','TP','Lev',''].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] font-semibold text-[#4a5e7a] uppercase tracking-wider whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {positions.map(pos => {
                    const instrument = INSTRUMENT_MAP[pos.symbol]
                    const price = prices[pos.symbol] || pos.entryPrice
                    const pnl = instrument ? calcPnL(instrument, pos.side, pos.entryPrice, price, pos.quantity) : 0
                    const pnlPct = pos.marginUsed > 0 ? (pnl / pos.marginUsed) * 100 : 0
                    const isUp = pnl >= 0
                    const digits = instrument?.digits ?? 2
                    return (
                      <tr key={pos.id} className="border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors">
                        <td className="px-3 py-2 font-bold text-[#00d4aa]">{pos.symbol}</td>
                        <td className="px-3 py-2">
                          <span className={`flex items-center gap-1 text-[10px] font-bold ${pos.side === 'long' ? 'text-up' : 'text-down'}`}>
                            {pos.side === 'long' ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                            {pos.side.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-3 py-2 mono text-[#7f93b5]">{pos.quantity}</td>
                        <td className="px-3 py-2 mono text-[#7f93b5]">{pos.entryPrice.toFixed(digits)}</td>
                        <td className="px-3 py-2 mono font-semibold text-[#cdd6f4]">{price.toFixed(digits)}</td>
                        <td className="px-3 py-2">
                          <div className={`mono font-bold text-xs ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? '+' : ''}${pnl.toFixed(2)}
                          </div>
                          <div className={`text-[9px] mono ${isUp ? 'text-up' : 'text-down'}`}>
                            {isUp ? '+' : ''}{pnlPct.toFixed(1)}% on margin
                          </div>
                        </td>
                        <td className="px-3 py-2 mono text-[#ff4757] text-[10px]">{pos.stopLoss?.toFixed(digits) ?? '—'}</td>
                        <td className="px-3 py-2 mono text-[#00d4aa] text-[10px]">{pos.takeProfit?.toFixed(digits) ?? '—'}</td>
                        <td className="px-3 py-2 mono text-[#7f93b5] text-[10px]">{pos.leverage}x</td>
                        <td className="px-3 py-2">
                          <button onClick={() => closePosition(pos.id, price)}
                            className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-[#ff4757] border border-[#ff4757]/30 rounded hover:bg-[#ff4757]/10 transition-colors">
                            <X size={9} /> Close
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'history' && (
          closedTrades.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-[11px] text-[#4a5e7a]">No closed trades yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto h-full">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0">
                  <tr className="border-b border-[#1a2d4a] bg-[#040c14]">
                    {['Symbol','Side','Size','Entry','Exit','P&L','Opened'].map(h => (
                      <th key={h} className="px-3 py-1.5 text-left text-[9px] text-[#4a5e7a] uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {closedTrades.slice(0, 50).map(t => (
                    <tr key={t.id} className="border-b border-[#1a2d4a]/30 hover:bg-[#071220]">
                      <td className="px-3 py-1.5 font-bold text-[#cdd6f4]">{t.symbol}</td>
                      <td className={`px-3 py-1.5 text-[10px] font-bold ${t.side === 'long' ? 'text-up' : 'text-down'}`}>{t.side.toUpperCase()}</td>
                      <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.quantity}</td>
                      <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.entryPrice.toFixed(2)}</td>
                      <td className="px-3 py-1.5 mono text-[#7f93b5]">{t.exitPrice.toFixed(2)}</td>
                      <td className={`px-3 py-1.5 mono font-bold ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </td>
                      <td className="px-3 py-1.5 text-[#4a5e7a] text-[9px]">
                        {new Date(t.openedAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        {tab === 'stats' && <TradeStats />}
      </div>
    </div>
  )
}
