'use client'

import { useState, useEffect, use, useRef } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Zap, Play, CheckCircle, Lock, ArrowRight, Star, Users, Clock, ChevronLeft, BookOpen, Target, Sparkles, Trophy, BarChart2, Bot, AlertCircle } from 'lucide-react'
import { SEED_COURSES } from '@/app/api/courses/route'
import InteractiveLecture, { textToSlides } from '@/components/courses/InteractiveLecture'
import CourseChat from '@/components/courses/CourseChat'
import QuizBlock from '@/components/courses/QuizBlock'
import TradeLogBlock from '@/components/courses/TradeLogBlock'
import TraderSimBlock from '@/components/courses/TraderSimBlock'
import ReplayBlock from '@/components/courses/ReplayBlock'
import AdsterraBanner from '@/components/ads/AdsterraBanner'
import Confetti from '@/components/ui-overlay/Confetti'

const SECTION_ICONS: Record<string, React.ReactNode> = {
  video:      <Play size={9} />,
  text:       <BookOpen size={9} />,
  practice:   <Target size={9} />,
  trader_sim: <Bot size={9} />,
  replay:     <BarChart2 size={9} />,
}

interface Section {
  id?: string; order_index: number; title: string; type: string
  content: Record<string, string>; duration_mins: number; is_free_preview: boolean
}
interface Course {
  id: string; slug: string; title: string; description: string
  trader_name: string; trader_handle: string; trader_avatar_color: string; trader_bio: string
  strategy_type: string; difficulty: string; price_cents: number; thumbnail_color: string
  thumbnail_img?: string; rating: number; enrollment_count: number; tags: string[]; is_free: boolean
}


