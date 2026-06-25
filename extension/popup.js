const statEl = document.getElementById('stat')
const hintEl = document.getElementById('hint')
chrome.runtime.sendMessage({ type: 'YN_STATUS_QUERY' }, (res) => {
  if (res && res.onTV) {
    statEl.textContent = '● TradingView detected'; statEl.className = 'stat ok'
    hintEl.textContent = 'The copilot is awake on this tab.'
  } else {
    statEl.textContent = '○ not on TradingView'; statEl.className = 'stat no'
    hintEl.innerHTML = 'Open a chart at <a href="https://www.tradingview.com/chart/" target="_blank">tradingview.com/chart</a> first.'
  }
})
document.getElementById('toggle').onclick = () => { chrome.runtime.sendMessage({ type: 'YN_TOGGLE_ACTIVE' }); window.close() }
