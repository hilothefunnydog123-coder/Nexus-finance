import { NextRequest, NextResponse } from 'next/server'
import { createApiKey, extractKey, validateApiKey, TIER_LIMITS } from '@/lib/apiKeys'
import { createClient } from '@supabase/supabase-js'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── POST /api/v1/keys — generate a new free API key ───────────────────────────
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  const name  = String(body.name  ?? 'My App').trim().slice(0, 64)

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: CORS })
  }

  try {
    const { raw, prefix, id } = await createApiKey({ email, name, tier: 'free' })

    return NextResponse.json({
      source:    'ynfinance-api',
      version:   '1.0',
      timestamp: new Date().toISOString(),
      message:   'API key created. Copy it now — this is the only time it will be shown.',
      key:       raw,       // ← shown ONCE
      prefix,               // ← for display after this (yn_live_a1b2c3d4...)
      id,
      tier:      'free',
      limit:     TIER_LIMITS.free,
      docs:      'https://ynfinance.org/developers',
    }, { status: 201, headers: CORS })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    // If email already has a key, give a helpful message
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'An API key for this email already exists. Email api@ynfinance.org to retrieve or rotate it.' },
        { status: 409, headers: CORS }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS })
  }
}

// ── GET /api/v1/keys — check your own key usage ───────────────────────────────
export async function GET(req: NextRequest) {
  const raw = extractKey(req.headers)
  if (!raw) {
    return NextResponse.json(
      { error: 'Provide your key via Authorization: Bearer yn_live_xxxx' },
      { status: 401, headers: CORS }
    )
  }

  const result = await validateApiKey(raw)
  if (!result) {
    return NextResponse.json({ error: 'Invalid or expired API key' }, { status: 401, headers: CORS })
  }

  // Fetch current usage stats
  try {
    const sb = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data } = await sb
      .from('api_keys')
      .select('key_prefix, tier, name, calls_month, calls_total, created_at, last_used_at')
      .eq('id', result.id)
      .single()

    const limit = TIER_LIMITS[result.tier] ?? 100

    return NextResponse.json({
      source:       'ynfinance-api',
      version:      '1.0',
      timestamp:    new Date().toISOString(),
      key_prefix:   data?.key_prefix,
      name:         data?.name,
      tier:         result.tier,
      calls_month:  data?.calls_month ?? 0,
      limit_month:  limit,
      calls_total:  data?.calls_total ?? 0,
      created_at:   data?.created_at,
      last_used_at: data?.last_used_at,
    }, { headers: CORS })
  } catch {
    return NextResponse.json({ error: 'Could not fetch usage' }, { status: 500, headers: CORS })
  }
}
