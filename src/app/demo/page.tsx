'use client'

/* ════════════════════════════════════════════════════════════════════════
   /demo — the 30-second self-running product tour.
   Five scenes on a single master clock. Auto-plays, shows the loop end to
   end (forecast → analyze → debate → grade → compound), then hands off to
   the real product. Pausable, replayable, skippable. Paper-noir language.

   Content is illustrative of how the product behaves — clearly framed as a
   demo, not presented as live market data.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Play, Pause, RotateCcw, ArrowUpRight, ArrowRight, Volume2 } from 'lucide-react'

const INK = '#0a0a0c'
const BONE = '#f3f1ea'
const PAPER = '#fbfaf7'
const ACCENT = '#1f3bff'
const GREEN = '#0a9d63'
const RED = '#e5484d'
const LINE = 'rgba(10,10,12,.12)'
const MUTE = 'rgba(10,10,12,.6)'

const DURATION = 30_000 // ms, the whole tour

// Scene boundaries as fractions of the timeline.
const SCENES = [
  { key: 'forecast', at: 0.0, tag: '01 · THE FORECASTER', title: 'BrainStock ranks the market' },
  { key: 'analyze', at: 0.2, tag: '02 · THE READ', title: 'A 15-second read on any ticker' },
  { key: 'debate', at: 0.42, tag: '03 · THE DEBATE', title: 'Five AI analysts argue it out' },
  { key: 'grade', at: 0.64, tag: '04 · THE PROOF', title: 'Every call graded in public' },
  { key: 'compound', at: 0.86, tag: '05 · THE FLYWHEEL', title: 'It compounds while you watch' },
] as const

type SceneKey = typeof SCENES[number]['key']

function sceneAt(p: number): SceneKey {
  let cur: SceneKey = SCENES[0].key
  for (const s of SCENES) if (p >= s.at) cur = s.key
  return cur
}

// ── illustrative demo data ──────────────────────────────────────────────
const RANKS = [
  { t: 'NVDA', conv: 0.91, dir: 'up' },
  { t: 'PLTR', conv: 0.84, dir: 'up' },
  { t: 'MSFT', conv: 0.77, dir: 'up' },
  { t: 'AMD', conv: 0.58, dir: 'down' },
  { t: 'INTC', conv: 0.52, dir: 'down' },
] as const

const VERDICT_LINES = [
  'VERDICT — Constructive. Above the 50-day with expanding volume.',
  'CONVICTION — 7/10. Momentum confirmed, breadth supportive.',
  'PAYOFF — ~3.2R to the measured target; invalidation below 118.40.',
]

const ANALYSTS = [
  { role: 'LONG PM', take: 'Trend intact, accumulation on dips. I add here.', side: GREEN },
  { role: 'SHORT-SELLER', take: 'Extended vs. the mean. One miss and it gaps.', side: RED },
  { role: 'QUANT', take: 'Factor momentum top-decile. Vol regime calm.', side: INK },
  { role: 'RISK', take: 'Size it half. Stop is wide at this price.', side: '#b8860b' },
  { role: 'CIO', take: 'Ruling: long, half size, trail the stop. Net constructive.', side: ACCENT },
]

const GRADED = [
  { t: 'NVDA', call: 'Bull · +3.1%', res: 'hit', px: '+3.4%' },
  { t: 'PLTR', call: 'Bull · +2.4%', res: 'hit', px: '+2.9%' },
  { t: 'AMD', call: 'Bear · −1.8%', res: 'miss', px: '+0.6%' },
  { t: 'MSFT', call: 'Bull · +1.5%', res: 'hit', px: '+1.7%' },
] as const

export default function DemoPage() {
  const [progress, setProgress] = useState(0) // 0..1
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const reduced = useRef(false)
  const startRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const rafRef = useRef(0)

  useEffect(() => {
    reduced.current = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduced.current) { setProgress(1); setPlaying(false); setDone(true) }
  }, [])

  const tick = useCallback((now: number) => {
    if (startRef.current == null) startRef.current = now
    const e = elapsedRef.current + (now - startRef.current)
    const p = Math.min(1, e / DURATION)
    setProgress(p)
    if (p >= 1) { setPlaying(false); setDone(true); return }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  useEffect(() => {
    if (!playing) return
    startRef.current = null
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (startRef.current != null) elapsedRef.current += performance.now() - startRef.current
      startRef.current = null
    }
  }, [playing, tick])

  const replay = () => { elapsedRef.current = 0; startRef.current = null; setProgress(0); setDone(false); setPlaying(true) }
  const toggle = () => { if (done) { replay(); return } setPlaying((p) => !p) }
  const jump = (frac: number) => {
    elapsedRef.current = frac * DURATION
    startRef.current = null
    setProgress(frac)
    setDone(false)
  }

  const scene = sceneAt(progress)
  const secondsLeft = Math.max(0, Math.ceil((1 - progress) * (DURATION / 1000)))
  const meta = SCENES.find((s) => s.key === scene)!

  return (
    <div style={{ minHeight: '100dvh', background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes d-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes d-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}
        @keyframes d-blink{0%,100%{opacity:1}50%{opacity:.25}}
        .d-in{animation:d-rise .5s cubic-bezier(.16,1,.3,1) both}
        .disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-0.04em;line-height:1}
        .mono{font-family:var(--font-mono),ui-monospace,monospace}
        @media(prefers-reduced-motion:reduce){.d-in{animation:none}}
      `}</style>

      {/* top bar */}
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px clamp(16px,4vw,32px)', borderBottom: `1px solid ${LINE}` }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
          <span style={{ width: 28, height: 28, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12 }}>YN</span>
          <span className="disp" style={{ fontSize: 16 }}>FINANCE</span>
        </Link>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.18em', color: MUTE }}>PRODUCT TOUR · 30s</div>
        <Link href="/brainstock" style={{ fontSize: 13, fontWeight: 700, color: PAPER, background: INK, padding: '9px 16px', textDecoration: 'none' }}>Skip to app</Link>
      </header>

      {/* stage */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', maxWidth: 1080, width: '100%', margin: '0 auto', padding: 'clamp(20px,4vw,44px) clamp(16px,4vw,32px)' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 16, marginBottom: 22, flexWrap: 'wrap' }}>
          <div>
            <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: ACCENT, marginBottom: 8 }}>{meta.tag}</div>
            <h1 className="disp" style={{ fontSize: 'clamp(1.6rem,4.5vw,2.8rem)' }}>{meta.title}</h1>
          </div>
          <div className="mono" style={{ fontSize: 12, color: MUTE }}>{done ? 'COMPLETE' : `${secondsLeft}s left`}</div>
        </div>

        {/* scene viewport */}
        <div style={{ flex: 1, minHeight: 'clamp(320px,46vh,460px)', border: `1px solid ${LINE}`, background: PAPER, position: 'relative', overflow: 'hidden' }}>
          {scene === 'forecast' && <SceneForecast key="f" />}
          {scene === 'analyze' && <SceneAnalyze key="a" />}
          {scene === 'debate' && <SceneDebate key="d" />}
          {scene === 'grade' && <SceneGrade key="g" />}
          {scene === 'compound' && <SceneCompound key="c" />}
        </div>

        {/* transport */}
        <div style={{ marginTop: 18 }}>
          {/* segmented progress */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {SCENES.map((s, i) => {
              const next = SCENES[i + 1]?.at ?? 1
              const span = next - s.at
              const local = Math.min(1, Math.max(0, (progress - s.at) / span))
              return (
                <button
                  key={s.key}
                  onClick={() => jump(s.at + 0.001)}
                  aria-label={`Jump to ${s.title}`}
                  style={{ flex: span, height: 4, background: LINE, border: 'none', padding: 0, cursor: 'pointer', position: 'relative', overflow: 'hidden' }}
                >
                  <span style={{ position: 'absolute', inset: 0, transformOrigin: 'left', transform: `scaleX(${local})`, background: ACCENT }} />
                </button>
              )
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <button onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} style={btn(true)}>
                {done ? <RotateCcw size={16} /> : playing ? <Pause size={16} /> : <Play size={16} />}
                {done ? 'Replay' : playing ? 'Pause' : 'Play'}
              </button>
              {!done && (
                <button onClick={replay} aria-label="Restart" style={btn(false)}>
                  <RotateCcw size={15} />
                </button>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/copilot" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>
                <Volume2 size={15} /> Or just talk to the market
              </Link>
              <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: ACCENT, color: '#fff', padding: '11px 20px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                See today&apos;s real calls <ArrowUpRight size={16} />
              </Link>
            </div>
          </div>
        </div>

        {/* end card */}
        {done && (
          <div className="d-in" style={{ marginTop: 22, border: `1px solid ${LINE}`, background: INK, color: PAPER, padding: 'clamp(22px,4vw,32px)', display: 'flex', flexWrap: 'wrap', gap: 18, alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div className="disp" style={{ fontSize: 'clamp(1.4rem,3.5vw,2rem)', marginBottom: 6 }}>That&apos;s the loop. Now watch it earn it.</div>
              <p style={{ fontSize: 14.5, color: 'rgba(255,255,255,.6)', maxWidth: 460 }}>Three free analyses. $0.99 courses. No card to start.</p>
            </div>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: PAPER, color: INK, padding: '13px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>See the calls <ArrowRight size={16} /></Link>
              <Link href="/ai-stocks" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: PAPER, border: '1px solid rgba(255,255,255,.4)', padding: '13px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>Analyze a stock</Link>
            </div>
          </div>
        )}

        <p className="mono" style={{ fontSize: 10.5, color: 'rgba(10,10,12,.4)', marginTop: 16, letterSpacing: '0.05em' }}>
          Illustrative tour of how the product works — not live market data. Real, graded calls live on{' '}
          <Link href="/proof" style={{ color: 'rgba(10,10,12,.55)' }}>the proof page</Link>.
        </p>
      </main>
    </div>
  )
}

function btn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer',
    fontSize: 13.5, fontWeight: 700,
    background: primary ? INK : 'transparent', color: primary ? PAPER : INK,
    border: `1px solid ${INK}`, padding: primary ? '10px 18px' : '10px 12px',
  }
}

/* ── scenes ───────────────────────────────────────────────────────────── */

function SceneForecast() {
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div className="mono" style={{ fontSize: 11, color: MUTE, letterSpacing: '0.14em' }}>SCANNED ~300 SYMBOLS · TOP CONVICTION</div>
      {RANKS.map((r, i) => (
        <div key={r.t} className="d-in" style={{ animationDelay: `${i * 110}ms`, display: 'grid', gridTemplateColumns: '64px 1fr auto', alignItems: 'center', gap: 14, borderBottom: `1px solid ${LINE}`, paddingBottom: 12 }}>
          <span className="disp" style={{ fontSize: 18 }}>{r.t}</span>
          <span style={{ position: 'relative', height: 8, background: LINE }}>
            <span style={{ position: 'absolute', inset: 0, transformOrigin: 'left', transform: `scaleX(${r.conv})`, background: r.dir === 'up' ? GREEN : RED }} />
          </span>
          <span className="mono" style={{ fontSize: 13, color: r.dir === 'up' ? GREEN : RED, minWidth: 96, textAlign: 'right' }}>
            {r.dir === 'up' ? '▲ BULL' : '▼ BEAR'} {(r.conv * 100).toFixed(0)}%
          </span>
        </div>
      ))}
    </div>
  )
}

function SceneAnalyze() {
  const [typed, setTyped] = useState('')
  const [lines, setLines] = useState(0)
  useEffect(() => {
    const sym = 'NVDA'
    let i = 0
    const t = setInterval(() => { i++; setTyped(sym.slice(0, i)); if (i >= sym.length) clearInterval(t) }, 130)
    const l = setInterval(() => setLines((n) => (n < VERDICT_LINES.length ? n + 1 : n)), 900)
    return () => { clearInterval(t); clearInterval(l) }
  }, [])
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, border: `1px solid ${INK}`, padding: '12px 16px', maxWidth: 360 }}>
        <span className="mono" style={{ color: MUTE, fontSize: 13 }}>TICKER&gt;</span>
        <span className="disp" style={{ fontSize: 22 }}>{typed}<span style={{ animation: 'd-blink 1s infinite' }}>_</span></span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {VERDICT_LINES.slice(0, lines).map((ln, i) => (
          <div key={i} className="d-in" style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
            <span className="mono" style={{ color: ACCENT, fontSize: 12 }}>›</span>
            <span style={{ fontSize: 'clamp(0.95rem,1.6vw,1.15rem)', lineHeight: 1.5 }}>{ln}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneDebate() {
  const [n, setN] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setN((x) => (x < ANALYSTS.length ? x + 1 : x)), 700)
    return () => clearInterval(t)
  }, [])
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 10, overflow: 'hidden' }}>
      {ANALYSTS.slice(0, n).map((a, i) => {
        const cio = a.role === 'CIO'
        return (
          <div key={a.role} className="d-in" style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 14, alignItems: 'center', padding: '10px 14px', border: `1px solid ${cio ? ACCENT : LINE}`, background: cio ? 'rgba(31,59,255,.05)' : 'transparent' }}>
            <span className="mono" style={{ fontSize: 11, letterSpacing: '0.1em', color: a.side, fontWeight: 700 }}>{a.role}</span>
            <span style={{ fontSize: 'clamp(0.9rem,1.5vw,1.05rem)', lineHeight: 1.45 }}>{a.take}</span>
          </div>
        )
      })}
    </div>
  )
}

