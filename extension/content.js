// ════════════════════════════════════════════════════════════════════════════
// YN Copilot for TradingView — content script (v3, real automation)
// Drives TradingView with REAL trusted input via the background CDP bridge:
//   • draws native horizontal lines (Alt+H + real click at the right pixel)
//   • opens the Pine editor, pastes code, clicks "Add to chart", reads compiler
//     errors and refines until it compiles
//   • reads the REAL instrument price off the chart (no wrong proxies)
// Falls back to an overlay only if the debugger bridge is unavailable.
// ════════════════════════════════════════════════════════════════════════════
(() => {
  if (window.__ynCopilot) return
  window.__ynCopilot = true
  const DEFAULT_API = 'https://ynfinance.org'
  let API = DEFAULT_API, speakOn = false, rec = null, warnedDebugger = false
  const history = []
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  chrome.storage?.sync.get(['apiBase', 'speak'], (v) => { if (v.apiBase) API = v.apiBase; speakOn = !!v.speak })

  // ── CDP bridge to background (real trusted input) ───────────────────────────
  function cdp(cmd, extra) {
    return new Promise((res) => { try { chrome.runtime.sendMessage({ type: 'YN_CDP', cmd, ...(extra || {}) }, (r) => res(r || { ok: false, error: 'no-response' })) } catch (e) { res({ ok: false, error: String(e) }) } })
  }
  const cdpEval = async (expr) => { const r = await cdp('eval', { expr }); return r.ok ? r.value : null }
  async function warnDebugger() { if (warnedDebugger) return; warnedDebugger = true; say('Taking the wheel — Chrome will show a “debugging this browser” bar at the top. That’s me using real clicks so TradingView actually responds. Leave it up.', 'bot') }

  // ── chart context (REAL price from the title, e.g. "NQ1! 20,123.50 …") ───────
  function detectQuote() {
    const t = document.title || ''
    const m = t.match(/^\s*([A-Za-z0-9!:._-]{1,16})\s+([\d,]+\.?\d*)/)
    if (m) return { symbol: m[1].replace(/.*:/, '').toUpperCase(), price: parseFloat(m[2].replace(/,/g, '')) }
    return { symbol: (t.split(/\s/)[0] || '').toUpperCase(), price: null }
  }
  function detectTimeframe() { const el = document.querySelector('[id*="interval"] [aria-pressed="true"], [data-name="resolution"] [class*="value"]'); return el ? el.textContent.trim() : '' }

  // ── price↔pixel map via real crosshair moves (no calibration) ────────────────
  function chartPane() {
    const cs = [...document.querySelectorAll('canvas')].map((c) => ({ c, r: c.getBoundingClientRect() })).filter((o) => o.r.width > 300 && o.r.height > 200)
    cs.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height); return cs[0]?.c || null
  }
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
    const r = cv.getBoundingClientRect(), x = Math.round(r.left + r.width * 0.5), pts = []
    await warnDebugger()
    for (const f of [0.3, 0.7]) {
      const y = Math.round(r.top + r.height * f)
      const mv = await cdp('move', { x, y }); if (!mv.ok) return false
      await sleep(90); const p = axisPriceAt(y, r); if (p != null) pts.push({ y, p })
    }
    if (pts.length === 2 && pts[0].p !== pts[1].p) { pmap = { p1: pts[0].p, y1: pts[0].y, p2: pts[1].p, y2: pts[1].y }; pmapAt = Date.now(); return true }
    return false
  }
  async function ensureMap() { if (!pmap || Date.now() - pmapAt > 12000) await buildMap(); return !!pmap }
  const priceToY = (p) => pmap ? pmap.y1 + (p - pmap.p1) * (pmap.y2 - pmap.y1) / (pmap.p2 - pmap.p1) : null

  // ── NATIVE horizontal line: arm tool (Alt+H) + real click at the price pixel ─
  async function drawNative(price) {
    if (!(await ensureMap())) return false
    const y = priceToY(price), cv = chartPane(); if (y == null || !cv) return false
    const r = cv.getBoundingClientRect(), x = Math.round(r.left + r.width * 0.55)
    const k = await cdp('key', { key: 'h', code: 'KeyH', vk: 72, mods: 1 }); if (!k.ok) return false
    await sleep(170)
    const c = await cdp('click', { x, y: Math.round(y) }); if (!c.ok) return false
    await sleep(140)
    return true
  }

  // ── overlay fallback (only if the CDP bridge is unavailable) ─────────────────
  let canvas, ctx, overlay = []
  function ensureCanvas() { if (canvas && document.body.contains(canvas)) return; canvas = document.createElement('canvas'); Object.assign(canvas.style, { position: 'fixed', inset: '0', zIndex: 2147482000, pointerEvents: 'none' }); document.body.appendChild(canvas); ctx = canvas.getContext('2d'); const rz = () => { canvas.width = innerWidth; canvas.height = innerHeight; drawOverlay() }; rz(); addEventListener('resize', rz); addEventListener('scroll', drawOverlay, true) }
  function drawOverlay() { if (!ctx) return; ctx.clearRect(0, 0, canvas.width, canvas.height); for (const d of overlay) { const y = priceToY(d.price); if (y == null) continue; ctx.strokeStyle = d.color || '#10b981'; ctx.lineWidth = 1.5; ctx.setLineDash([7, 4]); ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); ctx.setLineDash([]); ctx.font = '700 11px ui-monospace'; const l = `${d.label || ''} ${d.price}`.trim(), w = ctx.measureText(l).width + 14; ctx.fillStyle = d.color || '#10b981'; ctx.fillRect(10, y - 9, w, 17); ctx.fillStyle = '#04140c'; ctx.fillText(l, 17, y + 3) } }
  function clearDrawings() { overlay = []; drawOverlay(); say('Cleared my overlay levels. (Native TradingView lines: delete them on the chart.)', 'bot') }

  // ── Pine: open editor → paste → add to chart → read errors → refine ─────────
  async function doPine(code, name, depth = 0) {
    await warnDebugger()
    say(`Opening the Pine editor and loading “${name || 'indicator'}”…`, 'bot')
    const tab = await cdpEval(`(function(){var b=[...document.querySelectorAll('button,[data-name],[role="tab"],[class*="tab"]')].find(function(e){var s=(e.textContent||'')+' '+(e.getAttribute&&e.getAttribute('data-name')||'');return /pine/i.test(s)});if(b){var r=b.getBoundingClientRect();return r.width?{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}:null}return null})()`)
    if (tab) { await cdp('click', tab); await sleep(900) }
    const set = await cdpEval(`(function(){try{var m=window.monaco&&monaco.editor&&monaco.editor.getModels&&monaco.editor.getModels();if(m&&m.length){m[m.length-1].setValue(${JSON.stringify(code)});return 'ok'}}catch(e){}return 'no'})()`)
    if (set !== 'ok') { try { await navigator.clipboard.writeText(code) } catch {}; say('Couldn’t reach the editor’s text model — I copied the code to your clipboard. Click into the Pine editor and paste (Ctrl/Cmd+V).', 'bot'); return }
    await sleep(450)
    const addBtn = await cdpEval(`(function(){var b=[...document.querySelectorAll('button,[role="button"]')].find(function(e){return /add to chart|update on chart|create new/i.test(e.textContent||'')});if(b){var r=b.getBoundingClientRect();return r.width?{x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}:null}return null})()`)
    if (addBtn) { await cdp('click', addBtn); say('Pasted it and clicked “Add to chart”.', 'bot') }
    else say('Pasted the code — hit “Add to chart” in the Pine editor.', 'bot')
    // refine on compiler error
    await sleep(1500)
    const err = await cdpEval(`(function(){var sel=['[class*="errorsContainer"]','[class*="pineConsole"]','[class*="console"] [class*="error"]','[class*="errorTooltip"]'];for(var s of sel){var e=document.querySelector(s);if(e&&/error|line\\s*\\d/i.test(e.textContent||''))return e.textContent.trim().slice(0,260)}return ''})()`)
    if (err && depth < 2) {
      say('Compiler flagged it — fixing: ' + err, 'bot')
      try {
        const r = await fetch(API.replace(/\/$/, '') + '/api/copilot/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: detectQuote().symbol, message: 'Fix this Pine script compiler error and return ONLY corrected pine in the pine field.', pineError: err, pineCode: code }) })
        const plan = await r.json()
        if (plan?.pine?.code && plan.pine.code !== code) return doPine(plan.pine.code, name, depth + 1)
      } catch {}
      say('Couldn’t auto-fix that one — paste says it all; tweak and re-add.', 'bot')
    } else if (!err) say('Compiled clean ✓', 'bot')
  }

  // ── execute an agent plan ────────────────────────────────────────────────────
  async function executePlan(plan) {
    if (!plan) return
    if (plan.say) { say(plan.say, 'bot'); speakOn && speak(plan.say) }
    const levels = (plan.draw || []).filter((d) => d && typeof d.price === 'number')
    if (levels.length) {
      let fell = false
      for (const d of levels) {
        const ok = await drawNative(d.price)
        if (!ok) { fell = true; ensureCanvas(); overlay.push({ price: d.price, label: d.label, color: d.color }) }
      }
      if (fell) { await ensureMap(); drawOverlay(); say('(Native draw didn’t go through — allow the debugger bar and try again. I marked them on my overlay for now.)', 'bot') }
    }
    if (plan.pine && plan.pine.code) await doPine(plan.pine.code, plan.pine.name)
    if (plan.routine) say(`Routine idea: “${plan.routine}”. Hit “＋ Routine” to keep it.`, 'bot')
  }

  async function callAgent(message) {
    say('…thinking', 'bot', true)
    const q = detectQuote()
    try {
      const r = await fetch(API.replace(/\/$/, '') + '/api/copilot/agent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ symbol: q.symbol, chartPrice: q.price, timeframe: detectTimeframe(), message, history: history.slice(-8) }) })
      const plan = await r.json(); removeThinking()
      history.push({ role: 'user', text: message }, { role: 'bot', text: plan.say || '' })
      executePlan(plan)
    } catch { removeThinking(); say('Couldn’t reach the YN brain — check the API URL (⚙).', 'bot') }
  }

  function speak(t) { try { const u = new SpeechSynthesisUtterance(t.slice(0, 240)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {} }
  function listen() { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return say('Voice input isn’t supported here.', 'bot'); if (rec) { rec.stop(); return } rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; setMic(true); rec.onresult = (e) => { input.value = e.results[0][0].transcript; send() }; rec.onend = () => { rec = null; setMic(false) }; rec.onerror = () => { rec = null; setMic(false) }; rec.start() }
  function saveRoutine() { const name = prompt('Name this routine'); if (!name) return; const sym = detectQuote().symbol, msg = history.filter((h) => h.role === 'user').slice(-1)[0]?.text || 'mark the key levels'; chrome.storage?.sync.get(['routines'], (v) => { const all = v.routines || {}; (all[sym] = all[sym] || []).push({ name, msg }); chrome.storage?.sync.set({ routines: all }); say(`Saved “${name}” for ${sym}. Type “run ${name}” anytime.`, 'bot') }) }
  function runRoutine(name) { chrome.storage?.sync.get(['routines'], (v) => { const list = (v.routines || {})[detectQuote().symbol] || [], hit = list.find((r) => r.name.toLowerCase() === name.toLowerCase()) || list[0]; hit ? callAgent(hit.msg) : say('No routine by that name here.', 'bot') }) }

  // ── UI (draggable + resizable) ──────────────────────────────────────────────
  let root, log, input, host
  function build() {
    host = document.createElement('div'); host.id = 'yn-copilot-host'; document.documentElement.appendChild(host)
    root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host{ all:initial }
        .panel{ position:fixed; width:344px; height:524px; min-width:280px; min-height:360px; max-width:92vw; max-height:92vh; resize:both; overflow:hidden;
          background:linear-gradient(180deg,#0b0f1e,#070912); color:#dfe6ff; border:1px solid rgba(31,59,255,.4); border-radius:16px; box-shadow:0 24px 70px rgba(0,0,0,.55); display:flex; flex-direction:column; font-family:ui-monospace,Menlo,monospace; z-index:2147483600 }
        .hdr{ display:flex; align-items:center; gap:8px; padding:11px 13px; border-bottom:1px solid rgba(255,255,255,.08); cursor:move; user-select:none }
        .dot{ width:8px;height:8px;border-radius:99px;background:#10b981;box-shadow:0 0 8px #10b981 } .title{ font-weight:800; font-size:13px } .sym{ margin-left:auto; font-size:11px; color:#7e8db5 }
        .gear,.x{ background:none;border:none;color:#7e8db5;cursor:pointer;font-size:14px;padding:2px 4px }
        .log{ flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:9px; font-family:Inter,system-ui,sans-serif }
        .msg{ font-size:13px; line-height:1.5; padding:9px 11px; border-radius:12px; max-width:90% } .bot{ background:rgba(31,59,255,.13); border:1px solid rgba(31,59,255,.22); align-self:flex-start } .me{ background:#1f3bff; color:#fff; align-self:flex-end }
        .row{ display:flex; gap:6px; padding:8px 10px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,.06) }
        .chip{ font-size:11px; color:#cdd6ff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:99px; padding:5px 10px; cursor:pointer } .chip:hover{ border-color:rgba(31,59,255,.5) }
        .speak{ font-size:11px;color:#7e8db5;cursor:pointer } .speak.on{ color:#10b981 }
        .in{ display:flex; gap:8px; padding:10px; border-top:1px solid rgba(255,255,255,.08) }
        input{ flex:1; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:10px; padding:9px 11px; font-size:13px; outline:none }
        .mic,.send{ border:none; border-radius:10px; width:38px; cursor:pointer; font-size:15px } .mic{ background:rgba(255,255,255,.06); color:#cdd6ff } .mic.on{ background:#ef4444; color:#fff } .send{ background:linear-gradient(135deg,#1f3bff,#10b981); color:#fff }
        .settings{ position:absolute; inset:0; background:#070912; padding:16px; display:none; flex-direction:column; gap:12px; z-index:5 } .settings.show{ display:flex } .settings label{ font-size:12px;color:#9aa3c8 }
      </style>
      <div class="panel" id="yn-panel">
        <div class="hdr" id="yn-hdr"><span class="dot"></span><span class="title">YN Copilot</span><span class="sym" id="yn-sym"></span><button class="gear" id="yn-gear">⚙</button><button class="x" id="yn-x">✕</button></div>
        <div class="log" id="yn-log"></div>
        <div class="row"><span class="chip" data-act="analyze">Analyze</span><span class="chip" data-act="levels">Mark levels</span><span class="chip" data-act="indicator">Write indicator</span><span class="chip" data-act="clear">Clear</span><span class="chip" data-act="routine">＋ Routine</span><span class="speak" id="yn-speak">🔊 speak</span></div>
        <div class="in"><input id="yn-input" placeholder="Talk or type… e.g. draw support at 20100" /><button class="mic" id="yn-mic">🎤</button><button class="send" id="yn-send">➤</button></div>
        <div class="settings" id="yn-settings"><label>YN API base URL</label><input id="yn-api" /><button class="send" id="yn-save" style="width:auto;padding:8px 14px">Save</button><div style="font-size:11px;color:#7e8db5;line-height:1.5">Real automation uses Chrome’s debugger API (a banner shows while active). That’s how it genuinely clicks & types in TradingView.</div></div>
      </div>`
    log = root.getElementById('yn-log'); input = root.getElementById('yn-input')
    const panel = root.getElementById('yn-panel')
    root.getElementById('yn-sym').textContent = detectQuote().symbol || '—'
    root.getElementById('yn-x').onclick = () => toggle(false)
    root.getElementById('yn-send').onclick = send; root.getElementById('yn-mic').onclick = listen
    input.onkeydown = (e) => { if (e.key === 'Enter') send() }
    root.getElementById('yn-speak').classList.toggle('on', speakOn)
    root.getElementById('yn-speak').onclick = (e) => { speakOn = !speakOn; chrome.storage?.sync.set({ speak: speakOn }); e.target.classList.toggle('on', speakOn) }
    root.querySelectorAll('.chip').forEach((c) => c.onclick = () => quick(c.dataset.act))
    const gear = root.getElementById('yn-gear'), settings = root.getElementById('yn-settings'), apiIn = root.getElementById('yn-api')
    gear.onclick = () => { apiIn.value = API; settings.classList.toggle('show') }
    root.getElementById('yn-save').onclick = () => { API = apiIn.value.trim() || DEFAULT_API; chrome.storage?.sync.set({ apiBase: API }); settings.classList.remove('show'); say('Saved.', 'bot') }
    chrome.storage?.sync.get(['panelBox'], (v) => { const b = v.panelBox; if (b) { panel.style.left = b.left + 'px'; panel.style.top = b.top + 'px'; if (b.w) panel.style.width = b.w + 'px'; if (b.h) panel.style.height = b.h + 'px' } else { panel.style.left = Math.max(8, innerWidth - 360) + 'px'; panel.style.top = Math.max(8, innerHeight - 544) + 'px' } })
    const hdr = root.getElementById('yn-hdr'); let drag = null
    hdr.addEventListener('mousedown', (e) => { const r = panel.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault() })
    addEventListener('mousemove', (e) => { if (!drag) return; panel.style.left = Math.min(innerWidth - 60, Math.max(0, e.clientX - drag.dx)) + 'px'; panel.style.top = Math.min(innerHeight - 40, Math.max(0, e.clientY - drag.dy)) + 'px' })
    addEventListener('mouseup', () => { if (!drag) return; drag = null; persistBox(panel) })
    new ResizeObserver(() => persistBox(panel)).observe(panel)
    const q = detectQuote()
    say(`Copilot’s on ${q.symbol || 'this chart'}${q.price ? ' @ ' + q.price : ''}. I draw native lines, write & test indicators for real. Ask away — drag me by the header, resize from the corner.`, 'bot')
  }
  let boxT; function persistBox(panel) { clearTimeout(boxT); boxT = setTimeout(() => { const r = panel.getBoundingClientRect(); chrome.storage?.sync.set({ panelBox: { left: r.left, top: r.top, w: r.width, h: r.height } }) }, 300) }
  function quick(act) { if (act === 'clear') return clearDrawings(); if (act === 'routine') return saveRoutine(); const m = { analyze: 'Analyze this chart — trend, key levels, what to watch.', levels: 'Mark the prior-day high/low and the key levels on the chart.', indicator: 'Write and add a Pine indicator for the prior-day high/low and the 200 EMA.' }[act]; if (m) { input.value = m; send() } }
  function send() { const t = input.value.trim(); if (!t) return; say(t, 'me'); input.value = ''; if (/^run\s+/i.test(t)) return runRoutine(t.replace(/^run\s+/i, '').trim()); callAgent(t) }
  function setMic(on) { const m = root && root.getElementById('yn-mic'); if (m) m.classList.toggle('on', on) }
  let thinking; function say(text, who, isT) { if (!root) return; const d = document.createElement('div'); d.className = 'msg ' + (who === 'me' ? 'me' : 'bot'); d.textContent = text; if (isT) thinking = d; log.appendChild(d); log.scrollTop = log.scrollHeight }
  function removeThinking() { if (thinking) { thinking.remove(); thinking = null } }

  let open = false
  function toggle(force) { open = force == null ? !open : force; if (open && !host) build(); if (host) host.style.display = open ? 'block' : 'none'; const lh = document.getElementById('yn-launch-host'); if (lh) lh.style.display = open ? 'none' : 'block' }
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
