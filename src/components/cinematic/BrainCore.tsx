'use client'

/**
 * BrainCore — the neural network as a living brain. ~180 neurons sampled into
 * two hemispheres, wired to neighbors, with signals firing the edges, the whole
 * organ "pumping" like a heartbeat, and neurons flashing green (a correct call)
 * or red (a wrong one) at a rate set by the model's real accuracy.
 */

import { useEffect, useRef } from 'react'

const CYAN: [number, number, number] = [34, 211, 238]
const VIOLET: [number, number, number] = [167, 139, 250]
const GREEN: [number, number, number] = [52, 211, 153]
const RED: [number, number, number] = [248, 113, 133]

export default function BrainCore({ accuracy = 0.55, opacity = 1 }: { accuracy?: number; opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const accRef = useRef(accuracy)
  accRef.current = accuracy

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const dpr = Math.min(2, window.devicePixelRatio || 1)
    let W = 0, H = 0, cx = 0, cy = 0, sx = 1, sy = 1

    type Node = { x: number; y: number; bx: number; by: number; flash: number; fc: [number, number, number]; r: number }
    let nodes: Node[] = []
    let edges: [number, number][] = []
    let outgoing: number[][] = []
    type Pulse = { e: number; t: number; sp: number; col: [number, number, number] }
    let pulses: Pulse[] = []
    const mouse = { x: 0.5, y: 0.5 }

    const inBrain = (x: number, y: number) => {
      const L = ((x + 0.45) / 0.82) ** 2 + (y / 0.96) ** 2 <= 1
      const R = ((x - 0.45) / 0.82) ** 2 + (y / 0.96) ** 2 <= 1
      return (L || R) && Math.abs(x) > 0.045 // fissure down the middle
    }

    function build() {
      W = canvas!.clientWidth; H = canvas!.clientHeight
      canvas!.width = W * dpr; canvas!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      cx = W / 2; cy = H / 2
      const s = Math.min(W, H) * 0.46
      sx = s * 1.25; sy = s
      nodes = []
      let tries = 0
      while (nodes.length < 190 && tries < 6000) {
        tries++
        const x = (Math.random() * 2 - 1) * 1.45
        const y = (Math.random() * 2 - 1) * 1.05
        if (!inBrain(x, y)) continue
        nodes.push({ x: cx + x * sx, y: cy + y * sy, bx: cx + x * sx, by: cy + y * sy, flash: 0, fc: CYAN, r: 1.4 + Math.random() * 2 })
      }
      edges = []; outgoing = nodes.map(() => [])
      nodes.forEach((n, i) => {
        const near = nodes.map((m, j) => ({ j, d: (m.bx - n.bx) ** 2 + (m.by - n.by) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
        for (const o of near) { if (i < o.j) { outgoing[i].push(edges.length); edges.push([i, o.j]) } }
      })
      pulses = []
    }

    const fire = (idx: number) => {
      const outs = outgoing[idx]
      if (outs && outs.length && pulses.length < 300) {
        const e = outs[Math.floor(Math.random() * outs.length)]
        pulses.push({ e, t: 0, sp: 0.02 + Math.random() * 0.03, col: Math.random() < 0.5 ? CYAN : VIOLET })
      }
    }

    let raf = 0, t = 0, fa = 0
    const rgba = (c: [number, number, number], a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a})`
    function frame() {
      t += 0.016
      ctx!.clearRect(0, 0, W, H)
      const pump = reduce ? 1 : 1 + Math.sin(t * 2.2) * 0.025
      const mx = (mouse.x - 0.5) * 10, my = (mouse.y - 0.5) * 10
      for (const n of nodes) { n.x = cx + (n.bx - cx) * pump + mx; n.y = cy + (n.by - cy) * pump + my }

      // edges
      ctx!.lineWidth = 0.6
      ctx!.strokeStyle = 'rgba(120,150,200,.06)'
      ctx!.beginPath()
      for (const [a, b] of edges) { ctx!.moveTo(nodes[a].x, nodes[a].y); ctx!.lineTo(nodes[b].x, nodes[b].y) }
      ctx!.stroke()

      // pulses
      if (!reduce) for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]; p.t += p.sp
        const [a, b] = edges[p.e]
        const x = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t
        const y = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t
        ctx!.fillStyle = rgba(p.col, 0.95); ctx!.shadowBlur = 8; ctx!.shadowColor = rgba(p.col, 0.9)
        ctx!.beginPath(); ctx!.arc(x, y, 1.8, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0
        if (p.t >= 1) { fire(b); pulses.splice(i, 1) }
      }

      // nodes
      for (const n of nodes) {
        const f = n.flash
        const c = f > 0.02 ? n.fc : CYAN
        ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r + f * 4, 0, Math.PI * 2)
        ctx!.fillStyle = rgba(c, 0.2 + f * 0.7)
        if (f > 0.02) { ctx!.shadowBlur = 14 * f; ctx!.shadowColor = rgba(c, f) }
        ctx!.fill(); ctx!.shadowBlur = 0
        n.flash *= 0.95
      }

      // spawn firings + correctness flashes
      if (!reduce) {
        fa += 0.016
        if (fa > 0.05) { fa = 0; for (let k = 0; k < 4; k++) fire(Math.floor(Math.random() * nodes.length)) }
        if (Math.random() < 0.25) { const n = nodes[Math.floor(Math.random() * nodes.length)]; n.flash = 1; n.fc = Math.random() < accRef.current ? GREEN : RED }
      }
      raf = requestAnimationFrame(frame)
    }

    build()
    for (let i = 0; i < 14; i++) fire(Math.floor(Math.random() * nodes.length))
    if (reduce) frame(); else raf = requestAnimationFrame(frame)
    const onR = () => build()
    const onM = (e: MouseEvent) => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight }
    window.addEventListener('resize', onR); window.addEventListener('mousemove', onM)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onR); window.removeEventListener('mousemove', onM) }
  }, [])

  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }} />
}
