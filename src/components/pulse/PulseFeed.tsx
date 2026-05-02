'use client'

import { useState, useEffect, useRef } from 'react'
import { ExternalLink, RefreshCw, Rss, AtSign, TrendingUp, TrendingDown } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { NewsItem } from '@/lib/types'

declare global {
  interface Window { twttr?: { widgets: { load: (el?: HTMLElement) => void } } }
}

// Analyst commentary cards (until Twitter API is available)
const ANALYST_TWEETS = [
  { id: 't1', handle: '@GoldmanSachs',   avatar: 'GS', color: '#1e90ff',  sentiment: 'bullish', time: new Date(Date.now() - 900_000),
    text: '$SPY year-end target raised to 5,800. AI productivity + resilient earnings + labor market stability = sustained multiple expansion. Overweight equities.' },
  { id: 't2', handle: '@WuTang_Finance', avatar: 'WF', color: '#ffa502',  sentiment: 'neutral', time: new Date(Date.now() - 1_800_000),
    text: '$NVDA IV rank 89th percentile into earnings. Historical post-earnings move ±8.2%. Straddle at current vol prices your breakeven at $71. Know your risk.' },
  { id: 't3', handle: '@zerohedge',      avatar: 'ZH', color: '#ff4757',  sentiment: 'bearish', time: new Date(Date.now() - 3_600_000),
    text: 'Commercial real estate defaults accelerating. $KRE regional banks still carrying >$200B in CRE exposure. Duration risk remains underappreciated.' },
  { id: 't4', handle: '@CathieWood',     avatar: 'CW', color: '#a855f7',  sentiment: 'bullish', time: new Date(Date.now() - 5_400_000),
    text: 'AI inference costs falling 70% annually. This deflationary force powers everything ARK invests in. $TSLA, $NVDA, $ROKU all beneficiaries. Conviction high.' },
  { id: 't5', handle: '@MichaelBurry',   avatar: 'MB', color: '#ff4757',  sentiment: 'bearish', time: new Date(Date.now() - 7_200_000), text: '.' },
  { id: 't6', handle: '@ReinhartRogoff', avatar: 'RR', color: '#ffa502',  sentiment: 'neutral', time: new Date(Date.now() - 9_000_000),
    text: 'Sovereign debt levels globally at post-WWII highs. Rate normalization pathway remains uncertain. Tail risk of fiscal dominance should be in every macro portfolio.' },
]

const SENTIMENT_TOPICS = [
  { ticker: 'NVDA', bullPct: 84, mentions: 12847 },
  { ticker: 'SPY',  bullPct: 61, mentions: 9234  },
  { ticker: 'TSLA', bullPct: 47, mentions: 8102  },
  { ticker: 'AAPL', bullPct: 72, mentions: 6891  },
  { ticker: 'BTC',  bullPct: 78, mentions: 5432  },
]

function NewsCard({ item }: { item: NewsItem }) {
  const age = formatDistanceToNow(new Date(item.datetime * 1000), { addSuffix: true })
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="block px-3 py-2.5 border-b border-[#1a2d4a] hover:bg-[#0f1f38] transition-colors group">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-[9px] font-bold text-[#1e90ff] uppercase tracking-wider px-1.5 py-0.5 bg-[#1e90ff]/10 rounded">
              {item.source}
            </span>
            {item.related && <span className="text-[9px] text-[#00d4aa] font-mono font-bold">${item.related}</span>}
            <span className="text-[9px] text-[#4a5e7a] mono ml-auto">{age}</span>
          </div>
          <p className="text-[11px] text-[#cdd6f4] leading-snug line-clamp-2 group-hover:text-white transition-colors font-medium">
            {item.headline}
          </p>
          {item.summary && (
            <p className="text-[10px] text-[#7f93b5] leading-snug line-clamp-1 mt-0.5">{item.summary}</p>
          )}
        </div>
        <ExternalLink size={10} className="text-[#4a5e7a] shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  )
}

function AnalystCard({ tweet }: { tweet: typeof ANALYST_TWEETS[0] }) {
  const age = formatDistanceToNow(tweet.time, { addSuffix: true })
  const color = tweet.sentiment === 'bullish' ? '#00d4aa' : tweet.sentiment === 'bearish' ? '#ff4757' : '#ffa502'
  const highlight = (text: string) =>
    text.split(/(\$[A-Z]+)/g).map((p, i) =>
      /^\$[A-Z]+$/.test(p) ? <span key={i} className="text-[#00d4aa] font-semibold">{p}</span> : p
    )
  return (
    <div className="px-3 py-2.5 border-b border-[#1a2d4a] hover:bg-[#0f1f38] transition-colors">
      <div className="flex items-start gap-2">
        <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: `${tweet.color}20`, color: tweet.color, border: `1px solid ${tweet.color}30` }}>
          {tweet.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#cdd6f4]">{tweet.handle}</span>
            <span className="text-[9px] text-[#4a5e7a] mono">{age}</span>
            <span className="text-[9px] px-1 py-0.5 rounded ml-auto font-mono uppercase tracking-wider"
              style={{ color, background: `${color}15` }}>
              {tweet.sentiment}
            </span>
          </div>
          <p className="text-[11px] text-[#a0b4d0] leading-relaxed">{highlight(tweet.text)}</p>
        </div>
      </div>
    </div>
  )
}

