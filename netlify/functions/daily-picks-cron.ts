import type { Config } from '@netlify/functions'

// Netlify auto-sets URL to the deploy URL.
const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/daily-picks`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[DailyPicks] completed:', JSON.stringify({ ok: data.ok, attempted: data.attempted, succeeded: data.succeeded, stored: data.stored }))
  } catch (e) {
    console.error('[DailyPicks] error:', e)
  }
}

export const config: Config = {
  // 13:00 UTC, weekdays — ~9am ET, before the open, for that day's session.
  schedule: '0 13 * * 1-5',
}
