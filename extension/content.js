// ════════════════════════════════════════════════════════════════════════════
// YN Copilot for TradingView — content script (v2)
// Talk/type sidebar (draggable + resizable). Draws levels with NO calibration:
// it auto-reads TradingView's own price axis via the crosshair to map price→pixel,
// then draws on an overlay (reliable) and can attempt native TV horizontal lines.
// Brain = your YN backend (/api/copilot/agent).
// ════════════════════════════════════════════════════════════════════════════
(() => {
  if (window.__ynCopilot) return
  window.__ynCopilot = true

  const DEFAULT_API = 'https://ynfinance.org'
  let API = DEFAULT_API, speakOn = false, nativeOn = false, rec = null
  const history = []
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

  chrome.storage?.sync.get(['apiBase', 'speak', 'nativeDraw'], (v) => {
    if (v.apiBase) API = v.apiBase; speakOn = !!v.speak; nativeOn = !!v.nativeDraw
  })

  // ── chart context ───────────────────────────────────────────────────────────
  function detectSymbol() {
    const m = (document.title || '').match(/^([A-Z0-9!:._-]{1,15})\s/)
    if (m) return m[1].replace(/.*:/, '')
    const el = document.querySelector('[data-symbol-short], [class*="symbolTitle"]')
    return el ? (el.textContent || '').trim().split(/\s/)[0].toUpperCase() : ''
  }
  function detectTimeframe() {
    const el = document.querySelector('[id*="interval"] [aria-pressed="true"], [data-name="resolution"] [class*="value"]')
    return el ? el.textContent.trim() : ''
  }

  // ── find the chart's main canvas + map price↔pixel via the crosshair ─────────
  function chartPane() {
    const cs = [...document.querySelectorAll('canvas')].map((c) => ({ c, r: c.getBoundingClientRect() }))
      .filter((o) => o.r.width > 300 && o.r.height > 200)
    cs.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height)
    return cs[0]?.c || null
  }
  function fire(el, type, x, y) { el.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y })) }
  // read the price the crosshair reports on the right axis at vertical position y
  function axisPriceAt(y, rect) {
    let best = null
    for (const el of document.querySelectorAll('div,span')) {
      const t = (el.textContent || '').trim().replace(/,/g, '')
      if (!/^\d+(\.\d+)?$/.test(t)) continue
      const r = el.getBoundingClientRect()
      if (r.left < rect.right - 95 || r.width > 80 || r.height > 28 || r.width < 8) continue
      const cy = r.top + r.height / 2, d = Math.abs(cy - y)
      if (d < 16 && (!best || d < best.d)) best = { v: parseFloat(t), d }
    }
    return best ? best.v : null
  }
  let pmap = null, pmapAt = 0
  async function buildMap() {
    const cv = chartPane(); if (!cv) return false
    const r = cv.getBoundingClientRect(), x = r.left + r.width * 0.5, pts = []
    for (const f of [0.28, 0.72]) {
      const y = r.top + r.height * f
      fire(cv, 'mousemove', x, y); await sleep(80)
      const p = axisPriceAt(y, r); if (p != null) pts.push({ y, p })
    }
    fire(cv, 'mouseout', x, r.top - 50)
    if (pts.length === 2 && pts[0].p !== pts[1].p) { pmap = { p1: pts[0].p, y1: pts[0].y, p2: pts[1].p, y2: pts[1].y }; pmapAt = Date.now(); return true }
    return false
  }
  async function ensureMap() { if (!pmap || Date.now() - pmapAt > 12000) await buildMap(); return !!pmap }
  function priceToY(price) { if (!pmap) return null; const { p1, y1, p2, y2 } = pmap; return y1 + (price - p1) * (y2 - y1) / (p2 - p1) }

  // ── overlay drawing (reliable, auto-mapped) ─────────────────────────────────
  let canvas, ctx, drawings = []
  function ensureCanvas() {
    if (canvas && document.body.contains(canvas)) return
    canvas = document.createElement('canvas'); canvas.id = 'yn-overlay'
    Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: 2147482000, pointerEvents: 'none' })
    document.body.appendChild(canvas); ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; redraw() }
    resize(); window.addEventListener('resize', resize); window.addEventListener('scroll', redraw, true)
  }
  function redraw() {
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const d of drawings) {
      const y = priceToY(d.price); if (y == null) continue
      if (d.type === 'hline') {
        ctx.strokeStyle = d.color || '#10b981'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 4])
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); ctx.setLineDash([])
        ctx.font = '700 11px ui-monospace, monospace'
        const label = `${d.label || ''} ${d.price}`.trim(), w = ctx.measureText(label).width + 14
        ctx.fillStyle = d.color || '#10b981'; ctx.fillRect(10, y - 9, w, 17)
        ctx.fillStyle = '#04140c'; ctx.fillText(label, 17, y + 3)
      } else {
        ctx.fillStyle = 'rgba(31,59,255,.92)'; ctx.font = '600 12px Inter, system-ui, sans-serif'
        const w = ctx.measureText(d.text).width + 20
        ctx.fillRect(90, y - 11, w, 22); ctx.fillStyle = '#fff'; ctx.fillText('💬 ' + d.text, 99, y + 4)
      }
    }
  }
  function clearDrawings() { drawings = []; redraw(); say('Cleared the levels.', 'bot') }

  // ── attempt NATIVE TradingView horizontal line (beta) ───────────────────────
  async function drawNative(price) {
    if (!(await ensureMap())) return false
    const y = priceToY(price), cv = chartPane(); if (y == null || !cv) return false
    const r = cv.getBoundingClientRect(), x = r.left + r.width * 0.5
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'h', code: 'KeyH', altKey: true, bubbles: true }))
    await sleep(140)
    fire(cv, 'mousemove', x, y); await sleep(50)
    fire(cv, 'mousedown', x, y); fire(cv, 'mouseup', x, y); fire(cv, 'click', x, y)
    return true
  }

  // ── execute an agent plan ────────────────────────────────────────────────────
  async function executePlan(plan) {
    if (!plan) return
    if (plan.say) { say(plan.say, 'bot'); speakOn && speak(plan.say) }
    const levels = (plan.draw || []).filter((d) => d && typeof d.price === 'number')
    if (levels.length) {
      ensureCanvas()
      const mapped = await ensureMap()
      for (const d of levels) {
        drawings.push({ type: 'hline', price: d.price, label: d.label, color: d.color })
        if (nativeOn) await drawNative(d.price)
      }
      redraw()
      if (!mapped) say('(Heads up: I couldn’t read the price axis to place those exactly — move the crosshair over the chart once and ask again.)', 'bot')
    }
    if (Array.isArray(plan.annotate)) { ensureCanvas(); for (const a of plan.annotate) if (a) drawings.push({ type: 'note', price: a.price, text: a.text }); redraw() }
    if (plan.pine && plan.pine.code) addPineCard(plan.pine)
    if (plan.routine) say(`Routine idea: “${plan.routine}”. Hit “＋ Save routine” to keep it.`, 'bot')
  }

  async function injectPine(code) {
    try {
      const tab = [...document.querySelectorAll('button,[role="tab"]')].find((b) => /pine|editor/i.test(b.textContent || ''))
      if (tab) tab.click(); await sleep(600)
      const models = window.monaco?.editor?.getModels?.()
      if (models && models.length) { models[models.length - 1].setValue(code); say('Pasted into the Pine editor — hit “Add to chart”.', 'bot'); return }
    } catch {}
    await navigator.clipboard.writeText(code).catch(() => {})
    say('Copied the indicator to your clipboard — open Pine Editor → paste → Add to chart.', 'bot')
  }

  async function callAgent(message) {
    say('…thinking', 'bot', true)
    try {
      const r = await fetch(API.replace(/\/$/, '') + '/api/copilot/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: detectSymbol(), timeframe: detectTimeframe(), url: location.href, message, history: history.slice(-8) }),
      })
      const plan = await r.json(); removeThinking()
      history.push({ role: 'user', text: message }, { role: 'bot', text: plan.say || '' })
      executePlan(plan)
    } catch { removeThinking(); say('Couldn’t reach the YN brain — check the API URL (⚙).', 'bot') }
  }

  function speak(t) { try { const u = new SpeechSynthesisUtterance(t.slice(0, 240)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {} }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) return say('Voice input isn’t supported here.', 'bot')
    if (rec) { rec.stop(); return }
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; setMic(true)
    rec.onresult = (e) => { input.value = e.results[0][0].transcript; send() }
    rec.onend = () => { rec = null; setMic(false) }; rec.onerror = () => { rec = null; setMic(false) }
    rec.start()
  }

  function saveRoutine() {
    const name = prompt('Name this routine (e.g. "Morning levels")'); if (!name) return
    const sym = detectSymbol(), msg = history.filter((h) => h.role === 'user').slice(-1)[0]?.text || 'mark the key levels'
    chrome.storage?.sync.get(['routines'], (v) => { const all = v.routines || {}; (all[sym] = all[sym] || []).push({ name, msg }); chrome.storage?.sync.set({ routines: all }); say(`Saved “${name}” for ${sym}. Type “run ${name}” anytime.`, 'bot') })
  }
  function runRoutine(name) {
    chrome.storage?.sync.get(['routines'], (v) => {
      const list = (v.routines || {})[detectSymbol()] || [], hit = list.find((r) => r.name.toLowerCase() === name.toLowerCase()) || list[0]
      if (hit) callAgent(hit.msg); else say('No routine by that name on this symbol.', 'bot')
    })
  }

  // ── UI: draggable + resizable panel (shadow DOM) ────────────────────────────
  let root, log, input, host
  function build() {
    host = document.createElement('div'); host.id = 'yn-copilot-host'
    document.documentElement.appendChild(host)
    root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host{ all: initial }
        .panel{ position:fixed; width:340px; height:520px; min-width:280px; min-height:360px; max-width:92vw; max-height:92vh;
          resize:both; overflow:hidden;
          background:linear-gradient(180deg,#0b0f1e,#070912); color:#dfe6ff; border:1px solid rgba(31,59,255,.4);
          border-radius:16px; box-shadow:0 24px 70px rgba(0,0,0,.55); display:flex; flex-direction:column;
          font-family:ui-monospace,Menlo,monospace; z-index:2147483600 }
        .hdr{ display:flex; align-items:center; gap:8px; padding:11px 13px; border-bottom:1px solid rgba(255,255,255,.08); cursor:move; user-select:none }
        .dot{ width:8px;height:8px;border-radius:99px;background:#10b981;box-shadow:0 0 8px #10b981 }
        .title{ font-weight:800; font-size:13px } .sym{ margin-left:auto; font-size:11px; color:#7e8db5 }
        .gear,.x{ background:none;border:none;color:#7e8db5;cursor:pointer;font-size:14px;padding:2px 4px }
        .log{ flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:9px; font-family:Inter,system-ui,sans-serif }
        .msg{ font-size:13px; line-height:1.5; padding:9px 11px; border-radius:12px; max-width:88% }
        .bot{ background:rgba(31,59,255,.13); border:1px solid rgba(31,59,255,.22); align-self:flex-start }
        .me{ background:#1f3bff; color:#fff; align-self:flex-end }
        .row{ display:flex; gap:6px; padding:8px 10px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,.06) }
        .chip{ font-size:11px; color:#cdd6ff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:99px; padding:5px 10px; cursor:pointer }
        .chip:hover{ border-color:rgba(31,59,255,.5) }
        .speak{ font-size:11px;color:#7e8db5;cursor:pointer } .speak.on{ color:#10b981 }
        .in{ display:flex; gap:8px; padding:10px; border-top:1px solid rgba(255,255,255,.08) }
        input{ flex:1; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:10px; padding:9px 11px; font-size:13px; outline:none }
        .mic,.send{ border:none; border-radius:10px; width:38px; cursor:pointer; font-size:15px }
        .mic{ background:rgba(255,255,255,.06); color:#cdd6ff } .mic.on{ background:#ef4444; color:#fff }
        .send{ background:linear-gradient(135deg,#1f3bff,#10b981); color:#fff }
        .pine{ background:#05080f;border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:10px }
        .pine pre{ font-size:10.5px;color:#9fe9c9;white-space:pre-wrap;max-height:120px;overflow:auto;margin:6px 0 }
        .pine button{ font-size:11px;background:#10b981;color:#04140c;border:none;border-radius:7px;padding:6px 10px;cursor:pointer;font-weight:700 }
        .settings{ position:absolute; inset:0; background:#070912; padding:16px; display:none; flex-direction:column; gap:12px; z-index:5 }
        .settings.show{ display:flex } .settings label{ font-size:12px;color:#9aa3c8;display:flex;align-items:center;gap:8px }
      </style>
      <div class="panel" id="yn-panel">
        <div class="hdr" id="yn-hdr"><span class="dot"></span><span class="title">YN Copilot</span>
          <span class="sym" id="yn-sym"></span><button class="gear" id="yn-gear">⚙</button><button class="x" id="yn-x">✕</button></div>
        <div class="log" id="yn-log"></div>
        <div class="row">
          <span class="chip" data-act="analyze">Analyze</span>
          <span class="chip" data-act="levels">Mark levels</span>
          <span class="chip" data-act="indicator">Write indicator</span>
          <span class="chip" data-act="clear">Clear</span>
          <span class="chip" data-act="routine">＋ Routine</span>
          <span class="speak" id="yn-speak">🔊 speak</span>
        </div>
        <div class="in"><input id="yn-input" placeholder="Talk or type… e.g. mark prior-day high/low" />
          <button class="mic" id="yn-mic">🎤</button><button class="send" id="yn-send">➤</button></div>
        <div class="settings" id="yn-settings">
          <label>YN API base URL</label><input id="yn-api" />
          <label><input type="checkbox" id="yn-native" /> Try native TradingView lines (beta)</label>
          <button class="send" id="yn-save" style="width:auto;padding:8px 14px">Save</button>
          <div style="font-size:11px;color:#7e8db5;line-height:1.5">Native mode drives TradingView’s own horizontal-line tool. It’s experimental — if lines don’t land, leave it off and the overlay places them precisely (auto-mapped, no calibration).</div>
        </div>
      </div>`
    log = root.getElementById('yn-log'); input = root.getElementById('yn-input')
    const panel = root.getElementById('yn-panel')
    root.getElementById('yn-sym').textContent = detectSymbol() || '—'
    root.getElementById('yn-x').onclick = () => toggle(false)
    root.getElementById('yn-send').onclick = send
    root.getElementById('yn-mic').onclick = listen
    input.onkeydown = (e) => { if (e.key === 'Enter') send() }
    root.getElementById('yn-speak').classList.toggle('on', speakOn)
    root.getElementById('yn-speak').onclick = (e) => { speakOn = !speakOn; chrome.storage?.sync.set({ speak: speakOn }); e.target.classList.toggle('on', speakOn) }
    root.querySelectorAll('.chip').forEach((c) => c.onclick = () => quick(c.dataset.act))
    const gear = root.getElementById('yn-gear'), settings = root.getElementById('yn-settings'), apiIn = root.getElementById('yn-api'), nativeBox = root.getElementById('yn-native')
    gear.onclick = () => { apiIn.value = API; nativeBox.checked = nativeOn; settings.classList.toggle('show') }
    root.getElementById('yn-save').onclick = () => { API = apiIn.value.trim() || DEFAULT_API; nativeOn = nativeBox.checked; chrome.storage?.sync.set({ apiBase: API, nativeDraw: nativeOn }); settings.classList.remove('show'); say('Saved.', 'bot') }

    // restore position/size
    chrome.storage?.sync.get(['panelBox'], (v) => {
      const b = v.panelBox
      if (b) { panel.style.left = b.left + 'px'; panel.style.top = b.top + 'px'; if (b.w) panel.style.width = b.w + 'px'; if (b.h) panel.style.height = b.h + 'px' }
      else { panel.style.left = Math.max(8, innerWidth - 356) + 'px'; panel.style.top = Math.max(8, innerHeight - 540) + 'px' }
    })
    // DRAG via header
    const hdr = root.getElementById('yn-hdr'); let drag = null
    hdr.addEventListener('mousedown', (e) => { const r = panel.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault() })
    window.addEventListener('mousemove', (e) => { if (!drag) return; panel.style.left = Math.min(innerWidth - 60, Math.max(0, e.clientX - drag.dx)) + 'px'; panel.style.top = Math.min(innerHeight - 40, Math.max(0, e.clientY - drag.dy)) + 'px' })
    window.addEventListener('mouseup', () => { if (!drag) return; drag = null; persistBox(panel) })
    // RESIZE (native CSS resize) → persist
    new ResizeObserver(() => persistBox(panel)).observe(panel)

    say(`Hey — copilot’s on ${detectSymbol() || 'this chart'}. Ask me to mark levels, read the structure, or write an indicator. Drag me by the header, resize from the corner.`, 'bot')
  }
  let boxT
  function persistBox(panel) { clearTimeout(boxT); boxT = setTimeout(() => { const r = panel.getBoundingClientRect(); chrome.storage?.sync.set({ panelBox: { left: r.left, top: r.top, w: r.width, h: r.height } }) }, 300) }

  function quick(act) {
    if (act === 'clear') return clearDrawings()
    if (act === 'routine') return saveRoutine()
    const m = { analyze: 'Analyze this chart — trend, key levels, and what to watch.', levels: 'Mark the prior-day high/low and the key levels.', indicator: 'Write a Pine indicator for prior-day high/low and the 200 EMA.' }[act]
    if (m) { input.value = m; send() }
  }
  function send() { const t = input.value.trim(); if (!t) return; say(t, 'me'); input.value = ''; if (/^run\s+/i.test(t)) return runRoutine(t.replace(/^run\s+/i, '').trim()); callAgent(t) }
  function setMic(on) { const m = root && root.getElementById('yn-mic'); if (m) m.classList.toggle('on', on) }

  let thinking
  function say(text, who, isThinking) { if (!root) return; const d = document.createElement('div'); d.className = 'msg ' + (who === 'me' ? 'me' : 'bot'); d.textContent = text; if (isThinking) thinking = d; log.appendChild(d); log.scrollTop = log.scrollHeight }
  function removeThinking() { if (thinking) { thinking.remove(); thinking = null } }
  function addPineCard(pine) { const c = document.createElement('div'); c.className = 'pine'; c.innerHTML = `<div style="font-size:12px;font-weight:700;color:#86f0c0">⚡ ${pine.name || 'Indicator'}</div><pre></pre><button>Paste into TradingView</button>`; c.querySelector('pre').textContent = pine.code; c.querySelector('button').onclick = () => injectPine(pine.code); log.appendChild(c); log.scrollTop = log.scrollHeight }

  // ── show/hide + launcher pill ───────────────────────────────────────────────
  let open = false
  function toggle(force) {
    open = force == null ? !open : force
    if (open && !host) build()
    if (host) host.style.display = open ? 'block' : 'none'
    const lh = document.getElementById('yn-launch-host'); if (lh) lh.style.display = open ? 'none' : 'block'
  }
  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'YN_TOGGLE') toggle() })

  function mountLauncher() {
    if (document.getElementById('yn-launch-host')) return
    const lh = document.createElement('div'); lh.id = 'yn-launch-host'; document.documentElement.appendChild(lh)
    const lr = lh.attachShadow({ mode: 'open' })
    lr.innerHTML = `<style>:host{all:initial}.b{position:fixed;right:16px;bottom:16px;z-index:2147483500;display:flex;align-items:center;gap:8px;padding:11px 16px;border-radius:99px;cursor:pointer;border:1px solid rgba(31,59,255,.5);background:linear-gradient(135deg,#0b1430,#0a1f17);color:#dfe6ff;font:700 13px ui-monospace,Menlo,monospace;box-shadow:0 10px 30px rgba(0,0,0,.5);animation:p 3s ease-in-out infinite}.b:hover{transform:translateY(-2px)}.d{width:9px;height:9px;border-radius:99px;background:#10b981;box-shadow:0 0 10px #10b981}@keyframes p{0%,100%{box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 0 rgba(16,185,129,.5)}50%{box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 7px rgba(16,185,129,0)}}</style><div class="b" id="l"><span class="d"></span>Ask YN ⌥Y</div>`
    lr.getElementById('l').onclick = () => toggle(true)
  }
  mountLauncher()
  if (/\/chart\//.test(location.pathname)) setTimeout(() => toggle(true), 1200)
})()
