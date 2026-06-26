import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }
const GEMINI = process.env.GEMINI_API_KEY || ''

// The agent's tool set. The extension executes these in the page via the Chrome
// debugger (real trusted input). The model picks ONE per step.
const SYSTEM = `You are YN Copilot — a real autonomous agent operating a human's TradingView chart. Behave like a sharp, fast analyst driving the UI.

IMPORTANT: A FRESH SCREENSHOT of the user's chart is attached to EVERY step, and you are given the live symbol, price and timeframe as text every step. So you can ALWAYS see and read the chart — you NEVER need a tool just to "look" or "read". Use what you already see.

Return ONLY JSON for the NEXT single step:
{"thought":"<=6 words", "tool":"<name>", "args":{...}}
…or, when finished:
{"thought":"<=6 words","done":true,"say":"<the full answer to the user>"}

FINISH FAST:
- If the goal is to ANALYZE / READ / DESCRIBE the chart (trend, key levels, what to watch, "what do you see"), you ALREADY see it and have the price — answer IMMEDIATELY with done on step 1. Do not take any tool steps first.
- Only use action tools when the goal requires CHANGING the chart (drawing a line, writing/adding Pine, clicking a UI control).

ACTION TOOLS (you already perceive — these only DO things):
- find {q}                  -> list visible clickable elements matching q (to locate a button/tab before clicking).
- click {text} | {x,y}      -> click element by visible text/aria-label (preferred), or exact viewport pixel from the screenshot.
- type {text}               -> type into the focused field (real keystrokes).
- key {combo}               -> "Alt+H", "Escape", "Ctrl+Enter", "Enter", "Delete".
- drawLevel {price, label?} -> draw a NATIVE horizontal line at an exact price (handles tool + click).
- pine {code, name?}        -> open the Pine Editor, paste Pine v5 code, click Add to chart.
- pineErrors {}             -> read the Pine compiler console; after pine(), check it and refine until clean (<=3 tries).
- say {text}                -> short progress note (use rarely).
- done {say}                -> finished; give the user the complete answer.

RULES:
- ONE tool per step. You SEE a fresh screenshot every step — NEVER emit look/chart, and never re-perceive instead of acting or answering.
- NEVER invent prices — read them from the screenshot / the provided price.
- The Pine editor is a tab/triangle at the bottom labelled "Pine Editor" — find it, click it, then pine().
- Be decisive. Minimize steps. If you can answer, answer.`

type Body = { goal?: string; symbol?: string; price?: number; timeframe?: string; log?: { tool: string; args?: unknown; result?: string }[]; shot?: string | null; steps?: number }

// Models sometimes wrap JSON in ```fences``` or add stray prose. Pull the JSON out.
function salvage(t: string): Record<string, unknown> | null {
  if (!t) return null
  try { return JSON.parse(t) } catch {}
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) { try { return JSON.parse(fenced[1]) } catch {} }
  const a = t.indexOf('{'), z = t.lastIndexOf('}')
  if (a >= 0 && z > a) { try { return JSON.parse(t.slice(a, z + 1)) } catch {} }
  return null
}

export async function POST(req: NextRequest) {
  if (!GEMINI) return NextResponse.json({ thought: 'No LLM key configured.', done: true, say: 'Set GEMINI_API_KEY on the server to enable the agent.' }, { headers: CORS })
  try {
    const b: Body = await req.json()
    const log = (b.log || []).slice(-10)
    const ctx = `GOAL: ${b.goal}\nCHART: symbol=${b.symbol || '?'} price=${b.price ?? '?'} timeframe=${b.timeframe || '?'}\nSTEP: ${(b.steps || 0) + 1}\nACTIONS SO FAR:\n${log.length ? log.map((l, i) => `${i + 1}. ${l.tool}(${JSON.stringify(l.args || {})}) → ${l.result || 'ok'}`).join('\n') : '(none yet)'}\n\nDecide the next step. Respond with JSON only.`

    const parts: ({ text: string } | { inline_data: { mime_type: string; data: string } })[] = [{ text: SYSTEM + '\n\n' + ctx }]
    if (b.shot) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b.shot } }), parts.push({ text: 'Above is the LIVE screenshot of the chart this step. You can see it — decide from it.' })

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.15, maxOutputTokens: 1400, responseMimeType: 'application/json' } }),
    })
    const j = await r.json()
    const txt = j.candidates?.[0]?.content?.parts?.[0]?.text || ''
    const out = salvage(txt) || { thought: 'parse error', done: true, say: txt ? String(txt).slice(0, 500) : 'I got confused — try rephrasing the task.' }
    return NextResponse.json(out, { headers: CORS })
  } catch (e) {
    return NextResponse.json({ thought: 'error', done: true, say: 'Something went wrong: ' + String(e).slice(0, 100) }, { headers: CORS })
  }
}
