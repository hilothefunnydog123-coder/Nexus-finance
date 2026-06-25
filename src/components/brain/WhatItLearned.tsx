'use client'

import { useEffect, useState } from 'react'
import { fetchProfile, optedOut, setOptOut, resetBrain } from './siteBrainClient'

type Profile = Awaited<ReturnType<typeof fetchProfile>>

/**
 * Transparent, on-brand counterpart to the tracker: a tiny floating button that
 * shows the user EXACTLY what the Site Brain has learned about them, what is and
 * isn't tracked, and lets them reset or opt out. Turns "AI watches you" into a
 * trust feature — accountability, the whole brand.
 */
export default function WhatItLearned() {
  const [open, setOpen] = useState(false)
  const [prof, setProf] = useState<Profile>(null)
  const [out, setOut] = useState(false)

  useEffect(() => { setOut(optedOut()) }, [])
  useEffect(() => { if (open) fetchProfile().then(setProf) }, [open])

  const seg = prof?.segment ? prof.segment[0].toUpperCase() + prof.segment.slice(1) : null
  const seen = prof?.seen ?? 0

  return (
    <>
      <style>{`@keyframes brainPulse{0%,100%{box-shadow:0 0 0 0 rgba(31,59,255,.5)}50%{box-shadow:0 0 0 6px rgba(31,59,255,0)}}`}</style>

      <button onClick={() => setOpen((v) => !v)} aria-label="What the Site Brain learned"
        style={{ position: 'fixed', left: 18, bottom: 18, zIndex: 240, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 999, border: '1px solid rgba(31,59,255,.4)', background: 'rgba(8,10,20,.86)', color: '#cdd6ff', fontSize: 12, fontWeight: 700, fontFamily: 'ui-monospace,monospace', cursor: 'pointer', backdropFilter: 'blur(8px)', animation: open ? 'none' : 'brainPulse 3.4s ease-in-out infinite' }}>
        <span style={{ width: 8, height: 8, borderRadius: 999, background: '#1f3bff', boxShadow: '0 0 8px #1f3bff' }} />
        the net is learning
      </button>

      {open && (
        <div style={{ position: 'fixed', left: 18, bottom: 64, zIndex: 241, width: 320, maxWidth: 'calc(100vw - 36px)', borderRadius: 18, overflow: 'hidden', background: 'linear-gradient(180deg,#0b0f1e,#070912)', border: '1px solid rgba(31,59,255,.35)', boxShadow: '0 24px 60px rgba(0,0,0,.5)', color: '#dfe6ff', fontFamily: 'ui-monospace,monospace' }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(255,255,255,.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.04em' }}>🧠 What the net learned about you</span>
            <button onClick={() => setOpen(false)} aria-label="Close" style={{ border: 'none', background: 'transparent', color: '#8a93b8', fontSize: 16, cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          <div style={{ padding: '14px 16px', display: 'grid', gap: 14 }}>
            {out ? (
              <div style={{ fontSize: 12, color: '#9aa3c8', lineHeight: 1.6 }}>You’ve opted out — the net isn’t learning from this browser. Nothing is being collected.</div>
            ) : !prof?.ready || seen === 0 ? (
              <div style={{ fontSize: 12, color: '#9aa3c8', lineHeight: 1.6 }}>The net hasn’t learned much yet — keep exploring and it’ll start tuning the site to what you care about. Everything stays on your side until then.</div>
            ) : (
              <>
                <div>
                  <div style={{ fontSize: 10, color: '#6c77a8', letterSpacing: '.14em', marginBottom: 6 }}>IT THINKS YOU’RE A…</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#9db0ff' }}>{seg}</div>
                  <div style={{ fontSize: 10.5, color: '#6c77a8', marginTop: 2 }}>from {seen} signals on this browser</div>
                </div>
                {!!prof.features?.length && (
                  <div>
                    <div style={{ fontSize: 10, color: '#6c77a8', letterSpacing: '.14em', marginBottom: 7 }}>YOU GRAVITATE TO</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {prof.features.slice(0, 5).map((f) => (
                        <span key={f.key} style={{ fontSize: 11, color: '#cdd6ff', background: 'rgba(31,59,255,.13)', border: '1px solid rgba(31,59,255,.25)', borderRadius: 999, padding: '3px 9px' }}>{f.label}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!!prof.tickers?.length && (
                  <div>
                    <div style={{ fontSize: 10, color: '#6c77a8', letterSpacing: '.14em', marginBottom: 7 }}>TICKERS ON YOUR RADAR</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {prof.tickers.slice(0, 6).map((t) => (
                        <span key={t.sym} style={{ fontSize: 11, fontWeight: 700, color: '#86f0c0', background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.25)', borderRadius: 6, padding: '3px 8px' }}>{t.sym}</span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div style={{ fontSize: 10.5, color: '#5c6690', lineHeight: 1.55, borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: 12 }}>
              Tracked: pages you open, what you click, how long you read, and tickers you look up. <b style={{ color: '#9aa3c8' }}>Never</b> your keystrokes, names, or anything you type. Cookieless.
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => { resetBrain(); setProf(null); fetchProfile().then(setProf) }} style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: '#cdd6ff', background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 9, padding: '8px', cursor: 'pointer' }}>Reset what it knows</button>
              <button onClick={() => { const n = !out; setOptOut(n); setOut(n) }} style={{ flex: 1, fontSize: 11.5, fontWeight: 700, color: out ? '#86f0c0' : '#ff9a9a', background: out ? 'rgba(16,185,129,.1)' : 'rgba(255,90,90,.08)', border: `1px solid ${out ? 'rgba(16,185,129,.3)' : 'rgba(255,90,90,.25)'}`, borderRadius: 9, padding: '8px', cursor: 'pointer' }}>{out ? 'Opt back in' : 'Opt out'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
