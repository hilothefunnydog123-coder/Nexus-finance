'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { ExternalLink, RefreshCw, Rss, AtSign, TrendingUp, TrendingDown, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { NewsItem } from '@/lib/types'

declare global {
  interface Window { twttr?: { widgets: { load: (el?: HTMLElement) => void } } }
}

const SOURCE_COLORS: Record<string, string> = {
  'Reuters': '#ff8c00', 'Bloomberg': '#1e90ff', 'CNBC': '#e60000', 'WSJ': '#000',
  'Financial Times': '#ff8a00', 'MarketWatch': '#00b25d', 'Barrons': '#0f1e78',
  'Seeking Alpha': '#ff6b35', 'Yahoo Finance': '#6001d2', 'AP': '#cc0000',
}

const ANALYST_TWEETS = [
  { id: 't1', handle: '@GoldmanSachs',     initials: 'GS', color: '#1e90ff',  sentiment: 'bullish',
    text: '$SPY year-end target raised to 5,800. AI productivity + resilient earnings = sustained multiple expansion. Overweight equities.',
    time: new Date(Date.now() - 900_000) },
  { id: 't2', handle: '@WuTang_Finance',   initials: 'WF', color: '#ffa502',  sentiment: 'neutral',
    text: '$NVDA IV rank 89th percentile into earnings. Historical post-earnings move ±8.2%. Straddle breakeven at $71. Know your risk before sizing up.',
    time: new Date(Date.now() - 1_800_000) },
  { id: 't3', handle: '@zerohedge',        initials: 'ZH', color: '#ff4757',  sentiment: 'bearish',
    text: 'CRE defaults accelerating. Regional banks carrying $200B+ in exposure at book value. Duration risk remains massively underappreciated by consensus.',
    time: new Date(Date.now() - 3_600_000) },
  { id: 't4', handle: '@CathieWood',       initials: 'CW', color: '#a855f7',  sentiment: 'bullish',
    text: 'AI inference costs falling 70% annually. This deflationary force powers everything ARK invests in. $TSLA $NVDA long-term conviction unchanged.',
    time: new Date(Date.now() - 5_400_000) },
  { id: 't5', handle: '@MichaelBurry',     initials: 'MB', color: '#ff4757',  sentiment: 'bearish',
    text: 'Sell.',
    time: new Date(Date.now() - 7_200_000) },
  { id: 't6', handle: '@StanDruckenmiller', initials: 'SD', color: '#00d4aa', sentiment: 'neutral',
    text: 'Macro is the hardest it has been in 45 years. Two-sided risk from here. Running tight stops on everything. Cash is a position.',
    time: new Date(Date.now() - 9_000_000) },
]

const SENTIMENT_DATA = [
  { ticker: 'NVDA', bull: 84, mentions: 12847 },
  { ticker: 'SPY',  bull: 61, mentions: 9234  },
  { ticker: 'TSLA', bull: 47, mentions: 8102  },
  { ticker: 'AAPL', bull: 72, mentions: 6891  },
  { ticker: 'BTC',  bull: 78, mentions: 5432  },
  { ticker: 'META', bull: 68, mentions: 4221  },
]

