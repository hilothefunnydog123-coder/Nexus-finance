'use client'

import { useState } from 'react'
import { C } from './types'

// Monospace hash with copy-to-clipboard. Shows a head…tail truncation by default
// (enough to be credible) but always copies the full value. Set `full` to wrap
// the entire hash instead of truncating.
export function Hash({
  value,
  color = C.cyan,
  full = false,
  head = 10,
  tail = 8,
}: {
  value?: string | null
  color?: string
  full?: boolean
  head?: number
  tail?: number
}) {
  const [copied, setCopied] = useState(false)
  const v = value ?? ''

  if (!v) return <span style={{ fontFamily: 'var(--font-mono),monospace', color: C.faint }}>—</span>

  const display = full || v.length <= head + tail + 1 ? v : `${v.slice(0, head)}…${v.slice(-tail)}`

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(v)
      setCopied(true)
      setTimeout(() => setCopied(false), 1100)
    } catch {
      /* clipboard may be unavailable — silent */
    }
  }

  return (
    <button
      onClick={copy}
      title={`${v}\n(click to copy)`}
      style={{
        fontFamily: 'var(--font-mono),monospace',
        fontSize: 12.5,
        color,
        background: 'rgba(255,255,255,.03)',
        border: `1px solid ${C.border}`,
        borderRadius: 6,
        padding: '4px 8px',
        cursor: 'pointer',
        wordBreak: full ? 'break-all' : 'normal',
        whiteSpace: full ? 'normal' : 'nowrap',
        textAlign: 'left',
        maxWidth: '100%',
        lineHeight: 1.5,
      }}
    >
      {copied ? <span style={{ color: C.green }}>copied ✓</span> : display}
    </button>
  )
}
