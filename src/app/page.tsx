'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Trophy, Play } from 'lucide-react'
import AdsterraBanner from '@/components/ads/AdsterraBanner'

const INSTRUCTORS = [
  { name: 'Ross Cameron', handle: 'Warrior Trading', color: '#ff4757', initials: 'RC', sub: '1.98M subscribers', tag: 'Day Trading' },
  { name: 'ICT', handle: 'Inner Circle Trader', color: '#1e90ff', initials: 'IC', sub: '1.8M subscribers', tag: 'Smart Money' },
  { name: 'Rayner Teo', handle: 'TradingwithRayner', color: '#00d4aa', initials: 'RT', sub: '2.1M subscribers', tag: 'Swing Trading' },
  { name: 'Graham Stephan', handle: '@GrahamStephan', color: '#00d4aa', initials: 'GS', sub: '5M subscribers', tag: 'Long-Term Investing' },
  { name: 'Kevin O\'Leary', handle: 'Mr. Wonderful', color: '#1e90ff', initials: 'KO', sub: 'Shark Tank Investor', tag: 'Portfolio Management' },
  { name: 'Wall St. Trapper', handle: '@WallStTrapper', color: '#ffa502', initials: 'WT', sub: 'Leon Howard', tag: 'Financial Literacy' },
  { name: 'Humbled Trader', handle: '@HumbledTrader', color: '#ffa502', initials: 'HT', sub: '1M subscribers', tag: 'Small Cap Momentum' },
  { name: 'Anton Kreil', handle: 'ITPM', color: '#a855f7', initials: 'AK', sub: 'Ex Goldman Sachs', tag: 'Institutional' },
]

const NAMES = ['Marcus T.','Sarah K.','Devon P.','Jordan M.','Aisha B.','Chris L.','Nina R.','Tyler W.','Priya S.','Alex M.']
const COLORS = ['#00d4aa','#1e90ff','#a855f7','#ffa502','#ff4757','#00d4aa','#1e90ff','#a855f7','#ffa502','#ff4757']

const TICKER_ITEMS = [
  'Marcus T. just won $156 in Daily Blitz',
  'Priya S. made +382% in Crypto Night',
  'Devon P. entered Pro Showdown',
  'Jordan M. won $89 · Forex Cup',
  'Aisha B. hit +214% in Daily Blitz',
  'Chris L. just entered Weekend Showdown',
  'Nina R. made +167% · $1 entry',
  'Tyler W. won $312 · tournament top 3',
  'Sarah K. up +290% in Crypto Night',
  'Alex M. placed #2 in Daily Blitz · $74 payout',
]

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      let start = 0; const step = target / 60
      const timer = setInterval(() => { start += step; if (start >= target) { setCount(target); clearInterval(timer) } else setCount(Math.floor(start)) }, 16)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

function BlitzCountdown() {
  const [secs, setSecs] = useState(0)
  useEffect(() => {
    const calc = () => {
      const now = new Date()
      const close = new Date(now)
      close.setHours(16, 0, 0, 0)
      if (now >= close) close.setDate(close.getDate() + 1)
      setSecs(Math.floor((close.getTime() - now.getTime()) / 1000))
    }
    calc()
    const t = setInterval(calc, 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = secs % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 28, color: '#ff4757', letterSpacing: 2 }}>
      {pad(h)}:{pad(m)}:{pad(s)}
    </span>
  )
}

function LiveLeaderboardPreview() {
  const [tick, setTick] = useState(0)
  useEffect(() => { const t = setInterval(() => setTick(n => n + 1), 1800); return () => clearInterval(t) }, [])
  const traders = NAMES.slice(0, 8).map((name, i) => {
    const seed = (i * 2654435761 + tick * 31337) >>> 0
    const pct = ((seed % 3200) - 1200) / 100
    return { name, pct, color: COLORS[i] }
  }).sort((a, b) => b.pct - a.pct)

  return (
    <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, overflow: 'hidden', width: '100%', maxWidth: 420 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 6px #00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
        <span style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Daily Blitz — LIVE</span>
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 900, color: '#ffa502', fontFamily: 'monospace' }}>$312 pool</span>
      </div>
      {traders.map((t, i) => (
        <div key={t.name} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 16px', borderBottom: '1px solid #0a1628', transition: 'all 0.4s ease', background: i < 2 ? `${t.color}08` : 'transparent' }}>
          <div style={{ width: 20, fontSize: 11, fontWeight: 800, color: i === 0 ? '#ffa502' : '#4a5e7a', fontFamily: 'monospace' }}>{i === 0 ? '👑' : `#${i + 1}`}</div>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: t.color }}>{t.name.slice(0, 2).toUpperCase()}</div>
          <div style={{ flex: 1, fontSize: 12, fontWeight: 600, color: '#cdd6f4' }}>{t.name}</div>
          <div style={{ fontSize: 13, fontWeight: 900, color: t.pct >= 0 ? '#00d4aa' : '#ff4757', fontFamily: 'monospace' }}>{t.pct >= 0 ? '+' : ''}{t.pct.toFixed(1)}%</div>
          {i < 2 && <div style={{ fontSize: 8, color: t.color, background: `${t.color}18`, padding: '2px 5px', borderRadius: 3, fontWeight: 700 }}>WIN</div>}
        </div>
      ))}
      <div style={{ padding: '10px 16px', fontSize: 10, color: '#4a5e7a', textAlign: 'center' }}>390 traders competing · Updates every 2 seconds</div>
    </div>
  )
}

