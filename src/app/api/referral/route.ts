import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

// POST /api/referral — track a referral signup
export async function POST(req: NextRequest) {
  if (!SUPABASE_ENABLED) return NextResponse.json({ ok: true, demo: true })

  const { referralCode, newUserId, newUserEmail } = await req.json()
  if (!referralCode || !newUserId) return NextResponse.json({ ok: false })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Find who owns this code
  const { data: referrer } = await sb
    .from('profiles')
    .select('id, username')
    .eq('referral_code', referralCode)
    .single()

  if (!referrer) return NextResponse.json({ ok: false, error: 'Invalid code' })

  // Log the referral
  await sb.from('referrals').insert({
    referrer_id: referrer.id,
    referred_id: newUserId,
    referred_email: newUserEmail,
    code: referralCode,
    status: 'pending',
  })

  return NextResponse.json({ ok: true, referrerUsername: referrer.username })
}

// GET /api/referral?userId=xxx — get referral stats for a user
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get('userId')
  if (!userId || !SUPABASE_ENABLED) return NextResponse.json({ code: null, stats: null })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Get or create referral code for this user
  let { data: profile } = await sb.from('profiles').select('referral_code, username').eq('id', userId).single()

  if (!profile?.referral_code) {
    const code = `${(profile?.username || 'trader').toLowerCase().replace(/\W/g, '')}_${Math.random().toString(36).slice(2, 6)}`
    await sb.from('profiles').update({ referral_code: code }).eq('id', userId)
    profile = { referral_code: code, username: profile?.username }
  }

  const { data: referrals } = await sb.from('referrals').select('status').eq('referrer_id', userId)
  const total = referrals?.length || 0
  const rewarded = referrals?.filter(r => r.status === 'rewarded').length || 0

  return NextResponse.json({
    code: profile?.referral_code,
    link: `https://ynfinance.org/ref/${profile?.referral_code}`,
    stats: { total, rewarded, pending: total - rewarded }
  })
}
