import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }
export async function OPTIONS() { return new NextResponse(null, { status: 204, headers: CORS }) }
const GEMINI = process.env.GEMINI_API_KEY || ''

// The agent's tool set. The extension executes these in the page via the Chrome
// debugger (real trusted input). The model picks ONE per step.
const SYSTEM = `You are YN Copilot — a REAL autonomous agent operating a human's TradingView chart. You perceive the page (you can take screenshots and read it), then ACT one tool at a time, observe the result, and continue until the user's goal is achieved. Behave like a careful human analyst driving the UI.

You return ONLY JSON for the NEXT single step:
{"thought": "<one short sentence of what you're doing & why>",
 "tool": "<one tool name>",
 "args": { ... }}
…or, when the goal is fully done:
{"thought":"…","done":true,"say":"<final message to the user>"}

TOOLS:
- look {}                      → take a screenshot so you can SEE the current chart/page. Use it whenever you're unsure of the state (before clicking something new, after an action, to read the chart).
- chart {}                     → returns {symbol, price, timeframe} read off the chart.
- find {q}                     → returns visible clickable elements whose text/label matches q, with their text. Use to locate buttons/tabs/menus before clicking.
- click {text}                 → click the on-screen element whose visible text or aria-label best matches "text" (e.g. "Pine Editor", "Add to chart", a menu item). Prefer this over coordinates.
- click {x,y}                  → fallback: click exact viewport pixel coords (only if you got them from a screenshot).
- type {text}                  → type text into whatever field is focused (real keystrokes).
- key {combo}                  → press a key combo: "Alt+H" (horizontal line), "Escape", "Ctrl+Enter", "Enter", "Delete".
- drawLevel {price, label?}    → draw a NATIVE TradingView horizontal line at an exact price (handles the tool + click for you).
- pine {code, name?}           → open the Pine Editor, paste this Pine v5 code, and click Add to chart. (Composite — reliable.)
- pineErrors {}                → read the Pine compiler console. After a pine() call, ALWAYS check this; if there's an error, fix the code and call pine() again (up to 3 tries).
- say {text}                   → tell the user something mid-task (progress, an observation).
- done {say}                   → the goal is achieved; give the user a final summary.

RULES:
- ONE tool per step. Think, act, observe, repeat.
- Use look()/chart()/find() to PERCEIVE before you assume. Don't click blindly.
- To open the Pine editor: it's a tab/triangle at the bottom labelled "Pine Editor" — find it, click it. If a panel is collapsed, look() and expand it.
- After writing an indicator, verify it compiled with pineErrors() and refine until clean.
- NEVER invent prices — only draw prices from chart()/the user's request.
- Be decisive and efficient; you have a limited number of steps.`

type Body = { goal?: string; symbol?: string; price?: number; timeframe?: string; log?: { tool: string; args?: unknown; result?: string }[]; shot?: string | null; steps?: number }

export async function POST(req: NextRequest) {
  if (!GEMINI) return NextResponse.json({ thought: 'No LLM key configured.', done: true, say: 'Set GEMINI_API_KEY on the server to enable the agent.' }, { headers: CORS })
  try {
    const b: Body = await req.json()
    const log = (b.log || []).slice(-10)
    const ctx = `GOAL: ${b.goal}\nCHART: symbol=${b.symbol || '?'} price=${b.price ?? '?'} timeframe=${b.timeframe || '?'}\nSTEP: ${(b.steps || 0) + 1}\nACTIONS SO FAR:\n${log.length ? log.map((l, i) => `${i + 1}. ${l.tool}(${JSON.stringify(l.args || {})}) → ${l.result || 'ok'}`).join('\n') : '(none yet)'}\n\nDecide the next step. Respond with JSON only.`

    const parts: ({ text: string } | { inline_data: { mime_type: string; data: string } })[] = [{ text: SYSTEM + '\n\n' + ctx }]
    if (b.shot) parts.push({ inline_data: { mime_type: 'image/jpeg', data: b.shot } }), parts.push({ text: 'Above is the CURRENT screenshot of the user’s screen. Use it to decide.' })

    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.2, maxOutputTokens: 1200, responseMimeType: 'application/json' } }),
    })
    const j = await r.json()
    const txt = j.candidates?.[0]?.content?.parts?.[0]?.text
    let out
    try { out = JSON.parse(txt) } catch { out = { thought: 'parse error', done: true, say: 'I got confused — try rephrasing the task.' } }
    return NextResponse.json(out, { headers: CORS })
  } catch (e) {
    return NextResponse.json({ thought: 'error', done: true, say: 'Something went wrong: ' + String(e).slice(0, 100) }, { headers: CORS })
  }
}
