import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY
const GM = process.env.GEMINI_API_KEY

const SYMBOLS = ['AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','JPM','GOOGL','COIN','PLTR','MSTR','NFLX','CRM','SHOP']

// ── Types ──────────────────────────────────────────────────────────────────────
interface InsiderTx {
  name:        string
  transactionCode: string
  share:       number
  filingDate:  string
  transactionDate: string
  transactionPrice: number
}

interface InsiderAlert {
  ticker:          string
  signal_type:     'INSIDER_BUY'
  name:            string
  shares:          number
  value:           number
  date:            string
  current_price:   number
  change_pct:      number
  signal_strength: 1 | 2 | 3
  ai_context:      string
}

interface OptionsAlert {
  ticker:          string
  signal_type:     'UNUSUAL_OPTIONS'
  contract_type:   'CALL' | 'PUT'
  strike:          number
  expiry:          string
  premium:         number
  contracts:       number
  total_value:     number
  signal_strength: 1 | 2 | 3
  current_price:   number
  change_pct:      number
  note:            string
  ai_context:      string
}

type Alert = InsiderAlert | OptionsAlert

// ── Helpers ────────────────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().split('T')[0]
}

async function fhGet(path: string) {
  try {
    const r = await fetch(`https://finnhub.io/api/v1${path}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

function signalStrength(value: number): 1 | 2 | 3 {
  if (value >= 500_000) return 3
  if (value >= 50_000)  return 2
  return 1
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function generateOptionsAlert(ticker: string, price: number, changePct: number): OptionsAlert {
  const isBullish  = Math.random() > 0.45
  const contractType: 'CALL' | 'PUT' = isBullish ? 'CALL' : 'PUT'
  const strikeMult = isBullish
    ? (1 + (0.03 + Math.random() * 0.07))
    : (1 - (0.03 + Math.random() * 0.07))
  const strike     = Math.round(price * strikeMult * 100) / 100
  const premium    = parseFloat((0.50 + Math.random() * 8).toFixed(2))
  const contracts  = Math.floor(50 + Math.random() * 950)
  const total      = Math.round(premium * contracts * 100)
  const strength   = signalStrength(total)

  // Expiry: 2-8 weeks out, on a Friday
  const expDate = new Date()
  expDate.setDate(expDate.getDate() + 14 + Math.floor(Math.random() * 42))
  // Shift to next Friday
  const day = expDate.getDay()
  const daysToFriday = day <= 5 ? 5 - day : 6
  expDate.setDate(expDate.getDate() + daysToFriday)
  const expiry = expDate.toISOString().split('T')[0]

  return {
    ticker,
    signal_type:     'UNUSUAL_OPTIONS',
    contract_type:   contractType,
    strike,
    expiry,
    premium,
    contracts,
    total_value:     total,
    signal_strength: strength,
    current_price:   price,
    change_pct:      changePct,
    note:            '(simulated signal for demo)',
    ai_context:      '',
  }
}

// ── GET ────────────────────────────────────────────────────────────────────────
export async function GET() {
  try {
    const cutoff = daysAgo(30)
    const insiderAlerts: InsiderAlert[] = []

    // Fetch insiders + quotes for all symbols in parallel
    const results = await Promise.all(
      SYMBOLS.map(async sym => {
        const [insiders, quote] = await Promise.all([
          fhGet(`/stock/insider-transactions?symbol=${sym}`),
          fhGet(`/quote?symbol=${sym}`),
        ])
        return { sym, insiders, quote }
      })
    )

    // Also simulate 5 options alerts — pick random tickers from those with quotes
    const optionsPool: OptionsAlert[] = []

    for (const { sym, insiders, quote } of results) {
      const price     = Number(quote?.c ?? 0)
      const changePct = Number(quote?.dp ?? 0)

      // Insider buys
      const data: InsiderTx[] = insiders?.data ?? []
      const buys = data.filter(t =>
        t.transactionCode === 'P' &&
        t.share > 0 &&
        (t.transactionDate ?? '') >= cutoff
      )

      for (const b of buys.slice(0, 3)) {
        const shares = b.share
        const txPrice = b.transactionPrice || price || 1
        const value  = shares * txPrice
        insiderAlerts.push({
          ticker:          sym,
          signal_type:     'INSIDER_BUY',
          name:            b.name || 'Unknown Insider',
          shares,
          value,
          date:            b.transactionDate || b.filingDate,
          current_price:   price,
          change_pct:      changePct,
          signal_strength: signalStrength(value),
          ai_context:      '',
        })
      }

      // Build options pool from symbols with valid prices
      if (price > 0 && optionsPool.length < 8) {
        optionsPool.push(generateOptionsAlert(sym, price, changePct))
      }
    }

    // Pick 5 options alerts from pool
    const shuffled = optionsPool.sort(() => Math.random() - 0.5).slice(0, 5)

    // Merge + sort by signal_strength desc, take top 20
    const all: Alert[] = [...insiderAlerts, ...shuffled]
    all.sort((a, b) => b.signal_strength - a.signal_strength)
    const top20 = all.slice(0, 20)

    return NextResponse.json({ alerts: top20, generated: new Date().toISOString() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[intel GET]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// ── POST ───────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const alert = await req.json() as Alert

    let prompt = ''
    if (alert.signal_type === 'INSIDER_BUY') {
      const ia = alert as InsiderAlert
      prompt = `You are a financial intelligence analyst explaining institutional signals to a retail trader.

Signal: INSIDER BUY
Ticker: ${ia.ticker}
Insider: ${ia.name}
Shares Purchased: ${ia.shares.toLocaleString()}
Estimated Value: $${ia.value.toLocaleString()}
Date: ${ia.date}
Current Price: $${ia.current_price.toFixed(2)} (${ia.change_pct >= 0 ? '+' : ''}${ia.change_pct.toFixed(2)}%)
Signal Strength: ${ia.signal_strength}/3

In 2-3 conversational sentences, explain what this insider buy signal means, why it matters that a company insider is buying now, and what a smart trader might consider doing with this information. Be direct and specific.`
    } else {
      const oa = alert as OptionsAlert
      prompt = `You are a financial intelligence analyst explaining unusual options flow to a retail trader.

Signal: UNUSUAL OPTIONS FLOW (${oa.note})
Ticker: ${oa.ticker}
Contract: ${oa.contract_type} $${oa.strike} expiring ${oa.expiry}
Premium: $${oa.premium} per share
Contracts: ${oa.contracts} (${oa.total_value.toLocaleString()} total notional)
Current Price: $${oa.current_price.toFixed(2)} (${oa.change_pct >= 0 ? '+' : ''}${oa.change_pct.toFixed(2)}%)
Signal Strength: ${oa.signal_strength}/3

In 2-3 conversational sentences, explain what this unusual options activity might signal about smart money positioning, what the bet implies about the stock's direction, and what a retail trader should watch for. Be direct and specific.`
    }

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GM}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.75, maxOutputTokens: 400 },
        }),
      }
    )
    if (!r.ok) throw new Error(`Gemini ${r.status}`)
    const d = await r.json()
    const analysis = d?.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return NextResponse.json({ analysis: analysis.trim() })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[intel POST]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// unused import guard
export const dynamic = 'force-dynamic'
