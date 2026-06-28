'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'

// ── warm, premium consumer palette (matches /everyone) ──
const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', AMBER = '#f0892f', BLUE = '#3b6bff', RED = '#d4503e', LINE = 'rgba(28,22,15,.08)'
const DISP = 'var(--font-display), Inter, system-ui, sans-serif'

// ── API contract: GET /api/everyone/track ──
type RecentCall = { date: string; dir: 'up' | 'down'; correct: boolean | null }
type CategoryStat = {
  category: string
  proxy: string
  resolved: number
  accuracy: number | null
  recent: RecentCall[]
}
type TrackResponse = {
  ok: boolean
  overall: { resolved: number; accuracy: number | null }
  categories: CategoryStat[]
}

// category presentation map
const META: Record<string, { icon: string; name: string; sub: string; href: string }> = {
  mortgage: { icon: '🏠', name: 'Mortgage rates', sub: 'Lock or float?', href: '/everyone/lock' },
  gas: { icon: '⛽', name: 'Gas prices', sub: 'Fill up or wait?', href: '/everyone/gas' },
  flights: { icon: '✈️', name: 'Airfares', sub: 'Book or hold?', href: '/everyone/flights' },
  electricity: { icon: '💡', name: 'Electricity', sub: 'Fix or float?', href: '/everyone/electricity' },
}
const ORDER = ['mortgage', 'gas', 'flights', 'electricity']

// accuracy → percent int (handles null)
const pct = (a: number | null) => (a == null ? null : Math.round(a * 100))
// color by accuracy tier
const accColor = (a: number | null) => {
  if (a == null) return SUB
  if (a >= 0.6) return GREEN
  if (a >= 0.5) return AMBER
  return RED
}

const GRADE_STEPS = [
  { n: '1', t: 'The call is logged', d: 'The moment the net makes a read — up or down — we timestamp it and write it down. No edits, no take-backs.' },
  { n: '2', t: 'Reality plays out', d: 'Days pass. The real price moves — mortgage rates, gas at the pump, the airfare, the power bill.' },
  { n: '3', t: 'We mark it right or wrong', d: 'We check the logged call against what actually happened. Correct or not — un-cherry-picked.' },
  { n: '4', t: 'The net learns', d: 'Every graded outcome trains the engine, so it sharpens across all of life’s prices over time.' },
]

