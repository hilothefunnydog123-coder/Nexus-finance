import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ════════════════════════════════════════════════════════════════════════
   /api/forks — a signed-in user's saved BrainStock fork presets.
   Auth via the caller's Supabase access token (Bearer). Degrades to empty
   when Supabase isn't configured.
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
  try { const { data, error } = await sb.auth.getUser(token); return error ? null : data.user?.id ?? null } catch { return null }
}

export async function GET(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ forks: [] })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const { data, error } = await sb.from('brain_forks').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)
    if (error) throw error
    return NextResponse.json({ forks: data ?? [] })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ ok: true, demo: true })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const body = await req.json().catch(() => ({}))
    const name = typeof body.name === 'string' && body.name.trim() ? body.name.trim().slice(0, 60) : 'My Fork'
    const weights = Array.isArray(body.weights) ? body.weights.slice(0, 11).map((x: unknown) => Number(x) || 1) : []
    const conviction = Number(body.conviction) || 1
    const { data, error } = await sb.from('brain_forks').insert({ user_id: userId, name, weights, conviction }).select('id').single()
    if (error) throw error
    return NextResponse.json({ ok: true, id: data?.id })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}

export async function DELETE(req: NextRequest) {
  try {
    if (!sb) return NextResponse.json({ ok: true })
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    const id = new URL(req.url).searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'missing id' }, { status: 400 })
    const { error } = await sb.from('brain_forks').delete().eq('id', id).eq('user_id', userId)
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (e) { return NextResponse.json({ error: String(e) }, { status: 500 }) }
}
