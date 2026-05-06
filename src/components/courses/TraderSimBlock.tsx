'use client'

import { useState } from 'react'
import { CheckCircle, Bot, Send } from 'lucide-react'

interface SimQuestion {
  question: string
  context: string
  trader: string
}

interface Props {
  questions: SimQuestion[]
  color: string
  onComplete: () => void
}

export default function TraderSimBlock({ questions, color, onComplete }: Props) {
  const [idx, setIdx] = useState(0)
  const [answer, setAnswer] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [answered, setAnswered] = useState<string[]>([])

  const q = questions[idx]

  const submit = async () => {
    if (answer.trim().length < 20) return
    setLoading(true)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'trader_sim', data: { trader: q.trader, question: q.question, userAnswer: answer } }),
      })
      const { feedback: fb } = await res.json()
      setFeedback(fb)
      setAnswered(prev => [...prev, answer])
    } catch {
      setFeedback('Could not reach AI — but your thinking is recorded. Move on.')
    }
    setLoading(false)
  }

  const next = () => {
    if (idx < questions.length - 1) {
      setIdx(idx + 1)
      setAnswer('')
      setFeedback('')
    } else {
      setDone(true)
      onComplete()
    }
  }

  if (done) return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <CheckCircle size={22} color={color} />
      <div>
        <div style={{ fontWeight: 800, color, fontSize: 14 }}>Trader Simulation Complete!</div>
        <div style={{ fontSize: 12, color: '#7f93b5', marginTop: 2 }}>You thought through {questions.length} real market scenarios as a pro trader</div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#071220', border: `1px solid ${color}30`, borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', background: '#050d1a', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Bot size={14} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Trader Simulation — {idx + 1}/{questions.length}
        </span>
      </div>

      <div style={{ padding: '24px 24px' }}>
        {/* Trader identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: `${color}20`, border: `2px solid ${color}50`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🧠</div>
          <div>
            <div style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{q.trader}</div>
            <div style={{ fontSize: 10, color: '#4a5e7a' }}>How would they approach this?</div>
          </div>
        </div>

        {/* Context / market scenario */}
        <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>Market Scenario</div>
          <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{q.context}</p>
        </div>

        {/* Question */}
        <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16, lineHeight: 1.4 }}>
          {q.question}
        </div>

        {/* Answer area */}
        {!feedback ? (
          <>
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} rows={4}
              placeholder={`Think like ${q.trader}. What would they look for? What would they ignore? Would they trade at all?`}
              style={{ width: '100%', background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '12px 14px', color: '#cdd6f4', fontSize: 13, resize: 'none', fontFamily: 'Inter, sans-serif', lineHeight: 1.6, boxSizing: 'border-box', marginBottom: 12 }} />
            <button onClick={submit} disabled={loading || answer.trim().length < 20}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: answer.trim().length >= 20 ? color : '#0f1f38', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: answer.trim().length >= 20 ? 'pointer' : 'not-allowed' }}>
              <Send size={13} /> {loading ? 'Simulating...' : `See How ${q.trader.split(' ')[0]} Would Respond`}
            </button>
          </>
        ) : (
          <>
            {/* User's answer */}
            <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 6 }}>Your answer:</div>
              <p style={{ fontSize: 12, color: '#7f93b5', margin: 0, lineHeight: 1.6, fontStyle: 'italic' }}>{answer}</p>
            </div>

            {/* AI feedback as the trader */}
            <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10, padding: '16px 18px', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Bot size={13} color={color} />
                <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{q.trader} responds:</span>
              </div>
              <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{feedback}</p>
            </div>

            <button onClick={next} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: color, border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer' }}>
              {idx < questions.length - 1 ? 'Next Scenario →' : <><CheckCircle size={14} /> Complete Simulation</>}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
