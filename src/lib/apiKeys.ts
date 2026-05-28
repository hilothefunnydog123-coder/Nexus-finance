import { createHash, randomBytes } from 'crypto'
import { createClient } from '@supabase/supabase-js'

// ── Tier limits (calls per month) ─────────────────────────────────────────────
export const TIER_LIMITS: Record<string, number> = {
  free:       100,
  pro:        10_000,
  enterprise: Infinity,
}

// ── Service-role client (server-side only) ────────────────────────────────────
function getServiceClient() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key  = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key, { auth: { persistSession: false } })
}

// ── Hash a raw key for storage ────────────────────────────────────────────────
function hashKey(raw: string): string {
  return createHash('sha256').update(raw).digest('hex')
}

// ── Generate a new API key ────────────────────────────────────────────────────
// Format: yn_live_<48 hex chars>  (56 chars total)
// ONLY returned once — we store the hash, not the raw key.
export function generateRawKey(): string {
  return 'yn_live_' + randomBytes(24).toString('hex')
}

// ── Create and persist a new key ──────────────────────────────────────────────
export async function createApiKey(opts: {
  email: string
  name:  string
  tier?: string
}): Promise<{ raw: string; prefix: string; id: string }> {
  const raw    = generateRawKey()
  const prefix = raw.slice(0, 16)  // e.g. "yn_live_a1b2c3d4"
  const hash   = hashKey(raw)
  const tier   = opts.tier ?? 'free'

  const sb = getServiceClient()
  const { data, error } = await sb
    .from('api_keys')
    .insert({ user_email: opts.email, key_hash: hash, key_prefix: prefix, tier, name: opts.name })
    .select('id')
    .single()

  if (error) throw new Error(error.message)

  // raw key shown to the user ONCE — never stored in plaintext
  return { raw, prefix, id: data.id }
}

// ── Validate a key on each API request ───────────────────────────────────────
// Returns null if invalid/rate-limited, or the key record if OK.
export async function validateApiKey(rawKey: string): Promise<{
  id:    string
  tier:  string
  email: string
} | null> {
  if (!rawKey?.startsWith('yn_')) return null

  const hash = hashKey(rawKey)
  const sb   = getServiceClient()

  const { data, error } = await sb
    .from('api_keys')
    .select('id, tier, user_email, calls_month, is_active')
    .eq('key_hash', hash)
    .single()

  if (error || !data || !data.is_active) return null

  // Enforce monthly call limit
  const limit = TIER_LIMITS[data.tier] ?? 100
  if (data.calls_month >= limit) return null

  // Increment usage (non-blocking — don't await, don't fail the request if this errors)
  sb.from('api_keys')
    .update({
      calls_month:  data.calls_month + 1,
      calls_total:  data.calls_month + 1,   // approximate, server handles exact
      last_used_at: new Date().toISOString(),
    })
    .eq('id', data.id)
    .then(() => {}, () => {})

  return { id: data.id, tier: data.tier, email: data.user_email }
}

// ── Extract raw key from request headers ─────────────────────────────────────
export function extractKey(headers: Headers): string {
  const auth = headers.get('authorization') ?? ''
  return auth.replace(/^Bearer\s+/i, '').trim()
      || headers.get('x-api-key')?.trim()
      || ''
}
