'use client'

/**
 * Living neural-network background — layered nodes that FIRE signals down their
 * connections, cascading forward like real neurons. Canvas + rAF, GPU-friendly,
 * respects prefers-reduced-motion. Drop it fixed behind a hero.
 */

import { useEffect, useRef } from 'react'

type Node = { x: number; y: number; layer: number; row: number; flash: number; r: number }
type Edge = { a: number; b: number }
type Pulse = { edge: number; t: number; speed: number; hue: number }

const CYAN: [number, number, number] = [34, 211, 238]
const VIOLET: [number, number, number] = [167, 139, 250]

export default function NeuralBg({ opacity = 0.9 }: { opacity?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = 0, H = 0, dpr = Math.min(2, window.devicePixelRatio || 1)
    let nodes: Node[] = []
    let edges: Edge[] = []
    let outgoing: number[][] = [] // edge indices leaving each node
    let pulses: Pulse[] = []
    const mouse = { x: 0.5, y: 0.5 }

    function build() {
      W = canvas!.clientWidth
      H = canvas!.clientHeight
      canvas!.width = W * dpr
      canvas!.height = H * dpr
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)

      const LAYERS = Math.max(5, Math.min(7, Math.round(W / 240)))
      const ROWS = Math.max(4, Math.min(7, Math.round(H / 150)))
      nodes = []
      for (let l = 0; l < LAYERS; l++) {
        for (let r = 0; r < ROWS; r++) {
          const x = (W / (LAYERS - 1)) * l
          const y = (H / (ROWS + 1)) * (r + 1) + (Math.random() - 0.5) * (H / ROWS) * 0.5
          nodes.push({ x, y, layer: l, row: r, flash: 0, r: 1.6 + Math.random() * 1.8 })
        }
      }
      edges = []
      outgoing = nodes.map(() => [])
      nodes.forEach((n, i) => {
        if (n.layer >= LAYERS - 1) return
        // connect to 2-3 nodes in the next layer (nearest by row)
        const next = nodes.map((m, j) => ({ m, j })).filter((o) => o.m.layer === n.layer + 1)
        next.sort((a, b) => Math.abs(a.m.row - n.row) - Math.abs(b.m.row - n.row))
        const k = 2 + (Math.random() < 0.5 ? 1 : 0)
        for (let c = 0; c < k && c < next.length; c++) {
          outgoing[i].push(edges.length)
          edges.push({ a: i, b: next[c].j })
        }
      })
      pulses = []
    }

    function spawnFromInput() {
      const inputs = nodes.map((n, i) => ({ n, i })).filter((o) => o.n.layer === 0)
      const pick = inputs[Math.floor(Math.random() * inputs.length)]
      if (!pick || !outgoing[pick.i].length) return
      fire(pick.i)
    }

    function fire(nodeIdx: number) {
      nodes[nodeIdx].flash = 1
      const outs = outgoing[nodeIdx]
      if (!outs.length) return
      // fire along 1-2 outgoing edges
      const n = 1 + (Math.random() < 0.55 ? 1 : 0)
      for (let i = 0; i < n; i++) {
        const edge = outs[Math.floor(Math.random() * outs.length)]
        if (pulses.length < 260) pulses.push({ edge, t: 0, speed: 0.012 + Math.random() * 0.016, hue: Math.random() })
      }
    }

    let raf = 0
    let acc = 0
    function frame(dt: number) {
      ctx!.clearRect(0, 0, W, H)
      const mx = (mouse.x - 0.5) * 16
      const my = (mouse.y - 0.5) * 16

      // edges
      ctx!.lineWidth = 1
      for (const e of edges) {
        const a = nodes[e.a], b = nodes[e.b]
        ctx!.strokeStyle = 'rgba(120,150,200,0.06)'
        ctx!.beginPath()
        ctx!.moveTo(a.x + mx * (a.layer / 6), a.y + my * (a.layer / 6))
        ctx!.lineTo(b.x + mx * (b.layer / 6), b.y + my * (b.layer / 6))
        ctx!.stroke()
      }

      // pulses
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        p.t += p.speed * (reduce ? 0 : 1)
        const e = edges[p.edge]
        const a = nodes[e.a], b = nodes[e.b]
        const ax = a.x + mx * (a.layer / 6), ay = a.y + my * (a.layer / 6)
        const bx = b.x + mx * (b.layer / 6), by = b.y + my * (b.layer / 6)
        const x = ax + (bx - ax) * p.t
        const y = ay + (by - ay) * p.t
        const col = p.hue < 0.5 ? CYAN : VIOLET
        // trail
        const tx = ax + (bx - ax) * Math.max(0, p.t - 0.16)
        const ty = ay + (by - ay) * Math.max(0, p.t - 0.16)
        const grad = ctx!.createLinearGradient(tx, ty, x, y)
        grad.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},0)`)
        grad.addColorStop(1, `rgba(${col[0]},${col[1]},${col[2]},0.9)`)
        ctx!.strokeStyle = grad
        ctx!.lineWidth = 2
        ctx!.beginPath(); ctx!.moveTo(tx, ty); ctx!.lineTo(x, y); ctx!.stroke()
        // head glow
        ctx!.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.95)`
        ctx!.shadowBlur = 12; ctx!.shadowColor = `rgba(${col[0]},${col[1]},${col[2]},0.9)`
        ctx!.beginPath(); ctx!.arc(x, y, 2.2, 0, Math.PI * 2); ctx!.fill()
        ctx!.shadowBlur = 0
        if (p.t >= 1) { fire(e.b); pulses.splice(i, 1) }
      }

      // nodes
      for (const n of nodes) {
        const nx = n.x + mx * (n.layer / 6), ny = n.y + my * (n.layer / 6)
        const f = n.flash
        const baseCol = n.layer === nodes[nodes.length - 1].layer ? VIOLET : CYAN
        ctx!.beginPath(); ctx!.arc(nx, ny, n.r + f * 3, 0, Math.PI * 2)
        ctx!.fillStyle = `rgba(${baseCol[0]},${baseCol[1]},${baseCol[2]},${0.18 + f * 0.7})`
        if (f > 0.02) { ctx!.shadowBlur = 16 * f; ctx!.shadowColor = `rgba(${baseCol[0]},${baseCol[1]},${baseCol[2]},${f})` }
        ctx!.fill(); ctx!.shadowBlur = 0
        n.flash *= 0.93
      }

      // spawn new input firings on a cadence
      acc += dt
      if (!reduce && acc > 220) { acc = 0; spawnFromInput(); if (Math.random() < 0.5) spawnFromInput() }
    }

    let prev = performance.now()
    function loop(now: number) {
      const dt = now - prev; prev = now
      frame(dt)
      raf = requestAnimationFrame(loop)
    }

    build()
    // seed a few firings
    for (let i = 0; i < 6; i++) spawnFromInput()
    if (reduce) { frame(0) } else raf = requestAnimationFrame(loop)

    const onResize = () => build()
    const onMove = (e: MouseEvent) => { mouse.x = e.clientX / window.innerWidth; mouse.y = e.clientY / window.innerHeight }
    window.addEventListener('resize', onResize)
    window.addEventListener('mousemove', onMove)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('mousemove', onMove) }
  }, [])

  return <canvas ref={ref} aria-hidden style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity, pointerEvents: 'none' }} />
}
