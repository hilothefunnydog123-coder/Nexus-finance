import { createClient } from '@supabase/supabase-js'
import type { AgentSignal } from './types'

export async function runConvergenceAgent(freshSignals: AgentSignal[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  const supabase  = createClient(url, key)
  const twoHrsAgo = new Date(Date.now() - 2 * 3600000).toISOString()

  // Fetch signals already stored in the last 2 hours
  const { data: stored } = await supabase
    .from('agent_signals')
    .select('agent_name, ticker, signal_text')
    .not('ticker', 'is', null)
    .gte('created_at', twoHrsAgo)

  // Combine DB signals with the signals we're inserting right now
  const all = [
    ...(stored ?? []).map(s => ({ agent: s.agent_name, ticker: s.ticker as string, text: s.signal_text })),
    ...freshSignals.filter(s => s.ticker).map(s => ({ agent: s.agent_name, ticker: s.ticker as string, text: s.signal_text })),
  ]

  // Group by ticker, deduplicate by agent
  const byTicker: Record<string, { agents: string[]; texts: string[] }> = {}
  for (const { agent, ticker, text } of all) {
    if (!byTicker[ticker]) byTicker[ticker] = { agents: [], texts: [] }
    if (!byTicker[ticker].agents.includes(agent)) {
      byTicker[ticker].agents.push(agent)
      byTicker[ticker].texts.push(text)
    }
  }

  // Fire convergence alert when 2+ agents flag the same ticker
  for (const [ticker, { agents, texts }] of Object.entries(byTicker)) {
    if (agents.length < 2) continue

    // Don't re-alert if we already fired for this ticker in the last 2 hours
    const { data: existing } = await supabase
      .from('convergence_alerts')
      .select('id')
      .eq('ticker', ticker)
      .gte('created_at', twoHrsAgo)
      .limit(1)

    if (existing && existing.length > 0) continue

    const agentList  = agents.map(a => a.toUpperCase()).join(' + ')
    const firstText  = texts[0]?.slice(0, 90) ?? ''
    const alertText  = `${agents.length} simultaneous signals on $${ticker}: ${agentList} — ${firstText}…`

    await supabase.from('convergence_alerts').insert({
      ticker,
      agent_count: agents.length,
      agents,
      alert_text: alertText,
    })
  }
}
