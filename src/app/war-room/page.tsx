'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeft, Gavel, Loader2 } from 'lucide-react'

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const AMBER = '#fbbf24'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.025)', border: `1px solid ${BORDER}`, borderRadius: 16 }

type Persona = { name: string; title: string; color: string; emoji: string; side: 'L' | 'R' }
const CAST: Record<string, Persona> = {
  BULL: { name: 'Marcus', title: 'Long PM', color: GREEN, emoji: '🐂', side: 'L' },
  BEAR: { name: 'Vera', title: 'Short Seller', color: RED, emoji: '🐻', side: 'R' },
  QUANT: { name: 'Kenji', title: 'Quant · cites BrainStock', color: CYAN, emoji: '📊', side: 'L' },
  RISK: { name: 'Dalia', title: 'Risk Officer', color: AMBER, emoji: '🛡️', side: 'R' },
  CIO: { name: 'The CIO', title: 'Chief Investment Officer', color: VIOLET, emoji: '⚖️', side: 'L' },
}

type Line = { who: string; text: string }
type Ruling = { verdict: string; conviction: number; size: string; invalidation: string; summary: string; why: string } | null
type FC = { price: number; pct: number; dir: string; dirAcc: number; skill: number; horizon: number } | null

// Real, deterministic conviction from the model's measured edge + agreement with the
// committee verdict — NOT a number the LLM made up.
function computeConviction(f: FC, verdict: string): { score: number; why: string } {
  const bull = /buy/i.test(verdict)
  const bear = /short|sell|avoid/i.test(verdict)
  if (!f) {
    const base = /strong/i.test(verdict) ? 55 : /hold/i.test(verdict) ? 38 : 48
    return { score: base, why: 'Model offline for this ticker — committee judgment only.' }
  }
  const dirAcc = Number(f.dirAcc) || 50 // backtested directional hit-rate
  const skill = Number(f.skill) || 0 // % better than a naive baseline (can be negative)
  const pct = Math.abs(Number(f.pct) || 0) // size of the predicted move
  const up = f.dir === 'up'

  let c = 50
  c += (dirAcc - 55) * 1.2 // reward accuracy above coin-flip-ish
  c += skill * 1.2 // reward genuinely beating the baseline; punish if it doesn't
  c += Math.min(10, pct * 1.5) // a bigger predicted move carries more signal (capped)
  if ((bull && up) || (bear && !up)) c += 8 // committee agrees with the model
  else if ((bull && !up) || (bear && up)) c -= 12 // committee is fighting the model
  c = Math.max(8, Math.min(94, Math.round(c)))

  const parts = [`${dirAcc}% directional accuracy`, `${skill >= 0 ? '+' : ''}${skill} skill vs baseline`]
  if ((bull && up) || (bear && !up)) parts.push('verdict aligns with the forecast')
  else if ((bull && !up) || (bear && up)) parts.push('verdict fights the forecast')
  return { score: c, why: `From ${parts.join(' · ')}.` }
}

const POPULAR = ['NVDA', 'TSLA', 'AAPL', 'PLTR', 'AMD', 'SPY']

