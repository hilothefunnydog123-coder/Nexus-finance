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
    renderer.setClearColor(0x020810, 1)
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.25
    mount.appendChild(renderer.domElement)

    // ── SCENE / CAMERA ────────────────────────────────────────────────────────
    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0x020810, 0.02)
    const camera = new THREE.PerspectiveCamera(68, W / H, 0.1, 300)
    camera.position.set(0, 9, 22)
    camera.lookAt(0, -1, 0)

    // ── CANDLESTICK GRID ──────────────────────────────────────────────────────
    const COLS = 16, ROWS = 7, SP = 2.3
    const FLOOR = -5.5

    type Candle = {
      body: THREE.Mesh
      bMat: THREE.MeshPhongMaterial
      edgeMat: THREE.LineBasicMaterial
      wT: THREE.Mesh
      wB: THREE.Mesh
      isGreen: boolean
      h: number
      phase: number
      col: number
      row: number
    }

    const candleGroup = new THREE.Group()
    scene.add(candleGroup)
    const candles: Candle[] = []

    for (let c = 0; c < COLS; c++) {
      for (let r = 0; r < ROWS; r++) {
        const isGreen = Math.random() > 0.44
        const h = 0.6 + Math.random() * 3.8
        const x = (c - COLS / 2) * SP
        const z = (r - ROWS / 2) * SP - 1

        // Body
        const bGeo = new THREE.BoxGeometry(1.05, h, 1.05)
        const bMat = new THREE.MeshPhongMaterial({
          color: isGreen ? 0x00d4aa : 0xff2d78,
          emissive: isGreen ? 0x002218 : 0x200008,
          shininess: 90,
          transparent: true, opacity: 0.94,
        })
        const body = new THREE.Mesh(bGeo, bMat)
        body.position.set(x, FLOOR + h / 2, z)

        // Edge glow (child of body so it scales with it)
        const edgeGeo = new THREE.EdgesGeometry(bGeo)
        const edgeMat = new THREE.LineBasicMaterial({
          color: isGreen ? 0x00ff88 : 0xff2d78,
          transparent: true, opacity: 0.55,
          blending: THREE.AdditiveBlending,
        })
        body.add(new THREE.LineSegments(edgeGeo, edgeMat))
        candleGroup.add(body)

        // Top wick
        const wtH = 0.25 + Math.random() * 0.9
        const wGeo = new THREE.CylinderGeometry(0.055, 0.055, wtH, 6)
        const wMat = new THREE.MeshBasicMaterial({
          color: isGreen ? 0x00ff88 : 0xff2d78,
          transparent: true, opacity: 0.75,
        })
        const wT = new THREE.Mesh(wGeo, wMat)
        wT.position.set(x, FLOOR + h + wtH / 2, z)
        candleGroup.add(wT)

        // Bottom wick
        const wbH = 0.15 + Math.random() * 0.35
        const wBMat = new THREE.MeshBasicMaterial({
          color: isGreen ? 0x00d4aa : 0xff2d78,
          transparent: true, opacity: 0.6,
        })
        const wB = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, wbH, 6), wBMat)
        wB.position.set(x, FLOOR - wbH / 2, z)
        candleGroup.add(wB)

        candles.push({ body, bMat, edgeMat, wT, wB, isGreen, h, phase: Math.random() * Math.PI * 2, col: c, row: r })
      }
    }

    // ── LIVE PRICE CHART LINE ──────────────────────────────────────────────────
    // Generate realistic-looking OHLC-style path
    const CHART_N = 90
    const chartXs: number[] = []
    const chartYs: number[] = []
    let cy = 0
    for (let i = 0; i < CHART_N; i++) {
      cy += (Math.random() - 0.46) * 0.9
      cy = Math.max(-3.5, Math.min(3.5, cy))
      chartXs.push((i / (CHART_N - 1)) * 28 - 14)
      chartYs.push(cy)
    }

    const chartBuf = new Float32Array(CHART_N * 3)
    for (let i = 0; i < CHART_N; i++) {
      chartBuf[i * 3]     = chartXs[i]
      chartBuf[i * 3 + 1] = chartYs[i] + 0.5
      chartBuf[i * 3 + 2] = -7
    }

    // Main line
    const chartGeo = new THREE.BufferGeometry()
    chartGeo.setAttribute('position', new THREE.BufferAttribute(chartBuf.slice(), 3))
    chartGeo.setDrawRange(0, 0)
    const chartLine = new THREE.Line(chartGeo,
      new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.95 })
    )
    scene.add(chartLine)

    // Glow layer (thicker, dimmer)
    const chartGlowGeo = new THREE.BufferGeometry()
    chartGlowGeo.setAttribute('position', new THREE.BufferAttribute(chartBuf.slice(), 3))
    chartGlowGeo.setDrawRange(0, 0)
    const chartGlow = new THREE.Line(chartGlowGeo,
      new THREE.LineBasicMaterial({ color: 0x00d4aa, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending })
    )
    scene.add(chartGlow)

    // Trailing dot at chart tip
    const tipGeo = new THREE.SphereGeometry(0.18, 8, 8)
    const tipMesh = new THREE.Mesh(tipGeo,
      new THREE.MeshBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0, blending: THREE.AdditiveBlending })
    )
    scene.add(tipMesh)

    let chartProg = 0 // 0..CHART_N, resets

    // ── CURRENCY SYMBOL SPRITES ────────────────────────────────────────────────
    const makeSymTex = (sym: string, color: string) => {
      const cv = document.createElement('canvas')
      cv.width = 128; cv.height = 128
      const ctx = cv.getContext('2d')!
      ctx.clearRect(0, 0, 128, 128)
      ctx.font = `900 76px -apple-system,BlinkMacSystemFont,system-ui,sans-serif`
      ctx.fillStyle = color
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.globalAlpha = 0.9
      ctx.fillText(sym, 64, 66)
      return new THREE.CanvasTexture(cv)
    }

    const SYM_CONFIG = [
      { s:'$', c:'#00d4aa', r:14, sp:0.004,  y: 1.5, sc:3.5 },
      { s:'₿', c:'#f59e0b', r:17, sp:-0.003, y: 3.0, sc:3.0 },
      { s:'€', c:'#3b8eea', r:12, sp:0.005,  y: 2.0, sc:2.8 },
      { s:'$', c:'#00ff88', r:16, sp:-0.006, y:-0.5, sc:4.0 },
      { s:'%', c:'#a855f7', r:13, sp:0.007,  y: 4.5, sc:2.5 },
      { s:'¥', c:'#ec4899', r:15, sp:-0.004, y: 1.0, sc:2.8 },
      { s:'₿', c:'#f59e0b', r:11, sp:0.006,  y: 5.5, sc:2.2 },
      { s:'$', c:'#00d4aa', r:18, sp:-0.002, y:-1.5, sc:3.2 },
      { s:'£', c:'#00d4ff', r:10, sp:0.008,  y: 3.5, sc:2.5 },
    ]

    const symSprites = SYM_CONFIG.map((cfg, i) => {
      const mat = new THREE.SpriteMaterial({
        map: makeSymTex(cfg.s, cfg.c),
        transparent: true, opacity: 0.28,
        blending: THREE.AdditiveBlending, depthWrite: false,
      })
      const sprite = new THREE.Sprite(mat)
      const angle = (i / SYM_CONFIG.length) * Math.PI * 2
      sprite.position.set(Math.cos(angle) * cfg.r, cfg.y, Math.sin(angle) * cfg.r)
      sprite.scale.set(cfg.sc, cfg.sc, 1)
      scene.add(sprite)
      return { sprite, mat, angle, ...cfg }
    })

    // ── VOLUME BARS (behind candles) ───────────────────────────────────────────
    for (let c = 0; c < COLS; c++) {
      const volH = 0.2 + Math.random() * 1.5
      const x = (c - COLS / 2) * SP
      const z = (ROWS / 2) * SP + 2
      const isPos = Math.random() > 0.4
      const geo = new THREE.BoxGeometry(0.8, volH, 0.5)
      const mat = new THREE.MeshBasicMaterial({
        color: isPos ? 0x00d4aa : 0xff2d78,
        transparent: true, opacity: 0.18,
        blending: THREE.AdditiveBlending,
      })
      const m = new THREE.Mesh(geo, mat)
      m.position.set(x, FLOOR + volH / 2, z)
      scene.add(m)
    }

    // ── DATA RAIN PARTICLES ────────────────────────────────────────────────────
    const RAIN_N = 600
    const rainGeo = new THREE.BufferGeometry()
    const rainPos = new Float32Array(RAIN_N * 3)
    const rainClr = new Float32Array(RAIN_N * 3)
    const rainSpd = new Float32Array(RAIN_N)
    for (let i = 0; i < RAIN_N; i++) {
      rainPos[i * 3]     = (Math.random() - 0.5) * 50
      rainPos[i * 3 + 1] = Math.random() * 20 - 5
      rainPos[i * 3 + 2] = (Math.random() - 0.5) * 40
      rainSpd[i] = 0.03 + Math.random() * 0.07
      const green = Math.random() > 0.32
      rainClr[i * 3]     = green ? 0 : 1
      rainClr[i * 3 + 1] = green ? 0.83 : 0.18
      rainClr[i * 3 + 2] = green ? 0.42 : 0.47
    }
    rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
    rainGeo.setAttribute('color',    new THREE.BufferAttribute(rainClr, 3))
    const rainMat = new THREE.PointsMaterial({
      size: 0.065, vertexColors: true,
      transparent: true, opacity: 0.65,
      blending: THREE.AdditiveBlending, depthWrite: false,
    })
    const rain = new THREE.Points(rainGeo, rainMat)
    scene.add(rain)

    // ── GRID FLOOR ────────────────────────────────────────────────────────────
    const grid = new THREE.GridHelper(70, 50, 0x00d4aa, 0x061810)
    ;(grid.material as THREE.Material).opacity = 0.2
    ;(grid.material as THREE.Material).transparent = true
    grid.position.y = FLOOR
    scene.add(grid)

    // ── LIGHTS ────────────────────────────────────────────────────────────────
    scene.add(new THREE.AmbientLight(0x041008, 2.5))

    const keyLight  = new THREE.PointLight(0x00d4aa, 5, 35)
    keyLight.position.set(0, 6, 6)
    scene.add(keyLight)

    const redLight  = new THREE.PointLight(0xff2d78, 3, 28)
    redLight.position.set(-10, 0, 0)
    scene.add(redLight)

    const goldLight = new THREE.PointLight(0xf59e0b, 2, 22)
    scene.add(goldLight)

    const blueLight = new THREE.PointLight(0x3b8eea, 1.5, 25)
    scene.add(blueLight)

    // ── MOUSE ─────────────────────────────────────────────────────────────────
    const onMouse = (e: MouseEvent) => {
      mouseRef.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouseRef.current.y = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    // ── ANIMATION LOOP ────────────────────────────────────────────────────────
    let t = 0, raf: number

    function animate() {
      raf = requestAnimationFrame(animate)
      t += 0.009

      // ── Candle wave animation ────────────────────────────────────────────
      candles.forEach(cd => {
        const wave = Math.sin(t * 1.6 + cd.phase + cd.col * 0.45 + cd.row * 0.55) * 0.32
        const sy = Math.max(0.15, 1 + wave)
        const nh = cd.h * sy

        cd.body.scale.y = sy
        cd.body.position.y = FLOOR + nh / 2

        cd.wT.position.y = FLOOR + nh + 0.22
        cd.wB.position.y = FLOOR - 0.12

        // Emissive glow pulse
        cd.bMat.emissiveIntensity = 0.08 + Math.sin(t * 2.5 + cd.phase) * 0.05

        // Occasional flip (1 in 1000 per frame)
        if (Math.random() < 0.0008) {
          cd.isGreen = !cd.isGreen
          cd.bMat.color.setHex(cd.isGreen ? 0x00d4aa : 0xff2d78)
          cd.bMat.emissive.setHex(cd.isGreen ? 0x002218 : 0x200008)
          cd.edgeMat.color.setHex(cd.isGreen ? 0x00ff88 : 0xff2d78)
          ;(cd.wT.material as THREE.MeshBasicMaterial).color.setHex(cd.isGreen ? 0x00ff88 : 0xff2d78)
        }
      })

      // ── Chart line draws then resets ─────────────────────────────────────
      chartProg += 0.55
      if (chartProg > CHART_N) chartProg = 0
      const pts = Math.min(CHART_N, Math.floor(chartProg))
      chartGeo.setDrawRange(0, pts)
      chartGlowGeo.setDrawRange(0, pts)

      // Tip dot follows chart
      if (pts > 0) {
        const ti = (pts - 1) * 3
        tipMesh.position.set(chartBuf[ti], chartBuf[ti + 1], chartBuf[ti + 2])
        ;(tipMesh.material as THREE.MeshBasicMaterial).opacity = 0.9
      }

      // ── Currency symbols orbit ───────────────────────────────────────────
      symSprites.forEach(s => {
        s.angle += s.sp
        s.sprite.position.x = Math.cos(s.angle) * s.r
        s.sprite.position.z = Math.sin(s.angle) * s.r
        s.sprite.position.y = s.y + Math.sin(t * 0.7 + s.angle) * 1.2
        s.mat.opacity = 0.2 + Math.sin(t * 0.9 + s.angle) * 0.1
      })

      // ── Rain particles fall ──────────────────────────────────────────────
      const rp = rainGeo.attributes.position.array as Float32Array
      for (let i = 0; i < RAIN_N; i++) {
        rp[i * 3 + 1] -= rainSpd[i]
        if (rp[i * 3 + 1] < -6) rp[i * 3 + 1] = 14
      }
      rainGeo.attributes.position.needsUpdate = true

      // ── Lights animate ───────────────────────────────────────────────────
      keyLight.intensity  = 4.5 + Math.sin(t * 1.4) * 1.5
      goldLight.position.set(Math.cos(t * 0.35) * 12, -2, Math.sin(t * 0.35) * 10)
      blueLight.position.set(Math.cos(t * 0.25 + 2) * 14, 3, Math.sin(t * 0.25 + 2) * 10)
      redLight.position.x = -10 + Math.sin(t * 0.5) * 4

      // ── Mouse parallax ───────────────────────────────────────────────────
      const mx = mouseRef.current.x, my = mouseRef.current.y
      candleGroup.rotation.y += (mx * 0.14 - candleGroup.rotation.y) * 0.035
      candleGroup.rotation.x += (-my * 0.07 - candleGroup.rotation.x) * 0.035

      // ── Scroll ───────────────────────────────────────────────────────────
      const sc = scrollRef.current
      camera.position.z = 22 + sc * 0.013
      camera.position.y = 9  - sc * 0.007

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

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }} />
}
