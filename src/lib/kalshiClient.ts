/**
 * Client-side Kalshi auth. The user's RSA private key is imported via Web Crypto
 * as a NON-EXTRACTABLE CryptoKey and stored in IndexedDB — it can't be read back
 * (even by script), never touches our server, and signs each request in the
 * browser. Signed requests are relayed to Kalshi through /api/kalshi/proxy to get
 * past CORS. Kalshi's scheme: RSA-PSS / SHA-256, salt = digest length, message =
 * timestamp + METHOD + path (no query).
 */

const IDB_NAME = 'matrix-kalshi'
const IDB_STORE = 'keys'
const KEY_ID_LS = 'matrix_kalshi_keyid'

// ── PEM parsing + PKCS#1 → PKCS#8 (done in-browser, no openssl needed) ─────────
function pemBody(pem: string): string {
  return pem.replace(/-----BEGIN [A-Z0-9 ]+-----/g, '').replace(/-----END [A-Z0-9 ]+-----/g, '').replace(/\s+/g, '')
}
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64); const u = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i)
  return u
}
function derLen(n: number): number[] {
  if (n < 0x80) return [n]
  const b: number[] = []; let x = n; while (x > 0) { b.unshift(x & 0xff); x >>= 8 }
  return [0x80 | b.length, ...b]
}
/** Wrap a raw PKCS#1 RSAPrivateKey (DER) into a PKCS#8 PrivateKeyInfo (DER). */
function pkcs1ToPkcs8(pkcs1: Uint8Array): Uint8Array {
  // AlgorithmIdentifier for rsaEncryption (1.2.840.113549.1.1.1) + NULL params
  const algId = [0x30, 0x0d, 0x06, 0x09, 0x2a, 0x86, 0x48, 0x86, 0xf7, 0x0d, 0x01, 0x01, 0x01, 0x05, 0x00]
  const version = [0x02, 0x01, 0x00]
  const octet = [0x04, ...derLen(pkcs1.length), ...Array.from(pkcs1)]
  const inner = [...version, ...algId, ...octet]
  const outer = [0x30, ...derLen(inner.length), ...inner]
  return new Uint8Array(outer)
}

/** Import any Kalshi RSA private key (PKCS#8 *or* PKCS#1) as a non-extractable
 *  RSA-PSS signing key. Converts PKCS#1 in the browser — no openssl needed. */
export async function importKalshiKey(pem: string): Promise<CryptoKey> {
  const p = pem.trim()
  if (!/BEGIN [A-Z ]*PRIVATE KEY/.test(p)) throw new Error('That doesn\'t look like a private key. Paste the whole block, including the -----BEGIN…----- and -----END…----- lines.')
  let der: Uint8Array
  try { der = b64ToBytes(pemBody(p)) } catch { throw new Error('Could not read the key — the text between BEGIN/END isn\'t valid. Re-copy the full key file.') }
  const keyData = p.includes('BEGIN RSA PRIVATE KEY') ? pkcs1ToPkcs8(der) : der
  try {
    return await crypto.subtle.importKey('pkcs8', keyData as BufferSource, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign'])
  } catch {
    throw new Error('This browser couldn\'t import that key. Make sure it\'s your Kalshi RSA private key (the .pem/.key file you downloaded when you made the API key).')
  }
}

function toB64(buf: ArrayBuffer): string {
  const b = new Uint8Array(buf); let s = ''
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i])
  return btoa(s)
}

async function sign(key: CryptoKey, message: string): Promise<string> {
  const sig = await crypto.subtle.sign({ name: 'RSA-PSS', saltLength: 32 }, key, new TextEncoder().encode(message))
  return toB64(sig)
}

// ── IndexedDB (store the non-extractable CryptoKey) ───────────────────────────
function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(IDB_NAME, 1)
    r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE)
    r.onsuccess = () => res(r.result)
    r.onerror = () => rej(r.error)
  })
}
async function idbPut(k: string, v: unknown) { const db = await idb(); return new Promise<void>((res, rej) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).put(v, k); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error) }) }
async function idbGet<T>(k: string): Promise<T | null> { const db = await idb(); return new Promise((res, rej) => { const tx = db.transaction(IDB_STORE, 'readonly'); const g = tx.objectStore(IDB_STORE).get(k); g.onsuccess = () => res((g.result as T) ?? null); g.onerror = () => rej(g.error) }) }
async function idbDel(k: string) { const db = await idb(); return new Promise<void>((res) => { const tx = db.transaction(IDB_STORE, 'readwrite'); tx.objectStore(IDB_STORE).delete(k); tx.oncomplete = () => res() }) }

export type KalshiConn = { keyId: string; key: CryptoKey; demo?: boolean }

