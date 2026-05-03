'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Hash, Settings, Users, AtSign, Zap, ChevronDown } from 'lucide-react'
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns'
import { supabase, SUPABASE_ENABLED, type DBMessage, type DBChannel } from '@/lib/supabase'
import { useAIChat } from '@/hooks/useAIChat'

const CHANNELS_FALLBACK: DBChannel[] = [
  { id: '1', name: 'general',     description: 'General discussion',   emoji: '💬' },
  { id: '2', name: 'stocks',      description: 'Stock trading ideas',   emoji: '📈' },
  { id: '3', name: 'forex',       description: 'Forex analysis',        emoji: '💱' },
  { id: '4', name: 'futures',     description: 'Futures & commodities', emoji: '⚡' },
  { id: '5', name: 'crypto',      description: 'Crypto discussion',     emoji: '₿'  },
  { id: '6', name: 'trade-ideas', description: 'Share your setups',     emoji: '🎯' },
]

const AVATAR_COLORS = ['#00d4aa','#1e90ff','#a855f7','#ffa502','#ff6b81','#2ed573','#ff4757','#eccc68']
const REACTIONS = ['🔥','💰','📈','💎','🚀','⚠️','👍','😂']

const MOCK_MESSAGES: Record<string, string[]> = {
  '1': ['Anyone watching the fed today?','VIX is creeping up...','Earnings season looking strong.'],
  '2': ['$NVDA breaking out above 870','$AAPL 195 calls for July?','$TSLA needs to hold 245'],
  '3': ['EUR/USD rejected off 1.09 resistance','DXY strengthening → risk-off','GBP/USD long setup on 4h'],
  '4': ['ES holding 5240 support','Gold 2400 breakout incoming?','CL inventory data in 30 min'],
  '5': ['BTC forming bull flag on 1h','ETH gas fees back to normal','Altseason if BTC dominance drops'],
  '6': ['$META H&S pattern on daily','NQ long at support, 3:1 R:R','EUR/USD scalp setup posted'],
}

const MOCK_USERS = ['ScalpKing','ThetaGang','QuantDave','MomoMike','SentimentSue','IronCondor','DeltaForce','AlphaSeeker']

interface Msg {
  id: string; username: string; content: string; avatarColor: string; createdAt: Date
}

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]
}

function getTimestamp(date: Date): string {
  if (isToday(date)) return format(date, 'h:mm a')
  if (isYesterday(date)) return `Yesterday ${format(date, 'h:mm a')}`
  return format(date, 'MMM d, h:mm a')
}

function highlightContent(text: string) {
  return text.split(/(\$[A-Z/]+|@\w+)/g).map((p, i) => {
    if (/^\$[A-Z/]+$/.test(p)) return <span key={i} className="text-[#00d4aa] font-bold bg-[#00d4aa]/10 px-0.5 rounded">{p}</span>
    if (/^@\w+$/.test(p)) return <span key={i} className="text-[#1e90ff] font-semibold">{p}</span>
    return p
  })
}

