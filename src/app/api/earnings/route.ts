import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

// ── Types ──────────────────────────────────────────────────────────────────────
interface EarningsCalendarItem {
  symbol:          string
  name?:           string
  date?:           string
  epsEstimate?:    number
  epsActual?:      number
  revenueEstimate?: number
  revenueActual?:  number
  quarter?:        number
  year?:           number
}

interface EarningsHistoryItem {
  period:             string
  actual?:            number
  estimate?:          number
  surprise?:          number
  surprisePercent?:   number
}

interface EnrichedCompany {
  symbol:        string
  name:          string
  earnings_date: string
  days_away:     number
  history:       EarningsHistoryItem[]
  honesty_score: number
  beat_rate:     number
  eps_estimate:  number | null
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function today() { return new Date().toISOString().split('T')[0] }
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().split('T')[0]
}
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now    = new Date()
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

async function fhGet(path: string) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

function computeHonestyScore(history: EarningsHistoryItem[]): number {
  if (!history.length) return 50
  let score = 50
  let count = 0
  for (const q of history.slice(0, 4)) {
    const sp = Number(q.surprisePercent ?? 0)
    if (sp > 5)  score += 8
    if (sp < 0)  score -= 12
    count++
  }
  if (count > 0) score = 50 + ((score - 50) / count) * Math.min(count, 4)
  return Math.max(0, Math.min(100, Math.round(score)))
}

function beatRate(history: EarningsHistoryItem[]): number {
  if (!history.length) return 0
  const quarters = history.slice(0, 8)
  const beats    = quarters.filter(q => (q.surprisePercent ?? 0) > 0).length
  return Math.round((beats / quarters.length) * 100)
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const from = today()
    const to   = daysFromNow(30)

    const calRes = await fhGet(`/calendar/earnings?from=${from}&to=${to}`)
    const calItems: EarningsCalendarItem[] = calRes?.earningsCalendar ?? []

    // Deduplicate by symbol, take first 15 with a valid symbol
    const seen   = new Set<string>()
    const unique: EarningsCalendarItem[] = []
    for (const item of calItems) {
      if (!item.symbol || seen.has(item.symbol)) continue
      seen.add(item.symbol)
      unique.push(item)
      if (unique.length >= 15) break
    }

    // Fetch earnings history for each in parallel
    const withHistory = await Promise.all(
      unique.map(async item => {
        const hist = await fhGet(`/stock/earnings?symbol=${item.symbol}`)
        const history: EarningsHistoryItem[] = Array.isArray(hist) ? hist : []
        const honesty_score = computeHonestyScore(history)
        const beat          = beatRate(history)
        const dateStr       = item.date ?? from

        const enriched: EnrichedCompany = {
          symbol:        item.symbol,
          name:          item.name ?? item.symbol,
          earnings_date: dateStr,
          days_away:     daysUntil(dateStr),
          history:       history.slice(0, 4),
          honesty_score,
          beat_rate:     beat,
          eps_estimate:  item.epsEstimate ?? null,
        }
        return enriched
      })
    )

    return NextResponse.json({
      upcoming:     withHistory,
      last_updated: new Date().toISOString(),
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[earnings GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      symbol:              string
      company_name:        string
      recent_surprise_pct: number
      guidance_tone:       string
      earnings_date:       string
    }

    const { symbol, company_name, recent_surprise_pct, guidance_tone, earnings_date } = body

    const prompt = `You are a Wall Street earnings analyst with 20 years of experience reading management credibility.

Company: ${company_name} (${symbol})
Upcoming Earnings Date: ${earnings_date}
Most Recent Earnings Surprise: ${recent_surprise_pct >= 0 ? '+' : ''}${recent_surprise_pct.toFixed(1)}%
Management Guidance Tone: ${guidance_tone || 'not specified'}

Analyze this company's earnings pattern in 2-3 sentences. Comment specifically on whether management has a track record of sandbagging estimates, over-promising, or delivering honest guidance. What should a trader watch for going into this report?`

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GM}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        }),
      }
    )
    if (!r.ok) throw new Error(`Gemini ${r.status}`)
    const d = await r.json()
    const analysis = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ analysis: analysis.trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[earnings POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export const dynamic = 'force-dynamic'
