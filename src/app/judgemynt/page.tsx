'use client'

import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { ArrowUpRight, Award, Crown, X, Check, ChevronLeft, Lock, Sparkles } from 'lucide-react'

const VIDEO_SRC =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260606_154941_df1a96e1-a06f-450c-bd02-d863414cc1a0.mp4'

const TEAL = '#00d4aa'
const BLUE = '#1e90ff'

interface Challenge {
  id: string
  level: number
  title: string
  tagline: string
  brief: string
  original: string
}

interface Dimensions {
  detection: number
  reasoning: number
  execution: number
}
interface Flaw {
  flaw: string
  caught: boolean
}
interface Grade {
  score: number
  verdict: string
  dimensions: Dimensions
  flaws: Flaw[]
  analysis: string
  nailed: string
  missed: string
  tip: string
}

// Public display copy only — hidden flaws + answer keys live server-side.
const CHALLENGES: Challenge[] = [
  {
    id: 'essay',
    level: 1,
    title: 'Spot the Fake',
    tagline: 'A school-essay paragraph with hidden problems.',
    brief:
      "This AI wrote a paragraph for a school essay. It looks fine, but it has hidden problems that would get you in trouble. Find them and rewrite it so it's actually trustworthy.",
    original:
      "Social media is extremely harmful to teenagers. In fact, 73% of students say it ruins their grades, which proves it's dangerous. Everyone agrees that social media is bad because it is harmful to young people. That is why it should clearly be limited for all teens.",
  },
  {
    id: 'summary',
    level: 1,
    title: 'Catch the Lie',
    tagline: 'A science summary with one false "fact".',
    brief:
      "The AI wrote a quick summary for a science presentation. One 'fact' in here is actually false — a famous myth. Catch it, fix it, and tighten the summary.",
    original:
      'The Great Wall of China is one of the most impressive structures ever built over many centuries. It is the only man-made object visible from space with the naked eye, which shows how enormous it is. Honestly, summaries like this are always fun to write. It remains a major landmark today.',
  },
  {
    id: 'news',
    level: 1,
    title: 'Find the Bias',
    tagline: 'A "neutral" news summary that secretly editorializes.',
    brief:
      "This AI 'news summary' is supposed to be neutral. It isn't — it slips opinion in as fact and frames things unfairly. Catch what's wrong and rewrite it as a fair, factual summary.",
    original:
      "The city council's reckless new budget shamelessly slashed funding for parks, proving once again that the council doesn't care about families. Officials claim the cuts are temporary. The plan passed 5-2.",
  },
  {
    id: 'email',
    level: 2,
    title: 'Make It Human',
    tagline: 'A robotic AI email that needs to get a yes.',
    brief:
      'You need to ask your teacher for a 2-day extension on an assignment. The AI wrote this email. Fix it so it actually gets a yes — clear, specific, and human.',
    original:
      'Dear Esteemed Educator, I am writing to humbly express my sincere hope that you might find it within your considerable generosity to perhaps consider the possibility of allowing some additional time for the completion of the assigned work, as certain circumstances have arisen. I deeply appreciate your boundless understanding in this matter. Yours most respectfully.',
  },
  {
    id: 'cover',
    level: 2,
    title: 'Kill the Cliché',
    tagline: 'A cover-letter line that says absolutely nothing.',
    brief:
      "The AI wrote this line for a cover letter. It's generic filler that says nothing. Rewrite it so it's specific, honest, and actually makes someone want to hire you.",
    original:
      'I am a passionate, hardworking team player who is excited to leverage my skills and hit the ground running to bring value to your dynamic organization.',
  },
  {
    id: 'explain',
    level: 2,
    title: 'Fix the Explainer',
    tagline: 'A confident explanation that is secretly wrong.',
    brief:
      'The AI tried to explain how interest works to a beginner. It sounds smart but it is confusing — and one part is flat-out wrong. Fix it so it is clear and correct.',
    original:
      'Interest is the time-value coefficient applied to principal over compounding intervals. Simple interest grows exponentially, while compound interest grows linearly, making simple interest the more aggressive option for long-term growth.',
  },
  {
    id: 'code',
    level: 3,
    title: 'Debug the AI',
    tagline: 'AI-written code with a subtle bug and a missing case.',
    brief:
      'The AI wrote this function to average a list of numbers. It has a subtle bug and a case it does not handle. Find both and fix the code.',
    original:
      'function average(nums) {\n  let total = 0;\n  for (let i = 1; i <= nums.length; i++) {\n    total += nums[i];\n  }\n  return total / nums.length;\n}',
  },
  {
    id: 'prompt',
    level: 3,
    title: 'Direct the AI',
    tagline: 'A lazy prompt got a weak result. Give better direction.',
    brief:
      "Someone gave an AI a lazy prompt and got this weak result. You can't edit the result — instead, write a BETTER instruction that would get a genuinely great answer. You are graded on your direction, not your writing.",
    original:
      "PROMPT GIVEN: 'write about dogs'\nAI OUTPUT: 'Dogs are animals. They are pets. People like dogs because they are friendly and fun. There are many kinds of dogs. Dogs are good.'",
  },
  {
    id: 'data',
    level: 3,
    title: 'Check the Claim',
    tagline: 'An AI analysis that overreaches from weak data.',
    brief:
      'This AI analysis jumps to a huge conclusion from weak data. Catch the reasoning errors and rewrite the conclusion so it is honest about what the data actually shows.',
    original:
      'In our survey, 8 out of 10 people who drink coffee reported feeling productive. This proves coffee causes productivity. Therefore, companies should require all employees to drink coffee to boost performance.',
  },
]

