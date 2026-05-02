'use client'

import { useState } from 'react'
import { Trophy, TrendingUp, TrendingDown, Crown, Shield, Zap, Target } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

type Period = 'daily' | 'weekly' | 'alltime'

interface Trader {
  rank: number
  username: string
  initials: string
  color: string
  pnlPct: number
  winRate: number
  trades: number
  specialty: string
  badge: 'crown' | 'shield' | 'zap' | 'target' | null
  accountType: 'paper' | 'evaluation' | 'funded' | 'verified'
  streak: number
}

const MOCK_TRADERS: Trader[] = [
  { rank: 1,  username: 'QuantKing_NYC',    initials: 'QK', color: '#ffa502', pnlPct: 14.2, winRate: 73, trades: 38, specialty: 'Futures',  badge: 'crown',  accountType: 'funded',      streak: 12 },
  { rank: 2,  username: 'ScalpGod_CHI',     initials: 'SG', color: '#00d4aa', pnlPct: 11.8, winRate: 68, trades: 142,specialty: 'Scalping', badge: 'zap',    accountType: 'evaluation',  streak: 8  },
  { rank: 3,  username: 'ThetaQueen',       initials: 'TQ', color: '#a855f7', pnlPct: 9.4,  winRate: 81, trades: 24, specialty: 'Options',  badge: 'target', accountType: 'verified',    streak: 5  },
  { rank: 4,  username: 'MomoMike_ATL',     initials: 'MM', color: '#1e90ff', pnlPct: 7.1,  winRate: 62, trades: 57, specialty: 'Momentum', badge: null,     accountType: 'paper',       streak: 3  },
  { rank: 5,  username: 'ForexFred',        initials: 'FF', color: '#00d4aa', pnlPct: 6.3,  winRate: 58, trades: 89, specialty: 'Forex',    badge: null,     accountType: 'funded',      streak: 6  },
  { rank: 6,  username: 'IronCondorIvan',   initials: 'IC', color: '#ffa502', pnlPct: 5.9,  winRate: 78, trades: 19, specialty: 'Options',  badge: 'shield', accountType: 'verified',    streak: 15 },
  { rank: 7,  username: 'SwingKing_LA',     initials: 'SK', color: '#a855f7', pnlPct: 4.8,  winRate: 65, trades: 31, specialty: 'Swing',    badge: null,     accountType: 'paper',       streak: 2  },
  { rank: 8,  username: 'DeltaDave',        initials: 'DD', color: '#1e90ff', pnlPct: 4.2,  winRate: 60, trades: 45, specialty: 'Options',  badge: null,     accountType: 'evaluation',  streak: 4  },
  { rank: 9,  username: 'GoldBug_Texas',    initials: 'GB', color: '#ffa502', pnlPct: 3.7,  winRate: 55, trades: 22, specialty: 'Futures',  badge: null,     accountType: 'paper',       streak: 1  },
  { rank: 10, username: 'NasdaqNick',       initials: 'NN', color: '#00d4aa', pnlPct: 3.1,  winRate: 52, trades: 61, specialty: 'Stocks',   badge: null,     accountType: 'paper',       streak: 3  },
]

const BADGE_ICONS = {
  crown:  { icon: Crown,  title: 'Top Trader',       color: '#ffa502' },
  shield: { icon: Shield, title: 'Consistent',       color: '#1e90ff' },
  zap:    { icon: Zap,    title: 'Speed Trader',     color: '#00d4aa' },
  target: { icon: Target, title: 'Precision Trader', color: '#a855f7' },
}

const ACCOUNT_LABELS = {
  paper:      { label: 'Paper',      color: '#7f93b5' },
  evaluation: { label: 'Eval',       color: '#ffa502' },
  funded:     { label: 'Funded',     color: '#00d4aa' },
  verified:   { label: 'Verified',   color: '#1e90ff' },
}

