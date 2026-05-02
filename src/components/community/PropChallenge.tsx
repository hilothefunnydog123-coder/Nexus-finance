'use client'

import { useState } from 'react'
import { ShieldCheck, ShieldX, DollarSign, CheckSquare, AlertTriangle, Trophy, Users, TrendingUp, Clock, Star } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

type Phase = 'evaluation' | 'verification' | 'funded'

const TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 49,
    size: 25_000,
    profitTarget: 8,
    maxDrawdown: 5,
    dailyLoss: 2.5,
    minDays: 5,
    maxDays: 30,
    color: '#7f93b5',
    features: ['$25K simulated account', '8% profit target', '5% max drawdown', '30-day window', 'Basic analytics'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 149,
    size: 100_000,
    profitTarget: 10,
    maxDrawdown: 5,
    dailyLoss: 2.5,
    minDays: 10,
    maxDays: 30,
    color: '#00d4aa',
    popular: true,
    features: ['$100K simulated account', '10% profit target', '5% max drawdown', '30-day window', 'Full analytics + stats', 'Community leaderboard'],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 299,
    size: 200_000,
    profitTarget: 8,
    maxDrawdown: 5,
    dailyLoss: 2,
    minDays: 15,
    maxDays: 60,
    color: '#ffa502',
    features: ['$200K simulated account', '8% profit target', '5% max drawdown', '60-day window', 'All Pro features', 'Priority support', 'Mentorship sessions'],
  },
]

const FUNDED_TRADERS = [
  { name: 'QuantKing_NYC', amount: '$100K', returns: '+14.2%', badge: '🏆' },
  { name: 'ThetaQueen',    amount: '$200K', returns: '+9.4%',  badge: '⭐' },
  { name: 'ForexFred',     amount: '$100K', returns: '+6.3%',  badge: '✅' },
  { name: 'IronCondor',    amount: '$200K', returns: '+5.9%',  badge: '✅' },
  { name: 'ScalpGod_CHI',  amount: '$100K', returns: '+11.8%', badge: '🏆' },
]

