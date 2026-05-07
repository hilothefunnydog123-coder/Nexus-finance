'use client'

import { useState, useEffect, useMemo } from 'react'
import { BookOpen, TrendingUp, TrendingDown, Brain, Target, Clock, BarChart2, Star, AlertCircle, Bot } from 'lucide-react'
import { usePortfolioStore } from '@/store/portfolioStore'
import { format, getDay } from 'date-fns'
import type { ClosedTrade } from '@/store/portfolioStore'

const SETUP_TYPES = ['Breakout','Bull Flag','Bear Flag','VWAP Bounce','Gap Fill','Reversal','Earnings Play','News Catalyst','Options Flow','Support/Resistance','Moving Average Cross','Oversold Bounce','Trend Follow','Scalp','Other']
const EMOTIONS    = ['Calm & Focused','Confident','Uncertain','Anxious','FOMO','Revenge Trading','Overconfident','Bored','Disciplined']
const CONDITIONS  = ['Strong Trend Up','Strong Trend Down','Choppy/Range','Low Volume','High Volume','News Driven','Pre-earnings','Post-earnings']
const GRADES      = ['A','B','C','D','F'] as const
const DAYS        = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

interface JournalEntry {
  tradeId: string
  setupType: string
  emotion: string
  condition: string
  grade: typeof GRADES[number]
  notes: string
  savedAt: string
}

function loadJournal(): Record<string, JournalEntry> {
  try { return JSON.parse(localStorage.getItem('yn_journal') || '{}') } catch { return {} }
}
function saveJournal(j: Record<string, JournalEntry>) {
  localStorage.setItem('yn_journal', JSON.stringify(j))
}

const GRADE_COLOR: Record<string, string> = { A: '#00d4aa', B: '#7ecf4a', C: '#ffa502', D: '#ff7f50', F: '#ff4757' }

function Insight({ label, value, detail, color }: { label: string; value: string; detail?: string; color: string }) {
  return (
    <div className="bg-[#040c14] rounded-xl border border-[#1a2d4a] p-4">
      <div className="text-[9px] text-[#4a5e7a] uppercase tracking-wider mb-1">{label}</div>
      <div className="text-lg font-black mono" style={{ color }}>{value}</div>
      {detail && <div className="text-[10px] text-[#4a5e7a] mt-1 leading-snug">{detail}</div>}
    </div>
  )
}

type JournalTab = 'log' | 'insights' | 'patterns' | 'ai-coach'

