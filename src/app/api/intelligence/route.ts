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

async function gemini(prompt: string, temp = 0.8): Promise<string> {
  const r = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GM}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: temp, maxOutputTokens: 2000 },
      }),
    }
  )
  if (!r.ok) throw new Error(`Gemini ${r.status}`)
  const d = await r.json()
  return d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
}

function extractJson(raw: string): Record<string, unknown> {
  const s = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
  const start = s.indexOf('{'), end = s.lastIndexOf('}')
  if (start === -1 || end === -1) throw new Error('No JSON')
  // Balanced walk
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
  return JSON.parse(s.slice(start, end + 1))
}

// ── LOCKUP ASSASSIN ───────────────────────────────────────────────────────────
async function runLockup(ticker: string) {
  const [quote, profile, news] = await Promise.all([
    fh(`/quote?symbol=${ticker}`),
    fh(`/stock/profile2?symbol=${ticker}`),
    fh(`/company-news?symbol=${ticker}&from=${daysAgo(30)}&to=${today()}`),
  ])
  const price = Number(quote?.c ?? 0)
  const name  = String(profile?.name ?? ticker)
  const ipo   = String(profile?.ipo ?? '')
  const headlines = (Array.isArray(news) ? news : []).slice(0, 4).map((n: { headline?: string }) => n.headline ?? '').join(' | ')

  const raw = await gemini(`You are an expert in IPO lock-up expirations and their market impact.

Ticker: ${ticker} (${name}) | IPO Date: ${ipo || 'recent'} | Current Price: $${price.toFixed(2)}
Recent news: ${headlines || 'none'}

Analyze this stock for lock-up expiration opportunity. Calculate or estimate:
1. When the 180-day lock-up likely expires based on IPO date
2. How many insider shares become eligible to sell (estimate based on typical IPO float)
3. Historical pattern of how similar lock-ups affected price

Return ONLY JSON:
{
  "lockup_date": "YYYY-MM-DD or estimated",
  "days_until": <integer or null>,
  "estimated_unlock_shares": "<X million shares>",
  "estimated_float_increase": "<X%>",
  "historical_avg_drop": "<X%>",
  "setup_quality": "HIGH" | "MEDIUM" | "LOW",
  "confidence": <integer 0-100>,
  "thesis": "<3-4 sentences on the specific setup for ${ticker}>",
  "trade": {
    "type": "BUY PUTS" | "SHORT" | "AVOID",
    "entry_timing": "<specific timing instruction>",
    "strike": "<OTM% or specific level>",
    "expiry": "<timeframe>",
    "exit": "<exit condition>",
    "risk": "<what could go wrong specifically for ${ticker}>"
  },
  "insider_profile": "<who the insiders are and their likely behavior>",
  "red_flags": ["<flag1>","<flag2>"]
}`)
  return { ticker, name, price, ...extractJson(raw) }
}

// ── LIE DETECTOR ─────────────────────────────────────────────────────────────
async function runLieDetector(ticker: string) {
  const [profile, news, rec] = await Promise.all([
    fh(`/stock/profile2?symbol=${ticker}`),
    fh(`/company-news?symbol=${ticker}&from=${daysAgo(14)}&to=${today()}`),
    fh(`/stock/recommendation?symbol=${ticker}`),
  ])
  const name = String(profile?.name ?? ticker)
  const headlines = (Array.isArray(news) ? news : []).slice(0, 8)
    .map((n: { headline?: string; source?: string; summary?: string }) => `[${n.source}] ${n.headline} — ${n.summary ?? ''}`)
    .join('\n')
  const r0 = Array.isArray(rec) && rec[0]
  const analystData = r0 ? `${r0.buy + r0.strongBuy} Buy / ${r0.hold} Hold / ${r0.sell + r0.strongSell} Sell` : 'no data'

  const raw = await gemini(`You are a forensic financial analyst who detects hidden signals in earnings communications.

Company: ${ticker} (${name})
Wall Street consensus: ${analystData}
Recent news & earnings coverage:
${headlines || 'No recent news found'}

Run your LIE DETECTOR analysis. Find:
1. What management is emphasizing (and why they're deflecting from something else)
2. What the numbers say vs what the narrative says
3. Hidden bearish or bullish signals retail traders will miss
4. The divergence between analyst consensus and what the data actually shows

Return ONLY JSON:
{
  "verdict": "BULLISH_HIDDEN" | "BEARISH_HIDDEN" | "NEUTRAL" | "CONFIRMED_BULLISH" | "CONFIRMED_BEARISH",
  "confidence": <0-100>,
  "headline_narrative": "<what management wants you to believe in 1 sentence>",
  "hidden_truth": "<what's actually happening in 1-2 sentences — the thing they buried>",
  "red_flags": [
    { "signal": "<specific thing detected>", "severity": "HIGH"|"MEDIUM"|"LOW", "implication": "<what it means>" }
  ],
  "green_flags": [
    { "signal": "<positive hidden signal>", "implication": "<why it matters>" }
  ],
  "divergence_score": <0-100, where 100 means massive gap between narrative and reality>,
  "what_smart_money_sees": "<2-3 sentences on institutional perspective vs retail>",
  "the_trade": "<specific actionable trade based on the hidden signals>",
  "catalyst": "<what event will reveal the truth to the market>",
  "timeline": "<when this plays out>"
}`)
  return { ticker, name, ...extractJson(raw) }
}

