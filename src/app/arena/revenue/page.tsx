'use client'

import { useState } from 'react'

// ─── CONSTANTS ───────────────────────────────────────────────────────────────

const RAKE_RATE = 0.12
const DAILY_TOURNAMENT_PRESETS = [
  { label: 'Conservative (today)', entries: 120, avgFee: 10 },
  { label: 'Current run-rate',     entries: 390, avgFee: 12 },
  { label: 'Growth target (90d)',  entries: 900, avgFee: 14 },
]

const GROWTH_MONTHS = [1, 2, 3, 6, 12]

// Rough CPM estimates by ad unit
const AD_UNITS = [
  { name: 'Adsterra Banner (728×90)', impressionsPerDay: 1800, cpm: 1.40 },
  { name: 'Native Ad — Prop Firm',    impressionsPerDay: 800,  cpm: 4.50 },
  { name: 'Native Ad — Broker',       impressionsPerDay: 600,  cpm: 2.80 },
  { name: 'Native Ad — Tool',         impressionsPerDay: 400,  cpm: 1.90 },
]

const CREATOR_REFERRAL_COST_PER_ENTRY = 0.50  // estimated CPA split with streamers
const FIXED_MONTHLY_COSTS = [
  { name: 'Netlify Pro',       amount: 19   },
  { name: 'Supabase Pro',      amount: 25   },
  { name: 'Finnhub API',       amount: 0    },
  { name: 'Resend (email)',    amount: 20   },
  { name: 'Domain & misc',     amount: 15   },
]

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function fmt(n: number, decimals = 0) {
  return n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}
