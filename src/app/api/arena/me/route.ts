/* ════════════════════════════════════════════════════════════════════════
   The Arena — a human's record.

   GET /api/arena/me   (Bearer JWT) → the signed-in user's picks, full stats
   (overall + this-week record, streak, head-to-head vs BrainStock & Gemini on
   the same bouts) and a freshly-signed share token for the "I beat the AIs"
   card.
   ════════════════════════════════════════════════════════════════════════ */
import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { summarize, buildSharePayload, signShare, type HumanPick, type AIResult } from '@/lib/arena/humans'

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

function weekLabel(nowMs: number): string {
  const fmt = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${fmt(nowMs - 6 * 86400_000)} – ${new Date(nowMs).toLocaleDateString('en-US', { day: 'numeric' })}`
}

export async function GET(req: NextRequest) {
  if (!sb) return NextResponse.json({ available: false })
  const user = await getUser(req)
  if (!user) return NextResponse.json({ available: true, authed: false }, { status: 200 })

  const { data: pickRows } = await sb
    .from('arena_human_picks')
    .select('trade_date, ticker, direction, status, dir_correct, resolve_date, resolved_at, leaf_hash, start_price')
    .eq('user_id', user.id)
    .order('sealed_at', { ascending: false })
    .limit(500)
  const picks = (pickRows ?? []) as HumanPick[]

  // The AIs' results on the exact bouts the user picked — for head-to-head.
  const dates = [...new Set(picks.map((p) => p.trade_date))]
  const tickers = [...new Set(picks.map((p) => p.ticker))]
  let net: AIResult[] = []
  let gem: AIResult[] = []
  if (dates.length && tickers.length) {
    const [{ data: netRows }, { data: gemRows }] = await Promise.all([
      sb.from('arena_calls').select('trade_date, ticker, dir_correct, status').in('trade_date', dates).in('ticker', tickers),
      sb
        .from('arena_opponent_calls')
        .select('trade_date, ticker, dir_correct, status')
        .eq('opponent_id', 'gemini')
        .in('trade_date', dates)
        .in('ticker', tickers),
    ])
    net = (netRows ?? []) as AIResult[]
    gem = (gemRows ?? []) as AIResult[]
  }

  const now = Date.now()
  const stats = summarize(picks, net, gem, now)
  const handle = handleOf(user)
  const token = signShare(buildSharePayload(handle, stats, weekLabel(now), now))

  return NextResponse.json({
    available: true,
    authed: true,
    handle,
    stats,
    picks,
    share: { token, path: `/arena/card/${token}` },
  })
}