// ── GALAXY BRAIN ─────────────────────────────────────────────────────────────
async function runGalaxyBrain(scenario: string) {
  const raw = await gemini(`You are the top macro-to-micro trader at a $50B hedge fund.

Macro scenario: "${scenario}"

Trace the COMPLETE domino effect. Be specific. Include sectors, individual stocks, timing, and magnitude.
Connect dots that retail traders would NEVER connect.

Return ONLY JSON:
{
  "scenario_clarity": <0-100, how specific/tradeable the scenario is>,
  "primary_direction": "RISK_ON" | "RISK_OFF" | "MIXED" | "SECTOR_ROTATION",
  "domino_chain": [
    {
      "step": 1,
      "what_happens": "<specific market event>",
      "who_moves_first": "<asset class or sector>",
      "magnitude": "<estimated % move or $ flow>",
      "timing": "<how quickly>"
    }
  ],
  "obvious_trades": [
    { "ticker": "<symbol>", "direction": "LONG"|"SHORT", "reason": "<why>", "conviction": "HIGH"|"MED"|"LOW" }
  ],
  "non_obvious_trades": [
    {
      "ticker": "<symbol>",
      "direction": "LONG"|"SHORT",
      "connection": "<the 3-step logic chain retail misses>",
      "conviction": "HIGH"|"MED"|"LOW",
      "options_play": "<specific strategy>"
    }
  ],
  "what_breaks_the_thesis": "<specific condition that would invalidate all of this>",
  "timeline": "<how long until each step plays out>",
  "positioning": "<how to size across the trade ideas>"
}`, 0.9)
  return { scenario, ...extractJson(raw) }
}

// ── FORCED FLOW ───────────────────────────────────────────────────────────────
async function runForcedFlow() {
  const now     = new Date()
  const month   = now.toLocaleString('en-US', { month: 'long' })
  const year    = now.getFullYear()
  const day     = now.getDate()

  // Next monthly options expiration (3rd Friday)
  const nextExpiry = getNextOpexDate()
  const daysToExpiry = Math.ceil((nextExpiry.getTime() - now.getTime()) / 86400000)

  // Fetch key ETF/index data
  const [spy, qqq, iwm] = await Promise.all([
    fh('/quote?symbol=SPY'), fh('/quote?symbol=QQQ'), fh('/quote?symbol=IWM'),
  ])

  const raw = await gemini(`You are a market structure expert who understands mechanical flows.

Today: ${month} ${day}, ${year}
Days until monthly options expiration (OPEX): ${daysToExpiry}
SPY: $${Number(spy?.c ?? 0).toFixed(2)} | QQQ: $${Number(qqq?.c ?? 0).toFixed(2)} | IWM: $${Number(iwm?.c ?? 0).toFixed(2)}

Identify ALL forced/mechanical buying and selling events happening in the next 30 days:
1. Options expiration flows (gamma, delta hedging)
2. Monthly index rebalancing (S&P, Russell, MSCI)
3. ETF creations/redemptions
4. End-of-month/quarter window dressing
5. Known large options positions (max pain)

Return ONLY JSON:
{
  "opex_date": "${nextExpiry.toISOString().split('T')[0]}",
  "days_to_opex": ${daysToExpiry},
  "events": [
    {
      "event_type": "<type of forced flow>",
      "date": "<specific date or date range>",
      "direction": "FORCED_BUY" | "FORCED_SELL" | "MIXED",
      "magnitude": "<estimated $ amount or share count>",
      "affected_tickers": ["<ticker1>","<ticker2>"],
      "edge": "<the specific trade to front-run this>",
      "confidence": <0-100>,
      "window": "<entry to exit timing>"
    }
  ],
  "biggest_edge": "<the single best forced flow trade this month with specific entry>",
  "max_pain_levels": { "SPY": <price>, "QQQ": <price> },
  "regime": "<current market structure regime and what it means for flows>"
}`)
  return { generated: new Date().toISOString(), ...extractJson(raw) }
}

