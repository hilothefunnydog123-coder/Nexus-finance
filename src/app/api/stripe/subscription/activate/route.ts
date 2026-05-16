import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const SB_URL     = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_SVC_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
const READY      = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

const SB_READY = SB_URL.startsWith('https://') && SB_SVC_KEY.length > 20
const supabase = SB_READY
  ? createClient(SB_URL, SB_SVC_KEY, { auth: { persistSession: false } })
  : null

const COOKIE_NAME = 'yn-sub-id'
const COOKIE_MAX  = 60 * 60 * 24 * 30 // 30 days

export async function POST(req: NextRequest) {
  // Demo mode — grant access without real Stripe
  if (!READY) {
    const res = NextResponse.json({ active: true, demo: true })
    res.cookies.set(COOKIE_NAME, 'demo', { httpOnly: true, sameSite: 'lax', maxAge: COOKIE_MAX, path: '/' })
    return res
  }

  const { sessionId } = await req.json()
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 300) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_KEY)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'customer'],
    })

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub    = session.subscription as any
    const subId  = sub?.id ?? (typeof session.subscription === 'string' ? session.subscription : '')
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const subAny = sub as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const email  = session.customer_email
      ?? (session.customer_details as any)?.email
      ?? (session.customer as Stripe.Customer | null)?.email
      ?? ''

    // Upsert to Supabase (backup to webhook)
    if (supabase && subId) {
      const customerId = typeof session.customer === 'string' ? session.customer : (session.customer as Stripe.Customer)?.id ?? ''
      await supabase.from('subscriptions').upsert({
        stripe_customer_id:    customerId,
        stripe_subscription_id: subId,
        email,
        status:                'active',
        plan:                  'daily_intel',
        price_cents:           1199,
        current_period_start:  subAny?.current_period_start ? new Date(subAny.current_period_start * 1000).toISOString() : null,
        current_period_end:    subAny?.current_period_end   ? new Date(subAny.current_period_end   * 1000).toISOString() : null,
        cancel_at_period_end:  subAny?.cancel_at_period_end ?? false,
        updated_at:            new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' })
    }

    // Set HttpOnly cookie — browser sends this on every /daily visit
    const res = NextResponse.json({ active: true, subscriptionId: subId, email })
    if (subId) {
      res.cookies.set(COOKIE_NAME, subId, {
        httpOnly: true,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge:   COOKIE_MAX,
        path:     '/',
      })
    }
    return res
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Activation failed'
    console.error('[activation]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
