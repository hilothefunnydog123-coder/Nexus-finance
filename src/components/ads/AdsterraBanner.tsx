'use client'

import { useEffect, useRef } from 'react'

const AD_ID = 'd4467fd39cd2555e32e317195a17fa8f'
const AD_SRC = `https://pl28636153.profitablecpmratenetwork.com/${AD_ID}/invoke.js`

const SIZE_DIMENSIONS: Record<string, { width: number | string; height: number }> = {
  '728x90':  { width: 728,    height: 90  },
  '300x250': { width: 300,    height: 250 },
  '320x50':  { width: 320,    height: 50  },
  '160x600': { width: 160,    height: 600 },
}

interface Props {
  className?: string
  size?: '728x90' | '300x250' | '320x50' | '160x600'
}

export default function AdsterraBanner({ className, size = '728x90' }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const dims = SIZE_DIMENSIONS[size]

  useEffect(() => {
    const container = ref.current
    if (!container) return
    const existing = document.querySelector(`script[src="${AD_SRC}"]`)
    if (existing) existing.remove()
    const script = document.createElement('script')
    script.async = true
    script.setAttribute('data-cfasync', 'false')
    script.src = AD_SRC
    container.parentNode!.insertBefore(script, container)
    return () => { script.remove() }
  }, [])

  return (
    <div
      className={className}
      style={{
        minHeight: dims.height,
        width: typeof dims.width === 'number' ? dims.width : '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
    >
      <div id={`container-${AD_ID}`} ref={ref} />
    </div>
  )
}
