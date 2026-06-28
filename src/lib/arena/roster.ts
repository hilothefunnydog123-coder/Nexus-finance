/* ════════════════════════════════════════════════════════════════════════
   The Arena — RIVAL AI opponent roster.

   BrainStock (the "house") posts a daily sealed call per ticker. For each of
   those bouts, every opponent here takes ITS OWN side via `decide(ctx)`. The
   opponents are split into two classes:

     • Deterministic strategy bots (kind:'bot') — Momentum Mike, Dip Diana,
       Steady Sam, Coin Flip. No API key, always work; they are the integrity
       backbone. Their reasoning is pure functions of market data + the net's
       call, so the same day reproduces the same side (the Coin Flip too — it
       seeds a SHA-256 from trade_date+ticker, never Math.random).

     • LLM personas (kind:'llm') — e.g. The Contrarian. When GEMINI_API_KEY is
       configured it asks the model for a side+rationale; otherwise it falls
       back to a deterministic rule. It never blocks the batch (timeout +
       try/catch in `decideOpponent`).

   Each opponent returns a direction + conviction (0..100) + rationale. The API
   route then seals that side the same Merkle-leaf way the net's calls are
   sealed (lib/arena/seal#callLeaf), so opponent calls are equally tamper-proof.
   ════════════════════════════════════════════════════════════════════════ */
import { createHash } from 'crypto'

export type Direction = 'up' | 'down'
export type OpponentKind = 'bot' | 'llm'

/** The net's sealed call for this ticker — the bout the opponent is fading or backing. */
export interface NetCall {
  ticker: string
  direction: Direction
  start_price: number
  target: number
  horizon: number
}

/**
 * Everything an opponent needs to take a side. Built once per ticker from real
 * market data (via forecastTicker/fetchBars) plus the net's published call.
 */
export interface OpponentContext {
  trade_date: string
  ticker: string
  /** Spot at decision time — the shared line both sides are graded against. */
  last: number
  /** Trailing return windows (fractions, e.g. 0.034 = +3.4%). */
  ret5: number
  ret20: number
  /** Annualization-free daily volatility over the trailing 20 sessions. */
  vol: number
  /** The house's call for this ticker. */
  net: NetCall
  /** Optional async LLM caller (origin-bound /api/gemini bridge); absent → bots only. */
  llm?: (prompt: string) => Promise<string>
}

export interface Decision {
  direction: Direction
  /** 0..100 confidence the opponent has in its own side. */
  conviction: number
  rationale: string
}

export interface Opponent {
  id: string
  name: string
  kind: OpponentKind
  /** Pure (bots) or best-effort async (llm) — returns this opponent's side on the bout. */
  decide: (ctx: OpponentContext) => Decision | Promise<Decision>
}

// ── helpers ─────────────────────────────────────────────────────────────────

const clampConv = (n: number): number => Math.max(5, Math.min(95, Math.round(n)))
const pct = (frac: number): string => `${frac >= 0 ? '+' : ''}${(frac * 100).toFixed(2)}%`

/** Deterministic [0,1) from a seed string — replaces Math.random for reproducibility. */
export function seededUnit(seed: string): number {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 13) // 52 bits
  return parseInt(hex, 16) / 0x10000000000000
}

// ── deterministic strategy bots ─────────────────────────────────────────────

/** Momentum Mike — rides the 20-day trend; up if it's been climbing. */
const momentum: Opponent = {
  id: 'momentum',
  name: 'Momentum Mike',
  kind: 'bot',
  decide(ctx) {
    const direction: Direction = ctx.ret20 >= 0 ? 'up' : 'down'
    const conviction = clampConv(45 + Math.min(45, Math.abs(ctx.ret20) * 600))
    return {
      direction,
      conviction,
      rationale: `20d trend is ${pct(ctx.ret20)} — I ride strength, so I'm ${direction}.`,
    }
  },
}

/** Dip Diana — fades the 5-day move; if it ran up she expects a pullback. */
const reversion: Opponent = {
  id: 'reversion',
  name: 'Dip Diana',
  kind: 'bot',
  decide(ctx) {
    const direction: Direction = ctx.ret5 > 0 ? 'down' : 'up'
    const conviction = clampConv(48 + Math.min(42, Math.abs(ctx.ret5) * 800))
    return {
      direction,
      conviction,
      rationale: `5d move is ${pct(ctx.ret5)} — that's stretched, I fade it and call ${direction}.`,
    }
  },
}

/**
 * Steady Sam — sides with the lower-volatility direction. In quiet tape he
 * leans with the gentle drift (sign of ret20); in jumpy tape he sells the move,
 * betting vol mean-reverts against the recent push (sign of -ret5).
 */
