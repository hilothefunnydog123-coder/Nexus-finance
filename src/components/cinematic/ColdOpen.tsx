'use client'

/* ════════════════════════════════════════════════════════════════════════
   ColdOpen — the first-visit title sequence.

   Black screen → a heartbeat → three lines of promise → the brain ignites and
   the site assembles behind it. Plays once per session, fully skippable, and
   respects prefers-reduced-motion. Mount once at the top of the landing page.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'

const LINES = ['300 stocks.', 'Every morning.', 'Graded in public.']
const CYAN = '#22d3ee'

export default function ColdOpen() {
  const [show, setShow] = useState(false)
  const [phase, setPhase] = useState(0) // 0 idle,1..3 lines, 4 ignite, 5 fade
  const [leaving, setLeaving] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    let seen = false
    try { seen = sessionStorage.getItem('yn_coldopen') === '1' } catch {}
    if (seen || reduce) return
    try { sessionStorage.setItem('yn_coldopen', '1') } catch {}
    setShow(true)
    const at = (ms: number, fn: () => void) => { timers.current.push(window.setTimeout(fn, ms)) }
    at(250, () => setPhase(1))
    at(1100, () => setPhase(2))
    at(1900, () => setPhase(3))
    at(2900, () => setPhase(4))
    at(4200, () => finish())
    return () => { timers.current.forEach(clearTimeout) }
  }, [])

  const finish = () => {
    setLeaving(true)
    window.setTimeout(() => setShow(false), 700)
  }

  if (!show) return null

  return (
    <div
      onClick={finish}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999, background: '#04060d', cursor: 'pointer',
        display: 'grid', placeItems: 'center', overflow: 'hidden',
        opacity: leaving ? 0 : 1, transition: 'opacity .7s ease',
        pointerEvents: leaving ? 'none' : 'auto',
      }}
    >
      <style>{`
        @keyframes co-beat{0%,100%{transform:scale(1);opacity:.6}14%{transform:scale(1.35);opacity:1}28%{transform:scale(1)}42%{transform:scale(1.22);opacity:.9}}
        @keyframes co-ignite{0%{transform:scale(.2);opacity:0;filter:blur(20px)}60%{opacity:1}100%{transform:scale(28);opacity:0;filter:blur(0)}}
        @keyframes co-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        @keyframes co-ring{0%{transform:scale(.6);opacity:.8}100%{transform:scale(3);opacity:0}}
      `}</style>

      {/* heartbeat orb (phases 1-3) */}
      {phase >= 1 && phase < 4 && (
        <div style={{ position: 'absolute', width: 120, height: 120 }}>
          <div style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: `radial-gradient(circle, #fff, ${CYAN})`, boxShadow: `0 0 80px ${CYAN}`, animation: 'co-beat 1.1s ease-in-out infinite' }} />
        </div>
      )}

      {/* the lines */}
      <div style={{ position: 'relative', textAlign: 'center', zIndex: 2 }}>
        {phase >= 1 && phase < 4 && (
          <div style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.15 }}>
            {LINES.map((l, i) => (
              <div key={l} style={{
                fontSize: 'clamp(1.8rem,6vw,3.4rem)', color: i === 2 ? CYAN : '#f3f1ea',
                opacity: phase > i ? 1 : 0, animation: phase === i + 1 ? 'co-rise .6s cubic-bezier(.16,1,.3,1) both' : 'none',
                transition: 'opacity .4s',
              }}>{l}</div>
            ))}
          </div>
        )}
      </div>

      {/* ignition */}
      {phase >= 4 && (
        <>
          <div style={{ position: 'absolute', width: 80, height: 80, borderRadius: '50%', background: `radial-gradient(circle, #fff, ${CYAN})`, animation: 'co-ignite 1.3s cubic-bezier(.6,0,.2,1) forwards' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: `2px solid ${CYAN}`, animation: 'co-ring 1.1s ease-out forwards' }} />
        </>
      )}

      <button onClick={(e) => { e.stopPropagation(); finish() }}
        style={{ position: 'absolute', bottom: 26, right: 26, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.15)', color: '#8a93a8', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter, system-ui, sans-serif' }}>
        Skip intro
      </button>
    </div>
  )
}
