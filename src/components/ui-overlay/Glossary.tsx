'use client'

import { useState, useEffect } from 'react'
import { X, BookOpen, Search } from 'lucide-react'

const TERMS = [
  { term: 'Pip',           def: 'The smallest price move in a currency pair. EUR/USD moving from 1.0842 to 1.0843 is 1 pip. For USD/JPY, 1 pip = 0.01.' },
  { term: 'Leverage',      def: 'Borrowed capital to increase position size. 10:1 leverage means $1,000 controls $10,000. Amplifies both gains AND losses.' },
  { term: 'Margin',        def: 'The deposit required to open a leveraged trade. If leverage is 10:1 and you buy $10,000, your margin is $1,000.' },
  { term: 'Long',          def: 'Buying an asset expecting it to rise in price. "Going long AAPL" means you bought Apple stock and profit if the price goes up.' },
  { term: 'Short',         def: 'Selling an asset you don\'t own, expecting to buy it back cheaper later. You profit when the price falls.' },
  { term: 'R:R / Risk-Reward', def: 'The ratio of potential profit to potential loss. 2:1 R:R means you risk $1 to potentially make $2. Professionals target 2:1 or higher.' },
  { term: 'Stop Loss (SL)', def: 'A price level that automatically closes your trade to limit losses. If you buy at $100 with SL at $95, your max loss is $5 per share.' },
  { term: 'Take Profit (TP)', def: 'A price level that automatically closes your trade to lock in gains. If you buy at $100 with TP at $110, you exit with $10 profit per share.' },
  { term: 'Spread',        def: 'The difference between the buy price (ask) and sell price (bid). This is the broker\'s fee. EUR/USD spread of 0.2 pips means a tiny cost per trade.' },
  { term: 'Bid / Ask',     def: 'Bid is what buyers pay. Ask is what sellers receive. You buy at the Ask, sell at the Bid. The gap between them is the spread.' },
  { term: 'Lot',           def: 'A standardized trading unit in forex. 1 standard lot = 100,000 units of currency. A 0.1 lot = 10,000 units (called a mini lot).' },
  { term: 'Drawdown',      def: 'The decline from a peak account value to a trough. If your account hits $110K then falls to $100K, that\'s a 9% drawdown.' },
  { term: 'P&L',           def: 'Profit and Loss. Your current gains or losses on open positions, or the total profit/loss closed.' },
  { term: 'Equity',        def: 'Your total account value including unrealized (open position) gains/losses. Equity = Cash + Floating P&L.' },
  { term: 'Volatility',    def: 'How much a price moves up or down over a period. High volatility = large swings. Low volatility = small, stable moves.' },
  { term: 'Bull / Bear',   def: 'Bull market = prices rising (optimism). Bear market = prices falling (pessimism). Bullish = expecting prices to rise.' },
  { term: 'Candlestick',   def: 'A chart bar showing Open, High, Low, and Close for a time period. Green = price rose. Red = price fell.' },
  { term: 'OHLC',          def: 'Open, High, Low, Close — the four key prices for any time period on a chart.' },
  { term: 'RSI',           def: 'Relative Strength Index. A 0-100 indicator. Above 70 = overbought (may reverse down). Below 30 = oversold (may reverse up).' },
  { term: 'Moving Average', def: 'The average price over a set period. The 20 EMA (Exponential Moving Average) is the average of the last 20 candles, weighted towards recent prices.' },
  { term: 'Support',       def: 'A price level where buyers have historically stepped in, preventing further declines. Like a floor.' },
  { term: 'Resistance',    def: 'A price level where sellers have historically pushed price down. Like a ceiling. Breakouts above resistance are often bullish.' },
  { term: 'Futures',       def: 'A contract to buy/sell an asset at a set price on a future date. ES futures track the S&P 500. Traded nearly 24/7.' },
  { term: 'Options',       def: 'A contract giving the right (not obligation) to buy/sell an asset at a specific price. Call = right to buy. Put = right to sell.' },
  { term: 'ETF',           def: 'Exchange-Traded Fund. A basket of stocks you can trade like a single stock. SPY tracks the S&P 500\'s 500 companies.' },
  { term: 'Market Cap',    def: 'A company\'s total value = share price × total shares. Apple at $190/share with 15B shares = $2.85 trillion market cap.' },
  { term: 'P/E Ratio',     def: 'Price-to-Earnings. How much investors pay per dollar of earnings. P/E of 25 means you pay $25 for every $1 of annual profit.' },
  { term: 'Paper Trading', def: 'Simulated trading with fake money. Lets you practice without risking real funds. YN Finance is a paper trading platform.' },
  { term: 'Prop Firm',     def: 'Proprietary trading firm. A company that funds traders with its own capital in exchange for a profit split (e.g. 80% to you, 20% to them).' },
  { term: 'VWAP',          def: 'Volume-Weighted Average Price. The average price weighted by volume. Institutions use this as a benchmark. Price above VWAP = bullish.' },
]

export default function Glossary() {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === 'g' && e.altKey) setOpen(v => !v)
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const filtered = TERMS.filter(t =>
    t.term.toLowerCase().includes(search.toLowerCase()) ||
    t.def.toLowerCase().includes(search.toLowerCase())
  )

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="fixed bottom-20 left-4 z-50 flex items-center gap-1.5 px-3 py-2 bg-[#071220] border border-[#1a2d4a] rounded-lg text-[10px] text-[#4a5e7a] hover:text-[#7f93b5] hover:border-[#1e3a5f] transition-colors shadow-lg"
      title="Trading Glossary (Alt+G)">
      <BookOpen size={11} /> Glossary
    </button>
  )

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[520px] max-h-[80vh] bg-[#071220] border border-[#1e3a5f] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen size={13} className="text-[#00d4aa]" />
            <span className="text-sm font-bold text-[#cdd6f4]">Trading Glossary</span>
            <span className="text-[9px] text-[#4a5e7a]">{TERMS.length} terms defined</span>
          </div>
          <button onClick={() => setOpen(false)} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={14} /></button>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a2d4a] shrink-0">
          <Search size={12} className="text-[#4a5e7a]" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search terms..."
            className="flex-1 bg-transparent text-sm text-[#cdd6f4] outline-none placeholder-[#4a5e7a]" />
        </div>
        <div className="overflow-y-auto flex-1">
          {filtered.map(({ term, def }) => (
            <div key={term} className="px-4 py-3 border-b border-[#1a2d4a]/50 hover:bg-[#0a1628]">
              <div className="text-xs font-bold text-[#00d4aa] mb-1">{term}</div>
              <div className="text-[11px] text-[#7f93b5] leading-relaxed">{def}</div>
            </div>
          ))}
        </div>
        <div className="px-4 py-2 border-t border-[#1a2d4a] text-[9px] text-[#4a5e7a] text-center shrink-0">
          Press <kbd className="px-1 border border-[#1a2d4a] rounded font-mono">Alt+G</kbd> to toggle · <kbd className="px-1 border border-[#1a2d4a] rounded font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  )
}
