import type { ReactNode } from 'react'
import ArenaFX from '@/components/arena/battle/ArenaFX'

// Dark, living cinematic shell for the whole Arena section.
export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#04050a', color: '#e7ecf5', overflow: 'hidden' }}>
      <ArenaFX />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
