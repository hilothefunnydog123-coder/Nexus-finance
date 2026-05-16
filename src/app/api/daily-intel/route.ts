import { NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

// Instruments tracked in the intelligence report
const INDICES = [
  { symbol: 'SPY',  name: 'S&P 500',     futures: 'ES',  mult: 50  },
  { symbol: 'QQQ',  name: 'Nasdaq 100',  futures: 'NQ',  mult: 20  },
  { symbol: 'DIA',  name: 'Dow Jones',   futures: 'YM',  mult: 5   },
  { symbol: 'IWM',  name: 'Russell 2000',futures: 'RTY', mult: 50  },
]
const MACRO_SYMBOLS = ['GLD', 'USO', 'UUP', 'TLT', 'HYG']
const WATCHLIST = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'META', 'AMZN', 'AMD', 'JPM']

function fh(path: string) {
  return fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { next: { revalidate: 0 } }).then(r => r.json()).catch(() => null)
}

function calcATR(candles: { h: number[]; l: number[]; c: number[] }, period = 14): number {
  if (!candles?.c?.length || candles.c.length < 2) return 0
  const trs: number[] = []
  for (let i = 1; i < Math.min(period + 1, candles.c.length); i++) {
    const hl  = candles.h[i] - candles.l[i]
    const hpc = Math.abs(candles.h[i] - candles.c[i - 1])
    const lpc = Math.abs(candles.l[i] - candles.c[i - 1])
    trs.push(Math.max(hl, hpc, lpc))
  }
  return trs.length ? trs.reduce((a, b) => a + b, 0) / trs.length : 0
}

async function gemini(prompt: string): Promise<string> {
  if (!GM) return '{}'
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GM}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 2000, temperature: 0.5 },
      }),
    }
  )
  const json = await res.json()
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}'
}

