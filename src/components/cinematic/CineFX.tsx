'use client'

/**
 * Global cinematic effects engine — mount once in the root layout.
 * Any element on ANY page opts in with a data-* attribute:
 *   data-reveal[="scale|left|right|blur"]   scroll-triggered entrance
 *   data-reveal-delay="120"                  stagger (ms)
 *   data-magnetic[="0.3"]                    cursor-magnetic hover
 *   data-spotlight                           pointer-following glow (CSS ::before)
 * Works across client-side route changes via a MutationObserver. Zero deps.
 */

import { useEffect } from 'react'

export default function CineFX() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const io = reduce
      ? null
      : new IntersectionObserver(
          (entries) => {
            for (const e of entries) {
              if (e.isIntersecting) {
                const el = e.target as HTMLElement
                const d = el.getAttribute('data-reveal-delay')
                if (d) el.style.transitionDelay = `${d}ms`
                el.classList.add('cine-in')
                io?.unobserve(el)
              }
            }
          },
          { rootMargin: '0px 0px -8% 0px', threshold: 0.12 }
        )

    const cleaners: Array<() => void> = []

    const enhance = (root: ParentNode) => {
      // reveals
      root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-cfx])').forEach((el) => {
        el.setAttribute('data-cfx', '1')
        if (reduce || !io) el.classList.add('cine-in')
        else io.observe(el)
      })
      // magnetic
      root.querySelectorAll<HTMLElement>('[data-magnetic]:not([data-cfxm])').forEach((el) => {
        el.setAttribute('data-cfxm', '1')
        if (reduce) return
        const strength = parseFloat(el.getAttribute('data-magnetic') || '') || 0.3
        const move = (ev: PointerEvent) => {
          const r = el.getBoundingClientRect()
          const x = (ev.clientX - (r.left + r.width / 2)) * strength
          const y = (ev.clientY - (r.top + r.height / 2)) * strength
          el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`
        }
        const leave = () => { el.style.transform = '' }
        el.addEventListener('pointermove', move)
        el.addEventListener('pointerleave', leave)
        cleaners.push(() => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave) })
      })
      // spotlight
      root.querySelectorAll<HTMLElement>('[data-spotlight]:not([data-cfxs])').forEach((el) => {
        el.setAttribute('data-cfxs', '1')
        const move = (ev: PointerEvent) => {
          const r = el.getBoundingClientRect()
          el.style.setProperty('--mx', `${ev.clientX - r.left}px`)
          el.style.setProperty('--my', `${ev.clientY - r.top}px`)
        }
        el.addEventListener('pointermove', move)
        cleaners.push(() => el.removeEventListener('pointermove', move))
      })
    }

    enhance(document)

    // catch client-rendered / route-changed content
    const mo = new MutationObserver((muts) => {
      for (const m of muts) {
        m.addedNodes.forEach((n) => {
          if (n.nodeType === 1) enhance(n as Element)
        })
      }
    })
    mo.observe(document.body, { childList: true, subtree: true })

    return () => {
      io?.disconnect()
      mo.disconnect()
      cleaners.forEach((c) => c())
    }
  }, [])

  return null
}
