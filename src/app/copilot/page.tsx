'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mic, MicOff, Send, Volume2, VolumeX } from 'lucide-react'
import TradingViewChart from '@/components/chart/TradingViewChart'

/* ---------- palette ---------- */
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking'

// Common spoken names → tickers (fast path; anything else falls back to symbol search).
const NAME_MAP: Record<string, string> = {
  tesla: 'TSLA', apple: 'AAPL', nvidia: 'NVDA', microsoft: 'MSFT', amazon: 'AMZN',
  google: 'GOOGL', alphabet: 'GOOGL', meta: 'META', facebook: 'META', netflix: 'NFLX',
  amd: 'AMD', intel: 'INTC', 'jp morgan': 'JPM', jpmorgan: 'JPM', disney: 'DIS',
  boeing: 'BA', coinbase: 'COIN', palantir: 'PLTR', 'super micro': 'SMCI', broadcom: 'AVGO',
  'spy': 'SPY', 'the spy': 'SPY', 'qqq': 'QQQ', 'nasdaq': 'QQQ', 'sp 500': 'SPY',
  'sp500': 'SPY', 'bitcoin': 'BTC-USD', ethereum: 'ETH-USD', ford: 'F', uber: 'UBER',
  walmart: 'WMT', starbucks: 'SBUX', 'gamestop': 'GME', 'micro strategy': 'MSTR',
  microstrategy: 'MSTR', robinhood: 'HOOD', sofi: 'SOFI', rivian: 'RIVN', lucid: 'LCID',
}

