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

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

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

/** End-to-end board self-test: runs the REAL pagination + normalize that the
 *  board uses, and reports how many raw markets came back vs how many survived
 *  normalization, the live flag, the reason, and a few sample titles. This is the
 *  decisive diagnostic — it shows whether the board falls to seed because the API
 *  failed, or because normalize dropped every market. Never leaks the key. */
export async function kalshiBoardSelfTest() {
  const creds = getKalshiCreds()
  const out: {
    credsParsed: boolean
    rawCount: number
    normalizedCount: number
    droppedNoTickerOrClose: number
    droppedCombo: number
    droppedNoPrice: number
    pagesFetched: number
    live: boolean
    reason?: string
    categories: Record<string, number>
    bookCategories: Record<string, number>
    withVolume: number
    withBook: number
    topBookByVolume: string[]
    sportsSample: string[]
    otherSample: string[]
    rawSample: RawMarket[]
    comboEvents: number
    elapsedMs: number
    error?: string
  } = {
    credsParsed: !!creds,
    rawCount: 0, normalizedCount: 0, droppedNoTickerOrClose: 0, droppedCombo: 0, droppedNoPrice: 0,
    pagesFetched: 0, live: false, categories: {}, bookCategories: {}, withVolume: 0, withBook: 0, topBookByVolume: [], sportsSample: [], otherSample: [], rawSample: [], comboEvents: 0, elapsedMs: 0,
  }
  const started = Date.now()
  if (!creds) {
    out.reason = 'creds did not parse'
    out.elapsedMs = Date.now() - started
    return out
  }
  try {
    const collected: { m: KalshiMarket; ticker: string }[] = []
    let cursor = ''
    let retries = 0
    let comboEvents = 0
    // Mirror the board: pull /events WITH nested markets (the real source).
    for (let page = 0; page < 40 && Date.now() - started < 12_000; page++) {
      const q = new URLSearchParams({ status: 'open', limit: '200', with_nested_markets: 'true' })
      if (cursor) q.set('cursor', cursor)
      let data: { events?: RawEvent[]; cursor?: string }
      try {
        data = await kalshiGet<{ events?: RawEvent[]; cursor?: string }>(creds, `/events?${q.toString()}`)
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('429') && retries < 4) { retries++; await sleep(500 * retries); page--; continue }
        throw e
      }
      out.pagesFetched++
      for (const ev of data.events || []) {
        if (ev.event_ticker?.startsWith('KXMVE') || (ev.series_ticker || '').startsWith('KXMVE')) { comboEvents++; continue }
        for (const r of ev.markets || []) {
          out.rawCount++
          if (!r.ticker || !r.close_time) { out.droppedNoTickerOrClose++; continue }
          if (isComboMarket(r)) { out.droppedCombo++; continue }
          if (out.rawSample.length < 4) out.rawSample.push(r)
          const n = normalizeEventMarket(r, ev)
          if (!n) { out.droppedNoPrice++; continue }
          collected.push({ m: n, ticker: r.ticker })
        }
      }
      cursor = data.cursor || ''
      if (!cursor) break
      await sleep(220)
    }
    out.comboEvents = comboEvents
    collected.sort((a, b) => b.m.volume - a.m.volume)
    out.normalizedCount = collected.length
    out.live = collected.length > 0
    out.withVolume = collected.filter((c) => c.m.volume > 0).length
    const book = collected.filter((c) => c.m.hasBook)
    out.withBook = book.length
    for (const c of collected) out.categories[c.m.category] = (out.categories[c.m.category] || 0) + 1
    for (const c of book) out.bookCategories[c.m.category] = (out.bookCategories[c.m.category] || 0) + 1
    out.topBookByVolume = book.slice(0, 12).map((c) => `[${c.m.category}] ${c.m.title.slice(0, 60)} — ${(c.m.yesPrice * 100).toFixed(0)}% · vol ${c.m.volume}`)
    out.sportsSample = book.filter((c) => c.m.category === 'Sports').slice(0, 10).map((c) => `${c.m.title.slice(0, 60)} — ${(c.m.yesPrice * 100).toFixed(0)}% · vol ${c.m.volume}`)
    out.otherSample = book.filter((c) => c.m.category === 'Other').slice(0, 20).map((c) => `${c.ticker} | ${c.m.title.slice(0, 60)}`)
    if (!collected.length) out.reason = `Events fetched but produced 0 boardworthy markets (comboEvents=${comboEvents}, droppedCombo=${out.droppedCombo}, droppedNoPrice=${out.droppedNoPrice})`
  } catch (e) {
    out.error = e instanceof Error ? e.message : 'request failed'
    out.reason = `Kalshi pagination threw: ${out.error}`
  }
  out.elapsedMs = Date.now() - started
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
  close_time?: string
  status?: string
  // Legacy schema (integer cents / numbers).
  last_price?: number
  yes_bid?: number
  yes_ask?: number
  no_bid?: number
  no_ask?: number
  volume?: number
  open_interest?: number
  liquidity?: number
  // Current elections-API schema: decimal-dollar / fixed-point STRINGS (0..1 range).
  last_price_dollars?: string
  yes_bid_dollars?: string
  yes_ask_dollars?: string
  no_bid_dollars?: string
  no_ask_dollars?: string
  volume_fp?: string
  volume_24h_fp?: string
  open_interest_fp?: string
  liquidity_dollars?: string
  // Combo / parlay markers — these are multivariate "MVE" markets we exclude.
  strike_type?: string
  is_provisional?: boolean
  mve_selected_legs?: unknown[]
}

