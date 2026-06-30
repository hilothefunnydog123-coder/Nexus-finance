import { NextResponse } from 'next/server'
import { kalshiProbe } from '@/lib/edge/kalshi'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Diagnostic for the Kalshi connection. Visit /api/edge/diag on the live site.
// Tells you, from inside the Netlify function, whether it sees KALSHI_KEY_ID +
// KALSHI_PRIVATE_KEY, whether the key PARSES, and whether a real signed request
// to Kalshi SUCCEEDS — with the actual HTTP status/error. Never leaks the key.

export async function GET() {
  const p = await kalshiProbe()
  let diagnosis: string
  if (!p.hasKeyId || !p.hasPrivateKey) {
    diagnosis = `The function does NOT see ${!p.hasKeyId ? 'KALSHI_KEY_ID' : ''}${!p.hasKeyId && !p.hasPrivateKey ? ' and ' : ''}${!p.hasPrivateKey ? 'KALSHI_PRIVATE_KEY' : ''}. Set it in Netlify env (Site config → Environment variables), then trigger a fresh deploy so functions pick it up.`
  } else if (!p.credsParsed) {
    diagnosis = `Both env vars are present, but the private key doesn't parse as a PEM (pemHasBegin=${p.pemHasBegin}, pemHasPrivateKeyMarker=${p.pemHasPrivateKeyMarker}). Paste the FULL key including the "-----BEGIN PRIVATE KEY-----" and "-----END PRIVATE KEY-----" lines.`
  } else if (!p.api?.ok) {
    diagnosis = `Key parses, but Kalshi rejected the signed request (HTTP ${p.api?.status}: ${p.api?.error || 'unknown'}). Likely the API key ID doesn't match this private key, the key is for the demo env, or the key was revoked. Re-create an API key at kalshi.com and update both env vars.`
  } else {
    diagnosis = `All good — keys parse and a signed Kalshi request returned ${p.api?.markets ?? 0} market(s). The board should be live; if it still shows seed, redeploy to clear the 60s cache.`
  }
  return NextResponse.json({ ...p, diagnosis })
}
