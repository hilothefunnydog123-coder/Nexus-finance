'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'

interface Question {
  q: string
  options: string[]
  answer: number
}

interface Props {
  questions: Question[]
  color: string
  onPass: () => void
}

export default function QuizBlock({ questions, color, onPass }: Props) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [wrong, setWrong] = useState(false)
  const [passed, setPassed] = useState(false)
  const [score, setScore] = useState(0)

  const q = questions[idx]

  const choose = (i: number) => {
    if (selected !== null) return
    setSelected(i)
    if (i === q.answer) {
      const next = score + 1
      setScore(next)
      setTimeout(() => {
        if (idx < questions.length - 1) {
          setIdx(idx + 1)
          setSelected(null)
          setWrong(false)
        } else {
          setPassed(true)
          onPass()
        }
      }, 900)
    } else {
      setWrong(true)
    }
  }

  const retry = () => {
    setSelected(null)
    setWrong(false)
  }

  if (passed) return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <CheckCircle size={22} color={color} />
      <div>
        <div style={{ fontWeight: 800, color, fontSize: 14 }}>Knowledge Check Passed!</div>
        <div style={{ fontSize: 12, color: '#7f93b5', marginTop: 2 }}>{score}/{questions.length} correct — you understand this section</div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, overflow: 'hidden', marginTop: 20 }}>
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 8 }}>
        <HelpCircle size={14} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Knowledge Check — Question {idx + 1} of {questions.length}
        </span>
      </div>

      <div style={{ padding: '20px 24px' }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#cdd6f4', marginBottom: 16, lineHeight: 1.5 }}>{q.q}</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {q.options.map((opt, i) => {
            const isSelected = selected === i
            const isCorrect = i === q.answer
            let bg = '#0a1628'
            let border = '#1a2d4a'
            let textColor = '#7f93b5'
            if (isSelected && isCorrect) { bg = `${color}20`; border = color; textColor = color }
            if (isSelected && !isCorrect) { bg = '#ff475720'; border = '#ff4757'; textColor = '#ff4757' }
            return (
              <button key={i} onClick={() => choose(i)}
                style={{ textAlign: 'left', padding: '11px 16px', borderRadius: 8, border: `1px solid ${border}`, background: bg, color: textColor, fontSize: 13, cursor: selected !== null ? 'default' : 'pointer', fontWeight: isSelected ? 700 : 400, transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ width: 22, height: 22, borderRadius: 6, background: isSelected ? 'transparent' : '#0f1f38', border: `1px solid ${border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, flexShrink: 0, color: textColor }}>
                  {isSelected && isCorrect ? '✓' : isSelected ? '✗' : String.fromCharCode(65 + i)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>

        {wrong && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <XCircle size={14} color="#ff4757" />
            <span style={{ fontSize: 12, color: '#ff4757' }}>Not quite — re-read the section and try again.</span>
            <button onClick={retry} style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 6, padding: '5px 12px', cursor: 'pointer' }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
