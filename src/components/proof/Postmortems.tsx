'use client'

/* ════════════════════════════════════════════════════════════════════════
   Postmortems — "When we're wrong, here's why."
   Renders the AI post-mortems for recently missed calls. Renders nothing
   until there's at least one explained miss, so it never shows an empty box.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'

type Item = { ticker: string; trade_date: string; start: number; actual: number; ret: number; explanation: string }

const RED = '#f87171'
const MUTE = '#8a93a8'
const FAINT = '#46566e'
const BORDER = 'rgba(255,255,255,.08)'

export default function Postmortems() {
  const [items, setItems] = useState<Item[]>([])
  useEffect(() => {
    let cancel = false
    fetch('/api/postmortem').then((r) => r.json()).then((d) => { if (!cancel && Array.isArray(d.items)) setItems(d.items) }).catch(() => {})
    return () => { cancel = true }
  }, [])

  if (!items.length) return null

  return (
    <div style={{ marginTop: 'clamp(40px,6vw,64px)' }}>
      <div style={{ fontFamily: 'var(--font-mono),monospace', fontSize: 12, letterSpacing: '0.14em', color: RED, marginBottom: 6 }}>// WHEN WE&apos;RE WRONG, HERE&apos;S WHY</div>
      <h2 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.03em', fontSize: 'clamp(1.6rem,4vw,2.4rem)', color: '#e7ecf5', margin: '0 0 8px' }}>
        The AI grades its own misses.
      </h2>
      <p style={{ fontSize: 14.5, color: MUTE, lineHeight: 1.6, maxWidth: 620, marginBottom: 22 }}>
        Every other site buries its losers. We have the net explain them — a short, honest read on why each missed call went wrong.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 14 }}>
        {items.map((it) => (
          <div key={`${it.ticker}-${it.trade_date}`} style={{ background: 'rgba(248,113,113,.04)', border: `1px solid ${RED}28`, borderRadius: 14, padding: 18 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#e7ecf5' }}>{it.ticker}</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: RED, fontVariantNumeric: 'tabular-nums' }}>{it.ret >= 0 ? '+' : ''}{it.ret.toFixed(2)}%</span>
            </div>
            <div style={{ fontSize: 11.5, color: FAINT, fontFamily: 'var(--font-mono),monospace', marginBottom: 12 }}>
              ${it.start.toFixed(2)} → ${it.actual.toFixed(2)} · called {new Date(it.trade_date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </div>
            <p style={{ fontSize: 13.5, color: '#c2ccdd', lineHeight: 1.6, margin: 0, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>{it.explanation}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
