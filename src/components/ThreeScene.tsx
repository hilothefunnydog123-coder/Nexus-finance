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
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x010609, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.35
    mount.appendChild(renderer.domElement)

    const scene  = new THREE.Scene()
    scene.fog    = new THREE.FogExp2(0x010609, 0.014)
    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 300)
    camera.lookAt(0, -1, 0)

    const FLOOR = -6

    // ── CANDLE FACTORY ────────────────────────────────────────────────────────
    type CandleObj = {
      g: THREE.Group; body: THREE.Mesh; bMat: THREE.MeshPhongMaterial
      edgeMat: THREE.LineBasicMaterial; isGreen: boolean; h: number; phase: number
    }

    function makeCandle(isGreen: boolean, h: number): CandleObj {
      const g = new THREE.Group()
      const bMat = new THREE.MeshPhongMaterial({
        color: isGreen ? 0x00d4aa : 0xff2d78,
        emissive: isGreen ? 0x003020 : 0x200010,
        shininess: 100, transparent: true, opacity: 0.96,
      })
      const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 1.1), bMat)
      body.position.y = h / 2
      const edgeMat = new THREE.LineBasicMaterial({
        color: isGreen ? 0x00ff88 : 0xff2d78,
        transparent: true, opacity: 0.65, blending: THREE.AdditiveBlending,
      })
      body.add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.1, h, 1.1)), edgeMat))
      g.add(body)
      // Top wick
      const wtH = 0.3 + Math.random() * 0.9
      const wkMat = new THREE.MeshBasicMaterial({ color: isGreen ? 0x00ff88 : 0xff2d78, transparent: true, opacity: 0.8 })
      const wt = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, wtH, 6), wkMat)
      wt.position.y = h + wtH / 2
      g.add(wt)
      // Bottom wick
      const wbH = 0.15 + Math.random() * 0.35
      const wb = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, wbH, 6), wkMat.clone())
      wb.position.y = -wbH / 2
      g.add(wb)
      return { g, body, bMat, edgeMat, isGreen, h, phase: Math.random() * Math.PI * 2 }
    }

    // ── CONCENTRIC ROTATING RINGS ─────────────────────────────────────────────
    type RingCandle = CandleObj & { exploding: boolean; explodeT: number }

    const RINGS = [
      { count: 10, r: 4,  speed:  0.014, hLo: 1.0, hHi: 2.5 },
      { count: 18, r: 9,  speed: -0.008, hLo: 0.8, hHi: 4.0 },
      { count: 28, r: 15, speed:  0.004, hLo: 0.5, hHi: 5.0 },
    ]

    const ringGroups: THREE.Group[] = []
    const allCandles: RingCandle[]  = []

    RINGS.forEach(cfg => {
      const grp = new THREE.Group()
      ringGroups.push(grp)
      scene.add(grp)
      for (let i = 0; i < cfg.count; i++) {
        const angle = (i / cfg.count) * Math.PI * 2
        const isGreen = Math.random() > 0.44
        const h = cfg.hLo + Math.random() * (cfg.hHi - cfg.hLo)
        const cd = makeCandle(isGreen, h)
        cd.g.position.set(Math.cos(angle) * cfg.r, FLOOR, Math.sin(angle) * cfg.r)
        grp.add(cd.g)
        allCandles.push({ ...cd, exploding: false, explodeT: 0 })
      }
    })

    // ── CENTRAL ORB ───────────────────────────────────────────────────────────
    const orbGroup = new THREE.Group()
    scene.add(orbGroup)
    const orbLayers = [
      { r: 0.28, c: 0xffffff, op: 1.0 },
      { r: 0.65, c: 0x00d4aa, op: 0.55 },
      { r: 1.3,  c: 0x00d4aa, op: 0.2  },
      { r: 2.5,  c: 0x3b8eea, op: 0.07 },
      { r: 5.5,  c: 0xa855f7, op: 0.025 },
    ]
    const orbMeshes = orbLayers.map(({ r, c, op }) => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(r, 16, 16),
        new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, blending: THREE.AdditiveBlending })
      )
      orbGroup.add(m)
      return m
    })

    // ── EXPLOSION PARTICLE POOL ───────────────────────────────────────────────
    const BURST_N = 180
    const bPos  = new Float32Array(BURST_N * 3).fill(5000)
    const bVel  = new Float32Array(BURST_N * 3)
    const bLife = new Float32Array(BURST_N)
    const bClr  = new Float32Array(BURST_N * 3)
    const burstGeo = new THREE.BufferGeometry()
    burstGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3))
    burstGeo.setAttribute('color',    new THREE.BufferAttribute(bClr, 3))
    scene.add(new THREE.Points(burstGeo,
      new THREE.PointsMaterial({ size: 0.22, vertexColors: true, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
    ))

    function spawnBurst(wx: number, wy: number, wz: number, isGreen: boolean) {
      let n = 0
      for (let i = 0; i < BURST_N && n < 45; i++) {
        if (bLife[i] <= 0) {
          bPos[i*3] = wx; bPos[i*3+1] = wy; bPos[i*3+2] = wz
          const spd = 0.1 + Math.random() * 0.28
          const th  = Math.random() * Math.PI * 2
          const ph  = Math.random() * Math.PI * 0.8
          bVel[i*3]   = Math.sin(ph) * Math.cos(th) * spd
          bVel[i*3+1] = Math.abs(Math.cos(ph)) * spd + 0.06
          bVel[i*3+2] = Math.sin(ph) * Math.sin(th) * spd
          bLife[i] = 1.0
          if (isGreen) { bClr[i*3] = 0; bClr[i*3+1] = 1; bClr[i*3+2] = 0.55 }
          else          { bClr[i*3] = 1; bClr[i*3+1] = 0.18; bClr[i*3+2] = 0.47 }
          n++
        }
      }
    }

    // ── LIGHTNING BOLT POOL ───────────────────────────────────────────────────
    const BOLT_PTS = 9
    type Bolt = { line: THREE.Line; mat: THREE.LineBasicMaterial; arr: Float32Array; life: number; active: boolean }
    const bolts: Bolt[] = Array.from({ length: 5 }, () => {
      const arr = new Float32Array(BOLT_PTS * 3)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(arr, 3))
      const mat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
      const line = new THREE.Line(geo, mat)
      scene.add(line)
      return { line, mat, arr, life: 0, active: false }
    })

    function fireBolt(ax: number, ay: number, az: number, bx: number, by: number, bz: number, clr: number) {
      const bolt = bolts.find(b => !b.active); if (!bolt) return
      for (let i = 0; i < BOLT_PTS; i++) {
        const t = i / (BOLT_PTS - 1)
        const j = i > 0 && i < BOLT_PTS - 1
        bolt.arr[i*3]   = ax + (bx-ax)*t + (j ? (Math.random()-.5)*3.5 : 0)
        bolt.arr[i*3+1] = ay + (by-ay)*t + (j ? (Math.random()-.5)*3.5 : 0)
        bolt.arr[i*3+2] = az + (bz-az)*t + (j ? (Math.random()-.5)*2.0 : 0)
      }
      bolt.line.geometry.attributes.position.needsUpdate = true
      bolt.mat.color.setHex(clr); bolt.mat.opacity = 1.0
      bolt.active = true; bolt.life = 1.0
    }

    // ── SHOCKWAVE RING POOL ───────────────────────────────────────────────────
    type Shock = { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; prog: number; active: boolean }
    const shocks: Shock[] = Array.from({ length: 7 }, () => {
      const mat  = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
      const mesh = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.25, 56), mat)
      mesh.rotation.x = -Math.PI / 2
      scene.add(mesh)
      return { mesh, mat, prog: 0, active: false }
    })

    function fireShock(x: number, z: number, clr: number) {
      const sw = shocks.find(s => !s.active); if (!sw) return
      sw.mesh.position.set(x, FLOOR + 0.25, z)
      sw.mat.color.setHex(clr); sw.active = true; sw.prog = 0
    }

    // ── SPIRAL PRICE CHART (orbits through the rings) ─────────────────────────
    const CHART_N = 80
    const chartBuf = new Float32Array(CHART_N * 3)
    let chartCY = 0
    for (let i = 0; i < CHART_N; i++) {
      const angle = (i / CHART_N) * Math.PI * 4  // 2 full orbits
      const r     = 6.5 + chartCY
      chartCY += (Math.random() - 0.46) * 0.7
      chartCY  = Math.max(-2.2, Math.min(2.2, chartCY))
      chartBuf[i*3]   = Math.cos(angle) * r
      chartBuf[i*3+1] = FLOOR + 3.5 + chartCY
      chartBuf[i*3+2] = Math.sin(angle) * r
    }
    const chartGeo = new THREE.BufferGeometry()
    chartGeo.setAttribute('position', new THREE.BufferAttribute(chartBuf.slice(), 3))
    chartGeo.setDrawRange(0, 0)
    scene.add(new THREE.Line(chartGeo, new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.9 })))
    const chartGlowGeo = new THREE.BufferGeometry()
    chartGlowGeo.setAttribute('position', new THREE.BufferAttribute(chartBuf.slice(), 3))
    chartGlowGeo.setDrawRange(0, 0)
    scene.add(new THREE.Line(chartGlowGeo, new THREE.LineBasicMaterial({ color: 0x00d4aa, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending })))
    // Glowing tip
    const tipMesh = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending }))
    scene.add(tipMesh)
    let chartProg = 0

    // ── DATA RAIN ─────────────────────────────────────────────────────────────
    const RAIN_N = 700
    const rainPos = new Float32Array(RAIN_N * 3)
    const rainClr = new Float32Array(RAIN_N * 3)
    const rainSpd = new Float32Array(RAIN_N)
    for (let i = 0; i < RAIN_N; i++) {
      rainPos[i*3]   = (Math.random()-.5)*70
      rainPos[i*3+1] = Math.random()*28 - 6
      rainPos[i*3+2] = (Math.random()-.5)*70
      rainSpd[i]     = 0.04 + Math.random()*0.1
      const g = Math.random() > 0.34
      rainClr[i*3] = g?0:1; rainClr[i*3+1] = g?0.83:0.18; rainClr[i*3+2] = g?0.42:0.47
    }
    const rainGeo = new THREE.BufferGeometry()
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
    rainGeo.setAttribute('color',    new THREE.BufferAttribute(rainClr, 3))
    scene.add(new THREE.Points(rainGeo,
      new THREE.PointsMaterial({ size: 0.07, vertexColors: true, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false })
    ))

    // ── DOLLAR/CRYPTO SYMBOL SPRITES ──────────────────────────────────────────
    const makeSymTex = (sym: string, color: string) => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128
      const ctx = cv.getContext('2d')!
      ctx.font = '900 78px -apple-system,system-ui,sans-serif'
      ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'
      ctx.globalAlpha = 0.9; ctx.fillText(sym, 64, 66)
      return new THREE.CanvasTexture(cv)
    }
    const SYM_CFG = [
      {s:'$',c:'#00d4aa',r:21,orbitSpd:0.005, y:0.5}, {s:'₿',c:'#f59e0b',r:24,orbitSpd:-0.004,y:2.5},
      {s:'€',c:'#3b8eea',r:18,orbitSpd:0.006, y:4.0}, {s:'$',c:'#00ff88',r:26,orbitSpd:-0.003,y:-1.0},
      {s:'%',c:'#a855f7',r:22,orbitSpd:0.007, y:5.5}, {s:'¥',c:'#ec4899',r:20,orbitSpd:-0.005,y:1.5},
      {s:'₿',c:'#f59e0b',r:28,orbitSpd:0.003, y:3.5}, {s:'£',c:'#00d4ff',r:17,orbitSpd:0.008, y:-2.0},
      {s:'$',c:'#00d4aa',r:23,orbitSpd:-0.006,y:6.0}, {s:'$',c:'#00ff88',r:25,orbitSpd:0.004, y:-3.0},
    ]
    const symObjs = SYM_CFG.map((cfg, i) => {
      const mat     = new THREE.SpriteMaterial({ map: makeSymTex(cfg.s, cfg.c), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false })
      const sprite  = new THREE.Sprite(mat)
      sprite.scale.set(4.5, 4.5, 1)
      const startAngle = (i / SYM_CFG.length) * Math.PI * 2
      sprite.position.set(Math.cos(startAngle)*cfg.r, cfg.y, Math.sin(startAngle)*cfg.r)
      scene.add(sprite)
      return { sprite, mat, angle: startAngle, r: cfg.r, orbitSpd: cfg.orbitSpd, y: cfg.y }
    })

    // ── GRID + FLOOR ──────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(100, 70, 0x00d4aa, 0x051008)
    ;(grid.material as THREE.Material).opacity = 0.18
    ;(grid.material as THREE.Material).transparent = true
    grid.position.y = FLOOR; scene.add(grid)

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x020a06, 2.5))
    const kL = new THREE.PointLight(0x00d4aa, 6, 45); scene.add(kL)
    const rL = new THREE.PointLight(0xff2d78, 4, 35); scene.add(rL)
    const gL = new THREE.PointLight(0xf59e0b, 2.5, 30); scene.add(gL)
    const pL = new THREE.PointLight(0xa855f7, 2.5, 28); scene.add(pL)
    const bL = new THREE.PointLight(0x3b8eea, 2, 28); scene.add(bL)

    // ── MOUSE ─────────────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    // ── ANIMATION LOOP ────────────────────────────────────────────────────────
    let t = 0, raf: number, nextExp = 0.5

    function animate() {
      raf = requestAnimationFrame(animate)
      t += 0.01

      // Ring rotation
      ringGroups[0].rotation.y += 0.014
      ringGroups[1].rotation.y -= 0.008
      ringGroups[2].rotation.y += 0.004

      // Candle wave + color pulse
      allCandles.forEach(cd => {
        if (cd.exploding) {
          cd.explodeT += 0.028
          let sy: number
          if      (cd.explodeT < 0.3)  sy = 1 + (cd.explodeT/0.3) * 4.2
          else if (cd.explodeT < 0.58) sy = 5.2
          else                          sy = Math.max(1, 5.2 - ((cd.explodeT-0.58)/0.42)*4.2)
          if (cd.explodeT >= 1.0)      { cd.exploding = false; cd.explodeT = 0; sy = 1 }
          cd.body.scale.y = Math.max(0.1, sy)
          cd.body.position.y = cd.h * Math.max(0.1, sy) / 2
        } else {
          const sy = Math.max(0.1, 1 + Math.sin(t * 2 + cd.phase) * 0.25)
          cd.body.scale.y = sy
          cd.body.position.y = cd.h * sy / 2
        }
        cd.bMat.emissiveIntensity = 0.07 + Math.sin(t * 3.5 + cd.phase) * 0.05
      })

      // Random explosion trigger
      nextExp -= 0.01
      if (nextExp <= 0) {
        nextExp = 0.5 + Math.random() * 1.2
        const cd = allCandles[Math.floor(Math.random() * allCandles.length)]
        if (cd && !cd.exploding) {
          cd.exploding = true; cd.explodeT = 0
          const wp = new THREE.Vector3(); cd.g.getWorldPosition(wp)
          spawnBurst(wp.x, wp.y + cd.h * 5.2, wp.z, cd.isGreen)
          fireShock(wp.x, wp.z, cd.isGreen ? 0x00d4aa : 0xff2d78)
          const nb = allCandles[Math.floor(Math.random() * allCandles.length)]
          if (nb && nb !== cd) {
            const np = new THREE.Vector3(); nb.g.getWorldPosition(np)
            fireBolt(wp.x, wp.y+cd.h, wp.z, np.x, np.y+nb.h, np.z, cd.isGreen ? 0x00ff88 : 0xff2d78)
          }
        }
      }

      // Burst particles update
      for (let i = 0; i < BURST_N; i++) {
        if (bLife[i] > 0) {
          bPos[i*3]   += bVel[i*3]
          bPos[i*3+1] += bVel[i*3+1]
          bPos[i*3+2] += bVel[i*3+2]
          bVel[i*3+1] -= 0.004
          bLife[i] -= 0.02
          if (bLife[i] <= 0) { bPos[i*3] = 5000; bPos[i*3+1] = 5000; bPos[i*3+2] = 5000 }
        }
      }
      burstGeo.attributes.position.needsUpdate = true

      // Lightning flicker
      bolts.forEach(b => {
        if (!b.active) return
        b.life -= 0.1
        b.mat.opacity = Math.max(0, b.life) * (Math.random() > 0.2 ? 1 : 0.04)
        if (b.life <= 0) { b.active = false; b.mat.opacity = 0 }
      })

      // Shockwaves
      shocks.forEach(sw => {
        if (!sw.active) return
        sw.prog += 0.022
        const s = sw.prog * 22
        sw.mesh.scale.set(s, s, s)
        sw.mat.opacity = Math.max(0, (1 - sw.prog) * 0.6)
        if (sw.prog >= 1) sw.active = false
      })

      // Orb pulse
      orbMeshes.forEach((m, i) => {
        ;(m.material as THREE.MeshBasicMaterial).opacity = orbLayers[i].op * (0.8 + Math.sin(t*2.8+i)*0.22)
      })

      // Spiral chart draws then resets
      chartProg += 0.5
      if (chartProg > CHART_N) chartProg = 0
      const pts = Math.min(CHART_N, Math.floor(chartProg))
      chartGeo.setDrawRange(0, pts); chartGlowGeo.setDrawRange(0, pts)
      if (pts > 0) {
        const ti = (pts-1)*3
        tipMesh.position.set(chartBuf[ti], chartBuf[ti+1], chartBuf[ti+2])
        ;(tipMesh.material as THREE.MeshBasicMaterial).opacity = 0.95
      }

      // Data rain falls
      for (let i = 0; i < RAIN_N; i++) {
        rainPos[i*3+1] -= rainSpd[i]
        if (rainPos[i*3+1] < -7) rainPos[i*3+1] = 20
      }
      rainGeo.attributes.position.needsUpdate = true

      // Symbol comets orbit
      symObjs.forEach(s => {
        s.angle += s.orbitSpd
        s.sprite.position.x = Math.cos(s.angle) * s.r
        s.sprite.position.z = Math.sin(s.angle) * s.r
        s.sprite.position.y = s.y + Math.sin(t * 0.9 + s.angle) * 2.8
        s.mat.opacity        = 0.22 + Math.sin(t * 1.3 + s.angle) * 0.1
      })

      // Lights orbit and pulse
      kL.position.set(Math.cos(t*.3)*7, 7, Math.sin(t*.3)*7)
      kL.intensity = 5 + Math.sin(t*2.2)*2.5
      rL.position.set(Math.cos(t*.4+2)*14, 0, Math.sin(t*.4+2)*14)
      gL.position.set(Math.cos(t*.5+4)*12, 4, Math.sin(t*.5+4)*12)
      pL.position.set(Math.cos(t*.35+1)*11, -2, Math.sin(t*.35+1)*11)
      bL.position.set(Math.cos(t*.28+3)*13, 3, Math.sin(t*.28+3)*13)

      // Camera orbits scene + mouse influence
      const mx = mouseRef.current.x, my = mouseRef.current.y
      const camAngle = t * 0.05 + mx * 0.5
      const sc = scrollRef.current
      camera.position.x = Math.sin(camAngle) * 30
      camera.position.z = Math.cos(camAngle) * 30
      camera.position.y = 13 - my * 5 - sc * 0.01
      camera.lookAt(0, -1, 0)

      renderer.render(scene, camera)
    }
    animate()

    // ── RESIZE ────────────────────────────────────────────────────────────────
    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
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

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
