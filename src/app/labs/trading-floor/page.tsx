'use client'

import { useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft, Loader2 } from 'lucide-react'
import type { DeckAgent } from '@/components/cinematic/CommandDeck'

const CommandDeck = dynamic(() => import('@/components/cinematic/CommandDeck'), { ssr: false, loading: () => <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#46566e', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em' }}>BOOTING THE DECK…</div> })

const AGENTS: DeckAgent[] = [
  { key: 'BULL', name: 'Marcus', emoji: '🐂', color: '#34d399' },
  { key: 'BEAR', name: 'Vera', emoji: '🐻', color: '#f87171' },
  { key: 'QUANT', name: 'Kenji', emoji: '📊', color: '#22d3ee' },
  { key: 'RISK', name: 'Dalia', emoji: '🛡️', color: '#fbbf24' },
  { key: 'CIO', name: 'The CIO', emoji: '⚖️', color: '#a78bfa' },
]
const IDX: Record<string, number> = { BULL: 0, BEAR: 1, QUANT: 2, RISK: 3, CIO: 4 }

type Cap = { name: string; color: string; text: string } | null

export default function TradingFloorPage() {
  const activeRef = useRef<number | null>(null)
  const tickerRef = useRef<string | null>(null)
  const [ticker, setTicker] = useState('NVDA')
  const [loading, setLoading] = useState(false)
  const [caption, setCaption] = useState<Cap>(null)
  const [ruling, setRuling] = useState<string | null>(null)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  const clearTimers = () => { timers.current.forEach(clearTimeout); timers.current = [] }

  const convene = async () => {
    const t = ticker.trim().toUpperCase()
    if (!t) return
    clearTimers(); setRuling(null); setCaption(null); setLoading(true)
    tickerRef.current = t
    try {
      const r = await fetch('/api/gemini', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'war_room', data: { ticker: t, name: t, forecast: null } }) })
      const j = await r.json()
      const raw = (j.reply || j.raw || '').toString().replace(/```/g, '')
      const lines: { who: string; text: string }[] = []
      let rulingText: string | null = null
      for (const ln of raw.split('\n')) {
        const round = ln.trim().match(/^ROUND:\s*([A-Z]+)\s*\|\s*([\s\S]+)$/i)
        if (round && IDX[round[1].toUpperCase()] !== undefined) { lines.push({ who: round[1].toUpperCase(), text: round[2].trim() }); continue }
        const rule = ln.trim().match(/^RULING:\s*([\s\S]+)$/i)
        if (rule) { const p = rule[1].split('|').map((s: string) => s.trim()); rulingText = `${p[0]} · ${p[1]}% conviction · ${p[4] || ''}` }
      }
      setLoading(false)
      if (!lines.length) { setCaption({ name: 'System', color: '#8a93a8', text: 'The committee couldn’t convene on that one — try another ticker.' }); return }

      // play the debate around the deck
      let delay = 0
      lines.forEach((l) => {
        const dur = Math.max(2400, Math.min(6500, l.text.length * 46))
        timers.current.push(setTimeout(() => { activeRef.current = IDX[l.who]; const a = AGENTS[IDX[l.who]]; setCaption({ name: a.name, color: a.color, text: l.text }) }, delay))
        delay += dur
      })
      timers.current.push(setTimeout(() => { activeRef.current = 4; setCaption({ name: 'The CIO', color: '#a78bfa', text: 'Ruling.' }) }, delay))
      timers.current.push(setTimeout(() => { activeRef.current = null; setCaption(null); if (rulingText) setRuling(rulingText) }, delay + 1800))
    } catch {
      setLoading(false); setCaption({ name: 'System', color: '#f87171', text: 'Lost the room for a second. Try again.' })
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(1200px 800px at 50% 20%, #0a1018, #05060b 80%)', overflow: 'hidden' }}>
      <CommandDeck agents={AGENTS} activeRef={activeRef} tickerRef={tickerRef} />

      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', padding: 'clamp(16px,3vw,30px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        {/* top */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.28em', color: '#34d399' }}>● LABS · COMMAND DECK</div>
            <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(1.7rem,3.6vw,2.8rem)', color: '#e7ecf5', marginTop: 8, lineHeight: 1 }}>Step into the war room.</h1>
            <p style={{ color: '#8a93a8', fontSize: 13.5, marginTop: 8, maxWidth: 400, lineHeight: 1.5 }}>Convene the committee and watch five AI minds debate your stock — in the room, under the network. Drag to look around.</p>
          </div>
          <Link href="/labs" style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a93a8', textDecoration: 'none', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', padding: '8px 14px', backdropFilter: 'blur(8px)' }}><ArrowLeft size={14} /> Labs</Link>
        </div>

        {/* caption / ruling */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          {caption && (
            <div style={{ maxWidth: 720, textAlign: 'center', background: 'rgba(5,6,11,.66)', border: `1px solid ${caption.color}44`, backdropFilter: 'blur(10px)', padding: '14px 20px', animation: 'fade .4s ease' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.12em', color: caption.color, marginBottom: 6 }}>{caption.name.toUpperCase()}</div>
              <div style={{ fontSize: 'clamp(14px,1.7vw,17px)', color: '#e7ecf5', lineHeight: 1.5 }}>{caption.text}</div>
            </div>
          )}
          {ruling && <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 800, fontSize: 'clamp(20px,3vw,30px)', color: '#a78bfa', textShadow: '0 0 30px rgba(167,139,250,.5)' }}>{ruling}</div>}

          {/* console */}
          <div style={{ pointerEvents: 'auto', display: 'flex', gap: 10, alignItems: 'center', background: 'rgba(5,6,11,.6)', border: '1px solid rgba(255,255,255,.1)', backdropFilter: 'blur(10px)', padding: 8 }}>
            <span style={{ color: '#22d3ee', fontFamily: 'var(--font-mono)', paddingLeft: 8 }}>$</span>
            <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && convene()} maxLength={8} spellCheck={false} placeholder="NVDA" style={{ width: 110, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, letterSpacing: 1.5, fontWeight: 700, fontFamily: 'var(--font-mono)' }} />
            <button onClick={convene} disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'linear-gradient(135deg,#22d3ee,#a78bfa)', color: '#05060b', padding: '12px 22px', fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>{loading ? <><Loader2 size={15} className="tf-spin" /> Convening…</> : 'Convene the committee'}</button>
          </div>
        </div>
      </div>
      <style>{`@keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1}}@keyframes tf-spin{to{transform:rotate(360deg)}}.tf-spin{animation:tf-spin 1s linear infinite}`}</style>
    </div>
  )
}
