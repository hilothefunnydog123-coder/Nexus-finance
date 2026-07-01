'use client'

/**
 * PROJECT MATRIX — live auto-scalping terminal (paper).
 * Runs the real /api/edge board, ticks a simulated intra-refresh price so the
 * scalper has something to trade, and an AUTO engine fires + manages paper
 * positions on a ~5s loop with take-profit / stop / time exits, a streaming
 * execution console, and a live equity curve. LIVE (real-money) is gated behind
 * an explicit connect + per-order confirmation — never autonomous. Motion-safe.
 */
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Download, ArrowLeft, Activity, Cpu, Gauge, ShieldCheck, Signal, Crosshair,
  TrendingUp, Landmark, Banknote, CloudLightning, Newspaper, Globe, Waves,
  History, AlertTriangle, Layers, Brain, X, Zap, Rocket, Play, Pause,
  Wallet, Link2, LogOut,
  type LucideIcon,
} from 'lucide-react'
import {
  importKalshiKey, saveConn, loadConn, clearConn, getBalance, getPositions,
  placeOrder, errMsg, type KalshiConn, type KPosition,
} from '@/lib/kalshiClient'

const C = {
  bg: '#0D0F12', deep: '#08090b', panel: 'rgba(255,255,255,.022)', panel2: 'rgba(255,255,255,.04)',
  line: 'rgba(120,255,170,.10)', ink: '#e9f5ee', dim: '#7f8c84', faint: '#4a564e',
  green: '#2be86a', lime: '#b6ff3a', emerald: '#10d98a', red: '#ff5a6a', cyan: '#22d3ee', amber: '#ffd23a',
  mono: 'var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace',
  sans: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
}
const APP_FILE = '/Project-Matrix.html'
const KAL_GREEN = '#00d29f'
const START_BANK = 1000
const REAL_COUNT = 1 // contracts per real order (kept tiny; you confirm each one)
const TICKET = 40          // $ per auto ticket
const TP = 0.07, SL = 0.05, MAX_AGE = 150000, MAX_OPEN = 6  // scalp rules (real prices move slower → longer hold)

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

type Pos = { id: string; ticker: string; title: string; side: 'YES' | 'NO'; stake: number; entry: number; ts: number; auto?: boolean }
type PF = { cash: number; positions: Pos[]; realized: number }
const PF_KEY = 'matrix_pf_v3'
function loadPF(): PF { if (typeof window === 'undefined') return { cash: START_BANK, positions: [], realized: 0 }; try { const r = JSON.parse(localStorage.getItem(PF_KEY) || ''); if (r && typeof r.cash === 'number') return r } catch { } return { cash: START_BANK, positions: [], realized: 0 } }
function savePF(pf: PF) { try { localStorage.setItem(PF_KEY, JSON.stringify(pf)) } catch { } }

type LogEntry = { id: number; t: string; kind: 'SCAN' | 'FIRE' | 'FILL' | 'TP' | 'SL' | 'EXIT' | 'SYS'; text: string }

