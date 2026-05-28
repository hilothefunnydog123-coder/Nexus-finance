import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { TIER_LIMITS } from '@/lib/apiKeys'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── GET /api/v1/keys/my — fetch the authenticated user's API key stats ─────────
// Requires: Authorization: Bearer <supabase_access_token>
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401, headers: CORS })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user?.email) {
    return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401, headers: CORS })
  }

  const { data } = await sb
    .from('api_keys')
    .select('id, key_prefix, tier, name, calls_month, calls_total, is_active, created_at, last_used_at, stripe_subscription_id')
    .eq('user_email', user.email)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!data) {
    return NextResponse.json({ key: null }, { headers: CORS })
  }

  return NextResponse.json({
    key_prefix:       data.key_prefix,
    tier:             data.tier,
    name:             data.name,
    calls_month:      data.calls_month,
    limit_month:      TIER_LIMITS[data.tier] ?? 100,
    calls_total:      data.calls_total,
    is_active:        data.is_active,
    created_at:       data.created_at,
    last_used_at:     data.last_used_at,
    has_subscription: !!data.stripe_subscription_id,
  }, { headers: CORS })
}
