import { NextRequest, NextResponse } from 'next/server'

const FH  = process.env.FINNHUB_API_KEY
const GM  = process.env.GEMINI_API_KEY

// ── Types ──────────────────────────────────────────────────────────────────────
interface RawTrade {
  transaction_date: string
  ticker:           string
  asset_description: string
  type:             string
  amount:           string
  representative:   string
  district?:        string
  party?:           string
  state?:           string
}

interface EnrichedTrade extends RawTrade {
  current_price:   number
  suspicion_score: number
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function today()      { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}

function amountScore(amount: string): number {
  const a = amount.toLowerCase().replace(/\s/g, '')
  if (a.includes('>$1,000,000') || a.includes('>1,000,000')) return 100
  if (a.includes('>$500,000')   || a.includes('>500,000'))   return 95
  if (a.includes('$250,001')    || a.includes('250,001'))     return 85
  if (a.includes('$100,001')    || a.includes('100,001'))     return 75
  if (a.includes('$50,001')     || a.includes('50,001'))      return 60
  if (a.includes('$15,001')     || a.includes('15,001'))      return 40
  if (a.includes('$1,001')      || a.includes('1,001'))       return 20
  return 10
}

function suspicionScore(trade: RawTrade): number {
  let score = amountScore(trade.amount)
  if (trade.type?.toLowerCase() === 'purchase') score += 15
  return Math.min(100, score)
}

async function finnhubQuote(ticker: string): Promise<number> {
  try {
    const r = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${ticker}&token=${FH}`,
      { cache: 'no-store' }
    )
    if (!r.ok) return 0
    const d = await r.json()
    return Number(d?.c ?? 0)
  } catch { return 0 }
}

async function geminiAnalyze(prompt: string): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GM}`,
    {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
      }),
    }
  )
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const d = await r.json()
  return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    // 1. Fetch raw house trade data — cache for 30 minutes
    const raw = await fetch(
      'https://house-stock-watcher-data.s3-us-east-2.amazonaws.com/data/all_transactions.json',
      { next: { revalidate: 1800 } }
    )
    if (!raw.ok) throw new Error(`House data ${raw.status}`)
    const allTrades: RawTrade[] = await raw.json()

    // 2. Filter last 90 days, valid ticker
    const cutoff = daysAgo(90)
    const filtered = allTrades.filter(t => {
      if (!t.ticker || t.ticker === 'N/A' || t.ticker.toLowerCase() === 'none') return false
      if (!t.transaction_date) return false
      return t.transaction_date >= cutoff
    })

    // 3. Sort by date desc, take top 40
    const top40 = filtered
      .sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''))
      .slice(0, 40)

    // 4. Enrich with prices in batches of 10
    const enriched: EnrichedTrade[] = []
    for (let i = 0; i < top40.length; i += 10) {
      const batch = top40.slice(i, i + 10)
      const prices = await Promise.all(batch.map(t => finnhubQuote(t.ticker)))
      batch.forEach((t, idx) => {
        enriched.push({
          ...t,
          current_price:   prices[idx],
          suspicion_score: suspicionScore(t),
        })
      })
    }

    // 5. Compute stats
    const yearStart = `${new Date().getFullYear()}-01-01`
    const thisYear  = allTrades.filter(t => t.transaction_date >= yearStart)

    const repCount: Record<string, number> = {}
    thisYear.forEach(t => {
      repCount[t.representative] = (repCount[t.representative] ?? 0) + 1
    })
    const most_active_rep = Object.entries(repCount)
      .sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'

    // Biggest trade by amount score
    const biggest_trade = enriched
      .sort((a, b) => amountScore(b.amount) - amountScore(a.amount))[0]?.amount ?? 'N/A'

    // Re-sort enriched by date
    enriched.sort((a, b) => (b.transaction_date ?? '').localeCompare(a.transaction_date ?? ''))

    return NextResponse.json({
      trades: enriched,
      stats: {
        total_this_year:  thisYear.length,
        biggest_trade,
        most_active_rep,
        total_reps:       Object.keys(repCount).length,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[congress GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      ticker:              string
      representative:      string
      type:                string
      amount:              string
      transaction_date:    string
      asset_description:   string
    }

    const { ticker, representative, type, amount, transaction_date, asset_description } = body

    const prompt = `You are a financial intelligence analyst specializing in congressional trading patterns.

A member of Congress just disclosed the following trade:
- Representative: ${representative}
- Ticker: ${ticker} (${asset_description})
- Trade Type: ${type?.toUpperCase()}
- Amount: ${amount}
- Transaction Date: ${transaction_date}

In exactly 3 sentences, explain why this trade is suspicious and what it might signal about upcoming legislation, regulatory action, or market-moving information this representative may have had access to. Be specific, pointed, and direct. Do not use hedging language.`

    const analysis = await geminiAnalyze(prompt)
    return NextResponse.json({ analysis: analysis.trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[congress POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
