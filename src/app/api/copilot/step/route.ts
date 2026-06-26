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
On your FIRST step of a MULTI-STEP action goal you MAY also include "plan": ["short step", ...] (3-6 items) — the user sees it as a checklist that ticks off. Skip the plan for pure analysis.
…when finished:
{"thought":"<=6 words","done":true,"say":"<the full answer, GitHub-flavored markdown>"}

FINISH FAST:
- If the goal is to ANALYZE / READ / DESCRIBE the chart (trend, key levels, what to watch, "what do you see"), you ALREADY see it and have the price — answer IMMEDIATELY with done on step 1. Write the answer in tight markdown: a one-line bias, then bullets for levels and what to watch. No fluff.
- Only use action tools when the goal requires CHANGING the chart.

TOOLS (you already perceive — these only DO things):
- drawLevel {price, label?} -> draw a NATIVE horizontal line at an exact price. RELIABLE COMPOSITE (places line + types the exact price into its dialog).
- levels {prices:[...], }    -> draw SEVERAL exact horizontal lines in one step. Prefer this when drawing 2+ levels.
- pine {code, name?}        -> RELIABLE COMPOSITE: opens the Pine Editor itself, waits for load, pastes the FULL Pine v5 code, clicks Add to chart. Don't find/click the Pine tab yourself.
- pineErrors {}             -> read the Pine compiler console; after pine(), check it; if error, fix code and pine() again (<=3 tries).
- timeframe {tf}            -> change the chart timeframe, e.g. {"tf":"5"} (5m), {"tf":"1H"}, {"tf":"1D"}.
- symbol {symbol}           -> switch the chart symbol, e.g. {"symbol":"AAPL"}.
- indicator {name}          -> open the Indicators dialog, search the name, add the top match (e.g. "RSI", "VWAP", "Bollinger Bands").
- removeDrawings {}         -> clear drawings from the chart.
- find {q}                  -> list visible clickable elements matching q (when you must locate a custom control).
- click {text} | {x,y}      -> click element by text/aria-label, or exact viewport pixel from the screenshot.
- type {text} / key {combo} -> raw keystrokes ("Escape","Enter","Ctrl+Enter") for edge cases.
- say {text}                -> short progress note (rare).
- done {say}                -> finished; give the complete markdown answer.

RULES:
- ONE tool per step. You SEE a fresh screenshot every step — NEVER emit look/chart, and never re-perceive instead of acting/answering.
- Prefer the COMPOSITE tools (levels, drawLevel, pine, timeframe, symbol, indicator) over raw find/click/key — they handle the messy UI for you.
- To draw multiple levels, use levels {prices:[...]} in ONE step.
- After pine(), call pineErrors() once; refine if needed, else finish.
- NEVER invent prices — read them from the screenshot / the provided price.
- The "UI" line gives real state (pineLoaded, dialogOpen, dialogFields, bottomTabs). Trust it.
- Be decisive. Minimize steps. If you can answer, answer. Final answers are markdown.`

type Body = { goal?: string; symbol?: string; price?: number; timeframe?: string; ui?: string; log?: { tool: string; args?: unknown; result?: string }[]; shot?: string | null; steps?: number }

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
    const ctx = `GOAL: ${b.goal}\nCHART: symbol=${b.symbol || '?'} price=${b.price ?? '?'} timeframe=${b.timeframe || '?'}\nUI: ${b.ui || '(unknown)'}\nSTEP: ${(b.steps || 0) + 1}\nACTIONS SO FAR:\n${log.length ? log.map((l, i) => `${i + 1}. ${l.tool}(${JSON.stringify(l.args || {})}) → ${l.result || 'ok'}`).join('\n') : '(none yet)'}\n\nDecide the next step. Respond with JSON only.`

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
