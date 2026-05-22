'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Msg = { role: 'user' | 'ai'; text: string; id: number }

const SUGGESTIONS = [
  "What's the key level to watch on NQ today?",
  'Explain liquidity sweeps simply',
  'How do I calculate R:R quickly?',
  'What makes an FVG high probability?',
  'Walk me through a clean continuation setup',
  'What is the EMA cloud strategy?',
]

export default function WidgetPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: "What's up — I'm your YN trading assistant. Ask me anything: ticker analysis, key levels, setups, strategy questions, R:R calculations. Voice or type, whatever works.", id: 0 },
  ])
  const [input, setInput]         = useState('')
  const [loading, setLoading]     = useState(false)
  const [listening, setListening] = useState(false)
  const [speaking, setSpeaking]   = useState(false)
  const [ttsOn, setTtsOn]         = useState(true)
  const [interimText, setInterim] = useState('')
  const [counter, setCounter]     = useState(1)
  const [typingId, setTypingId]   = useState<number | null>(null)
  const [displayed, setDisplayed] = useState<Record<number, string>>({})

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef    = useRef<any>(null)

  // ── TTS helpers ──────────────────────────────────────────────────────────
  const stopSpeech = useCallback(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
    }
  }, [])

  const speak = useCallback((text: string) => {
    if (!ttsOn || typeof window === 'undefined' || !window.speechSynthesis) return
    stopSpeech()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate   = 1.05
    utter.pitch  = 1.0
    utter.volume = 1.0

    // Pick best available voice — prefer natural US English
    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      const preferred = [
        'Google US English', 'Microsoft Aria Online (Natural)', 'Samantha',
        'Alex', 'Daniel', 'Google UK English Female',
      ]
      for (const name of preferred) {
        const v = voices.find(v => v.name === name)
        if (v) return v
      }
      return voices.find(v => v.lang.startsWith('en')) ?? null
    }

    const run = () => {
      const v = pickVoice()
      if (v) utter.voice = v
      utter.onstart = () => setSpeaking(true)
      utter.onend   = () => setSpeaking(false)
      utter.onerror = () => setSpeaking(false)
      window.speechSynthesis.speak(utter)
    }

    // voices may not be loaded yet on first call
    if (window.speechSynthesis.getVoices().length) {
      run()
    } else {
      window.speechSynthesis.onvoiceschanged = () => { run(); window.speechSynthesis.onvoiceschanged = null }
    }
  }, [ttsOn, stopSpeech])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  // Typewriter effect for the most recent AI message
  useEffect(() => {
    const lastAI = [...msgs].reverse().find(m => m.role === 'ai')
    if (!lastAI) return
    setTypingId(lastAI.id)
    setDisplayed(p => ({ ...p, [lastAI.id]: '' }))
    let i = 0
    const iv = setInterval(() => {
      i++
      setDisplayed(p => ({ ...p, [lastAI.id]: lastAI.text.slice(0, i) }))
      if (i >= lastAI.text.length) clearInterval(iv)
    }, 13)
    return () => clearInterval(iv)
  }, [msgs.length]) // only retrigger when a new message is added

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setInput(''); setInterim('')

    const uid = counter
    setCounter(p => p + 1)
    stopSpeech()
    const newMsgs = [...msgs, { role: 'user' as const, text: q, id: uid }]
    setMsgs(newMsgs)
    setLoading(true)

    // Build conversation history for context (skip initial greeting)
    const history = msgs
      .filter((_, i) => i > 0)
      .slice(-8)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'ai', text: m.text }))

    try {
      const res = await fetch('/api/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, history }),
      })
      const data = await res.json()
      const aid = counter + 1
      setCounter(p => p + 1)
      const reply = data.reply || (data.error ? `Error: ${data.error}` : 'No response — try again.')
      setMsgs(p => [...p, { role: 'ai', text: reply, id: aid }])
      speak(reply)
    } catch (err: unknown) {
      const aid = counter + 1
      setCounter(p => p + 1)
      setMsgs(p => [...p, {
        role: 'ai',
        text: `Connection error — check your internet and try again. (${err instanceof Error ? err.message : 'fetch failed'})`,
        id: aid,
      }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 80)
    }
  }, [loading, msgs, counter, speak, stopSpeech])

  const toggleVoice = useCallback(() => {
    if (listening) { recRef.current?.stop(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome or Edge.'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
    rec.onstart  = () => setListening(true)
    rec.onend    = () => { setListening(false); setInterim('') }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t; else interim += t
      }
      setInterim(interim)
      if (final) send(final)
    }
    rec.onerror = () => { setListening(false); setInterim('') }
    rec.start()
    recRef.current = rec
  }, [listening, send])

  const showSuggestions = msgs.length === 1 && !loading

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* HEADER */}
      <div style={{ height: 48, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, background: 'rgba(4,12,20,.97)', borderBottom: '1px solid #0d2030', flexShrink: 0 }}>
        <svg width={26} height={26} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
          <defs><linearGradient id="wg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#00d4aa"/><stop offset="55%" stopColor="#1e90ff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
          <rect width="40" height="40" rx="9" fill="url(#wg)"/>
          <line x1="11" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <line x1="29" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <line x1="20" y1="20.5" x2="20" y2="32" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <circle cx="20" cy="20.5" r="2.2" fill="white" fillOpacity="0.9"/>
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: '#dce8f0', letterSpacing: '-.2px', lineHeight: 1.1 }}>YN AI Assistant</div>
          <div style={{ fontSize: 9, color: '#00d4aa', letterSpacing: '.5px', opacity: .7 }}>TRADING INTELLIGENCE · GEMINI 2.0</div>
        </div>
        {/* Speaking indicator */}
        {speaking && (
          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14, marginRight: 2 }}>
            {[6, 10, 14, 10, 6].map((h, i) => (
              <div key={i} style={{ width: 2, height: h, background: '#00d4aa', borderRadius: 2, animation: `wave 0.8s ease-in-out ${i * .09}s infinite` }}/>
            ))}
          </div>
        )}

        {/* TTS toggle */}
        <button onClick={() => { setTtsOn(p => !p); stopSpeech() }}
          title={ttsOn ? 'Mute voice' : 'Enable voice'}
          style={{ width: 28, height: 28, borderRadius: 7, border: `1px solid ${ttsOn ? 'rgba(0,212,170,.3)' : 'rgba(255,255,255,.08)'}`, background: ttsOn ? 'rgba(0,212,170,.1)' : 'rgba(255,255,255,.03)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', flexShrink: 0 }}>
          {ttsOn ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a6a78" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 9, color: '#00d4aa', fontFamily: 'monospace' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: 'pulse-g 2s infinite' }}/>
          LIVE
        </div>
      </div>

      {/* MESSAGES */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 4px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {msgs.map((m) => {
          const isLastAI = m.role === 'ai' && m.id === typingId
          const text = isLastAI ? (displayed[m.id] ?? '') : m.text
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 6, animation: 'fadeUp .25s ease' }}>
              {m.role === 'ai' && (
                <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#030a10', marginTop: 2 }}>YN</div>
              )}
              <div style={{
                maxWidth: '82%', padding: '9px 12px',
                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: m.role === 'user' ? 'linear-gradient(135deg,#00d4aa,#1e90ff)' : 'rgba(13,30,44,.9)',
                border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.06)',
                color: m.role === 'user' ? '#030a10' : '#c8d8e0',
                fontSize: 12.5, lineHeight: 1.65,
                fontWeight: m.role === 'user' ? 600 : 400,
                boxShadow: m.role === 'user' ? '0 4px 16px rgba(0,212,170,.2)' : '0 4px 12px rgba(0,0,0,.3)',
              }}>
                {text}
                {isLastAI && text.length < m.text.length && (
                  <span style={{ display: 'inline-block', width: 1, height: 12, background: '#00d4aa', marginLeft: 2, verticalAlign: 'middle', animation: 'blink .7s step-end infinite' }}/>
                )}
              </div>
            </div>
          )
        })}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: 'flex', gap: 6, animation: 'fadeUp .2s ease' }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 900, color: '#030a10', marginTop: 2 }}>YN</div>
            <div style={{ padding: '10px 14px', background: 'rgba(13,30,44,.9)', border: '1px solid rgba(255,255,255,.06)', borderRadius: '12px 12px 12px 2px', display: 'flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map(i => <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: `dot 1.4s ease-in-out ${i * .16}s infinite` }}/>)}
            </div>
          </div>
        )}

        {/* Suggestions */}
        {showSuggestions && (
          <div style={{ marginTop: 6 }}>
            <div style={{ fontSize: 9, color: '#1a3050', letterSpacing: '1.5px', marginBottom: 8, fontFamily: 'monospace' }}>QUICK QUESTIONS</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)}
                  style={{ fontSize: 10.5, padding: '6px 10px', background: 'rgba(0,212,170,.06)', border: '1px solid rgba(0,212,170,.18)', borderRadius: 7, color: '#00d4aa', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', textAlign: 'left', lineHeight: 1.4 }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,170,.14)'; e.currentTarget.style.borderColor = 'rgba(0,212,170,.4)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,170,.06)'; e.currentTarget.style.borderColor = 'rgba(0,212,170,.18)' }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef}/>
      </div>

      {/* INTERIM VOICE TEXT */}
      {interimText && (
        <div style={{ padding: '4px 14px', fontSize: 11, color: '#00d4aa', fontStyle: 'italic', opacity: .7, background: 'rgba(0,212,170,.04)', borderTop: '1px solid rgba(0,212,170,.08)' }}>
          🎤 {interimText}
        </div>
      )}

      {/* INPUT BAR */}
      <div style={{ padding: '10px 12px', borderTop: '1px solid #0d2030', background: 'rgba(4,12,20,.97)', flexShrink: 0, display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Mic */}
        <button onClick={toggleVoice}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', background: listening ? '#ff2d78' : 'rgba(0,212,170,.1)', animation: listening ? 'pulse-r 1.2s infinite' : 'none' }}
          title={listening ? 'Stop listening' : 'Voice input'}>
          {listening ? (
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 14 }}>
              {[8, 12, 16, 12, 8].map((h, i) => <div key={i} style={{ width: 2.5, height: h, background: '#fff', borderRadius: 2, animation: `wave 1s ease-in-out ${i * .1}s infinite` }}/>)}
            </div>
          ) : (
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round">
              <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          )}
        </button>

        {/* Input */}
        <input
          ref={inputRef}
          value={interimText || input}
          onChange={e => !interimText && setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && !listening && send(input)}
          placeholder={listening ? 'Listening...' : 'Ask about any ticker, setup, level...'}
          disabled={listening}
          style={{ flex: 1, height: 36, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 9, padding: '0 12px', fontSize: 12.5, color: '#dce8f0', outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s' }}
          onFocus={e => e.target.style.borderColor = 'rgba(0,212,170,.35)'}
          onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.07)'}
        />

        {/* Send */}
        <button onClick={() => send(input)} disabled={loading || !input.trim()}
          style={{ width: 36, height: 36, borderRadius: 10, border: 'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', background: loading || !input.trim() ? 'rgba(255,255,255,.04)' : 'linear-gradient(135deg,#00d4aa,#1e90ff)', opacity: loading || !input.trim() ? .4 : 1 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={loading || !input.trim() ? '#4a6a78' : '#030a10'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>

      {/* FOOTER */}
      <div style={{ height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(4,12,20,.97)', borderTop: '1px solid rgba(255,255,255,.03)' }}>
        <span style={{ fontSize: 8, color: '#0d2030', letterSpacing: '1px', fontFamily: 'monospace' }}>YN FINANCE · GEMINI 2.0 FLASH · VOICE ENABLED</span>
      </div>
    </div>
  )
}
