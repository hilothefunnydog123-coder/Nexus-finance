import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

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

    case 'terminal_chat':
      result.response = await callGemini(`You are an expert trading assistant inside YN Finance terminal. Answer concisely (3–4 sentences max). User is on the "${data.tab}" tab.
Question: "${data.question}"${data.context ? `\nContext: ${data.context}` : ''}`, undefined, 250)
      break

    case 'chart_vision':
      result.analysis = await callGemini(`You are an expert technical analyst. Analyze this trading chart. Identify: (1) The pattern or setup, (2) Key support/resistance levels with approximate prices, (3) Which strategy this matches (ICT/SMC/trend following/wick theory etc.), (4) Your directional bias and why. Be specific and actionable — 5-6 sentences.`, data.imageBase64, 350)
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
  }

  return NextResponse.json(result)
}
