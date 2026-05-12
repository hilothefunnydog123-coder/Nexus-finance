'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Trophy, Clock, Users, Zap, Filter } from 'lucide-react'

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday']
const SHORT = ['MON','TUE','WED','THU','FRI','SAT','SUN']

const TIER_COLOR: Record<string, string> = { standard: '#00ffa3', premium: '#8855ff', elite: '#ffcc00' }

interface TEvent {
  id: string; name: string; time: string; fee: number
  maxEntries: number; seeded: number; allowed: string; tier: string; recurring?: boolean
}

function buildSchedule(): Record<string, TEvent[]> {
  const base: TEvent[] = [
    { id:'blitz',    name:'Daily Blitz',      time:'9:30 AM ET', fee:10,  maxEntries:500,  seeded:390, allowed:'All Markets',  tier:'standard', recurring:true },
    { id:'crypto',   name:'Crypto Night',     time:'8:00 PM ET', fee:25,  maxEntries:250,  seeded:188, allowed:'Crypto Only',  tier:'premium'  },
    { id:'pro',      name:'Pro Showdown',     time:'9:30 AM ET', fee:100, maxEntries:100,  seeded:44,  allowed:'All Markets',  tier:'elite'    },
    { id:'forex',    name:'Forex Cup',        time:'10:00 AM ET',fee:25,  maxEntries:200,  seeded:67,  allowed:'Forex Only',   tier:'premium'  },
    { id:'futures',  name:'Futures Arena',    time:'9:30 AM ET', fee:50,  maxEntries:150,  seeded:31,  allowed:'Futures Only', tier:'elite'    },
    { id:'h2h',      name:'H2H $10 Duel',     time:'All Day',    fee:10,  maxEntries:2,    seeded:1,   allowed:'All Markets',  tier:'standard' },
    { id:'mega',     name:'Weekly Mega',      time:'9:30 AM ET', fee:25,  maxEntries:1000, seeded:712, allowed:'All Markets',  tier:'elite'    },
  ]
  const sched: Record<string, TEvent[]> = {}
  DAYS.forEach((day, i) => {
    const events: TEvent[] = []
    // Daily Blitz every day
    events.push(base[0])
    // Crypto Night Mon-Fri
    if (i < 5) events.push(base[1])
    // Pro Showdown Mon/Wed/Fri
    if ([0,2,4].includes(i)) events.push(base[2])
    // Forex Cup Tue/Thu
    if ([1,3].includes(i)) events.push(base[3])
    // Futures Arena Mon/Wed/Fri
    if ([0,2,4].includes(i)) events.push(base[4])
    // H2H every day
    events.push(base[5])
    // Weekly Mega on Monday only
    if (i === 0) events.push(base[6])
    sched[day] = events
  })
  return sched
}

const SCHEDULE = buildSchedule()
const FILTERS = ['All', '$10', '$25', '$50', '$100', 'H2H'] as const
type FilterType = typeof FILTERS[number]

