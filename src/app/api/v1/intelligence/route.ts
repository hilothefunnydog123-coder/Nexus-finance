import { NextRequest, NextResponse } from 'next/server'
import { validateApiKey, extractKey } from '@/lib/apiKeys'

const CORS: Record<string, string> = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

const VALID_WEAPONS = ['lockup', 'liedetector', 'galaxybrain', 'flow', 'signals', 'filing'] as const
type Weapon = typeof VALID_WEAPONS[number]


function envelope(data: Record<string, unknown>) {
  return { source: 'ynfinance-api', version: '1.0', timestamp: new Date().toISOString(), ...data }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS })
}

// ── POST /api/v1/intelligence/run ──────────────────────────────────────────────
// Body: { weapon: "lockup"|"liedetector"|"galaxybrain"|"flow"|"signals"|"filing", input: string }
// Returns: { result: {...} }
export async function POST(req: NextRequest) {
  if (!await validateApiKey(extractKey(req.headers))) {
    return NextResponse.json(
      envelope({ error: 'Unauthorized', docs: 'https://ynfinance.org/developers#auth' }),
      { status: 401, headers: CORS }
    )
  }

  let body: Record<string, unknown>
  try { body = await req.json() }
  catch { return NextResponse.json(envelope({ error: 'Invalid JSON body' }), { status: 400, headers: CORS }) }

  const weapon = String(body.weapon ?? '').toLowerCase().trim() as Weapon
  const input  = body.input != null ? String(body.input) : undefined

  if (!weapon) {
    return NextResponse.json(
      envelope({ error: 'weapon is required', valid_weapons: VALID_WEAPONS }),
      { status: 400, headers: CORS }
    )
  }

  if (!VALID_WEAPONS.includes(weapon)) {
    return NextResponse.json(
      envelope({ error: `Unknown weapon: ${weapon}`, valid_weapons: VALID_WEAPONS }),
      { status: 400, headers: CORS }
    )
  }

  // Weapons that don't need input
  const noInputWeapons: Weapon[] = ['flow', 'signals']
  if (!noInputWeapons.includes(weapon) && !input) {
    return NextResponse.json(
      envelope({ error: `weapon "${weapon}" requires an input (ticker or scenario string)` }),
      { status: 400, headers: CORS }
    )
  }

  try {
    const host     = req.headers.get('host') ?? 'localhost:3000'
    const protocol = host.startsWith('localhost') ? 'http' : 'https'
    const internalUrl = `${protocol}://${host}/api/intelligence`

    const upstreamRes = await fetch(internalUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ mode: weapon, input }),
    })

    if (!upstreamRes.ok) {
      const errBody = await upstreamRes.json().catch(() => ({}))
      return NextResponse.json(
        envelope({ error: 'Intelligence service error', detail: errBody }),
        { status: 502, headers: CORS }
      )
    }

    const data = await upstreamRes.json()

    return NextResponse.json(
      envelope({
        weapon,
        input:  input ?? null,
        result: data.result ?? data,
      }),
      { headers: CORS }
    )
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return NextResponse.json(envelope({ error: msg }), { status: 500, headers: CORS })
  }
}
