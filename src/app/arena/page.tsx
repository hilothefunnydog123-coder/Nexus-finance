'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import {
  Trophy, Users, Clock, Zap, TrendingUp, TrendingDown, Shield,
  ChevronDown, ChevronUp, Crown, Play, Eye, Star, Flame,
  BarChart2, MessageSquare, DollarSign, Award, Filter, Bot,
} from 'lucide-react'
import TradingViewChart, { TV_SYMBOLS } from '@/components/chart/TradingViewChart'

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface Contest {
  id: string
  type: 'cash' | 'gpp' | 'h2h' | 'satellite'
  title: string
  description: string
  prizePool: number
  entryFee: number
  maxEntries: number
  filled: number
  lateEntry: boolean
  tier: string
  featured?: boolean
}

interface StreamTrader {
  id: number
  name: string
  initials: string
  asset: string
  timeframe: string
  pnlPct: number
  pnlDollar: number
  viewers: number
  color: string
  pathSeed: number
}

interface LeaderboardTrader {
  rank: number
  name: string
  initials: string
  winRate: number
  totalEarned: number
  bestFinish: number
  currentStreak: number
  tournaments: number
  color: string
  badge?: string
}

interface ChatMsg {
  user: string
  text: string
  color: string
  ts: number
}

interface MyContest {
  id: string
  title: string
  type: string
  pnlPct: number
  pnlDollar: number
  rank: number
  totalEntries: number
  color: string
  entryFee: number
}

// ─── STATIC DATA ──────────────────────────────────────────────────────────────

const CONTESTS: Contest[] = [
  // Featured Mega GPP
  { id: 'mega-gpp', type: 'gpp', title: 'Mega GPP — $10K Guaranteed', description: 'Biggest daily tournament. Top 15% of field wins a share of $10,000 guaranteed prize pool.', prizePool: 10000, entryFee: 25, maxEntries: 500, filled: 441, lateEntry: false, tier: 'elite', featured: true },
  // Cash (50/50)
  { id: 'double-up-1', type: 'cash', title: 'Double Up $1', description: 'Classic 50/50. Top half of field doubles their entry fee.', prizePool: 200, entryFee: 1, maxEntries: 200, filled: 178, lateEntry: false, tier: 'standard' },
  { id: 'double-up-5', type: 'cash', title: 'Double Up $5', description: 'Top 50% wins $10. Simple, consistent, great for cash grinding.', prizePool: 500, entryFee: 5, maxEntries: 100, filled: 99, lateEntry: true, tier: 'standard' },
  { id: 'quick-cash', type: 'cash', title: 'Quick Cash $2', description: 'Fast 50/50 for active traders. Fill is near capacity — enter now.', prizePool: 400, entryFee: 2, maxEntries: 200, filled: 183, lateEntry: false, tier: 'standard' },
  { id: 'beginner-double', type: 'cash', title: "Beginner's Double", description: 'Designed for new traders. $1 entry, capped field of 50.', prizePool: 100, entryFee: 1, maxEntries: 50, filled: 34, lateEntry: false, tier: 'standard' },
  { id: 'cash-10', type: 'cash', title: 'High Stakes Double $10', description: 'Top 50% wins $20. Limited to 100 players for tighter competition.', prizePool: 1000, entryFee: 10, maxEntries: 100, filled: 72, lateEntry: false, tier: 'premium' },
  { id: 'cash-25', type: 'cash', title: 'Pro Cash $25', description: 'Elite 50/50. Win $50. Only 50 spots. High floor payout.', prizePool: 1250, entryFee: 25, maxEntries: 50, filled: 47, lateEntry: true, tier: 'elite' },
  // GPP Tournaments
  { id: 'daily-blitz', type: 'gpp', title: 'Daily Blitz', description: 'Top 20% wins. $1 entry. Best ROI for new players.', prizePool: 312, entryFee: 1, maxEntries: 500, filled: 390, lateEntry: false, tier: 'standard' },
  { id: 'crypto-night', type: 'gpp', title: 'Crypto Night', description: 'Crypto assets only. Wild swings, massive upside. Top 20% cashes.', prizePool: 1250, entryFee: 5, maxEntries: 250, filled: 188, lateEntry: false, tier: 'premium' },
  { id: 'pro-showdown', type: 'gpp', title: 'Pro Showdown $25', description: 'Veterans only. 100 players max. Top prize is $400.', prizePool: 2500, entryFee: 25, maxEntries: 100, filled: 44, lateEntry: false, tier: 'elite' },
  { id: 'mini-tourney', type: 'gpp', title: 'Mini Tournament $1', description: 'Small field GPP. Top 3 win real prizes. Great for building a record.', prizePool: 50, entryFee: 1, maxEntries: 50, filled: 38, lateEntry: false, tier: 'standard' },
  { id: 'weekend-cup', type: 'gpp', title: 'Weekend Cup $5', description: 'Saturday special. All markets open. Bigger field, stacked prize pool.', prizePool: 2500, entryFee: 5, maxEntries: 500, filled: 267, lateEntry: false, tier: 'premium' },
  { id: 'stock-warriors', type: 'gpp', title: 'Stock Warriors $10', description: 'Equities only. SPY, NVDA, AAPL and friends. Top 20% cashes.', prizePool: 1000, entryFee: 10, maxEntries: 100, filled: 61, lateEntry: false, tier: 'premium' },
  { id: 'forex-open', type: 'gpp', title: 'Forex Open $5', description: 'Currency pairs only. London + NY session. Tight spreads.', prizePool: 750, entryFee: 5, maxEntries: 150, filled: 89, lateEntry: false, tier: 'premium' },
  // Head-to-Head
  { id: 'h2h-1', type: 'h2h', title: 'Head to Head $1', description: 'You vs. one other trader. Higher P&L after 4 hours wins $2.', prizePool: 2, entryFee: 1, maxEntries: 2, filled: 1, lateEntry: false, tier: 'standard' },
  { id: 'h2h-5', type: 'h2h', title: 'H2H Duel $5', description: 'Winner takes $10. One opponent. Pure skill matchup.', prizePool: 10, entryFee: 5, maxEntries: 2, filled: 0, lateEntry: false, tier: 'standard' },
  { id: 'h2h-25', type: 'h2h', title: 'H2H Pro $25', description: 'High-stakes duel. Winner takes $50. Veteran matchmaking.', prizePool: 50, entryFee: 25, maxEntries: 2, filled: 1, lateEntry: false, tier: 'elite' },
  { id: 'h2h-100', type: 'h2h', title: 'H2H Elite $100', description: 'The highest stakes head-to-head available. Winner-take-all $200.', prizePool: 200, entryFee: 100, maxEntries: 2, filled: 0, lateEntry: false, tier: 'elite' },
  // Satellites
  { id: 'sat-mega', type: 'satellite', title: 'Satellite to Mega GPP', description: 'Win a FREE entry into the $10K Mega GPP. Only $2 to enter.', prizePool: 0, entryFee: 2, maxEntries: 10, filled: 7, lateEntry: false, tier: 'standard' },
  { id: 'sat-crypto', type: 'satellite', title: 'Crypto Satellite $1', description: 'Win your way into Crypto Night for free. Best deal on the board.', prizePool: 0, entryFee: 1, maxEntries: 5, filled: 3, lateEntry: false, tier: 'standard' },
  { id: 'sat-pro', type: 'satellite', title: 'Pro Showdown Satellite', description: 'Win a $25 entry into Pro Showdown for only $5. 5-player field.', prizePool: 0, entryFee: 5, maxEntries: 5, filled: 4, lateEntry: true, tier: 'premium' },
]

