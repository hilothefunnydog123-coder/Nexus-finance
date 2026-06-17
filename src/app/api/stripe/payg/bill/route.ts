import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { cycleAccrual, STRIPE_MIN_CENTS } from '@/lib/payg'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

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

const CYCLE_DAYS = 28 // bill a subscriber once their cycle is at least this old

// Cron-driven: charge each due subscriber ONE invoice for min($20, wins x $0.25).
export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!STRIPE_KEY) return NextResponse.json({ error: 'stripe not configured' }, { status: 500 })

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'no db' }, { status: 500 })
  const stripe = new Stripe(STRIPE_KEY)

  const dueBefore = new Date(Date.now() - CYCLE_DAYS * 86400_000).toISOString()
  const { data } = await admin
    .from('payg_subscribers')
    .select('id,email,stripe_customer_id,cycle_start,lifetime_cents')
    .eq('status', 'active')
    .lte('cycle_start', dueBefore)
    .limit(100)
  const due = data || []

  let charged = 0
  let skipped = 0
  let rolled = 0
  const start = Date.now()

  for (const sub of due) {
    if (Date.now() - start > 50000) break
    try {
      const accrual = await cycleAccrual(admin, sub.cycle_start as string)

      // Below Stripe's minimum — don't burn a fee. Roll the cycle so wins keep accruing.
      if (accrual.cents < STRIPE_MIN_CENTS) {
        await admin.from('payg_subscribers').update({ updated_at: new Date().toISOString() }).eq('id', sub.id)
        rolled++
        continue
      }

      const customerId = sub.stripe_customer_id as string
      const pms = await stripe.paymentMethods.list({ customer: customerId, type: 'card', limit: 1 })
      const pm = pms.data[0]?.id
      if (!pm) {
        skipped++
        continue
      }

      // One invoice item + one invoice + one charge => one Stripe fee for the whole cycle.
      await stripe.invoiceItems.create({
        customer: customerId,
        amount: accrual.cents,
        currency: 'usd',
        description: `BrainStock — ${accrual.wins} winning calls this cycle (capped at $${accrual.capDollars})`,
      })
      const invoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'charge_automatically',
        default_payment_method: pm,
        auto_advance: true,
        metadata: { plan: 'payg_wins', wins: String(accrual.wins) },
      })
      if (invoice.id) await stripe.invoices.pay(invoice.id)

      await admin
        .from('payg_subscribers')
        .update({
          cycle_start: new Date().toISOString(),
          last_billed_at: new Date().toISOString(),
          last_charge_cents: accrual.cents,
          lifetime_cents: (sub.lifetime_cents || 0) + accrual.cents,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sub.id)
      charged++
    } catch (e) {
      console.error('[payg-bill]', sub.stripe_customer_id, e instanceof Error ? e.message : e)
      skipped++
    }
  }

  return NextResponse.json({ due: due.length, charged, rolled, skipped })
}
