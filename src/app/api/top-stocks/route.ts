import { NextResponse } from 'next/server'

const UNIVERSE = [
  'NVDA','AAPL','MSFT','META','GOOGL','AMZN','TSLA','AMD','PLTR','ARM',
  'SMCI','MSTR','COIN','HOOD','SOFI','RBLX','SNAP','UBER','LYFT','ROKU',
  'CRWD','PANW','ZS','NET','DDOG','SHOP','SQ','PYPL','AFRM','UPST',
  'MELI','SE','NU','CELH','HIMS','IONQ','QUBT','RGTI','BBAI','SOUN',
]

export async function GET() {
  const finnhubKey = process.env.FINNHUB_API_KEY
  const geminiKey = process.env.GEMINI_API_KEY
  if (!finnhubKey || finnhubKey.includes('your_') || !geminiKey) {
    return NextResponse.json({ stocks: [], demo: true }, { headers: { 'Cache-Control': 'public, max-age=3600' } })
  }

  try {
    // Batch fetch all quotes
    const quotes = (await Promise.all(
      UNIVERSE.map(s =>
        fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${finnhubKey}`)
          .then(r => r.json())
          .then(q => ({ symbol: s, price: q.c, change: q.d, changePct: q.dp, high: q.h, low: q.l, prevClose: q.pc, open: q.o }))
          .catch(() => null)
      )
    )).filter(q => q && q.price > 0) as { symbol: string; price: number; change: number; changePct: number; high: number; low: number; prevClose: number; open: number }[]

    // Fetch recent news for context
    const news = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${finnhubKey}`)
      .then(r => r.json())
      .then(n => n.slice(0, 8).map((i: { headline: string; related?: string }) => `${i.related || 'MARKET'}: ${i.headline}`).join('\n'))
      .catch(() => '')

    // Calculate quant metrics
    const withMetrics = quotes.map(q => ({
      ...q,
      momentum: q.changePct,
      volFromOpen: q.prevClose > 0 ? ((q.price - q.prevClose) / q.prevClose * 100).toFixed(2) : '0',
      intraRange: q.high > q.low ? (((q.price - q.low) / (q.high - q.low)) * 100).toFixed(0) : '50',
    }))

    // SPY as benchmark
    const spy = withMetrics.find(q => q.symbol === 'SPY')
    const spyPct = spy?.changePct ?? 0

    // Score each stock: momentum, relative strength vs SPY, intraday position
    const scored = withMetrics
      .filter(q => q.symbol !== 'SPY' && q.symbol !== 'QQQ')
      .map(q => ({
        ...q,
        relativeStrength: parseFloat((q.changePct - spyPct).toFixed(2)),
        score: Math.abs(q.changePct) * 0.4 + (q.changePct - spyPct) * 0.4 + (parseFloat(q.intraRange) / 100) * 0.2,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20)

    const prompt = `You are a quantitative hedge fund analyst and technical analyst combined. Analyze these stocks and select the TOP 10 that have the highest potential to see significant price appreciation in the next 1-30 days based on momentum, technical setup, and market context.

LIVE MARKET DATA (today):
SPY: $${spy?.price?.toFixed(2)} (${spyPct > 0 ? '+' : ''}${spyPct?.toFixed(2)}%)

Top candidates by momentum score:
${scored.slice(0, 20).map(q => `${q.symbol}: $${q.price?.toFixed(2)} | ${q.changePct > 0 ? '+' : ''}${q.changePct?.toFixed(2)}% today | RS vs SPY: ${q.relativeStrength > 0 ? '+' : ''}${q.relativeStrength}% | Intraday position: ${q.intraRange}% of range`).join('\n')}

Recent market news:
${news}

Return ONLY valid JSON array with exactly 10 objects, ranked #1 (highest conviction) to #10:
[{
  "rank": 1,
  "symbol": "TICKER",
  "signal": "STRONG BUY" | "BUY" | "WATCH",
  "price": <current price number>,
  "thesis": "<2 specific sentences: why this stock could explode, referencing actual price action and catalysts>",
  "horizon": "1-3 days" | "1-2 weeks" | "1 month",
  "catalyst": "<specific catalyst in under 8 words>",
  "risk": "<biggest risk in under 8 words>",
  "technicalScore": <1-10>,
  "momentumScore": <1-10>,
  "confidence": <60-95>
}]`

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 1200, temperature: 0.4 } }) }
    )
    const json = await res.json()
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const match = raw.match(/\[[\s\S]*\]/)
    if (!match) return NextResponse.json({ stocks: [], demo: true })

    const stocks = JSON.parse(match[0])

    return NextResponse.json(
      { stocks, generatedAt: new Date().toISOString(), demo: false },
      { headers: { 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600' } }
    )
  } catch {
    return NextResponse.json({ stocks: [], demo: true })
  }
}
