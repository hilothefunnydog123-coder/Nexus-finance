// YN Copilot — background service worker (MV3)
// Activation gating + the REAL automation bridge: drives the page via the Chrome
// DevTools Protocol (chrome.debugger) so mouse/keyboard input is genuinely
// trusted — TradingView reacts to it exactly like a human. (Chrome shows a
// "started debugging this browser" bar while attached; that's the cost of real input.)

const TV = /:\/\/[^/]*tradingview\.com\//
const isTV = (url) => !!url && TV.test(url)

async function badge(tabId, on) {
  try { await chrome.action.setBadgeText({ tabId, text: on ? '●' : '' }); await chrome.action.setBadgeBackgroundColor({ tabId, color: on ? '#10b981' : '#888' }) } catch {}
}
async function refresh(tabId) { try { const t = await chrome.tabs.get(tabId); badge(tabId, isTV(t.url)) } catch {} }
chrome.tabs.onActivated.addListener(({ tabId }) => refresh(tabId))
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.status === 'complete') badge(tabId, isTV(tab.url)) })

chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-copilot') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) return
  if (!isTV(tab.url)) { chrome.tabs.create({ url: 'https://www.tradingview.com/chart/' }); return }
  chrome.tabs.sendMessage(tab.id, { type: 'YN_TOGGLE' }).catch(() => {})
})

// ── CDP automation bridge ────────────────────────────────────────────────────
const attached = new Set()
function send(tabId, method, params) {
  return new Promise((res, rej) => chrome.debugger.sendCommand({ tabId }, method, params || {}, (r) => chrome.runtime.lastError ? rej(chrome.runtime.lastError) : res(r)))
}
function ensureAttached(tabId) {
  if (attached.has(tabId)) return Promise.resolve()
  return new Promise((res, rej) => chrome.debugger.attach({ tabId }, '1.3', () => {
    if (chrome.runtime.lastError) return rej(chrome.runtime.lastError)
    attached.add(tabId); res()
  }))
}
chrome.debugger.onDetach.addListener((src) => attached.delete(src.tabId))

async function realClick(tabId, x, y, clickCount = 1) {
  await send(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
  await send(tabId, 'Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', buttons: 1, clickCount })
  await send(tabId, 'Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', buttons: 1, clickCount })
}
async function realKey(tabId, { key, code, vk, mods = 0 }) {
  await send(tabId, 'Input.dispatchKeyEvent', { type: 'keyDown', modifiers: mods, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
  await send(tabId, 'Input.dispatchKeyEvent', { type: 'keyUp', modifiers: mods, key, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk })
}
async function evalp(tabId, expr) {
  const r = await send(tabId, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })
  return r?.result?.value
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  const tabId = sender.tab?.id
  if (msg?.type === 'YN_CDP') {
    ;(async () => {
      try {
        await ensureAttached(tabId)
        if (msg.cmd === 'click') { await realClick(tabId, msg.x, msg.y, msg.clickCount || 1); sendResponse({ ok: true }) }
        else if (msg.cmd === 'move') { await send(tabId, 'Input.dispatchMouseEvent', { type: 'mouseMoved', x: msg.x, y: msg.y }); sendResponse({ ok: true }) }
        else if (msg.cmd === 'key') { await realKey(tabId, msg); sendResponse({ ok: true }) }
        else if (msg.cmd === 'eval') { sendResponse({ ok: true, value: await evalp(tabId, msg.expr) }) }
        else if (msg.cmd === 'detach') { if (attached.has(tabId)) { await chrome.debugger.detach({ tabId }); attached.delete(tabId) } sendResponse({ ok: true }) }
        else sendResponse({ ok: false, error: 'unknown cmd' })
      } catch (e) { sendResponse({ ok: false, error: String(e?.message || e) }) }
    })()
    return true // async
  }
  if (msg?.type === 'YN_STATUS_QUERY') { chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => sendResponse({ onTV: isTV(t?.url), url: t?.url || '' })); return true }
  if (msg?.type === 'YN_TOGGLE_ACTIVE') { chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => { if (t && isTV(t.url)) chrome.tabs.sendMessage(t.id, { type: 'YN_TOGGLE' }).catch(() => {}) }) }
})
