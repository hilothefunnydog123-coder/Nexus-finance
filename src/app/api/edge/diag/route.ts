import { NextResponse } from 'next/server'
import { kalshiProbe, kalshiBoardSelfTest } from '@/lib/edge/kalshi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Diagnostic for the Kalshi connection + the FULL board pipeline. Visit
// /api/edge/diag on the live site. It (1) probes the raw signed API request and
// (2) runs the REAL pagination + normalize the board uses, so you can see whether
// the board falls to "offline seed" because the API failed or because normalize
// dropped every market. Never leaks the key.

export async function GET() {
  const [p, board] = await Promise.all([kalshiProbe(), kalshiBoardSelfTest()])

  let diagnosis: string
  if (!p.hasKeyId || !p.hasPrivateKey) {
    diagnosis = `The function does NOT see ${!p.hasKeyId ? 'KALSHI_KEY_ID' : ''}${!p.hasKeyId && !p.hasPrivateKey ? ' and ' : ''}${!p.hasPrivateKey ? 'KALSHI_PRIVATE_KEY' : ''}. Set it in Netlify env (Site config → Environment variables), then trigger a fresh deploy so functions pick it up.`
  } else if (!p.credsParsed) {
    diagnosis = `Both env vars are present, but the private key doesn't parse as a PEM (pemHasBegin=${p.pemHasBegin}, pemHasPrivateKeyMarker=${p.pemHasPrivateKeyMarker}). Paste the FULL key including the "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" lines.`
  } else if (!p.api?.ok) {
    diagnosis = `Key parses, but Kalshi rejected the signed request (HTTP ${p.api?.status}: ${p.api?.error || 'unknown'}). Likely the API key ID doesn't match this private key, the key is for the demo env, or the key was revoked. Re-create an API key at kalshi.com and update both env vars.`
  } else if (!board.live) {
    diagnosis = `Auth works (raw API returned ${p.api?.markets ?? 0} markets), but the BOARD pipeline produced 0 live markets. ${board.reason || 'unknown'}. This is why /edge shows the offline seed.`
  } else {
    const cats = Object.entries(board.categories).map(([k, v]) => `${k}:${v}`).join(', ')
    diagnosis = `All good — the board pipeline produced ${board.normalizedCount} LIVE markets from ${board.rawCount} raw across ${board.pagesFetched} page(s) in ${board.elapsedMs}ms. Categories: ${cats}. If /edge still shows seed, it's a stale CDN/browser cache — hard-refresh (Cmd+Shift+R).`
  }
  return NextResponse.json({ ...p, board, diagnosis }, { headers: { 'Cache-Control': 'no-store' } })
}
