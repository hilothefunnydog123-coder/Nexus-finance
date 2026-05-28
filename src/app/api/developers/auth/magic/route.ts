import { NextRequest, NextResponse } from 'next/server'
import { createClient }          from '@supabase/supabase-js'
import { sendApiMagicLinkEmail } from '@/lib/email'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const email = String(body.email ?? '').trim().toLowerCase()
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: CORS })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY    ?? ''

  if (!supabaseUrl || supabaseUrl.includes('your_') || !serviceKey || serviceKey.includes('your_')) {
    return NextResponse.json(
      { error: 'Server not configured. Ask the site admin to set SUPABASE_SERVICE_ROLE_KEY in Netlify.' },
      { status: 500, headers: CORS }
    )
  }

  const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })

  const host     = req.headers.get('host') ?? 'ynfinance.org'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const redirectTo = `${protocol}://${host}/developers`

  // If user already exists but has unconfirmed email, confirm them now
  // so the magic link actually works after clicking.
  try {
    const { data: existing } = await sb.auth.admin.listUsers()
    const found = existing?.users?.find(u => u.email === email)
    if (found && !found.email_confirmed_at) {
      await sb.auth.admin.updateUserById(found.id, { email_confirm: true })
    }
  } catch { /* non-blocking */ }

  // Generate the real Supabase magic link server-side
  const { data, error } = await sb.auth.admin.generateLink({
    type:    'magiclink',
    email,
    options: { redirectTo },
  })

  if (error || !data?.properties?.action_link) {
    console.error('[magic] generateLink failed:', error?.message)
    return NextResponse.json(
      { error: `Could not generate sign-in link: ${error?.message ?? 'unknown error'}` },
      { status: 500, headers: CORS }
    )
  }

  const magicLink = data.properties.action_link

  // Track in developer_signups
  sb.from('developer_signups')
    .upsert({ email, last_magic_link_at: new Date().toISOString() }, { onConflict: 'email' })
    .then(() => {}, () => {})

  // Send via Resend — if it fails, return the error so the page can show it
  const resendKey = process.env.RESEND_API_KEY ?? ''
  if (!resendKey || resendKey.includes('your_')) {
    // Resend not configured — return the link directly so we don't block the user
    console.error('[magic] RESEND_API_KEY not set in environment')
    return NextResponse.json(
      { error: 'Email service not configured (RESEND_API_KEY missing). Contact the site admin.' },
      { status: 500, headers: CORS }
    )
  }

  try {
    await sendApiMagicLinkEmail(email, magicLink)
  } catch (emailErr) {
    console.error('[magic] Resend send failed:', emailErr)
    return NextResponse.json(
      { error: `Email failed to send: ${emailErr instanceof Error ? emailErr.message : String(emailErr)}` },
      { status: 500, headers: CORS }
    )
  }

  return NextResponse.json({ sent: true }, { headers: CORS })
}
