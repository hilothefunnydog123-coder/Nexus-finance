'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import ShareResult from '@/components/arena/ShareResult'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const T = {
  bg: '#040508', surface: '#0d1117', raised: '#161b22', border: '#21262d',
  green: '#22c55e', gold: '#f59e0b', red: '#ef4444', orange: '#f97316',
  blue: '#3b82f6', purple: '#7c3aed',
  text: '#e6edf3', muted: '#8b949e', dim: '#484f58',
  silver: '#c0c0d0', bronze: '#cd7f32',
}

// ─── FAKE DATA ────────────────────────────────────────────────────────────────
const USER_NAME   = 'Alex R.'
const USER_RANK: number = 3
const USER_TOTAL  = 390
const USER_PNL    = 18.4
const USER_PAYOUT = 132
const CASHED      = true
const CONTEST     = 'Daily Blitz'

interface Trade {
  id: number; time: string; symbol: string; side: 'LONG' | 'SHORT'
  entry: number; exit: number; qty: number; pnl: number; pct: number
}
const TRADES: Trade[] = [
  { id:1, time:'09:31', symbol:'NVDA', side:'LONG',  entry:891.40, exit:908.75, qty:2,  pnl:+34.70,  pct:+1.95 },
  { id:2, time:'09:48', symbol:'ES',   side:'SHORT', entry:5284.0, exit:5271.5, qty:1,  pnl:+62.50,  pct:+0.24 },
  { id:3, time:'10:12', symbol:'AAPL', side:'LONG',  entry:213.82, exit:210.44, qty:10, pnl:-33.80,  pct:-1.58 },
  { id:4, time:'10:55', symbol:'TSLA', side:'LONG',  entry:248.15, exit:255.70, qty:5,  pnl:+37.75,  pct:+3.04 },
  { id:5, time:'11:20', symbol:'BTC/USD', side:'SHORT', entry:68420, exit:67890, qty:0.1, pnl:+53.00, pct:+0.78 },
  { id:6, time:'12:03', symbol:'NVDA', side:'SHORT', entry:911.20, exit:905.60, qty:2,  pnl:+11.20,  pct:+0.61 },
  { id:7, time:'13:15', symbol:'QQQ',  side:'LONG',  entry:477.30, exit:481.90, qty:8,  pnl:+36.80,  pct:+0.96 },
]

interface Leader { rank: number; name: string; init: string; pnlPct: number; color: string; payout: number }
const LEADERBOARD: Leader[] = [
  { rank:1, name:'Marcus T.',  init:'MT', pnlPct:24.8, color:T.gold,   payout:247 },
  { rank:2, name:'YN-ALPHA',  init:'Aα', pnlPct:21.3, color:T.purple, payout:189 },
  { rank:3, name:'Alex R.',   init:'AR', pnlPct:18.4, color:T.green,  payout:132 },
  { rank:4, name:'Sarah K.',  init:'SK', pnlPct:15.2, color:T.blue,   payout: 98 },
  { rank:5, name:'Devon P.',  init:'DP', pnlPct:12.7, color:T.orange, payout: 74 },
  { rank:6, name:'Jordan M.', init:'JM', pnlPct: 9.4, color:T.muted,  payout: 52 },
  { rank:7, name:'Aisha B.',  init:'AB', pnlPct: 7.1, color:T.muted,  payout: 38 },
  { rank:8, name:'Chris L.',  init:'CL', pnlPct: 4.8, color:T.muted,  payout: 27 },
  { rank:9, name:'Nina R.',   init:'NR', pnlPct: 3.2, color:T.muted,  payout: 19 },
  { rank:10, name:'YN-BETA',  init:'Bβ', pnlPct: 1.9, color:T.muted,  payout: 12 },
]

// ─── CONFETTI CANVAS ─────────────────────────────────────────────────────────
function Confetti() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d'); if (!ctx) return
    canvas.width  = window.innerWidth
    canvas.height = window.innerHeight
    const pieces: { x:number; y:number; vx:number; vy:number; color:string; size:number; angle:number; va:number }[] = []
    const colors = ['#22c55e','#f59e0b','#3b82f6','#a855f7','#ef4444','#fff']
    for (let i = 0; i < 180; i++) {
      pieces.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height - canvas.height,
        vx: (Math.random() - 0.5) * 3,
        vy: 2 + Math.random() * 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 6 + Math.random() * 8,
        angle: Math.random() * Math.PI * 2,
        va: (Math.random() - 0.5) * 0.15,
      })
    }
    let frame = 0
    const animate = () => {
      if (frame > 220) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      pieces.forEach(p => {
        p.x += p.vx; p.y += p.vy; p.angle += p.va; p.vy += 0.05
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.globalAlpha = Math.max(0, 1 - frame / 180)
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5)
        ctx.restore()
      })
      frame++
      requestAnimationFrame(animate)
    }
    animate()
  }, [])
  return <canvas ref={canvasRef} style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:999 }} />
}

