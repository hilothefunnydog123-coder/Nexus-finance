'use client'

import { useState } from 'react'
import {
  LayoutDashboard, MessageSquare, Newspaper,
  ChevronRight, Zap, CandlestickChart,
} from 'lucide-react'
import { useMarketData } from '@/hooks/useMarketData'
import { usePortfolioStore } from '@/store/portfolioStore'
import MarketTicker from '@/components/dashboard/MarketTicker'
import StatsBar from '@/components/dashboard/StatsBar'
import WatchlistPanel from '@/components/dashboard/WatchlistPanel'
import MainChart from '@/components/dashboard/MainChart'
import PulseFeed from '@/components/pulse/PulseFeed'
import TradeRoom from '@/components/traderoom/TradeRoom'
import TradingWorkspace from '@/components/trading/TradingWorkspace'
import type { Quote } from '@/lib/types'

const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','NFLX','QQQ']

type Tab = 'dashboard' | 'trade' | 'traderoom' | 'pulse'

const NAV_ITEMS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard',  label: 'Dashboard',   icon: <LayoutDashboard size={13} /> },
  { id: 'trade',      label: 'Trade',        icon: <CandlestickChart size={13} /> },
  { id: 'traderoom',  label: 'Trade-Room',   icon: <MessageSquare size={13} /> },
  { id: 'pulse',      label: 'Pulse',        icon: <Newspaper size={13} /> },
]

function PortfolioBar({ quotes }: { quotes: Record<string, Quote> }) {
  const { getTotalEquity, getTotalUnrealizedPnL, cash, positions } = usePortfolioStore()
  const prices = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, v.price]))
  const equity = getTotalEquity(prices)
  const pnl = getTotalUnrealizedPnL(prices)
  const ret = ((equity - 100_000) / 100_000) * 100
  const isUp = pnl >= 0

  return (
    <div className="flex items-center h-7 border-t border-[#1a2d4a] bg-[#040c14] shrink-0 select-none">
      <div className="flex items-center gap-1.5 px-3 border-r border-[#1a2d4a] h-full">
        <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">Paper Acct</span>
      </div>
      <div className="flex items-center gap-5 px-4 text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="text-[#4a5e7a]">Equity</span>
          <span className="mono font-semibold text-[#cdd6f4]">
            ${equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#4a5e7a]">Return</span>
          <span className={`mono font-semibold ${ret >= 0 ? 'text-up' : 'text-down'}`}>
            {ret >= 0 ? '+' : ''}{ret.toFixed(2)}%
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#4a5e7a]">Float P&L</span>
          <span className={`mono font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
            {isUp ? '+' : ''}${pnl.toFixed(2)}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#4a5e7a]">Cash</span>
          <span className="mono text-[#7f93b5]">${cash.toLocaleString('en-US', { maximumFractionDigits: 0 })}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[#4a5e7a]">Positions</span>
          <span className="mono text-[#7f93b5]">{positions.length}</span>
        </div>
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

      {/* ── Nav ── */}
      <nav className="flex items-center h-10 border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 border-r border-[#1a2d4a] h-full">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
            <Zap size={11} className="text-[#040c14]" fill="currentColor" />
          </div>
          <span className="text-sm font-black tracking-tight text-white">NEXUS</span>
          <span className="text-sm font-light text-[#00d4aa] tracking-widest">FINANCE</span>
        </div>

        {/* Tabs */}
        <div className="flex h-full">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors ${
                activeTab === item.id
                  ? 'text-[#00d4aa] border-b-2 border-b-[#00d4aa] bg-[#071220]'
                  : 'text-[#7f93b5] hover:text-[#cdd6f4] hover:bg-[#071220]'
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {/* Demo badge */}
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

      {/* ── Ticker ── */}
      <MarketTicker quotes={quotes} connected={connected} isDemo={isDemo} />

      {/* ── Stats ── */}
      <StatsBar />

      {/* ── Main Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Dashboard */}
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

        {/* Trade workspace */}
        {activeTab === 'trade' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TradingWorkspace />
          </div>
        )}

        {/* Full Trade-Room */}
        {activeTab === 'traderoom' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TradeRoom />
          </div>
        )}

        {/* Pulse */}
        {activeTab === 'pulse' && (
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <div className="flex-1 border-r border-[#1a2d4a] overflow-hidden">
              <PulseFeed />
            </div>
            <div className="flex-1 flex flex-col bg-[#071220] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
                <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-widest">X (Twitter) — Finance Analysts</span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-[12px] text-[#7f93b5] leading-relaxed mb-3">
                  Add the Twitter widget script to enable the embedded analyst feed:
                </p>
                <pre className="bg-[#040c14] border border-[#1a2d4a] rounded p-3 text-[10px] text-[#7f93b5] overflow-x-auto">
{`// In src/app/layout.tsx <head>:
<script async src="https://platform.twitter.com/widgets.js" />

// In this tab:
<a className="twitter-timeline" data-theme="dark"
   href="https://twitter.com/i/lists/748093258937913345">
  Finance Analysts
</a>`}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Portfolio Bar ── */}
      <PortfolioBar quotes={quotes} />
    </div>
  )
}
