'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Home, Fuel, Plane, Zap, TrendingUp, Hourglass, type LucideIcon } from 'lucide-react'

// ── new cobalt/ink/paper brand (matches /everyone landing) ──
const INK = '#0a0a0c', BONE = '#f4f2ec', PAPER = '#fcfbf8', ACCENT = '#1f3bff'
const SUB = 'rgba(10,10,12,.62)', LINE = 'rgba(10,10,12,.1)'
const NOW = '#e0841f', WAIT = '#0a9d63', RED = '#d4503e'
const DISP = 'var(--font-display), system-ui, sans-serif'
const MONO = 'var(--font-mono), ui-monospace, monospace'

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
const META: Record<string, { Icon: LucideIcon; name: string; sub: string; href: string }> = {
  mortgage: { Icon: Home, name: 'Mortgage rates', sub: 'Lock or float?', href: '/everyone/lock' },
  gas: { Icon: Fuel, name: 'Gas prices', sub: 'Fill up or wait?', href: '/everyone/gas' },
  flights: { Icon: Plane, name: 'Airfares', sub: 'Book or hold?', href: '/everyone/flights' },
  electricity: { Icon: Zap, name: 'Electricity', sub: 'Fix or float?', href: '/everyone/electricity' },
}
const ORDER = ['mortgage', 'gas', 'flights', 'electricity']

