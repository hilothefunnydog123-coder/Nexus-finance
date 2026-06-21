import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!URL.startsWith('http') || !SERVICE) return null
  try { return createClient(URL, SERVICE) } catch { return null }
}

// Record a pageview (cookieless, no PII).
export async function POST(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return new NextResponse(null, { status: 204 })
  try {
    const { path, ref } = await req.json()
    const p = String(path || '').slice(0, 200)
    if (!p.startsWith('/')) return new NextResponse(null, { status: 204 })
    await admin.from('pageviews').insert({ path: p, ref: String(ref || '').slice(0, 300) || null })
  } catch { /* swallow */ }
  return new NextResponse(null, { status: 204 })
}

// Lightweight dashboard: total + top paths over the last N days.
export async function GET(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false })
  const days = Math.min(90, Math.max(1, Number(new URL(req.url).searchParams.get('days')) || 7))
  const since = new Date(Date.now() - days * 86400_000).toISOString()
  try {
    const { count: total } = await admin.from('pageviews').select('*', { count: 'exact', head: true }).gte('ts', since)
    const { data } = await admin.from('pageviews').select('path').gte('ts', since).limit(5000)
    const tally = new Map<string, number>()
    for (const r of data || []) tally.set(r.path, (tally.get(r.path) || 0) + 1)
    const top = [...tally.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([path, views]) => ({ path, views }))
    return NextResponse.json({ ready: true, days, total: total ?? 0, top }, { headers: { 'Cache-Control': 's-maxage=120' } })
  } catch {
    return NextResponse.json({ ready: false })
  }
}
