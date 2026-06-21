'use client'

/* ════════════════════════════════════════════════════════════════════════
   /account — the signed-in user's home. Welcome message + a history of every
   forecast and analysis they've made, replayable as a shareable card (PNG)
   or a rendered video reel.
   ════════════════════════════════════════════════════════════════════════ */

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Download, Film, Share2, Trash2, TrendingUp, TrendingDown, LineChart, Sparkles } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import AuthModal from '@/components/auth/AuthModal'
import { displayName } from '@/components/auth/AccountMenu'
import { fetchHistory, deleteHistory, type HistoryItem } from '@/lib/history'

const VOID = '#05060b'
const PANEL = '#0b1220'
const CYAN = '#22d3ee'
const VIOLET = '#a78bfa'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'
const BORDER = 'rgba(255,255,255,.09)'

const fmt = (n: number | null | undefined, d = 2) => (n == null || !Number.isFinite(n) ? '—' : Number(n).toFixed(d))
const when = (iso: string) => {
  const dt = new Date(iso)
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' · ' + dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}
const isUp = (it: HistoryItem) => (it.pct ?? 0) >= 0
const accentOf = (it: HistoryItem) => (isUp(it) ? GREEN : RED)

/* ── Card canvas renderer — shared by PNG export and the video reel ──────── */
const CARD_W = 1080
const CARD_H = 1350

function easeOut(t: number) { return 1 - Math.pow(1 - t, 3) }

