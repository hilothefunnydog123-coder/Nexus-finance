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

  const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').replace(/\/$/, '')
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server not configured' }, { status: 500, headers: CORS })
  }

  // Call Supabase GoTrue admin API directly — bypasses SDK path issues.
  // email_confirm:true means the user can sign in immediately, no confirmation email from Supabase.
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method:  'POST',
    headers: {
      'Content-Type':  'application/json',
      'apikey':        serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
    },
    body: JSON.stringify({ email, password, email_confirm: true }),
  })

  const data = await res.json()

  if (!res.ok) {
    const msg: string = data?.msg ?? data?.message ?? data?.error_description ?? 'Sign up failed'
    if (res.status === 422 || msg.toLowerCase().includes('already') || msg.toLowerCase().includes('exist')) {
      return NextResponse.json(
        { error: 'Account already exists — sign in instead.' },
        { status: 409, headers: CORS }
      )
    }
    return NextResponse.json({ error: msg }, { status: res.status, headers: CORS })
  }

  const userId: string = data?.id ?? ''

  // Track in developer_signups (best-effort)
  if (userId) {
    const sb = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } })
    sb.from('developer_signups')
      .upsert({ email, user_id: userId }, { onConflict: 'email' })
      .then(() => {}, () => {})
  }

  // Send branded welcome email via Resend
  sendApiSignupConfirmationEmail(email).catch(() => {})

  return NextResponse.json({ created: true }, { headers: CORS })
}
