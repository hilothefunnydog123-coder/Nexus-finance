'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Zap, Gift, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import AdsterraBanner from '@/components/ads/AdsterraBanner'

export default function ReferralPage() {
  const params = useParams()
  const code = params.code as string
  const [referrer, setReferrer] = useState<string | null>(null)

  useEffect(() => {
    document.title = "You've been invited to YN Capital"
  }, [])

  useEffect(() => {
    if (code) {
      localStorage.setItem('yn_referral_code', code)
      // Decode who referred them (code starts with username_xxxx)
      const parts = code.split('_')
      if (parts.length >= 2) setReferrer(parts.slice(0, -1).join('_'))
    }
  }, [code])

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif' }}>
      <div style={{ maxWidth: 480, width: '100%', padding: '0 24px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={20} color="#040c14" fill="#040c14" />
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>YN Finance</span>
        </div>

        {/* Gift badge */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#ffa50215', border: '1px solid #ffa50240', borderRadius: 100, padding: '8px 20px', marginBottom: 24 }}>
          <Gift size={14} color="#ffa502" />
          <span style={{ fontSize: 12, color: '#ffa502', fontWeight: 700 }}>You've been invited</span>
        </div>

        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12, lineHeight: 1.1 }}>
          {referrer ? (
            <><span style={{ color: '#00d4aa' }}>{referrer}</span> invited you to<br />YN Capital</>
          ) : (
            <>You&apos;ve been invited to<br />YN Capital</>
          )}
        </h1>

        <p style={{ fontSize: 15, color: '#7f93b5', marginBottom: 8, lineHeight: 1.6 }}>
          The prop firm simulator used by serious traders to practice, get funded, and earn verified certificates.
        </p>

        <div style={{ background: '#ffa50210', border: '1px solid #ffa50230', borderRadius: 12, padding: '16px 20px', marginBottom: 32 }}>
          <div style={{ fontSize: 13, color: '#ffa502', fontWeight: 700, marginBottom: 4 }}>Referral Bonus</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>$20 off your first challenge</div>
          <div style={{ fontSize: 11, color: '#7f93b5', marginTop: 4 }}>Applied automatically at checkout · Code: <code style={{ color: '#ffa502', fontSize: 11 }}>{code}</code></div>
        </div>

        {/* How it works */}
        <div style={{ textAlign: 'left', marginBottom: 32 }}>
          {[
            ['Create your free account', 'Instant access — no credit card required'],
            ['Practice with real market data', 'TradingView charts, paper trading, community'],
            ['Pass the prop challenge', 'Earn your certificate. Get referred to funded accounts.'],
          ].map(([title, sub], i) => (
            <div key={i} style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: '#00d4aa20', color: '#00d4aa', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, flexShrink: 0 }}>
                {i + 1}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4' }}>{title}</div>
                <div style={{ fontSize: 11, color: '#4a5e7a' }}>{sub}</div>
              </div>
            </div>
          ))}
        </div>

        <Link href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: 'linear-gradient(135deg, #00d4aa, #1e90ff)',
          color: '#040c14', fontWeight: 900, textDecoration: 'none',
          padding: '16px 40px', borderRadius: 12, fontSize: 15,
          boxShadow: '0 0 40px rgba(0,212,170,0.4)',
        }}>
          Start Trading Free <ArrowRight size={18} />
        </Link>

        <p style={{ fontSize: 11, color: '#4a5e7a', marginTop: 16 }}>
          Discount applies when you start your first challenge. No expiry.
        </p>

        <AdsterraBanner className="mt-8" />
      </div>
    </div>
  )
}
