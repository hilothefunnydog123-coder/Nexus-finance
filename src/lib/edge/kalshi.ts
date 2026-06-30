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

export function getKalshiCreds(): KalshiCreds | null {
  const keyId = process.env.KALSHI_KEY_ID?.trim()
  let pk = process.env.KALSHI_PRIVATE_KEY
  if (!keyId || !pk) return null
  // Env vars often carry the PEM with escaped newlines — restore them.
  pk = pk.replace(/\\n/g, '\n').trim()
  if (!pk.includes('BEGIN') || !pk.includes('PRIVATE KEY')) return null
  return { keyId, privateKeyPem: pk }
}

export const KALSHI_ENABLED = !!getKalshiCreds()

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
  [/bitcoin|btc|ethereum|eth\b|crypto|solana|dogecoin/i, 'Crypto'],
  [/s&p|s and p|nasdaq|dow|treasury|yield|gold|oil|crude|stock|nvidia|tesla|apple|equit/i, 'Financials'],
  [/cpi|inflation|fed|fomc|rate|gdp|payroll|jobs|unemploy|recession/i, 'Economics'],
  [/president|election|congress|senate|house|scotus|supreme court|governor|poll/i, 'Politics'],
  [/temperature|°f|hurricane|weather|snow|rain|storm|climate/i, 'Weather'],
  [/openai|gpt|model|ai\b|tech|chip|launch|release/i, 'Tech'],
  [/movie|box.office|oscar|grammy|album|celebrit|culture|sport|game/i, 'Culture'],
  [/opec|oil cut|war|treaty|un\b|nato|world/i, 'World'],
]

export function categorize(title: string, raw?: string): EdgeCategory {
  if (raw) {
    const r = raw.toLowerCase()
    if (r.includes('financ')) return 'Financials'
    if (r.includes('crypto')) return 'Crypto'
    if (r.includes('econ')) return 'Economics'
    if (r.includes('politic')) return 'Politics'
    if (r.includes('climate') || r.includes('weather')) return 'Weather'
    if (r.includes('science') || r.includes('tech')) return 'Tech'
    if (r.includes('entertain') || r.includes('culture') || r.includes('sport')) return 'Culture'
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
type CacheEntry = { at: number; markets: KalshiMarket[]; live: boolean }
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
export async function fetchActiveMarkets(opts: FetchOptions = {}): Promise<{ markets: KalshiMarket[]; live: boolean }> {
  const limit = opts.limit ?? 60
  const minVolume = opts.minVolume ?? 0
  if (!opts.force && cache && Date.now() - cache.at < TTL_MS) {
    return { markets: applyFilter(cache.markets, limit, minVolume), live: cache.live }
  }

  const creds = getKalshiCreds()
  if (!creds) {
    const seed = seedBoard()
    cache = { at: Date.now(), markets: seed, live: false }
    return { markets: applyFilter(seed, limit, minVolume), live: false }
  }

  try {
    const collected: KalshiMarket[] = []
    let cursor = ''
    // A few pages of the most liquid open markets is plenty for the board.
    for (let page = 0; page < 4 && collected.length < 300; page++) {
      const q = new URLSearchParams({ status: 'open', limit: '100' })
      if (cursor) q.set('cursor', cursor)
      const data = await kalshiGet<{ markets: RawMarket[]; cursor?: string }>(creds, `/markets?${q.toString()}`, opts.signal)
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
  } catch {
    // Network / auth / parse failure — degrade to seed, never throw.
    const seed = seedBoard()
    if (!cache) cache = { at: Date.now(), markets: seed, live: false }
    return { markets: applyFilter(cache.markets, limit, minVolume), live: cache.live }
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
