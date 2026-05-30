import { NextRequest, NextResponse } from 'next/server'
import { createApiKey, extractKey, validateApiKey, TIER_LIMITS } from '@/lib/apiKeys'
import { createClient } from '@supabase/supabase-js'
import { sendApiKeyClaimedEmail } from '@/lib/email'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )
}

// ── POST /api/v1/keys — claim a free API key (requires Supabase auth) ─────────
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return NextResponse.json(
      { error: 'Sign in at ynfinance.org/developers to generate an API key.' },
      { status: 401, headers: CORS }
    )
  }

  const sb = getServiceClient()

  // Verify Supabase JWT and get the user
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user?.email) {
    return NextResponse.json(
      { error: 'Invalid or expired session. Please sign in again.' },
      { status: 401, headers: CORS }
    )
  }

  // Parse optional name from body
  let name = 'My App'
  try {
    const body = await req.json()
    if (body?.name) name = String(body.name).trim().slice(0, 64)
  } catch { /* body is optional */ }

  // Check if user already has an active key
  const { data: existing } = await sb
    .from('api_keys')
    .select('key_prefix, tier, calls_month, calls_total, created_at, last_used_at, stripe_subscription_id')
    .eq('user_email', user.email)
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (existing) {
    // Return key dashboard data so the client can show the dashboard without a second fetch
    return NextResponse.json({
      already_exists:  true,
      key_prefix:      existing.key_prefix,
      tier:            existing.tier,
      calls_month:     existing.calls_month    ?? 0,
      calls_total:     existing.calls_total    ?? 0,
      limit_month:     TIER_LIMITS[existing.tier] ?? 100,
      created_at:      existing.created_at,
      last_used_at:    existing.last_used_at,
      has_subscription: !!existing.stripe_subscription_id,
    }, { status: 409, headers: CORS })
  }

  try {
    const { raw, prefix, id } = await createApiKey({
      email:  user.email,
      userId: user.id,
      name,
      tier:   'free',
    })

    // Send branded confirmation email via Resend (non-blocking)
    sendApiKeyClaimedEmail(user.email, prefix, 'free').catch(() => {})

    // Track in developer_signups (non-blocking)
    sb.from('developer_signups')
      .upsert({ email: user.email, user_id: user.id, tier: 'free', key_prefix: prefix }, { onConflict: 'email' })
      .then(() => {}, () => {})

    return NextResponse.json({
      source:    'ynfinance-api',
      version:   '1.0',
      timestamp: new Date().toISOString(),
      message:   'API key created. Copy it now — this is the only time it will be shown.',
      key:       raw,
      prefix,
      id,
      tier:      'free',
      limit:     TIER_LIMITS.free,
      docs:      'https://ynfinance.org/developers',
    }, { status: 201, headers: CORS })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { error: 'You already have an API key. Check your dashboard above.' },
        { status: 409, headers: CORS }
      )
    }
    return NextResponse.json({ error: msg }, { status: 500, headers: CORS })
  }
}

// ── GET /api/v1/keys — check usage for a given API key ────────────────────────
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

  try {
    const sb = getServiceClient()
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
