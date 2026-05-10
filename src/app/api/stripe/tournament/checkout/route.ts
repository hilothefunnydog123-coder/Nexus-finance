import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key'))

const TIER_COLORS: Record<string, string> = {
  standard: '🏆',
  premium: '💎',
  elite: '👑',
}

export async function POST(req: NextRequest) {
  const { tournamentId, tournamentTitle, entryFeeCents, tier, userId } = await req.json()

  if (!tournamentId || !entryFeeCents) {
    return NextResponse.json({ error: 'Missing tournament info' }, { status: 400 })
  }

  if (!STRIPE_ENABLED) {
    // Demo mode — return success without charging
    return NextResponse.json({ demo: true, message: 'Demo mode: configure Stripe to accept real payments' })
  }

  const stripe = new Stripe(STRIPE_KEY!)
  const origin = req.headers.get('origin') || 'https://ynfinance.org'
  const emoji = TIER_COLORS[tier] || '🏆'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${emoji} ${tournamentTitle} — Tournament Entry`,
            description: `YN Arena tournament entry · Top 20% of competitors win real prizes · Simulated trading only`,
          },
          unit_amount: entryFeeCents,
        },
        quantity: 1,
      }],
      metadata: {
        type: 'tournament_entry',
        tournament_id: tournamentId,
        user_id: userId || '',
      },
      success_url: `${origin}/arena?entered=${tournamentId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/arena`,
    })

    return NextResponse.json({ url: session.url })
  } catch (err) {
    console.error('[tournament-checkout] Stripe error:', err)
    return NextResponse.json({ error: 'Payment setup failed' }, { status: 500 })
  }
}
