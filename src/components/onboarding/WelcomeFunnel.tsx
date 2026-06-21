'use client'

/* ════════════════════════════════════════════════════════════════════════
   WelcomeFunnel — first-visit segmenter for the landing page.
   One question, three honest paths. Routes a new visitor to the product
   that matches their intent instead of dumping them on the homepage.
   Paper-noir language, matches src/app/page.tsx tokens. localStorage-gated.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, X, LineChart, ScanSearch, GraduationCap, PlayCircle } from 'lucide-react'

const INK = '#0a0a0c'
const BONE = '#f3f1ea'
const PAPER = '#fbfaf7'
const ACCENT = '#1f3bff'
const LINE = 'rgba(10,10,12,.12)'

const KEY = 'yn_welcome_v1'

type Path = {
  icon: React.ReactNode
  tag: string
  title: string
  line: string
  href: string
  cta: string
}

const PATHS: Path[] = [
  {
    icon: <LineChart size={22} strokeWidth={2} />,
    tag: 'I WANT THE CALLS',
    title: "See today's forecasts",
    line: 'The neural net ranks ~300 stocks every morning and grades itself in public. Start with what it likes today.',
    href: '/brainstock',
    cta: 'Open BrainStock',
  },
  {
    icon: <ScanSearch size={22} strokeWidth={2} />,
    tag: 'I HAVE A TICKER',
    title: 'Analyze a stock',
    line: 'A 15-second institutional read on any symbol — verdict, conviction, payoff math. Your first three are free.',
    href: '/ai-stocks',
    cta: 'Analyze a stock',
  },
  {
    icon: <GraduationCap size={22} strokeWidth={2} />,
    tag: "I'M HERE TO LEARN",
    title: 'Learn the edge',
    line: 'Pro-trader courses and ready-to-run algorithms. $0.99 a course, no subscription.',
    href: '/courses',
    cta: 'Browse courses',
  },
]

export default function WelcomeFunnel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    // First visit only; never interrupt deep-linked arrivals with a hash/query.
    let seen = '1'
    try { seen = localStorage.getItem(KEY) || '' } catch { /* SSR / privacy mode */ }
    if (seen) return
    const t = setTimeout(() => setOpen(true), 1100)
    return () => clearTimeout(t)
  }, [])

  const dismiss = () => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    setLeaving(true)
    setTimeout(() => setOpen(false), 240)
  }

  const choose = (href: string) => {
    try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
    router.push(href)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') dismiss() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Where do you want to start?"
      onClick={dismiss}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 'clamp(16px,4vw,40px)',
        background: 'rgba(10,10,12,.42)', backdropFilter: 'blur(6px)',
        opacity: leaving ? 0 : 1, transition: 'opacity .24s ease',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes wf-rise{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
        .wf-card{animation:wf-rise .42s cubic-bezier(.16,1,.3,1) both}
        .wf-path{transition:background .2s,border-color .2s,transform .2s}
        .wf-path:hover{background:${PAPER};border-color:${INK};transform:translateX(4px)}
        .wf-path:hover .wf-arrow{transform:translateX(4px);color:${ACCENT}}
        @media(prefers-reduced-motion:reduce){.wf-card{animation:none}.wf-path:hover{transform:none}}
      `}</style>

      <div
        className="wf-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(560px,100%)', maxHeight: '92vh', overflowY: 'auto',
          background: BONE, color: INK, border: `1px solid ${LINE}`,
          boxShadow: '0 40px 120px rgba(10,10,12,.4)',
        }}
      >
        {/* header */}
        <div style={{ padding: 'clamp(24px,4vw,34px) clamp(22px,4vw,34px) 0', position: 'relative' }}>
          <button
            onClick={dismiss}
            aria-label="Close"
            style={{ position: 'absolute', top: 18, right: 18, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,12,.45)', padding: 4 }}
          >
            <X size={18} />
          </button>
          <div style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 11, letterSpacing: '0.22em', color: ACCENT, marginBottom: 14 }}>
            // WELCOME TO YN FINANCE
          </div>
          <h2 className="disp" style={{ fontFamily: 'var(--font-display), system-ui, sans-serif', fontWeight: 700, letterSpacing: '-0.04em', fontSize: 'clamp(1.5rem,4vw,2.1rem)', lineHeight: 1.04, marginBottom: 10 }}>
            Where do you want to start?
          </h2>
          <p style={{ fontSize: 14.5, lineHeight: 1.55, color: 'rgba(10,10,12,.6)', maxWidth: 420 }}>
            Pick one — we&apos;ll take you straight there. You can always explore the rest.
          </p>
        </div>

        {/* paths */}
        <div style={{ padding: 'clamp(18px,3vw,26px)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {PATHS.map((p) => (
            <button
              key={p.href}
              className="wf-path"
              onClick={() => choose(p.href)}
              style={{
                display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 16, alignItems: 'center',
                textAlign: 'left', cursor: 'pointer', width: '100%',
                background: 'transparent', border: `1px solid ${LINE}`, padding: '16px 18px',
              }}
            >
              <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', border: `1px solid ${LINE}`, color: INK, flexShrink: 0 }}>
                {p.icon}
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontFamily: 'var(--font-mono), monospace', fontSize: 10, letterSpacing: '0.16em', color: ACCENT, marginBottom: 4 }}>{p.tag}</span>
                <span style={{ display: 'block', fontWeight: 700, fontSize: 16, marginBottom: 3 }}>{p.title}</span>
                <span style={{ display: 'block', fontSize: 13, lineHeight: 1.5, color: 'rgba(10,10,12,.6)' }}>{p.line}</span>
              </span>
              <ArrowRight className="wf-arrow" size={18} style={{ color: 'rgba(10,10,12,.35)', transition: 'transform .2s, color .2s' }} />
            </button>
          ))}
        </div>

        {/* footer — demo + skip */}
        <div style={{ borderTop: `1px solid ${LINE}`, padding: '14px clamp(22px,4vw,26px)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <button
            onClick={() => choose('/demo')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'none', border: 'none', cursor: 'pointer', color: INK, fontSize: 13.5, fontWeight: 600, padding: 0 }}
          >
            <PlayCircle size={16} /> Watch the 60-second demo
          </button>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(10,10,12,.5)', fontSize: 13, padding: 0 }}
          >
            Just let me look around
          </button>
        </div>
      </div>
    </div>
  )
}
