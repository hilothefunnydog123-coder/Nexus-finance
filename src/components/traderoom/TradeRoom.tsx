'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Hash, Zap, Users, Settings } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { supabase, SUPABASE_ENABLED, type DBMessage, type DBChannel } from '@/lib/supabase'
import { useAIChat } from '@/hooks/useAIChat'

const CHANNELS_FALLBACK: DBChannel[] = [
  { id: '1', name: 'general',     description: 'General discussion',       emoji: '💬' },
  { id: '2', name: 'stocks',      description: 'Stock trading ideas',       emoji: '📈' },
  { id: '3', name: 'forex',       description: 'Forex market analysis',     emoji: '💱' },
  { id: '4', name: 'futures',     description: 'Futures & commodities',     emoji: '⚡' },
  { id: '5', name: 'crypto',      description: 'Crypto discussion',         emoji: '₿'  },
  { id: '6', name: 'trade-ideas', description: 'Share your setups',         emoji: '🎯' },
]

const AVATAR_COLORS = ['#00d4aa','#1e90ff','#a855f7','#ffa502','#ff4757','#ff6b81','#2ed573']

const MOCK_USERS = ['ScalpKing','ThetaGang','QuantDave','MomoMike','SentimentSue','IronCondor','DeltaForce','AlphaSeeker']
const MOCK_MESSAGES: Record<string, string[]> = {
  '1': ['Anyone watching the fed today?', 'VIX is creeping up...', 'Earnings season looking strong so far.'],
  '2': ['$NVDA breaking out above 870. Loading more.', '$AAPL 195 calls for July — anyone in?', '$TSLA needs to hold 245 or we see 230.'],
  '3': ['EUR/USD rejected off 1.09 resistance hard.', 'DXY strengthening → risk-off forex environment.', 'GBP/USD long setup on 4h, targeting 1.28.'],
  '4': ['ES holding 5240 support. Bulls still in control.', 'GC (Gold) 2400 breakout incoming? IV is low.', 'CL inventory data in 30 min — expect volatility.'],
  '5': ['BTC forming a bull flag on 1h.', 'ETH gas fees back to normal, on-chain activity up.', 'Altcoin season possible if BTC dominance drops.'],
  '6': ['$META H&S pattern on daily — short setup.', 'NQ long at support, 3:1 R:R, will update.', 'Sharing my EUR/USD scalp setup — see chart.'],
}

function parseContent(text: string) {
  return text.split(/(\$[A-Z\/]+)/g).map((part, i) =>
    /^\$[A-Z\/]+$/.test(part)
      ? <span key={i} className="text-[#00d4aa] font-semibold">{part}</span>
      : part
  )
}

interface Msg {
  id: string
  username: string
  content: string
  avatarColor: string
  createdAt: Date
  isBot?: boolean
}

function getUsernameFromStorage(): string {
  if (typeof window === 'undefined') return 'Trader'
  return localStorage.getItem('nexus_username') || ''
}

