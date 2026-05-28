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

// ── GET /api/v1/congress/trades?limit=20&days=30 ───────────────────────────────
export async function GET(req: NextRequest) {
  if (!validateKey(req)) {
    return NextResponse.json(
      envelope({ error: 'Unauthorized', docs: 'https://ynfinance.org/developers#auth' }),
      { status: 401, headers: CORS }
    )
  }

  const { searchParams } = new URL(req.url)
  const limit = Math.min(Number(searchParams.get('limit') ?? 20), 100)
  const days  = Math.min(Number(searchParams.get('days')  ?? 30), 365)

  try {
    const host     = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const internalUrl = `${protocol}://${host}/api/congress?limit=${limit}&days=${days}`

    const upstreamRes = await fetch(internalUrl, { cache: 'no-store' })
    if (!upstreamRes.ok) {
      return NextResponse.json(envelope({ error: 'Congress data service error' }), { status: 502, headers: CORS })
    }

    const data = await upstreamRes.json()

    return NextResponse.json(
      envelope({
        trades:  data.trades  ?? [],
        stats:   data.stats   ?? {},
        filters: { limit, days },
      }),
      { headers: CORS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(envelope({ error: msg }), { status: 500, headers: CORS })
  }
}
