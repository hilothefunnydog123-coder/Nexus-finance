import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'The War Room — five AI analysts debate any stock, then the CIO rules'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE DEBATE',
      title: 'The War Room',
      subtitle: 'Five AI analysts — a long PM, a short-seller, a quant, a risk officer and the CIO — argue your stock live, then the CIO rules.',
      badge: 'AI COMMITTEE',
      chips: [
        { v: '5', l: 'AI analysts' },
        { v: 'Live', l: 'debate' },
        { v: '1', l: 'CIO ruling' },
      ],
    }),
    { ...OG_SIZE }
  )
}
