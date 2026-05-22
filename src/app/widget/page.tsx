'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

const GEMINI_KEY = 'AIzaSyACZjdcSbccKMVF-aYhW-XN5C_w-_gSrj8'

const SYSTEM_PROMPT = `You are an elite trading assistant for YN Finance — think of yourself as a top-tier analyst sitting right next to the trader.

Rules:
- Respond conversationally, like you're talking to a fellow trader over comms — no bullet points, no markdown, no asterisks, no headers
- Be specific, direct, and analytical — give actual levels, actual reasoning, actual opinions
- If asked about a ticker, mention key price levels, trend direction, what you'd watch, and how you'd approach it
- If asked about a concept (FVG, liquidity sweep, R:R, etc.), explain it simply and apply it to a current market context where relevant
- Keep responses to 3-5 sentences unless the question genuinely needs more depth
- Never hedge with "this is not financial advice" — just give the professional read like a desk analyst would
- If you don't know current real-time prices, acknowledge it briefly and give the analytical framework instead
- Sound like a confident professional — calm, clear, specific`

type Msg = { role: 'user' | 'assistant'; text: string; id: number }

const SUGGESTIONS = [
  'What\'s the key level to watch on NQ today?',
  'Explain liquidity sweeps simply',
  'How do I find my R:R quickly?',
  'What makes an FVG high probability?',
  'Is this a good time to trade ES?',
  'Walk me through a clean continuation setup',
]