export default function HomePage() {
  const [winIndex, setWinIndex] = useState(0)
  const WINS = [
    { user: 'Marcus T.', gain: '+$2,840', note: 'Daily Blitz winner', time: 'Today' },
    { user: 'Sarah K.', gain: '+47%', note: 'Crypto Night Session', time: 'Yesterday' },
    { user: 'Dev P.', gain: '+$1,200', note: 'Weekend Forex Cup', time: '2 days ago' },
    { user: 'Jordan M.', gain: '+$890', note: 'Daily Blitz', time: 'Today' },
  ]
  useEffect(() => { const t = setInterval(() => setWinIndex(i => (i + 1) % WINS.length), 2800); return () => clearInterval(t) }, [])

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4', overflowX: 'hidden' }}>
      <style>{`
        @keyframes yn-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-10px) } }
        @keyframes yn-shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes yn-pulse { 0%,100% { opacity:1; transform:scale(1) } 50% { opacity:0.5; transform:scale(0.85) } }
        @keyframes yn-slide { from { opacity:0; transform:translateY(16px) } to { opacity:1; transform:translateY(0) } }
        @keyframes yn-ticker { 0% { transform: translateX(0) } 100% { transform: translateX(-50%) } }
        .yn-gradient { background: linear-gradient(135deg, #ffa502, #ff4757, #a855f7); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: yn-shimmer 4s linear infinite; }
        .yn-teal { background: linear-gradient(135deg, #00d4aa, #1e90ff); background-size: 200% auto; -webkit-background-clip: text; -webkit-text-fill-color: transparent; animation: yn-shimmer 4s linear infinite; }
        .glass { background: rgba(7,18,32,0.85); backdrop-filter: blur(12px); }
        @media (max-width: 768px) {
          .hero-h1 { font-size: 38px !important; }
          .two-col { grid-template-columns: 1fr !important; }
          .four-col { grid-template-columns: repeat(2,1fr) !important; }
          .three-col { grid-template-columns: 1fr !important; }
          .hide-mob { display: none !important; }
          .mob-sticky { display: flex !important; }
        }
        @media (min-width: 769px) { .mob-sticky { display: none !important; } }
      `}</style>

      {/* ── NAV ── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(26,45,74,0.6)', padding: '0 24px' }} className="glass">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #ffa502, #ff4757)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(255,165,2,0.5)' }}>
              <Trophy size={16} color="#fff" />
            </div>
            <div>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 17, letterSpacing: -0.5 }}>YN Finance</span>
              <span style={{ fontSize: 9, color: '#ffa502', display: 'block', letterSpacing: 3, marginTop: -2 }}>ARENA</span>
            </div>
          </Link>

          <div style={{ display: 'flex', gap: 24, fontSize: 13, flex: 1 }} className="hide-mob">
            {[['#how','How It Works'],['#prizes','Prizes'],['#courses','Courses']].map(([h, l]) => (
              <a key={l} href={h} style={{ color: '#7f93b5', textDecoration: 'none' }}>{l}</a>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto', alignItems: 'center' }}>
            <Link href="/courses" className="hide-mob" style={{ fontSize: 12, color: '#7f93b5', textDecoration: 'none', padding: '8px 16px' }}>Courses</Link>
            <Link href="/arena" style={{ fontSize: 12, fontWeight: 700, color: '#ffa502', textDecoration: 'none', padding: '8px 16px', borderRadius: 8, border: '1px solid rgba(255,165,2,0.3)', background: 'rgba(255,165,2,0.08)', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              <Trophy size={12} /> Open Arena
            </Link>
            <Link href="/arena" style={{ fontSize: 13, fontWeight: 800, color: '#040c14', background: 'linear-gradient(135deg, #ffa502, #ff4757)', textDecoration: 'none', padding: '10px 20px', borderRadius: 10, boxShadow: '0 0 20px rgba(255,165,2,0.4)', whiteSpace: 'nowrap' }}>
              Compete Now →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── SOCIAL PROOF TICKER ── */}
      <div style={{ background: 'linear-gradient(90deg, #071220 0%, #0a1a2e 100%)', borderBottom: '1px solid #1a2d4a', borderLeft: '3px solid #00d4aa', overflow: 'hidden', position: 'relative', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', height: 36, overflow: 'hidden' }}>
          <div style={{ flexShrink: 0, padding: '0 14px', fontSize: 9, fontWeight: 900, color: '#00d4aa', textTransform: 'uppercase', letterSpacing: '0.15em', borderRight: '1px solid #1a2d4a', height: '100%', display: 'flex', alignItems: 'center', background: 'rgba(0,212,170,0.07)', whiteSpace: 'nowrap' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite', marginRight: 7 }} />
            LIVE WINS
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'inline-flex', animation: 'yn-ticker 36s linear infinite', whiteSpace: 'nowrap' }}>
              {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', fontSize: 12, color: '#7f93b5', padding: '0 24px', gap: 8, flexShrink: 0 }}>
                  <span style={{ color: '#00d4aa', fontSize: 10 }}>●</span>
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── HERO ── */}
      <section style={{ minHeight: '95vh', display: 'flex', alignItems: 'center', padding: '60px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 70% 60% at 30% 50%, rgba(255,165,2,0.07), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 50% 50% at 80% 50%, rgba(168,85,247,0.05), transparent)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', display: 'grid', gridTemplateColumns: '1fr 420px', gap: 64, alignItems: 'center' }} className="two-col">
          <div>
            {/* Live badge */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,165,2,0.1)', border: '1px solid rgba(255,165,2,0.25)', borderRadius: 100, padding: '8px 18px', fontSize: 12, color: '#ffa502', fontWeight: 700, marginBottom: 28 }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ffa502', boxShadow: '0 0 6px #ffa502', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ animation: 'yn-pulse 1.5s ease-in-out infinite' }}>390 traders competing RIGHT NOW</span>
              <span style={{ color: '#4a5e7a', fontWeight: 400 }}>· $312 live prize pool</span>
            </div>

            <h1 className="hero-h1" style={{ fontSize: 'clamp(44px,6vw,78px)', fontWeight: 900, lineHeight: 1.0, letterSpacing: -3, marginBottom: 20 }}>
              <span style={{ color: '#fff' }}>The fastest $1</span><br />
              <span className="yn-gradient">you&apos;ll ever make</span><br />
              <span style={{ color: '#fff', fontSize: 'clamp(22px,3vw,40px)', fontWeight: 700, letterSpacing: -1 }}>— or lose.</span>
            </h1>

            <p style={{ fontSize: 'clamp(15px,1.8vw,19px)', color: '#7f93b5', maxWidth: 540, lineHeight: 1.75, marginBottom: 28 }}>
              Daily tournaments. Real entry fees. Simulated trading — but the prize pool is 100% real cash.
              Top performers walk away with multiples of their entry. Every trade streamed live.
            </p>

            {/* Hero stats — big and scary */}
            <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 32, padding: '20px 24px', background: 'rgba(7,18,32,0.7)', border: '1px solid #1a2d4a', borderRadius: 14 }}>
              <div>
                <div style={{ fontSize: 48, fontWeight: 900, fontFamily: 'monospace', background: 'linear-gradient(135deg, #ffa502, #ff4757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', lineHeight: 1 }}>
                  $<AnimatedCounter target={47320} />
                </div>
                <div style={{ fontSize: 11, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>paid out this month</div>
              </div>
              <div style={{ width: 1, background: '#1a2d4a', flexShrink: 0 }} />
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 36, fontWeight: 900, fontFamily: 'monospace', color: '#00d4aa', lineHeight: 1 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 8px #00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite', flexShrink: 0 }} />
                  <AnimatedCounter target={390} />
                </div>
                <div style={{ fontSize: 11, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>traders competing right now</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <Link href="/arena" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #ffa502, #ff4757)', color: '#fff', fontWeight: 900, textDecoration: 'none', padding: '16px 36px', borderRadius: 14, fontSize: 16, boxShadow: '0 0 40px rgba(255,165,2,0.4)', whiteSpace: 'nowrap' }}>
                <Trophy size={18} /> Enter Today&apos;s Tournament — $1
              </Link>
              <Link href="/arena" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.05)', color: '#cdd6f4', fontWeight: 700, textDecoration: 'none', padding: '16px 28px', borderRadius: 14, fontSize: 15, border: '1px solid rgba(255,255,255,0.1)' }}>
                <Play size={15} /> Watch Live Free
              </Link>
            </div>

            <div style={{ display: 'flex', gap: 24, fontSize: 12, color: '#4a5e7a', flexWrap: 'wrap' }}>
              {['✓ $1 entry · no subscription', '✓ Top 20% always paid out', '✓ Watch anyone\'s trades live'].map(t => (
                <span key={t}>{t}</span>
              ))}
            </div>

            {/* Live win ticker */}
            <div style={{ marginTop: 28, display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 100, padding: '9px 18px', fontSize: 12 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#00d4aa', display: 'inline-block', animation: 'yn-pulse 1.5s ease-in-out infinite' }} />
              <span style={{ color: '#4a5e7a' }}>Latest win:</span>
              <span style={{ color: '#fff', fontWeight: 700 }}>{WINS[winIndex].user}</span>
              <span style={{ color: '#00d4aa', fontWeight: 900, fontFamily: 'monospace' }}>{WINS[winIndex].gain}</span>
              <span style={{ color: '#4a5e7a' }}>{WINS[winIndex].note} · {WINS[winIndex].time}</span>
            </div>
          </div>

          {/* Live leaderboard preview */}
          <div style={{ animation: 'yn-float 5s ease-in-out infinite' }} className="hide-mob">
            <LiveLeaderboardPreview />
          </div>
        </div>
      </section>

      {/* ── FOMO: BLITZ COUNTDOWN BANNER ── */}
      <section style={{ padding: '0 24px 0' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'block' }}>
            <div style={{ background: 'linear-gradient(90deg, rgba(255,71,87,0.12) 0%, rgba(255,165,2,0.10) 100%)', border: '1px solid rgba(255,71,87,0.35)', borderRadius: 16, padding: '20px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>⚡</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: '#ff4757', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2 }}>Today&apos;s Daily Blitz closes in</div>
                  <BlitzCountdown />
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#ffa502', fontFamily: 'monospace' }}>47</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>spots remaining</div>
                </div>
                <div style={{ background: 'linear-gradient(135deg, #ffa502, #ff4757)', color: '#fff', fontWeight: 900, padding: '12px 24px', borderRadius: 10, fontSize: 14, whiteSpace: 'nowrap' }}>
                  Claim Your Spot →
                </div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* ── STATS ── */}
      <section style={{ borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a', background: 'rgba(7,18,32,0.6)', padding: '44px 24px', marginTop: 32 }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32, textAlign: 'center' }} className="four-col">
          {[
            { value: 1, suffix: '', label: '$1 entry fee', prefix: '$' },
            { value: 390, suffix: '+', label: 'Traders per tournament' },
            { value: 20, suffix: '%', label: 'Win rate (top traders paid)' },
            { value: 312, suffix: '+', label: 'Today\'s live prize pool', prefix: '$' },
          ].map(({ value, suffix, label, prefix }) => (
            <div key={label}>
              <div style={{ fontSize: 'clamp(28px,4vw,48px)', fontWeight: 900, background: 'linear-gradient(135deg, #ffa502, #ff4757)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'monospace' }}>
                {prefix}<AnimatedCounter target={value} suffix={suffix} />
              </div>
              <div style={{ fontSize: 12, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW THE MONEY WORKS ── */}
      <section style={{ padding: '88px 24px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#ffa502', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>The Prize Model</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Here&apos;s exactly how the money works.</h2>
            <p style={{ color: '#4a5e7a', fontSize: 15, maxWidth: 500, margin: '0 auto' }}>Simulated trading. Real entry fees. Real cash prizes. Top performers multiply their entry.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 20, overflow: 'hidden' }} className="three-col">
            {[
              { icon: '💵', step: '01', color: '#00d4aa', title: 'Pay $10 Entry', desc: 'Pick a tournament tier. Pay with Stripe. You\'re in instantly — no waiting, no approval.' },
              { icon: '📊', step: '02', color: '#1e90ff', title: 'Trade 6 Hours', desc: 'You get a $10K simulated account. Trade stocks, crypto, forex. Every move is live-streamed on the leaderboard.' },
              { icon: '🏆', step: '03', color: '#ffa502', title: 'Top 10% Multiply', desc: 'Tournament closes at 4 PM. Top 10 traders split 80% of the prize pool. $10 entry can become $30, $50, or more.' },
            ].map(({ icon, step, color, title, desc }, i) => (
              <div key={step} style={{ padding: '32px 28px', borderRight: i < 2 ? '1px solid #1a2d4a' : 'none', position: 'relative' }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: '#0f1f38', fontFamily: 'monospace', position: 'absolute', top: 0, right: 12, lineHeight: 1 }}>{step}</div>
                <div style={{ fontSize: 40, marginBottom: 18 }}>{icon}</div>
                <div style={{ fontWeight: 900, color: '#fff', fontSize: 17, marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#4a5e7a', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>

          {/* Example math callout */}
          <div style={{ marginTop: 20, background: 'rgba(0,212,170,0.07)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 14, padding: '18px 28px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20 }}>💡</span>
            <div style={{ flex: 1 }}>
              <span style={{ color: '#00d4aa', fontWeight: 900, fontSize: 15 }}>Example: </span>
              <span style={{ color: '#cdd6f4', fontSize: 14 }}>$10 entry → make +200% on your simulated account → finish in top 3 → </span>
              <span style={{ color: '#ffa502', fontWeight: 900, fontSize: 15 }}>walk away with $30 cash.</span>
              <span style={{ color: '#4a5e7a', fontSize: 13 }}> Payouts via Stripe within 24 hours.</span>
            </div>
            <Link href="/arena" style={{ background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', color: '#040c14', fontWeight: 900, textDecoration: 'none', padding: '12px 22px', borderRadius: 10, fontSize: 13, whiteSpace: 'nowrap' }}>
              Try It — $10 →
            </Link>
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how" style={{ padding: '88px 24px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, color: '#ffa502', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>How It Works</div>
            <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Four steps. Real money.</h2>
            <p style={{ color: '#4a5e7a', fontSize: 15 }}>Simple enough to start in 60 seconds. Competitive enough to last a lifetime.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }} className="four-col">
            {[
              { step: '01', icon: '💵', color: '#00d4aa', title: 'Pay $1 Entry', desc: 'Pick a tournament. Pay $1–$10 entry fee. You\'re in the game instantly.' },
              { step: '02', icon: '📊', color: '#1e90ff', title: 'Trade Live', desc: 'You get a $10K simulated account. Trade stocks, forex, crypto — whatever the tournament allows.' },
              { step: '03', icon: '👁️', color: '#a855f7', title: 'Spectators Watch', desc: 'Anyone can watch the live leaderboard. Every trade, every position — streamed in real-time like ESPN.' },
              { step: '04', icon: '🏆', color: '#ffa502', title: 'Top 20% Wins', desc: 'Tournament ends at market close. Top 20% splits the prize pool. Payouts within 24 hours.' },
            ].map(({ step, icon, color, title, desc }) => (
              <div key={step} style={{ background: '#071220', border: `1px solid ${color}25`, borderRadius: 16, padding: '28px 22px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ fontSize: 64, fontWeight: 900, color: '#0f1f38', fontFamily: 'monospace', position: 'absolute', top: 0, right: 12, lineHeight: 1 }}>{step}</div>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{icon}</div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: 15, marginBottom: 10 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#4a5e7a', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRIZE STRUCTURE ── */}
      <section id="prizes" style={{ padding: '0 24px 88px' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#ffa502', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Prize Structure</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>The math works in your favor.</h2>
            <p style={{ color: '#4a5e7a' }}>80% of all entry fees go to winning traders. 20% is the platform cut.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 16 }} className="two-col">
            {/* Example with 500 players */}
            <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 12, color: '#ffa502', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>$1 Tournament · 500 players example</div>
              {[
                { rank: '🥇 1st Place', pct: '40%', amount: '$160' },
                { rank: '🥈 2nd Place', pct: '25%', amount: '$100' },
                { rank: '🥉 3rd Place', pct: '15%', amount: '$60' },
                { rank: 'Top 4–10', pct: '12% split', amount: '~$8.50 each' },
                { rank: 'Top 11–100', pct: '8% split', amount: '~$0.45 each' },
              ].map(({ rank, pct, amount }) => (
                <div key={rank} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #0f1f38' }}>
                  <span style={{ fontSize: 13, color: '#cdd6f4', fontWeight: 600 }}>{rank}</span>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 14, fontWeight: 900, color: '#ffa502', fontFamily: 'monospace' }}>{amount}</span>
                    <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 8 }}>{pct}</span>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: 16, fontSize: 11, color: '#4a5e7a' }}>Total pool: $400 · 500 × $1 × 80%</div>
            </div>

            {/* Why this model works */}
            <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, padding: 28 }}>
              <div style={{ fontSize: 12, color: '#00d4aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>Why This Is Different</div>
              {[
                { icon: '⚡', title: 'Skill-based, not luck', desc: 'You win by being a better trader. Every edge you develop directly translates to cash.' },
                { icon: '👁️', title: 'Public leaderboard', desc: 'Every trade is visible to spectators. This is accountability that makes you better.' },
                { icon: '📈', title: 'Scales with skill', desc: 'Win consistently? Move to higher-entry tournaments. $1 → $5 → $10 → $50 entries.' },
                { icon: '🌍', title: 'Anyone, anywhere', desc: 'You need $1 and an internet connection. We\'ve democratized competition.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
                  <div style={{ fontSize: 20, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', marginBottom: 3 }}>{title}</div>
                    <div style={{ fontSize: 12, color: '#4a5e7a', lineHeight: 1.6 }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST SIGNALS ── */}
      <section style={{ padding: '0 24px 88px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          {/* Testimonials */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: '#a855f7', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>What Traders Say</div>
            <h2 style={{ fontSize: 'clamp(24px,3vw,38px)', fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Real entries. Real results.</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18, marginBottom: 40 }} className="three-col">
            {[
              { quote: 'I turned $25 into $74 in my first Pro Showdown. Finished 3rd out of 400. The live leaderboard made it feel like a real competition.', name: 'Devon P.', tag: 'Pro Showdown — 3rd place', color: '#00d4aa' },
              { quote: 'Came in skeptical. Paid $10, traded the Daily Blitz, ended up +310% on my sim account. Walked away with $34. Not life-changing — but proof it works.', name: 'Marcus T.', tag: 'Daily Blitz — 2nd place', color: '#ffa502' },
              { quote: 'I\'ve spent $500 on trading courses. $1 to actually compete and win money is the best ROI I\'ve ever seen. Already up on the month.', name: 'Priya S.', tag: 'Crypto Night — Top 5', color: '#a855f7' },
            ].map(({ quote, name, tag, color }) => (
              <div key={name} style={{ background: '#071220', border: `1px solid ${color}25`, borderRadius: 16, padding: '24px 22px' }}>
                <div style={{ fontSize: 28, color: color, marginBottom: 12, lineHeight: 1 }}>&ldquo;</div>
                <div style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.75, marginBottom: 18, fontStyle: 'italic' }}>{quote}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 900, color, flexShrink: 0 }}>{name.slice(0, 2).toUpperCase()}</div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{name}</div>
                    <div style={{ fontSize: 10, color, fontWeight: 700 }}>{tag}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Trust badges */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 28, flexWrap: 'wrap', padding: '24px 28px', background: 'rgba(7,18,32,0.6)', border: '1px solid #1a2d4a', borderRadius: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 32, height: 32, background: '#635BFF', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 900, color: '#fff', flexShrink: 0 }}>S</div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Powered by Stripe</div>
                <div style={{ fontSize: 10, color: '#4a5e7a' }}>Secure payments & instant payouts</div>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: '#1a2d4a', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔒</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Simulated trading — real money prizes</div>
                <div style={{ fontSize: 10, color: '#4a5e7a' }}>No real capital at risk. Prize pool is 100% real cash.</div>
              </div>
            </div>
            <div style={{ width: 1, height: 36, background: '#1a2d4a', flexShrink: 0 }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 20 }}>⚡</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#fff' }}>Payouts within 24 hours</div>
                <div style={{ fontSize: 10, color: '#4a5e7a' }}>Winners paid automatically via Stripe</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── GATEWAY: 3 paths ── */}
      <section style={{ padding: '0 24px 88px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: '#fff', letterSpacing: -1 }}>Where do you want to start?</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 18 }} className="two-col">
            {[
              { href: '/arena', emoji: '🏆', color: '#ffa502', tag: 'NEW', tagBg: '#ffa50220', title: 'YN Arena', subtitle: 'Compete in daily tournaments', points: ['$1 entry fee', 'Live leaderboard', 'Top 20% wins real money', 'Spectator mode'], cta: 'Enter the Arena →', ctaBg: 'linear-gradient(135deg, #ffa502, #ff4757)' },
              { href: '/courses', emoji: '📚', color: '#00d4aa', tag: '$0.99', tagBg: '#00d4aa15', title: 'Courses', subtitle: 'Learn from the best traders', points: ['9 expert instructors', 'AI-narrated lessons', 'Built-in practice mode', 'Knowledge quizzes'], cta: 'Browse Courses →', ctaBg: '#00d4aa' },
              { href: '/app', emoji: '📊', color: '#1e90ff', tag: 'FREE', tagBg: '#1e90ff15', title: 'Trading Terminal', subtitle: 'Professional paper trading', points: ['$100K paper account', 'Real-time market data', 'AI chart analyzer', 'Trade community'], cta: 'Launch Terminal →', ctaBg: '#1e90ff' },
            ].map(({ href, emoji, color, tag, tagBg, title, subtitle, points, cta, ctaBg }) => (
              <Link key={title} href={href} style={{ textDecoration: 'none', display: 'block', background: '#071220', border: `1px solid ${color}30`, borderRadius: 20, padding: '32px 28px', transition: 'all 0.25s', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = color; el.style.boxShadow = `0 0 48px ${color}20`; el.style.transform = 'translateY(-4px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = `${color}30`; el.style.boxShadow = 'none'; el.style.transform = 'none' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 10, fontWeight: 800, padding: '3px 8px', borderRadius: 5, background: tagBg, color }}>{tag}</div>
                <div style={{ fontSize: 44, marginBottom: 16 }}>{emoji}</div>
                <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{subtitle}</div>
                <h3 style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 20 }}>{title}</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 28 }}>
                  {points.map(p => <div key={p} style={{ fontSize: 12, color: '#7f93b5', display: 'flex', alignItems: 'center', gap: 7 }}><span style={{ color }}>✓</span>{p}</div>)}
                </div>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: ctaBg, color: title === 'Courses' ? '#040c14' : '#fff', fontWeight: 900, padding: '12px 22px', borderRadius: 10, fontSize: 13 }}>
                  {cta}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
        <AdsterraBanner />
      </div>

      {/* ── COURSES (secondary) ── */}
      <section id="courses" style={{ padding: '0 24px 88px', borderTop: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', paddingTop: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 40, flexWrap: 'wrap', gap: 16 }}>
            <div>
              <div style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 10 }}>Education Platform</div>
              <h2 style={{ fontSize: 'clamp(24px,4vw,40px)', fontWeight: 900, color: '#fff', letterSpacing: -1 }}>
                Learn from the <span className="yn-teal">world&apos;s best traders</span>
              </h2>
              <p style={{ fontSize: 14, color: '#4a5e7a', marginTop: 10 }}>Better traders win more tournaments. $0.99 a course — sharpen your edge.</p>
            </div>
            <Link href="/courses" style={{ fontSize: 13, fontWeight: 700, color: '#00d4aa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
              All Courses <ArrowRight size={14} />
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="four-col">
            {INSTRUCTORS.map(inst => (
              <Link key={inst.name} href="/courses" style={{ textDecoration: 'none' }}>
                <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 14, padding: 20, textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = inst.color; el.style.boxShadow = `0 8px 32px ${inst.color}20`; el.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a2d4a'; el.style.boxShadow = 'none'; el.style.transform = 'none' }}>
                  <div style={{ width: 52, height: 52, borderRadius: 14, background: `linear-gradient(135deg, ${inst.color}40, ${inst.color}18)`, border: `2px solid ${inst.color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 16, fontWeight: 900, color: inst.color }}>
                    {inst.initials}
                  </div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: 13, marginBottom: 2 }}>{inst.name}</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 8 }}>{inst.sub}</div>
                  <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: `${inst.color}18`, color: inst.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{inst.tag}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOUNDERS ── */}
      <section style={{ padding: '80px 24px', background: 'rgba(7,18,32,0.5)', borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <div style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 16 }}>The Team</div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,42px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Built by traders who got it wrong first.</h2>
            <p style={{ fontSize: 14, color: '#4a5e7a', maxWidth: 500, margin: '0 auto' }}>Creating the infrastructure for trading as a competitive sport — from the ground up.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }} className="two-col">
            {[
              { name: 'Neil Gilani', role: 'CEO & Co-Founder', initials: 'NG', color: '#00d4aa', quote: '"Trading skill should be rewarded publicly. We built the stage."', bio: 'Built the entire YN Finance platform — terminal, market data pipeline, AI systems, tournament infrastructure, and the Arena. If it runs, Neil built it.', tags: ['Vision', 'Engineering', 'Product'] },
              { name: 'Yannai Richter', role: 'CTO & Co-Founder', initials: 'YR', color: '#1e90ff', quote: '"The gap between watching a trade and making one should be zero seconds."', bio: 'Co-built the YN Finance stack and runs growth — ad strategy, creator partnerships, and getting the platform in front of the right audiences. Engineer + marketer.', tags: ['Engineering', 'Marketing', 'Growth'] },
              { name: 'Arjun Bhattula', role: 'COO & Co-Founder', initials: 'AB', color: '#a855f7', quote: '"Every great trader had a mentor. We built the arena where they compete."', bio: 'Runs every partnership, instructor relationship, and growth initiative. Personally brought nine world-class educators onto the platform. The reason the lineup exists.', tags: ['Operations', 'Partnerships', 'Growth'] },
            ].map(({ name, role, initials, color, quote, bio, tags }) => (
              <div key={name} style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 20, padding: 28, transition: 'all 0.25s' }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = color; el.style.boxShadow = `0 8px 40px ${color}18`; el.style.transform = 'translateY(-3px)' }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor = '#1a2d4a'; el.style.boxShadow = 'none'; el.style.transform = 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 13, background: `linear-gradient(135deg, ${color}40, ${color}18)`, border: `2px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 900, color, flexShrink: 0 }}>{initials}</div>
                  <div><div style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>{name}</div><div style={{ fontSize: 11, color, fontWeight: 700, marginTop: 1 }}>{role}</div></div>
                </div>
                <div style={{ fontSize: 12, color: '#cdd6f4', fontStyle: 'italic', lineHeight: 1.6, marginBottom: 14, paddingLeft: 12, borderLeft: `2px solid ${color}50` }}>{quote}</div>
                <p style={{ fontSize: 12, color: '#7f93b5', lineHeight: 1.8, marginBottom: 18 }}>{bio}</p>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {tags.map(tag => <span key={tag} style={{ fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: `${color}15`, color, border: `1px solid ${color}30` }}>{tag}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section style={{ padding: '88px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,165,2,0.07), transparent)', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <div style={{ fontSize: 'clamp(34px,5vw,58px)', fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.05, marginBottom: 20 }}>
            The tournament starts<br /><span className="yn-gradient">at 9:30 AM.</span>
          </div>
          <p style={{ fontSize: 16, color: '#7f93b5', marginBottom: 36, lineHeight: 1.7 }}>
            390 traders are already registered for today&apos;s Daily Blitz. $312 in the prize pool. One dollar gets you in.
          </p>
          <Link href="/arena" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, #ffa502, #ff4757)', color: '#fff', fontWeight: 900, textDecoration: 'none', padding: '18px 44px', borderRadius: 16, fontSize: 18, boxShadow: '0 0 60px rgba(255,165,2,0.4)' }}>
            <Trophy size={20} /> Compete Now — $1 Entry
          </Link>
          <div style={{ marginTop: 16, fontSize: 12, color: '#4a5e7a' }}>Or <Link href="/arena" style={{ color: '#4a5e7a', textDecoration: 'underline' }}>watch free as a spectator</Link> · No account required to observe</div>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div className="mob-sticky" style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, padding: '12px 16px 16px', background: 'linear-gradient(to top, #040c14 80%, transparent)', alignItems: 'center' }}>
        <Link href="/arena" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'linear-gradient(135deg, #ffa502, #ff4757)', color: '#fff', fontWeight: 900, textDecoration: 'none', padding: '14px 20px', borderRadius: 14, fontSize: 15, boxShadow: '0 0 32px rgba(255,165,2,0.5)' }}>
          ⚡ Compete Now — $10 Entry
        </Link>
      </div>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a2d4a', padding: '32px 24px', paddingBottom: 80 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #ffa502, #ff4757)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={11} color="#fff" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff' }}>YN Finance Arena</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
            {[['/courses','Courses'],['/app','Terminal'],['/privacy','Privacy'],['/terms','Terms']].map(([h,l]) => (
              <Link key={l} href={h} style={{ color: '#4a5e7a', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#4a5e7a', maxWidth: 420, textAlign: 'right' }}>
            © 2026 YN Finance · Trading tournaments use simulated accounts only · Not financial advice · Results not guaranteed
          </div>
        </div>
      </footer>
    </div>
  )
}
