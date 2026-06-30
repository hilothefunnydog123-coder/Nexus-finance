'use client'

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { CallReceiptCard, DayReceiptCard } from '@/components/arena/proof/ReceiptCard'
import {
  C,
  type CallsListResponse,
  type CallsListCall,
  type VerifyResponse,
} from '@/components/arena/proof/types'

function isValidDate(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}

function Explainer() {
  return (
    <header style={{ marginBottom: 28 }}>
      <Link
        href="/arena"
        style={{ color: C.cyan, fontSize: 13, textDecoration: 'none', fontFamily: 'var(--font-mono),monospace' }}
      >
        ← back to The Arena
      </Link>
      <div
        style={{
          fontFamily: 'var(--font-mono),monospace',
          fontSize: 12,
          letterSpacing: '.18em',
          color: C.violet,
          marginTop: 22,
          textTransform: 'uppercase',
        }}
      >
        {'// cryptographic proof'}
</div>
      <h1
        style={{
          fontFamily: 'var(--font-display),system-ui,sans-serif',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          fontSize: 'clamp(2.2rem,6vw,4rem)',
          lineHeight: 1,
          margin: '12px 0 18px',
        }}
      >
        Verify the seal.
      </h1>
      <p style={{ color: C.mute, fontSize: 'clamp(1rem,1.6vw,1.15rem)', lineHeight: 1.6, maxWidth: 720 }}>
        Before any outcome is known, every BrainStock prediction is hashed into a{' '}
        <span style={{ color: C.cyan }}>Merkle leaf</span>. All of a day&apos;s leaves commit to a single{' '}
        <span style={{ color: C.green }}>signed root</span>, and each day is hash-chained to the one before it. Edit a
        call, backdate it, add one, or delete one — the root changes, the chain breaks, and it is{' '}
        <span style={{ color: C.txt, fontWeight: 700 }}>mathematically detectable</span>. Pick a sealed call below and
        verify it yourself.
      </p>
    </header>
  )
}

type Mode = 'call' | 'day'

