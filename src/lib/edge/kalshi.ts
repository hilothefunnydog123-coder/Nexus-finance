/**
 * Kalshi API client — Phase 1 ingestion.
 *
 * Auth is RSA key-pair request signing (NOT a bearer token). For every request
 * Kalshi expects three headers:
 *   KALSHI-ACCESS-KEY        the key ID
 *   KALSHI-ACCESS-TIMESTAMP  current time in ms since epoch
 *   KALSHI-ACCESS-SIGNATURE  base64( RSA-PSS-SHA256( timestamp + METHOD + path ) )
 * where `path` is the request path beginning at /trade-api/v2 (no query string),
 * METHOD is the uppercase HTTP verb, and the PSS salt length equals the digest.
 *
 * Creds come from env (KALSHI_KEY_ID, KALSHI_PRIVATE_KEY). When they're missing
 * we fall back to the offline seed dataset so the whole feature still runs.
 */
import crypto from 'crypto'
import type { EdgeCategory, KalshiMarket } from './types'
import { seedBoard } from './seed'

const BASE = 'https://api.elections.kalshi.com/trade-api/v2'

export interface KalshiCreds {
  keyId: string
  privateKeyPem: string
}

/** Normalize a PEM pasted into an env var (quotes, escaped/CRLF newlines, and
 *  the common case where the whole key arrives on one line without newlines). */
export function normalizePem(raw: string): string {
  let pk = raw.trim()
  if ((pk.startsWith('"') && pk.endsWith('"')) || (pk.startsWith("'") && pk.endsWith("'"))) pk = pk.slice(1, -1)
  pk = pk.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim()
  // If the header/footer are present but the body has no line breaks (pasted as
  // one line), rebuild a valid PEM by wrapping the base64 body at 64 chars.
  const m = pk.match(/^-----BEGIN ([A-Z ]+)-----([\s\S]*?)-----END \1-----$/)
  if (m && !m[2].includes('\n')) {
    const body = m[2].replace(/\s+/g, '')
    const wrapped = body.match(/.{1,64}/g)?.join('\n') ?? body
    pk = `-----BEGIN ${m[1]}-----\n${wrapped}\n-----END ${m[1]}-----`
  }
  return pk
}

export function getKalshiCreds(): KalshiCreds | null {
  const keyId = process.env.KALSHI_KEY_ID?.trim()
  const raw = process.env.KALSHI_PRIVATE_KEY
  if (!keyId || !raw) return null
  const pk = normalizePem(raw)
  if (!pk.includes('BEGIN') || !pk.includes('PRIVATE KEY')) return null
  return { keyId, privateKeyPem: pk }
}

export const KALSHI_ENABLED = !!getKalshiCreds()

/** Live diagnostic: does the function see the keys, do they parse, and does a
 *  signed Kalshi request actually succeed? Never returns the key itself. */
export async function kalshiProbe() {
  const keyId = process.env.KALSHI_KEY_ID?.trim() || ''
  const pkRaw = process.env.KALSHI_PRIVATE_KEY || ''
  const norm = pkRaw ? normalizePem(pkRaw) : ''
  const creds = getKalshiCreds()
  const out: {
    hasKeyId: boolean; keyIdLength: number; hasPrivateKey: boolean; privateKeyLength: number
    pemHasBegin: boolean; pemHasPrivateKeyMarker: boolean; credsParsed: boolean; base: string
    api?: { ok: boolean; status: number; error?: string; markets?: number }
  } = {
    hasKeyId: !!keyId, keyIdLength: keyId.length,
    hasPrivateKey: !!pkRaw, privateKeyLength: pkRaw.length,
    pemHasBegin: norm.includes('BEGIN'), pemHasPrivateKeyMarker: norm.includes('PRIVATE KEY'),
    credsParsed: !!creds, base: BASE,
  }
  if (!creds) return out
  try {
    const ts = Date.now().toString()
    const sig = signRequest(creds, 'GET', '/trade-api/v2/markets', ts)
    // Mirror the board's EXACT query so this probe catches query-specific failures.
    const res = await fetch(`${BASE}/markets?status=open&limit=100`, {
      headers: { 'KALSHI-ACCESS-KEY': creds.keyId, 'KALSHI-ACCESS-TIMESTAMP': ts, 'KALSHI-ACCESS-SIGNATURE': sig, Accept: 'application/json' },
      cache: 'no-store',
    })
    if (res.ok) {
      const j = await res.json().catch(() => null)
      out.api = { ok: true, status: res.status, markets: j?.markets?.length }
    } else {
      out.api = { ok: false, status: res.status, error: (await res.text().catch(() => '')).slice(0, 220) }
    }
  } catch (e) {
    out.api = { ok: false, status: 0, error: e instanceof Error ? e.message : 'request failed' }
  }
  return out
}

