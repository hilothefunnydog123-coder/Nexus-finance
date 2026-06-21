import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'BrainStock — a neural network that forecasts the market and grades itself'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE FORECASTER',
      title: 'BrainStock',
      subtitle: 'A neural network forecasts ~300 stocks every market morning — then grades every call against real prices. A public, un-cherry-picked track record.',
      badge: 'LIVE CALLS',
      chips: [
        { v: '~300', l: 'stocks / morning' },
        { v: 'Daily', l: 'high-conviction calls' },
        { v: 'Public', l: 'self-grading' },
      ],
    }),
    { ...OG_SIZE }
  )
}