const lowvol: Opponent = {
  id: 'lowvol',
  name: 'Steady Sam',
  kind: 'bot',
  decide(ctx) {
    const calm = ctx.vol < 0.02 // ~2% daily vol cutoff
    const direction: Direction = calm
      ? ctx.ret20 >= 0 ? 'up' : 'down'
      : ctx.ret5 > 0 ? 'down' : 'up'
    const conviction = clampConv(calm ? 62 - ctx.vol * 800 : 40 - ctx.vol * 200)
    return {
      direction,
      conviction,
      rationale: calm
        ? `Vol is low (${(ctx.vol * 100).toFixed(2)}%/day) — I drift with the calm trend, ${direction}.`
        : `Vol is hot (${(ctx.vol * 100).toFixed(2)}%/day) — I bet it cools and fade the push, ${direction}.`,
    }
  },
}

/**
 * Coin Flip — a pure coin toss, but deterministic: the side comes from a
 * SHA-256 of trade_date+ticker so it's reproducible (never Math.random).
 */
const random: Opponent = {
  id: 'random',
  name: 'Coin Flip',
  kind: 'bot',
  decide(ctx) {
    const u = seededUnit(`${ctx.trade_date}|${ctx.ticker}|coinflip`)
    const direction: Direction = u < 0.5 ? 'up' : 'down'
    const conviction = clampConv(30 + seededUnit(`${ctx.trade_date}|${ctx.ticker}|conv`) * 40)
    return {
      direction,
      conviction,
      rationale: `No edge, no opinion — I flipped a (deterministic) coin and got ${direction}.`,
    }
  },
}

// ── LLM persona ──────────────────────────────────────────────────────────────

/** Deterministic fallback for the Contrarian when no LLM is available: oppose the net. */
function contrarianFallback(ctx: OpponentContext): Decision {
  const direction: Direction = ctx.net.direction === 'up' ? 'down' : 'up'
  return {
    direction,
    conviction: clampConv(55 + Math.min(30, Math.abs(ctx.ret5) * 500)),
    rationale: `The crowd (and the net) is ${ctx.net.direction} on ${ctx.ticker} — I take the other side on principle.`,
  }
}

/**
 * The Contrarian — when GEMINI_API_KEY is wired (ctx.llm provided) it asks the
 * model for a side + one-line rationale; otherwise it just opposes the net.
 * Best-effort: any error/timeout falls back, so it never blocks the batch.
 */
const contrarian: Opponent = {
  id: 'contrarian',
  name: 'The Contrarian',
  kind: 'llm',
  async decide(ctx) {
    if (!ctx.llm) return contrarianFallback(ctx)
    try {
      const prompt = `You are "The Contrarian", a sharp rival market AI in a sealed prediction arena. Take a side on ${ctx.ticker} over the next ${ctx.net.horizon} trading days.
Live read — last price $${ctx.last.toFixed(2)}; 5d return ${pct(ctx.ret5)}; 20d return ${pct(ctx.ret20)}; daily vol ${(ctx.vol * 100).toFixed(2)}%.
The rival "BrainStock" neural net is calling ${ctx.net.direction.toUpperCase()} (target $${ctx.net.target.toFixed(2)}).
You lean against consensus but you are not reckless — back your side with the data.
Reply with ONLY one line of valid JSON, nothing else:
{"direction":"up"|"down","conviction":<integer 0-100>,"rationale":"<one sharp sentence, max 18 words>"}`
      const raw = await ctx.llm(prompt)
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) return contrarianFallback(ctx)
      const parsed = JSON.parse(match[0]) as { direction?: string; conviction?: number; rationale?: string }
      const direction: Direction = parsed.direction === 'up' || parsed.direction === 'down'
        ? parsed.direction
        : contrarianFallback(ctx).direction
      const conviction = clampConv(Number.isFinite(parsed.conviction) ? Number(parsed.conviction) : 60)
      const rationale = (parsed.rationale && String(parsed.rationale).trim()) || contrarianFallback(ctx).rationale
      return { direction, conviction, rationale }
    } catch {
      return contrarianFallback(ctx)
    }
  },
}

// ── registry ──────────────────────────────────────────────────────────────────

/**
 * The opponent roster. Deterministic bots first (the integrity backbone), then
 * the LLM persona (spectacle, gracefully degrades). The API route runs every
 * one of these against each of the net's daily calls.
 */
export const OPPONENTS: Opponent[] = [momentum, reversion, lowvol, random, contrarian]

export const OPPONENT_IDS = OPPONENTS.map((o) => o.id)