// ── SIGNAL RADAR ──────────────────────────────────────────────────────────────
async function runSignalRadar() {
  const symbols = ['GLD','USO','UUP','TLT','BTC-USD','KRW=X','LUM','XLF','XLE','XLK','VIX','HYG']
  const quotes  = await Promise.all(
    ['GLD','USO','UUP','TLT','XLF','XLE','XLK','HYG'].map(s => fh(`/quote?symbol=${s}`))
  )
  const [gld,uso,uup,tlt,xlf,xle,xlk,hyg] = quotes
  const mktData = `Gold: $${Number(gld?.c??0).toFixed(0)} (${Number(gld?.dp??0).toFixed(1)}%) | Oil: $${Number(uso?.c??0).toFixed(0)} (${Number(uso?.dp??0).toFixed(1)}%) | DXY/UUP: $${Number(uup?.c??0).toFixed(2)} (${Number(uup?.dp??0).toFixed(1)}%) | TLT: $${Number(tlt?.c??0).toFixed(0)} (${Number(tlt?.dp??0).toFixed(1)}%) | XLF: ${Number(xlf?.dp??0).toFixed(1)}% | XLE: ${Number(xle?.dp??0).toFixed(1)}% | XLK: ${Number(xlk?.dp??0).toFixed(1)}% | HYG: ${Number(hyg?.dp??0).toFixed(1)}%`

  const raw = await gemini(`You are an expert in non-obvious cross-asset correlations that predict stock moves 24-72 hours in advance.

CURRENT CROSS-ASSET DATA:
${mktData}

Known correlations to check:
- Dollar strength → EM exporters, multinationals
- Oil moves → Airlines, trucking (inverse), energy
- Gold/TLT divergence → Risk appetite signal
- HYG (junk bonds) leading equities by 24-48h
- Tech vs Financials rotation signal
- Korean Won as semiconductor demand proxy

Identify which correlations are currently FIRING and what trades they signal.

Return ONLY JSON:
{
  "active_signals": [
    {
      "correlation": "<the specific cross-asset relationship>",
      "status": "FIRING" | "APPROACHING" | "COOLING",
      "current_trigger": "<what specifically triggered it with the data above>",
      "implied_move": "<asset and direction>",
      "historical_hit_rate": "<X% of X occurrences>",
      "timing": "<24h | 48h | 72h | 1 week>",
      "trade": "<specific ticker, direction, and options/equity play>",
      "magnitude": "<estimated % move>",
      "conviction": "HIGH" | "MEDIUM" | "LOW"
    }
  ],
  "most_actionable": "<the single highest conviction signal firing right now>",
  "market_regime": "<current cross-asset regime in 1-2 sentences>",
  "watch_list": ["<cross-asset level to watch>"],
  "contrarian_read": "<what would surprise the market most right now>"
}`)
  return { mktData, ...extractJson(raw) }
}