// ─── RANK COLOR ───────────────────────────────────────────────────────────────
function rankColor(rank: number): string {
  if (rank === 1) return T.gold
  if (rank === 2) return T.silver
  if (rank === 3) return T.bronze
  if (rank <= 10) return T.text
  return T.dim
}

// ─── IMPROVEMENTS (non-cash) ─────────────────────────────────────────────────
const IMPROVEMENTS = [
  { icon:'📉', label:'Biggest drag', value:'AAPL -$33.80', tip:'Cut losers faster. Your AAPL trade ran -1.6% before close.' },
  { icon:'⚡', label:'Win rate',     value:'6/7 trades',   tip:'86% win rate is great. Focus on size — losers cost 3× average winner.' },
  { icon:'🎯', label:'Miss by',      value:'7 ranks',      tip:'Top 10 needed +9.4%. You had the trades — hold winners longer.' },
]

// ─── PAGE ────────────────────────────────────────────────────────────────────
export default function TournamentResultsPage() {
  const params = useParams()
  const id = (params?.id as string) || 'daily-blitz'
  const [showShare, setShowShare] = useState(false)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setRevealed(true), 300)
    return () => clearTimeout(t)
  }, [])

  const rankMedal = USER_RANK === 1 ? '🥇' : USER_RANK === 2 ? '🥈' : USER_RANK === 3 ? '🥉' : `#${USER_RANK}`
  const winRate = Math.round((TRADES.filter(t => t.pnl > 0).length / TRADES.length) * 100)
  const totalPnL = TRADES.reduce((s, t) => s + t.pnl, 0)
  const bestTrade = TRADES.reduce((b, t) => t.pnl > b.pnl ? t : b, TRADES[0])
  const worstTrade = TRADES.reduce((w, t) => t.pnl < w.pnl ? t : w, TRADES[0])

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'Inter,system-ui,sans-serif' }}>
      <style>{`
        @keyframes fade-up   { from { opacity:0; transform:translateY(24px) } to { opacity:1; transform:translateY(0) } }
        @keyframes scale-in  { from { opacity:0; transform:scale(0.88) }      to { opacity:1; transform:scale(1) }     }
        @keyframes glow-gold { 0%,100%{box-shadow:0 0 0 0 rgba(245,158,11,0.4)} 50%{box-shadow:0 0 32px 8px rgba(245,158,11,0.15)} }
        @keyframes glow-green{ 0%,100%{box-shadow:0 0 0 0 rgba(34,197,94,0.4)} 50%{box-shadow:0 0 32px 8px rgba(34,197,94,0.15)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#21262d;border-radius:4px}
      `}</style>

      {CASHED && revealed && <Confetti />}

      {/* ── TOP NAV ── */}
      <div style={{ height: 48, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, padding: '0 24px' }}>
        <Link href="/arena" style={{ textDecoration: 'none', fontSize: 12, color: T.dim, display: 'flex', alignItems: 'center', gap: 5 }}>
          ← Arena
        </Link>
        <span style={{ color: T.border }}>›</span>
        <span style={{ fontSize: 12, color: T.muted }}>{CONTEST}</span>
        <span style={{ color: T.border }}>›</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>Results</span>
      </div>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px 80px' }}>

        {/* ── HERO ── */}
        <div style={{
          textAlign: 'center', marginBottom: 48,
          animation: revealed ? 'scale-in 0.5s cubic-bezier(0.34,1.56,0.64,1) both' : 'none',
        }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.2em', textTransform: 'uppercase', color: T.muted, marginBottom: 16 }}>
            {CONTEST} — Tournament Complete
          </div>

          {/* Rank badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 120, height: 120, borderRadius: '50%',
            background: CASHED ? `radial-gradient(circle, rgba(245,158,11,0.2), rgba(4,5,8,0.9))` : `radial-gradient(circle, rgba(59,130,246,0.2), rgba(4,5,8,0.9))`,
            border: `3px solid ${CASHED ? T.gold : T.blue}`,
            fontSize: 48, marginBottom: 20,
            animation: CASHED ? 'glow-gold 2.5s ease-in-out infinite' : 'none',
          }}>
            {rankMedal}
          </div>

          <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1, color: T.text, letterSpacing: -2, marginBottom: 8 }}>
            {USER_RANK === 1 ? '1st' : USER_RANK === 2 ? '2nd' : USER_RANK === 3 ? '3rd' : `${USER_RANK}th`}{' '}
            <span style={{ color: T.muted, fontSize: 36 }}>of {USER_TOTAL}</span>
          </div>

          <div style={{
            fontSize: 52, fontWeight: 900, fontFamily: 'monospace',
            color: USER_PNL >= 0 ? T.green : T.red,
            letterSpacing: -1, marginBottom: 16,
          }}>
            {USER_PNL >= 0 ? '+' : ''}{USER_PNL}%
          </div>

          {CASHED ? (
            <div style={{
              display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: 'rgba(34,197,94,0.08)', border: `1px solid rgba(34,197,94,0.35)`,
              borderRadius: 16, padding: '20px 40px',
              animation: 'glow-green 2.5s ease-in-out infinite',
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: T.green, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Payout</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: T.green, fontFamily: 'monospace' }}>${USER_PAYOUT}</div>
              <div style={{ fontSize: 12, color: T.muted }}>Payout via Stripe within 24 hours</div>
            </div>
          ) : (
            <div style={{ fontSize: 16, color: T.muted, maxWidth: 420, margin: '0 auto', lineHeight: 1.8 }}>
              You didn't cash this time — but look at that win rate.<br />
              One more disciplined session and you're on the podium.
            </div>
          )}
        </div>

        {/* ── ACTION BUTTONS ── */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 56, flexWrap: 'wrap', animation: revealed ? 'fade-up 0.5s 0.2s both' : 'none' }}>
          <button
            onClick={() => setShowShare(true)}
            style={{ padding: '12px 28px', background: `linear-gradient(135deg,${T.green},#16a34a)`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', letterSpacing: 0.3 }}
          >
            Share Result
          </button>
          <Link href={`/arena/tournament/${id}?entered=1`} style={{
            padding: '12px 28px', background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.text, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block',
          }}>
            Enter Tomorrow's Tournament
          </Link>
          <Link href="/app" style={{
            padding: '12px 28px', background: T.surface, border: `1px solid ${T.border}`,
            borderRadius: 10, color: T.muted, fontSize: 14, fontWeight: 700, textDecoration: 'none', display: 'inline-block',
          }}>
            Build Your Track Record →
          </Link>
        </div>

        {/* ── STATS SUMMARY ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 40, animation: revealed ? 'fade-up 0.5s 0.3s both' : 'none' }}>
          {[
            { label: 'Total P&L', value: `$${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? T.green : T.red },
            { label: 'Win Rate',  value: `${winRate}%`,              color: T.text },
            { label: 'Trades',    value: `${TRADES.length}`,          color: T.text },
            { label: 'Best Trade',value: `+$${bestTrade.pnl.toFixed(2)}`, color: T.green },
          ].map(s => (
            <div key={s.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* ── TWO COLUMN: TRADES + LEADERBOARD ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24, animation: revealed ? 'fade-up 0.5s 0.4s both' : 'none' }}>

          {/* TRADE HISTORY */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Trade History</div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr 56px 90px 90px 80px', padding: '10px 16px', background: T.raised, borderBottom: `1px solid ${T.border}`, gap: 8 }}>
                {['Time', 'Symbol', 'Side', 'Entry', 'Exit', 'P&L'].map(h => (
                  <div key={h} style={{ fontSize: 9, fontWeight: 800, color: T.dim, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{h}</div>
                ))}
              </div>
              {TRADES.map((trade, i) => (
                <div key={trade.id} style={{
                  display: 'grid', gridTemplateColumns: '48px 1fr 56px 90px 90px 80px',
                  padding: '12px 16px', gap: 8,
                  borderBottom: i < TRADES.length - 1 ? `1px solid ${T.border}` : 'none',
                  background: trade.id === bestTrade.id ? 'rgba(34,197,94,0.04)' : trade.id === worstTrade.id ? 'rgba(239,68,68,0.04)' : 'transparent',
                  alignItems: 'center',
                }}>
                  <div style={{ fontSize: 11, color: T.dim, fontFamily: 'monospace' }}>{trade.time}</div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{trade.symbol}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: trade.side === 'LONG' ? T.green : T.red }}>{trade.side}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{trade.entry.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: T.muted, fontFamily: 'monospace' }}>{trade.exit.toLocaleString()}</div>
                  <div style={{ fontSize: 13, fontWeight: 900, color: trade.pnl >= 0 ? T.green : T.red, fontFamily: 'monospace' }}>
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Improvement section — shown to both cashers and non-cashers */}
            {!CASHED && (
              <div style={{ marginTop: 24 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>What to Improve</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {IMPROVEMENTS.map(item => (
                    <div key={item.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 22, lineHeight: 1 }}>{item.icon}</span>
                      <div>
                        <div style={{ display: 'flex', gap: 10, alignItems: 'baseline', marginBottom: 4 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: T.text }}>{item.label}</span>
                          <span style={{ fontSize: 12, fontFamily: 'monospace', color: T.gold, fontWeight: 700 }}>{item.value}</span>
                        </div>
                        <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.6 }}>{item.tip}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* LEADERBOARD */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 14 }}>Final Leaderboard</div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden' }}>
              {LEADERBOARD.map((entry, i) => {
                const isUser = entry.name === USER_NAME
                return (
                  <div key={entry.rank} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px',
                    borderBottom: i < LEADERBOARD.length - 1 ? `1px solid ${T.border}` : 'none',
                    background: isUser ? 'rgba(34,197,94,0.07)' : 'transparent',
                    borderLeft: isUser ? `3px solid ${T.green}` : `3px solid transparent`,
                    transition: 'background 0.2s',
                  }}>
                    <div style={{ width: 24, fontSize: 12, fontWeight: 700, color: rankColor(entry.rank), fontFamily: 'monospace', textAlign: 'right', flexShrink: 0 }}>
                      {entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : entry.rank === 3 ? '🥉' : `#${entry.rank}`}
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: 6, background: `${entry.color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: entry.color, flexShrink: 0 }}>
                      {entry.init}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: isUser ? 800 : 600, color: isUser ? T.green : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {isUser ? '★ You' : entry.name}
                      </div>
                      {entry.payout > 0 && (
                        <div style={{ fontSize: 10, color: T.dim, fontFamily: 'monospace' }}>${entry.payout} payout</div>
                      )}
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 900, color: entry.pnlPct >= 0 ? T.green : T.red, fontFamily: 'monospace', flexShrink: 0 }}>
                      {entry.pnlPct >= 0 ? '+' : ''}{entry.pnlPct}%
                    </div>
                  </div>
                )
              })}
              <div style={{ padding: '10px 14px', background: T.raised, borderTop: `1px solid ${T.border}`, fontSize: 10, color: T.dim, textAlign: 'center' }}>
                {USER_TOTAL - LEADERBOARD.length} more traders — top 10 cash
              </div>
            </div>

            {/* Track record CTA */}
            <div style={{ marginTop: 16, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '18px 16px' }}>
              <div style={{ fontSize: 13, fontWeight: 800, color: T.text, marginBottom: 6 }}>Build your track record</div>
              <div style={{ fontSize: 12, color: T.muted, lineHeight: 1.7, marginBottom: 14 }}>
                Every tournament result lives on your profile. A strong track record unlocks prop firm opportunities.
              </div>
              <Link href="/app" style={{ display: 'block', textAlign: 'center', padding: '10px', background: T.raised, border: `1px solid ${T.border}`, borderRadius: 8, color: T.text, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                View My Profile →
              </Link>
            </div>
          </div>
        </div>

        {/* ── NON-CASH CTA ── */}
        {!CASHED && (
          <div style={{ marginTop: 40, textAlign: 'center', animation: revealed ? 'fade-up 0.5s 0.6s both' : 'none' }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: T.text, marginBottom: 8 }}>
              Tomorrow's tournament starts at 9:30 AM ET
            </div>
            <div style={{ fontSize: 14, color: T.muted, marginBottom: 24 }}>
              Use tonight to brush up. The gap between your rank and the podium is three good trades.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Link href="/arena" style={{ padding: '14px 32px', background: `linear-gradient(135deg,${T.green},#16a34a)`, border: 'none', borderRadius: 10, color: '#fff', fontSize: 14, fontWeight: 800, textDecoration: 'none' }}>
                Enter Tomorrow's Tournament
              </Link>
              <Link href="/app" style={{ padding: '14px 32px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, color: T.text, fontSize: 14, fontWeight: 700, textDecoration: 'none' }}>
                Study the Tape →
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* ── SHARE MODAL ── */}
      {showShare && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(4,5,8,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}
          onClick={e => { if (e.target === e.currentTarget) setShowShare(false) }}
        >
          <div style={{ position: 'relative' }}>
            <button onClick={() => setShowShare(false)} style={{ position: 'absolute', top: -12, right: -12, background: T.surface, border: `1px solid ${T.border}`, borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: T.muted, fontSize: 14, zIndex: 10 }}>
              ✕
            </button>
            <ShareResult
              name={USER_NAME}
              rank={USER_RANK}
              total={USER_TOTAL}
              pnlPct={USER_PNL}
              payout={USER_PAYOUT}
              contest={CONTEST}
            />
          </div>
        </div>
      )}
    </div>
  )
}
