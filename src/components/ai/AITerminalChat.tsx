'use client'

import { useState, useRef, useEffect } from 'react'
import { Bot, X, Send, ChevronDown } from 'lucide-react'

interface Msg { role: 'user' | 'ai'; text: string }

interface Props { activeTab: string }

export default function AITerminalChat({ activeTab }: Props) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Ask me anything about your charts, setups, or strategies. I know which tab you\'re on.' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = async () => {
    const q = input.trim()
    if (!q || loading) return
    setInput('')
    setMsgs(prev => [...prev, { role: 'user', text: q }])
    setLoading(true)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'terminal_chat', data: { question: q, tab: activeTab } }),
      })
      const json = await res.json()
      setMsgs(prev => [...prev, { role: 'ai', text: json.response || 'Could not get a response. Try again.' }])
    } catch {
      setMsgs(prev => [...prev, { role: 'ai', text: 'Connection error. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', bottom: 12, right: 12, zIndex: 300 }}>
      {open ? (
        <div style={{ width: 320, background: '#071220', border: '1px solid #1e3a5f', borderRadius: 14, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 30px rgba(168,85,247,0.15)' }}>
          {/* Header */}
          <div style={{ padding: '10px 14px', background: '#040c14', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 8, background: 'linear-gradient(135deg, #a855f7, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Bot size={13} color="#fff" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>YN AI Assistant</div>
              <div style={{ fontSize: 9, color: '#4a5e7a' }}>Gemini · {activeTab} tab</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer', padding: 4 }}>
              <ChevronDown size={14} />
            </button>
          </div>

          {/* Messages */}
          <div style={{ height: 260, overflowY: 'auto', padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '8px 12px', borderRadius: m.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: m.role === 'user' ? 'linear-gradient(135deg, #a855f7, #1e90ff)' : '#0a1628',
                  border: m.role === 'ai' ? '1px solid #1a2d4a' : 'none',
                  fontSize: 12, color: '#cdd6f4', lineHeight: 1.6,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', gap: 4, padding: '8px 12px' }}>
                {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#a855f7', animation: `bounce 1s ${i * 0.15}s infinite` }} />)}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '10px 12px', borderTop: '1px solid #1a2d4a', display: 'flex', gap: 8 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Ask about setups, strategies, charts..."
              style={{ flex: 1, background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '7px 10px', color: '#cdd6f4', fontSize: 12, outline: 'none', fontFamily: 'Inter, sans-serif' }} />
            <button onClick={send} disabled={!input.trim() || loading}
              style={{ width: 32, height: 32, borderRadius: 8, background: input.trim() ? 'linear-gradient(135deg, #a855f7, #1e90ff)' : '#0f1f38', border: 'none', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Send size={13} color="#fff" />
            </button>
          </div>

          <style>{`@keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }`}</style>
        </div>
      ) : (
        <button onClick={() => setOpen(true)}
          style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, #a855f7, #1e90ff)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 20px rgba(168,85,247,0.5)', position: 'relative' }}>
          <Bot size={20} color="#fff" />
          <div style={{ position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: '50%', background: '#00d4aa', border: '2px solid #040c14' }} />
        </button>
      )}
    </div>
  )
}
