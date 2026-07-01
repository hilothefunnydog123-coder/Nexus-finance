'use client'

/**
 * YnKalshi Terminal — the downloadable Neural Execution Engine landing + spec.
 * Cyber-neural aesthetic: tactical graphite + bioluminescent green. The hero is a
 * live GPU-style neural hub on <canvas> that pulses and fires synaptic pings; the
 * page doubles as the exhaustive architecture spec. Reduced-motion safe.
 */
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import {
  Download, ArrowLeft, Cpu, Radar, Gauge, ShieldCheck, Lock,
  Zap, Gavel, Trophy, CloudLightning, Bitcoin, TrendingUp, Landmark, Activity,
  Crosshair, Network, Boxes, Signal, LockKeyhole, Waypoints, CircuitBoard,
  type LucideIcon,
} from 'lucide-react'

const KAL_GREEN = '#00d29f' // Kalshi brand mint

// ── palette ───────────────────────────────────────────────────────────────────
const C = {
  bg: '#0D0F12',
  deep: '#08090b',
  panel: 'rgba(255,255,255,.022)',
  line: 'rgba(120,255,170,.10)',
  ink: '#e9f5ee',
  dim: '#7f8c84',
  faint: '#4a564e',
  green: '#2be86a',     // matrix green
  lime: '#b6ff3a',      // electric lime
  emerald: '#10d98a',   // emerald
  red: '#ff5a6a',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}

function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setR(mq.matches)
    const on = () => setR(mq.matches)
    mq.addEventListener?.('change', on)
    return () => mq.removeEventListener?.('change', on)
  }, [])
  return r
}

