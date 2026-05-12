import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY
const STRIPE_ENABLED = !!(STRIPE_KEY && !STRIPE_KEY.includes('your_key'))

if (!STRIPE_ENABLED) {
  console.warn('[tournament-checkout] Stripe not configured — running in demo mode')
}

const VALID_FEES = new Set([1000, 2500, 5000, 10000, 25000])
const VALID_ID = /^[a-zA-Z0-9-]{1,50}$/
const IP_HITS = new Map<string, number[]>()

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const hits = (IP_HITS.get(ip) || []).filter(t => now - t < 60_000)
  if (hits.length >= 10) return false
  IP_HITS.set(ip, [...hits, now])
  return true
}

const TIER_EMOJI: Record<string, string> = { standard: '🏆', premium: '💎', elite: '👑' }

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown'

  if (!rateLimit(ip)) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const body = await req.json()
  const { tournamentId, tournamentTitle, entryFeeCents, tier, userId } = body

  if (!tournamentId || !entryFeeCents) {
    return NextResponse.json({ error: 'Missing tournament info' }, { status: 400 })
  }
  if (!VALID_FEES.has(entryFeeCents)) {
    return NextResponse.json({ error: 'Invalid entry fee' }, { status: 400 })
  }
  if (!VALID_ID.test(tournamentId)) {
    return NextResponse.json({ error: 'Invalid tournament ID' }, { status: 400 })
  }

  if (!STRIPE_ENABLED) {
    return NextResponse.json({ demo: true, message: 'Demo mode: configure Stripe to accept real payments' })
  }

  const stripe = new Stripe(STRIPE_KEY!)
  const origin = req.headers.get('origin') || 'https://ynfinance.org'
  const emoji = TIER_EMOJI[tier] || '🏆'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${emoji} ${tournamentTitle} — Tournament Entry`,
            description: `YN Arena · Top 10 get entry × P&L% · Simulated trading · Real prize payouts`,
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
      payment_intent_data: {
        metadata: { tournament_id: tournamentId, user_ip: ip },
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
