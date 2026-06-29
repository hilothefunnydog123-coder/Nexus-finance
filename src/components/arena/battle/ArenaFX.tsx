'use client'

/* The Arena's cinematic atmosphere: a fixed, animated backdrop (drifting aurora
   glows, a faint terminal grid, film grain, scanline, vignette) plus the global
   keyframe + utility stylesheet every Arena component animates against.
   Rendered once by the layout, so the whole section shares one living canvas. */

const NOISE =
  "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.5'/></svg>"

export default function ArenaFX() {
  return (
    <>
      <style>{CSS}</style>
      <div aria-hidden className="av-bg">
        <div className="av-aurora av-aurora-1" />
        <div className="av-aurora av-aurora-2" />
        <div className="av-aurora av-aurora-3" />
        <div className="av-grid" />
        <div className="av-grain" style={{ backgroundImage: `url("${NOISE}")` }} />
        <div className="av-scan" />
        <div className="av-vignette" />
      </div>
    </>
  )
}

const CSS = `
.av-bg{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;background:#04050a}
.av-aurora{position:absolute;border-radius:50%;filter:blur(70px);opacity:.55;will-change:transform}
.av-aurora-1{top:-22%;left:8%;width:60vw;height:60vw;background:radial-gradient(circle at 50% 50%,rgba(168,85,247,.55),transparent 62%);animation:avAurora1 22s ease-in-out infinite}
.av-aurora-2{top:-10%;right:-10%;width:52vw;height:52vw;background:radial-gradient(circle at 50% 50%,rgba(0,212,255,.42),transparent 62%);animation:avAurora2 26s ease-in-out infinite}
.av-aurora-3{bottom:-26%;left:30%;width:55vw;height:55vw;background:radial-gradient(circle at 50% 50%,rgba(255,149,0,.28),transparent 60%);animation:avAurora3 30s ease-in-out infinite}
.av-grid{position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:46px 46px;mask-image:radial-gradient(1100px 700px at 50% 0%,#000 25%,transparent 78%);-webkit-mask-image:radial-gradient(1100px 700px at 50% 0%,#000 25%,transparent 78%)}
.av-grain{position:absolute;inset:-50%;opacity:.05;mix-blend-mode:overlay;animation:avGrain 1.2s steps(2) infinite}
.av-scan{position:absolute;inset:0;background:linear-gradient(rgba(0,212,255,.05),transparent);height:38%;opacity:.5;animation:avScan 7.5s linear infinite}
.av-vignette{position:absolute;inset:0;background:radial-gradient(120% 100% at 50% 0%,transparent 55%,rgba(0,0,0,.55) 100%)}

@keyframes avAurora1{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(7%,5%,0) scale(1.18)}}
@keyframes avAurora2{0%,100%{transform:translate3d(0,0,0) scale(1.12)}50%{transform:translate3d(-8%,-4%,0) scale(1)}}
@keyframes avAurora3{0%,100%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(5%,-6%,0) scale(1.14)}}
@keyframes avGrain{0%{transform:translate(0,0)}100%{transform:translate(-7px,4px)}}
@keyframes avScan{0%{transform:translateY(-110%)}100%{transform:translateY(260%)}}
@keyframes avFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
@keyframes avPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.3;transform:scale(.8)}}
@keyframes avGlow{0%,100%{opacity:.55}50%{opacity:1}}
@keyframes avBlink{0%,100%{opacity:1}50%{opacity:.2}}
@keyframes avTicker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@keyframes avShimmer{0%{background-position:-160% 0}100%{background-position:260% 0}}
@keyframes avRise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes avPop{0%{opacity:0;transform:scale(.9)}60%{transform:scale(1.03)}100%{opacity:1;transform:scale(1)}}
@keyframes avSpark{0%,100%{opacity:.45;filter:drop-shadow(0 0 4px currentColor)}50%{opacity:1;filter:drop-shadow(0 0 16px currentColor)}}
@keyframes avSheen{0%{transform:translateX(-130%) skewX(-18deg)}60%,100%{transform:translateX(260%) skewX(-18deg)}}
@keyframes avSpin{to{transform:rotate(360deg)}}
@keyframes avRing{0%{box-shadow:0 0 0 0 var(--ring)}100%{box-shadow:0 0 0 14px transparent}}

.av-rise{animation:avRise .7s cubic-bezier(.2,.7,.2,1) both}
.av-pop{animation:avPop .6s cubic-bezier(.2,.8,.2,1) both}
.av-d1{animation-delay:.06s}.av-d2{animation-delay:.13s}.av-d3{animation-delay:.2s}.av-d4{animation-delay:.28s}.av-d5{animation-delay:.36s}.av-d6{animation-delay:.46s}
.av-live{animation:avPulse 1.5s ease-in-out infinite}
.av-glow{animation:avGlow 2.4s ease-in-out infinite}
.av-blink{animation:avBlink 1.1s steps(2) infinite}
.av-float{animation:avFloat 6.5s ease-in-out infinite}
.av-spark{animation:avSpark 1.8s ease-in-out infinite}
.av-spin{animation:avSpin 14s linear infinite}
.av-shimmer{background:linear-gradient(90deg,transparent 20%,rgba(255,255,255,.55),transparent 80%);background-size:220% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:avShimmer 3s linear infinite}
.av-card{position:relative;overflow:hidden;transition:transform .25s cubic-bezier(.2,.7,.2,1),box-shadow .25s,border-color .25s}
.av-card:hover{transform:translateY(-4px)}
.av-sheen{position:absolute;top:0;left:0;width:55%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.10),transparent);transform:translateX(-130%) skewX(-18deg);pointer-events:none}
.av-card:hover .av-sheen{animation:avSheen 1.05s ease}
.av-ticker-track{display:inline-flex;white-space:nowrap;will-change:transform;animation:avTicker var(--dur,42s) linear infinite}
.av-ticker:hover .av-ticker-track{animation-play-state:paused}

/* Keyboard focus — a clear, consistent ring on every interactive Arena element. */
.arena-root a:focus-visible,.arena-root button:focus-visible,.arena-root [role="button"]:focus-visible,.arena-root input:focus-visible,.arena-root [tabindex]:focus-visible{outline:2px solid #4cc9ff;outline-offset:2px;border-radius:10px}

@media (prefers-reduced-motion: reduce){
  .av-aurora,.av-grain,.av-scan,.av-live,.av-glow,.av-blink,.av-float,.av-spark,.av-spin,.av-shimmer,.av-ticker-track{animation:none!important}
  .av-rise,.av-pop{animation:none!important;opacity:1!important;transform:none!important}
}
`