function SectionContent({ section, onComplete, color, instructor }: { section: Section; onComplete: () => void; color: string; instructor: string }) {
  const c = section.content
  const quiz = (section as any).quiz as { q: string; options: string[]; answer: number }[] | undefined
  const [quizPassed, setQuizPassed] = useState(false)

  if (section.type === 'video') return (
    <div>
      <div className="aspect-video bg-[#040c14] rounded-xl overflow-hidden mb-4 border border-[#1a2d4a]">
        {c.youtube_id ? (
          <iframe className="w-full h-full" src={`https://www.youtube.com/embed/${c.youtube_id}?rel=0`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Play size={48} className="text-[#1a2d4a] mx-auto mb-3" />
              <p className="text-[12px] text-[#4a5e7a]">Video coming soon</p>
            </div>
          </div>
        )}
      </div>
      {c.description && <p className="text-[13px] text-[#7f93b5] leading-relaxed mb-4">{c.description}</p>}
      <button onClick={onComplete} className="flex items-center gap-2 px-4 py-2.5 bg-[#00d4aa] text-[#040c14] font-bold text-sm rounded-lg hover:bg-[#00ffcc] transition-colors">
        <CheckCircle size={14} /> Mark as Complete
      </button>
    </div>
  )

  if (section.type === 'text') {
    const slides = textToSlides(c.text || '', color)
    return (
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles size={13} className="text-[#a855f7]" />
          <span className="text-[11px] text-[#a855f7] font-bold uppercase tracking-wider">AI Interactive Lecture</span>
          <span className="text-[9px] text-[#4a5e7a]">— Click Play for narrated walkthrough, or read below</span>
        </div>
        <InteractiveLecture
          title={section.title}
          instructor={instructor}
          color={color}
          slides={slides}
          onComplete={() => {}}
        />
        <details className="mt-4">
          <summary className="text-[12px] text-[#4a5e7a] cursor-pointer hover:text-[#7f93b5]">Show full text version ↓</summary>
          <div className="mt-3 prose prose-invert max-w-none">
            {c.text?.split('\n').map((line: string, i: number) => {
              if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-white mb-4 mt-6">{line.slice(2)}</h1>
              if (line.startsWith('## ')) return <h2 key={i} className="text-base font-bold text-[#cdd6f4] mb-3 mt-5">{line.slice(3)}</h2>
              if (line.startsWith('- ')) return <li key={i} className="text-[13px] text-[#7f93b5] mb-1.5 ml-4 list-disc">{line.slice(2)}</li>
              if (line === '') return <div key={i} className="h-3" />
              return <p key={i} className="text-[13px] text-[#7f93b5] leading-relaxed mb-2">{line}</p>
            })}
          </div>
        </details>
        {quiz && quiz.length > 0 && !quizPassed ? (
          <QuizBlock questions={quiz} color={color} onPass={() => { setQuizPassed(true); setTimeout(onComplete, 700) }} />
        ) : quizPassed ? null : (
          <button onClick={onComplete} className="mt-4 flex items-center gap-2 px-4 py-2.5 bg-[#00d4aa] text-[#040c14] font-bold text-sm rounded-lg hover:bg-[#00ffcc] transition-colors">
            <CheckCircle size={14} /> Mark as Complete
          </button>
        )}
      </div>
    )
  }

  if (section.type === 'practice') return (
    <div>
      <div className="bg-[#ffa502]/10 border border-[#ffa502]/30 rounded-xl p-5 mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Target size={16} className="text-[#ffa502]" />
          <span className="text-sm font-bold text-[#ffa502] uppercase tracking-wider">Practice Exercise</span>
        </div>
        <p className="text-[13px] text-[#cdd6f4] leading-relaxed mb-4">{c.instructions}</p>
        <Link href="/app" target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#ffa502] text-[#040c14] font-bold text-sm rounded-lg hover:bg-[#ffb733] transition-colors no-underline">
          Open Trading Terminal <ArrowRight size={13} />
        </Link>
      </div>
      <TradeLogBlock strategy={instructor} color={color} minTrades={2} onComplete={onComplete} />
    </div>
  )

  if (section.type === 'trader_sim') {
    const questions = (section as any).questions as { question: string; context: string; trader: string }[]
    return <TraderSimBlock questions={questions} color={color} onComplete={onComplete} />
  }

  if (section.type === 'replay') {
    const scenario = (section as any).scenario as { instrument: string; timeframe: string; context: string; replaySymbol: string }
    return <ReplayBlock scenario={scenario} color={color} onComplete={onComplete} />
  }

  return null
}

function CoursePageInner({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const router = useRouter()
  const searchParams = useSearchParams()
  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [showCelebration, setShowCelebration] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const goToSection = (i: number) => {
    setActiveSection(i)
    setTimeout(() => contentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
  }

  useEffect(() => {
    fetch(`/api/courses?slug=${slug}`).then(r => r.json()).then(json => {
      setCourse(json.course)
      setSections(json.sections || [])
      setLoading(false)
    }).catch(() => {
      const seed = SEED_COURSES.find(c => c.slug === slug)
      if (seed) { setCourse(seed as unknown as Course); setSections(seed.sections as unknown as Section[]) }
      setLoading(false)
    })
    const saved = localStorage.getItem(`yn_course_${slug}`)
    if (saved) { try { const d = JSON.parse(saved); setEnrolled(d.enrolled); setCompleted(new Set(d.completed)) } catch {} }
  }, [slug])

  // Verify Stripe session on return from checkout
  useEffect(() => {
    const sessionId = searchParams.get('session_id')
    if (!sessionId || enrolled) return
    setVerifying(true)
    fetch(`/api/stripe/courses/verify?session_id=${sessionId}&slug=${slug}`)
      .then(r => r.json())
      .then(data => {
        if (data.paid) {
          setEnrolled(true)
          localStorage.setItem(`yn_course_${slug}`, JSON.stringify({ enrolled: true, completed: [] }))
        }
      })
      .finally(() => {
        setVerifying(false)
        // Remove session_id from URL without triggering navigation
        const url = new URL(window.location.href)
        url.searchParams.delete('session_id')
        router.replace(url.pathname + (url.search || ''), { scroll: false })
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const startCheckout = async () => {
    if (!course) return
    setCheckoutLoading(true)
    try {
      const res = await fetch('/api/stripe/courses/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, title: course.title, traderName: course.trader_name }),
      })
      const data = await res.json()
      if (data.demo) {
        // Stripe not configured — allow free access in dev
        setEnrolled(true)
        localStorage.setItem(`yn_course_${slug}`, JSON.stringify({ enrolled: true, completed: [] }))
      } else if (data.url) {
        window.location.href = data.url
      }
    } catch {
      setCheckoutLoading(false)
    }
  }

  const save = (en: boolean, comp: Set<number>) => {
    localStorage.setItem(`yn_course_${slug}`, JSON.stringify({ enrolled: en, completed: [...comp] }))
  }
  const markComplete = (idx: number) => {
    const next = new Set(completed).add(idx)
    setCompleted(next)
    save(enrolled, next)
    if (next.size === sections.length) setShowCelebration(true)
    // Don't auto-advance — show the "Continue" CTA so the user consciously moves forward
  }

  const progress = sections.length > 0 ? Math.round((completed.size / sections.length) * 100) : 0
  const canView = (s: Section, i: number) => enrolled || s.is_free_preview || i === 0
  const totalMins = sections.reduce((s, sec) => s + (sec.duration_mins || 5), 0)
  const doneMins = sections.filter((_, i) => completed.has(i)).reduce((s, sec) => s + (sec.duration_mins || 5), 0)
  const remainingMins = totalMins - doneMins

  if (loading || !course) return (
    <div style={{ background: '#040c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const color = course.thumbnail_color || '#00d4aa'
  const curr = sections[activeSection]
  const DIFF_COLOR: Record<string, string> = { Beginner: '#00d4aa', Intermediate: '#ffa502', Advanced: '#ff4757' }

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4' }}>
      <style>{`
        @media (max-width: 768px) {
          .course-layout { grid-template-columns: 1fr !important; }
          .course-sidebar { position: static !important; }
          .course-title-truncate { max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        }
      `}</style>

      {showCelebration && <Confetti />}

      {/* Completion celebration modal */}
      {showCelebration && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(4,12,20,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ background: '#071220', border: `1px solid ${color}50`, borderRadius: 24, padding: '48px 40px', maxWidth: 480, width: '100%', textAlign: 'center' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🏆</div>
            <div style={{ fontSize: 11, color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 12 }}>Course Complete</div>
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 8 }}>{course.title}</h2>
            <p style={{ fontSize: 13, color: '#7f93b5', marginBottom: 24 }}>
              You completed all {sections.length} sections ({totalMins} min) taught by {course.trader_name}.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Sections', value: String(sections.length) },
                { label: 'Time invested', value: `${totalMins} min` },
              ].map(({ label, value }) => (
                <div key={label} style={{ background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 12, padding: '14px 16px' }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Link href="/courses" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: color, color: '#040c14', fontWeight: 800, textDecoration: 'none', padding: '14px', borderRadius: 12, fontSize: 14 }}>
                <BookOpen size={15} /> Browse Next Course
              </Link>
              <Link href="/app" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#1e90ff20', color: '#1e90ff', fontWeight: 700, textDecoration: 'none', padding: '13px', borderRadius: 12, fontSize: 13, border: '1px solid #1e90ff30' }}>
                Practice in Terminal →
              </Link>
              <button onClick={() => setShowCelebration(false)} style={{ fontSize: 12, color: '#4a5e7a', background: 'none', border: 'none', cursor: 'pointer', padding: '8px' }}>
                Review course ↓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', background: '#040c14', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <Link href="/courses" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#7f93b5', fontSize: 12, flexShrink: 0 }}>
            <ChevronLeft size={14} /> Courses
          </Link>
          <span style={{ color: '#1a2d4a' }}>/</span>
          <span className="course-title-truncate" style={{ color: '#cdd6f4', fontSize: 12, fontWeight: 600 }}>{course.title}</span>
          <div style={{ flex: 1 }} />
          {enrolled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <div style={{ width: 100, height: 4, background: '#0f1f38', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 11, color: '#7f93b5', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {progress}% {remainingMins > 0 ? `· ~${remainingMins}m left` : '· Done!'}
              </span>
            </div>
          )}
        </div>
      </nav>

      {/* Legal disclaimer */}
      <div style={{ background: '#0a1628', borderBottom: '1px solid #1a2d4a', padding: '10px 24px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={13} style={{ color: '#4a5e7a', flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5, margin: 0 }}>
            YN Finance is an independent educational platform not affiliated with, endorsed by, or partnered with any featured traders. Courses are structured curricula referencing publicly available trading strategies and educational content. Embedded YouTube videos are the educators&apos; own free public content. The course fee covers YN Finance&apos;s curriculum, AI features, quizzes, and practice tools — not the educators&apos; content. <strong style={{ color: '#2a4060' }}>Not financial advice. Trading involves significant risk of loss.</strong>
          </p>
        </div>
      </div>

      <div className="course-layout" style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        {/* Main content */}
        <div ref={contentRef}>
          {/* Course image banner */}
          {course.thumbnail_img && (
            <div style={{ height: 200, borderRadius: 16, overflow: 'hidden', marginBottom: 24, position: 'relative' }}>
              <img src={course.thumbnail_img} alt={course.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => { (e.currentTarget as HTMLImageElement).parentElement!.style.display = 'none' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 30%, rgba(4,12,20,0.95) 100%)' }} />
              <div style={{ position: 'absolute', bottom: 20, left: 24 }}>
                <span style={{ fontSize: 10, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${color}20`, padding: '3px 10px', borderRadius: 4, border: `1px solid ${color}40` }}>
                  {course.strategy_type}
                </span>
              </div>
            </div>
          )}

          {/* Course header */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: `${DIFF_COLOR[course.difficulty] || '#7f93b5'}20`, color: DIFF_COLOR[course.difficulty] || '#7f93b5' }}>
                {course.difficulty}
              </span>
              <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{sections.length} sections · {totalMins} min</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -0.5, marginBottom: 8 }}>{course.title}</h1>
            <p style={{ fontSize: 13, color: '#7f93b5', lineHeight: 1.6, marginBottom: 16 }}>{course.description}</p>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `${course.trader_avatar_color}20`, color: course.trader_avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                  {course.trader_name.slice(0,2).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: '#cdd6f4', fontSize: 12 }}>{course.trader_name}</div>
                  <div style={{ color: '#4a5e7a', fontSize: 10 }}>{course.trader_bio?.slice(0, 60)}...</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ffa502' }}>
                <Star size={12} fill="#ffa502" />
                <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>{course.rating}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5e7a' }}>
                <Users size={12} />
                <span>{course.enrollment_count?.toLocaleString()} enrolled</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#4a5e7a' }}>
                <Clock size={12} />
                <span>{sections.reduce((s, sec) => s + (sec.duration_mins || 5), 0)} min total</span>
              </div>
            </div>
          </div>

          {/* Section content */}
          {curr && (
            <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Section {activeSection + 1} of {sections.length}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{curr.title}</h2>
                </div>
                {completed.has(activeSection) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00d4aa', fontSize: 11, fontWeight: 700 }}>
                    <CheckCircle size={14} /> Done
                  </div>
                )}
              </div>

              {canView(curr, activeSection) ? (
                <SectionContent section={curr} onComplete={() => markComplete(activeSection)} color={color} instructor={course.trader_name} />
              ) : (
                <div style={{ background: `${color}08`, border: `1px solid ${color}25`, borderRadius: 14, padding: '32px 24px', textAlign: 'center' }}>
                  <Lock size={28} style={{ color, margin: '0 auto 12px', opacity: 0.6 }} />
                  <p style={{ fontSize: 15, fontWeight: 700, color: '#cdd6f4', marginBottom: 6 }}>Unlock the full course</p>
                  <p style={{ fontSize: 12, color: '#7f93b5', marginBottom: 20, maxWidth: 320, margin: '0 auto 20px' }}>
                    {sections.length - sections.filter(s => s.is_free_preview).length} locked sections · AI lectures · knowledge quizzes · practice mode
                  </p>
                  <button onClick={startCheckout} disabled={checkoutLoading}
                    style={{ background: color, color: '#040c14', border: 'none', fontWeight: 900, padding: '13px 28px', borderRadius: 10, fontSize: 15, cursor: checkoutLoading ? 'wait' : 'pointer', boxShadow: `0 0 20px ${color}40`, opacity: checkoutLoading ? 0.7 : 1 }}>
                    {checkoutLoading ? 'Redirecting to checkout...' : `Unlock for $${(course.price_cents / 100).toFixed(2)} →`}
                  </button>
                  <p style={{ fontSize: 10, color: '#4a5e7a', marginTop: 10 }}>One-time · Lifetime access · Secure checkout via Stripe</p>
                </div>
              )}
            </div>
          )}

          {/* Continue CTA — shown when section is complete and there's a next one */}
          {completed.has(activeSection) && activeSection < sections.length - 1 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: `${color}12`, border: `1px solid ${color}35`, borderRadius: 14, padding: '16px 20px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <CheckCircle size={18} color={color} />
                <span style={{ fontSize: 13, fontWeight: 700, color }}>Section complete!</span>
              </div>
              <button onClick={() => goToSection(activeSection + 1)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, background: color, color: '#040c14', border: 'none', fontWeight: 800, padding: '10px 18px', borderRadius: 8, fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {sections[activeSection + 1].title.slice(0, 28)}{sections[activeSection + 1].title.length > 28 ? '…' : ''} <ArrowRight size={13} />
              </button>
            </div>
          )}

          <AdsterraBanner className="my-4" />

          {/* Real per-course chat */}
          <CourseChat courseSlug={course.slug} courseName={course.title} color={color} />
        </div>

        {/* Sidebar */}
        <div className="course-sidebar">
          {/* Enroll CTA */}
          {verifying ? (
            <div style={{ background: '#071220', border: `1px solid ${color}40`, borderRadius: 16, padding: 20, marginBottom: 16, textAlign: 'center' }}>
              <div className="w-5 h-5 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p style={{ fontSize: 12, color: '#7f93b5' }}>Verifying payment...</p>
            </div>
          ) : !enrolled ? (
            <div style={{ background: '#071220', border: `1px solid ${color}40`, borderRadius: 16, padding: 20, marginBottom: 16, position: 'sticky', top: 72 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                {course.is_free ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
              </div>
              <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 16 }}>One-time · Lifetime access · {sections.filter(s => s.is_free_preview).length} free previews</div>
              <button onClick={startCheckout} disabled={checkoutLoading}
                style={{ width: '100%', background: color, color: '#040c14', border: 'none', fontWeight: 800, padding: '14px', borderRadius: 10, fontSize: 15, cursor: checkoutLoading ? 'wait' : 'pointer', marginBottom: 8, boxShadow: `0 0 20px ${color}40`, opacity: checkoutLoading ? 0.7 : 1 }}>
                {checkoutLoading ? 'Loading checkout...' : 'Unlock Full Course'}
              </button>
              <p style={{ fontSize: 10, color: '#4a5e7a', textAlign: 'center' }}>Secure checkout via Stripe · 30-day refund</p>
            </div>
          ) : (
            <div style={{ background: '#00d4aa10', border: '1px solid #00d4aa30', borderRadius: 12, padding: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CheckCircle size={16} color="#00d4aa" />
                <span style={{ fontWeight: 700, color: '#00d4aa', fontSize: 13 }}>Enrolled</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                <div style={{ flex: 1, height: 6, background: '#0f1f38', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${progress}%`, height: '100%', background: '#00d4aa' }} />
                </div>
                <span style={{ fontSize: 11, color: '#7f93b5', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>{completed.size}/{sections.length} done</span>
              </div>
            </div>
          )}

          {/* Section list */}
          <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <BookOpen size={12} color="#7f93b5" />
                <span style={{ fontSize: 11, fontWeight: 700, color: '#7f93b5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {sections.length} Sections
                </span>
              </div>
              <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{completed.size}/{sections.length} done</span>
            </div>
            {sections.map((sec, i) => {
              const isActive = i === activeSection
              const isDone = completed.has(i)
              const locked = !canView(sec, i)
              const typeLabel: Record<string, string> = { video: 'Video', text: 'Lesson', practice: 'Practice', trader_sim: 'Sim', replay: 'Replay' }
              const typeColor: Record<string, string> = { practice: '#ffa502', trader_sim: '#a855f7', replay: '#1e90ff', video: '#ff4757', text: color }
              const tc = typeColor[sec.type] || '#4a5e7a'
              return (
                <button key={i} onClick={() => !locked && goToSection(i)} disabled={locked}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid #1a2d4a', borderTop: 'none', borderLeft: `3px solid ${isActive ? color : 'transparent'}`, borderRight: 'none', cursor: locked ? 'not-allowed' : 'pointer', background: isActive ? `${color}10` : 'transparent', textAlign: 'left', transition: 'all 0.15s' }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#00d4aa15' : isActive ? `${color}20` : '#0f1f38',
                    border: `1px solid ${isDone ? '#00d4aa40' : isActive ? `${color}40` : '#1a2d4a'}` }}>
                    {isDone ? <CheckCircle size={11} color="#00d4aa" /> : locked ? <Lock size={10} color="#4a5e7a" /> : (SECTION_ICONS[sec.type] || <Play size={9} />)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#cdd6f4' : locked ? '#2a4060' : '#7f93b5', lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {sec.title}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 2, alignItems: 'center' }}>
                      <span style={{ fontSize: 8, fontWeight: 700, color: tc, background: `${tc}15`, padding: '1px 5px', borderRadius: 3 }}>{typeLabel[sec.type] || sec.type}</span>
                      <span style={{ fontSize: 9, color: '#2a4060' }}>{sec.duration_mins}m</span>
                      {sec.is_free_preview && <span style={{ fontSize: 9, color: '#00d4aa' }}>Free</span>}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={
      <div style={{ background: '#040c14', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="w-6 h-6 border-2 border-[#00d4aa] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <CoursePageInner params={params} />
    </Suspense>
  )
}
