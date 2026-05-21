'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeScene({ scrollY }: { scrollY: number }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const scrollRef = useRef(0)
  const mouseRef  = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const mount = mountRef.current; if (!mount) return

    // ── RENDERER ──────────────────────────────────────────────────────────────
    const W = window.innerWidth, H = window.innerHeight
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x020509, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.3
    mount.appendChild(renderer.domElement)

    // ── SCENE / CAMERA ────────────────────────────────────────────────────────
    const scene  = new THREE.Scene()
    scene.fog    = new THREE.FogExp2(0x020509, 0.018)
    const camera = new THREE.PerspectiveCamera(72, W / H, 0.1, 400)
    camera.position.set(0, 4, 20)
    camera.lookAt(0, 0, 0)

    // ── GALAXY PARTICLE SYSTEM ────────────────────────────────────────────────
    const GALAXY_N = 16000
    const gPos   = new Float32Array(GALAXY_N * 3)
    const gClr   = new Float32Array(GALAXY_N * 3)
    const MAX_R  = 18
    const ARMS   = 3

    for (let i = 0; i < GALAXY_N; i++) {
      const arm    = i % ARMS
      const armOff = (arm / ARMS) * Math.PI * 2
      const t      = i / GALAXY_N
      const radius = 0.3 + t * MAX_R
      const spin   = radius * 1.4
      const angle  = t * Math.PI * 14 + armOff + spin
      const sc     = radius * 0.22

      gPos[i*3]   = Math.cos(angle) * radius + (Math.random()-0.5)*sc
      gPos[i*3+1] = (Math.random()-0.5) * radius * 0.06
      gPos[i*3+2] = Math.sin(angle) * radius + (Math.random()-0.5)*sc

      const ct = radius / MAX_R
      if (ct < 0.15) {
        // Core: bright white-teal
        gClr[i*3]=1; gClr[i*3+1]=1; gClr[i*3+2]=1
      } else if (ct < 0.45) {
        const b = (ct-0.15)/0.3
        gClr[i*3]=0*(1-b)+0.1*b; gClr[i*3+1]=0.9-b*0.3; gClr[i*3+2]=1
      } else {
        const b = (ct-0.45)/0.55
        gClr[i*3]=0.45+b*0.5; gClr[i*3+1]=0.05; gClr[i*3+2]=1-b*0.25
      }
    }

    const galaxyGeo = new THREE.BufferGeometry()
    galaxyGeo.setAttribute('position', new THREE.BufferAttribute(gPos, 3))
    galaxyGeo.setAttribute('color',    new THREE.BufferAttribute(gClr, 3))
    const galaxyMat = new THREE.PointsMaterial({
      size: 0.07, vertexColors: true, transparent: true, opacity: 0.88,
      blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true,
    })
    const galaxy = new THREE.Points(galaxyGeo, galaxyMat)
    galaxy.rotation.x = 0.12
    scene.add(galaxy)

    // ── TORUS KNOT (HERO SHAPE) ───────────────────────────────────────────────
    const knotGroup = new THREE.Group()
    scene.add(knotGroup)

    const knotGeo = new THREE.TorusKnotGeometry(3.0, 0.75, 280, 32, 2, 3)

    // Solid glassy core
    const knotMatSolid = new THREE.MeshPhongMaterial({
      color: 0x00d4aa, emissive: 0x003a28, shininess: 120,
      transparent: true, opacity: 0.1,
    })
    knotGroup.add(new THREE.Mesh(knotGeo, knotMatSolid))

    // Primary wireframe — teal
    knotGroup.add(new THREE.Mesh(knotGeo, new THREE.MeshBasicMaterial({
      color: 0x00d4aa, wireframe: true, transparent: true, opacity: 0.38,
    })))

    // Second tighter knot — purple
    const knotGeo2 = new THREE.TorusKnotGeometry(2.1, 0.38, 200, 24, 3, 5)
    knotGroup.add(new THREE.Mesh(knotGeo2, new THREE.MeshBasicMaterial({
      color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.28,
    })))

    // Third knot — blue accent
    const knotGeo3 = new THREE.TorusKnotGeometry(1.5, 0.22, 160, 20, 4, 7)
    knotGroup.add(new THREE.Mesh(knotGeo3, new THREE.MeshBasicMaterial({
      color: 0x3b8eea, wireframe: true, transparent: true, opacity: 0.2,
    })))

    // ── CORE GLOW ONION LAYERS ────────────────────────────────────────────────
    const glowGroup = new THREE.Group()
    scene.add(glowGroup)
    const glowLayers = [
      { r:0.28, c:0xffffff, op:0.95 },
      { r:0.65, c:0x00d4aa, op:0.45 },
      { r:1.2,  c:0x00d4aa, op:0.18 },
      { r:2.2,  c:0x3b8eea, op:0.07 },
      { r:4.0,  c:0xa855f7, op:0.035 },
    ]
    const glowMeshes = glowLayers.map(({ r, c, op }) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({ color:c, transparent:true, opacity:op, depthWrite:false, blending:THREE.AdditiveBlending })
      )
      glowGroup.add(m)
      return { m, baseOp: op }
    })

    // ── ORBITAL RINGS ─────────────────────────────────────────────────────────
    const ringData = [
      { r:5.2,  tube:0.045, c:0x00d4aa, tx:0.35,  tz:0,   spd: 0.007 },
      { r:7.0,  tube:0.032, c:0x3b8eea, tx:1.05,  tz:0.5, spd:-0.0045 },
      { r:9.0,  tube:0.028, c:0xa855f7, tx:0.65,  tz:1.2, spd: 0.0032 },
      { r:11.2, tube:0.02,  c:0xff2d78, tx:1.45,  tz:0.8, spd:-0.0028 },
      { r:6.0,  tube:0.038, c:0x00ff88, tx:-0.85, tz:0.3, spd: 0.0065 },
      { r:8.2,  tube:0.022, c:0xf59e0b, tx:1.75,  tz:1.6, spd:-0.003  },
    ]
    const orbRings = ringData.map(d => {
      const geo = new THREE.TorusGeometry(d.r, d.tube, 16, 140)
      const mat = new THREE.MeshBasicMaterial({ color:d.c, transparent:true, opacity:0.75, blending:THREE.AdditiveBlending })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = d.tx; mesh.rotation.z = d.tz
      scene.add(mesh)
      return { mesh, spd: d.spd }
    })

    // ── EXPANDING SHOCKWAVE RINGS ─────────────────────────────────────────────
    const shockCount = 4
    const shockRings = Array.from({ length: shockCount }, (_, i) => {
      const geo  = new THREE.RingGeometry(0.05, 0.1, 64)
      const mat  = new THREE.MeshBasicMaterial({ color:0x00d4aa, transparent:true, opacity:0, side:THREE.DoubleSide, blending:THREE.AdditiveBlending, depthWrite:false })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = Math.PI / 2
      scene.add(mesh)
      return { mesh, mat, progress: i / shockCount }
    })

    // ── FLOATING ICOSAHEDRA (data nodes) ──────────────────────────────────────
    const icoGeo = new THREE.IcosahedronGeometry(0.25, 0)
    const dataNodes: { mesh: THREE.Mesh; theta: number; phi: number; r: number; spd: number }[] = []
    const nodeColors = [0x00d4aa, 0x3b8eea, 0xa855f7, 0xf59e0b, 0xff2d78, 0x00ff88]
    for (let i = 0; i < 24; i++) {
      const mat   = new THREE.MeshBasicMaterial({ color: nodeColors[i%6], wireframe: true, transparent: true, opacity: 0.7 })
      const mesh  = new THREE.Mesh(icoGeo, mat)
      const theta = (i/24)*Math.PI*2
      const phi   = Math.acos(2*Math.random()-1)
      const r     = 7 + Math.random()*9
      mesh.position.set(r*Math.sin(phi)*Math.cos(theta), r*Math.cos(phi)*0.45, r*Math.sin(phi)*Math.sin(theta))
      scene.add(mesh)
      dataNodes.push({ mesh, theta, phi, r, spd: 0.004+Math.random()*0.007 })
    }

    // ── AMBIENT PARTICLES (halo cloud) ────────────────────────────────────────
    const haloN   = 800
    const haloGeo = new THREE.BufferGeometry()
    const haloPos = new Float32Array(haloN * 3)
    const haloClr = new Float32Array(haloN * 3)
    const hColors = [[0,0.83,0.67],[0.23,0.55,0.92],[0.66,0.33,0.97],[0.96,0.62,0.04],[1,0.18,0.47],[0,1,0.53]]
    for (let i = 0; i < haloN; i++) {
      const theta = Math.random()*Math.PI*2
      const phi   = Math.acos(2*Math.random()-1)
      const r     = 3.5+Math.random()*9
      haloPos[i*3]  = Math.sin(phi)*Math.cos(theta)*r
      haloPos[i*3+1]= Math.cos(phi)*r*0.55
      haloPos[i*3+2]= Math.sin(phi)*Math.sin(theta)*r
      const hc = hColors[i%hColors.length]
      haloClr[i*3]=hc[0]; haloClr[i*3+1]=hc[1]; haloClr[i*3+2]=hc[2]
    }
    haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3))
    haloGeo.setAttribute('color',    new THREE.BufferAttribute(haloClr, 3))
    const haloMat = new THREE.PointsMaterial({ size:0.055, vertexColors:true, transparent:true, opacity:0.65, blending:THREE.AdditiveBlending, depthWrite:false })
    scene.add(new THREE.Points(haloGeo, haloMat))

    // ── GRID ──────────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(200, 90, 0x00d4aa, 0x0a1a24)
    ;(grid.material as THREE.Material).opacity = 0.16
    ;(grid.material as THREE.Material).transparent = true
    grid.position.y = -9
    scene.add(grid)

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x081020, 2.5))
    const coreLight  = new THREE.PointLight(0x00d4aa, 5, 22)
    coreLight.position.set(0, 0, 0)
    scene.add(coreLight)
    const orbitL1 = new THREE.PointLight(0xa855f7, 2.5, 35)
    scene.add(orbitL1)
    const orbitL2 = new THREE.PointLight(0x3b8eea, 2, 30)
    scene.add(orbitL2)
    const orbitL3 = new THREE.PointLight(0xff2d78, 1.5, 28)
    scene.add(orbitL3)

    // ── MOUSE / SCROLL ────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX/window.innerWidth - 0.5) * 2
      mouseRef.current.y = (e.clientY/window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    // ── ANIMATION LOOP ────────────────────────────────────────────────────────
    let t = 0, raf: number
    const baseY = scene.rotation.y
    const baseX = scene.rotation.x

    function animate() {
      raf = requestAnimationFrame(animate)
      t += 0.007

      // Knot rotation
      knotGroup.rotation.x += 0.004
      knotGroup.rotation.y += 0.007

      // Galaxy slow spin
      galaxy.rotation.y += 0.0008

      // Rings orbit
      orbRings.forEach(({ mesh, spd }) => {
        mesh.rotation.z += spd
        mesh.rotation.y += spd * 0.25
      })

      // Shockwave rings expand outward from core
      shockRings.forEach(sh => {
        sh.progress += 0.004
        if (sh.progress >= 1) sh.progress = 0
        const s = sh.progress * 14
        sh.mesh.scale.setScalar(s)
        sh.mat.opacity = Math.max(0, (1-sh.progress) * 0.45)
        // Color pulse between teal and purple
        const hue = sh.progress < 0.5 ? 0x00d4aa : 0xa855f7
        sh.mat.color.setHex(hue)
      })

      // Glow layers pulse
      glowMeshes.forEach(({ m, baseOp }, i) => {
        ;(m.material as THREE.MeshBasicMaterial).opacity = baseOp * (0.8+Math.sin(t*2.5+i)*0.2)
      })

      // Core light pulse + hue shift
      coreLight.intensity = 4 + Math.sin(t*1.8) * 2
      const hue = (Math.sin(t*0.4)+1)*0.5
      coreLight.color.setRGB(hue*0.2, 0.83*(1-hue*0.3), 0.67)

      // Orbit lights circle
      orbitL1.position.set(Math.cos(t*0.25)*12, 5, Math.sin(t*0.25)*12)
      orbitL2.position.set(Math.cos(t*0.18+2)*11, -4, Math.sin(t*0.18+2)*11)
      orbitL3.position.set(Math.cos(t*0.32+4)*10, 2, Math.sin(t*0.32+4)*10)

      // Data nodes orbit
      dataNodes.forEach(d => {
        d.theta += d.spd
        d.mesh.position.x = d.r * Math.sin(d.phi) * Math.cos(d.theta)
        d.mesh.position.z = d.r * Math.sin(d.phi) * Math.sin(d.theta)
        d.mesh.rotation.x += 0.02; d.mesh.rotation.y += 0.015
      })

      // Grid pulse — move toward camera for warp effect
      grid.position.z = ((t * 2) % 3) - 1

      // Mouse parallax — smooth scene rotation
      const mx = mouseRef.current.x, my = mouseRef.current.y
      scene.rotation.y += (mx * 0.18 - (scene.rotation.y - baseY)) * 0.025
      scene.rotation.x += (-my * 0.1  - (scene.rotation.x - baseX)) * 0.025

      // Scroll: camera pulls back, knot shrinks slightly
      const sc = scrollRef.current
      camera.position.z = 20 + sc * 0.014
      camera.position.y = 4  - sc * 0.006
      knotGroup.scale.setScalar(Math.max(0.4, 1 - sc * 0.0008))

      renderer.render(scene, camera)
    }
    animate()

    // ── RESIZE ────────────────────────────────────────────────────────────────
    const onResize = () => {
      const nW = window.innerWidth, nH = window.innerHeight
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => { scrollRef.current = scrollY }, [scrollY])

  return <div ref={mountRef} style={{ position:'fixed', inset:0, zIndex:0, pointerEvents:'none' }} />
}
