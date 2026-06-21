import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'Courses — learn the edge from pro traders for $0.99'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE EDGE',
      title: 'Learn the edge.',
      subtitle: 'Pro-trader courses and ready-to-run algorithms — then automate the setups with one-click alerts. No subscription.',
      badge: '$0.99',
      chips: [
        { v: '$0.99', l: 'per course' },
        { v: 'Pro', l: 'traders' },
        { v: 'Run', l: 'the code' },
      ],
    }),
    { ...OG_SIZE }
  )
}
