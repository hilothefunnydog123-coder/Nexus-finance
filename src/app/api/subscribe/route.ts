import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
function getAdmin() {
  if (!SUPA_URL.startsWith('http') || !SERVICE) return null
  try {
    return createClient(SUPA_URL, SERVICE)
  } catch {
    return null
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(req: NextRequest) {
  let body: { email?: string; tickers?: string[] } = {}
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const email = String(body.email ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 })
  const tickers = Array.isArray(body.tickers)
    ? body.tickers.map((t) => String(t).toUpperCase().trim()).filter((t) => /^[A-Z0-9.\-]{1,8}$/.test(t)).slice(0, 25)
    : []

  const admin = getAdmin()
  if (!admin) return NextResponse.json({ ok: true, note: 'not stored (no db in this env)' })
  try {
    await admin.from('subscribers').upsert({ email, tickers, active: true }, { onConflict: 'email' })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Could not subscribe right now.' }, { status: 500 })
  }
}

// One-click unsubscribe: /api/subscribe?unsub=<base64url(email)>
export async function GET(req: NextRequest) {
  const token = new URL(req.url).searchParams.get('unsub') || ''
  let email = ''
  try {
    email = Buffer.from(token.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8')
  } catch {
    email = ''
  }
  const admin = getAdmin()
  if (email && admin) {
    try {
      await admin.from('subscribers').update({ active: false }).eq('email', email.toLowerCase())
    } catch {
      /* ignore */
    }
  }
  return new NextResponse(
    `<!doctype html><meta charset="utf-8"><title>Unsubscribed</title><body style="font-family:system-ui;background:#070b14;color:#e7ecf5;display:grid;place-items:center;height:100vh;margin:0"><div style="text-align:center"><h1 style="font-weight:700">You're unsubscribed.</h1><p style="color:#8a93a8">You won't get the daily BrainStock email anymore.</p><a href="https://ynfinance.org" style="color:#22d3ee">← ynfinance.org</a></div></body>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}
