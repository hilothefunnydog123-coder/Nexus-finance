import type { Config } from '@netlify/functions'

const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/track-record`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[ResolvePicks] completed:', JSON.stringify({ resolved: data.resolved, remaining: data.remaining }))
  } catch (e) {
    console.error('[ResolvePicks] error:', e)
  }
  // Train the brain on any newly-resolved Beat-the-AI plays.
  try {
    const r = await fetch(`${SITE_URL}/api/brain`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'train' }),
    })
    const d = await r.json()
    console.log('[BrainTrain] completed:', JSON.stringify({ learned: d.learned, accuracy: d.accuracy }))
  } catch (e) {
    console.error('[BrainTrain] error:', e)
  }
}

export const config: Config = {
  // 22:00 UTC weekdays — after the US close, resolve any calls whose window ended.
  schedule: '0 22 * * 1-5',
}
