'use client'

import { Suspense, useEffect, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, ShieldCheck, TrendingUp, Zap } from 'lucide-react'

const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = { background: 'rgba(255,255,255,.025)', border: `1px solid ${BORDER}`, borderRadius: 18 }

type Usage = {
  ready: boolean
  terms: { perWin: number; cap: number }
  preview?: { windowDays: number; graded: number; wins: number; winRate: number; youWouldPay: number; cappedOut: boolean }
}

function PricingInner() {
  const params = useSearchParams()
  const [u, setU] = useState<Usage | null>(null)
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [activated, setActivated] = useState(false)
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/pricing/usage').then((r) => r.json()).then(setU).catch(() => {})
  }, [])

  // On return from Stripe, record the subscriber.
  useEffect(() => {
    const sid = params.get('session_id')
    if (params.get('activated') && sid) {
      fetch('/api/stripe/payg/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sid }),
      })
        .then((r) => r.json())
        .then((j) => setActivated(!!j.ok))
        .catch(() => {})
    }
  }, [params])

  const start = async () => {
    setLoading(true)
    setNote(null)
    try {
      const r = await fetch('/api/stripe/payg/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const j = await r.json()
      if (j.url) window.location.href = j.url
      else if (j.demo) setNote('Payments are in demo mode — Stripe keys not set yet.')
      else setNote(j.error || 'Could not start checkout.')
    } catch {
      setNote('Could not reach checkout.')
    } finally {
      setLoading(false)
    }
  }

  const terms = u?.terms ?? { perWin: 0.25, cap: 20 }
  const p = u?.preview

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(1100px 560px at 14% -8%, rgba(52,211,153,.10), transparent 55%), radial-gradient(1000px 520px at 90% 0%, rgba(167,139,250,.14), transparent 52%), #070b14', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '28px 22px 90px' }}>
        <Link href="/" style={{ color: MUTED, textDecoration: 'none', fontSize: 14, display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <ArrowLeft size={14} /> YN Finance
        </Link>

        {activated && (
          <div style={{ ...glass, marginTop: 20, padding: '16px 18px', borderColor: `${GREEN}55`, background: `${GREEN}12` }}>
            <div style={{ fontWeight: 700, color: GREEN }}>You&apos;re in. ✅ Card saved — $0 charged today.</div>
            <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>You&apos;ll only be billed at month-end for the calls that actually hit, never more than ${terms.cap}.</div>
          </div>
        )}

        <div style={{ marginTop: 26, display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, letterSpacing: 1.4, textTransform: 'uppercase', color: MUTED }}>
          <Zap size={14} color={GREEN} /> A pricing model only an honest AI can offer
        </div>
        <h1 style={{ fontSize: 'clamp(34px,6vw,58px)', fontWeight: 800, letterSpacing: -1.8, margin: '10px 0 0', lineHeight: 1.04 }}>
          You only pay when the{' '}
          <span style={{ background: `linear-gradient(90deg, ${GREEN}, ${CYAN})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>AI is right.</span>
        </h1>
        <p style={{ marginTop: 14, fontSize: 17, color: MUTED, maxWidth: 560, lineHeight: 1.6 }}>
          No flat subscription. Every call BrainStock makes is graded against real prices.
          Winners cost <b style={{ color: '#fff' }}>${terms.perWin.toFixed(2)}</b> each. Wrong calls cost you <b style={{ color: GREEN }}>nothing</b>.
          And you&apos;ll never pay more than <b style={{ color: '#fff' }}>${terms.cap}/month</b> — no matter how hot it runs.
        </p>

        {/* LIVE PROOF from the real track record */}
        {p && u?.ready && (
          <div style={{ ...glass, marginTop: 28, padding: 24, borderColor: `${CYAN}33` }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED }}>The receipts · last {p.windowDays} days</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginTop: 14 }} className="pr-resp">
              <Stat label="Calls graded" value={String(p.graded)} color="#e7ecf5" />
              <Stat label="Winners" value={String(p.wins)} color={GREEN} />
              <Stat label="Win rate" value={`${p.winRate}%`} color={p.winRate >= 50 ? GREEN : RED} />
            </div>
            <div style={{ marginTop: 16, padding: '16px 18px', borderRadius: 14, background: `${GREEN}10`, border: `1px solid ${GREEN}33` }}>
              <div style={{ fontSize: 14, color: MUTED }}>If you&apos;d been on this plan, the last 30 days would have cost you</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: GREEN, letterSpacing: -1, marginTop: 2 }}>
                ${p.youWouldPay.toFixed(2)}{p.cappedOut && <span style={{ fontSize: 14, color: MUTED, fontWeight: 600 }}> — capped</span>}
              </div>
              <div style={{ fontSize: 13, color: MUTED, marginTop: 4 }}>
                vs a typical <span style={{ textDecoration: 'line-through' }}>$49/mo</span> research subscription you pay even when the AI is cold.
              </div>
            </div>
          </div>
        )}

        {/* HOW IT WORKS */}
        <div style={{ ...glass, marginTop: 16, padding: 24 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              ['Save your card — $0 today.', 'No charge to start. You just authorize future month-end billing.'],
              [`Follow the AI's graded calls all month.`, `Every Bull Board call resolves against real prices five trading days later.`],
              [`At month-end, pay $${terms.perWin.toFixed(2)} per winner — capped at $${terms.cap}.`, `Misses are free. A cold month costs you less, automatically.`],
            ].map(([t, d], i) => (
              <div key={i} style={{ display: 'flex', gap: 12 }}>
                <div style={{ flexShrink: 0, width: 26, height: 26, borderRadius: 8, background: `${CYAN}1f`, border: `1px solid ${CYAN}55`, color: CYAN, display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 13 }}>{i + 1}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{t}</div>
                  <div style={{ fontSize: 13.5, color: MUTED, marginTop: 2, lineHeight: 1.5 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div style={{ ...glass, marginTop: 16, padding: 24, borderColor: `${GREEN}44`, boxShadow: `0 0 50px ${GREEN}14` }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@email.com"
              style={{ flex: '1 1 220px', background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '13px 15px', color: '#fff', fontSize: 15, outline: 'none' }}
            />
            <button
              onClick={start}
              disabled={loading}
              style={{ flex: '0 0 auto', border: 'none', borderRadius: 12, padding: '13px 24px', fontSize: 15, fontWeight: 800, cursor: loading ? 'wait' : 'pointer', background: `linear-gradient(135deg, ${GREEN}, ${CYAN})`, color: '#05221a' }}
            >
              {loading ? 'Opening…' : 'Save card · pay $0 now'}
            </button>
          </div>
          {note && <div style={{ marginTop: 12, fontSize: 13, color: '#ffd9a8' }}>{note}</div>}
          <div style={{ marginTop: 14, display: 'flex', gap: 18, flexWrap: 'wrap', fontSize: 12.5, color: MUTED }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><Check size={14} color={GREEN} /> Cancel anytime</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><ShieldCheck size={14} color={GREEN} /> Card secured by Stripe</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><TrendingUp size={14} color={GREEN} /> Capped at ${terms.cap}/mo, always</span>
          </div>
        </div>

        <p style={{ marginTop: 22, fontSize: 12, color: MUTED, lineHeight: 1.6 }}>
          A &quot;winner&quot; is a Bull Board call whose close five trading days later is above its posting price, as shown on the public{' '}
          <Link href="/brainstock/track-record" style={{ color: CYAN }}>track record</Link>. Billed once per ~monthly cycle. Educational tool — not financial advice. Cancel and your card is removed; you&apos;re only billed for winners already graded.
        </p>
      </div>
      <style>{`@media (max-width:560px){ .pr-resp{ grid-template-columns:1fr !important } }`}</style>
    </div>
  )
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ ...glass, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 26, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  )
}

export default function Pricing() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#070b14' }} />}>
      <PricingInner />
    </Suspense>
  )
}
