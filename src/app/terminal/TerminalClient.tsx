'use client'

/**
 * PROJECT MATRIX — prediction-market intelligence platform (landing + spec).
 * An ecosystem of hundreds of reasoning agents → a Bayesian consensus engine →
 * an edge engine → paper-first execution. Cyber-neural aesthetic: tactical
 * graphite + bioluminescent green. Reduced-motion safe.
 */
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Download, ArrowLeft, Gauge, ShieldCheck, Lock, Boxes,
  Zap, Gavel, Trophy, CloudLightning, Bitcoin, TrendingUp, Landmark, Activity,
  Crosshair, Signal, LockKeyhole, Waypoints, CircuitBoard,
  Newspaper, MessageSquare, Banknote, Globe, Satellite, Vote, History,
  Layers, GitBranch, LineChart, AlertTriangle, Waves, Brain,
  type LucideIcon,
} from 'lucide-react'

const KAL_GREEN = '#00d29f'
const APP_FILE = '/Project-Matrix.html'

const C = {
  bg: '#0D0F12', deep: '#08090b', panel: 'rgba(255,255,255,.022)',
  line: 'rgba(120,255,170,.10)', ink: '#e9f5ee', dim: '#7f8c84', faint: '#4a564e',
  green: '#2be86a', lime: '#b6ff3a', emerald: '#10d98a', red: '#ff5a6a',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}

