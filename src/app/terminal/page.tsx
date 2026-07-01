import type { Metadata } from 'next'
import TerminalClient from './TerminalClient'

export const metadata: Metadata = {
  title: 'YnKalshi Terminal — Neural Execution Engine',
  description:
    'A downloadable macOS / Windows trading terminal for Kalshi. A native, GPU-rendered neural engine ingests public data feeds in real time, fires synaptic pings the instant an edge appears, and auto-executes through Kalshi’s official low-latency API with algorithmic profit-lock exits.',
}

export default function TerminalPage() {
  return <TerminalClient />
}
