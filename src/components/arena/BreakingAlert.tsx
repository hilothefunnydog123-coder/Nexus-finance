'use client'

import { useEffect } from 'react'

interface BreakingAlertProps {
  message: string
  type: 'win' | 'rank' | 'entry' | 'close'
  onDismiss: () => void
}

const TYPE_STYLES: Record<BreakingAlertProps['type'], { bg: string; text: string; border: string }> = {
  win:   { bg: '#14532d', text: '#4ade80', border: '#16a34a' },
  rank:  { bg: '#451a03', text: '#fbbf24', border: '#d97706' },
  entry: { bg: '#0c1a2e', text: '#60a5fa', border: '#2563eb' },
  close: { bg: '#3b0a0a', text: '#f87171', border: '#dc2626' },
}

export default function BreakingAlert({ message, type, onDismiss }: BreakingAlertProps) {
  const styles = TYPE_STYLES[type]

  useEffect(() => {
    const t = setTimeout(onDismiss, 4000)
    return () => clearTimeout(t)
  }, [onDismiss])

  return (
    <>
      <style>{`
        @keyframes slide-alert {
          0%   { transform: translateY(-100%); opacity: 0; }
          10%  { transform: translateY(0);     opacity: 1; }
          85%  { transform: translateY(0);     opacity: 1; }
          100% { transform: translateY(-100%); opacity: 0; }
        }
        .yn-breaking-alert {
          animation: slide-alert 4s ease forwards;
        }
      `}</style>
      <div
        className="yn-breaking-alert"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 44,
          zIndex: 10000,
          background: styles.bg,
          borderBottom: `2px solid ${styles.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
        }}
        onClick={onDismiss}
      >
        <span style={{
          fontSize: 13,
          fontWeight: 700,
          color: styles.text,
          letterSpacing: '0.02em',
          textAlign: 'center',
        }}>
          {message}
        </span>
      </div>
    </>
  )
}
