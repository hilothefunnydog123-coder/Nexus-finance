import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/brain/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Ingest a batch of behavior events. Cookieless; vid is a random localStorage id.
// No DB configured → 204 no-op (the client tracker still runs locally).
export async function POST(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return new NextResponse(null, { status: 204 })
  try {
    const body = await req.json()
    const vid = String(body?.vid || '').slice(0, 64)
    if (!vid) return new NextResponse(null, { status: 204 })
    const uid = typeof body?.uid === 'string' ? body.uid.slice(0, 64) : null
    const sid = typeof body?.sid === 'string' ? body.sid.slice(0, 64) : null
    const raw = Array.isArray(body?.events) ? body.events.slice(0, 50) : []
    const ALLOWED = new Set(['pageview', 'click', 'dwell', 'scroll', 'ticker', 'convert', 'impression'])
    const rows = raw
      .filter((e: { type?: string }) => e && ALLOWED.has(String(e.type)))
      .map((e: { type: string; path?: string; target?: string; value?: number; meta?: unknown }) => ({
        vid, uid, sid,
        type: String(e.type),
        path: e.path ? String(e.path).slice(0, 200) : null,
        target: e.target ? String(e.target).slice(0, 80) : null,
        value: typeof e.value === 'number' && isFinite(e.value) ? e.value : null,
        meta: e.meta && typeof e.meta === 'object' ? e.meta : null,
      }))
    if (rows.length) await admin.from('behavior_events').insert(rows)

    // Bandit rollup for home-frame impressions/clicks (best-effort).
    for (const r of rows) {
      const surface = (r.meta as { surface?: string } | null)?.surface
      if (surface === 'home_frames' && r.target && (r.type === 'impression' || r.type === 'click')) {
        await admin.rpc('brain_bump_arm', {
          p_surface: 'home_frames', p_arm: r.target, p_seg: 'all',
          p_imp: r.type === 'impression' ? 1 : 0, p_clk: r.type === 'click' ? 1 : 0,
        }).then(() => {}, () => {})
      }
    }
  } catch { /* swallow */ }
  return new NextResponse(null, { status: 204 })
}
