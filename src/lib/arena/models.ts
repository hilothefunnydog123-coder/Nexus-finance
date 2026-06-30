/* ════════════════════════════════════════════════════════════════════════
   The Arena — model adapters (the live combatants).

   Every combatant is a `ModelAdapter`: given the SAME market context for a
   ticker, it independently returns a prediction { direction, target,
   conviction, reasoning }. No adapter sees another's answer — they predict
   blind, and the API route seals them all at the same instant.

   Two real combatants ship today:
     • brainstock — our neural net (lib/forecast + lib/nn). Its reasoning is a
       plain-English read of its own signals (momentum, skill, hit-rate).
     • gemini     — Google's model, grounded with live Search, asked for an
       independent call + reasoning as strict JSON.

   Plus deterministic baselines (momentum / reversion / low-vol / coin-flip) so
   the arena is never empty and there's an always-on, reproducible control group.

   Dropping in a new model later = implement ModelAdapter and add it to MODELS.
   Nothing else changes: the route runs `runModels`, seals each leaf, stores it.
   ════════════════════════════════════════════════════════════════════════ */
import { createHash } from 'crypto'

export type Direction = 'up' | 'down'
export type ModelKind = 'net' | 'llm' | 'bot'

/** A live caller into an LLM. Returns raw text; adapters parse it. */
export type LlmCaller = (prompt: string) => Promise<string>

/** Trailing market read for a ticker — the only thing every model is given. */
export interface MarketSignals {
  /** Spot at decision time — the shared line all sides are graded against. */
  last: number
  /** Trailing returns as fractions (0.034 = +3.4%). */
  ret5: number
  ret20: number
  /** Daily volatility over the trailing 20 sessions (fraction). */
  vol: number
}

/** Everything a model gets to make its independent call. */
export interface ModelContext {
  ticker: string
  trade_date: string
  horizon: number
  resolve_date: string
  signals: MarketSignals
  /** Present only when an LLM is configured; LLM adapters require it. */
  llm?: LlmCaller
}

export interface ModelPrediction {
  direction: Direction
  /** The model's own end-of-horizon price target. */
  target: number
  /** 0..100 confidence in its own side. */
  conviction: number
  /** Plain-English reasoning, shown to users side by side. */
  reasoning: string
}

export interface ModelAdapter {
  id: string
  name: string
  /** Who built/runs the model — e.g. 'YN Finance', 'Google'. */
  provider: string
  kind: ModelKind
  /** Can this model run in the given context? (e.g. LLMs need ctx.llm). */
  available: (ctx: ModelContext) => boolean
  /** Independent prediction, or null to abstain. May be async. */
  predict: (ctx: ModelContext) => ModelPrediction | Promise<ModelPrediction | null> | null
}

/** A prediction tagged with which model produced it. */
export type ModelResult = ModelPrediction & {
  id: string
  name: string
  provider: string
  kind: ModelKind
}

// ── helpers ──────────────────────────────────────────────────────────────────

const clampConv = (n: number): number => Math.max(5, Math.min(95, Math.round(n)))
const pct = (frac: number): string => `${frac >= 0 ? '+' : ''}${(frac * 100).toFixed(2)}%`

/** Deterministic [0,1) from a seed string — reproducible stand-in for Math.random. */
export function seededUnit(seed: string): number {
  const hex = createHash('sha256').update(seed).digest('hex').slice(0, 13) // 52 bits
  return parseInt(hex, 16) / 0x10000000000000
}

/** Derive a horizon price target from a side + conviction when a model gives none. */
export function targetFrom(last: number, direction: Direction, conviction: number): number {
  const moveFrac = 0.005 + (conviction / 100) * 0.045 // ~0.5%..5%
  const signed = direction === 'up' ? moveFrac : -moveFrac
  return +(last * (1 + signed)).toFixed(4)
}

/**
 * The net's plain-English reasoning, synthesized from its own signals. Pure, so
 * the API can describe a stored arena_calls row without re-running the net.
 */
