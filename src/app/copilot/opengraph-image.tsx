import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'Voice — talk to the market and the neural net answers out loud'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE COPILOT',
      title: 'Talk to the market.',
      subtitle: 'Ask “what’s happening with Nvidia?” and the neural net answers out loud — with the chart and the news, live.',
      badge: 'VOICE',
      chips: [
        { v: 'Voice', l: 'in and out' },
        { v: 'Live', l: 'chart + news' },
        { v: 'Ask', l: 'anything' },
      ],
    }),
    { ...OG_SIZE }
  )
}
