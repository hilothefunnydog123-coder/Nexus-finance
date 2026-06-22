'use client'

/* ════════════════════════════════════════════════════════════════════════
   BrainMemory — a compact strip that makes the AI feel like it KNOWS you.

   Drop it into any feature with a ticker. It reads the shared brainContext and
   surfaces continuity: "you last looked at NVDA 2d ago", "the net flagged it
   bullish this morning", "public win rate 64%". Signed out, it nudges sign-in.
   ════════════════════════════════════════════════════════════════════════ */

import Link from 'next/link'
import { Brain } from 'lucide-react'
import { useBrainContext, lastForTicker, todaysCall, ago } from '@/lib/brainContext'

const CYAN = '#22d3ee'
const GREEN = '#34d399'
const RED = '#f87171'
const MUTED = '#8a93a8'

export default function BrainMemory({ ticker, compact = false }: { ticker?: string | null; compact?: boolean }) {
  const ctx = useBrainContext()
  if (ctx.loading) return null

  const bits: React.ReactNode[] = []

  if (ticker) {
    const last = lastForTicker(ctx, ticker)
    if (last) {
      const up = (last.pct ?? 0) >= 0
      bits.push(
        <span key="last">
          You last {last.kind === 'forecast' ? 'forecast' : 'analyzed'} <b style={{ color: '#cdd6f4' }}>{ticker.toUpperCase()}</b> {ago(last.created_at)}
          {last.rating ? <> — called <span style={{ color: up ? GREEN : RED, fontWeight: 700 }}>{last.rating}</span></> : null}
        </span>
      )
    }
    const call = todaysCall(ctx, ticker)
    if (call) {
      bits.push(
        <span key="today">
          BrainStock flagged it <span style={{ color: call === 'bull' ? GREEN : RED, fontWeight: 700 }}>{call === 'bull' ? 'bullish' : 'bearish'}</span> this morning
        </span>
      )
    }
  }

  if (ctx.stats.winRate != null) {
    bits.push(<span key="wr">Public track record: <b style={{ color: GREEN }}>{ctx.stats.winRate}%</b> win rate</span>)
  }

  // Nothing personal yet → nudge sign-in / first action (only when we have a ticker context).
  if (bits.length === 0) {
    if (!ticker) return null
    bits.push(<span key="nudge"><Link href="/account" style={{ color: CYAN, textDecoration: 'none' }}>Sign in</Link> and the net remembers every call you make.</span>)
  }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
      padding: compact ? '8px 12px' : '10px 14px',
      background: 'rgba(34,211,238,.06)', border: '1px solid rgba(34,211,238,.2)',
      borderRadius: 10, fontSize: compact ? 11.5 : 12.5, color: MUTED, lineHeight: 1.5,
    }}>
      <Brain size={compact ? 13 : 15} style={{ color: CYAN, flexShrink: 0 }} />
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
        {bits.map((b, i) => (
          <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            {i > 0 && <span style={{ color: '#2a3a52' }}>·</span>}
            {b}
          </span>
        ))}
      </div>
    </div>
  )
}
