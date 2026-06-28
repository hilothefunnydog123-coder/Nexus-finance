'use client'

import { useState } from 'react'
import Link from 'next/link'

const INK = '#1c160f', SUB = '#6b6256', CREAM = '#fbf7f0', CARD = '#ffffff'
const GREEN = '#18925f', RED = '#d4503e', AMBER = '#f0892f', LINE = 'rgba(28,22,15,.08)'

type Result = {
  verdict: 'LOCK' | 'FLOAT' | 'NEUTRAL'; headline: string; confidence: number; direction: string
  drivers: string[]; backtest: number | null; payment: number; saveIfFloat: number; costIfWait: number
  proxy: string; asOf: string; note?: string
}

const DAYS = [[14, '~2 weeks'], [30, '~30 days'], [45, '~45 days'], [60, '~60 days']] as const
const usd = (n: number) => '$' + Math.round(n).toLocaleString()

export default function LockTool() {
  const [loan, setLoan] = useState('420000')
  const [rate, setRate] = useState('6.9')
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(false)
  const [res, setRes] = useState<Result | null>(null)
  const [err, setErr] = useState('')

  async function run() {
    setLoading(true); setErr(''); setRes(null)
    try {
      const q = new URLSearchParams({ loan: String(parseFloat(loan) || 0), rate: String(parseFloat(rate) || 0), days: String(days) })
      const r = await fetch('/api/everyone/rate?' + q.toString())
      const j = await r.json()
      setRes(j)
    } catch { setErr('Couldn’t reach the market just now — try again in a moment.') }
    setLoading(false)
  }

  const color = res?.verdict === 'LOCK' ? RED : res?.verdict === 'FLOAT' ? GREEN : AMBER
  const tint = res?.verdict === 'LOCK' ? 'rgba(212,80,62,.1)' : res?.verdict === 'FLOAT' ? 'rgba(24,146,95,.1)' : 'rgba(240,137,47,.1)'

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

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '40px 22px 80px' }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, letterSpacing: '.12em', color: GREEN, marginBottom: 12 }}>🏠 MORTGAGE RATE TIMER</div>
        <h1 style={{ fontSize: 'clamp(30px,5vw,44px)', fontWeight: 900, letterSpacing: '-.03em', lineHeight: 1.05, margin: '0 0 12px' }}>Should you lock your rate — or float?</h1>
        <p style={{ fontSize: 16.5, color: SUB, lineHeight: 1.6, maxWidth: 560, marginBottom: 28 }}>
          The AI reads the bond market that drives mortgage rates and calls it — with a confidence and a backtested accuracy. Not advice; a forecast you can check.
        </p>

        {/* input card */}
        <div style={{ background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, padding: 22, boxShadow: '0 14px 40px rgba(28,22,15,.07)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="lk-grid">
            <Field label="Loan amount" prefix="$">
              <input value={loan} onChange={(e) => setLoan(e.target.value.replace(/[^\d]/g, ''))} inputMode="numeric"
                style={inp} />
            </Field>
            <Field label="Rate you were quoted" suffix="%">
              <input value={rate} onChange={(e) => setRate(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
                style={inp} />
            </Field>
          </div>
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 9 }}>When do you need to close?</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {DAYS.map(([d, l]) => (
                <button key={d} onClick={() => setDays(d)} style={{
                  fontSize: 13.5, fontWeight: 700, padding: '9px 15px', borderRadius: 999, cursor: 'pointer',
                  border: `1px solid ${days === d ? GREEN : LINE}`, color: days === d ? '#fff' : INK,
                  background: days === d ? GREEN : '#f7f3ec',
                }}>{l}</button>
              ))}
            </div>
          </div>
          <button onClick={run} disabled={loading} style={{
            marginTop: 20, width: '100%', fontSize: 16, fontWeight: 800, color: CREAM, cursor: loading ? 'default' : 'pointer',
            background: loading ? '#9bb0a5' : `linear-gradient(135deg,${GREEN},#0f7a4d)`, border: 'none', borderRadius: 13, padding: '15px',
          }}>{loading ? 'Reading the market…' : 'Get the call →'}</button>
        </div>

        {err && <div style={{ marginTop: 18, color: RED, fontSize: 14 }}>{err}</div>}

        {/* result */}
        {res && (
          <div style={{ marginTop: 22, background: CARD, border: `1px solid ${LINE}`, borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 50px rgba(28,22,15,.1)', animation: 'lkpop .5s cubic-bezier(.16,1,.3,1) both' }}>
            <style>{`@keyframes lkpop{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
            <div style={{ padding: '24px 24px 20px', background: tint, borderBottom: `1px solid ${LINE}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 4 }}>The call</div>
                  <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: '-.02em', color, lineHeight: 1 }}>{res.verdict}</div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{res.headline}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 34, fontWeight: 900, color }}>{res.confidence}%</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: SUB }}>confidence</div>
                </div>
              </div>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.1em', color: SUB, marginBottom: 10 }}>WHY</div>
              <ul style={{ margin: 0, paddingLeft: 18, display: 'grid', gap: 8 }}>
                {res.drivers.map((d, i) => <li key={i} style={{ fontSize: 14.5, lineHeight: 1.55, color: INK }}>{d}</li>)}
              </ul>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginTop: 20 }}>
                <Stat label="Your payment" value={usd(res.payment) + '/mo'} />
                <Stat label={res.verdict === 'LOCK' ? 'If rates rise 0.25%' : 'If rates fall 0.25%'} value={(res.verdict === 'LOCK' ? '+' + usd(res.costIfWait) : '−' + usd(res.saveIfFloat)) + '/mo'} accent={res.verdict !== 'LOCK'} />
                <Stat label="Backtested accuracy" value={res.backtest != null ? res.backtest + '%' : '—'} />
              </div>

              <div style={{ marginTop: 18, padding: '13px 15px', background: '#f7f3ec', borderRadius: 12, fontSize: 12.5, color: SUB, lineHeight: 1.55 }}>
                Read from <b style={{ color: INK }}>{res.proxy}</b> as of {res.asOf}. Rates move opposite to long Treasury bonds — we read that trend, score it, and backtest the rule.{res.note ? ` (${res.note})` : ''} This is a forecast, <b style={{ color: INK }}>not financial advice</b> — talk to your lender before deciding.
              </div>

              <a href="https://www.google.com/search?q=compare+mortgage+rates" target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 14, textAlign: 'center', fontSize: 14.5, fontWeight: 800, color: CREAM, background: INK, borderRadius: 12, padding: '13px', textDecoration: 'none' }}>
                Compare lender quotes →
              </a>
            </div>
          </div>
        )}

        <div style={{ marginTop: 30, fontSize: 13, color: SUB, textAlign: 'center' }}>
          Want this for gas, used cars or flights? <Link href="/everyone" style={{ color: GREEN, fontWeight: 700, textDecoration: 'none' }}>See what’s coming →</Link>
        </div>
      </main>
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', background: '#f7f3ec', border: `1px solid ${LINE}`, borderRadius: 11, padding: '12px 13px', fontSize: 18, fontWeight: 700, color: INK, outline: 'none', fontFamily: 'inherit' }

function Field({ label, prefix, suffix, children }: { label: string; prefix?: string; suffix?: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <div style={{ fontSize: 12.5, fontWeight: 700, color: SUB, marginBottom: 7 }}>{label}</div>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 17, fontWeight: 700, color: SUB }}>{prefix}</span>}
        <div style={{ paddingLeft: prefix ? 16 : 0 }}>{children}</div>
        {suffix && <span style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', fontSize: 17, fontWeight: 700, color: SUB }}>{suffix}</span>}
      </div>
    </label>
  )
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ background: '#f7f3ec', borderRadius: 12, padding: '12px 10px', textAlign: 'center' }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: accent ? GREEN : INK, letterSpacing: '-.01em' }}>{value}</div>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: SUB, marginTop: 4, lineHeight: 1.3 }}>{label}</div>
    </div>
  )
}
