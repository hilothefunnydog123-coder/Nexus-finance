import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY ?? ''
const PRICE_ID     = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID ?? ''
const STRIPE_READY = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

const IP_HITS = new Map<string, number[]>()
function rateLimit(ip: string): boolean {
  const now  = Date.now()
  const hits = (IP_HITS.get(ip) ?? []).filter(t => now - t < 60_000)
  if (hits.length >= 5) return false
  IP_HITS.set(ip, [...hits, now])
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  if (!STRIPE_READY) {
    return NextResponse.json({
      demo: true,
      message: 'Add STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to your .env file to enable payments.',
    })
  }

  const { email } = await req.json()
  const origin    = req.headers.get('origin') ?? 'https://ynfinance.org'
  const stripe    = new Stripe(STRIPE_KEY)

  try {
    // Use pre-created price if available, otherwise build inline price
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lineItem: any = PRICE_ID
      ? { price: PRICE_ID, quantity: 1 }
      : {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'YN Daily Intelligence',
              description: 'AI-powered daily newspaper · Expected moves · Daily bias · Institutional radar · Economic calendar',
            },
            unit_amount: 1199,
            recurring: { interval: 'month' },
          },
          quantity: 1,
        }

    const session = await stripe.checkout.sessions.create({
      mode:               'subscription',
      customer_email:     email || undefined,
      line_items:         [lineItem],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata:           { plan: 'daily_intel', source: 'ynfinance' },
      success_url:        `${origin}/daily?session_id={CHECKOUT_SESSION_ID}&activated=1`,
      cancel_url:         `${origin}/daily/subscribe`,
      subscription_data:  { metadata: { plan: 'daily_intel' } },
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[subscription-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