const FILLER = /\b(what|whats|what's|do|you|think|about|of|the|how|is|are|looking|look|tell|me|should|i|buy|sell|hold|on|a|an|stock|shares|price|going|to|your|read|take|will|going|today|right|now|hey|brainstock|please)\b/gi

export default function Copilot() {
  const [phase, setPhase] = useState<Phase>('idle')
  const [supported, setSupported] = useState(true)
  const [transcript, setTranscript] = useState('')
  const [reply, setReply] = useState('')
  const [ticker, setTicker] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<{ dir: string; pct: number; price: number; dirAcc: number; skill: number } | null>(null)
  const [muted, setMuted] = useState(false)
  const [textInput, setTextInput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const recogRef = useRef<any>(null)
  const mutedRef = useRef(muted)
  mutedRef.current = muted

  // ---- speech synthesis ----
  const speak = useCallback((text: string) => {
    if (mutedRef.current || typeof window === 'undefined' || !window.speechSynthesis) {
      setPhase('idle')
      return
    }
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.rate = 1.02
    u.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    // prefer a crisp English voice
    const pick =
      voices.find((v) => /Google US English|Samantha|Daniel|Microsoft (Aria|Guy|Jenny)/i.test(v.name)) ||
      voices.find((v) => v.lang?.startsWith('en'))
    if (pick) u.voice = pick
    u.onstart = () => setPhase('speaking')
    u.onend = () => setPhase('idle')
    u.onerror = () => setPhase('idle')
    window.speechSynthesis.speak(u)
  }, [])

  // ---- resolve a ticker from a spoken phrase ----
  async function resolveTicker(text: string): Promise<{ symbol: string; name: string } | null> {
    const lower = text.toLowerCase().trim()
    for (const name of Object.keys(NAME_MAP)) {
      if (lower.includes(name)) return { symbol: NAME_MAP[name], name }
    }
    // explicit ticker like "T S L A" or "$TSLA" or a standalone token
    const caps = text.match(/\$?\b([A-Za-z]{1,5})\b/g)?.map((s) => s.replace('$', '').toUpperCase())
    const cleaned = lower.replace(FILLER, ' ').replace(/[^a-z0-9.\- ]/g, ' ').replace(/\s+/g, ' ').trim()
    const query = cleaned || (caps?.[0] ?? '')
    if (!query) return null
    try {
      const r = await fetch(`/api/symbol-search?q=${encodeURIComponent(query)}`)
      const j = await r.json()
      if (j?.results?.length) return { symbol: j.results[0].symbol, name: j.results[0].description || j.results[0].symbol }
    } catch {
      /* ignore */
    }
    return null
  }

  // ---- the brain of the co-pilot ----
  const ask = useCallback(async (question: string) => {
    if (!question.trim()) return
    setError(null)
    setReply('')
    setTicker(null)
    setVerdict(null)
    setTranscript(question)
    setPhase('thinking')

    const resolved = await resolveTicker(question)
    let forecast: any = null
    if (resolved) {
      setTicker(resolved.symbol)
      try {
        const r = await fetch('/api/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ticker: resolved.symbol, horizon: 5 }),
        })
        const j = await r.json()
        if (r.ok && j.history?.length) {
          const price = j.history[j.history.length - 1].price
          const target = j.forecast[j.forecast.length - 1]?.price ?? price
          const pct = +(((target - price) / price) * 100).toFixed(2)
          const v = {
            dir: pct >= 0 ? 'up' : 'down',
            pct: Math.abs(pct),
            price: +price.toFixed(2),
            dirAcc: +(j.metrics.directional_accuracy * 100).toFixed(0),
            skill: +(j.metrics.skill_score * 100).toFixed(1),
          }
          setVerdict(v)
          forecast = { ...v, horizon: 5, dir: v.dir, pct: pct }
        }
      } catch {
        /* forecast optional */
      }
    }

    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'voice_copilot',
          data: { question, ticker: resolved?.symbol, name: resolved?.name, forecast },
        }),
      })
      const j = await r.json()
      const text = j.reply || "I couldn't get a read on that one. Try naming a stock — like 'what do you think of Nvidia?'"
      setReply(text)
      speak(text)
      if (mutedRef.current) setPhase('idle')
    } catch {
      setError('I lost the connection for a second. Try again.')
      setPhase('idle')
    }
  }, [speak])

  // ---- speech recognition ----
  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) {
      setSupported(false)
      return
    }
    const rec = new SR()
    rec.continuous = false
    rec.interimResults = true
    rec.lang = 'en-US'
    rec.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setTranscript(t)
      if (e.results[e.results.length - 1].isFinal) {
        rec.stop()
        ask(t)
      }
    }
    rec.onerror = () => setPhase('idle')
    rec.onend = () => setPhase((p) => (p === 'listening' ? 'idle' : p))
    recogRef.current = rec
    return () => {
      try { rec.abort() } catch { /* noop */ }
    }
  }, [ask])

  // warm up the voice list (some browsers populate async)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.getVoices()
  }, [])

  const startListening = () => {
    setError(null)
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setTranscript('')
    setReply('')
    try {
      recogRef.current?.start()
      setPhase('listening')
    } catch {
      /* already started */
    }
  }
  const stopAll = () => {
    try { recogRef.current?.stop() } catch { /* noop */ }
    if (typeof window !== 'undefined' && window.speechSynthesis) window.speechSynthesis.cancel()
    setPhase('idle')
  }

  const orbColor = phase === 'listening' ? CYAN : phase === 'thinking' ? VIOLET : phase === 'speaking' ? GREEN : '#3b4a63'
  const statusText =
    phase === 'listening' ? 'Listening…' :
    phase === 'thinking' ? 'Reading the tape…' :
    phase === 'speaking' ? 'Speaking' : supported ? 'Tap to talk' : 'Type your question'

  const SUGGESTIONS = ['What do you think of Tesla?', 'How does Nvidia look?', 'Should I watch SPY?', 'Give me your read on Palantir']

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 700px at 50% -10%, rgba(34,211,238,.10), transparent 60%), radial-gradient(900px 600px at 50% 120%, rgba(167,139,250,.12), transparent 55%), #05080f',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes orb-breathe { 0%,100%{ transform:scale(1) } 50%{ transform:scale(1.05) } }
        @keyframes orb-spin { to { transform: rotate(360deg) } }
        @keyframes ring-pulse { 0%{ transform:scale(.9); opacity:.7 } 100%{ transform:scale(1.5); opacity:0 } }
        @keyframes bar { 0%,100%{ transform:scaleY(.3) } 50%{ transform:scaleY(1) } }
        @keyframes fade-up { from{ opacity:0; transform:translateY(10px) } to{ opacity:1; transform:none } }
        .cp-fade{ animation: fade-up .45s ease both }
      `}</style>

      <header style={{ borderBottom: `1px solid ${BORDER}`, background: 'rgba(5,8,15,.7)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 30 }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, borderRadius: 9, background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, display: 'grid', placeItems: 'center', boxShadow: `0 0 16px ${CYAN}55` }}>
              <Volume2 size={16} color="#05080f" />
            </div>
            <div style={{ fontWeight: 700, letterSpacing: -0.3 }}>BrainStock Voice</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={() => setMuted((m) => !m)} title={muted ? 'Unmute' : 'Mute'} style={{ background: 'none', border: 'none', color: muted ? RED : MUTED, cursor: 'pointer', display: 'grid', placeItems: 'center' }}>
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
            <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none' }}>
              <ArrowLeft size={14} /> YN Finance
            </Link>
          </div>
        </div>
      </header>

      <main style={{ flex: 1, maxWidth: 760, width: '100%', margin: '0 auto', padding: '36px 22px 64px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: 'clamp(26px,4.6vw,40px)', fontWeight: 800, letterSpacing: -1.2, margin: 0 }}>
            Just ask the{' '}
            <span style={{ background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>neural net.</span>
          </h1>
          <p style={{ marginTop: 10, color: MUTED, fontSize: 15, maxWidth: 460, lineHeight: 1.55 }}>
            Speak a stock&apos;s name and BrainStock answers out loud — with its real forecast and the chart, live.
          </p>
        </div>

        {/* ---- THE ORB ---- */}
        <button
          onClick={phase === 'idle' ? startListening : stopAll}
          disabled={!supported && phase === 'idle'}
          style={{ position: 'relative', width: 200, height: 200, margin: '38px 0 18px', borderRadius: '50%', border: 'none', background: 'transparent', cursor: supported ? 'pointer' : 'default', display: 'grid', placeItems: 'center' }}
          aria-label="Talk to BrainStock"
        >
          {/* pulse rings while active */}
          {(phase === 'listening' || phase === 'speaking') && (
            <>
              <span style={ring(orbColor, 0)} />
              <span style={ring(orbColor, 0.6)} />
            </>
          )}
          {/* outer rotating ring */}
          <span style={{ position: 'absolute', inset: 8, borderRadius: '50%', border: `2px solid ${orbColor}44`, borderTopColor: orbColor, animation: phase === 'thinking' ? 'orb-spin 1.1s linear infinite' : 'none' }} />
          {/* core */}
          <span
            style={{
              width: 132, height: 132, borderRadius: '50%',
              background: `radial-gradient(circle at 35% 30%, ${orbColor}ee, ${orbColor}55 55%, transparent 72%), radial-gradient(circle at 65% 75%, ${VIOLET}66, transparent 60%)`,
              boxShadow: `0 0 60px ${orbColor}66, inset 0 0 40px ${orbColor}33`,
              animation: phase === 'idle' ? 'orb-breathe 4s ease-in-out infinite' : 'orb-breathe 1.4s ease-in-out infinite',
              display: 'grid', placeItems: 'center',
            }}
          >
            {phase === 'speaking' ? (
              <span style={{ display: 'flex', gap: 4, alignItems: 'center', height: 34 }}>
                {[0, 1, 2, 3, 4].map((i) => (
                  <span key={i} style={{ width: 5, height: 30, borderRadius: 4, background: '#05080f', transformOrigin: 'center', animation: `bar .7s ease-in-out ${i * 0.12}s infinite` }} />
                ))}
              </span>
            ) : phase === 'listening' ? (
              <Mic size={40} color="#05080f" />
            ) : phase === 'thinking' ? (
              <span style={{ fontSize: 13, fontWeight: 800, color: '#05080f', letterSpacing: 1 }}>···</span>
            ) : supported ? (
              <Mic size={40} color="#cdd6e6" />
            ) : (
              <MicOff size={36} color="#cdd6e6" />
            )}
          </span>
        </button>
        <div style={{ fontSize: 13, color: MUTED, letterSpacing: 1, textTransform: 'uppercase', minHeight: 18 }}>{statusText}</div>

        {/* ---- transcript ---- */}
        {transcript && (
          <div className="cp-fade" style={{ marginTop: 24, fontSize: 18, fontWeight: 600, textAlign: 'center', maxWidth: 540, color: '#e7ecf5' }}>
            “{transcript}”
          </div>
        )}

        {/* ---- verdict chip ---- */}
        {verdict && ticker && (
          <div className="cp-fade" style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderRadius: 100, border: `1px solid ${verdict.dir === 'up' ? GREEN : RED}55`, background: `${verdict.dir === 'up' ? GREEN : RED}14` }}>
            <span style={{ fontWeight: 800 }}>${ticker}</span>
            <span style={{ color: MUTED, fontVariantNumeric: 'tabular-nums' }}>${verdict.price.toFixed(2)}</span>
            <span style={{ fontWeight: 800, color: verdict.dir === 'up' ? GREEN : RED }}>
              {verdict.dir === 'up' ? '▲' : '▼'} {verdict.pct}% / 5d
            </span>
            <span style={{ fontSize: 12, color: MUTED }}>acc {verdict.dirAcc}%</span>
          </div>
        )}

        {/* ---- spoken reply ---- */}
        {reply && (
          <div className="cp-fade" style={{ marginTop: 18, fontSize: 17, lineHeight: 1.6, textAlign: 'center', maxWidth: 560, color: '#cdd6e6' }}>
            {reply}
          </div>
        )}

        {error && <div style={{ marginTop: 16, color: '#ffb4b4', fontSize: 14 }}>{error}</div>}

        {/* ---- the chart animates in ---- */}
        {ticker && (
          <div className="cp-fade" style={{ marginTop: 26, width: '100%', borderRadius: 16, overflow: 'hidden', border: `1px solid ${BORDER}`, background: '#040c14', height: 320 }}>
            <TradingViewChart symbol={ticker} interval="60" hideSideToolbar studies={[]} />
          </div>
        )}

        {/* ---- text fallback + suggestions ---- */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (textInput.trim()) { ask(textInput); setTextInput('') } }}
          style={{ marginTop: 30, width: '100%', maxWidth: 520, display: 'flex', gap: 8, alignItems: 'center', borderRadius: 14, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.03)', padding: 6 }}
        >
          <input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder={supported ? 'or type a question…' : 'Type a question, e.g. “What about Tesla?”'}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 15, padding: '10px 12px' }}
          />
          <button type="submit" style={{ display: 'grid', placeItems: 'center', width: 40, height: 40, borderRadius: 10, border: 'none', background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: '#05080f', cursor: 'pointer' }}>
            <Send size={17} />
          </button>
        </form>

        <div style={{ marginTop: 16, display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
          {SUGGESTIONS.map((s) => (
            <button key={s} onClick={() => ask(s)} style={{ fontSize: 12.5, color: '#cdd6e6', background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 100, padding: '7px 13px', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        {!supported && (
          <p style={{ marginTop: 18, fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 460 }}>
            Voice input isn&apos;t supported in this browser — try Chrome or Safari. You can still type your questions above and BrainStock will answer (and speak, if your browser allows).
          </p>
        )}

        <p style={{ marginTop: 28, fontSize: 12, color: MUTED, textAlign: 'center', maxWidth: 520, lineHeight: 1.6 }}>
          BrainStock&apos;s spoken read is a neural-net estimate from real price history — educational, not financial advice. Voice is processed in your browser.
        </p>
      </main>
    </div>
  )
}

function ring(color: string, delay: number): CSSProperties {
  return {
    position: 'absolute', inset: 0, borderRadius: '50%', border: `2px solid ${color}`,
    animation: `ring-pulse 1.8s ease-out ${delay}s infinite`,
  }
}
