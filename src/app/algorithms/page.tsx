'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { YNMark } from '@/components/YNLogo'
import { ALGORITHMS, type AlgoMode, type Platform } from './data'
import { MONTE_CARLO, MONTE_CARLO_META } from './montecarlo'

// ── Bloomberg-style terminal chrome ───────────────────────────────────────────
function TerminalClock() {
  const [t, setT] = useState('')
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString('en-US', { hour12: false }) + ' ET')
    f()
    const id = setInterval(f, 1000)
    return () => clearInterval(id)
  }, [])
  return <span>{t || '--:--:--'}</span>
}

function CommandBar() {
  return (
    <div style={{ background: '#000', borderBottom: '1px solid #2a2410', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 14, fontFamily: 'ui-monospace,monospace', fontSize: 12, color: '#ff9e1b', flexWrap: 'wrap' }}>
      <span style={{ fontWeight: 800, letterSpacing: '.08em' }}>YN&lt;GO&gt;</span>
      <span style={{ color: '#ffc35c' }}>ALGO</span>
      <span style={{ color: '#5a5230' }}>·</span>
      <span style={{ color: '#8a7e50' }}>QUANT DESK</span>
      <span style={{ width: 7, height: 13, background: '#ff9e1b', display: 'inline-block', animation: 'bbg-blink 1s step-end infinite' }} />
      <span style={{ marginLeft: 'auto', display: 'flex', gap: 14, alignItems: 'center' }}>
        <span style={{ color: '#33ff99' }}>● MKT OPEN</span>
        <span style={{ color: '#ffc35c' }}><TerminalClock /></span>
      </span>
    </div>
  )
}

const BBG_TICKS: [string, string, string, boolean][] = [
  ['ES1', '5402.50', '+0.38%', true], ['NQ1', '19180.0', '+0.71%', true], ['SPX', '5398.11', '+0.40%', true],
  ['NVDA', '131.74', '+2.18%', true], ['AAPL', '214.05', '-0.32%', false], ['TSLA', '248.90', '+1.74%', true],
  ['BTC', '71420', '-1.12%', false], ['ETH', '3884', '+0.88%', true], ['GC1', '2388.4', '-0.22%', false],
  ['CL1', '78.40', '+0.95%', true], ['EURUSD', '1.0842', '-0.11%', false], ['VIX', '13.21', '-3.40%', false],
]
function TickerTape() {
  const [ticks, setTicks] = useState<[string, string, string, boolean][]>(BBG_TICKS)
  useEffect(() => {
    let alive = true
    const load = () =>
      fetch('/api/market')
        .then((r) => r.json())
        .then((d: { quotes?: { symbol: string; price: number; changePercent: number }[] }) => {
          if (!alive || !d.quotes?.length) return
          setTicks(
            d.quotes.map(
              (q) =>
                [q.symbol, Number(q.price).toFixed(2), (q.changePercent >= 0 ? '+' : '') + Number(q.changePercent).toFixed(2) + '%', q.changePercent >= 0] as [string, string, string, boolean]
            )
          )
        })
        .catch(() => {})
    load()
    const id = setInterval(load, 30000)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [])
  return (
    <div style={{ background: '#000', borderBottom: '1px solid #141414', overflow: 'hidden', fontFamily: 'ui-monospace,monospace' }}>
      <div style={{ display: 'flex', gap: 28, whiteSpace: 'nowrap', padding: '5px 0', width: 'max-content', animation: 'bbg-mq 44s linear infinite' }}>
        {[...ticks, ...ticks, ...ticks].map((t, i) => (
          <span key={i} style={{ fontSize: 12 }}>
            <span style={{ color: '#cfc79a', fontWeight: 700 }}>{t[0]}</span>{' '}
            <span style={{ color: '#9a9a9a' }}>{t[1]}</span>{' '}
            <span style={{ color: t[3] ? '#33ff99' : '#ff5a5a' }}>{t[2]}</span>
          </span>
        ))}
      </div>
    </div>
  )
}

function FunctionKeys() {
  const keys = [['F1', 'HELP'], ['F2', 'MKT'], ['F3', 'NEWS'], ['F4', 'PORT'], ['F5', 'GRAPH'], ['F6', 'ALERT'], ['F7', 'BUY'], ['F8', 'SELL']]
  return (
    <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#000', borderTop: '1px solid #1a1a1a', display: 'flex', fontFamily: 'ui-monospace,monospace', fontSize: 11 }}>
      {keys.map(([k, l], i) => (
        <span key={k} style={{ flex: 1, textAlign: 'center', padding: '6px 4px', borderRight: i < 7 ? '1px solid #141414' : 'none', color: '#7a7a7a' }}>
          <span style={{ color: '#ff9e1b', fontWeight: 700 }}>{k}</span> {l}
        </span>
      ))}
    </div>
  )
}

// ── Copy button ───────────────────────────────────────────────────────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }}
      style={{
        padding: '7px 18px', borderRadius: 8, fontSize: 12, fontWeight: 700,
        fontFamily: 'monospace', letterSpacing: '0.06em', cursor: 'pointer',
        border: '1px solid rgba(0,212,170,.4)',
        background: copied ? 'rgba(0,212,170,.2)' : 'rgba(0,212,170,.08)',
        color: copied ? '#00d4aa' : '#00d4aa',
        transition: 'all .2s',
      }}
    >
      {copied ? '✓ Copied!' : '⎘ Copy Code'}
    </button>
  )
}

