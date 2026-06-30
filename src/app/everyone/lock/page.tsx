'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Home, Check, Share2 } from 'lucide-react'

// ── new cobalt/ink/paper brand (matches /everyone landing) ──
const INK = '#0a0a0c', BONE = '#f4f2ec', PAPER = '#fcfbf8', ACCENT = '#1f3bff'
const SUB = 'rgba(10,10,12,.62)', LINE = 'rgba(10,10,12,.1)'
const NOW = '#e0841f', WAIT = '#0a9d63', NEU = '#1f3bff', RED = '#d4503e'
const DISPLAY = 'var(--font-display), system-ui, sans-serif'
const MONO = 'var(--font-mono), ui-monospace, monospace'

type Stance = 'now' | 'wait' | 'neutral'
type Forecast = {
  category: string; emoji: string; noun: string; verdict: string; stance: Stance
  confidence: number; backtest: number; direction: string; headline: string
  drivers: string[]; sources: { title: string; uri: string }[]; engine: string
  grounded: boolean; proxy: string; asOf: string; movePct: number; error?: string
  payment: number; saveIfFloat: number; costIfWait: number
}

const DAYS = [[14, '~2 weeks'], [30, '~30 days'], [45, '~45 days'], [60, '~60 days']] as const
const usd = (n: number) => '$' + Math.round(n).toLocaleString()

// stance → palette
function stanceColor(s?: Stance) {
  return s === 'now' ? NOW : s === 'wait' ? WAIT : s === 'neutral' ? NEU : INK
}
function stanceTint(s?: Stance) {
  return s === 'now' ? 'rgba(224,132,31,.09)' : s === 'wait' ? 'rgba(10,157,99,.09)' : 'rgba(31,59,255,.07)'
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

// animated count-up to a target number
function useCountUp(target: number, run: boolean, reduced: boolean, ms = 900) {
  const [val, setVal] = useState(reduced ? target : 0)
  const raf = useRef<number | null>(null)
  useEffect(() => {
    if (!run) return
    if (reduced) { setVal(target); return }
    const start = performance.now()
    const from = 0
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / ms)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(from + (target - from) * eased)
      if (p < 1) raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => { if (raf.current) cancelAnimationFrame(raf.current) }
  }, [target, run, reduced, ms])
  return val
}

