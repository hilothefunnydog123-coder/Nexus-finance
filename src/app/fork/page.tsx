'use client'

/* ════════════════════════════════════════════════════════════════════════
   /fork — FORK THE BRAIN.

   Take BrainStock's real neural net and make it yours. Eleven feature dials
   control what the net pays attention to; a conviction dial sets aggression.
   Run any ticker and watch YOUR fork's read diverge from BrainStock's, live.
   Save your dial preset to your profile (account required to save).
   ════════════════════════════════════════════════════════════════════════ */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw, Save, Trash2, Zap, GitFork, BarChart3, Wand2, Share2, Trophy } from 'lucide-react'
import { FEATURE_NAMES, FEATURE_COUNT } from '@/lib/nn'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from '@/components/auth/AuthModal'
import { fetchForks, saveFork, deleteFork, fetchLeaderboard, type ForkPreset, type Leader } from '@/lib/forks'

const CYAN = '#22d3ee', VIOLET = '#a78bfa', GREEN = '#34d399', RED = '#f87171', MUTED = '#8a93a8', BORDER = 'rgba(255,255,255,.09)'

// Plain-English labels for the 11 signals (same order as the model's features),
// so a normal investor knows exactly what each dial does.
const LABELS: { name: string; hint: string }[] = [
  { name: 'Recent momentum (1 day)', hint: 'how it moved yesterday' },
  { name: "This week's trend", hint: 'direction over the last 5 days' },
  { name: 'Two-week trend', hint: 'direction over the last 10 days' },
  { name: 'Monthly trend', hint: 'direction over the last month' },
  { name: 'Strength vs recent average', hint: 'is it above its 1-month average price?' },
  { name: 'Strength vs long-term average', hint: 'is it above its longer-term average?' },
  { name: 'How jumpy it is', hint: 'size of the day-to-day swings' },
  { name: 'Unusual volume', hint: 'is it trading much heavier than normal?' },
  { name: 'Daily price range', hint: 'how far it travels in a day' },
  { name: 'Overbought vs oversold', hint: 'is it overheated or beaten down? (RSI)' },
  { name: 'Near its highs or lows', hint: 'where it sits in its recent range' },
]
const FRIENDLY: Record<string, string> = Object.fromEntries(FEATURE_NAMES.map((f, i) => [f, LABELS[i].name]))

const ONES = () => Array.from({ length: FEATURE_COUNT }, () => 1)
type Archetype = { name: string; emoji: string; weights: number[]; conviction: number }
const ARCHETYPES: Archetype[] = [
  { name: 'BrainStock', emoji: '🧠', weights: ONES(), conviction: 1 },
  { name: 'Momentum Hunter', emoji: '🚀', weights: [1.6, 1.8, 1.6, 1.4, 1.6, 1.5, 0.6, 1.2, 0.6, 0.4, 0.6], conviction: 1.2 },
  { name: 'Mean Reverter', emoji: '🪃', weights: [0.5, 0.5, 0.6, 0.7, 0.6, 0.7, 1.3, 1.0, 1.2, 1.8, 1.6], conviction: 1.0 },
  { name: 'Volatility Rider', emoji: '🌊', weights: [1, 1, 1, 1, 1, 1, 1.8, 1.6, 1.8, 0.8, 0.9], conviction: 1.3 },
  { name: 'Trend Follower', emoji: '📈', weights: [0.8, 1.2, 1.5, 1.8, 1.6, 1.8, 0.7, 1.0, 0.7, 0.8, 1.2], conviction: 1.1 },
]

const POPULAR = ['NVDA', 'AAPL', 'TSLA', 'MSFT', 'PLTR', 'AMD', 'SPY', 'AMZN']

type ForkResult = {
  ticker: string; last: number; horizon: number; engine: string
  base: { pct: number; target: number; dir: string }
  fork: { pct: number; target: number; dir: string }
  contributions: { name: string; value: number; weight: number; weighted: number }[]
}

