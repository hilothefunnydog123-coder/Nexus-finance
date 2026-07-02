'use client'

/**
 * PROJECT MATRIX — live auto-scalping terminal.
 * Runs the real /api/edge board marked to REAL Kalshi prices (3.5s poll), tracks
 * per-market realized volatility + momentum from the live tape, and an AUTO
 * engine fires + manages positions on a ~5s loop with take-profit / stop / time
 * exits, a streaming execution console, and a live equity curve.
 *
 * Two strategies:
 *   SNIPER — patient value: only fires when edge clears fees + spread (NET_MIN).
 *   DEGEN  — swarm-driven volatility hunter: a 262,144-agent online-learning
 *            swarm (see lib/swarm.ts) votes every generation and is re-scored
 *            against the realized tape; DEGEN trades the highest
 *            conviction × volatility markets with conviction-scaled tickets
 *            and wide TP/SL. High variance BY DESIGN.
 *
 * LIVE (real-money) is gated behind an explicit connect + typed arm + budget,
 * with a kill-and-flatten switch. Motion-safe throughout.
 */
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download, ArrowLeft, Activity, Cpu, Gauge, ShieldCheck, Signal, Crosshair,
  TrendingUp, Landmark, Banknote, CloudLightning, Newspaper, Globe, Waves,
  History, AlertTriangle, Layers, Brain, X, Zap, Rocket, Play, Pause,
  Wallet, Link2, LogOut, Flame,
  type LucideIcon,
} from 'lucide-react'
import {
  importKalshiKey, saveConn, loadConn, clearConn, getBalance, getPositions,
  placeOrder, errMsg, type KalshiConn, type KPosition,
} from '@/lib/kalshiClient'
import { createSwarm, swarmStep, swarmNormalize, SWARM_N, type Swarm } from '@/lib/swarm'

const C = {
  bg: '#0D0F12', deep: '#08090b', panel: 'rgba(255,255,255,.022)', panel2: 'rgba(255,255,255,.04)',
  line: 'rgba(120,255,170,.10)', ink: '#e9f5ee', dim: '#7f8c84', faint: '#4a564e',
  green: '#2be86a', lime: '#b6ff3a', emerald: '#10d98a', red: '#ff5a6a', cyan: '#22d3ee', amber: '#ffd23a',
  hot: '#ff7a18', hot2: '#ffb45c',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}
const APP_FILE = '/Project-Matrix.html'
const KAL_GREEN = '#00d29f'
const START_BANK = 5000

// ── SNIPER: patient value (churning every few seconds just feeds fees) ────────
const TICKET = 40
const TP = 0.14, SL = 0.09, MAX_AGE = 360000, MAX_OPEN = 5
const KFEE = 0.07          // Kalshi trading-fee coefficient
const HALF_SPREAD = 0.01   // assumed cost of crossing half the spread, per side
const NET_MIN = 0.02       // require ≥ 2pt of edge AFTER costs before firing
// ── DEGEN: swarm-driven vol hunter — big tickets, wide bands, 8 barrels ────────
const D_TICKET = 300       // base ticket; scales up to 2× with swarm conviction
const D_TP = 0.50, D_SL = 0.25, D_AGE = 240000, D_MAX_OPEN = 8
const D_CONV_MIN = 0.10    // swarm must actually lean before we pull the trigger
const SWARM_TARGETS = 16   // markets per generation (full population pass each)
function roundTripCost(p: number) { const q = Math.max(0.02, Math.min(0.98, p)); return 2 * KFEE * q * (1 - q) + 2 * HALF_SPREAD }
function netEdgeOf(v: { edge: number; marketProb: number }) { return v.edge - roundTripCost(v.marketProb) }

const clamp = (x: number, a: number, b: number) => Math.max(a, Math.min(b, x))
const clamp01 = (x: number) => clamp(x, 0.02, 0.98)
function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return (h >>> 0) }
function american(p: number) { const q = clamp(p, .02, .98); const a = q >= .5 ? -Math.round(100 * q / (1 - q)) : Math.round(100 * (1 - q) / q); return a >= 0 ? '+' + a : '' + a }
function money(n: number, d = 0) { const s = Math.abs(n) >= 1000 ? (Math.abs(n) / 1000).toFixed(1) + 'k' : Math.abs(n).toFixed(d); return (n < 0 ? '-$' : '$') + s }
function timeToClose(iso: string) { const ms = +new Date(iso) - Date.now(); if (ms <= 0) return 'closed'; const d = ms / 864e5 | 0; if (d >= 1) return d + 'd'; const h = ms / 36e5 | 0; return h >= 1 ? h + 'h' : (ms / 6e4 | 0) + 'm' }
function fmtVol(n: number) { n = n || 0; return n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? (n / 1e3 | 0) + 'k' : '' + Math.round(n) }
function useReducedMotion() {
  const [r, setR] = useState(false)
  useEffect(() => { const mq = matchMedia('(prefers-reduced-motion: reduce)'); setR(mq.matches); const on = () => setR(mq.matches); mq.addEventListener?.('change', on); return () => mq.removeEventListener?.('change', on) }, [])
  return r
}

type Row = {
  market: { ticker: string; title: string; category: string; yesPrice: number; noPrice: number; volume: number; closeTime: string }
  pricing: { ynProb: number; engine: string }
  verdict: { side: 'YES' | 'NO'; marketProb: number; ynProb: number; edge: number; evPerDollar: number; halfKelly: number; confidence: number; worthIt: boolean }
}
type Strat = 'sniper' | 'degen'

const AGENTS: { key: string; name: string; icon: LucideIcon; elo: number; lens: (m: Row['market']) => number }[] = [
  { key: 'macro', name: 'Macro', icon: Landmark, elo: 1612, lens: () => 0 },
  { key: 'fed', name: 'Federal Reserve', icon: Banknote, elo: 1588, lens: () => 0 },
  { key: 'value', name: 'Value', icon: Layers, elo: 1655, lens: (m) => (0.5 - m.yesPrice) * 0.12 },
  { key: 'momentum', name: 'Momentum', icon: TrendingUp, elo: 1540, lens: (m) => (m.yesPrice - 0.5) * 0.10 },
  { key: 'liquidity', name: 'Liquidity', icon: Waves, elo: 1571, lens: (m) => (m.volume > 5000 ? -0.02 : 0.02) },
  { key: 'sentiment', name: 'Sentiment', icon: Newspaper, elo: 1503, lens: () => 0 },
  { key: 'calibration', name: 'Calibration', icon: Gauge, elo: 1690, lens: () => 0 },
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
  const yesN = votes.filter((v) => v.side === 'YES').length
  const spread = Math.max(...votes.map((v) => v.p)) - Math.min(...votes.map((v) => v.p))
  return { p: w ? wsum / w : 0.5, yesN, noN: votes.length - yesN, spread }
}
const CAT: Record<string, [string, string]> = {
  Sports: ['🏆', '#2be86a'], Financials: ['📈', '#7dffb0'], Crypto: ['₿', '#ffd23a'], Economics: ['🏛', '#10d98a'],
  Politics: ['⚖', '#8bffd0'], Weather: ['⚡', '#5cf2ff'], Tech: ['🧠', '#b6ff3a'], World: ['🌐', '#8bffd0'], Culture: ['🎬', '#ff9ad2'], Other: ['◆', '#7f8c84'],
}
const catOf = (c: string) => CAT[c] || CAT.Other
// categories where markets actually rip intraday — degen boost
const CAT_X: Record<string, number> = { Crypto: 1.5, Sports: 1.4, Financials: 1.25, Weather: 1.1 }

type Pos = { id: string; ticker: string; title: string; side: 'YES' | 'NO'; stake: number; entry: number; ts: number; auto?: boolean; degen?: boolean }
type PF = { cash: number; positions: Pos[]; realized: number }
const PF_KEY = 'matrix_pf_v4' // v4: $5k degen bank
function loadPF(): PF { if (typeof window === 'undefined') return { cash: START_BANK, positions: [], realized: 0 }; try { const r = JSON.parse(localStorage.getItem(PF_KEY) || ''); if (r && typeof r.cash === 'number') return r } catch { } return { cash: START_BANK, positions: [], realized: 0 } }
function savePF(pf: PF) { try { localStorage.setItem(PF_KEY, JSON.stringify(pf)) } catch { } }

type LogEntry = { id: number; t: string; kind: 'SCAN' | 'FIRE' | 'FILL' | 'TP' | 'SL' | 'EXIT' | 'SYS'; text: string }
type LivePos = { id: string; ticker: string; title: string; side: 'yes' | 'no'; count: number; entry: number; ts: number; degen?: boolean }

