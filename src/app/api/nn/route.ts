import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { trainStep, NN_ARCH } from '@/lib/nn'
import { loadModel, saveModel } from '@/lib/nnStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

// GET — the network's public report card.
export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, arch: NN_ARCH })
  try {
    const { data } = await admin.from('nn_model').select('trained,avg_loss,dir_acc,updated_at,arch').eq('id', 1).maybeSingle()
    return NextResponse.json(
      { ready: (data?.trained ?? 0) > 0, arch: data?.arch ?? NN_ARCH, trained: data?.trained ?? 0, avgLoss: data?.avg_loss ?? 0, dirAcc: data?.dir_acc ?? 0, updatedAt: data?.updated_at ?? null },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
    )
  } catch {
    return NextResponse.json({ ready: false, arch: NN_ARCH })
  }
}

// POST — backprop pass over freshly resolved predictions (cron-driven). This is
// where the net actually learns: each graded outcome becomes one training step.
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'no db' }, { status: 500 })

  const model = await loadModel(admin)

  // Resolved predictions we have features for and haven't trained on yet.
  const { data } = await admin
    .from('prediction_log')
    .select('id,start_price,actual_price,features')
    .neq('status', 'open')
    .eq('nn_trained', false)
    .not('features', 'is', null)
    .not('actual_price', 'is', null)
    .limit(500)
  const rows = (data || []) as { id: number; start_price: number; actual_price: number; features: number[] }[]

  let learned = 0
  const trainedIds: number[] = []
  // A couple of epochs over the fresh batch for a stronger update.
  for (let epoch = 0; epoch < 3; epoch++) {
    for (const r of rows) {
      const start = Number(r.start_price), actual = Number(r.actual_price)
      if (!start || !actual || !Array.isArray(r.features)) continue
      const target = Math.log(actual / start) // realized horizon log-return
      if (!Number.isFinite(target)) continue
      trainStep(model, r.features, target)
      if (epoch === 0) { learned++; trainedIds.push(r.id) }
    }
  }

  if (learned > 0) {
    await saveModel(admin, model)
    // snapshot the learning curve (loss should trend down over time)
    try {
      await admin.from('nn_history').insert({
        trained: model.trained,
        avg_loss: model.trained ? +(model.sumLoss / model.trained).toFixed(5) : 0,
        dir_acc: model.trained ? +((model.dirHits / model.trained) * 100).toFixed(1) : 0,
      })
    } catch { /* table may not exist yet */ }
    // mark them done so we don't retrain the same rows
    for (let i = 0; i < trainedIds.length; i += 200) {
      await admin.from('prediction_log').update({ nn_trained: true }).in('id', trainedIds.slice(i, i + 200))
    }
  }

  return NextResponse.json({ learned, totalTrained: model.trained, arch: NN_ARCH })
}
