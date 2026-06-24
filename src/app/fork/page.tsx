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
import { ArrowLeft, Loader2, RotateCcw, Save, Trash2, Zap, GitFork } from 'lucide-react'
import { FEATURE_NAMES, FEATURE_COUNT } from '@/lib/nn'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from '@/components/auth/AuthModal'
import { fetchForks, saveFork, deleteFork, type ForkPreset } from '@/lib/forks'

const CYAN = '#22d3ee', VIOLET = '#a78bfa', GREEN = '#34d399', RED = '#f87171', MUTED = '#8a93a8', BORDER = 'rgba(255,255,255,.09)'

const HINTS = ['1-day move', '5-day move', '10-day move', '20-day move', 'vs 20-day avg', 'vs 50-day avg', 'how choppy', 'volume surge', 'true range', 'overbought/sold', 'high/low of range']

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

  // debounced live re-run when dials change (only after a first result exists)
  const liveRerun = (w: number[], conv: number) => {
    if (!result) return
    if (debRef.current) clearTimeout(debRef.current)
    debRef.current = setTimeout(() => run(result.ticker, w, conv), 450)
  }

  const setWeight = (i: number, v: number) => {
    const w = weights.slice(); w[i] = v; setWeights(w); liveRerun(w, conviction)
  }
  const setConv = (v: number) => { setConviction(v); liveRerun(weights, v) }
  const applyArchetype = (a: Archetype) => { setWeights(a.weights.slice()); setConviction(a.conviction); run(ticker, a.weights, a.conviction) }
  const reset = () => { const w = ONES(); setWeights(w); setConviction(1); run(ticker, w, 1) }

  const doSave = async () => {
    if (!user) { setShowAuth(true); return }
    const name = presetName.trim() || `${displayName()} Fork`
    const r = await saveFork(name, weights, conviction)
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
            {FEATURE_NAMES.map((name, i) => {
              const wv = weights[i]
              const c = wv > 1.05 ? CYAN : wv < 0.95 ? '#5a6a82' : '#7f93b5'
              return (
                <div key={name} style={{ marginBottom: 13 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#cdd6f4' }}>{name} <span style={{ fontSize: 10.5, color: '#46566e', fontWeight: 400 }}>· {HINTS[i]}</span></span>
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
                          <span>{c.name} <span style={{ color: '#46566e' }}>· {c.weight}×</span></span>
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

        <p style={{ marginTop: 24, fontSize: 11.5, color: '#46566e', lineHeight: 1.6, maxWidth: 700 }}>
          Your fork runs the same trained network as BrainStock — your dials scale each input signal before the forward pass, so you change what the net emphasizes without retraining it. Educational research tool · not financial advice.
        </p>
      </div>

      {showAuth && <AuthModal reason="Sign in to save your fork as a preset on your profile." onClose={() => setShowAuth(false)} onSuccess={() => { setShowAuth(false); setTimeout(doSave, 300) }} />}
      <style>{`@media(max-width:820px){.fork-grid{grid-template-columns:1fr!important}}`}</style>
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