// Kalshi series-ticker prefixes are the most reliable signal (the elections API
// returns no per-market category field). Tickers look like KX<SERIES>-<...>.
const TICKER_CAT: [RegExp, EdgeCategory][] = [
  [/^KX(NFL|NBA|MLB|NHL|NCAA|CFB|CBB|UFC|MMA|BOX|PGA|GOLF|MASTERS|TENNIS|ATP|WTA|WIMB|USOPEN|F1|NASCAR|INDY|SOCCER|EPL|UCL|UEFA|FIFA|WC|MLS|LALIGA|BUNDES|SERIEA|LIGUE|CRICKET|RUGBY|OLYMP|FIGHT|WNBA|GAME|MATCH|WORLDCUP|CONCACAF|COPA|EURO|FRIENDLY|CL|EL|SCORE|GOAL|CORNER)/i, 'Sports'],
  [/^KX(BTC|ETH|CRYPTO|SOL|DOGE|XRP|BITCOIN|ETHER)/i, 'Crypto'],
  [/^KX(SPX|SP500|NDX|NASDAQ|DJIA|DOW|TNX|YIELD|GOLD|OIL|WTI|BRENT|STOCK|NVDA|TSLA|AAPL|EQUIT)/i, 'Financials'],
  [/^KX(CPI|INFLATION|FED|FOMC|RATE|GDP|PAYROLL|JOBS|UNEMP|RECESSION|JOBLESS)/i, 'Economics'],
  [/^KX(PRES|ELECTION|CONGRESS|SENATE|HOUSE|SCOTUS|GOV|POLL|DEM|GOP|TRUMP|BIDEN)/i, 'Politics'],
  [/^KX(TEMP|WEATHER|HURRICANE|SNOW|RAIN|STORM|CLIMATE|HIGH|LOW)/i, 'Weather'],
  [/^KX(OPENAI|GPT|AI|CHIP|TECH|LAUNCH|RELEASE|APP)/i, 'Tech'],
  [/^KX(MOVIE|BOX|OSCAR|GRAMMY|ALBUM|ROTTEN|EMMY|TIME)/i, 'Culture'],
]

