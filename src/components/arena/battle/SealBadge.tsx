'use client'

import { C, shortHash } from './types'

// Small inline lock + truncated hash.
export function SealLock({ hash, label = 'sealed' }: { hash?: string | null; label?: string }) {
  return (
    <span
      style={{ color: C.cyan, borderColor: C.border }}
      className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-mono text-[10px] tracking-wide"
      title={hash || undefined}
    >
      <span aria-hidden>🔒</span>
      <span className="opacity-70">{label}</span>
      <span style={{ color: C.muted }}>{shortHash(hash, 6, 6)}</span>
    </span>
  )
}

// Day-level seal banner: the signed Merkle root committing the whole field.
export function SealBanner({
  merkleRoot,
  leafCount,
  sealedAt,
  alg,
  tradeDate,
  verifyHref,
}: {
  merkleRoot?: string | null
  leafCount?: number | null
  sealedAt?: string | null
  alg?: string | null
  tradeDate?: string | null
  verifyHref: string
}) {
  return (
    <div
      className="flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{
        borderColor: C.border,
        background: 'linear-gradient(90deg, rgba(0,212,255,.06), rgba(168,85,247,.05))',
      }}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wide" style={{ color: C.cyan }}>
          <span aria-hidden className="text-base">🔒</span>
          SEALED BEFORE THE OUTCOME
          {tradeDate ? <span style={{ color: C.muted }}>· {tradeDate}</span> : null}
        </div>
        <div className="mt-1.5 truncate font-mono text-sm" title={merkleRoot || undefined}>
          <span style={{ color: C.muted }}>merkle root </span>
          <span style={{ color: '#e7ecf5' }}>{shortHash(merkleRoot, 14, 12)}</span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]" style={{ color: C.muted }}>
          <span>{leafCount ?? 0} leaves committed</span>
          {alg ? <span>{alg}</span> : null}
          {sealedAt ? <span>sealed {new Date(sealedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span> : null}
        </div>
      </div>
      <a
        href={verifyHref}
        className="shrink-0 rounded-lg border px-3.5 py-2 text-center text-xs font-semibold transition hover:opacity-80"
        style={{ borderColor: C.cyan, color: C.cyan, background: 'rgba(0,212,255,.06)' }}
      >
        Verify the chain →
      </a>
    </div>
  )
}
