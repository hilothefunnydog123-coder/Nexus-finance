'use client'

import { C } from './types'

export type Verdict = 'sealed' | 'unsigned' | 'tampered'

// The honest top-line. We distinguish three states precisely:
//  - tampered: a stored hash / root / count diverges → mathematically detected.
//  - unsigned: hashes & tree are intact, but no signature exists → "hash-only".
//  - sealed:   intact AND signed → full cryptographic seal.
export function decideVerdict(opts: {
  tamper: boolean | undefined
  signed: boolean | undefined
  rootSigValid: boolean | null | undefined
}): Verdict {
  if (opts.tamper) return 'tampered'
  if (!opts.signed || opts.rootSigValid === null || opts.rootSigValid === undefined) return 'unsigned'
  return 'sealed'
}

const MAP: Record<Verdict, { icon: string; title: string; sub: string; color: string }> = {
  sealed: {
    icon: '✅',
    title: 'SEALED & UNALTERED',
    sub: 'Every stored hash recomputes, the call is committed by the signed Merkle root, and the day chains to the one before it.',
    color: C.green,
  },
  unsigned: {
    icon: '⚠️',
    title: 'UNSIGNED — HASH-ONLY',
    sub: 'The hashes and Merkle tree are internally consistent, but this root carries no HMAC signature — integrity is provable, authorship is not.',
    color: C.amber,
  },
  tampered: {
    icon: '🛑',
    title: 'TAMPER DETECTED',
    sub: 'A stored hash, the root, or the leaf count diverges from what was sealed. This call or day was edited, backdated, added, or deleted after sealing.',
    color: C.redHard,
  },
}

export function VerdictBanner({ verdict }: { verdict: Verdict }) {
  const v = MAP[verdict]
  return (
    <div
      style={{
        position: 'relative',
        border: `1px solid ${v.color}`,
        borderRadius: 14,
        padding: 'clamp(18px,3vw,26px)',
        background: `linear-gradient(135deg, ${v.color}22, transparent 70%), ${C.panel}`,
        boxShadow: `0 0 40px ${v.color}22`,
        display: 'flex',
        gap: 18,
        alignItems: 'center',
      }}
    >
      <div style={{ fontSize: 'clamp(34px,6vw,52px)', lineHeight: 1 }}>{v.icon}</div>
      <div>
        <div
          style={{
            fontFamily: 'var(--font-display),system-ui,sans-serif',
            fontWeight: 800,
            letterSpacing: '-0.02em',
            fontSize: 'clamp(1.4rem,3.5vw,2.2rem)',
            color: v.color,
          }}
        >
          {v.title}
        </div>
        <p style={{ color: C.mute, fontSize: 14, lineHeight: 1.55, marginTop: 6, maxWidth: 620 }}>{v.sub}</p>
      </div>
    </div>
  )
}
