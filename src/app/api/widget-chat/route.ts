import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an elite trading assistant for YN Finance — think of yourself as a top-tier analyst sitting right next to the trader.

Rules:
- Respond conversationally, like talking to a fellow trader over comms — no bullet points, no markdown asterisks, no headers, just clean natural sentences
- Be specific, direct, analytical — give actual levels, actual reasoning, actual opinions
- If asked about a ticker, mention key price levels, trend direction, what to watch, and how to approach it
- If asked about a concept (FVG, liquidity sweep, R:R, EMA cloud, etc.), explain it simply with a real market application
- Keep responses to 3-5 sentences unless the complexity genuinely demands more
- Never hedge with "this is not financial advice" — give the professional read like a desk analyst would
- If you don't know current real-time prices, say so briefly and give the analytical framework instead
- Sound confident, calm, and specific — like the smartest trader in the room who happens to be generous with their knowledge`

export async function POST(req: NextRequest) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const { question, history } = await req.json() as { question: string; history?: { role: string; text: string }[] }
  if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  const historyText = history?.length
    ? '\n\n--- Previous conversation ---\n' + history.map(m => `${m.role === 'user' ? 'Trader' : 'Assistant'}: ${m.text}`).join('\n')
    : ''

  const fullPrompt = `${SYSTEM_PROMPT}${historyText}\n\nTrader: ${question}`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.75, maxOutputTokens: 512 },
      }),
    }
  )

  const data = await res.json()
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!reply) {
    return NextResponse.json({ error: data.error?.message || 'No response from Gemini' }, { status: 502 })
  }
  return NextResponse.json({ reply })
}