const LEVELS = [
  { n: 1, name: 'Detection', degree: 'AI Detection', blurb: 'Catch what AI gets wrong — fakes, false facts, hidden bias.' },
  { n: 2, name: 'Correction', degree: 'AI Correction', blurb: 'Fix flawed AI work to a genuinely high standard.' },
  { n: 3, name: 'Direction', degree: 'AI Direction', blurb: 'Judge and direct AI toward an excellent result.' },
]

const PASS = 70

function band(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Elite judgment', color: TEAL }
  if (score >= PASS) return { label: 'Passed', color: '#5ee0c0' }
  if (score >= 40) return { label: 'Not yet', color: '#f59e0b' }
  return { label: 'Got fooled', color: '#ff5470' }
}

export default function JudgemyntPage() {
  const [stage, setStage] = useState<'hero' | 'curriculum' | 'challenge' | 'result' | 'certs'>('hero')
  const [menuOpen, setMenuOpen] = useState(false)
  const [active, setActive] = useState<Challenge | null>(null)
  const [submission, setSubmission] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [grade, setGrade] = useState<Grade | null>(null)
  const [progress, setProgress] = useState<Record<string, number>>({})
  const [viewDegree, setViewDegree] = useState<string | null>(null)
  const [certName, setCertName] = useState('')

  // load saved progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem('judgemynt-progress-v1')
      if (raw) setProgress(JSON.parse(raw))
      const n = localStorage.getItem('judgemynt-name')
      if (n) setCertName(n)
    } catch {}
  }, [])

  function saveScore(id: string, score: number) {
    setProgress((prev) => {
      const next = { ...prev, [id]: Math.max(prev[id] ?? 0, score) }
      try {
        localStorage.setItem('judgemynt-progress-v1', JSON.stringify(next))
      } catch {}
      return next
    })
  }

  const levelChallenges = (n: number) => CHALLENGES.filter((c) => c.level === n)
  const levelPassed = (n: number) => levelChallenges(n).every((c) => (progress[c.id] ?? 0) >= PASS)
  const capstoneEarned = [1, 2, 3].every((n) => levelPassed(n))

  function go(s: typeof stage) {
    setMenuOpen(false)
    setStage(s)
    if (typeof window !== 'undefined') window.scrollTo(0, 0)
  }

  function start(c: Challenge) {
    setActive(c)
    setSubmission('')
    setGrade(null)
    setError('')
    go('challenge')
  }

  async function submit() {
    if (!active) return
    if (submission.trim().length < 5) {
      setError('Write your answer first.')
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
      saveScore(active.id, (data as Grade).score)
      go('result')
    } catch {
      setError('Could not reach the examiner — check your connection.')
    }
    setLoading(false)
  }

  const navLinks = [
    { label: 'Curriculum', to: 'curriculum' as const },
    { label: 'The Exam', to: 'curriculum' as const },
    { label: 'Degrees', to: 'certs' as const },
  ]

  return (
    <div className="min-h-screen bg-[#040a12] text-[#eaf4fa] font-inter overflow-x-hidden">
      {/* fonts + animations, scoped to this page */}
      <link
        rel="stylesheet"
        href="https://db.onlinewebfonts.com/c/8b75d9dcff6a48c35a46656192adf019?family=FSP+DEMO+-+PODIUM+Sharp+4.11"
      />
      <style>{`
        .font-podium{font-family:"FSP DEMO - PODIUM Sharp 4.11", var(--font-sans), system-ui, sans-serif;}
        .font-inter{font-family:var(--font-sans), Inter, system-ui, sans-serif;}
        @keyframes jm-fade-up{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
        .jm-fade-up{opacity:0;animation:jm-fade-up .8s ease-out forwards;}
        .jm-d1{animation-delay:.2s}.jm-d2{animation-delay:.4s}.jm-d3{animation-delay:.6s}.jm-d4{animation-delay:.8s}
        @keyframes jm-bar{from{width:0}}
        .jm-bar{animation:jm-bar 1s ease-out forwards;}
      `}</style>

      {/* ===================== HERO ===================== */}
      {stage === 'hero' && (
        <section className="relative h-screen w-full overflow-hidden">
          <video
            className="absolute inset-0 h-full w-full object-cover"
            src={VIDEO_SRC}
            autoPlay
            muted
            loop
            playsInline
          />
          <div className="absolute inset-0 bg-black/55" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#040a12] via-[#040a12]/30 to-transparent" />

          {/* navbar */}
          <nav className="relative z-20 flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 lg:py-7">
            <span className="font-podium text-2xl sm:text-3xl font-bold uppercase tracking-wider text-white">
              Judgemynt
            </span>
            <div className="hidden md:flex items-center gap-9">
              {navLinks.map((l) => (
                <button
                  key={l.label}
                  onClick={() => go(l.to)}
                  className="font-inter text-sm uppercase tracking-widest text-white/80 hover:text-white transition"
                >
                  {l.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => go('curriculum')}
              className="hidden md:flex items-center gap-2 border border-white/30 hover:border-white/60 hover:bg-white/10 px-6 py-3 text-xs uppercase tracking-widest text-white transition"
            >
              Start the exam <ArrowUpRight className="w-4 h-4" />
            </button>
            <button onClick={() => setMenuOpen(true)} className="md:hidden flex flex-col space-y-1.5" aria-label="Menu">
              <span className="w-6 h-0.5 bg-white" />
              <span className="w-6 h-0.5 bg-white" />
              <span className="w-4 h-0.5 bg-white" />
            </button>
          </nav>

          {/* hero content */}
          <div className="relative z-10 flex h-[calc(100vh-90px)] flex-col justify-center px-6 sm:px-10 lg:px-16 max-w-5xl">
            <div className="jm-fade-up mb-6 lg:mb-8 flex items-center gap-2">
              <Crown className="w-4 h-4 text-white/70" />
              <span className="font-inter text-xs sm:text-sm uppercase tracking-[0.3em] text-white/70">
                The Credential For The AI Era
              </span>
            </div>

            <h1 className="font-podium uppercase text-white leading-[0.92] tracking-tight">
              <span className="jm-fade-up jm-d1 block text-[clamp(2.8rem,8vw,7rem)]">Detect.</span>
              <span className="jm-fade-up jm-d1 block text-[clamp(2.8rem,8vw,7rem)]">Correct.</span>
              <span
                className="jm-fade-up jm-d1 block text-[clamp(2.8rem,8vw,7rem)]"
                style={{ color: TEAL }}
              >
                Direct.
              </span>
            </h1>

            <p className="jm-fade-up jm-d2 mt-6 lg:mt-8 max-w-md font-inter text-sm sm:text-base leading-relaxed text-white/70">
              AI can write anything. Judgemynt proves you can tell when it&apos;s{' '}
              <span className="font-semibold text-white">wrong</span> — and earns you a real degree for it.
            </p>

            <div className="jm-fade-up jm-d3 mt-8 lg:mt-10 flex flex-wrap items-center gap-4 sm:gap-6">
              <button
                onClick={() => go('curriculum')}
                className="group flex items-center gap-2 px-5 sm:px-7 py-3 sm:py-4 text-[11px] sm:text-xs uppercase tracking-widest font-semibold text-[#06121f]"
                style={{ background: TEAL }}
              >
                Take the exam
                <ArrowUpRight className="w-4 h-4 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
              </button>
              <div className="hidden sm:flex items-center gap-3">
                <Award className="w-8 h-8 text-white/50" />
                <div className="text-xs uppercase tracking-wider text-white/60 leading-tight">
                  AI-Graded
                  <br />
                  Judgment Exam
                </div>
              </div>
            </div>

            <div className="jm-fade-up jm-d4 mt-8 sm:mt-10 lg:mt-14 flex flex-wrap gap-6 sm:gap-12 lg:gap-16">
              {[
                ['3', 'Degrees to earn'],
                ['9', 'Judgment exams'],
                ['100%', 'AI-graded'],
              ].map(([v, l]) => (
                <div key={l}>
                  <div className="font-inter font-bold tracking-tight text-2xl sm:text-4xl lg:text-5xl text-white">
                    {v}
                  </div>
                  <div className="mt-1 text-[9px] sm:text-xs uppercase tracking-widest text-white/50">{l}</div>
                </div>
              ))}
            </div>
          </div>

          {/* mobile menu */}
          <div
            className={`fixed inset-0 z-50 bg-black/95 backdrop-blur-sm transition-all duration-500 md:hidden ${
              menuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}
          >
            <div className="flex items-center justify-between px-6 py-5">
              <span className="font-podium text-2xl font-bold uppercase tracking-wider text-white">Judgemynt</span>
              <button onClick={() => setMenuOpen(false)} aria-label="Close">
                <X className="w-7 h-7 text-white" />
              </button>
            </div>
            <div className="flex h-[70vh] flex-col items-start justify-center gap-6 px-8">
              {navLinks.map((l, i) => (
                <button
                  key={l.label}
                  onClick={() => go(l.to)}
                  className="font-podium text-4xl sm:text-5xl uppercase text-white"
                  style={menuItemStyle(menuOpen, i)}
                >
                  {l.label}
                </button>
              ))}
              <button
                onClick={() => go('curriculum')}
                className="mt-4 flex items-center gap-2 border border-white/30 px-6 py-3 text-xs uppercase tracking-widest text-white"
                style={menuItemStyle(menuOpen, navLinks.length)}
              >
                Start the exam <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </section>
      )}

      {/* ===================== CURRICULUM ===================== */}
      {stage === 'curriculum' && (
        <Shell onHome={() => go('hero')} onCerts={() => go('certs')}>
          <div className="jm-fade-up">
            <div className="text-xs uppercase tracking-[0.3em]" style={{ color: TEAL }}>
              The Curriculum
            </div>
            <h2 className="font-podium text-[clamp(2rem,6vw,4rem)] uppercase leading-[0.95] mt-3">
              Three levels.
              <br />
              Three degrees.
            </h2>
            <p className="text-white/60 max-w-xl mt-4 text-sm sm:text-base">
              Pass every exam in a level (score {PASS}+) to earn its degree. Clear all three and you earn the full{' '}
              <span className="text-white font-semibold">Judgment Degree</span>.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            {LEVELS.map((lvl) => {
              const passed = levelPassed(lvl.n)
              return (
                <div key={lvl.n} className="jm-fade-up jm-d1 border-t border-white/10 pt-7">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-podium text-xl uppercase tracking-wide">
                      Level {lvl.n} · {lvl.name}
                    </span>
                    {passed && (
                      <span
                        className="flex items-center gap-1 text-[10px] uppercase tracking-widest px-2 py-1 rounded-full"
                        style={{ color: TEAL, border: `1px solid ${TEAL}55` }}
                      >
                        <Check className="w-3 h-3" /> Degree earned
                      </span>
                    )}
                  </div>
                  <p className="text-white/50 text-sm mt-1">{lvl.blurb}</p>
                  <div className="grid sm:grid-cols-3 gap-3 mt-5">
                    {levelChallenges(lvl.n).map((c) => {
                      const best = progress[c.id]
                      return (
                        <button
                          key={c.id}
                          onClick={() => start(c)}
                          className="text-left bg-white/[0.03] border border-white/10 hover:border-white/30 rounded-xl p-4 transition group"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[15px]">{c.title}</span>
                            {best != null && (
                              <span className="text-xs font-bold" style={{ color: band(best).color }}>
                                {best}
                              </span>
                            )}
                          </div>
                          <div className="text-white/45 text-xs mt-1.5 leading-snug">{c.tagline}</div>
                          <div
                            className="mt-3 text-[11px] uppercase tracking-widest flex items-center gap-1 opacity-60 group-hover:opacity-100 transition"
                            style={{ color: TEAL }}
                          >
                            {best != null ? 'Retake' : 'Start'} <ArrowUpRight className="w-3 h-3" />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <button
            onClick={() => go('certs')}
            className="mt-12 flex items-center gap-2 border border-white/20 hover:border-white/50 px-6 py-3 text-xs uppercase tracking-widest transition"
          >
            <Crown className="w-4 h-4" style={{ color: TEAL }} /> View your degrees
          </button>
        </Shell>
      )}

      {/* ===================== CHALLENGE ===================== */}
      {stage === 'challenge' && active && (
        <Shell onHome={() => go('hero')} onCerts={() => go('certs')}>
          <button onClick={() => go('curriculum')} className="flex items-center gap-1 text-white/50 text-sm hover:text-white">
            <ChevronLeft className="w-4 h-4" /> Curriculum
          </button>
          <div className="jm-fade-up mt-5">
            <div className="text-xs uppercase tracking-widest" style={{ color: TEAL }}>
              Level {active.level} · {active.title}
            </div>
            <p className="text-white/90 text-base sm:text-lg leading-snug mt-2 max-w-2xl">{active.brief}</p>

            <div className="text-[11px] text-white/40 uppercase tracking-widest mt-6 mb-2">The AI produced this 👇</div>
            <pre className="whitespace-pre-wrap font-inter bg-[#ff5470]/[0.05] border border-[#ff5470]/20 rounded-xl p-4 text-[#d8e2ea] text-sm leading-relaxed">
              {active.original}
            </pre>

            <div className="text-[11px] text-white/40 uppercase tracking-widest mt-6 mb-2">Your answer</div>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Fix what's actually wrong…"
              rows={8}
              className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-[#eaf4fa] text-sm leading-relaxed outline-none focus:border-white/30 resize-y"
            />
            {error && <div className="text-[#ff5470] text-sm mt-3">{error}</div>}
            <button
              onClick={submit}
              disabled={loading}
              className="mt-4 w-full rounded-xl py-4 font-semibold text-base text-[#06121f] disabled:opacity-60"
              style={{ background: loading ? '#0d3b33' : `linear-gradient(110deg, ${TEAL}, ${BLUE})` }}
            >
              {loading ? 'The examiner is judging your call…' : 'Submit for judgment'}
            </button>
          </div>
        </Shell>
      )}

      {/* ===================== RESULT ===================== */}
      {stage === 'result' && grade && active && (
        <Shell onHome={() => go('hero')} onCerts={() => go('certs')}>
          <button onClick={() => go('curriculum')} className="flex items-center gap-1 text-white/50 text-sm hover:text-white">
            <ChevronLeft className="w-4 h-4" /> Curriculum
          </button>

          <div className="jm-fade-up text-center py-7">
            <div className="text-xs uppercase tracking-[0.25em] text-white/50">Judgment Score</div>
            <div
              className="font-inter font-bold leading-none tracking-tight my-1"
              style={{ fontSize: 'clamp(64px,16vw,112px)', color: band(grade.score).color }}
            >
              {grade.score}
            </div>
            <div className="font-semibold text-lg" style={{ color: band(grade.score).color }}>
              {band(grade.score).label}
            </div>
            <div className="text-white/55 text-sm mt-1">&ldquo;{grade.verdict}&rdquo;</div>
          </div>

          {/* dimensions */}
          <div className="space-y-4 max-w-xl mx-auto">
            <ScoreBar label="Detection" hint="did you spot what was wrong" value={grade.dimensions.detection} />
            <ScoreBar label="Reasoning" hint="did you understand why" value={grade.dimensions.reasoning} />
            <ScoreBar label="Execution" hint="how good your fix was" value={grade.dimensions.execution} />
          </div>

          {/* flaws */}
          <div className="mt-8 grid gap-2.5 max-w-xl mx-auto">
            {grade.flaws.map((f, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl px-4 py-3 border"
                style={{
                  background: 'rgba(255,255,255,.03)',
                  borderColor: f.caught ? 'rgba(0,212,170,.25)' : 'rgba(255,84,112,.22)',
                }}
              >
                <span>{f.caught ? '✅' : '❌'}</span>
                <span className={`text-sm ${f.caught ? 'text-white' : 'text-white/60'}`}>{f.flaw}</span>
                <span
                  className="ml-auto text-[10px] font-bold uppercase tracking-widest"
                  style={{ color: f.caught ? TEAL : '#ff5470' }}
                >
                  {f.caught ? 'caught' : 'missed'}
                </span>
              </div>
            ))}
          </div>

          <div className="max-w-xl mx-auto">
            {grade.analysis && (
              <div className="mt-7 rounded-xl bg-white/[0.03] border border-white/10 p-4">
                <div className="text-[11px] uppercase tracking-widest mb-2" style={{ color: TEAL }}>
                  Examiner&apos;s analysis
                </div>
                <p className="text-white/80 text-sm leading-relaxed">{grade.analysis}</p>
              </div>
            )}
            {grade.nailed && <Note label="What you nailed" color={TEAL} text={grade.nailed} />}
            {grade.missed && <Note label="What slipped past you" color="#f59e0b" text={grade.missed} />}
            {grade.tip && <Note label="Sharpen next time" color={BLUE} text={grade.tip} />}

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => start(active)}
                className="flex-1 rounded-xl py-3.5 font-semibold text-sm bg-white/[0.04] border border-white/10 hover:border-white/30"
              >
                Retake
              </button>
              <button
                onClick={() => go('curriculum')}
                className="flex-1 rounded-xl py-3.5 font-semibold text-sm text-[#06121f]"
                style={{ background: `linear-gradient(110deg, ${TEAL}, ${BLUE})` }}
              >
                Next exam →
              </button>
            </div>
            <p className="text-center text-white/40 text-xs mt-5">
              Screenshot your score and send it to a friend — see who&apos;s got the sharper eye.
            </p>
          </div>
        </Shell>
      )}

      {/* ===================== DEGREES / CERTIFICATES ===================== */}
      {stage === 'certs' && (
        <Shell onHome={() => go('hero')} onCerts={() => go('certs')}>
          <div className="jm-fade-up">
            <div className="text-xs uppercase tracking-[0.3em]" style={{ color: TEAL }}>
              Your Degrees
            </div>
            <h2 className="font-podium text-[clamp(2rem,6vw,4rem)] uppercase leading-[0.95] mt-3">
              Earn it.
              <br />
              Own it forever.
            </h2>
            <p className="text-white/60 max-w-xl mt-4 text-sm sm:text-base">
              A real, verifiable credential for the one skill AI can&apos;t fake for you: judgment.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            {LEVELS.map((lvl) => {
              const earned = levelPassed(lvl.n)
              return (
                <DegreeCard
                  key={lvl.n}
                  title={lvl.degree}
                  sub={`Level ${lvl.n} · ${lvl.name}`}
                  earned={earned}
                  onView={() => {
                    if (earned) setViewDegree(lvl.degree)
                  }}
                />
              )
            })}
            <DegreeCard
              title="The Judgment Degree"
              sub="Capstone · all three levels"
              earned={capstoneEarned}
              capstone
              onView={() => {
                if (capstoneEarned) setViewDegree('The Judgment Degree')
              }}
            />
          </div>

          <button
            onClick={() => go('curriculum')}
            className="mt-10 flex items-center gap-2 text-sm text-white/60 hover:text-white"
          >
            <ChevronLeft className="w-4 h-4" /> Back to curriculum
          </button>
        </Shell>
      )}

      {/* diploma overlay */}
      {viewDegree && (
        <Diploma
          degree={viewDegree}
          name={certName}
          onName={(v) => {
            setCertName(v)
            try {
              localStorage.setItem('judgemynt-name', v)
            } catch {}
          }}
          onClose={() => setViewDegree(null)}
        />
      )}
    </div>
  )
}

/* ---------------- sub-components ---------------- */

function Shell({ children, onHome, onCerts }: { children: ReactNode; onHome: () => void; onCerts: () => void }) {
  return (
    <div className="min-h-screen">
      <nav className="flex items-center justify-between px-6 sm:px-10 lg:px-16 py-5 lg:py-6 border-b border-white/5">
        <button onClick={onHome} className="font-podium text-xl sm:text-2xl font-bold uppercase tracking-wider text-white">
          Judgemynt
        </button>
        <button
          onClick={onCerts}
          className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-white/70 hover:text-white"
        >
          <Crown className="w-4 h-4" style={{ color: TEAL }} /> Degrees
        </button>
      </nav>
      <div className="px-6 sm:px-10 lg:px-16 py-10 lg:py-14 max-w-4xl mx-auto pb-24">{children}</div>
    </div>
  )
}

function ScoreBar({ label, hint, value }: { label: string; hint: string; value: number }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <span className="text-sm font-semibold">
          {label} <span className="text-white/40 font-normal text-xs">— {hint}</span>
        </span>
        <span className="text-sm font-bold" style={{ color: band(value).color }}>
          {value}
        </span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="jm-bar h-full rounded-full"
          style={{ width: `${value}%`, background: `linear-gradient(90deg, ${TEAL}, ${BLUE})` }}
        />
      </div>
    </div>
  )
}

function Note({ label, color, text }: { label: string; color: string; text: string }) {
  return (
    <div className="mt-3 pl-3.5" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="text-[11px] font-bold uppercase tracking-widest" style={{ color }}>
        {label}
      </div>
      <div className="text-[#eaf4fa] text-sm leading-snug mt-0.5">{text}</div>
    </div>
  )
}

function DegreeCard({
  title,
  sub,
  earned,
  capstone,
  onView,
}: {
  title: string
  sub: string
  earned: boolean
  capstone?: boolean
  onView: () => void
}) {
  return (
    <button
      onClick={onView}
      disabled={!earned}
      className="text-left rounded-2xl p-6 border transition relative overflow-hidden"
      style={{
        background: earned ? 'rgba(0,212,170,.06)' : 'rgba(255,255,255,.02)',
        borderColor: earned ? 'rgba(0,212,170,.3)' : 'rgba(255,255,255,.08)',
        cursor: earned ? 'pointer' : 'default',
      }}
    >
      <div className="flex items-center justify-between">
        {capstone ? (
          <Crown className="w-7 h-7" style={{ color: earned ? TEAL : '#46596b' }} />
        ) : (
          <Award className="w-7 h-7" style={{ color: earned ? TEAL : '#46596b' }} />
        )}
        {earned ? (
          <Sparkles className="w-5 h-5" style={{ color: TEAL }} />
        ) : (
          <Lock className="w-5 h-5 text-white/25" />
        )}
      </div>
      <div className="font-podium text-2xl uppercase mt-4" style={{ color: earned ? '#fff' : 'rgba(255,255,255,.5)' }}>
        {title}
      </div>
      <div className="text-white/40 text-xs uppercase tracking-widest mt-1">{sub}</div>
      <div className="mt-4 text-[11px] uppercase tracking-widest" style={{ color: earned ? TEAL : 'rgba(255,255,255,.3)' }}>
        {earned ? 'View certificate →' : 'Locked — pass the level'}
      </div>
    </button>
  )
}

function Diploma({
  degree,
  name,
  onName,
  onClose,
}: {
  degree: string
  name: string
  onName: (v: string) => void
  onClose: () => void
}) {
  const id = 'JM-' + Math.abs(hashStr(degree + (name || 'x'))).toString(36).toUpperCase().slice(0, 8)
  const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl my-8">
        <button onClick={onClose} className="absolute -top-10 right-0 text-white/70 hover:text-white" aria-label="Close">
          <X className="w-7 h-7" />
        </button>
        <div
          className="rounded-2xl p-8 sm:p-12 text-center"
          style={{
            background: 'linear-gradient(160deg, #06121f, #0a1726)',
            border: `1px solid ${TEAL}44`,
            boxShadow: `0 0 60px rgba(0,212,170,.15)`,
          }}
        >
          <Crown className="w-10 h-10 mx-auto" style={{ color: TEAL }} />
          <div className="font-podium text-2xl uppercase tracking-wider mt-3 text-white">Judgemynt</div>
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mt-1">Certified Judgment · AI Era</div>

          <div className="text-white/50 text-xs uppercase tracking-widest mt-8">This certifies that</div>
          <input
            value={name}
            onChange={(e) => onName(e.target.value)}
            placeholder="Your name"
            className="w-full text-center bg-transparent border-b border-white/20 focus:border-white/50 outline-none font-podium text-3xl sm:text-4xl uppercase text-white py-2 mt-2 placeholder:text-white/25"
          />
          <div className="text-white/50 text-xs uppercase tracking-widest mt-6">has earned the degree of</div>
          <div className="font-podium text-2xl sm:text-3xl uppercase mt-2" style={{ color: TEAL }}>
            {degree}
          </div>

          <div className="flex items-center justify-center gap-8 mt-8 text-left">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">Issued</div>
              <div className="text-sm text-white/80">{date}</div>
            </div>
            <div>
              <div className="text-[9px] uppercase tracking-widest text-white/40">Credential ID</div>
              <div className="text-sm text-white/80 font-mono">{id}</div>
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-4 text-[10px] uppercase tracking-widest text-white/30">
            judgemynt — proof you can tell when AI is wrong
          </div>
        </div>
        <p className="text-center text-white/40 text-xs mt-4">
          Type your name, then screenshot it. Real version will be verifiable + shareable.
        </p>
      </div>
    </div>
  )
}

function menuItemStyle(open: boolean, i: number): CSSProperties {
  return {
    opacity: open ? 1 : 0,
    transform: open ? 'translateY(0)' : 'translateY(20px)',
    transition: 'opacity .5s, transform .5s',
    transitionDelay: `${i * 80 + 100}ms`,
  }
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return h
}