// ════════════════════════════════════════════════════════════════════════════
export default function TerminalClient() {
  const reduced = useReducedMotion()
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState<'boot' | 'live' | 'demo'>('boot')
  const [sel, setSel] = useState<string | null>(null)
  const [, setTick] = useState(0)
  const [pf, setPf] = useState<PF>({ cash: START_BANK, positions: [], realized: 0 })
  const [sortKey, setSortKey] = useState<'edge' | 'vol' | 'volx'>('edge')
  const [worthOnly, setWorthOnly] = useState(false)
  const [strat, setStrat] = useState<Strat>('sniper')
  const [auto, setAuto] = useState(false)
  const [autoMode, setAutoMode] = useState<'paper' | 'live'>('paper')
  const [liveArm, setLiveArm] = useState(false)
  const [liveState, setLiveState] = useState<{ spent: number; trades: number; positions: LivePos[] }>({ spent: 0, trades: 0, positions: [] })
  const liveCfg = useRef({ budget: 20, maxTrades: 12, contracts: 1 })
  const liveRef = useRef(liveState); liveRef.current = liveState
  const [connect, setConnect] = useState(false)
  const [conn, setConn] = useState<KalshiConn | null>(null)
  const [bal, setBal] = useState<number | null>(null)
  const [kpos, setKpos] = useState<KPosition[]>([])
  const [orderReq, setOrderReq] = useState<{ row: Row; side: 'yes' | 'no' } | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [eq, setEq] = useState<number[]>([])
  const [pxv, setPxv] = useState(0) // bump to re-render on price move
  const [firing, setFiring] = useState(false)
  const [sess, setSess] = useState({ trades: 0, wins: 0, pnl: 0 })
  const [lastPx, setLastPx] = useState(0)

  const px = useRef<Record<string, number>>({})            // live YES prices
  const hist = useRef<Record<string, number[]>>({})        // rolling price history (per poll)
  const rowsRef = useRef<Row[]>([]); rowsRef.current = rows
  const pfRef = useRef<PF>(pf); pfRef.current = pf
  const stratRef = useRef<Strat>(strat); stratRef.current = strat
  const selRef = useRef<string | null>(sel); selRef.current = sel
  const swarm = useRef<Swarm | null>(null)
  const [swv, setSwv] = useState(0) // bump per swarm generation
  const logId = useRef(0)
  const accent = strat === 'degen' ? C.hot : C.green

  useEffect(() => { setPf(loadPF()) }, [])
  useEffect(() => { savePF(pf) }, [pf])

  // restore a saved Kalshi connection (key stays in IndexedDB, non-extractable)
  useEffect(() => { loadConn().then(async (c) => { if (!c) return; try { const b = await getBalance(c); setConn(c); setBal(b) } catch { /* stale/invalid — user reconnects */ } }) }, [])
  // poll the real account when connected
  useEffect(() => {
    if (!conn) { setBal(null); setKpos([]); return }
    let stop = false
    const go = async () => { try { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); if (!stop) { setBal(b); setKpos(p) } } catch { } }
    go(); const id = setInterval(go, 15000); return () => { stop = true; clearInterval(id) }
  }, [conn])
  const addLog = useCallback((kind: LogEntry['kind'], text: string) => {
    setLog((l) => [{ id: logId.current++, t: new Date().toLocaleTimeString('en-US', { hour12: false }), kind, text }, ...l].slice(0, 40))
  }, [])

  const pushHist = useCallback((t: string, p: number) => {
    const h = hist.current[t] || (hist.current[t] = [])
    h.push(p); if (h.length > 60) h.shift()
  }, [])

  // ── load board ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/edge/markets?limit=60', { cache: 'no-store' })
      if (!res.ok) throw new Error('http')
      const data = await res.json()
      const rs: Row[] = (data.rows || []).filter((r: Row) => r?.market && r?.verdict)
      if (!rs.length) throw new Error('empty')
      setRows(rs); setStatus('live'); setSel((s) => s && rs.some((r) => r.market.ticker === s) ? s : rs[0].market.ticker)
      for (const r of rs) if (px.current[r.market.ticker] == null) { px.current[r.market.ticker] = r.market.yesPrice; pushHist(r.market.ticker, r.market.yesPrice) }
    } catch {
      setRows(DEMO); setStatus('demo'); setSel((s) => s || DEMO[0].market.ticker)
      for (const r of DEMO) if (px.current[r.market.ticker] == null) { px.current[r.market.ticker] = r.market.yesPrice; pushHist(r.market.ticker, r.market.yesPrice) }
    }
    setTick((t) => t + 1)
  }, [pushHist])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const priceOf = useCallback((ticker: string, side: 'YES' | 'NO') => {
    const base = px.current[ticker]; if (base == null) return null
    return side === 'YES' ? base : +(1 - base).toFixed(4)
  }, [])

  // ── realized volatility + momentum from the live tape ─────────────────────
  const volStats = useCallback((t: string) => {
    const h = hist.current[t]
    if (!h || h.length < 4) return { vol: 0, mom: 0 }
    const win = h.slice(-40), diffs: number[] = []
    for (let i = 1; i < win.length; i++) diffs.push(win[i] - win[i - 1])
    let s = 0, s2 = 0
    for (const d of diffs) { s += d; s2 += d * d }
    const mean = s / diffs.length
    const vol = Math.sqrt(Math.max(0, s2 / diffs.length - mean * mean)) // per-sample σ, price units
    const back = win.length >= 12 ? win[win.length - 12] : win[0]
    return { vol, mom: win[win.length - 1] - back } // mom ≈ move over the last ~40s
  }, [])
  /** How violently this market moves × how tradable the swing is. The DEGEN ranking. */
  const degenScore = useCallback((r: Row) => {
    const t = r.market.ticker
    const p = px.current[t] ?? r.market.yesPrice
    if (p < 0.06 || p > 0.94) return 0                       // longshot dust — nothing to scalp
    const { vol, mom } = volStats(t)
    const nearMoney = 1 - Math.abs(p - 0.5) * 2              // 1 at 50¢: max variance per tick
    const ms = +new Date(r.market.closeTime) - Date.now()
    const urgency = ms <= 0 ? 0 : ms < 36e5 ? 2 : ms < 864e5 ? 1.4 : ms < 3 * 864e5 ? 1.1 : 0.8
    const catX = CAT_X[r.market.category] || 1
    const liq = Math.min(1, r.market.volume / 3000)
    return (vol * 900 + Math.abs(mom) * 450 + nearMoney * 0.9 + 0.08) * urgency * catX * (0.35 + 0.65 * liq)
  }, [volStats])

  // ── SWARM CORTEX: 262,144 online-learning agents ───────────────────────────
  /** The 9 live tape features every agent reads. Each ≈ [-1, 1]. */
  const swarmFeatures = useCallback((r: Row): number[] => {
    const t = r.market.ticker
    const h = hist.current[t] || []
    const p = px.current[t] ?? r.market.yesPrice
    const at = (k: number) => h.length > k ? h[h.length - 1 - k] : (h[0] ?? p)
    const cl = (x: number) => clamp(x, -1, 1)
    const ms = +new Date(r.market.closeTime) - Date.now()
    return [
      cl((p - at(5)) * 30),                    // short momentum
      cl((p - at(20)) * 18),                   // long momentum
      cl((p - 2 * at(5) + at(10)) * 30),       // acceleration
      cl((r.market.yesPrice - p) * 12),        // reversion pull toward the board anchor
      cl((0.5 - Math.abs(p - 0.5)) * 4 - 1),   // near-the-money
      cl(r.verdict.edge * 8),                  // model edge
      cl(volStats(t).vol * 500),               // realized vol
      ms < 36e5 ? 1 : ms < 864e5 ? 0.2 : -0.6, // urgency
      1,                                       // bias
    ]
  }, [volStats])
  const swarmConvOf = useCallback((t: string) => swarm.current?.conv[t]?.c ?? 0, [])
  // one generation every 5s: settle last votes vs the realized tape, vote again.
  // Runs whether armed or not — the brain trains on live data the whole session.
  useEffect(() => {
    if (!swarm.current) swarm.current = createSwarm()
    const id = setInterval(() => {
      const sw = swarm.current!; const rs = rowsRef.current
      if (!rs.length) return
      const targets = [...rs].sort((a, b) => degenScore(b) - degenScore(a)).slice(0, SWARM_TARGETS)
      const s = rs.find((r) => r.market.ticker === selRef.current)
      if (s && !targets.includes(s)) targets.push(s)
      for (const r of targets) swarmStep(sw, r.market.ticker, swarmFeatures(r), px.current[r.market.ticker] ?? r.market.yesPrice)
      sw.gen++
      if (sw.gen % 40 === 0) swarmNormalize(sw)
      if (sw.gen % 24 === 0) {
        const best = targets.map((r) => ({ r, c: sw.conv[r.market.ticker]?.c ?? 0 })).sort((a, b) => Math.abs(b.c) - Math.abs(a.c))[0]
        if (best && Math.abs(best.c) > 0.05) addLog('SYS', `🧠 swarm gen ${sw.gen} · sharpest read: ${best.c > 0 ? 'YES' : 'NO'} ${(Math.abs(best.c) * 100).toFixed(0)}% on ${best.r.market.title.slice(0, 26)}`)
      }
      setSwv((v) => v + 1)
    }, 5000)
    return () => clearInterval(id)
  }, [degenScore, swarmFeatures, addLog])

  // ── LIVE real-time price feed — poll the ACTUAL Kalshi YES mid every ~3.5s ──
  useEffect(() => {
    if (status !== 'live') return
    let stop = false
    const poll = async () => {
      const rs = rowsRef.current; if (!rs.length) return
      const tickers = rs.map((r) => r.market.ticker)
      try {
        const res = await fetch('/api/edge/prices?tickers=' + encodeURIComponent(tickers.join(',')), { cache: 'no-store' })
        if (!res.ok) return
        const d = await res.json()
        const pr = d.prices || {}
        let n = 0
        for (const t of Object.keys(pr)) { const y = pr[t]?.yes; if (typeof y === 'number') { px.current[t] = clamp01(y); pushHist(t, px.current[t]); n++ } }
        setPxv((v) => v + 1)
        if (n) setLastPx(Date.now())
      } catch { /* keep last known prices */ }
    }
    poll()
    const id = setInterval(() => { if (!stop) poll() }, 3500)
    return () => { stop = true; clearInterval(id) }
  }, [status, pushHist])

  // ── OFFLINE demo only: a gentle random walk so the demo still animates. ─────
  useEffect(() => {
    if (status !== 'demo') return
    const id = setInterval(() => {
      const rs = rowsRef.current; if (!rs.length) return
      for (const r of rs) {
        const anchor = r.market.yesPrice, cur = px.current[r.market.ticker] ?? anchor
        const heat = (CAT_X[r.market.category] || 1) - 0.85
        const step = (Math.random() - 0.5) * 0.012 * (1 + heat * 2) + (anchor - cur) * 0.05
        px.current[r.market.ticker] = clamp01(cur + step)
        pushHist(r.market.ticker, px.current[r.market.ticker])
      }
      setPxv((v) => v + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [status, pushHist])

  // portfolio mark-to-market
  const pfStats = useMemo(() => {
    let value = 0, invested = 0
    const marks = pf.positions.map((p) => {
      const cur = clamp01(priceOf(p.ticker, p.side) ?? p.entry)
      const val = p.stake * (cur / clamp01(p.entry)); value += val; invested += p.stake
      return { ...p, cur, val, pnl: val - p.stake }
    })
    const equity = pf.cash + value
    return { marks, value, invested, equity, totalPnl: equity - START_BANK + pf.realized }
  }, [pf, priceOf, pxv]) // eslint-disable-line react-hooks/exhaustive-deps

  // equity curve sampler (1s)
  useEffect(() => { const id = setInterval(() => setEq((e) => [...e, pfStats.equity].slice(-140)), 1000); return () => clearInterval(id) }, [pfStats.equity])

  // ── trade actions ─────────────────────────────────────────────────────────
  const buy = useCallback((row: Row, side: 'YES' | 'NO', stake: number, isAuto = false, degen = false) => {
    const entry = clamp01(priceOf(row.market.ticker, side) ?? (side === 'YES' ? row.market.yesPrice : row.market.noPrice))
    setPf((p) => p.cash < stake ? p : ({ ...p, cash: +(p.cash - stake).toFixed(2), positions: [{ id: row.market.ticker + '-' + side + '-' + Date.now() + '-' + Math.round(Math.random() * 1e4), ticker: row.market.ticker, title: row.market.title, side, stake, entry, ts: Date.now(), auto: isAuto, degen }, ...p.positions].slice(0, 30) }))
    return entry
  }, [priceOf])
  const closePos = useCallback((pos: Pos, reason: LogEntry['kind']) => {
    const cur = clamp01(priceOf(pos.ticker, pos.side) ?? pos.entry)
    const val = pos.stake * (cur / clamp01(pos.entry)); const pnl = val - pos.stake
    setPf((p) => p.positions.some((x) => x.id === pos.id) ? ({ ...p, cash: +(p.cash + val).toFixed(2), realized: +(p.realized + pnl).toFixed(2), positions: p.positions.filter((x) => x.id !== pos.id) }) : p)
    if (pos.auto) setSess((s) => ({ trades: s.trades + 1, wins: s.wins + (pnl >= 0 ? 1 : 0), pnl: +(s.pnl + pnl).toFixed(2) }))
    if (reason !== 'EXIT') addLog(reason, `${reason === 'TP' ? 'TAKE-PROFIT' : reason === 'SL' ? 'STOP-LOSS' : 'EXIT'} ${pos.side} ${pos.title.slice(0, 28)} · ${pnl >= 0 ? '+' : ''}${money(pnl, 2)}`)
  }, [priceOf, addLog])

  // ── position manager (1s): TP / SL / time exits — per-strategy bands ────────
  useEffect(() => {
    const id = setInterval(() => {
      for (const p of pfRef.current.positions) {
        const [tp, sl, age] = p.degen ? [D_TP, D_SL, D_AGE] : [TP, SL, MAX_AGE]
        const cur = clamp01(priceOf(p.ticker, p.side) ?? p.entry)
        const pnlPct = cur / clamp01(p.entry) - 1
        if (pnlPct >= tp) closePos(p, 'TP')
        else if (pnlPct <= -sl) closePos(p, 'SL')
        else if (Date.now() - p.ts > age) closePos(p, pnlPct >= 0 ? 'TP' : 'SL')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [priceOf, closePos])

  /** Pick the next candidate for the active strategy. */
  const pickCandidate = useCallback((rs: Row[], open: Set<string>): { row: Row; side: 'YES' | 'NO'; conv: number; why: string } | null => {
    if (stratRef.current === 'degen') {
      const sw = swarm.current
      // the swarm picks: conviction × volatility, and it only fires when the
      // hedge-weighted population actually leans (D_CONV_MIN)
      if (sw && sw.gen >= 3) {
        const ranked = rs.filter((r) => !open.has(r.market.ticker))
          .map((r) => { const c = sw.conv[r.market.ticker]?.c ?? 0; return { r, c, s: degenScore(r) * (0.35 + Math.abs(c) * 1.3) } })
          .filter((x) => x.s > 0.1 && Math.abs(x.c) >= D_CONV_MIN)
          .sort((a, b) => b.s - a.s)
        const top = ranked[0]; if (!top) return null
        const side: 'YES' | 'NO' = top.c > 0 ? 'YES' : 'NO'
        return { row: top.r, side, conv: top.c, why: `swarm ${(Math.abs(top.c) * 100).toFixed(0)}% ${side} · volx ${degenScore(top.r).toFixed(2)}` }
      }
      // swarm still warming up — fall back to raw momentum
      const ranked = rs.filter((r) => !open.has(r.market.ticker) && degenScore(r) > 0.15)
        .sort((a, b) => degenScore(b) - degenScore(a))
      const r = ranked[0]; if (!r) return null
      const { mom } = volStats(r.market.ticker)
      const side: 'YES' | 'NO' = Math.abs(mom) >= 0.015 ? (mom > 0 ? 'YES' : 'NO') : r.verdict.side
      return { row: r, side, conv: 0, why: `warming up · volx ${degenScore(r).toFixed(2)} · mom ${mom >= 0 ? '+' : ''}${(mom * 100).toFixed(1)}¢` }
    }
    const r = rs.filter((x) => netEdgeOf(x.verdict) >= NET_MIN && !open.has(x.market.ticker)).sort((a, b) => netEdgeOf(b.verdict) - netEdgeOf(a.verdict))[0]
    return r ? { row: r, side: r.verdict.side, conv: 0, why: `net +${(netEdgeOf(r.verdict) * 100).toFixed(1)}pt` } : null
  }, [degenScore, volStats])

  // ── AUTO engine — paper OR live (real money), fires every 5s ────────────────
  useEffect(() => {
    if (!auto) return
    const live = autoMode === 'live'
    const dg = stratRef.current === 'degen'
    addLog('SYS', live ? `🔴 LIVE AUTO ARMED · REAL MONEY · ${dg ? 'DEGEN' : 'SNIPER'} · 5s` : `⚡ AUTO ARMED · paper · ${dg ? '🔥 DEGEN' : 'SNIPER'} · 5s`)
    const id = setInterval(async () => {
      const rs = rowsRef.current
      const degen = stratRef.current === 'degen'
      if (live) {
        if (!conn) { addLog('SYS', 'not connected — disarming'); setAuto(false); return }
        const ls = liveRef.current, cfg = liveCfg.current
        if (ls.trades >= cfg.maxTrades) { addLog('SYS', `trade cap ${cfg.maxTrades} hit — disarming`); setAuto(false); return }
        const open = new Set(ls.positions.map((x) => x.ticker))
        const cand = pickCandidate(rs, open)
        if (!cand) { addLog('SCAN', degen ? 'tape is dead — no vol worth chasing' : 'nothing clears fees + spread — standing down (this is the point)'); return }
        const side = cand.side.toLowerCase() as 'yes' | 'no'
        const price = clamp01(priceOf(cand.row.market.ticker, cand.side) ?? cand.row.verdict.marketProb)
        const yesPx = clamp01(priceOf(cand.row.market.ticker, 'YES') ?? (side === 'yes' ? price : 1 - price))
        const cost = price * cfg.contracts
        if (ls.spent + cost > cfg.budget) { addLog('SYS', `budget ${money(cfg.budget)} reached — disarming`); setAuto(false); return }
        setFiring(true); setTimeout(() => setFiring(false), 600)
        addLog('FIRE', `LIVE FIRE ${side.toUpperCase()} ×${cfg.contracts} ${cand.row.market.title.slice(0, 22)} @ ${(price * 100).toFixed(0)}¢ · ${cand.why}`)
        const r = await placeOrder(conn, cand.row.market.ticker, side, cfg.contracts, 'buy', yesPx)
        if (!r.ok) { addLog('SYS', `❌ rejected: ${errMsg(r)} — disarming`); setAuto(false); return }
        addLog('FILL', `LIVE FILLED ${side.toUpperCase()} ×${cfg.contracts} — real order sent`)
        setLiveState((s) => ({ spent: +(s.spent + cost).toFixed(2), trades: s.trades + 1, positions: [{ id: cand.row.market.ticker + '-' + Date.now(), ticker: cand.row.market.ticker, title: cand.row.market.title, side, count: cfg.contracts, entry: price, ts: Date.now(), degen }, ...s.positions] }))
        try { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } catch { }
      } else {
        const p = pfRef.current
        addLog('SCAN', degen ? `🧠 swarm gen ${swarm.current?.gen ?? 0} · hunting across ${rs.length} markets` : `scanning ${rs.length} markets · consensus tick`)
        const open = new Set(p.positions.map((x) => x.ticker))
        const maxOpen = degen ? D_MAX_OPEN : MAX_OPEN
        if (p.positions.length >= maxOpen) { addLog('SYS', `holding ${p.positions.length}/${maxOpen} — waiting for exits`); return }
        const cand = pickCandidate(rs, open)
        if (!cand) { addLog('SCAN', degen ? 'swarm is split — no conviction, standing down' : `nothing clears costs (need ${(NET_MIN * 100).toFixed(0)}pt net) — standing down`); return }
        // conviction-scaled sizing: the harder the swarm leans, the bigger the ticket
        const ticket = degen ? Math.min(Math.round(D_TICKET * (1 + Math.abs(cand.conv))), Math.floor(p.cash * 0.4)) : TICKET
        if (p.cash < ticket || ticket < 10) { addLog('SYS', 'bankroll exhausted — reset to keep trading'); return }
        setFiring(true); setTimeout(() => setFiring(false), 600)
        addLog('FIRE', `FIRE ${cand.side} ${money(ticket)} ${cand.row.market.title.slice(0, 24)} @ ${american(clamp01(priceOf(cand.row.market.ticker, cand.side) ?? 0.5))} · ${cand.why}`)
        const entry = buy(cand.row, cand.side, ticket, true, degen)
        const [tp, sl] = degen ? [D_TP, D_SL] : [TP, SL]
        setTimeout(() => addLog('FILL', `FILLED ${cand.side} ${money(ticket)} @ ${(entry * 100).toFixed(0)}¢ · TP +${(tp * 100).toFixed(0)}% / SL −${(sl * 100).toFixed(0)}%`), 320)
      }
    }, 5000)
    return () => { clearInterval(id); addLog('SYS', '⏸ auto engine disarmed') }
  }, [auto, autoMode, conn, buy, addLog, priceOf, pickCandidate])

  // ── LIVE auto exit manager: close real positions on TP/SL/time via sell ────
  useEffect(() => {
    if (autoMode !== 'live' || !conn) return
    const id = setInterval(async () => {
      for (const p of liveRef.current.positions) {
        const [tp, sl, age] = p.degen ? [D_TP, D_SL, D_AGE] : [TP, SL, MAX_AGE]
        const cur = clamp01(priceOf(p.ticker, p.side === 'yes' ? 'YES' : 'NO') ?? p.entry)
        const pnl = cur / clamp01(p.entry) - 1
        if (pnl >= tp || pnl <= -sl || Date.now() - p.ts > age) {
          setLiveState((s) => ({ ...s, positions: s.positions.filter((x) => x.id !== p.id) })) // optimistic — avoid double-close
          const r = await placeOrder(conn, p.ticker, p.side, p.count, 'sell', clamp01(priceOf(p.ticker, 'YES') ?? (p.side === 'yes' ? cur : 1 - cur)))
          addLog(pnl >= 0 ? 'TP' : 'SL', `LIVE CLOSE ${p.side.toUpperCase()} ${p.title.slice(0, 20)} · ${r.ok ? 'sold' : 'sell FAILED: ' + errMsg(r)}`)
          try { const [b, pp] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(pp) } catch { }
        }
      }
    }, 2000)
    return () => clearInterval(id)
  }, [autoMode, conn, priceOf, addLog])

  // arm / disarm / kill
  function toggleAuto() {
    if (auto) { setAuto(false); return }
    if (autoMode === 'live') { if (!conn) { addLog('SYS', 'connect Kalshi to arm live'); setConnect(true); return } setLiveArm(true); return }
    setAuto(true)
  }
  function confirmLiveArm(budget: number, maxTrades: number, contracts: number) { liveCfg.current = { budget, maxTrades, contracts }; setLiveState((s) => ({ spent: 0, trades: 0, positions: s.positions })); setLiveArm(false); setAuto(true) }
  const killLive = useCallback(async () => {
    setAuto(false)
    const ps = liveRef.current.positions
    if (conn && ps.length) { for (const p of ps) { try { await placeOrder(conn, p.ticker, p.side, p.count, 'sell', priceOf(p.ticker, 'YES') ?? undefined) } catch { } } }
    setLiveState((s) => ({ ...s, positions: [] }))
    addLog('SYS', '🛑 KILL — live auto disarmed' + (ps.length ? ' & flattened' : ''))
    try { if (conn) { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } } catch { }
  }, [conn, addLog, priceOf])

  function resetPF() { setPf({ cash: START_BANK, positions: [], realized: 0 }); setSess({ trades: 0, wins: 0, pnl: 0 }); setEq([]) }

  // ── real Kalshi account actions ────────────────────────────────────────────
  const doConnect = useCallback(async (keyId: string, pem: string, demo: boolean): Promise<string | null> => {
    try {
      const key = await importKalshiKey(pem)
      const c: KalshiConn = { keyId: keyId.trim(), key, demo }
      const b = await getBalance(c) // end-to-end validation of the signature
      await saveConn(c.keyId, key, demo); setConn(c); setBal(b); setConnect(false)
      addLog('SYS', `🔗 Kalshi connected (${demo ? 'demo' : 'live'}) · balance ${money(b ?? 0)}`)
      return null
    } catch (e) { return e instanceof Error ? e.message : 'Connection failed.' }
  }, [addLog])
  const doDisconnect = useCallback(() => { clearConn(); setConn(null); setBal(null); setKpos([]); addLog('SYS', 'Kalshi disconnected') }, [addLog])
  const doPlaceReal = useCallback(async (row: Row, side: 'yes' | 'no', count: number): Promise<string | null> => {
    if (!conn) return 'Not connected.'
    const price = priceOf(row.market.ticker, 'YES') ?? undefined
    const r = await placeOrder(conn, row.market.ticker, side, count, 'buy', price)
    if (!r.ok) { addLog('SYS', `❌ order rejected: ${errMsg(r)}`); return errMsg(r) }
    addLog('FILL', `REAL ${side.toUpperCase()} ×${count} ${row.market.title.slice(0, 24)} — sent to Kalshi`)
    try { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } catch { }
    setOrderReq(null); return null
  }, [conn, addLog, priceOf])

  const selRow = rows.find((r) => r.market.ticker === sel) || rows[0]
  const sorted = useMemo(() => {
    let rs = rows; if (worthOnly) rs = rs.filter((r) => r.verdict.worthIt)
    return [...rs].sort((a, b) => sortKey === 'vol' ? b.market.volume - a.market.volume : sortKey === 'volx' ? degenScore(b) - degenScore(a) : netEdgeOf(b.verdict) - netEdgeOf(a.verdict))
  }, [rows, sortKey, worthOnly, degenScore, pxv]) // eslint-disable-line react-hooks/exhaustive-deps
  const worthCount = rows.filter((r) => r.verdict.worthIt).length
  // top movers over the last ~40s — the pulse of the tape
  const movers = useMemo(() => rows
    .map((r) => ({ r, mom: volStats(r.market.ticker).mom }))
    .filter((x) => Math.abs(x.mom) > 0.001)
    .sort((a, b) => Math.abs(b.mom) - Math.abs(a.mom)).slice(0, 6),
  [rows, volStats, pxv]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{
      background: C.bg, color: C.ink, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: C.sans, overflow: 'hidden', position: 'relative',
      backgroundImage: `radial-gradient(1100px 480px at 72% -12%, ${accent}0e, transparent), radial-gradient(800px 400px at 8% 112%, ${C.cyan}0a, transparent), linear-gradient(rgba(120,255,170,.028) 1px, transparent 1px), linear-gradient(90deg, rgba(120,255,170,.028) 1px, transparent 1px)`,
      backgroundSize: 'auto, auto, 42px 42px, 42px 42px',
    }}>
      <style>{`
        *{scrollbar-width:thin;scrollbar-color:${C.line} transparent}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px}
        @keyframes mx-tape{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes mx-log{from{opacity:0;transform:translateX(-8px)}to{opacity:1}}
        @keyframes mx-armed{0%,100%{box-shadow:0 0 0 ${C.green}00}50%{box-shadow:0 0 22px ${C.green}66}}
        @keyframes mx-fire{0%{opacity:.9}100%{opacity:0}}
        @keyframes mx-up{0%{background:${C.green}30}100%{background:transparent}}
        @keyframes mx-dn{0%{background:${C.red}30}100%{background:transparent}}
        @keyframes mx-stripes{0%{background-position:0 0}100%{background-position:56px 0}}
        @keyframes mx-blink{0%,100%{opacity:1}50%{opacity:.35}}
        .mx-btn{cursor:pointer;font-family:${C.mono};border-radius:7px;border:1px solid ${C.line};background:${C.panel2};color:${C.ink};transition:all .15s}
        .mx-btn:hover{border-color:${accent}66}
        .mx-row{transition:background .15s}
        .mx-row:hover{background:${C.panel2}}
      `}</style>

      {firing && !reduced && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none', boxShadow: `inset 0 0 120px ${accent}55`, animation: 'mx-fire .6s ease forwards' }} />}
      {/* scanlines */}
      <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 40, pointerEvents: 'none', opacity: 0.2, background: 'repeating-linear-gradient(180deg, rgba(0,0,0,.16) 0 1px, transparent 1px 3px)' }} />

      {/* STATUS BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '8px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(13,15,18,.82)', flexWrap: 'wrap', position: 'relative', zIndex: 60 }}>
        <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', color: C.dim, textDecoration: 'none' }}><ArrowLeft size={14} /></Link>
        <span style={{ fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.12em', display: 'inline-flex', alignItems: 'center', gap: 7, textShadow: `0 0 18px ${accent}66` }}><Cpu size={15} style={{ color: accent }} />PROJECT <span style={{ color: accent }}>MATRIX</span></span>
        <Metric label="feed" value={status === 'live' ? 'LIVE·KALSHI' : status === 'demo' ? 'DEMO' : 'BOOT'} color={status === 'live' ? C.green : C.amber} dot />
        <Metric label="px" value={status === 'live' ? `REAL${lastPx ? ` ·${Math.max(0, Math.round((Date.now() - lastPx) / 1000))}s` : ' ·live'}` : status === 'demo' ? 'SIM·demo' : '—'} color={status === 'live' ? C.green : C.cyan} dot={status === 'live'} />
        <Metric label="swarm" value={`${SWARM_N.toLocaleString()} · gen ${swarm.current?.gen ?? 0}`} color={accent} dot />
        <Metric label="P&L" value={`${pfStats.totalPnl >= 0 ? '+' : ''}${money(pfStats.totalPnl, 0)}`} color={pfStats.totalPnl >= 0 ? C.green : C.red} />
        {/* STRATEGY toggle */}
        <span style={{ display: 'inline-flex', border: `1px solid ${strat === 'degen' ? C.hot + '77' : C.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {(['sniper', 'degen'] as const).map((m) => (
            <button key={m} disabled={auto} onClick={() => { setStrat(m); setSortKey(m === 'degen' ? 'volx' : 'edge') }} title={m === 'degen' ? `${SWARM_N.toLocaleString()}-agent learning swarm hunts vol — big tickets, wide TP/SL` : 'Patient value — only fires past fees + spread'}
              style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '7px 11px', border: 'none', cursor: auto ? 'not-allowed' : 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, color: strat === m ? C.bg : C.dim, background: strat === m ? (m === 'degen' ? C.hot : C.emerald) : 'transparent' }}>
              {m === 'degen' ? <Flame size={11} /> : <Crosshair size={11} />}{m.toUpperCase()}
            </button>
          ))}
        </span>
        {/* AUTO mode + toggle */}
        <span style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {(['paper', 'live'] as const).map((m) => (
            <button key={m} disabled={auto} onClick={() => setAutoMode(m)} style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '7px 11px', border: 'none', cursor: auto ? 'not-allowed' : 'pointer', color: autoMode === m ? C.bg : C.dim, background: autoMode === m ? (m === 'live' ? C.red : C.green) : 'transparent' }}>{m.toUpperCase()}</button>
          ))}
        </span>
        <button onClick={toggleAuto} className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', padding: '7px 14px', color: auto ? C.bg : (autoMode === 'live' ? C.red : accent), background: auto ? (autoMode === 'live' ? C.red : accent) : 'transparent', border: `1px solid ${autoMode === 'live' ? C.red : accent}`, animation: auto && !reduced ? 'mx-armed 1.6s infinite' : 'none' }}>
          {auto ? <Pause size={14} /> : <Play size={14} />} {auto ? (autoMode === 'live' ? 'LIVE · ARMED' : 'AUTO · ARMED') : 'ARM'}
        </button>
        {conn ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, fontWeight: 700, padding: '5px 6px 5px 11px', borderRadius: 8, color: C.green, border: `1px solid ${C.green}44`, background: `${C.green}10` }}>
            <Wallet size={13} /> LIVE · {bal == null ? '—' : money(bal, 0)}
            <button onClick={doDisconnect} className="mx-btn" title="Disconnect" style={{ padding: '3px 5px', color: C.dim, background: 'transparent', border: 'none', display: 'grid', placeItems: 'center' }}><LogOut size={12} /></button>
          </span>
        ) : (
          <button onClick={() => setConnect(true)} className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 800, padding: '7px 12px', color: '#04140c', background: KAL_GREEN, border: 'none' }}>
            <Link2 size={13} /> CONNECT KALSHI
          </button>
        )}
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 10, alignItems: 'center' }}>
          <Clock />
          <a href={APP_FILE} download="Project-Matrix.html" className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '7px 12px', textDecoration: 'none', color: C.bg, background: C.green, border: 'none' }}><Download size={13} /> Download</a>
        </span>
      </div>

      {/* PRICE TAPE */}
      <Tape rows={rows} live={(t) => px.current[t]} reduced={reduced} onPick={setSel} v={pxv} />

      {/* LIVE-ARMED banner — real money, always visible with KILL */}
      {auto && autoMode === 'live' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', borderBottom: `1px solid ${C.red}55`, flexWrap: 'wrap', position: 'relative', zIndex: 60, background: `repeating-linear-gradient(45deg, ${C.red}1e 0 14px, ${C.red}0a 14px 28px)`, animation: reduced ? 'none' : 'mx-stripes 1.4s linear infinite' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: C.red }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: C.red, boxShadow: `0 0 10px ${C.red}`, animation: reduced ? 'none' : 'mx-blink 1.2s infinite' }} /> LIVE AUTO · REAL MONEY · {strat === 'degen' ? '🔥 DEGEN' : 'SNIPER'}
          </span>
          <Metric label="spent" value={`${money(liveState.spent, 2)} / ${money(liveCfg.current.budget)}`} color={C.amber} />
          <Metric label="orders" value={`${liveState.trades} / ${liveCfg.current.maxTrades}`} color={C.dim} />
          <Metric label="size" value={`×${liveCfg.current.contracts}`} color={C.cyan} />
          <Metric label="open" value={`${liveState.positions.length}`} color={C.cyan} />
          <button onClick={killLive} className="mx-btn" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', padding: '8px 18px', color: '#fff', background: C.red, border: 'none', boxShadow: `0 0 18px ${C.red}55` }}>🛑 KILL &amp; FLATTEN</button>
        </div>
      )}

      {/* MAIN GRID */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px 1fr 350px', gap: 1, background: C.line, position: 'relative', zIndex: 30 }}>
        {/* LEFT */}
        <div style={{ background: 'rgba(13,15,18,.9)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PanelHead icon={<Brain size={13} />}>Swarm cortex · {SWARM_N.toLocaleString()}</PanelHead>
          <div style={{ height: 128, flexShrink: 0 }}><AgentHub reduced={reduced} activity={selRow ? consensus(agentVotes(selRow)).spread : 0.1} firing={firing} hot={strat === 'degen'} /></div>
          {/* hedge-weighted swarm read on the selected market */}
          {(() => {
            void swv
            const sw = swarm.current
            const cv = selRow ? sw?.conv[selRow.market.ticker] : undefined
            const c = cv?.c ?? 0
            const active = cv ? cv.bulls + cv.bears : 0
            return (
              <div style={{ padding: '8px 12px 10px', borderBottom: `1px solid ${C.line}`, flexShrink: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                  <span style={{ fontFamily: C.mono, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>swarm read · gen {sw?.gen ?? 0}</span>
                  <span style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 800, color: !cv || Math.abs(c) < 0.03 ? C.dim : c > 0 ? C.green : C.red }}>{!cv ? '—' : `${c > 0 ? 'YES' : 'NO'} ${(Math.abs(c) * 100).toFixed(0)}%`}</span>
                </div>
                <div style={{ position: 'relative', height: 7, background: 'rgba(255,255,255,.05)', borderRadius: 4, marginTop: 6, overflow: 'hidden' }}>
                  <i style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: `${Math.abs(c) * 50}%`, transform: c < 0 ? 'translateX(-100%)' : 'none', background: c > 0 ? C.green : C.red, borderRadius: 4, transition: 'all .5s' }} />
                  <i style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: 'rgba(255,255,255,.25)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: 8.5, color: C.faint, marginTop: 5 }}>
                  <span><b style={{ color: C.green }}>{(cv?.bulls ?? 0).toLocaleString()}</b> bull</span>
                  <span>{active ? `${((active / SWARM_N) * 100).toFixed(1)}% voting` : 'warming up…'}</span>
                  <span><b style={{ color: C.red }}>{(cv?.bears ?? 0).toLocaleString()}</b> bear</span>
                </div>
              </div>
            )
          })()}
          <PanelHead icon={<Flame size={13} />}>Movers · last 40s</PanelHead>
          <div style={{ flexShrink: 0 }}>
            {movers.length === 0 ? <div style={{ padding: '9px 12px', fontFamily: C.mono, fontSize: 9.5, color: C.faint }}>tape warming up…</div> :
              movers.map(({ r, mom }) => (
                <div key={r.market.ticker} className="mx-row" onClick={() => setSel(r.market.ticker)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderBottom: `1px solid ${C.line}` }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, color: mom > 0 ? C.green : C.red, width: 42, flexShrink: 0 }}>{mom > 0 ? '▲' : '▼'}{Math.abs(mom * 100).toFixed(1)}¢</span>
                  <span style={{ fontSize: 10.5, color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.market.title}</span>
                </div>
              ))}
          </div>
          <PanelHead icon={<Signal size={13} />}>Agent votes</PanelHead>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {selRow && agentVotes(selRow).sort((a, b) => b.a.elo - a.a.elo).map((v) => {
              const Icon = v.a.icon
              return (
                <div key={v.a.key} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center', padding: '5px 12px', borderBottom: `1px solid ${C.line}` }}>
                  <Icon size={12} style={{ color: v.side === 'YES' ? C.green : C.red }} />
                  <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 11, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.a.name}</span><span style={{ fontFamily: C.mono, fontSize: 8, color: C.faint }}>Elo {v.a.elo}</span></span>
                  <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: v.side === 'YES' ? C.green : C.red }}>{(v.p * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER */}
        <div style={{ background: 'rgba(13,15,18,.9)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Activity size={13} style={{ color: accent }} /> Board · {sorted.length}</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.emerald, border: `1px solid ${C.emerald}33`, background: `${C.emerald}10`, padding: '3px 8px', borderRadius: 6 }}>{worthCount} worth it</span>
            {strat === 'degen' && <span style={{ fontFamily: C.mono, fontSize: 10, color: C.hot, border: `1px solid ${C.hot}44`, background: `${C.hot}12`, padding: '3px 8px', borderRadius: 6 }}>🔥 VOL HUNT</span>}
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
              <button className="mx-btn" onClick={() => setWorthOnly((w) => !w)} style={{ fontSize: 10, padding: '5px 9px', color: worthOnly ? C.bg : C.dim, background: worthOnly ? C.green : C.panel2, border: 'none' }}>WORTH-IT</button>
              {(['edge', 'vol', 'volx'] as const).map((k) => <button key={k} className="mx-btn" onClick={() => setSortKey(k)} style={{ fontSize: 10, padding: '5px 9px', color: sortKey === k ? (k === 'volx' ? C.hot : C.green) : C.dim }}>{k === 'volx' ? '🔥VOLX' : k.toUpperCase()}</button>)}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {status === 'boot' ? <div style={{ padding: 40, textAlign: 'center', color: C.dim, fontFamily: C.mono }}>Booting the cortex…</div> :
              sorted.map((r) => <BoardRow key={r.market.ticker} row={r} live={priceOf(r.market.ticker, 'YES') ?? r.market.yesPrice} spark={hist.current[r.market.ticker] || []} vol={volStats(r.market.ticker).vol} score={degenScore(r)} conv={swarmConvOf(r.market.ticker)} strat={strat} reduced={reduced} held={pf.positions.some((p) => p.ticker === r.market.ticker)} active={r.market.ticker === sel} onClick={() => setSel(r.market.ticker)} />)}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background: 'rgba(13,15,18,.9)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: '1 1 52%', overflow: 'auto', borderBottom: `1px solid ${C.line}` }}>
            {selRow ? <Detail row={selRow} live={priceOf(selRow.market.ticker, 'YES') ?? selRow.market.yesPrice} spark={hist.current[selRow.market.ticker] || []} vol={volStats(selRow.market.ticker)} score={degenScore(selRow)} strat={strat} onBuy={(r, s) => buy(r, s, strat === 'degen' ? D_TICKET : 50, false, strat === 'degen')} connected={!!conn} onReal={(r, s) => setOrderReq({ row: r, side: s })} /> : <div style={{ padding: 30, color: C.dim }}>Select a market.</div>}
          </div>
          <div style={{ flex: '1 1 48%', overflow: 'auto' }}>
            <Portfolio stats={pfStats} eq={eq} onClose={(p) => closePos(p, 'EXIT')} onReset={resetPF} kpos={kpos} connected={!!conn} bal={bal} />
          </div>
        </div>
      </div>

      {/* EXECUTION CONSOLE */}
      <ExecConsole auto={auto} firing={firing} log={log} eq={eq} stats={pfStats} sess={sess} reduced={reduced} strat={strat} />

      {connect && <ConnectModal onClose={() => setConnect(false)} onConnect={doConnect} />}
      {orderReq && <OrderConfirm req={orderReq} live={priceOf(orderReq.row.market.ticker, orderReq.side === 'yes' ? 'YES' : 'NO') ?? 0.5} onClose={() => setOrderReq(null)} onConfirm={doPlaceReal} />}
      {liveArm && <LiveArmModal bal={bal} degen={strat === 'degen'} onClose={() => setLiveArm(false)} onArm={confirmLiveArm} />}
    </div>
  )
}

// ── scrolling price tape ─────────────────────────────────────────────────────
function Tape({ rows, live, reduced, onPick, v }: { rows: Row[]; live: (t: string) => number | undefined; reduced: boolean; onPick: (t: string) => void; v: number }) {
  void v // re-render on price ticks
  const items = rows.slice(0, 28)
  if (!items.length) return null
  const strip = (k: number) => items.map((r) => {
    const p = live(r.market.ticker) ?? r.market.yesPrice
    const d = Math.round((p - r.market.yesPrice) * 100)
    const [g, c] = catOf(r.market.category)
    return (
      <span key={k + r.market.ticker} onClick={() => onPick(r.market.ticker)} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, cursor: 'pointer', padding: '0 14px', borderRight: `1px solid ${C.line}` }}>
        <span style={{ fontSize: 10 }}>{g}</span>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: c, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.market.title}</span>
        <b style={{ fontFamily: C.mono, fontSize: 11, color: C.ink }}>{Math.round(p * 100)}¢</b>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, fontWeight: 800, color: d > 0 ? C.green : d < 0 ? C.red : C.faint }}>{d > 0 ? '▲' + d : d < 0 ? '▼' + Math.abs(d) : '·'}</span>
      </span>
    )
  })
  return (
    <div style={{ overflow: 'hidden', borderBottom: `1px solid ${C.line}`, background: C.deep, padding: '5px 0', position: 'relative', zIndex: 55 }}>
      <div style={{ display: 'inline-flex', whiteSpace: 'nowrap', animation: reduced ? 'none' : `mx-tape ${items.length * 2.2}s linear infinite`, willChange: 'transform' }}>
        {strip(0)}{strip(1)}
      </div>
    </div>
  )
}

function Clock() {
  const [t, setT] = useState('')
  useEffect(() => { const f = () => setT(new Date().toLocaleTimeString('en-US', { hour12: false })); f(); const id = setInterval(f, 1000); return () => clearInterval(id) }, [])
  return <span style={{ fontFamily: C.mono, fontSize: 11, color: C.dim, fontVariantNumeric: 'tabular-nums' }}>{t}</span>
}

// ── arm LIVE auto (real money) — budget + typed confirmation ────────────────────
function LiveArmModal({ bal, degen, onClose, onArm }: { bal: number | null; degen: boolean; onClose: () => void; onArm: (budget: number, maxTrades: number, contracts: number) => void }) {
  const [budget, setBudget] = useState(20)
  const [maxTrades, setMaxTrades] = useState(12)
  const [contracts, setContracts] = useState(1)
  const [ack, setAck] = useState('')
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const ok = ack.trim().toUpperCase() === 'ARM LIVE'
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.85)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px,95vw)', background: C.bg, border: `1px solid ${C.red}66`, borderRadius: 16, padding: 'clamp(22px,4vw,30px)', boxShadow: `0 0 80px ${C.red}25`, maxHeight: '92vh', overflow: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.red }}><AlertTriangle size={14} /> Arm LIVE auto · real money{degen ? ' · 🔥 DEGEN' : ''}</span>
        <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>The bot will spend real money by itself.</h3>
        <p style={{ margin: '0 0 8px', color: C.dim, fontSize: 13.5, lineHeight: 1.6 }}>
          Once armed, MATRIX places real market orders on your Kalshi account every ~5s ({degen ? 'chasing the most volatile market on the tape' : 'best available net edge'}), and closes them on TP/SL/time — no per-order confirmation. It stops the instant a cap or an error is hit.
        </p>
        <p style={{ margin: '0 0 14px', fontFamily: C.mono, fontSize: 11, color: C.amber, lineHeight: 1.6, border: `1px solid ${C.amber}33`, background: `${C.amber}0c`, borderRadius: 8, padding: '9px 11px' }}>
          Reality check: the signal is a transparent demo ensemble, not a proven, backtested edge.{degen ? ' DEGEN mode deliberately maximizes variance — it can lose the whole budget fast. That is the trade you are choosing.' : ' On a fast loop it will most likely bleed to fees + spread.'} Keep the budget tiny. Balance: <b style={{ color: C.ink }}>{bal == null ? '—' : money(bal, 2)}</b>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
          <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Budget ($)
            <input type="number" min={1} max={2000} value={budget} onChange={(e) => setBudget(clamp(Number(e.target.value) || 0, 1, 2000))} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 15, padding: '10px 12px', outline: 'none' }} /></label>
          <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Max orders
            <input type="number" min={1} max={200} value={maxTrades} onChange={(e) => setMaxTrades(clamp(Number(e.target.value) || 0, 1, 200))} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 15, padding: '10px 12px', outline: 'none' }} /></label>
          <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Contracts/order
            <input type="number" min={1} max={100} value={contracts} onChange={(e) => setContracts(clamp(Number(e.target.value) || 0, 1, 100))} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 15, padding: '10px 12px', outline: 'none' }} /></label>
        </div>
        <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Type <b style={{ color: C.red }}>ARM LIVE</b> to confirm
          <input value={ack} onChange={(e) => setAck(e.target.value)} placeholder="ARM LIVE" style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${ok ? C.red : C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 14, padding: '11px 13px', outline: 'none', letterSpacing: '0.1em' }} /></label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} className="mx-btn" style={{ flex: 1, padding: '12px', color: C.dim, background: 'transparent' }}>Cancel</button>
          <button onClick={() => ok && onArm(budget, maxTrades, contracts)} disabled={!ok} className="mx-btn" style={{ flex: 2, padding: '12px', fontWeight: 800, color: ok ? '#fff' : C.faint, background: ok ? C.red : C.panel2, border: 'none', cursor: ok ? 'pointer' : 'not-allowed' }}>Arm live auto · {money(budget)} cap</button>
        </div>
      </div>
    </div>
  )
}

// ── status metric ──────────────────────────────────────────────────────────
function Metric({ label, value, color, dot }: { label: string; value: string; color: string; dot?: boolean }) {
  return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: C.mono, fontSize: 10.5 }}>{dot && <span style={{ width: 7, height: 7, borderRadius: 9, background: color, boxShadow: `0 0 8px ${color}` }} />}<span style={{ color: C.faint, letterSpacing: '0.06em' }}>{label}</span><span style={{ color, fontWeight: 700 }}>{value}</span></span>
}
function PanelHead({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderBottom: `1px solid ${C.line}`, borderTop: `1px solid ${C.line}`, fontFamily: C.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, background: C.deep }}><span style={{ color: C.green }}>{icon}</span>{children}</div>
}

// ── tiny sparkline (board rows) ──────────────────────────────────────────────
function MiniSpark({ data, w = 56, h = 16 }: { data: number[]; w?: number; h?: number }) {
  if (data.length < 3) return <span style={{ display: 'inline-block', width: w, height: h }} />
  const win = data.slice(-30)
  const min = Math.min(...win), max = Math.max(...win), rng = Math.max(max - min, 0.004)
  const up = win[win.length - 1] >= win[0]
  const col = up ? C.green : C.red
  const pts = win.map((d, i) => `${(i / (win.length - 1)) * w},${h - ((d - min) / rng) * (h - 3) - 1.5}`).join(' ')
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.2" opacity="0.9" />
      <circle cx={w} cy={h - ((win[win.length - 1] - min) / rng) * (h - 3) - 1.5} r="1.6" fill={col} />
    </svg>
  )
}
// 5-segment volatility meter
function VolMeter({ vol }: { vol: number }) {
  const lvl = clamp(Math.round(vol * 900), 0, 5)
  return (
    <span style={{ display: 'inline-flex', gap: 2, alignItems: 'flex-end' }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <span key={i} style={{ width: 3, height: 4 + i * 2, borderRadius: 1, background: i < lvl ? (lvl >= 4 ? C.hot : lvl >= 2 ? C.amber : C.green) : 'rgba(255,255,255,.08)' }} />
      ))}
    </span>
  )
}

// ── board row ─────────────────────────────────────────────────────────────────
function BoardRow({ row, live, spark, vol, score, conv, strat, reduced, held, active, onClick }: { row: Row; live: number; spark: number[]; vol: number; score: number; conv: number; strat: Strat; reduced: boolean; held: boolean; active: boolean; onClick: () => void }) {
  const v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  const liveP = Math.round(live * 100), mkt = Math.round(row.market.yesPrice * 100), moved = liveP - mkt
  const net = netEdgeOf(v)
  const hot = strat === 'degen' && score > 0.6
  const accent = strat === 'degen' ? C.hot : C.green
  return (
    <div className="mx-row" onClick={onClick} style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 60px 72px 60px 52px', gap: 9, alignItems: 'center', padding: '8px 14px', borderBottom: `1px solid ${C.line}`, background: active ? `${accent}0c` : held ? `${C.cyan}08` : 'transparent', borderLeft: `2px solid ${active ? accent : held ? C.cyan : 'transparent'}` }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{held && <span style={{ color: C.cyan }}>◉ </span>}{hot && <span style={{ color: C.hot }}>🔥</span>}{row.market.title}</span>
        <span style={{ fontFamily: C.mono, fontSize: 9, display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ color: c }}>{g} {row.market.category}</span> <span style={{ color: C.faint }}>· ⏱{timeToClose(row.market.closeTime)} · {fmtVol(row.market.volume)}v</span> <VolMeter vol={vol} /></span>
      </span>
      <MiniSpark data={spark} />
      <span style={{ textAlign: 'right', fontFamily: C.mono }}>
        <span key={liveP} style={{ display: 'block', fontSize: 13.5, fontWeight: 800, color: C.cyan, borderRadius: 4, padding: '0 3px', animation: reduced || moved === 0 ? 'none' : `${moved > 0 ? 'mx-up' : 'mx-dn'} 1s ease` }}>{liveP}¢</span>
        <span style={{ fontSize: 8.5, color: moved > 0 ? C.green : moved < 0 ? C.red : C.faint }}>{moved > 0 ? '▲' : moved < 0 ? '▼' : '·'}{Math.abs(moved)} live</span>
      </span>
      <span style={{ textAlign: 'right', fontFamily: C.mono }} title={strat === 'degen' ? `degen score ${score.toFixed(2)}` : `raw edge +${(v.edge * 100).toFixed(1)}pt · costs ${(roundTripCost(v.marketProb) * 100).toFixed(1)}pt`}>
        {strat === 'degen'
          ? <><span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: score > 0.6 ? C.hot : score > 0.3 ? C.amber : C.dim }}>{score.toFixed(2)}</span><span style={{ fontSize: 8, color: C.faint }}>VOLX</span></>
          : <><span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: net >= NET_MIN ? C.green : net > 0 ? C.amber : C.dim }}>{net >= 0 ? '+' : ''}{(net * 100).toFixed(1)}</span><span style={{ fontSize: 8, color: C.faint }}>NET EDGE</span></>}
      </span>
      <span style={{ textAlign: 'center' }}>
        {strat === 'degen'
          ? <><span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: Math.abs(conv) < 0.03 ? C.faint : conv > 0 ? C.green : C.red }}>{Math.abs(conv) < 0.03 ? '—' : conv > 0 ? 'YES' : 'NO'}</span>
            <span style={{ display: 'block', fontFamily: C.mono, fontSize: 8, color: Math.abs(conv) >= 0.1 ? C.hot : C.faint }}>{Math.abs(conv) < 0.03 ? 'swarm flat' : `🧠 ${(Math.abs(conv) * 100).toFixed(0)}%`}</span></>
          : <><span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: sideCol }}>{v.side}</span>
            <span style={{ display: 'block', fontFamily: C.mono, fontSize: 8, color: net >= NET_MIN ? C.green : C.faint }}>{net >= NET_MIN ? '● TAKE' : 'pass'}</span></>}
      </span>
    </div>
  )
}

// ── detail ──────────────────────────────────────────────────────────────────
function Detail({ row, live, spark, vol, score, strat, onBuy, connected, onReal }: { row: Row; live: number; spark: number[]; vol: { vol: number; mom: number }; score: number; strat: Strat; onBuy: (r: Row, s: 'YES' | 'NO') => void; connected: boolean; onReal: (r: Row, s: 'yes' | 'no') => void }) {
  const votes = agentVotes(row), cons = consensus(votes), v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  return (
    <div>
      <div style={{ padding: '12px 15px 9px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, color: c }}>{g} {row.market.category} · ⏱ {timeToClose(row.market.closeTime)} · <span style={{ color: C.cyan }}>live {(live * 100).toFixed(0)}¢</span></span>
        <div style={{ fontSize: 14.5, fontWeight: 750, lineHeight: 1.25, margin: '6px 0 0', color: C.ink }}>{row.market.title}</div>
      </div>
      {/* live chart */}
      <div style={{ padding: '8px 15px 4px', borderBottom: `1px solid ${C.line}` }}>
        <DetailChart data={spark} />
        <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: C.mono, fontSize: 8.5, color: C.faint, padding: '3px 0 5px' }}>
          <span>live tape · ~3.5s ticks</span>
          <span>σ <b style={{ color: vol.vol * 900 > 2 ? C.hot : C.dim }}>{(vol.vol * 100).toFixed(2)}¢</b> · mom <b style={{ color: vol.mom > 0 ? C.green : vol.mom < 0 ? C.red : C.dim }}>{vol.mom >= 0 ? '+' : ''}{(vol.mom * 100).toFixed(1)}¢</b>{strat === 'degen' && <> · volx <b style={{ color: score > 0.6 ? C.hot : C.dim }}>{score.toFixed(2)}</b></>}</span>
        </div>
      </div>
      <div style={{ padding: '11px 15px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={`${Math.round(row.pricing.ynProb * 100)}%`} k="Consensus" c={C.cyan} />
        <Cell v={`${Math.round(row.market.yesPrice * 100)}%`} k="Market" c={C.dim} />
        <Cell v={`${v.edge >= 0 ? '+' : ''}${(v.edge * 100).toFixed(1)}pt`} k="Raw edge" c={v.edge >= 0.03 ? C.green : C.dim} />
      </div>
      {(() => { const net = netEdgeOf(v); const take = net >= NET_MIN; return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 15px', borderBottom: `1px solid ${C.line}`, background: take ? `${C.green}0c` : 'transparent' }}>
          <span style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint }}>Net edge · after fees + spread ({(roundTripCost(v.marketProb) * 100).toFixed(1)}pt cost)</span>
          <span style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 800, color: take ? C.green : net > 0 ? C.amber : C.red }}>{net >= 0 ? '+' : ''}{(net * 100).toFixed(1)}pt · {take ? 'TAKE' : 'SKIP'}</span>
        </div>
      ) })()}
      <div style={{ padding: '11px 15px', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>Agent votes · {cons.yesN}Y / {cons.noN}N · spread {(cons.spread * 100).toFixed(0)}pt</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {votes.map((vv) => (
            <div key={vv.a.key} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ fontFamily: C.mono, fontSize: 9, color: C.dim, width: 72, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{vv.a.name}</span>
              <span style={{ position: 'relative', flex: 1, height: 11, background: 'rgba(255,255,255,.04)', borderRadius: 3 }}>
                <i style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${vv.p * 100}%`, background: vv.side === 'YES' ? `${C.green}bb` : `${C.red}bb`, borderRadius: 3 }} />
                <i style={{ position: 'absolute', left: `${live * 100}%`, top: -1, bottom: -1, width: 1.5, background: C.cyan }} />
              </span>
              <span style={{ fontFamily: C.mono, fontSize: 9.5, fontWeight: 700, color: vv.side === 'YES' ? C.green : C.red, width: 28, textAlign: 'right' }}>{(vv.p * 100).toFixed(0)}%</span>
            </div>
          ))}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 8.5, color: C.faint, marginTop: 7 }}><span style={{ color: C.cyan }}>▌</span> live price · bars = each agent&apos;s P(YES)</div>
      </div>
      <div style={{ padding: '11px 15px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={`${v.evPerDollar >= 0 ? '+' : ''}${money(v.evPerDollar * 100)}`} k="EV/$100" c={v.evPerDollar >= 0 ? C.green : C.red} />
        <Cell v={american(v.marketProb)} k="Moneyline" c={C.ink} />
        <Cell v={`${(v.halfKelly * 100).toFixed(1)}%`} k="½-Kelly" c={C.cyan} />
      </div>
      <div style={{ padding: '12px 15px' }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>Manual paper · {strat === 'degen' ? `$${D_TICKET} degen ticket` : '$50 ticket'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mx-btn" onClick={() => onBuy(row, 'YES')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12.5, color: v.side === 'YES' ? C.bg : C.green, background: v.side === 'YES' ? C.green : 'transparent', border: `1px solid ${C.green}` }}>BUY YES · {(live * 100).toFixed(0)}¢</button>
          <button className="mx-btn" onClick={() => onBuy(row, 'NO')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12.5, color: v.side === 'NO' ? C.bg : C.red, background: v.side === 'NO' ? C.red : 'transparent', border: `1px solid ${C.red}` }}>BUY NO · {((1 - live) * 100).toFixed(0)}¢</button>
        </div>
        <div style={{ marginTop: 7, fontFamily: C.mono, fontSize: 9, color: C.faint }}>MATRIX leans <b style={{ color: sideCol }}>{v.side}</b>. Arm AUTO to let the engine {strat === 'degen' ? 'chase vol' : 'scalp value'} on paper.</div>
      </div>
      {/* REAL money — only when a Kalshi account is connected; each order confirmed */}
      <div style={{ padding: '0 15px 14px' }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: connected ? KAL_GREEN : C.faint, marginBottom: 8 }}>Real order {connected ? '· you pick the size' : '· connect Kalshi first'}</div>
        <div style={{ display: 'flex', gap: 8, opacity: connected ? 1 : 0.5 }}>
          <button className="mx-btn" disabled={!connected} onClick={() => connected && onReal(row, 'yes')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12, color: connected ? KAL_GREEN : C.dim, background: 'transparent', border: `1px solid ${connected ? KAL_GREEN : C.line}`, cursor: connected ? 'pointer' : 'not-allowed' }}>◆ REAL YES · {(live * 100).toFixed(0)}¢</button>
          <button className="mx-btn" disabled={!connected} onClick={() => connected && onReal(row, 'no')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12, color: connected ? C.red : C.dim, background: 'transparent', border: `1px solid ${connected ? C.red : C.line}`, cursor: connected ? 'pointer' : 'not-allowed' }}>◆ REAL NO · {((1 - live) * 100).toFixed(0)}¢</button>
        </div>
      </div>
    </div>
  )
}
function Cell({ v, k, c }: { v: string; k: string; c: string }) {
  return <div style={{ background: C.bg, padding: '9px 11px' }}><div style={{ fontFamily: C.mono, fontSize: 'clamp(0.9rem,1.3vw,1.1rem)', fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div><div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint, marginTop: 3 }}>{k}</div></div>
}