/** Sign one request the way Kalshi expects (RSA-PSS over timestamp+method+path). */
function signRequest(creds: KalshiCreds, method: string, path: string, timestamp: string): string {
  const msg = `${timestamp}${method.toUpperCase()}${path}`
  const signer = crypto.createSign('RSA-SHA256')
  signer.update(msg)
  signer.end()
  return signer.sign(
    { key: creds.privateKeyPem, padding: crypto.constants.RSA_PKCS1_PSS_PADDING, saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST },
    'base64'
  )
}

async function kalshiGet<T>(creds: KalshiCreds, pathWithQuery: string, signal?: AbortSignal): Promise<T> {
  const ts = Date.now().toString()
  const pathOnly = pathWithQuery.split('?')[0]
  const sig = signRequest(creds, 'GET', `/trade-api/v2${pathOnly}`, ts)
  const res = await fetch(`${BASE}${pathWithQuery}`, {
    method: 'GET',
    headers: {
      'KALSHI-ACCESS-KEY': creds.keyId,
      'KALSHI-ACCESS-TIMESTAMP': ts,
      'KALSHI-ACCESS-SIGNATURE': sig,
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Kalshi HTTP ${res.status}${body ? `: ${body.slice(0, 160)}` : ''}`)
  }
  return (await res.json()) as T
}

// ── raw → normalized ────────────────────────────────────────────────────────
interface RawMarket {
  ticker: string
  event_ticker?: string
  title?: string
  subtitle?: string
  yes_sub_title?: string
  category?: string
  last_price?: number       // cents (0..100)
  yes_bid?: number
  yes_ask?: number
  no_bid?: number
  no_ask?: number
  volume?: number
  open_interest?: number
  liquidity?: number
  close_time?: string
  status?: string
}

const CAT_KEYWORDS: [RegExp, EdgeCategory][] = [
  [/\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b|\bncaa\b|college (foot|basket)ball|super bowl|world series|stanley cup|premier league|la ?liga|champions league|bundesliga|serie a|\bmls\b|\bufc\b|\bmma\b|boxing|\bpga\b|\bgolf\b|wimbledon|\batp\b|\bwta\b|tennis|formula ?1|\bf1\b|nascar|grand prix|playoff|\bvs\.?\b| beat | defeat|to win the|olympic|fifa|world cup|heisman/i, 'Sports'],
  [/bitcoin|btc|ethereum|eth\b|crypto|solana|dogecoin/i, 'Crypto'],
  [/s&p|s and p|nasdaq|dow|treasury|yield|gold|oil|crude|stock|nvidia|tesla|apple|equit/i, 'Financials'],
  [/cpi|inflation|fed|fomc|rate|gdp|payroll|jobs|unemploy|recession/i, 'Economics'],
  [/president|election|congress|senate|house|scotus|supreme court|governor|poll/i, 'Politics'],
  [/temperature|°f|hurricane|weather|snow|rain|storm|climate/i, 'Weather'],
  [/openai|gpt|model|ai\b|tech|chip|launch|release/i, 'Tech'],
  [/movie|box.office|oscar|grammy|album|celebrit|culture/i, 'Culture'],
  [/opec|oil cut|war|treaty|un\b|nato|world/i, 'World'],
]

export function categorize(title: string, raw?: string): EdgeCategory {
  if (raw) {
    const r = raw.toLowerCase()
    if (r.includes('sport')) return 'Sports'
    if (r.includes('financ')) return 'Financials'
    if (r.includes('crypto')) return 'Crypto'
    if (r.includes('econ')) return 'Economics'
    if (r.includes('politic')) return 'Politics'
    if (r.includes('climate') || r.includes('weather')) return 'Weather'
    if (r.includes('science') || r.includes('tech')) return 'Tech'
    if (r.includes('entertain') || r.includes('culture')) return 'Culture'
    if (r.includes('world')) return 'World'
  }
  for (const [re, cat] of CAT_KEYWORDS) if (re.test(title)) return cat
  return 'Other'
}

function clamp01(x: number): number {
  return Math.max(0.01, Math.min(0.99, x))
}

function normalize(m: RawMarket): KalshiMarket | null {
  if (!m.ticker || !m.close_time) return null
  // Prefer the bid/ask midpoint; fall back to last trade. Kalshi quotes in cents.
  let yes: number | null = null
  if (m.yes_bid != null && m.yes_ask != null && m.yes_ask > 0) yes = (m.yes_bid + m.yes_ask) / 200
  else if (m.last_price != null && m.last_price > 0) yes = m.last_price / 100
  if (yes == null || !Number.isFinite(yes)) return null
  const yesPrice = clamp01(yes)
  const title = m.title || m.subtitle || m.ticker
  return {
    ticker: m.ticker,
    eventTicker: m.event_ticker,
    title,
    subtitle: m.yes_sub_title || m.subtitle,
    category: categorize(title, m.category),
    yesPrice,
    noPrice: +(1 - yesPrice).toFixed(4),
    volume: m.volume ?? 0,
    openInterest: m.open_interest,
    closeTime: m.close_time,
    status: (m.status as KalshiMarket['status']) || 'active',
    liquidity: m.liquidity,
    source: 'kalshi',
  }
}

// ── in-memory cache (per server instance) ───────────────────────────────────
type CacheEntry = { at: number; markets: KalshiMarket[]; live: boolean; reason?: string }
let cache: CacheEntry | null = null
const TTL_MS = 60_000

export interface FetchOptions {
  limit?: number          // max markets to return after filtering
  minVolume?: number      // drop illiquid noise
  force?: boolean         // bypass cache
  signal?: AbortSignal
}

/**
 * Pull active markets from Kalshi (paginated), normalize, sort by volume, and
 * cache. Falls back to the seed dataset when creds are missing or the API errors,
 * so callers always receive a usable board.
 */
export async function fetchActiveMarkets(opts: FetchOptions = {}): Promise<{ markets: KalshiMarket[]; live: boolean; reason?: string }> {
  const limit = opts.limit ?? 500
  const minVolume = opts.minVolume ?? 0
  if (!opts.force && cache && Date.now() - cache.at < TTL_MS) {
    return { markets: applyFilter(cache.markets, limit, minVolume), live: cache.live, reason: cache.reason }
  }

  const creds = getKalshiCreds()
  if (!creds) {
    const reason = (process.env.KALSHI_KEY_ID && process.env.KALSHI_PRIVATE_KEY) ? 'keys set but private key did not parse as a PEM' : 'KALSHI_KEY_ID / KALSHI_PRIVATE_KEY not set'
    const seed = seedBoard()
    cache = { at: Date.now(), markets: seed, live: false, reason }
    return { markets: applyFilter(seed, limit, minVolume), live: false, reason }
  }

  try {
    const collected: KalshiMarket[] = []
    let cursor = ''
    // Pull the FULL open-market universe (every Kalshi pick, all categories incl.
    // Sports) — paginate with the API-safe page size of 100. A single failed page
    // mid-stream keeps what we already have instead of nuking everything to seed.
    for (let page = 0; page < 120 && collected.length < 5000; page++) {
      const q = new URLSearchParams({ status: 'open', limit: '100' })
      if (cursor) q.set('cursor', cursor)
      let data: { markets: RawMarket[]; cursor?: string }
      try {
        data = await kalshiGet<{ markets: RawMarket[]; cursor?: string }>(creds, `/markets?${q.toString()}`, opts.signal)
      } catch (e) {
        if (page === 0) throw e // first page failed → a real problem → fall to seed
        break // a later page failed → keep the live markets we already collected
      }
      for (const r of data.markets || []) {
        const n = normalize(r)
        if (n) collected.push(n)
      }
      cursor = data.cursor || ''
      if (!cursor) break
    }
    if (!collected.length) throw new Error('no markets returned')
    collected.sort((a, b) => b.volume - a.volume)
    cache = { at: Date.now(), markets: collected, live: true }
    return { markets: applyFilter(collected, limit, minVolume), live: true }
  } catch (e) {
    // Network / auth / parse failure — degrade to seed, never throw.
    const reason = `Kalshi API call failed: ${e instanceof Error ? e.message : 'unknown'}`
    const seed = seedBoard()
    cache = { at: Date.now(), markets: seed, live: false, reason }
    return { markets: applyFilter(seed, limit, minVolume), live: false, reason }
  }
}

function applyFilter(markets: KalshiMarket[], limit: number, minVolume: number): KalshiMarket[] {
  return markets.filter((m) => m.volume >= minVolume).slice(0, limit)
}

/** Look up a single normalized market by ticker (uses cache / seed). */
export async function getMarket(ticker: string, opts: FetchOptions = {}): Promise<KalshiMarket | null> {
  const { markets } = await fetchActiveMarkets({ ...opts, limit: 1000 })
  return markets.find((m) => m.ticker === ticker) ?? null
}

/**
 * Fetch a single market's settlement result for grading. Returns 'yes' | 'no'
 * once Kalshi has settled it, otherwise null (still open / unknown / no creds).
 */
export async function getMarketResult(ticker: string, signal?: AbortSignal): Promise<'yes' | 'no' | null> {
  const creds = getKalshiCreds()
  if (!creds) return null
  try {
    const data = await kalshiGet<{ market?: RawMarket & { result?: string } }>(creds, `/markets/${encodeURIComponent(ticker)}`, signal)
    const r = (data.market?.result || '').toLowerCase()
    if (r === 'yes' || r === 'no') return r
    return null
  } catch {
    return null
  }
}
