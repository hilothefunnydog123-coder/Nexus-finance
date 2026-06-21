import { ImageResponse } from 'next/og'
import { ogCard, OG_SIZE, OG_CONTENT_TYPE } from '@/components/og/shell'

export const runtime = 'edge'
export const alt = 'AI Stock Analyzer — a 15-second institutional read on any ticker'
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE

export default function Image() {
  return new ImageResponse(
    ogCard({
      tag: 'THE READ',
      title: 'AI Stock Analyzer',
      subtitle: 'A 15-second institutional read on any ticker — verdict, conviction, payoff math, in plain English. Drop a symbol, get the desk’s answer.',
      badge: '3 FREE',
      chips: [
        { v: '15s', l: 'to a verdict' },
        { v: 'Any', l: 'ticker' },
        { v: '3 free', l: 'no card to start' },
      ],
    }),
    { ...OG_SIZE }
  )
}
