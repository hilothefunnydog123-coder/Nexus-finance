import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchBars } from '@/lib/forecast'
import { featurize, predict, FEATURE_COUNT, type NNModel } from '@/lib/nn'
import { loadTrainedModel } from '@/lib/nnStore'

/* ════════════════════════════════════════════════════════════════════════
   /api/fork-backtest — "would this fork have worked?"

   Walk-forward backtests a fork's dial settings across a basket of stocks and
   scores its directional accuracy + average edge, head-to-head with BrainStock
   (equal weights). With { optimize: true } it searches dial settings for the
   highest-scoring fork — the AI tuning the AI.

   Speed trick: fetch the basket + precompute every eval feature vector ONCE,
   then scoring any weight vector is just cheap forward passes.
   ════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

const BASKET = ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'AMD']
const HORIZON = 5
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo))
const ONES = () => Array.from({ length: FEATURE_COUNT }, () => 1)

function proxyReturn(feats: number[]): number {
  const signs = [1, 1, 1, 1, 1, 1, -0.3, 0.5, -0.3, -0.6, -0.4]
  let s = 0
  for (let i = 0; i < feats.length; i++) s += feats[i] * (signs[i] ?? 0)
  return Math.tanh(s / 14) * 0.05
}

type Sample = { f: number[]; ret: number } // feature vector + realized horizon return

// Score a (weights, conviction) over precomputed samples → directional accuracy + avg edge.
function score(samples: Sample[], model: NNModel | null, weights: number[], conv: number) {
  let hits = 0, n = 0, edge = 0
  for (const s of samples) {
    const wf = s.f.map((x, i) => x * weights[i])
    const rHat = (model ? predict(model, wf) : proxyReturn(wf)) * conv
    if (s.ret === 0) continue
    n++
    if (Math.sign(rHat) === Math.sign(s.ret)) hits++
    edge += Math.sign(rHat) * s.ret // taking the side the fork picked
  }
  return { acc: n ? +((hits / n) * 100).toFixed(1) : 0, edge: n ? +((edge / n) * 100).toFixed(2) : 0, n }
}

export async function POST(req: Request) {
  let body: { weights?: number[]; conviction?: number; optimize?: boolean } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }
  const weights = Array.from({ length: FEATURE_COUNT }, (_, i) => clamp(Number(body.weights?.[i] ?? 1), 0, 2))
  const conviction = clamp(Number(body.conviction ?? 1), 0.3, 2)
  const optimize = !!body.optimize

  try {
    const admin = getAdmin()
    const model = admin ? await loadTrainedModel(admin) : null

    // Build the sample set once.
    const samples: Sample[] = []
    const baskets = await Promise.all(BASKET.map((t) => fetchBars(t).catch(() => null)))
    for (const bars of baskets) {
      if (!bars || bars.length < 80) continue
      const c = bars.map((b) => b.c)
      const start = Math.max(60, c.length - 140)
      for (let t = start; t < c.length - HORIZON; t++) {
        const f = featurize(bars.slice(0, t + 1).map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v })))
        if (!f) continue
        samples.push({ f, ret: (c[t + HORIZON] - c[t]) / c[t] })
      }
    }
    if (samples.length < 50) return NextResponse.json({ error: 'Not enough data to backtest' }, { status: 422 })

    const base = score(samples, model, ONES(), 1)
    const fork = score(samples, model, weights, conviction)

    let optimized: { weights: number[]; conviction: number; acc: number; edge: number } | undefined
    if (optimize) {
      let best = { weights: weights.slice(), conviction, ...score(samples, model, weights, conviction) }
      // seed with a few archetypes
      const seeds: [number[], number][] = [
        [ONES(), 1],
        [[1.6, 1.8, 1.6, 1.4, 1.6, 1.5, 0.6, 1.2, 0.6, 0.4, 0.6], 1.2],
        [[0.5, 0.5, 0.6, 0.7, 0.6, 0.7, 1.3, 1.0, 1.2, 1.8, 1.6], 1.0],
        [[1, 1, 1, 1, 1, 1, 1.8, 1.6, 1.8, 0.8, 0.9], 1.3],
        [[0.8, 1.2, 1.5, 1.8, 1.6, 1.8, 0.7, 1.0, 0.7, 0.8, 1.2], 1.1],
      ]
      for (const [w, cv] of seeds) {
        const sc = score(samples, model, w, cv)
        if (sc.acc > best.acc) best = { weights: w.slice(), conviction: cv, ...sc }
      }
      // hill-climb: random perturbations around the running best (deterministic-ish via index seeding)
      let cur = best
      for (let iter = 0; iter < 60; iter++) {
        const w = cur.weights.map((x) => clamp(x + (((iter * 7 + 3) % 11) / 11 - 0.5) * 0.6 * Math.sin(iter * 1.3 + x * 5), 0, 2))
        const cv = clamp(cur.conviction + Math.sin(iter * 0.7) * 0.15, 0.3, 2)
        const sc = score(samples, model, w, cv)
        if (sc.acc > cur.acc || (sc.acc === cur.acc && sc.edge > cur.edge)) cur = { weights: w, conviction: cv, ...sc }
      }
      if (cur.acc > best.acc) best = cur
      optimized = { weights: best.weights.map((x) => +x.toFixed(2)), conviction: +best.conviction.toFixed(2), acc: best.acc, edge: best.edge }
    }

    return NextResponse.json({
      samples: samples.length,
      engine: model ? 'neural-net' : 'proxy',
      base: { acc: base.acc, edge: base.edge },
      fork: { acc: fork.acc, edge: fork.edge },
      optimized,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Backtest failed' }, { status: 502 })
  }
}
