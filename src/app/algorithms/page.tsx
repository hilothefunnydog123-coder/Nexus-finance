'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'
import { ALGORITHMS, type Algorithm, type AlgoMode, type Platform } from './data'
import { MONTE_CARLO, MONTE_CARLO_META } from './montecarlo'

// ── Design tokens (match homepage) ────────────────────────────────────────────
const INK = '#0a0a0c'
const BONE = '#f4f2ec'
const PAPER = '#fcfbf8'
const ACCENT = '#1f3bff'
const GREEN = '#0a9d63'
const RED = '#e5484d'
const SUB = 'rgba(10,10,12,.62)'
const LINE = 'rgba(10,10,12,.1)'
const FONT_DISPLAY = 'var(--font-display), system-ui, sans-serif'
const FONT_MONO = 'var(--font-mono), ui-monospace, monospace'

// ── Grouping derived from the data ────────────────────────────────────────────
type GroupId = 'god' | 'quant' | 'signature' | 'indicator'
interface Group {
  id: GroupId
  kicker: string
  title: string
  blurb: string
  accent: string
  algos: Algorithm[]
}

const SIGNATURE_IDS = new Set(['ict', 'ross', 'rayner', 'humbled', 'anton', 'orb', 'emacloud', 'combo'])

function categorize(a: Algorithm): GroupId {
  if (a.god) return 'god'
  if (a.indicatorOnly) return 'indicator'
  if (SIGNATURE_IDS.has(a.id)) return 'signature'
  return 'quant'
}

function buildGroups(): Group[] {
  const byId: Record<GroupId, Algorithm[]> = { god: [], quant: [], signature: [], indicator: [] }
  for (const a of ALGORITHMS) byId[categorize(a)].push(a)
  const all: Group[] = [
    {
      id: 'god',
      kicker: '// GOD MODE',
      title: 'God Mode',
      blurb: 'Research-grade quant strategies — statistical arbitrage, volatility-targeted momentum, regime switching. The flagship lives here.',
      accent: GREEN,
      algos: byId.god,
    },
    {
      id: 'quant',
      kicker: '// QUANT PRO',
      title: 'Quant Pro',
      blurb: 'Deliberately simple, low-parameter strategies built on well-documented edges. Auto-trade ready, long and short, with prop-firm risk rules.',
      accent: ACCENT,
      algos: byId.quant,
    },
    {
      id: 'signature',
      kicker: '// SIGNATURE',
      title: 'Signature Strategies',
      blurb: 'The defining method of each YN Finance instructor — ICT, Ross Cameron, Rayner Teo and more — converted into working code.',
      accent: '#7c3aed',
      algos: byId.signature,
    },
    {
      id: 'indicator',
      kicker: '// INDICATORS',
      title: 'Indicators & Signals',
      blurb: 'Visual markup and alert tools. Drop them on a chart for precise entry, stop and target prices — you pull the trigger.',
      accent: '#b8860b',
      algos: byId.indicator,
    },
  ]
  return all.filter(g => g.algos.length > 0)
}

// ── Copy-to-clipboard button ──────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
        } catch {
          const ta = document.createElement('textarea')
          ta.value = text
          ta.style.position = 'fixed'
          ta.style.opacity = '0'
          document.body.appendChild(ta)
          ta.select()
          try { document.execCommand('copy') } catch { /* noop */ }
          document.body.removeChild(ta)
        }
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
        fontFamily: FONT_MONO, letterSpacing: '.06em', cursor: 'pointer',
        border: `1px solid ${copied ? GREEN : 'rgba(255,255,255,.18)'}`,
        background: copied ? 'rgba(10,157,99,.18)' : 'rgba(255,255,255,.06)',
        color: copied ? '#6ee7b7' : '#e8edf2', transition: 'all .18s', minHeight: 36,
      }}
    >
      {copied ? '✓ COPIED' : '⧉ COPY CODE'}
    </button>
  )
}

// ── NinjaTrader mark ──────────────────────────────────────────────────────────
function NinjaMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="NinjaTrader" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#0b1220" stroke="#2bd17e" strokeWidth="1.5" />
      <path d="M12 2.5 L14.1 9.9 L21.5 12 L14.1 14.1 L12 21.5 L9.9 14.1 L2.5 12 L9.9 9.9 Z" fill="#2bd17e" />
      <circle cx="12" cy="12" r="1.7" fill="#0b1220" />
    </svg>
  )
}