export async function GET() {
  if (!FH || FH.includes('your_') || !GM) {
    return NextResponse.json({ intel: null, demo: true })
  }

  try {
    const now   = Math.floor(Date.now() / 1000)
    const from  = now - 30 * 24 * 60 * 60  // 30 days ago

    // ── Parallel data fetch ───────────────────────────────────────────────────
    const allSymbols = [...INDICES.map(i => i.symbol), ...MACRO_SYMBOLS]

    const [
      quotes,
      watchlistQuotes,
      newsRaw,
      calendar,
      spyCandles,
      qqqCandles,
      earningsRaw,
      recommendationsRaw,
    ] = await Promise.all([
      // Batch quotes for all index + macro ETFs
      Promise.all(allSymbols.map(s => fh(`/quote?symbol=${s}`))),
      // Watchlist stock quotes
      Promise.all(WATCHLIST.map(s => fh(`/quote?symbol=${s}`))),
      // Market news
      fh('/news?category=general'),
      // Economic calendar
      fh(`/calendar/economic?from=${new Date().toISOString().slice(0,10)}&to=${new Date(Date.now()+2*86400000).toISOString().slice(0,10)}`),
      // SPY candles for ATR/expected move calc
      fh(`/stock/candle?symbol=SPY&resolution=D&from=${from}&to=${now}`),
      // QQQ candles
      fh(`/stock/candle?symbol=QQQ&resolution=D&from=${from}&to=${now}`),
      // Earnings calendar (next 5 days)
      fh(`/calendar/earnings?from=${new Date().toISOString().slice(0,10)}&to=${new Date(Date.now()+5*86400000).toISOString().slice(0,10)}`),
      // Analyst recommendations for SPY (broad market consensus)
      fh('/stock/recommendation?symbol=SPY'),
    ])

    // ── Quote mapping ─────────────────────────────────────────────────────────
    const quoteMap: Record<string, { price: number; change: number; pct: number; prevClose: number }> = {}
    allSymbols.forEach((sym, i) => {
      const q = quotes[i]
      quoteMap[sym] = { price: q?.c ?? 0, change: q?.d ?? 0, pct: q?.dp ?? 0, prevClose: q?.pc ?? 0 }
    })
    WATCHLIST.forEach((sym, i) => {
      const q = watchlistQuotes[i]
      quoteMap[sym] = { price: q?.c ?? 0, change: q?.d ?? 0, pct: q?.dp ?? 0, prevClose: q?.pc ?? 0 }
    })

    // ── Expected Moves (ATR-based) ────────────────────────────────────────────
    const spyATR  = calcATR(spyCandles)
    const qqqATR  = calcATR(qqqCandles)
    // Scale ATR to other indices proportionally
    const spyPrice = quoteMap['SPY'].price || 1
    const qqqPrice = quoteMap['QQQ'].price || 1

    const indexMoves = INDICES.map(idx => {
      const q = quoteMap[idx.symbol]
      const price = q?.price || 0
      let atr = 0
      if (idx.symbol === 'SPY') atr = spyATR
      else if (idx.symbol === 'QQQ') atr = qqqATR
      else if (idx.symbol === 'DIA') atr = spyATR * (quoteMap['DIA'].price / spyPrice) * 1.05
      else if (idx.symbol === 'IWM') atr = spyATR * (quoteMap['IWM'].price / spyPrice) * 0.85

      const em = +(atr * 0.85).toFixed(2)  // ~68% probability range
      return {
        symbol: idx.symbol,
        name: idx.name,
        futures: idx.futures,
        price: +price.toFixed(2),
        change: +(q?.change ?? 0).toFixed(2),
        changePct: +(q?.pct ?? 0).toFixed(2),
        prevClose: +(q?.prevClose ?? 0).toFixed(2),
        expectedMove: em,
        expectedHigh: +(price + em / 2).toFixed(2),
        expectedLow:  +(price - em / 2).toFixed(2),
        bias: 'NEUTRAL' as 'BULLISH' | 'BEARISH' | 'NEUTRAL',
        biasReason: '',
        keySupport:    +(price - em).toFixed(2),
        keyResistance: +(price + em).toFixed(2),
      }
    })

    // ── Macro snapshot ────────────────────────────────────────────────────────
    const gld  = quoteMap['GLD']
    const uso  = quoteMap['USO']
    const uup  = quoteMap['UUP']
    const tlt  = quoteMap['TLT']  // 20Y bond ETF (inverse yield proxy)
    const hyg  = quoteMap['HYG']  // High yield bonds (risk-on/off)

    const macro = {
      gold:    gld?.price ? `$${(gld.price * 10).toFixed(0)}` : 'N/A',   // GLD ≈ 1/10 gold price
      goldChg: gld?.pct?.toFixed(2) ?? '0',
      oil:     uso?.price ? `$${(uso.price * 1).toFixed(2)}` : 'N/A',    // USO proxy
      oilChg:  uso?.pct?.toFixed(2) ?? '0',
      dollar:  uup?.price ? `${uup.price.toFixed(2)} (UUP)` : 'N/A',
      dollarChg: uup?.pct?.toFixed(2) ?? '0',
      bonds:   tlt?.price ? `$${tlt.price.toFixed(2)} TLT` : 'N/A',
      bondsChg: tlt?.pct?.toFixed(2) ?? '0',
      credit:  hyg?.price ? `$${hyg.price.toFixed(2)} HYG` : 'N/A',
      creditChg: hyg?.pct?.toFixed(2) ?? '0',
    }

    // ── News ─────────────────────────────────────────────────────────────────
    const news = (Array.isArray(newsRaw) ? newsRaw : []).slice(0, 15).map((n: {
      headline: string; summary?: string; source: string; datetime?: number
    }) => ({
      headline: n.headline,
      summary:  n.summary?.slice(0, 120) ?? '',
      source:   n.source,
      time:     n.datetime ? new Date(n.datetime * 1000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '',
    }))

    // ── Economic calendar ────────────────────────────────────────────────────
    const events = (calendar?.economicCalendar || []).slice(0, 10).map((e: {
      event: string; impact?: string; actual?: string; estimate?: string; prev?: string; time?: string
    }) => ({
      event: e.event, impact: e.impact || 'medium',
      actual: e.actual || '—', estimate: e.estimate || '—', prior: e.prev || '—',
      time: e.time || '',
    }))

    // ── Earnings ─────────────────────────────────────────────────────────────
    const earnings = (earningsRaw?.earningsCalendar || []).slice(0, 8).map((e: {
      symbol: string; epsEstimate?: number; date?: string
    }) => `${e.symbol}${e.epsEstimate ? ` (est. EPS: $${e.epsEstimate})` : ''}`)

    // ── Analyst recommendations ──────────────────────────────────────────────
    const recs = Array.isArray(recommendationsRaw) ? recommendationsRaw[0] : null
    const analystData = recs
      ? `Buy: ${recs.buy}, Hold: ${recs.hold}, Sell: ${recs.sell}, Strong Buy: ${recs.strongBuy}, Strong Sell: ${recs.strongSell}`
      : 'Data unavailable'

    // ── Watchlist summary ─────────────────────────────────────────────────────
    const watchlistSummary = WATCHLIST.map(sym => {
      const q = quoteMap[sym]
      return `${sym}: $${q?.price?.toFixed(2) ?? 'N/A'} (${q?.pct >= 0 ? '+' : ''}${q?.pct?.toFixed(2) ?? 0}%)`
    }).join(' | ')

    // ── Gemini AI Analysis ────────────────────────────────────────────────────
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

    const prompt = `You are the Chief Market Strategist for YN Finance, producing a premium daily intelligence briefing for institutional-caliber active traders and investors who trade ES, NQ, and major equities.

DATE: ${today}

LIVE MARKET DATA:
${indexMoves.map(i => `${i.name} (${i.symbol}): $${i.price} (${i.changePct >= 0 ? '+' : ''}${i.changePct}%) | Prev Close: $${i.prevClose}`).join('\n')}

MACRO ETFs:
Gold (GLD proxy): ${macro.gold} (${macro.goldChg}%)
Oil (USO): ${macro.oil} (${macro.oilChg}%)
Dollar (UUP): ${macro.dollar} (${macro.dollarChg}%)
Bonds (TLT): ${macro.bonds} (${macro.bondsChg}%)
Credit (HYG): ${macro.credit} (${macro.creditChg}%)

WATCHLIST:
${watchlistSummary}

ANALYST CONSENSUS (SPY):
${analystData}

EARNINGS THIS WEEK:
${earnings.length ? earnings.join(', ') : 'No major earnings'}

ECONOMIC EVENTS TODAY:
${events.length ? events.map((e: { event: string; impact: string }) => `${e.event} (impact: ${e.impact})`).join(', ') : 'No major events scheduled'}

TOP NEWS HEADLINES:
${news.slice(0, 10).map(n => `• [${n.source}] ${n.headline}`).join('\n')}

EXPECTED MOVE DATA (ATR-based):
${indexMoves.map(i => `${i.name}: ±$${i.expectedMove} | Range: $${i.expectedLow} – $${i.expectedHigh}`).join('\n')}

Generate a premium intelligence report in this EXACT JSON format (no markdown, valid JSON only):
{
  "sentiment": "BULLISH" | "BEARISH" | "NEUTRAL" | "CAUTIOUS",
  "sentimentScore": <number 1-100, 50=neutral>,
  "headline": "<most important thing traders need to know today, max 12 words>",
  "subheadline": "<supporting context, max 18 words>",
  "brief": "<3-4 sentence morning overview: overall market tone, key drivers, what matters most today>",
  "keyPoints": ["<point 1>", "<point 2>", "<point 3>", "<point 4>"],
  "indices": [
    {
      "symbol": "SPY",
      "bias": "BULLISH" | "BEARISH" | "NEUTRAL",
      "biasReason": "<1 sentence: specific technical or fundamental reason for this bias>",
      "keyLevel": "<single most important price level to watch today>",
      "tradeNote": "<specific tactical note for today's session>"
    },
    { "symbol": "QQQ", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." },
    { "symbol": "DIA", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." },
    { "symbol": "IWM", "bias": "...", "biasReason": "...", "keyLevel": "...", "tradeNote": "..." }
  ],
  "macroReading": "<2-3 sentences: what gold, oil, dollar, and bond moves are telling us about institutional risk appetite today>",
  "institutionalView": "<2-3 sentences: what the analyst consensus and macro data imply about where smart money is positioned>",
  "earningsNote": "<1-2 sentences about upcoming earnings impact if relevant, or 'No major earnings catalyst today'>",
  "playbook": {
    "theme": "<today's dominant market theme in 5 words max>",
    "bullCase": "<what needs to happen for bulls to win today>",
    "bearCase": "<what would flip the tape bearish>",
    "ideas": ["<specific actionable idea 1>", "<specific actionable idea 2>", "<specific actionable idea 3>"],
    "avoid": "<what NOT to trade or do today and why>"
  },
  "riskAlert": "<most important risk or tail risk traders should respect today>",
  "traderTip": "<one sharp, specific tip under 20 words for today's conditions>"
}`

    const raw   = await gemini(prompt)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('Gemini parse failed')
    const ai = JSON.parse(match[0])

    // Merge AI bias into indexMoves
    const finalIndices = indexMoves.map(idx => {
      const aiIdx = (ai.indices || []).find((a: { symbol: string }) => a.symbol === idx.symbol)
      return {
        ...idx,
        bias:         aiIdx?.bias       ?? 'NEUTRAL',
        biasReason:   aiIdx?.biasReason ?? '',
        keyLevel:     aiIdx?.keyLevel   ?? '',
        tradeNote:    aiIdx?.tradeNote  ?? '',
      }
    })

    const intel = {
      date:        today,
      generatedAt: new Date().toISOString(),
      edition:     'Daily Intelligence',
      sentiment:   ai.sentiment    ?? 'NEUTRAL',
      sentimentScore: ai.sentimentScore ?? 50,
      headline:    ai.headline     ?? '',
      subheadline: ai.subheadline  ?? '',
      brief:       ai.brief        ?? '',
      keyPoints:   ai.keyPoints    ?? [],
      indices:     finalIndices,
      macro,
      macroReading:     ai.macroReading     ?? '',
      institutionalView: ai.institutionalView ?? '',
      earningsNote:     ai.earningsNote     ?? '',
      analystConsensus: analystData,
      earnings,
      playbook:    ai.playbook     ?? {},
      riskAlert:   ai.riskAlert    ?? '',
      traderTip:   ai.traderTip    ?? '',
      calendar:    events,
      news:        news.slice(0, 9),
    }

    return NextResponse.json(
      { intel, demo: false },
      { headers: { 'Cache-Control': 'public, s-maxage=10800, stale-while-revalidate=1800' } } // 3hr cache
    )
  } catch (err) {
    console.error('[daily-intel]', err)
    return NextResponse.json({ intel: null, demo: true })
  }
}