function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setR(mq.matches); const on = () => setR(mq.matches)
    mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on)
  }, [])
  return r
}
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ════════════════════════════════════════════════════════════════════════════
// NEURAL HUB — the consensus cortex: nodes (agents) pulse, edges carry votes,
// pings fire on new information, lobes flare on high-conviction clusters.
// ════════════════════════════════════════════════════════════════════════════
function NeuralHub({ height = 420 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const reduced = useReducedMotion()
  useEffect(() => {
    const cv = ref.current; if (!cv) return
    const ctx = cv.getContext('2d'); if (!ctx) return
    const rng = mulberry32(1337)
    let W = 0, H = 0, dpr = 1
    type Node = { x: number; y: number; r: number; base: number; lobe: number; phase: number }
    let nodes: Node[] = []; let edges: [number, number][] = []
    function inBrain(nx: number, ny: number): number {
      const yy = ny * 1.15
      const L = ((nx + 0.42) / 0.62) ** 2 + (yy / 0.92) ** 2
      const R = ((nx - 0.42) / 0.62) ** 2 + (yy / 0.92) ** 2
      if (L < 1) return 0; if (R < 1) return 1; return -1
    }
    function build() {
      const rect = cv!.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1); W = rect.width; H = rect.height
      cv!.width = Math.floor(W * dpr); cv!.height = Math.floor(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.46
      nodes = []; let guard = 0
      while (nodes.length < 54 && guard < 5000) {
        guard++; const nx = rng() * 2 - 1, ny = rng() * 2 - 1, lobe = inBrain(nx, ny)
        if (lobe < 0) continue
        nodes.push({ x: cx + nx * scale, y: cy + ny * scale * 0.92, r: 1.4 + rng() * 2.6, base: 0.35 + rng() * 0.4, lobe, phase: rng() * Math.PI * 2 })
      }
      edges = []
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
          .filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
        for (const o of d) if (o.j > i) edges.push([i, o.j])
      }
    }
    build()
    type Ping = { e: number; t: number; sp: number; hue: number }
    let pings: Ping[] = []; type Flare = { lobe: number; t: number }; let flares: Flare[] = []
    let raf = 0, last = 0, acc = 0, frame = 0
    function spawnPing() { if (edges.length) pings.push({ e: Math.floor(rng() * edges.length), t: 0, sp: 0.012 + rng() * 0.03, hue: rng() }) }
    function spawnFlare() { flares.push({ lobe: rng() > 0.5 ? 0 : 1, t: 0 }) }
    function draw(now: number) {
      frame++; if (!last) last = now
      const dt = Math.min(48, now - last); last = now; acc += dt
      ctx!.clearRect(0, 0, W, H)
      const g = ctx!.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.6)
      g.addColorStop(0, 'rgba(43,232,106,0.05)'); g.addColorStop(1, 'rgba(13,15,18,0)')
      ctx!.fillStyle = g; ctx!.fillRect(0, 0, W, H)
      if (!reduced && acc > 220) { acc = 0; if (rng() > 0.3) spawnPing(); if (rng() > 0.92) spawnFlare() }
      flares = flares.filter((f) => { f.t += dt / 900; return f.t < 1 })
      for (const [a, b] of edges) {
        const na = nodes[a], nb = nodes[b]
        ctx!.strokeStyle = `rgba(120,255,170,${0.05 + 0.03 * Math.sin(frame / 40 + a)})`; ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.moveTo(na.x, na.y); ctx!.lineTo(nb.x, nb.y); ctx!.stroke()
      }
      pings = pings.filter((p) => {
        p.t += reduced ? 0 : p.sp * (dt / 16); if (p.t >= 1) return false
        const [a, b] = edges[p.e], na = nodes[a], nb = nodes[b]
        const x = na.x + (nb.x - na.x) * p.t, y = na.y + (nb.y - na.y) * p.t
        const col = p.hue > 0.6 ? '182,255,58' : '43,232,106'
        ctx!.fillStyle = `rgba(${col},0.95)`; ctx!.shadowColor = `rgba(${col},0.9)`; ctx!.shadowBlur = 12
        ctx!.beginPath(); ctx!.arc(x, y, 2.4, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0; return true
      })
      for (const n of nodes) {
        const lobeFlare = flares.reduce((m, f) => f.lobe === n.lobe ? Math.max(m, Math.sin(f.t * Math.PI)) : m, 0)
        const pulse = reduced ? n.base : n.base + 0.35 * (0.5 + 0.5 * Math.sin(frame / 22 + n.phase))
        const a = Math.min(1, pulse + lobeFlare * 0.7), rr = n.r * (1 + lobeFlare * 0.9)
        ctx!.fillStyle = `rgba(200,255,220,${a})`; ctx!.shadowColor = `rgba(43,232,106,${a})`; ctx!.shadowBlur = 8 + lobeFlare * 22
        ctx!.beginPath(); ctx!.arc(n.x, n.y, rr, 0, Math.PI * 2); ctx!.fill(); ctx!.shadowBlur = 0
      }
      if (!reduced) raf = requestAnimationFrame(draw)
    }
    if (reduced) draw(0); else raf = requestAnimationFrame(draw)
    const onResize = () => build(); window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [reduced])
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(78%, 360px)', aspectRatio: '1', borderRadius: '50%', border: `1px solid ${C.green}22`, boxShadow: `inset 0 0 60px ${C.green}0e` }} />
      </div>
      <div style={{ position: 'absolute', left: 14, top: 12, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.18em', color: C.green, textTransform: 'uppercase' }}>◉ CONSENSUS CORTEX</div>
      <div style={{ position: 'absolute', right: 14, top: 12, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.12em', color: C.dim }}>312 agents · 2.1s tick</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE EVENT FEED
// ════════════════════════════════════════════════════════════════════════════
type Cat = { icon: LucideIcon; label: string; color: string }
const CATS: Record<string, Cat> = {
  energy: { icon: Zap, label: 'MACRO · ENERGY', color: '#b6ff3a' },
  sports: { icon: Trophy, label: 'SPORTS', color: '#2be86a' },
  politics: { icon: Gavel, label: 'POLITICS', color: '#8bffd0' },
  weather: { icon: CloudLightning, label: 'WEATHER · NOAA', color: '#5cf2ff' },
  crypto: { icon: Bitcoin, label: 'CRYPTO', color: '#ffd23a' },
  macro: { icon: Landmark, label: 'FED · RATES', color: '#10d98a' },
  equity: { icon: TrendingUp, label: 'EQUITY INDEX', color: '#7dffb0' },
}
const FEED: { cat: keyof typeof CATS; market: string; edge: string; prob: number; act: string }[] = [
  { cat: 'macro', market: 'Fed cut before Sept FOMC', edge: '+8.1', prob: 66, act: '14 agents · 0.82 conf' },
  { cat: 'energy', market: 'WTI settles > $82 Fri', edge: '+11.4', prob: 71, act: 'EV +$0.11/$1 · sim' },
  { cat: 'weather', market: 'NHC names storm by Fri', edge: '+5.9', prob: 58, act: 'consensus ↑ 6pt' },
  { cat: 'politics', market: 'Ruling filed this week', edge: '+8.1', prob: 66, act: 'PAPER · filled' },
  { cat: 'crypto', market: 'BTC close > $70k today', edge: '+9.7', prob: 74, act: 'edge score 0.91' },
  { cat: 'equity', market: 'S&P closes green', edge: '+4.8', prob: 57, act: 'below threshold · watch' },
]
function LiveFeed() {
  const reduced = useReducedMotion()
  const [rows, setRows] = useState(() => FEED.slice(0, 5))
  const idx = useRef(5)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => { const next = FEED[idx.current % FEED.length]; idx.current++; setRows((r) => [next, ...r].slice(0, 6)) }, 2200)
    return () => clearInterval(t)
  }, [reduced])
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.deep, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `1px solid ${C.line}`, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim }}>
        <Signal size={13} style={{ color: C.green }} /> event → probability · live
        <span style={{ marginLeft: 'auto', color: C.green }}>▲ streaming</span>
      </div>
      {rows.map((r, i) => {
        const cat = CATS[r.cat]; const Icon = cat.icon
        return (
          <div key={`${r.market}-${i}`} style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.line}`, animation: reduced ? 'none' : 'ynk-feed .5s cubic-bezier(.16,1,.3,1) both' }}>
            <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: `${cat.color}14`, border: `1px solid ${cat.color}40`, color: cat.color }}><Icon size={15} /></span>
            <span style={{ minWidth: 0 }}>
              <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.market}</span>
              <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', color: cat.color }}>{cat.label}</span>
            </span>
            <span style={{ textAlign: 'right' }}>
              <span style={{ display: 'block', fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{r.prob}%</span>
              <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', color: C.dim }}>{r.edge}pt · {r.act}</span>
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ── primitives ──────────────────────────────────────────────────────────────
function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.green }}>{children}</div>
}
function SectionHead({ n, kicker, title, blurb }: { n: string; kicker: string; title: string; blurb: string }) {
  return (
    <div style={{ maxWidth: 800, marginBottom: 'clamp(24px,4vw,40px)' }}>
      <Kicker><span style={{ color: C.faint }}>{n}</span> {kicker}</Kicker>
      <h2 style={{ margin: '14px 0 0', fontFamily: C.sans, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.04, fontSize: 'clamp(1.8rem,4.5vw,3rem)', color: C.ink }}>{title}</h2>
      <p style={{ margin: '14px 0 0', color: C.dim, fontSize: 'clamp(1rem,1.6vw,1.12rem)', lineHeight: 1.6 }}>{blurb}</p>
    </div>
  )
}
function SpecCard({ icon: Icon, title, children, spec }: { icon: LucideIcon; title: string; children: React.ReactNode; spec?: [string, string][] }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 'clamp(18px,3vw,26px)', position: 'relative', overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${C.green}55, transparent)` }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 11, background: `${C.green}12`, border: `1px solid ${C.green}33`, color: C.green, marginBottom: 14 }}><Icon size={21} /></div>
      <h3 style={{ margin: '0 0 8px', fontSize: 'clamp(1.05rem,2vw,1.3rem)', fontWeight: 750, letterSpacing: '-0.01em', color: C.ink }}>{title}</h3>
      <div style={{ color: C.dim, fontSize: 14, lineHeight: 1.62 }}>{children}</div>
      {spec && (
        <div style={{ marginTop: 16, display: 'grid', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 9, overflow: 'hidden' }}>
          {spec.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, background: C.deep, padding: '9px 12px' }}>
              <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint }}>{k}</span>
              <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 700, color: C.emerald, textAlign: 'right' }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
