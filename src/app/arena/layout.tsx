import type { ReactNode } from 'react'

// Dark cinematic shell for the whole Arena section.
export default function ArenaLayout({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1200px 600px at 50% -10%, rgba(168,85,247,.12), transparent 60%), radial-gradient(900px 500px at 90% 10%, rgba(0,212,255,.08), transparent 55%), #05060a',
        color: '#e7ecf5',
      }}
    >
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(900px 600px at 50% 0%, #000 30%, transparent 80%)',
        }}
      />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}
