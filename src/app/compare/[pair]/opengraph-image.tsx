import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = 'Stock comparison & AI verdict'

const TICK = /^[A-Za-z0-9.\-]{1,8}$/

export default async function Image({ params }: { params: Promise<{ pair: string }> }) {
  const { pair } = await params
  const parts = decodeURIComponent(pair).toUpperCase().split('-VS-')
  const a = parts[0] && TICK.test(parts[0]) ? parts[0] : 'A'
  const b = parts[1] && TICK.test(parts[1]) ? parts[1] : 'B'
  const title = `${a} vs ${b}`
  return new ImageResponse(
    ogCard({
      tag: 'STOCK COMPARISON',
      title,
      subtitle: `${a} vs ${b} — price, market cap, P/E, analyst consensus and momentum side by side, plus a free AI rating and price targets on each.`,
      badge: 'COMPARE',
      chips: [
        { v: 'Side', l: 'by side' },
        { v: 'AI', l: 'verdict on each' },
        { v: 'Targets', l: 'bull & bear' },
      ],
    }),
    { ...OG_SIZE }
  )
}
