'use client'

import { useEffect, useState } from 'react'

/**
 * Site-wide scroll-progress bar — a thin animated gradient that fills as you
 * read. Mounted once in the root layout, so every page gets it. rAF-throttled,
 * fixed, pointer-transparent; hidden for reduced-motion users.
 */
export default function ScrollFX() {
  const [p, setP] = useState(0)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const h = document.documentElement
        const max = h.scrollHeight - h.clientHeight
        setP(max > 0 ? Math.min(1, h.scrollTop / max) : 0)
      })
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  if (reduce) return null

  return (
    <div aria-hidden style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 3, zIndex: 2147483000, pointerEvents: 'none' }}>
      <div style={{
        height: '100%', width: `${(p * 100).toFixed(2)}%`,
        background: 'linear-gradient(90deg,#1f3bff,#10d693 55%,#ffb05a)',
        boxShadow: '0 0 12px rgba(31,59,255,.6)',
        transformOrigin: 'left', transition: 'width .08s linear',
      }} />
    </div>
  )
}
