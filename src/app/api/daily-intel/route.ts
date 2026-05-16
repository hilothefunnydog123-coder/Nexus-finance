import { NextResponse } from 'next/server'

const FH  = process.env.FINNHUB_API_KEY
const GM  = process.env.GEMINI_API_KEY

const INDICES = [
  { symbol: 'SPY', name: 'S&P 500',      futures: 'ES'  },
  { symbol: 'QQQ', name: 'Nasdaq 100',   futures: 'NQ'  },
  { symbol: 'DIA', name: 'Dow Jones',    futures: 'YM'  },
  { symbol: 'IWM', name: 'Russell 2000', futures: 'RTY' },
]
const MACRO    = ['GLD', 'USO', 'UUP', 'TLT', 'HYG']
const WATCHLIST = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'AMD', 'JPM']

// ─── Finnhub fetch ────────────────────────────────────────────────────────────
async function fh<T>(path: string, fallback: T): Promise<T> {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return fallback
    return await r.json()
  } catch { return fallback }
}

// ─── Gemini 1.5 Pro (best quality, real reasoning) ───────────────────────────
async function gemini(prompt: string): Promise<string> {
  if (!GM) return '{}'
  // Use Pro for highest quality analysis
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GM}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: 2500,
          temperature:     0.3,   // low temp = factual, no hallucinations
          topP:            0.8,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT',       threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH',      threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',threshold: 'BLOCK_NONE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT',threshold: 'BLOCK_NONE' },
        ],
      }),
    }
  )
  const json = await r.json()

  // Fallback to flash if pro quota exceeded
  if (json.error?.status === 'RESOURCE_EXHAUSTED' || json.error?.code === 429) {
    const r2 = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2500, temperature: 0.3 },
        }),
      }
    )
    const j2 = await r2.json()
    return j2.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
  }

  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}

// ─── ATR Calculator ───────────────────────────────────────────────────────────
function calcATR(candles: { h: number[]; l: number[]; c: number[] } | null, period = 14): number {
  if (!candles?.c?.length || candles.c.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < Math.min(period + 1, candles.c.length); i++) {
    trs.push(Math.max(
      candles.h[i] - candles.l[i],
      Math.abs(candles.h[i] - candles.c[i - 1]),
      Math.abs(candles.l[i] - candles.c[i - 1])
    ))
  }
  return trs.length ? +(trs.reduce((a, b) => a + b) / trs.length).toFixed(2) : 0
}

// ─── Safe parse ───────────────────────────────────────────────────────────────
function safeJson(raw: string): Record<string, unknown> {
  const match = raw.match(/\{[\s\S]*\}/)
  if (!match) return {}
  try { return JSON.parse(match[0]) } catch { return {} }
}

