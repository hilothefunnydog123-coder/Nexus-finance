import Link from 'next/link'
import { Zap } from 'lucide-react'

export const metadata = { title: 'Privacy Policy — YN Finance', description: 'How YN Finance collects, uses, and protects your data.' }

const SECTIONS = [
  {
    title: '1. Information We Collect',
    content: `We collect information you provide when creating an account (email address, password), information generated through your use of the platform (trading history, challenge progress, paper trading performance, messages posted in Trade-Room), and technical data (browser type, IP address, usage patterns). We do not collect real financial information, bank details, or payment card data beyond what Stripe processes on our behalf.`,
  },
  {
    title: '2. How We Use Your Information',
    content: `Your information is used to: operate and maintain your account; track prop firm challenge progress and award certificates; send transactional emails (challenge confirmations, pass notifications, payout requests) via Resend; display your performance on community leaderboards (only if you participate); improve the platform through anonymized analytics. We do not sell your personal data to third parties.`,
  },
  {
    title: '3. Data Storage & Security',
    content: `Account data is stored securely on Supabase (PostgreSQL) with row-level security. All data is encrypted in transit (HTTPS/TLS). Paper trading data and challenge progress are tied to your authenticated account. We implement industry-standard security measures but cannot guarantee absolute security.`,
  },
  {
    title: '4. Third-Party Services',
    content: `We use the following third-party services: Supabase (database and authentication), Resend (transactional email), Stripe (payment processing for challenge fees), TradingView (chart widgets — subject to TradingView's privacy policy), Finnhub (market data). Each provider has their own privacy policy and data practices.`,
  },
  {
    title: '5. Cookies & Local Storage',
    content: `We use browser localStorage to store your session, trading preferences, and challenge state. No advertising cookies are used. Supabase uses cookies for authentication session management. You can clear cookies at any time through your browser settings, which will log you out of the platform.`,
  },
  {
    title: '6. Your Rights',
    content: `You have the right to access your personal data, request corrections, request deletion of your account and associated data, and export your trading history. To exercise these rights, email support@ynfinance.org. Account deletion removes all personal data within 30 days, except where retention is required by law.`,
  },
  {
    title: '7. Children\'s Privacy',
    content: `YN Finance is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided personal data, we will delete it immediately.`,
  },
  {
    title: '8. Changes to This Policy',
    content: `We may update this Privacy Policy periodically. Changes will be posted on this page with an updated date. Continued use of YN Finance after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '9. Contact',
    content: `Questions about this Privacy Policy? Contact us at privacy@ynfinance.org or through the Trade-Room #general channel.`,
  },
]

export default function PrivacyPage() {
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
          <span style={{ color: '#4a5e7a', fontSize: 13 }}>Privacy Policy</span>
        </div>
      </nav>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '60px 24px' }}>
        <h1 style={{ fontSize: 36, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: '#4a5e7a', fontSize: 13, marginBottom: 48 }}>Last updated: May 2, 2026</p>

        <p style={{ color: '#7f93b5', fontSize: 14, lineHeight: 1.8, marginBottom: 40 }}>
          YN Finance ("we," "us," or "our") is committed to protecting your privacy. This policy explains how we collect,
          use, and protect your information when you use the YN Finance trading platform at ynfinance.org.
          <strong style={{ color: '#ffa502' }}> YN Finance is a simulated trading platform — no real money is traded or held.</strong>
        </p>

        {SECTIONS.map(s => (
          <div key={s.title} style={{ marginBottom: 32, paddingBottom: 32, borderBottom: '1px solid #1a2d4a' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#cdd6f4', marginBottom: 12 }}>{s.title}</h2>
            <p style={{ color: '#7f93b5', fontSize: 13, lineHeight: 1.8 }}>{s.content}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
          <Link href="/" style={{ color: '#00d4aa', fontSize: 13, textDecoration: 'none' }}>← Back to Home</Link>
          <Link href="/terms" style={{ color: '#4a5e7a', fontSize: 13, textDecoration: 'none' }}>Terms of Service →</Link>
        </div>
      </div>
    </div>
  )
}
