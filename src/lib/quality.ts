'use client'

/* ════════════════════════════════════════════════════════════════════════
   quality — one device-tier detector that every heavy (WebGL/canvas) scene
   reads from, so the cinematics stay smooth on phones and weak GPUs instead
   of melting them. Call getQuality() once inside a scene's setup.

   tier   low  → old phones / reduced-motion / <=2GB / <=2 cores
          mid  → most phones, small screens, 4GB / 4 cores
          high → desktops with real GPUs
   ════════════════════════════════════════════════════════════════════════ */

export type Tier = 'low' | 'mid' | 'high'
export interface Quality {
  tier: Tier
  dprCap: number      // cap on devicePixelRatio
  scale: number       // multiplier for particle / instance counts
  reduced: boolean    // user asked for reduced motion
  /** scale an integer count down for the tier, with a floor. */
  count: (base: number, floor?: number) => number
}

export function getQuality(): Quality {
  if (typeof window === 'undefined') {
    return { tier: 'high', dprCap: 2, scale: 1, reduced: false, count: (b) => b }
  }
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  const ua = navigator.userAgent || ''
  const mobile = /Mobi|Android|iPhone|iPad|iPod/i.test(ua)
  const cores = navigator.hardwareConcurrency || 4
  const mem = (navigator as unknown as { deviceMemory?: number }).deviceMemory ?? 4
  const small = Math.min(window.innerWidth, window.innerHeight) < 640

  let tier: Tier = 'high'
  if (reduced || mem <= 2 || cores <= 2) tier = 'low'
  else if (mobile || small || mem <= 4 || cores <= 4) tier = 'mid'

  const dprCap = tier === 'low' ? 1 : tier === 'mid' ? 1.5 : 2
  const scale = tier === 'low' ? 0.35 : tier === 'mid' ? 0.6 : 1
  const count = (base: number, floor = 8) => Math.max(floor, Math.round(base * scale))
  return { tier, dprCap, scale, reduced, count }
}