// ── NinjaTrader mark (original shuriken artwork) ───────────────────────────────
function NinjaMark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="NinjaTrader" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#0b1220" stroke="#2bd17e" strokeWidth="1.5" />
      <path d="M12 2.5 L14.1 9.9 L21.5 12 L14.1 14.1 L12 21.5 L9.9 14.1 L2.5 12 L9.9 9.9 Z" fill="#2bd17e" />
      <circle cx="12" cy="12" r="1.7" fill="#0b1220" />
    </svg>
  )
}

// ── Code block ────────────────────────────────────────────────────────────────
function CodeBlock({ code, lang = 'pine' }: { code: string; lang?: string }) {
  // Minimal syntax coloring via spans — works without a library
  const highlighted = code
    .replace(/\/\/.*/g, m => `<span style="color:#4a6a78;font-style:italic">${m}</span>`)
    .replace(/\b(strategy|indicator|input|ta|plot|plotshape|bgcolor|alertcondition|hline|var|if|and|or|not|true|false|na)\b/g,
      m => `<span style="color:#c792ea">${m}</span>`)
    .replace(/\b(float|int|bool|string|series|simple)\b/g,
      m => `<span style="color:#82aaff">${m}</span>`)
    .replace(/"([^"]*)"/g,
      (_, s) => `<span style="color:#c3e88d">"${s}"</span>`)
    .replace(/\b(\d+\.?\d*)\b/g,
      m => `<span style="color:#f78c6c">${m}</span>`)

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(255,255,255,.08)' }}>
      {/* Header bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
        <span style={{ fontSize: 11, color: '#4a6a78', fontFamily: 'monospace', letterSpacing: '0.1em' }}>
          {lang === 'pine' ? '📊 PINE SCRIPT v5 — TRADINGVIEW' : lang === 'mql5' ? '⚙️ MQL5 — METATRADER 5' : lang === 'csharp' ? '⚙️ C# — NINJATRADER 8' : '📋 CODE'}
        </span>
        <CopyButton text={code} />
      </div>
      {/* Code */}
      <pre
        style={{
          margin: 0, padding: '20px', overflowX: 'auto', overflowY: 'auto',
          maxHeight: 520, background: '#090f1a',
          fontFamily: '"JetBrains Mono","Fira Code","SF Mono",ui-monospace,monospace',
          fontSize: 12.5, lineHeight: 1.7, color: '#c8dce8',
        }}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  )
}

