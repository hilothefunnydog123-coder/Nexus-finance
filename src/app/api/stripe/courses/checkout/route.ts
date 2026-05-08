import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key'))

export async function POST(req: NextRequest) {
  if (!STRIPE_ENABLED) {
    return NextResponse.json({ demo: true }, { status: 200 })
  }

  const { slug, title, traderName } = await req.json()
  if (!slug || !title) {
    return NextResponse.json({ error: 'Missing course info' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_KEY!)
  const origin = req.headers.get('origin') || 'https://ynfinance.org'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: title,
            description: `Structured curriculum featuring strategies popularized by ${traderName} · Includes AI lectures, quizzes & practice mode`,
          },
          unit_amount: 99, // $0.99
        },
        quantity: 1,
      }],
      metadata: { slug, type: 'course' },
      success_url: `${origin}/courses/${slug}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/courses/${slug}`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[course-checkout] Stripe error:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