export function brainstockReasoning(s: {
  direction: Direction
  pct: number
  skill?: number | null
  dirAcc?: number | null
  engine?: string | null
}): string {
  const dirAccPct = s.dirAcc == null ? null : s.dirAcc <= 1 ? s.dirAcc * 100 : s.dirAcc
  const skillTxt = s.skill == null ? null : (s.skill <= 1 ? s.skill : s.skill / 100).toFixed(2)
  const edge =
    skillTxt != null
      ? `skill ${Number(skillTxt) >= 0 ? '+' : ''}${skillTxt} vs a naive baseline`
      : 'a walk-forward backtest'
  const hit = dirAccPct != null ? `, ~${dirAccPct.toFixed(0)}% directional hit-rate` : ''
  const eng = s.engine === 'neural-net' ? 'The neural net' : 'The model'
  return `${eng} leans ${s.direction.toUpperCase()} (${pct(s.pct / 100)} target) on ${edge}${hit}. This is its own read of momentum, volatility and range position — not a reaction to anyone else's call.`
}

// ── the net ──────────────────────────────────────────────────────────────────

/**
 * BrainStock metadata. Its sealed prediction is produced by /api/arena/seal
 * (so it feeds training + the daily Merkle root); the panel describes that
 * stored call via brainstockReasoning rather than re-running the net here.
 */
export const NET_MODEL = { id: 'brainstock', name: 'BrainStock', provider: 'YN Finance', kind: 'net' as const }

// ── Gemini (real LLM combatant, grounded with live Search) ──────────────────

const geminiAdapter: ModelAdapter = {
  id: 'gemini',
  name: 'Gemini 2.5 Flash',
  provider: 'Google',
  kind: 'llm',
  available: (ctx) => !!ctx.llm,
  async predict(ctx) {
    if (!ctx.llm) return null
    const s = ctx.signals
    const prompt = `You are Gemini, an independent market-forecasting AI competing in a public, cryptographically sealed prediction arena against a rival neural net. Make YOUR OWN call on ${ctx.ticker} over the next ${ctx.horizon} trading days. Use Google Search for the freshest real news, catalysts and price context. Do not hedge — commit to a side.
Market read — last $${s.last.toFixed(2)}; 5-day ${pct(s.ret5)}; 20-day ${pct(s.ret20)}; daily volatility ${(s.vol * 100).toFixed(2)}%.
Reply with ONLY one line of valid JSON, nothing else:
{"direction":"up"|"down","target":<your ${ctx.horizon}-day price target as a number>,"conviction":<integer 0-100>,"reasoning":"<two sharp sentences citing a real catalyst and the data>"}`
    let raw: string
    try {
      raw = await ctx.llm(prompt)
    } catch {
      return null
    }
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    let parsed: { direction?: string; target?: number; conviction?: number; reasoning?: string }
    try {
      parsed = JSON.parse(match[0])
    } catch {
      return null
    }
    const direction: Direction | null =
      parsed.direction === 'up' || parsed.direction === 'down' ? parsed.direction : null
    if (!direction) return null // no usable side → abstain honestly
    const conviction = clampConv(Number.isFinite(parsed.conviction) ? Number(parsed.conviction) : 60)
    const target =
      Number.isFinite(parsed.target) && Number(parsed.target) > 0
        ? +Number(parsed.target).toFixed(4)
        : targetFrom(s.last, direction, conviction)
    const reasoning =
      (parsed.reasoning && String(parsed.reasoning).trim().slice(0, 400)) ||
      `Independent read on ${ctx.ticker}: ${direction} over ${ctx.horizon} sessions.`
    return { direction, target, conviction, reasoning }
  },
}

// ── deterministic baselines (always-on control group) ───────────────────────

