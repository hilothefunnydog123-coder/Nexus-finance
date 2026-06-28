// Shared client-side types + helpers for the Arena battle UI.
// These mirror the /api/arena/* contracts; consumed defensively.

export type Direction = 'up' | 'down'

export type Call = {
  trade_date: string
  ticker: string
  direction: Direction
  start_price: number
  target: number
  pct: number
  horizon: number
  resolve_date: string
  sealed_at: string
  leaf_hash: string
  engine: string
  skill: number
  dir_acc: number
  status: string
  actual_price: number | null
  dir_correct: boolean | null
}

export type Seal = {
  merkle_root: string
  leaf_count: number
  root_sig: string
  alg: string
  chain_hash: string
  sealed_at: string
} | null

export type CallsResponse = {
  available?: boolean
  trade_date?: string
  seal?: Seal
  count?: number
  calls?: Call[]
  ticker?: string
}

export type Opponent = {
  opponent_id: string
  opponent_name: string
  kind: string
  direction: Direction
  conviction: number
  rationale: string
}

export type OpponentsResponse = {
  available?: boolean
  opponents?: Opponent[]
}

export type Standing = {
  participant_id: string
  display_name: string
  rating: number
  bouts: number
  wins: number
  losses: number
  streak: number
  pnl_pct: number
}

export type LeaderboardResponse = {
  standings?: Standing[]
}

// Palette — matches the codebase terminal aesthetic.
export const C = {
  green: '#00ff88',
  cyan: '#00d4ff',
  red: '#ff2d78',
  redAlt: '#ff3b3b',
  amber: '#ff9500',
  violet: '#a855f7',
  muted: '#8a93a8',
  border: 'rgba(255,255,255,.10)',
}

// Truncate a long hash, keeping head + tail.
export function shortHash(h?: string | null, head = 8, tail = 6): string {
  if (!h) return '—'
  if (h.length <= head + tail + 1) return h
  return `${h.slice(0, head)}…${h.slice(-tail)}`
}

export function fmtPrice(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—'
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function fmtPct(n?: number | null): string {
  if (n == null || Number.isNaN(n)) return '—'
  return `${n >= 0 ? '+' : ''}${n.toFixed(2)}%`
}

export function fmtTime(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Outcome styling for a call's status.
export function statusMeta(status?: string, dirCorrect?: boolean | null): { label: string; color: string } {
  const s = (status || '').toLowerCase()
  if (s === 'hit' || dirCorrect === true) return { label: 'HIT', color: C.green }
  if (s === 'miss' || dirCorrect === false) return { label: 'MISS', color: C.red }
  return { label: 'SEALED', color: C.cyan }
}