const CAT_KEYWORDS: [RegExp, EdgeCategory][] = [
  // Sports — leagues, events, soccer/match terms, and player-prop patterns. The
  // live Kalshi board is heavy on soccer (World Cup) + MLB, whose titles are
  // concatenated legs like "yes France advances, yes Reg Time: ...".
  [/\bnfl\b|\bnba\b|\bwnba\b|\bmlb\b|\bnhl\b|\bncaa\b|college (foot|basket)ball|super bowl|world series|stanley cup|premier league|la ?liga|champions league|bundesliga|serie a|ligue 1|\bmls\b|\bufc\b|\bmma\b|boxing|\bpga\b|\bgolf\b|the masters|wimbledon|\batp\b|\bwta\b|\btennis\b|formula ?1|\bf1\b|nascar|indycar|grand prix|playoff|\bvs\.?\b| beat | defeat|to win the|olympic|fifa|world cup|copa|euro \d|concacaf|heisman|cricket|rugby|advances?\b|reg(ulation)? time|both teams to score|goals? scored|\bcorners?\b|1st half|first half|2nd half|halftime|penalt|own goal|clean sheet|hat.?trick|to score|assists?\b|home run|strikeout|touchdown|field goal|three.pointer|rebounds?\b|: \d+\+/i, 'Sports'],
  [/bitcoin|btc|ethereum|eth\b|crypto|solana|dogecoin|\bxrp\b/i, 'Crypto'],
  [/s&p|s and p|nasdaq|dow|treasury|yield|gold|oil|crude|stock|nvidia|tesla|apple|equit/i, 'Financials'],
  [/cpi|inflation|fed|fomc|rate|gdp|payroll|jobs|unemploy|recession/i, 'Economics'],
  [/president|election|congress|senate|house|scotus|supreme court|governor|poll/i, 'Politics'],
  [/temperature|°f|hurricane|weather|snow|rain|storm|climate/i, 'Weather'],
  [/openai|gpt|model|ai\b|tech|chip|launch|release/i, 'Tech'],
  [/movie|box.office|oscar|grammy|album|celebrit|culture/i, 'Culture'],
  [/opec|oil cut|war|treaty|un\b|nato|world/i, 'World'],
]

export function categorize(title: string, raw?: string, ticker?: string): EdgeCategory {
  // 1) Explicit category field, when Kalshi provides one.
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
  // 2) Series-ticker prefix (most reliable on the elections API, which omits
  //    the category field). Check the market ticker AND its event ticker.
  if (ticker) {
    for (const [re, cat] of TICKER_CAT) if (re.test(ticker)) return cat
  }
  // 3) Title keywords.
  for (const [re, cat] of CAT_KEYWORDS) if (re.test(title)) return cat
  return 'Other'
}

function clamp01(x: number): number {
  return Math.max(0.01, Math.min(0.99, x))
}

/** A concatenated multi-leg / combo title ("yes Belgium advances,yes England
 *  advances,…") — not a single binary question. */
function isCombinedTitle(t: string): boolean {
  const commas = (t.match(/,/g) || []).length
  const legs = (t.match(/\b(yes|no)\b/gi) || []).length
  return commas >= 2 || legs >= 2 || t.length > 130
}

/** Best-effort clean single-question title. Prefers the per-outcome subtitle when
 *  the market title is a combo concatenation; always returns a usable string (we
 *  no longer drop markets on title — the has-book gate decides what's boardworthy). */
function cleanTitle(m: RawMarket): string {
  const sub = (m.yes_sub_title || m.subtitle || '').trim()
  let t = (m.title || '').trim()
  if ((!t || isCombinedTitle(t)) && sub && !isCombinedTitle(sub)) {
    // Combine the event title (if clean-ish) with the specific outcome.
    t = t && !isCombinedTitle(t) ? `${t} — ${sub}` : sub
  }
  if (!t) t = sub || m.ticker
  t = t.replace(/^\s*(yes|no)\s+/i, '').trim()
  return (t.length > 120 ? `${t.slice(0, 117)}…` : t) || m.ticker
}

/** Parse a Kalshi numeric field that may be a number (legacy cents) or a decimal
 *  string in dollars ("0.5410"). `scale` converts legacy cents → 0..1. */
