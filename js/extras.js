/* =====================================================================
 * extras.js ── 營運功能：試算表自動更新內容、使用數據（GA4）、節慶／季節自動切換、PWA 離線
 * ===================================================================== */
(function () {
  const SITE = window.SITE;

  /* ---------- 1. Google 試算表自動更新（公告、指標）---------- */
  function parseCSV(text) {
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) { const c = text[i];
      if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
      else if (c === '"') q = true; else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c; }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    const head = (rows.shift() || []).map(h => h.trim().toLowerCase());
    return rows.filter(r => r.some(x => x.trim())).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] || '').trim()])));
  }
  function applySheet(rows) {
    const zones = Object.fromEntries(window.ZONES.map(z => [z.id, z]));
    const fresh = {};
    rows.forEach(r => { const z = zones[r.zone]; if (!z) return;
      if ((r.type || 'news') === 'news' && r.title) { (fresh[z.id] = fresh[z.id] || []).push({ date: r.date, tag: r.tag, title: r.title, url: r.url || undefined }); }
      if (r.type === 'metric' && r.label) { const m = z.metrics.find(x => x.label === r.label); if (m) { m.value = r.value; if (r.unit) m.unit = r.unit; } else z.metrics.push({ label: r.label, value: r.value, unit: r.unit }); } });
    Object.entries(fresh).forEach(([id, list]) => { zones[id].news = list.sort((a, b) => (b.date || '').localeCompare(a.date || '')); });
  }
  async function loadSheet() {
    if (!SITE.sheetCsv) return false;
    try { const cached = localStorage.getItem('pwd3d-sheet'); if (cached) applySheet(JSON.parse(cached)); } catch (e) { }
    try {
      const res = await fetch(SITE.sheetCsv, { cache: 'no-cache' }); if (!res.ok) throw 0;
      const rows = parseCSV(await res.text()); applySheet(rows);
      try { localStorage.setItem('pwd3d-sheet', JSON.stringify(rows)); } catch (e) { }
      return true;
    } catch (e) { return false; }
  }

  /* ---------- 2. 使用數據（GA4，未設定 ID 或使用者開啟「請勿追蹤」則不載入）---------- */
  const dnt = navigator.doNotTrack === '1' || window.doNotTrack === '1';
  if (SITE.ga4Id && !dnt && location.protocol.startsWith('http')) {
    const s = document.createElement('script'); s.async = true; s.src = 'https://www.googletagmanager.com/gtag/js?id=' + SITE.ga4Id; document.head.appendChild(s);
    window.dataLayer = window.dataLayer || []; window.gtag = function () { dataLayer.push(arguments); };
    gtag('js', new Date()); gtag('config', SITE.ga4Id, { anonymize_ip: true });
  }
  const track = (name, params = {}) => { try { if (window.gtag) gtag('event', name, params); } catch (e) { } };

  /* ---------- 3. 節慶／季節自動切換 ---------- */
  function md(d) { return String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }
  function inRange(today, from, to) { return from <= to ? (today >= from && today <= to) : (today >= from || today <= to); }
  function activeFestivals(date = new Date()) { const t = md(date); return (window.FESTIVALS || []).filter(f => inRange(t, f.from, f.to)); }
  function autoSeason(date = new Date()) {
    const f = activeFestivals(date).find(x => x.season); if (f) return f.season;
    const m = date.getMonth() + 1; return m >= 3 && m <= 5 ? 'spring' : m >= 6 && m <= 8 ? 'summer' : m >= 9 && m <= 11 ? 'autumn' : 'winter';
  }
  function applyFestivalLines() {
    activeFestivals().forEach(f => Object.entries(f.lines || {}).forEach(([id, lines]) => {
      const n = (window.NPCS || []).find(x => x.id === id); if (n) n.lines = lines.concat(n.lines); }));
  }

  /* ---------- 4. PWA：註冊 Service Worker（離線快取）---------- */
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    addEventListener('load', () => setTimeout(() => navigator.serviceWorker.register('sw.js').catch(() => { }), 6000));   // 晚 6 秒再註冊，不和首次載入搶頻寬
  }

  window.Extras = { loadSheet, track, activeFestivals, autoSeason, applyFestivalLines };
})();