// ── detail live chart ─────────────────────────────────────────────────────────
function DetailChart({ data }: { data: number[] }) {
  const W = 320, H = 84
  if (data.length < 3) return <div style={{ height: H, display: 'grid', placeItems: 'center', fontFamily: C.mono, fontSize: 9.5, color: C.faint }}>collecting live ticks…</div>
  const win = data.slice(-60)
  const min = Math.min(...win), max = Math.max(...win), rng = Math.max(max - min, 0.01)
  const up = win[win.length - 1] >= win[0]
  const col = up ? C.green : C.red
  const X = (i: number) => (i / (win.length - 1)) * W
  const Y = (p: number) => H - ((p - min) / rng) * (H - 12) - 6
  const pts = win.map((d, i) => `${X(i)},${Y(d)}`).join(' ')
  const last = win[win.length - 1]
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H, display: 'block' }}>
      <defs><linearGradient id="mx-dc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".28" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="rgba(255,255,255,.05)" strokeWidth="1" />)}
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#mx-dc)" />
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <circle cx={W} cy={Y(last)} r="2.6" fill={col} />
      <text x={W - 4} y={Y(last) - 6} textAnchor="end" fill={col} fontSize="10" fontFamily="monospace" fontWeight="bold">{Math.round(last * 100)}¢</text>
      <text x="3" y="10" fill="rgba(255,255,255,.35)" fontSize="8" fontFamily="monospace">{Math.round(max * 100)}¢</text>
      <text x="3" y={H - 3} fill="rgba(255,255,255,.35)" fontSize="8" fontFamily="monospace">{Math.round(min * 100)}¢</text>
    </svg>
  )
}

