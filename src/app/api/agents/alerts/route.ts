import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ signals: [], convergence: [] })
  }

  const supabase = createClient(supabaseUrl, serviceKey)
  const limit    = Math.min(Number(new URL(req.url).searchParams.get('limit') ?? '40'), 100)

  const [signalsRes, convergenceRes] = await Promise.all([
    supabase
      .from('agent_signals')
      .select('id, created_at, agent_name, ticker, signal_text, conviction, source_url')
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('convergence_alerts')
      .select('id, created_at, ticker, agent_count, agents, alert_text')
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  return NextResponse.json({
    signals:     signalsRes.data     ?? [],
    convergence: convergenceRes.data ?? [],
  })
}
