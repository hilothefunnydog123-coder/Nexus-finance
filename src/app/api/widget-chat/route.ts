import { NextRequest, NextResponse } from 'next/server'

const SYSTEM_PROMPT = `You are an elite trading assistant for YN Finance with access to live market data.

Rules:
- Use the LIVE MARKET DATA provided below — never guess or fabricate prices
- Respond conversationally, like talking to a fellow trader — no bullet points, no markdown, no asterisks, just clean natural sentences
- Reference the actual numbers from the data when answering questions about prices, levels, or performance
- Be specific, direct, and analytical — give actual levels, trend reads, what you'd watch, and how you'd approach it
- For NQ/ES futures questions, use QQQ/SPY prices as proxies (state this when relevant)
- Keep responses to 3-5 sentences unless the question genuinely needs more depth
- Never hedge with "this is not financial advice" — give the professional read like a desk analyst would
- Sound confident, calm, and specific`

// Tickers to always include
const BASE_SYMBOLS = ['SPY','QQQ','AAPL','NVDA','TSLA','MSFT','AMZN','META','AMD','JPM']

// Crypto symbols (Finnhub format)
const CRYPTO = {
  BTC:  'BINANCE:BTCUSDT',
  ETH:  'BINANCE:ETHUSDT',
  SOL:  'BINANCE:SOLUSDT',
}

// Words in questions that map to additional symbols to fetch
const QUESTION_MAP: Record<string, string[]> = {
  'NQ':       ['QQQ'],
  'NASDAQ':   ['QQQ'],
  'ES':       ['SPY'],
  'S&P':      ['SPY'],
  'BITCOIN':  ['BINANCE:BTCUSDT'],
  'BTC':      ['BINANCE:BTCUSDT'],
  'ETH':      ['BINANCE:ETHUSDT'],
  'SOL':      ['BINANCE:SOLUSDT'],
  'NFLX':     ['NFLX'],
  'GOOGL':    ['GOOGL'],
  'GOOG':     ['GOOGL'],
  'COIN':     ['COIN'],
  'PLTR':     ['PLTR'],
  'MSTR':     ['MSTR'],
}

// All supported instrument symbols in the app
const ALL_KNOWN = ['AAPL','NVDA','TSLA','MSFT','GOOGL','AMZN','META','AMD','JPM','SPY','QQQ','NFLX','COIN','PLTR','MSTR','INTC','PYPL','BA','GLD','SLV']

interface FinnhubQuote { c: number; d: number; dp: number; h: number; l: number; pc: number }

async function fetchQuote(symbol: string, apiKey: string): Promise<string | null> {
  try {
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${apiKey}`
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) })
    if (!res.ok) return null
    const d: FinnhubQuote = await res.json()
    if (!d.c || d.c === 0) return null

    const sign  = d.dp >= 0 ? '+' : ''
    const dsign = d.d >= 0 ? '+' : ''
    const label = symbol.startsWith('BINANCE:')
      ? symbol.replace('BINANCE:', '').replace('USDT', '/USD')
      : symbol

    return `${label}: $${d.c.toFixed(2)} (${sign}${d.dp.toFixed(2)}% / ${dsign}$${d.d.toFixed(2)}) — H: $${d.h.toFixed(2)} · L: $${d.l.toFixed(2)} · Prev: $${d.pc.toFixed(2)}`
  } catch {
    return null
  }
}

function detectSymbols(question: string): string[] {
  const upper = question.toUpperCase()
  const extras: string[] = []

  // Check known aliases
  for (const [word, syms] of Object.entries(QUESTION_MAP)) {
    if (upper.includes(word)) extras.push(...syms)
  }

  // Check all known tickers directly mentioned
  for (const sym of ALL_KNOWN) {
    if (upper.includes(sym) && !BASE_SYMBOLS.includes(sym)) extras.push(sym)
  }

  return [...new Set(extras)]
}

export async function POST(req: NextRequest) {
  const geminiKey  = process.env.GEMINI_API_KEY
  const finnhubKey = process.env.FINNHUB_API_KEY || process.env.NEXT_PUBLIC_FINNHUB_API_KEY

  if (!geminiKey) return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })

  const { question, history } = await req.json() as {
    question: string
    history?: { role: string; text: string }[]
  }
  if (!question?.trim()) return NextResponse.json({ error: 'No question provided' }, { status: 400 })

  // ── Fetch live market data ────────────────────────────────────────────────
  let marketBlock = ''
  if (finnhubKey) {
    const extras   = detectSymbols(question)
    const symbols  = [...new Set([...BASE_SYMBOLS, ...extras])]
    const cryptoSyms = Object.values(CRYPTO)

    const [stockResults, cryptoResults] = await Promise.all([
      Promise.all(symbols.map(s => fetchQuote(s, finnhubKey))),
      Promise.all(cryptoSyms.map(s => fetchQuote(s, finnhubKey))),
    ])

    const stockLines  = stockResults.filter(Boolean)
    const cryptoLines = cryptoResults.filter(Boolean)

    if (stockLines.length || cryptoLines.length) {
      const now = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', timeZone: 'America/New_York' })
      marketBlock = `\n\n--- LIVE MARKET DATA (Finnhub · ${now} ET) ---\n`
      if (stockLines.length) marketBlock += stockLines.join('\n') + '\n'
      if (cryptoLines.length) marketBlock += cryptoLines.join('\n') + '\n'
      marketBlock += `Note: NQ futures questions → use QQQ as proxy. ES futures → use SPY.\n---`
    }
  }

  // ── Build prompt ──────────────────────────────────────────────────────────
  const historyText = history?.length
    ? '\n\n--- Previous conversation ---\n' + history.map(m => `${m.role === 'user' ? 'Trader' : 'Assistant'}: ${m.text}`).join('\n')
    : ''

  const fullPrompt = `${SYSTEM_PROMPT}${marketBlock}${historyText}\n\nTrader: ${question}`

  // ── Call Gemini ───────────────────────────────────────────────────────────
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 512 },
      }),
    }
  )

  const data = await res.json()
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
  if (!reply) {
    return NextResponse.json({ error: data.error?.message || 'No response from Gemini' }, { status: 502 })
  }
  return NextResponse.json({ reply })
}
