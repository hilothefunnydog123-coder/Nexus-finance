import { NextRequest, NextResponse } from 'next/server'
import { sendApiSignupConfirmationEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()
    if (email) await sendApiSignupConfirmationEmail(String(email).trim().toLowerCase())
  } catch { /* best-effort */ }
  return NextResponse.json({ ok: true })
}
