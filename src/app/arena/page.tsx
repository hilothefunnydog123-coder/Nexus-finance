'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { type Call, type Seal, type Standing, C } from '@/components/arena/battle/types'
import { BoutCard } from '@/components/arena/battle/BoutCard'
import { SealBanner } from '@/components/arena/battle/SealBadge'
import { LeaderboardStrip } from '@/components/arena/battle/LeaderboardStrip'

export default function ArenaHub() {
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(true)
  const [calls, setCalls] = useState<Call[]>([])
  const [seal, setSeal] = useState<Seal>(null)
  const [tradeDate, setTradeDate] = useState<string>('')
  const [standings, setStandings] = useState<Standing[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const r = await fetch('/api/arena/calls')
        const j = await r.json().catch(() => ({}))
        if (!alive) return
        if (r.ok && j && j.available !== false) {
          setCalls(Array.isArray(j.calls) ? j.calls : [])
          setSeal(j.seal ?? null)
          setTradeDate(j.trade_date ?? '')
        } else {
          setAvailable(false)
        }
      } catch {
        if (alive) setAvailable(false)
      } finally {
        if (alive) setLoading(false)
      }
    })()
    // Leaderboard is optional — may 404 during build.
    ;(async () => {
      try {
        const r = await fetch('/api/arena/leaderboard')
        if (!r.ok) return
        const j = await r.json().catch(() => ({}))
        if (alive && Array.isArray(j?.standings)) setStandings(j.standings)
      } catch {
        /* optional */
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  const verifyHref = tradeDate ? `/arena/verify?trade_date=${encodeURIComponent(tradeDate)}` : '/arena/verify'

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      {/* Hero */}
      <header className="mb-8">
        <div className="text-xs font-semibold tracking-[0.3em]" style={{ color: C.violet }}>
          THE ARENA
        </div>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          The AI calls it. <span style={{ color: C.green }}>The field</span> takes the other side.{' '}
          <span style={{ color: C.cyan }}>The chain</span> seals it.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed" style={{ color: C.muted }}>
          Every market morning BrainStock posts a forecast, rival AIs take their own side, and every call is
          cryptographically committed to a signed Merkle root <em>before</em> the outcome is known — then graded against
          real prices. No cherry-picking. No edits.
        </p>
      </header>

      {/* Seal banner */}
      {loading ? (
        <div className="h-24 animate-pulse rounded-2xl border" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }} />
      ) : seal ? (
        <SealBanner
          merkleRoot={seal.merkle_root}
          leafCount={seal.leaf_count}
          sealedAt={seal.sealed_at}
          alg={seal.alg}
          tradeDate={tradeDate}
          verifyHref={verifyHref}
        />
      ) : (
        <div className="rounded-2xl border p-4 text-sm" style={{ borderColor: C.border, color: C.muted, background: 'rgba(255,255,255,.02)' }}>
          No day sealed yet — the field gets locked in at the open. Check back at market morning.
        </div>
      )}

      {/* Leaderboard teaser */}
      <div className="mt-6">
        <LeaderboardStrip standings={standings} />
      </div>

      {/* Bouts grid */}
      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold tracking-widest" style={{ color: C.cyan }}>
            TODAY&apos;S BOUTS{calls.length ? ` · ${calls.length}` : ''}
          </h2>
        </div>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-40 animate-pulse rounded-2xl border" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }} />
            ))}
          </div>
        ) : !available ? (
          <EmptyState text="The Arena is warming up — bouts will appear here once the engine is live." />
        ) : calls.length === 0 ? (
          <EmptyState text="No bout sealed yet — check back at the open." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {calls.map((c) => (
              <BoutCard key={`${c.trade_date}-${c.ticker}`} call={c} />
            ))}
          </div>
        )}
      </section>

      <footer className="mt-12 border-t pt-6 text-xs" style={{ borderColor: C.border, color: C.muted }}>
        Calls are committed to a signed Merkle root before resolution.{' '}
        <Link href={verifyHref} style={{ color: C.cyan }} className="hover:opacity-80">
          Verify the seal
        </Link>{' '}
        for any day.
      </footer>
    </main>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center"
      style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}
    >
      <div className="text-3xl" aria-hidden>🏛️</div>
      <div className="mt-3 max-w-sm text-sm" style={{ color: C.muted }}>
        {text}
      </div>
    </div>
  )
}
