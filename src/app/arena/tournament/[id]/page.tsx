'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Trophy, TrendingUp, TrendingDown, Zap, Crown, Bot, X, ChevronDown, BarChart2, Clock } from 'lucide-react'
import TradingViewChart, { TV_SYMBOLS } from '@/components/chart/TradingViewChart'
import { INSTRUMENTS, INSTRUMENT_MAP, calcMargin, calcPnL, type Instrument, type InstrumentType } from '@/lib/instruments'
import GoLive from '@/components/arena/GoLive'

// ─── TYPES ───────────────────────────────────────────────────────────────────

interface Position {
  id: string
  symbol: string
  side: 'long' | 'short'
  quantity: number
  entryPrice: number
  currentPrice: number
  pnl: number
  pnlPct: number
  marginUsed: number
  leverage: number
}

interface LeaderEntry {
  rank: number
  name: string
  initials: string
  pnlPct: number
  pnl: number
  trades: number
  color: string
  isAI?: boolean
  aiStyle?: string
  reasoning?: string
}

const ALL_SYMBOLS = INSTRUMENTS.map(i => i.symbol)
const TYPE_TABS: InstrumentType[] = ['stock', 'forex', 'futures', 'crypto']
const COLORS = ['#ffd700','#00ff88','#1e90ff','#bf5fff','#ff6b35','#ff4757','#00d4aa','#ff69b4']

const AI_TRADERS_BASE: LeaderEntry[] = [
  { rank: 0, name: 'YN-ALPHA',   initials: 'Aα', pnlPct: 8.4,  pnl: 840,  trades: 12, color: '#00ff88', isAI: true, aiStyle: 'MOMENTUM' },
  { rank: 0, name: 'YN-BETA',    initials: 'Bβ', pnlPct: 5.1,  pnl: 510,  trades: 4,  color: '#1e90ff', isAI: true, aiStyle: 'SWING' },
  { rank: 0, name: 'YN-GAMMA',   initials: 'Γγ', pnlPct: 3.7,  pnl: 370,  trades: 8,  color: '#bf5fff', isAI: true, aiStyle: 'CONTRARIAN' },
  { rank: 0, name: 'YN-DELTA',   initials: 'Δδ', pnlPct: -1.2, pnl: -120, trades: 6,  color: '#ffd700', isAI: true, aiStyle: 'TREND' },
  { rank: 0, name: 'YN-EPSILON', initials: 'Εε', pnlPct: -4.8, pnl: -480, trades: 31, color: '#ff6b35', isAI: true, aiStyle: 'SCALPER' },
]

const HUMAN_TRADERS_BASE: LeaderEntry[] = [
  { rank: 0, name: 'Marcus T.',  initials: 'MT', pnlPct: 14.2, pnl: 1420, trades: 9,  color: '#ff4757' },
  { rank: 0, name: 'Sarah K.',   initials: 'SK', pnlPct: 11.8, pnl: 1180, trades: 7,  color: '#00d4aa' },
  { rank: 0, name: 'Devon P.',   initials: 'DP', pnlPct:  9.3, pnl: 930,  trades: 11, color: '#ff69b4' },
  { rank: 0, name: 'Jordan M.',  initials: 'JM', pnlPct:  6.1, pnl: 610,  trades: 5,  color: '#ffd700' },
  { rank: 0, name: 'Aisha B.',   initials: 'AB', pnlPct:  2.8, pnl: 280,  trades: 14, color: '#00ff88' },
  { rank: 0, name: 'Chris L.',   initials: 'CL', pnlPct: -2.4, pnl: -240, trades: 3,  color: '#1e90ff' },
  { rank: 0, name: 'Nina R.',    initials: 'NR', pnlPct: -6.7, pnl: -670, trades: 8,  color: '#bf5fff' },
]

// ─── COUNTDOWN ───────────────────────────────────────────────────────────────

