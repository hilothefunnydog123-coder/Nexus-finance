import type { Config } from '@netlify/functions'

const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/email/daily`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[DailyEmail] completed:', JSON.stringify({ sent: data.sent, failed: data.failed }))
  } catch (e) {
    console.error('[DailyEmail] error:', e)
  }
}

export const config: Config = {
  // 13:20 UTC weekdays — ~20 min after the Bull Board generates, before the open.
  schedule: '20 13 * * 1-5',
}
