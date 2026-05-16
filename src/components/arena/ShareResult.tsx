'use client'

interface ShareResultProps {
  name: string
  rank: number
  total: number
  pnlPct: number
  payout: number
  contest: string
}

const RANK_LABEL: Record<number, string> = { 1: '🥇 1st Place', 2: '🥈 2nd Place', 3: '🥉 3rd Place' }

export default function ShareResult({ name, rank, total, pnlPct, contest, payout }: ShareResultProps) {
  const pos     = pnlPct >= 0
  const rankLbl = RANK_LABEL[rank] ?? `#${rank} Place`
  const cashed  = payout > 0

  function handleShare() {
    const text = `I finished ${rankLbl} in the YN Arena ${contest} — ${pos ? '+' : ''}${pnlPct.toFixed(1)}% P&L${cashed ? ` and won $${payout}` : ''}! 🏆 Trade with me at ynfinance.org`
    if (navigator.share) {
      navigator.share({ title: 'YN Arena Result', text, url: 'https://ynfinance.org/arena' }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).catch(() => {})
      alert('Result copied to clipboard!')
    }
  }

  function handleTwitter() {
    const text = encodeURIComponent(`I finished ${rankLbl} in the YN Arena ${contest} — ${pos ? '+' : ''}${pnlPct.toFixed(1)}% P&L${cashed ? ` and won $${payout}` : ''}! 🏆`)
    window.open(`https://x.com/intent/post?text=${text}&url=${encodeURIComponent('https://ynfinance.org/arena')}`, '_blank')
  }

  return (
    <div style={{ fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Card */}
      <div style={{
        width: 320,
        background: 'linear-gradient(135deg, #0d1117 0%, #161b22 100%)',
        border: '1px solid #f59e0b40',
        borderRadius: 20,
        padding: '28px 24px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow */}
        <div style={{ position: 'absolute', top: -40, right: -40, width: 120, height: 120, background: '#f59e0b20', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }}/>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20 }}>
          <div style={{ width: 24, height: 24, background: 'linear-gradient(135deg, #00d4aa, #1e90ff)', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>⚡</div>
          <span style={{ color: '#8b949e', fontSize: 12, fontWeight: 600, letterSpacing: '0.05em' }}>YN ARENA · {contest.toUpperCase()}</span>
        </div>

        {/* Rank badge */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <div style={{ fontSize: 36, marginBottom: 4 }}>{RANK_LABEL[rank]?.split(' ')[0] ?? '🏆'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#f59e0b' }}>{rankLbl}</div>
          <div style={{ color: '#8b949e', fontSize: 13, marginTop: 2 }}>{name}</div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: cashed ? 16 : 0 }}>
          {[
            { label: 'P&L', value: `${pos ? '+' : ''}${pnlPct.toFixed(1)}%`, color: pos ? '#22c55e' : '#ef4444' },
            { label: 'Score', value: total.toLocaleString(), color: '#e6edf3' },
            { label: 'Rank', value: `#${rank}`, color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} style={{ background: '#0d1117', borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.color, fontFamily: 'monospace' }}>{s.value}</div>
              <div style={{ fontSize: 10, color: '#484f58', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Payout */}
        {cashed && (
          <div style={{ background: '#052e16', border: '1px solid #22c55e30', borderRadius: 12, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#86efac', fontSize: 13, fontWeight: 600 }}>💰 Cash Prize</span>
            <span style={{ color: '#22c55e', fontSize: 20, fontWeight: 800, fontFamily: 'monospace' }}>${payout}</span>
          </div>
        )}

        {/* Watermark */}
        <div style={{ textAlign: 'center', marginTop: 16, color: '#484f58', fontSize: 11 }}>ynfinance.org/arena</div>
      </div>

      {/* Share buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 12 }}>
        <button
          onClick={handleTwitter}
          style={{ padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fafafa', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <span>𝕏</span> Post
        </button>
        <button
          onClick={handleShare}
          style={{ padding: '10px', background: '#18181b', border: '1px solid #27272a', borderRadius: 10, color: '#fafafa', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          📤 Share
        </button>
      </div>
    </div>
  )
}
