import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { challengeStartedEmail, challengePassedEmail, payoutRequestEmail } from '@/lib/email-templates'

const SUPABASE_ENABLED = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'your_supabase_url_here'
)

function getSupabase(authHeader?: string) {
  if (!SUPABASE_ENABLED) return null
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authHeader ? { global: { headers: { Authorization: authHeader } } } : {}
  )
}

const resend = process.env.RESEND_API_KEY && process.env.RESEND_API_KEY !== 'your_resend_api_key_here'
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM = process.env.EMAIL_FROM || 'YN Finance <noreply@ynfinance.org>'

async function sendEmail(to: string, { subject, html }: { subject: string; html: string }) {
  if (!resend) return { success: false, error: 'Email not configured' }
  try {
    await resend.emails.send({ from: FROM, to, subject, html })
    return { success: true }
  } catch (e) {
    console.error('Email send error:', e)
    return { success: false }
  }
}

// GET — fetch user's active challenge
export async function GET(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const sb = getSupabase(auth || undefined)
  if (!sb) return NextResponse.json({ challenge: null, demo: true })

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ challenge: null, error: 'Not authenticated' }, { status: 401 })

  const { data } = await sb
    .from('challenges')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return NextResponse.json({ challenge: data || null })
}

// POST — create/update/payout challenge
export async function POST(req: NextRequest) {
  const auth = req.headers.get('Authorization')
  const sb = getSupabase(auth || undefined)
  if (!sb) return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 })

  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const body = await req.json()
  const { action } = body

  // Get user profile
  const { data: profile } = await sb.from('profiles').select('*').eq('id', user.id).single()
  const username = profile?.username || user.email?.split('@')[0] || 'Trader'
  const email = user.email!

  // ── START challenge ──
  if (action === 'start') {
    const { tier, accountSize, profitTarget, maxDrawdown, dailyLoss, minTradingDays, maxDays } = body

    // Check if already has active challenge
    const { data: existing } = await sb
      .from('challenges')
      .select('id, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()

    if (existing) return NextResponse.json({ error: 'You already have an active challenge' }, { status: 400 })

    const { data: challenge, error } = await sb.from('challenges').insert({
      user_id: user.id,
      email,
      username,
      tier,
      account_size: accountSize,
      profit_target: profitTarget,
      max_drawdown: maxDrawdown,
      daily_loss_limit: dailyLoss,
      min_trading_days: minTradingDays,
      max_days: maxDays,
      status: 'active',
      current_pnl_pct: 0,
      current_drawdown: 0,
      trading_days: 0,
    }).select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Send welcome email
    await sendEmail(email, challengeStartedEmail({
      username, email, tier, accountSize, profitTarget, maxDrawdown, dailyLoss, maxDays,
    }))

    return NextResponse.json({ challenge, emailSent: !!resend })
  }

  // ── UPDATE progress ──
  if (action === 'update') {
    const { challengeId, currentPnLPct, currentDrawdown, tradingDays } = body

    const { data: challenge } = await sb.from('challenges').select('*').eq('id', challengeId).single()
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

    // Check if challenge is now passed
    const isPassed = currentPnLPct >= challenge.profit_target && tradingDays >= challenge.min_trading_days
    // Check if failed
    const isFailed = currentDrawdown >= challenge.max_drawdown

    const updates: Record<string, unknown> = {
      current_pnl_pct: currentPnLPct,
      current_drawdown: currentDrawdown,
      trading_days: tradingDays,
      updated_at: new Date().toISOString(),
    }

    if (isPassed && challenge.status === 'active') {
      updates.status = 'passed'
      updates.passed_at = new Date().toISOString()

      await sendEmail(email, challengePassedEmail({
        username,
        tier: challenge.tier,
        accountSize: challenge.account_size,
        finalPnLPct: currentPnLPct,
        tradingDays,
      }))
    }

    if (isFailed && challenge.status === 'active') {
      updates.status = 'failed'
      updates.failed_at = new Date().toISOString()
    }

    const { data: updated } = await sb.from('challenges').update(updates).eq('id', challengeId).select().single()
    return NextResponse.json({ challenge: updated, passed: isPassed, failed: isFailed })
  }

  // ── REQUEST PAYOUT ──
  if (action === 'payout') {
    const { challengeId } = body

    const { data: challenge } = await sb.from('challenges').select('*').eq('id', challengeId).single()
    if (!challenge) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    if (challenge.status !== 'passed') return NextResponse.json({ error: 'Challenge not passed yet' }, { status: 400 })

    const { data: updated } = await sb.from('challenges').update({
      status: 'payout_requested',
      payout_requested_at: new Date().toISOString(),
    }).eq('id', challengeId).select().single()

    await sendEmail(email, payoutRequestEmail({
      username,
      email,
      tier: challenge.tier,
      accountSize: challenge.account_size,
      finalPnLPct: challenge.current_pnl_pct,
    }))

    return NextResponse.json({ challenge: updated, emailSent: !!resend })
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
}
