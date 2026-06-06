import type { ReactNode } from 'react'

// Minimal Feather-style line icons — premium sites use crisp icons, not emoji.
const PATHS: Record<string, ReactNode> = {
  analyze: <><circle cx="12" cy="12" r="9" /><line x1="21" y1="12" x2="18" y2="12" /><line x1="6" y1="12" x2="3" y2="12" /><line x1="12" y1="6" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="18" /><circle cx="12" cy="12" r="2.4" /></>,
  learn: <><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" /></>,
  automate: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />,
  shield: <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><polyline points="9 12 11.5 14.5 15.5 9.5" /></>,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  pulse: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
  trending: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
  globe: <><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>,
  check: <polyline points="20 6 9 17 4 12" />,
  spark: <><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="M5.6 5.6l2.8 2.8" /><path d="M15.6 15.6l2.8 2.8" /><path d="M18.4 5.6l-2.8 2.8" /><path d="M8.4 15.6l-2.8 2.8" /></>,
}

export function Icon({ name, size = 22, stroke = 1.6, style }: { name: keyof typeof PATHS | string; size?: number; stroke?: number; style?: React.CSSProperties }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" style={style} aria-hidden>
      {PATHS[name] ?? PATHS.spark}
    </svg>
  )
}
