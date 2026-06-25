import { NextResponse } from 'next/server'
import { getAdmin, pathToFeature } from '@/lib/brain/site'
import { emptyModel, type Model, sgdStep, interactionsFromEvents, DIM } from '@/lib/brain/model'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// The learner. Pulls recent behavior, runs SGD epochs (jointly learning a user
// embedding per visitor + the global feature embeddings), persists the model.
// Schedule this (Netlify scheduled function / cron) every few minutes, or hit it
// manually. No DB → no-op.
export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false })
  try {
    // load (or init) the model
    const { data: row } = await admin.from('brain_model').select('weights,trained_n').eq('id', 1).maybeSingle()
    const m: Model = row?.weights && (row.weights as Model).feats ? (row.weights as Model) : emptyModel(DIM)

    // recent interactions, grouped by visitor
    const { data: ev } = await admin
      .from('behavior_events')
      .select('vid,type,target,path,value,ts')
      .order('ts', { ascending: false })
      .limit(12000)
    const rows = ev || []
    const byVid = new Map<string, { feat: string; y: number }[]>()
    for (const r of rows) {
      const its = interactionsFromEvents([r], pathToFeature)
      if (!its.length) continue
      const arr = byVid.get(r.vid) || []
      arr.push(...its)
      byVid.set(r.vid, arr)
    }
    const visitors = [...byVid.values()].filter((a) => a.length >= 2)
    if (!visitors.length) return NextResponse.json({ ready: true, trained: 0, note: 'not enough interactions yet' })

    // SGD epochs
    const EPOCHS = 6
    let loss = 0, steps = 0
    for (let e = 0; e < EPOCHS; e++) {
      for (const its of visitors) {
        const user = new Array(m.dim).fill(0)
        // two passes to settle the user vector against current features, then learn both
        for (let p = 0; p < 2; p++) for (const it of its) sgdStep({ ...m, feats: m.feats }, user, it.feat, it.y)
        for (const it of its) { loss += sgdStep(m, user, it.feat, it.y); steps++ }
      }
    }
    m.n = (row?.trained_n || 0) + steps

    await admin.from('brain_model').upsert({ id: 1, dim: m.dim, weights: m, trained_n: m.n, updated_at: new Date().toISOString() })

    const feats = Object.keys(m.feats).length
    return NextResponse.json({ ready: true, trained: steps, visitors: visitors.length, features: feats, avgLoss: steps ? +(loss / steps).toFixed(4) : null, totalSteps: m.n })
  } catch (err) {
    return NextResponse.json({ ready: false, error: String(err).slice(0, 120) })
  }
}
