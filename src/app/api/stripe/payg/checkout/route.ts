import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const STRIPE_READY = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key') && !STRIPE_KEY.includes('sk_test_your'))

const IP_HITS = new Map<string, number[]>()
function rateLimit(ip: string): boolean {
  const now = Date.now()
  const hits = (IP_HITS.get(ip) ?? []).filter((t) => now - t < 60_000)
  if (hits.length >= 5) return false
  IP_HITS.set(ip, [...hits, now])
  return true
}

// Save a card with $0 charged today. Month-end cron does the variable billing.
export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
  if (!rateLimit(ip)) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  if (!STRIPE_READY) {
    return NextResponse.json({ demo: true, message: 'Add STRIPE_SECRET_KEY to enable payments.' })
  }

  const { email } = await req.json()
  const origin = req.headers.get('origin') ?? 'https://ynfinance.org'
  const stripe = new Stripe(STRIPE_KEY)

  try {
    // Pre-create the customer so the saved card attaches to a stable id we can bill later.
    const customer = await stripe.customers.create({
      email: email || undefined,
      metadata: { plan: 'payg_wins', source: 'ynfinance' },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customer.id,
      currency: 'usd',
      payment_method_types: ['card'],
      metadata: { plan: 'payg_wins' },
      success_url: `${origin}/pricing?session_id={CHECKOUT_SESSION_ID}&activated=1`,
      cancel_url: `${origin}/pricing`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Checkout failed'
    console.error('[payg-checkout]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
