'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── warm, premium consumer palette ──
const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', AMBER = '#f0892f', BLUE = '#3b6bff', LINE = 'rgba(28,22,15,.08)'
const DISP = 'var(--font-display), Inter, system-ui, sans-serif'

const BOARD = [
  { key: 'mortgage', icon: '🏠', name: 'Mortgage rates', href: '/everyone/lock', days: 30 },
  { key: 'gas', icon: '⛽', name: 'Gas prices', href: '/everyone/gas', days: 14 },
  { key: 'flights', icon: '✈️', name: 'Airfares', href: '/everyone/flights', days: 30 },
  { key: 'electricity', icon: '💡', name: 'Electricity', href: '/everyone/electricity', days: 30 },
] as const

const SOON = [
  { icon: '🚗', name: 'Used cars', q: 'Buy this month, or hold?' },
  { icon: '🏡', name: 'Rent', q: 'Renew, or shop around?' },
]

const STEPS = [
  { n: '1', t: 'Tell it your decision', d: 'A 30-second question — your loan, the rate you were quoted, when you need to close.' },
  { n: '2', t: 'The net reads the market', d: 'The same forecasting engine behind our public stock track record reads the market that drives the price and scores its conviction.' },
  { n: '3', t: 'Get the call — and the receipts', d: 'A plain-English verdict with a confidence and a backtested accuracy. No jargon. We show our work.' },
]

type Call = { verdict: string; stance: 'now' | 'wait' | 'neutral'; confidence: number; backtest: number; direction: string; engine: string; error?: string }
const stColor = (s?: string) => (s === 'now' ? AMBER : s === 'wait' ? GREEN : BLUE)
const stTint = (s?: string) => (s === 'now' ? 'rgba(240,137,47,.1)' : s === 'wait' ? 'rgba(24,146,95,.1)' : 'rgba(59,107,255,.08)')