// ─── Main route ───────────────────────────────────────────────────────────────
export async function GET() {
  if (!FH || FH.includes('your_') || !GM || GM.includes('your_')) {
    return NextResponse.json({ intel: null, demo: true })
  }

  try {
    const now  = Math.floor(Date.now() / 1000)
    const from = now - 30 * 86400  // 30 days of daily candles

    // ── Parallel fetches ─────────────────────────────────────────────────────
    const allSymbols = [...INDICES.map(i => i.symbol), ...MACRO]

    const [
      quotes,
      watchQuotes,
      newsRaw,
      calendar,
      earningsRaw,
      recsRaw,
      spyCandles,
      qqqCandles,
      diaCandles,
      iwmCandles,
    ] = await Promise.all([
      Promise.all(allSymbols.map(s => fh<Record<string, number>>(`/quote?symbol=${s}`, {}))),
      Promise.all(WATCHLIST.map(s => fh<Record<string, number>>(`/quote?symbol=${s}`, {}))),
      fh<unknown[]>('/news?category=general&minId=0', []),
      fh<{ economicCalendar?: unknown[] }>(`/calendar/economic?from=${new Date().toISOString().slice(0,10)}&to=${new Date(Date.now()+2*86400000).toISOString().slice(0,10)}`, {}),
      fh<{ earningsCalendar?: unknown[] }>(`/calendar/earnings?from=${new Date().toISOString().slice(0,10)}&to=${new Date(Date.now()+5*86400000).toISOString().slice(0,10)}`, {}),
      fh<unknown[]>('/stock/recommendation?symbol=SPY', []),
      fh<{ h: number[]; l: number[]; c: number[] }>(`/stock/candle?symbol=SPY&resolution=D&from=${from}&to=${now}`, { h:[], l:[], c:[] }),
      fh<{ h: number[]; l: number[]; c: number[] }>(`/stock/candle?symbol=QQQ&resolution=D&from=${from}&to=${now}`, { h:[], l:[], c:[] }),
      fh<{ h: number[]; l: number[]; c: number[] }>(`/stock/candle?symbol=DIA&resolution=D&from=${from}&to=${now}`, { h:[], l:[], c:[] }),
      fh<{ h: number[]; l: number[]; c: number[] }>(`/stock/candle?symbol=IWM&resolution=D&from=${from}&to=${now}`, { h:[], l:[], c:[] }),
    ])

    // ── Build quote map ───────────────────────────────────────────────────────
    const Q: Record<string, { price: number; change: number; pct: number; prev: number }> = {}
    allSymbols.forEach((sym, i) => {
      const q = quotes[i]
      Q[sym] = { price: q.c ?? 0, change: q.d ?? 0, pct: q.dp ?? 0, prev: q.pc ?? 0 }
    })
    WATCHLIST.forEach((sym, i) => {
      const q = watchQuotes[i]
      Q[sym] = { price: q.c ?? 0, change: q.d ?? 0, pct: q.dp ?? 0, prev: q.pc ?? 0 }
    })

    // ── Expected moves ────────────────────────────────────────────────────────
    const candleMap: Record<string, { h: number[]; l: number[]; c: number[] }> = {
      SPY: spyCandles, QQQ: qqqCandles, DIA: diaCandles, IWM: iwmCandles,
    }

    const indexData = INDICES.map(idx => {
      const q   = Q[idx.symbol]
      const atr = calcATR(candleMap[idx.symbol])
      const em  = +(atr * 0.85).toFixed(2)
      const p   = q.price
      return {
        symbol:        idx.symbol,
        name:          idx.name,
        futures:       idx.futures,
        price:         +p.toFixed(2),
        change:        +q.change.toFixed(2),
        changePct:     +q.pct.toFixed(2),
        prevClose:     +q.prev.toFixed(2),
        expectedMove:  em,
        expectedHigh:  +(p + em / 2).toFixed(2),
        expectedLow:   +(p - em / 2).toFixed(2),
        keySupport:    +(p - em).toFixed(2),
        keyResistance: +(p + em).toFixed(2),
        atr,
      }
    })

    // ── Macro ─────────────────────────────────────────────────────────────────
    const macro = {
      gold:      Q.GLD.price ? `$${(Q.GLD.price * 10).toFixed(0)}` : 'N/A',
      goldChg:   Q.GLD.pct.toFixed(2),
      oil:       Q.USO.price ? `$${Q.USO.price.toFixed(2)}` : 'N/A',
      oilChg:    Q.USO.pct.toFixed(2),
      dollar:    Q.UUP.price ? `${Q.UUP.price.toFixed(2)}` : 'N/A',
      dollarChg: Q.UUP.pct.toFixed(2),
      bonds:     Q.TLT.price ? `$${Q.TLT.price.toFixed(2)}` : 'N/A',
      bondsChg:  Q.TLT.pct.toFixed(2),
      credit:    Q.HYG.price ? `$${Q.HYG.price.toFixed(2)}` : 'N/A',
      creditChg: Q.HYG.pct.toFixed(2),
    }

    // ── News ─────────────────────────────────────────────────────────────────
    const news = (Array.isArray(newsRaw) ? newsRaw : []).slice(0, 15).map((n: unknown) => {
      const item = n as Record<string, unknown>
      return {
        headline: String(item.headline ?? ''),
        source:   String(item.source   ?? ''),
        summary:  String(item.summary  ?? '').slice(0, 140),
        time:     item.datetime
          ? new Date(Number(item.datetime) * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
          : '',
      }
    }).filter(n => n.headline)

    // ── Economic calendar ─────────────────────────────────────────────────────
    const events = ((calendar?.economicCalendar ?? []) as unknown[]).slice(0, 12).map((e: unknown) => {
      const item = e as Record<string, unknown>
      return {
        event:    String(item.event    ?? ''),
        impact:   String(item.impact   ?? 'medium'),
        actual:   String(item.actual   ?? '—'),
        estimate: String(item.estimate ?? '—'),
        prior:    String(item.prev     ?? '—'),
        time:     String(item.time     ?? ''),
      }
    })

    // ── Earnings ─────────────────────────────────────────────────────────────
    const earnings = ((earningsRaw?.earningsCalendar ?? []) as unknown[]).slice(0, 10).map((e: unknown) => {
      const item = e as Record<string, unknown>
      return `${item.symbol}${item.epsEstimate ? ` (est EPS $${Number(item.epsEstimate).toFixed(2)})` : ''}`
    })

    // ── Analyst consensus ─────────────────────────────────────────────────────
    const recs    = Array.isArray(recsRaw) && recsRaw.length ? recsRaw[0] as Record<string,number> : null
    const analystConsensus = recs
      ? `Strong Buy: ${recs.strongBuy ?? 0} · Buy: ${recs.buy ?? 0} · Hold: ${recs.hold ?? 0} · Sell: ${recs.sell ?? 0} · Strong Sell: ${recs.strongSell ?? 0}`
      : 'Analyst data unavailable'

    // ── Watchlist summary ─────────────────────────────────────────────────────
    const watchlistStr = WATCHLIST.map(sym => {
      const q = Q[sym]
      return `${sym} $${q.price.toFixed(2)} (${q.pct >= 0 ? '+' : ''}${q.pct.toFixed(2)}%)`
    }).join(' | ')

    // ── Gemini prompt — fact-grounded, no hallucinations ─────────────────────
    const today   = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const etTime  = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })

    const prompt = `You are the Chief Market Strategist at YN Finance, a premium financial intelligence platform. You are producing the Daily Intelligence Briefing for active futures traders and serious investors.

CRITICAL RULES — you MUST follow these:
1. ONLY use the data provided below. Do NOT add statistics, percentages, or price levels not given to you.
2. Every claim must be directly traceable to the data provided.
3. Write like a senior Goldman Sachs strategist — precise, confident, concise.
4. No generic filler. Every sentence must contain a specific, actionable insight.
5. Output ONLY valid JSON, no markdown fences, no extra text before or after.

=== LIVE DATA (${today} · ${etTime} ET) ===

INDEX PRICES & EXPECTED MOVES:
${indexData.map(i => `${i.name} (${i.symbol} / ${i.futures}): $${i.price} | Change: ${i.changePct >= 0 ? '+' : ''}${i.changePct}% | Prev Close: $${i.prevClose} | ATR: ${i.atr} | Exp Move: ±$${i.expectedMove} | Range: $${i.expectedLow}–$${i.expectedHigh}`).join('\n')}

MACRO ETFs:
Gold (GLD×10): ${macro.gold} (${macro.goldChg}%)
Oil (USO): ${macro.oil} (${macro.oilChg}%)
Dollar (UUP/DXY): ${macro.dollar} (${macro.dollarChg}%)
20Y Bonds (TLT): ${macro.bonds} (${macro.bondsChg}%)
High Yield Credit (HYG): ${macro.credit} (${macro.creditChg}%)

WATCHLIST:
${watchlistStr}

WALL STREET CONSENSUS (SPY analyst ratings):
${analystConsensus}

EARNINGS THIS WEEK:
${earnings.length ? earnings.join(', ') : 'No major earnings this week'}

ECONOMIC EVENTS:
${events.length ? events.map(e => `${e.event} | Impact: ${e.impact} | Estimate: ${e.estimate} | Prior: ${e.prior}`).join('\n') : 'No major scheduled events'}

TOP NEWS HEADLINES:
${news.slice(0, 12).map((n, i) => `${i + 1}. [${n.source}] ${n.headline}`).join('\n')}

=== OUTPUT JSON SCHEMA ===
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL" | "CAUTIOUS",
  "sentimentScore": <integer 1–100, 50=neutral, based ONLY on data above>,
  "headline": "<biggest single market story in 10 words — specific, not generic>",
  "subheadline": "<supporting context in 15 words — what it means for traders>",
  "brief": "<4 sentences. Synthesize today's overall market tone using the index moves, macro data, and news. Be specific — name actual price levels and percentage moves from the data.>",
  "keyPoints": ["<specific point 1>", "<specific point 2>", "<specific point 3>", "<specific point 4>"],
  "indices": [
    {
      "symbol": "SPY",
      "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
      "biasReason": "<1 sentence — reference the actual price, change%, or ATR from the data>",
      "keyLevel": "<single most important price level from the data above>",
      "tradeNote": "<1 tactical sentence for today's session — specific to today's conditions>"
    },
    { "symbol": "QQQ", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." },
    { "symbol": "DIA", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." },
    { "symbol": "IWM", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." }
  ],
  "macroReading": "<2–3 sentences reading the cross-asset picture using the ACTUAL gold/oil/dollar/bond data above. State what the moves imply about institutional risk appetite.>",
  "institutionalView": "<2 sentences on what the analyst consensus data and macro positioning imply about where large money is leaning today.>",
  "earningsNote": "<1–2 sentences on this week's earnings — name the specific companies from the data, or state clearly there are no major catalysts.>",
  "playbook": {
    "theme": "<today's dominant market theme in 5 words>",
    "bullCase": "<what bulls need — reference a specific price level or catalyst from the data>",
    "bearCase": "<what bears need — reference a specific price level or catalyst from the data>",
    "ideas": [
      "<trade idea 1 — specific instrument, direction, and condition from today's data>",
      "<trade idea 2 — specific instrument, direction, and condition from today's data>",
      "<trade idea 3 — specific instrument, direction, and condition from today's data>"
    ],
    "avoid": "<what NOT to do today — specific reason tied to the data>"
  },
  "riskAlert": "<the single biggest risk to watch today — specific, tied to data>",
  "traderTip": "<one sharp edge for today in under 20 words>"
}`

    const raw = await gemini(prompt)
    const ai  = safeJson(raw)

    if (!ai.sentiment) {
      console.error('[daily-intel] Gemini returned invalid JSON:', raw.slice(0, 200))
      return NextResponse.json({ intel: null, demo: true })
    }

    // ── Merge AI analysis into index data ────────────────────────────────────
    const aiIndices = (ai.indices ?? []) as Array<Record<string, string>>

    const finalIndices = indexData.map(idx => {
      const aiIdx = aiIndices.find(a => a.symbol === idx.symbol) ?? {}
      return {
        ...idx,
        bias:       aiIdx.bias       ?? 'NEUTRAL',
        biasReason: aiIdx.biasReason ?? '',
        keyLevel:   aiIdx.keyLevel   ?? String(idx.price),
        tradeNote:  aiIdx.tradeNote  ?? '',
      }
    })

    // ── Final intel object ────────────────────────────────────────────────────
    const intel = {
      date:              today,
      generatedAt:       new Date().toISOString(),
      edition:           'Daily Intelligence',
      sentiment:         String(ai.sentiment         ?? 'NEUTRAL'),
      sentimentScore:    Number(ai.sentimentScore     ?? 50),
      headline:          String(ai.headline          ?? ''),
      subheadline:       String(ai.subheadline       ?? ''),
      brief:             String(ai.brief             ?? ''),
      keyPoints:         (ai.keyPoints  as string[]) ?? [],
      indices:           finalIndices,
      macro,
      macroReading:      String(ai.macroReading      ?? ''),
      institutionalView: String(ai.institutionalView ?? ''),
      earningsNote:      String(ai.earningsNote      ?? ''),
      analystConsensus,
      earnings,
      playbook:          (ai.playbook  as object)    ?? {},
      riskAlert:         String(ai.riskAlert         ?? ''),
      traderTip:         String(ai.traderTip         ?? ''),
      calendar:          events,
      news:              news.slice(0, 9),
    }

    return NextResponse.json(
      { intel, demo: false },
      { headers: { 'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=1800' } }
    )

  } catch (err) {
    console.error('[daily-intel] error:', err)
    return NextResponse.json({ intel: null, demo: true })
  }
}
