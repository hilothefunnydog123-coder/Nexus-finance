'use client'

/**
 * YN Edge — the cinematic live "edge board". The showpiece landing screen:
 * a dramatic AI-vs-the-market hero + stat strip, a trophy spotlight on the #1
 * worth-it pick, and a glowing grid of every other ranked market. Polls the
 * pricing API every 30s, filters client-side, and gates ALL motion behind
 * prefers-reduced-motion.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import {
  Target, DollarSign, Activity, Flame, BrainCircuit, Trophy, ArrowRight,
  TrendingUp, Clock, Scale, AlertTriangle,
} from 'lucide-react'
import {
  VOID, PANEL, BORDER, CYAN, VIOLET, GREEN, RED, AMBER, TXT, MUTE, FAINT, MONO,
  HeadToHead, WorthBadge, EngineBadge, Tag, Stat, PathRail, TextureBg, KalshiLogo, KALSHI_GREEN,
  pct, signedPct, fmtNum, timeToClose, catColor, edgeAccent, useReducedMotion,
  americanOdds, profitOn, stakeDollars, money,
} from '@/components/edge/shared'
import { Filters, DEFAULT_FILTERS, applyFilters, type EdgeFilterState } from '@/components/edge/Filters'
import type { EdgeBoard, EdgeRow } from '@/lib/edge/types'

const ENDPOINT = '/api/edge/markets?limit=250'
const POLL_MS = 30_000

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(ms) || ms < 0) return 'just now'
  const s = Math.floor(ms / 1000)
  if (s < 5) return 'just now'
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  return `${h}h ago`
}

export default function EdgeBoardClient() {
  const reduced = useReducedMotion()
  const [board, setBoard] = useState<EdgeBoard | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<EdgeFilterState>(DEFAULT_FILTERS)
  const [, forceTick] = useState(0)
  const firstLoad = useRef(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINT, { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: EdgeBoard = await res.json()
      if (!data || !Array.isArray(data.rows)) throw new Error('Malformed board')
      setBoard(data)
      setError(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
      firstLoad.current = false
    }
  }, [])

  // initial + 30s poll
  useEffect(() => {
    load()
    const id = window.setInterval(load, POLL_MS)
    return () => window.clearInterval(id)
  }, [load])

  // keep the "last priced" relative timestamp fresh
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 15_000)
    return () => window.clearInterval(id)
  }, [])

  const rows = board?.rows ?? []
  const filtered = useMemo(() => applyFilters(rows, filters), [rows, filters])

  // rows arrive pre-ranked; keep that order. The #1 worth-it pick is the spotlight.
  const spotlight = filtered.find((r) => r.verdict.worthIt) ?? filtered[0]
  const gridRows = filtered.filter((r) => r !== spotlight)

  // hero stats (real numbers from rows/meta)
  const hero = useMemo(() => {
    const worth = rows.filter((r) => r.verdict.worthIt)
    const biggestEdge = rows.reduce((mx, r) => Math.max(mx, r.verdict.edge), 0)
    const avgConf = rows.length
      ? rows.reduce((s, r) => s + r.verdict.confidence, 0) / rows.length
      : 0
    return {
      priced: board?.meta.marketCount ?? rows.length,
      worthIt: board?.meta.worthItCount ?? worth.length,
      biggestEdge,
      avgConf,
    }
  }, [rows, board])

  const categoriesPresent = board?.meta.categories
  const liveData = board?.meta.liveData ?? false
  const pricedAt = board?.meta.pricedAt

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(20px,4vw,48px) clamp(14px,3vw,28px) 80px' }}>
      <style>{`
        @keyframes yn-edge-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.35;transform:scale(.7)}}
        @keyframes yn-edge-ring{0%{transform:scale(.6);opacity:.7}100%{transform:scale(2.4);opacity:0}}
        @keyframes yn-edge-shimmer{0%{background-position:-200% 0}100%{background-position:200% 0}}
        @keyframes yn-edge-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      `}</style>

      <Hero
        hero={hero}
        liveData={liveData}
        pricedAt={pricedAt}
        note={board?.meta.note}
        reduced={reduced}
      />

      <div style={{ marginTop: 'clamp(20px,3vw,30px)', paddingTop: 16, borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <PathRail active="board" />
        <Link href="/edge/track-record" style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: GREEN, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          The net&apos;s portfolio &amp; track record <ArrowRight size={13} style={{ flexShrink: 0 }} />
        </Link>
      </div>

      <div style={{ marginTop: 'clamp(16px,2.5vw,24px)' }}>
        <Filters
          state={filters}
          onChange={setFilters}
          categoriesPresent={categoriesPresent}
          resultCount={filtered.length}
        />
      </div>

      {/* states */}
      {loading && !board ? (
        <Skeleton />
      ) : error && !board ? (
        <Notice
          tone={RED}
          title="The board went dark"
          body={`We couldn't reach the pricing engine (${error}). Retrying automatically every 30 seconds.`}
        />
      ) : filtered.length === 0 ? (
        <Notice
          tone={AMBER}
          title="No markets match"
          body="Nothing clears these filters right now. Loosen the min-edge or category, or switch off “worth it only”."
        />
      ) : (
        <>
          {spotlight && (
            <Spotlight row={spotlight} reduced={reduced} />
          )}
          {gridRows.length > 0 && (
            <div style={{ marginTop: 'clamp(28px,4vw,44px)', display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
              <h2 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 10, fontWeight: 800, letterSpacing: '-0.02em', fontSize: 'clamp(1.05rem,2.4vw,1.4rem)', color: TXT }}>
                <Activity size={20} style={{ color: CYAN, flexShrink: 0 }} /> Every market, ranked by edge
              </h2>
              <span style={{ fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.12em', textTransform: 'uppercase', color: FAINT }}>
                tap any market for the full breakdown
              </span>
            </div>
          )}
          <Grid rows={gridRows} reduced={reduced} startRank={spotlight ? 2 : 1} />
        </>
      )}
    </div>
  )
}

