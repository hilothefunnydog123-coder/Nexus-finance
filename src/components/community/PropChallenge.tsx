'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, ShieldX, DollarSign, CheckSquare, AlertTriangle, Trophy, Users, TrendingUp, Clock, Star, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { usePortfolioStore } from '@/store/portfolioStore'
import { SUPABASE_ENABLED } from '@/lib/supabase'
import AuthModal from '@/components/auth/AuthModal'
import type { DBChallenge } from '@/lib/supabase'

const TIERS = [
  {
    id: 'starter', name: 'Starter', price: 49, size: 25_000, profitTarget: 8,
    maxDrawdown: 5, dailyLoss: 2.5, minTradingDays: 5, maxDays: 30,
    color: '#7f93b5',
    features: ['$25K simulated account','8% profit target','5% max drawdown','30-day window','Basic analytics'],
  },
  {
    id: 'pro', name: 'Pro', price: 149, size: 100_000, profitTarget: 10,
    maxDrawdown: 5, dailyLoss: 2.5, minTradingDays: 10, maxDays: 30,
    color: '#00d4aa', popular: true,
    features: ['$100K simulated account','10% profit target','5% max drawdown','30-day window','Full analytics + stats','Community leaderboard'],
  },
  {
    id: 'elite', name: 'Elite', price: 299, size: 200_000, profitTarget: 8,
    maxDrawdown: 5, dailyLoss: 2, minTradingDays: 15, maxDays: 60,
    color: '#ffa502',
    features: ['$200K simulated account','8% profit target','5% max drawdown','60-day window','All Pro features','Priority support','Mentorship sessions'],
  },
]

const FUNDED_TRADERS = [
  { name: 'QuantKing_NYC', amount: '$100K', returns: '+14.2%', badge: '🏆' },
  { name: 'ThetaQueen',    amount: '$200K', returns: '+9.4%',  badge: '⭐' },
  { name: 'ForexFred',     amount: '$100K', returns: '+6.3%',  badge: '✅' },
  { name: 'IronCondor',    amount: '$200K', returns: '+5.9%',  badge: '✅' },
  { name: 'ScalpGod_CHI',  amount: '$100K', returns: '+11.8%', badge: '🏆' },
]

