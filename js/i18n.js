/* =====================================================================
 * i18n.js ── 介面文字（中文／English）
 *  ● HTML 元素加 data-i18n="key" 自動替換文字；data-i18n-ph 換 placeholder；data-i18n-aria 換 aria-label
 * ===================================================================== */
(function () {
  const D = {
    zh: {
      skip: '跳到純文字版（無障礙）', eyebrow: 'TAIPEI PUBLIC WORKS · EXPLORE', start: '開始探索', overview: '城市總覽',
      titleFoot: '第一人稱漫遊・支援電腦與手機', textOnly: '純文字版', org: '臺北市政府工務局', explore: '探索', overviewShort: '總覽',
      tasks: '我要辦', enter: '▶ 進入世界', servicesNews: '服務與公告', website: '官網 ↗', share: '分享', visited: '✓ 已造訪',
      hint: 'WASD／方向鍵移動・Shift 奔跑・拖曳轉視角・V 切換第一／第三人稱・走近工作人員按 E 對話', npcNext: '點我或按 E 繼續',
      portal: '局網完整資訊', portalFull: '開啟工務局完整資訊（公告・申辦・機關介紹）', portalMenu: '🏛️ 工務局完整資訊',
      stamps: '工務護照', stampsMenu: '🏅 工務護照（集章）', stampsTitle: '臺北工務護照', stampsHint: '走進每個工程世界、靠近處本部就能蓋章。六枚集滿，山神爺爺會親自祝福你！',
      certPh: '輸入你的名字（印在紀念卡上）', certDl: '下載紀念卡', celeTitle: '恭喜集滿六枚工務章！',
      celeText: '山神爺爺：「你走遍了道路、河川、公園、下水道和山林。臺北因為有你這樣關心市政的人，會更美好。老夫在此賜福！」', later: '稍後', getCert: '領取紀念卡',
      stampGot: n => `蓋章成功：${n}`, notYet: '尚未造訪', certTitle: '臺北工務 探索紀念卡', certLine: '已走遍臺北市政府工務局與五大工程處', explorer: '工務探險家',
      timeOfDay: '時段（日夜）', dawn: '清晨', day: '白天', dusk: '黃昏', night: '夜晚', viewMode: '視角', firstP: '第一人稱', thirdP: '第三人稱',
      avatar: '我的角色', avatarM: '男旅人', avatarF: '女旅人', viewFirstToast: '第一人稱視角', viewThirdToast: '第三人稱視角（按 V 切換）', moreInfo: '展開資訊', trendUp: '成長', trendFlat: '持平',
      services: '常用服務', news: '最新公告', officialSite: '前往官方網站 ↗', settings: '設定', season: '季節', voice: '角色語音',
      quality: '畫質', more: '其他', lang: '語言 Language', textSize: '文字大小', motion: '減少動態效果',
      spring: '🌸 春', summer: '🌻 夏', autumn: '🍁 秋', winter: '❄️ 冬', on: '開', off: '關', auto: '自動', high: '高畫質', eco: '省電',
      sizeN: '標準', sizeL: '大', sizeXL: '特大', a11yMode: '♿ 純文字無障礙版', help: '🎮 操作說明', tour: '🧭 重看新手導覽',
      brand: '🎨 品牌設計規範', official: '🏛️ 工務局官方網站 ↗', searchTitle: '想找什麼服務？', searchPh: '例如：路燈不亮、借河濱場地、污水接管、登山步道',
      tasksTitle: '我要辦…', go: '前往辦理 ↗', see: '在 3D 中查看', back: '← 回到 3D 版', close: '關閉', loading: '正在搭建臺北工務世界…',
      view: n => `查看 ${n}`, talk: n => `和${n}聊聊`, goto: n => `前往 ${n}`, visitedN: (n, a, b) => `已造訪 ${n}（${a}/${b}）`,
      allVisited: '🎉 恭喜！六個工務世界全部走遍了', welcome: '歡迎來到臺北工務世界！走近工作人員可以聊天', copied: '連結已複製，可以貼給朋友',
      helpTouch: '左下搖桿移動、右側拖曳轉視角；點上方圖示切換世界', helpKey: 'WASD 移動・Shift 奔跑・拖曳轉視角・走近工作人員按 E 對話・← → 切換世界',
      qualityChanged: '畫質已切換', updated: '內容更新', textVersion: '（純文字版）', officialOf: n => `前往${n}官網`,
      tour1: ['👋 歡迎！', '這裡是臺北工務 3D 世界，工務局和五個工程處都在這座城市裡。'],
      tour2: ['🚶 移動與視角', '電腦用 WASD 或方向鍵走路，拖曳畫面轉頭；手機用左下搖桿。'],
      tour3: ['💬 和工作人員聊天', '走近穿工作服的人或山神爺爺，按 E（手機點對話框）聽他們介紹業務。'],
      tour4: ['🗺️ 快速前往', '右上「總覽」可看全城；「我要辦」直接找常用服務。祝你玩得開心！'],
      next: '下一步', done: '開始！', skipTour: '略過'
    },
    en: {
      skip: 'Skip to text-only version', eyebrow: 'TAIPEI PUBLIC WORKS · EXPLORE', start: 'Start exploring', overview: 'City overview',
      titleFoot: 'First-person · desktop & mobile', textOnly: 'Text-only', org: 'Taipei City Public Works Dept.', explore: 'Explore', overviewShort: 'Overview',
      tasks: 'I want to…', enter: '▶ Enter', servicesNews: 'Services & news', website: 'Website ↗', share: 'Share', visited: '✓ Visited',
      hint: 'WASD / arrows to move · Shift to run · drag to look · V to switch view · E to talk', npcNext: 'Tap or press E',
      portal: 'Full PWD info', portalFull: 'Open full PWD info (news, services, contacts – Chinese)', portalMenu: '🏛️ Full PWD information',
      stamps: 'Passport', stampsMenu: '🏅 Public Works passport', stampsTitle: 'Taipei Public Works Passport', stampsHint: 'Enter each world and walk up to its office to collect a stamp. Collect all six for a blessing from the Mountain God!',
      certPh: 'Your name (printed on the card)', certDl: 'Download card', celeTitle: 'All six stamps collected!',
      celeText: 'Mountain God: “You walked the roads, rivers, parks, sewers and hills. Taipei is better for people who care like you. Blessings upon you!”', later: 'Later', getCert: 'Get my card',
      stampGot: n => `Stamped: ${n}`, notYet: 'Not visited', certTitle: 'Taipei Public Works Explorer', certLine: 'Visited the Public Works Department and all five offices', explorer: 'Explorer',
      timeOfDay: 'Time of day', dawn: 'Dawn', day: 'Day', dusk: 'Dusk', night: 'Night', viewMode: 'Camera', firstP: 'First person', thirdP: 'Third person',
      avatar: 'My character', avatarM: 'Traveler (M)', avatarF: 'Traveler (F)', viewFirstToast: 'First-person view', viewThirdToast: 'Third-person view (press V)', moreInfo: 'More info', trendUp: 'Growing', trendFlat: 'Steady',
      services: 'Services', news: 'Latest news (Chinese)', officialSite: 'Official website ↗', settings: 'Settings', season: 'Season', voice: 'Character voices',
      quality: 'Graphics', more: 'More', lang: '語言 Language', textSize: 'Text size', motion: 'Reduce motion',
      spring: '🌸 Spring', summer: '🌻 Summer', autumn: '🍁 Autumn', winter: '❄️ Winter', on: 'On', off: 'Off', auto: 'Auto', high: 'High', eco: 'Saver',
      sizeN: 'Normal', sizeL: 'Large', sizeXL: 'X-Large', a11yMode: '♿ Text-only accessible version', help: '🎮 Controls', tour: '🧭 Replay tutorial',
      brand: '🎨 Brand guidelines', official: '🏛️ Official PWD website ↗', searchTitle: 'Looking for a service?', searchPh: 'e.g. broken street light, riverside venue, sewer, hiking',
      tasksTitle: 'I want to…', go: 'Go ↗', see: 'Show in 3D', back: '← Back to 3D', close: 'Close', loading: 'Building the Taipei Public Works world…',
      view: n => `View ${n}`, talk: n => `Talk to ${n}`, goto: n => `Going to ${n}`, visitedN: (n, a, b) => `Visited ${n} (${a}/${b})`,
      allVisited: '🎉 You visited all six worlds!', welcome: 'Welcome! Walk up to the staff to chat', copied: 'Link copied',
      helpTouch: 'Joystick bottom-left to move, drag right side to look', helpKey: 'WASD move · Shift run · drag to look · E to talk · ← → switch worlds',
      qualityChanged: 'Graphics updated', updated: 'Updated', textVersion: ' (text-only)', officialOf: n => `Visit ${n}`,
      tour1: ['👋 Welcome!', 'This is Taipei Public Works in 3D — HQ and five engineering offices in one city.'],
      tour2: ['🚶 Move & look', 'Use WASD or arrow keys and drag to look. On phones, use the joystick.'],
      tour3: ['💬 Talk to staff', 'Walk up to workers or the Mountain Elder and press E (tap the bubble on phones).'],
      tour4: ['🗺️ Shortcuts', '“Overview” shows the whole city; “I want to…” jumps to common services. Have fun!'],
      next: 'Next', done: 'Let’s go!', skipTour: 'Skip'
    }
  };
  let lang = 'zh';
  try { lang = localStorage.getItem('pwd3d-lang') || ((navigator.language || '').startsWith('zh') ? 'zh' : 'en'); } catch (e) { }
  const t = (k, ...a) => { const v = (D[lang] && D[lang][k] !== undefined) ? D[lang][k] : D.zh[k]; return typeof v === 'function' ? v(...a) : v; };
  function apply() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant-TW';
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('[data-i18n-ph]').forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
    document.querySelectorAll('[data-i18n-aria]').forEach(el => { el.setAttribute('aria-label', t(el.dataset.i18nAria)); el.title = t(el.dataset.i18nAria); });
  }
  // 內容欄位：英文有就用英文
  const Z = (z, k) => (lang === 'en' && window.ZONES_EN && ZONES_EN[z.id] && ZONES_EN[z.id][k] !== undefined) ? ZONES_EN[z.id][k] : z[k];
  const N = (n, k) => (lang === 'en' && window.NPCS_EN && NPCS_EN[n.id] && NPCS_EN[n.id][k] !== undefined) ? NPCS_EN[n.id][k] : n[k];
  const S = k => (lang === 'en' && window.SITE_EN && SITE_EN[k]) ? SITE_EN[k] : window.SITE[k];
  window.I18N = { t, apply, Z, N, S, get lang() { return lang; }, set(l) { lang = l; try { localStorage.setItem('pwd3d-lang', l); } catch (e) { } apply(); } };
})();
