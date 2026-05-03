'use client'

import { useState, useEffect, useCallback } from 'react'
import { Trophy, TrendingUp, Crown, Shield, Zap, Target, RefreshCw, Share2, Copy, Check } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { useAuth } from '@/hooks/useAuth'

type Period = 'daily' | 'weekly' | 'alltime'

interface Trader {
  username: string; tier: string; pnlPct: number; status: string; days: number
}

const TIER_COLOR: Record<string, string> = {
  starter: '#7f93b5', pro: '#00d4aa', elite: '#ffa502',
}

const BADGE_FOR: Record<number, { icon: React.ReactNode; color: string }> = {
  0: { icon: <Crown size={10} />,  color: '#ffa502' },
  1: { icon: <Shield size={10} />, color: '#c0c0c0' },
  2: { icon: <Zap size={10} />,    color: '#cd7f32' },
}

const MEDALS = ['🥇','🥈','🥉']

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('weekly')
  const [traders, setTraders] = useState<Trader[]>([])
  const [loading, setLoading] = useState(true)
  const [isReal, setIsReal] = useState(false)
  const [realCount, setRealCount] = useState(0)
  const [copied, setCopied] = useState(false)
  const [referralLink, setReferralLink] = useState('')
  const { getTotalEquity } = usePortfolioStore()
  const { user, getToken } = useAuth()

  const equity = getTotalEquity({})
  const userPnLPct = ((equity - 100_000) / 100_000) * 100

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/leaderboard?period=${period}`)
      const json = await res.json()
      setTraders(json.traders || [])
      setIsReal(json.real)
      setRealCount(json.realCount || 0)
    } finally { setLoading(false) }
  }, [period])

  useEffect(() => { load() }, [load])

  // Get referral link
  useEffect(() => {
    if (!user) return
    getToken().then(token => {
      fetch(`/api/referral?userId=${user.id}`, token ? { headers: { Authorization: `Bearer ${token}` } } : {})
        .then(r => r.json())
        .then(json => { if (json.link) setReferralLink(json.link) })
        .catch(() => {})
    })
  }, [user, getToken])

  const copyReferral = () => {
    const link = referralLink || `https://ynfinance.org/ref/${user?.email?.split('@')[0] || 'trader'}`
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const userRank = traders.filter(t => t.pnlPct > userPnLPct).length + 1

  const shareRank = () => {
    const text = `I'm ranked #${userRank} on YN Finance with ${userPnLPct >= 0 ? '+' : ''}${userPnLPct.toFixed(2)}% return. Compete against me at ynfinance.org`
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank')
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2">
          <Trophy size={12} className="text-[#ffa502]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Leaderboard</span>
          {isReal
            ? <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE · {realCount} real traders</span>
            : <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO — be first to join</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
            {(['daily','weekly','alltime'] as Period[]).map(p => (
              <button key={p} onClick={() => setPeriod(p)}
                className={`px-2 py-0.5 text-[9px] font-mono uppercase transition-colors ${
                  period === p ? 'bg-[#ffa502] text-[#040c14] font-bold' : 'text-[#4a5e7a] hover:bg-[#0f1f38]'
                }`}>{p === 'alltime' ? 'All' : p.slice(0, 2)}</button>
            ))}
          </div>
          <button onClick={load} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Col headers */}
      <div className="grid grid-cols-12 px-3 py-1 border-b border-[#1a2d4a] bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider shrink-0">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Trader</div>
        <div className="col-span-2 text-right">Return</div>
        <div className="col-span-2 text-right">Tier</div>
        <div className="col-span-2 text-right">Status</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <div className="w-4 h-4 border-2 border-[#ffa502] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : traders.map((t, i) => {
          const badge = BADGE_FOR[i]
          const tierColor = TIER_COLOR[t.tier] || '#7f93b5'
          const isUp = t.pnlPct >= 0
          return (
            <div key={`${t.username}-${i}`} className="grid grid-cols-12 items-center px-3 py-2 border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors">
              <div className="col-span-1">
                <span className={`mono text-xs font-bold ${i < 3 ? '' : 'text-[#4a5e7a]'}`}>
                  {i < 3 ? MEDALS[i] : i + 1}
                </span>
              </div>
              <div className="col-span-5 flex items-center gap-2 min-w-0">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black shrink-0"
                  style={{ background: `${tierColor}20`, color: tierColor }}>
                  {t.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#cdd6f4] truncate">{t.username}</span>
                    {badge && <span style={{ color: badge.color }}>{badge.icon}</span>}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className={`mono text-xs font-bold ${isUp ? 'text-up' : 'text-down'}`}>
                  {isUp ? '+' : ''}{t.pnlPct.toFixed(1)}%
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="text-[9px] font-mono capitalize" style={{ color: tierColor }}>{t.tier}</span>
              </div>
              <div className="col-span-2 text-right">
                <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono uppercase ${
                  t.status === 'passed' || t.status === 'payout_requested' ? 'bg-[#00d4aa]/20 text-[#00d4aa]' :
                  t.status === 'active' ? 'bg-[#1e90ff]/20 text-[#1e90ff]' : 'bg-[#4a5e7a]/20 text-[#4a5e7a]'
                }`}>{t.status === 'payout_requested' ? 'Paid' : t.status}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Your rank */}
      <div className="border-t border-[#1a2d4a] bg-[#040c14] shrink-0">
        <div className="grid grid-cols-12 items-center px-3 py-2 border-b border-[#1a2d4a]">
          <div className="col-span-1"><span className="mono text-xs font-bold text-[#1e90ff]">#{userRank}</span></div>
          <div className="col-span-5 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[9px] font-black bg-[#1e90ff]/20 text-[#1e90ff]">ME</div>
            <span className="text-[11px] font-semibold text-[#1e90ff]">{user?.email?.split('@')[0] || 'You'}</span>
          </div>
          <div className="col-span-2 text-right">
            <span className={`mono text-xs font-bold ${userPnLPct >= 0 ? 'text-up' : 'text-down'}`}>
              {userPnLPct >= 0 ? '+' : ''}{userPnLPct.toFixed(2)}%
            </span>
          </div>
          <div className="col-span-2 text-right"><span className="text-[9px] text-[#4a5e7a]">paper</span></div>
          <div className="col-span-2 text-right">
            <button onClick={shareRank} className="text-[8px] text-[#1e90ff] hover:underline flex items-center gap-1 ml-auto">
              <Share2 size={8} /> Share
            </button>
          </div>
        </div>

        {/* Referral section */}
        <div className="px-3 py-2">
          <div className="text-[9px] text-[#4a5e7a] mb-1.5 uppercase tracking-wider">Invite traders — earn $20 off your next challenge</div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-[9px] text-[#7f93b5] mono truncate">
              {referralLink || 'Sign in to get your referral link'}
            </div>
            <button onClick={copyReferral}
              className="flex items-center gap-1 px-2 py-1.5 bg-[#1e90ff]/20 text-[#1e90ff] rounded text-[9px] font-semibold hover:bg-[#1e90ff]/30 transition-colors shrink-0">
              {copied ? <><Check size={9} /> Copied</> : <><Copy size={9} /> Copy</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
