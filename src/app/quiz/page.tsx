'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Zap, RotateCcw } from 'lucide-react'

const QUESTIONS = [
  {
    id: 1,
    q: 'How long do you want to hold a trade?',
    options: [
      { id: 'a', emoji: '⚡', text: 'Seconds to minutes', score: { scalper: 3, day: 1 } },
      { id: 'b', emoji: '🕐', text: 'Hours, close by end of day', score: { day: 3, swing: 1 } },
      { id: 'c', emoji: '📅', text: 'Days to weeks', score: { swing: 3, options: 1 } },
      { id: 'd', emoji: '🗓️', text: 'Months to years', score: { longterm: 3, options: 1 } },
    ],
  },
  {
    id: 2,
    q: 'How much time can you realistically spend trading each day?',
    options: [
      { id: 'a', emoji: '💻', text: 'All day — I\'m committed', score: { scalper: 3, day: 2 } },
      { id: 'b', emoji: '⏰', text: '1–3 hours in the morning', score: { day: 3, swing: 1 } },
      { id: 'c', emoji: '📱', text: '30 minutes to check in', score: { swing: 2, options: 2 } },
      { id: 'd', emoji: '☕', text: 'Barely — I want passive', score: { longterm: 3 } },
    ],
  },
  {
    id: 3,
    q: 'How do you feel about risk?',
    options: [
      { id: 'a', emoji: '🔥', text: 'Love it — bigger swings = bigger wins', score: { scalper: 2, day: 2 } },
      { id: 'b', emoji: '⚖️', text: 'Calculated — risk must match reward', score: { swing: 2, options: 2, day: 1 } },
      { id: 'c', emoji: '🛡️', text: 'Conservative — protect capital first', score: { longterm: 2, options: 2 } },
      { id: 'd', emoji: '🎯', text: 'I want to define my max loss upfront', score: { options: 3 } },
    ],
  },
  {
    id: 4,
    q: 'What excites you most about trading?',
    options: [
      { id: 'a', emoji: '📈', text: 'Reading charts and finding patterns', score: { scalper: 2, day: 2, swing: 1 } },
      { id: 'b', emoji: '📰', text: 'News, earnings, macro events', score: { day: 2, swing: 2 } },
      { id: 'c', emoji: '💰', text: 'Consistent monthly income', score: { options: 3, longterm: 1 } },
      { id: 'd', emoji: '🏦', text: 'Building long-term wealth', score: { longterm: 3 } },
    ],
  },
  {
    id: 5,
    q: 'What\'s your trading goal?',
    options: [
      { id: 'a', emoji: '💵', text: 'Replace or supplement income NOW', score: { scalper: 2, day: 3 } },
      { id: 'b', emoji: '📊', text: 'Grow my account steadily over time', score: { swing: 3, options: 1 } },
      { id: 'c', emoji: '🎓', text: 'Learn the market and build knowledge', score: { longterm: 2, swing: 2 } },
      { id: 'd', emoji: '🚀', text: 'Find the ONE big trade that changes everything', score: { options: 2, day: 2 } },
    ],
  },
]

