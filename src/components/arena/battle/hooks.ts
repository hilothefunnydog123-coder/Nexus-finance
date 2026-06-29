'use client'

import { useEffect, useRef, useState } from 'react'
import type { Call, Seal, Standing, Combatant } from './types'

/** Smoothly animate a number toward `target` with an ease-out cubic (rAF). */
export function useCountUp(target: number, durationMs = 1100): number {
  const [val, setVal] = useState(0)
  const fromRef = useRef(0)
  const valRef = useRef(0)
  const rafRef = useRef(0)
  useEffect(() => {
    fromRef.current = valRef.current
    let start: number | null = null
    const tick = (t: number) => {
      if (start == null) start = t
      const p = Math.min(1, (t - start) / durationMs)
      const eased = 1 - Math.pow(1 - p, 3)
      const next = fromRef.current + (target - fromRef.current) * eased
      valRef.current = next
      setVal(next)
      if (p < 1) rafRef.current = requestAnimationFrame(tick)
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])
  return val
}

/** A `Date.now()` that re-renders every `intervalMs`. */
export function useNow(intervalMs = 1000): number {
  // Starts at 0 (matches SSR), then ticks — the first tick is deferred into a
  // rAF callback so there's no synchronous setState in the effect body.
  const [now, setNow] = useState(0)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setNow(Date.now()))
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => {
      cancelAnimationFrame(raf)
      clearInterval(id)
    }
  }, [intervalMs])
  return now
}

export type Countdown = { d: number; h: number; m: number; s: number; done: boolean; valid: boolean; total: number }

/** Live countdown to a resolve date (defaults to ~US close, 20:00 UTC, of that day). */
export function useCountdown(targetDate?: string | null): Countdown {
  const now = useNow(1000)
  if (!targetDate) return { d: 0, h: 0, m: 0, s: 0, done: true, valid: false, total: 0 }
  const iso = targetDate.length <= 10 ? `${targetDate}T20:00:00Z` : targetDate
  const target = Date.parse(iso)
  if (Number.isNaN(target) || now === 0) return { d: 0, h: 0, m: 0, s: 0, done: false, valid: !Number.isNaN(target), total: 0 }
  const diff = Math.max(0, target - now)
  const s = Math.floor(diff / 1000)
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
    done: diff === 0,
    valid: true,
    total: diff,
  }
}

export type ArenaLive = {
  loading: boolean
  available: boolean
  tradeDate: string
  calls: Call[]
  seal: Seal
  standings: Standing[]
  demoStandings: boolean
  modelsByTicker: Record<string, Combatant[]>
  lastSync: number
}

/**
 * One polling data layer for the whole hub: today's sealed calls + signed seal,
 * the standings, and every model's call grouped by ticker (for the matchup
 * sentiment). Refreshes on an interval so the room feels live.
 */
export function useArenaLive(pollMs = 20000): ArenaLive {
  const [state, setState] = useState<ArenaLive>({
    loading: true,
    available: true,
    tradeDate: '',
    calls: [],
    seal: null,
    standings: [],
    demoStandings: false,
    modelsByTicker: {},
    lastSync: 0,
  })

  useEffect(() => {
    let alive = true
    const load = async (first: boolean) => {
      const [callsRes, lbRes, modelsRes] = await Promise.allSettled([
        fetch('/api/arena/calls').then((r) => r.json()),
        fetch('/api/arena/leaderboard').then((r) => r.json()),
        fetch('/api/arena/opponents').then((r) => r.json()),
      ])
      if (!alive) return

      const patch: Partial<ArenaLive> = { lastSync: Date.now() }
      if (first) patch.loading = false

      if (callsRes.status === 'fulfilled' && callsRes.value && callsRes.value.available !== false) {
        const j = callsRes.value
        patch.available = true
        patch.calls = Array.isArray(j.calls) ? (j.calls as Call[]) : []
        patch.seal = (j.seal ?? null) as Seal
        patch.tradeDate = j.trade_date ?? ''
      } else if (first) {
        patch.available = false
      }

      if (lbRes.status === 'fulfilled' && Array.isArray(lbRes.value?.standings)) {
        patch.standings = lbRes.value.standings as Standing[]
        patch.demoStandings = !!lbRes.value.demo
      }

      if (modelsRes.status === 'fulfilled' && Array.isArray(modelsRes.value?.models)) {
        const by: Record<string, Combatant[]> = {}
        for (const m of modelsRes.value.models as Combatant[]) {
          ;(by[m.ticker] ??= []).push(m)
        }
        patch.modelsByTicker = by
      }

      setState((s) => ({ ...s, ...patch }))
    }

    load(true)
    const id = setInterval(() => load(false), pollMs)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [pollMs])

  return state
}
