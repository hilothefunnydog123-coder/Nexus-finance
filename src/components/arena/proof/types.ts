// Shared TS shapes for the Arena verification UI. Mirrors the /api/arena/verify
// and /api/arena/calls response contracts. Consumed defensively — every field
// is treated as possibly-missing at the boundary.

export type Direction = 'up' | 'down'
export type ProofPosition = 'left' | 'right'

export type MerkleStep = {
  sibling: string
  position: ProofPosition
}

export type SealReceipt = {
  trade_date: string
  stored_root: string
  recomputed_root: string
  leaf_count_stored: number
  leaf_count_actual: number
  root_intact: boolean
  root_sig_valid: boolean | null
  chain_intact: boolean
  algorithm: string
  anchor_ref: string | null
}

export type CallReceipt = SealReceipt & {
  canonical: string
  stored_leaf: string
  expected_leaf: string
  leaf_intact: boolean
  merkle_proof: MerkleStep[]
  included_in_root: boolean
}

export type ArenaCall = {
  trade_date: string
  ticker: string
  direction: Direction
  start_price: number
  target: number
  horizon: number
  resolve_date: string
  sealed_at: string
  status: string | null
}

export type VerifyCallResponse = {
  found: boolean
  mode?: 'call'
  signed?: boolean
  tamper_detected?: boolean
  call?: ArenaCall
  receipt?: CallReceipt
  trade_date?: string
  ticker?: string
  error?: string
  available?: boolean
}

export type VerifyDayResponse = {
  found: boolean
  mode?: 'day'
  signed?: boolean
  tamper_detected?: boolean
  count_matches?: boolean
  seal?: SealReceipt
  trade_date?: string
  error?: string
  available?: boolean
}

export type VerifyResponse = VerifyCallResponse & VerifyDayResponse

export type CallsListCall = {
  ticker: string
  direction: Direction
  target: number
  sealed_at: string
  leaf_hash: string
  trade_date: string
}

export type CallsListResponse = {
  available: boolean
  trade_date?: string
  seal?: { merkle_root: string; leaf_count: number; sealed_at: string } | null
  calls?: CallsListCall[]
}

// Palette — matches the Arena/terminal aesthetic.
export const C = {
  green: '#00ff88',
  cyan: '#00d4ff',
  red: '#ff2d78',
  redHard: '#ff3b3b',
  amber: '#ff9500',
  violet: '#a855f7',
  bg: '#05060a',
  panel: '#0a0c12',
  border: 'rgba(255,255,255,.10)',
  txt: '#e7ecf5',
  mute: '#9aa6bd',
  faint: '#5b667d',
} as const
