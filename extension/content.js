// ════════════════════════════════════════════════════════════════════════════
// YN Copilot for TradingView — content script (v4: a REAL agent)
// A perceive → reason → act loop. The backend brain (/api/copilot/step) sees
// screenshots, reads the page, and picks ONE tool per step; this script executes
// it with real trusted input (Chrome debugger / CDP), reports the result, and the
// loop continues until the goal is done — finding the Pine triangle and clicking
// it itself, pasting, testing, refining, drawing, looking at the chart. Real.
// ════════════════════════════════════════════════════════════════════════════
(() => {
  if (window.__ynCopilot) return
  window.__ynCopilot = true
  const DEFAULT_API = 'https://ynfinance.org'
  let API = DEFAULT_API, speakOn = false, rec = null, warnedDebugger = false, running = false
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  chrome.storage?.sync.get(['apiBase', 'speak'], (v) => { if (v.apiBase) API = v.apiBase; speakOn = !!v.speak })

  // ── CDP bridge (real trusted input + screenshots) ───────────────────────────
  function cdp(cmd, extra) { return new Promise((res) => { try { chrome.runtime.sendMessage({ type: 'YN_CDP', cmd, ...(extra || {}) }, (r) => res(r || { ok: false, error: 'no-response' })) } catch (e) { res({ ok: false, error: String(e) }) } }) }
  const cdpEval = async (expr) => { const r = await cdp('eval', { expr }); return r.ok ? r.value : null }
  async function warnDebugger() { if (warnedDebugger) return; warnedDebugger = true; say('Taking the wheel — Chrome will show a “debugging this browser” bar. That’s me using real clicks & keystrokes. Leave it up.', 'bot') }

  function detectQuote() { const t = document.title || ''; const m = t.match(/^\s*([A-Za-z0-9!:._-]{1,16})\s+([\d,]+\.?\d*)/); if (m) return { symbol: m[1].replace(/.*:/, '').toUpperCase(), price: parseFloat(m[2].replace(/,/g, '')) }; return { symbol: (t.split(/\s/)[0] || '').toUpperCase(), price: null } }
  function detectTimeframe() { const el = document.querySelector('[id*="interval"] [aria-pressed="true"], [data-name="resolution"] [class*="value"]'); return el ? el.textContent.trim() : '' }

  // Biggest chart canvas (the price pane).
  function chartPane() { const cs = [...document.querySelectorAll('canvas')].map((c) => ({ c, r: c.getBoundingClientRect() })).filter((o) => o.r.width > 300 && o.r.height > 200); cs.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height); return cs[0]?.c || null }
  // Read a compact snapshot of the TV UI state so the brain can act precisely.
  async function uiSnapshot() {
    return await cdpEval(`(function(){try{
      var o={};
      o.pineLoaded=!!(window.monaco&&monaco.editor&&monaco.editor.getModels&&monaco.editor.getModels().length);
      var dlgs=[].slice.call(document.querySelectorAll('[role="dialog"],[class*="dialog"]')).filter(function(d){return d.offsetParent});
      if(dlgs.length){var d=dlgs[dlgs.length-1];o.dialogOpen=true;o.dialogFields=[].slice.call(d.querySelectorAll('input')).filter(function(i){return i.offsetParent&&i.type!=='checkbox'&&i.type!=='radio'}).slice(0,5).map(function(i){return (i.getAttribute('name')||i.getAttribute('aria-label')||i.placeholder||'field')+'='+(i.value||'')})}
      var tabs=[].slice.call(document.querySelectorAll('[data-name],[role="tab"],[class*="tab"]')).map(function(e){return (e.textContent||'').trim()}).filter(function(s){return s&&/pine|screener|strategy tester|trading panel|backtesting/i.test(s)});
      o.bottomTabs=tabs.filter(function(v,i){return tabs.indexOf(v)===i}).slice(0,6);
      return JSON.stringify(o);
    }catch(e){return ''}})()`)
  }

  // ════════════════════ TOOLS (executed for the agent brain) ══════════════════
  async function tLook() { const r = await cdp('shot'); return { shot: r.data || null, summary: r.data ? 'screenshot taken' : 'screenshot failed (debugger bar dismissed?)' } }
  function tChart() { const q = detectQuote(); return { summary: `symbol=${q.symbol} price=${q.price ?? '?'} timeframe=${detectTimeframe() || '?'}` } }
  async function tFind(q) {
    const res = await cdpEval(`(function(){var q=${JSON.stringify((q || '').toLowerCase())};var out=[];for(var e of document.querySelectorAll('button,[role="button"],[role="tab"],a,[data-name],[title],[class*="tab"],[class*="button"]')){var t=((e.textContent||'')+' '+(e.getAttribute&&(e.getAttribute('aria-label')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('title')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('data-name')||'')||'')).trim().toLowerCase();if(!t)continue;var r=e.getBoundingClientRect();if(!r.width||!r.height||r.top>innerHeight||r.bottom<0)continue;if(q&&t.indexOf(q)<0)continue;var lbl=(e.textContent||e.getAttribute('aria-label')||e.getAttribute('title')||e.getAttribute('data-name')||'').trim().replace(/\\s+/g,' ').slice(0,40);if(lbl)out.push(lbl);if(out.length>=14)break}return out})()`)
    return { summary: (res && res.length) ? res.map((s) => '"' + s + '"').join(', ') : 'no matches for "' + q + '"' }
  }
  async function tClick(args) {
    if (typeof args.x === 'number' && typeof args.y === 'number') { const c = await cdp('click', { x: Math.round(args.x), y: Math.round(args.y) }); return { summary: c.ok ? `clicked (${args.x},${args.y})` : 'click failed' } }
    const text = String(args.text || '')
    const hit = await cdpEval(`(function(){var q=${JSON.stringify(text.toLowerCase())};var best=null,bs=1e9;for(var e of document.querySelectorAll('button,[role="button"],[role="tab"],a,[data-name],[title],[class*="tab"],[class*="button"]')){var t=((e.textContent||'')+' '+(e.getAttribute&&(e.getAttribute('aria-label')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('title')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('data-name')||'')||'')).trim().toLowerCase();if(!t)continue;var r=e.getBoundingClientRect();if(!r.width||!r.height||r.top>innerHeight||r.bottom<0)continue;var idx=t.indexOf(q);if(idx<0)continue;var sc=t.length-q.length+idx;if(sc<bs){bs=sc;best={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),label:(e.textContent||'').trim().slice(0,40)}}}return best})()`)
    if (!hit) return { summary: `no element matching "${text}" — try look() then click {x,y}` }
    const c = await cdp('click', { x: hit.x, y: hit.y })
    return { summary: c.ok ? `clicked "${hit.label || text}"` : 'click failed' }
  }
  async function tType(text) { const r = await cdp('type', { text: String(text || '') }); return { summary: r.ok ? `typed "${String(text).slice(0, 30)}"` : 'type failed' } }
  async function tKey(combo) {
    const MOD = { ALT: 1, CTRL: 2, CONTROL: 2, META: 4, CMD: 4, SHIFT: 8 }, VK = { ENTER: 13, ESCAPE: 27, ESC: 27, DELETE: 46, TAB: 9, BACKSPACE: 8 }
    const parts = String(combo || '').split('+').map((s) => s.trim()); const key = parts.pop() || ''; let mods = 0; for (const p of parts) mods |= MOD[p.toUpperCase()] || 0
    const up = key.toUpperCase(); const vk = VK[up] || (key.length === 1 ? up.charCodeAt(0) : 0); const code = key.length === 1 ? 'Key' + up : (up.charAt(0) + up.slice(1).toLowerCase())
    const r = await cdp('key', { key: key.length === 1 ? key.toLowerCase() : key, code, vk, mods }); return { summary: r.ok ? `pressed ${combo}` : 'key failed' }
  }
  // Draw a NATIVE horizontal line at an EXACT price: drop a line at center, then
  // type the price into its settings dialog — no fragile price-axis reading.
  async function tDraw(args) {
    const price = args.price
    if (price == null || isNaN(+price)) return { summary: 'no price given to draw' }
    const cv = chartPane(); if (!cv) return { summary: 'no chart pane found' }
    const r = cv.getBoundingClientRect(), cx = Math.round(r.left + r.width * 0.5), cy = Math.round(r.top + r.height * 0.5)
    await cdp('key', { key: 'h', code: 'KeyH', vk: 72, mods: 1 }); await sleep(260)   // arm horizontal-line tool
    await cdp('click', { x: cx, y: cy }); await sleep(460)                              // drop a line at center
    // open its settings: try the floating "Settings" gear, else double-click the line
    const gear = await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('[data-name="settings"],[aria-label*="ettings"],button')).filter(function(e){var s=((e.getAttribute&&e.getAttribute('data-name'))||'')+' '+((e.getAttribute&&e.getAttribute('aria-label'))||'');return /settings/i.test(s)}).filter(function(e){var q=e.getBoundingClientRect();return q.width&&q.height&&q.top<innerHeight})[0];if(b){var q=b.getBoundingClientRect();return JSON.stringify({x:Math.round(q.left+q.width/2),y:Math.round(q.top+q.height/2)})}return ''})()`)
    if (gear) { try { const p = JSON.parse(gear); await cdp('click', p) } catch {} } else { await cdp('click', { x: cx, y: cy, clickCount: 2 }) }
    await sleep(640)
    // type the exact price into the dialog's price field (React-safe value set)
    const set = await cdpEval(`(function(p){try{
      var dlgs=[].slice.call(document.querySelectorAll('[role="dialog"],[class*="dialog"],[data-name*="dialog"]')).filter(function(d){return d.offsetParent});
      var dlg=dlgs[dlgs.length-1]; if(!dlg) return 'nodialog';
      var ins=[].slice.call(dlg.querySelectorAll('input')).filter(function(i){return i.offsetParent&&i.type!=='checkbox'&&i.type!=='radio'});
      var f=ins.filter(function(i){return /^[\\d.,\\s-]+$/.test((i.value||'').trim())})[0]||ins[0];
      if(!f) return 'nofield';
      var d=Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype,'value');
      f.focus(); if(d&&d.set){d.set.call(f,String(p))} else {f.value=String(p)}
      f.dispatchEvent(new Event('input',{bubbles:true})); f.dispatchEvent(new Event('change',{bubbles:true}));
      return 'set';
    }catch(e){return 'err:'+(e&&e.message||e)}})(${JSON.stringify(+price)})`)
    await sleep(220)
    await cdp('key', { key: 'Enter', code: 'Enter', vk: 13, mods: 0 }); await sleep(200)
    await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(e){return e.offsetParent&&/^(ok|apply|save)$/i.test((e.textContent||'').trim())})[0];if(b){b.click();return 1}return 0})()`)
    await sleep(150); await cdp('key', { key: 'Escape', code: 'Escape', vk: 27, mods: 0 })
    if (set === 'set') return { summary: `drew a line and set it to ${price}${args.label ? ' (' + args.label + ')' : ''}` }
    return { summary: `placed a line at center but couldn't open its price field (${set}); it's on the chart — may not be at ${price} exactly` }
  }
  // Open the Pine editor (forcing the panel open), wait for Monaco, paste, add to chart.
  async function tPine(code) {
    const tab = await cdpEval(`(function(){var els=[].slice.call(document.querySelectorAll('button,[role="tab"],[data-name],[class*="tab"]'));var c=els.filter(function(e){var s=((e.textContent||'')+' '+((e.getAttribute&&e.getAttribute('data-name'))||'')+' '+((e.getAttribute&&e.getAttribute('aria-label'))||'')).toLowerCase();return /pine\\s*editor|pine_editor|\\bpine\\b/.test(s)}).filter(function(e){var r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight+40});if(c.length){var r=c[0].getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (tab) { try { const p = JSON.parse(tab); await cdp('click', p); await sleep(1300) } catch {} }
    let ready = false
    for (let i = 0; i < 14; i++) { const n = await cdpEval(`(window.monaco&&monaco.editor&&monaco.editor.getModels?monaco.editor.getModels().length:0)`); if (n) { ready = true; break } await sleep(450) }
    if (!ready) return { summary: 'could not open the Pine editor — open the bottom panel’s “Pine Editor” tab once, then ask again' }
    const set = await cdpEval(`(function(c){try{var ms=monaco.editor.getModels();if(!ms.length)return 'no';ms[ms.length-1].setValue(c);return 'ok'}catch(e){return 'err:'+(e&&e.message||e)}})(${JSON.stringify(code)})`)
    if (set !== 'ok') { try { await navigator.clipboard.writeText(code) } catch {} ; return { summary: 'opened Pine editor but couldn’t inject the code (copied to clipboard — paste with Ctrl+V, then Add to chart)' } }
    await sleep(500)
    const add = await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('[data-name="add-script-to-chart"],button,[role="button"]')).filter(function(e){var s=((e.textContent||'')+' '+((e.getAttribute&&e.getAttribute('data-name'))||'')).toLowerCase();return /add to chart|update on chart|add-script-to-chart|apply to chart/.test(s)}).filter(function(e){var r=e.getBoundingClientRect();return r.width&&r.height})[0];if(b){var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (add) { try { const p = JSON.parse(add); await cdp('click', p); await sleep(1500) } catch {} ; return { summary: 'pasted the code into Pine editor and clicked Add/Update on chart' } }
    return { summary: 'pasted the code into Pine editor (no “Add to chart” button found — press it manually)' }
  }
  async function tPineErrors() { const e = await cdpEval(`(function(){var sel=['[class*="errorsContainer"]','[class*="pineConsole"]','[class*="console"] [class*="error"]','[class*="errorTooltip"]'];for(var s of sel){var el=document.querySelector(s);if(el&&/error|line\\s*\\d/i.test(el.textContent||''))return el.textContent.trim().slice(0,260)}return ''})()`); return { summary: e ? ('compiler error → ' + e) : 'compiled clean / no errors' } }

  // ════════════════════ THE AGENT LOOP ════════════════════════════════════════
  // A fresh screenshot is captured and sent on EVERY step, so the brain always
  // sees the chart — no wasted "look" round-trips. One status line, not a wall of
  // narration; only the final answer becomes a real message.
  async function runAgent(goal) {
    if (running) { setStatus('still on the last task…'); return }
    running = true
    await warnDebugger()
    const st = startStatus('Looking at the chart…')
    const log = []; let steps = 0; const MAX = 12
    try {
      while (steps < MAX) {
        let shot = null
        try { const s = await cdp('shot'); shot = s.ok ? (s.data || null) : null } catch {}
        let ui = ''; try { ui = (await uiSnapshot()) || '' } catch {}
        const q = detectQuote()
        let r
        try {
          const res = await fetch(API.replace(/\/$/, '') + '/api/copilot/step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, symbol: q.symbol, price: q.price, timeframe: detectTimeframe(), ui, log, shot, steps }) })
          r = await res.json()
        } catch { endStatus(st); say('Lost the brain connection — check the API URL (⚙).', 'bot'); break }
        if (r.done) { endStatus(st); const m = r.say || (r.thought || 'Done.'); say(m, 'bot'); speakOn && speak(m); break }
        if (r.thought) setStatus(r.thought)
        const tool = r.tool, args = r.args || {}
        let out = { summary: 'unknown tool: ' + tool }
        try {
          if (tool === 'find') out = await tFind(args.q)
          else if (tool === 'click') out = await tClick(args)
          else if (tool === 'type') out = await tType(args.text)
          else if (tool === 'key') out = await tKey(args.combo)
          else if (tool === 'drawLevel') out = await tDraw(args)
          else if (tool === 'pine') out = await tPine(args.code)
          else if (tool === 'pineErrors') out = await tPineErrors()
          else if (tool === 'say') { if (args.text) setStatus(args.text); out = { summary: 'noted' } }
          else if (tool === 'look' || tool === 'chart') out = { summary: 'you already see a fresh screenshot every step' }
        } catch (e) { out = { summary: 'tool error: ' + String(e?.message || e).slice(0, 90) } }
        log.push({ tool, args, result: out.summary })
        steps++
        await sleep(70)
      }
      if (steps >= MAX) { endStatus(st); say('That took too many steps — try a more specific ask.', 'bot') }
    } finally { running = false; endStatus(st) }
  }

  function speak(t) { try { const u = new SpeechSynthesisUtterance(t.slice(0, 240)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {} }
  function listen() { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return say('Voice input isn’t supported here.', 'bot'); if (rec) { rec.stop(); return } rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; setMic(true); rec.onresult = (e) => { input.value = e.results[0][0].transcript; send() }; rec.onend = () => { rec = null; setMic(false) }; rec.onerror = () => { rec = null; setMic(false) }; rec.start() }
  function saveRoutine() { const name = prompt('Name this routine'); if (!name) return; const sym = detectQuote().symbol; chrome.storage?.sync.get(['routines'], (v) => { const all = v.routines || {}; (all[sym] = all[sym] || []).push({ name, msg: window.__ynLastGoal || 'mark the key levels' }); chrome.storage?.sync.set({ routines: all }); say(`Saved “${name}” for ${sym}. Type “run ${name}”.`, 'bot') }) }
  function runRoutine(name) { chrome.storage?.sync.get(['routines'], (v) => { const list = (v.routines || {})[detectQuote().symbol] || [], hit = list.find((r) => r.name.toLowerCase() === name.toLowerCase()) || list[0]; hit ? runAgent(hit.msg) : say('No routine by that name here.', 'bot') }) }

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
        .ver{ font-size:9px; font-weight:800; letter-spacing:.06em; color:#86f0c0; background:rgba(16,185,129,.14); border:1px solid rgba(16,185,129,.3); border-radius:5px; padding:2px 5px }
        .gear,.x{ background:none;border:none;color:#7e8db5;cursor:pointer;font-size:14px;padding:2px 4px }
        .log{ flex:1; overflow:auto; padding:12px; display:flex; flex-direction:column; gap:8px; font-family:Inter,system-ui,sans-serif }
        .msg{ font-size:13px; line-height:1.5; padding:8px 11px; border-radius:12px; max-width:92% } .bot{ background:rgba(31,59,255,.13); border:1px solid rgba(31,59,255,.22); align-self:flex-start } .me{ background:#1f3bff; color:#fff; align-self:flex-end }
        .status{ display:flex; align-items:center; gap:9px; color:#9db0ff; font-style:italic }
        .spin{ width:13px; height:13px; border-radius:99px; border:2px solid rgba(157,176,255,.25); border-top-color:#9db0ff; animation:ynspin .7s linear infinite; flex:none }
        @keyframes ynspin{ to{ transform:rotate(360deg) } }
        .row{ display:flex; gap:6px; padding:8px 10px; flex-wrap:wrap; border-top:1px solid rgba(255,255,255,.06) }
        .chip{ font-size:11px; color:#cdd6ff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); border-radius:99px; padding:5px 10px; cursor:pointer } .chip:hover{ border-color:rgba(31,59,255,.5) }
        .speak{ font-size:11px;color:#7e8db5;cursor:pointer } .speak.on{ color:#10b981 }
        .in{ display:flex; gap:8px; padding:10px; border-top:1px solid rgba(255,255,255,.08) }
        input{ flex:1; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:10px; padding:9px 11px; font-size:13px; outline:none }
        .mic,.send{ border:none; border-radius:10px; width:38px; cursor:pointer; font-size:15px } .mic{ background:rgba(255,255,255,.06); color:#cdd6ff } .mic.on{ background:#ef4444; color:#fff } .send{ background:linear-gradient(135deg,#1f3bff,#10b981); color:#fff }
        .settings{ position:absolute; inset:0; background:#070912; padding:16px; display:none; flex-direction:column; gap:12px; z-index:5 } .settings.show{ display:flex } .settings label{ font-size:12px;color:#9aa3c8 }
      </style>
      <div class="panel" id="yn-panel">
        <div class="hdr" id="yn-hdr"><span class="dot"></span><span class="title">YN Copilot</span><span class="ver">AGENT v4.2</span><span class="sym" id="yn-sym"></span><button class="gear" id="yn-gear">⚙</button><button class="x" id="yn-x">✕</button></div>
        <div class="log" id="yn-log"></div>
        <div class="row"><span class="chip" data-act="analyze">Analyze</span><span class="chip" data-act="levels">Mark levels</span><span class="chip" data-act="indicator">Build indicator</span><span class="chip" data-act="routine">＋ Routine</span><span class="speak" id="yn-speak">🔊 speak</span></div>
        <div class="in"><input id="yn-input" placeholder="Tell the agent what to do…" /><button class="mic" id="yn-mic">🎤</button><button class="send" id="yn-send">➤</button></div>
        <div class="settings" id="yn-settings"><label>YN API base URL</label><input id="yn-api" /><button class="send" id="yn-save" style="width:auto;padding:8px 14px">Save</button><div style="font-size:11px;color:#7e8db5;line-height:1.5">This is a real agent — it perceives the page (screenshots), reasons, and acts step by step via Chrome’s debugger API. A banner shows while it works.</div></div>
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
    say(`I’m a real agent on ${q.symbol || 'this chart'}${q.price ? ' @ ' + q.price : ''}. Tell me what to do — draw levels, build & test an indicator, read the structure — and I’ll look, click, type and refine it myself, step by step.`, 'bot')
  }
  let boxT; function persistBox(panel) { clearTimeout(boxT); boxT = setTimeout(() => { const r = panel.getBoundingClientRect(); chrome.storage?.sync.set({ panelBox: { left: r.left, top: r.top, w: r.width, h: r.height } }) }, 300) }
  function quick(act) { if (act === 'routine') return saveRoutine(); const m = { analyze: 'Look at the chart and give me the trend, key levels, and what to watch.', levels: 'Mark the prior-day high/low and key levels on the chart as native lines.', indicator: 'Write a Pine indicator for the prior-day high/low and the 200 EMA, open the Pine editor, add it to the chart, and make sure it compiles.' }[act]; if (m) { input.value = m; send() } }
  function send() { const t = input.value.trim(); if (!t) return; say(t, 'me'); input.value = ''; window.__ynLastGoal = t; if (/^run\s+/i.test(t)) return runRoutine(t.replace(/^run\s+/i, '').trim()); runAgent(t) }
  function setMic(on) { const m = root && root.getElementById('yn-mic'); if (m) m.classList.toggle('on', on) }
  function say(text, who) { if (!root) return; const d = document.createElement('div'); d.className = 'msg ' + (who === 'me' ? 'me' : 'bot'); d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight }
  // One live loader bubble (spinner + updating text), removed when the answer lands.
  let statusEl = null
  function startStatus(text) { if (!root) return null; endStatus(statusEl); const d = document.createElement('div'); d.className = 'msg bot status'; d.innerHTML = '<span class="spin"></span><span class="stxt"></span>'; d.querySelector('.stxt').textContent = text || 'Working…'; log.appendChild(d); log.scrollTop = log.scrollHeight; statusEl = d; return d }
  function setStatus(text) { const d = statusEl; if (!d) return; const s = d.querySelector('.stxt'); if (s) s.textContent = text; log.scrollTop = log.scrollHeight }
  function endStatus(d) { const t = d || statusEl; if (t && t.parentNode) t.parentNode.removeChild(t); if (t === statusEl || !d) statusEl = null }

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
