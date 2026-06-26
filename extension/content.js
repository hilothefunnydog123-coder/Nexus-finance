// ════════════════════════════════════════════════════════════════════════════
// YN Copilot for TradingView — content script (v5: the insane edition)
// A real perceive → reason → act agent with a premium glass cockpit:
//  · a LIVE VISION STRIP of the screenshots it's actually looking at
//  · an EXECUTION PLAN that ticks itself off as the agent works
//  · markdown-rendered analysis, a live price ticker, a stop button
//  · real trusted input via Chrome's debugger (CDP): clicks, keystrokes, vision
//  · an expanded toolset: draw exact levels (batch), change timeframe/symbol,
//    add indicators, clear drawings, write+test+refine Pine — it does it itself.
// ════════════════════════════════════════════════════════════════════════════
(() => {
  if (window.__ynCopilot) return
  window.__ynCopilot = true
  const DEFAULT_API = 'https://ynfinance.org'
  let API = DEFAULT_API, speakOn = false, rec = null, warnedDebugger = false, running = false, abort = false
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  chrome.storage?.sync.get(['apiBase', 'speak'], (v) => { if (v.apiBase) API = v.apiBase; speakOn = !!v.speak })

  // ── CDP bridge (real trusted input + screenshots) ───────────────────────────
  function cdp(cmd, extra) { return new Promise((res) => { try { chrome.runtime.sendMessage({ type: 'YN_CDP', cmd, ...(extra || {}) }, (r) => res(r || { ok: false, error: 'no-response' })) } catch (e) { res({ ok: false, error: String(e) }) } }) }
  const cdpEval = async (expr) => { const r = await cdp('eval', { expr }); return r.ok ? r.value : null }
  async function warnDebugger() { if (warnedDebugger) return; warnedDebugger = true; say('Taking the wheel — Chrome will show a “debugging this browser” bar. That’s me using real clicks, keystrokes & vision. Leave it up.', 'bot') }

  function detectQuote() { const t = document.title || ''; const m = t.match(/^\s*([A-Za-z0-9!:._-]{1,16})\s+([\d,]+\.?\d*)/); if (m) return { symbol: m[1].replace(/.*:/, '').toUpperCase(), price: parseFloat(m[2].replace(/,/g, '')) }; return { symbol: (t.split(/\s/)[0] || '').toUpperCase(), price: null } }
  function detectTimeframe() { const el = document.querySelector('[id*="interval"] [aria-pressed="true"], [data-name="resolution"] [class*="value"]'); return el ? el.textContent.trim() : '' }

  // Biggest chart canvas (the price pane).
  function chartPane() { const cs = [...document.querySelectorAll('canvas')].map((c) => ({ c, r: c.getBoundingClientRect() })).filter((o) => o.r.width > 300 && o.r.height > 200); cs.sort((a, b) => b.r.width * b.r.height - a.r.width * a.r.height); return cs[0]?.c || null }
  // Compact snapshot of the TV UI state so the brain can act precisely.
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
  async function tFind(q) {
    const res = await cdpEval(`(function(){var q=${JSON.stringify((q || '').toLowerCase())};var out=[];for(var e of document.querySelectorAll('button,[role="button"],[role="tab"],a,[data-name],[title],[class*="tab"],[class*="button"]')){var t=((e.textContent||'')+' '+(e.getAttribute&&(e.getAttribute('aria-label')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('title')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('data-name')||'')||'')).trim().toLowerCase();if(!t)continue;var r=e.getBoundingClientRect();if(!r.width||!r.height||r.top>innerHeight||r.bottom<0)continue;if(q&&t.indexOf(q)<0)continue;var lbl=(e.textContent||e.getAttribute('aria-label')||e.getAttribute('title')||e.getAttribute('data-name')||'').trim().replace(/\\s+/g,' ').slice(0,40);if(lbl)out.push(lbl);if(out.length>=14)break}return out})()`)
    return { summary: (res && res.length) ? res.map((s) => '"' + s + '"').join(', ') : 'no matches for "' + q + '"' }
  }
  async function tClick(args) {
    if (typeof args.x === 'number' && typeof args.y === 'number') { const c = await cdp('click', { x: Math.round(args.x), y: Math.round(args.y) }); return { summary: c.ok ? `clicked (${args.x},${args.y})` : 'click failed' } }
    const text = String(args.text || '')
    const hit = await cdpEval(`(function(){var q=${JSON.stringify(text.toLowerCase())};var best=null,bs=1e9;for(var e of document.querySelectorAll('button,[role="button"],[role="tab"],a,[data-name],[title],[class*="tab"],[class*="button"]')){var t=((e.textContent||'')+' '+(e.getAttribute&&(e.getAttribute('aria-label')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('title')||'')||'')+' '+(e.getAttribute&&(e.getAttribute('data-name')||'')||'')).trim().toLowerCase();if(!t)continue;var r=e.getBoundingClientRect();if(!r.width||!r.height||r.top>innerHeight||r.bottom<0)continue;var idx=t.indexOf(q);if(idx<0)continue;var sc=t.length-q.length+idx;if(sc<bs){bs=sc;best={x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2),label:(e.textContent||'').trim().slice(0,40)}}}return best})()`)
    if (!hit) return { summary: `no element matching "${text}" — look again then click {x,y}` }
    const c = await cdp('click', { x: hit.x, y: hit.y })
    return { summary: c.ok ? `clicked "${hit.label || text}"` : 'click failed' }
  }
  async function tType(text) { const r = await cdp('type', { text: String(text || '') }); return { summary: r.ok ? `typed "${String(text).slice(0, 30)}"` : 'type failed' } }
  function keyEvent(key, mods) {
    const VK = { ENTER: 13, ESCAPE: 27, ESC: 27, DELETE: 46, TAB: 9, BACKSPACE: 8 }
    const up = key.toUpperCase(), vk = VK[up] || (key.length === 1 ? up.charCodeAt(0) : 0)
    const code = key.length === 1 ? (/[0-9]/.test(key) ? 'Digit' + key : 'Key' + up) : (up.charAt(0) + up.slice(1).toLowerCase())
    return { key: key.length === 1 ? key.toLowerCase() : key, code, vk, mods: mods || 0 }
  }
  async function tKey(combo) {
    const MOD = { ALT: 1, CTRL: 2, CONTROL: 2, META: 4, CMD: 4, SHIFT: 8 }
    const parts = String(combo || '').split('+').map((s) => s.trim()); const key = parts.pop() || ''; let mods = 0; for (const p of parts) mods |= MOD[p.toUpperCase()] || 0
    const r = await cdp('key', keyEvent(key, mods)); return { summary: r.ok ? `pressed ${combo}` : 'key failed' }
  }
  // Type a string as discrete real keystrokes (for TV's interval/symbol overlays).
  async function typeKeys(s) { for (const ch of String(s)) { await cdp('key', keyEvent(ch, 0)); await sleep(45) } }

  // ── price ↔ pixel mapping (read the crosshair price label on hover) ──────────
  let priceMap = null, priceMapTs = 0
  async function readPriceAtY(x, y) {
    await cdp('move', { x, y }); await sleep(140)
    return await cdpEval(`(function(Y){
      function num(e){var t=(e.textContent||'').replace(/[,\\s]/g,'');return /^\\d+(\\.\\d+)?$/.test(t)&&t.length<14?parseFloat(t):null}
      var cands=[];
      ['[class*="crosshair"]','[class*="price-axis"]','[class*="priceAxis"]','[class*="axisLabel"]','[class*="currency"]','[class*="highlight"]'].forEach(function(s){[].slice.call(document.querySelectorAll(s)).forEach(function(e){cands.push(e)})});
      [].slice.call(document.querySelectorAll('span,div')).forEach(function(e){var r=e.getBoundingClientRect();if(r.left>innerWidth-120&&r.width<100&&r.height<26&&r.height>8)cands.push(e)});
      var best=null,bd=24;
      for(var i=0;i<cands.length;i++){var v=num(cands[i]);if(v==null)continue;var r=cands[i].getBoundingClientRect();var cy=r.top+r.height/2;var d=Math.abs(cy-Y);if(d<bd){bd=d;best=v}}
      return best;
    })(${y})`)
  }
  async function buildPriceMap() {
    const cv = chartPane(); if (!cv) return false
    const r = cv.getBoundingClientRect(), x = Math.round(r.right - 46)
    const yA = Math.round(r.top + r.height * 0.26), yB = Math.round(r.top + r.height * 0.74)
    const pA = await readPriceAtY(x, yA), pB = await readPriceAtY(x, yB)
    if (pA != null && pB != null && pA !== pB) { priceMap = { yA, pA, yB, pB }; priceMapTs = Date.now(); return true }
    return false
  }
  function yForPrice(P) { if (!priceMap) return null; const { yA, pA, yB, pB } = priceMap; return Math.round(yA + (P - pA) * (yB - yA) / (pB - pA)) }

  // Draw a NATIVE horizontal line at an EXACT price. Primary: compute the Y pixel
  // from a crosshair-read price map and click there (no dialog). Fallback: place
  // at center and set the price by really typing into the line's dialog field.
  async function tDraw(args) {
    const price = +args.price
    if (args.price == null || isNaN(price)) return { summary: 'no price given to draw' }
    const cv = chartPane(); if (!cv) return { summary: 'no chart pane found' }
    const r = cv.getBoundingClientRect(), cx = Math.round(r.left + r.width * 0.5), cy = Math.round(r.top + r.height * 0.5)
    // CRITICAL: click the chart first so keyboard focus leaves our panel (else Alt+H
    // goes to our input box and no tool arms).
    await cdp('click', { x: cx, y: cy }); await sleep(150)
    await cdp('key', keyEvent('Escape', 0)); await sleep(110)
    // refresh the price↔pixel map (read crosshair prices), then place at the exact Y
    if (!priceMap || Date.now() - priceMapTs > 14000) await buildPriceMap()
    if (priceMap) {
      const y = yForPrice(price)
      if (y != null && y > r.top + 8 && y < r.bottom - 8) {
        await cdp('key', keyEvent('h', 1)); await sleep(280)             // arm horizontal line
        await cdp('click', { x: Math.round(r.left + r.width * 0.5), y }); await sleep(360)  // place at exact price Y
        await cdp('key', keyEvent('Escape', 0)); await sleep(120)
        return { summary: `drew a line at ${price}${args.label ? ' (' + args.label + ')' : ''}` }
      }
    }
    // FALLBACK (no map, or price off-screen): place at center, open dialog, REALLY
    // type the price into its field.
    await cdp('key', keyEvent('h', 1)); await sleep(300)
    await cdp('click', { x: cx, y: cy }); await sleep(500)
    await cdp('key', keyEvent('Escape', 0)); await sleep(220)
    await cdp('click', { x: cx, y: cy, clickCount: 2 }); await sleep(680)
    const field = await cdpEval(`(function(){try{
      var dlgs=[].slice.call(document.querySelectorAll('[role="dialog"],[class*="dialog"],[data-name*="dialog"]')).filter(function(d){return d.offsetParent});
      var dlg=dlgs[dlgs.length-1]; if(!dlg) return '';
      var ins=[].slice.call(dlg.querySelectorAll('input')).filter(function(i){return i.offsetParent&&i.type!=='checkbox'&&i.type!=='radio'});
      var f=ins.filter(function(i){return /^[\\d.,\\s-]+$/.test((i.value||'').trim())})[0]||ins[0];
      if(!f) return '';
      var r=f.getBoundingClientRect(); return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)});
    }catch(e){return ''}})()`)
    if (field) {
      try { const f = JSON.parse(field); await cdp('click', f); await sleep(140) } catch {}
      await cdp('key', keyEvent('a', 2)); await cdp('key', keyEvent('a', 4)); await sleep(70)
      await cdp('key', keyEvent('Delete', 0)); await sleep(90)
      await cdp('type', { text: String(price) }); await sleep(160)
      await cdp('key', keyEvent('Enter', 0)); await sleep(220)
      await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('button')).filter(function(e){return e.offsetParent&&/^(ok|apply|save)$/i.test((e.textContent||'').trim())})[0];if(b){b.click();return 1}return 0})()`)
      await sleep(140); await cdp('key', keyEvent('Escape', 0))
      return { summary: `drew a line and set it to ${price}${args.label ? ' (' + args.label + ')' : ''}` }
    }
    await cdp('key', keyEvent('Escape', 0))
    return { summary: `couldn't map the price scale or open the line dialog — drew one line near center but not at ${price}. (Tell me and I'll adjust how I read the axis.)` }
  }
  async function tLevels(prices) {
    if (!Array.isArray(prices) || !prices.length) return { summary: 'no prices to draw' }
    const done = []
    for (const p of prices.slice(0, 8)) { if (abort) break; const r = await tDraw({ price: p }); if (/^drew/.test(r.summary)) done.push(p); await sleep(160) }
    return { summary: done.length ? `drew ${done.length} levels: ${done.join(', ')}` : 'could not draw the levels' }
  }
  async function tTimeframe(tf) {
    const s = String(tf || '').trim(); if (!s) return { summary: 'no timeframe given' }
    await cdp('key', keyEvent('Escape', 0)); await sleep(140)
    await typeKeys(s.toUpperCase()); await sleep(160); await cdp('key', keyEvent('Enter', 0)); await sleep(520)
    return { summary: `set timeframe to ${s}` }
  }
  async function tSymbol(sym) {
    const s = String(sym || '').trim().toUpperCase(); if (!s) return { summary: 'no symbol given' }
    await cdp('key', keyEvent('Escape', 0)); await sleep(140)
    await typeKeys(s); await sleep(420); await cdp('key', keyEvent('Enter', 0)); await sleep(800)
    return { summary: `switched to ${s}` }
  }
  async function tIndicator(name) {
    const n = String(name || '').trim(); if (!n) return { summary: 'no indicator name' }
    const btn = await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('[data-name="open-indicators-dialog"],button,[role="button"]')).filter(function(e){var s=((e.textContent||'')+' '+((e.getAttribute&&e.getAttribute('data-name'))||'')+' '+((e.getAttribute&&e.getAttribute('aria-label'))||'')).toLowerCase();return /indicators|open-indicators/.test(s)}).filter(function(e){var r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight})[0];if(b){var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (!btn) return { summary: 'could not find the Indicators button' }
    try { const p = JSON.parse(btn); await cdp('click', p); await sleep(950) } catch {}
    await cdp('type', { text: n }); await sleep(850)
    await cdp('key', keyEvent('Enter', 0)); await sleep(650)
    await cdp('key', keyEvent('Escape', 0))
    return { summary: `searched indicators for "${n}" and added the top match` }
  }
  async function tRemoveDrawings() {
    const b = await cdpEval(`(function(){var e=[].slice.call(document.querySelectorAll('[data-name*="remove"],button,[aria-label]')).filter(function(x){var s=((x.getAttribute&&x.getAttribute('data-name'))||'')+' '+((x.getAttribute&&x.getAttribute('aria-label'))||'');return /remove.*(draw|object)|clear.*draw/i.test(s)}).filter(function(x){var r=x.getBoundingClientRect();return r.width&&r.height})[0];if(e){var r=e.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (!b) return { summary: 'could not find the remove-drawings control' }
    try { const p = JSON.parse(b); await cdp('click', p); await sleep(420) } catch {}
    await cdpEval(`(function(){var e=[].slice.call(document.querySelectorAll('[role="menuitem"],button')).filter(function(x){return /remove drawings|clear drawings|remove all/i.test(x.textContent||'')})[0];if(e)e.click()})()`)
    return { summary: 'cleared drawings' }
  }
  // Open the Pine editor, focus + clear it, write the code (monaco setValue if
  // reachable, else REAL typed input that needs no monaco), then Add to chart.
  async function tPine(code) {
    // 1. open the Pine Editor tab/panel
    const tab = await cdpEval(`(function(){var els=[].slice.call(document.querySelectorAll('button,[role="tab"],[data-name],[class*="tab"]'));var c=els.filter(function(e){var s=((e.textContent||'')+' '+((e.getAttribute&&e.getAttribute('data-name'))||'')+' '+((e.getAttribute&&e.getAttribute('aria-label'))||'')).toLowerCase();return /pine\\s*editor|pine_editor|\\bpine\\b/.test(s)}).filter(function(e){var r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight+40});if(c.length){var r=c[0].getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (tab) { try { const p = JSON.parse(tab); await cdp('click', p); await sleep(1400) } catch {} }
    // 2. locate the code area (the monaco editor) and wait for it to render
    let ed = null
    for (let i = 0; i < 16; i++) {
      ed = await cdpEval(`(function(){var t=document.querySelector('.monaco-editor .view-lines')||document.querySelector('.monaco-editor')||document.querySelector('textarea.inputarea');if(t){var r=t.getBoundingClientRect();if(r.width>120&&r.height>60)return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+Math.min(70,r.height/2))})}return ''})()`)
      if (ed) break
      await sleep(420)
    }
    if (!ed) return { summary: 'opened the bottom panel but couldn’t find the Pine code editor — click the “Pine Editor” tab once so it’s selected, then ask again' }
    // 3. focus the editor (so keystrokes land HERE, not our panel) and clear it
    const pt = JSON.parse(ed)
    await cdp('click', pt); await sleep(220)
    await cdp('key', keyEvent('a', 2)); await sleep(90)           // Ctrl+A (select all)
    await cdp('key', keyEvent('a', 4)); await sleep(90)           // Cmd+A too (mac)
    await cdp('key', keyEvent('Delete', 0)); await sleep(120)     // clear
    // 4. write the code — monaco model if reachable, else type it for real
    const set = await cdpEval(`(function(c){try{var ed=null;if(monaco&&monaco.editor){if(monaco.editor.getEditors){var es=monaco.editor.getEditors();ed=es.find(function(e){return e.hasTextFocus&&e.hasTextFocus()})||es[es.length-1]}if(ed&&ed.getModel){ed.getModel().setValue(c);return 'ok'}var ms=monaco.editor.getModels();if(ms&&ms.length){ms[ms.length-1].setValue(c);return 'ok'}}return 'nomonaco'}catch(e){return 'err:'+(e&&e.message||e)}})(${JSON.stringify(code)})`)
    let how = 'via editor model'
    if (set !== 'ok') { await cdp('type', { text: code }); how = 'typed in'; await sleep(400) }
    await sleep(550)
    // 5. add/update on chart
    const add = await cdpEval(`(function(){var b=[].slice.call(document.querySelectorAll('[data-name="add-script-to-chart"],button,[role="button"],[class*="button"]')).filter(function(e){var s=((e.textContent||'')+' '+((e.getAttribute&&e.getAttribute('data-name'))||'')+' '+((e.getAttribute&&e.getAttribute('aria-label'))||'')).toLowerCase();return /add to chart|update on chart|add-script-to-chart|apply to chart/.test(s)}).filter(function(e){var r=e.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight})[0];if(b){var r=b.getBoundingClientRect();return JSON.stringify({x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)})}return ''})()`)
    if (add) { try { const p = JSON.parse(add); await cdp('click', p); await sleep(1600) } catch {} ; return { summary: `wrote the script (${how}) and clicked Add/Update on chart` } }
    // fallback: TV's Add-to-chart keyboard shortcut
    await cdp('key', keyEvent('Enter', 2)); await sleep(1200)     // Ctrl+Enter
    return { summary: `wrote the script (${how}); couldn't find the Add-to-chart button so I sent Ctrl+Enter — check it landed` }
  }
  async function tPineErrors() { const e = await cdpEval(`(function(){var sel=['[class*="errorsContainer"]','[class*="pineConsole"]','[class*="console"] [class*="error"]','[class*="errorTooltip"]'];for(var s of sel){var el=document.querySelector(s);if(el&&/error|line\\s*\\d/i.test(el.textContent||''))return el.textContent.trim().slice(0,260)}return ''})()`); return { summary: e ? ('compiler error → ' + e) : 'compiled clean / no errors' } }

  // ════════════════════ THE AGENT LOOP ════════════════════════════════════════
  // A fresh screenshot is captured and sent on EVERY step (mirrored into the
  // vision strip), so the brain always sees the chart. A plan ticks itself off;
  // only the final answer becomes a real (markdown) message.
  async function runAgent(goal) {
    if (running) { setStatus('still on the last task…'); return }
    running = true; abort = false
    await warnDebugger()
    const st = startStatus('Looking at the chart…')
    const trail = []; let steps = 0; const MAX = 14; let planShown = false
    try {
      while (steps < MAX) {
        if (abort) { say('Stopped. ✋', 'bot'); break }
        let shot = null
        try { const s = await cdp('shot'); shot = s.ok ? (s.data || null) : null } catch {}
        if (shot) addThumb(shot)
        let ui = ''; try { ui = (await uiSnapshot()) || '' } catch {}
        const q = detectQuote()
        let r
        try {
          const res = await fetch(API.replace(/\/$/, '') + '/api/copilot/step', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal, symbol: q.symbol, price: q.price, timeframe: detectTimeframe(), ui, log: trail, shot, steps }) })
          r = await res.json()
        } catch { endStatus(st); say('Lost the brain connection — check the API URL (⚙).', 'bot'); break }
        if (r.plan && !planShown) { renderPlan(r.plan); planShown = true }
        if (planShown) setPlanProgress(steps)
        if (r.done) { endStatus(st); endPlan(); const m = r.say || r.thought || 'Done.'; say(m, 'bot'); speakOn && speak(stripMd(m)); break }
        if (r.thought) setStatus(r.thought)
        const tool = r.tool, args = r.args || {}
        let out = { summary: 'unknown tool: ' + tool }
        try {
          if (tool === 'find') out = await tFind(args.q)
          else if (tool === 'click') out = await tClick(args)
          else if (tool === 'type') out = await tType(args.text)
          else if (tool === 'key') out = await tKey(args.combo)
          else if (tool === 'drawLevel') out = await tDraw(args)
          else if (tool === 'levels') out = await tLevels(args.prices || args.levels)
          else if (tool === 'timeframe') out = await tTimeframe(args.tf || args.timeframe)
          else if (tool === 'symbol') out = await tSymbol(args.symbol || args.sym)
          else if (tool === 'indicator') out = await tIndicator(args.name)
          else if (tool === 'removeDrawings') out = await tRemoveDrawings()
          else if (tool === 'pine') out = await tPine(args.code)
          else if (tool === 'pineErrors') out = await tPineErrors()
          else if (tool === 'say') { if (args.text) setStatus(args.text); out = { summary: 'noted' } }
          else if (tool === 'look' || tool === 'chart') out = { summary: 'you already see a fresh screenshot every step' }
        } catch (e) { out = { summary: 'tool error: ' + String(e?.message || e).slice(0, 90) } }
        trail.push({ tool, args, result: out.summary })
        steps++
        await sleep(60)
      }
      if (steps >= MAX) { endStatus(st); endPlan(); say('That took a lot of steps — ask again or be more specific and I’ll keep going.', 'bot') }
    } finally { running = false; endStatus(st) }
  }

  function stripMd(t) { return String(t).replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim() }
  function speak(t) { try { const u = new SpeechSynthesisUtterance(stripMd(t).slice(0, 260)); u.rate = 1.05; speechSynthesis.cancel(); speechSynthesis.speak(u) } catch {} }
  function listen() { const SR = window.SpeechRecognition || window.webkitSpeechRecognition; if (!SR) return say('Voice input isn’t supported here.', 'bot'); if (rec) { rec.stop(); return } rec = new SR(); rec.lang = 'en-US'; rec.interimResults = false; setMic(true); rec.onresult = (e) => { input.value = e.results[0][0].transcript; send() }; rec.onend = () => { rec = null; setMic(false) }; rec.onerror = () => { rec = null; setMic(false) }; rec.start() }
  function saveRoutine() { const name = prompt('Name this routine'); if (!name) return; const sym = detectQuote().symbol; chrome.storage?.sync.get(['routines'], (v) => { const all = v.routines || {}; (all[sym] = all[sym] || []).push({ name, msg: window.__ynLastGoal || 'mark the key levels' }); chrome.storage?.sync.set({ routines: all }); say(`Saved **${name}** for ${sym}. Type \`run ${name}\`.`, 'bot') }) }
  function runRoutine(name) { chrome.storage?.sync.get(['routines'], (v) => { const list = (v.routines || {})[detectQuote().symbol] || [], hit = list.find((r) => r.name.toLowerCase() === name.toLowerCase()) || list[0]; hit ? runAgent(hit.msg) : say('No routine by that name here.', 'bot') }) }

  // ── tiny markdown renderer (safe: escapes first) ────────────────────────────
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') }
  function inlineMd(s) { return s.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/`([^`]+)`/g, '<code>$1</code>').replace(/(^|[\s(])\*([^*\n]+)\*/g, '$1<em>$2</em>') }
  function md(t) {
    const lines = esc(t).split(/\n/); let html = '', inList = false
    for (let ln of lines) {
      if (/^\s*[-*•]\s+/.test(ln)) { if (!inList) { html += '<ul>'; inList = true } html += '<li>' + inlineMd(ln.replace(/^\s*[-*•]\s+/, '')) + '</li>'; continue }
      if (inList) { html += '</ul>'; inList = false }
      if (/^#{1,4}\s+/.test(ln)) { html += '<h4>' + inlineMd(ln.replace(/^#{1,4}\s+/, '')) + '</h4>'; continue }
      if (ln.trim() === '') { html += '<div class="sp"></div>'; continue }
      html += '<div>' + inlineMd(ln) + '</div>'
    }
    if (inList) html += '</ul>'
    return html
  }

  // ── UI (draggable + resizable, glass cockpit) ───────────────────────────────
  let root, log, input, host, lastPx = null, tickTimer = null
  function build() {
    host = document.createElement('div'); host.id = 'yn-copilot-host'; document.documentElement.appendChild(host)
    root = host.attachShadow({ mode: 'open' })
    root.innerHTML = `
      <style>
        :host{ all:initial }
        *{ box-sizing:border-box }
        .panel{ position:fixed; width:376px; height:564px; min-width:300px; min-height:380px; max-width:94vw; max-height:94vh; border-radius:20px; overflow:hidden; isolation:isolate; z-index:2147483600; font-family:Inter,system-ui,-apple-system,sans-serif; box-shadow:0 30px 90px rgba(0,0,0,.6) }
        .panel::before{ content:''; position:absolute; inset:-70%; z-index:0; background:conic-gradient(from 0deg,#3b6bff,#10d693,#8b5bff,#3b6bff); animation:aura 9s linear infinite; opacity:.55; filter:blur(16px) }
        @keyframes aura{ to{ transform:rotate(360deg) } }
        .glass{ position:absolute; inset:1.4px; z-index:1; border-radius:19px; background:linear-gradient(180deg,rgba(12,15,28,.93),rgba(7,9,16,.96)); backdrop-filter:blur(22px); display:flex; flex-direction:column; overflow:hidden; color:#e6ecff }
        .hdr{ display:flex; align-items:center; gap:9px; padding:12px 13px; border-bottom:1px solid rgba(255,255,255,.07); cursor:move; user-select:none }
        .orb{ width:13px;height:13px;border-radius:99px;background:radial-gradient(circle at 30% 30%,#7fffcf,#10d693 40%,#1f3bff);box-shadow:0 0 12px rgba(16,214,147,.8);animation:breathe 3s ease-in-out infinite;flex:none }
        @keyframes breathe{ 0%,100%{ transform:scale(1);box-shadow:0 0 10px rgba(16,214,147,.7) } 50%{ transform:scale(1.18);box-shadow:0 0 18px rgba(31,59,255,.9) } }
        .title{ font-weight:800; font-size:13.5px; letter-spacing:-.2px } .ver{ font-size:8.5px; font-weight:800; letter-spacing:.08em; color:#86f0c0; background:rgba(16,185,129,.14); border:1px solid rgba(16,185,129,.32); border-radius:5px; padding:2px 5px }
        .tick{ margin-left:auto; display:flex; flex-direction:column; align-items:flex-end; line-height:1.05; font-family:ui-monospace,Menlo,monospace }
        .tick .s{ font-size:10px; color:#7e8db5; letter-spacing:.04em } .tick b{ font-size:13px; color:#e6ecff; transition:color .3s }
        .hbtn{ background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);color:#9aa6cf;cursor:pointer;font-size:13px;width:26px;height:26px;border-radius:8px;display:flex;align-items:center;justify-content:center;flex:none } .hbtn:hover{ color:#fff;border-color:rgba(31,59,255,.6) }
        .vision{ display:none; gap:6px; padding:8px 12px; overflow-x:auto; border-bottom:1px solid rgba(255,255,255,.06); background:rgba(255,255,255,.012) } .vision.on{ display:flex }
        .vlbl{ font-size:9px; color:#5f6b96; letter-spacing:.12em; align-self:center; flex:none; writing-mode:vertical-rl; transform:rotate(180deg); padding:2px 0 }
        .thumb{ height:46px; border-radius:7px; border:1px solid rgba(31,59,255,.3); flex:none; object-fit:cover; animation:pop .35s ease } @keyframes pop{ from{ transform:scale(.7);opacity:0 } }
        .log{ flex:1; overflow:auto; padding:13px; display:flex; flex-direction:column; gap:9px }
        .msg{ font-size:13px; line-height:1.55; padding:9px 12px; border-radius:13px; max-width:93%; animation:rise .26s cubic-bezier(.2,.8,.2,1) } @keyframes rise{ from{ transform:translateY(7px);opacity:0 } }
        .bot{ background:rgba(31,59,255,.12); border:1px solid rgba(31,59,255,.22); align-self:flex-start; border-bottom-left-radius:5px } .me{ background:linear-gradient(135deg,#1f3bff,#2563eb); color:#fff; align-self:flex-end; border-bottom-right-radius:5px }
        .bot h4{ margin:3px 0 4px; font-size:12px; color:#9db0ff; letter-spacing:.02em } .bot ul{ margin:4px 0; padding-left:17px } .bot li{ margin:2px 0 } .bot code{ background:rgba(255,255,255,.1); padding:1px 5px; border-radius:5px; font-size:12px; font-family:ui-monospace,monospace } .bot .sp{ height:5px }
        .status{ display:flex; align-items:center; gap:10px; color:#9db0ff }
        .spin{ width:14px;height:14px;border-radius:99px;border:2px solid rgba(157,176,255,.22);border-top-color:#9db0ff;animation:ynspin .7s linear infinite;flex:none } @keyframes ynspin{ to{ transform:rotate(360deg) } }
        .stxt{ font-style:italic; flex:1; font-size:12.5px } .stop{ background:rgba(255,90,120,.12);border:1px solid rgba(255,90,120,.3);color:#ff8aa0;cursor:pointer;font-size:11px;border-radius:7px;padding:2px 7px;flex:none }
        .plan{ align-self:stretch; background:rgba(255,255,255,.025); border:1px solid rgba(255,255,255,.08); border-radius:13px; padding:11px 13px; animation:rise .3s ease }
        .ptitle{ font-size:9.5px; letter-spacing:.18em; color:#6c77a8; margin-bottom:8px; font-family:ui-monospace,monospace } .pitem{ display:flex; align-items:center; gap:9px; font-size:12.5px; color:#8a96bd; padding:3px 0; transition:color .3s }
        .pdot{ width:14px;height:14px;border-radius:99px;border:2px solid rgba(138,150,189,.4);flex:none;position:relative;transition:all .3s } .pitem.cur{ color:#cdd6ff } .pitem.cur .pdot{ border-color:#9db0ff;box-shadow:0 0 8px rgba(157,176,255,.6);animation:breathe 1.6s ease-in-out infinite } .pitem.done{ color:#86f0c0 } .pitem.done .pdot{ background:#10d693;border-color:#10d693 } .pitem.done .pdot::after{ content:'✓';position:absolute;inset:-3px 0 0 1px;font-size:10px;color:#04140c;font-weight:900;text-align:center }
        .row{ display:flex; gap:6px; padding:8px 11px; flex-wrap:wrap; align-items:center; border-top:1px solid rgba(255,255,255,.06) }
        .chip{ font-size:11px; color:#cdd6ff; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.11); border-radius:99px; padding:5px 11px; cursor:pointer; transition:all .15s } .chip:hover{ border-color:rgba(31,59,255,.6); transform:translateY(-1px); background:rgba(31,59,255,.12) }
        .speak{ font-size:11px;color:#7e8db5;cursor:pointer;margin-left:auto } .speak.on{ color:#10d693 }
        .in{ display:flex; gap:8px; padding:10px 11px 11px; border-top:1px solid rgba(255,255,255,.08); align-items:flex-end }
        textarea{ flex:1; resize:none; height:40px; max-height:96px; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.12); color:#fff; border-radius:11px; padding:10px 12px; font-size:13px; outline:none; font-family:inherit; line-height:1.4 } textarea:focus{ border-color:rgba(31,59,255,.6) } textarea::placeholder{ color:#5f6b96 }
        .mic,.send{ border:none; border-radius:11px; width:40px; height:40px; cursor:pointer; font-size:15px; flex:none; transition:transform .12s } .mic:active,.send:active{ transform:scale(.92) } .mic{ background:rgba(255,255,255,.06); color:#cdd6ff } .mic.on{ background:#ef4444; color:#fff; animation:breathe 1.2s infinite } .send{ background:linear-gradient(135deg,#1f3bff,#10d693); color:#fff; font-weight:800 }
        .settings{ position:absolute; inset:0; z-index:6; background:rgba(7,9,16,.98); padding:18px; display:none; flex-direction:column; gap:13px } .settings.show{ display:flex } .settings label{ font-size:12px;color:#9aa3c8 } .settings input{ background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);color:#fff;border-radius:10px;padding:10px 12px;font-size:13px;outline:none }
        .grip{ position:absolute; right:2px; bottom:2px; width:18px; height:18px; cursor:nwse-resize; z-index:7 } .grip::after{ content:''; position:absolute; right:4px; bottom:4px; width:7px; height:7px; border-right:2px solid #4d5a8a; border-bottom:2px solid #4d5a8a }
        .log::-webkit-scrollbar,.vision::-webkit-scrollbar{ width:7px;height:7px } .log::-webkit-scrollbar-thumb,.vision::-webkit-scrollbar-thumb{ background:rgba(255,255,255,.1);border-radius:9px }
      </style>
      <div class="panel" id="yn-panel">
        <div class="glass">
          <div class="hdr" id="yn-hdr">
            <span class="orb"></span><span class="title">YN Copilot</span><span class="ver">AGENT v5.2</span>
            <span class="tick"><span class="s" id="yn-sym">—</span><b id="yn-px">·</b></span>
            <button class="hbtn" id="yn-clear" title="Clear">⌫</button><button class="hbtn" id="yn-gear" title="Settings">⚙</button><button class="hbtn" id="yn-x" title="Close">✕</button>
          </div>
          <div class="vision" id="yn-vision"><span class="vlbl">SEEING</span></div>
          <div class="log" id="yn-log"></div>
          <div class="row">
            <span class="chip" data-act="analyze">📊 Analyze</span><span class="chip" data-act="levels">📐 Levels</span><span class="chip" data-act="indicator">⚡ Indicator</span><span class="chip" data-act="plan">🎯 Trade plan</span><span class="chip" data-act="routine">＋ Routine</span>
            <span class="speak" id="yn-speak">🔊 speak</span>
          </div>
          <div class="in"><textarea id="yn-input" rows="1" placeholder="Tell the agent what to do…"></textarea><button class="mic" id="yn-mic">🎤</button><button class="send" id="yn-send">➤</button></div>
          <div class="settings" id="yn-settings"><label>YN API base URL</label><input id="yn-api" /><button class="send" id="yn-save" style="width:auto;height:auto;padding:9px 16px;border-radius:10px">Save</button><div style="font-size:11px;color:#7e8db5;line-height:1.55">A real agent — it sees the chart (screenshots), reasons, and acts step by step via Chrome’s debugger API. The vision strip shows what it’s looking at. A banner shows while it works.</div></div>
          <div class="grip" id="yn-grip"></div>
        </div>
      </div>`
    log = root.getElementById('yn-log'); input = root.getElementById('yn-input')
    const panel = root.getElementById('yn-panel')
    root.getElementById('yn-x').onclick = () => toggle(false)
    root.getElementById('yn-clear').onclick = () => { [...log.children].forEach((c) => c.remove()); planEl = null; const v = root.getElementById('yn-vision'); v.classList.remove('on'); [...v.querySelectorAll('.thumb')].forEach((t) => t.remove()) }
    root.getElementById('yn-send').onclick = send; root.getElementById('yn-mic').onclick = listen
    input.addEventListener('input', () => { input.style.height = 'auto'; input.style.height = Math.min(96, input.scrollHeight) + 'px' })
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } })
    root.getElementById('yn-speak').classList.toggle('on', speakOn)
    root.getElementById('yn-speak').onclick = (e) => { speakOn = !speakOn; chrome.storage?.sync.set({ speak: speakOn }); e.target.classList.toggle('on', speakOn) }
    root.querySelectorAll('.chip').forEach((c) => c.onclick = () => quick(c.dataset.act))
    const gear = root.getElementById('yn-gear'), settings = root.getElementById('yn-settings'), apiIn = root.getElementById('yn-api')
    gear.onclick = () => { apiIn.value = API; settings.classList.toggle('show') }
    root.getElementById('yn-save').onclick = () => { API = apiIn.value.trim() || DEFAULT_API; chrome.storage?.sync.set({ apiBase: API }); settings.classList.remove('show'); say('Saved.', 'bot') }
    chrome.storage?.sync.get(['panelBox'], (v) => { const b = v.panelBox; if (b) { panel.style.left = b.left + 'px'; panel.style.top = b.top + 'px'; if (b.w) panel.style.width = b.w + 'px'; if (b.h) panel.style.height = b.h + 'px' } else { panel.style.left = Math.max(8, innerWidth - 396) + 'px'; panel.style.top = Math.max(8, innerHeight - 588) + 'px' } })
    // drag
    const hdr = root.getElementById('yn-hdr'); let drag = null
    hdr.addEventListener('mousedown', (e) => { if (e.target.closest('.hbtn')) return; const r = panel.getBoundingClientRect(); drag = { dx: e.clientX - r.left, dy: e.clientY - r.top }; e.preventDefault() })
    addEventListener('mousemove', (e) => { if (!drag) return; panel.style.left = Math.min(innerWidth - 70, Math.max(0, e.clientX - drag.dx)) + 'px'; panel.style.top = Math.min(innerHeight - 44, Math.max(0, e.clientY - drag.dy)) + 'px' })
    addEventListener('mouseup', () => { if (drag) { drag = null; persistBox(panel) } if (rsz) { rsz = null; persistBox(panel) } })
    // resize (manual grip)
    const grip = root.getElementById('yn-grip'); let rsz = null
    grip.addEventListener('mousedown', (e) => { const r = panel.getBoundingClientRect(); rsz = { x: e.clientX, y: e.clientY, w: r.width, h: r.height }; e.preventDefault(); e.stopPropagation() })
    addEventListener('mousemove', (e) => { if (!rsz) return; panel.style.width = Math.max(300, Math.min(innerWidth * 0.94, rsz.w + (e.clientX - rsz.x))) + 'px'; panel.style.height = Math.max(380, Math.min(innerHeight * 0.94, rsz.h + (e.clientY - rsz.y))) + 'px' })
    startTicker()
    const q = detectQuote()
    say(`I’m a real agent on **${q.symbol || 'this chart'}**${q.price ? ' @ ' + q.price : ''}. Tell me what to do — *read the structure*, *draw levels*, *build & test an indicator*, *switch timeframe* — and I’ll look, click, type and refine it myself. Watch the **SEEING** strip to see exactly what I’m looking at.`, 'bot')
  }
  let boxT; function persistBox(panel) { clearTimeout(boxT); boxT = setTimeout(() => { const r = panel.getBoundingClientRect(); chrome.storage?.sync.set({ panelBox: { left: r.left, top: r.top, w: r.width, h: r.height } }) }, 300) }
  function startTicker() { stopTicker(); tickTimer = setInterval(() => { const q = detectQuote(); const s = root && root.getElementById('yn-sym'), p = root && root.getElementById('yn-px'); if (!p) return; if (s) s.textContent = q.symbol || '—'; if (q.price != null) { const up = lastPx != null && q.price > lastPx, dn = lastPx != null && q.price < lastPx; p.textContent = q.price.toLocaleString(); p.style.color = up ? '#10d693' : dn ? '#ff6a8a' : '#e6ecff'; lastPx = q.price } }, 2200) }
  function stopTicker() { if (tickTimer) clearInterval(tickTimer); tickTimer = null }

  function quick(act) {
    if (act === 'routine') return saveRoutine()
    const m = {
      analyze: 'Look at the chart and give me the trend, the key support/resistance levels, and what to watch — in a tight bulleted read.',
      levels: 'Identify the most important support and resistance levels you can see, and draw each one as a native horizontal line on the chart.',
      indicator: 'Write a clean Pine v5 indicator for the 200 EMA plus the prior-day high/low, open the Pine editor, add it to the chart, and make sure it compiles cleanly.',
      plan: 'Give me a concrete trade plan from what you see: bias, an entry zone, a stop, two targets, and the invalidation — then draw the entry, stop and target as levels on the chart.',
    }[act]
    if (m) { input.value = m; send() }
  }
  function send() { const t = input.value.trim(); if (!t) return; say(t, 'me'); input.value = ''; input.style.height = '40px'; window.__ynLastGoal = t; if (/^run\s+/i.test(t)) return runRoutine(t.replace(/^run\s+/i, '').trim()); runAgent(t) }
  function setMic(on) { const m = root && root.getElementById('yn-mic'); if (m) m.classList.toggle('on', on) }
  function say(text, who) { if (!root) return; const d = document.createElement('div'); d.className = 'msg ' + (who === 'me' ? 'me' : 'bot'); if (who === 'me') d.textContent = text; else d.innerHTML = md(text); log.appendChild(d); log.scrollTop = log.scrollHeight }

  // live loader (spinner + updating text + stop), removed when the answer lands
  let statusEl = null
  function startStatus(text) { if (!root) return null; endStatus(statusEl); const d = document.createElement('div'); d.className = 'msg bot status'; d.innerHTML = '<span class="spin"></span><span class="stxt"></span><button class="stop">stop</button>'; d.querySelector('.stxt').textContent = text || 'Working…'; d.querySelector('.stop').onclick = () => { abort = true; setStatus('stopping…') }; log.appendChild(d); log.scrollTop = log.scrollHeight; statusEl = d; return d }
  function setStatus(text) { const d = statusEl; if (!d) return; const s = d.querySelector('.stxt'); if (s) s.textContent = text; log.scrollTop = log.scrollHeight }
  function endStatus(d) { const t = d || statusEl; if (t && t.parentNode) t.parentNode.removeChild(t); if (t === statusEl || !d) statusEl = null }

  // vision strip
  function addThumb(data) { if (!root || !data) return; const strip = root.getElementById('yn-vision'); if (!strip) return; strip.classList.add('on'); const img = document.createElement('img'); img.className = 'thumb'; img.src = 'data:image/jpeg;base64,' + data; strip.appendChild(img); const thumbs = strip.querySelectorAll('.thumb'); if (thumbs.length > 6) thumbs[0].remove(); strip.scrollLeft = strip.scrollWidth }

  // plan checklist
  let planEl = null
  function renderPlan(items) { if (!root || !Array.isArray(items) || !items.length) return; if (planEl && planEl.parentNode) planEl.remove(); const d = document.createElement('div'); d.className = 'plan'; d.innerHTML = '<div class="ptitle">EXECUTION PLAN</div>' + items.slice(0, 6).map((s) => '<div class="pitem"><span class="pdot"></span><span>' + esc(String(s)) + '</span></div>').join(''); log.appendChild(d); planEl = d; log.scrollTop = log.scrollHeight }
  function setPlanProgress(i) { if (!planEl) return; planEl.querySelectorAll('.pitem').forEach((el, idx) => { el.classList.toggle('done', idx < i); el.classList.toggle('cur', idx === i) }) }
  function endPlan() { if (planEl) planEl.querySelectorAll('.pitem').forEach((el) => { el.classList.remove('cur'); el.classList.add('done') }) }

  let open = false
  function toggle(force) { open = force == null ? !open : force; if (open && !host) build(); if (host) host.style.display = open ? 'block' : 'none'; if (!open) stopTicker(); else if (host) startTicker(); const lh = document.getElementById('yn-launch-host'); if (lh) lh.style.display = open ? 'none' : 'block' }
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
