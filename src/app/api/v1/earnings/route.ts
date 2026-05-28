import { NextRequest, NextResponse } from 'next/server'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

function validateKey(req: NextRequest): boolean {
  const auth = req.headers.get('authorization') ?? ''
  const key  = auth.replace(/^Bearer\s+/i, '') || req.headers.get('x-api-key') || ''
  return key.startsWith('yn_') || key === process.env.YN_INTERNAL_API_KEY
}

function envelope(data: Record<string, unknown>) {
  return { source: 'ynfinance-api', version: '1.0', timestamp: new Date().toISOString(), ...data }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── POST /api/v1/earnings/decode ───────────────────────────────────────────────
// Body: { symbol }
// Returns: { truth_score, beat_rate, verdict, analysis }
export async function POST(req: NextRequest) {
  if (!validateKey(req)) {
    return NextResponse.json(
      envelope({ error: 'Unauthorized', docs: 'https://ynfinance.org/developers#auth' }),
      { status: 401, headers: CORS }
    )
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json(envelope({ error: 'Invalid JSON body' }), { status: 400, headers: CORS }) }

  const symbol = String(body.symbol ?? '').toUpperCase().trim()
  if (!symbol) {
    return NextResponse.json(envelope({ error: 'symbol is required' }), { status: 400, headers: CORS })
  }

  try {
    const host     = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'

    // Use the intelligence API in liedetector mode for earnings forensics
    const internalUrl = `${protocol}://${host}/api/intelligence`
    const upstreamRes = await fetch(internalUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode: 'liedetector', input: symbol }),
    })

    if (!upstreamRes.ok) {
      return NextResponse.json(envelope({ error: 'Earnings decode service error' }), { status: 502, headers: CORS })
    }

    const data = await upstreamRes.json()
    const result = data.result ?? data

    return NextResponse.json(
      envelope({
        symbol,
        truth_score:  result.divergence_score != null ? 100 - Number(result.divergence_score) : null,
        beat_rate:    null,  // requires historical earnings data
        verdict:      result.verdict       ?? 'NEUTRAL',
        confidence:   result.confidence    ?? 0,
        analysis:     result.hidden_truth  ?? result.what_smart_money_sees ?? '',
        the_trade:    result.the_trade     ?? null,
        catalyst:     result.catalyst      ?? null,
        red_flags:    result.red_flags     ?? [],
        green_flags:  result.green_flags   ?? [],
        divergence_score: result.divergence_score ?? null,
      }),
      { headers: CORS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(envelope({ error: msg }), { status: 500, headers: CORS })
  }
}
