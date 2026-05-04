'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Zap, Star, Users, Clock, ChevronRight, Search, BookOpen, TrendingUp, Play } from 'lucide-react'
import { SEED_COURSES } from '@/app/api/courses/route'

type Strategy = 'All' | 'Scalping' | 'Day Trading' | 'Swing' | 'Options Flow' | 'Forex Swing' | 'Futures'
type Difficulty = 'All' | 'Beginner' | 'Intermediate' | 'Advanced'

interface Course {
  id: string; slug: string; title: string; description: string
  trader_name: string; trader_handle: string; trader_avatar_color: string
  strategy_type: string; difficulty: string; price_cents: number
  thumbnail_color: string; rating: number; enrollment_count: number
  tags: string[]; is_free: boolean
}

const AdBanner = ({ slot }: { slot: string }) => (
  <div className="w-full h-16 bg-[#071220] border border-[#1a2d4a] rounded-lg flex items-center justify-center">
    <span className="text-[10px] text-[#4a5e7a] uppercase tracking-wider">Advertisement · {slot}</span>
  </div>
)

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [strategy, setStrategy] = useState<Strategy>('All')
  const [difficulty, setDifficulty] = useState<Difficulty>('All')

  useEffect(() => {
    fetch('/api/courses').then(r => r.json()).then(json => {
      setCourses(json.courses || SEED_COURSES)
      setLoading(false)
    }).catch(() => { setCourses(SEED_COURSES as unknown as Course[]); setLoading(false) })
  }, [])

  const filtered = courses.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.trader_name.toLowerCase().includes(search.toLowerCase())) return false
    if (strategy !== 'All' && c.strategy_type !== strategy) return false
    if (difficulty !== 'All' && c.difficulty !== difficulty) return false
    return true
  })

  const STRATEGIES: Strategy[] = ['All','Scalping','Day Trading','Swing','Options Flow','Forex Swing','Futures']
  const DIFFICULTIES: Difficulty[] = ['All','Beginner','Intermediate','Advanced']
  const DIFF_COLOR: Record<string, string> = { Beginner: '#00d4aa', Intermediate: '#ffa502', Advanced: '#ff4757' }

  return (
    <div style={{ background: '#040c14', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif', color: '#cdd6f4' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '1px solid #1a2d4a', background: '#040c14', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', height: 60, gap: 24 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Zap size={13} color="#040c14" fill="#040c14" />
            </div>
            <span style={{ fontWeight: 900, color: '#fff', fontSize: 15 }}>YN Finance</span>
          </Link>
          <span style={{ color: '#1a2d4a' }}>/</span>
          <span style={{ color: '#00d4aa', fontSize: 13, fontWeight: 700 }}>Courses</span>
          <div style={{ flex: 1 }} />
          <Link href="/app" style={{ fontSize: 12, fontWeight: 700, color: '#040c14', background: '#00d4aa', textDecoration: 'none', padding: '7px 16px', borderRadius: 6 }}>
            Launch Terminal →
          </Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00d4aa15', border: '1px solid #00d4aa40', borderRadius: 100, padding: '5px 14px', marginBottom: 16 }}>
            <BookOpen size={11} color="#00d4aa" />
            <span style={{ fontSize: 11, color: '#00d4aa', fontWeight: 700 }}>Real strategies from real traders · $0.99 each</span>
          </div>
          <h1 style={{ fontSize: 40, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 10 }}>
            Learn. Practice. Get Funded.
          </h1>
          <p style={{ fontSize: 15, color: '#7f93b5', maxWidth: 560 }}>
            Every course teaches you a real strategy — then you practice it immediately on the built-in simulator. No other platform lets you learn and trade in the same tab.
          </p>
        </div>

        {/* Ad slot */}
        <AdBanner slot="courses-top-banner" />

        {/* Search + filters */}
        <div style={{ display: 'flex', gap: 12, margin: '24px 0', flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#071220', border: '1px solid #1a2d4a', borderRadius: 8, padding: '8px 12px', flex: 1, minWidth: 200 }}>
            <Search size={13} color="#4a5e7a" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search strategies or traders..."
              style={{ background: 'none', border: 'none', outline: 'none', color: '#cdd6f4', fontSize: 13, flex: 1 }} />
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STRATEGIES.map(s => (
              <button key={s} onClick={() => setStrategy(s)}
                style={{ padding: '6px 12px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', transition: 'all 0.15s',
                  background: strategy === s ? '#00d4aa' : '#071220', color: strategy === s ? '#040c14' : '#7f93b5',
                  outline: strategy === s ? 'none' : '1px solid #1a2d4a' }}>
                {s}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setDifficulty(d)}
                style={{ padding: '6px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: difficulty === d ? (DIFF_COLOR[d] || '#7f93b5') : '#071220',
                  color: difficulty === d ? '#040c14' : '#7f93b5',
                  outline: difficulty === d ? 'none' : '1px solid #1a2d4a' }}>
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Course grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20, marginBottom: 32 }}>
          {loading ? Array.from({ length: 4 }).map((_, i) => (
            <div key={i} style={{ height: 280, background: '#071220', borderRadius: 12, border: '1px solid #1a2d4a', animation: 'pulse 2s infinite' }} />
          )) : filtered.map(course => (
            <Link key={course.id} href={`/courses/${course.slug}`} style={{ textDecoration: 'none' }}>
              <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.2s, transform 0.2s', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = course.thumbnail_color; (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = '#1a2d4a'; (e.currentTarget as HTMLElement).style.transform = 'none' }}>

                {/* Thumbnail */}
                <div style={{ height: 120, background: `linear-gradient(135deg, ${course.thumbnail_color}30, ${course.thumbnail_color}10)`, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', borderBottom: `1px solid ${course.thumbnail_color}20` }}>
                  <div style={{ width: 48, height: 48, borderRadius: 12, background: `${course.thumbnail_color}20`, border: `1px solid ${course.thumbnail_color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={20} color={course.thumbnail_color} fill={course.thumbnail_color} />
                  </div>
                  <div style={{ position: 'absolute', top: 10, right: 10, background: `${course.thumbnail_color}`, color: '#040c14', fontSize: 11, fontWeight: 800, padding: '3px 10px', borderRadius: 100 }}>
                    {course.is_free ? 'FREE' : `$${(course.price_cents / 100).toFixed(2)}`}
                  </div>
                  <div style={{ position: 'absolute', bottom: 10, left: 10, background: `${DIFF_COLOR[course.difficulty] || '#7f93b5'}20`, color: DIFF_COLOR[course.difficulty] || '#7f93b5', fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                    {course.difficulty}
                  </div>
                </div>

                <div style={{ padding: '16px' }}>
                  <div style={{ fontSize: 11, color: course.thumbnail_color, fontWeight: 700, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {course.strategy_type}
                  </div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 8, lineHeight: 1.3 }}>{course.title}</h3>
                  <p style={{ fontSize: 11, color: '#7f93b5', lineHeight: 1.6, marginBottom: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {course.description}
                  </p>

                  {/* Trader */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${course.trader_avatar_color}20`, color: course.trader_avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800 }}>
                      {course.trader_name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#cdd6f4' }}>{course.trader_name}</div>
                      <div style={{ fontSize: 9, color: '#4a5e7a' }}>{course.trader_handle}</div>
                    </div>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 10, color: '#4a5e7a' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Star size={10} fill="#ffa502" color="#ffa502" />
                      <span style={{ fontWeight: 700, color: '#ffa502', fontFamily: 'monospace' }}>{course.rating}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                      <Users size={10} />
                      <span>{course.enrollment_count.toLocaleString()}</span>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4, color: course.thumbnail_color, fontWeight: 700, fontSize: 11 }}>
                      Start Learning <ChevronRight size={12} />
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filtered.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#4a5e7a' }}>
            <BookOpen size={32} style={{ margin: '0 auto 12px' }} />
            <p style={{ fontSize: 14 }}>No courses match your filters</p>
          </div>
        )}

        {/* Bottom ad */}
        <AdBanner slot="courses-bottom-banner" />

        {/* CTA to become a trader/instructor */}
        <div style={{ marginTop: 40, background: 'linear-gradient(135deg, #071220, #040c14)', border: '1px solid #1e3a5f', borderRadius: 16, padding: '32px', textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginBottom: 8 }}>Are you a profitable trader?</div>
          <p style={{ fontSize: 13, color: '#7f93b5', marginBottom: 20, maxWidth: 480, margin: '0 auto 20px' }}>
            Publish your strategy as a course. Earn 70% revenue share. Your students practice on the built-in simulator.
          </p>
          <a href="mailto:courses@ynfinance.org?subject=Become a Course Creator" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#00d4aa', color: '#040c14', fontWeight: 800, textDecoration: 'none', padding: '12px 28px', borderRadius: 8, fontSize: 13 }}>
            Apply to Teach <ChevronRight size={14} />
          </a>
        </div>
      </div>
    </div>
  )
}