// ── portfolio ─────────────────────────────────────────────────────────────────
function Portfolio({ stats, eq, onClose, onReset, kpos, connected, bal }: { stats: { marks: (Pos & { cur: number; val: number; pnl: number })[]; equity: number; totalPnl: number; invested: number }; eq: number[]; onClose: (p: Pos) => void; onReset: () => void; kpos: KPosition[]; connected: boolean; bal: number | null }) {
  const pos = stats.totalPnl >= 0
  return (
    <div>
      {connected && (
        <div style={{ padding: '9px 13px', borderBottom: `1px solid ${C.line}`, background: `${KAL_GREEN}08` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: KAL_GREEN, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Wallet size={12} /> Live Kalshi account</span>
            <span style={{ fontFamily: C.mono, fontSize: 14, fontWeight: 800, color: KAL_GREEN }}>{bal == null ? '—' : money(bal, 2)}</span>
          </div>
          <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.faint, marginTop: 4 }}>{kpos.length ? kpos.slice(0, 4).map((p) => `${p.ticker.slice(0, 14)} ${p.position > 0 ? '+' : ''}${p.position}`).join(' · ') : 'no open contracts on Kalshi'}</div>
        </div>
      )}
      <PanelHead icon={<Layers size={13} />}>Paper portfolio</PanelHead>
      <div style={{ padding: '10px 13px 4px' }}><Spark data={eq} pos={pos} /></div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={money(stats.equity, 0)} k="Equity" c={C.ink} />
        <Cell v={`${pos ? '+' : ''}${money(stats.totalPnl, 0)}`} k="Total P&L" c={pos ? C.green : C.red} />
        <Cell v={money(stats.invested, 0)} k="At risk" c={C.amber} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 13px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint }}>{stats.marks.length} open</span>
        <button className="mx-btn" onClick={onReset} style={{ fontSize: 9, padding: '4px 8px', color: C.dim }}>RESET $1k</button>
      </div>
      {stats.marks.length === 0
        ? <div style={{ padding: 20, textAlign: 'center', color: C.faint, fontFamily: C.mono, fontSize: 11 }}>Flat. Arm AUTO or buy manually.</div>
        : stats.marks.map((p) => {
          const pp = p.pnl >= 0
          const pct = clamp((p.pnl / p.stake) * 100, -100, 100)
          return (
            <div key={p.id} style={{ padding: '8px 13px', borderBottom: `1px solid ${C.line}` }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center' }}>
                <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 11, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.auto && <span style={{ color: p.degen ? C.hot : C.green }}>{p.degen ? '🔥' : '⚡'}</span>}{p.title}</span><span style={{ fontFamily: C.mono, fontSize: 8.5, color: C.faint }}><b style={{ color: p.side === 'YES' ? C.green : C.red }}>{p.side}</b> {money(p.stake)} @ {(p.entry * 100).toFixed(0)}→{(p.cur * 100).toFixed(0)}¢</span></span>
                <span style={{ textAlign: 'right', fontFamily: C.mono }}><span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: pp ? C.green : C.red }}>{pp ? '+' : ''}{money(p.pnl, 2)}</span></span>
                <button className="mx-btn" onClick={() => onClose(p)} style={{ padding: '4px 6px', color: C.dim, display: 'grid', placeItems: 'center' }}><X size={11} /></button>
              </div>
              <div style={{ position: 'relative', height: 3, background: 'rgba(255,255,255,.05)', borderRadius: 2, marginTop: 5 }}>
                <i style={{ position: 'absolute', top: 0, bottom: 0, left: pct >= 0 ? '50%' : `${50 + pct / 2}%`, width: `${Math.abs(pct) / 2}%`, background: pp ? C.green : C.red, borderRadius: 2 }} />
                <i style={{ position: 'absolute', top: -1, bottom: -1, left: '50%', width: 1, background: 'rgba(255,255,255,.2)' }} />
              </div>
            </div>
          )
        })}
    </div>
  )
}
function Spark({ data, pos }: { data: number[]; pos: boolean }) {
  if (data.length < 2) return <div style={{ height: 44, display: 'grid', placeItems: 'center', fontFamily: C.mono, fontSize: 9.5, color: C.faint }}>equity curve — arm AUTO to watch it move</div>
  const min = Math.min(...data), max = Math.max(...data), rng = max - min || 1
  const col = pos ? C.green : C.red
  const pts = data.map((d, i) => `${(i / (data.length - 1)) * 100},${44 - ((d - min) / rng) * 40 - 2}`).join(' ')
  return (
    <svg viewBox="0 0 100 44" preserveAspectRatio="none" style={{ width: '100%', height: 44, display: 'block' }}>
      <defs><linearGradient id="mx-eq" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={col} stopOpacity=".3" /><stop offset="1" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      <polygon points={`0,44 ${pts} 100,44`} fill="url(#mx-eq)" />
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

// ── execution console ─────────────────────────────────────────────────────────
const STAGES: [string, LucideIcon][] = [['SCAN', Signal], ['SIGNAL', Brain], ['SIZE', Crosshair], ['FIRE', Zap], ['FILL', ShieldCheck]]
function ExecConsole({ auto, firing, log, eq, stats, sess, reduced, strat }: { auto: boolean; firing: boolean; log: LogEntry[]; eq: number[]; stats: { totalPnl: number }; sess: { trades: number; wins: number; pnl: number }; reduced: boolean; strat: Strat }) {
  const kindCol: Record<LogEntry['kind'], string> = { SCAN: C.dim, FIRE: C.lime, FILL: C.green, TP: C.green, SL: C.red, EXIT: C.dim, SYS: C.cyan }
  const winRate = sess.trades ? Math.round((sess.wins / sess.trades) * 100) : 0
  const accent = strat === 'degen' ? C.hot : C.green
  const [tp, sl, ticket] = strat === 'degen' ? [D_TP, D_SL, D_TICKET] : [TP, SL, TICKET]
  return (
    <div style={{ height: 168, borderTop: `1px solid ${C.line}`, background: 'rgba(8,9,11,.92)', display: 'grid', gridTemplateColumns: '230px 1fr 220px', gap: 1, position: 'relative', zIndex: 30 }}>
      {/* engine state */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: auto ? accent : C.faint }}>
          {strat === 'degen' ? <Flame size={15} /> : <Rocket size={15} />} {strat === 'degen' ? 'DEGEN' : 'SNIPER'} ENGINE · {auto ? 'ARMED' : 'IDLE'}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {STAGES.map(([s, Ic], i) => {
            const on = auto && (firing || i < 2)
            return (
              <span key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, border: `1px solid ${on ? accent : C.line}`, background: on ? `${accent}18` : 'transparent', color: on ? accent : C.faint, transition: 'all .2s' }}><Ic size={13} /></span>
                <span style={{ fontFamily: C.mono, fontSize: 7, letterSpacing: '0.06em', color: on ? accent : C.faint }}>{s}</span>
              </span>
            )
          })}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.faint, lineHeight: 1.7 }}>
          rules · TP <span style={{ color: C.green }}>+{(tp * 100).toFixed(0)}%</span> · SL <span style={{ color: C.red }}>−{(sl * 100).toFixed(0)}%</span> · ${ticket}{strat === 'degen' ? '–' + D_TICKET * 2 : ''} ticket · max {strat === 'degen' ? D_MAX_OPEN : MAX_OPEN} open{strat === 'degen' && <> · <span style={{ color: C.hot }}>swarm-gated</span></>}
        </div>
      </div>
      {/* log */}
      <div style={{ padding: '10px 0', overflow: 'auto', borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` }}>
        <div style={{ padding: '0 14px 6px', fontFamily: C.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>Execution console</div>
        {log.length === 0 && <div style={{ padding: '10px 14px', fontFamily: C.mono, fontSize: 11, color: C.faint }}>Idle. Press <b style={{ color: accent }}>ARM</b> to start firing.</div>}
        {log.map((e) => (
          <div key={e.id} style={{ display: 'flex', gap: 8, padding: '3px 14px', fontFamily: C.mono, fontSize: 11, animation: reduced ? 'none' : 'mx-log .3s ease both' }}>
            <span style={{ color: C.faint, flexShrink: 0 }}>{e.t}</span>
            <span style={{ color: kindCol[e.kind], fontWeight: 700, width: 40, flexShrink: 0 }}>{e.kind}</span>
            <span style={{ color: C.dim, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.text}</span>
          </div>
        ))}
      </div>
      {/* session stats */}
      <div style={{ padding: '12px 14px' }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>Auto session</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Mini v={`${sess.trades}`} k="trades closed" c={C.ink} />
          <Mini v={`${winRate}%`} k="win rate" c={winRate >= 50 ? C.green : C.amber} />
          <Mini v={`${sess.pnl >= 0 ? '+' : ''}${money(sess.pnl, 1)}`} k="session P&L" c={sess.pnl >= 0 ? C.green : C.red} />
          <Mini v={`${stats.totalPnl >= 0 ? '+' : ''}${money(stats.totalPnl, 0)}`} k="account P&L" c={stats.totalPnl >= 0 ? C.green : C.red} />
        </div>
        <div style={{ marginTop: 8 }}><Spark data={eq} pos={stats.totalPnl >= 0} /></div>
      </div>
    </div>
  )
}
function Mini({ v, k, c }: { v: string; k: string; c: string }) {
  return <div style={{ background: C.bg, border: `1px solid ${C.line}`, borderRadius: 8, padding: '7px 9px' }}><div style={{ fontFamily: C.mono, fontSize: 15, fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div><div style={{ fontFamily: C.mono, fontSize: 8, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.faint, marginTop: 2 }}>{k}</div></div>
}

// ── CONNECT KALSHI (real account) ───────────────────────────────────────────────
function ConnectModal({ onClose, onConnect }: { onClose: () => void; onConnect: (keyId: string, pem: string, demo: boolean) => Promise<string | null> }) {
  const [keyId, setKeyId] = useState(''); const [pem, setPem] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [demo, setDemo] = useState(false)
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  async function go() {
    if (!keyId.trim() || !pem.trim()) { setErr('Paste both your Key ID and private key.'); return }
    setBusy(true); setErr('')
    const e = await onConnect(keyId, pem, demo); setBusy(false)
    if (e) setErr(e)
  }
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.82)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(540px,95vw)', background: C.bg, border: `1px solid ${KAL_GREEN}44`, borderRadius: 16, padding: 'clamp(22px,4vw,30px)', boxShadow: `0 0 80px ${KAL_GREEN}20`, maxHeight: '92vh', overflow: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: KAL_GREEN }}><Link2 size={14} /> Connect your Kalshi account</span>
        <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Your keys, your device.</h3>
        <p style={{ margin: '0 0 14px', color: C.dim, fontSize: 13.5, lineHeight: 1.6 }}>
          Create an API key at <b style={{ color: C.ink }}>kalshi.com → Account → API</b>, then paste the <b style={{ color: C.ink }}>Key ID</b> and the <b style={{ color: C.ink }}>private key</b> (the whole .pem/.key file — either RSA format works, no conversion needed) below. The private key is imported as a non-extractable key and stored only in your browser — it&apos;s never sent to our servers.
        </p>
        <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>API Key ID</label>
        <input value={keyId} onChange={(e) => { setKeyId(e.target.value); setErr('') }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 12px', background: C.deep, border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, fontFamily: C.mono, fontSize: 13, padding: '11px 13px', outline: 'none' }} />
        <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>Private key (PEM)</label>
        <textarea value={pem} onChange={(e) => { setPem(e.target.value); setErr('') }} placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'} spellCheck={false} rows={6}
          style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 6px', background: C.deep, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 9, color: C.ink, fontFamily: C.mono, fontSize: 11.5, padding: '11px 13px', outline: 'none', resize: 'vertical' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 10px' }}>
          <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>Environment</span>
          <span style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
            {([['Production', false], ['Demo', true]] as const).map(([lab, d]) => (
              <button key={lab} type="button" onClick={() => setDemo(d)} style={{ fontFamily: C.mono, fontSize: 10.5, fontWeight: 800, padding: '6px 12px', border: 'none', cursor: 'pointer', color: demo === d ? C.bg : C.dim, background: demo === d ? KAL_GREEN : 'transparent' }}>{lab}</button>
            ))}
          </span>
          <span style={{ fontFamily: C.mono, fontSize: 9.5, color: C.faint }}>match where you made the key</span>
        </div>
        {err && <div style={{ color: C.red, fontFamily: C.mono, fontSize: 11.5, margin: '2px 0 8px', lineHeight: 1.5 }}>{err}{/authentication/i.test(err) ? ' — check: Key ID matches this exact private key, and the Environment above matches where you created the key.' : ''}</div>}
        <button onClick={go} disabled={busy} className="mx-btn" style={{ width: '100%', marginTop: 6, padding: '13px', fontWeight: 800, fontSize: 14.5, color: '#04140c', background: KAL_GREEN, border: 'none', opacity: busy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ShieldCheck size={17} /> {busy ? 'Verifying with Kalshi…' : 'Connect securely'}
        </button>
        <p style={{ margin: '12px 0 0', fontFamily: C.mono, fontSize: 9.5, color: C.faint, lineHeight: 1.6 }}>
          <AlertTriangle size={11} style={{ verticalAlign: '-2px', color: C.amber }} /> Once connected you can place <b style={{ color: C.ink }}>real</b> orders — manual ones you confirm each time; LIVE auto requires an explicit typed arm + budget. Event contracts can lose 100%; nothing here is financial advice.
        </p>
        <button onClick={onClose} className="mx-btn" style={{ marginTop: 10, padding: '9px', width: '100%', color: C.dim, background: 'transparent' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── real order confirmation (per order) ─────────────────────────────────────────
function OrderConfirm({ req, live, onClose, onConfirm }: { req: { row: Row; side: 'yes' | 'no' }; live: number; onClose: () => void; onConfirm: (r: Row, s: 'yes' | 'no', count: number) => Promise<string | null> }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const [count, setCount] = useState(1)
  const price = req.side === 'yes' ? live : 1 - live
  const cost = price * count
  const col = req.side === 'yes' ? KAL_GREEN : C.red
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  async function go() { setBusy(true); setErr(''); const e = await onConfirm(req.row, req.side, count); setBusy(false); if (e) setErr(e) }
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.82)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,94vw)', background: C.bg, border: `1px solid ${col}55`, borderRadius: 16, padding: 'clamp(20px,4vw,28px)', boxShadow: `0 0 70px ${col}22` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.amber }}><AlertTriangle size={14} /> Confirm REAL order</span>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, margin: '12px 0 4px', lineHeight: 1.3 }}>{req.row.market.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '10px 0 2px' }}>
          <span style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>Size</span>
          {[1, 5, 10, 25].map((n) => (
            <button key={n} onClick={() => setCount(n)} className="mx-btn" style={{ fontSize: 11, fontWeight: 800, padding: '6px 12px', color: count === n ? C.bg : C.dim, background: count === n ? col : 'transparent', border: `1px solid ${count === n ? col : C.line}` }}>×{n}</button>
          ))}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', margin: '12px 0' }}>
          <Cell v={req.side.toUpperCase()} k="Side" c={col} />
          <Cell v={`${count}`} k="Contracts" c={C.ink} />
          <Cell v={`~${money(cost, 2)}`} k="Est. cost" c={C.amber} />
        </div>
        <p style={{ margin: '0 0 14px', fontFamily: C.mono, fontSize: 10.5, color: C.faint, lineHeight: 1.6 }}>
          Market order on your live Kalshi account at ~{(price * 100).toFixed(0)}¢. This spends <b style={{ color: C.ink }}>real money</b> and can lose 100%.
        </p>
        {err && <div style={{ color: C.red, fontFamily: C.mono, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="mx-btn" style={{ flex: 1, padding: '12px', color: C.dim, background: 'transparent' }}>Cancel</button>
          <button onClick={go} disabled={busy} className="mx-btn" style={{ flex: 2, padding: '12px', fontWeight: 800, color: '#04140c', background: col, border: 'none', opacity: busy ? 0.7 : 1 }}>{busy ? 'Placing…' : `Place real ${req.side.toUpperCase()} ×${count}`}</button>
        </div>
      </div>
    </div>
  )
}

// ── agent network canvas ─────────────────────────────────────────────────────
function AgentHub({ reduced, activity, firing, hot }: { reduced: boolean; activity: number; firing: boolean; hot: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const act = useRef(activity); act.current = activity
  const fire = useRef(firing); fire.current = firing
  const hotRef = useRef(hot); hotRef.current = hot
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d'); if (!ctx) return
    let seed = 99; const rng = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    let W = 0, H = 0, dpr = 1, nodes: { x: number; y: number; r: number; ph: number }[] = [], edges: [number, number][] = [], pings: { e: number; t: number; sp: number }[] = [], raf = 0, last = 0, acc = 0, frame = 0
    function build() { const r = cv!.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv!.width = W * dpr | 0; cv!.height = H * dpr | 0; ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); seed = 99; nodes = []; const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42; for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28, rr = R * (0.5 + rng() * 0.5); nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.85, r: 1.4 + rng() * 2.2, ph: rng() * 6.28 }) } edges = []; for (let i = 0; i < nodes.length; i++) { const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2); for (const o of d) if (o.j > i) edges.push([i, o.j]) } }
    build()
    function draw(now: number) { frame++; if (!last) last = now; const dt = Math.min(48, now - last); last = now; acc += dt; ctx!.clearRect(0, 0, W, H); const rate = fire.current ? 60 : 300 - clamp(act.current, 0, 0.5) * 460; if (!reduced && acc > rate) { acc = 0; if (edges.length) pings.push({ e: rng() * edges.length | 0, t: 0, sp: 0.02 + rng() * 0.03 }) } const lineCol = hotRef.current ? 'rgba(255,160,80,.09)' : 'rgba(120,255,170,.08)'; for (const [a, b] of edges) { ctx!.strokeStyle = lineCol; ctx!.lineWidth = 1; ctx!.beginPath(); ctx!.moveTo(nodes[a].x, nodes[a].y); ctx!.lineTo(nodes[b].x, nodes[b].y); ctx!.stroke() } pings = pings.filter((p) => { p.t += p.sp * (dt / 16); if (p.t >= 1) return false; const [a, b] = edges[p.e], x = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t, y = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t; const col = fire.current ? '182,255,58' : hotRef.current ? '255,122,24' : '43,232,106'; ctx!.fillStyle = `rgba(${col},.95)`; ctx!.shadowColor = `rgba(${col},.9)`; ctx!.shadowBlur = 10; ctx!.beginPath(); ctx!.arc(x, y, 2, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0; return true }); for (const n of nodes) { const a = reduced ? 0.5 : 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(frame / 20 + n.ph)); const glow = hotRef.current ? `rgba(255,122,24,${a})` : `rgba(43,232,106,${a})`; ctx!.fillStyle = `rgba(200,255,220,${a})`; ctx!.shadowColor = glow; ctx!.shadowBlur = fire.current ? 14 : 7; ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0 } if (!reduced) raf = requestAnimationFrame(draw) }
    if (reduced) draw(0); else raf = requestAnimationFrame(draw)
    const onR = () => build(); addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onR) }
  }, [reduced])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}

// ── demo dataset (volatile, near-term markets so the demo tape actually moves) ──
function dm(title: string, category: string, side: 'YES' | 'NO', yesPrice: number, ynProb: number, engine: string, volume: number, worthIt: boolean, hoursToClose = 48): Row {
  const marketProb = side === 'YES' ? yesPrice : 1 - yesPrice, ourSide = side === 'YES' ? ynProb : 1 - ynProb, edge = ourSide - marketProb
  return { market: { ticker: 'DEMO-' + hash(title), title, category, yesPrice, noPrice: +(1 - yesPrice).toFixed(3), volume, closeTime: new Date(Date.now() + 36e5 * hoursToClose).toISOString() }, pricing: { ynProb, engine }, verdict: { side, marketProb, ynProb: ourSide, edge, evPerDollar: ourSide / marketProb - 1, halfKelly: clamp(edge / (1 - marketProb) * 0.5, 0, 0.25), confidence: 0.5 + (hash(title) % 30) / 100, worthIt } }
}
const DEMO: Row[] = [
  dm('BTC above $118,500 at 3pm EDT?', 'Crypto', 'YES', 0.52, 0.61, 'brainstock-nn', 41200, true, 1),
  dm('ETH above $4,400 at 3pm EDT?', 'Crypto', 'NO', 0.47, 0.40, 'brainstock-nn', 18700, true, 1),
  dm('S&P closes up today?', 'Financials', 'YES', 0.55, 0.63, 'brainstock-nn', 52000, true, 5),
  dm('Nasdaq range 22,900–23,100 at close?', 'Financials', 'YES', 0.34, 0.42, 'stat', 12100, true, 5),
  dm('Yankees beat the Red Sox tonight?', 'Sports', 'YES', 0.58, 0.66, 'stat', 22400, true, 7),
  dm('Scheffler leads after round 2?', 'Sports', 'NO', 0.44, 0.37, 'stat', 9800, false, 26),
  dm('Fed cuts rates at the July FOMC?', 'Economics', 'YES', 0.58, 0.71, 'gemini-grounded', 21000, true, 28 * 24),
  dm('WTI crude settles above $82 Friday?', 'Financials', 'YES', 0.62, 0.77, 'brainstock-nn', 9800, true, 3 * 24),
  dm('NHC names a storm before Friday?', 'Weather', 'NO', 0.42, 0.36, 'stat', 6100, true, 3 * 24),
  dm('CPI prints at or below 3.1%?', 'Economics', 'YES', 0.61, 0.67, 'gemini-grounded', 15200, true, 9 * 24),
  dm('BTC hits $125k before August?', 'Crypto', 'NO', 0.44, 0.39, 'brainstock-nn', 8700, false, 14 * 24),
  dm('Chiefs cover the -3.5 spread?', 'Sports', 'YES', 0.53, 0.63, 'stat', 18900, true, 4 * 24),
]
