'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, Star, Play, ChevronRight, TrendingUp, Zap, BookOpen, Users, Award, Sparkles } from 'lucide-react'

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

const WINS = [
  { user: 'Marcus T.', gain: '+$2,840', course: 'Gap & Go', time: '3 weeks' },
  { user: 'Sarah K.', gain: '+47%', course: 'ICT Smart Money', time: '6 weeks' },
  { user: 'Dev P.', gain: '+$1,200', course: 'Options Income', time: '2 weeks' },
  { user: 'Jordan M.', gain: '+32%', course: 'Trend Following', time: '1 month' },
  { user: 'Aisha B.', gain: '+$890', course: 'VWAP Day Trading', time: '10 days' },
  { user: 'Chris L.', gain: '+$4,100', course: 'Gap & Go', time: '5 weeks' },
  { user: 'Nina R.', gain: '+28%', course: "Kevin O'Leary Portfolio", time: '2 months' },
  { user: 'Tyler W.', gain: '+$650', course: 'Covered Calls', time: '3 weeks' },
]

const CATEGORIES = [
  { name: 'Day Trading',        color: '#ff4757', count: 2, icon: '⚡' },
  { name: 'Swing Trading',      color: '#00d4aa', count: 2, icon: '📈' },
  { name: 'Options',            color: '#a855f7', count: 1, icon: '🎯' },
  { name: 'Long-Term Investing',color: '#1e90ff', count: 2, icon: '🏆' },
  { name: 'Financial Literacy', color: '#ffa502', count: 1, icon: '📚' },
  { name: 'Institutional',      color: '#a855f7', count: 1, icon: '🏦' },
]

function AnimatedCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      let start = 0
      const step = target / 60
      const timer = setInterval(() => {
        start += step
        if (start >= target) { setCount(target); clearInterval(timer) }
        else setCount(Math.floor(start))
      }, 16)
    }, { threshold: 0.5 })
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

