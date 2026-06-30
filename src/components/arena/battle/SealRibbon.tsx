'use client'

import { ShieldCheck, Lock, ArrowRight } from 'lucide-react'
import { type Seal, C, shortHash } from './types'

/** The cryptographic proof line — the signed Merkle root, shimmering, with a verify CTA. */
export default function SealRibbon({ seal, tradeDate, verifyHref }: { seal: Seal; tradeDate: string; verifyHref: string }) {
  if (!seal) {
    return (
      <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: C.border, color: C.muted, background: 'rgba(255,255,255,.02)' }}>
        No day sealed yet — the field gets locked in at the open. Check back at market morning.
      </div>
    )
  }
  return (
    <div
      className="av-card av-rise relative flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: `${C.cyan}33`, background: 'linear-gradient(90deg, rgba(0,212,255,.07), rgba(168,85,247,.06))' }}
    >
      <div aria-hidden className="av-sheen" />
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-[11px] font-bold tracking-widest" style={{ color: C.cyan }}>
          <ShieldCheck size={14} className="av-glow" />
          SEALED BEFORE THE OUTCOME
          {tradeDate ? <span style={{ color: C.muted }}>· {tradeDate}</span> : null}
        </div>
        <div className="mt-1.5 flex items-center gap-2 font-mono text-sm" title={seal.merkle_root || undefined}>
          <Lock size={12} style={{ color: C.muted }} />
          <span style={{ color: C.muted }}>root</span>
          <span className="av-shimmer font-bold" style={{ background: `linear-gradient(90deg, #7fe7ff 20%, #fff, #c084fc 80%)`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>
            {shortHash(seal.merkle_root, 16, 14)}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]" style={{ color: C.muted }}>
          <span>{seal.leaf_count ?? 0} leaves committed</span>
          {seal.alg ? <span>{seal.alg}</span> : null}
          <span>signed · chain-linked</span>
        </div>
      </div>
      <a
        href={verifyHref}
        className="group inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-4 py-2 text-xs font-bold transition hover:scale-[1.03]"
        style={{ borderColor: C.cyan, color: C.cyan, background: 'rgba(0,212,255,.08)' }}
      >
        Verify the chain
        <ArrowRight size={13} className="transition group-hover:translate-x-0.5" />
      </a>
    </div>
  )
}