// Animated confidence gauge (SVG arc that fills to confidence %)
function ConfidenceGauge({ value, color, reduced }: { value: number; color: string; reduced: boolean }) {
  const animated = useCountUp(value, true, reduced, 1000)
  const size = 132, stroke = 12, r = (size - stroke) / 2
  const circ = 2 * Math.PI * r
  const frac = Math.max(0, Math.min(100, animated)) / 100
  // 3/4 arc gauge (270deg)
  const arc = 0.75
  const dash = circ * arc
  const offset = dash * (1 - frac)
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(10,10,12,.07)" strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${dash} ${circ}`} strokeDashoffset={offset}
          style={{ transition: reduced ? 'none' : 'stroke-dashoffset .1s linear' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>
        <div>
          <div style={{ fontFamily: DISPLAY, fontSize: 34, fontWeight: 700, color, letterSpacing: '-.03em', lineHeight: 1 }}>{Math.round(animated)}<span style={{ fontSize: 17 }}>%</span></div>
          <div style={{ fontFamily: MONO, fontSize: 9.5, fontWeight: 700, letterSpacing: '.14em', color: SUB, marginTop: 4 }}>CONFIDENCE</div>
        </div>
      </div>
    </div>
  )
}

export default function LockTool() {
  const reduced = usePrefersReducedMotion()
  const [loan, setLoan] = useState('420000')
  const [rate, setRate] = useState('6.9')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Forecast | null>(null)
  const [err, setErr] = useState('')
  const [toast, setToast] = useState('')
  const resultRef = useRef<HTMLDivElement | null>(null)

  async function run() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const q = new URLSearchParams({
        category: 'mortgage',
        loan: String(parseFloat(loan) || 0),
        rate: String(parseFloat(rate) || 0),
        days: String(days),
      })
      const r = await fetch('/api/everyone/forecast?' + q.toString())
      const j: Forecast = await r.json()
      if (j.error) { setErr(j.error) } else { setRes(j) }
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
    const title = res ? `YN Finance says ${res.verdict} — ${res.confidence}% confident` : 'YN Finance · Mortgage rate timer'
    const text = res ? `${res.headline} (${res.confidence}% confidence, ${res.backtest}% backtested)` : 'Should you lock your mortgage rate or float?'
    try {
      if (navigator.share) { await navigator.share({ title, text, url }); return }
    } catch { /* user cancelled — fall through to copy */ }
    try {
      await navigator.clipboard.writeText(url)
      setToast('Link copied to clipboard')
    } catch {
      setToast('Copy this page’s URL to share')
    }
    setTimeout(() => setToast(''), 2600)
  }

  const color = stanceColor(res?.stance)
  const tint = stanceTint(res?.stance)
  const payAnim = useCountUp(res?.payment ?? 0, !!res, reduced, 850)

  return (
    <div style={{ background: BONE, color: INK, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes lkpop{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}
        @keyframes lkrise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
        @keyframes lkfade{from{opacity:0}to{opacity:1}}
        @keyframes lktoast{from{opacity:0;transform:translateX(-50%) translateY(12px)}to{opacity:1;transform:translateX(-50%)}}
        @keyframes lkpulse{0%,100%{opacity:.55}50%{opacity:1}}
        @keyframes lkblink{0%,100%{opacity:1}50%{opacity:.25}}
        @media (prefers-reduced-motion: reduce){
          .lk-anim{animation:none !important}
          *{scroll-behavior:auto !important}
        }
        .lk-rise{animation:lkrise .55s cubic-bezier(.16,1,.3,1) both}
        .lk-btn:hover{filter:brightness(1.08)}
        .lk-chip{transition:transform .15s ease, background .2s ease, border-color .2s ease, color .2s ease}
        .lk-chip:active{transform:scale(.96)}
        .lk-src:hover{background:rgba(31,59,255,.12) !important}
        .lk-cta:hover{transform:translateY(-2px)}
        .lk-cta{transition:transform .15s ease}
        .lk-input:focus{border-color:${ACCENT} !important; box-shadow:0 0 0 3px rgba(31,59,255,.12)}
        .lk-step{transition:opacity .2s ease}
      `}</style>

      {/* header — matches /everyone landing */}
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(244,242,236,.85)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: INK }}>
            <span style={{ width: 29, height: 29, background: INK, color: PAPER, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12.5, borderRadius: 7 }}>YN</span>
            <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 16, letterSpacing: '-.03em' }}>Finance</span>
            <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.12em', color: SUB, border: `1px solid ${LINE}`, borderRadius: 999, padding: '3px 9px' }}>FOR EVERYONE</span>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/everyone/proof" style={{ fontSize: 13.5, fontWeight: 600, color: INK, textDecoration: 'none' }}>Track record</Link>
            <Link href="/" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>For traders →</Link>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '32px 22px 90px' }}>
        {/* ── hero photo ── */}
        <div className="lk-rise" style={{ position: 'relative', height: 'clamp(150px,26vw,210px)', borderRadius: 18, overflow: 'hidden', marginBottom: 26, background: `linear-gradient(135deg, ${ACCENT}, ${INK})` }}>
          <img src="https://picsum.photos/seed/ynhouse/1200/800" alt="" loading="lazy" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.5 }} />
          <img src="https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=900&q=80" alt="A house" loading="lazy" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(10,10,12,.2), rgba(10,10,12,.62))' }} />
          <div style={{ position: 'absolute', left: 18, bottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(252,251,248,.94)', display: 'grid', placeItems: 'center' }}><Home size={22} color={ACCENT} aria-hidden /></span>
            <span style={{ fontFamily: DISPLAY, fontSize: 20, fontWeight: 700, color: PAPER, letterSpacing: '-.02em' }}>Mortgage rates</span>
          </div>
        </div>
        {/* ── hero: what this decides ── */}
        <div className="lk-rise" style={{ display: 'flex', alignItems: 'center', gap: 10, fontFamily: MONO, fontSize: 12, letterSpacing: '.14em', color: ACCENT, marginBottom: 18 }}>
          <span style={{ width: 7, height: 7, borderRadius: 99, background: WAIT, animation: 'lkblink 1.5s infinite' }} /> MORTGAGE RATE TIMER
        </div>
        <h1 className="lk-rise" style={{ fontFamily: DISPLAY, fontSize: 'clamp(31px,5.4vw,46px)', fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.04, margin: '0 0 16px' }}>
          Should you lock your rate — <span style={{ color: ACCENT }}>or float?</span>
        </h1>
        <p className="lk-rise" style={{ fontSize: 16.5, color: SUB, lineHeight: 1.6, maxWidth: 560, marginBottom: 32 }}>
          The same net that grades its stock calls in public reads the bond market that drives mortgage rates — and calls it, with a confidence and a backtested accuracy. A forecast you can check, not advice.
        </p>

        {/* ── step 1: the question / input card ── */}
        <div className="lk-rise" style={{ background: PAPER, border: `1px solid ${LINE}`, borderRadius: 16, padding: 22, boxShadow: '0 1px 2px rgba(10,10,12,.04)' }}>
          <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', color: ACCENT, marginBottom: 16 }}>// YOUR LOAN</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="lk-grid">
            <Field label="Loan amount" prefix="$">
              <input className="lk-input" value={Number(loan || 0).toLocaleString()} onChange={(e) => setLoan(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric" style={inp} aria-label="Loan amount" />
            </Field>
            <Field label="Rate you were quoted" suffix="%">
              <input className="lk-input" value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" style={inp} aria-label="Quoted rate" />
            </Field>
          </div>
          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 10 }}>When do you need to close?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(([d, l]) => (
                <button key={d} onClick={() => setDays(d)} className="lk-chip" style={{
                  fontSize: 13.5, fontWeight: 700, padding: '11px 17px', minHeight: 44, borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${days === d ? INK : LINE}`, color: days === d ? PAPER : INK,
                  background: days === d ? INK : 'transparent',
                }}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={run} disabled={loading} className="lk-btn" style={{
            marginTop: 22, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, minHeight: 52, color: PAPER, cursor: loading ? 'default' : 'pointer',
            background: loading ? 'rgba(10,10,12,.45)' : INK, border: 'none', borderRadius: 10, padding: '15px', transition: 'filter .2s ease',
          }}>
            {loading ? <span className="lk-anim" style={{ animation: 'lkpulse 1.1s ease-in-out infinite' }}>Reading the market…</span> : 'Get the call →'}
          </button>
        </div>

        {err && <div className="lk-rise" style={{ marginTop: 18, color: RED, fontSize: 14, background: 'rgba(212,80,62,.07)', border: '1px solid rgba(212,80,62,.2)', borderRadius: 12, padding: '13px 15px' }}>{err}</div>}

        {/* ── step 2: the verdict ── */}
        {res && (
          <div ref={resultRef} className="lk-anim" style={{ marginTop: 26, background: PAPER, border: `1px solid ${LINE}`, borderRadius: 18, overflow: 'hidden', boxShadow: '0 18px 40px rgba(10,10,12,.08)', animation: 'lkpop .6s cubic-bezier(.16,1,.3,1) both' }}>
            {/* verdict header w/ gauge */}
            <div style={{ padding: '26px 24px 22px', background: tint, borderBottom: `1px solid ${LINE}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 200, flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: SUB }}>THE CALL</span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: res.grounded ? WAIT : SUB, background: res.grounded ? 'rgba(10,157,99,.12)' : 'rgba(10,10,12,.05)', border: `1px solid ${res.grounded ? 'rgba(10,157,99,.25)' : LINE}`, borderRadius: 999, padding: '3px 9px' }}>
                      {res.grounded && <span style={{ width: 6, height: 6, borderRadius: 999, background: WAIT, display: 'inline-block' }} />}
                      {res.grounded ? 'NET + LIVE NEWS' : (res.engine || 'NET').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ fontFamily: DISPLAY, fontSize: 'clamp(44px,11vw,56px)', fontWeight: 700, letterSpacing: '-.04em', color, lineHeight: .95 }}>{res.verdict}</div>
                  <div style={{ fontSize: 16.5, fontWeight: 600, marginTop: 10, lineHeight: 1.4, maxWidth: 360 }}>{res.headline}</div>
                </div>
                <div style={{ display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                  <ConfidenceGauge value={res.confidence} color={color} reduced={reduced} />
                </div>
              </div>
            </div>

            <div style={{ padding: '22px 24px' }}>
              {/* WHY */}
              <div style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '.14em', color: ACCENT, marginBottom: 13 }}>// WHY</div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 9 }}>
                {res.drivers.map((d, i) => (
                  <li key={i} className="lk-anim" style={{ fontSize: 14.5, lineHeight: 1.55, color: INK, display: 'flex', gap: 10, animation: `lkrise .5s cubic-bezier(.16,1,.3,1) both`, animationDelay: `${0.15 + i * 0.08}s` }}>
                    <span style={{ color, fontWeight: 900, flexShrink: 0 }}>›</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>

              {/* payment-impact stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 22 }}>
                <Stat label="Your payment" value={usd(payAnim) + '/mo'} />
                <Stat
                  label={res.stance === 'wait' ? 'If rates fall 0.25%' : 'If rates rise 0.25%'}
                  value={(res.stance === 'wait' ? '−' + usd(res.saveIfFloat) : '+' + usd(res.costIfWait)) + '/mo'}
                  color={res.stance === 'wait' ? WAIT : NOW}
                />
                <Stat label="Backtested accuracy" value={res.backtest != null ? res.backtest + '%' : '—'} color={ACCENT} />
              </div>

              {/* sources */}
              {!!res.sources?.length && (
                <div style={{ marginTop: 20 }}>
                  <div style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '.14em', color: SUB, marginBottom: 10 }}>SOURCES IT CHECKED</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {res.sources.map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" className="lk-src" style={{ fontSize: 11.5, fontWeight: 600, color: ACCENT, background: 'rgba(31,59,255,.07)', border: '1px solid rgba(31,59,255,.2)', borderRadius: 999, padding: '7px 12px', textDecoration: 'none', transition: 'background .2s ease' }}>{s.title} ↗</a>
                    ))}
                  </div>
                </div>
              )}

              {/* provenance note */}
              <div style={{ marginTop: 20, padding: '14px 16px', background: BONE, border: `1px solid ${LINE}`, borderRadius: 12, fontSize: 12.5, color: SUB, lineHeight: 1.55 }}>
                {res.grounded
                  ? <>The <b style={{ color: INK }}>BrainStock net</b> read {res.proxy} and fused it with this week’s real rate news.</>
                  : <>Read from <b style={{ color: INK }}>{res.proxy}</b> as of {res.asOf}; rates move opposite to long Treasury bonds.</>} A forecast, <b style={{ color: INK }}>not financial advice</b> — talk to your lender.
              </div>

              {/* CTAs */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginTop: 16 }} className="lk-cta-row">
                <a href="https://www.google.com/search?q=compare+mortgage+rates" target="_blank" rel="noopener noreferrer" className="lk-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 50, fontSize: 14.5, fontWeight: 700, color: PAPER, background: INK, borderRadius: 10, padding: '13px', textDecoration: 'none' }}>
                  Compare lender quotes →
                </a>
                <button onClick={share} className="lk-cta" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, minHeight: 50, minWidth: 50, fontSize: 14.5, fontWeight: 700, color: INK, background: 'transparent', border: `1px solid ${LINE}`, borderRadius: 10, padding: '13px 18px', cursor: 'pointer' }} aria-label="Share this call">
                  <Share2 size={16} aria-hidden /> Share
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── next step: the path onward ── */}
        <div style={{ marginTop: 36, paddingTop: 30, borderTop: `1px solid ${LINE}`, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
          <Link href="/everyone" style={{ fontSize: 14, fontWeight: 700, color: INK, textDecoration: 'none' }}>Try another market →</Link>
          <Link href="/everyone/proof" style={{ fontSize: 14, fontWeight: 600, color: ACCENT, textDecoration: 'none' }}>See the track record →</Link>
        </div>
      </main>

      {/* toast */}
      {toast && (
        <div className="lk-anim" style={{ position: 'fixed', bottom: 26, left: '50%', transform: 'translateX(-50%)', background: INK, color: PAPER, fontSize: 13.5, fontWeight: 700, padding: '12px 20px', borderRadius: 999, boxShadow: '0 14px 34px rgba(10,10,12,.28)', zIndex: 60, display: 'inline-flex', alignItems: 'center', gap: 7, animation: 'lktoast .35s cubic-bezier(.16,1,.3,1) both' }}>
          <Check size={16} color={WAIT} aria-hidden /> {toast}
        </div>
      )}
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: BONE, border: `1px solid ${LINE}`, borderRadius: 10, padding: '12px 13px', fontSize: 18, fontWeight: 700, color: INK, outline: 'none', fontFamily: 'inherit', transition: 'border-color .2s ease, box-shadow .2s ease' }

function Field({ label, prefix, suffix, children }: { label: string; prefix?: string; suffix?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 7 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 17, fontWeight: 700, color: SUB, pointerEvents: 'none' }}>{prefix}</span>}
        <div style={{ paddingLeft: prefix ? 16 : 0 }}>{children}</div>
        {suffix && <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 17, fontWeight: 700, color: SUB, pointerEvents: 'none' }}>{suffix}</span>}
      </div>
    </label>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ background: BONE, border: `1px solid ${LINE}`, borderRadius: 12, padding: '13px 10px', textAlign: 'center' }}>
      <div style={{ fontFamily: DISPLAY, fontSize: 18, fontWeight: 700, color: color || INK, letterSpacing: '-.02em' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: SUB, marginTop: 5, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
