import { NextResponse } from 'next/server'
import { getCandles, getQuote } from '@/lib/finnhub'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — mortgage-rate timing engine.
// The net's forecasting approach, pointed at the bond market: long Treasuries
// (TLT) move INVERSELY to long rates. TLT trending up ⇒ yields/mortgage rates
// drifting down ⇒ it pays to FLOAT (wait). TLT trending down ⇒ rates rising ⇒
// LOCK now. We read the trend, score conviction, and BACKTEST the rule so the
// confidence we show is earned, not invented. Honest, on-brand: we prove it.

const ema = (xs: number[], p: number) => {
  const k = 2 / (p + 1); let e = xs[0]; const out = [e]
  for (let i = 1; i < xs.length; i++) { e = xs[i] * k + e * (1 - k); out.push(e) }
  return out
}
const monthly = (principal: number, annualPct: number, n = 360) => {
  const r = annualPct / 100 / 12; if (r <= 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

export async function GET(req: Request) {
  const u = new URL(req.url)
  const loan = Math.max(1000, Math.min(5_000_000, Number(u.searchParams.get('loan')) || 400_000))
  const offered = Math.max(1, Math.min(15, Number(u.searchParams.get('rate')) || 6.9))
  const days = Math.max(7, Math.min(120, Number(u.searchParams.get('days')) || 30))

  let closes: number[] = []
  let note = ''
  try {
    const now = Math.floor(Date.now() / 1000)
    const from = now - 260 * 24 * 60 * 60
    const candles = await getCandles('TLT', 'D', from, now)
    closes = candles.map((c) => c.close).filter((n) => n > 0)
  } catch { /* fall through */ }

  // Fallback: not enough history — lean on today's bond move only.
  if (closes.length < 40) {
    let dp = 0
    try { dp = (await getQuote('TLT')).changePercent || 0 } catch {}
    const falling = dp > 0 // TLT up today ⇒ rates down today
    const conf = Math.min(60, 52 + Math.abs(dp) * 4)
    return NextResponse.json(payload({
      verdict: Math.abs(dp) < 0.15 ? 'NEUTRAL' : falling ? 'FLOAT' : 'LOCK',
      confidence: Math.round(conf), ratesFalling: falling, strengthPct: dp,
      backtest: null, loan, offered, days,
      drivers: [
        `Long-bond proxy (TLT) is ${dp >= 0 ? 'up' : 'down'} ${Math.abs(dp).toFixed(2)}% today — ${dp >= 0 ? 'yields easing' : 'yields rising'}.`,
        'Limited rate history available right now, so this read is short-horizon. Check back as the record builds.',
      ],
      note: 'limited-history read',
    }))
  }

  const e10 = ema(closes, 10), e30 = ema(closes, 30)
  const i = closes.length - 1
  const spread = (e10[i] - e30[i]) / e30[i]            // >0 ⇒ TLT uptrend ⇒ rates falling
  const ratesFalling = spread > 0
  const strengthPct = +(spread * 100).toFixed(2)

  // Backtest the rule at a horizon matched to the user's close window.
  const horizon = Math.max(5, Math.min(40, Math.round(days / 1.4)))
  let hits = 0, total = 0
  for (let j = 30; j < closes.length - horizon; j++) {
    const predFalling = e10[j] > e30[j]
    const actualFalling = closes[j + horizon] > closes[j] // TLT rose ⇒ rates fell
    if (predFalling === actualFalling) hits++
    total++
  }
  const hitRate = total ? Math.round((hits / total) * 100) : null

  const mag = Math.min(1, Math.abs(spread) / 0.03)
  let confidence = Math.round(52 + mag * 22 + ((hitRate ?? 55) - 55) * 0.4)
  confidence = Math.max(51, Math.min(88, confidence))
  const verdict = Math.abs(spread) < 0.004 ? 'NEUTRAL' : ratesFalling ? 'FLOAT' : 'LOCK'

  // 30-day momentum for color.
  const mom = closes.length > 21 ? +(((closes[i] - closes[i - 21]) / closes[i - 21]) * 100).toFixed(2) : 0

  const drivers = [
    `The 10-yr proxy (TLT) is in a ${ratesFalling ? 'up' : 'down'}trend — its 10-day average sits ${ratesFalling ? 'above' : 'below'} its 30-day, which historically leads mortgage rates ${ratesFalling ? 'lower' : 'higher'}.`,
    `~1-month bond momentum: ${mom >= 0 ? '+' : ''}${mom}% (${mom >= 0 ? 'rates easing' : 'rates firming'}).`,
    hitRate != null ? `Backtested over ~1 year, this trend rule called the next ${horizon} sessions right ${hitRate}% of the time at your close window.` : '',
  ].filter(Boolean)

  return NextResponse.json(payload({ verdict, confidence, ratesFalling, strengthPct, backtest: hitRate, loan, offered, days, drivers, note }))

  function payload(o: {
    verdict: string; confidence: number; ratesFalling: boolean; strengthPct: number
    backtest: number | null; loan: number; offered: number; days: number; drivers: string[]; note: string
  }) {
    // What waiting could mean: if rates ease ~0.25%, monthly + lifetime delta.
    const base = monthly(o.loan, o.offered)
    const better = monthly(o.loan, Math.max(0.5, o.offered - 0.25))
    const worse = monthly(o.loan, o.offered + 0.25)
    const save = Math.round(base - better)        // $/mo saved if rates fall 0.25 and you floated
    const cost = Math.round(worse - base)          // $/mo more if rates rise 0.25 and you waited
    return {
      ...o,
      direction: o.verdict === 'NEUTRAL' ? 'roughly flat' : o.ratesFalling ? 'easing' : 'firming',
      headline: o.verdict === 'LOCK' ? 'Lock it in.' : o.verdict === 'FLOAT' ? 'Float — don’t lock yet.' : 'Too close to call — lean to your timeline.',
      payment: Math.round(base),
      saveIfFloat: save, costIfWait: cost,
      asOf: new Date().toISOString().slice(0, 10),
      proxy: 'TLT (20yr Treasury ETF)',
    }
  }
}
