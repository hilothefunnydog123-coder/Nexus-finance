'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Star, Users, Search, BookOpen, Play, ChevronRight, TrendingUp, Shield, ArrowRight } from 'lucide-react'
import { SEED_COURSES } from '@/app/api/courses/route'

interface Course {
  id: string; slug: string; title: string; description: string
  trader_name: string; trader_handle: string; trader_avatar_color: string
  strategy_type: string; difficulty: string; price_cents: number
  thumbnail_color: string; rating: number; enrollment_count: number
  tags: string[]; is_free: boolean
}

const DIFF_COLOR: Record<string, string> = { Beginner: '#00d4aa', Intermediate: '#ffa502', Advanced: '#ff4757' }

const FILTERS = ['All', 'Day Trading', 'Smart Money Concepts', 'Swing Trading', 'Options Income', 'Institutional Trading', 'Scalping']

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeFilter, setActiveFilter] = useState('All')

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(json => {
      setCourses(json.courses || SEED_COURSES)
      setLoading(false)
    }).catch(() => { setCourses(SEED_COURSES as unknown as Course[]); setLoading(false) })
  }, [])

  const filtered = courses.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.trader_name.toLowerCase().includes(search.toLowerCase())
    const matchFilter = activeFilter === 'All' || c.strategy_type === activeFilter
    return matchSearch && matchFilter
  })

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4' }}>

      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', background: 'rgba(4,12,20,0.95)', backdropFilter: 'blur(12px)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60, gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={14} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: 16, letterSpacing: -0.5 }}>YN Finance</span>
          </Link>
          <span style={{ color: '#1a2d4a' }}>›</span>
          <span style={{ color: '#00d4aa', fontSize: 13, fontWeight: 700 }}>Courses</span>
          <div style={{ flex: 1 }} />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Link href="/app" style={{ fontSize: 12, color: '#7f93b5', textDecoration: 'none' }}>Terminal</Link>
            <Link href="/app" style={{ fontSize: 12, fontWeight: 700, color: '#040c14', background: '#00d4aa', textDecoration: 'none', padding: '7px 16px', borderRadius: 8, boxShadow: '0 0 16px rgba(0,212,170,0.3)' }}>
              Launch Terminal
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ borderBottom: '1px solid #1a2d4a', background: 'linear-gradient(180deg, #071220 0%, #040c14 100%)', padding: '56px 24px 48px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, background: '#00d4aa20', color: '#00d4aa', padding: '4px 12px', borderRadius: 100, fontWeight: 700, border: '1px solid #00d4aa30' }}>
              $0.99 per course · No subscription
            </span>
            <span style={{ fontSize: 11, background: '#ffa50220', color: '#ffa502', padding: '4px 12px', borderRadius: 100, fontWeight: 700, border: '1px solid #ffa50230' }}>
              Practice immediately on built-in simulator
            </span>
          </div>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, color: '#fff', letterSpacing: -2, lineHeight: 1.05, marginBottom: 16, maxWidth: 700 }}>
            Learn from real traders.<br />
            <span style={{ background: 'linear-gradient(90deg, #00d4aa, #1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Practice it instantly.
            </span>
          </h1>
          <p style={{ fontSize: 16, color: '#7f93b5', maxWidth: 540, lineHeight: 1.7, marginBottom: 32 }}>
            Every course links directly to the trading simulator. You don&apos;t just watch — you practice the exact strategy on real charts the moment you finish a section.
          </p>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
            {[['6', 'Expert Instructors'], ['24+', 'Hours of Content'], ['$0.99', 'Per Course'], ['Built-in', 'Practice Mode']].map(([v, l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#00d4aa', fontFamily: 'monospace' }}>{v}</div>
                <div style={{ fontSize: 11, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ad slot */}
      <div style={{ maxWidth: 1200, margin: '24px auto 0', padding: '0 24px' }}>
        <div style={{ height: 60, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Advertisement</span>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 10, padding: '10px 16px', flex: '1', minWidth: 240 }}>
            <Search size={14} color="#4a5e7a" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by strategy or instructor name..."
              style={{ background: 'none', border: 'none', outline: 'none', color: '#cdd6f4', fontSize: 13, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {FILTERS.map(f => (
              <button key={f} onClick={() => setActiveFilter(f)}
                style={{ padding: '8px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                  background: activeFilter === f ? '#00d4aa' : '#071220',
                  color: activeFilter === f ? '#040c14' : '#7f93b5',
                  border: activeFilter === f ? 'none' : '1px solid #1a2d4a' }}>
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Course grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 24, marginBottom: 48 }}>
          {loading
            ? Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: 320, background: '#071220', borderRadius: 16, border: '1px solid #1a2d4a', opacity: 0.5 }} />
              ))
            : filtered.map(course => (
              <Link key={course.id} href={`/courses/${course.slug}`} style={{ textDecoration: 'none' }}>
                <div className="course-card" style={{
                  background: '#071220', border: '1px solid #1a2d4a', borderRadius: 16, overflow: 'hidden',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = course.thumbnail_color
                    el.style.transform = 'translateY(-3px)'
                    el.style.boxShadow = `0 12px 40px ${course.thumbnail_color}20`
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement
                    el.style.borderColor = '#1a2d4a'
                    el.style.transform = 'none'
                    el.style.boxShadow = 'none'
                  }}>

                  {/* Card header */}
                  <div style={{ height: 130, background: `linear-gradient(135deg, ${course.thumbnail_color}25 0%, ${course.thumbnail_color}08 100%)`, display: 'flex', alignItems: 'center', padding: '0 24px', gap: 16, position: 'relative', borderBottom: `1px solid ${course.thumbnail_color}20` }}>
                    {/* Instructor avatar */}
                    <div style={{ width: 52, height: 52, borderRadius: 14, background: `${course.trader_avatar_color}25`, color: course.trader_avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 900, border: `1px solid ${course.trader_avatar_color}40`, flexShrink: 0 }}>
                      {course.trader_name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, color: '#fff', fontSize: 14, lineHeight: 1.2, marginBottom: 3 }}>{course.trader_name}</div>
                      <div style={{ fontSize: 11, color: course.thumbnail_color, fontWeight: 600 }}>{course.strategy_type}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 3, marginTop: 4 }}>
                        <Star size={11} fill="#ffa502" color="#ffa502" />
                        <span style={{ fontSize: 11, fontWeight: 700, color: '#ffa502', fontFamily: 'monospace' }}>{course.rating}</span>
                        <span style={{ fontSize: 10, color: '#4a5e7a', marginLeft: 4 }}>{course.enrollment_count.toLocaleString()} students</span>
                      </div>
                    </div>
                    <div style={{ position: 'absolute', top: 12, right: 12 }}>
                      <div style={{ background: course.thumbnail_color, color: '#040c14', fontSize: 12, fontWeight: 800, padding: '4px 10px', borderRadius: 8 }}>
                        {course.is_free ? 'FREE' : `$${(course.price_cents / 100).toFixed(2)}`}
                      </div>
                    </div>
                    <div style={{ position: 'absolute', bottom: 10, right: 12 }}>
                      <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 4, background: `${DIFF_COLOR[course.difficulty] || '#7f93b5'}20`, color: DIFF_COLOR[course.difficulty] || '#7f93b5', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {course.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '18px 20px' }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{course.title}</h3>
                    <p style={{ fontSize: 12, color: '#7f93b5', lineHeight: 1.6, marginBottom: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {course.description}
                    </p>

                    {/* Tags */}
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
                      {course.tags?.slice(0, 3).map(tag => (
                        <span key={tag} style={{ fontSize: 10, background: '#0f1f38', color: '#4a5e7a', padding: '3px 8px', borderRadius: 4, fontFamily: 'monospace' }}>#{tag}</span>
                      ))}
                    </div>

                    {/* CTA row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: '#4a5e7a' }}>
                        <Play size={11} />
                        <span>Includes practice mode</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: course.thumbnail_color, fontWeight: 700, fontSize: 12 }}>
                        Start Learning <ChevronRight size={13} />
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4a5e7a' }}>
            <BookOpen size={32} style={{ margin: '0 auto 12px', color: '#1a2d4a' }} />
            <p style={{ fontSize: 14 }}>No courses match your search</p>
          </div>
        )}

        {/* Bottom ad */}
        <div style={{ height: 60, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 48 }}>
          <span style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Advertisement</span>
        </div>

        {/* The unique advantage */}
        <div style={{ background: 'linear-gradient(135deg, #071220, #0a1628)', border: '1px solid #1e3a5f', borderRadius: 20, padding: '48px', marginBottom: 48 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 32 }}>
            {[
              { icon: <Play size={20} color="#00d4aa" />, title: 'Watch the Strategy', desc: 'Video lessons + written explanations from traders with verified track records' },
              { icon: <TrendingUp size={20} color="#1e90ff" />, title: 'Practice Immediately', desc: 'Every course links to the built-in trading simulator. No context switching.' },
              { icon: <Shield size={20} color="#ffa502" />, title: 'Test With Prop Rules', desc: 'Apply the strategy in a YN Capital prop challenge with real accountability' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: '#0f1f38', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>{icon}</div>
                <div style={{ fontWeight: 800, color: '#cdd6f4', marginBottom: 6, fontSize: 14 }}>{title}</div>
                <div style={{ fontSize: 12, color: '#4a5e7a', lineHeight: 1.6 }}>{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Teach on platform CTA */}
        <div style={{ background: 'linear-gradient(135deg, #00d4aa15, #1e90ff10)', border: '1px solid #1e3a5f', borderRadius: 16, padding: '36px', textAlign: 'center' }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Are you a profitable trader or finance creator?</div>
          <p style={{ fontSize: 14, color: '#7f93b5', marginBottom: 24, maxWidth: 500, margin: '0 auto 24px' }}>
            Publish your strategy. Students practice it instantly on our simulator. You earn 70% of every $0.99 enrollment.
          </p>
          <a href="mailto:courses@ynfinance.org?subject=Course Creator Application"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00d4aa', color: '#040c14', fontWeight: 800, textDecoration: 'none', padding: '14px 28px', borderRadius: 10, fontSize: 14 }}>
            Apply to Teach <ArrowRight size={15} />
          </a>
          <p style={{ fontSize: 11, color: '#4a5e7a', marginTop: 12 }}>Reach out on Twitter/X, YouTube comments, or email · We respond within 48h</p>
        </div>
      </div>
    </div>
  )
}
