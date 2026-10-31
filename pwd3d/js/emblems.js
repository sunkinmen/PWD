/* emblems.js ── 工務局＋五大工程處徽章（統一線稿風格 SVG）
 * 統一規格：64×64、圓角方形底、深藍 2.4px 線稿、各處主題色填色 */
(function () {
  const INK = '#2c3554';
  const frame = (id, c1, c2, body) => `
<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect x="3" y="3" width="58" height="58" rx="18" fill="url(#bg-${id})" stroke="${INK}" stroke-width="2.4"/>
  <rect x="7" y="7" width="50" height="50" rx="14" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".9"/>
  <g stroke="${INK}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">${body}</g>
  <circle cx="50" cy="14" r="2.2" fill="${c2}"/>
</svg>`;

  window.EMBLEMS = {
    // 工務局：市府大樓＋臺北101
    hub: frame('hub', '#cfe0ff', '#4a7fd4', `
      <path d="M40 50V22l3-3 3 3v28" fill="#9fc1f5"/>
      <path d="M40 30h6M40 38h6M43 19v-6" />
      <path d="M14 50V32l12-7 12 7v18z" fill="#ffffff"/>
      <path d="M21 50v-9h10v9" fill="#ffd6dc"/>
      <path d="M19 34h14" />
      <path d="M10 50h44" />`),
    // 新建工程處：斜張橋＋路面標線
    nco: frame('nco', '#ffd3d9', '#e0707e', `
      <path d="M32 14v26" />
      <path d="M32 16L14 38M32 16l18 22M32 22L20 38M32 22l12 16" stroke-width="1.8"/>
      <path d="M8 40h48v5H8z" fill="#ffb3bd"/>
      <path d="M8 51h48" />
      <path d="M14 51h6M28 51h6M42 51h6" stroke="#ffffff" stroke-width="2"/>`),
    // 水利工程處：水波＋堤防水門
    heo: frame('heo', '#cdeeff', '#4aa8d8', `
      <path d="M12 18h12v16H12z" fill="#ffffff"/>
      <path d="M12 24h12M18 18v-4" />
      <path d="M30 22c3-4 7-4 10 0s7 4 10 0" fill="none"/>
      <path d="M8 38c4-4 8-4 12 0s8 4 12 0 8-4 12 0 8 4 12 0V52H8z" fill="#9fd8f5"/>
      <path d="M12 46c3-2 6-2 9 0M30 46c3-2 6-2 9 0" stroke="#ffffff" stroke-width="2"/>`),
    // 公園路燈處：樹＋路燈
    pkl: frame('pkl', '#d3f3dd', '#5cb87a', `
      <circle cx="24" cy="27" r="11" fill="#a8e2b8"/>
      <circle cx="18" cy="31" r="6" fill="#c6efd1"/>
      <path d="M24 34v16M24 40l-5-4" />
      <path d="M44 50V22c0-4 3-6 6-6" fill="none"/>
      <path d="M46 16h8l-2 5h-4z" fill="#ffe08a"/>
      <path d="M12 50h40" />`),
    // 衛生下水道處：人孔蓋＋水滴循環
    sso: frame('sso', '#e2ddff', '#8a7fd8', `
      <ellipse cx="32" cy="44" rx="20" ry="7" fill="#c9c1f5"/>
      <path d="M18 44h28M24 40l-2 8M32 38v12M40 40l2 8" stroke-width="1.6"/>
      <path d="M32 12c-6 8-9 12-9 16a9 9 0 0 0 18 0c0-4-3-8-9-16z" fill="#ffffff"/>
      <path d="M28 28a4 4 0 0 0 6 3" fill="none"/>`),
    // 大地工程處：山＋等高線＋步道
    geo: frame('geo', '#fbe7c2', '#c9984a', `
      <path d="M8 50l16-26 8 11 6-8 18 23z" fill="#c8e6b0"/>
      <path d="M17 41c4-2 9-2 13 0M14 46c6-2 14-2 20 0" fill="none" stroke-width="1.8"/>
      <path d="M38 50l-3-5 4-3-3-4" fill="none" stroke-dasharray="1 4" stroke-width="2.6"/>
      <circle cx="44" cy="18" r="5" fill="#ffd27a"/>`)
  };
})();
