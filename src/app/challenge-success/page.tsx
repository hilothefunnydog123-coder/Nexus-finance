'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, ArrowRight, Zap, Trophy } from 'lucide-react'
import Link from 'next/link'
import { Suspense } from 'react'

function SuccessContent() {
  const params = useSearchParams()
  const tier = params.get('tier') || 'pro'
  const [countdown, setCountdown] = useState(5)

  const tierNames: Record<string, string> = { starter: 'Starter', pro: 'Pro', elite: 'Elite' }
  const tierSizes: Record<string, string> = { starter: '$25,000', pro: '$100,000', elite: '$200,000' }
  const tierColors: Record<string, string> = { starter: '#7f93b5', pro: '#00d4aa', elite: '#ffa502' }
  const color = tierColors[tier] || '#00d4aa'

  useEffect(() => {
    document.title = 'Challenge Activated — YN Capital'
  }, [])

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) { clearInterval(t); window.location.href = '/app' }
        return c - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: '0 24px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={16} color="#040c14" fill="#040c14" />
          </div>
          <span style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>YN Capital</span>
        </div>

        {/* Success icon */}
        <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${color}20`, border: `2px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
          <CheckCircle size={36} color={color} />
        </div>

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 100, padding: '6px 16px', marginBottom: 20 }}>
          <Trophy size={12} color={color} />
          <span style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Payment Confirmed</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12, lineHeight: 1.1 }}>
          Your {tierNames[tier]} Challenge<br />is <span style={{ color }}>Active</span>
        </h1>

        <p style={{ fontSize: 14, color: '#7f93b5', marginBottom: 32, lineHeight: 1.6 }}>
          Your {tierSizes[tier]} simulated account is ready. Check your email for challenge rules and your account dashboard.
        </p>

        <div style={{ background: '#071220', border: `1px solid ${color}30`, borderRadius: 16, padding: 24, marginBottom: 32, textAlign: 'left' }}>
          {[
            ['Account Size', tierSizes[tier]],
            ['Challenge Tier', `${tierNames[tier]} Evaluation`],
            ['Status', '✓ Active — Clock is running'],
            ['Confirmation', 'Sent to your email'],
          ].map(([l, v]) => (
            <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a2d4a', fontSize: 13 }}>
              <span style={{ color: '#4a5e7a' }}>{l}</span>
              <span style={{ color: '#cdd6f4', fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        <Link href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: color, color: '#040c14', fontWeight: 900,
          textDecoration: 'none', padding: '16px 40px', borderRadius: 12, fontSize: 15,
        }}>
          Open Trading Terminal <ArrowRight size={18} />
        </Link>

        <p style={{ fontSize: 11, color: '#4a5e7a', marginTop: 16 }}>
          Redirecting automatically in {countdown}s...
        </p>
      </div>
    </div>
  )
}

export default function ChallengeSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  )
}
