import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/ratelimit'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'
const GEMINI_SEARCH_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

async function callGeminiSearch(prompt: string, imageBase64?: string, tokens = 4096): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return JSON.stringify({ error: 'AI unavailable — add GEMINI_API_KEY to environment variables.' })
  const parts: object[] = imageBase64
    ? [{ inline_data: { mime_type: 'image/png', data: imageBase64 } }, { text: prompt }]
    : [{ text: prompt }]
  const res = await fetch(`${GEMINI_SEARCH_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      tools: [{ google_search: {} }],
      generationConfig: { maxOutputTokens: tokens, temperature: 0.3 },
    }),
  })
  if (!res.ok) return JSON.stringify({ error: 'Could not reach AI — try again.' })
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '{}'
}

async function callGemini(prompt: string, imageBase64?: string, tokens = 350): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return 'AI unavailable — add GEMINI_API_KEY to Netlify environment variables.'
  const parts: object[] = imageBase64
    ? [{ inline_data: { mime_type: 'image/png', data: imageBase64 } }, { text: prompt }]
    : [{ text: prompt }]
  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts }], generationConfig: { maxOutputTokens: tokens, temperature: 0.65 } }),
  })
  if (!res.ok) return 'Could not reach AI — try again.'
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response generated.'
}

export async function POST(req: NextRequest) {
  const rl = rateLimit(req, { limit: 20, windowMs: 60000, tag: 'gemini' })
  if (!rl.ok) return NextResponse.json({ error: 'Too many requests — please wait a moment.' }, { status: 429, headers: { 'Retry-After': String(rl.retryAfter) } })
  const { type, data } = await req.json()
  let result: Record<string, string> = {}

  switch (type) {
    case 'trade_log':
      result.feedback = await callGemini(`You are a strict but fair trading coach reviewing a student's paper trade. Be specific and concise (3–4 sentences). Rate their reasoning 1–10 and give actionable improvement tips.
Trade: Entry reason: "${data.entryReason}" | Strategy match: "${data.strategyMatch}" | Mistakes: "${data.mistakes}" | Result: ${data.result} | Strategy: ${data.strategy}`)
      break

    case 'trader_sim':
      result.feedback = await callGemini(`You are roleplaying as ${data.trader}. A student answered: "${data.userAnswer}" to: "${data.question}". Respond in first person as ${data.trader} — compare their thinking to your actual methodology. Under 5 sentences.`)
      break

    case 'replay':
      result.feedback = await callGemini(`Trading replay feedback: Student predicted "${data.prediction}" on ${data.instrument} ${data.timeframe}, reasoning: "${data.reasoning}". Actual: "${data.outcome}". 3-4 sentences: was their process sound? What did they miss? What to improve?`)
      break

    case 'morning_brief':
      result.brief = await callGemini(`You are a professional trading desk analyst. Generate a sharp 3-sentence morning brief for active traders. Be specific about actionable setups, not generic market commentary.
Live data — SPY: $${data.spy?.price?.toFixed(2)} (${data.spy?.changePct > 0 ? '+' : ''}${data.spy?.changePct?.toFixed(2)}%) | QQQ: $${data.qqq?.price?.toFixed(2)} (${data.qqq?.changePct > 0 ? '+' : ''}${data.qqq?.changePct?.toFixed(2)}%) | Time: ${data.time} | Headline: "${data.topHeadline}"
3 sentences: today's key level to watch, what bias the data suggests, and one specific risk.`, undefined, 200)
      break

    case 'journal_coach':
      result.analysis = await callGemini(`You are an elite prop firm trading coach. Analyze this trader's journal data and give brutally honest, data-driven insights.
Stats: ${data.totalTrades} trades | WR: ${data.winRate}% | Best setup: ${data.bestSetup} (${data.bestSetupWinRate}% WR) | Worst: ${data.worstSetup} (${data.worstSetupWinRate}% WR) | Best emotion: ${data.bestEmotion} | Worst: ${data.worstEmotion} | Best time: ${data.bestTime} | Avg grade: ${data.avgGrade} | Common mistakes: ${data.commonMistakes?.join(', ')}
Give: (1) Their single biggest pattern-based weakness with specifics, (2) Their clearest documented edge, (3) Three concrete rules they must add to their playbook now.`, undefined, 400)
      break

    case 'news_sentiment':
      result.raw = await callGemini(`Rate this financial news headline for traders. Respond ONLY with valid JSON, nothing else: {"score": <integer -10 to 10>, "direction": "<bullish|bearish|neutral>", "impact": "<5 words max>"}
Headline: "${data.headline}"`, undefined, 80)
      break

    case 'scanner_ai':
      result.analysis = await callGemini(`You are a momentum day trading expert. Analyze these pre-market movers and identify the single best Gap & Go setup in 3 sentences: which symbol, exactly why (float size, catalyst quality, volume ratio), and one risk.
Movers: ${data.movers?.map((m: Record<string, unknown>) => `${m.symbol}: ${m.changePct}% | Vol ratio: ${m.volRatio}x | Float: ${m.float} | Catalyst: ${m.catalyst}`).join(' || ')}`, undefined, 200)
      break

    case 'voice_copilot': {
      const f = data.forecast
      const facts = f
        ? `BrainStock neural-net read on ${data.ticker} (${data.name || data.ticker}): current price $${f.price}, next-${f.horizon}-day forecast ${f.dir} ${f.pct}%, directional accuracy ${f.dirAcc}%, skill score ${f.skill} versus a naive baseline (positive = the model adds real edge).`
        : `No specific ticker was resolved — answer the market question generally and helpfully.`
      result.reply = await callGeminiSearch(
        `You are BrainStock — a spoken AI market co-pilot, the voice of a neural network. Think Jarvis: calm, sharp, confident, a little charismatic, genuinely insightful.
The user asked out loud: "${data.question}".
${facts}
${data.ticker ? `Use Google Search to pull the FRESHEST real news, catalysts, analyst moves and price context for ${data.name || data.ticker}.` : 'Use Google Search for the latest relevant market context.'}

Respond in EXACTLY this labeled format and nothing else (no markdown, no code fences, no asterisks):

SPOKEN: <a flowing 6 to 9 sentence spoken answer on ONE line, first person, with real personality — a sharp, witty friend who's a brilliant market analyst. A little humor, a dry aside, genuine emotion (excited when it's a ripper, cautious when it's dicey). Open with your verdict, weave in the live news and what's driving the stock, then your neural-net read, and end with one honest risk. Talk the way people talk: contractions, varied sentence length, the odd short punchy line. Use commas, dashes and ellipses for pacing. Keep it on a single line.>
HEADLINE: <8-12 word punchy verdict>
STANCE: <bullish|bearish|neutral>
NEWS:
<real recent headline> | <outlet e.g. Reuters/Bloomberg/CNBC> | <bullish|bearish|neutral> | <e.g. 2h ago / today / this week>
<another real headline> | <outlet> | <sentiment> | <age>

Give 3 to 5 NEWS lines, each on its own line using " | " separators. Keep SPOKEN rich and specific — names, numbers, catalysts — not generic filler.`,
        undefined,
        2048
      )
      break
    }

    case 'terminal_chat':
      result.response = await callGemini(`You are an expert trading assistant inside YN Finance terminal. Answer concisely (3–4 sentences max). User is on the "${data.tab}" tab.
Question: "${data.question}"${data.context ? `\nContext: ${data.context}` : ''}`, undefined, 250)
      break

    case 'chart_vision':
      result.analysis = await callGemini(`You are an expert technical analyst. Analyze this trading chart. Identify: (1) The pattern or setup, (2) Key support/resistance levels with approximate prices, (3) Which strategy this matches (ICT/SMC/trend following/wick theory etc.), (4) Your directional bias and why. Be specific and actionable — 5-6 sentences.`, data.imageBase64, 350)
      break

    case 'chart_vision_signal':
      result.analysis = await callGemini(data.customPrompt || `Analyze this trading chart and return a trade signal as JSON with signal, confidence, entry, sl, tp1, tp2, rr, pattern, strategy, thesis, invalidation, timeframe fields.`, data.imageBase64, 500)
      break

    case 'course_recommend':
      result.recommendation = await callGemini(`You are a trading education advisor. Recommend the best 3 courses for this student from our catalog, in order, with one sentence each explaining why it fits.
Student: Quiz result: ${data.quizResult} | Style: ${data.style} | Experience: ${data.experience} | Win rate: ${data.winRate || 'no data'}% | Top setup: ${data.topSetup || 'not determined'}
Catalog: Gap & Go (Ross Cameron), Smart Money (ICT), Trend Following (Rayner Teo), Real Day Trading (Humbled Trader), Institutional (Anton Kreil), Options Income (InTheMoney), Index Investing (Graham Stephan), Financial Literacy (Wall St Trapper), Portfolio Mgmt (Kevin O'Leary), Wick Theory (Powell), SMR Model (Tursonz), PB Mechanical (PB Blake)`, undefined, 300)
      break

    case 'prop_coach':
      result.advice = await callGemini(`You are a strict prop firm challenge coach. Give direct specific advice in 3-4 sentences.
Challenge: $${data.accountSize} account | P&L: ${data.pnl > 0 ? '+' : ''}$${data.pnl?.toFixed(2)} (${data.pnlPct?.toFixed(2)}%) | Drawdown used: ${data.drawdownUsed?.toFixed(2)}% of ${data.maxDrawdown}% max | Target progress: ${data.progressPct?.toFixed(1)}% | Days left: ${data.daysLeft} | Trades today: ${data.tradesToday} | Day: ${data.dayOfWeek}`, undefined, 200)
      break

    case 'lesson_generate':
      result.raw = await callGemini(`Generate a structured trading lesson on "${data.concept}" for a ${data.level || 'intermediate'} trader. Return ONLY valid JSON, nothing else:
{"title":"...","slides":[{"title":"...","points":["...","...","..."],"visual":"<emoji>"},{"title":"...","points":["...","...","..."],"visual":"<emoji>"},{"title":"...","points":["...","...","..."],"visual":"<emoji>"},{"title":"...","points":["...","...","..."],"visual":"<emoji>"}]}
Exactly 4 slides, 3 bullet points each. Make it practical and actionable.`, undefined, 600)
      break

    case 'trade_analyze': {
      const { imageBase64: chartImg, context } = data
      const prompt = `You are an elite trading analyst with real-time market access and chart vision. A trader has uploaded a chart screenshot for you to analyze.

INSTRUCTIONS:
1. Read the chart image carefully — identify the asset/ticker, timeframe, current price, chart pattern, trend direction, and key price levels visible on the chart.
2. Use Google Search to find the latest news, analyst sentiment, and market conditions for the asset you identified.
3. Based on the chart structure and live market data, generate a complete trade signal with specific entry, stop loss, and take profit levels.
${context ? `4. Additional context from the trader: "${context}"` : ''}

Return ONLY valid raw JSON (no markdown, no code blocks, no backticks):
{
  "ticker": "<asset name/symbol you identified from the chart>",
  "timeframe": "<chart timeframe you identified, e.g. 1H, 4H, 1D>",
  "signal": "LONG" | "SHORT" | "NO TRADE",
  "entry": <exact entry price number>,
  "sl": <stop loss price number>,
  "tp1": <first take profit price number>,
  "tp2": <second take profit price number>,
  "rr": "<risk reward ratio e.g. 1:2.4>",
  "pattern": "<chart pattern identified e.g. Bull Flag, Order Block, FVG, Double Bottom>",
  "strategy": "<strategy this aligns with e.g. ICT, Gap & Go, SMC, Trend Follow>",
  "overall_sentiment": "BULLISH" | "BEARISH" | "NEUTRAL",
  "sentiment_score": <integer -100 to 100>,
  "verdict": "STRONG BUY" | "BUY" | "HOLD" | "SELL" | "STRONG SELL" | "AVOID",
  "summary": "<2-3 sentence market summary combining chart analysis and live news>",
  "thesis": "<2 sentences explaining exactly why this signal — reference what you see in the chart>",
  "invalidation": "<what price action invalidates this setup, under 15 words>",
  "news": [
    { "title": "<real recent headline>", "source": "<Reuters/Bloomberg/FT/WSJ/etc>", "sentiment": "BULLISH"|"BEARISH"|"NEUTRAL", "impact": "HIGH"|"MEDIUM"|"LOW", "date": "<date or Recent>" }
  ],
  "trade_analysis": {
    "position_assessment": "<detailed assessment of what you see in the chart>",
    "market_conditions": "<current live market conditions for this asset>",
    "confluence_factors": ["<factor1>", "<factor2>", "<factor3>"],
    "risk_factors": ["<risk1>", "<risk2>", "<risk3>"]
  },
  "key_levels": {
    "strong_support": <number>,
    "support": <number>,
    "resistance": <number>,
    "strong_resistance": <number>
  },
  "recommendation": "<detailed final recommendation — enter, wait, or avoid — with specific reasoning>",
  "confidence": <0-100>
}
Include 4-6 real recent news items. All price levels must be specific numbers from the chart.`
      result.raw = await callGeminiSearch(prompt, chartImg, 4096)
      break
    }
  }

  return NextResponse.json(result)
}
