'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, TrendingUp, TrendingDown, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface Flow {
  id: string
  ticker: string
  type: 'call' | 'put'
  strike: number
  expiry: string
  premium: number
  sentiment: 'bullish' | 'bearish' | 'neutral'
  size: 'whale' | 'large' | 'medium'
  desc: string
  time: Date
}

const SEED_FLOWS: Flow[] = [
  { id: '1', ticker: 'NVDA', type: 'call', strike: 900, expiry: 'May 16', premium: 4.2, sentiment: 'bullish', size: 'whale', desc: 'Sweep — 2,400 contracts @ $17.50 ask, OTM', time: new Date(Date.now() - 120_000) },
  { id: '2', ticker: 'SPY',  type: 'put',  strike: 505, expiry: 'May 9',  premium: 2.8, sentiment: 'bearish', size: 'whale', desc: 'Block — 5,000 contracts, unusual volume', time: new Date(Date.now() - 240_000) },
  { id: '3', ticker: 'AAPL', type: 'call', strike: 195, expiry: 'Jul 18', premium: 1.9, sentiment: 'bullish', size: 'large', desc: 'Golden sweep — repeat buyer, 3rd time this week', time: new Date(Date.now() - 480_000) },
  { id: '4', ticker: 'TSLA', type: 'put',  strike: 240, expiry: 'May 23', premium: 3.1, sentiment: 'bearish', size: 'large', desc: 'Sweep — 1,800 contracts ITM, aggressive', time: new Date(Date.now() - 720_000) },
  { id: '5', ticker: 'META', type: 'call', strike: 500, expiry: 'Jun 20', premium: 5.6, sentiment: 'bullish', size: 'whale', desc: 'Block — $5.6M premium, rolling up', time: new Date(Date.now() - 900_000) },
]

const TEMPLATES = [
  (s: string, p: number) => `SWEEP — ${Math.floor(Math.random() * 2000 + 500)} contracts @ $${p.toFixed(2)} ask`,
  () => `BLOCK — ${Math.floor(Math.random() * 5000 + 1000)} contracts, dark pool print`,
  () => `Golden sweep — ${Math.floor(Math.random() * 3) + 2}nd consecutive buy today`,
  (s: string, p: number) => `Aggressive ${s} — ITM strike, $${(p * 100).toFixed(0)}K premium`,
  () => `Unusual activity — Vol/OI ratio ${(Math.random() * 10 + 5).toFixed(1)}x above avg`,
]
const TICKERS = ['NVDA','AAPL','TSLA','META','MSFT','GOOGL','AMZN','AMD','SPY','QQQ']
const EXPIRIES = ['May 9','May 16','May 23','Jun 20','Jul 18','Sep 19']

function randomFlow(): Flow {
  const type = Math.random() > 0.5 ? 'call' : 'put'
  const ticker = TICKERS[Math.floor(Math.random() * TICKERS.length)]
  const premium = +(Math.random() * 8 + 0.5).toFixed(1)
  const tmpl = TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]
  return {
    id: crypto.randomUUID(),
    ticker,
    type,
    strike: Math.round(Math.random() * 50 + 150),
    expiry: EXPIRIES[Math.floor(Math.random() * EXPIRIES.length)],
    premium,
    sentiment: type === 'call' ? 'bullish' : 'bearish',
    size: Math.random() > 0.7 ? 'whale' : Math.random() > 0.4 ? 'large' : 'medium',
    desc: tmpl(type, premium),
    time: new Date(),
  }
}

const SIZE_STYLE = {
  whale:  { label: '🐋 WHALE', color: '#ffa502' },
  large:  { label: '🦈 LARGE', color: '#1e90ff' },
  medium: { label: '📊 BLOCK', color: '#7f93b5' },
}

export default function OptionsFlow() {
  const [flows, setFlows] = useState<Flow[]>(SEED_FLOWS)

  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.4) {
        setFlows(prev => [randomFlow(), ...prev.slice(0, 29)])
      }
    }, 4_000 + Math.random() * 8_000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <Zap size={11} className="text-[#ffa502]" />
          <span className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-widest">Options Flow</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4757] animate-pulse ml-1" />
        </div>
        <span className="text-[9px] text-[#4a5e7a]">Real-time unusual activity</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {flows.map(f => {
          const size = SIZE_STYLE[f.size]
          const isCall = f.type === 'call'
          return (
            <div key={f.id} className="flex items-start gap-2 px-3 py-2 border-b border-[#1a2d4a]/50 hover:bg-[#071220] transition-colors">
              <div className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center ${isCall ? 'bg-[#00d4aa]/15' : 'bg-[#ff4757]/15'}`}>
                {isCall ? <TrendingUp size={10} className="text-up" /> : <TrendingDown size={10} className="text-down" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-[#cdd6f4]">{f.ticker}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isCall ? 'bg-[#00d4aa]/15 text-[#00d4aa]' : 'bg-[#ff4757]/15 text-[#ff4757]'}`}>
                    {f.type.toUpperCase()} ${f.strike} {f.expiry}
                  </span>
                  <span className="text-[9px] font-bold" style={{ color: size.color }}>{size.label}</span>
                  <span className="text-[9px] text-[#4a5e7a] mono ml-auto">{formatDistanceToNow(f.time, { addSuffix: true })}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px] text-[#4a5e7a]">{f.desc}</span>
                </div>
                <div className="text-[9px] font-bold mono mt-0.5" style={{ color: size.color }}>
                  ${f.premium}M premium
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
