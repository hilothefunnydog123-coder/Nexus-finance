import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY ?? ''
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

// Called from /pricing when Stripe returns. Records the subscriber so the cron can bill them.
export async function POST(req: NextRequest) {
  if (!STRIPE_KEY) return NextResponse.json({ error: 'not configured' }, { status: 500 })
  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'missing session_id' }, { status: 400 })

  const stripe = new Stripe(STRIPE_KEY)
  try {
    const session = await stripe.checkout.sessions.retrieve(session_id)
    if (session.mode !== 'setup' || session.status !== 'complete') {
      return NextResponse.json({ ok: false, error: 'session not complete' }, { status: 400 })
    }
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id
    if (!customerId) return NextResponse.json({ ok: false, error: 'no customer' }, { status: 400 })

    const customer = await stripe.customers.retrieve(customerId)
    const email = (!('deleted' in customer) ? customer.email : null) || session.customer_email || ''

    const admin = getAdmin()
    if (admin) {
      await admin.from('payg_subscribers').upsert(
        {
          email,
          stripe_customer_id: customerId,
          status: 'active',
          cycle_start: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'stripe_customer_id' }
      )
    }
    return NextResponse.json({ ok: true, email })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'activate failed'
    console.error('[payg-activate]', msg)
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
