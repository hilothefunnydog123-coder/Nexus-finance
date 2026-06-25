'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// Local feature catalog (label + segment color) so this stays a pure client bundle.
const SEG: Record<string, string> = {
  forecaster: '#3b6dff', trader: '#10d693', analyst: '#a855f7', skeptic: '#f5a623',
  spectator: '#ec4899', learner: '#06b6d4', buyer: '#ef4444', explorer: '#7c8aa5',
}
const FEATS: { key: string; label: string; seg: keyof typeof SEG }[] = [
  { key: 'brainstock', label: 'BrainStock', seg: 'forecaster' },
  { key: 'algorithms', label: 'Algorithms', seg: 'trader' },
  { key: 'ai-stocks', label: 'AI Analyzer', seg: 'analyst' },
  { key: 'analyzer', label: 'Trade Analyzer', seg: 'trader' },
  { key: 'war-room', label: 'War Room', seg: 'analyst' },
  { key: 'copilot', label: 'Voice', seg: 'forecaster' },
  { key: 'courses', label: 'Courses', seg: 'learner' },
  { key: 'fork', label: 'Fork', seg: 'forecaster' },
  { key: 'proof', label: 'Proof', seg: 'skeptic' },
  { key: 'performance', label: 'Performance', seg: 'skeptic' },
  { key: 'methodology', label: 'Methodology', seg: 'skeptic' },
  { key: 'fund', label: 'The Fund', seg: 'skeptic' },
  { key: 'galaxy', label: 'Galaxy', seg: 'spectator' },
  { key: 'storm', label: 'Storm', seg: 'spectator' },
  { key: 'the-open', label: 'The Open', seg: 'spectator' },
  { key: 'brain/live', label: 'Enter the Net', seg: 'spectator' },
  { key: 'pricing', label: 'Pricing', seg: 'buyer' },
  { key: 'daily', label: 'Daily Brief', seg: 'buyer' },
]

type Pulse = { ready: boolean; visitorsNow?: number; trending?: { key: string; label: string; heat: number }[]; recent?: { feat: string; ts: string }[] }

