import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

async function fh<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return fallback
    return r.json()
  } catch { return fallback }
}

async function gemini(prompt: string): Promise<string> {
  const key = GM || 'AIzaSyD2nxZxQBe03_BVXfQYO7UmMQEgzIQ_S-g'
  // Try 1.5-pro first (reliable), fall back to 1.5-flash
  for (const model of ['gemini-1.5-pro', 'gemini-1.5-flash']) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
        }),
      }
    )
    if (!r.ok) continue
    const d = await r.json()
    const text = d.candidates?.[0]?.content?.parts?.[0]?.text
    if (text) return text
  }
  throw new Error('Gemini unavailable')
}

function extractJson(raw: string): string {
  // Strip markdown code fences
  let s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  // Extract the first { ... } block in case of extra text
  const start = s.indexOf('{')
  const end   = s.lastIndexOf('}')
  if (start !== -1 && end !== -1) s = s.slice(start, end + 1)
  return s
}

export async function POST(req: NextRequest) {
  try {
    const { ticker } = await req.json()
    if (!ticker) return NextResponse.json({ error: 'ticker required' }, { status: 400 })
    const sym = ticker.toUpperCase().trim()

    // Parallel Finnhub fetches
    const [quote, profile, metrics, news, candles] = await Promise.all([
      fh<Record<string, number>>(`/quote?symbol=${sym}`, {}),
      fh<Record<string, string>>(`/stock/profile2?symbol=${sym}`, {}),
      fh<{ metric?: Record<string, number> }>(`/stock/metric?symbol=${sym}&metric=all`, {}),
      fh<{ category?: string; datetime?: number; headline?: string; source?: string; summary?: string }[]>(
        `/company-news?symbol=${sym}&from=${daysAgo(7)}&to=${today()}`, []
      ),
      fh<{ c?: number[]; h?: number[]; l?: number[]; o?: number[]; v?: number[]; t?: number[] }>(
        `/stock/candle?symbol=${sym}&resolution=D&from=${unixDaysAgo(30)}&to=${unixNow()}`, {}
      ),
    ])

    const price        = quote.c ?? 0
    const change1d     = quote.dp ?? 0
    const high52       = metrics.metric?.['52WeekHigh'] ?? 0
    const low52        = metrics.metric?.['52WeekLow'] ?? 0
    const pe           = metrics.metric?.peBasicExclExtraTTM ?? 0
    const eps          = metrics.metric?.epsBasicExclExtraAnnual ?? 0
    const roe          = metrics.metric?.roeRfy ?? 0
    const marketCap    = profile.marketCapitalization ?? '?'
    const beta         = metrics.metric?.beta ?? 1
    const recentNews   = (Array.isArray(news) ? news : []).slice(0, 8)
      .map(n => `• ${n.headline ?? ''} (${n.source ?? ''})`)
      .join('\n')

    const closes = (candles.c ?? []).slice(-20)
    const sma20  = closes.length ? (closes.reduce((a, b) => a + b, 0) / closes.length).toFixed(2) : 'N/A'
    const trend  = closes.length >= 2
      ? closes[closes.length - 1] > closes[0] ? 'uptrend' : 'downtrend'
      : 'unknown'

    const prompt = `You are a team of 5 elite Wall Street analysts. Analyze ${sym} (${profile.name ?? sym}) and return ONLY valid JSON — no markdown, no explanation.

MARKET DATA:
- Price: $${price} | 1-day change: ${change1d.toFixed(2)}%
- 52W High: $${high52} | 52W Low: $${low52}
- 20-day SMA: $${sma20} | Trend: ${trend}
- P/E: ${pe} | EPS: ${eps} | ROE: ${roe}%
- Market Cap: $${marketCap}M | Beta: ${beta}
- Industry: ${profile.finnhubIndustry ?? 'N/A'}

RECENT NEWS (last 7 days):
${recentNews || 'No news available'}

AGENT TASKS:
[Fundamentals Agent] Assess valuation, growth, profitability
[Technical Agent] Assess trend, momentum, key price levels
[Sentiment Agent] Assess news tone and market sentiment
[Risk Agent] Identify top 3 specific risks
[Portfolio Manager] Synthesize everything into a final decision

Return this exact JSON:
{
  "rating": "Buy" | "Overweight" | "Hold" | "Underweight" | "Sell",
  "confidence": <0-100 integer>,
  "price_target": <number>,
  "time_horizon": "<string e.g. '3-6 months'>",
  "executive_summary": "<2-3 sentence action plan>",
  "investment_thesis": "<detailed 4-6 sentence reasoning>",
  "bull_case": "<2 sentences>",
  "bear_case": "<2 sentences>",
  "key_levels": { "support": <number>, "resistance": <number> },
  "risks": ["<risk 1>", "<risk 2>", "<risk 3>"],
  "sentiment": "Bullish" | "Neutral" | "Bearish",
  "fundamentals_score": <0-10>,
  "technical_score": <0-10>,
  "sentiment_score": <0-10>,
  "options": {
    "strategy": "Buy Calls" | "Buy Puts" | "Iron Condor" | "Hold",
    "type": "CALL" | "PUT" | "NEUTRAL",
    "strike_pct": <percent above/below current price for strike, e.g. 5>,
    "expiry_days": <30|45|60>,
    "reasoning": "<1-2 sentences on why this options play>"
  }
}`

    const raw      = await gemini(prompt)
    const analysis = JSON.parse(extractJson(raw))

    // Compute options specifics from the AI recommendation
    const strikeDir = analysis.options?.type === 'PUT' ? -1 : 1
    const strikePct = (analysis.options?.strike_pct ?? 5) / 100
    const strike    = parseFloat((price * (1 + strikeDir * strikePct)).toFixed(2))
    const expiryDays = analysis.options?.expiry_days ?? 45

    return NextResponse.json({
      ticker: sym,
      name: profile.name ?? sym,
      price,
      change1d,
      high52,
      low52,
      sma20,
      trend,
      pe,
      marketCap,
      beta,
      industry: profile.finnhubIndustry ?? 'N/A',
      analysis: {
        ...analysis,
        options: {
          ...analysis.options,
          strike,
          expiry_days: expiryDays,
          breakeven_call: parseFloat((strike + price * 0.04).toFixed(2)),
          breakeven_put:  parseFloat((strike - price * 0.04).toFixed(2)),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: `Analysis failed: ${msg}` }, { status: 500 })
  }
}

function today() { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0] }
function unixNow() { return Math.floor(Date.now() / 1000) }
function unixDaysAgo(n: number) { return Math.floor((Date.now() - n * 86400000) / 1000) }
