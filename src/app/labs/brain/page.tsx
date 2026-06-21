'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import BrainNetwork from '@/components/cinematic/BrainNetwork'

const CYAN = '#22d3ee', VIOLET = '#a78bfa', GREEN = '#34d399', RED = '#f87171', AMBER = '#fbbf24'
const TXT = '#e7ecf5', MUTE = '#8a93a8', FAINT = '#46566e', BORDER = 'rgba(255,255,255,.08)'
const glass: CSSProperties = { background: 'rgba(8,10,16,.62)', border: `1px solid ${BORDER}`, backdropFilter: 'blur(12px)' }
const mono = 'var(--font-mono)'

type Vitals = { ready?: boolean; arch?: string; trained?: number; dirAcc?: number; avgLoss?: number }
type Tile = { ticker: string; pct: number }
type Graded = { ticker: string; ret: number; status: string }
type Thought = { id: number; text: string; color: string }

export default function BrainLab() {
  const [vitals, setVitals] = useState<Vitals | null>(null)
  const [tiles, setTiles] = useState<Tile[]>([])
  const [news, setNews] = useState<string[]>([])
  const [graded, setGraded] = useState<{ wins: number; total: number; recent: Graded[] } | null>(null)
  const [now, setNow] = useState<Tile | null>(null)
  const [headline, setHeadline] = useState<string | null>(null)
  const [thoughts, setThoughts] = useState<Thought[]>([])
  const [forecasts, setForecasts] = useState<number | null>(null)
  const tIdx = useRef(0), nIdx = useRef(0), gIdx = useRef(0), tid = useRef(0)

  const push = (text: string, color: string) => setThoughts((p) => [{ id: tid.current++, text, color }, ...p].slice(0, 26))

  // data
  useEffect(() => {
    const loadSlow = () => {
      fetch('/api/nn').then((r) => r.json()).then(setVitals).catch(() => {})
      fetch('/api/market-brain').then((r) => r.json()).then((d) => { if (d?.tiles?.length) setTiles(d.tiles) }).catch(() => {})
      fetch('/api/track-record').then((r) => r.json()).then((d) => { if (d?.stats) setGraded({ wins: d.stats.wins, total: d.stats.total, recent: d.recent || [] }) }).catch(() => {})
      fetch('/api/news').then((r) => r.json()).then((d) => { const arr = (d?.news || d || []).map((n: { headline?: string; title?: string }) => n.headline || n.title).filter(Boolean); if (arr.length) setNews(arr.slice(0, 30)) }).catch(() => {})
      fetch('/api/stats').then((r) => r.json()).then((d) => { if (typeof d?.forecasts === 'number') setForecasts(d.forecasts) }).catch(() => {})
    }
    loadSlow(); const id = setInterval(loadSlow, 45000); return () => clearInterval(id)
  }, [])

  // the constant "thinking" — cycles every ~1.4s
  useEffect(() => {
    const id = setInterval(() => {
      if (tiles.length) {
        const t = tiles[tIdx.current % tiles.length]; tIdx.current++
        setNow(t)
        push(`▶ forecasting $${t.ticker} → ${t.pct >= 0 ? '+' : ''}${t.pct}%`, t.pct >= 0 ? GREEN : RED)
      }
    }, 1400)
    return () => clearInterval(id)
  }, [tiles])

  // graded stream every ~5s
  useEffect(() => {
    const id = setInterval(() => {
      const rec = graded?.recent || []
      if (rec.length) { const g = rec[gIdx.current % rec.length]; gIdx.current++; const ok = g.status === 'hit'; push(`${ok ? '✓' : '✗'} graded $${g.ticker} ${ok ? 'CORRECT' : 'WRONG'} ${g.ret >= 0 ? '+' : ''}${g.ret}%`, ok ? GREEN : RED) }
    }, 5000)
    return () => clearInterval(id)
  }, [graded])

  // news every ~4s
  useEffect(() => {
    const id = setInterval(() => { if (news.length) { setHeadline(news[nIdx.current % news.length]); nIdx.current++ } }, 4000)
    return () => clearInterval(id)
  }, [news])

  const dirAcc = vitals?.dirAcc ?? 0
  const accuracy = dirAcc ? dirAcc / 100 : graded && graded.total ? graded.wins / graded.total : 0.55
  const acc = graded && graded.total ? graded.wins : 0
  const inacc = graded && graded.total ? graded.total - graded.wins : 0
  const accPct = acc + inacc ? (acc / (acc + inacc)) * 100 : accuracy * 100

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(1200px 800px at 50% 30%, #0a0f1a, #05060b 80%)', overflow: 'hidden', color: TXT, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <style>{`@keyframes br-blink{0%,100%{opacity:1}50%{opacity:.3}}@keyframes br-feed{from{opacity:0;transform:translateX(-6px)}to{opacity:1}}@keyframes br-proc{0%{width:5%}100%{width:95%}}.br-t{animation:br-feed .3s ease both}
        /* mobile: the floating HUD panels overlap the brain — hide them; the brain + live thought stream carry it */
        @media (max-width:820px){ .br-panel{display:none !important} }`}</style>

      {/* the brain — centered, with the network drawn inside the silhouette */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: `radial-gradient(700px 600px at 50% 46%, ${CYAN}10, transparent 60%)` }} />
      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
        <div style={{ width: 'min(78vh, 720px)', maxWidth: '94vw', aspectRatio: '600 / 560' }}><BrainNetwork accuracy={accuracy} /></div>
      </div>

      {/* top bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 'clamp(14px,2.5vw,24px)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
        <div>
          <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: '0.28em', color: CYAN, display: 'flex', alignItems: 'center', gap: 8 }}><span style={{ width: 7, height: 7, borderRadius: 99, background: GREEN, animation: 'br-blink 1.2s infinite' }} /> THE BRAIN · LIVE</div>
          <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.04em', fontSize: 'clamp(1.5rem,3.4vw,2.6rem)', marginTop: 8, lineHeight: 1 }}>See what it&apos;s thinking, right now.</h1>
          <div style={{ fontFamily: mono, fontSize: 11.5, color: MUTE, marginTop: 8 }}>{forecasts != null ? `${forecasts.toLocaleString()} real forecasts logged` : 'live'} · {vitals?.arch ?? '11→16→12→1'}</div>
        </div>
        <Link href="/labs" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTE, textDecoration: 'none', ...glass, padding: '8px 14px' }}><ArrowLeft size={14} /> Labs</Link>
      </div>

      {/* vitals — top left */}
      <Panel style={{ top: 'clamp(110px,16vh,150px)', left: 'clamp(14px,2.5vw,24px)', width: 'min(230px,42vw)' }}>
        <Label>BRAIN VITALS</Label>
        <Row k="examples trained" v={(vitals?.trained ?? 0).toLocaleString()} c={TXT} />
        <Row k="directional acc." v={`${dirAcc.toFixed(1)}%`} c={dirAcc >= 50 ? GREEN : AMBER} />
        <Row k="avg loss" v={(vitals?.avgLoss ?? 0).toFixed(4)} c={VIOLET} />
        <Row k="status" v={(vitals?.trained ?? 0) > 0 ? 'LEARNING' : 'BOOTSTRAPPING'} c={(vitals?.trained ?? 0) > 0 ? GREEN : AMBER} />
      </Panel>

      {/* accuracy — top right */}
      <Panel style={{ top: 'clamp(110px,16vh,150px)', right: 'clamp(14px,2.5vw,24px)', width: 'min(230px,42vw)' }}>
        <Label>ACCURATE vs INACCURATE</Label>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: mono, fontSize: 13, marginBottom: 8 }}>
          <span style={{ color: GREEN }}>✓ {acc}</span><span style={{ color: RED }}>{inacc} ✗</span>
        </div>
        <div style={{ height: 9, borderRadius: 99, overflow: 'hidden', display: 'flex', border: `1px solid ${BORDER}` }}>
          <div style={{ width: `${accPct}%`, background: GREEN, transition: 'width .8s ease' }} />
          <div style={{ width: `${100 - accPct}%`, background: RED, transition: 'width .8s ease' }} />
        </div>
        <div style={{ fontFamily: mono, fontSize: 11, color: MUTE, marginTop: 8 }}>{accPct.toFixed(1)}% of graded calls correct</div>
      </Panel>

      {/* now processing — mid left */}
      <Panel style={{ top: 'clamp(300px,42vh,420px)', left: 'clamp(14px,2.5vw,24px)', width: 'min(230px,42vw)' }}>
        <Label>NOW PROCESSING</Label>
        {now ? (
          <>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: mono, fontWeight: 700, fontSize: 22 }}>${now.ticker}</span>
              <span style={{ fontFamily: mono, fontWeight: 700, color: now.pct >= 0 ? GREEN : RED }}>{now.pct >= 0 ? '+' : ''}{now.pct}%</span>
            </div>
            <div style={{ height: 4, background: 'rgba(255,255,255,.06)', borderRadius: 99, marginTop: 10, overflow: 'hidden' }}>
              <div key={now.ticker} style={{ height: '100%', background: `linear-gradient(90deg,${CYAN},${VIOLET})`, animation: 'br-proc 1.4s linear' }} />
            </div>
            <div style={{ fontFamily: mono, fontSize: 10.5, color: FAINT, marginTop: 8 }}>running 11 features through the net…</div>
          </>
        ) : <div style={{ fontFamily: mono, fontSize: 11, color: FAINT }}>warming up…</div>}
      </Panel>

      {/* reading (news) — mid right */}
      <Panel style={{ top: 'clamp(300px,42vh,420px)', right: 'clamp(14px,2.5vw,24px)', width: 'min(250px,44vw)' }}>
        <Label>READING THE TAPE</Label>
        {headline ? <div key={headline} className="br-t" style={{ fontSize: 13, color: '#cdd6e6', lineHeight: 1.5 }}>📰 {headline}</div> : <div style={{ fontFamily: mono, fontSize: 11, color: FAINT }}>tuning in…</div>}
      </Panel>

      {/* thought stream — bottom */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 'clamp(12px,2vw,20px)' }}>
        <div style={{ ...glass, padding: '10px 14px', maxWidth: 640, margin: '0 auto', maxHeight: 132, overflow: 'hidden' }}>
          <Label>THOUGHT STREAM</Label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {thoughts.slice(0, 5).map((t) => <div key={t.id} className="br-t" style={{ fontFamily: mono, fontSize: 12, color: t.color, opacity: 0.95 }}>{t.text}</div>)}
            {!thoughts.length && <div style={{ fontFamily: mono, fontSize: 12, color: FAINT }}>● initializing…</div>}
          </div>
        </div>
      </div>
    </div>
  )
}

function Panel({ children, style }: { children: React.ReactNode; style?: CSSProperties }) {
  return <div className="br-panel" style={{ position: 'absolute', ...glass, padding: 14, ...style }}>{children}</div>
}
function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontFamily: mono, fontSize: 10, letterSpacing: '0.16em', color: FAINT, marginBottom: 10 }}>{children}</div>
}
function Row({ k, v, c }: { k: string; v: string; c: string }) {
  return <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}><span style={{ fontFamily: mono, fontSize: 10.5, color: MUTE }}>{k}</span><span style={{ fontFamily: mono, fontSize: 13, fontWeight: 700, color: c }}>{v}</span></div>
}
