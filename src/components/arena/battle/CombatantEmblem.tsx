'use client'

import type { ReactNode } from 'react'

/** A glowing circular emblem for a combatant — gradient ring, dark core, icon. */
export function CombatantEmblem({
  color,
  colorAlt,
  icon,
  size = 72,
  live = false,
}: {
  color: string
  colorAlt?: string
  icon: ReactNode
  size?: number
  live?: boolean
}) {
  const alt = colorAlt ?? color
  return (
    <div
      className={live ? 'av-float' : undefined}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        padding: 2,
        background: `conic-gradient(from 220deg, ${color}, ${alt}, ${color})`,
        boxShadow: `0 0 22px ${color}66, 0 0 40px ${color}33`,
        position: 'relative',
      }}
    >
      <div
        className="av-spin"
        aria-hidden
        style={{
          position: 'absolute',
          inset: -2,
          borderRadius: '50%',
          background: `conic-gradient(from 0deg, transparent 0 70%, ${alt} 85%, transparent 100%)`,
          opacity: 0.6,
          maskImage: 'radial-gradient(transparent 60%, #000 62%)',
          WebkitMaskImage: 'radial-gradient(transparent 60%, #000 62%)',
        }}
      />
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          background: 'radial-gradient(circle at 50% 35%, #11131c, #05060a)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color,
          position: 'relative',
          zIndex: 1,
        }}
      >
        {icon}
      </div>
    </div>
  )
}
