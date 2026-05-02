'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldX, Clock, DollarSign, TrendingDown, CheckSquare, AlertTriangle } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

type ChallengeType = 'evaluation' | 'verification' | 'swing'

const CHALLENGES = {
  evaluation: {
    name: 'Nexus Evaluation',
    size: 100_000,
    days: 30,
    daysElapsed: 14,
    profitTarget: 10,
    maxDrawdown: 5,
    dailyLoss: 2.5,
    minDays: 10,
    tradingDays: 9,
    description: 'Phase 1: Prove your edge with a $100K account',
    rules: [
      'No overnight holds allowed',
      'Trade during NY session only (9:30–4:00 PM ET)',
      'Min 5 trades per week',
      'No news trading within 2 min of high-impact events',
    ],
    color: '#ffa502',
  },
  verification: {
    name: 'Nexus Verification',
    size: 200_000,
    days: 60,
    daysElapsed: 0,
    profitTarget: 5,
    maxDrawdown: 4,
    dailyLoss: 2,
    minDays: 20,
    tradingDays: 0,
    description: 'Phase 2: Verify consistency with a $200K account',
    rules: [
      'Overnight holds permitted',
      'Trade any session',
      'Consistency score must be >70%',
      'Max 3 consecutive losing days',
    ],
    color: '#1e90ff',
  },
  swing: {
    name: 'Nexus Swing Challenge',
    size: 50_000,
    days: 45,
    daysElapsed: 7,
    profitTarget: 12,
    maxDrawdown: 6,
    dailyLoss: 3,
    minDays: 15,
    tradingDays: 5,
    description: 'Swing trading focus with multi-day holds',
    rules: [
      'Hold positions 2–14 days',
      'Max 5 open positions at once',
      'Diversify across 3+ asset classes',
      'Weekly trade journal required',
    ],
    color: '#a855f7',
  },
}

