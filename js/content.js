/* =====================================================================
 * content.js ── 網站「內容檔」：日常更新只改這一個檔案
 * ---------------------------------------------------------------------
 *  ● 改文字／數據／連結／公告：直接修改下面 ZONES 內對應欄位
 *  ● 新增一則公告：在該處 news 陣列最前面加一行 { date, tag, title, url }
 *  ● 更換背景圖：把新圖放到 assets/，再改 SITE.skyImage 檔名
 *  ● 不需要懂 3D，不需要重新建置，存檔後上傳即可
 * ===================================================================== */

window.SITE = {
  orgName: '臺北市政府工務局',
  orgNameEn: 'Public Works Department, Taipei City Government',
  siteTitle: '臺北工務 探索世界',
  siteSubtitle: '走進道路、水利、公園、下水道與山坡地的五大工程世界',
  officialUrl: 'https://pwd.gov.taipei/',
  phone: '1999（外縣市請撥 02-2720-8889）',
  address: '110204 臺北市信義區市府路 1 號 4 樓',
  skyImage: 'assets/sky-taipei.jpg',   // Nano Banana 2 生成的台北全景（找不到時自動改用程式繪製天空）
  updated: '2026-10-31'
};

/* 六個世界：hub = 局本部（中央），其餘五個工程處環繞
 * pos：在 3D 地圖上的位置 [x, z]（單位：公尺感，0,0 為市中心）——一般不需改
 * color：主題色（標籤、按鈕、卡片） */
