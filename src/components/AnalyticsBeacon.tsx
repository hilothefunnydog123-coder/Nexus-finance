'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useRef } from 'react'

/** Fires one cookieless pageview to /api/track per route. Zero PII, fail-silent. */
export default function AnalyticsBeacon() {
  const path = usePathname()
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (!path || last.current === path) return
    last.current = path
    try {
      fetch('/api/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, ref: typeof document !== 'undefined' ? document.referrer : '' }),
        keepalive: true,
      }).catch(() => {})
    } catch { /* ignore */ }
  }, [path])
  return null
}
