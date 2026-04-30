'use client'

import { useState, useEffect } from 'react'
import { ExternalLink, RefreshCw, Rss, AtSign } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { NewsItem } from '@/lib/types'

const ANALYST_TWEETS = [
  {
    id: 't1', handle: '@GoldmanSachs', avatar: 'GS',
    text: '$SPY holding key support at 505. Our models suggest 5,800 year-end target remains intact. Bull thesis: AI capex cycle + resilient earnings.',
    time: new Date(Date.now() - 900_000), sentiment: 'bullish',
  },
  {
    id: 't2', handle: '@WuTangFinance', avatar: 'WF',
    text: 'BREAKING: $NVDA options pricing in ±8% move for earnings. IV rank at 89th percentile. Theta gang eating well or getting rekt? 🎲',
    time: new Date(Date.now() - 1_800_000), sentiment: 'neutral',
  },
  {
    id: 't3', handle: '@JimCramer', avatar: 'JC',
    text: 'I am BULLISH on $AAPL at these levels. Services growth is the story. The stock is going HIGHER. Trust the process. 🔔',
    time: new Date(Date.now() - 2_700_000), sentiment: 'bullish',
  },
  {
    id: 't4', handle: '@StockMoe', avatar: 'SM',
    text: '$TSLA setting up for a massive breakout. The chart is SCREAMING buy. Full Self-Driving revenue recognition could be a game-changer. 🚀',
    time: new Date(Date.now() - 3_600_000), sentiment: 'bullish',
  },
  {
    id: 't5', handle: '@CathieWood', avatar: 'CW',
    text: 'Our 5-year price target for $TSLA remains $2,000. The convergence of AI, autonomous driving, and energy storage is unprecedented in history.',
    time: new Date(Date.now() - 5_400_000), sentiment: 'bullish',
  },
  {
    id: 't6', handle: '@MichaelBurry', avatar: 'MB',
    text: '.',
    time: new Date(Date.now() - 7_200_000), sentiment: 'bearish',
  },
]

function NewsCard({ item }: { item: NewsItem }) {
  const age = formatDistanceToNow(new Date(item.datetime * 1000), { addSuffix: true })
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block px-3 py-2.5 border-b border-[#1a2d4a] hover:bg-[#0f1f38] transition-colors group"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[9px] font-bold text-[#1e90ff] uppercase tracking-wider px-1 py-0.5 bg-[#1e90ff]/10 rounded">
              {item.source}
            </span>
            {item.related && (
              <span className="text-[9px] text-[#00d4aa] font-mono">${item.related}</span>
            )}
            <span className="text-[9px] text-[#4a5e7a] mono ml-auto">{age}</span>
          </div>
          <p className="text-[11px] text-[#cdd6f4] leading-snug line-clamp-2 group-hover:text-white transition-colors">
            {item.headline}
          </p>
        </div>
        <ExternalLink size={10} className="text-[#4a5e7a] shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  )
}

function TweetCard({ tweet }: { tweet: typeof ANALYST_TWEETS[0] }) {
  const age = formatDistanceToNow(tweet.time, { addSuffix: true })
  const sentimentColor = tweet.sentiment === 'bullish' ? '#00d4aa' : tweet.sentiment === 'bearish' ? '#ff4757' : '#ffa502'

  const highlightTickers = (text: string) =>
    text.split(/(\$[A-Z]+)/g).map((part, i) =>
      /^\$[A-Z]+$/.test(part) ? (
        <span key={i} className="text-[#00d4aa] font-semibold">{part}</span>
      ) : part
    )

  return (
    <div className="px-3 py-2.5 border-b border-[#1a2d4a] hover:bg-[#0f1f38] transition-colors">
      <div className="flex items-start gap-2">
        <div
          className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
          style={{ background: `${sentimentColor}20`, color: sentimentColor, border: `1px solid ${sentimentColor}40` }}
        >
          {tweet.avatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-[#cdd6f4]">{tweet.handle}</span>
            <span className="text-[9px] text-[#4a5e7a] mono">{age}</span>
            <span
              className="text-[9px] px-1 py-0.5 rounded ml-auto font-mono uppercase tracking-wider"
              style={{ color: sentimentColor, background: `${sentimentColor}15` }}
            >
              {tweet.sentiment}
            </span>
          </div>
          <p className="text-[11px] text-[#a0b4d0] leading-snug">
            {highlightTickers(tweet.text)}
          </p>
        </div>
      </div>
    </div>
  )
}

export default function PulseFeed() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'news' | 'sentiment'>('news')
  const [refreshing, setRefreshing] = useState(false)

  const fetchNews = async (silent = false) => {
    if (!silent) setLoading(true)
    else setRefreshing(true)
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

  return (
    <div className="flex flex-col h-full bg-[#071220] border-l border-[#1a2d4a]" style={{ width: 280 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff4757] animate-pulse" />
          <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-widest">Pulse</span>
        </div>
        <button
          onClick={() => fetchNews(true)}
          className="text-[#4a5e7a] hover:text-[#cdd6f4] transition-colors"
        >
          <RefreshCw size={11} className={refreshing ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a2d4a] shrink-0">
        <button
          onClick={() => setTab('news')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            tab === 'news' ? 'text-[#cdd6f4] border-b-2 border-[#00d4aa]' : 'text-[#4a5e7a] hover:text-[#7f93b5]'
          }`}
        >
          <Rss size={9} /> Headlines
        </button>
        <button
          onClick={() => setTab('sentiment')}
          className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
            tab === 'sentiment' ? 'text-[#cdd6f4] border-b-2 border-[#1e90ff]' : 'text-[#4a5e7a] hover:text-[#7f93b5]'
          }`}
        >
          <AtSign size={9} /> Analysts
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'news' ? (
          loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            news.map(item => <NewsCard key={item.id} item={item} />)
          )
        ) : (
          ANALYST_TWEETS.map(tweet => <TweetCard key={tweet.id} tweet={tweet} />)
        )}
      </div>

      {/* Sentiment meter */}
      <div className="px-3 py-2 border-t border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">Market Sentiment</span>
          <span className="text-[10px] text-[#00d4aa] mono font-semibold">68% Bullish</span>
        </div>
        <div className="h-1.5 rounded-full bg-[#0f1f38] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-[#ff4757] via-[#ffa502] to-[#00d4aa]" style={{ width: '68%' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-[#ff4757]">Bearish</span>
          <span className="text-[9px] text-[#00d4aa]">Bullish</span>
        </div>
      </div>
    </div>
  )
}
