'use client'

/**
 * The Command Deck — step into the machine. A volumetric 3D room (Three.js):
 * five agent avatars stand around a deck, the neural network pulses overhead,
 * a holographic core shows the ticker under debate. When the committee speaks,
 * the active avatar ignites with a beam to the brain above. Raw three, additive glow.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type DeckAgent = { key: string; name: string; emoji: string; color: string }

function glowTex(): THREE.Texture {
  const c = document.createElement('canvas'); c.width = c.height = 64
  const ctx = c.getContext('2d')!; const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.85)'); g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.Texture(c); t.needsUpdate = true; return t
}
function labelTex(emoji: string, name: string, color: string): THREE.Texture {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128
  const ctx = c.getContext('2d')!
  ctx.font = '64px serif'; ctx.textAlign = 'center'; ctx.fillText(emoji, 128, 64)
  ctx.font = '700 26px Inter, system-ui, sans-serif'; ctx.fillStyle = color; ctx.fillText(name.toUpperCase(), 128, 104)
  const t = new THREE.Texture(c); t.needsUpdate = true; return t
}

export default function CommandDeck({ agents, activeRef, tickerRef }: { agents: DeckAgent[]; activeRef: { current: number | null }; tickerRef: { current: string | null } }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let W = mount.clientWidth, H = mount.clientHeight

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x05060b, 0.035)
    const camera = new THREE.PerspectiveCamera(55, W / H, 0.1, 200)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio)); renderer.setSize(W, H)
    mount.appendChild(renderer.domElement)
    const tex = glowTex()

    // ── floor deck — concentric glowing rings ──
    const floor = new THREE.Group(); scene.add(floor)
    const disc = new THREE.Mesh(new THREE.CircleGeometry(9, 64), new THREE.MeshBasicMaterial({ color: 0x0a1018, transparent: true, opacity: 0.9 }))
    disc.rotation.x = -Math.PI / 2; floor.add(disc)
    for (let r = 1.6; r < 9; r += 1.5) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(r, r + 0.03, 64), new THREE.MeshBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.12, side: THREE.DoubleSide }))
      ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; floor.add(ring)
    }

    // ── agent avatars around the deck ──
    type Av = { group: THREE.Group; core: THREE.Mesh; halo: THREE.Sprite; beam: THREE.Mesh; color: THREE.Color }
    const avatars: Av[] = []
    agents.forEach((a, i) => {
      const ang = (i / agents.length) * Math.PI * 2 - Math.PI / 2
      const R = 5.2
      const g = new THREE.Group(); g.position.set(Math.cos(ang) * R, 0, Math.sin(ang) * R)
      const col = new THREE.Color(a.color)
      const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.5), new THREE.MeshBasicMaterial({ color: col }))
      core.position.y = 1.5; core.scale.y = 2.2; g.add(core)
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }))
      halo.position.y = 1.5; halo.scale.setScalar(2.6); g.add(halo)
      const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex(a.emoji, a.name, a.color), transparent: true, depthWrite: false }))
      label.position.y = 3.4; label.scale.set(2.4, 1.2, 1); g.add(label)
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.18, 5.6, 8, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }))
      beam.position.y = 4.4; g.add(beam)
      g.lookAt(0, 1.5, 0)
      floor.add(g)
      avatars.push({ group: g, core, halo, beam, color: col })
    })

    // ── holographic core (ticker) ──
    const coreGrp = new THREE.Group(); scene.add(coreGrp)
    const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), new THREE.MeshBasicMaterial({ color: 0xa78bfa, wireframe: true, transparent: true, opacity: 0.6 }))
    orb.position.y = 1.4; coreGrp.add(orb)
    const orbHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0xa78bfa, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }))
    orbHalo.position.y = 1.4; orbHalo.scale.setScalar(3); coreGrp.add(orbHalo)
    let tickerLabel: THREE.Sprite | null = null
    let shownTicker: string | null = null

    // ── neural canopy overhead ──
    const canopy = new THREE.Group(); canopy.position.y = 7.5; scene.add(canopy)
    const cNodes: THREE.Vector3[] = []
    for (let ring = 0; ring < 3; ring++) {
      const count = 6 + ring * 4, rad = 1.5 + ring * 1.8
      for (let i = 0; i < count; i++) { const ang = (i / count) * Math.PI * 2; const p = new THREE.Vector3(Math.cos(ang) * rad, (Math.random() - 0.5) * 0.8, Math.sin(ang) * rad); cNodes.push(p)
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: 0x22d3ee, transparent: true, opacity: 0.7, blending: THREE.AdditiveBlending, depthWrite: false })); s.position.copy(p); s.scale.setScalar(0.5); canopy.add(s) }
    }
    const linePos: number[] = []
    for (let i = 0; i < cNodes.length; i++) for (let j = i + 1; j < cNodes.length; j++) if (cNodes[i].distanceTo(cNodes[j]) < 2.4) linePos.push(cNodes[i].x, cNodes[i].y, cNodes[i].z, cNodes[j].x, cNodes[j].y, cNodes[j].z)
    const cgeo = new THREE.BufferGeometry(); cgeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
    canopy.add(new THREE.LineSegments(cgeo, new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.14 })))

    // dust
    const dustPos: number[] = []
    for (let i = 0; i < 240; i++) dustPos.push((Math.random() - 0.5) * 30, Math.random() * 12, (Math.random() - 0.5) * 30)
    const dgeo = new THREE.BufferGeometry(); dgeo.setAttribute('position', new THREE.Float32BufferAttribute(dustPos, 3))
    scene.add(new THREE.Points(dgeo, new THREE.PointsMaterial({ color: 0x5a7da0, size: 0.04, transparent: true, opacity: 0.5 })))

    // ── camera orbit ──
    let theta = Math.PI * 0.5, phi = 0.95, drag = false, px = 0, py = 0, autoV = 0.0009
    const updateCam = () => { const R = 15; camera.position.set(Math.cos(theta) * Math.sin(phi) * R, Math.cos(phi) * R + 4, Math.sin(theta) * Math.sin(phi) * R); camera.lookAt(0, 1.6, 0) }
    const down = (e: PointerEvent) => { drag = true; px = e.clientX; py = e.clientY }
    const up = () => { drag = false }
    const move = (e: PointerEvent) => { if (!drag) return; theta -= (e.clientX - px) * 0.005; phi = Math.max(0.4, Math.min(1.4, phi + (e.clientY - py) * 0.004)); px = e.clientX; py = e.clientY }
    renderer.domElement.addEventListener('pointerdown', down); window.addEventListener('pointerup', up); window.addEventListener('pointermove', move)

    let raf = 0, t = 0
    const animate = () => {
      t += 0.016
      if (!reduce) { if (!drag) theta += autoV; canopy.rotation.y += 0.0014; orb.rotation.y += 0.01; orb.rotation.x += 0.006 }
      updateCam()

      // ticker label sync
      if (tickerRef.current !== shownTicker) {
        shownTicker = tickerRef.current
        if (tickerLabel) { coreGrp.remove(tickerLabel); (tickerLabel.material as THREE.SpriteMaterial).map?.dispose(); tickerLabel = null }
        if (shownTicker) { tickerLabel = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTex('', '$' + shownTicker, '#e7ecf5'), transparent: true, depthWrite: false })); tickerLabel.position.y = 2.6; tickerLabel.scale.set(2.6, 1.3, 1); coreGrp.add(tickerLabel) }
      }

      // active speaker highlight
      const active = activeRef.current
      avatars.forEach((av, i) => {
        const on = active === i
        const targetHalo = on ? 4.4 : 2.6
        av.halo.scale.x += (targetHalo - av.halo.scale.x) * 0.15; av.halo.scale.y = av.halo.scale.x
        const mat = av.halo.material as THREE.SpriteMaterial; mat.opacity += ((on ? 0.95 : 0.4) - mat.opacity) * 0.15
        const bm = av.beam.material as THREE.MeshBasicMaterial; bm.opacity += ((on ? 0.28 : 0) - bm.opacity) * 0.12
        const sc = on ? 1.18 + Math.sin(t * 6) * 0.05 : 1
        av.core.scale.x += (sc - av.core.scale.x) * 0.15; av.core.scale.z = av.core.scale.x
      })

      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => { W = mount.clientWidth; H = mount.clientHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H) }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); window.removeEventListener('pointerup', up); window.removeEventListener('pointermove', move); renderer.domElement.removeEventListener('pointerdown', down)
      renderer.dispose(); if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
}
