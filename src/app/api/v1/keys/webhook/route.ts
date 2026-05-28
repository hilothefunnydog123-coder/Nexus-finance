import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { sendApiProUpgradedEmail } from '@/lib/email'

// ── Stripe webhook for API key Pro upgrades ────────────────────────────────────
// Stripe sends POST here when checkout.session.completed fires.
// We verify the signature, find the key by id/prefix, and upgrade tier to 'pro'.
export async function POST(req: NextRequest) {
  const stripeKey     = process.env.STRIPE_SECRET_KEY
  const webhookSecret = process.env.STRIPE_API_WEBHOOK_SECRET
                     ?? process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeKey || !webhookSecret) {
    console.error('[api-key webhook] Missing STRIPE_SECRET_KEY or STRIPE_API_WEBHOOK_SECRET')
    return new NextResponse('Webhook not configured', { status: 500 })
  }

  const sig  = req.headers.get('stripe-signature') ?? ''
  const body = await req.text()

  let event: Stripe.Event
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stripe = new (Stripe as any)(stripeKey)
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[api-key webhook] Signature verification failed:', msg)
    return new NextResponse(`Webhook signature failed: ${msg}`, { status: 400 })
  }

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  )

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session

    // Only handle our API Pro sessions
    if (session.metadata?.product !== 'api_pro') {
      return new NextResponse('OK', { status: 200 })
    }

    const keyId     = session.metadata?.key_id
    const subId     = typeof session.subscription === 'string'
                        ? session.subscription
                        : session.subscription?.id ?? null
    const customerId = typeof session.customer === 'string'
                        ? session.customer
                        : session.customer?.id ?? null

    if (!keyId) {
      console.error('[api-key webhook] No key_id in session metadata:', session.id)
      return new NextResponse('OK', { status: 200 })
    }

    const { error } = await sb
      .from('api_keys')
      .update({
        tier:                   'pro',
        stripe_subscription_id: subId,
        stripe_customer_id:     customerId,
      })
      .eq('id', keyId)

    if (error) {
      console.error('[api-key webhook] Failed to upgrade key:', keyId, error.message)
      return new NextResponse('DB error', { status: 500 })
    }

    console.log('[api-key webhook] Upgraded key to Pro:', keyId)

    // Send Pro upgrade email via Resend (non-blocking)
    const keyPrefix = session.metadata?.key_prefix ?? ''
    const custEmail = typeof session.customer_details === 'object' && session.customer_details !== null
      ? (session.customer_details as { email?: string }).email ?? ''
      : ''
    if (custEmail && keyPrefix) {
      sendApiProUpgradedEmail(custEmail, keyPrefix).catch(() => {})
      // Update developer_signups tier
      sb.from('developer_signups')
        .update({ tier: 'pro' })
        .eq('email', custEmail)
        .then(() => {}, () => {})
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    // Downgrade back to free if subscription is cancelled
    const sub       = event.data.object as Stripe.Subscription
    const subMeta   = sub.metadata

    if (subMeta?.key_id) {
      await sb
        .from('api_keys')
        .update({ tier: 'free', stripe_subscription_id: null })
        .eq('id', subMeta.key_id)

      console.log('[api-key webhook] Downgraded key to free after cancellation:', subMeta.key_id)
    }
  }

  return new NextResponse('OK', { status: 200 })
}
