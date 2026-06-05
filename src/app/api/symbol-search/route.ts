import { NextRequest, NextResponse } from 'next/server'

const FH = process.env.FINNHUB_API_KEY

type Match = { symbol: string; description: string }

export async function GET(req: NextRequest) {
  const q = (new URL(req.url).searchParams.get('q') ?? '').trim()
  if (!q) return NextResponse.json({ results: [] as Match[] })
  try {
    const r = await fetch(`https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FH}`, { cache: 'no-store' })
    if (!r.ok) return NextResponse.json({ results: [] as Match[], unavailable: true })
    const d = await r.json()
    const raw: Array<{ symbol?: string; description?: string; type?: string }> = Array.isArray(d?.result) ? d.result : []
    const seen = new Set<string>()
    const results: Match[] = []
    for (const x of raw) {
      const sym = (x.symbol ?? '').toUpperCase()
      // keep clean US-style tickers (no exchange suffixes like .L or BRK.A handled separately)
      if (!sym || sym.includes(':') || seen.has(sym)) continue
      if (x.type && x.type !== 'Common Stock' && x.type !== 'ETP' && x.type !== 'ETF' && x.type !== 'ADR' && x.type !== '') continue
      seen.add(sym)
      results.push({ symbol: sym, description: x.description ?? '' })
      if (results.length >= 8) break
    }
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] as Match[], unavailable: true })
  }
}
