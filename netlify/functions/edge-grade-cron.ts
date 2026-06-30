import type { Config } from '@netlify/functions'

// YN Edge — settlement grading cron. After the US close, grade every YN Edge
// market whose close time has passed against Kalshi's settlement: Brier score,
// hit, and realized ROI of the worth-it picks flow into the public track record.
const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/edge/track-record`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[YNEdgeGrade] completed:', JSON.stringify({ resolved: data.resolved, due: data.due }))
  } catch (e) {
    console.error('[YNEdgeGrade] error:', e)
  }
}

export const config: Config = {
  // 22:30 UTC weekdays — after the US close, settle YN Edge markets.
  schedule: '30 22 * * 1-5',
}
