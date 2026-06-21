/* ════════════════════════════════════════════════════════════════════════
   Provenance — a signed, tamper-evident receipt for every forecast call.

   When BrainStock logs a call we hash its IMMUTABLE prediction fields
   (the values known the moment the bet was placed) and HMAC-sign that hash
   with a server secret. Later, anyone can ask /api/provenance to recompute
   the digest from the stored row and confirm the prediction was never edited
   after the fact. This is the mechanical backbone of "an AI that can't hide".

   - The hash is reproducible by anyone from the public fields (tamper-evident).
   - The HMAC signature proves the receipt is ours and pins the content
     (tamper-proof) — requires PROVENANCE_SECRET. Degrades to hash-only if unset.

   Resolution fields (status, actual_price) are intentionally NOT hashed — the
   point is to prove the PREDICTION is unchanged, while the outcome fills in.
   ════════════════════════════════════════════════════════════════════════ */
import { createHash, createHmac, timingSafeEqual } from 'crypto'

export const PROVENANCE_ALG = 'sha256'

/** The immutable core of a forecast call — everything fixed at bet time. */
export interface CallCore {
  trade_date: string
  ticker: string
  start_price: number
  target: number
  pct: number
  horizon: number
  resolve_date: string
}

/** Fixed key order + normalized numbers → a digest reproducible anywhere. */
export function canonical(c: CallCore): string {
  return [
    c.trade_date,
    String(c.ticker).toUpperCase(),
    Number(c.start_price).toFixed(4),
    Number(c.target).toFixed(4),
    Number(c.pct).toFixed(2),
    String(c.horizon),
    c.resolve_date,
  ].join('|')
}

export function callHash(c: CallCore): string {
  return createHash('sha256').update(canonical(c)).digest('hex')
}

/** HMAC over the content hash. null when no PROVENANCE_SECRET is configured. */
export function callSig(hash: string): string | null {
  const secret = process.env.PROVENANCE_SECRET
  if (!secret) return null
  return createHmac('sha256', secret).update(hash).digest('hex')
}

export interface Proof {
  proof_hash: string
  proof_sig: string | null
  proof_alg: string
}

/** Build the stored receipt columns for a call. */
export function proofFor(c: CallCore): Proof {
  const proof_hash = callHash(c)
  return { proof_hash, proof_sig: callSig(proof_hash), proof_alg: PROVENANCE_ALG }
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const ba = Buffer.from(a, 'hex')
    const bb = Buffer.from(b, 'hex')
    if (ba.length !== bb.length || ba.length === 0) return false
    return timingSafeEqual(ba, bb)
  } catch {
    return false
  }
}

export type VerifyResult = {
  /** Does the stored hash match a fresh digest of the stored prediction fields? */
  hashMatch: boolean
  /** Does the HMAC verify? null = cannot check (no secret configured / no sig stored). */
  sigValid: boolean | null
  /** Overall: prediction is provably original. null when signature can't be checked. */
  verified: boolean | null
  expectedHash: string
  canonical: string
}

/** Recompute from stored fields and check against the stored receipt. */
export function verifyCall(c: CallCore, storedHash: string | null, storedSig: string | null): VerifyResult {
  const expectedHash = callHash(c)
  const hashMatch = !!storedHash && safeEqualHex(expectedHash, storedHash)

  let sigValid: boolean | null = null
  const secret = process.env.PROVENANCE_SECRET
  if (secret) {
    const expectedSig = createHmac('sha256', secret).update(expectedHash).digest('hex')
    sigValid = !!storedSig && safeEqualHex(expectedSig, storedSig)
  }

  const verified = sigValid == null ? null : hashMatch && sigValid
  return { hashMatch, sigValid, verified, expectedHash, canonical: canonical(c) }
}
