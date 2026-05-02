'use client'

import { useEffect, useRef } from 'react'

const COLORS = ['#00d4aa','#1e90ff','#ffa502','#a855f7','#ff4757','#00ffcc','#fff']

export default function Confetti() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const pieces = Array.from({ length: 150 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * -canvas.height,
      w: Math.random() * 12 + 4,
      h: Math.random() * 6 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 8,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      opacity: 1,
    }))

    let frame: number
    let start = Date.now()

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      const elapsed = Date.now() - start

      pieces.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.rot += p.rotSpeed
        if (elapsed > 2000) p.opacity = Math.max(0, p.opacity - 0.01)

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x + p.w / 2, p.y + p.h / 2)
        ctx.rotate((p.rot * Math.PI) / 180)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (elapsed < 4000) {
        frame = requestAnimationFrame(animate)
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }

    animate()
    return () => cancelAnimationFrame(frame)
  }, [])

  return (
    <canvas ref={ref} className="fixed inset-0 z-[9999] pointer-events-none" />
  )
}
