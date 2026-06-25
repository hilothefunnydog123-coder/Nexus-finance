'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Self-evolving A/B: the Site Brain picks a variant (Thompson sampling, server-side)
 * and learns from conversions. Returns [chosenKey, convert].
 *   const [headline, won] = useVariant('hero', { a: '...', b: '...' })
 * Call won() when the goal happens (sign-up, CTA click) to teach the net.
 * SSR-safe: renders the first variant until the choice arrives (no layout flash
 * for text since we keep the same element).
 */
export function useVariant<T extends Record<string, unknown>>(exp: string, variants: T): [keyof T, () => void] {
  const keys = Object.keys(variants) as (keyof T)[]
  const [key, setKey] = useState<keyof T>(keys[0])
  const chosen = useRef<string>(String(keys[0]))

  useEffect(() => {
    let alive = true
    fetch(`/api/brain/variant?exp=${encodeURIComponent(exp)}&variants=${keys.map(String).map(encodeURIComponent).join('|')}`)
      .then(r => r.json())
      .then(d => { if (alive && d?.variant && keys.map(String).includes(d.variant)) { chosen.current = d.variant; setKey(d.variant as keyof T) } })
      .catch(() => {})
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exp])

  const convert = () => {
    try {
      fetch('/api/brain/variant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ exp, variant: chosen.current }), keepalive: true }).catch(() => {})
    } catch {}
  }
  return [key, convert]
}
