'use client'

import { useRef } from 'react'
import { X, Download, ShieldCheck, Award } from 'lucide-react'
import type { DBChallenge } from '@/lib/supabase'

interface Props {
  challenge: DBChallenge
  username: string
  onClose: () => void
}

export default function Certificate({ challenge, username, onClose }: Props) {
  const certRef = useRef<HTMLDivElement>(null)

  const certId = `YNC-${challenge.id.slice(0, 8).toUpperCase()}`
  const passedDate = challenge.passed_at ? new Date(challenge.passed_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const tierColor = challenge.tier === 'elite' ? '#ffa502' : challenge.tier === 'pro' ? '#00d4aa' : '#7f93b5'

  const print = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow || !certRef.current) return
    printWindow.document.write(`
      <html>
        <head>
          <title>YN Capital Certificate — ${username}</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { background: #040c14; color: #cdd6f4; font-family: 'Inter', sans-serif; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>${certRef.current.innerHTML}</body>
      </html>
    `)
    printWindow.document.close()
    setTimeout(() => { printWindow.print() }, 500)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl">
        {/* Controls */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] text-[#4a5e7a]">Certificate of Achievement — {certId}</span>
          <div className="flex items-center gap-3">
            <button onClick={print}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#00d4aa] text-[#040c14] font-bold text-xs rounded-lg hover:bg-[#00ffcc] transition-colors">
              <Download size={13} /> Save as PDF
            </button>
            <button onClick={onClose} className="text-[#4a5e7a] hover:text-[#cdd6f4]"><X size={18} /></button>
          </div>
        </div>

        {/* Certificate */}
        <div ref={certRef} style={{
          background: 'linear-gradient(135deg, #040c14 0%, #071220 50%, #040c14 100%)',
          border: `2px solid ${tierColor}`,
          borderRadius: 16,
          padding: 48,
          position: 'relative',
          overflow: 'hidden',
          boxShadow: `0 0 60px ${tierColor}30`,
        }}>
          {/* Corner ornaments */}
          {['top-4 left-4', 'top-4 right-4', 'bottom-4 left-4', 'bottom-4 right-4'].map((pos, i) => (
            <div key={i} className={`absolute ${pos} w-8 h-8`}
              style={{ border: `1px solid ${tierColor}40`, borderRadius: i % 2 ? '0 8px 0 0' : '8px 0 0 0' }} />
          ))}

          {/* Background watermark */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
            fontSize: 200, fontWeight: 900, color: `${tierColor}08`, userSelect: 'none',
            whiteSpace: 'nowrap', letterSpacing: -8,
          }}>YN</div>

          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 8 }}>
              <Award size={28} color={tierColor} />
              <span style={{ fontSize: 28, fontWeight: 900, color: '#fff', letterSpacing: -1 }}>YN CAPITAL</span>
              <Award size={28} color={tierColor} />
            </div>
            <div style={{ fontSize: 11, color: tierColor, letterSpacing: 6, textTransform: 'uppercase', fontWeight: 700 }}>
              Certificate of Achievement
            </div>
            <div style={{ width: 80, height: 1, background: `linear-gradient(90deg, transparent, ${tierColor}, transparent)`, margin: '16px auto 0' }} />
          </div>

          {/* Body */}
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <p style={{ color: '#7f93b5', fontSize: 13, marginBottom: 16 }}>This certifies that</p>
            <div style={{ fontSize: 36, fontWeight: 900, color: '#fff', marginBottom: 16, letterSpacing: -1 }}>
              {username}
            </div>
            <p style={{ color: '#7f93b5', fontSize: 13, marginBottom: 8 }}>has successfully completed the</p>
            <div style={{ fontSize: 22, fontWeight: 800, color: tierColor, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 2 }}>
              YN Capital {challenge.tier.charAt(0).toUpperCase() + challenge.tier.slice(1)} Challenge
            </div>
            <p style={{ color: '#7f93b5', fontSize: 13 }}>
              demonstrating exceptional trading discipline and risk management
            </p>
          </div>

          {/* Stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
            {[
              { label: 'Account Size', value: `$${challenge.account_size.toLocaleString()}` },
              { label: 'Final P&L', value: `+${challenge.current_pnl_pct.toFixed(2)}%` },
              { label: 'Challenge Tier', value: challenge.tier.toUpperCase() },
              { label: 'Date Achieved', value: passedDate },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: `${tierColor}10`, border: `1px solid ${tierColor}30`, borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
                <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: tierColor, fontFamily: 'monospace' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: `1px solid ${tierColor}30`, paddingTop: 20 }}>
            <div>
              <div style={{ fontSize: 9, color: '#4a5e7a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Certificate ID</div>
              <div style={{ fontSize: 11, color: '#7f93b5', fontFamily: 'monospace' }}>{certId}</div>
            <div style={{ fontSize: 9, color: '#4a5e7a', marginTop: 2 }}>ynfinance.org/verify/{challenge.id.slice(0,8)}</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: `linear-gradient(135deg, ${tierColor}30, ${tierColor}10)`, border: `2px solid ${tierColor}60`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 4px' }}>
                <ShieldCheck size={24} color={tierColor} />
              </div>
              <div style={{ fontSize: 9, color: tierColor, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Verified</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 9, color: '#4a5e7a', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Platform</div>
              <div style={{ fontSize: 11, color: '#7f93b5', fontFamily: 'monospace' }}>ynfinance.org</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
