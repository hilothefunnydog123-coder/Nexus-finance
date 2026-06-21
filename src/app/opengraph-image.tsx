import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'YN Finance — An AI that calls the market. And proves it.'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'AI MARKET INTELLIGENCE',
      title: 'An AI that calls the market. And proves it.',
      subtitle: 'BrainStock forecasts ~300 stocks every morning, then grades every call against real prices — a public, un-cherry-picked track record.',
      badge: 'BRAINSTOCK',
      chips: [
        { v: '~300', l: 'stocks / morning' },
        { v: 'Public', l: 'graded track record' },
        { v: '$0.99', l: 'courses' },
      ],
    }),
    { ...OG_SIZE }
  )
}
