import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Terms of Service — YN Finance', description: 'Terms governing use of the YN Finance simulated trading platform and YN Capital prop firm challenges.' }

const SECTIONS = [
  { title: '1. Acceptance of Terms', content: 'By accessing or using YN Finance at ynfinance.org, you agree to be bound by these Terms of Service. If you do not agree, do not use the platform. YN Finance is a simulated trading environment — no real financial transactions occur on the platform itself.' },
  { title: '2. Platform Description', content: 'YN Finance provides a simulated professional trading terminal including paper trading with virtual funds, community features (Trade-Room channels, leaderboard, trade ideas), YN Capital prop firm simulation with virtual funded accounts, educational content and market data. The platform does not provide financial advice. All trading is simulated with virtual money. Past performance in the simulator does not guarantee future real trading results.' },
  { title: '3. Eligibility', content: 'You must be at least 18 years old to use YN Finance. By using the platform you represent that you meet this requirement. The platform is not available to residents of jurisdictions where the service would violate local law.' },
  { title: '4. YN Capital Prop Firm Simulation', content: 'YN Capital is a simulated prop trading challenge, not a real funded account. Challenge fees (when applicable) grant access to a structured simulation with prop firm rules. Certificates issued upon passing are evidence of simulated trading performance. Payouts are simulated — real monetary payouts via Rise are planned for commercial launch and are subject to separate agreements. YN Finance makes no guarantee of real financial gain.' },
  { title: '5. Challenge Fees & Payments', content: 'Challenge fees are processed via Stripe. By purchasing a challenge, you authorize Stripe to charge your payment method. Fees are non-refundable after you have made any trades during the challenge period. Refunds within 14 days of purchase (before any trading activity) may be requested at support@ynfinance.org. Stripe\'s terms of service also apply to payment processing.' },
  { title: '6. Community Guidelines', content: 'The Trade-Room and community features are subject to conduct rules: No spam, manipulation, or market misinformation. No harassment, discrimination, or abusive language. No sharing of others\' personal information. No promotion of illegal financial activity. Violations may result in account suspension or termination without refund of any fees.' },
  { title: '7. Intellectual Property', content: 'All platform content, branding, design, and code are owned by YN Finance. TradingView charts are provided under TradingView\'s widget terms. Market data is provided by Finnhub. You may not reproduce, distribute, or create derivative works from YN Finance content without written permission.' },
  { title: '8. Disclaimers', content: 'YN Finance is provided "as is." We make no warranties about uptime, data accuracy, or fitness for any particular purpose. Market data may be delayed. Simulated trading results do not reflect real market conditions, slippage, or execution quality. YN Finance is not a registered broker-dealer, investment advisor, or financial institution.' },
  { title: '9. Limitation of Liability', content: 'To the maximum extent permitted by law, YN Finance shall not be liable for any indirect, incidental, or consequential damages arising from use of the platform. Our total liability for any claim shall not exceed the amount you paid for challenge fees in the 12 months preceding the claim.' },
  { title: '10. Termination', content: 'We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account at any time by contacting support@ynfinance.org. Termination does not entitle you to a refund of challenge fees unless within the 14-day refund window.' },
  { title: '11. Governing Law', content: 'These Terms are governed by the laws of the United States. Any disputes shall be resolved through binding arbitration under AAA rules rather than in court, except for claims eligible for small claims court.' },
  { title: '12. Changes to Terms', content: 'We may update these Terms periodically. Continued use of YN Finance after changes constitutes acceptance. Material changes will be communicated via email to registered users.' },
]

export default function TermsPage() {
  return (
    <div style={{ background: '#040c14', color: '#cdd6f4', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <nav style={{ borderBottom: '1px solid #1a2d4a', padding: '0 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>YN Finance</span>
          </Link>
          <span style={{ color: '#1a2d4a' }}>/</span>
          <span style={{ color: '#4a5e7a', fontSize: 13 }}>Terms of Service</span>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: '#4a5e7a', fontSize: 13, marginBottom: 48 }}>Last updated: May 2, 2026</p>

        <div style={{ background: '#ffa50210', border: '1px solid #ffa50230', borderRadius: 8, padding: '16px 20px', marginBottom: 40 }}>
          <p style={{ color: '#ffa502', fontSize: 13, margin: 0 }}>
            <strong>Important:</strong> YN Finance is a simulated paper trading platform. No real money is traded.
            Challenge fees are for access to the simulation, not investment contracts.
          </p>
        </div>

        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #1a2d4a' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#cdd6f4', marginBottom: 12 }}>{s.title}</h2>
            <p style={{ color: '#7f93b5', fontSize: 13, lineHeight: 1.8 }}>{s.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
          <Link href="/" style={{ color: '#00d4aa', fontSize: 13, textDecoration: 'none' }}>← Back to Home</Link>
          <Link href="/privacy" style={{ color: '#4a5e7a', fontSize: 13, textDecoration: 'none' }}>Privacy Policy →</Link>
        </div>
      </div>
    </div>
  )
}
