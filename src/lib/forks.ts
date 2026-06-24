'use client'

import { supabase } from '@/lib/supabase'

export interface ForkPreset {
  id: string
  name: string
  weights: number[]
  conviction: number
  score?: number | null
  created_at: string
}

export interface Leader {
  name: string
  display_name: string | null
  score: number
  weights: number[]
  conviction: number
}

async function token(): Promise<string | null> {
  if (!supabase) return null
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function fetchForks(): Promise<ForkPreset[]> {
  try {
    const t = await token(); if (!t) return []
    const res = await fetch('/api/forks', { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) return []
    const d = await res.json().catch(() => ({}))
    return Array.isArray(d.forks) ? d.forks : []
  } catch { return [] }
}

export async function saveFork(name: string, weights: number[], conviction: number, score?: number | null, displayName?: string): Promise<{ ok: boolean; id?: string }> {
  try {
    const t = await token(); if (!t) return { ok: false }
    const res = await fetch('/api/forks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: JSON.stringify({ name, weights, conviction, score: score ?? null, display_name: displayName ?? null }),
    })
    if (!res.ok) return { ok: false }
    const d = await res.json().catch(() => ({}))
    return { ok: true, id: d.id }
  } catch { return { ok: false } }
}

export async function fetchLeaderboard(): Promise<Leader[]> {
  try {
    const res = await fetch('/api/leaderboard/forks')
    if (!res.ok) return []
    const d = await res.json().catch(() => ({}))
    return Array.isArray(d.leaders) ? d.leaders : []
  } catch { return [] }
}

export async function deleteFork(id: string): Promise<boolean> {
  try {
    const t = await token(); if (!t) return false
    const res = await fetch(`/api/forks?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { Authorization: `Bearer ${t}` } })
    return res.ok
  } catch { return false }
}
