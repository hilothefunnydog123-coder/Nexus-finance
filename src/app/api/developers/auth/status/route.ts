import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// GET /api/developers/auth/status
// Shows which services are configured. Visit this URL to diagnose issues.
export async function GET() {
  const supabaseUrl    = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const supabaseAnon   = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseService = process.env.SUPABASE_SERVICE_ROLE_KEY   ?? ''
  const resendKey      = process.env.RESEND_API_KEY               ?? ''
  const emailFrom      = process.env.EMAIL_FROM                   ?? ''

  const isPlaceholder = (v: string) => !v || v.includes('your_') || v.includes('_here')

  const status = {
    supabase_url:     !isPlaceholder(supabaseUrl)     ? '✅ set' : '❌ MISSING — add NEXT_PUBLIC_SUPABASE_URL in Netlify',
    supabase_anon:    !isPlaceholder(supabaseAnon)    ? '✅ set' : '❌ MISSING — add NEXT_PUBLIC_SUPABASE_ANON_KEY in Netlify',
    supabase_service: !isPlaceholder(supabaseService) ? '✅ set' : '❌ MISSING — add SUPABASE_SERVICE_ROLE_KEY in Netlify',
    resend:           !isPlaceholder(resendKey)       ? '✅ set' : '❌ MISSING — add RESEND_API_KEY in Netlify',
    email_from:       emailFrom || '❌ MISSING — add EMAIL_FROM in Netlify',
  }

  // Test Supabase admin connection if keys are present
  let supabaseAdminTest = 'skipped (keys missing)'
  if (!isPlaceholder(supabaseUrl) && !isPlaceholder(supabaseService)) {
    try {
      const sb = createClient(supabaseUrl, supabaseService, { auth: { persistSession: false } })
      const { error } = await sb.auth.admin.listUsers({ page: 1, perPage: 1 })
      supabaseAdminTest = error ? `❌ ${error.message}` : '✅ connected'
    } catch (e) {
      supabaseAdminTest = `❌ ${e instanceof Error ? e.message : String(e)}`
    }
  }

  return NextResponse.json({ status, supabase_admin_test: supabaseAdminTest }, { status: 200 })
}