window.ZONES = [
  {
    id: 'hub',
    shortName: '工務局本部',
    title: '工務局本部',
    tagline: '五大工程的指揮中樞',
    badge: '市政核心',
    color: '#4a7fd4',
    soft: '#dbe8ff',
    pos: [0, 0],
    subtitle: '統籌臺北市道路橋樑、防洪治水、公園綠地、污水處理與坡地保育五大工程領域，以環狀路網與水系串連五大工程處，守護永續臺北。',
    officialUrl: 'https://pwd.gov.taipei/',
    metrics: [
      { label: '所屬工程處', value: '5', unit: '處' },
      { label: '年度重大工程', value: '328', unit: '件' },
      { label: '市民滿意度', value: '94.6', unit: '%' }
    ],
    services: [
      { name: '施政成果與計畫', icon: '📘', url: 'https://pwd.gov.taipei/' },
      { name: '道路挖掘管理中心', icon: '🚧', url: 'https://pwd.gov.taipei/' },
      { name: '工程招標資訊', icon: '📄', url: 'https://pwd.gov.taipei/' },
      { name: '1999 市民熱線', icon: '☎️', url: 'https://pwd.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-31', tag: '智慧工務', title: '工務局 3D 探索世界上線，一站走遍五大工程處' },
      { date: '2026-10-25', tag: '永續淨零', title: '推動綠建材與低碳工法，五大工程處減碳成效突破年度目標' }
    ]
  },
  {
    id: 'nco',
    shortName: '新建工程處',
    title: '新建工程處',
    tagline: '道路與橋樑的世界',
    badge: '道路・橋樑',
    color: '#e0707e',
    soft: '#ffe0e4',
    pos: [-50, 28],
    subtitle: '掌管全市道路鋪面品質、跨河橋樑新建與耐震補強、人行無障礙改善及共同管道，以微創刨鋪守護市民行的安全與平坦。',
    officialUrl: 'https://nco.gov.taipei/',
    metrics: [
      { label: '道路養護面積', value: '2,380', unit: '萬㎡' },
      { label: '管養橋樑', value: '351', unit: '座' },
      { label: '共同管道', value: '142.8', unit: 'km' }
    ],
    services: [
      { name: '路平專案施工預告', icon: '🛣️', url: 'https://nco.gov.taipei/' },
      { name: '人行道無障礙改善', icon: '♿', url: 'https://nco.gov.taipei/' },
      { name: '道路挖掘整合查詢', icon: '⛑️', url: 'https://nco.gov.taipei/' },
      { name: '共同管道介紹', icon: '🔌', url: 'https://nco.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-29', tag: '路平專案', title: '林蔭大道微創刨鋪完工，平坦度指標大幅優化' },
      { date: '2026-10-22', tag: '橋樑安全', title: '跨河橋樑智慧感測器全面連線監測' }
    ]
  },
  {
    id: 'heo',
    shortName: '水利工程處',
    title: '水利工程處',
    tagline: '河濱與防汛的世界',
    badge: '防汛・河濱',
    color: '#4aa8d8',
    soft: '#d9f1ff',
    pos: [52, 28],
    subtitle: '守護臺北盆地防洪安全，操控全市抽水站與疏散門，同時經營河濱公園與水岸自行車道，讓市民親水又安心。',
    officialUrl: 'https://heo.gov.taipei/',
    metrics: [
      { label: '抽水站', value: '89', unit: '座' },
      { label: '河濱自行車道', value: '112', unit: 'km' },
      { label: '河濱公園', value: '29', unit: '座' }
    ],
    services: [
      { name: '河濱場地租借', icon: '🗓️', url: 'https://heo.gov.taipei/' },
      { name: '疏散門啟閉資訊', icon: '🚪', url: 'https://heo.gov.taipei/' },
      { name: '河濱自行車道地圖', icon: '🚲', url: 'https://heo.gov.taipei/' },
      { name: '即時水位資訊', icon: '📈', url: 'https://heo.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-30', tag: '水岸花海', title: '大佳河濱公園花海盛開，結合單車道吸引市民同遊' },
      { date: '2026-10-19', tag: '智慧防汛', title: '抽水站導入水位預測，強降雨應變時間縮短' }
    ]
  },
  {
    id: 'pkl',
    shortName: '公園路燈工程管理處',
    title: '公園路燈工程管理處',
    tagline: '公園、綠樹與路燈的世界',
    badge: '公園・路燈',
    color: '#5cb87a',
    soft: '#dcf5e3',
    pos: [-54, -26],
    subtitle: '打造四季花展與共融公園，撫育隨風搖曳的都市樹木，並以智慧 LED 路燈溫暖守護每一條街道。',
    officialUrl: 'https://pkl.gov.taipei/',
    metrics: [
      { label: '都市公園', value: '1,020+', unit: '處' },
      { label: '智慧路燈', value: '17.6', unit: '萬盞' },
      { label: '行道樹', value: '10.8', unit: '萬株' }
    ],
    services: [
      { name: '花展活動資訊', icon: '🌸', url: 'https://pkl.gov.taipei/' },
      { name: '共融式遊戲場', icon: '🛝', url: 'https://pkl.gov.taipei/' },
      { name: '路燈故障報修', icon: '💡', url: 'https://pkl.gov.taipei/' },
      { name: '行道樹資訊', icon: '🌳', url: 'https://pkl.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-28', tag: '花展', title: '士林官邸菊展接力登場，打造清新賞花環境' },
      { date: '2026-10-15', tag: '共融公園', title: '新一批共融式遊戲場完工啟用' }
    ]
  },
  {
    id: 'sso',
    shortName: '衛生下水道工程處',
    title: '衛生下水道工程處',
    tagline: '地底水循環的世界',
    badge: '污水・再生水',
    color: '#8a7fd8',
    soft: '#e8e4ff',
    pos: [52, -30],
    subtitle: '城市地底的淨化師！建置綿密污水管網與水資源回收中心，由「烏龜工程師」巡檢人孔，推動菸蒂不落水溝，守護河川水質。',
    officialUrl: 'https://sso.gov.taipei/',
    metrics: [
      { label: '用戶接管率', value: '88.7', unit: '%' },
      { label: '每日處理污水', value: '72', unit: '萬噸' },
      { label: '再生水供應', value: '4.5', unit: '萬噸/日' }
    ],
    services: [
      { name: '用戶污水接管查詢', icon: '🏠', url: 'https://sso.gov.taipei/' },
      { name: '後巷美化', icon: '🎨', url: 'https://sso.gov.taipei/' },
      { name: '迪化休閒運動公園', icon: '⚽', url: 'https://sso.gov.taipei/' },
      { name: '再生水取用', icon: '♻️', url: 'https://sso.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-27', tag: '水環境', title: '「菸蒂不落水溝」宣導，攔截微塑膠守護河川' },
      { date: '2026-10-14', tag: '後巷美化', title: '老舊社區污水接管結合彩繪，後巷變微藝廊' }
    ]
  },
  {
    id: 'geo',
    shortName: '大地工程處',
    title: '大地工程處',
    tagline: '山坡地與步道的世界',
    badge: '坡地・步道',
    color: '#c9984a',
    soft: '#fbefd6',
    pos: [0, -64],
    subtitle: '與「山神爺爺」一起守護全市山坡地與溪溝安全，串聯臺北大縱走山徑，引領市民親山近自然。',
    officialUrl: 'https://geo.gov.taipei/',
    metrics: [
      { label: '臺北大縱走', value: '130', unit: 'km' },
      { label: '溪溝近自然整治', value: '68', unit: '條' },
      { label: '坡地監測站', value: '100', unit: '% 連線' }
    ],
    services: [
      { name: '臺北大縱走', icon: '🥾', url: 'https://geo.gov.taipei/' },
      { name: '山坡地範圍查詢', icon: '⛰️', url: 'https://geo.gov.taipei/' },
      { name: '露營場預約', icon: '🏕️', url: 'https://geo.gov.taipei/' },
      { name: '水土保持申報', icon: '🛡️', url: 'https://geo.gov.taipei/' }
    ],
    news: [
      { date: '2026-10-31', tag: '臺北大縱走', title: '大縱走 8 大路段年度認證活動進行中' },
      { date: '2026-10-20', tag: '坡地保育', title: '導入衛星與微地動感測，全天候掌握坡地安全' }
    ]
  }
];

/* 市民快速搜尋：keywords 用空白分隔，命中後飛到對應世界 */
window.SEARCH_INDEX = [
  { keywords: '河濱 場地 租借 烤肉 單車 自行車 水位 抽水 防汛 疏散門', zone: 'heo', title: '河濱場地租借・自行車道・防汛資訊' },
  { keywords: '路燈 不亮 故障 報修 公園 樹 花展 遊戲場', zone: 'pkl', title: '路燈報修・公園與花展' },
  { keywords: '坑洞 路平 刨鋪 挖掘 橋 人行道 無障礙 共同管道', zone: 'nco', title: '路平專案・道路挖掘・橋樑' },
  { keywords: '污水 接管 下水道 後巷 菸蒂 水溝 再生水 烏龜', zone: 'sso', title: '污水接管・後巷美化・再生水' },
  { keywords: '登山 步道 大縱走 露營 山坡地 水土保持 山神', zone: 'geo', title: '臺北大縱走・山坡地查詢・露營' },
  { keywords: '招標 施政 局本部 1999 陳情', zone: 'hub', title: '局本部・招標・1999 熱線' }
];
