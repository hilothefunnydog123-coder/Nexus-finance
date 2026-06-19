import Link from 'next/link'
import { PaperPage, PageHero, Section, Reveal, INK, MUTE, LINE, ACCENT } from '@/components/cinematic/Paper'

export const metadata = { title: 'Privacy Policy — YN Finance', description: 'How YN Finance collects, uses, and protects your data.' }

const SECTIONS = [
  { title: '1. Information We Collect', content: `We collect information you provide when creating an account (email address, password), information generated through your use of the platform (trading history, challenge progress, paper trading performance, messages posted in Trade-Room), and technical data (browser type, IP address, usage patterns). We do not collect real financial information, bank details, or payment card data beyond what Stripe processes on our behalf.` },
  { title: '2. How We Use Your Information', content: `Your information is used to: operate and maintain your account; track prop firm challenge progress and award certificates; send transactional emails (challenge confirmations, pass notifications, payout requests) via Resend; display your performance on community leaderboards (only if you participate); improve the platform through anonymized analytics. We do not sell your personal data to third parties.` },
  { title: '3. Data Storage & Security', content: `Account data is stored securely on Supabase (PostgreSQL) with row-level security. All data is encrypted in transit (HTTPS/TLS). Paper trading data and challenge progress are tied to your authenticated account. We implement industry-standard security measures but cannot guarantee absolute security.` },
  { title: '4. Third-Party Services', content: `We use the following third-party services: Supabase (database and authentication), Resend (transactional email), Stripe (payment processing for challenge fees), TradingView (chart widgets — subject to TradingView's privacy policy), Finnhub (market data). Each provider has their own privacy policy and data practices.` },
  { title: '5. Cookies & Local Storage', content: `We use browser localStorage to store your session, trading preferences, and challenge state. No advertising cookies are used. Supabase uses cookies for authentication session management. You can clear cookies at any time through your browser settings, which will log you out of the platform.` },
  { title: '6. Your Rights', content: `You have the right to access your personal data, request corrections, request deletion of your account and associated data, and export your trading history. To exercise these rights, email support@ynfinance.org. Account deletion removes all personal data within 30 days, except where retention is required by law.` },
  { title: "7. Children's Privacy", content: `YN Finance is not intended for users under the age of 18. We do not knowingly collect personal information from children. If we become aware that a child has provided personal data, we will delete it immediately.` },
  { title: '8. Changes to This Policy', content: `We may update this Privacy Policy periodically. Changes will be posted on this page with an updated date. Continued use of YN Finance after changes constitutes acceptance of the updated policy.` },
  { title: '9. Contact', content: `Questions about this Privacy Policy? Contact us at privacy@ynfinance.org or through the Trade-Room #general channel.` },
]

export default function PrivacyPage() {
  return (
    <PaperPage>
      <PageHero eyebrow="// LEGAL · LAST UPDATED MAY 2, 2026" title="Privacy Policy" accentWords={[1]} sub="YN Finance is committed to protecting your privacy. This explains how we collect, use, and protect your information when you use the platform at ynfinance.org." />
      <Section style={{ paddingTop: 0 }}>
        <div style={{ maxWidth: 820 }}>
          {SECTIONS.map((s) => (
            <Reveal key={s.title}>
              <div style={{ padding: '28px 0', borderTop: `1px solid ${LINE}` }}>
                <h2 className="disp" style={{ fontSize: 'clamp(1.2rem,2.2vw,1.6rem)', color: INK, marginBottom: 12 }}>{s.title}</h2>
                <p style={{ fontSize: 15.5, color: MUTE, lineHeight: 1.8 }}>{s.content}</p>
              </div>
            </Reveal>
          ))}
          <div style={{ marginTop: 36, display: 'flex', gap: 20, fontFamily: 'var(--font-mono)', fontSize: 13 }}>
            <Link href="/" className="lk" style={{ color: ACCENT, textDecoration: 'none' }}>← HOME</Link>
            <Link href="/terms" className="lk" style={{ color: INK, textDecoration: 'none' }}>TERMS OF SERVICE →</Link>
          </div>
        </div>
      </Section>
    </PaperPage>
  )
}