const STREAMS: StreamTrader[] = [
  { id: 0, name: 'Marcus T.',  initials: 'MT', asset: 'AAPL',    timeframe: '5m',  pnlPct: 18.4,  pnlDollar: 1840, viewers: 2847, color: '#00ff88', pathSeed: 1 },
  { id: 1, name: 'Sarah K.',   initials: 'SK', asset: 'BTC/USD', timeframe: '1H',  pnlPct: 12.1,  pnlDollar: 1210, viewers: 1654, color: '#ffd700', pathSeed: 2 },
  { id: 2, name: 'Devon P.',   initials: 'DP', asset: 'EUR/USD', timeframe: '15m', pnlPct: 7.8,   pnlDollar: 780,  viewers: 987,  color: '#1e90ff', pathSeed: 3 },
  { id: 3, name: 'Aisha B.',   initials: 'AB', asset: 'NVDA',    timeframe: '1D',  pnlPct: 22.3,  pnlDollar: 2230, viewers: 1432, color: '#bf5fff', pathSeed: 4 },
  { id: 4, name: 'Jordan M.',  initials: 'JM', asset: 'SPY',     timeframe: '1m',  pnlPct: -3.2,  pnlDollar: -320, viewers: 743,  color: '#ff4757', pathSeed: 5 },
  { id: 5, name: 'Nina R.',    initials: 'NR', asset: 'ETH/USD', timeframe: '4H',  pnlPct: 9.1,   pnlDollar: 910,  viewers: 521,  color: '#ff6b35', pathSeed: 6 },
]

const LEADERBOARD_DATA: LeaderboardTrader[] = [
  { rank: 1,  name: 'Marcus T.',    initials: 'MT', winRate: 67, totalEarned: 4280, bestFinish: 1, currentStreak: 5, tournaments: 48, color: '#ffd700', badge: '👑' },
  { rank: 2,  name: 'Priya S.',     initials: 'PS', winRate: 71, totalEarned: 3920, bestFinish: 1, currentStreak: 3, tournaments: 41, color: '#00ff88', badge: '🔥' },
  { rank: 3,  name: 'Devon P.',     initials: 'DP', winRate: 58, totalEarned: 2847, bestFinish: 1, currentStreak: 2, tournaments: 55, color: '#1e90ff', badge: '⚡' },
  { rank: 4,  name: 'Sarah K.',     initials: 'SK', winRate: 62, totalEarned: 2400, bestFinish: 2, currentStreak: 4, tournaments: 37, color: '#bf5fff' },
  { rank: 5,  name: 'Aisha B.',     initials: 'AB', winRate: 55, totalEarned: 1980, bestFinish: 2, currentStreak: 1, tournaments: 29, color: '#ff6b35' },
  { rank: 6,  name: 'Jordan M.',    initials: 'JM', winRate: 49, totalEarned: 1740, bestFinish: 3, currentStreak: 0, tournaments: 44, color: '#00d4aa' },
  { rank: 7,  name: 'Ryan C.',      initials: 'RC', winRate: 53, totalEarned: 1520, bestFinish: 2, currentStreak: 2, tournaments: 33, color: '#ff69b4' },
  { rank: 8,  name: 'Tyler W.',     initials: 'TW', winRate: 47, totalEarned: 1310, bestFinish: 4, currentStreak: 0, tournaments: 28, color: '#00bfff' },
  { rank: 9,  name: 'Nina R.',      initials: 'NR', winRate: 44, totalEarned: 1120, bestFinish: 3, currentStreak: 1, tournaments: 22, color: '#ff6b35' },
  { rank: 10, name: 'Chris L.',     initials: 'CL', winRate: 41, totalEarned: 940,  bestFinish: 5, currentStreak: 0, tournaments: 19, color: '#7f93b5' },
  { rank: 11, name: 'Mia L.',       initials: 'ML', winRate: 60, totalEarned: 870,  bestFinish: 3, currentStreak: 3, tournaments: 15, color: '#ffa500' },
  { rank: 12, name: 'Omar J.',      initials: 'OJ', winRate: 38, totalEarned: 780,  bestFinish: 6, currentStreak: 0, tournaments: 26, color: '#4a9eff' },
  { rank: 13, name: 'Leila F.',     initials: 'LF', winRate: 35, totalEarned: 640,  bestFinish: 4, currentStreak: 0, tournaments: 21, color: '#9b59b6' },
  { rank: 14, name: 'Alex M.',      initials: 'AM', winRate: 32, totalEarned: 520,  bestFinish: 7, currentStreak: 0, tournaments: 18, color: '#3498db' },
  { rank: 15, name: 'Zoe H.',       initials: 'ZH', winRate: 40, totalEarned: 480,  bestFinish: 5, currentStreak: 1, tournaments: 14, color: '#e91e63' },
  { rank: 16, name: 'Kai N.',       initials: 'KN', winRate: 29, totalEarned: 360,  bestFinish: 8, currentStreak: 0, tournaments: 16, color: '#00bcd4' },
  { rank: 17, name: 'Ben A.',       initials: 'BA', winRate: 45, totalEarned: 280,  bestFinish: 6, currentStreak: 2, tournaments: 9,  color: '#8bc34a' },
  { rank: 18, name: 'Fatima K.',    initials: 'FK', winRate: 33, totalEarned: 220,  bestFinish: 9, currentStreak: 0, tournaments: 11, color: '#ff9800' },
  { rank: 19, name: 'Lucas P.',     initials: 'LP', winRate: 27, totalEarned: 160,  bestFinish: 10, currentStreak: 0, tournaments: 8, color: '#607d8b' },
  { rank: 20, name: 'Sofia M.',     initials: 'SM', winRate: 31, totalEarned: 120,  bestFinish: 11, currentStreak: 0, tournaments: 7, color: '#795548' },
]

const MY_CONTESTS: MyContest[] = [
  { id: 'daily-blitz', title: 'Daily Blitz',    type: 'gpp',  pnlPct: 14.2,  pnlDollar: 1420, rank: 3,   totalEntries: 390, color: '#00ff88', entryFee: 1 },
  { id: 'double-up-1', title: 'Double Up $1',   type: 'cash', pnlPct: -2.1,  pnlDollar: -210, rank: 112, totalEntries: 178, color: '#1e90ff', entryFee: 1 },
]

const CHAT_POOL: [string, string][] = [
  ['🔥 marcus is cooking rn', 'ScalpKing'],
  ['bro sarah k always top 5', 'xtrader99'],
  ['this is literally better than sports betting', 'ViewerK'],
  ['i been watching for 2 hours 💀', 'NewTrader22'],
  ['$1 entry and these guys are printing??', 'Skeptic'],
  ['JORDAN M CLIMBING 🚀', 'TradingBull'],
  ['yo the leaderboard is MOVING', 'DataNerd'],
  ['who is devon p, he always wins', 'CuriousV'],
  ['im entering tomorrow no cap', 'Regret99'],
  ['top 20% getting paid today 💰', 'PrizeHunter'],
  ['this is the future of trading fr', 'VisionaryT'],
  ['nina r with the comeback arc 🎯', 'DramaWatch'],
  ['mia L sneaky top 5 👀', 'StealthMode'],
  ['the volatility rn 😤', 'VolTrader'],
  ['i need to stop spectating and enter', 'LurkMode'],
  ['live trading tournaments >>> everything', 'ArenaFan'],
  ['aisha b that NVDA entry was clean', 'ChartWatcher'],
  ['someone should make a documentary about this', 'FilmNerd'],
  ['how do I enter from mobile??', 'MobileUser'],
  ['just hit 1k in crypto night lets GOOO', 'CryptoKid'],
  ['anyone else watching 3 streams at once lol', 'MultiStream'],
  ['marcus gonna win this one easy', 'Believer'],
  ['sarah k EUR/USD strat is different', 'ForexNerd'],
  ['the chat during market open is insane', 'OpenBell'],
]

