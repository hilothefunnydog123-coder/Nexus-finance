import Link from 'next/link'
import { ShieldCheck, ShieldX, Zap, Award } from 'lucide-react'
import { createClient } from '@supabase/supabase-js'

interface Props { params: Promise<{ id: string }> }

async function getChallenge(id: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key || url === 'your_supabase_url_here') return null
  try {
    const sb = createClient(url, key)
    const { data } = await sb.from('challenges').select('*').eq('id', id).single()
    return data
  } catch { return null }
}

export default async function VerifyPage({ params }: Props) {
  const { id } = await params
  const challenge = await getChallenge(id)
  const isPassed = challenge && ['passed','payout_requested','paid'].includes(challenge.status)
  const tierColor = challenge?.tier === 'elite' ? '#ffa502' : challenge?.tier === 'pro' ? '#00d4aa' : '#7f93b5'

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4' }}>
      <nav style={{ borderBottom: '1px solid #1a2d4a', padding: '0 24px' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>YN Finance</span>
          </Link>
          <span style={{ color: '#1a2d4a' }}>/</span>
          <span style={{ color: '#4a5e7a', fontSize: 13 }}>Certificate Verification</span>
        </div>
      </nav>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '60px 24px', textAlign: 'center' }}>
        {!challenge ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff475720', border: '2px solid #ff475740', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldX size={28} color="#ff4757" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ff4757', marginBottom: 12 }}>Certificate Not Found</h1>
            <p style={{ color: '#7f93b5', fontSize: 14, marginBottom: 8 }}>
              Certificate ID <code style={{ color: '#cdd6f4', background: '#071220', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>YNC-{id.slice(0,8).toUpperCase()}</code> could not be verified.
            </p>
            <p style={{ color: '#4a5e7a', fontSize: 13 }}>This certificate may be from a demo session or the ID may be incorrect.</p>
          </>
        ) : !isPassed ? (
          <>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ff475720', border: '2px solid #ff475740', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldX size={28} color="#ff4757" />
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#ff4757', marginBottom: 12 }}>Challenge Not Passed</h1>
            <p style={{ color: '#7f93b5', fontSize: 14 }}>This challenge exists but has not been passed yet.</p>
          </>
        ) : (
          <>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: `${tierColor}20`, border: `2px solid ${tierColor}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <ShieldCheck size={36} color={tierColor} />
            </div>
            <div style={{ display: 'inline-block', background: `${tierColor}20`, border: `1px solid ${tierColor}40`, borderRadius: 100, padding: '4px 16px', marginBottom: 16, fontSize: 10, color: tierColor, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              ✓ Verified Certificate
            </div>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Challenge Passed</h1>
            <p style={{ color: '#7f93b5', marginBottom: 32, fontSize: 14 }}>This certificate has been cryptographically verified against YN Finance records.</p>

            <div style={{ background: '#071220', border: `1px solid ${tierColor}30`, borderRadius: 16, padding: 28, textAlign: 'left', marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <Award size={20} color={tierColor} />
                <span style={{ fontSize: 16, fontWeight: 800, color: '#cdd6f4' }}>YN Capital {challenge.tier.charAt(0).toUpperCase() + challenge.tier.slice(1)} Challenge</span>
              </div>
              {[
                ['Trader', challenge.username || challenge.email],
                ['Account Size', `$${challenge.account_size?.toLocaleString()}`],
                ['Final P&L', `+${challenge.current_pnl_pct?.toFixed(2)}%`],
                ['Certificate ID', `YNC-${id.slice(0,8).toUpperCase()}`],
                ['Date Passed', challenge.passed_at ? new Date(challenge.passed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'],
                ['Status', challenge.status === 'payout_requested' ? 'Payout Requested' : challenge.status === 'paid' ? 'Paid Out' : 'Passed'],
              ].map(([l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #1a2d4a', fontSize: 13 }}>
                  <span style={{ color: '#4a5e7a' }}>{l}</span>
                  <span style={{ color: '#cdd6f4', fontFamily: l === 'Certificate ID' ? 'monospace' : 'inherit', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: '#4a5e7a' }}>
              Verified by YN Finance · ynfinance.org · Simulated trading environment
            </p>
          </>
        )}

        <div style={{ marginTop: 32 }}>
          <Link href="/" style={{ color: '#00d4aa', fontSize: 13, textDecoration: 'none' }}>← Back to YN Finance</Link>
        </div>
      </div>
    </div>
  )
}
