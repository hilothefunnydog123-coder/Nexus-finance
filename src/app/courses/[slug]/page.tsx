'use client'

import { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { Zap, Play, CheckCircle, Lock, ArrowRight, Star, Users, Clock, ChevronLeft, BookOpen, Target, Sparkles } from 'lucide-react'
import { SEED_COURSES } from '@/app/api/courses/route'
import InteractiveLecture, { textToSlides } from '@/components/courses/InteractiveLecture'
import CourseChat from '@/components/courses/CourseChat'
import QuizBlock from '@/components/courses/QuizBlock'

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

const AdBanner = () => (
  <div className="w-full h-14 bg-[#071220] border border-[#1a2d4a] rounded-lg flex items-center justify-center my-4">
    <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">Advertisement</span>
  </div>
)

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
          <QuizBlock questions={quiz} color={color} onPass={() => setQuizPassed(true)} />
        ) : (
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
      <p className="text-[11px] text-[#4a5e7a] mb-4">Complete the exercise in the terminal, journal it, then come back and mark complete.</p>
      <button onClick={onComplete} className="flex items-center gap-2 px-4 py-2.5 bg-[#00d4aa] text-[#040c14] font-bold text-sm rounded-lg hover:bg-[#00ffcc] transition-colors">
        <CheckCircle size={14} /> I Completed the Practice
      </button>
    </div>
  )

  return null
}

export default function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params)
  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [activeSection, setActiveSection] = useState(0)
  const [completed, setCompleted] = useState<Set<number>>(new Set())
  const [enrolled, setEnrolled] = useState(false)
  const [loading, setLoading] = useState(true)

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

  const save = (en: boolean, comp: Set<number>) => {
    localStorage.setItem(`yn_course_${slug}`, JSON.stringify({ enrolled: en, completed: [...comp] }))
  }

  const enroll = () => { setEnrolled(true); save(true, completed) }
  const markComplete = (idx: number) => {
    const next = new Set(completed).add(idx)
    setCompleted(next)
    save(enrolled, next)
    if (idx < sections.length - 1) setActiveSection(idx + 1)
  }

  const progress = sections.length > 0 ? Math.round((completed.size / sections.length) * 100) : 0
  const canView = (s: Section, i: number) => enrolled || s.is_free_preview || i === 0

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
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', background: '#040c14', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>
          <Link href="/courses" style={{ display: 'flex', alignItems: 'center', gap: 6, textDecoration: 'none', color: '#7f93b5', fontSize: 12 }}>
            <ChevronLeft size={14} /> All Courses
          </Link>
          <span style={{ color: '#1a2d4a' }}>/</span>
          <span style={{ color: '#cdd6f4', fontSize: 12, fontWeight: 600 }}>{course.title}</span>
          <div style={{ flex: 1 }} />
          {enrolled && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 120, height: 4, background: '#0f1f38', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ width: `${progress}%`, height: '100%', background: color, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 11, color: '#7f93b5', fontFamily: 'monospace' }}>{progress}%</span>
            </div>
          )}
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px', display: 'grid', gridTemplateColumns: '1fr 320px', gap: 32 }}>
        {/* Main content */}
        <div>
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
              <span style={{ fontSize: 10, color: color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', background: `${color}20`, padding: '3px 10px', borderRadius: 4 }}>
                {course.strategy_type}
              </span>
              <span style={{ fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: `${DIFF_COLOR[course.difficulty] || '#7f93b5'}20`, color: DIFF_COLOR[course.difficulty] || '#7f93b5' }}>
                {course.difficulty}
              </span>
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

          <AdBanner />

          {/* Section content */}
          {curr && (
            <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    Section {activeSection + 1} of {sections.length}
                  </div>
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{curr.title}</h2>
                </div>
                {completed.has(activeSection) && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#00d4aa', fontSize: 11, fontWeight: 700 }}>
                    <CheckCircle size={14} /> Completed
                  </div>
                )}
              </div>

              {canView(curr, activeSection) ? (
                <SectionContent section={curr} onComplete={() => markComplete(activeSection)} color={color} instructor={course.trader_name} />
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Lock size={32} style={{ color: '#1a2d4a', margin: '0 auto 12px' }} />
                  <p style={{ fontSize: 14, color: '#4a5e7a', marginBottom: 16 }}>Enroll to unlock this section</p>
                  <button onClick={enroll} style={{ background: color, color: '#040c14', border: 'none', fontWeight: 800, padding: '12px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer' }}>
                    Enroll for ${(course.price_cents / 100).toFixed(2)}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Real per-course chat */}
          <CourseChat courseSlug={course.slug} courseName={course.title} color={color} />
        </div>

        {/* Sidebar */}
        <div>
          {/* Enroll CTA */}
          {!enrolled ? (
            <div style={{ background: '#071220', border: `1px solid ${color}40`, borderRadius: 16, padding: 20, marginBottom: 16, position: 'sticky', top: 72 }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', marginBottom: 4 }}>
                {course.is_free ? 'Free' : `$${(course.price_cents / 100).toFixed(2)}`}
              </div>
              <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 16 }}>One-time · Lifetime access · {sections.filter(s => s.is_free_preview).length} free previews</div>
              <button onClick={enroll} style={{ width: '100%', background: color, color: '#040c14', border: 'none', fontWeight: 800, padding: '14px', borderRadius: 10, fontSize: 15, cursor: 'pointer', marginBottom: 8, boxShadow: `0 0 20px ${color}40` }}>
                Enroll Now
              </button>
              <p style={{ fontSize: 10, color: '#4a5e7a', textAlign: 'center' }}>30-day refund if you haven&apos;t completed 50%</p>
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
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #1a2d4a', display: 'flex', alignItems: 'center', gap: 6 }}>
              <BookOpen size={12} color="#7f93b5" />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#7f93b5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {sections.length} Sections
              </span>
            </div>
            {sections.map((sec, i) => {
              const isActive = i === activeSection
              const isDone = completed.has(i)
              const locked = !canView(sec, i)
              return (
                <button key={i} onClick={() => !locked && setActiveSection(i)} disabled={locked}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px', borderBottom: '1px solid #1a2d4a', borderTop: 'none', borderLeft: 'none', borderRight: 'none', cursor: locked ? 'not-allowed' : 'pointer', background: isActive ? `${color}15` : 'transparent', textAlign: 'left' }}>
                  <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: isDone ? '#00d4aa20' : isActive ? `${color}20` : '#0f1f38' }}>
                    {isDone ? <CheckCircle size={11} color="#00d4aa" /> : locked ? <Lock size={10} color="#4a5e7a" /> : <Play size={9} color={isActive ? color : '#4a5e7a'} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500, color: isActive ? '#cdd6f4' : locked ? '#4a5e7a' : '#7f93b5', lineHeight: 1.3 }}>
                      {sec.title}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 9, color: '#4a5e7a' }}>{sec.duration_mins} min</span>
                      {sec.is_free_preview && <span style={{ fontSize: 9, color: color }}>Free preview</span>}
                      {sec.type === 'practice' && <span style={{ fontSize: 9, color: '#ffa502' }}>Practice</span>}
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
