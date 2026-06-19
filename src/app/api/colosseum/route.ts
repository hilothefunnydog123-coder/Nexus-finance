import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { fetchBars } from '@/lib/forecast'
import { featurize, predict } from '@/lib/nn'
import { loadTrainedModel } from '@/lib/nnStore'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try { return createClient(SUPA_URL, SERVICE) } catch { return null }
}
function etDate() { return new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) }

const UNIVERSE = ['AAPL', 'NVDA', 'TSLA', 'MSFT', 'AMZN', 'META', 'GOOGL', 'AMD', 'NFLX', 'AVGO', 'PLTR', 'COIN', 'MSTR', 'JPM', 'SPY', 'QQQ', 'CRM', 'ADBE', 'INTC', 'MU', 'SMCI', 'UBER', 'DIS', 'BA', 'XOM', 'WMT', 'SHOP', 'ARM']

const BOTS = [
  { id: 'brainstock', name: 'BrainStock', strategy: 'Neural net' },
  { id: 'momentum', name: 'Momentum Mike', strategy: 'Chase strength · 20d' },
  { id: 'reversion', name: 'Dip Diana', strategy: 'Buy the dip · 5d' },
  { id: 'lowvol', name: 'Steady Sam', strategy: 'Lowest volatility' },
  { id: 'chance', name: 'Coin Flip', strategy: 'Pure random' },
]
const PICKS = 5

type Stat = { ticker: string; last: number; ret5: number; ret20: number; vol: number; nn: number }

async function pool<T, R>(items: T[], n: number, budget: number, fn: (t: T) => Promise<R | null>): Promise<R[]> {
  const out: R[] = []; const start = Date.now(); let i = 0
  async function w() { while (i < items.length) { if (Date.now() - start > budget) return; const it = items[i++]; try { const r = await fn(it); if (r) out.push(r) } catch { /* skip */ } } }
  await Promise.all(Array.from({ length: n }, w)); return out
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ready: false, bots: [] })
  try {
    const { data } = await admin.from('colosseum').select('*').order('equity', { ascending: false })
    const bots = (data || []).map((b) => {
      const hist = (b.history || []) as { date: string; equity: number }[]
      return {
        id: b.id, name: b.name, strategy: b.strategy,
        equity: +Number(b.equity).toFixed(2),
        ret: +((Number(b.equity) / 100000 - 1) * 100).toFixed(2),
        steps: b.steps ?? 0,
        bestDay: +(b.best_day ?? 0).toFixed(2),
        worstDay: +(b.worst_day ?? 0).toFixed(2),
        picks: ((b.last_picks || []) as { ticker: string }[]).map((p) => p.ticker),
        history: hist.slice(-90),
      }
    })
    return NextResponse.json({ ready: bots.length > 0 && (bots[0]?.steps ?? 0) > 0, bots }, { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } })
  } catch {
    return NextResponse.json({ ready: false, bots: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth !== `Bearer ${secret}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'no db' }, { status: 500 })

  const model = await loadTrainedModel(admin)
  const today = etDate()

  // One snapshot of the universe drives every bot's decisions + marks.
  const stats = await pool<string, Stat>(UNIVERSE, 10, 42000, async (ticker) => {
    const bars = await fetchBars(ticker)
    const c = bars.map((b) => b.c)
    const n = c.length
    if (n < 30) return null
    const last = c[n - 1]
    const ret5 = (last - c[n - 6]) / c[n - 6]
    const ret20 = (last - c[n - 21]) / c[n - 21]
    const rets: number[] = []
    for (let i = n - 20; i < n; i++) rets.push((c[i] - c[i - 1]) / c[i - 1])
    const mean = rets.reduce((s, x) => s + x, 0) / rets.length
    const vol = Math.sqrt(rets.reduce((s, x) => s + (x - mean) ** 2, 0) / rets.length)
    let nn = ret5 // fallback if no model
    if (model) { const f = featurize(bars.map((b) => ({ c: b.c, h: b.h, l: b.l, v: b.v }))); if (f) nn = predict(model, f) }
    return { ticker, last, ret5, ret20, vol, nn }
  })
  if (stats.length < PICKS) return NextResponse.json({ error: 'not enough market data' }, { status: 502 })
  const priceOf = new Map(stats.map((s) => [s.ticker, s.last]))

  function choose(id: string): string[] {
    const s = [...stats]
    if (id === 'brainstock') s.sort((a, b) => b.nn - a.nn)
    else if (id === 'momentum') s.sort((a, b) => b.ret20 - a.ret20)
    else if (id === 'reversion') s.sort((a, b) => a.ret5 - b.ret5)
    else if (id === 'lowvol') s.sort((a, b) => a.vol - b.vol)
    else { for (let i = s.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[s[i], s[j]] = [s[j], s[i]] } }
    return s.slice(0, PICKS).map((x) => x.ticker)
  }

  // ensure all bots exist
  const { data: existing } = await admin.from('colosseum').select('id')
  const have = new Set((existing || []).map((b) => b.id))
  for (const b of BOTS) if (!have.has(b.id)) await admin.from('colosseum').insert({ id: b.id, name: b.name, strategy: b.strategy })

  const { data: rows } = await admin.from('colosseum').select('*')
  const bots = (rows || []) as { id: string; equity: number; last_picks: { ticker: string; entry: number }[]; history: { date: string; equity: number }[]; steps: number; best_day: number; worst_day: number }[]

  let stepped = 0
  for (const bot of bots) {
    // already stepped today?
    const hist = (bot.history || []) as { date: string; equity: number }[]
    if (hist.length && hist[hist.length - 1].date === today) continue

    let equity = Number(bot.equity) || 100000
    let dayRet = 0
    const lastPicks = (bot.last_picks || []) as { ticker: string; entry: number }[]
    if (lastPicks.length) {
      const rs = lastPicks.map((p) => { const cur = priceOf.get(p.ticker); return cur && p.entry ? (cur - p.entry) / p.entry : 0 })
      dayRet = rs.reduce((s, x) => s + x, 0) / rs.length
      equity = +(equity * (1 + dayRet)).toFixed(2)
    }
    const newPicks = choose(bot.id).map((t) => ({ ticker: t, entry: priceOf.get(t)! }))
    const newHist = [...hist, { date: today, equity }].slice(-160)

    await admin.from('colosseum').update({
      equity,
      last_picks: newPicks,
      last_pick_date: today,
      history: newHist,
      steps: (bot.steps ?? 0) + 1,
      best_day: Math.max(bot.best_day ?? 0, +(dayRet * 100).toFixed(2)),
      worst_day: Math.min(bot.worst_day ?? 0, +(dayRet * 100).toFixed(2)),
      updated_at: new Date().toISOString(),
    }).eq('id', bot.id)
    stepped++
  }

  return NextResponse.json({ stepped, universe: stats.length })
}
