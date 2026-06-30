import type { Config } from '@netlify/functions'

const SITE_URL = process.env.URL ?? 'https://ynfinance.org'
const SECRET = process.env.AGENT_POLL_SECRET ?? ''

// Seal the day's calls before the open: forecast the universe with the net,
// hash each prediction into a leaf, and commit one signed daily Merkle root.
export default async function handler() {
  try {
    const res = await fetch(`${SITE_URL}/api/arena/seal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[ArenaSeal] completed:', JSON.stringify({ trade_date: data.trade_date, leaf_count: data.leaf_count, merkle_root: data.merkle_root, signed: data.signed, already_sealed: data.already_sealed }))
  } catch (e) {
    console.error('[ArenaSeal] error:', e)
  }

  // Then the rival AIs take their side on each sealed bout (also sealed).
  try {
    const res = await fetch(`${SITE_URL}/api/arena/opponents`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET}` },
    })
    const data = await res.json()
    console.log('[ArenaOpponents] completed:', JSON.stringify({ trade_date: data.trade_date, opponents: data.opponents, calls: data.calls }))
  } catch (e) {
    console.error('[ArenaOpponents] error:', e)
  }
}

export const config: Config = {
  // 13:05 UTC weekdays — just after daily-picks generates, before the US open.
  schedule: '5 13 * * 1-5',
}
