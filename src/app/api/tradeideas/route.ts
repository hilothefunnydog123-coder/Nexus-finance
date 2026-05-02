import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

function getClient(authHeader?: string) {
  if (!SUPABASE_ENABLED) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
  )
}

export async function GET() {
  const sb = getClient()
  if (!sb) return NextResponse.json({ ideas: [], demo: true })

  const { data } = await sb
    .from('trade_ideas')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return NextResponse.json({ ideas: data || [], demo: false })
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const sb = getClient(auth || undefined)

  const body = await req.json()
  const { action } = body

  if (!sb) {
    // Demo mode — just return success, component handles local state
    return NextResponse.json({ success: true, demo: true })
  }

  if (action === 'post') {
    const { ticker, side, entry, sl, tp, timeframe, thesis, username, tags } = body
    const { data, error } = await sb.from('trade_ideas').insert({
      ticker: ticker.toUpperCase(),
      side, entry: parseFloat(entry), sl: parseFloat(sl),
      tp: parseFloat(tp), timeframe, thesis, username,
      tags: tags || [], upvotes: 0, outcome: 'open',
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data })
  }

  if (action === 'vote') {
    const { ideaId, increment } = body
    // Get current upvotes then increment
    const { data: current } = await sb.from('trade_ideas').select('upvotes').eq('id', ideaId).single()
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { data } = await sb.from('trade_ideas')
      .update({ upvotes: current.upvotes + (increment ? 1 : -1) })
      .eq('id', ideaId).select().single()
    return NextResponse.json({ idea: data })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