/* ── HERO ───────────────────────────────────────────────────────────────────── */

function Hero({
  hero,
  liveData,
  pricedAt,
  note,
  reduced,
}: {
  hero: { priced: number; worthIt: number; biggestEdge: number; avgConf: number }
  liveData: boolean
  pricedAt?: string
  note?: string
  reduced: boolean
}) {
  return (
    <section
      style={{
        position: 'relative',
        marginTop: 'clamp(4px,1.5vw,12px)',
        borderRadius: 16,
        overflow: 'hidden',
        border: `1px solid ${BORDER}`,
        background: `linear-gradient(160deg, ${CYAN}0a, ${VIOLET}08 40%, transparent)`,
        padding: 'clamp(22px,4vw,46px) clamp(18px,3.5vw,44px)',
      }}
    >
      <TextureBg seed="ynedge" opacity={0.18} overlay={`linear-gradient(120deg, ${VOID}f0 30%, ${VOID}cc 70%, ${VOID}f0)`} />
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${CYAN}, ${VIOLET}, transparent)` }} />

      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <ScanDot reduced={reduced} />
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: CYAN }}>
            <BrainCircuit size={15} style={{ flexShrink: 0 }} /> YnKalshi · LIVE PRICING
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: KALSHI_GREEN, opacity: 0.9 }} title="Live markets from Kalshi">
            <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>data</span>
            <KalshiLogo height={16} />
          </span>
          {!liveData && (
            <span
              title="Live Kalshi credentials aren't connected — showing our offline seed market set so the engine is still demonstrable."
              style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: AMBER, border: `1px solid ${AMBER}40`, background: `${AMBER}12`, padding: '3px 9px', borderRadius: 100 }}
            >
              <AlertTriangle size={11} style={{ flexShrink: 0 }} /> offline seed set
            </span>
          )}
          {pricedAt && (
            <span style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 10.5, color: FAINT, letterSpacing: '0.08em' }}>
              <Clock size={12} style={{ flexShrink: 0 }} /> last priced {relTime(pricedAt)}
            </span>
          )}
        </div>

        <h1
          style={{
            margin: '18px 0 0',
            fontWeight: 900,
            letterSpacing: '-0.035em',
            lineHeight: 0.98,
            fontSize: 'clamp(2.4rem, 7vw, 5rem)',
          }}
        >
          <span style={{ color: TXT }}>AI</span>{' '}
          <span style={{ color: FAINT, fontWeight: 600 }}>vs</span>{' '}
          <span
            style={{
              background: `linear-gradient(100deg, ${CYAN}, ${VIOLET})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            THE MARKET
          </span>
        </h1>

        <p style={{ margin: '16px 0 0', maxWidth: 680, color: TXT, fontSize: 'clamp(1.05rem,1.9vw,1.35rem)', fontWeight: 600, lineHeight: 1.4, letterSpacing: '-0.01em' }}>
          A systematic, profitable edge on <span style={{ color: KALSHI_GREEN }}>Kalshi</span> — priced, sized, and proven in public.
        </p>
        <p style={{ margin: '10px 0 0', maxWidth: 660, color: MUTE, fontSize: 'clamp(.95rem,1.6vw,1.05rem)', lineHeight: 1.55 }}>
          The BrainStock neural net (tradables), grounded AI (news events), and a statistical
          favorite-longshot model price every live market, measure the gap vs the live price — the
          <span style={{ color: CYAN, fontWeight: 600 }}> edge</span> — and tell you which side, how
          strong the conviction is, and <span style={{ color: GREEN, fontWeight: 600 }}>exactly how much to stake</span> (½-Kelly).
          No single bet is the play — the <span style={{ color: TXT, fontWeight: 600 }}>edge compounds across many disciplined bets</span>,
          and every call is graded on a public P&amp;L curve.
        </p>
        {note && (
          <p style={{ margin: '8px 0 0', fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.04em' }}>{note}</p>
        )}

        {/* headline stat — markets with an edge + proof CTA */}
        <div style={{ marginTop: 'clamp(18px,3vw,28px)', display: 'inline-flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontFamily: MONO, fontWeight: 800, fontSize: 'clamp(1rem,2vw,1.25rem)', color: GREEN, border: `1px solid ${GREEN}40`, background: `${GREEN}12`, padding: '8px 14px', borderRadius: 8, boxShadow: `0 0 26px ${GREEN}1f` }}>
            <Flame size={18} style={{ flexShrink: 0 }} />
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{fmtNum(hero.worthIt)}</span>
            <span style={{ fontWeight: 600, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase', color: TXT }}>plays worth betting right now</span>
          </span>
          <Link href="/edge/track-record" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: VOID, background: GREEN, padding: '9px 15px', borderRadius: 8, textDecoration: 'none', boxShadow: `0 0 24px ${GREEN}44` }}>
            <TrendingUp size={15} style={{ flexShrink: 0 }} /> See the live P&amp;L
          </Link>
          <Link href="/terminal" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: TXT, background: 'transparent', padding: '9px 15px', borderRadius: 8, textDecoration: 'none', border: `1px solid ${BORDER}` }}>
            <BrainCircuit size={15} style={{ flexShrink: 0 }} /> Open Project Matrix
          </Link>
        </div>

        {/* stat strip */}
        <div
          style={{
            marginTop: 'clamp(20px,3vw,30px)',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: 1,
            background: BORDER,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <StatCell><Stat label="Markets priced" value={fmtNum(hero.priced)} color={TXT} sub={<span style={statSub}><Activity size={11} style={{ flexShrink: 0 }} /> priced by the net</span>} /></StatCell>
          <StatCell><Stat label="Worth it now" value={fmtNum(hero.worthIt)} color={GREEN} sub={<span style={statSub}><Target size={11} style={{ flexShrink: 0 }} /> clear the bar</span>} /></StatCell>
          <StatCell><Stat label="Biggest edge" value={`${(hero.biggestEdge * 100).toFixed(1)}pt`} color={hero.biggestEdge > 0 ? CYAN : MUTE} sub={<span style={statSub}><TrendingUp size={11} style={{ flexShrink: 0 }} /> best gap</span>} /></StatCell>
          <StatCell><Stat label="Avg confidence" value={pct(hero.avgConf, 0)} color={VIOLET} sub={<span style={statSub}><BrainCircuit size={11} style={{ flexShrink: 0 }} /> across the board</span>} /></StatCell>
        </div>
      </div>
    </section>
  )
}

const statSub: React.CSSProperties = { display: 'inline-flex', alignItems: 'center', gap: 5 }

function StatCell({ children }: { children: React.ReactNode }) {
  return <div style={{ background: VOID, padding: 'clamp(14px,2vw,20px)' }}>{children}</div>
}

function ScanDot({ reduced }: { reduced: boolean }) {
  return (
    <span style={{ position: 'relative', width: 9, height: 9, display: 'inline-flex', flexShrink: 0 }}>
      <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: GREEN, animation: reduced ? 'none' : 'yn-edge-pulse 1.6s infinite' }} />
      {!reduced && (
        <span aria-hidden style={{ position: 'absolute', inset: 0, borderRadius: '50%', border: `1px solid ${GREEN}`, animation: 'yn-edge-ring 1.8s ease-out infinite' }} />
      )}
    </span>
  )
}

/* ── SPOTLIGHT (the trophy) ─────────────────────────────────────────────────── */

function Spotlight({ row, reduced }: { row: EdgeRow; reduced: boolean }) {
  const { market, pricing, verdict } = row
  const accent = edgeAccent(verdict.edge)
  const glow = verdict.worthIt ? GREEN : accent
  const sideColor = verdict.side === 'YES' ? GREEN : RED
  const odds = americanOdds(verdict.marketProb)
  const profit100 = profitOn(100, verdict.marketProb)
  const stake = stakeDollars(verdict.halfKelly, 1000)
  return (
    <section
      style={{
        marginTop: 'clamp(24px,4vw,40px)',
        position: 'relative',
        background: `linear-gradient(180deg, ${glow}0d, ${PANEL})`,
        border: `1px solid ${glow}55`,
        borderRadius: 14,
        padding: 'clamp(18px,3vw,34px)',
        boxShadow: verdict.worthIt ? `0 0 60px ${GREEN}22, inset 0 0 0 1px ${GREEN}10` : `0 0 40px ${accent}14`,
        animation: reduced ? 'none' : 'yn-edge-rise .7s cubic-bezier(.16,1,.3,1) both',
        overflow: 'hidden',
      }}
    >
      <TextureBg seed={`ynedge-spot-${market.ticker}`} opacity={0.1} overlay={`linear-gradient(135deg, ${VOID}f4 40%, ${VOID}e0)`} />
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg, transparent, ${glow}, transparent)` }} />

      <div style={{ position: 'relative' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 11, letterSpacing: '0.22em', textTransform: 'uppercase', color: glow, fontWeight: 700 }}>
          <Trophy size={16} style={{ flexShrink: 0 }} /> #1 · TOP PICK
        </span>
        <Tag color={catColor(market.category)}>{market.category}</Tag>
        <EngineBadge engine={pricing.engine} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.08em' }}>
          <Clock size={12} style={{ flexShrink: 0 }} /> closes {timeToClose(market.closeTime)}
        </span>
        <span style={{ marginLeft: 'auto' }}><WorthBadge worthIt={verdict.worthIt} /></span>
      </div>

      <h2 style={{ margin: '14px 0 0', fontSize: 'clamp(1.3rem,3vw,2rem)', fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.12, color: TXT }}>
        {market.title}
      </h2>

      {/* THE BET SLIP — the call, the moneyline, the payout */}
      <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', gap: 'clamp(12px,2.5vw,22px)', flexWrap: 'wrap', background: VOID, border: `1px solid ${sideColor}44`, borderRadius: 12, padding: 'clamp(11px,2vw,15px) clamp(14px,2.5vw,20px)' }}>
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>our call</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, letterSpacing: '0.05em', color: VOID, background: sideColor, padding: '4px 11px', borderRadius: 7, textTransform: 'uppercase', boxShadow: !reduced ? `0 0 20px ${sideColor}55` : 'none' }}>BET {verdict.side}</span>
            <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: TXT, fontVariantNumeric: 'tabular-nums' }}>{odds}</span>
          </span>
        </span>
        <span aria-hidden style={{ width: 1, alignSelf: 'stretch', background: BORDER }} />
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>$100 wins</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>+${profit100.toFixed(0)}</span>
        </span>
        <span aria-hidden style={{ width: 1, alignSelf: 'stretch', background: BORDER }} />
        <span style={{ display: 'inline-flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>we&apos;d stake</span>
          <span style={{ fontFamily: MONO, fontSize: 20, fontWeight: 800, color: CYAN, fontVariantNumeric: 'tabular-nums' }}>{money(stake)}<span style={{ fontSize: 11, color: FAINT }}>/$1k</span></span>
        </span>
      </div>

      <div
        style={{
          marginTop: 'clamp(16px,3vw,24px)',
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 'clamp(18px,3vw,34px)',
          alignItems: 'center',
        }}
      >
        <div style={{ minWidth: 0 }}>
          <HeadToHead aiYes={pricing.ynProb} marketYes={market.yesPrice} side={verdict.side} edge={verdict.edge} animate={!reduced} height={42} />
          <p style={{ margin: '16px 0 0', color: glow, fontSize: 14, fontWeight: 600, lineHeight: 1.45 }}>
            {verdict.reason}
          </p>
          <p style={{ margin: '8px 0 0', color: MUTE, fontSize: 13, lineHeight: 1.55 }}>
            {pricing.reasoning}
          </p>
          {pricing.underlying && (
            <p style={{ margin: '10px 0 0', fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.04em' }}>
              {pricing.underlying.symbol} ${fmtNum(pricing.underlying.lastPrice)} → net expects ${fmtNum(pricing.underlying.expectedPrice)} ({pricing.underlying.direction} ${fmtNum(pricing.underlying.strike)})
            </p>
          )}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 1,
            background: BORDER,
            border: `1px solid ${glow}33`,
            borderRadius: 10,
            overflow: 'hidden',
          }}
        >
          <TrophyStat label="Our Edge" value={`${signedPct(verdict.edge)}pt`} color={accent} glow={!reduced && verdict.worthIt} icon={<Target size={13} />} />
          <TrophyStat label="EV / $100" value={`${verdict.evPerDollar >= 0 ? '+' : ''}${money(verdict.evPerDollar * 100)}`} color={verdict.evPerDollar >= 0 ? GREEN : RED} glow={!reduced && verdict.worthIt} icon={<DollarSign size={13} />} />
          <TrophyStat label="½-Kelly stake" value={`${money(stake)}/$1k`} color={CYAN} icon={<Scale size={13} />} />
          <TrophyStat label="Confidence" value={pct(verdict.confidence, 0)} color={VIOLET} icon={<BrainCircuit size={13} />} />
        </div>
      </div>

      <div style={{ marginTop: 'clamp(16px,2.5vw,24px)', display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        <Link
          href={`/edge/${encodeURIComponent(market.ticker)}`}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 12, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 700, color: VOID, background: glow, border: `1px solid ${glow}`, padding: '11px 20px', borderRadius: 7, textDecoration: 'none', boxShadow: verdict.worthIt && !reduced ? `0 0 24px ${glow}55` : 'none' }}
        >
          Open the breakdown <ArrowRight size={15} style={{ flexShrink: 0 }} />
        </Link>
        <span style={{ fontFamily: MONO, fontSize: 11, color: FAINT, letterSpacing: '0.06em' }}>
          {fmtNum(market.volume)} contracts · {market.source === 'kalshi' ? 'live market' : 'seed'}
        </span>
      </div>
      </div>
    </section>
  )
}

function TrophyStat({ label, value, color, glow, icon }: { label: string; value: string; color: string; glow?: boolean; icon?: React.ReactNode }) {
  return (
    <div style={{ background: VOID, padding: 'clamp(12px,1.6vw,18px)' }}>
      <div style={{ fontSize: 'clamp(1.2rem,2.4vw,1.7rem)', fontWeight: 800, letterSpacing: '-0.02em', color, fontVariantNumeric: 'tabular-nums', textShadow: glow ? `0 0 18px ${color}66` : 'none' }}>
        {value}
      </div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT, marginTop: 5 }}>
        {icon && <span style={{ display: 'inline-flex', color: `${color}cc` }}>{icon}</span>}
        {label}
      </div>
    </div>
  )
}

/* ── GRID ───────────────────────────────────────────────────────────────────── */

function Grid({ rows, reduced, startRank }: { rows: EdgeRow[]; reduced: boolean; startRank: number }) {
  if (rows.length === 0) return null
  return (
    <div
      style={{
        marginTop: 'clamp(16px,2.5vw,22px)',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 'clamp(12px,1.6vw,18px)',
      }}
    >
      {rows.map((row, i) => (
        <Card key={row.market.ticker} row={row} reduced={reduced} index={i} rank={startRank + i} />
      ))}
    </div>
  )
}

function Card({ row, reduced, index, rank }: { row: EdgeRow; reduced: boolean; index: number; rank: number }) {
  const { market, pricing, verdict } = row
  const accent = edgeAccent(verdict.edge)
  const good = verdict.worthIt || verdict.evPerDollar > 0
  const dim = !good
  const sideColor = verdict.side === 'YES' ? GREEN : RED
  const odds = americanOdds(verdict.marketProb)         // odds for OUR side's price
  const profit100 = profitOn(100, verdict.marketProb)   // $ profit on a $100 win
  const stake = stakeDollars(verdict.halfKelly, 1000)   // ½-Kelly $ on a $1k bankroll
  return (
    <Link
      href={`/edge/${encodeURIComponent(market.ticker)}`}
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 11,
        background: `linear-gradient(168deg, ${good ? accent + '10' : 'rgba(255,255,255,.03)'} 0%, ${PANEL} 46%)`,
        border: `1px solid ${good ? accent + '55' : BORDER}`,
        borderRadius: 14,
        padding: 'clamp(14px,2vw,17px)',
        textDecoration: 'none',
        color: TXT,
        opacity: dim ? 0.66 : 1,
        boxShadow: verdict.worthIt && !reduced ? `0 0 30px ${GREEN}22, inset 0 1px 0 ${accent}20` : good && !reduced ? `0 0 18px ${accent}12` : 'none',
        transition: reduced ? 'none' : 'transform .25s cubic-bezier(.16,1,.3,1), border-color .25s, box-shadow .25s, opacity .25s',
        animation: reduced ? 'none' : `yn-edge-rise .5s cubic-bezier(.16,1,.3,1) ${Math.min(index, 12) * 40}ms both`,
      }}
      onMouseEnter={(e) => { if (!reduced) e.currentTarget.style.transform = 'translateY(-3px)' }}
      onMouseLeave={(e) => { if (!reduced) e.currentTarget.style.transform = 'none' }}
    >
      <span aria-hidden style={{ position: 'absolute', top: 0, left: 14, right: 14, height: 1, background: `linear-gradient(90deg, transparent, ${accent}77, transparent)` }} />

      {/* header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: '0.02em', color: good ? VOID : MUTE, background: good ? accent : 'transparent', border: `1px solid ${good ? accent : BORDER}`, borderRadius: 5, fontVariantNumeric: 'tabular-nums', minWidth: 26, height: 21, padding: '0 5px' }}>{rank}</span>
        <Tag color={catColor(market.category)}>{market.category}</Tag>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 10.5, color: FAINT, letterSpacing: '0.06em' }}>
          <Clock size={11} style={{ flexShrink: 0 }} />{timeToClose(market.closeTime)}
        </span>
        <span style={{ marginLeft: 'auto' }}><EngineBadge engine={pricing.engine} /></span>
      </div>

      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.26, letterSpacing: '-0.01em', minHeight: 39, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {market.title}
      </div>

      {/* THE PICK — the bet slip line a gambler reads first */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: VOID, border: `1px solid ${sideColor}44`, borderRadius: 9, padding: '9px 11px' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: MONO, fontSize: 12, fontWeight: 800, letterSpacing: '0.06em', color: VOID, background: sideColor, padding: '4px 9px', borderRadius: 6, textTransform: 'uppercase' }}>
          BET {verdict.side}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 15, fontWeight: 800, color: TXT, fontVariantNumeric: 'tabular-nums' }}>{odds}</span>
        <span style={{ marginLeft: 'auto', textAlign: 'right' }}>
          <span style={{ display: 'block', fontFamily: MONO, fontSize: 12.5, fontWeight: 700, color: GREEN, fontVariantNumeric: 'tabular-nums' }}>$100 → ${(100 + profit100).toFixed(0)}</span>
          <span style={{ display: 'block', fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: FAINT, marginTop: 1 }}>if it hits</span>
        </span>
      </div>

      <HeadToHead aiYes={pricing.ynProb} marketYes={market.yesPrice} side={verdict.side} edge={verdict.edge} animate={!reduced} height={20} />

      {/* the gambler's numbers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginTop: 1 }}>
        <MiniStat label="Edge" value={`${signedPct(verdict.edge)}pt`} color={accent} icon={<Target size={11} />} />
        <MiniStat label="EV /$100" value={`${verdict.evPerDollar >= 0 ? '+' : ''}${money(verdict.evPerDollar * 100)}`} color={verdict.evPerDollar >= 0 ? GREEN : RED} icon={<DollarSign size={11} />} />
        <MiniStat label="Stake /$1k" value={money(stake)} color={CYAN} icon={<Scale size={11} />} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 1 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10.5, color: FAINT, letterSpacing: '0.06em' }}>
          <Activity size={11} style={{ flexShrink: 0 }} /> {fmtNum(market.volume)} traded
        </span>
        <WorthBadge worthIt={verdict.worthIt} />
      </div>
    </Link>
  )
}

function MiniStat({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div style={{ background: VOID, border: `1px solid ${BORDER}`, borderRadius: 8, padding: '8px 9px' }}>
      <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 800, color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: MONO, fontSize: 8.5, letterSpacing: '0.11em', textTransform: 'uppercase', color: FAINT, marginTop: 3 }}>
        {icon && <span style={{ display: 'inline-flex', color: `${color}aa` }}>{icon}</span>}
        {label}
      </div>
    </div>
  )
}

/* ── STATES ─────────────────────────────────────────────────────────────────── */

function Skeleton() {
  const cells = Array.from({ length: 6 })
  return (
    <div style={{ marginTop: 'clamp(18px,3vw,28px)' }}>
      <div style={{ height: 220, borderRadius: 14, background: PANEL, border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
        <Shimmer />
      </div>
      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 18 }}>
        {cells.map((_, i) => (
          <div key={i} style={{ height: 230, borderRadius: 12, background: PANEL, border: `1px solid ${BORDER}`, position: 'relative', overflow: 'hidden' }}>
            <Shimmer />
          </div>
        ))}
      </div>
    </div>
  )
}

function Shimmer() {
  const reduced = useReducedMotion()
  if (reduced) return null
  return (
    <span
      aria-hidden
      style={{
        position: 'absolute',
        inset: 0,
        background: `linear-gradient(90deg, transparent, ${CYAN}0c 50%, transparent)`,
        backgroundSize: '200% 100%',
        animation: 'yn-edge-shimmer 1.6s linear infinite',
      }}
    />
  )
}

function Notice({ tone, title, body }: { tone: string; title: string; body: string }) {
  return (
    <div
      style={{
        marginTop: 'clamp(20px,4vw,40px)',
        textAlign: 'center',
        background: PANEL,
        border: `1px solid ${tone}40`,
        borderRadius: 14,
        padding: 'clamp(32px,6vw,64px) clamp(20px,4vw,40px)',
      }}
    >
      <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: 10, color: tone, background: `${tone}14`, border: `1px solid ${tone}40` }}>
        <AlertTriangle size={22} style={{ flexShrink: 0 }} />
      </div>
      <h3 style={{ margin: '12px 0 0', fontSize: 'clamp(1.1rem,2.4vw,1.5rem)', fontWeight: 800, color: TXT }}>{title}</h3>
      <p style={{ margin: '10px auto 0', maxWidth: 460, color: MUTE, fontSize: 14, lineHeight: 1.55 }}>{body}</p>
    </div>
  )
}
