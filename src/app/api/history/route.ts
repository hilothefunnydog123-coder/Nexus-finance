import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ════════════════════════════════════════════════════════════════════════
   /api/history — a signed-in user's saved forecasts & analyses.

   Auth: the caller passes their Supabase access token as a Bearer header.
   We validate it with the service-role client (sb.auth.getUser(jwt)) to
   resolve the user, then read/write rows scoped to that user_id.

   Degrades gracefully (no error, empty data) when Supabase isn't configured.
   ════════════════════════════════════════════════════════════════════════ */

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const sb = SB_URL.startsWith('https://') && SB_KEY.length > 20
  ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } })
  : null

async function getUserId(req: NextRequest): Promise<string | null> {
  if (!sb) return null
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null
  try {
    const { data, error } = await sb.auth.getUser(token)
    if (error) return null
    return data.user?.id ?? null
  } catch { return null }
}

const num = (v: unknown): number | null => {
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

// POST — save one forecast/analysis to the caller's history.
export async function POST(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ ok: true, demo: true })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const kind = body.kind === 'forecast' ? 'forecast' : 'analysis'
    const ticker = typeof body.ticker === 'string' ? body.ticker.toUpperCase().slice(0, 12) : null

    // Light de-dupe: skip if an identical kind+ticker was saved in the last 60s.
    if (ticker) {
      const since = new Date(Date.now() - 60_000).toISOString()
      const { data: recent } = await sb
        .from('user_history').select('id')
        .eq('user_id', userId).eq('kind', kind).eq('ticker', ticker)
        .gte('created_at', since).limit(1)
      if (recent && recent.length) return NextResponse.json({ ok: true, deduped: true })
    }

    const { data, error } = await sb.from('user_history').insert({
      user_id:    userId,
      kind,
      ticker,
      title:      typeof body.title === 'string' ? body.title.slice(0, 200) : null,
      summary:    typeof body.summary === 'string' ? body.summary.slice(0, 600) : null,
      rating:     typeof body.rating === 'string' ? body.rating.slice(0, 40) : null,
      confidence: num(body.confidence),
      price:      num(body.price),
      target:     num(body.target),
      pct:        num(body.pct),
      payload:    body.payload && typeof body.payload === 'object' ? body.payload : {},
    }).select('id, created_at').single()

    if (error) throw error
    return NextResponse.json({ ok: true, id: data?.id, created_at: data?.created_at })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// GET — the caller's saved history, newest first.
export async function GET(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ items: [], demo: true })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const url = new URL(req.url)
    const kind = url.searchParams.get('kind')
    let q = sb.from('user_history').select('*').eq('user_id', userId)
      .order('created_at', { ascending: false }).limit(200)
    if (kind === 'analysis' || kind === 'forecast') q = q.eq('kind', kind)

    const { data, error } = await q
    if (error) throw error
    return NextResponse.json({ items: data ?? [] })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

// DELETE — remove one of the caller's items (?id=...).
export async function DELETE(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ ok: true, demo: true })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })

    const { error } = await sb.from('user_history').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
