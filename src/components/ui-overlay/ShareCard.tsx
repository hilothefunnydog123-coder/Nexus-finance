'use client'

import { useState } from 'react'
import { X, Share2, Download, ExternalLink } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'

interface Props { onClose: () => void }

export default function ShareCard({ onClose }: Props) {
  const { getTotalEquity, getTotalUnrealizedPnL, positions, closedTrades } = usePortfolioStore()
  const equity = getTotalEquity({})
  const pnl = getTotalUnrealizedPnL({})
  const ret = ((equity - 100_000) / 100_000) * 100
  const isUp = ret >= 0
  const username = typeof window !== 'undefined' ? (localStorage.getItem('nexus_username') || 'Trader') : 'Trader'

  const shareText = `📈 My YN Finance performance: ${isUp ? '+' : ''}${ret.toFixed(2)}% return on $100K paper account. ${closedTrades.length} trades closed. Trading stocks, forex & futures. Join me at ynfinance.org`

  const shareOnX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent('https://ynfinance.org')}`, '_blank')
  }

  const color = isUp ? '#00d4aa' : '#ff4757'

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="w-[420px]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] text-[#4a5e7a]">Your Performance Card</span>
          <button onClick={onClose}><X size={16} className="text-[#4a5e7a]" /></button>
        </div>

        {/* The card itself */}
        <div id="share-card" style={{
          background: 'linear-gradient(135deg, #040c14, #071220)',
          border: `1px solid ${color}40`,
          borderRadius: 16,
          padding: 28,
          boxShadow: `0 0 60px ${color}20`,
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* BG decoration */}
          <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: `${color}08` }} />
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #00d4aa, #1e90ff)' }}>
              <Share2 size={14} className="text-[#040c14]" />
            </div>
            <div>
              <div className="text-sm font-black text-white">YN FINANCE</div>
              <div className="text-[9px] text-[#4a5e7a] uppercase tracking-widest">Performance Report</div>
            </div>
          </div>

          {/* Trader name */}
          <div className="text-2xl font-black text-white mb-1">{username}</div>
          <div className="text-[10px] text-[#4a5e7a] mb-6 uppercase tracking-wider">Paper Trading Account</div>

          {/* Big number */}
          <div className="mb-6">
            <div className="text-5xl font-black mb-1 mono" style={{ color }}>{isUp ? '+' : ''}{ret.toFixed(2)}%</div>
            <div className="text-[11px] text-[#7f93b5]">Total return on $100,000 account</div>
          </div>

          {/* Stats grid */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Equity', value: `$${equity.toLocaleString('en-US', { maximumFractionDigits: 0 })}` },
              { label: 'Trades', value: String(closedTrades.length) },
              { label: 'Open Pos', value: String(positions.length) },
            ].map(({ label, value }) => (
              <div key={label} className="text-center" style={{ background: '#040c14', borderRadius: 8, padding: '10px 8px' }}>
                <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1">{label}</div>
                <div className="mono text-sm font-bold text-[#cdd6f4]">{value}</div>
              </div>
            ))}
          </div>

          <div className="text-[9px] text-[#4a5e7a] text-center">ynfinance.org · Simulated trading · Not financial advice</div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button onClick={shareOnX}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#040c14] border border-[#1a2d4a] hover:border-[#1e3a5f] text-[#cdd6f4] font-semibold text-[12px] rounded-lg transition-colors">
            <ExternalLink size={14} className="text-[#1e90ff]" /> Share on X
          </button>
          <button
            onClick={() => { const t = shareText + '\n\nhttps://ynfinance.org'; navigator.clipboard?.writeText(t).catch(() => {}); }}
            className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#00d4aa] text-[#040c14] font-bold text-[12px] rounded-lg hover:bg-[#00ffcc] transition-colors">
            <Download size={14} /> Copy Text
          </button>
        </div>
      </div>
    </div>
  )
}
