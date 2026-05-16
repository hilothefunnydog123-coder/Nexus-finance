import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

export async function POST(req: NextRequest) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json({ active: true, demo: true })
  }

  const { customerId, subscriptionId } = await req.json()
  if (!customerId && !subscriptionId) {
    return NextResponse.json({ active: false })
  }

  const stripe = new Stripe(STRIPE_KEY!)

  try {
    // Check by subscription ID (most reliable)
    if (subscriptionId && typeof subscriptionId === 'string' && subscriptionId.startsWith('sub_')) {
      const sub = await stripe.subscriptions.retrieve(subscriptionId)
      const active = sub.status === 'active' || sub.status === 'trialing'
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const end = (sub as any).current_period_end as number | undefined
      const periodEnd = active && end ? new Date(end * 1000).toISOString() : null
      return NextResponse.json({ active, periodEnd, status: sub.status })
    }

    // Fallback: check by customer ID
    if (customerId && typeof customerId === 'string' && customerId.startsWith('cus_')) {
      const subs = await stripe.subscriptions.list({ customer: customerId, status: 'active', limit: 1 })
      if (subs.data.length > 0) {
        const sub = subs.data[0]
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const end = (sub as any).current_period_end as number | undefined
        return NextResponse.json({
          active: true,
          periodEnd: end ? new Date(end * 1000).toISOString() : null,
          status: sub.status,
        })
      }
      // Check trialing too
      const trialing = await stripe.subscriptions.list({ customer: customerId, status: 'trialing', limit: 1 })
      if (trialing.data.length > 0) {
        return NextResponse.json({ active: true, status: 'trialing' })
      }
    }

    return NextResponse.json({ active: false })
  } catch (err: unknown) {
    console.error('[subscription-status]', err)
    // On Stripe error, don't lock user out — re-verify next time
    return NextResponse.json({ active: false, error: 'Could not verify' })
  }
}
