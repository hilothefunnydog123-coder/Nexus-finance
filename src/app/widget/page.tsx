'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

type Msg  = { role: 'user' | 'ai'; text: string }
type Mode = 'idle' | 'listening' | 'thinking' | 'speaking'

// ── ANIMATED ORB CANVAS ───────────────────────────────────────────────────────
function OrbCanvas({ mode }: { mode: Mode }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d')!
    let W = c.width  = c.offsetWidth
    let H = c.height = c.offsetHeight
    let t = 0, raf: number

    const ORB_CLR: Record<Mode, string> = {
      idle:      '#00d4aa',
      listening: '#ff2d78',
      thinking:  '#f59e0b',
      speaking:  '#1e90ff',
    }
    const ORB_FILL: Record<Mode, [string, string, string]> = {
      idle:      ['rgba(0,212,170,.18)','rgba(30,144,255,.08)','rgba(168,85,247,.02)'],
      listening: ['rgba(255,45,120,.38)','rgba(255,45,120,.15)','rgba(255,45,120,.02)'],
      thinking:  ['rgba(245,158,11,.28)','rgba(245,158,11,.1)','rgba(245,158,11,.01)'],
      speaking:  ['rgba(30,144,255,.35)','rgba(0,212,170,.18)','rgba(168,85,247,.04)'],
    }

    function draw() {
      ctx.clearRect(0, 0, W, H)
      const cx = W / 2, cy = H / 2
      const r  = Math.min(W, H) * 0.3

      // ── subtle dot grid ─────────────────────────────────────────────────
      const gs = 22
      for (let x = gs; x < W; x += gs) for (let y = gs; y < H; y += gs) {
        ctx.beginPath(); ctx.arc(x, y, .8, 0, Math.PI*2)
        ctx.fillStyle = `rgba(0,212,170,.06)`; ctx.fill()
      }

      // ── ambient outer rings ──────────────────────────────────────────────
      const clr = ORB_CLR[mode]
      for (let i = 4; i >= 1; i--) {
        const pulse = mode === 'idle' ? Math.sin(t * 0.9 + i) * 4 : mode === 'listening' ? Math.sin(t * 5 + i) * 10 : Math.sin(t * 2 + i) * 6
        ctx.beginPath()
        ctx.arc(cx, cy, r + i * 26 + pulse, 0, Math.PI * 2)
        ctx.strokeStyle = `${clr}${Math.floor((0.07 / i) * 255).toString(16).padStart(2,'0')}`
        ctx.lineWidth = 1; ctx.stroke()
      }

      // ── distorted orb silhouette ─────────────────────────────────────────
      const PTS = 160
      ctx.beginPath()
      for (let i = 0; i <= PTS; i++) {
        const angle = (i / PTS) * Math.PI * 2
        let d = 0
        if (mode === 'listening') {
          d = (Math.sin(i / PTS * Math.PI * 14 + t * 7) * 22
             + Math.sin(i / PTS * Math.PI * 6  + t * 4) * 9)
             * (0.5 + Math.random() * 0.9)
        } else if (mode === 'speaking') {
          d = Math.sin(i / PTS * Math.PI * 9  + t * 5) * 13
            + Math.sin(i / PTS * Math.PI * 3  + t * 2) * 5
        } else if (mode === 'thinking') {
          d = Math.sin(i / PTS * Math.PI * 5  + t * 2.5) * 7
        } else {
          d = Math.sin(i / PTS * Math.PI * 2.5 + t * 0.9) * 4
            + Math.sin(i / PTS * Math.PI * 5   + t * 0.5) * 2
        }
        const px = cx + Math.cos(angle) * (r + d)
        const py = cy + Math.sin(angle) * (r + d)
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      }
      ctx.closePath()

      // fill
      const [c0, c1, c2] = ORB_FILL[mode]
      const fg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.3)
      fg.addColorStop(0, c0); fg.addColorStop(0.55, c1); fg.addColorStop(1, c2)
      ctx.fillStyle = fg; ctx.fill()

      // stroke + glow
      ctx.strokeStyle = clr; ctx.lineWidth = mode === 'listening' ? 2.5 : 1.8
      ctx.shadowBlur = 28; ctx.shadowColor = clr; ctx.stroke(); ctx.shadowBlur = 0

      // ── rotating arcs (thinking) ─────────────────────────────────────────
      if (mode === 'thinking') {
        for (let i = 0; i < 4; i++) {
          const ar = r * 0.55 + i * 10
          const as = t * (2.5 + i * 0.7) + i * 1.1
          ctx.beginPath(); ctx.arc(cx, cy, ar, as, as + 1.1)
          ctx.strokeStyle = `rgba(245,158,11,${.7 - i*.14})`;
          ctx.lineWidth = 2.5; ctx.shadowBlur = 10; ctx.shadowColor = '#f59e0b'
          ctx.stroke(); ctx.shadowBlur = 0
        }
      }

      // ── vertical frequency bars (speaking) ───────────────────────────────
      if (mode === 'speaking') {
        const bars = 24, bw = 3, gap = 5
        const totalW = bars * (bw + gap) - gap
        const startX = cx - totalW / 2
        for (let i = 0; i < bars; i++) {
          const h2 = 8 + Math.sin(t * 4 + i * .6) * 12 + Math.sin(t * 7 + i * .3) * 6
          const x2 = startX + i * (bw + gap)
          const barGrad = ctx.createLinearGradient(0, cy - h2, 0, cy + h2)
          barGrad.addColorStop(0,   'rgba(30,144,255,.15)')
          barGrad.addColorStop(0.5, 'rgba(30,144,255,.55)')
          barGrad.addColorStop(1,   'rgba(30,144,255,.15)')
          ctx.fillStyle = barGrad
          ctx.fillRect(x2, cy - h2, bw, h2 * 2)
        }
      }

      // ── centre glow core ─────────────────────────────────────────────────
      const coreR = mode === 'speaking'   ? 16 + Math.sin(t * 4) * 4
                  : mode === 'listening'  ? 12 + Math.sin(t * 8) * 6
                  : mode === 'thinking'   ? 10 + Math.sin(t * 3) * 2
                  :                         11 + Math.sin(t * 1.2) * 2
      const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, coreR)
      cg.addColorStop(0, 'rgba(255,255,255,.98)')
      cg.addColorStop(.35, `${clr}cc`)
      cg.addColorStop(1, 'transparent')
      ctx.beginPath(); ctx.arc(cx, cy, coreR, 0, Math.PI * 2)
      ctx.fillStyle = cg; ctx.shadowBlur = 24; ctx.shadowColor = clr
      ctx.fill(); ctx.shadowBlur = 0

      t += 0.02
      raf = requestAnimationFrame(draw)
    }
    draw()

    const ro = new ResizeObserver(() => {
      W = c.width = c.offsetWidth; H = c.height = c.offsetHeight
    })
    ro.observe(c)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [mode])

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }}/>
}

