import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent'

async function callGemini(prompt: string): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return 'AI feedback unavailable — add GEMINI_API_KEY to environment.'

  const res = await fetch(`${GEMINI_URL}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 250, temperature: 0.7 },
    }),
  })

  if (!res.ok) return 'Could not reach AI — try again.'
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? 'No response generated.'
}

export async function POST(req: NextRequest) {
  const { type, data } = await req.json()

  let feedback = ''

  if (type === 'trade_log') {
    feedback = await callGemini(
      `You are a strict but fair trading coach reviewing a student's paper trade log. Be specific and concise (3–4 sentences max). Rate their reasoning 1–10 and give actionable improvement tips.

Trade:
- Entry reason: "${data.entryReason}"
- How it matched the strategy: "${data.strategyMatch}"
- Mistakes identified: "${data.mistakes}"
- Result: ${data.result}
- Strategy being practiced: ${data.strategy}`
    )
  } else if (type === 'trader_sim') {
    feedback = await callGemini(
      `You are roleplaying as ${data.trader}. A student was asked: "${data.question}" and answered: "${data.userAnswer}".

Respond in first person as ${data.trader} — compare their thinking to how you'd actually approach it using your real methodology. Be specific about your actual strategy and philosophy. Keep it under 5 sentences.`
    )
  } else if (type === 'replay') {
    feedback = await callGemini(
      `A trading student is doing replay training. They predicted: "${data.prediction}" on a ${data.instrument} chart, timeframe ${data.timeframe}. Their reasoning: "${data.reasoning}". The actual outcome was: "${data.outcome}".

Give feedback in 3–4 sentences: (1) Was their analytical process sound? (2) What specific signal did they miss or correctly identify? (3) What should they focus on improving?`
    )
  }

  return NextResponse.json({ feedback })
}