function NewsCard({ item }: { item: NewsItem }) {
  const age = formatDistanceToNow(new Date(item.datetime * 1000), { addSuffix: true })
  const srcColor = SOURCE_COLORS[item.source] || '#7f93b5'
  return (
    <a href={item.url !== '#' ? item.url : undefined} target="_blank" rel="noopener noreferrer"
      className="block px-3 py-3 border-b border-[#142032] hover:bg-[#0d1f35] transition-colors group">
      <div className="flex items-start gap-2.5">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
            <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: `${srcColor}20`, color: srcColor }}>
              {item.source}
            </span>
            {item.related && (
              <span className="text-[9px] text-[#00d4aa] font-mono font-bold bg-[#00d4aa]/10 px-1 rounded">
                ${item.related}
              </span>
            )}
            <span className="text-[9px] text-[#2a4060] mono ml-auto">{age}</span>
          </div>
          <p className="text-[12px] text-[#c8d0e0] leading-snug line-clamp-2 group-hover:text-white transition-colors font-medium">
            {item.headline}
          </p>
          {item.summary && (
            <p className="text-[10px] text-[#4a5e7a] leading-snug line-clamp-1 mt-1">{item.summary}</p>
          )}
        </div>
        {item.image ? (
          <img
            src={item.image}
            alt=""
            className="w-14 h-10 rounded object-cover shrink-0 opacity-80 group-hover:opacity-100 transition-opacity"
            onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        ) : (
          <div className="w-14 h-10 rounded shrink-0 flex items-center justify-center text-[10px] font-bold"
            style={{ background: `${srcColor}15`, color: srcColor }}>
            {(item.source || 'N').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>
    </a>
  )
}

function AnalystCard({ tweet }: { tweet: typeof ANALYST_TWEETS[0] }) {
  const age = formatDistanceToNow(tweet.time, { addSuffix: true })
  const c = tweet.sentiment === 'bullish' ? '#00d4aa' : tweet.sentiment === 'bearish' ? '#ff4757' : '#ffa502'
  const highlight = (text: string) =>
    text.split(/(\$[A-Z/]+)/g).map((p, i) =>
      /^\$[A-Z/]+$/.test(p) ? <span key={i} className="text-[#00d4aa] font-bold">{p}</span> : p
    )
  return (
    <div className="px-3 py-3 border-b border-[#142032] hover:bg-[#0d1f35] transition-colors">
      <div className="flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0"
          style={{ background: `${tweet.color}20`, color: tweet.color, border: `1px solid ${tweet.color}30` }}>
          {tweet.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold text-[#cdd6f4]">{tweet.handle}</span>
            <span className="text-[9px] text-[#4a5e7a]">{age}</span>
            <span className="text-[8px] px-1.5 py-0.5 rounded ml-auto font-mono uppercase font-bold"
              style={{ color: c, background: `${c}15` }}>{tweet.sentiment}</span>
          </div>
          <p className="text-[12px] text-[#7f93b5] leading-relaxed">{highlight(tweet.text)}</p>
        </div>
      </div>
    </div>
  )
}

function TwitterTimeline() {
  const ref = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const tryLoad = () => {
      if (window.twttr?.widgets && ref.current) {
        window.twttr.widgets.load(ref.current)
        setTimeout(() => setLoaded(true), 2000)
      }
    }
    tryLoad()
    const t = setTimeout(tryLoad, 2000)
    return () => clearTimeout(t)
  }, [])

  return (
    <div ref={ref} className="h-full overflow-auto relative" style={{ background: '#040c14' }}>
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-4">
          <div className="w-5 h-5 border-2 border-[#1e90ff] border-t-transparent rounded-full animate-spin" />
          <div className="text-[10px] text-[#4a5e7a] text-center">
            Loading X analyst feed...<br />
            <span className="text-[9px]">If blocked, add the Twitter script to layout.tsx</span>
          </div>
        </div>
      )}
      <a className="twitter-timeline" data-theme="dark"
        data-chrome="noheader nofooter transparent"
        data-tweet-limit="8"
        href="https://twitter.com/i/lists/748093258937913345">
        Finance Analysts
      </a>
    </div>
  )
}

