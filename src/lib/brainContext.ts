'use client'

/* ════════════════════════════════════════════════════════════════════════
   brainContext — the connective tissue. One shared snapshot every feature can
   read so the product feels like ONE intelligence that knows you and the
   market, not 20 disconnected tools:

   • your saved history (from /api/history — signed-in only)
   • today's BrainStock picks (/api/daily-picks)
   • the public track record (/api/track-record)

   Helpers answer "have I seen this ticker?" and "did the net flag it today?".
   Everything degrades to empty — never throws.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { fetchHistory, type HistoryItem } from './history'

export interface BrainContext {
  history: HistoryItem[]
  today: { date: string | null; picks: Record<string, unknown>[]; bears: Record<string, unknown>[] }
  stats: { winRate: number | null; total: number | null }
  loading: boolean
}

const EMPTY: BrainContext = { history: [], today: { date: null, picks: [], bears: [] }, stats: { winRate: null, total: null }, loading: true }

const tickerOf = (o: Record<string, unknown>) => String(o.ticker ?? o.symbol ?? o.t ?? '').toUpperCase()

export async function loadBrainContext(): Promise<BrainContext> {
  const [history, picks, tr] = await Promise.all([
    fetchHistory().catch(() => [] as HistoryItem[]),
    fetch('/api/daily-picks').then((r) => r.json()).catch(() => ({ picks: [], bears: [], date: null })),
    fetch('/api/track-record').then((r) => r.json()).catch(() => ({ stats: null })),
  ])
  return {
    history,
    today: { date: picks?.date ?? null, picks: Array.isArray(picks?.picks) ? picks.picks : [], bears: Array.isArray(picks?.bears) ? picks.bears : [] },
    stats: { winRate: tr?.stats?.winRate ?? tr?.stats?.win_rate ?? null, total: tr?.stats?.total ?? null },
    loading: false,
  }
}

/** Load the shared context once on mount. */
export function useBrainContext(): BrainContext {
  const [ctx, setCtx] = useState<BrainContext>(EMPTY)
  useEffect(() => {
    let cancel = false
    loadBrainContext().then((c) => { if (!cancel) setCtx(c) })
    return () => { cancel = true }
  }, [])
  return ctx
}

/** Most recent saved item for a ticker, if any. */
export function lastForTicker(ctx: BrainContext, ticker: string): HistoryItem | null {
  const T = ticker.toUpperCase()
  return ctx.history.find((h) => (h.ticker || '').toUpperCase() === T) ?? null
}

/** Did the net flag this ticker in today's picks/bears? Returns direction or null. */
export function todaysCall(ctx: BrainContext, ticker: string): 'bull' | 'bear' | null {
  const T = ticker.toUpperCase()
  if (ctx.today.picks.some((p) => tickerOf(p) === T)) return 'bull'
  if (ctx.today.bears.some((p) => tickerOf(p) === T)) return 'bear'
  return null
}

/** "2d ago" style relative time. */
export function ago(iso: string): string {
  const d = Date.now() - new Date(iso).getTime()
  const m = Math.floor(d / 60000), h = Math.floor(m / 60), days = Math.floor(h / 24)
  if (days > 0) return `${days}d ago`
  if (h > 0) return `${h}h ago`
  if (m > 0) return `${m}m ago`
  return 'just now'
}
