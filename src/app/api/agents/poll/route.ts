import { NextRequest, NextResponse } from 'next/server'
import { runAllAgents } from '@/lib/agents'

// Netlify/Vercel max function duration — agents need up to 60s
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET

  // Only enforce secret when the caller actually provides an Authorization header
  // (cron job always sends it; browser POLL NOW button sends nothing — both allowed)
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runAllAgents()
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    console.error('[/api/agents/poll]', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
