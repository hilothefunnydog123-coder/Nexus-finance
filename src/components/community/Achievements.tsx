'use client'

import { usePortfolioStore } from '@/store/portfolioStore'

interface Badge {
  id: string; emoji: string; title: string; desc: string
  earned: boolean; rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

const RARITY = {
  common:    { color: '#7f93b5', label: 'Common'    },
  rare:      { color: '#1e90ff', label: 'Rare'      },
  epic:      { color: '#a855f7', label: 'Epic'      },
  legendary: { color: '#ffa502', label: 'Legendary' },
}

export default function Achievements() {
  const { positions, closedTrades, getTotalEquity } = usePortfolioStore()
  const equity = getTotalEquity({})
  const pnlPct = ((equity - 100_000) / 100_000) * 100
  const wins = closedTrades.filter(t => t.pnl > 0)
  const winRate = closedTrades.length > 0 ? (wins.length / closedTrades.length) * 100 : 0

  const badges: Badge[] = [
    { id: 'first_login',   emoji: '🚀', title: 'First Launch',      desc: 'Opened YN Finance for the first time',      earned: true,                          rarity: 'common'    },
    { id: 'first_trade',   emoji: '📈', title: 'First Trade',       desc: 'Executed your first paper trade',           earned: closedTrades.length > 0,       rarity: 'common'    },
    { id: 'profitable',    emoji: '💰', title: 'In The Green',       desc: 'Closed a profitable trade',                 earned: wins.length > 0,               rarity: 'common'    },
    { id: 'ten_trades',    emoji: '🔟', title: 'Seasoned Trader',   desc: 'Closed 10 trades',                          earned: closedTrades.length >= 10,     rarity: 'common'    },
    { id: 'fifty_trades',  emoji: '🏅', title: 'Volume Trader',     desc: 'Closed 50 trades',                          earned: closedTrades.length >= 50,     rarity: 'rare'      },
    { id: 'winrate_60',    emoji: '🎯', title: 'Sharpshooter',      desc: 'Maintain 60%+ win rate over 10 trades',     earned: winRate >= 60 && closedTrades.length >= 10, rarity: 'rare' },
    { id: 'winrate_70',    emoji: '🏆', title: 'Elite Accuracy',    desc: '70%+ win rate over 20 trades',              earned: winRate >= 70 && closedTrades.length >= 20, rarity: 'epic' },
    { id: 'up_5pct',       emoji: '📊', title: 'Green Machine',     desc: 'Grew account by 5%',                        earned: pnlPct >= 5,                   rarity: 'rare'      },
    { id: 'up_10pct',      emoji: '💎', title: 'Double Digits',     desc: 'Grew account by 10%',                       earned: pnlPct >= 10,                  rarity: 'epic'      },
    { id: 'up_25pct',      emoji: '👑', title: 'Prop Firm Ready',   desc: 'Grew account by 25%',                       earned: pnlPct >= 25,                  rarity: 'legendary' },
    { id: 'multi_asset',   emoji: '🌐', title: 'Diversified',       desc: 'Traded stocks, forex, AND futures',         earned: false,                         rarity: 'rare'      },
    { id: 'challenge',     emoji: '🛡️', title: 'Challenge Accepted', desc: 'Started a YN Capital prop challenge',      earned: false,                         rarity: 'epic'      },
    { id: 'challenge_pass',emoji: '🎖️', title: 'Funded Trader',    desc: 'Passed a YN Capital prop challenge',        earned: false,                         rarity: 'legendary' },
    { id: 'forex_5',       emoji: '💱', title: 'Forex Initiate',    desc: 'Closed 5 forex trades',                     earned: false,                         rarity: 'common'    },
    { id: 'community',     emoji: '💬', title: 'Community Member',  desc: 'Posted a message in Trade-Room',            earned: true,                          rarity: 'common'    },
    { id: 'idea_post',     emoji: '💡', title: 'Idea Contributor',  desc: 'Posted a trade idea in Community',          earned: false,                         rarity: 'rare'      },
  ]

  const earned = badges.filter(b => b.earned)
  const unearned = badges.filter(b => !b.earned)

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="px-4 py-3 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center justify-between">
          <div className="text-sm font-black text-[#cdd6f4]">Achievements</div>
          <div className="text-[10px] text-[#4a5e7a]">{earned.length} / {badges.length} unlocked</div>
        </div>
        <div className="mt-2 h-1.5 bg-[#0f1f38] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#00d4aa] to-[#1e90ff] rounded-full"
            style={{ width: `${(earned.length / badges.length) * 100}%` }} />
        </div>
      </div>

      <div className="p-4">
        <div className="text-[10px] text-[#4a5e7a] uppercase tracking-wider mb-3">Unlocked ({earned.length})</div>
        <div className="grid grid-cols-2 gap-2 mb-6">
          {earned.map(b => {
            const r = RARITY[b.rarity]
            return (
              <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl border"
                style={{ background: `${r.color}10`, borderColor: `${r.color}30` }}>
                <div className="text-2xl shrink-0">{b.emoji}</div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#cdd6f4]">{b.title}</div>
                  <div className="text-[9px] text-[#4a5e7a] leading-snug">{b.desc}</div>
                  <div className="text-[8px] mt-1 font-bold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</div>
                </div>
              </div>
            )
          })}
        </div>

        <div className="text-[10px] text-[#4a5e7a] uppercase tracking-wider mb-3">Locked ({unearned.length})</div>
        <div className="grid grid-cols-2 gap-2">
          {unearned.map(b => {
            const r = RARITY[b.rarity]
            return (
              <div key={b.id} className="flex items-start gap-3 p-3 rounded-xl border border-[#1a2d4a] bg-[#040c14] opacity-50">
                <div className="text-2xl shrink-0 grayscale">{b.emoji}</div>
                <div className="min-w-0">
                  <div className="text-[11px] font-bold text-[#7f93b5]">{b.title}</div>
                  <div className="text-[9px] text-[#4a5e7a] leading-snug">{b.desc}</div>
                  <div className="text-[8px] mt-1 font-bold uppercase tracking-wider" style={{ color: r.color }}>{r.label}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
