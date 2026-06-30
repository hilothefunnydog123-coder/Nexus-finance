'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, Home, Fuel, Plane, Zap, type LucideIcon } from 'lucide-react'

/* YN for Everyone — clean, professional landing. The same accountable AI,
   pointed at everyday prices. One live element: the net's current calls. */

const INK = '#0a0a0c', BONE = '#f4f2ec', PAPER = '#fcfbf8', ACCENT = '#1f3bff'
const SUB = 'rgba(10,10,12,.62)', LINE = 'rgba(10,10,12,.1)'
const NOW = '#e0841f', WAIT = '#0a9d63', NEU = '#1f3bff'

const MARKETS: Record<string, { name: string; href: string; Icon: LucideIcon; photo: string; seed: string }> = {
  mortgage: { name: 'Mortgage rates', href: '/everyone/lock', Icon: Home, photo: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80', seed: 'ynhouse' },
  gas: { name: 'Gas prices', href: '/everyone/gas', Icon: Fuel, photo: 'https://images.unsplash.com/photo-1545262810-77515befe149?auto=format&fit=crop&w=900&q=80', seed: 'yngas' },
  flights: { name: 'Airfares', href: '/everyone/flights', Icon: Plane, photo: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=900&q=80', seed: 'ynplane' },
  electricity: { name: 'Electricity', href: '/everyone/electricity', Icon: Zap, photo: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=80', seed: 'ynpower' },
}

type Call = { category: string; verdict: string; stance: 'now' | 'wait' | 'neutral'; confidence: number; headline: string; grounded: boolean }
const sc = (s?: string) => (s === 'now' ? NOW : s === 'wait' ? WAIT : NEU)

const PILLARS = [
  { t: 'It reads the market', d: 'The same neural net behind our public stock track record forecasts the market that drives each price.' },
  { t: 'It reads the news', d: 'Then it checks this week’s real headlines and data, and weighs them against the forecast.' },
  { t: 'It proves itself', d: 'Every call is logged and graded against what actually happens — a record you can audit.' },
]

export default function EveryoneLanding() {
  const [board, setBoard] = useState<Call[] | null>(null)
  useEffect(() => {
    fetch('/api/everyone/snapshot').then((r) => r.json()).then((j) => Array.isArray(j?.board) && setBoard(j.board)).catch(() => {})
  }, [])

  return (
    <div style={{ background: BONE, color: INK, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', minHeight: '100vh' }}>
      <style>{`
        @keyframes evblink{0%,100%{opacity:1}50%{opacity:.25}}
        .ev-disp{font-family:var(--font-display),system-ui,sans-serif;font-weight:700;letter-spacing:-.04em;line-height:1}
        .ev-card{transition:transform .18s ease, box-shadow .18s ease, border-color .18s ease}
        .ev-card:hover{transform:translateY(-3px);box-shadow:0 18px 40px rgba(10,10,12,.08)}
        .ev-cta{transition:transform .15s ease}.ev-cta:hover{transform:translateY(-2px)}
        @media(max-width:760px){.ev-board{grid-template-columns:1fr 1fr!important}}
        @media (prefers-reduced-motion:reduce){*{animation:none!important}}
      `}</style>

      {/* header */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,242,236,.85)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 29, height: 29, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12.5, borderRadius: 7 }}>YN</span>
            <span className="ev-disp" style={{ fontSize: 16 }}>Finance</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: SUB, border: `1px solid ${LINE}`, borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/everyone/proof" style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>Track record</Link>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>For traders →</Link>
          </div>
        </div>
      </header>

      {/* hero */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(60px,9vw,110px) 22px clamp(30px,5vw,50px)' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.22em', color: ACCENT, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, animation: 'evblink 1.5s infinite' }} /> AI FOR EVERYDAY MONEY
          </div>
        </Reveal>
        <Reveal delay={80}>
          <h1 className="ev-disp" style={{ fontSize: 'clamp(2.6rem,7.5vw,5.4rem)', margin: 0, maxWidth: 860 }}>Buy now, <span style={{ color: ACCENT }}>or wait?</span></h1>
        </Reveal>
        <Reveal delay={170}>
          <p style={{ fontSize: 'clamp(1.05rem,1.7vw,1.3rem)', color: SUB, lineHeight: 1.55, maxWidth: 560, marginTop: 24 }}>
            The same AI that grades its stock calls in public — pointed at the prices that hit your wallet. Mortgage rates, gas, flights, power. It tells you when to act, and shows you why.
          </p>
        </Reveal>
        <Reveal delay={260}>
          <div style={{ display: 'flex', gap: 13, flexWrap: 'wrap', alignItems: 'center', marginTop: 32 }}>
            <Link href="/everyone/lock" className="ev-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: INK, color: PAPER, padding: '15px 26px', fontSize: 15, fontWeight: 700, borderRadius: 9, textDecoration: 'none' }}>Time my mortgage rate <ArrowRight size={17} /></Link>
            <span style={{ fontSize: 13.5, color: SUB }}>Free · no signup</span>
          </div>
        </Reveal>
      </section>

      {/* live board */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: '10px 22px 30px' }}>
        <Reveal>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 18 }}>
            <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, animation: 'evblink 1.5s infinite' }} />
            <span style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.12em', color: SUB }}>WHAT THE NET IS CALLING NOW</span>
          </div>
        </Reveal>
        <div className="ev-board" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {Object.keys(MARKETS).map((key, i) => {
            const c = board?.find((b) => b.category === key)
            const col = sc(c?.stance)
            const { Icon, photo, seed } = MARKETS[key]
            return (
              <Reveal key={key} delay={i * 60}>
                <Link href={MARKETS[key].href} style={{ textDecoration: 'none', color: INK, display: 'block', height: '100%' }}>
                  <div className="ev-card" style={{ height: '100%', background: PAPER, border: `1px solid ${LINE}`, borderRadius: 14, overflow: 'hidden' }}>
                    {/* photo header */}
                    <div style={{ position: 'relative', height: 92, background: `linear-gradient(135deg, ${ACCENT}, ${INK})`, overflow: 'hidden' }}>
                      <img
                        src={`https://picsum.photos/seed/${seed}/600/300`}
                        alt=""
                        loading="lazy"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }}
                      />
                      <img
                        src={photo}
                        alt=""
                        loading="lazy"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,12,.15), rgba(10,10,12,.55))' }} />
                      <div style={{ position: 'absolute', left: 12, bottom: 10, width: 32, height: 32, borderRadius: 8, background: 'rgba(252,251,248,.92)', display: 'grid', placeItems: 'center' }}>
                        <Icon size={18} color={col} aria-hidden />
                      </div>
                    </div>
                    <div style={{ padding: 18 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>{MARKETS[key].name}</div>
                      {!board ? <div style={{ height: 26, width: '60%', borderRadius: 6, background: 'rgba(10,10,12,.06)' }} /> : (
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                          <span className="ev-disp" style={{ fontSize: 22, color: col }}>{c?.verdict || '—'}</span>
                          {c && <span style={{ fontSize: 12, fontWeight: 700, color: col }}>{c.confidence}%</span>}
                        </div>
                      )}
                      <div style={{ marginTop: 12, fontSize: 12.5, fontWeight: 700, color: col, display: 'inline-flex', alignItems: 'center', gap: 4 }}>see why <ArrowRight size={13} /></div>
                    </div>
                  </div>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* why trust it */}
      <section style={{ background: PAPER, borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, marginTop: 30 }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(56px,8vw,90px) 22px' }}>
          <Reveal>
            <div style={{ fontFamily: 'var(--font-mono),ui-monospace,monospace', fontSize: 12, letterSpacing: '.18em', color: ACCENT, marginBottom: 14 }}>// HOW IT WORKS</div>
            <h2 className="ev-disp" style={{ fontSize: 'clamp(1.7rem,3.8vw,2.7rem)', maxWidth: 700, margin: 0 }}>A forecast you can check — not financial advice.</h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 22, marginTop: 38 }}>
            {PILLARS.map((p, i) => (
              <Reveal key={p.t} delay={i * 90}>
                <div style={{ borderTop: `2px solid ${ACCENT}`, paddingTop: 16 }}>
                  <div className="ev-disp" style={{ fontSize: '1.4rem', marginBottom: 8 }}>{p.t}</div>
                  <div style={{ fontSize: 14.5, color: SUB, lineHeight: 1.6 }}>{p.d}</div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal delay={120}>
            <Link href="/everyone/proof" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 30, fontSize: 14, fontWeight: 700, color: INK, textDecoration: 'none' }}>See the track record <ArrowRight size={15} /></Link>
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1080, margin: '0 auto', padding: 'clamp(56px,8vw,90px) 22px', textAlign: 'center' }}>
        <Reveal>
          <h2 className="ev-disp" style={{ fontSize: 'clamp(1.9rem,4.5vw,3.2rem)', margin: '0 auto 22px', maxWidth: 600 }}>Stop guessing on the biggest checks you’ll write.</h2>
          <Link href="/everyone/lock" className="ev-cta" style={{ display: 'inline-flex', alignItems: 'center', gap: 9, background: INK, color: PAPER, padding: '16px 30px', fontSize: 16, fontWeight: 700, borderRadius: 10, textDecoration: 'none' }}>Time my mortgage rate <ArrowRight size={18} /></Link>
        </Reveal>
      </section>

      <footer style={{ borderTop: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 22px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: 12.5, color: SUB }}>YN Finance · for everyone. A forecast you can check — not financial advice.</span>
          <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>← YN Finance for traders</Link>
        </div>
      </footer>
    </div>
  )
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null)
  const [seen, setSeen] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setSeen(true); return }
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setSeen(true), io.disconnect()), { threshold: 0.12, rootMargin: '0px 0px -7% 0px' })
    io.observe(el); return () => io.disconnect()
  }, [])
  return <div ref={ref} style={{ opacity: seen ? 1 : 0, transform: seen ? 'none' : 'translateY(20px)', transition: `opacity .7s cubic-bezier(.16,1,.3,1) ${delay}ms, transform .7s cubic-bezier(.16,1,.3,1) ${delay}ms` }}>{children}</div>
}