export default function WidgetPage() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'assistant', text: "What's up — I'm your YN trading assistant. Ask me anything: ticker analysis, key levels, setups, strategy questions, R:R calculations. Voice or type, whatever works.", id: 0 },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [interimText, setInterimText] = useState('')
  const [msgId, setMsgId] = useState(1)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLInputElement>(null)
  const recRef    = useRef<{ stop: () => void } | null>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  // Typewriter effect for latest AI message
  const [displayedLast, setDisplayedLast] = useState('')
  const lastAI = msgs.filter(m => m.role === 'assistant').at(-1)
  useEffect(() => {
    if (!lastAI) return
    setDisplayedLast('')
    let i = 0
    const id = setInterval(() => {
      i++
      setDisplayedLast(lastAI.text.slice(0, i))
      if (i >= lastAI.text.length) clearInterval(id)
    }, 14)
    return () => clearInterval(id)
  }, [lastAI?.id])

  const send = useCallback(async (text: string) => {
    const q = text.trim()
    if (!q || loading) return
    setInput(''); setInterimText('')
    const id = msgId
    setMsgId(p => p + 1)
    setMsgs(p => [...p, { role: 'user', text: q, id }])
    setLoading(true)

    // Build conversation history (skip initial greeting, keep last 8 turns)
    const history = msgs
      .filter((m, i) => i > 0)
      .slice(-8)
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user' as const,
        parts: [{ text: m.text }],
      }))

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
            contents: [...history, { role: 'user', parts: [{ text: q }] }],
            generationConfig: { temperature: 0.75, maxOutputTokens: 600 },
          }),
        }
      )
      const data = await res.json()
      const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
        || "Couldn't reach the AI — check your connection and try again."
      const rid = msgId + 1
      setMsgId(p => p + 1)
      setMsgs(p => [...p, { role: 'assistant', text: reply, id: rid }])
    } catch {
      const rid = msgId + 1
      setMsgId(p => p + 1)
      setMsgs(p => [...p, { role: 'assistant', text: 'Network error — try again.', id: rid }])
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [loading, msgs, msgId])

  const toggleVoice = useCallback(() => {
    if (listening) { recRef.current?.stop(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Voice input requires Chrome or Edge.'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onstart  = () => setListening(true)
    rec.onend    = () => { setListening(false); setInterimText('') }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) final += t
        else interim += t
      }
      setInterimText(interim)
      if (final) { send(final) }
    }
    rec.start()
    recRef.current = rec
  }, [listening, send])

  const showSuggestions = msgs.length === 1

  return (
    <html lang="en">
      <head>
        <title>YN AI — Trading Assistant</title>
        <meta name="viewport" content="width=device-width,initial-scale=1"/>
        <style>{`
          *{box-sizing:border-box;margin:0;padding:0}
          html,body{height:100%;overflow:hidden;background:#030a10;font-family:"Inter",system-ui,sans-serif}
          ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:4px}
          @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
          @keyframes pulse-r{0%,100%{box-shadow:0 0 0 0 rgba(255,45,120,.4)}70%{box-shadow:0 0 0 8px rgba(255,45,120,0)}}
          @keyframes pulse-g{0%,100%{box-shadow:0 0 0 0 rgba(0,212,170,.4)}70%{box-shadow:0 0 0 8px rgba(0,212,170,0)}}
          @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
          @keyframes dot{0%,80%,100%{transform:scale(0)}40%{transform:scale(1)}}
          @keyframes wave{0%,100%{transform:scaleY(0.4)}50%{transform:scaleY(1)}}
        `}</style>
      </head>
      <body style={{ height:'100%', display:'flex', flexDirection:'column', background:'#030a10', color:'#dce8f0' }}>

        {/* HEADER */}
        <div style={{ height:48, display:'flex', alignItems:'center', padding:'0 14px', gap:10, background:'rgba(4,12,20,.95)', borderBottom:'1px solid #0d2030', flexShrink:0 }}>
          {/* YN mark */}
          <svg width={26} height={26} viewBox="0 0 40 40" fill="none" style={{ flexShrink:0 }}>
            <defs><linearGradient id="wg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#00d4aa"/><stop offset="55%" stopColor="#1e90ff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
            <rect width="40" height="40" rx="9" fill="url(#wg)"/>
            <line x1="11" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
            <line x1="29" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
            <line x1="20" y1="20.5" x2="20" y2="32" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
            <circle cx="20" cy="20.5" r="2.2" fill="white" fillOpacity="0.9"/>
          </svg>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:12, fontWeight:800, color:'#dce8f0', letterSpacing:'-.2px', lineHeight:1.1 }}>YN AI Assistant</div>
            <div style={{ fontSize:9, color:'#00d4aa', letterSpacing:'.5px', opacity:.7 }}>TRADING INTELLIGENCE</div>
          </div>
          {/* Live dot */}
          <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:9, color:'#00d4aa', fontFamily:'monospace' }}>
            <span style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:'pulse-g 2s infinite' }}/>
            LIVE
          </div>
        </div>

        {/* MESSAGES */}
        <div style={{ flex:1, overflowY:'auto', padding:'12px 12px 4px', display:'flex', flexDirection:'column', gap:10 }}>
          {msgs.map((m, i) => {
            const isLastAI = m.role === 'assistant' && i === msgs.length - 1
            const text = isLastAI ? displayedLast : m.text
            return (
              <div key={m.id} style={{ display:'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap:6, animation:'fadeUp .25s ease' }}>
                {m.role === 'assistant' && (
                  <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#030a10', marginTop:2 }}>YN</div>
                )}
                <div style={{
                  maxWidth:'82%', padding:'9px 12px', borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#00d4aa,#1e90ff)' : 'rgba(13,30,44,.9)',
                  border: m.role === 'user' ? 'none' : '1px solid rgba(255,255,255,.06)',
                  color: m.role === 'user' ? '#030a10' : '#c8d8e0',
                  fontSize:12.5, lineHeight:1.65, fontWeight: m.role === 'user' ? 600 : 400,
                  boxShadow: m.role === 'user' ? '0 4px 16px rgba(0,212,170,.25)' : '0 4px 12px rgba(0,0,0,.3)',
                }}>
                  {text}
                  {isLastAI && text.length < m.text.length && (
                    <span style={{ display:'inline-block', width:1, height:12, background:'#00d4aa', marginLeft:1, verticalAlign:'middle', animation:'blink .7s step-end infinite' }}/>
                  )}
                </div>
              </div>
            )
          })}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display:'flex', gap:6, animation:'fadeUp .2s ease' }}>
              <div style={{ width:22, height:22, borderRadius:6, background:'linear-gradient(135deg,#00d4aa,#1e90ff)', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#030a10', marginTop:2 }}>YN</div>
              <div style={{ padding:'10px 14px', background:'rgba(13,30,44,.9)', border:'1px solid rgba(255,255,255,.06)', borderRadius:'12px 12px 12px 2px', display:'flex', gap:3, alignItems:'center' }}>
                {[0,1,2].map(i => <span key={i} style={{ width:5, height:5, borderRadius:'50%', background:'#00d4aa', display:'inline-block', animation:`dot 1.4s ease-in-out ${i*.16}s infinite` }}/>)}
              </div>
            </div>
          )}

          {/* Suggestions */}
          {showSuggestions && !loading && (
            <div style={{ marginTop:8 }}>
              <div style={{ fontSize:9, color:'#1a3050', letterSpacing:'1.5px', marginBottom:8, fontFamily:'monospace' }}>QUICK QUESTIONS</div>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    style={{ fontSize:10.5, padding:'6px 10px', background:'rgba(0,212,170,.06)', border:'1px solid rgba(0,212,170,.18)', borderRadius:7, color:'#00d4aa', cursor:'pointer', fontFamily:'inherit', transition:'all .2s', textAlign:'left' }}
                    onMouseEnter={e => { e.currentTarget.style.background='rgba(0,212,170,.14)'; e.currentTarget.style.borderColor='rgba(0,212,170,.4)' }}
                    onMouseLeave={e => { e.currentTarget.style.background='rgba(0,212,170,.06)'; e.currentTarget.style.borderColor='rgba(0,212,170,.18)' }}>
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
          <div style={{ padding:'4px 14px', fontSize:11, color:'#00d4aa', fontStyle:'italic', opacity:.7, background:'rgba(0,212,170,.04)', borderTop:'1px solid rgba(0,212,170,.08)' }}>
            🎤 {interimText}
          </div>
        )}

        {/* INPUT BAR */}
        <div style={{ padding:'10px 12px', borderTop:'1px solid #0d2030', background:'rgba(4,12,20,.95)', flexShrink:0, display:'flex', gap:8, alignItems:'center' }}>
          {/* Mic button */}
          <button onClick={toggleVoice}
            style={{ width:36, height:36, borderRadius:10, border:'none', cursor:'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
              background: listening ? '#ff2d78' : 'rgba(0,212,170,.1)',
              animation: listening ? 'pulse-r 1.2s infinite' : 'none',
            }}>
            {listening ? (
              <div style={{ display:'flex', gap:2, alignItems:'flex-end', height:14 }}>
                {[0,1,2,3,4].map(i => (
                  <div key={i} style={{ width:2.5, background:'#fff', borderRadius:2, animation:`wave 1s ease-in-out ${i*.1}s infinite`, height: [8,12,16,12,8][i] }}/>
                ))}
              </div>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={listening ? '#fff' : '#00d4aa'} strokeWidth="2" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>

          {/* Text input */}
          <input
            ref={inputRef}
            value={interimText || input}
            onChange={e => !interimText && setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder={listening ? 'Listening...' : 'Ask anything about markets, setups, levels...'}
            disabled={listening}
            style={{ flex:1, height:36, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:9, padding:'0 12px', fontSize:12.5, color:'#dce8f0', outline:'none', fontFamily:'inherit', transition:'border-color .2s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,212,170,.35)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.07)'}
          />

          {/* Send button */}
          <button onClick={() => send(input)} disabled={loading || (!input.trim() && !interimText)}
            style={{ width:36, height:36, borderRadius:10, border:'none', cursor: loading || !input.trim() ? 'not-allowed' : 'pointer', flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', transition:'all .2s',
              background: loading || !input.trim() ? 'rgba(255,255,255,.04)' : 'linear-gradient(135deg,#00d4aa,#1e90ff)',
              opacity: loading || !input.trim() ? .4 : 1,
            }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={loading || !input.trim() ? '#4a6a78' : '#030a10'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>

        {/* BOTTOM LABEL */}
        <div style={{ height:20, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(4,12,20,.95)', borderTop:'1px solid rgba(255,255,255,.03)' }}>
          <span style={{ fontSize:8, color:'#0d2030', letterSpacing:'1px', fontFamily:'monospace' }}>YN FINANCE · POWERED BY GEMINI 2.0</span>
        </div>
      </body>
    </html>
  )
}