// deterministic PRNG so SSR + client agree
function mulberry32(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ════════════════════════════════════════════════════════════════════════════
// THE NEURAL HUB — canvas brain: nodes pulse, edges glow, synaptic pings travel,
// lobes flare when "insane data" is ingested.
// ════════════════════════════════════════════════════════════════════════════
function NeuralHub({ height = 420 }: { height?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const reduced = useReducedMotion()

  useEffect(() => {
    const cv = ref.current
    if (!cv) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const rng = mulberry32(1337)

    let W = 0, H = 0, dpr = 1
    type Node = { x: number; y: number; r: number; base: number; lobe: number; phase: number }
    let nodes: Node[] = []
    let edges: [number, number][] = []

    // brain silhouette: two elliptical lobes + a stem, nodes scattered inside.
    function inBrain(nx: number, ny: number): number {
      // nx,ny in [-1,1]. Return lobe id (0/1) if inside, else -1.
      const yy = ny * 1.15
      const L = ((nx + 0.42) / 0.62) ** 2 + (yy / 0.92) ** 2
      const R = ((nx - 0.42) / 0.62) ** 2 + (yy / 0.92) ** 2
      if (L < 1) return 0
      if (R < 1) return 1
      return -1
    }

    function build() {
      const rect = cv!.getBoundingClientRect()
      dpr = Math.min(2, window.devicePixelRatio || 1)
      W = rect.width; H = rect.height
      cv!.width = Math.floor(W * dpr); cv!.height = Math.floor(H * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      const cx = W / 2, cy = H / 2
      const scale = Math.min(W, H) * 0.46
      nodes = []
      let guard = 0
      while (nodes.length < 46 && guard < 4000) {
        guard++
        const nx = rng() * 2 - 1
        const ny = rng() * 2 - 1
        const lobe = inBrain(nx, ny)
        if (lobe < 0) continue
        nodes.push({
          x: cx + nx * scale, y: cy + ny * scale * 0.92,
          r: 1.4 + rng() * 2.6, base: 0.35 + rng() * 0.4, lobe, phase: rng() * Math.PI * 2,
        })
      }
      // connect near neighbors
      edges = []
      for (let i = 0; i < nodes.length; i++) {
        const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 }))
          .filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 3)
        for (const o of d) if (o.j > i) edges.push([i, o.j])
      }
    }
    build()

    type Ping = { e: number; t: number; sp: number; hue: number }
    let pings: Ping[] = []
    type Flare = { lobe: number; t: number }
    let flares: Flare[] = []

    let raf = 0
    let last = 0
    let acc = 0
    let frame = 0

    function spawnPing() {
      if (edges.length === 0) return
      const e = Math.floor(rng() * edges.length)
      pings.push({ e, t: 0, sp: 0.012 + rng() * 0.03, hue: rng() })
    }
    function spawnFlare() { flares.push({ lobe: rng() > 0.5 ? 0 : 1, t: 0 }) }

    function draw(now: number) {
      frame++
      if (!last) last = now
      const dt = Math.min(48, now - last); last = now
      acc += dt

      ctx!.clearRect(0, 0, W, H)

      // ambient glow
      const g = ctx!.createRadialGradient(W / 2, H / 2, 10, W / 2, H / 2, Math.max(W, H) * 0.6)
      g.addColorStop(0, 'rgba(43,232,106,0.05)')
      g.addColorStop(1, 'rgba(13,15,18,0)')
      ctx!.fillStyle = g
      ctx!.fillRect(0, 0, W, H)

      // periodic events
      if (!reduced) {
        if (acc > 240) { acc = 0; if (rng() > 0.35) spawnPing() ; if (rng() > 0.92) spawnFlare() }
      }

      // flares (lobe brighten)
      flares = flares.filter((f) => { f.t += dt / 900; return f.t < 1 })

      // edges
      for (const [a, b] of edges) {
        const na = nodes[a], nb = nodes[b]
        ctx!.strokeStyle = `rgba(120,255,170,${0.05 + 0.03 * Math.sin(frame / 40 + a)})`
        ctx!.lineWidth = 1
        ctx!.beginPath(); ctx!.moveTo(na.x, na.y); ctx!.lineTo(nb.x, nb.y); ctx!.stroke()
      }

      // pings traveling edges
      pings = pings.filter((p) => {
        p.t += reduced ? 0 : p.sp * (dt / 16)
        if (p.t >= 1) return false
        const [a, b] = edges[p.e]
        const na = nodes[a], nb = nodes[b]
        const x = na.x + (nb.x - na.x) * p.t
        const y = na.y + (nb.y - na.y) * p.t
        const col = p.hue > 0.6 ? '182,255,58' : '43,232,106'
        ctx!.fillStyle = `rgba(${col},0.95)`
        ctx!.shadowColor = `rgba(${col},0.9)`; ctx!.shadowBlur = 12
        ctx!.beginPath(); ctx!.arc(x, y, 2.4, 0, Math.PI * 2); ctx!.fill()
        ctx!.shadowBlur = 0
        return true
      })

      // nodes
      for (const n of nodes) {
        const lobeFlare = flares.reduce((m, f) => f.lobe === n.lobe ? Math.max(m, Math.sin(f.t * Math.PI)) : m, 0)
        const pulse = reduced ? n.base : n.base + 0.35 * (0.5 + 0.5 * Math.sin(frame / 22 + n.phase))
        const a = Math.min(1, pulse + lobeFlare * 0.7)
        const rr = n.r * (1 + lobeFlare * 0.9)
        ctx!.fillStyle = `rgba(200,255,220,${a})`
        ctx!.shadowColor = `rgba(43,232,106,${a})`; ctx!.shadowBlur = 8 + lobeFlare * 22
        ctx!.beginPath(); ctx!.arc(n.x, n.y, rr, 0, Math.PI * 2); ctx!.fill()
        ctx!.shadowBlur = 0
      }

      if (!reduced) raf = requestAnimationFrame(draw)
    }

    if (reduced) { draw(0) } else { raf = requestAnimationFrame(draw) }
    const onResize = () => build()
    window.addEventListener('resize', onResize)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize) }
  }, [reduced])

  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
      {/* HUD ring */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: 'grid', placeItems: 'center' }}>
        <div style={{ width: 'min(78%, 360px)', aspectRatio: '1', borderRadius: '50%', border: `1px solid ${C.green}22`, boxShadow: `inset 0 0 60px ${C.green}0e` }} />
      </div>
      <div style={{ position: 'absolute', left: 14, top: 12, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.18em', color: C.green, textTransform: 'uppercase' }}>
        ◉ CORTEX ONLINE
      </div>
      <div style={{ position: 'absolute', right: 14, top: 12, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.12em', color: C.dim }}>
        1.2M events/s · 3.4ms mean
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════════════════
// LIVE SYNAPTIC FEED — the transaction ledger. Category-coded rows stream in.
// ════════════════════════════════════════════════════════════════════════════
type Cat = { icon: LucideIcon; label: string; color: string }
const CATS: Record<string, Cat> = {
  energy: { icon: Zap, label: 'MACRO · ENERGY', color: '#b6ff3a' },
  sports: { icon: Trophy, label: 'SPORTS', color: '#2be86a' },
  politics: { icon: Gavel, label: 'POLITICS', color: '#8bffd0' },
  weather: { icon: CloudLightning, label: 'WEATHER', color: '#5cf2ff' },
  crypto: { icon: Bitcoin, label: 'CRYPTO', color: '#ffd23a' },
  macro: { icon: Landmark, label: 'MACRO · RATES', color: '#10d98a' },
  equity: { icon: TrendingUp, label: 'EQUITY INDEX', color: '#7dffb0' },
}
const FEED: { cat: keyof typeof CATS; market: string; edge: string; prob: number; act: string }[] = [
  { cat: 'sports', market: 'Lakers ML vs Celtics', edge: '+7.2', prob: 63, act: 'FILLED · YES 41¢' },
  { cat: 'energy', market: 'WTI settles > $82 Fri', edge: '+11.4', prob: 71, act: 'ROUTING…' },
  { cat: 'weather', market: 'NYC high ≥ 92°F', edge: '+5.9', prob: 58, act: 'FILLED · NO 63¢' },
  { cat: 'politics', market: 'Rate cut before Sept FOMC', edge: '+8.1', prob: 66, act: 'PROFIT-LOCK ARMED' },
  { cat: 'crypto', market: 'BTC close > $70k today', edge: '+9.7', prob: 74, act: 'FILLED · YES 55¢' },
  { cat: 'macro', market: 'CPI prints ≤ 3.1%', edge: '+6.3', prob: 61, act: 'EXIT @ PEAK +14%' },
  { cat: 'equity', market: 'S&P closes green', edge: '+4.8', prob: 57, act: 'FILLED · YES 52¢' },
  { cat: 'sports', market: 'Chiefs -3.5 cover', edge: '+10.2', prob: 69, act: 'ROUTING…' },
]
function LiveFeed() {
  const reduced = useReducedMotion()
  const [rows, setRows] = useState(() => FEED.slice(0, 5))
  const idx = useRef(5)
  useEffect(() => {
    if (reduced) return
    const t = setInterval(() => {
      const next = FEED[idx.current % FEED.length]; idx.current++
      setRows((r) => [next, ...r].slice(0, 6))
    }, 2200)
    return () => clearInterval(t)
  }, [reduced])
  return (
    <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.deep, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', borderBottom: `1px solid ${C.line}`, fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.dim }}>
        <Signal size={13} style={{ color: C.green }} /> synaptic ledger · live
        <span style={{ marginLeft: 'auto', color: C.green }}>▲ streaming</span>
      </div>
      <div>
        {rows.map((r, i) => {
          const cat = CATS[r.cat]
          const Icon = cat.icon
          return (
            <div key={`${r.market}-${i}`} style={{ display: 'grid', gridTemplateColumns: '30px 1fr auto', gap: 12, alignItems: 'center', padding: '12px 14px', borderBottom: `1px solid ${C.line}`, animation: reduced ? 'none' : 'ynk-feed .5s cubic-bezier(.16,1,.3,1) both' }}>
              <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: `${cat.color}14`, border: `1px solid ${cat.color}40`, color: cat.color }}>
                <Icon size={15} />
              </span>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 13.5, fontWeight: 650, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.market}</span>
                <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', color: cat.color }}>{cat.label}</span>
              </span>
              <span style={{ textAlign: 'right' }}>
                <span style={{ display: 'block', fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{r.prob}%</span>
                <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.06em', color: r.act.includes('ROUTING') ? C.lime : r.act.includes('PEAK') || r.act.includes('LOCK') ? C.emerald : C.dim }}>{r.edge}pt · {r.act}</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── small primitives ──────────────────────────────────────────────────────────
function Kicker({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.green }}>{children}</div>
}
function SpecCard({ icon: Icon, title, children, spec }: { icon: LucideIcon; title: string; children: React.ReactNode; spec?: [string, string][] }) {
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 14, padding: 'clamp(18px,3vw,26px)', position: 'relative', overflow: 'hidden' }}>
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg, transparent, ${C.green}55, transparent)` }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 11, background: `${C.green}12`, border: `1px solid ${C.green}33`, color: C.green, marginBottom: 14 }}>
        <Icon size={21} />
      </div>
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
function SectionHead({ n, kicker, title, blurb }: { n: string; kicker: string; title: string; blurb: string }) {
  return (
    <div style={{ maxWidth: 780, marginBottom: 'clamp(24px,4vw,40px)' }}>
      <Kicker><span style={{ color: C.faint }}>{n}</span> {kicker}</Kicker>
      <h2 style={{ margin: '14px 0 0', fontFamily: C.sans, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.04, fontSize: 'clamp(1.8rem,4.5vw,3rem)', color: C.ink }}>{title}</h2>
      <p style={{ margin: '14px 0 0', color: C.dim, fontSize: 'clamp(1rem,1.6vw,1.12rem)', lineHeight: 1.6 }}>{blurb}</p>
    </div>
  )
}

// ── the execution pipeline steps ───────────────────────────────────────────────
const PIPELINE: { icon: LucideIcon; t: string; d: string; ms: string }[] = [
  { icon: Radar, t: 'Ingest', d: 'Public feeds — exchange APIs, published weather, sportsbook line moves, PACER dockets, EDGAR/FEC filings — normalize into a unified event bus.', ms: 't+0.0ms' },
  { icon: Cpu, t: 'Infer', d: 'The neural core re-prices the affected Kalshi contract, computes edge vs the live book, and fires a synaptic ping the instant it clears threshold.', ms: 't+2.1ms' },
  { icon: Crosshair, t: 'Size', d: 'Half-Kelly stake from your bankroll, clamped by your per-market + daily risk limits. Rejected if edge, confidence, or liquidity fail the gates.', ms: 't+2.4ms' },
  { icon: Zap, t: 'Route', d: 'Limit order submitted through Kalshi’s official REST/WebSocket API on a warm keep-alive socket — first in line to react as the book re-rates.', ms: 't+3.4ms' },
  { icon: Gauge, t: 'Monitor', d: 'Position velocity + order-book depth streamed live; the model tracks the momentum swing and marks the mathematical peak in real time.', ms: 'live' },
  { icon: LockKeyhole, t: 'Profit-Lock', d: 'Auto-exit at peak momentum (or a hard stop / time-decay floor). Trailing logic never lets a green ticket bleed back to red.', ms: 'auto' },
]

// ════════════════════════════════════════════════════════════════════════════
export default function TerminalClient() {
  const reduced = useReducedMotion()
  const [modalOS, setModalOS] = useState<string | null>(null)
  const openModal = (os: string) => setModalOS(os)
  return (
    <main style={{ background: C.bg, color: C.ink, minHeight: '100vh', fontFamily: C.sans, overflowX: 'hidden' }}>
      <style>{`
        @keyframes ynk-feed { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: none } }
        @keyframes ynk-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
        @keyframes ynk-scan { 0%{transform:translateY(-100%)} 100%{transform:translateY(2000%)} }
        .ynk-grid2 { display:grid; grid-template-columns: 1.05fr .95fr; gap: clamp(24px,4vw,56px); align-items:center }
        @media (max-width: 900px){ .ynk-grid2 { grid-template-columns: 1fr } }
      `}</style>

      {/* top bar */}
      <div style={{ position: 'sticky', top: 0, zIndex: 20, backdropFilter: 'blur(12px)', background: 'rgba(13,15,18,.72)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1240, margin: '0 auto', padding: '12px clamp(16px,3vw,28px)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: C.mono, fontSize: 11.5, letterSpacing: '0.1em', color: C.dim, textDecoration: 'none' }}>
            <ArrowLeft size={14} /> YN FINANCE
          </Link>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginLeft: 6, fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.06em', color: C.ink }}>
            <CircuitBoard size={16} style={{ color: C.green }} /> YnKalshi<span style={{ color: C.green }}>Terminal</span>
          </span>
          <div style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10 }}>
            <button type="button" onClick={() => openModal(detectOS())} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: C.mono, fontSize: 11.5, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.green, padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', boxShadow: `0 0 22px ${C.green}44` }}>
              <Download size={14} /> Download
            </button>
          </div>
        </div>
      </div>

      {/* HERO */}
      <section style={{ position: 'relative', maxWidth: 1240, margin: '0 auto', padding: 'clamp(28px,5vw,64px) clamp(16px,3vw,28px) clamp(20px,4vw,40px)' }}>
        <div className="ynk-grid2">
          <div>
            <Kicker><span style={{ width: 7, height: 7, borderRadius: 9, background: C.green, boxShadow: `0 0 10px ${C.green}` }} /> NEURAL EXECUTION ENGINE · v1.0</Kicker>
            <h1 style={{ margin: '18px 0 0', fontWeight: 850, letterSpacing: '-0.04em', lineHeight: 0.98, fontSize: 'clamp(2.6rem,7vw,5rem)' }}>
              Be first to<br />the <span style={{ color: 'transparent', background: `linear-gradient(100deg, ${C.green}, ${C.lime})`, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>signal.</span>
            </h1>
            <p style={{ margin: '18px 0 0', maxWidth: 520, color: C.dim, fontSize: 'clamp(1.02rem,1.8vw,1.22rem)', lineHeight: 1.55 }}>
              A native macOS &amp; Windows terminal that ingests <b style={{ color: C.ink }}>public</b> data feeds in real time,
              re-prices every Kalshi market in <b style={{ color: C.green }}>single-digit milliseconds</b>, and auto-executes
              through Kalshi&apos;s official API — reacting to the news before slower, browser-bound traders can even refresh.
            </p>
            <div id="download" style={{ marginTop: 'clamp(22px,3vw,30px)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <DownloadBtn os="macOS" sub="Apple Silicon · Universal" onOpen={openModal} />
              <DownloadBtn os="Windows" sub="x64 · 10/11" onOpen={openModal} />
            </div>
            <div style={{ marginTop: 16, display: 'flex', gap: 18, flexWrap: 'wrap', fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.08em', color: C.faint }}>
              <span><ShieldCheck size={12} style={{ color: C.emerald, verticalAlign: '-2px' }} /> Notarized &amp; code-signed</span>
              <span><Lock size={12} style={{ color: C.emerald, verticalAlign: '-2px' }} /> Keys stay in your OS keychain</span>
            </div>
          </div>
          <div style={{ position: 'relative', border: `1px solid ${C.line}`, borderRadius: 18, background: `radial-gradient(120% 90% at 50% 0%, ${C.green}0a, ${C.deep} 60%)`, padding: 6, boxShadow: `0 0 80px ${C.green}12` }}>
            <NeuralHub height={reduced ? 320 : 420} />
            <div style={{ padding: '10px 14px 4px' }}><LiveFeedMini /></div>
          </div>
        </div>
      </section>

      {/* metrics strip */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: '0 clamp(16px,3vw,28px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 12, overflow: 'hidden' }}>
          {[['3.4 ms', 'signal → order round-trip'], ['1.2M/s', 'events ingested'], ['24', 'public data adapters'], ['½-Kelly', 'disciplined sizing'], ['99.98%', 'socket uptime']].map(([v, k]) => (
            <div key={k} style={{ background: C.bg, padding: 'clamp(14px,2vw,20px)' }}>
              <div style={{ fontFamily: C.mono, fontSize: 'clamp(1.1rem,2.4vw,1.6rem)', fontWeight: 800, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
              <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginTop: 5 }}>{k}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── 1 · ARCHITECTURE ─────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="01 /" kicker="Architecture & UI shell"
          title="A native cockpit rendered on the GPU."
          blurb="The browser is the bottleneck. The Terminal ships as a native shell — a Rust + Tauri core driving a wgpu/WebGL2 render layer — so the interface repaints on the compositor thread and never blocks on the network. Every millisecond you don't spend in a DOM reflow is a millisecond of edge." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <SpecCard icon={Boxes} title="Native shell, not a web tab" spec={[['Core', 'Rust + Tauri'], ['Render', 'wgpu / WebGL2'], ['IPC', 'zero-copy ring buffer']]}>
            A ~9&nbsp;MB signed binary. The data plane (ingest, inference, order routing) runs in native Rust threads; the UI is a GPU surface that subscribes to a lock-free ring buffer, so market state and paint are fully decoupled.
          </SpecCard>
          <SpecCard icon={Gauge} title="Sub-frame rendering" spec={[['Paint budget', '≤ 4 ms'], ['Feed', '120 fps capable'], ['Data grid', 'virtualized']]}>
            Panels are windowed and virtualized; only visible rows touch the GPU. The synaptic ledger can stream thousands of rows/second without dropping a frame.
          </SpecCard>
          <SpecCard icon={Network} title="Dockable workspace" spec={[['Panels', 'tear-off / multi-monitor'], ['Layouts', 'saved profiles'], ['Mode', 'always-on-top HUD']]}>
            Rip the Neural Hub, ledger, positions, and order tickets into independent OS windows across monitors. A compact always-on-top HUD keeps the pulse in your peripheral vision while you work elsewhere.
          </SpecCard>
        </div>
      </section>

      {/* ── 2 · NEURAL ENGINE ────────────────────────────────────────────── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="02 /" kicker="The 3D neural engine"
          title="The brain shows you velocity before the number does."
          blurb="The hero widget is a live particle-simulated cortex — not a looping GIF. Every node is a live sub-model; every edge is a data path. Its behavior is a direct read-out of how fast the world is changing." />
        <div className="ynk-grid2">
          <div style={{ border: `1px solid ${C.line}`, borderRadius: 16, background: C.deep, padding: 6, boxShadow: `0 0 60px ${C.green}10` }}>
            <NeuralHub height={reduced ? 300 : 380} />
          </div>
          <div style={{ display: 'grid', gap: 14 }}>
            {[
              ['Idle pulse', 'A slow, breathing bioluminescence — the cortex is calm, the book is efficient, no edge on the wire.'],
              ['Synaptic ping', 'A single node fires and a green particle races down an edge the instant one adapter detects a shift. One ping = one candidate signal.'],
              ['Lobe flare', 'When a burst of correlated data lands (a weather revision + a line move on the same game), an entire lobe flares white-green — a high-conviction cluster.'],
              ['Overdrive', 'On macro prints (CPI, FOMC, jobs) the whole cortex saturates and pings cascade — you feel the volatility physically, seconds before the ledger fills.'],
            ].map(([t, d]) => (
              <div key={t} style={{ display: 'flex', gap: 12, padding: '13px 15px', border: `1px solid ${C.line}`, borderRadius: 11, background: C.panel }}>
                <span style={{ width: 9, height: 9, borderRadius: 9, background: C.green, boxShadow: `0 0 12px ${C.green}`, marginTop: 5, flexShrink: 0 }} />
                <span><b style={{ color: C.ink, fontSize: 14 }}>{t}</b><span style={{ display: 'block', color: C.dim, fontSize: 13.5, lineHeight: 1.55, marginTop: 3 }}>{d}</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 3 · LEDGER & CATEGORY SYSTEM ─────────────────────────────────── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="03 /" kicker="Transaction ledger & category system"
          title="Every signal, tagged, color-coded, and legible at a glance."
          blurb="The ledger is engineered for high-stress reading. Monospaced numerics lock into tabular columns; a single hyper-clean glyph and a category hue tell you what domain fired before you read a word." />
        <div className="ynk-grid2">
          <LiveFeed />
          <div>
            <div style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.faint, marginBottom: 12 }}>Category glyph system</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10 }}>
              {Object.values(CATS).map((c) => {
                const Icon = c.icon
                return (
                  <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: `1px solid ${c.color}30`, borderRadius: 10, background: `${c.color}0c` }}>
                    <span style={{ display: 'grid', placeItems: 'center', width: 30, height: 30, borderRadius: 8, background: `${c.color}18`, color: c.color }}><Icon size={15} /></span>
                    <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.06em', color: c.color }}>{c.label}</span>
                  </div>
                )
              })}
            </div>
            <div style={{ marginTop: 16, padding: '14px 16px', border: `1px solid ${C.line}`, borderRadius: 11, background: C.panel, color: C.dim, fontSize: 13.5, lineHeight: 1.6 }}>
              <b style={{ color: C.ink }}>Row anatomy:</b> glyph → market title → live probability (big, mono, tabular) → edge in points → execution state.
              States color-shift live: <span style={{ color: C.lime }}>ROUTING</span> (amber-lime), <span style={{ color: C.dim }}>FILLED</span> (neutral),
              <span style={{ color: C.emerald }}> PROFIT-LOCK / EXIT@PEAK</span> (emerald). One glance, full picture.
            </div>
          </div>
        </div>
      </section>

      {/* ── 4 · EXECUTION PROTOCOL ───────────────────────────────────────── */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(48px,7vw,96px) clamp(16px,3vw,28px) 0' }}>
        <SectionHead n="04 /" kicker="Automation & execution protocol"
          title="Signal to fill to profit-lock — hands off the wheel."
          blurb="Arm a strategy, set your risk envelope, and the loop runs itself. Six deterministic stages, each timestamped, each fully auditable in the trade journal." />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: 14 }}>
          {PIPELINE.map((s, i) => {
            const Icon = s.icon
            return (
              <div key={s.t} style={{ position: 'relative', border: `1px solid ${C.line}`, borderRadius: 13, background: C.panel, padding: '18px 16px' }}>
                <span style={{ position: 'absolute', top: 14, right: 14, fontFamily: C.mono, fontSize: 10, color: C.faint }}>{s.ms}</span>
                <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 10, background: `${C.green}12`, border: `1px solid ${C.green}30`, color: C.green, marginBottom: 12 }}><Icon size={19} /></div>
                <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.14em', color: C.green, marginBottom: 4 }}>STAGE {String(i + 1).padStart(2, '0')}</div>
                <h4 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 750, color: C.ink }}>{s.t}</h4>
                <p style={{ margin: 0, color: C.dim, fontSize: 13, lineHeight: 1.55 }}>{s.d}</p>
              </div>
            )
          })}
        </div>

        {/* Kalshi gateway */}
        <div style={{ marginTop: 'clamp(24px,4vw,36px)', border: `1px solid ${KAL_GREEN}44`, borderRadius: 16, background: `linear-gradient(140deg, ${KAL_GREEN}0e, ${C.deep} 55%)`, padding: 'clamp(20px,3.5vw,34px)' }}>
          <div className="ynk-grid2">
            <div>
              <Kicker><Waypoints size={13} /> OFFICIAL KALSHI GATEWAY</Kicker>
              <h3 style={{ margin: '12px 0 0', fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Connect once. Trade on your own account.</h3>
              <p style={{ margin: '12px 0 0', color: C.dim, fontSize: 14.5, lineHeight: 1.6, maxWidth: 460 }}>
                Sign in through Kalshi&apos;s official API-key / OAuth handshake. Your credentials are sealed in the OS keychain
                (Keychain / DPAPI) and never touch our servers. The Terminal signs each request locally and routes it straight to
                Kalshi — you stay the account holder, always inside Kalshi&apos;s Terms of Service and rate limits.
              </p>
              <div style={{ marginTop: 18, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                <button type="button" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontFamily: C.sans, fontWeight: 800, fontSize: 15, color: '#04140c', background: KAL_GREEN, border: 'none', padding: '13px 22px', borderRadius: 10, cursor: 'pointer', boxShadow: `0 0 26px ${KAL_GREEN}55` }}>
                  <KalshiMark /> Sign in with Kalshi
                </button>
                <span style={{ fontFamily: C.mono, fontSize: 10.5, color: C.faint, letterSpacing: '0.06em' }}><LockKeyhole size={12} style={{ verticalAlign: '-2px', color: KAL_GREEN }} /> encrypted · local-only</span>
              </div>
            </div>
            <div style={{ border: `1px solid ${C.line}`, borderRadius: 12, background: C.deep, padding: 16, fontFamily: C.mono, fontSize: 12.5, color: C.dim, lineHeight: 1.9 }}>
              <div style={{ color: C.faint, marginBottom: 6 }}>// handshake</div>
              <div><span style={{ color: C.green }}>POST</span> /trade-api/v2/login</div>
              <div><span style={{ color: KAL_GREEN }}>200 OK</span> · session bound to device</div>
              <div style={{ color: C.faint, margin: '10px 0 6px' }}>// order (RSA-signed, local)</div>
              <div><span style={{ color: C.green }}>POST</span> /portfolio/orders</div>
              <div>type <span style={{ color: C.lime }}>limit</span> · tif <span style={{ color: C.lime }}>ioc</span> · side <span style={{ color: C.lime }}>yes</span></div>
              <div><span style={{ color: C.emerald }}>filled</span> 41¢ × 240 · lock armed</div>
            </div>
          </div>
        </div>

        {/* profit-lock detail */}
        <div style={{ marginTop: 'clamp(24px,4vw,36px)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
          <SpecCard icon={Zap} title="Pre-move reaction, not front-running" spec={[['Trigger', 'public data delta'], ['Order', 'limit · IOC'], ['Edge gate', 'must clear thresholds']]}>
            When a public feed moves, the Terminal re-rates the contract and submits a resting limit order on a warm socket — so you&apos;re
            first in the queue to react as the book catches up. It reads only public information; it never sees or trades ahead of another
            participant&apos;s order.
          </SpecCard>
          <SpecCard icon={LockKeyhole} title="The Profit-Lock exit" spec={[['Signal', 'momentum velocity'], ['Exit', 'peak / trail / stop'], ['Floor', 'time-decay guard']]}>
            The model tracks the position&apos;s velocity and order-book pressure and closes at the peak of the momentum swing — with a
            trailing lock so a winner can&apos;t round-trip to a loser, and a time-decay floor so nothing rots into settlement by accident.
          </SpecCard>
          <SpecCard icon={ShieldCheck} title="Risk envelope & kill-switch" spec={[['Sizing', 'half-Kelly, capped'], ['Limits', 'per-market + daily'], ['Panic', 'global flatten hotkey']]}>
            Hard caps on stake, per-market exposure, and daily loss. A single kill-switch flattens every open position and disarms every
            strategy instantly. You define the envelope; the automation cannot exceed it.
          </SpecCard>
        </div>
      </section>

      {/* DOWNLOAD CTA */}
      <section style={{ maxWidth: 1240, margin: '0 auto', padding: 'clamp(56px,8vw,110px) clamp(16px,3vw,28px)' }}>
        <div style={{ position: 'relative', border: `1px solid ${C.green}33`, borderRadius: 20, background: `radial-gradient(120% 140% at 50% 0%, ${C.green}12, ${C.deep} 60%)`, padding: 'clamp(30px,6vw,64px)', textAlign: 'center', overflow: 'hidden' }}>
          <span aria-hidden style={{ position: 'absolute', top: 0, left: '20%', right: '20%', height: 1, background: `linear-gradient(90deg, transparent, ${C.green}, transparent)` }} />
          <Kicker><Activity size={13} /> ARM THE ENGINE</Kicker>
          <h2 style={{ margin: '16px auto 0', maxWidth: 720, fontWeight: 850, letterSpacing: '-0.035em', lineHeight: 1.02, fontSize: 'clamp(2rem,5.5vw,3.6rem)' }}>
            Stop refreshing. Start <span style={{ color: C.green }}>front-running the refresh.</span>
          </h2>
          <p style={{ margin: '16px auto 0', maxWidth: 560, color: C.dim, fontSize: 'clamp(1rem,1.7vw,1.15rem)', lineHeight: 1.55 }}>
            Free to download. Connect your own Kalshi account, set your risk, and let the cortex work the tape.
          </p>
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <DownloadBtn os="macOS" sub="Apple Silicon · Universal" onOpen={openModal} />
            <DownloadBtn os="Windows" sub="x64 · 10/11" onOpen={openModal} />
          </div>
          <p style={{ margin: '22px auto 0', maxWidth: 640, fontFamily: C.mono, fontSize: 10.5, lineHeight: 1.7, color: C.faint, letterSpacing: '0.03em' }}>
            Trades only public data through Kalshi&apos;s official API on your own account. Not financial advice; event contracts carry risk of
            total loss. You are responsible for compliance with Kalshi&apos;s Terms and applicable law. No insider or non-public information is
            used, sourced, or supported.
          </p>
        </div>
      </section>
      {modalOS && <BetaModal os={modalOS} onClose={() => setModalOS(null)} />}
    </main>
  )
}

// ── download button ────────────────────────────────────────────────────────────
function detectOS(): string {
  if (typeof navigator === 'undefined') return 'macOS'
  const s = `${navigator.platform} ${navigator.userAgent}`.toLowerCase()
  if (s.includes('win')) return 'Windows'
  return 'macOS'
}
function DownloadBtn({ os, sub, onOpen }: { os: string; sub: string; onOpen: (os: string) => void }) {
  const primary = os === 'macOS'
  return (
    <button type="button" onClick={() => onOpen(os)} style={{ display: 'inline-flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', background: primary ? C.green : C.panel, color: primary ? C.bg : C.ink, border: `1px solid ${primary ? C.green : C.line}`, borderRadius: 12, padding: '13px 20px', boxShadow: primary ? `0 0 26px ${C.green}44` : 'none' }}>
      <Download size={20} style={{ flexShrink: 0 }} />
      <span>
        <span style={{ display: 'block', fontWeight: 800, fontSize: 15, letterSpacing: '-0.01em' }}>Download for {os}</span>
        <span style={{ display: 'block', fontFamily: C.mono, fontSize: 10, letterSpacing: '0.06em', opacity: 0.8 }}>{sub}</span>
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
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  async function submit() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setErr('Enter a valid email.'); return }
    setState('sending'); setErr('')
    try {
      const res = await fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: email.trim(), tickers: ['TERMINAL'] }) })
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
            <p style={{ margin: 0, color: C.dim, fontSize: 14, lineHeight: 1.6 }}>We&apos;ll email your <b style={{ color: C.ink }}>{os}</b> build link the moment the private beta opens. Keep an eye on <b style={{ color: C.green }}>{email}</b>.</p>
            <button type="button" onClick={onClose} style={{ marginTop: 20, fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.bg, background: C.green, border: 'none', borderRadius: 9, padding: '11px 20px', cursor: 'pointer' }}>Done</button>
          </div>
        ) : (
          <>
            <Kicker><LockKeyhole size={13} /> Private beta · {os}</Kicker>
            <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Request early access</h3>
            <p style={{ margin: '0 0 18px', color: C.dim, fontSize: 14, lineHeight: 1.55 }}>
              The Terminal is rolling out in a controlled private beta. Drop your email and we&apos;ll send your signed
              <b style={{ color: C.ink }}> {os}</b> build + activation key as soon as your slot opens.
            </p>
            <input
              type="email" value={email} autoFocus
              onChange={(e) => { setEmail(e.target.value); if (err) setErr('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') submit() }}
              placeholder="you@email.com"
              style={{ width: '100%', boxSizing: 'border-box', background: C.deep, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 10, color: C.ink, fontSize: 15, padding: '13px 15px', outline: 'none', fontFamily: C.sans }}
            />
            {err && <div style={{ color: C.red, fontSize: 12.5, marginTop: 8, fontFamily: C.mono }}>{err}</div>}
            <button type="button" onClick={submit} disabled={state === 'sending'} style={{ width: '100%', marginTop: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 9, fontWeight: 800, fontSize: 15, color: C.bg, background: C.green, border: 'none', borderRadius: 10, padding: '14px', cursor: state === 'sending' ? 'default' : 'pointer', opacity: state === 'sending' ? 0.7 : 1, boxShadow: `0 0 26px ${C.green}44` }}>
              <Download size={18} /> {state === 'sending' ? 'Requesting…' : 'Get my beta build'}
            </button>
            <p style={{ margin: '12px 0 0', fontFamily: C.mono, fontSize: 10, color: C.faint, letterSpacing: '0.04em', textAlign: 'center' }}>No spam · unsubscribe anytime · keys stay on your device</p>
          </>
        )}
      </div>
    </div>
  )
}

// mini feed under the hero brain
function LiveFeedMini() {
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {[['sports', 'Chiefs -3.5 cover', 69], ['energy', 'WTI > $82 Fri', 71], ['crypto', 'BTC > $70k today', 74]].map(([c, m, p], i) => {
        const cat = CATS[c as keyof typeof CATS]; const Icon = cat.icon
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontFamily: C.mono, fontSize: 11.5 }}>
            <Icon size={13} style={{ color: cat.color, flexShrink: 0 }} />
            <span style={{ color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m as string}</span>
            <span style={{ marginLeft: 'auto', color: C.green, fontWeight: 800 }}>{p as number}%</span>
            <span style={{ color: C.faint }}>ping</span>
          </div>
        )
      })}
    </div>
  )
}

// Kalshi brand mark (inline)
function KalshiMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 34 34" aria-hidden style={{ flexShrink: 0 }}>
      <rect x="1" y="1" width="32" height="32" rx="8" fill="#04140c" />
      <g fill={KAL_GREEN}>
        <rect x="9" y="19" width="4" height="7" rx="1.5" />
        <rect x="15" y="13" width="4" height="13" rx="1.5" />
        <rect x="21" y="8" width="4" height="18" rx="1.5" />
      </g>
    </svg>
  )
}
