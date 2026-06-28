/* ════════════════════════════════════════════════════════════════════════
   Arena seal — canonicalizing and hashing a single sealed call.

   A sealed call is the immutable core of a prediction at the moment it was
   committed: ticker, direction, target, and the seal timestamp (plus the
   start price / horizon / resolve_date that fix what "right" means). We hash
   those into a leaf (see merkle.ts); the day's leaves roll up into one signed
   Merkle root (arena_seals). Recomputing the leaf from the stored row and
   re-deriving the root is how /api/arena/verify detects any edit or backdate.

   Mirrors lib/provenance.ts: SHA-256 content hash + optional HMAC over the
   root with PROVENANCE_SECRET. Hash works without the secret (tamper-evident);
   the HMAC makes the daily root un-forgeable (tamper-proof).
   ════════════════════════════════════════════════════════════════════════ */
import { createHash, createHmac, timingSafeEqual } from 'crypto'
import { leafHash } from './merkle'

export const ARENA_ALG = 'sha256'

/** The immutable core of a sealed call — everything fixed the moment it sealed. */
export interface SealedCallCore {
  trade_date: string
  ticker: string
  direction: 'up' | 'down'
  start_price: number
  target: number
  horizon: number
  resolve_date: string
  sealed_at: string // ISO-8601 commit timestamp, frozen at seal time
}

/** Fixed key order + normalized numbers → a digest reproducible anywhere. */
export function callCanonical(c: SealedCallCore): string {
  return [
    c.trade_date,
    String(c.ticker).toUpperCase(),
    c.direction,
    Number(c.start_price).toFixed(4),
    Number(c.target).toFixed(4),
    String(c.horizon),
    c.resolve_date,
    c.sealed_at,
  ].join('|')
}

/** The leaf hash committed for this call (0x00-domain-separated SHA-256). */
export function callLeaf(c: SealedCallCore): string {
  return leafHash(callCanonical(c))
}

/** HMAC over the day's Merkle root. null when no PROVENANCE_SECRET is set. */
export function signRoot(root: string): string | null {
  const secret = process.env.PROVENANCE_SECRET
  if (!secret) return null
  return createHmac('sha256', secret).update(root).digest('hex')
}

/** Re-derive and check the HMAC. null = cannot check (no secret / no sig stored). */
export function verifyRootSig(root: string, storedSig: string | null): boolean | null {
  const secret = process.env.PROVENANCE_SECRET
  if (!secret) return null
  if (!storedSig) return null
  const expected = createHmac('sha256', secret).update(root).digest('hex')
  return safeEqualHex(expected, storedSig)
}

/**
 * Hash-chain a day's root to the previous day's chain hash. Linking each daily
 * root to the one before it means a tampered or deleted past day breaks every
 * chain hash after it — the seal history is itself append-only.
 */
export function chainHash(prevChain: string | null, root: string): string {
  return createHash('sha256').update((prevChain ?? '') + '|' + root).digest('hex')
}

export function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length || ba.length === 0) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}