export default function ForkPage() {
  const { user } = useAuth()
  const [weights, setWeights] = useState<number[]>(ONES())
  const [conviction, setConviction] = useState(1)
  const [ticker, setTicker] = useState('NVDA')
  const [result, setResult] = useState<ForkResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [presetName, setPresetName] = useState('')
  const [showAuth, setShowAuth] = useState(false)
  const [saved, setSaved] = useState<ForkPreset[]>([])
  const [savedMsg, setSavedMsg] = useState('')
  const [bt, setBt] = useState<{ base: { acc: number; edge: number }; fork: { acc: number; edge: number }; samples: number; engine: string } | null>(null)
  const [btLoading, setBtLoading] = useState(false)
  const [optLoading, setOptLoading] = useState(false)
  const [leaders, setLeaders] = useState<Leader[]>([])
  const debRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const run = useCallback(async (sym: string, w: number[], conv: number) => {
    const t = sym.trim().toUpperCase()
    if (!t) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/fork', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticker: t, weights: w, conviction: conv }) })
      const d = await res.json()
      if (!res.ok) throw new Error(d?.error ?? 'Failed')
      setResult(d as ForkResult)
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not run the fork.') }
    finally { setLoading(false) }
  }, [])

  // initial run
  useEffect(() => { run('NVDA', ONES(), 1) }, [run])

  // load saved presets when signed in
  useEffect(() => { if (user) fetchForks().then(setSaved); else setSaved([]) }, [user])

  // public leaderboard
  useEffect(() => { fetchLeaderboard().then(setLeaders) }, [])

  const runBacktest = async (optimize = false) => {
    if (optimize) setOptLoading(true); else setBtLoading(true)
    try {
      const res = await fetch('/api/fork-backtest', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ weights, conviction, optimize }) })
      const d = await res.json()
      if (res.ok) {
        if (optimize && d.optimized) {
          setWeights(d.optimized.weights); setConviction(d.optimized.conviction)
          run(result?.ticker || ticker, d.optimized.weights, d.optimized.conviction)
          setBt({ base: d.base, fork: { acc: d.optimized.acc, edge: d.optimized.edge }, samples: d.samples, engine: d.engine })
        } else setBt(d)
      }
    } catch { /* ignore */ }
    finally { if (optimize) setOptLoading(false); else setBtLoading(false) }
  }

  const shareFork = () => {
    const W = 1080, H = 1350
    const c = document.createElement('canvas'); c.width = W; c.height = H
    const x = c.getContext('2d'); if (!x) return
    const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0a1326'); g.addColorStop(1, '#05060b')
    x.fillStyle = g; x.fillRect(0, 0, W, H)
    x.fillStyle = '#a78bfa'; x.fillRect(0, 0, W, 10)
    x.textAlign = 'left'
    x.fillStyle = '#fff'; x.font = '800 40px Inter, system-ui, sans-serif'; x.fillText('YN FINANCE', 80, 130)
    x.fillStyle = '#8a93a8'; x.font = '600 24px Inter, system-ui, sans-serif'; x.fillText('FORK THE BRAIN', 80, 168)
    x.fillStyle = '#fff'; x.font = '800 120px Inter, system-ui, sans-serif'; x.fillText(presetName.trim() || `${displayName()}'s Fork`, 80, 360)
    if (bt) {
      const beat = bt.fork.acc > bt.base.acc
      x.fillStyle = beat ? '#34d399' : '#f87171'; x.font = '800 150px Inter, system-ui, sans-serif'
      x.fillText(`${bt.fork.acc.toFixed(0)}%`, 80, 560)
      x.fillStyle = '#8a93a8'; x.font = '600 30px Inter, system-ui, sans-serif'
      x.fillText(`backtest accuracy · BrainStock got ${bt.base.acc.toFixed(0)}%`, 80, 610)
      x.fillStyle = beat ? '#34d399' : '#fbbf24'; x.font = '700 36px Inter, system-ui, sans-serif'
      x.fillText(beat ? `I beat the AI by ${(bt.fork.acc - bt.base.acc).toFixed(1)}%` : 'Tuning to beat the AI…', 80, 690)
    }
    if (result) {
      x.fillStyle = '#cdd6f4'; x.font = '600 30px Inter, system-ui, sans-serif'
      const up = result.fork.dir === 'up'
      x.fillText(`My fork on ${result.ticker}: ${up ? '▲' : '▼'} ${Math.abs(result.fork.pct).toFixed(2)}%`, 80, 820)
    }
    x.fillStyle = 'rgba(255,255,255,.5)'; x.font = '500 24px Inter, system-ui, sans-serif'
    x.fillText('Fork the AI yourself → ynfinance.org/fork', 80, H - 70)
    c.toBlob(b => { if (!b) return; const u = URL.createObjectURL(b); const a = document.createElement('a'); a.href = u; a.download = 'my-fork.png'; a.click(); setTimeout(() => URL.revokeObjectURL(u), 4000) }, 'image/png')
    const text = bt ? `My fork of the BrainStock AI hit ${bt.fork.acc.toFixed(0)}% in backtest${bt.fork.acc > bt.base.acc ? ` — beat the original (${bt.base.acc.toFixed(0)}%)` : ''}. Fork your own:` : 'I forked the BrainStock AI. Make your own:'
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent('https://ynfinance.org/fork')}`, '_blank')
  }

  // debounced live re-run when dials change (only after a first result exists)
  const liveRerun = (w: number[], conv: number) => {
    if (!result) return
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => run(result.ticker, w, conv), 450)
  }

  const setWeight = (i: number, v: number) => {
    const w = weights.slice(); w[i] = v; setWeights(w); setBt(null); liveRerun(w, conviction)
  }
  const setConv = (v: number) => { setConviction(v); setBt(null); liveRerun(weights, v) }
  const applyArchetype = (a: Archetype) => { setWeights(a.weights.slice()); setConviction(a.conviction); setBt(null); run(ticker, a.weights, a.conviction) }
  const reset = () => { const w = ONES(); setWeights(w); setConviction(1); setBt(null); run(ticker, w, 1) }

  const doSave = async () => {
    if (!user) { setShowAuth(true); return }
    const name = presetName.trim() || `${displayName()} Fork`
    const r = await saveFork(name, weights, conviction, bt?.fork.acc ?? null, displayName())
    if (r.ok) { setSavedMsg('Saved to your profile ✓'); setPresetName(''); fetchForks().then(setSaved); setTimeout(() => setSavedMsg(''), 2500) }
    else setSavedMsg('Could not save — try again')
  }
  const displayName = () => (user?.user_metadata?.first_name as string) || (user?.email?.split('@')[0]) || 'My'
  const loadPreset = (p: ForkPreset) => {
    const w = (p.weights && p.weights.length === FEATURE_COUNT) ? p.weights : ONES()
    setWeights(w); setConviction(p.conviction || 1); run(ticker, w, p.conviction || 1)
  }
  const removePreset = async (id: string) => { setSaved(s => s.filter(p => p.id !== id)); await deleteFork(id) }

  const divergence = result ? +(result.fork.pct - result.base.pct).toFixed(2) : 0
  const isDefault = weights.every(w => w === 1) && conviction === 1

  return (
    <div style={{ minHeight: '100vh', background: '#05060b', color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '22px 20px 90px' }}>
        {/* top bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 26 }}>
          <Link href="/brainstock" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: MUTED, textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> BrainStock</Link>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 11, letterSpacing: '0.34em', color: VIOLET, fontFamily: 'var(--font-mono), monospace', display: 'inline-flex', alignItems: 'center', gap: 7 }}><GitFork size={13} /> FORK THE BRAIN</div>
            <div style={{ fontSize: 11, color: '#46566e', marginTop: 2 }}>tune what the net sees · make it yours</div>
          </div>
          <Link href="/account" style={{ fontSize: 13, color: MUTED, textDecoration: 'none' }}>My forks →</Link>
        </div>

        <h1 style={{ fontSize: 'clamp(28px,5vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.05, marginBottom: 8 }}>
          Take the net. <span style={{ color: VIOLET }}>Make it think your way.</span>
        </h1>
        <p style={{ color: MUTED, fontSize: 15, maxWidth: 620, marginBottom: 24 }}>
          BrainStock weighs 11 signals equally. Crank up what you believe in, mute what you don&apos;t, and watch your fork&apos;s read split from the original — live, on real data.
        </p>

        {/* archetypes */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 22 }}>
          {ARCHETYPES.map(a => (
            <button key={a.name} onClick={() => applyArchetype(a)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, color: '#cdd6f4', borderRadius: 9, padding: '8px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <span>{a.emoji}</span> {a.name}
            </button>
          ))}
          <button onClick={reset} disabled={isDefault} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'transparent', border: `1px solid ${BORDER}`, color: isDefault ? '#3a4a60' : MUTED, borderRadius: 9, padding: '8px 12px', fontSize: 13, fontWeight: 700, cursor: isDefault ? 'default' : 'pointer' }}>
            <RotateCcw size={13} /> Reset
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: 18 }} className="fork-grid">
          {/* DIALS */}
          <div style={{ background: '#0b1018', border: `1px solid ${BORDER}`, borderRadius: 16, padding: 20 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: '#46566e', marginBottom: 14, fontFamily: 'monospace' }}>FEATURE WEIGHTS — WHAT THE NET PAYS ATTENTION TO</div>
            {LABELS.map((l, i) => {
              const wv = weights[i]
              const c = wv > 1.05 ? CYAN : wv < 0.95 ? '#5a6a82' : '#7f93b5'
              return (
                <div key={l.name} style={{ marginBottom: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#cdd6f4' }}>{l.name} <span style={{ fontSize: 10.5, color: '#46566e', fontWeight: 400 }}>· {l.hint}</span></span>
                    <span style={{ fontSize: 12, fontWeight: 800, color: c, fontFamily: 'monospace', fontVariantNumeric: 'tabular-nums' }}>{wv.toFixed(2)}×</span>
                  </div>
                  <input type="range" min={0} max={2} step={0.05} value={wv} onChange={e => setWeight(i, parseFloat(e.target.value))}
                    style={{ width: '100%', accentColor: c, cursor: 'pointer' }} />
                </div>
              )
            })}
            <div style={{ height: 1, background: BORDER, margin: '16px 0 14px' }} />
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: VIOLET }}>Conviction <span style={{ fontSize: 10.5, color: '#46566e', fontWeight: 400 }}>· how aggressive the call is</span></span>
              <span style={{ fontSize: 12, fontWeight: 800, color: VIOLET, fontFamily: 'monospace' }}>{conviction.toFixed(2)}×</span>
            </div>
            <input type="range" min={0.3} max={2} step={0.05} value={conviction} onChange={e => setConv(parseFloat(e.target.value))} style={{ width: '100%', accentColor: VIOLET, cursor: 'pointer' }} />
          </div>

          {/* RESULT */}
          <div>
            {/* ticker input */}
            <form onSubmit={e => { e.preventDefault(); run(ticker, weights, conviction) }} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <input value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="Ticker…" maxLength={8}
                style={{ flex: 1, background: '#0b1018', border: `1px solid ${BORDER}`, borderRadius: 10, padding: '11px 14px', color: '#fff', fontSize: 16, fontWeight: 700, outline: 'none' }} />
              <button type="submit" disabled={loading} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: '#05060b', border: 'none', borderRadius: 10, padding: '0 18px', fontSize: 14, fontWeight: 800, cursor: loading ? 'wait' : 'pointer' }}>
                {loading ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} fill="currentColor" />} Run
              </button>
            </form>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 16 }}>
              {POPULAR.map(s => <button key={s} onClick={() => { setTicker(s); run(s, weights, conviction) }} style={{ background: 'rgba(255,255,255,.04)', border: `1px solid ${BORDER}`, color: MUTED, borderRadius: 7, padding: '4px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>{s}</button>)}
            </div>

            {error && <div style={{ color: RED, fontSize: 13, marginBottom: 12 }}>{error}</div>}

            {result && (
              <>
                {/* comparison */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
                  <Verdict label="BrainStock" sub="equal weights" px={result.last} r={result.base} dim />
                  <Verdict label="Your Fork" sub={isDefault ? 'same as BrainStock' : 'your weights'} px={result.last} r={result.fork} />
                </div>

                {/* divergence */}
                <div style={{ textAlign: 'center', padding: '10px 14px', background: 'rgba(167,139,250,.06)', border: `1px solid ${VIOLET}33`, borderRadius: 10, marginBottom: 14, fontSize: 13 }}>
                  {Math.abs(divergence) < 0.05
                    ? <span style={{ color: MUTED }}>Your fork agrees with BrainStock on <b style={{ color: '#cdd6f4' }}>{result.ticker}</b>.</span>
                    : <span style={{ color: MUTED }}>Your fork is <b style={{ color: divergence >= 0 ? GREEN : RED }}>{divergence >= 0 ? '+' : ''}{divergence}%</b> {divergence >= 0 ? 'more bullish' : 'more bearish'} than BrainStock on <b style={{ color: '#cdd6f4' }}>{result.ticker}</b>.</span>}
                  {result.engine === 'proxy' && <div style={{ fontSize: 10.5, color: '#46566e', marginTop: 4 }}>net still warming up — using a transparent proxy until it&apos;s trained</div>}
                </div>

                {/* top contributions */}
                <div style={{ background: '#0b1018', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
                  <div style={{ fontSize: 10.5, letterSpacing: '0.16em', color: '#46566e', marginBottom: 10, fontFamily: 'monospace' }}>WHAT YOUR FORK IS WEIGHTING MOST ({result.ticker})</div>
                  {[...result.contributions].sort((a, b) => Math.abs(b.weighted) - Math.abs(a.weighted)).slice(0, 5).map(c => {
                    const mag = Math.min(1, Math.abs(c.weighted) / 3)
                    const pos = c.weighted >= 0
                    return (
                      <div key={c.name} style={{ marginBottom: 7 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: MUTED, marginBottom: 2 }}>
                          <span>{FRIENDLY[c.name] ?? c.name} <span style={{ color: '#46566e' }}>· {c.weight}×</span></span>
                          <span style={{ color: pos ? GREEN : RED, fontFamily: 'monospace' }}>{pos ? '+' : ''}{c.weighted}</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,.06)', borderRadius: 2 }}>
                          <div style={{ height: '100%', width: `${mag * 100}%`, background: pos ? GREEN : RED, borderRadius: 2 }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* backtest + optimize + share */}
            <div style={{ background: '#0b1018', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', color: '#46566e', marginBottom: 10, fontFamily: 'monospace' }}>WOULD THIS FORK HAVE WORKED?</div>
              {bt ? (
                <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                  <BtCard label="BrainStock" acc={bt.base.acc} edge={bt.base.edge} dim />
                  <BtCard label="Your Fork" acc={bt.fork.acc} edge={bt.fork.edge} beat={bt.fork.acc > bt.base.acc} />
                </div>
              ) : <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>Backtest your dials across 8 big stocks over the last ~6 months — head-to-head with the original net. Or let the AI tune itself.</p>}
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button onClick={() => runBacktest(false)} disabled={btLoading || optLoading} style={miniBtn(false)}>{btLoading ? <Loader2 size={14} className="animate-spin" /> : <BarChart3 size={14} />} Backtest it</button>
                <button onClick={() => runBacktest(true)} disabled={btLoading || optLoading} style={miniBtn(true)}>{optLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />} {optLoading ? 'Optimizing…' : 'Auto-optimize'}</button>
                {bt && <button onClick={shareFork} style={miniBtn(false)}><Share2 size={14} /> Share</button>}
              </div>
              {bt?.fork && bt.fork.acc > bt.base.acc && <div style={{ fontSize: 12, color: GREEN, marginTop: 10, fontWeight: 700 }}>🔥 Your fork beat BrainStock by {(bt.fork.acc - bt.base.acc).toFixed(1)}% — save it.</div>}
              {bt && bt.engine === 'proxy' && <div style={{ fontSize: 10.5, color: '#46566e', marginTop: 8 }}>net still warming up — backtest uses the transparent proxy for now</div>}
            </div>

            {/* save */}
            <div style={{ background: '#0b1018', border: `1px solid ${BORDER}`, borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 10.5, letterSpacing: '0.16em', color: '#46566e', marginBottom: 10, fontFamily: 'monospace' }}>SAVE THIS FORK TO YOUR PROFILE</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={presetName} onChange={e => setPresetName(e.target.value)} placeholder={`${displayName()} Fork`} maxLength={60}
                  style={{ flex: 1, background: '#05060b', border: `1px solid ${BORDER}`, borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13, outline: 'none' }} />
                <button onClick={doSave} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: VIOLET, color: '#05060b', border: 'none', borderRadius: 9, padding: '0 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer' }}>
                  <Save size={14} /> Save
                </button>
              </div>
              {!user && <div style={{ fontSize: 11, color: '#46566e', marginTop: 8 }}>You&apos;ll be asked to sign in — it saves as a preset to your profile.</div>}
              {savedMsg && <div style={{ fontSize: 12, color: GREEN, marginTop: 8 }}>{savedMsg}</div>}

              {saved.length > 0 && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${BORDER}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 10.5, color: '#46566e', marginBottom: 8, fontFamily: 'monospace' }}>YOUR SAVED FORKS</div>
                  <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
                    {saved.map(p => (
                      <span key={p.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(167,139,250,.1)', border: `1px solid ${VIOLET}33`, borderRadius: 8, padding: '5px 8px 5px 11px', fontSize: 12 }}>
                        <button onClick={() => loadPreset(p)} style={{ background: 'none', border: 'none', color: '#cdd6f4', cursor: 'pointer', fontWeight: 700, padding: 0 }}>{p.name}</button>
                        <button onClick={() => removePreset(p.id)} style={{ background: 'none', border: 'none', color: '#6a7894', cursor: 'pointer', padding: 0, display: 'inline-flex' }}><Trash2 size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* leaderboard */}
        {leaders.length > 0 && (
          <div style={{ marginTop: 30 }}>
            <div style={{ fontSize: 11, letterSpacing: '0.18em', color: '#46566e', fontFamily: 'monospace', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}><Trophy size={14} style={{ color: '#fbbf24' }} /> FORK LEADERBOARD · TOP BACKTEST ACCURACY</div>
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 12, overflow: 'hidden' }}>
              {leaders.map((l, i) => (
                <button key={i} onClick={() => { if (l.weights?.length === FEATURE_COUNT) { setWeights(l.weights); setConviction(l.conviction || 1); setBt(null); run(ticker, l.weights, l.conviction || 1) } }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '11px 16px', background: i % 2 ? 'rgba(255,255,255,.02)' : 'transparent', border: 'none', borderTop: i ? `1px solid ${BORDER}` : 'none', cursor: 'pointer', textAlign: 'left' }}>
                  <span style={{ width: 22, fontFamily: 'monospace', fontWeight: 800, color: i === 0 ? '#fbbf24' : i === 1 ? '#cbd5e1' : i === 2 ? '#d97706' : MUTED }}>{i + 1}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 700, color: '#cdd6f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</div>
                    <div style={{ fontSize: 10.5, color: '#46566e' }}>{l.display_name || 'anon'}</div>
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 800, color: GREEN }}>{Number(l.score).toFixed(1)}%</span>
                </button>
              ))}
            </div>
            <div style={{ fontSize: 10.5, color: '#46566e', marginTop: 8 }}>Tap any fork to load its dials and try it. Ranked by historical backtest accuracy.</div>
          </div>
        )}

        <p style={{ marginTop: 24, fontSize: 11.5, color: '#46566e', lineHeight: 1.6, maxWidth: 700 }}>
          Your fork runs the same trained network as BrainStock — your dials scale each input signal before the forward pass, so you change what the net emphasizes without retraining it. Educational research tool · not financial advice.
        </p>
      </div>

      {showAuth && <AuthModal reason="Sign in to save your fork as a preset on your profile." onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); setTimeout(doSave, 300) }} />}
      <style>{`@media(max-width:820px){.fork-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  )
}

