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

// Standard normal CDF (erf approximation) — used for probability-of-profit
function Phi(x: number): number {
  const s = x < 0 ? -1 : 1
  const z = Math.abs(x) / Math.SQRT2
  const t = 1 / (1 + 0.3275911 * z)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z)
  return 0.5 * (1 + s * y)
}
const r2 = (n: number) => Math.round(n * 100) / 100
const r0 = (n: number) => Math.round(n)

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

    const [quote, profile, news, rec, earnings, peers, metric] = await Promise.all([
      fh(`/quote?symbol=${sym}`),
      fh(`/stock/profile2?symbol=${sym}`),
      fh(`/company-news?symbol=${sym}&from=${weekAgo}&to=${todayStr}`),
      fh(`/stock/recommendation?symbol=${sym}`),
      fh(`/stock/earnings?symbol=${sym}&limit=4`),
      fh(`/stock/peers?symbol=${sym}`),
      fh(`/stock/metric?symbol=${sym}&metric=all`),
    ])

    // Candles non-blocking
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

    const r0rec       = Array.isArray(rec) && rec[0]
    const analystBuy  = r0rec ? Number(r0rec.buy ?? 0) + Number(r0rec.strongBuy ?? 0) : 0
    const analystHold = r0rec ? Number(r0rec.hold ?? 0) : 0
    const analystSell = r0rec ? Number(r0rec.sell ?? 0) + Number(r0rec.strongSell ?? 0) : 0
    const analystTotal= analystBuy + analystHold + analystSell

    const candleArr: { t: number; o: number; h: number; l: number; c: number }[] = []
    if (candles?.s === 'ok' && Array.isArray(candles.t)) {
      for (let i = 0; i < candles.t.length; i++) {
        candleArr.push({ t: candles.t[i], o: candles.o[i], h: candles.h[i], l: candles.l[i], c: candles.c[i] })
      }
    }

    const headlines = (Array.isArray(news) ? news : []).slice(0, 6)
      .map((n: { headline?: string }) => `- ${n.headline ?? ''}`)
      .join('\n') || '- No recent news'

    const pct52 = high52 > low52 ? (((price - low52) / (high52 - low52)) * 100).toFixed(0) : '50'

    // ── Fundamentals (Finnhub metric) ──
    const M = (metric && (metric as { metric?: Record<string, unknown> }).metric) || {}
    const mNum = (k: string) => { const v = Number((M as Record<string, unknown>)[k]); return isFinite(v) && v !== 0 ? v : null }
    const grossM = mNum('grossMarginTTM'), netM = mNum('netProfitMarginTTM')
    const revG   = mNum('revenueGrowthTTMYoy'), roe = mNum('roeTTM')
    const de     = mNum('totalDebt/totalEquityAnnual') ?? mNum('totalDebt/totalEquityQuarterly')
    const psTTM  = mNum('psTTM')
    const fundStr = [
      grossM != null ? `Gross margin ${grossM.toFixed(1)}%` : null,
      netM   != null ? `Net margin ${netM.toFixed(1)}%`     : null,
      revG   != null ? `Rev growth YoY ${revG.toFixed(1)}%` : null,
      roe    != null ? `ROE ${roe.toFixed(1)}%`             : null,
      psTTM  != null ? `P/S ${psTTM.toFixed(1)}`            : null,
      de     != null ? `Debt/Equity ${de.toFixed(2)}`       : null,
    ].filter(Boolean).join(' | ') || 'Limited fundamentals available'

    // ── Peers ──
    const peerSyms = (Array.isArray(peers) ? peers : []).filter((p: unknown) => typeof p === 'string' && (p as string).toUpperCase() !== sym).slice(0, 4) as string[]
    const peerProfiles = await Promise.all(peerSyms.map(p => fh(`/stock/profile2?symbol=${p}`)))
    const peerRows = peerSyms.map((p, i) => ({
      ticker: p,
      pe:   Number(peerProfiles[i]?.peRatio ?? 0),
      mcap: Number(peerProfiles[i]?.marketCapitalization ?? 0),
    }))
    const peerStr = peerRows.length
      ? peerRows.map(r => `${r.ticker} P/E ${r.pe > 0 ? r.pe.toFixed(1) : 'N/A'} MCap $${(r.mcap / 1000).toFixed(1)}B`).join(' | ')
      : 'No peer data available'

    // ── Realized volatility + expected move ──
    const closes = candleArr.map(c => c.c).filter(x => x > 0)
    let annVol = 0
    if (closes.length > 20) {
      const rets: number[] = []
      for (let i = 1; i < closes.length; i++) if (closes[i - 1] > 0) rets.push(Math.log(closes[i] / closes[i - 1]))
      if (rets.length > 5) {
        const mean = rets.reduce((a, b) => a + b, 0) / rets.length
        const variance = rets.reduce((a, b) => a + (b - mean) * (b - mean), 0) / (rets.length - 1)
        annVol = Math.sqrt(variance) * Math.sqrt(252)
      }
    }
    if (annVol <= 0) annVol = Math.max(0.2, Math.abs(beta) * 0.18) // fallback proxy
    const emPctD = (d: number) => annVol * Math.sqrt(d / 365) * 100
    const em1w = emPctD(7), em1m = emPctD(30)
    const ivLabel = annVol > 0.6 ? 'High' : annVol > 0.4 ? 'Elevated' : annVol > 0.25 ? 'Moderate' : 'Low'

    // Earnings context
    const earningsArr = Array.isArray(earnings) ? earnings : []
    const nextEarnings = earningsArr[0]?.date ?? null
    const lastEPS      = earningsArr[0]?.actualEPS ?? earningsArr[0]?.actual ?? null
    const estEPS       = earningsArr[0]?.estimateEPS ?? earningsArr[0]?.estimate ?? null
    const epsSurprise  = lastEPS && estEPS ? (((lastEPS - estEPS) / Math.abs(estEPS)) * 100).toFixed(1) : null
    const earningsCtx  = nextEarnings
      ? `Next earnings: ${nextEarnings}${epsSurprise ? ` | Last EPS surprise: ${epsSurprise}%` : ''}`
      : 'Earnings date: N/A'

    const prompt = `You are a senior equity + derivatives analyst writing an institutional research note on ${sym} (${name}, ${industry}) for active traders and options traders. Be specific, opinionated and quantitative. No generic filler. Return ONLY raw JSON.

LIVE DATA
Price $${price.toFixed(2)} | 1D ${change1d.toFixed(2)}% | 52W $${low52.toFixed(2)}-$${high52.toFixed(2)} (${pct52}% of range)
Market cap $${(marketCap/1000).toFixed(1)}B | P/E ${pe>0?pe.toFixed(1):'N/A'} | Beta ${beta.toFixed(2)}
Fundamentals: ${fundStr}
Peers: ${peerStr}
Analysts: ${analystTotal>0?`${analystBuy} buy / ${analystHold} hold / ${analystSell} sell`:'n/a'}
${earningsCtx}
Volatility: realized ${(annVol*100).toFixed(0)}% annualized (${ivLabel}). Expected move +/-${em1w.toFixed(1)}% over 1 week, +/-${em1m.toFixed(1)}% over 1 month.
Recent news:
${headlines}

REQUIREMENTS
- Give reasons traders actually act on: catalysts WITH timing, positioning, order flow, relative strength, and what the market is mispricing right now. No textbook fluff.
- Compare ${sym} directly to the named peers: where it is cheap or expensive on valuation, growth and margins, and the single clearest reason it stands out (or lags). Reference peers by ticker.
- Options section is the priority. Pick a structure that fits THIS volatility regime and your directional view. Use the expected move above to justify the strikes. Explain it the way a real options trader thinks: IV vs realized vol, theta decay, the move you need versus the expected move, and probability. Also give one alternative income play.
- All price levels based on $${price.toFixed(2)}. No lazy round numbers.

Return EXACTLY this JSON shape (fill every field):
{"rating":"Buy","confidence":72,"price_target":0.0,"price_target_bear":0.0,"price_target_bull":0.0,"time_horizon":"3-6 months","executive_summary":"...","investment_thesis":"...","why_it_stands_out":"...","relative_valuation":"...","institutional_view":"...","vs_competitors":[{"ticker":"XXX","take":"..."},{"ticker":"YYY","take":"..."}],"bull_case":"...","bear_case":"...","entry_low":0.0,"entry_high":0.0,"stop_loss":0.0,"take_profit_1":0.0,"take_profit_2":0.0,"position_size_pct":2,"key_levels":{"strong_support":0.0,"support":0.0,"resistance":0.0,"strong_resistance":0.0},"risks":["...","...","..."],"catalysts":["...","..."],"sentiment":"Bullish","fundamentals_score":7,"technical_score":6,"sentiment_score":7,"analyst_consensus":"Hold","vs_sector":"Outperform","timeframes":{"1_week":"Bullish","1_month":"Bullish","3_months":"Neutral","6_months":"Bullish"},"options":{"directional_bias":"Bullish","strategy":"Bull Call Spread","type":"CALL","structure":"Debit Spread","long_strike_pct":2,"short_strike_pct":9,"expiry_days":45,"iv_environment":"${ivLabel} IV — ...","thesis":"...","reasoning":"...","income_play":"..."}}`

    const gemRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GM}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.65, maxOutputTokens: 8192, responseMimeType: 'application/json' },
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
    try { analysis = extractJson(rawText) }
    catch { return NextResponse.json({ error: `JSON parse failed. Raw: ${rawText.slice(0, 300)}` }, { status: 500 }) }

    // ── Options math (server-side, grounded in realized vol) ──
    const opts     = (analysis.options ?? {}) as Record<string, unknown>
    const oType    = String(opts.type) === 'PUT' ? 'PUT' : 'CALL'
    const structure= String(opts.structure ?? 'Single')
    const isSpread = /spread/i.test(structure) || opts.short_strike_pct != null
    const expiry   = Math.max(1, Number(opts.expiry_days ?? 45))
    const longPct  = Math.abs(Number(opts.long_strike_pct ?? opts.strike_pct ?? 3)) || 3
    const longStrike  = oType === 'CALL' ? r2(price * (1 + longPct / 100)) : r2(price * (1 - longPct / 100))
    const shortPct = Math.abs(Number(opts.short_strike_pct ?? (longPct + 6))) || (longPct + 6)
    const shortStrike = isSpread ? (oType === 'CALL' ? r2(price * (1 + shortPct / 100)) : r2(price * (1 - shortPct / 100))) : 0

    const emExp  = price > 0 ? price * annVol * Math.sqrt(expiry / 365) : price * 0.05  // 1 std-dev $ move by expiry
    const premAt = (k: number) => Math.max(0.4 * emExp - 0.5 * Math.abs(k - price), price * 0.004)
    const premLong  = premAt(longStrike)
    const premShort = isSpread ? premAt(shortStrike) : 0
    const debit  = Math.max(isSpread ? premLong - premShort : premLong, price * 0.003)
    const breakeven = oType === 'CALL' ? r2(longStrike + debit) : r2(longStrike - debit)
    const width  = isSpread ? Math.abs(shortStrike - longStrike) : 0
    const maxLoss   = r0(debit * 100)
    const maxProfit = isSpread ? r0((width - debit) * 100) : -1  // -1 => uncapped
    const z      = (breakeven - price) / (emExp || 1)
    const popRaw = oType === 'CALL' ? 1 - Phi(z) : Phi(z)
    const popPct = r0(Math.max(5, Math.min(95, popRaw * 100)))
    const emExpPct = price > 0 ? r2(emExp / price * 100) : 0

    return NextResponse.json({
      ticker: sym, name, price, change1d, prevClose,
      high52, low52, pe, marketCap, beta, industry,
      analystBuy, analystHold, analystSell, analystTotal,
      nextEarnings, lastEPS, estEPS, epsSurprise,
      realized_vol_pct: r0(annVol * 100),
      expected_move_1w_pct: r2(em1w),
      expected_move_1m_pct: r2(em1m),
      peers: peerRows,
      candles: candleArr.slice(-120),
      timeframe: tf,
      analysis: {
        ...analysis,
        options: {
          ...opts,
          type: oType,
          structure,
          strike: longStrike,
          short_strike: shortStrike,
          expiry_days: expiry,
          est_premium: r2(debit),
          breakeven,
          breakeven_call: oType === 'CALL' ? breakeven : r2(longStrike + debit),
          breakeven_put:  oType === 'PUT'  ? breakeven : r2(longStrike - debit),
          max_loss: maxLoss,
          max_profit: maxProfit,
          pop_pct: popPct,
          expected_move: r2(emExp),
          expected_move_pct: emExpPct,
        },
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[stock-analyzer]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
