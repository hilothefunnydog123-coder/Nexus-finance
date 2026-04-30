'use client'

import { useState } from 'react'
import {
  LayoutDashboard, MessageSquare, Briefcase, Newspaper,
  Settings, ChevronRight, Zap,
} from 'lucide-react'
import { useMarketData } from '@/hooks/useMarketData'
import { usePortfolioStore } from '@/store/portfolioStore'
import MarketTicker from '@/components/dashboard/MarketTicker'
import StatsBar from '@/components/dashboard/StatsBar'
import WatchlistPanel from '@/components/dashboard/WatchlistPanel'
import MainChart from '@/components/dashboard/MainChart'
import PulseFeed from '@/components/pulse/PulseFeed'
import TradeRoom from '@/components/traderoom/TradeRoom'
import PortfolioSimulator from '@/components/portfolio/PortfolioSimulator'
import type { Quote } from '@/lib/types'

const SYMBOLS = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'GOOGL', 'AMZN', 'META', 'AMD', 'JPM', 'SPY', 'NFLX']

type Tab = 'dashboard' | 'traderoom' | 'pulse'

const NAV_ITEMS: { id: Tab | 'portfolio'; label: string; icon: React.ReactNode }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={13} /> },
  { id: 'traderoom', label: 'Trade-Room', icon: <MessageSquare size={13} /> },
  { id: 'portfolio', label: 'Portfolio', icon: <Briefcase size={13} /> },
  { id: 'pulse', label: 'Pulse', icon: <Newspaper size={13} /> },
]

