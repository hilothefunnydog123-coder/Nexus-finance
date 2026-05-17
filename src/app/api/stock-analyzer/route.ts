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
  const s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON in response')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc)                 { esc = false; continue }
    if (c === '\\' && inStr) { esc = true;  continue }
    if (c === '"')           { inStr = !inStr; continue }
    if (inStr)               continue
    if (c === '{') depth++
    if (c === '}') { depth--; if (depth === 0) return JSON.parse(s.slice(start, i + 1)) }
  }
  throw new Error('Malformed JSON in response')
}

async function callGemini(prompt: string): Promise<string> {
  // Try nano-banana first (fast + creative), fall back to 2.0-flash
  const models = ['nano-banana-pro-preview', 'gemini-2.0-flash']
  for (const model of models) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GM}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { temperature: 0.8, maxOutputTokens: 2500 },
          }),
        }
      )
      if (!r.ok) continue
      const d = await r.json()
      const text = d?.candidates?.[0]?.content?.parts?.[0]?.text
      if (text) return text
    } catch { continue }
  }
  throw new Error('All Gemini models failed')
}

export async function POST(req: NextRequest) {
  try {
    const body  = await req.json()
    const sym   = (body.ticker ?? '').toUpperCase().trim()
    const tf    = (body.timeframe ?? '3M') as string  // 1M | 3M | 6M | 1Y
    if (!sym) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

    const today    = new Date()
    const tfDays   = tf === '1M' ? 30 : tf === '3M' ? 90 : tf === '6M' ? 180 : 365
    const fromDate = new Date(Date.now() - tfDays * 86400000)
    const toUnix   = Math.floor(today.getTime() / 1000)
    const frUnix   = Math.floor(fromDate.getTime() / 1000)
    const todayStr = today.toISOString().split('T')[0]
    const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

    const [quote, profile, news, recommend, candles] = await Promise.all([
      fhFetch(`/quote?symbol=${sym}`),
      fhFetch(`/stock/profile2?symbol=${sym}`),
      fhFetch(`/company-news?symbol=${sym}&from=${weekAgo}&to=${todayStr}`),
      fhFetch(`/stock/recommendation?symbol=${sym}`),
      fhFetch(`/stock/candle?symbol=${sym}&resolution=D&from=${frUnix}&to=${toUnix}`),
    ])

    const price    = Number(quote?.c  ?? 0)
    const change1d = Number(quote?.dp ?? 0)
    const high52   = Number(quote?.h  ?? 0)
    const low52    = Number(quote?.l  ?? 0)
    const prevClose= Number(quote?.pc ?? 0)
    const name     = String(profile?.name ?? sym)
    const industry = String(profile?.finnhubIndustry ?? 'N/A')
    const marketCap= Number(profile?.marketCapitalization ?? 0)
    const pe       = Number(profile?.peRatio ?? 0)
    const beta     = Number(profile?.beta ?? 1)

    const rec         = Array.isArray(recommend) && recommend[0]
    const analystBuy  = rec ? Number(rec.buy ?? 0) + Number(rec.strongBuy ?? 0) : 0
    const analystHold = rec ? Number(rec.hold ?? 0) : 0
    const analystSell = rec ? Number(rec.sell ?? 0) + Number(rec.strongSell ?? 0) : 0
    const analystTotal= analystBuy + analystHold + analystSell

    // Build candle array
    const candleArr: { t: number; o: number; h: number; l: number; c: number }[] = []
    if (candles?.s === 'ok' && Array.isArray(candles.t)) {
      for (let i = 0; i < candles.t.length; i++) {
        candleArr.push({
          t: candles.t[i],
          o: candles.o[i],
          h: candles.h[i],
          l: candles.l[i],
          c: candles.c[i],
        })
      }
    }

    const headlines = (Array.isArray(news) ? news : [])
      .slice(0, 7)
      .map((n: { headline?: string; source?: string }) => `• ${n.headline ?? ''} [${n.source ?? ''}]`)
      .join('\n') || '• No recent news'

    const pct52 = high52 > low52 ? (((price - low52) / (high52 - low52)) * 100).toFixed(1) : '50'

    const prompt = `You are an elite buy-side research team at a top hedge fund. Produce a SPECIFIC, DATA-DRIVEN analysis of ${sym} (${name}, ${industry}).

LIVE DATA FOR ${sym}:
Price: $${price.toFixed(2)} | Day: ${change1d.toFixed(2)}% | Prev Close: $${prevClose.toFixed(2)}
52W Range: $${low52.toFixed(2)}–$${high52.toFixed(2)} | Position: ${pct52}% of range
Market Cap: $${(marketCap/1000).toFixed(2)}B | P/E: ${pe > 0 ? pe.toFixed(1) : 'N/A'} | Beta: ${beta.toFixed(2)}
Industry: ${industry}
Analysts: ${analystTotal > 0 ? `${analystBuy} Buy / ${analystHold} Hold / ${analystSell} Sell (${analystTotal} total)` : 'No data'}
Chart: ${candleArr.length > 0 ? `${candleArr.length} daily bars, last close $${candleArr.at(-1)?.c.toFixed(2) ?? price}` : 'No candle data'}

RECENT NEWS:
${headlines}

AGENT MANDATES (each must contribute unique insight):
[Fundamentals] Specific valuation vs sector peers — is ${sym} cheap/expensive RIGHT NOW?
[Technical] Exact trend, momentum signal, and nearest support/resistance from the 52W data
[Sentiment] What is the market narrative around ${sym} based on the news above?
[Risk] Name THREE risks SPECIFIC to ${sym} — not generic market risks
[Portfolio Mgr] Decisive call with EXACT price levels — no round numbers, no hedging

CRITICAL RULES:
- Every price level must be derived from ${sym}'s actual price ($${price.toFixed(2)})
- entry_low must be below current price for Buy ratings (scaled to realistic pullback)
- stop_loss must be below entry_low (meaningful risk level)
- take_profit_1 must be between current price and price_target
- take_profit_2 must be above take_profit_1
- confidence must reflect actual signal strength (not always 75)
- risks must name ${sym} specifically (not generic)
- options strike_pct: 3-8% OTM only

Return ONLY this JSON object, no extra text:
{
  "rating": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell",
  "confidence": <integer 1-100>,
  "price_target": <number derived from valuation>,
  "price_target_bear": <number lower than current price for Sell, or modest for Hold>,
  "price_target_bull": <number above price_target for upside scenario>,
  "time_horizon": <"2-4 weeks" | "1-3 months" | "3-6 months" | "6-12 months">,
  "executive_summary": <3 sentences — what is ${sym} right now, what is the specific setup, what exactly to do>,
  "investment_thesis": <5 sentences — anchor EVERY claim in the data above>,
  "bull_case": <2 sentences mentioning ${sym} and specific catalysts>,
  "bear_case": <2 sentences with specific ${sym} risk scenarios>,
  "entry_low": <number — ideal entry lower bound>,
  "entry_high": <number — ideal entry upper bound, must be below price for Buy>,
  "stop_loss": <number — below entry_low>,
  "take_profit_1": <number — first target>,
  "take_profit_2": <number — second, higher target>,
  "position_size_pct": <number 1-5>,
  "key_levels": {
    "strong_support": <number>,
    "support": <number>,
    "resistance": <number>,
    "strong_resistance": <number>
  },
  "risks": ["<${sym}-specific risk 1>", "<${sym}-specific risk 2>", "<${sym}-specific risk 3>"],
  "catalysts": ["<upcoming catalyst 1>", "<upcoming catalyst 2>"],
  "sentiment": "Very Bullish" | "Bullish" | "Neutral" | "Bearish" | "Very Bearish",
  "fundamentals_score": <1-10>,
  "technical_score": <1-10>,
  "sentiment_score": <1-10>,
  "analyst_consensus": "Strong Buy" | "Buy" | "Hold" | "Sell" | "Strong Sell" | "No Data",
  "vs_sector": "Outperform" | "In-Line" | "Underperform",
  "timeframes": {
    "1_week": "Bullish" | "Neutral" | "Bearish",
    "1_month": "Bullish" | "Neutral" | "Bearish",
    "3_months": "Bullish" | "Neutral" | "Bearish",
    "6_months": "Bullish" | "Neutral" | "Bearish"
  },
  "options": {
    "strategy": <e.g. "Buy Calls" | "Buy Puts" | "Bull Call Spread" | "Bear Put Spread" | "Cash-Secured Put">,
    "type": "CALL" | "PUT" | "NEUTRAL",
    "strike_pct": <integer 3-8>,
    "expiry_days": <30 | 45 | 60>,
    "iv_environment": "Low — good to buy premium" | "Elevated — consider spreads" | "High — sell premium",
    "reasoning": <2 sentences specific to ${sym}>
  }
}`

    const raw      = await callGemini(prompt)
    const analysis = extractJson(raw)

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
      analystBuy, analystHold, analystSell, analystTotal,
      candles: candleArr.slice(-120),  // max 120 bars
      timeframe: tf,
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
