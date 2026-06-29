'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Radio, Timer, Swords, ChevronDown } from 'lucide-react'
import { C } from '@/components/arena/battle/types'
import { useArenaLive, useCountdown } from '@/components/arena/battle/hooks'
import TickerTape from '@/components/arena/battle/TickerTape'
import TaleOfTheTape from '@/components/arena/battle/TaleOfTheTape'
import SealRibbon from '@/components/arena/battle/SealRibbon'
import LiveStandings from '@/components/arena/battle/LiveStandings'
import { LiveBoutCard } from '@/components/arena/battle/LiveBoutCard'

const FEATURED = 12

export default function ArenaHub() {
  const live = useArenaLive(20000)
  const [showAll, setShowAll] = useState(false)

  // Most dramatic bouts first (biggest implied move).
  const ranked = useMemo(() => [...live.calls].sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct)), [live.calls])
  const shown = showAll ? ranked : ranked.slice(0, FEATURED)

  const modelCount = useMemo(() => {
    const ids = new Set<string>()
    for (const arr of Object.values(live.modelsByTicker)) for (const m of arr) ids.add(m.model_id)
    return ids.size
  }, [live.modelsByTicker])

  const resolveDate = live.calls[0]?.resolve_date
  const cd = useCountdown(resolveDate)
  const verifyHref = live.tradeDate ? `/arena/verify?trade_date=${encodeURIComponent(live.tradeDate)}` : '/arena/verify'

  return (
    <>
      <TickerTape calls={ranked} />

      <main className="relative z-[1] mx-auto max-w-6xl px-5 py-10 sm:py-12">
        {/* Hero */}
        <header className="av-rise mb-7">
          <div className="flex items-center gap-2 text-[11px] font-bold tracking-[0.35em]" style={{ color: C.violet }}>
            <Swords size={13} /> THE ARENA
          </div>
          <h1 className="mt-2 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-6xl">
            AI <span style={{ color: C.violet }}>vs</span> AI <span style={{ color: C.cyan }}>vs</span>{' '}
            <span style={{ color: C.amber }}>the Crowd</span>
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base" style={{ color: C.muted }}>
            Every market morning the models call the tape — independently, sealed to a signed Merkle root{' '}
            <em>before</em> the outcome — then get graded against real prices. No cherry-picking. No edits. Just receipts.
          </p>

          {/* live status bar */}
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold" style={{ color: C.green }}>
              <Radio size={13} className="av-live" /> LIVE
            </span>
            <Metric label="bouts sealed" value={live.calls.length} />
            <Metric label="models in" value={modelCount || '—'} />
            {cd.valid && !cd.done ? (
              <span className="inline-flex items-center gap-1.5 font-mono" style={{ color: C.muted }}>
                <Timer size={13} style={{ color: C.amber }} />
                resolves in{' '}
                <span className="font-bold" style={{ color: '#e7ecf5' }}>
                  {cd.d > 0 ? `${cd.d}d ` : ''}
                  {pad(cd.h)}:{pad(cd.m)}:{pad(cd.s)}
                </span>
              </span>
            ) : null}
          </div>
        </header>

        {/* Tale of the tape */}
        {live.loading ? (
          <Skeleton h={230} />
        ) : (
          <TaleOfTheTape standings={live.standings} demo={live.demoStandings} />
        )}

        {/* Seal proof */}
        <div className="mt-6">
          {live.loading ? <Skeleton h={96} /> : <SealRibbon seal={live.seal} tradeDate={live.tradeDate} verifyHref={verifyHref} />}
        </div>

        {/* Standings */}
        {!live.loading ? (
          <div className="mt-6">
            <LiveStandings standings={live.standings} demo={live.demoStandings} />
          </div>
        ) : null}

        {/* Bouts */}
        <section className="mt-9">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-bold tracking-widest" style={{ color: C.cyan }}>
              <span className="av-live inline-block h-2 w-2 rounded-full" style={{ background: C.cyan }} />
              TODAY&apos;S BOUTS{live.calls.length ? ` · ${live.calls.length}` : ''}
            </h2>
            {live.lastSync ? (
              <span className="font-mono text-[10px]" style={{ color: C.muted }}>
                synced {new Date(live.lastSync).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            ) : null}
          </div>

          {live.loading ? (
            <Grid>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} h={188} />
              ))}
            </Grid>
          ) : !live.available ? (
            <EmptyState text="The Arena is warming up — bouts appear here once the engine seals the day." />
          ) : ranked.length === 0 ? (
            <EmptyState text="No bout sealed yet — the field gets locked in at the open." />
          ) : (
            <>
              <Grid>
                {shown.map((c, i) => (
                  <LiveBoutCard key={`${c.trade_date}-${c.ticker}`} call={c} models={live.modelsByTicker[c.ticker] ?? []} index={i} />
                ))}
              </Grid>
              {ranked.length > FEATURED ? (
                <div className="mt-5 flex justify-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-xs font-semibold transition hover:scale-[1.03]"
                    style={{ borderColor: C.border, color: C.cyan, background: 'rgba(255,255,255,.03)' }}
                  >
                    {showAll ? 'Show featured only' : `Show all ${ranked.length} bouts`}
                    <ChevronDown size={13} className="transition" style={{ transform: showAll ? 'rotate(180deg)' : 'none' }} />
                  </button>
                </div>
              ) : null}
            </>
          )}
        </section>

        <footer className="mt-12 border-t pt-6 text-xs" style={{ borderColor: C.border, color: C.muted }}>
          Every call is committed to a signed, chain-linked Merkle root before resolution.{' '}
          <Link href={verifyHref} style={{ color: C.cyan }} className="hover:opacity-80">
            Verify the seal
          </Link>{' '}
          for any day — the math, not our word.
        </footer>
      </main>
    </>
  )
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <span className="inline-flex items-baseline gap-1.5" style={{ color: C.muted }}>
      <span className="font-mono text-sm font-bold" style={{ color: '#e7ecf5' }}>{value}</span>
      {label}
    </span>
  )
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
}

function Skeleton({ h }: { h: number }) {
  return <div className="animate-pulse rounded-2xl border" style={{ height: h, borderColor: C.border, background: 'rgba(255,255,255,.02)' }} />
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
      <Swords size={26} style={{ color: C.muted }} aria-hidden />
      <div className="mt-3 max-w-sm text-sm" style={{ color: C.muted }}>{text}</div>
    </div>
  )
}