function Chip({ children }: { children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', fontFamily: C.mono, fontSize: 11, letterSpacing: '0.04em', color: C.emerald, border: `1px solid ${C.line}`, background: C.deep, padding: '5px 10px', borderRadius: 7 }}>{children}</span>
}

// ── data ─────────────────────────────────────────────────────────────────────
const AGENTS: { icon: LucideIcon; name: string; d: string }[] = [
  { icon: Landmark, name: 'Macro', d: 'growth, inflation, rates regimes' },
  { icon: Banknote, name: 'Federal Reserve', d: 'FOMC path, dot-plot drift, speeches' },
  { icon: Gavel, name: 'Political / Legal', d: 'legislation, rulings, court dockets' },
  { icon: CloudLightning, name: 'Weather', d: 'NOAA / NHC feeds, storm tracks' },
  { icon: Trophy, name: 'Sports', d: 'lines, injuries, matchup models' },
  { icon: Newspaper, name: 'Breaking News', d: 'wire + RSS event extraction' },
  { icon: MessageSquare, name: 'Social Sentiment', d: 'trend + tone (where permitted)' },
  { icon: Globe, name: 'Geopolitical', d: 'conflict, treaties, elections abroad' },
  { icon: Boxes, name: 'Supply Chain', d: 'shipping, inventories, commodities' },
  { icon: Satellite, name: 'Satellite / Alt-data', d: 'imagery-derived signals' },
  { icon: Vote, name: 'Election Polls', d: 'aggregation + house-effect adjust' },
  { icon: Waves, name: 'Market Structure', d: 'order book, spread, microstructure' },
  { icon: Activity, name: 'Liquidity', d: 'depth, slippage, fill probability' },
  { icon: History, name: 'Historical Analogs', d: 'nearest-neighbor base rates' },
  { icon: Gauge, name: 'Calibration', d: 'reliability curves, isotonic fit' },
  { icon: AlertTriangle, name: 'Risk', d: 'tail risk, drawdown, exposure' },
  { icon: Layers, name: 'Portfolio', d: 'correlation, sizing, allocation' },
  { icon: Crosshair, name: 'Execution', d: 'routing, timing, cost model' },
]
const ENSEMBLE = ['Weighted voting', 'Bayesian aggregation', 'Confidence decay', 'Model reputation (Elo)', 'Online learning', 'Meta-learning', 'Stacked ensembles', 'Hidden Markov models', 'Transformer sequence models', 'Gradient-boosted trees', 'Time-series forecasting', 'Graph neural networks', 'Neural Bayesian updating']
const SOURCES = ['Fed', 'BLS', 'BEA', 'NOAA', 'NHC', 'USGS', 'SEC / EDGAR', 'Court opinions', 'Election feeds', 'Sports data', 'Company PR', 'Economic calendars', 'News + RSS', 'Social APIs*']
const EDGE_METRICS: [string, string][] = [
  ['Expected value', 'p/price − 1'], ['Kelly criterion', 'edge / odds'], ['Position size', 'fractional-Kelly, capped'],
  ['Expected Sharpe', 'return / vol'], ['Max drawdown', 'stress-tested'], ['Correlation risk', 'portfolio-aware'],
  ['Tail risk', 'CVaR bound'], ['Confidence interval', 'posterior 90%'], ['Edge score', 'blended rank'], ['Trade quality', 'gate composite'],
]
const VIZ = ['Global intelligence map', 'Consensus heatmaps', 'Agent voting network', 'Confidence gauges', 'Market radar', 'Portfolio dashboard', 'Risk monitor', 'PnL analytics', 'Trade timeline', 'Live event feed', 'Execution pipeline', 'Latency + system health']

export default function TerminalClient() {
  const reduced = useReducedMotion()
  const [modalOS, setModalOS] = useState<string | null>(null)
  const openModal = (os: string) => setModalOS(os)
  return (
    <main style={{ background: C.bg, color: C.ink, minHeight: '100vh', fontFamily: C.sans, overflowX: 'hidden' }}>
      <style>{`
        @keyframes ynk-feed { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        .ynk-grid2 { display:grid; grid-template-columns: 1.05fr .95fr; gap: clamp(24px,4vw,56px); align-items:center }
        @media (max-width: 900px){ .ynk-grid2 { grid-template-columns: 1fr } }
      `}</style>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(12px)', background: 'rgba(13,15,18,.72)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px clamp(16px,3vw,28px)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: C.mono, fontSize: 11.5, letterSpacing: '0.1em', color: C.dim, textDecoration: 'none' }}><ArrowLeft size={14} /> YN FINANCE</Link>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 6, fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.12em', color: C.ink }}>
            <CircuitBoard size={16} style={{ color: C.green }} /> PROJECT <span style={{ color: C.green }}>MATRIX</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10 }}>
            <a href={APP_FILE} download="Project-Matrix.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: C.mono, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.green, padding: '8px 14px', borderRadius: 8, textDecoration: 'none', boxShadow: `0 0 22px ${C.green}44` }}><Download size={14} /> Download</a>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(28px,5vw,64px) clamp(16px,3vw,28px) clamp(20px,4vw,40px)' }}>
        <div className="ynk-grid2">
          <div>
            <Kicker><span style={{ width: 7, height: 7, borderRadius: 9, background: C.green, boxShadow: `0 0 10px ${C.green}` }} /> PREDICTION-MARKET INTELLIGENCE · v1.0</Kicker>
            <h1 style={{ margin: '18px 0 0', fontWeight: 850, letterSpacing: '-0.04em', lineHeight: 0.98, fontSize: 'clamp(2.4rem,6.4vw,4.7rem)' }}>
              Markets move when<br /><span style={{ color: 'transparent', background: `linear-gradient(100deg, ${C.green}, ${C.lime})`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>information arrives.</span>
            </h1>
            <p style={{ margin: '18px 0 0', maxWidth: 540, color: C.dim, fontSize: 'clamp(1.02rem,1.8vw,1.2rem)', lineHeight: 1.55 }}>
              <b style={{ color: C.ink }}>PROJECT MATRIX</b> is an ecosystem of <b style={{ color: C.green }}>hundreds of cooperating reasoning agents</b> analyzing
              thousands of live sources. A Bayesian consensus engine fuses them into calibrated probabilities, and an edge engine
              surfaces statistically favorable Kalshi opportunities — with transparent reasoning. Bloomberg terminal × quant research lab.
            </p>
            <div style={{ marginTop: 'clamp(22px,3vw,30px)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <DownloadApp />
              <NativeBtn onOpen={openModal} />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 16, flexWrap: 'wrap', fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.06em', color: C.faint }}>
              <span><ShieldCheck size={12} style={{ color: C.emerald, verticalAlign: '-2px' }} /> Paper-trading by default</span>
              <span><Lock size={12} style={{ color: C.emerald, verticalAlign: '-2px' }} /> Live orders only on explicit confirm</span>
            </div>
          </div>
          <div style={{ position: 'relative', border: `1px solid ${C.line}`, borderRadius: 18, background: `radial-gradient(120% 90% at 50% 0%, ${C.green}0a, ${C.deep} 60%)`, padding: 6, boxShadow: `0 0 80px ${C.green}12` }}>
            <NeuralHub height={reduced ? 320 : 420} />
            <div style={{ padding: '4px 10px 8px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['Weighted vote', 'Bayesian fuse', 'Elo-weighted', 'Calibrated'].map((t) => <Chip key={t}>{t}</Chip>)}
            </div>
          </div>
        </div>
      </section>

      {/* metrics */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
          {[['300+', 'reasoning agents'], ['thousands', 'live sources'], ['~2s', 'consensus tick'], ['Bayesian', 'aggregation'], ['Elo', 'agent reputations'], ['paper-first', 'execution']].map(([v, k]) => (
            <div key={k} style={{ background: C.bg, padding: 'clamp(14px,2vw,20px)' }}>
              <div style={{ fontFamily: C.mono, fontSize: 'clamp(1rem,2.2vw,1.5rem)', fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginTop: 5 }}>{k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 01 · AGENT ECOSYSTEM */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="01 /" kicker="The agent ecosystem"
          title="No single model decides. Hundreds reason in parallel."
          blurb="Each specialist agent thinks independently and continuously, emitting a probability, a confidence, supporting evidence, historical analogs, an uncertainty band, and an expected edge. Every output is stored, scored, and fed back into the network." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12 }}>
          {AGENTS.map((a) => {
            const Icon = a.icon
            return (
              <div key={a.name} style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '13px 14px', border: `1px solid ${C.line}`, borderRadius: 12, background: C.panel }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: 9, background: `${C.green}12`, border: `1px solid ${C.green}30`, color: C.green, flexShrink: 0 }}><Icon size={17} /></span>
                <span><b style={{ display: 'block', fontSize: 13.5, color: C.ink }}>{a.name} Agents</b><span style={{ fontFamily: C.mono, fontSize: 11, color: C.dim }}>{a.d}</span></span>
              </div>
            )
          })}
          <div style={{ display: 'grid', placeItems: 'center', padding: '13px 14px', border: `1px dashed ${C.green}44`, borderRadius: 12, background: C.deep, fontFamily: C.mono, fontSize: 12, color: C.green, textAlign: 'center' }}>+ hundreds more, spawned per market</div>
        </div>
      </section>

      {/* 02 · CONSENSUS ENGINE */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="02 /" kicker="The Matrix consensus engine"
          title="Many minds, one calibrated probability."
          blurb="Agent outputs are fused every few seconds by a stacked, reputation-weighted ensemble. Winners earn weight; stale or wrong reasoning decays. The result is a single probability with an honest uncertainty band — not one model's guess." />
        <div className="ynk-grid2">
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: C.deep, padding: 6, boxShadow: `0 0 60px ${C.green}10` }}>
            <NeuralHub height={reduced ? 300 : 380} />
          </div>
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Fusion methods</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{ENSEMBLE.map((e) => <Chip key={e}>{e}</Chip>)}</div>
            <div style={{ marginTop: 16, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 12 }}>
              <SpecCard icon={GitBranch} title="Reputation-weighted">Each agent carries an Elo-like rating from its realized calibration. Higher-rated reasoning gets more vote; decay punishes staleness.</SpecCard>
              <SpecCard icon={Gauge} title="Calibrated + honest">Posterior confidence intervals, not point guesses — the engine tells you how sure it is, and when it isn&apos;t.</SpecCard>
            </div>
          </div>
        </div>
      </section>

      {/* 03 · REAL-TIME EVENT ENGINE */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="03 /" kicker="Real-time event engine"
          title="Every new event propagates through every agent — instantly."
          blurb="Government releases, filings, wires, weather, and calendars stream into a unified event bus. The moment information lands, it fans out to every specialist and the consensus re-prices the affected markets. The goal is minimal event-to-probability latency." />
        <div className="ynk-grid2">
          <LiveFeed />
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Source adapters</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{SOURCES.map((s) => <Chip key={s}>{s}</Chip>)}</div>
            <p style={{ marginTop: 14, color: C.dim, fontSize: 13, lineHeight: 1.6 }}>* Social and third-party APIs are used only where their terms permit. MATRIX ingests <b style={{ color: C.ink }}>public</b> information and reacts fast — it does not source or use non-public data.</p>
          </div>
        </div>
      </section>

      {/* 04 · MARKET + EDGE ENGINE */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="04 /" kicker="Market & edge engine"
          title="From the Kalshi book to a ranked, sized opportunity."
          blurb="MATRIX streams the Kalshi order book, tracks implied probabilities and drift, and hunts inefficiencies and cross-market arbitrage. For every market it computes a full risk-aware edge profile before anything is ever proposed." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <SpecCard icon={Waves} title="Market engine" spec={[['Feed', 'order book + trades'], ['Signals', 'spread · drift · momentum'], ['Detect', 'arb · correlation · vol']]}>
            Live market discovery, depth and liquidity detection, implied-probability tracking, momentum and volatility estimation, and cross-market correlation — the microstructure layer under every call.
          </SpecCard>
          <SpecCard icon={LineChart} title="Edge engine" spec={EDGE_METRICS.slice(0, 5)}>
            Every market gets an EV, a fractional-Kelly size, expected Sharpe and drawdown, correlation and tail risk, a posterior confidence interval, and a blended edge + trade-quality score that sets execution priority.
          </SpecCard>
          <SpecCard icon={Brain} title="Learning engine" spec={[['After each call', 'compare to outcome'], ['Update', 'weights + Elo'], ['Objective', 'calibration ↑']]}>
            Every prediction is graded on settlement. Calibration is measured, agent weights and Elo ratings are updated, good reasoning is rewarded and bad reasoning penalized — the ensemble compounds skill over time.
          </SpecCard>
        </div>
      </section>

      {/* 05 · EXECUTION + GOVERNANCE + KALSHI GATEWAY */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="05 /" kicker="Execution & governance"
          title="Paper-first. Auditable. Never fires without you."
          blurb="MATRIX defaults to paper and simulation. Live orders require explicit, per-trade confirmation. Every action is logged and reviewable, and a global kill-switch flattens everything instantly." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14, marginBottom: 'clamp(20px,3vw,28px)' }}>
          <SpecCard icon={ShieldCheck} title="Three modes" spec={[['Default', 'paper'], ['Then', 'simulation'], ['Live', 'explicit confirm']]}>
            Paper, simulation, and live. You graduate a strategy deliberately — nothing touches real money until you say so, per order.
          </SpecCard>
          <SpecCard icon={Crosshair} title="Order & position control" spec={[['Orders', 'limit · marketable · cancel'], ['Exits', 'TP · stop · partial'], ['Caps', 'per-market + portfolio']]}>
            Marketable-limit routing, take-profit and stop logic where applicable, partial exits, and hard exposure limits you define up front.
          </SpecCard>
          <SpecCard icon={AlertTriangle} title="Kill-switch + audit" spec={[['Panic', 'global flatten'], ['Log', 'every action'], ['Review', 'full trade journal']]}>
            One hotkey disarms every strategy and flattens every position. Every decision, order, and fill is timestamped and auditable.
          </SpecCard>
        </div>

        <div style={{ border: `1px solid ${KAL_GREEN}44`, borderRadius: 16, background: `linear-gradient(140deg, ${KAL_GREEN}0e, ${C.deep} 55%)`, padding: 'clamp(20px,3.5vw,34px)' }}>
          <div className="ynk-grid2">
            <div>
              <Kicker><Waypoints size={13} /> OFFICIAL KALSHI GATEWAY</Kicker>
              <h3 style={{ margin: '12px 0 0', fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Your account. Your keys. Your call.</h3>
              <p style={{ margin: '12px 0 0', color: C.dim, fontSize: 14.5, lineHeight: 1.6, maxWidth: 460 }}>
                Connect through Kalshi&apos;s official API-key handshake. Credentials are sealed in the OS keychain and never leave your
                device; MATRIX signs each request locally and routes it straight to Kalshi — always inside Kalshi&apos;s Terms and rate limits.
              </p>
              <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" onClick={() => openModal(detectOS())} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: C.sans, fontWeight: 800, fontSize: 15, color: '#04140c', background: KAL_GREEN, border: 'none', padding: '13px 22px', borderRadius: 10, cursor: 'pointer', boxShadow: `0 0 26px ${KAL_GREEN}55` }}><KalshiMark /> Connect Kalshi</button>
                <span style={{ fontFamily: C.mono, fontSize: 10.5, color: C.faint, letterSpacing: '0.06em' }}><LockKeyhole size={12} style={{ verticalAlign: '-2px', color: KAL_GREEN }} /> encrypted · local-only</span>
              </div>
            </div>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.deep, padding: 16, fontFamily: C.mono, fontSize: 12.5, color: C.dim, lineHeight: 1.9 }}>
              <div style={{ color: C.faint, marginBottom: 6 }}>// consensus → proposal</div>
              <div><span style={{ color: C.green }}>agents</span> 312 · <span style={{ color: C.lime }}>conf 0.84</span> · edge +8.1pt</div>
              <div><span style={{ color: C.green }}>mode</span> paper → <span style={{ color: KAL_GREEN }}>awaiting confirm</span></div>
              <div style={{ color: C.faint, margin: '10px 0 6px' }}>// on your click (RSA-signed, local)</div>
              <div><span style={{ color: C.green }}>POST</span> /portfolio/orders · limit · yes</div>
              <div><span style={{ color: C.emerald }}>logged</span> · journaled · lock armed</div>
            </div>
          </div>
        </div>
      </section>

      {/* 06 · VISUALIZATION */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="06 /" kicker="The command deck"
          title="See the whole mind at once."
          blurb="A futuristic operations view: the agent voting network, consensus heatmaps, confidence gauges, market radar, portfolio and risk monitors, PnL analytics, the live event feed, and an animated execution pipeline — with latency and system-health telemetry throughout." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10 }}>
          {VIZ.map((v) => (
            <div key={v} style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px', border: `1px solid ${C.line}`, borderRadius: 11, background: C.panel }}>
              <span style={{ width: 7, height: 7, borderRadius: 9, background: C.green, boxShadow: `0 0 10px ${C.green}`, flexShrink: 0 }} />
              <span style={{ fontSize: 13.5, color: C.ink }}>{v}</span>
            </div>
          ))}
        </div>
      </section>

      {/* DOWNLOAD CTA */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px,8vw,110px) clamp(16px,3vw,28px)' }}>
        <div style={{ position: 'relative', border: `1px solid ${C.green}33`, borderRadius: 20, background: `radial-gradient(120% 140% at 50% 0%, ${C.green}12, ${C.deep} 60%)`, padding: 'clamp(30px,6vw,64px)', textAlign: 'center', overflow: 'hidden' }}>
          <span aria-hidden style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${C.green}, transparent)` }} />
          <Kicker><Activity size={13} /> ENTER THE MATRIX</Kicker>
          <h2 style={{ margin: '16px auto 0', maxWidth: 760, fontWeight: 850, letterSpacing: '-0.035em', lineHeight: 1.02, fontSize: 'clamp(2rem,5.5vw,3.6rem)' }}>
            Trade the <span style={{ color: C.green }}>information</span>, not the noise.
          </h2>
          <p style={{ margin: '16px auto 0', maxWidth: 580, color: C.dim, fontSize: 'clamp(1rem,1.7vw,1.15rem)', lineHeight: 1.55 }}>
            Free to download. Runs paper-first, shows its reasoning, and connects your own Kalshi account only when you choose to.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <DownloadApp />
            <NativeBtn onOpen={openModal} />
          </div>
          <p style={{ margin: '22px auto 0', maxWidth: 680, fontFamily: C.mono, fontSize: 10.5, lineHeight: 1.7, color: C.faint, letterSpacing: '0.03em' }}>
            Research and decision-support tool. Uses only public data via Kalshi&apos;s official API on your own account. Paper-trading by
            default; live orders require explicit confirmation. No profits are guaranteed — event contracts carry risk of total loss. No
            insider or non-public information is used or supported. You are responsible for compliance with Kalshi&apos;s Terms and applicable law.
          </p>
        </div>
      </section>

      {modalOS && <BetaModal os={modalOS} onClose={() => setModalOS(null)} />}
    </main>
  )
}

// ── download ──────────────────────────────────────────────────────────────────
function detectOS(): string {
  if (typeof navigator === 'undefined') return 'macOS'
  const s = `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
  return s.includes('win') ? 'Windows' : 'macOS'
}
function DownloadApp() {
  return (
    <a href={APP_FILE} download="Project-Matrix.html" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, textDecoration: 'none', background: C.green, color: C.bg, border: `1px solid ${C.green}`, borderRadius: 12, padding: '13px 20px', boxShadow: `0 0 26px ${C.green}44` }}>
      <Download size={20} style={{ flexShrink: 0 }} />
      <span style={{ textAlign: 'left' }}>
        <span style={{ display: 'block', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Download MATRIX</span>
        <span style={{ display: 'block', fontFamily: C.mono, fontSize: 10, letterSpacing: '0.06em', opacity: 0.85 }}>Standalone · macOS · Windows · Linux</span>
      </span>
    </a>
  )
}
function NativeBtn({ onOpen }: { onOpen: (os: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(detectOS())} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', background: C.panel, color: C.ink, border: `1px solid ${C.line}`, borderRadius: 12, padding: '13px 20px' }}>
      <Boxes size={20} style={{ flexShrink: 0, color: C.green }} />
      <span>
        <span style={{ display: 'block', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Full platform (beta)</span>
        <span style={{ display: 'block', fontFamily: C.mono, fontSize: 10, letterSpacing: '0.06em', opacity: 0.8 }}>agent cluster + signed installers · request access</span>
      </span>
    </button>
  )
}

// ── beta-access modal (real waitlist capture) ──────────────────────────────────
function BetaModal({ os, onClose }: { os: string; onClose: () => void }) {
  const [email, setEmail] = useState('')
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle')
  const [err, setErr] = useState('')
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return }
    setState('sending'); setErr('')
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), tickers: ['MATRIX'] }) })
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j.error || 'Something went wrong.') }
      setState('done')
    } catch (e) { setState('error'); setErr(e instanceof Error ? e.message : 'Something went wrong.') }
  }
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.72)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ position: 'relative', width: 'min(440px, 94vw)', background: C.bg, border: `1px solid ${C.green}33`, borderRadius: 16, padding: 'clamp(22px,4vw,30px)', boxShadow: `0 0 80px ${C.green}18`, overflow: 'hidden' }}>
        <span aria-hidden style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${C.green}, transparent)` }} />
        <button type="button" onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 12, right: 14, background: 'transparent', border: 'none', color: C.faint, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        {state === 'done' ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ display: 'inline-grid', placeItems: 'center', width: 52, height: 52, borderRadius: 14, background: `${C.green}16`, border: `1px solid ${C.green}44`, color: C.green, marginBottom: 14 }}><ShieldCheck size={26} /></div>
            <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800, color: C.ink }}>You&apos;re on the list.</h3>
            <p style={{ margin: 0, color: C.dim, fontSize: 14, lineHeight: 1.6 }}>We&apos;ll email your full-platform access + signed <b style={{ color: C.ink }}>{os}</b> build to <b style={{ color: C.green }}>{email}</b> when your slot opens.</p>
            <button type="button" onClick={onClose} style={{ marginTop: 20, fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.green, border: 'none', borderRadius: 9, padding: '11px 20px', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <Kicker><LockKeyhole size={13} /> Private beta · {os}</Kicker>
            <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Request full-platform access</h3>
            <p style={{ margin: '0 0 18px', color: C.dim, fontSize: 14, lineHeight: 1.55 }}>
              The standalone terminal is free to download now. The full MATRIX platform — the live agent cluster and signed
              <b style={{ color: C.ink }}> {os}</b> installers — is rolling out in a controlled private beta. Drop your email for a slot.
            </p>
            <input type="email" value={email} autoFocus onChange={(e) => { setEmail(e.target.value); if (err) setErr('') }} onKeyDown={(e) => { if (e.key === 'Enter') submit() }} placeholder="you@email.com"
              style={{ width: '100%', boxSizing: 'border-box', background: C.deep, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 10, color: C.ink, fontSize: 15, padding: '13px 15px', outline: 'none', fontFamily: C.sans }} />
            {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 8, fontFamily: C.mono }}>{err}</div>}
            <button type="button" onClick={submit} disabled={state === 'sending'} style={{ width: '100%', marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontWeight: 800, fontSize: 15, color: C.bg, background: C.green, border: 'none', borderRadius: 10, padding: '14px', cursor: state === 'sending' ? 'default' : 'pointer', opacity: state === 'sending' ? 0.7 : 1, boxShadow: `0 0 26px ${C.green}44` }}>
              <Download size={18} /> {state === 'sending' ? 'Requesting…' : 'Request access'}
            </button>
            <p style={{ margin: '12px 0 0', fontFamily: C.mono, fontSize: 10, color: C.faint, letterSpacing: '0.04em', textAlign: 'center' }}>No spam · unsubscribe anytime · keys stay on your device</p>
          </>
        )}
      </div>
    </div>
  )
}

function KalshiMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 34 34" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="32" height="32" rx="8" fill="#04140c" />
      <g fill={KAL_GREEN}><rect x="9" y="19" width="4" height="7" rx="1.5" /><rect x="15" y="13" width="4" height="13" rx="1.5" /><rect x="21" y="8" width="4" height="18" rx="1.5" /></g>
    </svg>
  )
}
