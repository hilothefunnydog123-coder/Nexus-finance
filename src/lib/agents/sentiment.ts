import type { AgentSignal } from './types'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

type NewsItem = { headline: string; related: string; source: string; summary: string }

export async function runSentimentAgent(): Promise<AgentSignal[]> {
  const signals: AgentSignal[] = []
  const finnhubKey = process.env.FINNHUB_API_KEY
  const geminiKey  = process.env.GEMINI_API_KEY
  if (!finnhubKey || !geminiKey) return signals

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/news?category=company&minId=0&token=${finnhubKey}`,
      { signal: AbortSignal.timeout(8000) }
    )
    if (!res.ok) return signals

    const articles: NewsItem[] = await res.json()

    // Group articles by ticker
    const byTicker: Record<string, NewsItem[]> = {}
    for (const a of articles) {
      if (!a.related || a.related.length > 6) continue
      const t = a.related.toUpperCase()
      if (!byTicker[t]) byTicker[t] = []
      byTicker[t].push(a)
    }

    // Only score tickers with 2+ articles; limit Gemini calls to 4
    const candidates = Object.entries(byTicker)
      .filter(([, arts]) => arts.length >= 2)
      .slice(0, 4)

    for (const [ticker, arts] of candidates) {
      const headlines = arts.slice(0, 5).map(a => `- ${a.headline}`).join('\n')

      const prompt = `Analyze sentiment for ${ticker} from these headlines and return ONLY valid JSON:
${headlines}

Return: {"score":<-100 to 100>,"summary":"<max 8 words>"}`

      try {
        const gRes = await fetch(`${GEMINI_URL}?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { maxOutputTokens: 80, temperature: 0.1 },
          }),
          signal: AbortSignal.timeout(8000),
        })
        if (!gRes.ok) continue

        const gData = await gRes.json()
        const raw   = gData.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
        const match = raw.match(/\{[\s\S]*?\}/)
        if (!match) continue

        const { score, summary } = JSON.parse(match[0])
        if (typeof score !== 'number' || Math.abs(score) < 45) continue

        const label      = score > 0 ? 'BULLISH' : 'BEARISH'
        const conviction: 1 | 2 | 3 = Math.abs(score) > 70 ? 3 : 2

        signals.push({
          agent_name: 'sentiment',
          ticker,
          signal_text: `${ticker} sentiment ${score > 0 ? '+' : ''}${score} across ${arts.length} articles — ${label}: ${summary}`,
          conviction,
          raw_data: { score, articleCount: arts.length, summary },
        })
      } catch {
        // Skip on Gemini timeout or parse error
      }
    }
  } catch (e) {
    console.error('[SentimentAgent]', e)
  }

  return signals
}
