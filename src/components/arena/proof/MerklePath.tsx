'use client'

import { Hash } from './Hash'
import { C, type MerkleStep } from './types'

// Visualizes the Merkle inclusion proof: starting from the call's leaf, each step
// combines with a sibling hash (on the left or right) climbing one level up the
// tree, until it reaches the day's signed root. Recomputing this path is exactly
// how "this call is provably one of the leaves committed by the root" is checked.
export function MerklePath({
  leaf,
  steps,
  root,
  included,
}: {
  leaf?: string
  steps?: MerkleStep[]
  root?: string
  included?: boolean
}) {
  const path = steps ?? []
  const ok = included !== false

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Level depthLabel="leaf" color={ok ? C.green : C.redHard}>
          <span style={{ color: C.faint, fontSize: 12, marginRight: 8 }}>your call →</span>
          <Hash value={leaf} color={ok ? C.green : C.redHard} />
        </Level>

        {path.length === 0 && (
          <div style={{ color: C.faint, fontSize: 13, paddingLeft: 14 }}>
            Single-leaf day — the leaf is the root (no siblings to combine).
          </div>
        )}

        {path.map((s, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ paddingLeft: 14, color: C.faint, fontSize: 18, lineHeight: 1 }}>↓</div>
            <Level depthLabel={`lvl ${i + 1}`} color={C.cyan}>
              <span
                style={{
                  fontFamily: 'var(--font-mono),monospace',
                  fontSize: 11,
                  color: C.violet,
                  border: `1px solid ${C.border}`,
                  borderRadius: 5,
                  padding: '2px 7px',
                  marginRight: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                hash on {s.position}
              </span>
              <Hash value={s.sibling} color={C.cyan} />
            </Level>
          </div>
        ))}

        <div style={{ paddingLeft: 14, color: C.faint, fontSize: 18, lineHeight: 1 }}>↓</div>
        <Level depthLabel="root" color={ok ? C.green : C.redHard}>
          <span style={{ color: C.faint, fontSize: 12, marginRight: 8 }}>day root →</span>
          <Hash value={root} color={ok ? C.green : C.redHard} />
        </Level>
      </div>

      <div
        style={{
          marginTop: 12,
          fontSize: 13,
          color: ok ? C.green : C.redHard,
          fontWeight: 600,
        }}
      >
        {ok
          ? '✓ Replaying these sibling hashes from the leaf reproduces the signed root — this call is committed by it.'
          : '✗ Replaying the path does NOT reach the signed root — the call is not the one that was sealed.'}
      </div>
    </div>
  )
}

function Level({
  depthLabel,
  color,
  children,
}: {
  depthLabel: string
  color: string
  children: React.ReactNode
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        background: 'rgba(255,255,255,.02)',
        border: `1px solid ${C.border}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8,
        padding: '8px 12px',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-mono),monospace',
          fontSize: 10,
          color: C.faint,
          textTransform: 'uppercase',
          letterSpacing: '.08em',
          width: 44,
        }}
      >
        {depthLabel}
      </span>
      {children}
    </div>
  )
}
