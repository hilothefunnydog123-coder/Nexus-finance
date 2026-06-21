import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'The Proof — every AI forecast graded against real prices, in the open'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE EVIDENCE',
      title: 'Graded in public.',
      subtitle: 'Every forecast, scored against the real close. Win rate, calibration, and the learning curve — no cherry-picking, nothing hidden.',
      badge: 'PROOF',
      chips: [
        { v: 'Every', l: 'call graded' },
        { v: 'Live', l: 'win rate' },
        { v: 'Open', l: 'calibration' },
      ],
    }),
    { ...OG_SIZE }
  )
}