// accuracy → percent int (handles null)
const pct = (a: number | null) => (a == null ? null : Math.round(a * 100))
// color by accuracy tier
const accColor = (a: number | null) => {
  if (a == null) return SUB
  if (a >= 0.6) return WAIT
  if (a >= 0.5) return NOW
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
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes pfBlink{0%,100%{opacity:1}50%{opacity:.25}}
        @keyframes pfBar{from{width:0}}
        @keyframes pfPop{0%{transform:scale(0);opacity:0}60%{transform:scale(1.25)}100%{transform:scale(1);opacity:1}}
        @keyframes pfShimmer{to{background-position:-200% 0}}
        .pf-cat{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
        .pf-cat:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(10,10,12,.08)}
        .pf-skel{background:linear-gradient(90deg,rgba(10,10,12,.05) 25%,rgba(10,10,12,.08) 50%,rgba(10,10,12,.05) 75%);background-size:200% 100%;animation:pfShimmer 1.3s linear infinite;border-radius:8px}
        .pf-cta{transition:transform .15s ease}.pf-cta:hover{transform:translateY(-2px)}
        @media(max-width:760px){ .pf-herogrid{ grid-template-columns:1fr!important } }
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
        a{color:inherit}
      `}</style>

      {/* ── sticky header (matches /everyone landing) ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,242,236,.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 29, height: 29, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12.5, borderRadius: 7 }}>YN</span>
            <span style={{ fontFamily: DISP, fontWeight: 700, fontSize: 16, letterSpacing: '-.03em' }}>Finance</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: SUB, border: `1px solid ${LINE}`, borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>← Back to tools</Link>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>For traders →</Link>
          </div>
        </div>
      </header>

      {/* ── hero ── */}
      <section style={{ position: 'relative', maxWidth: 1080, margin: '0 auto', padding: 'clamp(56px,8vw,90px) 22px 40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.05fr) minmax(0,.95fr)', gap: 46, alignItems: 'center' }} className="pf-herogrid">
          <Reveal>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: MONO, fontSize: 12, letterSpacing: '.18em', color: ACCENT, marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, animation: 'pfBlink 1.5s infinite' }} /> THE TRACK RECORD — FOR EVERYONE
            </div>
            <h1 style={{ fontFamily: DISP, fontSize: 'clamp(46px,8vw,82px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 0.96, margin: '0 0 22px' }}>
              Graded<br /><span style={{ color: ACCENT }}>in public.</span>
            </h1>
            <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: SUB, lineHeight: 1.6, maxWidth: 500 }}>
              Every call the net makes on everyday prices is logged the moment it’s made — then checked against what
              actually happened. Un-cherry-picked. This is the receipt.
            </p>
          </Reveal>

          {/* big animated overall accuracy */}
          <Reveal delay={120}>
            <div style={{ position: 'relative', background: PAPER, borderRadius: 18, border: `1px solid ${LINE}`, boxShadow: '0 18px 40px rgba(10,10,12,.06)', padding: '34px 28px', textAlign: 'center' }}>
              <div style={{ fontFamily: MONO, fontSize: 11.5, letterSpacing: '.14em', color: SUB, marginBottom: 14 }}>OVERALL ACCURACY</div>
              {isLoading ? (
                <>
                  <div className="pf-skel" style={{ height: 90, width: '64%', margin: '0 auto 14px' }} />
                  <div className="pf-skel" style={{ height: 16, width: '50%', margin: '0 auto' }} />
                </>
              ) : isEmpty || overallPct == null ? (
                <>
                  <div style={{ fontFamily: DISP, fontSize: 'clamp(56px,11vw,96px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, color: SUB }}>—</div>
                  <div style={{ fontSize: 14.5, color: SUB, marginTop: 14, lineHeight: 1.5, maxWidth: 280, marginInline: 'auto' }}>
                    No calls graded yet. The record starts filling in as the first forecasts come due.
                  </div>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(64px,13vw,112px)', fontWeight: 700, letterSpacing: '-.04em', lineHeight: 1, color: accColor(overallAcc) }}>
                      <CountUp to={overallPct} />
                    </span>
                    <span style={{ fontFamily: DISP, fontSize: 'clamp(30px,6vw,50px)', fontWeight: 700, color: accColor(overallAcc) }}>%</span>
                  </div>
                  <div style={{ fontSize: 15, color: SUB, marginTop: 16 }}>
                    of <b style={{ color: INK, fontWeight: 800 }}><CountUp to={overallResolved} /></b> {overallResolved === 1 ? 'call' : 'calls'} graded so far
                  </div>
                  <div style={{ marginTop: 18, height: 8, borderRadius: 99, background: 'rgba(10,10,12,.06)', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${overallPct}%`, borderRadius: 99, background: accColor(overallAcc), animation: reduce ? 'none' : 'pfBar 1.1s cubic-bezier(.16,1,.3,1)' }} />
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
        <section style={{ maxWidth: 1080, margin: '0 auto', padding: '6px 22px 8px' }}>
          <Reveal>
            <div style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 14, padding: '22px 24px', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ width: 44, height: 44, borderRadius: 11, background: 'rgba(224,132,31,.1)', display: 'grid', placeItems: 'center', flexShrink: 0 }}><Hourglass size={22} color={NOW} aria-hidden /></span>
              <div style={{ flex: 1, minWidth: 240 }}>
                <div style={{ fontSize: 16.5, fontWeight: 800 }}>The record is still building.</div>
                <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55, marginTop: 4 }}>
                  These everyday markets were just added. Calls grade over days as real prices play out — so the
                  numbers below fill in shortly. We’d rather show you an honest blank than a cherry-picked number.
                </div>
              </div>
              <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 700, color: ACCENT, textDecoration: 'none', whiteSpace: 'nowrap' }}>See the live calls →</Link>
            </div>
          </Reveal>
        </section>
      )}

      {/* ── category cards ── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '28px 22px 10px' }}>
        <Reveal>
          <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', color: ACCENT, marginBottom: 12 }}>// MARKET BY MARKET</div>
          <h2 style={{ fontFamily: DISP, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 700, letterSpacing: '-.03em', margin: '0 0 6px' }}>By the numbers, market by market</h2>
          <div style={{ fontSize: 13.5, color: SUB, marginBottom: 20 }}>Each pip is one graded call — <span style={{ color: WAIT, fontWeight: 700 }}>green</span> right, <span style={{ color: RED, fontWeight: 700 }}>red</span> wrong, grey still pending.</div>
        </Reveal>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(248px,1fr))', gap: 16 }}>
          {categories.map((c, idx) => {
            const m = META[c.category] ?? { Icon: TrendingUp, name: c.category, sub: '', href: '/everyone' }
            const p = pct(c.accuracy)
            const col = accColor(c.accuracy)
            const CatIcon = m.Icon
            return (
              <Reveal key={c.category} delay={idx * 70}>
                <Link href={m.href} style={{ textDecoration: 'none' }}>
                  <div className="pf-cat" style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 14, padding: 18, height: '100%' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <span style={{ width: 38, height: 38, borderRadius: 10, background: 'rgba(31,59,255,.07)', border: `1px solid ${LINE}`, display: 'grid', placeItems: 'center' }}><CatIcon size={20} color={col} aria-hidden /></span>
                      <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.08em', color: SUB, border: `1px solid ${LINE}`, borderRadius: 999, padding: '4px 10px' }}>
                        {c.resolved} graded
                      </span>
                    </div>
                    <div style={{ fontSize: 15.5, fontWeight: 800 }}>{m.name}</div>
                    <div style={{ fontSize: 12, color: SUB, marginBottom: 16 }}>{m.sub}</div>

                    {/* ring + percent */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <Ring pct={p} color={col} reduce={reduce} delay={idx * 0.08} />
                      <div>
                        <div style={{ fontFamily: DISP, fontSize: 28, fontWeight: 700, letterSpacing: '-.03em', color: p == null ? SUB : col, lineHeight: 1 }}>
                          {p == null ? '—' : <><CountUp to={p} />%</>}
                        </div>
                        <div style={{ fontSize: 11.5, color: SUB, marginTop: 4 }}>{p == null ? 'no grade yet' : 'accuracy'}</div>
                      </div>
                    </div>

                    {/* recent pips */}
                    <div style={{ marginTop: 16 }}>
                      <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '.1em', color: SUB, marginBottom: 7 }}>RECENT CALLS</div>
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
      <section style={{ background: PAPER, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 40 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '56px 22px' }}>
          <Reveal><div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', color: ACCENT, marginBottom: 14 }}>// HOW GRADING WORKS</div></Reveal>
          <Reveal delay={40}><h2 style={{ fontFamily: DISP, fontSize: 'clamp(26px,3.6vw,38px)', fontWeight: 700, letterSpacing: '-.03em', marginBottom: 8 }}>No black box.</h2></Reveal>
          <Reveal delay={60}><p style={{ fontSize: 16, color: SUB, maxWidth: 560, lineHeight: 1.6, marginBottom: 34 }}>Every call follows the same four steps — logged before the outcome, marked after it.</p></Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 24 }}>
            {GRADE_STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <div style={{ borderTop: `2px solid ${ACCENT}`, paddingTop: 16 }}>
                  <div style={{ fontFamily: MONO, fontSize: 12, letterSpacing: '.1em', color: ACCENT, marginBottom: 10 }}>STEP {s.n}</div>
                  <div style={{ fontFamily: DISP, fontSize: 19, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 7 }}>{s.t}</div>
                  <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.6 }}>{s.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA back to tools ── */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(56px,8vw,90px) 22px 34px', textAlign: 'center' }}>
        <Reveal>
          <h2 style={{ fontFamily: DISP, fontSize: 'clamp(30px,5vw,52px)', fontWeight: 700, letterSpacing: '-.04em', margin: '0 auto 14px', maxWidth: 660, lineHeight: 1.06 }}>Now go let it time your next big decision.</h2>
          <p style={{ fontSize: 17.5, color: SUB, maxWidth: 520, margin: '0 auto 28px', lineHeight: 1.55 }}>Every call you run grades itself and joins this record. That’s how it keeps getting sharper.</p>
          <Link href="/everyone" className="pf-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 700, color: PAPER, background: INK, borderRadius: 10, padding: '16px 30px', textDecoration: 'none' }}>← Back to the tools</Link>
          <div style={{ marginTop: 20, fontSize: 13.5 }}>
            <Link href="/proof" style={{ color: SUB, textDecoration: 'none', fontWeight: 600 }}>Want the deep, trader-grade track record? See the full proof →</Link>
          </div>
        </Reveal>
      </section>

      {/* ── footer ── */}
      <footer style={{ borderTop: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: SUB }}>YN Finance · for everyone. A forecast you can check — not financial advice.</span>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>← YN Finance for traders</Link>
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
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(10,10,12,.08)" strokeWidth={stroke} />
      <circle
        ref={ref}
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={pct == null ? 'rgba(10,10,12,.18)' : color} strokeWidth={stroke} strokeLinecap="round"
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
          <span key={i} style={{ width: 11, height: 11, borderRadius: 99, background: 'rgba(10,10,12,.06)', border: `1px solid ${LINE}` }} />
        ))}
        <span style={{ fontSize: 11.5, color: SUB, marginLeft: 4 }}>none yet</span>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      {items.map((c, i) => {
        const bg = c.correct == null ? 'rgba(10,10,12,.18)' : c.correct ? WAIT : RED
        const title = `${c.date} · called ${c.dir}${c.correct == null ? ' · pending' : c.correct ? ' · correct' : ' · wrong'}`
        return (
          <span key={`${c.date}-${i}`} title={title}
            style={{ width: 12, height: 12, borderRadius: 99, background: bg, boxShadow: c.correct == null ? 'none' : `0 0 0 1px ${bg}33`, animation: reduce ? 'none' : `pfPop .4s cubic-bezier(.16,1,.3,1) ${i * 0.05}s both` }} />
        )
      })}
    </div>
  )
}

// ── reveal helper (matches /everyone landing) ──
function Reveal({ children, delay = 0, y = 20 }: { children: React.ReactNode; delay?: number; y?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setVis(true); return }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect() } }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ opacity: vis ? 1 : 0, transform: vis ? 'none' : `translateY(${y}px)`, transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
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
