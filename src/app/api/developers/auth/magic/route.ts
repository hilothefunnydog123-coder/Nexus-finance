import { NextRequest, NextResponse } from 'next/server'
import { createClient }              from '@supabase/supabase-js'
import { sendApiMagicLinkEmail }     from '@/lib/email'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// POST /api/developers/auth/magic
// Body: { email }
// Generates a Supabase magic link via admin API, sends it through Resend.
// Supabase handles the session — we just own the email design.
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: CORS })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Auth not configured' }, { status: 500, headers: CORS })
  }

  const sb = createClient(url, key, { auth: { persistSession: false } })

  const host     = req.headers.get('host') ?? 'ynfinance.org'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'

  // Generate the real Supabase magic link server-side
  const { data, error } = await sb.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { redirectTo: `${protocol}://${host}/developers` },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[magic] generateLink failed:', error?.message)
    return NextResponse.json(
      { error: 'Could not generate sign-in link. Please try again.' },
      { status: 500, headers: CORS }
    )
  }

  const magicLink = data.properties.action_link

  // Track signup/login in developer_signups table (upsert by email)
  await sb
    .from('developer_signups')
    .upsert({ email, last_magic_link_at: new Date().toISOString() }, { onConflict: 'email' })
    .then(() => {}, () => {})   // non-blocking, best-effort

  // Send branded email via Resend
  await sendApiMagicLinkEmail(email, magicLink)

  return NextResponse.json({ sent: true }, { headers: CORS })
}