const RESULTS = {
  scalper: {
    type: 'The Scalper',
    emoji: '⚡',
    color: '#ff4757',
    desc: 'You thrive on speed and precision. You want quick wins, tight risk, and the ability to extract money from the market multiple times per day. Discipline and pattern recognition are your edge.',
    traits: ['High action', 'Tight stops', 'Multiple trades per day', 'Pattern-based'],
    courses: ['ross-cameron-gap-and-go', 'ict-smart-money-concepts'],
    instructors: ['Ross Cameron', 'ICT'],
  },
  day: {
    type: 'The Day Trader',
    emoji: '🕐',
    color: '#ffa502',
    desc: 'You want to be in and out within the trading day. No overnight risk. You like reading momentum, reacting to news, and making decisions in real time with clear setups.',
    traits: ['No overnight holds', 'News-driven', 'Momentum focused', 'Technical analysis'],
    courses: ['ross-cameron-gap-and-go', 'rayner-teo-trend-following'],
    instructors: ['Ross Cameron', 'Humbled Trader'],
  },
  swing: {
    type: 'The Swing Trader',
    emoji: '📅',
    color: '#00d4aa',
    desc: 'You prefer well-thought-out trades that play out over days or weeks. Less stress, better setups, and the ability to trade around a regular life. Chart analysis is your core skill.',
    traits: ['3–10 day holds', 'Lower trade frequency', 'Technical + macro', 'Better work-life balance'],
    courses: ['rayner-teo-trend-following', 'ict-smart-money-concepts'],
    instructors: ['Rayner Teo', 'ICT'],
  },
  options: {
    type: 'The Options Trader',
    emoji: '🎯',
    color: '#a855f7',
    desc: 'You want defined risk on every trade and the ability to profit in any market condition — up, down, or sideways. Options give you leverage with known maximum losses.',
    traits: ['Defined risk', 'Leverage without margin calls', 'Income strategies', 'Multiple strategies'],
    courses: ['inthemoney-options-income', 'anton-kreil-institutional-trading'],
    instructors: ['InTheMoney Adam', 'Anton Kreil'],
  },
  longterm: {
    type: 'The Long-Term Investor',
    emoji: '🏆',
    color: '#1e90ff',
    desc: 'You understand that wealth is built over decades, not days. You want to grow your money steadily through index funds, dividend stocks, and smart portfolio construction.',
    traits: ['Low stress', 'Compound interest', 'Tax efficiency', 'Passive income focus'],
    courses: ['graham-stephan-index-investing', 'kevin-oleary-portfolio-management'],
    instructors: ['Graham Stephan', "Kevin O'Leary"],
  },
}

type TraderType = keyof typeof RESULTS

