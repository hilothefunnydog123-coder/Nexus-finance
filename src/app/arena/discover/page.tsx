'use client'

import Link from 'next/link'
import { Trophy, CheckCircle, TrendingUp, Users, Shield, Star } from 'lucide-react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG   = '#040508'
const SU   = '#0d1117'
const RA   = '#161b22'
const BO   = '#21262d'
const G    = '#22c55e'
const GD   = '#f59e0b'
const RE   = '#dc2626'
const BL   = '#2563eb'
const PU   = '#7c3aed'
const TE   = '#f0f6fc'
const MT   = '#8b949e'
const DM   = '#484f58'
const MONO = "'SF Mono', 'Fira Code', monospace"

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// Last 10 results for the mock trader profile card: true = win (top 20%), false = loss
const LAST_10: boolean[] = [true, true, false, true, true, true, false, true, false, true]

// ─── PAGE ─────────────────────────────────────────────────────────────────────
export default function DiscoverPage() {
  return (
    <div style={{ background: BG, color: TE, fontFamily: 'Inter,system-ui,sans-serif', minHeight: '100vh' }}>
      <style>{`
        *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
        @keyframes yn-in { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-glow { 0%,100%{box-shadow:0 0 0 0 ${G}30} 50%{box-shadow:0 0 28px 0 ${G}50} }
        @keyframes yn-ping { 0%,100%{transform:scale(1);opacity:0.4} 50%{transform:scale(1.8);opacity:0} }
        ::-webkit-scrollbar { width:3px } ::-webkit-scrollbar-thumb { background:${RA}; border-radius:3px }

        .yn-btn { display:inline-flex; align-items:center; gap:7px; font-weight:700; border-radius:9px; border:none; cursor:pointer; text-decoration:none; white-space:nowrap; transition:opacity 0.15s, transform 0.15s; }
        .yn-btn:hover { opacity:0.85; transform:translateY(-1px); }
        .yn-btn:active { transform:translateY(0); }
        .yn-btn-green { background:${G}; color:${BG}; padding:13px 28px; font-size:15px; animation:yn-glow 2.5s ease-in-out infinite; }
        .yn-btn-ghost { background:transparent; color:${MT}; border:1px solid ${BO}; padding:10px 18px; font-size:13px; }
        .yn-btn-ghost:hover { color:${TE}; border-color:${MT}; }
        .w { max-width:1080px; margin:0 auto; padding:0 24px; }

        .pipeline-line {
          display:none;
        }

        /* Desktop: horizontal pipeline */
        @media(min-width:860px) {
          .pipeline-grid {
            display:grid;
            grid-template-columns: 1fr 32px 1fr 32px 1fr 32px 1fr;
            align-items:start;
            gap:0;
          }
          .pipeline-arrow {
            display:flex;
            align-items:center;
            justify-content:center;
            padding-top:28px;
            color:${DM};
            font-size:20px;
          }
          .pipeline-step {
            display:flex;
            flex-direction:column;
            align-items:center;
            text-align:center;
          }
        }

        /* Mobile: vertical pipeline */
        @media(max-width:859px) {
          .pipeline-grid {
            display:flex;
            flex-direction:column;
            gap:0;
          }
          .pipeline-arrow {
            display:flex;
            align-items:center;
            justify-content:center;
            height:32px;
            color:${DM};
            font-size:18px;
          }
          .pipeline-step {
            display:flex;
            flex-direction:column;
            align-items:center;
            text-align:center;
          }
          .sm-hide { display:none !important; }
          .sm-col { flex-direction:column !important; }
          .sm-stack { flex-direction:column !important; align-items:stretch !important; }
          .sm-full { width:100% !important; max-width:100% !important; }
          .sm-grid1 { grid-template-columns:1fr !important; }
          .sm-grid2 { grid-template-columns:1fr 1fr !important; }
        }

        .faq-item summary {
          cursor:pointer;
          list-style:none;
          display:flex;
          justify-content:space-between;
          align-items:center;
          padding:18px 20px;
          font-size:15px;
          font-weight:700;
          color:${TE};
          transition:color 0.13s;
        }
        .faq-item summary::-webkit-details-marker { display:none; }
        .faq-item summary:hover { color:${G}; }
        .faq-item[open] summary { color:${G}; }
        .faq-item[open] summary .faq-icon::after { content:'−'; }
        .faq-icon::after { content:'+'; font-size:18px; color:${DM}; font-weight:400; }
        .faq-item[open] .faq-icon::after { color:${G}; }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ borderBottom: `1px solid ${BO}`, position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(24px)', background: `${BG}ee` }}>
        <div className="w" style={{ height: 54, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9, flexShrink: 0 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 12px ${G}40` }}>
              <Trophy size={14} color={BG} fill={BG} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 900, color: TE, letterSpacing: -0.3, lineHeight: 1 }}>YN Arena</div>
            </div>
          </Link>

          <div style={{ marginLeft: 8 }} className="sm-hide">
            <span style={{ fontSize: 10, fontWeight: 700, color: G, letterSpacing: '0.14em', textTransform: 'uppercase', background: `${G}15`, border: `1px solid ${G}30`, borderRadius: 4, padding: '3px 9px' }}>Get Discovered</span>
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginLeft: 'auto' }}>
            <Link href="/arena" style={{ fontSize: 11, color: DM, textDecoration: 'none', padding: '5px 10px', border: `1px solid ${BO}`, borderRadius: 6 }} className="sm-hide">
              ← Arena
            </Link>
            <Link href="/arena" className="yn-btn yn-btn-green" style={{ fontSize: 13, padding: '9px 20px', textDecoration: 'none' }}>
              Start competing
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 1 — HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 24px 88px', textAlign: 'center', animation: 'yn-in 0.4s ease' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>

          {/* eyebrow */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${G}12`, border: `1px solid ${G}30`, borderRadius: 20, padding: '5px 16px', marginBottom: 28 }}>
            <span style={{ position: 'relative', display: 'inline-flex', width: 7, height: 7, flexShrink: 0 }}>
              <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: G, opacity: 0.4, animation: 'yn-ping 1.2s ease-in-out infinite' }} />
              <span style={{ position: 'relative', borderRadius: '50%', background: G, width: '100%', height: '100%' }} />
            </span>
            <span style={{ fontSize: 11, fontWeight: 700, color: G, letterSpacing: '0.12em', textTransform: 'uppercase' }}>Talent Discovery Platform</span>
          </div>

          <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', fontWeight: 900, color: TE, letterSpacing: -1.5, lineHeight: 1.08, marginBottom: 24 }}>
            Where trading talent<br />
            <span style={{ color: G }}>gets found.</span>
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2.2vw, 19px)', color: MT, lineHeight: 1.75, marginBottom: 40, maxWidth: 580, margin: '0 auto 40px' }}>
            YN Arena is the leaderboard that prop firms actually watch. Build your public record. Let the numbers speak for you.
          </p>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/arena" className="yn-btn yn-btn-green" style={{ fontSize: 15, padding: '14px 32px', textDecoration: 'none' }}>
              Start competing →
            </Link>
            <a href="#pipeline" className="yn-btn yn-btn-ghost" style={{ fontSize: 14, padding: '14px 24px', textDecoration: 'none' }}>
              See how it works
            </a>
          </div>

          {/* social proof strip */}
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', marginTop: 52, flexWrap: 'wrap' }}>
            {[
              ['3,800+', 'Active Traders'],
              ['$47K+', 'Paid Out'],
              ['Top 20%', 'Always Paid'],
              ['Public', 'Verifiable Record'],
            ].map(([v, l]) => (
              <div key={l} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: TE, fontFamily: MONO, letterSpacing: -0.5 }}>{v}</div>
                <div style={{ fontSize: 10, color: DM, textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 3 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 2 — THE PIPELINE
      ══════════════════════════════════════════════════════════════════════ */}
      <section id="pipeline" style={{ padding: '72px 24px', background: SU, borderTop: `1px solid ${BO}`, borderBottom: `1px solid ${BO}` }}>
        <div className="w">

          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MT, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              The Pipeline
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: TE, letterSpacing: -0.8, marginBottom: 14 }}>
              Compete → Prove → Get Funded
            </h2>
            <p style={{ fontSize: 15, color: MT, maxWidth: 480, margin: '0 auto' }}>
              Four steps. One public record. Infinite upside.
            </p>
          </div>

          <div className="pipeline-grid">

            {/* Step 1 */}
            <div className="pipeline-step">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${G}18`, border: `1px solid ${G}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>
                🏆
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: G, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO }}>Step 01</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TE, marginBottom: 8, letterSpacing: -0.3 }}>Enter a tournament</div>
              <div style={{ fontSize: 24, fontWeight: 900, color: GD, fontFamily: MONO, marginBottom: 8 }}>$10</div>
              <div style={{ fontSize: 13, color: MT, lineHeight: 1.65, maxWidth: 200 }}>
                Compete on a level playing field. Every trader starts with the same $10,000 account.
              </div>
            </div>

            {/* Arrow */}
            <div className="pipeline-arrow">→</div>

            {/* Step 2 */}
            <div className="pipeline-step">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${BL}18`, border: `1px solid ${BL}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>
                📊
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: BL, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO }}>Step 02</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TE, marginBottom: 8, letterSpacing: -0.3 }}>Finish top 20%</div>
              <div style={{ fontSize: 13, color: G, fontWeight: 700, marginBottom: 8 }}>Your result goes public</div>
              <div style={{ fontSize: 13, color: MT, lineHeight: 1.65, maxWidth: 200 }}>
                Every top-20% finish is logged permanently on your public profile. No hiding, no revising.
              </div>
            </div>

            {/* Arrow */}
            <div className="pipeline-arrow">→</div>

            {/* Step 3 */}
            <div className="pipeline-step">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${GD}18`, border: `1px solid ${GD}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>
                🔥
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: GD, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO }}>Step 03</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TE, marginBottom: 8, letterSpacing: -0.3 }}>Build your record</div>
              <div style={{ fontSize: 13, color: GD, fontWeight: 700, marginBottom: 8 }}>Consistency = credibility</div>
              <div style={{ fontSize: 13, color: MT, lineHeight: 1.65, maxWidth: 200 }}>
                Consistent top finishes over 20+ tournaments. Win rate above 55%. Multiple top-3 placements.
              </div>
            </div>

            {/* Arrow */}
            <div className="pipeline-arrow">→</div>

            {/* Step 4 */}
            <div className="pipeline-step">
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${PU}18`, border: `1px solid ${PU}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, fontSize: 22 }}>
                🚀
              </div>
              <div style={{ fontSize: 10, fontWeight: 800, color: PU, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8, fontFamily: MONO }}>Step 04</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: TE, marginBottom: 8, letterSpacing: -0.3 }}>Get discovered</div>
              <div style={{ fontSize: 13, color: PU, fontWeight: 700, marginBottom: 8 }}>Prop firms are watching</div>
              <div style={{ fontSize: 13, color: MT, lineHeight: 1.65, maxWidth: 200 }}>
                Prop firms recruit from our top-performer list. Your track record does the talking.
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 3 — THE TRACK RECORD
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px' }}>
        <div className="w">

          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MT, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              Your Public Profile
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: TE, letterSpacing: -0.8, marginBottom: 14 }}>
              The Track Record
            </h2>
            <p style={{ fontSize: 15, color: MT, maxWidth: 520, margin: '0 auto' }}>
              This is what your profile looks like to a prop firm recruiter. Every tournament builds it automatically.
            </p>
          </div>

          {/* Trader Profile Card */}
          <div style={{ maxWidth: 600, margin: '0 auto', background: SU, border: `1px solid ${BO}`, borderRadius: 16, overflow: 'hidden', boxShadow: `0 24px 64px rgba(0,0,0,0.6), 0 0 0 1px ${G}20` }}>

            {/* Card header */}
            <div style={{ background: RA, borderBottom: `1px solid ${BO}`, padding: '24px 28px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: `${G}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 900, color: G, border: `1px solid ${G}30`, flexShrink: 0 }}>
                MT
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 18, fontWeight: 900, color: TE, letterSpacing: -0.3 }}>Marcus T.</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${G}15`, border: `1px solid ${G}30`, borderRadius: 4, padding: '2px 8px', fontSize: 10, fontWeight: 700, color: G }}>
                    <CheckCircle size={9} color={G} /> Verified
                  </span>
                </div>
                <div style={{ fontSize: 12, color: DM }}>Chicago, IL · Trading since 2023</div>
              </div>
              <div style={{ textAlign: 'right' }} className="sm-hide">
                <div style={{ fontSize: 10, color: DM, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 4 }}>Trader Score</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: GD, fontFamily: MONO, letterSpacing: -0.5 }}>87</div>
              </div>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${BO}` }} className="sm-grid2">
              {[
                { label: 'Win Rate',      value: '67%',    color: G   },
                { label: 'Total Earned',  value: '$4,280', color: GD  },
                { label: 'Best Finish',   value: '#1',     color: GD  },
                { label: 'Consistency',   value: '8.4/10', color: BL  },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '18px 16px', borderRight: `1px solid ${BO}` }}>
                  <div style={{ fontSize: 9, color: DM, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: MONO, letterSpacing: -0.5 }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Win rate bar */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BO}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: MT, fontWeight: 600 }}>Win Rate</span>
                <span style={{ fontSize: 13, fontWeight: 800, color: G, fontFamily: MONO }}>67%</span>
              </div>
              <div style={{ height: 6, background: RA, borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: '67%', height: '100%', background: `linear-gradient(90deg, ${G}80, ${G})`, borderRadius: 3 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6 }}>
                <span style={{ fontSize: 10, color: DM }}>0%</span>
                <span style={{ fontSize: 10, color: DM }}>100%</span>
              </div>
            </div>

            {/* Last 10 results */}
            <div style={{ padding: '20px 28px', borderBottom: `1px solid ${BO}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: MT, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 12 }}>
                Last 10 Tournaments
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {LAST_10.map((win, i) => (
                  <div
                    key={i}
                    title={win ? 'Top 20% — Cashed' : 'Did not cash'}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 7,
                      background: win ? `${G}20` : `${RE}15`,
                      border: `1px solid ${win ? G : RE}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 13,
                    }}
                  >
                    {win ? (
                      <span style={{ color: G, fontWeight: 900, fontSize: 12 }}>W</span>
                    ) : (
                      <span style={{ color: RE, fontWeight: 700, fontSize: 12 }}>L</span>
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4 }}>
                  <span style={{ fontSize: 11, color: DM }}>← most recent</span>
                </div>
              </div>
              <div style={{ marginTop: 10, display: 'flex', gap: 16 }}>
                <span style={{ fontSize: 11, color: G }}><strong style={{ fontFamily: MONO }}>7</strong> cashed</span>
                <span style={{ fontSize: 11, color: RE }}><strong style={{ fontFamily: MONO }}>3</strong> missed</span>
                <span style={{ fontSize: 11, color: MT }}>W = top 20%</span>
              </div>
            </div>

            {/* Apply button — coming soon */}
            <div style={{ padding: '20px 28px' }}>
              <button
                disabled
                style={{
                  width: '100%',
                  background: DM,
                  color: `${TE}50`,
                  border: `1px solid ${BO}`,
                  borderRadius: 10,
                  padding: '14px',
                  fontSize: 15,
                  fontWeight: 900,
                  cursor: 'not-allowed',
                  letterSpacing: 0.2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Shield size={15} />
                Apply for Funding — Coming Soon
              </button>
              <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: DM }}>
                Prop firm applications will open Q3 2026 · Your record is being built now
              </div>
            </div>
          </div>

          {/* Caption below card */}
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, maxWidth: 540, margin: '0 auto' }}>
              Every tournament you enter builds this record. It&apos;s <strong style={{ color: TE }}>permanent</strong>, <strong style={{ color: TE }}>public</strong>, and <strong style={{ color: TE }}>verifiable</strong>.
            </p>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 4 — PROP FIRM PARTNERS
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '72px 24px', background: SU, borderTop: `1px solid ${BO}`, borderBottom: `1px solid ${BO}` }}>
        <div className="w">

          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MT, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              Funded Trader Programs
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: TE, letterSpacing: -0.8, marginBottom: 14 }}>
              These firms are looking for traders like you.
            </h2>
            <p style={{ fontSize: 15, color: MT, maxWidth: 480, margin: '0 auto' }}>
              Build your YN Arena track record. Then walk in with proof.
            </p>
          </div>

          {/* Firm cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 14, marginBottom: 32 }}>
            {[
              {
                name: 'FTMO',
                tagline: 'Up to $200K funded. 80% profit split. 200,000+ traders.',
                color: '#ef4444',
                url: 'https://ftmo.com',
                badge: 'Most Popular',
              },
              {
                name: 'Topstep',
                tagline: 'Trade our money. Keep 90%. Start at $50.',
                color: BL,
                url: 'https://topstep.com',
                badge: 'Beginner Friendly',
              },
              {
                name: 'Apex Trader Funding',
                tagline: '$25K–$300K accounts. Pass our evaluation.',
                color: GD,
                url: 'https://apextraderfunding.com',
                badge: 'Best Value',
              },
              {
                name: 'The Funded Trader',
                tagline: 'Scale to $1.5M. 90% payout.',
                color: PU,
                url: 'https://thefundedtrader.com',
                badge: 'Highest Scale',
              },
            ].map(firm => (
              <div
                key={firm.name}
                style={{
                  background: BG,
                  border: `1px solid ${BO}`,
                  borderTop: `3px solid ${firm.color}`,
                  borderRadius: 12,
                  padding: '24px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <span style={{ fontSize: 16, fontWeight: 900, color: TE, letterSpacing: -0.3 }}>{firm.name}</span>
                    <span style={{ fontSize: 9, color: firm.color, background: `${firm.color}18`, border: `1px solid ${firm.color}30`, borderRadius: 3, padding: '2px 7px', fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap', marginLeft: 6 }}>
                      {firm.badge}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: MT, lineHeight: 1.65 }}>{firm.tagline}</p>
                </div>
                <a
                  href={firm.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontSize: 12,
                    fontWeight: 700,
                    color: firm.color,
                    textDecoration: 'none',
                    marginTop: 'auto',
                    transition: 'opacity 0.13s',
                  }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.7'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                >
                  Learn more →
                </a>
              </div>
            ))}
          </div>

          {/* Disclaimer */}
          <div style={{ background: RA, border: `1px solid ${BO}`, borderRadius: 10, padding: '16px 20px', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 14, flexShrink: 0, marginTop: 1 }}>ℹ️</span>
            <p style={{ fontSize: 12, color: DM, lineHeight: 1.7 }}>
              YN Arena does not have formal partnerships with these firms. We share them because our top performers deserve to know their options.
            </p>
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          SECTION 5 — FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '72px 24px' }}>
        <div className="w">

          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: MT, letterSpacing: '0.16em', textTransform: 'uppercase', marginBottom: 14 }}>
              FAQ
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 38px)', fontWeight: 900, color: TE, letterSpacing: -0.8 }}>
              Questions &amp; Answers
            </h2>
          </div>

          <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[
              {
                q: 'Does YN Arena guarantee I get funded?',
                a: 'No. We guarantee your record is public and verifiable. What you do with it is up to you. Your track record is a tool — a credible one — but prop firms make their own decisions.',
              },
              {
                q: 'What counts as a good track record?',
                a: 'Consistent top 20% finishes over 20+ tournaments. Win rate above 55%. Multiple top-3 finishes. Prop firms want to see not just talent — but discipline and repeatability.',
              },
              {
                q: 'Are my tournament results actually auditable?',
                a: 'Yes. Every trade, timestamp, and P&L is logged in our Supabase database and available on request. Your profile page links to your full tournament history with verified results.',
              },
              {
                q: 'When do prop firms start recruiting from YN Arena?',
                a: 'We are building the top-performer list now. The formal "Apply for Funding" feature is targeting Q3 2026. Traders who build their record today will be first in line.',
              },
              {
                q: 'Does it cost anything to build a public profile?',
                a: 'No. Every tournament entry ($10+) automatically contributes to your public profile. There is no separate fee to be on the list. Compete and you\'re tracked.',
              },
            ].map(({ q, a }) => (
              <details
                key={q}
                className="faq-item"
                style={{
                  background: SU,
                  border: `1px solid ${BO}`,
                  borderRadius: 10,
                  overflow: 'hidden',
                }}
              >
                <summary>
                  {q}
                  <span className="faq-icon" />
                </summary>
                <div style={{ padding: '0 20px 18px', fontSize: 14, color: MT, lineHeight: 1.75, borderTop: `1px solid ${BO}`, paddingTop: 14 }}>
                  {a}
                </div>
              </details>
            ))}
          </div>

        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM CTA
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '72px 24px', background: SU, borderTop: `1px solid ${BO}`, textAlign: 'center' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ fontSize: 32, marginBottom: 16 }}>🏆</div>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 36px)', fontWeight: 900, color: TE, letterSpacing: -0.7, marginBottom: 16 }}>
            Your record starts with your next trade.
          </h2>
          <p style={{ fontSize: 15, color: MT, lineHeight: 1.75, marginBottom: 36 }}>
            Every tournament you skip is data you don&apos;t have. Enter the next one and start building the track record that gets you funded.
          </p>
          <Link href="/arena" className="yn-btn yn-btn-green" style={{ fontSize: 16, padding: '15px 36px', textDecoration: 'none' }}>
            Start competing →
          </Link>
          <div style={{ marginTop: 14, fontSize: 12, color: DM }}>$10 entry · Top 20% always paid · Public record from day one</div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <div className="w" style={{ paddingTop: 36, paddingBottom: 44 }}>
        <div style={{ height: 1, background: BO, marginBottom: 28 }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={11} color={BG} fill={BG} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 900, color: TE }}>YN Arena</span>
          </div>
          <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
            {([
              ['/arena', 'Arena'],
              ['/arena/schedule', 'Schedule'],
              ['/arena/creator', 'Stream & Earn'],
              ['/arena/discover', 'Get Discovered'],
              ['/courses', 'Courses'],
              ['/app', 'Terminal'],
              ['/privacy', 'Privacy'],
              ['/terms', 'Terms'],
            ] as [string, string][]).map(([h, l]) => (
              <Link
                key={l}
                href={h}
                style={{ fontSize: 12, color: DM, textDecoration: 'none', transition: 'color 0.13s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = MT}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = DM}
              >{l}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: DM }}>Simulated trading · Real prizes · © 2026 YN Finance</div>
        </div>
      </div>

    </div>
  )
}
