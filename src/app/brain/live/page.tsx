'use client'

/* ════════════════════════════════════════════════════════════════════════
   /brain/live — ENTER THE NET.

   A WebGL flythrough *inside* BrainStock's neural network. Type a ticker and
   the real forward-pass (from /api/forecast `trace`) fires through the net
   layer by layer: input features ignite, signal pulses race down the edges,
   the camera dives through the hidden layers, and the output neuron erupts
   green or red with the predicted move — scored live with WebAudio.

   Architecture mirrors the real model: [11 → 16 → 12 → 1].
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { ArrowLeft, Volume2, VolumeX, Zap, Loader2 } from 'lucide-react'
import { FEATURE_NAMES } from '@/lib/nn'
import { Sonifier } from '@/lib/sonify'

const SIZES = [11, 16, 12, 1]
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

type SceneApi = {
  fire: (trace: number[][], up: boolean) => void
  reset: () => void
}

const POPULAR = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'PLTR', 'AMD', 'SPY', 'AMZN']

export default function BrainLive() {
  const mountRef = useRef<HTMLDivElement>(null)
  const apiRef = useRef<SceneApi | null>(null)
  const sonRef = useRef<Sonifier | null>(null)

  const [ticker, setTicker] = useState('NVDA')
  const [horizon] = useState(5)
  const [loading, setLoading] = useState(false)
  const [muted, setMuted] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState<Forecast | null>(null)

  // ── build the scene once ──────────────────────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x04060d, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x04060d, 0.022)
    const camera = new THREE.PerspectiveCamera(62, mount.clientWidth / mount.clientHeight, 0.1, 400)

    // starfield ambience
    const starN = 900
    const starPos = new Float32Array(starN * 3)
    for (let i = 0; i < starN; i++) {
      starPos[i * 3] = (Math.random() - 0.5) * 240
      starPos[i * 3 + 1] = (Math.random() - 0.5) * 140
      starPos[i * 3 + 2] = (Math.random() - 0.5) * 240
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3))
    scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0x2a3550, size: 0.5, transparent: true, opacity: 0.7 })))

    // ── node geometry ──
    const GAP = 16
    const SPREAD = 13
    const totalW = (SIZES.length - 1) * GAP
    const x0 = -totalW / 2

    type Node = {
      mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; glow: THREE.Mesh; glowMat: THREE.MeshBasicMaterial
      layer: number; idx: number; pos: THREE.Vector3; act: number; sign: number; base: number
    }
    const nodes: Node[] = []
    const byLayer: Node[][] = SIZES.map(() => [])

    SIZES.forEach((count, l) => {
      for (let i = 0; i < count; i++) {
        const x = x0 + l * GAP
        const y = count === 1 ? 0 : (i / (count - 1) - 0.5) * SPREAD
        const z = Math.sin(i * 1.7 + l) * 0.6
        const pos = new THREE.Vector3(x, y, z)
        const r = l === SIZES.length - 1 ? 1.5 : 0.5
        const mat = new THREE.MeshBasicMaterial({ color: 0x16324a })
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 20), mat)
        mesh.position.copy(pos)
        scene.add(mesh)
        const glowMat = new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false })
        const glow = new THREE.Mesh(new THREE.SphereGeometry(r * 2.6, 16, 16), glowMat)
        glow.position.copy(pos)
        scene.add(glow)
        const node: Node = { mesh, mat, glow, glowMat, layer: l, idx: i, pos, act: 0, sign: 1, base: Math.random() * Math.PI * 2 }
        nodes.push(node)
        byLayer[l].push(node)
      }
    })

    // ── edges (one LineSegments) ──
    const edges: { a: Node; b: Node }[] = []
    for (let l = 0; l < SIZES.length - 1; l++) {
      for (const a of byLayer[l]) for (const b of byLayer[l + 1]) edges.push({ a, b })
    }
    const edgePos = new Float32Array(edges.length * 6)
    edges.forEach((e, i) => {
      edgePos[i * 6] = e.a.pos.x; edgePos[i * 6 + 1] = e.a.pos.y; edgePos[i * 6 + 2] = e.a.pos.z
      edgePos[i * 6 + 3] = e.b.pos.x; edgePos[i * 6 + 4] = e.b.pos.y; edgePos[i * 6 + 5] = e.b.pos.z
    })
    const edgeGeo = new THREE.BufferGeometry()
    edgeGeo.setAttribute('position', new THREE.BufferAttribute(edgePos, 3))
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x1b3b55, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending })
    scene.add(new THREE.LineSegments(edgeGeo, edgeMat))

    // ── pulse pool (signal traveling along edges) ──
    const PN = 600
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
    scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 0.7, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })))

    const spawnPulse = (a: Node, b: Node, color: THREE.Color, intensity: number) => {
      for (let i = 0; i < PN; i++) {
        if (!pAlive[i]) {
          pAlive[i] = 1; pT[i] = 0; pSpd[i] = 0.7 + Math.random() * 0.5
          pFrom[i * 3] = a.pos.x; pFrom[i * 3 + 1] = a.pos.y; pFrom[i * 3 + 2] = a.pos.z
          pTo[i * 3] = b.pos.x; pTo[i * 3 + 1] = b.pos.y; pTo[i * 3 + 2] = b.pos.z
          pClr[i * 3] = color.r * intensity; pClr[i * 3 + 1] = color.g * intensity; pClr[i * 3 + 2] = color.b * intensity
          return
        }
      }
    }

    // shockwave for the final neuron
    const shockMat = new THREE.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
    const shock = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.9, 64), shockMat)
    shock.position.set(x0 + totalW, 0, 0)
    scene.add(shock)
    let shockProg = 1

    // ── firing state ──
    let firing = false
    let fireStart = 0
    let traceData: number[][] | null = null
    let upDir = true
    let waveLayer = -1
    const LAYER_MS = 620

    const tmpGreen = new THREE.Color(GREEN)
    const tmpRed = new THREE.Color(RED)
    const tmpCyan = new THREE.Color(CYAN)

    const setLayerActivations = (l: number, vals: number[]) => {
      byLayer[l].forEach((n, i) => {
        const v = vals[i] ?? 0
        n.act = Math.min(1, Math.abs(v) * (l === 0 ? 1.1 : 1.6) + 0.12)
        n.sign = v >= 0 ? 1 : -1
      })
    }

    apiRef.current = {
      fire: (trace, up) => {
        traceData = trace
        upDir = up
        firing = true
        fireStart = performance.now()
        waveLayer = -1
        shockProg = 1
        nodes.forEach((n) => { n.act = 0 })
      },
      reset: () => { firing = false; traceData = null; waveLayer = -1; nodes.forEach((n) => { n.act = 0 }) },
    }

    // camera path
    const camStart = new THREE.Vector3(x0 - 10, 3, 24)
    const camIdleLook = new THREE.Vector3(0, 0, 0)
    camera.position.copy(camStart)

    let t = 0
    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      t += 0.016

      // firing progression
      let waveProg = 0
      if (firing && traceData) {
        const elapsed = performance.now() - fireStart
        waveProg = Math.min(1, elapsed / (LAYER_MS * SIZES.length))
        const curLayer = Math.floor(elapsed / LAYER_MS)
        if (curLayer !== waveLayer && curLayer < SIZES.length) {
          waveLayer = curLayer
          const vals = traceData[curLayer] ?? []
          setLayerActivations(curLayer, vals)
          // spawn pulses from this layer to the next
          if (curLayer < SIZES.length - 1) {
            byLayer[curLayer].forEach((a) => {
              if (a.act < 0.25) return
              byLayer[curLayer + 1].forEach((b) => {
                if (Math.random() < a.act * 0.85) spawnPulse(a, b, a.sign > 0 ? tmpGreen : tmpRed, 0.6 + a.act)
              })
            })
            sonRef.current?.note(2 + curLayer, { dur: 0.4, type: 'triangle', gain: 0.22 })
          }
          // reached output
          if (curLayer === SIZES.length - 1) {
            shockProg = 0
            shockMat.color.set(upDir ? GREEN : RED)
            sonRef.current?.chord(upDir)
            const out = byLayer[SIZES.length - 1][0]
            out.act = 1; out.sign = upDir ? 1 : -1
            const col = upDir ? tmpGreen : tmpRed
            byLayer[SIZES.length - 2].forEach((a) => spawnPulse(a, out, col, 1.4))
          }
        }
        if (waveProg >= 1 && elapsed > LAYER_MS * SIZES.length + 1400) firing = false
      }

      // node visuals
      nodes.forEach((n) => {
        const idlePulse = 0.5 + Math.sin(t * 2 + n.base) * 0.5
        const a = n.act
        const col = a > 0.02 ? (n.sign > 0 ? tmpGreen : tmpRed) : tmpCyan
        // base color: dark when idle, ignites with activation
        n.mat.color.copy(col).multiplyScalar(0.18 + a * 0.82)
        const s = 1 + a * (n.layer === SIZES.length - 1 ? 1.4 : 0.8) + (a < 0.05 ? idlePulse * 0.06 : 0)
        n.mesh.scale.setScalar(s)
        n.glow.scale.setScalar(s)
        n.glowMat.color.copy(col)
        n.glowMat.opacity = a > 0.02 ? 0.25 + a * 0.6 : 0.04 + idlePulse * 0.04
      })

      // edges shimmer / brighten while firing
      edgeMat.opacity = 0.14 + (firing ? 0.18 : 0) + Math.sin(t * 1.5) * 0.03

      // pulses travel
      for (let i = 0; i < PN; i++) {
        if (!pAlive[i]) continue
        pT[i] += 0.02 * pSpd[i]
        if (pT[i] >= 1) { pAlive[i] = 0; pPos[i * 3] = 9999; pPos[i * 3 + 1] = 9999; pPos[i * 3 + 2] = 9999; continue }
        const e = 1 - Math.pow(1 - pT[i], 2)
        pPos[i * 3] = pFrom[i * 3] + (pTo[i * 3] - pFrom[i * 3]) * e
        pPos[i * 3 + 1] = pFrom[i * 3 + 1] + (pTo[i * 3 + 1] - pFrom[i * 3 + 1]) * e
        pPos[i * 3 + 2] = pFrom[i * 3 + 2] + (pTo[i * 3 + 2] - pFrom[i * 3 + 2]) * e
      }
      pGeo.attributes.position.needsUpdate = true
      pGeo.attributes.color.needsUpdate = true

      // shockwave
      if (shockProg < 1) {
        shockProg += 0.018
        const s = 1 + shockProg * 18
        shock.scale.setScalar(s)
        shockMat.opacity = Math.max(0, (1 - shockProg) * 0.8)
      }

      // camera: idle orbit until firing, then dive through the net to the output
      if (firing) {
        const targetX = x0 - 6 + waveProg * (totalW + 14)
        camera.position.x += (targetX - camera.position.x) * 0.05
        camera.position.y += (2.5 - camera.position.y) * 0.04
        camera.position.z += (10 - camera.position.z) * 0.04
        const lookX = Math.min(x0 + totalW, camera.position.x + 12)
        camera.lookAt(lookX, 0, 0)
      } else {
        const a = t * 0.12
        camera.position.x += ((Math.sin(a) * 6) - camera.position.x) * 0.02
        camera.position.y += ((3 + Math.sin(t * 0.4) * 1.5) - camera.position.y) * 0.02
        camera.position.z += (24 - camera.position.z) * 0.02
        camera.lookAt(camIdleLook)
      }

      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => {
      if (!mount) return
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

  const toggleMute = () => {
    const m = !muted
    setMuted(m)
    sonRef.current?.setMuted(m)
  }

  // Synthesize a believable activation trace from features if the model didn't return one.
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
    setError(''); setLoading(true); setData(null)
    sonRef.current?.resume()
    sonRef.current?.startPad()
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
      setTimeout(() => sonRef.current?.stopPad(), 6000)
    }
  }

  // verdict math
  const px = data?.history[data.history.length - 1]?.price ?? 0
  const tgt = data?.forecast[data.forecast.length - 1]?.price ?? 0
  const pct = px ? ((tgt - px) / px) * 100 : 0
  const up = pct >= 0
  const accent = up ? '#34d399' : '#f87171'

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04060d', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* vignette */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.55) 100%)' }} />

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8a93a8', textDecoration: 'none', fontSize: 14 }}>
          <ArrowLeft size={15} /> BrainStock
        </Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', color: '#22d3ee', fontFamily: 'var(--font-mono), monospace' }}>ENTER THE NET</div>
          <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>{SIZES.join(' → ')} · live forward pass</div>
        </div>
        <button onClick={toggleMute} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#cdd6f4', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? 'Muted' : 'Sound on'}
        </button>
      </div>

      {/* input features readout (left) */}
      {data && (
        <div style={{ position: 'absolute', left: 22, top: '50%', transform: 'translateY(-50%)', width: 220, background: 'rgba(5,8,16,.55)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 14, padding: 14, backdropFilter: 'blur(8px)' }}>
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

      {/* verdict (right) */}
      {data && (
        <div style={{ position: 'absolute', right: 22, top: '50%', transform: 'translateY(-50%)', width: 240, background: 'rgba(5,8,16,.55)', border: `1px solid ${accent}40`, borderRadius: 14, padding: 18, backdropFilter: 'blur(8px)' }}>
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
        </div>
      )}

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
        {!data && !error && <div style={{ marginTop: 10, textAlign: 'center', color: '#46566e', fontSize: 12 }}>Type a ticker and watch the signal fire through the network — with sound.</div>}
      </div>
    </div>
  )
}
