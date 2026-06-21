'use client'

import { useEffect, useState } from 'react'

/**
 * Renders a REAL platform number from /api/stats, live (refreshes every 60s).
 * Use it anywhere we'd otherwise hardcode a stat. While loading / if the metric
 * is unavailable it shows `fallback` (default "—") — never a fabricated number.
 */
export default function LiveCount({
  metric,
  suffix = '',
  prefix = '',
  decimals = 0,
  fallback = '—',
}: {
  metric: 'users' | 'forecasts' | 'gradedCalls' | 'winRate' | 'stocksDaily' | 'nnTrained'
  suffix?: string
  prefix?: string
  decimals?: number
  fallback?: string
}) {
  const [v, setV] = useState<number | null>(null)
  useEffect(() => {
    const load = () => fetch('/api/stats').then((r) => r.json()).then((d) => setV(typeof d?.[metric] === 'number' ? d[metric] : null)).catch(() => {})
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
  }, [metric])
  if (v == null) return <>{fallback}</>
  return <>{prefix}{v.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>
}
