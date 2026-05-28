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

// ── GET /api/v1/smart-money/signals?type=all|insider|options ──────────────────
export async function GET(req: NextRequest) {
  if (!validateKey(req)) {
    return NextResponse.json(
      envelope({ error: 'Unauthorized', docs: 'https://ynfinance.org/developers#auth' }),
      { status: 401, headers: CORS }
    )
  }

  const { searchParams } = new URL(req.url)
  const type = (searchParams.get('type') ?? 'all') as 'all' | 'insider' | 'options'

  try {
    const host     = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'

    // Use the intelligence API in signals mode for cross-asset signals
    const intelUrl = `${protocol}://${host}/api/intelligence`
    const [intelRes, intelInsiderRes] = await Promise.all([
      type !== 'insider'
        ? fetch(intelUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ mode: 'signals' }),
          })
        : Promise.resolve(null),
      type !== 'options'
        ? fetch(intelUrl, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ mode: 'flow' }),
          })
        : Promise.resolve(null),
    ])

    const signalData   = intelRes         ? await intelRes.json().catch(() => ({}))         : {}
    const insiderData  = intelInsiderRes  ? await intelInsiderRes.json().catch(() => ({}))  : {}

    const signalResult  = signalData.result  ?? signalData
    const insiderResult = insiderData.result ?? insiderData

    const signals: unknown[] = []

    // Map cross-asset signals
    if (type !== 'insider' && Array.isArray(signalResult.active_signals)) {
      const mapped = signalResult.active_signals.map((s: Record<string, unknown>) => ({
        type:        'cross-asset',
        ticker:      null,
        direction:   null,
        conviction:  s.conviction ?? 'MEDIUM',
        status:      s.status     ?? 'ACTIVE',
        correlation: s.correlation,
        trade:       s.trade,
        timing:      s.timing,
        hit_rate:    s.historical_hit_rate,
        source:      'signal-radar',
      }))
      signals.push(...mapped)
    }

    // Map forced flow events
    if (type !== 'options' && Array.isArray(insiderResult.events)) {
      const mapped = insiderResult.events.map((e: Record<string, unknown>) => ({
        type:             'forced-flow',
        ticker:           Array.isArray(e.affected_tickers) ? e.affected_tickers[0] : null,
        direction:        String(e.direction ?? '').includes('BUY') ? 'BUY' : 'SELL',
        conviction:       (Number(e.confidence) >= 70) ? 'HIGH' : 'MEDIUM',
        status:           'ACTIVE',
        event_type:       e.event_type,
        date:             e.date,
        magnitude:        e.magnitude,
        edge:             e.edge,
        affected_tickers: e.affected_tickers,
        source:           'forced-flow',
      }))
      signals.push(...mapped)
    }

    return NextResponse.json(
      envelope({
        type,
        signals,
        summary: {
          signal_count:     signals.length,
          most_actionable:  signalResult.most_actionable  ?? null,
          market_regime:    signalResult.market_regime    ?? null,
          biggest_edge:     insiderResult.biggest_edge    ?? null,
        },
        last_updated: new Date().toISOString(),
      }),
      { headers: CORS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(envelope({ error: msg }), { status: 500, headers: CORS })
  }
}
