import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { forecastTicker } from '@/lib/forecast'
import { loadTrainedModel } from '@/lib/nnStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// YN for Everyone — one engine, the SAME BrainStock neural net, pointed at the
// markets that drive everyday prices. Every call is logged to prediction_log
// (source 'everyone') so the same grading + training cron learns from oil, gas,
// natural gas and Treasuries too — the net gets broader every day.

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

type Rel = 'with' | 'inverse'
type Cat = { proxy: string; proxyName: string; rel: Rel; emoji: string; noun: string; moves: string; now: string; wait: string; neutral: string; caveat?: string }

const CATS: Record<string, Cat> = {
  mortgage:    { proxy: 'TLT', proxyName: 'TLT — 20yr Treasury ETF',  rel: 'inverse', emoji: '🏠', noun: 'mortgage rates',  moves: 'long-term rates', now: 'LOCK',        wait: 'FLOAT',         neutral: 'NEUTRAL' },
  gas:         { proxy: 'UGA', proxyName: 'UGA — US Gasoline Fund',    rel: 'with',    emoji: '⛽', noun: 'gas prices',      moves: 'wholesale gasoline', now: 'FILL UP',     wait: 'WAIT',          neutral: 'EITHER' },
  flights:     { proxy: 'USO', proxyName: 'USO — US Oil Fund',         rel: 'with',    emoji: '✈️', noun: 'airfares',        moves: 'jet-fuel cost',  now: 'BOOK NOW',    wait: 'WATCH',         neutral: 'EITHER', caveat: 'Fares also swing with season and demand — this reads the fuel-cost trend, one big driver.' },
  electricity: { proxy: 'UNG', proxyName: 'UNG — US Natural Gas Fund', rel: 'with',    emoji: '💡', noun: 'electricity rates', moves: 'natural-gas prices', now: 'LOCK A PLAN', wait: 'STAY VARIABLE', neutral: 'EITHER' },
}

const monthly = (principal: number, annualPct: number, n = 360) => {
  const r = annualPct / 100 / 12; if (r <= 0) return principal / n
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
}

async function logForecast(ticker: string, horizon: number, result: Awaited<ReturnType<typeof forecastTicker>>) {
  const admin = getAdmin(); if (!admin) return
  const start = result.history[result.history.length - 1]?.price
  const predicted = result.forecast[result.forecast.length - 1]?.price
  const resolve_date = result.forecast[result.forecast.length - 1]?.date
  if (!start || !predicted || !resolve_date) return
  try {
    await admin.from('prediction_log').upsert({
      trade_date: new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }),
      ticker, source: 'everyone', start_price: start, predicted, horizon, resolve_date,
      status: 'open', features: result.features ?? null,
    }, { onConflict: 'trade_date,ticker,source' })
  } catch { /* never block the forecast */ }
}

export async function GET(req: Request) {
  const u = new URL(req.url)
  const key = String(u.searchParams.get('category') || 'mortgage').toLowerCase()
  const cfg = CATS[key]
  if (!cfg) return NextResponse.json({ error: 'unknown category' }, { status: 400 })

  const days = Math.max(7, Math.min(120, Number(u.searchParams.get('days')) || 30))
  const horizon = Math.max(5, Math.min(20, Math.round(days / 2)))

  let result
  try {
    const admin = getAdmin()
    const model = admin ? await loadTrainedModel(admin) : null   // the SAME trained net
    result = await forecastTicker(cfg.proxy, horizon, undefined, model)
    await logForecast(cfg.proxy, horizon, result)                // feed the same flywheel
  } catch (e) {
    return NextResponse.json({ error: `Couldn't read the market for ${cfg.noun} right now — try again shortly. (${e instanceof Error ? e.message : 'fetch failed'})` }, { status: 502 })
  }

  const last = result.history[result.history.length - 1]?.price
  const fc = result.forecast[result.forecast.length - 1]?.price
  const movePct = last ? ((fc - last) / last) * 100 : 0
  const proxyRising = fc > last
  const consumerRising = cfg.rel === 'with' ? proxyRising : !proxyRising
  const mag = Math.abs(movePct)
  const dirAcc = result.metrics.directional_accuracy ?? 0.5

  const stance: 'now' | 'wait' | 'neutral' = mag < 0.5 ? 'neutral' : consumerRising ? 'now' : 'wait'
  const verdict = stance === 'now' ? cfg.now : stance === 'wait' ? cfg.wait : cfg.neutral
  let confidence = Math.round(50 + Math.min(22, mag * 5) + (dirAcc - 0.5) * 40)
  confidence = Math.max(51, Math.min(88, confidence))
  const backtest = Math.round(dirAcc * 100)

  const headline =
    key === 'mortgage'
      ? (stance === 'now' ? 'Lock it in.' : stance === 'wait' ? 'Float — don’t lock yet.' : 'Too close to call — lean to your timeline.')
      : (stance === 'now' ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} look set to rise — act now.` : stance === 'wait' ? `${cfg.noun[0].toUpperCase() + cfg.noun.slice(1)} look set to ease — wait.` : 'No clear edge right now — your call.')

  const drivers = [
    `The net forecasts ${cfg.proxyName.split(' — ')[0]} (${cfg.moves}) ${proxyRising ? 'up' : 'down'} ${mag.toFixed(1)}% over ~${horizon} trading days.`,
    `That points to ${cfg.noun} ${consumerRising ? 'rising' : 'easing'} — so the call is to ${stance === 'now' ? '**act now**' : stance === 'wait' ? '**wait**' : 'go either way'}.`,
    `BrainStock’s backtested direction accuracy on this series at your window: ${backtest}%.`,
    result.engine === 'neural-net' ? 'Forecast by the trained BrainStock neural net — the same one grading our public stock calls.' : 'Forecast by the transparent baseline while the net builds experience on this series (every call you run trains it).',
    cfg.caveat || '',
  ].filter(Boolean)

  const out: Record<string, unknown> = {
    category: key, emoji: cfg.emoji, noun: cfg.noun, verdict, stance, headline, confidence, backtest,
    direction: stance === 'neutral' ? 'roughly flat' : consumerRising ? 'rising' : 'easing',
    drivers, engine: result.engine, proxy: cfg.proxyName, movePct: +movePct.toFixed(2),
    asOf: new Date().toISOString().slice(0, 10),
  }

  // mortgage money math
  if (key === 'mortgage') {
    const loan = Math.max(1000, Math.min(5_000_000, Number(u.searchParams.get('loan')) || 400_000))
    const offered = Math.max(1, Math.min(15, Number(u.searchParams.get('rate')) || 6.9))
    const base = monthly(loan, offered)
    out.payment = Math.round(base)
    out.saveIfFloat = Math.round(base - monthly(loan, Math.max(0.5, offered - 0.25)))
    out.costIfWait = Math.round(monthly(loan, offered + 0.25) - base)
  }

  return NextResponse.json(out)
}
