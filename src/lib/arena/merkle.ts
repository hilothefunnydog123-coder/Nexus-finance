/* ════════════════════════════════════════════════════════════════════════
   Merkle tree — the batch-commitment primitive behind The Arena's daily seal.

   Every sealed call is a leaf. Hashing all of a day's leaves into one root and
   signing that root means a single 32-byte number commits to the ENTIRE set of
   calls for the day. Two consequences:

     • Edit any call  → its leaf hash changes → the recomputed root no longer
       matches the signed root. Tampering is mathematically detectable.
     • Drop a losing call (cherry-pick) → the leaf set shrinks → the root
       changes. You cannot silently delete a call after the fact.

   Domain separation: leaves are prefixed with 0x00 and internal nodes with
   0x01 before hashing, so an internal node can never be presented as a leaf
   (the classic Merkle second-preimage attack). Lone nodes at an odd level are
   promoted unchanged rather than duplicated (avoids the CVE-2012-2459 dup-leaf
   malleability). All values are lowercase hex SHA-256 digests.
   ════════════════════════════════════════════════════════════════════════ */
import { createHash } from 'crypto'

const LEAF = Buffer.from([0x00])
const NODE = Buffer.from([0x01])

/** Hash a canonical call string into its leaf digest (0x00-domain-separated). */
export function leafHash(canonical: string): string {
  return createHash('sha256').update(Buffer.concat([LEAF, Buffer.from(canonical, 'utf8')])).digest('hex')
}

/** Hash two child hex digests into their parent (0x01-domain-separated). */
function hashPair(left: string, right: string): string {
  return createHash('sha256').update(Buffer.concat([NODE, Buffer.from(left, 'hex'), Buffer.from(right, 'hex')])).digest('hex')
}

/** The root committing to `leaves` (in the given order). Empty → digest of nothing. */
export function merkleRoot(leaves: string[]): string {
  if (leaves.length === 0) return createHash('sha256').update(LEAF).digest('hex')
  let level = leaves.slice()
  while (level.length > 1) {
    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i]) // promote lone node
    }
    level = next
  }
  return level[0]
}

export type ProofStep = { sibling: string; position: 'left' | 'right' }

/** The sibling path proving `leaves[index]` is committed by merkleRoot(leaves). */
export function merkleProof(leaves: string[], index: number): ProofStep[] {
  const proof: ProofStep[] = []
  if (index < 0 || index >= leaves.length) return proof
  let level = leaves.slice()
  let idx = index
  while (level.length > 1) {
    if (idx % 2 === 0) {
      if (idx + 1 < level.length) proof.push({ sibling: level[idx + 1], position: 'right' })
      // else: lone node promoted — no sibling at this level
    } else {
      proof.push({ sibling: level[idx - 1], position: 'left' })
    }
    const next: string[] = []
    for (let i = 0; i < level.length; i += 2) {
      next.push(i + 1 < level.length ? hashPair(level[i], level[i + 1]) : level[i])
    }
    idx = Math.floor(idx / 2)
    level = next
  }
  return proof
}

/** Recompute a root from a leaf + its sibling path; true iff it equals `root`. */
export function verifyProof(leaf: string, proof: ProofStep[], root: string): boolean {
  let h = leaf
  for (const step of proof) {
    h = step.position === 'left' ? hashPair(step.sibling, h) : hashPair(h, step.sibling)
  }
  return h === root
}
