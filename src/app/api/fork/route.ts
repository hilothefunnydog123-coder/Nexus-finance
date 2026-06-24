import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchBars } from '@/lib/forecast'
import { featurize, predict, FEATURE_NAMES, FEATURE_COUNT } from '@/lib/nn'
import { loadTrainedModel } from '@/lib/nnStore'

/* ════════════════════════════════════════════════════════════════════════
   /api/fork — run a user's FORK of BrainStock.

   A fork = the real trained network + an 11-length feature-weight vector the
   user controls (0–2× per feature) and a conviction dial. We scale the input
   feature vector by those weights before the forward pass, so the fork
   genuinely changes what the net "pays attention to" — turn momentum to 0 and
   the net goes blind to momentum. We return the fork's read AND BrainStock's
   baseline read side by side, on real Yahoo data.
   ════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Number.isFinite(v) ? v : lo))

// Transparent fallback when the shared net hasn't trained yet: a simple signed
// blend of the (weighted) features so the dials still do something sensible.
function proxyReturn(feats: number[]): number {
  // momentum-ish features push up, RSI/range extremes mean-revert
  const signs = [1, 1, 1, 1, 1, 1, -0.3, 0.5, -0.3, -0.6, -0.4]
  let s = 0
  for (let i = 0; i < feats.length; i++) s += feats[i] * (signs[i] ?? 0)
  return Math.tanh(s / 14) * 0.05
}

export async function POST(req: Request) {
  let body: { ticker?: string; weights?: number[]; conviction?: number } = {}
  try { body = await req.json() } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }) }

  const ticker = String(body.ticker ?? '').toUpperCase().trim()
  if (!/^[A-Z0-9.\-]{1,8}$/.test(ticker)) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })

  const w = Array.isArray(body.weights) ? body.weights : []
  const weights = Array.from({ length: FEATURE_COUNT }, (_, i) => clamp(Number(w[i] ?? 1), 0, 2))
  const conviction = clamp(Number(body.conviction ?? 1), 0.3, 2)
  const horizon = 5

  try {
    const bars = await fetchBars(ticker)
    const feats = featurize(bars.map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v })))
    if (!feats) return NextResponse.json({ error: 'Not enough data for this ticker' }, { status: 422 })

    const admin = getAdmin()
    const model = admin ? await loadTrainedModel(admin) : null
    const ret = (f: number[]) => (model ? predict(model, f) : proxyReturn(f))

    const last = bars[bars.length - 1].c
    const forkFeats = feats.map((f, i) => f * weights[i])

    const baseRet = ret(feats)
    const forkRet = ret(forkFeats) * conviction

    const toTarget = (r: number) => +(last * Math.exp(r)).toFixed(2)
    const toPct = (r: number) => +((Math.exp(r) - 1) * 100).toFixed(2)

    const contributions = feats.map((f, i) => ({
      name: FEATURE_NAMES[i],
      value: +f.toFixed(2),
      weight: +weights[i].toFixed(2),
      weighted: +(f * weights[i]).toFixed(2),
    }))

    return NextResponse.json({
      ticker,
      last: +last.toFixed(2),
      horizon,
      engine: model ? 'neural-net' : 'proxy',
      base: { pct: toPct(baseRet), target: toTarget(baseRet), dir: baseRet >= 0 ? 'up' : 'down' },
      fork: { pct: toPct(forkRet), target: toTarget(forkRet), dir: forkRet >= 0 ? 'up' : 'down' },
      contributions,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Forecast failed' }, { status: 502 })
  }
}
