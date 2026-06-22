'use client'

/* ════════════════════════════════════════════════════════════════════════
   /storm — THE CONVICTION STORM.

   A live particle field of tickers. Each name is lifted up when it's green and
   dragged down when it's red — the harder the move, the faster and brighter.
   Real quotes from /api/heatmap. Optional generative audio swells with the
   tape. Hypnotic, ambient, and 100% real data.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import * as THREE from 'three'
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react'
import { Sonifier } from '@/lib/sonify'
import { getQuality } from '@/lib/quality'

const TICKERS = [
  'NVDA', 'AAPL', 'MSFT', 'GOOGL', 'META', 'AMD', 'AVGO', 'CRM', 'ORCL', 'ADBE',
  'AMZN', 'TSLA', 'COST', 'HD', 'NKE', 'MCD', 'JPM', 'BAC', 'GS', 'MS', 'V', 'MA',
  'LLY', 'UNH', 'JNJ', 'PFE', 'MRK', 'ABBV', 'XOM', 'CVX', 'COP', 'SPY', 'QQQ', 'IWM',
]

export default function Storm() {
  const mountRef = useRef<HTMLDivElement>(null)
  const quotesRef = useRef<Record<string, number>>({})
  const sonRef = useRef<Sonifier | null>(null)
  const [muted, setMuted] = useState(true)
  const [breadth, setBreadth] = useState<{ up: number; down: number } | null>(null)

  useEffect(() => {
    const load = () => fetch('/api/heatmap').then((r) => r.json()).then((d) => {
      const q: Record<string, number> = {}
      let up = 0, down = 0
      for (const k in (d.quotes || {})) { const p = d.quotes[k].pct ?? 0; q[k] = p; if (p >= 0) up++; else down++ }
      quotesRef.current = q
      setBreadth({ up, down })
    }).catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { sonRef.current = new Sonifier(); return () => { sonRef.current?.dispose(); sonRef.current = null } }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const Q = getQuality()
    const renderer = new THREE.WebGLRenderer({ antialias: Q.tier !== 'low' })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.dprCap))
    renderer.setClearColor(0x04060d, 1)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x04060d, 0.02)
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 300)
    camera.position.set(0, 0, 46)

    const makeTex = (sym: string) => {
      const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64
      const ctx = cv.getContext('2d')!
      ctx.font = '800 40px Inter, system-ui, sans-serif'
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.fillText(sym, 128, 34)
      return new THREE.CanvasTexture(cv)
    }

    type P = { sprite: THREE.Sprite; mat: THREE.SpriteMaterial; t: string; vy: number; x: number; z: number }
    const parts: P[] = []
    const COPIES = Q.tier === 'low' ? 1 : Q.tier === 'mid' ? 2 : 3 // density
    TICKERS.forEach((t) => {
      const tex = makeTex(t)
      for (let c = 0; c < COPIES; c++) {
        const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.5, depthWrite: false })
        const sprite = new THREE.Sprite(mat)
        const x = (Math.random() - 0.5) * 80
        const z = (Math.random() - 0.5) * 40
        sprite.position.set(x, (Math.random() - 0.5) * 60, z)
        sprite.scale.set(6, 1.5, 1)
        scene.add(sprite)
        parts.push({ sprite, mat, t, vy: 0, x, z })
      }
    })

    const green = new THREE.Color(0x34d399), red = new THREE.Color(0xf87171), neutral = new THREE.Color(0x46566e)
    let t = 0, raf = 0, soundClock = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (document.hidden) return
      t += 0.016
      const q = quotesRef.current
      let totalMag = 0
      parts.forEach((p) => {
        const pct = q[p.t] ?? 0
        const mag = Math.min(1, Math.abs(pct) / 4)
        totalMag += mag
        // target velocity: up if green, down if red
        const targetVy = (pct / 4) * 0.12
        p.vy += (targetVy - p.vy) * 0.04
        p.sprite.position.y += p.vy + Math.sin(t + p.x) * 0.004
        // wrap
        if (p.sprite.position.y > 34) p.sprite.position.y = -34
        if (p.sprite.position.y < -34) p.sprite.position.y = 34
        p.sprite.position.x = p.x + Math.sin(t * 0.3 + p.z) * 1.5
        // color + brightness by move
        const col = pct === 0 && !q[p.t] ? neutral : (pct >= 0 ? green : red)
        p.mat.color.copy(col)
        p.mat.opacity = 0.25 + mag * 0.6
        p.sprite.scale.set(6 + mag * 2, 1.5 + mag * 0.5, 1)
      })

      // generative audio: swell with overall volatility, ping the biggest movers
      if (!sonRef.current?.muted) {
        soundClock += 0.016
        if (soundClock > 1.6) {
          soundClock = 0
          const intensity = Math.min(1, totalMag / parts.length * 3)
          // pick a strong mover and play a note (green=higher degree)
          const movers = TICKERS.map((tk) => ({ tk, pct: q[tk] ?? 0 })).sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct))
          const m = movers[Math.floor(Math.random() * Math.min(5, movers.length))]
          if (m && Math.abs(m.pct) > 0.1) {
            const deg = m.pct >= 0 ? 5 + Math.round(intensity * 4) : 2 + Math.round(intensity * 2)
            sonRef.current?.note(deg, { dur: 1.2, type: 'sine', gain: 0.12 + intensity * 0.12 })
          }
        }
      }

      camera.position.x = Math.sin(t * 0.1) * 8
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
    }
    animate()

    const onResize = () => { camera.aspect = mount.clientWidth / mount.clientHeight; camera.updateProjectionMatrix(); renderer.setSize(mount.clientWidth, mount.clientHeight) }
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  const toggle = () => {
    const m = !muted
    setMuted(m)
    if (!m) { sonRef.current?.resume(); sonRef.current?.startPad() } else { sonRef.current?.stopPad() }
    sonRef.current?.setMuted(m)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#04060d', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,.6) 100%)' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8a93a8', textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> YN Finance</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', color: '#22d3ee', fontFamily: 'var(--font-mono), monospace' }}>THE CONVICTION STORM</div>
          <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>bulls rise · bears fall · live</div>
        </div>
        <button onClick={toggle} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#cdd6f4', borderRadius: 9, padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>
          {muted ? <VolumeX size={14} /> : <Volume2 size={14} />} {muted ? 'Listen' : 'Sound on'}
        </button>
      </div>

      {breadth && (
        <div style={{ position: 'absolute', bottom: 24, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: 22, background: 'rgba(5,8,16,.55)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 12, padding: '12px 22px', backdropFilter: 'blur(8px)' }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#34d399' }}>{breadth.up}</div><div style={{ fontSize: 10, color: '#8a93a8' }}>RISING</div></div>
          <div style={{ width: 1, background: 'rgba(255,255,255,.1)' }} />
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: 22, fontWeight: 800, color: '#f87171' }}>{breadth.down}</div><div style={{ fontSize: 10, color: '#8a93a8' }}>FALLING</div></div>
        </div>
      )}
    </div>
  )
}
