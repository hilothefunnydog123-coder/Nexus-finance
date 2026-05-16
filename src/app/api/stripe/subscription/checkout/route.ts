import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

const IP_HITS = new Map<string, number[]>()
function rateLimit(ip: string): boolean {
  const now = Date.now()
  const hits = (IP_HITS.get(ip) || []).filter(t => now - t < 60_000)
  if (hits.length >= 5) return false
  IP_HITS.set(ip, [...hits, now])
  return true
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  if (!STRIPE_ENABLED) {
    return NextResponse.json({ demo: true, message: 'Add your STRIPE_SECRET_KEY and NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY to .env.local to enable payments.' })
  }

  const { email } = await req.json()
  const origin = req.headers.get('origin') || 'https://ynfinance.org'
  const stripe = new Stripe(STRIPE_KEY!)

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email || undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: '📰 YN Daily Intelligence',
            description: 'AI-powered daily market newspaper • Expected moves • Daily bias • Institutional radar • Economic calendar',
            images: [],
          },
          unit_amount: 1199, // $11.99
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      metadata: { plan: 'daily_intel', source: 'ynfinance' },
      success_url: `${origin}/daily?session_id={CHECKOUT_SESSION_ID}&activated=1`,
      cancel_url: `${origin}/daily/subscribe`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    console.error('[subscription-checkout]', err)
    const message = err instanceof Error ? err.message : 'Payment setup failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