export default function TradeJournal() {
  const { closedTrades } = usePortfolioStore()
  const [journal, setJournal] = useState<Record<string, JournalEntry>>({})
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<Partial<JournalEntry>>({})
  const [tab, setTab] = useState<JournalTab>('log')
  const [aiCoach, setAiCoach] = useState('')
  const [aiCoachLoading, setAiCoachLoading] = useState(false)

  useEffect(() => { setJournal(loadJournal()) }, [])

  const save = (tradeId: string) => {
    const entry: JournalEntry = {
      tradeId,
      setupType: form.setupType || 'Other',
      emotion: form.emotion || 'Calm & Focused',
      condition: form.condition || 'Strong Trend Up',
      grade: form.grade || 'B',
      notes: form.notes || '',
      savedAt: new Date().toISOString(),
    }
    const updated = { ...journal, [tradeId]: entry }
    setJournal(updated)
    saveJournal(updated)
    setEditingId(null)
    setForm({})
  }

  const startEdit = (trade: ClosedTrade) => {
    const existing = journal[trade.id]
    setForm(existing || {})
    setEditingId(trade.id)
  }

  // Analytics
  const analytics = useMemo(() => {
    const journaled = closedTrades.filter(t => journal[t.id])
    if (journaled.length < 3) return null

    // Win rate by setup type
    const bySetup: Record<string, { wins: number; total: number; pnl: number }> = {}
    const byEmotion: Record<string, { wins: number; total: number }> = {}
    const byGrade: Record<string, { wins: number; total: number; pnl: number }> = {}
    const byDay: Record<number, { wins: number; total: number; pnl: number }> = {}
    const byHour: Record<number, { wins: number; total: number }> = {}

    journaled.forEach(t => {
      const e = journal[t.id]
      const win = t.pnl > 0
      const day = getDay(new Date(t.closedAt))
      const hour = new Date(t.closedAt).getHours()

      // Setup
      if (!bySetup[e.setupType]) bySetup[e.setupType] = { wins: 0, total: 0, pnl: 0 }
      bySetup[e.setupType].total++
      bySetup[e.setupType].pnl += t.pnl
      if (win) bySetup[e.setupType].wins++

      // Emotion
      if (!byEmotion[e.emotion]) byEmotion[e.emotion] = { wins: 0, total: 0 }
      byEmotion[e.emotion].total++
      if (win) byEmotion[e.emotion].wins++

      // Grade
      if (!byGrade[e.grade]) byGrade[e.grade] = { wins: 0, total: 0, pnl: 0 }
      byGrade[e.grade].total++
      byGrade[e.grade].pnl += t.pnl
      if (win) byGrade[e.grade].wins++

      // Day
      if (!byDay[day]) byDay[day] = { wins: 0, total: 0, pnl: 0 }
      byDay[day].total++
      byDay[day].pnl += t.pnl
      if (win) byDay[day].wins++

      // Hour
      if (!byHour[hour]) byHour[hour] = { wins: 0, total: 0 }
      byHour[hour].total++
      if (win) byHour[hour].wins++
    })

    const bestSetup = Object.entries(bySetup)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0]
    const worstSetup = Object.entries(bySetup)
      .filter(([, v]) => v.total >= 2)
      .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0]
    const calmEmotion = byEmotion['Calm & Focused']
    const fomoEmotion = byEmotion['FOMO']
    const bestDay = Object.entries(byDay)
      .filter(([, v]) => v.total >= 1)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))[0]
    const worstDay = Object.entries(byDay)
      .filter(([, v]) => v.total >= 1)
      .sort((a, b) => (a[1].wins / a[1].total) - (b[1].wins / b[1].total))[0]

    const winners = journaled.filter(t => t.pnl > 0)
    const losers = journaled.filter(t => t.pnl < 0)

    return {
      total: journaled.length,
      bySetup, byEmotion, byGrade, byDay,
      bestSetup, worstSetup,
      calmWinRate: calmEmotion ? (calmEmotion.wins / calmEmotion.total * 100).toFixed(0) : null,
      fomoWinRate: fomoEmotion ? (fomoEmotion.wins / fomoEmotion.total * 100).toFixed(0) : null,
      bestDay, worstDay,
      avgHoldWinner: winners.length > 0 ? 'N/A' : null,
    }
  }, [closedTrades, journal])

  const unjournaled = closedTrades.filter(t => !journal[t.id]).slice(0, 5)

  return (
    <div className="flex flex-col h-full bg-[#040c14]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-[#1a2d4a] bg-[#071220] shrink-0">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-[#a855f7]" />
          <span className="text-sm font-black text-[#cdd6f4]">Trade Journal</span>
          <span className="text-[10px] text-[#4a5e7a]">— Your edge is in the data</span>
        </div>
        <div className="text-[10px] text-[#4a5e7a]">{Object.keys(journal).length} entries logged</div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#1a2d4a] shrink-0">
        {[['log','Trade Log'],['insights','Insights'],['patterns','Patterns'],['ai-coach','🤖 AI Coach']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id as JournalTab)}
            className={`flex-1 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === id ? 'text-[#cdd6f4] border-[#a855f7]' : 'text-[#4a5e7a] border-transparent hover:text-[#7f93b5]'
            }`}>{label}</button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {/* TRADE LOG */}
        {tab === 'log' && (
          <div className="h-full overflow-y-auto">
            {/* Unlogged trades prompt */}
            {unjournaled.length > 0 && (
              <div className="px-4 py-3 border-b border-[#ffa502]/20 bg-[#ffa502]/5">
                <div className="flex items-center gap-2 mb-2">
                  <AlertCircle size={12} className="text-[#ffa502]" />
                  <span className="text-[11px] font-bold text-[#ffa502]">{unjournaled.length} trade{unjournaled.length > 1 ? 's' : ''} need journaling</span>
                </div>
                <div className="space-y-1.5">
                  {unjournaled.map(t => (
                    <button key={t.id} onClick={() => startEdit(t)}
                      className="w-full flex items-center gap-3 px-3 py-2 bg-[#040c14] border border-[#1a2d4a] rounded-lg hover:border-[#ffa502]/40 transition-colors text-left">
                      <div className={`text-xs font-bold ${t.side === 'long' ? 'text-up' : 'text-down'}`}>{t.symbol}</div>
                      <div className="text-[10px] text-[#7f93b5]">{t.side.toUpperCase()} · {t.quantity} shares</div>
                      <div className={`mono text-xs font-bold ml-auto ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}
                      </div>
                      <span className="text-[9px] text-[#ffa502] border border-[#ffa502]/40 px-1.5 py-0.5 rounded">Journal →</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Journal entry form */}
            {editingId && (() => {
              const trade = closedTrades.find(t => t.id === editingId)
              if (!trade) return null
              return (
                <div className="p-4 border-b border-[#1a2d4a] bg-[#071220]">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-sm font-black text-[#cdd6f4]">
                        {trade.symbol} {trade.side.toUpperCase()} — {trade.quantity} shares
                      </div>
                      <div className={`mono text-sm font-bold ${trade.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)} · Entry ${trade.entryPrice.toFixed(2)} → Exit ${trade.exitPrice.toFixed(2)}
                      </div>
                    </div>
                    <button onClick={() => setEditingId(null)} className="text-[11px] text-[#4a5e7a] hover:text-[#7f93b5]">Cancel</button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Setup Type</label>
                      <select value={form.setupType || ''} onChange={e => setForm(p => ({ ...p, setupType: e.target.value }))}
                        className="w-full bg-[#040c14] border border-[#1a2d4a] rounded-lg px-2 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#a855f7]">
                        <option value="">Select...</option>
                        {SETUP_TYPES.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Emotional State</label>
                      <select value={form.emotion || ''} onChange={e => setForm(p => ({ ...p, emotion: e.target.value }))}
                        className="w-full bg-[#040c14] border border-[#1a2d4a] rounded-lg px-2 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#a855f7]">
                        <option value="">Select...</option>
                        {EMOTIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Market Condition</label>
                      <select value={form.condition || ''} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                        className="w-full bg-[#040c14] border border-[#1a2d4a] rounded-lg px-2 py-2 text-xs text-[#cdd6f4] outline-none focus:border-[#a855f7]">
                        <option value="">Select...</option>
                        {CONDITIONS.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Execution Grade</label>
                      <div className="flex gap-1">
                        {GRADES.map(g => (
                          <button key={g} onClick={() => setForm(p => ({ ...p, grade: g }))}
                            className={`flex-1 py-2 text-xs font-black rounded-lg border transition-colors ${
                              form.grade === g ? 'text-[#040c14] border-transparent' : 'text-[#4a5e7a] border-[#1a2d4a] hover:border-[#1e3a5f]'
                            }`}
                            style={form.grade === g ? { background: GRADE_COLOR[g] } : {}}>
                            {g}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="text-[9px] text-[#4a5e7a] uppercase tracking-wider block mb-1.5">Notes — What did you do right? What would you change?</label>
                    <textarea value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                      rows={3} placeholder="Entry was clean. Held through the first pullback. Should have sized up at the breakout..."
                      className="w-full bg-[#040c14] border border-[#1a2d4a] rounded-lg px-3 py-2 text-xs text-[#cdd6f4] outline-none resize-none focus:border-[#a855f7]" />
                  </div>

                  <button onClick={() => save(editingId)}
                    className="w-full py-2.5 bg-[#a855f7] hover:bg-[#b96ef8] text-white font-bold text-sm rounded-xl transition-colors shadow-[0_0_20px_rgba(168,85,247,0.3)]">
                    Save Journal Entry
                  </button>
                </div>
              )
            })()}

            {/* Logged entries */}
            {closedTrades.filter(t => journal[t.id]).map(t => {
              const e = journal[t.id]
              return (
                <div key={t.id} className="px-4 py-3 border-b border-[#1a2d4a]/50 hover:bg-[#071220] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-black text-[#cdd6f4]">{t.symbol}</span>
                        <span className={`text-[9px] font-bold ${t.side === 'long' ? 'text-up' : 'text-down'}`}>{t.side.toUpperCase()}</span>
                        <span className={`mono text-xs font-bold ${t.pnl >= 0 ? 'text-up' : 'text-down'}`}>{t.pnl >= 0 ? '+' : ''}${t.pnl.toFixed(2)}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-black ml-auto" style={{ color: GRADE_COLOR[e.grade], background: `${GRADE_COLOR[e.grade]}20` }}>{e.grade}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[9px] bg-[#a855f7]/15 text-[#a855f7] px-1.5 py-0.5 rounded font-mono">{e.setupType}</span>
                        <span className="text-[9px] bg-[#1e90ff]/15 text-[#1e90ff] px-1.5 py-0.5 rounded font-mono">{e.emotion}</span>
                        <span className="text-[9px] text-[#4a5e7a]">{format(new Date(t.closedAt), 'MMM d, h:mm a')}</span>
                      </div>
                      {e.notes && <p className="text-[10px] text-[#4a5e7a] mt-1 leading-snug line-clamp-1 italic">&ldquo;{e.notes}&rdquo;</p>}
                    </div>
                    <button onClick={() => startEdit(t)} className="text-[9px] text-[#4a5e7a] hover:text-[#7f93b5] shrink-0">Edit</button>
                  </div>
                </div>
              )
            })}

            {closedTrades.length === 0 && (
              <div className="flex flex-col items-center justify-center h-48 text-center p-8">
                <BookOpen size={24} className="text-[#1a2d4a] mb-3" />
                <p className="text-[12px] text-[#4a5e7a]">No trades to journal yet</p>
                <p className="text-[10px] text-[#4a5e7a] mt-1">Close a trade in the Trade tab to start journaling</p>
              </div>
            )}
          </div>
        )}

        {/* INSIGHTS */}
        {tab === 'insights' && (
          <div className="h-full overflow-y-auto p-4">
            {!analytics ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Brain size={32} className="text-[#1a2d4a] mb-3" />
                <p className="text-[12px] text-[#4a5e7a]">Journal at least 3 trades to unlock insights</p>
                <p className="text-[10px] text-[#4a5e7a] mt-1">Your patterns will emerge automatically</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-wider">{analytics.total} trades analyzed</div>

                <div className="grid grid-cols-2 gap-3">
                  {analytics.bestSetup && (
                    <Insight
                      label="Best Setup"
                      value={`${Math.round(analytics.bestSetup[1].wins / analytics.bestSetup[1].total * 100)}% win rate`}
                      detail={`${analytics.bestSetup[0]} · ${analytics.bestSetup[1].total} trades · $${analytics.bestSetup[1].pnl.toFixed(0)} P&L`}
                      color="#00d4aa"
                    />
                  )}
                  {analytics.worstSetup && (
                    <Insight
                      label="Avoid This Setup"
                      value={`${Math.round(analytics.worstSetup[1].wins / analytics.worstSetup[1].total * 100)}% win rate`}
                      detail={`${analytics.worstSetup[0]} · ${analytics.worstSetup[1].total} trades — consider sizing down`}
                      color="#ff4757"
                    />
                  )}
                  {analytics.calmWinRate && (
                    <Insight
                      label="When Calm & Focused"
                      value={`${analytics.calmWinRate}% win rate`}
                      detail="Your best mental state. Prioritize this."
                      color="#00d4aa"
                    />
                  )}
                  {analytics.fomoWinRate && (
                    <Insight
                      label="When FOMO"
                      value={`${analytics.fomoWinRate}% win rate`}
                      detail="FOMO trades underperform. Recognize and pause."
                      color="#ff4757"
                    />
                  )}
                  {analytics.bestDay && (
                    <Insight
                      label="Best Trading Day"
                      value={DAYS[parseInt(analytics.bestDay[0])]}
                      detail={`${Math.round(analytics.bestDay[1].wins / analytics.bestDay[1].total * 100)}% win rate — consider going bigger`}
                      color="#00d4aa"
                    />
                  )}
                  {analytics.worstDay && analytics.worstDay[0] !== analytics.bestDay?.[0] && (
                    <Insight
                      label="Worst Trading Day"
                      value={DAYS[parseInt(analytics.worstDay[0])]}
                      detail={`${Math.round(analytics.worstDay[1].wins / analytics.worstDay[1].total * 100)}% win rate — consider reducing size`}
                      color="#ff4757"
                    />
                  )}
                </div>

                {/* Emotion breakdown */}
                <div className="bg-[#040c14] rounded-xl border border-[#1a2d4a] p-4">
                  <div className="text-[10px] font-bold text-[#7f93b5] uppercase tracking-wider mb-3">Emotion vs Win Rate</div>
                  {Object.entries(analytics.byEmotion)
                    .filter(([, v]) => v.total >= 1)
                    .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
                    .map(([emotion, stats]) => {
                      const wr = Math.round(stats.wins / stats.total * 100)
                      const color = wr >= 60 ? '#00d4aa' : wr >= 40 ? '#ffa502' : '#ff4757'
                      return (
                        <div key={emotion} className="flex items-center gap-3 mb-2">
                          <span className="text-[10px] text-[#7f93b5] w-36 shrink-0">{emotion}</span>
                          <div className="flex-1 h-2 bg-[#0f1f38] rounded-full overflow-hidden">
                            <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
                          </div>
                          <span className="mono text-[10px] font-bold w-12 text-right" style={{ color }}>{wr}%</span>
                          <span className="text-[9px] text-[#4a5e7a] w-12 text-right">{stats.total} trades</span>
                        </div>
                      )
                    })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* PATTERNS */}
        {tab === 'patterns' && (
          <div className="h-full overflow-y-auto p-4">
            {!analytics ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Target size={32} className="text-[#1a2d4a] mb-3" />
                <p className="text-[12px] text-[#4a5e7a]">Journal at least 3 trades to find patterns</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-wider">Setup Performance Breakdown</div>
                {Object.entries(analytics.bySetup)
                  .sort((a, b) => b[1].pnl - a[1].pnl)
                  .map(([setup, stats]) => {
                    const wr = Math.round(stats.wins / stats.total * 100)
                    const color = wr >= 60 ? '#00d4aa' : wr >= 40 ? '#ffa502' : '#ff4757'
                    return (
                      <div key={setup} className="bg-[#040c14] rounded-xl border border-[#1a2d4a] p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-[#cdd6f4]">{setup}</span>
                          <div className="flex items-center gap-3 text-[10px]">
                            <span className="text-[#4a5e7a]">{stats.total} trades</span>
                            <span className={`mono font-bold ${stats.pnl >= 0 ? 'text-up' : 'text-down'}`}>{stats.pnl >= 0 ? '+' : ''}${stats.pnl.toFixed(0)}</span>
                            <span className="mono font-bold" style={{ color }}>{wr}% WR</span>
                          </div>
                        </div>
                        <div className="h-1.5 bg-[#0f1f38] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wr}%`, background: color }} />
                        </div>
                      </div>
                    )
                  })}

                {/* Grade breakdown */}
                <div className="text-[10px] font-bold text-[#4a5e7a] uppercase tracking-wider mt-4">Execution Grade Analysis</div>
                {GRADES.filter(g => analytics.byGrade[g]).map(g => {
                  const stats = analytics.byGrade[g]
                  const wr = Math.round(stats.wins / stats.total * 100)
                  return (
                    <div key={g} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm shrink-0"
                        style={{ background: `${GRADE_COLOR[g]}20`, color: GRADE_COLOR[g] }}>{g}</div>
                      <div className="flex-1">
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="text-[#7f93b5]">{stats.total} trades</span>
                          <span className="mono font-bold" style={{ color: GRADE_COLOR[g] }}>{wr}% win rate · ${stats.pnl.toFixed(0)} P&L</span>
                        </div>
                        <div className="h-1.5 bg-[#0f1f38] rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${wr}%`, background: GRADE_COLOR[g] }} />
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div className="p-3 bg-[#a855f7]/5 border border-[#a855f7]/20 rounded-xl">
                  <p className="text-[10px] text-[#7f93b5] leading-relaxed">
                    <strong className="text-[#a855f7]">Pro tip:</strong> Grade A trades should be your biggest positions. If your Grade A win rate is lower than Grade B, you&apos;re being overconfident on your &ldquo;best&rdquo; setups.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      {/* AI Coach tab */}
      {tab === 'ai-coach' && (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="bg-[#a855f710] border border-[#a855f730] rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bot size={14} className="text-[#a855f7]" />
              <span className="text-[11px] font-bold text-[#a855f7] uppercase tracking-wider">Gemini AI Coach</span>
            </div>
            <p className="text-[11px] text-[#7f93b5] leading-relaxed mb-3">
              Your AI coach analyzes all your journal data — setups, emotions, grades, timing — and finds patterns you can&apos;t see yourself. Needs at least 5 journaled trades.
            </p>
            {Object.keys(journal).length < 5 ? (
              <p className="text-[11px] text-[#4a5e7a]">Log {5 - Object.keys(journal).length} more trades to unlock AI coaching.</p>
            ) : (
              <button
                disabled={aiCoachLoading}
                onClick={async () => {
                  if (!analytics) return
                  setAiCoachLoading(true)
                  setAiCoach('')
                  const totalTrades = Object.keys(journal).length
                  const winRate = Math.round((Object.values(journal).filter((_, idx) => {
                    const t = closedTrades[idx]; return t && t.pnl > 0
                  }).length / totalTrades) * 100)
                  const mistakes = Object.values(journal).map(j => j.notes).filter(Boolean).slice(0, 5)
                  try {
                    const res = await fetch('/api/gemini', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ type: 'journal_coach', data: {
                        totalTrades,
                        winRate: isNaN(winRate) ? 'N/A' : winRate,
                        bestSetup: analytics?.bestSetup?.[0] ?? 'N/A',
                        bestSetupWinRate: analytics?.bestSetup ? Math.round(analytics.bestSetup[1].wins / analytics.bestSetup[1].total * 100) : 'N/A',
                        worstSetup: analytics?.worstSetup?.[0] ?? 'N/A',
                        worstSetupWinRate: analytics?.worstSetup ? Math.round(analytics.worstSetup[1].wins / analytics.worstSetup[1].total * 100) : 'N/A',
                        bestEmotion: analytics?.calmWinRate !== undefined ? `Calm & Focused (${analytics.calmWinRate}% WR)` : 'N/A',
                        worstEmotion: analytics?.fomoWinRate !== undefined ? `FOMO (${analytics.fomoWinRate}% WR)` : 'N/A',
                        bestTime: analytics?.bestDay ? `${DAYS[parseInt(analytics.bestDay[0])]}` : 'N/A',
                        avgGrade: 'B',
                        commonMistakes: mistakes,
                      }})
                    })
                    const json = await res.json()
                    setAiCoach(json.analysis || 'Could not generate analysis.')
                  } catch { setAiCoach('Connection error — try again.') }
                  setAiCoachLoading(false)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-[#a855f7] text-white text-[11px] font-bold rounded-lg hover:bg-[#b970f7] transition-colors disabled:opacity-60">
                <Bot size={12} /> {aiCoachLoading ? 'Analyzing your data...' : 'Run AI Coach Analysis'}
              </button>
            )}
          </div>
          {aiCoach && (
            <div className="bg-[#040c14] border border-[#1a2d4a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Bot size={13} className="text-[#a855f7]" />
                <span className="text-[10px] font-bold text-[#a855f7] uppercase tracking-wider">Your Personalized Analysis</span>
              </div>
              <p className="text-[12px] text-[#cdd6f4] leading-relaxed whitespace-pre-line">{aiCoach}</p>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
