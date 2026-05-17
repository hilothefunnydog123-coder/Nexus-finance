import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY || 'AIzaSyD2nxZxQBe03_BVXfQYO7UmMQEgzIQ_S-g'

async function fh<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    })
    if (!r.ok) return fallback
    return r.json()
  } catch { return fallback }
}

function extractJson(raw: string): string {
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  const end   = s.lastIndexOf('}')
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1)
  return s
}

export async function POST(req: NextRequest) {
  try {
    const { ticker } = await req.json()
    if (!ticker) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })
    const sym = ticker.toUpperCase().trim()

    // Fast parallel fetches — only what we need
    const [quote, profile, news] = await Promise.all([
      fh<Record<string, number>>(`/quote?symbol=${sym}`, {}),
      fh<Record<string, string | number>>(`/stock/profile2?symbol=${sym}`, {}),
      fh<{ headline?: string; source?: string }[]>(
        `/company-news?symbol=${sym}&from=${daysAgo(5)}&to=${today()}`, []
      ),
    ])

    const price    = Number(quote.c   ?? 0)
    const change1d = Number(quote.dp  ?? 0)
    const high52   = Number(quote.h   ?? 0)
    const low52    = Number(quote.l   ?? 0)
    const prevClose = Number(quote.pc ?? 0)
    const marketCap = Number(profile.marketCapitalization ?? 0)
    const industry  = String(profile.finnhubIndustry ?? 'N/A')
    const name      = String(profile.name ?? sym)
    const pe        = Number(profile.peRatio ?? 0)
    const beta      = Number(profile.beta    ?? 1)

    const recentNews = (Array.isArray(news) ? news : [])
      .slice(0, 6)
      .map(n => `• ${n.headline ?? ''}`)
      .join('\n') || 'No recent news'

    const pricePct52 = high52 > 0
      ? (((price - low52) / (high52 - low52)) * 100).toFixed(0)
      : '50'

    const prompt = `You are 5 elite Wall Street analysts. Analyze ${sym} (${name}) and return ONLY a valid JSON object with no markdown, no extra text.

DATA:
Price: $${price} | Change: ${change1d.toFixed(2)}% | Prev Close: $${prevClose}
52W Range: $${low52} – $${high52} (currently at ${pricePct52}% of range)
Market Cap: $${(marketCap / 1000).toFixed(1)}B | P/E: ${pe || 'N/A'} | Beta: ${beta}
Industry: ${industry}

RECENT NEWS:
${recentNews}

Return ONLY this JSON (fill every field):
{"rating":"Buy","confidence":72,"price_target":195.00,"time_horizon":"3-6 months","executive_summary":"2-3 sentence action plan.","investment_thesis":"4-5 sentence detailed reasoning.","bull_case":"2 sentence upside scenario.","bear_case":"2 sentence downside scenario.","key_levels":{"support":170.00,"resistance":200.00},"risks":["Risk one","Risk two","Risk three"],"sentiment":"Bullish","fundamentals_score":7,"technical_score":6,"sentiment_score":7,"options":{"strategy":"Buy Calls","type":"CALL","strike_pct":5,"expiry_days":45,"reasoning":"1-2 sentence options rationale."}}`

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 1500 },
        }),
      }
    )

    if (!r.ok) {
      const errBody = await r.text()
      return NextResponse.json({ error: `Gemini error ${r.status}: ${errBody.slice(0, 200)}` }, { status: 500 })
    }

    const d    = await r.json()
    const raw  = d.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!raw) return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 500 })

    let analysis
    try {
      analysis = JSON.parse(extractJson(raw))
    } catch {
      return NextResponse.json({ error: `JSON parse failed. Raw: ${raw.slice(0, 300)}` }, { status: 500 })
    }

    const strikeDir  = analysis.options?.type === 'PUT' ? -1 : 1
    const strikePct  = (analysis.options?.strike_pct ?? 5) / 100
    const strike     = parseFloat((price * (1 + strikeDir * strikePct)).toFixed(2))
    const expiryDays = analysis.options?.expiry_days ?? 45
    const estPremium = parseFloat((price * 0.03).toFixed(2))

    return NextResponse.json({
      ticker: sym, name, price, change1d, high52, low52,
      pe, marketCap, beta, industry,
      analysis: {
        ...analysis,
        options: {
          ...analysis.options,
          strike,
          expiry_days: expiryDays,
          est_premium: estPremium,
          breakeven_call: parseFloat((strike + estPremium).toFixed(2)),
          breakeven_put:  parseFloat((strike - estPremium).toFixed(2)),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 })
  }
}

function today()          { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
