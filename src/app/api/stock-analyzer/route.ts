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

function extractJson(raw: string): Record<string, unknown> {
  const s     = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON in response')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc)                  { esc = false; continue }
    if (c === '\\' && inStr)  { esc = true;  continue }
    if (c === '"')            { inStr = !inStr; continue }
    if (inStr)                continue
    if (c === '{') depth++
    if (c === '}') { depth--; if (depth === 0) return JSON.parse(s.slice(start, i + 1)) }
  }
  throw new Error('Malformed JSON in response')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sym  = (body.ticker ?? '').toUpperCase().trim()
    if (!sym) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

    const today   = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [quote, profile, news, recommend, peers] = await Promise.all([
      fhFetch(`/quote?symbol=${sym}`),
      fhFetch(`/stock/profile2?symbol=${sym}`),
      fhFetch(`/company-news?symbol=${sym}&from=${weekAgo}&to=${today}`),
      fhFetch(`/stock/recommendation?symbol=${sym}`),
      fhFetch(`/stock/peers?symbol=${sym}`),
    ])

    const price     = Number(quote?.c  ?? 0)
    const change1d  = Number(quote?.dp ?? 0)
    const high52    = Number(quote?.h  ?? 0)
    const low52     = Number(quote?.l  ?? 0)
    const prevClose = Number(quote?.pc ?? 0)
    const name      = String(profile?.name ?? sym)
    const industry  = String(profile?.finnhubIndustry ?? 'N/A')
    const marketCap = Number(profile?.marketCapitalization ?? 0)
    const pe        = Number(profile?.peRatio ?? 0)
    const beta      = Number(profile?.beta ?? 1)
    const employees = Number(profile?.employeeTotal ?? 0)
    const exchange  = String(profile?.exchange ?? '')
    const website   = String(profile?.weburl ?? '')

    const rec = Array.isArray(recommend) && recommend[0]
    const analystBuy    = rec ? Number(rec.buy ?? 0) + Number(rec.strongBuy ?? 0) : 0
    const analystHold   = rec ? Number(rec.hold ?? 0) : 0
    const analystSell   = rec ? Number(rec.sell ?? 0) + Number(rec.strongSell ?? 0) : 0
    const analystTotal  = analystBuy + analystHold + analystSell

    const peerList = (Array.isArray(peers) ? peers : []).slice(0, 4).join(', ')
    const pct52    = high52 > low52 ? (((price - low52) / (high52 - low52)) * 100).toFixed(1) : '50'

    const headlines = (Array.isArray(news) ? news : [])
      .slice(0, 6)
      .map((n: { headline?: string; source?: string }) => `• ${n.headline ?? ''} [${n.source ?? ''}]`)
      .join('\n') || '• No recent news found'

    const prompt = `You are a hedge fund research team of 5 specialists providing STOCK-SPECIFIC analysis of ${sym} (${name}).
Do NOT use generic language. Every insight must reference ${sym} specifically.
Return ONLY a raw JSON object — no markdown, no explanation text before or after.

=== LIVE MARKET DATA FOR ${sym} ===
Price: $${price.toFixed(2)} | Day Change: ${change1d.toFixed(2)}% | Prev Close: $${prevClose.toFixed(2)}
52-Week Range: $${low52.toFixed(2)} – $${high52.toFixed(2)} | Position in Range: ${pct52}%
Market Cap: $${(marketCap / 1000).toFixed(2)}B | P/E Ratio: ${pe > 0 ? pe.toFixed(1) : 'N/A (unprofitable or N/A)'}
Beta: ${beta.toFixed(2)} | Employees: ${employees.toLocaleString()} | Exchange: ${exchange}
Industry: ${industry} | Peers: ${peerList || 'N/A'}
Wall Street Analysts: ${analystTotal > 0 ? `${analystBuy} Buy / ${analystHold} Hold / ${analystSell} Sell` : 'No analyst data'}
Website: ${website}

=== RECENT NEWS (${weekAgo} to ${today}) ===
${headlines}

=== YOUR TASK ===
[Fundamentals Agent] Evaluate ${sym}'s valuation vs peers, revenue quality, balance sheet strength
[Technical Agent] Identify ${sym}'s trend, momentum, support/resistance using the 52W range and price action
[Sentiment Agent] Assess the news tone and market narrative specifically around ${sym}
[Risk Agent] Identify the 3 most pressing risks specific to ${sym} right now (not generic market risks)
[Portfolio Manager] Synthesize into a decisive, specific recommendation with exact price targets

=== OUTPUT FORMAT ===
Return this exact JSON structure with ALL fields populated using real analysis (not placeholders):
{
  "rating": <exactly one of: "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell">,
  "confidence": <integer 1-100 reflecting signal conviction>,
  "price_target": <specific 12-month price target in dollars based on valuation>,
  "price_target_bear": <bear case 12-month target>,
  "price_target_bull": <bull case 12-month target>,
  "time_horizon": <specific holding period e.g. "4-8 weeks" or "6-12 months">,
  "executive_summary": <3 sentences: what ${sym} is, why now, what to do — be specific>,
  "investment_thesis": <5-6 sentences of detailed reasoning anchored in the data above>,
  "bull_case": <2 specific sentences on the upside scenario for ${sym}>,
  "bear_case": <2 specific sentences on the downside scenario for ${sym}>,
  "entry_low": <specific lower bound of ideal entry price>,
  "entry_high": <specific upper bound of ideal entry price>,
  "stop_loss": <specific stop loss price>,
  "take_profit_1": <first profit target>,
  "take_profit_2": <second, higher profit target>,
  "position_size_pct": <recommended portfolio allocation % e.g. 3>,
  "key_levels": {
    "strong_support": <major support level>,
    "support": <near support>,
    "resistance": <near resistance>,
    "strong_resistance": <major resistance>
  },
  "risks": [
    <specific risk 1 mentioning ${sym} by name>,
    <specific risk 2>,
    <specific risk 3>
  ],
  "catalysts": [
    <upcoming catalyst 1 e.g. earnings, product launch, macro event>,
    <upcoming catalyst 2>
  ],
  "sentiment": <exactly one of: "Very Bullish" | "Bullish" | "Neutral" | "Bearish" | "Very Bearish">,
  "fundamentals_score": <integer 1-10>,
  "technical_score": <integer 1-10>,
  "sentiment_score": <integer 1-10>,
  "analyst_consensus": <"Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell" based on the analyst data or "No Data">,
  "vs_sector": <"Outperform" | "In-Line" | "Underperform">,
  "timeframes": {
    "1_week": <"Bullish" | "Neutral" | "Bearish">,
    "1_month": <"Bullish" | "Neutral" | "Bearish">,
    "3_months": <"Bullish" | "Neutral" | "Bearish">,
    "6_months": <"Bullish" | "Neutral" | "Bearish">
  },
  "options": {
    "strategy": <e.g. "Buy Calls" | "Buy Puts" | "Bull Call Spread" | "Bear Put Spread" | "Iron Condor" | "Cash-Secured Put">,
    "type": <"CALL" | "PUT" | "NEUTRAL">,
    "strike_pct": <OTM % for strike — integer>,
    "expiry_days": <30 | 45 | 60 | 90>,
    "iv_environment": <"Low — good to buy premium" | "Elevated — consider spreads" | "High — sell premium">,
    "reasoning": <2 sentences explaining this specific options play for ${sym}>
  }
}`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 2000 },
        }),
      }
    )

    if (!geminiRes.ok) {
      const errText = await geminiRes.text()
      return NextResponse.json({ error: `Gemini ${geminiRes.status}: ${errText.slice(0, 300)}` }, { status: 500 })
    }

    const geminiData = await geminiRes.json()
    const rawText    = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!rawText) return NextResponse.json({ error: 'Empty Gemini response' }, { status: 500 })

    const analysis = extractJson(rawText)

    const opts      = (analysis.options ?? {}) as Record<string, unknown>
    const isBull    = (opts.type as string) !== 'PUT'
    const strikeMul = isBull
      ? 1 + (Number(opts.strike_pct ?? 5) / 100)
      : 1 - (Number(opts.strike_pct ?? 5) / 100)
    const strike     = parseFloat((price * strikeMul).toFixed(2))
    const estPremium = parseFloat((price * 0.025).toFixed(2))

    return NextResponse.json({
      ticker: sym, name, price, change1d, prevClose,
      high52, low52, pe, marketCap, beta, industry,
      analystBuy, analystHold, analystSell, analystTotal, peerList,
      analysis: {
        ...analysis,
        options: {
          ...opts, strike,
          expiry_days:    Number(opts.expiry_days ?? 45),
          est_premium:    estPremium,
          breakeven_call: parseFloat((strike + estPremium).toFixed(2)),
          breakeven_put:  parseFloat((strike - estPremium).toFixed(2)),
          max_loss:       parseFloat((estPremium * 100).toFixed(0)),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
