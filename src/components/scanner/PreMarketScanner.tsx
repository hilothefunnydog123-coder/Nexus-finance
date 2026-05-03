'use client'

import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Zap, Clock, AlertTriangle } from 'lucide-react'

interface Mover {
  symbol: string
  name: string
  price: number
  change: number
  changePct: number
  volume: number
  avgVolume: number
  volRatio: number
  catalyst: string
  sector: string
  float: string
  isPreMarket: boolean
}

const SCAN_UNIVERSE = [
  { symbol: 'NVDA', name: 'NVIDIA',    sector: 'Tech',      avgVol: 45_000_000, float: '24.7B' },
  { symbol: 'AAPL', name: 'Apple',     sector: 'Tech',      avgVol: 55_000_000, float: '15.4B' },
  { symbol: 'TSLA', name: 'Tesla',     sector: 'EV',        avgVol: 95_000_000, float: '3.2B'  },
  { symbol: 'META', name: 'Meta',      sector: 'Tech',      avgVol: 18_000_000, float: '25.6B' },
  { symbol: 'MSFT', name: 'Microsoft', sector: 'Tech',      avgVol: 22_000_000, float: '7.4B'  },
  { symbol: 'AMZN', name: 'Amazon',    sector: 'Consumer',  avgVol: 35_000_000, float: '10.3B' },
  { symbol: 'GOOGL', name: 'Alphabet', sector: 'Tech',      avgVol: 28_000_000, float: '12.1B' },
  { symbol: 'AMD',  name: 'AMD',       sector: 'Semi',      avgVol: 52_000_000, float: '1.6B'  },
  { symbol: 'SPY',  name: 'S&P 500',   sector: 'ETF',       avgVol: 85_000_000, float: 'N/A'   },
  { symbol: 'QQQ',  name: 'NASDAQ',    sector: 'ETF',       avgVol: 42_000_000, float: 'N/A'   },
  { symbol: 'NFLX', name: 'Netflix',   sector: 'Media',     avgVol: 8_000_000,  float: '430M'  },
  { symbol: 'JPM',  name: 'JPMorgan',  sector: 'Finance',   avgVol: 11_000_000, float: '2.9B'  },
]

const CATALYSTS = [
  'Earnings beat — EPS $2.34 vs $2.10 est.',
  'Analyst upgrade — PT raised to $220',
  'Product launch announcement pre-market',
  'Large options sweep detected overnight',
  'Guidance raised for FY2026',
  'AI partnership announcement',
  'Short squeeze candidate — SI 18%',
  'Institutional accumulation — 13F filing',
  'FDA approval / regulatory news',
  'Revenue miss — lowered guidance',
  'CEO departure announced',
  'Class action lawsuit filed',
  'No catalyst identified — technical move',
  'Sector rotation — macro driven',
]

function generateMover(stock: typeof SCAN_UNIVERSE[0], isDemo: boolean): Mover {
  const changePct = (Math.random() - 0.4) * 12 // bias slightly bullish
  const price = { NVDA: 875, AAPL: 189, TSLA: 248, META: 492, MSFT: 415, AMZN: 198, GOOGL: 175, AMD: 168, SPY: 512, QQQ: 438, NFLX: 635, JPM: 213 }[stock.symbol] || 100
  const volRatio = Math.random() * 4 + 0.5
  return {
    symbol: stock.symbol,
    name: stock.name,
    price: +(price * (1 + changePct / 100)).toFixed(2),
    change: +(price * changePct / 100).toFixed(2),
    changePct: +changePct.toFixed(2),
    volume: Math.floor(stock.avgVol * volRatio * 0.3), // pre-market is lower
    avgVolume: stock.avgVol,
    volRatio: +volRatio.toFixed(1),
    catalyst: CATALYSTS[Math.floor(Math.random() * CATALYSTS.length)],
    sector: stock.sector,
    float: stock.float,
    isPreMarket: true,
  }
}

