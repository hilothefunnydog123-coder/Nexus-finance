'use client'

import { supabase } from '@/lib/supabase'

/* ════════════════════════════════════════════════════════════════════════
   Client helpers for a signed-in user's saved history of forecasts/analyses.
   Saving is best-effort and silent: if the user isn't signed in (no session)
   or Supabase isn't configured, we simply skip — nothing breaks.
   ════════════════════════════════════════════════════════════════════════ */

export interface HistoryItem {
  id: string
  kind: 'analysis' | 'forecast'
  ticker: string | null
  title: string | null
  summary: string | null
  rating: string | null
  confidence: number | null
  price: number | null
  target: number | null
  pct: number | null
  payload: Record<string, unknown>
  created_at: string
}

export interface SaveHistoryInput {
  kind: 'analysis' | 'forecast'
  ticker?: string | null
  title?: string | null
  summary?: string | null
  rating?: string | null
  confidence?: number | null
  price?: number | null
  target?: number | null
  pct?: number | null
  payload?: Record<string, unknown>
}

async function token(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

/** Save a forecast/analysis to the signed-in user's history. No-op if signed out. */
export async function saveToHistory(input: SaveHistoryInput): Promise<{ ok: boolean; id?: string }> {
  try {
    const t = await token()
    if (!t) return { ok: false }
    const res = await fetch('/api/history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify(input),
    })
    if (!res.ok) return { ok: false }
    const d = await res.json().catch(() => ({}))
    return { ok: true, id: d.id }
  } catch {
    return { ok: false }
  }
}

/** Fetch the signed-in user's saved history. Returns [] when signed out. */
export async function fetchHistory(kind?: 'analysis' | 'forecast'): Promise<HistoryItem[]> {
  try {
    const t = await token()
    if (!t) return []
    const url = kind ? `/api/history?kind=${kind}` : '/api/history'
    const res = await fetch(url, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) return []
    const d = await res.json().catch(() => ({}))
    return Array.isArray(d.items) ? d.items : []
  } catch {
    return []
  }
}

/** Delete one history item. */
export async function deleteHistory(id: string): Promise<boolean> {
  try {
    const t = await token()
    if (!t) return false
    const res = await fetch(`/api/history?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}` },
    })
    return res.ok
  } catch {
    return false
  }
}