export default function PropChallenge() {
  const [activePhase, setActivePhase] = useState<Phase>('evaluation')
  const [selectedTier, setSelectedTier] = useState('pro')
  const [started, setStarted] = useState(false)
  const { getTotalEquity, getTotalUnrealizedPnL } = usePortfolioStore()

  const tier = TIERS.find(t => t.id === selectedTier) || TIERS[1]
  const equity = getTotalEquity({})
  const pnlPct = ((equity - 100_000) / 100_000) * 100
  const currentPnLPct = Math.max(0, pnlPct)
  const currentDrawdown = Math.abs(Math.min(0, pnlPct))
  const passing = currentDrawdown < tier.maxDrawdown && equity >= 100_000

  if (!started) {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Hero */}
        <div className="px-6 py-8 border-b border-[#1a2d4a] bg-gradient-to-br from-[#071220] to-[#040c14] text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
              <ShieldCheck size={18} className="text-[#040c14]" />
            </div>
            <span className="text-2xl font-black text-[#cdd6f4]">YN Capital</span>
          </div>
          <p className="text-[#7f93b5] text-sm mb-2">Simulated Prop Trading Challenge</p>
          <p className="text-[11px] text-[#4a5e7a] max-w-md mx-auto">
            Practice the discipline of funded trading. Pass evaluation, prove consistency, earn your simulated funded account — all tracked live on the leaderboard.
          </p>

          {/* Stats */}
          <div className="flex items-center justify-center gap-8 mt-6">
            {[
              { icon: <Users size={14} />, value: '1,247', label: 'Active traders' },
              { icon: <Trophy size={14} />, value: '312', label: 'Funded accounts' },
              { icon: <TrendingUp size={14} />, value: '$48.2M', label: 'Simulated capital' },
              { icon: <Star size={14} />, value: '78%', label: 'Pass rate (Pro)' },
            ].map(({ icon, value, label }) => (
              <div key={label} className="text-center">
                <div className="flex items-center justify-center gap-1 text-[#00d4aa] mb-0.5">{icon}</div>
                <div className="mono text-base font-black text-[#cdd6f4]">{value}</div>
                <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tier cards */}
        <div className="p-6">
          <div className="text-center mb-6">
            <h2 className="text-base font-bold text-[#cdd6f4] mb-1">Choose Your Challenge</h2>
            <p className="text-[11px] text-[#4a5e7a]">All challenges are free to start in demo mode — track your real performance</p>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-8">
            {TIERS.map(t => (
              <div key={t.id} onClick={() => setSelectedTier(t.id)}
                className={`relative rounded-xl border p-5 cursor-pointer transition-all ${
                  selectedTier === t.id
                    ? 'border-opacity-100 shadow-xl scale-[1.02]'
                    : 'border-[#1a2d4a] hover:border-[#1e3a5f] bg-[#071220]'
                }`}
                style={selectedTier === t.id ? {
                  borderColor: t.color,
                  background: `linear-gradient(135deg, #071220, #040c14)`,
                  boxShadow: `0 0 30px ${t.color}20`,
                } : {}}>
                {t.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#00d4aa] text-[#040c14] text-[9px] font-black px-3 py-0.5 rounded-full uppercase tracking-wider">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-4">
                  <div className="text-base font-black mb-1" style={{ color: t.color }}>{t.name}</div>
                  <div className="mono text-2xl font-black text-[#cdd6f4]">${t.size.toLocaleString()}</div>
                  <div className="text-[10px] text-[#4a5e7a]">simulated account</div>
                </div>
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Profit Target', value: `${t.profitTarget}%`, color: '#00d4aa' },
                    { label: 'Max Drawdown', value: `${t.maxDrawdown}%`, color: '#ff4757' },
                    { label: 'Daily Loss Limit', value: `${t.dailyLoss}%`, color: '#ff4757' },
                    { label: 'Min Trading Days', value: String(t.minDays), color: '#7f93b5' },
                    { label: 'Time Limit', value: `${t.maxDays} days`, color: '#7f93b5' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between text-[10px]">
                      <span className="text-[#4a5e7a]">{label}</span>
                      <span className="mono font-bold" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
                <div className="space-y-1">
                  {t.features.map(f => (
                    <div key={f} className="flex items-center gap-1.5 text-[10px] text-[#7f93b5]">
                      <CheckSquare size={9} style={{ color: t.color }} />
                      {f}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => setStarted(true)}
              className="px-8 py-3 rounded-lg font-black text-sm uppercase tracking-wider transition-all shadow-lg"
              style={{ background: tier.color, color: '#040c14', boxShadow: `0 0 30px ${tier.color}40` }}>
              Start {tier.name} Challenge — Free Demo
            </button>
            <p className="text-[10px] text-[#4a5e7a] mt-2">Uses your paper trading account — no real money involved</p>
          </div>

          {/* Funded traders */}
          <div className="mt-8">
            <div className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider mb-3">Funded Trader Board</div>
            <div className="space-y-2">
              {FUNDED_TRADERS.map(t => (
                <div key={t.name} className="flex items-center gap-3 px-4 py-2.5 bg-[#071220] rounded-lg border border-[#1a2d4a]">
                  <span className="text-base">{t.badge}</span>
                  <span className="text-sm font-semibold text-[#cdd6f4] flex-1">{t.name}</span>
                  <span className="mono text-xs text-[#7f93b5]">{t.amount}</span>
                  <span className="mono text-xs font-bold text-[#00d4aa]">{t.returns}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Active challenge dashboard
  const progressToTarget = Math.min((currentPnLPct / tier.profitTarget) * 100, 100)
  const drawdownUsed = Math.min((currentDrawdown / tier.maxDrawdown) * 100, 100)

  const Meter = ({ label, current, limit, color, inverse = false }: {
    label: string; current: number; limit: number; color: string; inverse?: boolean
  }) => {
    const pct = Math.min((current / limit) * 100, 100)
    const danger = inverse && pct > 70
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] text-[#7f93b5]">{label}</span>
          <div className="flex items-center gap-2">
            <span className="mono text-sm font-bold" style={{ color: danger ? '#ff4757' : color }}>
              {current.toFixed(2)}%
            </span>
            <span className="text-[9px] text-[#4a5e7a]">/ {inverse ? `Max ${limit}%` : `Target ${limit}%`}</span>
          </div>
        </div>
        <div className="h-2.5 bg-[#0f1f38] rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${pct}%`, background: danger ? '#ff4757' : color }} />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-5 py-4 border-b border-[#1a2d4a] bg-[#071220]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {passing ? <ShieldCheck size={16} className="text-[#00d4aa]" /> : <ShieldX size={16} className="text-[#ff4757]" />}
            <div>
              <div className="text-sm font-black text-[#cdd6f4]">YN Capital — {tier.name} Challenge</div>
              <div className="text-[10px] text-[#4a5e7a]">${tier.size.toLocaleString()} Simulated Account</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
              passing ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-[#ff4757]/20 text-[#ff4757]'
            }`}>{passing ? '✓ ON TRACK' : '⚠ AT RISK'}</span>
            <button onClick={() => setStarted(false)} className="text-[10px] text-[#4a5e7a] hover:text-[#7f93b5] underline">
              Exit Challenge
            </button>
          </div>
        </div>
        <div className="flex gap-1">
          {(['evaluation','verification','funded'] as Phase[]).map(p => (
            <button key={p} onClick={() => setActivePhase(p)}
              className={`px-3 py-1 text-[10px] font-mono uppercase rounded border transition-colors ${
                activePhase === p ? 'border-[#00d4aa] text-[#00d4aa] bg-[#00d4aa]/10' : 'border-[#1a2d4a] text-[#4a5e7a]'
              } ${p !== 'evaluation' ? 'opacity-40 cursor-not-allowed' : ''}`}
              disabled={p !== 'evaluation'}>
              {p === 'evaluation' ? '📋 ' : p === 'verification' ? '🔒 ' : '🔒 '}{p}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: 'Current P&L', value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#00d4aa' : '#ff4757' },
            { label: 'Days Remaining', value: '16 days', color: '#ffa502' },
            { label: 'Min Days Met', value: '9 / 10', color: '#7f93b5' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-3 text-center">
              <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1">{label}</div>
              <div className="mono text-base font-black" style={{ color }}>{value}</div>
            </div>
          ))}
        </div>

        <Meter label="Profit Target" current={currentPnLPct} limit={tier.profitTarget} color="#00d4aa" />
        <Meter label="Drawdown Used" current={currentDrawdown} limit={tier.maxDrawdown} color="#ff4757" inverse />
        <Meter label="Daily Loss Used" current={0} limit={tier.dailyLoss} color="#ff4757" inverse />

        <div className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-4">
          <div className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Challenge Rules</div>
          {[
            { label: 'Profit Target', value: `${tier.profitTarget}% ($${(tier.size * tier.profitTarget / 100).toLocaleString()})`, ok: currentPnLPct >= tier.profitTarget },
            { label: 'Max Drawdown', value: `${tier.maxDrawdown}% ($${(tier.size * tier.maxDrawdown / 100).toLocaleString()})`, ok: currentDrawdown < tier.maxDrawdown },
            { label: 'Daily Loss Limit', value: `${tier.dailyLoss}% ($${(tier.size * tier.dailyLoss / 100).toLocaleString()})`, ok: true },
            { label: 'Min Trading Days', value: `${tier.minDays} days`, ok: false },
            { label: 'Time Limit', value: `${tier.maxDays} days`, ok: true },
          ].map(({ label, value, ok }) => (
            <div key={label} className="flex items-center justify-between py-1.5 border-b border-[#1a2d4a]/30 last:border-0">
              <div className="flex items-center gap-2">
                <span className={ok ? 'text-[#00d4aa]' : 'text-[#4a5e7a]'}>{ok ? '✓' : '○'}</span>
                <span className="text-[11px] text-[#7f93b5]">{label}</span>
              </div>
              <span className="mono text-[10px] text-[#cdd6f4]">{value}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 flex items-center gap-2 p-3 bg-[#ffa502]/5 border border-[#ffa502]/20 rounded-lg">
          <AlertTriangle size={12} className="text-[#ffa502] shrink-0" />
          <p className="text-[10px] text-[#7f93b5]">Your actual paper trading account performance is being tracked against these rules in real-time.</p>
        </div>
      </div>
    </div>
  )
}
