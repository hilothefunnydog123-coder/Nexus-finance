'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'

const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', AMBER = '#f0892f', BLUE = '#3b6bff', LINE = 'rgba(28,22,15,.08)'

type UI = { emoji: string; name: string; question: string; windows: [number, string][] }
const CAT_UI: Record<string, UI> = {
  gas:         { emoji: '⛽', name: 'Gas prices',        question: 'Fill up now, or wait?',                  windows: [[7, 'this week'], [14, 'next 2 weeks'], [30, 'this month']] },
  flights:     { emoji: '✈️', name: 'Airfares',          question: 'Book now, or keep watching?',            windows: [[14, 'in ~2 weeks'], [30, 'in ~1 month'], [60, 'in ~2 months']] },
  electricity: { emoji: '💡', name: 'Electricity plans', question: 'Lock a fixed plan, or stay variable?',  windows: [[30, '1 month'], [60, '2 months'], [90, '3 months']] },
}

type Result = {
  verdict: string; stance: 'now' | 'wait' | 'neutral'; headline: string; confidence: number
  backtest: number; direction: string; drivers: string[]; engine: string; proxy: string; asOf: string
  sources?: { title: string; uri: string }[]; grounded?: boolean; error?: string
}

const bold = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')

export default function CategoryTool() {
  const params = useParams<{ category: string }>()
  const cat = String(params.category || '')
  const ui = CAT_UI[cat]

  const [days, setDays] = useState(ui?.windows[0][0] ?? 14)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const [err, setErr] = useState('')

  async function run() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const r = await fetch(`/api/everyone/forecast?category=${cat}&days=${days}`)
      const j = await r.json()
      if (j.error) setErr(j.error); else setRes(j)
    } catch { setErr('Couldn’t reach the market just now — try again in a moment.') }
    setLoading(false)
  }

  // unknown / not-yet-live category
  if (!ui) {
    return (
      <Shell>
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, padding: 30, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 10 }}>🛠️</div>
          <div style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>This one’s coming soon</div>
          <div style={{ fontSize: 15, color: SUB, marginBottom: 20 }}>The net needs a clean market to read for “{cat}” first. It’s on the list.</div>
          <Link href="/everyone" style={{ fontSize: 14.5, fontWeight: 800, color: CREAM, background: GREEN, borderRadius: 12, padding: '12px 22px', textDecoration: 'none' }}>← See what’s live</Link>
        </div>
      </Shell>
    )
  }

  const color = res?.stance === 'now' ? AMBER : res?.stance === 'wait' ? GREEN : BLUE
  const tint = res?.stance === 'now' ? 'rgba(240,137,47,.1)' : res?.stance === 'wait' ? 'rgba(24,146,95,.1)' : 'rgba(59,107,255,.08)'

  return (
    <Shell>
      <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.12em', color: GREEN, marginBottom: 12 }}>{ui.emoji} {ui.name.toUpperCase()} TIMER</div>
      <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.05, margin: '0 0 12px' }}>{ui.question}</h1>
      <p style={{ fontSize: 16.5, color: SUB, lineHeight: 1.6, maxWidth: 560, marginBottom: 26 }}>
        The same BrainStock net that grades its stock calls in public reads the market that drives {ui.name.toLowerCase()} — and tells you whether to act now or wait. A forecast you can check, not advice.
      </p>

      <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, padding: 22, boxShadow: '0 14px 40px rgba(28,22,15,.07)' }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 10 }}>When are you deciding?</div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {ui.windows.map(([d, l]) => (
            <button key={d} onClick={() => setDays(d)} style={{
              fontSize: 13.5, fontWeight: 700, padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
              border: `1px solid ${days === d ? GREEN : LINE}`, color: days === d ? '#fff' : INK, background: days === d ? GREEN : '#f7f3ec',
            }}>{l}</button>
          ))}
        </div>
        <button onClick={run} disabled={loading} style={{
          marginTop: 18, width: '100%', fontSize: 16, fontWeight: 800, color: CREAM, cursor: loading ? 'default' : 'pointer',
          background: loading ? '#9bb0a5' : `linear-gradient(135deg,${GREEN},#0f7a4d)`, border: 'none', borderRadius: 13, padding: '15px',
        }}>{loading ? 'Reading the market…' : 'Get the call →'}</button>
      </div>

      {err && <div style={{ marginTop: 18, color: '#d4503e', fontSize: 14 }}>{err}</div>}

      {res && (
        <div style={{ marginTop: 22, background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(28,22,15,.1)', animation: 'cpop .5s cubic-bezier(.16,1,.3,1) both' }}>
          <style>{`@keyframes cpop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ padding: '24px', background: tint, borderBottom: `1px solid ${LINE}`, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: SUB }}>The call</span>
                <span style={{ fontSize: 9.5, fontWeight: 800, letterSpacing: '.06em', color: res.grounded ? GREEN : SUB, background: res.grounded ? 'rgba(24,146,95,.12)' : '#efe9df', borderRadius: 999, padding: '3px 8px' }}>{(res.engine || 'net').toUpperCase()}</span>
              </div>
              <div style={{ fontSize: 40, fontWeight: 900, letterSpacing: '-.02em', color, lineHeight: 1 }}>{res.verdict}</div>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{res.headline}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 34, fontWeight: 900, color }}>{res.confidence}%</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: SUB }}>confidence</div>
            </div>
          </div>
          <div style={{ padding: '20px 24px' }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 10 }}>WHY</div>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
              {res.drivers.map((d, i) => <li key={i} style={{ fontSize: 14.5, lineHeight: 1.55 }} dangerouslySetInnerHTML={{ __html: bold(d) }} />)}
            </ul>
            {!!res.sources?.length && (
              <div style={{ marginTop: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 9 }}>SOURCES IT CHECKED</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                  {res.sources.map((s, i) => (
                    <a key={i} href={s.uri} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, fontWeight: 600, color: BLUE, background: 'rgba(59,107,255,.08)', border: '1px solid rgba(59,107,255,.2)', borderRadius: 999, padding: '5px 11px', textDecoration: 'none' }}>{s.title} ↗</a>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, marginTop: 18 }}>
              <Stat label={`Outlook (${ui.name.toLowerCase()})`} value={res.direction} />
              <Stat label="Backtested accuracy" value={res.backtest + '%'} />
            </div>
            <div style={{ marginTop: 16, padding: '13px 15px', background: '#f7f3ec', borderRadius: 12, fontSize: 12.5, color: SUB, lineHeight: 1.55 }}>
              {res.grounded ? <>Read by the <b style={{ color: INK }}>net + live news</b> — the BrainStock forecast on {res.proxy} fused with this week’s real headlines.</> : <>Read from <b style={{ color: INK }}>{res.proxy}</b> via the {res.engine} as of {res.asOf}.</>} A forecast, <b style={{ color: INK }}>not financial advice</b>.
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 30, fontSize: 13, color: SUB, textAlign: 'center' }}>
        <Link href="/everyone" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>← all decisions</Link>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ background: CREAM, color: INK, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <header style={{ position: 'sticky', top: 0, zIndex: 40, background: 'rgba(251,247,240,.86)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}` }}>
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '0 22px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/everyone" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <span style={{ width: 28, height: 28, background: INK, color: CREAM, display: 'grid', placeItems: 'center', fontWeight: 900, fontSize: 12, borderRadius: 8 }}>YN</span>
            <span style={{ fontWeight: 800, fontSize: 16 }}>for everyone</span>
          </Link>
          <Link href="/everyone" style={{ fontSize: 13.5, fontWeight: 600, color: SUB, textDecoration: 'none' }}>← all decisions</Link>
        </div>
      </header>
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 22px 80px' }}>{children}</main>
    </div>
  )
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f7f3ec', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 17, fontWeight: 900, color: INK, textTransform: 'capitalize' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: SUB, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
