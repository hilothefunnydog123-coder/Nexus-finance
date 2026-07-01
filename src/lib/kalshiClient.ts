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

// ── PEM → ArrayBuffer (PKCS#8) ────────────────────────────────────────────────
function pemToDer(pem: string): ArrayBuffer {
  const clean = pem.replace(/-----BEGIN [A-Z ]+-----/g, '').replace(/-----END [A-Z ]+-----/g, '').replace(/\s+/g, '')
  const bin = atob(clean)
  const buf = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i)
  return buf.buffer
}

/** Import a PKCS#8 PEM private key as a non-extractable RSA-PSS signing key. */
export async function importKalshiKey(pem: string): Promise<CryptoKey> {
  const p = pem.trim()
  if (p.includes('BEGIN RSA PRIVATE KEY')) {
    throw new Error('That is a PKCS#1 key. Convert it to PKCS#8:  openssl pkcs8 -topk8 -nocrypt -in key.pem -out key_pkcs8.pem')
  }
  if (!p.includes('BEGIN') || !p.includes('PRIVATE KEY')) throw new Error('Not a valid PEM private key.')
  const der = pemToDer(p)
  return crypto.subtle.importKey('pkcs8', der, { name: 'RSA-PSS', hash: 'SHA-256' }, false, ['sign'])
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

export type KalshiConn = { keyId: string; key: CryptoKey }

/** Persist the connection (CryptoKey in IDB — non-extractable; keyId in LS). */
export async function saveConn(keyId: string, key: CryptoKey) {
  await idbPut('privkey', key)
  localStorage.setItem(KEY_ID_LS, keyId)
}
export async function loadConn(): Promise<KalshiConn | null> {
  try {
    const keyId = localStorage.getItem(KEY_ID_LS)
    const key = await idbGet<CryptoKey>('privkey')
    if (keyId && key) return { keyId, key }
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
  const res = await fetch('/api/kalshi/proxy', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method, path, query: opts.query, ts, keyId: conn.keyId, sig, payload: opts.payload }),
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
/** Place a REAL order. side = 'yes' | 'no', count = # contracts, market order. */
export async function placeOrder(conn: KalshiConn, ticker: string, side: 'yes' | 'no', count: number): Promise<KResp> {
  return kalshi(conn, 'POST', '/trade-api/v2/portfolio/orders', {
    payload: { ticker, action: 'buy', side, count, type: 'market', client_order_id: 'mx-' + Date.now() + '-' + Math.round(Math.random() * 1e6) },
  })
}
export function errMsg(r: KResp): string {
  if (r.error) return r.error
  const d = r.data as { error?: { message?: string } | string } | null
  const m = typeof d?.error === 'string' ? d.error : d?.error?.message
  return m || `Kalshi HTTP ${r.status}`
}
