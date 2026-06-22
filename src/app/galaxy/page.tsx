'use client'

/* ════════════════════════════════════════════════════════════════════════
   /galaxy — THE MARKET GALAXY.

   Every stock is a star. Clustered into sector constellations, sized by market
   cap, colored + pulsing by today's real move (from /api/heatmap). Drift
   through it, hover a star to read it, click to forecast it. The market as a
   universe you can fly through.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import { ArrowLeft } from 'lucide-react'
import { getQuality } from '@/lib/quality'

type Star = { t: string; sector: string; mcap: number }
// Curated universe: ticker, sector, approx market cap ($B). Color/size go live.
const UNIVERSE: Star[] = [
  { t: 'NVDA', sector: 'Tech', mcap: 2200 }, { t: 'AAPL', sector: 'Tech', mcap: 2900 },
  { t: 'MSFT', sector: 'Tech', mcap: 3100 }, { t: 'GOOGL', sector: 'Tech', mcap: 2100 },
  { t: 'META', sector: 'Tech', mcap: 1200 }, { t: 'AMD', sector: 'Tech', mcap: 270 },
  { t: 'AVGO', sector: 'Tech', mcap: 650 }, { t: 'CRM', sector: 'Tech', mcap: 280 },
  { t: 'ORCL', sector: 'Tech', mcap: 380 }, { t: 'ADBE', sector: 'Tech', mcap: 240 },
  { t: 'AMZN', sector: 'Consumer', mcap: 1900 }, { t: 'TSLA', sector: 'Consumer', mcap: 800 },
  { t: 'COST', sector: 'Consumer', mcap: 380 }, { t: 'HD', sector: 'Consumer', mcap: 360 },
  { t: 'NKE', sector: 'Consumer', mcap: 140 }, { t: 'MCD', sector: 'Consumer', mcap: 210 },
  { t: 'JPM', sector: 'Finance', mcap: 600 }, { t: 'BAC', sector: 'Finance', mcap: 300 },
  { t: 'GS', sector: 'Finance', mcap: 150 }, { t: 'MS', sector: 'Finance', mcap: 160 },
  { t: 'V', sector: 'Finance', mcap: 550 }, { t: 'MA', sector: 'Finance', mcap: 430 },
  { t: 'LLY', sector: 'Health', mcap: 820 }, { t: 'UNH', sector: 'Health', mcap: 520 },
  { t: 'JNJ', sector: 'Health', mcap: 380 }, { t: 'PFE', sector: 'Health', mcap: 160 },
  { t: 'MRK', sector: 'Health', mcap: 320 }, { t: 'ABBV', sector: 'Health', mcap: 300 },
  { t: 'XOM', sector: 'Energy', mcap: 470 }, { t: 'CVX', sector: 'Energy', mcap: 290 },
  { t: 'COP', sector: 'Energy', mcap: 130 }, { t: 'SLB', sector: 'Energy', mcap: 70 },
  { t: 'SPY', sector: 'Index', mcap: 500 }, { t: 'QQQ', sector: 'Index', mcap: 300 },
  { t: 'IWM', sector: 'Index', mcap: 60 }, { t: 'GLD', sector: 'Index', mcap: 70 },
]
const SECTORS = ['Tech', 'Consumer', 'Finance', 'Health', 'Energy', 'Index']
const SECTOR_HUE: Record<string, number> = { Tech: 0.55, Consumer: 0.12, Finance: 0.33, Health: 0.78, Energy: 0.07, Index: 0.62 }

export default function Galaxy() {
  const mountRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const [hover, setHover] = useState<{ t: string; sector: string; pct: number; x: number; y: number } | null>(null)
  const quotesRef = useRef<Record<string, { pct: number; price: number }>>({})

  useEffect(() => {
    const load = () => fetch('/api/heatmap').then((r) => r.json()).then((d) => {
      const q: Record<string, { pct: number; price: number }> = {}
      for (const k in (d.quotes || {})) q[k] = { pct: d.quotes[k].pct ?? 0, price: d.quotes[k].price ?? 0 }
      quotesRef.current = q
    }).catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const Q = getQuality()
    const renderer = new THREE.WebGLRenderer({ antialias: Q.tier !== 'low' })
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, Q.dprCap))
    renderer.setClearColor(0x03040a, 1)
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x03040a, 0.012)
    const camera = new THREE.PerspectiveCamera(60, mount.clientWidth / mount.clientHeight, 0.1, 500)
    camera.position.set(0, 8, 64)

    // background starfield
    const bgN = Q.count(1800, 300)
    const bg = new Float32Array(bgN * 3)
    for (let i = 0; i < bgN; i++) { bg[i * 3] = (Math.random() - 0.5) * 360; bg[i * 3 + 1] = (Math.random() - 0.5) * 240; bg[i * 3 + 2] = (Math.random() - 0.5) * 360 }
    const bgGeo = new THREE.BufferGeometry(); bgGeo.setAttribute('position', new THREE.BufferAttribute(bg, 3))
    scene.add(new THREE.Points(bgGeo, new THREE.PointsMaterial({ color: 0x2a3550, size: 0.4, transparent: true, opacity: 0.7 })))

    // sector dust clusters + star meshes
    type S = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; halo: THREE.Mesh; haloMat: THREE.MeshBasicMaterial; star: Star; base: number; baseScale: number }
    const stars: S[] = []
    UNIVERSE.forEach((star) => {
      const si = SECTORS.indexOf(star.sector)
      const ang = (si / SECTORS.length) * Math.PI * 2
      const cx = Math.cos(ang) * 30, cz = Math.sin(ang) * 30
      const jitter = 12
      const x = cx + (Math.random() - 0.5) * jitter
      const y = (Math.random() - 0.5) * 14
      const z = cz + (Math.random() - 0.5) * jitter
      const size = 0.5 + Math.log10(star.mcap) * 0.5
      const hue = SECTOR_HUE[star.sector] ?? 0.5
      const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL(hue, 0.5, 0.55) })
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 18, 18), mat)
      mesh.position.set(x, y, z)
      mesh.userData = { t: star.t }
      scene.add(mesh)
      const haloMat = new THREE.MeshBasicMaterial({ color: mat.color, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false })
      const halo = new THREE.Mesh(new THREE.SphereGeometry(size * 2.4, 14, 14), haloMat)
      halo.position.copy(mesh.position)
      scene.add(halo)
      stars.push({ mesh, mat, halo, haloMat, star, base: Math.random() * Math.PI * 2, baseScale: size })
    })

    // raycaster for hover/click
    const ray = new THREE.Raycaster()
    const pointer = new THREE.Vector2(-2, -2)
    let hoverT: string | null = null
    const onMove = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      ;(onMove as unknown as { lastX: number }).lastX = e.clientX
      ;(onMove as unknown as { lastY: number }).lastY = e.clientY
    }
    const onClick = () => { if (hoverT) router.push(`/brainstock?t=${hoverT}`) }
    renderer.domElement.addEventListener('mousemove', onMove)
    renderer.domElement.addEventListener('click', onClick)

    let t = 0, raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      if (document.hidden) return
      t += 0.005
      const q = quotesRef.current
      stars.forEach((s) => {
        const pct = q[s.star.t]?.pct ?? 0
        const up = pct >= 0
        const mag = Math.min(1, Math.abs(pct) / 4)
        const col = new THREE.Color().setHSL(up ? 0.4 : 0.0, 0.8, 0.4 + mag * 0.25)
        // blend sector identity with move when there's data
        const hasData = !!q[s.star.t]
        s.mat.color.lerp(hasData ? col : new THREE.Color().setHSL(SECTOR_HUE[s.star.sector], 0.4, 0.45), 0.05)
        s.haloMat.color.copy(s.mat.color)
        const pulse = 1 + Math.sin(t * 3 + s.base) * (0.05 + mag * 0.25)
        s.mesh.scale.setScalar(pulse)
        s.halo.scale.setScalar(pulse)
        s.haloMat.opacity = 0.12 + mag * 0.5
      })

      // hover detection
      ray.setFromCamera(pointer, camera)
      const hits = ray.intersectObjects(stars.map((s) => s.mesh))
      const newHover = hits.length ? (hits[0].object.userData.t as string) : null
      if (newHover !== hoverT) {
        hoverT = newHover
        renderer.domElement.style.cursor = newHover ? 'pointer' : 'grab'
        if (newHover) {
          const st = UNIVERSE.find((u) => u.t === newHover)!
          setHover({ t: newHover, sector: st.sector, pct: q[newHover]?.pct ?? 0, x: (onMove as unknown as { lastX: number }).lastX ?? 0, y: (onMove as unknown as { lastY: number }).lastY ?? 0 })
        } else setHover(null)
      }

      // slow cinematic orbit
      const a = t * 0.25
      camera.position.x = Math.sin(a) * 64
      camera.position.z = Math.cos(a) * 64
      camera.position.y = 8 + Math.sin(t * 0.5) * 5
      camera.lookAt(0, 0, 0)
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
      renderer.domElement.removeEventListener('mousemove', onMove)
      renderer.domElement.removeEventListener('click', onClick)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [router])

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#03040a', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif', overflow: 'hidden' }}>
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,.6) 100%)' }} />

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px' }}>
        <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: '#8a93a8', textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> YN Finance</Link>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, letterSpacing: '0.34em', color: '#22d3ee', fontFamily: 'var(--font-mono), monospace' }}>THE MARKET GALAXY</div>
          <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>{UNIVERSE.length} stars · sized by market cap · live moves · click to forecast</div>
        </div>
        <div style={{ width: 90 }} />
      </div>

      {/* sector legend */}
      <div style={{ position: 'absolute', bottom: 22, left: 22, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {SECTORS.map((s) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: '#8a93a8' }}>
            <span style={{ width: 9, height: 9, borderRadius: '50%', background: `hsl(${SECTOR_HUE[s] * 360}, 50%, 55%)` }} />{s}
          </div>
        ))}
      </div>

      {hover && (
        <div style={{ position: 'fixed', left: Math.min(hover.x + 16, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 180), top: hover.y + 16, pointerEvents: 'none', background: 'rgba(5,8,16,.85)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 10, padding: '10px 14px', backdropFilter: 'blur(8px)' }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{hover.t}</div>
          <div style={{ fontSize: 11, color: '#8a93a8' }}>{hover.sector}</div>
          <div style={{ fontSize: 15, fontWeight: 800, color: hover.pct >= 0 ? '#34d399' : '#f87171', marginTop: 2 }}>{hover.pct >= 0 ? '+' : ''}{hover.pct.toFixed(2)}%</div>
          <div style={{ fontSize: 10, color: '#46566e', marginTop: 4 }}>click → forecast</div>
        </div>
      )}
    </div>
  )
}
