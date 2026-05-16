import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

export async function POST(req: NextRequest) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json({ demo: true, active: true, message: 'Demo mode' })
  }

  const { sessionId } = await req.json()
  if (!sessionId || typeof sessionId !== 'string' || sessionId.length > 200) {
    return NextResponse.json({ error: 'Invalid session' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_KEY!)

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    })

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return NextResponse.json({ error: 'Payment not completed' }, { status: 402 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sub = session.subscription as any
    const periodEnd = sub?.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    return NextResponse.json({
      active: true,
      customerId: session.customer as string,
      subscriptionId: sub?.id || '',
      email: session.customer_email || session.customer_details?.email || '',
      currentPeriodEnd: periodEnd,
      plan: 'daily_intel',
    })
  } catch (err: unknown) {
    console.error('[subscription-activate]', err)
    const message = err instanceof Error ? err.message : 'Activation failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
