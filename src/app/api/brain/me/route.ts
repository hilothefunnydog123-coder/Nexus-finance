import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, computeAffinity, armScores, rankArms, pathToFeature } from '@/lib/brain/site'
import { type Model, inferUser, interactionsFromEvents, rankByModel, scoreFeat } from '@/lib/brain/model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// What the Site Brain has learned about THIS visitor → personalization payload.
// Uses the trained neural net when available, falls back to affinity + bandit.
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const url = new URL(req.url)
  const vid = String(url.searchParams.get('vid') || '').slice(0, 64)
  const candidates = String(url.searchParams.get('cand') || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!admin || !vid) return NextResponse.json({ ready: false })
  try {
    const { data: ev } = await admin
      .from('behavior_events')
      .select('type,path,target,value,ts')
      .eq('vid', vid)
      .order('ts', { ascending: false })
      .limit(500)
    const events = ev || []
    const profile = computeAffinity(events)

    let seed = 0; for (const c of vid) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
    seed = seed || 1

    // ── neural net path ──
    const { data: row } = await admin.from('brain_model').select('weights').eq('id', 1).maybeSingle()
    const model = row?.weights && (row.weights as Model).feats ? (row.weights as Model) : null

    let order: string[]
    let predictedNext: string | null = null
    let confidence: number | null = null
    let usingModel = false

    if (model && Object.keys(model.feats).length) {
      usingModel = true
      const its = interactionsFromEvents(events, pathToFeature)
      const user = inferUser(model, its)
      const cand = candidates.length ? candidates : Object.keys(model.feats)
      const ranked = rankByModel(model, user, cand, seed)
      order = ranked.map(r => r.key)
      // predicted next = highest-scoring feature the visitor hasn't engaged with much
      const engaged = new Set(profile.features.filter(f => f.score > 1).map(f => f.key))
      const fresh = rankByModel(model, user, Object.keys(model.feats).filter(k => !engaged.has(k)), seed)
      predictedNext = fresh[0]?.key ?? null
      confidence = fresh[0] ? +fresh[0].p.toFixed(3) : null
      if (order.length === 0) order = profile.order
      // also expose per-candidate scores
      const scores = Object.fromEntries(cand.map(k => [k, +scoreFeat(model, user, k).toFixed(3)]))
      return NextResponse.json({
        ready: true, usingModel, seen: events.length, segment: profile.segment,
        features: profile.features.slice(0, 6), tickers: profile.tickers,
        recommend: predictedNext || profile.recommend, predictedNext, confidence, order, scores,
      }, { headers: { 'Cache-Control': 'no-store' } })
    }

    // ── fallback: affinity + popularity bandit ──
    const { data: arms } = await admin.from('brain_arms').select('arm,impressions,clicks').eq('surface', 'home_frames').eq('segment', 'all')
    const global = armScores(arms || [])
    const affinity = new Map(profile.features.map(f => [f.key, f.score]))
    order = candidates.length ? rankArms(candidates, affinity, global, seed) : profile.order
    return NextResponse.json({
      ready: true, usingModel, seen: events.length, segment: profile.segment,
      features: profile.features.slice(0, 6), tickers: profile.tickers,
      recommend: profile.recommend, predictedNext: profile.recommend, confidence: null, order,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
