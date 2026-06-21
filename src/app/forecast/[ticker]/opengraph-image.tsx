import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'AI price forecast'

export default async function Image({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: raw } = await params
  const ticker = /^[A-Za-z0-9.\-]{1,8}$/.test(raw) ? raw.toUpperCase() : 'STOCK'
  return new ImageResponse(
    ogCard({
      tag: 'AI PRICE FORECAST',
      title: ticker,
      subtitle: `BrainStock’s short-term forecast for ${ticker} — predicted price target, direction, and an honest, backtested read on accuracy.`,
      badge: 'FORECAST',
      chips: [
        { v: ticker, l: 'neural forecast' },
        { v: 'Target', l: '+ direction' },
        { v: 'Graded', l: 'track record' },
      ],
    }),
    { ...OG_SIZE }
  )
}
