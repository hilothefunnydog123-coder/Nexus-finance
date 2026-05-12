'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface Notification {
  id: string
  type: 'rank-up' | 'rank-down' | 'ai-trade' | 'warning' | 'info'
  message: string
  ts: number
}

const COLORS = {
  'rank-up':   { bg: '#00ffa320', border: '#00ffa340', text: '#00ffa3', icon: '↑' },
  'rank-down': { bg: '#ffcc0015', border: '#ffcc0035', text: '#ffcc00', icon: '↓' },
  'ai-trade':  { bg: '#8855ff18', border: '#8855ff35', text: '#8855ff', icon: '🤖' },
  'warning':   { bg: '#ff770015', border: '#ff770035', text: '#ff7700', icon: '⚠️' },
  'info':      { bg: '#0088ff12', border: '#0088ff30', text: '#0088ff', icon: 'ℹ' },
}

let _push: ((n: Omit<Notification, 'id' | 'ts'>) => void) | null = null

export function pushNotification(n: Omit<Notification, 'id' | 'ts'>) {
  _push?.(n)
}

export function NotificationStack() {
  const [notes, setNotes] = useState<Notification[]>([])

  const push = useCallback((n: Omit<Notification, 'id' | 'ts'>) => {
    const note: Notification = { ...n, id: crypto.randomUUID(), ts: Date.now() }
    setNotes(prev => [...prev.slice(-2), note])
  }, [])

  useEffect(() => { _push = push; return () => { _push = null } }, [push])

  useEffect(() => {
    if (notes.length === 0) return
    const t = window.setTimeout(() => {
      setNotes(prev => prev.filter(n => Date.now() - n.ts < 5000))
    }, 5100)
    return () => window.clearTimeout(t)
  }, [notes])

  if (notes.length === 0) return null

  return (
    <div style={{ position: 'fixed', top: 70, right: 20, zIndex: 8888, display: 'flex', flexDirection: 'column', gap: 8, pointerEvents: 'none' }}>
      <style>{`
        @keyframes yn-toast-in  { from{opacity:0;transform:translateX(48px)} to{opacity:1;transform:translateX(0)} }
        @keyframes yn-toast-out { from{opacity:1} to{opacity:0} }
      `}</style>
      {notes.map((n, i) => {
        const c = COLORS[n.type]
        const age = Date.now() - n.ts
        return (
          <div key={n.id} style={{
            background: c.bg, border: `1px solid ${c.border}`, borderLeft: `3px solid ${c.text}`,
            borderRadius: 10, padding: '10px 14px', maxWidth: 300, backdropFilter: 'blur(8px)',
            animation: age > 4500 ? 'yn-toast-out 0.4s ease forwards' : 'yn-toast-in 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            boxShadow: `0 4px 20px ${c.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 14 }}>{c.icon}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: c.text, lineHeight: 1.4 }}>{n.message}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
