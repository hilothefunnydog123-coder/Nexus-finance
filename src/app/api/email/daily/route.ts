import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const FROM = process.env.EMAIL_FROM || 'YN Finance <noreply@ynfinance.org>'
const SITE = process.env.URL || 'https://ynfinance.org'

function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

type Pick = { rank: number; ticker: string; price: number; target: number; pct: number }

function rows(picks: Pick[], up: boolean) {
  return picks
    .slice(0, up ? 8 : 4)
    .map(
      (p) => `<tr>
        <td style="padding:8px 10px;color:#8a93a8;font:13px ui-monospace,monospace">#${p.rank}</td>
        <td style="padding:8px 10px;font-weight:700;color:#0b1020">$${p.ticker}</td>
        <td style="padding:8px 10px;color:#5e5e68;font:13px ui-monospace,monospace">$${Number(p.price).toFixed(2)} &rarr; <b style="color:#0b1020">$${Number(p.target).toFixed(2)}</b></td>
        <td style="padding:8px 10px;text-align:right;font-weight:700;color:${up ? '#16a34a' : '#dc2626'}">${up ? '&#9650;' : '&#9660;'} ${Math.abs(Number(p.pct)).toFixed(2)}%</td>
      </tr>`
    )
    .join('')
}

function buildHtml(bulls: Pick[], bears: Pick[], date: string, unsubToken: string) {
  return `<div style="background:#f4f1fb;padding:24px;font-family:Inter,system-ui,sans-serif">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:18px;overflow:hidden;border:1px solid #eee">
    <div style="padding:22px 24px;background:linear-gradient(135deg,#06b6d4,#a855f7);color:#fff">
      <div style="font-size:13px;letter-spacing:1px;text-transform:uppercase;opacity:.85">BrainStock &middot; ${date}</div>
      <div style="font-size:22px;font-weight:800;margin-top:4px">Today's AI Bull Board</div>
    </div>
    <div style="padding:18px 24px">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#16a34a;font-weight:700;margin-bottom:6px">Top bull calls</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows(bulls, true)}</table>
      ${
        bears.length
          ? `<div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#dc2626;font-weight:700;margin:18px 0 6px">Top bear calls</div>
      <table style="width:100%;border-collapse:collapse;font-size:14px">${rows(bears, false)}</table>`
          : ''
      }
      <a href="${SITE}" style="display:inline-block;margin-top:20px;background:#0b1020;color:#fff;text-decoration:none;padding:11px 18px;border-radius:10px;font-weight:700;font-size:14px">Open BrainStock &rarr;</a>
      <a href="${SITE}/brainstock/track-record" style="display:inline-block;margin:20px 0 0 10px;color:#7c3aed;text-decoration:none;font-weight:600;font-size:14px">See the track record</a>
      <p style="margin-top:22px;font-size:11px;color:#9a9aa4;line-height:1.5">Model estimates ranked by predicted next-session move. Not financial advice. <a href="${SITE}/api/subscribe?unsub=${unsubToken}" style="color:#9a9aa4">Unsubscribe</a></p>
    </div>
  </div>
</div>`
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.AGENT_POLL_SECRET
  if (secret && auth && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const key = process.env.RESEND_API_KEY
  const admin = getAdmin()
  if (!key || !admin) return NextResponse.json({ error: 'Email or DB not configured' }, { status: 500 })

  const { data: board } = await admin
    .from('daily_picks')
    .select('trade_date,picks,bears')
    .order('trade_date', { ascending: false })
    .limit(1)
    .maybeSingle()
  const bulls = (board?.picks ?? []) as Pick[]
  const bears = (board?.bears ?? []) as Pick[]
  const date = board?.trade_date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' })
  if (!bulls.length) return NextResponse.json({ sent: 0, failed: 0, note: 'no board yet' })

  const { data: subs } = await admin.from('subscribers').select('email').eq('active', true).limit(5000)
  const list = (subs || []) as { email: string }[]
  if (!list.length) return NextResponse.json({ sent: 0, failed: 0, note: 'no subscribers' })

  const resend = new Resend(key)
  let sent = 0
  let failed = 0
  for (const s of list) {
    const token = Buffer.from(s.email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: s.email,
        subject: `${bulls[0]?.ticker} +${Number(bulls[0]?.pct).toFixed(1)}% - today's AI Bull Board`,
        html: buildHtml(bulls, bears, date, token),
      })
      if (error) failed++
      else sent++
    } catch {
      failed++
    }
  }
  return NextResponse.json({ sent, failed })
}