// ── WIDGET PAGE ───────────────────────────────────────────────────────────────
const SUGGESTIONS = [
  "What's the key level on NQ right now?",
  'Explain FVGs simply',
  'Walk me through a liquidity sweep setup',
  'Is this a good time to trade ES?',
]

export default function WidgetPage() {
  const [msgs,      setMsgs]      = useState<Msg[]>([])
  const [caption,   setCaption]   = useState("I'm listening. Ask me anything about markets, setups, or levels.")
  const [question,  setQuestion]  = useState('')
  const [input,     setInput]     = useState('')
  const [mode,      setMode]      = useState<Mode>('idle')
  const [ttsOn,     setTtsOn]     = useState(true)
  const [interimTx, setInterim]   = useState('')
  const [typedText, setTyped]     = useState('')

  const inputRef  = useRef<HTMLInputElement>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef    = useRef<any>(null)
  const uttRef    = useRef<SpeechSynthesisUtterance | null>(null)

  // ── Typewriter for caption ────────────────────────────────────────────────
  useEffect(() => {
    setTyped('')
    let i = 0
    const iv = setInterval(() => {
      i++; setTyped(caption.slice(0, i))
      if (i >= caption.length) clearInterval(iv)
    }, 18)
    return () => clearInterval(iv)
  }, [caption])

  // ── TTS ───────────────────────────────────────────────────────────────────
  const stopSpeech = useCallback(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    if (mode === 'speaking') setMode('idle')
  }, [mode])

  const speak = useCallback((text: string) => {
    if (!ttsOn || typeof window === 'undefined' || !window.speechSynthesis) return
    window.speechSynthesis.cancel()
    const utter = new SpeechSynthesisUtterance(text)
    utter.rate = 1.05; utter.pitch = 1.0; utter.volume = 1.0
    uttRef.current = utter
    const run = () => {
      const voices = window.speechSynthesis.getVoices()
      const pick = ['Google US English','Microsoft Aria Online (Natural)','Samantha','Alex','Daniel']
      const v = pick.map(n => voices.find(v => v.name === n)).find(Boolean)
              ?? voices.find(v => v.lang.startsWith('en')) ?? null
      if (v) utter.voice = v
      utter.onstart = () => setMode('speaking')
      utter.onend   = () => setMode('idle')
      utter.onerror = () => setMode('idle')
      window.speechSynthesis.speak(utter)
    }
    window.speechSynthesis.getVoices().length ? run()
      : (window.speechSynthesis.onvoiceschanged = () => { run(); window.speechSynthesis.onvoiceschanged = null })
  }, [ttsOn])

  // ── Send message ──────────────────────────────────────────────────────────
  const send = useCallback(async (q: string) => {
    const text = q.trim(); if (!text) return
    stopSpeech()
    setInput(''); setInterim('')
    setQuestion(text)
    setCaption('...')
    setMode('thinking')
    const history = msgs.slice(-6).map(m => ({ role: m.role, text: m.text }))
    setMsgs(p => [...p, { role: 'user', text }])

    try {
      const res  = await fetch('/api/widget-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: text, history }),
      })
      const data = await res.json()
      const reply = data.reply || data.error || 'No response — try again.'
      setMsgs(p => [...p, { role: 'ai', text: reply }])
      setCaption(reply)
      speak(reply)
      if (!ttsOn) setMode('idle')
    } catch (err: unknown) {
      const msg = `Connection error: ${err instanceof Error ? err.message : 'fetch failed'}`
      setCaption(msg)
      setMode('idle')
    }
  }, [msgs, speak, stopSpeech, ttsOn])

  // ── Voice input ───────────────────────────────────────────────────────────
  const toggleVoice = useCallback(() => {
    if (mode === 'listening') { recRef.current?.stop(); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition
    if (!SR) { alert('Voice requires Chrome or Edge.'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any
    rec.continuous = false; rec.interimResults = true; rec.lang = 'en-US'
    rec.onstart  = () => { setMode('listening'); setCaption('Listening...') }
    rec.onend    = () => { setMode(m => m === 'listening' ? 'idle' : m) }
    rec.onerror  = () => { setMode('idle'); setInterim('') }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => {
      let interim = '', final = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const tx = e.results[i][0].transcript
        if (e.results[i].isFinal) final += tx; else interim += tx
      }
      setInterim(interim)
      if (interim) setCaption(interim)
      if (final)   send(final)
    }
    rec.start(); recRef.current = rec
  }, [mode, send])

  const MODE_LABEL: Record<Mode, string> = {
    idle:      'READY',
    listening: 'LISTENING',
    thinking:  'ANALYZING',
    speaking:  'SPEAKING',
  }
  const MODE_CLR: Record<Mode, string> = {
    idle:      '#00d4aa',
    listening: '#ff2d78',
    thinking:  '#f59e0b',
    speaking:  '#1e90ff',
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', background: '#010609' }}>

      {/* HEADER */}
      <div style={{ height: 46, display: 'flex', alignItems: 'center', padding: '0 14px', gap: 10, background: 'rgba(2,8,14,.98)', borderBottom: '1px solid rgba(0,212,170,.1)', flexShrink: 0 }}>
        <svg width={24} height={24} viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
          <defs><linearGradient id="wg" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse"><stop stopColor="#00d4aa"/><stop offset="55%" stopColor="#1e90ff"/><stop offset="100%" stopColor="#a855f7"/></linearGradient></defs>
          <rect width="40" height="40" rx="9" fill="url(#wg)"/>
          <line x1="11" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <line x1="29" y1="8.5" x2="20" y2="20.5" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <line x1="20" y1="20.5" x2="20" y2="32" stroke="white" strokeWidth="3.6" strokeLinecap="round"/>
          <circle cx="20" cy="20.5" r="2.2" fill="white" fillOpacity="0.9"/>
        </svg>

        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#dce8f0', letterSpacing: '-.2px' }}>YN AI</div>
        </div>

        {/* Mode badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 20, background: `${MODE_CLR[mode]}12`, border: `1px solid ${MODE_CLR[mode]}30`, transition: 'all .4s' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: MODE_CLR[mode], display: 'inline-block', animation: mode !== 'idle' ? 'pulse-g 1s infinite' : 'none', transition: 'background .4s' }}/>
          <span style={{ fontSize: 8, fontWeight: 800, color: MODE_CLR[mode], letterSpacing: '1.5px', fontFamily: 'monospace', transition: 'color .4s' }}>{MODE_LABEL[mode]}</span>
        </div>

        {/* TTS toggle */}
        <button onClick={() => { setTtsOn(p => !p); stopSpeech() }}
          title={ttsOn ? 'Mute voice' : 'Enable voice'}
          style={{ width: 30, height: 30, borderRadius: 8, border: `1px solid ${ttsOn ? 'rgba(0,212,170,.3)' : 'rgba(255,255,255,.08)'}`, background: ttsOn ? 'rgba(0,212,170,.1)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
          {ttsOn ? (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#00d4aa" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
            </svg>
          ) : (
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4a6a78" strokeWidth="2" strokeLinecap="round">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          )}
        </button>
      </div>

      {/* ORB */}
      <div style={{ flex: '0 0 240px', position: 'relative' }}>
        <OrbCanvas mode={mode}/>
        {/* Orb mode label overlay */}
        <div style={{ position: 'absolute', bottom: 12, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontSize: 9, color: MODE_CLR[mode], letterSpacing: '2.5px', fontFamily: 'monospace', opacity: .6, transition: 'color .4s' }}>
            {mode === 'idle' ? 'YN INTELLIGENCE PORTAL' : mode === 'listening' ? '● RECORDING' : mode === 'thinking' ? '◈ PROCESSING' : '▶ SPEAKING'}
          </div>
        </div>
      </div>

      {/* CAPTION */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px 20px', overflow: 'hidden', position: 'relative' }}>
        {/* Divider */}
        <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${MODE_CLR[mode]}30,transparent)`, marginBottom: 14, transition: 'background .4s' }}/>

        {/* What was asked */}
        {question && (
          <div style={{ fontSize: 10, color: '#1a3050', fontFamily: 'monospace', marginBottom: 8, letterSpacing: '.5px' }}>
            ▸ {question}
          </div>
        )}

        {/* AI response caption */}
        <div style={{ flex: 1, overflowY: 'auto', fontSize: 14, color: mode === 'listening' ? '#ff6b9d' : '#c8d8e0', lineHeight: 1.75, fontWeight: 400, transition: 'color .4s' }}>
          {typedText}
          {typedText.length < caption.length && (
            <span style={{ display: 'inline-block', width: 1.5, height: 14, background: MODE_CLR[mode], marginLeft: 2, verticalAlign: 'middle', animation: 'blink .7s step-end infinite' }}/>
          )}
        </div>

        {/* Suggestions (idle, no history yet) */}
        {mode === 'idle' && msgs.length === 0 && (
          <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                style={{ fontSize: 10, padding: '5px 9px', background: 'rgba(0,212,170,.05)', border: '1px solid rgba(0,212,170,.15)', borderRadius: 6, color: '#00d4aa', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .2s', textAlign: 'left', lineHeight: 1.3 }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,212,170,.12)'; e.currentTarget.style.borderColor = 'rgba(0,212,170,.35)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,212,170,.05)'; e.currentTarget.style.borderColor = 'rgba(0,212,170,.15)' }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* MIC + INPUT */}
      <div style={{ flexShrink: 0, padding: '12px 16px 10px', background: 'rgba(2,8,14,.98)', borderTop: '1px solid rgba(0,212,170,.08)' }}>
        {/* Big mic button */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <button onClick={toggleVoice}
            style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid ${mode === 'listening' ? '#ff2d78' : 'rgba(0,212,170,.35)'}`, background: mode === 'listening' ? 'rgba(255,45,120,.15)' : 'rgba(0,212,170,.07)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .3s', boxShadow: mode === 'listening' ? '0 0 30px rgba(255,45,120,.4),inset 0 0 20px rgba(255,45,120,.1)' : '0 0 20px rgba(0,212,170,.15),inset 0 0 12px rgba(0,212,170,.06)', animation: mode === 'listening' ? 'pulse-r 1.2s infinite' : 'none' }}>
            {mode === 'listening' ? (
              <div style={{ display: 'flex', gap: 3, alignItems: 'flex-end', height: 20 }}>
                {[8,14,20,14,8].map((h, i) => <div key={i} style={{ width: 3, height: h, background: '#ff2d78', borderRadius: 2, animation: `wave .8s ease-in-out ${i*.1}s infinite` }}/>)}
              </div>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={mode === 'idle' ? '#00d4aa' : MODE_CLR[mode]} strokeWidth="1.8" strokeLinecap="round">
                <rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 12a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/>
              </svg>
            )}
          </button>
          <span style={{ fontSize: 9, color: mode === 'listening' ? '#ff2d78' : '#1a3050', letterSpacing: '1.5px', fontFamily: 'monospace', transition: 'color .3s' }}>
            {mode === 'listening' ? 'LISTENING — TAP TO STOP' : interimTx || 'TAP TO SPEAK'}
          </span>
        </div>

        {/* Text input fallback */}
        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          <input ref={inputRef} value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send(input)}
            placeholder="or type here..."
            disabled={mode === 'listening' || mode === 'thinking'}
            style={{ flex: 1, height: 34, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 8, padding: '0 11px', fontSize: 12, color: '#7a9aaa', outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s' }}
            onFocus={e => e.target.style.borderColor = 'rgba(0,212,170,.28)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,.06)'}
          />
          <button onClick={() => send(input)} disabled={!input.trim() || mode === 'thinking' || mode === 'listening'}
            style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: input.trim() ? 'linear-gradient(135deg,#00d4aa,#1e90ff)' : 'rgba(255,255,255,.04)', cursor: input.trim() ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: input.trim() ? 1 : .35, transition: 'all .2s', flexShrink: 0 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={input.trim() ? '#030a10' : '#4a6a78'} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </div>
      </div>

      {/* FOOTER */}
      <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(2,8,14,.98)' }}>
        <span style={{ fontSize: 8, color: '#0a1a24', letterSpacing: '1.5px', fontFamily: 'monospace' }}>YN INTELLIGENCE PORTAL · GEMINI 2.5</span>
      </div>
    </div>
  )
}
