'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LayoutDashboard, MessageSquare, Newspaper, ChevronRight, CandlestickChart, Users, Home, Share2, BarChart2, ScanLine, BookOpen, FlaskConical, Trophy } from 'lucide-react'
import { YNMark } from '@/components/YNLogo'
import PreMarketScanner from '@/components/scanner/PreMarketScanner'
import TradeJournal from '@/components/journal/TradeJournal'
import Onboarding from '@/components/ui-overlay/Onboarding'
import ShareCard from '@/components/ui-overlay/ShareCard'
import KeyboardShortcuts from '@/components/ui-overlay/KeyboardShortcuts'
import MorningBriefing from '@/components/ui-overlay/MorningBriefing'
import Glossary from '@/components/ui-overlay/Glossary'
import MarketHeatmap from '@/components/dashboard/MarketHeatmap'
import FearGreed from '@/components/dashboard/FearGreed'
import OptionsFlow from '@/components/dashboard/OptionsFlow'
import RiskCalculator from '@/components/trading/RiskCalculator'
import FundamentalsPanel from '@/components/dashboard/FundamentalsPanel'
import PortfolioAnalytics from '@/components/trading/PortfolioAnalytics'
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
import AITerminalChat from '@/components/ai/AITerminalChat'
import AIChartVision from '@/components/ai/AIChartVision'
import TopStocksWidget from '@/components/ai/TopStocksWidget'
import AINewspaper from '@/components/ai/AINewspaper'
import TradeAnalyzer from '@/components/ai/TradeAnalyzer'
import TournamentLobby from '@/components/arena/TournamentLobby'
import type { Quote } from '@/lib/types'

const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','NFLX','QQQ']

type Tab = 'dashboard' | 'scanner' | 'trade' | 'journal' | 'community' | 'traderoom' | 'pulse' | 'ai' | 'analyzer' | 'arena'

