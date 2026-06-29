/* ════════════════════════════════════════════════════════════════════════
   The Arena — human record + the shareable "I beat the AIs" card.

   Pure stats from a user's sealed picks (graded vs the models), plus a compact,
   HMAC-signed share token so a brag card is itself tamper-evident and verifies
   on /arena/card — on brand with the rest of the Arena: even the flex has a
   receipt.
   ════════════════════════════════════════════════════════════════════════ */
import { createHmac, timingSafeEqual } from 'crypto'

export type Direction = 'up' | 'down'

export interface HumanPick {
  trade_date: string
  ticker: string
  direction: Direction
  status: string // sealed | hit | miss
  dir_correct: boolean | null
  resolve_date: string
  resolved_at: string | null
  leaf_hash: string | null
}

export interface AIResult {
  trade_date: string
  ticker: string
  dir_correct: boolean | null
  status: string
}

export interface Tally {
  wins: number
  losses: number
  pending: number
  winRate: number // % of decided picks won
}

export interface HeadToHead {
  id: string
  name: string
  wins: number // AI wins over the same shared bouts
  winRate: number
  userBeat: boolean // user out-won the AI over those bouts
}

export interface Stats {
  overall: Tally
  weekly: Tally
  streak: { current: number; best: number } // current: + win streak / - loss streak
  weeklyH2H: HeadToHead[]
  beatThisWeek: string[]
  totalPicks: number
  sealedPicks: number
}

const key = (d: string, t: string) => `${d}|${t.toUpperCase()}`

function tally(picks: Pick<HumanPick, 'status' | 'dir_correct'>[]): Tally {
  let wins = 0,
    losses = 0,
    pending = 0
  for (const p of picks) {
    if (p.status === 'sealed' || p.dir_correct == null) pending++
    else if (p.dir_correct) wins++
    else losses++
  }
  const decided = wins + losses
  return { wins, losses, pending, winRate: decided ? Math.round((wins / decided) * 100) : 0 }
}

/** current (signed) streak from newest→oldest, and best win run chronologically. */
function streaks(resolvedNewestFirst: { dir_correct: boolean }[]): { current: number; best: number } {
  let current = 0
  for (const p of resolvedNewestFirst) {
    if (current === 0) current = p.dir_correct ? 1 : -1
    else if (p.dir_correct && current > 0) current++
    else if (!p.dir_correct && current < 0) current--
    else break
  }
  let best = 0,
    run = 0
  for (let i = resolvedNewestFirst.length - 1; i >= 0; i--) {
    if (resolvedNewestFirst[i].dir_correct) {
      run++
      best = Math.max(best, run)
    } else run = 0
  }
  return { current, best }
}

/** Build a full record from a user's picks and the AIs' results on the same bouts. */
export function summarize(picks: HumanPick[], net: AIResult[], gem: AIResult[], nowMs: number): Stats {
  const overall = tally(picks)

  const resolved = picks
    .filter((p) => p.status !== 'sealed' && p.dir_correct != null)
    .sort((a, b) => Date.parse(b.resolved_at ?? b.resolve_date) - Date.parse(a.resolved_at ?? a.resolve_date)) as (HumanPick & { dir_correct: boolean })[]

  const streak = streaks(resolved)

  const weekStart = nowMs - 7 * 86400_000
  const weeklyPicks = resolved.filter((p) => Date.parse(p.resolved_at ?? p.resolve_date) >= weekStart)
  const weekly = tally(weeklyPicks)

  const aiMap = (rows: AIResult[]) => {
    const m = new Map<string, AIResult>()
    for (const r of rows) m.set(key(r.trade_date, r.ticker), r)
    return m
  }
  // Head-to-head only over bouts where BOTH the user and the AI have a decided
  // result — so an AI with no graded row on a bout isn't scored as a loss.
  const h2h = (id: string, name: string, rows: AIResult[]): HeadToHead => {
    const m = aiMap(rows)
    let aiWins = 0,
      userWins = 0,
      n = 0
    for (const p of weeklyPicks) {
      const ai = m.get(key(p.trade_date, p.ticker))
      if (!ai || ai.dir_correct == null) continue // AI undecided on this bout — skip
      n++
      if (ai.dir_correct) aiWins++
      if (p.dir_correct) userWins++
    }
    return { id, name, wins: aiWins, winRate: n ? Math.round((aiWins / n) * 100) : 0, userBeat: userWins > aiWins }
  }
  const weeklyH2H = [h2h('brainstock', 'BrainStock', net), h2h('gemini', 'Gemini', gem)]
  const beatThisWeek = weeklyH2H.filter((h) => h.userBeat).map((h) => h.name)

  return {
    overall,
    weekly,
    streak,
    weeklyH2H,
    beatThisWeek,
    totalPicks: picks.length,
    sealedPicks: picks.filter((p) => p.status === 'sealed').length,
  }
}

