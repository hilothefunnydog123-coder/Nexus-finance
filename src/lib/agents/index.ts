import { createClient } from '@supabase/supabase-js'
import { runCongressAgent }   from './congress'
import { runInsiderAgent }    from './insider'
import { runEarningsAgent }   from './earnings'
import { runMacroAgent }      from './macro'
import { runSentimentAgent }  from './sentiment'
import { runMomentumAgent }   from './momentum'
import { runOptionsAgent }    from './options'
import { runDarkPoolAgent }   from './darkpool'
import { runConvergenceAgent } from './convergence'
import type { AgentSignal }   from './types'

export async function runAllAgents(): Promise<{ total: number; byAgent: Record<string, number> }> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) throw new Error('Missing Supabase credentials')

  const supabase = createClient(supabaseUrl, serviceKey)

  // Run all agents in parallel — any failures are isolated
  const [congress, insider, earnings, macro, sentiment, momentum, options, darkpool] =
    await Promise.allSettled([
      runCongressAgent(),
      runInsiderAgent(),
      runEarningsAgent(),
      runMacroAgent(),
      runSentimentAgent(),
      runMomentumAgent(),
      runOptionsAgent(),
      runDarkPoolAgent(),
    ])

  const allSignals: AgentSignal[] = [
    ...settled(congress),
    ...settled(insider),
    ...settled(earnings),
    ...settled(macro),
    ...settled(sentiment),
    ...settled(momentum),
    ...settled(options),
    ...settled(darkpool),
  ]

  if (allSignals.length === 0) return { total: 0, byAgent: {} }

  // Deduplicate: skip if same agent+ticker already stored in the last 2 hours
  const twoHrsAgo = new Date(Date.now() - 2 * 3600000).toISOString()
  const { data: existing } = await supabase
    .from('agent_signals')
    .select('agent_name, ticker')
    .gte('created_at', twoHrsAgo)

  const seen = new Set((existing ?? []).map(s => `${s.agent_name}:${s.ticker ?? 'null'}`))

  const toInsert = allSignals.filter(s => {
    const k = `${s.agent_name}:${s.ticker ?? 'null'}`
    if (seen.has(k)) return false
    seen.add(k) // also deduplicate within this batch
    return true
  })

  if (toInsert.length > 0) {
    await supabase.from('agent_signals').insert(
      toInsert.map(s => ({
        agent_name: s.agent_name,
        ticker:     s.ticker ?? null,
        signal_text: s.signal_text,
        conviction:  s.conviction,
        source_url:  s.source_url ?? null,
        raw_data:    s.raw_data   ?? null,
      }))
    )
  }

  // Run convergence detection against the fresh batch
  await runConvergenceAgent(toInsert)

  // Prune signals older than 24 hours
  await supabase.from('agent_signals').delete().lt('expires_at', new Date().toISOString())

  const byAgent: Record<string, number> = {}
  for (const s of toInsert) byAgent[s.agent_name] = (byAgent[s.agent_name] ?? 0) + 1

  return { total: toInsert.length, byAgent }
}

function settled<T>(result: PromiseSettledResult<T[]>): T[] {
  return result.status === 'fulfilled' ? result.value : []
}
