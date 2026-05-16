import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_KEY   = process.env.STRIPE_SECRET_KEY   ?? ''
const WEBHOOK_SEC  = process.env.STRIPE_WEBHOOK_SECRET ?? ''
const SB_URL       = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SB_SVC_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const stripe  = STRIPE_KEY  ? new Stripe(STRIPE_KEY)  : null
const SB_READY = SB_URL.startsWith('https://') && SB_SVC_KEY.length > 20
const supabase = SB_READY
  ? createClient(SB_URL, SB_SVC_KEY, { auth: { persistSession: false } })
  : null

// ─── Upsert subscription row ──────────────────────────────────────────────────
async function upsertSubscription(params: {
  stripeCustomerId:    string
  stripeSubscriptionId: string
  email:               string
  status:              string
  currentPeriodStart?: number
  currentPeriodEnd?:   number
  cancelAtPeriodEnd?:  boolean
}) {
  if (!supabase) { console.warn('[webhook] Supabase not configured'); return }

  const row = {
    stripe_customer_id:    params.stripeCustomerId,
    stripe_subscription_id: params.stripeSubscriptionId,
    email:                 params.email,
    status:                params.status,
    plan:                  'daily_intel',
    price_cents:           1199,
    current_period_start:  params.currentPeriodStart ? new Date(params.currentPeriodStart * 1000).toISOString() : null,
    current_period_end:    params.currentPeriodEnd   ? new Date(params.currentPeriodEnd   * 1000).toISOString() : null,
    cancel_at_period_end:  params.cancelAtPeriodEnd  ?? false,
    updated_at:            new Date().toISOString(),
  }

  const { error } = await supabase
    .from('subscriptions')
    .upsert(row, { onConflict: 'stripe_subscription_id' })

  if (error) console.error('[webhook] upsert error:', error.message)
}

// ─── Get customer email from Stripe ──────────────────────────────────────────
async function resolveEmail(customerId: string, fallback?: string | null): Promise<string> {
  if (fallback) return fallback
  if (!stripe)  return ''
  try {
    const cust = await stripe.customers.retrieve(customerId)
    return (cust as Stripe.Customer).email ?? ''
  } catch { return '' }
}

// ─── Main handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  if (!stripe) {
    return NextResponse.json({ error: 'Stripe not configured' }, { status: 503 })
  }

  const body = await req.text()
  const sig  = req.headers.get('stripe-signature') ?? ''

  let event: Stripe.Event
  try {
    event = WEBHOOK_SEC
      ? stripe.webhooks.constructEvent(body, sig, WEBHOOK_SEC)
      : (JSON.parse(body) as Stripe.Event) // dev fallback — no sig check
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Webhook signature failed'
    console.error('[webhook] sig error:', msg)
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  console.log('[webhook] event:', event.type)

  try {
    switch (event.type) {
      // ── Initial checkout complete ──────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subObj = session.subscription as any
        const subId  = typeof subObj === 'string' ? subObj : subObj?.id
        if (!subId) break

        const sub   = await stripe.subscriptions.retrieve(subId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any
        const email = await resolveEmail(
          session.customer as string,
          session.customer_email ?? session.customer_details?.email
        )

        await upsertSubscription({
          stripeCustomerId:    session.customer as string,
          stripeSubscriptionId: subId,
          email,
          status:              sub.status,
          currentPeriodStart:  subAny.current_period_start,
          currentPeriodEnd:    subAny.current_period_end,
          cancelAtPeriodEnd:   subAny.cancel_at_period_end,
        })
        break
      }

      // ── Invoice paid (renewal) ─────────────────────────────────────────────
      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invAny  = invoice as any
        const subId   = invAny.subscription as string | undefined
        if (!subId) break

        const sub    = await stripe.subscriptions.retrieve(subId)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any
        const email  = await resolveEmail(
          invAny.customer as string,
          invAny.customer_email
        )

        await upsertSubscription({
          stripeCustomerId:    invAny.customer as string,
          stripeSubscriptionId: subId,
          email,
          status:              'active',
          currentPeriodStart:  subAny.current_period_start,
          currentPeriodEnd:    subAny.current_period_end,
          cancelAtPeriodEnd:   subAny.cancel_at_period_end,
        })
        break
      }

      // ── Subscription updated (cancel scheduled, plan change, etc.) ─────────
      case 'customer.subscription.updated': {
        const sub    = event.data.object as Stripe.Subscription
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const subAny = sub as any
        const email  = await resolveEmail(sub.customer as string)

        await upsertSubscription({
          stripeCustomerId:    sub.customer as string,
          stripeSubscriptionId: sub.id,
          email,
          status:              sub.status,
          currentPeriodStart:  subAny.current_period_start,
          currentPeriodEnd:    subAny.current_period_end,
          cancelAtPeriodEnd:   subAny.cancel_at_period_end,
        })
        break
      }

      // ── Subscription cancelled / deleted ───────────────────────────────────
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        if (!supabase) break
        await supabase
          .from('subscriptions')
          .update({ status: 'cancelled', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      // ── Payment failed ─────────────────────────────────────────────────────
      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const invAny  = invoice as any
        const subId   = invAny.subscription as string | undefined
        if (!subId || !supabase) break
        await supabase
          .from('subscriptions')
          .update({ status: 'past_due', updated_at: new Date().toISOString() })
          .eq('stripe_subscription_id', subId)
        break
      }

      default:
        // Unhandled event — acknowledge to prevent Stripe retries
        break
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    // Still return 200 so Stripe doesn't retry endlessly
  }

  return NextResponse.json({ received: true })
}
