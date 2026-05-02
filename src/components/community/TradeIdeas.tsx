'use client'

import { useState, useEffect, useCallback } from 'react'
import { ThumbsUp, TrendingUp, TrendingDown, Plus, X, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { SUPABASE_ENABLED } from '@/lib/supabase'

interface TradeIdea {
  id: string
  author: string
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
  outcome: 'win' | 'loss' | 'open'
  currentPnLPct?: number
  tags: string[]
}

// Seed ideas shown when Supabase has no data yet
const SEED_IDEAS: TradeIdea[] = [
  { id: 's1', author: 'QuantKing_NYC',  ticker: 'NVDA', side: 'long',  entry: 868.50, sl: 850.00, tp: 910.00, timeframe: '4H', thesis: 'NVDA breaking out of 860 consolidation on elevated volume. RSI recovering from oversold. AI demand tailwind. Target is the prior ATH at 910. Invalidated below 850.', postedAt: new Date(Date.now() - 3_600_000), upvotes: 47, userVoted: false, outcome: 'open', currentPnLPct: 1.2, tags: ['breakout','momentum','tech'] },
  { id: 's2', author: 'ThetaQueen',     ticker: 'SPY',  side: 'short', entry: 515.20, sl: 518.00, tp: 508.00, timeframe: '1D', thesis: 'SPY rejected hard from 516 resistance (3rd touch). VIX picking up, put/call ratio elevated. Fed minutes tomorrow. Short-term pullback to 508 gap fill.', postedAt: new Date(Date.now() - 7_200_000), upvotes: 31, userVoted: false, outcome: 'open', currentPnLPct: 0.4, tags: ['macro','bearish','gap-fill'] },
  { id: 's3', author: 'ForexFred',      ticker: 'EUR/USD', side: 'long', entry: 1.0838, sl: 1.0810, tp: 1.0900, timeframe: '1H', thesis: 'EUR/USD support at 1.0835 daily S/R. ECB tone slightly hawkish. DXY showing weakness. Clean 2.2:1 R:R.', postedAt: new Date(Date.now() - 10_800_000), upvotes: 22, userVoted: false, outcome: 'win', currentPnLPct: 5.8, tags: ['forex','macro','support'] },
]

function IdeaCard({ idea, onVote }: { idea: TradeIdea; onVote: (id: string, currentlyVoted: boolean) => void }) {
  const rr = (Math.abs(idea.tp - idea.entry) / Math.abs(idea.entry - idea.sl)).toFixed(2)
  const isLong = idea.side === 'long'
  const outcomeColor = idea.outcome === 'win' ? '#00d4aa' : idea.outcome === 'loss' ? '#ff4757' : '#ffa502'

  const highlightTickers = (text: string) =>
    text.split(/(\$[A-Z/]+)/g).map((p, i) =>
      /^\$[A-Z/]+$/.test(p) ? <span key={i} className="text-[#00d4aa] font-semibold">{p}</span> : p
    )

  return (
    <div className="border border-[#1a2d4a] rounded-lg bg-[#071220] hover:border-[#1e3a5f] transition-colors mb-3">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a]">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold bg-[#1e90ff]/20 text-[#1e90ff]">
            {idea.author.slice(0,2).toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-[#cdd6f4]">{idea.author}</span>
          <span className="text-[9px] text-[#4a5e7a]">{formatDistanceToNow(idea.postedAt, { addSuffix: true })}</span>
        </div>
        {idea.outcome !== 'open' ? (
          <div className="flex items-center gap-1 text-[10px] font-bold" style={{ color: outcomeColor }}>
            {idea.outcome === 'win' ? <CheckCircle size={11} /> : <XCircle size={11} />}
            {idea.outcome.toUpperCase()} {Math.abs(idea.currentPnLPct ?? 0).toFixed(1)}%
          </div>
        ) : idea.currentPnLPct !== undefined ? (
          <span className={`mono text-[10px] font-bold ${(idea.currentPnLPct) >= 0 ? 'text-up' : 'text-down'}`}>
            {idea.currentPnLPct >= 0 ? '+' : ''}{idea.currentPnLPct.toFixed(2)}%
          </span>
        ) : null}
      </div>

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
          {[['Entry', idea.entry, '#cdd6f4'],['Stop Loss', idea.sl, '#ff4757'],['Take Profit', idea.tp, '#00d4aa']].map(([l,v,c]) => (
            <div key={l as string} className="bg-[#040c14] rounded px-2 py-1.5 text-center">
              <div className="text-[9px] text-[#4a5e7a]">{l}</div>
              <div className="mono text-[10px] font-bold" style={{ color: c as string }}>{(v as number).toFixed((v as number) < 10 ? 4 : 2)}</div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[#7f93b5] leading-relaxed mb-2">{highlightTickers(idea.thesis)}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          {idea.tags.map(t => <span key={t} className="text-[9px] bg-[#0f1f38] text-[#4a5e7a] px-1.5 py-0.5 rounded font-mono">#{t}</span>)}
        </div>
      </div>

      <div className="flex items-center px-3 py-1.5 border-t border-[#1a2d4a]">
        <button onClick={() => onVote(idea.id, idea.userVoted)}
          className={`flex items-center gap-1.5 text-[10px] font-semibold transition-colors ${idea.userVoted ? 'text-[#1e90ff]' : 'text-[#4a5e7a] hover:text-[#7f93b5]'}`}>
          <ThumbsUp size={11} fill={idea.userVoted ? '#1e90ff' : 'none'} />
          {idea.upvotes} upvotes
        </button>
        {!SUPABASE_ENABLED && <span className="ml-auto text-[8px] text-[#4a5e7a]">Votes not persisted — add Supabase to save</span>}
      </div>
    </div>
  )
}

export default function TradeIdeas() {
  const [ideas, setIdeas] = useState<TradeIdea[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isDemo, setIsDemo] = useState(!SUPABASE_ENABLED)
  const [form, setForm] = useState({ ticker: '', side: 'long', entry: '', sl: '', tp: '', thesis: '', timeframe: '1D', tags: '' })
  const [submitting, setSubmitting] = useState(false)

  const username = typeof window !== 'undefined' ? (localStorage.getItem('nexus_username') || 'Anonymous') : 'Anonymous'

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tradeideas')
      const json = await res.json()
      if (json.demo || !json.ideas?.length) {
        setIdeas(SEED_IDEAS)
        setIsDemo(true)
      } else {
        setIdeas(json.ideas.map((i: {
          id: string; username: string; ticker: string; side: string
          entry: number; sl: number; tp: number; timeframe: string
          thesis: string; created_at: string; upvotes: number; tags: string[]; outcome: string
        }) => ({
          id: i.id, author: i.username, ticker: i.ticker,
          side: i.side as 'long' | 'short', entry: i.entry, sl: i.sl, tp: i.tp,
          timeframe: i.timeframe, thesis: i.thesis,
          postedAt: new Date(i.created_at), upvotes: i.upvotes,
          userVoted: false, outcome: i.outcome as 'open' | 'win' | 'loss',
          tags: i.tags || [],
        })))
        setIsDemo(false)
      }
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  const vote = async (id: string, currentlyVoted: boolean) => {
    // Optimistic update
    setIdeas(prev => prev.map(i => i.id === id
      ? { ...i, upvotes: currentlyVoted ? i.upvotes - 1 : i.upvotes + 1, userVoted: !currentlyVoted }
      : i
    ))
    // Persist if Supabase
    if (SUPABASE_ENABLED && !isDemo) {
      await fetch('/api/tradeideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'vote', ideaId: id, increment: !currentlyVoted }),
      })
    }
  }

  const submit = async () => {
    if (!form.ticker || !form.entry || !form.sl || !form.tp || !form.thesis) return
    setSubmitting(true)
    try {
      const tags = form.tags.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
      if (SUPABASE_ENABLED) {
        const res = await fetch('/api/tradeideas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'post', ...form, username, tags }),
        })
        const json = await res.json()
        if (json.idea) {
          setIdeas(prev => [{
            id: json.idea.id, author: username, ticker: json.idea.ticker,
            side: json.idea.side, entry: json.idea.entry, sl: json.idea.sl,
            tp: json.idea.tp, timeframe: json.idea.timeframe, thesis: json.idea.thesis,
            postedAt: new Date(json.idea.created_at), upvotes: 0, userVoted: false,
            outcome: 'open', tags: json.idea.tags || [],
          }, ...prev])
        }
      } else {
        // Demo mode — add locally
        setIdeas(prev => [{
          id: crypto.randomUUID(), author: username, ticker: form.ticker.toUpperCase(),
          side: form.side as 'long' | 'short', entry: parseFloat(form.entry),
          sl: parseFloat(form.sl), tp: parseFloat(form.tp),
          timeframe: form.timeframe, thesis: form.thesis,
          postedAt: new Date(), upvotes: 0, userVoted: false,
          outcome: 'open', tags,
        }, ...prev])
      }
      setShowForm(false)
      setForm({ ticker: '', side: 'long', entry: '', sl: '', tp: '', thesis: '', timeframe: '1D', tags: '' })
    } finally { setSubmitting(false) }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-2">
          <TrendingUp size={12} className="text-[#00d4aa]" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-wider">Trade Ideas</span>
          {isDemo
            ? <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>
            : <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE — Supabase</span>}
          <button onClick={load} className="text-[#4a5e7a] hover:text-[#cdd6f4]">
            <RefreshCw size={10} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#00d4aa] hover:text-[#00ffcc]">
          {showForm ? <X size={11} /> : <Plus size={11} />} {showForm ? 'Cancel' : 'Post Idea'}
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
                    className={`flex-1 py-1.5 text-[10px] font-bold transition-colors ${form.side === s ? (s === 'long' ? 'bg-[#00d4aa] text-[#040c14]' : 'bg-[#ff4757] text-white') : 'text-[#4a5e7a] hover:bg-[#0f1f38]'}`}>
                    {s.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-2">
            {[['Entry','entry'],['Stop Loss','sl'],['Take Profit','tp']].map(([l,k]) => (
              <div key={k}>
                <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">{l}</label>
                <input type="number" value={form[k as keyof typeof form]} onChange={e => setForm(p => ({ ...p, [k]: e.target.value }))}
                  className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs mono text-[#cdd6f4] outline-none focus:border-[#1e90ff]" />
              </div>
            ))}
          </div>
          <div className="mb-2">
            <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1">Tags (comma-separated)</label>
            <input value={form.tags} onChange={e => setForm(p => ({ ...p, tags: e.target.value }))} placeholder="breakout, momentum, tech"
              className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs text-[#cdd6f4] outline-none focus:border-[#1e90ff]" />
          </div>
          <textarea value={form.thesis} onChange={e => setForm(p => ({ ...p, thesis: e.target.value }))} rows={3}
            placeholder="Explain your thesis — why this setup, what are you watching, when is it invalidated?"
            className="w-full bg-[#071220] border border-[#1a2d4a] rounded px-2 py-1.5 text-xs text-[#cdd6f4] outline-none resize-none focus:border-[#1e90ff] mb-2 block" />
          <button onClick={submit} disabled={submitting}
            className="w-full bg-[#1e90ff] hover:bg-[#3aa0ff] text-white font-bold text-xs py-2 rounded transition-colors disabled:opacity-50">
            {submitting ? 'Posting...' : SUPABASE_ENABLED ? 'Post to Community (saved to Supabase)' : 'Post Idea (demo only — add Supabase to persist)'}
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          ideas.sort((a, b) => b.upvotes - a.upvotes).map(idea => (
            <IdeaCard key={idea.id} idea={idea} onVote={vote} />
          ))
        )}
      </div>
    </div>
  )
}