/** Persist the connection (CryptoKey in IDB — non-extractable; keyId + env in LS). */
export async function saveConn(keyId: string, key: CryptoKey, demo = false) {
  await idbPut('privkey', key)
  localStorage.setItem(KEY_ID_LS, JSON.stringify({ keyId, demo }))
}
export async function loadConn(): Promise<KalshiConn | null> {
  try {
    const raw = localStorage.getItem(KEY_ID_LS)
    const key = await idbGet<CryptoKey>('privkey')
    if (!raw || !key) return null
    let keyId = raw, demo = false
    try { const o = JSON.parse(raw); if (o.keyId) { keyId = o.keyId; demo = !!o.demo } } catch { /* legacy plain keyId */ }
    return { keyId, key, demo }
  } catch { }
  return null
}
export async function clearConn() {
  try { await idbDel('privkey'); localStorage.removeItem(KEY_ID_LS) } catch { }
}

// ── signed request via our relay ──────────────────────────────────────────────
export type KResp = { status: number; ok: boolean; data: unknown; error?: string }
export async function kalshi(conn: KalshiConn, method: 'GET' | 'POST' | 'DELETE', path: string, opts: { query?: string; payload?: unknown } = {}): Promise<KResp> {
  const ts = Date.now().toString()
  const sig = await sign(conn.key, ts + method + path)
  const base = conn.demo ? 'https://demo-api.kalshi.co' : 'https://api.elections.kalshi.com'
  const res = await fetch('/api/kalshi/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, query: opts.query, ts, keyId: conn.keyId, sig, payload: opts.payload, base }),
  })
  const j = await res.json().catch(() => ({}))
  return { status: j.status ?? 0, ok: !!j.ok, data: j.data, error: j.error }
}

// ── convenience calls ─────────────────────────────────────────────────────────
export async function getBalance(conn: KalshiConn): Promise<number | null> {
  const r = await kalshi(conn, 'GET', '/trade-api/v2/portfolio/balance')
  if (!r.ok) throw new Error(errMsg(r))
  const d = r.data as { balance?: number; balance_dollars?: string } | null
  if (d?.balance_dollars != null) return parseFloat(d.balance_dollars)
  if (typeof d?.balance === 'number') return d.balance / 100 // legacy cents
  return null
}
export type KPosition = { ticker: string; position: number; side?: string }
export async function getPositions(conn: KalshiConn): Promise<KPosition[]> {
  const r = await kalshi(conn, 'GET', '/trade-api/v2/portfolio/positions')
  if (!r.ok) return []
  const d = r.data as { market_positions?: KPosition[] } | null
  return (d?.market_positions || []).filter((p) => p.position !== 0)
}
/**
 * Place a REAL order on the V2 single-book endpoint (/portfolio/events/orders).
 * That book is denominated in the YES price: side "bid" = buy YES, "ask" = sell
 * YES. Selling YES ≡ buying NO at (1−price), so we map our (side, action) to a
 * bid/ask + a YES-book price, and cross the spread with an immediate-or-cancel
 * order so it fills at market without ever resting.
 *
 *   buy YES  / close NO  → bid  (price crossed UP)
 *   sell YES / buy NO    → ask  (price crossed DOWN)
 *
 * `yesPrice` is the current YES price (0..1). action 'sell' closes a position.
 */
export async function placeOrder(conn: KalshiConn, ticker: string, side: 'yes' | 'no', count: number, action: 'buy' | 'sell' = 'buy', yesPrice?: number): Promise<KResp> {
  const wantBid = (side === 'yes' && action === 'buy') || (side === 'no' && action === 'sell')
  const bookSide = wantBid ? 'bid' : 'ask'
  const yp = typeof yesPrice === 'number' && Number.isFinite(yesPrice) ? Math.max(0.02, Math.min(0.98, yesPrice)) : 0.5
  const px = wantBid ? Math.min(0.99, yp + 0.05) : Math.max(0.01, yp - 0.05) // generous cross → IOC fills at the real market price, not the limit
  return kalshi(conn, 'POST', '/trade-api/v2/portfolio/events/orders', {
    payload: {
      ticker,
      client_order_id: 'mx-' + Date.now() + '-' + Math.round(Math.random() * 1e6),
      side: bookSide,
      count: String(count),
      price: px.toFixed(4),
      time_in_force: 'immediate_or_cancel',
    },
  })
}
export function errMsg(r: KResp): string {
  if (r.error) return r.error
  const d = r.data as { error?: { message?: string; code?: string } | string; message?: string } | null
  const e = d?.error
  const code = typeof e === 'object' ? e?.code : undefined
  const m = typeof e === 'string' ? e : e?.message || d?.message
  return [code, m].filter(Boolean).join(' · ') || `Kalshi HTTP ${r.status}`
}
