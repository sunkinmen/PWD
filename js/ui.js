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
    L.apply(); fillStatic(); if (window.ICONS) ICONS.apply();
    $('#loader-emblem').innerHTML = EM.hub; $('#brand-emblem').innerHTML = EM.hub;
    $('#title-emblems').innerHTML = ZONES.map((z, i) => `<span style="animation-delay:${.1 + i * .07}s" title="${ZN(z)}">${EM[z.id]}</span>`).join('');
    $('#menu-official').href = SITE.officialUrl;
    if (window.World.isMobile || matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');
    if (window.Extras) { Extras.applyFestivalLines(); Extras.loadSheet().then(ok => { if (ok && started && World.mode === 'overview') select(current, true); }); }

    const fill = $('#loader-fill'), txt = $('#loader-text');
    let p = 0; const iv = setInterval(() => { p = Math.min(p + 3, 14); fill.style.width = p + '%'; }, 120);
    const go = () => setTimeout(() => {
      const sky = (location.protocol === 'file:' && window.SKY_DATA) ? window.SKY_DATA : SITE.skyImage;
      const fail = e => { console.error(e); txt.textContent = '您的瀏覽器不支援 3D，已切換為純文字版'; setTimeout(openA11y, 800); clearInterval(iv); };
      clearInterval(iv);
      try { World.init($('#world'), { skyImage: sky, quality: safeGet('pwd3d-quality') || 'auto', onProgress: k => { fill.style.width = Math.round(k * 100) + '%'; } }); }
      catch (e) { return fail(e); }
      World.ready.then(afterInit, fail);
    }, 30);
    function afterInit() {
      World.setSeason(safeGet('pwd3d-season') || (window.Extras ? Extras.autoSeason() : 'spring'));
      if (safeGet('pwd3d-voice') === 'off') Sound.setVoice(false);
      const rm = safeGet('pwd3d-motion') || (matchMedia('(prefers-reduced-motion: reduce)').matches ? 'on' : 'off'); setMotion(rm);
      World.setViewShift(.16);
      World.setTime(safeGet('pwd3d-time') || 'auto');
      World.setAvatar(safeGet('pwd3d-avatar') || 'm'); World.setView(safeGet('pwd3d-view') || 'first'); syncView();
      updateStampCount();
      buildTiles(); buildLabels(); bindKeys(); bindJoystick(); clock(); showFestival();
      World.on('zoneClick', id => { if (!started) return; World.mode === 'explore' ? openSheet(id) : select(id); });
      World.on('proximity', onProximity); World.on('frame', onFrame); World.on('modeChange', onMode); World.on('npc', onNPC); World.on('ride', onRide);
      fill.style.width = '100%';
      setTimeout(() => $('#loader').classList.add('done'), 300);
      setTimeout(() => $('#loader').remove(), 1000);
      // 分享網址：#nco 這類連結直接進入該處
      const h = location.hash.replace('#', ''); if (zone(h)) { start('overview'); select(h); }
      addEventListener('hashchange', () => { const id = location.hash.replace('#', ''); if (zone(id) && id !== current) { if (!started) start('overview'); select(id); } });
    }
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
    try { Sound.start(); setSoundIco(true); } catch (e) { }
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
    if (World.mode === 'explore') { wipe(id, () => World.flyTo(id, true)); return; }
    current = id; if (!quiet) { blip(520); if (window.Sound && Sound.stinger) Sound.stinger(id); }
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
    $('#hero-visited').hidden = !visited.has(id); $('#hero-portal').hidden = !z.portal; $('#hero-link').hidden = !!z.portal;
    const ml = L.Z(z, 'metrics');
    $('#hero-cards').innerHTML = z.metrics.map((m, i) => `<div class="card">${ICONS.svg(m.ico || 'chart')}${m.trend ? `<em class="trend ${m.trend}" title="${t(m.trend === 'up' ? 'trendUp' : 'trendFlat')}">${m.trend === 'up' ? ICONS.svg('up') : '—'}</em>` : ''}<small>${Array.isArray(ml) && typeof ml[i] === 'string' ? ml[i] : m.label}</small><b>${m.value}</b><i>${m.unit}</i></div>`).join('')
      + z.news.slice(0, 2).map(n => `<button class="card news" style="--tagc:${tagColor(n.tag, z)}" onclick="${z.portal ? "UI.openPortal('notice')" : 'UI.openSheet()'}"><span class="thumb">${EM[id]}</span><small>${n.date}<em>${n.tag}</em></small><span>${n.title}</span></button>`).join('');
    $('#hero').classList.remove('open');
    const h = $('#hero'); h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap');
    World.flyTo(id);
    if (!$('#sheet').hidden) fillSheet(id);
    track('zone_view', { zone: id });
  }
  function step(d) { const i = ZONES.findIndex(z => z.id === current); select(ZONES[(i + d + ZONES.length) % ZONES.length].id); }

  function markVisited(id) {
    if (visited.has(id)) return; visited.add(id); safeSet('pwd3d-visited', JSON.stringify([...visited]));
    stampDates[id] = stampDates[id] || new Date().toISOString().slice(0, 10); safeSet('pwd3d-stamps', JSON.stringify(stampDates));
    const d = document.querySelector(`.tile[data-id="${id}"] .dot`); if (d) d.hidden = false;
    const n = visited.size; toast(n === ZONES.length ? t('allVisited') : t('visitedN', ZN(zone(id)), n, ZONES.length));
    stampPop(id); updateStampCount();
    if (n === ZONES.length) setTimeout(celebrate, 1600);
    track('zone_visit', { zone: id });
  }

  /* ---------- 模式 ---------- */
  function toggleMode() { World.setMode(World.mode === 'explore' ? 'overview' : 'explore'); blip(440); }
  function onMode(m) {
    const ex = m === 'explore';
    World.setViewShift(ex ? 0 : .17);
    $('#explore-hud').hidden = !ex; $('#hero').hidden = ex; $('#tiles').style.display = ex ? 'none' : '';
    $('#mode-ico').innerHTML = ICONS.svg(ex ? 'map' : 'walk'); const mt = $('#mode-txt'); mt.dataset.i18n = ex ? 'overviewShort' : 'explore'; mt.textContent = t(mt.dataset.i18n);
    if (!ex) { select(current, true); $('#prompt').hidden = true; }
  }
  function enterZone() { const id = current; wipe(id, () => { World.setMode('explore'); World.flyTo(id, true); }); }

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
    $('#sheet-news').innerHTML = z.news.map(n => `<li style="--tagc:${tagColor(n.tag, z)}"><time>${n.date}<em>${n.tag}</em></time>${n.url ? `<a href="${n.url}" target="_blank" rel="noopener">${n.title}</a>` : n.title}</li>`).join('');
    $('#sheet-link').href = z.officialUrl; $('#sheet-portal').hidden = !z.portal;
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
    const m = [...document.querySelectorAll('.modal,#sheet,#tour,#celebrate,#portal')].find(x => !x.hidden); if (!m) return;
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
    seg('#seg-time', World.timeMode || 'auto', v => { World.setTime(v); safeSet('pwd3d-time', v); });
    seg('#seg-view', World.view, v => { setView(v); if (v === 'third' && World.mode !== 'explore') { close('menu'); World.setMode('explore'); } });
    seg('#seg-avatar', safeGet('pwd3d-avatar') || 'm', v => { setAvatar(v); if (World.view !== 'third') { setView('third'); openMenu(); } });
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
    const base = window.SEARCH_INDEX.filter(s => !s.portal);
    const list = q ? window.SEARCH_INDEX.filter(s => (s.keywords + s.title + zone(s.zone).shortName + ZN(zone(s.zone))).toLowerCase().includes(q.toLowerCase())).slice(0, 30) : base;
    $('#search-results').innerHTML = (list.length ? list : base).map(s => `<button onclick="UI.close('search');${s.portal ? `UI.openPortal('${s.portal[0]}',${s.portal[1]})` : `UI.goSearch('${s.zone}')`}">${EM[s.zone]}<span>${s.title}<small>${ZN(zone(s.zone))}${s.portal ? '・線上申辦' : ''}</small></span></button>`).join('');
    if (q) track('search', { q });
  }
  function goSearch(id) { if (World.mode === 'explore') { select(id); setTimeout(() => openSheet(id), 1400); } else { select(id); setTimeout(() => openSheet(id), 900); } }

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
      if (e.key === 'Escape') { if (!$('#tour').hidden) return endTour(); if (!$('#portal').hidden) return closePortal(); if (!$('#celebrate').hidden) return closeCelebrate(); ['menu', 'search', 'tasks', 'a11y', 'stamps'].forEach(close); closeSheet(); return; }
      if ([...document.querySelectorAll('.modal,#tour,#celebrate,#portal')].some(m => !m.hidden)) return;
      const onUI = e.target !== document.body && e.target.tagName !== 'CANVAS';
      if (World.mode === 'ride' || World.mode === 'deck') return;
      if (World.mode === 'overview') {
        if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'Enter' && !onUI) enterZone();
      } else if ((e.code === 'KeyE' || (e.key === 'Enter' && !onUI)) && npcId) nextLine();
      else if ((e.code === 'KeyE' || (e.key === 'Enter' && !onUI)) && near) openSheet(near);
      if (e.key >= '1' && e.key <= '6') select(ZONES[+e.key - 1].id);
      if (e.code === 'KeyM') toggleMode();
      if (e.code === 'KeyV' && World.mode === 'explore') toggleView();
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
    { const [a, b] = P(24, -4); x.fillStyle = '#26355e'; x.font = '800 10px Outfit, sans-serif'; x.textAlign = 'center'; x.fillText('101', a, b + 3); }
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
  function toggleSound() { if (Sound.on) { Sound.stop(); setSoundIco(false); } else { Sound.start(); setSoundIco(true); } }
  function setSoundIco(on) { $('#btn-sound').innerHTML = ICONS.svg(on ? 'soundOn' : 'soundOff'); }

  /* ---------- NPC 對話 ---------- */
  let npcId = null, npcIdx = {}, typing = null;
  const npcData = id => (window.NPCS || []).find(n => n.id === id);
  function onNPC(id) {
    npcId = id; const bub = $('#npc-bubble');
    if (!id) { bub.hidden = true; lastMood = ''; Sound.stopVoice(); if (near) onProximity(near); else $('#prompt').hidden = true; return; }
    const n = npcData(id);
    $('#npc-name').textContent = L.N(n, 'name'); $('#npc-role').textContent = L.N(n, 'role');
    const av = $('#npc-avatar'); av.hidden = false; av.alt = L.N(n, 'name'); setMood(n, 'happy');
    bub.style.setProperty('--c', (zone(n.zone) || {}).color || '#4a7fd4');
    bub.hidden = false;
    const acts = $('#npc-actions'); acts.hidden = true; acts.innerHTML = '';
    if (n.special === 'ticket') {
      const left = ZONES.length - visited.size;
      if (left <= 0) { talk(L.N(n, 'ready'), n, null); acts.innerHTML = `<button class="btn btn-primary" onclick="event.stopPropagation();UI.redeem()">${t('redeem')}</button>`; }
      else { talk(L.N(n, 'notYet')(left), n, null); setMood(n, 'worried'); acts.innerHTML = `<button class="btn btn-glass" onclick="event.stopPropagation();UI.openStamps()">${t('passportBtn')}</button>`; }
      acts.hidden = false;
    } else { const greet = L.N(n, 'greet'), gi = Math.random() * greet.length | 0; talk(greet[gi], n, L.lang === 'zh' ? `${n.id}-g${gi + 1}` : null); }
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
    if (!(n.special && /還差|more/.test(text))) setMood(n, moodOf(text)); World.npcTalk && World.npcTalk(n.id, Math.min(8, .9 + text.length * .11));
    clearInterval(typing); let k = 0; el.textContent = '';
    if (document.body.classList.contains('reduce-motion')) el.textContent = text;
    else typing = setInterval(() => { el.textContent = text.slice(0, ++k); if (k >= text.length) clearInterval(typing); }, 38);
    Sound.say(line, Object.assign({ key, lang: L.lang }, n.voice));
  }

  /* ---------- 表情：依台詞關鍵字切換「開心／擔心／一般」立繪 ---------- */
  const WORRY = /颱風|豪雨|暴雨|危險|小心|千萬|請勿|坍|崩塌|落石|警戒|別靠近|不要靠近|遠離|careful|danger|never|stay away|typhoon/i;
  const HAPPY = /歡迎|哈囉|嗨|哈哈|呵呵|開心|恭喜|好玩|喜歡|漂亮|謝謝|讚|太好|舒服|welcome|hello|hi |great|enjoy|fun|thanks|love/i;
  const moodOf = text => WORRY.test(text) ? 'worried' : HAPPY.test(text) ? 'happy' : 'normal';
  let lastMood = '';
  function setMood(n, mood) {
    const av = $('#npc-avatar'), b = $('#npc-bubble'), key = n.id + mood; if (key === lastMood) return; lastMood = key;
    av.src = `assets/npc/${n.id}${mood === 'normal' ? '' : '-' + mood}.jpg`;
    av.onerror = () => { av.onerror = () => { av.hidden = true; }; av.src = `assets/npc/${n.id}.jpg`; };
    b.classList.remove('mood-happy', 'mood-worried'); if (mood !== 'normal') b.classList.add('mood-' + mood);
    av.classList.remove('pop'); void av.offsetWidth; av.classList.add('pop');
  }

  /* ---------- 公告標籤顏色 ---------- */
  const TAGC = [[/防汛|防災|安全|颱風|坡地|警/, '#e8833a'], [/花|公園|共融|綠/, '#3fae6a'], [/水|河|污水|下水道/, '#2f8fd8'], [/智慧|科技|3D|感測/, '#7a5cd6'], [/淨零|永續|低碳/, '#1f9b8f'], [/路|橋|工程/, '#d6a12a']];
  function tagColor(tag, z) { const f = TAGC.find(([re]) => re.test(tag)); return f ? f[1] : z.color; }

  /* ---------- 手機資訊面板上拉 ---------- */
  function toggleHero() { $('#hero').classList.toggle('open'); blip(640); }
  (function swipeHero() {
    let y0 = null; const h = () => $('#hero');
    addEventListener('touchstart', e => { if (h() && h().contains(e.target)) y0 = e.touches[0].clientY; }, { passive: true });
    addEventListener('touchend', e => { if (y0 == null) return; const dy = e.changedTouches[0].clientY - y0; y0 = null;
      if (dy < -40) h().classList.add('open'); else if (dy > 40) h().classList.remove('open'); }, { passive: true });
  })();

  /* ---------- 世界轉場（雲朵擦拭＋專屬音效）---------- */
  let wiping = false;
  function wipe(id, mid) {
    const z = zone(id), w = $('#wipe');
    if (document.body.classList.contains('reduce-motion') || wiping) { mid(); if (World.mode === 'explore') toast(t('goto', ZN(z))); return; }
    wiping = true; w.style.setProperty('--wc', z.soft); $('#wipe-emblem').innerHTML = EM[id]; $('#wipe-name').textContent = L.Z(z, 'title');
    w.classList.remove('run'); void w.offsetWidth; w.classList.add('run');
    if (window.Sound && Sound.stinger) Sound.stinger(id);
    setTimeout(mid, 520); setTimeout(() => { w.classList.remove('run'); wiping = false; }, 1300);
    track('teleport', { zone: id });
  }

  /* ---------- 工務護照（集章）＋集滿慶祝＋紀念卡 ---------- */
  const stampDates = JSON.parse(safeGet('pwd3d-stamps') || '{}');
  visited.forEach(id => { if (!stampDates[id]) stampDates[id] = ''; });
  const ROT = [-8, 6, -4, 9, -11, 4];
  function stampHTML(z, i, got, cls = '') {
    return `<div class="stamp ${got ? 'got' : ''} ${cls}" style="--c:${z.color};--r:${ROT[i % 6]}deg" title="${L.Z(z, 'title')}">${EM[z.id]}<span>${ZN(z)}</span>${got && stampDates[z.id] ? `<time>${stampDates[z.id]}</time>` : ''}</div>`;
  }
  function updateStampCount() { const n = visited.size, el = $('#stamp-count'); if (!el) return; el.textContent = `${n}/${ZONES.length}`; el.closest('button').classList.toggle('full', n === ZONES.length); }
  function openStamps(justId) {
    $('#stamp-grid').innerHTML = ZONES.map((z, i) => stampHTML(z, i, visited.has(z.id), z.id === justId ? 'just' : '')).join('');
    $('#stamp-grid').querySelectorAll('.stamp').forEach((el, i) => el.onclick = () => { close('stamps'); goSearch(ZONES[i].id); });
    $('#reward-sub').textContent = t('rewardSub', visited.size); $('#reward-row').classList.toggle('ready', visited.size >= ZONES.length);
    openModal('stamps'); track('stamps_open', { n: visited.size });
  }
  function stampPop(id) {
    const z = zone(id), i = ZONES.indexOf(z); let box = $('#stamp-toast'); if (box) box.remove();
    box = document.createElement('div'); box.id = 'stamp-toast'; box.innerHTML = stampHTML(z, i, true, 'just'); document.body.appendChild(box);
    if (window.Sound && Sound.stamp) setTimeout(Sound.stamp, 200);
    setTimeout(() => { box.style.transition = '.4s'; box.style.opacity = 0; }, 1300); setTimeout(() => box.remove(), 1800);
  }
  function celebrate() {
    $('#celebrate').hidden = false; lastFocus = document.activeElement; setTimeout(() => $('#celebrate .btn-primary').focus(), 50);
    if (window.Sound && Sound.fanfare) Sound.fanfare();
    if (World.npcWave) World.npcWave('god');
    if (Sound.say) { const n = npcData('god'), txt = t('celeText').replace(/^.*?[「“]|[」”]$/g, ''); Sound.say(L.lang === 'zh' && SITE.voiceFiles ? { text: txt, audio: 'assets/voice/god-bless.mp3' } : txt, Object.assign({ lang: L.lang }, n && n.voice)); }
    confetti(); track('all_stamps');
  }
  function closeCelebrate() { $('#celebrate').hidden = true; Sound.stopVoice && Sound.stopVoice(); if (lastFocus) lastFocus.focus(); }
  function confetti() {
    const c = $('#confetti'), x = c.getContext('2d'); c.width = innerWidth; c.height = innerHeight;
    if (document.body.classList.contains('reduce-motion')) return;
    const cols = ZONES.map(z => z.color).concat(['#ffd166', '#ff9ec7']);
    const P = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .6, vx: (Math.random() - .5) * 2, vy: 2 + Math.random() * 3, r: Math.random() * 6.3, s: 6 + Math.random() * 7, c: cols[Math.random() * cols.length | 0] }));
    const t0 = performance.now();
    (function f(now) { x.clearRect(0, 0, c.width, c.height); P.forEach(p => { p.x += p.vx; p.y += p.vy; p.r += .08; x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.fillStyle = p.c; x.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); x.restore(); });
      if (now - t0 < 5000 && !$('#celebrate').hidden) requestAnimationFrame(f); else x.clearRect(0, 0, c.width, c.height); })(t0);
  }
  /* 紀念卡：Canvas 繪製 1200×800 PNG，印上姓名、六枚章、山神祝福 */
  async function downloadCert() {
    const name = ($('#cert-name').value || t('explorer')).trim().slice(0, 16); safeSet('pwd3d-name', name);
    const W = 1200, H = 800, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const svgImg = (svg, col) => img('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg.replace('<svg', `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" color="${col}"`)));
    const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#dff0ff'); g.addColorStop(1, '#fff6e8'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const sky = await img(SITE.skyImage); if (sky) { x.globalAlpha = .35; x.drawImage(sky, 0, 0, W, H * .55); x.globalAlpha = 1; }
    x.fillStyle = 'rgba(255,255,255,.88)'; roundRect(x, 40, 40, W - 80, H - 80, 36); x.fill();
    x.strokeStyle = '#ffd166'; x.lineWidth = 6; roundRect(x, 52, 52, W - 104, H - 104, 30); x.stroke();
    const god = await img('assets/npc/god-happy.jpg'); if (god) { x.save(); x.beginPath(); x.arc(W - 190, 190, 100, 0, 7); x.clip(); x.drawImage(god, W - 290, 90, 200, 200); x.restore();
      x.strokeStyle = '#ffd166'; x.lineWidth = 8; x.beginPath(); x.arc(W - 190, 190, 104, 0, 7); x.stroke(); }
    const hub = await svgImg(EM.hub, '#4a7fd4'); if (hub) x.drawImage(hub, 96, 92, 84, 84);
    x.fillStyle = '#24304f'; x.font = '900 52px "Noto Sans TC", sans-serif'; x.fillText(t('certTitle'), 196, 150);
    x.font = '700 24px "Noto Sans TC", sans-serif'; x.fillStyle = '#56607e'; x.fillText(L.S('orgName') + '｜Taipei Public Works', 198, 190);
    x.font = '900 72px "Noto Sans TC", sans-serif'; x.fillStyle = '#24304f'; x.fillText(name, 100, 300);
    x.font = '700 28px "Noto Sans TC", sans-serif'; x.fillStyle = '#56607e'; x.fillText(t('certLine'), 100, 350);
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i], cx = 188 + i * 165, cy = 520, e = await svgImg(EM[z.id], z.color);
      x.save(); x.translate(cx, cy); x.rotate(ROT[i] * Math.PI / 180);
      x.fillStyle = '#fff'; x.beginPath(); x.arc(0, 0, 76, 0, 7); x.fill();
      x.strokeStyle = z.color; x.lineWidth = 5; x.beginPath(); x.arc(0, 0, 76, 0, 7); x.stroke(); x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 67, 0, 7); x.stroke();
      if (e) x.drawImage(e, -34, -50, 68, 68);
      x.fillStyle = z.color; x.font = '900 18px "Noto Sans TC", sans-serif'; x.textAlign = 'center'; x.fillText(ZN(z), 0, 42, 118);
      x.font = '600 13px Outfit, sans-serif'; x.fillText(stampDates[z.id] || '', 0, 60); x.restore(); x.textAlign = 'left';
    }
    x.font = 'italic 700 24px "Noto Sans TC", sans-serif'; x.fillStyle = '#8a6a1f';
    const bless = t('celeText'); let line = '', ly = 660;
    for (const ch of bless) { if (x.measureText(line + ch).width > 1000) { x.fillText(line, 100, ly); line = ''; ly += 34; } line += ch; } x.fillText(line, 100, ly);
    x.font = '600 20px Outfit, sans-serif'; x.fillStyle = '#56607e'; x.fillText(new Date().toISOString().slice(0, 10) + '  ·  sunkinmen.github.io/PWD', 100, 736);
    c.toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `taipei-pwd-explorer-${name}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 4000); }, 'image/png');
    toast('🎉 ' + t('certDl')); track('cert_download');
  }
  function roundRect(x, a, b, w, h, r) { x.beginPath(); x.moveTo(a + r, b); x.arcTo(a + w, b, a + w, b + h, r); x.arcTo(a + w, b + h, a, b + h, r); x.arcTo(a, b + h, a, b, r); x.arcTo(a, b, a + w, b, r); x.closePath(); }

  /* ---------- 101 觀景台：兌換門票 → 螺旋電梯 → 89F 觀景台 → 煙火 ---------- */
  function goBooth() {
    const go = () => { World.teleport(24, 8, 0); toast(t('goto', '101')); };
    if (!started) start('explore');
    if (World.mode !== 'explore') { World.setMode('explore'); setTimeout(() => wipe('hub', go), 60); } else wipe('hub', go);
  }
  function redeem() {
    if (visited.size < ZONES.length) return;
    $('#ticket-name').textContent = safeGet('pwd3d-name') || t('explorer');
    $('#ticket-date').textContent = new Date().toLocaleDateString(L.lang === 'zh' ? 'zh-TW' : 'en-US');
    $('#ticket-stamps').innerHTML = ZONES.map(z => `<i style="--c:${z.color}">${EM[z.id]}</i>`).join('');
    lastFocus = document.activeElement; $('#ticket').hidden = false; setTimeout(() => $('#ticket .btn').focus(), 60);
    Sound.stamp && Sound.stamp(); Sound.fanfare && setTimeout(Sound.fanfare, 300); track('ticket_redeem');
  }
  let prevTime = null;
  function boardElevator() { $('#ticket').hidden = true; World.startRide(1); }
  function descend() { World.startRide(-1); }
  function onRide(e) {
    const hud = $('#explore-hud'), r = $('#ride-ui'), d = $('#deck-ui');
    if (e.phase === 'up' || e.phase === 'down') {
      hud.hidden = true; d.hidden = true; r.hidden = false; $('#npc-bubble').hidden = true; $('#prompt').hidden = true;
      $('#lift-arrow').textContent = e.phase === 'up' ? '▲' : '▼'; Sound.elevator && Sound.elevator(true);
    } else if (e.phase === 'progress') {
      $('#lift-floor').textContent = e.floor; $('#lift-fill').style.width = (e.u * 100) + '%'; Sound.liftPitch && Sound.liftPitch(e.u);
    } else if (e.phase === 'deck') {
      r.hidden = true; d.hidden = false; Sound.elevator && Sound.elevator(false); Sound.ding && Sound.ding(); toast(t('arrived'));
      $('#deck-night').checked = World.timeMode === 'night'; track('deck_arrive');
    } else if (e.phase === 'ground') {
      r.hidden = true; d.hidden = true; d.classList.remove('fw'); hud.hidden = false; Sound.elevator && Sound.elevator(false); Sound.ding && Sound.ding(); toast(t('backGround'));
      if (prevTime !== null) { World.setTime(prevTime); prevTime = null; }
      $('#btn-fw').disabled = false;
    } else if (e.phase === 'fw-end') { $('#deck-ui').classList.remove('fw'); $('#btn-fw').disabled = false; $('#btn-fw span').textContent = t('fireworks'); }
  }
  function deckNight(on) {
    if (on) { if (prevTime === null) prevTime = World.timeMode || 'auto'; World.setTime('night'); }
    else { World.setTime(prevTime || 'auto'); prevTime = null; }
  }
  function fireworks() {
    const b = $('#btn-fw'); if (b.disabled) return; b.disabled = true; b.querySelector('span').textContent = t('fwRunning');
    const cd = $('#countdown'), num = $('#cd-num'); let n = 3; cd.hidden = false;
    const tick = () => { if (n > 0) { num.textContent = n; num.classList.remove('pop'); void num.offsetWidth; num.classList.add('pop'); blip(500 + (3 - n) * 120); n--; setTimeout(tick, 1000); }
      else { cd.hidden = true; World.startFireworks(); $('#deck-ui').classList.add('fw'); track('fireworks'); } };
    tick();
  }

  /* ---------- 第一／第三人稱、旅人角色 ---------- */
  function syncView() {
    const third = World.view === 'third', g = safeGet('pwd3d-avatar') || 'm';
    $('#view-txt').textContent = t(third ? 'thirdP' : 'firstP'); $('#view-txt').dataset.i18n = third ? 'thirdP' : 'firstP';
    $('#btn-view').classList.toggle('on', third); $('#avatar-thumb').src = `assets/avatar/${g}.jpg`;
    $('#btn-avatar').hidden = !third;
  }
  function setView(v) { World.setView(v); safeSet('pwd3d-view', v); syncView(); }
  function setAvatar(g) { World.setAvatar(g); safeSet('pwd3d-avatar', g); syncView(); }
  function toggleView() { const v = World.view === 'third' ? 'first' : 'third'; setView(v); blip(v === 'third' ? 700 : 560); toast(t(v === 'third' ? 'viewThirdToast' : 'viewFirstToast')); track('view', { v }); }
  function toggleAvatar() { const g = (safeGet('pwd3d-avatar') || 'm') === 'm' ? 'f' : 'm'; setAvatar(g); blip(760); toast(t(g === 'm' ? 'avatarM' : 'avatarF')); }

  /* ---------- 工務局完整資訊（pwd-portal.js）---------- */
  function openPortal(tab, arg) { if (!window.Portal) return; if ($('#portal').hidden) { lastFocus = document.activeElement; $('#portal-emblem').innerHTML = EM.hub; blip(600); } Portal.open(tab || 'home', arg); }
  function closePortal() { if (!window.Portal) return; Portal.close(); if (lastFocus && document.contains(lastFocus)) lastFocus.focus(); }

  window.UI = { goBooth, redeem, boardElevator, descend, deckNight, fireworks, toggleView, toggleAvatar, openPortal, closePortal, portalFilter: q => Portal.filter(q), talkTo: id => onNPC(id), toggleHero, openStamps, downloadCert, closeCelebrate, celebrate, nextLine, start, select, enterZone, toggleMode, openSheet, closeSheet, openMenu, openSearch, goSearch, close, openA11y, showHelp, toggleSound,
    share, openTasks, startTour, tourNext, endTour, toggleLang };
  boot();
})();
