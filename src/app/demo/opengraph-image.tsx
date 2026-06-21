import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'YN Finance — the 30-second product tour'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'PRODUCT TOUR',
      title: '30 seconds. The whole loop.',
      subtitle: 'Forecast → analyze → debate → grade → compound. Watch the AI work end to end, then see today’s real calls.',
      badge: '▶ 30s',
      chips: [
        { v: '5', l: 'scenes' },
        { v: '30s', l: 'start to finish' },
        { v: 'No', l: 'signup' },
      ],
    }),
    { ...OG_SIZE }
  )
}
