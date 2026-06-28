'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import {
  type Call,
  type Opponent,
  C,
  fmtPrice,
  fmtPct,
  fmtTime,
  shortHash,
  statusMeta,
} from '@/components/arena/battle/types'
import { DirChip } from '@/components/arena/battle/BoutCard'
import { SealLock } from '@/components/arena/battle/SealBadge'

export default function BoutView() {
  const params = useParams<{ slug: string }>()
  const ticker = useMemo(() => decodeURIComponent(String(params?.slug || '')).toUpperCase(), [params])

  const [loading, setLoading] = useState(true)
  const [calls, setCalls] = useState<Call[]>([])
  const [opponents, setOpponents] = useState<Opponent[]>([])
  const [oppLoading, setOppLoading] = useState(true)
  const [mark, setMark] = useState<number | null>(null)

  // The net's latest sealed call for this ticker.
  const call = calls[0] ?? null

  useEffect(() => {
    if (!ticker) return
    let alive = true
    setLoading(true)
    ;(async () => {
      try {
        const r = await fetch(`/api/arena/calls?ticker=${encodeURIComponent(ticker)}`)
        const j = await r.json().catch(() => ({}))
        if (!alive) return
        setCalls(Array.isArray(j?.calls) ? j.calls : [])
      } catch {
        if (alive) setCalls([])
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [ticker])

  // Opponents depend on the call's trade_date.
  useEffect(() => {
    if (!call?.trade_date || !ticker) return
    let alive = true
    setOppLoading(true)
    ;(async () => {
      try {
        const r = await fetch(
          `/api/arena/opponents?trade_date=${encodeURIComponent(call.trade_date)}&ticker=${encodeURIComponent(ticker)}`
        )
        if (!r.ok) {
          if (alive) setOpponents([])
          return
        }
        const j = await r.json().catch(() => ({}))
        if (alive) setOpponents(Array.isArray(j?.opponents) ? j.opponents : [])
      } catch {
        if (alive) setOpponents([])
      } finally {
        if (alive) setOppLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [call?.trade_date, ticker])

  // Optional live mark-to-market.
  useEffect(() => {
    if (!ticker) return
    let alive = true
    ;(async () => {
      try {
        const r = await fetch(`/api/quote/${encodeURIComponent(ticker)}`)
        if (!r.ok) return
        const j: { quote?: { c?: number }; chartData?: Array<{ price?: number }> } = await r
          .json()
          .catch(() => ({}))
        const last = Array.isArray(j.chartData) ? j.chartData[j.chartData.length - 1]?.price : undefined
        const px = [j.quote?.c, last].find((n) => typeof n === 'number' && Number.isFinite(n) && n > 0)
        if (alive && typeof px === 'number') setMark(px)
      } catch {
        /* optional */
      }
    })()
    return () => {
      alive = false
    }
  }, [ticker])

  const ups = opponents.filter((o) => o.direction === 'up')
  const downs = opponents.filter((o) => o.direction === 'down')

  const verifyHref = call
    ? `/arena/verify?trade_date=${encodeURIComponent(call.trade_date)}&ticker=${encodeURIComponent(ticker)}`
    : '/arena/verify'

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:py-14">
      <Link href="/arena" className="text-xs transition hover:opacity-80" style={{ color: C.muted }}>
        ← back to the colosseum
      </Link>

      <header className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-semibold tracking-[0.3em]" style={{ color: C.violet }}>
            ARENA · BOUT
          </div>
          <h1 className="mt-1 font-mono text-4xl font-extrabold text-white">{ticker || '—'}</h1>
        </div>
        {call ? (
          <div className="text-right">
            <div className="text-[11px]" style={{ color: C.muted }}>
              the line
            </div>
            <div className="font-mono text-2xl font-bold text-white">{fmtPrice(call.start_price)}</div>
            {mark != null ? (
              <div
                className="font-mono text-xs"
                style={{ color: mark >= call.start_price ? C.green : C.red }}
              >
                live {fmtPrice(mark)} ({fmtPct(((mark - call.start_price) / call.start_price) * 100)})
              </div>
            ) : null}
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="mt-8 h-48 animate-pulse rounded-2xl border" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }} />
      ) : !call ? (
        <div
          className="mt-8 flex flex-col items-center rounded-2xl border px-6 py-16 text-center"
          style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}
        >
          <div className="text-3xl" aria-hidden>🏛️</div>
          <div className="mt-3 max-w-sm text-sm" style={{ color: C.muted }}>
            No sealed call for {ticker || 'this ticker'} yet — check back at the open.
          </div>
          <Link href="/arena" className="mt-4 text-sm" style={{ color: C.cyan }}>
            ← see today&apos;s bouts
          </Link>
        </div>
      ) : (
        <>
          <NetCall call={call} mark={mark} />

          {/* The field */}
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold tracking-widest" style={{ color: C.amber }}>
              THE FIELD TAKES SIDES
            </h2>
            {oppLoading ? (
              <div className="text-sm" style={{ color: C.muted }}>
                Opponents loading…
              </div>
            ) : opponents.length === 0 ? (
              <div
                className="rounded-2xl border p-5 text-sm"
                style={{ borderColor: C.border, color: C.muted, background: 'rgba(255,255,255,.02)' }}
              >
                No challengers have taken the other side yet. The field assembles at the open.
              </div>
            ) : (
              <TugOfWar ups={ups} downs={downs} netDirection={call.direction} />
            )}
          </section>

          {/* Seal */}
          <section className="mt-8 rounded-2xl border p-4" style={{ borderColor: C.border, background: 'linear-gradient(90deg, rgba(0,212,255,.05), rgba(168,85,247,.04))' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: C.cyan }}>
                  <span aria-hidden>🔒</span> SEALED BEFORE THE OUTCOME
                </div>
                <div className="mt-1 truncate font-mono text-[11px]" style={{ color: C.muted }} title={call.leaf_hash}>
                  leaf {shortHash(call.leaf_hash, 12, 10)} · sealed {fmtTime(call.sealed_at)} · resolves {call.resolve_date}
                </div>
              </div>
              <a
                href={verifyHref}
                className="shrink-0 rounded-lg border px-3.5 py-2 text-xs font-semibold transition hover:opacity-80"
                style={{ borderColor: C.cyan, color: C.cyan, background: 'rgba(0,212,255,.06)' }}
              >
                Verify this call →
              </a>
            </div>
          </section>

          {/* History */}
          {calls.length > 1 ? (
            <section className="mt-8">
              <h2 className="mb-3 text-sm font-semibold tracking-widest" style={{ color: C.muted }}>
                PRIOR CALLS ON {ticker}
              </h2>
              <div className="overflow-hidden rounded-2xl border" style={{ borderColor: C.border }}>
                {calls.slice(1).map((c) => {
                  const sm = statusMeta(c.status, c.dir_correct)
                  return (
                    <div
                      key={`${c.trade_date}-${c.ticker}`}
                      className="flex items-center justify-between border-b px-4 py-2.5 font-mono text-xs last:border-b-0"
                      style={{ borderColor: C.border }}
                    >
                      <span style={{ color: C.muted }}>{c.trade_date}</span>
                      <span style={{ color: c.direction === 'up' ? C.green : C.red }}>
                        {c.direction === 'up' ? '▲' : '▼'} {fmtPct(c.pct)} → {fmtPrice(c.target)}
                      </span>
                      <span style={{ color: sm.color }}>{sm.label}</span>
                    </div>
                  )
                })}
              </div>
            </section>
          ) : null}
        </>
      )}
    </main>
  )
}

function NetCall({ call, mark }: { call: Call; mark: number | null }) {
  const sm = statusMeta(call.status, call.dir_correct)
  const conviction = Math.max(0, Math.min(100, Math.round((call.dir_acc ?? 0) <= 1 ? (call.dir_acc ?? 0) * 100 : call.dir_acc)))
  return (
    <section className="mt-8 rounded-2xl border p-5" style={{ borderColor: C.border, background: 'rgba(255,255,255,.025)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: C.violet }}>
          🧠 BrainStock&apos;s sealed call
        </div>
        <span
          className="rounded-md px-2 py-0.5 text-[10px] font-bold tracking-wider"
          style={{ color: sm.color, border: `1px solid ${sm.color}55`, background: `${sm.color}11` }}
        >
          {sm.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-4">
        <Stat label="direction">
          <DirChip direction={call.direction} />
        </Stat>
        <Stat label="target">
          <span className="font-mono text-lg font-bold text-white">{fmtPrice(call.target)}</span>
        </Stat>
        <Stat label="move">
          <span className="font-mono text-lg font-bold" style={{ color: call.direction === 'up' ? C.green : C.red }}>
            {fmtPct(call.pct)}
          </span>
        </Stat>
        <Stat label="conviction">
          <span className="font-mono text-lg font-bold" style={{ color: C.amber }}>
            {conviction}%
          </span>
        </Stat>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[11px]" style={{ color: C.muted }}>
        <span>engine {call.engine || '—'}</span>
        <span>skill {call.skill != null ? (call.skill <= 1 ? (call.skill * 100).toFixed(1) : call.skill.toFixed(1)) : '—'}</span>
        <span>{call.horizon}d horizon</span>
        {call.actual_price != null ? <span style={{ color: '#e7ecf5' }}>marked {fmtPrice(call.actual_price)}</span> : null}
        {mark != null && call.actual_price == null ? <span>live {fmtPrice(mark)}</span> : null}
      </div>

      <div className="mt-3">
        <SealLock hash={call.leaf_hash} />
      </div>
    </section>
  )
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest" style={{ color: C.muted }}>
        {label}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  )
}

function TugOfWar({ ups, downs, netDirection }: { ups: Opponent[]; downs: Opponent[]; netDirection: 'up' | 'down' }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <SideColumn
        title="LONG THE TAPE"
        symbol="▲"
        color={C.green}
        opponents={ups}
        netAligned={netDirection === 'up'}
      />
      <SideColumn
        title="SHORT THE TAPE"
        symbol="▼"
        color={C.red}
        opponents={downs}
        netAligned={netDirection === 'down'}
      />
    </div>
  )
}

function SideColumn({
  title,
  symbol,
  color,
  opponents,
  netAligned,
}: {
  title: string
  symbol: string
  color: string
  opponents: Opponent[]
  netAligned: boolean
}) {
  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: `${color}33`, background: `${color}08` }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold" style={{ color }}>
          <span aria-hidden>{symbol}</span> {title}
        </div>
        {netAligned ? (
          <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ color: C.violet, border: `1px solid ${C.violet}55` }}>
            NET SIDE
          </span>
        ) : null}
      </div>
      {opponents.length === 0 ? (
        <div className="py-3 text-xs" style={{ color: C.muted }}>
          No takers on this side.
        </div>
      ) : (
        <div className="space-y-2.5">
          {opponents.map((o) => (
            <div key={o.opponent_id} className="rounded-xl border p-3" style={{ borderColor: C.border, background: 'rgba(255,255,255,.02)' }}>
              <div className="flex items-center justify-between">
                <div className="truncate text-sm font-semibold text-white">{o.opponent_name || o.opponent_id}</div>
                <span className="font-mono text-xs" style={{ color }}>
                  {Math.round((o.conviction ?? 0) <= 1 ? (o.conviction ?? 0) * 100 : o.conviction)}%
                </span>
              </div>
              {o.kind ? (
                <div className="text-[10px] uppercase tracking-wider" style={{ color: C.muted }}>
                  {o.kind}
                </div>
              ) : null}
              {o.rationale ? (
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: '#c3cad8' }}>
                  {o.rationale}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
