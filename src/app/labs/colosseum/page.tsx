'use client'

import { useEffect, useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { DeskShell, Reveal, Panel, Eyebrow, CYAN, VIOLET, GREEN, RED, TXT, MUTE, FAINT, BORDER } from '@/components/cinematic/Desk'

const META: Record<string, { color: string; emoji: string }> = {
  brainstock: { color: CYAN, emoji: '🧠' },
  momentum: { color: '#fbbf24', emoji: '🚀' },
  reversion: { color: VIOLET, emoji: '🪂' },
  lowvol: { color: GREEN, emoji: '🛡️' },
  chance: { color: '#8a93a8', emoji: '🎲' },
}

type Bot = { id: string; name: string; strategy: string; equity: number; ret: number; steps: number; bestDay: number; worstDay: number; picks: string[]; history: { date: string; equity: number }[] }

export default function Colosseum() {
  const [bots, setBots] = useState<Bot[] | null>(null)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const load = () => fetch('/api/colosseum').then((r) => r.json()).then((j) => { setBots(j.bots || []); setReady(!!j.ready) }).catch(() => setBots([]))
    load()
    const id = setInterval(load, 120000)
    return () => clearInterval(id)
  }, [])

  const chart = useMemo(() => {
    if (!bots) return []
    const byDate = new Map<string, Record<string, number | string>>()
    for (const b of bots) for (const h of b.history) {
      const row = byDate.get(h.date) || { date: h.date }
      row[b.id] = h.equity
      byDate.set(h.date, row)
    }
    return [...byDate.values()].sort((a, b) => String(a.date).localeCompare(String(b.date)))
  }, [bots])

  const leader = bots?.[0]

  return (
    <DeskShell title="Labs · The Colosseum" accent={VIOLET} back="/labs">
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: 'clamp(50px,8vw,90px) clamp(16px,3vw,28px) 80px' }}>
        <Reveal><Eyebrow color={VIOLET} style={{ marginBottom: 20 }}>// FIVE STRATEGIES · ONE ARENA · GRADED FOREVER</Eyebrow></Reveal>
        <Reveal delay={60}>
          <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(2.4rem,6.5vw,5rem)', lineHeight: 0.98 }}>
            Sports for <span style={{ color: VIOLET }}>algorithms.</span>
          </h1>
        </Reveal>
        <Reveal delay={160}><p style={{ marginTop: 20, fontSize: 'clamp(1rem,1.6vw,1.2rem)', color: MUTE, lineHeight: 1.6, maxWidth: 660 }}>Five AIs, each given $100,000 of paper money and a different philosophy. Every night they rebalance and the scoreboard updates. The neural net has to earn its spot like everyone else.</p></Reveal>

        {bots && !ready && (
          <Panel glow={VIOLET} style={{ marginTop: 40, padding: '40px 28px', textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 18, color: TXT }}>The arena opens at the first nightly step.</div>
            <div style={{ marginTop: 8, color: MUTE, fontSize: 14 }}>Five fighters are taking their starting positions. Equity curves begin filling tomorrow.</div>
          </Panel>
        )}

        {ready && bots && (
          <>
            {/* equity curves */}
            <Reveal style={{ marginTop: 44 }}>
              <Panel glow={CYAN} style={{ padding: 'clamp(16px,2vw,24px)' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, letterSpacing: '0.14em', color: FAINT, marginBottom: 14 }}>EQUITY · $100,000 START</div>
                <div style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
                      <CartesianGrid stroke="rgba(255,255,255,.05)" strokeDasharray="3 6" vertical={false} />
                      <XAxis dataKey="date" tick={{ fill: FAINT, fontSize: 10.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={{ stroke: BORDER }} minTickGap={40} />
                      <YAxis tick={{ fill: FAINT, fontSize: 10.5, fontFamily: 'var(--font-mono)' }} tickLine={false} axisLine={false} domain={['auto', 'auto']} tickFormatter={(v) => `$${(Number(v) / 1000).toFixed(0)}k`} width={48} />
                      <Tooltip contentStyle={{ background: 'rgba(8,10,16,.96)', border: `1px solid ${BORDER}`, fontSize: 12, fontFamily: 'var(--font-mono)' }} labelStyle={{ color: MUTE }} formatter={(v, n) => [`$${Number(v).toLocaleString()}`, bots.find((b) => b.id === n)?.name ?? n]} />
                      {bots.map((b) => <Line key={b.id} type="monotone" dataKey={b.id} stroke={META[b.id]?.color ?? MUTE} strokeWidth={b.id === 'brainstock' ? 2.6 : 1.6} dot={false} connectNulls isAnimationActive={false} />)}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 14 }}>
                  {bots.map((b) => <span key={b.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: MUTE }}><span style={{ width: 10, height: 3, borderRadius: 2, background: META[b.id]?.color }} />{b.name}</span>)}
                </div>
              </Panel>
            </Reveal>

            {/* leaderboard */}
            <Reveal style={{ marginTop: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {bots.map((b, i) => {
                  const c = META[b.id]?.color ?? MUTE
                  return (
                    <Panel key={b.id} glow={c} spotlight style={{ padding: '16px 18px', display: 'grid', gridTemplateColumns: 'auto auto 1fr auto', gap: 16, alignItems: 'center' }} className="col-row">
                      <div style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 800, fontSize: 24, color: i === 0 ? c : FAINT, width: 30 }}>{i + 1}</div>
                      <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', fontSize: 22, background: `${c}1a`, border: `1px solid ${c}44` }}>{META[b.id]?.emoji}</div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 16, color: TXT, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>{b.name} {i === 0 && <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.1em', color: c, border: `1px solid ${c}55`, padding: '2px 7px' }}>LEADER</span>}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: FAINT, marginTop: 3 }}>{b.strategy} · holding {b.picks.slice(0, 5).join(' ')}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 800, color: TXT }}>${b.equity.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 700, color: b.ret >= 0 ? GREEN : RED }}>{b.ret >= 0 ? '+' : ''}{b.ret}%</div>
                      </div>
                    </Panel>
                  )
                })}
              </div>
            </Reveal>

            {leader && (
              <p style={{ marginTop: 22, fontSize: 13.5, color: MUTE, lineHeight: 1.6 }}>
                <b style={{ color: TXT }}>{leader.name}</b> leads after {leader.steps} sessions. Equal-weight, long-only, no leverage, marked to real closes — a fair fight. Educational simulation, not financial advice.
              </p>
            )}
          </>
        )}
      </div>
      <style>{`.col-row{transition:transform .15s ease}.col-row:hover{transform:translateX(3px)}`}</style>
    </DeskShell>
  )
}