function MessageGroup({ msgs, showHeader }: { msgs: Msg[]; showHeader: boolean }) {
  const first = msgs[0]
  const color = first.avatarColor
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [reactions, setReactions] = useState<Record<string, Record<string, boolean>>>({})

  const addReaction = (msgId: string, emoji: string) => {
    setReactions(prev => ({
      ...prev,
      [msgId]: { ...prev[msgId], [emoji]: !prev[msgId]?.[emoji] }
    }))
  }

  return (
    <div className="flex gap-3 px-4 py-1 group hover:bg-white/[0.015] rounded-lg mx-1 transition-colors">
      {/* Avatar */}
      <div className="shrink-0 w-9 mt-0.5">
        {showHeader ? (
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-black shadow-lg"
            style={{ background: `linear-gradient(135deg, ${color}40, ${color}20)`, color, border: `1px solid ${color}40` }}>
            {first.username.slice(0, 2).toUpperCase()}
          </div>
        ) : null}
      </div>

      <div className="flex-1 min-w-0">
        {showHeader && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-[13px] font-bold" style={{ color }}>{first.username}</span>
            <span className="text-[10px] text-[#4a5e7a]">{getTimestamp(first.createdAt)}</span>
          </div>
        )}
        {msgs.map((msg, i) => (
          <div key={msg.id} className="relative"
            onMouseEnter={() => setHoveredId(msg.id)}
            onMouseLeave={() => setHoveredId(null)}>
            <p className="text-[13px] text-[#c8d0e0] leading-relaxed">{highlightContent(msg.content)}</p>

            {/* Reaction picker on hover */}
            {hoveredId === msg.id && (
              <div className="absolute right-0 top-0 flex items-center gap-1 bg-[#0d1f35] border border-[#1e3a5f] rounded-lg px-2 py-1 shadow-xl z-10">
                {REACTIONS.map(emoji => (
                  <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                    className={`text-sm hover:scale-125 transition-transform ${reactions[msg.id]?.[emoji] ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}>
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Active reactions */}
            {reactions[msg.id] && Object.entries(reactions[msg.id]).some(([, v]) => v) && (
              <div className="flex gap-1 mt-1 flex-wrap">
                {Object.entries(reactions[msg.id]).filter(([, v]) => v).map(([emoji]) => (
                  <button key={emoji} onClick={() => addReaction(msg.id, emoji)}
                    className="flex items-center gap-1 px-2 py-0.5 bg-[#1e90ff]/15 border border-[#1e90ff]/30 rounded-full text-[10px] hover:bg-[#1e90ff]/25 transition-colors">
                    {emoji} <span className="text-[#7f93b5]">1</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function groupMessages(msgs: Msg[]): Array<{ msgs: Msg[]; showHeader: boolean }> {
  const groups: Array<{ msgs: Msg[]; showHeader: boolean }> = []
  msgs.forEach((msg, i) => {
    const prev = msgs[i - 1]
    const timeDiff = prev ? (msg.createdAt.getTime() - prev.createdAt.getTime()) / 1000 : Infinity
    const sameUser = prev?.username === msg.username && timeDiff < 300
    if (sameUser && groups.length) {
      groups[groups.length - 1].msgs.push(msg)
    } else {
      groups.push({ msgs: [msg], showHeader: true })
    }
  })
  return groups
}

function DateDivider({ date }: { date: Date }) {
  const label = isToday(date) ? 'Today' : isYesterday(date) ? 'Yesterday' : format(date, 'MMMM d, yyyy')
  return (
    <div className="flex items-center gap-3 px-4 py-2 my-1">
      <div className="flex-1 h-px bg-[#1a2d4a]" />
      <span className="text-[10px] text-[#4a5e7a] font-semibold uppercase tracking-wider shrink-0">{label}</span>
      <div className="flex-1 h-px bg-[#1a2d4a]" />
    </div>
  )
}

export default function TradeRoom() {
  const [channels, setChannels] = useState<DBChannel[]>(CHANNELS_FALLBACK)
  const [active, setActive] = useState<DBChannel>(CHANNELS_FALLBACK[0])
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [onlineCount] = useState(Math.floor(Math.random() * 80) + 120)
  const [isTyping, setIsTyping] = useState<string[]>([])
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const lastRealRef = useRef<Date | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('nexus_username')
    if (saved) setUsername(saved); else setShowNameModal(true)
  }, [])

  const saveName = () => {
    const name = nameInput.trim() || `Trader${Math.floor(Math.random() * 9999)}`
    localStorage.setItem('nexus_username', name)
    setUsername(name)
    setShowNameModal(false)
  }

  // Load channels from Supabase
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    supabase.from('channels').select('*').order('name').then(({ data }) => {
      if (data?.length) { setChannels(data); setActive(data[0]) }
    })
  }, [])

  const loadMessages = useCallback(async (ch: DBChannel) => {
    if (!SUPABASE_ENABLED || !supabase) {
      const demo = (MOCK_MESSAGES[ch.id] || MOCK_MESSAGES['1']).map((content, i) => ({
        id: `d${i}`, username: MOCK_USERS[i % MOCK_USERS.length], content,
        avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
        createdAt: new Date(Date.now() - (5 - i) * 120_000),
      }))
      setMessages(demo); return
    }
    const { data } = await supabase.from('messages').select('*')
      .eq('channel_id', ch.id).order('created_at', { ascending: true }).limit(100)
    if (data) setMessages(data.map((m: DBMessage) => ({
      id: m.id, username: m.username, content: m.content,
      avatarColor: m.avatar_color, createdAt: new Date(m.created_at),
    })))
  }, [])

  useEffect(() => { setMessages([]); loadMessages(active) }, [active, loadMessages])

  // Realtime
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    const sub = supabase.channel(`room-${active.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${active.id}` }, (payload) => {
        const m = payload.new as DBMessage
        setMessages(prev => prev.some(p => p.id === m.id) ? prev : [...prev, {
          id: m.id, username: m.username, content: m.content,
          avatarColor: m.avatar_color, createdAt: new Date(m.created_at),
        }])
      }).subscribe()
    return () => { supabase?.removeChannel(sub) }
  }, [active])

  // AI chat when quiet
  const handleAI = useCallback((msg: Msg) => {
    setMessages(prev => [...prev.slice(-150), msg])
  }, [])
  useAIChat(active.name, {}, lastRealRef.current, handleAI, true)

  // Demo simulation
  useEffect(() => {
    if (SUPABASE_ENABLED) return
    const msgs = MOCK_MESSAGES[active.id] || MOCK_MESSAGES['1']
    const t = setInterval(() => {
      const user = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
      setMessages(prev => [...prev.slice(-100), {
        id: crypto.randomUUID(), username: user,
        content: msgs[Math.floor(Math.random() * msgs.length)],
        avatarColor: avatarColor(user), createdAt: new Date(),
      }])
    }, 12_000 + Math.random() * 18_000)
    return () => clearInterval(t)
  }, [active])

  // Simulated typing indicator
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() > 0.7) {
        const typer = MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)]
        setIsTyping([typer])
        setTimeout(() => setIsTyping([]), 2000 + Math.random() * 2000)
      }
    }, 8000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || !username) return
    setInput('')
    lastRealRef.current = new Date()
    const color = avatarColor(username)

    if (!SUPABASE_ENABLED || !supabase) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), username, content: text, avatarColor: color, createdAt: new Date() }])
      return
    }

    const id = crypto.randomUUID()
    setMessages(prev => [...prev, { id, username, content: text, avatarColor: color, createdAt: new Date() }])
    const { error } = await supabase!.from('messages').insert({
      channel_id: active.id, username, content: text, avatar_color: color,
    })
    if (error) setMessages(prev => prev.filter(m => m.id !== id))
  }

  const groups = groupMessages(messages)

  return (
    <div className="flex h-full" style={{ background: '#0b1622' }}>

      {/* Username modal */}
      {showNameModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="w-80 bg-[#0d1f35] border border-[#1e3a5f] rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
                <AtSign size={14} className="text-[#040c14]" />
              </div>
              <div>
                <div className="text-sm font-bold text-[#cdd6f4]">Choose your handle</div>
                <div className="text-[10px] text-[#4a5e7a]">Visible to all traders in the room</div>
              </div>
            </div>
            <input autoFocus value={nameInput} onChange={e => setNameInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder="e.g. ScalpKing, ThetaGang..."
              className="w-full bg-[#0a1628] border border-[#1a2d4a] rounded-lg px-3 py-2.5 text-sm text-[#cdd6f4] outline-none focus:border-[#00d4aa] mb-3 transition-colors" />
            <button onClick={saveName}
              className="w-full bg-gradient-to-r from-[#00d4aa] to-[#1e90ff] text-[#040c14] font-bold py-2.5 rounded-lg text-sm hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(0,212,170,0.3)]">
              Enter Trade-Room
            </button>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-52 flex flex-col shrink-0" style={{ background: '#091422', borderRight: '1px solid #142032' }}>
        {/* Server header */}
        <div className="flex items-center justify-between px-3 py-3 border-b border-[#142032]">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00d4aa] to-[#1e90ff] flex items-center justify-center">
              <Zap size={13} className="text-[#040c14]" fill="currentColor" />
            </div>
            <div>
              <div className="text-xs font-black text-[#cdd6f4] tracking-tight">YN Trade-Room</div>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#00d4aa]" />
                <span className="text-[9px] text-[#4a5e7a]">{onlineCount} online</span>
              </div>
            </div>
          </div>
          <ChevronDown size={12} className="text-[#4a5e7a]" />
        </div>

        {/* Channels */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="px-3 mb-1">
            <span className="text-[9px] font-bold text-[#4a5e7a] uppercase tracking-widest">Channels</span>
          </div>
          {channels.map(ch => (
            <button key={ch.id} onClick={() => setActive(ch)}
              className={`w-full flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded-lg transition-all text-left ${
                active.id === ch.id
                  ? 'bg-[#1e3a5f]/50 text-[#cdd6f4]'
                  : 'text-[#4a5e7a] hover:bg-[#142032] hover:text-[#7f93b5]'
              }`} style={{ width: 'calc(100% - 8px)' }}>
              <Hash size={13} className={active.id === ch.id ? 'text-[#00d4aa]' : 'text-[#2a4060]'} />
              <span className="text-[12px] font-medium">{ch.name}</span>
              {!SUPABASE_ENABLED && ch.id === active.id && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-[#ffa502] shrink-0" />
              )}
            </button>
          ))}

          {/* Direct messages section */}
          <div className="px-3 mt-4 mb-1">
            <span className="text-[9px] font-bold text-[#4a5e7a] uppercase tracking-widest">Direct Messages</span>
          </div>
          {MOCK_USERS.slice(0, 3).map(u => (
            <div key={u} className="flex items-center gap-2.5 px-3 py-1.5 mx-1 rounded-lg text-[#3a5070] cursor-pointer hover:bg-[#142032] hover:text-[#7f93b5] transition-colors" style={{ width: 'calc(100% - 8px)' }}>
              <div className="relative">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold"
                  style={{ background: `${avatarColor(u)}30`, color: avatarColor(u) }}>
                  {u.slice(0, 2).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#00d4aa] border border-[#091422]" />
              </div>
              <span className="text-[11px]">{u}</span>
            </div>
          ))}
        </div>

        {/* User section */}
        <div className="px-3 py-2 border-t border-[#142032] flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black"
            style={{ background: `${avatarColor(username || 'A')}25`, color: avatarColor(username || 'A') }}>
            {(username || 'ME').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-bold text-[#cdd6f4] truncate">{username || 'Set name'}</div>
            <div className="text-[9px] text-[#00d4aa]">● Online</div>
          </div>
          <button onClick={() => setShowNameModal(true)} className="text-[#4a5e7a] hover:text-[#7f93b5]">
            <Settings size={12} />
          </button>
        </div>
        {!SUPABASE_ENABLED && (
          <div className="px-3 py-1.5 border-t border-[#142032] text-[9px] text-[#ffa502] bg-[#ffa502]/5 text-center">
            Demo mode — chat not shared
          </div>
        )}
      </div>

      {/* Messages area */}
      <div className="flex flex-col flex-1 min-w-0" style={{ background: '#0b1622' }}>
        {/* Channel header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#142032]" style={{ background: '#0b1622' }}>
          <div className="flex items-center gap-2">
            <Hash size={16} className="text-[#00d4aa]" />
            <span className="text-[15px] font-bold text-[#cdd6f4]">{active.name}</span>
            <span className="text-[#2a4060]">—</span>
            <span className="text-[11px] text-[#4a5e7a]">{active.description}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Users size={13} className="text-[#4a5e7a]" />
              <span className="text-[11px] text-[#4a5e7a]">{onlineCount}</span>
            </div>
            {SUPABASE_ENABLED && <span className="w-2 h-2 rounded-full bg-[#00d4aa] animate-pulse" title="Live" />}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-4 space-y-0.5">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#00d4aa]/20 to-[#1e90ff]/20 border border-[#1e3a5f] flex items-center justify-center mb-4">
                <Hash size={28} className="text-[#00d4aa]" />
              </div>
              <div className="text-base font-black text-[#cdd6f4] mb-1">Welcome to #{active.name}</div>
              <div className="text-[12px] text-[#4a5e7a]">{active.description}</div>
            </div>
          )}

          {groups.map((group, gi) => {
            const prevGroup = groups[gi - 1]
            const showDate = !prevGroup || (group.msgs[0].createdAt.toDateString() !== prevGroup.msgs[0].createdAt.toDateString())
            return (
              <div key={group.msgs[0].id}>
                {showDate && <DateDivider date={group.msgs[0].createdAt} />}
                <MessageGroup msgs={group.msgs} showHeader={group.showHeader} />
              </div>
            )
          })}

          {/* Typing indicator */}
          {isTyping.length > 0 && (
            <div className="flex items-center gap-3 px-4 py-1">
              <div className="w-9 shrink-0" />
              <div className="flex items-center gap-2 text-[11px] text-[#4a5e7a]">
                <div className="flex gap-0.5">
                  {[0,1,2].map(i => (
                    <span key={i} className="w-1 h-1 rounded-full bg-[#4a5e7a] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
                <span><strong className="text-[#7f93b5]">{isTyping[0]}</strong> is typing...</span>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-4 pb-4 pt-2 shrink-0">
          <div className="flex items-center gap-2 rounded-xl border border-[#1e3a5f] px-3 py-2.5 focus-within:border-[#2d5080] transition-colors"
            style={{ background: '#0d1f35' }}>
            <button onClick={() => setShowEmojiPicker(v => !v)} className="text-[#4a5e7a] hover:text-[#7f93b5] shrink-0 text-lg">
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-16 left-4 bg-[#0d1f35] border border-[#1e3a5f] rounded-xl p-2 flex gap-1 flex-wrap max-w-[200px] shadow-2xl z-20">
                {['🔥','💰','📈','📉','🚀','💎','⚡','👀','🎯','✅','❌','😂'].map(e => (
                  <button key={e} onClick={() => { setInput(p => p + e); setShowEmojiPicker(false); inputRef.current?.focus() }}
                    className="text-lg hover:scale-125 transition-transform p-1">{e}</button>
                ))}
              </div>
            )}
            <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              onClick={() => setShowEmojiPicker(false)}
              placeholder={`Message #${active.name} — use $TICKER to tag stocks`}
              className="flex-1 bg-transparent text-[13px] text-[#cdd6f4] placeholder-[#2a4060] outline-none" />
            <button onClick={send} disabled={!input.trim()}
              className={`shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                input.trim()
                  ? 'bg-[#00d4aa] text-[#040c14] hover:bg-[#00ffcc] shadow-[0_0_12px_rgba(0,212,170,0.4)]'
                  : 'text-[#2a4060] cursor-not-allowed'
              }`}>
              <Send size={14} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1.5 px-1">
            <span className="text-[9px] text-[#2a4060]">
              <kbd className="border border-[#1a2d4a] px-1 rounded font-mono text-[8px]">Enter</kbd> to send · hover messages to react
            </span>
            {!SUPABASE_ENABLED && (
              <span className="text-[9px] text-[#ffa502]">Connect Supabase for shared real-time chat</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
