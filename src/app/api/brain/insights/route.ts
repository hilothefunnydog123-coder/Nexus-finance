import { NextRequest, NextResponse } from 'next/server'
import { getAdmin, pathToFeature, FEATURES } from '@/lib/brain/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Owner "Site Brain" dashboard: what's used, attention, funnel, rising vs dead.
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false })
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 14))
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  const half = new Date(Date.now() - (days / 2) * 86400_000).toISOString()
  try {
    const { data: ev } = await admin
      .from('behavior_events')
      .select('type,path,target,value,ts,vid')
      .gte('ts', since)
      .limit(20000)
    const rows = ev || []

    const visitors = new Set<string>()
    const clicksByFeat = new Map<string, number>()
    const dwellByFeat = new Map<string, { sum: number; n: number }>()
    const tickers = new Map<string, number>()
    const recentClicks = new Map<string, number>()  // 2nd half of window
    const olderClicks = new Map<string, number>()    // 1st half
    let conves = 0

    for (const r of rows) {
      visitors.add(r.vid)
      const fk = (r.target && FEATURES[r.target]) ? r.target : pathToFeature(r.path)
      if (r.type === 'convert') conves++
      if (r.type === 'ticker' && r.target) tickers.set(r.target, (tickers.get(r.target) || 0) + 1)
      if (!fk) continue
      if (r.type === 'click') {
        clicksByFeat.set(fk, (clicksByFeat.get(fk) || 0) + 1)
        const bucket = r.ts >= half ? recentClicks : olderClicks
        bucket.set(fk, (bucket.get(fk) || 0) + 1)
      }
      if (r.type === 'dwell' && r.value) {
        const d = dwellByFeat.get(fk) || { sum: 0, n: 0 }
        d.sum += r.value; d.n += 1; dwellByFeat.set(fk, d)
      }
    }

    const features = Object.keys(FEATURES).map(k => {
      const clicks = clicksByFeat.get(k) || 0
      const d = dwellByFeat.get(k)
      const avgDwellS = d && d.n ? Math.round(d.sum / d.n / 1000) : 0
      const rec = recentClicks.get(k) || 0, old = olderClicks.get(k) || 0
      const trend = rec - old   // >0 rising, <0 cooling
      return { key: k, label: FEATURES[k].label, clicks, avgDwellS, trend }
    }).sort((a, b) => b.clicks - a.clicks)

    const rising = [...features].filter(f => f.trend > 0).sort((a, b) => b.trend - a.trend).slice(0, 5)
    const dead = [...features].filter(f => f.clicks === 0).map(f => f.key)
    const topTickers = [...tickers.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(([sym, n]) => ({ sym, n }))

    // self-evolving experiments + whether the model is trained
    const { data: exps } = await admin.from('brain_experiments').select('exp,variant,impressions,conversions,promoted')
    const expMap = new Map<string, { variant: string; impressions: number; conversions: number; promoted: boolean }[]>()
    for (const r of exps || []) { const a = expMap.get(r.exp) || []; a.push(r); expMap.set(r.exp, a) }
    const experiments = [...expMap.entries()].map(([exp, vs]) => ({
      exp,
      variants: vs.map(v => ({ variant: v.variant, impressions: v.impressions, conversions: v.conversions, cvr: v.impressions ? +(v.conversions / v.impressions * 100).toFixed(1) : 0, promoted: v.promoted })).sort((a, b) => b.cvr - a.cvr),
    }))
    const { data: mdl } = await admin.from('brain_model').select('trained_n,updated_at').eq('id', 1).maybeSingle()

    return NextResponse.json({
      ready: true, days,
      totals: { events: rows.length, visitors: visitors.size, conversions: conves },
      features, rising, dead, topTickers, experiments,
      model: mdl ? { trainedSteps: mdl.trained_n, updatedAt: mdl.updated_at } : null,
    }, { headers: { 'Cache-Control': 's-maxage=120' } })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
