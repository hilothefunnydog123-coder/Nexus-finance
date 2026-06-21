'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DeskShell, Reveal, Eyebrow, CYAN, GREEN, RED, TXT, MUTE, FAINT, BORDER } from '@/components/cinematic/Desk'
import NeuralBg from '@/components/cinematic/NeuralBg'

type Tile = { ticker: string; pct: number; price: number }
type Data = { ready: boolean; asOf: string | null; count: number; bull: number; bear: number; avg: number; lean: string; tiles: Tile[] }

const col = (pct: number) => { const i = Math.min(1, Math.abs(pct) / 3); const a = 0.1 + i * 0.58; return pct >= 0 ? `rgba(52,211,153,${a})` : `rgba(248,113,113,${a})` }
const glow = (pct: number) => { const i = Math.min(1, Math.abs(pct) / 3); return pct >= 0 ? `rgba(52,211,153,${i * 0.6})` : `rgba(248,113,113,${i * 0.6})` }

export default function MarketBrain() {
  const [d, setD] = useState<Data | null>(null)
  useEffect(() => {
    const load = () => fetch('/api/market-brain').then((r) => r.json()).then(setD).catch(() => {})
    load(); const id = setInterval(load, 300000); return () => clearInterval(id)
  }, [])

  const bullPct = d && d.count ? (d.bull / d.count) * 100 : 50

  return (
    <DeskShell title="Labs · Market Brain" accent={CYAN} back="/labs">
      {/* the brain, thinking, behind the whole field */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <NeuralBg opacity={0.5} />
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(900px 600px at 50% 30%, ${CYAN}10, transparent 60%)` }} />
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 75% 65% at 50% 42%, transparent, rgba(6,7,12,.78) 92%)' }} />
      </div>
      <style>{`@keyframes mb-in{from{opacity:0;transform:scale(.5)}to{opacity:1;transform:none}}
        @keyframes mb-scan{0%{transform:translateY(-100%)}100%{transform:translateY(2400%)}}
        .mb-tile{animation:mb-in .5s cubic-bezier(.16,1,.3,1) both;transition:transform .15s ease, box-shadow .2s ease, filter .2s ease}
        .mb-tile:hover{transform:scale(1.12);z-index:5;filter:brightness(1.3)}`}</style>
      <div style={{ maxWidth: 1280, margin: '0 auto', padding: 'clamp(46px,7vw,80px) clamp(16px,3vw,28px) 80px' }}>
        <Reveal><Eyebrow style={{ marginBottom: 18 }}>// THE AI&apos;S VIEW OF EVERYTHING · {d?.asOf ?? 'LIVE'}</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(2.3rem,6vw,4.6rem)', lineHeight: 0.98 }}>
            The market, <span style={{ color: CYAN }}>through the net.</span>
          </h1>
        </Reveal>
        <Reveal delay={150}><p style={{ marginTop: 18, fontSize: 'clamp(1rem,1.5vw,1.18rem)', color: MUTE, lineHeight: 1.6, maxWidth: 620 }}>Every name BrainStock forecast this morning, colored by its call — bright green it&apos;s leaning hard up, bright red hard down. The whole market&apos;s conviction in one glance. Tap any tile to forecast it.</p></Reveal>

        {!d?.ready && <div style={{ marginTop: 50, color: FAINT, fontFamily: 'var(--font-mono)', fontSize: 13 }}>{d ? 'The brain hasn’t scanned the market yet today — check back after the morning run.' : 'Scanning…'}</div>}

        {d?.ready && (
          <>
            {/* market lean HUD */}
            <Reveal style={{ marginTop: 40 }}>
              <div style={{ display: 'flex', gap: 'clamp(20px,5vw,60px)', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 18 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: FAINT }}>MARKET LEAN</div>
                  <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 800, fontSize: 'clamp(1.6rem,3.4vw,2.4rem)', color: d.lean === 'bullish' ? GREEN : RED, letterSpacing: '-0.03em' }}>{d.lean === 'bullish' ? '▲ Net bullish' : '▼ Net bearish'}</div>
                </div>
                <Stat v={d.count} l="names scanned" c={TXT} />
                <Stat v={d.bull} l="leaning up" c={GREEN} />
                <Stat v={d.bear} l="leaning down" c={RED} />
                <Stat v={`${d.avg >= 0 ? '+' : ''}${d.avg}%`} l="avg forecast" c={d.avg >= 0 ? GREEN : RED} />
              </div>
              <div style={{ height: 10, borderRadius: 99, overflow: 'hidden', display: 'flex', border: `1px solid ${BORDER}` }}>
                <div style={{ width: `${bullPct}%`, background: `linear-gradient(90deg, ${GREEN}, ${GREEN}aa)`, transition: 'width 1s ease' }} />
                <div style={{ width: `${100 - bullPct}%`, background: `linear-gradient(90deg, ${RED}aa, ${RED})`, transition: 'width 1s ease' }} />
              </div>
            </Reveal>

            {/* the heatmap field */}
            <Reveal style={{ marginTop: 28, position: 'relative', overflow: 'hidden' }}>
              <div aria-hidden style={{ position: 'absolute', insetInline: 0, top: 0, height: 60, background: `linear-gradient(${CYAN}22, transparent)`, animation: 'mb-scan 6s linear infinite', pointerEvents: 'none', zIndex: 1 }} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(76px, 1fr))', gap: 6 }}>
                {d.tiles.map((t, i) => (
                  <Link key={t.ticker} href={`/brainstock?t=${t.ticker}`} className="mb-tile" title={`${t.ticker} · $${t.price} · forecast ${t.pct >= 0 ? '+' : ''}${t.pct}%`}
                    style={{ animationDelay: `${Math.min(i * 5, 650)}ms`, aspectRatio: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textDecoration: 'none', background: col(t.pct), border: `1px solid ${glow(t.pct)}`, boxShadow: `0 0 ${4 + Math.min(Math.abs(t.pct) / 3, 1) * 16}px ${glow(t.pct)}`, color: TXT }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(10px,1.3vw,13px)', fontWeight: 700, letterSpacing: '0.02em' }}>{t.ticker}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(9px,1.1vw,11px)', color: t.pct >= 0 ? '#bdf5dd' : '#ffd0d0', marginTop: 2 }}>{t.pct >= 0 ? '+' : ''}{t.pct}%</span>
                  </Link>
                ))}
              </div>
            </Reveal>

            <p style={{ marginTop: 24, fontSize: 12, color: FAINT, lineHeight: 1.6 }}>Color = the neural net&apos;s predicted 5-day move; brightness = conviction. Sorted most bullish → most bearish. Educational model output, not financial advice.</p>
          </>
        )}
      </div>
    </DeskShell>
  )
}

function Stat({ v, l, c }: { v: React.ReactNode; l: string; c: string }) {
  return (
    <div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(1.3rem,2.6vw,1.9rem)', fontWeight: 800, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: FAINT, marginTop: 4 }}>{l}</div>
    </div>
  )
}
