'use client'

import { Trophy } from 'lucide-react'

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const BG = '#09090b'
const SU = '#18181b'
const BO = '#27272a'
const GD = '#eab308'
const G  = '#22c55e'
const TE = '#fafafa'
const MT = '#a1a1aa'
const DM = '#71717a'

// Prize weight distribution for ranks 1–10
const PRIZE_WEIGHTS = [0.30, 0.18, 0.12, 0.08, 0.06, 0.03, 0.03, 0.03, 0.03, 0.03]

interface PrizeTableProps {
  entries: number
  fee: number
  maxPaid?: number
}

function medal(rank: number): string {
  if (rank === 1) return '🥇'
  if (rank === 2) return '🥈'
  if (rank === 3) return '🥉'
  return ''
}

function rankColor(rank: number): string {
  if (rank === 1) return GD
  if (rank <= 3)  return MT
  if (rank <= 10) return TE
  return DM
}

export default function PrizeTable({ entries, fee, maxPaid = 10 }: PrizeTableProps) {
  const gross  = entries * fee
  const pool   = Math.floor(gross * 0.88)
  const rake   = gross - pool
  const paid   = Math.min(maxPaid, PRIZE_WEIGHTS.length)

  // Dollar amount for each paid rank
  const rows = Array.from({ length: paid }, (_, i) => ({
    rank:   i + 1,
    pct:    PRIZE_WEIGHTS[i] * 100,
    dollar: Math.floor(pool * PRIZE_WEIGHTS[i]),
  }))

  // Top 20% of field is in the money
  const inMoneyCount = Math.max(paid, Math.ceil(entries * 0.2))

  return (
    <div style={{
      background: SU, border: `1px solid ${BO}`, borderRadius: 12,
      overflow: 'hidden', fontFamily: 'Inter,system-ui,sans-serif',
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 18px', borderBottom: `1px solid ${BO}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        background: BG,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: `${GD}18`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Trophy size={13} color={GD} />
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 800, color: TE, lineHeight: 1.2 }}>
              Prize Breakdown
            </div>
            <div style={{ fontSize: 11, color: DM, marginTop: 2 }}>
              {entries.toLocaleString()} entries × ${fee} · top 20% paid
            </div>
          </div>
        </div>

        {/* Pool pill */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: G, fontFamily: 'monospace', letterSpacing: -0.5, lineHeight: 1 }}>
            ${pool.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: DM, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 2 }}>
            prize pool
          </div>
        </div>
      </div>

      {/* Pool math strip */}
      <div style={{
        padding: '10px 18px', background: `${G}08`,
        borderBottom: `1px solid ${BO}`, display: 'flex',
        gap: 0, flexWrap: 'wrap',
      }}>
        {[
          { label: 'Gross',      val: `$${gross.toLocaleString()}`,  c: MT },
          { label: '×',          val: '',                            c: DM },
          { label: '88% pool',   val: `$${pool.toLocaleString()}`,   c: G  },
          { label: '+',          val: '',                            c: DM },
          { label: '12% rake',   val: `$${rake.toLocaleString()}`,   c: DM },
        ].map((item, i) => (
          item.val === '' ? (
            <span key={i} style={{ fontSize: 16, color: DM, padding: '0 8px', alignSelf: 'center' }}>
              =
            </span>
          ) : (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', padding: '0 10px' }}>
              <span style={{ fontSize: 10, color: DM, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                {item.label}
              </span>
              <span style={{ fontSize: 14, fontWeight: 800, color: item.c, fontFamily: 'monospace' }}>
                {item.val}
              </span>
            </div>
          )
        ))}
      </div>

      {/* Rank rows */}
      {rows.map(row => {
        const isFirst  = row.rank === 1
        const multiple = fee > 0 ? (row.dollar / fee).toFixed(1) : '—'
        return (
          <div
            key={row.rank}
            style={{
              display: 'grid',
              gridTemplateColumns: '36px 28px 1fr 80px 70px',
              padding: '10px 18px',
              borderBottom: `1px solid ${BO}`,
              background: isFirst ? `${GD}08` : row.rank <= 3 ? `${G}05` : 'transparent',
              alignItems: 'center',
            }}
          >
            {/* Medal */}
            <span style={{ fontSize: 15 }}>{medal(row.rank)}</span>

            {/* Rank number */}
            <span style={{
              fontSize: 11, fontWeight: 700,
              color: rankColor(row.rank), fontFamily: 'monospace',
            }}>
              #{row.rank}
            </span>

            {/* Pool % bar */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                <div style={{
                  height: 4, borderRadius: 2, overflow: 'hidden',
                  background: BO, flex: 1, maxWidth: 100,
                }}>
                  <div style={{
                    width: `${(row.pct / 30) * 100}%`,
                    height: '100%',
                    background: isFirst ? GD : row.rank <= 3 ? G : `${G}60`,
                    borderRadius: 2,
                    transition: 'width 0.4s',
                  }} />
                </div>
                <span style={{ fontSize: 11, color: DM, fontFamily: 'monospace', flexShrink: 0 }}>
                  {row.pct}%
                </span>
              </div>
            </div>

            {/* Dollar amount */}
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: isFirst ? 17 : 14, fontWeight: 900,
                color: isFirst ? GD : row.rank <= 3 ? G : TE,
                fontFamily: 'monospace', letterSpacing: -0.3,
              }}>
                ${row.dollar.toLocaleString()}
              </div>
            </div>

            {/* Multiplier */}
            <div style={{ textAlign: 'right' }}>
              <span style={{
                fontSize: 11, fontWeight: 700,
                color: isFirst ? GD : DM,
                background: isFirst ? `${GD}14` : `${BO}`,
                padding: '2px 6px', borderRadius: 4,
                fontFamily: 'monospace',
              }}>
                ×{multiple}
              </span>
            </div>
          </div>
        )
      })}

      {/* Footer info row */}
      <div style={{
        padding: '10px 18px', background: BG,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G }} />
            <span style={{ fontSize: 11, color: DM }}>
              Top 20% of field paid ({inMoneyCount.toLocaleString()} players)
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: DM }} />
            <span style={{ fontSize: 11, color: DM }}>12% house rake</span>
          </div>
        </div>
        <a
          href="/arena/how-it-works"
          style={{ fontSize: 11, color: G, textDecoration: 'none', fontWeight: 600 }}
        >
          How prizes work →
        </a>
      </div>
    </div>
  )
}
