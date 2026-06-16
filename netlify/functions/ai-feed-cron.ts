import type { Config } from '@netlify/functions'

const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/ai-feed`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[AIFeed] completed:', JSON.stringify({ created: data.created, emailed: data.emailed }))
  } catch (e) {
    console.error('[AIFeed] error:', e)
  }
}

export const config: Config = {
  // Every hour, every day — the AI is always watching; it only posts what clears
  // the importance bar (filtered server-side), so the feed stays signal-only.
  schedule: '0 * * * *',
}
