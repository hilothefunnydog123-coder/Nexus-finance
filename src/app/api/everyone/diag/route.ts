import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diagnostic for the "for everyone" Gemini pipeline. Visit /api/everyone/diag.
// Tells you, on the LIVE server, whether the function actually sees the key,
// whether a plain Gemini call works, and whether Google-Search grounding
// returns sources — with the real status/error. Never leaks the key itself.

const GEMINI = process.env.GEMINI_API_KEY || ''
const MODEL = 'gemini-2.5-flash'

async function probe(withTools: boolean) {
  const body: Record<string, unknown> = {
    contents: [{ role: 'user', parts: [{ text: 'In one short sentence, what is the latest US 30-year mortgage rate trend this week?' }] }],
    generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
  }
  if (withTools) body.tools = [{ google_search: {} }]
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI}`
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const status = r.status
    let j: unknown = null
    try { j = await r.json() } catch {}
    const obj = (j ?? {}) as { candidates?: { content?: { parts?: { text?: string }[] }; groundingMetadata?: { groundingChunks?: unknown[] } }[]; error?: { message?: string; status?: string } }
    const cand = obj.candidates?.[0]
    const text = cand?.content?.parts?.map((p) => p.text || '').join('') || ''
    const chunks = cand?.groundingMetadata?.groundingChunks?.length || 0
    return { ok: r.ok, status, error: obj.error?.message || obj.error?.status || null, gotText: text.length > 0, sampleLen: text.length, groundingChunks: chunks }
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : 'fetch failed', gotText: false, sampleLen: 0, groundingChunks: 0 }
  }
}

export async function GET() {
  const hasKey = GEMINI.length > 0
  if (!hasKey) {
    return NextResponse.json({
      hasKey: false, keyLength: 0, model: MODEL,
      diagnosis: 'The server function does NOT see GEMINI_API_KEY. Set it in Netlify env (not just NEXT_PUBLIC_*), then trigger a fresh deploy so functions pick it up.',
    })
  }
  const [plain, grounded] = await Promise.all([probe(false), probe(true)])
  let diagnosis: string
  if (!plain.ok) diagnosis = `Key is present but the plain Gemini call failed (HTTP ${plain.status}: ${plain.error || 'unknown'}). The key may be invalid, restricted, or lack access to ${MODEL}.`
  else if (!grounded.ok) diagnosis = `Plain call works, but the Google-Search grounding call failed (HTTP ${grounded.status}: ${grounded.error || 'unknown'}). Grounding/Search may not be enabled for this key/project — reasoning will work, live news won't.`
  else if (grounded.groundingChunks === 0) diagnosis = 'Both calls work but grounding returned 0 source chunks this run (the model may not have searched). Reasoning is live; news sources are intermittent.'
  else diagnosis = `All good — key works and grounding returned ${grounded.groundingChunks} source chunks. Live news is active.`
  return NextResponse.json({ hasKey: true, keyLength: GEMINI.length, model: MODEL, plain, grounded, diagnosis })
}