export default function PropChallenge() {
  const [active, setActive] = useState<ChallengeType>('evaluation')
  const { getTotalEquity, getTotalUnrealizedPnL } = usePortfolioStore()

  const ch = CHALLENGES[active]
  const equity = getTotalEquity({})
  const realPnLPct = ((equity - 100_000) / 100_000) * 100

  // Use real user data for the active challenge metrics
  const currentPnLPct = Math.max(0, realPnLPct)
  const currentDrawdown = Math.abs(Math.min(0, realPnLPct))
  const progressToTarget = Math.min((currentPnLPct / ch.profitTarget) * 100, 100)
  const drawdownUsed = Math.min((currentDrawdown / ch.maxDrawdown) * 100, 100)
  const daysProgress = (ch.daysElapsed / ch.days) * 100
  const tradingDaysProgress = (ch.tradingDays / ch.minDays) * 100

  const passing = currentPnLPct >= 0 && currentDrawdown < ch.maxDrawdown
  const completed = currentPnLPct >= ch.profitTarget && ch.tradingDays >= ch.minDays

  const Rule = ({ met, text }: { met: boolean; text: string }) => (
    <div className="flex items-start gap-2">
      {met
        ? <CheckSquare size={11} className="text-[#00d4aa] shrink-0 mt-0.5" />
        : <div className="w-3 h-3 rounded border border-[#1a2d4a] shrink-0 mt-0.5" />
      }
      <span className={`text-[10px] ${met ? 'text-[#7f93b5]' : 'text-[#4a5e7a]'}`}>{text}</span>
    </div>
  )

  const Meter = ({ label, current, target, limit, color, inverse = false }: {
    label: string; current: number; target: number; limit: number; color: string; inverse?: boolean
  }) => {
    const pct = Math.min((current / limit) * 100, 100)
    const ok = inverse ? current < limit * 0.8 : current >= target
    return (
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#7f93b5]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="mono text-[10px] font-bold" style={{ color: ok ? '#00d4aa' : (pct > 80 && inverse) ? '#ff4757' : '#ffa502' }}>
              {current.toFixed(2)}%
            </span>
            <span className="text-[9px] text-[#4a5e7a]">/ {inverse ? `Max ${limit}%` : `Target ${target}%`}</span>
          </div>
        </div>
        <div className="h-2 bg-[#0f1f38] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, background: (pct > 80 && inverse) ? '#ff4757' : color }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2 mb-2">
          {passing
            ? <ShieldCheck size={14} className="text-[#00d4aa]" />
            : <ShieldX size={14} className="text-[#ff4757]" />
          }
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Prop Challenge Simulator</span>
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-mono ml-auto ${
            completed ? 'bg-[#00d4aa]/20 text-[#00d4aa]' :
            passing ? 'bg-[#ffa502]/20 text-[#ffa502]' :
            'bg-[#ff4757]/20 text-[#ff4757]'
          }`}>
            {completed ? 'PASSED ✓' : passing ? 'ON TRACK' : 'AT RISK'}
          </span>
        </div>
        <div className="flex gap-1">
          {(Object.keys(CHALLENGES) as ChallengeType[]).map(type => (
            <button key={type} onClick={() => setActive(type)}
              className={`flex-1 py-1 text-[9px] font-mono uppercase rounded border transition-colors ${
                active === type
                  ? 'text-[#040c14] font-bold border-transparent'
                  : 'border-[#1a2d4a] text-[#4a5e7a] hover:border-[#1e3a5f]'
              }`}
              style={active === type ? { background: CHALLENGES[type].color } : {}}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* Account info */}
        <div className="flex items-center gap-3 mb-3 p-2.5 bg-[#040c14] rounded border border-[#1a2d4a]">
          <DollarSign size={14} style={{ color: ch.color }} />
          <div>
            <div className="text-[10px] text-[#4a5e7a]">{ch.name}</div>
            <div className="mono text-sm font-bold text-[#cdd6f4]">${ch.size.toLocaleString()} Account</div>
          </div>
          <div className="ml-auto text-right">
            <div className="flex items-center gap-1 text-[10px] text-[#4a5e7a]">
              <Clock size={9} />
              Day {ch.daysElapsed} of {ch.days}
            </div>
            <div className="mono text-xs font-semibold text-[#7f93b5]">{ch.days - ch.daysElapsed} days left</div>
          </div>
        </div>

        {/* Day progress */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#7f93b5]">Time Elapsed</span>
            <span className="mono text-[10px] text-[#4a5e7a]">{ch.daysElapsed}/{ch.days} days</span>
          </div>
          <div className="h-1.5 bg-[#0f1f38] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#1e90ff]/50" style={{ width: `${daysProgress}%` }} />
          </div>
        </div>

        <Meter label="Profit Target" current={currentPnLPct} target={ch.profitTarget} limit={ch.profitTarget} color="#00d4aa" />
        <Meter label="Max Drawdown Used" current={currentDrawdown} target={0} limit={ch.maxDrawdown} color="#ff4757" inverse />
        <Meter label="Daily Loss Used" current={0} target={0} limit={ch.dailyLoss} color="#ff4757" inverse />

        {/* Min trading days */}
        <div className="mb-3">
          <div className="flex justify-between mb-1">
            <span className="text-[10px] text-[#7f93b5]">Min Trading Days</span>
            <span className="mono text-[10px] text-[#cdd6f4]">{ch.tradingDays}/{ch.minDays}</span>
          </div>
          <div className="h-2 bg-[#0f1f38] rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-[#a855f7]" style={{ width: `${tradingDaysProgress}%` }} />
          </div>
        </div>

        {/* Rules */}
        <div className="bg-[#040c14] rounded border border-[#1a2d4a] p-2.5">
          <div className="text-[10px] font-semibold text-[#7f93b5] uppercase tracking-wider mb-2">Challenge Rules</div>
          <div className="space-y-1.5">
            {ch.rules.map((rule, i) => <Rule key={i} met={i < 2} text={rule} />)}
          </div>
        </div>

        {/* CTA */}
        <div className="mt-3 p-2.5 bg-[#040c14] rounded border border-[#1a2d4a] text-center">
          <p className="text-[10px] text-[#4a5e7a] mb-2">{ch.description}</p>
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-[#4a5e7a]">
            <AlertTriangle size={9} />
            <span>Paper trading data used for challenge simulation</span>
          </div>
        </div>
      </div>
    </div>
  )
}
