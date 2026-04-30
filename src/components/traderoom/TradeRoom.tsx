'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Terminal, Hash, Zap } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { TradeMessage } from '@/lib/types'

const BOTS = [
  { username: 'nexus_bot', avatar: '🤖', type: 'bot' as const },
]

const INITIAL_MESSAGES: TradeMessage[] = [
  {
    id: '1', username: 'TraderAlpha', avatar: 'TA', type: 'user',
    message: '$NVDA breaking out above the 870 resistance — watching for a continuation to 900. Volume is confirming. 🔥',
    timestamp: new Date(Date.now() - 300_000), tickers: ['NVDA'],
  },
  {
    id: '2', username: 'nexus_bot', avatar: '🤖', type: 'bot',
    message: 'ALERT: $NVDA volume 2.3x above 10-day average. Price action: +1.8% from open. Implied move into earnings: ±8.2%',
    timestamp: new Date(Date.now() - 250_000), tickers: ['NVDA'],
  },
  {
    id: '3', username: 'QuantDave', avatar: 'QD', type: 'user',
    message: 'Sold $TSLA 250 puts for 3.40 credit, targeting 240 support as floor. Delta-neutral hedge on my calls.',
    timestamp: new Date(Date.now() - 180_000), tickers: ['TSLA'],
  },
  {
    id: '4', username: 'SentimentSue', avatar: 'SS', type: 'user',
    message: 'Anyone else watching $AAPL options flow? Seeing some unusual call buying in the 195 strike for July exp.',
    timestamp: new Date(Date.now() - 120_000), tickers: ['AAPL'],
  },
  {
    id: '5', username: 'nexus_bot', avatar: '🤖', type: 'bot',
    message: 'MARKET ALERT: VIX spiking +12%. Defensive rotation underway. $SPY approaching 200-day MA. Exercise caution.',
    timestamp: new Date(Date.now() - 60_000), tickers: ['VIX', 'SPY'],
  },
  {
    id: '6', username: 'MomoMike', avatar: 'MM', type: 'user',
    message: 'Just loaded $META here at 490. RSI oversold on the 15m, MACD curling up. PT 505 by EOD 🎯',
    timestamp: new Date(Date.now() - 20_000), tickers: ['META'],
  },
]

const BOT_RESPONSES = [
  (ticker: string) => `FLOW ALERT: Unusual options activity detected in $${ticker}. Large call sweep at OTM strikes.`,
  (ticker: string) => `DATA: $${ticker} short interest at 4.2% of float. Borrow rate: 1.2% annualized.`,
  (ticker: string) => `TECHNICAL: $${ticker} approaching key resistance. RSI: 67.3 | MACD: Bullish crossover | Vol: Above avg`,
  () => 'MARKET: Broad risk-on sentiment. Growth/Value ratio expanding. Institutional buying detected in tech sector.',
  (ticker: string) => `NEWS SCAN: 3 positive catalysts found for $${ticker} in last 24h. Analyst upgrades: 2.`,
]

const MOCK_USERS = [
  { username: 'ScalpKing', avatar: 'SK' },
  { username: 'ThetaGang', avatar: 'TG' },
  { username: 'DeltaForce', avatar: 'DF' },
  { username: 'IronCondor', avatar: 'IC' },
]

const MOCK_MSGS = [
  '$MSFT consolidating beautifully. Waiting for break above 420 to add.',
  'Who\'s playing $AMD earnings? IV crush gonna be brutal either way.',
  '$SPY red to green reversal incoming? Watching the 512 level.',
  'Trimmed half my $AMZN position into strength. Let winners run but protect gains.',
  'Options flow in $GOOGL going crazy right now. Someone knows something 👀',
  '$JPM holding up well relative to sector. Financials as a hedge makes sense here.',
]

function parseMessage(text: string) {
  return text.split(/(\$[A-Z]+)/g).map((part, i) =>
    /^\$[A-Z]+$/.test(part)
      ? <span key={i} className="text-[#00d4aa] font-semibold hover:underline cursor-pointer">{part}</span>
      : part
  )
}

function Message({ msg }: { msg: TradeMessage }) {
  const isBot = msg.type === 'bot'
  const isAlert = msg.type === 'alert'
  const isOwn = msg.type === 'user' && msg.username === 'You'

  return (
    <div className={`flex gap-2 px-3 py-2 hover:bg-[#0a1628]/50 transition-colors group ${isAlert ? 'bg-[#ffa502]/5 border-l-2 border-[#ffa502]' : ''}`}>
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5 ${
          isBot ? 'bg-[#1e90ff]/20 text-[#1e90ff]' :
          isOwn ? 'bg-[#00d4aa]/20 text-[#00d4aa]' :
          'bg-[#a855f7]/20 text-[#a855f7]'
        }`}
      >
        {isBot ? '⚡' : msg.avatar}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-xs font-semibold ${
            isBot ? 'text-[#1e90ff]' : isOwn ? 'text-[#00d4aa]' : 'text-[#cdd6f4]'
          }`}>
            {msg.username}
          </span>
          {isBot && (
            <span className="text-[9px] bg-[#1e90ff]/20 text-[#1e90ff] px-1 rounded font-mono">BOT</span>
          )}
          <span className="text-[9px] text-[#4a5e7a] mono">
            {formatDistanceToNow(msg.timestamp, { addSuffix: true })}
          </span>
        </div>
        <p className={`text-[11px] leading-relaxed ${isBot ? 'text-[#7f93b5]' : 'text-[#a0b4d0]'}`}>
          {parseMessage(msg.message)}
        </p>
      </div>
    </div>
  )
}

