'use client'

/* ════════════════════════════════════════════════════════════════════════
   /the-open — THE OPEN.

   A self-running ~22s cinematic of the day: the net wakes, scans the market,
   slams down its top-conviction calls, and shows the public win rate — scored
   with sound. Pulls today's real picks (/api/daily-picks) and the live track
   record (/api/track-record); falls back to an illustrative reel if the
   backend is quiet. Built to be screen-recorded and posted.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { Play, Pause, RotateCcw, ArrowUpRight } from 'lucide-react'
import { Sonifier } from '@/lib/sonify'

const INK = '#04060d'
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const LINE = 'rgba(255,255,255,.1)'

const DURATION = 22_000

type Pick = { t: string; pct: number; dir: 'up' | 'down' }
const FALLBACK: Pick[] = [
  { t: 'NVDA', pct: 3.1, dir: 'up' }, { t: 'PLTR', pct: 2.4, dir: 'up' }, { t: 'MSFT', pct: 1.6, dir: 'up' },
  { t: 'AMD', pct: -1.8, dir: 'down' }, { t: 'TSLA', pct: 2.0, dir: 'up' }, { t: 'INTC', pct: -1.2, dir: 'down' },
]

export default function TheOpen() {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [done, setDone] = useState(false)
  const [picks, setPicks] = useState<Pick[]>(FALLBACK)
  const [winRate, setWinRate] = useState<number | null>(null)
  const [dateLabel, setDateLabel] = useState('')
  const son = useRef<Sonifier | null>(null)
  const startRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const rafRef = useRef(0)
  const firedRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    son.current = new Sonifier()
    return () => { son.current?.dispose() }
  }, [])

  // real data (best effort)
  useEffect(() => {
    fetch('/api/daily-picks').then((r) => r.json()).then((d) => {
      const raw: unknown[] = Array.isArray(d.picks) ? d.picks : []
      const bears: unknown[] = Array.isArray(d.bears) ? d.bears : []
      const norm = (arr: unknown[], dir: 'up' | 'down') => arr.map((p) => {
        const o = p as Record<string, unknown>
        const t = String(o.ticker ?? o.symbol ?? o.t ?? '').toUpperCase()
        const pct = Number(o.pct ?? o.target_pct ?? o.expected_pct ?? o.move ?? (dir === 'up' ? 2 : -2))
        return { t, pct: Number.isFinite(pct) ? pct : (dir === 'up' ? 2 : -2), dir }
      }).filter((x) => x.t)
      const merged = [...norm(raw, 'up'), ...norm(bears, 'down')].slice(0, 6)
      if (merged.length) setPicks(merged)
      if (d.date) setDateLabel(new Date(d.date).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))
    }).catch(() => {})
    fetch('/api/track-record').then((r) => r.json()).then((d) => {
      if (d?.stats?.winRate != null) setWinRate(Math.round(d.stats.winRate))
      else if (d?.stats?.win_rate != null) setWinRate(Math.round(d.stats.win_rate))
    }).catch(() => {})
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
    son.current?.resume()
    son.current?.startPad()
    rafRef.current = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (startRef.current != null) elapsedRef.current += performance.now() - startRef.current
      startRef.current = null
      son.current?.stopPad()
    }
  }, [playing, tick])

  // sound cues as picks slam in (scene 2 spans ~0.32–0.72)
  useEffect(() => {
    const sceneP = (progress - 0.32) / 0.4
    if (sceneP < 0 || sceneP > 1) return
    const shown = Math.floor(sceneP * picks.length)
    for (let i = 0; i < shown; i++) {
      if (!firedRef.current.has(i)) {
        firedRef.current.add(i)
        const up = picks[i].dir === 'up'
        son.current?.note(up ? 6 + i : 2, { dur: 0.5, type: 'triangle', gain: 0.18 })
      }
    }
  }, [progress, picks])

  const replay = () => { elapsedRef.current = 0; startRef.current = null; firedRef.current.clear(); setProgress(0); setDone(false); setPlaying(true) }
  const toggle = () => { if (done) { replay(); return } setPlaying((p) => !p) }

  // scene boundaries
  const scene = progress < 0.18 ? 'wake' : progress < 0.32 ? 'scan' : progress < 0.74 ? 'calls' : 'proof'
  const secondsLeft = Math.max(0, Math.ceil((1 - progress) * (DURATION / 1000)))

  return (
    <div style={{ minHeight: '100dvh', background: INK, color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes o-rise{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:none}}
        @keyframes o-blink{0%,100%{opacity:1}50%{opacity:.2}}
        @keyframes o-pulse{0%,100%{transform:scale(1);opacity:.8}50%{transform:scale(1.15);opacity:1}}
        .o-in{animation:o-rise .6s cubic-bezier(.16,1,.3,1) both}
        .disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-0.03em}
        .mono{font-family:var(--font-mono),ui-monospace,monospace}
      `}</style>

      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 24px', borderBottom: `1px solid ${LINE}` }}>
        <Link href="/" style={{ color: '#cdd6f4', textDecoration: 'none', fontWeight: 700, fontSize: 15 }}>YN FINANCE</Link>
        <div className="mono" style={{ fontSize: 11, letterSpacing: '0.2em', color: MUTED }}>THE OPEN · {done ? 'COMPLETE' : `${secondsLeft}s`}</div>
      </header>

      <main style={{ flex: 1, display: 'grid', placeItems: 'center', position: 'relative', overflow: 'hidden', padding: 24 }}>
        {/* ambient glow */}
        <div style={{ position: 'absolute', width: 600, height: 600, borderRadius: '50%', background: `radial-gradient(circle, ${CYAN}18, transparent 60%)`, animation: 'o-pulse 4s ease-in-out infinite' }} />

        {scene === 'wake' && (
          <div className="o-in" style={{ textAlign: 'center', position: 'relative' }}>
            <div style={{ width: 90, height: 90, margin: '0 auto 24px', borderRadius: '50%', background: `radial-gradient(circle, #fff, ${CYAN})`, boxShadow: `0 0 80px ${CYAN}`, animation: 'o-pulse 1.6s ease-in-out infinite' }} />
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.3em', color: CYAN, marginBottom: 10 }}>{dateLabel ? dateLabel.toUpperCase() : 'MARKET MORNING'}</div>
            <h1 className="disp" style={{ fontSize: 'clamp(2.4rem,7vw,4.5rem)' }}>The net wakes.</h1>
          </div>
        )}

        {scene === 'scan' && (
          <div className="o-in" style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 14, letterSpacing: '0.2em', color: MUTED, marginBottom: 14 }}>SCANNING THE MARKET</div>
            <div className="disp" style={{ fontSize: 'clamp(3rem,10vw,7rem)', color: CYAN }}>~300</div>
            <div className="mono" style={{ fontSize: 13, color: MUTED, marginTop: 8 }}>symbols ranked by conviction</div>
          </div>
        )}

        {scene === 'calls' && (
          <div style={{ width: 'min(640px,92vw)' }}>
            <div className="mono" style={{ fontSize: 12, letterSpacing: '0.2em', color: VIOLET, marginBottom: 16, textAlign: 'center' }}>TODAY&apos;S TOP CONVICTION CALLS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {picks.map((p, i) => {
                const sceneP = (progress - 0.32) / 0.4
                const shown = sceneP * picks.length
                if (i > shown) return null
                const up = p.dir === 'up'
                const clr = up ? GREEN : RED
                return (
                  <div key={`${p.t}-${i}`} className="o-in" style={{ display: 'grid', gridTemplateColumns: '90px 1fr auto', alignItems: 'center', gap: 16, padding: '14px 18px', border: `1px solid ${clr}40`, borderRadius: 12, background: `${clr}0d` }}>
                    <span className="disp" style={{ fontSize: 26 }}>{p.t}</span>
                    <span style={{ position: 'relative', height: 8, background: 'rgba(255,255,255,.06)', borderRadius: 4 }}>
                      <span style={{ position: 'absolute', inset: 0, transformOrigin: 'left', transform: `scaleX(${Math.min(1, Math.abs(p.pct) / 4)})`, background: clr, borderRadius: 4 }} />
                    </span>
                    <span className="mono" style={{ fontSize: 17, fontWeight: 800, color: clr, minWidth: 110, textAlign: 'right' }}>
                      {up ? '▲ BULL' : '▼ BEAR'} {p.pct >= 0 ? '+' : ''}{p.pct.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {scene === 'proof' && (
          <div className="o-in" style={{ textAlign: 'center' }}>
            <div className="mono" style={{ fontSize: 13, letterSpacing: '0.2em', color: MUTED, marginBottom: 12 }}>GRADED IN PUBLIC</div>
            <div className="disp" style={{ fontSize: 'clamp(3.5rem,12vw,8rem)', color: GREEN }}>{winRate != null ? `${winRate}%` : 'LIVE'}</div>
            <div className="mono" style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{winRate != null ? 'public win rate' : 'every call, scored in the open'}</div>
          </div>
        )}
      </main>

      {/* transport */}
      <div style={{ padding: '16px 24px', borderTop: `1px solid ${LINE}` }}>
        <div style={{ height: 4, background: LINE, borderRadius: 2, marginBottom: 14, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${progress * 100}%`, background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})` }} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#fff', color: INK, border: 'none', borderRadius: 10, padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}>
            {done ? <RotateCcw size={16} /> : playing ? <Pause size={16} /> : <Play size={16} />} {done ? 'Replay' : playing ? 'Pause' : 'Play'}
          </button>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/account" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.06)', border: `1px solid ${LINE}`, color: '#cdd6f4', padding: '11px 18px', fontSize: 14, fontWeight: 700, textDecoration: 'none', borderRadius: 10 }}>
              Save forecasts to your profile
            </Link>
            <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: INK, padding: '11px 20px', fontSize: 14, fontWeight: 800, textDecoration: 'none', borderRadius: 10 }}>
              See today&apos;s real calls <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
