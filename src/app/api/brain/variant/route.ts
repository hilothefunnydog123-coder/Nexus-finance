import { NextRequest, NextResponse } from 'next/server'
import { getAdmin } from '@/lib/brain/site'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Sample from Beta(α,β) ~ via two gammas (Marsaglia-Tsang). Thompson sampling.
function gamma(k: number): number {
  if (k < 1) return gamma(1 + k) * Math.pow(Math.random(), 1 / k)
  const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x = 0, v = 0
    do { const u1 = Math.random(), u2 = Math.random(); x = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2); v = 1 + c * x } while (v <= 0)
    v = v * v * v; const u = Math.random()
    if (u < 1 - 0.0331 * x * x * x * x) return d * v
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}
function beta(a: number, b: number): number { const x = gamma(a), y = gamma(b); return x / (x + y) }

// GET: choose a variant for an experiment (Thompson sampling; honors auto-promotion),
// and log an impression. POST: record a conversion. No DB → deterministic first variant.
export async function GET(req: NextRequest) {
  const u = new URL(req.url)
  const exp = String(u.searchParams.get('exp') || '').slice(0, 40)
  const variants = String(u.searchParams.get('variants') || '').split('|').map(s => s.trim()).filter(Boolean).slice(0, 8)
  if (!exp || !variants.length) return NextResponse.json({ variant: null })
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ variant: variants[0], live: false })
  try {
    const { data } = await admin.from('brain_experiments').select('variant,impressions,conversions,promoted').eq('exp', exp)
    const stats = new Map((data || []).map(r => [r.variant, r]))
    const promoted = (data || []).find(r => r.promoted)
    let chosen = promoted?.variant
    if (!chosen) {
      // Thompson sampling over each known/declared variant
      let best = -1
      for (const v of variants) {
        const s = stats.get(v); const conv = s?.conversions || 0; const imp = s?.impressions || 0
        const sample = beta(conv + 1, Math.max(0, imp - conv) + 1)
        if (sample > best) { best = sample; chosen = v }
      }
    }
    chosen = chosen || variants[0]
    await admin.rpc('brain_bump_variant', { p_exp: exp, p_variant: chosen, p_imp: 1, p_conv: 0 }).then(() => {}, () => {})

    // auto-promote: enough data + a clear, confident leader
    if (!promoted) {
      const enriched = variants.map(v => { const s = stats.get(v); return { v, imp: s?.impressions || 0, conv: s?.conversions || 0 } })
      const total = enriched.reduce((a, b) => a + b.imp, 0)
      const lead = [...enriched].sort((a, b) => (b.conv + 1) / (b.imp + 2) - (a.conv + 1) / (a.imp + 2))[0]
      const second = [...enriched].sort((a, b) => (b.conv + 1) / (b.imp + 2) - (a.conv + 1) / (a.imp + 2))[1]
      if (total >= 400 && lead && lead.imp >= 120 && lead.conv >= 12 && second) {
        const lr = (lead.conv + 1) / (lead.imp + 2), sr = (second.conv + 1) / (second.imp + 2)
        if (lr > sr * 1.25) await admin.from('brain_experiments').update({ promoted: true }).eq('exp', exp).eq('variant', lead.v).then(() => {}, () => {})
      }
    }
    return NextResponse.json({ variant: chosen, live: true, promoted: !!promoted }, { headers: { 'Cache-Control': 'no-store' } })
  } catch {
    return NextResponse.json({ variant: variants[0], live: false })
  }
}

export async function POST(req: NextRequest) {
  const admin = getAdmin()
  if (!admin) return new NextResponse(null, { status: 204 })
  try {
    const b = await req.json()
    const exp = String(b?.exp || '').slice(0, 40); const variant = String(b?.variant || '').slice(0, 40)
    if (exp && variant) await admin.rpc('brain_bump_variant', { p_exp: exp, p_variant: variant, p_imp: 0, p_conv: 1 }).then(() => {}, () => {})
  } catch {}
  return new NextResponse(null, { status: 204 })
}