export default function SchedulePage() {
  const [activeDay, setActiveDay] = useState(0)
  const [filter, setFilter] = useState<FilterType>('All')

  const today = DAYS[activeDay]
  const events = SCHEDULE[today].filter(e => {
    if (filter === 'All') return true
    if (filter === 'H2H') return e.id === 'h2h'
    return `$${e.fee}` === filter
  })

  const totalPool = (day: string) =>
    SCHEDULE[day].reduce((s, e) => s + Math.floor(e.seeded * e.fee * 0.8), 0)

  return (
    <div style={{ background: '#02030a', minHeight: '100vh', color: '#e8eaf0', fontFamily: 'Inter,system-ui,sans-serif' }}>

      {/* Nav */}
      <nav style={{ background: 'rgba(2,3,10,0.97)', borderBottom: '1px solid #0f1e38', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100, backdropFilter: 'blur(16px)' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', height: 54, gap: 14 }}>
          <Link href="/arena" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: 'linear-gradient(135deg,#00ffa3,#0088ff)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trophy size={13} color="#02030a" fill="#02030a" />
            </div>
            <span style={{ fontSize: 14, fontWeight: 900, color: '#fff' }}>YN Arena</span>
          </Link>
          <span style={{ color: '#1e3a5f' }}>›</span>
          <span style={{ fontSize: 13, color: '#00ffa3', fontWeight: 700 }}>Tournament Schedule</span>
          <div style={{ flex: 1 }} />
          <Link href="/arena" style={{ fontSize: 11, color: '#4a5e7a', textDecoration: 'none', padding: '5px 12px', border: '1px solid #0f1e38', borderRadius: 6 }}>← Arena</Link>
        </div>
      </nav>

      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 32, fontWeight: 900, color: '#fff', letterSpacing: -1, marginBottom: 8 }}>Weekly Schedule</h1>
          <p style={{ fontSize: 14, color: '#4a5e7a' }}>All tournaments run on simulated accounts · Entry fees real · Prizes real · Times ET</p>
        </div>

        {/* Day tabs */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 24, border: '1px solid #0f1e38', borderRadius: 12, overflow: 'hidden' }}>
          {DAYS.map((day, i) => (
            <button key={day} onClick={() => setActiveDay(i)}
              style={{ flex: 1, padding: '12px 4px', background: activeDay === i ? '#070c16' : 'transparent', border: 'none', borderRight: i < 6 ? '1px solid #0f1e38' : 'none', cursor: 'pointer', transition: 'all 0.15s' }}>
              <div style={{ fontSize: 9, fontWeight: 800, color: activeDay === i ? '#00ffa3' : '#4a5e7a', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{SHORT[i]}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: activeDay === i ? '#ffcc00' : '#2a4060', fontFamily: 'monospace' }}>${totalPool(day).toLocaleString()}</div>
            </button>
          ))}
        </div>

        {/* Filter */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4a5e7a', marginRight: 4 }}>
            <Filter size={11} /> Filter:
          </div>
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: '5px 14px', borderRadius: 20, fontSize: 11, fontWeight: 700, border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                background: filter === f ? '#00ffa3' : '#070c16',
                color: filter === f ? '#02030a' : '#4a5e7a',
                outline: filter === f ? 'none' : '1px solid #0f1e38',
              }}>{f}</button>
          ))}
        </div>

        {/* Recurring note */}
        <div style={{ background: '#00ffa310', border: '1px solid #00ffa330', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 12, color: '#00ffa3', display: 'flex', alignItems: 'center', gap: 8 }}>
          🔄 <strong>Daily Blitz</strong> runs every day at 9:30 AM ET — $10 entry, all markets, top 10 paid
        </div>

        {/* Events */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#2a4060', fontSize: 14 }}>No tournaments match this filter on {today}</div>
          ) : events.map(e => {
            const pool = Math.floor(e.seeded * e.fee * 0.8)
            const c = TIER_COLOR[e.tier]
            const fill = Math.round((e.seeded / e.maxEntries) * 100)
            return (
              <div key={e.id} style={{ background: '#070c16', border: `1px solid #0f1e38`, borderLeft: `3px solid ${c}`, borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
                {/* Time */}
                <div style={{ minWidth: 90, flexShrink: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: c, fontSize: 12, fontWeight: 700, fontFamily: 'monospace' }}>
                    <Clock size={11} /> {e.time}
                  </div>
                  {e.recurring && <div style={{ fontSize: 9, color: '#4a5e7a', marginTop: 3 }}>DAILY</div>}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 800, color: '#fff' }}>{e.name}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: c, background: `${c}18`, padding: '2px 7px', borderRadius: 4, textTransform: 'uppercase' as const }}>{e.tier}</span>
                  </div>
                  <div style={{ fontSize: 11, color: '#4a5e7a', marginBottom: 8 }}>{e.allowed}</div>
                  <div style={{ height: 3, background: '#0f1e38', borderRadius: 2, overflow: 'hidden', maxWidth: 160 }}>
                    <div style={{ width: `${fill}%`, height: '100%', background: fill > 80 ? '#ff7700' : c }} />
                  </div>
                  <div style={{ fontSize: 10, color: '#2a4060', marginTop: 4 }}>{e.seeded}/{e.maxEntries} registered{fill > 80 ? ' · filling fast' : ''}</div>
                </div>

                {/* Stats */}
                <div style={{ display: 'flex', gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 3 }}>Entry</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: c, fontFamily: 'monospace' }}>${e.fee}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 3 }}>Est. Pool</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#ffcc00', fontFamily: 'monospace' }}>${pool.toLocaleString()}</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 9, color: '#4a5e7a', textTransform: 'uppercase' as const, letterSpacing: '0.1em', marginBottom: 3 }}>Pays</div>
                    <div style={{ fontSize: 18, fontWeight: 900, color: '#0088ff', fontFamily: 'monospace' }}>Top 10</div>
                  </div>
                </div>

                {/* CTA */}
                <Link href="/arena"
                  style={{ padding: '10px 20px', background: `linear-gradient(135deg,${c},${c}cc)`, color: '#02030a', fontWeight: 800, fontSize: 12, borderRadius: 9, textDecoration: 'none', flexShrink: 0, whiteSpace: 'nowrap' as const }}>
                  Register →
                </Link>
              </div>
            )
          })}
        </div>

        {/* Footer note */}
        <div style={{ marginTop: 32, fontSize: 11, color: '#1e3a5f', lineHeight: 1.7 }}>
          Prize pool estimates based on current registrations. Final pool confirmed at tournament close. House takes 20% of all entries. All times Eastern. Subject to change.
        </div>
      </div>
    </div>
  )
}
