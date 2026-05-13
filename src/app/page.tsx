'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { ArrowRight, Trophy, BookOpen, BarChart2, Zap, TrendingUp } from 'lucide-react'
import NativeAd from '@/components/ads/NativeAd'
import AdsterraBanner from '@/components/ads/AdsterraBanner'

// ─── LIVE BOARD (mini demo in hero) ──────────────────────────────────────────

const BOARD_TRADERS = [
  { name: 'Marcus T.',  init: 'MT', base:  18.4, color: '#22c55e' },
  { name: 'Priya S.',   init: 'PS', base:  14.1, color: '#eab308' },
  { name: 'Devon P.',   init: 'DP', base:  11.7, color: '#3b82f6' },
  { name: 'Jordan M.',  init: 'JM', base:   9.3, color: '#a855f7' },
  { name: 'Aisha B.',   init: 'AB', base:   5.2, color: '#22c55e' },
  { name: 'Chris L.',   init: 'CL', base:  -2.1, color: '#71717a' },
  { name: 'Nina R.',    init: 'NR', base:  -5.8, color: '#71717a' },
]

function useLiveBoard() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 2500); return () => clearInterval(t) }, [])
  return useMemo(() => BOARD_TRADERS.map((t, i) => ({
    ...t,
    pct: +(t.base + Math.sin(tick * 0.2 + i * 1.7) * 0.9).toFixed(2),
  })).sort((a, b) => b.pct - a.pct).map((t, i) => ({ ...t, rank: i + 1 })), [tick])
}

// ─── INSTRUCTORS ─────────────────────────────────────────────────────────────

const INSTRUCTORS = [
  { name: 'Ross Cameron',  color: '#ef4444', init: 'RC', tag: 'Day Trading',       sub: '1.98M subs' },
  { name: 'ICT',           color: '#3b82f6', init: 'IC', tag: 'Smart Money',       sub: '1.8M subs'  },
  { name: 'Rayner Teo',    color: '#22c55e', init: 'RT', tag: 'Swing Trading',     sub: '2.1M subs'  },
  { name: 'Graham Stephan',color: '#22c55e', init: 'GS', tag: 'Investing',         sub: '5M subs'    },
  { name: 'Kevin O\'Leary',color: '#3b82f6', init: 'KO', tag: 'Portfolio Mgmt',    sub: 'Shark Tank' },
  { name: 'Wall St. Trapper',color:'#f59e0b',init:'WT',  tag: 'Financial Literacy',sub: 'Leon Howard' },
  { name: 'Humbled Trader',color: '#f59e0b', init: 'HT', tag: 'Momentum',          sub: '1M subs'    },
  { name: 'Anton Kreil',   color: '#a855f7', init: 'AK', tag: 'Institutional',     sub: 'Ex-Goldman' },
]

// ─── WINS TICKER ─────────────────────────────────────────────────────────────

