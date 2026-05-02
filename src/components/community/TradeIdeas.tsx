'use client'

import { useState } from 'react'
import { ThumbsUp, TrendingUp, TrendingDown, Plus, X, CheckCircle, XCircle } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface TradeIdea {
  id: string
  author: string
  initials: string
  color: string
  ticker: string
  side: 'long' | 'short'
  entry: number
  sl: number
  tp: number
  timeframe: string
  thesis: string
  postedAt: Date
  upvotes: number
  userVoted: boolean
  outcome?: 'win' | 'loss' | 'open'
  currentPnLPct?: number
  tags: string[]
}

const SEED_IDEAS: TradeIdea[] = [
  {
    id: '1', author: 'QuantKing_NYC', initials: 'QK', color: '#ffa502',
    ticker: 'NVDA', side: 'long', entry: 868.50, sl: 850.00, tp: 910.00,
    timeframe: '4H', thesis: 'NVDA breaking out of the 860 consolidation zone on elevated volume. RSI recovering from oversold. AI demand tailwind. Target is the previous ATH at 910. Invalidated below 850.',
    postedAt: new Date(Date.now() - 3_600_000), upvotes: 47, userVoted: false,
    outcome: 'open', currentPnLPct: 1.2, tags: ['breakout', 'momentum', 'tech'],
  },
  {
    id: '2', author: 'ThetaQueen', initials: 'TQ', color: '#a855f7',
    ticker: 'SPY', side: 'short', entry: 515.20, sl: 518.00, tp: 508.00,
    timeframe: '1D', thesis: 'SPY rejected hard from 516 resistance (3rd time). VIX picking up, put/call ratio elevated. Fed minutes tomorrow could be hawkish. Short-term pullback to 508 gap fill looks probable.',
    postedAt: new Date(Date.now() - 7_200_000), upvotes: 31, userVoted: true,
    outcome: 'open', currentPnLPct: 0.4, tags: ['macro', 'bearish', 'gap-fill'],
  },
  {
    id: '3', author: 'ForexFred', initials: 'FF', color: '#00d4aa',
    ticker: 'EUR/USD', side: 'long', entry: 1.0838, sl: 1.0810, tp: 1.0900,
    timeframe: '1H', thesis: 'Euro finding support at 1.0835 daily S/R level. ECB tone slightly hawkish vs Fed expectations. DXY showing weakness on the daily. Clean 2.2:1 R:R setup here.',
    postedAt: new Date(Date.now() - 10_800_000), upvotes: 22, userVoted: false,
    outcome: 'win', currentPnLPct: 5.8, tags: ['forex', 'macro', 'support'],
  },
  {
    id: '4', author: 'ScalpGod_CHI', initials: 'SG', color: '#00d4aa',
    ticker: 'ES', side: 'long', entry: 5241.00, sl: 5230.00, tp: 5265.00,
    timeframe: '5M', thesis: 'ES reclaiming VWAP after the morning flush. Order flow turning green on the tape. Buyers stepping in at the 21 EMA. Quick scalp to 5265 with tight SL at 5230.',
    postedAt: new Date(Date.now() - 14_400_000), upvotes: 38, userVoted: false,
    outcome: 'win', currentPnLPct: 4.2, tags: ['futures', 'scalp', 'vwap'],
  },
  {
    id: '5', author: 'SwingKing_LA', initials: 'SK', color: '#a855f7',
    ticker: 'TSLA', side: 'short', entry: 251.80, sl: 258.00, tp: 235.00,
    timeframe: '1D', thesis: 'TSLA H&S pattern on the daily completing. Volume declining on the recent bounce. Fundamentals weak with delivery miss. Risk defined tightly above 258.',
    postedAt: new Date(Date.now() - 86_400_000), upvotes: 15, userVoted: false,
    outcome: 'loss', currentPnLPct: -2.1, tags: ['swing', 'bearish', 'pattern'],
  },
]

