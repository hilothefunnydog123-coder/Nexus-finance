'use client'

import Link from 'next/link'

const C = { bg: '#05060a', ink: '#e8f4f8', dim: '#5f7080', blue: '#5b8cff', green: '#10d693', line: 'rgba(255,255,255,.09)', card: 'rgba(255,255,255,.03)' }

const STEPS = [
  ['Download', 'Grab the extension (.zip) and unzip it.'],
  ['chrome://extensions', 'Open it, turn on Developer mode (top-right).'],
  ['Load unpacked', 'Click it and pick the unzipped folder.'],
  ['Open TradingView', 'Go to a chart — the copilot wakes automatically (or press Alt+Y).'],
]
const DOES = [
  ['🎙️', 'Talk or type to it', 'Speak (🎤) or type. It can speak its read back to you.'],
  ['📏', 'Draws your levels', 'PDH/PDL, EMAs, supply/demand — marked right on the chart.'],
  ['🧭', 'Points out structure', 'Reads trend + key zones and tells you what to watch.'],
  ['⚡', 'Writes indicators', 'Ask for a Pine script; it generates it and pastes it into the editor.'],
  ['🔁', 'Runs routines', 'Save a per-symbol macro ("Morning levels") and run it on open.'],
  ['🔒', 'Only on TradingView', 'Dormant everywhere else. Local to your browser.'],
]

export default function CopilotDesktop() {
  return (
    <div style={{ background: C.bg, minHeight: '100vh', color: C.ink, fontFamily: 'ui-monospace, Menlo, monospace' }}>
      <div style={{ maxWidth: 880, margin: '0 auto', padding: '28px clamp(18px,5vw,40px) 80px' }}>
        <Link href="/" style={{ color: C.dim, fontSize: 12, textDecoration: 'none' }}>← yn finance</Link>

        <div style={{ marginTop: 40, textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '.22em', color: C.green, marginBottom: 16 }}>⚡ YN COPILOT · LIVES IN YOUR BROWSER</div>
          <h1 style={{ fontSize: 'clamp(34px,7vw,62px)', fontWeight: 900, letterSpacing: '-2px', lineHeight: 1.02, margin: '0 auto 18px', maxWidth: 760, background: 'linear-gradient(135deg,#fff,#5b8cff 55%,#10d693)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            An AI co-pilot that lives inside your TradingView chart.
          </h1>
          <p style={{ fontSize: 17, color: '#8aa0ad', lineHeight: 1.7, maxWidth: 620, margin: '0 auto 30px' }}>
            It wakes up only when TradingView is open. Talk to it or type — it marks your levels, points out the structure, writes indicators, and runs your routines. Right on the chart.
          </p>
          <a href="/downloads/yn-copilot-tradingview.zip" download style={{ display: 'inline-flex', alignItems: 'center', gap: 10, fontSize: 16.5, fontWeight: 800, color: '#06100b', background: 'linear-gradient(135deg,#10d693,#5b8cff)', borderRadius: 14, padding: '16px 34px', textDecoration: 'none', boxShadow: '0 0 40px rgba(16,214,147,.35)' }}>
            ↓ Download for Chrome / Edge
          </a>
          <div style={{ fontSize: 11.5, color: C.dim, marginTop: 12 }}>Free · Load-unpacked · ~11 KB · Chromium browsers</div>
        </div>

        {/* what it does */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginTop: 60 }}>
          {DOES.map(([e, t, d]) => (
            <div key={t} style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 16, padding: 20 }}>
              <div style={{ fontSize: 26, marginBottom: 10 }}>{e}</div>
              <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 6 }}>{t}</div>
              <div style={{ fontSize: 13, color: '#7e91a0', lineHeight: 1.55 }}>{d}</div>
            </div>
          ))}
        </div>

        {/* install */}
        <h2 style={{ fontSize: 'clamp(22px,4vw,30px)', fontWeight: 900, letterSpacing: '-1px', margin: '60px 0 24px' }}>Install in 30 seconds</h2>
        <div style={{ display: 'grid', gap: 12 }}>
          {STEPS.map(([t, d], i) => (
            <div key={t} style={{ display: 'flex', gap: 16, alignItems: 'flex-start', background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, padding: '16px 18px' }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.blue, minWidth: 28 }}>{i + 1}</div>
              <div><div style={{ fontSize: 15, fontWeight: 700 }}>{t}</div><div style={{ fontSize: 13, color: '#7e91a0', marginTop: 3 }}>{d}</div></div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 36, padding: 18, borderRadius: 14, border: '1px solid rgba(245,166,35,.25)', background: 'rgba(245,166,35,.06)', fontSize: 12.5, color: '#d8b78a', lineHeight: 1.65 }}>
          <b style={{ color: '#f5a623' }}>Heads up (v1):</b> drawings render on an overlay the copilot controls (not yet native TradingView objects), and it needs a one-time calibration to place levels precisely. Assistive use only — please respect TradingView’s terms.
        </div>
      </div>
    </div>
  )
}
