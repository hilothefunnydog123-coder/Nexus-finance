'use client'

import dynamic from 'next/dynamic'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

const TradingFloor3D = dynamic(() => import('@/components/cinematic/TradingFloor3D'), { ssr: false, loading: () => <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#46566e', fontFamily: 'var(--font-mono)', fontSize: 12, letterSpacing: '0.2em' }}>BOOTING THE MACHINE…</div> })

export default function TradingFloorPage() {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'radial-gradient(1200px 700px at 50% 30%, #0a1018, #05060b 80%)', overflow: 'hidden' }}>
      <TradingFloor3D />

      {/* overlay chrome */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', padding: 'clamp(18px,3vw,32px)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.28em', color: '#34d399' }}>● LABS · TRADING FLOOR</div>
            <h1 style={{ fontFamily: 'var(--font-display),system-ui,sans-serif', fontWeight: 700, letterSpacing: '-0.045em', fontSize: 'clamp(1.8rem,4vw,3rem)', color: '#e7ecf5', marginTop: 10, maxWidth: 520, lineHeight: 1 }}>
              You’re inside the network.
            </h1>
            <p style={{ color: '#8a93a8', fontSize: 14, marginTop: 10, maxWidth: 420, lineHeight: 1.5 }}>
              Eleven inputs, two hidden layers, one decision — the real BrainStock architecture, rendered in space. Every traveling light is a signal.
            </p>
          </div>
          <Link href="/labs" style={{ pointerEvents: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#8a93a8', textDecoration: 'none', background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.1)', padding: '8px 14px', backdropFilter: 'blur(8px)' }}>
            <ArrowLeft size={14} /> Labs
          </Link>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.18em', color: '#46566e', border: '1px solid rgba(255,255,255,.08)', background: 'rgba(5,6,11,.5)', backdropFilter: 'blur(8px)', padding: '7px 16px' }}>
            ↔ DRAG TO ORBIT
          </div>
        </div>
      </div>
    </div>
  )
}
