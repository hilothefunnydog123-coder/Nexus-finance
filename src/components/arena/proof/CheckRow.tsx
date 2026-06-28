'use client'

import { C } from './types'

type State = 'pass' | 'fail' | 'na'

// One verifiable property: ✓ / ✗ / — with a label and a plain-English line of
// what it actually proves. `state==='na'` is for the honest "unsigned" case.
export function CheckRow({
  label,
  state,
  proves,
}: {
  label: string
  state: State
  proves: string
}) {
  const mark = state === 'pass' ? '✓' : state === 'fail' ? '✗' : '—'
  const color = state === 'pass' ? C.green : state === 'fail' ? C.redHard : C.amber
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '26px 1fr',
        gap: 12,
        alignItems: 'start',
        padding: '12px 14px',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono),monospace',
          fontWeight: 800,
          fontSize: 18,
          color,
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {mark}
      </div>
      <div>
        <div style={{ fontWeight: 700, color: C.txt, fontSize: 14 }}>{label}</div>
        <div style={{ color: C.mute, fontSize: 13, lineHeight: 1.5, marginTop: 2 }}>{proves}</div>
      </div>
    </div>
  )
}

export function boolState(b: boolean | null | undefined): State {
  if (b === null || b === undefined) return 'na'
  return b ? 'pass' : 'fail'
}
