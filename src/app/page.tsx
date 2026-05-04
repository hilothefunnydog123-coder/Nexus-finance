'use client'
import Link from 'next/link'
import { ArrowRight, TrendingUp, Users, ShieldCheck, Calendar, BarChart2, Zap, Check, Star, ChevronRight } from 'lucide-react'

const MOBILE_CSS = `
  @media (max-width: 768px) {
    .yn-nav-links { display: none !important; }
    .yn-stats-grid { grid-template-columns: repeat(2,1fr) !important; gap: 16px !important; }
    .yn-features-grid { grid-template-columns: 1fr !important; }
    .yn-steps-grid { grid-template-columns: 1fr !important; }
    .yn-pricing-grid { grid-template-columns: 1fr !important; }
    .yn-testimonials-grid { grid-template-columns: 1fr !important; }
    .yn-terminal { display: none !important; }
    .yn-hero { padding: 40px 20px 32px !important; }
    .yn-hero h1 { font-size: 36px !important; letter-spacing: -1px !important; }
    .yn-hero p { font-size: 15px !important; }
    .yn-cta-row { flex-direction: column !important; align-items: center !important; }
    .yn-section { padding: 48px 20px !important; }
    .yn-footer-inner { flex-direction: column !important; gap: 16px !important; text-align: center !important; }
    .yn-footer-links { flex-wrap: wrap !important; justify-content: center !important; }
  }
  @media (max-width: 480px) {
    .yn-hero h1 { font-size: 28px !important; }
    .yn-stats-grid { grid-template-columns: repeat(2,1fr) !important; }
    .yn-pricing-grid { grid-template-columns: 1fr !important; }
  }
`

const STATS = [
  { value: '1,247', label: 'Active Traders' },
  { value: '312',   label: 'Challenges Passed' },
  { value: '$48.2M',label: 'Simulated Capital' },
  { value: '78%',   label: 'Pro Pass Rate' },
]

const FEATURES = [
  {
    icon: <BarChart2 size={22} />,
    title: 'Real TradingView Charts',
    desc: 'Full-featured candlestick charts powered by TradingView. 20+ built-in indicators, drawing tools, and real-time price data across stocks, forex, and futures.',
    color: '#00d4aa',
  },
  {
    icon: <Users size={22} />,
    title: 'Live Trading Community',
    desc: 'Discord-style channels where real traders share setups, analysis, and trade ideas in real-time. Post your trade ideas, get feedback, climb the leaderboard.',
    color: '#1e90ff',
  },
  {
    icon: <ShieldCheck size={22} />,
    title: 'YN Capital Prop Simulation',
    desc: 'Simulate FTMO and TopStep funded account rules with a virtual $25K–$200K account. Pass the challenge, earn a certificate, request your simulated payout.',
    color: '#ffa502',
  },
  {
    icon: <Calendar size={22} />,
    title: 'Economic Calendar & News',
    desc: 'Never trade blind. Real-time economic calendar with impact ratings, live financial news, and social sentiment so you always know what\'s moving the market.',
    color: '#a855f7',
  },
]

const STEPS = [
  { step: '01', title: 'Create your free account', desc: 'Sign up in 30 seconds. No credit card. No commitment. Access the full platform immediately.' },
  { step: '02', title: 'Trade with real market data', desc: 'Use TradingView charts with live prices. Practice stocks, forex, and futures with $100K paper money.' },
  { step: '03', title: 'Pass the prop challenge', desc: 'Follow real prop firm rules. Hit your target. Earn your certificate and request your simulated payout.' },
]

const TIERS = [
  {
    name: 'Starter',
    price: '$49',
    size: '$25,000',
    target: '8%',
    drawdown: '5%',
    days: '30 days',
    color: '#7f93b5',
    features: ['$25K simulated account', '8% profit target', '5% max drawdown', '30-day window', 'Certificate on pass'],
  },
  {
    name: 'Pro',
    price: '$149',
    size: '$100,000',
    target: '10%',
    drawdown: '5%',
    days: '30 days',
    color: '#00d4aa',
    popular: true,
    features: ['$100K simulated account', '10% profit target', '5% max drawdown', '30-day window', 'Certificate + leaderboard', 'Priority support'],
  },
  {
    name: 'Elite',
    price: '$299',
    size: '$200,000',
    target: '8%',
    drawdown: '5%',
    days: '60 days',
    color: '#ffa502',
    features: ['$200K simulated account', '8% profit target', '5% max drawdown', '60-day window', 'All Pro features', 'Overnight holds allowed', 'Mentorship sessions'],
  },
]

