'use client'

import { useMemo } from 'react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react'

export default function PortfolioAnalytics() {
  const { closedTrades, getTotalEquity } = usePortfolioStore()
  const equity = getTotalEquity({})

  const stats = useMemo(() => {
    if (closedTrades.length < 2) return null

    const equity_curve = [100_000]
    let runningEquity = 100_000
    closedTrades.slice().reverse().forEach(t => {
      runningEquity += t.pnl
      equity_curve.push(runningEquity)
    })

    // CAGR — simplified (assumes trades span ~1 year)
    const totalReturn = (equity - 100_000) / 100_000
    const cagr = totalReturn * 100

    // Max drawdown
    let peak = equity_curve[0], maxDD = 0
    equity_curve.forEach(v => {
      if (v > peak) peak = v
      const dd = (peak - v) / peak
      if (dd > maxDD) maxDD = dd
    })

    // Win/loss
    const wins = closedTrades.filter(t => t.pnl > 0)
    const losses = closedTrades.filter(t => t.pnl < 0)
    const avgWin = wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0
    const avgLoss = losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0
    const profitFactor = avgLoss > 0 ? (avgWin * wins.length) / (avgLoss * losses.length) : Infinity
    const winRate = (wins.length / closedTrades.length) * 100
    const expectancy = (winRate / 100) * avgWin - ((100 - winRate) / 100) * avgLoss

    // Simplified Sharpe (returns / std dev of returns)
    const returns = closedTrades.map(t => t.pnl / 100_000 * 100)
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length
    const variance = returns.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / returns.length
    const stdDev = Math.sqrt(variance)
    const sharpe = stdDev > 0 ? (mean / stdDev) * Math.sqrt(252) : 0

    return { cagr, maxDD: maxDD * 100, profitFactor, winRate, avgWin, avgLoss, expectancy, sharpe, totalTrades: closedTrades.length }
  }, [closedTrades, equity])

  if (!stats) return (
    <div className="flex items-center justify-center h-full text-center p-6">
      <div>
        <Activity size={20} className="text-[#1a2d4a] mx-auto mb-2" />
        <p className="text-[11px] text-[#4a5e7a]">Close at least 2 trades to see analytics</p>
      </div>
    </div>
  )

  const metrics = [
    { label: 'Total Return',   value: `${stats.cagr >= 0 ? '+' : ''}${stats.cagr.toFixed(2)}%`,  color: stats.cagr >= 0 ? '#00d4aa' : '#ff4757', icon: <TrendingUp size={12} /> },
    { label: 'Sharpe Ratio',   value: stats.sharpe.toFixed(2),  color: stats.sharpe >= 1 ? '#00d4aa' : stats.sharpe >= 0 ? '#ffa502' : '#ff4757', icon: <Activity size={12} /> },
    { label: 'Max Drawdown',   value: `-${stats.maxDD.toFixed(2)}%`, color: stats.maxDD > 10 ? '#ff4757' : '#ffa502', icon: <TrendingDown size={12} /> },
    { label: 'Profit Factor',  value: stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2), color: stats.profitFactor >= 1.5 ? '#00d4aa' : '#ffa502', icon: <Target size={12} /> },
    { label: 'Win Rate',       value: `${stats.winRate.toFixed(1)}%`, color: stats.winRate >= 50 ? '#00d4aa' : '#ff4757', icon: <Activity size={12} /> },
    { label: 'Avg Win',        value: `$${stats.avgWin.toFixed(2)}`,  color: '#00d4aa', icon: <TrendingUp size={12} /> },
    { label: 'Avg Loss',       value: `$${stats.avgLoss.toFixed(2)}`, color: '#ff4757', icon: <TrendingDown size={12} /> },
    { label: 'Expectancy/Trade', value: `${stats.expectancy >= 0 ? '+' : ''}$${stats.expectancy.toFixed(2)}`, color: stats.expectancy >= 0 ? '#00d4aa' : '#ff4757', icon: <Target size={12} /> },
  ]

  return (
    <div className="h-full overflow-y-auto p-3">
      <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-3">
        Portfolio Analytics · {stats.totalTrades} closed trades
      </div>
      <div className="grid grid-cols-2 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-3">
            <div className="flex items-center gap-1.5 mb-1.5 text-[#4a5e7a]">{m.icon}</div>
            <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-0.5">{m.label}</div>
            <div className="mono text-sm font-black" style={{ color: m.color }}>{m.value}</div>
          </div>
        ))}
      </div>
      <div className="mt-3 p-3 bg-[#040c14] rounded-lg border border-[#1a2d4a] text-[9px] text-[#4a5e7a]">
        <strong className="text-[#7f93b5]">Sharpe Ratio:</strong> Above 1.0 = good. Above 2.0 = excellent. Negative = you'd do better in cash.<br/>
        <strong className="text-[#7f93b5]">Expectancy:</strong> Your average profit per trade. Positive = edge. Negative = losing strategy.
      </div>
    </div>
  )
}
