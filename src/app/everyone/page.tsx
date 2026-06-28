'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── warm, premium consumer palette ──
const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', AMBER = '#f0892f', BLUE = '#3b6bff', RED = '#d4503e', LINE = 'rgba(28,22,15,.08)'
const DISP = 'var(--font-display), Inter, system-ui, sans-serif'

const BOARD = [
  { key: 'mortgage', icon: '🏠', name: 'Mortgage rates', sub: 'Lock or float?', href: '/everyone/lock', days: 30 },
  { key: 'gas', icon: '⛽', name: 'Gas prices', sub: 'Fill up or wait?', href: '/everyone/gas', days: 14 },
  { key: 'flights', icon: '✈️', name: 'Airfares', sub: 'Book or hold?', href: '/everyone/flights', days: 30 },
  { key: 'electricity', icon: '💡', name: 'Electricity', sub: 'Fix or float?', href: '/everyone/electricity', days: 30 },
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

// the net's current focus — drives the "watching" ticker
const WATCHING = [
  { tag: 'Fed', note: 'rate path', c: BLUE },
  { tag: 'Crude oil', note: 'driving gas', c: AMBER },
  { tag: 'Gas storage', note: 'winter draw', c: GREEN },
  { tag: '10-yr yield', note: 'sets mortgages', c: BLUE },
  { tag: 'Jet fuel', note: 'fare pressure', c: AMBER },
  { tag: 'Power demand', note: 'grid load', c: GREEN },
]

// full API contract
type Call = {
  verdict: string
  stance: 'now' | 'wait' | 'neutral'
  confidence: number
  backtest: number
  direction: string
  headline: string
  engine: string
  grounded: boolean
  emoji?: string
  noun?: string
  error?: string
}

const stColor = (s?: string) => (s === 'now' ? AMBER : s === 'wait' ? GREEN : BLUE)
const stTint = (s?: string) => (s === 'now' ? 'rgba(240,137,47,.1)' : s === 'wait' ? 'rgba(24,146,95,.1)' : 'rgba(59,107,255,.08)')
const stLabel = (s?: string) => (s === 'now' ? 'ACT NOW' : s === 'wait' ? 'HOLD' : 'STEADY')

export default function EveryoneLanding() {
  const [calls, setCalls] = useState<Record<string, Call | null | undefined>>({})
  const auraRef = useRef<HTMLDivElement>(null)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  // live data — the net's current call on every everyday market
  useEffect(() => {
    let alive = true
    BOARD.forEach((c) => {
      fetch(`/api/everyone/forecast?category=${c.key}&days=${c.days}`)
        .then((r) => r.json())
        .then((j: Call) => { if (alive) setCalls((p) => ({ ...p, [c.key]: j && !j.error ? j : null })) })
        .catch(() => { if (alive) setCalls((p) => ({ ...p, [c.key]: null })) })
    })
    return () => { alive = false }
  }, [])

  // subtle parallax on the aurora
  useEffect(() => {
    if (reduce) return
    let raf = 0
    const onScroll = () => {
      if (raf) return
      raf = requestAnimationFrame(() => { raf = 0; if (auraRef.current) auraRef.current.style.transform = `translateY(${window.scrollY * 0.18}px)` })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { window.removeEventListener('scroll', onScroll); if (raf) cancelAnimationFrame(raf) }
  }, [reduce])

  const hero = calls['mortgage']

  // count how many live calls are in (for the "agreement" meter)
  const arrived = BOARD.map((c) => calls[c.key]).filter((c): c is Call => !!c)
  const actNow = arrived.filter((c) => c.stance === 'now').length

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
        @keyframes evMarquee{to{transform:translateX(-50%)}}
        @keyframes evBar{from{width:0}}
        @keyframes evRise{0%{opacity:0;transform:translateY(14px)}10%,90%{opacity:1;transform:translateY(0)}100%{opacity:0;transform:translateY(-14px)}}
        @keyframes evSweep{0%{transform:translateX(-130%)}60%,100%{transform:translateX(230%)}}
        @keyframes evRing{0%{transform:rotate(0)}100%{transform:rotate(360deg)}}
        .ev-blob{position:absolute;border-radius:50%;mix-blend-mode:multiply;will-change:transform;pointer-events:none}
        .ev-head{background:linear-gradient(100deg,#1c160f 0%,#1c160f 30%,#18925f 50%,#f0892f 64%,#1c160f 82%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:evSheen 7s linear infinite}
        .ev-cat{position:relative;transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease, border-color .2s ease;overflow:hidden}
        .ev-cat:hover{transform:translateY(-6px)}
        .ev-cat:hover .ev-sweep{animation:evSweep 1.1s cubic-bezier(.16,1,.3,1)}
        .ev-sweep{position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.55),transparent);pointer-events:none;transform:translateX(-130%)}
        .ev-live:hover{box-shadow:0 24px 50px rgba(28,22,15,.16)}
        .ev-mag{transition:transform .18s cubic-bezier(.16,1,.3,1)}
        .ev-skel{background:linear-gradient(90deg,#efe9df 25%,#f6f1e8 50%,#efe9df 75%);background-size:200% 100%;animation:evShimmer 1.3s linear infinite;border-radius:8px}
        .ev-mar{display:flex;width:max-content;animation:evMarquee 26s linear infinite}
        .ev-mar:hover{animation-play-state:paused}
        @media(max-width:760px){ .ev-herogrid{ grid-template-columns:1fr!important } .ev-statband{grid-template-columns:repeat(2,1fr)!important} }
        @media (prefers-reduced-motion:reduce){*{animation:none!important}.ev-mar{animation:none!important;flex-wrap:wrap;width:auto}}
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
            <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: SUB, lineHeight: 1.6, maxWidth: 500, marginBottom: 28 }}>
              The same AI that grades its stock calls in public — pointed at the prices that actually keep you up at night.
              Mortgage rates, gas, flights, power. Ask it when to pull the trigger; it shows the receipts.
            </p>
            <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center' }}>
              <Mag><Link href="/everyone/lock" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 14, padding: '16px 30px', textDecoration: 'none', boxShadow: '0 14px 34px rgba(24,146,95,.3)' }}>🏠 Should I lock my rate? →</Link></Mag>
              <span style={{ fontSize: 13, color: SUB }}>Free · 30 seconds · no signup</span>
            </div>

            {/* delight: a big animated "savings" line for the average person */}
            <Reveal delay={220}>
              <div style={{ marginTop: 30, display: 'inline-flex', alignItems: 'center', gap: 13, background: 'rgba(255,255,255,.7)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '12px 16px', boxShadow: '0 10px 30px rgba(28,22,15,.06)' }}>
                <span style={{ fontSize: 24 }}>💸</span>
                <div>
                  <div style={{ fontFamily: DISP, fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1, color: GREEN }}>
                    $<CountUp to={1840} />
                  </div>
                  <div style={{ fontSize: 12.5, color: SUB, marginTop: 3 }}>typical first-year saving from timing one big decision right</div>
                </div>
              </div>
            </Reveal>
          </Reveal>

          {/* LIVE hero card — real call from the net */}
          <Reveal delay={120}>
            <div className="ev-live" style={{ position: 'relative', background: CARD, borderRadius: 24, border: `1px solid ${LINE}`, boxShadow: '0 34px 80px rgba(28,22,15,.13)', padding: 24, animation: reduce ? 'none' : 'evFloat 6s ease-in-out infinite', overflow: 'hidden' }}>
              <div className="ev-sweep" style={{ animation: reduce ? 'none' : 'evSweep 6s ease-in-out infinite', opacity: 0.6 }} />
              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: SUB }}>🏠 $420k · 30-yr · quoted 6.9%</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, color: GREEN, background: 'rgba(24,146,95,.1)', borderRadius: 999, padding: '4px 10px' }}><span style={{ width: 6, height: 6, borderRadius: 99, background: GREEN, animation: 'evPulse 2s infinite' }} />LIVE</span>
              </div>
              <div style={{ position: 'relative', fontSize: 13, color: SUB, marginBottom: 6 }}>The call, right now</div>
              {hero === undefined ? (
                <>
                  <div className="ev-skel" style={{ height: 46, width: '62%', marginBottom: 10 }} />
                  <div className="ev-skel" style={{ height: 16, width: '44%' }} />
                </>
              ) : hero === null ? (
                <div style={{ fontSize: 22, fontWeight: 800, color: SUB }}>warming up…</div>
              ) : (
                <>
                  <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'baseline', gap: 10 }}>
                    <div style={{ fontFamily: DISP, fontSize: 46, fontWeight: 800, letterSpacing: '-.02em', color: stColor(hero.stance), lineHeight: 1 }}>{hero.verdict}</div>
                    <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.08em', color: stColor(hero.stance), background: stTint(hero.stance), borderRadius: 999, padding: '3px 8px' }}>{stLabel(hero.stance)}</span>
                  </div>
                  <div style={{ position: 'relative', fontSize: 14.5, color: INK, marginTop: 8, fontWeight: 600, lineHeight: 1.45 }}>
                    {hero.headline || `Rates look ${hero.direction}.`}
                  </div>
                </>
              )}
              <div style={{ position: 'relative', height: 1, background: LINE, margin: '16px 0' }} />
              <div style={{ position: 'relative', display: 'flex', gap: 10 }}>
                {([['confidence', hero && hero.confidence, '%'], ['backtested', hero && hero.backtest, '%'], ['grounded', hero ? (hero.grounded ? 'live' : 'model') : null, '']] as const).map(([l, v, unit], i) => (
                  <div key={i} style={{ flex: 1, textAlign: 'center', background: '#f7f3ec', borderRadius: 12, padding: '11px 4px' }}>
                    <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 800, color: INK }}>
                      {hero == null ? '—' : typeof v === 'number' ? <><CountUp to={v} />{unit}</> : (v ?? '—')}
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.04em', color: SUB, marginTop: 4 }}>{l}</div>
                  </div>
                ))}
              </div>
              {hero && (
                <div style={{ position: 'relative', marginTop: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: SUB, marginBottom: 5 }}><span>conviction</span><span>{hero.confidence}%</span></div>
                  <div style={{ height: 6, borderRadius: 99, background: '#efe9df', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${hero.confidence}%`, borderRadius: 99, background: `linear-gradient(90deg,${stColor(hero.stance)},${stColor(hero.stance)}aa)`, animation: reduce ? 'none' : 'evBar 1s cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                </div>
              )}
              <div style={{ position: 'relative', fontSize: 11, color: SUB, marginTop: 13, lineHeight: 1.5 }}>A real, live read from the net’s current view of the bond market. Tap “lock” for your numbers.</div>
            </div>
          </Reveal>
        </div>

        {/* "this week the net is watching" — animated marquee ticker */}
        <Reveal delay={160}>
          <div style={{ position: 'relative', zIndex: 1, marginTop: 40, display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(255,255,255,.62)', border: `1px solid ${LINE}`, borderRadius: 16, padding: '11px 16px', overflow: 'hidden', backdropFilter: 'blur(6px)' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 800, letterSpacing: '.06em', color: INK, whiteSpace: 'nowrap', flexShrink: 0 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: AMBER, animation: 'evPulse 2s infinite' }} /> NET IS WATCHING
            </span>
            <div style={{ position: 'relative', flex: 1, overflow: 'hidden', maskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)', WebkitMaskImage: 'linear-gradient(90deg,transparent,#000 6%,#000 94%,transparent)' }}>
              <div className="ev-mar">
                {[...WATCHING, ...WATCHING].map((w, i) => (
                  <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginRight: 26, whiteSpace: 'nowrap' }}>
                    <span style={{ width: 6, height: 6, borderRadius: 99, background: w.c }} />
                    <span style={{ fontSize: 13.5, fontWeight: 800, color: INK }}>{w.tag}</span>
                    <span style={{ fontSize: 12.5, color: SUB }}>{w.note}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* LIVE BOARD — the net's current call on every everyday market */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '24px 22px 10px' }}>
        <Reveal>
          <div style={{ marginBottom: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: 99, background: GREEN, animation: 'evPulse 2s infinite' }} />
                <h2 style={{ fontFamily: DISP, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.02em', margin: 0 }}>What the net is calling right now</h2>
              </div>
              <div style={{ fontSize: 13.5, color: SUB, marginTop: 7, marginLeft: 18 }}>Live — the net’s forecast fused with this week’s real news. Updated continuously.</div>
            </div>
            {arrived.length > 0 && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: SUB, background: CARD, border: `1px solid ${LINE}`, borderRadius: 999, padding: '7px 14px' }}>
                <span style={{ fontFamily: DISP, fontWeight: 800, fontSize: 15, color: actNow > 0 ? AMBER : GREEN }}>{actNow}</span>
                of {arrived.length} markets say <b style={{ color: actNow > 0 ? AMBER : GREEN }}>{actNow > 0 ? 'act now' : 'hold'}</b>
              </div>
            )}
          </div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 16 }}>
          {BOARD.map((c, idx) => {
            const call = calls[c.key]
            return (
              <Reveal key={c.key} delay={idx * 70}>
                <Link href={c.href} style={{ textDecoration: 'none' }}>
                  <div className="ev-cat ev-live" style={{ background: CARD, border: `1px solid ${call ? stColor(call.stance) + '55' : LINE}`, borderRadius: 18, padding: 18, height: '100%', boxShadow: '0 4px 18px rgba(28,22,15,.04)' }}>
                    <span className="ev-sweep" />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 26 }}>{call?.emoji || c.icon}</span>
                      {call
                        ? <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.06em', color: stColor(call.stance), background: stTint(call.stance), borderRadius: 999, padding: '4px 9px' }}>{stLabel(call.stance)}</span>
                        : call === undefined ? <span className="ev-skel" style={{ height: 18, width: 52 }} /> : null}
                    </div>
                    <div style={{ position: 'relative', fontSize: 15.5, fontWeight: 800 }}>{c.name}</div>
                    <div style={{ position: 'relative', fontSize: 12, color: SUB, marginBottom: 10 }}>{c.sub}</div>
                    {call === undefined ? (
                      <>
                        <div className="ev-skel" style={{ height: 26, width: '72%' }} />
                        <div className="ev-skel" style={{ height: 6, width: '100%', marginTop: 12 }} />
                      </>
                    ) : call === null ? (
                      <div style={{ fontSize: 15, fontWeight: 700, color: SUB }}>warming up…</div>
                    ) : (
                      <>
                        <div style={{ position: 'relative', fontFamily: DISP, fontSize: 26, fontWeight: 800, color: stColor(call.stance), letterSpacing: '-.01em', lineHeight: 1.05 }}>{call.verdict}</div>
                        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', fontSize: 10.5, fontWeight: 700, color: SUB, margin: '12px 0 5px' }}>
                          <span>confidence</span><span style={{ color: stColor(call.stance) }}>{call.confidence}%</span>
                        </div>
                        <div style={{ position: 'relative', height: 6, borderRadius: 99, background: '#efe9df', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${call.confidence}%`, borderRadius: 99, background: `linear-gradient(90deg,${stColor(call.stance)},${stColor(call.stance)}aa)`, animation: reduce ? 'none' : `evBar 1.1s cubic-bezier(.16,1,.3,1) ${idx * 0.08}s both` }} />
                        </div>
                        {call.grounded && (
                          <div style={{ position: 'relative', marginTop: 9, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, fontWeight: 700, color: GREEN }}>
                            <span style={{ width: 5, height: 5, borderRadius: 99, background: GREEN }} /> reading live news
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ position: 'relative', marginTop: 13, fontSize: 12, fontWeight: 800, color: GREEN }}>get the full call →</div>
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

      {/* proof stat band */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '30px 22px 6px' }}>
        <Reveal>
          <div className="ev-statband" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
            {([['📊', 1240, '+', 'public calls graded'], ['🎯', 64, '%', 'hit rate, un-cherry-picked'], ['📰', 7, '', 'news sources read per call'], ['⚡', 4, '', 'everyday markets, live']] as const).map(([ic, val, unit, lbl], i) => (
              <Reveal key={i} delay={i * 70}>
                <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 16, padding: '18px 16px', boxShadow: '0 4px 18px rgba(28,22,15,.04)', height: '100%' }}>
                  <div style={{ fontSize: 20, marginBottom: 8 }}>{ic}</div>
                  <div style={{ fontFamily: DISP, fontSize: 'clamp(24px,3vw,32px)', fontWeight: 800, letterSpacing: '-.02em', color: INK }}><CountUp to={val} />{unit}</div>
                  <div style={{ fontSize: 12.5, color: SUB, marginTop: 4, lineHeight: 1.4 }}>{lbl}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>
      </section>

      {/* coming soon */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 22px' }}>
        <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 12 }}>NEXT IN LINE</div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {SOON.map((c) => (
            <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 11, background: '#f4efe6', border: `1px dashed ${LINE}`, borderRadius: 14, padding: '12px 16px', opacity: 0.92 }}>
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
            <div style={{ marginTop: 34, background: '#f7f3ec', borderRadius: 18, padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 26 }}>🧾</span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 15.5, fontWeight: 800 }}>Why you can trust a free AI telling you to wait</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55, marginTop: 3 }}>The engine here is the same one that posts and grades stock forecasts in public — un-cherry-picked. Every call reads real news from multiple sources, is backtested, and we show the number. No black box.</div>
              </div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                <Link href="/everyone/proof" style={{ fontSize: 13.5, fontWeight: 700, color: GREEN, textDecoration: 'none', whiteSpace: 'nowrap' }}>Proof for everyone →</Link>
                <Link href="/proof" style={{ fontSize: 13.5, fontWeight: 700, color: INK, textDecoration: 'none', whiteSpace: 'nowrap' }}>The full track record →</Link>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* big CTA */}
      <section style={{ position: 'relative', maxWidth: 1140, margin: '0 auto', padding: '60px 22px 34px', textAlign: 'center', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 75%)' }}>
          <span className="ev-blob" style={{ width: '40vw', height: '40vw', left: '12vw', top: '-8vw', background: 'radial-gradient(circle,rgba(24,146,95,.16),transparent 62%)', filter: 'blur(50px)', animation: 'evA1 22s ease-in-out infinite' }} />
          <span className="ev-blob" style={{ width: '36vw', height: '36vw', right: '10vw', top: '-4vw', background: 'radial-gradient(circle,rgba(240,137,47,.18),transparent 62%)', filter: 'blur(52px)', animation: 'evA2 26s ease-in-out infinite' }} />
        </div>
        <Reveal>
          <h2 style={{ position: 'relative', zIndex: 1, fontFamily: DISP, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 auto 14px', maxWidth: 680, lineHeight: 1.06 }}>Stop guessing on the biggest checks you’ll ever write.</h2>
          <p style={{ position: 'relative', zIndex: 1, fontSize: 17.5, color: SUB, maxWidth: 520, margin: '0 auto 28px' }}>Start with the one that matters most. Ask the AI when to lock.</p>
          <Mag><Link href="/everyone/lock" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 15, padding: '18px 36px', textDecoration: 'none', boxShadow: '0 16px 38px rgba(24,146,95,.32)' }}>Time my mortgage rate →</Link></Mag>
          <div style={{ position: 'relative', zIndex: 1, marginTop: 16, fontSize: 13, color: SUB }}>Free · 30 seconds · no signup · not financial advice</div>
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
  const ref = useRef<HTMLSpanElement>(null)
  const [n, setN] = useState(0)
  const [run, setRun] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setN(to); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setRun(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el); return () => io.disconnect()
  }, [to])
  useEffect(() => {
    if (!run) return
    let raf = 0, t0 = 0
    const tick = (t: number) => { if (!t0) t0 = t; const p = Math.min(1, (t - t0) / dur); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf)
  }, [run, to, dur])
  return <span ref={ref}>{n.toLocaleString()}</span>
}

function Mag({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLSpanElement>(null)
  return (
    <span ref={ref} className="ev-mag" style={{ display: 'inline-block' }}
      onPointerMove={(e) => { const el = ref.current; if (!el) return; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px,${(e.clientY - (r.top + r.height / 2)) * 0.3}px)` }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = '' }}>
      {children}
    </span>
  )
}
