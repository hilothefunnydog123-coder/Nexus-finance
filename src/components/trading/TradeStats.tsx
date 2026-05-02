'use client'

import { useMemo } from 'react'
import { Trophy, TrendingDown, BarChart2, Target } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

export default function TradeStats() {
  const { closedTrades, cash } = usePortfolioStore()

  const stats = useMemo(() => {
    if (!closedTrades.length) return null

    const wins = closedTrades.filter(t => t.pnl > 0)
    const losses = closedTrades.filter(t => t.pnl <= 0)
    const winRate = (wins.length / closedTrades.length) * 100
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0)
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0))
    const profitFactor = grossLoss === 0 ? Infinity : grossProfit / grossLoss
    const avgWin = wins.length ? grossProfit / wins.length : 0
    const avgLoss = losses.length ? grossLoss / losses.length : 0
    const best = closedTrades.reduce((a, b) => a.pnl > b.pnl ? a : b)
    const worst = closedTrades.reduce((a, b) => a.pnl < b.pnl ? a : b)
    const netPnL = closedTrades.reduce((s, t) => s + t.pnl, 0)
    const totalReturn = ((100_000 + netPnL - 100_000) / 100_000) * 100

    return { winRate, profitFactor, avgWin, avgLoss, best, worst, netPnL, totalReturn, wins: wins.length, losses: losses.length, total: closedTrades.length }
  }, [closedTrades, cash])

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <BarChart2 size={24} className="text-[#1a2d4a] mb-3" />
        <p className="text-[11px] text-[#4a5e7a]">No closed trades yet</p>
        <p className="text-[10px] text-[#4a5e7a] mt-1">Your statistics will appear after your first closed trade</p>
      </div>
    )
  }

  const StatCard = ({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub?: string; color?: string }) => (
    <div className="bg-[#040c14] rounded border border-[#1a2d4a] p-3">
      <div className="flex items-center gap-1.5 mb-1.5">
        <span className="text-[#4a5e7a]">{icon}</span>
        <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">{label}</span>
      </div>
      <div className="mono text-base font-bold" style={{ color: color || '#cdd6f4' }}>{value}</div>
      {sub && <div className="text-[9px] text-[#4a5e7a] mt-0.5">{sub}</div>}
    </div>
  )

  return (
    <div className="p-3 overflow-y-auto h-full">
      <div className="grid grid-cols-2 gap-2 mb-3">
        <StatCard icon={<Trophy size={11} />} label="Win Rate"
          value={`${stats.winRate.toFixed(1)}%`}
          sub={`${stats.wins}W / ${stats.losses}L of ${stats.total} trades`}
          color={stats.winRate >= 50 ? '#00d4aa' : '#ff4757'}
        />
        <StatCard icon={<Target size={11} />} label="Profit Factor"
          value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
          sub="Gross profit / gross loss"
          color={stats.profitFactor >= 1.5 ? '#00d4aa' : stats.profitFactor >= 1 ? '#ffa502' : '#ff4757'}
        />
        <StatCard icon={<TrendingDown size={11} />} label="Avg Win"
          value={`$${stats.avgWin.toFixed(2)}`}
          sub={`Avg loss: $${stats.avgLoss.toFixed(2)}`}
          color="#00d4aa"
        />
        <StatCard icon={<BarChart2 size={11} />} label="Net P&L"
          value={`${stats.netPnL >= 0 ? '+' : ''}$${stats.netPnL.toFixed(2)}`}
          sub={`${stats.totalReturn >= 0 ? '+' : ''}${stats.totalReturn.toFixed(2)}% return`}
          color={stats.netPnL >= 0 ? '#00d4aa' : '#ff4757'}
        />
      </div>

      {/* Best/Worst trade */}
      <div className="space-y-1.5">
        {[
          { label: '🏆 Best Trade', trade: stats.best, color: '#00d4aa' },
          { label: '💀 Worst Trade', trade: stats.worst, color: '#ff4757' },
        ].map(({ label, trade, color }) => (
          <div key={label} className="flex items-center justify-between bg-[#040c14] border border-[#1a2d4a] rounded px-3 py-2">
            <div>
              <span className="text-[10px] text-[#4a5e7a]">{label}</span>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs font-bold text-[#cdd6f4]">{trade.symbol}</span>
                <span className={`text-[9px] px-1 rounded font-bold ${trade.side === 'long' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-[#ff4757]/20 text-[#ff4757]'}`}>
                  {trade.side.toUpperCase()}
                </span>
              </div>
            </div>
            <span className="mono text-sm font-bold" style={{ color }}>
              {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Expectancy */}
      <div className="mt-3 bg-[#040c14] border border-[#1a2d4a] rounded p-3">
        <div className="text-[10px] text-[#4a5e7a] mb-2 uppercase tracking-wider">Expectancy per trade</div>
        <div className="mono text-base font-bold" style={{ color: (stats.winRate / 100 * stats.avgWin - (1 - stats.winRate / 100) * stats.avgLoss) >= 0 ? '#00d4aa' : '#ff4757' }}>
          ${(stats.winRate / 100 * stats.avgWin - (1 - stats.winRate / 100) * stats.avgLoss).toFixed(2)}
        </div>
        <p className="text-[9px] text-[#4a5e7a] mt-1">Expected profit per trade based on your historical performance</p>
      </div>
    </div>
  )
}
