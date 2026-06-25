// ════════════════════════════════════════════════════════════════════════════
// YN Copilot for TradingView — content script
// Lives in the TradingView tab. Detects the chart, gives you a chat/voice sidebar,
// draws levels & callouts on a reliable overlay canvas, and writes indicators.
// The "brain" is your YN backend (/api/copilot/agent); this file is the hands.
// ════════════════════════════════════════════════════════════════════════════
(() => {
  if (window.__ynCopilot) return
  window.__ynCopilot = true

  const DEFAULT_API = 'https://ynfinance.org'
  let API = DEFAULT_API
  let speakOn = false
  let rec = null
  const history = []

  // ── config ────────────────────────────────────────────────────────────────
  chrome.storage?.sync.get(['apiBase', 'speak'], (v) => {
    if (v.apiBase) API = v.apiBase
    speakOn = !!v.speak
    const t = root && root.getElementById('yn-speak'); if (t) t.classList.toggle('on', speakOn)
  })

  // ── chart context detection ─────────────────────────────────────────────────
  function detectSymbol() {
    // TradingView keeps "SYMBOL price … — TradingView" in the title
    const m = (document.title || '').match(/^([A-Z0-9!:._-]{1,15})\s/)
    if (m) return m[1].replace(/:.*/, '')
    const el = document.querySelector('[data-symbol-short], [class*="symbolTitle"], #header-toolbar-symbol-search')
    if (el && el.textContent) return el.textContent.trim().split(/\s/)[0].toUpperCase()
    return ''
  }
  function detectTimeframe() {
    const el = document.querySelector('[data-name="resolution"] [class*="value"], #header-toolbar-intervals [aria-pressed="true"]')
    return el ? el.textContent.trim() : ''
  }
  function context() { return { symbol: detectSymbol(), timeframe: detectTimeframe(), url: location.href } }

  // ── overlay canvas (the reliable drawing surface) ───────────────────────────
  let canvas, ctx, drawings = []
  let calib = null // { p1, y1, p2, y2 } linear price→y map
  function chartHost() {
    return document.querySelector('.chart-container, [class*="chart-container"], .layout__area--center') || document.body
  }
  function ensureCanvas() {
    if (canvas && document.body.contains(canvas)) return
    canvas = document.createElement('canvas')
    canvas.id = 'yn-overlay'
    Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: 2147483000, pointerEvents: 'none' })
    document.body.appendChild(canvas)
    ctx = canvas.getContext('2d')
    const resize = () => { canvas.width = innerWidth; canvas.height = innerHeight; redraw() }
    resize(); window.addEventListener('resize', resize)
  }
  function priceToY(price) {
    if (!calib) return null
    const { p1, y1, p2, y2 } = calib
    if (p1 === p2) return null
    return y1 + (price - p1) * (y2 - y1) / (p2 - p1)
  }
  function redraw() {
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    for (const d of drawings) {
      if (d.type === 'hline') {
        const y = priceToY(d.price); if (y == null) continue
        ctx.strokeStyle = d.color || '#10b981'; ctx.lineWidth = 1.5; ctx.setLineDash([6, 4])
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); ctx.setLineDash([])
        ctx.fillStyle = d.color || '#10b981'
        ctx.font = '600 11px ui-monospace, monospace'
        const label = `${d.label || ''} ${d.price}`.trim()
        const w = ctx.measureText(label).width + 14
        ctx.fillRect(8, y - 9, w, 17)
        ctx.fillStyle = '#04140c'; ctx.fillText(label, 15, y + 3)
      } else if (d.type === 'note') {
        const y = d.price != null ? priceToY(d.price) : d.y; if (y == null) continue
        ctx.fillStyle = 'rgba(31,59,255,.92)'
        const w = ctx.measureText(d.text).width + 18
        ctx.fillRect(d.x || 80, y - 11, w, 22)
        ctx.fillStyle = '#fff'; ctx.font = '600 12px Inter, system-ui, sans-serif'
        ctx.fillText('💬 ' + d.text, (d.x || 80) + 9, y + 4)
      }
    }
  }
  function clearDrawings() { drawings = []; redraw() }

  // one-time calibration: click two points, type their prices → builds price→y map
  function calibrate() {
    ensureCanvas()
    canvas.style.pointerEvents = 'auto'
    canvas.style.cursor = 'crosshair'
    const pts = []
    say('Calibrate: click a point on the chart, then type the price it sits at. Do that twice.', 'bot')
    const onClick = (e) => {
      const price = parseFloat(prompt(`Price at y=${Math.round(e.clientY)} ?`))
      if (!isFinite(price)) return
      pts.push({ y: e.clientY, p: price })
      if (pts.length === 2) {
        calib = { p1: pts[0].p, y1: pts[0].y, p2: pts[1].p, y2: pts[1].y }
        chrome.storage?.sync.set({ ['calib_' + detectSymbol()]: calib })
        canvas.removeEventListener('click', onClick)
        canvas.style.pointerEvents = 'none'; canvas.style.cursor = ''
        say('Calibrated ✓ — I can place levels precisely now. (Re-calibrate after you zoom.)', 'bot')
        redraw()
      }
    }
    canvas.addEventListener('click', onClick)
  }
  // restore calibration for this symbol
  chrome.storage?.sync.get(['calib_' + detectSymbol()], (v) => { const c = v['calib_' + detectSymbol()]; if (c) calib = c })

  // ── action executor: turns an agent plan into chart actions ─────────────────
  function executePlan(plan) {
    if (!plan) return
    if (plan.say) say(plan.say, 'bot'), speakOn && speak(plan.say)
    if (Array.isArray(plan.draw) && plan.draw.length) {
      ensureCanvas()
      for (const d of plan.draw) if (d && typeof d.price === 'number') drawings.push({ type: 'hline', price: d.price, label: d.label, color: d.color })
      redraw()
      if (!calib) say('☝️ I computed the levels but need a quick one-time calibration to place them — hit “Calibrate”.', 'bot')
    }
    if (Array.isArray(plan.annotate)) { for (const a of plan.annotate) if (a) drawings.push({ type: 'note', price: a.price, text: a.text }); redraw() }
    if (plan.pine && plan.pine.code) offerPine(plan.pine)
    if (plan.routine) say(`Routine idea: “${plan.routine}”. Save it from the Routines row to auto-run it on this chart.`, 'bot')
  }

  // ── Pine: open the editor & inject code (best-effort), else copy to clipboard ─
  function offerPine(pine) {
    addPineCard(pine)
  }
  async function injectPine(code) {
    try {
      // open the Pine editor tab if present
      const tab = [...document.querySelectorAll('button, [role="tab"]')].find((b) => /pine|editor/i.test(b.textContent || ''))
      if (tab) tab.click()
      await new Promise((r) => setTimeout(r, 600))
      // Monaco editor instance
      const monaco = window.monaco
      const models = monaco?.editor?.getModels?.()
      if (models && models.length) { models[models.length - 1].setValue(code); say('Pasted the indicator into the Pine editor — hit “Add to chart”.', 'bot'); return true }
    } catch {}
    await navigator.clipboard.writeText(code).catch(() => {})
    say('Couldn’t reach the Pine editor directly — I copied the indicator to your clipboard. Open Pine Editor → paste → Add to chart.', 'bot')
    return false
  }

  // ── backend brain ────────────────────────────────────────────────────────────
  async function callAgent(message) {
    const ctxd = context()
    say('…thinking', 'bot', true)
    try {
      const r = await fetch(API.replace(/\/$/, '') + '/api/copilot/agent', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...ctxd, message, history: history.slice(-8) }),
      })
      const plan = await r.json()
      removeThinking()
      history.push({ role: 'user', text: message }, { role: 'bot', text: plan.say || '' })
      executePlan(plan)
    } catch (e) {
      removeThinking()
      say('Couldn’t reach the YN brain. Check the API URL in settings (gear).', 'bot')
    }
  }

  // ── voice ─────────────────────────────────────────────────────────────────
  function speak(text) {
    try { const u = new SpeechSynthesisUtterance(text.slice(0, 240)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {}
  }
  function listen() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { say('Voice input isn’t supported in this browser.', 'bot'); return }
    if (rec) { rec.stop(); rec = null; setMic(false); return }
    rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false
    setMic(true)
    rec.onresult = (e) => { const t = e.results[0][0].transcript; input.value = t; send() }
    rec.onend = () => { rec = null; setMic(false) }
    rec.onerror = () => { rec = null; setMic(false) }
    rec.start()
  }

  // ── routines (saved macros that auto-run per symbol) ────────────────────────
  function saveRoutine() {
    const name = prompt('Name this routine (e.g. "Morning levels")'); if (!name) return
    const sym = detectSymbol()
    const macro = { name, lastMessage: history.filter((h) => h.role === 'user').slice(-1)[0]?.text || 'mark the key levels' }
    chrome.storage?.sync.get(['routines'], (v) => {
      const all = v.routines || {}; (all[sym] = all[sym] || []).push(macro)
      chrome.storage?.sync.set({ routines: all })
      say(`Saved routine “${name}” for ${sym}. I’ll offer to run it when you open this chart.`, 'bot')
    })
  }
  function maybeOfferRoutine() {
    const sym = detectSymbol()
    chrome.storage?.sync.get(['routines'], (v) => {
      const list = (v.routines || {})[sym]; if (!list || !list.length) return
      say(`You have ${list.length} routine(s) for ${sym}. Type “run ${list[0].name}” to execute.`, 'bot')
    })
  }

  // ── UI (shadow DOM so TradingView CSS can't touch it) ───────────────────────
  let root, log, input, host
  function build() {
    host = document.createElement('div'); host.id = 'yn-copilot-host'
    document.documentElement.appendChild(host)
    root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host{ all: initial }
        .panel{ position:fixed; right:16px; bottom:16px; width:340px; max-width:calc(100vw - 24px); height:520px; max-height:calc(100vh - 32px);
          background:linear-gradient(180deg,#0b0f1e,#070912); color:#dfe6ff; border:1px solid rgba(31,59,255,.4);
          border-radius:18px; box-shadow:0 24px 70px rgba(0,0,0,.55); display:flex; flex-direction:column;
          font-family:ui-monospace,Menlo,monospace; z-index:2147483600; overflow:hidden }
        .hdr{ display:flex; align-items:center; gap:8px; padding:12px 14px; border-bottom:1px solid rgba(255,255,255,.08) }
        .dot{ width:8px;height:8px;border-radius:99px;background:#10b981;box-shadow:0 0 8px #10b981 }
        .title{ font-weight:800; font-size:13px; letter-spacing:.02em }
        .sym{ margin-left:auto; font-size:11px; color:#7e8db5 }
        .gear,.x{ background:none;border:none;color:#7e8db5;cursor:pointer;font-size:14px }
        .log{ flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:9px; font-family:Inter,system-ui,sans-serif }
        .msg{ font-size:13px; line-height:1.5; padding:9px 11px; border-radius:12px; max-width:88% }
        .bot{ background:rgba(31,59,255,.13); border:1px solid rgba(31,59,255,.22); align-self:flex-start }
        .me{ background:#1f3bff; color:#fff; align-self:flex-end }
        .row{ display:flex; gap:6px; padding:8px 10px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,.06) }
        .chip{ font-size:11px; color:#cdd6ff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12);
          border-radius:99px; padding:5px 10px; cursor:pointer; font-family:ui-monospace,monospace }
        .chip:hover{ border-color:rgba(31,59,255,.5) }
        .in{ display:flex; gap:8px; padding:10px; border-top:1px solid rgba(255,255,255,.08) }
        input{ flex:1; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:10px; padding:9px 11px; font-size:13px; outline:none }
        .mic,.send{ border:none; border-radius:10px; width:38px; cursor:pointer; font-size:15px }
        .mic{ background:rgba(255,255,255,.06); color:#cdd6ff } .mic.on{ background:#ef4444; color:#fff }
        .send{ background:linear-gradient(135deg,#1f3bff,#10b981); color:#fff }
        .speak{ font-size:11px;color:#7e8db5;cursor:pointer } .speak.on{ color:#10b981 }
        .pine{ background:#05080f;border:1px solid rgba(16,185,129,.3);border-radius:10px;padding:10px;margin:2px 0 }
        .pine pre{ font-size:10.5px;color:#9fe9c9;white-space:pre-wrap;max-height:120px;overflow:auto;margin:6px 0 }
        .pine button{ font-size:11px;background:#10b981;color:#04140c;border:none;border-radius:7px;padding:6px 10px;cursor:pointer;font-weight:700 }
        .settings{ position:absolute; inset:0; background:#070912; padding:16px; display:none; flex-direction:column; gap:10px }
        .settings.show{ display:flex } .settings label{ font-size:11px;color:#7e8db5 }
      </style>
      <div class="panel">
        <div class="hdr">
          <span class="dot"></span><span class="title">YN Copilot</span>
          <span class="sym" id="yn-sym"></span>
          <button class="gear" id="yn-gear" title="Settings">⚙</button>
          <button class="x" id="yn-x" title="Sleep (Alt+Y)">✕</button>
        </div>
        <div class="log" id="yn-log"></div>
        <div class="row">
          <span class="chip" data-act="analyze">Analyze this chart</span>
          <span class="chip" data-act="levels">Mark key levels</span>
          <span class="chip" data-act="indicator">Write an indicator</span>
          <span class="chip" data-act="calibrate">Calibrate</span>
          <span class="chip" data-act="clear">Clear drawings</span>
          <span class="chip" data-act="routine">＋ Save routine</span>
          <span class="speak" id="yn-speak">🔊 speak replies</span>
        </div>
        <div class="in">
          <input id="yn-input" placeholder="Talk or type… e.g. mark the overnight high/low" />
          <button class="mic" id="yn-mic" title="Voice">🎤</button>
          <button class="send" id="yn-send">➤</button>
        </div>
        <div class="settings" id="yn-settings">
          <label>YN API base URL</label>
          <input id="yn-api" />
          <button class="send" id="yn-save" style="width:auto;padding:8px 14px">Save</button>
          <div style="font-size:11px;color:#7e8db5;line-height:1.5">Default is https://ynfinance.org. Use http://localhost:3000 for local dev.</div>
        </div>
      </div>`
    log = root.getElementById('yn-log')
    input = root.getElementById('yn-input')
    root.getElementById('yn-sym').textContent = detectSymbol() || '—'
    root.getElementById('yn-x').onclick = () => toggle(false)
    root.getElementById('yn-send').onclick = send
    root.getElementById('yn-mic').onclick = listen
    input.onkeydown = (e) => { if (e.key === 'Enter') send() }
    root.getElementById('yn-speak').onclick = () => { speakOn = !speakOn; chrome.storage?.sync.set({ speak: speakOn }); root.getElementById('yn-speak').classList.toggle('on', speakOn) }
    root.querySelectorAll('.chip').forEach((c) => c.onclick = () => quick(c.dataset.act))
    const gear = root.getElementById('yn-gear'), settings = root.getElementById('yn-settings'), apiIn = root.getElementById('yn-api')
    gear.onclick = () => { apiIn.value = API; settings.classList.toggle('show') }
    root.getElementById('yn-save').onclick = () => { API = apiIn.value.trim() || DEFAULT_API; chrome.storage?.sync.set({ apiBase: API }); settings.classList.remove('show'); say('Saved API URL.', 'bot') }
    say(`Hey — I’m your TradingView copilot, watching ${detectSymbol() || 'this chart'}. Ask me to mark levels, read the structure, or write an indicator. Type or hit 🎤.`, 'bot')
    maybeOfferRoutine()
  }

  function quick(act) {
    if (act === 'calibrate') return calibrate()
    if (act === 'clear') return clearDrawings()
    if (act === 'routine') return saveRoutine()
    const m = { analyze: 'Analyze this chart — trend, key levels, and what you’d watch.', levels: 'Mark the key support/resistance and the prior-day high/low.', indicator: 'Write a Pine indicator that marks the prior-day high/low and the 200 EMA.' }[act]
    if (m) { input.value = m; send() }
  }
  function send() { const t = input.value.trim(); if (!t) return; say(t, 'me'); input.value = ''
    if (/^run\s+/i.test(t)) { callAgent('Run my routine: ' + t.replace(/^run\s+/i, '')); return }
    callAgent(t) }
  function setMic(on) { const m = root.getElementById('yn-mic'); if (m) m.classList.toggle('on', on) }

  let thinking
  function say(text, who, isThinking) {
    const d = document.createElement('div'); d.className = 'msg ' + (who === 'me' ? 'me' : 'bot'); d.textContent = text
    if (isThinking) { d.id = 'yn-think'; thinking = d }
    log.appendChild(d); log.scrollTop = log.scrollHeight
  }
  function removeThinking() { if (thinking) { thinking.remove(); thinking = null } }
  function addPineCard(pine) {
    const card = document.createElement('div'); card.className = 'pine'
    card.innerHTML = `<div style="font-size:12px;font-weight:700;color:#86f0c0">⚡ ${pine.name || 'Indicator'}</div><pre></pre><button>Paste into TradingView</button>`
    card.querySelector('pre').textContent = pine.code
    card.querySelector('button').onclick = () => injectPine(pine.code)
    log.appendChild(card); log.scrollTop = log.scrollHeight
  }

  // ── show/hide ───────────────────────────────────────────────────────────────
  let open = false
  function toggle(force) {
    open = force == null ? !open : force
    if (open && !host) build()
    if (host) host.style.display = open ? 'block' : 'none'
  }
  chrome.runtime.onMessage.addListener((msg) => { if (msg?.type === 'YN_TOGGLE') toggle() })

  // ── always-visible launcher pill so it's obvious how to talk to it ──────────
  function mountLauncher() {
    if (document.getElementById('yn-launch-host')) return
    const lh = document.createElement('div'); lh.id = 'yn-launch-host'
    document.documentElement.appendChild(lh)
    const lr = lh.attachShadow({ mode: 'open' })
    lr.innerHTML = `
      <style>
        :host{ all: initial }
        .btn{ position:fixed; right:16px; bottom:16px; z-index:2147483500; display:flex; align-items:center; gap:8px;
          padding:11px 16px; border-radius:99px; cursor:pointer; border:1px solid rgba(31,59,255,.5);
          background:linear-gradient(135deg,#0b1430,#0a1f17); color:#dfe6ff; font:700 13px ui-monospace,Menlo,monospace;
          box-shadow:0 10px 30px rgba(0,0,0,.5); animation: ynp 3s ease-in-out infinite }
        .btn:hover{ transform:translateY(-2px) }
        .d{ width:9px;height:9px;border-radius:99px;background:#10b981;box-shadow:0 0 10px #10b981 }
        @keyframes ynp{ 0%,100%{box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 0 rgba(16,185,129,.5)} 50%{box-shadow:0 10px 30px rgba(0,0,0,.5),0 0 0 7px rgba(16,185,129,0)} }
      </style>
      <div class="btn" id="yn-launch"><span class="d"></span>Ask YN ⌥Y</div>`
    lr.getElementById('yn-launch').onclick = () => { toggle(true); lh.style.display = 'none' }
    // re-show the pill whenever the panel is closed
    window.__ynShowLauncher = () => { lh.style.display = 'block' }
  }
  // hide the pill while the panel is open; bring it back on close
  const _toggle = toggle
  toggle = (force) => {
    _toggle(force)
    const lh = document.getElementById('yn-launch-host')
    if (lh) lh.style.display = open ? 'none' : 'block'
  }

  mountLauncher()
  // auto-open once on a chart page so first-timers see it immediately
  if (/\/chart\//.test(location.pathname)) setTimeout(() => toggle(true), 1200)
})()