function drawCard(ctx: CanvasRenderingContext2D, it: HistoryItem, name: string, p = 1) {
  const up = isUp(it)
  const accent = up ? '#34d399' : '#f87171'
  const e = easeOut(Math.min(1, Math.max(0, p)))

  // background
  const g = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  g.addColorStop(0, '#070b14'); g.addColorStop(1, '#0b1220')
  ctx.fillStyle = g; ctx.fillRect(0, 0, CARD_W, CARD_H)
  // accent glow
  const rg = ctx.createRadialGradient(CARD_W * 0.5, 360, 40, CARD_W * 0.5, 360, 720)
  rg.addColorStop(0, accent + '22'); rg.addColorStop(1, 'transparent')
  ctx.fillStyle = rg; ctx.fillRect(0, 0, CARD_W, CARD_H)
  // top accent bar
  ctx.fillStyle = accent; ctx.fillRect(0, 0, CARD_W * e, 10)

  const PAD = 90
  ctx.textBaseline = 'alphabetic'

  // brand
  ctx.fillStyle = '#fff'; ctx.font = '800 40px Inter, system-ui, sans-serif'
  ctx.fillText('YN FINANCE', PAD, 130)
  ctx.fillStyle = MUTED; ctx.font = '600 24px Inter, system-ui, sans-serif'
  ctx.fillText(it.kind === 'forecast' ? 'BRAINSTOCK FORECAST' : 'AI STOCK ANALYSIS', PAD, 168)

  // ticker
  ctx.fillStyle = '#fff'; ctx.font = '800 170px Inter, system-ui, sans-serif'
  ctx.fillText(it.ticker || '—', PAD, 420)

  // rating chip
  if (it.rating) {
    ctx.font = '800 34px Inter, system-ui, sans-serif'
    const tw = ctx.measureText(it.rating).width
    ctx.fillStyle = accent + '26'
    roundRect(ctx, PAD, 460, tw + 56, 70, 14); ctx.fill()
    ctx.fillStyle = accent; ctx.fillText(it.rating, PAD + 28, 510)
  }

  // big % move (animated count-up)
  const pct = (it.pct ?? 0) * e
  ctx.fillStyle = accent; ctx.font = '800 150px Inter, system-ui, sans-serif'
  ctx.fillText(`${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, PAD, 720)
  ctx.fillStyle = MUTED; ctx.font = '600 30px Inter, system-ui, sans-serif'
  ctx.fillText(it.kind === 'forecast' ? 'predicted move' : 'to price target', PAD, 768)

  // price → target row
  const boxes: [string, string][] = [
    ['PRICE', it.price != null ? `$${fmt(it.price)}` : '—'],
    ['TARGET', it.target != null ? `$${fmt(it.target)}` : '—'],
    ['CONFIDENCE', it.confidence != null ? `${Math.round(it.confidence)}%` : '—'],
  ]
  const bw = (CARD_W - PAD * 2 - 40) / 3
  boxes.forEach(([l, v], i) => {
    const x = PAD + i * (bw + 20)
    ctx.fillStyle = 'rgba(255,255,255,.04)'
    roundRect(ctx, x, 830, bw, 150, 16); ctx.fill()
    ctx.fillStyle = MUTED; ctx.font = '700 22px Inter, system-ui, sans-serif'
    ctx.fillText(l, x + 28, 888)
    ctx.fillStyle = '#fff'; ctx.font = '800 48px Inter, system-ui, sans-serif'
    ctx.fillText(v, x + 28, 948)
  })

  // summary (wrapped)
  if (it.summary) {
    ctx.fillStyle = '#cdd6f4'; ctx.font = '500 30px Inter, system-ui, sans-serif'
    const lines = wrap(ctx, it.summary, CARD_W - PAD * 2).slice(0, 4)
    lines.forEach((ln, i) => ctx.fillText(ln, PAD, 1060 + i * 44))
  }

  // footer
  ctx.fillStyle = MUTED; ctx.font = '600 24px Inter, system-ui, sans-serif'
  ctx.fillText(`${name} · ${when(it.created_at)}`, PAD, CARD_H - 90)
  ctx.fillStyle = 'rgba(255,255,255,.45)'; ctx.font = '500 22px Inter, system-ui, sans-serif'
  ctx.fillText('ynfinance.org · Not financial advice', PAD, CARD_H - 54)
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath()
}
function wrap(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = String(text).split(/\s+/); const lines: string[] = []; let line = ''
  for (const w of words) { const test = line ? line + ' ' + w : w; if (ctx.measureText(test).width > maxW && line) { lines.push(line); line = w } else line = test }
  if (line) lines.push(line); return lines
}

/* ── Reel / video modal ─────────────────────────────────────────────────── */
function ReelModal({ item, name, onClose }: { item: HistoryItem; name: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [recording, setRecording] = useState(false)
  const [videoUrl, setVideoUrl] = useState('')
  const rafRef = useRef(0)

  // looping preview animation
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let start = 0
    const loop = (ts: number) => {
      if (!start) start = ts
      const p = ((ts - start) % 3600) / 2600 // ~2.6s reveal, ~1s hold
      drawCard(ctx, item, name, p)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [item, name])

  const record = async () => {
    const canvas = canvasRef.current; if (!canvas) return
    setRecording(true); setVideoUrl('')
    const ctx = canvas.getContext('2d')!
    const stream = canvas.captureStream(30)
    const mime = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 })
    const chunks: BlobPart[] = []
    rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data) }
    rec.onstop = () => { setVideoUrl(URL.createObjectURL(new Blob(chunks, { type: 'video/webm' }))); setRecording(false) }

    // drive a clean 4s render independent of the preview loop
    cancelAnimationFrame(rafRef.current)
    rec.start()
    const t0 = performance.now()
    const DUR = 4000
    const drive = (ts: number) => {
      const el = ts - t0
      const p = el < 2600 ? el / 2600 : 1
      drawCard(ctx, item, name, p)
      if (el < DUR) requestAnimationFrame(drive)
      else { rec.stop(); rafRef.current = requestAnimationFrame(function loop(t: number) { drawCard(ctx, item, name, ((t) % 3600) / 2600); rafRef.current = requestAnimationFrame(loop) }) }
    }
    requestAnimationFrame(drive)
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(6px)', display: 'grid', placeItems: 'center', padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: 'min(420px,92vw)', background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 18, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{item.ticker} reel</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: MUTED, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
        <canvas ref={canvasRef} width={CARD_W} height={CARD_H} style={{ width: '100%', borderRadius: 12, display: 'block', aspectRatio: `${CARD_W}/${CARD_H}` }} />
        <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
          {!videoUrl ? (
            <button onClick={record} disabled={recording}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, border: 'none', cursor: recording ? 'wait' : 'pointer', background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: '#07101a', fontWeight: 800, fontSize: 13 }}>
              <Film size={15} /> {recording ? 'Rendering…' : 'Render video'}
            </button>
          ) : (
            <a href={videoUrl} download={`${item.ticker}-yn-finance.webm`}
              style={{ flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10, background: GREEN, color: '#07101a', fontWeight: 800, fontSize: 13, textDecoration: 'none' }}>
              <Download size={15} /> Save .webm
            </a>
          )}
        </div>
        <p style={{ fontSize: 11, color: MUTED, marginTop: 10, textAlign: 'center' }}>A 4-second clip you can post to X, TikTok or Stories.</p>
      </div>
    </div>
  )
}

/* ── History card ───────────────────────────────────────────────────────── */
function Card({ it, name, onReel, onDelete }: { it: HistoryItem; name: string; onReel: () => void; onDelete: () => void }) {
  const accent = accentOf(it)
  const up = isUp(it)

  const downloadPng = () => {
    const c = document.createElement('canvas'); c.width = CARD_W; c.height = CARD_H
    drawCard(c.getContext('2d')!, it, name, 1)
    c.toBlob(b => {
      if (!b) return
      const url = URL.createObjectURL(b); const a = document.createElement('a')
      a.href = url; a.download = `${it.ticker || 'card'}-yn-finance.png`; a.click()
      setTimeout(() => URL.revokeObjectURL(url), 4000)
    }, 'image/png')
  }
  const share = async () => {
    const text = `${it.ticker} ${it.kind === 'forecast' ? 'forecast' : 'analysis'}: ${it.rating || ''} ${(it.pct ?? 0) >= 0 ? '+' : ''}${fmt(it.pct)}% — via YN Finance`
    const url = 'https://ynfinance.org'
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text, url }); return } catch {}
    }
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank')
  }

  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 16, padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${accent}, transparent)` }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: accent + '1e', color: accent }}>
          {it.kind === 'forecast' ? <LineChart size={17} /> : (up ? <TrendingUp size={17} /> : <TrendingDown size={17} />)}
        </span>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#fff' }}>{it.ticker || '—'}</span>
            {it.rating && <span style={{ fontSize: 11, fontWeight: 700, color: accent, background: accent + '1e', padding: '2px 8px', borderRadius: 6 }}>{it.rating}</span>}
          </div>
          <div style={{ fontSize: 11, color: MUTED }}>{it.kind === 'forecast' ? 'Forecast' : 'Analysis'} · {when(it.created_at)}</div>
        </div>
        <span style={{ marginLeft: 'auto', fontSize: 26, fontWeight: 800, color: accent, fontVariantNumeric: 'tabular-nums' }}>
          {(it.pct ?? 0) >= 0 ? '+' : ''}{fmt(it.pct)}%
        </span>
      </div>

      <div style={{ display: 'flex', gap: 18, fontSize: 12, color: MUTED, marginBottom: it.summary ? 10 : 12 }}>
        <span>Price <b style={{ color: '#cdd6f4' }}>${fmt(it.price)}</b></span>
        <span>Target <b style={{ color: '#cdd6f4' }}>${fmt(it.target)}</b></span>
        {it.confidence != null && <span>Conf <b style={{ color: '#cdd6f4' }}>{Math.round(it.confidence)}%</b></span>}
      </div>

      {it.summary && <p style={{ fontSize: 13, lineHeight: 1.55, color: '#aeb9d4', margin: '0 0 14px' }}>{it.summary}</p>}

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={share} style={btn(accent)}><Share2 size={13} /> Share</button>
        <button onClick={downloadPng} style={btn()}><Download size={13} /> Card PNG</button>
        <button onClick={onReel} style={btn()}><Film size={13} /> Reel</button>
        <button onClick={onDelete} style={{ ...btn(), marginLeft: 'auto', color: RED, borderColor: RED + '40' }}><Trash2 size={13} /></button>
      </div>
    </div>
  )
}
function btn(accent?: string): React.CSSProperties {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 9,
    fontSize: 12, fontWeight: 700, cursor: 'pointer',
    background: accent ? accent + '1e' : 'rgba(255,255,255,.04)',
    color: accent || '#cdd6f4', border: `1px solid ${accent ? accent + '40' : BORDER}`,
  }
}

