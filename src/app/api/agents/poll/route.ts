import { NextRequest, NextResponse } from 'next/server'
import { runAllAgents } from '@/lib/agents'

// Netlify/Vercel max function duration — agents need up to 60s
export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const auth   = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET

  // Reject if a secret is configured and the caller doesn't have it
  if (secret && auth !== `Bearer ${secret}`) {
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
