'use client'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export default function ThreeScene({ scrollY }: { scrollY: number }) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    raf: number
    group: THREE.Group
    particles: THREE.Points
    rings: THREE.Mesh[]
    grid: THREE.GridHelper
  } | null>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // SCENE
    const scene    = new THREE.Scene()
    scene.fog      = new THREE.FogExp2(0x030a10, 0.035)
    const camera   = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200)
    camera.position.set(0, 2, 14)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x030a10, 1)
    mount.appendChild(renderer.domElement)

    // GRID
    const grid = new THREE.GridHelper(120, 60, 0x00d4aa, 0x0c1e2e)
    grid.position.y = -6
    ;(grid.material as THREE.Material).opacity = 0.4
    ;(grid.material as THREE.Material).transparent = true
    scene.add(grid)

    // TORUS KNOT (main hero shape)
    const group = new THREE.Group()
    scene.add(group)

    const knotGeo  = new THREE.TorusKnotGeometry(3, 0.8, 200, 32, 2, 3)
    const knotMat  = new THREE.MeshPhongMaterial({
      color: 0x00d4aa, emissive: 0x003322, wireframe: false,
      transparent: true, opacity: 0.15,
    })
    const knotWire = new THREE.MeshBasicMaterial({ color: 0x00d4aa, wireframe: true, transparent: true, opacity: 0.4 })
    const knot     = new THREE.Mesh(knotGeo, knotMat)
    const knotW    = new THREE.Mesh(knotGeo, knotWire)
    group.add(knot, knotW)

    // ORBITING RINGS
    const rings: THREE.Mesh[] = []
    const ringConfigs = [
      { r: 5.5, tube: 0.06, clr: 0x00d4aa, tilt: 0.4, speed: 0.008 },
      { r: 7,   tube: 0.04, clr: 0x3b8eea, tilt: 1.1, speed: -0.005 },
      { r: 9,   tube: 0.03, clr: 0xa855f7, tilt: 0.8, speed: 0.003 },
    ]
    ringConfigs.forEach(({ r, tube, clr, tilt }) => {
      const geo = new THREE.TorusGeometry(r, tube, 16, 100)
      const mat = new THREE.MeshBasicMaterial({ color: clr, transparent: true, opacity: 0.7 })
      const ring = new THREE.Mesh(geo, mat)
      ring.rotation.x = tilt
      group.add(ring)
      rings.push(ring)
    })

    // FLOATING ICOSAHEDRA (data nodes)
    const icoGeo = new THREE.IcosahedronGeometry(0.3, 0)
    const dataNodes: THREE.Mesh[] = []
    for (let i = 0; i < 20; i++) {
      const mat  = new THREE.MeshBasicMaterial({ color: [0x00d4aa, 0x3b8eea, 0xa855f7, 0xf59e0b][i % 4], wireframe: true })
      const mesh = new THREE.Mesh(icoGeo, mat)
      const theta = (i / 20) * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 8 + Math.random() * 8
      mesh.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi) * 0.5, r * Math.sin(phi) * Math.sin(theta))
      mesh.userData = { speed: 0.003 + Math.random() * 0.006, theta, r }
      scene.add(mesh)
      dataNodes.push(mesh)
    }

    // PARTICLES
    const pCount = 3000
    const pGeo   = new THREE.BufferGeometry()
    const pPos   = new Float32Array(pCount * 3)
    const pClrs  = new Float32Array(pCount * 3)
    const palette = [[0, 0.83, 0.67], [0.23, 0.55, 0.92], [0.66, 0.33, 0.97], [0.96, 0.62, 0.04]]
    for (let i = 0; i < pCount; i++) {
      pPos[i*3]   = (Math.random() - 0.5) * 120
      pPos[i*3+1] = (Math.random() - 0.5) * 60
      pPos[i*3+2] = (Math.random() - 0.5) * 120
      const c     = palette[Math.floor(Math.random() * palette.length)]
      pClrs[i*3]  = c[0]; pClrs[i*3+1] = c[1]; pClrs[i*3+2] = c[2]
    }
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    pGeo.setAttribute('color',    new THREE.BufferAttribute(pClrs, 3))
    const pMat      = new THREE.PointsMaterial({ size: 0.12, vertexColors: true, transparent: true, opacity: 0.8, sizeAttenuation: true })
    const particles = new THREE.Points(pGeo, pMat)
    scene.add(particles)

    // LIGHTS
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const dLight = new THREE.DirectionalLight(0x00d4aa, 2)
    dLight.position.set(10, 10, 5)
    scene.add(dLight)
    const pLight1 = new THREE.PointLight(0x3b8eea, 3, 30)
    pLight1.position.set(-8, 4, 8)
    scene.add(pLight1)
    const pLight2 = new THREE.PointLight(0xa855f7, 2, 25)
    pLight2.position.set(8, -4, -8)
    scene.add(pLight2)

    // MOUSE PARALLAX
    let mx = 0, my = 0
    const onMouse = (e: MouseEvent) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2
      my = (e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener('mousemove', onMouse)

    let t = 0
    function animate() {
      t += 0.005
      // Rotate main group
      group.rotation.y = t * 0.3 + mx * 0.3
      group.rotation.x = Math.sin(t * 0.2) * 0.15 + my * 0.2
      // Rings
      rings.forEach((r, i) => { r.rotation.z += ringConfigs[i].speed })
      // Particles drift
      particles.rotation.y = t * 0.02
      // Data nodes orbit
      dataNodes.forEach(n => {
        n.userData.theta += n.userData.speed
        n.position.x = n.userData.r * Math.cos(n.userData.theta)
        n.position.z = n.userData.r * Math.sin(n.userData.theta)
        n.rotation.x += 0.01; n.rotation.y += 0.008
      })
      // Camera parallax + scroll
      camera.position.x += (mx * 1.5 - camera.position.x) * 0.04
      camera.position.y += (-my * 1.0 - camera.position.y + 2) * 0.04
      // Grid scroll effect
      grid.position.z = (t * 2) % 2
      camera.lookAt(0, 0, 0)
      renderer.render(scene, camera)
      sceneRef.current!.raf = requestAnimationFrame(animate)
    }

    sceneRef.current = { renderer, scene, camera, raf: 0, group, particles, rings, grid }
    animate()

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(sceneRef.current?.raf ?? 0)
      window.removeEventListener('mousemove', onMouse)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [])

  // Update camera on scroll
  useEffect(() => {
    if (!sceneRef.current) return
    const { camera } = sceneRef.current
    const t = scrollY / (document.body.scrollHeight - window.innerHeight)
    camera.position.z = 14 - t * 6
    camera.position.y = 2  - t * 3
  }, [scrollY])

  return <div ref={mountRef} style={{ position: 'fixed', inset: 0, zIndex: 0 }} />
}