/* ── Page ───────────────────────────────────────────────────────────────── */
export default function AccountPage() {
  const { user, loading } = useAuth()
  const [items, setItems] = useState<HistoryItem[]>([])
  const [busy, setBusy] = useState(true)
  const [tab, setTab] = useState<'all' | 'forecast' | 'analysis'>('all')
  const [reel, setReel] = useState<HistoryItem | null>(null)
  const [showAuth, setShowAuth] = useState(false)

  const name = displayName(user)

  useEffect(() => {
    if (loading) return
    if (!user) { setBusy(false); return }
    let cancel = false
    setBusy(true)
    fetchHistory().then(d => { if (!cancel) { setItems(d); setBusy(false) } })
    return () => { cancel = true }
  }, [user, loading])

  const filtered = useMemo(() => tab === 'all' ? items : items.filter(i => i.kind === tab), [items, tab])
  const stats = useMemo(() => {
    const f = items.filter(i => i.kind === 'forecast').length
    const a = items.filter(i => i.kind === 'analysis').length
    return { total: items.length, f, a }
  }, [items])

  const remove = async (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id))
    await deleteHistory(id)
  }

  return (
    <div style={{ minHeight: '100vh', background: VOID, color: '#e7ecf5', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{ maxWidth: 940, margin: '0 auto', padding: '26px 20px 90px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: MUTED, textDecoration: 'none', fontSize: 14 }}><ArrowLeft size={15} /> YN Finance</Link>
          <Link href="/brainstock" style={{ fontSize: 13, fontWeight: 700, color: '#07101a', background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, padding: '9px 16px', borderRadius: 9, textDecoration: 'none' }}>New forecast →</Link>
        </div>

        {loading ? (
          <div style={{ color: MUTED, fontSize: 14 }}>Loading…</div>
        ) : !user ? (
          <div style={{ textAlign: 'center', padding: '70px 20px' }}>
            <Sparkles size={32} style={{ color: CYAN }} />
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: '16px 0 8px' }}>Sign in to see your history</h1>
            <p style={{ color: MUTED, fontSize: 15, maxWidth: 420, margin: '0 auto 22px' }}>
              Every forecast and analysis you run is saved here — revisit them as shareable cards or rendered videos.
            </p>
            <button onClick={() => setShowAuth(true)} style={{ background: `linear-gradient(135deg, ${CYAN}, ${VIOLET})`, color: '#07101a', border: 'none', padding: '13px 26px', borderRadius: 11, fontWeight: 800, fontSize: 15, cursor: 'pointer' }}>
              Sign in
            </button>
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} reason="Sign in to save and revisit your forecasts and analyses." />}
          </div>
        ) : (
          <>
            {/* welcome */}
            <div style={{ marginBottom: 26 }}>
              <div style={{ fontSize: 13, color: MUTED, letterSpacing: '.04em' }}>Welcome back,</div>
              <h1 style={{ fontSize: 'clamp(30px,6vw,44px)', fontWeight: 800, letterSpacing: '-0.02em', margin: '4px 0 0' }}>{name} 👋</h1>
              <p style={{ color: MUTED, fontSize: 14.5, marginTop: 8 }}>
                {stats.total === 0
                  ? 'Your saved forecasts and analyses will appear here.'
                  : `${stats.total} saved · ${stats.f} forecast${stats.f === 1 ? '' : 's'} · ${stats.a} analys${stats.a === 1 ? 'is' : 'es'}.`}
              </p>
            </div>

            {/* tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
              {(['all', 'forecast', 'analysis'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  style={{ padding: '8px 16px', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer',
                    background: tab === t ? '#fff' : 'rgba(255,255,255,.04)', color: tab === t ? VOID : '#cdd6f4',
                    border: `1px solid ${tab === t ? '#fff' : BORDER}`, textTransform: 'capitalize' }}>
                  {t === 'all' ? 'All' : t === 'forecast' ? 'Forecasts' : 'Analyses'}
                </button>
              ))}
            </div>

            {busy ? (
              <div style={{ color: MUTED, fontSize: 14 }}>Loading your history…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', border: `1px dashed ${BORDER}`, borderRadius: 16 }}>
                <p style={{ color: MUTED, fontSize: 15, marginBottom: 18 }}>Nothing saved yet. Run a forecast or analysis and it lands here automatically.</p>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <Link href="/brainstock" style={{ fontSize: 13, fontWeight: 700, color: '#07101a', background: CYAN, padding: '10px 18px', borderRadius: 9, textDecoration: 'none' }}>Forecast a stock</Link>
                  <Link href="/ai-stocks" style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', background: 'rgba(255,255,255,.05)', border: `1px solid ${BORDER}`, padding: '10px 18px', borderRadius: 9, textDecoration: 'none' }}>Analyze a stock</Link>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
                {filtered.map(it => (
                  <Card key={it.id} it={it} name={name} onReel={() => setReel(it)} onDelete={() => remove(it.id)} />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {reel && <ReelModal item={reel} name={name} onClose={() => setReel(null)} />}
    </div>
  )
}