function Meter({ label, current, limit, color, inverse = false }: {
  label: string; current: number; limit: number; color: string; inverse?: boolean
}) {
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

export default function PropChallenge() {
  const { user, loading: authLoading, signOut, getToken } = useAuth()
  const { getTotalEquity } = usePortfolioStore()
  const [selectedTier, setSelectedTier] = useState('pro')
  const [challenge, setChallenge] = useState<DBChallenge | null>(null)
  const [challengeLoading, setChallengeLoading] = useState(false)
  const [showAuth, setShowAuth] = useState(false)
  const [pendingTier, setPendingTier] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const equity = getTotalEquity({})
  const pnlPct = ((equity - 100_000) / 100_000) * 100

  // Fetch existing challenge from DB
  const fetchChallenge = useCallback(async () => {
    if (!user || !SUPABASE_ENABLED) return
    setChallengeLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/challenge', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const json = await res.json()
      setChallenge(json.challenge || null)
    } finally {
      setChallengeLoading(false)
    }
  }, [user, getToken])

  useEffect(() => { fetchChallenge() }, [fetchChallenge])

  // Push portfolio metrics to DB every 30s when challenge is active
  useEffect(() => {
    if (!challenge || challenge.status !== 'active') return
    const push = async () => {
      const token = await getToken()
      const currentPnLPct = Math.max(0, pnlPct)
      const currentDrawdown = Math.abs(Math.min(0, pnlPct))
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'update', challengeId: challenge.id, currentPnLPct, currentDrawdown, tradingDays: challenge.trading_days }),
      })
      const json = await res.json()
      if (json.challenge) setChallenge(json.challenge)
      if (json.passed) setSuccessMsg('🎉 Challenge Passed! Check your email for details.')
      if (json.failed) setErrorMsg('Challenge failed — max drawdown exceeded.')
    }
    push()
    const t = setInterval(push, 30_000)
    return () => clearInterval(t)
  }, [challenge, pnlPct, getToken])

  const startChallenge = async (tierId: string) => {
    if (!user) { setPendingTier(tierId); setShowAuth(true); return }
    const tier = TIERS.find(t => t.id === tierId)
    if (!tier) return

    setChallengeLoading(true)
    setErrorMsg('')
    try {
      const token = await getToken()
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          action: 'start', tier: tier.id, accountSize: tier.size, profitTarget: tier.profitTarget,
          maxDrawdown: tier.maxDrawdown, dailyLoss: tier.dailyLoss, minTradingDays: tier.minTradingDays, maxDays: tier.maxDays,
        }),
      })
      const json = await res.json()
      if (json.error) { setErrorMsg(json.error); return }
      setChallenge(json.challenge)
      setSuccessMsg(`✓ ${tier.name} Challenge started! Confirmation email sent to ${user.email}`)
    } finally {
      setChallengeLoading(false)
    }
  }

  const requestPayout = async () => {
    if (!challenge) return
    setChallengeLoading(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/challenge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ action: 'payout', challengeId: challenge.id }),
      })
      const json = await res.json()
      if (json.challenge) setChallenge(json.challenge)
      setSuccessMsg('💰 Payout request submitted! Check your email for confirmation.')
    } finally {
      setChallengeLoading(false)
    }
  }

  // After auth, start the pending challenge
  const onAuthSuccess = async () => {
    if (pendingTier) { await startChallenge(pendingTier); setPendingTier(null) }
  }

  if (authLoading) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  // ── Active challenge dashboard ──
  if (challenge) {
    const tier = TIERS.find(t => t.id === challenge.tier) || TIERS[1]
    const currentPnLPct = Math.max(0, pnlPct)
    const currentDrawdown = Math.abs(Math.min(0, pnlPct))
    const passing = currentDrawdown < challenge.max_drawdown
    const isPassed = challenge.status === 'passed' || challenge.status === 'payout_requested' || challenge.status === 'paid'
    const isFailed = challenge.status === 'failed'
    const daysSince = Math.floor((Date.now() - new Date(challenge.started_at).getTime()) / 86_400_000)

    return (
      <div className="flex flex-col h-full overflow-y-auto">
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={onAuthSuccess} reason="Sign in to manage your challenge" />}

        <div className="px-5 py-4 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isPassed ? <Trophy size={16} className="text-[#ffa502]" /> :
               isFailed ? <ShieldX size={16} className="text-[#ff4757]" /> :
               passing ? <ShieldCheck size={16} className="text-[#00d4aa]" /> :
               <ShieldX size={16} className="text-[#ff4757]" />}
              <div>
                <div className="text-sm font-black text-[#cdd6f4]">YN Capital — {tier.name} Challenge</div>
                <div className="text-[10px] text-[#4a5e7a]">
                  {user?.email} · Started {new Date(challenge.started_at).toLocaleDateString()}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${
                isPassed ? 'bg-[#ffa502]/20 text-[#ffa502]' :
                isFailed ? 'bg-[#ff4757]/20 text-[#ff4757]' :
                passing ? 'bg-[#00d4aa]/20 text-[#00d4aa]' :
                'bg-[#ff4757]/20 text-[#ff4757]'
              }`}>
                {isPassed ? '✓ PASSED' : isFailed ? '✗ FAILED' : passing ? '✓ ON TRACK' : '⚠ AT RISK'}
              </span>
              <button onClick={signOut} className="text-[#4a5e7a] hover:text-[#7f93b5] p-1" title="Sign out">
                <LogOut size={13} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-5">
          {successMsg && (
            <div className="flex items-start gap-2 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-3 py-2.5 mb-4">
              <span className="text-[11px] text-[#00d4aa]">{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="flex items-start gap-2 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg px-3 py-2.5 mb-4">
              <AlertTriangle size={12} className="text-[#ff4757] shrink-0 mt-0.5" />
              <span className="text-[11px] text-[#ff4757]">{errorMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mb-6">
            {[
              { label: 'Current P&L', value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#00d4aa' : '#ff4757' },
              { label: 'Days Active', value: `${daysSince} / ${challenge.max_days}`, color: '#ffa502' },
              { label: 'Account Size', value: `$${challenge.account_size.toLocaleString()}`, color: '#cdd6f4' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-3 text-center">
                <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1">{label}</div>
                <div className="mono text-base font-black" style={{ color }}>{value}</div>
              </div>
            ))}
          </div>

          <Meter label="Profit Target" current={currentPnLPct} limit={challenge.profit_target} color="#00d4aa" />
          <Meter label="Drawdown Used" current={currentDrawdown} limit={challenge.max_drawdown} color="#ff4757" inverse />
          <Meter label="Daily Loss Used" current={0} limit={challenge.daily_loss_limit} color="#ff4757" inverse />

          <div className="bg-[#040c14] rounded-lg border border-[#1a2d4a] p-4 mb-4">
            <div className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Challenge Rules</div>
            {[
              { label: 'Profit Target', value: `${challenge.profit_target}%`, ok: currentPnLPct >= challenge.profit_target },
              { label: 'Max Drawdown', value: `${challenge.max_drawdown}%`, ok: currentDrawdown < challenge.max_drawdown },
              { label: 'Daily Loss Limit', value: `${challenge.daily_loss_limit}%`, ok: true },
              { label: 'Min Trading Days', value: `${challenge.min_trading_days} days`, ok: challenge.trading_days >= challenge.min_trading_days },
              { label: 'Time Remaining', value: `${Math.max(0, challenge.max_days - daysSince)} days`, ok: daysSince < challenge.max_days },
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

          {isPassed && challenge.status === 'passed' && (
            <button onClick={requestPayout} disabled={challengeLoading}
              className="w-full py-3 bg-[#ffa502] hover:bg-[#ffb733] text-[#040c14] font-black rounded-lg text-sm uppercase tracking-wider transition-colors disabled:opacity-50 shadow-[0_0_20px_rgba(255,165,2,0.3)]">
              {challengeLoading ? 'Processing...' : '💰 Request Simulated Payout'}
            </button>
          )}
          {challenge.status === 'payout_requested' && (
            <div className="text-center py-3 text-[#ffa502] font-bold text-sm">💰 Payout Requested — Check Your Email</div>
          )}
          {!SUPABASE_ENABLED && (
            <div className="mt-3 flex items-center gap-2 p-3 bg-[#ffa502]/5 border border-[#ffa502]/20 rounded-lg">
              <AlertTriangle size={11} className="text-[#ffa502] shrink-0" />
              <p className="text-[10px] text-[#7f93b5]">Supabase not connected — progress won't persist between sessions</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Tier selection ──
  const currentTier = TIERS.find(t => t.id === selectedTier) || TIERS[1]
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={onAuthSuccess} reason="Create a free account to start your YN Capital challenge and receive email updates." />}

      {/* Hero */}
      <div className="px-6 py-8 border-b border-[#1a2d4a] bg-gradient-to-br from-[#071220] to-[#040c14] text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
            <ShieldCheck size={22} className="text-[#040c14]" />
          </div>
          <span className="text-2xl font-black text-[#cdd6f4]">YN Capital</span>
        </div>
        <p className="text-[#7f93b5] text-sm mb-1">Prop Firm Simulation Challenge</p>
        <p className="text-[11px] text-[#4a5e7a] max-w-md mx-auto">
          Practice funded trading rules. Pass the challenge. Earn your simulated payout. All tracked live.
        </p>

        {user ? (
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className="text-[10px] text-[#00d4aa]">✓ Signed in as {user.email}</span>
            <button onClick={signOut} className="text-[9px] text-[#4a5e7a] hover:text-[#7f93b5] underline">Sign out</button>
          </div>
        ) : (
          <button onClick={() => setShowAuth(true)} className="mt-4 text-[10px] text-[#00d4aa] hover:underline">
            Already have an account? Sign in →
          </button>
        )}

        <div className="flex items-center justify-center gap-8 mt-6">
          {[
            { icon: <Users size={13} />, value: '1,247', label: 'Active traders' },
            { icon: <Trophy size={13} />, value: '312', label: 'Passed challenges' },
            { icon: <TrendingUp size={13} />, value: '$48.2M', label: 'Simulated capital' },
            { icon: <Star size={13} />, value: '78%', label: 'Pass rate (Pro)' },
          ].map(({ icon, value, label }) => (
            <div key={label} className="text-center">
              <div className="flex items-center justify-center gap-1 text-[#00d4aa] mb-0.5">{icon}</div>
              <div className="mono text-base font-black text-[#cdd6f4]">{value}</div>
              <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider">{label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-6">
        {successMsg && (
          <div className="mb-5 bg-[#00d4aa]/10 border border-[#00d4aa]/30 rounded-lg px-4 py-3 text-[11px] text-[#00d4aa]">{successMsg}</div>
        )}
        {errorMsg && (
          <div className="mb-5 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg px-4 py-3 text-[11px] text-[#ff4757]">{errorMsg}</div>
        )}

        <div className="text-center mb-6">
          <h2 className="text-base font-bold text-[#cdd6f4] mb-1">Choose Your Challenge</h2>
          <p className="text-[11px] text-[#4a5e7a]">All challenges are free in demo mode — your performance is tracked in real-time</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {TIERS.map(t => (
            <div key={t.id} onClick={() => setSelectedTier(t.id)}
              className={`relative rounded-xl border p-5 cursor-pointer transition-all ${
                selectedTier === t.id ? 'scale-[1.02]' : 'border-[#1a2d4a] hover:border-[#1e3a5f] bg-[#071220]'
              }`}
              style={selectedTier === t.id ? {
                borderColor: t.color, background: '#071220',
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
              <div className="space-y-1.5 mb-4">
                {[
                  { l: 'Profit Target', v: `${t.profitTarget}%`, c: '#00d4aa' },
                  { l: 'Max Drawdown', v: `${t.maxDrawdown}%`, c: '#ff4757' },
                  { l: 'Daily Loss', v: `${t.dailyLoss}%`, c: '#ff4757' },
                  { l: 'Time Limit', v: `${t.maxDays} days`, c: '#ffa502' },
                ].map(({ l, v, c }) => (
                  <div key={l} className="flex justify-between text-[10px]">
                    <span className="text-[#4a5e7a]">{l}</span>
                    <span className="mono font-bold" style={{ color: c }}>{v}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-1">
                {t.features.map(f => (
                  <div key={f} className="flex items-center gap-1.5 text-[9px] text-[#7f93b5]">
                    <CheckSquare size={8} style={{ color: t.color }} />{f}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mb-8">
          <button
            onClick={() => startChallenge(selectedTier)}
            disabled={challengeLoading}
            className="px-8 py-3.5 rounded-lg font-black text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: currentTier.color, color: '#040c14', boxShadow: `0 0 30px ${currentTier.color}40` }}>
            {challengeLoading ? 'Starting...' : user ? `Start ${currentTier.name} Challenge` : `Sign Up & Start ${currentTier.name} Challenge`}
          </button>
          <p className="text-[10px] text-[#4a5e7a] mt-2">
            {user ? 'Confirmation email will be sent to ' + user.email : 'Free account required — confirmation email sent on start'}
          </p>
        </div>

        <div>
          <div className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider mb-3 flex items-center gap-2">
            <Trophy size={12} className="text-[#ffa502]" /> Funded Trader Board
          </div>
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
