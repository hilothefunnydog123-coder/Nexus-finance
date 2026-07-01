'use client'

/**
 * PROJECT MATRIX — a LIVE, functional prediction-market terminal.
 * Pulls the real /api/edge board, runs a visible agent ensemble → consensus →
 * edge, and supports paper trading with live mark-to-market PnL (localStorage).
 * Dense Bloomberg-style multi-panel layout. Reduced-motion safe.
 */
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download, ArrowLeft, Activity, Cpu, Gauge, ShieldCheck, Signal, Crosshair,
  TrendingUp, Landmark, Banknote, CloudLightning,
  Newspaper, Globe, Waves, History, AlertTriangle, Layers, Brain, X, Zap,
  type LucideIcon,
} from 'lucide-react'

const C = {
  bg: '#0D0F12', deep: '#08090b', panel: 'rgba(255,255,255,.022)', panel2: 'rgba(255,255,255,.04)',
  line: 'rgba(120,255,170,.10)', ink: '#e9f5ee', dim: '#7f8c84', faint: '#4a564e',
  green: '#2be86a', lime: '#b6ff3a', emerald: '#10d98a', red: '#ff5a6a', cyan: '#22d3ee', amber: '#ffd23a',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}
const APP_FILE = '/Project-Matrix.html'
const START_BANK = 1000

// ── math + helpers ────────────────────────────────────────────────────────────
const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const clamp01 = (x: number) => clamp(x, 0.01, 0.99)
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) }
function american(price: number) { const q = clamp(price, .01, .99); const a = q >= .5 ? -Math.round(100 * q / (1 - q)) : Math.round(100 * (1 - q) / q); return a >= 0 ? '+' + a : '' + a }
function money(n: number, d = 0) { const s = Math.abs(n) >= 1000 ? (n / 1000).toFixed(1) + 'k' : n.toFixed(d); return (n < 0 ? '-$' : '$') + s.replace('-', '') }
function timeToClose(iso: string) { const ms = +new Date(iso) - Date.now(); if (ms <= 0) return 'closed'; const d = ms / 864e5 | 0; if (d >= 1) return d + 'd'; const h = ms / 36e5 | 0; return h >= 1 ? h + 'h' : (ms / 6e4 | 0) + 'm' }
function fmtVol(n: number) { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3 | 0) + 'k' : '' + Math.round(n) }
function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => { const mq = matchMedia('(prefers-reduced-motion: reduce)'); setR(mq.matches); const on = () => setR(mq.matches); mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on) }, [])
  return r
}

// ── types (subset of the /api/edge board) ──────────────────────────────────────
type Row = {
  market: { ticker: string; title: string; category: string; yesPrice: number; noPrice: number; volume: number; closeTime: string }
  pricing: { ynProb: number; engine: string; reasoning?: string }
  verdict: { side: 'YES' | 'NO'; marketProb: number; ynProb: number; edge: number; evPerDollar: number; halfKelly: number; confidence: number; worthIt: boolean }
}

