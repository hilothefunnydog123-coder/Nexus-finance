import type { Config } from '@netlify/functions'

// Runs Mon–Fri at 08:30 AM ET (12:30 UTC) — 1 hour before NY open
// Warms the /api/daily-intel cache so subscribers get instant loads
export default async function handler() {
  const base = process.env.URL ?? 'https://ynfinance.org'

  try {
    const res = await fetch(`${base}/api/daily-intel`, {
      headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
      // no-store forces a fresh generation, bypassing CDN cache
      cache: 'no-store',
    })
    const data = await res.json()
    const status = data.demo ? 'demo_mode' : 'generated'
    console.log(`[daily-intel-cron] ${status} at ${new Date().toISOString()}`)
    return { statusCode: 200, body: JSON.stringify({ status, time: new Date().toISOString() }) }
  } catch (err) {
    console.error('[daily-intel-cron] failed:', err)
    return { statusCode: 500, body: 'Failed to warm cache' }
  }
}

export const config: Config = {
  // Cron syntax: min hour day month weekday
  schedule: '30 12 * * 1-5', // 12:30 UTC = 8:30 AM ET
}