// ── Code block (dark, premium, with working copy) ─────────────────────────────
function CodeBlock({ code, lang }: { code: string; lang: 'pine' | 'mql5' | 'csharp' }) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const highlighted = esc(code)
    .replace(/(\/\/[^\n]*)/g, m => `<span style="color:#6b8290;font-style:italic">${m}</span>`)
    .replace(/\b(strategy|indicator|input|ta|plot|plotshape|bgcolor|alertcondition|alert|hline|var|if|else|for|and|or|not|true|false|na|input\.\w+)\b/g,
      m => `<span style="color:#c792ea">${m}</span>`)
    .replace(/\b(float|int|bool|string|series|simple|void|double)\b/g,
      m => `<span style="color:#82aaff">${m}</span>`)
    .replace(/&quot;([^&]*)&quot;/g, (_, s: string) => `<span style="color:#c3e88d">&quot;${s}&quot;</span>`)
    .replace(/\b(\d+\.?\d*)\b/g, m => `<span style="color:#f78c6c">${m}</span>`)

  const label = lang === 'pine' ? 'PINE SCRIPT v5 · TRADINGVIEW'
    : lang === 'mql5' ? 'MQL5 · METATRADER 5'
    : 'C# · NINJATRADER 8'

  return (
    <div style={{ borderRadius: 14, overflow: 'hidden', border: '1px solid rgba(255,255,255,.1)', boxShadow: '0 18px 50px rgba(10,10,12,.18)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: '#13161c', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 11, color: '#8a99a6', fontFamily: FONT_MONO, letterSpacing: '.12em' }}>
          <span style={{ display: 'inline-flex', gap: 6 }}>
            <i style={{ width: 9, height: 9, borderRadius: 99, background: RED, display: 'inline-block' }} />
            <i style={{ width: 9, height: 9, borderRadius: 99, background: '#e3b341', display: 'inline-block' }} />
            <i style={{ width: 9, height: 9, borderRadius: 99, background: GREEN, display: 'inline-block' }} />
          </span>
          {label}
        </span>
        <CopyButton text={code} />
      </div>
      <pre
        style={{
          margin: 0, padding: '20px', overflowX: 'auto', overflowY: 'auto',
          maxHeight: 520, background: '#0c0e13',
          fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
          fontSize: 12.5, lineHeight: 1.7, color: '#c8d3dc',
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  )
}

// ── Step guide ────────────────────────────────────────────────────────────────
function StepGuide({ steps, accent }: { steps: string[]; accent: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '15px 18px', background: PAPER, border: `1px solid ${LINE}`, borderRadius: 12 }}>
          <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: `${accent}14`, border: `1px solid ${accent}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: accent, fontFamily: FONT_MONO }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <p style={{ fontSize: 14, color: 'rgba(10,10,12,.78)', lineHeight: 1.65, margin: 0 }}>{step}</p>
        </div>
      ))}
    </div>
  )
}

// ── Small badge ───────────────────────────────────────────────────────────────
function Pill({ children, color = SUB, bg = 'rgba(10,10,12,.04)', border = LINE }: { children: React.ReactNode; color?: string; bg?: string; border?: string }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 700, color, background: bg, border: `1px solid ${border}`, borderRadius: 6, padding: '3px 9px', fontFamily: FONT_MONO, letterSpacing: '.04em', whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

// ── Algorithm card ────────────────────────────────────────────────────────────
function AlgoCard({ algo, selected, onSelect }: { algo: Algorithm; selected: boolean; onSelect: () => void }) {
  const c = algo.color
  return (
    <button
      className="algo-card"
      onClick={onSelect}
      aria-pressed={selected}
      style={{
        textAlign: 'left', cursor: 'pointer', width: '100%', display: 'flex', flexDirection: 'column',
        padding: '20px', borderRadius: 16, minHeight: 44, transition: 'transform .18s ease, box-shadow .18s ease, border-color .18s',
        background: PAPER,
        border: `1px solid ${selected ? c : LINE}`,
        boxShadow: selected ? `0 12px 34px ${c}26` : '0 1px 2px rgba(10,10,12,.04)',
        transform: selected ? 'translateY(-2px)' : 'none', outline: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ width: 42, height: 42, borderRadius: 12, background: `${c}14`, border: `1px solid ${c}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: c, fontFamily: FONT_MONO }}>
          {algo.init}
        </span>
        {algo.god && (
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.1em', color: '#fff', background: GREEN, borderRadius: 6, padding: '4px 8px', fontFamily: FONT_MONO }}>⚡ GOD</span>
        )}
        {algo.indicatorOnly && !algo.god && (
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '.08em', color: SUB, background: 'rgba(10,10,12,.05)', borderRadius: 6, padding: '4px 8px', fontFamily: FONT_MONO }}>SIGNAL</span>
        )}
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: INK, lineHeight: 1.28, letterSpacing: '-.01em', fontFamily: FONT_DISPLAY, marginBottom: 6 }}>
        {algo.strategy.split('—')[0].trim()}
      </div>
      <div style={{ fontSize: 12.5, color: SUB, lineHeight: 1.55, marginBottom: 14, flex: 1 }}>
        {algo.tagline.length > 96 ? algo.tagline.slice(0, 96).trim() + '…' : algo.tagline}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <Pill color={c} bg={`${c}12`} border={`${c}30`}>{algo.assets[0]}</Pill>
        <Pill>{algo.winTarget.split('(')[0].trim()}</Pill>
      </div>
    </button>
  )
}