function fmtUSD(n: number, decimals = 0) {
  return '$' + fmt(n, decimals)
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

export default function RevenueDashboard() {
  const [presetIdx, setPresetIdx] = useState(1)
  const [customEntries, setCustomEntries] = useState('')
  const [customFee, setCustomFee] = useState('')

  const preset = DAILY_TOURNAMENT_PRESETS[presetIdx]
  const entries = customEntries !== '' ? Number(customEntries) : preset.entries
  const avgFee  = customFee !== ''    ? Number(customFee)     : preset.avgFee

  const dailyGross  = entries * avgFee
  const dailyRake   = dailyGross * RAKE_RATE
  const dailyPrize  = dailyGross * (1 - RAKE_RATE)
  const dailyCreatorCost = entries * CREATOR_REFERRAL_COST_PER_ENTRY

  const dailyAdRevenue = AD_UNITS.reduce((sum, u) => sum + (u.impressionsPerDay * u.cpm) / 1000, 0)
  const dailyNetRevenue = dailyRake + dailyAdRevenue - dailyCreatorCost

  const monthlyFixed = FIXED_MONTHLY_COSTS.reduce((s, c) => s + c.amount, 0)
  const monthlyNetRevenue30 = dailyNetRevenue * 30 - monthlyFixed
  const breakEvenEntries = Math.ceil((dailyCreatorCost / entries + monthlyFixed / 30) / (avgFee * RAKE_RATE + dailyAdRevenue / entries))

  const T = {
    bg:       '#09090b',
    surface:  '#0d1117',
    card:     '#161b22',
    border:   '#21262d',
    border2:  '#30363d',
    text:     '#f0f6fc',
    muted:    '#8b949e',
    dim:      '#484f58',
    green:    '#3fb950',
    blue:     '#58a6ff',
    yellow:   '#d29922',
    red:      '#f85149',
    purple:   '#bc8cff',
  }

  return (
    <div style={{ background: T.bg, minHeight: '100vh', color: T.text, fontFamily: 'Inter, system-ui, sans-serif', padding: '40px 24px' }}>
      <style>{`*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 10 }}>
            YN Finance · Internal
          </div>
          <h1 style={{ fontSize: 32, fontWeight: 900, letterSpacing: -1, lineHeight: 1.1, marginBottom: 8 }}>
            Revenue Dashboard
          </h1>
          <p style={{ fontSize: 14, color: T.muted }}>
            Real-time projections for tournament rake, ad revenue, and operating costs.
            Founders only — not public.
          </p>
        </div>

        {/* Preset selector */}
        <div style={{ marginBottom: 32, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {DAILY_TOURNAMENT_PRESETS.map((p, i) => (
            <button
              key={p.label}
              onClick={() => { setPresetIdx(i); setCustomEntries(''); setCustomFee('') }}
              style={{
                padding: '7px 14px',
                borderRadius: 8,
                border: `1px solid ${i === presetIdx && customEntries === '' && customFee === '' ? T.blue : T.border}`,
                background: i === presetIdx && customEntries === '' && customFee === '' ? `${T.blue}15` : T.card,
                color: i === presetIdx && customEntries === '' && customFee === '' ? T.blue : T.muted,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Custom inputs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 40, flexWrap: 'wrap' }}>
          {[
            { label: 'Daily entries', value: customEntries, setter: setCustomEntries, placeholder: String(preset.entries) },
            { label: 'Avg entry fee ($)', value: customFee, setter: setCustomFee, placeholder: String(preset.avgFee) },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <div style={{ fontSize: 11, color: T.dim, marginBottom: 5, fontWeight: 600 }}>{label}</div>
              <input
                type="number"
                value={value}
                onChange={e => setter(e.target.value)}
                placeholder={placeholder}
                style={{
                  background: T.card,
                  border: `1px solid ${T.border}`,
                  borderRadius: 8,
                  padding: '8px 12px',
                  color: T.text,
                  fontSize: 13,
                  width: 140,
                  outline: 'none',
                }}
              />
            </div>
          ))}
        </div>

        {/* ── TODAY'S TOURNAMENT ROW ── */}
        <Section title="01 — Today's Tournament" color={T.green}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
            {[
              { label: 'Entries',     value: fmt(entries),          sub: 'traders today'          },
              { label: 'Avg Fee',     value: fmtUSD(avgFee, 2),     sub: 'per entry'              },
              { label: 'Gross Pool',  value: fmtUSD(dailyGross),    sub: 'total entry fees'       },
              { label: 'Rake (12%)',  value: fmtUSD(dailyRake, 2),  sub: 'YN Finance cut',        accent: T.green },
              { label: 'Prize Pool',  value: fmtUSD(dailyPrize),    sub: 'paid to winners'        },
              { label: 'Creator Cost',value: fmtUSD(dailyCreatorCost, 2), sub: '$0.50/entry referral' },
            ].map(s => (
              <StatCard key={s.label} {...s} T={T} />
            ))}
          </div>
          <div style={{ marginTop: 20, padding: '14px 16px', background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, fontSize: 13, color: T.muted, lineHeight: 1.7 }}>
            Formula: <span style={{ color: T.text, fontFamily: 'monospace' }}>{fmt(entries)} entries × {fmtUSD(avgFee, 2)} fee = {fmtUSD(dailyGross)} gross → {fmtUSD(dailyRake, 2)} rake (12%)</span>
          </div>
        </Section>

        {/* ── AD REVENUE ── */}
        <Section title="02 — Ad Impression Revenue" color={T.blue}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
            {AD_UNITS.map(u => {
              const daily = (u.impressionsPerDay * u.cpm) / 1000
              return (
                <div key={u.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: T.dim, marginBottom: 6, fontWeight: 600 }}>{u.name}</div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: T.blue, fontFamily: 'monospace', marginBottom: 2 }}>{fmtUSD(daily, 2)}/day</div>
                  <div style={{ fontSize: 11, color: T.muted }}>{fmt(u.impressionsPerDay)} impr × ${u.cpm.toFixed(2)} CPM</div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Daily Ad Revenue',   value: fmtUSD(dailyAdRevenue, 2),          accent: T.blue },
              { label: 'Monthly Ad Revenue', value: fmtUSD(dailyAdRevenue * 30, 0),     accent: T.blue },
              { label: 'Annual Run-Rate',    value: fmtUSD(dailyAdRevenue * 365, 0),    accent: T.blue },
            ].map(s => (
              <StatCard key={s.label} {...s} T={T} sub="" />
            ))}
          </div>
          <p style={{ fontSize: 12, color: T.dim, marginTop: 12, lineHeight: 1.6 }}>
            CPM estimates based on fintech/trader audience. Prop firm native ads earn significantly higher CPM ($4–6) than standard display. Actual rates vary by fill and geography.
          </p>
        </Section>

        {/* ── MONTHLY PROJECTION ── */}
        <Section title="03 — Monthly Projection & Break-Even" color={T.yellow}>
          <div style={{ overflowX: 'auto', marginBottom: 20 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Month', 'Entry Growth', 'Rake Revenue', 'Ad Revenue', 'Creator Costs', 'Fixed Costs', 'Net Revenue'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, color: T.dim, fontWeight: 700, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {GROWTH_MONTHS.map(m => {
                  const growthFactor = Math.pow(1.15, m - 1)  // 15% MoM growth assumption
                  const mEntries  = Math.round(entries * growthFactor)
                  const mGross    = mEntries * avgFee * 30
                  const mRake     = mGross * RAKE_RATE
                  const mAds      = dailyAdRevenue * 30 * growthFactor
                  const mCreator  = mEntries * CREATOR_REFERRAL_COST_PER_ENTRY * 30
                  const mFixed    = monthlyFixed
                  const mNet      = mRake + mAds - mCreator - mFixed
                  return (
                    <tr key={m} style={{ borderBottom: `1px solid ${T.border}`, background: m === 1 ? `${T.yellow}08` : 'transparent' }}>
                      <td style={{ padding: '10px 12px', color: T.muted, fontWeight: 600 }}>Month {m}</td>
                      <td style={{ padding: '10px 12px', color: T.text, fontFamily: 'monospace' }}>{fmt(mEntries)}/day</td>
                      <td style={{ padding: '10px 12px', color: T.green, fontFamily: 'monospace', fontWeight: 700 }}>{fmtUSD(mRake)}</td>
                      <td style={{ padding: '10px 12px', color: T.blue, fontFamily: 'monospace', fontWeight: 700 }}>{fmtUSD(mAds, 0)}</td>
                      <td style={{ padding: '10px 12px', color: T.red, fontFamily: 'monospace' }}>-{fmtUSD(mCreator, 0)}</td>
                      <td style={{ padding: '10px 12px', color: T.red, fontFamily: 'monospace' }}>-{fmtUSD(mFixed)}</td>
                      <td style={{ padding: '10px 12px', color: mNet >= 0 ? T.green : T.red, fontFamily: 'monospace', fontWeight: 900 }}>{mNet >= 0 ? '' : '-'}{fmtUSD(Math.abs(mNet))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p style={{ fontSize: 12, color: T.dim, lineHeight: 1.6 }}>
            Assumes 15% month-over-month entry growth from organic/creator referral traffic.
          </p>
        </Section>

        {/* ── OPERATING COSTS ── */}
        <Section title="04 — Fixed Monthly Costs" color={T.red}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
            {FIXED_MONTHLY_COSTS.map(c => (
              <div key={c.name} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
                <span style={{ color: T.muted }}>{c.name}: </span>
                <span style={{ color: c.amount === 0 ? T.green : T.text, fontFamily: 'monospace', fontWeight: 700 }}>
                  {c.amount === 0 ? 'Free' : fmtUSD(c.amount)}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total Fixed/mo', value: fmtUSD(monthlyFixed), accent: T.red, sub: 'infrastructure' },
              { label: 'Fixed/day',      value: fmtUSD(monthlyFixed / 30, 2), accent: T.red, sub: 'amortized' },
              { label: 'Break-Even',     value: `${fmt(breakEvenEntries)} entries/day`, accent: T.yellow, sub: 'to cover all costs' },
            ].map(s => (
              <StatCard key={s.label} {...s} T={T} />
            ))}
          </div>
        </Section>

        {/* ── NET SUMMARY ── */}
        <div style={{ background: T.card, border: `1px solid ${T.border2}`, borderRadius: 14, padding: '28px 24px', marginTop: 8 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: T.dim, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 20 }}>
            Net Summary — Current Run-Rate
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 20 }}>
            {[
              { label: 'Daily Rake',       value: fmtUSD(dailyRake, 2),            color: T.green  },
              { label: 'Daily Ads',        value: fmtUSD(dailyAdRevenue, 2),        color: T.blue   },
              { label: 'Daily Creator Cost',value: `-${fmtUSD(dailyCreatorCost, 2)}`,color: T.red   },
              { label: 'Daily Net',        value: fmtUSD(dailyNetRevenue, 2),        color: dailyNetRevenue >= 0 ? T.green : T.red },
              { label: 'Monthly Net',      value: fmtUSD(monthlyNetRevenue30),       color: monthlyNetRevenue30 >= 0 ? T.green : T.red },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: T.dim, marginBottom: 4, fontWeight: 600 }}>{label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color, fontFamily: 'monospace', letterSpacing: -0.5 }}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 40, paddingTop: 24, borderTop: `1px solid ${T.border}`, fontSize: 11, color: T.dim, lineHeight: 1.7 }}>
          Internal tool · YN Finance founders only · All figures are projections based on current data and assumptions.
          CPM estimates sourced from fintech publisher benchmarks. Creator referral costs assume $0.50/entry average.
          Stripe payout processing fees (~2.9% + $0.30) not reflected in rake calculations above.
        </div>

      </div>
    </div>
  )
}

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

function Section({ title, color, children }: { title: string; color: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 32 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div style={{ width: 3, height: 20, background: color, borderRadius: 2, flexShrink: 0 }} />
        <h2 style={{ fontSize: 14, fontWeight: 800, color: '#f0f6fc', letterSpacing: -0.2 }}>{title}</h2>
      </div>
      <div style={{ background: '#161b22', border: '1px solid #21262d', borderRadius: 12, padding: '20px 20px' }}>
        {children}
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, accent, T }: { label: string; value: string; sub: string; accent?: string; T: Record<string, string> }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px', minWidth: 140 }}>
      <div style={{ fontSize: 11, color: T.dim, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: accent ?? T.text, fontFamily: 'monospace', letterSpacing: -0.5 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{sub}</div>}
    </div>
  )
}
