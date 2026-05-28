import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { sendApiSignupConfirmationEmail } from '@/lib/email'

const CORS = {
  'Access-Control-Allow-Origin': '*',
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

  const email    = String(body.email    ?? '').trim().toLowerCase()
  const password = String(body.password ?? '').trim()

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: CORS })
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400, headers: CORS })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  // Admin API creates user with email already confirmed — no Supabase email sent,
  // we send our own via Resend so user can sign in immediately.
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (error) {
    const msg = error.message.toLowerCase()
    if (msg.includes('already') || msg.includes('exist') || error.status === 422) {
      return NextResponse.json(
        { error: 'Account already exists — sign in instead.' },
        { status: 409, headers: CORS }
      )
    }
    return NextResponse.json({ error: error.message }, { status: 400, headers: CORS })
  }

  if (data.user) {
    sb.from('developer_signups')
      .upsert({ email, user_id: data.user.id }, { onConflict: 'email' })
      .then(() => {}, () => {})
  }

  sendApiSignupConfirmationEmail(email).catch(() => {})

  return NextResponse.json({ created: true }, { headers: CORS })
}
