'use client'

import { useEffect, useState } from 'react'

// Order tuned for a build-up: world → markets → execution → AI/mind → payoff
const SCENES = [
  { src: '/landing/earth.png',      kb: 'kbA' },
  { src: '/landing/wallst.png',     kb: 'kbB' },
  { src: '/landing/greenchart.png', kb: 'kbA' },
  { src: '/landing/chart.png',      kb: 'kbB' },
  { src: '/landing/growth.png',     kb: 'kbA' },
  { src: '/landing/terminal.png',   kb: 'kbB' },
  { src: '/landing/code.png',       kb: 'kbA' },
  { src: '/landing/aibrain.png',    kb: 'kbB' },
  { src: '/landing/brain.png',      kb: 'kbA' },
  { src: '/landing/aihead.png',     kb: 'kbB' },
  { src: '/landing/cash.png',       kb: 'kbA' },
  { src: '/landing/money.png',      kb: 'kbB' },
]
const SCENE_MS = 1550
const TOTAL = SCENE_MS * SCENES.length

export default function CinematicIntro() {
  const [gone, setGone]     = useState(false)
  const [fading, setFading] = useState(false)

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setGone(true); return }
    const f = setTimeout(() => setFading(true), TOTAL - 350)
    const g = setTimeout(() => setGone(true),  TOTAL + 950)
    return () => { clearTimeout(f); clearTimeout(g) }
  }, [])

  if (gone) return null

  return (
    <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: fading ? 0 : 1, transition: 'opacity 1s cubic-bezier(.4,0,.2,1)' }}>
      <style>{`
        @keyframes ynScene { 0%{opacity:0} 7%{opacity:1} 82%{opacity:1} 100%{opacity:0} }
        @keyframes kbA { 0%{transform:scale(1.16) translate(0,0)} 100%{transform:scale(1.34) translate(-2.5%,-1.5%)} }
        @keyframes kbB { 0%{transform:scale(1.34) translate(2.5%,1.5%)} 100%{transform:scale(1.16) translate(0,0)} }
        @keyframes ynFlash { 0%,100%{opacity:0} 4%{opacity:.55} 16%{opacity:0} }
        @keyframes ynScan { 0%{transform:translateY(-120%)} 100%{transform:translateY(120%)} }
        @keyframes ynBootText { 0%{opacity:0;letter-spacing:8px} 12%{opacity:1;letter-spacing:4px} 80%{opacity:1} 100%{opacity:0} }
      `}</style>

      {/* Montage scenes */}
      {SCENES.map((s, i) => (
        <div key={s.src} style={{ position: 'absolute', inset: 0, opacity: 0, animation: `ynScene ${SCENE_MS}ms ${i * SCENE_MS}ms ease both` }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${s.src})`, backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'saturate(1.15) contrast(1.06) brightness(.92)',
            animation: `${s.kb} ${SCENE_MS + 500}ms ${i * SCENE_MS}ms ease both`,
          }} />
        </div>
      ))}

      {/* Teal cut-flash on every scene change */}
      <div style={{ position: 'absolute', inset: 0, background: '#00d4aa', mixBlendMode: 'overlay', animation: `ynFlash ${SCENE_MS}ms linear infinite` }} />

      {/* Color grade + readability darkening so the hero text stays crisp */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(4,10,18,.5), rgba(4,10,18,.84)), radial-gradient(circle at 50% 38%, rgba(0,212,170,.12), transparent 62%)' }} />

      {/* CRT scanlines */}
      <div style={{ position: 'absolute', inset: 0, opacity: .35, background: 'repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0px, rgba(0,0,0,.22) 1px, transparent 2px, transparent 3px)' }} />

      {/* Sweeping scan bar */}
      <div style={{ position: 'absolute', left: 0, right: 0, height: '45%', background: 'linear-gradient(180deg, transparent, rgba(0,212,170,.07), transparent)', animation: 'ynScan 2.4s linear infinite' }} />

      {/* Vignette */}
      <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 240px 70px rgba(0,0,0,.88)' }} />

      {/* Boot caption — bottom corner, cycles a hype line per scene */}
      <div style={{ position: 'absolute', left: 24, bottom: 22, fontFamily: '"SF Mono",ui-monospace,monospace', fontSize: 11, letterSpacing: '3px', color: '#00d4aa' }}>
        {['SCANNING THE GLOBE','MAPPING WALL STREET','READING THE TAPE','PRICING THE MARKET','MODELING THE EDGE','LIVE EXECUTION','COMPILING STRATEGY','NEURAL ENGINE ONLINE','QUANT INTELLIGENCE','THINKING IN MILLISECONDS','CAPITAL DEPLOYED','OUTPERFORM'].map((t, i) => (
          <span key={t} style={{ position: 'absolute', left: 0, bottom: 0, whiteSpace: 'nowrap', opacity: 0, animation: `ynBootText ${SCENE_MS}ms ${i * SCENE_MS}ms ease both` }}>
            ▶ {t}
          </span>
        ))}
      </div>
    </div>
  )
}
