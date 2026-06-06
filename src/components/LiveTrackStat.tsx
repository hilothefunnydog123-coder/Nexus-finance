'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

// Pulls real numbers from the public track record. Renders nothing until there
// is genuine data — we never show fabricated or zeroed-out stats.
export default function LiveTrackStat() {
  const [s, setS] = useState<{ total: number; winRate: number; avgReturn: number } | null>(null)
  useEffect(() => {
    fetch('/api/ai-calls')
      .then(r => r.json())
      .then(d => { if (d && !d.demo && d.stats && d.stats.total > 0) setS(d.stats) })
      .catch(() => {})
  }, [])
  if (!s) return null
  return (
    <Link href="/performance" style={{ display: 'inline-flex', alignItems: 'center', gap: 'clamp(18px,4vw,40px)', flexWrap: 'wrap', justifyContent: 'center', textDecoration: 'none', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(0,212,170,.18)', borderRadius: 16, padding: '18px 28px', margin: '0 auto 8px' }}>
      {([[`${s.total}`, 'AI calls logged'], [`${s.winRate}%`, 'went the right way'], [`${s.avgReturn}%`, 'avg move']] as [string, string][]).map(([n, l]) => (
        <div key={l} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 'clamp(22px,3vw,30px)', fontWeight: 900, color: '#00d4aa', fontFamily: '"SF Mono",ui-monospace,monospace', letterSpacing: '-1px' }}>{n}</div>
          <div style={{ fontSize: 10.5, color: '#5a7488', letterSpacing: '.5px', marginTop: 4 }}>{l}</div>
        </div>
      ))}
      <span style={{ fontSize: 12.5, fontWeight: 700, color: '#00d4aa' }}>See every call →</span>
    </Link>
  )
}