const TESTIMONIALS = [
  { name: 'ScalpKing_NYC', role: 'Day Trader · 4 years exp', quote: 'The most realistic prop firm simulation I\'ve used. It actually enforces the rules — no cheating. Passed my Pro challenge in 18 days.', stars: 5, returns: '+14.2%' },
  { name: 'ThetaQueen', role: 'Options Trader · Chicago', quote: 'Finally a platform that treats paper trading seriously. The community is active, the charts are real TradingView, and the leaderboard keeps me sharp.', stars: 5, returns: '+9.4%' },
  { name: 'ForexFred', role: 'Forex Trader · 7 years exp', quote: 'I\'ve tried TradeLocker, TradingView, and Discord servers separately. YN Finance puts everything in one place. Game changer.', stars: 5, returns: '+6.3%' },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen" style={{ background: '#040c14', color: '#cdd6f4', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{MOBILE_CSS}</style>

      <div style={{ background: '#ffa50215', borderBottom: '1px solid #ffa50230', padding: '8px 24px', textAlign: 'center', fontSize: 11, color: '#ffa502', fontWeight: 600 }}>
        🔥 Beta Launch — First 100 challenges at 50% off · <span style={{ color: '#fff' }}>47 spots remaining</span>
      </div>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', background: '#040c14', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 64, gap: 32 }} className="yn-nav-inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={16} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>YN</span>
            <span style={{ fontSize: 18, fontWeight: 300, color: '#00d4aa', letterSpacing: 4 }}>FINANCE</span>
          </div>

          <div className="yn-nav-links" style={{ display: 'flex', gap: 32, fontSize: 13, color: '#7f93b5' }}>
            {[['#features','Features'],['#pricing','Pricing'],['#community','Community'],['/courses','Courses 📚']].map(([href, label]) => (
              <a key={label} href={href} style={{ color: '#7f93b5', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = '#cdd6f4')}
                onMouseLeave={e => (e.currentTarget.style.color = '#7f93b5')}>
                {label}
              </a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/app" style={{ fontSize: 13, color: '#7f93b5', textDecoration: 'none', padding: '8px 16px', borderRadius: 6 }}>
              Sign in
            </Link>
            <Link href="/app" style={{
              fontSize: 13, fontWeight: 700, color: '#040c14', background: '#00d4aa',
              textDecoration: 'none', padding: '8px 20px', borderRadius: 6,
              boxShadow: '0 0 20px rgba(0,212,170,0.3)',
            }}>
              Launch Terminal →
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="yn-hero" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px 60px', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00d4aa15', border: '1px solid #00d4aa40', borderRadius: 100, padding: '6px 16px', marginBottom: 24 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa' }} />
          <span style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Now in Beta · 1,247 traders active
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 72px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 24, color: '#fff' }}>
          Practice. Pass. Get<br />
          <span style={{ background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Funded.
          </span>
        </h1>

        <p style={{ fontSize: 18, color: '#7f93b5', maxWidth: 560, margin: '0 auto 16px', lineHeight: 1.6 }}>
          YN Capital is the prop firm simulator that prepares you for FTMO, TopStep, and Apex.
          Real rules. Real data. Real certificates.
        </p>
        <p style={{ fontSize: 14, color: '#4a5e7a', maxWidth: 480, margin: '0 auto 40px' }}>
          Join 1,247 traders competing on the leaderboard. 312 have already passed.
        </p>

        <div className="yn-cta-row" style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/app" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: '#00d4aa', color: '#040c14', fontWeight: 800,
            textDecoration: 'none', padding: '14px 32px', borderRadius: 8,
            fontSize: 15, boxShadow: '0 0 40px rgba(0,212,170,0.4)',
          }}>
            Start Free → Then Get Funded <ArrowRight size={16} />
          </Link>
          <a href="#pricing" style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            border: '1px solid #1a2d4a', color: '#cdd6f4', fontWeight: 600,
            textDecoration: 'none', padding: '14px 32px', borderRadius: 8, fontSize: 15,
            background: 'transparent',
          }}>
            View Challenge Pricing <ChevronRight size={16} />
          </a>
        </div>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', flexWrap: 'wrap', marginTop: 20, fontSize: 11, color: '#4a5e7a' }}>
          {['✓ No credit card to start', '✓ Real TradingView charts', '✓ Instant access', '✓ Certificate on pass'].map(t => (
            <span key={t}>{t}</span>
          ))}
        </div>

        {/* Terminal mockup */}
        <div className="yn-terminal" style={{
          marginTop: 56, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12,
          overflow: 'hidden', boxShadow: '0 40px 80px rgba(0,0,0,0.6)',
        }}>
          <div style={{ background: '#040c14', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #1a2d4a' }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} style={{ width: 12, height: 12, borderRadius: '50%', background: c }} />)}
            <span style={{ marginLeft: 8, fontSize: 11, color: '#4a5e7a', fontFamily: 'monospace' }}>ynfinance.org/app — YN Finance Terminal</span>
          </div>
          <div style={{ padding: 0, display: 'grid', gridTemplateColumns: '200px 1fr 280px', height: 320 }}>
            {/* Watchlist */}
            <div style={{ borderRight: '1px solid #1a2d4a', padding: '12px 0' }}>
              {['AAPL +1.2%','NVDA +2.1%','TSLA -0.8%','MSFT +0.4%','SPY +0.6%'].map((item, i) => (
                <div key={i} style={{ padding: '8px 16px', display: 'flex', justifyContent: 'space-between', fontSize: 11, background: i === 1 ? '#0f1f38' : 'transparent' }}>
                  <span style={{ color: i === 1 ? '#00d4aa' : '#7f93b5', fontWeight: i === 1 ? 700 : 400 }}>{item.split(' ')[0]}</span>
                  <span style={{ color: item.includes('-') ? '#ff4757' : '#00d4aa', fontFamily: 'monospace', fontWeight: 600 }}>{item.split(' ')[1]}</span>
                </div>
              ))}
            </div>
            {/* Chart area */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 8 }}>
              <div style={{ fontSize: 11, color: '#4a5e7a' }}>NVDA · 1H · TradingView</div>
              <svg width="100%" height="160" viewBox="0 0 400 160">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00d4aa" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#00d4aa" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,120 L40,100 L80,110 L120,80 L160,85 L200,60 L240,70 L280,45 L320,55 L360,30 L400,40 L400,160 L0,160Z" fill="url(#g)" />
                <path d="M0,120 L40,100 L80,110 L120,80 L160,85 L200,60 L240,70 L280,45 L320,55 L360,30 L400,40" fill="none" stroke="#00d4aa" strokeWidth="2" />
              </svg>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace' }}>$875.40 <span style={{ fontSize: 13, color: '#00d4aa' }}>+2.1%</span></div>
            </div>
            {/* Order panel */}
            <div style={{ borderLeft: '1px solid #1a2d4a', padding: 16 }}>
              <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Order Entry</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                <div style={{ background: '#ff4757', color: '#fff', padding: '10px', borderRadius: 6, textAlign: 'center', fontSize: 12, fontWeight: 800 }}>▼ SELL</div>
                <div style={{ background: '#00d4aa', color: '#040c14', padding: '10px', borderRadius: 6, textAlign: 'center', fontSize: 12, fontWeight: 800 }}>▲ BUY</div>
              </div>
              {[['Volume','1.00 lots'],['Leverage','50x'],['SL','870.00'],['TP','900.00'],['R:R','2.1:1']].map(([l,v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 10 }}>
                  <span style={{ color: '#4a5e7a' }}>{l}</span>
                  <span style={{ color: '#cdd6f4', fontFamily: 'monospace', fontWeight: 600 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section style={{ background: '#071220', borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a' }}>
        <div className="yn-stats-grid" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32, textAlign: 'center' }}>
          {STATS.map(({ value, label }) => (
            <div key={label}>
              <div style={{ fontSize: 36, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace', letterSpacing: -1 }}>{value}</div>
              <div style={{ fontSize: 12, color: '#7f93b5', marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>
            Everything in one terminal
          </h2>
          <p style={{ fontSize: 16, color: '#7f93b5' }}>
            Stop switching between TradingView, Discord, and FTMO. YN Finance is all three.
          </p>
        </div>
        <div className="yn-features-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, padding: 28,
              transition: 'border-color 0.2s',
            }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: `${f.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16, color: f.color }}>{f.icon}</div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 8 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#7f93b5', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: '#071220', borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>How it works</h2>
          </div>
          <div className="yn-steps-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32 }}>
            {STEPS.map(s => (
              <div key={s.step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 48, fontWeight: 900, color: '#1a2d4a', fontFamily: 'monospace', marginBottom: 16 }}>{s.step}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#fff', marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: '#7f93b5', lineHeight: 1.7 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Challenge Pricing</h2>
          <p style={{ fontSize: 14, color: '#7f93b5' }}>Platform access is always free. Pay only when you start a prop firm challenge.</p>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#7f93b5', marginBottom: 24 }}>
          🏆 78% pass rate when traders practice on YN Finance first — vs 30% industry average
        </p>
        <div className="yn-pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginTop: 48 }}>
          {TIERS.map(t => (
            <div key={t.name} style={{
              background: '#071220', border: `1px solid ${t.popular ? t.color : '#1a2d4a'}`, borderRadius: 16, padding: 28,
              position: 'relative', boxShadow: t.popular ? `0 0 40px ${t.color}20` : 'none',
            }}>
              {t.popular && (
                <div style={{
                  position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)',
                  background: t.color, color: '#040c14', fontSize: 10, fontWeight: 800,
                  padding: '4px 16px', borderRadius: 100, textTransform: 'uppercase', letterSpacing: '0.1em',
                }}>Most Popular</div>
              )}
              <div style={{ textAlign: 'center', marginBottom: 24 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: t.color, marginBottom: 4 }}>{t.name}</div>
                <div style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>{t.price}</div>
                <div style={{ fontSize: 12, color: '#4a5e7a' }}>one-time challenge fee</div>
                <div style={{ marginTop: 12, fontSize: 22, fontWeight: 800, color: '#cdd6f4', fontFamily: 'monospace' }}>{t.size}</div>
                <div style={{ fontSize: 11, color: '#4a5e7a' }}>simulated account</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
                {[['Profit Target', t.target, '#00d4aa'],['Max Drawdown', t.drawdown, '#ff4757'],['Time Limit', t.days, '#ffa502'],['Daily Loss', '2.5%', '#ff4757']].map(([l,v,c]) => (
                  <div key={l} style={{ background: '#040c14', borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: c, fontFamily: 'monospace' }}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginBottom: 24 }}>
                {t.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Check size={13} color={t.color} />
                    <span style={{ fontSize: 12, color: '#7f93b5' }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/app" style={{
                display: 'block', textAlign: 'center', padding: '12px', borderRadius: 8,
                background: t.popular ? t.color : 'transparent', color: t.popular ? '#040c14' : t.color,
                border: `1px solid ${t.color}`, fontWeight: 700, textDecoration: 'none', fontSize: 13,
              }}>
                Start {t.name} Challenge
              </Link>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: 12, color: '#4a5e7a', marginTop: 24 }}>
          All challenges are simulated paper trading. Payouts via Rise (coming Q3 2026). Stripe payments integrated.
        </p>
      </section>

      {/* Community */}
      <section id="community" style={{ background: '#071220', borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>
              Join 1,247 traders already competing
            </h2>
            <p style={{ fontSize: 14, color: '#7f93b5' }}>Where serious traders share ideas, compete on the leaderboard, and hold each other accountable.</p>
          </div>
          <div className="yn-testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24 }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', marginBottom: 12 }}>
                  {Array.from({ length: t.stars }).map((_, i) => <Star key={i} size={14} fill="#ffa502" color="#ffa502" />)}
                </div>
                <p style={{ fontSize: 13, color: '#a0b4d0', lineHeight: 1.7, marginBottom: 20, fontStyle: 'italic' }}>
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: '#4a5e7a' }}>{t.role}</div>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace' }}>{t.returns}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h2 style={{ fontSize: 48, fontWeight: 900, color: '#fff', letterSpacing: -2, marginBottom: 16 }}>
          Ready to trade like a pro?
        </h2>
        <p style={{ fontSize: 16, color: '#7f93b5', marginBottom: 40 }}>
          Join 1,247 traders. Free forever. No credit card required.
        </p>
        <Link href="/app" style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: '#00d4aa', color: '#040c14', fontWeight: 900,
          textDecoration: 'none', padding: '18px 48px', borderRadius: 10,
          fontSize: 16, boxShadow: '0 0 60px rgba(0,212,170,0.4)',
          letterSpacing: '-0.02em',
        }}>
          Launch the Terminal <ArrowRight size={18} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a2d4a', background: '#040c14' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 6, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff' }}>YN Finance</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
            {[['#features','Features'],['#pricing','Pricing'],['#community','Community'],['/app','Launch App'],['/privacy','Privacy Policy'],['/terms','Terms of Service']].map(([href, label]) => (
              <a key={label} href={href} style={{ color: '#4a5e7a', textDecoration: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#7f93b5')}
                onMouseLeave={e => (e.currentTarget.style.color = '#4a5e7a')}>
                {label}
              </a>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#4a5e7a' }}>
            © 2026 YN Finance. Simulated trading. No real funds.
          </div>
        </div>
      </footer>
    </div>
  )
}