function miniBtn(primary: boolean): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
    background: primary ? 'linear-gradient(135deg, #22d3ee, #a78bfa)' : 'rgba(255,255,255,.05)',
    color: primary ? '#05060b' : '#cdd6f4', border: primary ? 'none' : `1px solid ${BORDER}`,
  }
}

function BtCard({ label, acc, edge, dim, beat }: { label: string; acc: number; edge: number; dim?: boolean; beat?: boolean }) {
  const accent = beat ? GREEN : dim ? MUTED : CYAN
  return (
    <div style={{ flex: 1, background: dim ? 'rgba(255,255,255,.02)' : `${accent}0d`, border: `1px solid ${dim ? BORDER : accent + '40'}`, borderRadius: 10, padding: 12 }}>
      <div style={{ fontSize: 10.5, color: dim ? MUTED : '#cdd6f4', fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{acc.toFixed(1)}%</div>
      <div style={{ fontSize: 10.5, color: MUTED, marginTop: 4 }}>right · {edge >= 0 ? '+' : ''}{edge}% avg edge</div>
    </div>
  )
}

function Verdict({ label, sub, px, r, dim }: { label: string; sub: string; px: number; r: { pct: number; target: number; dir: string }; dim?: boolean }) {
  const up = r.dir === 'up'
  const accent = up ? GREEN : RED
  return (
    <div style={{ background: dim ? 'rgba(255,255,255,.02)' : `${accent}0d`, border: `1px solid ${dim ? BORDER : accent + '40'}`, borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: dim ? MUTED : '#cdd6f4', letterSpacing: '0.04em' }}>{label}</div>
      <div style={{ fontSize: 10, color: '#46566e', marginBottom: 8 }}>{sub}</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{up ? '▲' : '▼'} {Math.abs(r.pct).toFixed(2)}%</div>
      <div style={{ fontSize: 12, color: MUTED, marginTop: 6 }}>${px.toFixed(2)} → <b style={{ color: '#cdd6f4' }}>${r.target.toFixed(2)}</b></div>
    </div>
  )
}