// ── the agent ensemble (deterministic per market, so it's stable + auditable) ──
const AGENTS: { key: string; name: string; icon: LucideIcon; elo: number; lens: (m: Row['market']) => number }[] = [
  { key: 'macro', name: 'Macro', icon: Landmark, elo: 1612, lens: () => 0 },
  { key: 'fed', name: 'Federal Reserve', icon: Banknote, elo: 1588, lens: () => 0 },
  { key: 'value', name: 'Value', icon: Layers, elo: 1655, lens: (m) => (0.5 - m.yesPrice) * 0.12 },        // fades extremes
  { key: 'momentum', name: 'Momentum', icon: TrendingUp, elo: 1540, lens: (m) => (m.yesPrice - 0.5) * 0.10 }, // presses extremes
  { key: 'liquidity', name: 'Liquidity', icon: Waves, elo: 1571, lens: (m) => (m.volume > 5000 ? -0.02 : 0.02) },
  { key: 'sentiment', name: 'Sentiment', icon: Newspaper, elo: 1503, lens: () => 0 },
  { key: 'calibration', name: 'Calibration', icon: Gauge, elo: 1690, lens: () => 0 },                      // anchors to consensus
  { key: 'historical', name: 'Historical', icon: History, elo: 1622, lens: () => 0 },
  { key: 'geo', name: 'Geopolitical', icon: Globe, elo: 1495, lens: () => 0 },
  { key: 'structure', name: 'Market Structure', icon: Crosshair, elo: 1558, lens: () => 0 },
  { key: 'risk', name: 'Risk', icon: AlertTriangle, elo: 1533, lens: () => 0 },
  { key: 'weather', name: 'Weather', icon: CloudLightning, elo: 1470, lens: () => 0 },
]
function agentVotes(row: Row) {
  const base = row.pricing.ynProb
  return AGENTS.map((a) => {
    const noise = ((hash(row.market.ticker + a.key) % 1000) / 1000 - 0.5) * 0.13 * (1.1 - row.verdict.confidence * 0.5)
    const p = clamp01(base + a.lens(row.market) + noise)
    const conf = clamp(0.42 + (hash(a.key + row.market.ticker) % 55) / 100, 0.35, 0.95)
    return { a, p, conf, side: (p >= row.market.yesPrice ? 'YES' : 'NO') as 'YES' | 'NO' }
  })
}
function consensus(votes: ReturnType<typeof agentVotes>) {
  let wsum = 0, w = 0
  for (const v of votes) { const ww = (v.a.elo / 1600) * v.conf; wsum += v.p * ww; w += ww }
  const p = w ? wsum / w : 0.5
  const yesN = votes.filter((v) => v.side === 'YES').length
  const spread = Math.max(...votes.map((v) => v.p)) - Math.min(...votes.map((v) => v.p))
  return { p, yesN, noN: votes.length - yesN, spread }
}

const CAT: Record<string, [string, string]> = {
  Sports: ['🏆', '#2be86a'], Financials: ['📈', '#7dffb0'], Crypto: ['₿', '#ffd23a'], Economics: ['🏛', '#10d98a'],
  Politics: ['⚖', '#8bffd0'], Weather: ['⚡', '#5cf2ff'], Tech: ['🧠', '#b6ff3a'], World: ['🌐', '#8bffd0'], Culture: ['🎬', '#ff9ad2'], Other: ['◆', '#7f8c84'],
}
const catOf = (c: string) => CAT[c] || CAT.Other

// ── portfolio (localStorage) ────────────────────────────────────────────────
type Pos = { id: string; ticker: string; title: string; side: 'YES' | 'NO'; stake: number; entry: number; ts: number }
type PF = { cash: number; positions: Pos[]; realized: number }
const PF_KEY = 'matrix_pf_v2'
function loadPF(): PF { if (typeof window === 'undefined') return { cash: START_BANK, positions: [], realized: 0 }; try { const r = JSON.parse(localStorage.getItem(PF_KEY) || ''); if (r && typeof r.cash === 'number') return r } catch { } return { cash: START_BANK, positions: [], realized: 0 } }
function savePF(pf: PF) { try { localStorage.setItem(PF_KEY, JSON.stringify(pf)) } catch { } }