export default function EveryoneProof() {
  const [data, setData] = useState<TrackResponse | null | undefined>(undefined)
  const auraRef = useRef<HTMLDivElement>(null)
  const [reduce, setReduce] = useState(false)

  useEffect(() => {
    setReduce(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    let alive = true
    fetch('/api/everyone/track')
      .then((r) => r.json())
      .then((j: TrackResponse) => { if (alive) setData(j && typeof j === 'object' ? j : null) })
      .catch(() => { if (alive) setData(null) })
    return () => { alive = false }
  }, [])

  // parallax aurora
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

  // ── derive a safe, ordered category list (always all four) ──
  const byKey: Record<string, CategoryStat | undefined> = {}
  if (data?.categories) for (const c of data.categories) byKey[c.category] = c
  const categories = ORDER.map((key) => byKey[key] ?? { category: key, proxy: '', resolved: 0, accuracy: null, recent: [] })

  const overallResolved = data?.overall?.resolved ?? 0
  const overallAcc = data?.overall?.accuracy ?? null
  const overallPct = pct(overallAcc)

  // empty / just-launched: API said not ok, or nothing graded anywhere
  const isLoading = data === undefined
  const isEmpty = !isLoading && (data === null || data?.ok === false || overallResolved === 0)

  return (
    <div style={{ background: CREAM, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        @keyframes pfA1{0%,100%{transform:translate(-6%,-4%) scale(1)}50%{transform:translate(14%,10%) scale(1.3)}}
        @keyframes pfA2{0%,100%{transform:translate(8%,6%) scale(1.1)}50%{transform:translate(-12%,-8%) scale(1.36)}}
        @keyframes pfA3{0%,100%{transform:translate(0,8%) scale(1)}50%{transform:translate(12%,-10%) scale(1.2)}}
        @keyframes pfSheen{to{background-position:220% center}}
        @keyframes pfPulse{0%,100%{box-shadow:0 0 0 0 rgba(24,146,95,.5)}50%{box-shadow:0 0 0 6px rgba(24,146,95,0)}}
        @keyframes pfShimmer{to{background-position:-200% 0}}
        @keyframes pfBar{from{width:0}}
        @keyframes pfRingDraw{from{stroke-dashoffset:var(--circ)}}
        @keyframes pfPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
        @keyframes pfSweep{0%{transform:translateX(-130%)}60%,100%{transform:translateX(230%)}}
        .pf-blob{position:absolute;border-radius:50%;mix-blend-mode:multiply;will-change:transform;pointer-events:none}
        .pf-head{background:linear-gradient(100deg,#1c160f 0%,#1c160f 30%,#18925f 50%,#f0892f 64%,#1c160f 82%);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;animation:pfSheen 7s linear infinite}
        .pf-cat{position:relative;transition:transform .2s cubic-bezier(.16,1,.3,1), box-shadow .2s ease, border-color .2s ease;overflow:hidden}
        .pf-cat:hover{transform:translateY(-6px);box-shadow:0 24px 50px rgba(28,22,15,.14)}
        .pf-cat:hover .pf-sweep{animation:pfSweep 1.1s cubic-bezier(.16,1,.3,1)}
        .pf-sweep{position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(105deg,transparent,rgba(255,255,255,.5),transparent);pointer-events:none;transform:translateX(-130%)}
        .pf-skel{background:linear-gradient(90deg,#efe9df 25%,#f6f1e8 50%,#efe9df 75%);background-size:200% 100%;animation:pfShimmer 1.3s linear infinite;border-radius:8px}
        @media(max-width:760px){ .pf-herogrid{ grid-template-columns:1fr!important; text-align:center } }
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
        a{color:inherit}
      `}</style>

      {/* ── sticky header (matches /everyone) ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(251,247,240,.82)', backdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 11, textDecoration: 'none' }}>
            <span style={{ width: 30, height: 30, background: INK, color: CREAM, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 13, borderRadius: 8 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 17 }}>YN Finance</span>
            <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.1em', color: AMBER, background: 'rgba(240,137,47,.12)', border: '1px solid rgba(240,137,47,.3)', borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>← Back to tools</Link>
            <Link href="/proof" style={{ fontSize: 14, fontWeight: 700, color: CREAM, background: INK, padding: '9px 17px', borderRadius: 999, textDecoration: 'none' }}>Trader track record</Link>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section style={{ position: 'relative', maxWidth: 1140, margin: '0 auto', padding: '70px 22px 40px' }}>
        <div ref={auraRef} aria-hidden style={{ position: 'absolute', inset: '-8% -14% 0', zIndex: 0, overflow: 'hidden', pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 95% 80% at 50% 28%, #000 38%, transparent 80%)', WebkitMaskImage: 'radial-gradient(ellipse 95% 80% at 50% 28%, #000 38%, transparent 80%)' }}>
          <span className="pf-blob" style={{ width: '46vw', height: '46vw', left: '-8vw', top: '-6vw', background: 'radial-gradient(circle,rgba(24,146,95,.22),transparent 62%)', filter: 'blur(44px)', animation: 'pfA1 20s ease-in-out infinite' }} />
          <span className="pf-blob" style={{ width: '42vw', height: '42vw', right: '-6vw', top: '-2vw', background: 'radial-gradient(circle,rgba(240,137,47,.24),transparent 62%)', filter: 'blur(48px)', animation: 'pfA2 24s ease-in-out infinite' }} />
          <span className="pf-blob" style={{ width: '34vw', height: '34vw', left: '34vw', top: '14vw', background: 'radial-gradient(circle,rgba(59,107,255,.16),transparent 62%)', filter: 'blur(46px)', animation: 'pfA3 28s ease-in-out infinite' }} />
        </div>

        <div style={{ position: 'relative', zIndex: 1, display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)', gap: 46, alignItems: 'center' }} className="pf-herogrid">
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12.5, fontWeight: 700, color: GREEN, background: 'rgba(24,146,95,.1)', border: '1px solid rgba(24,146,95,.25)', borderRadius: 999, padding: '6px 13px', marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, animation: 'pfPulse 2.4s ease-in-out infinite' }} /> The track record — for everyone
            </div>
            <h1 className="pf-head" style={{ fontFamily: DISP, fontSize: 'clamp(46px,8vw,84px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 0.96, margin: '0 0 22px' }}>
              Graded<br />in public.
            </h1>
            <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: SUB, lineHeight: 1.6, maxWidth: 500 }}>
              Every call the net makes on everyday prices is logged the moment it’s made — then checked against what
              actually happened. Un-cherry-picked. This is the receipt.
            </p>
          </Reveal>

          {/* big animated overall accuracy */}
          <Reveal delay={120}>
            <div style={{ position: 'relative', background: CARD, borderRadius: 24, border: `1px solid ${LINE}`, boxShadow: '0 34px 80px rgba(28,22,15,.13)', padding: '34px 28px', textAlign: 'center', overflow: 'hidden' }}>
              <div className="pf-sweep" style={{ animation: reduce ? 'none' : 'pfSweep 6s ease-in-out infinite', opacity: 0.55 }} />
              <div style={{ position: 'relative', fontSize: 12.5, fontWeight: 800, letterSpacing: '.08em', color: SUB, marginBottom: 12 }}>OVERALL ACCURACY</div>
              {isLoading ? (
                <>
                  <div className="pf-skel" style={{ height: 90, width: '64%', margin: '0 auto 14px' }} />
                  <div className="pf-skel" style={{ height: 16, width: '50%', margin: '0 auto' }} />
                </>
              ) : isEmpty || overallPct == null ? (
                <>
                  <div style={{ fontFamily: DISP, fontSize: 'clamp(56px,11vw,96px)', fontWeight: 800, letterSpacing: '-.03em', lineHeight: 1, color: SUB }}>—</div>
                  <div style={{ fontSize: 14.5, color: SUB, marginTop: 14, lineHeight: 1.5, maxWidth: 280, marginInline: 'auto' }}>
                    No calls graded yet. The record starts filling in as the first forecasts come due.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(64px,13vw,112px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: 1, color: accColor(overallAcc) }}>
                      <CountUp to={overallPct} />
                    </span>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(30px,6vw,50px)', fontWeight: 800, color: accColor(overallAcc) }}>%</span>
                  </div>
                  <div style={{ fontSize: 15, color: SUB, marginTop: 16 }}>
                    of <b style={{ color: INK, fontWeight: 800 }}><CountUp to={overallResolved} /></b> {overallResolved === 1 ? 'call' : 'calls'} graded so far
                  </div>
                  <div style={{ marginTop: 18, height: 8, borderRadius: 99, background: '#efe9df', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${overallPct}%`, borderRadius: 99, background: `linear-gradient(90deg,${accColor(overallAcc)},${accColor(overallAcc)}aa)`, animation: reduce ? 'none' : 'pfBar 1.1s cubic-bezier(.16,1,.3,1)' }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: SUB, marginTop: 12, lineHeight: 1.5 }}>Live — recomputed every time a logged call comes due. Nothing hidden.</div>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── empty state banner (just-launched) ── */}
      {isEmpty && (
        <section style={{ maxWidth: 1140, margin: '0 auto', padding: '6px 22px 8px' }}>
          <Reveal>
            <div style={{ background: '#f7f3ec', border: `1px solid ${LINE}`, borderRadius: 18, padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 28 }}>⏳</span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 16.5, fontWeight: 800 }}>The record is still building.</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55, marginTop: 4 }}>
                  These everyday markets were just added. Calls grade over days as real prices play out — so the
                  numbers below fill in shortly. We’d rather show you an honest blank than a cherry-picked number.
                </div>
              </div>
              <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 800, color: GREEN, textDecoration: 'none', whiteSpace: 'nowrap' }}>See the live calls →</Link>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── category cards ── */}
      <section style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 22px 10px' }}>
        <Reveal>
          <h2 style={{ fontFamily: DISP, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 800, letterSpacing: '-.02em', margin: '0 0 6px' }}>By the numbers, market by market</h2>
          <div style={{ fontSize: 13.5, color: SUB, marginBottom: 20 }}>Each pip is one graded call — <span style={{ color: GREEN, fontWeight: 700 }}>green</span> right, <span style={{ color: RED, fontWeight: 700 }}>red</span> wrong, grey still pending.</div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 16 }}>
          {categories.map((c, idx) => {
            const m = META[c.category] ?? { icon: '📈', name: c.category, sub: '', href: '/everyone' }
            const p = pct(c.accuracy)
            const col = accColor(c.accuracy)
            return (
              <Reveal key={c.category} delay={idx * 70}>
                <Link href={m.href} style={{ textDecoration: 'none' }}>
                  <div className="pf-cat" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 18, padding: 18, height: '100%', boxShadow: '0 4px 18px rgba(28,22,15,.04)' }}>
                    <span className="pf-sweep" />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ fontSize: 26 }}>{m.icon}</span>
                      <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.04em', color: SUB, background: '#f4efe6', borderRadius: 999, padding: '4px 10px' }}>
                        {c.resolved} graded
                      </span>
                    </div>
                    <div style={{ position: 'relative', fontSize: 15.5, fontWeight: 800 }}>{m.name}</div>
                    <div style={{ position: 'relative', fontSize: 12, color: SUB, marginBottom: 16 }}>{m.sub}</div>

                    {/* ring + percent */}
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Ring pct={p} color={col} reduce={reduce} delay={idx * 0.08} />
                      <div>
                        <div style={{ fontFamily: DISP, fontSize: 28, fontWeight: 800, letterSpacing: '-.02em', color: p == null ? SUB : col, lineHeight: 1 }}>
                          {p == null ? '—' : <><CountUp to={p} />%</>}
                        </div>
                        <div style={{ fontSize: 11.5, color: SUB, marginTop: 4 }}>{p == null ? 'no grade yet' : 'accuracy'}</div>
                      </div>
                    </div>

                    {/* recent pips */}
                    <div style={{ position: 'relative', marginTop: 16 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, letterSpacing: '.05em', color: SUB, marginBottom: 7 }}>RECENT CALLS</div>
                      <Pips recent={c.recent} reduce={reduce} />
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* ── how grading works ── */}
      <section style={{ background: '#fff', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 40 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '56px 22px' }}>
          <Reveal><h2 style={{ fontFamily: DISP, fontSize: 'clamp(26px,3.6vw,38px)', fontWeight: 800, letterSpacing: '-.02em', marginBottom: 8 }}>How grading works</h2></Reveal>
          <Reveal delay={60}><p style={{ fontSize: 16, color: SUB, maxWidth: 560, lineHeight: 1.6, marginBottom: 34 }}>No black box. Every call follows the same four steps — logged before the outcome, marked after it.</p></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24 }}>
            {GRADE_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: `linear-gradient(135deg,${BLUE},#6b8cff)`, color: '#fff', display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 18, marginBottom: 14 }}>{s.n}</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 7 }}>{s.t}</div>
                <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.6 }}>{s.d}</div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA back to tools ── */}
      <section style={{ position: 'relative', maxWidth: 1140, margin: '0 auto', padding: '60px 22px 34px', textAlign: 'center', overflow: 'hidden' }}>
        <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', maskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 70% 70% at 50% 50%, #000 30%, transparent 75%)' }}>
          <span className="pf-blob" style={{ width: '40vw', height: '40vw', left: '12vw', top: '-8vw', background: 'radial-gradient(circle,rgba(24,146,95,.16),transparent 62%)', filter: 'blur(50px)', animation: 'pfA1 22s ease-in-out infinite' }} />
          <span className="pf-blob" style={{ width: '36vw', height: '36vw', right: '10vw', top: '-4vw', background: 'radial-gradient(circle,rgba(240,137,47,.18),transparent 62%)', filter: 'blur(52px)', animation: 'pfA2 26s ease-in-out infinite' }} />
        </div>
        <Reveal>
          <h2 style={{ position: 'relative', zIndex: 1, fontFamily: DISP, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 800, letterSpacing: '-.03em', margin: '0 auto 14px', maxWidth: 660, lineHeight: 1.06 }}>Now go let it time your next big decision.</h2>
          <p style={{ position: 'relative', zIndex: 1, fontSize: 17.5, color: SUB, maxWidth: 520, margin: '0 auto 28px' }}>Every call you run grades itself and joins this record. That’s how it keeps getting sharper.</p>
          <Mag><Link href="/everyone" style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: CREAM, background: `linear-gradient(135deg,${GREEN},#0f7a4d)`, borderRadius: 15, padding: '18px 36px', textDecoration: 'none', boxShadow: '0 16px 38px rgba(24,146,95,.32)' }}>← Back to the tools</Link></Mag>
          <div style={{ position: 'relative', zIndex: 1, marginTop: 20, fontSize: 13.5 }}>
            <Link href="/proof" style={{ color: SUB, textDecoration: 'none', fontWeight: 600 }}>Want the deep, trader-grade track record? See the full proof →</Link>
          </div>
        </Reveal>
      </section>

      {/* ── footer ── */}
      <footer style={{ borderTop: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1140, margin: '0 auto', padding: '26px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <span style={{ fontSize: 13, color: SUB }}>YN Finance · for everyone. Not financial advice — a forecast you can check.</span>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 700, color: INK, textDecoration: 'none' }}>← YN Finance for traders</Link>
        </div>
      </footer>
    </div>
  )
}