const NAV = [
  { id: 'arena'     as Tab, label: 'Arena',      icon: <Trophy size={13} />,      hot: true, hotColor: '#ffa502' },
  { id: 'dashboard' as Tab, label: 'Dashboard',  icon: <LayoutDashboard size={13} /> },
  { id: 'scanner'   as Tab, label: 'Scanner',    icon: <ScanLine size={13} />,    hot: true  },
  { id: 'trade'     as Tab, label: 'Trade',      icon: <CandlestickChart size={13} /> },
  { id: 'journal'   as Tab, label: 'Journal',    icon: <BookOpen size={13} /> },
  { id: 'community' as Tab, label: 'Community',  icon: <Users size={13} /> },
  { id: 'traderoom' as Tab, label: 'Trade-Room', icon: <MessageSquare size={13} /> },
  { id: 'pulse'     as Tab, label: 'Pulse',      icon: <Newspaper size={13} /> },
  { id: 'ai'        as Tab, label: 'AI Intel',   icon: <BarChart2 size={13} />, hot: true },
  { id: 'analyzer'  as Tab, label: 'Analyzer',   icon: <FlaskConical size={13} />, hot: true },
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
      <div className="yn-account-bar flex items-center gap-5 px-4 text-[10px] overflow-x-auto">
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
  const [showShare, setShowShare] = useState(false)
  const { quotes, connected, isDemo } = useMarketData(SYMBOLS)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ background: '#040c14' }}>
      <style>{`
        @media (max-width: 768px) {
          .yn-app-main { flex-direction: column !important; }
          .yn-watchlist { display: none !important; }
          .yn-pulse { display: none !important; }
          .yn-nav-label { display: none !important; }
          .yn-account-bar { font-size: 9px !important; gap: 8px !important; }
          .yn-nav-btn { padding: 0 10px !important; }
          .yn-nav-tabs { overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
          .yn-nav-tabs::-webkit-scrollbar { display: none; }
          .yn-nav-right { gap: 8px !important; padding: 0 8px !important; }
          .yn-nav-right .yn-hide-mobile { display: none !important; }
          .yn-logo-subtitle { display: none !important; }
          .yn-ai-panel { flex-direction: column !important; }
          .yn-ai-panel > * { width: 100% !important; min-width: unset !important; }
        }
      `}</style>
      <Onboarding onTabChange={(tab) => setActiveTab(tab as Tab)} />
      <KeyboardShortcuts />
      <AITerminalChat activeTab={activeTab} />
      <MorningBriefing />
      <Glossary />
      {showShare && <ShareCard onClose={() => setShowShare(false)} />}

      {/* Nav */}
      <nav className="flex items-center h-11 border-b border-[#1a2d4a] bg-[#030d18] shrink-0 overflow-hidden relative">
        {/* Bottom glow line */}
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background:'linear-gradient(90deg,transparent,rgba(0,212,170,.18),rgba(168,85,247,.12),transparent)', pointerEvents:'none' }}/>

        {/* Logo */}
        <div className="flex items-center gap-2 px-4 border-r border-[#1a2d4a] h-full shrink-0">
          <YNMark size={28}/>
          <div className="yn-logo-subtitle">
            <div className="text-sm font-black tracking-tight text-white leading-none">YN</div>
            <div className="text-[7px] tracking-[3px] leading-none" style={{ color:'#00d4aa', opacity:.55 }}>FINANCE</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="yn-nav-tabs flex h-full flex-1 min-w-0">
          {NAV.map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)}
              className={`yn-nav-btn relative flex items-center gap-1.5 px-3.5 h-full text-[10.5px] font-semibold uppercase tracking-wider border-r border-[#1a2d4a] transition-all shrink-0 ${
                activeTab === item.id
                  ? 'text-[#00d4aa] bg-[#041424]'
                  : 'text-[#4a6070] hover:text-[#8aaabb] hover:bg-[#041018]'
              }`}>
              {/* Active indicator line */}
              {activeTab === item.id && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5" style={{ background:'linear-gradient(90deg,transparent,#00d4aa,transparent)' }}/>
              )}
              {item.icon}
              <span className="yn-nav-label">{item.label}</span>
              {item.id === 'arena' && (
                <span className="ml-0.5 text-[7px] bg-[#ffa502]/15 text-[#ffa502] px-1.5 py-px rounded-sm font-mono tracking-wider">LIVE</span>
              )}
              {item.id === 'scanner' && (
                <span className="ml-0.5 text-[7px] bg-[#ffa502]/15 text-[#ffa502] px-1.5 py-px rounded-sm font-mono tracking-wider">EDGE</span>
              )}
              {(item.id === 'ai' || item.id === 'analyzer') && (
                <span className="ml-0.5 text-[7px] bg-[#a855f7]/15 text-[#a855f7] px-1.5 py-px rounded-sm font-mono tracking-wider">AI</span>
              )}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="yn-nav-right ml-auto flex items-center gap-2.5 px-3 border-l border-[#1a2d4a] h-full shrink-0">
          {isDemo && (
            <div className="yn-hide-mobile flex items-center gap-1.5 px-2 py-1 bg-[#ffa502]/08 border border-[#ffa502]/20 rounded-md">
              <span className="w-1 h-1 rounded-full bg-[#ffa502] animate-pulse" />
              <span className="text-[9px] text-[#ffa502] font-mono uppercase tracking-wider">Demo Mode</span>
            </div>
          )}
          <AIChartVision />
          <button onClick={() => setShowShare(true)} className="yn-hide-mobile flex items-center gap-1 text-[9px] text-[#2a4a62] hover:text-[#00d4aa] transition-colors font-medium">
            <Share2 size={10} /> <span>Share</span>
          </button>
          <Link href="/courses" className="flex items-center gap-1 text-[9px] font-bold text-[#00d4aa] border border-[#00d4aa]/20 bg-[#00d4aa]/06 hover:bg-[#00d4aa]/12 rounded-md px-2.5 py-1 transition-colors whitespace-nowrap">
            <BookOpen size={10} /> <span className="yn-hide-mobile">Courses</span>
          </Link>
          <Link href="/" className="flex items-center justify-center w-7 h-7 text-[#2a4a62] hover:text-[#4a6a78] transition-colors rounded-md hover:bg-[#1a2d4a]/30">
            <Home size={12} />
          </Link>
        </div>
      </nav>

      <MarketTicker quotes={quotes} connected={connected} isDemo={isDemo} />
      <StatsBar quotes={quotes} />

      <div className="flex flex-1 min-h-0 overflow-hidden">
        {activeTab === 'dashboard' && (
          <>
            <div className="yn-watchlist">
              <WatchlistPanel quotes={quotes} selectedSymbol={selectedSymbol} onSelect={setSelectedSymbol} />
            </div>
            <div className="flex flex-col flex-1 min-w-0 min-h-0 overflow-hidden" style={{ minWidth: 0 }}>
              <div className="border-b border-[#1a2d4a] overflow-hidden" style={{ flex: '0 0 62%' }}>
                <MainChart symbol={selectedSymbol} quote={quotes[selectedSymbol]} />
              </div>
              <div className="overflow-hidden" style={{ flex: '0 0 38%' }}>
                <TradeRoom />
              </div>
            </div>
            <div className="flex flex-col border-l border-[#1a2d4a]" style={{ width: 288, minWidth: 288 }}>
              <div className="overflow-hidden" style={{ flex: '0 0 40%', borderBottom: '1px solid #1a2d4a' }}>
                <FundamentalsPanel symbol={selectedSymbol} />
              </div>
              <div className="flex-1 overflow-hidden yn-pulse">
                <PulseFeed />
              </div>
            </div>
          </>
        )}
        {/* Markets overview — removed tab, content merged into Scanner */}
        {(activeTab as string) === 'markets' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 border-r border-[#1a2d4a] min-h-0 overflow-hidden">
              <MarketHeatmap />
            </div>
            <div className="flex flex-col" style={{ width: 280 }}>
              <div className="p-3 border-b border-[#1a2d4a] shrink-0">
                <FearGreed quotes={quotes} />
              </div>
              <div className="overflow-hidden" style={{ flex: '0 0 45%', borderBottom: '1px solid #1a2d4a' }}>
                <OptionsFlow />
              </div>
              <div className="flex-1 overflow-hidden">
                <RiskCalculator />
              </div>
            </div>
          </div>
        )}

        {/* Scanner */}
        {activeTab === 'scanner' && (
          <div className="flex flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 border-r border-[#1a2d4a] overflow-hidden">
              <PreMarketScanner />
            </div>
            <div className="flex flex-col" style={{ width: 280 }}>
              <div className="overflow-hidden" style={{ flex: '0 0 50%', borderBottom: '1px solid #1a2d4a' }}>
                <OptionsFlow />
              </div>
              <div className="flex-1 overflow-hidden">
                <FearGreed quotes={quotes} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'trade' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TradingWorkspace /></div>
        )}

        {activeTab === 'analyzer' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TradeAnalyzer /></div>
        )}

        {activeTab === 'arena' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TournamentLobby /></div>
        )}

        {/* Journal */}
        {activeTab === 'journal' && (
          <div className="flex-1 min-h-0 overflow-hidden">
            <TradeJournal />
          </div>
        )}

        {activeTab === 'community' && (
          <div className="flex-1 min-h-0 overflow-hidden"><CommunityHub /></div>
        )}
        {activeTab === 'traderoom' && (
          <div className="flex-1 min-h-0 overflow-hidden"><TradeRoom /></div>
        )}
        {activeTab === 'ai' && (
          <div className="yn-ai-panel flex-1 min-h-0 overflow-hidden flex">
            {/* Top 10 Stocks */}
            <div className="flex flex-col border-r border-[#1a2d4a] overflow-hidden" style={{ width: '38%', minWidth: 320 }}>
              <TopStocksWidget />
            </div>
            {/* AI Newspaper */}
            <div className="flex-1 overflow-y-auto bg-[#040c14]" style={{ background: 'linear-gradient(180deg, #071220 0%, #040c14 100%)' }}>
              <AINewspaper />
            </div>
          </div>
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
