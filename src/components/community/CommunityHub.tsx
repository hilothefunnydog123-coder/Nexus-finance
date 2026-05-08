'use client'

import { useState } from 'react'
import { Users, Trophy, TrendingUp, Calendar, Star, Activity, HelpCircle } from 'lucide-react'
import Leaderboard from './Leaderboard'
import TradeIdeas from './TradeIdeas'
import EconomicCalendar from './EconomicCalendar'
import DailyTasks from './DailyTasks'
import FAQ from './FAQ'
import Achievements from './Achievements'

type Tab = 'leaderboard' | 'ideas' | 'calendar' | 'tasks' | 'achievements' | 'faq'

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'leaderboard', label: 'Leaderboard',  icon: <Trophy size={12} /> },
  { id: 'ideas',       label: 'Trade Ideas',  icon: <TrendingUp size={12} /> },
  { id: 'calendar',    label: 'Calendar',     icon: <Calendar size={12} /> },
  { id: 'tasks',       label: 'Tasks & XP',   icon: <Star size={12} /> },
  { id: 'achievements',label: 'Achievements', icon: <Star size={12} /> },
  { id: 'faq',         label: 'FAQ',          icon: <HelpCircle size={12} /> },
]

export default function CommunityHub() {
  const [tab, setTab] = useState<Tab>('leaderboard')

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Header */}
      <div className="px-4 py-2.5 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
              <Users size={12} className="text-[#040c14]" />
            </div>
            <div>
              <span className="text-sm font-black text-[#cdd6f4] tracking-tight">YN COMMUNITY</span>
              <span className="text-[10px] text-[#4a5e7a] ml-2">The hub for serious traders</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {[
              { label: 'Online',       value: '1,247',  color: '#00d4aa', icon: <Activity size={9} /> },
              { label: 'Trades Today', value: '18,432', color: '#1e90ff', icon: <TrendingUp size={9} /> },
            ].map(({ label, value, color, icon }) => (
              <div key={label} className="text-center hidden md:block">
                <div className="flex items-center gap-1 justify-center mb-0.5" style={{ color }}>
                  {icon}
                  <span className="mono text-xs font-bold">{value}</span>
                </div>
                <div className="text-[8px] text-[#4a5e7a] uppercase tracking-wider">{label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-semibold transition-colors shrink-0 ${
                tab === t.id
                  ? 'bg-[#0a1628] text-[#cdd6f4] border border-[#1e3a5f]'
                  : 'text-[#4a5e7a] hover:text-[#7f93b5] hover:bg-[#071220]'
              }`}>
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'leaderboard' && (
          <div className="flex h-full">
            <div className="flex-1 border-r border-[#1a2d4a] overflow-hidden"><Leaderboard /></div>
            <div className="w-72 overflow-hidden"><DailyTasks /></div>
          </div>
        )}
        {tab === 'ideas'        && <TradeIdeas />}
        {tab === 'calendar'     && <EconomicCalendar />}
        {tab === 'tasks'        && <DailyTasks />}
        {tab === 'achievements' && <Achievements />}
        {tab === 'faq'          && <FAQ />}
      </div>
    </div>
  )
}
