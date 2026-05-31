export interface AgentSignal {
  agent_name: string
  ticker: string | null
  signal_text: string
  conviction: 1 | 2 | 3
  source_url?: string
  raw_data?: Record<string, unknown>
}
