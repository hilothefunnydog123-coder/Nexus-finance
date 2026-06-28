'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', RED = '#d4503e', AMBER = '#f0892f', BLUE = '#3b6bff', LINE = 'rgba(28,22,15,.08)'
const DISPLAY = 'var(--font-display), Inter, system-ui, sans-serif'

type Stance = 'now' | 'wait' | 'neutral'
type UI = { emoji: string; name: string; question: string; blurb: string; outlookLabel: string; windows: [number, string][] }
const CAT_UI: Record<string, UI> = {
  gas:         { emoji: '⛽', name: 'Gas prices',        question: 'Fill up now, or wait?',                 blurb: 'the oil & wholesale fuel market that drives the price at the pump', outlookLabel: 'Price outlook', windows: [[7, 'this week'], [14, 'next 2 weeks'], [30, 'this month']] },
  flights:     { emoji: '✈️', name: 'Airfares',          question: 'Book now, or keep watching?',           blurb: 'fuel costs and travel-demand signals that move airfares',          outlookLabel: 'Fare outlook',  windows: [[14, 'in ~2 weeks'], [30, 'in ~1 month'], [60, 'in ~2 months']] },
  electricity: { emoji: '💡', name: 'Electricity plans', question: 'Lock a fixed plan, or stay variable?', blurb: 'the natural-gas and power market that sets electricity rates',      outlookLabel: 'Rate outlook',  windows: [[30, '1 month'], [60, '2 months'], [90, '3 months']] },
}

type Forecast = {
  category: string; emoji: string; noun: string; verdict: string; stance: Stance
  confidence: number; backtest: number; direction: string; headline: string
  drivers: string[]; sources: { title: string; uri: string }[]; engine: string
  grounded: boolean; proxy: string; asOf: string; movePct: number; error?: string
}

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const renderBold = (s: string) => escapeHtml(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

function stanceColor(s?: Stance) {
  return s === 'now' ? AMBER : s === 'wait' ? GREEN : s === 'neutral' ? BLUE : INK
}
function stanceTint(s?: Stance) {
  return s === 'now' ? 'rgba(240,137,47,.10)' : s === 'wait' ? 'rgba(24,146,95,.10)' : 'rgba(59,107,255,.08)'
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const fn = () => setReduced(mq.matches)
    mq.addEventListener?.('change', fn)
    return () => mq.removeEventListener?.('change', fn)
  }, [])
  return reduced
}

function useCountUp(target: number, run: boolean, reduced: boolean, ms = 1000) {
  const [val, setVal] = useState(reduced ? target : 0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!run) return
    if (reduced) { setVal(target); return }
    const start = performance.now()
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(target * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, run, reduced, ms])
  return val
}