export default function TheMind() {
  const cv = useRef<HTMLCanvasElement>(null)
  const [hud, setHud] = useState<{ online: number; trending: { key: string; label: string; heat: number }[]; live: boolean }>({ online: 0, trending: [], live: false })
  const [thoughts, setThoughts] = useState<string[]>([])
  const pulseRef = useRef<Pulse>({ ready: false })
  const lastSeen = useRef<string>('')

  useEffect(() => {
    let alive = true
    const load = () => fetch('/api/brain/pulse').then(r => r.json()).then((p: Pulse) => {
      if (!alive) return
      pulseRef.current = p
      setHud({ online: p.visitorsNow || 0, trending: p.trending || [], live: !!p.ready })
    }).catch(() => {})
    load()
    const id = setInterval(load, 4000)
    return () => { alive = false; clearInterval(id) }
  }, [])

  useEffect(() => {
    const canvas = cv.current!
    const ctx = canvas.getContext('2d')!
    let raf = 0, W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1)

    type Node = { key: string; label: string; col: string; x: number; y: number; bx: number; by: number; glow: number; phase: number }
    type Pulse2 = { a: number; b: number; t: number; col: string; spd: number }
    let nodes: Node[] = []
    let edges: [number, number][] = []
    let pulses: Pulse2[] = []

    function layout() {
      W = canvas.clientWidth; H = canvas.clientHeight
      canvas.width = W * dpr; canvas.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cx = W / 2, cy = H / 2
      const R = Math.min(W, H) * 0.40
      nodes = FEATS.map((f, i) => {
        const ang = (i / FEATS.length) * Math.PI * 2
        const ring = 0.55 + ((i * 7) % 5) / 9   // layered radius for an organic look
        const x = cx + Math.cos(ang) * R * ring + (Math.sin(i * 3.7) * 18)
        const y = cy + Math.sin(ang) * R * ring * 0.82 + (Math.cos(i * 2.3) * 18)
        return { key: f.key, label: f.label, col: SEG[f.seg], x, y, bx: x, by: y, glow: 0, phase: Math.random() * 6.28 }
      })
      // edges: connect each node to its 2 nearest neighbours
      edges = []
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 })).filter(o => o.j !== i).sort((a, b) => a.d - b.d)
        for (let k = 0; k < 2; k++) if (d[k]) edges.push([i, d[k].j])
      }
    }
    layout()
    const onResize = () => layout()
    window.addEventListener('resize', onResize)

    const idx = (key: string) => nodes.findIndex(n => n.key === key)
    function fire(key: string, human = false) {
      const i = idx(key); if (i < 0) return
      nodes[i].glow = 1
      // emit pulses to neighbours
      for (const [a, b] of edges) if (a === i || b === i) pulses.push({ a, b, t: a === i ? 0 : 1, col: nodes[i].col, spd: (0.012 + Math.random() * 0.01) * (a === i ? 1 : -1) })
      if (human && pulseRef.current.ready) {
        const lbl = FEATS.find(f => f.key === key)?.label || key
        const lines = [`a mind is exploring ${lbl}`, `the net lit up on ${lbl}`, `${lbl} just fired`, `attention flowing to ${lbl}`]
        setThoughts(t => [lines[Math.floor(Math.random() * lines.length)], ...t].slice(0, 7))
      }
    }

    let acc = 0
    function tick(dt: number) {
      acc += dt
      // ingest real recent firings (dedupe by latest ts)
      const rec = pulseRef.current.recent || []
      if (rec.length && rec[0].ts !== lastSeen.current) {
        lastSeen.current = rec[0].ts
        rec.slice(0, 5).forEach((r, k) => setTimeout(() => fire(r.feat, true), k * 120))
      }
      // ambient firing, biased toward trending
      if (acc > 240) {
        acc = 0
        const tr = pulseRef.current.trending || []
        let key: string
        if (tr.length && Math.random() < 0.7) key = tr[Math.floor(Math.random() * Math.min(3, tr.length))].key
        else key = FEATS[Math.floor(Math.random() * FEATS.length)].key
        fire(key, false)
      }
    }

    let prev = performance.now()
    function frame(now: number) {
      const dt = now - prev; prev = now
      tick(dt)
      ctx.clearRect(0, 0, W, H)
      // edges
      ctx.lineWidth = 1
      for (const [a, b] of edges) {
        const g = Math.max(nodes[a].glow, nodes[b].glow)
        ctx.strokeStyle = `rgba(120,150,210,${0.05 + g * 0.22})`
        ctx.beginPath(); ctx.moveTo(nodes[a].x, nodes[a].y); ctx.lineTo(nodes[b].x, nodes[b].y); ctx.stroke()
      }
      // pulses
      pulses = pulses.filter(p => p.t >= 0 && p.t <= 1)
      for (const p of pulses) {
        p.t += p.spd
        const x = nodes[p.a].x + (nodes[p.b].x - nodes[p.a].x) * p.t
        const y = nodes[p.a].y + (nodes[p.b].y - nodes[p.a].y) * p.t
        ctx.fillStyle = p.col
        ctx.shadowBlur = 12; ctx.shadowColor = p.col
        ctx.beginPath(); ctx.arc(x, y, 2.4, 0, 6.28); ctx.fill()
        ctx.shadowBlur = 0
        if (p.t >= 1 && Math.random() < 0.25) fire(nodes[p.b].key)   // chained thought
      }
      // nodes
      for (const n of nodes) {
        n.phase += 0.02
        n.x = n.bx + Math.sin(n.phase) * 4; n.y = n.by + Math.cos(n.phase * 0.8) * 4
        n.glow *= 0.96
        const r = 4 + n.glow * 7
        ctx.shadowBlur = 10 + n.glow * 26; ctx.shadowColor = n.col
        ctx.fillStyle = n.col; ctx.globalAlpha = 0.55 + n.glow * 0.45
        ctx.beginPath(); ctx.arc(n.x, n.y, r, 0, 6.28); ctx.fill()
        ctx.globalAlpha = 1; ctx.shadowBlur = 0
        if (n.glow > 0.12) {
          ctx.fillStyle = `rgba(220,235,255,${n.glow})`
          ctx.font = '600 10px ui-monospace, monospace'; ctx.textAlign = 'center'
          ctx.fillText(n.label, n.x, n.y - r - 6)
        }
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(120% 120% at 50% 0%, #06101f, #03060c 70%)', color: '#dfe8ff', overflow: 'hidden', fontFamily: 'ui-monospace, Menlo, monospace' }}>
      <canvas ref={cv} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* top HUD */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: '18px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', pointerEvents: 'none' }}>
        <div>
          <Link href="/" style={{ pointerEvents: 'auto', color: '#7e8db5', fontSize: 12, textDecoration: 'none' }}>← yn finance</Link>
          <h1 style={{ fontSize: 'clamp(22px,4vw,34px)', fontWeight: 900, letterSpacing: '-1px', margin: '6px 0 2px', color: '#eaf1ff' }}>The Mind</h1>
          <div style={{ fontSize: 12, color: '#6f7ea6' }}>the site’s collective brain, learning in real time</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 'clamp(26px,5vw,40px)', fontWeight: 900, color: '#10d693', lineHeight: 1 }}>{hud.online}</div>
          <div style={{ fontSize: 10, letterSpacing: '.16em', color: '#6f7ea6' }}>MINDS ONLINE NOW</div>
          <div style={{ marginTop: 8, fontSize: 10, color: hud.live ? '#10d693' : '#6f7ea6' }}>{hud.live ? '● LIVE NEURAL FEED' : '○ ambient mode'}</div>
        </div>
      </div>

      {/* trending */}
      {!!hud.trending.length && (
        <div style={{ position: 'absolute', left: 22, bottom: 20, maxWidth: 260 }}>
          <div style={{ fontSize: 10, letterSpacing: '.16em', color: '#6f7ea6', marginBottom: 8 }}>🔥 FIRING MOST</div>
          {hud.trending.slice(0, 5).map(t => (
            <div key={t.key} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '3px 0', color: '#c6d2f0' }}>
              <span>{t.label}</span><span style={{ color: '#10d693' }}>{t.heat}</span>
            </div>
          ))}
        </div>
      )}

      {/* thought stream */}
      <div style={{ position: 'absolute', right: 22, bottom: 20, maxWidth: 300, textAlign: 'right' }}>
        {thoughts.map((t, i) => (
          <div key={i} style={{ fontSize: 11.5, color: `rgba(180,200,240,${1 - i * 0.13})`, padding: '2px 0' }}>{t}</div>
        ))}
      </div>
    </div>
  )
}