export default function HomePage() {
  const [winIndex, setWinIndex] = useState(0)

  useEffect(() => {
    const t = setInterval(() => setWinIndex(i => (i + 1) % WINS.length), 3000)
    return () => clearInterval(t)
  }, [])


  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4', overflowX: 'hidden' }}>
      <style>{`
        @keyframes float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-8px) } }
        @keyframes shimmer { 0% { background-position: -200% center } 100% { background-position: 200% center } }
        @keyframes slideUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes spin-slow { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }
        .float { animation: float 4s ease-in-out infinite }
        .slide-up { animation: slideUp 0.6s ease forwards }
        .gradient-text {
          background: linear-gradient(135deg, #00d4aa, #1e90ff, #a855f7);
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 4s linear infinite;
        }
        .glass { background: rgba(7,18,32,0.8); backdrop-filter: blur(12px); }
        .card-hover { transition: all 0.3s cubic-bezier(0.4,0,0.2,1); }
        .card-hover:hover { transform: translateY(-4px); }
        .glow-green { box-shadow: 0 0 40px rgba(0,212,170,0.3); }
        @media (max-width: 768px) {
          .hero-h1 { font-size: 36px !important; }
          .instructor-grid { grid-template-columns: repeat(2,1fr) !important; }
          .stats-grid { grid-template-columns: repeat(2,1fr) !important; }
          .cat-grid { grid-template-columns: repeat(2,1fr) !important; }
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* Sticky Nav */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid rgba(26,45,74,0.5)', padding: '0 24px' }} className="glass">
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', height: 64, gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(0,212,170,0.4)' }}>
              <Zap size={16} color="#040c14" fill="#040c14" />
            </div>
            <div>
              <span style={{ fontWeight: 900, color: '#fff', fontSize: 17, letterSpacing: -0.5 }}>YN Finance</span>
              <span style={{ fontSize: 10, color: '#00d4aa', display: 'block', letterSpacing: 2, marginTop: -2 }}>LEARN TO TRADE</span>
            </div>
          </Link>

          <div style={{ display: 'flex', gap: 28, fontSize: 13, flex: 1 }} className="hide-mobile">
            {[['#categories','Courses'],['#instructors','Instructors'],['#results','Student Wins'],['/quiz','Take the Quiz ✨']].map(([href, label]) => (
              <Link key={label} href={href} style={{ color: label.includes('Quiz') ? '#00d4aa' : '#7f93b5', textDecoration: 'none', fontWeight: label.includes('Quiz') ? 700 : 500 }}>{label}</Link>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginLeft: 'auto' }}>
            <Link href="/courses" style={{ fontSize: 12, color: '#7f93b5', textDecoration: 'none', padding: '8px 16px' }}>Browse Courses</Link>
            <Link href="/quiz" style={{ fontSize: 13, fontWeight: 800, color: '#040c14', background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', textDecoration: 'none', padding: '10px 20px', borderRadius: 10, boxShadow: '0 0 20px rgba(0,212,170,0.4)', whiteSpace: 'nowrap' }}>
              Find My Type →
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ minHeight: '92vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Background decoration */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 50% at 50% -10%, rgba(0,212,170,0.12), transparent)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '20%', left: '10%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(30,144,255,0.06), transparent)', pointerEvents: 'none' }} className="float" />
        <div style={{ position: 'absolute', bottom: '20%', right: '10%', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(168,85,247,0.06), transparent)', pointerEvents: 'none', animationDelay: '2s' }} className="float" />

        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(0,212,170,0.1)', border: '1px solid rgba(0,212,170,0.25)', borderRadius: 100, padding: '8px 20px', marginBottom: 28, fontSize: 12, color: '#00d4aa', fontWeight: 700 }}>
          <Sparkles size={13} /> 9 World-Class Instructors · $0.99 Per Course · Practice Mode Built-In
        </div>

        <h1 className="hero-h1" style={{ fontSize: 'clamp(42px,7vw,80px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: -3, marginBottom: 24, maxWidth: 900 }}>
          <span style={{ color: '#fff' }}>Learn to trade from the</span><br />
          <span className="gradient-text">best in the world.</span>
        </h1>

        <p style={{ fontSize: 'clamp(16px,2vw,20px)', color: '#7f93b5', maxWidth: 580, lineHeight: 1.7, marginBottom: 40 }}>
          Ross Cameron. ICT. Graham Stephan. Kevin O&apos;Leary. Real traders, real strategies, real AI-powered lessons — for $0.99 each.
        </p>

        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 60 }}>
          <Link href="/quiz" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', color: '#040c14', fontWeight: 900, textDecoration: 'none', padding: '16px 36px', borderRadius: 14, fontSize: 16, boxShadow: '0 0 40px rgba(0,212,170,0.5)' }} className="glow-green">
            <Sparkles size={18} /> Find My Trading Type
          </Link>
          <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'rgba(255,255,255,0.06)', color: '#cdd6f4', fontWeight: 700, textDecoration: 'none', padding: '16px 32px', borderRadius: 14, fontSize: 16, border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(8px)' }}>
            Browse All Courses <ChevronRight size={16} />
          </Link>
        </div>

        {/* Live student wins ticker */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(0,212,170,0.08)', border: '1px solid rgba(0,212,170,0.2)', borderRadius: 100, padding: '10px 20px', fontSize: 13 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00d4aa', boxShadow: '0 0 8px #00d4aa', animation: 'spin-slow 2s linear infinite' }} />
          <span style={{ color: '#4a5e7a' }}>Recent win:</span>
          <span style={{ color: '#fff', fontWeight: 700 }}>{WINS[winIndex].user}</span>
          <span style={{ color: '#00d4aa', fontWeight: 900, fontFamily: 'monospace' }}>{WINS[winIndex].gain}</span>
          <span style={{ color: '#4a5e7a' }}>after {WINS[winIndex].course} · {WINS[winIndex].time}</span>
        </div>
      </section>

      {/* STATS */}
      <section style={{ borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a', background: 'rgba(7,18,32,0.5)', padding: '48px 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 32, textAlign: 'center' }} className="stats-grid">
          {[
            { value: 9, suffix: '', label: 'Expert Instructors' },
            { value: 180000, suffix: '+', label: 'Students Enrolled' },
            { value: 99, suffix: '¢', label: 'Per Course' },
            { value: 92, suffix: '%', label: 'Satisfaction Rate' },
          ].map(({ value, suffix, label }) => (
            <div key={label}>
              <div style={{ fontSize: 'clamp(32px,4vw,48px)', fontWeight: 900, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontFamily: 'monospace' }}>
                <AnimatedCounter target={value} suffix={suffix} />
              </div>
              <div style={{ fontSize: 12, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 4 }}>{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Adsterra Native Banner */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px 40px' }}>
        <iframe
          srcDoc={`<!DOCTYPE html><html><head><style>body{margin:0;padding:0;background:transparent;overflow:hidden}</style></head><body><script async="async" data-cfasync="false" src="https://pl28636153.profitablecpmratenetwork.com/d4467fd39cd2555e32e317195a17fa8f/invoke.js"><\/script><div id="container-d4467fd39cd2555e32e317195a17fa8f"></div></body></html>`}
          style={{ border: 'none', width: '100%', height: '120px', background: 'transparent' }}
          scrolling="no"
          title="ad"
        />
      </div>

      {/* CATEGORIES */}
      <section id="categories" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Every trading style. One platform.</h2>
            <p style={{ fontSize: 15, color: '#4a5e7a' }}>Not sure which is right for you? <Link href="/quiz" style={{ color: '#00d4aa', textDecoration: 'none', fontWeight: 700 }}>Take the 2-minute quiz →</Link></p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }} className="cat-grid">
            {CATEGORIES.map(cat => (
              <Link key={cat.name} href={`/courses?filter=${encodeURIComponent(cat.name)}`} style={{ textDecoration: 'none' }}>
                <div className="card-hover" style={{ background: '#071220', border: `1px solid ${cat.color}30`, borderRadius: 16, padding: '28px 24px', cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
                  <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, borderRadius: '50%', background: `${cat.color}15` }} />
                  <div style={{ fontSize: 32, marginBottom: 12 }}>{cat.icon}</div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 4 }}>{cat.name}</div>
                  <div style={{ fontSize: 12, color: cat.color, fontWeight: 600 }}>{cat.count} course{cat.count > 1 ? 's' : ''}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* INSTRUCTORS */}
      <section id="instructors" style={{ padding: '0 24px 80px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>
              Learn from the <span className="gradient-text">best in the world</span>
            </h2>
            <p style={{ fontSize: 15, color: '#4a5e7a' }}>Every instructor is a verified profitable trader or financial expert with millions of followers</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="instructor-grid">
            {INSTRUCTORS.map(inst => (
              <Link key={inst.name} href="/courses" style={{ textDecoration: 'none' }}>
                <div className="card-hover" style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, padding: 20, cursor: 'pointer', textAlign: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = inst.color; (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 32px ${inst.color}20` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a2d4a'; (e.currentTarget as HTMLElement).style.boxShadow = 'none' }}>
                  <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${inst.color}40, ${inst.color}20)`, border: `2px solid ${inst.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: 18, fontWeight: 900, color: inst.color }}>
                    {inst.initials}
                  </div>
                  <div style={{ fontWeight: 800, color: '#fff', fontSize: 13, marginBottom: 2 }}>{inst.name}</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 8 }}>{inst.sub}</div>
                  <div style={{ display: 'inline-block', fontSize: 9, fontWeight: 700, padding: '3px 10px', borderRadius: 100, background: `${inst.color}20`, color: inst.color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{inst.tag}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ padding: '80px 24px', background: 'rgba(7,18,32,0.5)', borderTop: '1px solid #1a2d4a', borderBottom: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>How it works</h2>
          <p style={{ color: '#4a5e7a', marginBottom: 56 }}>The only platform where learning and practice happen in the same place</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 32 }} className="cat-grid">
            {[
              { step: '01', icon: <Sparkles size={24} color="#ffa502" />, title: 'Take the Quiz', desc: 'Answer 5 questions. Get your trading type. See courses made for you.' },
              { step: '02', icon: <Play size={24} color="#00d4aa" />, title: 'Watch AI Lectures', desc: 'Interactive AI-narrated lessons. Slides. Voice. Quiz yourself after each section.' },
              { step: '03', icon: <TrendingUp size={24} color="#1e90ff" />, title: 'Practice & Share', desc: 'Apply the strategy live. Post your results. Earn rewards from the community.' },
            ].map(({ step, icon, title, desc }) => (
              <div key={step} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 72, fontWeight: 900, color: '#0f1f38', fontFamily: 'monospace', marginBottom: -16, lineHeight: 1 }}>{step}</div>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: '#0f1f38', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>{icon}</div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: 16, marginBottom: 8 }}>{title}</div>
                <div style={{ fontSize: 13, color: '#4a5e7a', lineHeight: 1.7 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* STUDENT WINS */}
      <section id="results" style={{ padding: '80px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 12 }}>Real results from real students</h2>
            <p style={{ color: '#4a5e7a' }}>Unverified results shared by community members. Past performance doesn&apos;t guarantee future results.</p>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }} className="instructor-grid">
            {WINS.map((win, i) => (
              <div key={i} className="card-hover" style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 14, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0f1f38', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#7f93b5' }}>
                    {win.user.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, color: '#cdd6f4', fontSize: 13 }}>{win.user}</div>
                    <div style={{ fontSize: 10, color: '#4a5e7a' }}>{win.course}</div>
                  </div>
                </div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace', marginBottom: 4 }}>{win.gain}</div>
                <div style={{ fontSize: 11, color: '#4a5e7a' }}>in {win.time}</div>
              </div>
            ))}
          </div>
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#00d4aa', textDecoration: 'none', fontWeight: 700 }}>
              Start your first course for $0.99 <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ padding: '80px 24px', textAlign: 'center', borderTop: '1px solid #1a2d4a' }}>
        <div style={{ maxWidth: 600, margin: '0 auto' }}>
          <div style={{ fontSize: 'clamp(32px,5vw,56px)', fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.05, marginBottom: 20 }}>
            What kind of trader are you?
          </div>
          <p style={{ fontSize: 15, color: '#7f93b5', marginBottom: 36, lineHeight: 1.7 }}>
            Take the 2-minute quiz and get a personalized learning path built from 9 expert instructors.
          </p>
          <Link href="/quiz" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', color: '#040c14', fontWeight: 900, textDecoration: 'none', padding: '18px 44px', borderRadius: 16, fontSize: 18, boxShadow: '0 0 60px rgba(0,212,170,0.4)' }}>
            <Sparkles size={20} /> Take the Quiz — Free
          </Link>
          <div style={{ marginTop: 16, fontSize: 12, color: '#4a5e7a' }}>Takes 2 minutes · No account required · Get results instantly</div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid #1a2d4a', padding: '32px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={11} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff' }}>YN Finance</span>
          </div>
          <div style={{ display: 'flex', gap: 24, fontSize: 12, flexWrap: 'wrap' }}>
            {[['/courses','Courses'],['/quiz','Quiz'],['/app','Terminal'],['/privacy','Privacy'],['/terms','Terms']].map(([h,l]) => (
              <Link key={l} href={h} style={{ color: '#4a5e7a', textDecoration: 'none' }}>{l}</Link>
            ))}
          </div>
          <div style={{ fontSize: 11, color: '#4a5e7a' }}>© 2026 YN Finance · Educational platform · Not financial advice</div>
        </div>
      </footer>
    </div>
  )
}
