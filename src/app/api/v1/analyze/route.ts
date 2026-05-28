import { NextRequest, NextResponse } from 'next/server'

// ── CORS headers ───────────────────────────────────────────────────────────────
const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

// ── API key validation ─────────────────────────────────────────────────────────
function validateKey(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const key  = auth.replace(/^Bearer\s+/i, '') || req.headers.get('x-api-key') || ''
  // Accept any key starting with 'yn_' — real validation would check Supabase
  return key.startsWith('yn_') || key === process.env.YN_INTERNAL_API_KEY
}

// ── Response envelope helper ───────────────────────────────────────────────────
function envelope(data: Record<string, unknown>) {
  return {
    source:    'ynfinance-api',
    version:   '1.0',
    timestamp: new Date().toISOString(),
    ...data,
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── POST /api/v1/analyze ───────────────────────────────────────────────────────
// Body: { ticker, direction, entry, sl, tp }
// Returns: { verdict, confidence, sentiment_score, key_levels, recommendation }
export async function POST(req: NextRequest) {
  // Auth check
  if (!validateKey(req)) {
    return NextResponse.json(
      envelope({ error: 'Unauthorized — provide a valid API key via Authorization: Bearer yn_xxxx or x-api-key header', docs: 'https://ynfinance.org/developers#auth' }),
      { status: 401, headers: CORS }
    )
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(envelope({ error: 'Invalid JSON body' }), { status: 400, headers: CORS })
  }

  const ticker    = String(body.ticker    ?? '').toUpperCase().trim()
  const direction = String(body.direction ?? 'long').toLowerCase()
  const entry     = Number(body.entry  ?? 0)
  const sl        = Number(body.sl     ?? 0)
  const tp        = Number(body.tp     ?? 0)

  if (!ticker) {
    return NextResponse.json(envelope({ error: 'ticker is required' }), { status: 400, headers: CORS })
  }
  if (!entry || !sl || !tp) {
    return NextResponse.json(envelope({ error: 'entry, sl, and tp are required' }), { status: 400, headers: CORS })
  }

  // Proxy to the internal stock-analyzer API
  try {
    const host     = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const internalUrl = `${protocol}://${host}/api/stock-analyzer`

    const upstreamRes = await fetch(internalUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ticker, direction, entry, sl, tp }),
    })

    if (!upstreamRes.ok) {
      const err = await upstreamRes.json().catch(() => ({ error: 'Upstream error' }))
      return NextResponse.json(envelope({ error: 'Analysis service error', detail: err }), { status: 502, headers: CORS })
    }

    const analysis = await upstreamRes.json()

    return NextResponse.json(
      envelope({
        ticker,
        direction,
        levels: { entry, sl, tp },
        verdict:         analysis.verdict            ?? analysis.overall_sentiment ?? 'NEUTRAL',
        confidence:      analysis.confidence         ?? 0,
        sentiment_score: analysis.sentiment_score    ?? 0,
        key_levels:      analysis.key_levels         ?? { support: sl, resistance: tp },
        recommendation:  analysis.recommendation     ?? analysis.summary ?? '',
      }),
      { headers: CORS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(envelope({ error: msg }), { status: 500, headers: CORS })
  }
}