// ── Step guide ────────────────────────────────────────────────────────────────
function StepGuide({ steps }: { steps: string[] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {steps.map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', padding: '16px 20px', background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 12 }}>
          <div style={{ flexShrink: 0, width: 28, height: 28, borderRadius: 8, background: 'rgba(0,212,170,.12)', border: '1px solid rgba(0,212,170,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: '#00d4aa', fontFamily: 'monospace' }}>
            {String(i + 1).padStart(2, '0')}
          </div>
          <p style={{ fontSize: 14, color: '#b0c8d8', lineHeight: 1.65, margin: 0 }}>{step}</p>
        </div>
      ))}
    </div>
  )
}

// ── Monte Carlo Lab leaderboard ────────────────────────────────────────────────
function MonteCarloLab({ onSelect }: { onSelect: (id: string) => void }) {
  const pc = (x: number) => (x * 100).toFixed(1) + '%'
  const f2 = (x: number) => x.toFixed(2)
  const medal = ['🥇', '🥈', '🥉']
  const cols = ['#00d4aa', '#1e90ff', '#a855f7']
  const top = MONTE_CARLO.slice(0, 3)

  return (
    <div style={{ padding: '0 24px 56px', maxWidth: 1100, margin: '0 auto' }} id="montecarlo">
      <div style={{ border: '1px solid rgba(0,212,170,.22)', borderRadius: 20, overflow: 'hidden', background: 'linear-gradient(180deg,rgba(0,212,170,.05),rgba(255,255,255,.015))' }}>
        {/* Header */}
        <div style={{ padding: '26px 32px 22px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#00d4aa', fontFamily: 'monospace', marginBottom: 10 }}>
            🎲 MONTE CARLO LAB · QUANT DESK
          </div>
          <h2 style={{ fontSize: 'clamp(22px,3.4vw,32px)', fontWeight: 900, letterSpacing: '-0.6px', color: '#e8f4f8', marginBottom: 10 }}>
            We simulated {MONTE_CARLO.length} robust strategies through {MONTE_CARLO_META.trials.toLocaleString()} prop challenges each.
          </h2>
          <p style={{ fontSize: 14.5, color: '#6a90a8', lineHeight: 1.7, maxWidth: 760 }}>
            Each strategy was run through a Monte Carlo of an FTMO-style evaluation —
            <b style={{ color: '#9fc4d6' }}> {pc(MONTE_CARLO_META.riskPct)} risk/trade</b>, pass at
            <b style={{ color: '#33ff99' }}> +{pc(MONTE_CARLO_META.profitTarget)}</b>, bust at
            <b style={{ color: '#ff6b6b' }}> −{pc(MONTE_CARLO_META.maxDrawdown)}</b> trailing, over a {MONTE_CARLO_META.maxTrades}-trade window —
            with a live edge haircut (slippage, missed fills, regime drift) applied to every strategy first.
            Ranked by a composite of pass rate, expectancy, and risk of ruin.
          </p>
        </div>

        {/* Podium */}
        <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, padding: '22px 32px', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
          {top.map((r, i) => (
            <button key={r.id} onClick={() => onSelect(r.id)} style={{ textAlign: 'left', cursor: 'pointer', background: `${cols[i]}0c`, border: `1px solid ${cols[i]}3a`, borderRadius: 14, padding: '16px 18px', transition: 'all .2s' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <span style={{ fontSize: 22 }}>{medal[i]}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: cols[i], fontFamily: 'monospace', letterSpacing: '0.08em', background: `${cols[i]}18`, border: `1px solid ${cols[i]}33`, borderRadius: 5, padding: '2px 8px' }}>SCORE {f2(r.score)}</span>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#e8f4f8', marginBottom: 8, lineHeight: 1.25 }}>{r.name}</div>
              <div style={{ display: 'flex', gap: 14, fontSize: 12, fontFamily: 'monospace' }}>
                <span style={{ color: '#33ff99' }}>{pc(r.passRate)} pass</span>
                <span style={{ color: '#9fc4d6' }}>{f2(r.expR)}R/trade</span>
                <span style={{ color: '#ff8a8a' }}>{pc(r.bustRate)} ruin</span>
              </div>
            </button>
          ))}
        </div>

        {/* Full table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace,monospace', fontSize: 12.5, minWidth: 720 }}>
            <thead>
              <tr style={{ color: '#4a6a7a', textAlign: 'right' }}>
                {['#', 'STRATEGY', 'WIN*', 'R*', 'EXP(R)', 'PASS%', 'RUIN%', 'MED-RET', 'P95-DD', 'SCORE'].map((h, i) => (
                  <th key={h} style={{ padding: '12px 16px', fontWeight: 700, letterSpacing: '0.06em', fontSize: 10, textAlign: i === 1 ? 'left' : 'right', borderBottom: '1px solid rgba(255,255,255,.08)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MONTE_CARLO.map(r => {
                const color = ALGORITHMS.find(a => a.id === r.id)?.color ?? '#6a90a8'
                const passCol = r.passRate >= 0.8 ? '#33ff99' : r.passRate >= 0.7 ? '#ffc35c' : '#ff8a8a'
                return (
                  <tr key={r.id} onClick={() => onSelect(r.id)} style={{ cursor: 'pointer', textAlign: 'right', borderBottom: '1px solid rgba(255,255,255,.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,.03)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '11px 16px', color: r.rank <= 3 ? '#00d4aa' : '#5a7a8a', fontWeight: 800 }}>{r.rank}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'left' }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: color, marginRight: 9, verticalAlign: 'middle' }} />
                      <span style={{ color: '#dceaf2', fontWeight: 600 }}>{r.name}</span>
                    </td>
                    <td style={{ padding: '11px 16px', color: '#9fc4d6' }}>{f2(r.win)}</td>
                    <td style={{ padding: '11px 16px', color: '#9fc4d6' }}>{f2(r.R)}</td>
                    <td style={{ padding: '11px 16px', color: '#c8dce8', fontWeight: 700 }}>{f2(r.expR)}</td>
                    <td style={{ padding: '11px 16px', color: passCol, fontWeight: 700 }}>{pc(r.passRate)}</td>
                    <td style={{ padding: '11px 16px', color: '#ff8a8a' }}>{pc(r.bustRate)}</td>
                    <td style={{ padding: '11px 16px', color: '#8aacbc' }}>{pc(r.medReturn)}</td>
                    <td style={{ padding: '11px 16px', color: '#8aacbc' }}>{pc(r.p95MaxDD)}</td>
                    <td style={{ padding: '11px 16px', color: '#00d4aa', fontWeight: 800 }}>{f2(r.score)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Footnote */}
        <div style={{ padding: '14px 32px 20px', fontSize: 11.5, color: '#4a6a7a', lineHeight: 1.65 }}>
          * WIN / R are post-haircut (the values actually simulated), not the advertised targets. These are model
          assumptions, not live backtests — validate each strategy on 6–12 months of real data before trading a funded
          account. Re-run <span style={{ color: '#7a9aaa' }}>scripts/montecarlo-algos.mjs</span> to refresh.
          Generated {MONTE_CARLO_META.generated}.
        </div>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AlgorithmsPage() {
  const [selectedId, setSelectedId]   = useState('ict')
  const [mode,       setMode]         = useState<AlgoMode>('auto')
  const [platform,   setPlatform]     = useState<Platform>('tradingview')
  const detailRef = useRef<HTMLDivElement>(null)

  const algo = ALGORITHMS.find(a => a.id === selectedId) ?? ALGORITHMS[0]

  const code = mode === 'auto'
    ? (platform === 'ninjatrader'
        ? (algo.auto.ninjatrader ?? algo.auto.tradingview)
        : platform === 'mt5' ? algo.auto.mt5 : algo.auto.tradingview)
    : algo.signals.tradingview

  const steps = mode === 'auto'
    ? (platform === 'ninjatrader' && algo.auto.ninjaSteps ? algo.auto.ninjaSteps : algo.auto.steps)
    : algo.signals.steps

  // Scroll to detail when strategy changes
  useEffect(() => {
    if (detailRef.current) {
      setTimeout(() => detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100)
    }
  }, [selectedId])

  // Indicator-only entries have no auto-trade build — force the indicator view
  useEffect(() => {
    setMode(ALGORITHMS.find(a => a.id === selectedId)?.indicatorOnly ? 'signals' : 'auto')
  }, [selectedId])

  // If the selected strategy has no NinjaTrader build, fall back to TradingView
  useEffect(() => {
    if (platform === 'ninjatrader' && !algo.auto.ninjatrader) setPlatform('tradingview')
  }, [selectedId, platform, algo.auto.ninjatrader])

  return (
    <div style={{ background: '#05060a', minHeight: '100vh', color: '#e8f4f8', fontFamily: 'ui-monospace, "JetBrains Mono", Menlo, monospace', paddingBottom: 38 }}>
      <style>{`
        @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        @keyframes pulse  { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.3)} }
        @keyframes bbg-mq { from{transform:translateX(0)} to{transform:translateX(-50%)} }
        @keyframes bbg-blink { 0%,100%{opacity:1} 50%{opacity:0} }
        * { box-sizing:border-box; margin:0; padding:0 }
        ::selection { background:#00d4aa30 }
        pre::-webkit-scrollbar { width:6px; height:6px }
        pre::-webkit-scrollbar-track { background:#060d18 }
        pre::-webkit-scrollbar-thumb { background:#1e3250; border-radius:3px }
        @media(max-width:900px) { .algo-grid{grid-template-columns:repeat(2,1fr)!important} .meta-grid{grid-template-columns:1fr 1fr!important} }
        @media(max-width:600px) { .algo-grid{grid-template-columns:1fr!important} .meta-grid{grid-template-columns:1fr!important} }
      `}</style>

      <CommandBar />
      <TickerTape />

      {/* NAV */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(5,6,10,.96)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,.07)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <YNMark size={28} glow />
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>YN Finance</span>
          </Link>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,.12)' }} />
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em', color: '#00d4aa', fontFamily: 'monospace' }}>ALGORITHMS</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: '#00d4aa', background: 'rgba(0,212,170,.1)', border: '1px solid rgba(0,212,170,.3)', borderRadius: 6, padding: '3px 10px', fontFamily: 'monospace', letterSpacing: '0.1em' }}>FREE</span>
        </div>
      </nav>

      {/* HERO */}
      <div style={{ padding: '80px 24px 60px', maxWidth: 900, margin: '0 auto', textAlign: 'center', animation: 'fadeUp .6s ease both' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#00d4aa', fontFamily: 'monospace', marginBottom: 18 }}>
          REAL ALGORITHMS · BUILT FROM COURSE STRATEGIES · PROP FIRM READY
        </div>
        <h1 style={{ fontSize: 'clamp(36px,6vw,64px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.0, color: '#e8f4f8', marginBottom: 20 }}>
          Stop trading manually.<br />
          <span style={{ background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
            Let the algorithm trade for you.
          </span>
        </h1>
        <p style={{ fontSize: 17, color: '#4a6a78', lineHeight: 1.75, maxWidth: 620, margin: '0 auto 32px' }}>
          Every strategy from every YN Finance instructor — converted into working code you can paste directly into TradingView or MetaTrader 5. Auto-trade your prop firm challenge, or get precise signals with exact entry, stop, and target prices.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {[['✓ Real Pine Script & MQL5','#00d4aa'],['✓ Prop Firm Risk Rules Built-In','#1e90ff'],['✓ Step-by-Step Platform Guide','#a855f7'],['✓ Free Forever','#f59e0b']].map(([text, color]) => (
            <div key={text as string} style={{ fontSize: 12, color: color as string, background: `${color as string}10`, border: `1px solid ${color as string}25`, borderRadius: 8, padding: '6px 14px', fontWeight: 600 }}>
              {text as string}
            </div>
          ))}
        </div>
      </div>

      {/* STRATEGY SELECTOR */}
      <div style={{ padding: '0 24px 48px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#4a6a7a', fontFamily: 'monospace', marginBottom: 20, textAlign: 'center' }}>
          SELECT A STRATEGY · ⚡ GOD MODE (RESEARCH-GRADE QUANT) SHOWN FIRST
        </div>
        <div className="algo-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
          {[...ALGORITHMS].sort((a, b) => (b.god ? 1 : 0) - (a.god ? 1 : 0)).map(a => {
            const isSelected = selectedId === a.id
            return (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                style={{
                  padding: '20px 16px', borderRadius: 16, cursor: 'pointer', textAlign: 'left',
                  background: isSelected ? `${a.color}10` : 'rgba(255,255,255,.025)',
                  border: `1px solid ${isSelected ? a.color + '50' : 'rgba(255,255,255,.07)'}`,
                  transition: 'all .2s', outline: 'none',
                  boxShadow: isSelected ? `0 0 24px ${a.color}20` : 'none',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${a.color}18`, border: `1px solid ${a.color}35`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: a.color, fontFamily: 'monospace' }}>
                    {a.init}
                  </div>
                  {a.god && <span style={{ fontSize: 8.5, fontWeight: 900, letterSpacing: '0.1em', color: '#040c14', background: `linear-gradient(135deg, ${a.color}, #fff)`, borderRadius: 5, padding: '3px 7px', fontFamily: 'monospace', boxShadow: `0 0 14px ${a.color}66` }}>⚡ GOD MODE</span>}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: isSelected ? '#e8f4f8' : '#7a9aaa', marginBottom: 4, lineHeight: 1.3 }}>{a.instructor.split('(')[0].trim()}</div>
                <div style={{ fontSize: 11, color: isSelected ? a.color : '#3a5a6a', fontFamily: 'monospace', lineHeight: 1.4 }}>{a.strategy.split('—')[0].trim()}</div>
                <div style={{ display: 'inline-block', marginTop: 10, fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', color: a.color, background: `${a.color}12`, border: `1px solid ${a.color}28`, borderRadius: 5, padding: '2px 7px', fontFamily: 'monospace' }}>{a.assets[0]}</div>
                {isSelected && <div style={{ width: '100%', height: 2, background: a.color, borderRadius: 1, marginTop: 12 }} />}
              </button>
            )
          })}
        </div>
      </div>

      {/* MONTE CARLO LAB */}
      <MonteCarloLab onSelect={setSelectedId} />

      {/* DETAIL PANEL */}
      <div ref={detailRef} style={{ padding: '0 24px 80px', maxWidth: 1100, margin: '0 auto', scrollMarginTop: 80 }}>
        <div style={{ border: `1px solid ${algo.color}30`, borderRadius: 20, overflow: 'hidden', background: 'rgba(255,255,255,.02)' }}>

          {/* Strategy header */}
          <div style={{ padding: '32px 36px', borderBottom: '1px solid rgba(255,255,255,.06)', background: `${algo.color}06` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${algo.color},${algo.color}88)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>{algo.init}</div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: algo.color, fontFamily: 'monospace', letterSpacing: '0.14em' }}>{algo.instructor.toUpperCase()}</span>
                  {algo.god && <span style={{ fontSize: 10, fontWeight: 900, letterSpacing: '0.12em', color: '#040c14', background: `linear-gradient(135deg, ${algo.color}, #fff)`, borderRadius: 6, padding: '3px 10px', fontFamily: 'monospace', boxShadow: `0 0 18px ${algo.color}66` }}>⚡ GOD MODE</span>}
                </div>
                <h2 style={{ fontSize: 'clamp(20px,3vw,30px)', fontWeight: 900, color: '#e8f4f8', letterSpacing: '-0.5px', marginBottom: 8 }}>{algo.strategy}</h2>
                <p style={{ fontSize: 15, color: '#6a90a8', lineHeight: 1.6 }}>{algo.tagline}</p>
              </div>

              {/* Quick stats */}
              <div className="meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10, minWidth: 260 }}>
                {[
                  { label: 'Assets',         value: algo.assets.join(', ') },
                  { label: 'Timeframes',     value: algo.timeframes.join(', ') },
                  { label: 'Win Rate Target',value: algo.winTarget },
                  { label: 'Risk / Trade',   value: algo.riskPerTrade },
                ].map(s => (
                  <div key={s.label} style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ fontSize: 9, color: '#4a6a7a', fontFamily: 'monospace', letterSpacing: '0.1em', marginBottom: 4 }}>{s.label.toUpperCase()}</div>
                    <div style={{ fontSize: 13, color: '#c8dce8', fontWeight: 600 }}>{s.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ padding: '32px 36px' }}>

            {/* Overview */}
            <div style={{ marginBottom: 32, padding: '20px 24px', background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)', borderRadius: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#4a6a7a', fontFamily: 'monospace', marginBottom: 10 }}>HOW IT WORKS</div>
              <p style={{ fontSize: 14, color: '#8aacbc', lineHeight: 1.75 }}>{algo.overview}</p>
            </div>

            {/* Prop firm note */}
            <div style={{ marginBottom: 32, padding: '20px 24px', background: `${algo.color}08`, border: `1px solid ${algo.color}25`, borderRadius: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: algo.color, fontFamily: 'monospace', marginBottom: 10 }}>🏦 PROP FIRM NOTES</div>
              <p style={{ fontSize: 14, color: '#8aacbc', lineHeight: 1.75 }}>{algo.propNotes}</p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
                {algo.propFirms.map(firm => (
                  <span key={firm} style={{ fontSize: 11, color: algo.color, background: `${algo.color}12`, border: `1px solid ${algo.color}25`, borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>{firm}</span>
                ))}
              </div>
            </div>

            {/* Mode + Platform toggles */}
            <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#4a6a7a', fontFamily: 'monospace', marginBottom: 10 }}>ALGORITHM TYPE</div>
                <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, overflow: 'hidden' }}>
                  {(algo.indicatorOnly ? [['signals','📊 Indicator','Visual markup only']] as const : [['auto','🤖 Auto-Trade','For prop firm auto-execution'],['signals','📡 Signal Alerts','For manual execution']] as const).map(([m, label]) => (
                    <button key={m} onClick={() => setMode(m)} style={{ padding: '11px 22px', cursor: 'pointer', border: 'none', outline: 'none', transition: 'all .2s', background: mode === m ? algo.color : 'rgba(255,255,255,.03)', color: mode === m ? '#030a10' : '#6a90a8', fontWeight: mode === m ? 800 : 600, fontSize: 13 }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'auto' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#4a6a7a', fontFamily: 'monospace', marginBottom: 10 }}>PLATFORM</div>
                  <div style={{ display: 'flex', gap: 0, border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, overflow: 'hidden' }}>
                    {(algo.auto.ninjatrader
                      ? [['tradingview', 'TradingView'], ['mt5', 'MetaTrader 5'], ['ninjatrader', 'NinjaTrader 8']]
                      : [['tradingview', 'TradingView (Pine Script)'], ['mt5', 'MetaTrader 5 (MQL5)']]
                    ).map(([p, label]) => (
                      <button key={p} onClick={() => setPlatform(p as Platform)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '11px 20px', cursor: 'pointer', border: 'none', outline: 'none', transition: 'all .2s', background: platform === p ? (p === 'ninjatrader' ? '#0b1220' : '#1e3250') : 'rgba(255,255,255,.03)', color: platform === p ? '#e8f4f8' : '#6a90a8', fontWeight: platform === p ? 700 : 500, fontSize: 13, borderRight: '1px solid rgba(255,255,255,.08)' }}>
                        {p === 'ninjatrader' ? <NinjaMark size={15} /> : null}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mode description */}
            <div style={{ marginBottom: 20, fontSize: 13, color: '#4a6a7a', padding: '10px 14px', background: 'rgba(255,255,255,.02)', borderRadius: 8, borderLeft: `3px solid ${algo.color}40` }}>
              {mode === 'auto'
                ? platform === 'tradingview'
                  ? '📊 Paste this into TradingView\'s Pine Script Editor. The strategy auto-executes via TradingView broker integrations or webhooks (webhooks need a paid TradingView plan).'
                  : platform === 'mt5'
                  ? '⚙️ Compile this in MetaEditor (comes with MT5). Attach the EA to your chart and enable AutoTrading. Works with any MT5 broker.'
                  : '🥷 Compile this in NinjaTrader 8 (NinjaScript Editor → F5). Add it to an MES chart and enable it — auto-executes on your prop futures account with no TradingView, no webhook and no monthly fee.'
                : '📡 This is an indicator (not a strategy). Add it to your chart — it displays arrows and fires alerts with exact entry, SL, and TP prices. You execute the trade manually.'}
            </div>

            {/* Code block */}
            <div style={{ marginBottom: 36 }}>
              <CodeBlock
                code={code}
                lang={mode === 'auto' ? (platform === 'mt5' ? 'mql5' : platform === 'ninjatrader' ? 'csharp' : 'pine') : 'pine'}
              />
            </div>

            {/* Step guide */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: '#e8f4f8', fontFamily: 'monospace', marginBottom: 16 }}>
                📋 STEP-BY-STEP: HOW TO USE THIS ON YOUR PROP FIRM ACCOUNT
              </div>
              <StepGuide steps={steps} />
            </div>

          </div>
        </div>
      </div>

      {/* BOTTOM CTA */}
      <div style={{ padding: '0 24px 100px', maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ background: 'linear-gradient(135deg,rgba(0,212,170,.06),rgba(30,144,255,.05))', border: '1px solid rgba(0,212,170,.2)', borderRadius: 20, padding: '52px 40px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.2em', color: '#00d4aa', fontFamily: 'monospace', marginBottom: 18 }}>LEARN THE STRATEGY BEHIND THE CODE</div>
          <h3 style={{ fontSize: 26, fontWeight: 900, letterSpacing: '-0.5px', color: '#e8f4f8', marginBottom: 14 }}>
            Understand why the algorithm works — not just how to copy it.
          </h3>
          <p style={{ fontSize: 15, color: '#4a6a78', lineHeight: 1.7, marginBottom: 36 }}>
            The algorithms are free. The courses teach you when NOT to trade, what to do when the algorithm stops working, and how to think like the instructor who built the strategy. $0.99 per course.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/courses" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'linear-gradient(135deg,#00d4aa,#1e90ff)', color: '#030a10', fontWeight: 800, fontSize: 14, padding: '13px 28px', borderRadius: 10, textDecoration: 'none', boxShadow: '0 0 24px rgba(0,212,170,.2)' }}>
              Browse Courses →
            </Link>
            <Link href="/agents" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', color: '#e8f4f8', fontWeight: 700, fontSize: 14, padding: '13px 28px', borderRadius: 10, textDecoration: 'none' }}>
              Open Agent Network →
            </Link>
          </div>
        </div>
      </div>
      <FunctionKeys />
    </div>
  )
}
