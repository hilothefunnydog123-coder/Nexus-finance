import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchYahoo, addBusinessDays } from '@/lib/forecast'
import { features, predictUp, trainStep, N_FEATURES } from '@/lib/brain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}
function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

type Brain = { weights: number[]; bias: number; trained: number; correct: number }
async function loadBrain(admin: NonNullable<ReturnType<typeof getAdmin>>): Promise<Brain> {
  const { data } = await admin.from('brain').select('*').eq('id', 1).maybeSingle()
  return {
    weights: Array.isArray(data?.weights) && data.weights.length === N_FEATURES ? data.weights : [0.4, 0.6, 0.3, 0.5, 0],
    bias: Number(data?.bias) || 0,
    trained: Number(data?.trained) || 0,
    correct: Number(data?.correct) || 0,
  }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ trained: 0, accuracy: 0 })
  try {
    const b = await loadBrain(admin)
    return NextResponse.json(
      { trained: b.trained, accuracy: b.trained ? +((b.correct / b.trained) * 100).toFixed(1) : 0 },
      { headers: { 'Cache-Control': 's-maxage=30, stale-while-revalidate=120' } }
    )
  } catch {
    return NextResponse.json({ trained: 0, accuracy: 0 })
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  const action = body.action as string
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'no db' }, { status: 500 })

  // A game play: compute features now, log a training example, return the brain's call.
  if (action === 'play') {
    const ticker = String(body.ticker ?? '').toUpperCase().trim()
    if (!/^[A-Z0-9.\-]{1,8}$/.test(ticker)) return NextResponse.json({ error: 'Invalid ticker' }, { status: 400 })
    const userDir = body.userDir === 'up' || body.userDir === 'down' ? (body.userDir as string) : null
    try {
      const hist = await fetchYahoo(ticker)
      const closes = hist.map((p) => p.price)
      const x = features(closes)
      const startPrice = closes[closes.length - 1]
      const resolveDate = addBusinessDays(new Date(etDate() + 'T00:00:00Z'), 5).toISOString().slice(0, 10)
      const brain = await loadBrain(admin)
      const p = predictUp(brain.weights, brain.bias, x)
      const aiDir = p >= 0.5 ? 'up' : 'down'
      try {
        await admin.from('brain_examples').insert({
          ticker,
          features: x,
          start_price: startPrice,
          resolve_date: resolveDate,
          status: 'open',
          source: 'game',
          user_dir: userDir,
          ai_dir: aiDir,
        })
      } catch {
        /* table may not exist yet */
      }
      return NextResponse.json({
        dir: aiDir,
        confidence: +(Math.max(p, 1 - p) * 100).toFixed(0),
        startPrice: +startPrice.toFixed(2),
        resolveDate,
        trained: brain.trained,
      })
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : 'forecast failed' }, { status: 502 })
    }
  }

  // Training pass (cron): label resolved examples and run one SGD step each.
  if (action === 'train') {
    const secret = process.env.AGENT_POLL_SECRET
    const auth = req.headers.get('authorization') ?? ''
    if (secret && auth && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const brain = await loadBrain(admin)
    let { weights, bias } = brain
    let trained = brain.trained
    let correct = brain.correct
    let learned = 0

    const { data } = await admin
      .from('brain_examples')
      .select('id,ticker,features,start_price,resolve_date')
      .eq('status', 'open')
      .lte('resolve_date', etDate())
      .limit(150)
    const due = (data || []) as { id: number; ticker: string; features: number[]; start_price: number; resolve_date: string }[]

    const start = Date.now()
    for (const ex of due) {
      if (Date.now() - start > 45000) break
      try {
        const hist = await fetchYahoo(ex.ticker)
        const at = hist.find((h) => h.date >= ex.resolve_date) ?? hist[hist.length - 1]
        const label = at.price >= Number(ex.start_price) ? 1 : 0
        const step = trainStep(weights, bias, ex.features, label)
        // progressive validation: did the pre-update model call it right?
        if ((step.p >= 0.5 ? 1 : 0) === label) correct++
        trained++
        weights = step.weights
        bias = step.bias
        learned++
        await admin.from('brain_examples').update({ status: 'trained', label }).eq('id', ex.id)
      } catch {
        /* leave open, retry next run */
      }
    }

    if (learned > 0) {
      await admin.from('brain').upsert({ id: 1, weights, bias, trained, correct, updated_at: new Date().toISOString() })
    }
    return NextResponse.json({ learned, trained, accuracy: trained ? +((correct / trained) * 100).toFixed(1) : 0 })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