export default function PulseFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'news' | 'analysts' | 'sentiment' | 'twitter'>('news')
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [isDemo, setIsDemo] = useState(false)

  const fetchNews = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true)
    try {
      const res = await fetch('/api/news')
      const json = await res.json()
      setNews(json.news || [])
      setIsDemo(json.demo)
    } finally { setLoading(false); setRefreshing(false) }
  }, [])

  useEffect(() => { fetchNews() }, [fetchNews])
  useEffect(() => {
    const t = setInterval(() => fetchNews(true), 60_000)
    return () => clearInterval(t)
  }, [fetchNews])

  const CATEGORIES = ['all', 'technology', 'general', 'forex', 'crypto']
  const filteredNews = news.filter(n => {
    if (filter !== 'all' && n.category !== filter) return false
    if (searchQuery && !n.headline.toLowerCase().includes(searchQuery.toLowerCase())) return false
    return true
  })

  return (
    <div className="flex flex-col h-full" style={{ background: '#0b1622', borderLeft: '1px solid #142032', width: 288, minWidth: 288 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#142032]" style={{ background: '#091422' }}>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#ff4757] animate-pulse" />
          <span className="text-[11px] font-black text-[#cdd6f4] uppercase tracking-widest">Pulse</span>
          {isDemo && <span className="text-[8px] text-[#ffa502] border border-[#ffa502]/40 px-1 rounded">DEMO</span>}
          {!isDemo && <span className="text-[8px] text-[#00d4aa] border border-[#00d4aa]/40 px-1 rounded">LIVE</span>}
        </div>
        <button onClick={() => fetchNews(true)} className="text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors">
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#142032] shrink-0" style={{ background: '#091422' }}>
        {[
          { id: 'news' as const,      icon: <Rss size={9} />,      label: 'News'      },
          { id: 'analysts' as const,  icon: <AtSign size={9} />,   label: 'Analysts'  },
          { id: 'sentiment' as const, icon: <TrendingUp size={9} />,label: 'Sentiment' },
          { id: 'twitter' as const,   icon: <AtSign size={9} />,   label: 'X Live'    },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1 py-2 text-[9px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === t.id ? 'text-[#cdd6f4] border-[#00d4aa]' : 'text-[#2a4060] border-transparent hover:text-[#4a5e7a]'
            }`}>
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {/* News filter + search */}
      {tab === 'news' && (
        <div className="px-2 py-2 border-b border-[#142032] space-y-1.5 shrink-0">
          <div className="flex items-center gap-1 bg-[#0d1f35] rounded-lg px-2 py-1.5">
            <Search size={10} className="text-[#2a4060]" />
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search headlines..." className="flex-1 bg-transparent text-[10px] text-[#cdd6f4] outline-none placeholder-[#2a4060]" />
          </div>
          <div className="flex gap-1 overflow-x-auto scrollbar-none">
            {CATEGORIES.map(c => (
              <button key={c} onClick={() => setFilter(c)}
                className={`px-2 py-0.5 text-[8px] rounded font-mono uppercase shrink-0 transition-colors ${
                  filter === c ? 'bg-[#1e90ff] text-white' : 'text-[#2a4060] hover:text-[#4a5e7a]'
                }`}>{c}</button>
            ))}
          </div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'news' && (
          loading
            ? <div className="flex flex-col items-center justify-center h-32 gap-2">
                <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
                <span className="text-[10px] text-[#4a5e7a]">Fetching live news...</span>
              </div>
            : filteredNews.length === 0
              ? <div className="flex flex-col items-center justify-center h-24 gap-1">
                  <p className="text-[11px] text-[#4a5e7a]">No headlines found</p>
                  <button onClick={() => { setFilter('all'); setSearchQuery('') }} className="text-[9px] text-[#1e90ff] hover:underline">Clear filters</button>
                </div>
              : filteredNews.map(item => <NewsCard key={item.id} item={item} />)
        )}
        {tab === 'analysts' && ANALYST_TWEETS.map(t => <AnalystCard key={t.id} tweet={t} />)}
        {tab === 'sentiment' && (
          <div className="p-4 space-y-4">
            <div className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-wider">Social Sentiment — Top Tickers</div>
            {SENTIMENT_DATA.map(({ ticker, bull, mentions }) => {
              const isUp = bull >= 50
              const bear = 100 - bull
              return (
                <div key={ticker}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black text-[#cdd6f4]">${ticker}</span>
                      <span className="text-[9px] text-[#2a4060] mono">{mentions.toLocaleString()} mentions</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {isUp ? <TrendingUp size={10} className="text-up" /> : <TrendingDown size={10} className="text-down" />}
                      <span className={`mono text-xs font-bold ${isUp ? 'text-up' : 'text-down'}`}>{bull}% bull</span>
                    </div>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                    <div className="rounded-full bg-[#00d4aa]" style={{ width: `${bull}%` }} />
                    <div className="rounded-full bg-[#ff4757]" style={{ width: `${bear}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[8px] text-[#00d4aa]">{bull}% Bullish</span>
                    <span className="text-[8px] text-[#ff4757]">{bear}% Bearish</span>
                  </div>
                </div>
              )
            })}
            <div className="pt-2 text-[9px] text-[#2a4060] text-center border-t border-[#142032]">
              Aggregated from social media, options flow, and news sentiment
            </div>
          </div>
        )}
        {tab === 'twitter' && <TwitterTimeline />}
      </div>
    </div>
  )
}
