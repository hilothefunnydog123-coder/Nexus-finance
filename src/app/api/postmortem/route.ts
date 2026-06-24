import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

/* ════════════════════════════════════════════════════════════════════════
   /api/postmortem — the honesty engine.

   Pulls recently MISSED BrainStock calls and returns a short, plain-English
   explanation of why each likely went wrong (generated once via Gemini, then
   cached in the `postmortems` table so it never re-bills). The brand is the
   public, self-grading record — this makes the losers teach something.

   Degrades to [] when Supabase/Gemini aren't configured.
   ════════════════════════════════════════════════════════════════════════ */

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent'

function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}

async function explain(ticker: string, start: number, actual: number, retPct: number, days = 5): Promise<string> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return ''
  const prompt = `You are the post-mortem analyst for BrainStock, an AI that publicly grades its own stock calls. A BULLISH call on ${ticker} was posted at $${start.toFixed(2)} and ${days} trading days later the stock was $${actual.toFixed(2)} (${retPct >= 0 ? '+' : ''}${retPct.toFixed(2)}%), so the call MISSED.

Write a brief, honest post-mortem of why this call likely went wrong, in exactly 2 sentences, plain English a beginner understands. Be specific about plausible market reasons (momentum faded, broad-market pullback, sector rotation, overbought entry, news/earnings risk, mean reversion) without inventing fake facts or specific headlines you can't know. No hedging filler, no apologies — just a sharp, useful read. Do not use the words "as an AI".`
  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 220, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } },
      }),
    })
    if (!res.ok) return ''
    const json = await res.json()
    return (json.candidates?.[0]?.content?.parts?.[0]?.text ?? '').trim()
  } catch { return '' }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ items: [] })
  try {
    // The most recent misses — the calls worth explaining.
    const { data } = await admin
      .from('forecast_calls')
      .select('ticker,trade_date,start_price,actual_price')
      .eq('status', 'miss')
      .order('resolve_date', { ascending: false })
      .limit(6)
    const misses = (data || []) as { ticker: string; trade_date: string; start_price: number; actual_price: number | null }[]
    if (!misses.length) return NextResponse.json({ items: [] })

    const out: { ticker: string; trade_date: string; start: number; actual: number; ret: number; explanation: string }[] = []
    let generated = 0
    for (const m of misses) {
      if (m.actual_price == null) continue
      const start = Number(m.start_price)
      const actual = Number(m.actual_price)
      const retPct = start ? ((actual - start) / start) * 100 : 0

      // cache hit?
      const { data: cached } = await admin
        .from('postmortems').select('explanation')
        .eq('ticker', m.ticker).eq('trade_date', m.trade_date).maybeSingle()

      let explanation = cached?.explanation as string | undefined
      if (!explanation && generated < 3) {
        explanation = await explain(m.ticker, start, actual, retPct)
        generated++
        if (explanation) {
          await admin.from('postmortems').upsert(
            { ticker: m.ticker, trade_date: m.trade_date, start_price: start, actual_price: actual, ret_pct: +retPct.toFixed(2), explanation },
            { onConflict: 'ticker,trade_date' }
          )
        }
      }
      if (explanation) out.push({ ticker: m.ticker, trade_date: m.trade_date, start, actual, ret: +retPct.toFixed(2), explanation })
    }
    return NextResponse.json({ items: out }, { headers: { 'Cache-Control': 's-maxage=600, stale-while-revalidate=1800' } })
  } catch {
    return NextResponse.json({ items: [] })
  }
}
