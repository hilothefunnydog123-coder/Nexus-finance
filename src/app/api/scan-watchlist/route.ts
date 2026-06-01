import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

async function fh(path: string) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{')
  if (start === -1) throw new Error('No JSON')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc) { esc = false; continue }
    if (c === '\\' && inStr) { esc = true; continue }
    if (c === '"') { inStr = !inStr; continue }
    if (inStr) continue
    if (c === '{') depth++
    if (c === '}') { depth--; if (depth === 0) return JSON.parse(s.slice(start, i + 1)) }
  }
  throw new Error('Malformed JSON')
}

async function analyzeSingle(sym: string) {
  const [quote, profile, news, earnings] = await Promise.all([
    fh(`/quote?symbol=${sym}`),
    fh(`/stock/profile2?symbol=${sym}`),
    fh(`/company-news?symbol=${sym}&from=${weekAgo()}&to=${today()}`),
    fh(`/stock/earnings?symbol=${sym}&limit=1`),
  ])

  const price     = Number(quote?.c  ?? 0)
  const change1d  = Number(quote?.dp ?? 0)
  const high52    = Number(quote?.h  ?? 0)
  const low52     = Number(quote?.l  ?? 0)
  const name      = String(profile?.name ?? sym)
  const industry  = String(profile?.finnhubIndustry ?? '')
  const pe        = Number(profile?.peRatio ?? 0)
  const nextEPS   = Array.isArray(earnings) && earnings[0]?.date ? earnings[0].date : null

  const headlines = (Array.isArray(news) ? news : []).slice(0, 3)
    .map((n: { headline?: string }) => `- ${n.headline ?? ''}`).join('\n') || '- none'

  const prompt = `Scan ${sym} (${name}) for a trading signal. Return ONLY JSON, no text.

Price $${price.toFixed(2)} | Change ${change1d.toFixed(2)}% | 52W $${low52.toFixed(0)}-$${high52.toFixed(0)} | P/E ${pe||'N/A'}
Industry: ${industry} | Next earnings: ${nextEPS || 'N/A'}
News: ${headlines}

{"rating":"Buy","confidence":78,"price_target":0.0,"entry_low":0.0,"entry_high":0.0,"stop_loss":0.0,"take_profit_1":0.0,"one_liner":"One specific sentence on the setup RIGHT NOW.","sentiment":"Bullish","top_risk":"One specific risk sentence.","urgency":"high" | "medium" | "low"}`

  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GM}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 800, responseMimeType: 'application/json' },
      }),
    }
  )

  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const d    = await r.json()
  const text = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  const data = extractJson(text)

  return {
    ticker: sym, name, price, change1d, high52, low52, pe,
    nextEarnings: nextEPS, industry,
    ...data,
  }
}

export async function POST(req: NextRequest) {
  try {
    const { tickers } = await req.json()
    if (!Array.isArray(tickers) || tickers.length === 0) {
      return NextResponse.json({ error: 'tickers array required' }, { status: 400 })
    }
    const syms = tickers.slice(0, 8).map((t: string) => t.toUpperCase().trim())

    // Run all in parallel
    const results = await Promise.allSettled(syms.map(analyzeSingle))

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const successful = (results
      .map((r, i) => r.status === 'fulfilled' ? r.value : { ticker: syms[i], error: true, confidence: 0 }) as any[])
      .sort((a: any, b: any) => Number(b.confidence ?? 0) - Number(a.confidence ?? 0))

    return NextResponse.json({ results: successful })
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}

function today()   { return new Date().toISOString().split('T')[0] }
function weekAgo() { const d = new Date(); d.setDate(d.getDate()-7); return d.toISOString().split('T')[0] }
