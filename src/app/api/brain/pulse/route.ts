import { NextResponse } from 'next/server'
import { getAdmin, pathToFeature, FEATURES } from '@/lib/brain/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Live neural activity for the cinematic /the-mind visualization. Returns the
// recent feature "firings", who's online now, what's trending, and the segment
// mix. No DB → ready:false (the client runs in pure-ambient mode so it's never dead).
export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, features: Object.keys(FEATURES) })
  try {
    const since = new Date(Date.now() - 15 * 60_000).toISOString()
    const fresh = new Date(Date.now() - 5 * 60_000).toISOString()
    const { data: ev } = await admin
      .from('behavior_events')
      .select('vid,type,target,path,ts')
      .gte('ts', since)
      .order('ts', { ascending: false })
      .limit(800)
    const rows = ev || []
    const live = new Set<string>()
    const fire = new Map<string, number>()
    const seq: { feat: string; ts: string }[] = []
    for (const r of rows) {
      if (r.ts >= fresh) live.add(r.vid)
      const fk = (r.target && FEATURES[r.target]) ? r.target : pathToFeature(r.path)
      if (!fk) continue
      const w = r.type === 'click' ? 3 : r.type === 'convert' ? 5 : 1
      fire.set(fk, (fire.get(fk) || 0) + w)
      if (r.type === 'click' || r.type === 'pageview') seq.push({ feat: fk, ts: r.ts })
    }
    const trending = [...fire.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([key, heat]) => ({ key, label: FEATURES[key]?.label || key, heat }))
    return NextResponse.json({
      ready: true,
      visitorsNow: live.size,
      features: Object.keys(FEATURES),
      trending,
      recent: seq.slice(0, 80),
    }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ ready: false, features: Object.keys(FEATURES) })
  }
}
