'use client'

/**
 * YN Edge — filters + search (Phase 4d). Controlled component: the board owns the
 * state, this renders the chips/sliders/search and reports changes. Pure client,
 * reduced-motion safe, mobile-responsive (wraps).
 */
import { SlidersHorizontal, X, CheckCircle2, Search } from 'lucide-react'
import { CYAN, GREEN, MONO, BORDER, TXT, MUTE, FAINT, PANEL, VOID, catColor } from './shared'
import type { EdgeCategory } from '@/lib/edge/types'

export interface EdgeFilterState {
  category: EdgeCategory | 'All'
  minEdge: number      // 0..0.3 decimal
  minVolume: number    // contracts
  worthOnly: boolean
  search: string
}

export const DEFAULT_FILTERS: EdgeFilterState = {
  category: 'All',
  minEdge: 0,
  minVolume: 0,
  worthOnly: false,
  search: '',
}

const CATEGORIES: (EdgeCategory | 'All')[] = ['All', 'Financials', 'Crypto', 'Economics', 'Politics', 'Weather', 'Tech', 'Culture', 'World', 'Other']

export function Filters({
  state,
  onChange,
  categoriesPresent,
  resultCount,
}: {
  state: EdgeFilterState
  onChange: (next: EdgeFilterState) => void
  categoriesPresent?: string[]
  resultCount?: number
}) {
  const set = (patch: Partial<EdgeFilterState>) => onChange({ ...state, ...patch })
  const cats = CATEGORIES.filter((c) => c === 'All' || !categoriesPresent || categoriesPresent.includes(c))
  const dirty =
    state.category !== DEFAULT_FILTERS.category ||
    state.minEdge !== DEFAULT_FILTERS.minEdge ||
    state.minVolume !== DEFAULT_FILTERS.minVolume ||
    state.worthOnly !== DEFAULT_FILTERS.worthOnly ||
    state.search.trim() !== ''

  return (
    <div style={{ background: PANEL, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 'clamp(12px,2vw,18px)', display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.16em', textTransform: 'uppercase', color: FAINT }}>
          <SlidersHorizontal size={13} style={{ color: CYAN, flexShrink: 0 }} />
          Filter the board
        </span>
        {dirty && (
          <button
            type="button"
            onClick={() => onChange({ ...DEFAULT_FILTERS })}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: MONO, fontSize: 10.5, letterSpacing: '0.1em', textTransform: 'uppercase', color: MUTE, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <X size={13} style={{ flexShrink: 0 }} /> Reset
          </button>
        )}
      </div>

      {/* search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1 1 240px', minWidth: 0 }}>
          <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: FAINT, pointerEvents: 'none' }} />
          <input
            value={state.search}
            onChange={(e) => set({ search: e.target.value })}
            placeholder="Search markets — Bitcoin, Fed, S&P, election…"
            aria-label="Search markets"
            style={{ width: '100%', minWidth: 0, background: VOID, border: `1px solid ${BORDER}`, borderRadius: 6, color: TXT, fontSize: 13, padding: '9px 12px 9px 34px', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
          <button
            type="button"
            onClick={() => set({ worthOnly: !state.worthOnly })}
            aria-pressed={state.worthOnly}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: MONO, fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: state.worthOnly ? VOID : MUTE, background: state.worthOnly ? GREEN : 'transparent', border: `1px solid ${state.worthOnly ? GREEN : BORDER}`, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', boxShadow: state.worthOnly ? `0 0 18px ${GREEN}44` : 'none' }}
          >
            <CheckCircle2 size={14} strokeWidth={2.5} style={{ flexShrink: 0 }} /> Worth it only
          </button>
        </label>
      </div>

      {/* category chips */}
      <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
        {cats.map((c) => {
          const active = state.category === c
          const col = c === 'All' ? CYAN : catColor(c)
          return (
            <button
              key={c}
              type="button"
              onClick={() => set({ category: c })}
              style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: active ? VOID : col, background: active ? col : `${col}12`, border: `1px solid ${active ? col : col + '40'}`, padding: '5px 11px', borderRadius: 100, cursor: 'pointer', transition: 'all .2s', fontWeight: active ? 700 : 500 }}
            >
              {c}
            </button>
          )
        })}
      </div>

      {/* sliders + count */}
      <div style={{ display: 'flex', gap: 'clamp(16px,4vw,40px)', flexWrap: 'wrap', alignItems: 'center' }}>
        <SliderField
          label="Min edge"
          value={`${(state.minEdge * 100).toFixed(0)}pt`}
          input={
            <input type="range" min={0} max={30} step={1} value={Math.round(state.minEdge * 100)} onChange={(e) => set({ minEdge: Number(e.target.value) / 100 })} aria-label="Minimum edge" style={{ accentColor: CYAN, width: 130 }} />
          }
        />
        <SliderField
          label="Min volume"
          value={state.minVolume >= 1000 ? `${(state.minVolume / 1000).toFixed(0)}k` : String(state.minVolume)}
          input={
            <input type="range" min={0} max={200} step={5} value={Math.min(200, state.minVolume / 1000)} onChange={(e) => set({ minVolume: Number(e.target.value) * 1000 })} aria-label="Minimum volume" style={{ accentColor: CYAN, width: 130 }} />
          }
        />
        {resultCount != null && (
          <span style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em', color: MUTE }}>
            <span style={{ color: CYAN, fontWeight: 700 }}>{resultCount}</span> MARKET{resultCount === 1 ? '' : 'S'} SHOWN
          </span>
        )}
      </div>
    </div>
  )
}

function SliderField({ label, value, input }: { label: string; value: string; input: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{ fontFamily: MONO, fontSize: 9.5, letterSpacing: '0.14em', textTransform: 'uppercase', color: FAINT }}>
        {label} · <span style={{ color: CYAN }}>{value}</span>
      </span>
      {input}
    </div>
  )
}

/** Apply filters client-side (shared by board so it can re-filter without refetch). */
export function applyFilters<T extends { market: { category: string; title: string; volume: number }; verdict: { edge: number; worthIt: boolean } }>(
  rows: T[],
  f: EdgeFilterState
): T[] {
  const q = f.search.trim().toLowerCase()
  return rows.filter((r) => {
    if (f.category !== 'All' && r.market.category !== f.category) return false
    if (f.worthOnly && !r.verdict.worthIt) return false
    if (r.verdict.edge < f.minEdge) return false
    if (r.market.volume < f.minVolume) return false
    if (q && !r.market.title.toLowerCase().includes(q)) return false
    return true
  })
}