export default function QuizPage() {
  const [step, setStep] = useState(0) // 0 = intro, 1-5 = questions, 6 = result
  const [answers, setAnswers] = useState<string[]>([])
  const [scores, setScores] = useState<Record<string, number>>({ scalper: 0, day: 0, swing: 0, options: 0, longterm: 0 })
  const [result, setResult] = useState<TraderType | null>(null)

  const answer = (option: typeof QUESTIONS[0]['options'][0]) => {
    const newScores = { ...scores }
    Object.entries(option.score).forEach(([type, pts]) => {
      newScores[type] = (newScores[type] || 0) + pts
    })
    setScores(newScores)
    setAnswers([...answers, option.id])

    if (step === QUESTIONS.length) {
      const winner = Object.entries(newScores).sort((a, b) => b[1] - a[1])[0][0] as TraderType
      setResult(winner)
      setStep(step + 1)
    } else {
      setStep(step + 1)
    }
  }

  const reset = () => { setStep(0); setAnswers([]); setScores({ scalper: 0, day: 0, swing: 0, options: 0, longterm: 0 }); setResult(null) }

  const progress = step > 0 && step <= QUESTIONS.length ? (step / QUESTIONS.length) * 100 : 0

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @keyframes shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }
        .fade-in { animation: fadeIn 0.4s ease forwards; }
        .option-btn { transition: all 0.2s; }
        .option-btn:hover { transform: scale(1.02); }
      `}</style>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Zap size={13} color="#040c14" fill="#040c14" />
          </div>
          <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>YN Finance</span>
        </Link>
        <span style={{ color: '#1a2d4a' }}>›</span>
        <span style={{ color: '#7f93b5', fontSize: 13 }}>Find Your Trading Type</span>
        {step > 0 && step <= QUESTIONS.length && (
          <div style={{ flex: 1, maxWidth: 300, height: 4, background: '#0f1f38', borderRadius: 2, overflow: 'hidden', marginLeft: 'auto' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, #00d4aa, #1e90ff)', borderRadius: 2, width: `${progress}%`, transition: 'width 0.4s ease' }} />
          </div>
        )}
      </nav>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 24px' }}>

        {/* INTRO */}
        {step === 0 && (
          <div className="fade-in" style={{ maxWidth: 560, textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 20 }}>🎯</div>
            <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1.5, marginBottom: 16 }}>What kind of trader are you?</h1>
            <p style={{ fontSize: 16, color: '#7f93b5', lineHeight: 1.7, marginBottom: 36 }}>
              5 quick questions. We&apos;ll match you with the right trading style and the exact courses from our expert instructors that will actually work for you.
            </p>
            <button onClick={() => setStep(1)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 10, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', color: '#040c14', fontWeight: 900, border: 'none', padding: '18px 48px', borderRadius: 14, fontSize: 18, cursor: 'pointer', boxShadow: '0 0 40px rgba(0,212,170,0.4)' }}>
              Start Quiz <ArrowRight size={18} />
            </button>
            <div style={{ marginTop: 16, fontSize: 12, color: '#4a5e7a' }}>Takes 2 minutes · No account required</div>
          </div>
        )}

        {/* QUESTIONS */}
        {step >= 1 && step <= QUESTIONS.length && (() => {
          const q = QUESTIONS[step - 1]
          return (
            <div className="fade-in" key={step} style={{ maxWidth: 620, width: '100%' }}>
              <div style={{ textAlign: 'center', marginBottom: 40 }}>
                <div style={{ fontSize: 12, color: '#4a5e7a', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  Question {step} of {QUESTIONS.length}
                </div>
                <h2 style={{ fontSize: 'clamp(22px,3vw,32px)', fontWeight: 900, color: '#fff', letterSpacing: -0.5, lineHeight: 1.2 }}>{q.q}</h2>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {q.options.map(opt => (
                  <button key={opt.id} onClick={() => answer(opt)} className="option-btn"
                    style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 14, padding: '22px 20px', cursor: 'pointer', textAlign: 'left', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                    <span style={{ fontSize: 28, flexShrink: 0, lineHeight: 1 }}>{opt.emoji}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#cdd6f4', lineHeight: 1.4 }}>{opt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        })()}

        {/* RESULT */}
        {step > QUESTIONS.length && result && (() => {
          const r = RESULTS[result]
          return (
            <div className="fade-in" style={{ maxWidth: 620, width: '100%', textAlign: 'center' }}>
              <div style={{ fontSize: 72, marginBottom: 16 }}>{r.emoji}</div>
              <div style={{ display: 'inline-block', padding: '6px 20px', borderRadius: 100, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16, background: `${r.color}20`, color: r.color, border: `1px solid ${r.color}40` }}>
                Your Trading Type
              </div>
              <h2 style={{ fontSize: 44, fontWeight: 900, color: '#fff', letterSpacing: -1.5, marginBottom: 16 }}>{r.type}</h2>
              <p style={{ fontSize: 15, color: '#7f93b5', lineHeight: 1.7, marginBottom: 28, maxWidth: 500, margin: '0 auto 28px' }}>{r.desc}</p>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center', marginBottom: 36 }}>
                {r.traits.map(t => (
                  <span key={t} style={{ fontSize: 12, padding: '6px 14px', borderRadius: 100, background: `${r.color}15`, color: r.color, border: `1px solid ${r.color}30`, fontWeight: 600 }}>{t}</span>
                ))}
              </div>

              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 20, padding: 28, marginBottom: 24, textAlign: 'left' }}>
                <div style={{ fontSize: 12, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Your recommended courses</div>
                {r.instructors.map((inst, i) => (
                  <div key={inst} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < r.instructors.length - 1 ? '1px solid #1a2d4a' : 'none' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${r.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: r.color }}>
                      {inst.split(' ').map(w => w[0]).join('').slice(0, 2)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, color: '#cdd6f4', fontSize: 14 }}>{inst}</div>
                    </div>
                    <Link href={`/courses/${r.courses[i]}`} style={{ fontSize: 12, color: r.color, textDecoration: 'none', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                      View <ArrowRight size={12} />
                    </Link>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: r.color, color: '#040c14', fontWeight: 900, textDecoration: 'none', padding: '14px 32px', borderRadius: 12, fontSize: 15 }}>
                  See My Courses <ArrowRight size={16} />
                </Link>
                <button onClick={reset} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#071220', color: '#7f93b5', border: '1px solid #1a2d4a', fontWeight: 600, padding: '14px 24px', borderRadius: 12, fontSize: 14, cursor: 'pointer' }}>
                  <RotateCcw size={14} /> Retake
                </button>
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
