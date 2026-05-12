'use client'

import Link from 'next/link'
import { Trophy, DollarSign, Clock, Shield, AlertTriangle, Monitor, Heart } from 'lucide-react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG = '#09090b'
const SU = '#18181b'
const BO = '#27272a'
const G  = '#22c55e'
const GD = '#eab308'
const TE = '#fafafa'
const MT = '#a1a1aa'
const DM = '#71717a'

const PRIZE_WEIGHTS = [0.30, 0.18, 0.12, 0.08, 0.06, 0.03, 0.03, 0.03, 0.03, 0.03]

// Example: 500 players × $10
const EXAMPLE_ENTRIES = 500
const EXAMPLE_FEE = 10
const EXAMPLE_GROSS = EXAMPLE_ENTRIES * EXAMPLE_FEE          // 5000
const EXAMPLE_POOL  = Math.floor(EXAMPLE_GROSS * 0.88)       // 4400
const EXAMPLE_RAKE  = EXAMPLE_GROSS - EXAMPLE_POOL           // 600

const EXAMPLE_ROWS = PRIZE_WEIGHTS.map((w, i) => ({
  rank:    i + 1,
  pct:     Math.round(w * 100),
  dollar:  Math.floor(EXAMPLE_POOL * w),
  medal:   i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '',
}))

// ─── SECTION WRAPPER ──────────────────────────────────────────────────────────
function Section({ id, icon, title, children }: {
  id?: string
  icon: React.ReactNode
  title: string
  children: React.ReactNode
}) {
  return (
    <section id={id} style={{ marginBottom: 64 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 9, background: `${G}18`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          {icon}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 900, color: TE, letterSpacing: -0.4, margin: 0 }}>
          {title}
        </h2>
      </div>
      {children}
    </section>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: SU, border: `1px solid ${BO}`, borderRadius: 11, padding: '20px 24px', ...style,
    }}>
      {children}
    </div>
  )
}

function InfoRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
      padding: '10px 0', borderBottom: `1px solid ${BO}`,
    }}>
      <span style={{ fontSize: 14, color: MT }}>{label}</span>
      <span style={{ fontSize: 14, fontWeight: 700, color: valueColor ?? TE, fontFamily: 'monospace' }}>
        {value}
      </span>
    </div>
  )
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function HowItWorksPage() {
  return (
    <div style={{ background: BG, color: TE, fontFamily: 'Inter,system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        .w { max-width:860px; margin:0 auto; padding:0 24px; }
        .toc-link { display:block; font-size:14px; color:${DM}; text-decoration:none; padding:6px 0; border-left:2px solid ${BO}; padding-left:14px; transition:color 0.13s,border-color 0.13s; }
        .toc-link:hover { color:${TE}; border-color:${G}; }
        table { border-collapse:collapse; width:100%; }
        th,td { padding:10px 14px; text-align:left; border-bottom:1px solid ${BO}; font-size:14px; }
        th { font-size:11px; font-weight:700; color:${DM}; text-transform:uppercase; letter-spacing:0.08em; background:${BO}; }
        td { color:${MT}; }
        td.num { font-family:monospace; font-weight:700; }
        tr:last-child td { border-bottom:none; }
        @media(max-width:640px) { .sm-hide { display:none !important; } }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{
        borderBottom: `1px solid #18181b`, position: 'sticky', top: 0, zIndex: 100,
        backdropFilter: 'blur(20px)', background: 'rgba(9,9,11,0.94)',
      }}>
        <div className="w" style={{ height: 56, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/arena" style={{
            textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: 7, background: G,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Trophy size={13} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: TE, letterSpacing: -0.3 }}>YN Arena</span>
          </Link>
          <span style={{ fontSize: 12, color: DM }}>/ How It Works</span>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/arena" style={{ fontSize: 12, color: DM, textDecoration: 'none',
              padding: '5px 12px', border: `1px solid ${BO}`, borderRadius: 6 }}>
              ← Back to Arena
            </Link>
          </div>
        </div>
      </nav>

      <div className="w" style={{ paddingTop: 60, paddingBottom: 80 }}>

        {/* ── HERO ── */}
        <div style={{ marginBottom: 64, maxWidth: 700 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: `${G}10`, border: `1px solid ${G}25`,
            borderRadius: 100, padding: '5px 14px', fontSize: 12, color: G,
            fontWeight: 600, marginBottom: 22, letterSpacing: 0.2,
          }}>
            Full transparency · No fine print
          </div>

          <h1 style={{
            fontSize: 'clamp(30px,5vw,52px)', fontWeight: 900, color: TE,
            lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 20,
          }}>
            How YN Arena Works —<br />
            <span style={{ color: G }}>The Complete Guide</span>
          </h1>

          <p style={{ fontSize: 18, color: MT, lineHeight: 1.75, maxWidth: 600 }}>
            We explain every dollar.{' '}
            <span style={{ color: TE, fontWeight: 700 }}>12% rake. Fixed payouts. Real Stripe transfers. No surprises.</span>
          </p>
        </div>

        {/* ── TABLE OF CONTENTS ── */}
        <Card style={{ marginBottom: 64, maxWidth: 460 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: DM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
            On this page
          </div>
          {[
            ['#prize-model',         '1. The Prize Model'],
            ['#how-payouts-work',    '2. How Payouts Work'],
            ['#is-this-legal',       '3. Is This Legal?'],
            ['#simulated-account',   '4. The Simulated Account'],
            ['#responsible-gaming',  '5. Responsible Gaming'],
          ].map(([href, label]) => (
            <a key={href} href={href} className="toc-link">{label}</a>
          ))}
        </Card>

        {/* ── SECTION 1: PRIZE MODEL ── */}
        <Section id="prize-model" icon={<DollarSign size={17} color={G} />} title="The Prize Model">
          <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, marginBottom: 28, maxWidth: 680 }}>
            Every tournament runs on the same transparent math. Players pay an entry fee.
            <strong style={{ color: TE }}> 88% of collected fees form the prize pool.</strong> We retain 12% as
            platform rake. The prize pool is distributed by fixed percentage weights — not based on
            P&amp;L alone, but on your <em>rank</em> at close.
          </p>

          {/* Math callout */}
          <div style={{
            background: `${G}08`, border: `1px solid ${G}20`, borderRadius: 11,
            padding: '20px 24px', marginBottom: 28, display: 'flex', gap: 16,
            flexWrap: 'wrap', alignItems: 'center',
          }}>
            {[
              ['Entry fees collected', `$${(EXAMPLE_ENTRIES * EXAMPLE_FEE).toLocaleString()}`],
              ['−', '12% rake'],
              ['=', `$${EXAMPLE_POOL.toLocaleString()} prize pool`],
            ].map(([label, val], i) => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 12, color: DM }}>{label}</span>
                <span style={{ fontSize: i === 0 ? 26 : 20, fontWeight: 900, color: i === 2 ? G : TE, fontFamily: 'monospace', letterSpacing: -0.5 }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Worked example */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: MT, marginBottom: 10 }}>
              Worked example: {EXAMPLE_ENTRIES} players × ${EXAMPLE_FEE} = ${EXAMPLE_GROSS.toLocaleString()} gross · ${EXAMPLE_POOL.toLocaleString()} pool
            </div>
            <div style={{ border: `1px solid ${BO}`, borderRadius: 10, overflow: 'hidden' }}>
              <table>
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Pool %</th>
                    <th>Payout on ${EXAMPLE_POOL.toLocaleString()} pool</th>
                    <th className="sm-hide">Return on $10 entry</th>
                  </tr>
                </thead>
                <tbody>
                  {EXAMPLE_ROWS.map(row => (
                    <tr key={row.rank}>
                      <td>
                        <span style={{ marginRight: 6 }}>{row.medal}</span>
                        <span style={{ fontFamily: 'monospace', fontWeight: 700, color: row.rank <= 3 ? GD : TE }}>
                          #{row.rank}
                        </span>
                      </td>
                      <td className="num" style={{ color: MT }}>{row.pct}%</td>
                      <td className="num" style={{ color: G, fontSize: 15 }}>${row.dollar.toLocaleString()}</td>
                      <td className="num sm-hide" style={{ color: GD }}>
                        {row.dollar > 0 ? `×${(row.dollar / EXAMPLE_FEE).toFixed(1)}` : '—'}
                      </td>
                    </tr>
                  ))}
                  <tr>
                    <td colSpan={4} style={{ background: `${BO}60`, textAlign: 'center', fontSize: 12, color: DM, padding: '8px 14px' }}>
                      Ranks 11–top 20% of field: split remaining ~1% of pool equally
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <Card style={{ marginTop: 20 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 20 }}>ℹ️</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TE, marginBottom: 6 }}>
                  About our 12% rake
                </div>
                <p style={{ fontSize: 14, color: MT, lineHeight: 1.7 }}>
                  We take 12% of gross entry fees. Poker rooms typically take 10–15%, and major DFS
                  platforms charge up to 15%. <strong style={{ color: G }}>We're at or below industry average.</strong> The
                  rake covers Stripe processing fees (~2.9%), identity verification costs, server
                  infrastructure, and platform operations.
                </p>
              </div>
            </div>
          </Card>
        </Section>

        {/* ── SECTION 2: HOW PAYOUTS WORK ── */}
        <Section id="how-payouts-work" icon={<Clock size={17} color={G} />} title="How Payouts Work">
          <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, marginBottom: 28, maxWidth: 680 }}>
            Payouts are automated via Stripe. Here is the exact sequence of events after a tournament closes.
          </p>

          {/* Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 32 }}>
            {[
              { time: '4:00 PM ET',        event: 'Tournament closes',             detail: 'No new trades accepted. Positions are marked-to-market at the closing price.' },
              { time: '+30 minutes',        event: 'Final rankings calculated',     detail: 'P&L is tallied, ranks locked, prize amounts computed for each paid position.' },
              { time: '+1–2 hours',         event: 'Payout processing begins',      detail: 'Stripe initiates transfers to winners. Over $100 requires identity verification (Stripe Identity) — one-time, takes ~2 minutes.' },
              { time: 'Within 24 hours',    event: 'Funds in your account',         detail: 'Typical delivery. Bank transfers may take up to 3 business days depending on your institution.' },
              { time: 'Maximum 72 hours',   event: 'SLA guarantee',                 detail: 'If you have not received payment within 72 hours, email support@ynfinance.org.' },
            ].map((step, i, arr) => (
              <div key={i} style={{ display: 'flex', gap: 0 }}>
                {/* Left: timeline */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 28, flexShrink: 0 }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    background: i === 0 ? G : i === arr.length - 1 ? GD : BO,
                    border: `2px solid ${i === 0 ? G : BO}`,
                    flexShrink: 0, marginTop: 4,
                  }} />
                  {i < arr.length - 1 && (
                    <div style={{ width: 2, flex: 1, background: BO, marginTop: 2, marginBottom: 2 }} />
                  )}
                </div>
                {/* Right: content */}
                <div style={{ paddingBottom: i < arr.length - 1 ? 24 : 0, paddingLeft: 14, flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? G : DM, letterSpacing: '0.06em', marginBottom: 4 }}>
                    {step.time}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TE, marginBottom: 6 }}>{step.event}</div>
                  <div style={{ fontSize: 14, color: MT, lineHeight: 1.65 }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Payout details grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {[
              {
                title: 'US Winners Over $600',
                body: 'You will receive a 1099-MISC tax form from YN Finance by January 31 of the following tax year. It is your responsibility to report this income.',
                icon: '🇺🇸',
              },
              {
                title: 'Identity Verification (Stripe Identity)',
                body: 'Payouts over $100 require a one-time identity check — government ID + selfie. This takes ~2 minutes and satisfies AML requirements.',
                icon: '🪪',
              },
              {
                title: 'International Payouts',
                body: 'We support bank transfers (IBAN/SWIFT) and Stripe to eligible countries. Currency conversion is handled by Stripe at their standard rates.',
                icon: '🌍',
              },
              {
                title: 'Minimum Payout',
                body: 'Winnings under $10 are held until your cumulative balance reaches $10, then sent automatically.',
                icon: '💳',
              },
            ].map(item => (
              <Card key={item.title}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TE, marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: MT, lineHeight: 1.65 }}>{item.body}</div>
              </Card>
            ))}
          </div>
        </Section>

        {/* ── SECTION 3: IS THIS LEGAL? ── */}
        <Section id="is-this-legal" icon={<Shield size={17} color={G} />} title="Is This Legal?">
          <Card style={{ marginBottom: 24, borderColor: `${G}30` }}>
            <div style={{ fontSize: 20, marginBottom: 12 }}>⚖️</div>
            <p style={{ fontSize: 15, color: MT, lineHeight: 1.8, marginBottom: 16 }}>
              <strong style={{ color: TE }}>YN Arena is a skill-based competition.</strong>{' '}
              Unlike gambling, your outcome depends entirely on trading skill, not chance.
              Your rank is determined by your P&amp;L — a direct measure of how well you
              traded. Luck plays the same role it does in chess or poker: minimal when
              skill is consistently applied over time.
            </p>
            <p style={{ fontSize: 15, color: MT, lineHeight: 1.8 }}>
              We operate similarly to{' '}
              <strong style={{ color: TE }}>DraftKings and FanDuel</strong> — skill-based
              fantasy sports competitions have been found legal in most US states under the
              federal Unlawful Internet Gambling Enforcement Act (UIGEA), which explicitly
              excludes skill-based competitions from its definition of "gambling."
            </p>
          </Card>

          {/* Restricted jurisdictions */}
          <Card style={{ marginBottom: 24, borderColor: `${GD}30` }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <AlertTriangle size={18} color={GD} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: GD, marginBottom: 8 }}>
                  Restricted Jurisdictions
                </div>
                <p style={{ fontSize: 14, color: MT, lineHeight: 1.7, marginBottom: 12 }}>
                  We do not operate in states and countries with skill competition restrictions.
                  This currently includes (but is not limited to):
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {['Washington (WA)', 'Montana (MT)', 'Louisiana (LA)', 'Arizona (AZ)', 'Iowa (IA)', 'Vermont (VT)'].map(s => (
                    <span key={s} style={{
                      fontSize: 12, color: GD, background: `${GD}12`,
                      border: `1px solid ${GD}30`, borderRadius: 5,
                      padding: '3px 10px', fontWeight: 600,
                    }}>{s}</span>
                  ))}
                  <span style={{
                    fontSize: 12, color: DM, background: BO,
                    borderRadius: 5, padding: '3px 10px',
                  }}>+ other restricted regions</span>
                </div>
              </div>
            </div>
          </Card>

          <Card style={{ background: `${BO}60` }}>
            <p style={{ fontSize: 13, color: DM, lineHeight: 1.75 }}>
              <strong style={{ color: MT }}>Disclaimer:</strong> The above is for general
              informational purposes only and does not constitute legal or tax advice.
              Laws vary by jurisdiction and can change. Consult a qualified legal or tax
              professional for advice specific to your situation. By entering YN Arena you
              confirm that skill-based competitions are permitted in your jurisdiction.
            </p>
          </Card>
        </Section>

        {/* ── SECTION 4: SIMULATED ACCOUNT ── */}
        <Section id="simulated-account" icon={<Monitor size={17} color={G} />} title="The Simulated Account">
          <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, marginBottom: 28, maxWidth: 680 }}>
            When you enter a tournament, you receive a <strong style={{ color: TE }}>$10,000 paper trading account</strong>.
            No real money is ever deposited or risked in the markets. Here is exactly how it works:
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 28 }}>
            {[
              {
                q: 'You never trade real money.',
                a: 'Your $10,000 account is entirely simulated. Prices are sourced from real-time market data (stocks, forex, futures, crypto), but no real positions are opened with brokers or exchanges.',
              },
              {
                q: 'Your P&L determines your rank.',
                a: 'If you start at $10,000 and finish at $11,840, your P&L is +18.4%. That percentage is ranked against all other entrants. Your rank determines your prize — not your dollar P&L in isolation.',
              },
              {
                q: 'All trades are logged and auditable.',
                a: 'Every simulated order — entry price, exit price, size, timestamp — is recorded to Supabase. In the event of a dispute, our records are the source of truth.',
              },
              {
                q: 'Manipulation protection.',
                a: 'Trades must be placed in supported instruments with realistic position sizes. Orders that exceed daily volume limits or show patterns consistent with spoofing may be disqualified. Our rules are posted on the tournament page.',
              },
            ].map(item => (
              <Card key={item.q}>
                <div style={{ fontSize: 14, fontWeight: 800, color: TE, marginBottom: 8 }}>{item.q}</div>
                <div style={{ fontSize: 14, color: MT, lineHeight: 1.65 }}>{item.a}</div>
              </Card>
            ))}
          </div>

          {/* Summary stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 1, background: BO, borderRadius: 11, overflow: 'hidden' }}>
            {[
              ['$10,000',   'Starting account'],
              ['Real-time', 'Market prices'],
              ['Supabase',  'Audit trail'],
              ['P&L rank',  'Prize trigger'],
            ].map(([val, label]) => (
              <div key={label} style={{ background: BG, padding: '20px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 900, color: G, fontFamily: 'monospace', marginBottom: 4 }}>{val}</div>
                <div style={{ fontSize: 11, color: DM, textTransform: 'uppercase', letterSpacing: '0.07em' }}>{label}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* ── SECTION 5: RESPONSIBLE GAMING ── */}
        <Section id="responsible-gaming" icon={<Heart size={17} color={G} />} title="Responsible Gaming">
          <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, marginBottom: 28, maxWidth: 680 }}>
            We want YN Arena to be a place where traders improve their skills and earn meaningful rewards.
            We take problem gaming seriously.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginBottom: 28 }}>
            {[
              {
                icon: '🔒',
                title: 'Weekly Spend Limits',
                body: 'Request a weekly entry-fee limit at any time by emailing support@ynfinance.org. We will configure it within 24 hours. No questions asked.',
              },
              {
                icon: '🚫',
                title: 'Self-Exclusion',
                body: 'Email support@ynfinance.org with subject "Self-Exclusion Request." We will permanently close your account within 24 hours and you will not be able to re-register.',
              },
              {
                icon: '👁',
                title: 'Our Right to Remove Players',
                body: 'We reserve the right to restrict or remove players showing signs of compulsive or problem gaming behavior, including unusually frequent re-entries after large losses.',
              },
              {
                icon: '📚',
                title: 'Know the Risks',
                body: 'Entry fees are real money. Unlike casino games, YN Arena rewards skill — but no outcome is guaranteed. Only enter what you can afford to lose entirely.',
              },
            ].map(item => (
              <Card key={item.title}>
                <div style={{ fontSize: 24, marginBottom: 10 }}>{item.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TE, marginBottom: 8 }}>{item.title}</div>
                <div style={{ fontSize: 13, color: MT, lineHeight: 1.65 }}>{item.body}</div>
              </Card>
            ))}
          </div>

          <Card style={{ background: `${G}08`, borderColor: `${G}25`, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: MT, lineHeight: 1.7 }}>
              Need help?{' '}
              <a href="mailto:support@ynfinance.org" style={{ color: G, fontWeight: 700 }}>
                support@ynfinance.org
              </a>
              {' '}· National Problem Gambling Helpline:{' '}
              <a href="tel:18005224700" style={{ color: G, fontWeight: 700 }}>1-800-522-4700</a>
            </p>
          </Card>
        </Section>

        {/* ── FOOTER ── */}
        <div style={{ height: 1, background: BO, margin: '40px 0 32px' }} />
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={11} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: TE }}>YN Arena</span>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {[
              ['/arena', 'Arena'],
              ['/arena/schedule', 'Schedule'],
              ['/arena/creator', 'Stream & Earn'],
              ['/privacy', 'Privacy'],
              ['/terms', 'Terms'],
            ].map(([href, label]) => (
              <Link key={label} href={href} style={{ fontSize: 12, color: DM, textDecoration: 'none' }}>
                {label}
              </Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#3f3f46' }}>© 2026 YN Finance · Simulated trading · Real prizes</div>
        </div>
      </div>
    </div>
  )
}
