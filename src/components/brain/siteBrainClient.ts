// ════════════════════════════════════════════════════════════════════════════
// YN Finance — SITE BRAIN (client tracker). Privacy-safe by design:
//  • cookieless random visitor id in localStorage (no PII, no fingerprinting)
//  • captures CLICKS, DWELL time, SCROLL depth, and ticker NAVIGATION
//  • NEVER logs raw keystrokes / arbitrary text — only known ticker symbols
//  • honors an opt-out flag; one-line reset wipes the local id
// ════════════════════════════════════════════════════════════════════════════

type Ev = { type: string; path?: string; target?: string; value?: number; meta?: Record<string, unknown> }

const VID_KEY = 'yn_brain_vid'
const OPT_OUT = 'yn_brain_opt_out'

function rid(): string {
  try {
    const a = new Uint8Array(9); crypto.getRandomValues(a)
    return Array.from(a, (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 14)
  } catch { return Math.random().toString(36).slice(2, 16) }
}

export function optedOut(): boolean {
  try { return localStorage.getItem(OPT_OUT) === '1' } catch { return false }
}
export function setOptOut(v: boolean) {
  try { v ? localStorage.setItem(OPT_OUT, '1') : localStorage.removeItem(OPT_OUT) } catch {}
}
export function visitorId(): string {
  try {
    let v = localStorage.getItem(VID_KEY)
    if (!v) { v = rid(); localStorage.setItem(VID_KEY, v) }
    return v
  } catch { return 'anon' }
}
export function resetBrain() {
  try { localStorage.removeItem(VID_KEY) } catch {}
}

let queue: Ev[] = []
let sid = ''
let flushTimer: ReturnType<typeof setTimeout> | null = null

function sessionId(): string {
  if (sid) return sid
  try {
    sid = sessionStorage.getItem('yn_brain_sid') || rid()
    sessionStorage.setItem('yn_brain_sid', sid)
  } catch { sid = rid() }
  return sid
}

function uid(): string | null {
  // best-effort: Supabase stores the auth user in localStorage under sb-*-auth-token
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('sb-') && k.endsWith('-auth-token')) {
        const j = JSON.parse(localStorage.getItem(k) || '{}')
        const id = j?.user?.id || j?.currentSession?.user?.id
        if (id) return String(id)
      }
    }
  } catch {}
  return null
}

function flush(beacon = false) {
  if (!queue.length || optedOut()) { queue = []; return }
  const payload = JSON.stringify({ vid: visitorId(), uid: uid(), sid: sessionId(), events: queue })
  queue = []
  try {
    if (beacon && navigator.sendBeacon) {
      navigator.sendBeacon('/api/brain/track', new Blob([payload], { type: 'application/json' }))
    } else {
      fetch('/api/brain/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: payload, keepalive: true }).catch(() => {})
    }
  } catch {}
}

export function track(ev: Ev) {
  if (optedOut()) return
  queue.push(ev)
  if (queue.length >= 12) flush()
  else if (!flushTimer) flushTimer = setTimeout(() => { flushTimer = null; flush() }, 4000)
}

// ── per-page lifecycle: dwell + scroll depth ────────────────────────────────
let pageStart = 0
let maxScroll = 0
let curPath = ''

function scrollPct(): number {
  const h = document.documentElement
  const denom = (h.scrollHeight - h.clientHeight) || 1
  return Math.min(100, Math.round((h.scrollTop / denom) * 100))
}

export function pageEnter(path: string) {
  // close out the previous page first
  pageLeave()
  curPath = path
  pageStart = Date.now()
  maxScroll = 0
  track({ type: 'pageview', path })
  // ticker navigation: /stock/AAPL etc.
  const m = path.match(/\/stock\/([A-Za-z.\-]{1,6})/)
  if (m) track({ type: 'ticker', path, target: m[1].toUpperCase() })
}

export function pageLeave() {
  if (!curPath || !pageStart) return
  const dwell = Date.now() - pageStart
  if (dwell > 1200) track({ type: 'dwell', path: curPath, value: dwell })
  if (maxScroll > 0) track({ type: 'scroll', path: curPath, value: maxScroll })
  pageStart = 0
}

let bound = false
export function bindGlobal() {
  if (bound || typeof window === 'undefined') return
  bound = true

  // delegated clicks — only on links / elements that opt in via data-brain
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest('[data-brain],a[href]') as HTMLElement | null
    if (!el) return
    const tag = el.getAttribute('data-brain')
    const href = el.getAttribute('href') || ''
    const surface = el.getAttribute('data-brain-surface') || undefined
    const target = tag || href.replace(/^\//, '').split(/[?#]/)[0].split('/')[0] || undefined
    if (target) track({ type: 'click', path: location.pathname, target, meta: surface ? { surface } : undefined })
  }, { capture: true })

  // ticker chips: any element with data-ticker registers interest on click
  document.addEventListener('click', (e) => {
    const el = (e.target as HTMLElement)?.closest('[data-ticker]') as HTMLElement | null
    const sym = el?.getAttribute('data-ticker')
    if (sym) track({ type: 'ticker', path: location.pathname, target: sym.toUpperCase() })
  }, { capture: true })

  window.addEventListener('scroll', () => { const p = scrollPct(); if (p > maxScroll) maxScroll = p }, { passive: true })

  // flush on tab hide / unload
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') { pageLeave(); flush(true) } })
  window.addEventListener('pagehide', () => { pageLeave(); flush(true) })
}

// fetch the learned profile for this visitor (optionally ranking candidate keys)
export async function fetchProfile(candidates?: string[]): Promise<null | {
  ready: boolean; seen?: number; segment?: string; usingModel?: boolean
  features?: { key: string; label: string; score: number }[]
  tickers?: { sym: string; score: number }[]; recommend?: string | null; order?: string[]
  predictedNext?: string | null; confidence?: number | null; scores?: Record<string, number>
}> {
  try {
    const q = new URLSearchParams({ vid: visitorId() })
    if (candidates?.length) q.set('cand', candidates.join(','))
    const r = await fetch('/api/brain/me?' + q.toString(), { cache: 'no-store' })
    return await r.json()
  } catch { return null }
}

export function markConvert(target: string) { track({ type: 'convert', path: location.pathname, target }); flush() }