export default function Leaderboard() {
  const [period, setPeriod] = useState<Period>('weekly')
  const { getTotalEquity, getTotalUnrealizedPnL } = usePortfolioStore()
  const equity = getTotalEquity({})
  const userPnLPct = ((equity - 100_000) / 100_000) * 100
  const userRank = MOCK_TRADERS.filter(t => t.pnlPct > userPnLPct).length + 1

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <Trophy size={12} className="text-[#ffa502]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Leaderboard</span>
          <span className="text-[9px] bg-[#ffa502]/20 text-[#ffa502] px-1.5 rounded font-mono">1,247 traders</span>
        </div>
        <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
          {(['daily','weekly','alltime'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-2 py-0.5 text-[9px] font-mono uppercase transition-colors ${
                period === p ? 'bg-[#ffa502] text-[#040c14] font-bold' : 'text-[#4a5e7a] hover:bg-[#0f1f38]'
              }`}>{p === 'alltime' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Column headers */}
      <div className="grid grid-cols-12 px-3 py-1 border-b border-[#1a2d4a] bg-[#040c14] text-[9px] text-[#4a5e7a] uppercase tracking-wider shrink-0">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Trader</div>
        <div className="col-span-2 text-right">P&L %</div>
        <div className="col-span-2 text-right">Win%</div>
        <div className="col-span-2 text-right">Trades</div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {MOCK_TRADERS.map((t) => {
          const BadgeComp = t.badge ? BADGE_ICONS[t.badge] : null
          const acct = ACCOUNT_LABELS[t.accountType]
          return (
            <div key={t.rank} className="grid grid-cols-12 items-center px-3 py-2 border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors cursor-pointer">
              <div className="col-span-1">
                <span className={`mono text-xs font-bold ${t.rank <= 3 ? 'text-[#ffa502]' : 'text-[#4a5e7a]'}`}>
                  {t.rank <= 3 ? ['🥇','🥈','🥉'][t.rank - 1] : t.rank}
                </span>
              </div>
              <div className="col-span-5 flex items-center gap-2">
                <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
                  style={{ background: `${t.color}25`, color: t.color }}>
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-[#cdd6f4] truncate">{t.username}</span>
                    {BadgeComp && <BadgeComp.icon size={9} style={{ color: BadgeComp.color }} />}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[8px] font-mono px-1 rounded" style={{ background: `${acct.color}20`, color: acct.color }}>
                      {acct.label}
                    </span>
                    <span className="text-[8px] text-[#4a5e7a]">{t.specialty}</span>
                    {t.streak >= 5 && <span className="text-[8px] text-[#ffa502]">🔥{t.streak}</span>}
                  </div>
                </div>
              </div>
              <div className="col-span-2 text-right">
                <span className={`mono text-xs font-bold ${t.pnlPct >= 0 ? 'text-up' : 'text-down'}`}>
                  {t.pnlPct >= 0 ? '+' : ''}{t.pnlPct.toFixed(1)}%
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className={`mono text-[10px] ${t.winRate >= 60 ? 'text-up' : t.winRate >= 50 ? 'text-[#ffa502]' : 'text-down'}`}>
                  {t.winRate}%
                </span>
              </div>
              <div className="col-span-2 text-right">
                <span className="mono text-[10px] text-[#7f93b5]">{t.trades}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Your rank */}
      <div className="px-3 py-2 border-t border-[#1a2d4a] bg-[#040c14] shrink-0">
        <div className="grid grid-cols-12 items-center">
          <div className="col-span-1">
            <span className="mono text-xs font-bold text-[#1e90ff]">#{userRank}</span>
          </div>
          <div className="col-span-5 flex items-center gap-2">
            <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold bg-[#1e90ff]/20 text-[#1e90ff]">ME</div>
            <div>
              <div className="text-[11px] font-semibold text-[#1e90ff]">You</div>
              <span className="text-[8px] text-[#4a5e7a]">Paper • All assets</span>
            </div>
          </div>
          <div className="col-span-2 text-right">
            <span className={`mono text-xs font-bold ${userPnLPct >= 0 ? 'text-up' : 'text-down'}`}>
              {userPnLPct >= 0 ? '+' : ''}{userPnLPct.toFixed(2)}%
            </span>
          </div>
          <div className="col-span-2 text-right">
            <span className="mono text-[10px] text-[#7f93b5]">—</span>
          </div>
          <div className="col-span-2 text-right">
            <span className="mono text-[10px] text-[#7f93b5]">—</span>
          </div>
        </div>
      </div>
    </div>
  )
}
