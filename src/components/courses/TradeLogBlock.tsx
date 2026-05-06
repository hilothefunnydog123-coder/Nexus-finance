'use client'

import { useState } from 'react'
import { CheckCircle, Plus, Trash2, Bot, AlertCircle } from 'lucide-react'

interface TradeEntry {
  entryReason: string
  strategyMatch: string
  mistakes: string
  result: 'profit' | 'loss' | 'breakeven' | ''
}

const empty = (): TradeEntry => ({ entryReason: '', strategyMatch: '', mistakes: '', result: '' })

interface Props {
  strategy: string
  color: string
  minTrades?: number
  onComplete: () => void
}

export default function TradeLogBlock({ strategy, color, minTrades = 2, onComplete }: Props) {
  const [trades, setTrades] = useState<TradeEntry[]>([empty()])
  const [feedbacks, setFeedbacks] = useState<string[]>([])
  const [loading, setLoading] = useState<number | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (i: number, field: keyof TradeEntry, val: string) => {
    setTrades(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: val } : t))
  }

  const isComplete = (t: TradeEntry) =>
    t.entryReason.length > 10 && t.strategyMatch.length > 10 && t.mistakes.length > 5 && t.result !== ''

  const completeTrades = trades.filter(isComplete)
  const canSubmit = completeTrades.length >= minTrades

  const getFeedback = async (i: number) => {
    if (!isComplete(trades[i])) return
    setLoading(i)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'trade_log', data: { ...trades[i], strategy } }),
      })
      const { feedback } = await res.json()
      setFeedbacks(prev => { const next = [...prev]; next[i] = feedback; return next })
    } catch {
      setFeedbacks(prev => { const next = [...prev]; next[i] = 'Could not reach AI — check your connection.'; return next })
    }
    setLoading(null)
  }

  const handleSubmit = () => { setSubmitted(true); onComplete() }

  const resultColors = { profit: '#00d4aa', loss: '#ff4757', breakeven: '#ffa502', '': '#4a5e7a' }

  if (submitted) return (
    <div style={{ background: `${color}15`, border: `1px solid ${color}40`, borderRadius: 12, padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
      <CheckCircle size={22} color={color} />
      <div>
        <div style={{ fontWeight: 800, color, fontSize: 14 }}>Trade Log Submitted!</div>
        <div style={{ fontSize: 12, color: '#7f93b5', marginTop: 2 }}>{completeTrades.length} trades logged — lesson complete</div>
      </div>
    </div>
  )

  return (
    <div style={{ background: '#071220', border: '1px solid #1a2d4a', borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', background: '#050d1a', display: 'flex', alignItems: 'center', gap: 10 }}>
        <AlertCircle size={14} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Mandatory Trade Log — {completeTrades.length}/{minTrades} trades required
        </span>
        <div style={{ marginLeft: 'auto', fontSize: 10, color: '#4a5e7a' }}>Lesson doesn't count until you log real simulated trades</div>
      </div>

      <div style={{ padding: '16px 20px' }}>
        {trades.map((trade, i) => (
          <div key={i} style={{ background: '#040c14', border: `1px solid ${isComplete(trade) ? color + '40' : '#1a2d4a'}`, borderRadius: 10, padding: '16px 18px', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: isComplete(trade) ? color : '#7f93b5' }}>
                Trade #{i + 1} {isComplete(trade) ? '✓' : ''}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {isComplete(trade) && !feedbacks[i] && (
                  <button onClick={() => getFeedback(i)} disabled={loading === i}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, color: '#a855f7', background: '#a855f715', border: '1px solid #a855f730', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontWeight: 700 }}>
                    <Bot size={11} /> {loading === i ? 'Analyzing...' : 'Get AI Feedback'}
                  </button>
                )}
                {trades.length > 1 && (
                  <button onClick={() => setTrades(prev => prev.filter((_, idx) => idx !== i))}
                    style={{ background: 'none', border: 'none', color: '#4a5e7a', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Why you entered *</label>
                <textarea value={trade.entryReason} onChange={e => update(i, 'entryReason', e.target.value)} rows={2}
                  placeholder="What exact signal triggered your entry?"
                  style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 6, padding: '8px 10px', color: '#cdd6f4', fontSize: 12, resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>How it matched the strategy *</label>
                <textarea value={trade.strategyMatch} onChange={e => update(i, 'strategyMatch', e.target.value)} rows={2}
                  placeholder="Which specific rule or condition matched?"
                  style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 6, padding: '8px 10px', color: '#cdd6f4', fontSize: 12, resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>What you messed up *</label>
                <textarea value={trade.mistakes} onChange={e => update(i, 'mistakes', e.target.value)} rows={2}
                  placeholder="Be honest — entry too early? Chased? Wrong size?"
                  style={{ width: '100%', background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 6, padding: '8px 10px', color: '#cdd6f4', fontSize: 12, resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 5 }}>Result *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {(['profit', 'loss', 'breakeven'] as const).map(r => (
                    <button key={r} onClick={() => update(i, 'result', r)}
                      style={{ padding: '6px 12px', borderRadius: 6, border: `1px solid ${trade.result === r ? resultColors[r] : '#1a2d4a'}`, background: trade.result === r ? resultColors[r] + '20' : 'transparent', color: trade.result === r ? resultColors[r] : '#4a5e7a', fontSize: 11, fontWeight: 700, cursor: 'pointer', textTransform: 'capitalize', textAlign: 'left' }}>
                      {r === 'profit' ? '✓ Profit' : r === 'loss' ? '✗ Loss' : '= B/E'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {feedbacks[i] && (
              <div style={{ marginTop: 12, background: '#a855f710', border: '1px solid #a855f730', borderRadius: 8, padding: '12px 14px', display: 'flex', gap: 10 }}>
                <Bot size={14} color="#a855f7" style={{ flexShrink: 0, marginTop: 2 }} />
                <p style={{ fontSize: 12, color: '#cdd6f4', lineHeight: 1.6, margin: 0 }}>{feedbacks[i]}</p>
              </div>
            )}
          </div>
        ))}

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginTop: 4 }}>
          <button onClick={() => setTrades(prev => [...prev, empty()])}
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#7f93b5', background: '#0a1628', border: '1px solid #1a2d4a', borderRadius: 8, padding: '8px 14px', cursor: 'pointer' }}>
            <Plus size={12} /> Add Trade
          </button>

          <button onClick={handleSubmit} disabled={!canSubmit}
            style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: canSubmit ? '#040c14' : '#4a5e7a', background: canSubmit ? color : '#0f1f38', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: canSubmit ? 'pointer' : 'not-allowed', transition: 'all 0.2s' }}>
            <CheckCircle size={14} /> {canSubmit ? 'Submit & Complete Lesson' : `${minTrades - completeTrades.length} more trade${minTrades - completeTrades.length !== 1 ? 's' : ''} needed`}
          </button>
        </div>
      </div>
    </div>
  )
}
