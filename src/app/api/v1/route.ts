import { NextRequest, NextResponse } from 'next/server'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-api-key',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS })
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      source:    'ynfinance-api',
      version:   '1.0',
      timestamp: new Date().toISOString(),
      status:    'healthy',
      endpoints: [
        { method: 'POST', path: '/api/v1/analyze',             desc: 'AI trade analysis — verdict, confidence, key levels' },
        { method: 'GET',  path: '/api/v1/congress/trades',     desc: 'Congressional stock trade disclosures' },
        { method: 'POST', path: '/api/v1/earnings/decode',     desc: 'Earnings forensics — truth score, beat rate, lie detection' },
        { method: 'GET',  path: '/api/v1/smart-money/signals', desc: 'Insider purchases + unusual options + cross-asset signals' },
        { method: 'POST', path: '/api/v1/intelligence/run',    desc: 'Run any YN Intelligence weapon' },
      ],
      auth:  'Bearer yn_xxxx  |  x-api-key: yn_xxxx',
      docs:  'https://ynfinance.org/developers',
      email: 'api@ynfinance.org',
    },
    { headers: CORS_HEADERS }
  )
}