// Bottom portfolio summary bar
function PortfolioBar({ quotes, onOpen }: { quotes: Record<string, Quote>; onOpen: () => void }) {
  const { getTotalValue, getTotalPnL, cash, positions } = usePortfolioStore()
  const prices = Object.fromEntries(Object.entries(quotes).map(([k, v]) => [k, v.price]))
  const totalValue = getTotalValue(prices)
  const totalPnL = getTotalPnL(prices)
  const pnlPct = ((totalValue - 100_000) / 100_000) * 100
  const isUp = totalPnL >= 0
  const posCount = Object.keys(positions).length

  return (
    <div
      onClick={onOpen}
      className="flex items-center h-8 border-t border-[#1a2d4a] bg-[#040c14] cursor-pointer hover:bg-[#071220] transition-colors shrink-0 select-none"
    >
      <div className="flex items-center gap-1.5 px-3 border-r border-[#1a2d4a] h-full">
        <Briefcase size={10} className="text-[#7f93b5]" />
        <span className="text-[10px] text-[#7f93b5] uppercase tracking-wider">Paper Portfolio</span>
      </div>
      <div className="flex items-center gap-5 px-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#4a5e7a]">Value</span>
          <span className="mono text-[11px] font-semibold text-[#cdd6f4]">
            ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className={`mono text-[11px] font-semibold ${isUp ? 'text-up' : 'text-down'}`}>
            {isUp ? '+' : ''}{pnlPct.toFixed(2)}%
          </span>
          <span className={`mono text-[10px] ${isUp ? 'text-up' : 'text-down'}`}>
            ({isUp ? '+' : ''}${Math.abs(totalPnL).toFixed(2)})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#4a5e7a]">Cash</span>
          <span className="mono text-[10px] text-[#7f93b5]">
            ${cash.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-[#4a5e7a]">Positions</span>
          <span className="mono text-[10px] text-[#7f93b5]">{posCount}</span>
        </div>
      </div>
      <div className="ml-auto px-3 border-l border-[#1a2d4a] h-full flex items-center">
        <span className="text-[10px] text-[#4a5e7a] hover:text-[#7f93b5]">Open Simulator →</span>
      </div>
    </div>
  )
}

export default function NexusDashboard() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [activeTab, setActiveTab] = useState<Tab>('dashboard')
  const [showPortfolio, setShowPortfolio] = useState(false)
  const { quotes, connected, isDemo } = useMarketData(SYMBOLS)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#040c14' }}>

      {/* ── Top Nav ── */}
      <nav className="flex items-center h-10 border-b border-[#1a2d4a] bg-[#040c14] shrink-0 z-10">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 border-r border-[#1a2d4a] h-full">
          <div className="w-5 h-5 rounded bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
            <Zap size={11} className="text-[#040c14]" fill="currentColor" />
          </div>
          <span className="text-sm font-black tracking-tight text-white">NEXUS</span>
          <span className="text-sm font-light text-[#00d4aa] tracking-widest">FINANCE</span>
        </div>

        {/* Nav tabs */}
        <div className="flex h-full">
          {NAV_ITEMS.map(item => {
            const isActive = activeTab === item.id
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'portfolio') { setShowPortfolio(true); return }
                  setActiveTab(item.id as Tab)
                }}
                className={`flex items-center gap-1.5 px-4 h-full text-[11px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-colors ${
                  isActive
                    ? 'text-[#00d4aa] border-b-2 border-b-[#00d4aa] bg-[#071220]'
                    : 'text-[#7f93b5] hover:text-[#cdd6f4] hover:bg-[#071220]'
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            )
          })}
        </div>

        {/* Demo badge + settings */}
        <div className="ml-auto flex items-center gap-3 px-4 border-l border-[#1a2d4a] h-full">
          {isDemo && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#ffa502]/10 border border-[#ffa502]/30 rounded">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffa502] animate-pulse" />
              <span className="text-[10px] text-[#ffa502] font-mono uppercase tracking-wider">Demo Mode</span>
              <ChevronRight size={9} className="text-[#ffa502]" />
              <span className="text-[10px] text-[#7f93b5]">Add Finnhub key to .env.local for live data</span>
            </div>
          )}
          <button className="text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors">
            <Settings size={13} />
          </button>
        </div>
      </nav>

      {/* ── Ticker Tape ── */}
      <MarketTicker quotes={quotes} connected={connected} isDemo={isDemo} />

      {/* ── Market Stats ── */}
      <StatsBar />

      {/* ── Main Content ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {activeTab === 'dashboard' && (
          <>
            <WatchlistPanel
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              onSelect={setSelectedSymbol}
            />
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

        {activeTab === 'traderoom' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TradeRoom />
          </div>
        )}

        {activeTab === 'pulse' && (
          <div className="flex-1 min-h-0 overflow-hidden flex">
            <div className="flex-1 border-r border-[#1a2d4a] overflow-hidden">
              <PulseFeed />
            </div>
            <div className="flex-1 flex flex-col bg-[#071220] overflow-hidden">
              <div className="px-4 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
                <span className="text-[11px] font-semibold text-[#7f93b5] uppercase tracking-widest">
                  X (Twitter) — Finance Analysts
                </span>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                <p className="text-[12px] text-[#7f93b5] leading-relaxed">
                  To embed the Twitter/X analyst list, add the widget script to your{' '}
                  <code className="text-[#00d4aa] bg-[#040c14] px-1 py-0.5 rounded">layout.tsx</code> head section:
                </p>
                <pre className="mt-3 bg-[#040c14] border border-[#1a2d4a] rounded p-3 text-[10px] text-[#7f93b5] overflow-x-auto">
{`<script async src="https://platform.twitter.com/widgets.js" />

// Then render:
<a
  className="twitter-timeline"
  data-theme="dark"
  data-height="100%"
  href="https://twitter.com/i/lists/748093258937913345"
>
  Finance Analysts
</a>`}
                </pre>
                <p className="text-[11px] text-[#4a5e7a] mt-4">
                  The embedded list includes: @GoldmanSachs, @jpmorgan, @Bloomberg, @Wu_Tang_Finance, and other top analysts.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Portfolio Summary Bar ── */}
      <PortfolioBar quotes={quotes} onOpen={() => setShowPortfolio(true)} />

      {/* ── Portfolio Modal ── */}
      {showPortfolio && (
        <PortfolioSimulator quotes={quotes} onClose={() => setShowPortfolio(false)} />
      )}
    </div>
  )
}