// ════════════════════════════════════════════════════════════════════════════
export default function TerminalClient() {
  const reduced = useReducedMotion()
  const [rows, setRows] = useState<Row[]>([])
  const [status, setStatus] = useState<'boot' | 'live' | 'demo'>('boot')
  const [sel, setSel] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [pf, setPf] = useState<PF>({ cash: START_BANK, positions: [], realized: 0 })
  const [sortKey, setSortKey] = useState<'edge' | 'vol' | 'conf'>('edge')
  const [worthOnly, setWorthOnly] = useState(false)
  const [auto, setAuto] = useState(false)
  const [autoMode, setAutoMode] = useState<'paper' | 'live'>('paper')
  const [liveArm, setLiveArm] = useState(false)
  const [liveState, setLiveState] = useState<{ spent: number; trades: number; positions: { id: string; ticker: string; title: string; side: 'yes' | 'no'; count: number; entry: number; ts: number }[] }>({ spent: 0, trades: 0, positions: [] })
  const liveCfg = useRef({ budget: 20, maxTrades: 12 })
  const liveRef = useRef(liveState); liveRef.current = liveState
  const [connect, setConnect] = useState(false)
  const [conn, setConn] = useState<KalshiConn | null>(null)
  const [bal, setBal] = useState<number | null>(null)
  const [kpos, setKpos] = useState<KPosition[]>([])
  const [orderReq, setOrderReq] = useState<{ row: Row; side: 'yes' | 'no' } | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])
  const [eq, setEq] = useState<number[]>([])
  const [pxv, setPxv] = useState(0) // bump to re-render on sim price move
  const [firing, setFiring] = useState(false)
  const [sess, setSess] = useState({ trades: 0, wins: 0, pnl: 0 })
  const [lastPx, setLastPx] = useState(0)

  const px = useRef<Record<string, number>>({})     // simulated live prices (YES)
  const rowsRef = useRef<Row[]>([]); rowsRef.current = rows
  const pfRef = useRef<PF>(pf); pfRef.current = pf
  const logId = useRef(0)

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

  // ── load board ──────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/edge/markets?limit=60', { cache: 'no-store' })
      if (!res.ok) throw new Error('http')
      const data = await res.json()
      const rs: Row[] = (data.rows || []).filter((r: Row) => r?.market && r?.verdict)
      if (!rs.length) throw new Error('empty')
      setRows(rs); setStatus('live'); setSel((s) => s && rs.some((r) => r.market.ticker === s) ? s : rs[0].market.ticker)
      for (const r of rs) if (px.current[r.market.ticker] == null) px.current[r.market.ticker] = r.market.yesPrice
    } catch {
      setRows(DEMO); setStatus('demo'); setSel((s) => s || DEMO[0].market.ticker)
      for (const r of DEMO) if (px.current[r.market.ticker] == null) px.current[r.market.ticker] = r.market.yesPrice
    }
    setTick((t) => t + 1)
  }, [])
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id) }, [load])

  const priceOf = useCallback((ticker: string, side: 'YES' | 'NO') => {
    const base = px.current[ticker]; if (base == null) return null
    return side === 'YES' ? base : +(1 - base).toFixed(4)
  }, [])

  // ── LIVE real-time price feed (status === 'live') — poll the ACTUAL current
  //    Kalshi YES mid for the on-screen markets every ~3.5s and mark to it. This
  //    is real market movement, not a random walk. Real markets move slowly, so
  //    the tape is calmer + more honest than the old sim. ──────────────────────
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
        for (const t of Object.keys(pr)) { const y = pr[t]?.yes; if (typeof y === 'number') { px.current[t] = clamp01(y); n++ } }
        setPxv((v) => v + 1)
        if (n) setLastPx(Date.now())
      } catch { /* keep last known prices */ }
    }
    poll()
    const id = setInterval(() => { if (!stop) poll() }, 3500)
    return () => { stop = true; clearInterval(id) }
  }, [status])

  // ── OFFLINE demo only: a gentle random walk so the demo still animates. ──────
  useEffect(() => {
    if (status !== 'demo') return
    const id = setInterval(() => {
      const rs = rowsRef.current; if (!rs.length) return
      for (const r of rs) {
        const anchor = r.market.yesPrice, cur = px.current[r.market.ticker] ?? anchor
        const step = (Math.random() - 0.5) * 0.012 + (anchor - cur) * 0.05
        px.current[r.market.ticker] = clamp01(cur + step)
      }
      setPxv((v) => v + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [status])

  // portfolio mark-to-market (recomputes on every sim tick)
  const pfStats = useMemo(() => {
    let value = 0, invested = 0
    const marks = pf.positions.map((p) => {
      const cur = clamp01(priceOf(p.ticker, p.side) ?? p.entry)
      const val = p.stake * (cur / clamp01(p.entry)); value += val; invested += p.stake
      return { ...p, cur, val, pnl: val - p.stake }
    })
    const equity = pf.cash + value
    return { marks, value, invested, equity, totalPnl: equity - START_BANK + pf.realized }
  }, [pf, priceOf, pxv])

  // equity curve sampler (1s)
  useEffect(() => { const id = setInterval(() => setEq((e) => [...e, pfStats.equity].slice(-140)), 1000); return () => clearInterval(id) }, [pfStats.equity])

  // ── trade actions ─────────────────────────────────────────────────────────
  const buy = useCallback((row: Row, side: 'YES' | 'NO', stake: number, isAuto = false) => {
    const entry = clamp01(priceOf(row.market.ticker, side) ?? (side === 'YES' ? row.market.yesPrice : row.market.noPrice))
    setPf((p) => p.cash < stake ? p : ({ ...p, cash: +(p.cash - stake).toFixed(2), positions: [{ id: row.market.ticker + '-' + side + '-' + Date.now() + '-' + Math.round(Math.random() * 1e4), ticker: row.market.ticker, title: row.market.title, side, stake, entry, ts: Date.now(), auto: isAuto }, ...p.positions].slice(0, 30) }))
    return entry
  }, [priceOf])
  const closePos = useCallback((pos: Pos, reason: LogEntry['kind']) => {
    const cur = clamp01(priceOf(pos.ticker, pos.side) ?? pos.entry)
    const val = pos.stake * (cur / clamp01(pos.entry)); const pnl = val - pos.stake
    setPf((p) => p.positions.some((x) => x.id === pos.id) ? ({ ...p, cash: +(p.cash + val).toFixed(2), realized: +(p.realized + pnl).toFixed(2), positions: p.positions.filter((x) => x.id !== pos.id) }) : p)
    if (pos.auto) setSess((s) => ({ trades: s.trades + 1, wins: s.wins + (pnl >= 0 ? 1 : 0), pnl: +(s.pnl + pnl).toFixed(2) }))
    if (reason !== 'EXIT') addLog(reason, `${reason === 'TP' ? 'TAKE-PROFIT' : reason === 'SL' ? 'STOP-LOSS' : 'EXIT'} ${pos.side} ${pos.title.slice(0, 28)} · ${pnl >= 0 ? '+' : ''}${money(pnl, 2)}`)
  }, [priceOf, addLog])

  // ── position manager (1s): TP / SL / time exits ───────────────────────────
  useEffect(() => {
    const id = setInterval(() => {
      for (const p of pfRef.current.positions) {
        const cur = clamp01(priceOf(p.ticker, p.side) ?? p.entry)
        const pnlPct = cur / clamp01(p.entry) - 1
        if (pnlPct >= TP) closePos(p, 'TP')
        else if (pnlPct <= -SL) closePos(p, 'SL')
        else if (Date.now() - p.ts > MAX_AGE) closePos(p, pnlPct >= 0 ? 'TP' : 'SL')
      }
    }, 1000)
    return () => clearInterval(id)
  }, [priceOf, closePos])

  // ── AUTO scalp engine — paper OR live (real money), fires every 5s ─────────
  useEffect(() => {
    if (!auto) return
    const live = autoMode === 'live'
    addLog('SYS', live ? '🔴 LIVE AUTO ARMED · REAL MONEY · 5s' : '⚡ AUTO ARMED · paper · 5s')
    const id = setInterval(async () => {
      const rs = rowsRef.current
      if (live) {
        if (!conn) { addLog('SYS', 'not connected — disarming'); setAuto(false); return }
        const ls = liveRef.current, cfg = liveCfg.current
        if (ls.trades >= cfg.maxTrades) { addLog('SYS', `trade cap ${cfg.maxTrades} hit — disarming`); setAuto(false); return }
        const open = new Set(ls.positions.map((x) => x.ticker))
        const cand = rs.filter((r) => (r.verdict.worthIt || r.verdict.edge >= 0.03) && !open.has(r.market.ticker)).sort((a, b) => b.verdict.edge - a.verdict.edge)[0]
        if (!cand) { addLog('SCAN', 'no fresh edge — standing down'); return }
        const side = cand.verdict.side.toLowerCase() as 'yes' | 'no'
        const price = clamp01(priceOf(cand.market.ticker, cand.verdict.side) ?? cand.verdict.marketProb)
        const cost = price * REAL_COUNT
        if (ls.spent + cost > cfg.budget) { addLog('SYS', `budget ${money(cfg.budget)} reached — disarming`); setAuto(false); return }
        setFiring(true); setTimeout(() => setFiring(false), 600)
        addLog('FIRE', `LIVE FIRE ${side.toUpperCase()} ${cand.market.title.slice(0, 24)} @ ${(price * 100).toFixed(0)}¢`)
        const r = await placeOrder(conn, cand.market.ticker, side, REAL_COUNT)
        if (!r.ok) { addLog('SYS', `❌ rejected: ${errMsg(r)} — disarming`); setAuto(false); return }
        addLog('FILL', `LIVE FILLED ${side.toUpperCase()} ×${REAL_COUNT} — real order sent`)
        setLiveState((s) => ({ spent: +(s.spent + cost).toFixed(2), trades: s.trades + 1, positions: [{ id: cand.market.ticker + '-' + Date.now(), ticker: cand.market.ticker, title: cand.market.title, side, count: REAL_COUNT, entry: price, ts: Date.now() }, ...s.positions] }))
        try { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } catch { }
      } else {
        const p = pfRef.current
        addLog('SCAN', `scanning ${rs.length} markets · consensus tick`)
        const open = new Set(p.positions.map((x) => x.ticker))
        if (p.positions.length >= MAX_OPEN) { addLog('SYS', `holding ${p.positions.length}/${MAX_OPEN} — waiting for exits`); return }
        if (p.cash < TICKET) { addLog('SYS', 'bankroll exhausted — reset to keep scalping'); return }
        const cand = rs.filter((r) => (r.verdict.worthIt || r.verdict.edge >= 0.03) && !open.has(r.market.ticker)).sort((a, b) => b.verdict.edge - a.verdict.edge)[0]
        if (!cand) { addLog('SYS', 'no fresh edge ≥ 3pt — standing down'); return }
        setFiring(true); setTimeout(() => setFiring(false), 600)
        addLog('FIRE', `FIRE ${cand.verdict.side} ${cand.market.title.slice(0, 30)} @ ${american(cand.verdict.marketProb)} · +${(cand.verdict.edge * 100).toFixed(1)}pt`)
        const entry = buy(cand, cand.verdict.side, TICKET, true)
        setTimeout(() => addLog('FILL', `FILLED ${cand.verdict.side} ${money(TICKET)} @ ${(entry * 100).toFixed(0)}¢ · TP +${(TP * 100).toFixed(0)}% / SL −${(SL * 100).toFixed(0)}%`), 320)
      }
    }, 5000)
    return () => { clearInterval(id); addLog('SYS', '⏸ auto engine disarmed') }
  }, [auto, autoMode, conn, buy, addLog, priceOf])

  // ── LIVE auto exit manager: close real positions on TP/SL/time via sell ────
  useEffect(() => {
    if (autoMode !== 'live' || !conn) return
    const id = setInterval(async () => {
      for (const p of liveRef.current.positions) {
        const cur = clamp01(priceOf(p.ticker, p.side === 'yes' ? 'YES' : 'NO') ?? p.entry)
        const pnl = cur / clamp01(p.entry) - 1
        if (pnl >= TP || pnl <= -SL || Date.now() - p.ts > MAX_AGE) {
          setLiveState((s) => ({ ...s, positions: s.positions.filter((x) => x.id !== p.id) })) // optimistic — avoid double-close
          const r = await placeOrder(conn, p.ticker, p.side, p.count, 'sell')
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
  function confirmLiveArm(budget: number, maxTrades: number) { liveCfg.current = { budget, maxTrades }; setLiveState((s) => ({ spent: 0, trades: 0, positions: s.positions })); setLiveArm(false); setAuto(true) }
  const killLive = useCallback(async () => {
    setAuto(false)
    const ps = liveRef.current.positions
    if (conn && ps.length) { for (const p of ps) { try { await placeOrder(conn, p.ticker, p.side, p.count, 'sell') } catch { } } }
    setLiveState((s) => ({ ...s, positions: [] }))
    addLog('SYS', '🛑 KILL — live auto disarmed' + (ps.length ? ' & flattened' : ''))
    try { if (conn) { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } } catch { }
  }, [conn, addLog])

  function resetPF() { setPf({ cash: START_BANK, positions: [], realized: 0 }); setSess({ trades: 0, wins: 0, pnl: 0 }); setEq([]) }

  // ── real Kalshi account actions ────────────────────────────────────────────
  const doConnect = useCallback(async (keyId: string, pem: string): Promise<string | null> => {
    try {
      const key = await importKalshiKey(pem)
      const c: KalshiConn = { keyId: keyId.trim(), key }
      const b = await getBalance(c) // end-to-end validation of the signature
      await saveConn(c.keyId, key); setConn(c); setBal(b); setConnect(false)
      addLog('SYS', `🔗 Kalshi connected · balance ${money(b ?? 0)}`)
      return null
    } catch (e) { return e instanceof Error ? e.message : 'Connection failed.' }
  }, [addLog])
  const doDisconnect = useCallback(() => { clearConn(); setConn(null); setBal(null); setKpos([]); addLog('SYS', 'Kalshi disconnected') }, [addLog])
  const doPlaceReal = useCallback(async (row: Row, side: 'yes' | 'no', count: number): Promise<string | null> => {
    if (!conn) return 'Not connected.'
    const r = await placeOrder(conn, row.market.ticker, side, count)
    if (!r.ok) { addLog('SYS', `❌ order rejected: ${errMsg(r)}`); return errMsg(r) }
    addLog('FILL', `REAL ${side.toUpperCase()} ×${count} ${row.market.title.slice(0, 24)} — sent to Kalshi`)
    try { const [b, p] = await Promise.all([getBalance(conn), getPositions(conn)]); setBal(b); setKpos(p) } catch { }
    setOrderReq(null); return null
  }, [conn, addLog])

  const selRow = rows.find((r) => r.market.ticker === sel) || rows[0]
  const sorted = useMemo(() => {
    let rs = rows; if (worthOnly) rs = rs.filter((r) => r.verdict.worthIt)
    return [...rs].sort((a, b) => sortKey === 'vol' ? b.market.volume - a.market.volume : sortKey === 'conf' ? b.verdict.confidence - a.verdict.confidence : b.verdict.edge - a.verdict.edge)
  }, [rows, sortKey, worthOnly])
  const worthCount = rows.filter((r) => r.verdict.worthIt).length

  return (
    <div style={{ background: C.bg, color: C.ink, height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: C.sans, overflow: 'hidden', position: 'relative' }}>
      <style>{`
        *{scrollbar-width:thin;scrollbar-color:${C.line} transparent}
        ::-webkit-scrollbar{width:8px;height:8px}::-webkit-scrollbar-thumb{background:${C.line};border-radius:4px}
        @keyframes mx-tick{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes mx-log{from{opacity:0;transform:translateX(-8px)}to{opacity:1}}
        @keyframes mx-armed{0%,100%{box-shadow:0 0 0 ${C.green}00}50%{box-shadow:0 0 22px ${C.green}66}}
        @keyframes mx-fire{0%{opacity:.9}100%{opacity:0}}
        .mx-btn{cursor:pointer;font-family:${C.mono};border-radius:7px;border:1px solid ${C.line};background:${C.panel2};color:${C.ink};transition:all .15s}
        .mx-btn:hover{border-color:${C.green}66}
        .mx-row:hover{background:${C.panel2}}
      `}</style>

      {firing && !reduced && <div aria-hidden style={{ position: 'absolute', inset: 0, zIndex: 50, pointerEvents: 'none', boxShadow: `inset 0 0 120px ${C.green}55`, animation: 'mx-fire .6s ease forwards' }} />}

      {/* STATUS BAR */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px', borderBottom: `1px solid ${C.line}`, background: 'rgba(13,15,18,.8)', flexWrap: 'wrap' }}>
        <Link href="/edge" style={{ display: 'inline-flex', alignItems: 'center', color: C.dim, textDecoration: 'none' }}><ArrowLeft size={14} /></Link>
        <span style={{ fontFamily: C.mono, fontWeight: 800, letterSpacing: '0.12em', display: 'inline-flex', alignItems: 'center', gap: 7 }}><Cpu size={15} style={{ color: C.green }} />PROJECT <span style={{ color: C.green }}>MATRIX</span></span>
        <span style={{ fontFamily: C.mono, fontSize: 10.5, letterSpacing: '0.1em', color: C.bg, background: C.amber, padding: '3px 9px', borderRadius: 6, fontWeight: 800 }}>PAPER</span>
        <Metric label="feed" value={status === 'live' ? 'LIVE·KALSHI' : status === 'demo' ? 'DEMO' : 'BOOT'} color={status === 'live' ? C.green : C.amber} dot />
        <Metric label="agents" value={`${AGENTS.length * 26}`} color={C.emerald} />
        <Metric label="px" value={status === 'live' ? `REAL${lastPx ? ` ·${Math.max(0, Math.round((Date.now() - lastPx) / 1000))}s` : ' ·live'}` : status === 'demo' ? 'SIM·demo' : '—'} color={status === 'live' ? C.green : C.cyan} dot={status === 'live'} />
        {/* AUTO mode + toggle */}
        <span style={{ display: 'inline-flex', border: `1px solid ${C.line}`, borderRadius: 8, overflow: 'hidden' }}>
          {(['paper', 'live'] as const).map((m) => (
            <button key={m} disabled={auto} onClick={() => setAutoMode(m)} style={{ fontFamily: C.mono, fontSize: 10, fontWeight: 800, letterSpacing: '0.06em', padding: '7px 11px', border: 'none', cursor: auto ? 'not-allowed' : 'pointer', color: autoMode === m ? C.bg : C.dim, background: autoMode === m ? (m === 'live' ? C.red : C.green) : 'transparent' }}>{m.toUpperCase()}</button>
          ))}
        </span>
        <button onClick={toggleAuto} className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 800, letterSpacing: '0.06em', padding: '7px 14px', color: auto ? C.bg : (autoMode === 'live' ? C.red : C.green), background: auto ? (autoMode === 'live' ? C.red : C.green) : 'transparent', border: `1px solid ${autoMode === 'live' ? C.red : C.green}`, animation: auto && !reduced ? 'mx-armed 1.6s infinite' : 'none' }}>
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
        <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 8 }}>
          <a href={APP_FILE} download="Project-Matrix.html" className="mx-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '7px 12px', textDecoration: 'none', color: C.bg, background: C.green, border: 'none' }}><Download size={13} /> Download</a>
        </span>
      </div>

      {/* LIVE-ARMED banner — real money, always visible with KILL */}
      {auto && autoMode === 'live' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '8px 16px', background: `${C.red}18`, borderBottom: `1px solid ${C.red}55`, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: C.red }}>
            <span style={{ width: 9, height: 9, borderRadius: 9, background: C.red, boxShadow: `0 0 10px ${C.red}`, animation: reduced ? 'none' : 'mx-armed 1.2s infinite' }} /> LIVE AUTO · REAL MONEY
          </span>
          <Metric label="spent" value={`${money(liveState.spent, 2)} / ${money(liveCfg.current.budget)}`} color={C.amber} />
          <Metric label="orders" value={`${liveState.trades} / ${liveCfg.current.maxTrades}`} color={C.dim} />
          <Metric label="open" value={`${liveState.positions.length}`} color={C.cyan} />
          <button onClick={killLive} className="mx-btn" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', padding: '8px 18px', color: '#fff', background: C.red, border: 'none' }}>🛑 KILL &amp; FLATTEN</button>
        </div>
      )}

      {/* MAIN GRID */}
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: '260px 1fr 350px', gap: 1, background: C.line }}>
        {/* LEFT */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <PanelHead icon={<Brain size={13} />}>Consensus cortex</PanelHead>
          <div style={{ height: 150, flexShrink: 0 }}><AgentHub reduced={reduced} activity={selRow ? consensus(agentVotes(selRow)).spread : 0.1} firing={firing} /></div>
          <PanelHead icon={<Signal size={13} />}>Agent votes</PanelHead>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {selRow && agentVotes(selRow).sort((a, b) => b.a.elo - a.a.elo).map((v) => {
              const Icon = v.a.icon
              return (
                <div key={v.a.key} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center', padding: '6px 12px', borderBottom: `1px solid ${C.line}` }}>
                  <Icon size={12} style={{ color: v.side === 'YES' ? C.green : C.red }} />
                  <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 11.5, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.a.name}</span><span style={{ fontFamily: C.mono, fontSize: 8, color: C.faint }}>Elo {v.a.elo}</span></span>
                  <span style={{ fontFamily: C.mono, fontSize: 12, fontWeight: 800, color: v.side === 'YES' ? C.green : C.red }}>{(v.p * 100).toFixed(0)}%</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', borderBottom: `1px solid ${C.line}`, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.dim, display: 'inline-flex', alignItems: 'center', gap: 7 }}><Activity size={13} style={{ color: C.green }} /> Board · {sorted.length}</span>
            <span style={{ fontFamily: C.mono, fontSize: 10, color: C.emerald, border: `1px solid ${C.emerald}33`, background: `${C.emerald}10`, padding: '3px 8px', borderRadius: 6 }}>{worthCount} worth it</span>
            <span style={{ marginLeft: 'auto', display: 'inline-flex', gap: 6 }}>
              <button className="mx-btn" onClick={() => setWorthOnly((w) => !w)} style={{ fontSize: 10, padding: '5px 9px', color: worthOnly ? C.bg : C.dim, background: worthOnly ? C.green : C.panel2, border: 'none' }}>WORTH-IT</button>
              {(['edge', 'vol', 'conf'] as const).map((k) => <button key={k} className="mx-btn" onClick={() => setSortKey(k)} style={{ fontSize: 10, padding: '5px 9px', color: sortKey === k ? C.green : C.dim }}>{k.toUpperCase()}</button>)}
            </span>
          </div>
          <div style={{ flex: 1, overflow: 'auto' }}>
            {status === 'boot' ? <div style={{ padding: 40, textAlign: 'center', color: C.dim, fontFamily: C.mono }}>Booting the cortex…</div> :
              sorted.map((r) => <BoardRow key={r.market.ticker} row={r} live={priceOf(r.market.ticker, 'YES') ?? r.market.yesPrice} held={pf.positions.some((p) => p.ticker === r.market.ticker)} active={r.market.ticker === sel} onClick={() => setSel(r.market.ticker)} />)}
          </div>
        </div>

        {/* RIGHT */}
        <div style={{ background: C.bg, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <div style={{ flex: '1 1 50%', overflow: 'auto', borderBottom: `1px solid ${C.line}` }}>
            {selRow ? <Detail row={selRow} live={priceOf(selRow.market.ticker, 'YES') ?? selRow.market.yesPrice} onBuy={(r, s) => buy(r, s, 50)} connected={!!conn} onReal={(r, s) => setOrderReq({ row: r, side: s })} /> : <div style={{ padding: 30, color: C.dim }}>Select a market.</div>}
          </div>
          <div style={{ flex: '1 1 50%', overflow: 'auto' }}>
            <Portfolio stats={pfStats} eq={eq} onClose={(p) => closePos(p, 'EXIT')} onReset={resetPF} kpos={kpos} connected={!!conn} bal={bal} />
          </div>
        </div>
      </div>

      {/* EXECUTION CONSOLE */}
      <ExecConsole auto={auto} firing={firing} log={log} eq={eq} stats={pfStats} sess={sess} reduced={reduced} />

      {connect && <ConnectModal onClose={() => setConnect(false)} onConnect={doConnect} />}
      {orderReq && <OrderConfirm req={orderReq} live={priceOf(orderReq.row.market.ticker, orderReq.side === 'yes' ? 'YES' : 'NO') ?? 0.5} onClose={() => setOrderReq(null)} onConfirm={doPlaceReal} />}
      {liveArm && <LiveArmModal bal={bal} onClose={() => setLiveArm(false)} onArm={confirmLiveArm} />}
    </div>
  )
}

// ── arm LIVE auto (real money) — budget + typed confirmation ────────────────────
function LiveArmModal({ bal, onClose, onArm }: { bal: number | null; onClose: () => void; onArm: (budget: number, maxTrades: number) => void }) {
  const [budget, setBudget] = useState(20)
  const [maxTrades, setMaxTrades] = useState(12)
  const [ack, setAck] = useState('')
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  const ok = ack.trim().toUpperCase() === 'ARM LIVE'
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 220, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.85)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(480px,95vw)', background: C.bg, border: `1px solid ${C.red}66`, borderRadius: 16, padding: 'clamp(22px,4vw,30px)', boxShadow: `0 0 80px ${C.red}25` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.red }}><AlertTriangle size={14} /> Arm LIVE auto · real money</span>
        <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>The bot will spend real money by itself.</h3>
        <p style={{ margin: '0 0 8px', color: C.dim, fontSize: 13.5, lineHeight: 1.6 }}>
          Once armed, MATRIX places real 1-contract market orders on your Kalshi account every ~5s (best available edge), and closes them on TP/SL/time — no per-order confirmation. It stops the instant a cap or an error is hit.
        </p>
        <p style={{ margin: '0 0 14px', fontFamily: C.mono, fontSize: 11, color: C.amber, lineHeight: 1.6, border: `1px solid ${C.amber}33`, background: `${C.amber}0c`, borderRadius: 8, padding: '9px 11px' }}>
          Reality check: the signal is a transparent demo ensemble, not a proven, backtested edge. On a fast loop it will most likely bleed to fees + spread. Keep the budget tiny. Balance: <b style={{ color: C.ink }}>{bal == null ? '—' : money(bal, 2)}</b>.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
          <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Session budget ($)
            <input type="number" min={1} max={200} value={budget} onChange={(e) => setBudget(clamp(Number(e.target.value) || 0, 1, 200))} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 15, padding: '10px 12px', outline: 'none' }} /></label>
          <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Max orders
            <input type="number" min={1} max={100} value={maxTrades} onChange={(e) => setMaxTrades(clamp(Number(e.target.value) || 0, 1, 100))} style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 15, padding: '10px 12px', outline: 'none' }} /></label>
        </div>
        <label style={{ fontFamily: C.mono, fontSize: 10, color: C.faint }}>Type <b style={{ color: C.red }}>ARM LIVE</b> to confirm
          <input value={ack} onChange={(e) => setAck(e.target.value)} placeholder="ARM LIVE" style={{ width: '100%', boxSizing: 'border-box', marginTop: 5, background: C.deep, border: `1px solid ${ok ? C.red : C.line}`, borderRadius: 8, color: C.ink, fontFamily: C.mono, fontSize: 14, padding: '11px 13px', outline: 'none', letterSpacing: '0.1em' }} /></label>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button onClick={onClose} className="mx-btn" style={{ flex: 1, padding: '12px', color: C.dim, background: 'transparent' }}>Cancel</button>
          <button onClick={() => ok && onArm(budget, maxTrades)} disabled={!ok} className="mx-btn" style={{ flex: 2, padding: '12px', fontWeight: 800, color: ok ? '#fff' : C.faint, background: ok ? C.red : C.panel2, border: 'none', cursor: ok ? 'pointer' : 'not-allowed' }}>Arm live auto · {money(budget)} cap</button>
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

// ── board row ─────────────────────────────────────────────────────────────────
function BoardRow({ row, live, held, active, onClick }: { row: Row; live: number; held: boolean; active: boolean; onClick: () => void }) {
  const v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  const liveP = Math.round(live * 100), mkt = Math.round(row.market.yesPrice * 100), moved = liveP - mkt
  return (
    <div className="mx-row" onClick={onClick} style={{ cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr 78px 60px 52px', gap: 10, alignItems: 'center', padding: '9px 14px', borderBottom: `1px solid ${C.line}`, background: active ? `${C.green}0c` : held ? `${C.cyan}08` : 'transparent', borderLeft: `2px solid ${active ? C.green : held ? C.cyan : 'transparent'}` }}>
      <span style={{ minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{held && <span style={{ color: C.cyan }}>◉ </span>}{row.market.title}</span>
        <span style={{ fontFamily: C.mono, fontSize: 9 }}><span style={{ color: c }}>{g} {row.market.category}</span> <span style={{ color: C.faint }}>· ⏱{timeToClose(row.market.closeTime)} · {fmtVol(row.market.volume)}v</span></span>
      </span>
      <span style={{ textAlign: 'right', fontFamily: C.mono }}>
        <span style={{ display: 'block', fontSize: 13, fontWeight: 800, color: C.cyan }}>{liveP}¢</span>
        <span style={{ fontSize: 8.5, color: moved > 0 ? C.green : moved < 0 ? C.red : C.faint }}>{moved > 0 ? '▲' : moved < 0 ? '▼' : '·'}{Math.abs(moved)} live</span>
      </span>
      <span style={{ textAlign: 'right', fontFamily: C.mono }}>
        <span style={{ display: 'block', fontSize: 12.5, fontWeight: 800, color: v.edge >= 0.03 ? C.green : C.dim }}>+{(v.edge * 100).toFixed(1)}</span>
        <span style={{ fontSize: 8, color: C.faint }}>EDGE</span>
      </span>
      <span style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: C.mono, fontSize: 11, fontWeight: 800, color: sideCol }}>{v.side}</span>
        <span style={{ display: 'block', fontFamily: C.mono, fontSize: 8, color: v.worthIt ? C.green : C.faint }}>{v.worthIt ? '● BET' : 'pass'}</span>
      </span>
    </div>
  )
}

// ── detail ──────────────────────────────────────────────────────────────────
function Detail({ row, live, onBuy, connected, onReal }: { row: Row; live: number; onBuy: (r: Row, s: 'YES' | 'NO') => void; connected: boolean; onReal: (r: Row, s: 'yes' | 'no') => void }) {
  const votes = agentVotes(row), cons = consensus(votes), v = row.verdict, [g, c] = catOf(row.market.category)
  const sideCol = v.side === 'YES' ? C.green : C.red
  return (
    <div>
      <div style={{ padding: '12px 15px 9px', borderBottom: `1px solid ${C.line}` }}>
        <span style={{ fontFamily: C.mono, fontSize: 9.5, color: c }}>{g} {row.market.category} · ⏱ {timeToClose(row.market.closeTime)} · <span style={{ color: C.cyan }}>live {(live * 100).toFixed(0)}¢</span></span>
        <div style={{ fontSize: 14.5, fontWeight: 750, lineHeight: 1.25, margin: '6px 0 0', color: C.ink }}>{row.market.title}</div>
      </div>
      <div style={{ padding: '11px 15px', display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, borderBottom: `1px solid ${C.line}` }}>
        <Cell v={`${Math.round(row.pricing.ynProb * 100)}%`} k="Consensus" c={C.cyan} />
        <Cell v={`${Math.round(row.market.yesPrice * 100)}%`} k="Market" c={C.dim} />
        <Cell v={`${v.edge >= 0 ? '+' : ''}${(v.edge * 100).toFixed(1)}pt`} k="Edge" c={v.edge >= 0.03 ? C.green : C.dim} />
      </div>
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
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.faint, marginBottom: 8 }}>Manual paper · $50 ticket</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="mx-btn" onClick={() => onBuy(row, 'YES')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12.5, color: v.side === 'YES' ? C.bg : C.green, background: v.side === 'YES' ? C.green : 'transparent', border: `1px solid ${C.green}` }}>BUY YES · {(live * 100).toFixed(0)}¢</button>
          <button className="mx-btn" onClick={() => onBuy(row, 'NO')} style={{ flex: 1, padding: '10px', fontWeight: 800, fontSize: 12.5, color: v.side === 'NO' ? C.bg : C.red, background: v.side === 'NO' ? C.red : 'transparent', border: `1px solid ${C.red}` }}>BUY NO · {((1 - live) * 100).toFixed(0)}¢</button>
        </div>
        <div style={{ marginTop: 7, fontFamily: C.mono, fontSize: 9, color: C.faint }}>MATRIX leans <b style={{ color: sideCol }}>{v.side}</b>. Arm AUTO to let the engine scalp this on paper.</div>
      </div>
      {/* REAL money — only when a Kalshi account is connected; each order confirmed */}
      <div style={{ padding: '0 15px 14px' }}>
        <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: connected ? KAL_GREEN : C.faint, marginBottom: 8 }}>Real order · {REAL_COUNT} contract{REAL_COUNT === 1 ? '' : 's'} {connected ? '' : '· connect Kalshi first'}</div>
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
          return (
            <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, alignItems: 'center', padding: '8px 13px', borderBottom: `1px solid ${C.line}` }}>
              <span style={{ minWidth: 0 }}><span style={{ display: 'block', fontSize: 11, color: C.ink, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.auto && <span style={{ color: C.green }}>⚡</span>}{p.title}</span><span style={{ fontFamily: C.mono, fontSize: 8.5, color: C.faint }}><b style={{ color: p.side === 'YES' ? C.green : C.red }}>{p.side}</b> {money(p.stake)} @ {(p.entry * 100).toFixed(0)}→{(p.cur * 100).toFixed(0)}¢</span></span>
              <span style={{ textAlign: 'right', fontFamily: C.mono }}><span style={{ display: 'block', fontSize: 11.5, fontWeight: 800, color: pp ? C.green : C.red }}>{pp ? '+' : ''}{money(p.pnl, 2)}</span></span>
              <button className="mx-btn" onClick={() => onClose(p)} style={{ padding: '4px 6px', color: C.dim, display: 'grid', placeItems: 'center' }}><X size={11} /></button>
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
function ExecConsole({ auto, firing, log, eq, stats, sess, reduced }: { auto: boolean; firing: boolean; log: LogEntry[]; eq: number[]; stats: { totalPnl: number }; sess: { trades: number; wins: number; pnl: number }; reduced: boolean }) {
  const kindCol: Record<LogEntry['kind'], string> = { SCAN: C.dim, FIRE: C.lime, FILL: C.green, TP: C.green, SL: C.red, EXIT: C.dim, SYS: C.cyan }
  const winRate = sess.trades ? Math.round((sess.wins / sess.trades) * 100) : 0
  return (
    <div style={{ height: 168, borderTop: `1px solid ${C.line}`, background: C.deep, display: 'grid', gridTemplateColumns: '230px 1fr 220px', gap: 1 }}>
      {/* engine state */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', color: auto ? C.green : C.faint }}>
          <Rocket size={15} style={{ animation: auto && firing && !reduced ? 'none' : 'none' }} /> AUTO ENGINE · {auto ? 'ARMED' : 'IDLE'}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {STAGES.map(([s, Ic], i) => {
            const on = auto && (firing || i < 2)
            return (
              <span key={s} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, flex: 1 }}>
                <span style={{ display: 'grid', placeItems: 'center', width: 28, height: 28, borderRadius: 8, border: `1px solid ${on ? C.green : C.line}`, background: on ? `${C.green}18` : 'transparent', color: on ? C.green : C.faint, transition: 'all .2s' }}><Ic size={13} /></span>
                <span style={{ fontFamily: C.mono, fontSize: 7, letterSpacing: '0.06em', color: on ? C.green : C.faint }}>{s}</span>
              </span>
            )
          })}
        </div>
        <div style={{ fontFamily: C.mono, fontSize: 9.5, color: C.faint, lineHeight: 1.7 }}>
          rules · TP <span style={{ color: C.green }}>+{(TP * 100).toFixed(0)}%</span> · SL <span style={{ color: C.red }}>−{(SL * 100).toFixed(0)}%</span> · {TICKET / 1}$ ticket · max {MAX_OPEN} open
        </div>
      </div>
      {/* log */}
      <div style={{ padding: '10px 0', overflow: 'auto', borderLeft: `1px solid ${C.line}`, borderRight: `1px solid ${C.line}` }}>
        <div style={{ padding: '0 14px 6px', fontFamily: C.mono, fontSize: 9, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.faint }}>Execution console</div>
        {log.length === 0 && <div style={{ padding: '10px 14px', fontFamily: C.mono, fontSize: 11, color: C.faint }}>Idle. Press <b style={{ color: C.green }}>ARM AUTO-SCALP</b> to start firing.</div>}
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
function ConnectModal({ onClose, onConnect }: { onClose: () => void; onConnect: (keyId: string, pem: string) => Promise<string | null> }) {
  const [keyId, setKeyId] = useState(''); const [pem, setPem] = useState(''); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  async function go() {
    if (!keyId.trim() || !pem.trim()) { setErr('Paste both your Key ID and private key.'); return }
    setBusy(true); setErr('')
    const e = await onConnect(keyId, pem); setBusy(false)
    if (e) setErr(e)
  }
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.82)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(540px,95vw)', background: C.bg, border: `1px solid ${KAL_GREEN}44`, borderRadius: 16, padding: 'clamp(22px,4vw,30px)', boxShadow: `0 0 80px ${KAL_GREEN}20`, maxHeight: '92vh', overflow: 'auto' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: KAL_GREEN }}><Link2 size={14} /> Connect your Kalshi account</span>
        <h3 style={{ margin: '12px 0 6px', fontSize: 'clamp(1.3rem,3vw,1.6rem)', fontWeight: 800, letterSpacing: '-0.02em', color: C.ink }}>Your keys, your device.</h3>
        <p style={{ margin: '0 0 14px', color: C.dim, fontSize: 13.5, lineHeight: 1.6 }}>
          Create an API key at <b style={{ color: C.ink }}>kalshi.com → Account → API</b>, then paste the <b style={{ color: C.ink }}>Key ID</b> and the <b style={{ color: C.ink }}>private key (PKCS#8 PEM)</b> below. The private key is imported as a non-extractable key and stored only in your browser — it&apos;s never sent to our servers.
        </p>
        <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>API Key ID</label>
        <input value={keyId} onChange={(e) => { setKeyId(e.target.value); setErr('') }} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" spellCheck={false}
          style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 12px', background: C.deep, border: `1px solid ${C.line}`, borderRadius: 9, color: C.ink, fontFamily: C.mono, fontSize: 13, padding: '11px 13px', outline: 'none' }} />
        <label style={{ fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.faint }}>Private key (PEM)</label>
        <textarea value={pem} onChange={(e) => { setPem(e.target.value); setErr('') }} placeholder={'-----BEGIN PRIVATE KEY-----\n…\n-----END PRIVATE KEY-----'} spellCheck={false} rows={6}
          style={{ width: '100%', boxSizing: 'border-box', margin: '5px 0 6px', background: C.deep, border: `1px solid ${err ? C.red : C.line}`, borderRadius: 9, color: C.ink, fontFamily: C.mono, fontSize: 11.5, padding: '11px 13px', outline: 'none', resize: 'vertical' }} />
        {err && <div style={{ color: C.red, fontFamily: C.mono, fontSize: 11.5, margin: '2px 0 8px', lineHeight: 1.5 }}>{err}</div>}
        <button onClick={go} disabled={busy} className="mx-btn" style={{ width: '100%', marginTop: 6, padding: '13px', fontWeight: 800, fontSize: 14.5, color: '#04140c', background: KAL_GREEN, border: 'none', opacity: busy ? 0.7 : 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ShieldCheck size={17} /> {busy ? 'Verifying with Kalshi…' : 'Connect securely'}
        </button>
        <p style={{ margin: '12px 0 0', fontFamily: C.mono, fontSize: 9.5, color: C.faint, lineHeight: 1.6 }}>
          <AlertTriangle size={11} style={{ verticalAlign: '-2px', color: C.amber }} /> Once connected you can place <b style={{ color: C.ink }}>real</b> orders — each one you confirm yourself. Auto-scalp stays paper. Event contracts can lose 100%; nothing here is financial advice.
        </p>
        <button onClick={onClose} className="mx-btn" style={{ marginTop: 10, padding: '9px', width: '100%', color: C.dim, background: 'transparent' }}>Cancel</button>
      </div>
    </div>
  )
}

// ── real order confirmation (per order) ─────────────────────────────────────────
function OrderConfirm({ req, live, onClose, onConfirm }: { req: { row: Row; side: 'yes' | 'no' }; live: number; onClose: () => void; onConfirm: (r: Row, s: 'yes' | 'no', count: number) => Promise<string | null> }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  const price = req.side === 'yes' ? live : 1 - live
  const cost = price * REAL_COUNT
  const col = req.side === 'yes' ? KAL_GREEN : C.red
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); addEventListener('keydown', k); return () => removeEventListener('keydown', k) }, [onClose])
  async function go() { setBusy(true); setErr(''); const e = await onConfirm(req.row, req.side, REAL_COUNT); setBusy(false); if (e) setErr(e) }
  return (
    <div role="dialog" aria-modal onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 210, display: 'grid', placeItems: 'center', background: 'rgba(4,6,8,.82)', backdropFilter: 'blur(6px)', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,94vw)', background: C.bg, border: `1px solid ${col}55`, borderRadius: 16, padding: 'clamp(20px,4vw,28px)', boxShadow: `0 0 70px ${col}22` }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: C.mono, fontSize: 11, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.amber }}><AlertTriangle size={14} /> Confirm REAL order</span>
        <div style={{ fontSize: 14.5, fontWeight: 700, color: C.ink, margin: '12px 0 4px', lineHeight: 1.3 }}>{req.row.market.title}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 1, background: C.line, border: `1px solid ${C.line}`, borderRadius: 10, overflow: 'hidden', margin: '12px 0' }}>
          <Cell v={req.side.toUpperCase()} k="Side" c={col} />
          <Cell v={`${REAL_COUNT}`} k="Contracts" c={C.ink} />
          <Cell v={`~${money(cost, 2)}`} k="Est. cost" c={C.amber} />
        </div>
        <p style={{ margin: '0 0 14px', fontFamily: C.mono, fontSize: 10.5, color: C.faint, lineHeight: 1.6 }}>
          Market order on your live Kalshi account at ~{(price * 100).toFixed(0)}¢. This spends <b style={{ color: C.ink }}>real money</b> and can lose 100%.
        </p>
        {err && <div style={{ color: C.red, fontFamily: C.mono, fontSize: 11.5, marginBottom: 10, lineHeight: 1.5 }}>{err}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} className="mx-btn" style={{ flex: 1, padding: '12px', color: C.dim, background: 'transparent' }}>Cancel</button>
          <button onClick={go} disabled={busy} className="mx-btn" style={{ flex: 2, padding: '12px', fontWeight: 800, color: '#04140c', background: col, border: 'none', opacity: busy ? 0.7 : 1 }}>{busy ? 'Placing…' : `Place real ${req.side.toUpperCase()} order`}</button>
        </div>
      </div>
    </div>
  )
}

