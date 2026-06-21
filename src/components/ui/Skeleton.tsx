import type { CSSProperties } from 'react'

/* ════════════════════════════════════════════════════════════════════════
   Skeleton — a theme-neutral shimmer placeholder. Uses a translucent fill so
   it reads correctly on both the dark SEO pages and the light landing.
   Pure CSS keyframes (no JS), safe in server components.
   ════════════════════════════════════════════════════════════════════════ */

export function Skeleton({
  w = '100%',
  h = 14,
  r = 6,
  style,
}: {
  w?: number | string
  h?: number | string
  r?: number | string
  style?: CSSProperties
}) {
  return (
    <span
      aria-hidden
      data-skel
      style={{
        display: 'block',
        width: w,
        height: h,
        borderRadius: r,
        background:
          'linear-gradient(90deg, rgba(125,135,160,.10) 25%, rgba(125,135,160,.22) 37%, rgba(125,135,160,.10) 63%)',
        backgroundSize: '400% 100%',
        animation: 'yn-shimmer 1.4s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

/** Drop once per page that uses <Skeleton> to register the keyframes. */
export function SkeletonStyles() {
  return (
    <style>{`
      @keyframes yn-shimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
      @media(prefers-reduced-motion:reduce){[data-skel]{animation:none!important}}
    `}</style>
  )
}
