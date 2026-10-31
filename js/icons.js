/* icons.js ── 介面圖示（與徽章同風格：24×24、圓角線稿 2px）。HTML 中寫 <i data-ico="名稱"></i> 自動替換 */
(function () {
  const P = {
    tasks: '<rect x="5" y="3.5" width="14" height="17" rx="3"/><path d="M9 3.5v2h6v-2M8.5 10h7M8.5 13.5h7M8.5 17h4"/>',
    walk: '<circle cx="13" cy="4.5" r="1.8"/><path d="M10 21l2-6 3 3v3M8 12l2.5-4.5 4 1.5 2 3.5M12.5 15l-1-5"/>',
    map: '<path d="M3.5 6.5l5-2 7 2.5 5-2v13l-5 2-7-2.5-5 2z"/><path d="M8.5 4.5v13M15.5 7v13"/>',
    search: '<circle cx="10.5" cy="10.5" r="6"/><path d="M15 15l5 5"/>',
    soundOn: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11"/>',
    soundOff: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    menu: '<path d="M4.5 7h15M4.5 12h15M4.5 17h15"/>',
    share: '<circle cx="17.5" cy="5.5" r="2.5"/><circle cx="6.5" cy="12" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.7 10.8l6.6-4M8.7 13.2l6.6 4"/>',
    ext: '<path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 014 18.5v-10A1.5 1.5 0 015.5 7H10"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    play: '<path d="M8 5.5v13l10-6.5z"/>',
    list: '<path d="M9 7h11M9 12h11M9 17h11"/><circle cx="5" cy="7" r="1"/><circle cx="5" cy="12" r="1"/><circle cx="5" cy="17" r="1"/>',
    stamp: '<path d="M9 13V9.5a3 3 0 116 0V13"/><rect x="4.5" y="13" width="15" height="4" rx="1.5"/><path d="M6 20h12"/>',
    person: '<circle cx="12" cy="7.5" r="3.5"/><path d="M5 20.5c.8-4 3.6-6 7-6s6.2 2 7 6"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    up: '<path d="M7 14l5-5 5 5"/>', down: '<path d="M7 10l5 5 5-5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    moon: '<path d="M19 14.5A7.5 7.5 0 019.5 5a7.5 7.5 0 109.5 9.5z"/>',
    download: '<path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14"/>',
    // 指標圖示
    building: '<path d="M4 20.5h16M6 20.5V8l6-4 6 4v12.5M10 20.5v-5h4v5"/>', road: '<path d="M8 3.5L5 20.5M16 3.5l3 17M12 4v3M12 10v3M12 16v4"/>',
    bridge: '<path d="M3 15h18M5 15c2-6 12-6 14 0M8 15v-3M12 15v-4.5M16 15v-3M4 19h16"/>', pipe: '<path d="M4 9h9a4 4 0 014 4v7M4 13h9M13 13v7"/>',
    drop: '<path d="M12 3.5s6 6.5 6 10.5a6 6 0 01-12 0c0-4 6-10.5 6-10.5z"/>', bike: '<circle cx="6" cy="16" r="3.5"/><circle cx="18" cy="16" r="3.5"/><path d="M6 16l4-7h5l3 7M10 9l2.5 7M14 6h2.5"/>',
    tree: '<path d="M12 21v-6M12 15c-4 0-6.5-2-6.5-5a6.5 6.5 0 0113 0c0 3-2.5 5-6.5 5z"/>', bulb: '<path d="M9 18h6M10 21h4M12 3.5a5.5 5.5 0 00-3.5 9.7V16h7v-2.8A5.5 5.5 0 0012 3.5z"/>',
    park: '<circle cx="12" cy="9" r="5"/><path d="M12 14v7M8 21h8"/>', mountain: '<path d="M3 19.5l6.5-11 4 6 2.5-3.5 5 8.5z"/>', smile: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 14c1 1.5 2 2 3.5 2s2.5-.5 3.5-2M9 9.5h.01M15 9.5h.01"/>',
    chart: '<path d="M4 19.5h16M7 16v-4M12 16V8M17 16v-6"/>'
  };
  const svg = (n, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[n] || P.list}</svg>`;
  function apply(root = document) { root.querySelectorAll('i[data-ico]').forEach(el => { el.outerHTML = svg(el.dataset.ico, el.className); }); }
  window.ICONS = { svg, apply, has: n => !!P[n] };
})();