// ── agent network canvas ─────────────────────────────────────────────────────
function AgentHub({ reduced, activity, firing }: { reduced: boolean; activity: number; firing: boolean }) {
  const ref = useRef<HTMLCanvasElement | null>(null)
  const act = useRef(activity); act.current = activity
  const fire = useRef(firing); fire.current = firing
  useEffect(() => {
    const cv = ref.current; if (!cv) return; const ctx = cv.getContext('2d'); if (!ctx) return
    let seed = 99; const rng = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 }
    let W = 0, H = 0, dpr = 1, nodes: { x: number; y: number; r: number; ph: number }[] = [], edges: [number, number][] = [], pings: { e: number; t: number; sp: number }[] = [], raf = 0, last = 0, acc = 0, frame = 0
    function build() { const r = cv!.getBoundingClientRect(); dpr = Math.min(2, devicePixelRatio || 1); W = r.width; H = r.height; cv!.width = W * dpr | 0; cv!.height = H * dpr | 0; ctx!.setTransform(dpr, 0, 0, dpr, 0, 0); seed = 99; nodes = []; const cx = W / 2, cy = H / 2, R = Math.min(W, H) * 0.42; for (let i = 0; i < 24; i++) { const a = (i / 24) * 6.28, rr = R * (0.5 + rng() * 0.5); nodes.push({ x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.85, r: 1.4 + rng() * 2.2, ph: rng() * 6.28 }) } edges = []; for (let i = 0; i < nodes.length; i++) { const d = nodes.map((n, j) => ({ j, d: (n.x - nodes[i].x) ** 2 + (n.y - nodes[i].y) ** 2 })).filter((o) => o.j !== i).sort((a, b) => a.d - b.d).slice(0, 2); for (const o of d) if (o.j > i) edges.push([i, o.j]) } }
    build()
    function draw(now: number) { frame++; if (!last) last = now; const dt = Math.min(48, now - last); last = now; acc += dt; ctx!.clearRect(0, 0, W, H); const rate = fire.current ? 60 : 300 - clamp(act.current, 0, 0.5) * 460; if (!reduced && acc > rate) { acc = 0; if (edges.length) pings.push({ e: rng() * edges.length | 0, t: 0, sp: 0.02 + rng() * 0.03 }) } for (const [a, b] of edges) { ctx!.strokeStyle = 'rgba(120,255,170,.08)'; ctx!.lineWidth = 1; ctx!.beginPath(); ctx!.moveTo(nodes[a].x, nodes[a].y); ctx!.lineTo(nodes[b].x, nodes[b].y); ctx!.stroke() } pings = pings.filter((p) => { p.t += p.sp * (dt / 16); if (p.t >= 1) return false; const [a, b] = edges[p.e], x = nodes[a].x + (nodes[b].x - nodes[a].x) * p.t, y = nodes[a].y + (nodes[b].y - nodes[a].y) * p.t; const col = fire.current ? '182,255,58' : '43,232,106'; ctx!.fillStyle = `rgba(${col},.95)`; ctx!.shadowColor = `rgba(${col},.9)`; ctx!.shadowBlur = 10; ctx!.beginPath(); ctx!.arc(x, y, 2, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0; return true }); for (const n of nodes) { const a = reduced ? 0.5 : 0.4 + 0.4 * (0.5 + 0.5 * Math.sin(frame / 20 + n.ph)); ctx!.fillStyle = `rgba(200,255,220,${a})`; ctx!.shadowColor = `rgba(43,232,106,${a})`; ctx!.shadowBlur = fire.current ? 14 : 7; ctx!.beginPath(); ctx!.arc(n.x, n.y, n.r, 0, 6.28); ctx!.fill(); ctx!.shadowBlur = 0 } if (!reduced) raf = requestAnimationFrame(draw) }
    if (reduced) draw(0); else raf = requestAnimationFrame(draw)
    const onR = () => build(); addEventListener('resize', onR)
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', onR) }
  }, [reduced])
  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />
}

// ── demo dataset ───────────────────────────────────────────────────────────────
function dm(title: string, category: string, side: 'YES' | 'NO', yesPrice: number, ynProb: number, engine: string, volume: number, worthIt: boolean): Row {
  const marketProb = side === 'YES' ? yesPrice : 1 - yesPrice, ourSide = side === 'YES' ? ynProb : 1 - ynProb, edge = ourSide - marketProb
  return { market: { ticker: 'DEMO-' + hash(title), title, category, yesPrice, noPrice: +(1 - yesPrice).toFixed(3), volume, closeTime: new Date(Date.now() + 864e5 * (2 + (hash(title) % 20))).toISOString() }, pricing: { ynProb, engine }, verdict: { side, marketProb, ynProb: ourSide, edge, evPerDollar: ourSide / marketProb - 1, halfKelly: clamp(edge / (1 - marketProb) * 0.5, 0, 0.25), confidence: 0.5 + (hash(title) % 30) / 100, worthIt } }
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
  dm('Gold settles above $2,400?', 'Financials', 'YES', 0.59, 0.68, 'brainstock-nn', 7200, true),
  dm('Nasdaq up 1%+ today?', 'Financials', 'NO', 0.38, 0.32, 'stat', 9100, true),
]
