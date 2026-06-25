import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, computeAffinity, armScores, rankArms } from '@/lib/brain/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// What the Site Brain has learned about THIS visitor → personalization payload.
// candidates: comma-separated feature keys the caller wants ranked (e.g. home frames).
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  const url = new URL(req.url)
  const vid = String(url.searchParams.get('vid') || '').slice(0, 64)
  const candidates = String(url.searchParams.get('cand') || '').split(',').map(s => s.trim()).filter(Boolean)
  if (!admin || !vid) return NextResponse.json({ ready: false })
  try {
    // visitor's recent events → affinity
    const { data: ev } = await admin
      .from('behavior_events')
      .select('type,path,target,value,ts')
      .eq('vid', vid)
      .order('ts', { ascending: false })
      .limit(500)
    const profile = computeAffinity(ev || [])

    // global popularity prior from the bandit rollup
    const { data: arms } = await admin
      .from('brain_arms')
      .select('arm,impressions,clicks')
      .eq('surface', 'home_frames')
      .eq('segment', 'all')
    const global = armScores(arms || [])

    const affinity = new Map(profile.features.map(f => [f.key, f.score]))
    // deterministic per-visitor exploration seed
    let seed = 0; for (const c of vid) seed = (seed * 31 + c.charCodeAt(0)) >>> 0
    const order = candidates.length ? rankArms(candidates, affinity, global, seed || 1) : profile.order

    return NextResponse.json({
      ready: true,
      seen: (ev || []).length,
      segment: profile.segment,
      features: profile.features.slice(0, 6),
      tickers: profile.tickers,
      recommend: profile.recommend,
      order,
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
