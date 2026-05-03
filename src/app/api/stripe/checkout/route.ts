import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && STRIPE_KEY !== 'sk_test_your_key_here')

const TIER_PRICES: Record<string, { name: string; price: number; accountSize: number }> = {
  starter: { name: 'YN Capital Starter Challenge',  price: 4900,  accountSize: 25_000  },
  pro:     { name: 'YN Capital Pro Challenge',      price: 14900, accountSize: 100_000 },
  elite:   { name: 'YN Capital Elite Challenge',    price: 29900, accountSize: 200_000 },
}

export async function GET() {
  return NextResponse.json({ configured: STRIPE_ENABLED })
}

export async function POST(req: NextRequest) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json({ error: 'Stripe not configured', demo: true }, { status: 503 })
  }

  const stripe = new Stripe(STRIPE_KEY!)
  const { tier, userId, email } = await req.json()
  const tierConfig = TIER_PRICES[tier]
  if (!tierConfig) return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })

  const origin = req.headers.get('origin') || 'https://ynfinance.org'

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_email: email,
    line_items: [{
      price_data: {
        currency: 'usd',
        product_data: {
          name: tierConfig.name,
          description: `$${tierConfig.accountSize.toLocaleString()} simulated trading account · Real prop firm rules · Certificate on pass`,
        },
        unit_amount: tierConfig.price,
      },
      quantity: 1,
    }],
    metadata: { tier, userId, accountSize: String(tierConfig.accountSize) },
    success_url: `${origin}/challenge-success?tier=${tier}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/app?checkout_cancelled=true`,
  })

  return NextResponse.json({ url: session.url })
}