function ConfidenceGauge({ value, color, reduced }: { value: number; color: string; reduced: boolean }) {
  const animated = useCountUp(value, true, reduced, 1000)
  const size = 132, stroke = 12, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(100, animated)) / 100
  const arc = 0.75
  const dash = circ * arc
  const offset = dash * (1 - frac)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(28,22,15,.07)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset}
          style={{ transition: reduced ? 'none' : 'stroke-dashoffset .1s linear', filter: `drop-shadow(0 2px 6px ${color}55)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 900, color, letterSpacing: '-.03em', lineHeight: 1 }}>{Math.round(animated)}<span style={{ fontSize: 17 }}>%</span></div>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginTop: 3 }}>CONFIDENCE</div>
        </div>
      </div>
    </div>
  )
}

export default function CategoryTool() {
  const params = useParams<{ category: string }>()
  const cat = String(params.category || '')
  const ui = CAT_UI[cat]
  const reduced = usePrefersReducedMotion()

  const [days, setDays] = useState(ui?.windows[0][0] ?? 14)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Forecast | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const resultRef = useRef<HTMLDivElement | null>(null)

  async function run() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const r = await fetch(`/api/everyone/forecast?category=${encodeURIComponent(cat)}&days=${days}`)
      const j: Forecast = await r.json()
      if (j.error) setErr(j.error); else setRes(j)
    } catch { setErr('Couldn’t reach the market just now — try again in a moment.') }
    setLoading(false)
  }

  useEffect(() => {
    if (res && resultRef.current && !reduced) {
      resultRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [res, reduced])

  async function share() {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    const title = res ? `YN Finance: ${res.verdict} — ${res.confidence}% confident` : `YN Finance · ${ui?.name ?? cat} timer`
    const text = res ? `${res.headline} (${res.confidence}% confidence, ${res.backtest}% backtested)` : ui?.question
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return }
    } catch { /* user cancelled */ }
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied to clipboard')
    } catch {
      setToast('Copy this page’s URL to share')
    }
    setTimeout(() => setToast(''), 2600)
  }

  // unknown / not-yet-live category
  if (!ui) {
    return (
      <Shell toast={toast}>
        <div className="ev-rise" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 24, padding: '40px 30px', textAlign: 'center', boxShadow: '0 18px 44px rgba(28,22,15,.08)' }}>
          <div style={{ fontSize: 46, marginBottom: 12 }}>🛠️</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 26, fontWeight: 900, letterSpacing: '-.02em', marginBottom: 10 }}>This one’s coming soon</div>
          <div style={{ fontSize: 15, color: SUB, marginBottom: 24, lineHeight: 1.6, maxWidth: 400, marginLeft: 'auto', marginRight: 'auto' }}>
            The net needs a clean market to read for <b style={{ color: INK }}>“{cat}”</b> before it’ll make a call. It’s on the list — every live timer is graded in public.
          </div>
          <Link href="/everyone" className="ev-cta" style={{ display: 'inline-flex', alignItems: 'center', minHeight: 50, fontSize: 14.5, fontWeight: 800, color: CREAM, background: GREEN, borderRadius: 14, padding: '13px 24px', textDecoration: 'none', boxShadow: '0 12px 28px rgba(24,146,95,.3)' }}>← See what’s live</Link>
        </div>
      </Shell>
    )
  }

  const color = stanceColor(res?.stance)
  const tint = stanceTint(res?.stance)

  return (
    <Shell toast={toast}>
      <div className="ev-rise" style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.12em', color: GREEN, marginBottom: 12 }}>{ui.emoji} {ui.name.toUpperCase()} TIMER</div>
      <h1 className="ev-rise" style={{ fontFamily: DISPLAY, fontSize: 'clamp(31px,5.4vw,46px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.04, margin: '0 0 14px' }}>{ui.question}</h1>
      <p className="ev-rise" style={{ fontSize: 16.5, color: SUB, lineHeight: 1.6, maxWidth: 560, marginBottom: 30 }}>
        The same BrainStock net that grades its stock calls in public reads {ui.blurb} — and tells you whether to act now or wait. A forecast you can check, not advice.
      </p>

      <div className="ev-rise" style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 22, padding: 22, boxShadow: '0 18px 44px rgba(28,22,15,.08)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 11 }}>When are you deciding?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ui.windows.map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)} className="ev-chip" style={{
              fontSize: 13.5, fontWeight: 700, padding: '11px 17px', minHeight: 44, borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${days === d ? GREEN : LINE}`, color: days === d ? '#fff' : INK,
              background: days === d ? GREEN : '#f7f3ec', boxShadow: days === d ? '0 6px 16px rgba(24,146,95,.25)' : 'none',
            }}>{l}</button>
          ))}
        </div>
        <button onClick={run} disabled={loading} className="ev-btn-grad" style={{
          marginTop: 20, width: '100%', fontSize: 16.5, fontWeight: 800, minHeight: 52, color: CREAM, cursor: loading ? 'default' : 'pointer',
          background: loading ? '#9bb0a5' : `linear-gradient(135deg,${GREEN},#0f7a4d)`, border: 'none', borderRadius: 14, padding: '15px',
          boxShadow: loading ? 'none' : '0 12px 28px rgba(24,146,95,.3)', transition: 'filter .2s ease',
        }}>
          {loading ? <span className="ev-anim" style={{ animation: 'evpulse 1.1s ease-in-out infinite' }}>Reading the market…</span> : 'Get the call →'}
        </button>
      </div>

      {err && <div className="ev-rise" style={{ marginTop: 18, color: RED, fontSize: 14, background: 'rgba(212,80,62,.07)', border: '1px solid rgba(212,80,62,.2)', borderRadius: 12, padding: '13px 15px' }}>{err}</div>}

      {res && (
        <div ref={resultRef} className="ev-anim" style={{ marginTop: 24, background: CARD, border: `1px solid ${LINE}`, borderRadius: 24, overflow: 'hidden', boxShadow: '0 26px 60px rgba(28,22,15,.12)', animation: 'evpop .6s cubic-bezier(.16,1,.3,1) both' }}>
          <div style={{ padding: '26px 24px 22px', background: tint, borderBottom: `1px solid ${LINE}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 200, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: SUB }}>The call</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: '.05em', color: res.grounded ? GREEN : SUB, background: res.grounded ? 'rgba(24,146,95,.14)' : '#efe9df', borderRadius: 999, padding: '3px 9px' }}>
                    {res.grounded && <span style={{ width: 6, height: 6, borderRadius: 999, background: GREEN, display: 'inline-block' }} />}
                    {res.grounded ? 'NET + LIVE NEWS' : (res.engine || 'NET').toUpperCase()}
                  </span>
                </div>
                <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(40px,9vw,52px)', fontWeight: 900, letterSpacing: '-.03em', color, lineHeight: .98 }}>{res.verdict}</div>
                <div style={{ fontSize: 16.5, fontWeight: 700, marginTop: 10, lineHeight: 1.4, maxWidth: 360 }}>{res.headline}</div>
              </div>
              <div style={{ display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                <ConfidenceGauge value={res.confidence} color={color} reduced={reduced} />
              </div>
            </div>
          </div>

          <div style={{ padding: '22px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 11 }}>WHY</div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
              {res.drivers.map((d, i) => (
                <li key={i} className="ev-anim" style={{ fontSize: 14.5, lineHeight: 1.55, color: INK, display: 'flex', gap: 10, animation: `evrise .5s cubic-bezier(.16,1,.3,1) both`, animationDelay: `${0.15 + i * 0.08}s` }}>
                  <span style={{ color, fontWeight: 900, flexShrink: 0 }}>›</span>
                  <span dangerouslySetInnerHTML={{ __html: renderBold(d) }} />
                </li>
              ))}
            </ul>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 22 }}>
              <Stat label={ui.outlookLabel} value={res.direction} color={color} />
              <Stat label="Backtested accuracy" value={res.backtest + '%'} color={BLUE} />
            </div>

            {!!res.sources?.length && (
              <div style={{ marginTop: 20 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 10 }}>SOURCES IT CHECKED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {res.sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="ev-src" style={{ fontSize: 11.5, fontWeight: 600, color: BLUE, background: 'rgba(59,107,255,.08)', border: '1px solid rgba(59,107,255,.2)', borderRadius: 999, padding: '7px 12px', textDecoration: 'none', transition: 'background .2s ease' }}>{s.title} ↗</a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ marginTop: 20, padding: '14px 16px', background: '#f7f3ec', borderRadius: 14, fontSize: 12.5, color: SUB, lineHeight: 1.55 }}>
              {res.grounded
                ? <>Read by the <b style={{ color: INK }}>net + live news</b> — the BrainStock forecast on {res.proxy} fused with this week’s real headlines.</>
                : <>Read from <b style={{ color: INK }}>{res.proxy}</b> via the {res.engine} as of {res.asOf}.</>} A forecast, <b style={{ color: INK }}>not financial advice</b>.
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 16 }}>
              <Link href="/everyone" className="ev-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, fontSize: 14.5, fontWeight: 800, color: CREAM, background: INK, borderRadius: 14, padding: '13px', textDecoration: 'none', boxShadow: '0 10px 24px rgba(28,22,15,.18)' }}>
                More decisions →
              </Link>
              <button onClick={share} className="ev-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 50, minWidth: 50, fontSize: 14.5, fontWeight: 800, color: INK, background: '#f2ece2', border: `1px solid ${LINE}`, borderRadius: 14, padding: '13px 18px', cursor: 'pointer' }} aria-label="Share this call">
                <ShareIcon /> Share
              </button>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 32, fontSize: 13, color: SUB, textAlign: 'center' }}>
        <Link href="/everyone" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>← all decisions</Link>
      </div>
    </Shell>
  )
}

function Shell({ children, toast }: { children: React.ReactNode; toast?: string }) {
  return (
    <div style={{ background: CREAM, color: INK, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes evpop{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes evrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes evtoast{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%)}}
        @keyframes evpulse{0%,100%{opacity:.55}50%{opacity:1}}
        @media (prefers-reduced-motion: reduce){
          .ev-anim{animation:none !important}
          *{scroll-behavior:auto !important}
        }
        .ev-rise{animation:evrise .55s cubic-bezier(.16,1,.3,1) both}
        .ev-btn-grad:hover{filter:brightness(1.06)}
        .ev-chip{transition:transform .15s ease, background .2s ease, border-color .2s ease}
        .ev-chip:active{transform:scale(.96)}
        .ev-src:hover{background:rgba(59,107,255,.14) !important}
        .ev-cta{transition:transform .18s ease}
        .ev-cta:hover{transform:translateY(-1px)}
      `}</style>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(251,247,240,.86)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ width: 30, height: 30, background: INK, color: CREAM, display: 'grid', placeItems: 'center', fontFamily: DISPLAY, fontWeight: 900, fontSize: 12.5, borderRadius: 9 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 16, color: INK }}>for everyone</span>
          </Link>
          <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none', minHeight: 44, display: 'flex', alignItems: 'center' }}>← all decisions</Link>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 22px 90px' }}>{children}</main>
      {toast && (
        <div className="ev-anim" style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: INK, color: CREAM, fontSize: 13.5, fontWeight: 700, padding: '12px 20px', borderRadius: 999, boxShadow: '0 14px 34px rgba(28,22,15,.3)', zIndex: 60, animation: 'evtoast .35s cubic-bezier(.16,1,.3,1) both' }}>
          ✓ {toast}
        </div>
      )}
    </div>
  )
}

function ShareIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" />
    </svg>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: '#f7f3ec', borderRadius: 14, padding: '13px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 17, fontWeight: 900, color: color || INK, textTransform: 'capitalize', letterSpacing: '-.01em' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: SUB, marginTop: 5, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
