import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Stock forecast & AI analysis'

export default async function Image({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = await params
  const raw = decodeURIComponent(symbol)
  const sym = /^[A-Za-z0-9.\-]{1,8}$/.test(raw) ? raw.toUpperCase() : 'STOCK'
  return new ImageResponse(
    ogCard({
      tag: 'STOCK FORECAST & AI ANALYSIS',
      title: sym,
      subtitle: `Free AI rating, bull & bear price targets, analyst consensus, key levels and an options play for ${sym} — in seconds.`,
      badge: 'AI ANALYSIS',
      chips: [
        { v: 'Rating', l: 'AI verdict' },
        { v: 'Targets', l: 'bull & bear' },
        { v: 'Levels', l: '+ options' },
      ],
    }),
    { ...OG_SIZE }
  )
}