function Countdown() {
  const end = useRef(Date.now() + 4 * 3600_000)
  const [ms, setMs] = useState(end.current - Date.now())
  useEffect(() => { const t = setInterval(() => setMs(end.current - Date.now()), 1000); return () => clearInterval(t) }, [])
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000)
  return <span style={{ fontFamily: 'monospace', color: ms < 3600000 ? '#ff4757' : '#ff6b35' }}>{String(h).padStart(2,'0')}:{String(m).padStart(2,'0')}:{String(s).padStart(2,'0')}</span>
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function TournamentRoom() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const tournamentId = params?.id as string || 'daily-blitz'

  // Gate: must have entered
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking')
  useEffect(() => {
    const entered = searchParams?.get('entered') || localStorage.getItem(`yn_tournament_${tournamentId}`)
    if (entered) {
      localStorage.setItem(`yn_tournament_${tournamentId}`, 'true')
      setAccess('granted')
    } else {
      setAccess('denied')
    }
  }, [tournamentId, searchParams])

  // Chart state
  const [chartSymbol, setChartSymbol] = useState('AAPL')
  const [chartInterval, setChartInterval] = useState('5')
  const [instrumentType, setInstrumentType] = useState<InstrumentType>('stock')

  // Order state
  const [side, setSide] = useState<'long' | 'short'>('long')
  const [qty, setQty] = useState('1')
  const [leverage, setLeverage] = useState(1)
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [orderMsg, setOrderMsg] = useState('')

  // Portfolio state
  const [cash, setCash] = useState(10000)
  const [positions, setPositions] = useState<Position[]>([])
  const [closedTrades, setClosedTrades] = useState<{ pnl: number }[]>([])
  const [prices, setPrices] = useState<Record<string, number>>(
    Object.fromEntries(INSTRUMENTS.map(i => [i.symbol, i.mockBasePrice]))
  )

  // Leaderboard with AI
  const [aiTraders, setAiTraders] = useState<LeaderEntry[]>(AI_TRADERS_BASE)
  const [aiLog, setAiLog] = useState<{ name: string; action: string; symbol: string; reasoning: string; ts: number }[]>([])
  const [leaderPanel, setLeaderPanel] = useState(true)

  // Simulate live prices
  useEffect(() => {
    const t = setInterval(() => {
      setPrices(prev => {
        const next = { ...prev }
        Object.keys(next).forEach(sym => {
          const inst = INSTRUMENT_MAP[sym]
          if (!inst) return
          const vol = inst.type === 'forex' ? 0.00008 : inst.type === 'futures' ? 0.0002 : 0.0012
          next[sym] = +(next[sym] * (1 + (Math.random() - 0.495) * vol)).toFixed(inst.digits)
        })
        return next
      })
    }, 1200)
    return () => clearInterval(t)
  }, [])

  // AI traders: drift their P&L, poll Gemini every 45s
  useEffect(() => {
    if (access !== 'granted') return

    // Drift AI P&L smoothly
    const drift = setInterval(() => {
      setAiTraders(prev => prev.map(t => {
        const change = (Math.random() - 0.47) * 0.4
        const newPct = +(t.pnlPct + change).toFixed(2)
        return { ...t, pnlPct: newPct, pnl: Math.round(newPct * 100) }
      }))
    }, 3000)

    // Poll Gemini for real AI decisions
    const aiPoll = setInterval(async () => {
      try {
        const res = await fetch('/api/tournaments/ai-trader', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ traderId: ['yn-alpha','yn-beta','yn-gamma','yn-delta','yn-epsilon'][Math.floor(Math.random() * 5)], currentPnl: Math.random() * 20 - 5, positions: '' }),
        })
        const data = await res.json()
        if (data.trade && data.trade.action !== 'HOLD') {
          const trader = AI_TRADERS_BASE[Math.floor(Math.random() * AI_TRADERS_BASE.length)]
          setAiLog(prev => [{
            name: trader.name,
            action: data.trade.action,
            symbol: data.trade.symbol,
            reasoning: data.trade.reasoning || 'AI analysis',
            ts: Date.now(),
          }, ...prev.slice(0, 9)])
        }
      } catch {}
    }, 45000)

    return () => { clearInterval(drift); clearInterval(aiPoll) }
  }, [access])

  // Compute P&L
  const floatingPnL = positions.reduce((sum, pos) => {
    const inst = INSTRUMENT_MAP[pos.symbol]
    if (!inst) return sum
    const price = prices[pos.symbol] || pos.entryPrice
    return sum + calcPnL(inst, pos.side, pos.entryPrice, price, pos.quantity)
  }, 0)
  const realizedPnL = closedTrades.reduce((s, t) => s + t.pnl, 0)
  const totalPnL = floatingPnL + realizedPnL
  const equity = cash + positions.reduce((s, p) => s + p.marginUsed, 0) + floatingPnL
  const pnlPct = ((equity - 10000) / 10000) * 100

  // Build leaderboard (human + AI + user)
  const userEntry: LeaderEntry = {
    rank: 0, name: 'You', initials: 'ME', pnlPct: +pnlPct.toFixed(2), pnl: +totalPnL.toFixed(0),
    trades: closedTrades.length + positions.length, color: '#00ff88'
  }
  const combined = [...HUMAN_TRADERS_BASE, ...aiTraders, userEntry]
    .sort((a, b) => b.pnlPct - a.pnlPct)
    .map((e, i) => ({ ...e, rank: i + 1 }))
  const userRank = combined.find(e => e.name === 'You')?.rank || 0

  // Prize calc (top 10 multiplier model)
  const ENTRY_FEE = 5
  const inTop10 = userRank <= 10
  const multiplier = inTop10 && pnlPct > 0 ? 1 + pnlPct / 100 : 0
  const projectedPayout = inTop10 ? +(ENTRY_FEE * multiplier).toFixed(2) : 0

  // Place order
  const placeOrder = useCallback(() => {
    const inst = INSTRUMENT_MAP[chartSymbol]
    if (!inst) return
    const price = prices[chartSymbol] || inst.mockBasePrice
    const quantity = parseFloat(qty)
    if (!quantity || quantity <= 0) { setOrderMsg('Invalid quantity'); return }

    const margin = calcMargin(inst, price, quantity, leverage)
    if (margin > cash) { setOrderMsg(`Need $${margin.toFixed(2)} margin, only $${cash.toFixed(2)} available`); return }

    const pos: Position = {
      id: crypto.randomUUID(), symbol: chartSymbol, side, quantity,
      entryPrice: price, currentPrice: price, pnl: 0, pnlPct: 0,
      marginUsed: margin, leverage,
    }
    setPositions(prev => [...prev, pos])
    setCash(prev => prev - margin)
    setOrderMsg(`${side.toUpperCase()} ${quantity} ${chartSymbol} @ $${price}`)
    setTimeout(() => setOrderMsg(''), 3000)
  }, [chartSymbol, side, qty, leverage, cash, prices])

  // Close position
  const closePosition = useCallback((posId: string) => {
    const pos = positions.find(p => p.id === posId)
    if (!pos) return
    const inst = INSTRUMENT_MAP[pos.symbol]
    if (!inst) return
    const exitPrice = prices[pos.symbol] || pos.entryPrice
    const pnl = calcPnL(inst, pos.side, pos.entryPrice, exitPrice, pos.quantity)
    setPositions(prev => prev.filter(p => p.id !== posId))
    setCash(prev => prev + pos.marginUsed + pnl)
    setClosedTrades(prev => [{ pnl }, ...prev])
    setOrderMsg(`Closed +$${pnl.toFixed(2)}`)
    setTimeout(() => setOrderMsg(''), 2000)
  }, [positions, prices])

  // Access denied
  if (access === 'checking') return (
    <div style={{ background: '#04080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 24, height: 24, border: '2px solid #00ff88', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  if (access === 'denied') return (
    <div style={{ background: '#04080f', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 20, padding: 24 }}>
      <Trophy size={48} color="#ffd700" />
      <div style={{ fontSize: 24, fontWeight: 900, color: '#fff', textAlign: 'center' }}>This tournament requires an entry fee</div>
      <div style={{ fontSize: 14, color: '#4a5e7a', textAlign: 'center', maxWidth: 400 }}>Pay $5 to enter and compete for multiplied returns. Top 10 traders get their entry fee × their P&L%.</div>
      <Link href="/arena" style={{ background: 'linear-gradient(135deg,#ffd700,#ff6b35)', color: '#04080f', fontWeight: 900, textDecoration: 'none', padding: '14px 32px', borderRadius: 12, fontSize: 16 }}>
        ← Back to Arena
      </Link>
    </div>
  )

  const instByType = INSTRUMENTS.filter(i => i.type === instrumentType)
  const currentInst = INSTRUMENT_MAP[chartSymbol]
  const currentPrice = prices[chartSymbol] || (currentInst?.mockBasePrice ?? 0)

  return (
    <div style={{ background: '#04080f', height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden', color: '#e8eaf0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes yn-pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:3px} ::-webkit-scrollbar-thumb{background:#1a2d4a;border-radius:3px}
      `}</style>

      {/* ── TOURNAMENT HEADER ── */}
      <div style={{ background: '#08111c', borderBottom: '1px solid #0d1826', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flexShrink: 0 }}>
        <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, color: '#4a5e7a', fontSize: 12 }}>
          <Trophy size={12} color="#ffd700" /> Arena
        </Link>
        <span style={{ color: '#1e3a5f' }}>›</span>
        <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Daily Blitz Tournament</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#ff6b35' }}>
          <Clock size={11} /> Closes <Countdown />
        </div>
        <div style={{ flex: 1 }} />
        {/* Live stats */}
        {[
          { label: 'Equity', value: `$${equity.toFixed(0)}`, color: '#cdd6f4' },
          { label: 'P&L', value: `${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%`, color: pnlPct >= 0 ? '#00ff88' : '#ff4757' },
          { label: 'Rank', value: `#${userRank}/${combined.length}`, color: userRank <= 10 ? '#ffd700' : '#4a5e7a' },
          { label: 'Payout', value: projectedPayout > 0 ? `$${projectedPayout}` : 'NOT TOP 10', color: projectedPayout > 0 ? '#00ff88' : '#4a5e7a' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 8, padding: '5px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: '#2a4060', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
          </div>
        ))}
        {inTop10 && pnlPct > 0 && (
          <div style={{ background: '#ffd70015', border: '1px solid #ffd70040', borderRadius: 8, padding: '5px 12px', fontSize: 11, color: '#ffd700', fontWeight: 700 }}>
            🏆 TOP 10 — ×{(1 + pnlPct/100).toFixed(2)} multiplier
          </div>
        )}
        <GoLive traderName="You" pnlPct={pnlPct} rank={userRank} symbol={chartSymbol} />
      </div>

      {/* ── MAIN WORKSPACE ── */}
      <div style={{ flex: 1, display: 'flex', minHeight: 0, overflow: 'hidden' }}>

        {/* ── LEFT: Chart ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' }}>

          {/* Instrument picker */}
          <div style={{ background: '#080f1c', borderBottom: '1px solid #0d1826', padding: '6px 12px', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0, overflowX: 'auto' }}>
            {/* Type tabs */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {TYPE_TABS.map(t => (
                <button key={t} onClick={() => { setInstrumentType(t); const first = INSTRUMENTS.find(i => i.type === t); if (first) setChartSymbol(first.symbol) }}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', border: 'none', cursor: 'pointer',
                    background: instrumentType === t ? (t === 'futures' ? '#ffd70020' : '#00ff8820') : 'transparent',
                    color: instrumentType === t ? (t === 'futures' ? '#ffd700' : '#00ff88') : '#2a4060',
                    outline: instrumentType === t ? `1px solid ${t === 'futures' ? '#ffd70040' : '#00ff8840'}` : 'none',
                  }}>
                  {t === 'futures' ? '⚡ ' + t : t}
                </button>
              ))}
            </div>

            {/* Symbol picker */}
            <div style={{ display: 'flex', gap: 4, overflowX: 'auto' }}>
              {instByType.map(inst => (
                <button key={inst.symbol} onClick={() => setChartSymbol(inst.symbol)}
                  style={{ padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                    background: chartSymbol === inst.symbol ? '#0d1826' : 'transparent',
                    color: chartSymbol === inst.symbol ? '#fff' : '#4a5e7a',
                    outline: chartSymbol === inst.symbol ? '1px solid #1a2d4a' : 'none',
                  }}>
                  {inst.symbol}
                </button>
              ))}
            </div>

            <div style={{ flex: 1 }} />

            {/* Interval */}
            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
              {[['1','1m'],['5','5m'],['15','15m'],['60','1h'],['240','4h'],['D','1D']].map(([v,l]) => (
                <button key={v} onClick={() => setChartInterval(v)}
                  style={{ padding: '3px 8px', borderRadius: 5, fontSize: 10, border: 'none', cursor: 'pointer',
                    background: chartInterval === v ? '#1e90ff20' : 'transparent',
                    color: chartInterval === v ? '#1e90ff' : '#2a4060',
                  }}>{l}</button>
              ))}
            </div>
          </div>

          {/* TradingView Chart */}
          <div style={{ flex: 1, minHeight: 0 }}>
            <TradingViewChart symbol={chartSymbol} interval={chartInterval} hideSideToolbar={false} />
          </div>

          {/* Positions table */}
          <div style={{ height: 140, flexShrink: 0, borderTop: '1px solid #0d1826', background: '#08111c', overflowY: 'auto' }}>
            <div style={{ padding: '6px 12px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#7f93b5', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Open Positions</span>
              <span style={{ fontSize: 10, color: '#4a5e7a' }}>{positions.length} active</span>
              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 800, color: floatingPnL >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>
                {floatingPnL >= 0 ? '+' : ''}${floatingPnL.toFixed(2)}
              </span>
            </div>
            {positions.length === 0 ? (
              <div style={{ padding: '20px', fontSize: 11, color: '#2a4060', textAlign: 'center' }}>No open positions — place an order below</div>
            ) : (
              positions.map(pos => {
                const inst = INSTRUMENT_MAP[pos.symbol]
                const price = prices[pos.symbol] || pos.entryPrice
                const pnl = inst ? calcPnL(inst, pos.side, pos.entryPrice, price, pos.quantity) : 0
                return (
                  <div key={pos.id} style={{ display: 'grid', gridTemplateColumns: '80px 50px 60px 80px 80px 80px 60px 1fr', padding: '6px 12px', borderBottom: '1px solid #080f18', fontSize: 11 }}>
                    <span style={{ fontWeight: 700, color: '#fff' }}>{pos.symbol}</span>
                    <span style={{ color: pos.side === 'long' ? '#00ff88' : '#ff4757', fontWeight: 700 }}>{pos.side.toUpperCase()}</span>
                    <span style={{ color: '#7f93b5', fontFamily: 'monospace' }}>{pos.quantity}</span>
                    <span style={{ color: '#4a5e7a', fontFamily: 'monospace' }}>${pos.entryPrice.toFixed(inst?.digits ?? 2)}</span>
                    <span style={{ color: '#cdd6f4', fontFamily: 'monospace' }}>${price.toFixed(inst?.digits ?? 2)}</span>
                    <span style={{ color: pnl >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace', fontWeight: 700 }}>{pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}</span>
                    <span style={{ color: '#4a5e7a', fontSize: 10 }}>×{pos.leverage}</span>
                    <button onClick={() => closePosition(pos.id)}
                      style={{ fontSize: 10, color: '#ff4757', background: '#ff475715', border: '1px solid #ff475730', borderRadius: 5, padding: '2px 8px', cursor: 'pointer' }}>
                      Close
                    </button>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* ── ORDER PANEL ── */}
        <div style={{ width: 220, flexShrink: 0, borderLeft: '1px solid #0d1826', borderRight: '1px solid #0d1826', background: '#08111c', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #0d1826', flexShrink: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 900, color: '#fff', marginBottom: 2 }}>{chartSymbol}</div>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#cdd6f4', fontFamily: 'monospace' }}>
              ${currentPrice.toFixed(currentInst?.digits ?? 2)}
            </div>
            <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 2 }}>
              Cash: <span style={{ color: '#00ff88', fontWeight: 700, fontFamily: 'monospace' }}>${cash.toFixed(0)}</span>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {/* Long/Short */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
              {(['long','short'] as const).map(s => (
                <button key={s} onClick={() => setSide(s)}
                  style={{ padding: '8px', border: 'none', borderRadius: 8, fontSize: 11, fontWeight: 800, cursor: 'pointer',
                    background: side === s ? (s === 'long' ? '#00ff8820' : '#ff475720') : '#0d1826',
                    color: side === s ? (s === 'long' ? '#00ff88' : '#ff4757') : '#4a5e7a',
                    outline: side === s ? `1px solid ${s === 'long' ? '#00ff8840' : '#ff475740'}` : 'none',
                  }}>
                  {s === 'long' ? '▲ LONG' : '▼ SHORT'}
                </button>
              ))}
            </div>

            {/* Quantity */}
            <div>
              <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>
                {currentInst?.type === 'forex' ? 'Lots' : currentInst?.type === 'futures' ? 'Contracts' : 'Shares'}
              </div>
              <input value={qty} onChange={e => setQty(e.target.value)} type="number" min="0" step="1"
                style={{ width: '100%', background: '#0d1826', border: '1px solid #1a2d4a', borderRadius: 8, padding: '8px 10px', color: '#fff', fontSize: 13, fontFamily: 'monospace', outline: 'none' }}
                onFocus={e => (e.currentTarget.style.borderColor = '#00ff88')}
                onBlur={e => (e.currentTarget.style.borderColor = '#1a2d4a')} />
            </div>

            {/* Quick qty presets */}
            <div style={{ display: 'flex', gap: 4 }}>
              {(currentInst?.type === 'forex' ? ['0.01','0.1','0.5','1'] : ['1','5','10','25']).map(v => (
                <button key={v} onClick={() => setQty(v)}
                  style={{ flex: 1, padding: '4px', background: qty === v ? '#1a2d4a' : '#0d1826', border: 'none', borderRadius: 5, fontSize: 10, color: qty === v ? '#fff' : '#4a5e7a', cursor: 'pointer' }}>
                  {v}
                </button>
              ))}
            </div>

            {/* Leverage (if applicable) */}
            {currentInst && currentInst.leverage.length > 1 && (
              <div>
                <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>Leverage</div>
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {currentInst.leverage.map(lv => (
                    <button key={lv} onClick={() => setLeverage(lv)}
                      style={{ padding: '4px 8px', background: leverage === lv ? '#1e90ff20' : '#0d1826', border: leverage === lv ? '1px solid #1e90ff40' : '1px solid #0d1826', borderRadius: 5, fontSize: 10, color: leverage === lv ? '#1e90ff' : '#4a5e7a', cursor: 'pointer' }}>
                      ×{lv}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SL / TP */}
            {['Stop Loss','Take Profit'].map((label, i) => (
              <div key={label}>
                <div style={{ fontSize: 9, color: '#4a5e7a', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 4 }}>{label}</div>
                <input value={i === 0 ? sl : tp} onChange={e => i === 0 ? setSl(e.target.value) : setTp(e.target.value)}
                  placeholder="Optional" type="number"
                  style={{ width: '100%', background: '#0d1826', border: `1px solid ${i === 0 ? '#ff475720' : '#00ff8820'}`, borderRadius: 8, padding: '7px 10px', color: i === 0 ? '#ff4757' : '#00ff88', fontSize: 12, fontFamily: 'monospace', outline: 'none' }} />
              </div>
            ))}

            {/* Margin preview */}
            {currentInst && qty && parseFloat(qty) > 0 && (
              <div style={{ background: '#0d1826', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4 }}>Margin Required</div>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#cdd6f4', fontFamily: 'monospace' }}>
                  ${calcMargin(currentInst, currentPrice, parseFloat(qty) || 0, leverage).toFixed(2)}
                </div>
              </div>
            )}

            {orderMsg && (
              <div style={{ fontSize: 11, color: orderMsg.includes('Need') ? '#ff4757' : '#00ff88', background: orderMsg.includes('Need') ? '#ff475710' : '#00ff8810', border: `1px solid ${orderMsg.includes('Need') ? '#ff475730' : '#00ff8830'}`, borderRadius: 8, padding: '8px 10px', fontFamily: 'monospace' }}>
                {orderMsg}
              </div>
            )}

            <button onClick={placeOrder}
              style={{ width: '100%', padding: '12px', background: `linear-gradient(135deg, ${side === 'long' ? '#00ff88, #00cc66' : '#ff4757, #cc2233'})`, color: '#04080f', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 900, cursor: 'pointer', letterSpacing: 0.5 }}>
              {side === 'long' ? '▲ BUY' : '▼ SELL'} {chartSymbol}
            </button>
          </div>
        </div>

        {/* ── LEADERBOARD PANEL ── */}
        <div style={{ width: leaderPanel ? 240 : 32, flexShrink: 0, background: '#08111c', borderLeft: '1px solid #0d1826', display: 'flex', flexDirection: 'column', transition: 'width 0.2s', overflow: 'hidden' }}>
          <button onClick={() => setLeaderPanel(o => !o)}
            style={{ height: 36, background: 'none', border: 'none', borderBottom: '1px solid #0d1826', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#4a5e7a', flexShrink: 0, width: '100%' }}>
            {leaderPanel ? <><Crown size={11} color="#ffd700" /><span style={{ fontSize: 10, fontWeight: 800, color: '#ffd700' }}>RANKINGS</span><ChevronDown size={10} style={{ transform: 'rotate(-90deg)' }} /></> : <Crown size={12} color="#ffd700" />}
          </button>

          {leaderPanel && (
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {/* AI Activity Log */}
              {aiLog.length > 0 && (
                <div style={{ borderBottom: '1px solid #0d1826' }}>
                  <div style={{ padding: '6px 10px', fontSize: 9, color: '#bf5fff', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Bot size={9} /> AI ACTIVITY
                  </div>
                  {aiLog.slice(0, 3).map((log, i) => (
                    <div key={i} style={{ padding: '5px 10px', borderBottom: '1px solid #080f18' }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#bf5fff' }}>{log.name} {log.action} {log.symbol}</div>
                      <div style={{ fontSize: 9, color: '#4a5e7a', lineHeight: 1.4 }}>{log.reasoning}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Leaderboard */}
              {combined.map((e, i) => (
                <div key={e.name} style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderBottom: '1px solid #080f18',
                  background: e.name === 'You' ? '#00ff8810' : i < 3 ? `${e.color}07` : 'transparent',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: i === 0 ? '#ffd700' : '#2a4060', fontFamily: 'monospace', width: 16, flexShrink: 0 }}>{i+1}</div>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: `${e.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 900, color: e.color, flexShrink: 0 }}>
                    {e.isAI ? <Bot size={10} color={e.color} /> : e.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: e.name === 'You' ? '#00ff88' : '#cdd6f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {e.name === 'You' ? '★ You' : e.name}
                    </div>
                    {e.isAI && <div style={{ fontSize: 8, color: '#bf5fff' }}>AI · {e.aiStyle}</div>}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 900, color: e.pnlPct >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace', flexShrink: 0 }}>
                    {e.pnlPct >= 0 ? '+' : ''}{e.pnlPct.toFixed(1)}%
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
