'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

const C = { bg: '#04060c', ink: '#eaf2ff', dim: '#6b7a93', blue: '#5b8cff', green: '#10d693', amber: '#f5b14b', line: 'rgba(255,255,255,.08)', card: 'rgba(255,255,255,.025)' }

// ── deterministic candles for the mock chart (no hydration mismatch) ──────────
const CANDLES = [
  [40, 18, 6], [44, 22, 5], [38, 26, 7], [50, 20, 4], [46, 30, 6], [58, 24, 5], [52, 34, 8], [64, 28, 5],
  [60, 40, 6], [70, 34, 4], [66, 46, 7], [76, 40, 5], [72, 52, 6], [68, 58, 8], [80, 50, 4], [74, 62, 7],
  [86, 56, 5], [82, 66, 6], [92, 60, 4], [88, 70, 7], [96, 64, 5], [90, 76, 8], [102, 68, 4], [98, 80, 6],
].map((c, i) => ({ x: 28 + i * 19, top: 120 - c[0], bot: 120 - c[1], up: i % 3 !== 1 }))

function ChartMock() {
  return (
    <svg viewBox="0 0 500 300" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id="emaG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f5b14b" stopOpacity="0" /><stop offset="1" stopColor="#f5b14b" /></linearGradient>
        <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#10d693" stopOpacity=".18" /><stop offset="1" stopColor="#10d693" stopOpacity="0" /></linearGradient>
      </defs>
      {/* grid */}
      {[0, 1, 2, 3, 4].map((i) => <line key={'h' + i} x1="0" x2="500" y1={40 + i * 52} y2={40 + i * 52} stroke="rgba(255,255,255,.05)" />)}
      {/* candles */}
      {CANDLES.map((c, i) => (
        <g key={i} style={{ opacity: 0, animation: `candle .5s ease forwards ${i * 0.045}s` }}>
          <line x1={c.x + 5} x2={c.x + 5} y1={c.top - 18} y2={c.bot + 14} stroke={c.up ? '#10d693' : '#ef5a6a'} strokeWidth="1.5" />
          <rect x={c.x} y={Math.min(c.top, c.bot)} width="11" height={Math.max(6, Math.abs(c.top - c.bot))} rx="1.5" fill={c.up ? '#10d693' : '#ef5a6a'} />
        </g>
      ))}
      {/* EMA */}
      <path d="M28 96 C 120 88, 200 70, 280 58 S 430 40, 492 36" fill="none" stroke="url(#emaG)" strokeWidth="2.5" strokeDasharray="900" strokeDashoffset="900" style={{ animation: 'dash 2.2s ease forwards 1s' }} />
      {/* drawn level (the copilot's line) */}
      <g style={{ opacity: 0, animation: 'levelIn .6s ease forwards 2.2s' }}>
        <line x1="0" x2="500" y1="150" y2="150" stroke="#10d693" strokeWidth="1.6" strokeDasharray="7 5" />
        <rect x="8" y="141" width="118" height="18" rx="4" fill="#10d693" />
        <text x="15" y="154" fill="#04140c" fontSize="11" fontWeight="800" fontFamily="ui-monospace,monospace">SUPPORT 20,100</text>
      </g>
    </svg>
  )
}

