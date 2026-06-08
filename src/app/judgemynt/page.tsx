'use client'

import { useState, type CSSProperties } from 'react'

interface Challenge {
  id: string
  title: string
  tagline: string
  brief: string
  original: string
}

interface Flaw {
  flaw: string
  caught: boolean
}

interface Grade {
  score: number
  verdict: string
  flaws: Flaw[]
  nailed: string
  missed: string
  tip: string
}

// Public display copy only — the hidden flaws + answer keys live server-side.
const CHALLENGES: Challenge[] = [
  {
    id: 'essay',
    title: 'Spot the Fake',
    tagline: 'A school-essay paragraph with hidden problems.',
    brief:
      "This AI wrote a paragraph for a school essay. It looks fine — but it has hidden problems that would get you in trouble. Find them and rewrite it so it's actually trustworthy.",
    original:
      "Social media is extremely harmful to teenagers. In fact, 73% of students say it ruins their grades, which proves it's dangerous. Everyone agrees that social media is bad because it is harmful to young people. That is why it should clearly be limited for all teens.",
  },
  {
    id: 'email',
    title: 'Make It Human',
    tagline: 'A robotic AI email that needs to get a yes.',
    brief:
      'You need to ask your teacher for a 2-day extension on an assignment. The AI wrote this email. Fix it so it actually gets a yes — clear, specific, and human.',
    original:
      'Dear Esteemed Educator, I am writing to humbly express my sincere hope that you might find it within your considerable generosity to perhaps consider the possibility of allowing some additional time for the completion of the assigned work, as certain circumstances have arisen. I deeply appreciate your boundless understanding in this matter. Yours most respectfully.',
  },
  {
    id: 'summary',
    title: 'Catch the Lie',
    tagline: 'A science summary with one false "fact".',
    brief:
      "The AI wrote a quick summary for a science presentation. One 'fact' in here is actually false — a famous myth. Catch it, fix it, and tighten the summary.",
    original:
      'The Great Wall of China is one of the most impressive structures ever built over many centuries. It is the only man-made object visible from space with the naked eye, which shows how enormous it is. Honestly, summaries like this are always fun to write. It remains a major landmark today.',
  },
]

const TEAL = '#00d4aa'
const BLUE = '#1e90ff'
const INK = '#eaf4fa'
const MUTED = '#7d97ab'
const LINE = 'rgba(255,255,255,.08)'
const CARD = 'rgba(255,255,255,.03)'

function band(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Elite judgment', color: TEAL }
  if (score >= 71) return { label: 'Sharp', color: '#5ee0c0' }
  if (score >= 41) return { label: 'Decent radar', color: '#f59e0b' }
  return { label: 'Got fooled', color: '#ff5470' }
}

