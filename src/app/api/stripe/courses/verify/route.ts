import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const sessionId = searchParams.get('session_id')
  const slug = searchParams.get('slug')

  if (!sessionId || !slug) {
    return NextResponse.json({ paid: false, error: 'Missing params' }, { status: 400 })
  }

  if (!STRIPE_KEY) {
    return NextResponse.json({ paid: false, error: 'Stripe not configured' }, { status: 503 })
  }

  try {
    const stripe = new Stripe(STRIPE_KEY)
    const session = await stripe.checkout.sessions.retrieve(sessionId)

    const paid = session.payment_status === 'paid' && session.metadata?.slug === slug && session.metadata?.type === 'course'

    return NextResponse.json({ paid })
  } catch (err) {
    console.error('[course-verify] Stripe error:', err)
    return NextResponse.json({ paid: false, error: 'Verification failed' }, { status: 500 })
  }
}
