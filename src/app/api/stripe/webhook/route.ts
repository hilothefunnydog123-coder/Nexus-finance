import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET

const TIER_CONFIG: Record<string, { profitTarget: number; maxDrawdown: number; dailyLoss: number; minDays: number; maxDays: number }> = {
  starter: { profitTarget: 8,  maxDrawdown: 5, dailyLoss: 2.5, minDays: 5,  maxDays: 30 },
  pro:     { profitTarget: 10, maxDrawdown: 5, dailyLoss: 2.5, minDays: 10, maxDays: 30 },
  elite:   { profitTarget: 8,  maxDrawdown: 5, dailyLoss: 2,   minDays: 15, maxDays: 60 },
}

export async function POST(req: NextRequest) {
  if (!STRIPE_KEY || !WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')
  if (!sig) return NextResponse.json({ error: 'No signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const stripe = new Stripe(STRIPE_KEY)
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] Signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const session = event.data.object as any
    const { tier, userId, accountSize } = session.metadata || {}
    const email = session.customer_email

    if (!tier || !userId || !email) {
      console.error('[webhook] Missing metadata:', { tier, userId, email, sessionId: session.id })
      return NextResponse.json({ error: 'Missing metadata' }, { status: 400 })
    }

    const tierConf = TIER_CONFIG[tier]
    if (!tierConf) {
      console.error('[webhook] Unknown tier:', tier, '— session:', session.id)
      return NextResponse.json({ error: `Unknown tier: ${tier}` }, { status: 400 })
    }

    try {
      const sb = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )

      const { error: dbError } = await sb.from('challenges').insert({
        user_id: userId,
        email,
        tier,
        account_size: parseInt(accountSize),
        profit_target: tierConf.profitTarget,
        max_drawdown: tierConf.maxDrawdown,
        daily_loss_limit: tierConf.dailyLoss,
        min_trading_days: tierConf.minDays,
        max_days: tierConf.maxDays,
        status: 'active',
        stripe_session_id: session.id,
      })

      if (dbError) {
        console.error('[webhook] DB insert failed:', dbError, { userId, tier, sessionId: session.id })
        return NextResponse.json({ error: 'Failed to activate challenge' }, { status: 500 })
      }

      console.log('[webhook] Challenge activated:', { userId, tier, sessionId: session.id })
    } catch (err) {
      console.error('[webhook] Unexpected error:', err, { userId, tier, sessionId: session.id })
      return NextResponse.json({ error: 'Server error' }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true })
}