function VerifyInner() {
  const router = useRouter()
  const params = useSearchParams()

  // Seed from the URL on first render so deep-links need no setState-in-effect.
  const [tradeDate, setTradeDate] = useState(() => params.get('trade_date') || '')
  const [ticker, setTicker] = useState(() => params.get('ticker') || '')
  const [tickerOptions, setTickerOptions] = useState<CallsListCall[]>([])
  const [latestDate, setLatestDate] = useState('')

  const [result, setResult] = useState<VerifyResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  const didAuto = useRef(false)

  // ── Load the latest sealed day to prefill the form / picker ───────────────
  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const res = await fetch('/api/arena/calls')
        if (!res.ok) return
        const json = (await res.json()) as CallsListResponse
        if (!alive || !json?.available) return
        const calls = Array.isArray(json.calls) ? json.calls : []
        setTickerOptions(calls)
        if (json.trade_date) setLatestDate(json.trade_date)
        // Only prefill if URL didn't already supply values.
        const urlDate = params.get('trade_date') || ''
        const urlTicker = params.get('ticker') || ''
        if (!urlDate && json.trade_date) setTradeDate(json.trade_date)
        if (!urlTicker && calls[0]?.ticker) setTicker(calls[0].ticker)
      } catch {
        /* picker is best-effort */
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runVerify = useCallback(async (date: string, tkr: string, mode: Mode) => {
    if (!isValidDate(date)) {
      setError('Enter a trade date as YYYY-MM-DD.')
      return
    }
    setLoading(true)
    setError(null)
    setNotFound(false)
    setResult(null)
    try {
      const qs = new URLSearchParams({ trade_date: date })
      if (mode === 'call') {
        if (!tkr) {
          setError('Pick a ticker to verify a single call (or use "Verify whole day").')
          setLoading(false)
          return
        }
        qs.set('ticker', tkr.toUpperCase())
      }
      const res = await fetch(`/api/arena/verify?${qs.toString()}`)
      const json = (await res.json().catch(() => null)) as VerifyResponse | null
      if (!json) {
        setError('Could not read a response from the verifier.')
        return
      }
      if (json.available === false) {
        setError('The verification service is not configured in this environment.')
        return
      }
      if (res.status >= 400 && json.error) {
        setError(json.error)
        return
      }
      if (!json.found) {
        setNotFound(true)
        return
      }
      setResult(json)
    } catch {
      setError('Network error reaching the verifier. Try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Deep-link: auto-run once if URL carried a trade_date (state already seeded) ──
  useEffect(() => {
    if (didAuto.current) return
    const urlDate = params.get('trade_date') || ''
    const urlTicker = params.get('ticker') || ''
    if (!urlDate) return
    didAuto.current = true
    runVerify(urlDate, urlTicker, urlTicker ? 'call' : 'day')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const submit = (mode: Mode) => {
    // Reflect the query in the URL so the result is shareable / deep-linkable.
    const qs = new URLSearchParams({ trade_date: tradeDate })
    if (mode === 'call' && ticker) qs.set('ticker', ticker.toUpperCase())
    router.replace(`/arena/verify?${qs.toString()}`)
    runVerify(tradeDate, ticker, mode)
  }

  return (
    <div>
      <Explainer />

      {/* ── Form ──────────────────────────────────────────────────────────── */}
      <div
        style={{
          background: C.panel,
          border: `1px solid ${C.border}`,
          borderRadius: 14,
          padding: 'clamp(16px,3vw,24px)',
          marginBottom: 28,
        }}
      >
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <Field label="trade date">
            <input
              type="date"
              value={tradeDate}
              max={latestDate || undefined}
              onChange={(e) => setTradeDate(e.target.value)}
              style={inputStyle}
            />
          </Field>
          <Field label="ticker (optional for whole-day)">
            {tickerOptions.length > 0 ? (
              <select value={ticker} onChange={(e) => setTicker(e.target.value)} style={inputStyle}>
                <option value="">— none —</option>
                {tickerOptions.map((c) => (
                  <option key={c.ticker} value={c.ticker}>
                    {c.ticker} {c.direction === 'up' ? '▲' : '▼'}
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={ticker}
                placeholder="NVDA"
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                style={inputStyle}
              />
            )}
          </Field>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button onClick={() => submit('call')} disabled={loading} style={btn(C.green)}>
              {loading ? 'verifying…' : 'Verify call'}
            </button>
            <button onClick={() => submit('day')} disabled={loading} style={btn(C.cyan)}>
              Verify whole day
            </button>
          </div>
        </div>
        {latestDate && (
          <div style={{ marginTop: 12, fontSize: 12, color: C.faint, fontFamily: 'var(--font-mono),monospace' }}>
            latest sealed day: {latestDate}
            {tickerOptions.length > 0 && ` · ${tickerOptions.length} calls sealed`}
          </div>
        )}
      </div>

      {/* ── States ────────────────────────────────────────────────────────── */}
      {error && (
        <div
          style={{
            border: `1px solid ${C.amber}`,
            background: `${C.amber}14`,
            color: C.amber,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          {error}
        </div>
      )}

      {notFound && !error && (
        <div
          style={{
            border: `1px solid ${C.border}`,
            background: C.panel,
            color: C.mute,
            borderRadius: 12,
            padding: 16,
            marginBottom: 20,
            fontSize: 14,
          }}
        >
          No sealed record found for{' '}
          <span style={{ color: C.txt, fontFamily: 'var(--font-mono),monospace' }}>
            {tradeDate}
            {ticker ? ` · ${ticker.toUpperCase()}` : ''}
          </span>
          . Try the latest sealed day from the picker above.
        </div>
      )}

      {loading && !result && (
        <div style={{ color: C.faint, fontFamily: 'var(--font-mono),monospace', fontSize: 13 }}>
          recomputing hashes & climbing the Merkle tree…
        </div>
      )}

      {/* ── Receipt ───────────────────────────────────────────────────────── */}
      {result?.found && result.mode === 'call' && <CallReceiptCard data={result} />}
      {result?.found && result.mode === 'day' && <DayReceiptCard data={result} />}

      <footer style={{ marginTop: 40, fontSize: 12, color: C.faint, lineHeight: 1.6 }}>
        Verification runs against the publicly published seals. The canonical string and every hash above can be
        recomputed independently with standard SHA-256. Educational — not financial advice.
      </footer>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono),monospace',
          fontSize: 11,
          letterSpacing: '.1em',
          textTransform: 'uppercase',
          color: C.faint,
        }}
      >
        {label}
      </span>
      {children}
    </label>
  )
}

const inputStyle: React.CSSProperties = {
  background: '#06070c',
  border: `1px solid ${C.border}`,
  borderRadius: 8,
  color: C.txt,
  padding: '10px 12px',
  fontSize: 14,
  fontFamily: 'var(--font-mono),monospace',
  minWidth: 160,
  colorScheme: 'dark',
}

function btn(color: string): React.CSSProperties {
  return {
    background: `${color}1a`,
    border: `1px solid ${color}`,
    color,
    fontWeight: 700,
    fontSize: 14,
    borderRadius: 8,
    padding: '10px 18px',
    cursor: 'pointer',
  }
}

export default function ArenaVerifyPage() {
  return (
    <main style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(40px,7vw,80px) clamp(16px,4vw,28px) 80px' }}>
      <Suspense
        fallback={
          <div style={{ color: C.faint, fontFamily: 'var(--font-mono),monospace', fontSize: 13 }}>loading verifier…</div>
        }
      >
        <VerifyInner />
      </Suspense>
    </main>
  )
}