export default function JudgemyntPage() {
  const [stage, setStage] = useState<'intro' | 'challenge' | 'result'>('intro')
  const [active, setActive] = useState<Challenge | null>(null)
  const [submission, setSubmission] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [grade, setGrade] = useState<Grade | null>(null)

  function start(c: Challenge) {
    setActive(c)
    setSubmission('')
    setGrade(null)
    setError('')
    setStage('challenge')
  }

  function reset() {
    setStage('intro')
    setActive(null)
    setSubmission('')
    setGrade(null)
    setError('')
  }

  async function submit() {
    if (!active) return
    if (submission.trim().length < 5) {
      setError('Write your improved version first.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/judgemynt/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challengeId: active.id, submission }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Something went wrong — try again.')
        setLoading(false)
        return
      }
      setGrade(data as Grade)
      setStage('result')
    } catch {
      setError('Could not reach the grader — check your connection.')
    }
    setLoading(false)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#040a12',
        color: INK,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        WebkitFontSmoothing: 'antialiased',
        padding: '0 18px 80px',
      }}
    >
      {/* header */}
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          padding: '26px 0 8px',
          display: 'flex',
          alignItems: 'center',
          gap: 11,
        }}
      >
        <span
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: `linear-gradient(135deg, ${TEAL}, ${BLUE})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 900,
            color: '#06121f',
            fontSize: 14,
            boxShadow: `0 0 22px rgba(0,212,170,.4)`,
          }}
        >
          JM
        </span>
        <div>
          <div style={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.2 }}>Judgemynt</div>
          <div style={{ fontSize: 11, color: '#46596b', letterSpacing: 2, textTransform: 'uppercase' }}>
            Prove your judgment · v1
          </div>
        </div>
        <span
          style={{
            marginLeft: 'auto',
            fontSize: 10.5,
            color: '#46596b',
            border: `1px solid ${LINE}`,
            borderRadius: 100,
            padding: '4px 10px',
          }}
        >
          private test build
        </span>
      </div>

      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        {stage === 'intro' && (
          <div style={{ paddingTop: 28 }}>
            <h1 style={{ fontSize: 'clamp(28px,5vw,46px)', fontWeight: 900, lineHeight: 1.07, letterSpacing: -1 }}>
              AI can write anything.
              <br />
              <span
                style={{
                  background: `linear-gradient(110deg, ${TEAL}, ${BLUE})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Can you tell when it&apos;s wrong?
              </span>
            </h1>
            <p style={{ color: MUTED, fontSize: 'clamp(15px,2vw,19px)', lineHeight: 1.6, maxWidth: 620, marginTop: 16 }}>
              We hand you something an AI wrote that&apos;s secretly flawed. Your job: catch what&apos;s wrong and fix
              it. You&apos;re not scored on pretty writing — you&apos;re scored on <strong style={{ color: INK }}>judgment.</strong>
            </p>

            <div style={{ marginTop: 30, display: 'grid', gap: 12 }}>
              {CHALLENGES.map((c) => (
                <button
                  key={c.id}
                  onClick={() => start(c)}
                  style={{
                    textAlign: 'left',
                    background: CARD,
                    border: `1px solid ${LINE}`,
                    borderRadius: 14,
                    padding: '18px 20px',
                    color: INK,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    transition: 'border-color .15s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,212,170,.45)')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = LINE)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{c.title}</div>
                    <div style={{ color: MUTED, fontSize: 14, marginTop: 3 }}>{c.tagline}</div>
                  </div>
                  <span style={{ color: TEAL, fontWeight: 900, fontSize: 20 }}>→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {stage === 'challenge' && active && (
          <div style={{ paddingTop: 22 }}>
            <button onClick={reset} style={backBtn}>
              ← all challenges
            </button>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 2, color: TEAL, textTransform: 'uppercase', marginTop: 16 }}>
              {active.title}
            </div>
            <p style={{ color: INK, fontSize: 'clamp(15px,2vw,18px)', lineHeight: 1.55, marginTop: 8 }}>{active.brief}</p>

            <div style={{ fontSize: 11, color: '#46596b', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 }}>
              The AI wrote this 👇
            </div>
            <div
              style={{
                background: 'rgba(255,84,112,.05)',
                border: '1px solid rgba(255,84,112,.22)',
                borderRadius: 12,
                padding: '16px 18px',
                color: '#d8e2ea',
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              {active.original}
            </div>

            <div style={{ fontSize: 11, color: '#46596b', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 22, marginBottom: 8 }}>
              Your fixed version
            </div>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Rewrite it here — fix what's actually wrong…"
              rows={7}
              style={{
                width: '100%',
                background: CARD,
                border: `1px solid ${LINE}`,
                borderRadius: 12,
                padding: '14px 16px',
                color: INK,
                fontSize: 15,
                lineHeight: 1.6,
                resize: 'vertical',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />

            {error && <div style={{ color: '#ff5470', fontSize: 14, marginTop: 10 }}>{error}</div>}

            <button
              onClick={submit}
              disabled={loading}
              style={{
                marginTop: 16,
                width: '100%',
                background: loading ? '#0d3b33' : `linear-gradient(110deg, ${TEAL}, ${BLUE})`,
                color: loading ? MUTED : '#06121f',
                border: 'none',
                borderRadius: 12,
                padding: '15px',
                fontWeight: 800,
                fontSize: 16,
                cursor: loading ? 'default' : 'pointer',
              }}
            >
              {loading ? 'Judging your call…' : 'Submit for judgment'}
            </button>
          </div>
        )}

        {stage === 'result' && grade && active && (
          <div style={{ paddingTop: 22 }}>
            <button onClick={reset} style={backBtn}>
              ← all challenges
            </button>

            <div style={{ textAlign: 'center', padding: '26px 0 8px' }}>
              <div style={{ fontSize: 12, letterSpacing: 2, color: MUTED, textTransform: 'uppercase' }}>
                Judgment Score
              </div>
              <div
                style={{
                  fontSize: 'clamp(64px,16vw,108px)',
                  fontWeight: 900,
                  lineHeight: 1,
                  letterSpacing: -3,
                  color: band(grade.score).color,
                  margin: '4px 0',
                }}
              >
                {grade.score}
              </div>
              <div style={{ fontWeight: 800, fontSize: 18, color: band(grade.score).color }}>{band(grade.score).label}</div>
              <div style={{ color: MUTED, fontSize: 15, marginTop: 4 }}>&ldquo;{grade.verdict}&rdquo;</div>
            </div>

            <div style={{ marginTop: 14, display: 'grid', gap: 9 }}>
              {grade.flaws.map((f, i) => (
                <div
                  key={i}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 11,
                    background: CARD,
                    border: `1px solid ${f.caught ? 'rgba(0,212,170,.25)' : 'rgba(255,84,112,.22)'}`,
                    borderRadius: 11,
                    padding: '12px 15px',
                  }}
                >
                  <span style={{ fontSize: 17 }}>{f.caught ? '✅' : '❌'}</span>
                  <span style={{ fontSize: 14.5, color: f.caught ? INK : MUTED }}>{f.flaw}</span>
                  <span
                    style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      fontWeight: 800,
                      letterSpacing: 1,
                      textTransform: 'uppercase',
                      color: f.caught ? TEAL : '#ff5470',
                    }}
                  >
                    {f.caught ? 'caught' : 'missed'}
                  </span>
                </div>
              ))}
            </div>

            {grade.nailed && (
              <Note label="What you nailed" color={TEAL} text={grade.nailed} />
            )}
            {grade.missed && (
              <Note label="What slipped past you" color="#f59e0b" text={grade.missed} />
            )}
            {grade.tip && <Note label="Sharpen next time" color={BLUE} text={grade.tip} />}

            <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
              <button onClick={() => start(active)} style={{ ...ghostBtn, flex: 1 }}>
                Retry this one
              </button>
              <button onClick={reset} style={{ ...solidBtn, flex: 1 }}>
                Next challenge →
              </button>
            </div>

            <p style={{ textAlign: 'center', color: '#46596b', fontSize: 12.5, marginTop: 20 }}>
              Screenshot your score and send it to a friend — see who&apos;s actually got the sharper eye.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

function Note({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div style={{ marginTop: 12, borderLeft: `3px solid ${color}`, paddingLeft: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', color }}>{label}</div>
      <div style={{ color: INK, fontSize: 15, lineHeight: 1.5, marginTop: 3 }}>{text}</div>
    </div>
  )
}

const backBtn: CSSProperties = {
  background: 'none',
  border: 'none',
  color: MUTED,
  fontSize: 13,
  cursor: 'pointer',
  padding: 0,
}

const ghostBtn: CSSProperties = {
  background: CARD,
  border: `1px solid ${LINE}`,
  color: INK,
  borderRadius: 12,
  padding: '14px',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
}

const solidBtn: CSSProperties = {
  background: `linear-gradient(110deg, ${TEAL}, ${BLUE})`,
  color: '#06121f',
  border: 'none',
  borderRadius: 12,
  padding: '14px',
  fontWeight: 800,
  fontSize: 15,
  cursor: 'pointer',
}
