'use client'

import { useEffect, useRef } from 'react'

const AD_ID = 'd4467fd39cd2555e32e317195a17fa8f'
const AD_SRC = `https://pl28636153.profitablecpmratenetwork.com/${AD_ID}/invoke.js`

export default function AdsterraBanner({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null)

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
    <div className={className} style={{ minHeight: 90, width: '100%' }}>
      <div id={`container-${AD_ID}`} ref={ref} />
    </div>
  )
}
