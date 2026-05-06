import { NextResponse } from 'next/server'

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!finnhubKey || finnhubKey.includes('your_') || !geminiKey) {
    return NextResponse.json({ newspaper: null, demo: true })
  }

  try {
    // Fetch live market data
    const [mktRes, newsRes, calRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${finnhubKey}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/calendar/economic?token=${finnhubKey}`).then(r => r.json()).catch(() => ({ economicCalendar: [] })),
    ])

    const [qqqRes, btcRes, nvdaRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=QQQ&token=${finnhubKey}`).then(r => r.json()),
      fetch(`https://finnhub.io/api/v1/quote?symbol=COINBASE:BTC-USD&token=${finnhubKey}`).then(r => r.json()).catch(() => ({})),
      fetch(`https://finnhub.io/api/v1/quote?symbol=NVDA&token=${finnhubKey}`).then(r => r.json()),
    ])

    const headlines = (newsRes || []).slice(0, 12).map((n: { headline: string; summary?: string; source: string }) =>
      `• [${n.source}] ${n.headline}${n.summary ? ' — ' + n.summary.slice(0, 80) : ''}`
    ).join('\n')

    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const pstTime = new Date().toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: '2-digit', minute: '2-digit' })

    const calEvents = (calRes?.economicCalendar || []).slice(0, 5).map((e: { event: string; impact?: string }) => `${e.event} (impact: ${e.impact || 'medium'})`).join(', ')

    const prompt = `You are the head market strategist and editor of YN Finance Daily, a professional financial newspaper for active traders. Generate today's morning edition.

DATE: ${today} | PST Time: ${pstTime}

LIVE MARKET DATA:
- SPY: $${mktRes.c?.toFixed(2)} (${mktRes.dp > 0 ? '+' : ''}${mktRes.dp?.toFixed(2)}%)
- QQQ: $${qqqRes.c?.toFixed(2)} (${qqqRes.dp > 0 ? '+' : ''}${qqqRes.dp?.toFixed(2)}%)
- NVDA: $${nvdaRes.c?.toFixed(2)} (${nvdaRes.dp > 0 ? '+' : ''}${nvdaRes.dp?.toFixed(2)}%)
- BTC: ~$${btcRes.c?.toFixed(0) || 'N/A'}

TODAY'S NEWS:
${headlines}

ECONOMIC CALENDAR: ${calEvents || 'No major scheduled events'}

Generate a newspaper in this EXACT JSON format (no markdown, valid JSON only):
{
  "headline": "<today's single biggest market story in 10 words max>",
  "subheadline": "<supporting context in 15 words max>",
  "edition": "Morning Edition",
  "sections": [
    {
      "title": "MARKET PULSE",
      "icon": "📊",
      "content": "<3-4 sentences: overall market tone, what indices are doing, key levels to watch today>"
    },
    {
      "title": "BREAKING: TOP STORY",
      "icon": "🔴",
      "content": "<4-5 sentences analyzing the most impactful news story for traders today>"
    },
    {
      "title": "STOCK SPOTLIGHT",
      "icon": "⚡",
      "content": "<3-4 sentences: which stock or sector is the most interesting play today and exactly why>"
    },
    {
      "title": "TRADER'S PLAYBOOK",
      "icon": "📋",
      "content": "<3-4 sentences: specific setups, key price levels, and strategies that fit today's market conditions>"
    },
    {
      "title": "RISK RADAR",
      "icon": "⚠️",
      "content": "<2-3 sentences: what could go wrong today, macro risks, levels that would signal danger>"
    },
    {
      "title": "ECONOMIC CALENDAR",
      "icon": "📅",
      "content": "<2-3 sentences: key economic events today, expected impact on markets, what traders should watch>"
    }
  ],
  "marketSentiment": "BULLISH" | "BEARISH" | "NEUTRAL" | "CAUTIOUS",
  "traderTip": "<one sharp, specific trading tip for today's conditions in under 20 words>"
}`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1500, temperature: 0.6 } }) }
    )
    const json = await res.json()
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return NextResponse.json({ newspaper: null, demo: true })

    const newspaper = JSON.parse(match[0])
    newspaper.generatedAt = new Date().toISOString()
    newspaper.date = today

    return NextResponse.json(
      { newspaper, demo: false },
      { headers: { 'Cache-Control': 'public, s-maxage=14400, stale-while-revalidate=3600' } }
    )
  } catch {
    return NextResponse.json({ newspaper: null, demo: true })
  }
}