// ── Monte Carlo Lab (light theme rebuild) ─────────────────────────────────────
function MonteCarloLab({ onSelect }: { onSelect: (id: string) => void }) {
  const pc = (x: number) => (x * 100).toFixed(1) + '%'
  const f2 = (x: number) => x.toFixed(2)
  const medal = ['🥇', '🥈', '🥉']
  const top = MONTE_CARLO.slice(0, 3)

  return (
    <section id="lab" style={{ padding: '0 24px', maxWidth: 1120, margin: '0 auto 88px', scrollMarginTop: 84 }}>
      <div style={{ marginBottom: 26 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: ACCENT, fontFamily: FONT_MONO, marginBottom: 12 }}>// MONTE CARLO LAB</div>
        <h2 style={{ fontSize: 'clamp(24px,4vw,38px)', fontWeight: 800, letterSpacing: '-.03em', color: INK, fontFamily: FONT_DISPLAY, lineHeight: 1.08, maxWidth: 820 }}>
          We ran {MONTE_CARLO.length} robust strategies through {MONTE_CARLO_META.trials.toLocaleString()} prop challenges each.
        </h2>
        <p style={{ fontSize: 15.5, color: SUB, lineHeight: 1.7, maxWidth: 760, marginTop: 16 }}>
          Each strategy was simulated through an FTMO-style evaluation —
          <b style={{ color: INK }}> {pc(MONTE_CARLO_META.riskPct)} risk/trade</b>, pass at
          <b style={{ color: GREEN }}> +{pc(MONTE_CARLO_META.profitTarget)}</b>, bust at
          <b style={{ color: RED }}> −{pc(MONTE_CARLO_META.maxDrawdown)}</b> trailing, over a {MONTE_CARLO_META.maxTrades}-trade window —
          with a live edge haircut applied first. Ranked by a composite of pass rate, expectancy and risk of ruin.
        </p>
      </div>

      {/* Podium */}
      <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 18 }}>
        {top.map((r, i) => {
          const c = ALGORITHMS.find(a => a.id === r.id)?.color ?? ACCENT
          return (
            <button key={r.id} onClick={() => onSelect(r.id)} style={{ textAlign: 'left', cursor: 'pointer', background: PAPER, border: `1px solid ${LINE}`, borderRadius: 14, padding: '18px 20px', transition: 'transform .18s, box-shadow .18s', minHeight: 44 }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = `0 12px 30px ${c}1f` }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <span style={{ fontSize: 22 }}>{medal[i]}</span>
                <Pill color={c} bg={`${c}12`} border={`${c}30`}>SCORE {f2(r.score)}</Pill>
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginBottom: 10, lineHeight: 1.25, fontFamily: FONT_DISPLAY }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12.5, fontFamily: FONT_MONO }}>
                <span style={{ color: GREEN, fontWeight: 700 }}>{pc(r.passRate)} pass</span>
                <span style={{ color: INK }}>{f2(r.expR)}R</span>
                <span style={{ color: RED }}>{pc(r.bustRate)} ruin</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Full table */}
      <div style={{ border: `1px solid ${LINE}`, borderRadius: 16, overflow: 'hidden', background: PAPER }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: FONT_MONO, fontSize: 12.5, minWidth: 720 }}>
            <thead>
              <tr style={{ color: SUB }}>
                {['#', 'STRATEGY', 'WIN*', 'R*', 'EXP(R)', 'PASS%', 'RUIN%', 'MED-RET', 'P95-DD', 'SCORE'].map((h, i) => (
                  <th key={h} style={{ padding: '13px 16px', fontWeight: 700, letterSpacing: '.05em', fontSize: 10, textAlign: i === 1 ? 'left' : 'right', borderBottom: `1px solid ${LINE}`, background: BONE }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTE_CARLO.map(r => {
                const color = ALGORITHMS.find(a => a.id === r.id)?.color ?? ACCENT
                const passCol = r.passRate >= 0.8 ? GREEN : r.passRate >= 0.7 ? '#b8860b' : RED
                return (
                  <tr key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: 'pointer', textAlign: 'right', borderBottom: `1px solid ${LINE}` }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(31,59,255,.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 16px', color: r.rank <= 3 ? ACCENT : SUB, fontWeight: 800 }}>{r.rank}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'left' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 9, verticalAlign: 'middle' }} />
                      <span style={{ color: INK, fontWeight: 600 }}>{r.name}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: SUB }}>{f2(r.win)}</td>
                    <td style={{ padding: '11px 16px', color: SUB }}>{f2(r.R)}</td>
                    <td style={{ padding: '11px 16px', color: INK, fontWeight: 700 }}>{f2(r.expR)}</td>
                    <td style={{ padding: '11px 16px', color: passCol, fontWeight: 700 }}>{pc(r.passRate)}</td>
                    <td style={{ padding: '11px 16px', color: RED }}>{pc(r.bustRate)}</td>
                    <td style={{ padding: '11px 16px', color: SUB }}>{pc(r.medReturn)}</td>
                    <td style={{ padding: '11px 16px', color: SUB }}>{pc(r.p95MaxDD)}</td>
                    <td style={{ padding: '11px 16px', color: ACCENT, fontWeight: 800 }}>{f2(r.score)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '14px 20px', fontSize: 11.5, color: SUB, lineHeight: 1.6, borderTop: `1px solid ${LINE}`, background: BONE }}>
          * WIN / R are post-haircut (the values actually simulated), not the advertised targets. Model assumptions, not live backtests —
          validate each strategy on 6–12 months of real data before trading a funded account. Generated {MONTE_CARLO_META.generated}.
        </div>
      </div>
    </section>
  )
}

// ── Detail panel ──────────────────────────────────────────────────────────────
function DetailPanel({ algo, mode, setMode, platform, setPlatform }: {
  algo: Algorithm
  mode: AlgoMode
  setMode: (m: AlgoMode) => void
  platform: Platform
  setPlatform: (p: Platform) => void
}) {
  const c = algo.color
  const code = mode === 'auto'
    ? (platform === 'ninjatrader' ? (algo.auto.ninjatrader ?? algo.auto.tradingview) : platform === 'mt5' ? algo.auto.mt5 : algo.auto.tradingview)
    : algo.signals.tradingview
  const steps = mode === 'auto'
    ? (platform === 'ninjatrader' && algo.auto.ninjaSteps ? algo.auto.ninjaSteps : algo.auto.steps)
    : algo.signals.steps
  const codeLang: 'pine' | 'mql5' | 'csharp' =
    mode === 'auto' ? (platform === 'mt5' ? 'mql5' : platform === 'ninjatrader' ? 'csharp' : 'pine') : 'pine'

  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 22, overflow: 'hidden', background: PAPER, boxShadow: '0 24px 60px rgba(10,10,12,.08)' }}>
      {/* Header */}
      <div style={{ padding: 'clamp(24px,4vw,38px)', borderBottom: `1px solid ${LINE}`, background: `linear-gradient(180deg, ${c}0a, transparent)` }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
              <span style={{ width: 40, height: 40, borderRadius: 11, background: `linear-gradient(135deg,${c},${c}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: '#fff', fontFamily: FONT_MONO }}>{algo.init}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, fontFamily: FONT_MONO, letterSpacing: '.12em' }}>{algo.instructor.toUpperCase()}</span>
              {algo.god && <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '.1em', color: '#fff', background: GREEN, borderRadius: 6, padding: '4px 10px', fontFamily: FONT_MONO }}>⚡ GOD MODE</span>}
            </div>
            <h2 style={{ fontSize: 'clamp(22px,3.4vw,34px)', fontWeight: 800, color: INK, letterSpacing: '-.03em', lineHeight: 1.08, marginBottom: 12, fontFamily: FONT_DISPLAY }}>{algo.strategy}</h2>
            <p style={{ fontSize: 15.5, color: SUB, lineHeight: 1.6, maxWidth: 640 }}>{algo.tagline}</p>
          </div>
          <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 260 }}>
            {[
              { label: 'Assets', value: algo.assets.join(', ') },
              { label: 'Timeframes', value: algo.timeframes.join(', ') },
              { label: 'Win Rate Target', value: algo.winTarget },
              { label: 'Risk / Trade', value: algo.riskPerTrade },
            ].map(s => (
              <div key={s.label} style={{ background: BONE, border: `1px solid ${LINE}`, borderRadius: 10, padding: '11px 14px' }}>
                <div style={{ fontSize: 9, color: SUB, fontFamily: FONT_MONO, letterSpacing: '.1em', marginBottom: 5 }}>{s.label.toUpperCase()}</div>
                <div style={{ fontSize: 13, color: INK, fontWeight: 600, lineHeight: 1.3 }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 'clamp(24px,4vw,38px)' }}>
        {/* How it works */}
        <div style={{ marginBottom: 28, padding: '20px 24px', background: BONE, border: `1px solid ${LINE}`, borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: SUB, fontFamily: FONT_MONO, marginBottom: 10 }}>// HOW IT WORKS</div>
          <p style={{ fontSize: 14.5, color: 'rgba(10,10,12,.78)', lineHeight: 1.75 }}>{algo.overview}</p>
        </div>

        {/* Prop firm */}
        <div style={{ marginBottom: 30, padding: '20px 24px', background: `${c}08`, border: `1px solid ${c}22`, borderRadius: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: c, fontFamily: FONT_MONO, marginBottom: 10 }}>// PROP FIRM NOTES</div>
          <p style={{ fontSize: 14.5, color: 'rgba(10,10,12,.78)', lineHeight: 1.75 }}>{algo.propNotes}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
            {algo.propFirms.map(firm => <Pill key={firm} color={c} bg={`${c}12`} border={`${c}28`}>{firm}</Pill>)}
          </div>
        </div>

        {/* Toggles */}
        <div style={{ display: 'flex', gap: 22, marginBottom: 22, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: SUB, fontFamily: FONT_MONO, marginBottom: 10 }}>// TYPE</div>
            <div style={{ display: 'flex', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden' }}>
              {(algo.indicatorOnly
                ? ([['signals', '📊 Indicator']] as const)
                : ([['auto', '🤖 Auto-Trade'], ['signals', '📡 Signal Alerts']] as const)
              ).map(([m, label]) => (
                <button key={m} onClick={() => setMode(m)} style={{ padding: '11px 20px', minHeight: 44, cursor: 'pointer', border: 'none', outline: 'none', transition: 'all .18s', background: mode === m ? c : 'transparent', color: mode === m ? '#fff' : SUB, fontWeight: mode === m ? 800 : 600, fontSize: 13 }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
          {mode === 'auto' && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.12em', color: SUB, fontFamily: FONT_MONO, marginBottom: 10 }}>// PLATFORM</div>
              <div style={{ display: 'flex', border: `1px solid ${LINE}`, borderRadius: 10, overflow: 'hidden', flexWrap: 'wrap' }}>
                {(algo.auto.ninjatrader
                  ? [['tradingview', 'TradingView'], ['mt5', 'MetaTrader 5'], ['ninjatrader', 'NinjaTrader 8']]
                  : [['tradingview', 'TradingView'], ['mt5', 'MetaTrader 5']]
                ).map(([p, label]) => (
                  <button key={p} onClick={() => setPlatform(p as Platform)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 18px', minHeight: 44, cursor: 'pointer', border: 'none', outline: 'none', transition: 'all .18s', background: platform === p ? INK : 'transparent', color: platform === p ? '#fff' : SUB, fontWeight: platform === p ? 700 : 500, fontSize: 13 }}>
                    {p === 'ninjatrader' ? <NinjaMark size={15} /> : null}
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mode hint */}
        <div style={{ marginBottom: 22, fontSize: 13, color: SUB, padding: '12px 16px', background: BONE, borderRadius: 10, borderLeft: `3px solid ${c}` }}>
          {mode === 'auto'
            ? platform === 'tradingview'
              ? 'Paste this into TradingView’s Pine Script Editor. The strategy auto-executes via broker integrations or webhooks (webhooks need a paid TradingView plan).'
              : platform === 'mt5'
              ? 'Compile this in MetaEditor (ships with MT5). Attach the EA, enable AutoTrading — works with any MT5 broker.'
              : 'Compile this in NinjaTrader 8 (NinjaScript Editor → F5). Add it to a futures chart and enable it — no TradingView, no webhook, no monthly fee.'
            : 'This is an indicator. Add it to your chart — it draws arrows and fires alerts with exact entry, SL and TP prices. You execute the trade manually.'}
        </div>

        {/* Code */}
        <div style={{ marginBottom: 34 }}>
          <CodeBlock code={code} lang={codeLang} />
        </div>

        {/* Steps */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '.1em', color: INK, fontFamily: FONT_MONO, marginBottom: 16 }}>// STEP-BY-STEP DEPLOYMENT</div>
          <StepGuide steps={steps} accent={c} />
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AlgorithmsPage() {
  const groups = useMemo(buildGroups, [])
  const grail = useMemo(() => ALGORITHMS.find(a => a.id === 'godregime') ?? null, [])

  const [selectedId, setSelectedId] = useState('godregime')
  const [mode, setMode] = useState<AlgoMode>('auto')
  const [platform, setPlatform] = useState<Platform>('tradingview')
  const [activeGroup, setActiveGroup] = useState<GroupId | 'lab'>(groups[0]?.id ?? 'god')
  const detailRef = useRef<HTMLDivElement>(null)

  const algo = ALGORITHMS.find(a => a.id === selectedId) ?? ALGORITHMS[0]

  const selectAndScroll = (id: string) => {
    setSelectedId(id)
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    setTimeout(() => detailRef.current?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' }), 60)
  }

  // Indicator-only entries force the indicator view; reset platform if NT unsupported
  useEffect(() => {
    setMode(algo.indicatorOnly ? 'signals' : 'auto')
  }, [algo.id, algo.indicatorOnly])
  useEffect(() => {
    if (platform === 'ninjatrader' && !algo.auto.ninjatrader) setPlatform('tradingview')
  }, [platform, algo.auto.ninjatrader])

  // Scroll-spy for the navigator
  useEffect(() => {
    const ids = groups.map(g => g.id)
    const handler = () => {
      let current = ids[0]
      for (const id of ids) {
        const el = document.getElementById('group-' + id)
        if (el && el.getBoundingClientRect().top <= 140) current = id
      }
      setActiveGroup(current)
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    return () => window.removeEventListener('scroll', handler)
  }, [groups])

  const scrollToGroup = (id: GroupId) => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById('group-' + id)?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  }

  const navItems: { id: GroupId | 'lab'; label: string }[] = [
    ...groups.map(g => ({ id: g.id, label: g.title })),
    { id: 'lab', label: 'Monte Carlo Lab' },
  ]

  return (
    <div style={{ background: BONE, minHeight: '100vh', color: INK, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes sheen { from{background-position:160% 0} to{background-position:-160% 0} }
        * { box-sizing:border-box }
        .reveal { animation: fadeUp .6s ease both }
        pre::-webkit-scrollbar { width:8px; height:8px }
        pre::-webkit-scrollbar-track { background:#0c0e13 }
        pre::-webkit-scrollbar-thumb { background:#2a2f38; border-radius:4px }
        .navtabs::-webkit-scrollbar { display:none }
        .algo-card:focus-visible { outline:2px solid ${ACCENT}; outline-offset:2px }
        @media (max-width:980px) { .algo-grid { grid-template-columns: repeat(2,1fr) !important } }
        @media (max-width:760px) {
          .algo-grid { grid-template-columns: 1fr !important }
          .meta-grid { grid-template-columns: 1fr 1fr !important }
          .grail-stats { grid-template-columns: repeat(2,1fr) !important }
        }
        @media (prefers-reduced-motion: reduce) {
          .reveal { animation: none !important }
          *, *::before, *::after { animation-duration:.001s !important; transition:none !important }
        }
      `}</style>

      {/* TOP NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(244,242,236,.86)', backdropFilter: 'blur(12px)', borderBottom: `1px solid ${LINE}`, padding: '0 24px', height: 62, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <YNMark size={26} />
            <span style={{ fontSize: 15, fontWeight: 700, color: INK, letterSpacing: '-.02em', fontFamily: FONT_DISPLAY }}>YN Finance</span>
          </Link>
          <span style={{ width: 1, height: 18, background: LINE }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', color: ACCENT, fontFamily: FONT_MONO }}>ALGORITHMS</span>
        </div>
        <Pill color={GREEN} bg="rgba(10,157,99,.1)" border="rgba(10,157,99,.3)">FREE FOREVER</Pill>
      </nav>

      {/* HERO — flagship "Holy Grail" */}
      <header style={{ padding: 'clamp(56px,8vw,96px) 24px clamp(40px,5vw,64px)', maxWidth: 1120, margin: '0 auto' }} className="reveal">
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', color: ACCENT, fontFamily: FONT_MONO, marginBottom: 20 }}>
          // ALGORITHMS · COPY-PASTE · PROP-FIRM READY
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.25fr) minmax(0,1fr)', gap: 'clamp(24px,4vw,56px)', alignItems: 'center' }} className="meta-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: FONT_MONO, fontSize: 11, fontWeight: 800, letterSpacing: '.14em', color: '#fff', background: GREEN, borderRadius: 999, padding: '6px 14px', marginBottom: 22 }}>
              👑 THE HOLY GRAIL · GOD MODE
            </div>
            <h1 style={{ fontSize: 'clamp(38px,6.4vw,72px)', fontWeight: 800, letterSpacing: '-.04em', lineHeight: .98, color: INK, fontFamily: FONT_DISPLAY, marginBottom: 18 }}>
              Adaptive<br />Regime-Switching.
            </h1>
            <p style={{ fontSize: 'clamp(16px,2vw,19px)', color: SUB, lineHeight: 1.6, maxWidth: 560, marginBottom: 28 }}>
              The variance-ratio gated breakout — the one that actually prints. Hedge-fund regime detection welded to a sniper breakout entry, refined trade-by-trade on a <b style={{ color: INK }}>live MNQ account</b> until the numbers were undeniable. Long and short.
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <button onClick={() => grail && selectAndScroll(grail.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: INK, color: BONE, fontWeight: 700, fontSize: 15, padding: '14px 28px', borderRadius: 12, border: 'none', cursor: 'pointer', minHeight: 44, fontFamily: FONT_DISPLAY }}>
                Deploy the Holy Grail →
              </button>
              <button onClick={() => scrollToGroup(groups[0]?.id ?? 'god')}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', color: INK, fontWeight: 700, fontSize: 15, padding: '14px 24px', borderRadius: 12, border: `1px solid ${LINE}`, cursor: 'pointer', minHeight: 44, fontFamily: FONT_DISPLAY }}>
                Browse all {ALGORITHMS.length} algorithms
              </button>
            </div>
          </div>

          {/* Flagship stat card */}
          <button onClick={() => grail && selectAndScroll(grail.id)}
            style={{ position: 'relative', overflow: 'hidden', textAlign: 'left', cursor: 'pointer', borderRadius: 22, padding: 'clamp(24px,3vw,32px)', background: INK, border: `1px solid ${INK}`, boxShadow: '0 30px 70px rgba(10,10,12,.22)', minHeight: 44 }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, transparent 30%, rgba(10,157,99,.18) 50%, transparent 70%)', backgroundSize: '250% 100%', animation: 'sheen 5.5s linear infinite', pointerEvents: 'none' }} />
            <div style={{ position: 'relative' }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: '.2em', color: '#6ee7b7', fontFamily: FONT_MONO, marginBottom: 18 }}>⚡ MNQ 5-MIN · REAL ACCOUNT</div>
              <div className="grail-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                {[['≈80%', 'WIN RATE'], ['≈5.0', 'PROFIT FACTOR'], ['~10', 'TRADES / MO'], ['L/S', 'LONG + SHORT']].map(([v, l]) => (
                  <div key={l} style={{ background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '18px 14px' }}>
                    <div style={{ fontSize: 'clamp(26px,4vw,38px)', fontWeight: 800, color: '#fff', lineHeight: 1, letterSpacing: '-.03em', fontFamily: FONT_DISPLAY }}>{v}</div>
                    <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '.12em', color: 'rgba(255,255,255,.55)', marginTop: 9, fontFamily: FONT_MONO }}>{l}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 18, fontSize: 11, color: 'rgba(255,255,255,.4)', lineHeight: 1.55, fontFamily: FONT_MONO }}>
                * Real-account sample. At ~10 trades/mo stats scatter month-to-month. Past performance ≠ future results.
              </div>
            </div>
          </button>
        </div>
      </header>

      {/* STICKY NAVIGATOR */}
      <div style={{ position: 'sticky', top: 62, zIndex: 90, background: 'rgba(244,242,236,.92)', backdropFilter: 'blur(10px)', borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}` }}>
        <div className="navtabs" style={{ maxWidth: 1120, margin: '0 auto', padding: '0 16px', display: 'flex', gap: 4, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {navItems.map(item => {
            const isActive = item.id === activeGroup || (item.id === 'lab' && activeGroup === 'lab')
            return (
              <button
                key={item.id}
                onClick={() => item.id === 'lab' ? document.getElementById('lab')?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }) : scrollToGroup(item.id as GroupId)}
                style={{
                  position: 'relative', padding: '15px 16px', minHeight: 48, whiteSpace: 'nowrap', cursor: 'pointer',
                  background: 'transparent', border: 'none', outline: 'none',
                  fontSize: 13.5, fontWeight: isActive ? 700 : 600,
                  color: isActive ? INK : SUB, fontFamily: FONT_DISPLAY, transition: 'color .18s',
                }}
              >
                {item.label}
                {isActive && <span style={{ position: 'absolute', left: 16, right: 16, bottom: 0, height: 2, background: ACCENT, borderRadius: 2 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* GROUPS */}
      <main style={{ maxWidth: 1120, margin: '0 auto', padding: 'clamp(40px,5vw,64px) 24px 0' }}>
        {groups.map(group => (
          <section key={group.id} id={'group-' + group.id} style={{ marginBottom: 'clamp(48px,6vw,80px)', scrollMarginTop: 124 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: group.accent, fontFamily: FONT_MONO }}>{group.kicker}</span>
              <span style={{ fontSize: 11, color: SUB, fontFamily: FONT_MONO }}>{group.algos.length} {group.algos.length === 1 ? 'strategy' : 'strategies'}</span>
            </div>
            <h2 style={{ fontSize: 'clamp(26px,4vw,40px)', fontWeight: 800, letterSpacing: '-.03em', color: INK, fontFamily: FONT_DISPLAY, lineHeight: 1.05, marginBottom: 12 }}>{group.title}</h2>
            <p style={{ fontSize: 15.5, color: SUB, lineHeight: 1.65, maxWidth: 720, marginBottom: 26 }}>{group.blurb}</p>
            <div className="algo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
              {group.algos.map(a => (
                <AlgoCard key={a.id} algo={a} selected={selectedId === a.id} onSelect={() => selectAndScroll(a.id)} />
              ))}
            </div>
          </section>
        ))}

        {/* MONTE CARLO LAB */}
        <MonteCarloLab onSelect={selectAndScroll} />
      </main>

      {/* DETAIL */}
      <section ref={detailRef} style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px clamp(56px,7vw,96px)', scrollMarginTop: 124 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.14em', color: ACCENT, fontFamily: FONT_MONO, marginBottom: 16 }}>// NOW VIEWING</div>
        <DetailPanel algo={algo} mode={mode} setMode={setMode} platform={platform} setPlatform={setPlatform} />
      </section>

      {/* BOTTOM CTA */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '0 24px clamp(80px,10vw,120px)' }}>
        <div style={{ background: INK, borderRadius: 24, padding: 'clamp(36px,5vw,56px) clamp(28px,4vw,44px)', textAlign: 'center', color: BONE }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.16em', color: '#6ee7b7', fontFamily: FONT_MONO, marginBottom: 18 }}>// LEARN THE STRATEGY BEHIND THE CODE</div>
          <h3 style={{ fontSize: 'clamp(24px,3.5vw,34px)', fontWeight: 800, letterSpacing: '-.03em', color: '#fff', marginBottom: 14, fontFamily: FONT_DISPLAY, lineHeight: 1.1 }}>
            Understand why it works — not just how to copy it.
          </h3>
          <p style={{ fontSize: 15.5, color: 'rgba(255,255,255,.62)', lineHeight: 1.7, marginBottom: 32, maxWidth: 540, marginLeft: 'auto', marginRight: 'auto' }}>
            The algorithms are free. The courses teach you when NOT to trade, what to do when an edge stops working, and how to think like the trader who built it.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: BONE, color: INK, fontWeight: 700, fontSize: 14.5, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', minHeight: 44, fontFamily: FONT_DISPLAY }}>
              Browse Courses →
            </Link>
            <Link href="/pricing" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: '1px solid rgba(255,255,255,.22)', color: '#fff', fontWeight: 700, fontSize: 14.5, padding: '14px 28px', borderRadius: 12, textDecoration: 'none', minHeight: 44, fontFamily: FONT_DISPLAY }}>
              See Pricing →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
