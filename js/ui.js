/* =====================================================================
 * ui.js ── 介面控制：標題、世界選擇列、資訊卡、探索 HUD、NPC 對話、選單、搜尋、我要辦、
 *          新手導覽、分享網址、無障礙（文字大小／減少動態／焦點管理）、雙語
 * ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const ZONES = window.ZONES, SITE = window.SITE, EM = window.EMBLEMS, L = window.I18N, t = L.t;
  const zone = id => ZONES.find(z => z.id === id);
  const ZN = z => L.Z(z, 'shortName');
  const visited = new Set(JSON.parse(safeGet('pwd3d-visited') || '[]'));
  let current = 'hub', started = false, near = null, labels = {}, lastFocus = null;

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  const track = (n, p) => window.Extras && Extras.track(n, p);

  /* ---------- 啟動 ---------- */
  function boot() {
    applyTextSize(safeGet('pwd3d-size') || '1');
    L.apply(); fillStatic();
    $('#loader-emblem').innerHTML = EM.hub; $('#brand-emblem').innerHTML = EM.hub;
    $('#title-emblems').innerHTML = ZONES.map((z, i) => `<span style="animation-delay:${.1 + i * .07}s" title="${ZN(z)}">${EM[z.id]}</span>`).join('');
    $('#menu-official').href = SITE.officialUrl;
    if (window.World.isMobile || matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
    if (window.Extras) { Extras.applyFestivalLines(); Extras.loadSheet().then(ok => { if (ok && started && World.mode === 'overview') select(current, true); }); }

    const fill = $('#loader-fill'), txt = $('#loader-text');
    let p = 0; const iv = setInterval(() => { p = Math.min(p + 12, 90); fill.style.width = p + '%'; }, 120);
    const go = () => setTimeout(() => {
      const sky = (location.protocol === 'file:' && window.SKY_DATA) ? window.SKY_DATA : SITE.skyImage;
      try { World.init($('#world'), { skyImage: sky, quality: safeGet('pwd3d-quality') || 'auto' }); }
      catch (e) { console.error(e); txt.textContent = '您的瀏覽器不支援 3D，已切換為純文字版'; setTimeout(openA11y, 800); clearInterval(iv); return; }
      World.setSeason(safeGet('pwd3d-season') || (window.Extras ? Extras.autoSeason() : 'spring'));
      if (safeGet('pwd3d-voice') === 'off') Sound.setVoice(false);
      const rm = safeGet('pwd3d-motion') || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'); setMotion(rm);
      World.setViewShift(.16);
      buildTiles(); buildLabels(); bindKeys(); bindJoystick(); clock(); showFestival();
      World.on('zoneClick', id => { if (!started) return; World.mode === 'explore' ? openSheet(id) : select(id); });
      World.on('proximity', onProximity); World.on('frame', onFrame); World.on('modeChange', onMode); World.on('npc', onNPC);
      clearInterval(iv); fill.style.width = '100%';
      setTimeout(() => $('#loader').classList.add('done'), 300);
      setTimeout(() => $('#loader').remove(), 1000);
      // 分享網址：#nco 這類連結直接進入該處
      const h = location.hash.replace('#', ''); if (zone(h)) { start('overview'); select(h); }
      addEventListener('hashchange', () => { const id = location.hash.replace('#', ''); if (zone(id) && id !== current) { if (!started) start('overview'); select(id); } });
    }, 60);
    if (location.protocol === 'file:') { const sc = document.createElement('script'); sc.src = 'assets/sky-offline.js'; sc.onload = sc.onerror = go; document.head.appendChild(sc); }
    else go();
  }
  function fillStatic() {
    if ($('#title-h1')) { $('#title-h1').textContent = L.S('siteTitle'); $('#title-sub').textContent = L.S('siteSubtitle'); }
    $('#menu-foot').innerHTML = `${L.S('orgName')}｜${SITE.address}｜${SITE.phone}<br>${t('updated')}：${SITE.updated}`;
  }

  function start(mode) {
    if (started) return; started = true; blip(660);
    $('#title').classList.add('leaving'); setTimeout(() => $('#title').remove(), 700);
    $('#hud').hidden = false;
    try { Sound.start(); $('#btn-sound').textContent = '🔊'; } catch (e) { }
    track('start', { mode });
    if (mode === 'explore') { World.setMode('explore'); if (!safeGet('pwd3d-toured')) setTimeout(() => startTour(), 900); else toast(t('welcome')); }
    else { select(current); onMode('overview'); }
  }

  /* ---------- 世界選擇列 ---------- */
  function buildTiles() {
    $('#tiles').innerHTML = ZONES.map(z => `<button class="tile" data-id="${z.id}" aria-label="${ZN(z)}" onclick="UI.select('${z.id}')">${EM[z.id]}<span class="dot" hidden>✓</span></button>`).join('') + `<span class="tile-name" id="tile-name"></span>`;
    visited.forEach(id => { const d = document.querySelector(`.tile[data-id="${id}"] .dot`); if (d) d.hidden = false; });
  }
  function select(id, quiet) {
    const z = zone(id); if (!z) return;
    if (World.mode === 'explore') { World.flyTo(id); toast(t('goto', ZN(z))); return; }
    current = id; if (!quiet) blip(520);
    if (location.hash !== '#' + id) history.replaceState(null, '', '#' + id);
    document.documentElement.style.setProperty('--accent', z.color);
    document.documentElement.style.setProperty('--accent-soft', z.soft);
    document.querySelectorAll('.tile').forEach(b => { b.classList.toggle('active', b.dataset.id === id); b.setAttribute('aria-current', b.dataset.id === id ? 'true' : 'false'); });
    const nameEl = $('#tile-name'), tile = document.querySelector(`.tile[data-id="${id}"]`);
    nameEl.textContent = ZN(z); tile.after(nameEl);
    tile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    $('#hero-badge').textContent = L.Z(z, 'badge');
    $('#hero-title').textContent = L.Z(z, 'title');
    $('#hero-tagline').textContent = L.Z(z, 'tagline');
    $('#hero-sub').textContent = L.Z(z, 'subtitle');
    $('#hero-link').href = z.officialUrl;
    $('#hero-visited').hidden = !visited.has(id);
    const ml = L.Z(z, 'metrics');
    $('#hero-cards').innerHTML = z.metrics.map((m, i) => `<div class="card"><small>${Array.isArray(ml) && typeof ml[i] === 'string' ? ml[i] : m.label}</small><b>${m.value}</b><i>${m.unit}</i></div>`).join('')
      + z.news.slice(0, 2).map(n => `<button class="card news" onclick="UI.openSheet()"><small>${n.date}・${n.tag}</small><span>${n.title}</span></button>`).join('');
    const h = $('#hero'); h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap');
    World.flyTo(id);
    if (!$('#sheet').hidden) fillSheet(id);
    track('zone_view', { zone: id });
  }
  function step(d) { const i = ZONES.findIndex(z => z.id === current); select(ZONES[(i + d + ZONES.length) % ZONES.length].id); }

  function markVisited(id) {
    if (visited.has(id)) return; visited.add(id); safeSet('pwd3d-visited', JSON.stringify([...visited]));
    const d = document.querySelector(`.tile[data-id="${id}"] .dot`); if (d) d.hidden = false;
    const n = visited.size; toast(n === ZONES.length ? t('allVisited') : t('visitedN', ZN(zone(id)), n, ZONES.length));
    track('zone_visit', { zone: id });
  }

  /* ---------- 模式 ---------- */
  function toggleMode() { World.setMode(World.mode === 'explore' ? 'overview' : 'explore'); blip(440); }
  function onMode(m) {
    const ex = m === 'explore';
    World.setViewShift(ex ? 0 : .17);
    $('#explore-hud').hidden = !ex; $('#hero').hidden = ex; $('#tiles').style.display = ex ? 'none' : '';
    $('#mode-ico').textContent = ex ? '🗺️' : '🚶'; const mt = $('#mode-txt'); mt.dataset.i18n = ex ? 'overviewShort' : 'explore'; mt.textContent = t(mt.dataset.i18n);
    if (!ex) { select(current, true); $('#prompt').hidden = true; }
  }
  function enterZone() { const id = current; World.setMode('explore'); setTimeout(() => World.flyTo(id), 50); }

  function onProximity(id) {
    near = id; const p = $('#prompt');
    if (npcId) return;
    if (!id) { p.hidden = true; return; }
    $('#prompt-text').textContent = t('view', ZN(zone(id)));
    p.hidden = false; p.onclick = () => openSheet(id);
    markVisited(id);
  }

  /* ---------- 側邊面板 ---------- */
  function fillSheet(id) {
    const z = zone(id), sn = L.Z(z, 'services');
    document.documentElement.style.setProperty('--accent', z.color);
    document.documentElement.style.setProperty('--accent-soft', z.soft);
    $('#sheet-emblem').innerHTML = EM[id];
    $('#sheet-badge').textContent = L.Z(z, 'badge') + '・' + L.Z(z, 'tagline');
    $('#sheet-title').textContent = L.Z(z, 'title');
    $('#sheet-services').innerHTML = z.services.map((s, i) => `<a href="${s.url}" target="_blank" rel="noopener" onclick="Extras.track('service_click',{zone:'${id}',service:'${s.name}'})"><span aria-hidden="true">${s.icon}</span>${Array.isArray(sn) && typeof sn[i] === 'string' ? sn[i] : s.name}</a>`).join('');
    $('#sheet-news').innerHTML = z.news.map(n => `<li><time>${n.date}<em>${n.tag}</em></time>${n.url ? `<a href="${n.url}" target="_blank" rel="noopener">${n.title}</a>` : n.title}</li>`).join('');
    $('#sheet-link').href = z.officialUrl;
  }
  function openSheet(id) { id = id || current; fillSheet(id); lastFocus = document.activeElement; $('#sheet').hidden = false; blip(600); if (World.mode === 'explore') markVisited(id); setTimeout(() => $('#sheet .icon-btn').focus(), 30); track('sheet_open', { zone: id }); }
  function closeSheet() { $('#sheet').hidden = true; if (lastFocus) lastFocus.focus(); }

  /* ---------- 分享 ---------- */
  async function share() {
    const z = zone(current), url = (location.protocol.startsWith('http') ? location.href.split('#')[0] : SITE.siteUrl) + '#' + current;
    const data = { title: `${L.Z(z, 'title')}｜${L.S('siteTitle')}`, text: L.Z(z, 'tagline'), url };
    track('share', { zone: current });
    try { if (navigator.share) { await navigator.share(data); return; } } catch (e) { return; }
    try { await navigator.clipboard.writeText(url); toast(t('copied')); } catch (e) { prompt('', url); }
  }

  /* ---------- Modal（含焦點管理：開啟時聚焦、Tab 不跑出視窗、關閉回到原按鈕）---------- */
  function openModal(id) { lastFocus = document.activeElement; const m = $('#' + id); m.hidden = false; setTimeout(() => { const f = m.querySelector('input,button,a'); f && f.focus(); }, 30); }
  function close(id) { const m = $('#' + id); if (!m || m.hidden) return; m.hidden = true; if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }
  document.addEventListener('keydown', e => {
    if (e.key !== 'Tab') return;
    const m = [...document.querySelectorAll('.modal,#sheet,#tour')].find(x => !x.hidden); if (!m) return;
    const f = [...m.querySelectorAll('button,a[href],input,[tabindex="0"]')].filter(x => x.offsetParent !== null); if (!f.length) return;
    if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  });

  function openMenu() {
    openModal('menu');
    seg('#seg-lang', L.lang, v => setLang(v));
    seg('#seg-season', World.season, v => { World.setSeason(v); safeSet('pwd3d-season', v); });
    seg('#seg-voice', Sound.voiceOn ? 'on' : 'off', v => { Sound.setVoice(v === 'on'); safeSet('pwd3d-voice', v); });
    seg('#seg-size', safeGet('pwd3d-size') || '1', v => { applyTextSize(v); safeSet('pwd3d-size', v); });
    seg('#seg-motion', safeGet('pwd3d-motion') || 'off', v => { setMotion(v); safeSet('pwd3d-motion', v); });
    seg('#seg-quality', safeGet('pwd3d-quality') || 'auto', v => { World.setQuality(v); safeSet('pwd3d-quality', v); toast(t('qualityChanged')); });
  }
  function seg(sel, val, fn) {
    document.querySelectorAll(sel + ' button').forEach(b => { const on = b.dataset.v === val; b.classList.toggle('on', on); b.setAttribute('aria-pressed', on);
      b.onclick = () => { document.querySelectorAll(sel + ' button').forEach(x => { x.classList.remove('on'); x.setAttribute('aria-pressed', false); }); b.classList.add('on'); b.setAttribute('aria-pressed', true); fn(b.dataset.v); blip(700); }; });
  }
  function applyTextSize(v) { document.documentElement.style.setProperty('--fs', v); }
  function setMotion(v) { document.body.classList.toggle('reduce-motion', v === 'on'); if (World.setReducedMotion) World.setReducedMotion(v === 'on'); }
  function setLang(v) {
    L.set(v); fillStatic(); buildTiles(); ZONES.forEach(z => { const el = labels[z.id]; if (el) el.querySelector('span').textContent = ZN(z); });
    if (started && World.mode === 'overview') select(current, true); else if (started) onMode('explore');
    if (!$('#sheet').hidden) fillSheet(current);
  }
  function toggleLang() { setLang(L.lang === 'zh' ? 'en' : 'zh'); }

  function openSearch() {
    openModal('search'); const inp = $('#search-input'); inp.value = ''; renderSearch('');
    inp.oninput = () => renderSearch(inp.value.trim());
  }
  function renderSearch(q) {
    const list = q ? window.SEARCH_INDEX.filter(s => (s.keywords + s.title + zone(s.zone).shortName + ZN(zone(s.zone))).toLowerCase().includes(q.toLowerCase())) : window.SEARCH_INDEX;
    $('#search-results').innerHTML = (list.length ? list : window.SEARCH_INDEX).map(s => `<button onclick="UI.close('search');UI.goSearch('${s.zone}')">${EM[s.zone]}<span>${s.title}<small>${ZN(zone(s.zone))}</small></span></button>`).join('');
    if (q) track('search', { q });
  }
  function goSearch(id) { if (World.mode === 'explore') { World.flyTo(id); setTimeout(() => openSheet(id), 1300); } else { select(id); setTimeout(() => openSheet(id), 900); } }

  /* ---------- 我要辦 ---------- */
  function openTasks() {
    $('#tasks-list').innerHTML = (window.TASKS || []).map((k, i) => { const z = zone(k.zone);
      return `<div class="task" style="--c:${z.color}"><span class="task-ico" aria-hidden="true">${k.icon}</span><div class="task-body"><b>${k.title}</b><small>${ZN(z)}</small></div>
        <a class="btn btn-primary btn-sm" href="${k.url}" target="_blank" rel="noopener" onclick="Extras.track('task_click',{task:'${k.title}'})">${t('go')}</a>
        <button class="btn btn-ghost btn-sm" onclick="UI.close('tasks');UI.goSearch('${k.zone}')">${t('see')}</button></div>`; }).join('');
    openModal('tasks'); track('tasks_open');
  }

  /* ---------- 新手導覽（第一次進入第一人稱時出現）---------- */
  let tourStep = 0;
  function startTour(force) { if (!force && safeGet('pwd3d-toured')) return; tourStep = 0; lastFocus = document.activeElement; $('#tour').hidden = false; renderTour(); }
  function renderTour() {
    const [h, p] = t('tour' + (tourStep + 1));
    $('#tour-h').textContent = h; $('#tour-p').textContent = p;
    $('#tour-dots').innerHTML = [0, 1, 2, 3].map(i => `<i class="${i === tourStep ? 'on' : ''}"></i>`).join('');
    $('#tour-next').textContent = tourStep < 3 ? t('next') : t('done'); $('#tour-next').focus();
  }
  function tourNext() { if (tourStep < 3) { tourStep++; renderTour(); blip(620); } else endTour(); }
  function endTour() { $('#tour').hidden = true; safeSet('pwd3d-toured', '1'); toast(t('welcome')); track('tour_done', { step: tourStep }); }

  /* ---------- 節慶提示 ---------- */
  function showFestival() {
    const f = window.Extras && Extras.activeFestivals()[0]; if (!f || safeGet('pwd3d-fest-' + f.id) === new Date().toDateString()) return;
    $('#festival-text').textContent = f.banner; $('#festival').hidden = false;
    $('#festival button').addEventListener('click', () => safeSet('pwd3d-fest-' + f.id, new Date().toDateString()));
  }

  function openA11y() {
    $('#a11y-h1').textContent = L.S('orgName') + t('textVersion');
    $('#a11y-list').innerHTML = ZONES.map(z => { const ml = L.Z(z, 'metrics'), sn = L.Z(z, 'services');
      return `<section style="--c:${z.color}"><h2>${L.Z(z, 'title')}</h2><p>${L.Z(z, 'subtitle')}</p>
      <ul>${z.metrics.map((m, i) => `<li>${Array.isArray(ml) && typeof ml[i] === 'string' ? ml[i] : m.label}：${m.value} ${m.unit}</li>`).join('')}</ul>
      <h3>${t('services')}</h3><ul>${z.services.map((s, i) => `<li><a href="${s.url}" target="_blank" rel="noopener">${Array.isArray(sn) && typeof sn[i] === 'string' ? sn[i] : s.name}</a></li>`).join('')}</ul>
      <h3>${t('news')}</h3><ul>${z.news.map(n => `<li>${n.date}［${n.tag}］${n.title}</li>`).join('')}</ul>
      <p><a href="${z.officialUrl}" target="_blank" rel="noopener">${t('officialOf', L.Z(z, 'title'))}</a></p></section>`; }).join('')
      + `<p>${SITE.address}｜${SITE.phone}</p>`;
    openModal('a11y'); track('a11y_open');
  }
  function showHelp() { toast(document.body.classList.contains('touch') ? t('helpTouch') : t('helpKey'), 4200); }

  /* ---------- 鍵盤（PS5 風格：左右切換、Enter 確認、Esc 返回） ---------- */
  function bindKeys() {
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') close('search'); return; }
      if (!started) { if (e.key === 'Enter' && e.target === document.body) start('explore'); return; }
      if (e.key === 'Escape') { if (!$('#tour').hidden) return endTour(); ['menu', 'search', 'tasks', 'a11y'].forEach(close); closeSheet(); return; }
      if ([...document.querySelectorAll('.modal,#tour')].some(m => !m.hidden)) return;
      const onUI = e.target !== document.body && e.target.tagName !== 'CANVAS';
      if (World.mode === 'overview') {
        if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'Enter' && !onUI) enterZone();
      } else if ((e.code === 'KeyE' || (e.key === 'Enter' && !onUI)) && npcId) nextLine();
      else if ((e.code === 'KeyE' || (e.key === 'Enter' && !onUI)) && near) openSheet(near);
      if (e.key >= '1' && e.key <= '6') select(ZONES[+e.key - 1].id);
      if (e.code === 'KeyM') toggleMode();
    });
  }

  /* ---------- 手機搖桿 ---------- */
  function bindJoystick() {
    const j = $('#joystick'), k = j.querySelector('i'); let id = null, cx = 0, cy = 0;
    j.addEventListener('pointerdown', e => { id = e.pointerId; const r = j.getBoundingClientRect(); cx = r.left + r.width / 2; cy = r.top + r.height / 2; j.setPointerCapture(id); mv(e); });
    j.addEventListener('pointermove', e => { if (e.pointerId === id) mv(e); });
    const end = () => { id = null; k.style.transform = ''; World.setMoveInput(0, 0); };
    j.addEventListener('pointerup', end); j.addEventListener('pointercancel', end);
    function mv(e) { let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy), m = 46; if (d > m) { dx *= m / d; dy *= m / d; }
      k.style.transform = `translate(${dx}px,${dy}px)`; World.setMoveInput(dx / m, -dy / m); }
  }

  /* ---------- 每幀：標籤＋小地圖＋對話框位置 ---------- */
  function buildLabels() {
    const box = $('#labels');
    ZONES.forEach(z => { const el = document.createElement('div'); el.className = 'lbl'; el.style.setProperty('--c', z.color);
      el.innerHTML = `${EM[z.id]}<span>${ZN(z)}</span>`;
      el.onclick = () => World.mode === 'explore' ? openSheet(z.id) : select(z.id);
      box.appendChild(el); labels[z.id] = el; });
  }
  function onFrame() {
    const ex = World.mode === 'explore';
    World.projectZones().forEach(p => {
      const el = labels[p.id]; const show = started && p.visible && (ex ? p.dist < 95 : true);
      el.style.opacity = show ? 1 : 0; el.style.pointerEvents = show ? 'auto' : 'none';
      el.style.transform = `translate(${p.x}px,${p.y}px) translate(-50%,-100%)`;
      el.classList.toggle('on', !ex && p.id === current);
    });
    if (ex) drawMinimap();
    if (npcId) { const q = World.projectNPC(npcId), b = $('#npc-bubble');
      if (q && q.visible) { const w = innerWidth, hw = Math.min(180, w * .42), x = Math.max(hw, Math.min(w - hw, q.x)), y = Math.max(140, q.y); b.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`; b.style.opacity = 1; }
      else b.style.opacity = 0; }
  }
  const mm = { ctx: null };
  function drawMinimap() {
    const c = $('#minimap'); const x = mm.ctx || (mm.ctx = c.getContext('2d')); const S = 180, sc = S / 230;
    x.clearRect(0, 0, S, S);
    x.save(); x.beginPath(); x.arc(90, 90, 88, 0, 7); x.clip();
    x.fillStyle = '#dff0d0'; x.fillRect(0, 0, S, S);
    const P = (wx, wz) => [90 + wx * sc, 90 + wz * sc];
    x.strokeStyle = '#a7aec3'; x.lineWidth = 7 * sc; x.beginPath(); x.arc(90, 90, 34 * sc, 0, 7); x.stroke();
    x.strokeStyle = '#8fcde9'; x.lineWidth = 11 * sc; x.beginPath();
    [[16, -60], [44, -56], [66, -48], [76, -18], [74, 16], [66, 46], [38, 62], [0, 66], [-38, 62], [-72, 58], [-120, 64]].forEach((p, i) => { const [a, b] = P(...p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke();
    x.strokeStyle = '#a7aec3'; x.lineWidth = 5 * sc; x.beginPath(); [[-22, 26], [-36, 44], [-42, 62], [-44, 82], [-48, 104]].forEach((p, i) => { const [a, b] = P(...p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke();
    x.fillStyle = '#9fcf8a'; x.beginPath(); x.arc(...P(0, -96), 42 * sc, 0, 7); x.fill();
    ZONES.forEach(z => { const [a, b] = P(...z.pos); x.fillStyle = z.color; x.beginPath(); x.arc(a, b, z.id === 'hub' ? 7 : 6, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); });
    const pp = World.playerPos, yaw = World.playerYaw; const [px, py] = P(pp.x, pp.z);
    x.translate(px, py); x.rotate(-yaw); x.fillStyle = '#24304f'; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.fill();
    x.restore();
    x.fillStyle = '#24304f'; x.font = '800 15px Outfit, sans-serif'; x.textAlign = 'center'; x.fillText('N', 90, 18);
  }

  /* ---------- 小工具 ---------- */
  function clock() { const f = () => { $('#clock').textContent = new Date().toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }); }; f(); setInterval(f, 15000); }
  let tt; function toast(msg, ms = 2600) { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => el.classList.remove('show'), ms); }
  const blip = f => window.Sound && Sound.blip(f);
  function toggleSound() { if (Sound.on) { Sound.stop(); $('#btn-sound').textContent = '🔈'; } else { Sound.start(); $('#btn-sound').textContent = '🔊'; } }

  /* ---------- NPC 對話 ---------- */
  let npcId = null, npcIdx = {}, typing = null;
  const npcData = id => (window.NPCS || []).find(n => n.id === id);
  function onNPC(id) {
    npcId = id; const bub = $('#npc-bubble');
    if (!id) { bub.hidden = true; Sound.stopVoice(); if (near) onProximity(near); else $('#prompt').hidden = true; return; }
    const n = npcData(id);
    $('#npc-name').textContent = L.N(n, 'name'); $('#npc-role').textContent = L.N(n, 'role');
    const av = $('#npc-avatar'); av.hidden = false; av.alt = L.N(n, 'name'); av.src = `assets/npc/${n.id}.jpg`;
    bub.style.setProperty('--c', (zone(n.zone) || {}).color || '#4a7fd4');
    bub.hidden = false;
    const greet = L.N(n, 'greet'), gi = Math.random() * greet.length | 0; talk(greet[gi], n, L.lang === 'zh' ? `${n.id}-g${gi + 1}` : null);
    const p = $('#prompt'); $('#prompt-text').textContent = t('talk', L.N(n, 'name')); p.hidden = false; p.onclick = nextLine;
    track('npc_talk', { npc: id });
  }
  function nextLine() {
    const n = npcData(npcId); if (!n) return;
    const lines = L.N(n, 'lines'), i = npcIdx[n.id] = ((npcIdx[n.id] ?? -1) + 1) % lines.length;
    talk(lines[i], n, L.lang === 'zh' ? `${n.id}-${i + 1}` : null); World.npcWave(n.id); blip(760);
  }
  function talk(line, n, key) {
    const text = typeof line === 'string' ? line : line.text, el = $('#npc-text');
    clearInterval(typing); let k = 0; el.textContent = '';
    if (document.body.classList.contains('reduce-motion')) el.textContent = text;
    else typing = setInterval(() => { el.textContent = text.slice(0, ++k); if (k >= text.length) clearInterval(typing); }, 38);
    Sound.say(line, Object.assign({ key, lang: L.lang }, n.voice));
  }

  window.UI = { nextLine, start, select, enterZone, toggleMode, openSheet, closeSheet, openMenu, openSearch, goSearch, close, openA11y, showHelp, toggleSound,
    share, openTasks, startTour, tourNext, endTour, toggleLang };
  boot();
})();