const TICKER_ITEMS = [
  '🏆 MARCUS T. +18.4% — DAILY BLITZ LEADER',
  '💰 $47,320 PAID OUT THIS MONTH',
  '🔥 441 TRADERS COMPETING IN MEGA GPP RIGHT NOW',
  '⚡ NEXT TOURNAMENT STARTS AT 9:30AM ET',
  '🥇 YESTERDAY: PRIYA S. WON $752 IN CRYPTO NIGHT',
  '📈 SARAH K. CLIMBS TO #2 — LEADERBOARD SHIFTING',
  '🎯 TOP 20% OF TRADERS GET PAID TODAY',
  '💎 AISHA B. HIT +22.3% IN NVDA — BEAST MODE',
  '🚀 MEGA GPP $10K GUARANTEED — 59 SPOTS LEFT',
  '🌊 CRYPTO NIGHT FILLS FAST — ENTER NOW',
  '👑 DEVON P. 3RD TOURNAMENT WIN THIS WEEK',
  '🏅 $2,400 BIGGEST SINGLE WIN ALL-TIME — PRIYA S.',
]

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function buildSvgPath(seed: number, offset: number, width = 400, height = 120): string {
  const points: string[] = []
  const steps = 40
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width
    const t = i / steps
    const sine1 = Math.sin(t * 8 + seed * 1.3 + offset * 0.05) * 18
    const sine2 = Math.sin(t * 3.2 + seed * 2.7 + offset * 0.03) * 10
    const sine3 = Math.sin(t * 13 + seed * 0.9 + offset * 0.08) * 6
    const trend = t * 30 * (seed % 2 === 0 ? 1 : -0.5)
    const y = height * 0.65 - sine1 - sine2 - sine3 - trend
    const clampedY = Math.max(8, Math.min(height - 8, y))
    points.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${clampedY.toFixed(1)}`)
  }
  return points.join(' ')
}

function Countdown({ hours }: { hours: number }) {
  const endRef = useRef(Date.now() + hours * 3_600_000)
  const [ms, setMs] = useState(endRef.current - Date.now())
  useEffect(() => {
    const t = setInterval(() => setMs(endRef.current - Date.now()), 1000)
    return () => clearInterval(t)
  }, [])
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  const s = Math.floor((ms % 60_000) / 1_000)
  return <>{String(h).padStart(2, '0')}:{String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}</>
}

// ─── SUB-COMPONENTS ───────────────────────────────────────────────────────────

function Ticker() {
  return (
    <div style={{ background: '#c0392b', height: 32, overflow: 'hidden', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
      <div style={{ background: '#962d22', padding: '0 14px', height: '100%', display: 'flex', alignItems: 'center', flexShrink: 0, gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
        <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.2em' }}>BREAKING</span>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ display: 'inline-flex', animation: 'yn-ticker 55s linear infinite', whiteSpace: 'nowrap' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ padding: '0 48px', fontSize: 11, fontWeight: 700, color: '#fff', letterSpacing: '0.04em' }}>
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ContestTypeBadge({ type }: { type: Contest['type'] }) {
  const cfg = {
    cash:      { label: 'CASH 50/50',  bg: 'rgba(0,255,136,0.12)',  color: '#00ff88',  border: 'rgba(0,255,136,0.3)' },
    gpp:       { label: 'TOURNAMENT',  bg: 'rgba(30,144,255,0.12)', color: '#1e90ff',  border: 'rgba(30,144,255,0.3)' },
    h2h:       { label: 'HEAD-2-HEAD', bg: 'rgba(191,95,255,0.12)', color: '#bf5fff',  border: 'rgba(191,95,255,0.3)' },
    satellite: { label: 'SATELLITE',   bg: 'rgba(255,215,0,0.12)',  color: '#ffd700',  border: 'rgba(255,215,0,0.3)' },
  }[type]
  return (
    <span style={{ fontSize: 9, fontWeight: 800, padding: '2px 7px', borderRadius: 4, letterSpacing: '0.1em', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      {cfg.label}
    </span>
  )
}

function ProgressBar({ filled, max, color }: { filled: number; max: number; color: string }) {
  const pct = Math.min(100, (filled / max) * 100)
  const urgency = pct > 90 ? '#ff4757' : pct > 70 ? '#ff6b35' : color
  return (
    <div style={{ height: 4, background: '#0d1826', borderRadius: 2, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: urgency, borderRadius: 2, transition: 'width 0.5s ease' }} />
    </div>
  )
}

function ContestCard({ contest, onEnter }: { contest: Contest; onEnter: (c: Contest) => void }) {
  const spotsLeft = contest.maxEntries - contest.filled
  const typeColor = { cash: '#00ff88', gpp: '#1e90ff', h2h: '#bf5fff', satellite: '#ffd700' }[contest.type]
  const prizeLabel = contest.type === 'satellite' ? 'FREE ENTRY' : `$${contest.prizePool.toLocaleString()}`

  return (
    <div style={{
      background: contest.featured ? 'linear-gradient(135deg, #0a1520, #091a14)' : '#0a0f1a',
      border: `1px solid ${contest.featured ? '#00ff8840' : '#0d1826'}`,
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      position: 'relative',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {contest.featured && (
        <div style={{ position: 'absolute', top: -1, right: 16, background: 'linear-gradient(90deg,#ffd700,#ff6b35)', borderRadius: '0 0 8px 8px', padding: '3px 10px', fontSize: 9, fontWeight: 900, color: '#04080f', letterSpacing: '0.1em' }}>
          GUARANTEED
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: 5 }}>
            <ContestTypeBadge type={contest.type} />
          </div>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#fff', marginBottom: 3, lineHeight: 1.3 }}>{contest.title}</div>
          <div style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5 }}>{contest.description}</div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: contest.type === 'satellite' ? 14 : 22, fontWeight: 900, color: typeColor, fontFamily: 'monospace', lineHeight: 1.1 }}>{prizeLabel}</div>
          {contest.type !== 'satellite' && <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 2 }}>prize pool</div>}
        </div>
      </div>

      <ProgressBar filled={contest.filled} max={contest.maxEntries} color={typeColor} />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 10, color: '#4a5e7a' }}>
          {contest.filled.toLocaleString()} / {contest.maxEntries.toLocaleString()} entries
          {contest.lateEntry && (
            <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: '#ff6b35', background: 'rgba(255,107,53,0.12)', padding: '1px 6px', borderRadius: 3 }}>LATE ENTRY</span>
          )}
          {!contest.lateEntry && spotsLeft <= 20 && (
            <span style={{ marginLeft: 8, fontSize: 9, fontWeight: 800, color: '#ff4757', background: 'rgba(255,71,87,0.12)', padding: '1px 6px', borderRadius: 3 }}>{spotsLeft} left</span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#4a5e7a' }}>
            {contest.entryFee === 0 ? 'FREE' : `$${contest.entryFee}`}
          </span>
          <button
            onClick={() => onEnter(contest)}
            style={{
              padding: '7px 16px',
              background: `linear-gradient(135deg, ${typeColor}22, ${typeColor}18)`,
              border: `1px solid ${typeColor}55`,
              borderRadius: 7,
              color: typeColor,
              fontSize: 12,
              fontWeight: 800,
              cursor: 'pointer',
              transition: 'all 0.15s',
              whiteSpace: 'nowrap',
            }}
          >
            Enter
          </button>
        </div>
      </div>
    </div>
  )
}

function MiniChart({ trader, offset }: { trader: StreamTrader; offset: number }) {
  const path = buildSvgPath(trader.pathSeed, offset)
  const isPositive = trader.pnlPct >= 0
  const lineColor = isPositive ? '#00ff88' : '#ff4757'
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 120" preserveAspectRatio="none" style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`grad-${trader.id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {[30, 60, 90].map(y => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="#0d1826" strokeWidth="0.5" />
      ))}
      {/* Area fill */}
      <path d={`${path} L400,120 L0,120 Z`} fill={`url(#grad-${trader.id})`} />
      {/* Main line */}
      <path d={path} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function StreamCard({ trader, offset, isSelected, onSelect }: { trader: StreamTrader; offset: number; isSelected: boolean; onSelect: () => void }) {
  const [hovered, setHovered] = useState(false)
  const isPositive = trader.pnlPct >= 0

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0a0f1a',
        border: `1px solid ${isSelected ? trader.color + '60' : hovered ? '#1a2d4a' : '#0d1826'}`,
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'all 0.2s',
        transform: hovered ? 'scale(1.02)' : 'scale(1)',
        boxShadow: hovered ? `0 8px 32px ${trader.color}25` : isSelected ? `0 4px 20px ${trader.color}30` : 'none',
        position: 'relative',
      }}
    >
      {/* Chart area — real TradingView */}
      <div style={{ height: 160, position: 'relative', background: '#060c14' }}>
        <TradingViewChart symbol={trader.asset} interval={trader.timeframe === '5m' ? '5' : trader.timeframe === '1H' ? '60' : trader.timeframe === '15m' ? '15' : trader.timeframe === '1m' ? '1' : trader.timeframe === '4H' ? '240' : 'D'} hideSideToolbar={true} studies={[]} />

        {/* Trader overlay top-left */}
        <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `${trader.color}25`, border: `2px solid ${trader.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: trader.color }}>
            {trader.initials}
          </div>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#fff', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>{trader.name}</span>
        </div>

        {/* LIVE badge top-right */}
        <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(192,57,43,0.9)', borderRadius: 4, padding: '3px 7px' }}>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
          <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.1em' }}>LIVE</span>
        </div>

        {/* P&L overlay */}
        <div style={{ position: 'absolute', top: 36, right: 8, textAlign: 'right' }}>
          <div style={{ fontSize: 13, fontWeight: 900, color: isPositive ? '#00ff88' : '#ff4757', fontFamily: 'monospace', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}>
            {isPositive ? '+' : ''}{trader.pnlPct.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: isPositive ? '#00cc66' : '#cc2233', fontFamily: 'monospace' }}>
            {isPositive ? '+' : ''}${Math.abs(trader.pnlDollar).toLocaleString()}
          </div>
        </div>

        {/* Bottom overlays */}
        <div style={{ position: 'absolute', bottom: 8, left: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
          <Eye size={10} color="#7f93b5" />
          <span style={{ fontSize: 10, color: '#7f93b5', fontFamily: 'monospace' }}>{trader.viewers.toLocaleString()}</span>
        </div>
        <div style={{ position: 'absolute', bottom: 8, right: 8 }}>
          <span style={{ fontSize: 10, color: '#4a5e7a', fontFamily: 'monospace' }}>{trader.asset} • {trader.timeframe}</span>
        </div>

        {/* Watch button on hover */}
        {hovered && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,8,15,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'yn-fadein 0.15s ease' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: trader.color, borderRadius: 8, padding: '8px 20px' }}>
              <Play size={14} color="#04080f" fill="#04080f" />
              <span style={{ fontSize: 13, fontWeight: 900, color: '#04080f' }}>WATCH</span>
            </div>
          </div>
        )}
      </div>

      {/* Card footer */}
      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#cdd6f4' }}>{trader.name}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ fontSize: 9, color: '#4a5e7a', background: '#0d1826', padding: '2px 7px', borderRadius: 4, fontFamily: 'monospace' }}>
            {trader.asset}
          </div>
          <div style={{ fontSize: 13, fontWeight: 900, color: isPositive ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>
            {isPositive ? '+' : ''}{trader.pnlPct.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────

export default function ArenaPage() {
  const [activeTab, setActiveTab] = useState<'lobby' | 'streams' | 'leaderboard'>('lobby')
  const [contestFilter, setContestFilter] = useState<'all' | 'cash' | 'gpp' | 'h2h' | 'satellite'>('all')
  const [sortBy, setSortBy] = useState<'prize' | 'fee' | 'filling'>('filling')
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'today' | 'week' | 'alltime'>('alltime')
  const [selectedStream, setSelectedStream] = useState<StreamTrader | null>(null)
  const [chatMsgs, setChatMsgs] = useState<ChatMsg[]>([])
  const [chatInput, setChatInput] = useState('')
  const [viewers, setViewers] = useState(3847)
  const [totalPaid, setTotalPaid] = useState(47320)
  const [offset, setOffset] = useState(0)
  const [entering, setEntering] = useState<string | null>(null)
  const [alertMsg, setAlertMsg] = useState('')
  const [contestPrizes, setContestPrizes] = useState<Record<string, number>>(
    Object.fromEntries(CONTESTS.map(c => [c.id, c.prizePool]))
  )
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const chatColors = ['#00ff88', '#1e90ff', '#bf5fff', '#ffd700', '#ff6b35', '#ff69b4', '#00d4aa']

  // Smooth animation tick
  useEffect(() => {
    const t = setInterval(() => {
      setOffset(n => n + 1)
      setViewers(v => Math.max(3000, v + Math.round((Math.random() - 0.48) * 12)))
      // Occasionally tick prize pools up
      if (Math.random() < 0.3) {
        setContestPrizes(prev => {
          const keys = Object.keys(prev)
          const key = keys[Math.floor(Math.random() * keys.length)]
          const contest = CONTESTS.find(c => c.id === key)
          if (!contest || contest.type === 'satellite') return prev
          return { ...prev, [key]: prev[key] + 1 }
        })
      }
    }, 3000)
    return () => clearInterval(t)
  }, [])

  // Chat messages
  useEffect(() => {
    const add = () => {
      const [text, user] = CHAT_POOL[Math.floor(Math.random() * CHAT_POOL.length)]
      setChatMsgs(m => [...m.slice(-60), { user, text, color: chatColors[Math.floor(Math.random() * chatColors.length)], ts: Date.now() }])
    }
    add()
    const t = setInterval(add, 2500 + Math.random() * 1500)
    return () => clearInterval(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Total paid ticker
  useEffect(() => {
    const t = setInterval(() => {
      if (Math.random() < 0.15) setTotalPaid(p => p + Math.floor(Math.random() * 50 + 10))
    }, 5000)
    return () => clearInterval(t)
  }, [])

  // Alerts
  useEffect(() => {
    const ALERTS = [
      '🔥 Marcus T. just crossed +18% — defending the lead',
      '⚡ Mega GPP prize pool crossed $10,000 — GUARANTEED',
      '🚀 Aisha B. went long NVDA at open — currently +22%',
      '💰 3 new entries in the last 60 seconds',
      '🎯 Sarah K. just hit a new high — sitting at +12.1%',
    ]
    const t = setInterval(() => {
      setAlertMsg(ALERTS[Math.floor(Math.random() * ALERTS.length)])
      setTimeout(() => setAlertMsg(''), 4500)
    }, 20000 + Math.random() * 12000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight
    }
  }, [chatMsgs.length])

  const enterContest = useCallback(async (contest: Contest) => {
    setEntering(contest.id)
    try {
      const res = await fetch('/api/stripe/tournament/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tournamentId: contest.id,
          tournamentTitle: contest.title,
          entryFeeCents: contest.entryFee * 100,
          tier: contest.tier,
        }),
      })
      const data = await res.json()
      if (data.url) {
        // Store entry locally so tournament room grants access after redirect
        localStorage.setItem(`yn_tournament_${contest.id}`, 'true')
        window.location.href = data.url
      } else if (data.demo) {
        // Demo mode: go straight to tournament room
        localStorage.setItem(`yn_tournament_${contest.id}`, 'true')
        window.location.href = `/arena/tournament/${contest.id}?entered=${contest.id}`
      } else {
        window.alert('Configure Stripe in environment variables to accept payments.')
      }
    } catch {
      window.alert('Error connecting to payment service. Try again.')
    } finally {
      setEntering(null)
    }
  }, [])

  const filteredContests = CONTESTS
    .filter(c => contestFilter === 'all' || c.type === contestFilter)
    .sort((a, b) => {
      if (sortBy === 'prize') return b.prizePool - a.prizePool
      if (sortBy === 'fee') return a.entryFee - b.entryFee
      // 'filling' = closest to full
      return (b.filled / b.maxEntries) - (a.filled / a.maxEntries)
    })

  const tabStyle = (tab: typeof activeTab) => ({
    padding: '10px 20px',
    background: activeTab === tab ? 'rgba(0,255,136,0.1)' : 'transparent',
    border: 'none',
    borderBottom: `2px solid ${activeTab === tab ? '#00ff88' : 'transparent'}`,
    color: activeTab === tab ? '#00ff88' : '#4a5e7a',
    fontSize: 13,
    fontWeight: 800,
    cursor: 'pointer',
    letterSpacing: '0.05em',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  })

  const filterBtnStyle = (active: boolean, color = '#00ff88') => ({
    padding: '6px 14px',
    background: active ? `${color}15` : '#0a0f1a',
    border: `1px solid ${active ? color + '50' : '#0d1826'}`,
    borderRadius: 7,
    color: active ? color : '#4a5e7a',
    fontSize: 11,
    fontWeight: 700,
    cursor: 'pointer',
    transition: 'all 0.15s',
    whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ background: '#04080f', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes yn-ticker { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
        @keyframes yn-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.3;transform:scale(0.7)} }
        @keyframes yn-glow { 0%,100%{box-shadow:0 0 18px rgba(0,255,136,0.25)} 50%{box-shadow:0 0 40px rgba(0,255,136,0.6)} }
        @keyframes yn-popin { from{opacity:0;transform:translateX(-50%) translateY(-16px) scale(0.95)} to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)} }
        @keyframes yn-fadein { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        @keyframes yn-slidein { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
        * { box-sizing:border-box; }
        ::-webkit-scrollbar { width:3px; height:3px; }
        ::-webkit-scrollbar-thumb { background:#1a2d4a; border-radius:3px; }
        ::-webkit-scrollbar-track { background:transparent; }
        .yn-contest-grid { display:grid; grid-template-columns:1fr; gap:10px; }
        .yn-stream-grid { display:grid; grid-template-columns:1fr; gap:12px; }
        .yn-featured-stream { display:flex; flex-direction:column; gap:12px; }
        .yn-featured-chart { height:280px; }
        .yn-stat-row { display:grid; grid-template-columns:repeat(2,1fr); gap:10px; }
        .yn-podium { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .yn-lb-col-hide { display:none; }
        @media (min-width:640px) {
          .yn-contest-grid { grid-template-columns:repeat(2,1fr); }
          .yn-stream-grid { grid-template-columns:repeat(2,1fr); }
          .yn-stat-row { grid-template-columns:repeat(4,1fr); }
        }
        @media (min-width:1024px) {
          .yn-contest-grid { grid-template-columns:repeat(3,1fr); }
          .yn-stream-grid { grid-template-columns:repeat(3,1fr); }
          .yn-featured-stream { flex-direction:row; }
          .yn-featured-chart { height:400px; }
          .yn-lb-col-hide { display:table-cell; }
        }
      `}</style>

      {/* Alert popup */}
      {alertMsg && (
        <div style={{ position: 'fixed', top: 72, left: '50%', zIndex: 9999, background: 'linear-gradient(135deg,#00ff88,#00cc66)', color: '#04080f', fontWeight: 800, fontSize: 13, padding: '11px 22px', borderRadius: 10, boxShadow: '0 4px 40px rgba(0,255,136,0.5)', animation: 'yn-popin 0.3s ease', whiteSpace: 'nowrap', maxWidth: '90vw', textAlign: 'center' }}>
          {alertMsg}
        </div>
      )}

      {/* SECTION 1: Ticker */}
      <Ticker />

      {/* SECTION 2: Nav */}
      <nav style={{ background: 'rgba(4,8,15,0.97)', borderBottom: '1px solid #0d1826', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 16px', display: 'flex', alignItems: 'center', height: 54, gap: 10 }}>
          {/* Logo */}
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#ffd700,#ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={15} color="#04080f" fill="#04080f" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', letterSpacing: -0.4, lineHeight: 1.1 }}>YN Arena</div>
              <div style={{ fontSize: 8, fontWeight: 700, color: '#4a5e7a', letterSpacing: '0.12em', lineHeight: 1 }}>LIVE TRADING TOURNAMENTS</div>
            </div>
          </Link>

          {/* LIVE badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#c0392b', borderRadius: 5, padding: '3px 9px', flexShrink: 0 }}>
            <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
            <span style={{ fontSize: 9, fontWeight: 900, color: '#fff', letterSpacing: '0.18em' }}>LIVE</span>
          </div>

          {/* Viewer count */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4a5e7a' }}>
            <Users size={10} color="#4a5e7a" />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#cdd6f4' }}>{viewers.toLocaleString()}</span>
            <span style={{ display: 'none' }}>watching</span>
          </div>

          {/* Tab buttons */}
          <div style={{ display: 'flex', alignItems: 'stretch', borderLeft: '1px solid #0d1826', marginLeft: 8, paddingLeft: 8, gap: 0, height: '100%' }}>
            {([['lobby', 'LOBBY'], ['streams', 'LIVE STREAMS'], ['leaderboard', 'LEADERBOARD']] as const).map(([tab, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={tabStyle(tab)}>
                {label}
              </button>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {/* Nav links */}
          <Link href="/" style={{ fontSize: 11, color: '#2a4060', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6, flexShrink: 0 }}>← Home</Link>
          <Link href="/courses" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6, flexShrink: 0, display: window.innerWidth > 768 ? 'block' : 'none' }}>Courses</Link>
          <Link href="/app" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 10px', border: '1px solid #0d1826', borderRadius: 6, flexShrink: 0 }}>Terminal</Link>

          {/* Enter button */}
          <button
            onClick={() => enterContest(CONTESTS[0])}
            disabled={entering === CONTESTS[0].id}
            style={{ fontSize: 12, fontWeight: 900, background: 'linear-gradient(135deg,#ffd700,#ff6b35)', color: '#04080f', border: 'none', borderRadius: 8, padding: '8px 16px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
          >
            ⚡ Enter Now
          </button>
        </div>
      </nav>

      {/* TAB CONTENT */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px', animation: 'yn-slidein 0.25s ease' }}>

        {/* ══════════════════════════════════════════════════════════
            SECTION 3: LOBBY TAB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'lobby' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Hero banner — Mega GPP */}
            <div style={{ background: 'linear-gradient(135deg, #04111a 0%, #061a10 40%, #04111a 100%)', border: '1px solid #00ff8835', borderRadius: 16, padding: '28px 28px', position: 'relative', overflow: 'hidden' }}>
              {/* Background glow orbs */}
              <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, background: 'radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)', pointerEvents: 'none' }} />
              <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                <div style={{ flex: 1, minWidth: 260 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <div style={{ background: 'linear-gradient(90deg,#ffd700,#ff6b35)', borderRadius: '0 0 8px 8px', padding: '3px 12px', fontSize: 10, fontWeight: 900, color: '#04080f', letterSpacing: '0.12em' }}>
                      GUARANTEED
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)', borderRadius: 20, padding: '3px 10px' }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#00ff88', display: 'inline-block', animation: 'yn-pulse 1.2s ease-in-out infinite' }} />
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#00ff88', letterSpacing: '0.1em' }}>FILLING FAST</span>
                    </div>
                  </div>

                  <div style={{ fontSize: 28, fontWeight: 900, color: '#fff', lineHeight: 1.15, marginBottom: 8 }}>
                    Mega GPP — <span style={{ color: '#ffd700' }}>$10,000</span> Guaranteed
                  </div>
                  <div style={{ fontSize: 14, color: '#4a5e7a', marginBottom: 8, lineHeight: 1.6 }}>
                    The biggest daily tournament on YN Arena. Trade any market, top 10 finishers get their entry multiplied by their P&L%. First place could walk away with <strong style={{ color: '#ffd700' }}>$2,400+</strong>.
                  </div>
                  <div style={{ fontSize: 12, background: '#ffd70010', border: '1px solid #ffd70030', borderRadius: 8, padding: '8px 12px', color: '#ffd700', marginBottom: 12, lineHeight: 1.6 }}>
                    💰 <strong>New prize model:</strong> Top 10 finishers get $25 × (1 + your P&L%). Make +100% → get $50 back. Make +200% → get $75 back. Not top 10? House keeps your $25.
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, marginBottom: 20 }}>
                    {[
                      { label: 'Prize Pool', value: `$${(contestPrizes['mega-gpp'] || 10000).toLocaleString()}`, color: '#ffd700', icon: <DollarSign size={13} /> },
                      { label: 'Entry Fee', value: '$25', color: '#00ff88', icon: <Zap size={13} /> },
                      { label: 'Entries', value: `441 / 500`, color: '#1e90ff', icon: <Users size={13} /> },
                      { label: 'Closes In', value: <Countdown hours={3} />, color: '#ff6b35', icon: <Clock size={13} /> },
                    ].map(({ label, value, color, icon }) => (
                      <div key={label}>
                        <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color }}>{icon}</span>
                          {label}
                        </div>
                        <div style={{ fontSize: 20, fontWeight: 900, color, fontFamily: 'monospace' }}>{value}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <ProgressBar filled={441} max={500} color="#00ff88" />
                    <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 5 }}>59 spots remaining — <span style={{ color: '#ff4757', fontWeight: 700 }}>filling fast</span></div>
                  </div>

                  <button
                    onClick={() => enterContest(CONTESTS[0])}
                    disabled={entering === 'mega-gpp'}
                    style={{ padding: '14px 36px', background: entering === 'mega-gpp' ? '#0a1620' : 'linear-gradient(135deg,#00ff88,#00cc66)', color: entering === 'mega-gpp' ? '#4a5e7a' : '#04080f', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 900, cursor: 'pointer', boxShadow: '0 0 30px rgba(0,255,136,0.35)', animation: 'yn-glow 2.5s ease-in-out infinite', letterSpacing: '0.02em' }}
                  >
                    {entering === 'mega-gpp' ? 'Redirecting…' : '⚡ Enter Mega GPP for $25'}
                  </button>
                </div>

                {/* Prize breakdown */}
                <div style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid #0d1826', borderRadius: 12, padding: '16px 20px', minWidth: 200 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: '#ffd700', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prize Breakdown</div>
                  {[
                    { place: '1st Place', prize: '$2,400', color: '#ffd700', medal: '🥇' },
                    { place: '2nd Place', prize: '$1,500', color: '#c0c0c0', medal: '🥈' },
                    { place: '3rd Place', prize: '$1,000', color: '#cd7f32', medal: '🥉' },
                    { place: '4th–10th', prize: '$300 ea', color: '#00ff88', medal: '' },
                    { place: '11th–50th', prize: '$75 ea', color: '#1e90ff', medal: '' },
                    { place: '51st–75th', prize: '$30 ea', color: '#4a5e7a', medal: '' },
                  ].map(({ place, prize, color, medal }) => (
                    <div key={place} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: '#7f93b5' }}>{medal} {place}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color, fontFamily: 'monospace' }}>{prize}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Filter row */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginRight: 4 }}>
                <Filter size={12} color="#4a5e7a" />
                <span style={{ fontSize: 11, color: '#4a5e7a', fontWeight: 700 }}>FILTER:</span>
              </div>
              {([
                ['all', 'ALL', '#00ff88'],
                ['cash', 'CASH (50/50)', '#00ff88'],
                ['gpp', 'TOURNAMENT (GPP)', '#1e90ff'],
                ['h2h', 'HEAD-TO-HEAD', '#bf5fff'],
                ['satellite', 'SATELLITES', '#ffd700'],
              ] as const).map(([val, label, color]) => (
                <button key={val} onClick={() => setContestFilter(val)} style={filterBtnStyle(contestFilter === val, color)}>
                  {label}
                </button>
              ))}
              <div style={{ flex: 1 }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: '#4a5e7a' }}>Sort:</span>
                {([
                  ['filling', 'Filling Fast'],
                  ['prize', 'Prize Pool'],
                  ['fee', 'Entry Fee'],
                ] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setSortBy(val)} style={filterBtnStyle(sortBy === val)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Contest grid */}
            <div className="yn-contest-grid">
              {filteredContests.map(contest => (
                <ContestCard key={contest.id} contest={contest} onEnter={enterContest} />
              ))}
            </div>

            {/* My Contests */}
            <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 10 }}>
                <BarChart2 size={14} color="#00ff88" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>My Active Contests</span>
                <span style={{ fontSize: 11, color: '#4a5e7a' }}>— Demo entries (connect account to see real data)</span>
              </div>
              <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {MY_CONTESTS.map(mc => {
                  const isPositive = mc.pnlPct >= 0
                  const inMoney = mc.rank <= Math.ceil(mc.totalEntries * 0.2)
                  return (
                    <div key={mc.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#0d1520', border: '1px solid #0d1826', borderRadius: 10 }}>
                      <ContestTypeBadge type={mc.type as Contest['type']} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: 2 }}>{mc.title}</div>
                        <div style={{ fontSize: 10, color: '#4a5e7a' }}>
                          Rank #{mc.rank} of {mc.totalEntries} ·
                          {inMoney ? <span style={{ color: '#00ff88', fontWeight: 700 }}> IN THE MONEY</span> : <span style={{ color: '#ff4757' }}> OUT</span>}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 18, fontWeight: 900, color: isPositive ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>
                          {isPositive ? '+' : ''}{mc.pnlPct.toFixed(1)}%
                        </div>
                        <div style={{ fontSize: 11, color: isPositive ? '#00cc66' : '#cc2233', fontFamily: 'monospace' }}>
                          {isPositive ? '+' : ''}${mc.pnlDollar.toLocaleString()}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 4: LIVE STREAMS TAB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'streams' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* Go Live banner */}
            <div style={{ background: 'linear-gradient(135deg, #1a0812, #0d1020)', border: '1px solid #ff475730', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#ff475720', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>📡</span>
              </div>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 3 }}>Want to stream your trades live?</div>
                <div style={{ fontSize: 11, color: '#4a5e7a', lineHeight: 1.5 }}>Enter a tournament, then click the <strong style={{ color: '#ff4757' }}>Go Live</strong> button in the tournament room. Your screen gets shared to the Arena in real-time — your P&L, your chart, your commentary.</div>
              </div>
              <a href="/arena/tournament/daily-blitz?entered=daily-blitz" onClick={() => { localStorage.setItem('yn_tournament_daily-blitz', 'true') }}
                style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #ff4757, #c0392b)', color: '#fff', fontWeight: 800, fontSize: 12, borderRadius: 10, textDecoration: 'none', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                Enter & Stream →
              </a>
            </div>

            {/* Featured stream */}
            {selectedStream ? (
              <div style={{ animation: 'yn-fadein 0.2s ease' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff4757', animation: 'yn-pulse 1s ease-in-out infinite' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Watching: {selectedStream.name}</span>
                  <span style={{ fontSize: 11, color: '#4a5e7a' }}>{selectedStream.asset} • {selectedStream.timeframe}</span>
                  <button onClick={() => setSelectedStream(null)} style={{ marginLeft: 'auto', background: 'none', border: '1px solid #0d1826', borderRadius: 6, color: '#4a5e7a', padding: '5px 12px', fontSize: 11, cursor: 'pointer' }}>
                    Close
                  </button>
                </div>

                <div className="yn-featured-stream">
                  {/* Chart area */}
                  <div style={{ flex: '0 0 65%', background: '#060c14', border: `1px solid ${selectedStream.color}30`, borderRadius: 12, overflow: 'hidden', position: 'relative', minHeight: 340 }} className="yn-featured-chart">
                    <div style={{ width: '100%', height: '100%', minHeight: 340 }}>
                      <TradingViewChart symbol={selectedStream.asset} interval={selectedStream.timeframe === '5m' ? '5' : selectedStream.timeframe === '1H' ? '60' : selectedStream.timeframe === '15m' ? '15' : selectedStream.timeframe === '1m' ? '1' : selectedStream.timeframe === '4H' ? '240' : 'D'} hideSideToolbar={true} />
                    </div>

                    {/* Overlays */}
                    <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${selectedStream.color}25`, border: `2px solid ${selectedStream.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: selectedStream.color }}>
                        {selectedStream.initials}
                      </div>
                      <div>
                        <div style={{ fontSize: 15, fontWeight: 900, color: '#fff' }}>{selectedStream.name}</div>
                        <div style={{ fontSize: 11, color: '#4a5e7a' }}>{selectedStream.asset} • {selectedStream.timeframe}</div>
                      </div>
                    </div>

                    <div style={{ position: 'absolute', top: 16, right: 16, textAlign: 'right' }}>
                      <div style={{ fontSize: 24, fontWeight: 900, color: selectedStream.pnlPct >= 0 ? '#00ff88' : '#ff4757', fontFamily: 'monospace' }}>
                        {selectedStream.pnlPct >= 0 ? '+' : ''}{selectedStream.pnlPct.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: 13, color: selectedStream.pnlPct >= 0 ? '#00cc66' : '#cc2233', fontFamily: 'monospace' }}>
                        {selectedStream.pnlPct >= 0 ? '+' : ''}${Math.abs(selectedStream.pnlDollar).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ position: 'absolute', bottom: 16, left: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(192,57,43,0.85)', borderRadius: 5, padding: '3px 9px' }}>
                        <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#fff' }}>LIVE</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(4,8,15,0.7)', borderRadius: 5, padding: '3px 9px' }}>
                        <Eye size={10} color="#7f93b5" />
                        <span style={{ fontSize: 10, color: '#7f93b5', fontFamily: 'monospace' }}>{selectedStream.viewers.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right panel */}
                  <div style={{ flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 400 }}>
                    {/* Trader stats */}
                    <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, padding: '14px 16px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: selectedStream.color, marginBottom: 12 }}>{selectedStream.name} — Stats</div>
                      {[
                        { label: 'Current P&L', value: `${selectedStream.pnlPct >= 0 ? '+' : ''}${selectedStream.pnlPct.toFixed(1)}%`, color: selectedStream.pnlPct >= 0 ? '#00ff88' : '#ff4757' },
                        { label: 'Dollar P&L', value: `${selectedStream.pnlPct >= 0 ? '+' : ''}$${Math.abs(selectedStream.pnlDollar).toLocaleString()}`, color: selectedStream.pnlPct >= 0 ? '#00cc66' : '#cc2233' },
                        { label: 'Asset', value: selectedStream.asset, color: '#cdd6f4' },
                        { label: 'Timeframe', value: selectedStream.timeframe, color: '#cdd6f4' },
                        { label: 'Viewers', value: selectedStream.viewers.toLocaleString(), color: '#7f93b5' },
                      ].map(({ label, value, color }) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 11, color: '#4a5e7a' }}>{label}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color, fontFamily: 'monospace' }}>{value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Live chat */}
                    <div style={{ flex: 1, background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 12, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 240 }}>
                      <div style={{ padding: '10px 14px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 7 }}>
                        <MessageSquare size={12} color="#bf5fff" />
                        <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>Live Chat</span>
                        <span style={{ fontSize: 9, color: '#4a5e7a' }}>{viewers.toLocaleString()} watching</span>
                      </div>
                      <div ref={chatContainerRef} style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
                        {chatMsgs.slice(-30).map((m, i) => (
                          <div key={i} style={{ fontSize: 12, lineHeight: 1.7, marginBottom: 1, animation: i === chatMsgs.length - 1 ? 'yn-fadein 0.2s ease' : 'none' }}>
                            <span style={{ fontWeight: 800, color: m.color, marginRight: 5 }}>{m.user}</span>
                            <span style={{ color: '#cdd6f4' }}>{m.text}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{ padding: '8px 10px', borderTop: '1px solid #0d1826', display: 'flex', gap: 6 }}>
                        <input
                          value={chatInput}
                          onChange={e => setChatInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && chatInput.trim()) {
                              setChatMsgs(m => [...m.slice(-60), { user: 'You', text: chatInput, color: '#00ff88', ts: Date.now() }])
                              setChatInput('')
                            }
                          }}
                          placeholder="Say something…"
                          style={{ flex: 1, background: '#0d1826', border: '1px solid #1a2d4a', borderRadius: 7, padding: '7px 11px', color: '#cdd6f4', fontSize: 12, outline: 'none' }}
                        />
                        <button
                          onClick={() => {
                            if (chatInput.trim()) {
                              setChatMsgs(m => [...m.slice(-60), { user: 'You', text: chatInput, color: '#00ff88', ts: Date.now() }])
                              setChatInput('')
                            }
                          }}
                          style={{ background: '#bf5fff', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 800, color: '#fff' }}
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ background: 'rgba(30,144,255,0.06)', border: '1px solid rgba(30,144,255,0.2)', borderRadius: 10, padding: '12px 20px', fontSize: 12, color: '#4a5e7a', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Play size={13} color="#1e90ff" />
                Click any stream card below to watch in the featured player with live chat.
              </div>
            )}

            {/* Stream grid */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#ff4757', display: 'inline-block', animation: 'yn-pulse 1s ease-in-out infinite' }} />
                Live Now — {STREAMS.length} streams
                <span style={{ fontSize: 10, color: '#4a5e7a', fontWeight: 400 }}>All traders are in today&apos;s tournaments</span>
              </div>
              <div className="yn-stream-grid">
                {STREAMS.map(trader => (
                  <StreamCard
                    key={trader.id}
                    trader={trader}
                    offset={offset}
                    isSelected={selectedStream?.id === trader.id}
                    onSelect={() => setSelectedStream(prev => prev?.id === trader.id ? null : trader)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════
            SECTION 5: LEADERBOARD TAB
        ══════════════════════════════════════════════════════════ */}
        {activeTab === 'leaderboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, animation: 'yn-slidein 0.25s ease' }}>

            {/* Time toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Clock size={13} color="#4a5e7a" />
              <span style={{ fontSize: 12, color: '#4a5e7a', fontWeight: 700 }}>PERIOD:</span>
              {([
                ['today', 'TODAY'],
                ['week', 'THIS WEEK'],
                ['alltime', 'ALL TIME'],
              ] as const).map(([val, label]) => (
                <button key={val} onClick={() => setLeaderboardPeriod(val)} style={filterBtnStyle(leaderboardPeriod === val, '#ffd700')}>
                  {label}
                </button>
              ))}
            </div>

            {/* Stats row */}
            <div className="yn-stat-row">
              {[
                { label: 'Total Prize Money Paid', value: `$${totalPaid.toLocaleString()}`, color: '#ffd700', icon: <DollarSign size={16} />, bg: 'rgba(255,215,0,0.06)', border: 'rgba(255,215,0,0.2)' },
                { label: 'Active Traders', value: '3,847', color: '#00ff88', icon: <Users size={16} />, bg: 'rgba(0,255,136,0.06)', border: 'rgba(0,255,136,0.2)' },
                { label: 'Tournaments Run', value: '2,156', color: '#1e90ff', icon: <Trophy size={16} />, bg: 'rgba(30,144,255,0.06)', border: 'rgba(30,144,255,0.2)' },
                { label: 'Biggest Single Win', value: '$2,400', color: '#bf5fff', icon: <Crown size={16} />, bg: 'rgba(191,95,255,0.06)', border: 'rgba(191,95,255,0.2)' },
              ].map(({ label, value, color, icon, bg, border }) => (
                <div key={label} style={{ background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ color, flexShrink: 0 }}>{icon}</div>
                  <div>
                    <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace', lineHeight: 1.1 }}>{value}</div>
                    <div style={{ fontSize: 10, color: '#4a5e7a', marginTop: 3 }}>{label}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Podium — Top 3 */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#ffd700', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Crown size={14} color="#ffd700" />
                Top Traders — {leaderboardPeriod === 'today' ? 'Today' : leaderboardPeriod === 'week' ? 'This Week' : 'All Time'}
              </div>
              <div className="yn-podium">
                {LEADERBOARD_DATA.slice(0, 3).map((trader, i) => {
                  const podiumColors = ['#ffd700', '#c0c0c0', '#cd7f32']
                  const podiumLabels = ['1st Place', '2nd Place', '3rd Place']
                  const podiumSizes = [1.05, 1, 0.97]
                  return (
                    <div key={trader.rank} style={{
                      background: `linear-gradient(135deg, ${trader.color}08, #0a0f1a)`,
                      border: `1px solid ${podiumColors[i]}40`,
                      borderRadius: 14,
                      padding: '20px 16px',
                      textAlign: 'center',
                      transform: `scale(${podiumSizes[i]})`,
                      transformOrigin: 'bottom center',
                      position: 'relative',
                    }}>
                      {i === 0 && (
                        <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 20 }}>👑</div>
                      )}
                      <div style={{ fontSize: 28, marginBottom: 8 }}>{['🥇', '🥈', '🥉'][i]}</div>
                      <div style={{ width: 52, height: 52, borderRadius: 13, background: `${trader.color}20`, border: `2px solid ${trader.color}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px', fontSize: 16, fontWeight: 900, color: trader.color }}>
                        {trader.initials}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 900, color: '#fff', marginBottom: 4 }}>{trader.name}</div>
                      <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 12 }}>{podiumLabels[i]}</div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, background: 'rgba(0,0,0,0.3)', borderRadius: 8, padding: '10px 12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: '#4a5e7a' }}>Earned</span>
                          <span style={{ fontSize: 13, fontWeight: 900, color: '#ffd700', fontFamily: 'monospace' }}>${trader.totalEarned.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: '#4a5e7a' }}>Win Rate</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#00ff88', fontFamily: 'monospace' }}>{trader.winRate}%</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 10, color: '#4a5e7a' }}>Streak</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#ff6b35', fontFamily: 'monospace' }}>
                            {trader.currentStreak > 0 ? `🔥 ${trader.currentStreak}W` : '—'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Full leaderboard table */}
            <div style={{ background: '#0a0f1a', border: '1px solid #0d1826', borderRadius: 14, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #0d1826', display: 'flex', alignItems: 'center', gap: 8 }}>
                <Award size={14} color="#ffd700" />
                <span style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Full Leaderboard</span>
                <span style={{ fontSize: 10, color: '#4a5e7a' }}>Top 20 traders · {leaderboardPeriod === 'today' ? 'today' : leaderboardPeriod === 'week' ? 'this week' : 'all time'}</span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#0d1826' }}>
                      {['Rank', 'Trader', 'Win Rate', 'Total Earned', 'Best Finish', 'Streak', 'Tournaments'].map((h, i) => (
                        <th
                          key={h}
                          className={i >= 4 ? 'yn-lb-col-hide' : ''}
                          style={{ padding: '10px 16px', fontSize: 9, fontWeight: 700, color: '#1e3a5f', letterSpacing: '0.1em', textAlign: i <= 1 ? 'left' : 'right', whiteSpace: 'nowrap' }}
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {LEADERBOARD_DATA.map((trader, i) => (
                      <tr
                        key={trader.rank}
                        style={{
                          borderBottom: '1px solid #08111c',
                          background: i < 3 ? `${trader.color}05` : 'transparent',
                          transition: 'background 0.2s',
                        }}
                      >
                        {/* Rank */}
                        <td style={{ padding: '12px 16px', width: 60 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {i < 3 ? (
                              <span style={{ fontSize: 16 }}>{['🥇', '🥈', '🥉'][i]}</span>
                            ) : (
                              <span style={{ fontSize: 12, fontWeight: 700, color: '#1e3a5f', fontFamily: 'monospace' }}>#{trader.rank}</span>
                            )}
                            {trader.badge && <span style={{ fontSize: 12 }}>{trader.badge}</span>}
                          </div>
                        </td>
                        {/* Trader */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${trader.color}20`, border: `1px solid ${trader.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 900, color: trader.color, flexShrink: 0 }}>
                              {trader.initials}
                            </div>
                            <span style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', whiteSpace: 'nowrap' }}>{trader.name}</span>
                          </div>
                        </td>
                        {/* Win Rate */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <div style={{ width: 48, height: 4, background: '#0d1826', borderRadius: 2, overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${trader.winRate}%`, background: trader.winRate >= 60 ? '#00ff88' : trader.winRate >= 45 ? '#ffd700' : '#ff4757', borderRadius: 2 }} />
                            </div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: trader.winRate >= 60 ? '#00ff88' : trader.winRate >= 45 ? '#ffd700' : '#ff4757', fontFamily: 'monospace', minWidth: 34 }}>
                              {trader.winRate}%
                            </span>
                          </div>
                        </td>
                        {/* Total Earned */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'monospace', fontSize: 14, fontWeight: 800, color: '#ffd700' }}>
                          ${trader.totalEarned.toLocaleString()}
                        </td>
                        {/* Best Finish */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4a5e7a', fontFamily: 'monospace' }} className="yn-lb-col-hide">
                          #{trader.bestFinish}
                        </td>
                        {/* Streak */}
                        <td style={{ padding: '12px 16px', textAlign: 'right' }} className="yn-lb-col-hide">
                          {trader.currentStreak > 0 ? (
                            <span style={{ color: '#ff6b35', fontWeight: 700, fontFamily: 'monospace' }}>🔥 {trader.currentStreak}W</span>
                          ) : (
                            <span style={{ color: '#1e3a5f' }}>—</span>
                          )}
                        </td>
                        {/* Tournaments */}
                        <td style={{ padding: '12px 16px', textAlign: 'right', color: '#4a5e7a', fontFamily: 'monospace' }} className="yn-lb-col-hide">
                          {trader.tournaments}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={{ padding: '12px 20px', borderTop: '1px solid #0d1826', fontSize: 10, color: '#4a5e7a', textAlign: 'center' }}>
                Showing top 20 of 3,847 active traders · Updated every 30 seconds · Based on real tournament P&L
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px 16px 32px', borderTop: '1px solid #0d1826', marginTop: 20 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 24, height: 24, borderRadius: 6, background: 'linear-gradient(135deg,#ffd700,#ff6b35)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Trophy size={11} color="#04080f" fill="#04080f" />
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: '#fff' }}>YN Arena</span>
            </div>
            <div style={{ fontSize: 10, color: '#2a4060', maxWidth: 340, lineHeight: 1.7 }}>
              All tournaments use simulated accounts only. Only the entry fee and prize payouts involve real money via Stripe. Not financial advice.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[['/', 'Home'], ['/courses', 'Courses'], ['/app', 'Terminal'], ['/privacy', 'Privacy'], ['/terms', 'Terms']].map(([href, label]) => (
              <Link key={href} href={href} style={{ fontSize: 11, color: '#2a4060', textDecoration: 'none' }}>{label}</Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
