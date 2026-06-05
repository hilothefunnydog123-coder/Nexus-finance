import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

export const dynamic = 'force-dynamic'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function calcRR(entry: number, sl: number, tp: number, dir: string) {
  const risk   = dir === 'long' ? entry - sl : sl - entry
  const reward = dir === 'long' ? tp - entry : entry - tp
  if (risk <= 0 || reward <= 0) return null
  return (reward / risk).toFixed(2)
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 15, windowMs: 60000, tag: 'tradean' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'AI service unavailable' }, { status: 503 })

  try {
    const { ticker, direction, entry, sl, tp, size, context } = await req.json()
    if (!ticker || !entry || !sl || !tp) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const e   = parseFloat(entry)
    const s   = parseFloat(sl)
    const t   = parseFloat(tp)
    const rr  = calcRR(e, s, t, direction)

    const prompt = `You are a professional forex and financial markets analyst with access to real-time news.

Analyze this trade setup and provide a comprehensive analysis:

TRADE DETAILS:
- Ticker: ${ticker}
- Direction: ${String(direction).toUpperCase()}
- Entry: ${entry}
- Stop Loss: ${sl}
- Take Profit: ${tp}
- Position Size: ${size || 'Not specified'}
- Risk/Reward Ratio: ${rr ? rr + ':1' : 'Unable to calculate'}
- Additional Context: ${context || 'None'}

Please provide a complete analysis in this EXACT JSON format (no markdown, just raw JSON):
{
  "overall_sentiment": "BULLISH" or "BEARISH" or "NEUTRAL",
  "sentiment_score": number from -100 to 100,
  "verdict": "STRONG BUY" or "BUY" or "HOLD" or "SELL" or "STRONG SELL" or "AVOID",
  "summary": "2-3 sentence overall market summary for ${ticker}",
  "news": [{"title":"...","source":"...","sentiment":"...","impact":"...","date":"..."}],
  "trade_analysis": {
    "position_assessment": "...",
    "risk_assessment": "...",
    "market_conditions": "...",
    "confluence_factors": ["..."],
    "risk_factors": ["..."]
  },
  "key_levels": {"strong_support":0,"support":0,"resistance":0,"strong_resistance":0},
  "recommendation": "...",
  "confidence": 0
}
Include 4-6 real recent news items. Be specific with prices and levels for ${ticker}.`

    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[analyzer/trade] Gemini error:', err)
      return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
    }

    const data      = await res.json()
    const rawText   = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return NextResponse.json({ error: 'Could not parse AI response' }, { status: 500 })

    return NextResponse.json(JSON.parse(jsonMatch[0]))
  } catch (e) {
    console.error('[analyzer/trade]', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
