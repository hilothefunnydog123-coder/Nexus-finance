'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface SubStatus { active: boolean; status?: string; cancelAtPeriodEnd?: boolean; currentPeriodEnd?: string; demo?: boolean }

export default function ManagePage() {
  const [sub, setSub]       = useState<SubStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)
  const [error, setError]   = useState('')

  useEffect(() => {
    fetch('/api/stripe/subscription/check')
      .then(r => r.json())
      .then(d => setSub(d))
      .catch(() => setSub({ active: false }))
      .finally(() => setLoading(false))
  }, [])

  async function openPortal() {
    setPortalLoading(true); setError('')
    try {
      const r = await fetch('/api/stripe/subscription/portal', { method: 'POST' })
      const d = await r.json()
      if (d.demo) { setError('Stripe not configured — portal unavailable in demo mode.'); setPortalLoading(false); return }
      if (d.url) window.location.href = d.url
      else { setError(d.error ?? 'Could not open portal'); setPortalLoading(false) }
    } catch { setError('Network error'); setPortalLoading(false) }
  }

  const C = { bg: '#03080d', surface: '#070f17', border: '#0f2030', text: '#dce8f0', sub: '#6a90a8', bull: '#00c896', bear: '#e84545', gold: '#f0b429' }

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{'*{box-sizing:border-box;margin:0;padding:0}a{color:inherit;text-decoration:none}'}</style>

      <div style={{ borderBottom: `1px solid ${C.border}`, padding: '0 24px', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/daily" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 22, height: 22, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>⚡</div>
          <span style={{ fontWeight: 800, fontSize: 13 }}>YN Daily Intelligence</span>
        </Link>
        <Link href="/daily" style={{ fontSize: 12, color: C.sub }}>← Back to Dashboard</Link>
      </div>

      <div style={{ maxWidth: 560, margin: '60px auto', padding: '0 24px' }}>
        <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.16em', color: C.sub, marginBottom: 16 }}>SUBSCRIPTION</div>
        <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>Manage Your Plan</h1>
        <p style={{ color: C.sub, fontSize: 14, marginBottom: 36 }}>View billing, update payment method, or cancel anytime.</p>

        {loading && <div style={{ color: C.sub, fontSize: 14 }}>Checking subscription status...</div>}

        {!loading && sub && (
          <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, padding: '24px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>YN Daily Intelligence</div>
                <div style={{ color: C.sub, fontSize: 13, marginTop: 2 }}>$11.99 / month</div>
              </div>
              <div style={{
                background: sub.active ? `${C.bull}15` : `${C.bear}15`,
                color: sub.active ? C.bull : C.bear,
                border: `1px solid ${sub.active ? C.bull : C.bear}35`,
                borderRadius: 5, padding: '4px 12px', fontSize: 11, fontWeight: 800, letterSpacing: '.08em'
              }}>
                {sub.demo ? 'DEMO' : sub.active ? 'ACTIVE' : (sub.status ?? 'INACTIVE').toUpperCase()}
              </div>
            </div>

            {sub.currentPeriodEnd && (
              <div style={{ fontSize: 13, color: C.sub, marginBottom: 16 }}>
                {sub.cancelAtPeriodEnd ? 'Cancels on' : 'Renews on'}{' '}
                <strong style={{ color: C.text }}>{new Date(sub.currentPeriodEnd).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</strong>
              </div>
            )}

            {sub.cancelAtPeriodEnd && (
              <div style={{ background: `${C.gold}12`, border: `1px solid ${C.gold}30`, borderRadius: 6, padding: '10px 14px', fontSize: 13, color: '#f5d87a', marginBottom: 16 }}>
                Your plan is scheduled to cancel. Use the portal to reactivate.
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {sub.active && (
                <button className="btn" onClick={openPortal} disabled={portalLoading}
                  style={{ background: C.bull, color: '#03080d', padding: '11px 24px', borderRadius: 6, fontWeight: 700, fontSize: 14, cursor: portalLoading ? 'not-allowed' : 'pointer', opacity: portalLoading ? .6 : 1, border: 'none' }}>
                  {portalLoading ? 'Opening...' : 'Manage Billing →'}
                </button>
              )}
              <Link href="/daily" style={{ background: '#0b1822', color: C.sub, padding: '11px 20px', borderRadius: 6, fontWeight: 600, fontSize: 14, border: `1px solid ${C.border}`, display: 'inline-block' }}>
                Back to Dashboard
              </Link>
            </div>

            {error && <p style={{ color: C.bear, fontSize: 13, marginTop: 14 }}>{error}</p>}
          </div>
        )}

        {!loading && (!sub || !sub.active) && !sub?.demo && (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ color: C.sub, fontSize: 14, marginBottom: 20 }}>No active subscription found.</p>
            <Link href="/daily/subscribe" style={{ background: `linear-gradient(135deg,${C.gold},#d97706)`, color: '#03080d', padding: '12px 28px', borderRadius: 6, fontWeight: 800, fontSize: 14 }}>
              Subscribe · $11.99/month
            </Link>
          </div>
        )}

        <div style={{ marginTop: 32, padding: '16px 20px', background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: '.14em', color: C.sub, marginBottom: 10 }}>WHAT'S INCLUDED</div>
          {['Morning Brief + daily bias analysis','Expected moves for ES, NQ, YM, RTY','Macro dashboard (gold, oil, dollar, bonds)','Institutional pulse + Wall Street consensus','Daily trading playbook with 3 trade ideas','Economic calendar with impact ratings','Live news feed (9 top stories)'].map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, padding: '6px 0', borderBottom: i < 6 ? `1px solid ${C.border}` : 'none' }}>
              <span style={{ color: C.bull, fontSize: 11 }}>✓</span>
              <span style={{ fontSize: 13, color: C.sub }}>{f}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
