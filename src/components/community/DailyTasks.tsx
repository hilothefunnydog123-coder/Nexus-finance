'use client'

import { useState, useEffect } from 'react'
import { CheckSquare, Square, Star, Zap, Target, Calendar, Trophy, BookOpen } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

interface Task {
  id: string
  title: string
  description: string
  xp: number
  category: 'daily' | 'weekly' | 'challenge'
  icon: React.ReactNode
  completed: boolean
  locked?: boolean
}

export default function DailyTasks() {
  const { positions, closedTrades } = usePortfolioStore()
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const todayTrades = closedTrades.filter(t =>
      new Date(t.closedAt).toDateString() === new Date().toDateString()
    )
    const profitableTrades = todayTrades.filter(t => t.pnl > 0)
    const hasRR = todayTrades.some(t => {
      const risk = Math.abs(t.entryPrice - (t.entryPrice * 0.99))
      const reward = Math.abs(t.exitPrice - t.entryPrice)
      return reward / risk >= 2
    })

    setTasks([
      {
        id: 'd1', category: 'daily', xp: 50,
        icon: <Zap size={12} className="text-[#ffa502]" />,
        title: 'Open the platform',
        description: 'Start your trading day on Nexus Finance',
        completed: true,
      },
      {
        id: 'd2', category: 'daily', xp: 100,
        icon: <Target size={12} className="text-[#00d4aa]" />,
        title: 'Execute a 2:1 R:R trade',
        description: 'Place a trade with at least 2:1 risk-to-reward ratio',
        completed: hasRR,
      },
      {
        id: 'd3', category: 'daily', xp: 75,
        icon: <CheckSquare size={12} className="text-[#1e90ff]" />,
        title: 'Close a profitable trade',
        description: 'Exit at least one position in profit today',
        completed: profitableTrades.length > 0,
      },
      {
        id: 'd4', category: 'daily', xp: 50,
        icon: <BookOpen size={12} className="text-[#a855f7]" />,
        title: 'Post a trade idea',
        description: 'Share a trade setup in the community',
        completed: false,
      },
      {
        id: 'd5', category: 'daily', xp: 25,
        icon: <Calendar size={12} className="text-[#1e90ff]" />,
        title: 'Check the economic calendar',
        description: 'Review today\'s high-impact events before trading',
        completed: false,
      },
      {
        id: 'w1', category: 'weekly', xp: 300,
        icon: <Star size={12} className="text-[#ffa502]" />,
        title: 'Close 3 profitable trades',
        description: 'End the week with 3+ winning trades',
        completed: profitableTrades.length >= 3,
      },
      {
        id: 'w2', category: 'weekly', xp: 500,
        icon: <Trophy size={12} className="text-[#ffa502]" />,
        title: 'Maintain positive P&L',
        description: 'Keep your account in profit all week',
        completed: false,
      },
      {
        id: 'w3', category: 'weekly', xp: 200,
        icon: <Target size={12} className="text-[#00d4aa]" />,
        title: 'Trade 3 asset classes',
        description: 'Place trades in stocks, forex, AND futures',
        completed: false,
      },
      {
        id: 'c1', category: 'challenge', xp: 1000,
        icon: <Trophy size={12} className="text-[#a855f7]" />,
        title: 'Prop Challenge Pass',
        description: 'Complete the Nexus Evaluation challenge with all rules passed',
        completed: false,
        locked: true,
      },
      {
        id: 'c2', category: 'challenge', xp: 750,
        icon: <Star size={12} className="text-[#ffa502]" />,
        title: 'Leaderboard Top 10',
        description: 'Break into the top 10 on the weekly leaderboard',
        completed: false,
        locked: true,
      },
    ])
  }, [positions, closedTrades])

  const totalXP = tasks.filter(t => t.completed).reduce((s, t) => s + t.xp, 0)
  const maxXP = tasks.reduce((s, t) => s + t.xp, 0)
  const dailyTasks = tasks.filter(t => t.category === 'daily')
  const weeklyTasks = tasks.filter(t => t.category === 'weekly')
  const challenges = tasks.filter(t => t.category === 'challenge')
  const dailyComplete = dailyTasks.filter(t => t.completed).length

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Star size={12} className="text-[#ffa502]" />
            <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Daily Tasks</span>
          </div>
          <div className="mono text-[10px] text-[#ffa502] font-bold">{totalXP} XP today</div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-[#0f1f38] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-[#ffa502] to-[#00d4aa] rounded-full transition-all duration-500"
              style={{ width: `${(totalXP / maxXP) * 100}%` }} />
          </div>
          <span className="text-[9px] text-[#7f93b5] mono">{dailyComplete}/{dailyTasks.length} today</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {[
          { label: '📅 Daily', items: dailyTasks, color: '#00d4aa' },
          { label: '📆 Weekly', items: weeklyTasks, color: '#1e90ff' },
          { label: '🏆 Challenges', items: challenges, color: '#a855f7' },
        ].map(({ label, items, color }) => (
          <div key={label}>
            <div className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color }}>{label}</div>
            <div className="space-y-1.5">
              {items.map(task => (
                <div key={task.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded border transition-colors ${
                    task.completed
                      ? 'border-[#00d4aa]/20 bg-[#00d4aa]/5'
                      : task.locked
                      ? 'border-[#1a2d4a] bg-[#040c14] opacity-50'
                      : 'border-[#1a2d4a] bg-[#040c14] hover:bg-[#071220]'
                  }`}>
                  <div className="shrink-0 mt-0.5">
                    {task.completed
                      ? <CheckSquare size={13} className="text-[#00d4aa]" />
                      : <Square size={13} className="text-[#4a5e7a]" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      {task.icon}
                      <span className={`text-[11px] font-semibold ${task.completed ? 'text-[#7f93b5] line-through' : 'text-[#cdd6f4]'}`}>
                        {task.title}
                      </span>
                      {task.locked && <span className="text-[9px] text-[#4a5e7a]">🔒</span>}
                    </div>
                    <p className="text-[9px] text-[#4a5e7a] mt-0.5 leading-relaxed">{task.description}</p>
                  </div>
                  <div className="text-[9px] font-mono font-bold text-[#ffa502] shrink-0">+{task.xp}XP</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
