import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

if (!process.env.GEMINI_API_KEY) {
  console.warn('[ai-trader] GEMINI_API_KEY not set — AI trade decisions will be unavailable')
}

const VALID_TRADER_IDS = new Set(['yn-alpha','yn-beta','yn-gamma','yn-delta','yn-epsilon'])
const LAST_CALL = new Map<string, number>()
const SANITIZE = /[^A-Za-z0-9/.,: -]/g

const AI_TRADERS = [
  { id: 'yn-alpha',   name: 'YN-ALPHA',   personality: 'aggressive momentum scalper — enters fast on breakouts, cuts losers in seconds, holds winners with conviction', style: 'MOMENTUM' },
  { id: 'yn-beta',    name: 'YN-BETA',    personality: 'conservative swing trader — waits for clean setups, high R:R only, never overtrading', style: 'SWING' },
  { id: 'yn-gamma',   name: 'YN-GAMMA',   personality: 'contrarian reversal hunter — fades extended moves, looks for exhaustion, mean-reversion specialist', style: 'CONTRARIAN' },
  { id: 'yn-delta',   name: 'YN-DELTA',   personality: 'trend follower — rides macro moves, larger size, patient entries, wide stops', style: 'TREND' },
  { id: 'yn-epsilon', name: 'YN-EPSILON', personality: 'high-frequency scalper — takes dozens of tiny trades, targets 0.2-0.5% per trade, fast in fast out', style: 'SCALPER' },
]

const INSTRUMENTS = [
  { symbol: 'AAPL', price: 189.50 }, { symbol: 'NVDA', price: 875.40 }, { symbol: 'TSLA', price: 248.80 },
  { symbol: 'SPY',  price: 512.80 }, { symbol: 'QQQ',  price: 438.60 }, { symbol: 'BTC/USD', price: 67240 },
  { symbol: 'ETH/USD', price: 3180 }, { symbol: 'EUR/USD', price: 1.0842 },
  { symbol: 'ES', price: 5248.00 }, { symbol: 'NQ', price: 18240.00 }, { symbol: 'GC', price: 2389.40 },
]

async function getAITrade(traderId: string, currentPnl: number, positions: string) {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const trader = AI_TRADERS.find(t => t.id === traderId)!
  const prices = INSTRUMENTS.map(i => ({ symbol: i.symbol, price: +(i.price * (1 + (Math.random()-0.5)*0.002)).toFixed(i.price > 100 ? 2 : 4) }))

  const prompt = `You are ${trader.name}, an AI trader competing in a live trading tournament. Style: ${trader.personality}.

LIVE PRICES: ${prices.map(p=>`${p.symbol}:$${p.price}`).join(' | ')}
YOUR P&L: ${currentPnl>0?'+':''}${currentPnl.toFixed(2)}%
OPEN POSITIONS: ${positions||'None'}

Make ONE trade decision. Return ONLY raw JSON:
{"action":"BUY"|"SELL"|"HOLD","symbol":"<symbol>","quantity":<1-100>,"reasoning":"<one sentence>","confidence":<50-95>}`

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { maxOutputTokens: 150, temperature: 0.7 } }),
    })
    if (!res.ok) return null
    const json = await res.json()
    const raw = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? ''
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) return null
    return JSON.parse(match[0])
  } catch { return null }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const traderId: string = body.traderId || ''
  const currentPnl: number = typeof body.currentPnl === 'number' ? body.currentPnl : 0
  const rawPositions: string = typeof body.positions === 'string' ? body.positions : ''
  const positions = rawPositions.replace(SANITIZE, '')

  // No traderId — return all traders (no per-trader rate limit needed here)
  if (!traderId) {
    const results = await Promise.all(
      AI_TRADERS.map(async t => {
        const pnl = (Math.random()-0.3) * 20
        const trade = await getAITrade(t.id, pnl, '')
        return { ...t, pnl: +pnl.toFixed(2), trade }
      })
    )
    return NextResponse.json({ traders: results })
  }

  // Validate trader ID
  if (!VALID_TRADER_IDS.has(traderId)) {
    return NextResponse.json({ error: 'Invalid trader' }, { status: 400 })
  }

  // Rate limit: 1 call per trader per 30s
  const last = LAST_CALL.get(traderId) || 0
  if (Date.now() - last < 30_000) {
    return NextResponse.json({ error: 'Rate limited', retryAfter: 30 }, { status: 429 })
  }
  LAST_CALL.set(traderId, Date.now())

  const trade = await getAITrade(traderId, currentPnl, positions)
  return NextResponse.json({ trade })
}

export async function GET() {
  return NextResponse.json({ traders: AI_TRADERS })
}