const momentum: ModelAdapter = {
  id: 'momentum',
  name: 'Momentum Mike',
  provider: 'Baseline',
  kind: 'bot',
  available: () => true,
  predict(ctx) {
    const { ret20, last } = ctx.signals
    const direction: Direction = ret20 >= 0 ? 'up' : 'down'
    const conviction = clampConv(45 + Math.min(45, Math.abs(ret20) * 600))
    return {
      direction,
      target: targetFrom(last, direction, conviction),
      conviction,
      reasoning: `20-day trend is ${pct(ret20)} — I ride strength, so I'm ${direction}.`,
    }
  },
}

const reversion: ModelAdapter = {
  id: 'reversion',
  name: 'Dip Diana',
  provider: 'Baseline',
  kind: 'bot',
  available: () => true,
  predict(ctx) {
    const { ret5, last } = ctx.signals
    const direction: Direction = ret5 > 0 ? 'down' : 'up'
    const conviction = clampConv(48 + Math.min(42, Math.abs(ret5) * 800))
    return {
      direction,
      target: targetFrom(last, direction, conviction),
      conviction,
      reasoning: `5-day move is ${pct(ret5)} — that's stretched, I fade it and call ${direction}.`,
    }
  },
}

const lowvol: ModelAdapter = {
  id: 'lowvol',
  name: 'Steady Sam',
  provider: 'Baseline',
  kind: 'bot',
  available: () => true,
  predict(ctx) {
    const { ret5, ret20, vol, last } = ctx.signals
    const calm = vol < 0.02
    const direction: Direction = calm ? (ret20 >= 0 ? 'up' : 'down') : ret5 > 0 ? 'down' : 'up'
    const conviction = clampConv(calm ? 62 - vol * 800 : 40 - vol * 200)
    return {
      direction,
      target: targetFrom(last, direction, conviction),
      conviction,
      reasoning: calm
        ? `Vol is low (${(vol * 100).toFixed(2)}%/day) — I drift with the calm trend, ${direction}.`
        : `Vol is hot (${(vol * 100).toFixed(2)}%/day) — I bet it cools and fade the push, ${direction}.`,
    }
  },
}

const coinflip: ModelAdapter = {
  id: 'coinflip',
  name: 'Coin Flip',
  provider: 'Baseline',
  kind: 'bot',
  available: () => true,
  predict(ctx) {
    const u = seededUnit(`${ctx.trade_date}|${ctx.ticker}|coinflip`)
    const direction: Direction = u < 0.5 ? 'up' : 'down'
    const conviction = clampConv(30 + seededUnit(`${ctx.trade_date}|${ctx.ticker}|conv`) * 40)
    return {
      direction,
      target: targetFrom(ctx.signals.last, direction, conviction),
      conviction,
      reasoning: `No edge, no opinion — a deterministic coin (seeded from the date + ticker) came up ${direction}.`,
    }
  },
}

// ── registry ──────────────────────────────────────────────────────────────────

/**
 * The challenger roster (everyone except the net, which seals separately).
 * Gemini leads as the real LLM combatant; the baselines keep the arena alive
 * and provide a reproducible control. Add a new ModelAdapter here to enter it.
 */
export const MODELS: ModelAdapter[] = [geminiAdapter, momentum, reversion, lowvol, coinflip]

export const MODEL_IDS = MODELS.map((m) => m.id)

export function availableModels(ctx: ModelContext): ModelAdapter[] {
  return MODELS.filter((m) => m.available(ctx))
}

/** Run every available challenger independently and in parallel; drop abstentions/errors. */
export async function runModels(ctx: ModelContext): Promise<ModelResult[]> {
  const settled = await Promise.all(
    availableModels(ctx).map(async (m): Promise<ModelResult | null> => {
      try {
        const p = await m.predict(ctx)
        return p ? { ...p, id: m.id, name: m.name, provider: m.provider, kind: m.kind } : null
      } catch {
        return null
      }
    })
  )
  return settled.filter((r): r is ModelResult => r != null)
}