// ── shareable, signed card token ────────────────────────────────────────────

export interface SharePayload {
  v: 1
  h: string // handle
  w: number // weekly wins
  l: number // weekly losses
  wr: number // weekly win rate
  s: number // current streak (signed)
  p: number // total picks
  beat: string[] // AIs beaten this week
  net: number // BrainStock win rate over shared weekly bouts
  gem: number // Gemini win rate over shared weekly bouts
  wk: string // week label, e.g. "Jun 23 – 29"
  t: number // issued-at ms
}

function b64url(s: string): string {
  return Buffer.from(s, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): string {
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
}

/** token = base64url(payload) + "." + 128-bit HMAC (hex). Unsigned when no secret. */
export function signShare(p: SharePayload): string {
  const body = b64url(JSON.stringify(p))
  const secret = process.env.PROVENANCE_SECRET
  const sig = secret ? createHmac('sha256', secret).update(body).digest('hex').slice(0, 32) : 'unsigned'
  return `${body}.${sig}`
}

export function verifyShare(token: string): { payload: SharePayload; verified: boolean } | null {
  const dot = token.lastIndexOf('.')
  if (dot < 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  let raw: Partial<SharePayload> & { v?: number }
  try {
    raw = JSON.parse(b64urlDecode(body)) as Partial<SharePayload>
  } catch {
    return null
  }
  if (!raw || raw.v !== 1) return null
  // Coerce every field so a malformed-but-v1 token can never crash a renderer.
  const num = (x: unknown) => (Number.isFinite(Number(x)) ? Number(x) : 0)
  const payload: SharePayload = {
    v: 1,
    h: typeof raw.h === 'string' ? raw.h.slice(0, 40) : 'A human',
    w: num(raw.w),
    l: num(raw.l),
    wr: num(raw.wr),
    s: num(raw.s),
    p: num(raw.p),
    beat: Array.isArray(raw.beat) ? raw.beat.filter((b) => typeof b === 'string').slice(0, 4) : [],
    net: num(raw.net),
    gem: num(raw.gem),
    wk: typeof raw.wk === 'string' ? raw.wk.slice(0, 40) : '',
    t: num(raw.t),
  }
  const secret = process.env.PROVENANCE_SECRET
  let verified = false
  if (secret) {
    const expected = createHmac('sha256', secret).update(body).digest('hex').slice(0, 32)
    try {
      verified = sig.length === expected.length && timingSafeEqual(Buffer.from(sig), Buffer.from(expected))
    } catch {
      verified = false
    }
  }
  return { payload, verified }
}

/** Build the share payload for the current week from a computed record. */
export function buildSharePayload(handle: string, stats: Stats, weekLabel: string, nowMs: number): SharePayload {
  const net = stats.weeklyH2H.find((h) => h.id === 'brainstock')
  const gem = stats.weeklyH2H.find((h) => h.id === 'gemini')
  return {
    v: 1,
    h: handle.slice(0, 24),
    w: stats.weekly.wins,
    l: stats.weekly.losses,
    wr: stats.weekly.winRate,
    s: stats.streak.current,
    p: stats.totalPicks,
    beat: stats.beatThisWeek,
    net: net?.winRate ?? 0,
    gem: gem?.winRate ?? 0,
    wk: weekLabel,
    t: nowMs,
  }
}