// ── FILING X-RAY ─────────────────────────────────────────────────────────────
async function runFilingXRay(ticker: string) {
  // Fetch from SEC EDGAR
  let filingText = ''
  try {
    const searchRes = await fetch(
      `https://efts.sec.gov/LATEST/search-index?q=%22${ticker}%22&dateRange=custom&startdt=${daysAgo(30)}&enddt=${today()}&forms=8-K,10-Q`,
      { cache: 'no-store' }
    )
    if (searchRes.ok) {
      const data = await searchRes.json()
      const hits = data.hits?.hits ?? []
      filingText = hits.slice(0, 3).map((h: Record<string,Record<string,string>>) =>
        `${h._source?.file_date} | ${h._source?.form_type} | ${h._source?.entity_name}: ${(h._source?.period_of_report ?? '')}`
      ).join('\n')
    }
  } catch {}

  const [profile, news] = await Promise.all([
    fh(`/stock/profile2?symbol=${ticker}`),
    fh(`/company-news?symbol=${ticker}&from=${daysAgo(30)}&to=${today()}`),
  ])
  const name = String(profile?.name ?? ticker)
  const recent = (Array.isArray(news) ? news : []).slice(0, 6).map((n: { headline?: string }) => n.headline ?? '').join(' | ')

  const raw = await gemini(`You are a forensic accountant who finds what companies hide in SEC filings.

Company: ${ticker} (${name})
Recent SEC filing activity: ${filingText || 'checking EDGAR...'}
Recent news: ${recent || 'none'}

Do a complete Filing X-Ray. Find the things companies bury that retail traders miss:
- Footnote disclosures that contradict the headline
- Changes in accounting methodology
- Deferred revenue manipulation
- Related party transactions
- Going concern risks buried in language
- Guidance language that changed subtly
- New risk factors added quietly
- Insider selling disclosed in footnotes

Return ONLY JSON:
{
  "xray_verdict": "CLEAN" | "YELLOW_FLAGS" | "RED_FLAGS" | "CRITICAL",
  "confidence": <0-100>,
  "buried_signals": [
    {
      "location": "<where it was found — page, footnote, etc>",
      "what_it_says": "<exact type of disclosure>",
      "what_it_means": "<plain English translation>",
      "market_impact": "BULLISH" | "BEARISH" | "NEUTRAL",
      "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
    }
  ],
  "narrative_vs_reality": {
    "what_they_want_you_to_think": "<management narrative>",
    "what_the_numbers_actually_say": "<the divergence>",
    "gap_size": "SMALL" | "MODERATE" | "LARGE"
  },
  "the_trade": "<specific trade based on what was found>",
  "risk_to_thesis": "<what would invalidate this>",
  "timeline": "<when this becomes public knowledge>",
  "key_metric_to_watch": "<the one number that will confirm or deny this>"
}`)
  return { ticker, name, filingActivity: filingText, ...extractJson(raw) }
}

// ── ROUTER ────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { mode, input } = await req.json()
    if (!mode) return NextResponse.json({ error: 'mode required' }, { status: 400 })

    let result: Record<string, unknown>
    switch (mode) {
      case 'lockup':      result = await runLockup(input?.toUpperCase()?.trim() ?? 'NVDA'); break
      case 'liedetector': result = await runLieDetector(input?.toUpperCase()?.trim() ?? 'AAPL'); break
      case 'galaxybrain': result = await runGalaxyBrain(input ?? 'Fed raises rates 50bps'); break
      case 'flow':        result = await runForcedFlow(); break
      case 'signals':     result = await runSignalRadar(); break
      case 'filing':      result = await runFilingXRay(input?.toUpperCase()?.trim() ?? 'TSLA'); break
      default: return NextResponse.json({ error: `Unknown mode: ${mode}` }, { status: 400 })
    }
    return NextResponse.json({ mode, result })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[intelligence]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

function today()      { return new Date().toISOString().split('T')[0] }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate()-n); return d.toISOString().split('T')[0] }
function getNextOpexDate() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth()
  for (let m = month; m <= month + 2; m++) {
    const d  = new Date(year, m % 12, 1)
    let fridays = 0
    while (d.getMonth() === (m % 12)) {
      if (d.getDay() === 5) { fridays++; if (fridays === 3) { if (d > now) return d } }
      d.setDate(d.getDate() + 1)
    }
  }
  return new Date()
}
