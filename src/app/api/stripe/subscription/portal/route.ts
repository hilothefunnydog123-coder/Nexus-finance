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

export async function POST(req: NextRequest) {
  if (!READY) {
    return NextResponse.json({ demo: true, message: 'Stripe not configured' })
  }

  const origin = req.headers.get('origin') ?? 'https://ynfinance.org'
  const subId  = req.cookies.get('yn-sub-id')?.value

  if (!subId || subId === 'demo') {
    return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
  }

  const stripe = new Stripe(STRIPE_KEY)

  try {
    // Look up customer ID from Supabase
    let customerId = ''
    if (supabase) {
      const { data } = await supabase
        .from('subscriptions')
        .select('stripe_customer_id')
        .eq('stripe_subscription_id', subId)
        .single()
      customerId = data?.stripe_customer_id ?? ''
    }

    // Fallback: retrieve from Stripe directly
    if (!customerId) {
      const sub = await stripe.subscriptions.retrieve(subId)
      customerId = typeof sub.customer === 'string' ? sub.customer : (sub.customer as Stripe.Customer)?.id ?? ''
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer:   customerId,
      return_url: `${origin}/daily/manage`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Portal failed'
    console.error('[portal]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
