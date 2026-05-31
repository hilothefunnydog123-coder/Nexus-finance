import type { Config } from '@netlify/functions'

// Netlify auto-sets URL to the deploy URL (e.g. https://nexusmoney.netlify.app)
const SITE_URL = process.env.URL ?? 'https://nexusmoney.netlify.app'
const SECRET   = process.env.AGENT_POLL_SECRET ?? ''

export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/agents/poll`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[AgentPoller] completed:', JSON.stringify(data))
  } catch (e) {
    console.error('[AgentPoller] error:', e)
  }
}

export const config: Config = {
  schedule: '*/5 * * * *', // every 5 minutes
}
