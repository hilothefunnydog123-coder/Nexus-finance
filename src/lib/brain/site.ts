// ════════════════════════════════════════════════════════════════════════════
// YN Finance — SITE BRAIN (server): turns behavior events into personalization.
// Pure functions + a graceful admin client. No DB → everything no-ops safely.
// ════════════════════════════════════════════════════════════════════════════
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

export function getAdmin(): SupabaseClient | null {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

// ── Feature taxonomy: map a route to a stable feature key + label + segment hint
export const FEATURES: Record<string, { label: string; seg: string }> = {
  brainstock:   { label: 'BrainStock forecasts', seg: 'forecaster' },
  algorithms:   { label: 'Copy-paste algorithms', seg: 'trader' },
  'ai-stocks':  { label: 'AI Analyzer', seg: 'analyst' },
  analyzer:     { label: 'Trade Analyzer', seg: 'trader' },
  'war-room':   { label: 'War Room', seg: 'analyst' },
  copilot:      { label: 'Voice copilot', seg: 'forecaster' },
  courses:      { label: 'Courses', seg: 'learner' },
  fork:         { label: 'Fork the Brain', seg: 'forecaster' },
  proof:        { label: 'Proof / track record', seg: 'skeptic' },
  performance:  { label: 'Performance', seg: 'skeptic' },
  methodology:  { label: 'Methodology', seg: 'skeptic' },
  fund:         { label: 'The Fund', seg: 'skeptic' },
  galaxy:       { label: 'Market Galaxy', seg: 'spectator' },
  storm:        { label: 'Conviction Storm', seg: 'spectator' },
  'the-open':   { label: 'The Open', seg: 'spectator' },
  'brain/live': { label: 'Enter the Net', seg: 'spectator' },
  pricing:      { label: 'Pricing', seg: 'buyer' },
  daily:        { label: 'Daily brief', seg: 'buyer' },
}

export function pathToFeature(path?: string | null): string | null {
  if (!path) return null
  const p = path.replace(/^\/+/, '')
  if (FEATURES['brain/live'] && p.startsWith('brain/live')) return 'brain/live'
  const first = p.split('/')[0]
  if (FEATURES[first]) return first
  return null
}

// Recency- + type-weighted signal from a visitor's recent events.
const TYPE_WEIGHT: Record<string, number> = { convert: 6, click: 3, ticker: 3, dwell: 2, scroll: 1, pageview: 1, impression: 0 }

export interface BrainProfile {
  features: { key: string; label: string; score: number }[]
  tickers: { sym: string; score: number }[]
  segment: string
  recommend: string | null   // feature key to suggest next
  order: string[]            // personalized ranking of feature keys
}

type Ev = { type: string; path?: string; target?: string; value?: number; ts?: string }

export function computeAffinity(events: Ev[], now = Date.now()): BrainProfile {
  const feat = new Map<string, number>()
  const tick = new Map<string, number>()
  const segScore = new Map<string, number>()
  for (const e of events) {
    const w = TYPE_WEIGHT[e.type] ?? 0
    if (!w) continue
    // recency decay: half-life ~14 days
    const age = e.ts ? (now - new Date(e.ts).getTime()) / 86400_000 : 0
    const decay = Math.pow(0.5, age / 14)
    const wt = w * decay * (e.type === 'dwell' ? Math.min(3, (e.value || 0) / 15000) : 1)
    if (e.type === 'ticker' && e.target) {
      tick.set(e.target, (tick.get(e.target) || 0) + wt)
      continue
    }
    const fk = e.target && FEATURES[e.target] ? e.target : pathToFeature(e.path)
    if (!fk) continue
    feat.set(fk, (feat.get(fk) || 0) + wt)
    const seg = FEATURES[fk]?.seg
    if (seg) segScore.set(seg, (segScore.get(seg) || 0) + wt)
  }
  const features = [...feat.entries()].map(([key, score]) => ({ key, label: FEATURES[key]?.label || key, score }))
    .sort((a, b) => b.score - a.score)
  const tickers = [...tick.entries()].map(([sym, score]) => ({ sym, score })).sort((a, b) => b.score - a.score).slice(0, 8)
  const segment = [...segScore.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || 'explorer'
  // recommend the highest-segment feature they HAVEN'T engaged much with
  const engaged = new Set(features.filter(f => f.score > 1).map(f => f.key))
  const recommend = Object.entries(FEATURES).filter(([k, v]) => v.seg === segment && !engaged.has(k)).map(([k]) => k)[0]
    || Object.keys(FEATURES).find(k => !engaged.has(k)) || null
  return { features, tickers, segment, recommend, order: features.map(f => f.key) }
}

// Laplace-smoothed CTR per arm → a stable "global popularity" prior.
export function armScores(arms: { arm: string; impressions: number; clicks: number }[]): Map<string, number> {
  const m = new Map<string, number>()
  for (const a of arms) m.set(a.arm, (a.clicks + 1) / (a.impressions + 2))
  return m
}

// Blend personal affinity with global popularity, with light exploration noise.
// candidates = feature keys eligible for ordering (e.g. non-pinned home frames).
export function rankArms(candidates: string[], affinity: Map<string, number>, global: Map<string, number>, seed = 1): string[] {
  const maxAff = Math.max(1e-6, ...[...affinity.values()])
  const maxGlb = Math.max(1e-6, ...[...global.values()])
  let s = seed >>> 0 || 1
  const rnd = () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1e6) / 1e6 }
  return [...candidates].map(k => {
    const aff = (affinity.get(k) || 0) / maxAff       // 0..1 personal
    const glb = (global.get(k) || 0) / maxGlb         // 0..1 global CTR
    const explore = rnd() * 0.18                       // ε exploration
    return { k, score: 0.6 * aff + 0.3 * glb + explore }
  }).sort((a, b) => b.score - a.score).map(x => x.k)
}
