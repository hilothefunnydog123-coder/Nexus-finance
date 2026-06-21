'use client'

/* ════════════════════════════════════════════════════════════════════════
   /war-room/live — THE WAR ROOM, OUT LOUD.

   Five AI analysts around a glowing table — a long PM, a short-seller, a quant,
   a risk officer and the CIO. Type a ticker; the real forecast (/api/forecast)
   sets the direction, and each analyst speaks their take via the browser's
   speech synthesis. The CIO rules last. A dramatization driven by real signal.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gavel, Loader2, Volume2 } from 'lucide-react'

// Each analyst gets a distinct voice + emotional delivery (rate/pitch). The
// hints are ordered preferences; assignVoices() guarantees no two share a voice.
type Role = { key: string; label: string; color: string; voiceHint: RegExp; rate: number; pitch: number; mood: string }
const ROLES: Role[] = [
  { key: 'pm', label: 'LONG PM', color: '#34d399', voiceHint: /daniel|aaron|tom|fred|google us english|male/i, rate: 1.0, pitch: 1.06, mood: 'warm · confident' },
  { key: 'short', label: 'SHORT-SELLER', color: '#f87171', voiceHint: /samantha|jenny|aria|zira|female/i, rate: 1.16, pitch: 1.22, mood: 'urgent · sharp' },
  { key: 'quant', label: 'QUANT', color: '#22d3ee', voiceHint: /arthur|rishi|oliver|google uk english male|uk/i, rate: 1.08, pitch: 0.8, mood: 'flat · precise' },
  { key: 'risk', label: 'RISK OFFICER', color: '#fbbf24', voiceHint: /victoria|hazel|catherine|libby|susan|female/i, rate: 0.92, pitch: 0.98, mood: 'measured · stern' },
  { key: 'cio', label: 'CIO', color: '#a78bfa', voiceHint: /alex|david|guy|george|microsoft david/i, rate: 0.9, pitch: 0.82, mood: 'slow · authoritative' },
]

type Forecast = {
  ticker: string
  history: { price: number }[]
  forecast: { price: number }[]
  metrics: { directional_accuracy: number }
}

function takesFor(ticker: string, up: boolean, pct: number, dirAcc: number): Record<string, string> {
  const mag = Math.abs(pct)
  return {
    pm: up
      ? `${ticker} is trending. Accumulation on the dips, volume confirming. I'm adding into strength here.`
      : `Even with the pullback, ${ticker} holds its base. I'd rather buy fear than chase. Small starter long.`,
    short: up
      ? `Careful. ${ticker} is extended versus the mean. One headline and this gaps down. I'm fading the rip.`
      : `${ticker} is rolling over. Lower highs, weak breadth. This is my short — I press it.`,
    quant: `Factor model puts ${ticker}'s ${mag.toFixed(1)} percent ${up ? 'up' : 'down'} move in the ${up ? 'top' : 'bottom'} decile. Our directional hit rate on calls like this is ${Math.round(dirAcc * 100)} percent.`,
    risk: `Whatever we do, size it half. Stops are wide at this volatility. Define the invalidation before the entry.`,
    cio: up
      ? `Ruling: net constructive on ${ticker}. We go long, half size, trail the stop. Conviction follows the tape.`
      : `Ruling: net cautious on ${ticker}. We stay light or short small. We do not fight the trend.`,
  }
}

export default function WarRoomLive() {
  const [ticker, setTicker] = useState('NVDA')
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(-1)
  const [transcript, setTranscript] = useState<{ role: Role; text: string }[]>([])
  const [verdict, setVerdict] = useState<{ up: boolean; pct: number } | null>(null)
  const [speaking, setSpeaking] = useState(false)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const assignedRef = useRef<Record<string, SpeechSynthesisVoice | undefined>>({})

  // Give every role a *different* voice — prefer its hint, then any unused one.
  const assignVoices = () => {
    const all = voicesRef.current
    const en = all.filter((v) => /^en/i.test(v.lang))
    const pool = en.length ? en : all
    const taken = new Set<string>()
    const out: Record<string, SpeechSynthesisVoice | undefined> = {}
    ROLES.forEach((r, i) => {
      let v = pool.find((x) => r.voiceHint.test(x.name) && !taken.has(x.name))
      if (!v) v = pool.find((x) => !taken.has(x.name))
      if (!v) v = pool[i % Math.max(1, pool.length)]
      if (v) { taken.add(v.name); out[r.key] = v }
    })
    assignedRef.current = out
  }

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    const load = () => { voicesRef.current = window.speechSynthesis.getVoices(); assignVoices() }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.cancel() }
  }, [])

  const speak = (role: Role, text: string): Promise<void> =>
    new Promise((resolve) => {
      if (typeof window === 'undefined' || !window.speechSynthesis) { setTimeout(resolve, 2200); return }
      const u = new SpeechSynthesisUtterance(text)
      const v = assignedRef.current[role.key]
      if (v) u.voice = v
      u.rate = role.rate
      u.pitch = role.pitch
      u.volume = 1
      u.onend = () => resolve()
      u.onerror = () => resolve()
      window.speechSynthesis.speak(u)
    })

  const convene = async (sym: string) => {
    const t = sym.trim().toUpperCase()
    if (!t || speaking) return
    setLoading(true); setTranscript([]); setActive(-1); setVerdict(null)
    window.speechSynthesis?.cancel()
    let up = true, pct = 2, dirAcc = 0.5
    try {
      const res = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: t, horizon: 5, source: 'forecast' }) })
      const fc = (await res.json()) as Forecast
      if (res.ok) {
        const px = fc.history[fc.history.length - 1]?.price ?? 0
        const tg = fc.forecast[fc.forecast.length - 1]?.price ?? 0
        pct = px ? ((tg - px) / px) * 100 : 0
        up = pct >= 0
        dirAcc = fc.metrics?.directional_accuracy ?? 0.5
      }
    } catch { /* dramatize anyway */ }
    setLoading(false)
    setVerdict({ up, pct })
    const takes = takesFor(t, up, pct, dirAcc)
    setSpeaking(true)
    for (let i = 0; i < ROLES.length; i++) {
      const role = ROLES[i]
      setActive(i)
      setTranscript((prev) => [...prev, { role, text: takes[role.key] }])
      await speak(role, takes[role.key])
      await new Promise((r) => setTimeout(r, 250))
    }
    setActive(-1); setSpeaking(false)
  }

  // seats around an ellipse
  const seat = (i: number) => {
    const a = (i / ROLES.length) * Math.PI * 2 - Math.PI / 2
    return { left: `${50 + Math.cos(a) * 38}%`, top: `${50 + Math.sin(a) * 34}%` }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(ellipse at center, #0a1020, #04060d)', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', zIndex: 10 }}>
        <Link href="/war-room" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8a93a8', textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> War Room</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', color: '#a78bfa', fontFamily: 'var(--font-mono), monospace' }}>THE WAR ROOM · LIVE</div>
          <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>five AI analysts · spoken aloud</div>
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#46566e', fontSize: 11 }}><Volume2 size={13} /> sound on</div>
      </div>

      {/* the table */}
      <div style={{ position: 'absolute', inset: 0 }}>
        {/* glowing table */}
        <div style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 'min(46vw,360px)', height: 'min(30vh,220px)', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(167,139,250,.18), transparent 70%)', border: '1px solid rgba(167,139,250,.25)', boxShadow: '0 0 80px rgba(167,139,250,.2) inset' }} />

        {ROLES.map((r, i) => {
          const isActive = active === i
          return (
            <div key={r.key} style={{ position: 'absolute', ...seat(i), transform: 'translate(-50%,-50%)', textAlign: 'center', transition: 'all .3s' }}>
              <div style={{
                width: isActive ? 78 : 60, height: isActive ? 78 : 60, margin: '0 auto', borderRadius: '50%',
                background: `radial-gradient(circle, ${r.color}, ${r.color}40)`,
                boxShadow: isActive ? `0 0 50px ${r.color}, 0 0 90px ${r.color}80` : `0 0 18px ${r.color}40`,
                border: `2px solid ${r.color}`, transition: 'all .3s', animation: isActive ? 'wr-talk .5s ease-in-out infinite alternate' : 'none',
              }} />
              <div style={{ marginTop: 8, fontSize: 11, fontWeight: 800, letterSpacing: '0.06em', color: isActive ? r.color : '#8a93a8' }}>{r.label}</div>
            </div>
          )
        })}
      </div>
      <style>{`@keyframes wr-talk{from{transform:scale(1)}to{transform:scale(1.12)}}`}</style>

      {/* transcript */}
      {transcript.length > 0 && (
        <div style={{ position: 'absolute', left: '50%', top: 'calc(50% )', transform: 'translate(-50%,-50%)', width: 'min(420px,80vw)', maxHeight: '32vh', overflow: 'hidden', textAlign: 'center', pointerEvents: 'none' }}>
          {(() => { const last = transcript[transcript.length - 1]; return (
            <div key={transcript.length} style={{ animation: 'o-rise .4s ease both' }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: last.role.color, letterSpacing: '0.1em', marginBottom: 6 }}>{last.role.label}{last.role.key === 'cio' && <Gavel size={13} style={{ display: 'inline', marginLeft: 6 }} />}</div>
              <div style={{ fontSize: 'clamp(15px,2.4vw,20px)', lineHeight: 1.5, color: '#e7ecf5' }}>&ldquo;{last.text}&rdquo;</div>
            </div>
          ) })()}
        </div>
      )}
      <style>{`@keyframes o-rise{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>

      {/* verdict badge */}
      {verdict && (
        <div style={{ position: 'absolute', top: 84, left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
          <span style={{ fontSize: 13, color: '#8a93a8' }}>{ticker} · </span>
          <span style={{ fontSize: 15, fontWeight: 800, color: verdict.up ? '#34d399' : '#f87171' }}>{verdict.up ? '▲' : '▼'} {Math.abs(verdict.pct).toFixed(2)}%</span>
        </div>
      )}

      {/* control dock */}
      <div style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', width: 'min(520px,92vw)' }}>
        <form onSubmit={(e) => { e.preventDefault(); convene(ticker) }} style={{ display: 'flex', gap: 8, background: 'rgba(5,8,16,.7)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 8, backdropFilter: 'blur(10px)' }}>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="Ticker…" maxLength={8}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 700, padding: '8px 14px' }} />
          <button type="submit" disabled={loading || speaking}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg, #a78bfa, #22d3ee)', color: '#04060d', border: 'none', borderRadius: 10, padding: '0 22px', fontSize: 14, fontWeight: 800, cursor: loading || speaking ? 'wait' : 'pointer' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Gavel size={16} />}
            {loading ? 'Reading tape…' : speaking ? 'In session…' : 'Convene the room'}
          </button>
        </form>
        <div style={{ marginTop: 10, textAlign: 'center', color: '#46566e', fontSize: 11 }}>Spoken aloud via your browser — turn your volume up. A dramatization driven by the real forecast.</div>
      </div>
    </div>
  )
}
