import type { Metadata } from 'next'
import { DeskShell, CYAN } from '@/components/cinematic/Desk'
import EdgeBoardClient from '@/components/edge/EdgeBoardClient'

export const metadata: Metadata = {
  title: 'YN Edge — AI vs the Market',
  description:
    'Our BrainStock neural net and grounded AI price every prediction market, compute the edge against the live price, and surface only the bets actually worth taking — ranked, graded in public.',
}

export default function EdgePage() {
  return (
    <DeskShell title="YN Edge · AI vs the market" accent={CYAN}>
      <EdgeBoardClient />
    </DeskShell>
  )
}