function IdeaCard({ idea, onVote }: { idea: TradeIdea; onVote: (id: string) => void }) {
  const rr = ((Math.abs(idea.tp - idea.entry) / Math.abs(idea.entry - idea.sl))).toFixed(2)
  const isLong = idea.side === 'long'
  const outcomeColor = idea.outcome === 'win' ? '#00d4aa' : idea.outcome === 'loss' ? '#ff4757' : '#ffa502'

  return (
    <div className="border border-[#1a2d4a] rounded bg-[#071220] hover:border-[#1e3a5f] transition-colors mb-3">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${idea.color}20`, color: idea.color }}>
            {idea.initials}
          </div>
          <div>
            <span className="text-xs font-semibold text-[#cdd6f4]">{idea.author}</span>
            <div className="text-[9px] text-[#4a5e7a]">{formatDistanceToNow(idea.postedAt, { addSuffix: true })}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {idea.outcome !== 'open' && (
            <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: outcomeColor }}>
              {idea.outcome === 'win' ? <CheckCircle size={11} /> : <XCircle size={11} />}
              {idea.outcome === 'win' ? 'WIN' : 'LOSS'} {Math.abs(idea.currentPnLPct ?? 0).toFixed(1)}%
            </div>
          )}
          {idea.outcome === 'open' && idea.currentPnLPct !== undefined && (
            <span className={`mono text-[10px] font-bold ${(idea.currentPnLPct ?? 0) >= 0 ? 'text-up' : 'text-down'}`}>
              {(idea.currentPnLPct ?? 0) >= 0 ? '+' : ''}{idea.currentPnLPct?.toFixed(2)}%
            </span>
          )}
        </div>
      </div>

      {/* Trade details */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-3 mb-2">
          <div className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold ${isLong ? 'bg-[#00d4aa]/15 text-[#00d4aa]' : 'bg-[#ff4757]/15 text-[#ff4757]'}`}>
            {isLong ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {idea.ticker} {isLong ? 'LONG' : 'SHORT'}
          </div>
          <span className="text-[10px] text-[#4a5e7a]">{idea.timeframe}</span>
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-[9px] text-[#4a5e7a]">R:R</span>
            <span className={`mono text-xs font-bold ${parseFloat(rr) >= 2 ? 'text-up' : parseFloat(rr) >= 1 ? 'text-[#ffa502]' : 'text-down'}`}>{rr}:1</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-2">
          {[
            { label: 'Entry', value: idea.entry, color: '#cdd6f4' },
            { label: 'Stop Loss', value: idea.sl, color: '#ff4757' },
            { label: 'Take Profit', value: idea.tp, color: '#00d4aa' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-[#040c14] rounded px-2 py-1.5 text-center">
              <div className="text-[9px] text-[#4a5e7a]">{label}</div>
              <div className="mono text-[10px] font-bold" style={{ color }}>{value.toFixed(value < 10 ? 4 : 2)}</div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-[#7f93b5] leading-relaxed mb-2">{idea.thesis}</p>

        <div className="flex items-center gap-1.5 flex-wrap">
          {idea.tags.map(tag => (
            <span key={tag} className="text-[9px] bg-[#0f1f38] text-[#4a5e7a] px-1.5 py-0.5 rounded font-mono">#{tag}</span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 px-3 py-1.5 border-t border-[#1a2d4a]">
        <button onClick={() => onVote(idea.id)}
          className={`flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${idea.userVoted ? 'text-[#1e90ff]' : 'text-[#4a5e7a] hover:text-[#7f93b5]'}`}>
          <ThumbsUp size={11} fill={idea.userVoted ? '#1e90ff' : 'none'} />
          {idea.upvotes}
        </button>
      </div>
    </div>
  )
}

export default function TradeIdeas() {
  const [ideas, setIdeas] = useState<TradeIdea[]>(SEED_IDEAS)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ ticker: '', side: 'long', entry: '', sl: '', tp: '', thesis: '', timeframe: '1D' })

  const vote = (id: string) => setIdeas(prev => prev.map(i =>
    i.id === id ? { ...i, upvotes: i.userVoted ? i.upvotes - 1 : i.upvotes + 1, userVoted: !i.userVoted } : i
  ))

  const submit = () => {
    if (!form.ticker || !form.entry || !form.sl || !form.tp || !form.thesis) return
    const newIdea: TradeIdea = {
      id: crypto.randomUUID(),
      author: localStorage.getItem('nexus_username') || 'You',
      initials: (localStorage.getItem('nexus_username') || 'YO').slice(0, 2).toUpperCase(),
      color: '#1e90ff',
      ticker: form.ticker.toUpperCase(),
      side: form.side as 'long' | 'short',
      entry: parseFloat(form.entry),
      sl: parseFloat(form.sl),
      tp: parseFloat(form.tp),
      timeframe: form.timeframe,
      thesis: form.thesis,
      postedAt: new Date(),
      upvotes: 0,
      userVoted: false,
      outcome: 'open',
      currentPnLPct: 0,
      tags: [],
    }
    setIdeas(prev => [newIdea, ...prev])
    setShowForm(false)
    setForm({ ticker: '', side: 'long', entry: '', sl: '', tp: '', thesis: '', timeframe: '1D' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <TrendingUp size={12} className="text-[#00d4aa]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Trade Ideas</span>
          <span className="text-[9px] bg-[#00d4aa]/20 text-[#00d4aa] px-1.5 rounded font-mono">{ideas.length} setups</span>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#00d4aa] hover:text-[#00ffcc] transition-colors">
          {showForm ? <X size={11} /> : <Plus size={11} />}
          {showForm ? 'Cancel' : 'Post Idea'}
        </button>
      </div>

      {showForm && (
        <div className="p-3 border-b border-[#1a2d4a] bg-[#040c14] shrink-0">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">Ticker</label>
              <input value={form.ticker} onChange={e => setForm(p => ({ ...p, ticker: e.target.value }))} placeholder="AAPL"
                className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none uppercase focus:border-[#1e90ff]" />
            </div>
            <div>
              <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">Direction</label>
              <div className="flex rounded border border-[#1a2d4a] overflow-hidden">
                {['long','short'].map(s => (
                  <button key={s} onClick={() => setForm(p => ({ ...p, side: s }))}
                    className={`flex-1 py-1.5 text-[10px] font-bold transition-colors ${form.side === s ? (s === 'long' ? 'bg-[#00d4aa] text-[#040c14]' : 'bg-[#ff4757] text-white') : 'text-[#4a5e7a]'}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[['Entry', 'entry'], ['Stop Loss', 'sl'], ['Take Profit', 'tp']].map(([label, key]) => (
              <div key={key}>
                <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">{label}</label>
                <input type="number" value={form[key as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                  className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none focus:border-[#1e90ff]" />
              </div>
            ))}
          </div>
          <textarea value={form.thesis} onChange={e => setForm(p => ({ ...p, thesis: e.target.value }))} rows={3}
            placeholder="Explain your thesis — why this setup, what are you watching, when is it invalidated?"
            className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs text-[#cdd6f4] outline-none resize-none focus:border-[#1e90ff] mb-2 block" />
          <button onClick={submit} className="w-full bg-[#1e90ff] hover:bg-[#3aa0ff] text-white font-bold text-xs py-2 rounded transition-colors">
            Post Trade Idea
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {ideas.sort((a, b) => b.upvotes - a.upvotes).map(idea => (
          <IdeaCard key={idea.id} idea={idea} onVote={vote} />
        ))}
      </div>
    </div>
  )
}