export default function EveryoneLanding() {
  const [calls, setCalls] = useState<Record<string, Call | null>>({})
  const auraRef = useRef<HTMLDivElement>(null)

  // live data — the net's current call on every everyday market
  useEffect(() => {
    let alive = true
    BOARD.forEach((c) => {
      fetch(`/api/everyone/forecast?category=${c.key}&days=${c.days}`)
        .then((r) => r.json())
        .then((j) => { if (alive) setCalls((p) => ({ ...p, [c.key]: j?.error ? null : j })) })
        .catch(() => { if (alive) setCalls((p) => ({ ...p, [c.key]: null })) })
    })
    return () => { alive = false }
  }, [])

  // subtle parallax on the aurora
  useEffect(() => {
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; if (auraRef.current) auraRef.current.style.transform = `translateY(${window.scrollY * 0.18}px)` })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [])

  const hero = calls['mortgage']

  return (
    <div style={{ background: CREAM, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes evFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
        @keyframes evA1{0%,100%{transform:translate(-6%,-4%) scale(1)}50%{transform:translate(14%,10%) scale(1.3)}}
        @keyframes evA2{0%,100%{transform:translate(8%,6%) scale(1.1)}50%{transform:translate(-12%,-8%) scale(1.36)}}
        @keyframes evA3{0%,100%{transform:translate(0,8%) scale(1)}50%{transform:translate(12%,-10%) scale(1.2)}}
        @keyframes evSheen{to{background-position:220% center}}
        @keyframes evPulse{0%,100%{box-shadow:0 0 0 0 rgba(24,146,95,.5)}50%{box-shadow:0 0 0 6px rgba(24,146,95,0)}}
        @keyframes evShimmer{to{background-position:-200% 0}}
        .ev-blob{position:absolute;border-radius:50%;mix-blend-mode:multiply;will-change:transform;pointer-events:none}
        .ev-head{background:linear-gradient(100deg,#1c160f 0%,#1c160f 30%,#18925f 50%,#f0892f 64%,#1c160f 82%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:evSheen 7s linear infinite}
        .ev-cat{transition:transform .18s ease, box-shadow .18s ease}.ev-cat:hover{transform:translateY(-5px)}
        .ev-live:hover{box-shadow:0 20px 44px rgba(24,146,95,.2)}
        .ev-mag{transition:transform .18s cubic-bezier(.16,1,.3,1)}
        .ev-skel{background:linear-gradient(90deg,#efe9df 25%,#f6f1e8 50%,#efe9df 75%);background-size:200% 100%;animation:evShimmer 1.3s linear infinite;border-radius:8px}
        @media(max-width:760px){ .ev-herogrid{ grid-template-columns:1fr!important } }
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
        a{color:inherit}
      `}</style>

      {/* top bar */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(251,247,240,.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 30, height: 30, background: INK, color: CREAM, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderRadius: 8 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>YN Finance</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: AMBER, background: 'rgba(240,137,47,.12)', border: '1px solid rgba(240,137,47,.3)', borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href="/everyone/lock" style={{ fontSize: 14, fontWeight: 700, color: CREAM, background: GREEN, padding: '9px 17px', borderRadius: 999, textDecoration: 'none' }}>Time my rate</Link>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>For traders →</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section style={{ position: 'relative', maxWidth: 1140, margin: '0 auto', padding: '70px 22px 40px' }}>
        <div ref={auraRef} aria-hidden style={{ position: 'absolute', inset: '-8% -14% 0', zIndex: 0, overflow: 'hidden', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 95% 80% at 50% 28%, #000 38%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 95% 80% at 50% 28%, #000 38%, transparent 80%)' }}>
          <span className="ev-blob" style={{ width: '46vw', height: '46vw', left: '-8vw', top: '-6vw', background: 'radial-gradient(circle,rgba(24,146,95,.22),transparent 62%)', filter: 'blur(44px)', animation: 'evA1 20s ease-in-out infinite' }} />
          <span className="ev-blob" style={{ width: '42vw', height: '42vw', right: '-6vw', top: '-2vw', background: 'radial-gradient(circle,rgba(240,137,47,.24),transparent 62%)', filter: 'blur(48px)', animation: 'evA2 24s ease-in-out infinite' }} />
          <span className="ev-blob" style={{ width: '34vw', height: '34vw', left: '34vw', top: '14vw', background: 'radial-gradient(circle,rgba(59,107,255,.16),transparent 62%)', filter: 'blur(46px)', animation: 'evA3 28s ease-in-out infinite' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.08fr) minmax(0,.92fr)', gap: 46, alignItems: 'center' }} className="ev-herogrid">
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: GREEN, background: 'rgba(24,146,95,.1)', border: '1px solid rgba(24,146,95,.25)', borderRadius: 999, padding: '6px 13px', marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, animation: 'evPulse 2.4s ease-in-out infinite' }} /> An AI that proves it — now for real life
            </div>
            <h1 className="ev-head" style={{ fontFamily: DISP, fontSize: 'clamp(46px,8vw,86px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 0.96, margin: '0 0 22px' }}>
              Buy now,<br />or wait?
            </h1>
            <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: SUB, lineHeight: 1.6, maxWidth: 500, marginBottom: 32 }}>
              The same AI that grades its stock calls in public — pointed at the prices that actually keep you up at night.
              Mortgage rates, gas, flights, power. Ask it when to pull the trigger; it shows the receipts.
            </p>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center' }}>
              <Mag><Link href="/everyone/lock" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 14, padding: '16px 30px', textDecoration: 'none', boxShadow: '0 14px 34px rgba(24,146,95,.3)' }}>🏠 Should I lock my rate? →</Link></Mag>
              <span style={{ fontSize: 13, color: SUB }}>Free · 30 seconds · no signup</span>
            </div>
          </Reveal>

          {/* LIVE hero card — real call from the net */}
          <Reveal delay={120}>
            <div style={{ background: CARD, borderRadius: 24, border: `1px solid ${LINE}`, boxShadow: '0 34px 80px rgba(28,22,15,.13)', padding: 24, animation: 'evFloat 6s ease-in-out infinite' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: SUB }}>🏠 $420k · 30-yr · quoted 6.9%</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(24,146,95,.1)', borderRadius: 999, padding: '4px 10px' }}><span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, animation: 'evPulse 2s infinite' }} />LIVE</span>
              </div>
              <div style={{ fontSize: 13, color: SUB, marginBottom: 6 }}>The call, right now</div>
              {hero === undefined ? (
                <div className="ev-skel" style={{ height: 46, width: '60%' }} />
              ) : hero === null ? (
                <div style={{ fontSize: 22, fontWeight: 800, color: SUB }}>warming up…</div>
              ) : (
                <>
                  <div style={{ fontFamily: DISP, fontSize: 46, fontWeight: 800, letterSpacing: '-.02em', color: stColor(hero.stance), lineHeight: 1 }}>{hero.verdict}</div>
                  <div style={{ fontSize: 14.5, color: INK, marginTop: 8, fontWeight: 600 }}>Rates look {hero.direction}.</div>
                </>
              )}
              <div style={{ height: 1, background: LINE, margin: '16px 0' }} />
              <div style={{ display: 'flex', gap: 10 }}>
                {[['confidence', hero?.confidence], ['backtested', hero?.backtest], ['the net', hero?.engine === 'neural-net' ? 'on' : '·']].map(([l, v], i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', background: '#f7f3ec', borderRadius: 12, padding: '11px 4px' }}>
                    <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 800, color: INK }}>
                      {hero == null ? '—' : typeof v === 'number' ? <><CountUp to={v} />%</> : (v ?? '—')}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: SUB, marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: SUB, marginTop: 13, lineHeight: 1.5 }}>A real, live read from the net’s current view of the bond market. Tap “lock” for your numbers.</div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* LIVE BOARD — the net's current call on every everyday market */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 22px 10px' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <span style={{ width: 8, height: 8, borderRadius: 99, background: GREEN, animation: 'evPulse 2s infinite' }} />
            <h2 style={{ fontFamily: DISP, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>What the net is calling right now</h2>
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 16 }}>
          {BOARD.map((c, idx) => {
            const call = calls[c.key]
            return (
              <Reveal key={c.key} delay={idx * 70}>
                <Link href={c.href} style={{ textDecoration: 'none' }}>
                  <div className="ev-cat ev-live" style={{ background: CARD, border: `1px solid ${call ? stColor(call.stance) + '55' : LINE}`, borderRadius: 18, padding: 18, height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 26 }}>{c.icon}</span>
                      {call && <span style={{ fontSize: 12, fontWeight: 900, color: stColor(call.stance), background: stTint(call.stance), borderRadius: 999, padding: '4px 10px' }}>{call.confidence}%</span>}
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 8 }}>{c.name}</div>
                    {call === undefined ? <div className="ev-skel" style={{ height: 26, width: '70%' }} />
                      : call === null ? <div style={{ fontSize: 15, fontWeight: 700, color: SUB }}>warming up…</div>
                      : <div style={{ fontFamily: DISP, fontSize: 26, fontWeight: 800, color: stColor(call.stance), letterSpacing: '-.01em' }}>{call.verdict}</div>}
                    <div style={{ marginTop: 12, fontSize: 12, fontWeight: 700, color: GREEN }}>get the full call →</div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
        <Reveal delay={120}>
          <p style={{ fontSize: 14.5, color: SUB, marginTop: 18, maxWidth: 620, lineHeight: 1.6 }}>
            Each call is the <b style={{ color: INK }}>same neural net</b> that grades our public stock forecasts, now reading oil, gasoline, natural gas and bonds. Every read you run grades itself and trains it — so it gets sharper across all of life’s prices.
          </p>
        </Reveal>
      </section>

      {/* coming soon */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 22px' }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {SOON.map((c) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f4efe6', border: `1px dashed ${LINE}`, borderRadius: 14, padding: '12px 16px', opacity: 0.9 }}>
              <span style={{ fontSize: 22 }}>{c.icon}</span>
              <div><div style={{ fontSize: 14.5, fontWeight: 800 }}>{c.name}</div><div style={{ fontSize: 12.5, color: SUB }}>{c.q}</div></div>
              <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.08em', color: SUB, background: '#ece6db', borderRadius: 999, padding: '4px 9px', marginLeft: 6 }}>SOON</span>
            </div>
          ))}
        </div>
      </section>

      {/* how it proves it */}
      <section style={{ background: '#fff', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 36 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 22px' }}>
          <Reveal><h2 style={{ fontFamily: DISP, fontSize: 'clamp(26px,3.6vw,38px)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 32 }}>How it works — and how it proves it</h2></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 24 }}>
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${AMBER},#ffb35c)`, color: '#3a2306', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 18, marginBottom: 14 }}>{s.n}</div>
                <div style={{ fontSize: 19, fontWeight: 800, marginBottom: 7 }}>{s.t}</div>
                <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6 }}>{s.d}</div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <div style={{ marginTop: 34, background: '#f7f3ec', borderRadius: 18, padding: '20px 22px', display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26 }}>🧾</span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Why you can trust a free AI telling you to wait</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55, marginTop: 3 }}>The engine here is the same one that posts and grades stock forecasts in public — un-cherry-picked. Every call is backtested, and we show the number. No black box.</div>
              </div>
              <Link href="/proof" style={{ fontSize: 13.5, fontWeight: 700, color: GREEN, textDecoration: 'none', whiteSpace: 'nowrap' }}>See the track record →</Link>
            </div>
          </Reveal>
        </div>
      </section>

      {/* big CTA */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '60px 22px 34px', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontFamily: DISP, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 auto 14px', maxWidth: 680, lineHeight: 1.06 }}>Stop guessing on the biggest checks you’ll ever write.</h2>
          <p style={{ fontSize: 17.5, color: SUB, maxWidth: 520, margin: '0 auto 28px' }}>Start with the one that matters most. Ask the AI when to lock.</p>
          <Mag><Link href="/everyone/lock" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 15, padding: '18px 36px', textDecoration: 'none', boxShadow: '0 16px 38px rgba(24,146,95,.32)' }}>Time my mortgage rate →</Link></Mag>
        </Reveal>
      </section>

      <footer style={{ borderTop: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ fontSize: 13, color: SUB }}>YN Finance · for everyone. Not financial advice — a forecast you can check.</span>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 700, color: INK, textDecoration: 'none' }}>← YN Finance for traders</Link>
        </div>
      </footer>
    </div>
  )
}

// ── cinematic helpers ──
function Reveal({ children, delay = 0, y = 20 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVis(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity .8s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .8s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}

function CountUp({ to, dur = 950 }: { to: number; dur?: number }) {
  const [n, setN] = useState(0)
  useEffect(() => {
    let raf = 0, t0 = 0
    const tick = (t: number) => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / dur); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [to, dur])
  return <>{n}</>
}

function Mag({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="ev-mag" style={{ display: 'inline-block' }}
      onPointerMove={(e) => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px,${(e.clientY - (r.top + r.height / 2)) * 0.3}px)` }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = '' }}>
      {children}
    </span>
  )
}
