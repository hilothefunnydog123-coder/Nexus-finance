'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShieldCheck, Trophy, Clock, TrendingUp, AlertCircle, Award, RotateCcw, LogOut } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { SUPABASE_ENABLED } from '@/lib/supabase'
import Certificate from './Certificate'
import AuthModal from '@/components/auth/AuthModal'
import type { DBChallenge } from '@/lib/supabase'
import { usePortfolioStore } from '@/store/portfolioStore'

const STATUS_STYLE = {
  active:            { label: 'Active',            color: '#1e90ff', bg: '#1e90ff20' },
  passed:            { label: 'Passed ✓',          color: '#00d4aa', bg: '#00d4aa20' },
  failed:            { label: 'Failed',             color: '#ff4757', bg: '#ff475720' },
  payout_requested:  { label: 'Payout Requested',  color: '#ffa502', bg: '#ffa50220' },
  paid:              { label: 'Paid Out',           color: '#a855f7', bg: '#a855f720' },
}

export default function PropDashboard() {
  const { user, signOut, getToken } = useAuth()
  const { getTotalEquity } = usePortfolioStore()
  const [challenges, setChallenges] = useState<DBChallenge[]>([])
  const [loading, setLoading] = useState(true)
  const [showAuth, setShowAuth] = useState(false)
  const [viewCert, setViewCert] = useState<DBChallenge | null>(null)

  const equity = getTotalEquity({})
  const pnlPct = ((equity - 100_000) / 100_000) * 100

  const fetch = useCallback(async () => {
    if (!user || !SUPABASE_ENABLED) { setLoading(false); return }
    setLoading(true)
    try {
      const token = await getToken()
      const { supabase } = await import('@/lib/supabase')
      if (!supabase) return
      const { data } = await supabase
        .from('challenges')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      setChallenges(data || [])
    } finally {
      setLoading(false)
    }
  }, [user, getToken])

  useEffect(() => { fetch() }, [fetch])

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={fetch} reason="Sign in to view your prop firm dashboard" />}
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center mb-4">
          <ShieldCheck size={32} className="text-[#040c14]" />
        </div>
        <h2 className="text-xl font-black text-[#cdd6f4] mb-2">Your Account Dashboard</h2>
        <p className="text-[#7f93b5] text-sm mb-6 max-w-sm">
          Sign in to view all your challenges, certificates, performance history, and account stats.
        </p>
        <button onClick={() => setShowAuth(true)}
          className="px-6 py-3 bg-[#00d4aa] text-[#040c14] font-black rounded-lg text-sm uppercase tracking-wider hover:bg-[#00ffcc] transition-colors shadow-[0_0_20px_rgba(0,212,170,0.3)]">
          Sign In to Dashboard
        </button>
      </div>
    )
  }

  const active = challenges.filter(c => c.status === 'active')
  const passed = challenges.filter(c => ['passed','payout_requested','paid'].includes(c.status))
  const failed = challenges.filter(c => c.status === 'failed')
  const totalPassed = passed.length

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {viewCert && <Certificate challenge={viewCert} username={user.email?.split('@')[0] || 'Trader'} onClose={() => setViewCert(null)} />}

      {/* Header */}
      <div className="px-5 py-4 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-black text-[#cdd6f4]">Account Dashboard</h2>
            <p className="text-[11px] text-[#4a5e7a]">{user.email}</p>
          </div>
          <button onClick={signOut} className="flex items-center gap-1.5 text-[10px] text-[#4a5e7a] hover:text-[#7f93b5]">
            <LogOut size={11} /> Sign out
          </button>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Stats overview */}
        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Total Challenges', value: String(challenges.length), color: '#cdd6f4', icon: <ShieldCheck size={14} /> },
            { label: 'Passed',           value: String(totalPassed),        color: '#00d4aa', icon: <Trophy size={14} /> },
            { label: 'Current P&L',      value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#00d4aa' : '#ff4757', icon: <TrendingUp size={14} /> },
            { label: 'Certificates',     value: String(totalPassed),        color: '#ffa502', icon: <Award size={14} /> },
          ].map(({ label, value, color, icon }) => (
            <div key={label} className="bg-[#040c14] rounded-xl border border-[#1a2d4a] p-4 text-center">
              <div className="flex justify-center mb-2" style={{ color }}>{icon}</div>
              <div className="mono text-xl font-black" style={{ color }}>{value}</div>
              <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* Active challenge */}
        {active.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Active Challenge</h3>
            {active.map(ch => {
              const daysSince = Math.floor((Date.now() - new Date(ch.started_at).getTime()) / 86_400_000)
              const currentPnL = Math.max(0, pnlPct)
              const drawdown = Math.abs(Math.min(0, pnlPct))
              const passing = drawdown < ch.max_drawdown

              return (
                <div key={ch.id} className="bg-[#040c14] rounded-xl border border-[#1e3a5f] p-4"
                  style={{ boxShadow: '0 0 20px rgba(30,144,255,0.1)' }}>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <span className="text-sm font-black text-[#cdd6f4]">YN Capital {ch.tier.charAt(0).toUpperCase() + ch.tier.slice(1)}</span>
                      <div className="text-[10px] text-[#4a5e7a]">Started {new Date(ch.started_at).toLocaleDateString()} · ${ch.account_size.toLocaleString()}</div>
                    </div>
                    <span className={`text-[10px] px-2.5 py-1 rounded-full font-bold ${passing ? 'bg-[#00d4aa]/20 text-[#00d4aa]' : 'bg-[#ff4757]/20 text-[#ff4757]'}`}>
                      {passing ? '✓ On Track' : '⚠ At Risk'}
                    </span>
                  </div>
                  {[
                    { label: 'Profit', current: currentPnL, limit: ch.profit_target, color: '#00d4aa' },
                    { label: 'Drawdown', current: drawdown, limit: ch.max_drawdown, color: '#ff4757', inverse: true },
                  ].map(({ label, current, limit, color, inverse }) => (
                    <div key={label} className="mb-3">
                      <div className="flex justify-between mb-1 text-[10px]">
                        <span className="text-[#7f93b5]">{label}</span>
                        <span className="mono font-bold" style={{ color }}>{current.toFixed(2)}% / {inverse ? 'Max ' : 'Target '}{limit}%</span>
                      </div>
                      <div className="h-2 bg-[#0f1f38] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min((current / limit) * 100, 100)}%`, background: color }} />
                      </div>
                    </div>
                  ))}
                  <div className="flex items-center justify-between text-[10px] mt-2 pt-2 border-t border-[#1a2d4a]">
                    <div className="flex items-center gap-1 text-[#7f93b5]">
                      <Clock size={10} />
                      Day {daysSince} of {ch.max_days}
                    </div>
                    <span className="text-[#4a5e7a]">{ch.max_days - daysSince} days remaining</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Certificates */}
        {passed.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Certificates</h3>
            <div className="space-y-2">
              {passed.map(ch => {
                const st = STATUS_STYLE[ch.status as keyof typeof STATUS_STYLE]
                return (
                  <div key={ch.id} className="flex items-center gap-4 p-4 bg-[#040c14] rounded-xl border border-[#00d4aa]/30">
                    <div className="w-10 h-10 rounded-lg bg-[#00d4aa]/15 flex items-center justify-center shrink-0">
                      <Award size={20} className="text-[#00d4aa]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold text-[#cdd6f4]">YN Capital {ch.tier.charAt(0).toUpperCase() + ch.tier.slice(1)}</div>
                      <div className="text-[10px] text-[#4a5e7a]">
                        ${ch.account_size.toLocaleString()} · +{ch.current_pnl_pct.toFixed(2)}% · {ch.passed_at ? new Date(ch.passed_at).toLocaleDateString() : ''}
                      </div>
                    </div>
                    <span className="text-[9px] px-2 py-1 rounded font-bold shrink-0" style={{ color: st.color, background: st.bg }}>{st.label}</span>
                    <button onClick={() => setViewCert(ch)}
                      className="px-3 py-1.5 text-[10px] font-bold text-[#00d4aa] border border-[#00d4aa]/40 rounded-lg hover:bg-[#00d4aa]/10 transition-colors shrink-0">
                      View Certificate
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Failed challenges */}
        {failed.length > 0 && (
          <div>
            <h3 className="text-[11px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Previous Attempts</h3>
            <div className="space-y-2">
              {failed.map(ch => (
                <div key={ch.id} className="flex items-center gap-4 p-3 bg-[#040c14] rounded-xl border border-[#1a2d4a] opacity-60">
                  <div className="w-8 h-8 rounded-lg bg-[#ff4757]/15 flex items-center justify-center">
                    <AlertCircle size={16} className="text-[#ff4757]" />
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-bold text-[#7f93b5]">YN Capital {ch.tier.charAt(0).toUpperCase() + ch.tier.slice(1)}</div>
                    <div className="text-[10px] text-[#4a5e7a]">Failed · {new Date(ch.started_at).toLocaleDateString()}</div>
                  </div>
                  <span className="text-[9px] px-2 py-1 rounded font-bold bg-[#ff4757]/20 text-[#ff4757]">Failed</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && challenges.length === 0 && (
          <div className="text-center py-8">
            <p className="text-[#4a5e7a] text-sm">No challenges yet</p>
            <p className="text-[10px] text-[#4a5e7a] mt-1">Start a challenge from the Prop Challenge tab</p>
          </div>
        )}

        {!SUPABASE_ENABLED && (
          <div className="flex items-start gap-2 p-3 bg-[#ffa502]/10 border border-[#ffa502]/20 rounded-lg">
            <AlertCircle size={12} className="text-[#ffa502] shrink-0 mt-0.5" />
            <p className="text-[10px] text-[#7f93b5]">Supabase not connected — data won't persist between sessions</p>
          </div>
        )}
      </div>
    </div>
  )
}
