import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 20

const ALLOWED_BASES = ['https://api.elections.kalshi.com', 'https://demo-api.kalshi.co']

/**
 * Thin, stateless relay for the user's OWN Kalshi requests. The BROWSER signs
 * every request with the user's private key (Web Crypto, key never leaves the
 * device); this route only forwards the already-signed request to Kalshi to get
 * past browser CORS. We never see or store the private key — only the per-request
 * signature the browser computed. Restricted to Kalshi's trade API.
 */
export async function POST(req: NextRequest) {
  let body: { method?: string; path?: string; query?: string; ts?: string; keyId?: string; sig?: string; payload?: unknown; base?: string }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'bad body' }, { status: 400 }) }

  const method = String(body.method || 'GET').toUpperCase()
  const path = String(body.path || '')
  const base = ALLOWED_BASES.includes(body.base || '') ? body.base! : ALLOWED_BASES[0]
  if (!['GET', 'POST', 'DELETE'].includes(method)) return NextResponse.json({ error: 'method not allowed' }, { status: 400 })
  if (!path.startsWith('/trade-api/v2/')) return NextResponse.json({ error: 'path not allowed' }, { status: 400 })
  if (!body.keyId || !body.ts || !body.sig) return NextResponse.json({ error: 'missing auth headers' }, { status: 400 })

  const url = base + path + (body.query ? `?${body.query}` : '')
  const headers: Record<string, string> = {
    'KALSHI-ACCESS-KEY': body.keyId,
    'KALSHI-ACCESS-TIMESTAMP': body.ts,
    'KALSHI-ACCESS-SIGNATURE': body.sig,
    Accept: 'application/json',
  }
  if (method !== 'GET') headers['Content-Type'] = 'application/json'

  try {
    const res = await fetch(url, { method, headers, body: method !== 'GET' && body.payload != null ? JSON.stringify(body.payload) : undefined, cache: 'no-store' })
    const text = await res.text()
    let data: unknown = null
    try { data = text ? JSON.parse(text) : null } catch { data = text }
    return NextResponse.json({ status: res.status, ok: res.ok, data }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ status: 0, ok: false, error: e instanceof Error ? e.message : 'relay failed' }, { status: 200 })
  }
}