export default function TradeRoom() {
  const [channels, setChannels] = useState<DBChannel[]>(CHANNELS_FALLBACK)
  const [activeChannel, setActiveChannel] = useState<DBChannel>(CHANNELS_FALLBACK[0])
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [showUsernameModal, setShowUsernameModal] = useState(false)
  const [usernameInput, setUsernameInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const lastRealMsgAt = useRef<Date | null>(null)

  const handleAiMessage = useCallback((msg: Msg) => {
    setMessages(prev => [...prev.slice(-150), msg])
  }, [])

  useAIChat(
    activeChannel.name,
    {},
    lastRealMsgAt.current,
    handleAiMessage,
    true
  )

  // Init username
  useEffect(() => {
    const saved = getUsernameFromStorage()
    if (saved) { setUsername(saved) } else { setShowUsernameModal(true) }
  }, [])

  const saveUsername = () => {
    const name = usernameInput.trim() || `Trader${Math.floor(Math.random() * 9999)}`
    localStorage.setItem('nexus_username', name)
    setUsername(name)
    setShowUsernameModal(false)
  }

  // Load channels from Supabase and sync activeChannel to real UUID
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data?.length) {
        setChannels(data)
        setActiveChannel(data[0]) // critical: replace fallback id '1' with real UUID
      }
    })
  }, [])

  // Load messages for active channel
  const loadMessages = useCallback(async (channel: DBChannel) => {
    if (!SUPABASE_ENABLED || !supabase) {
      // Generate demo messages
      const demos = (MOCK_MESSAGES[channel.id] || MOCK_MESSAGES['1']).map((content, i) => ({
        id: `demo-${i}`,
        username: MOCK_USERS[i % MOCK_USERS.length],
        content,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        createdAt: new Date(Date.now() - (MOCK_MESSAGES[channel.id]?.length - i) * 120_000),
      }))
      setMessages(demos)
      return
    }

    const { data } = await supabase!
      .from('messages')
      .select('*')
      .eq('channel_id', channel.id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (data) {
      setMessages(data.map((m: DBMessage) => ({
        id: m.id,
        username: m.username,
        content: m.content,
        avatarColor: m.avatar_color,
        createdAt: new Date(m.created_at),
      })))
    }
  }, [])

  useEffect(() => {
    setMessages([])
    loadMessages(activeChannel)
  }, [activeChannel, loadMessages])

  // Supabase realtime subscription — deduplicate optimistic messages
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return

    const sub = supabase
      .channel(`room-${activeChannel.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `channel_id=eq.${activeChannel.id}`,
      }, (payload) => {
        const m = payload.new as DBMessage
        setMessages(prev => {
          // Skip if we already added this message optimistically
          if (prev.some(p => p.id === m.id)) return prev
          return [...prev, {
            id: m.id,
            username: m.username,
            content: m.content,
            avatarColor: m.avatar_color,
            createdAt: new Date(m.created_at),
          }]
        })
      })
      .subscribe()

    return () => { supabase?.removeChannel(sub) }
  }, [activeChannel])

  // Simulate incoming messages in demo mode
  useEffect(() => {
    if (SUPABASE_ENABLED) return
    const msgs = MOCK_MESSAGES[activeChannel.id] || MOCK_MESSAGES['1']
    const interval = setInterval(() => {
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
      const content = msgs[Math.floor(Math.random() * msgs.length)]
      setMessages(prev => [...prev.slice(-100), {
        id: crypto.randomUUID(),
        username: user,
        content,
        avatarColor: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
        createdAt: new Date(),
      }])
    }, 10_000 + Math.random() * 15_000)
    return () => clearInterval(interval)
  }, [activeChannel])

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async () => {
    const text = input.trim()
    if (!text || !username) return
    setInput('')

    const myColor = AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length]

    if (!SUPABASE_ENABLED || !supabase) {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        username,
        content: text,
        avatarColor: myColor,
        createdAt: new Date(),
      }])
      return
    }

    lastRealMsgAt.current = new Date()
    // Optimistic update — show immediately, Realtime deduplicates the echo
    const optimisticId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      id: optimisticId,
      username,
      content: text,
      avatarColor: myColor,
      createdAt: new Date(),
    }])

    const { error } = await supabase!.from('messages').insert({
      channel_id: activeChannel.id,
      username,
      content: text,
      avatar_color: myColor,
    })

    if (error) {
      // Remove optimistic message if insert failed
      setMessages(prev => prev.filter(m => m.id !== optimisticId))
      console.error('Message insert failed:', error.message)
    }
  }

  return (
    <div className="flex h-full bg-[#040c14]">
      {/* Username modal */}
      {showUsernameModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-[#071220] border border-[#1e3a5f] rounded p-6 w-72">
            <div className="flex items-center gap-2 mb-4">
              <Zap size={14} className="text-[#00d4aa]" />
              <span className="font-bold text-[#cdd6f4]">Choose your trader name</span>
            </div>
            <input
              autoFocus
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveUsername()}
              placeholder="e.g. ScalpKing, ThetaGang..."
              className="w-full bg-[#0f1f38] border border-[#1a2d4a] rounded px-3 py-2 text-sm text-[#cdd6f4] outline-none focus:border-[#00d4aa] mb-3"
            />
            <button
              onClick={saveUsername}
              className="w-full bg-[#00d4aa] text-[#040c14] font-bold py-2 rounded text-sm hover:bg-[#00ffcc] transition-colors"
            >
              Enter Trade-Room
            </button>
          </div>
        </div>
      )}

      {/* Channel sidebar */}
      <div className="w-44 bg-[#071220] border-r border-[#1a2d4a] flex flex-col shrink-0">
        <div className="px-3 py-2 border-b border-[#1a2d4a]">
          <span className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-widest">Channels</span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {channels.map(ch => (
            <button
              key={ch.id}
              onClick={() => setActiveChannel(ch)}
              className={`w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#0f1f38] transition-colors rounded mx-1 ${
                activeChannel.id === ch.id ? 'bg-[#0f1f38] text-[#cdd6f4]' : 'text-[#7f93b5]'
              }`}
            >
              <Hash size={11} className={activeChannel.id === ch.id ? 'text-[#00d4aa]' : 'text-[#4a5e7a]'} />
              <span className="text-[11px] font-medium">{ch.name}</span>
            </button>
          ))}
        </div>
        <div className="px-3 py-2 border-t border-[#1a2d4a]">
          <button
            onClick={() => setShowUsernameModal(true)}
            className="flex items-center gap-2 w-full hover:bg-[#0f1f38] rounded px-1 py-1 transition-colors"
          >
            <div
              className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
              style={{ background: `${AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length]}20`, color: AVATAR_COLORS[username.charCodeAt(0) % AVATAR_COLORS.length] }}
            >
              {username.slice(0, 2).toUpperCase() || 'ME'}
            </div>
            <span className="text-[10px] text-[#7f93b5] truncate">{username || 'Set name'}</span>
            <Settings size={9} className="text-[#4a5e7a] ml-auto" />
          </button>
        </div>
        {!SUPABASE_ENABLED && (
          <div className="px-2 py-1.5 bg-[#ffa502]/10 border-t border-[#ffa502]/20]">
            <p className="text-[9px] text-[#ffa502] leading-tight">Demo mode — add Supabase keys for real-time chat</p>
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Channel header */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
          <Hash size={12} className="text-[#00d4aa]" />
          <span className="text-sm font-semibold text-[#cdd6f4]">{activeChannel.name}</span>
          <span className="text-[11px] text-[#4a5e7a]">— {activeChannel.description}</span>
          <div className="ml-auto flex items-center gap-1">
            <Users size={10} className="text-[#4a5e7a]" />
            <span className="text-[10px] text-[#4a5e7a]">
              {SUPABASE_ENABLED ? 'Live' : '247 online (demo)'}
            </span>
            {SUPABASE_ENABLED && <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa] animate-pulse" />}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {messages.map(msg => (
            <div key={msg.id} className="flex gap-2.5 px-2 py-1.5 hover:bg-[#071220]/60 rounded group">
              <div
                className="w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5"
                style={{ background: `${msg.avatarColor}20`, color: msg.avatarColor }}
              >
                {msg.username.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 mb-0.5">
                  <span className="text-xs font-semibold" style={{ color: msg.avatarColor }}>{msg.username}</span>
                  <span className="text-[9px] text-[#4a5e7a] mono">
                    {formatDistanceToNow(msg.createdAt, { addSuffix: true })}
                  </span>
                </div>
                <p className="text-[11px] text-[#a0b4d0] leading-relaxed">{parseContent(msg.content)}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-3 py-2 border-t border-[#1a2d4a] bg-[#040c14] shrink-0">
          <div className="flex items-center gap-2 bg-[#0a1628] border border-[#1a2d4a] rounded px-3 py-2 focus-within:border-[#1e3a5f]">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder={`Message #${activeChannel.name} — use $TICKER to tag`}
              className="flex-1 bg-transparent text-[11px] text-[#cdd6f4] placeholder-[#4a5e7a] outline-none"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim()}
              className="text-[#00d4aa] hover:text-[#00ffcc] disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Send size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
