/* =====================================================================
 * ui.js ── 介面控制：標題畫面、世界選擇列、資訊卡、探索 HUD、選單、搜尋、無障礙版
 * ===================================================================== */
(function () {
  const $ = s => document.querySelector(s);
  const ZONES = window.ZONES, SITE = window.SITE, EM = window.EMBLEMS;
  const zone = id => ZONES.find(z => z.id === id);
  const visited = new Set(JSON.parse(safeGet('pwd3d-visited') || '[]'));
  let current = 'hub', started = false, near = null, labels = {};

  function safeGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function safeSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }

  /* ---------- 啟動 ---------- */
  function boot() {
    $('#loader-emblem').innerHTML = EM.hub;
    $('#brand-emblem').innerHTML = EM.hub;
    $('#title-h1').textContent = SITE.siteTitle;
    $('#title-sub').textContent = SITE.siteSubtitle;
    $('#title-emblems').innerHTML = ZONES.map((z, i) => `<span style="animation-delay:${.1 + i * .07}s" title="${z.shortName}">${EM[z.id]}</span>`).join('');
    $('#menu-official').href = SITE.officialUrl;
    $('#menu-foot').innerHTML = `${SITE.orgName}｜${SITE.address}｜${SITE.phone}<br>內容更新：${SITE.updated}`;
    if (window.World.isMobile || matchMedia('(pointer:coarse)').matches) document.body.classList.add('touch');

    const fill = $('#loader-fill'), txt = $('#loader-text');
    const steps = ['正在鋪設環狀道路…', '引水入河…', '種下會搖的樹…', '請烏龜工程師就位…', '邀請山神爺爺…'];
    let p = 0; const iv = setInterval(() => { p = Math.min(p + 12, 90); fill.style.width = p + '%'; txt.textContent = steps[(p / 20) | 0] || steps[4]; }, 120);

    const go = () => setTimeout(() => {
      const sky = (location.protocol === 'file:' && window.SKY_DATA) ? window.SKY_DATA : SITE.skyImage;
      try { World.init($('#world'), { skyImage: sky, quality: safeGet('pwd3d-quality') || 'auto' }); }
      catch (e) { console.error(e); txt.textContent = '您的瀏覽器不支援 3D，已切換為純文字版'; setTimeout(openA11y, 800); clearInterval(iv); return; }
      const season = safeGet('pwd3d-season'); if (season) World.setSeason(season);
      World.setViewShift(.16);
      buildTiles(); buildLabels(); bindKeys(); bindJoystick(); clock();
      World.on('zoneClick', id => { if (!started) return; World.mode === 'explore' ? openSheet(id) : select(id); });
      World.on('proximity', onProximity);
      World.on('frame', onFrame);
      World.on('modeChange', onMode);
      clearInterval(iv); fill.style.width = '100%';
      setTimeout(() => $('#loader').classList.add('done'), 300);
      setTimeout(() => $('#loader').remove(), 1000);
    }, 60);
    // 本機雙擊開啟時，瀏覽器禁止 3D 讀取本機圖片，改載入內嵌備份
    if (location.protocol === 'file:') { const sc = document.createElement('script'); sc.src = 'assets/sky-offline.js'; sc.onload = sc.onerror = go; document.head.appendChild(sc); }
    else go();
  }

  function start(mode) {
    if (started) return; started = true; blip(660);
    $('#title').classList.add('leaving'); setTimeout(() => $('#title').remove(), 700);
    $('#hud').hidden = false;
    if (mode === 'explore') { World.setMode('explore'); toast('歡迎來到臺北工務世界！走近各處入口可查看介紹'); }
    else { select('hub'); onMode('overview'); }
  }

  /* ---------- 世界選擇列 ---------- */
  function buildTiles() {
    $('#tiles').innerHTML = ZONES.map(z => `<button class="tile" data-id="${z.id}" aria-label="${z.shortName}" onclick="UI.select('${z.id}')">${EM[z.id]}<span class="dot" hidden>✓</span></button>`).join('') + `<span class="tile-name" id="tile-name"></span>`;
  }
  function select(id) {
    const z = zone(id); if (!z) return;
    if (World.mode === 'explore') { World.flyTo(id); toast(`前往 ${z.shortName}`); return; }
    current = id; blip(520);
    document.documentElement.style.setProperty('--accent', z.color);
    document.documentElement.style.setProperty('--accent-soft', z.soft);
    document.querySelectorAll('.tile').forEach(t => t.classList.toggle('active', t.dataset.id === id));
    const nameEl = $('#tile-name'), tile = document.querySelector(`.tile[data-id="${id}"]`);
    nameEl.textContent = z.shortName; tile.after(nameEl);
    tile.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    $('#hero-badge').textContent = z.badge;
    $('#hero-title').textContent = z.title;
    $('#hero-tagline').textContent = z.tagline;
    $('#hero-sub').textContent = z.subtitle;
    $('#hero-link').href = z.officialUrl;
    $('#hero-visited').hidden = !visited.has(id);
    $('#hero-cards').innerHTML = z.metrics.map(m => `<div class="card"><small>${m.label}</small><b>${m.value}</b><i>${m.unit}</i></div>`).join('')
      + z.news.slice(0, 2).map(n => `<button class="card news" onclick="UI.openSheet()"><small>${n.date}・${n.tag}</small><span>${n.title}</span></button>`).join('');
    const h = $('#hero'); h.classList.remove('swap'); void h.offsetWidth; h.classList.add('swap');
    World.flyTo(id);
    if (!$('#sheet').hidden) fillSheet(id);
  }
  function step(d) { const i = ZONES.findIndex(z => z.id === current); select(ZONES[(i + d + ZONES.length) % ZONES.length].id); }

  function markVisited(id) {
    if (visited.has(id)) return; visited.add(id); safeSet('pwd3d-visited', JSON.stringify([...visited]));
    const t = document.querySelector(`.tile[data-id="${id}"] .dot`); if (t) t.hidden = false;
    const n = [...visited].length;
    toast(n === ZONES.length ? '🎉 恭喜！六個工務世界全部走遍了' : `已造訪 ${zone(id).shortName}（${n}/${ZONES.length}）`);
  }

  /* ---------- 模式 ---------- */
  function toggleMode() { World.setMode(World.mode === 'explore' ? 'overview' : 'explore'); blip(440); }
  function onMode(m) {
    const ex = m === 'explore';
    World.setViewShift(ex ? 0 : .17);
    $('#explore-hud').hidden = !ex; $('#hero').hidden = ex; $('#tiles').style.display = ex ? 'none' : '';
    $('#mode-ico').textContent = ex ? '🗺️' : '🚶'; $('#mode-txt').textContent = ex ? '總覽' : '探索';
    if (!ex) { select(current); $('#prompt').hidden = true; }
    visited.forEach(id => { const d = document.querySelector(`.tile[data-id="${id}"] .dot`); if (d) d.hidden = false; });
  }
  function enterZone() { const id = current; World.setMode('explore'); setTimeout(() => World.flyTo(id), 50); }

  function onProximity(id) {
    near = id; const p = $('#prompt');
    if (!id) { p.hidden = true; return; }
    $('#prompt-text').textContent = `查看 ${zone(id).shortName}`;
    p.hidden = false; p.onclick = () => openSheet(id);
    markVisited(id);
  }

  /* ---------- 側邊面板 ---------- */
  function fillSheet(id) {
    const z = zone(id);
    document.documentElement.style.setProperty('--accent', z.color);
    document.documentElement.style.setProperty('--accent-soft', z.soft);
    $('#sheet-emblem').innerHTML = EM[id];
    $('#sheet-badge').textContent = z.badge + '・' + z.tagline;
    $('#sheet-title').textContent = z.title;
    $('#sheet-services').innerHTML = z.services.map(s => `<a href="${s.url}" target="_blank" rel="noopener"><span>${s.icon}</span>${s.name}</a>`).join('');
    $('#sheet-news').innerHTML = z.news.map(n => `<li><time>${n.date}<em>${n.tag}</em></time>${n.url ? `<a href="${n.url}" target="_blank" rel="noopener">${n.title}</a>` : n.title}</li>`).join('');
    $('#sheet-link').href = z.officialUrl;
  }
  function openSheet(id) { id = id || current; fillSheet(id); $('#sheet').hidden = false; blip(600); if (World.mode === 'explore') markVisited(id); }
  function closeSheet() { $('#sheet').hidden = true; }

  /* ---------- Modal ---------- */
  function openMenu() {
    $('#menu').hidden = false;
    seg('#seg-season', World.season, v => { World.setSeason(v); safeSet('pwd3d-season', v); });
    seg('#seg-quality', safeGet('pwd3d-quality') || 'auto', v => { World.setQuality(v); safeSet('pwd3d-quality', v); toast('畫質已切換'); });
  }
  function seg(sel, val, fn) {
    document.querySelectorAll(sel + ' button').forEach(b => { b.classList.toggle('on', b.dataset.v === val);
      b.onclick = () => { document.querySelectorAll(sel + ' button').forEach(x => x.classList.remove('on')); b.classList.add('on'); fn(b.dataset.v); blip(700); }; });
  }
  function openSearch() {
    $('#search').hidden = false; const inp = $('#search-input'); inp.value = ''; renderSearch(''); setTimeout(() => inp.focus(), 50);
    inp.oninput = () => renderSearch(inp.value.trim());
  }
  function renderSearch(q) {
    const list = q ? window.SEARCH_INDEX.filter(s => (s.keywords + s.title + zone(s.zone).shortName).includes(q) || q.split('').some(ch => ch.trim() && s.keywords.includes(q))) : window.SEARCH_INDEX;
    $('#search-results').innerHTML = (list.length ? list : window.SEARCH_INDEX).map(s => `<button onclick="UI.close('search');UI.goSearch('${s.zone}')">${EM[s.zone]}<span>${s.title}<small>${zone(s.zone).shortName}</small></span></button>`).join('');
  }
  function goSearch(id) { if (World.mode === 'explore') { World.flyTo(id); setTimeout(() => openSheet(id), 1300); } else { select(id); setTimeout(() => openSheet(id), 900); } }
  function close(id) { $('#' + id).hidden = true; }

  function openA11y() {
    $('#a11y-h1').textContent = SITE.orgName + '（純文字版）';
    $('#a11y-list').innerHTML = ZONES.map(z => `<section style="--c:${z.color}"><h2>${z.title}</h2><p>${z.subtitle}</p>
      <ul>${z.metrics.map(m => `<li>${m.label}：${m.value} ${m.unit}</li>`).join('')}</ul>
      <h3>常用服務</h3><ul>${z.services.map(s => `<li><a href="${s.url}" target="_blank" rel="noopener">${s.name}</a></li>`).join('')}</ul>
      <h3>最新公告</h3><ul>${z.news.map(n => `<li>${n.date}［${n.tag}］${n.title}</li>`).join('')}</ul>
      <p><a href="${z.officialUrl}" target="_blank" rel="noopener">前往${z.shortName}官網</a></p></section>`).join('')
      + `<p>${SITE.address}｜${SITE.phone}</p>`;
    $('#a11y').hidden = false;
  }
  function showHelp() {
    toast(document.body.classList.contains('touch') ? '左下搖桿移動、右側拖曳轉視角；點上方圖示切換世界' : 'WASD 移動・Shift 奔跑・拖曳轉視角・E 查看・← → 切換世界', 4200);
  }

  /* ---------- 鍵盤（PS5 風格：左右切換、Enter 確認、Esc 返回） ---------- */
  function bindKeys() {
    addEventListener('keydown', e => {
      if (e.target.tagName === 'INPUT') { if (e.key === 'Escape') close('search'); return; }
      if (!started) { if (e.key === 'Enter' || e.key === ' ') start('explore'); return; }
      if (e.key === 'Escape') { ['menu', 'search', 'a11y'].forEach(close); closeSheet(); return; }
      if (World.mode === 'overview') {
        if (e.key === 'ArrowRight') step(1); if (e.key === 'ArrowLeft') step(-1);
        if (e.key === 'Enter') enterZone();
      } else if ((e.code === 'KeyE' || e.key === 'Enter') && near) openSheet(near);
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

  /* ---------- 每幀：標籤＋小地圖 ---------- */
  function buildLabels() {
    const box = $('#labels');
    ZONES.forEach(z => { const el = document.createElement('div'); el.className = 'lbl'; el.style.setProperty('--c', z.color);
      el.innerHTML = `${EM[z.id]}<span>${z.shortName}</span>`;
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
    [[10, -66], [42, -56], [66, -48], [76, -18], [74, 16], [66, 46], [38, 62], [0, 66], [-38, 62], [-72, 58], [-120, 64]].forEach((p, i) => { const [a, b] = P(...p); i ? x.lineTo(a, b) : x.moveTo(a, b); }); x.stroke();
    x.fillStyle = '#b6d7a0'; x.beginPath(); x.arc(...P(0, -94), 34 * sc, 0, 7); x.fill();
    ZONES.forEach(z => { const [a, b] = P(...z.pos); x.fillStyle = z.color; x.beginPath(); x.arc(a, b, z.id === 'hub' ? 7 : 6, 0, 7); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = 2; x.stroke(); });
    const pp = World.playerPos, yaw = World.playerYaw; const [px, py] = P(pp.x, pp.z);
    x.translate(px, py); x.rotate(-yaw); x.fillStyle = '#24304f'; x.beginPath(); x.moveTo(0, -9); x.lineTo(6, 6); x.lineTo(0, 3); x.lineTo(-6, 6); x.fill();
    x.restore();
  }

  /* ---------- 小工具 ---------- */
  function clock() { const f = () => { const d = new Date(); $('#clock').textContent = d.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false }); }; f(); setInterval(f, 15000); }
  let tt; function toast(msg, ms = 2600) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), ms); }

  // 音效：UI 提示音＋環境音（流水＋鳥鳴），Web Audio 即時合成，不需音檔
  let ac = null, amb = null;
  function blip(f = 600) { if (!ac) return; const o = ac.createOscillator(), g = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(.06, ac.currentTime); g.gain.exponentialRampToValueAtTime(.0001, ac.currentTime + .12); o.connect(g).connect(ac.destination); o.start(); o.stop(ac.currentTime + .13); }
  function toggleSound() {
    if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)();
    if (amb) { amb.stop(); amb = null; $('#btn-sound').textContent = '🔈'; return; }
    const len = ac.sampleRate * 4, buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { last = (last + .02 * (Math.random() * 2 - 1)) / 1.02; d[i] = last * 3.2; }
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900; const g = ac.createGain(); g.gain.value = .35;
    src.connect(lp).connect(g).connect(ac.destination); src.start();
    const birds = setInterval(() => { const o = ac.createOscillator(), bg = ac.createGain(), t = ac.currentTime, f0 = 2200 + Math.random() * 1400;
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.4, t + .08); o.frequency.exponentialRampToValueAtTime(f0, t + .16);
      bg.gain.setValueAtTime(.0001, t); bg.gain.exponentialRampToValueAtTime(.03, t + .03); bg.gain.exponentialRampToValueAtTime(.0001, t + .2);
      o.connect(bg).connect(ac.destination); o.start(); o.stop(t + .22); }, 2600);
    amb = { stop() { src.stop(); clearInterval(birds); } };
    $('#btn-sound').textContent = '🔊';
  }

  window.UI = { start, select, enterZone, toggleMode, openSheet, closeSheet, openMenu, openSearch, goSearch, close, openA11y, showHelp, toggleSound };
  boot();
})();
