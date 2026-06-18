import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { forecastTicker } from '@/lib/forecast'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const SITE = process.env.URL || 'https://ynfinance.org'
const FROM = process.env.EMAIL_FROM || 'YN Finance <noreply@ynfinance.org>'

function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

type NewsItem = { headline: string; summary: string; url: string; source: string; related: string }
type Gen = { idx: number; hook: string; insight: string; importance: number; ticker: string | null; category: string }

async function fetchNews(): Promise<NewsItem[]> {
  const key = process.env.FINNHUB_API_KEY
  if (!key) return []
  try {
    const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`, { cache: 'no-store' })
    if (!r.ok) return []
    const all = (await r.json()) as NewsItem[]
    return (all || []).filter((n) => n.headline && n.url).slice(0, 14)
  } catch {
    return []
  }
}

// One Gemini call turns a batch of headlines into punchy AI takes.
async function generate(items: NewsItem[]): Promise<Gen[]> {
  const key = process.env.GEMINI_API_KEY
  if (!key || !items.length) return []
  const list = items.map((n, i) => `${i}. ${n.headline}${n.summary ? ` — ${n.summary.slice(0, 180)}` : ''}`).join('\n')
  const prompt = `You are BrainStock, the in-house market-watcher AI for YN Finance (a Gen-Z investing platform). From the headlines below, select ONLY the genuinely meaningful, market-relevant stories a young investor should actually know (anywhere from 0 to 6 — be picky; skip filler, fluff, celebrity gossip, ads, and minor noise). Write a sharp, plain-English take on each.

For each, return:
- "idx": the headline's number
- "hook": a short scroll-stopping teaser, often a question (e.g. "Eyeing the SpaceX IPO?", "Nvidia just did WHAT?") — max 60 chars
- "insight": 1-2 punchy sentences with a real opinion/angle. Honest, never hype, never financial advice.
- "importance": 1-5 (5 = market-moving, most people should know)
- "ticker": the most relevant US stock ticker in CAPS, or null if none
- "category": one of "ipo","earnings","macro","mover","crypto","news"

Return ONLY a JSON array. Headlines:
${list}`
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.75, responseMimeType: 'application/json', thinkingConfig: { thinkingBudget: 0 } },
      }),
    })
    const j = await res.json()
    const text = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? '[]'
    const parsed = JSON.parse(text)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function GET() {
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ posts: [] })
  try {
    const { data } = await admin.from('ai_posts').select('*').order('created_at', { ascending: false }).limit(24)
    return NextResponse.json(
      { posts: data || [] },
      { headers: { 'Cache-Control': 's-maxage=120, stale-while-revalidate=300' } }
    )
  } catch {
    return NextResponse.json({ posts: [] })
  }
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = getAdmin()
  if (!admin) return NextResponse.json({ error: 'no db' }, { status: 500 })

  const news = await fetchNews()
  if (!news.length) return NextResponse.json({ created: 0, note: 'no news' })

  // Skip stories we've already posted.
  const twoDaysAgo = new Date(Date.now() - 2 * 864e5).toISOString()
  const { data: existing } = await admin.from('ai_posts').select('source_url').gte('created_at', twoDaysAgo)
  const seen = new Set((existing || []).map((e: { source_url: string | null }) => e.source_url))
  const fresh = news.filter((n) => !seen.has(n.url))
  if (!fresh.length) return NextResponse.json({ created: 0, note: 'nothing new' })

  const gens = await generate(fresh.slice(0, 12))
  if (!gens.length) return NextResponse.json({ created: 0, note: 'no generations' })

  // Attach BrainStock forecasts (bounded) and build rows.
  let forecasts = 0
  const rows = [] as Record<string, unknown>[]
  for (const g of gens) {
    const item = fresh[g.idx]
    if (!item) continue
    let forecast: { price: number; target: number; pct: number; dirAcc: number } | null = null
    const t = (g.ticker || '').toUpperCase().trim()
    if (t && /^[A-Z]{1,5}$/.test(t) && forecasts < 5) {
      try {
        const f = await forecastTicker(t, 5)
        const price = f.history[f.history.length - 1].price
        const target = f.forecast[0].price
        forecast = {
          price,
          target,
          pct: +(((target - price) / price) * 100).toFixed(2),
          dirAcc: f.metrics.directional_accuracy,
        }
        forecasts++
      } catch {
        forecast = null
      }
    }
    rows.push({
      hook: String(g.hook || '').slice(0, 90),
      insight: String(g.insight || '').slice(0, 400),
      ticker: forecast ? t : null,
      forecast,
      importance: Math.max(1, Math.min(5, Number(g.importance) || 2)),
      category: g.category || 'news',
      source_url: item.url,
      emailed: false,
    })
  }
  // Only keep the genuinely meaningful ones — the feed/popup stay signal-only.
  const meaningful = rows.filter((r) => (r.importance as number) >= 3)
  if (!meaningful.length) return NextResponse.json({ created: 0, note: 'nothing important enough' })

  let storeErr: string | null = null
  try {
    const { error } = await admin.from('ai_posts').insert(meaningful)
    if (error) storeErr = error.message
  } catch (e) {
    storeErr = String(e)
  }
  if (storeErr) return NextResponse.json({ created: 0, storeErr })

  // Email the single most important fresh post — but cap alert emails to once a
  // day so we never spam subscribers, no matter how much news breaks.
  let emailed = 0
  const DAILY_ALERT_CAP = 1
  // Raise the bar to 5 (was 4): only a genuinely major story ever earns an email.
  const top = meaningful.filter((r) => (r.importance as number) >= 5).sort((a, b) => (b.importance as number) - (a.importance as number))[0]
  const key = process.env.RESEND_API_KEY
  let sentToday = 0
  if (top && key) {
    try {
      const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
      const { count } = await admin
        .from('ai_posts')
        .select('*', { count: 'exact', head: true })
        .eq('emailed', true)
        .gte('created_at', since)
      sentToday = count ?? 0
    } catch {
      /* if we can't tell, err on the side of NOT emailing */
      sentToday = DAILY_ALERT_CAP
    }
  }
  if (top && key && sentToday < DAILY_ALERT_CAP) {
    try {
      const { data: subs } = await admin.from('subscribers').select('email').eq('active', true).limit(5000)
      const list = (subs || []) as { email: string }[]
      if (list.length) {
        const resend = new Resend(key)
        const fc = top.forecast as { target: number; pct: number } | null
        const html = `<div style="background:#f4f1fb;padding:24px;font-family:Inter,system-ui,sans-serif"><div style="max-width:540px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #eee"><div style="padding:20px 24px;background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff"><div style="font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:.85">BrainStock AI &middot; market alert</div><div style="font-size:20px;font-weight:800;margin-top:4px">${top.hook}</div></div><div style="padding:20px 24px"><p style="font-size:15px;color:#26262e;line-height:1.55;margin:0">${top.insight}</p>${fc ? `<p style="margin-top:14px;font-size:14px;color:#5e5e68">BrainStock target on $${top.ticker}: <b style="color:#0b1020">$${fc.target.toFixed(2)}</b> (${fc.pct >= 0 ? '+' : ''}${fc.pct}%)</p>` : ''}<a href="${SITE}" style="display:inline-block;margin-top:18px;background:#0b1020;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700;font-size:14px">See the AI's full feed &rarr;</a></div></div></div>`
        for (const s of list) {
          try {
            await resend.emails.send({ from: FROM, to: s.email, subject: `🔔 ${top.hook}`, html })
            emailed++
          } catch {
            /* skip */
          }
        }
        await admin.from('ai_posts').update({ emailed: true }).eq('source_url', top.source_url as string)
      }
    } catch {
      /* ignore */
    }
  }

  return NextResponse.json({ created: meaningful.length, forecasts, emailed })
}