export default function TradeRoom() {
  const [messages, setMessages] = useState<TradeMessage[]>(INITIAL_MESSAGES)
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { scrollToBottom() }, [messages, scrollToBottom])

  // Simulate incoming messages
  useEffect(() => {
    const interval = setInterval(() => {
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
      const text = MOCK_MSGS[Math.floor(Math.random() * MOCK_MSGS.length)]
      const tickers = (text.match(/\$[A-Z]+/g) || []).map(t => t.slice(1))

      const newMsg: TradeMessage = {
        id: crypto.randomUUID(),
        username: user.username,
        avatar: user.avatar,
        message: text,
        timestamp: new Date(),
        tickers,
        type: 'user',
      }
      setMessages(prev => [...prev.slice(-100), newMsg])

      // Bot sometimes responds
      if (Math.random() > 0.6 && tickers.length > 0) {
        setTimeout(() => {
          const responseTemplate = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)]
          const botMsg: TradeMessage = {
            id: crypto.randomUUID(),
            username: 'nexus_bot',
            avatar: '⚡',
            message: responseTemplate(tickers[0]),
            timestamp: new Date(),
            tickers,
            type: 'bot',
          }
          setMessages(prev => [...prev.slice(-100), botMsg])
        }, 1500 + Math.random() * 2000)
      }
    }, 8000 + Math.random() * 7000)

    return () => clearInterval(interval)
  }, [])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    const tickers = (text.match(/\$[A-Z]+/g) || []).map(t => t.slice(1))
    const msg: TradeMessage = {
      id: crypto.randomUUID(),
      username: 'You',
      avatar: 'ME',
      message: text,
      timestamp: new Date(),
      tickers,
      type: 'user',
    }
    setMessages(prev => [...prev, msg])
    setInput('')

    // Bot responds to user
    if (tickers.length > 0) {
      setIsTyping(true)
      setTimeout(() => {
        const responseTemplate = BOT_RESPONSES[Math.floor(Math.random() * BOT_RESPONSES.length)]
        const botMsg: TradeMessage = {
          id: crypto.randomUUID(),
          username: 'nexus_bot',
          avatar: '⚡',
          message: responseTemplate(tickers[0]),
          timestamp: new Date(),
          tickers,
          type: 'bot',
        }
        setMessages(prev => [...prev, botMsg])
        setIsTyping(false)
      }, 1200 + Math.random() * 1000)
    }
  }

  return (
    <div className="flex flex-col h-full bg-[#071220] border-t border-[#1a2d4a]">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#1a2d4a] bg-[#0a1628] shrink-0">
        <Terminal size={12} className="text-[#00d4aa]" />
        <span className="text-[11px] font-bold text-[#cdd6f4] uppercase tracking-widest">Trade-Room</span>
        <Hash size={10} className="text-[#4a5e7a]" />
        <span className="text-[11px] text-[#4a5e7a]">general</span>
        <div className="flex items-center gap-1 ml-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
          <span className="text-[10px] text-[#7f93b5]">247 traders online</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {isTyping && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded flex items-center justify-center text-[10px] bg-[#1e90ff]/20 text-[#1e90ff]">⚡</div>
            <div className="flex items-center gap-1">
              <span className="text-[11px] text-[#4a5e7a]">nexus_bot is analyzing</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map(i => (
                  <span
                    key={i}
                    className="w-1 h-1 rounded-full bg-[#4a5e7a] animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="flex items-center gap-2 px-3 py-2 border-t border-[#1a2d4a] bg-[#040c14] shrink-0">
        <div className="flex items-center gap-2 flex-1 bg-[#0a1628] border border-[#1a2d4a] rounded px-3 py-1.5 focus-within:border-[#1e3a5f]">
          <Zap size={11} className="text-[#4a5e7a] shrink-0" />
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Post your trade idea... use $TICKER to tag stocks"
            className="flex-1 bg-transparent text-[11px] text-[#cdd6f4] placeholder-[#4a5e7a] outline-none font-mono"
          />
          <span className="cursor-blink text-[#00d4aa] text-xs">|</span>
        </div>
        <button
          onClick={sendMessage}
          disabled={!input.trim()}
          className="p-1.5 rounded bg-[#00d4aa]/20 text-[#00d4aa] hover:bg-[#00d4aa]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <Send size={12} />
        </button>
      </div>
    </div>
  )
}
