'use client'

import { useEffect, useMemo, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bot, Brain, Flame, Share2, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'

/* ---------- palette ---------- */
const UP = '#22c55e'
const DOWN = '#ef4444'
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'
const glass: CSSProperties = {
  background: 'rgba(255,255,255,.025)',
  border: `1px solid ${BORDER}`,
  borderRadius: 18,
  backdropFilter: 'blur(8px)',
}

const KEY = 'yn_predict_v1'
const HORIZON = 5
const POPULAR = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'SPY']

type Dir = 'up' | 'down'
type Pred = {
  id: string
  ticker: string
  userDir: Dir
  aiDir: Dir
  startPrice: number
  startDate: string
  resolveDate: string
  status: 'open' | 'won' | 'lost'
  aiStatus?: 'won' | 'lost'
  resolvedPrice?: number
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
function todayISO() {
  return new Date().toISOString().slice(0, 10)
}
function addBiz(from: Date, n: number) {
  const d = new Date(from)
  let a = 0
  while (a < n) {
    d.setDate(d.getDate() + 1)
    const dow = d.getDay()
    if (dow !== 0 && dow !== 6) a++
  }
  return d
}
function bizLeft(resolveDate: string) {
  const today = todayISO()
  if (resolveDate <= today) return 0
  let a = 0
  const d = new Date(today + 'T00:00:00Z')
  const end = new Date(resolveDate + 'T00:00:00Z')
  while (d < end) {
    d.setUTCDate(d.getUTCDate() + 1)
    const dow = d.getUTCDay()
    if (dow !== 0 && dow !== 6) a++
  }
  return a
}

export default function Predict() {
  const [ticker, setTicker] = useState('AAPL')
  const [preds, setPreds] = useState<Pred[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reveal, setReveal] = useState<Pred | null>(null)
  const [resolving, setResolving] = useState(false)

  // Load + resolve any due predictions on mount.
  useEffect(() => {
    let loaded: Pred[] = []
    try {
      loaded = JSON.parse(localStorage.getItem(KEY) || '[]')
    } catch {
      loaded = []
    }
    setPreds(loaded)
    const due = loaded.filter((p) => p.status === 'open' && p.resolveDate <= todayISO())
    if (!due.length) return
    setResolving(true)
    ;(async () => {
      const updated = [...loaded]
      let changed = false
      for (const p of due) {
        try {
          const r = await fetch('/api/forecast', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ticker: p.ticker, horizon: 5 }),
          })
          const j = await r.json()
          if (!r.ok || !j.history?.length) continue
          const hist: { date: string; price: number }[] = j.history
          const at = hist.find((h) => h.date >= p.resolveDate) ?? hist[hist.length - 1]
          const actual: Dir = at.price >= p.startPrice ? 'up' : 'down'
          const idx = updated.findIndex((x) => x.id === p.id)
          updated[idx] = {
            ...p,
            status: p.userDir === actual ? 'won' : 'lost',
            aiStatus: p.aiDir === actual ? 'won' : 'lost',
            resolvedPrice: at.price,
          }
          changed = true
        } catch {
          /* leave open, try again next visit */
        }
      }
      if (changed) {
        setPreds(updated)
        localStorage.setItem(KEY, JSON.stringify(updated))
      }
      setResolving(false)
    })()
  }, [])

  async function play(userDir: Dir) {
    setLoading(true)
    setError(null)
    setReveal(null)
    const t = ticker.trim().toUpperCase()
    try {
      const r = await fetch('/api/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticker: t, horizon: 5 }),
      })
      const j = await r.json()
      if (!r.ok) throw new Error(j?.error ?? 'Could not reach the AI.')
      const start: number = j.history[j.history.length - 1].price
      const fc: number = j.forecast[j.forecast.length - 1].price
      const aiDir: Dir = fc >= start ? 'up' : 'down'
      const pred: Pred = {
        id: uid(),
        ticker: t,
        userDir,
        aiDir,
        startPrice: start,
        startDate: todayISO(),
        resolveDate: addBiz(new Date(), HORIZON).toISOString().slice(0, 10),
        status: 'open',
      }
      const next = [pred, ...preds]
      setPreds(next)
      localStorage.setItem(KEY, JSON.stringify(next))
      setReveal(pred)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const open = preds.filter((p) => p.status === 'open')
  const settled = preds.filter((p) => p.status !== 'open')

  const stats = useMemo(() => {
    let uW = 0,
      uL = 0,
      aW = 0,
      aL = 0,
      beat = 0
    for (const p of settled) {
      if (p.status === 'won') uW++
      else uL++
      if (p.aiStatus === 'won') aW++
      else if (p.aiStatus === 'lost') aL++
      if (p.status === 'won' && p.aiStatus === 'lost') beat++
    }
    // streak = consecutive user wins from most recent settled
    let streak = 0
    for (const p of settled) {
      if (p.status === 'won') streak++
      else break
    }
    return { uW, uL, aW, aL, beat, streak, total: settled.length }
  }, [settled])

  return (
    <div
      style={{
        minHeight: '100vh',
        background:
          'radial-gradient(1100px 560px at 10% -8%, rgba(34,197,94,.10), transparent 55%), radial-gradient(1000px 520px at 92% 0%, rgba(167,139,250,.14), transparent 52%), #080a11',
        color: '#e7ecf5',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <style>{`
        @keyframes pv-pop { from{opacity:0;transform:translateY(10px) scale(.98)} to{opacity:1;transform:none} }
        @keyframes pv-pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        .pv-pop{ animation:pv-pop .45s ease both }
      `}</style>

      {/* HEADER */}
      <header
        style={{
          borderBottom: `1px solid ${BORDER}`,
          background: 'rgba(8,10,17,.72)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        <div style={{ maxWidth: 980, margin: '0 auto', padding: '0 22px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg, ${UP}, ${VIOLET})`, display: 'grid', placeItems: 'center', boxShadow: '0 0 20px rgba(34,197,94,.3)' }}>
              <Brain size={19} color="#07101a" />
            </div>
            <div style={{ fontWeight: 700, letterSpacing: -0.3 }}>Beat the AI</div>
          </div>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> YN Finance
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 980, margin: '0 auto', padding: '48px 22px 80px' }}>
        {/* HERO */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, borderRadius: 100, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.03)', padding: '5px 13px', fontSize: 12, color: MUTED }}>
          <Sparkles size={14} color={UP} /> Free · just for fun · no money, ever
        </div>
        <h1 style={{ marginTop: 18, fontSize: 'clamp(32px, 5.5vw, 56px)', fontWeight: 800, letterSpacing: -1.5, lineHeight: 1.04, maxWidth: 720 }}>
          Can you out-call{' '}
          <span style={{ background: `linear-gradient(90deg, ${UP}, ${CYAN}, ${VIOLET})`, WebkitBackgroundClip: 'text', backgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            our neural network?
          </span>
        </h1>
        <p style={{ marginTop: 14, fontSize: 17, color: MUTED, maxWidth: 560, lineHeight: 1.6 }}>
          Pick a stock and call it <b style={{ color: UP }}>UP</b> or <b style={{ color: DOWN }}>DOWN</b> over the next {HORIZON} trading days. Our BrainStock AI calls it too. Real prices settle the score — see if you can beat the machine.
        </p>

        {/* PLAY CARD */}
        <div style={{ ...glass, marginTop: 30, padding: 24 }} className="pv-pop">
          <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 12 }}>Make your call</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, borderRadius: 12, padding: '8px 12px' }}>
              <span style={{ color: MUTED, fontWeight: 600 }}>$</span>
              <input
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="AAPL"
                spellCheck={false}
                maxLength={8}
                style={{ width: 110, background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, letterSpacing: 1.5, fontWeight: 600 }}
              />
            </div>
            {POPULAR.map((s) => (
              <button
                key={s}
                onClick={() => setTicker(s)}
                style={{ fontSize: 12, fontWeight: 700, color: ticker === s ? '#07101a' : '#cdd6e6', background: ticker === s ? CYAN : 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, borderRadius: 100, padding: '5px 11px', cursor: 'pointer' }}
              >
                {s}
              </button>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
            <button onClick={() => play('up')} disabled={loading} style={callBtn(UP, loading)}>
              <TrendingUp size={22} /> Call it UP
            </button>
            <button onClick={() => play('down')} disabled={loading} style={callBtn(DOWN, loading)}>
              <TrendingDown size={22} /> Call it DOWN
            </button>
          </div>
          {loading && (
            <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8, color: MUTED, fontSize: 13 }}>
              <Bot size={15} style={{ animation: 'pv-pulse 1.2s ease-in-out infinite' }} /> The AI is making its call…
            </div>
          )}
          {error && <div style={{ marginTop: 14, color: '#ffb4b4', fontSize: 13 }}>{error}</div>}
        </div>

        {/* REVEAL */}
        {reveal && <RevealCard p={reveal} />}

        {/* YOUR RECORD */}
        {stats.total > 0 && (
          <div style={{ marginTop: 26 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 12 }}>Your record vs. the AI</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }} className="pv-resp4">
              <Stat label="You" value={`${stats.uW}–${stats.uL}`} color={stats.uW >= stats.uL ? UP : DOWN} />
              <Stat label="The AI" value={`${stats.aW}–${stats.aL}`} color={VIOLET} />
              <Stat label="Times you beat it" value={String(stats.beat)} color={CYAN} />
              <Stat label="Win streak" value={String(stats.streak)} color={UP} icon={stats.streak >= 2} />
            </div>
          </div>
        )}

        {/* OPEN */}
        {open.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 12 }}>
              In play {resolving && <span style={{ color: CYAN }}>· settling…</span>}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {open.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {/* SETTLED */}
        {settled.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1.2, color: MUTED, marginBottom: 12 }}>Settled</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {settled.map((p) => (
                <Row key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        <p style={{ marginTop: 40, fontSize: 12, color: MUTED, lineHeight: 1.6, maxWidth: 620 }}>
          A free game for fun and learning — there is no entry fee, no money, and no payout of any kind. Calls settle on real closing prices from public market data. This is not financial advice, and past results don&apos;t predict future ones. Your history is saved only in this browser.
        </p>
      </main>

      <style>{`@media (max-width: 640px){ .pv-resp4{ grid-template-columns: 1fr 1fr !important } }`}</style>
    </div>
  )
}

function callBtn(color: string, loading: boolean): CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: '18px 16px',
    borderRadius: 14,
    border: `1px solid ${color}66`,
    background: `${color}1f`,
    color,
    fontSize: 17,
    fontWeight: 800,
    letterSpacing: 0.3,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.55 : 1,
    transition: 'transform .12s ease',
  }
}

function Stat({ label, value, color, icon }: { label: string; value: string; color: string; icon?: boolean }) {
  return (
    <div style={{ ...glass, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 1, color: MUTED }}>{label}</div>
      <div style={{ marginTop: 4, fontSize: 24, fontWeight: 800, color, display: 'flex', alignItems: 'center', gap: 6, fontVariantNumeric: 'tabular-nums' }}>
        {icon && <Flame size={18} color={color} />}
        {value}
      </div>
    </div>
  )
}

function dirChip(dir: Dir) {
  const c = dir === 'up' ? UP : DOWN
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, color: c, fontWeight: 800, fontSize: 13 }}>
      {dir === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      {dir.toUpperCase()}
    </span>
  )
}

function RevealCard({ p }: { p: Pred }) {
  const agree = p.userDir === p.aiDir
  return (
    <div style={{ ...glass, marginTop: 16, padding: 22, borderColor: agree ? `${VIOLET}55` : `${CYAN}55` }} className="pv-pop">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 13, color: MUTED }}>Locked in on <b style={{ color: '#fff' }}>${p.ticker}</b> at ${p.startPrice.toFixed(2)}</div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 16, fontSize: 15 }}>
            <span style={{ color: MUTED }}>You: {dirChip(p.userDir)}</span>
            <span style={{ color: MUTED }}>AI: {dirChip(p.aiDir)}</span>
          </div>
        </div>
        <div style={{ fontSize: 13, color: agree ? VIOLET : CYAN, fontWeight: 700, textAlign: 'right' }}>
          {agree ? 'You and the AI agree 🤝' : 'Head to head ⚔️'}
          <div style={{ color: MUTED, fontWeight: 400, marginTop: 2 }}>settles {p.resolveDate}</div>
        </div>
      </div>
    </div>
  )
}

function Row({ p }: { p: Pred }) {
  const settled = p.status !== 'open'
  const youWon = p.status === 'won'
  const accent = !settled ? CYAN : youWon ? UP : DOWN

  const share = async () => {
    const verb = youWon ? 'beat' : 'lost to'
    const text = `I called $${p.ticker} ${p.userDir.toUpperCase()} and ${verb} the AI on YN Finance. Think you can beat it? https://ynfinance.org/predict`
    try {
      if (navigator.share) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(text)
        alert('Result copied — paste it anywhere!')
      }
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div style={{ ...glass, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
      <div style={{ width: 4, alignSelf: 'stretch', borderRadius: 4, background: accent, minHeight: 34 }} />
      <div style={{ minWidth: 92 }}>
        <div style={{ fontWeight: 800, fontSize: 16 }}>${p.ticker}</div>
        <div style={{ fontSize: 11, color: MUTED }}>from ${p.startPrice.toFixed(2)}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flex: 1 }}>
        <div style={{ fontSize: 13, color: MUTED }}>You {dirChip(p.userDir)}</div>
        <div style={{ fontSize: 13, color: MUTED }}>AI {dirChip(p.aiDir)}</div>
      </div>
      {!settled ? (
        <div style={{ fontSize: 12, color: CYAN, fontWeight: 700 }}>
          {bizLeft(p.resolveDate) === 0 ? 'settling…' : `${bizLeft(p.resolveDate)}d left`}
        </div>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: youWon ? UP : DOWN }}>
              {youWon ? 'You won' : 'AI won'}
              {p.aiStatus === 'lost' && youWon ? ' 🏆' : ''}
            </div>
            <div style={{ fontSize: 11, color: MUTED }}>closed ${p.resolvedPrice?.toFixed(2)}</div>
          </div>
          <button onClick={share} title="Share result" style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, border: `1px solid ${BORDER}`, background: 'rgba(255,255,255,.04)', color: MUTED, cursor: 'pointer' }}>
            <Share2 size={15} />
          </button>
        </div>
      )}
    </div>
  )
}