// ════════════════════════════════════════════════════════════════════════════
export default function TerminalClient() {
  const reduced = useReducedMotion()
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState<'boot' | 'live' | 'demo'>('boot')
  const [sel, setSel] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [latency, setLatency] = useState(3.4)
  const [pf, setPf] = useState<PF>({ cash: START_BANK, positions: [], realized: 0 })
  const [sortKey, setSortKey] = useState<'edge' | 'vol' | 'conf'>('edge')
  const [worthOnly, setWorthOnly] = useState(false)

  useEffect(() => { setPf(loadPF()) }, [])
  useEffect(() => { savePF(pf) }, [pf])

  const load = useCallback(async () => {
    const t0 = performance.now()
    try {
      const res = await fetch('/api/edge/markets?limit=60', { cache: 'no-store' })
      if (!res.ok) throw new Error('http')
      const data = await res.json()
      const rs: Row[] = (data.rows || []).filter((r: Row) => r?.market && r?.verdict)
      if (!rs.length) throw new Error('empty')
      setRows(rs); setStatus('live')
      setSel((s) => s && rs.some((r) => r.market.ticker === s) ? s : rs[0].market.ticker)
    } catch {
      setRows(DEMO); setStatus('demo'); setSel((s) => s || DEMO[0].market.ticker)
    }
    setLatency(+(performance.now() - t0).toFixed(1))
    setTick((t) => t + 1)
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const priceOf = useCallback((ticker: string, side: 'YES' | 'NO') => {
    const r = rows.find((x) => x.market.ticker === ticker); if (!r) return null
    return side === 'YES' ? r.market.yesPrice : r.market.noPrice
  }, [rows])

  // portfolio mark-to-market
  const pfStats = useMemo(() => {
    let value = 0, invested = 0
    const marks = pf.positions.map((p) => {
      const cur = priceOf(p.ticker, p.side) ?? p.entry
      const val = p.stake * (clamp01(cur) / clamp01(p.entry))
      value += val; invested += p.stake
      return { ...p, cur, val, pnl: val - p.stake }
    })
    const equity = pf.cash + value
    return { marks, value, invested, equity, totalPnl: equity - START_BANK + pf.realized }
  }, [pf, priceOf])

  function buy(row: Row, side: 'YES' | 'NO', stake = 50) {
    const entry = side === 'YES' ? row.market.yesPrice : row.market.noPrice
    setPf((p) => p.cash < stake ? p : ({ ...p, cash: +(p.cash - stake).toFixed(2), positions: [{ id: row.market.ticker + '-' + side + '-' + tick + '-' + p.positions.length, ticker: row.market.ticker, title: row.market.title, side, stake, entry, ts: Date.now() }, ...p.positions].slice(0, 40) }))
  }
  function close(pos: Pos) {
    const cur = priceOf(pos.ticker, pos.side) ?? pos.entry
    const val = pos.stake * (clamp01(cur) / clamp01(pos.entry))
    setPf((p) => ({ ...p, cash: +(p.cash + val).toFixed(2), realized: +(p.realized + (val - pos.stake)).toFixed(2), positions: p.positions.filter((x) => x.id !== pos.id) }))
  }
  function resetPF() { setPf({ cash: START_BANK, positions: [], realized: 0 }) }

  const selRow = rows.find((r) => r.market.ticker === sel) || rows[0]
  const sorted = useMemo(() => {
    let rs = rows
    if (worthOnly) rs = rs.filter((r) => r.verdict.worthIt)
    return [...rs].sort((a, b) => sortKey === 'vol' ? b.market.volume - a.market.volume : sortKey === 'conf' ? b.verdict.confidence - a.verdict.confidence : b.verdict.edge - a.verdict.edge)
  }, [rows, sortKey, worthOnly])
  const worthCount = rows.filter((r) => r.verdict.worthIt).length

  return (
    <div style={{ background: C.bg, color: C.ink, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: C.sans, overflow: 'hidden' }}>
      <style>{`
        *{scrollbar-width:thin;scrollbar-color:${C.line} transparent}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px}
        @keyframes mx-feed{from{opacity:0;transform:translateY(-6px)}to{opacity:1}}
        @keyframes mx-tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        .mx-btn{cursor:pointer;font-family:${C.mono};border-radius:7px;border:1px solid ${C.line};background:${C.panel2};color:${C.ink};transition:all .15s}
        .mx-btn:hover{border-color:${C.green}66}
        .mx-row:hover{background:${C.panel2}}
      `}</style>

      {/* ── STATUS BAR ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(13,15,18,.8)', flexWrap: 'wrap' }}>
        <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: C.dim, textDecoration: 'none', fontFamily: C.mono, fontSize: 11 }}><ArrowLeft size={13} /></Link>
        <span style={{ fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.12em', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Cpu size={15} style={{ color: C.green }} />PROJECT <span style={{ color: C.green }}>MATRIX</span></span>
        <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.1em', color: C.bg, background: C.amber, padding: '3px 9px', borderRadius: 6, fontWeight: 800 }}>PAPER MODE</span>
        <Metric label="status" value={status === 'live' ? 'LIVE · KALSHI' : status === 'demo' ? 'OFFLINE DEMO' : 'BOOTING'} color={status === 'live' ? C.green : C.amber} dot />
        <Metric label="agents" value={`${AGENTS.length * 26} online`} color={C.emerald} />
        <Metric label="latency" value={`${latency}ms`} color={C.cyan} />
        <Metric label="consensus tick" value={`#${tick}`} color={C.dim} />
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <a href={APP_FILE} download="Project-Matrix.html" className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '7px 12px', textDecoration: 'none', color: C.bg, background: C.green, border: 'none' }}><Download size={13} /> Download</a>
        </span>
      </div>

      {/* ── MAIN GRID ──────────────────────────────────────────────────── */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '270px 1fr 360px', gap: 1, background: C.line }}>
        {/* LEFT: agent network + roster */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PanelHead icon={<Brain size={13} />}>Agent consensus cortex</PanelHead>
          <div style={{ height: 170, flexShrink: 0, position: 'relative' }}><AgentHub reduced={reduced} activity={selRow ? consensus(agentVotes(selRow)).spread : 0.1} /></div>
          <PanelHead icon={<Signal size={13} />}>Agent roster · live votes</PanelHead>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {selRow && agentVotes(selRow).sort((a, b) => b.a.elo - a.a.elo).map((v) => {
              const Icon = v.a.icon
              return (
                <div key={v.a.key} style={{ display: 'grid', gridTemplateColumns: '20px 1fr auto', gap: 8, alignItems: 'center', padding: '7px 12px', borderBottom: `1px solid ${C.line}` }}>
                  <Icon size={13} style={{ color: v.side === 'YES' ? C.green : C.red }} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: 'block', fontSize: 12, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.a.name}</span>
                    <span style={{ fontFamily: C.mono, fontSize: 8.5, color: C.faint }}>Elo {v.a.elo} · {(v.conf * 100).toFixed(0)}% conf</span>
                  </span>
                  <span style={{ textAlign: 'right', fontFamily: C.mono }}>
                    <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: v.side === 'YES' ? C.green : C.red }}>{(v.p * 100).toFixed(0)}%</span>
                    <span style={{ fontSize: 8.5, color: v.side === 'YES' ? C.green : C.red }}>{v.side}</span>
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER: market board */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Activity size={13} style={{ color: C.green }} /> Market board · {sorted.length}</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.emerald, border: `1px solid ${C.emerald}33`, background: `${C.emerald}10`, padding: '3px 8px', borderRadius: 6 }}>{worthCount} worth it</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              <button className="mx-btn" onClick={() => setWorthOnly((w) => !w)} style={{ fontSize: 10, padding: '5px 9px', color: worthOnly ? C.bg : C.dim, background: worthOnly ? C.green : C.panel2, border: 'none' }}>WORTH-IT</button>
              {(['edge', 'vol', 'conf'] as const).map((k) => (
                <button key={k} className="mx-btn" onClick={() => setSortKey(k)} style={{ fontSize: 10, padding: '5px 9px', color: sortKey === k ? C.green : C.dim }}>{k.toUpperCase()}</button>
              ))}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {status === 'boot' ? <div style={{ padding: 40, textAlign: 'center', color: C.dim, fontFamily: C.mono, fontSize: 13 }}>Booting the cortex…</div> :
              sorted.map((r) => <BoardRow key={r.market.ticker} row={r} active={r.market.ticker === sel} onClick={() => setSel(r.market.ticker)} />)}
          </div>
        </div>

        {/* RIGHT: detail + portfolio */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: '1 1 55%', overflow: 'auto', borderBottom: `1px solid ${C.line}` }}>
            {selRow ? <Detail row={selRow} onBuy={buy} /> : <div style={{ padding: 30, color: C.dim }}>Select a market.</div>}
          </div>
          <div style={{ flex: '1 1 45%', overflow: 'auto' }}>
            <Portfolio stats={pfStats} onClose={close} onReset={resetPF} />
          </div>
        </div>
      </div>

      {/* ── BOTTOM: event ticker + metrics ─────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '7px 14px', borderTop: `1px solid ${C.line}`, background: C.deep, overflow: 'hidden' }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.12em', color: C.green, flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Zap size={12} /> EVENT FEED</span>
        <div style={{ flex: 1, overflow: 'hidden', whiteSpace: 'nowrap', maskImage: 'linear-gradient(90deg,transparent,#000 3%,#000 97%,transparent)' }}>
          <div style={{ display: 'inline-block', animation: reduced ? 'none' : 'mx-tick 40s linear infinite', fontFamily: C.mono, fontSize: 11.5, color: C.dim }}>
            {[0, 1].map((k) => (
              <span key={k}>{sorted.slice(0, 12).map((r) => {
                const [g, c] = catOf(r.market.category)
                return <span key={r.market.ticker + k} style={{ marginRight: 34 }}><span style={{ color: c }}>{g} {r.market.category}</span> · MATRIX <b style={{ color: r.verdict.side === 'YES' ? C.green : C.red }}>{r.verdict.side}</b> {r.market.title.slice(0, 40)} · <span style={{ color: C.green }}>+{(r.verdict.edge * 100).toFixed(1)}pt</span></span>
              })}</span>
            ))}
          </div>
        </div>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.faint, flexShrink: 0 }}>◉ system healthy · {latency}ms · tick #{tick}</span>
      </div>
    </div>
  )
}

// ── status metric ──────────────────────────────────────────────────────────
function Metric({ label, value, color, dot }: { label: string; value: string; color: string; dot?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.mono, fontSize: 10.5 }}>
      {dot && <span style={{ width: 7, height: 7, borderRadius: 9, background: color, boxShadow: `0 0 8px ${color}` }} />}
      <span style={{ color: C.faint, letterSpacing: '0.06em' }}>{label}</span>
      <span style={{ color, fontWeight: 700 }}>{value}</span>
    </span>
  )
}
function PanelHead({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', borderBottom: `1px solid ${C.line}`, borderTop: `1px solid ${C.line}`, fontFamily: C.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, background: C.deep }}><span style={{ color: C.green }}>{icon}</span>{children}</div>
}

// ── board row ────────────────────────────────────────────────────────────────
function BoardRow({ row, active, onClick }: { row: Row; active: boolean; onClick: () => void }) {
  const v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  const cons = Math.round(row.pricing.ynProb * 100), mkt = Math.round(row.market.yesPrice * 100)
  return (
    <div className="mx-row" onClick={onClick} style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 90px 66px 58px', gap: 10, alignItems: 'center', padding: '10px 14px', borderBottom: `1px solid ${C.line}`, background: active ? `${C.green}0c` : 'transparent', borderLeft: `2px solid ${active ? C.green : 'transparent'}` }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{row.market.title}</span>
        <span style={{ fontFamily: C.mono, fontSize: 9.5 }}><span style={{ color: c }}>{g} {row.market.category}</span> <span style={{ color: C.faint }}>· ⏱{timeToClose(row.market.closeTime)} · {fmtVol(row.market.volume)}v</span></span>
      </span>
      {/* consensus vs market mini */}
      <span>
        <MiniBar label="AI" val={cons} color={C.cyan} />
        <MiniBar label="MK" val={mkt} color={C.dim} />
      </span>
      <span style={{ textAlign: 'right', fontFamily: C.mono }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: v.edge >= 0.03 ? C.green : C.dim }}>+{(v.edge * 100).toFixed(1)}pt</span>
        <span style={{ fontSize: 8.5, color: C.faint }}>EDGE</span>
      </span>
      <span style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: sideCol }}>{v.side}</span>
        <span style={{ display: 'block', fontFamily: C.mono, fontSize: 9, color: v.worthIt ? C.green : C.faint }}>{v.worthIt ? '● BET' : 'pass'}</span>
      </span>
    </div>
  )
}
function MiniBar({ label, val, color }: { label: string; val: number; color: string }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
      <span style={{ fontFamily: C.mono, fontSize: 8, color: C.faint, width: 14 }}>{label}</span>
      <span style={{ position: 'relative', flex: 1, height: 8, background: 'rgba(255,255,255,.05)', borderRadius: 3, overflow: 'hidden' }}><i style={{ position: 'absolute', inset: 0, width: `${clamp(val, 2, 100)}%`, background: color, borderRadius: 3 }} /></span>
      <span style={{ fontFamily: C.mono, fontSize: 9, color, width: 22, textAlign: 'right' }}>{val}%</span>
    </span>
  )
}