export default function WarRoom() {
  const [ticker, setTicker] = useState('NVDA')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const [shown, setShown] = useState(0)
  const [ruling, setRuling] = useState<Ruling>(null)
  const [convened, setConvened] = useState(false)
  const feedRef = useRef<HTMLDivElement>(null)

  // staged reveal — drip the debate in like a live meeting
  useEffect(() => {
    if (shown >= lines.length) return
    const t = setTimeout(() => setShown((s) => s + 1), shown === 0 ? 250 : 1300)
    return () => clearTimeout(t)
  }, [shown, lines])

  useEffect(() => {
    feedRef.current?.scrollTo({ top: feedRef.current.scrollHeight, behavior: 'smooth' })
  }, [shown])

  const convene = async (sym?: string) => {
    const t = (sym ?? ticker).trim().toUpperCase()
    if (!t) return
    setTicker(t)
    setLoading(true)
    setError(null)
    setLines([])
    setShown(0)
    setRuling(null)
    setConvened(true)

    // 1) pull the real forecast so the Quant has live numbers to cite
    let forecast: FC = null
    const name = t
    try {
      const r = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t, horizon: 5, source: 'analyzer' }),
      })
      const j = await r.json()
      if (r.ok && j.history?.length) {
        const price = j.history[j.history.length - 1].price
        const target = j.forecast[j.forecast.length - 1]?.price ?? price
        const pct = +(((target - price) / price) * 100).toFixed(2)
        forecast = {
          price: +price.toFixed(2),
          pct,
          dir: pct >= 0 ? 'up' : 'down',
          dirAcc: +(j.metrics.directional_accuracy * 100).toFixed(0),
          skill: +(j.metrics.skill_score * 100).toFixed(1),
          horizon: 5,
        }
      }
    } catch {
      /* forecast optional */
    }

    // 2) convene the committee
    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'war_room', data: { ticker: t, name, forecast } }),
      })
      const j = await r.json()
      const raw = (j.reply || j.raw || '').toString().replace(/```/g, '')

      const parsedLines: Line[] = []
      let parsedRuling: Ruling = null
      for (const rawLine of raw.split('\n')) {
        const line = rawLine.trim()
        const round = line.match(/^ROUND:\s*([A-Z]+)\s*\|\s*([\s\S]+)$/i)
        if (round && CAST[round[1].toUpperCase()]) {
          parsedLines.push({ who: round[1].toUpperCase(), text: round[2].trim() })
          continue
        }
        const rule = line.match(/^RULING:\s*([\s\S]+)$/i)
        if (rule) {
          const parts = rule[1].split('|').map((s: string) => s.trim())
          const verdict = parts[0] || 'HOLD'
          const conv = computeConviction(forecast, verdict) // real, computed — ignore the LLM's number
          parsedRuling = {
            verdict,
            conviction: conv.score,
            why: conv.why,
            size: parts[2] || '—',
            invalidation: parts[3] || '—',
            summary: parts[4] || '',
          }
        }
      }

      if (!parsedLines.length) {
        setError('The committee couldn’t convene on that one — try another ticker.')
      } else {
        setLines(parsedLines)
        setRuling(parsedRuling)
      }
    } catch {
      setError('Lost the room for a second. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const allShown = shown >= lines.length && lines.length > 0
  const verdictColor = (v: string) =>
    /strong buy|buy/i.test(v) ? GREEN : /short|avoid|sell/i.test(v) ? RED : AMBER

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 14% -8%, rgba(167,139,250,.14), transparent 55%), radial-gradient(1000px 520px at 90% 0%, rgba(34,211,238,.10), transparent 52%), #070b14',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`@keyframes wr-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
        @keyframes wr-dots{0%,20%{opacity:.2}50%{opacity:1}100%{opacity:.2}}
        .wr-msg{animation:wr-in .4s ease both}`}</style>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '28px 22px 90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
            <ArrowLeft size={14} /> YN Finance
          </Link>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, letterSpacing: 1.5, textTransform: 'uppercase', color: MUTED }}>
          <Gavel size={15} color={VIOLET} /> The War Room
        </div>
        <h1 style={{ fontSize: 'clamp(30px,5.2vw,50px)', fontWeight: 800, letterSpacing: -1.5, margin: '8px 0 0', lineHeight: 1.05 }}>
          Watch a hedge fund&apos;s committee{' '}
          <span style={{ background: `linear-gradient(90deg, ${VIOLET}, ${CYAN})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            fight over your stock.
          </span>
        </h1>
        <p style={{ marginTop: 12, fontSize: 16, color: MUTED, maxWidth: 600, lineHeight: 1.6 }}>
          Five AI desk characters — a long PM, a short-seller, a quant, a risk officer and the CIO — debate your ticker
          live, citing real news and BrainStock&apos;s forecast, then the CIO rules.
        </p>

        {/* cast */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {Object.entries(CAST).map(([k, p]) => (
            <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#cdd6e6', border: `1px solid ${p.color}40`, background: `${p.color}12`, borderRadius: 100, padding: '5px 11px' }}>
              <span>{p.emoji}</span> <b style={{ color: p.color }}>{p.name}</b> · {p.title}
            </span>
          ))}
        </div>

        {/* composer */}
        <div style={{ ...glass, marginTop: 22, padding: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, paddingLeft: 8, flex: '1 1 160px' }}>
            <span style={{ color: MUTED, fontWeight: 600 }}>$</span>
            <input
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === 'Enter' && convene()}
              placeholder="NVDA"
              maxLength={8}
              spellCheck={false}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, letterSpacing: 1.5, fontWeight: 600 }}
            />
          </div>
          <button
            onClick={() => convene()}
            disabled={loading}
            style={{ border: 'none', borderRadius: 12, padding: '12px 22px', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', background: `linear-gradient(135deg, ${VIOLET}, ${CYAN})`, color: '#07101a', display: 'inline-flex', alignItems: 'center', gap: 8 }}
          >
            {loading ? <><Loader2 size={16} className="wr-spin" style={{ animation: 'spin 1s linear infinite' }} /> Convening…</> : <>Convene the committee</>}
          </button>
        </div>
        <div style={{ marginTop: 10, display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {POPULAR.map((s) => (
            <button key={s} onClick={() => convene(s)} disabled={loading} style={{ fontSize: 12, fontWeight: 700, color: '#cdd6e6', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 100, padding: '5px 11px', cursor: 'pointer' }}>
              {s}
            </button>
          ))}
        </div>

        {error && <div style={{ marginTop: 18, color: '#ffb4b4', fontSize: 14 }}>{error}</div>}

        {loading && (
          <div style={{ marginTop: 22, color: MUTED, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Gavel size={15} color={VIOLET} /> Pulling the tape and gathering the desk…
          </div>
        )}

        {/* the room */}
        {convened && lines.length > 0 && (
          <div ref={feedRef} style={{ ...glass, marginTop: 22, padding: '18px 16px', maxHeight: 560, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {lines.slice(0, shown).map((l, i) => {
              const p = CAST[l.who]
              const right = p.side === 'R'
              return (
                <div key={i} className="wr-msg" style={{ display: 'flex', flexDirection: right ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 18, background: `${p.color}1f`, border: `1px solid ${p.color}55` }}>{p.emoji}</div>
                  <div style={{ maxWidth: '80%' }}>
                    <div style={{ fontSize: 12, color: p.color, fontWeight: 700, marginBottom: 3, textAlign: right ? 'right' : 'left' }}>
                      {p.name} <span style={{ color: MUTED, fontWeight: 500 }}>· {p.title}</span>
                    </div>
                    <div style={{ fontSize: 14.5, lineHeight: 1.55, color: '#e2e8f2', background: right ? `${p.color}10` : 'rgba(255,255,255,.03)', border: `1px solid ${right ? p.color + '33' : BORDER}`, borderRadius: 12, padding: '10px 13px' }}>
                      {l.text}
                    </div>
                  </div>
                </div>
              )
            })}
            {!allShown && (
              <div style={{ color: MUTED, fontSize: 13, paddingLeft: 48, display: 'inline-flex', gap: 3 }}>
                <span style={{ animation: 'wr-dots 1.2s infinite' }}>●</span>
                <span style={{ animation: 'wr-dots 1.2s .2s infinite' }}>●</span>
                <span style={{ animation: 'wr-dots 1.2s .4s infinite' }}>●</span>
              </div>
            )}
          </div>
        )}

        {/* the ruling */}
        {allShown && ruling && (
          <div className="wr-msg" style={{ ...glass, marginTop: 16, padding: 24, borderColor: `${verdictColor(ruling.verdict)}55`, boxShadow: `0 0 50px ${verdictColor(ruling.verdict)}1f` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.4, color: MUTED }}>
              <Gavel size={14} color={VIOLET} /> The CIO&apos;s ruling
            </div>
            <div style={{ fontSize: 'clamp(28px,5vw,40px)', fontWeight: 800, letterSpacing: -1, color: verdictColor(ruling.verdict), marginTop: 6 }}>{ruling.verdict}</div>

            {/* computed conviction — real, not the LLM's guess */}
            <div style={{ marginTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Conviction</span>
                <span style={{ fontSize: 18, fontWeight: 800, color: verdictColor(ruling.verdict), fontVariantNumeric: 'tabular-nums' }}>{ruling.conviction}%</span>
              </div>
              <div style={{ height: 8, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${ruling.conviction}%`, borderRadius: 99, background: `linear-gradient(90deg, ${verdictColor(ruling.verdict)}, ${verdictColor(ruling.verdict)}aa)`, transition: 'width .8s ease' }} />
              </div>
              {ruling.why && <div style={{ marginTop: 6, fontSize: 12, color: MUTED, lineHeight: 1.5 }}>{ruling.why}</div>}
            </div>

            {ruling.summary && <p style={{ marginTop: 14, fontSize: 16, color: '#e2e8f2', lineHeight: 1.55 }}>{ruling.summary}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
              <div style={{ ...glass, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Position size</div>
                <div style={{ marginTop: 3, fontSize: 16, fontWeight: 700 }}>{ruling.size}</div>
              </div>
              <div style={{ ...glass, padding: '12px 14px' }}>
                <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>Invalidation</div>
                <div style={{ marginTop: 3, fontSize: 16, fontWeight: 700, color: RED }}>{ruling.invalidation}</div>
              </div>
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <Link href={`/brainstock?t=${ticker}`} style={{ fontSize: 13, fontWeight: 700, color: '#07101a', background: `linear-gradient(90deg, ${CYAN}, ${VIOLET})`, padding: '10px 16px', borderRadius: 100, textDecoration: 'none' }}>
                See BrainStock&apos;s forecast →
              </Link>
              <button onClick={() => convene()} style={{ fontSize: 13, fontWeight: 700, color: '#cdd6e6', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, padding: '10px 16px', borderRadius: 100, cursor: 'pointer' }}>
                Re-run the room ↻
              </button>
            </div>
          </div>
        )}

        <p style={{ marginTop: 26, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          The committee is an AI dramatization for research and education — five model personas debating public information and BrainStock&apos;s estimate. Not financial advice, not real people, not a recommendation.
        </p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}
