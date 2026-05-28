import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── POST /api/v1/keys/upgrade ──────────────────────────────────────────────────
// Body: { key_prefix: "yn_live_xxxx", email }
// Creates a Stripe checkout session for the Pro API tier ($49/month).
// On success Stripe redirects to /developers?upgraded=true
// Webhook upgrades the key tier to 'pro'.
export async function POST(req: NextRequest) {
  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 500, headers: CORS })
  }

  let body: Record<string, unknown>
  try { body = await req.json() } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400, headers: CORS })
  }

  const prefix = String(body.key_prefix ?? '').trim()
  const email  = String(body.email      ?? '').trim().toLowerCase()

  if (!prefix.startsWith('yn_live_') || prefix.length < 16) {
    return NextResponse.json(
      { error: 'Invalid key prefix. Provide the first 16+ characters of your free API key.' },
      { status: 400, headers: CORS }
    )
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400, headers: CORS })
  }

  // Verify the key prefix exists and is on the free tier
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  const { data: keyRecord, error: dbErr } = await sb
    .from('api_keys')
    .select('id, tier, user_email, is_active')
    .eq('key_prefix', prefix)
    .single()

  if (dbErr || !keyRecord) {
    return NextResponse.json(
      { error: 'API key not found. Make sure you entered the correct key prefix.' },
      { status: 404, headers: CORS }
    )
  }
  if (!keyRecord.is_active) {
    return NextResponse.json({ error: 'This API key has been deactivated.' }, { status: 403, headers: CORS })
  }
  if (keyRecord.tier === 'pro') {
    return NextResponse.json({ error: 'This key is already on the Pro tier.' }, { status: 409, headers: CORS })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(stripeKey)

  // Get or create the Pro API price
  let priceId = process.env.STRIPE_API_PRO_PRICE_ID

  if (!priceId) {
    // Auto-create the price on first use and log it so it can be pinned in env
    const price = await stripe.prices.create({
      currency:      'usd',
      unit_amount:   4900, // $49.00
      recurring:     { interval: 'month' },
      product_data:  {
        name:     'YN Finance API — Pro',
        metadata: { product_type: 'api_pro' },
      },
    })
    priceId = price.id
    console.log('[API upgrade] Created Stripe price:', priceId, '— set STRIPE_API_PRO_PRICE_ID in env to skip this on future requests')
  }

  const host     = req.headers.get('host') ?? 'ynfinance.org'
  const protocol = host.startsWith('localhost') ? 'http' : 'https'
  const base     = `${protocol}://${host}`

  const session = await stripe.checkout.sessions.create({
    mode:                'subscription',
    customer_email:      email,
    line_items:          [{ price: priceId, quantity: 1 }],
    success_url:         `${base}/developers?upgraded=true&prefix=${encodeURIComponent(prefix)}`,
    cancel_url:          `${base}/developers?cancelled=true`,
    metadata:            { key_id: keyRecord.id, key_prefix: prefix, product: 'api_pro' },
    subscription_data:   { metadata: { key_id: keyRecord.id, key_prefix: prefix } },
    allow_promotion_codes: true,
  })

  return NextResponse.json({
    source:      'ynfinance-api',
    version:     '1.0',
    timestamp:   new Date().toISOString(),
    checkout_url: session.url,
    session_id:  session.id,
  }, { headers: CORS })
}