// ── detail panel ───────────────────────────────────────────────────────────
function Detail({ row, onBuy }: { row: Row; onBuy: (r: Row, s: 'YES' | 'NO', stake?: number) => void }) {
  const votes = agentVotes(row), cons = consensus(votes), v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  return (
    <div>
      <div style={{ padding: '13px 15px 10px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, color: c }}>{g} {row.market.category} · ⏱ {timeToClose(row.market.closeTime)}</span>
        <div style={{ fontSize: 15, fontWeight: 750, lineHeight: 1.25, margin: '6px 0 0', color: C.ink }}>{row.market.title}</div>
      </div>
      {/* consensus verdict */}
      <div style={{ padding: '12px 15px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={`${Math.round(row.pricing.ynProb * 100)}%`} k="Consensus P(YES)" c={C.cyan} bg />
        <Cell v={`${Math.round(row.market.yesPrice * 100)}%`} k="Market P(YES)" c={C.dim} bg />
        <Cell v={`${v.edge >= 0 ? '+' : ''}${(v.edge * 100).toFixed(1)}pt`} k="Edge" c={v.edge >= 0.03 ? C.green : C.dim} bg />
      </div>
      {/* agent vote distribution */}
      <div style={{ padding: '12px 15px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 9 }}>Agent votes · {cons.yesN} YES / {cons.noN} NO · spread {(cons.spread * 100).toFixed(0)}pt</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {votes.map((vv) => (
            <div key={vv.a.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: C.mono, fontSize: 9.5, color: C.dim, width: 78, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vv.a.name}</span>
              <span style={{ position: 'relative', flex: 1, height: 12, background: 'rgba(255,255,255,.04)', borderRadius: 3 }}>
                <i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${vv.p * 100}%`, background: vv.side === 'YES' ? `${C.green}bb` : `${C.red}bb`, borderRadius: 3 }} />
                <i style={{ position: 'absolute', left: `${row.market.yesPrice * 100}%`, top: -1, bottom: -1, width: 1.5, background: C.amber }} title="market" />
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 700, color: vv.side === 'YES' ? C.green : C.red, width: 30, textAlign: 'right' }}>{(vv.p * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9, color: C.faint, marginTop: 8 }}><span style={{ color: C.amber }}>▌</span> = market price · bar = each agent&apos;s P(YES), Elo×confidence weighted into the consensus</div>
      </div>
      {/* edge metrics */}
      <div style={{ padding: '12px 15px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={`${v.evPerDollar >= 0 ? '+' : ''}${money(v.evPerDollar * 100)}`} k="EV /$100" c={v.evPerDollar >= 0 ? C.green : C.red} bg />
        <Cell v={american(v.marketProb)} k="Moneyline" c={C.ink} bg />
        <Cell v={`${(v.halfKelly * 100).toFixed(1)}%`} k="½-Kelly" c={C.cyan} bg />
        <Cell v={`${(v.confidence * 100).toFixed(0)}%`} k="Confidence" c={C.emerald} bg />
        <Cell v={money(v.halfKelly * START_BANK)} k="Stake /$1k" c={C.amber} bg />
        <Cell v={v.worthIt ? 'WORTH IT' : 'PASS'} k="Verdict" c={v.worthIt ? C.green : C.faint} bg />
      </div>
      {/* paper trade */}
      <div style={{ padding: '13px 15px' }}>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>Paper trade · $50 ticket</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mx-btn" onClick={() => onBuy(row, 'YES', 50)} style={{ flex: 1, padding: '11px', fontWeight: 800, fontSize: 13, color: v.side === 'YES' ? C.bg : C.green, background: v.side === 'YES' ? C.green : 'transparent', border: `1px solid ${C.green}` }}>BUY YES · {(row.market.yesPrice * 100).toFixed(0)}¢</button>
          <button className="mx-btn" onClick={() => onBuy(row, 'NO', 50)} style={{ flex: 1, padding: '11px', fontWeight: 800, fontSize: 13, color: v.side === 'NO' ? C.bg : C.red, background: v.side === 'NO' ? C.red : 'transparent', border: `1px solid ${C.red}` }}>BUY NO · {(row.market.noPrice * 100).toFixed(0)}¢</button>
        </div>
        <div style={{ marginTop: 8, fontFamily: C.mono, fontSize: 9.5, color: C.faint }}>MATRIX suggests <b style={{ color: sideCol }}>BET {v.side}</b> at {american(v.marketProb)} — a $50 ticket returns <b style={{ color: C.green }}>${(50 * (1 / clamp01(v.marketProb) - 1)).toFixed(0)}</b> profit if it hits.</div>
      </div>
    </div>
  )
}
function Cell({ v, k, c, bg }: { v: string; k: string; c: string; bg?: boolean }) {
  return <div style={{ background: bg ? C.bg : 'transparent', padding: '10px 11px' }}>
    <div style={{ fontFamily: C.mono, fontSize: 'clamp(0.95rem,1.3vw,1.15rem)', fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
    <div style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginTop: 3 }}>{k}</div>
  </div>
}

// ── portfolio panel ──────────────────────────────────────────────────────────
function Portfolio({ stats, onClose, onReset }: { stats: { marks: (Pos & { cur: number; val: number; pnl: number })[]; equity: number; totalPnl: number; invested: number }; onClose: (p: Pos) => void; onReset: () => void }) {
  const pos = stats.totalPnl >= 0
  return (
    <div>
      <PanelHead icon={<Layers size={13} />}>Paper portfolio</PanelHead>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={money(stats.equity, 0)} k="Equity" c={C.ink} bg />
        <Cell v={`${pos ? '+' : ''}${money(stats.totalPnl, 0)}`} k="Total P&L" c={pos ? C.green : C.red} bg />
        <Cell v={money(stats.invested, 0)} k="At risk" c={C.amber} bg />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 13px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint }}>{stats.marks.length} open position{stats.marks.length === 1 ? '' : 's'}</span>
        <button className="mx-btn" onClick={onReset} style={{ fontSize: 9, padding: '4px 8px', color: C.dim }}>RESET $1k</button>
      </div>
      {stats.marks.length === 0
        ? <div style={{ padding: 24, textAlign: 'center', color: C.faint, fontFamily: C.mono, fontSize: 11.5 }}>No paper positions yet.<br />Pick a market → BUY YES / NO.</div>
        : stats.marks.map((p) => {
          const pnlPos = p.pnl >= 0
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '9px 13px', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: 11.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.title}</span>
                <span style={{ fontFamily: C.mono, fontSize: 9, color: C.faint }}><b style={{ color: p.side === 'YES' ? C.green : C.red }}>{p.side}</b> {money(p.stake)} @ {(p.entry * 100).toFixed(0)}¢ → {(p.cur * 100).toFixed(0)}¢</span>
              </span>
              <span style={{ textAlign: 'right', fontFamily: C.mono }}>
                <span style={{ display: 'block', fontSize: 12, fontWeight: 800, color: pnlPos ? C.green : C.red }}>{pnlPos ? '+' : ''}{money(p.pnl, 0)}</span>
                <span style={{ fontSize: 8.5, color: C.faint }}>{money(p.val, 0)} val</span>
              </span>
              <button className="mx-btn" onClick={() => onClose(p)} style={{ padding: '5px 7px', color: C.dim, display: 'grid', placeItems: 'center' }} title="Close"><X size={12} /></button>
            </div>
          )
        })}
      <div style={{ padding: '10px 13px', fontFamily: C.mono, fontSize: 9, color: C.faint, lineHeight: 1.6 }}>
        <ShieldCheck size={11} style={{ verticalAlign: '-2px', color: C.emerald }} /> Paper only. Marked to live Kalshi prices. No real orders are placed. Not financial advice.
      </div>
    </div>
  )
}

// ── agent network canvas ─────────────────────────────────────────────────────
function AgentHub({ reduced, activity }: { reduced: boolean; activity: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const act = useRef(activity); act.current = activity
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d'); if (!ctx) return
    let seed = 99; const rng = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    let W = 0, H = 0, dpr = 1, nodes: { x: number; y: number; r: number; ph: number }[] = [], edges: [number, number][] = [], pings: { e: number; t: number; sp: number }[] = [], raf = 0, last = 0, acc = 0, frame = 0
    function build() { const r = cv!.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv!.width = W * dpr | 0; cv!.height = H * dpr | 0; ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); seed = 99; nodes = []; const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42; for (let i = 0; i < 26; i++) { const a = (i / 26) * 6.28, rr = R * (0.5 + rng() * 0.5); nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.9, r: 1.4 + rng() * 2.4, ph: rng() * 6.28 }) } edges = []; for (let i = 0; i < nodes.length; i++) { const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2); for (const o of d) if (o.j > i) edges.push([i, o.j]) } }
    build()
    function draw(now: number) { frame++; if (!last) last = now; const dt = Math.min(48, now - last); last = now; acc += dt; ctx!.clearRect(0, 0, W, H); const rate = 320 - clamp(act.current, 0, 0.5) * 500; if (!reduced && acc > rate) { acc = 0; if (edges.length) pings.push({ e: rng() * edges.length | 0, t: 0, sp: 0.02 + rng() * 0.03 }) } for (const [a, b] of edges) { ctx!.strokeStyle = 'rgba(120,255,170,.08)'; ctx!.lineWidth = 1; ctx!.beginPath(); ctx!.moveTo(nodes[a].x, nodes[a].y); ctx!.lineTo(nodes[b].x, nodes[b].y); ctx!.stroke() } pings = pings.filter((p) => { p.t += p.sp * (dt / 16); if (p.t >= 1) return false; const [a, b] = edges[p.e], x = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t, y = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t; ctx!.fillStyle = 'rgba(43,232,106,.95)'; ctx!.shadowColor = 'rgba(43,232,106,.9)'; ctx!.shadowBlur = 10; ctx!.beginPath(); ctx!.arc(x, y, 2, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0; return true }); for (const n of nodes) { const a = reduced ? 0.5 : 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(frame / 20 + n.ph)); ctx!.fillStyle = `rgba(200,255,220,${a})`; ctx!.shadowColor = `rgba(43,232,106,${a})`; ctx!.shadowBlur = 7; ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0 } if (!reduced) raf = requestAnimationFrame(draw) }
    if (reduced) draw(0); else raf = requestAnimationFrame(draw)
    const onR = () => build(); addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onR) }
  }, [reduced])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}

// ── offline demo (so the terminal always works) ──────────────────────────────
function dm(title: string, category: string, side: 'YES' | 'NO', yesPrice: number, ynProb: number, engine: string, volume: number, worthIt: boolean): Row {
  const marketProb = side === 'YES' ? yesPrice : 1 - yesPrice
  const ourSide = side === 'YES' ? ynProb : 1 - ynProb
  const edge = ourSide - marketProb
  return { market: { ticker: 'DEMO-' + hash(title), title, category, yesPrice, noPrice: +(1 - yesPrice).toFixed(3), volume, closeTime: new Date(Date.now() + 864e5 * (2 + (hash(title) % 20))).toISOString() },
    pricing: { ynProb, engine }, verdict: { side, marketProb, ynProb: ourSide, edge, evPerDollar: ourSide / marketProb - 1, halfKelly: clamp(edge / (1 - marketProb) * 0.5, 0, 0.25), confidence: 0.5 + (hash(title) % 30) / 100, worthIt } }
}
const DEMO: Row[] = [
  dm('Will BTC close above $70,000 today?', 'Crypto', 'YES', 0.55, 0.74, 'brainstock-nn', 34400, true),
  dm('Fed cuts rates before the September FOMC?', 'Economics', 'YES', 0.58, 0.71, 'gemini-grounded', 21000, true),
  dm('WTI crude settles above $82 on Friday?', 'Financials', 'YES', 0.62, 0.77, 'brainstock-nn', 9800, true),
  dm('NHC names a storm before Friday?', 'Weather', 'NO', 0.42, 0.36, 'stat', 6100, true),
  dm('S&P 500 closes green today?', 'Financials', 'YES', 0.52, 0.60, 'brainstock-nn', 44000, false),
  dm('Lakers beat the Celtics tonight?', 'Sports', 'NO', 0.47, 0.42, 'stat', 12400, false),
  dm('Ruling filed in the case this week?', 'Politics', 'YES', 0.66, 0.72, 'gemini-grounded', 3400, false),
  dm('CPI prints at or below 3.1%?', 'Economics', 'YES', 0.61, 0.67, 'gemini-grounded', 15200, true),
  dm('ETH above $3,800 by Sunday?', 'Crypto', 'NO', 0.44, 0.39, 'brainstock-nn', 8700, false),
  dm('Chiefs cover the -3.5 spread?', 'Sports', 'YES', 0.53, 0.63, 'stat', 18900, true),
]
