'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, CheckCircle } from 'lucide-react'

interface Slide {
  title: string
  points: string[]
  visual?: string // emoji or icon
  color?: string
}

interface Props {
  title: string
  instructor: string
  color: string
  slides: Slide[]
  onComplete?: () => void
}

export default function InteractiveLecture({ title, instructor, color, slides, onComplete }: Props) {
  const [current, setCurrent] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [revealed, setRevealed] = useState(0)
  const [done, setDone] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null)

  const slide = slides[current]
  const progress = ((current + (revealed / Math.max(slide.points.length, 1))) / slides.length) * 100

  const speak = useCallback((text: string) => {
    if (muted || !('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(text)
    utt.rate = 0.95; utt.pitch = 1.0
    const voices = window.speechSynthesis.getVoices()
    const preferred = voices.find(v => v.name.includes('Google') || v.name.includes('Premium') || v.name.includes('Enhanced'))
    if (preferred) utt.voice = preferred
    synthRef.current = utt
    window.speechSynthesis.speak(utt)
  }, [muted])

  const revealNext = useCallback(() => {
    const s = slides[current]
    if (revealed < s.points.length) {
      setRevealed(r => r + 1)
      speak(s.points[revealed])
    } else if (current < slides.length - 1) {
      setCurrent(c => c + 1)
      setRevealed(0)
      speak(slides[current + 1].title)
    } else {
      setPlaying(false)
      setDone(true)
      onComplete?.()
    }
  }, [current, revealed, slides, speak, onComplete])

  useEffect(() => {
    if (!playing) { if (timerRef.current) clearTimeout(timerRef.current); return }
    timerRef.current = setTimeout(revealNext, 2200)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [playing, revealNext])

  useEffect(() => {
    if (!playing) window.speechSynthesis?.cancel()
    else speak(slide.title)
  }, [playing, current])

  useEffect(() => { return () => window.speechSynthesis?.cancel() }, [])

  const goTo = (idx: number) => {
    window.speechSynthesis?.cancel()
    setCurrent(idx); setRevealed(0); setPlaying(false)
  }

  const toggleMute = () => { setMuted(m => { if (!m) window.speechSynthesis?.cancel(); return !m }) }

  return (
    <div style={{ background: '#000', borderRadius: 16, overflow: 'hidden', border: '1px solid #1a2d4a', fontFamily: 'Inter, sans-serif' }}>
      {/* Video-style header */}
      <div style={{ background: `linear-gradient(135deg, ${color}20, #000)`, padding: '20px 24px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
          {slide.visual || '🎓'}
        </div>
        <div>
          <div style={{ fontSize: 11, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Lecture · {instructor}</div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff' }}>{title}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>
            {current + 1}/{slides.length}
          </span>
        </div>
      </div>

      {/* Main slide area */}
      <div style={{ minHeight: 320, padding: '40px 36px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
        {/* Background subtle grid */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `radial-gradient(${color}15 1px, transparent 1px)`, backgroundSize: '32px 32px', opacity: 0.4 }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Slide number */}
          <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 12 }}>
            Section {current + 1} — {playing ? 'Playing...' : done ? 'Completed ✓' : 'Paused'}
          </div>

          {/* Title */}
          <h2 style={{ fontSize: 'clamp(20px,2.5vw,32px)', fontWeight: 900, color: '#fff', marginBottom: 28, lineHeight: 1.2, letterSpacing: -0.5 }}>
            {slide.title}
          </h2>

          {/* Points reveal */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {slide.points.map((point, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14,
                opacity: i < revealed ? 1 : 0.15,
                transform: i < revealed ? 'none' : 'translateX(-8px)',
                transition: 'all 0.5s ease',
              }}>
                <div style={{ width: 20, height: 20, borderRadius: 6, background: i < revealed ? `${color}30` : '#1a2d4a', border: `1px solid ${i < revealed ? color : '#1a2d4a'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2, transition: 'all 0.3s' }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: i < revealed ? color : '#4a5e7a', transition: 'all 0.3s' }} />
                </div>
                <span style={{ fontSize: 15, color: i < revealed ? '#cdd6f4' : '#4a5e7a', lineHeight: 1.6, transition: 'all 0.3s', fontWeight: i < revealed ? 500 : 400 }}>{point}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Done overlay */}
        {done && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>
            <CheckCircle size={48} color={color} />
            <div style={{ fontWeight: 900, color: '#fff', fontSize: 20, marginTop: 12, marginBottom: 8 }}>Lecture Complete!</div>
            <div style={{ fontSize: 13, color: '#7f93b5' }}>Mark this section as done to continue</div>
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: '#1a2d4a' }}>
        <div style={{ height: '100%', background: `linear-gradient(90deg, ${color}, ${color}80)`, width: `${progress}%`, transition: 'width 0.3s ease' }} />
      </div>

      {/* Controls */}
      <div style={{ padding: '14px 20px', background: '#050d1a', display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Prev */}
        <button onClick={() => goTo(Math.max(0, current - 1))} disabled={current === 0}
          style={{ background: 'none', border: 'none', color: current === 0 ? '#1a2d4a' : '#7f93b5', cursor: current === 0 ? 'not-allowed' : 'pointer', padding: 6 }}>
          <SkipBack size={18} />
        </button>

        {/* Play/Pause */}
        <button onClick={() => { if (done) return; setPlaying(p => !p); if (!playing && revealed === 0) speak(slide.title) }}
          disabled={done}
          style={{ width: 44, height: 44, borderRadius: '50%', background: done ? '#1a2d4a' : color, border: 'none', cursor: done ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: playing ? `0 0 20px ${color}60` : 'none', transition: 'all 0.2s' }}>
          {playing ? <Pause size={20} color="#040c14" /> : <Play size={20} color="#040c14" fill="#040c14" />}
        </button>

        {/* Next */}
        <button onClick={() => { if (current < slides.length - 1) goTo(current + 1) }} disabled={current === slides.length - 1}
          style={{ background: 'none', border: 'none', color: current === slides.length - 1 ? '#1a2d4a' : '#7f93b5', cursor: current === slides.length - 1 ? 'not-allowed' : 'pointer', padding: 6 }}>
          <SkipForward size={18} />
        </button>

        {/* Slide dots */}
        <div style={{ flex: 1, display: 'flex', gap: 6, justifyContent: 'center' }}>
          {slides.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, background: i === current ? color : i < current ? `${color}50` : '#1a2d4a', border: 'none', cursor: 'pointer', transition: 'all 0.3s', padding: 0 }} />
          ))}
        </div>

        {/* Mute */}
        <button onClick={toggleMute}
          style={{ background: 'none', border: 'none', color: muted ? '#4a5e7a' : '#7f93b5', cursor: 'pointer', padding: 6 }}>
          {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>

        {/* Click to advance */}
        {!playing && !done && (
          <button onClick={revealNext}
            style={{ fontSize: 11, color: color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer', fontWeight: 700, whiteSpace: 'nowrap' }}>
            Next Point →
          </button>
        )}
      </div>
    </div>
  )
}

// Helper to create slides from a text section
export function textToSlides(text: string, color: string): Slide[] {
  const lines = text.split('\n').filter(l => l.trim())
  const slides: Slide[] = []
  let current: Slide | null = null

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (current) slides.push(current)
      current = { title: line.slice(2), points: [], color }
    } else if (line.startsWith('## ')) {
      if (current && current.points.length > 0) slides.push(current)
      current = { title: line.slice(3), points: [], color }
    } else if (line.startsWith('- ') && current) {
      current.points.push(line.slice(2).replace(/\*\*/g, ''))
    } else if (line.startsWith('**') && current) {
      current.points.push(line.replace(/\*\*/g, ''))
    } else if (line.trim() && current && !line.startsWith('#')) {
      if (line.length > 20) current.points.push(line.replace(/\*\*/g, ''))
    }
  }
  if (current && current.points.length > 0) slides.push(current)
  return slides.length ? slides : [{ title: 'Key Concepts', points: [text.slice(0, 200)], color }]
}
