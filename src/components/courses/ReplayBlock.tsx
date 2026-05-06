'use client'

import { useState } from 'react'
import { CheckCircle, Bot, Play, Eye, RotateCcw } from 'lucide-react'

interface ReplayScenario {
  instrument: string
  timeframe: string
  context: string
  replaySymbol: string
}

interface Props {
  scenario: ReplayScenario
  color: string
  onComplete: () => void
}

type Stage = 'predict' | 'replay' | 'evaluate' | 'feedback' | 'done'

export default function ReplayBlock({ scenario, color, onComplete }: Props) {
  const [stage, setStage] = useState<Stage>('predict')
  const [prediction, setPrediction] = useState('')
  const [reasoning, setReasoning] = useState('')
  const [outcome, setOutcome] = useState('')
  const [reflection, setReflection] = useState('')
  const [feedback, setFeedback] = useState('')
  const [loading, setLoading] = useState(false)

  const getFeedback = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'replay',
          data: { prediction, reasoning, outcome, instrument: scenario.instrument, timeframe: scenario.timeframe },
        }),
      })
      const { feedback: fb } = await res.json()
      setFeedback(fb)
      setStage('feedback')
    } catch {
      setFeedback('AI unavailable — but great work completing the replay exercise.')
      setStage('feedback')
    }
    setLoading(false)
  }

  const tvURL = `https://www.tradingview.com/chart/?symbol=${scenario.replaySymbol}&interval=${scenario.timeframe === '1H' ? '60' : scenario.timeframe === '15M' ? '15' : scenario.timeframe === '4H' ? '240' : '5'}&replay=true`

  return (
    <div style={{ background: '#071220', border: `1px solid ${color}30`, borderRadius: 14, overflow: 'hidden', marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid #1a2d4a', background: '#050d1a', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Play size={14} color={color} />
        <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Replay Mode — {scenario.instrument} {scenario.timeframe}
        </span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {(['predict', 'replay', 'evaluate', 'feedback'] as Stage[]).map((s, i) => (
            <div key={s} style={{ width: 8, height: 8, borderRadius: '50%', background: ['predict', 'replay', 'evaluate', 'feedback', 'done'].indexOf(stage) >= i ? color : '#1a2d4a', transition: 'all 0.3s' }} />
          ))}
        </div>
      </div>

      <div style={{ padding: '24px' }}>
        {/* Context */}
        <div style={{ background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>Chart Context (read before watching)</div>
          <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{scenario.context}</p>
        </div>

        {/* Stage: Predict */}
        {stage === 'predict' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
              Before you replay — what do you think happens next?
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {['Strong bullish move', 'Slight bullish drift', 'Range / chop', 'Slight bearish drift', 'Strong bearish move', 'Reversal at key level'].map(p => (
                <button key={p} onClick={() => setPrediction(p)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${prediction === p ? color : '#1a2d4a'}`, background: prediction === p ? `${color}20` : '#040c14', color: prediction === p ? color : '#7f93b5', fontSize: 12, fontWeight: prediction === p ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
                  {p}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.08em', display: 'block', marginBottom: 6 }}>Why? (explain your reasoning)</label>
              <textarea value={reasoning} onChange={e => setReasoning(e.target.value)} rows={3}
                placeholder="What structure, level, or signal made you predict this?"
                style={{ width: '100%', background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '10px 12px', color: '#cdd6f4', fontSize: 12, resize: 'none', fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }} />
            </div>
            <button onClick={() => setStage('replay')} disabled={!prediction || reasoning.length < 15}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: prediction && reasoning.length >= 15 ? color : '#0f1f38', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: prediction && reasoning.length >= 15 ? 'pointer' : 'not-allowed' }}>
              <Eye size={14} /> Lock In Prediction & Watch the Replay
            </button>
          </>
        )}

        {/* Stage: Replay */}
        {stage === 'replay' && (
          <>
            <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10, padding: '14px 16px', marginBottom: 16, display: 'flex', gap: 12, alignItems: 'flex-start' }}>
              <div style={{ fontSize: 20, flexShrink: 0 }}>📌</div>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color, marginBottom: 4 }}>Your prediction is locked in:</div>
                <div style={{ fontSize: 13, color: '#cdd6f4', fontWeight: 600 }}>{prediction}</div>
                <div style={{ fontSize: 11, color: '#7f93b5', marginTop: 4 }}>"{reasoning}"</div>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4', marginBottom: 10 }}>Now open TradingView Replay and watch what actually happened:</div>
              <ol style={{ fontSize: 12, color: '#7f93b5', lineHeight: 2, paddingLeft: 18, margin: '0 0 12px' }}>
                <li>Click the link below to open TradingView</li>
                <li>In the toolbar, click the <strong style={{ color: '#cdd6f4' }}>Replay</strong> button (clock icon)</li>
                <li>Navigate to a recent volatile session on {scenario.instrument}</li>
                <li>Step through bar-by-bar using the right arrow key or play button</li>
                <li>Watch what price actually does — compare to your prediction</li>
              </ol>
              <a href={tvURL} target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, fontWeight: 700, color: color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 8, padding: '9px 16px', textDecoration: 'none' }}>
                <RotateCcw size={13} /> Open {scenario.instrument} in TradingView Replay ↗
              </a>
            </div>

            <button onClick={() => setStage('evaluate')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: color, border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer' }}>
              I Watched It — Record What Happened
            </button>
          </>
        )}

        {/* Stage: Evaluate */}
        {stage === 'evaluate' && (
          <>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#fff', marginBottom: 16 }}>What actually happened?</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              {['Strong bullish move', 'Slight bullish drift', 'Range / chop', 'Slight bearish drift', 'Strong bearish move', 'Reversal at key level'].map(o => (
                <button key={o} onClick={() => setOutcome(o)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: `1px solid ${outcome === o ? (o === prediction ? '#00d4aa' : '#ff4757') : '#1a2d4a'}`, background: outcome === o ? (o === prediction ? '#00d4aa20' : '#ff475720') : '#040c14', color: outcome === o ? (o === prediction ? '#00d4aa' : '#ff4757') : '#7f93b5', fontSize: 12, fontWeight: outcome === o ? 700 : 400, cursor: 'pointer', textAlign: 'left' }}>
                  {o}
                </button>
              ))}
            </div>
            {outcome && (
              <div style={{ padding: '10px 14px', borderRadius: 8, background: outcome === prediction ? '#00d4aa15' : '#ff475715', border: `1px solid ${outcome === prediction ? '#00d4aa40' : '#ff475740'}`, marginBottom: 12, fontSize: 13, fontWeight: 700, color: outcome === prediction ? '#00d4aa' : '#ff4757' }}>
                {outcome === prediction ? '✓ Correct prediction!' : `✗ You predicted "${prediction}" — actual: "${outcome}"`}
              </div>
            )}
            <button onClick={getFeedback} disabled={!outcome || loading}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: outcome ? color : '#0f1f38', border: 'none', borderRadius: 8, padding: '11px 20px', cursor: outcome ? 'pointer' : 'not-allowed' }}>
              <Bot size={14} /> {loading ? 'Getting AI Analysis...' : 'Get AI Feedback on My Read'}
            </button>
          </>
        )}

        {/* Stage: Feedback */}
        {stage === 'feedback' && (
          <>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              <div style={{ flex: 1, background: '#040c14', border: '1px solid #1a2d4a', borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4 }}>You predicted</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#cdd6f4' }}>{prediction}</div>
              </div>
              <div style={{ flex: 1, background: '#040c14', border: `1px solid ${outcome === prediction ? '#00d4aa40' : '#ff475740'}`, borderRadius: 8, padding: '12px 14px' }}>
                <div style={{ fontSize: 10, color: '#4a5e7a', marginBottom: 4 }}>Actual outcome</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: outcome === prediction ? '#00d4aa' : '#ff4757' }}>{outcome}</div>
              </div>
            </div>
            <div style={{ background: `${color}10`, border: `1px solid ${color}30`, borderRadius: 10, padding: '16px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <Bot size={13} color={color} />
                <span style={{ fontSize: 11, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.08em' }}>AI Coach Feedback</span>
              </div>
              <p style={{ fontSize: 13, color: '#cdd6f4', lineHeight: 1.7, margin: 0 }}>{feedback}</p>
            </div>
            <button onClick={() => { setStage('done'); onComplete() }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 800, color: '#040c14', background: color, border: 'none', borderRadius: 8, padding: '11px 20px', cursor: 'pointer' }}>
              <CheckCircle size={14} /> Complete Replay Session
            </button>
          </>
        )}

        {stage === 'done' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <CheckCircle size={22} color={color} />
            <div>
              <div style={{ fontWeight: 800, color, fontSize: 14 }}>Replay Complete!</div>
              <div style={{ fontSize: 12, color: '#7f93b5', marginTop: 2 }}>Your prediction accuracy is building — this is how intuition is trained</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
