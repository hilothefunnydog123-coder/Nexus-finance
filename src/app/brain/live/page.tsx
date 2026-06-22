'use client'

/* ════════════════════════════════════════════════════════════════════════
   /brain/live — ENTER THE NET.

   A guided, cinematic flythrough THROUGH BrainStock's neural network. Each
   layer is a ring of neurons — a portal — and the camera flies down the axis,
   weaving between neurons, banking through the web of connections, following
   the real forward-pass (from /api/forecast `trace`) as it fires layer by
   layer: input features ignite, signal pulses race the edges, the camera dives
   through every hidden layer, and the output neuron erupts green or red —
   scored live with WebAudio.

   Architecture mirrors the real model: [11 → 16 → 12 → 1].
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { ArrowLeft, Volume2, VolumeX, Zap, Loader2 } from 'lucide-react'
import { FEATURE_NAMES } from '@/lib/nn'
import { Sonifier } from '@/lib/sonify'
import { getQuality } from '@/lib/quality'
import BrainMemory from '@/components/brain/BrainMemory'

const SIZES = [11, 16, 12, 1]
const LAYER_LABELS = ['INPUT · 11 FEATURES', 'HIDDEN LAYER · 16', 'HIDDEN LAYER · 12', 'OUTPUT NEURON']
const GREEN = 0x34d399
const RED = 0xf87171
const CYAN = 0x22d3ee

type Forecast = {
  ticker: string
  history: { date: string; price: number }[]
  forecast: { date: string; price: number }[]
  metrics: { directional_accuracy: number; skill_score: number }
  engine?: 'neural-net' | 'baseline'
  features?: number[]
  trace?: number[][] | null
}

type SceneApi = { fire: (trace: number[][], up: boolean) => void }
const POPULAR = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'PLTR', 'AMD', 'SPY', 'AMZN']

export default function BrainLive() {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const sonRef = useRef<Sonifier | null>(null)
  const phaseRef = useRef<(s: string) => void>(() => {})
  const doneRef = useRef<() => void>(() => {})

  const [ticker, setTicker] = useState('NVDA')
  const [horizon] = useState(5)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Forecast | null>(null)
  const [flyLabel, setFlyLabel] = useState('')
  const [revealed, setRevealed] = useState(false)

  phaseRef.current = (s: string) => setFlyLabel(s)
  doneRef.current = () => { setFlyLabel(''); setRevealed(true) }

  // ── build the scene once ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const Q = getQuality()
    const renderer = new THREE.WebGLRenderer({ antialias: Q.tier !== 'low', alpha: false })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.dprCap))
    renderer.setClearColor(0x04060d, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.32
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x04060d, 0.018)
    const camera = new THREE.PerspectiveCamera(64, mount.clientWidth / mount.clientHeight, 0.1, 600)

    // deep starfield
    const starN = Q.count(1100, 200)
    const starPos = new Float32Array(starN * 3)
    for (let i = 0; i < starN; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 320
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 180
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 320
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x2a3550, size: 0.45, transparent: true, opacity: 0.7 })))

    // ── layer geometry: each layer is a RING of neurons in the Y-Z plane ──
    const GAP = 26
    const RING_R = [7, 8, 6.5, 0]
    const layerX = SIZES.map((_, l) => l * GAP - ((SIZES.length - 1) * GAP) / 2)
    const xEnd = layerX[SIZES.length - 1]

    type Node = {
      mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; glow: THREE.Mesh; glowMat: THREE.MeshBasicMaterial
      core: THREE.Mesh; coreMat: THREE.MeshBasicMaterial
      layer: number; idx: number; pos: THREE.Vector3; act: number; sign: number; base: number; r: number
    }
    const nodes: Node[] = []
    const byLayer: Node[][] = SIZES.map(() => [])

    SIZES.forEach((count, l) => {
      for (let i = 0; i < count; i++) {
        const x = layerX[l]
        let y = 0, z = 0
        if (count > 1) {
          const th = (i / count) * Math.PI * 2 + l * 0.4
          const r = RING_R[l] * (0.82 + 0.18 * Math.sin(i * 2.3 + l))
          y = Math.cos(th) * r
          z = Math.sin(th) * r
        }
        const pos = new THREE.Vector3(x, y, z)
        const r = l === SIZES.length - 1 ? 1.7 : 0.46
        const mat = new THREE.MeshBasicMaterial({ color: 0x12283c })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 22, 22), mat)
        mesh.position.copy(pos); scene.add(mesh)
        // bright inner core
        const coreMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
        const core = new THREE.Mesh(new THREE.SphereGeometry(r * 0.5, 12, 12), coreMat)
        core.position.copy(pos); scene.add(core)
        // additive halo
        const glowMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 2.8, 16, 16), glowMat)
        glow.position.copy(pos); scene.add(glow)
        const node: Node = { mesh, mat, glow, glowMat, core, coreMat, layer: l, idx: i, pos, act: 0, sign: 1, base: Math.random() * Math.PI * 2, r }
        nodes.push(node); byLayer[l].push(node)
      }
    })
    const outputNode = byLayer[SIZES.length - 1][0]

    // ── edges (the web) ──
    const edges: { a: Node; b: Node }[] = []
    for (let l = 0; l < SIZES.length - 1; l++) for (const a of byLayer[l]) for (const b of byLayer[l + 1]) edges.push({ a, b })
    const edgePos = new Float32Array(edges.length * 6)
    edges.forEach((e, i) => {
      edgePos[i * 6] = e.a.pos.x; edgePos[i * 6 + 1] = e.a.pos.y; edgePos[i * 6 + 2] = e.a.pos.z
      edgePos[i * 6 + 3] = e.b.pos.x; edgePos[i * 6 + 4] = e.b.pos.y; edgePos[i * 6 + 5] = e.b.pos.z
    })
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3))
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x163349, transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending })
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat))

    // ── pulse pool (signal traveling along edges) ──
    const PN = Q.count(1000, 240)
    const pPos = new Float32Array(PN * 3).fill(9999)
    const pClr = new Float32Array(PN * 3)
    const pFrom = new Float32Array(PN * 3)
    const pTo = new Float32Array(PN * 3)
    const pT = new Float32Array(PN)
    const pSpd = new Float32Array(PN)
    const pAlive = new Uint8Array(PN)
    const pGeo = new THREE.BufferGeometry()
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color', new THREE.BufferAttribute(pClr, 3))
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.6, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })))
    const spawnPulse = (a: Node, b: Node, color: THREE.Color, intensity: number) => {
      for (let i = 0; i < PN; i++) {
        if (!pAlive[i]) {
          pAlive[i] = 1; pT[i] = 0; pSpd[i] = 0.55 + Math.random() * 0.6
          pFrom[i * 3] = a.pos.x; pFrom[i * 3 + 1] = a.pos.y; pFrom[i * 3 + 2] = a.pos.z
          pTo[i * 3] = b.pos.x; pTo[i * 3 + 1] = b.pos.y; pTo[i * 3 + 2] = b.pos.z
          pClr[i * 3] = color.r * intensity; pClr[i * 3 + 1] = color.g * intensity; pClr[i * 3 + 2] = color.b * intensity
          return
        }
      }
    }

    // ── corridor dust (parallax + speed streaks) ──
    const dN = Q.count(480, 80)
    const dPos = new Float32Array(dN * 3)
    for (let i = 0; i < dN; i++) {
      dPos[i * 3] = layerX[0] - 10 + Math.random() * (xEnd - layerX[0] + 30)
      dPos[i * 3 + 1] = (Math.random() - 0.5) * 22
      dPos[i * 3 + 2] = (Math.random() - 0.5) * 22
    }
    const dGeo = new THREE.BufferGeometry()
    dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3))
    const dMat = new THREE.PointsMaterial({ color: 0x2f4a66, size: 0.32, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false })
    scene.add(new THREE.Points(dGeo, dMat))

    // ── layer title sprites ──
    const makeLabel = (text: string) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 96
      const ctx = cv.getContext('2d')!
      ctx.font = '700 40px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#dfe8ff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(text, 256, 52)
      const tex = new THREE.CanvasTexture(cv)
      const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0, depthWrite: false, depthTest: false })
      const sp = new THREE.Sprite(mat)
      sp.scale.set(16, 3, 1)
      scene.add(sp)
      return { sp, mat }
    }
    const labels = LAYER_LABELS.map((t, l) => {
      const o = makeLabel(t)
      o.sp.position.set(layerX[l], (RING_R[l] || 4) + 4, 0)
      return { ...o, layer: l, hot: 0 }
    })

    // output shockwave
    const shockMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    const shock = new THREE.Mesh(new THREE.RingGeometry(1.8, 2.4, 72), shockMat)
    shock.position.copy(outputNode.pos)
    scene.add(shock)
    let shockProg = 1

    // ── cinematic camera path (Catmull-Rom through the rings) ──
    const weave = [{ y: 3.4, z: 3.0 }, { y: -4.2, z: -2.6 }, { y: 3.6, z: -3.4 }, { y: -2.2, z: 3.0 }]
    const cp: THREE.Vector3[] = []
    cp.push(new THREE.Vector3(layerX[0] - 30, 9, 36))   // establish, high & wide
    cp.push(new THREE.Vector3(layerX[0] - 14, 4, 16))   // approach
    SIZES.forEach((_, l) => {
      const w = weave[l]
      cp.push(new THREE.Vector3(layerX[l] - 7, w.y * 0.45, w.z * 0.45))  // mouth of the ring
      cp.push(new THREE.Vector3(layerX[l], w.y, w.z))                    // weave through the neurons
    })
    cp.push(new THREE.Vector3(xEnd - 6, 1.6, 5.5))      // approach output
    cp.push(new THREE.Vector3(xEnd - 2.4, 1.2, 3.6))    // hero close-up
    cp.push(new THREE.Vector3(xEnd + 5, 3.2, 12))       // pull back for the reveal
    const curve = new THREE.CatmullRomCurve3(cp, false, 'catmullrom', 0.35)
    // approximate arc-length param u for each layer's "through" waypoint
    const arrival = [0.17, 0.41, 0.63, 0.85]

    camera.position.copy(cp[0])

    // ── firing state ──
    let firing = false
    let fireStart = 0
    let traceData: number[][] | null = null
    let upDir = true
    const firedLayer = new Array(SIZES.length).fill(false)
    const FLY_MS = 15000
    const HOLD_MS = 2000

    const cGreen = new THREE.Color(GREEN), cRed = new THREE.Color(RED), cCyan = new THREE.Color(CYAN)
    const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)

    const setLayerActivations = (l: number, vals: number[]) => {
      byLayer[l].forEach((n, i) => {
        const v = vals[i] ?? 0
        n.act = Math.min(1, Math.abs(v) * (l === 0 ? 1.1 : 1.7) + 0.14)
        n.sign = v >= 0 ? 1 : -1
      })
    }
    const fireLayer = (l: number) => {
      firedLayer[l] = true
      setLayerActivations(l, traceData?.[l] ?? [])
      labels.forEach((lb) => { if (lb.layer === l) lb.hot = 1 })
      phaseRef.current?.(LAYER_LABELS[l])
      if (l < SIZES.length - 1) {
        byLayer[l].forEach((a) => {
          if (a.act < 0.22) return
          byLayer[l + 1].forEach((b) => {
            if (Math.random() < a.act * 0.8) spawnPulse(a, b, a.sign > 0 ? cGreen : cRed, 0.6 + a.act)
          })
        })
        sonRef.current?.note(2 + l, { dur: 0.45, type: 'triangle', gain: 0.2 })
      } else {
        shockProg = 0; shockMat.color.set(upDir ? GREEN : RED)
        outputNode.act = 1; outputNode.sign = upDir ? 1 : -1
        const col = upDir ? cGreen : cRed
        byLayer[SIZES.length - 2].forEach((a) => spawnPulse(a, outputNode, col, 1.6))
        sonRef.current?.chord(upDir)
        doneRef.current?.()
      }
    }

    apiRef.current = {
      fire: (trace, up) => {
        traceData = trace; upDir = up; firing = true; fireStart = performance.now()
        firedLayer.fill(false); shockProg = 1
        nodes.forEach((n) => { n.act = 0 })
        labels.forEach((lb) => { lb.hot = 0 })
        phaseRef.current?.('ENTERING THE NET…')
      },
    }

    const lookTmp = new THREE.Vector3()
    const posTmp = new THREE.Vector3()
    let t = 0, raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (document.hidden) return // pause heavy work when tab is backgrounded
      t += 0.016

      // firing progression along the path
      if (firing && traceData) {
        const elapsed = performance.now() - fireStart
        const raw = Math.min(1, elapsed / FLY_MS)
        const u = easeInOut(raw)
        for (let l = 0; l < SIZES.length; l++) if (!firedLayer[l] && u >= arrival[l]) fireLayer(l)

        curve.getPointAt(Math.min(0.999, u), posTmp)
        camera.position.lerp(posTmp, 0.18)
        // look ahead along the path → the feeling of travel
        curve.getPointAt(Math.min(0.999, u + 0.05), lookTmp)
        if (u > 0.8) lookTmp.lerp(outputNode.pos, (u - 0.8) / 0.2) // settle on the output for the reveal
        camera.up.set(0, 1, 0)
        camera.lookAt(lookTmp)
        // banking: roll into the turns
        const tan = curve.getTangentAt(Math.min(0.999, u))
        camera.rotateZ(THREE.MathUtils.clamp(-tan.z * 0.45, -0.22, 0.22))

        if (elapsed > FLY_MS + HOLD_MS) firing = false
      } else {
        // idle: slow majestic orbit of the whole net
        const a = t * 0.1
        const tx = Math.sin(a) * 46, tz = Math.cos(a) * 46, ty = 7 + Math.sin(t * 0.4) * 4
        camera.position.lerp(posTmp.set(tx, ty, tz), 0.015)
        camera.up.set(0, 1, 0)
        camera.lookAt(0, 0, 0)
      }

      // node visuals + glints as the camera passes
      nodes.forEach((n) => {
        const idle = 0.5 + Math.sin(t * 2 + n.base) * 0.5
        const a = n.act
        const col = a > 0.02 ? (n.sign > 0 ? cGreen : cRed) : cCyan
        n.mat.color.copy(col).multiplyScalar(0.16 + a * 0.84)
        // proximity glint
        const d = camera.position.distanceTo(n.pos)
        const near = d < 16 ? (1 - d / 16) : 0
        const s = 1 + a * (n.layer === SIZES.length - 1 ? 1.5 : 0.8) + (a < 0.05 ? idle * 0.06 : 0) + near * 0.4
        n.mesh.scale.setScalar(s); n.glow.scale.setScalar(s); n.core.scale.setScalar(s)
        n.glowMat.color.copy(col)
        n.glowMat.opacity = (a > 0.02 ? 0.28 + a * 0.6 : 0.04 + idle * 0.04) + near * 0.4
        n.coreMat.opacity = a > 0.3 ? 0.5 + a * 0.5 : near * 0.5
      })

      edgeMat.opacity = 0.13 + (firing ? 0.16 : 0) + Math.sin(t * 1.5) * 0.03

      // label fade: hot when active, gentle when near
      labels.forEach((lb) => {
        const dist = Math.abs(camera.position.x - layerX[lb.layer])
        const prox = dist < 18 ? 1 - dist / 18 : 0
        lb.hot *= 0.985
        lb.mat.opacity += ((Math.max(lb.hot, prox * 0.5)) - lb.mat.opacity) * 0.08
      })

      // pulses
      for (let i = 0; i < PN; i++) {
        if (!pAlive[i]) continue
        pT[i] += 0.018 * pSpd[i]
        if (pT[i] >= 1) { pAlive[i] = 0; pPos[i * 3] = 9999; pPos[i * 3 + 1] = 9999; pPos[i * 3 + 2] = 9999; continue }
        const e = 1 - Math.pow(1 - pT[i], 2)
        pPos[i * 3] = pFrom[i * 3] + (pTo[i * 3] - pFrom[i * 3]) * e
        pPos[i * 3 + 1] = pFrom[i * 3 + 1] + (pTo[i * 3 + 1] - pFrom[i * 3 + 1]) * e
        pPos[i * 3 + 2] = pFrom[i * 3 + 2] + (pTo[i * 3 + 2] - pFrom[i * 3 + 2]) * e
      }
      pGeo.attributes.position.needsUpdate = true
      pGeo.attributes.color.needsUpdate = true

      // dust drift
      for (let i = 0; i < dN; i++) {
        dPos[i * 3] -= 0.02
        if (dPos[i * 3] < layerX[0] - 12) dPos[i * 3] = xEnd + 18
      }
      dGeo.attributes.position.needsUpdate = true

      // shockwave
      if (shockProg < 1) {
        shockProg += 0.016
        shock.scale.setScalar(1 + shockProg * 20)
        shockMat.opacity = Math.max(0, (1 - shockProg) * 0.85)
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
      apiRef.current = null
    }
  }, [])

  // ── audio engine ──
  useEffect(() => {
    sonRef.current = new Sonifier()
    return () => { sonRef.current?.dispose(); sonRef.current = null }
  }, [])

  const toggleMute = () => { const m = !muted; setMuted(m); sonRef.current?.setMuted(m) }

  const synthTrace = (features: number[] | undefined, up: boolean): number[][] => {
    const input = (features && features.length === SIZES[0]) ? features.map((v) => Math.tanh(v)) : Array.from({ length: SIZES[0] }, () => (Math.random() * 2 - 1) * 0.6)
    const layers: number[][] = [input]
    let prev = input
    for (let l = 1; l < SIZES.length - 1; l++) {
      const cur = Array.from({ length: SIZES[l] }, (_, i) => Math.tanh(prev.reduce((s, v) => s + v, 0) / prev.length + Math.sin(i * 1.3) * 0.5))
      layers.push(cur); prev = cur
    }
    layers.push([up ? 0.9 : -0.9])
    return layers
  }

  const run = async (sym: string) => {
    const t = sym.trim().toUpperCase()
    if (!t) return
    setError(''); setLoading(true); setData(null); setRevealed(false)
    sonRef.current?.resume(); sonRef.current?.startPad()
    try {
      const res = await fetch('/api/forecast', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: t, horizon, source: 'forecast' }) })
      const json = await res.json()
      if (!res.ok) throw new Error(json?.error ?? `Request failed (${res.status})`)
      const fc = json as Forecast
      const px = fc.history[fc.history.length - 1]?.price ?? 0
      const tgt = fc.forecast[fc.forecast.length - 1]?.price ?? 0
      const up = tgt >= px
      setData(fc)
      const trace = (fc.trace && fc.trace.length === SIZES.length) ? fc.trace : synthTrace(fc.features, up)
      apiRef.current?.fire(trace, up)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't reach the forecast API.")
    } finally {
      setLoading(false)
      setTimeout(() => sonRef.current?.stopPad(), 17000)
    }
  }

  const px = data?.history[data.history.length - 1]?.price ?? 0
  const tgt = data?.forecast[data.forecast.length - 1]?.price ?? 0
  const pct = px ? ((tgt - px) / px) * 100 : 0
  const up = pct >= 0
  const accent = up ? '#34d399' : '#f87171'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04060d', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 42%, rgba(0,0,0,.6) 100%)', transition: 'opacity .6s', opacity: flyLabel ? 1 : 0.7 }} />

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8a93a8', textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> BrainStock</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', color: '#22d3ee', fontFamily: 'var(--font-mono), monospace' }}>ENTER THE NET</div>
          <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>{SIZES.join(' → ')} · live forward pass</div>
        </div>
        <button onClick={toggleMute} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#cdd6f4', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? 'Muted' : 'Sound on'}
        </button>
      </div>

      {/* travel caption during the dive */}
      {flyLabel && (
        <div style={{ position: 'absolute', top: 84, left: '50%', transform: 'translateX(-50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 12, letterSpacing: '0.28em', color: '#22d3ee', animation: 'el-pulse 1.4s ease-in-out infinite' }}>{flyLabel}</div>
        </div>
      )}
      <style>{`@keyframes el-pulse{0%,100%{opacity:.5}50%{opacity:1}}`}</style>

      {/* input features readout (left) */}
      {data && (
        <div style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', width: 220, background: 'rgba(5,8,16,.5)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 14, backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#46566e', marginBottom: 10 }}>INPUT NEURONS · {data.ticker}</div>
          {FEATURE_NAMES.map((name, i) => {
            const v = data.features?.[i] ?? 0
            const mag = Math.min(1, Math.abs(Math.tanh(v)))
            const pos = v >= 0
            return (
              <div key={name} style={{ marginBottom: 7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#8a93a8', marginBottom: 2 }}>
                  <span>{name}</span><span style={{ color: pos ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>{v >= 0 ? '+' : ''}{v.toFixed(2)}</span>
                </div>
                <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                  <div style={{ height: '100%', width: `${mag * 100}%`, background: pos ? '#34d399' : '#f87171', borderRadius: 2 }} />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* verdict (right) — revealed when the signal reaches the output neuron */}
      {data && revealed && (
        <div style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', width: 240, background: 'rgba(5,8,16,.55)', border: `1px solid ${accent}40`, borderRadius: 14, padding: 18, backdropFilter: 'blur(8px)', animation: 'el-rise .5s ease both' }}>
          <div style={{ fontSize: 10, letterSpacing: '0.2em', color: '#46566e' }}>OUTPUT NEURON</div>
          <div style={{ fontSize: 34, fontWeight: 800, marginTop: 4 }}>{data.ticker}</div>
          <div style={{ fontSize: 44, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1.1, marginTop: 6 }}>
            {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
          </div>
          <div style={{ fontSize: 12, color: '#8a93a8', marginTop: 6 }}>${px.toFixed(2)} → <b style={{ color: '#cdd6f4' }}>${tgt.toFixed(2)}</b> · {horizon}d</div>
          <div style={{ height: 1, background: 'rgba(255,255,255,.08)', margin: '12px 0' }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a93a8' }}>
            <span>Engine</span><span style={{ color: data.engine === 'neural-net' ? '#22d3ee' : '#fbbf24', fontWeight: 700 }}>{data.engine === 'neural-net' ? 'neural net' : 'baseline'}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#8a93a8', marginTop: 6 }}>
            <span>Dir. accuracy</span><span style={{ color: '#a78bfa', fontWeight: 700 }}>{Math.round((data.metrics?.directional_accuracy ?? 0) * 100)}%</span>
          </div>
          <Link href={`/brainstock?t=${data.ticker}`} style={{ display: 'block', marginTop: 14, textAlign: 'center', background: 'rgba(255,255,255,.06)', color: '#cdd6f4', borderRadius: 9, padding: '9px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
            Full forecast →
          </Link>
          <div style={{ marginTop: 12 }}><BrainMemory ticker={data.ticker} compact /></div>
        </div>
      )}
      <style>{`@keyframes el-rise{from{opacity:0;transform:translateY(-50%) translateX(12px)}to{opacity:1;transform:translateY(-50%)}}`}</style>

      {/* control dock (bottom) */}
      <div style={{ position: 'absolute', bottom: 26, left: '50%', transform: 'translateX(-50%)', width: 'min(560px, 92vw)' }}>
        <form onSubmit={(e) => { e.preventDefault(); run(ticker) }} style={{ display: 'flex', gap: 8, background: 'rgba(5,8,16,.65)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: 8, backdropFilter: 'blur(10px)' }}>
          <input value={ticker} onChange={(e) => setTicker(e.target.value.toUpperCase())} placeholder="Type a ticker…" maxLength={8}
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 700, padding: '8px 14px', letterSpacing: '0.05em' }} />
          <button type="submit" disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `linear-gradient(135deg, #22d3ee, #a78bfa)`, color: '#04060d', border: 'none', borderRadius: 10, padding: '0 22px', fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Zap size={16} fill="currentColor" />}
            {loading ? 'Firing…' : 'Fire the net'}
          </button>
        </form>
        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
          {POPULAR.map((s) => (
            <button key={s} onClick={() => { setTicker(s); run(s) }}
              style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#8a93a8', borderRadius: 7, padding: '5px 11px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>
        {error && <div style={{ marginTop: 10, textAlign: 'center', color: '#f87171', fontSize: 12 }}>{error}</div>}
        {!data && !error && <div style={{ marginTop: 10, textAlign: 'center', color: '#46566e', fontSize: 12 }}>Type a ticker and dive through the entire network — layer by layer, with sound.</div>}
      </div>
    </div>
  )
}