function SceneGrade() {
  const hits = GRADED.filter((g) => g.res === 'hit').length
  const rate = Math.round((hits / GRADED.length) * 100)
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(18px,3vw,30px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
        <span className="disp" style={{ fontSize: 'clamp(2.4rem,6vw,3.6rem)', color: GREEN }}>{rate}%</span>
        <span className="mono" style={{ fontSize: 12, color: MUTE }}>WIN RATE · LAST {GRADED.length} GRADED</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {GRADED.map((g, i) => (
          <div key={g.t} className="d-in" style={{ animationDelay: `${i * 120}ms`, display: 'grid', gridTemplateColumns: '64px 1fr auto auto', gap: 14, alignItems: 'center', borderBottom: `1px solid ${LINE}`, paddingBottom: 10 }}>
            <span className="disp" style={{ fontSize: 16 }}>{g.t}</span>
            <span className="mono" style={{ fontSize: 12.5, color: MUTE }}>{g.call}</span>
            <span className="mono" style={{ fontSize: 12.5, color: g.px.startsWith('+') ? GREEN : RED }}>{g.px}</span>
            <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: g.res === 'hit' ? GREEN : RED, minWidth: 44, textAlign: 'right' }}>{g.res === 'hit' ? 'HIT' : 'MISS'}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function SceneCompound() {
  const pts = [8, 14, 12, 20, 26, 24, 33, 41, 38, 50, 58, 66]
  const max = Math.max(...pts)
  const w = 100, h = 100
  const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${(i / (pts.length - 1)) * w} ${h - (p / max) * h}`).join(' ')
  return (
    <div style={{ position: 'absolute', inset: 0, padding: 'clamp(18px,3vw,30px)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'center' }}>
      <div className="d-in">
        <div className="disp" style={{ fontSize: 'clamp(1.3rem,3vw,1.9rem)', marginBottom: 12 }}>Every graded outcome trains the net.</div>
        <p style={{ fontSize: 14.5, lineHeight: 1.6, color: MUTE }}>
          More users, more data, a track record a competitor can&apos;t fast-forward. The edge compounds in the open.
        </p>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: 'min(38vh,220px)', border: `1px solid ${LINE}` }}>
        <path d={`${d} L ${w} ${h} L 0 ${h} Z`} fill="rgba(31,59,255,.08)" />
        <path d={d} fill="none" stroke={ACCENT} strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
