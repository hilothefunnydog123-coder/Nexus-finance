import { NextRequest, NextResponse } from 'next/server'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

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
  { symbol: 'ES',   price: 5248.00 }, { symbol: 'NQ',  price: 18240.00 }, { symbol: 'GC', price: 2389.40 },
]

async function getAITrade(traderId: string, currentPnl: number, positions: string): Promise<{ action: string; symbol: string; quantity: number; reasoning: string } | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null

  const trader = AI_TRADERS.find(t => t.id === traderId) || AI_TRADERS[0]

  // Add some price noise to simulate live market
  const prices = INSTRUMENTS.map(i => ({
    symbol: i.symbol,
    price: +(i.price * (1 + (Math.random() - 0.5) * 0.002)).toFixed(i.price > 100 ? 2 : 4)
  }))

  const prompt = `You are ${trader.name}, an AI trader competing in a live trading tournament. Your style: ${trader.personality}.

LIVE MARKET PRICES RIGHT NOW:
${prices.map(p => `${p.symbol}: $${p.price}`).join('\n')}

YOUR CURRENT STATE:
- P&L: ${currentPnl > 0 ? '+' : ''}${currentPnl.toFixed(2)}%
- Open positions: ${positions || 'None'}
- Account: $10,000 starting balance
- Tournament ends in ~${Math.floor(Math.random() * 240 + 30)} minutes

Based on your ${trader.style} strategy and ACTUAL current prices, make ONE trade decision. Think about: momentum, key levels, your current exposure, time remaining.

Return ONLY raw JSON (no markdown):
{"action":"BUY"|"SELL"|"HOLD","symbol":"<exact symbol from list>","quantity":<integer 1-100>,"reasoning":"<one tactical sentence>","confidence":<50-95>}`

  try {
    const res = await fetch(`${GEMINI_URL}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 200, temperature: 0.7 }
      })
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
  const { traderId, currentPnl = 0, positions = '' } = await req.json()

  if (!traderId) {
    // Return all AI traders with fresh decisions
    const results = await Promise.all(
      AI_TRADERS.map(async t => {
        const pnl = (Math.random() - 0.3) * 20 // seeded starting pnl
        const trade = await getAITrade(t.id, pnl, '')
        return { ...t, pnl: +pnl.toFixed(2), trade }
      })
    )
    return NextResponse.json({ traders: results })
  }

  const trade = await getAITrade(traderId, currentPnl, positions)
  return NextResponse.json({ trade })
}

export async function GET() {
  return NextResponse.json({ traders: AI_TRADERS })
}
