import { NextResponse } from 'next/server'

const SYMBOLS = ['NVDA', 'AAPL', 'TSLA', 'META', 'AMD', 'MSFT', 'GOOGL', 'SPY', 'QQQ', 'AMZN']

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!finnhubKey || finnhubKey.includes('your_') || !geminiKey) {
    return NextResponse.json({ ideas: [], demo: true })
  }

  try {
    // Fetch real quotes for all symbols in parallel
    const quotes = await Promise.all(
      SYMBOLS.map(s =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${finnhubKey}`, { next: { revalidate: 60 } })
          .then(r => r.json())
          .then(q => ({ symbol: s, price: q.c, change: q.d, changePct: q.dp, high: q.h, low: q.l, prevClose: q.pc }))
          .catch(() => null)
      )
    )

    const valid = quotes.filter(q => q && q.price > 0 && q.changePct !== null) as NonNullable<typeof quotes[0]>[]
    if (!valid.length) return NextResponse.json({ ideas: [], demo: true })

    // Pick the 4 with the most interesting moves (biggest absolute % change)
    const picks = [...valid].sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct)).slice(0, 4)

    // Fetch recent market news for context
    const news = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`)
      .then(r => r.json()).then(n => n.slice(0, 4).map((i: { headline: string }) => i.headline).join(' | ')).catch(() => '')

    const prompt = `You are an expert day and swing trader. Generate ${picks.length} specific trade ideas based on this REAL live market data. Return ONLY a valid JSON array, no markdown, no explanation.

LIVE market data (use these exact prices for your entries/stops/targets):
${picks.map(q => `${q.symbol}: price=$${q.price?.toFixed(2)}, change=${q.change > 0 ? '+' : ''}$${q.change?.toFixed(2)} (${q.changePct?.toFixed(2)}%), high=$${q.high?.toFixed(2)}, low=$${q.low?.toFixed(2)}, prevClose=$${q.prevClose?.toFixed(2)}`).join('\n')}

Market context: ${news}

Return JSON array (${picks.length} objects):
[{"ticker":"SYMBOL","side":"long or short","entry":<number>,"sl":<number>,"tp":<number>,"timeframe":"5M|15M|1H|4H|1D","thesis":"<2 specific sentences referencing the actual price action>","strategy":"Gap & Go|Wick Rejection|VWAP Reclaim|Trend Follow|Support Bounce|Breakout|Pullback Entry","confidence":<60-92>}]

Rules: entry must be close to real current price, use min 1.5:1 R:R, short if price is falling, long if rising.`

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 900, temperature: 0.3 } }) }
    )
    const geminiJson = await geminiRes.json()
    const raw = geminiJson.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ ideas: [], demo: true })

    const parsed = JSON.parse(match[0])
    const ideas = parsed.map((idea: Record<string, unknown>, i: number) => ({
      id: `ai_${Date.now()}_${i}`,
      author: 'YN AI',
      ...idea,
      postedAt: new Date().toISOString(),
      upvotes: 0,
      userVoted: false,
      outcome: 'open',
      aiGenerated: true,
      tags: [String(idea.strategy ?? '').toLowerCase().replace(/ /g, '-'), String(idea.side), String(idea.timeframe ?? '').toLowerCase()].filter(Boolean),
    }))

    return NextResponse.json({ ideas, demo: false, generatedAt: new Date().toISOString() })
  } catch {
    return NextResponse.json({ ideas: [], demo: true })
  }
}
