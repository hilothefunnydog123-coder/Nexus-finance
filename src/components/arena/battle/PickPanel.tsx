'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Swords, Lock, ArrowUp, ArrowDown, Trophy } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { C, shortHash, statusMeta } from './types'

type Pick = { trade_date: string; ticker: string; direction: 'up' | 'down'; status: string; dir_correct?: boolean | null; leaf_hash?: string | null; sealed_at?: string }

// "Enter the bout" — a signed-in human locks a side on a live sealed call.
export default function PickPanel({
  ticker,
  tradeDate,
  netDirection,
  live,
}: {
  ticker: string
  tradeDate: string
  netDirection: 'up' | 'down'
  live: boolean
}) {
  const { isLoggedIn, loading: authLoading, getToken, signInWithGoogle } = useAuth()
  const [pick, setPick] = useState<Pick | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState<'up' | 'down' | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    if (!isLoggedIn || !tradeDate) {
      setLoaded(true)
      return
    }
    ;(async () => {
      try {
        const token = await getToken()
        const r = await fetch(`/api/arena/pick?trade_date=${encodeURIComponent(tradeDate)}&ticker=${encodeURIComponent(ticker)}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        })
        const j = await r.json().catch(() => ({}))
        if (alive) setPick(Array.isArray(j?.picks) && j.picks[0] ? j.picks[0] : null)
      } catch {
        /* ignore */
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => {
      alive = false
    }
  }, [isLoggedIn, tradeDate, ticker, getToken])

  async function place(direction: 'up' | 'down') {
    setErr(null)
    setBusy(direction)
    try {
      const token = await getToken()
      const r = await fetch('/api/arena/pick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ trade_date: tradeDate, ticker, direction }),
      })
      const j = await r.json().catch(() => ({}))
      if (r.ok && j?.pick) setPick(j.pick)
      else if (j?.error === 'already_picked' && j.pick) setPick({ ticker, trade_date: tradeDate, ...j.pick })
      else setErr(j?.error || 'Could not lock your pick — try again.')
    } catch {
      setErr('Network error — try again.')
    } finally {
      setBusy(null)
    }
  }

  if (authLoading || !loaded) {
    return (
      <Shell>
        <div className="h-12 animate-pulse rounded-xl" style={{ background: 'rgba(255,255,255,.04)' }} />
      </Shell>
    )
  }

  if (!isLoggedIn) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: C.muted }}>
          Take the other side of the machines. Lock a call, build your record, and earn a signed{' '}
          <span style={{ color: '#e7ecf5' }}>&ldquo;I beat the AIs&rdquo;</span> card.
        </p>
        <button
          onClick={() => signInWithGoogle()}
          className="mt-3 inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition hover:scale-[1.02]"
          style={{ borderColor: C.amber, color: '#05060a', background: C.amber }}
        >
          Sign in to enter the Arena
        </button>
      </Shell>
    )
  }

  if (pick) {
    const sm = statusMeta(pick.status, pick.dir_correct)
    const up = pick.direction === 'up'
    const vsNet = pick.direction === netDirection ? 'with the net' : 'against the net'
    return (
      <Shell>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider" style={{ color: C.muted }}>your locked side</span>
              <span className="rounded px-1.5 py-0.5 text-[9px] font-bold tracking-wider" style={{ color: C.violet, border: `1px solid ${C.violet}55` }}>{vsNet}</span>
            </div>
            <div className="mt-1 inline-flex items-center gap-2 text-2xl font-black" style={{ color: up ? C.green : C.red }}>
              {up ? <ArrowUp size={22} /> : <ArrowDown size={22} />} {up ? 'UP' : 'DOWN'}
            </div>
            <div className="mt-1 flex items-center gap-1.5 font-mono text-[11px]" style={{ color: C.muted }} title={pick.leaf_hash ?? undefined}>
              <Lock size={10} /> sealed {shortHash(pick.leaf_hash, 6, 6)}
            </div>
          </div>
          <div className="text-right">
            <span className="rounded-md px-2 py-1 text-[10px] font-bold tracking-wider" style={{ color: sm.color, border: `1px solid ${sm.color}55`, background: `${sm.color}11` }}>{sm.label}</span>
            <div className="mt-2">
              <Link href="/arena/me" className="inline-flex items-center gap-1 text-xs font-semibold transition hover:opacity-80" style={{ color: C.amber }}>
                <Trophy size={12} /> your record
              </Link>
            </div>
          </div>
        </div>
      </Shell>
    )
  }

  if (!live) {
    return (
      <Shell>
        <p className="text-sm" style={{ color: C.muted }}>This bout has locked — no new picks. Catch the next one at the open.</p>
        <Link href="/arena" className="mt-2 inline-block text-sm" style={{ color: C.cyan }}>← live bouts</Link>
      </Shell>
    )
  }

  return (
    <Shell>
      <p className="mb-3 text-sm" style={{ color: C.muted }}>
        Which way does <span className="font-bold text-white">{ticker}</span> close in 5 sessions? Lock it — sealed before the outcome, graded against the field.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <SideButton dir="up" busy={busy === 'up'} disabled={!!busy} onClick={() => place('up')} />
        <SideButton dir="down" busy={busy === 'down'} disabled={!!busy} onClick={() => place('down')} />
      </div>
      {err ? <div className="mt-2 text-xs" style={{ color: C.red }}>{err}</div> : null}
      <div className="mt-2 text-[11px]" style={{ color: C.muted }}>One pick per bout. No take-backs — that&apos;s the whole point.</div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <section className="av-rise mt-8 rounded-2xl border p-5" style={{ borderColor: `${C.amber}33`, background: 'linear-gradient(180deg, rgba(255,149,0,.06), rgba(255,255,255,.01))' }}>
      <div className="mb-3 flex items-center gap-2 text-sm font-bold tracking-widest" style={{ color: C.amber }}>
        <Swords size={14} /> ENTER THE BOUT
      </div>
      {children}
    </section>
  )
}

function SideButton({ dir, busy, disabled, onClick }: { dir: 'up' | 'down'; busy: boolean; disabled: boolean; onClick: () => void }) {
  const up = dir === 'up'
  const col = up ? C.green : C.red
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="av-card group flex items-center justify-center gap-2 rounded-xl border py-4 text-lg font-black transition hover:scale-[1.02] disabled:opacity-60"
      style={{ borderColor: `${col}55`, color: col, background: `${col}10` }}
    >
      <div aria-hidden className="av-sheen" />
      {up ? <ArrowUp size={22} /> : <ArrowDown size={22} />}
      {busy ? 'LOCKING…' : up ? 'UP' : 'DOWN'}
    </button>
  )
}
