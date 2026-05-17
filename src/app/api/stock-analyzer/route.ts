import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

async function fhFetch(path: string) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

function extractJson(raw: string): object {
  const s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end   = s.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON object found in response')
  return JSON.parse(s.slice(start, end + 1))
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sym  = (body.ticker ?? '').toUpperCase().trim()
    if (!sym) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

    const today    = new Date().toISOString().split('T')[0]
    const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [quote, profile, news] = await Promise.all([
      fhFetch(`/quote?symbol=${sym}`),
      fhFetch(`/stock/profile2?symbol=${sym}`),
      fhFetch(`/company-news?symbol=${sym}&from=${weekAgo}&to=${today}`),
    ])

    const price     = Number(quote?.c  ?? 0)
    const change1d  = Number(quote?.dp ?? 0)
    const high52    = Number(quote?.h  ?? 0)
    const low52     = Number(quote?.l  ?? 0)
    const name      = String(profile?.name ?? sym)
    const industry  = String(profile?.finnhubIndustry ?? 'N/A')
    const marketCap = Number(profile?.marketCapitalization ?? 0)
    const pe        = Number(profile?.peRatio ?? 0)
    const beta      = Number(profile?.beta ?? 1)

    const headlines = (Array.isArray(news) ? news : [])
      .slice(0, 5).map((n: { headline?: string }) => `- ${n.headline ?? ''}`).join('\n') || 'None'

    const prompt = `Analyze ${sym} (${name}, ${industry}) as 5 Wall Street agents. Return ONLY valid JSON, no markdown.

Price: $${price} | Change: ${change1d.toFixed(2)}% | 52W: $${low52}-$${high52}
Market Cap: $${(marketCap / 1000).toFixed(1)}B | P/E: ${pe || 'N/A'} | Beta: ${beta}
News: ${headlines}

JSON schema (fill all fields with real values):
{
  "rating": "Buy",
  "confidence": 75,
  "price_target": 0.0,
  "time_horizon": "3-6 months",
  "executive_summary": "...",
  "investment_thesis": "...",
  "bull_case": "...",
  "bear_case": "...",
  "key_levels": { "support": 0.0, "resistance": 0.0 },
  "risks": ["...", "...", "..."],
  "sentiment": "Bullish",
  "fundamentals_score": 7,
  "technical_score": 6,
  "sentiment_score": 7,
  "options": {
    "strategy": "Buy Calls",
    "type": "CALL",
    "strike_pct": 5,
    "expiry_days": 45,
    "reasoning": "..."
  }
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1200 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return NextResponse.json({ error: `Gemini ${geminiRes.status}: ${errText.slice(0, 200)}` }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!rawText) return NextResponse.json({ error: 'Empty response from Gemini' }, { status: 500 })

    const analysis = extractJson(rawText) as Record<string, unknown>

    const opts      = analysis.options as Record<string, unknown> ?? {}
    const isBull    = (opts.type as string) !== 'PUT'
    const strikeMul = isBull
      ? 1 + (Number(opts.strike_pct ?? 5) / 100)
      : 1 - (Number(opts.strike_pct ?? 5) / 100)
    const strike     = parseFloat((price * strikeMul).toFixed(2))
    const estPremium = parseFloat((price * 0.03).toFixed(2))

    return NextResponse.json({
      ticker: sym, name, price, change1d, high52, low52,
      pe, marketCap, beta, industry,
      analysis: {
        ...analysis,
        options: {
          ...opts,
          strike,
          expiry_days: Number(opts.expiry_days ?? 45),
          est_premium: estPremium,
          breakeven_call: parseFloat((strike + estPremium).toFixed(2)),
          breakeven_put:  parseFloat((strike - estPremium).toFixed(2)),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
