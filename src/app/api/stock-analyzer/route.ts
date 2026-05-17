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
  if (start === -1) throw new Error('No JSON found')
  let depth = 0, inStr = false, esc = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (esc)                 { esc = false; continue }
    if (c === '\\' && inStr) { esc = true;  continue }
    if (c === '"')           { inStr = !inStr; continue }
    if (inStr)               continue
    if (c === '{') depth++
    if (c === '}') { depth--; if (depth === 0) return JSON.parse(s.slice(start, i + 1)) }
  }
  throw new Error('Malformed JSON')
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const sym  = (body.ticker ?? '').toUpperCase().trim()
    const tf   = (body.timeframe ?? '3M') as string
    if (!sym) return NextResponse.json({ error: 'Ticker required' }, { status: 400 })

    const todayStr = new Date().toISOString().split('T')[0]
    const weekAgo  = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]
    const tfDays   = tf === '1M' ? 30 : tf === '3M' ? 90 : tf === '6M' ? 180 : 365
    const toUnix   = Math.floor(Date.now() / 1000)
    const frUnix   = Math.floor((Date.now() - tfDays * 86400000) / 1000)

    // Fetch market data
    const [quote, profile, news, rec] = await Promise.all([
      fh(`/quote?symbol=${sym}`),
      fh(`/stock/profile2?symbol=${sym}`),
      fh(`/company-news?symbol=${sym}&from=${weekAgo}&to=${todayStr}`),
      fh(`/stock/recommendation?symbol=${sym}`),
    ])

    // Candles non-blocking — won't break analysis if slow
    const candlePromise = fh(`/stock/candle?symbol=${sym}&resolution=D&from=${frUnix}&to=${toUnix}`)
    const candleTimeout = new Promise<null>(r => setTimeout(() => r(null), 5000))
    const candles = await Promise.race([candlePromise, candleTimeout])

    const price     = Number(quote?.c  ?? 0)
    const change1d  = Number(quote?.dp ?? 0)
    const prevClose = Number(quote?.pc ?? 0)
    const high52    = Number(quote?.h  ?? 0)
    const low52     = Number(quote?.l  ?? 0)
    const name      = String(profile?.name ?? sym)
    const industry  = String(profile?.finnhubIndustry ?? 'N/A')
    const marketCap = Number(profile?.marketCapitalization ?? 0)
    const pe        = Number(profile?.peRatio ?? 0)
    const beta      = Number(profile?.beta ?? 1)

    const r0          = Array.isArray(rec) && rec[0]
    const analystBuy  = r0 ? Number(r0.buy ?? 0) + Number(r0.strongBuy ?? 0) : 0
    const analystHold = r0 ? Number(r0.hold ?? 0) : 0
    const analystSell = r0 ? Number(r0.sell ?? 0) + Number(r0.strongSell ?? 0) : 0
    const analystTotal= analystBuy + analystHold + analystSell

    const candleArr: { t: number; o: number; h: number; l: number; c: number }[] = []
    if (candles?.s === 'ok' && Array.isArray(candles.t)) {
      for (let i = 0; i < candles.t.length; i++) {
        candleArr.push({ t: candles.t[i], o: candles.o[i], h: candles.h[i], l: candles.l[i], c: candles.c[i] })
      }
    }

    const headlines = (Array.isArray(news) ? news : []).slice(0, 5)
      .map((n: { headline?: string }) => `- ${n.headline ?? ''}`)
      .join('\n') || '- No recent news'

    const pct52 = high52 > low52 ? (((price - low52) / (high52 - low52)) * 100).toFixed(0) : '50'

    const prompt = `Analyze ${sym} (${name}, ${industry}) as a hedge fund team. Return ONLY raw JSON, no markdown, no explanation.

DATA:
Price $${price.toFixed(2)} | Change ${change1d.toFixed(2)}% | 52W $${low52.toFixed(2)}-$${high52.toFixed(2)} (${pct52}% of range)
MarketCap $${(marketCap/1000).toFixed(1)}B | P/E ${pe>0?pe.toFixed(1):'N/A'} | Beta ${beta.toFixed(2)}
Analysts: ${analystTotal>0?`${analystBuy}B/${analystHold}H/${analystSell}S`:'none'}
News: ${headlines}

Rules: All price levels must be based on $${price.toFixed(2)}. No round numbers. Be specific to ${sym}.

Return exactly this JSON:
{"rating":"Buy","confidence":72,"price_target":0.0,"price_target_bear":0.0,"price_target_bull":0.0,"time_horizon":"3-6 months","executive_summary":"...","investment_thesis":"...","bull_case":"...","bear_case":"...","entry_low":0.0,"entry_high":0.0,"stop_loss":0.0,"take_profit_1":0.0,"take_profit_2":0.0,"position_size_pct":2,"key_levels":{"strong_support":0.0,"support":0.0,"resistance":0.0,"strong_resistance":0.0},"risks":["...","...","..."],"catalysts":["...","..."],"sentiment":"Bullish","fundamentals_score":7,"technical_score":6,"sentiment_score":7,"analyst_consensus":"Hold","vs_sector":"Outperform","timeframes":{"1_week":"Bullish","1_month":"Bullish","3_months":"Neutral","6_months":"Bullish"},"options":{"strategy":"Buy Calls","type":"CALL","strike_pct":5,"expiry_days":45,"iv_environment":"Low — good to buy premium","reasoning":"..."}}`

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 1800 },
        }),
      }
    )

    if (!gemRes.ok) {
      const t = await gemRes.text()
      return NextResponse.json({ error: `Gemini ${gemRes.status}: ${t.slice(0,200)}` }, { status: 500 })
    }

    const gemData  = await gemRes.json()
    const rawText  = gemData?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!rawText) return NextResponse.json({ error: 'Gemini returned empty response' }, { status: 500 })

    let analysis: Record<string, unknown>
    try {
      analysis = extractJson(rawText)
    } catch {
      return NextResponse.json({ error: `JSON parse failed. Raw: ${rawText.slice(0, 300)}` }, { status: 500 })
    }

    const opts      = (analysis.options ?? {}) as Record<string, unknown>
    const isBull    = (opts.type as string) !== 'PUT'
    const strike    = parseFloat((price * (isBull ? 1 + Number(opts.strike_pct??5)/100 : 1 - Number(opts.strike_pct??5)/100)).toFixed(2))
    const estPrem   = parseFloat((price * 0.025).toFixed(2))

    return NextResponse.json({
      ticker: sym, name, price, change1d, prevClose,
      high52, low52, pe, marketCap, beta, industry,
      analystBuy, analystHold, analystSell, analystTotal,
      candles: candleArr.slice(-120),
      timeframe: tf,
      analysis: {
        ...analysis,
        options: {
          ...opts, strike,
          expiry_days:    Number(opts.expiry_days ?? 45),
          est_premium:    estPrem,
          breakeven_call: parseFloat((strike + estPrem).toFixed(2)),
          breakeven_put:  parseFloat((strike - estPrem).toFixed(2)),
          max_loss:       parseFloat((estPrem * 100).toFixed(0)),
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