const WINS = [
  'Marcus T. won $1,100 in Daily Blitz · +241% return',
  'Priya S. won $2,904 in Crypto Night · First place',
  'Devon P. won $2,640 in Pro Showdown · +198% return',
  'Sarah K. won $660 · Daily Blitz · $10 entry',
  'Ryan C. won $1,452 · Futures Arena · $25 entry',
  'Jordan M. won $792 · Daily Blitz · Top 5 finish',
  'Aisha B. won $528 · Daily Blitz · $10 to $528',
]

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const board = useLiveBoard()
  const inMoney = 2

  return (
    <div style={{ background: '#09090b', color: '#fafafa', fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden' }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        @keyframes ticker   { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes fadeUp   { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse    { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.7)} }
        @keyframes glow-g   { 0%,100%{box-shadow:0 0 0 0 #22c55e40} 50%{box-shadow:0 0 0 8px #22c55e00} }
        @keyframes shimmer  { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        @keyframes float    { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }

        ::-webkit-scrollbar { width: 4px }
        ::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px }

        .hero-animate { animation: fadeUp 0.7s ease both }
        .hero-animate-2 { animation: fadeUp 0.7s 0.1s ease both }
        .hero-animate-3 { animation: fadeUp 0.7s 0.2s ease both }

        .btn-primary {
          display: inline-flex; align-items: center; gap: 8px;
          background: #22c55e; color: #09090b; font-weight: 800; font-size: 15px;
          padding: 14px 28px; border-radius: 10px; border: none; cursor: pointer;
          text-decoration: none; transition: opacity 0.15s, transform 0.15s;
          white-space: nowrap; letter-spacing: -0.2px;
        }
        .btn-primary:hover { opacity: 0.88; transform: translateY(-1px); }

        .btn-ghost {
          display: inline-flex; align-items: center; gap: 8px;
          background: transparent; color: #a1a1aa; font-weight: 600; font-size: 15px;
          padding: 14px 24px; border-radius: 10px; border: 1px solid #27272a;
          cursor: pointer; text-decoration: none; transition: all 0.15s; white-space: nowrap;
        }
        .btn-ghost:hover { color: #fafafa; border-color: #3f3f46; }

        .card {
          background: #18181b; border: 1px solid #27272a; border-radius: 12px;
          transition: border-color 0.15s, transform 0.2s;
        }
        .card:hover { border-color: #3f3f46; }

        .card-lift:hover { transform: translateY(-3px); border-color: #52525b; }

        .nav-link { font-size: 13px; color: #71717a; text-decoration: none; transition: color 0.15s; }
        .nav-link:hover { color: #fafafa; }

        .section { max-width: 1200px; margin: 0 auto; padding: 0 24px; }

        .live-dot {
          display: inline-block; width: 7px; height: 7px; border-radius: 50%;
          background: #22c55e; flex-shrink: 0;
          animation: pulse 1.5s ease-in-out infinite;
        }

        /* Responsive */
        .grid-2  { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
        .grid-3  { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
        .grid-4  { display: grid; grid-template-columns: repeat(4,1fr); gap: 14px; }
        .grid-8  { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }

        @media (max-width: 900px) {
          .grid-2 { grid-template-columns: 1fr; gap: 24px; }
          .grid-3 { grid-template-columns: 1fr 1fr; }
          .grid-4 { grid-template-columns: 1fr 1fr; }
          .grid-8 { grid-template-columns: repeat(2,1fr); }
          .hide-sm { display: none !important; }
          .hero-title { font-size: clamp(40px,9vw,72px) !important; }
        }
        @media (max-width: 600px) {
          .grid-3 { grid-template-columns: 1fr; }
          .btn-row { flex-direction: column; }
          .btn-row a, .btn-row button { width: 100%; justify-content: center; }
        }
      `}</style>

      {/* ── ANNOUNCEMENT BAR ── */}
      <div style={{ background: '#22c55e', height: 36, display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <div style={{ background: '#16a34a', padding: '0 18px', height: '100%', display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, fontWeight: 800, fontSize: 11, letterSpacing: '0.12em', color: '#09090b' }}>
          <span className="live-dot" style={{ background: '#09090b', animation: 'none' }} />
          LIVE
        </div>
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <div style={{ display: 'inline-flex', animation: 'ticker 38s linear infinite', whiteSpace: 'nowrap' }}>
            {[...WINS, ...WINS].map((w, i) => (
              <span key={i} style={{ padding: '0 36px', fontSize: 12, fontWeight: 600, color: '#09090b' }}>{w}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── NAV ── */}
      <nav style={{ borderBottom: '1px solid #18181b', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(20px)', background: 'rgba(9,9,11,0.94)' }}>
        <div className="section" style={{ height: 60, display: 'flex', alignItems: 'center', gap: 32 }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#09090b" fill="#09090b" />
            </div>
            <span style={{ fontSize: 15, fontWeight: 900, color: '#fafafa', letterSpacing: -0.4 }}>YN Finance</span>
          </Link>

          <div style={{ display: 'flex', gap: 24, marginLeft: 8 }} className="hide-sm">
            <Link href="/arena"   className="nav-link">Arena</Link>
            <Link href="/courses" className="nav-link">Courses</Link>
            <Link href="/app"     className="nav-link">Terminal</Link>
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
            <Link href="/courses" className="btn-ghost" style={{ fontSize: 13, padding: '8px 16px' }} >
              Browse Courses
            </Link>
            <Link href="/arena" className="btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
              <Trophy size={13} /> Enter Arena
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          SECTION 1 — ARENA HERO
      ══════════════════════════════════════════ */}
      <section style={{ padding: '80px 0 0', borderBottom: '1px solid #18181b' }}>
        <div className="section">
          <div className="grid-2">

            {/* Left: copy */}
            <div>
              <div className="hero-animate" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#22c55e12', border: '1px solid #22c55e25', borderRadius: 100, padding: '6px 14px', fontSize: 12, color: '#22c55e', fontWeight: 600, marginBottom: 28, letterSpacing: 0.2 }}>
                <span className="live-dot" />
                {board[0]?.name} is leading at +{board[0]?.pct.toFixed(1)}% right now
              </div>

              <h1 className="hero-animate-2 hero-title" style={{ fontSize: 'clamp(44px,5.5vw,80px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2.5, marginBottom: 22, color: '#fafafa' }}>
                Trading is<br />
                <span style={{ color: '#22c55e' }}>a sport.</span><br />
                We built<br />the arena.
              </h1>

              <p className="hero-animate-3" style={{ fontSize: 17, color: '#a1a1aa', lineHeight: 1.7, maxWidth: 440, marginBottom: 36 }}>
                Daily tournaments. $10 entry. Trade a $10,000 simulated account for 6 hours against other humans and AI. Finish top 10 — your entry fee multiplies by your P&L%.
              </p>

              <div className="btn-row hero-animate-3" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 40 }}>
                <Link href="/arena" className="btn-primary" style={{ fontSize: 15 }}>
                  <Trophy size={16} /> Enter Today&apos;s Tournament — $10
                </Link>
                <Link href="/arena" className="btn-ghost" style={{ fontSize: 15 }}>
                  Watch live free
                </Link>
              </div>

              {/* Stats */}
              <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', paddingTop: 28, borderTop: '1px solid #27272a' }}>
                {[
                  { n: '$127,400', l: 'paid to traders all time' },
                  { n: '$2,904',   l: 'largest single payout'    },
                  { n: '12%',      l: 'house rake — we take less than poker' },
                ].map(({ n, l }) => (
                  <div key={l}>
                    <div style={{ fontSize: 24, fontWeight: 900, color: '#fafafa', fontFamily: 'monospace', letterSpacing: -0.5 }}>{n}</div>
                    <div style={{ fontSize: 11, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: live scoreboard card */}
            <div className="hide-sm" style={{ animation: 'float 5s ease-in-out infinite' }}>
              <div className="card" style={{ overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="live-dot" />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fafafa' }}>Daily Blitz</span>
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: '#71717a', fontFamily: 'monospace' }}>4h 23m left</span>
                </div>

                {/* Board rows */}
                {board.map((t, i) => (
                  <div key={t.name} style={{
                    display: 'grid', gridTemplateColumns: '24px 24px 1fr 72px 48px',
                    padding: '10px 18px', borderBottom: '1px solid #27272a',
                    background: i < inMoney ? `${t.color}09` : 'transparent',
                    transition: 'background 0.5s',
                    alignItems: 'center',
                  }}>
                    <div style={{ fontSize: 13 }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : ''}</div>
                    <div style={{ fontSize: 10, color: '#52525b', fontFamily: 'monospace' }}>#{i + 1}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color, flexShrink: 0 }}>
                        {t.init}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fafafa' }}>{t.name}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 14, fontWeight: 800, color: t.pct >= 0 ? '#22c55e' : '#ef4444', fontFamily: 'monospace', transition: 'color 0.4s' }}>
                      {t.pct >= 0 ? '+' : ''}{t.pct.toFixed(1)}%
                    </div>
                    {i < inMoney
                      ? <div style={{ textAlign: 'center', fontSize: 9, color: t.color, background: `${t.color}18`, padding: '2px 6px', borderRadius: 4, fontWeight: 800 }}>PAID</div>
                      : <div />
                    }
                  </div>
                ))}

                <div style={{ padding: '10px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: '#52525b' }}>390 traders · updates live</span>
                  <Link href="/arena" style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                    Watch full board <ArrowRight size={11} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* How it works strip */}
        <div style={{ borderTop: '1px solid #18181b', marginTop: 64, background: '#0d0d0f' }}>
          <div className="section">
            <div className="grid-3" style={{ padding: '40px 0' }}>
              {[
                { n: '01', title: 'Pay the entry fee', body: '$10 via Stripe. You get a $10,000 simulated account instantly. No verification, no waiting.' },
                { n: '02', title: 'Trade for 6 hours', body: 'Long or short on stocks, forex, futures, or crypto. Your P&L is tracked on the live leaderboard.' },
                { n: '03', title: 'Top 20% get paid', body: 'Prize pool = 88% of all entry fees. Fixed payouts: 1st takes 30%, 2nd takes 18%, down through top 20%. Paid via Stripe within 24 hours.' },
              ].map(({ n, title, body }) => (
                <div key={n} style={{ padding: '4px 0' }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#22c55e', letterSpacing: '0.14em', marginBottom: 10 }}>{n}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, color: '#fafafa', marginBottom: 8, letterSpacing: -0.3 }}>{title}</div>
                  <div style={{ fontSize: 14, color: '#71717a', lineHeight: 1.65 }}>{body}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Legitimacy strip */}
      <div style={{ background: '#0d1117', borderTop: '1px solid #18181b', borderBottom: '1px solid #18181b' }}>
        <div className="section" style={{ padding: '18px 0', display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
          {[
            { icon: '🔒', text: 'Stripe Identity verified payouts' },
            { icon: '📋', text: '1099-MISC issued for US winners over $600' },
            { icon: '🎯', text: 'Skill-based competition — not gambling' },
            { icon: '⚡', text: 'Payouts within 24 hours of tournament close' },
            { icon: '🏛️', text: '12% rake — lower than poker rooms' },
          ].map(({ icon, text }) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: '#52525b', whiteSpace: 'nowrap' }}>
              <span>{icon}</span>
              <span>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ADSTERRA BANNER (hero → courses) ── */}
      <div style={{ display: 'flex', justifyContent: 'center', padding: '28px 24px', background: '#09090b', borderBottom: '1px solid #18181b' }}>
        <AdsterraBanner size="728x90" />
      </div>

      {/* ══════════════════════════════════════════
          SECTION 2 — COURSES
      ══════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', borderBottom: '1px solid #18181b' }}>
        <div className="section">

          {/* Header */}
          <div style={{ maxWidth: 560, marginBottom: 56 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#3b82f6', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>Courses · $0.99 each</div>
            <h2 style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: '#fafafa', letterSpacing: -1.5, lineHeight: 1.1, marginBottom: 16 }}>
              Learn from traders who actually trade.
            </h2>
            <p style={{ fontSize: 16, color: '#71717a', lineHeight: 1.7 }}>
              Nine structured curricula from the world&apos;s most-followed traders. AI-narrated lessons, knowledge checks, and built-in practice mode. $0.99 per course — no subscription.
            </p>
          </div>

          {/* Instructor grid */}
          <div className="grid-8" style={{ marginBottom: 40 }}>
            {INSTRUCTORS.map(inst => (
              <Link key={inst.name} href="/courses" style={{ textDecoration: 'none' }}>
                <div className="card card-lift" style={{ padding: '16px 14px', textAlign: 'center', cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${inst.color}20`, border: `2px solid ${inst.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 13, fontWeight: 900, color: inst.color }}>
                    {inst.init}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#fafafa', marginBottom: 2, lineHeight: 1.3 }}>{inst.name}</div>
                  <div style={{ fontSize: 10, color: inst.color, fontWeight: 600 }}>{inst.tag}</div>
                </div>
              </Link>
            ))}
          </div>

          {/* Native Ad — Prop Firm */}
          <div style={{ marginBottom: 24 }}>
            <NativeAd variant="prop-firm" size="md" />
          </div>

          {/* Bottom CTA */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#18181b', border: '1px solid #27272a', borderRadius: 14, padding: '24px 28px', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#fafafa', marginBottom: 4 }}>
                9 courses. $0.99 each. No subscription.
              </div>
              <div style={{ fontSize: 14, color: '#71717a' }}>
                Every course links directly to the trading simulator. Learn a strategy, practice it immediately.
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
              <Link href="/quiz" className="btn-ghost" style={{ fontSize: 13, padding: '10px 18px' }}>
                Take the quiz
              </Link>
              <Link href="/courses" className="btn-primary" style={{ fontSize: 13, padding: '10px 18px', background: '#3b82f6', boxShadow: 'none', animation: 'none' }}>
                <BookOpen size={14} /> Browse Courses
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          SECTION 3 — TERMINAL
      ══════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', borderBottom: '1px solid #18181b' }}>
        <div className="section">
          <div className="grid-2" style={{ gap: 64 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>Trading Terminal · Free</div>
              <h2 style={{ fontSize: 'clamp(28px,3.5vw,44px)', fontWeight: 900, color: '#fafafa', letterSpacing: -1, lineHeight: 1.1, marginBottom: 16 }}>
                A professional trading terminal. For free.
              </h2>
              <p style={{ fontSize: 16, color: '#71717a', lineHeight: 1.7, marginBottom: 28 }}>
                Real TradingView charts. Live market data. $100,000 paper trading account with real SL/TP, leverage, and multi-asset support. AI chart analysis, a trade journal, community leaderboard, and more.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 32 }}>
                {[
                  'Real-time charts via TradingView — stocks, forex, futures, crypto',
                  '$100K paper account with leverage, SL/TP, and multi-position tracking',
                  'AI Intel tab — daily newspaper, chart signals, top stock picks',
                  'Trade journal with pattern analytics and AI coaching',
                ].map(f => (
                  <div key={f} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 16, height: 16, borderRadius: '50%', background: '#22c55e20', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                      <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e' }} />
                    </div>
                    <span style={{ fontSize: 14, color: '#a1a1aa', lineHeight: 1.5 }}>{f}</span>
                  </div>
                ))}
              </div>
              <Link href="/app" className="btn-primary" style={{ background: '#a855f7', boxShadow: 'none', animation: 'none', fontSize: 14 }}>
                <BarChart2 size={15} /> Open Terminal — Free
              </Link>
            </div>

            {/* Terminal preview */}
            <div className="hide-sm" style={{ background: '#18181b', border: '1px solid #27272a', borderRadius: 14, overflow: 'hidden' }}>
              {/* Fake terminal header */}
              <div style={{ padding: '11px 14px', background: '#0d0d0f', borderBottom: '1px solid #27272a', display: 'flex', alignItems: 'center', gap: 6 }}>
                {['#ef4444','#eab308','#22c55e'].map(c => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, opacity: 0.7 }} />
                ))}
                <span style={{ fontSize: 11, color: '#52525b', marginLeft: 6 }}>YN Finance Terminal</span>
              </div>
              {/* Fake nav tabs */}
              <div style={{ display: 'flex', borderBottom: '1px solid #27272a', overflowX: 'auto' }}>
                {['Dashboard','Scanner','Trade','Journal','Community','AI Intel'].map((tab, i) => (
                  <div key={tab} style={{ padding: '8px 14px', fontSize: 11, fontWeight: 700, color: i === 0 ? '#22c55e' : '#52525b', borderBottom: i === 0 ? '2px solid #22c55e' : 'none', whiteSpace: 'nowrap', cursor: 'default' }}>{tab}</div>
                ))}
              </div>
              {/* Fake chart area */}
              <div style={{ height: 200, background: '#0a0a0c', position: 'relative', overflow: 'hidden' }}>
                <svg width="100%" height="100%" viewBox="0 0 400 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0,160 C20,155 40,140 60,130 S100,110 120,100 S160,80 180,75 S220,65 240,60 S280,55 300,50 S340,45 360,42 S390,40 400,38 L400,200 L0,200 Z" fill="url(#chartGrad)" />
                  <path d="M0,160 C20,155 40,140 60,130 S100,110 120,100 S160,80 180,75 S220,65 240,60 S280,55 300,50 S340,45 360,42 S390,40 400,38" fill="none" stroke="#22c55e" strokeWidth="2" />
                </svg>
                <div style={{ position: 'absolute', top: 14, left: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fafafa' }}>AAPL</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#22c55e', fontFamily: 'monospace' }}>$189.50</div>
                  <div style={{ fontSize: 11, color: '#22c55e' }}>+1.24%</div>
                </div>
              </div>
              {/* Fake positions */}
              <div style={{ padding: '12px 14px' }}>
                <div style={{ fontSize: 9, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Open Positions</div>
                {[['NVDA','LONG','$875.40','+$1,240'],['BTC/USD','SHORT','$67,240','+$340']].map(([sym,side,price,pnl]) => (
                  <div key={sym} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '7px 0', borderBottom: '1px solid #27272a', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: '#fafafa' }}>{sym}</span>
                    <span style={{ color: side === 'LONG' ? '#22c55e' : '#ef4444', fontWeight: 700 }}>{side}</span>
                    <span style={{ color: '#71717a', fontFamily: 'monospace' }}>{price}</span>
                    <span style={{ color: '#22c55e', fontFamily: 'monospace', fontWeight: 700, textAlign: 'right' }}>{pnl}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── NATIVE AD — Broker (after terminal) ── */}
      <div style={{ padding: '0 24px 40px', maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ maxWidth: 680 }}>
          <NativeAd variant="broker" size="md" />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SECTION 4 — FOUNDERS
      ══════════════════════════════════════════ */}
      <section style={{ padding: '96px 0', borderBottom: '1px solid #18181b' }}>
        <div className="section">
          <div style={{ maxWidth: 480, marginBottom: 52 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 14 }}>The Team</div>
            <h2 style={{ fontSize: 36, fontWeight: 900, color: '#fafafa', letterSpacing: -1, lineHeight: 1.1 }}>
              Built by traders who learned the hard way.
            </h2>
          </div>

          <div className="grid-3">
            {[
              { name: 'Neil Gilani', role: 'CEO & Co-Founder', color: '#22c55e', init: 'NG', quote: '"Financial education shouldn\'t cost more than a coffee."', bio: 'Built the entire YN Finance platform — trading terminal, market data pipeline, AI systems, and Arena. If it runs, Neil built it.' },
              { name: 'Yannai Richter', role: 'CTO & Co-Founder', color: '#3b82f6', init: 'YR', quote: '"The gap between learning a strategy and trading it should be zero seconds."', bio: 'Co-built the YN Finance stack and owns growth — ad strategy, creator outreach, and getting the platform in front of the right audiences.' },
              { name: 'Arjun Bhattula', role: 'COO & Co-Founder', color: '#a855f7', init: 'AB', quote: '"Every great trader had a mentor. We scaled that to a million people."', bio: 'Runs every partnership and instructor relationship. Personally brought nine world-class educators onto the platform.' },
            ].map(({ name, role, color, init, quote, bio }) => (
              <div key={name} className="card" style={{ padding: '24px 22px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, border: `2px solid ${color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color, flexShrink: 0 }}>{init}</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#fafafa' }}>{name}</div>
                    <div style={{ fontSize: 11, color, fontWeight: 600, marginTop: 1 }}>{role}</div>
                  </div>
                </div>
                <div style={{ fontSize: 13, color: '#a1a1aa', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14, paddingLeft: 10, borderLeft: `2px solid ${color}40` }}>{quote}</div>
                <div style={{ fontSize: 13, color: '#71717a', lineHeight: 1.65 }}>{bio}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════
          FINAL CTA
      ══════════════════════════════════════════ */}
      <section style={{ padding: '96px 0' }}>
        <div className="section" style={{ textAlign: 'center', maxWidth: 640, margin: '0 auto' }}>
          <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, color: '#fafafa', letterSpacing: -2, lineHeight: 1.05, marginBottom: 20 }}>
            Today&apos;s tournament<br />starts at 9:30 AM.
          </h2>
          <p style={{ fontSize: 16, color: '#71717a', marginBottom: 36, lineHeight: 1.7 }}>
            390 traders already registered. $4,400 pool. First place takes $1,320. $10 to enter — the rest is your skill.
          </p>
          <div className="btn-row" style={{ display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 16 }}>
            <Link href="/arena" className="btn-primary" style={{ fontSize: 16, padding: '15px 32px' }}>
              <Trophy size={17} /> Enter the Arena — $10
            </Link>
            <Link href="/courses" className="btn-ghost" style={{ fontSize: 16, padding: '15px 28px' }}>
              Browse Courses →
            </Link>
          </div>
          <div style={{ fontSize: 12, color: '#52525b' }}>12% house rake · Simulated trading · Real Stripe payouts · Skill-based competition</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #18181b', padding: '32px 0' }}>
        <div className="section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: '#22c55e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={11} color="#09090b" fill="#09090b" />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color: '#fafafa' }}>YN Finance</span>
          </div>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            {[
              ['/arena',   'Arena'],
              ['/courses', 'Courses'],
              ['/app',     'Terminal'],
              ['/arena/creator', 'Stream & Earn'],
              ['/privacy', 'Privacy'],
              ['/terms',   'Terms'],
            ].map(([href, label]) => (
              <Link key={label} href={href} className="nav-link" style={{ fontSize: 12 }}>{label}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#3f3f46' }}>
            © 2026 YN Finance · Not financial advice
          </div>
        </div>
      </footer>
    </div>
  )
}