// ── animated accuracy ring (SVG) ──
function Ring({ pct, color, reduce, delay = 0 }: { pct: number | null; color: string; reduce: boolean; delay?: number }) {
  const size = 58, stroke = 6, r = (size - stroke) / 2, circ = 2 * Math.PI * r
  const frac = pct == null ? 0 : Math.max(0, Math.min(1, pct / 100))
  const ref = useRef<SVGCircleElement>(null)
  const [vis, setVis] = useState(reduce)
  useEffect(() => {
    if (reduce) { setVis(true); return }
    const el = ref.current; if (!el) return
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold: 0.4 })
    io.observe(el); return () => io.disconnect()
  }, [reduce])
  const offset = vis ? circ * (1 - frac) : circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#efe9df" strokeWidth={stroke} />
      <circle
        ref={ref}
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct == null ? '#d8d0c2' : color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: reduce ? 'none' : `stroke-dashoffset 1.1s cubic-bezier(.16,1,.3,1) ${delay}s` }}
      />
    </svg>
  )
}

// ── recent-call pips ──
function Pips({ recent, reduce }: { recent: RecentCall[]; reduce: boolean }) {
  const items = (recent ?? []).slice(0, 10)
  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', minHeight: 14 }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: '#e8e1d4', border: `1px solid ${LINE}` }} />
        ))}
        <span style={{ fontSize: 11.5, color: SUB, marginLeft: 4 }}>none yet</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((c, i) => {
        const bg = c.correct == null ? '#d8d0c2' : c.correct ? GREEN : RED
        const title = `${c.date} · called ${c.dir}${c.correct == null ? ' · pending' : c.correct ? ' · correct' : ' · wrong'}`
        return (
          <span key={`${c.date}-${i}`} title={title}
            style={{ width: 12, height: 12, borderRadius: 99, background: bg, boxShadow: c.correct == null ? 'none' : `0 0 0 1px ${bg}33`, animation: reduce ? 'none' : `pfPop .4s cubic-bezier(.16,1,.3,1) ${i * 0.05}s both` }} />
        )
      })}
    </div>
  )
}

// ── cinematic helpers (match /everyone) ──
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
    <span ref={ref} style={{ display: 'inline-block', transition: 'transform .18s cubic-bezier(.16,1,.3,1)' }}
      onPointerMove={(e) => { const el = ref.current; if (!el) return; if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; const r = el.getBoundingClientRect(); el.style.transform = `translate(${(e.clientX - (r.left + r.width / 2)) * 0.18}px,${(e.clientY - (r.top + r.height / 2)) * 0.3}px)` }}
      onPointerLeave={() => { if (ref.current) ref.current.style.transform = '' }}>
      {children}
    </span>
  )
}
