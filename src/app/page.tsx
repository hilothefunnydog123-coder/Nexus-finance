'use client'

import { useState } from 'react'
import { LayoutDashboard, MessageSquare, Newspaper, ChevronRight, Zap, CandlestickChart, Users } from 'lucide-react'
import { useMarketData } from '@/hooks/useMarketData'
import { usePortfolioStore } from '@/store/portfolioStore'
import MarketTicker from '@/components/dashboard/MarketTicker'
import StatsBar from '@/components/dashboard/StatsBar'
import WatchlistPanel from '@/components/dashboard/WatchlistPanel'
import MainChart from '@/components/dashboard/MainChart'
import PulseFeed from '@/components/pulse/PulseFeed'
import TradeRoom from '@/components/traderoom/TradeRoom'
import TradingWorkspace from '@/components/trading/TradingWorkspace'
import CommunityHub from '@/components/community/CommunityHub'
import type { Quote } from '@/lib/types'

const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','NFLX','QQQ']

type Tab = 'dashboard' | 'trade' | 'community' | 'traderoom' | 'pulse'

const NAV = [
  { id: 'dashboard' as Tab, label: 'Dashboard',   icon: <LayoutDashboard size={13} /> },
  { id: 'trade'     as Tab, label: 'Trade',        icon: <CandlestickChart size={13} /> },
  { id: 'community' as Tab, label: 'Community',    icon: <Users size={13} /> },
  { id: 'traderoom' as Tab, label: 'Trade-Room',   icon: <MessageSquare size={13} /> },
  { id: 'pulse'     as Tab, label: 'Pulse',        icon: <Newspaper size={13} /> },
]

function PortfolioBar({ quotes }: { quotes: Record<string, Quote> }) {
  const { getTotalEquity, getTotalUnrealizedPnL, cash, positions } = usePortfolioStore()
  const prices = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, v.price]))
  const equity = getTotalEquity(prices)
  const pnl = getTotalUnrealizedPnL(prices)
  const ret = ((equity - 100_000) / 100_000) * 100

  return (
    <div className="flex items-center h-7 border-t border-[#1a2d4a] bg-[#040c14] shrink-0 select-none">
      <div className="flex items-center gap-1.5 px-3 border-r border-[#1a2d4a] h-full">
        <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider font-semibold">Paper Account</span>
      </div>
      <div className="flex items-center gap-5 px-4 text-[10px]">
        {[
          { label: 'Equity', value: `$${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, color: '#cdd6f4' },
          { label: 'Return', value: `${ret >= 0 ? '+' : ''}${ret.toFixed(2)}%`, color: ret >= 0 ? '#00d4aa' : '#ff4757' },
          { label: 'Float P&L', value: `${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}`, color: pnl >= 0 ? '#00d4aa' : '#ff4757' },
          { label: 'Cash', value: `$${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: '#7f93b5' },
          { label: 'Positions', value: String(positions.length), color: '#7f93b5' },
        ].map(({ label, value, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className="text-[#4a5e7a]">{label}</span>
            <span className="mono font-semibold" style={{ color }}>{value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function NexusDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const { quotes, connected, isDemo } = useMarketData(SYMBOLS)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#040c14' }}>

      {/* Nav */}
      <nav className="flex items-center h-10 border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
        <div className="flex items-center gap-2 px-4 border-r border-[#1a2d4a] h-full">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
            <Zap size={11} className="text-[#040c14]" fill="currentColor" />
          </div>
          <span className="text-sm font-black tracking-tight text-white">NEXUS</span>
          <span className="text-sm font-light text-[#00d4aa] tracking-widest">FINANCE</span>
        </div>

        <div className="flex h-full">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors ${
                activeTab === item.id
                  ? 'text-[#00d4aa] border-b-2 border-b-[#00d4aa] bg-[#071220]'
                  : 'text-[#7f93b5] hover:text-[#cdd6f4] hover:bg-[#071220]'
              }`}>
              {item.icon} {item.label}
              {item.id === 'community' && (
                <span className="ml-1 text-[8px] bg-[#00d4aa]/20 text-[#00d4aa] px-1 rounded font-mono">NEW</span>
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3 px-4 border-l border-[#1a2d4a] h-full">
          {isDemo && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffa502] animate-pulse" />
              <span className="text-[10px] text-[#ffa502] font-mono uppercase">Demo</span>
              <ChevronRight size={9} className="text-[#ffa502]" />
              <span className="text-[10px] text-[#7f93b5]">Add Finnhub key to .env.local for live data</span>
            </div>
          )}
        </div>
      </nav>

      <MarketTicker quotes={quotes} connected={connected} isDemo={isDemo} />
      <StatsBar />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {activeTab === 'dashboard' && (
          <>
            <WatchlistPanel quotes={quotes} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
            <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden">
              <div className="border-b border-[#1a2d4a] overflow-hidden" style={{ flex: '0 0 62%' }}>
                <MainChart symbol={selectedSymbol} quote={quotes[selectedSymbol]} />
              </div>
              <div className="overflow-hidden" style={{ flex: '0 0 38%' }}>
                <TradeRoom />
              </div>
            </div>
            <PulseFeed />
          </>
        )}
        {activeTab === 'trade' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TradingWorkspace /></div>
        )}
        {activeTab === 'community' && (
          <div className="flex-1 min-h-0 overflow-hidden"><CommunityHub /></div>
        )}
        {activeTab === 'traderoom' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TradeRoom /></div>
        )}
        {activeTab === 'pulse' && (
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <div className="flex-1 border-r border-[#1a2d4a] overflow-hidden"><PulseFeed /></div>
            <div className="flex-1 flex flex-col bg-[#071220] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0 flex items-center gap-2">
                <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-widest">X (Twitter) — Analyst Live Feed</span>
                <span className="text-[9px] bg-[#1e90ff]/20 text-[#1e90ff] px-1.5 rounded">via twitter-timeline widget</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <a className="twitter-timeline" data-theme="dark" data-chrome="noheader nofooter transparent"
                  data-tweet-limit="10" href="https://twitter.com/i/lists/748093258937913345">
                  Finance Analysts
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <PortfolioBar quotes={quotes} />
    </div>
  )
}
