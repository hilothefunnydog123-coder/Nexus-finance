'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Users, MessageSquare } from 'lucide-react'
import { supabase, SUPABASE_ENABLED } from '@/lib/supabase'

interface Msg { id: string; username: string; content: string; avatarColor: string; createdAt: Date }

const COLORS = ['#00d4aa','#1e90ff','#a855f7','#ffa502','#ff6b81','#2ed573']
const DEMO_MSGS = [
  { u: 'ScalpKing', c: 'Just finished section 3 — the order block concept finally clicked for me 🔥', t: 5 },
  { u: 'TradingNova', c: 'Same! Been trading for 2 years and never understood WHY price goes to those zones', t: 12 },
  { u: 'ForexFred42', c: 'The practice exercise really helps. Did 3 trades on EUR/USD using it, 2 were clean entries', t: 18 },
  { u: 'MarketMaven', c: 'Question: does this work on crypto too or mainly forex/stocks?', t: 25 },
  { u: 'ScalpKing', c: '@MarketMaven Yes! BTC/USD respects these zones beautifully, actually cleaner than some stocks', t: 31 },
  { u: 'NewTrader99', c: 'This course is worth way more than $0.99 lol — been paying $300/month for signals that don\'t explain anything', t: 45 },
]

export default function CourseChat({ courseSlug, courseName, color }: { courseSlug: string; courseName: string; color: string }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [username, setUsername] = useState('')
  const [showNameModal, setShowNameModal] = useState(false)
  const [nameInput, setNameInput] = useState('')
  const [onlineCount] = useState(Math.floor(Math.random() * 40) + 12)
  const bottomRef = useRef<HTMLDivElement>(null)

  const channelId = `course_${courseSlug}`
  const myColor = username ? COLORS[username.charCodeAt(0) % COLORS.length] : '#00d4aa'

  useEffect(() => {
    const saved = localStorage.getItem('nexus_username')
    if (saved) setUsername(saved); else setShowNameModal(true)
  }, [])

  // Seed demo messages
  useEffect(() => {
    const now = Date.now()
    setMessages(DEMO_MSGS.map((m, i) => ({
      id: `demo_${i}`,
      username: m.u,
      content: m.c,
      avatarColor: COLORS[i % COLORS.length],
      createdAt: new Date(now - m.t * 60_000),
    })))
  }, [courseSlug])

  // Supabase realtime
  useEffect(() => {
    if (!SUPABASE_ENABLED || !supabase) return
    supabase.from('messages').select('*')
      .eq('channel_id', channelId).order('created_at', { ascending: true }).limit(50)
      .then(({ data }) => {
        if (data?.length) {
          setMessages(data.map(m => ({ id: m.id, username: m.username, content: m.content, avatarColor: m.avatar_color, createdAt: new Date(m.created_at) })))
        }
      })

    const sub = supabase.channel(`course_chat_${courseSlug}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${channelId}` }, (p) => {
        const m = p.new as { id: string; username: string; content: string; avatar_color: string; created_at: string }
        setMessages(prev => prev.some(x => x.id === m.id) ? prev : [...prev, { id: m.id, username: m.username, content: m.content, avatarColor: m.avatar_color, createdAt: new Date(m.created_at) }])
      }).subscribe()
    return () => { supabase?.removeChannel(sub) }
  }, [courseSlug, channelId])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || !username) return
    setInput('')
    const optimisticId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: optimisticId, username, content: text, avatarColor: myColor, createdAt: new Date() }])

    if (SUPABASE_ENABLED && supabase) {
      const { error } = await supabase.from('messages').insert({ channel_id: channelId, username, content: text, avatar_color: myColor })
      if (error) setMessages(prev => prev.filter(m => m.id !== optimisticId))
    }
  }

  const saveName = () => {
    const name = nameInput.trim() || `Student${Math.floor(Math.random() * 9999)}`
    localStorage.setItem('nexus_username', name)
    setUsername(name)
    setShowNameModal(false)
  }

  return (
    <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 16, overflow: 'hidden', height: 400, display: 'flex', flexDirection: 'column' }}>
      {showNameModal && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, borderRadius: 16 }}>
          <div style={{ background: '#071220', border: '1px solid #1e3a5f', borderRadius: 12, padding: 24, width: 280 }}>
            <div style={{ fontWeight: 800, color: '#fff', marginBottom: 8 }}>Choose your name</div>
            <input value={nameInput} onChange={e => setNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && saveName()}
              placeholder="e.g. TradingNova..." autoFocus
              style={{ width: '100%', background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px', color: '#cdd6f4', fontSize: 13, outline: 'none', marginBottom: 12, boxSizing: 'border-box' }} />
            <button onClick={saveName} style={{ width: '100%', background: color, color: '#040c14', border: 'none', borderRadius: 8, padding: '10px', fontWeight: 800, cursor: 'pointer', fontSize: 13 }}>
              Join Discussion
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 8, background: '#071220' }}>
        <MessageSquare size={13} color={color} />
        <span style={{ fontWeight: 700, color: '#cdd6f4', fontSize: 13 }}>{courseName} — Community</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a5e7a' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', display: 'inline-block' }} />
          <Users size={10} /> {onlineCount} online
          {!SUPABASE_ENABLED && <span style={{ color: '#ffa502', fontSize: 9, marginLeft: 4 }}>DEMO</span>}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map(msg => {
          const isMe = msg.username === username
          return (
            <div key={msg.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: `${msg.avatarColor}25`, color: msg.avatarColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, flexShrink: 0 }}>
                {msg.username.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 2 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: isMe ? color : msg.avatarColor }}>{msg.username}</span>
                  <span style={{ fontSize: 9, color: '#4a5e7a' }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <p style={{ fontSize: 13, color: '#a0b4d0', lineHeight: 1.5, margin: 0 }}>{msg.content}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #1a2d4a', display: 'flex', gap: 8 }}>
        <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()}
          placeholder={`Ask a question or share your progress...`}
          style={{ flex: 1, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 10, padding: '9px 14px', color: '#cdd6f4', fontSize: 12, outline: 'none' }} />
        <button onClick={send} disabled={!input.trim()}
          style={{ width: 36, height: 36, borderRadius: 10, background: input.trim() ? color : '#1a2d4a', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Send size={14} color="#040c14" />
        </button>
      </div>
    </div>
  )
}
