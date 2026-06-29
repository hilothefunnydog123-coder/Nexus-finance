/* ════════════════════════════════════════════════════════════════════════
   The Arena — a human picks a side.

   POST /api/arena/pick  { trade_date, ticker, direction }   (Bearer JWT)
     Locks the signed-in user's side on a LIVE sealed bout. The pick is sealed
     at pick time (callLeaf) so it can't be backdated, then graded by the same
     loop as the models. One locked pick per bout — no changing your mind.
   GET  /api/arena/pick?trade_date=&ticker=                    (Bearer JWT)
     The user's pick(s) for a day / ticker (so the UI shows their locked side).
   ════════════════════════════════════════════════════════════════════════ */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { callLeaf, type SealedCallCore } from '@/lib/arena/seal'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const sb: SupabaseClient | null =
  SB_URL.startsWith('https://') && SB_KEY.length > 20 ? createClient(SB_URL, SB_KEY, { auth: { persistSession: false } }) : null

async function getUser(req: NextRequest): Promise<User | null> {
  if (!sb) return null
  const auth = req.headers.get('authorization') || ''
  const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : ''
  if (!token) return null
  try {
    const { data, error } = await sb.auth.getUser(token)
    return error ? null : data.user ?? null
  } catch {
    return null
  }
}

function handleOf(user: User): string {
  const meta = (user.user_metadata ?? {}) as { first_name?: string; name?: string }
  const raw = meta.first_name || meta.name || user.email?.split('@')[0] || 'A human'
  return String(raw).slice(0, 24)
}

function etDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
}

export async function POST(req: NextRequest) {
  if (!sb) return NextResponse.json({ error: 'Arena not configured' }, { status: 503 })
  const user = await getUser(req)
  if (!user) return NextResponse.json({ error: 'Sign in to enter the Arena' }, { status: 401 })

  const body = (await req.json().catch(() => ({}))) as { trade_date?: string; ticker?: string; direction?: string }
  const trade_date = String(body.trade_date ?? '')
  const ticker = String(body.ticker ?? '').toUpperCase()
  const direction = body.direction === 'up' || body.direction === 'down' ? body.direction : null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trade_date) || !ticker || !direction) {
    return NextResponse.json({ error: 'Need trade_date, ticker and a direction (up/down)' }, { status: 400 })
  }

  // The bout must exist and still be live (sealed, not yet resolved).
  const { data: call } = await sb
    .from('arena_calls')
    .select('start_price, horizon, resolve_date, status')
    .eq('trade_date', trade_date)
    .eq('ticker', ticker)
    .maybeSingle()
  if (!call) return NextResponse.json({ error: 'No such sealed bout' }, { status: 404 })
  if (call.status !== 'sealed' || call.resolve_date < etDate()) {
    return NextResponse.json({ error: 'That bout has already locked — pick a live one' }, { status: 409 })
  }

  // One pick per bout.
  const { data: existing } = await sb
    .from('arena_human_picks')
    .select('id, direction, status')
    .eq('user_id', user.id)
    .eq('trade_date', trade_date)
    .eq('ticker', ticker)
    .maybeSingle()
  if (existing) {
    return NextResponse.json({ error: 'already_picked', pick: existing }, { status: 409 })
  }

  const start_price = Number(call.start_price)
  const horizon = call.horizon ?? 5
  const sealed_at = new Date().toISOString()
  // Seal the human pick the same way as a model call (direction is the claim).
  const core: SealedCallCore = {
    trade_date,
    ticker,
    direction,
    start_price: +start_price.toFixed(4),
    target: +start_price.toFixed(4),
    horizon,
    resolve_date: call.resolve_date,
    sealed_at,
  }
  const leaf_hash = callLeaf(core)

  const row = {
    user_id: user.id,
    handle: handleOf(user),
    trade_date,
    ticker,
    direction,
    start_price,
    horizon,
    resolve_date: call.resolve_date,
    sealed_at,
    leaf_hash,
    status: 'sealed',
  }
  const { error } = await sb.from('arena_human_picks').insert(row)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, pick: { trade_date, ticker, direction, leaf_hash, sealed_at, status: 'sealed', resolve_date: call.resolve_date } })
}

export async function GET(req: NextRequest) {
  if (!sb) return NextResponse.json({ available: false, picks: [] })
  const user = await getUser(req)
  if (!user) return NextResponse.json({ available: true, authed: false, picks: [] })

  const url = new URL(req.url)
  const trade_date = url.searchParams.get('trade_date')
  const ticker = url.searchParams.get('ticker')?.toUpperCase()

  let q = sb
    .from('arena_human_picks')
    .select('trade_date, ticker, direction, status, dir_correct, leaf_hash, sealed_at, resolve_date, start_price')
    .eq('user_id', user.id)
  if (trade_date) q = q.eq('trade_date', trade_date)
  if (ticker) q = q.eq('ticker', ticker)
  const { data } = await q.order('sealed_at', { ascending: false }).limit(200)

  return NextResponse.json({ available: true, authed: true, picks: data ?? [] })
}