function pnum(dollarStr?: string, legacy?: number, scale = 1): number | undefined {
  if (dollarStr != null && dollarStr !== '') {
    const n = parseFloat(dollarStr)
    if (Number.isFinite(n)) return n
  }
  if (legacy != null && Number.isFinite(legacy)) return legacy * scale
  return undefined
}

/** A multivariate/parlay ("MVE") combo market — a bundle of legs, not a single
 *  binary question. Kalshi bulk-creates tens of thousands; they're not boardworthy.
 *  NOTE: strike_type "custom" is NOT a combo signal — legit multi-candidate markets
 *  (next Pope, next NATO chief) use custom strikes too. Only the MVE markers count. */
function isComboMarket(m: RawMarket): boolean {
  return (
    m.is_provisional === true ||
    m.ticker.startsWith('KXMVE') ||
    (m.event_ticker || '').startsWith('KXMVE') ||
    (Array.isArray(m.mve_selected_legs) && m.mve_selected_legs.length > 0)
  )
}

/** Extract a YES probability + liquidity signals from a raw market, handling both
 *  the current decimal-dollar-string schema and the legacy integer-cent schema. */
function parsePrices(m: RawMarket) {
  const yesBid = pnum(m.yes_bid_dollars, m.yes_bid, 0.01)
  const yesAsk = pnum(m.yes_ask_dollars, m.yes_ask, 0.01)
  const last = pnum(m.last_price_dollars, m.last_price, 0.01)
  const volume = pnum(m.volume_fp, m.volume) ?? 0
  const openInterest = pnum(m.open_interest_fp, m.open_interest)
  const liquidity = pnum(m.liquidity_dollars, m.liquidity)

  const hasBook = yesBid != null && yesAsk != null && (yesBid > 0 || yesAsk > 0)
  let yes: number | null = null
  if (hasBook) yes = (yesBid! + yesAsk!) / 2
  else if (last != null && last > 0) yes = last
  else if (yesAsk != null && yesAsk > 0) yes = yesAsk
  else if (yesBid != null && yesBid > 0) yes = yesBid
  if (yes == null || !Number.isFinite(yes)) yes = 0.5
  return { yesPrice: clamp01(yes), volume, openInterest, liquidity, hasBook: hasBook || (last ?? 0) > 0 }
}

// Kalshi's own event category → our EdgeCategory. Far more reliable than guessing.
const KALSHI_CAT: Record<string, EdgeCategory> = {
  politics: 'Politics', elections: 'Politics', election: 'Politics',
  sports: 'Sports',
  economics: 'Economics', economy: 'Economics',
  financials: 'Financials', financial: 'Financials', companies: 'Financials', commodities: 'Financials',
  crypto: 'Crypto', cryptocurrency: 'Crypto', cryptocurrencies: 'Crypto',
  'climate and weather': 'Weather', weather: 'Weather', climate: 'Weather',
  'science and technology': 'Tech', technology: 'Tech', science: 'Tech', tech: 'Tech',
  entertainment: 'Culture', culture: 'Culture', 'pop culture': 'Culture',
  world: 'World',
}
function mapKalshiCategory(cat: string | undefined, title: string, ticker: string): EdgeCategory {
  if (cat) {
    const hit = KALSHI_CAT[cat.toLowerCase().trim()]
    if (hit) return hit
  }
  return categorize(title, cat, ticker) // fall back to ticker/keyword heuristics
}

/** Build a clean, human title from the parent event + the market's outcome.
 *  Event title is the full question ("Who will the next Pope be?"); the market's
 *  yes_sub_title is the specific outcome ("Pietro Parolin"). For multi-outcome
 *  events (game winners, candidate races) we always show the outcome so each row
 *  says which side it prices. */
