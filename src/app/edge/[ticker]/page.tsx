import type { Metadata } from 'next'
import { DeskShell, CYAN } from '@/components/cinematic/Desk'
import MarketDetailClient from '@/components/edge/MarketDetailClient'

export async function generateMetadata({ params }: { params: Promise<{ ticker: string }> }): Promise<Metadata> {
  const { ticker } = await params
  const t = decodeURIComponent(ticker)
  return {
    title: `${t} — YN Edge`,
    description: `Our full read on ${t}: the BrainStock neural net's forecast, the edge vs the live market price, and the complete worth-it math — graded in public.`,
  }
}

export default async function EdgeMarketPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker } = await params
  return (
    <DeskShell title="YN Edge · market" accent={CYAN} back="/edge">
      <MarketDetailClient ticker={ticker} />
    </DeskShell>
  )
}
