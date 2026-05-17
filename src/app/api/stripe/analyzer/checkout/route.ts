import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY ?? ''
const STRIPE_READY = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

export async function POST(req: NextRequest) {
  if (!STRIPE_READY) {
    return NextResponse.json({ demo: true, message: 'Stripe not configured' })
  }

  const { email } = await req.json().catch(() => ({ email: '' }))
  const origin     = req.headers.get('origin') ?? 'https://ynfinance.org'
  const stripe     = new Stripe(STRIPE_KEY)

  try {
    const session = await stripe.checkout.sessions.create({
      mode:           'subscription',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: 'YN Finance Pro',
            description: 'Unlimited AI stock analysis · 5-agent research · Candlestick charts · Options plays · Position sizing · Track record',
            images: ['https://ynfinance.org/icon-192.png'],
          },
          unit_amount: 1900,
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      allow_promotion_codes:      true,
      billing_address_collection: 'auto',
      metadata: { plan: 'yn_pro', source: 'analyzer' },
      success_url: `${origin}/ai-stocks?pro=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url:  `${origin}/ai-stocks`,
      subscription_data: { metadata: { plan: 'yn_pro' } },
    })

    return NextResponse.json({ url: session.url })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Checkout failed'
    console.error('[analyzer-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