function buildEventTitle(ev: RawEvent, m: RawMarket): string {
  let base = (ev.title || m.title || '').trim() || m.ticker
  const out = (m.yes_sub_title || m.subtitle || '').trim()
  const lowOut = out.toLowerCase()
  const multiOutcome = (ev.markets?.length ?? 1) > 1
  if (out && lowOut !== 'yes' && lowOut !== 'no') {
    if (multiOutcome || !base.toLowerCase().includes(lowOut)) base = `${base} — ${out}`
  }
  return base.length > 140 ? `${base.slice(0, 137)}…` : base
}

interface RawEvent {
  event_ticker: string
  series_ticker?: string
  title?: string
  sub_title?: string
  category?: string
  markets?: RawMarket[]
}

/** Normalize a market nested under an event (the /events path) — uses the event's
 *  real category + full-question title. This is the primary board source. */
function normalizeEventMarket(m: RawMarket, ev: RawEvent): KalshiMarket | null {
  if (!m.ticker || !m.close_time) return null
  if (isComboMarket(m)) return null
  const p = parsePrices(m)
  const title = buildEventTitle(ev, m)
  const category = mapKalshiCategory(ev.category, title, `${m.ticker} ${ev.event_ticker} ${ev.series_ticker || ''}`)
  return {
    ticker: m.ticker,
    eventTicker: ev.event_ticker,
    title,
    subtitle: m.yes_sub_title || m.subtitle,
    category,
    yesPrice: p.yesPrice,
    noPrice: +(1 - p.yesPrice).toFixed(4),
    volume: p.volume,
    openInterest: p.openInterest,
    closeTime: m.close_time,
    status: (m.status as KalshiMarket['status']) || 'active',
    liquidity: p.liquidity,
    hasBook: p.hasBook,
    source: 'kalshi',
  }
}

/** Legacy per-market normalizer (kept for the flat /markets fallback path). */
function normalize(m: RawMarket): KalshiMarket | null {
  if (!m.ticker || !m.close_time) return null
  if (isComboMarket(m)) return null
  const p = parsePrices(m)
  const title = cleanTitle(m)
  return {
    ticker: m.ticker,
    eventTicker: m.event_ticker,
    title,
    subtitle: m.yes_sub_title || m.subtitle,
    category: categorize(title, m.category, `${m.ticker} ${m.event_ticker || ''}`),
    yesPrice: p.yesPrice,
    noPrice: +(1 - p.yesPrice).toFixed(4),
    volume: p.volume,
    openInterest: p.openInterest,
    closeTime: m.close_time,
    status: (m.status as KalshiMarket['status']) || 'active',
    liquidity: p.liquidity,
    hasBook: p.hasBook,
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
    // Source of truth: the /events endpoint WITH nested markets. Unlike /markets
    // (whose first tens of thousands of rows are bulk MVE parlay combos), /events
    // surfaces real events immediately AND carries the real category + full-question
    // title — so we get clean titles and correct categories in one pass. Big pages
    // (limit=200), throttled + 429-retry to respect Kalshi's read rate limit.
    const started = Date.now()
    let retries = 0
    for (let page = 0; page < 40; page++) {
      const q = new URLSearchParams({ status: 'open', limit: '200', with_nested_markets: 'true' })
      if (cursor) q.set('cursor', cursor)
      let data: { events?: RawEvent[]; cursor?: string }
      try {
        data = await kalshiGet<{ events?: RawEvent[]; cursor?: string }>(creds, `/events?${q.toString()}`, opts.signal)
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('429') && retries < 4 && Date.now() - started < 12_000) {
          retries++
          await sleep(500 * retries) // back off, then retry the SAME page
          page--
          continue
        }
        if (page === 0 && !collected.length) throw e // first page truly failed → seed
        break // keep what we have
      }
      for (const ev of data.events || []) {
        if (ev.event_ticker?.startsWith('KXMVE') || (ev.series_ticker || '').startsWith('KXMVE')) continue
        for (const r of ev.markets || []) {
          const n = normalizeEventMarket(r, ev)
          if (n) collected.push(n)
        }
      }
      cursor = data.cursor || ''
      if (!cursor || Date.now() - started > 9_000) break
      await sleep(220) // stay under Kalshi's read rate limit
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
