// YN Copilot — background service worker (MV3)
// Gates activation to TradingView tabs, routes the toggle hotkey, badges status.

const TV = /:\/\/[^/]*tradingview\.com\//

function isTV(url) { return !!url && TV.test(url) }

async function badge(tabId, on) {
  try {
    await chrome.action.setBadgeText({ tabId, text: on ? '●' : '' })
    await chrome.action.setBadgeBackgroundColor({ tabId, color: on ? '#10b981' : '#888' })
  } catch {}
}

// keep the badge in sync with whether the active tab is TradingView
async function refresh(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId)
    badge(tabId, isTV(tab.url))
  } catch {}
}

chrome.tabs.onActivated.addListener(({ tabId }) => refresh(tabId))
chrome.tabs.onUpdated.addListener((tabId, info, tab) => { if (info.status === 'complete') badge(tabId, isTV(tab.url)) })

// Hotkey (Alt+Y) → toggle the copilot in the active TradingView tab.
chrome.commands.onCommand.addListener(async (cmd) => {
  if (cmd !== 'toggle-copilot') return
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) return
  if (!isTV(tab.url)) {
    // not on TradingView → open a chart so the agent has somewhere to live
    chrome.tabs.create({ url: 'https://www.tradingview.com/chart/' })
    return
  }
  chrome.tabs.sendMessage(tab.id, { type: 'YN_TOGGLE' }).catch(() => {})
})

// Popup asks us to toggle / report status.
chrome.runtime.onMessage.addListener((msg, sender, send) => {
  if (msg?.type === 'YN_STATUS_QUERY') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => send({ onTV: isTV(t?.url), url: t?.url || '' }))
    return true
  }
  if (msg?.type === 'YN_TOGGLE_ACTIVE') {
    chrome.tabs.query({ active: true, currentWindow: true }).then(([t]) => {
      if (t && isTV(t.url)) chrome.tabs.sendMessage(t.id, { type: 'YN_TOGGLE' }).catch(() => {})
    })
  }
})
