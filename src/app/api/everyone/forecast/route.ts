import { NextResponse } from 'next/server'
import { CATS, buildVerdict, toPublic, mortgageMath, type Verdict } from '@/lib/everyone/engine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — a REAL verdict:
//  1. the BrainStock net forecasts a TWO-proxy ensemble of the markets that drive
//     the price (real Yahoo OHLCV → blended trend, move %, backtested directional
//     accuracy, proxy-agreement score),
//  2. Gemini (with live Google Search grounding) pulls this week's real news/data
//     and a "what changed this week" line,
//  3. the two are fused into a calibrated confidence + specific, sourced reasons.
// Every primary call is logged to prediction_log so the same net keeps learning.
// The engine lives in src/lib/everyone/engine.ts (shared with /snapshot).

export async function GET(req: Request) {
  const u = new URL(req.url)
  const key = String(u.searchParams.get('category') || 'mortgage').toLowerCase()
  const cfg = CATS[key]
  if (!cfg) return NextResponse.json({ error: 'unknown category' }, { status: 400 })
  const days = Math.max(7, Math.min(120, Number(u.searchParams.get('days')) || 30))

  let v: Verdict
  try {
    v = await buildVerdict(key, cfg, days)
  } catch (e) {
    // never throw to the client — surface a friendly, non-fatal message.
    return NextResponse.json(
      {
        error: `Couldn't read the market for ${cfg.noun} right now — try again shortly. (${e instanceof Error ? e.message : 'fetch failed'})`,
      },
      { status: 502 },
    )
  }

  const out = toPublic(key, cfg, v)
  if (key === 'mortgage') {
    const loan = Math.max(1000, Math.min(5_000_000, Number(u.searchParams.get('loan')) || 400_000))
    const offered = Math.max(1, Math.min(15, Number(u.searchParams.get('rate')) || 6.9))
    Object.assign(out, mortgageMath(loan, offered))
  }
  return NextResponse.json(out)
}
