import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const DEMO_MODE  = !STRIPE_KEY || STRIPE_KEY.includes('your_key') || STRIPE_KEY.includes('sk_test_your')

const SB_READY = SB_URL.startsWith('https://') && SB_SVC_KEY.length > 20
const supabase = SB_READY
  ? createClient(SB_URL, SB_SVC_KEY, { auth: { persistSession: false } })
  : null

export async function GET(req: NextRequest) {
  // If Stripe not configured, grant full access in demo mode
  if (DEMO_MODE) {
    return NextResponse.json({ active: true, demo: true })
  }

  const subId = req.cookies.get('yn-sub-id')?.value

  // No cookie — not subscribed
  if (!subId) return NextResponse.json({ active: false })

  // Demo cookie
  if (subId === 'demo') return NextResponse.json({ active: true, demo: true })

  // Check Supabase (primary source — kept up to date by webhook)
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('status, current_period_end, cancel_at_period_end')
        .eq('stripe_subscription_id', subId)
        .single()

      if (error || !data) return NextResponse.json({ active: false })

      const active = data.status === 'active' || data.status === 'trialing'
      const expired = data.current_period_end
        ? new Date(data.current_period_end) < new Date()
        : false

      return NextResponse.json({
        active:             active && !expired,
        status:             data.status,
        cancelAtPeriodEnd:  data.cancel_at_period_end,
        currentPeriodEnd:   data.current_period_end,
      })
    } catch {
      // Supabase error — fall through to allow access (fail open for UX)
      return NextResponse.json({ active: true, fallback: true })
    }
  }

  // Supabase not configured — verify directly with Stripe
  try {
    const Stripe = (await import('stripe')).default
    const stripe = new Stripe(STRIPE_KEY)
    const sub    = await stripe.subscriptions.retrieve(subId)
    const active = sub.status === 'active' || sub.status === 'trialing'
    return NextResponse.json({ active, status: sub.status })
  } catch {
    return NextResponse.json({ active: false })
  }
}
