import type { Metadata } from 'next'
import { DeskShell, CYAN } from '@/components/cinematic/Desk'
import EdgeBoardClient from '@/components/edge/EdgeBoardClient'

export const metadata: Metadata = {
  title: 'YnKalshi — AI vs the Kalshi Market',
  description:
    'Our BrainStock neural net, grounded AI, and statistical model price every Kalshi prediction market, compute the edge against the live price, size the bet, and surface only the ones actually worth taking — ranked, graded in public.',
}

export default function EdgePage() {
  return (
    <DeskShell title="YnKalshi · AI vs the Kalshi market" accent={CYAN}>
      <EdgeBoardClient />
    </DeskShell>
  )
}