const SCRIPT = [
  { you: 'draw support at 20,100', bot: 'Done — native line at 20,100. Watching for the bounce. 📏' },
  { you: 'write a 200 EMA indicator', bot: 'Opened Pine, pasted it, hit Add to chart. Compiled clean ✓ ⚡' },
  { you: "what's the trend here?", bot: 'Above the 200 EMA and holding — bias stays long while 20,100 holds. 🧭' },
]
function ChatMock() {
  const [i, setI] = useState(0)
  const [typed, setTyped] = useState('')
  const [showBot, setShowBot] = useState(false)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>
    const msg = SCRIPT[i].you
    setTyped(''); setShowBot(false)
    let k = 0
    const tick = () => { k++; setTyped(msg.slice(0, k)); if (k < msg.length) t = setTimeout(tick, 45); else { t = setTimeout(() => setShowBot(true), 500); t = setTimeout(() => setI((p) => (p + 1) % SCRIPT.length), 3600) } }
    t = setTimeout(tick, 400)
    return () => clearTimeout(t)
  }, [i])
  return (
    <div style={{ width: 250, background: 'linear-gradient(180deg,#0b0f1e,#070912)', border: '1px solid rgba(31,59,255,.4)', borderRadius: 14, boxShadow: '0 20px 50px rgba(0,0,0,.55)', overflow: 'hidden', fontFamily: 'ui-monospace,monospace' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 11px', borderBottom: '1px solid rgba(255,255,255,.08)' }}>
        <span style={{ width: 7, height: 7, borderRadius: 99, background: C.green, boxShadow: `0 0 8px ${C.green}` }} /><b style={{ fontSize: 12 }}>YN Copilot</b><span style={{ marginLeft: 'auto', fontSize: 10, color: C.dim }}>NQ1!</span>
      </div>
      <div style={{ padding: 11, display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120, fontFamily: 'Inter,system-ui,sans-serif' }}>
        <div style={{ alignSelf: 'flex-end', background: '#1f3bff', color: '#fff', fontSize: 12, padding: '7px 10px', borderRadius: 11, maxWidth: '85%' }}>{typed || '…'}<span style={{ opacity: typed.length < SCRIPT[i].you.length ? 1 : 0 }}>▍</span></div>
        {showBot && <div style={{ alignSelf: 'flex-start', background: 'rgba(31,59,255,.14)', border: '1px solid rgba(31,59,255,.22)', fontSize: 12, padding: '7px 10px', borderRadius: 11, maxWidth: '90%', animation: 'msgIn .3s ease' }}>{SCRIPT[i].bot}</div>}
      </div>
    </div>
  )
}

const DOES = [
  ['📏', 'Draws native lines', 'Real clicks place TradingView’s own horizontal lines at the exact price. Zero calibration.', C.green],
  ['⚡', 'Writes + tests indicators', 'Opens the Pine editor, pastes, hits Add to chart, reads compiler errors and auto-fixes them.', C.amber],
  ['🎙️', 'Talk or type', 'Speak to it or type. It can read the chart back to you out loud.', C.blue],
  ['🧭', 'Reads structure', 'Trend, key zones, what to watch — using the REAL price off your chart, not a proxy.', '#a855f7'],
  ['🔁', 'Runs routines', 'Save a per-symbol macro like “Morning levels” and fire it on open.', '#ec4899'],
  ['🔒', 'Only on TradingView', 'Dormant everywhere else. Lives in your browser, nothing in the cloud watching you.', '#06b6d4'],
]
const STEPS = [
  ['Download', 'Grab the .zip and unzip it.'],
  ['chrome://extensions', 'Open it, flip on Developer mode.'],
  ['Load unpacked', 'Pick the unzipped folder.'],
  ['Open a chart', 'It wakes on TradingView — or press ⌥Y.'],
]

export default function CopilotDesktop() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: 'Inter, system-ui, sans-serif', overflowX: 'hidden', position: 'relative' }}>
      <style>{`
        @keyframes candle{to{opacity:1}}
        @keyframes dash{to{stroke-dashoffset:0}}
        @keyframes levelIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1}}
        @keyframes floaty{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes orb{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(40px,-30px) scale(1.15)}}
        @keyframes gridmove{to{background-position:46px 46px}}
        @keyframes shimmer{to{background-position:200% center}}
        @keyframes risein{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:translateY(0)}}
        .rise{animation:risein .7s cubic-bezier(.16,1,.3,1) both}
        .card{transition:transform .25s, border-color .25s, box-shadow .25s}
        .card:hover{transform:translateY(-4px)}
        .mono{font-family:ui-monospace,Menlo,monospace}
        @media(max-width:860px){.collage{flex-direction:column!important}.heroGrid{grid-template-columns:1fr!important}}
      `}</style>

      {/* bg */}
      <div aria-hidden style={{ position: 'fixed', inset: 0, backgroundImage: `linear-gradient(rgba(255,255,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.04) 1px,transparent 1px)`, backgroundSize: '46px 46px', animation: 'gridmove 14s linear infinite', maskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%,#000,transparent 75%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 60% at 50% 0%,#000,transparent 75%)' }} />
      <div aria-hidden style={{ position: 'fixed', top: -120, left: -80, width: 420, height: 420, borderRadius: '50%', background: 'radial-gradient(circle,#1f3bff44,transparent 65%)', filter: 'blur(20px)', animation: 'orb 12s ease-in-out infinite' }} />
      <div aria-hidden style={{ position: 'fixed', bottom: -160, right: -100, width: 480, height: 480, borderRadius: '50%', background: 'radial-gradient(circle,#10d69333,transparent 65%)', filter: 'blur(20px)', animation: 'orb 16s ease-in-out infinite reverse' }} />

      <div style={{ position: 'relative', maxWidth: 1100, margin: '0 auto', padding: '24px clamp(18px,5vw,40px) 90px' }}>
        <Link href="/" className="mono" style={{ color: C.dim, fontSize: 12, textDecoration: 'none' }}>← yn finance</Link>

        {/* HERO */}
        <div className="heroGrid" style={{ display: 'grid', gridTemplateColumns: '1.05fr .95fr', gap: 'clamp(24px,5vw,56px)', alignItems: 'center', marginTop: 'clamp(30px,7vw,70px)' }}>
          <div className="rise">
            <div className="mono" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 800, letterSpacing: '.2em', color: C.green, border: `1px solid ${C.green}33`, background: `${C.green}10`, borderRadius: 99, padding: '6px 13px', marginBottom: 22 }}>
              <span style={{ width: 7, height: 7, borderRadius: 99, background: C.green, boxShadow: `0 0 8px ${C.green}` }} /> AGENT v4 · LIVES IN YOUR BROWSER
            </div>
            <h1 style={{ fontSize: 'clamp(38px,6.6vw,68px)', fontWeight: 900, letterSpacing: '-2.5px', lineHeight: 1.0, margin: '0 0 20px', background: 'linear-gradient(110deg,#fff 10%,#5b8cff 45%,#10d693 75%,#fff 110%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', animation: 'shimmer 6s linear infinite' }}>
              A real AI agent that trades the chart with you.
            </h1>
            <p style={{ fontSize: 'clamp(15px,1.8vw,18px)', color: '#92a3bd', lineHeight: 1.65, maxWidth: 480, marginBottom: 30 }}>
              It wakes up inside TradingView and <b style={{ color: C.ink }}>sees your chart</b> — then reasons step by step and does it itself: clicks the Pine editor open, pastes code, tests &amp; refines it, draws native levels. Real clicks, real keystrokes, real eyes on the screen.
            </p>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
              <a href="/downloads/yn-copilot-tradingview.zip" download style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 16, fontWeight: 800, color: '#04140c', background: 'linear-gradient(135deg,#10d693,#5b8cff)', borderRadius: 13, padding: '15px 30px', textDecoration: 'none', boxShadow: '0 0 44px rgba(16,214,147,.4)' }}>↓ Download for Chrome / Edge</a>
              <span className="mono" style={{ fontSize: 11.5, color: C.dim }}>Free · v4 agent · Chromium</span>
            </div>
          </div>

          {/* collage: chart + floating chat */}
          <div className="rise" style={{ position: 'relative', minHeight: 320, animationDelay: '.12s' }}>
            <div className="card" style={{ background: 'linear-gradient(180deg,#070d18,#05080f)', border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, boxShadow: '0 30px 80px rgba(0,0,0,.5)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }} className="mono">
                <span style={{ width: 9, height: 9, borderRadius: 99, background: '#ef5a6a' }} /><span style={{ width: 9, height: 9, borderRadius: 99, background: '#f5b14b' }} /><span style={{ width: 9, height: 9, borderRadius: 99, background: '#10d693' }} />
                <span style={{ marginLeft: 8, fontSize: 11, color: C.dim }}>NQ1! · 5m · TradingView</span>
              </div>
              <div style={{ height: 200 }}><ChartMock /></div>
            </div>
            <div style={{ position: 'absolute', right: -10, bottom: -26, animation: 'floaty 5s ease-in-out infinite' }}><ChatMock /></div>
          </div>
        </div>

        {/* capability strip */}
        <div className="mono" style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 'clamp(50px,8vw,90px)', justifyContent: 'center' }}>
          {['native lines', 'pine editor automation', 'auto-fixes compiler errors', 'voice', 'reads real price', 'routines'].map((t) => (
            <span key={t} style={{ fontSize: 12, color: '#a9b8d4', border: `1px solid ${C.line}`, borderRadius: 99, padding: '7px 14px', background: C.card }}>{t}</span>
          ))}
        </div>

        {/* features */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(255px,1fr))', gap: 16, marginTop: 40 }}>
          {DOES.map(([e, t, d, col]) => (
            <div key={t as string} className="card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 22 }}
              onMouseEnter={(ev) => { (ev.currentTarget as HTMLDivElement).style.borderColor = (col as string) + '66'; (ev.currentTarget as HTMLDivElement).style.boxShadow = `0 20px 50px -30px ${col}` }}
              onMouseLeave={(ev) => { (ev.currentTarget as HTMLDivElement).style.borderColor = C.line; (ev.currentTarget as HTMLDivElement).style.boxShadow = 'none' }}>
              <div style={{ fontSize: 28, marginBottom: 12, filter: `drop-shadow(0 0 12px ${col}66)` }}>{e as string}</div>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 7 }}>{t as string}</div>
              <div style={{ fontSize: 13.5, color: '#8295b0', lineHeight: 1.6 }}>{d as string}</div>
            </div>
          ))}
        </div>

        {/* install */}
        <h2 style={{ fontSize: 'clamp(24px,4vw,34px)', fontWeight: 900, letterSpacing: '-1px', margin: '70px 0 26px', textAlign: 'center' }}>Running in 30 seconds</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 14 }}>
          {STEPS.map(([t, d], i) => (
            <div key={t as string} className="card" style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20, position: 'relative' }}>
              <div className="mono" style={{ fontSize: 32, fontWeight: 900, color: 'transparent', WebkitTextStroke: `1.5px ${C.blue}66`, lineHeight: 1, marginBottom: 12 }}>{String(i + 1).padStart(2, '0')}</div>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginBottom: 5 }}>{t as string}</div>
              <div style={{ fontSize: 12.5, color: '#8295b0', lineHeight: 1.5 }}>{d as string}</div>
            </div>
          ))}
        </div>

        {/* honest note */}
        <div style={{ marginTop: 40, padding: 20, borderRadius: 16, border: '1px solid rgba(245,177,75,.25)', background: 'rgba(245,177,75,.05)', fontSize: 13, color: '#d8b78a', lineHeight: 1.7, maxWidth: 760, margin: '40px auto 0' }}>
          <b style={{ color: C.amber }}>How it really works:</b> to genuinely click &amp; type in TradingView it uses Chrome’s debugger API for <i>trusted</i> input — so Chrome shows a “YN Copilot started debugging this browser” bar while it acts. Leave it up; that’s what lets it draw native lines and drive the Pine editor for real. Assistive use only — respect TradingView’s terms.
        </div>

        {/* final CTA */}
        <div style={{ textAlign: 'center', marginTop: 60 }}>
          <a href="/downloads/yn-copilot-tradingview.zip" download style={{ display: 'inline-flex', alignItems: 'center', gap: 9, fontSize: 17, fontWeight: 800, color: '#04140c', background: 'linear-gradient(135deg,#10d693,#5b8cff)', borderRadius: 14, padding: '16px 38px', textDecoration: 'none', boxShadow: '0 0 50px rgba(16,214,147,.4)' }}>Put a quant in your browser →</a>
        </div>
      </div>
    </div>
  )
}
