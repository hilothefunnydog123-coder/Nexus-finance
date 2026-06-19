'use client'

/**
 * The machine, in 3D. A real Three.js scene: the neural network rendered as
 * glowing rings of nodes connected through space, with signals traveling the
 * edges. Drag to orbit, it auto-rotates. Raw three (no r3f), additive glow.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

function glowTexture(): THREE.Texture {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.25, 'rgba(255,255,255,.8)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, 64, 64)
  const t = new THREE.Texture(c)
  t.needsUpdate = true
  return t
}

export default function TradingFloor3D() {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let W = mount.clientWidth, H = mount.clientHeight
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200)
    camera.position.set(0, 1.5, 18)
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio))
    renderer.setSize(W, H)
    mount.appendChild(renderer.domElement)

    const group = new THREE.Group()
    scene.add(group)
    const tex = glowTexture()

    const CYAN = new THREE.Color('#22d3ee')
    const VIOLET = new THREE.Color('#a78bfa')

    const sizes = [11, 16, 12, 1]
    const spanX = 14
    const layerX = (l: number) => (l / (sizes.length - 1) - 0.5) * spanX
    type N = { pos: THREE.Vector3; layer: number }
    const nodes: N[] = []
    const byLayer: N[][] = []

    sizes.forEach((count, l) => {
      const arr: N[] = []
      const radius = count === 1 ? 0 : 3.4
      for (let i = 0; i < count; i++) {
        const ang = (i / count) * Math.PI * 2 + l * 0.4
        const pos = new THREE.Vector3(layerX(l), Math.sin(ang) * radius, Math.cos(ang) * radius)
        const n: N = { pos, layer: l }
        nodes.push(n); arr.push(n)
        const col = l === sizes.length - 1 ? VIOLET : CYAN
        // core
        const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 16), new THREE.MeshBasicMaterial({ color: col }))
        core.position.copy(pos); group.add(core)
        // halo
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false }))
        halo.position.copy(pos); halo.scale.setScalar(1.5); group.add(halo)
      }
      byLayer.push(arr)
    })

    // edges
    const edgeList: [THREE.Vector3, THREE.Vector3][] = []
    const linePos: number[] = []
    for (let l = 0; l < sizes.length - 1; l++) {
      for (const a of byLayer[l]) {
        const targets = [...byLayer[l + 1]].sort((p, q) => a.pos.distanceTo(p.pos) - a.pos.distanceTo(q.pos)).slice(0, 3)
        for (const b of targets) {
          edgeList.push([a.pos, b.pos])
          linePos.push(a.pos.x, a.pos.y, a.pos.z, b.pos.x, b.pos.y, b.pos.z)
        }
      }
    }
    const lineGeo = new THREE.BufferGeometry()
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3))
    const lines = new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({ color: 0x5a7da0, transparent: true, opacity: 0.16 }))
    group.add(lines)

    // pulses
    type P = { a: THREE.Vector3; b: THREE.Vector3; t: number; speed: number; sprite: THREE.Sprite }
    const pulses: P[] = []
    const mkPulse = (): P => {
      const [a, b] = edgeList[Math.floor(Math.random() * edgeList.length)]
      const col = Math.random() < 0.5 ? CYAN : VIOLET
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: col, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }))
      sprite.scale.setScalar(0.7)
      group.add(sprite)
      return { a, b, t: Math.random(), speed: 0.006 + Math.random() * 0.01, sprite }
    }
    for (let i = 0; i < 46; i++) pulses.push(mkPulse())

    // drag-to-orbit
    let drag = false, px = 0, py = 0, velX = 0.0016, velY = 0, rotX = 0.1
    const down = (e: PointerEvent) => { drag = true; px = e.clientX; py = e.clientY }
    const up = () => { drag = false }
    const move = (e: PointerEvent) => { if (!drag) return; velY = (e.clientX - px) * 0.00018; rotX = Math.max(-0.6, Math.min(0.6, rotX + (e.clientY - py) * 0.0012)); px = e.clientX; py = e.clientY }
    renderer.domElement.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointermove', move)

    let raf = 0
    const tmp = new THREE.Vector3()
    const animate = () => {
      if (!reduce) {
        group.rotation.y += velY + 0.0016
        velY *= 0.95
        group.rotation.x += (rotX - group.rotation.x) * 0.05
        for (const p of pulses) {
          p.t += p.speed
          if (p.t >= 1) { p.t = 0; const [a, b] = edgeList[Math.floor(Math.random() * edgeList.length)]; p.a = a; p.b = b }
          tmp.copy(p.a).lerp(p.b, p.t)
          p.sprite.position.copy(tmp)
          p.sprite.material.opacity = 0.5 + Math.sin(p.t * Math.PI) * 0.5
        }
      }
      renderer.render(scene, camera)
      raf = requestAnimationFrame(animate)
    }
    animate()

    const onResize = () => { W = mount.clientWidth; H = mount.clientHeight; camera.aspect = W / H; camera.updateProjectionMatrix(); renderer.setSize(W, H) }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointermove', move)
      renderer.domElement.removeEventListener('pointerdown', down)
      renderer.dispose()
      lineGeo.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} style={{ position: 'absolute', inset: 0, cursor: 'grab' }} />
}