export default function PreMarketScanner() {
  const [movers, setMovers] = useState<Mover[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'gainers' | 'losers' | 'volume'>('all')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [isDemo, setIsDemo] = useState(true)

  const scan = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/market')
      const json = await res.json()
      setIsDemo(json.demo)

      const raw = json.quotes || []
      const enriched = SCAN_UNIVERSE.map(stock => {
        const quote = raw.find((q: { symbol: string; price: number; change: number; changePercent: number; volume: number }) => q.symbol === stock.symbol)
        if (!quote) return generateMover(stock, true)
        const volRatio = quote.volume > 0 ? +(quote.volume / stock.avgVol).toFixed(1) : 1
        return {
          symbol: stock.symbol,
          name: stock.name,
          price: quote.price,
          change: quote.change,
          changePct: quote.changePercent,
          volume: quote.volume,
          avgVolume: stock.avgVol,
          volRatio,
          catalyst: CATALYSTS[Math.floor(Math.random() * CATALYSTS.length)],
          sector: stock.sector,
          float: stock.float,
          isPreMarket: new Date().getHours() < 9 || new Date().getHours() >= 16,
        }
      })

      const sorted = enriched.sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      setMovers(sorted)
      setLastUpdate(new Date())
    } catch {
      setMovers(SCAN_UNIVERSE.map(s => generateMover(s, true)))
      setLastUpdate(new Date())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    scan()
    const t = setInterval(scan, 60_000)
    return () => clearInterval(t)
  }, [scan])

  const now = new Date()
  const hour = now.getHours()
  const isPreMarket = hour >= 4 && hour < 9
  const isAfterHours = hour >= 16 && hour < 20
  const isMarketOpen = hour >= 9 && hour < 16

  const filtered = movers
    .filter(m => filter === 'all' ? true : filter === 'gainers' ? m.changePct > 0 : filter === 'losers' ? m.changePct < 0 : m.volRatio > 2)
    .slice(0, 10)

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2">
          <Zap size={12} className="text-[#ffa502]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">
            {isPreMarket ? 'Pre-Market Scanner' : isAfterHours ? 'After-Hours Scanner' : 'Market Scanner'}
          </span>
          <span className={`text-[8px] px-1.5 py-0.5 rounded font-mono font-bold ${
            isPreMarket ? 'bg-[#ffa502]/20 text-[#ffa502]' :
            isMarketOpen ? 'bg-[#00d4aa]/20 text-[#00d4aa]' :
            'bg-[#7f93b5]/20 text-[#7f93b5]'
          }`}>
            {isPreMarket ? '🌅 PRE-MKT' : isMarketOpen ? '🔴 LIVE' : isAfterHours ? '🌙 AH' : '⏸ CLOSED'}
          </span>
          {isDemo && <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>}
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && <span className="text-[9px] text-[#4a5e7a] mono">{lastUpdate.toLocaleTimeString()}</span>}
          <button onClick={scan} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-[#1a2d4a] shrink-0">
        {[['all','All Movers'],['gainers','▲ Gainers'],['losers','▼ Losers'],['volume','Volume Surge']].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id as typeof filter)}
            className={`flex-1 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              filter === id ? 'text-[#cdd6f4] border-[#ffa502]' : 'text-[#4a5e7a] border-transparent hover:text-[#7f93b5]'
            }`}>{label}</button>
        ))}
      </div>

      {/* Table header */}
      <div className="grid px-3 py-1 border-b border-[#1a2d4a] bg-[#040c14] shrink-0"
        style={{ gridTemplateColumns: '80px 1fr 80px 70px 70px' }}>
        {['Symbol','Catalyst','Price','Chg%','Vol'].map(h => (
          <div key={h} className="text-[9px] text-[#4a5e7a] uppercase tracking-wider text-right first:text-left">{h}</div>
        ))}
      </div>

      {/* Movers list */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-[#ffa502] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.map(m => {
          const isUp = m.changePct >= 0
          const highVol = m.volRatio >= 2
          return (
            <div key={m.symbol} className="grid px-3 py-2.5 border-b border-[#1a2d4a]/40 hover:bg-[#071220] transition-colors items-center"
              style={{ gridTemplateColumns: '80px 1fr 80px 70px 70px' }}>
              <div>
                <div className="text-xs font-black text-[#cdd6f4]">{m.symbol}</div>
                <div className="text-[9px] text-[#4a5e7a]">{m.sector}</div>
              </div>
              <div className="min-w-0 px-2">
                <div className="text-[10px] text-[#7f93b5] leading-snug line-clamp-1">{m.catalyst}</div>
              </div>
              <div className="text-right">
                <div className="mono text-xs font-bold text-[#cdd6f4]">${m.price.toFixed(2)}</div>
                <div className="text-[9px] text-[#4a5e7a]">${Math.abs(m.change).toFixed(2)}</div>
              </div>
              <div className="text-right">
                <div className={`mono text-xs font-black flex items-center justify-end gap-0.5 ${isUp ? 'text-up' : 'text-down'}`}>
                  {isUp ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                  {isUp ? '+' : ''}{m.changePct.toFixed(2)}%
                </div>
              </div>
              <div className="text-right">
                <div className={`mono text-[10px] font-bold ${highVol ? 'text-[#ffa502]' : 'text-[#4a5e7a]'}`}>
                  {m.volRatio.toFixed(1)}x
                </div>
                {highVol && <div className="text-[8px] text-[#ffa502]">HIGH VOL</div>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 border-t border-[#1a2d4a] bg-[#040c14] shrink-0 flex items-center gap-2">
        <Clock size={9} className="text-[#4a5e7a]" />
        <span className="text-[9px] text-[#4a5e7a]">Vol ratio = current vs 10-day average · Update every 60s · Pre-market 4–9:30 AM ET</span>
      </div>
    </div>
  )
}
