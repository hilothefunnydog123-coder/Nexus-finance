'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Trophy, Flame, Share2, Copy, Check, Swords } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { C, statusMeta } from '@/components/arena/battle/types'
import { useCountUp } from '@/components/arena/battle/hooks'

type Tally = { wins: number; losses: number; pending: number; winRate: number }
type H2H = { id: string; name: string; wins: number; winRate: number; userBeat: boolean }
type Stats = { overall: Tally; weekly: Tally; streak: { current: number; best: number }; weeklyH2H: H2H[]; beatThisWeek: string[]; totalPicks: number; sealedPicks: number }
type PickRow = { trade_date: string; ticker: string; direction: 'up' | 'down'; status: string; dir_correct: boolean | null }
type Me = { available: boolean; authed?: boolean; handle?: string; stats?: Stats; picks?: PickRow[]; share?: { token: string; path: string } }

export default function MyRecord() {
  const { isLoggedIn, loading: authLoading, getToken, signInWithGoogle } = useAuth()
  const [me, setMe] = useState<Me | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let alive = true
    if (authLoading) return
    if (!isLoggedIn) {
      setLoaded(true)
      return
    }
    ;(async () => {
      try {
        const token = await getToken()
        const r = await fetch('/api/arena/me', { headers: token ? { Authorization: `Bearer ${token}` } : {} })
        const j = (await r.json().catch(() => null)) as Me | null
        if (alive) setMe(j)
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [isLoggedIn, authLoading, getToken])

  const shareUrl = me?.share?.path ? `${typeof window !== 'undefined' ? window.location.origin : ''}${me.share.path}` : ''
  const stats = me?.stats
  const beat = stats?.beatThisWeek ?? []
  const headline =
    beat.length === 2 ? 'I beat BOTH AIs this week.' : beat.length === 1 ? `I beat ${beat[0]} this week.` : "I'm battling the AIs in The Arena."
  const tweet = `${headline} ${stats ? `${stats.weekly.wins}-${stats.weekly.losses} this week, ${stats.weekly.winRate}% calling the market.` : ''} Take the other side 👇`

  const copy = useCallback(() => {
    if (!shareUrl) return
    navigator.clipboard?.writeText(shareUrl).then(
      () => {
        setCopied(true)
        setTimeout(() => setCopied(false), 1800)
      },
      () => {}
    )
  }, [shareUrl])

  if (authLoading || (!loaded && isLoggedIn)) {
    return <Wrap><div className="h-64 animate-pulse rounded-2xl border" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }} /></Wrap>
  }

  if (!isLoggedIn) {
    return (
      <Wrap>
        <Header />
        <div className="av-rise mt-6 rounded-2xl border p-8 text-center" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
          <Swords size={26} style={{ color: C.amber }} className="mx-auto" />
          <p className="mx-auto mt-3 max-w-md text-sm" style={{ color: C.muted }}>
            Sign in to build your record against the machines and earn your signed <span style={{ color: '#e7ecf5' }}>&ldquo;I beat the AIs&rdquo;</span> card.
          </p>
          <button onClick={() => signInWithGoogle()} className="mt-4 rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: C.amber, color: '#05060a' }}>
            Sign in to enter
          </button>
        </div>
      </Wrap>
    )
  }

  if (!stats || stats.totalPicks === 0) {
    return (
      <Wrap>
        <Header handle={me?.handle} />
        <div className="av-rise mt-6 rounded-2xl border p-8 text-center" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
          <div className="text-sm" style={{ color: C.muted }}>No picks yet. Enter a live bout and take the other side of the AIs.</div>
          <Link href="/arena" className="mt-4 inline-block rounded-xl px-5 py-2.5 text-sm font-bold" style={{ background: C.cyan, color: '#05060a' }}>
            Find a live bout →
          </Link>
        </div>
      </Wrap>
    )
  }

  return (
    <Wrap>
      <Header handle={me?.handle} />

      {/* Headline record tiles */}
      <div className="av-rise mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <BigTile label="record" value={`${stats.overall.wins}-${stats.overall.losses}`} color="#e7ecf5" />
        <BigTile label="win rate" value={`${stats.overall.winRate}%`} color={C.green} animateTo={stats.overall.winRate} suffix="%" />
        <BigTile label="streak" value={streakLabel(stats.streak.current)} color={stats.streak.current >= 0 ? C.green : C.red} icon={stats.streak.current >= 3 ? <Flame size={18} /> : undefined} />
        <BigTile label="best run" value={`${stats.streak.best}W`} color={C.amber} />
      </div>

      {/* This week vs the AIs */}
      <section className="av-rise mt-6 rounded-2xl border p-5" style={{ borderColor: beat.length ? `${C.green}44` : C.border, background: beat.length ? 'rgba(0,255,136,.05)' : 'rgba(255,255,255,.02)' }}>
        <div className="flex items-center justify-between">
          <div className="text-sm font-bold tracking-widest" style={{ color: C.amber }}>THIS WEEK vs THE AIs</div>
          {beat.length ? (
            <span className="rounded-full px-2.5 py-0.5 text-[11px] font-black" style={{ background: C.green, color: '#05060a' }}>
              {beat.length === 2 ? 'BEAT BOTH 🔥' : `BEAT ${beat[0].toUpperCase()}`}
            </span>
          ) : null}
        </div>
        <div className="mt-4 space-y-2.5">
          <H2HBar name="You" winRate={stats.weekly.winRate} record={`${stats.weekly.wins}-${stats.weekly.losses}`} color={C.green} highlight />
          {stats.weeklyH2H.map((h) => (
            <H2HBar key={h.id} name={h.name} winRate={h.winRate} record={`${h.wins} won`} color={h.id === 'brainstock' ? C.violet : C.cyan} />
          ))}
        </div>
      </section>

      {/* Share */}
      <section className="av-rise mt-6 overflow-hidden rounded-2xl border p-5" style={{ borderColor: `${C.amber}44`, background: 'linear-gradient(120deg, rgba(255,149,0,.1), rgba(168,85,247,.08))' }}>
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="text-lg font-black text-white">{headline}</div>
            <div className="mt-0.5 text-sm" style={{ color: C.muted }}>Drop the receipt. Your card is signed — anyone can verify it.</div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(tweet)}&url=${encodeURIComponent(shareUrl)}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Share on X"
              className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition hover:scale-[1.03]"
              style={{ background: C.amber, color: '#05060a' }}
            >
              <Share2 size={15} /> Share on X
            </a>
            <button onClick={copy} className="inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition hover:scale-[1.03]" style={{ borderColor: C.border, color: '#e7ecf5' }}>
              {copied ? <Check size={15} style={{ color: C.green }} /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy link'}
            </button>
            {me?.share?.path ? (
              <Link href={me.share.path} className="text-sm font-semibold transition hover:opacity-80" style={{ color: C.cyan }}>
                preview card →
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Picks */}
      <section className="mt-8">
        <div className="mb-3 text-sm font-bold tracking-widest" style={{ color: C.muted }}>YOUR PICKS</div>
        <div className="overflow-hidden rounded-2xl border" style={{ borderColor: C.border }}>
          {(me?.picks ?? []).slice(0, 30).map((p, i) => {
            const sm = statusMeta(p.status, p.dir_correct)
            const up = p.direction === 'up'
            return (
              <Link key={`${p.trade_date}-${p.ticker}-${i}`} href={`/arena/${encodeURIComponent(p.ticker)}`} className="flex items-center justify-between border-b px-4 py-2.5 font-mono text-xs transition last:border-b-0 hover:bg-white/[.03]" style={{ borderColor: C.border }}>
                <span className="font-bold text-white">{p.ticker}</span>
                <span style={{ color: up ? C.green : C.red }}>{up ? '▲ UP' : '▼ DOWN'}</span>
                <span style={{ color: C.muted }}>{p.trade_date}</span>
                <span style={{ color: sm.color }}>{sm.label}</span>
              </Link>
            )
          })}
        </div>
      </section>
    </Wrap>
  )
}

function streakLabel(n: number): string {
  if (n === 0) return '—'
  return n > 0 ? `${n}W` : `${Math.abs(n)}L`
}

function Wrap({ children }: { children: React.ReactNode }) {
  return <main className="relative z-[1] mx-auto max-w-3xl px-5 py-10 sm:py-14">{children}</main>
}

function Header({ handle }: { handle?: string }) {
  return (
    <header className="av-rise">
      <Link href="/arena" className="text-xs transition hover:opacity-80" style={{ color: C.muted }}>← the colosseum</Link>
      <div className="mt-3 flex items-center gap-2 text-[11px] font-bold tracking-[0.3em]" style={{ color: C.amber }}>
        <Trophy size={13} /> YOUR ARENA RECORD
      </div>
      <h1 className="mt-1 text-3xl font-black text-white sm:text-4xl">{handle ? `${handle} vs the Machines` : 'You vs the Machines'}</h1>
    </header>
  )
}

function BigTile({ label, value, color, animateTo, suffix, icon }: { label: string; value: string; color: string; animateTo?: number; suffix?: string; icon?: React.ReactNode }) {
  const n = useCountUp(animateTo ?? 0, 1100)
  return (
    <div className="av-pop rounded-2xl border p-4" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>{label}</div>
      <div className="mt-1.5 flex items-center gap-1.5 font-mono text-2xl font-black" style={{ color }}>
        {icon}
        {animateTo != null ? `${Math.round(n)}${suffix ?? ''}` : value}
      </div>
    </div>
  )
}

function H2HBar({ name, winRate, record, color, highlight }: { name: string; winRate: number; record: string; color: string; highlight?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 shrink-0 text-sm font-semibold" style={{ color: highlight ? '#fff' : '#c3cad8' }}>{name}</div>
      <div className="relative h-6 flex-1 overflow-hidden rounded-md" style={{ background: 'rgba(255,255,255,.06)' }}>
        <div className="h-full rounded-md transition-all duration-700" style={{ width: `${Math.max(3, winRate)}%`, background: `linear-gradient(90deg, ${color}, ${color}99)`, boxShadow: highlight ? `0 0 14px ${color}66` : 'none' }} />
        <span className="absolute inset-y-0 right-2 flex items-center font-mono text-[11px]" style={{ color: C.muted }}>{record}</span>
      </div>
      <div className="w-12 shrink-0 text-right font-mono text-sm font-bold" style={{ color }}>{winRate}%</div>
    </div>
  )
}