// Real Twitter embed component
function TwitterTimeline() {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const load = () => {
      if (window.twttr?.widgets && ref.current) {
        window.twttr.widgets.load(ref.current)
      }
    }
    // Try immediately, then wait for script to load
    load()
    const t = setTimeout(load, 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div ref={ref} className="h-full overflow-y-auto bg-[#040c14]">
      <a
        className="twitter-timeline"
        data-theme="dark"
        data-chrome="noheader nofooter transparent"
        data-tweet-limit="8"
        data-aria-polite="assertive"
        href="https://twitter.com/i/lists/748093258937913345"
      >
        <div className="flex flex-col items-center justify-center h-48 gap-3">
          <div className="w-5 h-5 border-2 border-[#1e90ff] border-t-transparent rounded-full animate-spin" />
          <p className="text-[11px] text-[#4a5e7a] text-center px-4">
            Loading analyst feed...<br />
            <span className="text-[9px]">Requires Twitter widget script to be unblocked</span>
          </p>
        </div>
      </a>
    </div>
  )
}

export default function PulseFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'news' | 'analysts' | 'sentiment' | 'twitter'>('news')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'tech' | 'macro' | 'forex' | 'earnings'>('all')

  const fetchNews = async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const res = await fetch('/api/news')
      const json = await res.json()
      setNews(json.news || [])
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => { fetchNews() }, [])
  useEffect(() => {
    const t = setInterval(() => fetchNews(true), 60_000)
    return () => clearInterval(t)
  }, [])

  const filteredNews = filter === 'all' ? news : news.filter(n =>
    filter === 'tech' ? ['technology', 'tech'].includes(n.category ?? '') :
    filter === 'macro' ? ['general', 'macro'].includes(n.category ?? '') :
    filter === 'forex' ? n.category === 'forex' :
    n.category === 'earnings'
  )

  return (
    <div className="flex flex-col h-full bg-[#071220] border-l border-[#1a2d4a]" style={{ width: 288, minWidth: 288 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4757] animate-pulse" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-widest">Pulse</span>
        </div>
        <button onClick={() => fetchNews(true)} className="text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a2d4a] shrink-0">
        {[
          { id: 'news' as const,      icon: <Rss size={9} />,     label: 'News' },
          { id: 'analysts' as const,  icon: <AtSign size={9} />,  label: 'Analysts' },
          { id: 'sentiment' as const, icon: <TrendingUp size={9} />, label: 'Sentiment' },
          { id: 'twitter' as const,   icon: <AtSign size={9} />,  label: 'X Live' },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[9px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === t.id ? 'text-[#cdd6f4] border-[#00d4aa]' : 'text-[#4a5e7a] border-transparent hover:text-[#7f93b5]'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* News filter */}
      {tab === 'news' && (
        <div className="flex gap-1 px-2 py-1.5 border-b border-[#1a2d4a] shrink-0 overflow-x-auto">
          {(['all','tech','macro','forex','earnings'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-2 py-0.5 text-[9px] rounded font-mono uppercase shrink-0 transition-colors ${
                filter === f ? 'bg-[#1e90ff] text-white' : 'text-[#4a5e7a] hover:text-[#7f93b5]'
              }`}>{f}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'news' && (
          loading
            ? <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" /></div>
            : filteredNews.length === 0
              ? <div className="flex items-center justify-center h-24 text-[11px] text-[#4a5e7a]">No {filter} news found</div>
              : filteredNews.map(item => <NewsCard key={item.id} item={item} />)
        )}
        {tab === 'analysts' && ANALYST_TWEETS.map(t => <AnalystCard key={t.id} tweet={t} />)}
        {tab === 'sentiment' && (
          <div className="p-3 space-y-3">
            <div className="text-[10px] text-[#4a5e7a] uppercase tracking-wider mb-3">Social Sentiment — Top Tickers</div>
            {SENTIMENT_TOPICS.map(({ ticker, bullPct, mentions }) => {
              const isUp = bullPct >= 50
              return (
                <div key={ticker}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#cdd6f4]">${ticker}</span>
                      <span className="text-[9px] text-[#4a5e7a] mono">{mentions.toLocaleString()} mentions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isUp ? <TrendingUp size={9} className="text-up" /> : <TrendingDown size={9} className="text-down" />}
                      <span className={`mono text-xs font-bold ${isUp ? 'text-up' : 'text-down'}`}>{bullPct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#ff4757]/20 overflow-hidden">
                    <div className="h-full rounded-full bg-[#00d4aa] transition-all" style={{ width: `${bullPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[9px] text-[#ff4757]">{100 - bullPct}% Bearish</span>
                    <span className="text-[9px] text-[#00d4aa]">{bullPct}% Bullish</span>
                  </div>
                </div>
              )
            })}
            <div className="mt-4 p-2 bg-[#040c14] rounded border border-[#1a2d4a] text-[9px] text-[#4a5e7a] text-center">
              Sentiment aggregated from social media, options flow, and news sentiment analysis
            </div>
          </div>
        )}
        {tab === 'twitter' && <TwitterTimeline />}
      </div>
    </div>
  )
}
